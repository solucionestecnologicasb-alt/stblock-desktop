"""Build-time only: render the shipped Kids narration with Piper; no TTS ships in the app.

Usage: python scripts/generate-kids-voice.py --model /path/es_ES-davefx-medium.onnx
Requires piper-tts==1.8.0. Existing complete clips are reused.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
catalog = json.loads(subprocess.check_output(['node', str(root/'scripts'/'kids-voice-catalog.mjs')], cwd=root, text=True, encoding='utf-8'))
output = root/'scratch-gui'/'static'/'kids'/'voice'/'es'
output.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(args.model, use_cuda=False)
config = SynthesisConfig(length_scale=1.05, noise_scale=0.5, noise_w_scale=0.333)
clips = {}
total_seconds = 0
for index, entry in enumerate(catalog['entries']):
    target = output/entry['file']
    if not target.exists():
        # Keep abbreviations intelligible for young Spanish-speaking children.
        text = entry['text'].replace('STB', 'ese te be').replace('stb', 'ese te be')
        chunks = [chunk.audio_int16_array for chunk in voice.synthesize(text, config)]
        samples = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.int16)
        if len(samples) < 100: raise RuntimeError(f'Empty audio: {entry["key"]}')
        # Trim only external silence. Pauses within a sentence remain intact.
        active = np.flatnonzero(np.abs(samples.astype(np.int32)) > 150)
        if len(active): samples = samples[max(0, active[0]-220):min(len(samples), active[-1]+661)]
        temporary = target.with_suffix('.tmp')
        with wave.open(str(temporary), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(voice.config.sample_rate)
            wav.writeframes(samples.astype('<i2').tobytes())
        temporary.replace(target)
    with wave.open(str(target),'rb') as wav:
        if wav.getnchannels()!=1 or wav.getsampwidth()!=2 or wav.getnframes()<100: raise RuntimeError(f'Invalid audio: {target}')
        duration=wav.getnframes()/wav.getframerate()
    clips[entry['key']]={'file':entry['file'],'duration':round(duration,3),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    total_seconds += duration
    if index%50==0: print(f'Kids voice: {index+1}/{len(catalog["entries"])} clips',flush=True)
manifest={'schema':1,'language':'es','voice':'es_ES-davefx-medium','engine':'Piper 1.8.0 (build time only)',
          'modelSha256':hashlib.sha256(pathlib.Path(args.model).read_bytes()).hexdigest(),'clips':clips}
(output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Kids voice ready: {len(clips)} clips, {total_seconds/60:.1f} minutes, {sum(p.stat().st_size for p in output.glob("*.wav"))/1024/1024:.1f} MiB',flush=True)
