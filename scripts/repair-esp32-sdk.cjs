const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const data = path.join(root, 'src-tauri/tools/Arduino');
const qa = path.join(root, 'test-results/board-sdk');
(async () => {
    fs.mkdirSync(qa, {recursive: true});
    const pkg = JSON.parse(fs.readFileSync(path.join(data, 'package_esp32_index.json'))).packages.find(p => p.name === 'esp32');
    const dep = pkg.platforms.find(p => p.version === '3.1.3').toolsDependencies.find(t => t.name === 'esp32-arduino-libs');
    const tool = pkg.tools.find(t => t.name === dep.name && t.version === dep.version);
    const system = tool.systems.find(s => s.host === 'x86_64-mingw32');
    const archive = path.join(qa, system.archiveFileName);
    const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const expected = system.checksum.split(':')[1].toLowerCase();
    if (!fs.existsSync(archive) || hash(archive) !== expected) {
        console.log(`Downloading ${system.url}`);
        const response = await fetch(system.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    }
    if (hash(archive) !== expected) throw new Error('SDK checksum mismatch');
    const destination = path.join(data, 'packages/esp32/tools', dep.name, dep.version);
    fs.mkdirSync(destination, {recursive: true});
    const result = spawnSync('tar.exe', ['-xf', archive, '-C', destination, '--strip-components', '1'], {stdio: 'inherit', windowsHide: true});
    if (result.status !== 0) throw new Error('SDK extraction failed');
    // Eliminar subdirectorios de Matter cuyos paths exceden MAX_PATH (260) en Windows y rompen makensis
    try {
        const glob = spawnSync('powershell', ['-Command', `Get-ChildItem -Recurse "${destination}" -Directory -Filter "espressif__esp_matter" | Remove-Item -Recurse -Force`], {stdio: 'inherit', windowsHide: true});
    } catch (_) {}
    console.log(`Restored ${dep.name}@${dep.version}; SHA256 verified`);
})().catch(error => {console.error(error); process.exitCode = 1;});
