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
    forward: 'Mover a la derecha.', back: 'Mover a la izquierda.', up: 'Subir.', down: 'Bajar.',
    home: 'Ir al inicio.', randompos: 'Ir a una posición aleatoria.',
    left: 'Girar a la izquierda.', right: 'Girar a la derecha.', flipX: 'Voltear.', hop: 'Saltar.',
    storyjump: 'Saltar hacia delante sobre el agua.',
    cloudfly: 'Mistral vuela dos casillas hacia abajo.',
    wait: 'Esperar.', waitrandom: 'Esperar un tiempo aleatorio.',
    setspeed: 'Fijar la velocidad.', stopmine: 'Parar el personaje.', stopall: 'Parar todos los personajes.',
    say: 'Decir.', show: 'Mostrar.', hide: 'Ocultar.', grow: 'Crecer.', shrink: 'Disminuir.',
    same: 'Restablecer el tamaño.', color: 'Cambiar el color.', fade: 'Cambiar la transparencia.',
    playsnd: 'Reproducir un sonido.', playusersnd: 'Reproducir el sonido grabado.',
    endstack: 'Finalizar.', forever: 'Repetir indefinidamente.',
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
export const planKidsVoice = (text, clips) => {
    const words = normalizeKidsVoiceText(text).split(' ').filter(Boolean);
    const result = [];
    const limit = Math.max(1, ...Object.keys(clips).map(key => key.split(' ').length));
    for (let at = 0; at < words.length;) {
        let matched = false;
        for (let size = Math.min(limit, words.length - at); size > 0; size--) {
            const key = words.slice(at, at + size).join(' ');
            if (!Object.prototype.hasOwnProperty.call(clips, key)) continue;
            result.push(clips[key]); at += size; matched = true; break;
        }
        if (matched) continue;
        // Scores from imported projects may exceed the campaign's normal range.
        if (/^\d+$/.test(words[at]) && words[at].split('').every(digit => clips[digit])) {
            result.push(...words[at++].split('').map(digit => clips[digit]));
        } else {
            throw new Error(`Falta audio incluido para: ${words[at]}`);
        }
    }
    return result;
};
