const SET_ID = 'scratch-gui/connection-modal/setId';
const SET_PERIPHERAL_NAME = 'scratch-gui/connection-modal/setPeripheralName';
const CLEAR_PERIPHERAL_NAME = 'scratch-gui/connection-modal/clearPeripheralName';

const initialState = {
    extensionId: null,
    peripheralName: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_ID:
        return Object.assign({}, state, {
            extensionId: action.extensionId
        });
    case SET_PERIPHERAL_NAME:
        return Object.assign({}, state, {
            peripheralName: action.peripheralName
        });
    case CLEAR_PERIPHERAL_NAME:
        return Object.assign({}, state, {
            peripheralName: null
        });
    default:
        return state;
    }
};

const setConnectionModalExtensionId = function (extensionId) {
    return {
        type: SET_ID,
        extensionId: extensionId
    };
};

const setConnectionModalPeripheralName = function (peripheralName) {
    return {
        type: SET_PERIPHERAL_NAME,
        peripheralName: peripheralName
    };
};

const clearConnectionModalPeripheralName = function () {
    return {
        type: CLEAR_PERIPHERAL_NAME
    };
};

export {
    reducer as default,
    initialState as connectionModalInitialState,
    setConnectionModalExtensionId,
    setConnectionModalPeripheralName,
    clearConnectionModalPeripheralName
};
