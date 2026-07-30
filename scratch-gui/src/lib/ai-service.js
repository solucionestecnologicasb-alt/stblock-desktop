import AI_KNOWLEDGE from './ai-knowledge';
import {getCompactPromptLines, getDetailedBlockInfo} from './ai-block-library';
import {TrainingEngine, generateOptimizedPrompt} from './ai-training-engine';

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

var _appPromptCache = null;
function buildAppSystemPrompt(trainingExamples, sessionSummary) {
    if (!trainingExamples && !sessionSummary && _appPromptCache) return _appPromptCache;
    var lines = [
        'Eres asistente STBlock. PODÉS crear/editar bloques reales tanto para MODO JUEGO (Scratch) como para MODO DISPOSITIVO (Arduino, ESP32, Micro:bit).',
        '',
        'CAPACIDADES:',
        '- Crear bloques de Scratch (movimiento, apariencia, sonido, eventos, control, sensores, operadores, variables, lápiz, música)',
        '- Crear bloques de Arduino (digitalWrite, digitalRead, analogWrite, analogRead, servo, serial, etc.)',
        '- Crear bloques de ESP32 (WiFi, touch, DAC, etc.)',
        '- Crear bloques de Micro:bit (matriz LED, botones, acelerómetro, etc.)',
        '- MEZCLAR bloques de Scratch con bloques de dispositivos en el MISMO programa',
        '',
        'DEBES responder SIEMPRE en formato JSON con la siguiente estructura:',
        '{',
        '  "explanation": "Explicación en español para mostrar en el chat sobre qué hace el script o la respuesta a la pregunta del usuario.",',
        '  "clearExisting": true o false (si es true, borra los bloques actuales del Sprite; si es false, agrega los nuevos bloques al lado),',
        '  "scripts": [',
        '    {',
        '      "blocks": [',
        '        {',
        '          "opcode": "opcode_del_bloque",',
        '          "fields": { "NOMBRE_CAMPO": "valor" }, // opcional, para variables, listas, teclas o disfraces',
        '          "inputs": {',
        '            "NOMBRE_ENTRADA": 10 o "texto" o [ ... array de bloques (para substack/bucles/condiciones) ... ] o { "opcode": "nested_reporter_opcode", "inputs": { ... }, "fields": { ... } }',
        '          }',
        '        }',
        '      ]',
        '    }',
        '  ]',
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
        '',
    ];

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
        _appPromptCache = lines.join('\n');
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

function callOpenAI(providerUrl, apiKey, model, messages, maxTokens, retries) {
    if (!maxTokens) maxTokens = 4096;
    if (retries === undefined) retries = 3;
    var delay = 1000;

    function attempt(remaining) {
        return fetch(providerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.3,
                max_tokens: maxTokens
            })
        }).then(function (res) {
            if (res.status === 429 && remaining > 0) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, delay * (4 - remaining));
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
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null);
}

AiService.prototype.setTrainingData = function (trainingData) {
    this.trainingData = trainingData || [];
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, this.sessionSummary);
};

AiService.prototype.setSessionSummary = function (summary) {
    this.sessionSummary = summary || '';
    this.systemPrompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, this.sessionSummary);
};

AiService.prototype._call = function (messages, maxTokens) {
    var config = PROVIDER_CONFIG[this.provider];
    if (!config) return Promise.reject(new Error('Proveedor no soportado'));
    if (config.format === 'openai') {
        return callOpenAI(config.url, this.apiKey, this.model, messages, maxTokens);
    }
    if (config.format === 'gemini') {
        return callGemini(this.apiKey, this.model, messages, maxTokens);
    }
    return Promise.reject(new Error('Formato no soportado'));
};

AiService.prototype.ask = function (userMessage, sessionSummary, mentorMode) {
    var prompt;
    if (mentorMode) {
        prompt = buildMentorSystemPrompt(sessionSummary || '');
    } else {
        prompt = this.systemPrompt;
        if (sessionSummary) {
            prompt = buildAppSystemPrompt(this.trainingData.length > 0 ? this.trainingData : null, sessionSummary);
        }
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
    var systemPrompt = self.systemPrompt;

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
