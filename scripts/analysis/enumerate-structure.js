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
const byOpcode = {};
for (const f of files) {
    const m = JSON.parse(fs.readFileSync(dir + f, 'utf8'));
    for (const cat of (m.categories || [])) {
        for (const b of (cat.blocks || [])) {
            const info = b.info || {};
            if (!LIVE.has(info.opcode)) continue;
            const full = b.json && b.json.type;
            if (!byOpcode[full]) byOpcode[full] = { args0: null, xml: null };
            byOpcode[full].args0 = b.json && b.json.args0;
            byOpcode[full].xml = b.xml;
            byOpcode[full].info = info;
        }
    }
}
const out = [];
for (const full of Object.keys(byOpcode).sort()) {
    const v = byOpcode[full];
    const args0 = v.args0 || [];
    const parts = args0.map(a => {
        let detail = a.type;
        if (a.type === 'field_dropdown') detail = 'field:' + a.name + '{' + a.options.map(o => o[0] + '=' + o[1]).join(',') + '}';
        else if (a.type === 'input_value') detail = 'input:' + a.name;
        else if (a.type === 'field_number') detail = 'field_num:' + a.name;
        else if (a.type === 'field_input') detail = 'field_in:' + a.name;
        else if (a.type === 'field_checkbox') detail = 'field_chk:' + a.name;
        return detail;
    });
    // also extract shadow menus from xml
    const xml = v.xml || '';
    const re = /<value name="([^"]+)"><shadow type="([^"]+)"/g;
    const shadows = [];
    let mm;
    while ((mm = re.exec(xml)) !== null) shadows.push(mm[1] + '=' + mm[2]);
    out.push('### ' + full);
    out.push('  args0: ' + parts.join(' | '));
    if (shadows.length) out.push('  shadows: ' + shadows.join(' | '));
}
fs.writeFileSync('./structure-enum.txt', out.join('\n'));
