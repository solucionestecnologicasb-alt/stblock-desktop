import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import VM from 'scratch-vm';
import Renderer from 'scratch-render';

import Blocks from '../../containers/blocks.jsx';
import AiTab from '../../containers/ai-tab.jsx';
import CostumeTab from '../../containers/costume-tab.jsx';
import SoundTab from '../../containers/sound-tab.jsx';
import StageWrapper from '../../containers/stage-wrapper.jsx';
import TargetPane from '../../containers/target-pane.jsx';
import Loader from '../loader/loader.jsx';
import Box from '../box/box.jsx';
import MenuBar from '../menu-bar/menu-bar.jsx';
import CostumeLibrary from '../../containers/costume-library.jsx';
import BackdropLibrary from '../../containers/backdrop-library.jsx';
import Watermark from '../../containers/watermark.jsx';

import WebGlModal from '../../containers/webgl-modal.jsx';
import TipsLibrary from '../../containers/tips-library.jsx';
import Cards from '../../containers/cards.jsx';
import Alerts from '../../containers/alerts.jsx';
import DragLayer from '../../containers/drag-layer.jsx';
import ConnectionModal from '../../containers/connection-modal.jsx';
import TelemetryModal from '../telemetry-modal/telemetry-modal.jsx';
import UpdateModal from '../update-modal/update-modal.jsx';

import layout, {STAGE_SIZE_MODES, STAGE_DISPLAY_SIZES} from '../../lib/layout-constants';
import {resolveStageSize} from '../../lib/screen-utils';
import {themeMap} from '../../lib/themes';
import {
    checkForSTBlockUpdates,
    dismissRecommendedUpdate,
    installPendingSTBlockUpdate
} from '../../lib/stblock-updater';

import styles from './gui.css';
import addExtensionIcon from './icon--extensions.svg';
import aiIcon from './icon--ai.svg';
import codeIcon from './icon--code.svg';
import costumesIcon from './icon--costumes.svg';
import soundsIcon from './icon--sounds.svg';
import DebugModal from '../debug-modal/debug-modal.jsx';
import DeviceSelector from '../device-selector/device-selector.jsx';
import StbBoardPinoutModal from '../stbboard-pinout-modal/stbboard-pinout-modal.jsx';
import deviceData from '../../lib/libraries/devices/devices.jsx';
import {getDeviceProfile} from '../../lib/device-profiles';
import TabBar from '../tab-bar/tab-bar.jsx';
import SplitContainer from '../split-container/split-container.jsx';
import MentorGuide from '../mentor-guide/mentor-guide.jsx';
import DeviceModeGUI from '../device-mode/device-mode-gui.jsx';
import {activateDeviceExtension, deactivateDeviceExtension} from '../../lib/device-extension-activator';
import {
    getDeviceMode,
    getSelectedDevice as getDeviceModeSelectedDevice,
    isDeviceConnected,
    getConnectionState,
    getSelectedPort,
    getCodeViewContent,
    getTerminalOutput,
    getTerminalSettings,
    getUploadState,
    isCodeLocked,
    getManualCode,
    setDeviceMode,
    setSelectedDevice,
    setDeviceConnected,
    setConnectionState,
    setDevicePort,
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
    closeUploadModal,
    getDeviceProjects,
    isDeviceChangeConfirmOpen,
    getPendingDevice,
    getProgramMode,
    ConnectionState,
    getCircuitData,
    restoreDeviceState,
    setCircuitData,
    clearCircuitData
} from '../../reducers/device-mode';
import DeviceChangeConfirm from '../device-change-confirm/device-change-confirm.jsx';
import UploadProgress from '../upload-progress/upload-progress.jsx';
import STBlockLinkPrompt from '../stblock-link-prompt/stblock-link-prompt.jsx';
import PythonPanel from '../python-panel/python-panel.jsx';
import {
    generatePythonCode,
    generatePythonCodeWithMap,
    createExecutor,
    preload as preloadPyodide,
    syncPythonToWorkspace,
    savePanelState as savePythonPanelState,
    loadPanelState as loadPythonPanelState
} from '../../lib/python';
import {ArduinoUploader, STBLOCK_LINK_DOWNLOAD_URL} from '../../lib/arduino-uploader';
import {openConnectionModal} from '../../reducers/modals';
import {setConnectionModalExtensionId} from '../../reducers/connection-modal';

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    }
});

// Minimal empty SB3 project for initializing a device workspace with no saved project
const EMPTY_DEVICE_PROJECT = {
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            currentCostume: 0,
            costumes: [
                {
                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                    name: 'backdrop1',
                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                    dataFormat: 'svg',
                    rotationCenterX: 240,
                    rotationCenterY: 180
                }
            ],
            sounds: [],
            volume: 100,
            layerOrder: 0,
            tempo: 60,
            videoTransparency: 50,
            videoState: 'off',
            textToSpeechLanguage: null
        },
        {
            isStage: false,
            name: 'Sprite1',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            currentCostume: 0,
            costumes: [
                {
                    assetId: 'bcf454acf82e4504149f7ffe07081dbc',
                    name: 'costume1',
                    bitmapResolution: 2,
                    md5ext: 'bcf454acf82e4504149f7ffe07081dbc.png',
                    dataFormat: 'png',
                    rotationCenterX: 180,
                    rotationCenterY: 320
                }
            ],
            sounds: [],
            volume: 100,
            visible: true,
            x: 0,
            y: 0,
            size: 60,
            direction: 90,
            draggable: false,
            rotationStyle: 'all around'
        }
    ],
    meta: {
        semver: '3.0.0',
        vm: '0.1.0',
        agent: ''
    }
};

let isRendererSupported = null;

const TABS_CONFIG = [
    {id: 'code',
        label: <FormattedMessage
            defaultMessage="Code"
            id="gui.gui.codeTab"
        />,
        icon: codeIcon},
    {id: 'costumes', label: null, icon: costumesIcon},
    {id: 'sounds',
        label: <FormattedMessage
            defaultMessage="Sounds"
            id="gui.gui.soundsTab"
        />,
        icon: soundsIcon}
];

const GUIComponent = props => {
    const {
        activeTabIndex,
        alertsVisible,
        authorId,
        authorThumbnailUrl,
        authorUsername,
        basePath,
        backdropLibraryVisible,
        blocksId,
        blocksTabVisible,
        cardsVisible,
        canChangeLanguage,
        canChangeTheme,
        canCreateNew,
        canEditTitle,
        canManageFiles,
        canRemix,
        canSave,
        canCreateCopy,
        canShare,
        canUseCloud,
        children,
        connectionModalVisible,
        costumeLibraryVisible,
        debugModalVisible,
        deviceLibraryVisible,
        deviceMode,
        deviceModeDevice,
        deviceModeConnected,
        deviceModeConnectionState,
        deviceModePort,
        deviceModeCode,
        deviceModeCodeLocked,
        deviceModeManualCode,
        deviceModeTerminal,
        deviceModeTerminalSettings,
        deviceModeUploadState,
        deviceModeProjects,
        deviceChangeConfirmOpen,
        pendingDevice,
        connectionPeripheralName,
        onClearDeviceTerminal,
        onAppendDeviceTerminal,
        onAppendTerminal, // Evita propagar al DOM Box
        onRestoreDeviceProject, // Evita propagar al DOM Box
        onSetTerminalSettings,
        onSetUploadState,
        onAddUploadLog,
        onCloseUploadModal,
        onSelectDeviceModeDevice,
        onSaveDeviceProject,
        onOpenDeviceChangeConfirm,
        onCloseDeviceChangeConfirm,
        onSetDeviceMode,
        onSetDeviceConnected,
        onSetConnectionState,
        onSetDevicePort,
        onOpenConnectionModal,
        onSetConnectionExtensionId,
        onSetCodeViewContent,
        onSetCodeLocked,
        onSetManualCode,
        circuitData,
        deviceModeProgramMode,
        onRestoreDeviceState,
        onSetCircuitData,
        onClearCircuitData,
        enableCommunity,
        intl,
        isCreating,
        isFullScreen,
        isPlayerOnly,
        isRtl,
        isShared,
        isTelemetryEnabled,
        isTotallyNormal,
        loading,
        reducedMotion,
        onClickAbout,
        onActivateTab,
        onExtensionButtonClick,
        onProjectTelemetryEvent,
        onRequestCloseBackdropLibrary,
        onRequestCloseCostumeLibrary,
        onRequestCloseDebugModal,
        onRequestCloseDeviceLibrary,
        onRequestOpenDeviceLibrary,
        onRequestCloseTelemetryModal,
        onSeeCommunity,
        onShare,
        onShowPrivacyPolicy,
        onStartSelectingFileUpload,
        onTelemetryModalCancel,
        onTelemetryModalOptIn,
        onTelemetryModalOptOut,
        secondaryTabIndex,
        showComingSoon,
        splitPrimaryIndex,
        splitMode,
        splitRatio,
        tabOrder,
        stageSizeMode,
        targetIsStage,
        telemetryModalVisible,
        theme,
        tipsLibraryVisible,
        toolboxXML,
        vm,
        pendingExplain,
        projectKey,
        onSetSecondaryTab,
        onSetSplitRatio,
        onSwapTabs,
        onReorderTabs,
        onClearExplain,
        onSetProjectKey,
        onSetHasBeenSaved,
        ...componentProps
    } = omit(props, 'dispatch');
    if (children) {
        return <Box {...componentProps}>{children}</Box>;
    }

    const selectedDevice = deviceModeDevice;
    const velxioRef = useRef(null);
    const [workspaceHandle, setWorkspaceHandle] = useState(null);
    const [mentorGuidanceMsg, setMentorGuidanceMsg] = useState();
    const [showSTBlockLinkPrompt, setShowSTBlockLinkPrompt] = useState(false);
    const [stbBoardPinoutVisible, setStbBoardPinoutVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [updateInstalling, setUpdateInstalling] = useState(false);

    // Python Panel state (for "Programacion" mode)
    // Cargar estado inicial desde localStorage
    const savedPythonState = useRef(loadPythonPanelState());
    const [pythonPanelOpen, setPythonPanelOpen] = useState(savedPythonState.current.isOpen);
    const [pythonPanelLocked, setPythonPanelLocked] = useState(savedPythonState.current.isLocked);

    // Código Python por target (sprite/escenario) - cada uno tiene su propio código
    const [pythonCodePerTarget, setPythonCodePerTarget] = useState(() => {
        // Intentar cargar códigos guardados por target
        try {
            const saved = localStorage.getItem('stblock_python_per_target');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });
    const [currentTargetId, setCurrentTargetId] = useState(null);
    const previousTargetIdRef = useRef(null);

    // El código Python actual es el del target actual
    const pythonCode = currentTargetId ? (pythonCodePerTarget[currentTargetId] || '') : '';

    // Función para actualizar el código del target actual
    const setPythonCode = useCallback((newCode) => {
        if (!currentTargetId) return;
        setPythonCodePerTarget(prev => ({
            ...prev,
            [currentTargetId]: newCode
        }));
    }, [currentTargetId]);

    const [pythonRunning, setPythonRunning] = useState(false);
    const [pythonLoading, setPythonLoading] = useState(false);
    const [pythonConsole, setPythonConsole] = useState('');
    const pythonGenDebounceRef = useRef(null);
    const pythonExecutorRef = useRef(null);
    const pythonPanelLockedRef = useRef(pythonPanelLocked);

    // Mantener el ref actualizado con el estado de bloqueo
    // y regenerar código Python cuando se bloquea el panel
    useEffect(() => {
        const wasUnlocked = !pythonPanelLockedRef.current;
        pythonPanelLockedRef.current = pythonPanelLocked;

        // Si el panel se acaba de bloquear, regenerar Python desde los bloques
        if (pythonPanelLocked && wasUnlocked && workspaceHandle?.workspace) {
            try {
                const result = generatePythonCodeWithMap(workspaceHandle.workspace);
                if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                setPythonCode(result.code);
            } catch (e) {
                console.warn('[GUI] Error regenerando Python al bloquear:', e);
            }
        }
    }, [pythonPanelLocked, workspaceHandle, setPythonCode]);

    // Detectar cambios de target (sprite/escenario) y cargar su código Python
    useEffect(() => {
        if (!vm) return;

        const handleTargetChange = () => {
            const newTargetId = vm.editingTarget?.id;
            if (!newTargetId || newTargetId === currentTargetId) return;

            // Guardar referencia al target anterior
            previousTargetIdRef.current = currentTargetId;

            // Actualizar al nuevo target
            setCurrentTargetId(newTargetId);

            // Si el panel está bloqueado, regenerar Python desde los bloques del nuevo target
            if (pythonPanelLockedRef.current && workspaceHandle?.workspace) {
                // Pequeño delay para que el workspace se actualice con los bloques del nuevo target
                setTimeout(() => {
                    try {
                        const result = generatePythonCodeWithMap(workspaceHandle.workspace);
                        if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                        setPythonCodePerTarget(prev => ({
                            ...prev,
                            [newTargetId]: result.code
                        }));
                    } catch (e) {
                        console.warn('[GUI] Error generando Python para nuevo target:', e);
                    }
                }, 100);
            }
        };

        // Establecer el target inicial
        if (vm.editingTarget && !currentTargetId) {
            setCurrentTargetId(vm.editingTarget.id);
        }

        // Escuchar cambios de target
        vm.on('TARGETS_UPDATE', handleTargetChange);
        // También escuchar cuando cambia el editing target directamente
        const checkTargetInterval = setInterval(() => {
            const targetId = vm.editingTarget?.id;
            if (targetId && targetId !== currentTargetId) {
                handleTargetChange();
            }
        }, 200);

        return () => {
            vm.removeListener('TARGETS_UPDATE', handleTargetChange);
            clearInterval(checkTargetInterval);
        };
    }, [vm, currentTargetId, workspaceHandle]);

    // Guardar códigos por target en localStorage cuando cambien
    useEffect(() => {
        try {
            localStorage.setItem('stblock_python_per_target', JSON.stringify(pythonCodePerTarget));
        } catch (e) {
            console.warn('[GUI] Error guardando Python por target:', e);
        }
    }, [pythonCodePerTarget]);

    // Guardar estado del panel Python cuando cambie
    useEffect(() => {
        savePythonPanelState({
            isOpen: pythonPanelOpen,
            isLocked: pythonPanelLocked,
            customCode: '' // Ya no guardamos código aquí, se guarda por target
        });
    }, [pythonPanelOpen, pythonPanelLocked]);

    // Crear ejecutor de Python cuando el VM esté disponible
    useEffect(() => {
        if (vm && !pythonExecutorRef.current) {
            pythonExecutorRef.current = createExecutor(vm);
            // Pre-cargar Pyodide en background cuando el panel se abre
        }
    }, [vm]);

    // Pre-cargar Pyodide cuando el panel se abre por primera vez
    useEffect(() => {
        if (pythonPanelOpen && pythonExecutorRef.current && !pythonExecutorRef.current.isPyodideReady()) {
            preloadPyodide();
        }
    }, [pythonPanelOpen]);

    // Calcular si estamos en modo edición Python (toolbox oculto)
    const isPythonEditMode = !pythonPanelLocked && pythonPanelOpen && deviceMode !== 'device';

    // Redimensionar workspace y mover bloques cuando cambia el modo Python
    const prevPythonEditModeRef = useRef(isPythonEditMode);
    useEffect(() => {
        if (!workspaceHandle?.workspace) return;

        // Solo actuar si el modo realmente cambió
        const modeChanged = prevPythonEditModeRef.current !== isPythonEditMode;
        prevPythonEditModeRef.current = isPythonEditMode;

        if (!modeChanged) return;

        const workspace = workspaceHandle.workspace;
        const TOOLBOX_WIDTH = 310; // Ancho aproximado del toolbox + flyout

        // Dar tiempo al CSS para aplicar los cambios
        const timer = setTimeout(() => {
            try {
                // Forzar redimensionado del workspace - dispara evento resize de ventana
                window.dispatchEvent(new Event('resize'));

                // También llamar resize directo del workspace
                if (typeof workspace.resize === 'function') {
                    workspace.resize();
                }

                // Scroll para mostrar los bloques en su nueva posición
                if (typeof workspace.scrollCenter === 'function') {
                    // No centrar, solo refrescar
                }

                // Refrescar la vista
                if (typeof workspace.render === 'function') {
                    workspace.render();
                }
            } catch (e) {
                console.warn('[PythonEditMode] Error ajustando workspace:', e);
            }
        }, 150); // Pequeño delay para que el CSS se aplique primero

        return () => clearTimeout(timer);
    }, [isPythonEditMode, workspaceHandle]);

    // Función para ejecutar código Python
    const handleRunPythonCode = useCallback((code) => {
        if (!pythonExecutorRef.current || pythonRunning) return;

        setPythonLoading(true);
        setPythonConsole('Cargando entorno Python...\n');

        pythonExecutorRef.current.execute(
            code,
            // onOutput
            (output) => {
                setPythonConsole(prev => prev + output + '\n');
            },
            // onError
            (error) => {
                setPythonConsole(prev => prev + `\n❌ Error: ${error}\n`);
                setPythonRunning(false);
                setPythonLoading(false);
            },
            // onComplete
            (result) => {
                setPythonConsole(prev => prev + '\n✓ Ejecución completada\n');
                setPythonRunning(false);
                setPythonLoading(false);
            }
        ).then(() => {
            setPythonLoading(false);
            setPythonRunning(true);
        }).catch((err) => {
            setPythonConsole(prev => prev + `\n❌ Error: ${err.message}\n`);
            setPythonLoading(false);
        });
    }, [pythonRunning]);

    // Función para detener código Python
    const handleStopPythonCode = useCallback(() => {
        if (pythonExecutorRef.current) {
            pythonExecutorRef.current.stop();
            setPythonRunning(false);
            setPythonConsole(prev => prev + '\n⏹ Ejecución detenida\n');
        }
    }, []);
    const lastSyncedRef = useRef({ peripheralName: null, connected: false, baudRate: null });

    // Generar código Python cuando el workspace cambie (solo en modo Programación)
    useEffect(() => {
        if (deviceMode === 'device' || !workspaceHandle || !workspaceHandle.workspace || !currentTargetId) {
            return;
        }

        const workspace = workspaceHandle.workspace;

        const handleWorkspaceChange = (event) => {
            // Solo regenerar en eventos relevantes
            const relevantEvents = ['create', 'delete', 'change', 'move', 'endDrag'];
            if (!event || !relevantEvents.includes(event.type)) {
                return;
            }

            // NO regenerar Python si el panel está desbloqueado (usuario editando código)
            // Esto evita el loop: editar Python → crear bloques → regenerar Python → loop
            if (!pythonPanelLockedRef.current) {
                return;
            }

            // Debounce para evitar regeneración excesiva
            if (pythonGenDebounceRef.current) {
                clearTimeout(pythonGenDebounceRef.current);
            }

            pythonGenDebounceRef.current = setTimeout(() => {
                try {
                    const result = generatePythonCodeWithMap(workspace);
                    if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                    setPythonCode(result.code);
                } catch (e) {
                    console.warn('[GUI] Error generando código Python:', e);
                }
            }, 200);
        };

        // Añadir listener
        workspace.addChangeListener(handleWorkspaceChange);

        // Generar código inicial para este target (solo si panel bloqueado o no hay código)
        if (pythonPanelLockedRef.current || !pythonCodePerTarget[currentTargetId]) {
            setTimeout(() => {
                try {
                    // Solo regenerar si está bloqueado
                    if (pythonPanelLockedRef.current) {
                        const result = generatePythonCodeWithMap(workspace);
                        if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                        setPythonCode(result.code);
                    }
                } catch (e) {
                    console.warn('[GUI] Error generando código Python inicial:', e);
                }
            }, 300);
        }

        return () => {
            workspace.removeChangeListener(handleWorkspaceChange);
            if (pythonGenDebounceRef.current) {
                clearTimeout(pythonGenDebounceRef.current);
            }
        };
    }, [deviceMode, workspaceHandle, currentTargetId, setPythonCode, pythonCodePerTarget]);

    const runUpdateCheck = useCallback(async ({manual = false} = {}) => {
        try {
            const result = await checkForSTBlockUpdates({manual});
            if (result.status === 'available') {
                setUpdateInfo(result);
            } else if (manual) {
                setUpdateInfo(result.status === 'current' ? result : {
                    status: 'current',
                    currentVersion: result.currentVersion,
                    latestVersion: result.latestVersion || result.currentVersion,
                    title: 'Sin actualizaciones pendientes',
                    message: 'No hay actualizaciones pendientes para este canal.'
                });
            }
        } catch (e) {
            if (manual) {
                setUpdateInfo({
                    status: 'error',
                    title: 'No se pudo buscar actualizaciones',
                    message: e.message || String(e),
                    currentVersion: 'Actual',
                    latestVersion: 'No disponible'
                });
            }
        }
    }, []);

    const handleDismissUpdate = useCallback(() => {
        if (updateInfo && updateInfo.status === 'available' && !updateInfo.mandatory && updateInfo.latestVersion) {
            dismissRecommendedUpdate(updateInfo.latestVersion);
        }
        setUpdateInfo(null);
    }, [updateInfo]);

    const handleInstallUpdate = useCallback(async () => {
        setUpdateInstalling(true);
        try {
            await installPendingSTBlockUpdate();
        } catch (e) {
            setUpdateInstalling(false);
            setUpdateInfo({
                status: 'error',
                title: 'No se pudo instalar la actualización',
                message: e.message || String(e),
                currentVersion: updateInfo && updateInfo.currentVersion ? updateInfo.currentVersion : 'Actual',
                latestVersion: updateInfo && updateInfo.latestVersion ? updateInfo.latestVersion : 'No disponible'
            });
        }
    }, [updateInfo]);

    useEffect(() => {
        const handleCheckUpdates = event => {
            runUpdateCheck({manual: Boolean(event.detail && event.detail.manual)});
        };
        window.addEventListener('stblock-check-updates', handleCheckUpdates);
        const timer = setTimeout(() => runUpdateCheck({manual: false}), 8000);
        return () => {
            window.removeEventListener('stblock-check-updates', handleCheckUpdates);
            clearTimeout(timer);
        };
    }, [runUpdateCheck]);

    useEffect(() => {
        const handleShowPinout = () => setStbBoardPinoutVisible(true);
        window.addEventListener('show-stbboard-pinout', handleShowPinout);
        return () => window.removeEventListener('show-stbboard-pinout', handleShowPinout);
    }, []);

    // ── Gearbot secret editor: Ctrl+Alt+E ──
    useEffect(() => {
        var editorUrl = 'static/velxio/gears/editor/index.html';

        var openEditor = function () {
            console.log('[GUI] Abriendo editor Gearbot:', editorUrl);
            // En Tauri: usar WebviewWindow API para crear ventana hija
            if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
                try {
                    // Si ya existe una ventana con esa label, Tauri lanza error -> recreamos con label unico
                    new window.__TAURI__.webviewWindow.WebviewWindow('stblock-editor', {
                        url: editorUrl,
                        title: 'Editor de escenarios STBlock',
                        width: 1200,
                        height: 800,
                        center: true,
                        resizable: true
                    });
                    return;
                } catch (e) {
                    // Si la label ya existe, crear con label nuevo
                    try {
                        new window.__TAURI__.webviewWindow.WebviewWindow('stblock-editor-' + Date.now(), {
                            url: editorUrl,
                            title: 'Editor de escenarios STBlock',
                            width: 1200,
                            height: 800,
                            center: true,
                            resizable: true
                        });
                        return;
                    } catch (e2) {
                        console.warn('[GUI] Error creando WebviewWindow:', e2);
                    }
                }
            }
            // Fallback para web: window.open
            window.open(editorUrl, 'stblock-editor');
        };

        var handleKeyDown = function (event) {
            if (!event.ctrlKey || !event.altKey || event.code !== 'KeyE') return;
            event.preventDefault();
            console.log('[GUI] Ctrl+Alt+E detectado');
            openEditor();
        };

        var handleMessage = function (event) {
            if (event.data && event.data.type === 'stblock-open-world-editor') {
                console.log('[GUI] postMessage stblock-open-world-editor recibido');
                openEditor();
            }
            if (event.data && event.data.type === 'stblock-open-robot-editor') {
                console.log('[GUI] postMessage stblock-open-robot-editor recibido');
                // Use the path provided by main.js or construct it
                var robotEditorUrl = event.data.editorPath || 'static/velxio/gears/editor/index.html?mode=robots';
                console.log('[GUI] Abriendo editor de robots:', robotEditorUrl);

                // En Tauri: usar WebviewWindow API para crear ventana hija
                if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
                    try {
                        new window.__TAURI__.webviewWindow.WebviewWindow('stblock-robot-editor', {
                            url: robotEditorUrl,
                            title: 'Editor de Robots - STBlock',
                            width: 1200,
                            height: 800,
                            center: true,
                            resizable: true
                        });
                        return;
                    } catch (e) {
                        // Si la label ya existe, crear con label nuevo
                        try {
                            new window.__TAURI__.webviewWindow.WebviewWindow('stblock-robot-editor-' + Date.now(), {
                                url: robotEditorUrl,
                                title: 'Editor de Robots - STBlock',
                                width: 1200,
                                height: 800,
                                center: true,
                                resizable: true
                            });
                            return;
                        } catch (e2) {
                            console.warn('[GUI] Error creando WebviewWindow para robot editor:', e2);
                        }
                    }
                }
                // Fallback para web: window.open
                window.open(robotEditorUrl, 'stblock-robot-editor');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('message', handleMessage);
        return function () {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const deviceSwitchInProgress = useRef(false);
    const handleMentorGuidance = useCallback(d => setMentorGuidanceMsg(d), []);

    // Handle code generation from blocks - update device mode code view
    const handleCodeGenerated = useCallback(code => {
        if (deviceMode === 'device' && onSetCodeViewContent) {
            onSetCodeViewContent(code);
        }
    }, [deviceMode, onSetCodeViewContent]);

    // Handle activating a device extension (register blocks, update toolbox)
    const handleActivateExtension = useCallback((extension) => {
        console.log('[GUI] Activating device extension:', extension.extensionId);
        if (vm) {
            activateDeviceExtension(vm, extension);
        }
    }, [vm]);

    // Handle deactivating a device extension (remove blocks, update toolbox)
    const handleDeactivateExtension = useCallback((extension) => {
        console.log('[GUI] Deactivating device extension:', extension.extensionId);
        if (vm) {
            deactivateDeviceExtension(vm, extension);
        }
    }, [vm]);

    // Check if the workspace has blocks (excluding default/empty blocks)
    const hasBlocksInWorkspace = useCallback(() => {
        if (!vm || !vm.editingTarget) return false;
        const blocks = vm.editingTarget.blocks;
        if (!blocks || !blocks._blocks) return false;
        // Check if there are any real blocks (not just empty workspace)
        const blockCount = Object.keys(blocks._blocks).length;
        return blockCount > 0;
    }, [vm]);

    // Save current device project before switching
    const saveCurrentDeviceProject = useCallback(() => {
        if (deviceModeDevice && deviceModeDevice.deviceId) {
            try {
                const projectData = vm.toJSON();
                const hasBlocks = hasBlocksInWorkspace();

                onSaveDeviceProject(deviceModeDevice.deviceId, projectData, hasBlocks);
            } catch (e) {
                console.warn('[GUI] Error saving device project:', e);
            }
        }
    }, [vm, deviceModeDevice, hasBlocksInWorkspace, onSaveDeviceProject]);

    // Actually perform the device switch
    const performDeviceSwitch = useCallback((device) => {
        const profile = getDeviceProfile(device);


        // Update Redux FIRST so the blocks container has the correct selectedDevice
        // when emitWorkspaceUpdate() fires during vm.loadProject() → installTargets.
        // This prevents toolbox mode mismatch errors.
        onSelectDeviceModeDevice(profile);
        onSetDeviceMode(profile ? 'device' : 'game');

        // Set flag to prevent PROJECT_LOADED handler from overwriting Redux state
        deviceSwitchInProgress.current = true;

        // NOTE: vm.clear() is NOT called here because loadProject → deserializeProject
        // already calls clear() internally. Calling it here causes a double-clear
        // which triggers workspace update errors (setRecyclingEnabled on null).

        // Check if we have a saved project for this device
        const savedProject = deviceModeProjects && profile ?
            deviceModeProjects[profile.deviceId] : null;

        if (savedProject && savedProject.projectData) {
            // Load the saved project for this device
            try {
                vm.loadProject(savedProject.projectData).then(() => {
                    vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                    vm.requestCodeUpdate();
                    deviceSwitchInProgress.current = false;
                }).catch(e => {
                    console.warn('[GUI] Error loading device project:', e);
                    vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                    vm.requestCodeUpdate();
                    deviceSwitchInProgress.current = false;
                });
            } catch (e) {
                console.warn('[GUI] Error loading device project:', e);
                deviceSwitchInProgress.current = false;
            }
        } else {
            // No saved project, load an empty project for the device
            try {
                vm.loadProject(EMPTY_DEVICE_PROJECT).then(() => {
                    vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                    vm.requestCodeUpdate();
                    deviceSwitchInProgress.current = false;
                }).catch(e => {
                    console.warn('[GUI] Error loading empty device project:', e);
                    vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                    vm.requestCodeUpdate();
                    deviceSwitchInProgress.current = false;
                });
            } catch (e) {
                console.warn('[GUI] Error loading empty device project:', e);
                deviceSwitchInProgress.current = false;
            }
        }

        onRequestCloseDeviceLibrary();
    }, [vm, deviceModeProjects, onSelectDeviceModeDevice, onSetDeviceMode, onRequestCloseDeviceLibrary]);

    // Handle device selection with confirmation if needed
    const handleDeviceSelected = useCallback(device => {
        const profile = getDeviceProfile(device);


        // If selecting "no device" (null), just switch
        if (!profile) {
            performDeviceSwitch(device);
            return;
        }

        // If selecting the same device already active, do nothing
        if (deviceModeDevice && deviceModeDevice.deviceId === profile.deviceId) {
            return;
        }

        // Check if there are blocks in the current workspace
        if (hasBlocksInWorkspace() && deviceModeDevice) {
            // Save current project and show confirmation
            saveCurrentDeviceProject();
            // Close the device selector first so the confirmation modal is visible
            onRequestCloseDeviceLibrary();
            onOpenDeviceChangeConfirm(device);
        } else {
            // No blocks, just switch
            saveCurrentDeviceProject();
            performDeviceSwitch(device);
        }
    }, [deviceModeDevice, hasBlocksInWorkspace, saveCurrentDeviceProject, performDeviceSwitch,
        onOpenDeviceChangeConfirm, onRequestCloseDeviceLibrary]);

    // Handle device change confirmation
    const handleConfirmDeviceChange = useCallback(() => {
        if (pendingDevice) {
            performDeviceSwitch(pendingDevice);
        }
        onCloseDeviceChangeConfirm();
    }, [pendingDevice, performDeviceSwitch, onCloseDeviceChangeConfirm]);

    const handleCancelDeviceChange = useCallback(() => {
        onCloseDeviceChangeConfirm();
    }, [onCloseDeviceChangeConfirm]);

    useEffect(() => {
        const restoreDeviceFromProject = () => {
            // Guard: skip if a device switch is in progress to avoid overwriting Redux
            if (deviceSwitchInProgress.current) return;

            const profile = vm.getDeviceProfile();
            onSelectDeviceModeDevice(profile);
            onSetDeviceMode(profile ? 'device' : 'game');
        };
        vm.runtime.on('PROJECT_LOADED', restoreDeviceFromProject);
        return () => vm.runtime.removeListener('PROJECT_LOADED', restoreDeviceFromProject);
    }, [vm, onSelectDeviceModeDevice, onSetDeviceMode]);

    useEffect(() => {
        vm.setHardwareModeActive(deviceMode === 'device');
    }, [vm, deviceMode]);

    // Trigger code generation when entering device mode or when workspace is ready
    useEffect(() => {
        if (deviceMode === 'device' && workspaceHandle && workspaceHandle.workspace && workspaceHandle.ScratchBlocks) {
            // Import and initialize Arduino generator for immediate code generation
            import('../../lib/arduino-generator').then(async module => {
                const initArduinoGenerator = module.default;
                try {
                    // initArduinoGenerator is now async
                    const generator = await initArduinoGenerator(workspaceHandle.ScratchBlocks);
                    const code = generator.workspaceToCode(workspaceHandle.workspace);
                    if (onSetCodeViewContent) {
                        onSetCodeViewContent(code);
                    }
                } catch (e) {
                    console.warn('[GUI] Error generating initial Arduino code:', e);
                }
            }).catch(e => {
                console.warn('[GUI] Failed to load Arduino generator:', e);
            });
        }
    }, [deviceMode, workspaceHandle, onSetCodeViewContent]);

    // Listen for peripheral connection events
    useEffect(() => {
        const handlePeripheralConnected = () => {
            onSetConnectionState(ConnectionState.CONNECTED);

            // Save connection info to localStorage for auto-reconnect
            if (deviceModeDevice && connectionPeripheralName) {
                try {
                    const connectionInfo = {
                        deviceId: deviceModeDevice.deviceId || deviceModeDevice.id,
                        deviceName: deviceModeDevice.name,
                        peripheralId: connectionPeripheralName,
                        peripheralName: connectionPeripheralName,
                        generator: deviceModeDevice.generator,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('stblock_last_peripheral', JSON.stringify(connectionInfo));
                    console.log('[GUI] Saved peripheral info for auto-reconnect:', connectionInfo);
                } catch (e) {
                    console.warn('[GUI] Failed to save peripheral info:', e);
                }
            }
        };
        const handlePeripheralDisconnected = () => {
            onSetConnectionState(ConnectionState.DISCONNECTED);
            onSetDevicePort(null);
            // Clear saved peripheral on intentional disconnect
            try {
                localStorage.removeItem('stblock_last_peripheral');
            } catch (e) {
                // Ignore errors
            }
        };
        const handlePeripheralError = () => {
            onSetConnectionState(ConnectionState.ERROR);
        };

        vm.on('PERIPHERAL_CONNECTED', handlePeripheralConnected);
        vm.on('PERIPHERAL_DISCONNECTED', handlePeripheralDisconnected);
        vm.on('PERIPHERAL_REQUEST_ERROR', handlePeripheralError);

        return () => {
            vm.removeListener('PERIPHERAL_CONNECTED', handlePeripheralConnected);
            vm.removeListener('PERIPHERAL_DISCONNECTED', handlePeripheralDisconnected);
            vm.removeListener('PERIPHERAL_REQUEST_ERROR', handlePeripheralError);
        };
    }, [vm, onSetConnectionState, onSetDevicePort, deviceModeDevice, connectionPeripheralName]);

    // Update port name when peripheral name changes (after connection)
    useEffect(() => {
        if (connectionPeripheralName && deviceModeConnected) {
            onSetDevicePort(connectionPeripheralName);

            const extId = deviceModeDevice?.generator === 'arduino' ? 'arduino' : deviceModeDevice?.id;
            if (!extId) return;

            // Sync board type from device profile to the peripheral
            if (vm.setPeripheralBoardType) {
                vm.setPeripheralBoardType(extId, deviceModeDevice.deviceId || deviceModeDevice.id);
            }

            // Synchronize baud rate — prefer the board config baudRate for Firmata,
            // fall back to terminal settings for monitor mode
            const targetBaud = deviceModeTerminalSettings?.baudRate;
            if (deviceModeDevice && targetBaud) {
                if (lastSyncedRef.current.peripheralName !== connectionPeripheralName ||
                    !lastSyncedRef.current.connected ||
                    lastSyncedRef.current.baudRate !== targetBaud) {

                    lastSyncedRef.current = {
                        peripheralName: connectionPeripheralName,
                        connected: true,
                        baudRate: targetBaud
                    };

                    if (vm.setPeripheralBaudrate) {
                        vm.setPeripheralBaudrate(extId, targetBaud);
                    }
                }
            }
        } else {
            lastSyncedRef.current.connected = false;
        }
    }, [connectionPeripheralName, deviceModeConnected, deviceModeDevice, deviceModeTerminalSettings?.baudRate, onSetDevicePort]);

    // Auto-reconnect to last peripheral when entering device mode
    useEffect(() => {
        // Only attempt auto-reconnect when entering device mode and not already connected
        if (deviceMode !== 'device' || deviceModeConnected || deviceModeConnectionState === ConnectionState.CONNECTING) {
            return;
        }

        // Check for saved peripheral info
        let savedInfo = null;
        try {
            const saved = localStorage.getItem('stblock_last_peripheral');
            if (saved) {
                savedInfo = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[GUI] Failed to read saved peripheral info:', e);
            return;
        }

        if (!savedInfo) return;

        // Check if saved info is recent (within 24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - savedInfo.timestamp > maxAge) {
            console.log('[GUI] Saved peripheral info expired, not auto-reconnecting');
            try {
                localStorage.removeItem('stblock_last_peripheral');
            } catch (e) {
                // Ignore
            }
            return;
        }

        // Check if current device matches saved device
        const currentDeviceId = deviceModeDevice?.deviceId || deviceModeDevice?.id;
        if (currentDeviceId && savedInfo.deviceId === currentDeviceId) {
            console.log('[GUI] Attempting auto-reconnect to:', savedInfo.peripheralName);

            // Delay slightly to ensure device mode is fully initialized
            const timeoutId = setTimeout(() => {
                // Only proceed if still in device mode and not connected
                if (deviceMode === 'device' && !deviceModeConnected) {
                    onSetConnectionState(ConnectionState.CONNECTING);
                    const extensionId = savedInfo.generator === 'arduino' ? 'arduino' : savedInfo.deviceId;

                    // Try to connect to the saved peripheral
                    try {
                        vm.connectPeripheral(extensionId, savedInfo.peripheralId);
                        onSetDevicePort(savedInfo.peripheralName);
                    } catch (e) {
                        console.warn('[GUI] Auto-reconnect failed:', e);
                        onSetConnectionState(ConnectionState.DISCONNECTED);
                    }
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [deviceMode, deviceModeDevice, deviceModeConnected, deviceModeConnectionState, vm, onSetConnectionState, onSetDevicePort]);

    // Listen for code generation events
    useEffect(() => {
        const handleCodeGenerated = code => {
            onSetCodeViewContent(code);
        };

        vm.on('CODE_GENERATED', handleCodeGenerated);

        return () => {
            vm.removeListener('CODE_GENERATED', handleCodeGenerated);
        };
    }, [vm, onSetCodeViewContent]);

    // Regenerate code when blocks change (in device mode)
    useEffect(() => {
        if (deviceMode !== 'device') return;

        const handleBlocksChanged = () => {
            // Debounce code regeneration
            if (window._codeGenTimeout) {
                clearTimeout(window._codeGenTimeout);
            }
            window._codeGenTimeout = setTimeout(() => {
                vm.requestCodeUpdate();
            }, 300);
        };

        vm.on('BLOCK_DRAG_END', handleBlocksChanged);
        vm.on('workspaceUpdate', handleBlocksChanged);

        // Initial code generation
        vm.requestCodeUpdate();

        return () => {
            vm.removeListener('BLOCK_DRAG_END', handleBlocksChanged);
            vm.removeListener('workspaceUpdate', handleBlocksChanged);
            if (window._codeGenTimeout) {
                clearTimeout(window._codeGenTimeout);
            }
        };
    }, [vm, deviceMode]);

    // Listen for serial data received events
    useEffect(() => {
        const handleSerialDataReceived = eventData => {
            // Extract the actual data from the event object
            // eventData = { extensionId: string, data: string }
            const text = eventData && eventData.data !== undefined ? eventData.data : eventData;

            // Skip empty data
            if (!text || (typeof text === 'string' && text.trim() === '')) return;

            // Format the data for terminal display
            const timestamp = new Date().toLocaleTimeString();
            onAppendDeviceTerminal({
                text: typeof text === 'string' ? text : String(text),
                type: 'info',
                timestamp
            });
        };

        vm.on('SERIAL_DATA_RECEIVED', handleSerialDataReceived);

        return () => {
            vm.removeListener('SERIAL_DATA_RECEIVED', handleSerialDataReceived);
        };
    }, [vm, onAppendDeviceTerminal]);


    const handleVelxioSerialOutput = useCallback(text => {
        const value = typeof text === 'string' ? text : String(text || '');
        if (!value) return;
        onAppendDeviceTerminal({
            text: value,
            type: 'info',
            timestamp: new Date().toLocaleTimeString(),
            source: 'velxio'
        });
    }, [onAppendDeviceTerminal]);

    // Restaurar circuito cuando circuitData cambia (despues de cargar .flynt)
    useEffect(() => {
        if (!circuitData || !velxioRef.current) return;

        const restore = async () => {
            try {
                if (velxioRef.current && velxioRef.current.loadCircuitState) {
                    const result = await velxioRef.current.loadCircuitState(circuitData);
                    if (result) {
                        console.log('[GUI] Circuit state restored from .flynt');
                    }
                }
            } catch (e) {
                console.warn('[GUI] Error restoring circuit state:', e);
            }
        };

        // Small delay to let the iframe initialize
        const timer = setTimeout(restore, 1000);
        return () => clearTimeout(timer);
    }, [circuitData]);

    // Persistir estado de device mode a localStorage
    useEffect(() => {
        if (!deviceMode || deviceMode !== 'device') return;
        try {
            const deviceState = {
                selectedDevice: deviceModeDevice ? {
                    deviceId: deviceModeDevice.deviceId,
                    id: deviceModeDevice.id,
                    name: deviceModeDevice.name
                } : null,
                programMode: deviceModeProgramMode,
                selectedPort: deviceModePort,
                terminalSettings: deviceModeTerminalSettings
            };
            localStorage.setItem('stblock_device_state', JSON.stringify(deviceState));
        } catch (e) {
            // Best-effort
        }
    }, [deviceMode, deviceModeDevice, deviceModeProgramMode, deviceModePort, deviceModeTerminalSettings]);

    // Restaurar device state desde localStorage al montar
    useEffect(() => {
        try {
            const saved = localStorage.getItem('stblock_device_state');
            if (saved) {
                const deviceState = JSON.parse(saved);
                if (deviceState && deviceState.selectedDevice) {
                    onRestoreDeviceState(deviceState);
                }
            }
        } catch (e) {
            // Best-effort
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handler for connecting to device
    const handleDeviceConnect = useCallback(() => {
        if (!deviceModeDevice) {
            // No device selected, open device library first
            onRequestOpenDeviceLibrary();
            return;
        }
        // Set connecting state
        onSetConnectionState(ConnectionState.CONNECTING);
        // Use 'arduino' as the extensionId for all Arduino-type devices
        // The Arduino extension handles all Arduino board types
        const extensionId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;
        onSetConnectionExtensionId(extensionId);
        onOpenConnectionModal();
    }, [deviceModeDevice, onSetConnectionState, onSetConnectionExtensionId, onOpenConnectionModal, onRequestOpenDeviceLibrary]);

    // Handler for disconnecting from device
    const handleDeviceDisconnect = useCallback(() => {
        if (deviceModeDevice) {
            // Use 'arduino' as the extensionId for all Arduino-type devices
            const extensionId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;
            try {
                vm.disconnectPeripheral(extensionId);
            } catch (e) {
                console.warn('Error disconnecting peripheral:', e);
            }
        }
        onSetConnectionState(ConnectionState.DISCONNECTED);
        onSetDevicePort(null);
    }, [vm, deviceModeDevice, onSetConnectionState, onSetDevicePort]);

    // Handler for uploading code to device
    const handleDeviceUpload = useCallback(async code => {
        if (!deviceModeDevice) {
            console.warn('Cannot upload: no device selected');
            return;
        }

        // Check if upload is supported (Tauri or STBlock Link)
        const isSupported = await ArduinoUploader.isSupported();
        if (!isSupported) {
            // Show STBlock Link download prompt for web version
            setShowSTBlockLinkPrompt(true);
            return;
        }

        // Get the port name
        const portName = deviceModePort;
        if (!portName) {
            onSetUploadState({
                isVisible: true,
                state: 'error',
                progress: 0,
                message: 'No hay puerto seleccionado. Por favor, conecta el dispositivo primero.',
                logs: []
            });
            return;
        }

        // Start upload process
        onSetUploadState({
            isVisible: true,
            state: 'preparing',
            progress: 0,
            message: 'Preparando compilación...',
            logs: []
        });

        const uploader = new ArduinoUploader();

        // Listen to uploader events
        uploader.on('stateChange', ({state, message}) => {
            onSetUploadState({state, message});
        });

        uploader.on('progress', progress => {
            onSetUploadState({progress});
        });

        uploader.on('log', log => {
            onAddUploadLog(log);
        });

        try {
            // Disconnect from serial before uploading (Arduino needs the port)
            const extensionId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;
            try {
                vm.disconnectPeripheral(extensionId);
            } catch (e) {
                // Ignore disconnect errors
            }

            // Compile and upload
            const result = await uploader.compileAndUpload(
                code,
                portName,
                deviceModeDevice,
                (progress, message) => {
                    onSetUploadState({progress, message});
                }
            );

            if (result.success) {
                onSetUploadState({
                    state: 'success',
                    progress: 100,
                    message: 'Código subido correctamente al dispositivo!'
                });
            } else {
                onSetUploadState({
                    state: 'error',
                    message: ArduinoUploader.getErrorMessage(result.error || 'Error desconocido')
                });
            }

        } catch (error) {
            onSetUploadState({
                state: 'error',
                message: ArduinoUploader.getErrorMessage(error.toString())
            });
        }
    }, [deviceModeDevice, deviceModePort, vm, onSetUploadState, onAddUploadLog]);

    // Handler for uploading realtime Firmata firmware
    const handleDeviceUploadFirmware = useCallback(async () => {
        if (!deviceModeDevice) {
            console.warn('Cannot upload firmware: no device selected');
            return;
        }

        // Check if upload is supported
        const isSupported = await ArduinoUploader.isSupported();
        if (!isSupported) {
            setShowSTBlockLinkPrompt(true);
            return;
        }

        // Start firmware upload process
        onSetUploadState({
            isVisible: true,
            state: 'preparing',
            progress: 0,
            message: 'Iniciando carga de firmware en vivo...',
            logs: []
        });

        onAddUploadLog({
            type: 'info',
            message: `Flashing StandardFirmata onto ${deviceModeDevice.name || deviceModeDevice.id}...`,
            timestamp: new Date().toLocaleTimeString()
        });

        try {
            const extensionId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;
            const peripheral = vm.runtime.peripheralExtensions[extensionId];

            if (peripheral && typeof peripheral.uploadFirmware === 'function') {
                const handleUploadStatus = statusData => {
                    const { status, message } = statusData;
                    if (status === 'uploading') {
                        onSetUploadState({
                            state: 'uploading',
                            progress: 50,
                            message: message
                        });
                        onAddUploadLog({
                            type: 'info',
                            message: message,
                            timestamp: new Date().toLocaleTimeString()
                        });
                    } else if (status === 'success') {
                        onSetUploadState({
                            state: 'success',
                            progress: 100,
                            message: 'Firmware cargado correctamente! El dispositivo se reconectará en breve.'
                        });
                        onAddUploadLog({
                            type: 'success',
                            message: 'Flasheo completado con éxito!',
                            timestamp: new Date().toLocaleTimeString()
                        });
                    } else if (status === 'error') {
                        onSetUploadState({
                            state: 'error',
                            progress: 0,
                            message: message
                        });
                        onAddUploadLog({
                            type: 'error',
                            message: message,
                            timestamp: new Date().toLocaleTimeString()
                        });
                    }
                };

                // Listen to status updates from peripheral
                vm.on('PERIPHERAL_UPLOAD_STATUS', handleUploadStatus);

                // Run the firmware upload
                const success = await peripheral.uploadFirmware();

                // Remove status listener
                vm.removeListener('PERIPHERAL_UPLOAD_STATUS', handleUploadStatus);
            } else {
                throw new Error('La carga de firmware en vivo no está soportada para este dispositivo.');
            }

        } catch (error) {
            onSetUploadState({
                state: 'error',
                message: `Error al subir firmware: ${error.message}`
            });
            onAddUploadLog({
                type: 'error',
                message: `Error: ${error.message}`,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }, [deviceModeDevice, vm, onSetUploadState, onAddUploadLog]);

    // Handler for closing upload modal
    const handleCloseUploadModal = useCallback(() => {
        onCloseUploadModal();
    }, [onCloseUploadModal]);

    // Handler for retrying upload
    const handleRetryUpload = useCallback(() => {
        // Get the current code and retry
        const code = deviceModeCode;
        if (code) {
            handleDeviceUpload(code);
        }
    }, [deviceModeCode, handleDeviceUpload]);

    // Handler for closing STBlock Link prompt
    const handleCloseSTBlockLinkPrompt = useCallback(() => {
        setShowSTBlockLinkPrompt(false);
    }, []);

    // Handler for retrying after STBlock Link install
    const handleRetrySTBlockLink = useCallback(async () => {
        setShowSTBlockLinkPrompt(false);
        // Re-check if STBlock Link is now available and retry upload
        const isSupported = await ArduinoUploader.isSupported();
        if (isSupported && deviceModeCode) {
            handleDeviceUpload(deviceModeCode);
        } else if (!isSupported) {
            // Still not available, show prompt again
            setShowSTBlockLinkPrompt(true);
        }
    }, [deviceModeCode, handleDeviceUpload]);

    // Handler for sending data to terminal/serial
    const handleSendToTerminal = useCallback(text => {
        if (!deviceModeDevice || !deviceModeConnected) {
            console.warn('Cannot send to terminal: device not connected');
            return;
        }

        // Get the extension ID
        const extensionId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;

        // Get the peripheral from the device manager
        const peripheral = vm.runtime.peripheralExtensions[extensionId];
        // Use sendSerialData instead of sendSerialLine since TerminalPanel handles EOL
        if (peripheral && typeof peripheral.sendSerialData === 'function') {
            peripheral.sendSerialData(text);
            // Echo the sent command to terminal (strip EOL characters for display)
            const displayText = text.replace(/[\r\n]+$/, '');
            const timestamp = new Date().toLocaleTimeString();
            onAppendDeviceTerminal({
                text: `> ${displayText}`,
                type: 'success',
                timestamp
            });
        } else if (peripheral && typeof peripheral.sendSerialLine === 'function') {
            // Fallback to sendSerialLine if sendSerialData doesn't exist
            peripheral.sendSerialLine(text.replace(/[\r\n]+$/, ''));
            const displayText = text.replace(/[\r\n]+$/, '');
            const timestamp = new Date().toLocaleTimeString();
            onAppendDeviceTerminal({
                text: `> ${displayText}`,
                type: 'success',
                timestamp
            });
        } else {
            console.warn('Peripheral does not support sendSerialLine');
        }
    }, [vm, deviceModeDevice, deviceModeConnected, onAppendDeviceTerminal]);

    const [isAiOpen, setIsAiOpen] = useState(false);
    const [isAiMinimized, setIsAiMinimized] = useState(false);

    useEffect(() => {
        if (pendingExplain) {
            setIsAiOpen(true);
            setIsAiMinimized(false);
        }
    }, [pendingExplain]);
    const [reanalyzeTick, setReanalyzeTick] = useState(0);
    const handleReanalyze = useCallback(function () {
        setReanalyzeTick(function (t) { return t + 1; });
    }, []);
    const [isDragToSplit, setIsDragToSplit] = useState(false);
    const [dragZone, setDragZone] = useState(null);
    const [isFullSize, setIsFullSize] = useState(
        typeof window !== 'undefined' ?
            window.matchMedia(`(min-width: ${layout.fullSizeMinWidth}px)`).matches :
            true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia(`(min-width: ${layout.fullSizeMinWidth}px)`);
        const handler = e => setIsFullSize(e.matches);
        mql.addListener(handler);
        return () => mql.removeListener(handler);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.toggle('reduced-motion', reducedMotion);
        return () => document.body.classList.remove('reduced-motion');
    }, [reducedMotion]);

    const stageSize = resolveStageSize(stageSizeMode, isFullSize);

    if (isRendererSupported === null) {
        isRendererSupported = Renderer.isSupported();
    }

    const tabsConfig = useMemo(() => {
        const costsmesLabel = targetIsStage ? (
            <FormattedMessage
                defaultMessage="Backdrops"
                id="gui.gui.backdropsTab"
            />
        ) : (
            <FormattedMessage
                defaultMessage="Costumes"
                id="gui.gui.costumesTab"
            />
        );
        return TABS_CONFIG.map((t, i) => i === 1 ? {...t, label: costsmesLabel} : t);
    }, [targetIsStage]);

    // Pre-rendered panels — always mounted, visibility toggled via CSS
    const codePanel = useMemo(() => (
        <Box className={styles.blocksWrapper}>
            <Blocks
                key={`${blocksId}/${theme}`}
                canUseCloud={canUseCloud}
                grow={1}
                isVisible={blocksTabVisible}
                isPythonEditMode={isPythonEditMode}
                onWorkspaceReady={setWorkspaceHandle}
                onCodeGenerated={handleCodeGenerated}
                options={{
                    media: `${basePath}static/${themeMap[theme].blocksMediaFolder}/`
                }}
                stageSize={stageSize}
                theme={theme}
                vm={vm}
            />
        </Box>
    ), [blocksId, theme, canUseCloud, blocksTabVisible, isPythonEditMode, vm, basePath, stageSize, handleCodeGenerated]);

    const costumePanel = useMemo(() => <CostumeTab vm={vm} />, [vm]);
    const soundPanel = useMemo(() => <SoundTab vm={vm} />, [vm]);
    const aiPanel = useMemo(() => <AiTab vm={vm} pendingExplain={pendingExplain} projectKey={projectKey} onClearExplain={onClearExplain} onMentorGuidance={handleMentorGuidance} onActivateTab={onActivateTab} reanalyzeTick={reanalyzeTick} />, [vm, pendingExplain, projectKey, onClearExplain, handleMentorGuidance, onActivateTab, reanalyzeTick]);

    const panels = useMemo(() => [codePanel, costumePanel, soundPanel],
        [codePanel, costumePanel, soundPanel]);

    const handleTabClick = useCallback(index => {
        if (index === -1) {
            if (splitMode) onActivateTab(splitPrimaryIndex);
            return;
        }
        onActivateTab(index);
    }, [splitMode, splitPrimaryIndex, onActivateTab]);

    const isInSplit = splitMode && splitPrimaryIndex != null &&
        (activeTabIndex === splitPrimaryIndex || activeTabIndex === secondaryTabIndex);
    const partnerIndex = isInSplit ?
        (activeTabIndex === splitPrimaryIndex ? secondaryTabIndex : splitPrimaryIndex) :
        null;
    const showSplit = partnerIndex != null;

    const handleCloseSecondary = useCallback(() => {
        onSetSecondaryTab(null);
    }, [onSetSecondaryTab]);

    const handleSwap = useCallback(() => {
        onSwapTabs();
    }, [onSwapTabs]);

    const handleDragToSplitPanel = useCallback((active, zone) => {
        setIsDragToSplit(active);
        setDragZone(active ? zone : null);
    }, []);

    const handleRatioChange = useCallback(ratio => {
        onSetSplitRatio(ratio);
    }, [onSetSplitRatio]);

    const handleTabReorder = useCallback(newOrder => {
        onReorderTabs(newOrder);
    }, [onReorderTabs]);

    const renderEditor = () => (
        <Box className={styles.bodyWrapper}>
            <Box className={styles.flexWrapper}>
                <Box className={classNames(styles.stageAndTargetWrapper, {
                    [styles['stage-large']]: stageSize === STAGE_DISPLAY_SIZES.large
                })}>
                    <StageWrapper
                        isRendererSupported={isRendererSupported}
                        isRtl={isRtl}
                        stageSize={stageSize}
                        vm={vm}
                    />
                    <Box className={styles.targetWrapper}>
                        <TargetPane
                            stageSize={stageSize}
                            vm={vm}
                        />
                    </Box>
                </Box>
                <Box className={styles.editorWrapper}>
                    <TabBar
                        tabs={tabsConfig}
                        tabOrder={tabOrder}
                        activeTabIndex={activeTabIndex}
                        secondaryTabIndex={secondaryTabIndex}
                        splitPrimaryIndex={splitPrimaryIndex}
                        splitMode={splitMode}
                        onTabClick={handleTabClick}
                        onTabReorder={handleTabReorder}
                        onSetSecondaryTab={onSetSecondaryTab}
                        onActivateTab={onActivateTab}
                        onDragToSplitPanel={handleDragToSplitPanel}
                        rtl={isRtl}
                    />
                    <div className={styles.tabsBody} data-tabs-body>
                        <SplitContainer
                            panels={panels}
                            primaryIndex={activeTabIndex}
                            secondaryIndex={partnerIndex}
                            splitMode={showSplit}
                            splitRatio={splitRatio}
                            splitDirection="horizontal"
                            onRatioChange={handleRatioChange}
                            onCloseSecondary={handleCloseSecondary}
                            onSwap={handleSwap}
                        />
                        {isDragToSplit && !showSplit && dragZone && (
                            <div className={classNames(styles.dropIndicator, dragZone === 'left' ? styles.dropLeft : styles.dropRight)}>
                                <span>Soltar aquí para pantalla dividida</span>
                            </div>
                        )}
                        {!showSplit && activeTabIndex === 0 && (
                            <Box className={styles.extensionButtonContainer}>
                                <button
                                    className={styles.extensionButton}
                                    title={intl.formatMessage(messages.addExtension)}
                                    onClick={onExtensionButtonClick}
                                >
                                    <img
                                        className={styles.extensionButtonIcon}
                                        draggable={false}
                                        src={addExtensionIcon}
                                    />
                                </button>
                            </Box>
                        )}
                        {!showSplit && activeTabIndex === 0 && (
                            <Box className={styles.watermark}>
                                <Watermark selectedDevice={selectedDevice} />
                            </Box>
                        )}
                        {activeTabIndex === 0 && (
                            <MentorGuide message={mentorGuidanceMsg} onReanalyze={handleReanalyze} />
                        )}
                        {/* Python Panel - only visible in Programacion mode (deviceMode === 'game') */}
                        <PythonPanel
                            isOpen={pythonPanelOpen}
                            pythonCode={pythonCode}
                            isLocked={pythonPanelLocked}
                            onToggleOpen={() => setPythonPanelOpen(!pythonPanelOpen)}
                            onToggleLock={() => setPythonPanelLocked(!pythonPanelLocked)}
                            onCodeChange={setPythonCode}
                            onCopyCode={() => {}}
                            onSyncToBlocks={(code) => syncPythonToWorkspace(vm, code)}
                            isProgrammingMode={deviceMode !== 'device'}
                            targetName={vm.editingTarget?.getName() || 'Sprite'}
                            isStage={vm.editingTarget?.isStage || false}
                        />
                    </div>
                </Box>
            </Box>
        </Box>
    );

    const renderDeviceMode = () => (
        <DeviceModeGUI
            code={deviceModeCode}
            terminalOutput={deviceModeTerminal}
            terminalSettings={deviceModeTerminalSettings}
            device={deviceModeDevice}
            port={deviceModePort}
            isConnected={deviceModeConnected}
            connectionState={deviceModeConnectionState}
            isUploading={false}
            onClearTerminal={onClearDeviceTerminal}
            onSendToTerminal={handleSendToTerminal}
            onTerminalSettingsChange={settings => {
                onSetTerminalSettings(settings);
                if (deviceModeDevice && settings.baudRate) {
                    const extId = deviceModeDevice.generator === 'arduino' ? 'arduino' : deviceModeDevice.id;
                    if (vm.setPeripheralBaudrate) {
                        vm.setPeripheralBaudrate(extId, settings.baudRate);
                    }
                }
            }}
            onConnect={handleDeviceConnect}
            onDisconnect={handleDeviceDisconnect}
            onUpload={handleDeviceUpload}
            onSelectDevice={onRequestOpenDeviceLibrary}
            onActivateExtension={handleActivateExtension}
            onDeactivateExtension={handleDeactivateExtension}
            blocksComponent={codePanel}
            isRtl={isRtl}
            isCodeLocked={deviceModeCodeLocked}
            manualCode={deviceModeManualCode}
            onCodeLockChange={onSetCodeLocked}
            onManualCodeChange={onSetManualCode}
            onUploadFirmware={handleDeviceUploadFirmware}
            velxioRef={velxioRef}
            onVelxioSerialOutput={handleVelxioSerialOutput}
        />
    );

    // Render upload progress modal
    const uploadProgressModal = deviceModeUploadState && deviceModeUploadState.isVisible ? (
        <UploadProgress
            visible={deviceModeUploadState.isVisible}
            state={deviceModeUploadState.state}
            progress={deviceModeUploadState.progress}
            message={deviceModeUploadState.message}
            logs={deviceModeUploadState.logs}
            deviceName={deviceModeDevice?.name}
            portName={deviceModePort}
            onClose={handleCloseUploadModal}
            onCancel={handleCloseUploadModal}
            onRetry={handleRetryUpload}
        />
    ) : null;

    // Render STBlock Link prompt modal
    const stblockLinkPromptModal = showSTBlockLinkPrompt ? (
        <STBlockLinkPrompt
            visible={showSTBlockLinkPrompt}
            downloadUrl={STBLOCK_LINK_DOWNLOAD_URL}
            onClose={handleCloseSTBlockLinkPrompt}
            onRetry={handleRetrySTBlockLink}
        />
    ) : null;

    // isPythonEditMode ya está calculado más arriba en el componente

    return isPlayerOnly ? (
        <StageWrapper
            isFullScreen={isFullScreen}
            isRendererSupported={isRendererSupported}
            isRtl={isRtl}
            loading={loading}
            stageSize={STAGE_SIZE_MODES.large}
            vm={vm}
        >
            {alertsVisible ? (
                <Alerts className={styles.alertsContainer} />
            ) : null}
        </StageWrapper>
    ) : (
        <Box
            className={classNames(styles.pageWrapper, {
                [styles.pythonEditMode]: isPythonEditMode
            })}
            dir={isRtl ? 'rtl' : 'ltr'}
            {...componentProps}
        >
            {telemetryModalVisible ? (
                <TelemetryModal
                    isRtl={isRtl}
                    isTelemetryEnabled={isTelemetryEnabled}
                    onCancel={onTelemetryModalCancel}
                    onOptIn={onTelemetryModalOptIn}
                    onOptOut={onTelemetryModalOptOut}
                    onRequestClose={onRequestCloseTelemetryModal}
                    onShowPrivacyPolicy={onShowPrivacyPolicy}
                />
            ) : null}
            {loading ? (
                <Loader />
            ) : null}
            {isCreating ? (
                <Loader messageId="gui.loader.creating" />
            ) : null}
            {isRendererSupported ? null : (
                <WebGlModal isRtl={isRtl} />
            )}
            {tipsLibraryVisible ? (
                <TipsLibrary />
            ) : null}
            {cardsVisible ? (
                <Cards />
            ) : null}
            {alertsVisible ? (
                <Alerts className={styles.alertsContainer} />
            ) : null}
            {connectionModalVisible ? (
                <ConnectionModal vm={vm} />
            ) : null}
            {costumeLibraryVisible ? (
                <CostumeLibrary
                    vm={vm}
                    onRequestClose={onRequestCloseCostumeLibrary}
                />
            ) : null}
            {<DebugModal
                isOpen={debugModalVisible}
                onClose={onRequestCloseDebugModal}
            />}
            {backdropLibraryVisible ? (
                <BackdropLibrary
                    vm={vm}
                    onRequestClose={onRequestCloseBackdropLibrary}
                />
            ) : null}
            <DeviceSelector
                deviceData={deviceData}
                onRequestClose={onRequestCloseDeviceLibrary}
                onDeviceSelected={handleDeviceSelected}
                title="Seleccionar Dispositivo"
                visible={deviceLibraryVisible}
                selectedDeviceId={deviceModeDevice ? deviceModeDevice.deviceId : null}
            />
            <DeviceChangeConfirm
                visible={deviceChangeConfirmOpen}
                currentDeviceName={deviceModeDevice ? deviceModeDevice.name : null}
                newDeviceName={pendingDevice ? pendingDevice.name : null}
                onConfirm={handleConfirmDeviceChange}
                onCancel={handleCancelDeviceChange}
            />
            {uploadProgressModal}
            {stblockLinkPromptModal}
            {stbBoardPinoutVisible ? (
                <StbBoardPinoutModal
                    onClose={() => setStbBoardPinoutVisible(false)}
                />
            ) : null}
            <UpdateModal
                info={updateInfo}
                installing={updateInstalling}
                onDismiss={handleDismissUpdate}
                onInstall={handleInstallUpdate}
                onRetry={() => runUpdateCheck({manual: true})}
            />
            <MenuBar
                authorId={authorId}
                authorThumbnailUrl={authorThumbnailUrl}
                authorUsername={authorUsername}
                canChangeLanguage={canChangeLanguage}
                canChangeTheme={canChangeTheme}
                canCreateCopy={canCreateCopy}
                canCreateNew={canCreateNew}
                canEditTitle={canEditTitle}
                canManageFiles={canManageFiles}
                canRemix={canRemix}
                canSave={canSave}
                canShare={canShare}
                className={styles.menuBarPosition}
                enableCommunity={enableCommunity}
                isShared={isShared}
                isTotallyNormal={isTotallyNormal}
                showComingSoon={showComingSoon}
                onClickAbout={onClickAbout}
                onProjectTelemetryEvent={onProjectTelemetryEvent}
                onSeeCommunity={onSeeCommunity}
                onShare={onShare}
                onStartSelectingFileUpload={onStartSelectingFileUpload}
                onRequestOpenDeviceLibrary={onRequestOpenDeviceLibrary}
                selectedDevice={selectedDevice}
                onUploadFirmware={handleDeviceUploadFirmware}
                deviceModeConnected={deviceModeConnected}
            />
            {deviceMode === 'device' ? renderDeviceMode() : renderEditor()}
            <DragLayer />
            {isAiOpen && (
                <div className={classNames(styles.aiFloatingWindow, {[styles.minimized]: isAiMinimized})}>
                    <div className={styles.aiWindowHeader} onClick={() => setIsAiMinimized(!isAiMinimized)}>
                        <div className={styles.aiWindowTitle}>
                            <img src={aiIcon} style={{width: 18, height: 18, filter: 'brightness(0) invert(1)'}} />
                            <span>Asistente de IA</span>
                        </div>
                        <div className={styles.aiWindowActions} onClick={e => e.stopPropagation()}>
                            <button className={styles.aiActionBtn} onClick={() => setIsAiMinimized(!isAiMinimized)} title={isAiMinimized ? "Restaurar" : "Minimizar"}>
                                {isAiMinimized ? '🗖' : '🗕'}
                            </button>
                            <button className={styles.aiActionBtn} onClick={() => setIsAiOpen(false)} title="Cerrar">
                                ✕
                            </button>
                        </div>
                    </div>
                    {!isAiMinimized && (
                        <div className={styles.aiWindowBody}>
                            {aiPanel}
                        </div>
                    )}
                </div>
            )}
            {!isAiOpen && (
                <button className={styles.aiFloatingBtn} onClick={() => { setIsAiOpen(true); setIsAiMinimized(false); }} title="Preguntar a la IA">
                    <img className={styles.aiFloatingBtnIcon} src={aiIcon} style={{filter: 'brightness(0) invert(1)'}} />
                </button>
            )}
        </Box>
    );
};

GUIComponent.propTypes = {
    activeTabIndex: PropTypes.number,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    backdropLibraryVisible: PropTypes.bool,
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    blocksId: PropTypes.string,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    cardsVisible: PropTypes.bool,
    children: PropTypes.node,
    costumeLibraryVisible: PropTypes.bool,
    debugModalVisible: PropTypes.bool,
    deviceLibraryVisible: PropTypes.bool,
    deviceMode: PropTypes.oneOf(['game', 'device']),
    deviceModeCode: PropTypes.string,
    deviceModeCodeLocked: PropTypes.bool,
    deviceModeManualCode: PropTypes.string,
    deviceModeConnected: PropTypes.bool,
    deviceModeConnectionState: PropTypes.string,
    deviceModeDevice: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    }),
    deviceModePort: PropTypes.string,
    deviceModeTerminal: PropTypes.array,
    deviceModeTerminalSettings: PropTypes.object,
    deviceModeUploadState: PropTypes.object,
    deviceModeProjects: PropTypes.object,
    deviceChangeConfirmOpen: PropTypes.bool,
    pendingDevice: PropTypes.object,
    connectionPeripheralName: PropTypes.string,
    onClearDeviceTerminal: PropTypes.func,
    onAppendDeviceTerminal: PropTypes.func,
    onSetTerminalSettings: PropTypes.func,
    onSetUploadState: PropTypes.func,
    onAddUploadLog: PropTypes.func,
    onCloseUploadModal: PropTypes.func,
    onSelectDeviceModeDevice: PropTypes.func,
    onSaveDeviceProject: PropTypes.func,
    onOpenDeviceChangeConfirm: PropTypes.func,
    onCloseDeviceChangeConfirm: PropTypes.func,
    onSetDeviceMode: PropTypes.func,
    onSetDeviceConnected: PropTypes.func,
    onSetConnectionState: PropTypes.func,
    onSetDevicePort: PropTypes.func,
    onOpenConnectionModal: PropTypes.func,
    onSetConnectionExtensionId: PropTypes.func,
    onSetCodeViewContent: PropTypes.func,
    onSetCodeLocked: PropTypes.func,
    onSetManualCode: PropTypes.func,
    circuitData: PropTypes.object,
    deviceModeProgramMode: PropTypes.string,
    onRestoreDeviceState: PropTypes.func,
    onSetCircuitData: PropTypes.func,
    onClearCircuitData: PropTypes.func,
    enableCommunity: PropTypes.bool,
    intl: intlShape.isRequired,
    isCreating: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loading: PropTypes.bool,
    logo: PropTypes.string,
    onActivateTab: PropTypes.func,
    onExtensionButtonClick: PropTypes.func,
    onRequestCloseBackdropLibrary: PropTypes.func,
    onRequestCloseCostumeLibrary: PropTypes.func,
    onRequestCloseDebugModal: PropTypes.func,
    onRequestCloseDeviceLibrary: PropTypes.func,
    onRequestOpenDeviceLibrary: PropTypes.func,
    onRequestCloseTelemetryModal: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onShowPrivacyPolicy: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onTelemetryModalCancel: PropTypes.func,
    onTelemetryModalOptIn: PropTypes.func,
    onTelemetryModalOptOut: PropTypes.func,
    secondaryTabIndex: PropTypes.number,
    splitMode: PropTypes.bool,
    splitPrimaryIndex: PropTypes.number,
    splitRatio: PropTypes.number,
    tabOrder: PropTypes.arrayOf(PropTypes.number),
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    targetIsStage: PropTypes.bool,
    telemetryModalVisible: PropTypes.bool,
    theme: PropTypes.string,
    tipsLibraryVisible: PropTypes.bool,
    toolboxXML: PropTypes.string,
    reducedMotion: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired,
    onSetSecondaryTab: PropTypes.func,
    onSetSplitRatio: PropTypes.func,
    onSwapTabs: PropTypes.func,
    onReorderTabs: PropTypes.func
};

GUIComponent.defaultProps = {
    basePath: './',
    blocksId: 'original',
    canChangeLanguage: true,
    canChangeTheme: true,
    canCreateNew: false,
    canEditTitle: false,
    canManageFiles: true,
    canRemix: false,
    canSave: false,
    canCreateCopy: false,
    canShare: false,
    canUseCloud: false,
    enableCommunity: false,
    isCreating: false,
    isShared: false,
    isTotallyNormal: false,
    loading: false,
    showComingSoon: false,
    stageSizeMode: STAGE_SIZE_MODES.large,
    splitRatio: 0.5
};

const mapStateToProps = state => ({
    blocksId: state.scratchGui.timeTravel.year.toString(),
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    theme: state.scratchGui.theme.theme,
    toolboxXML: state.scratchGui.toolbox.toolboxXML,
    reducedMotion: state.scratchGui.animations.reducedMotion,
    deviceMode: getDeviceMode(state),
    deviceModeDevice: getDeviceModeSelectedDevice(state),
    deviceModeConnected: isDeviceConnected(state),
    deviceModeConnectionState: getConnectionState(state),
    deviceModePort: getSelectedPort(state),
    deviceModeCode: getCodeViewContent(state),
    deviceModeTerminal: getTerminalOutput(state),
    deviceModeTerminalSettings: getTerminalSettings(state),
    deviceModeUploadState: getUploadState(state),
    deviceModeProjects: getDeviceProjects(state),
    deviceChangeConfirmOpen: isDeviceChangeConfirmOpen(state),
    pendingDevice: getPendingDevice(state),
    connectionPeripheralName: state.scratchGui.connectionModal.peripheralName,
    deviceModeCodeLocked: isCodeLocked(state),
    deviceModeManualCode: getManualCode(state),
    circuitData: getCircuitData(state),
    deviceModeProgramMode: getProgramMode(state)
});

const mapDispatchToProps = dispatch => ({
    onClearDeviceTerminal: () => dispatch(clearTerminal()),
    onAppendDeviceTerminal: output => dispatch(appendTerminalOutput(output)),
    onSetTerminalSettings: settings => dispatch(setTerminalSettings(settings)),
    onSetUploadState: uploadState => dispatch(setUploadState(uploadState)),
    onAddUploadLog: log => dispatch(addUploadLog(log)),
    onCloseUploadModal: () => dispatch(closeUploadModal()),
    onSelectDeviceModeDevice: device => dispatch(setSelectedDevice(device)),
    onSaveDeviceProject: (deviceId, projectData, hasBlocks) => dispatch(saveDeviceProject(deviceId, projectData, hasBlocks)),
    onOpenDeviceChangeConfirm: device => dispatch(openDeviceChangeConfirm(device)),
    onCloseDeviceChangeConfirm: () => dispatch(closeDeviceChangeConfirm()),
    onSetDeviceMode: mode => dispatch(setDeviceMode(mode)),
    onSetDeviceConnected: isConnected => dispatch(setDeviceConnected(isConnected)),
    onSetConnectionState: connectionState => dispatch(setConnectionState(connectionState)),
    onSetDevicePort: port => dispatch(setDevicePort(port)),
    onOpenConnectionModal: () => dispatch(openConnectionModal()),
    onSetConnectionExtensionId: extensionId => dispatch(setConnectionModalExtensionId(extensionId)),
    onSetCodeViewContent: content => dispatch(setCodeViewContent(content)),
    onSetCodeLocked: isLocked => dispatch(setCodeLocked(isLocked)),
    onSetManualCode: code => dispatch(setManualCode(code)),
    onRestoreDeviceState: deviceState => dispatch(restoreDeviceState(deviceState)),
    onSetCircuitData: data => dispatch(setCircuitData(data)),
    onClearCircuitData: () => dispatch(clearCircuitData())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(GUIComponent));
