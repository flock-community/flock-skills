# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Put a song under a finished demo mp4, with no voice.

  uv run add-music.py <demo.mp4> <out.mp4> --song <song.json> [--cut <s> [--bad <s> ...]] [--lufs <db>]

The song starts at 0, so its opening plays first, and its real ending lands on the last frame:
a stretch from the middle is skipped, from one beat to another a whole number of 8-beat phrases later,
with a short crossfade. The last frame of the video is held for the part that does not divide out
(under one phrase). Without --cut it writes the three best cut candidates as <out>-cut<s>.mp4 for a
listening round; re-run with the chosen --cut. Any audio already in the demo is dropped.
<song.json> is written by analyse.py and sits next to the song file. --cut also saves the listener's
verdicts in it (the chosen cut as good, each --bad one as bad): a later round skips the bad cuts and
offers a good one first.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

JUMP_BEATS = 8      # the skip is whole 8-beat phrases (two bars of 4/4), so the rhythm stays in step
SIDE = 1.5          # seconds compared on each side of a cut
EARLIEST = 8.0      # cuts in a song's first seconds were heard as harsh
XFADE = 0.3
FPS = 25
X264 = ['-c:v', 'libx264', '-preset', 'slow', '-qp', '16', '-x264-params',
        'aq-mode=0:scenecut=0:keyint=600:no-mbtree=1', '-pix_fmt', 'yuv420p']   # as scripts/to-mp4.sh


def run(*cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def duration(path):
    return float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path))


class Song:
    def __init__(self, path):
        self.path, self.meta = path, json.load(open(path))
        meta = self.meta
        self.file = os.path.join(os.path.dirname(os.path.abspath(path)), meta['file'])
        self.lufs, self.end, self.beats = meta['lufs'], meta['end'], np.array(meta['beats'])
        rate, n, hop = 22050, 2048, 512
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', self.file, '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        self.x, self.rate = np.frombuffer(raw, dtype=np.float32), rate
        mag = np.abs(np.fft.rfft(np.lib.stride_tricks.sliding_window_view(self.x, n)[::hop] * np.hanning(n), axis=1))
        self.spec = np.log1p(mag)
        self.t = (np.arange(len(mag)) * hop + n / 2) / rate
        # Where the bar starts is a guess: the beat position (of 4) with the most bass.
        low = mag[:, :8].sum(1)
        kick = [low[(self.t >= b - 0.03) & (self.t < b + 0.08)].mean() for b in self.beats]
        self.downbeat = int(np.argmax([np.mean(kick[p::4]) for p in range(4)]))

    def sound(self, lo, hi):
        return self.spec[(self.t >= lo) & (self.t < hi)].mean(0)

    def db(self, lo, hi):
        return 10 * np.log10(np.mean(self.x[int(max(lo, 0) * self.rate):int(hi * self.rate)] ** 2) + 1e-12)

    def alike(self, i, j):
        """How alike the sound before the cut beat and after the resume beat is, 0 to 1."""
        before, after = self.sound(self.beats[i] - SIDE, self.beats[i]), self.sound(self.beats[j], self.beats[j] + SIDE)
        return before @ after / (np.linalg.norm(before) * np.linalg.norm(after))

    def predict(self, i, j):
        """(score, kind) a listener is expected to give this cut: 1 = not noticed, 3 = harsh.
        The thresholds come from listening rounds on six songs (MUSIC.md); the score is a guess, not a verdict."""
        cut, resume = self.beats[i], self.beats[j]
        if (i - self.downbeat) % 4:
            return 2.5, 'off the bar'
        step = self.db(resume, resume + SIDE) - self.db(cut - SIDE, cut)
        if abs(step) < 1:
            alike = self.alike(i, j)
            return (1, 'unnoticed') if alike >= 0.96 else (1.5, 'nearly alike') if alike >= 0.9 else (2.5, 'different sound')
        if step >= 3:
            # A step up works where the song itself steps up at that beat, and reads as its own build-up.
            own = max(self.db(b, b + 0.5) - self.db(b - 0.5, b) for b in (cut, resume))
            return (1, 'rise') if own >= 3 else (3, 'jump in loudness')
        return 2, 'loudness step'

    def verdict(self, i, j):
        """'good' or 'bad' when a listener judged this cut before, else None."""
        for c in self.meta.get('cuts', []):
            if abs(c['cut'] - self.beats[i]) < 0.05 and abs(c['resume'] - self.beats[j]) < 0.05:
                return c['verdict']

    def judge(self, i, j, verdict):
        kept = [c for c in self.meta.get('cuts', []) if abs(c['cut'] - self.beats[i]) >= 0.05 or abs(c['resume'] - self.beats[j]) >= 0.05]
        self.meta['cuts'] = kept + [{'cut': float(self.beats[i]), 'resume': float(self.beats[j]), 'verdict': verdict}]
        json.dump(self.meta, open(self.path, 'w'), indent=1)

    def cuts(self, video, earliest, latest):
        """(cut beat, resume beat) pairs whose music is at least `video` long, best predicted score first."""
        b, pairs = self.beats, []
        for i in np.nonzero((b >= earliest) & (b <= latest))[0]:
            # The latest resume beat, in phrase steps, that still leaves enough music.
            js = [j for j in range(i + JUMP_BEATS, len(b) - JUMP_BEATS, JUMP_BEATS) if b[i] + self.end - b[j] >= video]
            if js:
                pairs.append((i, js[-1]))
        return sorted(pairs, key=lambda p: (self.predict(*p)[0], -self.alike(*p)))


def render(video, song, i, j, lufs, out):
    cut, resume = song.beats[i], song.beats[j]
    length = cut + song.end - resume
    hold = length - duration(video)
    gain = lufs - song.lufs
    audio = (f"[1:a]atrim=0:{cut + XFADE / 2},asetpts=PTS-STARTPTS[h];"
             f"[2:a]atrim={resume - XFADE / 2}:{song.end},asetpts=PTS-STARTPTS[tl];"
             f"[h][tl]acrossfade=d={XFADE}:c1=tri:c2=tri,afade=t=in:d=0.02,"
             f"volume={gain}dB,alimiter=limit=0.95,aresample=48000[a]")
    if hold > 1 / FPS:
        frames = ['-filter_complex', f'[0:v]tpad=stop_mode=clone:stop_duration={hold:.3f}[v];' + audio,
                  '-map', '[v]', *X264]
    else:
        frames = ['-filter_complex', audio, '-map', '0:v', '-c:v', 'copy']
    run('ffmpeg', '-y', '-i', video, '-i', song.file, '-i', song.file, *frames, '-map', '[a]',
        '-c:a', 'aac', '-b:a', '192k', '-t', f'{length:.3f}', '-movflags', '+faststart', out)
    score, kind = song.predict(i, j)
    print(f'  {out}: cut {cut:.2f}s -> {resume:.2f}s ({kind}, predicted {score} of 3), '
          f'{length:.1f}s, last frame held {max(hold, 0):.1f}s')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('video')
    p.add_argument('out')
    p.add_argument('--song', required=True, help='song json from analyse.py, next to the song file')
    p.add_argument('--cut', type=float, help='song time to cut at, from a previous candidate round')
    p.add_argument('--bad', type=float, nargs='*', default=[], help='with --cut: cuts of that round that sounded harsh; saved in the song json and not offered again')
    p.add_argument('--lufs', type=float, default=-18, help='loudness the whole song is set to (default -18 LUFS); the cut excerpt measures about 1.5 dB under it')
    a = p.parse_args()

    song, video = Song(a.song), duration(a.video)
    if video > song.end:
        # shortcut: no looping, a demo longer than the song fails; loop the song when one needs it.
        sys.exit(f'the demo ({video:.1f}s) is longer than the song ({song.end:.1f}s)')
    # Keep the cut in the first third of the video, after the song's opening phrase and first seconds.
    opening = max(song.beats[min(JUMP_BEATS, len(song.beats) - 1)], EARLIEST)
    pairs = song.cuts(video, earliest=opening, latest=max(video / 3, opening + 2))
    if not pairs:
        sys.exit('no cut point fits this demo length')
    def at(s):
        found = [pair for pair in pairs if abs(song.beats[pair[0]] - s) < 0.05]
        if not found:
            sys.exit(f'no cut at {s}s for this demo length; run without --cut for the candidates')
        return found[0]

    if a.cut is not None:
        chosen, bad = at(a.cut), [at(s) for s in a.bad]
        render(a.video, song, *chosen, a.lufs, a.out)
        song.judge(*chosen, 'good')
        for pair in bad:
            song.judge(*pair, 'bad')
        return
    # Cuts a listener called harsh are out, one they called good comes first. Candidates are at least a
    # phrase apart, so the listener gets three different spots.
    pairs = sorted((p for p in pairs if song.verdict(*p) != 'bad'), key=lambda p: song.verdict(*p) != 'good')
    picked = []
    for pair in pairs:
        if len(picked) < 3 and all(abs(pair[0] - other[0]) >= JUMP_BEATS for other in picked):
            picked.append(pair)
    base, ext = os.path.splitext(a.out)
    if song.predict(*picked[0])[0] > 1.5:
        print('No cut for this demo length is expected to sound smooth; these are the least bad. '
              'Another demo length or another song may do better.')
    print('cut candidates (song time = video time, since the song starts at 0):')
    for i, j in picked:
        render(a.video, song, i, j, a.lufs, f'{base}-cut{song.beats[i]:.2f}{ext}')
    print('Listen, pick one, and re-run with --cut <s> (and --bad <s> ... for the harsh ones).')


if __name__ == '__main__':
    main()
