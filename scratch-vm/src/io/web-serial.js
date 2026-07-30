/**
 * Web Serial API wrapper for STBlock
 * Provides serial port communication for Arduino and other devices
 *
 * Supports both:
 * - Web Serial API (Chrome/Edge)
 * - Tauri native serial (desktop app)
 */

const log = require('../util/log');

/**
 * Check if running in Tauri environment
 * @returns {boolean}
 */
const isTauri = () => {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

/**
 * Check if Web Serial API is supported
 * @returns {boolean}
 */
const isWebSerialSupported = () => {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
};

/**
 * Check if any serial method is supported
 * @returns {boolean}
 */
const isSupported = () => {
    return isTauri() || isWebSerialSupported();
};

/**
 * Common USB vendor IDs for Arduino boards
 */
const ARDUINO_VENDOR_IDS = [
    0x2341, // Arduino LLC
    0x2A03, // Arduino SRL
    0x1A86, // CH340 (common clone chip)
    0x0403, // FTDI
    0x10C4, // Silicon Labs CP210x
    0x067B, // Prolific PL2303
    0x239A, // Adafruit
    0x303A, // Espressif (ESP32)
    0x1366  // SEGGER
];

/**
 * WebSerial class for managing serial port connections
 */
class WebSerial {
    constructor () {
        // Web Serial properties
        this._port = null;
        this._reader = null;
        this._writer = null;
        this._isConnected = false;
        this._readLoopRunning = false;

        // Tauri properties
        this._isTauriPort = false;
        this._portId = null;
        this._portName = null;
        this._tauriReadInterval = null;

        // Callbacks
        this._onData = null;
        this._onConnect = null;
        this._onDisconnect = null;
        this._onError = null;

        // Default options
        this._baudRate = 115200;
        this._dataBits = 8;
        this._stopBits = 1;
        this._parity = 'none';
        this._flowControl = 'none';

        // Bind event handlers
        this._handleDisconnect = this._handleDisconnect.bind(this);
    }

    /**
     * Check if Web Serial is supported
     * @returns {boolean}
     */
    static isSupported () {
        return isSupported();
    }

    /**
     * Check if running in Tauri
     * @returns {boolean}
     */
    static isTauri () {
        return isTauri();
    }

    /**
     * Get list of available ports
     * For Tauri: Returns all available ports with details
     * For Web Serial: Returns only previously authorized ports
     * @returns {Promise<Array>}
     */
    static async getPorts () {
        if (isTauri()) {
            try {
                const {invoke} = window.__TAURI__.core;
                return await invoke('list_serial_ports');
            } catch (error) {
                log.warn('Error getting serial ports from Tauri:', error);
                return [];
            }
        }

        if (!isWebSerialSupported()) return [];

        try {
            return await navigator.serial.getPorts();
        } catch (error) {
            log.warn('Error getting serial ports:', error);
            return [];
        }
    }

    /**
     * List all available serial ports (Tauri only)
     * @returns {Promise<Array>}
     */
    static async listAllPorts () {
        if (!isTauri()) {
            throw new Error('listAllPorts is only available in Tauri desktop app');
        }

        const {invoke} = window.__TAURI__.core;
        return await invoke('list_serial_ports');
    }

    /**
     * Request a port from the user
     * For Tauri: Returns list of all available ports (UI handles selection)
     * For Web Serial: Shows browser's port picker dialog
     * @param {Object} filters - USB filters (only for Web Serial)
     * @returns {Promise<SerialPort|Array|null>}
     */
    async requestPort (filters = null) {
        // Tauri mode: return all available ports for UI to handle
        if (isTauri()) {
            try {
                const {invoke} = window.__TAURI__.core;
                const ports = await invoke('list_serial_ports');

                if (ports.length === 0) {
                    return null;
                }

                // In Tauri, we return all ports as an array
                // The connection modal will display them and let user select
                return ports;
            } catch (error) {
                log.error('Error listing serial ports:', error);
                throw error;
            }
        }

        // Web Serial mode
        if (!isWebSerialSupported()) {
            throw new Error('Web Serial API not supported in this browser');
        }

        try {
            const options = filters ? {filters} : {
                filters: ARDUINO_VENDOR_IDS.map(vendorId => ({usbVendorId: vendorId}))
            };

            this._port = await navigator.serial.requestPort(options);
            return this._port;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                // User cancelled
                return null;
            }
            throw error;
        }
    }

    /**
     * Connect to a port by name (Tauri only)
     * @param {string} portName - Port name (e.g., "COM3")
     * @param {Object} options - Connection options
     * @returns {Promise<boolean>}
     */
    async connectByName (portName, options = {}) {
        if (!isTauri()) {
            throw new Error('connectByName is only available in Tauri desktop app');
        }

        const baudRate = options.baudRate || this._baudRate;

        try {
            const {invoke} = window.__TAURI__.core;
            this._portId = await invoke('open_serial_port', {
                portName: portName,
                baudRate: baudRate
            });

            this._portName = portName;
            this._isConnected = true;
            this._isTauriPort = true;

            // Start reading in Tauri mode
            this._startTauriReadLoop();

            if (this._onConnect) {
                this._onConnect();
            }

            log.info(`Serial port ${portName} connected at ${baudRate} baud (Tauri)`);
            return true;
        } catch (error) {
            log.error('Failed to connect to serial port:', error);
            if (this._onError) {
                this._onError(error);
            }
            return false;
        }
    }

    /**
     * Connect to the port
     * @param {Object} options - Connection options
     * @returns {Promise<boolean>}
     */
    async connect (options = {}) {
        if (!this._port) {
            throw new Error('No port selected. Call requestPort first.');
        }

        const baudRate = options.baudRate || this._baudRate;
        const dataBits = options.dataBits || this._dataBits;
        const stopBits = options.stopBits || this._stopBits;
        const parity = options.parity || this._parity;
        const flowControl = options.flowControl || this._flowControl;

        try {
            await this._port.open({
                baudRate,
                dataBits,
                stopBits,
                parity,
                flowControl
            });

            this._isConnected = true;

            // Add disconnect listener
            this._port.addEventListener('disconnect', this._handleDisconnect);

            // Start reading
            this._startReadLoop();

            if (this._onConnect) {
                this._onConnect();
            }

            log.info(`Serial port connected at ${baudRate} baud`);
            return true;
        } catch (error) {
            this._isConnected = false;
            log.error('Failed to connect to serial port:', error);

            if (this._onError) {
                this._onError(error);
            }

            return false;
        }
    }

    /**
     * Disconnect from the port
     */
    async disconnect () {
        this._readLoopRunning = false;

        // Tauri mode cleanup
        if (this._isTauriPort) {
            if (this._tauriReadInterval) {
                clearInterval(this._tauriReadInterval);
                this._tauriReadInterval = null;
            }

            if (this._portId && isTauri()) {
                try {
                    const {invoke} = window.__TAURI__.core;
                    await invoke('close_serial_port', {portId: this._portId});
                } catch (e) {
                    log.warn('Error closing Tauri serial port:', e);
                }
            }

            this._portId = null;
            this._portName = null;
            this._isTauriPort = false;
        } else {
            // Web Serial mode cleanup
            if (this._reader) {
                try {
                    await this._reader.cancel();
                } catch (e) {
                    // Ignore
                }
                this._reader = null;
            }

            if (this._writer) {
                try {
                    await this._writer.close();
                } catch (e) {
                    // Ignore
                }
                this._writer = null;
            }

            if (this._port) {
                this._port.removeEventListener('disconnect', this._handleDisconnect);

                try {
                    await this._port.close();
                } catch (e) {
                    // Ignore
                }
            }
        }

        this._isConnected = false;
        log.info('Serial port disconnected');

        if (this._onDisconnect) {
            this._onDisconnect();
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected () {
        return this._isConnected && this._port !== null;
    }

    /**
     * Get the underlying port object
     * @returns {SerialPort|null}
     */
    getPort () {
        return this._port;
    }

    /**
     * Write data to the port
     * @param {Uint8Array|Array} data - Data to write
     */
    async write (data) {
        if (!this._isConnected) {
            return;
        }

        // Tauri mode
        if (this._isTauriPort) {
            if (!this._portId) return;

            try {
                const {invoke} = window.__TAURI__.core;
                const bytes = data instanceof Uint8Array ? Array.from(data) : data;
                await invoke('write_serial_port', {
                    portId: this._portId,
                    data: bytes
                });
            } catch (error) {
                log.error('Tauri serial write error:', error);
                if (this._onError) {
                    this._onError(error);
                }
            }
            return;
        }

        // Web Serial mode
        if (!this._port || !this._port.writable) {
            return;
        }

        try {
            const writer = this._port.writable.getWriter();
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            await writer.write(bytes);
            writer.releaseLock();
        } catch (error) {
            log.error('Serial write error:', error);
            if (this._onError) {
                this._onError(error);
            }
        }
    }

    /**
     * Write a string to the port
     * @param {string} text - Text to write
     */
    async writeString (text) {
        const encoder = new TextEncoder();
        await this.write(encoder.encode(text));
    }

    /**
     * Write a line (with newline) to the port
     * @param {string} text - Text to write
     */
    async writeLine (text) {
        await this.writeString(text + '\n');
    }

    /**
     * Change the baud rate of the active port
     * @param {number} baudRate - New baud rate
     */
    async setBaudRate (baudRate) {
        this._baudRate = baudRate;
        if (this._isConnected) {
            log.info(`Changing baud rate to ${baudRate}...`);

            // Tauri mode
            if (this._isTauriPort) {
                if (!this._portId) return;
                try {
                    const {invoke} = window.__TAURI__.core;
                    await invoke('set_serial_baud_rate', {
                        portId: this._portId,
                        baudRate: baudRate
                    });
                } catch (error) {
                    log.error('Tauri serial change baud rate error:', error);
                }
                return;
            }

            // Web Serial mode (requires closing and reopening)
            if (this._port) {
                this._readLoopRunning = false;

                if (this._reader) {
                    try {
                        await this._reader.cancel();
                    } catch (e) {}
                }

                try {
                    await this._port.close();
                } catch (e) {}

                try {
                    await this._port.open({
                        baudRate,
                        dataBits: this._dataBits,
                        stopBits: this._stopBits,
                        parity: this._parity,
                        flowControl: this._flowControl
                    });
                    this._isConnected = true;
                    this._startReadLoop();
                } catch (error) {
                    log.error('Failed to reopen serial port on new baud rate:', error);
                    this._isConnected = false;
                    if (this._onError) this._onError(error);
                }
            }
        }
    }

    // Event handlers
    onData (callback) {
        if (!this._onDataListeners) {
            this._onDataListeners = [];
        }
        if (typeof callback === 'function' && !this._onDataListeners.includes(callback)) {
            this._onDataListeners.push(callback);
        }
        this._onData = callback;
    }
    onConnect (callback) { this._onConnect = callback; }
    onDisconnect (callback) { this._onDisconnect = callback; }
    onError (callback) { this._onError = callback; }

    // Private methods

    /**
     * Start Tauri read loop
     */
    _startTauriReadLoop () {
        if (this._tauriReadInterval) {
            clearInterval(this._tauriReadInterval);
        }

        this._tauriReadInterval = setInterval(async () => {
            if (!this._isConnected || !this._portId || !this._isTauriPort) {
                return;
            }

            try {
                const {invoke} = window.__TAURI__.core;

                // Check available bytes
                const available = await invoke('read_serial_port_available', {
                    portId: this._portId
                });

                if (available > 0) {
                    const data = await invoke('read_serial_port', {
                        portId: this._portId,
                        size: Math.min(available, 1024)
                    });

                    if (data && data.length > 0) {
                        const uint8Array = new Uint8Array(data);
                        if (this._onDataListeners) {
                            this._onDataListeners.forEach(cb => {
                                try { cb(uint8Array); } catch (e) { log.error('Tauri read listener error:', e); }
                            });
                        } else if (this._onData) {
                            this._onData(uint8Array);
                        }
                    }
                }
            } catch (error) {
                if (this._isConnected) {
                    log.error('Tauri serial read error:', error);
                    if (this._onError) {
                        this._onError(error);
                    }
                    // Disconnect on error
                    this.disconnect();
                }
            }
        }, 10); // Poll every 10ms
    }

    async _startReadLoop () {
        if (!this._port || !this._port.readable) return;

        this._readLoopRunning = true;

        while (this._readLoopRunning && this._port.readable) {
            try {
                this._reader = this._port.readable.getReader();

                while (this._readLoopRunning) {
                    const {value, done} = await this._reader.read();

                    if (done) {
                        break;
                    }

                    if (value) {
                        if (this._onDataListeners) {
                            this._onDataListeners.forEach(cb => {
                                try { cb(value); } catch (e) { log.error('Serial read listener error:', e); }
                            });
                        } else if (this._onData) {
                            this._onData(value);
                        }
                    }
                }
            } catch (error) {
                if (this._readLoopRunning) {
                    log.error('Serial read error:', error);
                    if (this._onError) {
                        this._onError(error);
                    }
                }
            } finally {
                if (this._reader) {
                    try {
                        this._reader.releaseLock();
                    } catch (e) {
                        // Ignore
                    }
                    this._reader = null;
                }
            }

            // Small delay before retry
            if (this._readLoopRunning) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    _handleDisconnect () {
        this._isConnected = false;
        this._readLoopRunning = false;

        log.info('Serial port physically disconnected');

        if (this._onDisconnect) {
            this._onDisconnect();
        }
    }
}

module.exports = WebSerial;
