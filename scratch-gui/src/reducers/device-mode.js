/**
 * Device Mode Reducer
 * Manages the state for device/game mode switching and device selection
 */

import deviceData from '../lib/libraries/devices/devices.jsx';
import {getDeviceProfile} from '../lib/device-profiles';

const SET_DEVICE_MODE = 'scratch-gui/device-mode/SET_DEVICE_MODE';
const SET_SELECTED_DEVICE = 'scratch-gui/device-mode/SET_SELECTED_DEVICE';
const SET_DEVICE_CONNECTED = 'scratch-gui/device-mode/SET_DEVICE_CONNECTED';
const SET_CONNECTION_STATE = 'scratch-gui/device-mode/SET_CONNECTION_STATE';
const SET_DEVICE_PORT = 'scratch-gui/device-mode/SET_DEVICE_PORT';
const SET_PROGRAM_MODE = 'scratch-gui/device-mode/SET_PROGRAM_MODE';
const OPEN_DEVICE_MODAL = 'scratch-gui/device-mode/OPEN_DEVICE_MODAL';
const CLOSE_DEVICE_MODAL = 'scratch-gui/device-mode/CLOSE_DEVICE_MODAL';
const SET_CODE_VIEW_CONTENT = 'scratch-gui/device-mode/SET_CODE_VIEW_CONTENT';
const SET_CODE_LOCKED = 'scratch-gui/device-mode/SET_CODE_LOCKED';
const SET_MANUAL_CODE = 'scratch-gui/device-mode/SET_MANUAL_CODE';
const APPEND_TERMINAL_OUTPUT = 'scratch-gui/device-mode/APPEND_TERMINAL_OUTPUT';
const CLEAR_TERMINAL = 'scratch-gui/device-mode/CLEAR_TERMINAL';
const SET_TERMINAL_SETTINGS = 'scratch-gui/device-mode/SET_TERMINAL_SETTINGS';
const SAVE_DEVICE_PROJECT = 'scratch-gui/device-mode/SAVE_DEVICE_PROJECT';
const OPEN_DEVICE_CHANGE_CONFIRM = 'scratch-gui/device-mode/OPEN_DEVICE_CHANGE_CONFIRM';
const CLOSE_DEVICE_CHANGE_CONFIRM = 'scratch-gui/device-mode/CLOSE_DEVICE_CHANGE_CONFIRM';
const SET_UPLOAD_STATE = 'scratch-gui/device-mode/SET_UPLOAD_STATE';
const ADD_UPLOAD_LOG = 'scratch-gui/device-mode/ADD_UPLOAD_LOG';
const CLEAR_UPLOAD_LOGS = 'scratch-gui/device-mode/CLEAR_UPLOAD_LOGS';
const RESTORE_DEVICE_STATE = 'scratch-gui/device-mode/RESTORE_DEVICE_STATE';
const SET_CIRCUIT_DATA = 'scratch-gui/device-mode/SET_CIRCUIT_DATA';
const CLEAR_CIRCUIT_DATA = 'scratch-gui/device-mode/CLEAR_CIRCUIT_DATA';

// Use the same device data as the device library
const DEVICES = deviceData;

// Connection states
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

const initialState = {
    mode: 'game', // 'game' | 'device'
    selectedDevice: null,
    programMode: null,
    isConnected: false,
    connectionState: ConnectionState.DISCONNECTED,
    selectedPort: null,
    isDeviceModalOpen: false,
    codeViewContent: '// Código generado aparecerá aquí\n\nvoid setup() {\n  // Inicialización\n}\n\nvoid loop() {\n  // Código principal\n}',
    isCodeLocked: true, // true = code generated from blocks, false = manual editing
    manualCode: '', // User's manually edited code (used when unlocked)
    terminalOutput: [],
    terminalSettings: {
        baudRate: 9600,
        isHexMode: false,
        isPaused: false,
        eol: 'lf', // 'none' | 'lf' | 'cr' | 'crlf'
        autoScroll: true
    },
    terminalBufferSize: 0, // Track buffer size in bytes for 32KB limit
    availableDevices: DEVICES,
    // Store projects per device - each device has its own workspace
    deviceProjects: {}, // { deviceId: { projectData: JSON, hasBlocks: boolean } }
    // Device change confirmation modal
    deviceChangeConfirmOpen: false,
    pendingDevice: null, // Device waiting to be selected after confirmation
    // Upload state
    uploadState: {
        isVisible: false,
        state: 'idle', // 'idle' | 'preparing' | 'compiling' | 'uploading' | 'success' | 'error'
        progress: 0,
        message: '',
        logs: []
    },
    circuitData: null
};

const reducer = function (state = initialState, action) {
    switch (action.type) {
    case SET_DEVICE_MODE:
        return {
            ...state,
            mode: action.mode
        };
    case SET_SELECTED_DEVICE: {
        const selectedDevice = getDeviceProfile(action.device);
        return {
            ...state,
            selectedDevice,
            programMode: selectedDevice ? selectedDevice.defaultProgramMode : null,
            isConnected: false,
            selectedPort: null
        };
    }
    case SET_DEVICE_CONNECTED:
        return {
            ...state,
            isConnected: action.isConnected,
            connectionState: action.isConnected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED
        };
    case SET_CONNECTION_STATE:
        return {
            ...state,
            connectionState: action.connectionState,
            isConnected: action.connectionState === ConnectionState.CONNECTED
        };
    case SET_DEVICE_PORT:
        return {
            ...state,
            selectedPort: action.port
        };
    case SET_PROGRAM_MODE:
        if (!state.selectedDevice || !state.selectedDevice.programMode.includes(action.programMode)) {
            return state;
        }
        return {
            ...state,
            programMode: action.programMode,
            isConnected: false,
            selectedPort: null
        };
    case OPEN_DEVICE_MODAL:
        return {
            ...state,
            isDeviceModalOpen: true
        };
    case CLOSE_DEVICE_MODAL:
        return {
            ...state,
            isDeviceModalOpen: false
        };
    case SET_CODE_VIEW_CONTENT:
        return {
            ...state,
            codeViewContent: action.content,
            // Update manual code if locked (syncs with block-generated code)
            manualCode: state.isCodeLocked ? action.content : state.manualCode
        };
    case SET_CODE_LOCKED:
        return {
            ...state,
            isCodeLocked: action.isLocked,
            // When locking, sync manual code with current block-generated code
            manualCode: action.isLocked ? state.codeViewContent : state.manualCode
        };
    case SET_MANUAL_CODE:
        return {
            ...state,
            manualCode: action.code
        };
    case APPEND_TERMINAL_OUTPUT: {
        // Skip if paused
        if (state.terminalSettings.isPaused) {
            return state;
        }

        // Calculate new entry size (approximate bytes)
        const newEntrySize = action.output.text ? action.output.text.length : 0;
        const newBufferSize = state.terminalBufferSize + newEntrySize;

        // Enforce 32KB buffer limit
        const maxBufferSize = 32 * 1024; // 32KB
        let newOutput = [...state.terminalOutput, action.output];
        let adjustedBufferSize = newBufferSize;

        // Remove old entries if buffer exceeds limit
        while (adjustedBufferSize > maxBufferSize && newOutput.length > 1) {
            const removedEntry = newOutput.shift();
            adjustedBufferSize -= (removedEntry.text ? removedEntry.text.length : 0);
        }

        // Also keep max 500 lines as a secondary limit
        if (newOutput.length > 500) {
            newOutput = newOutput.slice(-500);
        }

        return {
            ...state,
            terminalOutput: newOutput,
            terminalBufferSize: Math.max(0, adjustedBufferSize)
        };
    }
    case CLEAR_TERMINAL:
        return {
            ...state,
            terminalOutput: [],
            terminalBufferSize: 0
        };
    case SET_TERMINAL_SETTINGS:
        return {
            ...state,
            terminalSettings: {
                ...state.terminalSettings,
                ...action.settings
            }
        };
    case SAVE_DEVICE_PROJECT: {
        const deviceId = action.deviceId;
        if (!deviceId) return state;
        return {
            ...state,
            deviceProjects: {
                ...state.deviceProjects,
                [deviceId]: {
                    projectData: action.projectData,
                    hasBlocks: action.hasBlocks || false
                }
            }
        };
    }
    case OPEN_DEVICE_CHANGE_CONFIRM:
        return {
            ...state,
            deviceChangeConfirmOpen: true,
            pendingDevice: action.device
        };
    case CLOSE_DEVICE_CHANGE_CONFIRM:
        return {
            ...state,
            deviceChangeConfirmOpen: false,
            pendingDevice: null
        };
    case SET_UPLOAD_STATE:
        return {
            ...state,
            uploadState: {
                ...state.uploadState,
                ...action.uploadState
            }
        };
    case ADD_UPLOAD_LOG:
        return {
            ...state,
            uploadState: {
                ...state.uploadState,
                logs: [...state.uploadState.logs, action.log].slice(-200) // Keep last 200 logs
            }
        };
    case CLEAR_UPLOAD_LOGS:
        return {
            ...state,
            uploadState: {
                ...state.uploadState,
                logs: []
            }
        };
    case RESTORE_DEVICE_STATE: {
        const deviceState = action.deviceState;
        if (!deviceState) return state;
        return {
            ...state,
            selectedDevice: deviceState.selectedDevice !== undefined ? deviceState.selectedDevice : state.selectedDevice,
            programMode: deviceState.programMode !== undefined ? deviceState.programMode : state.programMode,
            selectedPort: deviceState.selectedPort !== undefined ? deviceState.selectedPort : state.selectedPort,
            codeViewContent: deviceState.codeViewContent !== undefined ? deviceState.codeViewContent : state.codeViewContent,
            isCodeLocked: deviceState.isCodeLocked !== undefined ? deviceState.isCodeLocked : state.isCodeLocked,
            manualCode: deviceState.manualCode !== undefined ? deviceState.manualCode : state.manualCode,
            terminalSettings: deviceState.terminalSettings !== undefined ?
                {...state.terminalSettings, ...deviceState.terminalSettings} : state.terminalSettings,
            terminalOutput: deviceState.terminalOutput !== undefined ? deviceState.terminalOutput : state.terminalOutput,
            deviceProjects: deviceState.deviceProjects !== undefined ?
                {...state.deviceProjects, ...deviceState.deviceProjects} : state.deviceProjects
        };
    }
    case SET_CIRCUIT_DATA:
        return {
            ...state,
            circuitData: action.data
        };
    case CLEAR_CIRCUIT_DATA:
        return {
            ...state,
            circuitData: null
        };
    default:
        return state;
    }
};

// Action creators
const setDeviceMode = mode => ({
    type: SET_DEVICE_MODE,
    mode
});

const setSelectedDevice = device => ({
    type: SET_SELECTED_DEVICE,
    device
});

const setDeviceConnected = isConnected => ({
    type: SET_DEVICE_CONNECTED,
    isConnected
});

const setConnectionState = connectionState => ({
    type: SET_CONNECTION_STATE,
    connectionState
});

const setDevicePort = port => ({
    type: SET_DEVICE_PORT,
    port
});

const setProgramMode = programMode => ({
    type: SET_PROGRAM_MODE,
    programMode
});

const openDeviceModal = () => ({
    type: OPEN_DEVICE_MODAL
});

const closeDeviceModal = () => ({
    type: CLOSE_DEVICE_MODAL
});

const setCodeViewContent = content => ({
    type: SET_CODE_VIEW_CONTENT,
    content
});

const setCodeLocked = isLocked => ({
    type: SET_CODE_LOCKED,
    isLocked
});

const setManualCode = code => ({
    type: SET_MANUAL_CODE,
    code
});

const appendTerminalOutput = output => ({
    type: APPEND_TERMINAL_OUTPUT,
    output
});

const clearTerminal = () => ({
    type: CLEAR_TERMINAL
});

const setTerminalSettings = settings => ({
    type: SET_TERMINAL_SETTINGS,
    settings
});

const saveDeviceProject = (deviceId, projectData, hasBlocks = false) => ({
    type: SAVE_DEVICE_PROJECT,
    deviceId,
    projectData,
    hasBlocks
});

const openDeviceChangeConfirm = device => ({
    type: OPEN_DEVICE_CHANGE_CONFIRM,
    device
});

const closeDeviceChangeConfirm = () => ({
    type: CLOSE_DEVICE_CHANGE_CONFIRM
});

const setUploadState = uploadState => ({
    type: SET_UPLOAD_STATE,
    uploadState
});

const addUploadLog = log => ({
    type: ADD_UPLOAD_LOG,
    log
});

const clearUploadLogs = () => ({
    type: CLEAR_UPLOAD_LOGS
});

const restoreDeviceState = deviceState => ({
    type: RESTORE_DEVICE_STATE,
    deviceState
});

const setCircuitData = data => ({
    type: SET_CIRCUIT_DATA,
    data
});

const clearCircuitData = () => ({
    type: CLEAR_CIRCUIT_DATA
});

const startUpload = () => ({
    type: SET_UPLOAD_STATE,
    uploadState: {
        isVisible: true,
        state: 'preparing',
        progress: 0,
        message: 'Preparando compilación...',
        logs: []
    }
});

const closeUploadModal = () => ({
    type: SET_UPLOAD_STATE,
    uploadState: {
        isVisible: false,
        state: 'idle',
        progress: 0,
        message: '',
        logs: []
    }
});

// Selectors
const getDeviceMode = state => state.scratchGui.deviceMode.mode;
const getSelectedDevice = state => state.scratchGui.deviceMode.selectedDevice;
const isDeviceConnected = state => state.scratchGui.deviceMode.isConnected;
const getConnectionState = state => state.scratchGui.deviceMode.connectionState;
const getSelectedPort = state => state.scratchGui.deviceMode.selectedPort;
const getProgramMode = state => state.scratchGui.deviceMode.programMode;
const isDeviceModalOpen = state => state.scratchGui.deviceMode.isDeviceModalOpen;
const getCodeViewContent = state => state.scratchGui.deviceMode.codeViewContent;
const isCodeLocked = state => state.scratchGui.deviceMode.isCodeLocked;
const getManualCode = state => state.scratchGui.deviceMode.manualCode;
const getTerminalOutput = state => state.scratchGui.deviceMode.terminalOutput;
const getTerminalSettings = state => state.scratchGui.deviceMode.terminalSettings;
const getAvailableDevices = state => state.scratchGui.deviceMode.availableDevices;
const getDeviceProjects = state => state.scratchGui.deviceMode.deviceProjects;
const getDeviceProject = (state, deviceId) => state.scratchGui.deviceMode.deviceProjects[deviceId] || null;
const isDeviceChangeConfirmOpen = state => state.scratchGui.deviceMode.deviceChangeConfirmOpen;
const getPendingDevice = state => state.scratchGui.deviceMode.pendingDevice;
const getUploadState = state => state.scratchGui.deviceMode.uploadState;
const getCircuitData = state => state.scratchGui.deviceMode.circuitData;

// Selector for extracting serializable device state for persistence
const getDevicePersistState = state => {
    const deviceState = state.scratchGui.deviceMode;
    return {
        selectedDevice: deviceState.selectedDevice,
        programMode: deviceState.programMode,
        selectedPort: deviceState.selectedPort,
        codeViewContent: deviceState.codeViewContent,
        isCodeLocked: deviceState.isCodeLocked,
        manualCode: deviceState.manualCode,
        terminalSettings: deviceState.terminalSettings,
        terminalOutput: deviceState.terminalOutput,
        deviceProjects: deviceState.deviceProjects
    };
};

export {
    reducer as default,
    initialState as deviceModeInitialState,
    ConnectionState,
    setDeviceMode,
    setSelectedDevice,
    setDeviceConnected,
    setConnectionState,
    setDevicePort,
    setProgramMode,
    openDeviceModal,
    closeDeviceModal,
    setCodeViewContent,
    setCodeLocked,
    setManualCode,
    appendTerminalOutput,
    clearTerminal,
    setTerminalSettings,
    saveDeviceProject,
    openDeviceChangeConfirm,
    closeDeviceChangeConfirm,
    setUploadState,
    addUploadLog,
    clearUploadLogs,
    startUpload,
    closeUploadModal,
    getDeviceMode,
    getSelectedDevice,
    isDeviceConnected,
    getConnectionState,
    getSelectedPort,
    getProgramMode,
    isDeviceModalOpen,
    getCodeViewContent,
    isCodeLocked,
    getManualCode,
    getTerminalOutput,
    getTerminalSettings,
    getAvailableDevices,
    getDeviceProjects,
    getDeviceProject,
    isDeviceChangeConfirmOpen,
    getPendingDevice,
    getUploadState,
    getCircuitData,
    getDevicePersistState,
    restoreDeviceState,
    setCircuitData,
    clearCircuitData,
    DEVICES
};
