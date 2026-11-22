// Every instruction is prerecorded in Spanish; never invoke the operating system TTS.
export const KIDS_BLOCK_INSTRUCTIONS = {
    onflag: 'Comenzar al presionar la bandera verde.',
    onclick: 'Comenzar al pulsar el personaje.',
    ontouch: 'Comenzar cuando los personajes se tocan.',
    ontouchcolor: 'Comenzar al tocar un color.',
    ontouchsprite: 'Comenzar al tocar otro personaje.',
    onmessage: 'Comenzar al recibir un mensaje.',
    repeat: 'Repetir los bloques que hay dentro.',
    storyif: 'Si se cumple la condición, hace lo de dentro; si no, lo salta.',
    forward: 'Mueve el personaje hacia la derecha.', back: 'Mueve el personaje hacia la izquierda.', up: 'Mueve el personaje hacia arriba.', down: 'Mueve el personaje hacia abajo.',
    home: 'Ir al inicio.', randompos: 'Ir a una posición aleatoria.',
    left: 'Gira el personaje hacia la izquierda.', right: 'Gira el personaje hacia la derecha.', flipX: 'Voltea el personaje.', hop: 'Haz que el personaje salte.',
    storyjump: 'Saltar hacia delante sobre el agua.',
    cloudfly: 'Mistral vuela dos casillas hacia abajo.',
    wait: 'Espera antes de continuar con el siguiente bloque.', waitrandom: 'Espera un tiempo aleatorio antes de continuar.',
    setspeed: 'Fijar la velocidad.', stopmine: 'Parar el personaje.', stopall: 'Parar todos los personajes.',
    say: 'Muestra lo que dice el personaje.', show: 'Muestra el personaje.', hide: 'Oculta el personaje.', grow: 'Aumenta el tamaño del personaje.', shrink: 'Reduce el tamaño del personaje.',
    same: 'Restablecer el tamaño.', color: 'Cambiar el color.', fade: 'Cambiar la transparencia.',
    playsnd: 'Reproducir un sonido.', playusersnd: 'Reproducir el sonido grabado.',
    endstack: 'Termina esta secuencia de bloques.', forever: 'Repite esta secuencia una y otra vez.',
    randompage: 'Ir a una página aleatoria.', gotopage: 'Ir a la página indicada.', message: 'Enviar un mensaje.',
    pickup: 'Recoge el objeto o personaje que está en tu casilla. Te seguirá hasta que lo sueltes.',
    drop: 'Suelta aquí el objeto o personaje que llevas contigo.',
    interact: 'Activa el objeto que está en tu casilla.',
    touch: 'Toca el mecanismo que está en tu casilla o justo al lado y lo activa.'
};

export const KIDS_DIRECTION_INSTRUCTIONS = {
    StoryJumpBack: 'Salta hacia atrás.', StoryJumpDiagonal: 'Salta en diagonal hacia la salida.',
    StoryJumpForward: KIDS_BLOCK_INSTRUCTIONS.storyjump,
    CloudFlyForward: 'Mistral vuela dos casillas hacia delante.',
    CloudFlyBack: 'Mistral vuela dos casillas hacia atrás.',
    CloudFlyUp: 'Mistral vuela dos casillas hacia arriba.',
    CloudFlyDown: KIDS_BLOCK_INSTRUCTIONS.cloudfly
};

export const blockVoiceInstruction = (blockType, argument) => {
    if (typeof blockType !== 'string') return '';
    if (blockType === 'storyjump' || blockType === 'cloudfly') {
        return typeof argument === 'string' && Object.prototype.hasOwnProperty.call(KIDS_DIRECTION_INSTRUCTIONS, argument) ?
            KIDS_DIRECTION_INSTRUCTIONS[argument] : KIDS_BLOCK_INSTRUCTIONS[blockType];
    }
    return Object.prototype.hasOwnProperty.call(KIDS_BLOCK_INSTRUCTIONS, blockType) ? KIDS_BLOCK_INSTRUCTIONS[blockType] : '';
};

export const normalizeKidsVoiceText = text => String(text || '').normalize('NFC').toLowerCase()
    .replace(/\+/g, ' más ').replace(/−/g, ' menos ').replace(/-(?=\d)/g, ' menos ')
    .replace(/[^a-z0-9áéíóúüñ]+/g, ' ').trim().replace(/\s+/g, ' ');

// Longest matching phrase first; individual recorded words/numbers cover variable messages.
export const planKidsVoice = (text, clips, includeKeys = false) => {
    const words = normalizeKidsVoiceText(text).split(' ').filter(Boolean);
    const result = [];
    const limit = Math.max(1, ...Object.keys(clips).map(key => key.split(' ').length));
    for (let at = 0; at < words.length;) {
        let matched = false;
        for (let size = Math.min(limit, words.length - at); size > 0; size--) {
            const key = words.slice(at, at + size).join(' ');
            if (!Object.prototype.hasOwnProperty.call(clips, key)) continue;
            result.push(includeKeys ? {...clips[key], narrationWordCount: size} : clips[key]); at += size; matched = true; break;
        }
        if (matched) continue;
        // Scores from imported projects may exceed the campaign's normal range.
        if (/^\d+$/.test(words[at]) && words[at].split('').every(digit => clips[digit])) {
            const digits = words[at++].split('');
            result.push(...digits.map((digit, i) => includeKeys ? {...clips[digit], narrationWordCount: i === digits.length - 1 ? 1 : 0} : clips[digit]));
        } else {
            throw new Error(`Falta audio incluido para: ${words[at]}`);
        }
    }
    return result;
};

// Preserve punctuation when composing variable messages. A complete recording is
// always preferred over shorter fragments, so story paragraphs retain prosody.
export const planKidsNarration = (texts, clips) => {
    const result = [];
    for (const text of (Array.isArray(texts) ? texts : [texts]).filter(Boolean)) {
        const raw = String(text).normalize('NFC').toLowerCase();
        const tokens = [];
        const pattern = /[a-z0-9áéíóúüñ]+|[+−]|-(?=\d)/g;
        let match;
        while ((match = pattern.exec(raw))) tokens.push(match);
        let at = 0;
        for (const clip of planKidsVoice(text, clips, true)) {
            at += clip.narrationWordCount;
            const end = at > 0 ? tokens[at - 1].index + tokens[at - 1][0].length : 0;
            const punctuation = raw.slice(end, at < tokens.length ? tokens[at].index : raw.length);
            const pauseAfter = !clip.narrationWordCount ? 0.06 : /[.!?]/.test(punctuation) ? 0.35 :
                /[;:]/.test(punctuation) ? 0.24 : /,/.test(punctuation) ? 0.16 : 0.09;
            result.push({...clip, pauseAfter});
        }
        if (result.length) result[result.length - 1].pauseAfter = Math.max(0.4, result[result.length - 1].pauseAfter);
    }
    return result;
};
