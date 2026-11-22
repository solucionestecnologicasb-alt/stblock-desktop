const fs = require('fs');
const dir = './src/devices/manifests/';
const files = ['arduinoUno.json', 'arduinoMega2560.json', 'arduinoNano.json', 'microbit.json', 'microbitV2.json', 'stbBoardV2.json'];
const LIVE = new Set(['setPinMode', 'setDigitalOutput', 'setPwmOutput', 'readDigitalPin', 'readAnalogPin',
    'attachServo', 'detachServo', 'setServoOutput', 'setServoPulseOutput', 'setContinuousServoSpeed', 'centerServo',
    'stopContinuousServo', 'moveServoSmooth', 'isServoAttached', 'readServoAngle', 'readServoPulse',
    'serialBegin', 'serialPrint', 'serialPrintln', 'serialAvailable', 'serialReadAByte', 'multiSerialBegin', 'multiSerialPrint', 'multiSerialAvailable', 'multiSerialReadAByte',
    'i2cBegin', 'i2cSetClock', 'i2cBeginTransmission', 'i2cWriteByte', 'i2cWriteString', 'i2cEndTransmission', 'i2cRequestFrom', 'i2cAvailable', 'i2cRead', 'i2cScan',
    'spiBegin', 'spiSettings', 'spiBeginTransaction', 'spiTransfer', 'spiTransferArray', 'spiEndTransaction', 'spiEnd',
    'dataMap', 'dataConstrain', 'dataConvert', 'dataConvertASCIICharacter', 'dataConvertASCIINumber', 'bitwiseOp', 'bitwiseNot',
    'arrayDeclare', 'arrayDeclareWithValues', 'arrayGet', 'arraySet', 'arrayLength', 'arrayPush', 'arrayPop', 'arrayInsert', 'arrayRemove', 'arrayIndexOf', 'arrayContains', 'arrayClear', 'arrayReverse',
    'controlSwitch', 'controlCase', 'controlDefault', 'controlBreak', 'pro_serialReadStringUntil', 'pro_serialFlush', 'getMicros',
    'mathPow', 'mathSqrt', 'mathAbs', 'mathRound', 'mathRoundDecimals', 'mathRandom', 'mathRandomSeed', 'mathRandomSeedAnalog', 'mathArraySum', 'mathArrayAverage', 'mathArrayMax', 'mathArrayMin', 'mathArraySort',
    'textLength', 'textCharAt', 'textSubstring', 'textCase', 'textTrim', 'textStartsWith', 'textEndsWith', 'textIndexOf', 'textReplace', 'textRepeat', 'textToAscii', 'textFromAscii',
    'structDefine', 'structCreate', 'structSet', 'structGet', 'structArrayCreate', 'structArraySet', 'structArrayGet',
    'moverServoPuerto', 'moverServoPuertoPorPulsos', 'desconectarServoPuerto', 'moverServoPuertoSuavemente']);
const result = [];
for (const f of files) {
    const m = JSON.parse(fs.readFileSync(dir + f, 'utf8'));
    for (const cat of (m.categories || [])) {
        for (const b of (cat.blocks || [])) {
            const info = b.info || {};
            if (!LIVE.has(info.opcode)) continue;
            const full = b.json && b.json.type;
            const xml = b.xml || '';
            const re = /<shadow type="([^"]*menu[^"]*)"><field name="([^"]+)"/g;
            let mm;
            while ((mm = re.exec(xml)) !== null) result.push(full + '[' + mm[2] + '] => ' + mm[1]);
            if (b.json && b.json.args0) {
                for (const a of b.json.args0) {
                    if (a.type === 'field_dropdown') result.push(full + '.' + a.name + ':FIELD => options=' + a.options.map(o => o[0] + '=' + o[1]).join('|'));
                }
            }
        }
    }
}
fs.writeFileSync('./menu-enum.txt', [...new Set(result)].sort().join('\n'));
