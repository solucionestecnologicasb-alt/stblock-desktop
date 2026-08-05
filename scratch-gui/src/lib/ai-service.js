import AI_KNOWLEDGE from './ai-knowledge';
import {getCompactPromptLines, getDetailedBlockInfo} from './ai-block-library';
import {TrainingEngine, generateOptimizedPrompt} from './ai-training-engine';

// Pollinations.ai rechaza (403 "Missing Turnstile token") las peticiones de navegador
// cuyo hostname de Origin es exactamente `localhost`. En ese caso enrutamos por el
// dev server de webpack (proxy /pollinations que elimina Origin/Referer). En Tauri
// produccion (origin http://tauri.localhost) y en la web desplegada no hace falta.
function isLocalhostOrigin() {
    return typeof window !== 'undefined' &&
        window.location &&
        window.location.hostname === 'localhost';
}

var PROVIDER_CONFIG = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        format: 'openai'
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        format: 'openai'
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        format: 'openai'
    },
    gemini: {
        url: 'https://generativelanguage.googleapis.com/v1beta/models/',
        format: 'gemini'
    },
    opencodezen: {
        url: '/zen/v1/chat/completions',
        format: 'openai'
    },
    // Proveedor público gratuito: no requiere API key (Pollinations.ai anonymous tier).
    // Cualquier valor en el header Authorization es aceptado; omitimos el header si no hay clave.
    // noTemperature: la capa anónima/gratuita de Pollinations devuelve 402 "Payment Required"
    // si el body incluye el campo `temperature` (lo rechaza). El resto de proveedores lo aceptan.
    pollinations: {
        url: isLocalhostOrigin() ? '/pollinations/openai' : 'https://text.pollinations.ai/openai',
        format: 'openai',
        noTemperature: true
    }
};

// Cross-platform storage helper (works in both web browser and Tauri desktop)
var _memoryStorage = {};

function isTauriEnvironment() {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

function getStorageItem(key) {
    if (typeof window === 'undefined') return null;

    // Try localStorage first (works in both browser and Tauri webview)
    try {
        if (window.localStorage) {
            return window.localStorage.getItem(key);
        }
    } catch (e) {
        // localStorage might be restricted in some contexts
    }

    // Fallback to memory storage
    return _memoryStorage[key] || null;
}

function setStorageItem(key, value) {
    if (typeof window === 'undefined') return;

    // Try localStorage first
    try {
        if (window.localStorage) {
            window.localStorage.setItem(key, value);
            return;
        }
    } catch (e) {
        // localStorage might be restricted
    }

    // Fallback to memory storage
    _memoryStorage[key] = value;
}

function isTrainingEnabled() {
    if (typeof window === 'undefined') return false;
    return getStorageItem('ai_training_enabled') !== 'false';
}

function buildTrainingPrompt(examples) {
    if (!examples || examples.length === 0) return '';
    if (!isTrainingEnabled()) return '';
    return generateOptimizedPrompt(examples);
}

function buildMentorSystemPrompt(sessionSummary) {
    var lines = [
        'Eres un mentor de Scratch. Tu rol es ENSEÑAR y GUIAR al usuario, NO hacer el trabajo por él.',
        '',
        'REGLAS:',
        '1. NUNCA escribas código, bloques, JSON ni respuestas en formato estructurado.',
        '2. NUNCA incluyas @bloques ni descriptores de bloques en tu respuesta.',
        '3. Explicá los CONCEPTOS: qué hace cada bloque, cómo se combinan, la lógica detrás.',
        '4. Dá pistas y sugerencias, pero dejá que el usuario descubra cómo implementarlo.',
        '5. Si el usuario pide un proyecto completo, guialo paso a paso sin darle el código.',
        '6. Respondé SIEMPRE en español, claro y didáctico.',
        '7. Usá analogías y ejemplos del mundo real para explicar conceptos.',
        '8. Si el usuario se equivoca, señalá el error y preguntale cómo lo solucionaría.',
        '',
        'BLOQUES DISPONIBLES (solo para tu referencia):',
    ];

    var blockRef = getCompactPromptLines();
    for (var bri = 0; bri < blockRef.length; bri++) {
        lines.push(blockRef[bri]);
    }

    lines.push('');
    lines.push('Áreas:');
    for (var fi = 0; fi < AI_KNOWLEDGE.features.length; fi++) {
        var feat = AI_KNOWLEDGE.features[fi];
        lines.push(feat.area + ': ' + feat.items.length + ' funcionalidades');
    }
    lines.push('Pestañas: ' + AI_KNOWLEDGE.tabs.map(function (t) { return t.label; }).join(', '));

    if (sessionSummary) {
        lines.push('');
        lines.push('Historial: ' + sessionSummary);
    }

    return lines.join('\n');
}

var _appPromptCacheByMode = {};

// ─── Prompts específicos por modo ─────────────────────────────────────────

function buildPythonModePrompt() {
    var lines = [];
    lines.push('=== MODO PROGRAMACIÓN (Python) ===');
    lines.push('Generá código Python en el campo "pythonCode". Se ejecuta con Pyodide en el navegador.');
    lines.push('');
    lines.push('API DE STBLOCK DISPONIBLE (objetos globales ya definidos, no hace falta importarlos):');
    lines.push('- sprite: controla el sprite/objeto seleccionado.');
    lines.push('  Métodos: mover(pasos), girar_derecha(grados), girar_izquierda(grados), ir_a_xy(x, y), ir_a(destino), deslizar_a_xy(x, y, segundos), apuntar_en_direccion(dir), apuntar_hacia(objetivo), cambiar_x(dx), cambiar_y(dy), fijar_x(x), fijar_y(y), rebotar_si_toca_borde(), decir(mensaje, segundos=None), pensar(mensaje, segundos=None), cambiar_disfraz(nombre), siguiente_disfraz(), cambiar_tamaño(cambio), fijar_tamaño(tamaño), mostrar(), esconder(), cambiar_efecto(efecto, valor), quitar_efectos(), tocando(objetivo), tocando_color(color), distancia_a(objetivo), saltar(fuerza), aplicar_gravedad(), en_suelo(), en_aire(), fijar_salud(valor), cambiar_salud(cantidad), esta_vivo(), esta_muerto().');
    lines.push('  Propiedades: sprite.x, sprite.y, sprite.direccion, sprite.tamaño, sprite.salud, sprite.velocidad_x, sprite.velocidad_y.');
    lines.push('- escenario: escenario.ancho, escenario.alto (también permite cambiar fondos).');
    lines.push('- sonido: sonido.reproducir(nombre), sonido.reproducir_y_esperar(nombre), sonido.detener_todos().');
    lines.push('- raton: raton.x, raton.y, raton.presionado.');
    lines.push('- fisica: control de gravedad/fricción del mundo (opcional).');
    lines.push('- camara: camara.seguir(sprite, suavidad=0.1).');
    lines.push('- estado: máquina de estados. estado.cambiar(nombre), estado.actual, estado.anterior, estado.es(nombre).');
    lines.push('- debug: debug.log(valor), debug.advertencia(valor), debug.error(valor).');
    lines.push('- pruebas: pruebas.reiniciar(), pruebas.verificar(condicion, nombre), pruebas.reporte().');
    lines.push('- ia: utilidades de IA (si se habilitan).');
    lines.push('');
    lines.push('Funciones globales:');
    lines.push('- esperar(segundos): pausa aproximada. En Pyodide no bloquea estrictamente; usalo en bucles cortos combinado con delta_tiempo().');
    lines.push('- delta_tiempo(): segundos transcurridos desde el último frame.');
    lines.push('- aleatorio(minimo, maximo): número aleatorio entre min y max.');
    lines.push('- preguntar(mensaje): pregunta al usuario y devuelve la respuesta como texto.');
    lines.push('- tecla_presionada(tecla): True/False si una tecla está presionada.');
    lines.push('- fps(): cuadros por segundo actuales.');
    lines.push('');
    lines.push('REGLAS:');
    lines.push('1. Usá SIEMPRE la API de STBlock (sprite, escenario, sonido, etc.). NO importes librerías externas (no hay internet en Pyodide).');
    lines.push('2. Para movimiento continuo usá bucles con delta_tiempo() o esperar() (ej: while True: sprite.mover(5); esperar(0.05)).');
    lines.push('3. NO uses time.sleep (bloquea el navegador). Usá esperar() o delta_tiempo().');
    lines.push('4. Las coordenadas van de -240 a 240 en X y de -180 a 180 en Y (como Scratch).');
    lines.push('5. El código debe ser autónomo: arranca en la primera línea (no hace falta definir main()).');
    lines.push('6. Si el código tiene un bucle infinito, usá un contador o una condición de salida razonable.');
    lines.push('');
    lines.push('CONTRATO: respondé con {"mode":"python","pythonCode":"<tu código>","explanation":"..."}.');
    lines.push('');
    lines.push('EJEMPLO (sprite que se mueve en círculos):');
    lines.push('while True:');
    lines.push('    sprite.mover(5)');
    lines.push('    sprite.girar_derecha(5)');
    lines.push('    esperar(0.05)');
    return lines;
}

function buildDeviceModePrompt() {
    var lines = [];
    lines.push('=== MODO ELECTRÓNICA (Arduino C++ + Gearbot/Velxio) ===');
    lines.push('Generá código Arduino C++ en el campo "arduinoCode". Se compila/ejecuta en el modo Electrónica y en los simuladores embebidos (stblock-execute).');
    lines.push('');
    lines.push('REGLAS C++ ARDUINO (Arduino UNO):');
    lines.push('- Todo programa tiene void setup() y void loop().');
    lines.push('- pinMode(pin, OUTPUT/INPUT/INPUT_PULLUP) se llama en setup(); digitalWrite(pin, HIGH/LOW); digitalRead(pin); analogWrite(pin, valor) para PWM (0-255); analogRead(pin) para pines A0-A5 (0-1023); delay(ms); tone(pin, frecuencia); Serial.begin(9600) y Serial.print/println.');
    lines.push('- Pines UNO: digitales 2-13; analógicos A0-A5; PWM: 3, 5, 6, 9, 10, 11.');
    lines.push('- Usá delay() con moderación (bloquea el programa).');
    lines.push('');
    lines.push('=== GEARBOT (robot simulador embebido en static/velxio/gears/index.html) ===');
    lines.push('- Es un robot "singleFollower" programado en C++ (el simulador lo traduce a Python vía Skulpt).');
    lines.push('- Motores: motor A y motor B (base de tracción). El electroimán va en el puerto C.');
    lines.push('- Sensores en puertos 1-4 (según el mundo cargado).');
    lines.push('- Vocabulario de bloques del robot (equivalentes a los bloques del simulador):');
    lines.push('  * move_steering(motores, direccion, potencia, distancia): avanzar/girar con steering.');
    lines.push('  * run_motor(motor, potencia, segundos) / run_motor_for(motor, potencia, grados).');
    lines.push('  * stop_motor(motor).');
    lines.push('  * color_sensor(puerto): color detectado.');
    lines.push('  * ultrasonic_sensor(puerto): distancia en cm.');
    lines.push('  * gyro_sensor(puerto): ángulo de giro.');
    lines.push('  * button_state(puerto): True/False si el botón está presionado.');
    lines.push('  * beep(frecuencia, duracion_ms).');
    lines.push('  * radio_* : enviar/recibir mensajes entre robots.');
    lines.push('- Ejemplo "robot que esquiva obstáculos": leé ultrasonic_sensor en el puerto delantero y usá move_steering para girar cuando la distancia es corta.');
    lines.push('');
    lines.push('=== VELXIO (simulador de circuitos embebido) ===');
    lines.push('- Recibe el mismo C++ vía stblock-execute.');
    lines.push('- Componentes disponibles: LED, resistencia, botón, buzzer, servo, sensores.');
    lines.push('- Reglas de pines y Serial iguales a Arduino UNO (ver arriba).');
    lines.push('- El simulador muestra la salida Serial en su consola.');
    lines.push('');
    lines.push('CONTRATO: respondé con {"mode":"device","arduinoCode":"<código C++>","explanation":"..."}.');
    lines.push('');
    lines.push('EJEMPLO (LED parpadeante):');
    lines.push('void setup() { pinMode(13, OUTPUT); }');
    lines.push('void loop() { digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW); delay(1000); }');
    return lines;
}

function build3dModePrompt() {
    var lines = [];
    lines.push('=== MODO DISEÑO 3D (DSL procedural para SketchForge) ===');
    lines.push('Generá un modelo 3D en el campo "script3D" usando el siguiente DSL seguro interpretado (el host lo interpreta, nunca usa eval).');
    lines.push('');
    lines.push('GRAMÁTICA DEL DSL:');
    lines.push('- clear=true | clear=false   (opcional, primera línea; true reemplaza la escena, false agrega al modelo actual)');
    lines.push('- add <forma>(param=valor, ...)   // agrega una forma');
    lines.push('- repeat(<expresión>) as i { ... }  // repite el bloque con el índice i (anidables, sombrean)');
    lines.push('- Comentarios con // hasta fin de línea. Saltos de línea separan statements.');
    lines.push('- Expresiones aritméticas: + - * / ( ) con números y el índice i.');
    lines.push('- Funciones: sin(x), cos(x) (en grados), sqrt(x), floor(x).');
    lines.push('');
    lines.push('FORMAS Y PARÁMETROS (además de los comunes x, z, elevation, rotation, rotationX, rotationZ, hole, color, name):');
    lines.push('- box(width, depth, height, radius, steps, bevel)');
    lines.push('- cylinder(radius, height, sides, bevel, segments)');
    lines.push('- sphere(radius, steps)');
    lines.push('- cone(radius, height, topRadius, baseRadius, sides)');
    lines.push('- pyramid(width, depth, height, sides)');
    lines.push('- wedge(width, depth, height)');
    lines.push('- roundRoof(width, depth, height, sides)');
    lines.push('- halfSphere(radius, steps)');
    lines.push('- torus(radius, sides)');
    lines.push('- tube(radius, height, sides, bevel)');
    lines.push('- gear(radius, height, teeth, toothSize, centerHoleSize, sides)');
    lines.push('- text(width, depth, height, text="...", font="...")');
    lines.push('');
    lines.push('REGLAS DE COORDENADAS:');
    lines.push('- El plano del suelo es X/Z. x y z en unidades de la rejilla (default 0).');
    lines.push('- elevation es la altura sobre el suelo.');
    lines.push('- width = tamaño en X, depth = tamaño en Z, height = tamaño en Y.');
    lines.push('- rotation, rotationX y rotationZ en grados.');
    lines.push('- color acepta "#rrggbb".');
    lines.push('');
    lines.push('LÍMITES:');
    lines.push('- Usá repeat() para patrones. Mantenete cerca de 50 formas (el host limita a 500).');
    lines.push('- repeat máximo 200 iteraciones; anidamiento máximo 4 niveles.');
    lines.push('');
    lines.push('CONTRATO: respondé con {"mode":"3d","script3D":"clear=true\\nadd box(...)\\nrepeat(4) as i { ... }","explanation":"..."}.');
    lines.push('');
    lines.push('EJEMPLO (torre de 5 cajas + anillo de 12 columnas):');
    lines.push('clear=true');
    lines.push('repeat(5) as i { add box(x=0, z=0, elevation=i*25, width=30, depth=30, height=25) }');
    lines.push('repeat(12) as i { add cylinder(x=cos(i*30)*80, z=sin(i*30)*80, radius=4, height=40, color="#0098c7") }');
    return lines;
}

function buildAppSystemPrompt(trainingExamples, sessionSummary, activeMode) {
    activeMode = activeMode || 'blocks';
    if (!trainingExamples && !sessionSummary && _appPromptCacheByMode[activeMode]) return _appPromptCacheByMode[activeMode];
    var lines = [
        'Eres asistente STBlock. PODÉS crear/editar bloques reales y código según el modo activo: bloques Scratch (modo Juego), código Python (modo Programación), código Arduino C++ (modo Electrónica + Gearbot/Velxio) o modelos 3D procedurales (modo Diseño 3D).',
        '',
        'CAPACIDADES:',
        '- Crear bloques de Scratch (movimiento, apariencia, sonido, eventos, control, sensores, operadores, variables, lápiz, música)',
        '- Crear bloques de Arduino (digitalWrite, digitalRead, analogWrite, analogRead, servo, serial, etc.), ESP32 (WiFi, touch, DAC, etc.) y Micro:bit (matriz LED, botones, acelerómetro, etc.)',
        '- Generar código Python para el panel de Programación (se ejecuta con Pyodide)',
        '- Generar código Arduino C++ para el modo Electrónica y los simuladores Gearbot/Velxio',
        '- Generar modelos 3D procedurales para SketchForge (modo Diseño 3D)',
        '',
        'DEBES responder SIEMPRE en formato JSON con la siguiente estructura. Solo el campo correspondiente al MODO ACTIVO va lleno; los demás van vacíos u omitidos:',
        '{',
        '  "explanation": "Explicación en español para mostrar en el chat sobre lo que genera o la respuesta a la pregunta del usuario.",',
        '  "mode": "blocks | python | device | 3d",',
        '  "clearExisting": true o false (modo blocks/3d: si true reemplaza el contenido actual; si false agrega),',
        '  "scripts": [ ... bloques Scratch, solo modo blocks ... ],',
        '  "pythonCode": "... código Python, solo modo python ...",',
        '  "arduinoCode": "... código C++ Arduino, solo modo device ...",',
        '  "script3D": "clear=true\\nadd box(...)\\nrepeat(4) as i { ... }", solo modo 3d',
        '}',
        '',
        'REGLAS GENERALES:',
        '1. Respondé SIEMPRE en español en "explanation".',
        '2. Asegurate de retornar un JSON válido.',
        '3. El campo "mode" debe coincidir con el MODO ACTIVO indicado en el mensaje del usuario ([MODO ACTIVO: X]).',
        '4. Si solo respondés una pregunta de chat sin pedir código, dejá los campos de código vacíos y poné la respuesta en "explanation".',
        '5. NUNCA inventes parámetros, opcodes o funciones que no estén documentadas en la sección del modo activo.',
        ''
    ];

    if (activeMode === 'python') {
        var pythonPrompt = buildPythonModePrompt();
        for (var pi = 0; pi < pythonPrompt.length; pi++) lines.push(pythonPrompt[pi]);
    } else if (activeMode === 'device') {
        var devicePrompt = buildDeviceModePrompt();
        for (var di = 0; di < devicePrompt.length; di++) lines.push(devicePrompt[di]);
    } else if (activeMode === '3d') {
        var d3dPrompt = build3dModePrompt();
        for (var d3i = 0; d3i < d3dPrompt.length; d3i++) lines.push(d3dPrompt[d3i]);
    } else {
        // ── modo blocks: contrato + ejemplos + referencia de bloques ──
        lines.push('CONTRATO DE BLOQUES (modo blocks):',
        '"scripts" es un array de scripts, cada uno con "blocks" (array de bloques). Estructura de un bloque:',
        '{',
        '  "opcode": "opcode_del_bloque",',
        '  "fields": { "NOMBRE_CAMPO": "valor" }, // opcional, para variables, listas, teclas o disfraces',
        '  "inputs": {',
        '    "NOMBRE_ENTRADA": 10 o "texto" o [ ... array de bloques (para substack/bucles/condiciones) ... ] o { "opcode": "nested_reporter_opcode", "inputs": { ... }, "fields": { ... } }',
        '  }',
        '}',
        '',
        'EJEMPLO DE JSON DE RETORNO (calculadora):',
        '{',
        '  "explanation": "Una calculadora sencilla que suma dos variables.",',
        '  "clearExisting": true,',
        '  "scripts": [',
        '    {',
        '      "blocks": [',
        '        { "opcode": "event_whenflagclicked" },',
        '        {',
        '          "opcode": "data_setvariableto",',
        '          "fields": { "VARIABLE": "resultado" },',
        '          "inputs": {',
        '            "VALUE": {',
        '              "opcode": "operator_add",',
        '              "inputs": {',
        '                "NUM1": { "opcode": "data_variable", "fields": { "VARIABLE": "num1" } },',
        '                "NUM2": { "opcode": "data_variable", "fields": { "VARIABLE": "num2" } }',
        '              }',
        '            }',
        '          }',
        '        }',
        '      ]',
        '    }',
        '  ]',
        '}',
        '',
        'EJEMPLO DE BUCLE (repetir 10 veces):',
        '{',
        '  "explanation": "Mueve el gato 10 veces",',
        '  "clearExisting": false,',
        '  "scripts": [',
        '    {',
        '      "blocks": [',
        '        { "opcode": "event_whenflagclicked" },',
        '        {',
        '          "opcode": "control_repeat",',
        '          "inputs": {',
        '            "TIMES": 10,',
        '            "SUBSTACK": [',
        '              { "opcode": "motion_movesteps", "inputs": { "STEPS": 15 } }',
        '            ]',
        '          }',
        '        }',
        '      ]',
        '    }',
        '  ]',
        '}',
        '',
        'REGLAS IMPORTANTES DE STBlock/Bloques:',
        '1. Los scripts DEBEN comenzar con un bloque "hat" (event_whenflagclicked, event_whenkeypressed, control_start_as_clone, etc.).',
        '2. Los bloques de control repetitivos (control_forever, control_repeat, control_if, control_if_else) usan SUBSTACK como un array de bloques adentro de inputs. control_if_else usa SUBSTACK y SUBSTACK2.',
        '3. Las entradas (inputs) como STEPS, DURATION, X, Y, MESSAGE se pasan en el objeto inputs.',
        '4. Los campos de selección (fields) como VARIABLE, LIST, KEY_OPTION, COSTUME, SOUND_MENU, FRONT_BACK se pasan en el objeto fields.',
        '5. Los bloques reporteros (ej: data_variable, sensing_answer, operator_add) se anidan dentro de la propiedad del input correspondiente como un objeto con su propio opcode, inputs y fields.',
        '6. Si solo respondes una pregunta de chat sin bloques, responde con "scripts": [] y pon la respuesta en "explanation".',
        '7. Asegúrate de retornar un JSON válido.',
        '',
        'REGLAS CRÍTICAS DE COMPARADORES Y OPERADORES:',
        '- En STBlock NO existen símbolos como +, -, *, /, <, >, =. Usá los bloques específicos: operator_add (suma), operator_subtract (resta), operator_multiply (multiplicación), operator_divide (división), operator_gt (>), operator_lt (<), operator_equals (=).',
        '- Las comparaciones lógicas usan los bloques booleanos operator_gt, operator_lt, operator_equals dentro de CONDITION (control_if, control_repeat_until, control_wait_until).',
        '- operator_and, operator_or, operator_not toman operandos booleanos (OPERAND1, OPERAND2 o OPERAND) — no números.',
        '- operator_join (unir), operator_letter_of (letra de), operator_length (longitud) trabajan con STRING (texto).',
        '- operator_mod (módulo/resto) y operator_round (redondear) toman un solo NUM.',
        '- operator_random toma FROM (desde) y TO (hasta) como números.',
        '- NUNCA pongas un símbolo (+, -, <, >, =) como valor de un input. Siempre usá el bloque opcode correspondiente con sus inputs.',
        '',
        'REGLAS DE BLOQUES DE DISPOSITIVOS (Arduino, ESP32, Micro:bit):',
        '- Los bloques de dispositivos usan prefijos: arduino_, esp32_, microbit_',
        '- PUEDES mezclar bloques de Scratch con bloques de Arduino en el MISMO script.',
        '- Ejemplo: Un botón físico (arduino_digitalRead) puede mover al gato (motion_movesteps).',
        '- Para Arduino, los scripts pueden empezar con event_whenflagclicked o arduino_whenArduinoBegin.',
        '- Los pines digitales típicos son: 2-13. Los analógicos: A0-A5.',
        '- Los pines PWM en Arduino UNO son: 3, 5, 6, 9, 10, 11.',
        '- arduino_setPinMode debe usarse antes de leer/escribir un pin. Modos: INPUT, OUTPUT, INPUT_PULLUP.',
        '- Para leer un botón físico: configurá el pin como INPUT_PULLUP, luego usá arduino_digitalRead.',
        '- INPUT_PULLUP invierte la lógica: botón presionado = false, suelto = true.',
        '',
        'EJEMPLO ARDUINO - LED que parpadea:',
        '{ "opcode": "arduino_whenArduinoBegin" },',
        '{ "opcode": "arduino_setPinMode", "inputs": { "PIN": 13 }, "fields": { "MODE": "OUTPUT" } },',
        '{ "opcode": "control_forever", "inputs": { "SUBSTACK": [',
        '  { "opcode": "arduino_digitalWrite", "inputs": { "PIN": 13, "LEVEL": 1 } },',
        '  { "opcode": "control_wait", "inputs": { "DURATION": 1 } },',
        '  { "opcode": "arduino_digitalWrite", "inputs": { "PIN": 13, "LEVEL": 0 } },',
        '  { "opcode": "control_wait", "inputs": { "DURATION": 1 } }',
        '] } }',
        '',
        'EJEMPLO MIXTO - Botón físico mueve al gato:',
        '{ "opcode": "event_whenflagclicked" },',
        '{ "opcode": "arduino_setPinMode", "inputs": { "PIN": 2 }, "fields": { "MODE": "INPUT_PULLUP" } },',
        '{ "opcode": "control_forever", "inputs": { "SUBSTACK": [',
        '  { "opcode": "control_if", "inputs": {',
        '    "CONDITION": { "opcode": "operator_not", "inputs": { "OPERAND": { "opcode": "arduino_digitalRead", "inputs": { "PIN": 2 } } } },',
        '    "SUBSTACK": [',
        '      { "opcode": "motion_movesteps", "inputs": { "STEPS": 10 } },',
        '      { "opcode": "looks_say", "inputs": { "MESSAGE": "¡Botón presionado!" } }',
        '    ]',
        '  } }',
        '] } }',
        '',
        'EJEMPLO - Sensor analógico controla tamaño del gato:',
        '{ "opcode": "event_whenflagclicked" },',
        '{ "opcode": "control_forever", "inputs": { "SUBSTACK": [',
        '  { "opcode": "looks_setsizeto", "inputs": { "SIZE": {',
        '    "opcode": "arduino_map", "inputs": { "VALUE": { "opcode": "arduino_analogRead", "inputs": { "PIN": "A0" } }, "FROMLOW": 0, "FROMHIGH": 1023, "TOLOW": 50, "TOHIGH": 200 }',
        '  } } }',
        '] } }',
        '',
        '=== BLOQUES DISPONIBLES ===',
        'Formato: opcode[tipo] desc (f:campo1) (v:entrada1) {st:substack}',
        'Tipos: h=hat s=stack c=c-block r=reporter b=boolean e=end',
        ''
        );

        // Inject compact block reference from library
        var blockRef = getCompactPromptLines();
        for (var bri = 0; bri < blockRef.length; bri++) {
            lines.push(blockRef[bri]);
        }

        lines.push('');
        lines.push('CÓMO EDITAR BLOQUES EXISTENTES:');
        lines.push('- El workspace actual está arriba (WORKSPACE ACTUAL).');
        lines.push('- Para MODIFICAR: responde con "clearExisting": true y provee el JSON de TODOS los bloques nuevos/modificados.');
        lines.push('- Para AGREGAR: responde con "clearExisting": false y el JSON del bloque nuevo.');
        lines.push('');

        lines.push('TIPS:');
        lines.push('- Todos los valores de variables o teclas se especifican en el objeto fields.');
        lines.push('- Los valores numéricos, lógicos o de texto se pasan en el objeto inputs.');
        lines.push('- Los bloques reporteros anidados se colocan como objetos con sus propiedades correspondientes.');
        lines.push('- Si dudás de un bloque, usá DETALLE:opcode y recibirás la info completa.');
        lines.push('');
        lines.push('TIPS ARDUINO:');
        lines.push('- Para proyectos Arduino puros, usá arduino_whenArduinoBegin como hat block.');
        lines.push('- Para proyectos mixtos Scratch+Arduino, usá event_whenflagclicked.');
        lines.push('- arduino_digitalRead devuelve booleano (true/false), NO un número.');
        lines.push('- arduino_analogRead devuelve número de 0 a 1023.');
        lines.push('- Usá arduino_map para convertir rangos (ej: sensor 0-1023 a posición -240 a 240).');
        lines.push('- Para botones con INPUT_PULLUP: presionado=false, suelto=true (lógica invertida).');
        lines.push('- Los pines de Arduino son números: 2,3,4...13 para digitales, "A0","A1"..."A5" para analógicos.');
    }

    lines.push('Áreas:');
    for (var fi = 0; fi < AI_KNOWLEDGE.features.length; fi++) {
        var feat = AI_KNOWLEDGE.features[fi];
        lines.push(feat.area + ': ' + feat.items.length + ' funcionalidades');
    }
    lines.push('Pestañas: ' + AI_KNOWLEDGE.tabs.map(function (t) { return t.label; }).join(', '));
    lines.push('Menús: Archivo | Configuración | Modo | Acerca de | AI');
    lines.push('Proveedores: ' + Object.keys(AI_KNOWLEDGE.aiSettings.providers).join(', '));

    if (sessionSummary) {
        lines.push('');
        lines.push('Historial: ' + sessionSummary);
    }

    if (trainingExamples && trainingExamples.length > 0) {
        lines.push(buildTrainingPrompt(trainingExamples));
    }

    if (!trainingExamples && !sessionSummary) {
        _appPromptCacheByMode[activeMode] = lines.join('\n');
    }
    return lines.join('\n');
}

function buildVerifyPrompt(userMsg, assistantResponse, knowledge) {
    var lines = [
        'Evaluá si la respuesta del asistente sobre Scratch GUI es correcta.',
        'REGLAS:',
        '- La respuesta debe ser CONSISTENTE con el conocimiento provisto abajo.',
        '- Si la respuesta explica cómo hacer algo con bloques (calculadora, juego, etc.) y usa bloques que SÍ existen en Scratch, es CORRECTA.',
        '- El conocimiento describe los bloques disponibles; la respuesta puede combinarlos creativamente.',
        '- Si la respuesta dice algo FALSO sobre Scratch o usa bloques que no existen, es INCORRECTA.',
        '- No marques INCORRECTO solo porque el tema (calculadora, juego) no esté explícitamente en el conocimiento.',
        '- Usá este formato exacto:',
        'RESULTADO: CORRECTO o INCORRECTO',
        'EXPLICACIÓN: (breve explicación)',
        'CORREGIDO: (solo si es INCORRECTO, escribí acá la versión corregida)',
        '',
        '=== CONOCIMIENTO ===',
        knowledge,
        '',
        '=== PREGUNTA DEL USUARIO ===',
        userMsg,
        '',
        '=== RESPUESTA DEL ASISTENTE A EVALUAR ===',
        assistantResponse
    ];
    return lines.join('\n');
}

function readBodySafe(res) {
    return res.text().then(function (text) {
        if (!text || !text.trim()) {
            return {ok: false, body: null, parseError: 'respuesta vacía'};
        }
        try {
            return {ok: true, body: JSON.parse(text)};
        } catch (e) {
            var preview = text.substring(0, 200).replace(/\n/g, ' ').trim();
            return {ok: false, body: null, parseError: 'no es JSON: "' + preview + '"'};
        }
    });
}

function callOpenAI(providerUrl, apiKey, model, messages, maxTokens, options) {
    var opts = options || {};
    var sendTemperature = opts.sendTemperature !== false;
    var retries = opts.retries;
    if (!maxTokens) maxTokens = 4096;
    if (retries === undefined) retries = 3;
    var delay = 1000;

    function attempt(remaining) {
        var headers = {
            'Content-Type': 'application/json'
        };
        // Solo enviar Authorization si hay clave (los proveedores públicos gratuitos
        // como Pollinations funcionan sin clave o aceptan cualquier valor).
        if (apiKey) {
            headers['Authorization'] = 'Bearer ' + apiKey;
        }
        var payload = {
            model: model,
            messages: messages
        };
        // Pollinations (tier anónimo) devuelve 402 si el body incluye `temperature`.
        if (sendTemperature) {
            payload.temperature = 0.3;
        }
        payload.max_tokens = maxTokens;
        return fetch(providerUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        }).then(function (res) {
            if (res.status === 429 && remaining > 0) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, delay * (4 - remaining));
                }).then(function () {
                    return attempt(remaining - 1);
                });
            }

            // Pollinations (tier anónimo) limita a ~1 petición / 15 s por IP y
            // devuelve 402 cuando se agota la cuota. Reintentamos UNA vez tras
            // esperar; si vuelve a fallar, mostramos un aviso claro al usuario.
            if (res.status === 402 && remaining === retries) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, 15000);
                }).then(function () {
                    return attempt(remaining - 1);
                });
            }

            // Read body as text first (safe against non-JSON responses)
            return readBodySafe(res).then(function (parsed) {
                if (!res.ok) {
                    // HTTP error
                    var msg;
                    if (!parsed.ok) {
                        // Body is not JSON (HTML error page, etc.)
                        msg = 'HTTP ' + res.status + ' (' + (parsed.parseError || 'error desconocido') + ')';
                    } else if (parsed.body && parsed.body.error) {
                        msg = parsed.body.error.message || parsed.body.error.code || JSON.stringify(parsed.body.error);
                    } else {
                        msg = 'HTTP ' + res.status;
                    }

                    if (res.status === 413) msg = 'El mensaje es demasiado grande para este proveedor (413). Probá con un modelo con más contexto.';
                    if (res.status === 401) msg = 'API Key inválida o sin permisos (401). Verificá tu clave en Settings > AI.';
                    if (res.status === 429) msg = 'Demasiadas solicitudes (429). Esperá unos segundos y volvé a intentar.';
                    if (res.status === 402) msg = 'Pollinations (tier gratuito) alcanzó su límite de peticiones para esta IP (402). Esperá unos segundos, o usá una API key gratuita: creala en https://enter.pollinations.ai y pegalá en Settings > AI.';
                    if (res.status >= 500) msg = 'Error del servidor (' + res.status + '). Probá de nuevo más tarde.';
                    throw new Error(msg);
                }

                if (!parsed.ok) {
                    throw new Error('El servidor devolvió HTML o contenido inválido: ' + parsed.parseError);
                }

                // Success — extract content
                var data = parsed.body;
                var content = data.choices && data.choices[0] && data.choices[0].message ?
                    data.choices[0].message.content : null;

                if (content === null || content === undefined) {
                    throw new Error('La API devolvió una respuesta vacía. Probá con otro modelo o proveedor.');
                }

                var trimmed = content.trim();
                if (!trimmed) {
                    throw new Error('La API devolvió una respuesta vacía. Probá con otro modelo o proveedor.');
                }

                return trimmed;
            });
        });
    }

    return attempt(retries);
}

function callGemini(apiKey, model, messages, maxTokens, retries) {
    if (!maxTokens) maxTokens = 2048;
    if (retries === undefined) retries = 3;

    function attempt(remaining) {
        var contents = messages.map(function (msg) {
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{text: msg.content}]
            };
        });

        return fetch(
            PROVIDER_CONFIG.gemini.url + model + ':generateContent?key=' + apiKey,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {temperature: 0.3, maxOutputTokens: maxTokens}
                })
            }
        ).then(function (res) {
            if (res.status === 429 && remaining > 0) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, 1000 * (4 - remaining));
                }).then(function () {
                    return attempt(remaining - 1);
                });
            }

            return readBodySafe(res).then(function (parsed) {
                if (!res.ok) {
                    var msg;
                    if (!parsed.ok) {
                        msg = 'HTTP ' + res.status + ' (' + (parsed.parseError || 'error') + ')';
                    } else if (parsed.body && parsed.body.error) {
                        msg = parsed.body.error.message || 'HTTP ' + res.status;
                    } else {
                        msg = 'HTTP ' + res.status;
                    }
                    if (res.status === 401) msg = 'API Key inválida (401). Verificá tu clave de Gemini en Settings > AI.';
                    if (res.status === 429) msg = 'Demasiadas solicitudes (429). Esperá unos segundos.';
                    throw new Error(msg);
                }

                if (!parsed.ok) {
                    throw new Error('Gemini devolvió HTML o contenido inválido: ' + parsed.parseError);
                }

                var data = parsed.body;
                if (data.candidates && data.candidates[0] && data.candidates[0].content &&
                    data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                    var text = data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
                    if (text.trim()) return text;
                }
                throw new Error('Gemini devolvió una respuesta vacía. Probá reformular la pregunta.');
            });
        });
    }

    return attempt(retries);
}

function AiService(provider, apiKey, model, trainingData) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.trainingData = trainingData || [];
    this.sessionSummary = '';
    this.activeMode = 'blocks';
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, null, this.activeMode);
}

AiService.prototype.setActiveMode = function (activeMode) {
    this.activeMode = activeMode || 'blocks';
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, this.sessionSummary, this.activeMode);
};

AiService.prototype.setTrainingData = function (trainingData) {
    this.trainingData = trainingData || [];
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, this.sessionSummary, this.activeMode);
};

AiService.prototype.setSessionSummary = function (summary) {
    this.sessionSummary = summary || '';
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, this.sessionSummary, this.activeMode);
};

AiService.prototype._call = function (messages, maxTokens) {
    var config = PROVIDER_CONFIG[this.provider];
    if (!config) return Promise.reject(new Error('Proveedor no soportado'));
    if (config.format === 'openai') {
        return callOpenAI(config.url, this.apiKey, this.model, messages, maxTokens, {
            sendTemperature: !config.noTemperature
        });
    }
    if (config.format === 'gemini') {
        return callGemini(this.apiKey, this.model, messages, maxTokens);
    }
    return Promise.reject(new Error('Formato no soportado'));
};

AiService.prototype.ask = function (userMessage, sessionSummary, mentorMode, activeMode) {
    var prompt;
    var mode = activeMode || this.activeMode || 'blocks';
    if (mentorMode) {
        prompt = buildMentorSystemPrompt(sessionSummary || '');
    } else {
        prompt = buildAppSystemPrompt(
            this.trainingData.length > 0 ? this.trainingData : null,
            sessionSummary,
            mode
        );
    }
    return this._call([
        {role: 'system', content: prompt},
        {role: 'user', content: userMessage}
    ], 8192);
};



AiService.prototype._parseVerification = function (raw) {
    var result = 'CORRECTO';
    var explanation = '';
    var corrected = '';
    var lines = raw.split('\n');

    for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (l.indexOf('RESULTADO:') === 0) {
            result = l.substring(10).trim().toUpperCase();
        } else if (l.indexOf('EXPLICACIÓN:') === 0) {
            explanation = l.substring(12).trim();
        } else if (l.indexOf('CORREGIDO:') === 0) {
            corrected = lines.slice(i + 1).join('\n').trim();
            break;
        }
    }

    return {
        result: result,
        explanation: explanation || (result === 'CORRECTO' ? 'La respuesta es correcta.' : 'Se encontraron errores.'),
        corrected: corrected
    };
};

AiService.prototype.verify = function (userMsg, assistantResponse) {
    var self = this;
    // La verificación evalúa respuestas sobre Scratch, así que siempre usa modo blocks.
    var systemPrompt = buildAppSystemPrompt(
        self.trainingData.length > 0 ? self.trainingData : null,
        self.sessionSummary,
        'blocks'
    );

    return self._call([
        {role: 'system', content: 'Verificás respuestas basándote exclusivamente en el conocimiento provisto. No usés información externa.'},
        {role: 'user', content: buildVerifyPrompt(userMsg, assistantResponse, systemPrompt)}
    ], 2048).then(function (raw) {
        var v = self._parseVerification(raw);

        if (v.result !== 'CORRECTO' && v.corrected) {
            // Re-verify the corrected version
            return self._call([
                {role: 'system', content: 'Verificás respuestas basándote exclusivamente en el conocimiento provisto. No usés información externa.'},
                {role: 'user', content: buildVerifyPrompt(userMsg, v.corrected, systemPrompt)}
            ], 2048).then(function (raw2) {
                var v2 = self._parseVerification(raw2);
                return {
                    result: v2.result,
                    explanation: v2.explanation,
                    corrected: v.corrected,
                    finalCorrected: v2.result === 'CORRECTO' ? v.corrected : assistantResponse
                };
            });
        }

        return {
            result: v.result,
            explanation: v.explanation,
            corrected: '',
            finalCorrected: ''
        };
    });
};

export default AiService;
