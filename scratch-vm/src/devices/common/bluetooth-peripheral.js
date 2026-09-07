/**
 * Bluetooth Peripheral - Serial Port Profile (SPP) transport for the desktop app.
 *
 * Connects the PC to an HC-05 / HC-06 (exposed by Windows as a virtual COM with
 * `port_type === 'Bluetooth'`) using the same WebSerial wrapper as the Arduino
 * peripheral, but WITHOUT Firmata. The board simply runs a sketch that reads /
 * answers over its own UART (where the HC-05 is wired).
 *
 * Unlike the Arduino peripheral, this one does NOT emit the generic PERIPHERAL_*
 * events (to avoid interfering with "Electrónica" mode / `deviceMode.isConnected`
 * / `stblock_last_peripheral`). It uses its own BLUETOOTH_* events and drives the
 * `bt_when_line` hat through `runtime.startHats`.
 */

const WebSerial = require('../../io/web-serial');
const log = require('../../util/log');

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
 * Maximum number of queued lines / bytes kept before discarding the oldest.
 */
const MAX_QUEUE = 200;

/**
 * Maximum size of the partial line buffer before trimming its head.
 * Guards against an incoming stream that never sends a newline.
 */
const MAX_PARTIAL_LINE = 4096;

class BluetoothPeripheral {
    /**
     * @param {Runtime} runtime - Scratch VM runtime
     */
    constructor (runtime) {
        this._runtime = runtime;
        this._serial = new WebSerial();
        this._connectionState = ConnectionState.DISCONNECTED;

        // Currently connected peripheral info
        this._connectedPeripheralId = null;
        this._connectedPeripheralName = null;

        // Available peripherals from scan
        this._availablePeripherals = {};

        // TX helpers remember the baud used for the last connection
        this._baudRate = 9600;

        // RX buffers
        this._lineQueue = [];
        this._byteQueue = [];
        this._rxBuffer = ''; // partial line (no newline yet)
        this._lastLine = '';
        this._lastByte = -1;

        // Register this peripheral extension with runtime
        this._runtime.registerPeripheralExtension('bluetooth', this);
    }

    /**
     * Check if Web Serial / Tauri serial is supported
     * @returns {boolean}
     */
    static isSupported () {
        return WebSerial.isSupported();
    }

    /**
     * Check if running inside the Tauri desktop app
     * @returns {boolean}
     */
    static isTauri () {
        return WebSerial.isTauri();
    }

    /**
     * Get current connection state
     * @returns {string}
     */
    getConnectionState () {
        return this._connectionState;
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected () {
        return this._connectionState === ConnectionState.CONNECTED;
    }

    /**
     * Get the name of the connected port
     * @returns {string|null}
     */
    getConnectedName () {
        return this._connectedPeripheralName;
    }

    /**
     * Get the baud rate of the current/last connection.
     * @returns {number}
     */
    getBaudRate () {
        return this._baudRate;
    }

    /**
     * Get the list of available ports found in the last scan.
     * @returns {Array<{id: string, name: string, portName: string, port_type: string}>}
     */
    getAvailablePorts () {
        return Object.keys(this._availablePeripherals).map(id => ({
            id,
            name: this._availablePeripherals[id].name,
            portName: this._availablePeripherals[id].portName,
            port_type: this._availablePeripherals[id].port_type || null
        }));
    }

    /**
     * Scan for available serial ports (required by runtime).
     * In Tauri it lists all COM ports; in a browser it shows the native picker.
     * Emits BLUETOOTH_LIST_UPDATE with an array of ports.
     */
    scan () {
        if (!WebSerial.isSupported()) {
            this._runtime.emit('BLUETOOTH_ERROR', {
                message: 'Serial no soportado en este navegador'
            });
            return;
        }

        this._availablePeripherals = {};

        if (WebSerial.isTauri()) {
            // Tauri: list every COM port (HC-05 shows port_type === 'Bluetooth')
            WebSerial.listAllPorts().then(ports => {
                if (ports && Array.isArray(ports) && ports.length > 0) {
                    ports.forEach(portInfo => {
                        const peripheralId = String(portInfo.port_name || portInfo.portName);
                        if (!peripheralId) return;
                        this._availablePeripherals[peripheralId] = {
                            peripheralId: peripheralId,
                            name: this._getTauriPortName(portInfo),
                            portName: peripheralId,
                            port_type: portInfo.port_type || null,
                            isTauri: true
                        };
                    });
                }
                this._runtime.emit('BLUETOOTH_LIST_UPDATE', this.getAvailablePorts());
            })
                .catch(error => {
                    this._runtime.emit('BLUETOOTH_ERROR', {
                        message: error.message || 'Error al listar los puertos'
                    });
                });
            return;
        }

        // Browser Web Serial: show native picker
        this._serial.requestPort().then(port => {
            if (port) {
                const portInfo = port.getInfo ? port.getInfo() : {};
                const peripheralId = `serial_${Date.now()}`;
                this._availablePeripherals[peripheralId] = {
                    peripheralId: peripheralId,
                    name: this._getPortName(portInfo),
                    port: port,
                    port_type: null,
                    isTauri: false
                };
                this._runtime.emit('BLUETOOTH_LIST_UPDATE', this.getAvailablePorts());
            } else {
                this._runtime.emit('BLUETOOTH_LIST_UPDATE', []);
            }
        })
            .catch(error => {
                if (error && error.name !== 'NotFoundError') {
                    this._runtime.emit('BLUETOOTH_ERROR', {
                        message: error.message || 'Error al listar los puertos'
                    });
                }
            });
    }

    /**
     * Build a friendly name for a Tauri port.
     * Marks Bluetooth ports so the UI can filter them.
     * @param {object} portInfo - port info from Tauri
     * @returns {string}
     */
    _getTauriPortName (portInfo) {
        const isBt = portInfo.port_type === 'Bluetooth';
        let name = String(portInfo.port_name || portInfo.portName || '');
        if (isBt) {
            name = `${name} (Bluetooth)`;
        } else if (portInfo.manufacturer) {
            name = `${portInfo.manufacturer} (${name})`;
        } else if (portInfo.product) {
            name = `${portInfo.product} (${name})`;
        }
        return name;
    }

    /**
     * Build a friendly name for a Web Serial port.
     * @param {object} portInfo - port info from Web Serial API
     * @returns {string}
     */
    _getPortName (portInfo) {
        if (portInfo.usbVendorId) {
            return `Puerto serial (${portInfo.usbVendorId}:${portInfo.usbProductId || '?'})`;
        }
        return 'Puerto serial';
    }

    /**
     * Connect to a port (required by runtime).
     * @param {string} peripheralId - port name (or scan id)
     * @param {object} [connectOptions] - optional {baudRate}
     */
    async connect (peripheralId, connectOptions) {
        const options = connectOptions || {};
        const baudRate = Number(options.baudRate) || this._baudRate;

        const peripheral = this._availablePeripherals[peripheralId];
        // Allow direct connect by port name even if it wasn't scanned yet.
        const portName = peripheral ? peripheral.portName : String(peripheralId);

        if (!portName) {
            this._runtime.emit('BLUETOOTH_ERROR', {
                message: 'Dispositivo no encontrado'
            });
            return;
        }

        this._connectionState = ConnectionState.CONNECTING;
        this._runtime.emit('BLUETOOTH_CONNECTING', {
            portName: portName,
            baudRate: baudRate
        });

        if (peripheral && !peripheral.isTauri) {
            await this._connectWebSerialPort(peripheral.port, portName, baudRate);
        } else {
            await this._connectTauriPort(portName, baudRate);
        }
    }

    /**
     * Connect to a Tauri serial port by name.
     * @param {string} portName - the port name (e.g. "COM7")
     * @param {number} baudRate - baud rate
     */
    async _connectTauriPort (portName, baudRate) {
        try {
            const connected = await this._serial.connectByName(portName, {baudRate: baudRate});
            if (!connected) {
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit('BLUETOOTH_ERROR', {
                    message: 'Error al conectar al puerto. Comprueba que no esté en uso.'
                });
                return;
            }

            this._connectedPeripheralId = portName;
            this._connectedPeripheralName = portName;
            this._baudRate = baudRate;
            this._setupCallbacks();
            this._connectionState = ConnectionState.CONNECTED;
            this._runtime.emit('BLUETOOTH_CONNECTED', {
                portName: portName,
                baudRate: baudRate
            });
            log.info(`[BluetoothPeripheral] Connected to ${portName} at ${baudRate} baud`);
        } catch (error) {
            this._connectionState = ConnectionState.ERROR;
            this._runtime.emit('BLUETOOTH_ERROR', {
                message: error.message || 'Error de conexión'
            });
        }
    }

    /**
     * Connect to a browser Web Serial port object.
     * @param {object} port - SerialPort object
     * @param {string} portName - display/scan name
     * @param {number} baudRate - baud rate
     */
    async _connectWebSerialPort (port, portName, baudRate) {
        try {
            if (!port) {
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit('BLUETOOTH_ERROR', {
                    message: 'No se seleccionó ningún puerto'
                });
                return;
            }
            this._serial._port = port;
            const connected = await this._serial.connect({baudRate: baudRate});
            if (!connected) {
                this._connectionState = ConnectionState.ERROR;
                this._runtime.emit('BLUETOOTH_ERROR', {
                    message: 'Error al conectar al puerto'
                });
                return;
            }
            this._connectedPeripheralId = portName;
            this._connectedPeripheralName = portName;
            this._baudRate = baudRate;
            this._setupCallbacks();
            this._connectionState = ConnectionState.CONNECTED;
            this._runtime.emit('BLUETOOTH_CONNECTED', {
                portName: portName,
                baudRate: baudRate
            });
            log.info(`[BluetoothPeripheral] Connected to ${portName} at ${baudRate} baud`);
        } catch (error) {
            this._connectionState = ConnectionState.ERROR;
            this._runtime.emit('BLUETOOTH_ERROR', {
                message: error.message || 'Error de conexión'
            });
        }
    }

    /**
     * Disconnect from Bluetooth (required by runtime).
     * @returns {Promise}
     */
    async disconnect () {
        if (this._serial) {
            try {
                await this._serial.disconnect();
            } catch (e) {
                log.warn('[BluetoothPeripheral] Error disconnecting serial:', e);
            }
        }
        this._connectionState = ConnectionState.DISCONNECTED;
        this._connectedPeripheralId = null;
        this._connectedPeripheralName = null;
        this.clearRx();
        this._runtime.emit('BLUETOOTH_DISCONNECTED', {});
    }

    /**
     * Change baud rate of the active connection.
     * Named `setBaudrate` to match the interface expected by
     * `Runtime.setPeripheralBaudrate` / `virtual-machine.setPeripheralBaudrate`.
     * @param {number} baudRate - new baud
     */
    async setBaudrate (baudRate) {
        const baud = Number(baudRate) || 9600;
        this._baudRate = baud;
        if (this._serial && this.isConnected()) {
            await this._serial.setBaudRate(baud);
            this._runtime.emit('BLUETOOTH_CONNECTED', {
                portName: this._connectedPeripheralName,
                baudRate: baud
            });
        }
    }

    /**
     * Set up serial callbacks for data / disconnect / error.
     */
    _setupCallbacks () {
        if (!this._serial) return;
        if (typeof this._serial.onData === 'function') {
            this._serial.onData(data => {
                this._onSerialData(data);
            });
        }
        if (typeof this._serial.onDisconnect === 'function') {
            this._serial.onDisconnect(() => {
                if (this._connectionState === ConnectionState.CONNECTED) {
                    this._connectionState = ConnectionState.DISCONNECTED;
                    this._connectedPeripheralId = null;
                    this._connectedPeripheralName = null;
                    this._runtime.emit('BLUETOOTH_DISCONNECTED', {});
                }
            });
        }
        if (typeof this._serial.onError === 'function') {
            this._serial.onError(error => {
                log.error('[BluetoothPeripheral] Serial error:', error);
                this._runtime.emit('BLUETOOTH_ERROR', {
                    message: error.message || 'Error de comunicación'
                });
            });
        }
    }

    /**
     * Handle raw incoming bytes.
     * @param {Uint8Array|Array|string} chunk - raw data
     */
    _onSerialData (chunk) {
        if (!chunk) return;
        const text = this._decodeText(chunk);
        // Keep the byte queue in sync: each character of the (utf-8 decoded)
        // text is treated as an 8-bit value. Binary data over SPP is uncommon;
        // the common case is ASCII text and `readByte` returns those codes.
        for (let i = 0; i < text.length; i++) {
            this._pushByte(text.charCodeAt(i) & 0xFF);
        }
        this._accumulateText(text);
    }

    /**
     * Accumulate text, split by lines and dispatch each complete line.
     * @param {string} text - decoded text chunk
     */
    _accumulateText (text) {
        this._rxBuffer += text;
        let idx;
        while ((idx = this._rxBuffer.indexOf('\n')) >= 0) {
            let line = this._rxBuffer.slice(0, idx);
            this._rxBuffer = this._rxBuffer.slice(idx + 1);
            // Normalize CRLF to LF
            if (line.endsWith('\r')) {
                line = line.slice(0, -1);
            }
            this._pushLine(line);
            this._lastLine = line;
            this._runtime.emit('BLUETOOTH_DATA', {
                line: line,
                portName: this._connectedPeripheralName
            });
            // Fire the "cuando llegue una línea por Bluetooth" hat. It has
            // restartExistingThreads:false and no edge, so this is the ONLY way
            // the hat starts.
            this._runtime.startHats('bt_when_line');
        }
        // Guard against an infinite partial line.
        if (this._rxBuffer.length > MAX_PARTIAL_LINE) {
            this._rxBuffer = this._rxBuffer.slice(-1024);
        }
    }

    /**
     * Push a complete line into the queue, dropping the oldest if full.
     * @param {string} line - decoded line
     */
    _pushLine (line) {
        this._lineQueue.push(line);
        if (this._lineQueue.length > MAX_QUEUE) {
            this._lineQueue.shift();
        }
    }

    /**
     * Push a byte into the queue, dropping the oldest if full.
     * @param {number} byteValue - 0-255
     */
    _pushByte (byteValue) {
        this._byteQueue.push(byteValue);
        this._lastByte = byteValue;
        if (this._byteQueue.length > MAX_QUEUE) {
            this._byteQueue.shift();
        }
    }

    /**
     * Decode raw data into a UTF-8 string.
     * @param {Uint8Array|Array|string} data - raw data
     * @returns {string}
     */
    _decodeText (data) {
        if (typeof data === 'string') return data;
        try {
            const decoder = new TextDecoder('utf-8');
            if (data instanceof Uint8Array) {
                return decoder.decode(data);
            }
            return decoder.decode(new Uint8Array(data));
        } catch (e) {
            return Array.from(data)
                .map(b => String.fromCharCode(b))
                .join('');
        }
    }

    /**
     * Send raw bytes.
     * @param {Uint8Array|Array} bytes - bytes to write
     */
    async _writeBytes (bytes) {
        if (!this._serial || !this.isConnected()) {
            log.warn('[BluetoothPeripheral] Cannot send: not connected');
            return false;
        }
        try {
            await this._serial.write(bytes);
            return true;
        } catch (error) {
            log.error('[BluetoothPeripheral] Error sending data:', error);
            return false;
        }
    }

    /**
     * Send text without adding a newline.
     * @param {string} text - text to send
     */
    sendText (text) {
        if (text === null || typeof text === 'undefined') text = '';
        const encoder = new TextEncoder();
        return this._writeBytes(encoder.encode(String(text)));
    }

    /**
     * Send text followed by a newline.
     * @param {string} text - text to send
     */
    sendLine (text) {
        if (text === null || typeof text === 'undefined') text = '';
        return this.sendText(`${String(text)}\n`);
    }

    /**
     * Send a single byte (0-255).
     * @param {number} value - byte value
     */
    sendByte (value) {
        const n = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
        return this._writeBytes(new Uint8Array([n]));
    }

    // ═══════════════════════════════════════════════════════════════
    // Reading helpers (consume the queues)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @returns {boolean} whether at least one complete line is queued
     */
    lineAvailable () {
        return this._lineQueue.length > 0;
    }

    /**
     * @returns {boolean} whether at least one byte is queued
     */
    byteAvailable () {
        return this._byteQueue.length > 0;
    }

    /**
     * Read (and remove) the oldest complete line, or '' if none.
     * @returns {string}
     */
    readLine () {
        return this._lineQueue.length > 0 ? this._lineQueue.shift() : '';
    }

    /**
     * Read (and remove) the oldest byte, or -1 if none.
     * @returns {number}
     */
    readByte () {
        return this._byteQueue.length > 0 ? this._byteQueue.shift() : -1;
    }

    /**
     * @returns {string} most recent complete line (not removed)
     */
    lastLine () {
        return this._lastLine;
    }

    /**
     * @returns {number} most recent byte (not removed), or -1
     */
    lastByte () {
        return this._lastByte;
    }

    /**
     * Clear all received buffers.
     */
    clearRx () {
        this._lineQueue = [];
        this._byteQueue = [];
        this._rxBuffer = '';
        this._lastLine = '';
        this._lastByte = -1;
    }
}

module.exports = {
    BluetoothPeripheral,
    ConnectionState
};
