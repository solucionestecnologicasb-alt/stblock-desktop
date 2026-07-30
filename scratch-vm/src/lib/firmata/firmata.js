/**
 * Firmata Protocol Implementation for STBlock
 * Based on the Firmata protocol specification
 * @see https://github.com/firmata/protocol
 */

// Firmata Protocol Constants
const FIRMATA = {
    // Message Types
    DIGITAL_MESSAGE: 0x90,      // send/receive digital port value
    ANALOG_MESSAGE: 0xE0,       // send/receive analog pin value
    REPORT_ANALOG: 0xC0,        // enable/disable analog input reporting
    REPORT_DIGITAL: 0xD0,       // enable/disable digital input reporting
    SET_PIN_MODE: 0xF4,         // set pin mode
    SET_DIGITAL_PIN_VALUE: 0xF5, // set digital pin value
    REPORT_VERSION: 0xF9,       // report firmware version
    SYSTEM_RESET: 0xFF,         // reset firmware

    // Extended Commands (SysEx)
    START_SYSEX: 0xF0,          // start SysEx message
    END_SYSEX: 0xF7,            // end SysEx message

    // SysEx Commands
    SERVO_CONFIG: 0x70,         // configure servo
    STRING_DATA: 0x71,          // string message
    REPORT_FIRMWARE: 0x79,      // report firmware name and version
    SAMPLING_INTERVAL: 0x7A,    // set sampling interval
    ANALOG_MAPPING_QUERY: 0x69, // query analog pin mapping
    ANALOG_MAPPING_RESPONSE: 0x6A,
    CAPABILITY_QUERY: 0x6B,     // query pin capabilities
    CAPABILITY_RESPONSE: 0x6C,
    PIN_STATE_QUERY: 0x6D,      // query pin state
    PIN_STATE_RESPONSE: 0x6E,
    EXTENDED_ANALOG: 0x6F,      // extended analog write

    // Pin Modes
    PIN_MODE: {
        INPUT: 0x00,
        OUTPUT: 0x01,
        ANALOG: 0x02,
        PWM: 0x03,
        SERVO: 0x04,
        SHIFT: 0x05,
        I2C: 0x06,
        ONEWIRE: 0x07,
        STEPPER: 0x08,
        ENCODER: 0x09,
        SERIAL: 0x0A,
        PULLUP: 0x0B
    },

    // Pin Values
    LOW: 0,
    HIGH: 1
};

/**
 * Firmata class for Arduino communication
 */
class Firmata {
    constructor () {
        this._serialPort = null;
        this._isConnected = false;
        this._firmwareVersion = null;
        this._firmwareName = null;

        // Pin states
        this._digitalPins = new Array(20).fill(0);
        this._analogPins = new Array(16).fill(0);
        this._pinModes = new Array(20).fill(FIRMATA.PIN_MODE.INPUT);

        // Callbacks
        this._onDigitalChange = null;
        this._onAnalogChange = null;
        this._onConnect = null;
        this._onDisconnect = null;
        this._onError = null;

        // Message parsing
        this._buffer = [];
        this._sysexBuffer = [];
        this._inSysex = false;

        // Heartbeat
        this._heartbeatInterval = null;
        this._lastHeartbeat = 0;
    }

    /**
     * Connect to serial port
     * @param {Object} serialPort - WebSerial port object
     * @returns {Promise<boolean>}
     */
    async connect (serialPort) {
        this._serialPort = serialPort;

        try {
            // Start reading from serial port
            this._startReading();

            // Request firmware version periodically until we get a response to handle bootloader delay
            const versionRequestInterval = setInterval(async () => {
                if (this._firmwareVersion || this._isConnected) {
                    clearInterval(versionRequestInterval);
                    return;
                }
                try {
                    await this._sendMessage([FIRMATA.REPORT_VERSION]);
                } catch (e) {
                    // Ignore errors during bootloader phase
                }
            }, 500);

            // Wait for response
            try {
                await this._waitForFirmware(4000);
            } finally {
                clearInterval(versionRequestInterval);
            }

            this._isConnected = true;

            // Start heartbeat
            this._startHeartbeat();

            if (this._onConnect) {
                this._onConnect();
            }

            return true;
        } catch (error) {
            this._isConnected = false;
            if (this._onError) {
                this._onError(error);
            }
            return false;
        }
    }

    /**
     * Disconnect from serial port
     */
    disconnect () {
        this._stopHeartbeat();
        this._isConnected = false;
        this._serialPort = null;

        if (this._onDisconnect) {
            this._onDisconnect();
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected () {
        return this._isConnected;
    }

    /**
     * Set pin mode
     * @param {number} pin - Pin number
     * @param {number} mode - Pin mode (INPUT, OUTPUT, PWM, etc.)
     */
    async setPinMode (pin, mode) {
        if (!this._isConnected) return;

        this._pinModes[pin] = mode;
        await this._sendMessage([FIRMATA.SET_PIN_MODE, pin, mode]);
    }

    /**
     * Write digital value to pin
     * @param {number} pin - Pin number
     * @param {number} value - 0 (LOW) or 1 (HIGH)
     */
    async digitalWrite (pin, value) {
        if (!this._isConnected) return;

        this._digitalPins[pin] = value ? 1 : 0;
        await this._sendMessage([FIRMATA.SET_DIGITAL_PIN_VALUE, pin, value ? 1 : 0]);
    }

    /**
     * Read digital value from pin
     * @param {number} pin - Pin number
     * @returns {number} 0 or 1
     */
    digitalRead (pin) {
        return this._digitalPins[pin];
    }

    /**
     * Write analog (PWM) value to pin
     * @param {number} pin - Pin number
     * @param {number} value - 0-255
     */
    async analogWrite (pin, value) {
        if (!this._isConnected) return;

        value = Math.max(0, Math.min(255, Math.round(value)));

        if (pin < 16) {
            // Standard analog message
            await this._sendMessage([
                FIRMATA.ANALOG_MESSAGE | pin,
                value & 0x7F,
                (value >> 7) & 0x7F
            ]);
        } else {
            // Extended analog for pins >= 16
            await this._sendSysex(FIRMATA.EXTENDED_ANALOG, [
                pin,
                value & 0x7F,
                (value >> 7) & 0x7F
            ]);
        }
    }

    /**
     * Read analog value from pin
     * @param {number} pin - Analog pin number (0-15)
     * @returns {number} 0-1023
     */
    analogRead (pin) {
        return this._analogPins[pin];
    }

    /**
     * Enable analog reporting for a pin
     * @param {number} pin - Analog pin number
     * @param {boolean} enable - Enable or disable
     */
    async reportAnalog (pin, enable) {
        if (!this._isConnected) return;

        await this._sendMessage([
            FIRMATA.REPORT_ANALOG | pin,
            enable ? 1 : 0
        ]);
    }

    /**
     * Enable digital reporting for a port
     * @param {number} port - Port number (0-2 for pins 0-23)
     * @param {boolean} enable - Enable or disable
     */
    async reportDigital (port, enable) {
        if (!this._isConnected) return;

        await this._sendMessage([
            FIRMATA.REPORT_DIGITAL | port,
            enable ? 1 : 0
        ]);
    }

    /**
     * Configure servo on pin
     * @param {number} pin - Pin number
     * @param {number} minPulse - Minimum pulse width (default 544)
     * @param {number} maxPulse - Maximum pulse width (default 2400)
     */
    async servoConfig (pin, minPulse = 544, maxPulse = 2400) {
        if (!this._isConnected) return;

        await this._sendSysex(FIRMATA.SERVO_CONFIG, [
            pin,
            minPulse & 0x7F,
            (minPulse >> 7) & 0x7F,
            maxPulse & 0x7F,
            (maxPulse >> 7) & 0x7F
        ]);
    }

    /**
     * Write servo angle
     * @param {number} pin - Pin number
     * @param {number} angle - 0-180 degrees
     */
    async servoWrite (pin, angle) {
        angle = Math.max(0, Math.min(180, Math.round(angle)));
        await this.analogWrite(pin, angle);
    }

    /**
     * Set sampling interval for analog reads
     * @param {number} interval - Interval in milliseconds
     */
    async setSamplingInterval (interval) {
        if (!this._isConnected) return;

        await this._sendSysex(FIRMATA.SAMPLING_INTERVAL, [
            interval & 0x7F,
            (interval >> 7) & 0x7F
        ]);
    }

    /**
     * Send system reset
     */
    async reset () {
        if (!this._isConnected) return;

        await this._sendMessage([FIRMATA.SYSTEM_RESET]);
    }

    // Event handlers
    onDigitalChange (callback) { this._onDigitalChange = callback; }
    onAnalogChange (callback) { this._onAnalogChange = callback; }
    onConnect (callback) { this._onConnect = callback; }
    onDisconnect (callback) { this._onDisconnect = callback; }
    onError (callback) { this._onError = callback; }

    // Private methods

    async _sendMessage (data) {
        if (!this._serialPort) return;

        try {
            if (typeof this._serialPort.write === 'function') {
                await this._serialPort.write(data);
            } else {
                const writer = this._serialPort.writable.getWriter();
                await writer.write(new Uint8Array(data));
                writer.releaseLock();
            }
        } catch (error) {
            if (this._onError) {
                this._onError(error);
            }
        }
    }

    async _sendSysex (command, data) {
        const message = [FIRMATA.START_SYSEX, command, ...data, FIRMATA.END_SYSEX];
        await this._sendMessage(message);
    }

    async _startReading () {
        if (!this._serialPort) return;

        // If it's WebSerial, register data callback and return
        if (typeof this._serialPort.onData === 'function') {
            this._serialPort.onData(data => {
                this._processData(data);
            });
            return;
        }

        if (!this._serialPort.readable) return;

        const reader = this._serialPort.readable.getReader();

        try {
            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                this._processData(value);
            }
        } catch (error) {
            // Port closed or error
            this.disconnect();
        } finally {
            reader.releaseLock();
        }
    }

    _processData (data) {
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];

            if (this._inSysex) {
                if (byte === FIRMATA.END_SYSEX) {
                    this._processSysex(this._sysexBuffer);
                    this._sysexBuffer = [];
                    this._inSysex = false;
                } else {
                    this._sysexBuffer.push(byte);
                }
            } else if (byte === FIRMATA.START_SYSEX) {
                this._inSysex = true;
                this._sysexBuffer = [];
            } else if (byte >= 0x80) {
                // Command byte
                this._buffer = [byte];
            } else {
                // Data byte
                this._buffer.push(byte);
                this._processMessage(this._buffer);
            }
        }
    }

    _processMessage (buffer) {
        if (buffer.length < 2) return;

        let command = buffer[0];
        let channel = 0;
        if (command < 0xF0) {
            channel = command & 0x0F;
            command = command & 0xF0;
        }

        switch (command) {
        case FIRMATA.DIGITAL_MESSAGE:
            if (buffer.length >= 3) {
                const port = channel;
                const value = buffer[1] | (buffer[2] << 7);
                this._updateDigitalPort(port, value);
                this._buffer = [];
            }
            break;

        case FIRMATA.ANALOG_MESSAGE:
            if (buffer.length >= 3) {
                const pin = channel;
                const value = buffer[1] | (buffer[2] << 7);
                this._analogPins[pin] = value;
                if (this._onAnalogChange) {
                    this._onAnalogChange(pin, value);
                }
                this._buffer = [];
            }
            break;

        case FIRMATA.REPORT_VERSION:
            if (buffer.length >= 3) {
                this._firmwareVersion = `${buffer[1]}.${buffer[2]}`;
                this._buffer = [];
            }
            break;
        }
    }

    _processSysex (buffer) {
        if (buffer.length < 1) return;

        const command = buffer[0];
        const data = buffer.slice(1);

        switch (command) {
        case FIRMATA.REPORT_FIRMWARE:
            if (data.length >= 2) {
                this._firmwareVersion = `${data[0]}.${data[1]}`;
                // Decode firmware name (7-bit encoded)
                const nameBytes = [];
                for (let i = 2; i < data.length; i += 2) {
                    nameBytes.push(data[i] | (data[i + 1] << 7));
                }
                this._firmwareName = String.fromCharCode(...nameBytes);
            }
            break;

        case FIRMATA.STRING_DATA:
            // Decode string message
            const chars = [];
            for (let i = 0; i < data.length; i += 2) {
                chars.push(data[i] | (data[i + 1] << 7));
            }
            const message = String.fromCharCode(...chars);
            // Could emit string event here
            break;
        }
    }

    _updateDigitalPort (port, value) {
        const basePin = port * 8;
        for (let i = 0; i < 8; i++) {
            const pin = basePin + i;
            const pinValue = (value >> i) & 0x01;
            if (this._digitalPins[pin] !== pinValue) {
                this._digitalPins[pin] = pinValue;
                if (this._onDigitalChange) {
                    this._onDigitalChange(pin, pinValue);
                }
            }
        }
    }

    _waitForFirmware (timeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (this._firmwareVersion) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for firmware response'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    _startHeartbeat () {
        this._heartbeatInterval = setInterval(() => {
            if (this._isConnected) {
                this._sendMessage([FIRMATA.REPORT_VERSION]);
                this._lastHeartbeat = Date.now();
            }
        }, 5000);
    }

    _stopHeartbeat () {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }
}

// Export
module.exports = {
    Firmata,
    FIRMATA
};
