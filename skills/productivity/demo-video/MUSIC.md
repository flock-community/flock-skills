# demo-video — music bed

Puts a song under a finished demo mp4, with no voice-over. The recording, captions and `-qp` encoding come from the
pipelines in [SKILL.md](SKILL.md) and [TAURI.md](TAURI.md); this step only adds audio to their mp4. Needs `uv` and
`ffmpeg`/`ffprobe` on `PATH`.

## Where the song comes from

This skill ships no song. The song belongs to the project that is being demoed:

- The project's repository holds the song file and, next to it, the song's json (beat times, loudness, end) written
  by `scripts/music/analyse.py`. Example: `docs/demo/music/theme.mp3` and `docs/demo/music/theme.json`.
- The project's notes (its agent instructions file or agent memory) hold one line that names the json, for example
  `Demo music: docs/demo/music/theme.json`. Recall it from there, as with the other project specifics.

No song named in the project? Ask the user for one, and check with them that the project may use and commit it (its
licence). Then store it in the project's repository, analyse it once, and save the path to the json in the project's
notes:

```bash
uv run "$SKILL_DIR/scripts/music/analyse.py" docs/demo/music/theme.mp3   # writes theme.json next to it
```

## Pipeline

1. **Candidates.** Writes the three best cut candidates as `<out>-cut<s>.mp4`:
   ```bash
   uv run "$SKILL_DIR/scripts/music/add-music.py" demo.mp4 demo-music.mp4 --song docs/demo/music/theme.json
   ```
2. **Listening round.** Send the user the candidates and ask which one flows best. Then run again with the chosen
   cut and delete the candidate files:
   ```bash
   uv run "$SKILL_DIR/scripts/music/add-music.py" demo.mp4 demo-music.mp4 --song docs/demo/music/theme.json --cut <s>
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
  phrase. In listening rounds a late cut was heard and an early one was not.
- **Length.** Whole phrases rarely fit exactly, so the last frame of the video is held for the rest: up to one
  phrase. The script re-encodes the video with the `to-mp4.sh` settings only when it holds a frame.
- **Level.** One level for the whole video, default -18 LUFS for the whole song (`--lufs`); the cut excerpt can
  measure a little lower. With no voice there is no ducking and no per-part levels. For a level change, render short
  A/B variants and ask.
- **Limits.** A demo longer than the song fails; the script does not loop the song. The 8-beat phrase fits songs in
  4/4; for another metre change `JUMP_BEATS` in `add-music.py`. Any audio already in the demo is dropped.
