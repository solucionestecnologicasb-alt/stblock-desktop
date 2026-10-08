const fs = require('fs');
const code = fs.readFileSync('src/lib/python/python-runtime.js', 'utf8');
const m = code.match(/const STBLOCK_PYTHON_API = `([\s\S]*?)`;/);
if (!m) {
    console.error('No se encontró STBLOCK_PYTHON_API');
    process.exit(1);
}
fs.writeFileSync('_stblock_api_extracted.py', m[1]);
console.log('Extraído', m[1].length, 'bytes');
