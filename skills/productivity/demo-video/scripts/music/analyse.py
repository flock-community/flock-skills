# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["librosa", "numpy"]
# ///
"""Write <song>.json next to a song: its beat times, loudness and end, for add-music.py.

  uv run analyse.py <song.mp3>

Beats are tracked one by one, not taken from one bpm: a song can drift by a few bpm
(generated songs do), and a fixed grid then misses the beat late in the song.
"""
import json
import os
import re
import subprocess
import sys

import librosa
import numpy as np

song = sys.argv[1]
y, sr = librosa.load(song, sr=22050, mono=True)
hop = 256
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, units='time', tightness=400, trim=False)

stats = subprocess.run(['ffmpeg', '-hide_banner', '-i', song, '-af', 'ebur128=framelog=quiet,silencedetect=n=-50dB:d=0.3',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', stats)[-1])
length = len(y) / sr
# The end is where the trailing silence starts, plus a short tail for the decay.
silences = [float(s) for s in re.findall(r'silence_start: ([\d.]+)', stats)]
end = min(length, silences[-1] + 0.25) if silences and silences[-1] > length - 5 else length

out = os.path.splitext(song)[0] + '.json'
json.dump({'file': os.path.basename(song), 'lufs': lufs, 'end': round(end, 3), 'bpm': round(float(np.atleast_1d(tempo)[0]), 2),
           'beats': [round(float(b), 3) for b in beats]}, open(out, 'w'), indent=1)
print(f'wrote {out}: {len(beats)} beats, {lufs} LUFS, ends at {end:.2f}s of {length:.2f}s')
