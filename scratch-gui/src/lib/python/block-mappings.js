/**
 * STBlock - Mapeo de bloques Scratch a codigo Python
 *
 * Este archivo define como cada bloque de Scratch se traduce a Python.
 * Los bloques estan organizados por categoria para facilitar mantenimiento.
 */

// Funcion auxiliar para indentar codigo
const indent = (code, level = 1) => {
    if (!code) return '';
    const spaces = '    '.repeat(level);
    return code.split('\n').map(line => spaces + line).join('\n');
};

// Funcion para escapar strings
const escapeString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
};

// Funcion para formatear numeros
const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    return isNaN(n) ? '0' : String(n);
};

// Funcion para formatear un valor que puede ser expresion o literal
const formatValue = (value, args, argName) => {
    if (value === null || value === undefined) return '""';

    // Si es una expresion (bloque reportero conectado), no escapar
    if (args && args.__expressions__ && args.__expressions__[argName]) {
        return String(value);
    }

    // Si parece ser una expresion Python (contiene . o ( o es una variable conocida)
    const strValue = String(value);
    if (strValue.match(/^(sprite|escenario|sonido|raton|fisica|camara|respuesta|cronometro)\./)) {
        return strValue;
    }
    if (strValue.match(/^\(.*\)$/) || strValue.match(/^[a-z_][a-z0-9_]*$/i)) {
        // Podria ser una expresion, verificar si tiene caracteres que indican literal
        if (!strValue.includes(' ') && (strValue.includes('.') || strValue.includes('('))) {
            return strValue;
        }
    }

    // Es un valor literal, escapar como string
    return `"${escapeString(value)}"`;
};

// Funcion para formatear numero o expresion
const formatNumberOrExpr = (value, args, argName) => {
    if (value === null || value === undefined) return '0';

    // Si es una expresion (bloque reportero conectado), no formatear como numero
    if (args && args.__expressions__ && args.__expressions__[argName]) {
        return String(value);
    }

    // Si parece ser una expresion Python
    const strValue = String(value);
    if (strValue.match(/^(sprite|escenario|sonido|raton|fisica|camara|respuesta|cronometro)\./)) {
        return strValue;
    }
    if (strValue.includes('(') || strValue.includes('.') || strValue.includes('+') ||
        strValue.includes('-') || strValue.includes('*') || strValue.includes('/')) {
        return strValue;
    }

    // Es un numero literal
    const n = Number(value);
    return isNaN(n) ? '0' : String(n);
};

/**
 * MAPEO DE BLOQUES A PYTHON
 *
 * Cada entrada tiene:
 * - key: opcode del bloque en Scratch
 * - value: funcion que recibe (args, bodyCode) y retorna codigo Python
 */
export const BLOCK_TO_PYTHON = {
    // ═══════════════════════════════════════════════════════════════
    // EVENTOS
    // ═══════════════════════════════════════════════════════════════

    'event_whenflagclicked': () =>
        `@cuando_bandera_verde\ndef inicio():`,

    'event_whenkeypressed': (args) =>
        `@cuando_tecla("${escapeString(args.KEY_OPTION)}")\ndef al_presionar_tecla():`,

    'event_whenthisspriteclicked': () =>
        `@cuando_sprite_clickeado\ndef al_clickear():`,

    'event_whenbackdropswitchesto': (args) =>
        `@cuando_fondo_cambia_a("${escapeString(args.BACKDROP)}")\ndef al_cambiar_fondo():`,

    'event_whengreaterthan': (args) =>
        `@cuando_mayor_que("${escapeString(args.WHENGREATERTHANMENU)}", ${formatNumber(args.VALUE)})\ndef al_superar_valor():`,

    'event_whenbroadcastreceived': (args) =>
        `@cuando_reciba("${escapeString(args.BROADCAST_OPTION)}")\ndef al_recibir_mensaje():`,

    'event_broadcast': (args) =>
        `enviar_mensaje("${escapeString(args.BROADCAST_INPUT)}")`,

    'event_broadcastandwait': (args) =>
        `enviar_mensaje_y_esperar("${escapeString(args.BROADCAST_INPUT)}")`,

    // ═══════════════════════════════════════════════════════════════
    // MOVIMIENTO
    // ═══════════════════════════════════════════════════════════════

    'motion_movesteps': (args) =>
        `sprite.mover(${formatNumberOrExpr(args.STEPS, args, 'STEPS')})`,

    'motion_turnright': (args) =>
        `sprite.girar_derecha(${formatNumberOrExpr(args.DEGREES, args, 'DEGREES')})`,

    'motion_turnleft': (args) =>
        `sprite.girar_izquierda(${formatNumberOrExpr(args.DEGREES, args, 'DEGREES')})`,

    'motion_goto': (args) =>
        `sprite.ir_a(${formatValue(args.TO, args, 'TO')})`,

    'motion_gotoxy': (args) =>
        `sprite.ir_a_xy(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'motion_glideto': (args) =>
        `sprite.deslizar_a(${formatValue(args.TO, args, 'TO')}, ${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'motion_glidesecstoxy': (args) =>
        `sprite.deslizar_a_xy(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')}, ${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'motion_pointindirection': (args) =>
        `sprite.apuntar_en_direccion(${formatNumberOrExpr(args.DIRECTION, args, 'DIRECTION')})`,

    'motion_pointtowards': (args) =>
        `sprite.apuntar_hacia(${formatValue(args.TOWARDS, args, 'TOWARDS')})`,

    'motion_changexby': (args) =>
        `sprite.cambiar_x(${formatNumberOrExpr(args.DX, args, 'DX')})`,

    'motion_setx': (args) =>
        `sprite.fijar_x(${formatNumberOrExpr(args.X, args, 'X')})`,

    'motion_changeyby': (args) =>
        `sprite.cambiar_y(${formatNumberOrExpr(args.DY, args, 'DY')})`,

    'motion_sety': (args) =>
        `sprite.fijar_y(${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'motion_ifonedgebounce': () =>
        `sprite.rebotar_si_toca_borde()`,

    'motion_setrotationstyle': (args) =>
        `sprite.fijar_estilo_rotacion("${escapeString(args.STYLE)}")`,

    'motion_xposition': () =>
        `sprite.x`,

    'motion_yposition': () =>
        `sprite.y`,

    'motion_direction': () =>
        `sprite.direccion`,

    // ═══════════════════════════════════════════════════════════════
    // APARIENCIA
    // ═══════════════════════════════════════════════════════════════

    'looks_sayforsecs': (args) =>
        `sprite.decir(${formatValue(args.MESSAGE, args, 'MESSAGE')}, ${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'looks_say': (args) =>
        `sprite.decir(${formatValue(args.MESSAGE, args, 'MESSAGE')})`,

    'looks_thinkforsecs': (args) =>
        `sprite.pensar(${formatValue(args.MESSAGE, args, 'MESSAGE')}, ${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'looks_think': (args) =>
        `sprite.pensar(${formatValue(args.MESSAGE, args, 'MESSAGE')})`,

    'looks_switchcostumeto': (args) =>
        `sprite.cambiar_disfraz(${formatValue(args.COSTUME, args, 'COSTUME')})`,

    'looks_nextcostume': () =>
        `sprite.siguiente_disfraz()`,

    'looks_switchbackdropto': (args) =>
        `escenario.cambiar_fondo(${formatValue(args.BACKDROP, args, 'BACKDROP')})`,

    'looks_nextbackdrop': () =>
        `escenario.siguiente_fondo()`,

    'looks_changesizeby': (args) =>
        `sprite.cambiar_tamano(${formatNumberOrExpr(args.CHANGE, args, 'CHANGE')})`,

    'looks_setsizeto': (args) =>
        `sprite.fijar_tamano(${formatNumberOrExpr(args.SIZE, args, 'SIZE')})`,

    'looks_changeeffectby': (args) =>
        `sprite.cambiar_efecto("${escapeString(args.EFFECT)}", ${formatNumberOrExpr(args.CHANGE, args, 'CHANGE')})`,

    'looks_seteffectto': (args) =>
        `sprite.fijar_efecto("${escapeString(args.EFFECT)}", ${formatNumberOrExpr(args.VALUE, args, 'VALUE')})`,

    'looks_cleargraphiceffects': () =>
        `sprite.quitar_efectos()`,

    'looks_show': () =>
        `sprite.mostrar()`,

    'looks_hide': () =>
        `sprite.esconder()`,

    'looks_gotofrontback': (args) =>
        `sprite.ir_a_capa("${escapeString(args.FRONT_BACK)}")`,

    'looks_goforwardbackwardlayers': (args) =>
        `sprite.cambiar_capa("${escapeString(args.FORWARD_BACKWARD)}", ${formatNumber(args.NUM)})`,

    'looks_costumenumbername': (args) =>
        `sprite.disfraz_${args.NUMBER_NAME === 'number' ? 'numero' : 'nombre'}`,

    'looks_backdropnumbername': (args) =>
        `escenario.fondo_${args.NUMBER_NAME === 'number' ? 'numero' : 'nombre'}`,

    'looks_size': () =>
        `sprite.tamano`,

    // ═══════════════════════════════════════════════════════════════
    // SONIDO
    // ═══════════════════════════════════════════════════════════════

    'sound_playuntildone': (args) =>
        `sonido.reproducir_hasta_terminar("${escapeString(args.SOUND_MENU)}")`,

    'sound_play': (args) =>
        `sonido.reproducir("${escapeString(args.SOUND_MENU)}")`,

    'sound_stopallsounds': () =>
        `sonido.detener_todos()`,

    'sound_changeeffectby': (args) =>
        `sonido.cambiar_efecto("${escapeString(args.EFFECT)}", ${formatNumberOrExpr(args.VALUE, args, 'VALUE')})`,

    'sound_seteffectto': (args) =>
        `sonido.fijar_efecto("${escapeString(args.EFFECT)}", ${formatNumberOrExpr(args.VALUE, args, 'VALUE')})`,

    'sound_cleareffects': () =>
        `sonido.quitar_efectos()`,

    'sound_changevolumeby': (args) =>
        `sonido.cambiar_volumen(${formatNumberOrExpr(args.VOLUME, args, 'VOLUME')})`,

    'sound_setvolumeto': (args) =>
        `sonido.fijar_volumen(${formatNumberOrExpr(args.VOLUME, args, 'VOLUME')})`,

    'sound_volume': () =>
        `sonido.volumen`,

    // ═══════════════════════════════════════════════════════════════
    // CONTROL
    // ═══════════════════════════════════════════════════════════════

    'control_wait': (args) =>
        `esperar(${formatNumberOrExpr(args.DURATION, args, 'DURATION')})`,

    'control_repeat': (args, body) =>
        `for _ in range(int(${formatNumberOrExpr(args.TIMES, args, 'TIMES')})):\n${body || indent('pass')}`,

    'control_forever': (args, body) =>
        `while True:\n${body || indent('pass')}`,

    'control_if': (args, body) =>
        `if ${args.CONDITION || 'True'}:\n${body || indent('pass')}`,

    'control_if_else': (args, bodyIf, bodyElse) =>
        `if ${args.CONDITION || 'True'}:\n${bodyIf || indent('pass')}\nelse:\n${bodyElse || indent('pass')}`,

    'control_wait_until': (args) =>
        `while not (${args.CONDITION || 'True'}):\n    esperar(0.01)`,

    'control_repeat_until': (args, body) =>
        `while not (${args.CONDITION || 'True'}):\n${body || indent('pass')}`,

    'control_stop': (args) => {
        const option = args.STOP_OPTION || 'all';
        if (option === 'all') return 'detener_todo()';
        if (option === 'this script') return 'return  # Detener este script';
        if (option === 'other scripts in sprite') return 'detener_otros_scripts()';
        return 'detener_todo()';
    },

    'control_start_as_clone': () =>
        `@cuando_comience_como_clon\ndef al_clonar():`,

    'control_create_clone_of': (args) =>
        `crear_clon("${escapeString(args.CLONE_OPTION)}")`,

    'control_delete_this_clone': () =>
        `borrar_este_clon()`,

    // ═══════════════════════════════════════════════════════════════
    // SENSORES
    // ═══════════════════════════════════════════════════════════════

    'sensing_touchingobject': (args) =>
        `sprite.tocando("${escapeString(args.TOUCHINGOBJECTMENU)}")`,

    'sensing_touchingcolor': (args) =>
        `sprite.tocando_color("${escapeString(args.COLOR)}")`,

    'sensing_coloristouchingcolor': (args) =>
        `sprite.color_tocando_color("${escapeString(args.COLOR)}", "${escapeString(args.COLOR2)}")`,

    'sensing_distanceto': (args) =>
        `sprite.distancia_a("${escapeString(args.DISTANCETOMENU)}")`,

    'sensing_askandwait': (args) =>
        `preguntar(${formatValue(args.QUESTION, args, 'QUESTION')})`,

    'sensing_answer': () =>
        `respuesta`,

    'sensing_keypressed': (args) =>
        `tecla_presionada("${escapeString(args.KEY_OPTION)}")`,

    'sensing_mousedown': () =>
        `raton.presionado`,

    'sensing_mousex': () =>
        `raton.x`,

    'sensing_mousey': () =>
        `raton.y`,

    'sensing_setdragmode': (args) =>
        `sprite.fijar_modo_arrastre("${escapeString(args.DRAG_MODE)}")`,

    'sensing_loudness': () =>
        `volumen_microfono`,

    'sensing_timer': () =>
        `cronometro`,

    'sensing_resettimer': () =>
        `reiniciar_cronometro()`,

    'sensing_of': (args) =>
        `obtener_de("${escapeString(args.PROPERTY)}", "${escapeString(args.OBJECT)}")`,

    'sensing_current': (args) =>
        `fecha_actual("${escapeString(args.CURRENTMENU)}")`,

    'sensing_dayssince2000': () =>
        `dias_desde_2000`,

    'sensing_username': () =>
        `nombre_usuario`,

    // ═══════════════════════════════════════════════════════════════
    // OPERADORES
    // ═══════════════════════════════════════════════════════════════

    'operator_add': (args) =>
        `(${formatNumberOrExpr(args.NUM1, args, 'NUM1')} + ${formatNumberOrExpr(args.NUM2, args, 'NUM2')})`,

    'operator_subtract': (args) =>
        `(${formatNumberOrExpr(args.NUM1, args, 'NUM1')} - ${formatNumberOrExpr(args.NUM2, args, 'NUM2')})`,

    'operator_multiply': (args) =>
        `(${formatNumberOrExpr(args.NUM1, args, 'NUM1')} * ${formatNumberOrExpr(args.NUM2, args, 'NUM2')})`,

    'operator_divide': (args) =>
        `(${formatNumberOrExpr(args.NUM1, args, 'NUM1')} / ${formatNumberOrExpr(args.NUM2, args, 'NUM2')})`,

    'operator_random': (args) =>
        `aleatorio(${formatNumberOrExpr(args.FROM, args, 'FROM')}, ${formatNumberOrExpr(args.TO, args, 'TO')})`,

    'operator_gt': (args) =>
        `(${formatNumberOrExpr(args.OPERAND1, args, 'OPERAND1')} > ${formatNumberOrExpr(args.OPERAND2, args, 'OPERAND2')})`,

    'operator_lt': (args) =>
        `(${formatNumberOrExpr(args.OPERAND1, args, 'OPERAND1')} < ${formatNumberOrExpr(args.OPERAND2, args, 'OPERAND2')})`,

    'operator_equals': (args) =>
        `(${formatNumberOrExpr(args.OPERAND1, args, 'OPERAND1')} == ${formatNumberOrExpr(args.OPERAND2, args, 'OPERAND2')})`,

    'operator_and': (args) =>
        `(${args.OPERAND1 || 'True'} and ${args.OPERAND2 || 'True'})`,

    'operator_or': (args) =>
        `(${args.OPERAND1 || 'False'} or ${args.OPERAND2 || 'False'})`,

    'operator_not': (args) =>
        `(not ${args.OPERAND || 'True'})`,

    'operator_join': (args) =>
        `unir(${formatValue(args.STRING1, args, 'STRING1')}, ${formatValue(args.STRING2, args, 'STRING2')})`,

    'operator_letter_of': (args) =>
        `letra_de(${formatNumberOrExpr(args.LETTER, args, 'LETTER')}, ${formatValue(args.STRING, args, 'STRING')})`,

    'operator_length': (args) =>
        `longitud(${formatValue(args.STRING, args, 'STRING')})`,

    'operator_contains': (args) =>
        `(${formatValue(args.STRING2, args, 'STRING2')} in ${formatValue(args.STRING1, args, 'STRING1')})`,

    'operator_mod': (args) =>
        `(${formatNumberOrExpr(args.NUM1, args, 'NUM1')} % ${formatNumberOrExpr(args.NUM2, args, 'NUM2')})`,

    'operator_round': (args) =>
        `redondear(${formatNumberOrExpr(args.NUM, args, 'NUM')})`,

    'operator_mathop': (args) => {
        const op = args.OPERATOR || 'abs';
        const num = formatNumber(args.NUM);
        const ops = {
            'abs': `abs(${num})`,
            'floor': `piso(${num})`,
            'ceiling': `techo(${num})`,
            'sqrt': `raiz(${num})`,
            'sin': `seno(${num})`,
            'cos': `coseno(${num})`,
            'tan': `tangente(${num})`,
            'asin': `arcoseno(${num})`,
            'acos': `arcocoseno(${num})`,
            'atan': `arcotangente(${num})`,
            'ln': `logaritmo_natural(${num})`,
            'log': `logaritmo(${num})`,
            'e ^': `e_elevado(${num})`,
            '10 ^': `diez_elevado(${num})`
        };
        return ops[op] || `${op}(${num})`;
    },

    // ═══════════════════════════════════════════════════════════════
    // VARIABLES
    // ═══════════════════════════════════════════════════════════════

    'data_variable': (args) =>
        `${args.VARIABLE || 'variable'}`,

    'data_setvariableto': (args) =>
        `${args.VARIABLE || 'variable'} = ${formatNumberOrExpr(args.VALUE, args, 'VALUE')}`,

    'data_changevariableby': (args) =>
        `${args.VARIABLE || 'variable'} += ${formatNumberOrExpr(args.VALUE, args, 'VALUE')}`,

    'data_showvariable': (args) =>
        `mostrar_variable("${escapeString(args.VARIABLE)}")`,

    'data_hidevariable': (args) =>
        `ocultar_variable("${escapeString(args.VARIABLE)}")`,

    // ═══════════════════════════════════════════════════════════════
    // LISTAS
    // ═══════════════════════════════════════════════════════════════

    'data_listcontents': (args) =>
        `${args.LIST || 'lista'}`,

    'data_addtolist': (args) =>
        `${args.LIST || 'lista'}.agregar(${formatValue(args.ITEM, args, 'ITEM')})`,

    'data_deleteoflist': (args) =>
        `${args.LIST || 'lista'}.eliminar(${formatNumberOrExpr(args.INDEX, args, 'INDEX')})`,

    'data_deletealloflist': (args) =>
        `${args.LIST || 'lista'}.limpiar()`,

    'data_insertatlist': (args) =>
        `${args.LIST || 'lista'}.insertar(${formatNumberOrExpr(args.INDEX, args, 'INDEX')}, ${formatValue(args.ITEM, args, 'ITEM')})`,

    'data_replaceitemoflist': (args) =>
        `${args.LIST || 'lista'}[${formatNumberOrExpr(args.INDEX, args, 'INDEX')}] = ${formatValue(args.ITEM, args, 'ITEM')}`,

    'data_itemoflist': (args) =>
        `${args.LIST || 'lista'}[${formatNumberOrExpr(args.INDEX, args, 'INDEX')}]`,

    'data_itemnumoflist': (args) =>
        `${args.LIST || 'lista'}.indice_de(${formatValue(args.ITEM, args, 'ITEM')})`,

    'data_lengthoflist': (args) =>
        `len(${args.LIST || 'lista'})`,

    'data_listcontainsitem': (args) =>
        `${args.ITEM || '""'} in ${args.LIST || 'lista'}`,

    'data_showlist': (args) =>
        `mostrar_lista("${escapeString(args.LIST)}")`,

    'data_hidelist': (args) =>
        `ocultar_lista("${escapeString(args.LIST)}")`,

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES DE JUEGO (Game Blocks de STBlock)
    // ═══════════════════════════════════════════════════════════════

    // ── Gravedad ──
    'game_setGravity': (args) =>
        `fisica.fijar_gravedad(${formatNumberOrExpr(args.GRAVITY, args, 'GRAVITY')})`,

    'game_changeGravity': (args) =>
        `fisica.cambiar_gravedad(${formatNumberOrExpr(args.GRAVITY, args, 'GRAVITY')})`,

    'game_gravity': () =>
        `fisica.gravedad`,

    'game_setTerminalVelocity': (args) =>
        `fisica.fijar_velocidad_terminal(${formatNumberOrExpr(args.VELOCITY, args, 'VELOCITY')})`,

    'game_terminalVelocity': () =>
        `fisica.velocidad_terminal`,

    'game_setGroundY': (args) =>
        `fisica.fijar_suelo_y(${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'game_groundY': () =>
        `fisica.suelo_y`,

    'game_applyGravity': () =>
        `sprite.aplicar_gravedad()`,

    'game_jump': (args) =>
        `sprite.saltar(${formatNumberOrExpr(args.FORCE, args, 'FORCE')})`,

    'game_isOnGround': (args) =>
        `sprite.en_suelo(${formatNumberOrExpr(args.TOLERANCE, args, 'TOLERANCE')})`,

    'game_setAirControl': (args) =>
        `sprite.fijar_control_aire(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')})`,

    'game_resetPhysics': () =>
        `sprite.reiniciar_fisicas()`,

    // ── Fisica ──
    'game_setVelocity': (args) =>
        `sprite.fijar_velocidad(${formatNumberOrExpr(args.VX, args, 'VX')}, ${formatNumberOrExpr(args.VY, args, 'VY')})`,

    'game_setVelocityX': (args) =>
        `sprite.fijar_velocidad_x(${formatNumberOrExpr(args.VX, args, 'VX')})`,

    'game_setVelocityY': (args) =>
        `sprite.fijar_velocidad_y(${formatNumberOrExpr(args.VY, args, 'VY')})`,

    'game_changeVelocity': (args) =>
        `sprite.cambiar_velocidad(${formatNumberOrExpr(args.VX, args, 'VX')}, ${formatNumberOrExpr(args.VY, args, 'VY')})`,

    'game_getVelocityX': () =>
        `sprite.velocidad_x`,

    'game_getVelocityY': () =>
        `sprite.velocidad_y`,

    'game_velocityX': () =>
        `sprite.velocidad_x`,

    'game_velocityY': () =>
        `sprite.velocidad_y`,

    'game_setAcceleration': (args) =>
        `sprite.fijar_aceleracion(${formatNumberOrExpr(args.AX, args, 'AX')}, ${formatNumberOrExpr(args.AY, args, 'AY')})`,

    'game_applyVelocity': () =>
        `sprite.aplicar_velocidad()`,

    'game_setFriction': (args) =>
        `sprite.fijar_friccion(${formatNumberOrExpr(args.FRICTION, args, 'FRICTION')})`,

    'game_setBounce': (args) =>
        `sprite.fijar_rebote(${formatNumberOrExpr(args.BOUNCE, args, 'BOUNCE')})`,

    'game_applyForce': (args) =>
        `sprite.aplicar_fuerza(${formatNumberOrExpr(args.FORCE, args, 'FORCE')}, ${formatNumberOrExpr(args.DIRECTION, args, 'DIRECTION')})`,

    'game_stopMotion': (args) =>
        `sprite.detener_movimiento("${escapeString(args.AXIS)}")`,

    'game_clampToStage': () =>
        `sprite.mantener_en_escenario()`,

    'game_bounceOnStageEdge': () =>
        `sprite.rebotar_en_borde_escenario()`,

    'game_speed': () =>
        `sprite.rapidez`,

    'game_setMass': (args) =>
        `sprite.fijar_masa(${formatNumberOrExpr(args.MASS, args, 'MASS')})`,

    'game_isInAir': () =>
        `sprite.en_aire()`,

    // ── Camara ──
    'game_cameraSetXY': (args) =>
        `camara.fijar_posicion(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'game_cameraChangeXY': (args) =>
        `camara.mover(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'game_cameraFollowThis': (args) =>
        `camara.seguir(sprite, ${formatNumberOrExpr(args.STRENGTH, args, 'STRENGTH')})`,

    'game_cameraFollowTarget': (args) =>
        `camara.seguir_objetivo(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.STRENGTH, args, 'STRENGTH')})`,

    'game_cameraSetZoom': (args) =>
        `camara.fijar_zoom(${formatNumberOrExpr(args.ZOOM, args, 'ZOOM')})`,

    'game_cameraChangeZoom': (args) =>
        `camara.cambiar_zoom(${formatNumberOrExpr(args.ZOOM, args, 'ZOOM')})`,

    'game_cameraShake': (args) =>
        `camara.sacudir(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')})`,

    'game_cameraX': () =>
        `camara.x`,

    'game_cameraY': () =>
        `camara.y`,

    'game_cameraZoom': () =>
        `camara.zoom`,

    'game_worldToScreenX': (args) =>
        `camara.mundo_a_pantalla_x(${formatNumberOrExpr(args.X, args, 'X')})`,

    'game_worldToScreenY': (args) =>
        `camara.mundo_a_pantalla_y(${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'game_screenToWorldX': (args) =>
        `camara.pantalla_a_mundo_x(${formatNumberOrExpr(args.X, args, 'X')})`,

    'game_screenToWorldY': (args) =>
        `camara.pantalla_a_mundo_y(${formatNumberOrExpr(args.Y, args, 'Y')})`,

    'game_placeAtWorldXY': (args) =>
        `sprite.colocar_en_mundo(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')})`,

    // ── IA ──
    'game_aiMoveToXY': (args) =>
        `ia.mover_a_xy(${formatNumberOrExpr(args.X, args, 'X')}, ${formatNumberOrExpr(args.Y, args, 'Y')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiMoveTowardTarget': (args) =>
        `ia.perseguir(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiFleeFromTarget': (args) =>
        `ia.huir_de(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiFaceTarget': (args) =>
        `ia.mirar_a(${formatValue(args.TARGET, args, 'TARGET')})`,

    'game_aiDistanceToTarget': (args) =>
        `ia.distancia_a(${formatValue(args.TARGET, args, 'TARGET')})`,

    'game_aiTargetInRange': (args) =>
        `ia.en_rango(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.RANGE, args, 'RANGE')})`,

    'game_aiPatrolX': (args) =>
        `ia.patrullar_x(${formatNumberOrExpr(args.X1, args, 'X1')}, ${formatNumberOrExpr(args.X2, args, 'X2')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiChaseIfInRange': (args) =>
        `ia.perseguir_si_rango(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.RANGE, args, 'RANGE')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiKeepDistance': (args) =>
        `ia.mantener_distancia(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.MIN, args, 'MIN')}, ${formatNumberOrExpr(args.MAX, args, 'MAX')}, ${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiWander': (args) =>
        `ia.deambular(${formatNumberOrExpr(args.SPEED, args, 'SPEED')})`,

    'game_aiStopNearTarget': (args) =>
        `ia.cerca_de(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.DISTANCE, args, 'DISTANCE')})`,

    // ── Combate y Vida ──
    'game_setMaxHealth': (args) =>
        `sprite.fijar_salud_maxima(${formatNumberOrExpr(args.HEALTH, args, 'HEALTH')})`,

    'game_setHealth': (args) =>
        `sprite.fijar_salud(${formatNumberOrExpr(args.HEALTH, args, 'HEALTH')})`,

    'game_changeHealth': (args) =>
        `sprite.cambiar_salud(${formatNumberOrExpr(args.HEALTH, args, 'HEALTH')})`,

    'game_getHealth': () =>
        `sprite.salud`,

    'game_health': () =>
        `sprite.salud`,

    'game_maxHealth': () =>
        `sprite.salud_maxima`,

    'game_getMaxHealth': () =>
        `sprite.salud_maxima`,

    'game_healthPercent': () =>
        `sprite.salud_porcentaje()`,

    'game_isAlive': () =>
        `sprite.esta_vivo()`,

    'game_isDead': () =>
        `sprite.esta_muerto()`,

    'game_damageSelf': (args) =>
        `sprite.recibir_dano(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')})`,

    'game_healSelf': (args) =>
        `sprite.curar(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')})`,

    'game_setAttackDamage': (args) =>
        `sprite.fijar_dano_ataque(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')})`,

    'game_attackTargetIfTouching': (args) =>
        `sprite.atacar_si_toca(${formatValue(args.TARGET, args, 'TARGET')})`,

    'game_damageTarget': (args) =>
        `sprite.danar_objetivo(${formatNumberOrExpr(args.AMOUNT, args, 'AMOUNT')}, ${formatValue(args.TARGET, args, 'TARGET')})`,

    'game_setInvincible': (args) =>
        `sprite.hacer_invencible(${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'game_isInvincible': () =>
        `sprite.es_invencible`,

    'game_knockbackFromTarget': (args) =>
        `sprite.retroceso_desde(${formatValue(args.TARGET, args, 'TARGET')}, ${formatNumberOrExpr(args.FORCE, args, 'FORCE')})`,

    'game_revive': (args) =>
        `sprite.revivir(${formatNumberOrExpr(args.HEALTH, args, 'HEALTH')})`,

    // ── Colisiones ──
    'game_onCollision': (args) =>
        `@cuando_colisiona("${escapeString(args.TARGET)}")\ndef al_colisionar():`,

    'game_isCollidingWith': (args) =>
        `sprite.colisiona_con("${escapeString(args.TARGET)}")`,

    // ═══════════════════════════════════════════════════════════════
    // PROGRAMACION (Logica avanzada)
    // ═══════════════════════════════════════════════════════════════

    'logic_true': () => `True`,

    'logic_false': () => `False`,

    'logic_xor': (args) =>
        `(${args.A || 'True'} != ${args.B || 'True'})`,

    'logic_implies': (args) =>
        `((not ${args.A || 'True'}) or ${args.B || 'True'})`,

    'logic_equalStrict': (args) =>
        `(type(${args.A}) == type(${args.B}) and ${args.A} == ${args.B})`,

    'logic_between': (args) =>
        `(${formatNumberOrExpr(args.MIN, args, 'MIN')} <= ${formatNumberOrExpr(args.VALUE, args, 'VALUE')} <= ${formatNumberOrExpr(args.MAX, args, 'MAX')})`,

    'logic_outside': (args) =>
        `(not (${formatNumberOrExpr(args.MIN, args, 'MIN')} <= ${formatNumberOrExpr(args.VALUE, args, 'VALUE')} <= ${formatNumberOrExpr(args.MAX, args, 'MAX')}))`,

    'logic_clamp': (args) =>
        `limitado(${formatNumberOrExpr(args.VALUE, args, 'VALUE')}, ${formatNumberOrExpr(args.MIN, args, 'MIN')}, ${formatNumberOrExpr(args.MAX, args, 'MAX')})`,

    'logic_map': (args) =>
        `mapeado(${formatNumberOrExpr(args.VALUE, args, 'VALUE')}, ${formatNumberOrExpr(args.IN_MIN, args, 'IN_MIN')}, ${formatNumberOrExpr(args.IN_MAX, args, 'IN_MAX')}, ${formatNumberOrExpr(args.OUT_MIN, args, 'OUT_MIN')}, ${formatNumberOrExpr(args.OUT_MAX, args, 'OUT_MAX')})`,

    'logic_lerp': (args) =>
        `interpolar(${formatNumberOrExpr(args.A, args, 'A')}, ${formatNumberOrExpr(args.B, args, 'B')}, ${formatNumberOrExpr(args.T, args, 'T')})`,

    'logic_distance': (args) =>
        `distancia_puntos(${formatNumberOrExpr(args.X1, args, 'X1')}, ${formatNumberOrExpr(args.Y1, args, 'Y1')}, ${formatNumberOrExpr(args.X2, args, 'X2')}, ${formatNumberOrExpr(args.Y2, args, 'Y2')})`,

    'logic_angleTo': (args) =>
        `angulo_hacia(${formatNumberOrExpr(args.X1, args, 'X1')}, ${formatNumberOrExpr(args.Y1, args, 'Y1')}, ${formatNumberOrExpr(args.X2, args, 'X2')}, ${formatNumberOrExpr(args.Y2, args, 'Y2')})`,

    'logic_roundDecimals': (args) =>
        `redondear_decimales(${formatNumberOrExpr(args.VALUE, args, 'VALUE')}, ${formatNumberOrExpr(args.DECIMALS, args, 'DECIMALS')})`,

    'logic_percent': (args) =>
        `porcentaje(${formatNumberOrExpr(args.PART, args, 'PART')}, ${formatNumberOrExpr(args.TOTAL, args, 'TOTAL')})`,

    'logic_sign': (args) =>
        `signo(${formatNumberOrExpr(args.VALUE, args, 'VALUE')})`,

    'logic_textContains': (args) =>
        `(${formatValue(args.PART, args, 'PART')} in ${formatValue(args.TEXT, args, 'TEXT')})`,

    'logic_textStarts': (args) =>
        `str(${formatValue(args.TEXT, args, 'TEXT')}).startswith(${formatValue(args.PART, args, 'PART')})`,

    'logic_textEnds': (args) =>
        `str(${formatValue(args.TEXT, args, 'TEXT')}).endswith(${formatValue(args.PART, args, 'PART')})`,

    'logic_textReplace': (args) =>
        `reemplazar_texto(${formatValue(args.TEXT, args, 'TEXT')}, ${formatValue(args.FIND, args, 'FIND')}, ${formatValue(args.REPLACE, args, 'REPLACE')})`,

    'logic_toNumber': (args) =>
        `float(${formatValue(args.VALUE, args, 'VALUE')})`,

    'logic_toText': (args) =>
        `str(${formatValue(args.VALUE, args, 'VALUE')})`,

    // ═══════════════════════════════════════════════════════════════
    // DATOS AVANZADOS (JSON y listas)
    // ═══════════════════════════════════════════════════════════════

    'logic_jsonGet': (args) =>
        `json_obtener(${formatValue(args.JSON, args, 'JSON')}, ${formatValue(args.KEY, args, 'KEY')})`,

    'logic_jsonSet': (args) =>
        `json_poner(${formatValue(args.JSON, args, 'JSON')}, ${formatValue(args.KEY, args, 'KEY')}, ${formatValue(args.VALUE, args, 'VALUE')})`,

    'logic_jsonHas': (args) =>
        `json_tiene(${formatValue(args.JSON, args, 'JSON')}, ${formatValue(args.KEY, args, 'KEY')})`,

    'logic_jsonStringify': (args) =>
        `json_texto(${formatValue(args.VALUE, args, 'VALUE')})`,

    'logic_listFromText': (args) =>
        `str(${formatValue(args.TEXT, args, 'TEXT')}).split(${formatValue(args.SEP, args, 'SEP')})`,

    'logic_listJoin': (args) =>
        `${formatValue(args.SEP, args, 'SEP')}.join(${formatValue(args.LIST, args, 'LIST')})`,

    'logic_listLength': (args) =>
        `len(${formatValue(args.LIST, args, 'LIST')})`,

    'logic_listItem': (args) =>
        `${formatValue(args.LIST, args, 'LIST')}[int(${formatNumberOrExpr(args.INDEX, args, 'INDEX')}) - 1]`,

    'logic_listContains': (args) =>
        `(${formatValue(args.VALUE, args, 'VALUE')} in ${formatValue(args.LIST, args, 'LIST')})`,

    // ═══════════════════════════════════════════════════════════════
    // CONTROL EXTENDIDO
    // ═══════════════════════════════════════════════════════════════

    'control_waitUntilTimeout': (args) =>
        `while not (${args.CONDITION || 'True'}):\n    esperar(0.01)\n    if (${args.CONDITION}) is not None and (${args.CONDITION}): break`,

    'control_everySeconds': (args, body) =>
        `while True:\n${body || indent('pass')}\n    esperar(${formatNumberOrExpr(args.SECS, args, 'SECS')})`,

    'control_forSeconds': (args, body) =>
        `inicio_tiempo = cronometro\nwhile cronometro - inicio_tiempo < ${formatNumberOrExpr(args.SECS, args, 'SECS')}:\n${body || indent('pass')}`,

    'control_countHere': (args) =>
        `conteo("${escapeString(args.NAME)}")`,

    // ═══════════════════════════════════════════════════════════════
    // SENSORES EXTENDIDOS (Runtime)
    // ═══════════════════════════════════════════════════════════════

    'sensing_deltaTime': () =>
        `delta_tiempo`,

    'sensing_fps': () =>
        `fps`,

    'sensing_stageWidth': () =>
        `escenario.ancho`,

    'sensing_stageHeight': () =>
        `escenario.alto`,

    'sensing_mouseSpeed': () =>
        `raton.velocidad`,

    'sensing_mousePreviousX': () =>
        `raton.x_anterior`,

    'sensing_mousePreviousY': () =>
        `raton.y_anterior`,

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS PRO
    // ═══════════════════════════════════════════════════════════════

    'event_everyFrame': () =>
        `@cada_frame\ndef cada_frame():`,

    'event_everySeconds': (args) =>
        `@cada_segundos(${formatNumberOrExpr(args.SECS, args, 'SECS')})\ndef cada_segundo():`,

    'event_whenCustom': (args) =>
        `@cuando_evento("${escapeString(args.NAME)}")\ndef al_recibir_evento():`,

    'event_emitCustom': (args) =>
        `emitir_evento("${escapeString(args.NAME)}")`,

    'event_emitCustomWithData': (args) =>
        `emitir_evento("${escapeString(args.NAME)}", ${formatValue(args.DATA, args, 'DATA')})`,

    'event_eventData': (args) =>
        `dato_evento("${escapeString(args.NAME)}")`,

    // ═══════════════════════════════════════════════════════════════
    // ESTADOS
    // ═══════════════════════════════════════════════════════════════

    'state_set': (args) =>
        `estado.cambiar("${escapeString(args.NAME)}")`,

    'state_current': () =>
        `estado.actual`,

    'state_previous': () =>
        `estado.anterior`,

    'state_is': (args) =>
        `estado.es("${escapeString(args.NAME)}")`,

    'state_back': () =>
        `estado.volver()`,

    'state_reset': () =>
        `estado.reiniciar()`,

    // ═══════════════════════════════════════════════════════════════
    // DEBUG
    // ═══════════════════════════════════════════════════════════════

    'debug_log': (args) =>
        `debug.imprimir(${formatValue(args.VALUE, args, 'VALUE')})`,

    'debug_warn': (args) =>
        `debug.advertir(${formatValue(args.VALUE, args, 'VALUE')})`,

    'debug_error': (args) =>
        `debug.error(${formatValue(args.VALUE, args, 'VALUE')})`,

    'debug_pauseIf': (args) =>
        `debug.pausar_si(${args.CONDITION || 'True'})`,

    'debug_mark': (args) =>
        `debug.marcar("${escapeString(args.NAME)}")`,

    'debug_msSinceMark': (args) =>
        `debug.ms_desde("${escapeString(args.NAME)}")`,

    'debug_count': (args) =>
        `debug.contar("${escapeString(args.NAME)}")`,

    'debug_counter': (args) =>
        `debug.contador("${escapeString(args.NAME)}")`,

    // ═══════════════════════════════════════════════════════════════
    // PRUEBAS
    // ═══════════════════════════════════════════════════════════════

    'test_assertTrue': (args) =>
        `pruebas.afirmar_verdadero(${args.CONDITION || 'True'}, "${escapeString(args.NAME)}")`,

    'test_assertEqual': (args) =>
        `pruebas.afirmar_igual(${formatValue(args.VALUE, args, 'VALUE')}, ${formatValue(args.EXPECTED, args, 'EXPECTED')}, "${escapeString(args.NAME)}")`,

    'test_assertBetween': (args) =>
        `pruebas.afirmar_entre(${formatNumberOrExpr(args.VALUE, args, 'VALUE')}, ${formatNumberOrExpr(args.MIN, args, 'MIN')}, ${formatNumberOrExpr(args.MAX, args, 'MAX')}, "${escapeString(args.NAME)}")`,

    'test_reset': () =>
        `pruebas.reiniciar()`,

    'test_passed': () =>
        `pruebas.pasadas`,

    'test_failed': () =>
        `pruebas.fallidas`,

    'test_total': () =>
        `pruebas.total`,

    'test_report': () =>
        `pruebas.reporte`,

    // ═══════════════════════════════════════════════════════════════
    // BLOQUES PERSONALIZADOS (Mis bloques)
    // ═══════════════════════════════════════════════════════════════

    'procedures_definition': (args) => {
        const name = args.procedureName || 'mi_bloque';
        const params = args.procedureParams || [];
        const paramsStr = params.join(', ');
        return `def ${name}(${paramsStr}):`;
    },

    'procedures_call': (args) => {
        const name = args.procedureName || 'mi_bloque';
        const callArgs = args.procedureArgs || [];
        const argsStr = callArgs.join(', ');
        return `${name}(${argsStr})`;
    },

    'argument_reporter_string_number': (args) => {
        // Sanitizar el nombre del parametro para que coincida con la definicion
        const name = args.VALUE || 'parametro';
        return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    },

    'argument_reporter_boolean': (args) => {
        // Sanitizar el nombre del parametro para que coincida con la definicion
        const name = args.VALUE || 'condicion';
        return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }
};

/**
 * Descripciones amigables para tooltips
 */
export const BLOCK_DESCRIPTIONS = {
    'motion_movesteps': 'Mueve el sprite hacia adelante',
    'motion_turnright': 'Gira el sprite a la derecha',
    'motion_turnleft': 'Gira el sprite a la izquierda',
    'control_repeat': 'Repite las instrucciones N veces',
    'control_forever': 'Repite las instrucciones para siempre',
    'control_if': 'Ejecuta si la condicion es verdadera',
    'control_wait': 'Espera un numero de segundos',
    'looks_say': 'Muestra un mensaje en un bocadillo',
    'looks_show': 'Hace visible al sprite',
    'looks_hide': 'Hace invisible al sprite'
};

export { indent, escapeString, formatNumber, formatValue, formatNumberOrExpr };
