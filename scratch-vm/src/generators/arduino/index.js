/**
 * Arduino Code Generator for STBlock
 * Converts Scratch blocks to Arduino C++ code
 */

const controlGenerators = require('./control');
const ioGenerators = require('./io');
const operatorsGenerators = require('./operators');
const dataGenerators = require('./data');
const servoGenerators = require('./servo');
const eventsGenerators = require('./events');
const stboardGenerators = require('./stboard');
const stbv2Generators = require('./stbv2');
const arraysGenerators = require('./arrays');
const extrasGenerators = require('./extras');
const stbextGenerators = require('./stbext');

/**
 * Arduino Code Generator Class
 */
class ArduinoGenerator {
    constructor () {
        this.includes = new Set();
        this.globalVars = new Map();
        this.definitions = new Map();
        this.setupCode = [];
        this.loopCode = [];
        this.functions = new Map();
        this.servoCount = 0;
        this.indent = 0;

        // Register all generators
        this.generators = {
            ...controlGenerators,
            ...ioGenerators,
            ...operatorsGenerators,
            ...dataGenerators,
            ...servoGenerators,
            ...eventsGenerators,
            ...stboardGenerators,
            ...stbv2Generators,
            ...arraysGenerators,
            ...extrasGenerators,
            ...stbextGenerators
        };

        // Assign helper functions to the instance.
        // They need to live on `this` because block generators are invoked with
        // `generator.call(this, block, blocks)` and call helpers as methods.
        this._resolveRawCode = this.generators._resolveRawCode;
        delete this.generators._resolveRawCode;
        this._promoteCompareOperands = this.generators._promoteCompareOperands;
        this._processCompareOperand = this.generators._processCompareOperand;
        delete this.generators._promoteCompareOperands;
        delete this.generators._processCompareOperand;

        // Opcode aliases: old STBlock opcodes → current generator names
        // This supports .sb3 projects exported from older versions of STBlock.
        // Ported from openblock-blocks generators/arduino/arduino.js
        this._opcodeAliases = {
            // ======== Pin I/O (arduino_pin_*) ========
            'arduino_pin_setDigitalOutput': 'setDigitalOutput',
            'arduino_pin_setPwmOutput': 'setPwmOutput',
            'arduino_pin_setMode': 'setPinMode',
            'arduino_pin_setPinMode': 'setPinMode',
            'arduino_pin_readDigital': 'readDigitalPin',
            'arduino_pin_readDigitalPin': 'readDigitalPin',
            'arduino_pin_readAnalog': 'readAnalogPin',
            'arduino_pin_readAnalogPin': 'readAnalogPin',
            'arduino_pin_digitalWrite': 'arduino_digitalWrite',
            'arduino_pin_digitalRead': 'arduino_digitalRead',
            'arduino_pin_analogWrite': 'arduino_analogWrite',
            'arduino_pin_analogRead': 'arduino_analogRead',
            'arduino_pin_tone': 'arduino_tone',
            'arduino_pin_noTone': 'arduino_noTone',
            'arduino_pin_pulseIn': 'arduino_pulseIn',
            'arduino_pin_setLed': 'arduino_setLed',
            'arduino_pin_readButton': 'arduino_readButton',

            // ======== Servo (arduino_pin_*servo*) ========
            'arduino_pin_setServoOutput': 'setServoOutput',
            'arduino_pin_setServoPulseOutput': 'setServoPulseOutput',
            'arduino_pin_setContinuousServoSpeed': 'setContinuousServoSpeed',
            'arduino_pin_attachServo': 'attachServo',
            'arduino_pin_detachServo': 'detachServo',
            'arduino_pin_readServoAngle': 'readServoAngle',
            'arduino_pin_readServoPulse': 'readServoPulse',
            'arduino_pin_centerServo': 'centerServo',
            'arduino_pin_stopContinuousServo': 'stopContinuousServo',
            'arduino_pin_moveServoSmooth': 'moveServoSmooth',
            'arduino_pin_isServoAttached': 'isServoAttached',
            'arduino_pin_attachInterrupt': 'attachInterrupt',
            'arduino_pin_detachInterrupt': 'detachInterrupt',

            // ======== Serial (arduino_serial_*) ========
            'arduino_serial_serialBegin': 'multiSerialBegin',
            'arduino_serial_serialPrint': 'multiSerialPrint',
            'arduino_serial_serialAvailable': 'multiSerialAvailable',
            'arduino_serial_serialReadData': 'multiSerialReadAByte',
            'arduino_serial_multiSerialBegin': 'multiSerialBegin',
            'arduino_serial_multiSerialPrint': 'multiSerialPrint',
            'arduino_serial_multiSerialAvailable': 'multiSerialAvailable',
            'arduino_serial_multiSerialReadAByte': 'multiSerialReadAByte',
            'arduino_serial_begin': 'multiSerialBegin',
            'arduino_serial_print': 'multiSerialPrint',
            'arduino_serial_available': 'multiSerialAvailable',
            'arduino_serial_read': 'multiSerialReadAByte',
            'arduino_serial_readData': 'multiSerialReadAByte',

            // ======== Data/Convert (arduino_data_*) ========
            'arduino_data_dataMap': 'dataMap',
            'arduino_data_dataConstrain': 'dataConstrain',
            'arduino_data_dataConvert': 'dataConvert',
            'arduino_data_dataConvertASCIICharacter': 'dataConvertASCIICharacter',
            'arduino_data_dataConvertASCIINumber': 'dataConvertASCIINumber',
            'arduino_data_map': 'dataMap',
            'arduino_data_constrain': 'dataConstrain',
            'arduino_data_convert': 'dataConvert',
            'arduino_data_convertASCII': 'dataConvertASCIICharacter',
            'arduino_data_convertASCIINumber': 'dataConvertASCIINumber',
            'arduino_map': 'dataMap',
            'arduino_constrain': 'dataConstrain',
            'arduino_data_bitwiseOp': 'bitwiseOp',
            'arduino_data_bitwiseNot': 'bitwiseNot',
            'arduino_bitwise_and': 'bitwiseOp',
            'arduino_bitwise_or': 'bitwiseOp',
            'arduino_bitwise_xor': 'bitwiseOp',
            'arduino_bitwise_not': 'bitwiseNot',
            'arduino_shiftLeft': 'bitwiseOp',
            'arduino_shiftRight': 'bitwiseOp',

            // ======== Math (arduino_math_*) ========
            'arduino_math_mathPow': 'arduino_pow',
            'arduino_math_mathSqrt': 'arduino_sqrt',
            'arduino_math_mathAbs': 'arduino_abs',
            'arduino_math_mathRound': 'arduino_round',
            'arduino_math_mathRoundDecimals': 'mathRoundDecimals',
            'arduino_math_mathRandom': 'arduino_random',
            'arduino_math_mathRandomSeed': 'arduino_randomSeed',
            'arduino_math_mathRandomSeedAnalog': 'mathRandomSeedAnalog',
            'arduino_math_mathArraySum': 'mathArraySum',
            'arduino_math_mathArrayAverage': 'mathArrayAverage',
            'arduino_math_mathArrayMax': 'mathArrayMax',
            'arduino_math_mathArrayMin': 'mathArrayMin',
            'arduino_math_mathArraySort': 'mathArraySort',

            // ======== Text (arduino_text_*) ========
            'arduino_text_textLength': 'textLength',
            'arduino_text_textCharAt': 'textCharAt',
            'arduino_text_textSubstring': 'textSubstring',
            'arduino_text_textCase': 'textCase',
            'arduino_text_textTrim': 'textTrim',
            'arduino_text_textStartsWith': 'textStartsWith',
            'arduino_text_textEndsWith': 'textEndsWith',
            'arduino_text_textIndexOf': 'textIndexOf',
            'arduino_text_textReplace': 'textReplace',
            'arduino_text_textRepeat': 'textRepeat',
            'arduino_text_textToAscii': 'textToAscii',
            'arduino_text_textFromAscii': 'textFromAscii',

            // ======== Arrays (arduino_arrays_*) ========
            'arduino_arrays_arrayDeclare': 'arrayDeclare',
            'arduino_arrays_arrayDeclareWithValues': 'arrayDeclareWithValues',
            'arduino_arrays_arrayGet': 'arrayGet',
            'arduino_arrays_arraySet': 'arraySet',
            'arduino_arrays_arrayLength': 'arrayLength',
            'arduino_arrays_arrayPush': 'arrayPush',
            'arduino_arrays_arrayPop': 'arrayPop',
            'arduino_arrays_arrayInsert': 'arrayInsert',
            'arduino_arrays_arrayRemove': 'arrayRemove',
            'arduino_arrays_arrayIndexOf': 'arrayIndexOf',
            'arduino_arrays_arrayContains': 'arrayContains',
            'arduino_arrays_arrayClear': 'arrayClear',
            'arduino_arrays_arrayReverse': 'arrayReverse',
            'arduino_array_declare': 'arrayDeclare',
            'arduino_array_declareArray': 'arrayDeclare',
            'arduino_declareArray': 'arrayDeclare',

            // ======== Advanced (arduino_advanced_*) ========
            'arduino_advanced_eepromWrite': 'eepromWrite',
            'arduino_advanced_eepromRead': 'eepromRead',
            'arduino_advanced_watchdogEnable': 'watchdogEnable',
            'arduino_advanced_watchdogReset': 'watchdogReset',
            'arduino_advanced_getMicros': 'getMicros',
            'arduino_advanced_delayMicros': 'delayMicros',
            'arduino_advanced_setAnalogReference': 'setAnalogReference',
            'arduino_advanced_softwareReset': 'softwareReset',
            'arduino_advanced_attachInterrupt': 'advancedAttachInterrupt',
            'arduino_advanced_detachInterrupt': 'advancedDetachInterrupt',
            'arduino_advanced_pulseIn': 'advancedPulseIn',
            'arduino_advanced_shiftOut': 'shiftOut',
            'arduino_advanced_controlBreak': 'controlBreak',
            'arduino_advanced_controlSwitch': 'controlSwitch',
            'arduino_advanced_controlCase': 'controlCase',
            'arduino_advanced_controlDefault': 'controlDefault',
            'arduino_advanced_rawCode': 'rawCode',
            'arduino_advanced_rawReporter': 'rawReporter',
            'arduino_advanced_rawDefinition': 'rawDefinition',
            'arduino_advanced_serialAvailable': 'advancedSerialAvailable',
            'arduino_advanced_serialReadStringUntil': 'serialReadStringUntil',
            'arduino_advanced_serialFlush': 'serialFlush',
            'arduino_advanced_powerSleep': 'powerSleep',

            // Pro aliases
            'arduino_advanced_pro_rawCode': 'rawCode',
            'arduino_advanced_pro_rawReporter': 'rawReporter',
            'arduino_advanced_pro_rawDefinition': 'rawDefinition',
            'arduino_advanced_pro_serialReadStringUntil': 'serialReadStringUntil',
            'arduino_advanced_pro_serialFlush': 'serialFlush',
            'arduino_advanced_pro_powerSleep': 'powerSleep',

            // Short aliases (without arduino_ prefix)
            'advanced_rawCode': 'rawCode',
            'advanced_rawReporter': 'rawReporter',
            'advanced_rawDefinition': 'rawDefinition',
            'advanced_serialReadStringUntil': 'serialReadStringUntil',
            'advanced_serialFlush': 'serialFlush',
            'advanced_powerSleep': 'powerSleep',
            'advanced_controlSwitch': 'controlSwitch',
            'advanced_controlCase': 'controlCase',
            'advanced_controlDefault': 'controlDefault',

            // ======== I2C (arduino_comm_i2c*) ========
            'arduino_comm_i2cBegin': 'i2cBegin',
            'arduino_comm_i2cSetClock': 'i2cSetClock',
            'arduino_comm_i2cBeginTransmission': 'i2cBeginTransmission',
            'arduino_comm_i2cWriteByte': 'i2cWriteByte',
            'arduino_comm_i2cWriteString': 'i2cWriteStringEx',
            'arduino_comm_i2cEndTransmission': 'i2cEndTransmission',
            'arduino_comm_i2cRequestFrom': 'i2cRequestFrom',
            'arduino_comm_i2cAvailable': 'i2cAvailable',
            'arduino_comm_i2cRead': 'i2cRead',
            'arduino_comm_i2cScan': 'i2cScan',

            // ======== SPI (arduino_comm_spi*) ========
            'arduino_comm_spiBegin': 'spiBegin',
            'arduino_comm_spiSettings': 'spiSettings',
            'arduino_comm_spiBeginTransaction': 'spiBeginTransaction',
            'arduino_comm_spiTransfer': 'spiTransfer',
            'arduino_comm_spiTransferArray': 'spiTransferArray',
            'arduino_comm_spiEndTransaction': 'spiEndTransaction',
            'arduino_comm_spiEnd': 'spiEnd',

            // ======== Display (arduino_display_*) ========
            'arduino_display_showImage': 'displayShowImage',
            'arduino_display_showImageUntil': 'displayShowImageUntil',
            'arduino_display_showUntilScrollDone': 'displayShowUntilScrollDone',
            'arduino_display_clearDisplay': 'displayClear',
            'arduino_display_lightPixelAt': 'displayLightPixelAt',

            // ======== SD Card (arduino_sdcard_*) ========
            'arduino_sdcard_sdBegin': 'sdBegin',
            'arduino_sdcard_sdExists': 'sdExists',
            'arduino_sdcard_sdOpen': 'sdOpen',
            'arduino_sdcard_sdClose': 'sdClose',
            'arduino_sdcard_sdWrite': 'sdWrite',
            'arduino_sdcard_sdWriteLine': 'sdWriteLine',
            'arduino_sdcard_sdReadLine': 'sdReadLine',
            'arduino_sdcard_sdReadAll': 'sdReadAll',
            'arduino_sdcard_sdAvailable': 'sdAvailable',
            'arduino_sdcard_sdRemove': 'sdRemove',
            'arduino_sdcard_sdMkdir': 'sdMkdir',
            'arduino_sdcard_sdFileSize': 'sdFileSize',

            // ======== Structs (arduino_structs_*) ========
            'arduino_structs_structDefine': 'structDefine',
            'arduino_structs_structCreate': 'structCreate',
            'arduino_structs_structSet': 'structSet',
            'arduino_structs_structGet': 'structGet',
            'arduino_structs_structArrayCreate': 'structArrayCreate',
            'arduino_structs_structArraySet': 'structArraySet',
            'arduino_structs_structArrayGet': 'structArrayGet',

            // ======== Motors (arduino_motores_*) - require STB Extension runtime ========
            'arduino_motores_seleccionarTipoMotores': 'stbext_seleccionarTipoMotores',
            'arduino_motores_configurarMotores': 'stbext_configurarMotores',
            'arduino_motores_calibrarServos360': 'stbext_calibrarServos360',
            'arduino_motores_probarPulsoServo360': 'stbext_probarPulsoServo360',
            'arduino_motores_definirDireccionMotorA1': 'stbext_definirDireccionMotorA1',
            'arduino_motores_definirDireccionMotorA2': 'stbext_definirDireccionMotorA2',
            'arduino_motores_definirVelocidadMotor': 'stbext_definirVelocidadMotor',
            'arduino_motores_avanzarMotor': 'stbext_avanzarMotor',
            'arduino_motores_retrocederMotor': 'stbext_retrocederMotor',
            'arduino_motores_avanzarMotorPorTiempo': 'stbext_avanzarMotorPorTiempo',
            'arduino_motores_avanzarMotorPorDistancia': 'stbext_avanzarMotorPorDistancia',
            'arduino_motores_avanzarMotorPorDistanciaGuardada': 'stbext_avanzarMotorPorDistanciaGuardada',
            'arduino_motores_retrocederMotorPorDistancia': 'stbext_retrocederMotorPorDistancia',
            'arduino_motores_retrocederMotorPorDistanciaGuardada': 'stbext_retrocederMotorPorDistanciaGuardada',
            'arduino_motores_girarMotor': 'stbext_girarMotor',
            'arduino_motores_girarMotorPorValor': 'stbext_girarMotorPorValor',
            'arduino_motores_girarMotorPorValorGuardado': 'stbext_girarMotorPorValorGuardado',
            'arduino_motores_detenerMotor': 'stbext_detenerMotor',
            'arduino_motores_avanzarHastaQue': 'stbext_avanzarHastaQue',
            'arduino_motores_retrocederHastaQue': 'stbext_retrocederHastaQue',
            'arduino_motores_girarHastaQue': 'stbext_girarHastaQue',
            'arduino_motores_detenerSi': 'stbext_detenerSi',
            'arduino_motores_configurarTrigger': 'stbext_configurarTrigger',
            'arduino_motores_desactivarTrigger': 'stbext_desactivarTrigger',
            'arduino_motores_desactivarTodosLosTriggers': 'stbext_desactivarTodosLosTriggers',
            'arduino_motores_velocidadActualMotor': 'stbext_velocidadActualMotor',
            'arduino_motores_velocidadAplicadaMotor': 'stbext_velocidadAplicadaMotor',
            'arduino_motores_tipoMotoresSeleccionado': 'stbext_tipoMotoresSeleccionado',
            'arduino_motores_motoresConfigurados': 'stbext_motoresConfigurados',
            'arduino_motores_velocidadGuardadaMotor': 'stbext_velocidadGuardadaMotor',
            'arduino_motores_motorEnMovimiento': 'stbext_motorEnMovimiento',
            'arduino_motores_encoderMotor': 'stbext_encoderMotor',
            'arduino_motores_distanciaRecorridaMotor': 'stbext_distanciaRecorridaMotor',
            'arduino_motores_reiniciarDistanciaMotor': 'stbext_reiniciarDistanciaMotor',
            'arduino_motores_leerTrigger': 'stbext_leerTrigger',
            'arduino_motores_diametroRuedaConfigurado': 'stbext_diametroRuedaConfigurado',
            'arduino_motores_rpmMaxConfigurado': 'stbext_rpmMaxConfigurado',
            'arduino_motores_anchoEntreRuedasConfigurado': 'stbext_anchoEntreRuedasConfigurado',

            // ======== STBoard blocks (arduino_stb_*) ========
            'arduino_stb_iniciarPantallaOled': 'iniciarPantallaOled',
            'arduino_stb_limpiarPantallaOled': 'limpiarPantallaOled',
            'arduino_stb_actualizarPantallaOled': 'actualizarPantallaOled',
            'arduino_stb_escribirTextoOled': 'escribirTextoOled',
            'arduino_stb_escribirLineaOled': 'escribirLineaOled',
            'arduino_stb_establecerCursorOled': 'establecerCursorOled',
            'arduino_stb_establecerTamanoTextoOled': 'establecerTamanoTextoOled',
            'arduino_stb_establecerColorTextoOled': 'establecerColorTextoOled',
            'arduino_stb_dibujarPixelOled': 'dibujarPixelOled',
            'arduino_stb_dibujarLineaOled': 'dibujarLineaOled',
            'arduino_stb_dibujarRectanguloOled': 'dibujarRectanguloOled',
            'arduino_stb_dibujarCirculoOled': 'dibujarCirculoOled',
            'arduino_stb_reproducirTono': 'reproducirTono',
            'arduino_stb_detenerTono': 'detenerTono',
            'arduino_stb_establecerLedRGB': 'establecerLedRGB',
            'arduino_stb_leerDHT': 'leerDHT',
            'arduino_stb_leerUltrasonico': 'leerUltrasonico',
            'arduino_stb_iniciarI2C': 'iniciarI2C',
            'arduino_stb_escribirI2C': 'escribirI2C',
            'arduino_stb_initBootScreen': 'stbBoardV2_initBootScreen',

            // ======== STBoard V2 (stbv2* and arduino_stbv2*) ========
            'stbv2inicio_stbBoardV2_whenArduinoBegin': 'stbv2inicio_stbBoardV2_whenArduinoBegin',
            'stbv2inicio_stbBoardV2_initBootScreen': 'stbv2inicio_stbBoardV2_initBootScreen',
            'arduino_stbv2inicio_stbBoardV2_whenArduinoBegin': 'stbv2inicio_stbBoardV2_whenArduinoBegin',
            'arduino_stbv2inicio_stbBoardV2_initBootScreen': 'stbv2inicio_stbBoardV2_initBootScreen',

            // STB V2 Motors
            'stbv2motores_configurarMotores': 'stbv2motores_configurarMotores',
            'stbv2motores_configurarMotorLado': 'stbv2motores_configurarMotorLado',
            'stbv2motores_definirDireccionMotor': 'stbv2motores_definirDireccionMotor',
            'stbv2motores_definirVelocidadMotor': 'stbv2motores_definirVelocidadMotor',
            'stbv2motores_definirModoAvance': 'stbv2motores_definirModoAvance',
            'stbv2motores_avanzarMotor': 'stbv2motores_avanzarMotor',
            'stbv2motores_retrocederMotor': 'stbv2motores_retrocederMotor',
            'stbv2motores_detenerMotor': 'stbv2motores_detenerMotor',
            'stbv2motores_girarMotor': 'stbv2motores_girarMotor',
            'stbv2motores_girarMotorPorValor': 'stbv2motores_girarMotorPorValor',
            'stbv2motores_girarMotorPorValorSinEsperar': 'stbv2motores_girarMotorPorValorSinEsperar',
            'stbv2motores_avanzarMotorPorTiempo': 'stbv2motores_avanzarMotorPorTiempo',
            'stbv2motores_avanzarMotorPorTiempoSinEsperar': 'stbv2motores_avanzarMotorPorTiempoSinEsperar',
            'stbv2motores_retrocederMotorPorTiempo': 'stbv2motores_retrocederMotorPorTiempo',
            'stbv2motores_retrocederMotorPorTiempoSinEsperar': 'stbv2motores_retrocederMotorPorTiempoSinEsperar',
            'stbv2motores_avanzarMotorPorDistancia': 'stbv2motores_avanzarMotorPorDistancia',
            'stbv2motores_avanzarMotorPorDistanciaSinEsperar': 'stbv2motores_avanzarMotorPorDistanciaSinEsperar',
            'stbv2motores_retrocederMotorPorDistancia': 'stbv2motores_retrocederMotorPorDistancia',
            'stbv2motores_retrocederMotorPorDistanciaSinEsperar': 'stbv2motores_retrocederMotorPorDistanciaSinEsperar',
            'stbv2motores_avanzarHastaQue': 'stbv2motores_avanzarHastaQue',
            'stbv2motores_retrocederHastaQue': 'stbv2motores_retrocederHastaQue',
            'stbv2motores_girarHastaQue': 'stbv2motores_girarHastaQue',
            'stbv2motores_detenerSi': 'stbv2motores_detenerSi',
            'stbv2motores_velocidadActualMotor': 'stbv2motores_velocidadActualMotor',
            'stbv2motores_motoresConfigurados': 'stbv2motores_motoresConfigurados',
            'stbv2motores_motorEnMovimiento': 'stbv2motores_motorEnMovimiento',
            'stbv2motores_encoderMotor': 'stbv2motores_encoderMotor',
            'stbv2motores_distanciaRecorridaMotor': 'stbv2motores_distanciaRecorridaMotor',
            'stbv2motores_reiniciarDistanciaMotor': 'stbv2motores_reiniciarDistanciaMotor',
            'stbv2motores_motivoParadaMotor': 'stbv2motores_motivoParadaMotor',
            'stbv2motores_codigoErrorNodo': 'stbv2motores_codigoErrorNodo',
            'stbv2motores_esperarSeguro': 'stbv2motores_esperarSeguro',
            'stbv2motores_activarRetrasoArranque': 'stbv2motores_activarRetrasoArranque',
            'stbv2motores_desactivarRetrasoArranque': 'stbv2motores_desactivarRetrasoArranque',

            // Auto-generated arduino_ stbv2 aliases (old system creates these automatically)
            'arduino_stbv2motores_configurarMotores': 'stbv2motores_configurarMotores',
            'arduino_stbv2motores_configurarMotorLado': 'stbv2motores_configurarMotorLado',
            'arduino_stbv2motores_definirDireccionMotor': 'stbv2motores_definirDireccionMotor',
            'arduino_stbv2motores_definirVelocidadMotor': 'stbv2motores_definirVelocidadMotor',
            'arduino_stbv2motores_definirModoAvance': 'stbv2motores_definirModoAvance',
            'arduino_stbv2motores_avanzarMotor': 'stbv2motores_avanzarMotor',
            'arduino_stbv2motores_retrocederMotor': 'stbv2motores_retrocederMotor',
            'arduino_stbv2motores_detenerMotor': 'stbv2motores_detenerMotor',
            'arduino_stbv2motores_girarMotor': 'stbv2motores_girarMotor',
            'arduino_stbv2motores_girarMotorPorValor': 'stbv2motores_girarMotorPorValor',
            'arduino_stbv2motores_girarMotorPorValorSinEsperar': 'stbv2motores_girarMotorPorValorSinEsperar',
            'arduino_stbv2motores_avanzarMotorPorTiempo': 'stbv2motores_avanzarMotorPorTiempo',
            'arduino_stbv2motores_avanzarMotorPorTiempoSinEsperar': 'stbv2motores_avanzarMotorPorTiempoSinEsperar',
            'arduino_stbv2motores_retrocederMotorPorTiempo': 'stbv2motores_retrocederMotorPorTiempo',
            'arduino_stbv2motores_retrocederMotorPorTiempoSinEsperar': 'stbv2motores_retrocederMotorPorTiempoSinEsperar',
            'arduino_stbv2motores_avanzarMotorPorDistancia': 'stbv2motores_avanzarMotorPorDistancia',
            'arduino_stbv2motores_avanzarMotorPorDistanciaSinEsperar': 'stbv2motores_avanzarMotorPorDistanciaSinEsperar',
            'arduino_stbv2motores_retrocederMotorPorDistancia': 'stbv2motores_retrocederMotorPorDistancia',
            'arduino_stbv2motores_retrocederMotorPorDistanciaSinEsperar': 'stbv2motores_retrocederMotorPorDistanciaSinEsperar',
            'arduino_stbv2motores_avanzarHastaQue': 'stbv2motores_avanzarHastaQue',
            'arduino_stbv2motores_retrocederHastaQue': 'stbv2motores_retrocederHastaQue',
            'arduino_stbv2motores_girarHastaQue': 'stbv2motores_girarHastaQue',
            'arduino_stbv2motores_detenerSi': 'stbv2motores_detenerSi',
            'arduino_stbv2motores_velocidadActualMotor': 'stbv2motores_velocidadActualMotor',
            'arduino_stbv2motores_motoresConfigurados': 'stbv2motores_motoresConfigurados',
            'arduino_stbv2motores_motorEnMovimiento': 'stbv2motores_motorEnMovimiento',
            'arduino_stbv2motores_encoderMotor': 'stbv2motores_encoderMotor',
            'arduino_stbv2motores_distanciaRecorridaMotor': 'stbv2motores_distanciaRecorridaMotor',
            'arduino_stbv2motores_reiniciarDistanciaMotor': 'stbv2motores_reiniciarDistanciaMotor',
            'arduino_stbv2motores_motivoParadaMotor': 'stbv2motores_motivoParadaMotor',
            'arduino_stbv2motores_codigoErrorNodo': 'stbv2motores_codigoErrorNodo',
            'arduino_stbv2motores_esperarSeguro': 'stbv2motores_esperarSeguro',

            // STB V2 Gyro
            'stbv2gyro_configurarGiroscopio': 'stbv2gyro_configurarGiroscopio',
            'stbv2gyro_calibrarGiroscopio': 'stbv2gyro_calibrarGiroscopio',
            'stbv2gyro_calibrarPosturaGiroscopio': 'stbv2gyro_calibrarPosturaGiroscopio',
            'stbv2gyro_reiniciarAnguloGiroscopio': 'stbv2gyro_reiniciarAnguloGiroscopio',
            'stbv2gyro_leerGiroscopio': 'stbv2gyro_leerGiroscopio',
            'stbv2gyro_girarConGiroscopio': 'stbv2gyro_girarConGiroscopio',
            'stbv2gyro_giroscopioListo': 'stbv2gyro_giroscopioListo',
            'stbv2gyro_anguloGiroscopio': 'stbv2gyro_anguloGiroscopio',
            'stbv2gyro_anguloInclinacionTarjeta': 'stbv2gyro_anguloInclinacionTarjeta',
            'stbv2gyro_aceleracionGiroscopio': 'stbv2gyro_aceleracionGiroscopio',
            'stbv2gyro_velocidadAngularGiroscopio': 'stbv2gyro_velocidadAngularGiroscopio',
            'stbv2gyro_mientrasVelocidadAngularGiroscopio': 'stbv2gyro_mientrasVelocidadAngularGiroscopio',
            'stbv2gyro_mientrasAceleracionGiroscopio': 'stbv2gyro_mientrasAceleracionGiroscopio',
            'stbv2gyro_mientrasAnguloGiroscopio': 'stbv2gyro_mientrasAnguloGiroscopio',
            'stbv2gyro_velocidadAngularGiroscopioCumple': 'stbv2gyro_velocidadAngularGiroscopioCumple',
            'stbv2gyro_aceleracionGiroscopioCumple': 'stbv2gyro_aceleracionGiroscopioCumple',
            'stbv2gyro_anguloGiroscopioCumple': 'stbv2gyro_anguloGiroscopioCumple',
            'stbv2gyro_tarjetaAgitada': 'stbv2gyro_tarjetaAgitada',
            'stbv2gyro_tarjetaInclinada': 'stbv2gyro_tarjetaInclinada',
            'stbv2gyro_tarjetaInclinadaMasDe': 'stbv2gyro_tarjetaInclinadaMasDe',
            'stbv2gyro_esperarHastaTarjetaAgitada': 'stbv2gyro_esperarHastaTarjetaAgitada',
            'stbv2gyro_esperarHastaTarjetaInclinada': 'stbv2gyro_esperarHastaTarjetaInclinada',

            // STB V2 Infrared
            'stbv2infrared_leerReceptorInfrarrojo': 'stbv2infrared_leerReceptorInfrarrojo',
            'stbv2infrared_senalInfrarrojaDetectada': 'stbv2infrared_senalInfrarrojaDetectada',
            'stbv2infrared_esperarHastaSenalInfrarroja': 'stbv2infrared_esperarHastaSenalInfrarroja',
            'stbv2infrared_mientrasSenalInfrarroja': 'stbv2infrared_mientrasSenalInfrarroja',
            'stbv2infrared_contadorSenalInfrarroja': 'stbv2infrared_contadorSenalInfrarroja',
            'stbv2infrared_pulsosInfrarrojosEnTiempo': 'stbv2infrared_pulsosInfrarrojosEnTiempo',
            'stbv2infrared_reiniciarContadorSenalInfrarroja': 'stbv2infrared_reiniciarContadorSenalInfrarroja',
            'stbv2infrared_encenderEmisorInfrarrojo': 'stbv2infrared_encenderEmisorInfrarrojo',
            'stbv2infrared_apagarEmisorInfrarrojo': 'stbv2infrared_apagarEmisorInfrarrojo',
            'stbv2infrared_ponerEmisorInfrarrojo': 'stbv2infrared_ponerEmisorInfrarrojo',
            'stbv2infrared_emitirInfrarrojoPorTiempo': 'stbv2infrared_emitirInfrarrojoPorTiempo',
            'stbv2infrared_emitirPulsosInfrarrojos': 'stbv2infrared_emitirPulsosInfrarrojos',
            'stbv2infrared_emisorInfrarrojoActivo': 'stbv2infrared_emisorInfrarrojoActivo',

            // STB V2 Buzzer
            'stbv2buzzer_encenderBuzzer': 'stbv2buzzer_encenderBuzzer',
            'stbv2buzzer_apagarBuzzer': 'stbv2buzzer_apagarBuzzer',
            'stbv2buzzer_tocarTonoBuzzer': 'stbv2buzzer_tocarTonoBuzzer',
            'stbv2buzzer_tocarNotaBuzzer': 'stbv2buzzer_tocarNotaBuzzer',
            'stbv2buzzer_tocarTonoContinuoBuzzer': 'stbv2buzzer_tocarTonoContinuoBuzzer',
            'stbv2buzzer_tocarNotaContinuaBuzzer': 'stbv2buzzer_tocarNotaContinuaBuzzer',
            'stbv2buzzer_silencioBuzzer': 'stbv2buzzer_silencioBuzzer',
            'stbv2buzzer_buzzerActivo': 'stbv2buzzer_buzzerActivo',
            'stbv2buzzer_frecuenciaBuzzer': 'stbv2buzzer_frecuenciaBuzzer',

            // STB V2 Light
            'stbv2light_leerLuzRaw': 'stbv2light_leerLuzRaw',
            'stbv2light_porcentajeLuz': 'stbv2light_porcentajeLuz',
            'stbv2light_hayMuchaLuz': 'stbv2light_hayMuchaLuz',
            'stbv2light_hayPocaLuz': 'stbv2light_hayPocaLuz',
            'stbv2light_luzCumple': 'stbv2light_luzCumple',
            'stbv2light_esperarHastaLuz': 'stbv2light_esperarHastaLuz',
            'stbv2light_mientrasLuz': 'stbv2light_mientrasLuz',

            // STB V2 Temperature
            'stbv2temperature_leerTemperaturaRaw': 'stbv2temperature_leerTemperaturaRaw',
            'stbv2temperature_temperaturaCelsius': 'stbv2temperature_temperaturaCelsius',
            'stbv2temperature_temperaturaKelvin': 'stbv2temperature_temperaturaKelvin',
            'stbv2temperature_haceCalor': 'stbv2temperature_haceCalor',
            'stbv2temperature_haceFrio': 'stbv2temperature_haceFrio',
            'stbv2temperature_temperaturaCumple': 'stbv2temperature_temperaturaCumple',
            'stbv2temperature_esperarHastaTemperatura': 'stbv2temperature_esperarHastaTemperatura',
            'stbv2temperature_mientrasTemperatura': 'stbv2temperature_mientrasTemperatura',

            // STB V2 Microphone
            'stbv2microphone_calibrarMicrofono': 'stbv2microphone_calibrarMicrofono',
            'stbv2microphone_leerMicrofonoRaw': 'stbv2microphone_leerMicrofonoRaw',
            'stbv2microphone_nivelSonido': 'stbv2microphone_nivelSonido',
            'stbv2microphone_microfonoCalibrado': 'stbv2microphone_microfonoCalibrado',
            'stbv2microphone_haySonidoFuerte': 'stbv2microphone_haySonidoFuerte',
            'stbv2microphone_hayPocoSonido': 'stbv2microphone_hayPocoSonido',
            'stbv2microphone_sonidoCumple': 'stbv2microphone_sonidoCumple',
            'stbv2microphone_esperarHastaSonido': 'stbv2microphone_esperarHastaSonido',
            'stbv2microphone_mientrasSonido': 'stbv2microphone_mientrasSonido',

            // STB V2 Bluetooth
            'stbv2bluetooth_iniciarBluetooth': 'stbv2bluetooth_iniciarBluetooth',
            'stbv2bluetooth_cerrarBluetooth': 'stbv2bluetooth_cerrarBluetooth',
            'stbv2bluetooth_bluetoothIniciado': 'stbv2bluetooth_bluetoothIniciado',
            'stbv2bluetooth_hayDatosBluetooth': 'stbv2bluetooth_hayDatosBluetooth',
            'stbv2bluetooth_bytesBluetoothDisponibles': 'stbv2bluetooth_bytesBluetoothDisponibles',
            'stbv2bluetooth_enviarTextoBluetooth': 'stbv2bluetooth_enviarTextoBluetooth',
            'stbv2bluetooth_enviarLineaBluetooth': 'stbv2bluetooth_enviarLineaBluetooth',
            'stbv2bluetooth_enviarNumeroBluetooth': 'stbv2bluetooth_enviarNumeroBluetooth',
            'stbv2bluetooth_enviarByteBluetooth': 'stbv2bluetooth_enviarByteBluetooth',
            'stbv2bluetooth_leerByteBluetooth': 'stbv2bluetooth_leerByteBluetooth',
            'stbv2bluetooth_leerTextoBluetooth': 'stbv2bluetooth_leerTextoBluetooth',
            'stbv2bluetooth_leerLineaBluetooth': 'stbv2bluetooth_leerLineaBluetooth',
            'stbv2bluetooth_limpiarBufferBluetooth': 'stbv2bluetooth_limpiarBufferBluetooth',
            'stbv2bluetooth_esperarHastaDatoBluetooth': 'stbv2bluetooth_esperarHastaDatoBluetooth',
            'stbv2bluetooth_mientrasHayaDatosBluetooth': 'stbv2bluetooth_mientrasHayaDatosBluetooth',

            // STB V2 LED Matrix
            'stbv2matrix_iniciarMatrizLed': 'stbv2matrix_iniciarMatrizLed',
            'stbv2matrix_limpiarMatrizLed': 'stbv2matrix_limpiarMatrizLed',
            'stbv2matrix_llenarMatrizLed': 'stbv2matrix_llenarMatrizLed',
            'stbv2matrix_brilloMatrizLed': 'stbv2matrix_brilloMatrizLed',
            'stbv2matrix_mostrarCaracterMatrizLed': 'stbv2matrix_mostrarCaracterMatrizLed',
            'stbv2matrix_mostrarTextoMatrizLed': 'stbv2matrix_mostrarTextoMatrizLed',
            'stbv2matrix_encenderMatrizLed': 'stbv2matrix_encenderMatrizLed',
            'stbv2matrix_apagarMatrizLed': 'stbv2matrix_apagarMatrizLed',
            'stbv2matrix_ponerPixelMatrizLed': 'stbv2matrix_ponerPixelMatrizLed',
            'stbv2matrix_alternarPixelMatrizLed': 'stbv2matrix_alternarPixelMatrizLed',
            'stbv2matrix_pixelMatrizLedEncendido': 'stbv2matrix_pixelMatrizLedEncendido',
            'stbv2matrix_dibujarFilaMatrizLed': 'stbv2matrix_dibujarFilaMatrizLed',
            'stbv2matrix_dibujarColumnaMatrizLed': 'stbv2matrix_dibujarColumnaMatrizLed',
            'stbv2matrix_mostrarPatronMatrizLed': 'stbv2matrix_mostrarPatronMatrizLed',
            'stbv2matrix_desplazarMatrizLed': 'stbv2matrix_desplazarMatrizLed',
            'stbv2matrix_mostrarLetraMatrizLed': 'stbv2matrix_mostrarLetraMatrizLed',
            'stbv2matrix_mostrarNumeroMatrizLed': 'stbv2matrix_mostrarNumeroMatrizLed',

            // STB V2 OLED
            'stbv2oled_iniciarPantallaOled': 'stbv2oled_iniciarPantallaOled',
            'stbv2oled_limpiarPantallaOled': 'stbv2oled_limpiarPantallaOled',
            'stbv2oled_actualizarPantallaOled': 'stbv2oled_actualizarPantallaOled',
            'stbv2oled_establecerCursorOled': 'stbv2oled_establecerCursorOled',
            'stbv2oled_configurarTextoOled': 'stbv2oled_configurarTextoOled',
            'stbv2oled_imprimirOled': 'stbv2oled_imprimirOled',
            'stbv2oled_mostrarTextoOled': 'stbv2oled_mostrarTextoOled',
            'stbv2oled_dibujarPixelOled': 'stbv2oled_dibujarPixelOled',
            'stbv2oled_dibujarLineaOled': 'stbv2oled_dibujarLineaOled',
            'stbv2oled_dibujarRectanguloOled': 'stbv2oled_dibujarRectanguloOled',
            'stbv2oled_rellenarRectanguloOled': 'stbv2oled_rellenarRectanguloOled',
            'stbv2oled_dibujarCirculoOled': 'stbv2oled_dibujarCirculoOled',
            'stbv2oled_rellenarCirculoOled': 'stbv2oled_rellenarCirculoOled',
            'stbv2oled_dibujarTrianguloOled': 'stbv2oled_dibujarTrianguloOled',
            'stbv2oled_rellenarTrianguloOled': 'stbv2oled_rellenarTrianguloOled',

            // STB V2 Buttons
            'stbv2buttons_leerBoton': 'stbv2buttons_leerBoton',
            'stbv2buttons_botonPresionado': 'stbv2buttons_botonPresionado',
            'stbv2buttons_esperarHastaBotonPresionado': 'stbv2buttons_esperarHastaBotonPresionado',
            'stbv2buttons_mientrasBotonPresionado': 'stbv2buttons_mientrasBotonPresionado',
            'stbv2buttons_contadorBoton': 'stbv2buttons_contadorBoton',
            'stbv2buttons_reiniciarContadorBoton': 'stbv2buttons_reiniciarContadorBoton',

            // STB V2 Precision
            'stbv2precision_ajustarMotoresPrecision': 'stbv2precision_ajustarMotoresPrecision',
            'stbv2precision_ajustarControlPrecision': 'stbv2precision_ajustarControlPrecision',
            'stbv2precision_avanzarPrecisionPorDistancia': 'stbv2precision_avanzarPrecisionPorDistancia',
            'stbv2precision_retrocederPrecisionPorDistancia': 'stbv2precision_retrocederPrecisionPorDistancia',
            'stbv2precision_avanzarPrecisionContinuo': 'stbv2precision_avanzarPrecisionContinuo',
            'stbv2precision_retrocederPrecisionContinuo': 'stbv2precision_retrocederPrecisionContinuo',
            'stbv2precision_detenerPrecision': 'stbv2precision_detenerPrecision',

            // STB V2 Ports (Servo via ports)
            'stbv2puertos_moverServoPuerto': 'stbv2puertos_moverServoPuerto',
            'stbv2puertos_moverServoPuertoPorPulsos': 'stbv2puertos_moverServoPuertoPorPulsos',
            'stbv2puertos_moverServoPuertoSuavemente': 'stbv2puertos_moverServoPuertoSuavemente',
            'stbv2puertos_desconectarServoPuerto': 'stbv2puertos_desconectarServoPuerto',

            // STB V2 Ports (Ultrasonic - solo reporteros básicos)
            'arduino_stbv2puertos_readDistCm': 'stbV2Ultra_readDistCm',
            'arduino_stbv2puertos_readDistInch': 'stbV2Ultra_readDistInch',

            // STB V2 Ports (Color sensor - solo reporteros y booleano genérico)
            'arduino_stbv2puertos_readColorName': 'stbV2Color_readColorName',
            'arduino_stbv2puertos_readRed': 'stbV2Color_readRed',
            'arduino_stbv2puertos_readGreen': 'stbV2Color_readGreen',
            'arduino_stbv2puertos_readBlue': 'stbV2Color_readBlue',
            'arduino_stbv2puertos_readClear': 'stbV2Color_readClear',
            'arduino_stbv2puertos_readHue': 'stbV2Color_readHue',
            'arduino_stbv2puertos_isColor': 'stbV2Color_isColor',

            // Serial (categoría separada)
            'arduino_serial_serialPrint': 'stbV2Serial_serialPrint',
            'arduino_serial_serialPrintln': 'stbV2Serial_serialPrintln',

            // Short aliases (STBV2 blocks without prefix)
            'configurarMotores': 'stbv2motores_configurarMotores',
            'configurarMotorLado': 'stbv2motores_configurarMotorLado',
            'definirVelocidadMotor': 'stbv2motores_definirVelocidadMotor',
            'definirDireccionMotor': 'stbv2motores_definirDireccionMotor',
            'definirModoAvance': 'stbv2motores_definirModoAvance',
            'avanzarMotor': 'stbv2motores_avanzarMotor',
            'retrocederMotor': 'stbv2motores_retrocederMotor',
            'detenerMotor': 'stbv2motores_detenerMotor',
            'avanzarMotorPorTiempo': 'stbv2motores_avanzarMotorPorTiempo',
            'retrocederMotorPorTiempo': 'stbv2motores_retrocederMotorPorTiempo',
            'avanzarMotorPorDistancia': 'stbv2motores_avanzarMotorPorDistancia',
            'retrocederMotorPorDistancia': 'stbv2motores_retrocederMotorPorDistancia',
            'girarMotor': 'stbv2motores_girarMotor',
            'girarMotorPorValor': 'stbv2motores_girarMotorPorValor',
            'ajustarMotoresPrecision': 'stbv2precision_ajustarMotoresPrecision',
            'ajustarControlPrecision': 'stbv2precision_ajustarControlPrecision',
            'avanzarPrecisionPorDistancia': 'stbv2precision_avanzarPrecisionPorDistancia',
            'retrocederPrecisionPorDistancia': 'stbv2precision_retrocederPrecisionPorDistancia',
            'avanzarPrecisionContinuo': 'stbv2precision_avanzarPrecisionContinuo',
            'retrocederPrecisionContinuo': 'stbv2precision_retrocederPrecisionContinuo',
            'detenerPrecision': 'stbv2precision_detenerPrecision'
        };

        // Auto-generate device-prefixed aliases (same as old openblock-blocks ARDUINO_EXTRA_CATEGORY_DEVICE_IDS pattern)
        this._generateDeviceAliases();

        // Field name mappings for aliases (old block field names → current names)
        // Used when old STBlock blocks use different input/field names than current generators expect.
        this._aliasFieldMappings = {
            // textCharAt: old uses "POS", current textCharAt accepts both POS and INDEX directly
            // No longer needed — textCharAt handles both names
        };

        // Known prefixes to strip when resolving old opcodes
        this._knownPrefixes = [
            'arduino_pin_', 'arduino_serial_', 'arduino_servo_',
            'arduino_data_', 'arduino_array_', 'arduino_bitwise_',
            'arduino_interrupt_', 'arduino_stbv2motores_',
            'arduino_stbv2oled_', 'arduino_stbv2_', 'arduino_stb_',
            'arduino_advanced_', 'arduino_comm_', 'arduino_sdcard_',
            'arduino_structs_', 'arduino_display_', 'arduino_text_',
            'arduino_math_', 'arduino_arrays_', 'arduino_motores_',
            'arduino_'
        ];

        // STB V2 runtime setup tracking
        this._stbExtConfigEnsured = false;
        this._stbV2BaseEnsured = false;
        this._stbV2LocalUtilsEnsured = false;
        this._stbV2GyroBaseEnsured = false;
        this._stbV2BuzzerHelpersEnsured = false;
        this._stbV2IrEmitterEnsured = false;
        this._stbV2MegaMoveEnsured = false;
        this._stbV2MatrixPixelEnsured = false;
        this._stbV2MatrixPatternEnsured = false;
        this._stbV2MatrixShiftEnsured = false;
        this._stbV2MatrixTextEnsured = false;
        this._stbV2OledBaseHelpers = false;
        this._stbV2OledDrawHelpers = false;
        this._stbV2BootUiEnsured = false;
        this._arrayRuntimeEnsured = false;
    }

    /**
     * Reset generator state
     */
    reset () {
        this.includes = new Set();
        this.globalVars = new Map();
        this.definitions = new Map();
        this.setupCode = [];
        this.loopCode = [];
        this.functions = new Map();
        this.servoCount = 0;
        this.indent = 0;
        this._stbExtConfigEnsured = false;
        this._stbV2BaseEnsured = false;
        this._stbV2LocalUtilsEnsured = false;
        this._stbV2GyroBaseEnsured = false;
        this._stbV2BuzzerHelpersEnsured = false;
        this._stbV2IrEmitterEnsured = false;
        this._stbV2MegaMoveEnsured = false;
        this._stbV2MatrixPixelEnsured = false;
        this._stbV2MatrixPatternEnsured = false;
        this._stbV2MatrixShiftEnsured = false;
        this._stbV2MatrixTextEnsured = false;
        this._stbV2OledBaseHelpers = false;
        this._stbV2OledDrawHelpers = false;
        this._stbV2BootUiEnsured = false;
        this._arrayRuntimeEnsured = false;
    }

    addDefinition (nameOrCode, code) {
        if (code === undefined) {
            let val = nameOrCode;
            if (Array.isArray(nameOrCode)) {
                val = nameOrCode.join('\n');
            }
            const key = val.trim();
            this.definitions.set(key, val);
        } else {
            let val = code;
            if (Array.isArray(code)) {
                val = code.join('\n');
            }
            this.definitions.set(nameOrCode, val);
        }
    }

    /**
     * Add an include statement
     * @param {string} header - Header file name
     */
    addInclude (header) {
        this.includes.add(header);
    }

    /**
     * Add a global variable
     * @param {string} name - Variable name
     * @param {string} type - Variable type
     * @param {string} initialValue - Initial value
     */
    addGlobalVar (name, type, initialValue = '') {
        if (!this.globalVars.has(name)) {
            this.globalVars.set(name, {type, initialValue});
        } else {
            const existing = this.globalVars.get(name);
            // Promote type to float if currently int and new is float
            if (existing.type === 'int' && type === 'float') {
                this.globalVars.set(name, {type: 'float', initialValue: '0.0'});
            }
            // Promote type to String if an earlier inference chose a narrower type.
            else if (existing.type !== 'String' && type === 'String') {
                this.globalVars.set(name, {type: 'String', initialValue: '""'});
            }
        }
    }

    /**
     * Add code to setup()
     * @param {string} code - Code line
     */
    addSetupCode (code) {
        if (!this.setupCode.includes(code)) {
            this.setupCode.push(code);
        }
    }

    /**
     * Add code to loop()
     * @param {string} code - Code line
     */
    addLoopCode (code) {
        if (!this.loopCode.includes(code)) {
            this.loopCode.push(code);
        }
    }

    /**
     * Add a custom function (appended after loop())
     * @param {string} name - Function name for dedup
     * @param {string} code - Full function code
     */
    addFunction (name, code) {
        if (!this.functions.has(name)) {
            this.functions.set(name, code);
        }
    }

    /**
     * Get indentation string
     * @returns {string}
     */
    getIndent () {
        return '    '.repeat(this.indent);
    }

    /**
     * Sanitize variable name for C++
     * @param {string} name - Original variable name
     * @returns {string}
     */
    sanitizeVarName (name) {
        if (!name) return 'var';
        // Strip type suffix (e.g., "myVar [float]" -> "myVar")
        let cleanName = String(name).replace(/\s*\[(int|float|char|String)\]\s*$/i, '');
        let safe = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(safe)) {
            safe = '_' + safe;
        }
        const reserved = ['int', 'float', 'double', 'char', 'void', 'bool',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
            'continue', 'return', 'true', 'false', 'null', 'class', 'struct'];
        if (reserved.includes(safe.toLowerCase())) {
            safe = '_' + safe;
        }
        return safe;
    }

    /**
     * Sanitize function name for C++
     * @param {string} name - Original function name
     * @returns {string}
     */
    sanitizeFunctionName (name) {
        if (!name) return 'func';
        let safe = String(name).replace(/["']/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(safe)) {
            safe = 'func_' + safe;
        }
        return safe;
    }

    /**
     * Normalize values returned by Blockly-style generators.
     * Some imported generators return [code, order]; this Arduino generator uses only code.
     * @param {*} value - Generated value
     * @returns {string} Arduino expression
     */
    normalizeArduinoValue (value) {
        if (Array.isArray(value)) {
            return String(value[0] || '');
        }
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim();
    }

    /**
     * Infer the C++ value category of a generated Arduino expression.
     * @param {*} value - Generated value
     * @returns {string} Inferred Arduino type label
     */
    inferArduinoValueType (value) {
        const expression = this.normalizeArduinoValue(value);
        if (!expression) return 'int';

        if (/^".*"$/.test(expression)) return 'String';
        if (/^'.'$/.test(expression) || /^'\\[nrt0]'$/.test(expression)) return 'char';
        if (/^(true|false|HIGH|LOW)$/i.test(expression)) return 'bool';
        if (/^[+-]?\d+$/.test(expression)) return 'int';
        if (/^[+-]?(?:\d+\.\d*|\.\d+)(?:f)?$/i.test(expression)) return 'float';

        if (this.globalVars.has(expression)) {
            return this.globalVars.get(expression).type || 'int';
        }

        const stringReturnPatterns = [
            /\bString\s*\(/,
            /\+\s*String\s*\(/,
            /\bstbV2BluetoothReadString\s*\(/,
            /\bstbV2BluetoothReadLine\s*\(/,
            /\bstbV2LocalBluetoothReadString\s*\(/,
            /\bSerial\d*\.readString\s*\(/,
            /\bSerial\d*\.readStringUntil\s*\(/,
            /\breadString\s*\(/,
            /\breadStringUntil\s*\(/
        ];
        if (stringReturnPatterns.some(pattern => pattern.test(expression))) {
            return 'String';
        }

        const floatReturnPatterns = [
            /\b(?:sin|cos|tan|sqrt|sqrtf|pow|log|log10|exp|atan|fabs|fabsf|stbV2Get|stbV2.*Cm|stbV2.*Rpm)\s*\(/
        ];
        if (floatReturnPatterns.some(pattern => pattern.test(expression))) {
            return 'float';
        }

        return 'int';
    }

    /**
     * Prepare a generated expression for Serial.print/println.
     * Bare user text should be quoted, but variables and expressions must stay untouched.
     * @param {*} value - Generated value
     * @returns {string} Printable Arduino expression
     */
    normalizeArduinoPrintValue (value) {
        const expression = this.normalizeArduinoValue(value);
        if (!expression) return '""';

        if (/^".*"$/.test(expression) || /^'.*'$/.test(expression)) return expression;
        if (this.globalVars.has(expression)) return expression;
        if (/^[+-]?\d+(?:\.\d*)?(?:f)?$/i.test(expression)) return expression;
        if (/^(true|false|HIGH|LOW|null)$/i.test(expression)) return expression;
        if (/[()+\-*/%<>=!&|?:.,\[\]]/.test(expression)) return expression;

        const escaped = expression.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
    }

    /**
     * Generate code for a block
     * @param {Object} block - Block object
     * @param {Object} blocks - All blocks
     * @returns {string}
     */
    generateBlock (block, blocks) {
        if (!block) return '';

        const opcode = block.opcode;
        let generator = this.generators[opcode];

        if (generator) {
            return generator.call(this, block, blocks);
        }

        // Try opcode alias map (old STBlock opcodes → current names)
        if (this._opcodeAliases[opcode] !== undefined) {
            const alias = this._opcodeAliases[opcode];
            if (alias === null) {
                // Explicitly marked as not supported — generate stub comment
                const stubComment = opcode
                    .replace(/^arduino_/, '')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                return `// ${stubComment}: no implementado\n`;
            }
            // Apply field remapping if configured for this alias
            const fieldMapping = this._aliasFieldMappings[opcode];
            const aliasedBlock = fieldMapping ? this._remapBlockFields(block, fieldMapping) : block;
            generator = this.generators[alias];
            if (generator) {
                return generator.call(this, aliasedBlock, blocks);
            }
        }

        // Try stripping known prefixes (e.g., arduino_pin_* → *)
        for (const prefix of this._knownPrefixes) {
            if (opcode.startsWith(prefix)) {
                const stripped = opcode.substring(prefix.length);
                // Handle camelCase: first letter might need lowercasing
                const camelCase = stripped.charAt(0).toLowerCase() + stripped.slice(1);
                generator = this.generators[stripped] || this.generators[camelCase];
                if (generator) {
                    return generator.call(this, block, blocks);
                }
            }
        }

        // Unknown block - add comment
        return `// Bloque no soportado: ${opcode}\n`;
    }

    /**
     * Remap field/input names on a block to match current generator expectations.
     * Creates a shallow clone of the block with renamed fields and inputs.
     * @param {Object} block - Original block
     * @param {Object} fieldMappings - { fieldRenames: {old: new}, inputRenames: {old: new} }
     * @returns {Object} - Remapped block (clone)
     */
    _remapBlockFields (block, fieldMappings) {
        if (!fieldMappings) return block;
        const remapped = Object.assign({}, block);
        if (fieldMappings.fieldRenames && block.fields) {
            remapped.fields = Object.assign({}, block.fields);
            for (const [oldName, newName] of Object.entries(fieldMappings.fieldRenames)) {
                if (block.fields[oldName]) {
                    remapped.fields[newName] = block.fields[oldName];
                }
            }
        }
        if (fieldMappings.inputRenames && block.inputs) {
            remapped.inputs = Object.assign({}, block.inputs);
            for (const [oldName, newName] of Object.entries(fieldMappings.inputRenames)) {
                if (block.inputs[oldName]) {
                    remapped.inputs[newName] = block.inputs[oldName];
                }
            }
        }
        return remapped;
    }

    /**
     * Auto-generate device-prefixed aliases for extra categories.
     * Same pattern as openblock-blocks ARDUINO_EXTRA_CATEGORY_DEVICE_IDS.forEach().
     * Creates aliases like: stBoardExtension_comm_i2cBegin → i2cBegin
     *                      arduinoUno_math_mathPow → arduino_pow
     */
    _generateDeviceAliases () {
        const deviceIds = [
            'arduinoUno', 'arduinoMega2560', 'arduinoLeonardo',
            'arduinoEsp8266', 'arduinoEsp32', 'arduinoEsp32S3',
            'arduinoK210', 'arduinoRaspberryPiPico', 'arduinoRaspberryPiPicoW',
            'arduinoRaspberryPiPico2', 'arduinoRaspberryPiPico2W',
            'arduinoUnoR4Minima', 'arduinoUnoR4Wifi',
            'stBoardExtension', 'stbBoardV2'
        ];

        // Categories that get device-prefixed aliases
        const categoryPrefixes = [
            'comm_', 'math_', 'text_', 'sdcard_', 'display_', 'advanced_', 'data_'
        ];

        for (const deviceId of deviceIds) {
            for (const [arduinoOpcode, generatorName] of Object.entries(this._opcodeAliases)) {
                if (!arduinoOpcode.startsWith('arduino_')) continue;
                const suffix = arduinoOpcode.substring('arduino_'.length);
                const matchesCategory = categoryPrefixes.some(p => suffix.startsWith(p));
                if (matchesCategory && generatorName !== null) {
                    this._opcodeAliases[deviceId + '_' + suffix] = generatorName;
                }
            }
        }
    }

    /**
     * Generate code for a stack of blocks
     * @param {string} startBlockId - ID of first block
     * @param {Object} blocks - All blocks
     * @returns {string}
     */
    generateStack (startBlockId, blocks) {
        let code = '';
        let currentId = startBlockId;

        while (currentId) {
            const block = blocks[currentId];
            if (!block) break;

            code += this.generateBlock(block, blocks);
            currentId = block.next;
        }

        return code;
    }

    /**
     * Generate code for an input value
     * @param {Object} block - Block containing the input
     * @param {string} inputName - Name of the input
     * @param {Object} blocks - All blocks
     * @returns {string}
     */
    generateValue (block, inputName, blocks) {
        const input = block.inputs[inputName];
        if (!input) {
            // Fallback: check if the value is stored as a field instead of an input
            // (some old STBlock blocks store values as fields)
            if (block.fields && block.fields[inputName]) {
                return block.fields[inputName].value;
            }
            return '0';
        }

        const inputBlock = input.block;
        if (!inputBlock) {
            // Shadow block or literal value
            if (input.shadow) {
                const shadowBlock = blocks[input.shadow];
                if (shadowBlock) {
                    // Try generating via the standard block generators (e.g. text, math_number)
                    // to ensure correct formatting (like wrapping strings in quotes)
                    if (this.generators[shadowBlock.opcode] || this._opcodeAliases[shadowBlock.opcode]) {
                        return this.generateBlock(shadowBlock, blocks);
                    }
                    if (shadowBlock.fields) {
                        const fieldName = Object.keys(shadowBlock.fields)[0];
                        if (fieldName) {
                            return shadowBlock.fields[fieldName].value;
                        }
                    }
                }
            }
            return '0';
        }

        const valueBlock = blocks[inputBlock];
        if (!valueBlock) return '0';

        return this.generateBlock(valueBlock, blocks);
    }

    /**
     * Generate code for a field value
     * @param {Object} block - Block containing the field
     * @param {string} fieldName - Name of the field
     * @returns {string}
     */
    getFieldValue (block, fieldName) {
        if (block.fields && block.fields[fieldName]) {
            return block.fields[fieldName].value;
        }
        return '';
    }

    /**
     * Check if opcode is a setup/start hat block
     * @param {string} opcode - Block opcode
     * @returns {boolean}
     */
    isSetupHatBlock (opcode) {
        if (!opcode) return false;
        const lowerOpcode = opcode.toLowerCase();
        // Must contain a "when" or "begin" trigger pattern, not just "_inicio" as a namespace prefix
        return lowerOpcode.includes('whenarduino') ||
               lowerOpcode.includes('whenflagclicked') ||
               lowerOpcode.includes('event_whenflagclicked') ||
               lowerOpcode.includes('whenbegin') ||
               lowerOpcode.includes('whenarduinobegin') ||
               (lowerOpcode.includes('begin') && !lowerOpcode.includes('init')) ||
               lowerOpcode.includes('event_whenkeypressed') ||
               lowerOpcode.includes('initbootscreen');
    }

    /**
     * Check if opcode is a forever/loop hat block
     * @param {string} opcode - Block opcode
     * @returns {boolean}
     */
    isLoopHatBlock (opcode) {
        if (!opcode) return false;
        const lowerOpcode = opcode.toLowerCase();
        return lowerOpcode.includes('forever') ||
               lowerOpcode.includes('siempre') ||
               lowerOpcode.includes('_loop');
    }

    /**
     * Check if this is a top-level hat block (no parent)
     * @param {Object} block - Block object
     * @returns {boolean}
     */
    isHatBlock (block) {
        return block && block.topLevel === true && !block.parent;
    }

    /**
     * Check if a block chain contains a control_forever block in the 'next' links.
     * @param {string} startBlockId - Starting block ID
     * @param {Object} blocks - All blocks
     * @returns {boolean}
     */
    _hasForeverInNextChain (startBlockId, blocks) {
        let currentId = startBlockId;
        while (currentId) {
            const block = blocks[currentId];
            if (!block) break;
            if (block.opcode === 'control_forever') return true;
            currentId = block.next;
        }
        return false;
    }

    /**
     * Generate complete Arduino code from blocks
     * @param {Object} blocks - All blocks from the workspace
     * @param {Object} runtime - Scratch runtime
     * @returns {string}
     */
    generateCode (blocks, runtime) {
        this.reset();

        // Pre-populate variables from the workspace targets to ensure they are all declared
        if (runtime && runtime.targets) {
            for (const target of runtime.targets) {
                if (target && target.variables) {
                    for (const id in target.variables) {
                        const variable = target.variables[id];
                        const safeName = this.sanitizeVarName(variable.name);
                        
                        // Extract type from suffix if present (e.g. "myVar [float]")
                        let varType = 'int';
                        let initVal = '0';
                        const suffixMatch = String(variable.name).match(/\[(int|float|char|String)\]\s*$/i);
                        if (suffixMatch) {
                            const typeLabel = suffixMatch[1].toLowerCase();
                            if (typeLabel === 'float') {
                                varType = 'float';
                                initVal = '0.0';
                            } else if (typeLabel === 'char') {
                                varType = 'char';
                                initVal = "'\\0'";
                            } else if (typeLabel === 'string') {
                                varType = 'String';
                                initVal = '""';
                            }
                        } else {
                            // Fallback to inference if no suffix
                            const valStr = String(variable.value || '');
                            if (valStr.includes('.') && !isNaN(parseFloat(valStr))) {
                                varType = 'float';
                                initVal = '0.0';
                            } else if (valStr !== '' && isNaN(Number(valStr))) {
                                varType = 'String';
                                initVal = '""';
                            }
                        }
                        this.addGlobalVar(safeName, varType, initVal);
                    }
                }
            }
        }

        // Find all hat blocks (event handlers)
        const setupHatBlocks = [];
        const loopHatBlocks = [];

        for (const id in blocks) {
            const block = blocks[id];
            if (!block || !block.opcode) continue;

            // Check if it's a top-level block (hat block) - either by topLevel flag or no parent
            const isTopLevel = block.topLevel === true || (!block.parent && block.opcode);

            if (isTopLevel) {
                if (this.isLoopHatBlock(block.opcode)) {
                    loopHatBlocks.push({id, block});
                } else if (this.isSetupHatBlock(block.opcode)) {
                    setupHatBlocks.push({id, block});
                } else if (block.opcode === 'procedures_definition') {
                    // Always process procedure definitions. Their body can live in
                    // inputs.SUBSTACK (C-block style) or in block.next, so gating on
                    // block.next here would skip them and the function would never be
                    // registered in this.functions.
                    setupHatBlocks.push({id, block});
                } else {
                    // Check if it looks like a hat block by having no parent and having a next
                    if (block.next) {
                        setupHatBlocks.push({id, block});
                    }
                }
            }
        }

        // Generate code for setup hat blocks
        for (const {block} of setupHatBlocks) {
            // Handle procedure definitions separately: they register functions,
            // their body should NOT go into setup().
            if (block.opcode === 'procedures_definition') {
                this.generateBlock(block, blocks);
                continue;
            }
            if (block.next) {
                // Check if the chain contains a control_forever in the 'next' links.
                // If so, split: code before forever goes to setup, forever's SUBSTACK goes to loop.
                if (this._hasForeverInNextChain(block.next, blocks)) {
                    let setupPart = '';
                    // Add the hat block's own code first (e.g., initBootScreen)
                    const hatCode = this.generateBlock(block, blocks);
                    if (hatCode.trim()) {
                        setupPart += hatCode;
                    }
                    let currentId = block.next;
                    while (currentId) {
                        const currentBlock = blocks[currentId];
                        if (!currentBlock) break;

                        if (currentBlock.opcode === 'control_forever') {
                            // Generate forever's SUBSTACK into loop code
                            if (currentBlock.inputs && currentBlock.inputs.SUBSTACK) {
                                const substackId = currentBlock.inputs.SUBSTACK.block;
                                if (substackId) {
                                    const innerCode = this.generateStack(substackId, blocks);
                                    if (innerCode.trim()) {
                                        this.loopCode.push(innerCode);
                                    }
                                }
                            }
                            break; // Forever never terminates, so code after it is unreachable
                        }

                        setupPart += this.generateBlock(currentBlock, blocks);
                        currentId = currentBlock.next;
                    }
                    if (setupPart.trim()) {
                        this.setupCode.push(setupPart);
                    }
                } else {
                    // No forever in chain, normal handling
                    // Generate the hat block itself first (e.g., initBootScreen returns init code)
                    const hatCode = this.generateBlock(block, blocks);
                    if (hatCode.trim()) {
                        this.setupCode.push(hatCode);
                    }
                    const code = this.generateStack(block.next, blocks);
                    if (code.trim()) {
                        this.setupCode.push(code);
                    }
                }
            } else {
                // Standalone hat block with no next chain (e.g., initBootScreen used alone)
                const code = this.generateBlock(block, blocks);
                if (code.trim()) {
                    this.setupCode.push(code);
                }
            }
        }

        // Generate code for loop hat blocks
        for (const {block} of loopHatBlocks) {
            // Check for SUBSTACK input (for control blocks)
            if (block.inputs && block.inputs.SUBSTACK) {
                const substackId = block.inputs.SUBSTACK.block;
                if (substackId) {
                    const code = this.generateStack(substackId, blocks);
                    if (code.trim()) {
                        this.loopCode.push(code);
                    }
                }
            }
            // Also check for next (for linear hat blocks)
            if (block.next) {
                const code = this.generateStack(block.next, blocks);
                if (code.trim()) {
                    this.loopCode.push(code);
                }
            }
        }

        // Build final code
        return this.buildFinalCode();
    }

    /**
     * Build the final Arduino code string
     * @returns {string}
     */
    buildFinalCode () {
        let code = '// generado por STB academy\n';

        // Includes
        for (const include of this.includes) {
            code += `#include <${include}>\n`;
        }
        if (this.includes.size > 0) {
            code += '\n';
        }

        // Global variables
        for (const [name, info] of this.globalVars) {
            if (info.initialValue) {
                code += `${info.type} ${name} = ${info.initialValue};\n`;
            } else {
                code += `${info.type} ${name};\n`;
            }
        }
        if (this.globalVars.size > 0) {
            code += '\n';
        }

        // Definitions (go before setup() — includes runtime helpers, structs, etc.)
        for (const def of this.definitions.values()) {
            code += def;
        }
        if (this.definitions.size > 0) {
            code += '\n';
        }

        // Setup function
        code += 'void setup() {\n';
        if (this.setupCode.length > 0) {
            for (const line of this.setupCode) {
                const parts = line.split('\n');
                // Remove trailing empty from split artifact
                if (parts.length > 0 && parts[parts.length - 1] === '') {
                    parts.pop();
                }
                for (const l of parts) {
                    if (l.trim()) {
                        code += `  ${l}\n`;
                    } else {
                        code += '\n';
                    }
                }
            }
        } else {
            code += '  // Inicializacion\n';
        }
        code += '}\n\n';

        // Loop function
        code += 'void loop() {\n';
        if (this.loopCode.length > 0) {
            for (const line of this.loopCode) {
                const parts = line.split('\n');
                // Remove trailing empty from split artifact
                if (parts.length > 0 && parts[parts.length - 1] === '') {
                    parts.pop();
                }
                for (const l of parts) {
                    if (l.trim()) {
                        code += `  ${l}\n`;
                    } else {
                        code += '\n';
                    }
                }
            }
        } else {
            code += '  // Codigo principal\n';
        }
        code += '}\n';

        // Custom functions
        for (const [name, funcCode] of this.functions) {
            code += '\n' + funcCode;
        }
        if (this.functions.size > 0) {
            code += '\n';
        }

        return code;
    }
}

module.exports = ArduinoGenerator;
