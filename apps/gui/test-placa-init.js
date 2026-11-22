/* Functional test: _injectPlacaInit detecta el hat de placa y añade la llamada */
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

// Pre-cargar device-menu-mappings y python-runtime (sin efectos de Pyodide en import)
const mappingsPath = path.join(libDir, 'device-menu-mappings.js');
const runtimePath = path.join(libDir, 'python-runtime.js');
loadEsmAsCjs(mappingsPath);
loadEsmAsCjs(runtimePath);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    if (request === './device-menu-mappings.js') return mappingsPath;
    if (request === './python-runtime.js') return runtimePath;
    if (request === './device-menu-mappings') return mappingsPath;
    if (request === './python-runtime') return runtimePath;
    return origResolve.call(this, request, ...args);
};

const exe = loadEsmAsCjs(path.join(libDir, 'python-executor.js'));
const { default: PythonExecutor } = exe;

const exec = new PythonExecutor({});

const tests = [
    ['hat con cuerpo', '@cuando_placa_inicie\ndef al_iniciar_placa():\n    placa.modo(13, "salida")', true],
    ['hat sin cuerpo', '@cuando_placa_inicie\ndef al_iniciar_placa():\n    pass', true],
    ['sin hat (top-level)', 'placa.modo(13, "salida")\nplaca.escribir_digital(13, "alto")', false],
    ['funcion distinta', '@cuando_bandera_verde\ndef inicio():\n    placa.modo(13, "salida")', false],
    ['def sin decorador', 'def al_iniciar_placa():\n    pass', false]
];

let pass = 0;
let fail = 0;
for (const [name, code, shouldInject] of tests) {
    const out = exec._injectPlacaInit(code);
    const injected = out.includes('al_iniciar_placa()\n');
    const ok = injected === shouldInject;
    if (ok) pass++; else fail++;
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${name} → inyecta=${injected}`);
    if (!ok) console.log(`   código resultante:\n${out}`);
}
console.log(`\nResultado: ${pass} OK, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
