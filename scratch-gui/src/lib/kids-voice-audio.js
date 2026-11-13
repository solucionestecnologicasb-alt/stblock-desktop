// Plain PCM assembly avoids decoder/network gaps between prerecorded fragments.
// No AudioContext, runtime synthesizer or speech engine is used.
export const readKidsWave = buffer => {
    const view = new DataView(buffer);
    const tag = offset => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    if (view.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Audio de Kids inválido.');
    let rate = 0;
    let start = 0;
    let length = 0;
    for (let at = 12; at + 8 <= view.byteLength;) {
        const size = view.getUint32(at + 4, true);
        if (at + 8 + size > view.byteLength) throw new Error('Audio de Kids incompleto.');
        if (tag(at) === 'fmt ') {
            if (size < 16 || view.getUint16(at + 8, true) !== 1 || view.getUint16(at + 10, true) !== 1 || view.getUint16(at + 22, true) !== 16) throw new Error('Se requiere audio PCM mono de 16 bits.');
            rate = view.getUint32(at + 12, true);
        } else if (tag(at) === 'data') { start = at + 8; length = size; }
        at += 8 + size + size % 2;
    }
    if (rate !== 22050 || !length || length % 2) throw new Error('Formato de narración no compatible.');
    // Copy rather than assume alignment of third-party RIFF chunks.
    const samples = new Int16Array(length / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(start + i * 2, true);
    return samples;
};

export const writeKidsWave = samples => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const tag = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    tag(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 22050, true); view.setUint32(28, 44100, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    tag(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
    return buffer;
};

export const joinKidsWave = (sources, plan) => {
    const rate = 22050;
    const pad = Math.round(rate * 0.045);
    const parts = sources.map(samples => {
        let first = 0, last = samples.length - 1;
        while (first < last && Math.abs(samples[first]) < 20) first++;
        while (last > first && Math.abs(samples[last]) < 20) last--;
        return samples.subarray(Math.max(0, first - pad), Math.min(samples.length, last + pad + 1));
    });
    const gaps = parts.map((part, i) => i === parts.length - 1 ? 0 : Math.round(rate * Math.max(0, Math.min(0.45, plan[i].pauseAfter || 0.09) - 0.09)));
    const length = parts.reduce((sum, part, i) => sum + part.length + gaps[i], 0);
    if (length > rate * 180) throw new Error('La narración es demasiado larga.');
    const result = new Int16Array(length);
    let offset = 0;
    parts.forEach((part, i) => { result.set(part, offset); offset += part.length + gaps[i]; });
    return {buffer: writeKidsWave(result), duration: length / rate};
};

export const createKidsNarrationAudio = ({baseUrl, fetchAudio = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo cargar un fragmento de narración.');
    return response.arrayBuffer();
}, createUrl = buffer => URL.createObjectURL(new Blob([buffer], {type: 'audio/wav'})), revokeUrl = url => URL.revokeObjectURL(url)}) => {
    const cache = new Map();
    let bytes = 0;
    const load = async clip => {
        const url = new URL(clip.file, baseUrl);
        if (clip.sha256) url.searchParams.set('v', clip.sha256.slice(0, 12));
        if (cache.has(url.href)) { const samples = cache.get(url.href); cache.delete(url.href); cache.set(url.href, samples); return samples; }
        const samples = readKidsWave(await fetchAudio(url.href));
        cache.set(url.href, samples); bytes += samples.byteLength;
        while (bytes > 16 * 1024 * 1024 && cache.size > 1) { const key = cache.keys().next().value; bytes -= cache.get(key).byteLength; cache.delete(key); }
        return samples;
    };
    return async (plan, isCurrent) => {
        if (plan.length <= 1) return {clips: plan, release() {}};
        const sources = [];
        // Small batches bound disk/network pressure and allow cancellation between reads.
        for (let at = 0; at < plan.length; at += 4) {
            if (!isCurrent()) return {clips: [], release() {}};
            sources.push(...await Promise.all(plan.slice(at, at + 4).map(load)));
        }
        if (!isCurrent()) return {clips: [], release() {}};
        const output = joinKidsWave(sources, plan);
        const url = createUrl(output.buffer);
        return {clips: [{file: url, duration: output.duration}], release: () => revokeUrl(url)};
    };
};
