/* Functional test: Blocks → Python for device opcodes */
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

const mappingsPath = path.join(libDir, 'device-menu-mappings.js');
loadEsmAsCjs(mappingsPath);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === './device-menu-mappings.js') return mappingsPath;
    return origResolve.call(this, request, ...args);
};

const bm = loadEsmAsCjs(path.join(libDir, 'block-mappings.js'));
const { BLOCK_TO_PYTHON } = bm;

const tests = [
    ['hat', 'arduino_whenArduinoBegin', {}, '@cuando_placa_inicie\ndef al_iniciar_placa():'],
    ['modo', 'arduino_pin_setPinMode', { PIN: '13', MODE: 'OUTPUT' }, 'placa.modo(13, "salida")'],
    ['digital out', 'arduino_pin_setDigitalOutput', { PIN: '13', LEVEL: 'HIGH' }, 'placa.escribir_digital(13, "alto")'],
    ['pwm', 'arduino_pin_setPwmOutput', { PIN: '9', OUT: 128 }, 'placa.escribir_analogico(9, 128)'],
    ['read analog A0', 'arduino_pin_readAnalogPin', { PIN: 'A0' }, 'placa.leer_analogico("A0")'],
    ['serial print warp', 'arduino_serial_serialPrint', { VALUE: 'Hola', EOL: 'warp' }, 'placa.serial_enviar("Hola", True)'],
    ['serial print noWarp', 'arduino_serial_serialPrint', { VALUE: 'Hola', EOL: 'noWarp' }, 'placa.serial_enviar("Hola", False)'],
    ['serial init', 'arduino_serial_serialBegin', { VALUE: '9600' }, 'placa.serial_iniciar(9600)'],
    ['convert', 'arduino_data_dataConvert', { TYPE: 'INTEGER', DATA: 42 }, 'placa.convertir("entero", 42)'],
    ['round', 'arduino_math_mathRound', { NUM: 3.7, MODE: 'round' }, 'placa.redondear(3.7, "redondear")'],
    ['array declare', 'arduino_arrays_arrayDeclare', { NAME: 'datos', TYPE: 'int', SIZE: 10 }, 'placa.array_declarar("datos", "int", 10)'],
    ['servo', 'arduino_pin_attachServo', { PIN: '9', MIN_US: 500, MAX_US: 2400 }, 'placa.conectar_servo(9, 500, 2400)'],
    ['stb port', 'arduino_stbv2puertos_moverServoPuerto', { PORT: '2', ANGLE: 90 }, 'placa.mover_servo_puerto(2, 90)'],
];

let pass = 0;
let fail = 0;
for (const [name, opcode, args, expected] of tests) {
    const gen = BLOCK_TO_PYTHON[opcode];
    if (!gen) {
        console.log(`[FAIL] ${name} → sin generador para ${opcode}`);
        fail++;
        continue;
    }
    let output;
    try {
        output = gen(args);
    } catch (e) {
        console.log(`[FAIL] ${name} → excepción: ${e.message}`);
        fail++;
        continue;
    }
    const status = output === expected ? 'OK' : 'FAIL';
    if (status === 'OK') pass++; else fail++;
    console.log(`[${status}] ${name}`);
    if (status === 'FAIL') console.log(`   esperado: ${JSON.stringify(expected)}\n   obtenido: ${JSON.stringify(output)}`);
}
console.log(`\nResultado: ${pass} OK, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
