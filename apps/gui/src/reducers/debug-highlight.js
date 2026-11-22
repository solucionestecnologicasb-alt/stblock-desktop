const SET_DEBUG_LINE = 'scratch-gui/debug-highlight/SET_DEBUG_LINE';
const CLEAR_DEBUG_LINE = 'scratch-gui/debug-highlight/CLEAR_DEBUG_LINE';

const initialState = {
    highlightLine: null,     // número de línea (1-based) a resaltar en el panel Python
    highlightBlockId: null,  // blockId del bloque resaltado
    highlightTargetId: null  // target/sprite ID
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_DEBUG_LINE:
        return Object.assign({}, state, {
            highlightLine: action.data.pythonLine || null,
            highlightBlockId: action.data.blockId || null,
            highlightTargetId: action.data.targetId || null
        });
    case CLEAR_DEBUG_LINE:
        return Object.assign({}, state, initialState);
    default:
        return state;
    }
};

const setDebugLine = function (data) {
    return {
        type: SET_DEBUG_LINE,
        data: data
    };
};

const clearDebugLine = function () {
    return {
        type: CLEAR_DEBUG_LINE
    };
};

export {
    reducer as default,
    initialState as debugHighlightInitialState,
    setDebugLine,
    clearDebugLine
};
