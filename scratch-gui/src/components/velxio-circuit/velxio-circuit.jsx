/**
 * VelxioCircuit — Pestaña Circuitos con Velxio embebido via iframe
 *
 * Props:
 *   - code: Código Arduino generado por bloques
 *   - deviceId: ID del dispositivo activo (ej: 'arduinoUno')
 *
 * Exposes via forwardRef:
 *   - saveCircuitState(): Lee estado del iframe y retorna {boards, activeBoardId, components, wires, fileGroups}
 *   - loadCircuitState(state): Restaura estado en el iframe
 */
import React, {useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle} from 'react';
import PropTypes from 'prop-types';
import styles from './velxio-circuit.css';

const VELXIO_URL = 'static/velxio/index.html#/editor';

// Mapeo deviceId STBlock → boardId Velxio
const BOARD_COMPAT_MAP = {
    arduinoUno: 'arduino-uno',
    stBoardExtension: 'arduino-uno',
    arduinoNano: 'arduino-nano',
    arduinoLeonardo: 'arduino-uno',
    arduinoMega2560: 'arduino-mega',
    arduinoMega: 'arduino-mega',
    stbBoardV2: 'arduino-mega',
    arduinoUnoR4Minima: 'arduino-uno',
    arduinoUnoR4Wifi: 'arduino-uno',
    esp32: 'esp32',
    esp32s3: 'esp32-s3',
    arduinoEsp32: 'esp32',
    arduinoEsp32S3: 'esp32-s3',
    arduinoEsp8266NodeMCU: 'arduino-uno',
    arduinoK210MaixDock: 'arduino-uno',
    arduinoK210Maixduino: 'arduino-uno',
    raspberryPiPico: 'raspberry-pi-pico',
    arduinoRaspberryPiPico: 'raspberry-pi-pico',
    arduinoRaspberryPiPicoW: 'pi-pico-w',
    arduinoRaspberryPiPico2: 'raspberry-pi-pico',
    arduinoRaspberryPiPico2W: 'pi-pico-w'
};

const getCompatBoard = deviceId => BOARD_COMPAT_MAP[deviceId] || 'arduino-uno';

// CSS custom para que Velxio se vea con fondo blanco y estilo limpio
const CUSTOM_CSS = `
/* Fondo blanco global */
body, #root, .editor-page, .simulator-page {
    background: #ffffff !important;
}

/* Canvas/board workspace */
.simulator-canvas, .canvas-container, [class*="simulatorCanvas"],
[class*="canvasArea"], [class*="workspace"] {
    background: #ffffff !important;
}

/* Breadboard / board area */
.board-container, [class*="boardContainer"], [class*="boardArea"] {
    background: #ffffff !important;
}

/* Panel de herramientas */
.toolbar, [class*="toolbar"], [class*="Toolbar"] {
    background: #f8fafc !important;
    border-bottom: 1px solid #e2e8f0 !important;
}

/* Paleta de componentes */
.component-palette, [class*="palette"], [class*="Palette"],
[class*="componentList"], [class*="ComponentList"] {
    background: #ffffff !important;
    border-right: 1px solid #e2e8f0 !important;
}

/* Botones y controles */
button, select, [class*="button"], [class*="Button"] {
    border-radius: 6px !important;
}

/* Texto */
body, [class*="label"], [class*="text"], [class*="Text"] {
    color: #1e293b !important;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px !important;
    height: 8px !important;
}
::-webkit-scrollbar-track {
    background: #f1f5f9 !important;
}
::-webkit-scrollbar-thumb {
    background: #cbd5e1 !important;
    border-radius: 4px !important;
}

/* Canvas workspace — fondo blanco */
.canvas-content {
    background-color: #f9f9ff !important;
}

/* Iconos de UI en negro (solo paneles, no afecta wires del canvas) */
[class*="panel"] svg path, [class*="Panel"] svg path,
[class*="sidebar"] svg path, [class*="Sidebar"] svg path,
[class*="toolbar"] svg path, [class*="Toolbar"] svg path,
[class*="console"] svg path, [class*="Console"] svg path,
[class*="header"] svg path, [class*="Header"] svg path {
    stroke: #000000 !important;
}

/* Hide ONLY the top app navbar/logo area, NOT the component toolbar */
[class*="AppHeader"], [class*="appHeader"], [class*="topHeader"],
nav > a, header > a, [class*="logo"], [class*="Logo"],
[class*="authSection"], [class*="userMenu"],
[class*="loginBtn"], [class*="signupBtn"] {
    display: none !important;
}

/* Pin overlays mas pequenos (inline styles no se pueden override con width/height fijo) */
[data-pin-overlay="true"] {
    transform: scale(0.55) !important;
    transform-origin: center !important;
}

/* Ocultar consola/terminal serial propia de Velxio: STBlock usa su terminal nativa */
.canvas-serial-btn,
button.canvas-serial-btn,
[class*="SerialMonitor"], [class*="serialMonitor"],
[class*="SerialConsole"], [class*="serialConsole"],
[class*="SerialTerminal"], [class*="serialTerminal"],
[class*="terminalPanel"], [class*="TerminalPanel"],
[class*="terminalHeader"], [class*="TerminalHeader"],
[class*="consolePanel"], [class*="ConsolePanel"],
[class*="serial-panel"], [class*="terminal-panel"], [class*="console-panel"],
[id*="serial" i], [id*="terminal" i], [id*="console" i] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
}

/* Si Velxio usa un pre dedicado al monitor serial, ocultarlo sin tocar overlays de debug externos */
pre[class*="serial" i], pre[class*="terminal" i], pre[class*="console" i],
textarea[class*="serial" i], textarea[class*="terminal" i], textarea[class*="console" i] {
    display: none !important;
}

/* Nivel de zoom en negro */
.zoom-level {
    color: #000000 !important;
}

/* Botones de zoom (+/-) en negro */
.zoom-btn {
    color: #000000 !important;
}

/* Botones toolbar (reset, etc) deshabilitados — completamente opacos */
.tb-btn:disabled {
    opacity: 1 !important;
}

/* Boton Anadir Componente con fondo verde */
.add-component-btn {
    background: linear-gradient(135deg, #196639, #1d8538) !important;
}

/* Etiquetas de propiedades/componentes */
.property-edit-label {
    font-size: 12px !important;
    color: #fffefe !important;
    font-weight: 500 !important;
    white-space: nowrap !important;
}

.component-label {
    font-size: 11px !important;
    background-color: #196639 !important;
    padding: 3px 8px !important;
    border-radius: 3px !important;
    white-space: nowrap !important;
    margin-top: 5px !important;
    text-align: center !important;
    color: #ffffff !important;
}

/* Boton Mapa de Pines - fondo verde en vez de azul */
[class*="menu-bar_menu-bar-item"] {
    background: linear-gradient(135deg, rgb(44 131 29), rgb(69 129 113)) !important;
    color: rgb(255 255 255) !important;
    box-shadow: rgb(0 210 255 / 0%) 0px 0px 10px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

/* Banner de modo cableado */
.wire-mode-banner {
    position: absolute !important;
    bottom: 12px !important;
    left: 50% !important;
    transform: translate(-50%) !important;
    z-index: 100 !important;
    background: #086712eb !important;
}

/* Osciloscopio — contenedor y fondo blanco */
.osc-container {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    background: #ffffff !important;
}

.osc-empty {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    color: #000000 !important;
}

/* Monitor Serial — texto en negro y fondo blanco */
pre {
    flex: 1 1 0% !important;
    margin: 0px !important;
    padding: 8px !important;
    color: rgb(0, 0, 0) !important;
    background: rgb(255, 255, 255) !important;
}

/* Header del canvas — fondo blanco */
.canvas-header {
    height: 54px !important;
    padding: 0 16px !important;
    background: linear-gradient(180deg, #ffffff, #ffffff) !important;
}
`;

// Sketch mínimo para enviar cuando no hay código generado
const MINIMAL_SKETCH = `void setup() {
}

void loop() {
}`;

// Clave para guardar estado del circuito en localStorage
const VELXIO_STATE_KEY = 'stblock_velxio_circuit_state';

const getVelxioStateKey = deviceId => {
    const compatBoard = getCompatBoard(deviceId);
    return VELXIO_STATE_KEY + '_' + compatBoard;
};

const VelxioCircuit = forwardRef(({code, deviceId, active, onSerialOutput, onStateChange}, ref) => {
    const iframeRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const wasActive = useRef(false);
    const previousActiveRef = useRef(active);
    const sessionStateRef = useRef(null);
    const loadedRef = useRef(false);
    const codeRef = useRef(code);
    const serialLineBufferRef = useRef('');
    const serialFlushTimerRef = useRef(null);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    const flushSerialLine = useCallback((force = false) => {
        const buffered = serialLineBufferRef.current;
        if (!buffered && !force) return;
        if (serialFlushTimerRef.current) {
            clearTimeout(serialFlushTimerRef.current);
            serialFlushTimerRef.current = null;
        }
        serialLineBufferRef.current = '';
        if (!buffered) return;
        if (onSerialOutput) {
            onSerialOutput(buffered);
        }
    }, [onSerialOutput]);

    const appendVelxioSerialText = useCallback(text => {
        const chunk = typeof text === 'string' ? text : String(text || '');
        if (!chunk) return;
        for (let i = 0; i < chunk.length; i++) {
            const ch = chunk[i];
            if (ch === '\r') continue;
            if (ch === '\n') {
                flushSerialLine(true);
                continue;
            }
            serialLineBufferRef.current += ch;
        }
        if (serialLineBufferRef.current) {
            if (serialFlushTimerRef.current) {
                clearTimeout(serialFlushTimerRef.current);
            }
            serialFlushTimerRef.current = setTimeout(() => flushSerialLine(true), 120);
        }
    }, [flushSerialLine]);

    useEffect(() => () => {
        if (serialFlushTimerRef.current) {
            clearTimeout(serialFlushTimerRef.current);
        }
    }, []);


    const applyCodeToVelxio = useCallback((win, sketch, compatBoard, reason) => {
        if (!win) return false;

        try {
            const boardStore = win.__VELXIO_BOARD_STORE;
            const fileStore = win.__VELXIO_FILE_STORE;

            if (!boardStore || !fileStore) {
                console.warn('[Velxio-STBlock] Stores not ready for code apply:', {
                    reason,
                    hasBoardStore: !!boardStore,
                    hasFileStore: !!fileStore
                });
                return false;
            }

            const boardState = typeof boardStore.getState === 'function' ?
                boardStore.getState() : boardStore;
            const fileState = typeof fileStore.getState === 'function' ?
                fileStore.getState() : fileStore;

            let refreshedBoardState = boardState;
            let boards = refreshedBoardState.boards || [];
            let board = boards.find(b => b.id === compatBoard || b.boardKind === compatBoard);

            if (!board && typeof boardState.addBoard === 'function') {
                try {
                    const newBoardId = boardState.addBoard(compatBoard, 200, 200);
                    refreshedBoardState = typeof boardStore.getState === 'function' ?
                        boardStore.getState() : boardState;
                    boards = refreshedBoardState.boards || [];
                    board = boards.find(b =>
                        b.id === newBoardId || b.id === compatBoard || b.boardKind === compatBoard);
                } catch (addError) {
                    console.warn('[Velxio-STBlock] Error creating board for code apply:', addError);
                }
            }

            if (!board) {
                console.warn('[Velxio-STBlock] No compatible board found for code apply:', {
                    reason,
                    compatBoard,
                    existingBoards: boards.map(b => ({id: b.id, boardKind: b.boardKind})),
                    codeLength: sketch.length
                });
                return false;
            }

            if (refreshedBoardState.setActiveBoardId) {
                refreshedBoardState.setActiveBoardId(board.id);
            } else if (boardState.setActiveBoardId) {
                boardState.setActiveBoardId(board.id);
            }

            if (reason === 'run-request' || reason === 'code-change') {
                try {
                    if (boardState.stopBoard) {
                        boardState.stopBoard(board.id);
                    }
                    const simulator = boardState.getBoardSimulator ?
                        boardState.getBoardSimulator(board.id) : null;
                    if (simulator && simulator.stop) {
                        simulator.stop();
                    }
                    if (boardStore.setState) {
                        boardStore.setState(current => ({
                            boards: (current.boards || []).map(b => b.id === board.id ? {
                                ...b,
                                running: false,
                                compiledProgram: null
                            } : b),
                            running: current.activeBoardId === board.id ? false : current.running
                        }));
                    }

                    refreshedBoardState = typeof boardStore.getState === 'function' ?
                        boardStore.getState() : refreshedBoardState;
                    const pinManager = refreshedBoardState && refreshedBoardState.pinManager;
                    if (pinManager) {
                        let resetPins = 0;
                        if (typeof pinManager.triggerPinChange === 'function') {
                            for (let pin = 0; pin < 80; pin++) {
                                pinManager.triggerPinChange(pin, false);
                                resetPins++;
                            }
                        }
                        if (typeof pinManager.broadcastPwm === 'function') {
                            pinManager.broadcastPwm(0);
                        } else if (typeof pinManager.updatePwm === 'function') {
                            for (let pin = 0; pin < 80; pin++) {
                                pinManager.updatePwm(pin, 0);
                            }
                        }
                        if (typeof pinManager.resetPinStates === 'function') {
                            pinManager.resetPinStates();
                        }
                    }
                } catch (stopError) {
                    console.warn('[Velxio-STBlock] Could not stop board before code apply:', stopError);
                }
            }

            const groupId = board.activeFileGroupId || `group-${board.id}`;
            const groupFiles = fileState.getGroupFiles ?
                fileState.getGroupFiles(groupId) :
                ((fileState.fileGroups && fileState.fileGroups[groupId]) || []);
            let file = groupFiles.find(f => f.name && f.name.endsWith('.ino')) ||
                groupFiles.find(f => f.name && f.name.endsWith('.cpp')) ||
                groupFiles.find(f => f.name && f.name.endsWith('.py')) ||
                groupFiles[0];

            if (file && fileState.setFileContent) {
                if (fileState.setActiveGroup) fileState.setActiveGroup(groupId);
                if (fileState.setActiveFile) fileState.setActiveFile(file.id);
                fileState.setFileContent(file.id, sketch);
            } else if (file && fileState.updateGroupFile) {
                fileState.updateGroupFile(groupId, file.id, sketch);
                if (fileState.setActiveGroup) fileState.setActiveGroup(groupId);
                if (fileState.setActiveFile) fileState.setActiveFile(file.id);
                if (fileStore.setState) {
                    fileStore.setState({codeChangedSinceLastCompile: true});
                }
            } else if (fileState.createFileGroup) {
                fileState.createFileGroup(groupId, [{
                    name: board.languageMode === 'micropython' ? 'main.py' : 'sketch.ino',
                    content: sketch
                }]);
                if (fileState.setActiveGroup) fileState.setActiveGroup(groupId);
                const refreshedFiles = fileState.getGroupFiles ?
                    fileState.getGroupFiles(groupId) : [];
                file = refreshedFiles[0];
                if (file && fileState.setActiveFile) fileState.setActiveFile(file.id);
                if (fileStore.setState) {
                    fileStore.setState({codeChangedSinceLastCompile: true});
                }
            } else if (fileState.setCode) {
                fileState.setCode(sketch);
                if (fileStore.setState) {
                    fileStore.setState({codeChangedSinceLastCompile: true});
                }
            } else {
                console.warn('[Velxio-STBlock] No file update API available:', {reason});
                return false;
            }

            const afterFileState = typeof fileStore.getState === 'function' ?
                fileStore.getState() : fileState;
            const appliedFile = (afterFileState.fileGroups && afterFileState.fileGroups[groupId] || [])
                .find(f => f.id === (file ? file.id : afterFileState.activeFileId));
            return true;
        } catch (e) {
            console.warn('[Velxio-STBlock] Error applying code to Velxio store:', e);
            return false;
        }
    }, []);

    // Mantener loadedRef sincronizado
    useEffect(() => {
        loadedRef.current = loaded;
    }, [loaded]);

    // Re-enviar codigo cada vez que la pestana Circuitos se activa
    useEffect(() => {
        if (!active) {
            wasActive.current = false;
            return;
        }
        if (wasActive.current) return; // ya estaba activa
        wasActive.current = true;

        if (!loaded || !iframeRef.current) return;
        if (!deviceId) {
            return;
        }

        const compatBoard = getCompatBoard(deviceId);
        const sketch = codeRef.current || MINIMAL_SKETCH;
        const win = iframeRef.current.contentWindow;
        if (win.__VELXIO_SET_ACTIVE_BOARD) {
            win.__VELXIO_SET_ACTIVE_BOARD(compatBoard);
        }
        applyCodeToVelxio(win, sketch, compatBoard, 'tab-active');
    }, [active, loaded, deviceId, applyCodeToVelxio]);

    // saveCircuitState: Lee el estado actual del iframe de Velxio
    const saveCircuitState = useCallback(() => {
        return new Promise((resolve) => {
            if (!loadedRef.current || !iframeRef.current) {
                resolve(null);
                return;
            }
            try {
                const win = iframeRef.current.contentWindow;
                const boardStore = win.__VELXIO_BOARD_STORE;
                const fileStore = win.__VELXIO_FILE_STORE;

                if (!boardStore) {
                    resolve(null);
                    return;
                }

                const boardState = typeof boardStore.getState === 'function' ?
                    boardStore.getState() : boardStore;

                const state = {
                    boards: boardState.boards || [],
                    activeBoardId: boardState.activeBoardId || null,
                    components: boardState.components || [],
                    wires: boardState.wires || [],
                    fileGroups: null
                };

                // Intentar obtener file groups si el file store está disponible
                if (fileStore) {
                    const fileState = typeof fileStore.getState === 'function' ?
                        fileStore.getState() : fileStore;
                    if (fileState && fileState.fileGroups) {
                        state.fileGroups = fileState.fileGroups;
                        state.activeGroupId = fileState.activeGroupId || null;
                        state.activeGroupFileId = fileState.activeGroupFileId || {};
                        state.openGroupFileIds = fileState.openGroupFileIds || {};
                    }
                }
                resolve(state);
            } catch (e) {
                console.warn('[Velxio] Error saving circuit state:', e);
                resolve(null);
            }
        });
    }, []);

    // loadCircuitState: Restaura el estado en el iframe de Velxio
    const loadCircuitState = useCallback((state) => {
        return new Promise((resolve) => {
            if (!state || !iframeRef.current) {
                resolve(false);
                return;
            }

            // Poll hasta que el iframe esté listo y tenga los stores expuestos
            let attempts = 0;
            const maxAttempts = 50; // ~10 segundos
            const tick = setInterval(() => {
                attempts++;
                try {
                    const win = iframeRef.current.contentWindow;
                    const boardStore = win.__VELXIO_BOARD_STORE;

                    if (boardStore && boardStore.getState && typeof boardStore.getState === 'function') {
                        clearInterval(tick);

                        try {
                            const storeState = boardStore.getState();

                            // Restaurar boards
                            if (state.boards && Array.isArray(state.boards) && storeState.loadProjectState) {
                                storeState.loadProjectState(state);
                            } else if (state.boards && Array.isArray(state.boards)) {
                                // Fallback: restaurar manualmente si loadProjectState no existe

                                // Si hay un activeBoardId, establecerlo
                                if (state.activeBoardId && storeState.setActiveBoardId) {
                                    storeState.setActiveBoardId(state.activeBoardId);
                                }
                            }

                            // Restaurar file groups si están disponibles
                            if (state.fileGroups) {
                                const fileStore = win.__VELXIO_FILE_STORE;
                                if (fileStore) {
                                    const fileState = typeof fileStore.getState === 'function' ?
                                        fileStore.getState() : fileStore;
                                    if (fileState && fileState.loadProjectState) {
                                        fileState.loadProjectState(state);
                                    }
                                }
                            }

                            resolve(true);
                        } catch (e) {
                            console.warn('[Velxio] Error during circuit state restore:', e);
                            resolve(false);
                        }
                    }
                } catch (e) {
                    console.warn('[Velxio] Error polling for circuit restore:', e);
                }

                if (attempts >= maxAttempts) {
                    clearInterval(tick);
                    console.warn('[Velxio] Timed out waiting for iframe to restore circuit');
                    resolve(false);
                }
            }, 200);
        });
    }, []);

    const persistCircuitState = useCallback(async reason => {
        const state = await saveCircuitState();
        if (!state) return null;
        sessionStateRef.current = state;
        try {
            window.localStorage.setItem(getVelxioStateKey(deviceId), JSON.stringify(state));
        } catch (e) {
            console.warn('[Velxio] Error persisting circuit state:', e);
        }
        if (onStateChange) onStateChange(state);
        console.info('[Velxio] Circuito guardado', { // eslint-disable-line no-console
            reason,
            boards: state.boards.length,
            components: state.components.length,
            wires: state.wires.length
        });
        return state;
    }, [deviceId, onStateChange, saveCircuitState]);

    // El iframe permanece montado entre pestañas, pero guardamos/restauramos una
    // instantánea explícita para protegerlo de las rutinas de reactivación de Velxio.
    useEffect(() => {
        const wasVisible = previousActiveRef.current;
        previousActiveRef.current = active;

        if (wasVisible && !active) {
            persistCircuitState('tab-hidden');
            return;
        }
        if (wasVisible || !active) return;

        let state = sessionStateRef.current;
        if (!state) {
            try {
                const raw = window.localStorage.getItem(getVelxioStateKey(deviceId));
                if (raw) state = JSON.parse(raw);
            } catch (e) {
                console.warn('[Velxio] Error reading circuit session state:', e);
            }
        }
        if (state) {
            loadCircuitState(state).then(restored => {
                console.info('[Velxio] Circuito restaurado al volver a la pestaña', { // eslint-disable-line no-console
                    restored,
                    components: state.components ? state.components.length : 0,
                    wires: state.wires ? state.wires.length : 0
                });
            });
        }
    }, [active, deviceId, loadCircuitState, persistCircuitState]);

    // Persistir el circuito antes de desmontar el iframe (por ejemplo, al volver a modo Juego).
    useEffect(() => () => {
        persistCircuitState('unmount');
    }, [persistCircuitState]);

    // Exponer saveCircuitState y loadCircuitState al padre via ref
    useImperativeHandle(ref, () => ({
        saveCircuitState,
        loadCircuitState
    }), [saveCircuitState, loadCircuitState]);

    // Inyectar CSS custom + script para exponer store de Velxio
    const handleIframeLoad = useCallback(() => {
        try {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentDocument) {
                // Inyectar CSS
                const style = document.createElement('style');
                style.textContent = CUSTOM_CSS;
                iframe.contentDocument.head.appendChild(style);

                // Inyectar script para exponer stores de Velxio
                const script = iframe.contentDocument.createElement('script');
                script.textContent = `
(function() {
    if (window.__velxioReady) return;
    window.__velxioReady = true;

    function installConsoleNoiseFilter() {
        if (window.__STBLOCK_CONSOLE_NOISE_FILTER_INSTALLED) return;
        window.__STBLOCK_CONSOLE_NOISE_FILTER_INSTALLED = true;

        var noisyPatterns = [
            '[spice] maybeSolve skipped',
            '[spice] maybeSolve',
            '[spice] solve result',
            '[CPU] Frame',
            '[SpiceEngine] boot',
            'Loaded 150 components from metadata',
            '[pinPositionCalculator]',
            'Component led-builtin not found in DOM',
            'Could not resolve pin',
            '/api/auth/me',
            '/api/metrics/run'
        ];

        function isNoisy(args) {
            var text = '';
            try {
                text = Array.prototype.slice.call(args).map(function(arg) {
                    if (typeof arg === 'string') return arg;
                    if (arg && arg.message) return String(arg.message);
                    return '';
                }).join(' ');
            } catch (e) {
                return false;
            }
            return noisyPatterns.some(function(pattern) {
                return text.indexOf(pattern) !== -1;
            });
        }

        var originalLog = console.log;
        var originalDebug = console.debug || console.log;
        var originalWarn = console.warn || console.log;
        var originalError = console.error || console.log;
        console.log = function() {
            if (isNoisy(arguments)) return;
            return originalLog.apply(console, arguments);
        };
        console.debug = function() {
            if (isNoisy(arguments)) return;
            return originalDebug.apply(console, arguments);
        };
        console.warn = function() {
            if (isNoisy(arguments)) return;
            return originalWarn.apply(console, arguments);
        };
        console.error = function() {
            if (isNoisy(arguments)) return;
            return originalError.apply(console, arguments);
        };
    }

    installConsoleNoiseFilter();
    var poll = setInterval(function() {
        var ref = window.__VELXIO_BOARD_STORE;
        var fileRef = window.__VELXIO_FILE_STORE;
        if (ref) {
            function getState() {
                return typeof ref.getState === 'function' ? ref.getState() : ref;
            }
            function findBoard(state, boardKindOrId) {
                var boards = state.boards || [];
                for (var i = 0; i < boards.length; i++) {
                    if (boards[i].id === boardKindOrId || boards[i].boardKind === boardKindOrId) {
                        return boards[i];
                    }
                }
                return null;
            }
            window.__VELXIO_ADD_BOARD = function(boardKind, x, y) {
                try {
                    var state = getState();
                    var existing = findBoard(state, boardKind);
                    if (existing) {
                        return existing.id;
                    }
                    var id = state.addBoard(boardKind, x || 200, y || 200);
                    return id;
                } catch(e) {
                    return null;
                }
            };
            window.__VELXIO_SET_ACTIVE_BOARD = function(boardKindOrId) {
                try {
                    var state = getState();
                    var board = findBoard(state, boardKindOrId);
                    if (!board && state.addBoard) {
                        var id = state.addBoard(boardKindOrId, 200, 200);
                        state = getState();
                        board = findBoard(state, id) || findBoard(state, boardKindOrId);
                    }
                    if (board && state.setActiveBoardId) {
                        state.setActiveBoardId(board.id);
                        return board.id;
                    }
                    return null;
                } catch(e) {
                    return null;
                }
            };
            window.__VELXIO_BOARD_EXISTS = function(boardKind) {
                try {
                    return getState().boards.some(function(b) {
                        return b.id === boardKind || b.boardKind === boardKind;
                    });
                } catch(e) {
                    return false;
                }
            };
            window.__VELXIO_GET_BOARDS = function() {
                try {
                    return getState().boards.slice();
                } catch(e) {
                    return [];
                }
            };
            window.__VELXIO_KEEP_ONLY_BOARD = function(boardKindOrId) {
                try {
                    var state = getState();
                    var keep = findBoard(state, boardKindOrId);
                    if (!keep && state.addBoard) {
                        var id = state.addBoard(boardKindOrId, 200, 200);
                        state = getState();
                        keep = findBoard(state, id) || findBoard(state, boardKindOrId);
                    }
                    if (!keep) return null;

                    var keepId = keep.id;
                    var beforeBoards = (state.boards || []).slice();
                    beforeBoards.forEach(function(b) {
                        if (b.id !== keepId && state.removeBoard) {
                            try {
                                state.removeBoard(b.id);
                            } catch(removeError) {
                            }
                        }
                    });

                    if (ref.setState) {
                        ref.setState(function(current) {
                            var currentBoards = current.boards || [];
                            var currentKeep = currentBoards.find(function(b) {
                                return b.id === keepId || b.id === boardKindOrId || b.boardKind === boardKindOrId;
                            }) || keep;
                            return {
                                boards: [currentKeep],
                                activeBoardId: currentKeep.id,
                                running: false
                            };
                        });
                    }

                    state = getState();
                    keep = findBoard(state, keepId) || findBoard(state, boardKindOrId) || (state.boards || [])[0];
                    if (keep && state.setActiveBoardId) {
                        state.setActiveBoardId(keep.id);
                    }
                    if (ref.setState && keep) {
                        ref.setState({
                            activeBoardId: keep.id,
                            boards: [keep],
                            running: false
                        });
                    }
                    state = getState();
                    return keep ? keep.id : null;
                } catch(e) {
                    return null;
                }
            };
            window.__VELXIO_REMOVE_BOARD = function(boardId) {
                try {
                    getState().removeBoard(boardId);
                    return true;
                } catch(e) {
                    return false;
                }
            };
            clearInterval(poll);

            // Variable para evitar loops
            var isProcessingClick = false;
            var pendingRunRequestId = null;
            var pendingRunButton = null;
            var pendingRunTimer = null;

            function continueRun() {
                if (!pendingRunButton) return;
                var btn = pendingRunButton;
                pendingRunButton = null;
                pendingRunRequestId = null;
                if (pendingRunTimer) {
                    clearTimeout(pendingRunTimer);
                    pendingRunTimer = null;
                }
                isProcessingClick = true;
                btn.click();
                setTimeout(function() {
                    isProcessingClick = false;
                }, 0);
            }

            window.addEventListener('message', function(event) {
                if (!event.data || event.data.type !== 'CODE_READY_FOR_RUN') return;
                if (event.data.requestId !== pendingRunRequestId) return;
                continueRun();
            });

            // Interceptar clicks en botón de play (tb-btn-run) para pedir código ANTES de compilar
            document.addEventListener('click', function(e) {
                if (isProcessingClick) return;

                var el = e.target;
                var runButton = null;

                // Subir en el DOM para encontrar el botón
                for (var i = 0; i < 5 && el; i++) {
                    if (el.classList && (
                        el.classList.contains('tb-btn-run') ||
                        el.classList.contains('tb-btn-run-all')
                    )) {
                        runButton = el;
                        break;
                    }
                    el = el.parentElement;
                }

                if (runButton) {
                    // Detener el evento original hasta que STBlock mande el código actual
                    e.stopImmediatePropagation();
                    e.preventDefault();

                    pendingRunRequestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
                    pendingRunButton = runButton;

                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'REQUEST_CODE_BEFORE_RUN',
                            requestId: pendingRunRequestId
                        }, '*');
                    }

                    pendingRunTimer = setTimeout(function() {
                        continueRun();
                    }, 1200);
                }
            }, true); // capture phase

            function installSerialProbe() {
                if (window.__STBLOCK_SERIAL_PROBE_INSTALLED) return;
                window.__STBLOCK_SERIAL_PROBE_INSTALLED = true;

                var lastTextByElement = new WeakMap();
                var recentMessages = [];
                var wrappedSerialObjects = new WeakSet();
                var serialProbeSequence = 0;

                function shouldInspectElement(el) {
                    if (!el || !el.tagName) return false;
                    var tag = String(el.tagName).toLowerCase();
                    var cls = String(el.className || '').toLowerCase();
                    var id = String(el.id || '').toLowerCase();
                    var label = tag + ' ' + cls + ' ' + id;
                    return tag === 'pre' || tag === 'textarea' ||
                        label.indexOf('serial') !== -1 ||
                        label.indexOf('terminal') !== -1 ||
                        label.indexOf('console') !== -1 ||
                        label.indexOf('monitor') !== -1;
                }

                function normalizeText(text) {
                    return String(text || '').replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
                }

                function emitSerialProbe(source, text, meta) {
                    var normalized = normalizeText(text);
                    if (!normalized || !normalized.trim()) return;
                    var key = source + '::' + normalized.slice(-500);
                    if (normalized.length > 1 && recentMessages.indexOf(key) !== -1) return;
                    recentMessages.push(key);
                    if (recentMessages.length > 40) recentMessages.shift();
                    serialProbeSequence++;
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'VELXIO_SERIAL_PROBE',
                            source: source,
                            text: normalized,
                            meta: Object.assign({seq: serialProbeSequence}, meta || {})
                        }, '*');
                    }
                }

                function wrapSerialObject(obj, path) {
                    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return false;
                    if (wrappedSerialObjects.has(obj)) return false;
                    if (!('onByteTransmit' in obj) && !('onLineTransmit' in obj)) return false;

                    wrappedSerialObjects.add(obj);

                    var previousByteTransmit = obj.onByteTransmit;
                    var previousLineTransmit = obj.onLineTransmit;
                    var byteBuffer = '';

                    obj.onByteTransmit = function(byte) {
                        var ch = '';
                        try {
                            ch = String.fromCharCode(byte & 255);
                            byteBuffer += ch;
                            if (ch === '\\n') {
                                emitSerialProbe('avr-byte-line', byteBuffer, {path: path});
                                byteBuffer = '';
                            } else {
                                emitSerialProbe('avr-byte', ch, {path: path, byte: byte});
                            }
                        } catch (e) {
                        }
                        if (typeof previousByteTransmit === 'function') {
                            return previousByteTransmit.apply(this, arguments);
                        }
                        return undefined;
                    };

                    obj.onLineTransmit = function(line) {
                        try {
                            emitSerialProbe('avr-line', line, {path: path});
                        } catch (e) {
                        }
                        if (typeof previousLineTransmit === 'function') {
                            return previousLineTransmit.apply(this, arguments);
                        }
                        return undefined;
                    };

                    return true;
                }

                function scanObjectForSerial(obj, path, depth, seen) {
                    if (!obj || depth > 6) return 0;
                    var type = typeof obj;
                    if (type !== 'object' && type !== 'function') return 0;
                    if (seen.has(obj)) return 0;
                    seen.add(obj);

                    var wrapped = wrapSerialObject(obj, path) ? 1 : 0;
                    var keys = [];
                    try {
                        keys = Object.keys(obj);
                    } catch (e) {
                        return wrapped;
                    }

                    for (var i = 0; i < keys.length && i < 80; i++) {
                        var key = keys[i];
                        var value;
                        try {
                            value = obj[key];
                        } catch (e) {
                            continue;
                        }
                        if (!value) continue;
                        wrapped += scanObjectForSerial(value, path + '.' + key, depth + 1, seen);
                    }
                    return wrapped;
                }

                function scanSerialInternals(reason) {
                    var totalWrapped = 0;
                    try {
                        var state = getState();
                        var boards = state.boards || [];
                        boards.forEach(function(board) {
                            var simulator = state.getBoardSimulator ? state.getBoardSimulator(board.id) : null;
                            if (simulator) {
                                totalWrapped += scanObjectForSerial(simulator, 'simulator:' + board.id, 0, new WeakSet());
                            }
                            totalWrapped += scanObjectForSerial(board, 'board:' + board.id, 0, new WeakSet());
                        });
                    } catch (e) {
                    }
                    return totalWrapped;
                }

                function inspectElement(el, reason) {
                    if (!shouldInspectElement(el)) return;
                    var text = normalizeText(el.value !== undefined ? el.value : el.textContent);
                    if (!text || !text.trim()) return;
                    var last = lastTextByElement.get(el) || '';
                    if (text === last) return;
                    lastTextByElement.set(el, text);
                    var delta = last && text.indexOf(last) === 0 ? text.slice(last.length) : text;
                    emitSerialProbe('dom:' + String(el.tagName).toLowerCase(), delta, {
                        reason: reason,
                        className: String(el.className || ''),
                        id: String(el.id || ''),
                        totalLen: text.length
                    });
                }

                function scanSerialDom(reason) {
                    var nodes = Array.prototype.slice.call(document.querySelectorAll(
                        'pre, textarea, [class*="serial" i], [class*="terminal" i], [class*="console" i], [class*="monitor" i], [id*="serial" i], [id*="terminal" i], [id*="console" i], [id*="monitor" i]'
                    ));
                    nodes.forEach(function(node) {
                        inspectElement(node, reason);
                    });
                    return nodes.length;
                }

                window.__STBLOCK_SERIAL_PROBE_SCAN = function() {
                    var count = scanSerialDom('manual-scan');
                    return count;
                };

                window.__STBLOCK_SERIAL_PROBE_INTERNALS = function() {
                    return scanSerialInternals('manual-scan');
                };

                try {
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            if (mutation.type === 'characterData' && mutation.target && mutation.target.parentElement) {
                                inspectElement(mutation.target.parentElement, 'characterData');
                            }
                            Array.prototype.slice.call(mutation.addedNodes || []).forEach(function(node) {
                                if (node.nodeType !== 1) return;
                                inspectElement(node, 'added-node');
                                if (node.querySelectorAll) {
                                    Array.prototype.slice.call(node.querySelectorAll('*')).forEach(function(child) {
                                        inspectElement(child, 'added-child');
                                    });
                                }
                            });
                        });
                    });
                    observer.observe(document.body, {childList: true, subtree: true, characterData: true});
                } catch (e) {
                }

                setInterval(function() {
                    scanSerialDom('interval');
                    scanSerialInternals('interval');
                }, 1000);

                setTimeout(function() {
                    scanSerialDom('initial');
                    scanSerialInternals('initial');
                }, 500);
            }

            installSerialProbe();
        }
    }, 200);
})();
`;
                iframe.contentDocument.head.appendChild(script);
            }
            setLoaded(true);
            setError(null);

            setTimeout(() => {
                try {
                    if (!deviceId) {
                        return;
                    }
                    const stateKey = getVelxioStateKey(deviceId);
                    const savedState = window.localStorage.getItem(stateKey);
                    if (!savedState) return;
                    const parsedState = JSON.parse(savedState);
                    sessionStateRef.current = parsedState;
                    loadCircuitState(parsedState);
                } catch (restoreError) {
                    console.warn('[Velxio] Error restoring saved circuit state:', restoreError);
                }
            }, 500);
        } catch (e) {
            console.warn('[Velxio] No se pudo inyectar CSS:', e);
            setLoaded(true);
        }
    }, [loadCircuitState, deviceId]);

    // Escuchar mensajes de Velxio (ready, play/stop, request_code)
    useEffect(() => {
        const handleMessage = (e) => {
            // Ignorar mensajes que no son objetos
            if (!e.data || typeof e.data !== 'object') return;

            const {type, requestId} = e.data;

            const sendCode = (ackRequestId) => {
                if (!deviceId) {
                    return;
                }
                const compatBoard = getCompatBoard(deviceId);
                const sketch = codeRef.current || MINIMAL_SKETCH;
                const targetWindow = iframeRef.current?.contentWindow;
                if (!targetWindow) return;
                const applied = applyCodeToVelxio(targetWindow, sketch, compatBoard, ackRequestId ? 'run-request' : 'ready');
                if (ackRequestId) {
                    setTimeout(() => {
                        targetWindow.postMessage({
                            type: 'CODE_READY_FOR_RUN',
                            requestId: ackRequestId,
                            applied
                        }, '*');
                    }, applied ? 50 : 250);
                }
            };

            if (type === 'VELXIO_SERIAL_PROBE') {
                appendVelxioSerialText(e.data.text);
            }
            // Velxio pide código ANTES de compilar (interceptado en startSimulation)
            if (type === 'REQUEST_CODE_BEFORE_RUN') {
                sendCode(requestId);
            }

            // Si Velxio envía un mensaje de "ready", re-enviamos la última tarjeta
            if (type === 'ready') {
                sendCode();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [code, deviceId, appendVelxioSerialText]);

    // References para controlar inicializacion
    const boardInitialized = useRef(false);
    const lastDeviceId = useRef(null);
    const pendingSetupTimeout = useRef(null);

    // Enviar codigo al simulador cuando cambien codigo o dispositivo
    useEffect(() => {
        if (!loaded || !iframeRef.current) return;
        if (!deviceId) {
            return;
        }

        const compatBoard = getCompatBoard(deviceId);
        const sketch = codeRef.current || MINIMAL_SKETCH;
        const win = iframeRef.current.contentWindow;

        const applyCurrentCode = (reason) => {
            if (win.__VELXIO_SET_ACTIVE_BOARD) {
                win.__VELXIO_SET_ACTIVE_BOARD(compatBoard);
            }
            applyCodeToVelxio(win, codeRef.current || sketch, compatBoard, reason);
        };

        const tick = setInterval(() => {
            if (!win.__VELXIO_ADD_BOARD || !win.__VELXIO_GET_BOARDS || !win.__VELXIO_REMOVE_BOARD) return;
            clearInterval(tick);

            const devChanged = lastDeviceId.current !== null && lastDeviceId.current !== deviceId;
            lastDeviceId.current = deviceId;

            if (!boardInitialized.current || devChanged) {
                boardInitialized.current = true;

                if (pendingSetupTimeout.current) clearTimeout(pendingSetupTimeout.current);

                const existing = win.__VELXIO_GET_BOARDS();
                existing.forEach(function(b) {
                    win.__VELXIO_REMOVE_BOARD(b.id);
                });
                const addedBoardId = win.__VELXIO_ADD_BOARD(compatBoard, 200, 200);
                const activeBoardId = win.__VELXIO_SET_ACTIVE_BOARD ?
                    win.__VELXIO_SET_ACTIVE_BOARD(addedBoardId || compatBoard) : addedBoardId;
                const prunedBoardId = win.__VELXIO_KEEP_ONLY_BOARD ?
                    win.__VELXIO_KEEP_ONLY_BOARD(activeBoardId || compatBoard) : activeBoardId;
                [100, 300, 700, 1500].forEach(delay => {
                    setTimeout(() => {
                        if (win.__VELXIO_KEEP_ONLY_BOARD) {
                            win.__VELXIO_KEEP_ONLY_BOARD(prunedBoardId || compatBoard);
                        }
                    }, delay);
                });

                pendingSetupTimeout.current = setTimeout(() => {
                    if (win.__VELXIO_KEEP_ONLY_BOARD) {
                        win.__VELXIO_KEEP_ONLY_BOARD(prunedBoardId || compatBoard);
                    }
                    applyCurrentCode('board-setup');
                }, 300);
            } else {
                applyCurrentCode('code-change');
            }
        }, 300);

        const safety = setTimeout(() => clearInterval(tick), 10000);

        return () => {
            clearInterval(tick);
            clearTimeout(safety);
            if (pendingSetupTimeout.current) clearTimeout(pendingSetupTimeout.current);
        };
    }, [code, loaded, deviceId, applyCodeToVelxio]);

    return (
        <div className={styles.container}>
            {!loaded && !error && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                    <span>Cargando...</span>
                </div>
            )}
            {error && (
                <div className={styles.errorOverlay}>
                    <strong>Error al cargar el simulador</strong>
                    <p>{error}</p>
                    <button
                        className={styles.retryBtn}
                        onClick={() => {
                            setError(null);
                            setLoaded(false);
                            if (iframeRef.current) {
                                iframeRef.current.src = VELXIO_URL;
                            }
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={VELXIO_URL}
                className={styles.iframe}
                title="Velxio Simulator"
                onLoad={handleIframeLoad}
                onError={() => setError('No se pudo cargar el simulador')}
                allow="clipboard-read; clipboard-write"
            />
        </div>
    );
});

VelxioCircuit.displayName = 'VelxioCircuit';

VelxioCircuit.propTypes = {
    code: PropTypes.string,
    deviceId: PropTypes.string,
    active: PropTypes.bool,
    onSerialOutput: PropTypes.func,
    onStateChange: PropTypes.func
};

VelxioCircuit.defaultProps = {
    code: '',
    deviceId: null,
    active: false,
    onSerialOutput: null,
    onStateChange: null
};

export default VelxioCircuit;

export {getVelxioStateKey};
