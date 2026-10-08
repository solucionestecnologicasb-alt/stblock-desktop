/**
 * STBlock - Sistema de Evaluaciones
 * Definición de tipos de ejercicios disponibles
 *
 * @author STB Academy
 * @version 1.0.0
 */

export const EXERCISE_TYPES = {
    // ═══════════════════════════════════════════════════════════
    // FASE 1: MVP - Ejercicios básicos
    // ═══════════════════════════════════════════════════════════

    completar_codigo: {
        id: 'completar_codigo',
        nombre: 'Completar Código',
        descripcion: 'El estudiante debe rellenar los espacios en blanco en el código',
        icono: '✏️',
        categoria: 'basico',
        color: '#4C97FF',
        dificultad: 'facil',
        campos: [
            { key: 'codigo', label: 'Código con huecos', type: 'code', required: true, placeholder: 'Usa {{hueco1}}, {{hueco2}}, etc.' },
            { key: 'blanks', label: 'Respuestas de huecos', type: 'blanks', required: true }
        ],
        ejemplo: {
            codigo: 'for _ in range({{veces}}):\n    sprite.mover({{pasos}})',
            blanks: {
                veces: { validos: ['10', '5'], pistas: ['Es un número entre 1 y 10'] },
                pasos: { validos: ['10'], pistas: ['Piensa en cuánto debe moverse'] }
            }
        }
    },

    quiz: {
        id: 'quiz',
        nombre: 'Pregunta de Opción Múltiple',
        descripcion: 'Pregunta con varias opciones donde solo una es correcta',
        icono: '❓',
        categoria: 'basico',
        color: '#9966FF',
        dificultad: 'facil',
        campos: [
            { key: 'pregunta', label: 'Pregunta', type: 'text', required: true },
            { key: 'opciones', label: 'Opciones', type: 'options', required: true, min: 2, max: 6 },
            { key: 'correcta', label: 'Opción correcta', type: 'select', required: true },
            { key: 'explicacion', label: 'Explicación (opcional)', type: 'textarea' }
        ],
        ejemplo: {
            pregunta: '¿Qué bloque usamos para repetir acciones?',
            opciones: ['mover', 'repetir', 'decir', 'esperar'],
            correcta: 1,
            explicacion: 'El bloque "repetir" permite ejecutar acciones múltiples veces'
        }
    },

    verdadero_falso: {
        id: 'verdadero_falso',
        nombre: 'Verdadero o Falso',
        descripcion: 'Afirmación que el estudiante debe evaluar como verdadera o falsa',
        icono: '✓✗',
        categoria: 'basico',
        color: '#FFAB19',
        dificultad: 'facil',
        campos: [
            { key: 'afirmacion', label: 'Afirmación', type: 'text', required: true },
            { key: 'respuesta', label: 'Respuesta correcta', type: 'boolean', required: true },
            { key: 'explicacion', label: 'Explicación', type: 'textarea' }
        ],
        ejemplo: {
            afirmacion: 'El bloque "por siempre" repite las acciones infinitamente',
            respuesta: true,
            explicacion: 'El bucle "por siempre" no tiene condición de salida'
        }
    },

    ordenar_bloques: {
        id: 'ordenar_bloques',
        nombre: 'Ordenar Bloques',
        descripcion: 'El estudiante debe ordenar los bloques en la secuencia correcta',
        icono: '🔢',
        categoria: 'basico',
        color: '#FF8C1A',
        dificultad: 'medio',
        campos: [
            { key: 'instruccion', label: 'Instrucción', type: 'text', required: true },
            { key: 'bloques', label: 'Bloques a ordenar', type: 'blocks', required: true },
            { key: 'orden_correcto', label: 'Orden correcto', type: 'order', required: true }
        ],
        ejemplo: {
            instruccion: 'Ordena los bloques para que el gato camine en cuadrado',
            bloques: ['girar 90 grados', 'mover 10 pasos', 'repetir 4 veces', 'fin repetir'],
            orden_correcto: [2, 1, 0, 3]
        }
    },

    que_hace_codigo: {
        id: 'que_hace_codigo',
        nombre: '¿Qué hace este código?',
        descripcion: 'Mostrar código y preguntar qué resultado produce',
        icono: '🔍',
        categoria: 'basico',
        color: '#CF63CF',
        dificultad: 'medio',
        campos: [
            { key: 'codigo', label: 'Código a analizar', type: 'code', required: true },
            { key: 'pregunta', label: 'Pregunta', type: 'text', required: true },
            { key: 'opciones', label: 'Opciones de respuesta', type: 'options', required: true },
            { key: 'correcta', label: 'Opción correcta', type: 'select', required: true }
        ],
        ejemplo: {
            codigo: 'for _ in range(4):\n    sprite.mover(50)\n    sprite.girar_derecha(90)',
            pregunta: '¿Qué figura dibuja este código?',
            opciones: ['Un triángulo', 'Un cuadrado', 'Un círculo', 'Una línea'],
            correcta: 1
        }
    },

    // ═══════════════════════════════════════════════════════════
    // FASE 2: Interactivos
    // ═══════════════════════════════════════════════════════════

    escribir_codigo: {
        id: 'escribir_codigo',
        nombre: 'Escribir Código',
        descripcion: 'El estudiante debe escribir código Python desde cero',
        icono: '💻',
        categoria: 'interactivo',
        color: '#00B359',
        dificultad: 'dificil',
        campos: [
            { key: 'instruccion', label: 'Instrucción', type: 'textarea', required: true },
            { key: 'codigo_inicial', label: 'Código inicial (opcional)', type: 'code' },
            { key: 'validacion', label: 'Tipo de validación', type: 'validation', required: true },
            { key: 'solucion', label: 'Solución de referencia', type: 'code', required: true }
        ],
        ejemplo: {
            instruccion: 'Escribe código para mover el sprite 100 pasos',
            codigo_inicial: 'def inicio():\n    ',
            validacion: { tipo: 'contiene', patrones: ['sprite.mover', '100'] },
            solucion: 'def inicio():\n    sprite.mover(100)'
        }
    },

    multiple_respuesta: {
        id: 'multiple_respuesta',
        nombre: 'Selección Múltiple',
        descripcion: 'Pregunta donde pueden haber varias respuestas correctas',
        icono: '☑️',
        categoria: 'interactivo',
        color: '#5CB1D6',
        dificultad: 'medio',
        campos: [
            { key: 'pregunta', label: 'Pregunta', type: 'text', required: true },
            { key: 'opciones', label: 'Opciones', type: 'options', required: true },
            { key: 'correctas', label: 'Opciones correctas', type: 'multiselect', required: true }
        ],
        ejemplo: {
            pregunta: '¿Cuáles de estos son bloques de movimiento?',
            opciones: ['mover', 'decir', 'girar', 'esperar', 'ir a'],
            correctas: [0, 2, 4]
        }
    },

    relacionar: {
        id: 'relacionar',
        nombre: 'Relacionar Columnas',
        descripcion: 'Conectar elementos de dos columnas',
        icono: '🔗',
        categoria: 'interactivo',
        color: '#FF6680',
        dificultad: 'medio',
        campos: [
            { key: 'instruccion', label: 'Instrucción', type: 'text', required: true },
            { key: 'columna_a', label: 'Columna A (izquierda)', type: 'list', required: true },
            { key: 'columna_b', label: 'Columna B (derecha)', type: 'list', required: true },
            { key: 'relaciones', label: 'Relaciones correctas', type: 'pairs', required: true }
        ],
        ejemplo: {
            instruccion: 'Relaciona cada bloque con su categoría',
            columna_a: ['mover', 'decir', 'esperar', 'sumar'],
            columna_b: ['Movimiento', 'Apariencia', 'Control', 'Operadores'],
            relaciones: [[0, 0], [1, 1], [2, 2], [3, 3]]
        }
    },

    // ═══════════════════════════════════════════════════════════
    // FASE 3: Avanzados
    // ═══════════════════════════════════════════════════════════

    depurar_codigo: {
        id: 'depurar_codigo',
        nombre: 'Depurar Código',
        descripcion: 'Encontrar y corregir errores en el código',
        icono: '🐛',
        categoria: 'avanzado',
        color: '#FF661A',
        dificultad: 'dificil',
        campos: [
            { key: 'instruccion', label: 'Instrucción', type: 'text', required: true },
            { key: 'codigo_con_error', label: 'Código con error', type: 'code', required: true },
            { key: 'error_tipo', label: 'Tipo de error', type: 'select', options: ['sintaxis', 'logico', 'runtime'] },
            { key: 'linea_error', label: 'Línea del error', type: 'number' },
            { key: 'codigo_correcto', label: 'Código corregido', type: 'code', required: true }
        ],
        ejemplo: {
            instruccion: 'Encuentra y corrige el error en este código',
            codigo_con_error: 'def inicio():\nsprite.mover(10)',
            error_tipo: 'sintaxis',
            linea_error: 2,
            codigo_correcto: 'def inicio():\n    sprite.mover(10)'
        }
    },

    reto_ejecucion: {
        id: 'reto_ejecucion',
        nombre: 'Reto de Ejecución',
        descripcion: 'Escribir código que logre un objetivo específico verificable',
        icono: '🎯',
        categoria: 'avanzado',
        color: '#00B359',
        dificultad: 'dificil',
        campos: [
            { key: 'instruccion', label: 'Instrucción', type: 'textarea', required: true },
            { key: 'objetivo', label: 'Objetivo a verificar', type: 'objective', required: true },
            { key: 'codigo_inicial', label: 'Código inicial', type: 'code' },
            { key: 'validacion', label: 'Criterios de validación', type: 'criteria', required: true }
        ],
        ejemplo: {
            instruccion: 'Haz que el gato llegue a la posición x:100, y:50',
            objetivo: { tipo: 'posicion', x: 100, y: 50, tolerancia: 5 },
            codigo_inicial: 'def inicio():\n    ',
            validacion: { verificar_posicion: true, tiempo_maximo: 5000 }
        }
    }
};

// Obtener ejercicios por categoría
export const getExercisesByCategory = (categoria) => {
    return Object.values(EXERCISE_TYPES).filter(e => e.categoria === categoria);
};

// Obtener categorías disponibles
export const CATEGORIES = {
    basico: { nombre: 'Básicos', icono: '📚', descripcion: 'Ejercicios fundamentales' },
    interactivo: { nombre: 'Interactivos', icono: '🎮', descripcion: 'Requieren más interacción' },
    avanzado: { nombre: 'Avanzados', icono: '🚀', descripcion: 'Para estudiantes avanzados' }
};

// Validar estructura de ejercicio
export const validateExercise = (ejercicio) => {
    const tipo = EXERCISE_TYPES[ejercicio.tipo];
    if (!tipo) {
        return { valid: false, errors: ['Tipo de ejercicio no válido'] };
    }

    const errors = [];
    tipo.campos.forEach(campo => {
        if (campo.required && !ejercicio[campo.key]) {
            errors.push(`Campo requerido: ${campo.label}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

export default EXERCISE_TYPES;
