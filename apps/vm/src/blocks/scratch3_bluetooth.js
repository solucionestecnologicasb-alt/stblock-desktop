/**
 * Scratch 3.0 blocks for Bluetooth (SPP) communication from the desktop app.
 *
 * This is a CORE package (always present in the runtime) so that blocks, the
 * Python mirror API and the Bluetooth modal all share a single
 * `BluetoothPeripheral` instance registered as `runtime.peripheralExtensions.bluetooth`.
 *
 * It does NOT generate C++ for the board: the board just runs a sketch that
 * reads/writes its own UART (HC-05 wired to it).
 */

const Cast = require('../util/cast');
const log = require('../util/log');
const {BluetoothPeripheral} = require('../devices/common/bluetooth-peripheral');

class Scratch3BluetoothBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        // Create the shared peripheral (registers itself as 'bluetooth').
        this._peripheral = new BluetoothPeripheral(runtime);
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            bt_when_line: this.whenLine,
            bt_connect: this.connect,
            bt_disconnect: this.disconnect,
            bt_isConnected: this.isConnected,
            bt_send: this.send,
            bt_sendLine: this.sendLine,
            bt_sendByte: this.sendByte,
            bt_lineAvailable: this.lineAvailable,
            bt_byteAvailable: this.byteAvailable,
            bt_readLine: this.readLine,
            bt_readByte: this.readByte,
            bt_lastLine: this.lastLine,
            bt_lastByte: this.lastByte,
            bt_clearRx: this.clearRx
        };
    }

    /**
     * Retrieve the hat metadata.
     * @return {object.<string, object>} Mapping of hat opcode to metadata.
     */
    getHats () {
        return {
            // Not edge-activated: it can only be started when the peripheral
            // receives a line (BluetoothPeripheral calls runtime.startHats).
            bt_when_line: {
                restartExistingThreads: false
            }
        };
    }

    whenLine () {
        return true;
    }

    /**
     * The peripheral shared with the UI (Bluetooth modal) and Python mirror API.
     * @returns {BluetoothPeripheral} the shared Bluetooth peripheral instance.
     */
    getPeripheral () {
        return this._peripheral;
    }

    connect (args) {
        const port = Cast.toString(args.PUERTO);
        const baudRate = Cast.toNumber(args.BAUD);
        if (!port) return;
        this._peripheral.connect(port, {baudRate: baudRate}).catch(e => {
            log.warn('[Bluetooth] Error connecting:', e);
        });
    }

    disconnect () {
        this._peripheral.disconnect();
    }

    isConnected () {
        return this._peripheral.isConnected();
    }

    send (args) {
        if (!this._peripheral.isConnected()) return;
        this._peripheral.sendText(Cast.toString(args.TEXTO));
    }

    sendLine (args) {
        if (!this._peripheral.isConnected()) return;
        this._peripheral.sendLine(Cast.toString(args.TEXTO));
    }

    sendByte (args) {
        if (!this._peripheral.isConnected()) return;
        this._peripheral.sendByte(Cast.toNumber(args.NUMERO));
    }

    lineAvailable () {
        return this._peripheral.lineAvailable();
    }

    byteAvailable () {
        return this._peripheral.byteAvailable();
    }

    readLine () {
        return this._peripheral.readLine();
    }

    readByte () {
        return this._peripheral.readByte();
    }

    lastLine () {
        return this._peripheral.lastLine();
    }

    lastByte () {
        return this._peripheral.lastByte();
    }

    clearRx () {
        this._peripheral.clearRx();
    }
}

module.exports = Scratch3BluetoothBlocks;
