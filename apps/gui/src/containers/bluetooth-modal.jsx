import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import BluetoothModalComponent from '../components/bluetooth-modal/bluetooth-modal.jsx';
import {closeBluetoothModal} from '../reducers/modals';

import {
    bluetoothScanStart,
    bluetoothPortsUpdate,
    bluetoothConnecting,
    bluetoothConnected,
    bluetoothDisconnected,
    bluetoothError,
    setBluetoothConfig,
    toggleBluetoothShowAll,
    getBluetoothPorts,
    getBluetoothLoading,
    getBluetoothConnecting,
    getBluetoothConnected,
    getBluetoothPortName,
    getBluetoothBaudRate,
    getBluetoothShowAllPorts,
    getBluetoothError
} from '../reducers/bluetooth';

const STORAGE_KEY = 'stblock_bluetooth_config';

const readSavedConfig = function () {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (value && typeof value === 'object') {
            return {
                portName: typeof value.portName === 'string' ? value.portName : '',
                baudRate: typeof value.baudRate === 'number' ? value.baudRate : 9600
            };
        }
    } catch (e) {
        // ignore malformed storage
    }
    return null;
};

const writeSavedConfig = function (portName, baudRate) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            portName: portName || '',
            baudRate: typeof baudRate === 'number' ? baudRate : 9600
        }));
    } catch (e) {
        // ignore storage errors
    }
};

class BluetoothModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handlePortsUpdate',
            'handleConnecting',
            'handleConnected',
            'handleDisconnected',
            'handleError',
            'handleScan',
            'handleConnect',
            'handleDisconnect',
            'handleBaudChange',
            'handleToggleShowAll',
            'handleSelectPort',
            'handleRequestClose',
            'restoreConfig'
        ]);
        this.state = {
            selectedPort: ''
        };
    }

    componentDidMount () {
        const runtime = this.props.vm && this.props.vm.runtime;
        if (!runtime) return;
        runtime.on('BLUETOOTH_LIST_UPDATE', this.handlePortsUpdate);
        runtime.on('BLUETOOTH_CONNECTING', this.handleConnecting);
        runtime.on('BLUETOOTH_CONNECTED', this.handleConnected);
        runtime.on('BLUETOOTH_DISCONNECTED', this.handleDisconnected);
        runtime.on('BLUETOOTH_ERROR', this.handleError);

        // Reconcile Redux with the actual peripheral state (both directions)
        // BEFORE restoring the saved config, so the modal never shows a stale
        // "connected" screen after a disconnect that happened while it was closed.
        const peripheralConnected = typeof runtime.getPeripheralIsConnected === 'function' &&
            runtime.getPeripheralIsConnected('bluetooth');
        if (peripheralConnected) {
            const peripheral = runtime.peripheralExtensions && runtime.peripheralExtensions.bluetooth;
            const name = peripheral && peripheral.getConnectedName ? peripheral.getConnectedName() : '';
            const baud = peripheral && peripheral.getBaudRate ? peripheral.getBaudRate() : 9600;
            this.props.bluetoothConnected(name, baud);
        } else {
            this.props.bluetoothDisconnected();
        }

        this.restoreConfig();

        this.handleScan();
    }

    componentWillUnmount () {
        const runtime = this.props.vm && this.props.vm.runtime;
        if (!runtime) return;
        runtime.removeListener('BLUETOOTH_LIST_UPDATE', this.handlePortsUpdate);
        runtime.removeListener('BLUETOOTH_CONNECTING', this.handleConnecting);
        runtime.removeListener('BLUETOOTH_CONNECTED', this.handleConnected);
        runtime.removeListener('BLUETOOTH_DISCONNECTED', this.handleDisconnected);
        runtime.removeListener('BLUETOOTH_ERROR', this.handleError);
    }

    restoreConfig () {
        const saved = readSavedConfig();
        if (!saved) return;
        if (saved.portName) {
            this.props.setBluetoothConfig(saved.portName, saved.baudRate);
            this.setState({selectedPort: saved.portName});
        }
    }

    handlePortsUpdate (ports) {
        this.props.bluetoothPortsUpdate(ports || []);
        const saved = readSavedConfig();
        if (saved && saved.portName && !this.props.connected && !this.state.selectedPort) {
            const exists = (ports || []).some(p => p.id === saved.portName);
            if (exists) {
                this.setState({selectedPort: saved.portName});
            }
        }
    }

    handleConnecting (data) {
        this.props.bluetoothConnecting();
        if (data && data.portName) {
            this.setState({selectedPort: data.portName});
        }
    }

    handleConnected (data) {
        const portName = data && data.portName ? data.portName : '';
        const baudRate = data && typeof data.baudRate === 'number' ? data.baudRate : 9600;
        this.props.bluetoothConnected(portName, baudRate);
        writeSavedConfig(portName, baudRate);
        this.setState({selectedPort: portName});
    }

    handleDisconnected () {
        this.props.bluetoothDisconnected();
    }

    handleError (error) {
        const message = (error && error.message) ? error.message : String(error);
        this.props.bluetoothError(message);
    }

    handleScan () {
        this.props.bluetoothScanStart();
        if (this.props.vm && this.props.vm.scanForPeripheral) {
            this.props.vm.scanForPeripheral('bluetooth');
        }
    }

    handleConnect (portId, baudRate) {
        if (!portId) return;
        this.props.setBluetoothConfig(portId, baudRate);
        writeSavedConfig(portId, baudRate);
        this.props.bluetoothConnecting();
        this.setState({selectedPort: portId});
        if (this.props.vm && this.props.vm.connectPeripheral) {
            this.props.vm.connectPeripheral('bluetooth', portId, {baudRate: baudRate});
        }
    }

    handleDisconnect () {
        if (this.props.vm && this.props.vm.disconnectPeripheral) {
            this.props.vm.disconnectPeripheral('bluetooth');
        }
    }

    handleBaudChange (baudRate) {
        const currentPort = this.props.connected ? this.props.portName : this.state.selectedPort;
        this.props.setBluetoothConfig(currentPort || '', baudRate);
        writeSavedConfig(currentPort || '', baudRate);
    }

    handleToggleShowAll () {
        this.props.toggleBluetoothShowAll();
    }

    handleSelectPort (portId) {
        this.setState({selectedPort: portId});
        const saved = readSavedConfig();
        const baud = this.props.baudRate || (saved ? saved.baudRate : 9600);
        this.props.setBluetoothConfig(portId, baud);
    }

    handleRequestClose () {
        this.props.onRequestClose();
    }

    render () {
        const {
            baudRate,
            connected,
            connecting,
            error,
            loading,
            ports,
            portName,
            showAllPorts
        } = this.props;
        return (
            <BluetoothModalComponent
                baudRate={baudRate}
                connected={connected}
                connectedPortName={portName}
                connecting={connecting}
                error={error}
                loading={loading}
                onBaudChange={this.handleBaudChange}
                onConnect={this.handleConnect}
                onDisconnect={this.handleDisconnect}
                onRequestClose={this.handleRequestClose}
                onScan={this.handleScan}
                onSelectPort={this.handleSelectPort}
                onToggleShowAll={this.handleToggleShowAll}
                ports={ports}
                selectedPort={this.state.selectedPort || (connected ? portName : '')}
                showAllPorts={showAllPorts}
            />
        );
    }
}

BluetoothModal.propTypes = {
    baudRate: PropTypes.number,
    bluetoothConnected: PropTypes.func.isRequired,
    bluetoothConnecting: PropTypes.func.isRequired,
    bluetoothDisconnected: PropTypes.func.isRequired,
    bluetoothError: PropTypes.func.isRequired,
    bluetoothPortsUpdate: PropTypes.func.isRequired,
    bluetoothScanStart: PropTypes.func.isRequired,
    connected: PropTypes.bool,
    connecting: PropTypes.bool,
    error: PropTypes.string,
    loading: PropTypes.bool,
    onRequestClose: PropTypes.func.isRequired,
    portName: PropTypes.string,
    ports: PropTypes.arrayOf(PropTypes.object),
    setBluetoothConfig: PropTypes.func.isRequired,
    showAllPorts: PropTypes.bool,
    toggleBluetoothShowAll: PropTypes.func.isRequired,
    vm: PropTypes.shape({
        connectPeripheral: PropTypes.func,
        disconnectPeripheral: PropTypes.func,
        runtime: PropTypes.object.isRequired,
        scanForPeripheral: PropTypes.func
    }).isRequired
};

const mapStateToProps = state => ({
    ports: getBluetoothPorts(state),
    loading: getBluetoothLoading(state),
    connecting: getBluetoothConnecting(state),
    connected: getBluetoothConnected(state),
    portName: getBluetoothPortName(state),
    baudRate: getBluetoothBaudRate(state),
    showAllPorts: getBluetoothShowAllPorts(state),
    error: getBluetoothError(state)
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeBluetoothModal()),
    bluetoothScanStart: () => dispatch(bluetoothScanStart()),
    bluetoothPortsUpdate: ports => dispatch(bluetoothPortsUpdate(ports)),
    bluetoothConnecting: () => dispatch(bluetoothConnecting()),
    bluetoothConnected: (portName, baudRate) => dispatch(bluetoothConnected(portName, baudRate)),
    bluetoothDisconnected: () => dispatch(bluetoothDisconnected()),
    bluetoothError: error => dispatch(bluetoothError(error)),
    setBluetoothConfig: (portName, baudRate) => dispatch(setBluetoothConfig(portName, baudRate)),
    toggleBluetoothShowAll: () => dispatch(toggleBluetoothShowAll())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BluetoothModal);
