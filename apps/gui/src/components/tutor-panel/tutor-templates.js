/**
 * STBlock - Sistema de Evaluaciones
 * Plantillas predefinidas para evaluaciones
 *
 * @author STB Academy
 * @version 1.0.0
 */

export const EVALUATION_TEMPLATES = {
    // ═══════════════════════════════════════════════════════════
    // PLANTILLA: Introducción a Bucles
    // ═══════════════════════════════════════════════════════════
    bucles_basico: {
        meta: {
            titulo: 'Introducción a los Bucles',
            descripcion: 'Evaluación básica sobre estructuras de repetición',
            tiempo_limite_minutos: 15,
            nivel: 'principiante',
            tags: ['bucles', 'repetir', 'por siempre'],
            icono: '🔄',
            color: '#FFAB19'
        },
        ejercicios: [
            {
                tipo: 'verdadero_falso',
                titulo: 'Concepto de Bucle',
                puntuacion: 10,
                afirmacion: 'Un bucle permite repetir un conjunto de instrucciones varias veces',
                respuesta: true,
                explicacion: 'Los bucles son estructuras de control que repiten código'
            },
            {
                tipo: 'quiz',
                titulo: 'Identificar Bucle',
                puntuacion: 15,
                pregunta: '¿Cuál de estos bloques crea un bucle?',
                opciones: ['mover 10 pasos', 'repetir 5 veces', 'decir "Hola"', 'esperar 1 segundo'],
                correcta: 1,
                explicacion: '"Repetir" es el bloque que crea un bucle con número fijo de repeticiones'
            },
            {
                tipo: 'completar_codigo',
                titulo: 'Completar Bucle',
                puntuacion: 20,
                codigo: 'for _ in range({{veces}}):\n    sprite.mover(10)',
                blanks: {
                    veces: {
                        validos: ['5', '10'],
                        pistas: ['Debe ser un número entero positivo']
                    }
                }
            },
            {
                tipo: 'que_hace_codigo',
                titulo: 'Analizar Bucle',
                puntuacion: 25,
                codigo: 'for _ in range(3):\n    sprite.mover(50)\n    sprite.girar_derecha(120)',
                pregunta: '¿Qué figura dibuja este código?',
                opciones: ['Un cuadrado', 'Un triángulo', 'Un círculo', 'Una línea'],
                correcta: 1
            },
            {
                tipo: 'ordenar_bloques',
                titulo: 'Ordenar Bucle',
                puntuacion: 30,
                instruccion: 'Ordena los bloques para crear un bucle que dibuje un cuadrado',
                bloques: ['girar 90 grados', 'mover 50 pasos', 'repetir 4 veces', 'fin del bucle'],
                orden_correcto: [2, 1, 0, 3]
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // PLANTILLA: Movimiento Básico
    // ═══════════════════════════════════════════════════════════
    movimiento_101: {
        meta: {
            titulo: 'Movimiento Básico',
            descripcion: 'Aprende a mover sprites en el escenario',
            tiempo_limite_minutos: 10,
            nivel: 'principiante',
            tags: ['movimiento', 'posición', 'dirección'],
            icono: '➡️',
            color: '#4C97FF'
        },
        ejercicios: [
            {
                tipo: 'quiz',
                titulo: 'Coordenadas',
                puntuacion: 15,
                pregunta: '¿Cuál es la posición del centro del escenario?',
                opciones: ['x: 100, y: 100', 'x: 0, y: 0', 'x: -100, y: -100', 'x: 240, y: 180'],
                correcta: 1,
                explicacion: 'El centro del escenario está en las coordenadas (0, 0)'
            },
            {
                tipo: 'verdadero_falso',
                titulo: 'Dirección',
                puntuacion: 10,
                afirmacion: 'La dirección 0 grados apunta hacia arriba',
                respuesta: true,
                explicacion: 'En STBlock, 0° es arriba, 90° es derecha, 180° es abajo, -90° es izquierda'
            },
            {
                tipo: 'completar_codigo',
                titulo: 'Mover Sprite',
                puntuacion: 25,
                codigo: 'sprite.ir_a_xy({{x}}, {{y}})',
                blanks: {
                    x: { validos: ['100', '-100', '0'], pistas: ['Coordenada horizontal'] },
                    y: { validos: ['50', '-50', '0'], pistas: ['Coordenada vertical'] }
                }
            },
            {
                tipo: 'que_hace_codigo',
                titulo: 'Predecir Movimiento',
                puntuacion: 25,
                codigo: 'sprite.ir_a_xy(0, 0)\nsprite.mover(100)',
                pregunta: '¿Dónde termina el sprite si empieza mirando a la derecha (90°)?',
                opciones: ['x: 100, y: 0', 'x: 0, y: 100', 'x: -100, y: 0', 'x: 0, y: -100'],
                correcta: 0
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // PLANTILLA: Condicionales
    // ═══════════════════════════════════════════════════════════
    condicionales: {
        meta: {
            titulo: 'Estructuras Condicionales',
            descripcion: 'Aprende a usar if/else para tomar decisiones',
            tiempo_limite_minutos: 20,
            nivel: 'intermedio',
            tags: ['if', 'else', 'condiciones', 'decisiones'],
            icono: '🔀',
            color: '#FFAB19'
        },
        ejercicios: [
            {
                tipo: 'verdadero_falso',
                titulo: 'Concepto If',
                puntuacion: 10,
                afirmacion: 'El bloque "si entonces" ejecuta su contenido solo cuando la condición es verdadera',
                respuesta: true,
                explicacion: 'Las estructuras condicionales evalúan una condición antes de ejecutar código'
            },
            {
                tipo: 'quiz',
                titulo: 'Else',
                puntuacion: 15,
                pregunta: '¿Qué hace el bloque "si no"?',
                opciones: [
                    'Detiene el programa',
                    'Se ejecuta cuando la condición del "si" es falsa',
                    'Repite el código anterior',
                    'Salta al siguiente sprite'
                ],
                correcta: 1
            },
            {
                tipo: 'completar_codigo',
                titulo: 'Completar Condicional',
                puntuacion: 25,
                codigo: 'if {{condicion}}:\n    sprite.decir("Verdadero")\nelse:\n    sprite.decir("Falso")',
                blanks: {
                    condicion: {
                        validos: ['x > 0', 'x < 0', 'x == 0', 'True', 'False'],
                        pistas: ['Escribe una expresión que pueda ser verdadera o falsa']
                    }
                }
            },
            {
                tipo: 'que_hace_codigo',
                titulo: 'Analizar Condicional',
                puntuacion: 25,
                codigo: 'x = 5\nif x > 3:\n    sprite.decir("Grande")\nelse:\n    sprite.decir("Pequeño")',
                pregunta: '¿Qué dice el sprite?',
                opciones: ['Grande', 'Pequeño', 'Nada', '5'],
                correcta: 0
            },
            {
                tipo: 'multiple_respuesta',
                titulo: 'Operadores de Comparación',
                puntuacion: 25,
                pregunta: '¿Cuáles son operadores de comparación válidos?',
                opciones: ['==', '!=', '><', '<=', '=', '>='],
                correctas: [0, 1, 3, 5]
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // PLANTILLA: Variables
    // ═══════════════════════════════════════════════════════════
    variables_intro: {
        meta: {
            titulo: 'Introducción a Variables',
            descripcion: 'Aprende a crear y usar variables para almacenar datos',
            tiempo_limite_minutos: 15,
            nivel: 'principiante',
            tags: ['variables', 'datos', 'asignación'],
            icono: '📦',
            color: '#FF8C1A'
        },
        ejercicios: [
            {
                tipo: 'quiz',
                titulo: '¿Qué es una variable?',
                puntuacion: 15,
                pregunta: '¿Para qué sirve una variable?',
                opciones: [
                    'Para dibujar en el escenario',
                    'Para almacenar información que puede cambiar',
                    'Para reproducir sonidos',
                    'Para conectar con internet'
                ],
                correcta: 1,
                explicacion: 'Las variables son contenedores que guardan valores que pueden cambiar durante el programa'
            },
            {
                tipo: 'verdadero_falso',
                titulo: 'Cambiar Variables',
                puntuacion: 10,
                afirmacion: 'Una variable puede cambiar su valor durante la ejecución del programa',
                respuesta: true
            },
            {
                tipo: 'completar_codigo',
                titulo: 'Crear Variable',
                puntuacion: 25,
                codigo: '{{nombre}} = {{valor}}',
                blanks: {
                    nombre: { validos: ['puntos', 'vidas', 'score', 'contador'], pistas: ['Nombre descriptivo sin espacios'] },
                    valor: { validos: ['0', '100', '3'], pistas: ['Un número inicial'] }
                }
            },
            {
                tipo: 'que_hace_codigo',
                titulo: 'Operaciones con Variables',
                puntuacion: 25,
                codigo: 'puntos = 10\npuntos = puntos + 5\nsprite.decir(puntos)',
                pregunta: '¿Qué número dice el sprite?',
                opciones: ['10', '5', '15', 'puntos'],
                correcta: 2
            },
            {
                tipo: 'relacionar',
                titulo: 'Tipos de Datos',
                puntuacion: 25,
                instruccion: 'Relaciona cada valor con su tipo',
                columna_a: ['42', '"Hola"', 'True', '3.14'],
                columna_b: ['Entero', 'Texto', 'Booleano', 'Decimal'],
                relaciones: [[0, 0], [1, 1], [2, 2], [3, 3]]
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // PLANTILLA: Evaluación en Blanco
    // ═══════════════════════════════════════════════════════════
    evaluacion_vacia: {
        meta: {
            titulo: 'Nueva Evaluación',
            descripcion: 'Evaluación personalizada',
            tiempo_limite_minutos: 30,
            nivel: 'personalizado',
            tags: [],
            icono: '📝',
            color: '#19663d'
        },
        ejercicios: []
    }
};

// Obtener lista de plantillas disponibles
export const getTemplatesList = () => {
    return Object.entries(EVALUATION_TEMPLATES).map(([key, template]) => ({
        id: key,
        ...template.meta,
        ejercicios_count: template.ejercicios.length,
        puntuacion_total: template.ejercicios.reduce((sum, e) => sum + (e.puntuacion || 0), 0)
    }));
};

// Obtener plantilla por ID
export const getTemplate = (templateId) => {
    const template = EVALUATION_TEMPLATES[templateId];
    if (!template) return null;

    // Clonar profundamente para evitar mutaciones
    return JSON.parse(JSON.stringify(template));
};

// Crear evaluación desde plantilla
export const createFromTemplate = (templateId, customMeta = {}) => {
    const template = getTemplate(templateId);
    if (!template) return null;

    return {
        id: `eval_${Date.now()}`,
        fecha_creacion: new Date().toISOString(),
        meta: {
            ...template.meta,
            ...customMeta
        },
        ejercicios: template.ejercicios.map((ej, index) => ({
            ...ej,
            id: `ej_${Date.now()}_${index}`
        }))
    };
};

export default EVALUATION_TEMPLATES;
