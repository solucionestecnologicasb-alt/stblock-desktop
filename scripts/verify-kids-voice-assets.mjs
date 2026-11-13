import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectKidsVoiceCatalog, voiceOutput} from './kids-voice-catalog.mjs';

export async function verifyKidsVoiceAssets() {
    const catalog = await collectKidsVoiceCatalog();
    const manifest = JSON.parse(await readFile(resolve(voiceOutput,'manifest.json'),'utf8'));
    if (manifest.schema !== 1 || manifest.language !== 'es') throw new Error('El catálogo de voz de Kids no es válido.');
    const missing = catalog.entries.filter(entry => !manifest.clips[entry.key]);
    if (missing.length) throw new Error(`Faltan ${missing.length} audios de Kids: ${missing.slice(0,4).map(entry=>entry.key).join('; ')}. Regenera con scripts/generate-kids-voice.py antes de desplegar.`);
    for (const entry of catalog.entries) {
        const clip = manifest.clips[entry.key];
        if (!/^[a-f0-9]{24}\.wav$/.test(clip.file)) throw new Error('Ruta de audio de Kids inválida.');
        const bytes = await readFile(resolve(voiceOutput,clip.file));
        if (bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WAVE' || bytes.length<100 ||
            createHash('sha256').update(bytes).digest('hex')!==clip.sha256) throw new Error(`Audio de Kids incompleto o modificado: ${entry.key}`);
    }
    console.log(`[Kids audio] ${catalog.entries.length} grabaciones incluidas verificadas.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyKidsVoiceAssets();
