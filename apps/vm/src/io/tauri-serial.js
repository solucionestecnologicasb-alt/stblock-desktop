/**
 * Tauri Serial Port - Native serial port access for Tauri desktop app
 * Uses Tauri's invoke API to access native serial port functionality
 */

/**
 * Check if running in Tauri environment
 * @returns {boolean}
 */
const isTauri = () => {
    return typeof window !== 'undefined' &&
           window.__TAURI__ !== undefined;
};

/**
 * TauriSerial class - Provides serial port access in Tauri desktop app
 */
class TauriSerial {
    constructor () {
        this._portId = null;
        this._portName = null;
        this._isConnected = false;
        this._listeners = {};
        this._readInterval = null;
        this._buffer = [];
    }

    /**
     * Check if Tauri serial is available
     * @returns {boolean}
     */
    static isSupported () {
        return isTauri();
    }

    /**
     * List available serial ports
     * @returns {Promise<Array>} Array of port info objects
     */
    async listPorts () {
        if (!isTauri()) {
            throw new Error('Tauri not available');
        }

        const { invoke } = window.__TAURI__.core;
        const ports = await invoke('list_serial_ports');
        return ports;
    }

    /**
     * Request user to select a port (in Tauri we can show all ports)
     * @returns {Promise<Object|null>} Selected port info or null
     */
    async requestPort () {
        // In Tauri, we return all available ports for the UI to display
        const ports = await this.listPorts();
        if (ports.length === 0) {
            return null;
        }
        // Return the first port - the connection modal will handle selection
        return ports;
    }

    /**
     * Connect to a serial port
     * @param {string} portName - Port name (e.g., "COM3" or "/dev/ttyUSB0")
     * @param {Object} options - Connection options
     * @returns {Promise<boolean>}
     */
    async connect (portName, options = {}) {
        if (!isTauri()) {
            throw new Error('Tauri not available');
        }

        const baudRate = options.baudRate || 57600;

        try {
            const { invoke } = window.__TAURI__.core;
            this._portId = await invoke('open_serial_port', {
                portName: portName,
                baudRate: baudRate
            });

            this._portName = portName;
            this._isConnected = true;

            // Start reading data
            this._startReading();

            this.emit('connect');
            return true;

        } catch (error) {
            console.error('Tauri serial connect error:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Start continuous reading from serial port
     */
    _startReading () {
        if (this._readInterval) {
            clearInterval(this._readInterval);
        }

        this._readInterval = setInterval(async () => {
            if (!this._isConnected || !this._portId) return;

            try {
                const { invoke } = window.__TAURI__.core;

                // Check if data is available
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
                        this.emit('data', uint8Array);
                    }
                }
            } catch (error) {
                if (this._isConnected) {
                    console.error('Tauri serial read error:', error);
                    this.emit('error', error);
                    this.disconnect();
                }
            }
        }, 10); // Poll every 10ms
    }

    /**
     * Write data to serial port
     * @param {Uint8Array|Array} data - Data to write
     * @returns {Promise}
     */
    async write (data) {
        if (!this._isConnected || !this._portId) {
            throw new Error('Not connected');
        }

        const { invoke } = window.__TAURI__.core;
        const bytes = data instanceof Uint8Array ? Array.from(data) : data;

        await invoke('write_serial_port', {
            portId: this._portId,
            data: bytes
        });
    }

    /**
     * Set baud rate
     * @param {number} baudRate
     * @returns {Promise}
     */
    async setBaudRate (baudRate) {
        if (!this._isConnected || !this._portId) {
            throw new Error('Not connected');
        }

        const { invoke } = window.__TAURI__.core;
        await invoke('set_serial_baud_rate', {
            portId: this._portId,
            baudRate: baudRate
        });
    }

    /**
     * Set DTR signal
     * @param {boolean} level
     * @returns {Promise}
     */
    async setDTR (level) {
        if (!this._isConnected || !this._portId) {
            throw new Error('Not connected');
        }

        const { invoke } = window.__TAURI__.core;
        await invoke('set_serial_dtr', {
            portId: this._portId,
            level: level
        });
    }

    /**
     * Set RTS signal
     * @param {boolean} level
     * @returns {Promise}
     */
    async setRTS (level) {
        if (!this._isConnected || !this._portId) {
            throw new Error('Not connected');
        }

        const { invoke } = window.__TAURI__.core;
        await invoke('set_serial_rts', {
            portId: this._portId,
            level: level
        });
    }

    /**
     * Disconnect from serial port
     */
    async disconnect () {
        if (this._readInterval) {
            clearInterval(this._readInterval);
            this._readInterval = null;
        }

        if (this._portId && isTauri()) {
            try {
                const { invoke } = window.__TAURI__.core;
                await invoke('close_serial_port', {
                    portId: this._portId
                });
            } catch (error) {
                console.warn('Error closing port:', error);
            }
        }

        this._portId = null;
        this._portName = null;
        this._isConnected = false;

        this.emit('disconnect');
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected () {
        return this._isConnected;
    }

    /**
     * Get port name
     * @returns {string|null}
     */
    getPortName () {
        return this._portName;
    }

    /**
     * Get the underlying port object (for compatibility)
     * @returns {Object|null}
     */
    getPort () {
        return this._portId ? { id: this._portId, name: this._portName } : null;
    }

    // Event emitter methods
    on (event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }

    off (event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
    }

    emit (event, ...args) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(...args));
        }
    }

    /**
     * Handle disconnection from outside
     */
    onDisconnect (callback) {
        this.on('disconnect', callback);
    }
}

module.exports = TauriSerial;
