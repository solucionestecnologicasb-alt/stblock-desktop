import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './scratchjr-kids-workspace.css';
import {evaluateStoryChallenge, getStoryChallenge} from './story-challenges';
import {createKidsVoicePlayer} from '../../lib/kids-voice-player';
import {blockVoiceInstruction} from '../../lib/kids-voice-text';

const PROJECT_KEY = 'stblock.kids.scratchjr.project';
const STORY_HOME_PROGRESS_KEY = 'stblock.kids.story.home-progress';
const STORY_PENDING_NAME_KEY = 'stblock.kids.story.pending-player-name';
const APP_PATH = 'static/scratchjr/app/';
// `any-pointer` sobrevive a emulaciones/devtools que desactivan el puntero
// primario (p. ej. el selector de elementos) y sigue siendo fiable en Android.
const MOBILE_KIDS_QUERY = '(max-width: 760px), (any-pointer: coarse) and (max-height: 600px)';
const emptyStoryProgress = playerName => ({version: 1, completed: [], unlocked: 1, sparks: 0, activeLevel: 1, introsSeen: [], attemptsByLevel: {}, levelScores: {}, starsByLevel: {}, starsSpent: 0, hintsByLevel: {}, playerName: playerName || ''});
const readMobileStoryProgress = () => {
    try {
        const saved = window.localStorage.getItem(STORY_HOME_PROGRESS_KEY);
        return saved ? {...emptyStoryProgress(), ...JSON.parse(saved)} : null;
    } catch (_error) {
        return null;
    }
};
const writeMobileStoryProgress = progress => {
    try {
        window.localStorage.setItem(STORY_HOME_PROGRESS_KEY, JSON.stringify(progress));
    } catch (_error) {
        // The ScratchJr project remains the primary copy of story progress.
    }
};
const mergeStoryProgress = (projectProgress, deviceProgress) => {
    const project = {...emptyStoryProgress(), ...(projectProgress || {})};
    const device = {...emptyStoryProgress(), ...(deviceProgress || {})};
    const projectTime = Number(project.updatedAt) || 0;
    const deviceTime = Number(device.updatedAt) || 0;
    const latest = deviceTime > projectTime ? device : project;
    const mergedByLevel = key => {
        const output = {...(project[key] || {})};
        Object.entries(device[key] || {}).forEach(([level, value]) => {
            if (key === 'hintsByLevel') {
                output[level] = Array.from(new Set([...(output[level] || []), ...(value || [])]));
            } else {
                output[level] = Math.max(Number(output[level]) || 0, Number(value) || 0);
            }
        });
        return output;
    };
    const legacyDeviceHasMore = !projectTime && !deviceTime && (
        Number(device.unlocked) > Number(project.unlocked) ||
        (device.completed || []).length > (project.completed || []).length
    );
    return {
        ...project,
        ...latest,
        completed: Array.from(new Set([...(project.completed || []), ...(device.completed || [])])),
        unlocked: Math.max(Number(project.unlocked) || 1, Number(device.unlocked) || 1),
        sparks: Math.max(Number(project.sparks) || 0, Number(device.sparks) || 0),
        activeLevel: legacyDeviceHasMore ? Number(device.activeLevel) || 1 : Number(latest.activeLevel) || 1,
        introsSeen: Array.from(new Set([...(project.introsSeen || []), ...(device.introsSeen || [])])),
        attemptsByLevel: mergedByLevel('attemptsByLevel'),
        levelScores: mergedByLevel('levelScores'),
        starsByLevel: mergedByLevel('starsByLevel'),
        hintsByLevel: mergedByLevel('hintsByLevel'),
        starsSpent: Math.max(Number(project.starsSpent) || 0, Number(device.starsSpent) || 0),
        bonusPoints: Math.max(Number(project.bonusPoints) || 0, Number(device.bonusPoints) || 0),
        updatedAt: Math.max(projectTime, deviceTime)
    };
};
const MODE_TABS = [
    {id: 'free', label: 'Libre', icon: '🎨'},
    {id: 'robot', label: 'Robot', icon: '🤖'},
    {id: 'story', label: 'Historia', icon: '📖'}
];
const WORLD10_BLOCKED_CELLS = [[4, 1], [4, 3], [4, 4], [5, 4], [6, 4]];
const WORLD11_STBLOCKED_CELLS = [[1, 1], [1, 2], [1, 3], [3, 5], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6]];
const STORY_WORLDS = [
    {id: 1, title: 'La puerta de hojas', chapter: 'Bosque de los Brotes', grid: [4, 4], lesson: 'Un paso de movimiento', story: 'La tormenta apagó el Faro del Cielo. STB y Rayo encontraron una chispa perdida. Lumi espera tras una puerta de hojas. Lleva a Rayo hasta la luz.', summary: 'Lumi se unió a STB y Rayo. Una huella luminosa conduce al claro.', hint: 'Mira la fila de abajo. Avanza tres casillas hacia la puerta.', objective: 'Lleva a Rayo hasta la luz.', start: [1, 4], goal: [4, 4]},
    {id: 2, title: 'El claro de las huellas', chapter: 'Bosque', grid: [4, 4], lesson: 'Secuencia ordenada', story: 'La huella luminosa guía al grupo hasta un claro. Tula perdió su cesta y espera al otro lado. Primero encuentra la cesta y luego cruza el claro hasta Tula.', summary: 'Tula recuperó su cesta y entregó una pluma que señala el gran árbol.', hint: 'La cesta está arriba de las huellas. Sube hasta ella; luego baja y sigue hasta Tula.', objective: 'Pasa por la cesta y llega junto a Tula.', start: [1, 3], checkpoints: [[2, 2]], goal: [4, 4]},
    {id: 3, title: 'La rama alta', chapter: 'Bosque', grid: [4, 4], lesson: 'Rescatar a Nara', story: 'Nara espera en su nido, separada de su familia que está en la rama de al lado. Sube por el árbol, usa el bloque Recoger para que acompañe a Rayo y llévala hasta sus familiares.', summary: 'Nara volvió con su familia. Juntos señalaron el tronco caído que bloquea el siguiente camino.', hint: 'Sube por los escalones hasta el nido de Nara y usa Recoger. Después avanza a la rama de la derecha, donde espera su familia.', objective: 'Recoge a Nara y llévala junto a su familia.', start: [2, 4], goal: [2, 1]},
    {id: 4, title: 'El tronco caído', chapter: 'Bosque', grid: [4, 4], mapAsset: '4-movable-log.png', lesson: 'Recoger, transportar y soltar', story: 'La tormenta derribó un tronco en el sendero. Bito necesita que lo llevemos hasta el claro para despejar el paso. Rayo debe recogerlo, transportarlo, soltarlo en la marca y después llegar hasta Bito.', summary: 'El tronco quedó junto al claro y Bito pudo abrir el camino hacia el río.', hint: 'Llega hasta el tronco y usa Recoger. Llévalo a la marca del claro y usa Soltar. Después continúa hasta Bito.', objective: 'Lleva el tronco a la marca, suéltalo y llega hasta Bito.', start: [1, 4], goal: [4, 1]},
    {id: 5, title: 'El puente de Bito', chapter: 'Bosque', grid: [4, 4], lesson: 'Repetición', story: 'El agua cubre el camino directo. Bito construyó un puente por la fila de arriba. Rayo debe subir, cruzar los tres tablones repitiendo el mismo paso y bajar al otro lado.', summary: 'Rayo cruzó el puente y encontró la segunda chispa junto a Lumi.', hint: 'El agua no se puede cruzar. Sube una casilla, usa Repetir con Avanzar tres veces y baja una casilla.', objective: 'Cruza por el puente sin pisar el agua. Usa un solo bloque Avanzar dentro de Repetir.', start: [1, 4], goal: [4, 4]},
    {id: 6, title: 'Las gotas del molino', chapter: 'Río de las Ruedas', grid: [4, 4], lesson: 'Recoger, transportar y soltar', story: 'El molino se quedó sin agua. Tres gotas descansan sobre las hojas del río. Lleva cada gota, de una en una, hasta el molino para que sus aspas vuelvan a girar.', summary: 'Las tres gotas llegaron al molino, sus aspas giraron y el camino quedó abierto.', hint: 'Recoge una gota sobre una hoja, llévala al molino y usa Soltar. Repite el rescate con las tres; solo puedes llevar una a la vez.', objective: 'Entrega las tres gotas en el molino y llega hasta la bandera.', start: [1, 3], goal: [4, 4]},
    {id: 7, title: 'El molino dormido', chapter: 'Río', grid: [5, 4], mapAsset: '7-no-bridge.png', lesson: 'Esperar antes de actuar', story: 'Al comenzar, el puente se levanta para dejar pasar el agua. Nara cuenta hasta dos mientras el puente baja. Rayo debe esperar dos segundos antes de cruzar.', summary: 'Rayo esperó a que el puente bajara y llegó a la cueva con sus amigos.', hint: 'Arrastra Esperar, cambia su número a 2 y colócalo antes de cualquier movimiento. El puente tarda dos segundos en bajar.', objective: 'Espera 2 segundos antes de moverte y cruza cuando el puente esté abajo.', start: [1, 4], goal: [5, 4]},
    {id: 8, title: 'El túnel del eco', chapter: 'Río', grid: [4, 4], lesson: 'Repetir y esperar', story: 'Una estrella recorre las escaleras del túnel y a veces ocupa el camino. Rayo debe repetir sus movimientos y esperar a que la estrella pase para llegar hasta Lumi.', summary: 'Rayo encontró a Lumi después de seguir el ritmo de la estrella por las escaleras.', hint: 'Usa Avanzar, Subir, Repetir y Esperar. Cada movimiento es de una casilla. Si la estrella ocupa el paso, espera a que se mueva.', objective: 'Llega hasta Lumi usando movimientos, Repetir y Esperar para dejar pasar a la estrella.', start: [1, 4], goal: [4, 1]},
    {id: 9, title: 'La campana de Tula', chapter: 'Río', grid: [8, 6], lesson: 'Activar y saltar el río', story: 'Tula encontró una compuerta cerrada. Activa la campana de la orilla y elige tu propia ruta para saltar sobre el agua y alcanzar la salida.', summary: 'Rayo saltó sobre el río. La campana abrió el paso hacia el huerto de Bito.', hint: 'Activa la campana en 4,6. Después programa Saltar hacia delante, atrás o en diagonal desde cualquier lugar seguro, y llega a la salida en 7,2.', objective: 'Activa la campana, usa un salto en tu recorrido y llega a la salida.', start: [1, 6], checkpoints: [], goal: [7, 2]},
    {id: 10, title: 'La caja de semillas', chapter: 'Río', grid: [5, 5], lesson: 'Ordenar un recorrido con giro', story: 'Bito encontró una caja de semillas después de la compuerta. El agua del río está subiendo; lleva la caja por el camino alto hasta la casa segura.', summary: 'Bito guardó las semillas. Una enredadera creció y señaló el camino a la montaña.', hint: 'Primero recoge la caja. Después sube, cruza, vuelve a subir y cruza al final.', objective: 'Lleva a Rayo junto a Bito por el camino alto.', start: [1, 5], checkpoints: [[3, 4]], goal: [5, 2]},
    {id: 11, title: 'La cuesta del viento', chapter: 'Montaña del Viento', grid: [5, 5], lesson: 'Secuencia larga', story: 'La enredadera guía al grupo hasta la montaña. Mistral mueve piedras de colores cuesta arriba y una chispa brilla en el mirador.', summary: 'Mistral alcanzó el mirador y sopló una pluma hacia dos veletas.', hint: 'Sigue las piedras azules: cruza una y sube. Repite el dibujo de la cuesta.', objective: 'Sigue las piedras hasta Lumi.', start: [1, 5], goal: [5, 1]},
    {id: 12, title: 'Las veletas gemelas', chapter: 'Montaña', grid: [8, 6], lesson: 'Cooperación y secuencia', story: 'La pluma llegó al valle y las dos veletas dejaron de girar. STB debe llevar la pluma hasta la veleta azul. Después, Mistral debe tocar la veleta dorada con Activar y llegar junto a Lumi.', summary: 'Las veletas giraron juntas y señalaron la entrada a una cueva con destellos.', hint: 'Programa primero a STB: recoge la pluma y déjala en la veleta azul. Después selecciona a Mistral, usa Activar junto a la veleta dorada y llega con Lumi.', objective: 'Lleva la pluma a la veleta azul. Luego activa la dorada con Mistral y llega junto a Lumi.', start: [1, 6], goal: [7, 3], blocked: [[3, 3], [4, 3], [3, 2], [5, 5]]},
    {id: 13, title: 'La cueva de las luciérnagas', chapter: 'Montaña', grid: [8, 6], lesson: 'Activar y saltar en diagonal', story: 'En la cueva, una cortina de niebla tapa el camino hasta Lumi. STB debe tocar el interruptor del extremo del sendero. La luz revela un hueco diagonal entre las rocas.', summary: 'El salto diagonal abrió el paso y las luciérnagas iluminaron el camino al jardín.', hint: 'Pisa el interruptor en 8, 5 para encenderlo. Después llega a 3, 4 y usa Saltar en diagonal hasta 4, 3. Sigue hasta Lumi.', objective: 'Toca el interruptor, salta en diagonal de 3, 4 a 4, 3 y llega junto a Lumi.', start: [1, 5], checkpoints: [[8, 5]], goal: [7, 2], blocked: [[2, 4], [3, 3], [5, 4], [6, 4], [7, 4], [8, 4]]},
    {id: 14, title: 'La melodía del jardín', chapter: 'Montaña', grid: [8, 6], lesson: 'Repetir y decidir con Si', story: 'Vega encontró tres campanillas apagadas frente a una puerta de luz. Llévala hasta la primera campanilla y haz sonar las tres en orden; después, usa Si para abrir la puerta solo cuando la melodía esté completa.', summary: 'La melodía abrió la puerta y Vega mostró el camino hacia el globo.', hint: 'Recoge a Vega en la casilla 1,2 y suéltala en la campanilla 1 (2,4). Haz sonar las campanillas en 2,4; 5,4 y 6,3, en ese orden. Luego usa Si para Activar la puerta en 7,3 y llega a la meta en 7,2.', objective: 'Lleva a Vega a la campanilla 1, toca las tres notas en orden, abre la puerta con Si y llega a la meta.', start: [1, 5], checkpoints: [], goal: [7, 2], blocked: [[3, 3], [4, 3], [3, 2], [5, 5]]},
    {id: 15, title: 'El globo de Mistral', chapter: 'Montaña', grid: [8, 6], lesson: 'Repetir y decidir con Si', story: 'Una ráfaga de viento soltó el globo de Mistral. STB debe cruzar el risco hasta el globo. Mistral puede volar sobre las rocas para abrir la válvula del viento. Vega debe confirmar que la válvula está abierta y activar el panel de gas dentro de un bloque Si.', summary: 'El globo se llenó de aire y aterrizó en la Ciudad de las Nubes.', hint: 'Primero programa a STB: cruza la fila de abajo con Repetir y sube hasta el globo en 7,3. Luego Mistral: sube hasta la válvula en 2,2 y usa Activar. Por último Vega (sale en 3,6): avanza por la fila de abajo y sube al panel en 7,4; usa Si (¿válvula abierta?) con Activar dentro.', objective: 'Lleva a STB al globo, abre la válvula con Mistral y activa el panel de gas con Vega usando Si.', start: [1, 6], checkpoints: [], goal: [7, 3], blocked: [[2, 4], [3, 4], [4, 3], [5, 3], [5, 5], [6, 5]]},
    {id: 16, title: 'La llave de la torre', chapter: 'Ciudad de las Nubes', grid: [8, 6], lesson: 'Llevar, tocar y decidir con Si', story: 'STB, Mistral y Vega llegaron a la torre de las nubes. La llave está sobre una repisa y la puerta no abre sola: STB debe llevarla a la marca, Mistral debe tocar el molinete de viento y Vega debe comprobar con Si que todo está listo antes de tocar la puerta.', summary: 'STB entregó la llave y la torre de las nubes abrió su puerta.', hint: 'Primero STB: avanza 2, recoge la llave en 3,6, sube 2, avanza 3 por la fila 4 y sube 1 hasta la marca 6,3 para soltarla. Luego Mistral (sale en 1,2): avanza 1 y Toca el molinete en 2,1. Por último Vega (sale en 6,2): avanza 1, baja 1 y usa Si con Tocar junto a la puerta en 7,3.', objective: 'Lleva la llave a la marca, toca el molinete con Mistral y usa Si con Tocar para abrir la torre con Vega.', start: [1, 6], checkpoints: [], goal: [6, 3], blocked: [[6, 6], [4, 6], [5, 6], [4, 3], [5, 3], [3, 3], [2, 3], [7, 4]]},
    {id: 17, title: 'El ascensor de nubes', chapter: 'Ciudad', grid: [8, 6], lesson: 'Repetir en vertical, tocar y decidir con Si', story: 'El ascensor de nubes está atascado entre pisos. STB debe subir contando los cinco pisos hasta el ático. Mistral vuela por el hueco de la escalera y tira de la palanca del ascensor. Vega espera arriba y, solo cuando STB llegó y la palanca está accionada, usa Si para tocar la puerta del piso alto.', summary: 'STB subió al ático, Mistral accionó la palanca y Vega abrió la puerta con Si.', hint: 'Primero STB (sale en 2,6): usa Repetir 5 con Subir dentro para llegar a 2,1. Luego Mistral (sale en 7,6): repite Subir 5 por el hueco y Toca la palanca en 8,1. Por último Vega (sale en 6,2): retrocede 3, sube 1 y usa Si con Tocar junto a la puerta en 3,1.', objective: 'Sube a STB al ático, acciona la palanca con Mistral y usa Si con Tocar para abrir la puerta con Vega.', start: [2, 6], checkpoints: [], goal: [2, 1], blocked: [[1, 5], [1, 4], [1, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 4], [1, 1], [8, 2], [6, 1]]},
    {id: 18, title: 'La puerta del faro', chapter: 'Ciudad', grid: [8, 6], lesson: 'Moverse por el mapa y tocar el panel', story: 'La puerta del faro está cerrada. STB debe cruzar el mapa con varios movimientos hasta el panel de la puerta. Al tocarlo, la puerta se abre y aparece la cámara de las piezas luminosas. Después te espera un pequeño reto de operaciones para ganar puntos extra.', summary: 'STB tocó el panel y abrió la puerta del faro: aparecieron las piezas luminosas y un reto de operaciones para ganar puntos extra.', hint: 'Avanza 2, sube 2, avanza 3 y sube 2 hasta el panel en 6,2. Al llegar usa Tocar para abrir la puerta. Después puedes resolver la operación para ganar puntos extra.', objective: 'Lleva a STB hasta el panel en 6,2 y usa Tocar para abrir la puerta. El reto de operaciones final es opcional y da puntos extra.', start: [1, 6], checkpoints: [[3, 6], [3, 4], [6, 4]], goal: [6, 2], blocked: [[4, 6], [5, 6], [6, 6], [7, 6], [2, 5], [1, 5], [4, 3], [5, 3], [7, 4], [8, 4], [4, 2], [5, 2], [7, 2], [8, 2], [1, 4], [2, 4]]},
    {id: 19, title: 'La cámara de las piezas', chapter: 'Ciudad', grid: [8, 6], lesson: 'Cooperar con dos personajes y tocar paneles', story: 'La cámara está a oscuras. Vega debe encender la lámpara del faro mientras STB cruza la sala hasta el panel. Cuando el panel se ilumine, la cámara se abre y aparecen las tres piezas de luz. Al final te espera un reto de operaciones para ganar puntos extra.', summary: 'STB y Vega iluminaron la cámara: las tres piezas de luz aparecieron y el reto de operaciones dio puntos extra.', hint: 'STB (sale en 1,6): avanza 3, sube 2, avanza 2 y sube 2 hasta el panel en 6,2; usa Tocar. Vega (sale en 8,6): sube 4 hasta la lámpara en 8,2 y usa Tocar. Al terminar, puedes resolver la operación para ganar puntos extra.', objective: 'Programa a STB hasta el panel y a Vega hasta la lámpara y usa Tocar en ambos. El reto de operaciones final es opcional y da puntos extra.', start: [1, 6], checkpoints: [[4, 6], [4, 4], [6, 4]], goal: [6, 2], blocked: [[2, 5], [2, 4], [3, 4], [5, 6], [6, 6], [7, 6], [5, 3], [7, 3], [3, 2], [4, 2], [5, 2], [8, 1], [7, 2], [1, 5], [1, 4], [1, 3]]},
    {id: 20, title: 'El Faro del Cielo', chapter: 'Ciudad', grid: [8, 6], lesson: 'Gran aventura final: cooperar, tocar y resolver', story: '¡Las piezas están listas! STB lleva la última chispa al corazón del faro y Vega enciende el prisma de luz. Una voz guía te acompaña en cada paso. Cuando todo brille, el Faro del Cielo se enciende y un último reto de operaciones te dará puntos extra.', summary: '¡El Faro del Cielo se encendió! STB y Vega completaron la aventura y el último reto dio puntos extra.', hint: 'STB (sale en 1,6): avanza 3, sube 2, avanza 2 y sube 3 hasta el corazón del faro en 6,1; usa Tocar. Vega (sale en 8,6): sube 3 hasta el prisma en 8,3 y usa Tocar. Al terminar, puedes resolver la operación para ganar puntos extra.', objective: 'Programa a STB hasta el corazón del faro y a Vega hasta el prisma y usa Tocar en ambos. El reto final es opcional y da puntos extra.', guide: ['Soy la voz guía y te acompaño hasta el final. Primero programa a STB.', 'STB sale en la casilla 1, 6. Avanza 3, sube 2, avanza 2 y sube 3 hasta el corazón del faro en 6, 1. Usa Repetir en los tramos largos y termina con Tocar.', 'Después programa a Vega: sale en 8, 6, sube 3 hasta el prisma de luz en 8, 3 y usa Tocar.', 'Cuando el corazón y el prisma brillen, el faro se encenderá y aparecerá un reto de operaciones. Resuélvelo si quieres ganar puntos extra.'], start: [1, 6], checkpoints: [[4, 6], [4, 4]], optionalCheckpoints: true, goal: [6, 1], blocked: [[5, 6], [6, 6], [7, 6], [2, 5], [3, 5], [1, 5], [1, 4], [2, 4], [3, 4], [5, 3], [7, 3], [5, 2], [7, 2], [5, 1], [7, 1], [8, 1]]}
];

STORY_WORLDS[9] = {
    ...STORY_WORLDS[9],
    grid: [8, 6], start: [1, 3], checkpoints: [[6, 3]], goal: [8, 1], blocked: WORLD10_BLOCKED_CELLS,
    lesson: 'Recoger, entregar y avanzar',
    story: 'Bito encontró una caja de semillas al otro lado del río. Recógela en la orilla, llévala hasta la marca segura y después alcanza la salida.',
    hint: 'Recoge la caja en 7,5 y suéltala en la marca 7,3. Después llega a la salida en 8,1.',
    objective: 'Entrega la caja en la marca 7,3 y llega a la salida.'
};
STORY_WORLDS[10] = {
    ...STORY_WORLDS[10],
    grid: [8, 6], checkpoints: [], goal: [5, 1], blocked: WORLD11_STBLOCKED_CELLS,
    lesson: 'Dos personajes, dos rutas y un vuelo',
    story: 'Tres piedras deben llegar con Lumi. STB llevará la piedra del sendero. Mistral, que es una nube, puede volar hasta la piedra de la altura y la del río. Primero programa a STB; después elige a Mistral y crea su recorrido.',
    summary: 'STB y Mistral llevaron juntas las tres piedras con Lumi. Mistral descubrió que podía volar sobre el agua y la altura.',
    hint: 'Programa primero a STB para recoger la piedra en 3,4 y llevarla a Lumi. Luego selecciona Mistral: usa Volar abajo para la piedra de 8,6 y vuela hasta la piedra alta en 1,1. Entrega ambas a Lumi.',
    objective: 'Programa a STB y luego a Mistral para entregar las tres piedras a Lumi.'
};

const projectKeyFor = mode => `${PROJECT_KEY}.${mode}`;
// `basePath` llega como './', pero las rutas se consumen dentro del iframe de
// ScratchJr (p. ej. `/static/scratchjr/app/editor.html`), así que una ruta
// relativa termina en 404. Resolvemos la URL absoluta en el documento padre.
const resolveKidsUrl = path => {
    if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
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
const storyMapPath = (world, basePath) => resolveKidsUrl(`${basePath}static/kids/story/maps/${world.mapAsset || `${world.id}.jpg`}`);
// El protocolo `tauri://` sirve archivos completos e ignora `Range`; WebKitGTK
// necesita Range para reproducir MP4, así que descargamos el video en el
// documento padre y lo reproducimos desde un blob. Si el fetch falla usamos
// la URL directa como respaldo.
const StoryVideo = ({src, ...props}) => {
    const videoRef = useRef(null);
    const [blobSrc, setBlobSrc] = useState(null);
    const [directSrc, setDirectSrc] = useState(false);
    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;
        const controller = new AbortController();
        setBlobSrc(null);
        setDirectSrc(false);
        fetch(src, {signal: controller.signal})
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                if (cancelled) {
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                setBlobSrc(objectUrl);
            })
            .catch(() => {
                if (!cancelled) {
                    setDirectSrc(true);
                }
            });
        return () => {
            cancelled = true;
            controller.abort();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);
    const effectiveSrc = blobSrc || (directSrc ? src : undefined);
    useEffect(() => {
        const element = videoRef.current;
        if (!element || !effectiveSrc || !props.autoPlay) {
            return;
        }
        const playing = element.play();
        if (playing && typeof playing.catch === 'function') {
            playing.catch(() => {});
        }
    }, [effectiveSrc, props.autoPlay]);
    return <video ref={videoRef} src={effectiveSrc} {...props} />;
};
// Ending cinematics shown once world 20 is solved, in this order.
const FINAL_VIDEO_FILES = ['final.mp4', 'final-2.mp4'];
const WORLD5_BLOCKED_CELLS = [[2, 4], [3, 4], [2, 2], [3, 2], [3, 1]];
const WORLD6_BLOCKED_CELLS = [[2, 2], [3, 2], [2, 4], [3, 4]];
const WORLD8_BLOCKED_CELLS = [[1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [4, 3], [4, 4], [3, 4]];
const WORLD9_BLOCKED_CELLS = [[4, 1], [5, 1], [5, 2], [6, 3], [7, 4], [8, 5]];
const WORLD9_GRID_DEFAULTS = {columns: 8, rows: 6, originX: 32, originY: 30, stepX: 60, stepY: 60, movePixelsX: 128, movePixelsY: 80};
const defaultCalibrationFor = world => {
    const isLaterWorld = world.id >= 9 && world.id <= 20;
    const columns = isLaterWorld ? WORLD9_GRID_DEFAULTS.columns : world.grid[0];
    const rows = isLaterWorld ? WORLD9_GRID_DEFAULTS.rows : world.grid[1];
    const stepX = isLaterWorld ? WORLD9_GRID_DEFAULTS.stepX : 480 / columns;
    const stepY = isLaterWorld ? WORLD9_GRID_DEFAULTS.stepY : 360 / rows;
    return {
        columns, rows,
        originX: world.id === 10 ? 31 : (isLaterWorld ? WORLD9_GRID_DEFAULTS.originX : stepX / 2),
        originY: isLaterWorld ? WORLD9_GRID_DEFAULTS.originY : stepY / 2,
        stepX, stepY,
        movePixelsX: isLaterWorld ? (world.id === 9 ? 130 : ((world.id === 15 || world.id === 16 || world.id === 17 || world.id === 18 || world.id === 19 || world.id === 20) ? 120 : WORLD9_GRID_DEFAULTS.movePixelsX)) : (world.id <= 8 ? stepX * 2 : stepX),
        movePixelsY: isLaterWorld ? ((world.id === 15 || world.id === 16 || world.id === 17 || world.id === 18 || world.id === 19 || world.id === 20) ? 120 : WORLD9_GRID_DEFAULTS.movePixelsY) : (world.id <= 8 ? stepY * 2 : stepY),
        startCol: world.start[0], startRow: world.start[1],
        goalCol: world.goal[0], goalRow: world.goal[1],
        startOffsetX: world.id === 9 ? -11 : 0, startOffsetY: world.id === 9 ? -14 : (world.id === 2 ? -1 : 0),
        goalTolerance: world.id === 9 || world.id === 12 || world.id === 13 ? 21.6 : (world.id === 2 || world.id === 14 ? 30 : Math.min(stepX, stepY) * 0.24),
        characterScale: world.id <= 8 ? 0.6 : (world.id <= 20 ? 0.5 : 1), movementSpeed: 2, characterAngle: 0,
        checkpoints: world.checkpoints || [], blocked: world.id === 5 ? WORLD5_BLOCKED_CELLS : (world.id === 6 ? WORLD6_BLOCKED_CELLS : (world.id === 8 ? WORLD8_BLOCKED_CELLS : (world.id === 9 ? WORLD9_BLOCKED_CELLS : (world.id === 10 ? WORLD10_BLOCKED_CELLS : (world.blocked || [])))))
    };
};

// Optional end-of-level challenges. They reward extra points but never gate
// progress: worlds 1-5 practise letters, 6-12 numbers and sequences, and 13-20
// simple math, always with large friendly options for young children.
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
const MATH_EMOJIS = ['🍎', '⭐', '🎈', '🍊', '🐟', '🌸', '🍪', '🦋', '⚽', '🍓'];
const makeOptions = (answer, pool, count = 4) => {
    const choices = new Set([answer]);
    while (choices.size < count) choices.add(pool[Math.floor(Math.random() * pool.length)]);
    return Array.from(choices).sort(() => Math.random() - 0.5);
};
const makeLetterChallenge = () => {
    const start = Math.floor(Math.random() * (LETTERS.length - 6));
    const length = 3 + Math.floor(Math.random() * 2);
    const run = LETTERS.slice(start, start + length);
    if (Math.random() < 0.5) {
        const missing = 1 + Math.floor(Math.random() * (length - 2));
        const answer = run[missing];
        return {
            kind: 'letters',
            prompt: '¿Qué letra falta?',
            tokens: run.map((letter, index) => index === missing ? '?' : letter),
            answer,
            options: makeOptions(answer, LETTERS),
            solutionText: `La letra que falta es ${answer}.`
        };
    }
    const answer = LETTERS[start + length];
    return {
        kind: 'letters',
        prompt: '¿Qué letra sigue?',
        tokens: [...run, '?'],
        answer,
        options: makeOptions(answer, LETTERS),
        solutionText: `La letra que sigue es ${answer}.`
    };
};
const makeNumberChallenge = () => {
    const mode = ['up1', 'up2', 'down1', 'missing'][Math.floor(Math.random() * 4)];
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    if (mode === 'down1') {
        const start = 5 + Math.floor(Math.random() * 4);
        const run = [start, start - 1, start - 2];
        const answer = start - 3;
        return {kind: 'numbers', prompt: '¿Qué número sigue?', tokens: [...run, '?'], answer, options: makeOptions(answer, pool), solutionText: `El número que sigue es ${answer}.`};
    }
    if (mode === 'up2') {
        const start = 1 + Math.floor(Math.random() * 3);
        const run = [start, start + 2, start + 4];
        const answer = start + 6;
        return {kind: 'numbers', prompt: '¿Qué número sigue?', tokens: [...run, '?'], answer, options: makeOptions(answer, pool), solutionText: `El número que sigue es ${answer}.`};
    }
    if (mode === 'missing') {
        const start = 1 + Math.floor(Math.random() * 3);
        const run = [start, start + 1, start + 2, start + 3];
        const missing = 1 + Math.floor(Math.random() * 2);
        const answer = run[missing];
        return {kind: 'numbers', prompt: '¿Qué número falta?', tokens: run.map((number, index) => index === missing ? '?' : number), answer, options: makeOptions(answer, pool), solutionText: `El número que falta es ${answer}.`};
    }
    const start = 1 + Math.floor(Math.random() * 4);
    const run = [start, start + 1, start + 2];
    const answer = start + 3;
    return {kind: 'numbers', prompt: '¿Qué número sigue?', tokens: [...run, '?'], answer, options: makeOptions(answer, pool), solutionText: `El número que sigue es ${answer}.`};
};
const makeMathChallenge = allowSubtraction => {
    const emoji = MATH_EMOJIS[Math.floor(Math.random() * MATH_EMOJIS.length)];
    let a;
    let b;
    let op;
    let answer;
    if (allowSubtraction && Math.random() < 0.5) {
        a = 3 + Math.floor(Math.random() * 6);
        b = 1 + Math.floor(Math.random() * (a - 1));
        op = '−';
        answer = a - b;
    } else {
        a = 1 + Math.floor(Math.random() * 5);
        const maxB = Math.max(1, Math.min(5, 10 - a));
        b = 1 + Math.floor(Math.random() * maxB);
        op = '+';
        answer = a + b;
    }
    return {
        kind: 'math',
        prompt: `¿Cuánto es ${a} ${op} ${b}?`,
        a, b, op, emoji, answer,
        options: makeOptions(answer, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        solutionText: `La respuesta es ${answer}.`
    };
};
const makeBonusChallenge = level => {
    const id = Number(level);
    if (id <= 5) return makeLetterChallenge();
    if (id <= 12) return makeNumberChallenge();
    return makeMathChallenge(id >= 18);
};

// Star economy. Every completed world awards 1-5 stars depending on the score.
// Stars are cumulative across the adventure and can be exchanged for real
// hints; each hint gets a little more expensive as the worlds get harder.
const MOVEMENT_BLOCKS = ['forward', 'back', 'up', 'down', 'storyjump', 'cloudfly'];
const BLOCK_LABELS = {
    forward: 'Avanzar', back: 'Retroceder', up: 'Subir', down: 'Bajar',
    repeat: 'Repetir', wait: 'Esperar', touch: 'Tocar', pickup: 'Recoger',
    drop: 'Soltar', storyjump: 'Saltar', storyif: 'Si', cloudfly: 'Volar',
    message: 'Mensaje', playsnd: 'Sonido', condition: 'Si', interact: 'Tocar', stop: 'Parar'
};
const labelBlocks = ids => {
    const labels = [];
    const seen = new Set();
    (ids || []).forEach(id => {
        const label = BLOCK_LABELS[id];
        if (label && !seen.has(label)) {
            seen.add(label);
            labels.push(label);
        }
    });
    return labels;
};
const starsForScore = score => score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1;
const starsAvailable = progress => Object.values(progress.starsByLevel || {}).reduce((total, value) => total + (Number(value) || 0), 0) - (Number(progress.starsSpent) || 0);
const hintTier = level => Math.floor((Number(level) - 1) / 4);
const levelHints = (world, challenge) => {
    const available = Array.isArray(challenge.availableBlocks) ? challenge.availableBlocks : [];
    const allowed = labelBlocks(available);
    const forbidden = labelBlocks(MOVEMENT_BLOCKS.filter(block => !available.includes(block)));
    const tier = hintTier(world.id);
    const hints = [
        {id: 'allowed', icon: '🧩', title: 'Bloques que puedes usar', cost: 2 + tier, detail: allowed.join(', '), speech: `En este mundo puedes usar: ${allowed.join(', ')}.`},
        {id: 'forbidden', icon: '🚫', title: 'Bloques prohibidos', cost: 2 + tier, detail: forbidden.length ? forbidden.join(', ') : 'Ninguno: puedes usar todos los movimientos.', speech: forbidden.length ? `No uses estos movimientos: ${forbidden.join(', ')}.` : 'Puedes usar todos los movimientos en este mundo.'},
        {id: 'map', icon: '🗺️', title: 'Iluminar el mapa', cost: 3 + tier, detail: 'Marca el inicio, la meta, los puntos obligatorios y las casillas prohibidas.', speech: 'Encendí el mapa. Mira el inicio, la meta, los puntos obligatorios y las casillas prohibidas.'}
    ];
    const names = (challenge.actors || []).map(actor => actor.name).filter(Boolean);
    if (names.length > 1) {
        hints.push({id: 'roles', icon: '🧑‍🤝‍🧑', title: 'Quién hace qué', cost: 3 + tier, detail: `Cooperan: ${names.join(', ')}. Programa cada personaje por separado.`, speech: `En este mundo cooperan ${names.join(' y ')}. Programa a cada personaje por separado.`});
    }
    return hints;
};
// Manhattan distance through the checkpoints to the goal. It sizes the time and
// block budgets so faster, shorter programs score better.
const routeLength = world => {
    const points = [[...(world.start || [1, 1])], ...(world.checkpoints || []), [...(world.goal || [1, 1])]];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        total += Math.abs(Number(points[i][0]) - Number(points[i - 1][0])) + Math.abs(Number(points[i][1]) - Number(points[i - 1][1]));
    }
    return total;
};
const scoreStoryRun = ({world, challenge, attempts, seconds, blocksUsed}) => {
    const actors = Math.max(1, (challenge.actors || []).length);
    const route = routeLength(world);
    const parTime = (20 + route * 6) * (actors > 1 ? 1.6 : 1);
    // A neutral half bonus when the host could not measure the run time.
    const speedBonus = seconds === null ? 10 : seconds <= parTime ? 20 : seconds <= parTime * 1.6 ? 10 : 0;
    const attemptPenalty = Math.min(45, Math.max(0, attempts - 1) * 15);
    const blockBudget = route + (challenge.requiredActions || []).length + actors + 4;
    const blockPenalty = Math.min(25, Math.max(0, blocksUsed - blockBudget) * 2);
    const score = Math.max(10, Math.min(100, Math.round(70 + speedBonus - attemptPenalty - blockPenalty)));
    return {score, stars: starsForScore(score), parTime, speedBonus, attemptPenalty, blockPenalty};
};

const ScratchJrKidsWorkspace = ({basePath, onExit, onConnectRobot, bluetoothConnected, bluetoothPortName, vm}) => {
    const iframeRef = useRef(null);
    const storyCreationStartedRef = useRef(false);
    const freeProjectCreationPendingRef = useRef(false);
    const robotProjectCreationPendingRef = useRef(false);
    const [isMobileLayout, setIsMobileLayout] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_KIDS_QUERY).matches);
    const [mobileStoryHome, setMobileStoryHome] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_KIDS_QUERY).matches);
    // Si el layout cae a escritorio (devtools/rotación) estando en la portada,
    // recordamos volver a ella al recuperar el layout móvil.
    const mobileStoryHomeRef = useRef(mobileStoryHome);
    const mobileHomeWasOpenRef = useRef(false);
    const [modeSwitching, setModeSwitching] = useState(false);
    const modeSwitchTimerRef = useRef(null);
    const [phonePortrait, setPhonePortrait] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
    const [mobileStoryNameOpen, setMobileStoryNameOpen] = useState(false);
    const [mobileStoryPlayerName, setMobileStoryPlayerName] = useState('');
    const [mobileStorySummary, setMobileStorySummary] = useState(readMobileStoryProgress);
    const [mobileFreeProjects, setMobileFreeProjects] = useState([]);
    const [mobileFreeProjectsLoading, setMobileFreeProjectsLoading] = useState(true);
    const [mobileProjectToDelete, setMobileProjectToDelete] = useState(null);
    const robotSendQueueRef = useRef(Promise.resolve());
    const [mode, setMode] = useState('free');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSettingsPage, setMobileSettingsPage] = useState(false);
    const [projectOpen, setProjectOpen] = useState(false);
    const [storyScreen, setStoryScreen] = useState('');
    const [storyProgress, setStoryProgress] = useState(() => emptyStoryProgress());
    const [storyLevel, setStoryLevel] = useState(1);
    const [storyRunMessage, setStoryRunMessage] = useState('');
    const [storyHintCollapsed, setStoryHintCollapsed] = useState(false);
    const [storyVideoError, setStoryVideoError] = useState(false);
    const [storyIntroVideoDone, setStoryIntroVideoDone] = useState(false);
    const [finalVideoStep, setFinalVideoStep] = useState(0);
    const [finalVideoError, setFinalVideoError] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [blockVoiceEnabled, setBlockVoiceEnabled] = useState(() => {
        try {
            return window.localStorage.getItem('stblockKidsBlockVoice') !== 'off';
        } catch (_error) {
            return true;
        }
    });
    const [map, setMap] = useState('classroom');
    const [mapPickerOpen, setMapPickerOpen] = useState(false);
    const [bonusChallenge, setBonusChallenge] = useState(null);
    const [bonusFeedback, setBonusFeedback] = useState('');
    const [pendingStoryCompletion, setPendingStoryCompletion] = useState(null);
    const [hintsOpen, setHintsOpen] = useState(false);
    const bonusTimerRef = useRef(null);
    const bonusVoiceRequestRef = useRef(0);
    useEffect(() => () => {
        bonusVoiceRequestRef.current++;
        if (bonusTimerRef.current) window.clearTimeout(bonusTimerRef.current);
    }, []);
    const storyRunStartedAtRef = useRef(0);
    const voicePlayer = useMemo(() => createKidsVoicePlayer({
        baseUrl: new URL(`${basePath}static/kids/voice/es/`, window.location.href).href
    }), [basePath]);
    useEffect(() => () => voicePlayer.cancel(), [voicePlayer]);
    useEffect(() => { if (!blockVoiceEnabled) voicePlayer.cancel(); }, [blockVoiceEnabled, voicePlayer]);
    useEffect(() => {
        const receiveBlockVoice = event => {
            if (!blockVoiceEnabled || event.source !== (iframeRef.current && iframeRef.current.contentWindow) || event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== 'STBLOCK_KIDS_BLOCK_VOICE') return;
            const text = blockVoiceInstruction(event.data.blockType, event.data.argument);
            if (text) voicePlayer.speak(text, {channel: 'block'});
        };
        window.addEventListener('message', receiveBlockVoice);
        return () => window.removeEventListener('message', receiveBlockVoice);
    }, [blockVoiceEnabled, voicePlayer]);
    const [scoreName, setScoreName] = useState('');
    const [rightActionRoot, setRightActionRoot] = useState(null);
    const readProjectId = activeMode => {
        try {
            // Libre and Historia own separate ScratchJr projects. The old generic
            // key can point at a free project and must never be used as a Story fallback.
            return window.localStorage.getItem(projectKeyFor(activeMode));
        } catch (_error) {
            return null;
        }
    };
    const makeFrameUrl = (activeMode, projectId = readProjectId(activeMode), lobbyPage = 'home') => {
        const appUrl = `${basePath}${APP_PATH}`;
        const modeQuery = `stblockKidsMode=${encodeURIComponent(activeMode)}&stblockKidsMobile=${isMobileLayout ? '1' : '0'}`;
        const frameRevision = Date.now().toString(36);
        return projectId ? `${appUrl}editor.html?pmd5=${encodeURIComponent(projectId)}&mode=edit&${modeQuery}&stblockFrame=${frameRevision}` : `${appUrl}home.html?stblockKids=1&${modeQuery}&place=${encodeURIComponent(lobbyPage)}&stblockFrame=${frameRevision}`;
    };
    const [frameUrl, setFrameUrl] = useState(() => makeFrameUrl('free', null));
    const staleFrameRetriesRef = useRef(new Set());
    const logoUrl = resolveKidsUrl(`${basePath}static/kids/stblock-kids-logo.jpg`);

    // Cubre el iframe mientras ScratchJr cambia de modo: durante la recarga el
    // documento se ve en blanco y la toolbar aparece/desaparece. La capa se
    // retira cuando el editor está realmente montado.
    const clearModeSwitchVeil = useCallback(() => {
        if (modeSwitchTimerRef.current) {
            window.clearTimeout(modeSwitchTimerRef.current);
            modeSwitchTimerRef.current = null;
        }
        setModeSwitching(false);
    }, []);
    const beginModeSwitchVeil = useCallback(() => {
        if (modeSwitchTimerRef.current) window.clearTimeout(modeSwitchTimerRef.current);
        setModeSwitching(true);
        modeSwitchTimerRef.current = window.setTimeout(() => {
            modeSwitchTimerRef.current = null;
            setModeSwitching(false);
        }, 5000);
    }, []);
    useEffect(() => () => {
        if (modeSwitchTimerRef.current) window.clearTimeout(modeSwitchTimerRef.current);
    }, []);

    useEffect(() => {
        mobileStoryHomeRef.current = mobileStoryHome;
    }, [mobileStoryHome]);

    useEffect(() => {
        const query = window.matchMedia(MOBILE_KIDS_QUERY);
        const updateLayout = event => {
            const mobile = event.matches;
            setIsMobileLayout(mobile);
            if (!mobile) {
                if (mobileStoryHomeRef.current) mobileHomeWasOpenRef.current = true;
                setMobileStoryHome(false);
                setMobileStoryNameOpen(false);
            } else if (mobileHomeWasOpenRef.current) {
                mobileHomeWasOpenRef.current = false;
                mobileStoryHomeRef.current = true;
                setMobileStoryHome(true);
            }
        };
        updateLayout(query);
        if (query.addEventListener) query.addEventListener('change', updateLayout);
        else query.addListener(updateLayout);
        return () => {
            if (query.removeEventListener) query.removeEventListener('change', updateLayout);
            else query.removeListener(updateLayout);
        };
    }, []);

    useEffect(() => {
        const query = window.matchMedia('(orientation: portrait)');
        const updateOrientation = () => {
            setPhonePortrait(query.matches);
        };
        updateOrientation();
        window.addEventListener('orientationchange', updateOrientation);
        window.addEventListener('resize', updateOrientation);
        if (query.addEventListener) query.addEventListener('change', updateOrientation);
        else query.addListener(updateOrientation);
        return () => {
            window.removeEventListener('orientationchange', updateOrientation);
            window.removeEventListener('resize', updateOrientation);
            if (query.removeEventListener) query.removeEventListener('change', updateOrientation);
            else query.removeListener(updateOrientation);
        };
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            const child = iframeRef.current && iframeRef.current.contentWindow;
            if (!child) return;
            let chunkResources = [];
            try {
                chunkResources = child.performance.getEntriesByType('resource')
                    .filter(entry => /\/static\/scratchjr\/app\/dist\/chunk-[^/]+\.js(?:\?|$)/.test(entry.name));
            } catch (_error) {
                return;
            }
            let missingChunks = chunkResources.filter(entry => Number(entry.responseStatus) === 404);
            if (!missingChunks.length && chunkResources.length) {
                const unreported = chunkResources.filter(entry => !Number.isFinite(Number(entry.responseStatus))
                    || Number(entry.responseStatus) === 0);
                const checks = await Promise.all(unreported.map(async entry => {
                    try {
                        const response = await fetch(entry.name, {method: 'HEAD', cache: 'no-store'});
                        return response.status === 404 ? entry : null;
                    } catch (_error) {
                        return null;
                    }
                }));
                missingChunks = checks.filter(Boolean);
            }
            let retryKey = frameUrl;
            try {
                const currentFrame = new URL(frameUrl, window.location.href);
                currentFrame.searchParams.delete('stblockFrame');
                retryKey = `${currentFrame.pathname}?${currentFrame.searchParams.toString()}`;
            } catch (_error) {
                // Keep the original frame URL as the retry key.
            }
            if (!missingChunks.length || staleFrameRetriesRef.current.has(retryKey)) return;
            staleFrameRetriesRef.current.add(retryKey);
            try {
                const freshUrl = new URL(frameUrl, window.location.href);
                freshUrl.searchParams.set('stblockFrame', Date.now().toString(36));
                console.warn('[STBlock Kids] Actualizando ScratchJr porque un chunk del editor no está disponible.', {
                    missing: missingChunks.map(entry => entry.name),
                    from: child.location.href,
                    to: freshUrl.toString()
                });
                setFrameUrl(freshUrl.toString());
            } catch (_error) {
                // Keep the current editor visible if the URL cannot be refreshed.
            }
        }, 1200);
        return () => window.clearTimeout(timer);
    }, [frameUrl]);

    const sendModeToScratchJr = useCallback(nextMode => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (child) {
            child.postMessage({type: 'STBLOCK_KIDS_MODE', mode: nextMode, map}, window.location.origin);
            try {
                child.document.body.dataset.stblockKidsMobile = String(isMobileLayout);
                child.dispatchEvent(new Event('stblock-kids-layout'));
            } catch (_error) {
                // The query parameter handles the initial layout if iframe access is unavailable.
            }
        }
    }, [isMobileLayout, map]);

    const handleModeChange = nextMode => {
        bonusVoiceRequestRef.current++;
        if (bonusTimerRef.current) window.clearTimeout(bonusTimerRef.current);
        voicePlayer.cancel();
        if (isMobileLayout) requestLandscapeMode();
        setMobileStoryHome(false);
        setMobileStoryNameOpen(false);
        setMobileSettingsPage(false);
        if (nextMode === mode) {
            if (nextMode === 'story') {
                voicePlayer.cancel();
                const child = iframeRef.current && iframeRef.current.contentWindow;
                // Only reveal the route once the story editor (and its
                // STBLOCK_KIDS_STORY API) is ready; otherwise "Empezar el reto"
                // has nothing to configure and silently does nothing.
                if (child && child.STBLOCK_KIDS_STORY) {
                    setStoryScreen('route');
                    setProjectOpen(false);
                    setRenameModalOpen(false);
                }
            }
            return;
        }
        beginModeSwitchVeil();
        setMode(nextMode);
        setStoryScreen('');
        if (nextMode === 'story') {
            // The desktop tabs have no name prompt, so make sure an adventure
            // project exists. Otherwise the iframe stays on the lobby, which
            // does not expose STBLOCK_KIDS_STORY, and missions never start.
            // Seeding the pending name lets the lobby create the project and
            // open the editor on the very first click.
            if (!readProjectId('story')) {
                const savedProgress = readMobileStoryProgress();
                const seededName = (savedProgress && savedProgress.playerName) || 'Explorador';
                try {
                    window.localStorage.setItem(STORY_PENDING_NAME_KEY, seededName);
                } catch (_error) {
                    // The lobby still creates the project if storage is blocked.
                }
                storyCreationStartedRef.current = false;
            }
            setStoryScreen('loading');
        }
        // When switching between mobile editors, keep the immersive surface in
        // place while the iframe navigates. Dropping projectOpen here briefly
        // reveals the toolbar and resizes the iframe before the next editor loads.
        if (!isMobileLayout || !projectOpen) setProjectOpen(false);
        setRenameModalOpen(false);
        setMapPickerOpen(false);
        // Entering Free or Robot from another editor (e.g. a Story mission) with
        // no saved project must land in a fresh project. Without the pending
        // flag the iframe would stay on ScratchJr's "Mis proyectos" album.
        const needsRobotCreation = isMobileLayout && nextMode === 'robot' && !readProjectId('robot');
        const needsFreeCreation = isMobileLayout && nextMode === 'free' && !readProjectId('free');
        robotProjectCreationPendingRef.current = needsRobotCreation;
        freeProjectCreationPendingRef.current = needsFreeCreation;
        if (needsRobotCreation || needsFreeCreation) {
            setFrameUrl(makeFrameUrl(nextMode, null));
        } else {
            setFrameUrl(makeFrameUrl(nextMode));
        }
    };

    const handleFrameLoad = useCallback(() => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (!child) return;
        if (isMobileLayout && mode === 'free' && /home\.html/.test(child.location.pathname)) {
            let attempts = 0;
            const collectProjects = child.setInterval(() => {
                attempts += 1;
                try {
                    const projectArea = child.document.getElementById('scrollarea');
                    const thumbnails = Array.from(child.document.querySelectorAll('#scrollarea > .projectthumb'));
                    const rows = thumbnails
                        .filter(item => !['newproject', 'openproject'].includes(item.id))
                        .map(item => ({
                            id: item.id,
                            name: (item.querySelector('.projecttitle h4') || {}).textContent || 'Mi proyecto',
                            thumbnail: (item.querySelector('.aproject img') || {}).src || ''
                        }))
                        .filter(item => item.id);
                    if ((projectArea && projectArea.children.length >= 2) || attempts >= 70) {
                        setMobileFreeProjects(rows);
                        setMobileFreeProjectsLoading(false);
                        child.clearInterval(collectProjects);
                    }
                } catch (_error) {
                    if (attempts >= 70) {
                        setMobileFreeProjects([]);
                        setMobileFreeProjectsLoading(false);
                        child.clearInterval(collectProjects);
                    }
                }
            }, 150);
        }
        sendModeToScratchJr(mode);
        try {
            const mountControls = force => {
                const centerPanel = child.document.querySelector('.centerpanel');
                const stageFrame = child.document.getElementById('stageframe');
                const topSection = child.document.getElementById('topsection');
                const blockPalette = child.document.getElementById('blockspalette');
                const scriptsContainer = child.document.getElementById('scriptscontainer');
                if (!centerPanel || !stageFrame || !topSection || !blockPalette || !scriptsContainer) return false;
                // En WebView 68 offsetWidth puede quedarse en 0 si el CSS de
                // ScratchJr aún no se ha aplicado; tras unos segundos montamos
                // igualmente porque el dock fija tamaño y posición con !important.
                if (!blockPalette.offsetWidth && !force) return false;
                clearModeSwitchVeil();
                centerPanel.style.setProperty('position', 'absolute', 'important');
                centerPanel.style.setProperty('top', '0px', 'important');
                centerPanel.style.setProperty('left', '0px', 'important');
                const ensureDock = (className, side) => {
                    let dock = centerPanel.querySelector(`.${className}`);
                    if (!dock) {
                        dock = child.document.createElement('div');
                        dock.className = className;
                        dock.dataset.stblockKidsControlSide = side;
                        centerPanel.appendChild(dock);
                    }
                    return dock;
                };
                const leftDock = ensureDock('stblock-kids-left-actions', 'left');
                const rightDock = ensureDock('stblock-kids-right-actions', 'right');
                if (rightDock.dataset.stblockKidsConnectListener !== 'true') {
                    rightDock.dataset.stblockKidsConnectListener = 'true';
                    rightDock.addEventListener('click', event => {
                        const target = event.target;
                        const connectButton = target && target.closest && target.closest('.stblock-kids-connect-button');
                        if (connectButton) {
                            if (onConnectRobot) onConnectRobot();
                        }
                    });
                }
                ['setbkg', 'addtext', 'grid'].forEach(id => {
                    const control = child.document.getElementById(id);
                    const hideControl = (mode === 'robot' && ['setbkg', 'addtext'].includes(id)) ||
                        (mode === 'story' && ['setbkg', 'addtext', 'grid'].includes(id));
                    if (control && hideControl) {
                        control.style.setProperty('display', 'none', 'important');
                    } else if (control) {
                        control.style.removeProperty('display');
                    }
                    if (control && control.parentElement !== leftDock) leftDock.appendChild(control);
                });
                ['go', 'resetall', 'full'].forEach(id => {
                    const control = child.document.getElementById(id);
                    if (control && control.parentElement !== rightDock) rightDock.appendChild(control);
                });
                setRightActionRoot(rightDock);
                child.setTimeout(() => child.dispatchEvent(new Event('stblock-kids-layout')), 200);
                return true;
            };
            setRightActionRoot(null);
            if (!mountControls(false)) {
                let attempts = 0;
                const retryMount = child.setInterval(() => {
                    attempts += 1;
                    if (mountControls(attempts >= 40) || attempts >= 100) child.clearInterval(retryMount);
                }, 100);
            }
            child.sessionStorage.setItem('stblockKids', '1');
            child.sessionStorage.setItem('stblockKidsMode', mode);
            child.document.documentElement.dataset.stblockKids = 'true';
            child.document.body.dataset.stblockKidsMode = mode;
            // ScratchJr can finish building its lobby before the iframe's load
            // handler runs. Apply the Kids lobby chrome here as well so the
            // top bar never flashes or remains in the embedded experience.
            const topbar = child.document.getElementById('topbar');
            const settings = child.document.getElementById('settings');
            const frame = child.document.getElementById('frame');
            if (topbar && settings && frame && !settings.classList.contains('kids-lobby-lock')) {
                settings.classList.add('kids-lobby-lock');
                settings.setAttribute('aria-label', 'Configuración para adultos');
                const gear = settings.querySelector('#geartab');
                if (gear) gear.setAttribute('aria-label', 'Configuración para adultos');
                const spacer = settings.firstElementChild;
                if (spacer && spacer.tagName !== 'LI') spacer.remove();
                frame.appendChild(settings);
                // Keep the tab elements available to Lobby.setPage; ScratchJr
                // updates their classes while the embedded lobby starts.
                topbar.classList.add('kids-lobby-hidden');
            }
            const url = new URL(child.location.href);
            const isEditor = url.pathname.endsWith('/editor.html');
            setMobileSettingsPage(isMobileLayout && !isEditor && url.searchParams.get('place') === 'gear');
            if (isMobileLayout && !isEditor && frame && child.MutationObserver) {
                const syncLobbyPage = () => setMobileSettingsPage(Boolean(child.document.querySelector('#htmlcontents.settings')));
                const previousObserver = child.__stblockKidsLobbyObserver;
                if (previousObserver) previousObserver.disconnect();
                child.__stblockKidsLobbyObserver = new child.MutationObserver(syncLobbyPage);
                child.__stblockKidsLobbyObserver.observe(frame, {childList: true, subtree: true});
                syncLobbyPage();
            }
            // Keep the immersive surface (toolbar hidden, iframe size stable)
            // while a pending creation still shows the lobby, so the toolbar
            // does not flash between the old editor and the new one.
            setProjectOpen(isEditor || robotProjectCreationPendingRef.current || freeProjectCreationPendingRef.current);
            const nextProjectId = url.searchParams.get('pmd5');
            if (nextProjectId) {
                window.localStorage.setItem(projectKeyFor(mode), nextProjectId);
            }
            if (!isEditor && mode === 'story') {
                const pendingName = window.localStorage.getItem(STORY_PENDING_NAME_KEY);
                if (pendingName && !storyCreationStartedRef.current) {
                    let attempts = 0;
                    const createAdventure = child.setInterval(() => {
                        attempts += 1;
                        const home = child.Home;
                        if (home && typeof home.createNewProject === 'function') {
                            child.clearInterval(createAdventure);
                            storyCreationStartedRef.current = true;
                            home.createNewProject(`Aventura de ${pendingName}`);
                        } else if (attempts >= 80) {
                            child.clearInterval(createAdventure);
                            window.localStorage.removeItem(STORY_PENDING_NAME_KEY);
                            window.localStorage.removeItem(STORY_HOME_PROGRESS_KEY);
                            setMobileStorySummary(null);
                            setStoryProgress(emptyStoryProgress());
                            setStoryScreen('');
                            setMobileStoryHome(true);
                            setMobileStoryNameOpen(true);
                        }
                    }, 100);
                    setStoryScreen('loading');
                } else if (mode === 'story') {
                    setStoryScreen('');
                }
            }
            if (!isEditor && mode === 'free' && freeProjectCreationPendingRef.current) {
                let attempts = 0;
                const createProject = child.setInterval(() => {
                    attempts += 1;
                    const home = child.Home;
                    if (home && typeof home.createNewProject === 'function') {
                        child.clearInterval(createProject);
                        freeProjectCreationPendingRef.current = false;
                        home.createNewProject();
                    } else if (attempts >= 80) {
                        child.clearInterval(createProject);
                        freeProjectCreationPendingRef.current = false;
                        clearModeSwitchVeil();
                        setProjectOpen(false);
                    }
                }, 100);
            }
            if (!isEditor && isMobileLayout && mode === 'robot' && robotProjectCreationPendingRef.current) {
                let attempts = 0;
                const createRobotProject = child.setInterval(() => {
                    attempts += 1;
                    const home = child.Home;
                    if (home && typeof home.createNewProject === 'function') {
                        child.clearInterval(createRobotProject);
                        robotProjectCreationPendingRef.current = false;
                        try {
                            home.createNewProject('Robot STBlock');
                        } catch (_error) {
                            // ScratchJr keeps its lobby available if project creation fails.
                            clearModeSwitchVeil();
                            setProjectOpen(false);
                        }
                    } else if (attempts >= 80) {
                        child.clearInterval(createRobotProject);
                        robotProjectCreationPendingRef.current = false;
                        clearModeSwitchVeil();
                        setProjectOpen(false);
                    }
                }, 100);
            }
            child.document.title = 'STBlock Kids';
            child.dispatchEvent(new Event('stblock-kids-layout'));
            if (mode === 'story' && isEditor) {
                setStoryScreen('loading');
                let tries = 0;
                const loadStory = child.setInterval(() => {
                    tries += 1;
                    const storyApi = child.STBLOCK_KIDS_STORY;
                    if (storyApi && storyApi.getProgress) {
                        child.clearInterval(loadStory);
                        const saved = storyApi.getProgress();
                        const pendingName = window.localStorage.getItem(STORY_PENDING_NAME_KEY);
                        const normalized = mergeStoryProgress(saved, readMobileStoryProgress());
                        if (pendingName && !normalized.playerName) {
                            normalized.playerName = pendingName;
                            if (storyApi.saveProgress) storyApi.saveProgress(normalized);
                        }
                        if (pendingName) {
                            window.localStorage.removeItem(STORY_PENDING_NAME_KEY);
                            storyCreationStartedRef.current = false;
                        }
                        writeMobileStoryProgress(normalized);
                        if (storyApi.saveProgress) storyApi.saveProgress(normalized);
                        setMobileStorySummary(normalized);
                        setStoryProgress(normalized);
                        setScoreName(normalized.playerName || '');
                        setStoryLevel(Math.min(20, Math.max(1, Number(normalized.activeLevel) || 1)));
                        setStoryScreen('route');
                    } else if (tries >= 100) child.clearInterval(loadStory);
                }, 100);
            } else if (!(mode === 'story' && window.localStorage.getItem(STORY_PENDING_NAME_KEY))) {
                setStoryScreen('');
            }
        } catch (_error) {
            // ScratchJr conserva su comportamiento si el navegador bloquea el acceso al iframe.
        }
    }, [isMobileLayout, mode, onConnectRobot, sendModeToScratchJr, clearModeSwitchVeil]);

    const storyApi = () => iframeRef.current && iframeRef.current.contentWindow && iframeRef.current.contentWindow.STBLOCK_KIDS_STORY;
    const configureStoryWorld = (world, calibration, debugMarkers = false, resetScripts = false) => {
        const api = storyApi();
        if (!world || !api || !api.configureLevel) return false;
        const challenge = getStoryChallenge(world.id, calibration, basePath);
        return api.configureLevel({
            background: storyMapPath(world, basePath),
            startX: calibration.originX + (calibration.startCol - 1) * calibration.stepX + calibration.startOffsetX,
            startY: calibration.originY + (calibration.startRow - 1) * calibration.stepY + calibration.startOffsetY,
            ...calibration,
            level: world.id,
            challenge,
            actors: challenge.actors,
            objects: challenge.objects,
            debugMarkers,
            resetScripts
        });
    };
    const saveStoryProgress = next => {
        const persisted = {...next, updatedAt: Date.now()};
        setStoryProgress(persisted);
        setMobileStorySummary(persisted);
        writeMobileStoryProgress(persisted);
        const api = storyApi();
        if (api && api.saveProgress) api.saveProgress(persisted);
    };
    const getWorldCalibration = world => {
        const challenge = getStoryChallenge(world.id, {}, basePath);
        const calibration = {...defaultCalibrationFor(world), actors: challenge.actors, objects: challenge.objects};
        // The fallen trunk in level 4 must be carried, so no cell is blocked there.
        if (world.id === 4) calibration.blocked = [];
        return calibration;
    };

    const storyPoints = Object.values(storyProgress.levelScores || {}).reduce((total, value) => total + (Number(value) || 0), 0) + (Number(storyProgress.bonusPoints) || 0);
    const speakStory = text => {
        return blockVoiceEnabled ? voicePlayer.speak(text) : Promise.resolve(false);
    };
    const speakStorySequence = texts => {
        if (blockVoiceEnabled) voicePlayer.speak(texts);
    };
    const enterStoryWorld = level => {
        const world = STORY_WORLDS[level - 1];
        if (!world || level > (storyProgress.unlocked || 1)) return;
        setStoryLevel(level);
        setStoryVideoError(false);
        setStoryIntroVideoDone(false);
        setHintsOpen(false);
        const next = {...storyProgress, activeLevel: level};
        saveStoryProgress(next);
        if (!(storyProgress.introsSeen || []).includes(level)) {
            setStoryScreen('intro');
        } else {
            beginStoryMission(world, next);
        }
    };
    const beginStoryMission = (world = STORY_WORLDS[storyLevel - 1], progress = storyProgress) => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const api = storyApi();
        if (!api || !api.configureLevel || !world) return;
        // A fresh mission starts with no clock: the timer only begins on the
        // first green flag so reading the intro and building never count.
        storyRunStartedAtRef.current = 0;
        const calibration = getWorldCalibration(world);
        const showMap = (progress.hintsByLevel?.[world.id] || []).includes('map');
        configureStoryWorld(world, calibration, showMap, true);
        const seen = Array.from(new Set([...(progress.introsSeen || []), world.id]));
        const next = {...progress, activeLevel: world.id, introsSeen: seen};
        saveStoryProgress(next);
        setStoryScreen('mission');
        setStoryRunMessage('Arma el programa y toca la bandera verde para probarlo.');
        if (Array.isArray(world.guide) && world.guide.length) {
            // The guiding voice walks the child through the whole finale.
            speakStorySequence([`Mundo ${world.id}. ${world.title}. ${world.objective}`, ...world.guide]);
        } else {
            speakStory(`Mundo ${world.id}. ${world.title}. ${world.objective} ${world.lesson}.`);
        }
        if (child) child.postMessage({type: 'STBLOCK_KIDS_STORY_LEVEL', level: world.id}, window.location.origin);
    };
    const openStoryMap = () => { bonusVoiceRequestRef.current++; voicePlayer.cancel(); setHintsOpen(false); setStoryScreen('route'); };
    // The finale plays after world 20: first "final.mp4", then "final-2.mp4",
    // and finally the ¡AVENTURA COMPLETADA! card.
    const playStoryFinale = () => {
        voicePlayer.cancel();
        setFinalVideoStep(0);
        setFinalVideoError(false);
        setStoryScreen('final');
    };
    const handleStoryFinalEnded = () => {
        if (finalVideoStep < FINAL_VIDEO_FILES.length - 1) {
            setFinalVideoStep(finalVideoStep + 1);
            return;
        }
        setStoryScreen('success');
    };
    const closeStoryFinal = () => {
        voicePlayer.cancel();
        setStoryScreen('success');
    };
    const showStoryHelp = () => {
        const world = STORY_WORLDS[storyLevel - 1];
        setStoryRunMessage(world.hint);
        speakStory(`Pista. ${world.hint}`);
    };
    // Guided worlds (the finale) let the child hear the full step-by-step plan
    // again whenever they need it, not only when the mission starts.
    const replayStoryGuide = () => {
        const world = STORY_WORLDS[storyLevel - 1];
        if (!world) return;
        const steps = Array.isArray(world.guide) && world.guide.length ? world.guide : [world.hint];
        setStoryRunMessage(world.hint);
        speakStorySequence([`Pista. ${world.hint}`, ...steps]);
    };
    // Paid hints: stars earned by solving worlds buy real help (allowed or
    // forbidden blocks, an illuminated map and, in cooperative worlds, who does
    // what). Everything is spoken and saved in the project.
    const openStoryHints = () => {
        const world = STORY_WORLDS[storyLevel - 1];
        if (!world) return;
        setHintsOpen(true);
        const owned = storyProgress.hintsByLevel?.[world.id] || [];
        const pendingHints = levelHints(world, getStoryChallenge(world.id, {}, basePath)).filter(hint => !owned.includes(hint.id));
        const available = starsAvailable(storyProgress);
        if (!pendingHints.length) {
            speakStory(`Ya compraste todas las pistas de este mundo. Tienes ${available} estrellas.`);
            return;
        }
        speakStory(`Tienes ${available} estrellas. ${pendingHints.map(hint => `${hint.title}, ${hint.cost} estrellas`).join('; ')}.`);
    };
    const closeStoryHints = () => setHintsOpen(false);
    const buyStoryHint = hint => {
        const world = STORY_WORLDS[storyLevel - 1];
        if (!world || !hint) return;
        const owned = storyProgress.hintsByLevel?.[world.id] || [];
        if (owned.includes(hint.id)) return;
        const available = starsAvailable(storyProgress);
        if (available < hint.cost) {
            speakStory(`Te faltan estrellas. Esta pista cuesta ${hint.cost} y tienes ${available}.`);
            return;
        }
        const hintsByLevel = {...(storyProgress.hintsByLevel || {}), [world.id]: [...owned, hint.id]};
        const next = {...storyProgress, hintsByLevel, starsSpent: (Number(storyProgress.starsSpent) || 0) + hint.cost};
        saveStoryProgress(next);
        setStoryRunMessage(`${hint.title}: ${hint.detail}`);
        speakStory(`¡Listo! ${hint.speech} Te quedan ${starsAvailable(next)} estrellas.`);
        if (hint.id === 'map') {
            // Redraws the world with start, goal, checkpoints and blocked cells
            // highlighted. The child keeps their blocks; only the player returns
            // to the start so the illuminated map can be read.
            configureStoryWorld(world, getWorldCalibration(world), true);
        }
    };

    const BONUS_POINTS = 25;
    // Ends the level and moves to the success screen. The bonus challenge is
    // never required: solving it adds extra points, and a wrong answer (or
    // skipping) still advances to the next world.
    const finishBonusChallenge = earnedBonus => {
        bonusVoiceRequestRef.current++;
        if (bonusTimerRef.current) {
            window.clearTimeout(bonusTimerRef.current);
            bonusTimerRef.current = null;
        }
        const pending = pendingStoryCompletion;
        if (pending) {
            const extra = Math.max(0, Number(earnedBonus) || 0);
            const next = extra > 0
                ? {...pending.next, bonusPoints: (Number(pending.next.bonusPoints) || 0) + extra}
                : pending.next;
            const stars = Number((next.starsByLevel || {})[pending.world.id]) || 0;
            const score = Number((next.levelScores || {})[pending.world.id]) || 0;
            const wallet = starsAvailable(next);
            saveStoryProgress(next);
            setStoryRunMessage(pending.world.summary);
            if (pending.world.id === 20) {
                // The adventure is over: play the ending cinematics before the
                // final score card. No narration so it does not fight the video.
                playStoryFinale();
            } else {
                setStoryScreen('success');
                speakStory(extra > 0
                    ? `¡Reto superado! ${pending.world.summary} Ganaste ${stars} estrellas y ${score} puntos, más ${extra} puntos extra. Ahora tienes ${wallet} estrellas para pistas.`
                    : `¡Reto superado! ${pending.world.summary} Ganaste ${stars} estrellas y ${score} puntos. Ahora tienes ${wallet} estrellas para pistas.`);
            }
        }
        setBonusChallenge(null);
        setBonusFeedback('');
        setPendingStoryCompletion(null);
    };
    // Closing the pop-up (×, backdrop or Saltar) still advances, and keeps the
    // bonus if the child had already answered correctly.
    const closeBonusChallenge = () => finishBonusChallenge(bonusFeedback === 'correct' ? BONUS_POINTS : 0);
    const skipBonusChallenge = () => finishBonusChallenge(0);
    const answerBonus = choice => {
        if (!bonusChallenge || bonusFeedback !== '') return;
        const finishAfterNarration = (text, extra, minimumDelay) => {
            const request = ++bonusVoiceRequestRef.current;
            const started = Date.now();
            if (bonusTimerRef.current) window.clearTimeout(bonusTimerRef.current);
            speakStory(text).then(() => {
                if (request !== bonusVoiceRequestRef.current) return;
                bonusTimerRef.current = window.setTimeout(() => {
                    if (request === bonusVoiceRequestRef.current) finishBonusChallenge(extra);
                }, Math.max(0, minimumDelay - (Date.now() - started)));
            });
        };
        if (choice === bonusChallenge.answer) {
            setBonusFeedback('correct');
            finishAfterNarration(`¡Muy bien! ${bonusChallenge.solutionText} Ganaste puntos extra.`, BONUS_POINTS, 1400);
        } else {
            setBonusFeedback('wrong');
            finishAfterNarration(`Casi. ${bonusChallenge.solutionText} Vamos al siguiente mundo.`, 0, 3200);
        }
    };

    useEffect(() => {
        if (mode !== 'story') return undefined;
        const handleStoryEvent = event => {
            if (event.source !== (iframeRef.current && iframeRef.current.contentWindow) || event.origin !== window.location.origin) return;
            if (event.data && ['STBLOCK_KIDS_STORY_BLOCKED_MOVE', 'STBLOCK_KIDS_STORY_RULE_VIOLATION'].includes(event.data.type)) {
                setStoryRunMessage(event.data.message || 'Revisa el camino y vuelve a intentarlo.');
                speakStory(event.data.message || 'Revisa el camino y vuelve a intentarlo.');
                return;
            }
            if (event.data && event.data.type === 'STBLOCK_KIDS_STORY_RUN_STARTED') {
                // The clock starts on the first green flag and keeps running
                // through retries until the world is solved.
                if (!storyRunStartedAtRef.current) storyRunStartedAtRef.current = Date.now();
                const startedWorld = STORY_WORLDS[storyLevel - 1];
                // In the guided finale the voice encourages the child when the
                // green flag starts the run, then stays quiet so the guide from
                // the mission start is not interrupted.
                if (startedWorld && Number(startedWorld.id) === 20) {
                    speakStory('¡Adelante! La voz guía te acompaña. Primero STB hasta el corazón del faro; después Vega hasta el prisma.');
                }
                return;
            }
            if (!event.data || event.data.type !== 'STBLOCK_KIDS_STORY_RUN_FINISHED') return;
            const world = STORY_WORLDS[storyLevel - 1];
            const position = event.data.position;
            const calibration = getWorldCalibration(world);
            const attemptCount = (Number((storyProgress.attemptsByLevel || {})[world.id]) || 0) + 1;
            const attemptsByLevel = {...(storyProgress.attemptsByLevel || {}), [world.id]: attemptCount};
            const trace = Array.isArray(event.data.trace) ? event.data.trace : [];
            const telemetry = event.data.telemetry || {};
            const runSeconds = storyRunStartedAtRef.current ? (Date.now() - storyRunStartedAtRef.current) / 1000 : null;
            const levelChallenge = getStoryChallenge(world.id, calibration, basePath);
            const result = evaluateStoryChallenge({
                challenge: levelChallenge,
                calibration,
                position,
                trace,
                actions: Array.isArray(telemetry.actions) ? telemetry.actions : [],
                blockUsage: Array.isArray(telemetry.blockUsage) ? telemetry.blockUsage : [],
                carriedId: telemetry.carriedId || null,
                carriedObjectsByActor: telemetry.carriedObjectsByActor || {},
                worldObjects: Array.isArray(telemetry.worldObjects) ? telemetry.worldObjects : [],
                movementBlocks: Array.isArray(telemetry.movementBlocks) ? telemetry.movementBlocks : [],
                blockedCell: telemetry.blockedCell || null,
                ruleViolation: telemetry.ruleViolation || ''
            });
            if (!result.complete) {
                saveStoryProgress({...storyProgress, attemptsByLevel});
                setStoryRunMessage(result.message);
                speakStory(world.id >= 11 ? result.speechMessage || result.message : `${result.message} ${world.hint}`);
                return;
            }
            const alreadyCompleted = (storyProgress.completed || []).includes(world.id);
            const completed = Array.from(new Set([...(storyProgress.completed || []), world.id]));
            // Score blends speed, block efficiency and attempts. The elapsed time
            // is measured from the green flag in the host; blocksUsed comes from
            // the engine (placed blocks, so a Repeat counts once).
            const blocksUsed = Math.max(0, Number(telemetry.blocksUsed) || 0);
            const scoring = scoreStoryRun({world, challenge: levelChallenge, attempts: attemptCount, seconds: runSeconds, blocksUsed});
            const scoreEarned = scoring.score;
            const starsEarned = scoring.stars;
            const levelScores = {...(storyProgress.levelScores || {}), [world.id]: Math.max(Number((storyProgress.levelScores || {})[world.id]) || 0, scoreEarned)};
            const starsByLevel = {...(storyProgress.starsByLevel || {}), [world.id]: Math.max(Number((storyProgress.starsByLevel || {})[world.id]) || 0, starsEarned)};
            const next = {...storyProgress, completed, attemptsByLevel, levelScores, starsByLevel, unlocked: Math.max(storyProgress.unlocked || 1, Math.min(20, world.id + 1)), sparks: (storyProgress.sparks || 0) + (alreadyCompleted ? 0 : 1), activeLevel: world.id};
            // Persist the completion right away so the level is never lost if the
            // app closes while the optional challenge is on screen; the bonus is
            // added on top when the child solves it.
            saveStoryProgress(next);
            // Stop the clock on success so the next world measures its own run.
            storyRunStartedAtRef.current = 0;
            // Every world ends with a tiny optional challenge before the success
            // screen: letters (1-5), numbers/sequences (6-12) or math (13-20).
            // Solving it is never required; a right answer adds bonus points and
            // a wrong one shows the solution and still advances.
            const challenge = makeBonusChallenge(world.id);
            setPendingStoryCompletion({next, world});
            setBonusFeedback('');
            setBonusChallenge(challenge);
            const challengeIntro = `¡Mundo completado! Ganaste ${starsEarned} ${starsEarned === 1 ? 'estrella' : 'estrellas'} y ${scoreEarned} puntos. ${challenge.prompt}`;
            setStoryRunMessage(challengeIntro);
            speakStory(`${challengeIntro} Opciones: ${challenge.options.join(', ')}.`);
        };
        window.addEventListener('message', handleStoryEvent);
        return () => window.removeEventListener('message', handleStoryEvent);
    }, [mode, storyLevel, storyProgress, blockVoiceEnabled]);

    const openStoryLibrary = () => {
        bonusVoiceRequestRef.current++;
        voicePlayer.cancel();
        setMode('story');
        setStoryScreen('');
        setProjectOpen(false);
        setRenameModalOpen(false);
        const appUrl = `${basePath}${APP_PATH}`;
        setFrameUrl(`${appUrl}home.html?stblockKids=1&stblockKidsMode=story&stblockFrame=${Date.now().toString(36)}`);
    };

    const openMobileStoryHome = () => {
        bonusVoiceRequestRef.current++;
        clearModeSwitchVeil();
        voicePlayer.cancel();
        setMobileMenuOpen(false);
        setMobileStoryNameOpen(false);
        setMode('free');
        setStoryScreen('');
        setProjectOpen(false);
        setRenameModalOpen(false);
        setMobileStoryHome(true);
        setFrameUrl(makeFrameUrl('free', null));
    };

    const openMobileFreeProject = projectId => {
        if (!projectId) return;
        beginModeSwitchVeil();
        requestLandscapeMode();
        setMobileStoryHome(false);
        setMobileStoryNameOpen(false);
        setMode('free');
        setStoryScreen('');
        setProjectOpen(true);
        setFrameUrl(makeFrameUrl('free', projectId));
    };

    const deleteMobileFreeProject = project => {
        setMobileProjectToDelete(project);
    };

    const confirmDeleteMobileFreeProject = () => {
        const project = mobileProjectToDelete;
        if (!project) return;
        setMobileProjectToDelete(null);
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const home = child && child.Home;
        if (!child || !home) return;

        const projectTarget = Array.from(child.document.querySelectorAll('#scrollarea > .projectthumb'))
            .find(item => String(item.id) === String(project.id));
        const deleteControl = projectTarget && projectTarget.querySelector('.closex');
        const lobbyFrame = child.document.getElementById('htmlcontents');
        if (!projectTarget || !deleteControl || !lobbyFrame) return;

        // Run ScratchJr's native delete path after confirmation in the visible
        // Kids UI; its own confirmation is inside the covered iframe.
        deleteControl.style.visibility = 'visible';
        deleteControl.dispatchEvent(new child.MouseEvent('mousedown', {bubbles: true, cancelable: true, view: child}));
        deleteControl.dispatchEvent(new child.MouseEvent('mouseup', {bubbles: true, cancelable: true, view: child}));
        const nativeConfirmButton = child.document.querySelector('.stblock-delete-confirm-overlay .stblock-delete-action');
        if (!nativeConfirmButton) return;
        nativeConfirmButton.click();

        let attempts = 0;
        const refreshAfterDelete = child.setInterval(() => {
            attempts += 1;
            const stillExists = child.document.getElementById(project.id);
            if (!stillExists || attempts >= 200) {
                child.clearInterval(refreshAfterDelete);
                if (stillExists) return;
                const rows = Array.from(child.document.querySelectorAll('#scrollarea > .projectthumb'))
                    .filter(item => !['newproject', 'openproject'].includes(item.id))
                    .map(item => ({
                        id: item.id,
                        name: (item.querySelector('.projecttitle h4') || {}).textContent || 'Mi proyecto',
                        thumbnail: (item.querySelector('.aproject img') || {}).src || ''
                    }));
                setMobileFreeProjects(rows);
                try {
                    if (window.localStorage.getItem(projectKeyFor('free')) === String(project.id)) {
                        window.localStorage.removeItem(projectKeyFor('free'));
                    }
                } catch (_error) {}
            }
        }, 100);
    };

    // The mobile home no longer opens the full "Mis proyectos" browser (the
    // saved projects already appear below). Instead, "Cargar archivo" uses
    // ScratchJr's native importer to open a .sjr/.zip/.sqlite project file and
    // then opens the freshly imported project in the editor.
    const loadProjectFile = () => {
        setMobileMenuOpen(false);
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const home = child && child.Home;
        if (!child || !home || typeof home.openFileDialog !== 'function') return;
        const collectLobbyProjects = () => {
            try {
                return Array.from(child.document.querySelectorAll('#scrollarea > .projectthumb'))
                    .filter(item => !['newproject', 'openproject'].includes(item.id))
                    .map(item => ({
                        id: item.id,
                        name: (item.querySelector('.projecttitle h4') || {}).textContent || 'Mi proyecto',
                        thumbnail: (item.querySelector('.aproject img') || {}).src || ''
                    }))
                    .filter(item => item.id);
            } catch (_error) {
                return [];
            }
        };
        const knownIds = new Set(collectLobbyProjects().map(project => String(project.id)));
        home.openFileDialog();
        // The native file picker resolves asynchronously; poll the lobby until
        // the imported project shows up, then refresh the saved list and open it.
        let attempts = 0;
        const discoverImportedProject = child.setInterval(() => {
            attempts += 1;
            const rows = collectLobbyProjects();
            const imported = rows.find(project => !knownIds.has(String(project.id)));
            if (imported) {
                child.clearInterval(discoverImportedProject);
                setMobileFreeProjects(rows);
                setMobileFreeProjectsLoading(false);
                openMobileFreeProject(imported.id);
            } else if (attempts >= 240) {
                child.clearInterval(discoverImportedProject);
            }
        }, 500);
    };

    const createMobileFreeProject = () => {
        beginModeSwitchVeil();
        requestLandscapeMode();
        setMobileMenuOpen(false);
        setMobileStoryHome(false);
        setMobileStoryNameOpen(false);
        setMode('free');
        setStoryScreen('');
        setProjectOpen(false);
        setRenameModalOpen(false);
        freeProjectCreationPendingRef.current = true;
        setFrameUrl(makeFrameUrl('free', null));
    };

    const enterMobileMode = nextMode => {
        setMobileStoryHome(false);
        setMobileStoryNameOpen(false);
        if (nextMode === mode) return;
        handleModeChange(nextMode);
    };

    const requestLandscapeMode = async () => {
        if (!window.matchMedia('(orientation: portrait)').matches) {
            return;
        }
        const orientation = window.screen && window.screen.orientation;
        if (!orientation || typeof orientation.lock !== 'function') {
            return;
        }
        try {
            await orientation.lock('landscape');
        } catch (orientationError) {
            // Si el navegador no permite bloquear la orientación, el aviso permite girar el teléfono.
        }
    };

    const openMobileSettings = () => {
        setMobileMenuOpen(false);
        setMobileStoryHome(false);
        setMobileStoryNameOpen(false);
        setStoryScreen('');
        setRenameModalOpen(false);
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const navigateToSettings = () => {
            setProjectOpen(false);
            setMobileSettingsPage(true);
            setFrameUrl(makeFrameUrl(mode, null, 'gear'));
        };
        const scratchJr = child && child.ScratchJr;
        if (projectOpen && scratchJr && typeof scratchJr.saveProject === 'function') {
            scratchJr.saveProject(null, navigateToSettings);
        } else {
            navigateToSettings();
        }
    };

    const resumeMobileStory = () => {
        requestLandscapeMode();
        if (projectOpen && mode === 'story') {
            setMobileStoryHome(false);
            return;
        }
        const projectId = readProjectId('story');
        if (!projectId) {
            setMobileStoryNameOpen(true);
            return;
        }
        setMode('story');
        setMobileStoryHome(false);
        setStoryScreen('loading');
        setProjectOpen(true);
        setFrameUrl(makeFrameUrl('story', projectId));
    };

    const createMobileStory = event => {
        requestLandscapeMode();
        if (event) event.preventDefault();
        const playerName = mobileStoryPlayerName.trim().slice(0, 24);
        if (!playerName) return;
        try {
            window.localStorage.setItem(STORY_PENDING_NAME_KEY, playerName);
        } catch (_error) {
            // Story progress will still be stored in the created project.
        }
        storyCreationStartedRef.current = false;
        const initialProgress = emptyStoryProgress(playerName);
        setStoryProgress(initialProgress);
        setMobileStorySummary(initialProgress);
        writeMobileStoryProgress(initialProgress);
        setScoreName(playerName);
        setMobileStoryNameOpen(false);
        setMobileStoryHome(false);
        setMode('story');
        setStoryScreen('loading');
        setProjectOpen(false);
        setFrameUrl(makeFrameUrl('story', null));
    };

    const saveScoreName = () => {
        const playerName = scoreName.trim().slice(0, 24);
        const next = {...storyProgress, playerName};
        setScoreName(playerName);
        saveStoryProgress(next);
    };

    const openRenameProject = () => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const projectApi = child && child.STBLOCK_KIDS_PROJECT;
        if (!projectApi) return;
        setRenameValue(projectApi.getName());
        setRenameModalOpen(true);
    };

    const saveProjectName = () => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const projectApi = child && child.STBLOCK_KIDS_PROJECT;
        if (projectApi && projectApi.setName(renameValue)) {
            setRenameModalOpen(false);
        }
    };

    const handleMapChange = nextMap => {
        setMap(nextMap);
        setMapPickerOpen(false);
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (child) child.postMessage({type: 'STBLOCK_KIDS_MODE', mode: 'robot', map: nextMap}, window.location.origin);
    };

    const toggleBlockVoice = () => {
        const nextEnabled = !blockVoiceEnabled;
        setBlockVoiceEnabled(nextEnabled);
        try {
            window.localStorage.setItem('stblockKidsBlockVoice', nextEnabled ? 'on' : 'off');
        } catch (_error) {
            // Keep the control usable for this session if storage is unavailable.
        }
        if (!nextEnabled) {
            voicePlayer.cancel();
        }
    };

    useEffect(() => {
        document.body.dataset.stblockKidsRobot = mode === 'robot' ? 'true' : 'false';
        const handleRobotCommand = event => {
            if (event.source !== (iframeRef.current && iframeRef.current.contentWindow) || event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== 'STBLOCK_KIDS_ROBOT_COMMAND') return;
            const peripheral = vm && vm.runtime && vm.runtime.peripheralExtensions && vm.runtime.peripheralExtensions.bluetooth;
            if (!peripheral || !peripheral.isConnected || !peripheral.isConnected()) return;
            const {action, direction, steps} = event.data;
            const safeSteps = Math.max(1, Math.min(20, Math.round(Number(steps) || 1)));
            const line = action === 'move' ? `MOVE,${direction === 'backward' ? 'BACK' : 'FWD'},${safeSteps}` :
                action === 'turn' ? `TURN,${direction === 'left' ? 'LEFT' : 'RIGHT'},${safeSteps}` :
                    action === 'stop' ? 'STOP' : null;
            if (line) {
                robotSendQueueRef.current = robotSendQueueRef.current
                    .then(() => peripheral.sendLine(line))
                    .catch(error => console.warn('STBlock Kids: error enviando movimiento Bluetooth', error));
            }
        };
        window.addEventListener('message', handleRobotCommand);
        return () => {
            delete document.body.dataset.stblockKidsRobot;
            window.removeEventListener('message', handleRobotCommand);
        };
    }, [mode, onConnectRobot, vm]);

    const connectedLabel = useMemo(() => {
        if (!bluetoothConnected) return 'Conectar robot';
        return bluetoothPortName ? `Conectado · ${bluetoothPortName}` : 'Robot conectado';
    }, [bluetoothConnected, bluetoothPortName]);
    const mobileStoryProjectExists = Boolean(readProjectId('story'));
    const mobileSavedStory = mobileStoryProjectExists ? mobileStorySummary : null;
    const mobileCompletedWorlds = mobileSavedStory && Array.isArray(mobileSavedStory.completed) ? mobileSavedStory.completed.length : 0;
    const mobileActiveWorld = mobileSavedStory ? Math.min(20, Math.max(1,
        (mobileSavedStory.completed || []).includes(Number(mobileSavedStory.activeLevel))
            ? Number(mobileSavedStory.unlocked) || 1
            : Number(mobileSavedStory.activeLevel) || Number(mobileSavedStory.unlocked) || 1
    )) : 1;
    const mobileStoryPoints = mobileSavedStory
        ? Object.values(mobileSavedStory.levelScores || {}).reduce((total, value) => total + (Number(value) || 0), 0) + (Number(mobileSavedStory.bonusPoints) || 0)
        : 0;

    return (
            <main className={styles.workspace} data-mode={mode} data-project-open={projectOpen ? 'true' : 'false'} data-experience-open={projectOpen || (mode === 'story' && Boolean(storyScreen)) ? 'true' : 'false'}>
            <header className={styles.toolbar}>
                <button className={styles.exit} onClick={onExit} type="button" aria-label="Cambiar entre STBlock y STBlock Kids" title="Elegir espacio">🏠</button>
                <button className={styles.spaceSelector} onClick={openStoryLibrary} type="button" aria-label="Ir a Mis proyectos" title="Mis proyectos">📁</button>
                <img className={styles.brand} src={logoUrl} alt="STBlock Kids" />
                <nav className={styles.modes} aria-label="Modo de trabajo">
                    {MODE_TABS.map(tab => (
                        <button
                            aria-pressed={mode === tab.id}
                            className={`${styles.modeButton} ${mode === tab.id ? styles.modeActive : ''}`}
                            key={tab.id}
                            onClick={() => handleModeChange(tab.id)}
                            type="button"
                        >
                            <span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span>
                        </button>
                    ))}
                    {projectOpen && (
                        <button className={styles.renameToggle} onClick={openRenameProject} type="button" aria-label="Cambiar nombre del proyecto" title="Cambiar nombre">
                            ✏️
                        </button>
                    )}
                    <button
                        className={styles.voiceToggle}
                        onClick={toggleBlockVoice}
                        type="button"
                        aria-label={blockVoiceEnabled ? 'Silenciar voz de los bloques' : 'Activar voz de los bloques'}
                        aria-pressed={blockVoiceEnabled}
                        title={blockVoiceEnabled ? 'Voz de los bloques activada' : 'Voz de los bloques silenciada'}
                    >
                        {blockVoiceEnabled ? '🔊' : '🔇'}
                    </button>
                </nav>
                <button
                    className={styles.mobileMenuToggle}
                    onClick={() => setMobileMenuOpen(true)}
                    type="button"
                    aria-label="Abrir menú de STBlock Kids"
                    aria-expanded={mobileMenuOpen}
                >⋮</button>
            </header>
            {mobileMenuOpen && (
                <div className={styles.mobileMenuShade} onMouseDown={event => {if (event.target === event.currentTarget) setMobileMenuOpen(false);}}>
                    <aside className={styles.mobileMenu} role="dialog" aria-modal="true" aria-label="Menú STBlock Kids">
                        <div className={styles.mobileMenuHeading}>
                            <strong>STBlock Kids</strong>
                            <button onClick={() => setMobileMenuOpen(false)} type="button" aria-label="Cerrar menú">×</button>
                        </div>
                        <div className={styles.mobileMenuBody}>
                            <div className={styles.mobileMenuSection}>
                                <p className={styles.mobileMenuLabel}>PROYECTO</p>
                                <div className={styles.mobileMenuTools}>
                                    <button className={styles.mobileMenuReturnItem} onClick={openMobileStoryHome} type="button"><span>⭐</span>Inicio · Mi aventura</button>
                                    <button onClick={createMobileFreeProject} type="button"><span>➕</span>Crear proyecto · Libre</button>
                                    <button onClick={loadProjectFile} type="button"><span>📂</span>Cargar archivo · Libre</button>
                                    {projectOpen && <button onClick={() => {openRenameProject(); setMobileMenuOpen(false);}} type="button"><span>✏️</span>Cambiar nombre</button>}
                                </div>
                            </div>
                            <div className={styles.mobileMenuSection}>
                                <p className={styles.mobileMenuLabel}>ROBOT</p>
                                <div className={styles.mobileMenuTools}>
                                    <button onClick={() => {enterMobileMode('robot'); setMobileMenuOpen(false);}} type="button"><span>🤖</span>Proyectos · Robot</button>
                                    {mode === 'robot' && <>
                                        <button onClick={() => {setMapPickerOpen(true); setMobileMenuOpen(false);}} type="button"><span>🗺️</span>Cambiar mundo</button>
                                        <button onClick={() => {if (onConnectRobot) onConnectRobot(); setMobileMenuOpen(false);}} type="button"><span>🔵</span>{bluetoothConnected ? 'Robot conectado' : 'Conectar robot'}</button>
                                    </>}
                                </div>
                            </div>
                            <div className={styles.mobileMenuSection}>
                                <p className={styles.mobileMenuLabel}>SISTEMA</p>
                                <div className={styles.mobileMenuTools}>
                                    <button onClick={() => {toggleBlockVoice(); setMobileMenuOpen(false);}} type="button"><span>{blockVoiceEnabled ? '🔊' : '🔇'}</span>{blockVoiceEnabled ? 'Silenciar voz de bloques' : 'Activar voz de bloques'}</button>
                                    <button onClick={openMobileSettings} type="button"><span>⚙️</span>Ajustes</button>
                                </div>
                            </div>
                            <div className={styles.mobileMenuSection}>
                                <p className={styles.mobileMenuLabel}>ESPACIO</p>
                                <div className={styles.mobileMenuTools}>
                                    <button className={styles.mobileMenuPlatform} onClick={() => {setMobileMenuOpen(false); onExit();}} type="button"><span>🔄</span>Cambiar entre STBlock y STBlock Kids</button>
                                </div>
                            </div>
                        </div>
                        <div className={styles.mobileMenuFooter}>
                            <small>STBlock Kids · STB Academy</small>
                        </div>
                    </aside>
                </div>
            )}
            {isMobileLayout && !mobileSettingsPage && storyScreen !== 'intro' && (((!mobileStoryHome && mode !== 'story') || projectOpen || (mode === 'story' && Boolean(storyScreen)))) && (
                <nav className={styles.mobileBottomModes} aria-label="Cambiar modo">
                    {projectOpen && (
                        <button onClick={() => setMobileMenuOpen(true)} type="button" aria-label="Abrir menú" aria-expanded={mobileMenuOpen}>
                            <span aria-hidden="true">☰</span><span>Menú</span>
                        </button>
                    )}
                    {MODE_TABS.filter(tab => tab.id !== 'story').map(tab => (
                        <button
                            key={tab.id}
                            className={!mobileStoryHome && mode === tab.id ? styles.mobileBottomModeActive : ''}
                            onClick={() => enterMobileMode(tab.id)}
                            type="button"
                            aria-pressed={!mobileStoryHome && mode === tab.id}
                        ><span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span></button>
                    ))}
                </nav>
            )}
            <section className={`${styles.editorSurface} ${mode === 'story' && storyScreen === 'mission' ? styles.editorSurfaceMission : ''}`} aria-label="Editor STBlock Kids">
                <iframe
                    ref={iframeRef}
                    className={styles.editor}
                    src={frameUrl}
                    title="Editor de programación STBlock Kids"
                    allow="autoplay; camera; microphone"
                    onLoad={handleFrameLoad}
                />
                {isMobileLayout && modeSwitching && (
                    <div className={styles.modeSwitchVeil} role="status" aria-live="polite">
                        <img src={logoUrl} alt="" aria-hidden="true" />
                        <span className={styles.modeSwitchDots} aria-hidden="true"><i /><i /><i /></span>
                        <small>Preparando tu espacio…</small>
                    </div>
                )}
                {mode === 'story' && storyScreen === 'loading' && <div className={styles.storyLoading} role="status">✨ Preparando tu aventura…</div>}
                {mode === 'story' && storyScreen === 'route' && (
                    <div className={styles.storyRoute}>
                        <img className={styles.storyRouteImage} src={resolveKidsUrl(`${basePath}static/kids/story/route.jpg`)} alt="Mapa ilustrado de la Ruta de aventura" />
                        <section className={styles.storyRoutePanel} aria-label="Mundos de la aventura">
                            <div className={styles.storyRouteHeading}><span>⭐ {starsAvailable(storyProgress)}</span><h2>Ruta de aventura</h2><p>Gana estrellas en cada mundo y cámbialas por pistas.</p><button className={styles.storyPointsLink} onClick={() => setStoryScreen('scores')} type="button">🏆 Mis puntos · {storyPoints}</button></div>
                            <div className={styles.storyWorldList}>
                                {STORY_WORLDS.map(world => {
                                    const unlocked = world.id <= (storyProgress.unlocked || 1);
                                    const completed = (storyProgress.completed || []).includes(world.id);
                                    return <button key={world.id} disabled={!unlocked} className={`${styles.storyWorld} ${completed ? styles.storyWorldDone : ''}`} onClick={() => enterStoryWorld(world.id)} type="button" aria-label={`Mundo ${world.id}: ${world.title}${unlocked ? '' : ', bloqueado'}`}>
                                        <span className={styles.storyWorldNumber}>{completed ? '✓' : unlocked ? world.id : '🔒'}</span><span><strong>{world.title}</strong><small>{completed ? 'Completado · repetir' : `Reto: ${world.lesson}`}</small></span><span className={styles.storyWorldArrow}>{unlocked ? '➜' : '🔒'}</span>
                                    </button>;
                                })}
                            </div>
                            <p className={styles.storyProgressText}>{(storyProgress.completed || []).length} de 20 mundos completados · tu avance se guarda en este proyecto</p>
                        </section>
                    </div>
                )}
                {mode === 'story' && storyScreen === 'intro' && (
                    <div className={`${styles.storyCinematic} ${isMobileLayout ? styles.storyIntroMobile : ''} ${isMobileLayout && !storyIntroVideoDone && !storyVideoError ? styles.storyIntroMobilePlaying : ''}`}>
                        <div className={styles.storyCinematicCard}>
                            <button className={styles.storyClose} onClick={() => {voicePlayer.cancel(); setStoryScreen('route');}} type="button" aria-label="Volver al mapa">×</button>
                            <header className={styles.storyIntroHeader}><p className={styles.storyEyebrow}>MUNDO {storyLevel} · {STORY_WORLDS[storyLevel - 1].chapter}</p><h2>{STORY_WORLDS[storyLevel - 1].title}</h2></header>
                            <div className={styles.storyIntroContent}>
                                {!storyVideoError && (!isMobileLayout || !storyIntroVideoDone) ? (
                                    <StoryVideo
                                        key={`story-intro-${storyLevel}`}
                                        className={styles.storyVideo}
                                        autoPlay
                                        controls={!isMobileLayout}
                                        playsInline
                                        preload={isMobileLayout ? 'auto' : 'none'}
                                        src={resolveKidsUrl(`${basePath}static/kids/story/videos/${storyLevel}.mp4`)}
                                        onLoadedMetadata={event => {event.currentTarget.playbackRate = 1.05; event.currentTarget.preservesPitch = true; event.currentTarget.webkitPreservesPitch = true; if (isMobileLayout) {const playing = event.currentTarget.play(); playing && playing.catch(() => {});}}}
                                        onClick={isMobileLayout ? event => {const playing = event.currentTarget.play(); playing && playing.catch(() => {});} : undefined}
                                        onError={() => {setStoryVideoError(true); setStoryIntroVideoDone(true); speakStory(STORY_WORLDS[storyLevel - 1].story);}}
                                        onEnded={() => {if (isMobileLayout) {setStoryIntroVideoDone(true);} else {beginStoryMission();}}}
                                    />
                                ) : storyVideoError ? (
                                    <div className={styles.storyVideoFallback}>🎬<p>La aventura está lista. Escucha lo que pasó y prepara el reto.</p></div>
                                ) : null}
                                <aside className={styles.storyIntroAside}><p className={styles.storyNarration}>{STORY_WORLDS[storyLevel - 1].story}</p><button className={styles.storyPrimary} onClick={() => beginStoryMission()} type="button">Empezar el reto <span>➜</span></button></aside>
                            </div>
                        </div>
                    </div>
                )}
                {mode === 'story' && storyScreen === 'final' && (
                    <div className={styles.storyCinematic}>
                        <div className={styles.storyCinematicCard}>
                            <button className={styles.storyClose} onClick={closeStoryFinal} type="button" aria-label="Saltar el final">×</button>
                            <header className={styles.storyIntroHeader}><p className={styles.storyEyebrow}>¡AVENTURA COMPLETADA!</p><h2>El Faro del Cielo</h2></header>
                            <div className={styles.storyIntroContent}>
                                {!finalVideoError ? (
                                    <StoryVideo
                                        key={finalVideoStep}
                                        className={styles.storyVideo}
                                        autoPlay
                                        controls
                                        playsInline
                                        preload="auto"
                                        src={resolveKidsUrl(`${basePath}static/kids/story/videos/${FINAL_VIDEO_FILES[finalVideoStep]}`)}
                                        onEnded={handleStoryFinalEnded}
                                        onError={() => {
                                            if (finalVideoStep < FINAL_VIDEO_FILES.length - 1) {
                                                setFinalVideoStep(finalVideoStep + 1);
                                            } else {
                                                setFinalVideoError(true);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className={styles.storyVideoFallback}>🎬<p>El Faro del Cielo vuelve a brillar. ¡Gracias por vivir esta aventura!</p></div>
                                )}
                                <aside className={styles.storyIntroAside}>
                                    <p className={styles.storyNarration}>El Faro del Cielo vuelve a brillar. STB, Rayo, Lumi y todos sus amigos celebran juntos. ¡Gracias por vivir esta aventura!</p>
                                    <button className={styles.storyPrimary} onClick={closeStoryFinal} type="button">Ver mis puntos <span>➜</span></button>
                                </aside>
                            </div>
                        </div>
                    </div>
                )}
                {mode === 'story' && storyScreen === 'success' && (
                    <div className={styles.storyCinematic}>
                        <section className={styles.storySuccessCard}>
                            <div className={styles.storyReward}>⭐</div><p className={styles.storyEyebrow}>{storyLevel === 20 ? '¡AVENTURA COMPLETADA!' : '¡RETO SUPERADO!'}</p><h2>{STORY_WORLDS[storyLevel - 1].title}</h2>
                            <p>{STORY_WORLDS[storyLevel - 1].summary}</p><div className={styles.storySparkCount}>⭐ {(storyProgress.starsByLevel || {})[storyLevel] || 0} estrellas · 🏆 {(storyProgress.levelScores || {})[storyLevel] || 0} puntos{storyProgress.bonusPoints > 0 && <> · 🎁 {storyProgress.bonusPoints} extra</>}</div><p className={styles.storyStarsWallet}>Ahora tienes ⭐ {starsAvailable(storyProgress)} estrellas para pistas en los próximos mundos.</p>
                            <div className={styles.storySuccessActions}><button onClick={openStoryMap} type="button">Ver el mapa</button>{storyLevel < 20 ? <button className={styles.storyPrimary} onClick={() => enterStoryWorld(storyLevel + 1)} type="button">Siguiente mundo ➜</button> : <button className={styles.storyPrimary} onClick={playStoryFinale} type="button">🎬 Ver el final</button>}</div>
                        </section>
                    </div>
                )}
                {mode === 'story' && storyScreen === 'scores' && (
                    <div className={styles.storyRoute}>
                        <img className={styles.storyRouteImage} src={resolveKidsUrl(`${basePath}static/kids/story/route.jpg`)} alt="Mapa de la aventura" />
                        <section className={styles.storyScorePanel} aria-label="Puntuación de la aventura">
                            <h2>🏆 Mis puntos</h2>
                            <label htmlFor="storyStudentName">Mi nombre (opcional)</label>
                            <div className={styles.storyNameRow}><input id="storyStudentName" maxLength={24} value={scoreName} onChange={event => setScoreName(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') saveScoreName();}} placeholder="Escribe tu nombre" /><button onClick={saveScoreName} type="button">Guardar</button></div>
                            <div className={styles.storyPointsTotal}>{storyPoints}<small>puntos</small></div>
                            <p>⭐ {starsAvailable(storyProgress)} estrellas disponibles para pistas · {Number(storyProgress.starsSpent) || 0} gastadas</p>
                            <p>En cada mundo puedes ganar hasta 100 puntos y 5 estrellas. ¡Resuelve rápido, con pocos bloques y pocos intentos para ganar más!</p>
                            {storyProgress.bonusPoints > 0 && <p>🎁 Incluye {storyProgress.bonusPoints} puntos extra por resolver los retos finales.</p>}
                            <div className={styles.storyScoreList}>{STORY_WORLDS.map(world => <div className={styles.storyScoreRow} key={world.id}><span>{world.id}. {world.title}</span><strong>{(storyProgress.levelScores || {})[world.id] || 0} pts · {(storyProgress.starsByLevel || {})[world.id] || 0}⭐</strong><small>{(storyProgress.attemptsByLevel || {})[world.id] || 0} intentos</small></div>)}</div>
                            <button className={styles.storyPrimary} onClick={() => setStoryScreen('route')} type="button">Volver a los mundos</button>
                        </section>
                    </div>
                )}
                {hintsOpen && !isMobileLayout && mode === 'story' && storyScreen === 'mission' && (() => {
                    const world = STORY_WORLDS[storyLevel - 1];
                    const owned = storyProgress.hintsByLevel?.[world.id] || [];
                    const available = starsAvailable(storyProgress);
                    return (
                        <div className={styles.modalShade} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeStoryHints(); }}>
                            <section className={styles.hintModal} role="dialog" aria-modal="true" aria-labelledby="hintTitle">
                                <button className={styles.modalClose} type="button" onClick={closeStoryHints} aria-label="Cerrar">×</button>
                                <h2 id="hintTitle">⭐ Mis estrellas: {available}</h2>
                                <p>Cambia estrellas por pistas de verdad. Cada mundo tiene pistas más caras.</p>
                                <div className={styles.hintList}>
                                    {levelHints(world, getStoryChallenge(world.id, {}, basePath)).map(hint => {
                                        const bought = owned.includes(hint.id);
                                        const affordable = available >= hint.cost;
                                        return (
                                            <div className={`${styles.hintItem} ${bought ? styles.hintOwned : ''}`} key={hint.id}>
                                                <span className={styles.hintIcon} aria-hidden="true">{hint.icon}</span>
                                                <div className={styles.hintInfo}><strong>{hint.title}</strong><small>{bought ? 'Ya la tienes' : `Cuesta ${hint.cost} ⭐`}</small></div>
                                                <button type="button" disabled={bought || !affordable} onClick={() => buyStoryHint(hint)}>{bought ? '✓ Comprada' : affordable ? `Usar ${hint.cost} ⭐` : 'Faltan ⭐'}</button>
                                                {bought && <p className={styles.hintDetail}>{hint.detail}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className={styles.hintNote}>Ganas estrellas al completar mundos: más rápido, con menos bloques y menos intentos ganas más.</p>
                            </section>
                        </div>
                    );
                })()}
                {mapPickerOpen && mode === 'robot' && (
                    <div className={styles.modalShade} role="presentation" onMouseDown={event => {
                        if (event.target === event.currentTarget) setMapPickerOpen(false);
                    }}>
                        <section className={styles.mapModal} role="dialog" aria-modal="true" aria-labelledby="mapModalTitle">
                            <button className={styles.modalClose} type="button" onClick={() => setMapPickerOpen(false)} aria-label="Cerrar">×</button>
                            <h2 id="mapModalTitle">¿A dónde vamos?</h2>
                            <p>Elige un mundo para tu robot</p>
                            <div className={styles.mapCards}>
                                {[
                                    ['classroom', '🏫', 'Salón'],
                                    ['city', '🏙️', 'Ciudad'],
                                    ['garden', '🌳', 'Jardín']
                                ].map(([id, icon, label]) => (
                                    <button key={id} className={`${styles.mapCard} ${map === id ? styles.mapCardActive : ''}`} onClick={() => handleMapChange(id)} type="button" aria-pressed={map === id}>
                                        <span aria-hidden="true">{icon}</span><strong>{label}</strong>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
                {renameModalOpen && (
                    <div className={styles.renameShade} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setRenameModalOpen(false); }}>
                        <section className={styles.renameModal} role="dialog" aria-modal="true" aria-labelledby="renameProjectTitle">
                            <h2 id="renameProjectTitle">Cambiar nombre</h2>
                            <label htmlFor="renameProjectInput">Nombre del proyecto</label>
                            <input
                                autoFocus
                                id="renameProjectInput"
                                maxLength={30}
                                onChange={event => setRenameValue(event.target.value)}
                                onKeyDown={event => { if (event.key === 'Enter') saveProjectName(); if (event.key === 'Escape') setRenameModalOpen(false); }}
                                value={renameValue}
                            />
                            <div className={styles.renameActions}>
                                <button onClick={() => setRenameModalOpen(false)} type="button">Cancelar</button>
                                <button className={styles.renameSave} disabled={!renameValue.trim()} onClick={saveProjectName} type="button">Guardar</button>
                            </div>
                        </section>
                    </div>
                )}
            </section>
            {isMobileLayout && mobileStoryHome && (
                <section className={styles.mobileStoryHome} aria-label="Aventura STBlock Kids">
                    <div className={styles.mobileStoryScenery} aria-hidden="true">
                        <span className={styles.scenerySun} />
                        <span className={`${styles.sceneryCloud} ${styles.sceneryCloudA}`} />
                        <span className={`${styles.sceneryCloud} ${styles.sceneryCloudB}`} />
                        <span className={`${styles.sceneryStar} ${styles.sceneryStarA}`}>✦</span>
                        <span className={`${styles.sceneryStar} ${styles.sceneryStarB}`}>✦</span>
                        <span className={`${styles.sceneryStar} ${styles.sceneryStarC}`}>✦</span>
                        <span className={styles.sceneryBalloon}>🎈</span>
                        <span className={styles.sceneryHill} />
                    </div>
                    <div className={styles.mobileStoryLayout}>
                        <section className={styles.mobileStoryHero} aria-labelledby="mobileStoryTitle">
                            <div className={styles.mobileStoryBrand}><img src={logoUrl} alt="STBlock Kids" /><span>📖 HISTORIA</span></div>
                            <div className={styles.mobileStoryAdventureContent}>
                                <div className={styles.mobileStoryMascot} aria-hidden="true"><img src={resolveKidsUrl(`${basePath}static/kids/stblock-kids-character.svg`)} alt="" /></div>
                                {mobileStoryProjectExists && !mobileSavedStory ? (
                                    <div className={styles.mobileStoryLoading}><span>✨</span><strong>Buscando tu aventura guardada…</strong></div>
                                ) : mobileSavedStory ? (
                                    <>
                                        <h1 id="mobileStoryTitle">¡Hola{mobileSavedStory.playerName ? `, ${mobileSavedStory.playerName}` : ''}!</h1>
                                        <p className={styles.mobileStoryCurrentWorld}>{mobileCompletedWorlds >= 20 ? '¡Aventura completa!' : `Mundo ${mobileActiveWorld}`}</p>
                                        <div className={styles.mobileStoryProgressTrack} role="progressbar" aria-label="Progreso de la aventura" aria-valuemin="0" aria-valuemax="20" aria-valuenow={mobileCompletedWorlds}><span style={{width: `${Math.max(3, mobileCompletedWorlds / 20 * 100)}%`}} /></div>
                                        <p className={styles.mobileStoryProgressLabel}>{mobileCompletedWorlds} de 20</p>
                                        <div className={styles.mobileStoryStats}>
                                            <div><span>⭐</span><strong>{starsAvailable(mobileSavedStory)}</strong></div>
                                            <div><span>🏆</span><strong>{mobileStoryPoints}</strong></div>
                                        </div>
                                        <button className={styles.mobileStoryPrimary} onClick={resumeMobileStory} type="button">Continuar historia <span>➜</span></button>
                                    </>
                                ) : (
                                    <>
                                        <h1 id="mobileStoryTitle">El Faro del Cielo</h1>
                                        <p className={styles.mobileStoryDescription}>¡Ayuda a STB!</p>
                                        <button className={styles.mobileStoryPrimary} onClick={() => setMobileStoryNameOpen(true)} type="button">¡Empezar! <span>✨</span></button>
                                        <div className={styles.mobileStoryNewBadge}>🗺️ 20 mundos　⭐</div>
                                    </>
                                )}
                            </div>
                        </section>
                        <section className={styles.mobileStoryProjects} aria-labelledby="mobileProjectsTitle">
                            <div className={styles.mobileProjectsHeading}>
                                <span aria-hidden="true">🧩</span>
                                <div><p>MODO LIBRE</p><h2 id="mobileProjectsTitle">Mis proyectos</h2></div>
                            </div>
                            <div className={styles.mobileProjectsActions}>
                                <button className={styles.mobileProjectCreate} onClick={createMobileFreeProject} type="button"><span>✨</span><strong>Crear nuevo</strong></button>
                                <button className={styles.mobileProjectOpen} onClick={loadProjectFile} type="button"><span>📂</span><strong>Cargar archivo</strong></button>
                            </div>
                            <div className={styles.mobileSavedProjects} aria-label="Proyectos guardados">
                                {mobileFreeProjectsLoading ? <p>Buscando…</p> : mobileFreeProjects.length ? mobileFreeProjects.slice(0, 4).map((project, index) => (
                                    <div className={styles.mobileSavedProjectCard} key={project.id}>
                                        <button className={styles.mobileSavedProject} onClick={() => openMobileFreeProject(project.id)} type="button" aria-label={`Abrir ${project.name}`}>
                                            {project.thumbnail ? <img src={project.thumbnail} alt="" /> : <span>{['🎨', '🧩', '🚀', '🌈'][index % 4]}</span>}
                                            <strong>{project.name}</strong>
                                        </button>
                                        <button className={styles.mobileSavedProjectDelete} onClick={() => deleteMobileFreeProject(project)} type="button" aria-label={`Eliminar ${project.name}`} title={`Eliminar ${project.name}`}>×</button>
                                    </div>
                                )) : <div className={styles.mobileSavedProjectsEmpty}><span>🖍️</span><p>¡Crea tu primer proyecto!</p></div>}
                            </div>
                        </section>
                    </div>
                </section>
            )}
            {isMobileLayout && mobileStoryHome && mobileStoryNameOpen && (
                <div
                    className={styles.mobileStoryNameShade}
                    role="presentation"
                    onMouseDown={event => { if (event.target === event.currentTarget) setMobileStoryNameOpen(false); }}
                    onKeyDown={event => { if (event.key === 'Escape') setMobileStoryNameOpen(false); }}
                >
                    <form className={styles.mobileStoryNameModal} onSubmit={createMobileStory} role="dialog" aria-modal="true" aria-labelledby="mobileStoryNameTitle">
                        <button className={styles.mobileStoryNameClose} type="button" onClick={() => setMobileStoryNameOpen(false)} aria-label="Cerrar">×</button>
                        <span className={`${styles.mobileStoryNameSparkle} ${styles.mobileNameSparkleA}`} aria-hidden="true">⭐</span>
                        <span className={`${styles.mobileStoryNameSparkle} ${styles.mobileNameSparkleB}`} aria-hidden="true">✨</span>
                        <span className={`${styles.mobileStoryNameSparkle} ${styles.mobileNameSparkleC}`} aria-hidden="true">🌟</span>
                        <span className={styles.mobileStoryNameIcon} aria-hidden="true">🌟</span>
                        <p className={styles.mobileStoryNameEyebrow}>NUEVA AVENTURA</p>
                        <h2 id="mobileStoryNameTitle">¿Cómo te llamas?</h2>
                        <p className={styles.mobileStoryNameHint}>STB te saludará por tu nombre en cada mundo.</p>
                        <label className={styles.mobileStoryNameLabel} htmlFor="mobileStoryPlayerName">Tu nombre</label>
                        <input id="mobileStoryPlayerName" autoFocus maxLength={24} value={mobileStoryPlayerName} onChange={event => setMobileStoryPlayerName(event.target.value)} placeholder="Escribe tu nombre" enterkeyhint="done" />
                        <div className={styles.mobileStoryNameActions}>
                            <button type="button" onClick={() => setMobileStoryNameOpen(false)}>Cancelar</button>
                            <button className={styles.mobileStoryNameGo} type="submit" disabled={!mobileStoryPlayerName.trim()}>¡Vamos! <span aria-hidden="true">✨</span></button>
                        </div>
                    </form>
                </div>
            )}
            {isMobileLayout && mobileProjectToDelete && (
                <div
                    className={styles.mobileProjectDeleteShade}
                    role="presentation"
                    onMouseDown={event => { if (event.target === event.currentTarget) setMobileProjectToDelete(null); }}
                    onKeyDown={event => { if (event.key === 'Escape') setMobileProjectToDelete(null); }}
                >
                    <section className={styles.mobileProjectDeleteModal} role="alertdialog" aria-modal="true" aria-labelledby="mobileProjectDeleteTitle" aria-describedby="mobileProjectDeleteDescription">
                        <span className={styles.mobileProjectDeleteIcon} aria-hidden="true">🗑️</span>
                        <p>ELIMINAR PROYECTO</p>
                        <h2 id="mobileProjectDeleteTitle">¿Borrar “{mobileProjectToDelete.name}”?</h2>
                        <div id="mobileProjectDeleteDescription">Esta acción no se puede deshacer.</div>
                        <div className={styles.mobileProjectDeleteActions}>
                            <button autoFocus type="button" onClick={() => setMobileProjectToDelete(null)}>Cancelar</button>
                            <button type="button" onClick={confirmDeleteMobileFreeProject}>Sí, borrar</button>
                        </div>
                    </section>
                </div>
            )}
            {mode === 'story' && storyScreen === 'mission' && !isMobileLayout && (
                <div className={styles.storyMissionBar}>
                    <div className={styles.storyMissionGoal}><span>🧭 Mundo {storyLevel} · {STORY_WORLDS[storyLevel - 1].chapter}</span><strong>{STORY_WORLDS[storyLevel - 1].lesson}</strong><small>{STORY_WORLDS[storyLevel - 1].objective}</small></div>
                    <div className={styles.storyMissionActions}><div className={styles.storyMissionWallet} aria-label="Mis monedas y puntos"><span title="Monedas disponibles">⭐ {starsAvailable(storyProgress)}</span><span title="Puntos totales">🏆 {storyPoints}</span></div><button onClick={openStoryHints} type="button">🎁 Pistas</button><button onClick={showStoryHelp} type="button">💡 Consejo</button>{Array.isArray(STORY_WORLDS[storyLevel - 1].guide) && <button onClick={replayStoryGuide} type="button">🦉 Guía</button>}<button onClick={() => speakStory(STORY_WORLDS[storyLevel - 1].story)} type="button">🔊 Escuchar</button><button onClick={openStoryMap} type="button">🗺️ Mapa</button></div>
                    <p role="status">{storyRunMessage}</p>
                </div>
            )}
            {isMobileLayout && mode === 'story' && storyScreen === 'mission' && (() => {
                // Phones keep hints and listening controls in a compact window docked
                // to the left. It stays short enough to leave the block categories
                // visible and can be folded down to its title with the chevron.
                const world = STORY_WORLDS[storyLevel - 1];
                const owned = storyProgress.hintsByLevel?.[world.id] || [];
                const available = starsAvailable(storyProgress);
                return (
                    <aside className={`${styles.storyHintPanel} ${storyHintCollapsed ? styles.storyHintPanelCollapsed : ''}`} aria-label="Pistas de la misión">
                        <header className={styles.storyHintPanelHead}>
                            <strong>🧭 Mundo {world.id} · {world.chapter}</strong>
                            <small>{world.lesson}</small>
                            <button
                                className={styles.storyHintPanelToggle}
                                type="button"
                                aria-expanded={!storyHintCollapsed}
                                aria-label={storyHintCollapsed ? 'Mostrar consejos y controles' : 'Ocultar consejos y controles'}
                                onClick={() => setStoryHintCollapsed(value => !value)}
                            >
                                <span aria-hidden="true">{storyHintCollapsed ? '▾' : '▴'}</span>
                            </button>
                            <div className={styles.storyHintPanelWallet} aria-label="Mis monedas y puntos"><span title="Estrellas disponibles">⭐ {available}</span><span title="Puntos totales">🏆 {storyPoints}</span></div>
                        </header>
                        <div className={styles.storyHintPanelActions}>
                            <button onClick={() => speakStory(world.story)} type="button"><span aria-hidden="true">🔊</span>Escuchar</button>
                            <button onClick={showStoryHelp} type="button"><span aria-hidden="true">💡</span>Consejo</button>
                            {Array.isArray(world.guide) && <button onClick={replayStoryGuide} type="button"><span aria-hidden="true">🦉</span>Guía</button>}
                            <button onClick={openStoryMap} type="button"><span aria-hidden="true">🗺️</span>Mapa</button>
                        </div>
                        {storyRunMessage && <p className={styles.storyHintPanelStatus} role="status">{storyRunMessage}</p>}
                        <div className={styles.storyHintPanelList}>
                            {levelHints(world, getStoryChallenge(world.id, {}, basePath)).map(hint => {
                                const bought = owned.includes(hint.id);
                                const affordable = available >= hint.cost;
                                return (
                                    <div className={`${styles.storyHintPanelItem} ${bought ? styles.storyHintPanelItemOwned : ''}`} key={hint.id}>
                                        <span className={styles.storyHintPanelItemIcon} aria-hidden="true">{hint.icon}</span>
                                        <div className={styles.storyHintPanelItemInfo}><strong>{hint.title}</strong><small>{bought ? 'Ya la tienes' : `Cuesta ${hint.cost} ⭐`}</small></div>
                                        <button type="button" disabled={bought || !affordable} onClick={() => buyStoryHint(hint)}>{bought ? '✓ Comprada' : affordable ? `Usar ${hint.cost} ⭐` : 'Faltan ⭐'}</button>
                                        {bought && <p className={styles.storyHintPanelItemDetail}>{hint.detail}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                );
            })()}
            {rightActionRoot && createPortal(
                <div className="stblock-kids-react-actions" aria-label="Acciones STBlock Kids">
                    {mode === 'story' && storyScreen !== 'mission' && (
                        <button className="stblock-kids-side-button stblock-kids-story-button" onClick={openStoryLibrary} type="button" aria-label="Historias">
                            <span aria-hidden="true">📖</span><span>Historias</span>
                        </button>
                    )}
                    {mode === 'robot' && (
                        <>
                            <button className="stblock-kids-side-button stblock-kids-world-button" onClick={() => setMapPickerOpen(true)} type="button" aria-label="Cambiar mundo">
                                <span aria-hidden="true">🌍</span><span>Mundos</span>
                            </button>
                            <button className={`stblock-kids-side-button stblock-kids-connect-button ${bluetoothConnected ? 'is-connected' : 'is-disconnected'}`} onClick={onConnectRobot} type="button" aria-label={connectedLabel} aria-pressed={bluetoothConnected}>
                                <span aria-hidden="true">{bluetoothConnected ? '🤖' : '🔵'}</span><span>{bluetoothConnected ? 'Conectado' : 'Conectar'}</span>
                            </button>
                        </>
                    )}
                </div>,
                rightActionRoot
            )}
            {bonusChallenge && createPortal(
                <div className={styles.mathShade} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeBonusChallenge(); }}>
                    <section className={`${styles.mathModal} ${bonusFeedback === 'wrong' ? styles.mathShake : ''}`} role="dialog" aria-modal="true" aria-labelledby="bonusTitle">
                        <button className={styles.modalClose} type="button" onClick={closeBonusChallenge} aria-label="Cerrar">×</button>
                        <p className={styles.mathEyebrow}>{bonusChallenge.kind === 'letters' ? '🔤 ¡Reto de letras!' : bonusChallenge.kind === 'numbers' ? '🔢 ¡Reto de números!' : '🧮 ¡Reto de operaciones!'}</p>
                        <h2 id="bonusTitle" className={styles.mathTitle}>{bonusChallenge.prompt}</h2>
                        {bonusChallenge.kind === 'math' ? (
                            <div className={styles.mathObjects} aria-hidden="true">
                                <span className={styles.mathGroup}>{Array.from({length: bonusChallenge.a}).map((_, index) => <span key={index} className={styles.mathBulb} style={{animationDelay: `${index * 0.08}s`}}>{bonusChallenge.emoji}</span>)}</span>
                                <span className={styles.mathOperator}>{bonusChallenge.op}</span>
                                <span className={styles.mathGroup}>{Array.from({length: bonusChallenge.b}).map((_, index) => <span key={index} className={styles.mathBulb} style={{animationDelay: `${(index + bonusChallenge.a) * 0.08}s`}}>{bonusChallenge.emoji}</span>)}</span>
                            </div>
                        ) : (
                            <div className={styles.bonusSequence} aria-hidden="true">
                                {bonusChallenge.tokens.map((token, index) => <span key={index} className={`${styles.bonusToken} ${token === '?' ? styles.bonusTokenBlank : ''}`}>{token}</span>)}
                            </div>
                        )}
                        <div className={styles.mathOptions}>
                            {bonusChallenge.options.map(option => <button key={option} className={`${styles.mathOption} ${bonusFeedback !== '' && option === bonusChallenge.answer ? styles.bonusOptionCorrect : ''}`} type="button" disabled={bonusFeedback !== ''} onClick={() => answerBonus(option)}>{option}</button>)}
                        </div>
                        {bonusFeedback === 'correct' && <p className={styles.mathFeedbackOk} role="status">¡Muy bien! 🎉 +{BONUS_POINTS} puntos</p>}
                        {bonusFeedback === 'wrong' && <p className={styles.mathFeedbackNo} role="status">{bonusChallenge.solutionText} ¡Vamos al siguiente mundo!</p>}
                        {bonusFeedback === '' ? (
                            <div className={styles.bonusActions}><button className={styles.bonusSkip} type="button" onClick={skipBonusChallenge}>Saltar reto ➜</button></div>
                        ) : (
                            <div className={styles.bonusActions}><button className={styles.bonusContinue} type="button" onClick={() => finishBonusChallenge(bonusFeedback === 'correct' ? BONUS_POINTS : 0)}>Continuar ➜</button></div>
                        )}
                    </section>
                </div>,
                document.body
            )}
            {isMobileLayout && phonePortrait && (
                <div className={styles.rotateLandscapePrompt} role="dialog" aria-modal="true" aria-labelledby="rotateLandscapeTitle">
                    <div className={styles.rotateLandscapeCard}>
                        <span className={styles.rotateLandscapeIcon} aria-hidden="true">📱</span>
                        <h2 id="rotateLandscapeTitle">¡Gira tu teléfono!</h2>
                        <p>Jugamos mejor con la pantalla acostada.</p>
                        <button onClick={requestLandscapeMode} type="button"><span aria-hidden="true">↻</span> Jugar acostado</button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ScratchJrKidsWorkspace;
