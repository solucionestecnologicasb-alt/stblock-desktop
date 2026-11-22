const BLUETOOTH_SCAN_START = 'scratch-gui/bluetooth/SCAN_START';
const BLUETOOTH_PORTS_UPDATE = 'scratch-gui/bluetooth/PORTS_UPDATE';
const BLUETOOTH_CONNECTING = 'scratch-gui/bluetooth/CONNECTING';
const BLUETOOTH_CONNECTED = 'scratch-gui/bluetooth/CONNECTED';
const BLUETOOTH_DISCONNECTED = 'scratch-gui/bluetooth/DISCONNECTED';
const BLUETOOTH_ERROR = 'scratch-gui/bluetooth/ERROR';
const BLUETOOTH_CLEAR_ERROR = 'scratch-gui/bluetooth/CLEAR_ERROR';
const BLUETOOTH_SET_CONFIG = 'scratch-gui/bluetooth/SET_CONFIG';
const BLUETOOTH_TOGGLE_SHOW_ALL = 'scratch-gui/bluetooth/TOGGLE_SHOW_ALL';

const initialState = {
    ports: [],
    loading: false,
    connecting: false,
    connected: false,
    portName: '',
    baudRate: 9600,
    showAllPorts: false,
    error: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case BLUETOOTH_SCAN_START:
        return Object.assign({}, state, {
            loading: true,
            error: null
        });
    case BLUETOOTH_PORTS_UPDATE:
        return Object.assign({}, state, {
            ports: action.ports || [],
            loading: false,
            error: null
        });
    case BLUETOOTH_CONNECTING:
        return Object.assign({}, state, {
            connecting: true,
            error: null
        });
    case BLUETOOTH_CONNECTED:
        return Object.assign({}, state, {
            connecting: false,
            connected: true,
            portName: action.portName || state.portName,
            baudRate: typeof action.baudRate === 'number' ? action.baudRate : state.baudRate,
            error: null
        });
    case BLUETOOTH_DISCONNECTED:
        return Object.assign({}, state, {
            connecting: false,
            connected: false,
            portName: '',
            error: null
        });
    case BLUETOOTH_ERROR:
        return Object.assign({}, state, {
            loading: false,
            connecting: false,
            error: action.error || 'Error de Bluetooth'
        });
    case BLUETOOTH_CLEAR_ERROR:
        return Object.assign({}, state, {
            error: null
        });
    case BLUETOOTH_SET_CONFIG:
        return Object.assign({}, state, {
            portName: typeof action.portName === 'string' ? action.portName : state.portName,
            baudRate: typeof action.baudRate === 'number' ? action.baudRate : state.baudRate
        });
    case BLUETOOTH_TOGGLE_SHOW_ALL:
        return Object.assign({}, state, {
            showAllPorts: !state.showAllPorts
        });
    default:
        return state;
    }
};

// Action creators
const bluetoothScanStart = function () {
    return {
        type: BLUETOOTH_SCAN_START
    };
};
const bluetoothPortsUpdate = function (ports) {
    return {
        type: BLUETOOTH_PORTS_UPDATE,
        ports: ports
    };
};
const bluetoothConnecting = function () {
    return {
        type: BLUETOOTH_CONNECTING
    };
};
const bluetoothConnected = function (portName, baudRate) {
    return {
        type: BLUETOOTH_CONNECTED,
        portName: portName,
        baudRate: baudRate
    };
};
const bluetoothDisconnected = function () {
    return {
        type: BLUETOOTH_DISCONNECTED
    };
};
const bluetoothError = function (error) {
    return {
        type: BLUETOOTH_ERROR,
        error: error
    };
};
const clearBluetoothError = function () {
    return {
        type: BLUETOOTH_CLEAR_ERROR
    };
};
const setBluetoothConfig = function (portName, baudRate) {
    return {
        type: BLUETOOTH_SET_CONFIG,
        portName: portName,
        baudRate: baudRate
    };
};
const toggleBluetoothShowAll = function () {
    return {
        type: BLUETOOTH_TOGGLE_SHOW_ALL
    };
};

// Selectors
const getBluetoothState = state => state.scratchGui.bluetooth;
const getBluetoothPorts = state => getBluetoothState(state).ports;
const getBluetoothLoading = state => getBluetoothState(state).loading;
const getBluetoothConnecting = state => getBluetoothState(state).connecting;
const getBluetoothConnected = state => getBluetoothState(state).connected;
const getBluetoothPortName = state => getBluetoothState(state).portName;
const getBluetoothBaudRate = state => getBluetoothState(state).baudRate;
const getBluetoothShowAllPorts = state => getBluetoothState(state).showAllPorts;
const getBluetoothError = state => getBluetoothState(state).error;

export {
    reducer as default,
    initialState as bluetoothInitialState,
    bluetoothScanStart,
    bluetoothPortsUpdate,
    bluetoothConnecting,
    bluetoothConnected,
    bluetoothDisconnected,
    bluetoothError,
    clearBluetoothError,
    setBluetoothConfig,
    toggleBluetoothShowAll,
    getBluetoothState,
    getBluetoothPorts,
    getBluetoothLoading,
    getBluetoothConnecting,
    getBluetoothConnected,
    getBluetoothPortName,
    getBluetoothBaudRate,
    getBluetoothShowAllPorts,
    getBluetoothError
};
