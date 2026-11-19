# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Put a song under a finished demo mp4, with no voice.

  uv run add-music.py <demo.mp4> <out.mp4> --song <song.json> [--cut <s>] [--lufs <db>]

The song starts at 0, so its opening plays first, and its real ending lands on the last frame:
a stretch from the middle is skipped, from one beat to another a whole number of 8-beat phrases later,
with a short crossfade. The last frame of the video is held for the part that does not divide out
(under one phrase). Without --cut it writes the three best cut candidates as <out>-cut<s>.mp4 for a
listening round; re-run with the chosen --cut. Any audio already in the demo is dropped.
<song.json> is written by analyse.py and sits next to the song file, in the project that owns the song.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

JUMP_BEATS = 8      # the skip is whole 8-beat phrases (two bars of 4/4), so the rhythm stays in step
WINDOW_BEATS = 8    # novelty compares this many beats before and after a beat
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
        meta = json.load(open(path))
        self.file = os.path.join(os.path.dirname(os.path.abspath(path)), meta['file'])
        self.lufs, self.end, self.beats = meta['lufs'], meta['end'], np.array(meta['beats'])
        rate, n, hop = 22050, 2048, 512
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', self.file, '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype=np.float32)
        frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
        self.spec = np.log1p(np.abs(np.fft.rfft(frames, axis=1)))
        self.t = np.arange(len(self.spec)) * hop / rate

    def novelty(self, i):
        """How different the beats after beat i sound from the beats before it: a section change."""
        b = self.beats
        lo, hi = b[max(i - WINDOW_BEATS, 0)], b[min(i + WINDOW_BEATS, len(b) - 1)]
        before = self.spec[(self.t >= lo) & (self.t < b[i])].mean(0)
        after = self.spec[(self.t >= b[i]) & (self.t < hi)].mean(0)
        return 1 - before @ after / (np.linalg.norm(before) * np.linalg.norm(after))

    def cuts(self, video, earliest, latest):
        """(cut beat, resume beat) pairs whose music is at least `video` long, best section change first."""
        b, pairs = self.beats, []
        for i in np.nonzero((b >= earliest) & (b <= latest))[0]:
            # The latest resume beat, in phrase steps, that still leaves enough music.
            js = [j for j in range(i + JUMP_BEATS, len(b) - WINDOW_BEATS, JUMP_BEATS) if b[i] + self.end - b[j] >= video]
            if js:
                pairs.append((i, js[-1]))
        return sorted(pairs, key=lambda p: -(self.novelty(p[0]) + self.novelty(p[1])))


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
    print(f'  {out}: cut {cut:.2f}s -> {resume:.2f}s (novelty {song.novelty(i):.3f} + {song.novelty(j):.3f}), '
          f'{length:.1f}s, last frame held {max(hold, 0):.1f}s')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('video')
    p.add_argument('out')
    p.add_argument('--song', required=True, help='song json from analyse.py, next to the song file')
    p.add_argument('--cut', type=float, help='song time to cut at, from a previous candidate round')
    p.add_argument('--lufs', type=float, default=-18, help='loudness the whole song is set to (default -18 LUFS); the cut excerpt measures about 1.5 dB under it')
    a = p.parse_args()

    song, video = Song(a.song), duration(a.video)
    if video > song.end:
        # shortcut: no looping, a demo longer than the song fails; loop the song when one needs it.
        sys.exit(f'the demo ({video:.1f}s) is longer than the song ({song.end:.1f}s)')
    # In listening rounds a late cut was heard and an early one was not. Keep it in the first third,
    # after the song's opening phrase.
    opening = song.beats[min(JUMP_BEATS, len(song.beats) - 1)]
    pairs = song.cuts(video, earliest=opening, latest=max(video / 3, opening + 2))
    if not pairs:
        sys.exit('no cut point fits this demo length')
    if a.cut is not None:
        chosen = [pair for pair in pairs if abs(song.beats[pair[0]] - a.cut) < 0.05]
        if not chosen:
            sys.exit(f'no cut at {a.cut}s for this demo length; run without --cut for the candidates')
        render(a.video, song, *chosen[0], a.lufs, a.out)
        return
    base, ext = os.path.splitext(a.out)
    print('cut candidates (song time = video time, since the song starts at 0):')
    for i, j in pairs[:3]:
        render(a.video, song, i, j, a.lufs, f'{base}-cut{song.beats[i]:.2f}{ext}')
    print('Listen, pick one, and re-run with --cut <s>.')


if __name__ == '__main__':
    main()
