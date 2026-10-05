const catalog = require('./extension-catalog.json');
const compatible = (id, device, mode = 'upload') => {
    const extension = catalog.find(item => item.extensionId === id);
    if (!extension || !device || mode !== 'upload') return false;
    const deviceId = typeof device === 'string' ? device : device.deviceId;
    if (!deviceId || /^microbit/i.test(deviceId)) return false;
    if (id === 'stbV2Ultra') return deviceId === 'stbBoardV2';
    if (id === 'bluetooth_hc05') return /^(arduinoUno|arduinoNano|arduinoLeonardo|arduinoMega2560|stBoardExtension|stbBoardV2|arduinoEsp8266NodeMCU)$/.test(deviceId);
    // K210 Servo requires ServoK210 rather than the standard Servo library.
    if (id === 'servo' && /k210/i.test(deviceId)) return false;
    return deviceId === 'arduino' || deviceId === 'esp32' || /^arduino/.test(deviceId) || /^(stBoardExtension|stbBoardV2)$/.test(deviceId);
};
module.exports = compatible;
