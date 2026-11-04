const ACTOR_IMAGES = {
    lumi: 'characters/lumi.svg',
    tula: 'characters/tula.svg',
    bito: 'characters/bito.svg',
    nara: 'characters/nara.svg',
    mistral: 'characters/mistral.svg',
    vega: 'characters/vega.svg'
};

// `basePath` suele ser './', pero estas imágenes se consumen dentro del iframe
// de ScratchJr; una ruta relativa se resolvería contra `/static/scratchjr/app/`
// y daría 404. Generamos la URL absoluta en el documento padre.
const resolveStoryUrl = path => {
    if (!path || typeof path !== 'string') {
        return path;
    }
    if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }
    if (typeof window === 'undefined') {
        return path;
    }
    try {
        return new URL(path.replace(/^\.\//, ''), window.location.href).href;
    } catch (_error) {
        return path;
    }
};

const storyAsset = (basePath, path) => resolveStoryUrl(`${basePath}static/kids/story/${path}`);
const actor = (id, name, icon, col, row, options = {}, basePath = '/') => ({
    id, name, icon, image: storyAsset(basePath, ACTOR_IMAGES[id]), role: id, col, row, scale: 1, locked: true, motion: 'idle', ...options
});

const object = (id, name, icon, col, row, options = {}, basePath = '/') => ({
    id, name, icon, col, row, scale: 0.8, locked: true, ...options,
    ...(options.image ? {image: storyAsset(basePath, options.image.replace(/^\/static\/kids\/story\//, ''))} : {})
});

// Child-friendly names for the block opcodes used by the story campaign. Lets
// the voice name the exact block that is missing instead of saying "the level
// block", which frustrates kids because it gives no next step.
const BLOCK_LABELS = {
    forward: 'Avanzar',
    up: 'Subir',
    down: 'Bajar',
    wait: 'Esperar',
    repeat: 'Repetir',
    storyif: 'Si',
    storyjump: 'Saltar',
    pickup: 'Recoger',
    drop: 'Soltar',
    playsnd: 'Tocar sonido',
    message: 'Enviar mensaje',
    cloudfly: 'Volar'
};

const blockLabel = block => BLOCK_LABELS[block] || 'especial';

// Rules and scene entities are kept separate from the campaign copy and fixed map geometry.
export const STORY_CHALLENGES = {
    1: {requiredBlocks: ['forward'], actors: [actor('lumi', 'Lumi', '✨', 4, 4)]},
    2: {requiredBlocks: ['forward'], requiredBlockSequence: ['forward', 'forward', 'forward'], actors: [actor('tula', 'Tula', '', 4, 3)]},
    3: {requiredActions: [{type: 'pickup', id: 'nara'}], requiredCarryAtGoal: 'nara', actors: [actor('nara', 'Nara', '', 2, 1, {carryable: true})]},
    4: {
        requiredBlocks: ['up', 'forward'],
        requiredActions: [{type: 'pickup', id: 'trunk'}, {type: 'drop', id: 'trunk', delivered: true}],
        actors: [actor('bito', 'Bito', '🦫', 4, 1)],
        objects: [object('trunk', 'Tronco', '', 2, 3, {image: '/static/kids/story/objects/trunk.svg', scale: 0.8, kind: 'item', carryable: true, size: 112, deliverCol: 4, deliverRow: 3})]
    },
    5: {
        requiredBlocks: ['repeat', 'up', 'forward', 'down'],
        requiredBlockSequence: ['up', 'repeat', 'forward', 'down'],
        movementRules: {
            allowedTypes: ['up', 'forward', 'down'],
            maxBlocksPerType: 1,
            fixedStep: 1,
            requireRepeatFor: ['forward'],
            requiredExecutions: {forward: 3}
        },
        actors: [actor('bito', 'Bito', '', 2, 2), actor('lumi', 'Lumi', '✨', 4, 4)]
    },
    6: {
        requiredBlocks: ['pickup', 'drop'],
        requiredActions: [
            {type: 'pickup', id: 'drop-1'}, {type: 'drop', id: 'drop-1', delivered: true},
            {type: 'pickup', id: 'drop-2'}, {type: 'drop', id: 'drop-2', delivered: true},
            {type: 'pickup', id: 'drop-3'}, {type: 'drop', id: 'drop-3', delivered: true}
        ],
        actors: [actor('tula', 'Tula', '🐢', 3, 1)],
        objects: [
            object('drop-1', 'Gota 1', '💧', 2, 3, {size: 44, kind: 'item', carryable: true, deliverCol: 1, deliverRow: 1}),
            object('drop-2', 'Gota 2', '💧', 3, 3, {size: 44, kind: 'item', carryable: true, deliverCol: 1, deliverRow: 1}),
            object('drop-3', 'Gota 3', '💧', 4, 3, {size: 44, kind: 'item', carryable: true, deliverCol: 1, deliverRow: 1})
        ]
    },
    7: {requiredBlocks: ['wait'], waitSeconds: 2, requiredActions: [{type: 'wait', duration: 2}], actors: [actor('nara', 'Nara', '🦉', 4, 3), actor('bito', 'Bito', '🦫', 5, 4)], objects: [object('bridge', 'Puente', '', 3, 4, {image: '/static/kids/story/objects/bridge.svg', size: 48, width: 220, height: 96, kind: 'mechanism', motion: 'bridge-cycle'})]},
    8: {
        blockedMessage: '¡Alto! Sigue las escaleras y no te salgas del camino. Vuelve al inicio e inténtalo otra vez.',
        requiredBlocks: ['repeat', 'forward', 'up', 'wait'],
        repeatDefault: 3,
        waitSeconds: 3,
        requiredActions: [{type: 'wait', duration: 3}],
        movementRules: {
            allowedTypes: ['forward', 'up'], maxBlocksPerType: 1, fixedStep: 1,
            requireRepeatFor: [], requireAnyMovementInsideRepeat: true, requiredExecutions: {forward: 3, up: 3},
            stepMessage: 'Usa solo Avanzar y Subir, con cada flecha en 1.',
            repeatMessage: 'Usa Repetir para hacer los movimientos del recorrido.',
            blockLimitMessage: 'Deja solo un bloque Avanzar y uno Subir. Repetir hará los pasos.',
            executionMessage: 'Repite los movimientos hasta recorrer las tres casillas de cada dirección.'
        },
        actors: [actor('lumi', 'Lumi', '✨', 4, 1)],
        objects: [object('echo-star', 'Estrella del eco', '⭐', 2, 1, {kind: 'obstacle', blocksMovement: true, motion: 'bob', size: 64, path: [[1, 1], [2, 1], [3, 1], [2, 1]]})]
    },
    9: {
        requiredBlocks: ['storyjump'],
        requiredActions: [
            {type: 'interact', id: 'bell'},
            {type: 'jump'}
        ],
        actors: [actor('tula', 'Tula', '', 3, 3)],
        objects: [object('bell', 'Campana', '', 4, 6, {kind: 'interactable'})]
    },
    10: {requiredActions: [{type: 'pickup', id: 'seeds'}, {type: 'drop', id: 'seeds', delivered: true}], actors: [actor('bito', 'Bito', '', 5, 2)], objects: [object('seeds', 'Caja de semillas', '', 7, 5, {kind: 'item', carryable: true, deliverCol: 7, deliverRow: 3})]},
    11: {
        blockedMessage: 'STB no puede cruzar esa zona. Programa a Mistral para volar por el agua o la altura.',
        requiredActions: [
            {type: 'pickup', id: 'stone-stb', actorName: 'STBlock'},
            {type: 'drop', id: 'stone-stb', delivered: true, actorName: 'STBlock'},
            {type: 'cloudfly', actorName: 'Mistral'},
            {type: 'pickup', id: 'stone-river', actorName: 'Mistral'},
            {type: 'drop', id: 'stone-river', delivered: true, actorName: 'Mistral'},
            {type: 'pickup', id: 'stone-high', actorName: 'Mistral'},
            {type: 'drop', id: 'stone-high', delivered: true, actorName: 'Mistral'}
        ],
        actors: [
            actor('mistral', 'Mistral', '☁️', 8, 4, {scale: 0.5, motion: 'idle', nativeSprite: true}),
            actor('lumi', 'Lumi', '✨', 5, 1)
        ],
        objects: [
            object('stone-stb', 'Piedra del sendero', '🪨', 3, 4, {kind: 'item', carryable: true, deliverCol: 5, deliverRow: 1}),
            object('stone-high', 'Piedra de la altura', '🪨', 1, 1, {kind: 'item', carryable: true, deliverCol: 5, deliverRow: 1}),
            object('stone-river', 'Piedra del río', '🪨', 8, 6, {kind: 'item', carryable: true, deliverCol: 5, deliverRow: 1})
        ]
    },
    12: {
        requiredBlocks: ['repeat'],
        requiredActions: [
            {type: 'pickup', id: 'feather', actorName: 'STBlock'},
            {type: 'drop', id: 'feather', delivered: true, actorName: 'STBlock'},
            {type: 'interact', id: 'gold-vane', actorName: 'Mistral'}
        ],
        actors: [
            actor('mistral', 'Mistral', '☁️', 8, 6, {scale: 0.5, nativeSprite: true}),
            actor('lumi', 'Lumi', '✨', 7, 3)
        ],
        objects: [
            object('feather', 'Pluma', '🪶', 2, 6, {kind: 'item', carryable: true, deliverCol: 3, deliverRow: 2, size: 36}),
            object('blue-vane', 'Veleta azul', '🔵', 3, 2, {kind: 'interactable', size: 28, showLabel: false}),
            object('gold-vane', 'Veleta dorada', '🟡', 7, 1, {kind: 'interactable', size: 28, showLabel: false})
        ]
    },
    13: {
        requiredBlocks: ['storyjump'],
        requiredActions: [
            {type: 'interact', id: 'switch', at: [8, 5]},
            {type: 'storyjump', from: [3, 4], destinations: [[4, 3]]}
        ],
        actors: [actor('lumi', 'Lumi', '✨', 7, 2)],
        objects: [object('switch', 'Interruptor', '🔆', 8, 5, {kind: 'interactable'})]
    },
    14: {
        requiredBlocks: ['repeat', 'storyif'],
        blockHints: {
            repeat: 'Te falta el bloque Repetir. Úsalo en algún lugar de tu programa.',
            storyif: 'Te falta el bloque Si. Úsalo con la condición "melodía lista" y mete dentro Activar, junto a la puerta de luz.'
        },
        // Llevar a Vega a la campanilla 1 se valida aparte (como el tronco del
        // mundo 4) para que no importe si el niño suelta a Vega antes o después
        // de tocar el primer sonido.
        requiredDelivery: {id: 'vega', at: [2, 4], hint: 'Lleva a Vega hasta la campanilla 1 y suéltala en la casilla 2, 4 con el bloque Soltar.'},
        requiredActions: [
            {type: 'playSound', at: [2, 4], hint: 'Lleva a tu personaje a la campanilla 1, en la casilla 2, 4, y toca un sonido.'},
            {type: 'playSound', at: [5, 4], hint: 'Ahora lleva a tu personaje a la campanilla 2, en la casilla 5, 4, y toca un sonido.'},
            {type: 'playSound', at: [6, 3], hint: 'Por último lleva a tu personaje a la campanilla 3, en la casilla 6, 3, y toca un sonido. El orden es 1, 2 y 3.'},
            {type: 'condition', condition: 'Si', result: true, hint: 'El bloque Si debe ir después de sonar las tres campanillas y su condición tiene que decir que la melodía está lista.'},
            {type: 'interact', id: 'light-gate', at: [7, 3], insideIf: true, hint: 'Con las tres notas ya sonando, lleva a tu personaje a la puerta de luz, en la casilla 7, 3, y usa Activar dentro del bloque Si.'}
        ],
        actors: [actor('vega', 'Vega', '🧑🏽‍🚀', 1, 2, {carryable: true, deliverCol: 2, deliverRow: 4})],
        objects: [
            object('chime-1', 'Campanilla 1', '🎵', 2, 4, {kind: 'soundTarget', noteOrder: 1, size: 44}),
            object('chime-2', 'Campanilla 2', '🎶', 5, 4, {kind: 'soundTarget', noteOrder: 2, size: 44}),
            object('chime-3', 'Campanilla 3', '🎼', 6, 3, {kind: 'soundTarget', noteOrder: 3, size: 44}),
            object('light-gate', 'Puerta de luz', '🔒', 7, 3, {kind: 'interactable', size: 48})
        ]
    },
    15: {
        requiredBlocks: ['repeat', 'storyif'],
        blockHints: {
            repeat: 'Usa Repetir en un recorrido largo: por ejemplo, repite Avanzar para cruzar la fila de abajo de una sola vez.',
            storyif: 'Usa el bloque Si en el programa de Vega. Su condición es "¿la válvula está abierta?". Dentro coloca Activar junto al panel de gas.'
        },
        requiredActions: [
            {type: 'interact', id: 'high-valve', actorName: 'Mistral', hint: 'Programa a Mistral: sube hasta la válvula del viento en la casilla 2, 2 y usa Activar. Mistral puede cruzar las rocas volando.'},
            {type: 'condition', condition: 'Si', result: true, actorName: 'Vega', hint: 'En el programa de Vega usa el bloque Si después de que Mistral abra la válvula. La condición debe cumplirse: la válvula ya está abierta.'},
            {type: 'interact', id: 'gas-panel', insideIf: true, actorName: 'Vega', hint: 'Lleva a Vega desde su casilla 3, 6 hasta el panel de gas en 7, 4: avanza por la fila de abajo y sube las dos últimas casillas. Usa Activar dentro del bloque Si.'}
        ],
        actors: [
            actor('mistral', 'Mistral', '☁️', 2, 5, {scale: 0.5, motion: 'idle', nativeSprite: true}),
            actor('vega', 'Vega', '🧑🏽‍🚀', 3, 6, {motion: 'idle', nativeSprite: true, matchPlayerHeight: true})
        ],
        objects: [
            object('balloon', 'Globo', '🎈', 7, 3, {kind: 'mechanism', motion: 'bob', size: 60}),
            object('high-valve', 'Válvula del viento', '🌀', 2, 2, {kind: 'interactable', size: 44}),
            object('gas-panel', 'Panel de gas', '⛽', 7, 4, {kind: 'interactable', size: 44})
        ]
    },
    16: {
        requiredBlocks: ['repeat', 'pickup', 'drop', 'touch', 'storyif'],
        blockHints: {
            repeat: 'Usa Repetir para avanzar varias casillas de una vez, por ejemplo para llegar a la llave o a la marca.',
            pickup: 'Acércate a la llave de nube en 3,6 y usa Recoger.',
            drop: 'Lleva la llave a la marca de la puerta en 6,3 y usa Soltar. Si estás en la marca, la entrega cuenta.',
            touch: 'El bloque Tocar activa un mecanismo que esté en tu casilla o justo al lado.',
            storyif: 'En el programa de Vega usa Si. La condición comprueba que la llave llegó y que Mistral tocó el molinete.'
        },
        requiredActions: [
            {type: 'pickup', id: 'cloud-key', actorName: 'STBlock', hint: 'Programa a STB: avanza hasta 3,6 y usa Recoger para llevar la llave de nube.'},
            {type: 'drop', id: 'cloud-key', delivered: true, actorName: 'STBlock', hint: 'Lleva la llave hasta la marca en 6,3 y usa Soltar encima para entregarla.'},
            {type: 'touch', id: 'wind-spinner', actorName: 'Mistral', hint: 'Mistral sale en 1,2: avanza 1 hasta 2,2 y usa Tocar para activar el molinete en 2,1.'},
            {type: 'condition', condition: 'Si', result: true, actorName: 'Vega', hint: 'En el programa de Vega usa el bloque Si después de entregar la llave y tocar el molinete. La condición debe cumplirse.'},
            {type: 'touch', id: 'tower-door', insideIf: true, actorName: 'Vega', hint: 'Vega sale en 6,2: avanza 1, baja 1 hasta la puerta en 7,3 y usa Tocar dentro del bloque Si.'}
        ],
        actors: [
            actor('mistral', 'Mistral', '☁️', 1, 2, {scale: 0.5, motion: 'idle', nativeSprite: true}),
            actor('vega', 'Vega', '🧑🏽‍🚀', 6, 2, {motion: 'idle', nativeSprite: true, matchPlayerHeight: true})
        ],
        objects: [
            object('cloud-key', 'Llave de nube', '🗝️', 3, 6, {kind: 'item', carryable: true, size: 44, deliverCol: 6, deliverRow: 3}),
            object('wind-spinner', 'Molinete de viento', '🌀', 2, 1, {kind: 'interactable', size: 44}),
            object('tower-door', 'Puerta de la torre', '🚪', 7, 3, {kind: 'interactable', size: 48})
        ]
    },
    17: {
        requiredBlocks: ['repeat', 'touch', 'storyif'],
        blockHints: {
            repeat: 'Cuenta los pisos: con Repetir 5 y Subir dentro, STB sube los cinco niveles del ascensor.',
            touch: 'El bloque Tocar activa la palanca o la puerta del ascensor que esté en tu casilla o justo al lado.',
            storyif: 'En el programa de Vega usa Si. La condición comprueba que STB llegó arriba y que la palanca ya está activada.'
        },
        requiredActions: [
            {type: 'repeat', count: 5, hint: 'Usa Repetir con el valor 5 y pon Subir dentro para que STB suba los cinco pisos hasta 2,1.'},
            {type: 'touch', id: 'lift-lever', actorName: 'Mistral', hint: 'Mistral sale en 7,6: repite Subir 5 por el hueco y usa Tocar la palanca en 8,1.'},
            {type: 'condition', condition: 'Si', result: true, actorName: 'Vega', hint: 'En el programa de Vega usa el bloque Si después de que STB suba y Mistral active la palanca. La condición debe cumplirse.'},
            {type: 'touch', id: 'lift-door', insideIf: true, actorName: 'Vega', hint: 'Vega sale en 6,2: retrocede 3, sube 1 hasta la puerta en 3,1 y usa Tocar dentro del bloque Si.'}
        ],
        actors: [
            actor('mistral', 'Mistral', '☁️', 7, 6, {scale: 0.5, motion: 'idle', nativeSprite: true}),
            actor('vega', 'Vega', '🧑🏽‍🚀', 6, 2, {motion: 'idle', nativeSprite: true, matchPlayerHeight: true})
        ],
        objects: [
            object('elevator', 'Ascensor', '🛗', 2, 3, {kind: 'mechanism', motion: 'bob', size: 56}),
            object('lift-lever', 'Palanca del ascensor', '🎚️', 8, 1, {kind: 'interactable', size: 44}),
            object('lift-door', 'Puerta del piso alto', '🚪', 3, 1, {kind: 'interactable', size: 48})
        ]
    },
    18: {
        requiredBlocks: ['touch'],
        blockHints: {
            touch: 'Llega hasta el panel en 6,2 y usa el bloque Tocar para abrir la ventana de la operación.'
        },
        requiredActions: [
            {type: 'touch', id: 'panel', hint: 'Programa a STB con varios movimientos: avanza 2, sube 2, avanza 3 y sube 2 hasta el panel en 6,2. Después usa Tocar.'}
        ],
        actors: [],
        objects: [
            object('panel', 'Panel de la puerta', '🔐', 6, 2, {kind: 'interactable', size: 52})
        ]
    },
    19: {
        requiredBlocks: ['repeat', 'touch'],
        blockHints: {
            repeat: 'Usa Repetir para cruzar varias casillas de una vez en cada personaje.',
            touch: 'Llega al panel o a la lámpara y usa Tocar para activarlos.'
        },
        requiredActions: [
            {type: 'touch', id: 'panel', actorName: 'STBlock', hint: 'STB: avanza 3, sube 2, avanza 2 y sube 2 hasta el panel en 6,2. Después usa Tocar.'},
            {type: 'touch', id: 'lamp', actorName: 'Vega', hint: 'Vega sale en 8,6: sube 4 hasta la lámpara en 8,2 y usa Tocar.'}
        ],
        actors: [
            actor('vega', 'Vega', '🧑🏽‍🚀', 8, 6, {motion: 'idle', nativeSprite: true, matchPlayerHeight: true})
        ],
        objects: [
            object('panel', 'Panel de la cámara', '🔐', 6, 2, {kind: 'interactable', size: 52}),
            object('lamp', 'Lámpara del faro', '💡', 8, 2, {kind: 'interactable', size: 46})
        ]
    },
    20: {
        optionalCheckpoints: true,
        requiredBlocks: ['repeat', 'touch'],
        blockHints: {
            repeat: 'Usa Repetir para cruzar varios escalones de una vez con cada personaje.',
            touch: 'Llega al corazón del faro con STB y al prisma de luz con Vega, y usa Tocar en cada uno.'
        },
        requiredActions: [
            {type: 'touch', id: 'heart-panel', actorName: 'STBlock', hint: 'STB (sale en 1,6): avanza 3, sube 2, avanza 2 y sube 3 hasta el corazón del faro en 6,1. Después usa Tocar.'},
            {type: 'touch', id: 'light-prism', actorName: 'Vega', hint: 'Vega (sale en 8,6): sube 3 hasta el prisma de luz en 8,3 y usa Tocar.'}
        ],
        actors: [
            actor('vega', 'Vega', '🧑🏽‍🚀', 8, 6, {motion: 'idle', nativeSprite: true, matchPlayerHeight: true})
        ],
        objects: [
            object('heart-panel', 'Corazón del faro', '❤️', 6, 1, {kind: 'interactable', size: 52}),
            object('light-prism', 'Prisma de luz', '🔷', 8, 3, {kind: 'interactable', size: 46})
        ]
    }
};

export const getStoryChallenge = (level, saved = {}, basePath = '/') => {
    const base = STORY_CHALLENGES[level] || {};
    const availableBlocks = new Set();
    for (let world = 1; world <= level; world++) {
        const chapter = STORY_CHALLENGES[world] || {};
        (chapter.requiredBlocks || []).forEach(block => availableBlocks.add(block));
        (chapter.requiredBlockSequence || []).forEach(block => availableBlocks.add(block));
        (chapter.requiredActions || []).forEach(action => {
            if (action.type === 'sendMessage') availableBlocks.add('message');
            else if (action.type === 'playSound') availableBlocks.add('playsnd');
            else availableBlocks.add(action.type);
        });
    }
    // Saltar is introduced in world 9 and remains unlocked for the rest of the adventure.
    if (level >= 9) availableBlocks.add('storyjump');
    if (level >= 11) availableBlocks.add('cloudfly');
    const actors = saved.actors || base.actors || [];
    const resolvedObjects = level === 15 || level === 16 || level === 17 || level === 18 || level === 19 || level === 20 ? (base.objects || []) : level === 11 ? (() => {
        const savedObjects = saved.objects || [];
        const baseObjects = base.objects || [];
        const merged = baseObjects.map(baseObject => {
            const savedObject = savedObjects.find(entity => entity.id === baseObject.id) || {};
            const resolved = {...baseObject, ...savedObject};
            if (!Number.isFinite(Number(resolved.deliverCol)) || Number(resolved.deliverCol) < 1) resolved.deliverCol = baseObject.deliverCol;
            if (!Number.isFinite(Number(resolved.deliverRow)) || Number(resolved.deliverRow) < 1) resolved.deliverRow = baseObject.deliverRow;
            return resolved;
        });
        return [...merged, ...savedObjects.filter(entity => !baseObjects.some(baseObject => baseObject.id === entity.id))];
    })() : level === 4 ? (() => {
        const oldTrunk = (saved.objects || []).find(entity => entity.id === 'trunk' || entity.id === 'trunk-left' || entity.id === 'trunk-right');
        const baseTrunk = base.objects[0];
        const trunk = {...baseTrunk, ...(oldTrunk || {}), id: 'trunk', name: 'Tronco', image: oldTrunk?.image || baseTrunk.image, kind: 'item', carryable: true};
        if (!Number.isFinite(Number(trunk.size)) || Number(trunk.size) <= 0) trunk.size = baseTrunk.size;
        if (!Number.isFinite(Number(trunk.deliverCol))) trunk.deliverCol = baseTrunk.deliverCol;
        if (!Number.isFinite(Number(trunk.deliverRow))) trunk.deliverRow = baseTrunk.deliverRow;
        return [...(saved.objects || []).filter(entity => !['trunk', 'trunk-left', 'trunk-right'].includes(entity.id)), trunk];
    })() : (saved.objects || base.objects || []);
    const resolvedActors = level === 15 || level === 16 || level === 17 || level === 18 || level === 19 || level === 20 ? (base.actors || []) : level === 3 ? (() => {
        const hasNara = actors.some(entity => entity.id === 'nara');
        const withNara = hasNara ? actors : [...actors, ...base.actors];
        return withNara.map(entity => entity.id === 'nara' ? {...entity, carryable: true} : entity);
    })() : level === 14 ? (base.actors || []).map(entity => entity.id === 'vega'
        // Vega es un objeto que se recoge y se lleva. Forzamos su configuración
        // base para que las calibraciones guardadas antiguas (con Vega quieta en
        // la meta) no impidan recogerla.
        ? {...entity, carryable: true} : entity) : actors;
    const resolveAsset = path => {
        if (typeof path !== 'string' || !path.includes('static/kids/story/')) {
            return path;
        }
        if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }
        return resolveStoryUrl(path.startsWith('/')
            ? `${basePath}${path.slice(1)}`
            : `${basePath}${path.replace(/^\.\//, '')}`);
    };
    return {
        ...base,
        ...saved,
        requiredBlocks: saved.requiredBlocks || base.requiredBlocks || [],
        requiredBlockSequence: saved.requiredBlockSequence || base.requiredBlockSequence || [],
        requiredActions: level === 4 || level === 15 || level === 16 || level === 17 || level === 18 || level === 19 || level === 20 ? base.requiredActions : (saved.requiredActions || base.requiredActions || []),
        availableBlocks: [...availableBlocks],
        actors: resolvedActors.map(entity => ({...entity, image: resolveAsset(entity.image)})),
        objects: resolvedObjects.map(entity => ({...entity, image: resolveAsset(entity.image)}))
    };
};

export const evaluateStoryChallenge = ({challenge, calibration, position, trace = [], actions = [], blockUsage = [], carriedId = null, carriedObjectsByActor = {}, worldObjects = [], movementBlocks = [], blockedCell = null, ruleViolation = ''}) => {
    const fail = (code, message, speechMessage = message) => ({complete: false, code, message, speechMessage});
    const isWorld11 = (challenge.requiredActions || []).some(requirement => requirement.id === 'stone-stb') ||
        (challenge.objects || []).some(entity => entity.id === 'stone-stb');
    const isWorld12 = (challenge.requiredActions || []).some(requirement => requirement.id === 'feather') ||
        (challenge.objects || []).some(entity => entity.id === 'blue-vane');
    if (blockedCell) return fail('blocked-cell', challenge.blockedMessage || '¡Alto! Esa casilla tiene agua. Vuelve al inicio y busca un camino seguro; el programa se detuvo.');
    if (ruleViolation) return fail('movement-rule', ruleViolation);
    if (!position && !isWorld11 && !isWorld12) return fail('no-position', 'Rayo todavía no llegó a la meta.');
    if (!isWorld11 && !isWorld12) {
        const goalX = calibration.originX + (calibration.goalCol - 1) * calibration.stepX;
        const goalY = calibration.originY + (calibration.goalRow - 1) * calibration.stepY;
        if (Math.abs(position.x - goalX) > calibration.goalTolerance || Math.abs(position.y - goalY) > calibration.goalTolerance) {
            return fail('goal', isWorld12 ? 'Mistral debe llegar junto a Lumi después de activar la veleta dorada.' : 'Aún no llegamos a la meta. Revisa el camino y vuelve a probar.');
        }
    }
    const requiredCheckpoints = challenge.optionalCheckpoints ? [] : (calibration.checkpoints || []);
    let nextCheckpoint = 0;
    for (const point of trace) {
        const expected = requiredCheckpoints[nextCheckpoint];
        if (expected && point.x === expected[0] && point.y === expected[1]) nextCheckpoint += 1;
    }
    if (challenge.requiredActions?.some(action => action.id === 'switch' && action.at) && nextCheckpoint < requiredCheckpoints.length) {
        const expected = requiredCheckpoints[nextCheckpoint];
        const activatedCheckpoint = actions.some(action => action?.success && action.id === 'switch' && action.cell?.x === expected?.[0] && action.cell?.y === expected?.[1]);
        if (activatedCheckpoint) nextCheckpoint += 1;
    }
    if (nextCheckpoint < requiredCheckpoints.length) {
        const [col, row] = requiredCheckpoints[nextCheckpoint];
        const switchAtCheckpoint = challenge.requiredActions?.some(action => action.id === 'switch' && action.at?.[0] === col && action.at?.[1] === row);
        return fail('checkpoint', switchAtCheckpoint ? `Pisa el interruptor de la casilla ${col}, ${row} para encenderlo.` : `Busca primero la señal de la casilla ${col}, ${row}.`);
    }
    const objectObstacles = (challenge.objects || [])
        .filter(entity => entity.kind === 'obstacle' && !entity.blocksMovement)
        .map(entity => [Number(entity.col), Number(entity.row)]);
    const blocked = [...(calibration.blocked || []), ...objectObstacles];
    if (blocked.some(cell => trace.some(point => point.x === cell[0] && point.y === cell[1]))) {
        return fail('obstacle', 'El camino está bloqueado. Busca una ruta alrededor.');
    }
    for (const block of challenge.requiredBlocks || []) {
        if (!blockUsage.includes(block)) {
            const hint = challenge.blockHints && challenge.blockHints[block];
            const message = hint
                || (isWorld12 && block === 'repeat'
                    ? 'Usa Repetir en uno de los recorridos para seguir el patrón.'
                    : `Te falta el bloque ${blockLabel(block)}. Búscalo en la paleta y colócalo en el programa.`);
            return fail(`block:${block}`, message);
        }
    }
    if (challenge.requiredDelivery) {
        const delivery = challenge.requiredDelivery;
        const delivered = actions.some(action => action && action.success === true && action.type === 'drop'
            && action.id === delivery.id && action.delivered === true
            && (!delivery.at || (action.cell && action.cell.x === delivery.at[0] && action.cell.y === delivery.at[1])));
        if (!delivered) {
            return fail('delivery', delivery.hint || `Lleva el objeto al lugar indicado y usa Soltar.`);
        }
    }
    if (challenge.movementRules) {
        const rules = challenge.movementRules;
        for (const block of movementBlocks) {
            if (!(rules.allowedTypes || []).includes(block.type) || Number(block.step) !== Number(rules.fixedStep)) {
                return fail('movement-rule', rules.stepMessage || 'En este reto usa solo un bloque de cada movimiento y déjalo en 1.');
            }
            if ((rules.requireRepeatFor || []).includes(block.type) && Number(block.executionsInsideRepeat) !== Number(block.executions)) {
                return fail('repeat-required', rules.repeatMessage || 'Pon los bloques de movimiento dentro de Repetir.');
            }
        }
        const counts = {};
        for (const block of movementBlocks) counts[block.type] = (counts[block.type] || 0) + 1;
        for (const type of rules.allowedTypes || []) {
            if ((counts[type] || 0) > Number(rules.maxBlocksPerType || 1)) {
                return fail('movement-limit', rules.blockLimitMessage || 'Coloca un solo bloque de cada movimiento. Usa Repetir para avanzar varias casillas.');
            }
        }
        if (rules.requireAnyMovementInsideRepeat && !movementBlocks.some(block => Number(block.executionsInsideRepeat) > 0)) {
            return fail('repeat-required', rules.repeatMessage || 'Incluye un movimiento dentro de Repetir.');
        }
        for (const [type, expected] of Object.entries(rules.requiredExecutions || {})) {
            const movement = movementBlocks.find(block => block.type === type);
            if (!movement || Number(movement.executions) !== Number(expected)) {
                return fail('repeat-count', rules.executionMessage || 'Ajusta Repetir para recorrer todas las casillas del camino.');
            }
        }
    }
    const actionTrace = actions.filter(action => action && action.success);
    if (isWorld11) {
        const stoneNames = {'stone-stb': 'la piedra del sendero', 'stone-river': 'la piedra del río', 'stone-high': 'la piedra de la altura'};
        const carriedIds = new Set(Object.values(carriedObjectsByActor || {}));
        const deliveredAtGoal = id => {
            const item = worldObjects.find(entity => entity.id === id);
            if (item) return Number(item.col) === Number(calibration.goalCol)
                && Number(item.row) === Number(calibration.goalRow) && !carriedIds.has(id);
            return actionTrace.some(action => action.type === 'drop' && action.id === id && action.delivered === true
                && action.cell && action.cell.x === Number(calibration.goalCol) && action.cell.y === Number(calibration.goalRow));
        };
        const missingStone = ['stone-stb', 'stone-river', 'stone-high'].find(id => !deliveredAtGoal(id));
        if (missingStone) {
            return fail('stones-at-goal', `Falta dejar ${stoneNames[missingStone]} junto a Lumi.`, `Te falta dejar ${stoneNames[missingStone]} junto a Lumi.`);
        }
    }

    let sequenceIndex = 0;
    for (const block of blockUsage) {
        if (block === (challenge.requiredBlockSequence || [])[sequenceIndex]) sequenceIndex += 1;
    }
    if (sequenceIndex < (challenge.requiredBlockSequence || []).length) return fail('block-sequence', 'Sigue el patrón de bloques del camino.');
    let actionIndex = 0;
    for (const requirement of isWorld11 ? [] : challenge.requiredActions || []) {
        const foundAt = actionTrace.findIndex((action, index) => index >= actionIndex && action.type === requirement.type &&
            (!requirement.id || action.id === requirement.id) &&
            (requirement.duration === undefined || Number(action.duration) >= Number(requirement.duration)) &&
            (!requirement.requireInsideRepeat || action.inRepeat === true) &&
            (!requirement.actorName || action.actorName === requirement.actorName) &&
            (requirement.count === undefined || Number(action.count) === Number(requirement.count)) &&
            (!requirement.delivered || action.delivered === true) &&
            (requirement.condition === undefined || action.condition === requirement.condition) &&
            (requirement.result === undefined || action.result === requirement.result) &&
            (!requirement.insideIf || action.insideIf === true) &&
            (!requirement.at || (action.cell && action.cell.x === requirement.at[0] && action.cell.y === requirement.at[1])) &&
            (!requirement.from || (action.from && action.from.x === requirement.from[0] && action.from.y === requirement.from[1])) &&
            (!requirement.destinations || requirement.destinations.some(destination => action.to && action.to.x === destination[0] && action.to.y === destination[1])));
        if (foundAt < 0) {
            let message = 'Usa el bloque indicado en el lugar correcto.';
            if (requirement.hint) {
                // The mission can give the exact next step for this requirement.
                message = requirement.hint;
            } else if (requirement.type === 'pickup') message = requirement.id === 'nara' ? 'Párate junto a Nara y usa Recoger.' : requirement.id === 'feather' ? 'Programa a STB para recoger la pluma.' : requirement.id?.startsWith('drop-') ? 'Recoge cada gota de las hojas, una por una, y llévala al molino.' : 'Párate junto al objeto y usa Recoger.';
            else if (requirement.type === 'drop') message = requirement.id === 'feather' ? 'Lleva la pluma hasta la veleta azul y usa Soltar.' : requirement.id?.startsWith('drop-') ? 'Lleva la gota hasta el molino y usa Soltar. Debes entregar las tres.' : 'Lleva el objeto al lugar indicado y usa Soltar.';
            else if (requirement.type === 'interact') message = requirement.id === 'light-gate' ? 'Cuando suenen las tres campanillas, usa Activar dentro del bloque Si, junto a la puerta.' : requirement.id === 'gold-vane' ? 'Después de dejar la pluma en la veleta azul, programa a Mistral para usar Activar junto a la dorada.' : requirement.id === 'switch' ? 'Ve al interruptor de la casilla 8, 5 y usa Activar.' : 'Llega al objeto y usa Activar.';
            else if (requirement.type === 'playSound') message = 'Haz sonar las tres campanillas en orden: primero la 1, luego la 2 y al final la 3.';
            else if (requirement.type === 'condition') message = 'Pon el bloque Si después de las tres notas. Debe decir que la melodía está lista.';
            else if (requirement.type === 'wait') message = `Pon Esperar en ${requirement.duration} segundos dentro de Repetir.`;
            else if (requirement.type === 'repeat') message = `Usa Repetir con el valor ${requirement.count} para recorrer el túnel.`;
            else if (requirement.type === 'jump' || requirement.type === 'storyjump') message = requirement.from && requirement.destinations ? 'Después de activar el interruptor, llega a la casilla 3, 4 y salta en diagonal hasta la 4, 3.' : 'Activa la campana y usa Saltar en la ruta que elijas antes de llegar a la salida.';
            return fail(`action:${requirement.type}`, message);
        }
        actionIndex = foundAt + 1;
    }
    if (isWorld12) {
        if (!position) return fail('no-position', 'Mistral todavía no llegó junto a Lumi.');
        const goalX = calibration.originX + (calibration.goalCol - 1) * calibration.stepX;
        const goalY = calibration.originY + (calibration.goalRow - 1) * calibration.stepY;
        if (Math.abs(position.x - goalX) > calibration.goalTolerance || Math.abs(position.y - goalY) > calibration.goalTolerance) {
            return fail('goal', 'Mistral debe llegar junto a Lumi después de activar la veleta dorada.');
        }
    }
    if (challenge.requiredCarryAtGoal && carriedId !== challenge.requiredCarryAtGoal) {
        return fail('carry-goal', 'Nara todavía no llegó con Rayo a su familia. Llévala hasta la rama alta.');
    }
    if (challenge.requiredActions?.some(action => action.type === 'drop' && action.id === 'trunk' && action.delivered) &&
        !actionTrace.some(action => action.type === 'drop' && action.id === 'trunk' && action.delivered === true)) {
        return fail('trunk-delivery', 'Primero lleva el tronco hasta la marca del claro y usa Soltar. Después ve con Bito.');
    }
    return {complete: true, code: 'complete', message: '¡Reto superado!'};
};
