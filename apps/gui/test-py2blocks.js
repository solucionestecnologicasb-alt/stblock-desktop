/* Functional test: Python → Blocks for device opcodes */
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');

const libDir = path.join(__dirname, 'src', 'lib', 'python');

function loadEsmAsCjs(file) {
    const code = babel.transformFileSync(file, {
        presets: [[require.resolve('@babel/preset-env'), { modules: 'commonjs' }]],
        sourceType: 'module',
        configFile: false,
        babelrc: false
    }).code;
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(code, file);
    return m.exports;
}

// Transpile and load device-menu-mappings first
const mappingsPath = path.join(libDir, 'device-menu-mappings.js');
const mappings = loadEsmAsCjs(mappingsPath);

// Patch require so python-to-blocks finds our transpiled module
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === './device-menu-mappings.js') return mappingsPath;
    return origResolve.call(this, request, ...args);
};

const py2blocks = loadEsmAsCjs(path.join(libDir, 'python-to-blocks.js'));
const { pythonToBlocks } = py2blocks;

const tests = [
    ['modo', 'placa.modo(13, "salida")', 'arduino_pin_setPinMode'],
    ['digital output', 'placa.escribir_digital(13, "alto")', 'arduino_pin_setDigitalOutput'],
    ['analog read', 'placa.leer_analogico("A0")', 'arduino_pin_readAnalogPin'],
    ['serial print eol true', 'placa.serial_enviar("Hola", True)', 'arduino_serial_serialPrint'],
    ['serial print eol false', 'placa.serial_enviar("Hola", False)', 'arduino_serial_serialPrint'],
    ['serial init', 'placa.serial_iniciar(9600)', 'arduino_serial_serialBegin'],
    ['convert', 'placa.convertir("entero", 42)', 'arduino_data_dataConvert'],
    ['round', 'placa.redondear(3.7, "redondear")', 'arduino_math_mathRound'],
    ['array declare', 'placa.array_declarar("datos", "int", 10)', 'arduino_arrays_arrayDeclare'],
    ['hat arduino', '@cuando_placa_inicie\ndef al_iniciar_placa():', 'arduino_whenArduinoBegin'],
    ['hat microbit', '@cuando_placa_inicie\ndef al_iniciar_placa():', 'microbit_whenmicrobitbegin'],
];

let pass = 0;
let fail = 0;
for (const [name, code, expectedOpcode] of tests) {
    const deviceId = name === 'hat microbit' ? 'microbit' : 'arduinoUno';
    const result = pythonToBlocks(code, { x: -500, y: 30 }, deviceId);
    const blocks = Object.values(result.blockMap);
    const opcodes = blocks.map(b => b.opcode);
    const found = blocks.some(b => b.opcode === expectedOpcode);
    const status = found ? 'OK' : 'FAIL';
    if (found) pass++; else fail++;
    console.log(`[${status}] ${name} → ${opcodes.join(', ')}`);
    if (!found) {
        console.log('   esperado:', expectedOpcode);
        if (result.errors.length) console.log('   errores:', result.errors.map(e => e.message).join(' | '));
    }
}

// Verify fields/menus on setDigitalOutput
const r = pythonToBlocks('placa.escribir_digital(13, "alto")', { x: -500, y: 30 }, 'arduinoUno');
const blocks = Object.values(r.blockMap);
const main = blocks.find(b => b.opcode === 'arduino_pin_setDigitalOutput');
if (main) {
    console.log('PIN field:', JSON.stringify(main.fields.PIN));
    const levelShadow = blocks.find(b => b.opcode === 'arduino_pin_menu_level');
    console.log('LEVEL shadow fields:', JSON.stringify(levelShadow && levelShadow.fields));
    console.log('LEVEL input:', JSON.stringify(main.inputs.LEVEL));
}

// Verify validation: unknown placa method → unknown_function
const unknown = pythonToBlocks('placa.no_existe(1)', { x: -500, y: 30 }, 'arduinoUno');
console.log('unknown method errors:', unknown.errors.map(e => e.type + ': ' + e.message));

console.log(`\nResultado: ${pass} OK, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
