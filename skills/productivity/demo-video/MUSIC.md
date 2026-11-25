# demo-video — music bed

Puts a song under a finished demo mp4, with no voice-over. The recording, captions and `-qp` encoding come from the
pipelines in [SKILL.md](SKILL.md) and [TAURI.md](TAURI.md); this step only adds audio to their mp4. Needs `uv` and
`ffmpeg`/`ffprobe` on `PATH`.

## Where the song comes from

This skill ships no song. The song belongs to the project that is being demoed:

- The project keeps the song file and, next to it, the song's json (beat times, loudness, end, and the listener's
  verdicts on cuts) written by `scripts/music/analyse.py`. The project's repository is the usual place, for example
  `docs/demo/music/theme.mp3` and `docs/demo/music/theme.json`. Any path works; the scripts only need the json.
- The project's notes (its agent instructions file or agent memory) hold one line that names the json, for example
  `Demo music: docs/demo/music/theme.json` (a path from the repository root). Recall it from there, as with the
  other project specifics. No notes file to write to? Tell the user the line.

## Setting up a song (once per project)

No song named in the project? Ask the user for one, and check with them that the project may use and commit it (its
licence). Advise an instrumental song: a cut next to a sung line was heard as harsh in listening rounds, even when
the instruments matched, and the script does not detect singing. Then:

1. Store it, analyse it, and save the path to the json in the project's notes:
   ```bash
   uv run "$SKILL_DIR/scripts/music/analyse.py" docs/demo/music/theme.mp3   # writes theme.json next to it
   ```
2. Run a listening round with the user right away: steps 1 and 2 of the pipeline below, on the demo at hand or on
   any mp4 of a usual demo length. With a demo at hand this is that demo's round, not an extra one. The script cannot hear whether a cut is smooth. It prints a predicted score per candidate
   (1 = not noticed, 3 = harsh), and in listening rounds about one prediction in five was off by a point or more.
   Ask about every candidate, not only for the winner: which cuts are smooth, which are harsh, and what the user
   hears.
3. Pass the answer back with `--cut <s> --bad <s> ...`. The script saves the verdicts in the json: later rounds
   skip the harsh cuts and offer a known-good one first. Commit the json with the song. Running `analyse.py` again
   overwrites the json and drops the verdicts. A verdict belongs to one cut and one resume point, so it applies
   again only to a demo of about the same length.

## Pipeline

1. **Candidates.** Run it on the final, trimmed mp4. Writes up to three cut candidates as `<out>-cut<s>.mp4`, each
   with its kind and predicted score. They can be up to one phrase longer than the demo (see Length):
   ```bash
   uv run "$SKILL_DIR/scripts/music/add-music.py" demo.mp4 demo-music.mp4 --song docs/demo/music/theme.json
   ```
2. **Listening round.** Send the user the candidates and ask which one flows best and which ones sound harsh. Then
   run again with the chosen cut, name the harsh ones, and delete the candidate files:
   ```bash
   uv run "$SKILL_DIR/scripts/music/add-music.py" demo.mp4 demo-music.mp4 --song docs/demo/music/theme.json \
     --cut <s> --bad <s> <s>
   ```
3. **Verify.** Check that the audio and video durations are equal
   (`ffprobe -v error -show_entries stream=codec_type,duration -of csv=p=0 demo-music.mp4`) and look at the last frame. Put the exact
   `--cut` in the PR or the project's notes, so a regeneration needs no new round.

## Music rules

- **Start and end.** The song starts at 0, so its opening plays first, and its real ending (the trailing silence
  trimmed) lands on the last frame.
- **The cut.** A stretch of the middle is skipped: from one beat to a beat a whole number of 8-beat phrases later,
  with a 0.3 s crossfade. The beats are tracked one by one, because a song's tempo can drift. Candidates sit within
  the first third of the video, after the song's opening phrase and its first 8 s, and are at least one phrase
  apart.
- **Which cuts sound good.** From listening rounds on six songs (55 scored cuts, one listener), two kinds:
  - *Unnoticed*: on the first beat of a bar, the sound alike on both sides, the loudness within about 1 dB. How
    far the cut skips made no difference.
  - *Rise*: a step up in loudness of 3 dB or more, on the first beat of a bar where the song itself steps up. It
    reads as the song's own build-up. The same cut one beat later was heard as harsh.

  Heard as harsh: a cut off the bar, a jump in loudness where the song is steady, a cut in the song's first
  seconds, and singing right after the cut. The script ranks the candidates by these rules and prints the kind and
  a predicted score. When no candidate is expected to sound smooth it says so; another demo length or another song
  may then do better. Where the bar starts is a guess from the bass, and it can be wrong for a song.
- **A cut on an action.** A smooth cut that falls on a visible action in the video (a click, a result that lands)
  reads as the video gaining energy at that moment. When two candidates are both smooth, prefer the one whose cut
  time is closest to such a moment; the cut time is also the video time. To see what is on screen then:
  `ffmpeg -ss <s> -i demo.mp4 -frames:v 1 at-cut.png`.
- **Length.** Whole phrases rarely fit exactly, so the last frame of the video is held for the rest: up to one
  phrase. The script re-encodes the video with the `to-mp4.sh` settings only when it holds a frame.
- **Level.** One level for the whole video, default -18 LUFS for the whole song (`--lufs`); the cut excerpt can
  measure a little lower. With no voice there is no ducking and no per-part levels. For a level change, render short
  A/B variants and ask.
- **Limits.** A demo longer than the song fails; the script does not loop the song. The 8-beat phrase fits songs in
  4/4; for another metre change `JUMP_BEATS` in `add-music.py`. Any audio already in the demo is dropped.
