/**
 * Arduino Peripheral - Hardware abstraction layer for Arduino devices
 * Manages connection, pin states, and communication with Arduino boards
 * Integrates with Scratch VM's peripheral extension system
 */

const WebSerial = require('../../io/web-serial');
const {Firmata, FIRMATA} = require('../../lib/firmata/firmata');
const {ProgramModeType} = require('../../extension-support/program-mode-type');
const log = require('../../util/log');

/**
 * Scan timeout in milliseconds
 */
const SCAN_TIMEOUT = 15000;

/**
 * Arduino board configurations
 */
const BOARD_CONFIGS = {
    arduinoUno: {
        name: 'Arduino Uno',
        digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
        pwmPins: [3, 5, 6, 9, 10, 11],
        baudRate: 57600
    },
    arduinoNano: {
        name: 'Arduino Nano',
        digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
        pwmPins: [3, 5, 6, 9, 10, 11],
        baudRate: 57600
    },
    arduinoMega: {
        name: 'Arduino Mega 2560',
        digitalPins: Array.from({length: 54}, (_, i) => i),
        analogPins: Array.from({length: 16}, (_, i) => `A${i}`),
        pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
        baudRate: 57600
    },
    stbBoardV2: {
        name: 'STBoard V2',
        digitalPins: Array.from({length: 54}, (_, i) => i),
        analogPins: Array.from({length: 16}, (_, i) => `A${i}`),
        pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
        baudRate: 57600
    },
    stBoardExtension: {
        name: 'STBoard Extension',
        digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
        pwmPins: [3, 5, 6, 9, 10, 11],
        baudRate: 57600
    },
    esp32: {
        name: 'ESP32',
        digitalPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
        analogPins: ['A0', 'A3', 'A4', 'A5', 'A6', 'A7'],
        pwmPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27],
        baudRate: 115200
    }
};

/**
 * Maps device profile IDs (from devices.jsx) to board config keys
 * and stores Firmata upload info (hex file + FQBN).
 * Keys not listed here lack a precompiled Firmata hex and will fall back to arduinoUno.
 */
const FIRMWARE_SUPPORT = {
    arduinoUno:        {configKey: 'arduinoUno',        hexFile: 'arduinoUno.hex',        fqbn: 'arduino:avr:uno'},
    arduinoNano:       {configKey: 'arduinoNano',       hexFile: 'arduinoNano.hex',       fqbn: 'arduino:avr:nano'},
    arduinoMega:       {configKey: 'arduinoMega',       hexFile: 'arduinoMega2560.hex',  fqbn: 'arduino:avr:mega'},
    arduinoMega2560:   {configKey: 'arduinoMega',       hexFile: 'arduinoMega2560.hex',  fqbn: 'arduino:avr:mega'},
    stbBoardV2:        {configKey: 'stbBoardV2',        hexFile: 'arduinoMega2560.hex',  fqbn: 'arduino:avr:mega'},
    stBoardExtension:  {configKey: 'stBoardExtension',  hexFile: 'arduinoUno.hex',        fqbn: 'arduino:avr:uno'}
};

/**
 * Connection states
 */
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

/**
 * ArduinoPeripheral class
 * Implements the peripheral extension interface expected by Scratch VM Runtime
 */
class ArduinoPeripheral {
    /**
     * @param {Runtime} runtime - Scratch VM runtime
     * @param {string} extensionId - Extension ID
     * @param {string} boardType - Board type (arduinoUno, arduinoNano, etc.)
     */
    constructor (runtime, extensionId, boardType = 'arduinoUno') {
        this._runtime = runtime;
        this._extensionId = extensionId;
        // Resolve board type through FIRMWARE_SUPPORT alias map,
        // then pick the correct BOARD_CONFIGS entry.
        const fwInfo = FIRMWARE_SUPPORT[boardType];
        this._boardType = boardType;
        this._boardConfig = fwInfo ? (BOARD_CONFIGS[fwInfo.configKey] || BOARD_CONFIGS.arduinoUno) : BOARD_CONFIGS.arduinoUno;

        this._serial = new WebSerial();
        this._firmata = null;
        this._connectionState = ConnectionState.DISCONNECTED;
        this._programMode = (this._runtime && typeof this._runtime.getProgramMode === 'function') ?
            (this._runtime.getProgramMode() || ProgramModeType.UPLOAD) :
            ProgramModeType.UPLOAD;

        // Currently connected peripheral info
        this._connectedPeripheralId = null;
        this._connectedPeripheralName = null;

        // Available peripherals from scan
        this._availablePeripherals = {};

        // Scan timeout
        this._scanTimeoutId = null;

        // Pin caches for fast access
        this._digitalCache = {};
        this._analogCache = {};

        // Register this peripheral extension with runtime
        this._runtime.registerPeripheralExtension(extensionId, this);
    }

    /**
     * Check if Web Serial is supported
     * @returns {boolean}
     */
    static isSupported () {
        return WebSerial.isSupported();
    }

    /**
     * Get board configuration
     * @returns {Object}
     */
    getBoardConfig () {
        return this._boardConfig;
    }

    /**
     * Get board type
     * @returns {string}
     */
    getBoardType () {
        return this._boardType;
    }

    /**
     * Update board type (affects firmware upload and pin configs)
     * Should be called when user selects a different device in the UI
     * @param {string} boardType - New board type ID (e.g. 'arduinoUno', 'arduinoMega2560')
     */
    setBoardType (boardType) {
        if (boardType === this._boardType) return;
        log.info(`[ArduinoPeripheral] Changing board type from ${this._boardType} to ${boardType}`);
        this._boardType = boardType;
        const fwInfo = FIRMWARE_SUPPORT[boardType];
        this._boardConfig = fwInfo ? (BOARD_CONFIGS[fwInfo.configKey] || BOARD_CONFIGS.arduinoUno) : BOARD_CONFIGS.arduinoUno;
    }

    /**
     * Get current connection state
     * @returns {string}
     */
    getConnectionState () {
        return this._connectionState;
    }

    /**
     * Check if connected (required by runtime)
     * @returns {boolean}
     */
    isConnected () {
        return this._connectionState === ConnectionState.CONNECTED;
    }

    /**
     * Get connected peripheral name
     * @returns {string|null}
     */
    getPeripheralName () {
        return this._connectedPeripheralName;
    }

    /**
     * Get program mode
     * @returns {string}
     */
    getProgramMode () {
        if (this._runtime && typeof this._runtime.getProgramMode === 'function') {
            return this._runtime.getProgramMode() || 'upload';
        }
        return this._programMode || 'upload';
    }

    setProgramMode (mode) {
        this._programMode = mode;

        if (mode === ProgramModeType.REALTIME && this.isConnected() && !this._firmata) {
            // Check if we are using Tauri port
            if (this._serial && this._serial._isTauriPort) {
                this._firmata = new Firmata(this._serial);
                this._setupFirmataHandlers();
                this._firmata.queryVersion();
            } else {
                this._firmata = new Firmata();
                this._setupCallbacks();
                this._firmata.connect(this._serial).then(success => {
                    if (success) {
                        this._enableReporting();
                        log.info('Firmata connected dynamically on program mode switch');
                    } else {
                        log.error('Failed to connect Firmata on program mode switch');
                    }
                });
            }
        } else if (mode === ProgramModeType.UPLOAD && this._firmata) {
            // Clean up Firmata
            if (typeof this._firmata.disconnect === 'function') {
                this._firmata.disconnect();
            }
            this._firmata = null;
        }
    }

    /**
     * Scan for available serial ports (required by runtime)
     * Emits PERIPHERAL_LIST_UPDATE with available ports
     */
    scan () {
        if (!WebSerial.isSupported()) {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                message: 'Serial no soportado en este navegador',
                extensionId: this._extensionId
            });
            return;
        }

        this._availablePeripherals = {};

        // Clear any existing scan timeout
        if (this._scanTimeoutId) {
            clearTimeout(this._scanTimeoutId);
        }

        // Set scan timeout
        this._scanTimeoutId = setTimeout(() => {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_SCAN_TIMEOUT);
        }, SCAN_TIMEOUT);

        // Check if running in Tauri (desktop app)
        if (WebSerial.isTauri()) {
            // In Tauri, we get all available ports automatically
            this._serial.requestPort().then(ports => {
                if (this._scanTimeoutId) {
                    clearTimeout(this._scanTimeoutId);
                    this._scanTimeoutId = null;
                }

                if (ports && Array.isArray(ports) && ports.length > 0) {
                    // Process each port from Tauri
                    ports.forEach((portInfo, index) => {
                        const peripheralId = `serial_${portInfo.port_name || index}`;
                        const peripheralName = this._getTauriPortName(portInfo);

                        this._availablePeripherals[peripheralId] = {
                            peripheralId: peripheralId,
                            name: peripheralName,
                            portName: portInfo.port_name, // Store actual port name for Tauri
                            port: portInfo, // Store full port info
                            rssi: null,
                            isTauri: true
                        };
                    });

                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                        this._availablePeripherals
                    );
                } else {
                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                        {}
                    );
                }
            }).catch(error => {
                if (this._scanTimeoutId) {
                    clearTimeout(this._scanTimeoutId);
                    this._scanTimeoutId = null;
                }
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                    message: error.message,
                    extensionId: this._extensionId
                });
            });
        } else {
            // Web Serial mode - browser shows native picker
            this._serial.requestPort().then(port => {
                if (this._scanTimeoutId) {
                    clearTimeout(this._scanTimeoutId);
                    this._scanTimeoutId = null;
                }

                if (port) {
                    // Get port info
                    const portInfo = port.getInfo ? port.getInfo() : {};
                    const peripheralId = `serial_${Date.now()}`;
                    const peripheralName = this._getPortName(portInfo);

                    // Store the port for later connection
                    this._availablePeripherals[peripheralId] = {
                        peripheralId: peripheralId,
                        name: peripheralName,
                        port: port,
                        rssi: null,
                        isTauri: false
                    };

                    // Emit the list update
                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                        this._availablePeripherals
                    );
                } else {
                    // User cancelled - emit empty list
                    this._runtime.emit(
                        this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                        {}
                    );
                }
            }).catch(error => {
                if (this._scanTimeoutId) {
                    clearTimeout(this._scanTimeoutId);
                    this._scanTimeoutId = null;
                }

                if (error.name !== 'NotFoundError') {
                    this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                        message: error.message,
                        extensionId: this._extensionId
                    });
                }
            });
        }
    }

    /**
     * Get a friendly name for Tauri port
     * @param {Object} portInfo - Port info from Tauri
     * @returns {string}
     */
    _getTauriPortName (portInfo) {
        const vendorNames = {
            0x2341: 'Arduino',
            0x2A03: 'Arduino',
            0x1A86: 'CH340',
            0x0403: 'FTDI',
            0x10C4: 'CP210x',
            0x067B: 'Prolific',
            0x239A: 'Adafruit',
            0x303A: 'ESP32'
        };

        let name = portInfo.port_name;

        if (portInfo.vid) {
            const vendorName = vendorNames[portInfo.vid] || portInfo.manufacturer || 'Serial';
            name = `${vendorName} (${portInfo.port_name})`;
        } else if (portInfo.manufacturer) {
            name = `${portInfo.manufacturer} (${portInfo.port_name})`;
        } else if (portInfo.product) {
            name = `${portInfo.product} (${portInfo.port_name})`;
        }

        return name;
    }

    /**
     * Get a friendly name for the port
     * @param {Object} portInfo - Port info from Web Serial API
     * @returns {string}
     */
    _getPortName (portInfo) {
        const vendorNames = {
            0x2341: 'Arduino',
            0x2A03: 'Arduino',
            0x1A86: 'CH340',
            0x0403: 'FTDI',
            0x10C4: 'CP210x',
            0x067B: 'Prolific',
            0x239A: 'Adafruit',
            0x303A: 'ESP32'
        };

        if (portInfo.usbVendorId) {
            const vendorName = vendorNames[portInfo.usbVendorId] || 'Serial';
            return `${vendorName} (${portInfo.usbProductId || 'Unknown'})`;
        }

        return `Puerto Serial - ${this._boardConfig.name}`;
    }

    /**
     * Connect to a specific peripheral (required by runtime)
     * @param {string} peripheralId - The peripheral ID to connect to
     */
    connect (peripheralId) {
        const peripheral = this._availablePeripherals[peripheralId];

        if (!peripheral) {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                message: 'Dispositivo no encontrado',
                extensionId: this._extensionId
            });
            return;
        }

        this._connectionState = ConnectionState.CONNECTING;

        // Check if this is a Tauri port
        if (peripheral.isTauri) {
            this._connectTauriPort(peripheral.portName, peripheral.name, peripheralId);
        } else {
            // Web Serial port
            this._connectToPort(peripheral.port, peripheral.name, peripheralId);
        }
    }

    /**
     * Connect to a Tauri serial port
     * @param {string} portName - The port name (e.g., "COM3")
     * @param {string} name - Display name
     * @param {string} peripheralId - Peripheral ID
     */
    async _connectTauriPort (portName, name, peripheralId) {
        try {
            // Connect using Tauri's native serial
            const connected = await this._serial.connectByName(portName, {
                baudRate: this._boardConfig.baudRate
            });

            if (!connected) {
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                    message: 'Error al conectar al puerto serial',
                    extensionId: this._extensionId
                });
                return;
            }

            if (this.getProgramMode() !== ProgramModeType.REALTIME) {
                // Success! (No Firmata needed for upload mode)
                this._connectionState = ConnectionState.CONNECTED;
                this._connectedPeripheralId = peripheralId;
                this._connectedPeripheralName = name;
                this._setupUploadCallbacks();
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
                log.info(`Connected to ${name} in upload mode (Tauri)`);
                return;
            }

            // Initialize Firmata
            this._firmata = new Firmata(this._serial);
            this._connectedPeripheralId = peripheralId;
            this._connectedPeripheralName = name;

            // Set up Firmata event handlers
            this._setupFirmataHandlers();

            // Query firmware version to confirm connection
            this._firmata.queryVersion();

            // Set timeout for Firmata response
            this._connectTimeout = setTimeout(() => {
                if (this._connectionState === ConnectionState.CONNECTING) {
                    this._connectionState = ConnectionState.ERROR;
                    this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                        message: 'Timeout esperando respuesta de Firmata. Asegúrate de que el firmware Firmata esté cargado.',
                        extensionId: this._extensionId
                    });
                    this.disconnect();
                }
            }, FIRMATA_TIMEOUT);

        } catch (error) {
            this._connectionState = ConnectionState.ERROR;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                message: `Error de conexión: ${error.message}`,
                extensionId: this._extensionId
            });
        }
    }

    /**
     * Internal method to connect to a Web Serial port
     * @param {SerialPort} port - The Web Serial port object
     * @param {string} name - Display name
     * @param {string} peripheralId - Peripheral ID
     */
    async _connectToPort (port, name, peripheralId) {
        try {
            // Store the port in WebSerial wrapper
            this._serial._port = port;

            // Connect to port
            const connected = await this._serial.connect({
                baudRate: this._boardConfig.baudRate
            });

            if (!connected) {
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                    message: 'Error al conectar al puerto serial',
                    extensionId: this._extensionId
                });
                return;
            }

            if (this.getProgramMode() !== ProgramModeType.REALTIME) {
                // Success! (No Firmata needed for upload mode)
                this._connectionState = ConnectionState.CONNECTED;
                this._connectedPeripheralId = peripheralId;
                this._connectedPeripheralName = name;
                this._setupUploadCallbacks();
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
                log.info(`Connected to ${name} in upload mode`);
                return;
            }

            // Initialize Firmata
            this._firmata = new Firmata();
            this._setupCallbacks();

            const firmataConnected = await this._firmata.connect(this._serial);

            if (!firmataConnected) {
                await this._serial.disconnect();
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                    message: 'Error de comunicación Firmata - ¿Tiene el firmware correcto?',
                    extensionId: this._extensionId
                });
                return;
            }

            // Success!
            this._connectionState = ConnectionState.CONNECTED;
            this._connectedPeripheralId = peripheralId;
            this._connectedPeripheralName = name;

            // Enable digital and analog reporting
            await this._enableReporting();

            // Emit connected event
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);

            log.info(`Connected to ${name}`);

        } catch (error) {
            log.error('Connection error:', error);
            this._connectionState = ConnectionState.ERROR;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                message: error.message,
                extensionId: this._extensionId
            });
        }
    }

    /**
     * Disconnect from Arduino (required by runtime)
     * @returns {Promise}
     */
    async disconnect () {
        if (this._firmata) {
            this._firmata.disconnect();
            this._firmata = null;
        }

        if (this._serial) {
            await this._serial.disconnect();
        }
        this._connectionState = ConnectionState.DISCONNECTED;
        this._connectedPeripheralId = null;
        this._connectedPeripheralName = null;
        this._digitalCache = {};
        this._analogCache = {};

        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
    }

    /**
     * Upload standard Firmata firmware to the board
     * @returns {Promise<boolean>}
     */
    async uploadFirmware () {
        log.info(`[ArduinoPeripheral] Starting firmware upload for ${this._boardType}...`);

        if (!this._connectedPeripheralId) {
            log.warn('Cannot upload firmware: no device connected');
            return false;
        }

        // Clean port name (strip prefix 'serial_' and extract from parentheses if needed)
        let portName = this._connectedPeripheralId;
        if (this._availablePeripherals[this._connectedPeripheralId] && this._availablePeripherals[this._connectedPeripheralId].portName) {
            portName = this._availablePeripherals[this._connectedPeripheralId].portName;
        }
        if (portName && typeof portName === 'string') {
            portName = portName.replace(/^serial_/, '');
            const match = portName.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                portName = match[1];
            }
        }

        const boardType = this._boardType;
        const savedId = this._connectedPeripheralId;
        const savedName = this._connectedPeripheralName;
        const savedAvailable = {...this._availablePeripherals};

        // Disconnect first to free the serial port
        await this.disconnect();

        // Wait for the CH340/serial driver to fully release the port on Windows
        await new Promise(resolve => setTimeout(resolve, 500));

        // Emit uploading event
        this._runtime.emit('PERIPHERAL_UPLOAD_STATUS', {
            status: 'uploading',
            message: 'Cargando firmware tiempo real (Firmata)...'
        });

        try {
            const fwInfo = FIRMWARE_SUPPORT[boardType];
            const hexFile = fwInfo ? fwInfo.hexFile : `${boardType}.hex`;

            const response = await fetch(`static/firmwares/${hexFile}`);
            if (!response.ok) {
                throw new Error(`No se pudo obtener el firmware: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const content = Array.from(new Uint8Array(buffer));

            const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
            if (isTauri) {
                const { invoke } = window.__TAURI__.core;
                const fqbn = this._getFqbnForBoard(boardType);

                const result = await invoke('upload_firmware', {
                    content,
                    port: portName,
                    fqbn
                });

                if (result.success) {
                    log.info('[ArduinoPeripheral] Firmware flash successful');
                    
                    this._runtime.emit('PERIPHERAL_UPLOAD_STATUS', {
                        status: 'success',
                        message: 'Firmware cargado con éxito!'
                    });

                    // Wait 1.5s for board boot and reconnect automatically
                    setTimeout(() => {
                        this._availablePeripherals = savedAvailable;
                        this.connect(savedId);
                    }, 1500);

                    return true;
                } else {
                    throw new Error(result.error || 'Tauri flasher returned failure');
                }
            } else {
                throw new Error('La carga de firmware en vivo requiere la aplicación de escritorio.');
            }
        } catch (error) {
            log.error('[ArduinoPeripheral] Firmware upload error:', error);
            
            this._runtime.emit('PERIPHERAL_UPLOAD_STATUS', {
                status: 'error',
                message: `Error al flashear Firmata: ${error.message}`
            });

            // Try to reconnect anyway
            setTimeout(() => {
                this._availablePeripherals = savedAvailable;
                this.connect(savedId);
            }, 2000);

            return false;
        }
    }

    /**
     * Get the FQBN for a board type
     * @param {string} boardType - Board type
     * @returns {string} FQBN
     * @private
     */
    _getFqbnForBoard (boardType) {
        const fwInfo = FIRMWARE_SUPPORT[boardType];
        if (fwInfo) return fwInfo.fqbn;
        return 'arduino:avr:uno';
    }

    /**
     * Set pin mode
     * @param {number|string} pin - Pin number or name
     * @param {string} mode - 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'PWM', 'SERVO'
     */
    async setPinMode (pin, mode) {
        if (!this.isConnected() || !this._firmata) return;

        const pinNum = this._parsePin(pin);
        let firmataMode;

        switch (mode.toUpperCase()) {
        case 'INPUT':
            firmataMode = FIRMATA.PIN_MODE.INPUT;
            break;
        case 'OUTPUT':
            firmataMode = FIRMATA.PIN_MODE.OUTPUT;
            break;
        case 'INPUT_PULLUP':
            firmataMode = FIRMATA.PIN_MODE.PULLUP;
            break;
        case 'PWM':
            firmataMode = FIRMATA.PIN_MODE.PWM;
            break;
        case 'SERVO':
            firmataMode = FIRMATA.PIN_MODE.SERVO;
            break;
        default:
            firmataMode = FIRMATA.PIN_MODE.INPUT;
        }

        await this._firmata.setPinMode(pinNum, firmataMode);
    }

    /**
     * Write digital value
     * @param {number|string} pin - Pin number
     * @param {string|number} level - 'HIGH', 'LOW', 1, or 0
     */
    async digitalWrite (pin, level) {
        if (!this.isConnected() || !this._firmata) return;

        const pinNum = this._parsePin(pin);
        const value = this._parseLevel(level);

        this._digitalCache[pinNum] = value;
        await this._firmata.digitalWrite(pinNum, value);
    }

    /**
     * Read digital value
     * @param {number|string} pin - Pin number
     * @returns {number} 0 or 1
     */
    digitalRead (pin) {
        if (!this._firmata) return 0;
        const pinNum = this._parsePin(pin);
        return this._firmata.digitalRead(pinNum);
    }

    /**
     * Write analog (PWM) value
     * @param {number|string} pin - Pin number
     * @param {number} value - 0-255
     */
    async analogWrite (pin, value) {
        if (!this.isConnected() || !this._firmata) return;

        const pinNum = this._parsePin(pin);
        value = Math.max(0, Math.min(255, Math.round(value)));

        await this._firmata.analogWrite(pinNum, value);
    }

    /**
     * Read analog value
     * @param {number|string} pin - Analog pin (A0-A5 or 0-5)
     * @returns {number} 0-1023
     */
    analogRead (pin) {
        if (!this._firmata) return 0;
        const pinNum = this._parseAnalogPin(pin);
        return this._firmata.analogRead(pinNum);
    }

    /**
     * Write servo angle
     * @param {number|string} pin - Pin number
     * @param {number} angle - 0-180 degrees
     */
    async servoWrite (pin, angle) {
        if (!this.isConnected() || !this._firmata) return;

        const pinNum = this._parsePin(pin);
        angle = Math.max(0, Math.min(180, Math.round(angle)));

        await this._firmata.servoWrite(pinNum, angle);
    }

    /**
     * Play tone on buzzer
     * @param {number|string} pin - Pin number
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in milliseconds
     */
    async tone (pin, frequency, duration) {
        log.warn('tone() not implemented in standard Firmata');
    }

    /**
     * Stop tone
     * @param {number|string} pin - Pin number
     */
    async noTone (pin) {
        log.warn('noTone() not implemented in standard Firmata');
    }

    /**
     * Map value from one range to another
     */
    map (value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    /**
     * Constrain value to range
     */
    constrain (value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Delay
     * @param {number} ms - Milliseconds
     * @returns {Promise}
     */
    delay (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get milliseconds since start
     * @returns {number}
     */
    millis () {
        return Date.now();
    }

    // Private methods

    _setupCallbacks () {
        if (!this._firmata) return;

        this._firmata.onDigitalChange((pin, value) => {
            this._digitalCache[pin] = value;
        });

        this._firmata.onAnalogChange((pin, value) => {
            this._analogCache[pin] = value;
        });

        this._firmata.onDisconnect(() => {
            this._connectionState = ConnectionState.DISCONNECTED;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
        });

        this._firmata.onError(error => {
            log.error('Firmata error:', error);
        });

        this._serial.onDisconnect(() => {
            this._connectionState = ConnectionState.DISCONNECTED;
            if (this._firmata) {
                this._firmata.disconnect();
            }
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
        });
    }

    setBaudrate (baudrate) {
        log.info(`[ArduinoPeripheral] Changing baud rate to ${baudrate}`);
        if (this._serial) {
            this._serial.setBaudRate(baudrate);
        }
    }

    _setupUploadCallbacks () {
        if (this._serial) {
            // Listen for raw serial data for the terminal monitor
            if (typeof this._serial.onData === 'function') {
                this._serial.onData(data => {
                    this._runtime.emit('SERIAL_DATA_RECEIVED', {
                        extensionId: this._extensionId,
                        data: this._decodeSerialData(data)
                    });
                });
            }

            // Listen for physical disconnect
            if (typeof this._serial.onDisconnect === 'function') {
                this._serial.onDisconnect(() => {
                    this._connectionState = ConnectionState.DISCONNECTED;
                    this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
                });
            }
        }
    }

    /**
     * Set up Firmata event handlers (for Tauri mode)
     */
    _setupFirmataHandlers () {
        if (!this._firmata) return;

        this._firmata.on('ready', () => {
            if (this._connectTimeout) {
                clearTimeout(this._connectTimeout);
                this._connectTimeout = null;
            }
            this._connectionState = ConnectionState.CONNECTED;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
            log.info('Firmata ready');
        });

        this._firmata.on('digital-read', data => {
            if (data && typeof data.pin === 'number') {
                this._digitalCache[data.pin] = data.value;
            }
        });

        this._firmata.on('analog-read', data => {
            if (data && typeof data.pin === 'number') {
                this._analogCache[data.pin] = data.value;
            }
        });

        this._firmata.on('string', data => {
            // Serial data received from Arduino (via Serial.print)
            this._runtime.emit('SERIAL_DATA_RECEIVED', {
                extensionId: this._extensionId,
                data: data
            });
        });

        this._firmata.on('close', () => {
            this._connectionState = ConnectionState.DISCONNECTED;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
        });

        this._firmata.on('error', error => {
            log.error('Firmata error:', error);
        });

        // Also listen for raw serial data
        if (this._serial && this._serial.onData) {
            this._serial.onData(data => {
                // Emit raw data for terminal
                this._runtime.emit('SERIAL_DATA_RECEIVED', {
                    extensionId: this._extensionId,
                    data: this._decodeSerialData(data)
                });
            });
        }
    }

    /**
     * Decode serial data to string
     * @param {Uint8Array} data - Raw data
     * @returns {string}
     */
    _decodeSerialData (data) {
        if (!data) return '';
        if (typeof data === 'string') return data;
        try {
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(data);
        } catch (e) {
            return Array.from(data).map(b => String.fromCharCode(b)).join('');
        }
    }

    /**
     * Send data to Arduino via serial
     * @param {string|Uint8Array} data - Data to send
     */
    async sendSerialData (data) {
        if (!this._serial || !this.isConnected()) {
            log.warn('Cannot send data: not connected');
            return false;
        }

        try {
            let bytes;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                bytes = encoder.encode(data);
            } else {
                bytes = data;
            }

            await this._serial.write(bytes);
            return true;
        } catch (error) {
            log.error('Error sending serial data:', error);
            return false;
        }
    }

    /**
     * Send string with newline to Arduino
     * @param {string} text - Text to send
     */
    async sendSerialLine (text) {
        return this.sendSerialData(text + '\n');
    }

    async _enableReporting () {
        if (!this._firmata) return;

        // Enable digital reporting for all ports
        for (let port = 0; port < 3; port++) {
            await this._firmata.reportDigital(port, true);
        }

        // Enable analog reporting for all analog pins
        for (let pin = 0; pin < 6; pin++) {
            await this._firmata.reportAnalog(pin, true);
        }

        // Set sampling interval
        await this._firmata.setSamplingInterval(19); // ~50Hz
    }

    _parsePin (pin) {
        if (typeof pin === 'string') {
            if (pin.startsWith('A') || pin.startsWith('a')) {
                return parseInt(pin.slice(1), 10) + 14;
            }
            return parseInt(pin, 10);
        }
        return pin;
    }

    _parseAnalogPin (pin) {
        if (typeof pin === 'string') {
            if (pin.startsWith('A') || pin.startsWith('a')) {
                return parseInt(pin.slice(1), 10);
            }
            return parseInt(pin, 10);
        }
        return pin;
    }

    _parseLevel (level) {
        if (typeof level === 'string') {
            return level.toUpperCase() === 'HIGH' ? 1 : 0;
        }
        return level ? 1 : 0;
    }
}

module.exports = {
    ArduinoPeripheral,
    ConnectionState,
    BOARD_CONFIGS
};
