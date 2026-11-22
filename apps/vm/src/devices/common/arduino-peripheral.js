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
 * Cooldown after a failed Firmata handshake (ms).
 * Prevents repeating the 7s handshake on every block/mode change when the
 * board does not have Firmata firmware loaded.
 */
const FIRMATA_RETRY_COOLDOWN = 10000;

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
    arduinoLGT8F328P: {
        name: 'Arduino Nano LGT8F328P',
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
    arduinoNano:       {configKey: 'arduinoNano',       hexFile: 'arduinoNano.hex',       fqbn: 'arduino:avr:nano:cpu=atmega328old'},
    // LGT8F328P is a Logic Green clone that runs at 32 MHz. The stock AVR
    // core/Firmata hex (compiled for 16 MHz) produces garbled serial and never
    // answers Firmata, so it needs its own firmware build. The upload itself
    // still uses the old Nano bootloader protocol at 57600, which these boards
    // ship with.
    arduinoLGT8F328P:  {configKey: 'arduinoLGT8F328P',  hexFile: 'arduinoLGT8F328P.hex',  fqbn: 'arduino:avr:nano:cpu=atmega328old'},
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
        this._firmataConnecting = null;
        // Generation token used to discard in-flight handshakes after a
        // disconnect or program-mode change.
        this._firmataAttemptId = 0;
        this._lastFirmataFailureAt = 0;
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
        this._pinModes = {};

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
     * Get connected peripheral ID
     * @returns {string|null}
     */
    getConnectedPeripheralId () {
        return this._connectedPeripheralId;
    }

    /**
     * Get program mode
     * @returns {string}
     */
    getProgramMode () {
        // The runtime is the source of truth: setDeviceProfile() updates it
        // without notifying peripherals, so a stale local flag must not win.
        if (this._runtime && typeof this._runtime.getProgramMode === 'function') {
            const rtMode = this._runtime.getProgramMode();
            if (rtMode) return rtMode;
        }
        return this._programMode || ProgramModeType.UPLOAD;
    }

    setProgramMode (mode) {
        this._programMode = mode;

        if (this._runtime && typeof this._runtime.setProgramMode === 'function') {
            if (this._runtime.getProgramMode() !== mode) {
                this._runtime.setProgramMode(mode);
            }
        }

        if (mode === ProgramModeType.REALTIME && this.isConnected() && !this._firmata) {
            this.ensureFirmata();
        } else if (mode === ProgramModeType.UPLOAD) {
            // A new upload session should be allowed to retry the handshake.
            this._lastFirmataFailureAt = 0;
            if (this._firmata) {
                this._firmataAttemptId++;
                if (typeof this._firmata.disconnect === 'function') {
                    this._firmata.disconnect();
                }
                this._firmata = null;
            }
        }
    }

    /**
     * Ensure Firmata connection is initialized and active
     * @returns {Promise<boolean>}
     */
    async ensureFirmata () {
        if (this._firmata && this._firmata.isConnected()) {
            return true;
        }
        if (!this.isConnected() || !this._serial) {
            return false;
        }

        // Firmata is only used in realtime mode. In upload/device mode the
        // serial link is raw, so blocks must never start a Firmata handshake.
        if (this.getProgramMode() !== ProgramModeType.REALTIME) {
            return false;
        }

        if (this._firmataConnecting) {
            return this._firmataConnecting;
        }

        // Do not hammer the board with 7s handshakes when it has no firmware.
        if (this._lastFirmataFailureAt &&
            (Date.now() - this._lastFirmataFailureAt) < FIRMATA_RETRY_COOLDOWN) {
            return false;
        }

        const attemptId = ++this._firmataAttemptId;

        this._firmataConnecting = (async () => {
            let firmata = null;
            try {
                log.info('[ArduinoPeripheral] Initializing Firmata connection...');
                const targetBaud = (this._boardConfig && this._boardConfig.baudRate) || 57600;
                if (this._serial._baudRate !== targetBaud && typeof this._serial.setBaudRate === 'function') {
                    await this._serial.setBaudRate(targetBaud);
                }

                firmata = new Firmata();
                this._firmata = firmata;
                this._setupCallbacks();
                const connected = await firmata.connect(this._serial);

                // The port was closed or the attempt superseded while
                // handshaking: discard the result without touching state.
                if (attemptId !== this._firmataAttemptId) {
                    firmata.disconnect();
                    return false;
                }

                if (connected) {
                    this._programMode = ProgramModeType.REALTIME;
                    this._lastFirmataFailureAt = 0;
                    await this._enableReporting();
                    log.info('[ArduinoPeripheral] Firmata connected successfully');
                    return true;
                }

                if (this._firmata === firmata) {
                    this._firmata = null;
                }
                firmata.disconnect();

                this._lastFirmataFailureAt = Date.now();
                log.warn('[ArduinoPeripheral] Firmata handshake did not respond');
                this._runtime.emit('FIRMATA_NOT_LOADED', {
                    port: this._connectedPeripheralId,
                    deviceName: this._connectedPeripheralName
                });
                return false;
            } catch (err) {
                if (this._firmata === firmata) {
                    this._firmata = null;
                }
                if (firmata) {
                    firmata.disconnect();
                }
                if (attemptId !== this._firmataAttemptId) {
                    return false;
                }
                this._lastFirmataFailureAt = Date.now();
                log.error('[ArduinoPeripheral] Error ensuring Firmata:', err);
                return false;
            } finally {
                this._firmataConnecting = null;
            }
        })();

        return this._firmataConnecting;
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

            const isRealtime = this.getProgramMode() === ProgramModeType.REALTIME;
            if (!isRealtime) {
                // Success! (No Firmata needed for upload mode)
                this._connectionState = ConnectionState.CONNECTED;
                this._connectedPeripheralId = peripheralId;
                this._connectedPeripheralName = name;
                this._setupUploadCallbacks();
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
                log.info(`Connected to ${name} in upload mode (Tauri)`);
                return;
            }

            // Initialize Firmata for realtime mode
            this._firmata = new Firmata();
            this._setupCallbacks();

            const firmataConnected = await this._firmata.connect(this._serial);

            if (!firmataConnected) {
                await this._serial.disconnect();
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                    message: 'Error al conectar con Firmata. Asegúrate de que el firmware Firmata esté cargado.',
                    extensionId: this._extensionId
                });
                return;
            }

            this._connectionState = ConnectionState.CONNECTED;
            this._connectedPeripheralId = peripheralId;
            this._connectedPeripheralName = name;

            // Enable digital and analog reporting
            await this._enableReporting();

            // Emit connected event
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
            log.info(`Connected to ${name} in realtime mode with Firmata (Tauri)`);

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
        const wasConnected = this._connectionState !== ConnectionState.DISCONNECTED ||
            (this._serial && this._serial.isConnected());

        // Invalidate any in-flight handshake before closing the port.
        this._firmataAttemptId++;
        this._connectionState = ConnectionState.DISCONNECTED;

        if (this._firmata) {
            this._firmata.disconnect();
            this._firmata = null;
        }

        if (this._serial) {
            await this._serial.disconnect();
        }

        this._connectedPeripheralId = null;
        this._connectedPeripheralName = null;
        this._digitalCache = {};
        this._analogCache = {};
        this._pinModes = {};
        this._lastFirmataFailureAt = 0;

        if (wasConnected) {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
        }
    }

    /**
     * Upload standard Firmata firmware to the board
     * @returns {Promise<boolean>}
     */
    async uploadFirmware (customPort = null) {
        log.info(`[ArduinoPeripheral] Starting firmware upload for ${this._boardType}...`);

        let portName = customPort || this._connectedPeripheralId;
        if (!portName) {
            log.warn('Cannot upload firmware: no device connected or port specified');
            return false;
        }

        if (this._availablePeripherals[portName] && this._availablePeripherals[portName].portName) {
            portName = this._availablePeripherals[portName].portName;
        }
        if (portName && typeof portName === 'string') {
            portName = portName.replace(/^serial_/, '');
            const match = portName.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                portName = match[1];
            }
        }

        const boardType = this._boardType;
        const savedId = this._connectedPeripheralId || customPort;
        const savedName = this._connectedPeripheralName;
        const savedAvailable = {...this._availablePeripherals};

        // Always stop the serial link before flashing. The connection state
        // can be ERROR while the native handle and its read loop are still
        // alive; leaving it open makes avrdude fail with "Port not found"
        // and leaves a zombie poller hammering the released handle.
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

            let response;
            try {
                response = await fetch(`static/firmwares/${hexFile}`);
                if (!response.ok) throw new Error('Not found');
            } catch (e) {
                response = await fetch(`/static/firmwares/${hexFile}`);
            }
            if (!response.ok) {
                throw new Error(`No se pudo obtener el firmware ${hexFile}: ${response.statusText}`);
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

                    // Wait 2s for board boot and reconnect automatically in realtime mode
                    setTimeout(() => {
                        this._availablePeripherals = savedAvailable;
                        this.setProgramMode(ProgramModeType.REALTIME);
                        this.connect(savedId);
                    }, 2000);

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
        if (!this.isConnected()) return;
        if (!this._firmata) {
            const ready = await this.ensureFirmata();
            if (!ready || !this._firmata) return;
        }

        const pinNum = this._parsePin(pin);
        let firmataMode;

        switch (String(mode).toUpperCase()) {
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

        this._pinModes[pinNum] = firmataMode;
        await this._firmata.setPinMode(pinNum, firmataMode);
    }

    /**
     * Write digital value
     * @param {number|string} pin - Pin number
     * @param {string|number} level - 'HIGH', 'LOW', 1, or 0
     */
    async digitalWrite (pin, level) {
        if (!this.isConnected()) return;
        if (!this._firmata) {
            const ready = await this.ensureFirmata();
            if (!ready || !this._firmata) return;
        }

        const pinNum = this._parsePin(pin);
        const value = this._parseLevel(level);

        // Auto-configure pin as OUTPUT if not explicitly set
        if (this._pinModes[pinNum] !== FIRMATA.PIN_MODE.OUTPUT) {
            await this._firmata.setPinMode(pinNum, FIRMATA.PIN_MODE.OUTPUT);
            this._pinModes[pinNum] = FIRMATA.PIN_MODE.OUTPUT;
        }

        this._digitalCache[pinNum] = value;
        await this._firmata.digitalWrite(pinNum, value);
    }

    /**
     * Read digital value
     * @param {number|string} pin - Pin number
     * @returns {number} 0 or 1
     */
    digitalRead (pin) {
        if (!this._firmata) {
            if (this.isConnected()) this.ensureFirmata();
            return 0;
        }
        const pinNum = this._parsePin(pin);
        return this._firmata.digitalRead(pinNum);
    }

    /**
     * Write analog (PWM) value
     * @param {number|string} pin - Pin number
     * @param {number} value - 0-255
     */
    async analogWrite (pin, value) {
        if (!this.isConnected()) return;
        if (!this._firmata) {
            const ready = await this.ensureFirmata();
            if (!ready || !this._firmata) return;
        }

        const pinNum = this._parsePin(pin);
        if (this._pinModes[pinNum] !== FIRMATA.PIN_MODE.PWM) {
            await this._firmata.setPinMode(pinNum, FIRMATA.PIN_MODE.PWM);
            this._pinModes[pinNum] = FIRMATA.PIN_MODE.PWM;
        }

        value = Math.max(0, Math.min(255, Math.round(value)));
        await this._firmata.analogWrite(pinNum, value);
    }

    /**
     * Read analog value
     * @param {number|string} pin - Analog pin (A0-A5 or 0-5)
     * @returns {number} 0-1023
     */
    analogRead (pin) {
        if (!this._firmata) {
            if (this.isConnected()) this.ensureFirmata();
            return 0;
        }
        const pinNum = this._parseAnalogPin(pin);
        return this._firmata.analogRead(pinNum);
    }

    /**
     * Write servo angle
     * @param {number|string} pin - Pin number
     * @param {number} angle - 0-180 degrees
     */
    async servoWrite (pin, angle) {
        if (!this.isConnected()) return;
        if (!this._firmata) {
            const ready = await this.ensureFirmata();
            if (!ready || !this._firmata) return;
        }

        const pinNum = this._parsePin(pin);
        if (this._pinModes[pinNum] !== FIRMATA.PIN_MODE.SERVO) {
            await this._firmata.setPinMode(pinNum, FIRMATA.PIN_MODE.SERVO);
            this._pinModes[pinNum] = FIRMATA.PIN_MODE.SERVO;
        }

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

        if (typeof this._firmata.onString === 'function') {
            this._firmata.onString(data => {
                this._runtime.emit('SERIAL_DATA_RECEIVED', {
                    extensionId: this._extensionId,
                    data: data
                });
            });
        }

        this._firmata.onDisconnect(() => {
            // Disposing the Firmata client does not necessarily mean the
            // physical port is gone (e.g. switching to upload mode or a
            // failed handshake). Physical disconnects are reported by the
            // serial port's onDisconnect handler below.
            log.info('[ArduinoPeripheral] Firmata connection closed');
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
        if (this.getProgramMode() === ProgramModeType.REALTIME || (this._firmata && this._firmata.isConnected())) {
            log.info(`[ArduinoPeripheral] Keeping 57600 baud for Firmata (ignoring change to ${baudrate})`);
            return;
        }
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
     * Set up Firmata event handlers (delegates to unified _setupCallbacks)
     */
    _setupFirmataHandlers () {
        this._setupCallbacks();
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
