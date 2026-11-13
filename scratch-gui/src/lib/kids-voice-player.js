import {planKidsVoice} from './kids-voice-text';

export const createKidsVoicePlayer = ({baseUrl, createAudio = () => new Audio(),
    loadManifest = async url => {
        const response = await fetch(url, {cache: 'no-cache'});
        if (!response.ok) throw new Error(`Audio de Kids no disponible (${response.status})`);
        return response.json();
    }, onError = error => console.warn('[Kids audio]', error.message)}) => {
    let audio = null;
    let manifest = null;
    let generation = 0;
    let active = false;
    let finishClip = null;
    let lastBlock = 0;
    const cancel = () => {
        generation++;
        active = false;
        if (finishClip) finishClip(false);
        if (audio) {
            audio.onended = null; audio.onerror = null;
            audio.pause(); audio.removeAttribute('src'); audio.load();
        }
    };
    const playClip = (clip, token) => new Promise(resolve => {
        if (token !== generation) { resolve(false); return; }
        if (!audio) audio = createAudio();
        let settled = false;
        let timer;
        const finish = ok => {
            if (settled) return;
            settled = true; clearTimeout(timer);
            audio.onended = null; audio.onerror = null;
            if (!ok) audio.pause();
            if (finishClip === finish) finishClip = null;
            resolve(ok && token === generation);
        };
        finishClip = finish;
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        timer = setTimeout(() => finish(false), Math.min(180000, Math.max(5000, (clip.duration || 30) * 1500 + 3000)));
        const url = new URL(clip.file, baseUrl);
        if (clip.sha256) url.searchParams.set('v', clip.sha256.slice(0, 12));
        audio.src = url.href;
        try {
            const playing = audio.play();
            if (playing && playing.catch) playing.catch(() => finish(false));
        } catch (_error) { finish(false); }
    });
    const speak = async (texts, {channel = 'story'} = {}) => {
        if (channel === 'block' && (active || Date.now() - lastBlock < 300)) return false;
        if (channel === 'block') lastBlock = Date.now();
        cancel();
        const token = generation;
        active = true;
        try {
            manifest = manifest || loadManifest(new URL('manifest.json', baseUrl).href);
            const data = await manifest;
            if (token !== generation) return false;
            const clips = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).flatMap(text => planKidsVoice(text, data.clips));
            for (const clip of clips) {
                if (token !== generation) return false;
                if (!await playClip(clip, token)) {
                    if (token === generation) onError(new Error('No se pudo reproducir la narración incluida.'));
                    return false;
                }
            }
            return true;
        } catch (error) {
            manifest = null;
            if (token === generation) onError(error);
            return false;
        } finally {
            if (token === generation) active = false;
        }
    };
    return {speak, cancel, isPlaying: () => active};
};
