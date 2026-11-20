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
  `Demo music: docs/demo/music/theme.json`. Recall it from there, as with the other project specifics.

## Setting up a song (once per project)

No song named in the project? Ask the user for one, and check with them that the project may use and commit it (its
licence). Then:

1. Store it, analyse it, and save the path to the json in the project's notes:
   ```bash
   uv run "$SKILL_DIR/scripts/music/analyse.py" docs/demo/music/theme.mp3   # writes theme.json next to it
   ```
2. Run a first listening round with the user right away (the pipeline below), on the demo at hand or on any mp4 of
   a usual demo length. The script cannot hear whether a cut is smooth. Its ranking is a guess, and two cuts with
   almost the same score can sound smooth and harsh. Ask about every candidate, not only for the winner: which
   cuts are smooth, which are harsh, and what the user hears.
3. Pass the answer back with `--cut <s> --bad <s> ...`. The script saves the verdicts in the json: later rounds
   skip the harsh cuts and offer a known-good one first. Commit the json with the song. Running `analyse.py` again
   overwrites the json and drops the verdicts.

## Pipeline

1. **Candidates.** Writes the three best cut candidates as `<out>-cut<s>.mp4`:
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
   (`ffprobe -show_entries stream=codec_type,duration demo-music.mp4`) and look at the last frame. Put the exact
   `--cut` in the PR or the project's notes, so a regeneration needs no new round.

## Music rules

- **Start and end.** The song starts at 0, so its opening plays first, and its real ending (the trailing silence
  trimmed) lands on the last frame.
- **The cut.** A stretch of the middle is skipped: from one beat to a beat a whole number of 8-beat phrases later,
  with a 0.3 s crossfade. The beats are tracked one by one, because a song's tempo can drift. Candidates are ranked by
  a section change on both sides (spectral novelty) and sit within the first third of the video, after the opening
  phrase. In listening rounds a late cut was heard and an early one was not. Candidates are at least one phrase
  apart: the beats next to the best one are the same spot in the song one beat off, and in a listening round one
  beat off was the difference between smooth and harsh.
- **A cut on an action.** A smooth cut that falls on a visible action in the video (a click, a result that lands)
  reads as the video gaining energy at that moment. When two candidates are both smooth, prefer the one whose cut
  time is closest to such a moment; the cut time is also the video time.
- **Length.** Whole phrases rarely fit exactly, so the last frame of the video is held for the rest: up to one
  phrase. The script re-encodes the video with the `to-mp4.sh` settings only when it holds a frame.
- **Level.** One level for the whole video, default -18 LUFS for the whole song (`--lufs`); the cut excerpt can
  measure a little lower. With no voice there is no ducking and no per-part levels. For a level change, render short
  A/B variants and ask.
- **Limits.** A demo longer than the song fails; the script does not loop the song. The 8-beat phrase fits songs in
  4/4; for another metre change `JUMP_BEATS` in `add-music.py`. Any audio already in the demo is dropped.
