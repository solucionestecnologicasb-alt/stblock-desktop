const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(root, '..', '..', 'openblock-desktop-main', 'openblock-desktop-main');
const vmEntry = path.join(sourceRoot, 'node_modules', 'openblock-vm', 'src', 'index.js');
const outputDir = path.join(root, 'scratch-vm', 'src', 'devices', 'manifests');

const devices = [
    ['arduinoUno', 'arduino'],
    ['stBoardExtension', 'arduino'],
    ['arduinoNano', 'arduino'],
    ['arduinoLeonardo', 'arduino'],
    ['arduinoMega2560', 'arduino'],
    ['stbBoardV2', 'arduino'],
    ['arduinoUnoR4Minima', 'arduino'],
    ['arduinoUnoR4Wifi', 'arduino'],
    ['arduinoEsp32', 'arduino'],
    ['arduinoEsp32S3', 'arduino'],
    ['arduinoEsp8266NodeMCU', 'arduino'],
    ['arduinoK210MaixDock', 'arduino'],
    ['arduinoK210Maixduino', 'arduino'],
    ['arduinoRaspberryPiPico', 'arduino'],
    ['arduinoRaspberryPiPicoW', 'arduino'],
    ['arduinoRaspberryPiPico2', 'arduino'],
    ['arduinoRaspberryPiPico2W', 'arduino'],
    ['microbit', 'microbit'],
    ['microbitV2', 'microbit']
];

if (!fs.existsSync(vmEntry)) {
    throw new Error(`OpenBlock VM source not found: ${vmEntry}`);
}

const VM = require(vmEntry);

const importDevice = async ([deviceId, type]) => {
    const vm = new VM();
    await vm.extensionManager.loadDeviceURL({deviceId, type});
    const categories = JSON.parse(JSON.stringify(vm.runtime._deviceBlockInfo));
    const manifest = {
        schemaVersion: 1,
        deviceId,
        type,
        blockCount: categories.reduce((total, category) => total + category.blocks.length, 0),
        categories
    };
    fs.writeFileSync(
        path.join(outputDir, `${deviceId}.json`),
        `${JSON.stringify(manifest)}\n`
    );
    return {deviceId, blockCount: manifest.blockCount, categories: categories.length};
};

(async () => {
    fs.mkdirSync(outputDir, {recursive: true});
    const summary = [];
    for (const device of devices) summary.push(await importDevice(device));
    fs.writeFileSync(
        path.join(outputDir, 'summary.json'),
        `${JSON.stringify(summary, null, 2)}\n`
    );
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
