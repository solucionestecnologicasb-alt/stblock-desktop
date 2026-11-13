"""Build-time only: render the shipped Kids narration with Piper; no TTS ships in the app.

Usage: python scripts/generate-kids-voice.py --model /path/es_ES-davefx-medium.onnx
Requires piper-tts==1.8.0. Existing complete clips are reused.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
parser.add_argument('--locale', choices=['es', 'es-MX'], default='es')
args = parser.parse_args()
PROFILE = 'clear-phrases-v2'
root = pathlib.Path(__file__).resolve().parent.parent
catalog = json.loads(subprocess.check_output(['node', str(root/'scripts'/'kids-voice-catalog.mjs')], cwd=root, text=True, encoding='utf-8'))
output = root/'scratch-gui'/'static'/'kids'/'voice'/args.locale
output.mkdir(parents=True, exist_ok=True)
model_hash = hashlib.sha256(pathlib.Path(args.model).read_bytes()).hexdigest()
previous = json.loads((output/'manifest.json').read_text(encoding='utf-8')) if (output/'manifest.json').exists() else {}
reuse = previous.get('profile') == PROFILE and previous.get('modelSha256') == model_hash
voice = PiperVoice.load(args.model, use_cuda=False)
config = SynthesisConfig(length_scale=1.15, noise_scale=0.333, noise_w_scale=0.333)
clips = {}
total_seconds = 0
for index, entry in enumerate(catalog['entries']):
    target = output/entry['file']
    if not target.exists() or not reuse:
        # Keep abbreviations intelligible for young Spanish-speaking children.
        text = entry['text'].replace('STB', 'ese te be').replace('stb', 'ese te be').replace('+', ' más ').replace('−', ' menos ')
        chunks = [chunk.audio_int16_array for chunk in voice.synthesize(text, config)]
        samples = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.int16)
        if len(samples) < 100: raise RuntimeError(f'Empty audio: {entry["key"]}')
        # Trim only external silence. Pauses within a sentence remain intact.
        active = np.flatnonzero(np.abs(samples.astype(np.int32)) > 30)
        rate = voice.config.sample_rate
        if len(active): samples = samples[max(0, active[0]-int(rate*.08)):min(len(samples), active[-1]+int(rate*.12))]
        # Cap abnormally long internal silences without altering voiced samples.
        window = max(1, int(rate*.01))
        frames = [np.max(np.abs(samples[i:i+window].astype(np.int32))) < 30 for i in range(0,len(samples),window)]
        runs = []; start = None
        for i, quiet in enumerate(frames+[False]):
            if quiet and start is None: start=i
            elif not quiet and start is not None:
                if (i-start)*window > rate*.9: runs.append((start*window, min(i*window,len(samples))))
                start=None
        for begin,end in reversed(runs):
            samples=np.concatenate((samples[:begin+int(rate*.55)],samples[end:]))
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
manifest={'schema':1,'language':'es','locale':args.locale,'voice':pathlib.Path(args.model).stem,'engine':'Piper 1.8.0 (build time only)',
          'profile':PROFILE,'lengthScale':1.15,'edgePaddingMs':[80,120],'modelSha256':model_hash,'clips':clips}
(output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
expected={entry['file'] for entry in catalog['entries']}
for obsolete in output.glob('*.wav'):
    if re.fullmatch(r'[0-9a-f]{24}\.wav',obsolete.name) and obsolete.name not in expected:
        if not obsolete.resolve().is_relative_to(output.resolve()): raise RuntimeError('Invalid generated audio path')
        obsolete.unlink()
print(f'Kids voice ready: {len(clips)} clips, {total_seconds/60:.1f} minutes, {sum(p.stat().st_size for p in output.glob("*.wav"))/1024/1024:.1f} MiB',flush=True)
