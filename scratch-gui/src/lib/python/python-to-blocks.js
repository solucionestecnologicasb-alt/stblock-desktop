/**
 * STBlock - Parser Python a Bloques
 *
 * Convierte código Python de STBlock a bloques de Scratch
 * Soporta estructuras de control complejas: while, for, if/else
 * Incluye sistema de detección de errores de sintaxis y tipo
 */

// Generador de IDs únicos
let blockIdCounter = 0;
const generateBlockId = () => `py_block_${Date.now()}_${blockIdCounter++}`;

// Tipos de errores
const ERROR_TYPES = {
    UNKNOWN_FUNCTION: 'unknown_function',
    TYPE_ERROR: 'type_error',
    SYNTAX_ERROR: 'syntax_error',
    MISSING_ARGUMENT: 'missing_argument',
    EXTRA_ARGUMENT: 'extra_argument',
    INDENT_ERROR: 'indent_error'
};

// Clase para representar errores de código
class CodeError {
    constructor(type, message, line, column = 0, suggestion = null) {
        this.type = type;
        this.message = message;
        this.line = line;
        this.column = column;
        this.suggestion = suggestion;
    }
}

// Lista de funciones válidas conocidas para sugerencias
const KNOWN_FUNCTIONS = [
    // Movimiento
    'sprite.mover', 'sprite.girar_derecha', 'sprite.girar_izquierda',
    'sprite.ir_a_xy', 'sprite.ir_a', 'sprite.deslizar_a_xy', 'sprite.deslizar_a',
    'sprite.apuntar_en_direccion', 'sprite.apuntar_hacia',
    'sprite.cambiar_x', 'sprite.cambiar_y', 'sprite.fijar_x', 'sprite.fijar_y',
    'sprite.rebotar_si_toca_borde', 'sprite.fijar_estilo_rotacion',
    // Apariencia
    'sprite.decir', 'sprite.decir_por_segundos', 'sprite.pensar', 'sprite.pensar_por_segundos',
    'sprite.mostrar', 'sprite.esconder',
    'sprite.cambiar_disfraz', 'sprite.siguiente_disfraz',
    'sprite.cambiar_tamaño', 'sprite.fijar_tamaño',
    'sprite.cambiar_efecto', 'sprite.fijar_efecto', 'sprite.quitar_efectos',
    'sprite.ir_a_capa', 'sprite.cambiar_capa',
    // Sensores
    'sprite.tocando', 'sprite.tocando_color', 'sprite.color_tocando_color',
    'sprite.distancia_a', 'sprite.fijar_modo_arrastre',
    // Juego (game blocks)
    'sprite.saltar', 'sprite.aplicar_gravedad', 'sprite.en_suelo', 'sprite.en_aire',
    'sprite.fijar_velocidad', 'sprite.fijar_velocidad_x', 'sprite.fijar_velocidad_y',
    'sprite.fijar_salud', 'sprite.cambiar_salud', 'sprite.fijar_salud_maxima',
    'sprite.recibir_daño', 'sprite.curar', 'sprite.esta_vivo', 'sprite.esta_muerto',
    'sprite.colisiona_con',
    // Sprite Fisica extendida
    'sprite.cambiar_velocidad', 'sprite.velocidad_x', 'sprite.velocidad_y',
    'sprite.fijar_aceleracion', 'sprite.aplicar_velocidad', 'sprite.fijar_friccion', 'sprite.fijar_rebote',
    'sprite.aplicar_fuerza', 'sprite.detener_movimiento', 'sprite.mantener_en_escenario',
    'sprite.rebotar_en_borde_escenario', 'sprite.rapidez', 'sprite.fijar_masa',
    'sprite.fijar_control_aire', 'sprite.reiniciar_fisicas',
    'sprite.salud_maxima', 'sprite.salud_porcentaje',
    'sprite.fijar_dano_ataque', 'sprite.atacar_si_toca', 'sprite.danar_objetivo',
    'sprite.hacer_invencible', 'sprite.es_invencible', 'sprite.retroceso_desde',
    'sprite.revivir', 'sprite.colocar_en_mundo',
    // Sonido
    'sonido.reproducir', 'sonido.reproducir_hasta_terminar', 'sonido.detener_todos',
    'sonido.cambiar_volumen', 'sonido.fijar_volumen',
    'sonido.cambiar_efecto', 'sonido.fijar_efecto', 'sonido.quitar_efectos',
    // Escenario
    'escenario.cambiar_fondo', 'escenario.siguiente_fondo',
    // Cámara
    'camara.seguir', 'camara.fijar_posicion', 'camara.sacudir', 'camara.zoom',
    // Física
    'fisica.fijar_gravedad', 'fisica.cambiar_gravedad', 'fisica.gravedad',
    'fisica.fijar_velocidad_terminal', 'fisica.velocidad_terminal',
    'fisica.fijar_suelo_y', 'fisica.suelo_y',
    // Control y otros
    'esperar', 'preguntar', 'aleatorio', 'crear_clon', 'borrar_este_clon',
    'enviar_mensaje', 'enviar_mensaje_y_esperar', 'tecla_presionada', 'reiniciar_cronometro',
    'mostrar_variable', 'ocultar_variable', 'mostrar_lista', 'ocultar_lista',
    'detener_todo', 'detener_otros_scripts',
    // Operadores y funciones matemáticas
    'unir', 'letra_de', 'longitud', 'redondear',
    'abs', 'piso', 'techo', 'raiz', 'seno', 'coseno', 'tangente',
    'arcoseno', 'arcocoseno', 'arcotangente', 'logaritmo_natural', 'logaritmo',
    'e_elevado', 'diez_elevado',
    // Sensores adicionales
    'obtener_de', 'fecha_actual',
    // ── PROGRAMACION ──
    'limitado', 'mapeado', 'interpolar', 'distancia_puntos', 'angulo_hacia',
    'redondear_decimales', 'porcentaje', 'signo', 'reemplazar_texto',
    'json_obtener', 'json_poner', 'json_tiene', 'json_texto', 'conteo',
    'cada_frame', 'cada_segundos', 'cuando_evento', 'emitir_evento', 'dato_evento',
    'delta_tiempo', 'fps',
    // ── IA ──
    'ia',
    // ── ESTADO ──
    'estado.cambiar', 'estado.actual', 'estado.anterior', 'estado.es', 'estado.volver', 'estado.reiniciar',
    // ── DEBUG ──
    'debug.imprimir', 'debug.advertir', 'debug.error', 'debug.pausar_si',
    'debug.marcar', 'debug.ms_desde', 'debug.contar', 'debug.contador',
    // ── PRUEBAS ──
    'pruebas.afirmar_verdadero', 'pruebas.afirmar_igual', 'pruebas.afirmar_entre',
    'pruebas.reiniciar', 'pruebas.pasadas', 'pruebas.fallidas', 'pruebas.total', 'pruebas.reporte',
    // ── IA EXTENDIDA ──
    'ia.mover_a_xy', 'ia.perseguir', 'ia.huir_de', 'ia.mirar_a', 'ia.distancia_a',
    'ia.en_rango', 'ia.patrullar_x', 'ia.perseguir_si_rango', 'ia.mantener_distancia',
    'ia.deambular', 'ia.cerca_de',
    // ── CAMARA EXTENDIDA ──
    'camara.x', 'camara.y', 'camara.zoom', 'camara.mover', 'camara.seguir_objetivo',
    'camara.fijar_zoom', 'camara.cambiar_zoom',
    'camara.mundo_a_pantalla_x', 'camara.mundo_a_pantalla_y',
    'camara.pantalla_a_mundo_x', 'camara.pantalla_a_mundo_y',
    // ── ESCENARIO EXTENDIDO ──
    'escenario.ancho', 'escenario.alto',
    // ── RATON EXTENDIDO ──
    'raton.velocidad', 'raton.x_anterior', 'raton.y_anterior',
];

// Métodos válidos para cada objeto
const VALID_METHODS = {
    'sprite': [
        'mover', 'girar_derecha', 'girar_izquierda', 'ir_a_xy', 'ir_a',
        'deslizar_a_xy', 'deslizar_a', 'apuntar_en_direccion', 'apuntar_hacia',
        'cambiar_x', 'cambiar_y', 'fijar_x', 'fijar_y',
        'rebotar_si_toca_borde', 'fijar_estilo_rotacion',
        'decir', 'decir_por_segundos', 'pensar', 'pensar_por_segundos',
        'mostrar', 'esconder', 'cambiar_disfraz', 'siguiente_disfraz',
        'cambiar_tamaño', 'fijar_tamaño', 'cambiar_efecto', 'fijar_efecto',
        'quitar_efectos', 'ir_a_capa', 'cambiar_capa',
        'tocando', 'tocando_color', 'color_tocando_color', 'distancia_a',
        'fijar_modo_arrastre',
        'saltar', 'aplicar_gravedad', 'en_suelo', 'en_aire',
        'fijar_velocidad', 'fijar_velocidad_x', 'fijar_velocidad_y',
        'fijar_salud', 'cambiar_salud', 'fijar_salud_maxima',
        'recibir_daño', 'curar', 'esta_vivo', 'esta_muerto', 'colisiona_con',
        'cambiar_velocidad', 'velocidad_x', 'velocidad_y',
        'fijar_aceleracion', 'aplicar_velocidad', 'fijar_friccion', 'fijar_rebote',
        'aplicar_fuerza', 'detener_movimiento', 'mantener_en_escenario',
        'rebotar_en_borde_escenario', 'rapidez', 'fijar_masa',
        'fijar_control_aire', 'reiniciar_fisicas',
        'salud_maxima', 'salud_porcentaje',
        'fijar_dano_ataque', 'atacar_si_toca', 'danar_objetivo',
        'hacer_invencible', 'es_invencible', 'retroceso_desde',
        'revivir', 'colocar_en_mundo'
    ],
    'sonido': [
        'reproducir', 'reproducir_hasta_terminar', 'detener_todos',
        'cambiar_volumen', 'fijar_volumen', 'cambiar_efecto', 'fijar_efecto', 'quitar_efectos'
    ],
    'escenario': ['cambiar_fondo', 'siguiente_fondo', 'ancho', 'alto'],
    'camara': ['seguir', 'fijar_posicion', 'sacudir', 'zoom', 'mover',
        'seguir_objetivo', 'fijar_zoom', 'cambiar_zoom',
        'x', 'y', 'zoom', 'mundo_a_pantalla_x', 'mundo_a_pantalla_y',
        'pantalla_a_mundo_x', 'pantalla_a_mundo_y'],
    'fisica': ['fijar_gravedad', 'cambiar_gravedad', 'gravedad',
        'fijar_velocidad_terminal', 'velocidad_terminal',
        'fijar_suelo_y', 'suelo_y'],
    'raton': ['presionado', 'x', 'y', 'velocidad', 'x_anterior', 'y_anterior'],
    // ── ESTADOS ──
    'estado': ['cambiar', 'actual', 'anterior', 'es', 'volver', 'reiniciar'],
    // ── DEBUG ──
    'debug': ['imprimir', 'advertir', 'error', 'pausar_si', 'marcar', 'ms_desde', 'contar', 'contador'],
    // ── PRUEBAS ──
    'pruebas': ['afirmar_verdadero', 'afirmar_igual', 'afirmar_entre', 'reiniciar', 'pasadas', 'fallidas', 'total', 'reporte'],
    // ── IA ──
    'ia': ['mover_a_xy', 'perseguir', 'huir_de', 'mirar_a', 'distancia_a', 'en_rango', 'patrullar_x', 'perseguir_si_rango', 'mantener_distancia', 'deambular', 'cerca_de'],
};

// Función para encontrar la función más similar (distancia de Levenshtein)
function findSimilarFunction(func) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const known of KNOWN_FUNCTIONS) {
        const distance = levenshteinDistance(func.toLowerCase(), known.toLowerCase());
        if (distance < bestDistance && distance <= 3) {
            bestDistance = distance;
            bestMatch = known;
        }
    }

    return bestMatch;
}

/**
 * Valida un método de objeto (sprite.metodo, sonido.metodo, etc.)
 * Retorna null si es válido, o un objeto de error si no lo es
 */
function validateObjectMethod(objectName, methodName, lineNumber) {
    // Verificar si el objeto es válido
    const validObjects = Object.keys(VALID_METHODS);
    if (!validObjects.includes(objectName)) {
        // Buscar objeto similar
        let bestObj = null;
        let bestDist = Infinity;
        for (const obj of validObjects) {
            const dist = levenshteinDistance(objectName.toLowerCase(), obj.toLowerCase());
            if (dist < bestDist && dist <= 2) {
                bestDist = dist;
                bestObj = obj;
            }
        }
        return new CodeError(
            ERROR_TYPES.UNKNOWN_FUNCTION,
            `Objeto desconocido: "${objectName}". Los objetos válidos son: ${validObjects.join(', ')}`,
            lineNumber,
            0,
            bestObj ? `¿Quisiste decir "${bestObj}"?` : null
        );
    }

    // Verificar si el método es válido para este objeto
    const validMethods = VALID_METHODS[objectName];
    if (!validMethods.includes(methodName)) {
        // Buscar método similar
        let bestMethod = null;
        let bestDist = Infinity;
        for (const method of validMethods) {
            const dist = levenshteinDistance(methodName.toLowerCase(), method.toLowerCase());
            if (dist < bestDist && dist <= 3) {
                bestDist = dist;
                bestMethod = method;
            }
        }
        return new CodeError(
            ERROR_TYPES.UNKNOWN_FUNCTION,
            `Método desconocido: "${objectName}.${methodName}"`,
            lineNumber,
            0,
            bestMethod ? `¿Quisiste decir "${objectName}.${bestMethod}"?` : `Métodos válidos para ${objectName}: ${validMethods.slice(0, 5).join(', ')}...`
        );
    }

    return null; // Válido
}

// Distancia de Levenshtein simplificada
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Tipos de estructuras de control
const CONTROL_STRUCTURE = {
    FOREVER: 'control_forever',
    REPEAT: 'control_repeat',
    IF: 'control_if',
    IF_ELSE: 'control_if_else',
    WAIT_UNTIL: 'control_wait_until',
    REPEAT_UNTIL: 'control_repeat_until'
};

/**
 * Mapeo de funciones Python a opcodes de Scratch
 * COMPLETO: Incluye todos los bloques del modo Programación
 */
const PYTHON_TO_OPCODE = {
    // ═══════════════════════════════════════════════════════════════
    // EVENTOS
    // ═══════════════════════════════════════════════════════════════
    '__event_flag__': 'event_whenflagclicked',
    '__event_key__': 'event_whenkeypressed',
    '__event_click__': 'event_whenthisspriteclicked',
    '__event_backdrop__': 'event_whenbackdropswitchesto',
    '__event_broadcast_received__': 'event_whenbroadcastreceived',
    '__event_greater_than__': 'event_whengreaterthan',
    '__event_clone_start__': 'control_start_as_clone',
    '__event_collision__': 'game_onCollision',
    'enviar_mensaje': 'event_broadcast',
    'enviar_mensaje_y_esperar': 'event_broadcastandwait',

    // ═══════════════════════════════════════════════════════════════
    // MOVIMIENTO
    // ═══════════════════════════════════════════════════════════════
    'sprite.mover': 'motion_movesteps',
    'sprite.girar_derecha': 'motion_turnright',
    'sprite.girar_izquierda': 'motion_turnleft',
    'sprite.ir_a_xy': 'motion_gotoxy',
    'sprite.ir_a': 'motion_goto',
    'sprite.deslizar_a_xy': 'motion_glidesecstoxy',
    'sprite.deslizar_a': 'motion_glideto',
    'sprite.apuntar_en_direccion': 'motion_pointindirection',
    'sprite.apuntar_hacia': 'motion_pointtowards',
    'sprite.cambiar_x': 'motion_changexby',
    'sprite.cambiar_y': 'motion_changeyby',
    'sprite.fijar_x': 'motion_setx',
    'sprite.fijar_y': 'motion_sety',
    'sprite.rebotar_si_toca_borde': 'motion_ifonedgebounce',
    'sprite.fijar_estilo_rotacion': 'motion_setrotationstyle',

    // ═══════════════════════════════════════════════════════════════
    // APARIENCIA
    // ═══════════════════════════════════════════════════════════════
    'sprite.decir': 'looks_say',
    'sprite.decir_por_segundos': 'looks_sayforsecs',
    'sprite.pensar': 'looks_think',
    'sprite.pensar_por_segundos': 'looks_thinkforsecs',
    'sprite.mostrar': 'looks_show',
    'sprite.esconder': 'looks_hide',
    'sprite.cambiar_disfraz': 'looks_switchcostumeto',
    'sprite.siguiente_disfraz': 'looks_nextcostume',
    'escenario.cambiar_fondo': 'looks_switchbackdropto',
    'escenario.siguiente_fondo': 'looks_nextbackdrop',
    'sprite.cambiar_tamaño': 'looks_changesizeby',
    'sprite.fijar_tamaño': 'looks_setsizeto',
    'sprite.cambiar_efecto': 'looks_changeeffectby',
    'sprite.fijar_efecto': 'looks_seteffectto',
    'sprite.quitar_efectos': 'looks_cleargraphiceffects',
    'sprite.ir_a_capa': 'looks_gotofrontback',
    'sprite.cambiar_capa': 'looks_goforwardbackwardlayers',

    // ═══════════════════════════════════════════════════════════════
    // SONIDO
    // ═══════════════════════════════════════════════════════════════
    'sonido.reproducir': 'sound_play',
    'sonido.reproducir_hasta_terminar': 'sound_playuntildone',
    'sonido.detener_todos': 'sound_stopallsounds',
    'sonido.cambiar_volumen': 'sound_changevolumeby',
    'sonido.fijar_volumen': 'sound_setvolumeto',
    'sonido.cambiar_efecto': 'sound_changeeffectby',
    'sonido.fijar_efecto': 'sound_seteffectto',
    'sonido.quitar_efectos': 'sound_cleareffects',

    // ═══════════════════════════════════════════════════════════════
    // CONTROL
    // ═══════════════════════════════════════════════════════════════
    'esperar': 'control_wait',
    '__control_forever__': 'control_forever',
    '__control_repeat__': 'control_repeat',
    '__control_if__': 'control_if',
    '__control_if_else__': 'control_if_else',
    '__control_wait_until__': 'control_wait_until',
    '__control_repeat_until__': 'control_repeat_until',
    'detener_todo': 'control_stop',
    'detener_otros_scripts': 'control_stop',
    'crear_clon': 'control_create_clone_of',
    'borrar_este_clon': 'control_delete_this_clone',

    // ═══════════════════════════════════════════════════════════════
    // SENSORES
    // ═══════════════════════════════════════════════════════════════
    'sprite.tocando': 'sensing_touchingobject',
    'sprite.tocando_color': 'sensing_touchingcolor',
    'sprite.color_tocando_color': 'sensing_coloristouchingcolor',
    'sprite.distancia_a': 'sensing_distanceto',
    'preguntar': 'sensing_askandwait',
    'tecla_presionada': 'sensing_keypressed',
    'sprite.fijar_modo_arrastre': 'sensing_setdragmode',
    'reiniciar_cronometro': 'sensing_resettimer',
    'obtener_de': 'sensing_of',
    'fecha_actual': 'sensing_current',

    // ═══════════════════════════════════════════════════════════════
    // OPERADORES
    // ═══════════════════════════════════════════════════════════════
    'aleatorio': 'operator_random',
    'unir': 'operator_join',
    'letra_de': 'operator_letter_of',
    'longitud': 'operator_length',
    'redondear': 'operator_round',
    // Funciones matemáticas
    'abs': 'operator_mathop',
    'piso': 'operator_mathop',
    'techo': 'operator_mathop',
    'raiz': 'operator_mathop',
    'seno': 'operator_mathop',
    'coseno': 'operator_mathop',
    'tangente': 'operator_mathop',
    'arcoseno': 'operator_mathop',
    'arcocoseno': 'operator_mathop',
    'arcotangente': 'operator_mathop',
    'logaritmo_natural': 'operator_mathop',
    'logaritmo': 'operator_mathop',
    'e_elevado': 'operator_mathop',
    'diez_elevado': 'operator_mathop',

    // ═══════════════════════════════════════════════════════════════
    // VARIABLES
    // ═══════════════════════════════════════════════════════════════
    '__set_variable__': 'data_setvariableto',
    '__change_variable__': 'data_changevariableby',
    'mostrar_variable': 'data_showvariable',
    'ocultar_variable': 'data_hidevariable',

    // ═══════════════════════════════════════════════════════════════
    // LISTAS
    // ═══════════════════════════════════════════════════════════════
    '__list_add__': 'data_addtolist',
    '__list_delete__': 'data_deleteoflist',
    '__list_clear__': 'data_deletealloflist',
    '__list_insert__': 'data_insertatlist',
    '__list_replace__': 'data_replaceitemoflist',
    '__list_index_of__': 'data_itemnumoflist',
    'mostrar_lista': 'data_showlist',
    'ocultar_lista': 'data_hidelist',

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES PERSONALIZADOS (Mis Bloques)
    // ═══════════════════════════════════════════════════════════════
    '__procedure_def__': 'procedures_definition',
    '__procedure_call__': 'procedures_call',

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES DE JUEGO (Game Blocks de STBlock)
    // ═══════════════════════════════════════════════════════════════
    // Física
    'sprite.saltar': 'game_jump',
    'fisica.fijar_gravedad': 'game_setGravity',
    'sprite.aplicar_gravedad': 'game_applyGravity',
    'sprite.en_suelo': 'game_isOnGround',
    'sprite.en_aire': 'game_isInAir',
    'sprite.fijar_velocidad': 'game_setVelocity',
    'sprite.fijar_velocidad_x': 'game_setVelocityX',
    'sprite.fijar_velocidad_y': 'game_setVelocityY',
    // Salud
    'sprite.fijar_salud': 'game_setHealth',
    'sprite.cambiar_salud': 'game_changeHealth',
    'sprite.fijar_salud_maxima': 'game_setMaxHealth',
    'sprite.recibir_daño': 'game_damageSelf',
    'sprite.curar': 'game_healSelf',
    'sprite.esta_vivo': 'game_isAlive',
    'sprite.esta_muerto': 'game_isDead',
    // Cámara
    'camara.seguir': 'game_cameraFollowThis',
    'camara.fijar_posicion': 'game_cameraSetXY',
    'camara.sacudir': 'game_cameraShake',
    'camara.zoom': 'game_cameraZoom',
    // Colisiones
    'sprite.colisiona_con': 'game_isCollidingWith',

    // ── FÍSICA EXTENDIDA ──
    'sprite.cambiar_velocidad': 'game_changeVelocity',
    'sprite.velocidad_x': 'game_velocityX',
    'sprite.velocidad_y': 'game_velocityY',
    'sprite.fijar_aceleracion': 'game_setAcceleration',
    'sprite.aplicar_velocidad': 'game_applyVelocity',
    'sprite.fijar_friccion': 'game_setFriction',
    'sprite.fijar_rebote': 'game_setBounce',
    'sprite.aplicar_fuerza': 'game_applyForce',
    'sprite.detener_movimiento': 'game_stopMotion',
    'sprite.mantener_en_escenario': 'game_clampToStage',
    'sprite.rebotar_en_borde_escenario': 'game_bounceOnStageEdge',
    'sprite.rapidez': 'game_speed',
    'sprite.fijar_masa': 'game_setMass',
    'sprite.fijar_control_aire': 'game_setAirControl',
    'sprite.reiniciar_fisicas': 'game_resetPhysics',

    // ── GRAVEDAD ──
    'fisica.cambiar_gravedad': 'game_changeGravity',
    'fisica.gravedad': 'game_gravity',
    'fisica.fijar_velocidad_terminal': 'game_setTerminalVelocity',
    'fisica.velocidad_terminal': 'game_terminalVelocity',
    'fisica.fijar_suelo_y': 'game_setGroundY',
    'fisica.suelo_y': 'game_groundY',

    // ── CÁMARA EXTENDIDA ──
    'camara.mover': 'game_cameraChangeXY',
    'camara.seguir_objetivo': 'game_cameraFollowTarget',
    'camara.fijar_zoom': 'game_cameraSetZoom',
    'camara.cambiar_zoom': 'game_cameraChangeZoom',
    'camara.zoom': 'game_cameraZoom',
    'camara.mundo_a_pantalla_x': 'game_worldToScreenX',
    'camara.mundo_a_pantalla_y': 'game_worldToScreenY',
    'camara.pantalla_a_mundo_x': 'game_screenToWorldX',
    'camara.pantalla_a_mundo_y': 'game_screenToWorldY',

    // ── SALUD Y COMBATE EXTENDIDO ──
    'sprite.salud_maxima': 'game_maxHealth',
    'sprite.salud_porcentaje': 'game_healthPercent',
    'sprite.fijar_dano_ataque': 'game_setAttackDamage',
    'sprite.atacar_si_toca': 'game_attackTargetIfTouching',
    'sprite.danar_objetivo': 'game_damageTarget',
    'sprite.hacer_invencible': 'game_setInvincible',
    'sprite.es_invencible': 'game_isInvincible',
    'sprite.retroceso_desde': 'game_knockbackFromTarget',
    'sprite.revivir': 'game_revive',
    'sprite.colocar_en_mundo': 'game_placeAtWorldXY',

    // ── ESCENARIO EXTENDIDO ──
    'escenario.ancho': 'sensing_stageWidth',
    'escenario.alto': 'sensing_stageHeight',

    // ── RATON EXTENDIDO ──
    'raton.velocidad': 'sensing_mouseSpeed',
    'raton.x_anterior': 'sensing_mousePreviousX',
    'raton.y_anterior': 'sensing_mousePreviousY',

    // ── CONTROL EXTENDIDO ──
    'conteo': 'control_countHere',

    // ── EVENTOS PRO ──
    'emitir_evento': 'event_emitCustom',
    'emitir_evento_con_datos': 'event_emitCustomWithData',
    'dato_evento': 'event_eventData',

    // ── ESTADOS ──
    'estado.cambiar': 'state_set',
    'estado.actual': 'state_current',
    'estado.anterior': 'state_previous',
    'estado.es': 'state_is',
    'estado.volver': 'state_back',
    'estado.reiniciar': 'state_reset',

    // ── DEBUG ──
    'debug.imprimir': 'debug_log',
    'debug.advertir': 'debug_warn',
    'debug.error': 'debug_error',
    'debug.pausar_si': 'debug_pauseIf',
    'debug.marcar': 'debug_mark',
    'debug.ms_desde': 'debug_msSinceMark',
    'debug.contar': 'debug_count',
    'debug.contador': 'debug_counter',

    // ── PRUEBAS ──
    'pruebas.afirmar_verdadero': 'test_assertTrue',
    'pruebas.afirmar_igual': 'test_assertEqual',
    'pruebas.afirmar_entre': 'test_assertBetween',
    'pruebas.reiniciar': 'test_reset',
    'pruebas.pasadas': 'test_passed',
    'pruebas.fallidas': 'test_failed',
    'pruebas.total': 'test_total',
    'pruebas.reporte': 'test_report',

    // ── IA ──
    'ia.mover_a_xy': 'game_aiMoveToXY',
    'ia.perseguir': 'game_aiMoveTowardTarget',
    'ia.huir_de': 'game_aiFleeFromTarget',
    'ia.mirar_a': 'game_aiFaceTarget',
    'ia.distancia_a': 'game_aiDistanceToTarget',
    'ia.en_rango': 'game_aiTargetInRange',
    'ia.patrullar_x': 'game_aiPatrolX',
    'ia.perseguir_si_rango': 'game_aiChaseIfInRange',
    'ia.mantener_distancia': 'game_aiKeepDistance',
    'ia.deambular': 'game_aiWander',
    'ia.cerca_de': 'game_aiStopNearTarget',

    // ── PROGRAMACION ──
    'limitado': 'logic_clamp',
    'mapeado': 'logic_map',
    'interpolar': 'logic_lerp',
    'distancia_puntos': 'logic_distance',
    'angulo_hacia': 'logic_angleTo',
    'redondear_decimales': 'logic_roundDecimals',
    'porcentaje': 'logic_percent',
    'signo': 'logic_sign',
    'reemplazar_texto': 'logic_textReplace',
    'json_obtener': 'logic_jsonGet',
    'json_poner': 'logic_jsonSet',
    'json_tiene': 'logic_jsonHas',
    'json_texto': 'logic_jsonStringify',
    'delta_tiempo': 'sensing_deltaTime',
    'fps': 'sensing_fps'
};

/**
 * Mapeo de inputs para cada opcode
 * COMPLETO: Incluye todos los bloques del modo Programación
 */
const OPCODE_INPUTS = {
    // ═══════════════════════════════════════════════════════════════
    // EVENTOS
    // ═══════════════════════════════════════════════════════════════
    'event_whenflagclicked': {},
    'event_whenkeypressed': {},  // KEY_OPTION es un field
    'event_whenthisspriteclicked': {},
    'event_whenbackdropswitchesto': {},  // BACKDROP es un field
    'event_whenbroadcastreceived': {},  // BROADCAST_OPTION es un field
    'event_whengreaterthan': { VALUE: 'number' },
    'event_broadcast': { BROADCAST_INPUT: 'string' },
    'event_broadcastandwait': { BROADCAST_INPUT: 'string' },
    'control_start_as_clone': {},

    // ═══════════════════════════════════════════════════════════════
    // MOVIMIENTO
    // ═══════════════════════════════════════════════════════════════
    'motion_movesteps': { STEPS: 'number' },
    'motion_turnright': { DEGREES: 'number' },
    'motion_turnleft': { DEGREES: 'number' },
    'motion_goto': { TO: 'string' },
    'motion_gotoxy': { X: 'number', Y: 'number' },
    'motion_glideto': { TO: 'string', SECS: 'number' },
    'motion_glidesecstoxy': { X: 'number', Y: 'number', SECS: 'number' },
    'motion_pointindirection': { DIRECTION: 'number' },
    'motion_pointtowards': { TOWARDS: 'string' },
    'motion_changexby': { DX: 'number' },
    'motion_changeyby': { DY: 'number' },
    'motion_setx': { X: 'number' },
    'motion_sety': { Y: 'number' },
    'motion_ifonedgebounce': {},
    'motion_setrotationstyle': { STYLE: 'string' },

    // ═══════════════════════════════════════════════════════════════
    // APARIENCIA
    // ═══════════════════════════════════════════════════════════════
    'looks_say': { MESSAGE: 'string' },
    'looks_sayforsecs': { MESSAGE: 'string', SECS: 'number' },
    'looks_think': { MESSAGE: 'string' },
    'looks_thinkforsecs': { MESSAGE: 'string', SECS: 'number' },
    'looks_switchcostumeto': { COSTUME: 'string' },
    'looks_nextcostume': {},
    'looks_switchbackdropto': { BACKDROP: 'string' },
    'looks_nextbackdrop': {},
    'looks_changesizeby': { CHANGE: 'number' },
    'looks_setsizeto': { SIZE: 'number' },
    'looks_changeeffectby': { EFFECT: 'string', CHANGE: 'number' },
    'looks_seteffectto': { EFFECT: 'string', VALUE: 'number' },
    'looks_cleargraphiceffects': {},
    'looks_show': {},
    'looks_hide': {},
    'looks_gotofrontback': { FRONT_BACK: 'string' },
    'looks_goforwardbackwardlayers': { FORWARD_BACKWARD: 'string', NUM: 'number' },

    // ═══════════════════════════════════════════════════════════════
    // SONIDO
    // ═══════════════════════════════════════════════════════════════
    'sound_play': { SOUND_MENU: 'sound' },
    'sound_playuntildone': { SOUND_MENU: 'sound' },
    'sound_stopallsounds': {},
    'sound_changevolumeby': { VOLUME: 'number' },
    'sound_setvolumeto': { VOLUME: 'number' },
    'sound_changeeffectby': { EFFECT: 'string', VALUE: 'number' },
    'sound_seteffectto': { EFFECT: 'string', VALUE: 'number' },
    'sound_cleareffects': {},

    // ═══════════════════════════════════════════════════════════════
    // CONTROL
    // ═══════════════════════════════════════════════════════════════
    'control_wait': { DURATION: 'number' },
    'control_repeat': { TIMES: 'number', SUBSTACK: 'substack' },
    'control_forever': { SUBSTACK: 'substack' },
    'control_if': { CONDITION: 'boolean', SUBSTACK: 'substack' },
    'control_if_else': { CONDITION: 'boolean', SUBSTACK: 'substack', SUBSTACK2: 'substack' },
    'control_wait_until': { CONDITION: 'boolean' },
    'control_repeat_until': { CONDITION: 'boolean', SUBSTACK: 'substack' },
    'control_stop': { STOP_OPTION: 'string' },
    'control_create_clone_of': { CLONE_OPTION: 'string' },
    'control_delete_this_clone': {},

    // ═══════════════════════════════════════════════════════════════
    // SENSORES
    // ═══════════════════════════════════════════════════════════════
    'sensing_touchingobject': { TOUCHINGOBJECTMENU: 'string' },
    'sensing_touchingcolor': { COLOR: 'color' },
    'sensing_coloristouchingcolor': { COLOR: 'color', COLOR2: 'color' },
    'sensing_distanceto': { DISTANCETOMENU: 'string' },
    'sensing_askandwait': { QUESTION: 'string' },
    'sensing_keypressed': { KEY_OPTION: 'key' },
    'sensing_setdragmode': { DRAG_MODE: 'string' },
    'sensing_resettimer': {},
    'sensing_of': { PROPERTY: 'string', OBJECT: 'string' },
    'sensing_current': { CURRENTMENU: 'string' },

    // ═══════════════════════════════════════════════════════════════
    // OPERADORES
    // ═══════════════════════════════════════════════════════════════
    'operator_random': { FROM: 'number', TO: 'number' },
    'operator_join': { STRING1: 'string', STRING2: 'string' },
    'operator_letter_of': { LETTER: 'number', STRING: 'string' },
    'operator_length': { STRING: 'string' },
    'operator_round': { NUM: 'number' },
    'operator_mathop': { OPERATOR: 'string', NUM: 'number' },

    // ═══════════════════════════════════════════════════════════════
    // VARIABLES
    // ═══════════════════════════════════════════════════════════════
    'data_setvariableto': { VARIABLE: 'variable', VALUE: 'any' },
    'data_changevariableby': { VARIABLE: 'variable', VALUE: 'number' },
    'data_showvariable': { VARIABLE: 'variable' },
    'data_hidevariable': { VARIABLE: 'variable' },

    // ═══════════════════════════════════════════════════════════════
    // LISTAS
    // ═══════════════════════════════════════════════════════════════
    'data_addtolist': { LIST: 'list', ITEM: 'any' },
    'data_deleteoflist': { LIST: 'list', INDEX: 'number' },
    'data_deletealloflist': { LIST: 'list' },
    'data_insertatlist': { LIST: 'list', INDEX: 'number', ITEM: 'any' },
    'data_replaceitemoflist': { LIST: 'list', INDEX: 'number', ITEM: 'any' },
    'data_itemnumoflist': { LIST: 'list', ITEM: 'any' },
    'data_showlist': { LIST: 'list' },
    'data_hidelist': { LIST: 'list' },

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES PERSONALIZADOS
    // ═══════════════════════════════════════════════════════════════
    'procedures_definition': { custom_block: 'string' },
    'procedures_call': { custom_block: 'string' },

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES DE JUEGO
    // ═══════════════════════════════════════════════════════════════
    // Física
    'game_jump': { FORCE: 'number' },
    'game_setGravity': { GRAVITY: 'number' },
    'game_applyGravity': {},
    'game_isOnGround': {},
    'game_isInAir': {},
    'game_setVelocity': { VX: 'number', VY: 'number' },
    'game_setVelocityX': { VX: 'number' },
    'game_setVelocityY': { VY: 'number' },
    // Salud
    'game_setHealth': { HEALTH: 'number' },
    'game_changeHealth': { AMOUNT: 'number' },
    'game_setMaxHealth': { MAX: 'number' },
    'game_damageSelf': { AMOUNT: 'number' },
    'game_healSelf': { AMOUNT: 'number' },
    'game_isAlive': {},
    'game_isDead': {},
    // Cámara
    'game_cameraFollowThis': {},
    'game_cameraSetXY': { X: 'number', Y: 'number' },
    'game_cameraShake': { INTENSITY: 'number', DURATION: 'number' },
    'game_cameraZoom': { ZOOM: 'number' },
    // Colisiones
    'game_onCollision': { TARGET: 'string' },
    'game_isCollidingWith': { TARGET: 'string' },

    // ── GRAVEDAD ──
    'game_changeGravity': { GRAVITY: 'number' },
    'game_gravity': {},
    'game_setTerminalVelocity': { VELOCITY: 'number' },
    'game_terminalVelocity': {},
    'game_setGroundY': { Y: 'number' },
    'game_groundY': {},
    'game_setAirControl': { AMOUNT: 'number' },
    'game_resetPhysics': {},

    // ── FÍSICA ──
    'game_changeVelocity': { VX: 'number', VY: 'number' },
    'game_velocityX': {},
    'game_velocityY': {},
    'game_setAcceleration': { AX: 'number', AY: 'number' },
    'game_applyVelocity': {},
    'game_setFriction': { FRICTION: 'number' },
    'game_setBounce': { BOUNCE: 'number' },
    'game_applyForce': { FORCE: 'number', DIRECTION: 'number' },
    'game_stopMotion': { AXIS: 'string' },
    'game_clampToStage': {},
    'game_bounceOnStageEdge': {},
    'game_speed': {},
    'game_setMass': { MASS: 'number' },

    // ── CÁMARA ──
    'game_cameraChangeXY': { X: 'number', Y: 'number' },
    'game_cameraFollowTarget': { TARGET: 'string', STRENGTH: 'number' },
    'game_cameraSetZoom': { ZOOM: 'number' },
    'game_cameraChangeZoom': { ZOOM: 'number' },
    'game_cameraX': {},
    'game_cameraY': {},
    'game_worldToScreenX': { X: 'number' },
    'game_worldToScreenY': { Y: 'number' },
    'game_screenToWorldX': { X: 'number' },
    'game_screenToWorldY': { Y: 'number' },
    'game_placeAtWorldXY': { X: 'number', Y: 'number' },

    // ── IA ──
    'game_aiMoveToXY': { X: 'number', Y: 'number', SPEED: 'number' },
    'game_aiMoveTowardTarget': { TARGET: 'string', SPEED: 'number' },
    'game_aiFleeFromTarget': { TARGET: 'string', SPEED: 'number' },
    'game_aiFaceTarget': { TARGET: 'string' },
    'game_aiDistanceToTarget': { TARGET: 'string' },
    'game_aiTargetInRange': { TARGET: 'string', RANGE: 'number' },
    'game_aiPatrolX': { X1: 'number', X2: 'number', SPEED: 'number' },
    'game_aiChaseIfInRange': { TARGET: 'string', RANGE: 'number', SPEED: 'number' },
    'game_aiKeepDistance': { TARGET: 'string', MIN: 'number', MAX: 'number', SPEED: 'number' },
    'game_aiWander': { SPEED: 'number' },
    'game_aiStopNearTarget': { TARGET: 'string', DISTANCE: 'number' },

    // ── COMBATE ──
    'game_health': {},
    'game_healthPercent': {},
    'game_setAttackDamage': { AMOUNT: 'number' },
    'game_attackTargetIfTouching': { TARGET: 'string' },
    'game_damageTarget': { AMOUNT: 'number', TARGET: 'string' },
    'game_setInvincible': { SECS: 'number' },
    'game_isInvincible': {},
    'game_knockbackFromTarget': { TARGET: 'string', FORCE: 'number' },
    'game_revive': { HEALTH: 'number' },
    'game_maxHealth': {},

    // ── SENSORES EXTENDIDOS ──
    'sensing_deltaTime': {},
    'sensing_fps': {},
    'sensing_stageWidth': {},
    'sensing_stageHeight': {},
    'sensing_mouseSpeed': {},
    'sensing_mousePreviousX': {},
    'sensing_mousePreviousY': {},

    // ── CONTROL EXTENDIDO ──
    'control_waitUntilTimeout': { CONDITION: 'boolean', SECS: 'number' },
    'control_everySeconds': { SECS: 'number', SUBSTACK: 'substack' },
    'control_forSeconds': { SECS: 'number', SUBSTACK: 'substack' },
    'control_countHere': { NAME: 'string' },

    // ── EVENTOS PRO ──
    'event_everyFrame': { SUBSTACK: 'substack' },
    'event_everySeconds': { SECS: 'number', SUBSTACK: 'substack' },
    'event_whenCustom': { NAME: 'string', SUBSTACK: 'substack' },
    'event_emitCustom': { NAME: 'string' },
    'event_emitCustomWithData': { NAME: 'string', DATA: 'any' },
    'event_eventData': { NAME: 'string' },

    // ── ESTADOS ──
    'state_set': { NAME: 'string' },
    'state_current': {},
    'state_previous': {},
    'state_is': { NAME: 'string' },
    'state_back': {},
    'state_reset': {},

    // ── DEBUG ──
    'debug_log': { VALUE: 'any' },
    'debug_warn': { VALUE: 'any' },
    'debug_error': { VALUE: 'any' },
    'debug_pauseIf': { CONDITION: 'boolean' },
    'debug_mark': { NAME: 'string' },
    'debug_msSinceMark': { NAME: 'string' },
    'debug_count': { NAME: 'string' },
    'debug_counter': { NAME: 'string' },

    // ── PRUEBAS ──
    'test_assertTrue': { CONDITION: 'boolean', NAME: 'string' },
    'test_assertEqual': { VALUE: 'any', EXPECTED: 'any', NAME: 'string' },
    'test_assertBetween': { VALUE: 'number', MIN: 'number', MAX: 'number', NAME: 'string' },
    'test_reset': {},
    'test_passed': {},
    'test_failed': {},
    'test_total': {},
    'test_report': {},

    // ── PROGRAMACION ──
    'logic_true': [],
    'logic_false': [],
    'logic_xor': ['A', 'B'],
    'logic_implies': ['A', 'B'],
    'logic_equalStrict': ['A', 'B'],
    'logic_between': ['VALUE', 'MIN', 'MAX'],
    'logic_outside': ['VALUE', 'MIN', 'MAX'],
    'logic_clamp': ['VALUE', 'MIN', 'MAX'],
    'logic_map': ['VALUE', 'IN_MIN', 'IN_MAX', 'OUT_MIN', 'OUT_MAX'],
    'logic_lerp': ['A', 'B', 'T'],
    'logic_distance': ['X1', 'Y1', 'X2', 'Y2'],
    'logic_angleTo': ['X1', 'Y1', 'X2', 'Y2'],
    'logic_roundDecimals': ['VALUE', 'DECIMALS'],
    'logic_percent': ['PART', 'TOTAL'],
    'logic_sign': ['VALUE'],
    'logic_textContains': ['TEXT', 'PART'],
    'logic_textStarts': ['TEXT', 'PART'],
    'logic_textEnds': ['TEXT', 'PART'],
    'logic_textReplace': ['TEXT', 'FIND', 'REPLACE'],
    'logic_toNumber': ['VALUE'],
    'logic_toText': ['VALUE'],

    // ── DATOS AVANZADOS ──
    'logic_jsonGet': ['JSON', 'KEY'],
    'logic_jsonSet': ['JSON', 'KEY', 'VALUE'],
    'logic_jsonHas': ['JSON', 'KEY'],
    'logic_jsonStringify': ['VALUE'],
    'logic_listFromText': ['TEXT', 'SEP'],
    'logic_listJoin': ['LIST', 'SEP'],
    'logic_listLength': ['LIST'],
    'logic_listItem': ['INDEX', 'LIST'],
    'logic_listContains': ['LIST', 'VALUE'],

    // ── CONTROL EXTENDIDO ──
    'control_waitUntilTimeout': ['CONDITION', 'SECS'],
    'control_everySeconds': ['SECS', 'SUBSTACK'],
    'control_forSeconds': ['SECS', 'SUBSTACK'],
    'control_countHere': ['NAME'],

    // ── SENSORES EXTENDIDOS ──
    'sensing_deltaTime': [],
    'sensing_fps': [],
    'sensing_stageWidth': [],
    'sensing_stageHeight': [],
    'sensing_mouseSpeed': [],
    'sensing_mousePreviousX': [],
    'sensing_mousePreviousY': [],

    // ── EVENTOS PRO ──
    'event_everyFrame': [],
    'event_everySeconds': ['SECS'],
    'event_whenCustom': ['NAME'],
    'event_emitCustom': ['NAME'],
    'event_emitCustomWithData': ['NAME', 'DATA'],
    'event_eventData': ['NAME'],

    // ── ESTADOS ──
    'state_set': ['NAME'],
    'state_current': [],
    'state_previous': [],
    'state_is': ['NAME'],
    'state_back': [],
    'state_reset': [],

    // ── DEBUG ──
    'debug_log': ['VALUE'],
    'debug_warn': ['VALUE'],
    'debug_error': ['VALUE'],
    'debug_pauseIf': ['CONDITION'],
    'debug_mark': ['NAME'],
    'debug_msSinceMark': ['NAME'],
    'debug_count': ['NAME'],
    'debug_counter': ['NAME'],

    // ── PRUEBAS ──
    'test_assertTrue': ['CONDITION', 'NAME'],
    'test_assertEqual': ['VALUE', 'EXPECTED', 'NAME'],
    'test_assertBetween': ['VALUE', 'MIN', 'MAX', 'NAME'],
    'test_reset': [],
    'test_passed': [],
    'test_failed': [],
    'test_total': [],
    'test_report': [],

    // ── GRAVEDAD ──
    'game_changeGravity': ['GRAVITY'],
    'game_gravity': [],
    'game_setTerminalVelocity': ['VELOCITY'],
    'game_terminalVelocity': [],
    'game_setGroundY': ['Y'],
    'game_groundY': [],
    'game_setAirControl': ['AMOUNT'],
    'game_resetPhysics': [],

    // ── FÍSICA ──
    'game_changeVelocity': ['VX', 'VY'],
    'game_velocityX': [],
    'game_velocityY': [],
    'game_setAcceleration': ['AX', 'AY'],
    'game_applyVelocity': [],
    'game_setFriction': ['FRICTION'],
    'game_setBounce': ['BOUNCE'],
    'game_applyForce': ['FORCE', 'DIRECTION'],
    'game_stopMotion': ['AXIS'],
    'game_clampToStage': [],
    'game_bounceOnStageEdge': [],
    'game_speed': [],
    'game_setMass': ['MASS'],

    // ── CÁMARA ──
    'game_cameraChangeXY': ['X', 'Y'],
    'game_cameraFollowTarget': ['TARGET', 'STRENGTH'],
    'game_cameraSetZoom': ['ZOOM'],
    'game_cameraChangeZoom': ['ZOOM'],
    'game_cameraX': [],
    'game_cameraY': [],
    'game_worldToScreenX': ['X'],
    'game_worldToScreenY': ['Y'],
    'game_screenToWorldX': ['X'],
    'game_screenToWorldY': ['Y'],
    'game_placeAtWorldXY': ['X', 'Y'],

    // ── IA ──
    'game_aiMoveToXY': ['X', 'Y', 'SPEED'],
    'game_aiMoveTowardTarget': ['TARGET', 'SPEED'],
    'game_aiFleeFromTarget': ['TARGET', 'SPEED'],
    'game_aiFaceTarget': ['TARGET'],
    'game_aiDistanceToTarget': ['TARGET'],
    'game_aiTargetInRange': ['TARGET', 'RANGE'],
    'game_aiPatrolX': ['X1', 'X2', 'SPEED'],
    'game_aiChaseIfInRange': ['TARGET', 'RANGE', 'SPEED'],
    'game_aiKeepDistance': ['TARGET', 'MIN', 'MAX', 'SPEED'],
    'game_aiWander': ['SPEED'],
    'game_aiStopNearTarget': ['TARGET', 'DISTANCE'],

    // ── COMBATE ──
    'game_health': [],
    'game_healthPercent': [],
    'game_setAttackDamage': ['AMOUNT'],
    'game_attackTargetIfTouching': ['TARGET'],
    'game_damageTarget': ['AMOUNT', 'TARGET'],
    'game_setInvincible': ['SECS'],
    'game_isInvincible': [],
    'game_knockbackFromTarget': ['TARGET', 'FORCE'],
    'game_revive': ['HEALTH'],
    'game_maxHealth': [],
};

/**
 * Valida los argumentos de una función contra los tipos esperados
 * @returns {Array<CodeError>} Lista de errores encontrados
 */
function validateFunctionArguments(funcName, args, lineNumber) {
    const errors = [];
    const opcode = PYTHON_TO_OPCODE[funcName];

    if (!opcode) {
        return errors; // No podemos validar funciones desconocidas aquí
    }

    const inputDefs = OPCODE_INPUTS[opcode] || {};
    const inputNames = Object.keys(inputDefs).filter(name => !name.startsWith('SUBSTACK'));
    const expectedArgCount = inputNames.length;

    // Verificar cantidad de argumentos
    if (args.length < expectedArgCount) {
        const missing = expectedArgCount - args.length;
        errors.push(new CodeError(
            ERROR_TYPES.MISSING_ARGUMENT,
            `Faltan ${missing} argumento(s) en ${funcName}(). Se esperan ${expectedArgCount}.`,
            lineNumber,
            0,
            `${funcName}(${inputNames.map(n => n.toLowerCase()).join(', ')})`
        ));
    } else if (args.length > expectedArgCount && expectedArgCount > 0) {
        errors.push(new CodeError(
            ERROR_TYPES.EXTRA_ARGUMENT,
            `Demasiados argumentos en ${funcName}(). Se esperan ${expectedArgCount}, se recibieron ${args.length}.`,
            lineNumber
        ));
    }

    // Verificar tipos de argumentos
    for (let i = 0; i < Math.min(args.length, inputNames.length); i++) {
        const inputName = inputNames[i];
        const expectedType = inputDefs[inputName];
        const arg = args[i];

        if (expectedType === 'number' && arg.type === 'string') {
            // Error de tipo: se esperaba número pero se recibió string
            errors.push(new CodeError(
                ERROR_TYPES.TYPE_ERROR,
                `Error de tipo en ${funcName}(): El argumento "${inputName}" debe ser un número, no un texto "${arg.value}".`,
                lineNumber,
                0,
                `Usa un número como: ${funcName}(10)`
            ));
        } else if (expectedType === 'string' && arg.type === 'number' && funcName !== 'sprite.mover') {
            // Advertencia suave para strings (números suelen ser aceptables)
        }
    }

    return errors;
}

/**
 * Valida una expresión de condición (dentro de if, while, etc.)
 * Retorna lista de errores encontrados
 */
function validateCondition(conditionStr, lineNumber) {
    const errors = [];
    if (!conditionStr) {
        return errors;
    }

    // Literales booleanos: no hay nada que validar
    if (conditionStr === 'True' || conditionStr === 'true' ||
        conditionStr === 'False' || conditionStr === 'false') {
        return errors;
    }

    // Quitar un "not " inicial: la validación debe mirar la condición interna.
    // Evita falso positivo "Función desconocida en condición: 'not'" en
    // "while not (x < 5):" o "if not sprite.tocando('borde'):"
    let cond = conditionStr.trim();
    const notMatch = cond.match(/^not\s+(.+)$/i);
    if (notMatch) {
        cond = stripOuterParens(notMatch[1]);
    }

    // Buscar llamadas a métodos de objetos en la condición
    // Patrones como sprite.tocando("..."), sprite.en_suelo(), etc.
    const methodCallPattern = /(\w+)\.(\w+)\s*\(/g;
    let methodMatch;
    while ((methodMatch = methodCallPattern.exec(cond)) !== null) {
        const objName = methodMatch[1];
        const methodName = methodMatch[2];
        const error = validateObjectMethod(objName, methodName, lineNumber);
        if (error) {
            errors.push(error);
        }
    }

    // Buscar funciones simples como tecla_presionada("...")
    const funcPattern = /^(\w+)\s*\(/;
    const funcMatch = cond.match(funcPattern);
    if (funcMatch && !funcMatch[1].includes('.')) {
        const funcName = funcMatch[1];
        // Verificar si es una función conocida
        if (!PYTHON_TO_OPCODE[funcName] && !KNOWN_FUNCTIONS.includes(funcName)) {
            const suggestion = findSimilarFunction(funcName);
            errors.push(new CodeError(
                ERROR_TYPES.UNKNOWN_FUNCTION,
                `Función desconocida en condición: "${funcName}"`,
                lineNumber,
                0,
                suggestion ? `¿Quisiste decir "${suggestion}"?` : null
            ));
        }
    }

    return errors;
}

/**
 * Valida una línea de código Python y retorna errores encontrados
 */
function validatePythonLine(line, lineNumber, userDefinedFunctions = new Set()) {
    const errors = [];
    const trimmed = line.trim();

    // Ignorar líneas vacías, comentarios e imports
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('from ') || trimmed.startsWith('import ')) {
        return errors;
    }

    // Detectar errores de indentación (tabs mezclados con espacios)
    if (line.includes('\t') && line.includes('    ')) {
        errors.push(new CodeError(
            ERROR_TYPES.INDENT_ERROR,
            'Mezcla de tabs y espacios en la indentación. Usa solo espacios.',
            lineNumber
        ));
    }

    // ===== VALIDAR CONDICIONES EN IF/WHILE =====
    const ifMatch = trimmed.match(/^(?:if|si)\s+(.+)\s*:\s*$/);
    if (ifMatch) {
        const conditionErrors = validateCondition(ifMatch[1], lineNumber);
        errors.push(...conditionErrors);
        return errors; // No validar más, ya procesamos la línea
    }

    const whileMatch = trimmed.match(/^while\s+(.+)\s*:\s*$/);
    if (whileMatch && whileMatch[1] !== 'True') {
        const conditionErrors = validateCondition(whileMatch[1], lineNumber);
        errors.push(...conditionErrors);
        return errors;
    }

    // ===== VALIDAR LLAMADAS A FUNCIONES =====
    // Patrón: objeto.metodo(args) o funcion(args)
    const funcPattern = /^(\w+)\.(\w+)\s*\((.*)\)\s*$/;
    const objMethodMatch = trimmed.match(funcPattern);

    if (objMethodMatch) {
        const objName = objMethodMatch[1];
        const methodName = objMethodMatch[2];
        const argsString = objMethodMatch[3];
        const fullFuncName = `${objName}.${methodName}`;

        // Validar método del objeto
        const methodError = validateObjectMethod(objName, methodName, lineNumber);
        if (methodError) {
            errors.push(methodError);
        } else if (PYTHON_TO_OPCODE[fullFuncName]) {
            // Validar argumentos si es una función conocida
            const args = parseArguments(argsString);
            const argErrors = validateFunctionArguments(fullFuncName, args, lineNumber);
            errors.push(...argErrors);
        }
    } else {
        // Verificar funciones simples (sin objeto)
        const simpleFuncPattern = /^(\w+)\s*\((.*)\)\s*$/;
        const simpleFuncMatch = trimmed.match(simpleFuncPattern);

        if (simpleFuncMatch) {
            const funcName = simpleFuncMatch[1];
            const argsString = simpleFuncMatch[2];

            // Ignorar definiciones de funciones y palabras clave
            if (!['def', 'class', 'for', 'if', 'while', 'else', 'elif', 'repetir', 'si'].includes(funcName)) {
                // Verificar si es una función conocida o definida por el usuario
                if (!PYTHON_TO_OPCODE[funcName] && !userDefinedFunctions.has(funcName)) {
                    // Buscar sugerencia
                    const suggestion = findSimilarFunction(funcName);
                    let message = `Función desconocida: "${funcName}"`;

                    if (suggestion) {
                        message += `. ¿Quisiste decir "${suggestion}"?`;
                    }

                    errors.push(new CodeError(
                        ERROR_TYPES.UNKNOWN_FUNCTION,
                        message,
                        lineNumber,
                        0,
                        suggestion
                    ));
                } else {
                    // Validar argumentos
                    const args = parseArguments(argsString);
                    const argErrors = validateFunctionArguments(funcName, args, lineNumber);
                    errors.push(...argErrors);
                }
            }
        }
    }

    // Verificar errores de sintaxis comunes
    if (trimmed.endsWith('::')) {
        errors.push(new CodeError(
            ERROR_TYPES.SYNTAX_ERROR,
            'Doble dos puntos (::) al final de la línea. Usa solo uno (:).',
            lineNumber
        ));
    }

    if (trimmed.includes('deff ') || trimmed.includes('iff ') || trimmed.includes('whilee ')) {
        errors.push(new CodeError(
            ERROR_TYPES.SYNTAX_ERROR,
            'Posible error tipográfico en palabra clave.',
            lineNumber
        ));
    }

    // Verificar paréntesis no balanceados
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        errors.push(new CodeError(
            ERROR_TYPES.SYNTAX_ERROR,
            `Paréntesis no balanceados: ${openParens} abiertos, ${closeParens} cerrados.`,
            lineNumber
        ));
    }

    return errors;
}

/**
 * ¿Un bloque terminado en ":" puede quedar VACÍO sin ser error?
 * - "def f():" → válido (Scratch permite procedimientos sin cuerpo).
 * - "por_siempre:" / "while true:" → válido (bloque "por siempre" acepta
 *   substack vacío).
 * - "while <condición constante>:" → válido. La condición es evaluable en
 *   tiempo de compilación y el bloque resultante ("por siempre" o "repetir
 *   hasta que" con condición constante) es válido en Scratch sin cuerpo.
 * Cualquier otro bloque (if, for, while con condición variable) SÍ exige cuerpo.
 */
function isExemptEmptyBlock(blockText) {
    const text = blockText.trim();
    if (text.startsWith('def ')) return true;
    if (/^por_siempre\s*:\s*$/.test(text)) return true;
    const whileM = text.match(/^while\s+(.+)\s*:\s*$/);
    // "while true:" → por siempre; "while not 1 == 0:" / "while 1 == 1:" →
    // repetir-hasta-que con condición constante. Ninguno necesita cuerpo.
    if (whileM && isConstantTrue(whileM[1]) !== null) return true;
    return false;
}

/**
 * Valida código Python completo y retorna todos los errores
 */
export function validatePythonCode(pythonCode) {
    const lines = pythonCode.split('\n');
    const allErrors = [];

    // Primera pasada: recolectar nombres de funciones definidas por el usuario (def nombre(...))
    const userDefinedFunctions = new Set();
    const defPattern = /^\s*def\s+(\w+)\s*\(/;
    for (let i = 0; i < lines.length; i++) {
        const defMatch = lines[i].match(defPattern);
        if (defMatch) {
            userDefinedFunctions.add(defMatch[1]);
        }
    }

    // Validar líneas individualmente primero
    for (let i = 0; i < lines.length; i++) {
        const lineErrors = validatePythonLine(lines[i], i + 1, userDefinedFunctions);
        allErrors.push(...lineErrors);
    }

    // Validar estructura de indentación (Reglas de Indentación de Python)
    try {
        const indentStack = [0];
        let lastBlockLine = null;
        let lastBlockText = '';
        let lastBlockIndent = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const lineNumber = i + 1;

            // Ignorar líneas vacías y comentarios
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const currentIndent = getIndentLevel(line);

            // Caso 1: La línea anterior iniciaba un bloque (terminaba con ':')
            if (lastBlockLine !== null) {
                if (currentIndent <= lastBlockIndent) {
                    // 'def' vacío y "por siempre" vacío son válidos (bloques sin cuerpo)
                    // No marcar error si la línea pendiente es uno de esos
                    if (!isExemptEmptyBlock(lastBlockText)) {
                        allErrors.push(new CodeError(
                            ERROR_TYPES.INDENT_ERROR,
                            `IndentationError: se esperaba un bloque indentado después de la declaración en la línea ${lastBlockLine}: "${lastBlockText}"`,
                            lineNumber
                        ));
                    }
                    // Recuperar para seguir validando el resto del código
                    lastBlockLine = null;
                } else {
                    // Indentación correcta, agregar el nuevo nivel a la pila
                    indentStack.push(currentIndent);
                    lastBlockLine = null;
                }
            } else {
                // Caso 2: No venimos de un inicio de bloque, pero la indentación cambió
                const lastIndent = indentStack[indentStack.length - 1];

                if (currentIndent > lastIndent) {
                    // Si se aumenta la indentación sin un ':' previo, es un error
                    allErrors.push(new CodeError(
                        ERROR_TYPES.INDENT_ERROR,
                        `IndentationError: indentación inesperada. Solo puedes aumentar la indentación después de dos puntos (:).`,
                        lineNumber
                    ));
                } else if (currentIndent < lastIndent) {
                    // Desindentación: debe coincidir con algún nivel previo en la pila
                    while (indentStack.length > 0 && indentStack[indentStack.length - 1] > currentIndent) {
                        indentStack.pop();
                    }

                    const matchingIndent = indentStack[indentStack.length - 1];
                    if (matchingIndent !== currentIndent) {
                        allErrors.push(new CodeError(
                            ERROR_TYPES.INDENT_ERROR,
                            `IndentationError: la desindentación no coincide con ningún nivel de indentación anterior.`,
                            lineNumber
                        ));
                    }
                }
            }

            // Registrar si la línea actual inicia un bloque para validar la siguiente
            if (trimmed.endsWith(':')) {
                lastBlockLine = lineNumber;
                lastBlockText = trimmed;
                lastBlockIndent = currentIndent;
            }
        }

        // Caso especial: El archivo termina con una declaración de bloque vacía
        // 'def' vacío y "por siempre" vacío no se marcan como error (válidos en Scratch)
        if (lastBlockLine !== null && !isExemptEmptyBlock(lastBlockText)) {
            allErrors.push(new CodeError(
                ERROR_TYPES.INDENT_ERROR,
                `IndentationError: se esperaba un bloque indentado al final del archivo después de la línea ${lastBlockLine}: "${lastBlockText}"`,
                lines.length
            ));
        }
    } catch (e) {
        console.warn('[Validation] Error validando indentación:', e);
    }

    return allErrors;
}

/**
 * Parsea una línea de código Python y extrae la llamada a función, evento o estructura de control
 */
function parsePythonLine(line) {
    const trimmed = line.trim();

    // Ignorar líneas vacías y comentarios
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    // Ignorar imports
    if (trimmed.startsWith('from ') || trimmed.startsWith('import ')) {
        return null;
    }

    // ===== ESTRUCTURAS DE CONTROL =====

    // Detectar "while true:" / "while True:" → por siempre.
    // SOLO el literal booleano true (case-insensitive) genera "por siempre".
    // Otras condiciones constantes (while not 1 == 0:, while 1 == 1:) NO generan
    // "por siempre": siguen la regla general `while X:` → "repetir hasta que (not X)".
    const whileForeverMatch = trimmed.match(/^while\s+(.+)\s*:\s*$/);
    if (whileForeverMatch && /^true$/i.test(whileForeverMatch[1].trim())) {
        return {
            function: '__control_forever__',
            arguments: [],
            raw: trimmed,
            isControl: true,
            controlType: 'forever'
        };
    }
    // "por_siempre:" explícito en español
    if (/^por_siempre\s*:\s*$/.test(trimmed)) {
        return {
            function: '__control_forever__',
            arguments: [],
            raw: trimmed,
            isControl: true,
            controlType: 'forever'
        };
    }

    // Detectar "for _ in range(N):" o "repetir(N):" → control_repeat
    const forRangeMatch = trimmed.match(/^for\s+\w+\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:\s*$/);
    if (forRangeMatch) {
        return {
            function: '__control_repeat__',
            arguments: [{ type: 'number', value: parseInt(forRangeMatch[1]) }],
            raw: trimmed,
            isControl: true,
            controlType: 'repeat'
        };
    }

    // Detectar "repetir(N):" en español
    const repetirMatch = trimmed.match(/^repetir\s*\(\s*(\d+)\s*\)\s*:\s*$/);
    if (repetirMatch) {
        return {
            function: '__control_repeat__',
            arguments: [{ type: 'number', value: parseInt(repetirMatch[1]) }],
            raw: trimmed,
            isControl: true,
            controlType: 'repeat'
        };
    }

    // Detectar "while condición:" → control_repeat_until (repetir hasta que).
    // Scratch "repetir hasta que X" equivale a Python "while not X" (ver
    // block-mappings.js), así que la condición del bloque se NIEGA. Si la
    // condición ya empieza con "not ", se simplifica la doble negación.
    const whileCondMatch = trimmed.match(/^while\s+(.+)\s*:\s*$/);
    if (whileCondMatch) {
        // Quitar UN par de paréntesis externos: (x < 5) → x < 5
        // (sin truncar cadenas que solo terminen en ")" como sprite.tocando("x"))
        let whileCond = stripOuterParens(whileCondMatch[1]);
        const notWhile = whileCond.match(/^not\s+(.+)$/i);
        const negatedCond = notWhile ?
            stripOuterParens(notWhile[1]) :
            `not (${whileCond})`;
        return {
            function: '__control_repeat_until__',
            arguments: [{ type: 'condition', value: negatedCond }],
            raw: trimmed,
            isControl: true,
            controlType: 'repeat_until'
        };
    }

    // Detectar "if condición:" → control_if
    const ifMatch = trimmed.match(/^if\s+(.+)\s*:\s*$/);
    if (ifMatch) {
        return {
            function: '__control_if__',
            arguments: [{ type: 'condition', value: ifMatch[1] }],
            raw: trimmed,
            isControl: true,
            controlType: 'if'
        };
    }

    // Detectar "si condición:" en español
    const siMatch = trimmed.match(/^si\s+(.+)\s*:\s*$/);
    if (siMatch) {
        return {
            function: '__control_if__',
            arguments: [{ type: 'condition', value: siMatch[1] }],
            raw: trimmed,
            isControl: true,
            controlType: 'if'
        };
    }

    // Detectar "else:" o "sino:" → marca rama else
    if (/^else\s*:\s*$/.test(trimmed) || /^sino\s*:\s*$/.test(trimmed)) {
        return {
            function: '__else__',
            arguments: [],
            raw: trimmed,
            isElse: true
        };
    }

    // Detectar "elif condición:" o "sino_si condición:" → si-sino con condición
    const elifMatch = trimmed.match(/^elif\s+(.+)\s*:\s*$/) || trimmed.match(/^sino_si\s+(.+)\s*:\s*$/);
    if (elifMatch) {
        return {
            function: '__elif__',
            arguments: [{ type: 'condition', value: elifMatch[1] }],
            raw: trimmed,
            isElif: true
        };
    }

    // ===== DECORADORES DE EVENTOS =====

    // Detectar decoradores @cuando_... (eventos)
    // @cuando_bandera_verde
    if (/^@cuando_bandera_verde\s*$/.test(trimmed)) {
        return { function: '__decorator_flag__', isDecorator: true, raw: trimmed };
    }

    // @cuando_tecla("espacio")
    const decoratorKeyMatch = trimmed.match(/^@cuando_tecla\s*\(\s*["'](.+?)["']\s*\)\s*$/);
    if (decoratorKeyMatch) {
        return {
            function: '__decorator_key__',
            arguments: [{ type: 'string', value: decoratorKeyMatch[1] }],
            isDecorator: true,
            raw: trimmed
        };
    }

    // @cuando_sprite_clickeado
    if (/^@cuando_sprite_clickeado\s*$/.test(trimmed)) {
        return { function: '__decorator_click__', isDecorator: true, raw: trimmed };
    }

    // @cuando_reciba("mensaje")
    const decoratorReceiveMatch = trimmed.match(/^@cuando_reciba\s*\(\s*["'](.+?)["']\s*\)\s*$/);
    if (decoratorReceiveMatch) {
        return {
            function: '__event_broadcast_received__',
            arguments: [{ type: 'string', value: decoratorReceiveMatch[1] }],
            isEvent: true,
            raw: trimmed
        };
    }

    // @cuando_fondo_cambia_a("fondo")
    const decoratorBackdropMatch = trimmed.match(/^@cuando_fondo_cambia_a\s*\(\s*["'](.+?)["']\s*\)\s*$/);
    if (decoratorBackdropMatch) {
        return {
            function: '__event_backdrop__',
            arguments: [{ type: 'string', value: decoratorBackdropMatch[1] }],
            isEvent: true,
            raw: trimmed
        };
    }

    // @cuando_comience_como_clon
    if (/^@cuando_comience_como_clon\s*$/.test(trimmed)) {
        return { function: '__event_clone_start__', isEvent: true, raw: trimmed };
    }

    // @cuando_colisiona("sprite")
    const decoratorCollisionMatch = trimmed.match(/^@cuando_colisiona\s*\(\s*["'](.+?)["']\s*\)\s*$/);
    if (decoratorCollisionMatch) {
        return {
            function: '__event_collision__',
            arguments: [{ type: 'string', value: decoratorCollisionMatch[1] }],
            isEvent: true,
            raw: trimmed
        };
    }

    // ===== VARIABLES =====

    // Detectar asignación de variable: variable = valor
    const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch && !trimmed.includes('==')) {
        const varName = assignMatch[1];
        const value = assignMatch[2].trim();
        // Ignorar si es una función def o asignación de lista
        if (!['def', 'class', 'for', 'if', 'while', 'else', 'elif'].includes(varName)) {
            return {
                function: '__set_variable__',
                arguments: [
                    { type: 'variable', value: varName },
                    parseValue(value)
                ],
                raw: trimmed
            };
        }
    }

    // Detectar cambio de variable: variable += valor o variable -= valor
    const changeMatch = trimmed.match(/^(\w+)\s*(\+|-)\s*=\s*(.+)$/);
    if (changeMatch) {
        const varName = changeMatch[1];
        const operator = changeMatch[2];
        const value = changeMatch[3].trim();
        const numValue = operator === '-' ? -parseFloat(value) : parseFloat(value);
        return {
            function: '__change_variable__',
            arguments: [
                { type: 'variable', value: varName },
                { type: 'number', value: isNaN(numValue) ? 0 : numValue }
            ],
            raw: trimmed
        };
    }

    // ===== LISTAS =====

    // Detectar lista.agregar(item)
    const listAddMatch = trimmed.match(/^(\w+)\.agregar\s*\((.*)\)\s*$/);
    if (listAddMatch) {
        return {
            function: '__list_add__',
            arguments: [
                { type: 'list', value: listAddMatch[1] },
                parseValue(listAddMatch[2].trim())
            ],
            raw: trimmed
        };
    }

    // Detectar lista.eliminar(index)
    const listDeleteMatch = trimmed.match(/^(\w+)\.eliminar\s*\((.*)\)\s*$/);
    if (listDeleteMatch) {
        return {
            function: '__list_delete__',
            arguments: [
                { type: 'list', value: listDeleteMatch[1] },
                { type: 'number', value: parseInt(listDeleteMatch[2]) || 1 }
            ],
            raw: trimmed
        };
    }

    // Detectar lista.limpiar()
    const listClearMatch = trimmed.match(/^(\w+)\.limpiar\s*\(\s*\)\s*$/);
    if (listClearMatch) {
        return {
            function: '__list_clear__',
            arguments: [{ type: 'list', value: listClearMatch[1] }],
            raw: trimmed
        };
    }

    // Detectar lista.insertar(index, item)
    const listInsertMatch = trimmed.match(/^(\w+)\.insertar\s*\(\s*(\d+)\s*,\s*(.*)\)\s*$/);
    if (listInsertMatch) {
        return {
            function: '__list_insert__',
            arguments: [
                { type: 'list', value: listInsertMatch[1] },
                { type: 'number', value: parseInt(listInsertMatch[2]) },
                parseValue(listInsertMatch[3].trim())
            ],
            raw: trimmed
        };
    }

    // Detectar lista[index] = valor
    const listReplaceMatch = trimmed.match(/^(\w+)\s*\[\s*(\d+)\s*\]\s*=\s*(.+)$/);
    if (listReplaceMatch) {
        return {
            function: '__list_replace__',
            arguments: [
                { type: 'list', value: listReplaceMatch[1] },
                { type: 'number', value: parseInt(listReplaceMatch[2]) },
                parseValue(listReplaceMatch[3].trim())
            ],
            raw: trimmed
        };
    }

    // ===== DEFINICIONES DE FUNCIONES (EVENTOS Y PROCEDIMIENTOS) =====

    // Detectar definiciones de funciones especiales (eventos)
    // def inicio(): → cuando bandera verde
    // def al_presionar_espacio(): → cuando se presiona tecla
    const defPattern = /^def\s+(\w+)\s*\((.*)\)\s*:\s*$/;
    const defMatch = trimmed.match(defPattern);
    if (defMatch) {
        const funcName = defMatch[1];
        const params = defMatch[2].trim();

        // Mapear nombres de funciones a eventos
        if (funcName === 'inicio' || funcName === 'main' || funcName === 'start') {
            return {
                function: '__event_flag__',
                arguments: [],
                raw: trimmed,
                isEvent: true
            };
        }
        // al_presionar_X → evento de tecla
        const keyMatch = funcName.match(/^al_presionar_(\w+)$/);
        if (keyMatch) {
            return {
                function: '__event_key__',
                arguments: [{ type: 'string', value: keyMatch[1] }],
                raw: trimmed,
                isEvent: true
            };
        }
        // al_hacer_clic → evento de clic en sprite
        if (funcName === 'al_hacer_clic' || funcName === 'al_clic' || funcName === 'al_clickear') {
            return {
                function: '__event_click__',
                arguments: [],
                raw: trimmed,
                isEvent: true
            };
        }
        // al_recibir_X → evento de mensaje
        const receiveMatch = funcName.match(/^al_recibir_(\w+)$/);
        if (receiveMatch) {
            return {
                function: '__event_broadcast_received__',
                arguments: [{ type: 'string', value: receiveMatch[1] }],
                raw: trimmed,
                isEvent: true
            };
        }
        // al_clonar → evento de clon
        if (funcName === 'al_clonar' || funcName === 'al_ser_clonado') {
            return {
                function: '__event_clone_start__',
                arguments: [],
                raw: trimmed,
                isEvent: true
            };
        }
        // al_colisionar_X → evento de colisión
        const collisionMatch = funcName.match(/^al_colisionar_(\w+)$/);
        if (collisionMatch) {
            return {
                function: '__event_collision__',
                arguments: [{ type: 'string', value: collisionMatch[1] }],
                raw: trimmed,
                isEvent: true
            };
        }

        // Otras funciones def → procedimientos personalizados (Mis Bloques)
        return {
            function: '__procedure_def__',
            arguments: [
                { type: 'string', value: funcName },
                { type: 'string', value: params }
            ],
            raw: trimmed,
            isProcedure: true
        };
    }

    // ===== LLAMADAS A FUNCIONES =====

    // Detectar patrones de función: objeto.metodo(args) o funcion(args)
    const funcPattern = /^(\w+(?:\.\w+)?)\s*\((.*)\)\s*$/;
    const match = trimmed.match(funcPattern);

    if (!match) {
        return null;
    }

    const funcName = match[1];
    const argsString = match[2];
    const args = parseArguments(argsString);

    // Verificar si es una llamada a procedimiento personalizado (no está en PYTHON_TO_OPCODE)
    if (!PYTHON_TO_OPCODE[funcName] && !funcName.includes('.')) {
        return {
            function: '__procedure_call__',
            arguments: [{ type: 'string', value: funcName }, ...args],
            raw: trimmed
        };
    }

    return {
        function: funcName,
        arguments: args,
        raw: trimmed
    };
}

/**
 * Parsea los argumentos de una función
 */
function parseArguments(argsString) {
    if (!argsString.trim()) {
        return [];
    }

    const args = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i];

        if ((char === '"' || char === "'") && !inString) {
            inString = true;
            stringChar = char;
            current += char;
        } else if (char === stringChar && inString) {
            inString = false;
            stringChar = '';
            current += char;
        } else if (char === '(' && !inString) {
            depth++;
            current += char;
        } else if (char === ')' && !inString) {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0 && !inString) {
            args.push(parseValue(current.trim()));
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        args.push(parseValue(current.trim()));
    }

    return args;
}

/**
 * Parsea un valor individual (número, string, booleano)
 */
function parseValue(value) {
    // String con comillas
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return {
            type: 'string',
            value: value.slice(1, -1)
        };
    }

    // Número
    if (!isNaN(parseFloat(value))) {
        return {
            type: 'number',
            value: parseFloat(value)
        };
    }

    // Booleano
    if (value === 'True' || value === 'true') {
        return { type: 'boolean', value: true };
    }
    if (value === 'False' || value === 'false') {
        return { type: 'boolean', value: false };
    }

    // Variable o referencia
    return {
        type: 'variable',
        value: value
    };
}

/**
 * Detecta el tamaño de indentación usado en el código
 */
let detectedIndentSize = 4; // Default

function detectIndentSize(lines) {
    for (const line of lines) {
        const match = line.match(/^(\s+)\S/);
        if (match) {
            const spaces = match[1].replace(/\t/g, '    ');
            if (spaces.length > 0 && spaces.length <= 8) {
                detectedIndentSize = spaces.length;
                return detectedIndentSize;
            }
        }
    }
    return 4;
}

/**
 * Obtiene el nivel de indentación de una línea
 * Soporta 2, 3, 4 o más espacios por nivel
 */
function getIndentLevel(line) {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    const spaces = match[1].replace(/\t/g, '    '); // Convertir tabs a espacios
    if (spaces.length === 0) return 0;
    // Usar el tamaño de indentación detectado o calcular basándose en espacios
    const indentSize = detectedIndentSize || 4;
    return Math.floor(spaces.length / indentSize);
}

/**
 * Crea un bloque shadow para un valor numérico
 */
function createShadowNumber(value, parentId) {
    const shadowId = generateBlockId();
    return {
        id: shadowId,
        block: {
            id: shadowId,
            opcode: 'math_number',
            inputs: {},
            fields: {
                NUM: {
                    name: 'NUM',
                    value: String(value)
                }
            },
            next: null,
            parent: parentId,
            topLevel: false,
            shadow: true
        }
    };
}

/**
 * Crea un bloque shadow para un valor de texto
 */
function createShadowText(value, parentId) {
    const shadowId = generateBlockId();
    return {
        id: shadowId,
        block: {
            id: shadowId,
            opcode: 'text',
            inputs: {},
            fields: {
                TEXT: {
                    name: 'TEXT',
                    value: String(value)
                }
            },
            next: null,
            parent: parentId,
            topLevel: false,
            shadow: true
        }
    };
}

/**
 * Crea un bloque booleano constante (True/False).
 * Scratch no tiene un bloque literal booleano, así que se usa una comparación
 * matemática siempre verdadera/falsa: 1 = 1 → True, 1 = 0 → False.
 */
function createBooleanLiteral(bool, parentId) {
    const blockId = generateBlockId();
    const shadowA = createShadowNumber(1, blockId);
    const shadowB = createShadowNumber(bool ? 1 : 0, blockId);
    return {
        blockId,
        block: {
            id: blockId,
            opcode: 'operator_equals',
            inputs: {
                OPERAND1: { name: 'OPERAND1', block: shadowA.id, shadow: shadowA.id },
                OPERAND2: { name: 'OPERAND2', block: shadowB.id, shadow: shadowB.id }
            },
            fields: {},
            next: null,
            parent: parentId,
            topLevel: false,
            shadow: false
        },
        shadowBlocks: [shadowA, shadowB]
    };
}

/**
 * Quita UN solo par de paréntesis externos (si la cadena está completamente envuelta).
 * A diferencia de `replace(/^\(\s*|\s*\)$/g, '')`, NO trunca cadenas que simplemente
 * TERMINAN en ")" como `sprite.tocando("borde")`.
 */
function stripOuterParens(str) {
    const trimmed = str.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

/**
 * Evalúa SEGURO (sin `eval`) si una condición es una constante verdadera/falsa.
 * Soporta: literales booleanos (true/True/false/False), "not <constante>" y
 * comparaciones numéricas (<n> op <n>). Retorna true/false si es constante y
 * determinable, o null si la condición depende de variables/estado (no constante).
 * Se usa para decidir si un "while" con condición constante puede quedar vacío
 * (bloque "por siempre" o "repetir hasta que" con condición constante).
 */
function isConstantTrue(cond) {
    const c = cond.trim();
    // Literales booleanos (case-insensitive)
    if (/^true$/i.test(c)) return true;
    if (/^false$/i.test(c)) return false;

    // "not <constante>" → niega el valor de la constante interna
    const notM = c.match(/^not\s+(.+)$/i);
    if (notM) {
        const inner = isConstantTrue(stripOuterParens(notM[1]));
        return inner === null ? null : !inner;
    }

    // Comparación numérica: <num> op <num>  (==, !=, <, >, <=, >=)
    const cmp = c.match(/^(-?\d+(?:\.\d+)?)\s*(==|!=|<|>|<=|>=)\s*(-?\d+(?:\.\d+)?)$/);
    if (cmp) {
        const a = parseFloat(cmp[1]);
        const b = parseFloat(cmp[3]);
        switch (cmp[2]) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        default: return null;
        }
    }

    // No es una constante determinable
    return null;
}

/**
 * Parsea una expresión de condición y la convierte a un bloque booleano de Scratch
 * Soporta: sprite.tocando("x"), tecla_presionada("x"), comparaciones, negaciones y literales booleanos.
 */
function parseConditionToBlock(conditionStr, parentId) {
    if (!conditionStr || typeof conditionStr !== 'string') return null;

    const condition = conditionStr.trim();
    const blockId = generateBlockId();
    const shadowBlocks = [];

    // Negación: "not <cond>" → operator_not(cond interna)
    const notMatch = condition.match(/^not\s+(.+)$/i);
    if (notMatch) {
        const inner = stripOuterParens(notMatch[1]);
        const innerResult = parseConditionToBlock(inner, parentId);
        if (innerResult) {
            const notBlockId = generateBlockId();
            return {
                blockId: notBlockId,
                block: {
                    id: notBlockId,
                    opcode: 'operator_not',
                    inputs: { OPERAND: { name: 'OPERAND', block: innerResult.blockId, shadow: null } },
                    fields: {},
                    next: null,
                    parent: parentId,
                    topLevel: false,
                    shadow: false
                },
                shadowBlocks: innerResult.shadowBlocks.concat([{ id: innerResult.blockId, block: innerResult.block }])
            };
        }
        // "not <literal booleano>" sin bloque interno → constante negada
        return createBooleanLiteral(inner === 'false' || inner === 'False' ? true : false, parentId);
    }

    // sprite.tocando("_edge_") o sprite.tocando("Sprite2")
    const touchingMatch = condition.match(/^sprite\.tocando\s*\(\s*["'](.+?)["']\s*\)$/);
    if (touchingMatch) {
        const target = touchingMatch[1];
        // Mapear valores especiales
        const targetMap = { '_edge_': '_edge_', '_mouse_': '_mouse_', 'borde': '_edge_', 'raton': '_mouse_' };
        const targetValue = targetMap[target] || target;

        return {
            blockId,
            block: {
                id: blockId,
                opcode: 'sensing_touchingobject',
                inputs: {
                    TOUCHINGOBJECTMENU: {
                        name: 'TOUCHINGOBJECTMENU',
                        block: blockId + '_menu',
                        shadow: blockId + '_menu'
                    }
                },
                fields: {},
                next: null,
                parent: parentId,
                topLevel: false,
                shadow: false
            },
            shadowBlocks: [{
                id: blockId + '_menu',
                block: {
                    id: blockId + '_menu',
                    opcode: 'sensing_touchingobjectmenu',
                    inputs: {},
                    fields: {
                        TOUCHINGOBJECTMENU: { name: 'TOUCHINGOBJECTMENU', value: targetValue }
                    },
                    next: null,
                    parent: blockId,
                    topLevel: false,
                    shadow: true
                }
            }]
        };
    }

    // tecla_presionada("espacio")
    const keyPressedMatch = condition.match(/^tecla_presionada\s*\(\s*["'](.+?)["']\s*\)$/);
    if (keyPressedMatch) {
        const key = keyPressedMatch[1].toLowerCase();
        const keyMap = {
            'espacio': 'space', 'space': 'space',
            'arriba': 'up arrow', 'abajo': 'down arrow',
            'izquierda': 'left arrow', 'derecha': 'right arrow',
            'cualquiera': 'any'
        };
        const keyValue = keyMap[key] || key;

        return {
            blockId,
            block: {
                id: blockId,
                opcode: 'sensing_keypressed',
                inputs: {
                    KEY_OPTION: {
                        name: 'KEY_OPTION',
                        block: blockId + '_menu',
                        shadow: blockId + '_menu'
                    }
                },
                fields: {},
                next: null,
                parent: parentId,
                topLevel: false,
                shadow: false
            },
            shadowBlocks: [{
                id: blockId + '_menu',
                block: {
                    id: blockId + '_menu',
                    opcode: 'sensing_keyoptions',
                    inputs: {},
                    fields: {
                        KEY_OPTION: { name: 'KEY_OPTION', value: keyValue }
                    },
                    next: null,
                    parent: blockId,
                    topLevel: false,
                    shadow: true
                }
            }]
        };
    }

    // raton.presionado
    if (condition === 'raton.presionado' || condition === 'mouse.pressed') {
        return {
            blockId,
            block: {
                id: blockId,
                opcode: 'sensing_mousedown',
                inputs: {},
                fields: {},
                next: null,
                parent: parentId,
                topLevel: false,
                shadow: false
            },
            shadowBlocks: []
        };
    }

    // sprite.tocando_color("#RRGGBB")
    const colorMatch = condition.match(/^sprite\.tocando_color\s*\(\s*["'](.+?)["']\s*\)$/);
    if (colorMatch) {
        return {
            blockId,
            block: {
                id: blockId,
                opcode: 'sensing_touchingcolor',
                inputs: {
                    COLOR: {
                        name: 'COLOR',
                        block: blockId + '_color',
                        shadow: blockId + '_color'
                    }
                },
                fields: {},
                next: null,
                parent: parentId,
                topLevel: false,
                shadow: false
            },
            shadowBlocks: [{
                id: blockId + '_color',
                block: {
                    id: blockId + '_color',
                    opcode: 'colour_picker',
                    inputs: {},
                    fields: {
                        COLOUR: { name: 'COLOUR', value: colorMatch[1] }
                    },
                    next: null,
                    parent: blockId,
                    topLevel: false,
                    shadow: true
                }
            }]
        };
    }

    // Comparaciones: x > y, x < y, x == y
    const comparisonMatch = condition.match(/^(.+?)\s*(>|<|==|>=|<=|!=)\s*(.+)$/);
    if (comparisonMatch) {
        const left = comparisonMatch[1].trim();
        const op = comparisonMatch[2];
        const right = comparisonMatch[3].trim();

        let opcode;
        if (op === '>') opcode = 'operator_gt';
        else if (op === '<') opcode = 'operator_lt';
        else if (op === '==' || op === '!=') opcode = 'operator_equals';
        else return null;

        const shadowLeft = createShadowText(left, blockId);
        const shadowRight = createShadowText(right, blockId);

        const block = {
            blockId,
            block: {
                id: blockId,
                opcode,
                inputs: {
                    OPERAND1: { name: 'OPERAND1', block: shadowLeft.id, shadow: shadowLeft.id },
                    OPERAND2: { name: 'OPERAND2', block: shadowRight.id, shadow: shadowRight.id }
                },
                fields: {},
                next: null,
                parent: parentId,
                topLevel: false,
                shadow: false
            },
            shadowBlocks: [shadowLeft, shadowRight]
        };

        // Para !=, envolver en NOT
        if (op === '!=') {
            const notBlockId = generateBlockId();
            return {
                blockId: notBlockId,
                block: {
                    id: notBlockId,
                    opcode: 'operator_not',
                    inputs: {
                        OPERAND: { name: 'OPERAND', block: blockId, shadow: null }
                    },
                    fields: {},
                    next: null,
                    parent: parentId,
                    topLevel: false,
                    shadow: false
                },
                shadowBlocks: [{ id: blockId, block: block.block }, ...block.shadowBlocks]
            };
        }

        return block;
    }

    // Literales booleanos: True/False → constante booleana
    if (condition === 'True' || condition === 'true' || condition === 'False' || condition === 'false') {
        return createBooleanLiteral(condition === 'True' || condition === 'true', parentId);
    }

    console.warn(`[parseConditionToBlock] Condición no reconocida: ${condition}`);
    return null;
}

/**
 * Convierte una llamada Python parseada a estructura de bloque Scratch
 */
function pythonCallToBlock(parsedCall, position = { x: 50, y: 50 }, parentBlockId = null, functionParams = {}) {
    // Los marcadores especiales de else/elif/decoradores no generan bloques directamente
    if (parsedCall.isElse || parsedCall.isElif || parsedCall.isDecorator) {
        return null;
    }

    const opcode = PYTHON_TO_OPCODE[parsedCall.function];

    if (!opcode) {
        console.warn(`Función Python no reconocida: ${parsedCall.function}`);
        return null;
    }

    const blockId = generateBlockId();
    const inputDefs = OPCODE_INPUTS[opcode] || {};
    const inputNames = Object.keys(inputDefs).filter(name => !name.startsWith('SUBSTACK'));

    const inputs = {};
    const fields = {};
    const shadowBlocks = []; // Bloques shadow que necesitan ser creados

    // Los eventos (hat blocks) siempre son topLevel y no tienen parent
    const isEvent = parsedCall.isEvent || opcode.startsWith('event_') || opcode === 'control_start_as_clone';
    const isControl = parsedCall.isControl || false;
    const isProcedure = parsedCall.isProcedure || false;
    let blockMutation = null; // Para mutaciones que deben aplicarse DESPUÉS de crear el bloque

    // ===== MANEJO ESPECIAL DE EVENTOS =====
    if (opcode === 'event_whenkeypressed' && parsedCall.arguments.length > 0) {
        const keyName = String(parsedCall.arguments[0].value).toLowerCase();
        const keyMap = {
            'espacio': 'space', 'space': 'space',
            'arriba': 'up arrow', 'abajo': 'down arrow',
            'izquierda': 'left arrow', 'derecha': 'right arrow',
            'cualquiera': 'any'
        };
        fields.KEY_OPTION = { name: 'KEY_OPTION', value: keyMap[keyName] || keyName };
    }

    if (opcode === 'event_whenbroadcastreceived' && parsedCall.arguments.length > 0) {
        fields.BROADCAST_OPTION = { name: 'BROADCAST_OPTION', value: String(parsedCall.arguments[0].value) };
    }

    if (opcode === 'event_whenbackdropswitchesto' && parsedCall.arguments.length > 0) {
        fields.BACKDROP = { name: 'BACKDROP', value: String(parsedCall.arguments[0].value) };
    }

    // ===== MANEJO ESPECIAL DE VARIABLES =====
    if (opcode === 'data_setvariableto' && parsedCall.arguments.length >= 2) {
        const varName = parsedCall.arguments[0].value;
        const varValue = parsedCall.arguments[1].value;
        fields.VARIABLE = { name: 'VARIABLE', value: varName, id: varName };
        const shadow = createShadowText(varValue, blockId);
        shadowBlocks.push(shadow);
        inputs.VALUE = { name: 'VALUE', block: shadow.id, shadow: shadow.id };
    }

    if (opcode === 'data_changevariableby' && parsedCall.arguments.length >= 2) {
        const varName = parsedCall.arguments[0].value;
        const varValue = parsedCall.arguments[1].value;
        fields.VARIABLE = { name: 'VARIABLE', value: varName, id: varName };
        const shadow = createShadowNumber(varValue, blockId);
        shadowBlocks.push(shadow);
        inputs.VALUE = { name: 'VALUE', block: shadow.id, shadow: shadow.id };
    }

    if ((opcode === 'data_showvariable' || opcode === 'data_hidevariable') && parsedCall.arguments.length > 0) {
        fields.VARIABLE = { name: 'VARIABLE', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
    }

    // ===== MANEJO ESPECIAL DE LISTAS =====
    if (opcode === 'data_addtolist' && parsedCall.arguments.length >= 2) {
        const listName = parsedCall.arguments[0].value;
        const itemValue = parsedCall.arguments[1].value;
        fields.LIST = { name: 'LIST', value: listName, id: listName };
        const shadow = createShadowText(itemValue, blockId);
        shadowBlocks.push(shadow);
        inputs.ITEM = { name: 'ITEM', block: shadow.id, shadow: shadow.id };
    }

    if (opcode === 'data_deleteoflist' && parsedCall.arguments.length >= 2) {
        fields.LIST = { name: 'LIST', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
        const shadow = createShadowNumber(parsedCall.arguments[1].value, blockId);
        shadowBlocks.push(shadow);
        inputs.INDEX = { name: 'INDEX', block: shadow.id, shadow: shadow.id };
    }

    if (opcode === 'data_deletealloflist' && parsedCall.arguments.length >= 1) {
        fields.LIST = { name: 'LIST', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
    }

    if (opcode === 'data_insertatlist' && parsedCall.arguments.length >= 3) {
        fields.LIST = { name: 'LIST', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
        const shadowIndex = createShadowNumber(parsedCall.arguments[1].value, blockId);
        const shadowItem = createShadowText(parsedCall.arguments[2].value, blockId);
        shadowBlocks.push(shadowIndex, shadowItem);
        inputs.INDEX = { name: 'INDEX', block: shadowIndex.id, shadow: shadowIndex.id };
        inputs.ITEM = { name: 'ITEM', block: shadowItem.id, shadow: shadowItem.id };
    }

    if (opcode === 'data_replaceitemoflist' && parsedCall.arguments.length >= 3) {
        fields.LIST = { name: 'LIST', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
        const shadowIndex = createShadowNumber(parsedCall.arguments[1].value, blockId);
        const shadowItem = createShadowText(parsedCall.arguments[2].value, blockId);
        shadowBlocks.push(shadowIndex, shadowItem);
        inputs.INDEX = { name: 'INDEX', block: shadowIndex.id, shadow: shadowIndex.id };
        inputs.ITEM = { name: 'ITEM', block: shadowItem.id, shadow: shadowItem.id };
    }

    if ((opcode === 'data_showlist' || opcode === 'data_hidelist') && parsedCall.arguments.length > 0) {
        fields.LIST = { name: 'LIST', value: parsedCall.arguments[0].value, id: parsedCall.arguments[0].value };
    }

    // ===== MANEJO ESPECIAL DE PROCEDIMIENTOS =====
    if (opcode === 'procedures_definition' && parsedCall.arguments.length > 0) {
        const procName = parsedCall.arguments[0].value;
        const paramStr = parsedCall.arguments[1] ? parsedCall.arguments[1].value : '';
        const argNames = paramStr ? paramStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        const protoId = `proto_${blockId}`;
        
        // Generar IDs estables para los argumentos
        const argIds = argNames.map((_, idx) => `arg_${procName}_${idx}`);
        const argDefaults = argNames.map(() => "");
        const proccode = procName + argNames.map(() => ' %s').join('');
        
        // Crear inputs para el prototipo (los reporteros de los argumentos)
        const protoInputs = {};
        const childShadows = [];
        
        argNames.forEach((argName, idx) => {
            const argId = argIds[idx];
            const reporterId = `reporter_${protoId}_${idx}`;
            
            protoInputs[argId] = {
                name: argId,
                block: reporterId,
                shadow: reporterId
            };
            
            childShadows.push({
                id: reporterId,
                block: {
                    id: reporterId,
                    opcode: 'argument_reporter_string_number',
                    inputs: {},
                    fields: {
                        VALUE: { name: 'VALUE', value: argName },
                    },
                    next: null,
                    parent: protoId,
                    shadow: true,
                    topLevel: false
                }
            });
        });
        
        // Definir el bloque de prototipo
        const protoBlock = {
            id: protoId,
            opcode: 'procedures_prototype',
            inputs: protoInputs,
            fields: {},
            next: null,
            parent: blockId,
            shadow: true,
            topLevel: false,
            mutation: {
                tagName: 'mutation',
                proccode: proccode,
                argumentnames: JSON.stringify(argNames),
                argumentids: JSON.stringify(argIds),
                argumentdefaults: JSON.stringify(argDefaults),
                warp: 'false',
                children: argNames.map((argName, idx) => ({
                    tagName: 'arg',
                    name: argName,
                    varid: argIds[idx],
                    children: []
                }))
            }
        };
        
        // Vincular el prototipo al bloque de definición
        inputs.custom_block = {
            name: 'custom_block',
            block: protoId,
            shadow: protoId
        };
        
        shadowBlocks.push({ id: protoId, block: protoBlock }, ...childShadows);
    }

    if (opcode === 'procedures_call' && parsedCall.arguments.length > 0) {
        const procName = parsedCall.arguments[0].value;
        const callArgs = parsedCall.arguments.slice(1);
        
        const argIds = callArgs.map((_, idx) => `arg_${procName}_${idx}`);
        const proccode = procName + callArgs.map(() => ' %s').join('');
        
        // Vincular cada argumento como input del bloque de llamada
        callArgs.forEach((arg, idx) => {
            const argId = argIds[idx];
            const inputName = argId;
            
            if (arg.type === 'number') {
                const shadow = createShadowNumber(arg.value, blockId);
                shadowBlocks.push(shadow);
                inputs[inputName] = { name: inputName, block: shadow.id, shadow: shadow.id };
            } else if (arg.type === 'string' || arg.type === 'any') {
                const shadow = createShadowText(arg.value, blockId);
                shadowBlocks.push(shadow);
                inputs[inputName] = { name: inputName, block: shadow.id, shadow: shadow.id };
            } else if (arg.type === 'variable') {
                const varBlockId = generateBlockId();
                shadowBlocks.push({
                    id: varBlockId,
                    block: {
                        id: varBlockId,
                        opcode: 'data_variable',
                        inputs: {},
                        fields: {
                            VARIABLE: { name: 'VARIABLE', value: arg.value, id: arg.value }
                        },
                        next: null,
                        parent: blockId,
                        shadow: false,
                        topLevel: false
                    }
                });
                inputs[inputName] = { name: inputName, block: varBlockId, shadow: null };
            }
        });
        
        // Agregar la mutación requerida por Scratch para mapear la llamada
        // NOTA: la mutación se aplica al bloque DESPUÉS de crearlo (más abajo)
        blockMutation = {
            tagName: 'mutation',
            proccode: proccode,
            argumentids: JSON.stringify(argIds),
            warp: 'false',
            children: []
        };
    }

    // ===== MANEJO ESPECIAL DE COLISIONES =====
    if (opcode === 'game_onCollision' && parsedCall.arguments.length > 0) {
        fields.TARGET = { name: 'TARGET', value: parsedCall.arguments[0].value };
    }

    // ===== MANEJO ESPECIAL DE ESTRUCTURAS DE CONTROL =====
    // Procesar condiciones para if/while/repeat_until
    if ((opcode === 'control_if' || opcode === 'control_if_else' ||
         opcode === 'control_repeat_until' || opcode === 'control_wait_until') &&
        parsedCall.arguments.length > 0) {

        const conditionArg = parsedCall.arguments.find(a => a.type === 'condition');
        if (conditionArg) {
            const conditionValue = conditionArg.value;

            // Intentar parsear la condición como una expresión
            const conditionBlock = parseConditionToBlock(conditionValue, blockId);
            if (conditionBlock) {
                shadowBlocks.push(...(conditionBlock.shadowBlocks || []));
                if (conditionBlock.blockId) {
                    inputs.CONDITION = {
                        name: 'CONDITION',
                        block: conditionBlock.blockId,
                        shadow: null
                    };
                    // Agregar el bloque de condición al mapa
                    shadowBlocks.push({ id: conditionBlock.blockId, block: conditionBlock.block });
                }
            }
        }
    }

    // ===== MAPEO GENÉRICO DE ARGUMENTOS =====
    // Solo si no se manejó arriba con casos especiales
    if (!isEvent && Object.keys(inputs).length === 0 && Object.keys(fields).length === 0) {
        let argIndex = 0;
        for (const inputName of inputNames) {
            const inputType = inputDefs[inputName];
            const arg = parsedCall.arguments[argIndex];

            if (!arg) {
                argIndex++;
                continue;
            }

            if (inputType === 'number') {
                // Si el valor es un parámetro de función, crear argument_reporter_string_number
                if (functionParams[arg.value] !== undefined) {
                    const paramId = functionParams[arg.value];
                    const reporterId = generateBlockId();
                    shadowBlocks.push({
                        id: reporterId,
                        block: {
                            id: reporterId,
                            opcode: 'argument_reporter_string_number',
                            inputs: {},
                            fields: {
                                VALUE: { name: 'VALUE', value: arg.value },
                            },
                            next: null,
                            parent: blockId,
                            shadow: true,
                            topLevel: false
                        }
                    });
                    inputs[inputName] = { name: inputName, block: reporterId, shadow: reporterId };
                } else {
                    const shadow = createShadowNumber(arg.value, blockId);
                    shadowBlocks.push(shadow);
                    inputs[inputName] = { name: inputName, block: shadow.id, shadow: shadow.id };
                }
            } else if (inputType === 'string' || inputType === 'any') {
                // Si el valor es un parámetro de función, crear argument_reporter_string_number
                if (functionParams[arg.value] !== undefined) {
                    const paramId = functionParams[arg.value];
                    const reporterId = generateBlockId();
                    shadowBlocks.push({
                        id: reporterId,
                        block: {
                            id: reporterId,
                            opcode: 'argument_reporter_string_number',
                            inputs: {},
                            fields: {
                                VALUE: { name: 'VALUE', value: arg.value },
                            },
                            next: null,
                            parent: blockId,
                            shadow: true,
                            topLevel: false
                        }
                    });
                    inputs[inputName] = { name: inputName, block: reporterId, shadow: reporterId };
                } else {
                    const shadow = createShadowText(arg.value, blockId);
                    shadowBlocks.push(shadow);
                    inputs[inputName] = { name: inputName, block: shadow.id, shadow: shadow.id };
                }
            } else if (inputType === 'variable') {
                fields[inputName] = { name: inputName, value: arg.value, id: arg.value };
            } else if (inputType === 'list') {
                fields[inputName] = { name: inputName, value: arg.value, id: arg.value };
            }
            // boolean/condition se dejan vacíos por ahora

            argIndex++;
        }
    }

    const block = {
        id: blockId,
        opcode,
        inputs,
        fields,
        next: null,
        parent: parentBlockId,
        topLevel: isEvent || isProcedure || parentBlockId === null,
        shadow: false,
        x: (isEvent || isProcedure || parentBlockId === null) ? position.x : undefined,
        y: (isEvent || isProcedure || parentBlockId === null) ? position.y : undefined
    };

    // Aplicar mutación diferida (ej: procedures_call debe tener mutation pero el bloque
    // se crea después del manejo especial)
    if (blockMutation) {
        block.mutation = blockMutation;
    }

    return {
        blockId,
        block,
        shadowBlocks,
        isEvent,
        isControl,
        isProcedure,
        controlType: parsedCall.controlType || null
    };
}

/**
 * Estructura para rastrear bloques de control activos
 */
class ControlStack {
    constructor() {
        this.stack = []; // [{blockId, indentLevel, type, hasElse}]
    }

    push(blockId, indentLevel, type) {
        this.stack.push({ blockId, indentLevel, type, hasElse: false, substackSet: false });
    }

    pop() {
        return this.stack.pop();
    }

    peek() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    // Obtiene el bloque de control que contiene el nivel de indentación dado
    getControlForLevel(indentLevel) {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].indentLevel < indentLevel) {
                return this.stack[i];
            }
        }
        return null;
    }

    // Elimina todos los controles con nivel >= al dado
    popToLevel(indentLevel) {
        while (this.stack.length > 0 && this.stack[this.stack.length - 1].indentLevel >= indentLevel) {
            this.stack.pop();
        }
    }

    isEmpty() {
        return this.stack.length === 0;
    }
}

/**
 * Convierte código Python completo a estructura de bloques
 * Respeta la indentación de Python para determinar la jerarquía de bloques
 * Soporta estructuras de control anidadas (while, for, if/else)
 */
export function pythonToBlocks(pythonCode, startPosition = { x: -500, y: 30 }) {
    const lines = pythonCode.split('\n');
    const blockMap = {};
    const scripts = []; // Grupos de bloques conectados
    const errors = []; // Errores encontrados durante el parseo
    const definedProcedures = new Set(); // Nombres de funciones definidas (para forward refs)
    const procedureCalls = []; // Llamadas a funciones {name, lineNumber}
    let currentFunctionParams = {}; // Mapa: nombreParam -> idParam, para resolver params en cuerpo de función

    // Detectar si el código fue generado automáticamente por STBlock / STB Academy
    const isGeneratedCode = pythonCode.includes('Código generado por STBlock') || 
                            pythonCode.includes('Código generado por STB Academy') || 
                            pythonCode.includes('stbacademy.net') ||
                            pythonCode.includes('stbacademy.com');
    let inHeader = isGeneratedCode;

    // Detectar tamaño de indentación antes de procesar
    detectIndentSize(lines);
    // Validar código primero
    const validationErrors = validatePythonCode(pythonCode);
    errors.push(...validationErrors);

    let currentEventBlockId = null; // El bloque de evento actual (def inicio, etc.)
    let lastBlockAtLevel = {}; // Último bloque en cada nivel de indentación
    let scriptCount = 0;
    const controlStack = new ControlStack(); // Pila de estructuras de control activas
    let inElseBranch = false; // Si estamos en la rama else de un if
    let elseIndentLevel = -1; // Nivel de indentación del else

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Si es código generado por STBlock, saltar la sección de variables de la cabecera
        if (inHeader) {
            const isImport = trimmed.startsWith('import ') || trimmed.startsWith('from ');
            const isComment = trimmed.startsWith('#');
            const isEmpty = trimmed === '';
            const isVarDecl = /^\w+\s*=\s*(0|\[\])$/.test(trimmed);

            if (isImport || isComment || isEmpty || isVarDecl) {
                continue;
            } else {
                inHeader = false; // Salimos de la cabecera al encontrar la primera acción real
            }
        }

        const indentLevel = getIndentLevel(line);
        const parsed = parsePythonLine(line);

        if (!parsed) {
            continue;
        }

        // Limpiar parámetros de función al salir de su cuerpo (siguiente bloque top-level)
        // Debe ir ANTES del tracking de definiciones para que el def actual pueda establecer sus params
        if (indentLevel === 0) {
            currentFunctionParams = {};
        }

        // Rastrear definiciones y llamadas de funciones para forward references
        if (parsed.isProcedure && parsed.function === '__procedure_def__') {
            const procName = parsed.arguments[0] && parsed.arguments[0].value;
            if (procName) {
                definedProcedures.add(procName);
            }
            // Almacenar parámetros de la función para resolverlos en el cuerpo
            currentFunctionParams = {};
            const paramStr = parsed.arguments[1] && parsed.arguments[1].value;
            if (procName && paramStr) {
                const paramNames = paramStr.split(',').map(s => s.trim()).filter(Boolean);
                paramNames.forEach((paramName, idx) => {
                    currentFunctionParams[paramName] = `arg_${procName}_${idx}`;
                });
            }
        } else if (parsed.function === '__procedure_call__') {
            const callName = parsed.arguments[0] && parsed.arguments[0].value;
            if (callName) {
                procedureCalls.push({ name: callName, line: i + 1 });
            }
        }

        // Limpiar controles que ya no aplican (salimos de su nivel de indentación)
        controlStack.popToLevel(indentLevel);

        // Si salimos del nivel de else, resetear el flag
        if (inElseBranch && indentLevel <= elseIndentLevel) {
            inElseBranch = false;
            elseIndentLevel = -1;
        }

        // Calcular posición - cada script nuevo se mueve a la derecha
        const scriptY = startPosition.y;

        // Manejar else: convertir el if anterior a if_else
        if (parsed.isElse) {
            const controlInfo = controlStack.peek();
            if (controlInfo && (controlInfo.type === 'if' || controlInfo.type === 'if_else')) {
                // Convertir a if_else si aún no lo es
                const ifBlock = blockMap[controlInfo.blockId];
                if (ifBlock && ifBlock.opcode === 'control_if') {
                    ifBlock.opcode = 'control_if_else';
                    controlInfo.type = 'if_else';
                }
                controlInfo.hasElse = true;
                inElseBranch = true;
                elseIndentLevel = indentLevel;
                // Resetear el último bloque del nivel siguiente para el else
                delete lastBlockAtLevel[indentLevel + 1];
            }
            continue; // else: no genera un bloque, solo modifica el if
        }

        // Determinar el padre basándose en la indentación y contexto
        let parentBlockId = null;
        let isSubstack = false;
        let isSubstack2 = false;

        if (parsed.isEvent || parsed.isProcedure) {
            // Los eventos y procedimientos siempre son top-level, empiezan un nuevo script
            if (scriptCount > 0 || Object.keys(blockMap).length > 0) {
                scriptCount++;
            }
            parentBlockId = null;
            currentEventBlockId = null;
            lastBlockAtLevel = {};
            controlStack.stack = []; // Limpiar pila de control
            inElseBranch = false;
        } else if (indentLevel > 0) {
            // Bloque indentado
            const controlInfo = controlStack.getControlForLevel(indentLevel);
            if (controlInfo) {
                // Estamos dentro de un bloque de control
                if (inElseBranch && controlInfo.type === 'if_else') {
                    // Estamos en la rama else
                    if (!lastBlockAtLevel[indentLevel] || lastBlockAtLevel[indentLevel + '_else'] === undefined) {
                        // Primer bloque del else - conectar a SUBSTACK2
                        isSubstack2 = true;
                        parentBlockId = controlInfo.blockId;
                        lastBlockAtLevel[indentLevel + '_else'] = true; // Marcar que ya conectamos SUBSTACK2
                    } else if (lastBlockAtLevel[indentLevel]) {
                        // Bloques siguientes del else - conectar al anterior
                        parentBlockId = lastBlockAtLevel[indentLevel];
                    }
                } else {
                    // Estamos en la rama principal (SUBSTACK)
                    if (!controlInfo.substackSet) {
                        // Primer bloque dentro del control - conectar a SUBSTACK
                        isSubstack = true;
                        parentBlockId = controlInfo.blockId;
                        controlInfo.substackSet = true;
                    } else if (lastBlockAtLevel[indentLevel]) {
                        // Bloques siguientes - conectar al anterior via next
                        parentBlockId = lastBlockAtLevel[indentLevel];
                    } else {
                        // Buscar en nivel anterior
                        const prevLevel = indentLevel - 1;
                        if (lastBlockAtLevel[prevLevel]) {
                            parentBlockId = lastBlockAtLevel[prevLevel];
                        } else {
                            parentBlockId = currentEventBlockId;
                        }
                    }
                }
            } else if (lastBlockAtLevel[indentLevel]) {
                // No hay control, pero hay bloque en este nivel
                parentBlockId = lastBlockAtLevel[indentLevel];
            } else {
                // Buscar en nivel anterior
                const prevLevel = indentLevel - 1;
                if (lastBlockAtLevel[prevLevel]) {
                    parentBlockId = lastBlockAtLevel[prevLevel];
                } else if (currentEventBlockId) {
                    parentBlockId = currentEventBlockId;
                }
            }
        } else if (indentLevel === 0 && !parsed.isEvent) {
            // Cualquier bloque a nivel 0 (sin indentar) siempre es un script independiente y no se conecta a nada
            if (Object.keys(blockMap).length > 0) {
                scriptCount++;
            }
            parentBlockId = null;
        }

        // Calcular posición X final para este bloque (espaciado reducido entre scripts)
        const finalX = startPosition.x + (scriptCount * 180);

        const result = pythonCallToBlock(
            parsed,
            { x: finalX, y: scriptY },
            isSubstack || isSubstack2 ? null : parentBlockId, // Los bloques de substack no usan parent normal
            currentFunctionParams
        );

        if (result) {
            // Agregar bloque principal al mapa
            blockMap[result.blockId] = result.block;
            // Guardar número de línea para el modo debug (mapa blockId → línea Python)
            result.block._pythonLine = i + 1;

            // Agregar bloques shadow al mapa
            if (result.shadowBlocks) {
                for (const shadow of result.shadowBlocks) {
                    blockMap[shadow.id] = shadow.block;
                }
            }

            // Si es evento o procedimiento, guardarlo como el bloque actual principal
            if (result.isEvent || result.isProcedure) {
                currentEventBlockId = result.blockId;
                scripts.push([result.blockId]);
            }

            // Si es estructura de control, agregarla a la pila
            // NOTA: procedures_definition NO se agrega a controlStack porque usa next en lugar de SUBSTACK
            if (result.isControl) {
                controlStack.push(result.blockId, indentLevel, result.controlType);
            }

            // Conectar con el bloque padre

            if (isSubstack && parentBlockId && blockMap[parentBlockId]) {
                // Conectar como SUBSTACK del bloque de control
                blockMap[parentBlockId].inputs.SUBSTACK = {
                    name: 'SUBSTACK',
                    block: result.blockId,
                    shadow: null
                };
                result.block.parent = parentBlockId;
                result.block.topLevel = false;
                delete result.block.x;
                delete result.block.y;
            } else if (isSubstack2 && parentBlockId && blockMap[parentBlockId]) {
                // Conectar como SUBSTACK2 del bloque if_else
                blockMap[parentBlockId].inputs.SUBSTACK2 = {
                    name: 'SUBSTACK2',
                    block: result.blockId,
                    shadow: null
                };
                result.block.parent = parentBlockId;
                result.block.topLevel = false;
                delete result.block.x;
                delete result.block.y;
            } else if (parentBlockId && blockMap[parentBlockId]) {
                // Conectar usando 'next' del padre
                blockMap[parentBlockId].next = result.blockId;
                result.block.parent = parentBlockId;
                result.block.topLevel = false;
                delete result.block.x;
                delete result.block.y;
            } else {
            }

            // Guardar este bloque como el último en su nivel de indentación
            lastBlockAtLevel[indentLevel] = result.blockId;

            // Limpiar niveles superiores (cuando salimos de un bloque indentado)
            for (const level of Object.keys(lastBlockAtLevel)) {
                const levelNum = parseInt(level);
                if (!isNaN(levelNum) && levelNum > indentLevel) {
                    delete lastBlockAtLevel[level];
                }
            }
        }
    }

    // Validar llamadas a funciones: advertir si una función no está definida
    for (const call of procedureCalls) {
        if (!definedProcedures.has(call.name)) {
            // Buscar si es una función conocida de STBlock (sprite.xxx, etc.)
            const isKnownFunction = KNOWN_FUNCTIONS.includes(call.name) ||
                PYTHON_TO_OPCODE[call.name] !== undefined;

            // Si la función no está definida Y no es conocida, agregar advertencia
            if (!isKnownFunction) {
                errors.push(new CodeError(
                    ERROR_TYPES.UNKNOWN_FUNCTION,
                    `Llamada a función no definida: "${call.name}" en línea ${call.line}. ` +
                    (call.line > 1
                        ? 'Asegúrate de que la función esté definida en el código (Python soporta forward references, la definición puede estar después de la llamada).'
                        : 'Define la función con "def nombre():".'),
                    call.line,
                    0,
                    `def ${call.name}():\n    # Tu código aquí`
                ));
            }
        }
    }

    return {
        blockMap,
        scripts,
        total: Object.keys(blockMap).length,
        errors // Lista de errores encontrados
    };
}

/**
 * Sincroniza código Python con el workspace de Scratch
 * @returns {Object} Resultado con success, blocksCreated, errors
 */
export function syncPythonToWorkspace(vm, pythonCode) {
    if (!vm || !vm.editingTarget) {
        return { success: false, error: 'VM no disponible', blocksCreated: 0, errors: [] };
    }

    try {
        // PRIMERO: Limpiar bloques anteriores para evitar duplicados
        clearPythonBlocks(vm);

        const result = pythonToBlocks(pythonCode);

        if (result.total === 0 && result.errors.length === 0) {
            return {
                success: true,
                message: 'No se encontraron comandos de STBlock',
                blocksCreated: 0,
                errors: []
            };
        }

        // Usar la API de creación de bloques
        const targetBlocks = vm.editingTarget.blocks;

        // Crear cada bloque
        for (const [blockId, block] of Object.entries(result.blockMap)) {
            targetBlocks.createBlock(block);
        }

        // Emitir actualización
        vm.emitWorkspaceUpdate();

        // Almacenar mapa blockId → línea Python para el modo debug
        const lineMap = generateBlockLineMap(vm);
        if (vm.runtime) {
            vm.runtime.blockLineMap = lineMap;
        }

        return {
            success: result.errors.length === 0,
            blocksCreated: result.total,
            scripts: result.scripts.length,
            errors: result.errors // Incluir errores encontrados
        };
    } catch (error) {
        console.error('Error sincronizando Python a bloques:', error);
        return {
            success: false,
            error: error.message,
            blocksCreated: 0,
            errors: [{
                type: 'runtime_error',
                message: error.message,
                line: 0
            }]
        };
    }
}

/**
 * Limpia los bloques para re-sincronizar
 * @param {Object} vm - La máquina virtual de Scratch
 * @param {boolean} clearAll - Si es true, elimina TODOS los bloques, no solo los py_block_
 */
export function clearPythonBlocks(vm, clearAll = true) {
    if (!vm || !vm.editingTarget) {
        return 0;
    }

    const blocks = vm.editingTarget.blocks._blocks;
    const toDelete = [];

    // Buscar bloques a eliminar
    for (const blockId of Object.keys(blocks)) {
        if (clearAll || blockId.startsWith('py_block_')) {
            toDelete.push(blockId);
        }
    }

    // Eliminar bloques (empezando por los que no son topLevel para evitar problemas)
    const topLevelBlocks = [];
    const childBlocks = [];

    for (const blockId of toDelete) {
        const block = blocks[blockId];
        if (block && block.topLevel) {
            topLevelBlocks.push(blockId);
        } else {
            childBlocks.push(blockId);
        }
    }

    // Primero eliminar hijos, luego padres
    for (const blockId of childBlocks) {
        try {
            vm.editingTarget.blocks.deleteBlock(blockId);
        } catch (e) {
            // Ignorar errores de bloques ya eliminados
        }
    }
    for (const blockId of topLevelBlocks) {
        try {
            vm.editingTarget.blocks.deleteBlock(blockId);
        } catch (e) {
            // Ignorar errores de bloques ya eliminados
        }
    }

    if (toDelete.length > 0) {
        vm.emitWorkspaceUpdate();
    }

    return toDelete.length;
}

/**
 * Genera un mapa blockId → número de línea Python
 * a partir de los bloques actuales en el VM.
 * @param {Object} vm - La máquina virtual de Scratch
 * @returns {Object} Mapa de {blockId: pythonLineNumber}
 */
export function generateBlockLineMap(vm) {
    const lineMap = {};
    if (!vm || !vm.editingTarget) return lineMap;
    const blocks = vm.editingTarget.blocks._blocks;
    for (const blockId in blocks) {
        if (Object.prototype.hasOwnProperty.call(blocks, blockId)) {
            const block = blocks[blockId];
            if (block._pythonLine !== undefined) {
                lineMap[blockId] = block._pythonLine;
            }
        }
    }
    return lineMap;
}

export default {
    pythonToBlocks,
    syncPythonToWorkspace,
    clearPythonBlocks,
    parsePythonLine,
    validatePythonCode,
    generateBlockLineMap,
    PYTHON_TO_OPCODE,
    ERROR_TYPES
};
