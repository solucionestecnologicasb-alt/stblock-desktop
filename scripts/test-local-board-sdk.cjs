const fs = require('fs'), path = require('path'), vm = require('vm');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const qa = path.join(root, 'test-results/board-sdk');
fs.mkdirSync(qa, {recursive: true});
const source = fs.readFileSync(path.join(root, 'scratch-gui/src/lib/device-profiles.js'), 'utf8');
const profiles = vm.runInNewContext(source.split('const getDeviceProfile')[0] + '\nDEVICE_PROFILES;');
const selected = process.argv.slice(2);
const results = [];
for (const [id, profile] of Object.entries(profiles)) {
    if (!profile.fqbn || (selected.length && !selected.includes(id))) continue;
    const folder = path.join(qa, id);
    fs.mkdirSync(folder, {recursive: true});
    const generated = path.join(root, 'test-results/electronics', id, `${id}.ino`);
    const code = fs.existsSync(generated) ? fs.readFileSync(generated, 'utf8') :
        '#include <Arduino.h>\nvoid setup() { Serial.begin(9600); pinMode(2, OUTPUT); digitalWrite(2, LOW); }\nvoid loop() { delay(10); }\n';
    fs.writeFileSync(path.join(folder, `${id}.ino`), code);
    const result = spawnSync(process.execPath, [path.join(__dirname, 'local-board-sdk.cjs'), 'compile', '--fqbn', profile.fqbn,
        '--libraries', path.join(root, 'src-tauri/tools/Arduino/libraries'), '--output-dir', path.join(folder, 'build'), folder],
    {encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024});
    const output = result.stdout + '\n' + result.stderr;
    fs.writeFileSync(path.join(folder, 'compile.log'), output);
    results.push({id, fqbn: profile.fqbn, status: result.status, generatedBlocks: fs.existsSync(generated)});
    console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${id}: ${profile.fqbn}`);
    if (result.status !== 0) console.log(output.slice(-5000));
}
const file = path.join(qa, 'results.json');
const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
fs.writeFileSync(file, JSON.stringify(previous.filter(p => !results.some(r => r.id === p.id)).concat(results), null, 2));
if (results.some(r => r.status !== 0)) process.exitCode = 1;
