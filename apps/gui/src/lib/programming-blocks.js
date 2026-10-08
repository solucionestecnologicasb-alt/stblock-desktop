const COLORS = {
    logic: ['#48BF53', '#389D42', '#2E7D35'],
    control: ['#FFAB19', '#CF8B17', '#A86F12'],
    sensing: ['#4CBFE6', '#2E8EB8', '#236B8A'],
    events: ['#FFD500', '#CC9900', '#B38600'],
    state: ['#9966FF', '#774DCB', '#5F3CA5'],
    debug: ['#607D8B', '#455A64', '#37474F'],
    test: ['#FF6680', '#D94D67', '#B33D53'],
    data: ['#FF8C1A', '#DB6E00', '#B85C00']
};

const block = (SB, type, message0, args0, shape, colors, message1, args1) => {
    SB.Blocks[type] = {
        init: function () {
            const json = {type, message0, args0: args0 || [], colour: colors[0], colourSecondary: colors[1], colourTertiary: colors[2]};
            if (message1) {
                json.message1 = message1;
                json.args1 = args1 || [];
            }
            if (shape === 'hat') json.extensions = ['shape_hat'];
            else if (shape === 'boolean') { json.output = 'Boolean'; json.outputShape = SB.OUTPUT_SHAPE_HEXAGONAL; }
            else if (shape === 'reporter') { json.output = null; json.outputShape = SB.OUTPUT_SHAPE_ROUND; }
            else if (shape === 'c') { json.previousStatement = null; json.nextStatement = null; }
            else { json.previousStatement = null; json.nextStatement = null; }
            this.jsonInit(json);
        }
    };
};
const v = name => ({type: 'input_value', name});
const stmt = name => ({type: 'input_statement', name});

export default function registerProgrammingBlocks (ScratchBlocks) {
    const SB = ScratchBlocks;
    const l = COLORS.logic, c = COLORS.control, s = COLORS.sensing, e = COLORS.events, st = COLORS.state, d = COLORS.debug, t = COLORS.test, data = COLORS.data;

    block(SB, 'logic_true', 'verdadero', [], 'boolean', l);
    block(SB, 'logic_false', 'falso', [], 'boolean', l);
    block(SB, 'logic_xor', '%1 xor %2', [v('A'), v('B')], 'boolean', l);
    block(SB, 'logic_implies', 'si %1 entonces %2', [v('A'), v('B')], 'boolean', l);
    block(SB, 'logic_equalStrict', '%1 igual estricto a %2', [v('A'), v('B')], 'boolean', l);
    block(SB, 'logic_between', '%1 entre %2 y %3', [v('VALUE'), v('MIN'), v('MAX')], 'boolean', l);
    block(SB, 'logic_outside', '%1 fuera de %2 y %3', [v('VALUE'), v('MIN'), v('MAX')], 'boolean', l);
    block(SB, 'logic_clamp', 'limitar %1 entre %2 y %3', [v('VALUE'), v('MIN'), v('MAX')], 'reporter', l);
    block(SB, 'logic_map', 'mapear %1 de %2-%3 a %4-%5', [v('VALUE'), v('IN_MIN'), v('IN_MAX'), v('OUT_MIN'), v('OUT_MAX')], 'reporter', l);
    block(SB, 'logic_lerp', 'interpolar %1 a %2 por %3', [v('A'), v('B'), v('T')], 'reporter', l);
    block(SB, 'logic_distance', 'distancia x1 %1 y1 %2 x2 %3 y2 %4', [v('X1'), v('Y1'), v('X2'), v('Y2')], 'reporter', l);
    block(SB, 'logic_angleTo', 'Ã¡ngulo x1 %1 y1 %2 hacia x2 %3 y2 %4', [v('X1'), v('Y1'), v('X2'), v('Y2')], 'reporter', l);
    block(SB, 'logic_roundDecimals', 'redondear %1 a %2 decimales', [v('VALUE'), v('DECIMALS')], 'reporter', l);
    block(SB, 'logic_percent', 'porcentaje %1 de %2', [v('PART'), v('TOTAL')], 'reporter', l);
    block(SB, 'logic_sign', 'signo de %1', [v('VALUE')], 'reporter', l);
    block(SB, 'logic_textContains', 'texto %1 contiene %2', [v('TEXT'), v('PART')], 'boolean', l);
    block(SB, 'logic_textStarts', 'texto %1 empieza con %2', [v('TEXT'), v('PART')], 'boolean', l);
    block(SB, 'logic_textEnds', 'texto %1 termina con %2', [v('TEXT'), v('PART')], 'boolean', l);
    block(SB, 'logic_textReplace', 'reemplazar %1 por %2 en %3', [v('FIND'), v('REPLACE'), v('TEXT')], 'reporter', l);
    block(SB, 'logic_toNumber', 'convertir %1 a nÃºmero', [v('VALUE')], 'reporter', l);
    block(SB, 'logic_toText', 'convertir %1 a texto', [v('VALUE')], 'reporter', l);

    block(SB, 'logic_jsonGet', 'objeto %1 propiedad %2', [v('JSON'), v('KEY')], 'reporter', data);
    block(SB, 'logic_jsonSet', 'objeto %1 poner %2 a %3', [v('JSON'), v('KEY'), v('VALUE')], 'reporter', data);
    block(SB, 'logic_jsonHas', 'objeto %1 tiene %2', [v('JSON'), v('KEY')], 'boolean', data);
    block(SB, 'logic_jsonStringify', 'convertir %1 a JSON', [v('VALUE')], 'reporter', data);
    block(SB, 'logic_listFromText', 'lista desde texto %1 separado por %2', [v('TEXT'), v('SEP')], 'reporter', data);
    block(SB, 'logic_listJoin', 'unir lista %1 con %2', [v('LIST'), v('SEP')], 'reporter', data);
    block(SB, 'logic_listLength', 'longitud de lista %1', [v('LIST')], 'reporter', data);
    block(SB, 'logic_listItem', 'elemento %1 de lista %2', [v('INDEX'), v('LIST')], 'reporter', data);
    block(SB, 'logic_listContains', 'lista %1 contiene %2', [v('LIST'), v('VALUE')], 'boolean', data);

    block(SB, 'control_waitUntilTimeout', 'esperar hasta %1 con timeout %2 segundos', [v('CONDITION'), v('SECS')], 'command', c);
    block(SB, 'control_everySeconds', 'cada %1 segundos', [v('SECS')], 'c', c, '%1', [stmt('SUBSTACK')]);
    block(SB, 'control_forSeconds', 'durante %1 segundos', [v('SECS')], 'c', c, '%1', [stmt('SUBSTACK')]);
    block(SB, 'control_countHere', 'conteo de paso %1', [v('NAME')], 'reporter', c);

    block(SB, 'sensing_deltaTime', 'delta time', [], 'reporter', s);
    block(SB, 'sensing_fps', 'FPS actual', [], 'reporter', s);
    block(SB, 'sensing_stageWidth', 'ancho del escenario', [], 'reporter', s);
    block(SB, 'sensing_stageHeight', 'alto del escenario', [], 'reporter', s);
    block(SB, 'sensing_mouseSpeed', 'velocidad del mouse', [], 'reporter', s);
    block(SB, 'sensing_mousePreviousX', 'mouse x anterior', [], 'reporter', s);
    block(SB, 'sensing_mousePreviousY', 'mouse y anterior', [], 'reporter', s);

    block(SB, 'event_everyFrame', 'cada frame', [], 'hat', e);
    block(SB, 'event_everySeconds', 'cada %1 segundos', [v('SECS')], 'hat', e);
    block(SB, 'event_whenCustom', 'cuando ocurra evento %1', [v('NAME')], 'hat', e);
    block(SB, 'event_emitCustom', 'emitir evento %1', [v('NAME')], 'command', e);
    block(SB, 'event_emitCustomWithData', 'emitir evento %1 con dato %2', [v('NAME'), v('DATA')], 'command', e);
    block(SB, 'event_eventData', 'dato del evento %1', [v('NAME')], 'reporter', e);

    block(SB, 'state_set', 'cambiar estado a %1', [v('NAME')], 'command', st);
    block(SB, 'state_current', 'estado actual', [], 'reporter', st);
    block(SB, 'state_previous', 'estado anterior', [], 'reporter', st);
    block(SB, 'state_is', 'estado actual es %1', [v('NAME')], 'boolean', st);
    block(SB, 'state_back', 'volver al estado anterior', [], 'command', st);
    block(SB, 'state_reset', 'reiniciar estado', [], 'command', st);

    block(SB, 'debug_log', 'consola imprimir %1', [v('VALUE')], 'command', d);
    block(SB, 'debug_warn', 'consola advertencia %1', [v('VALUE')], 'command', d);
    block(SB, 'debug_error', 'consola error %1', [v('VALUE')], 'command', d);
    block(SB, 'debug_pauseIf', 'pausar si %1', [v('CONDITION')], 'command', d);
    block(SB, 'debug_mark', 'marcar tiempo %1', [v('NAME')], 'command', d);
    block(SB, 'debug_msSinceMark', 'ms desde marca %1', [v('NAME')], 'reporter', d);
    block(SB, 'debug_count', 'contar paso %1', [v('NAME')], 'command', d);
    block(SB, 'debug_counter', 'contador %1', [v('NAME')], 'reporter', d);

    block(SB, 'test_assertTrue', 'probar %1 es verdadero nombre %2', [v('CONDITION'), v('NAME')], 'command', t);
    block(SB, 'test_assertEqual', 'probar %1 igual a %2 nombre %3', [v('VALUE'), v('EXPECTED'), v('NAME')], 'command', t);
    block(SB, 'test_assertBetween', 'probar %1 entre %2 y %3 nombre %4', [v('VALUE'), v('MIN'), v('MAX'), v('NAME')], 'command', t);
    block(SB, 'test_reset', 'reiniciar pruebas', [], 'command', t);
    block(SB, 'test_passed', 'pruebas pasadas', [], 'reporter', t);
    block(SB, 'test_failed', 'pruebas fallidas', [], 'reporter', t);
    block(SB, 'test_total', 'pruebas totales', [], 'reporter', t);
    block(SB, 'test_report', 'reporte de pruebas', [], 'reporter', t);
}
