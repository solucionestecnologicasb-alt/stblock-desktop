/**
 * Scratch 3.0 Arduino Extension
 * Provides blocks for Arduino programming in STBlock
 */

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const {ArduinoPeripheral, ConnectionState, BOARD_CONFIGS} = require('../../devices/common/arduino-peripheral');

/**
 * Icon for the Arduino extension
 */
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iIzAwOTc5RCIgY3g9IjIwIiBjeT0iMjAiIHI9IjIwIi8+PHBhdGggZD0iTTI1IDI1aC0xMHYtMTBoMTB2MTB6bS04LTJ2LTZoNnY2aC02eiIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik0xNSAxNWgxMHYxMGgtMTB6IiBmaWxsPSIjRkZGIiBmaWxsLW9wYWNpdHk9Ii4yIi8+PC9nPjwvc3ZnPg==';

/**
 * Pin mode options
 */
const PIN_MODES = {
    INPUT: 'INPUT',
    OUTPUT: 'OUTPUT',
    INPUT_PULLUP: 'INPUT_PULLUP',
    PWM: 'PWM',
    SERVO: 'SERVO'
};

/**
 * Digital level options
 */
const DIGITAL_LEVELS = {
    HIGH: 'HIGH',
    LOW: 'LOW'
};

/**
 * Scratch3Arduino class
 */
class Scratch3Arduino {
    /**
     * @param {Runtime} runtime - Scratch VM runtime
     */
    constructor (runtime) {
        this.runtime = runtime;
        this._boardType = 'arduinoUno';
        this.startedAt = Date.now();

        // Create and register the peripheral immediately so scan() works
        // when the connection modal opens
        this._peripheral = new ArduinoPeripheral(runtime, 'arduino', this._boardType);
    }

    /**
     * Get extension info
     * @returns {Object}
     */
    getInfo () {
        return {
            id: 'arduino',
            name: 'Arduino',
            blockIconURI: blockIconURI,
            color1: '#00979D',
            color2: '#007A80',
            color3: '#005C5F',
            blocks: [
                // Event hat
                {
                    opcode: 'whenArduinoBegin',
                    blockType: BlockType.HAT,
                    text: 'al iniciar Arduino'
                },
                '---',
                // Connection blocks
                {
                    opcode: 'connect',
                    blockType: BlockType.COMMAND,
                    text: 'conectar Arduino [BOARD]',
                    arguments: {
                        BOARD: {
                            type: ArgumentType.STRING,
                            menu: 'boardMenu',
                            defaultValue: 'arduinoUno'
                        }
                    }
                },
                {
                    opcode: 'disconnect',
                    blockType: BlockType.COMMAND,
                    text: 'desconectar Arduino'
                },
                {
                    opcode: 'isConnected',
                    blockType: BlockType.BOOLEAN,
                    text: 'Arduino conectado?'
                },
                '---',
                // Pin configuration
                {
                    opcode: 'setPinMode',
                    blockType: BlockType.COMMAND,
                    text: 'configurar pin [PIN] como [MODE]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 13
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: 'pinModeMenu',
                            defaultValue: PIN_MODES.OUTPUT
                        }
                    }
                },
                '---',
                // Digital I/O
                {
                    opcode: 'digitalWrite',
                    blockType: BlockType.COMMAND,
                    text: 'escribir pin digital [PIN] en [LEVEL]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 13
                        },
                        LEVEL: {
                            type: ArgumentType.STRING,
                            menu: 'digitalLevelMenu',
                            defaultValue: DIGITAL_LEVELS.HIGH
                        }
                    }
                },
                {
                    opcode: 'digitalRead',
                    blockType: BlockType.BOOLEAN,
                    text: 'leer pin digital [PIN]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    }
                },
                '---',
                // Analog I/O
                {
                    opcode: 'analogWrite',
                    blockType: BlockType.COMMAND,
                    text: 'escribir PWM pin [PIN] valor [VALUE]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 128
                        }
                    }
                },
                {
                    opcode: 'analogRead',
                    blockType: BlockType.REPORTER,
                    text: 'leer pin analógico [PIN]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'A0'
                        }
                    }
                },
                '---',
                // Servo
                {
                    opcode: 'servoWrite',
                    blockType: BlockType.COMMAND,
                    text: 'mover servo pin [PIN] a [ANGLE] grados',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9
                        },
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'servoRead',
                    blockType: BlockType.REPORTER,
                    text: 'leer ángulo del servo pin [PIN]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9
                        }
                    }
                },
                '---',
                // Tone
                {
                    opcode: 'tone',
                    blockType: BlockType.COMMAND,
                    text: 'tocar tono pin [PIN] frecuencia [FREQ] durante [DURATION] ms',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8
                        },
                        FREQ: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 440
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 500
                        }
                    }
                },
                {
                    opcode: 'noTone',
                    blockType: BlockType.COMMAND,
                    text: 'detener tono pin [PIN]',
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8
                        }
                    }
                },
                '---',
                // Utilities
                {
                    opcode: 'map',
                    blockType: BlockType.REPORTER,
                    text: 'mapear [VALUE] de [FROMLOW]-[FROMHIGH] a [TOLOW]-[TOHIGH]',
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 512
                        },
                        FROMLOW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        FROMHIGH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1023
                        },
                        TOLOW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        TOHIGH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 255
                        }
                    }
                },
                {
                    opcode: 'constrain',
                    blockType: BlockType.REPORTER,
                    text: 'limitar [VALUE] entre [LOW] y [HIGH]',
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        },
                        LOW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        HIGH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'delayMs',
                    blockType: BlockType.COMMAND,
                    text: 'esperar [MS] milisegundos',
                    arguments: {
                        MS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1000
                        }
                    }
                },
                {
                    opcode: 'millis',
                    blockType: BlockType.REPORTER,
                    text: 'milisegundos desde el inicio'
                },
                '---',
                // Serial
                {
                    opcode: 'serialPrint',
                    blockType: BlockType.COMMAND,
                    text: 'imprimir [TEXT] en serial',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hola'
                        }
                    }
                },
                {
                    opcode: 'serialPrintln',
                    blockType: BlockType.COMMAND,
                    text: 'imprimir línea [TEXT] en serial',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hola'
                        }
                    }
                },
                {
                    opcode: 'serialAvailable',
                    blockType: BlockType.BOOLEAN,
                    text: '¿hay datos disponibles en serial?'
                },
                {
                    opcode: 'serialRead',
                    blockType: BlockType.REPORTER,
                    text: 'leer dato serial'
                }
            ],
            menus: {
                boardMenu: {
                    acceptReporters: false,
                    items: [
                        {text: 'Arduino Uno', value: 'arduinoUno'},
                        {text: 'Arduino Nano', value: 'arduinoNano'},
                        {text: 'Arduino Mega', value: 'arduinoMega'},
                        {text: 'ESP32', value: 'esp32'}
                    ]
                },
                pinModeMenu: {
                    acceptReporters: false,
                    items: [
                        {text: 'Entrada', value: PIN_MODES.INPUT},
                        {text: 'Salida', value: PIN_MODES.OUTPUT},
                        {text: 'Entrada con Pull-up', value: PIN_MODES.INPUT_PULLUP},
                        {text: 'PWM', value: PIN_MODES.PWM},
                        {text: 'Servo', value: PIN_MODES.SERVO}
                    ]
                },
                digitalLevelMenu: {
                    acceptReporters: false,
                    items: [
                        {text: 'HIGH (1)', value: DIGITAL_LEVELS.HIGH},
                        {text: 'LOW (0)', value: DIGITAL_LEVELS.LOW}
                    ]
                }
            }
        };
    }

    /**
     * Get peripheral, optionally updating board type
     * @param {string} boardType - Board type (optional)
     * @returns {ArduinoPeripheral}
     */
    _getPeripheral (boardType) {
        if (boardType && this._boardType !== boardType) {
            // If board type changed, disconnect and create new peripheral
            if (this._peripheral && this._peripheral.isConnected()) {
                this._peripheral.disconnect();
            }
            this._boardType = boardType;
            this._peripheral = new ArduinoPeripheral(this.runtime, 'arduino', boardType);
        }
        return this._peripheral;
    }

    /**
     * Set board type (called from GUI when user selects a device profile)
     * Updates the existing peripheral's board config without re-creating it.
     * @param {string} boardType - Board type ID (e.g. 'arduinoUno', 'stbBoardV2')
     */
    setBoardType (boardType) {
        if (!boardType || boardType === this._boardType) return;
        this._boardType = boardType;
        if (this._peripheral && typeof this._peripheral.setBoardType === 'function') {
            this._peripheral.setBoardType(boardType);
        }
    }

    /**
     * Hat block - when Arduino begins
     * @returns {boolean}
     */
    whenArduinoBegin () {
        return true;
    }

    /**
     * Connect to Arduino
     * @param {Object} args - Block arguments
     */
    async connect (args) {
        const boardType = Cast.toString(args.BOARD);
        const peripheral = this._getPeripheral(boardType);

        if (!ArduinoPeripheral.isSupported()) {
            return;
        }

        // Trigger scan which will show port picker
        peripheral.scan();
    }

    /**
     * Disconnect from Arduino
     */
    async disconnect () {
        if (this._peripheral) {
            await this._peripheral.disconnect();
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected () {
        return this._peripheral ? this._peripheral.isConnected() : false;
    }

    /**
     * Set pin mode
     * @param {Object} args - Block arguments
     */
    async setPinMode (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        const mode = Cast.toString(args.MODE);

        await this._peripheral.setPinMode(pin, mode);
    }

    /**
     * Digital write
     * @param {Object} args - Block arguments
     */
    async digitalWrite (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        const level = Cast.toString(args.LEVEL);

        await this._peripheral.digitalWrite(pin, level);
    }

    /**
     * Digital read
     * @param {Object} args - Block arguments
     * @returns {boolean}
     */
    digitalRead (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return false;

        const pin = Cast.toNumber(args.PIN);
        return this._peripheral.digitalRead(pin) === 1;
    }

    /**
     * Analog write (PWM)
     * @param {Object} args - Block arguments
     */
    async analogWrite (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        const value = Cast.toNumber(args.VALUE);

        await this._peripheral.analogWrite(pin, value);
    }

    /**
     * Analog read
     * @param {Object} args - Block arguments
     * @returns {number}
     */
    analogRead (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return 0;

        const pin = Cast.toString(args.PIN);
        return this._peripheral.analogRead(pin);
    }

    /**
     * Servo write
     * @param {Object} args - Block arguments
     */
    async servoWrite (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        const angle = Cast.toNumber(args.ANGLE);

        await this._peripheral.setPinMode(pin, 'SERVO');
        await this._peripheral.servoWrite(pin, angle);
    }

    /**
     * Servo read (placeholder)
     * @param {Object} args - Block arguments
     * @returns {number}
     */
    servoRead (args) {
        return 0;
    }

    /**
     * Play tone
     * @param {Object} args - Block arguments
     */
    async tone (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        const freq = Cast.toNumber(args.FREQ);
        const duration = Cast.toNumber(args.DURATION);

        await this._peripheral.tone(pin, freq, duration);
    }

    /**
     * Stop tone
     * @param {Object} args - Block arguments
     */
    async noTone (args) {
        if (!this._peripheral || !this._peripheral.isConnected()) return;

        const pin = Cast.toNumber(args.PIN);
        await this._peripheral.noTone(pin);
    }

    /**
     * Map value from one range to another
     * @param {Object} args - Block arguments
     * @returns {number}
     */
    map (args) {
        const value = Cast.toNumber(args.VALUE);
        const fromLow = Cast.toNumber(args.FROMLOW);
        const fromHigh = Cast.toNumber(args.FROMHIGH);
        const toLow = Cast.toNumber(args.TOLOW);
        const toHigh = Cast.toNumber(args.TOHIGH);

        const span = fromHigh - fromLow;
        if (span === 0) return toLow;
        return ((value - fromLow) * (toHigh - toLow) / span) + toLow;
    }

    /**
     * Constrain value to range
     * @param {Object} args - Block arguments
     * @returns {number}
     */
    constrain (args) {
        const value = Cast.toNumber(args.VALUE);
        const low = Cast.toNumber(args.LOW);
        const high = Cast.toNumber(args.HIGH);

        return Math.max(low, Math.min(high, value));
    }

    /**
     * Delay in milliseconds
     * @param {Object} args - Block arguments
     * @returns {Promise}
     */
    delayMs (args) {
        const ms = Math.max(0, Cast.toNumber(args.MS) || 0);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get milliseconds since start
     * @returns {number}
     */
    millis () {
        return Date.now() - this.startedAt;
    }

    /**
     * Serial print (placeholder)
     * @param {Object} args - Block arguments
     */
    serialPrint (args) {
        // Placeholder for serial print
    }

    /**
     * Serial print line (placeholder)
     * @param {Object} args - Block arguments
     */
    serialPrintln (args) {
        // Placeholder for serial println
    }

    /**
     * Check if serial data available
     * @returns {boolean}
     */
    serialAvailable () {
        return false;
    }

    /**
     * Read serial data
     * @returns {string}
     */
    serialRead () {
        return '';
    }
}

module.exports = Scratch3Arduino;
