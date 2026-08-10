/**
 * Bloques de dispositivo utilizables en modo en vivo (realtime/Firmata).
 *
 * En modo Programación (fuera del modo Electrónica), la paleta del dispositivo
 * solo muestra estos bloques: los que pueden ejecutarse contra la placa de forma
 * interactiva (pines, servos, serial, I2C/SPI crudo) o computarse directamente
 * en el runtime Python (lógica pura: math/text/arrays/data/structs).
 *
 * Los bloques que dependen de funciones del firmware que el ConfigurableFirmata
 * actual NO implementa (motores, giroscopio, OLED, matriz LED, infrarrojos,
 * sensor de color, SD, Bluetooth, rawCode, interrupciones, pulseIn, shiftOut,
 * watchdog, eeprom, etc.) solo funcionan por subida C++ y quedan fuera de la
 * paleta en vivo.
 */

const LIVE_DEVICE_OPCODES = new Set([
    // ── Pines (Firmata estándar: digital, PWM) ──
    'setPinMode',
    'setDigitalOutput',
    'setPwmOutput',
    'readDigitalPin',
    'readAnalogPin',
    // ── Servos (Firmata: servoConfig + analogWrite) ──
    'attachServo',
    'detachServo',
    'setServoOutput',
    'setServoPulseOutput',
    'setContinuousServoSpeed',
    'centerServo',
    'stopContinuousServo',
    'moveServoSmooth',
    'isServoAttached',
    'readServoAngle',
    'readServoPulse',
    // ── Serial (hardware y por software, soportado por ConfigurableFirmata) ──
    'serialBegin',
    'serialPrint',
    'serialPrintln',
    'serialAvailable',
    'serialReadAByte',
    'multiSerialBegin',
    'multiSerialPrint',
    'multiSerialAvailable',
    'multiSerialReadAByte',
    // ── Comunicación cruda I2C/SPI (soportada por ConfigurableFirmata) ──
    'i2cBegin',
    'i2cSetClock',
    'i2cBeginTransmission',
    'i2cWriteByte',
    'i2cWriteString',
    'i2cEndTransmission',
    'i2cRequestFrom',
    'i2cAvailable',
    'i2cRead',
    'i2cScan',
    'spiBegin',
    'spiSettings',
    'spiBeginTransaction',
    'spiTransfer',
    'spiTransferArray',
    'spiEndTransaction',
    'spiEnd',
    // ── Lógica pura (se computa en el runtime, no toca hardware) ──
    // Datos
    'dataMap',
    'dataConstrain',
    'dataConvert',
    'dataConvertASCIICharacter',
    'dataConvertASCIINumber',
    'bitwiseOp',
    'bitwiseNot',
    // Arrays
    'arrayDeclare',
    'arrayDeclareWithValues',
    'arrayGet',
    'arraySet',
    'arrayLength',
    'arrayPush',
    'arrayPop',
    'arrayInsert',
    'arrayRemove',
    'arrayIndexOf',
    'arrayContains',
    'arrayClear',
    'arrayReverse',
    // Control / serial / micros
    'controlSwitch',
    'controlCase',
    'controlDefault',
    'controlBreak',
    'pro_serialReadStringUntil',
    'pro_serialFlush',
    'getMicros',
    // Math
    'mathPow',
    'mathSqrt',
    'mathAbs',
    'mathRound',
    'mathRoundDecimals',
    'mathRandom',
    'mathRandomSeed',
    'mathRandomSeedAnalog',
    'mathArraySum',
    'mathArrayAverage',
    'mathArrayMax',
    'mathArrayMin',
    'mathArraySort',
    // Texto
    'textLength',
    'textCharAt',
    'textSubstring',
    'textCase',
    'textTrim',
    'textStartsWith',
    'textEndsWith',
    'textIndexOf',
    'textReplace',
    'textRepeat',
    'textToAscii',
    'textFromAscii',
    // Structs
    'structDefine',
    'structCreate',
    'structSet',
    'structGet',
    'structArrayCreate',
    'structArraySet',
    'structArrayGet',
    // ── STBoard V2: servos de puerto (mapean a servoWrite) ──
    'moverServoPuerto',
    'moverServoPuertoPorPulsos',
    'desconectarServoPuerto',
    'moverServoPuertoSuavemente'
]);

/**
 * Filtra las categorías del manifest del dispositivo dejando solo los bloques
 * utilizables en modo en vivo. Devuelve una copia; no muta las categorías
 * originales. Descarta las categorías que quedan vacías.
 * @param {Array<object>} categories - `runtime._deviceBlockInfo`
 * @returns {Array<object>}
 */
const filterLiveDeviceCategories = categories => categories
    .map(categoryInfo => ({
        ...categoryInfo,
        blocks: (categoryInfo.blocks || []).filter(block =>
            block && block.info && LIVE_DEVICE_OPCODES.has(block.info.opcode))
    }))
    .filter(categoryInfo => categoryInfo.blocks.length > 0);

module.exports = {
    LIVE_DEVICE_OPCODES,
    filterLiveDeviceCategories
};
