const SET_RUNNING_STATE = 'scratch-gui/vm-status/SET_RUNNING_STATE';
const SET_TURBO_STATE = 'scratch-gui/vm-status/SET_TURBO_STATE';
const SET_STARTED_STATE = 'scratch-gui/vm-status/SET_STARTED_STATE';
const SET_DEBUG_ARMED = 'scratch-gui/vm-status/SET_DEBUG_ARMED';
const SET_DEBUG_ACTIVE = 'scratch-gui/vm-status/SET_DEBUG_ACTIVE';
const SET_DEBUG_SPEED = 'scratch-gui/vm-status/SET_DEBUG_SPEED';

const initialState = {
    running: false,
    started: false,
    turbo: false,
    debugArmed: false,
    debugActive: false,
    debugSpeed: 100 // ms: 100=Normal, 500=Slow, 1500=Very Slow
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_STARTED_STATE:
        return Object.assign({}, state, {
            started: action.started
        });
    case SET_RUNNING_STATE:
        return Object.assign({}, state, {
            running: action.running
        });
    case SET_TURBO_STATE:
        return Object.assign({}, state, {
            turbo: action.turbo
        });
    case SET_DEBUG_ARMED:
        return Object.assign({}, state, {
            debugArmed: action.armed
        });
    case SET_DEBUG_ACTIVE:
        return Object.assign({}, state, {
            debugActive: action.active
        });
    case SET_DEBUG_SPEED:
        return Object.assign({}, state, {
            debugSpeed: action.speed
        });
    default:
        return state;
    }
};

const setStartedState = function (started) {
    return {
        type: SET_STARTED_STATE,
        started: started
    };
};


const setRunningState = function (running) {
    return {
        type: SET_RUNNING_STATE,
        running: running
    };
};

const setTurboState = function (turbo) {
    return {
        type: SET_TURBO_STATE,
        turbo: turbo
    };
};

const setDebugArmed = function (armed) {
    return {
        type: SET_DEBUG_ARMED,
        armed: armed
    };
};

const setDebugActive = function (active) {
    return {
        type: SET_DEBUG_ACTIVE,
        active: active
    };
};

const setDebugSpeed = function (speed) {
    return {
        type: SET_DEBUG_SPEED,
        speed: speed
    };
};

export {
    reducer as default,
    initialState as vmStatusInitialState,
    setRunningState,
    setStartedState,
    setTurboState,
    setDebugArmed,
    setDebugActive,
    setDebugSpeed
};
