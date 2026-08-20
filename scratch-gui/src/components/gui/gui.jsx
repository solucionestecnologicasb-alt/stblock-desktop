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
import StudentEvaluacionPlayer from '../student-evaluacion/student-evaluacion.jsx';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

import layout, {STAGE_SIZE_MODES, STAGE_DISPLAY_SIZES} from '../../lib/layout-constants';
import {resolveStageSize} from '../../lib/screen-utils';
import {themeMap} from '../../lib/themes';
import {
    checkForSTBlockUpdates,
    dismissRecommendedUpdate,
    exitSTBlockApp,
    installPendingSTBlockUpdate
} from '../../lib/stblock-updater';
import {STBLOCK_SKETCHFORGE_URL} from '../../lib/sketchforge-url';

import styles from './gui.css';

import classroomController from '../../lib/classroom/classroom-controller';
import {
    ROLES,
    SCOPES,
    canAddTarget,
    canDeleteTarget,
    canRenameTarget,
    canEditTarget
} from '../../lib/classroom/classroom-access';
import {
    isClassroomSimulatorAvailable,
    openClassroomSimulator
} from '../../lib/classroom/classroom-simulator';
import ClassroomSetupModal from '../classroom/classroom-setup-modal.jsx';
import ClassroomConsole from '../classroom/classroom-console.jsx';
import ClassroomRoster from '../classroom/classroom-roster.jsx';
import ClassroomBanner from '../classroom/classroom-banner.jsx';
import PythonKeyModal from '../python-panel/python-key-modal.jsx';
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
    clearCircuitData,
    getSketchforgeData,
    clearSketchforgeData
} from '../../reducers/device-mode';
import DeviceChangeConfirm from '../device-change-confirm/device-change-confirm.jsx';
import UploadProgress from '../upload-progress/upload-progress.jsx';
import STBlockLinkPrompt from '../stblock-link-prompt/stblock-link-prompt.jsx';
import PythonPanel from '../python-panel/python-panel.jsx';
import {
    generatePythonCode,
    generatePythonCodeWithMap,
    syncPythonToWorkspace,
    clearPythonBlocks,
    savePanelState as savePythonPanelState,
    loadPanelState as loadPythonPanelState,
    PythonExecutor
} from '../../lib/python';
import {ArduinoUploader, STBLOCK_LINK_DOWNLOAD_URL} from '../../lib/arduino-uploader';
import {openConnectionModal} from '../../reducers/modals';
import {setConnectionModalExtensionId} from '../../reducers/connection-modal';
import {getVelxioStateKey} from '../velxio-circuit/velxio-circuit.jsx';

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

const mergeClientProject = (serverJSONStr, clientJSONStr, assignedSpriteNames) => {
    try {
        const serverProject = JSON.parse(serverJSONStr);
        const clientProject = JSON.parse(clientJSONStr);
        if (!serverProject.targets || !clientProject.targets) {
            return {projectJSON: serverJSONStr, newSprites: []};
        }
        const clientTargetsByName = {};
        for (const target of clientProject.targets) {
            clientTargetsByName[target.name] = target;
        }
        const serverNames = new Set(serverProject.targets.map(t => t.name));
        const newSprites = [];
        // Recursos creados por el cliente que no existen en el proyecto del
        // servidor: se agregan tal cual (el cliente pasará a ser su dueño).
        for (const target of clientProject.targets) {
            if (!serverNames.has(target.name)) {
                serverProject.targets.push(target);
                newSprites.push(target.name);
            }
        }
        // Bloques de los recursos asignados a este cliente se toman de su proyecto.
        for (const serverTarget of serverProject.targets) {
            const clientTarget = clientTargetsByName[serverTarget.name];
            if (clientTarget && assignedSpriteNames.includes(serverTarget.name)) {
                serverTarget.blocks = clientTarget.blocks;
            }
        }
        return {projectJSON: JSON.stringify(serverProject), newSprites};
    } catch (e) {
        console.warn('[Classroom] Error al fusionar proyecto del cliente:', e);
        return {projectJSON: serverJSONStr, newSprites: []};
    }
};

// Convierte el mapa local de Python (indexado por ID de target, inestable entre
// máquinas y cargas) a un mapa indexado por NOMBRE del recurso, que sí se
// preserva en la serialización y coincide entre servidor y clientes.
const pythonCodesByName = (vm, pythonById) => {
    const result = {};
    if (!vm || !vm.runtime || !pythonById) return result;
    for (const target of vm.runtime.targets || []) {
        if (pythonById[target.id] !== undefined) {
            result[target.getName()] = pythonById[target.id];
        }
    }
    return result;
};

const projectSignature = (projectJSON, pythonCodes) => {
    let str = (typeof projectJSON === 'string' ? projectJSON : JSON.stringify(projectJSON));
    try {
        // Ignorar meta (agente/versión): difiere entre máquinas y al re-serializar
        // el proyecto tras loadProject, lo que provocaba reenvíos en bucle porque
        // la firma nunca coincidía con el JSON original recibido.
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed === 'object' && parsed.meta) {
            delete parsed.meta;
            str = JSON.stringify(parsed);
        }
    } catch (e) {
        // si no es JSON válido, usar la cadena tal cual
    }
    str += JSON.stringify(pythonCodes || {});
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return `${str.length}_${hash}`;
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
        sketchforgeSkf,
        deviceModeProgramMode,
        onRestoreDeviceState,
        onSetCircuitData,
        onClearCircuitData,
        onClearSketchforgeData,
        onSetSketchforgeData, // Evita propagar al DOM Box
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
    // Executor de Python (se crea una sola vez). Se usa para ejecutar el código
    // del panel Python cuando la bandera verde se pulsa en modo edición Python.
    const pythonExecutorRef = useRef(null);
    if (!pythonExecutorRef.current && vm) {
        pythonExecutorRef.current = new PythonExecutor(vm);
    }
    const pythonExecutor = pythonExecutorRef.current;
    // Refs/estado para el puente con SketchForge 3D (iframe "Diseño 3D").
    // El .skf editable se captura desde el iframe y se empaqueta en el .flynt
    // para que "Guardar en tu ordenador" incluya también el proyecto 3D.
    const sketchforgeFrameRef = useRef(null);
    const sketchforgeReadyRef = useRef(false); // shell de SketchForge cargado (page.tsx)
    const sketchforgeEditorReadyRef = useRef(false); // editor de SketchForge montado
    const sketchforgeCacheRef = useRef(null); // {bytes: Uint8Array} último .skf capturado
    const sketchforgeResolversRef = useRef(new Map()); // requestId -> resolver
    const sketchforgeImportQueueRef = useRef([]); // importaciones 3D pendientes de la IA (cola)
    const sketchforgeImportResolversRef = useRef(new Map()); // requestId -> resolver de import 3D
    const sketchforgeCaptureTimerRef = useRef(null); // debounce de captura
    const sketchforgeRestoredRef = useRef(false); // evita re-importar el .skf restaurado
    const [sketchforgeReady, setSketchforgeReady] = useState(false);
    const sketchforgeLatestReduxRef = useRef(sketchforgeSkf);
    sketchforgeLatestReduxRef.current = sketchforgeSkf;
    const [workspaceHandle, setWorkspaceHandle] = useState(null);
    const workspaceHandleRef = useRef(null);
    useEffect(() => {
        workspaceHandleRef.current = workspaceHandle;
    }, [workspaceHandle]);
    const [mentorGuidanceMsg, setMentorGuidanceMsg] = useState();
    const [showSTBlockLinkPrompt, setShowSTBlockLinkPrompt] = useState(false);
    const [stbBoardPinoutVisible, setStbBoardPinoutVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [updateInstalling, setUpdateInstalling] = useState(false);

    const [classroomSetupOpen, setClassroomSetupOpen] = useState(false);
    const [classroomConsoleOpen, setClassroomConsoleOpen] = useState(false);
    const [classroomRosterOpen, setClassroomRosterOpen] = useState(false);
    const [classroomState, setClassroomState] = useState(() => classroomController.getState());
    const classroomStateRef = useRef(classroomState);
    const classroomApplyingRemoteRef = useRef(false);
    const classroomDebounceRef = useRef(null);
    const classroomApplyTimerRef = useRef(null);
    const lastSnapshotSkipRef = useRef(null);
    const lastAppliedRemoteSigRef = useRef(null);
    const lastSentSigRef = useRef(null);
    const remoteAppliedPythonRef = useRef(null);
    const userHasInteractedRef = useRef(false);
    // Última interacción REAL del usuario (edición de bloques/python, crear/borrar
    // sprites). Se usa con una ventana de tiempo para el guard: los eventos de
    // runtime (PROJECT_CHANGED, var_change) durante la ejecución de la clase no
    // cuentan como interacción y no deben bloquear los broadcasts entrantes.
    const lastRealInteractionRef = useRef(0);
    const lastPythonFloodLogRef = useRef(0);

    // Marca una interacción real del usuario. No cuenta cuando se está aplicando
    // un proyecto remoto (loadProject dispara eventos de targets/bloques que no
    // son del usuario). 'source' identifica qué la provocó (diagnóstico).
    const lastInteractionSourceRef = useRef('none');
    const markInteraction = useCallback((source) => {
        if (classroomApplyingRemoteRef.current) return;
        lastRealInteractionRef.current = Date.now();
        lastInteractionSourceRef.current = source || '?';
        userHasInteractedRef.current = true;
    }, []);

    const [pythonKeyLock, setPythonKeyLock] = useState(() => {
        try {
            return localStorage.getItem('stblock_python_key_lock');
        } catch (e) {
            return null;
        }
    });
    const isPythonKeyLocked = pythonKeyLock !== null;
    const [pythonKeyModalOpen, setPythonKeyModalOpen] = useState(false);
    const [pythonKeyModalMode, setPythonKeyModalMode] = useState('set');

    useEffect(() => {
        try {
            if (pythonKeyLock) {
                localStorage.setItem('stblock_python_key_lock', pythonKeyLock);
            } else {
                localStorage.removeItem('stblock_python_key_lock');
            }
        } catch (e) {
            console.warn('[GUI] Error saving pythonKeyLock:', e);
        }
    }, [pythonKeyLock]);

    classroomStateRef.current = classroomState;

    useEffect(() => {
        const unsub = classroomController.subscribe(setClassroomState);
        return () => unsub();
    }, []);

    // Al conectar la sesión, reiniciar la ventana de interacción para que los
    // broadcasts entrantes (p. ej. sprites nuevos del servidor) no queden
    // bloqueados por interacciones previas al ingreso.
    useEffect(() => {
        if (classroomState.connectionState === 'connected') {
            lastRealInteractionRef.current = 0;
            userHasInteractedRef.current = false;
        }
    }, [classroomState.connectionState]);

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

    const pythonCodePerTargetRef = useRef(pythonCodePerTarget);
    useEffect(() => {
        pythonCodePerTargetRef.current = pythonCodePerTarget;
    }, [pythonCodePerTarget]);

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
        // Edición real del usuario en el panel Python: cuenta como interacción
        // para el guard (evita que un broadcast pise lo que está escribiendo).
        markInteraction('python-user');
    }, [currentTargetId, markInteraction]);

    const pythonGenDebounceRef = useRef(null);
    const pythonPanelLockedRef = useRef(pythonPanelLocked);

    // Mantener el ref actualizado con el estado de bloqueo
    // y regenerar código Python cuando se bloquea el panel
    useEffect(() => {
        const wasUnlocked = !pythonPanelLockedRef.current;
        pythonPanelLockedRef.current = pythonPanelLocked;

        // Si el panel se acaba de bloquear, regenerar Python desde los bloques
        if (pythonPanelLocked && wasUnlocked && workspaceHandle?.workspace) {
            try {
                // Solo regenerar si hay bloques manuales reales en el workspace.
                // Si el usuario solo escribió Python (sin bloques manuales), los
                // únicos bloques serían py_block_* sintetizados: limpiarlos y
                // regenerar borraría su código, así que se conserva tal cual.
                const vmBlocks = vm && vm.editingTarget && vm.editingTarget.blocks._blocks;
                const hasManualBlocks = vmBlocks ?
                    Object.keys(vmBlocks).some(id => !id.startsWith('py_block_')) :
                    false;
                if (!hasManualBlocks) return;

                // Limpiar los bloques sintetizados (py_block_*) del workspace
                // para que el código Python no se regenere a partir de bloques
                // que ya provenían de código Python (evita duplicados).
                clearPythonBlocks(vm, false);
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
        vm.on('targetsUpdate', handleTargetChange);

        return () => {
            vm.removeListener('targetsUpdate', handleTargetChange);
        };
    }, [vm, currentTargetId, workspaceHandle]);

    // Guardar códigos por target en localStorage cuando cambien (con debounce
    // ~800ms: escribir en cada tecla era innecesario). Se hace flush al desmontar.
    const pythonLocalStorageTimerRef = useRef(null);
    useEffect(() => {
        if (pythonLocalStorageTimerRef.current) {
            clearTimeout(pythonLocalStorageTimerRef.current);
        }
        pythonLocalStorageTimerRef.current = setTimeout(() => {
            pythonLocalStorageTimerRef.current = null;
            try {
                localStorage.setItem('stblock_python_per_target', JSON.stringify(pythonCodePerTarget));
            } catch (e) {
                console.warn('[GUI] Error guardando Python por target:', e);
            }
        }, 800);
        return () => {
            if (pythonLocalStorageTimerRef.current) {
                clearTimeout(pythonLocalStorageTimerRef.current);
                pythonLocalStorageTimerRef.current = null;
            }
        };
    }, [pythonCodePerTarget]);

    // Flush pendiente al desmontar para no perder el último cambio por el debounce
    useEffect(() => () => {
        try {
            localStorage.setItem('stblock_python_per_target', JSON.stringify(pythonCodePerTargetRef.current));
        } catch (e) {
            console.warn('[GUI] Error guardando Python por target al desmontar:', e);
        }
    }, []);

    const pythonBlockCenterTimerRef = useRef(null);
    const positionedPythonTargetsRef = useRef(new Set());
    useEffect(() => () => {
        if (pythonBlockCenterTimerRef.current) {
            clearTimeout(pythonBlockCenterTimerRef.current);
        }
    }, []);

    // Memoizada para que onSyncToBlocks no cambie de referencia en cada render.
    // El panel puede pedir que se centre el primer bloque una vez que Blockly
    // haya procesado el WORKSPACE_UPDATE emitido por la VM.
    const handleSyncToBlocks = useCallback((code, options = {}) => {
        const result = syncPythonToWorkspace(vm, code);
        const targetIdAtSync = vm.editingTarget && vm.editingTarget.id;
        const firstBlockId = result && result.topBlockIds && result.topBlockIds[0];
        if (result.success && options.centerGeneratedBlocks && targetIdAtSync &&
            result.blocksCreated === 0) {
            positionedPythonTargetsRef.current.delete(targetIdAtSync);
        }
        if (!result.success || !options.centerGeneratedBlocks || !firstBlockId ||
            !targetIdAtSync || positionedPythonTargetsRef.current.has(targetIdAtSync) ||
            !workspaceHandle || !workspaceHandle.workspace) {
            return result;
        }

        if (pythonBlockCenterTimerRef.current) {
            clearTimeout(pythonBlockCenterTimerRef.current);
        }
        const workspace = workspaceHandle.workspace;
        const centerWhenReady = attemptsLeft => {
            if (!vm.editingTarget || vm.editingTarget.id !== targetIdAtSync) return;
            const renderedBlock = typeof workspace.getBlockById === 'function' ?
                workspace.getBlockById(firstBlockId) : null;
            if (renderedBlock) {
                const metrics = typeof workspace.getMetrics === 'function' ?
                    workspace.getMetrics() : null;
                const blockPosition = typeof renderedBlock.getRelativeToSurfaceXY === 'function' ?
                    renderedBlock.getRelativeToSurfaceXY() : null;
                const blockSize = typeof renderedBlock.getHeightWidth === 'function' ?
                    renderedBlock.getHeightWidth() : null;
                const panel = document.querySelector('[data-stblock-python-panel="true"]');
                const panelWidth = panel ? panel.getBoundingClientRect().width : 0;

                if (workspace.scrollbar && metrics && blockPosition && blockSize) {
                    const visibleWidth = Math.max(240, metrics.viewWidth - panelWidth);
                    const targetScreenX = Math.max(140, visibleWidth * 0.38);
                    const workspaceScale = workspace.scale || 1;
                    const blockCenterX = (blockPosition.x + (blockSize.width / 2)) * workspaceScale;
                    const blockCenterY = (blockPosition.y + (blockSize.height / 2)) * workspaceScale;
                    const scrollX = blockCenterX - metrics.contentLeft - targetScreenX;
                    const scrollY = blockCenterY - metrics.contentTop - (metrics.viewHeight / 2);
                    workspace.scrollbar.set(scrollX, scrollY);
                } else if (typeof workspace.centerOnBlock === 'function') {
                    workspace.centerOnBlock(firstBlockId);
                }
                positionedPythonTargetsRef.current.add(targetIdAtSync);
                pythonBlockCenterTimerRef.current = null;
                return;
            }
            if (attemptsLeft > 0) {
                pythonBlockCenterTimerRef.current = setTimeout(
                    () => centerWhenReady(attemptsLeft - 1),
                    40
                );
            }
        };
        pythonBlockCenterTimerRef.current = setTimeout(() => centerWhenReady(4), 0);
        return result;
    }, [vm, workspaceHandle]);

    const handleClassroomRemoteUpdate = useCallback(payload => {
        if (!vm) return;
        const {projectJSON, pythonCodes, sourceClientId} = payload;
        if (!projectJSON) return;

        const role = classroomStateRef.current.role;
        const tNames = (vm.runtime && vm.runtime.targets) ? vm.runtime.targets.map(t => t.getName()).join(', ') : 'sin-VM';
        

        // En el cliente, no sobrescribir mientras el usuario esté escribiendo AHORA
        // MISMO (ventana de 2s desde la última interacción real). Los eventos de
        // runtime (PROJECT_CHANGED/var_change durante class-run) no son interacción
        // y NO bloquean los broadcasts. El snapshot inicial (sourceClientId null)
        // SIEMPRE se aplica: es el proyecto del servidor al entrar.
        if (role !== 'servidor' && sourceClientId &&
            (Date.now() - lastRealInteractionRef.current < 2000)) {
            
            return;
        }

        let finalProjectJSON = projectJSON;
        let finalPythonCodes = pythonCodes || {};

        if (role === 'servidor' && sourceClientId) {
            const assignments = classroomStateRef.current.assignments || {};
            const assignedSpriteNames = Object.keys(assignments).filter(
                name => assignments[name] === sourceClientId
            );
            
            try {
                const serverProjectJSON = vm.toJSON();
                const serverNames = JSON.parse(serverProjectJSON).targets.map(t => t.name);
                const clientNames = JSON.parse(projectJSON).targets.map(t => t.name);
                
                const mergeResult = mergeClientProject(serverProjectJSON, projectJSON, assignedSpriteNames);
                finalProjectJSON = mergeResult.projectJSON;
                const mergedNames = JSON.parse(finalProjectJSON).targets.map(t => t.name);
                
                // Los recursos que el cliente creó en su sesión (y que no existen
                // en el proyecto del servidor) pasan a ser suyos, para que pueda
                // seguir editándolos tras el broadcast.
                for (const name of mergeResult.newSprites) {
                    
                    classroomController.assignResource(name, sourceClientId);
                }
            } catch (err) {
                console.warn('[Classroom] Error serializando proyecto del servidor para fusionar:', err);
            }
            // Los códigos Python viajan indexados por NOMBRE (ver pythonCodesByName).
            const mergedPython = pythonCodesByName(vm, pythonCodePerTargetRef.current);
            for (const name of assignedSpriteNames) {
                if (pythonCodes[name] !== undefined) {
                    mergedPython[name] = pythonCodes[name];
                }
            }
            finalPythonCodes = mergedPython;
            // El servidor es la autoridad: difunde el proyecto FUSIONADO (no el
            // crudo del cliente) para que todos los clientes vean el estado
            // combinado. El controller ya no reenvía el payload crudo.
            lastSentSigRef.current = projectSignature(finalProjectJSON, finalPythonCodes);
            
            classroomController.sendProjectUpdate({projectJSON: finalProjectJSON, pythonCodes: finalPythonCodes});
        } else {
            
        }

        if (classroomDebounceRef.current) {
            clearTimeout(classroomDebounceRef.current);
            classroomDebounceRef.current = null;
        }
        lastAppliedRemoteSigRef.current = projectSignature(finalProjectJSON, finalPythonCodes);
        classroomApplyingRemoteRef.current = true;
        userHasInteractedRef.current = false;
        // Garantía: aunque loadProject tarde demasiado (p. ej. un disfraz del
        // servidor que el cliente no puede descargar del CDN), liberar los refs
        // para no bloquear el envío del cliente para siempre.
        const releaseRefs = () => {
            clearTimeout(classroomApplyTimerRef.current);
            classroomApplyTimerRef.current = null;
            classroomApplyingRemoteRef.current = false;
            userHasInteractedRef.current = false;
            // La carga remota no es interacción del usuario: reiniciar la ventana
            // para que los broadcasts entrantes no queden bloqueados por eventos
            // tardíos de la carga (targetsUpdate, var_create, etc.).
            lastRealInteractionRef.current = 0;
        };
        clearTimeout(classroomApplyTimerRef.current);
        classroomApplyTimerRef.current = setTimeout(releaseRefs, 8000);
        const aplicandoNames = JSON.parse(finalProjectJSON).targets.map(t => t.name).join(', ');
        
        try {
            Promise.resolve(vm.loadProject(finalProjectJSON)).then(() => {
                if (vm.runtime && vm.runtime.targets) {
                    
                    const sprite = vm.runtime.targets.find(t => !t.isStage);
                    if (sprite) {
                        vm.setEditingTarget(sprite.id);
                    } else if (vm.runtime.targets.length > 0) {
                        vm.setEditingTarget(vm.runtime.targets[0].id);
                    }
                }
                // Los códigos remotos llegan por NOMBRE; se convierten a los ids
                // locales recién generados tras cargar el proyecto.
                const pythonById = {};
                for (const target of vm.runtime.targets || []) {
                    if (finalPythonCodes[target.getName()] !== undefined) {
                        pythonById[target.id] = finalPythonCodes[target.getName()];
                    }
                }
                remoteAppliedPythonRef.current = pythonById;
                setPythonCodePerTarget(pythonById);
                // Fijar la firma de referencia a la serialización REAL del VM local.
                // toJSON() regenera meta/ids/orden, por lo que nunca coincide con el
                // JSON recibido; usar la serialización local evita el reenvío en bucle
                // del polling (que comparaba contra el JSON remoto recibido).
                lastAppliedRemoteSigRef.current = projectSignature(
                    vm.toJSON(),
                    pythonCodesByName(vm, pythonById)
                );
                
                setTimeout(() => {
                    classroomApplyingRemoteRef.current = false;
                    userHasInteractedRef.current = false;
                    lastRealInteractionRef.current = 0;
                }, 300);
                clearTimeout(classroomApplyTimerRef.current);
                classroomApplyTimerRef.current = null;
            })
                .catch(e => {
                    console.warn('[Classroom] Error aplicando proyecto remoto:', e);
                    releaseRefs();
                });
        } catch (e) {
            console.warn('[Classroom] Error aplicando proyecto remoto:', e);
            releaseRefs();
        }
    }, [vm, setPythonCodePerTarget, markInteraction]);

    useEffect(() => {
        if (!vm) return;
        classroomController.setConfig({
            onRemoteProjectUpdate: handleClassroomRemoteUpdate,
            // El controlador invoca onClientAccepted al aceptar una solicitud.
            onClientAccepted: client => {
                
                try {
                    const projectJSON = vm.toJSON();
                    const pythonCodes = pythonCodesByName(vm, pythonCodePerTargetRef.current);
                    classroomController.sendSnapshotToClient(client.id, {projectJSON, pythonCodes});
                } catch (e) {
                    console.warn('[Classroom] Error enviando snapshot inicial al cliente:', e);
                }
            },
            onSessionClosed: () => {
                setClassroomSetupOpen(false);
                setClassroomConsoleOpen(false);
                setClassroomRosterOpen(false);
            },
            onClassRun: () => {
                userHasInteractedRef.current = false;
                if (vm) {
                    vm.stopAll();
                    vm.greenFlag();
                }
            },
            onClassStop: () => {
                if (vm) {
                    vm.stopAll();
                }
            }
        });
    }, [vm, handleClassroomRemoteUpdate]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        let joinData = null;
        try {
            const saved = localStorage.getItem('stblock_classroom_sim_join');
            if (saved) {
                joinData = JSON.parse(saved);
                localStorage.removeItem('stblock_classroom_sim_join');
            }
        } catch (e) {
            console.warn('[Classroom] Error leyendo joinData de localStorage:', e);
        }

        const params = new URLSearchParams(window.location.search);
        const isSimulatorClient = params.get('classroomClient') === '1' || joinData !== null;
        
        if (!isSimulatorClient) return;

        const host = joinData ? joinData.host : (params.get('host') || '127.0.0.1');
        const port = joinData ? (joinData.port || 8870) : parseInt(params.get('port') || '8870', 10);
        const code = joinData ? joinData.code : params.get('code');
        const name = joinData ? joinData.name : (params.get('name') || 'PC-2 (simulada)');

        if (!code) {
            console.warn('[Classroom] Simulador: falta el código de sesión.');
            return;
        }

        setTimeout(() => {
            
            classroomController.joinSession({host, port, code, name});
        }, 1000);
    }, []);

    const queueClassroomSnapshot = useCallback(() => {
        // Diagnóstico: registrar cada gate que bloquee el envío, pero solo si el
        // motivo cambia (evita inundar la consola con eventos repetidos).
        const logSkip = reason => {
            if (lastSnapshotSkipRef.current !== reason) {
                lastSnapshotSkipRef.current = reason;
                
            }
        };
        const role = classroomStateRef.current.role;
        const tNames = vm && vm.runtime ? vm.runtime.targets.map(t => t.getName()).join(', ') : 'sin-VM';
        if (classroomApplyingRemoteRef.current) {
            logSkip('aplicando remoto');
            
            return;
        }
        if (!classroomStateRef.current.active) {
            logSkip('sesión inactiva');
            return;
        }
        if (classroomStateRef.current.connectionState !== 'connected') {
            logSkip(`estado ${classroomStateRef.current.connectionState}`);
            return;
        }
        if (!vm) {
            logSkip('sin VM');
            return;
        }
        // No bloquear por vm.runtime.projectRunning: cuando el servidor ejecuta la
        // clase, projectRunning queda true en todos los participantes y el bloqueo
        // impediría sincronizar cualquier cambio (código de cliente, sprites nuevos,
        // etc.) mientras la clase está "corriendo". El contenido de toJSON (bloques,
        // disfraces, código Python) es estable durante la ejecución.
        if (!userHasInteractedRef.current) {
            logSkip('sin interacción del usuario');
            
            return;
        }
        lastSnapshotSkipRef.current = null;

        // NO reiniciar un envío ya programado: un aluvión de eventos (p. ej.
        // regeneración automática de Python tras crear un sprite) no debe poder
        // cancelar el snapshot pendiente. El primer evento dispara el envío a los
        // 800ms con el estado acumulado; los eventos siguientes se descartan.
        if (classroomDebounceRef.current) {
            
            return;
        }
        
        classroomDebounceRef.current = setTimeout(() => {
            classroomDebounceRef.current = null;
            try {
                const projectJSON = vm.toJSON();
                const pythonCodes = pythonCodesByName(vm, pythonCodePerTargetRef.current);
                const sig = projectSignature(projectJSON, pythonCodes);
                
                if (sig === lastAppliedRemoteSigRef.current || sig === lastSentSigRef.current) {
                    
                    userHasInteractedRef.current = false;
                    return;
                }
                lastSentSigRef.current = sig;
                
                classroomController.sendProjectUpdate({projectJSON, pythonCodes});
                userHasInteractedRef.current = false;
            } catch (e) {
                console.warn('[Classroom] Error generando snapshot:', e);
            }
        }, 800);
    }, [vm]);

    useEffect(() => {
        if (!vm || !vm.runtime || !classroomState.active) return;
        // 'targetsUpdate' se emite en el VM tanto por cambios estructurales
        // (crear/borrar/renombrar sprites, interacción real del usuario) como por
        // MOVIMIENTO de sprites durante la ejecución (class-run), que se dispara a
        // ~60fps y NO es interacción. Se filtra por cambio del conjunto de nombres.
        let lastTargetNames = '';
        const handleTargetsUpdate = () => {
            const names = (vm.runtime.targets || []).map(t => t.getName()).join('|');
            if (names === lastTargetNames) {
                
                return;
            }
            lastTargetNames = names;
            
            markInteraction('targetsUpdate');
            queueClassroomSnapshot();
        };
        // PROJECT_CHANGED (runtime) es demasiado ruidoso: también se dispara por
        // cambios de variables durante la ejecución (class-run). No es interacción
        // del usuario y no debe encolar envíos; los cambios reales los capturan
        // targetsUpdate y el changeListener del workspace.
        let lastProjectChangedLog = 0;
        const handleProjectChanged = () => {
            const now = Date.now();
            if (now - lastProjectChangedLog > 5000) {
                lastProjectChangedLog = now;
                
            }
        };
        // El workspace de Blockly dispara eventos por edición de bloques del
        // usuario Y por cambios de variables durante la ejecución (var_change).
        // Solo los eventos estructurales de bloques cuentan como interacción.
        let lastNoiseLog = 0;
        const handleBlocksChange = (event) => {
            const et = event && event.type;
            // SOLO ediciones estructurales de bloques cuentan como interacción real.
            // Los eventos var_* (var_create/var_rename/var_change/var_delete) se
            // disparan constantemente al recrear el modelo de variables del workspace
            // tras cargar el proyecto (y durante class-run): NO son del usuario.
            const blockEditTypes = ['create', 'block_create', 'add', 'block_add', 'move', 'block_move',
                'delete', 'block_delete', 'remove', 'block_remove', 'change', 'block_change'];
            const isUserEdit = blockEditTypes.indexOf(et) !== -1;
            if (!isUserEdit) {
                const now = Date.now();
                if (now - lastNoiseLog > 5000) {
                    lastNoiseLog = now;
                    
                }
                return;
            }
            
            markInteraction(`bloque:${et}`);
            queueClassroomSnapshot();
        };
        vm.runtime.on('PROJECT_CHANGED', handleProjectChanged);
        vm.on('targetsUpdate', handleTargetsUpdate);

        let workspace = workspaceHandle?.workspace;
        if (workspace) {
            workspace.addChangeListener(handleBlocksChange);
        }
        return () => {
            vm.runtime.removeListener('PROJECT_CHANGED', handleProjectChanged);
            vm.removeListener('targetsUpdate', handleTargetsUpdate);
            if (workspace) {
                workspace.removeChangeListener(handleBlocksChange);
            }
        };
    }, [vm, workspaceHandle, queueClassroomSnapshot, markInteraction, classroomState.active]);

    // Red de seguridad: sincronización por sondeo. Aunque ningún listener de
    // eventos dispare (workspace, targetsUpdate...), si la firma del proyecto
    // cambió desde el último envío se difunde igualmente. Garantiza que el
    // servidor y los clientes vean los cambios en unos segundos.
    useEffect(() => {
        if (!vm) return;
        const interval = setInterval(() => {
            if (classroomApplyingRemoteRef.current) {
                
                return;
            }
            // Durante class-run el toJSON cambia por variables/posiciones de la
            // ejecución; sondear reenviaría en bucle. Los cambios reales (bloques,
            // sprites) se envían por la cola de eventos, que sí sigue activa.
            if (classroomStateRef.current.classRunning) {
                
                return;
            }
            if (!classroomStateRef.current.active) return;
            if (classroomStateRef.current.connectionState !== 'connected') return;
            try {
                const projectJSON = vm.toJSON();
                const pythonCodes = pythonCodesByName(vm, pythonCodePerTargetRef.current);
                const sig = projectSignature(projectJSON, pythonCodes);
                const targets = (vm.runtime.targets || []).map(t => t.getName()).join(', ');
                
                if (sig === lastSentSigRef.current || sig === lastAppliedRemoteSigRef.current) {
                    return;
                }
                lastSentSigRef.current = sig;
                
                classroomController.sendProjectUpdate({projectJSON, pythonCodes});
                userHasInteractedRef.current = false;
            } catch (e) {
                // ignore: reintenta en el siguiente tick
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [vm]);

    useEffect(() => {
        // El cambio de pythonCodePerTarget puede venir de:
        //  - Aplicación remota (setPythonCodePerTarget(pythonById)): la referencia
        //    coincide con remoteAppliedPythonRef → ignorar.
        //  - Edición real del usuario: la marca setPythonCode (python-user).
        //  - Regeneración automática desde bloques (línea 601): no es interacción.
        // Aquí SOLO se encola el envío; NO se marca interacción para que el ruido
        // de regeneración automática no bloquee los broadcasts entrantes.
        if (pythonCodePerTarget !== remoteAppliedPythonRef.current) {
            const now = Date.now();
            if (now - lastPythonFloodLogRef.current > 3000) {
                lastPythonFloodLogRef.current = now;
                
            }
            queueClassroomSnapshot();
        }
    }, [pythonCodePerTarget, queueClassroomSnapshot]);

    // Guardar estado del panel Python cuando cambie
    useEffect(() => {
        savePythonPanelState({
            isOpen: pythonPanelOpen,
            isLocked: pythonPanelLocked,
            customCode: '' // Ya no guardamos código aquí, se guarda por target
        });
    }, [pythonPanelOpen, pythonPanelLocked]);

    // Forzar el modo Python cuando el candado con clave está activo:
    // panel abierto y sin bloqueo de edición (bloques solo de lectura).
    useEffect(() => {
        if (isPythonKeyLocked) {
            setPythonPanelOpen(true);
            setPythonPanelLocked(false);
        }
    }, [isPythonKeyLocked]);

    // Handlers del candado con clave
    const handleRequestKeyLock = useCallback(() => {
        setPythonKeyModalMode('set');
        setPythonKeyModalOpen(true);
    }, []);

    const handleRequestKeyUnlock = useCallback(() => {
        setPythonKeyModalMode('enter');
        setPythonKeyModalOpen(true);
    }, []);

    const handleSetKeyLock = useCallback(key => {
        setPythonKeyLock(key);
        setPythonKeyModalOpen(false);
    }, []);

    const handleTryUnlock = useCallback(enteredKey => {
        if (pythonKeyLock && enteredKey === pythonKeyLock) {
            setPythonKeyLock(null);
            setPythonKeyModalOpen(false);
            return true;
        }
        return false;
    }, [pythonKeyLock]);

    const [classroomTargets, setClassroomTargets] = useState([]);

    const removePythonCodeForTarget = useCallback(targetId => {
        const removedCode = pythonCodePerTargetRef.current[targetId];
        setPythonCodePerTarget(previousCodes => {
            if (!Object.prototype.hasOwnProperty.call(previousCodes, targetId)) {
                return previousCodes;
            }
            const nextCodes = {...previousCodes};
            delete nextCodes[targetId];
            return nextCodes;
        });
        return removedCode;
    }, []);

    const restorePythonCodeForTarget = useCallback((targetId, code) => {
        if (typeof code !== 'string') return;
        setPythonCodePerTarget(previousCodes => ({
            ...previousCodes,
            [targetId]: code
        }));
    }, []);

    // Sincronizar la lista de recursos vivos (personajes/fondos) con el VM.
    // Se usan los targets reales (tienen .id/.isStage/.getName()) y se
    // actualiza al crear/borrar sprites o cargar proyecto.
    //
    // IMPORTANTE sobre los eventos:
    //  - 'targetsUpdate' se emite en el *VM* (no en runtime) al cargar proyecto
    //    y al crear/borrar/renombrar sprites (virtual-machine.js emitTargetsUpdate).
    //  - 'PROJECT_LOADED' se emite en el runtime cuando termina de cargarse un proyecto.
    // Los cambios de posición también emiten targetsUpdate; syncTargets compara
    // una firma estructural antes de actualizar React.
    useEffect(() => {
        if (!vm || !vm.runtime) return;
        let lastTargetSignature = '';
        const syncTargets = () => {
            // Excluir clones: solo se pueden asignar personajes/fondos originales.
            const originalTargets = (vm.runtime.targets || []).filter(
                t => !Object.prototype.hasOwnProperty.call(t, 'isOriginal') || t.isOriginal
            );
            const signature = originalTargets.map(target =>
                `${target.id}:${target.isStage ? 'stage' : 'sprite'}:${target.getName()}`
            ).join('|');
            if (signature === lastTargetSignature) return;
            lastTargetSignature = signature;
            setClassroomTargets([...originalTargets]);
        };
        const pruneOrphanedPythonCodes = () => {
            const liveTargetIds = new Set((vm.runtime.targets || [])
                .filter(target => !Object.prototype.hasOwnProperty.call(target, 'isOriginal') || target.isOriginal)
                .map(target => target.id));
            if (liveTargetIds.size === 0) return;
            setPythonCodePerTarget(previousCodes => {
                const nextCodes = {};
                let changed = false;
                for (const [targetId, code] of Object.entries(previousCodes)) {
                    if (liveTargetIds.has(targetId)) {
                        nextCodes[targetId] = code;
                    } else {
                        changed = true;
                    }
                }
                return changed ? nextCodes : previousCodes;
            });
        };

        // Regenera Python desde los bloques py_block_* del target tras cargar un
        // proyecto. Reintenta porque el workspace de Blockly se puebla de forma
        // asíncrona después de PROJECT_LOADED (workspaceUpdate llega más tarde).
        const tryRegeneratePythonFromBlocks = targetId => {
            let attempts = 0;
            const maxAttempts = 40;
            const attempt = () => {
                attempts++;
                // Si el usuario ya escribió código para este target, no pisotearlo.
                if (pythonCodePerTargetRef.current[targetId]) return;
                // Si el target editado cambió (el usuario lo cambió), abortar:
                // el workspace mostraría los bloques de OTRO target y generaríamos
                // código incorrecto para el target original.
                if (vm.editingTarget && vm.editingTarget.id !== targetId) return;
                try {
                    const workspace = workspaceHandleRef.current && workspaceHandleRef.current.workspace;
                    const target = vm.runtime.getTargetById(targetId);
                    const vmBlocks = target && target.blocks && target.blocks._blocks;
                    const hasVMPyBlocks = vmBlocks &&
                        Object.keys(vmBlocks).some(id => id.startsWith('py_block_'));
                    const wsHasPyBlocks = workspace && workspace.getAllBlocks(false)
                        .some(b => b.id && b.id.startsWith('py_block_'));
                    if (!hasVMPyBlocks || !wsHasPyBlocks) {
                        if (attempts < maxAttempts) setTimeout(attempt, 100);
                        return;
                    }
                    // Re-chequear justo antes de escribir: si el usuario ya escribió
                    // código mientras esperábamos al workspace, no pisotearlo.
                    if (pythonCodePerTargetRef.current[targetId]) return;
                    const result = generatePythonCodeWithMap(workspace);
                    if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                    setPythonCodePerTarget(prev => ({
                        ...prev,
                        [targetId]: result.code
                    }));
                } catch (e) {
                    if (attempts < maxAttempts) {
                        setTimeout(attempt, 100);
                    } else {
                        console.warn('[GUI] Error regenerando Python tras cargar:', e);
                    }
                }
            };
            setTimeout(attempt, 100);
        };

        // Restaurar códigos Python tras cargar un proyecto. Los ids de target se
        // regeneran en cada carga (sb3.deserialize crea ids nuevos), así que los
        // códigos viajan indexados por NOMBRE de recurso (guardados en el .flynt
        // por sb-file-uploader en localStorage antes de loadProject). Si no hay
        // código guardado (proyectos antiguos), se regenera desde los bloques.
        const restorePythonAfterLoad = () => {
            if (!vm || !vm.runtime) return;
            let storedCodes = null;
            try {
                const raw = localStorage.getItem('stblock_python_project_codes');
                if (raw) {
                    storedCodes = JSON.parse(raw);
                    localStorage.removeItem('stblock_python_project_codes');
                }
            } catch (_) {}

            const liveTargets = (vm.runtime.targets || []).filter(
                t => !Object.prototype.hasOwnProperty.call(t, 'isOriginal') || t.isOriginal
            );
            let restoredCurrent = false;

            if (storedCodes && typeof storedCodes === 'object') {
                const hasAny = Object.keys(storedCodes)
                    .some(k => typeof storedCodes[k] === 'string');
                if (hasAny) {
                    setPythonCodePerTarget(prev => {
                        const next = {...prev};
                        let changed = false;
                        for (const target of liveTargets) {
                            const name = target.getName();
                            if (typeof storedCodes[name] === 'string' &&
                                next[target.id] !== storedCodes[name]) {
                                next[target.id] = storedCodes[name];
                                changed = true;
                            }
                        }
                        return changed ? next : prev;
                    });
                    const editingTarget = vm.editingTarget;
                    if (editingTarget && typeof storedCodes[editingTarget.getName()] === 'string') {
                        restoredCurrent = true;
                    }
                }
            }

            // Fallback: si el target actual no tiene código (ni restaurado ni
            // previo), regenerarlo desde los bloques py_block_*. Esto cubre los
            // proyectos .flynt guardados antes de persistir el texto y las cargas
            // por Modo Aula (que no pasan por sb-file-uploader).
            const editingId = vm.editingTarget && vm.editingTarget.id;
            if (editingId && !restoredCurrent && !pythonCodePerTargetRef.current[editingId]) {
                tryRegeneratePythonFromBlocks(editingId);
            }
        };
        syncTargets();
        vm.on('targetsUpdate', syncTargets);
        vm.runtime.on('PROJECT_LOADED', syncTargets);
        vm.runtime.on('PROJECT_LOADED', pruneOrphanedPythonCodes);
        vm.runtime.on('PROJECT_LOADED', restorePythonAfterLoad);
        return () => {
            vm.removeListener('targetsUpdate', syncTargets);
            vm.runtime.removeListener('PROJECT_LOADED', syncTargets);
            vm.runtime.removeListener('PROJECT_LOADED', pruneOrphanedPythonCodes);
            vm.runtime.removeListener('PROJECT_LOADED', restorePythonAfterLoad);
        };
    }, [vm]);

    const classroomRole = classroomState.active ? classroomState.role : null;
    const classroomScope = classroomState.active && classroomState.config ? classroomState.config.scope : null;
    const classroomAssignments = classroomState.active ? (classroomState.assignments || {}) : {};
    const classroomMyId = classroomState.active ? classroomState.clientId : null;
    // Un cliente de Modo Aula solo trabaja en Programación; Electrónica,
    // Diseño 3D y Evaluación quedan bloqueadas.
    const classroomLockedModes = classroomRole === ROLES.CLIENTE ? ['device', 'diseno', 'evaluacion'] : [];

    // Defensa: si un cliente quedara en un modo no permitido (p. ej. por un
    // proyecto restaurado), volverlo a Programación.
    useEffect(() => {
        if (classroomRole === ROLES.CLIENTE && deviceMode !== 'game') {
            onSetDeviceMode('game');
        }
    }, [classroomRole, deviceMode, onSetDeviceMode]);

    const classroomCanAdd = canAddTarget(classroomRole);
    const classroomCanDelete = canDeleteTarget(classroomRole);
    const classroomCanRename = canRenameTarget(classroomRole);
    // Los permisos se evalúan por NOMBRE del recurso: el id del target se
    // regenera al cargar el proyecto (sb3.deserialize crea ids nuevos), mientras
    // que el nombre se preserva y coincide entre servidor y clientes.
    const classroomEditingTargetName = (() => {
        if (!vm || !vm.runtime || !currentTargetId) return null;
        const t = vm.runtime.getTargetById(currentTargetId);
        return t ? t.getName() : null;
    })();
    const classroomCanEditCurrent = canEditTarget(
        classroomRole, classroomAssignments, classroomEditingTargetName, classroomMyId
    );

    const classroomCanEditTargetId = useCallback(targetId => {
        if (!vm || !vm.runtime) return false;
        const t = vm.runtime.getTargetById(targetId);
        if (!t) return true;
        return canEditTarget(classroomRole, classroomAssignments, t.getName(), classroomMyId);
    }, [classroomRole, classroomAssignments, classroomMyId, vm]);

    const classroomReadOnlyBlocks = classroomState.active && !classroomCanEditCurrent;

    const classroomForcePython = classroomState.active && classroomScope === SCOPES.PYTHON;
    const classroomForceBlocks = classroomState.active && classroomScope === SCOPES.BLOQUES;

    const classroomCanSave = !classroomState.active || classroomState.role === ROLES.SERVIDOR;

    const effectivePanelOpen = classroomForceBlocks ?
        false :
        (isPythonKeyLocked || pythonPanelOpen || classroomForcePython);

    // El candado con clave y el modo Aula "Python" FUERZAN el modo solo texto:
    // panel abierto, edición habilitada y toolbox oculto (isPythonEditMode=true).
    // Aquí "bloqueado" significa "no puedes salir a bloques", NO "solo lectura".
    const effectivePanelLocked = classroomForceBlocks ?
        false :
        (isPythonKeyLocked || classroomForcePython ? false : pythonPanelLocked);

    const pythonPanelIsLocked = effectivePanelLocked || classroomReadOnlyBlocks;

    const getAssignedResourceNames = useCallback(() => {
        if (!vm || !vm.runtime) return [];
        // Las claves de asignación son nombres de recurso; solo mostrar los que
        // existen en el proyecto cargado.
        const existingNames = new Set((vm.runtime.targets || []).map(t => t.getName()));
        return Object.keys(classroomAssignments).filter(
            name => classroomAssignments[name] === classroomMyId && existingNames.has(name)
        );
    }, [classroomAssignments, classroomMyId, vm]);

    // Calcular si estamos en modo edición Python (toolbox oculto)
    const isPythonEditMode = effectivePanelOpen && !effectivePanelLocked && deviceMode !== 'device';

    // Modo activo del asistente de IA según el contexto actual de la app.
    const aiActiveMode = deviceMode === 'device' ? 'device'
        : deviceMode === 'diseno' ? '3d'
        : deviceMode === 'evaluacion' ? 'blocks'
        : (isPythonEditMode ? 'python' : 'blocks');

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
                    // Regeneración automática desde bloques: NO marca interacción
                    // (el listener de bloques del aula ya marca las ediciones reales).
                    if (currentTargetId) {
                        setPythonCodePerTarget(prev => ({...prev, [currentTargetId]: result.code}));
                    }
                } catch (e) {
                    console.warn('[GUI] Error generando código Python:', e);
                }
            }, 200);
        };

        // Añadir listener
        workspace.addChangeListener(handleWorkspaceChange);

        // Generar código inicial para este target (solo si panel bloqueado o no hay código)
        if (pythonPanelLockedRef.current || !pythonCodePerTargetRef.current[currentTargetId]) {
            setTimeout(() => {
                try {
                    // Solo regenerar si está bloqueado
                    if (pythonPanelLockedRef.current && currentTargetId) {
                        const result = generatePythonCodeWithMap(workspace);
                        if (vm && vm.runtime) vm.runtime.blockLineMap = result.blockLineMap;
                        // Regeneración automática: NO marca interacción.
                        setPythonCodePerTarget(prev => ({...prev, [currentTargetId]: result.code}));
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
    }, [deviceMode, workspaceHandle, currentTargetId]);

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
                mandatory: Boolean(updateInfo && updateInfo.mandatory),
                title: 'No se pudo instalar la actualización',
                message: e.message || String(e),
                currentVersion: updateInfo && updateInfo.currentVersion ? updateInfo.currentVersion : 'Actual',
                latestVersion: updateInfo && updateInfo.latestVersion ? updateInfo.latestVersion : 'No disponible'
            });
        }
    }, [updateInfo]);

    // En actualizaciones obligatorias, si el usuario decide no instalar, la
    // app se cierra: no debe seguir usándose una versión por debajo del mínimo.
    const handleExitApp = useCallback(async () => {
        try {
            await exitSTBlockApp();
        } catch (e) {
            console.warn('[GUI] No se pudo cerrar la aplicación:', e);
        }
    }, []);

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
            
            openEditor();
        };

        var handleMessage = function (event) {
            if (event.data && event.data.type === 'stblock-open-world-editor') {
                
                openEditor();
            }
            if (event.data && event.data.type === 'stblock-open-robot-editor') {
                
                // Use the path provided by main.js or construct it
                var robotEditorUrl = event.data.editorPath || 'static/velxio/gears/editor/index.html?mode=robots';
                

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
            if (event.data && event.data.type === 'stblock-save-json') {
                const { json, filename } = event.data;
                
                
                const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
                if (isTauri) {
                    try {
                        save({
                            defaultPath: filename,
                            filters: [{ name: 'JSON', extensions: ['json'] }]
                        }).then(filePath => {
                            if (filePath) {
                                const bytes = Array.from(new TextEncoder().encode(json));
                                invoke('save_file', { path: filePath, content: bytes })
                                    .then(() => {
                                        alert('Evaluación guardada correctamente en: ' + filePath);
                                    })
                                    .catch(err => {
                                        console.error('[GUI] Error en save_file:', err);
                                        alert('Error al guardar archivo: ' + err.message);
                                    });
                            }
                        }).catch(err => {
                            console.error('[GUI] Error en save dialog:', err);
                        });
                        return;
                    } catch (e) {
                        console.warn('[GUI] Error llamando a Tauri save, usando descarga normal:', e);
                    }
                }
                
                // Fallback para navegador web normal
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const programmingProjectRef = useRef(null);
    const programmingProjectArchiveRef = useRef(null);
    const previousDeviceModeRef = useRef(deviceMode);
    const handleMentorGuidance = useCallback(d => setMentorGuidanceMsg(d), []);

    // Handle code generation from blocks - update device mode code view
    const handleCodeGenerated = useCallback(code => {
        if (deviceMode === 'device' && onSetCodeViewContent) {
            onSetCodeViewContent(code);
        }
    }, [deviceMode, onSetCodeViewContent]);

    // La IA generó código Python: se escribe en el panel de Programación y se
    // abre/desbloquea para que el usuario pueda verlo y ejecutarlo.
    const handleAiPythonCodeGenerated = useCallback(code => {
        if (!vm) return;
        const targetId = currentTargetId || (vm.editingTarget && vm.editingTarget.id);
        if (!targetId) return;
        setPythonCodePerTarget(prev => ({...prev, [targetId]: code}));
        setPythonPanelOpen(true);
        setPythonPanelLocked(false);
    }, [vm, currentTargetId]);

    // La IA generó código Arduino C++: se fuerza locked y se setea el contenido
    // del editor. El reducer sincroniza manualCode cuando locked está activo,
    // así editor/simulador/upload usan el código generado por la IA.
    const handleAiArduinoCodeGenerated = useCallback(code => {
        if (onSetCodeLocked) onSetCodeLocked(true);
        if (onSetCodeViewContent) onSetCodeViewContent(code);
    }, [onSetCodeLocked, onSetCodeViewContent]);

    // Handle activating a device extension (register blocks, update toolbox)
    const handleActivateExtension = useCallback((extension) => {
        
        if (vm) {
            activateDeviceExtension(vm, extension);
        }
    }, [vm]);

    // Handle deactivating a device extension (remove blocks, update toolbox)
    const handleDeactivateExtension = useCallback((extension) => {
        
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

    const captureProgrammingProject = useCallback(() => {
        try {
            programmingProjectRef.current = vm.toJSON();
            programmingProjectArchiveRef.current = vm.saveProjectSb3();
            console.info('[WorkspaceMode] Programación guardada'); // eslint-disable-line no-console
        } catch (e) {
            console.warn('[WorkspaceMode] No se pudo guardar Programación:', e);
        }
    }, [vm]);

    // El guardado Flynt debe capturar el estado que está actualmente visible,
    // sin depender de que Redux haya procesado antes un cambio de pestaña.
    const requestWorkspaceState = useCallback(async () => {
        let programmingProject = programmingProjectRef.current;
        let programmingProjectArchive = programmingProjectArchiveRef.current;
        const deviceProjects = Object.assign({}, deviceModeProjects || {});

        if (deviceMode === 'device' && deviceModeDevice && deviceModeDevice.deviceId) {
            deviceProjects[deviceModeDevice.deviceId] = {
                projectData: vm.toJSON(),
                hasBlocks: hasBlocksInWorkspace()
            };
        } else {
            programmingProject = vm.toJSON();
            programmingProjectArchive = vm.saveProjectSb3();
            programmingProjectRef.current = programmingProject;
            programmingProjectArchiveRef.current = programmingProjectArchive;
        }

        let resolvedArchive = null;
        if (programmingProjectArchive) {
            try {
                resolvedArchive = await programmingProjectArchive;
            } catch (e) {
                console.warn('[Flynt] No se pudo capturar el archivo interno de Programación:', e);
            }
        }

        console.info('[Flynt] Workspaces capturados', { // eslint-disable-line no-console
            programming: Boolean(programmingProject),
            electronics: Object.keys(deviceProjects).length,
            programmingArchive: Boolean(resolvedArchive)
        });
        return {
            programmingProject: programmingProject || vm.toJSON(),
            programmingProjectArchive: resolvedArchive,
            deviceProjects,
            // Códigos Python indexados por NOMBRE de target para persistir en el
            // .flynt (los ids de target cambian al recargar el proyecto).
            pythonCodes: pythonCodesByName(vm, pythonCodePerTargetRef.current)
        };
    }, [deviceMode, deviceModeDevice, deviceModeProjects, hasBlocksInWorkspace, vm]);

    const loadProgrammingProject = useCallback(() => {
        if (!programmingProjectRef.current) return Promise.resolve();
        const profile = getDeviceProfile(deviceModeDevice);
        deviceSwitchInProgress.current = true;
        return vm.loadProject(programmingProjectRef.current)
            .then(() => {
                // La tarjeta seleccionada habilita su extensión/toolbox también
                // en Programación, pero el hardware queda inactivo fuera de Electrónica.
                vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                vm.requestCodeUpdate();
                console.info('[WorkspaceMode] Programación restaurada'); // eslint-disable-line no-console
            })
            .catch(e => {
                console.warn('[WorkspaceMode] Error restaurando Programación:', e);
            })
            .then(() => {
                deviceSwitchInProgress.current = false;
            });
    }, [vm, deviceModeDevice]);

    // Actually perform the device switch
    const performDeviceSwitch = useCallback((device) => {
        const profile = getDeviceProfile(device);

        // Modo Aula: seleccionar una tarjeta solo habilita sus bloques en
        // Programación; no cambia a Electrónica ni reemplaza el proyecto.
        if (classroomStateRef.current.active) {
            deviceSwitchInProgress.current = true;
            try {
                if (profile) {
                    onSelectDeviceModeDevice(profile);
                    vm.setDeviceProfile(profile, profile.defaultProgramMode);
                } else {
                    onSelectDeviceModeDevice(null);
                    vm.setDeviceProfile(null, null);
                }
                vm.requestCodeUpdate();
            } catch (e) {
                console.warn('[Classroom] Error seleccionando tarjeta:', e);
            } finally {
                deviceSwitchInProgress.current = false;
            }
            onRequestCloseDeviceLibrary();
            return;
        }

        if (!profile) {
            saveCurrentDeviceProject();
            deviceSwitchInProgress.current = true;
            onSelectDeviceModeDevice(null);
            onSetDeviceMode('game');
            vm.loadProject(programmingProjectRef.current || EMPTY_DEVICE_PROJECT)
                .then(() => {
                    vm.setDeviceProfile(null, null);
                    vm.requestCodeUpdate();
                })
                .catch(e => {
                    console.warn('[WorkspaceMode] Error restaurando Programación sin tarjeta:', e);
                })
                .then(() => {
                    deviceSwitchInProgress.current = false;
                });
            onRequestCloseDeviceLibrary();
            return;
        }

        // Si la tarjeta se elige desde Programación, preservar ese proyecto
        // antes de cargar el workspace electrónico de la tarjeta.
        if (deviceMode !== 'device') {
            captureProgrammingProject();
        }

        // Set the guard before Redux changes mode. The mode effect runs after
        // render and must not start a second load for this same transition.
        deviceSwitchInProgress.current = true;
        // Update Redux FIRST so the blocks container has the correct selectedDevice
        // when emitWorkspaceUpdate() fires during vm.loadProject() → installTargets.
        // This prevents toolbox mode mismatch errors.
        onSelectDeviceModeDevice(profile);
        onSetDeviceMode(profile ? 'device' : 'game');

        // Sincronizar el runtime ANTES de loadProject: durante loadProject se dispara
        // emitWorkspaceUpdate y runtime.getBlocksXML() usa _deviceBlockInfo. Si solo se
        // actualizara después (en el .then), getBlocksXML devolvería las categorías de la
        // tarjeta anterior (p.ej. STBoard) mientras selectedDevice ya es la nueva, mezclando
        // pines/bloques de la tarjeta vieja en el workspace y el toolbox. setDeviceProfile
        // deep-clona las categorías y emite BLOCKSINFO_UPDATE; no es borrado por clear().
        // emitProjectChanged=false evita marcar como sucio el proyecto saliente.
        vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null, false);

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
    }, [vm, deviceMode, deviceModeProjects, captureProgrammingProject, saveCurrentDeviceProject,
        onSelectDeviceModeDevice, onSetDeviceMode, onRequestCloseDeviceLibrary]);

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

        // Modo Aula: la selección solo habilita bloques de la tarjeta; no
        // reemplaza el workspace, así que no hace falta confirmación.
        if (classroomStateRef.current.active) {
            performDeviceSwitch(device);
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

    // Programación y Electrónica comparten el renderer de Blockly, pero nunca
    // el contenido del proyecto. Cada cambio de pestaña serializa el workspace
    // saliente y carga la instantánea correspondiente.
    useEffect(() => {
        const previousMode = previousDeviceModeRef.current;
        previousDeviceModeRef.current = deviceMode;
        if (previousMode === deviceMode || deviceSwitchInProgress.current) return;

        if (previousMode !== 'device' && deviceMode === 'device') {
            captureProgrammingProject();
            const profile = getDeviceProfile(deviceModeDevice);
            const savedProject = profile && deviceModeProjects ?
                deviceModeProjects[profile.deviceId] : null;
            deviceSwitchInProgress.current = true;
            // Mismo principio que performDeviceSwitch: setDeviceProfile antes de loadProject
            // para que getBlocksXML() use las categorías del dispositivo restaurado y no las
            // de una tarjeta previa que pudiera quedar en _deviceBlockInfo.
            vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null, false);
            vm.loadProject(savedProject && savedProject.projectData ?
                savedProject.projectData : EMPTY_DEVICE_PROJECT)
                .then(() => {
                    vm.setDeviceProfile(profile, profile ? profile.defaultProgramMode : null);
                    vm.requestCodeUpdate();
                    console.info('[WorkspaceMode] Electrónica restaurada', { // eslint-disable-line no-console
                        deviceId: profile && profile.deviceId,
                        restored: Boolean(savedProject && savedProject.projectData)
                    });
                })
                .catch(e => {
                    console.warn('[WorkspaceMode] Error restaurando Electrónica:', e);
                })
                .then(() => {
                    deviceSwitchInProgress.current = false;
                });
        } else if (previousMode === 'device' && deviceMode !== 'device') {
            saveCurrentDeviceProject();
            loadProgrammingProject();
        }
    }, [deviceMode, deviceModeDevice, deviceModeProjects, vm,
        captureProgrammingProject, saveCurrentDeviceProject, loadProgrammingProject]);

    useEffect(() => {
        const restoreDeviceFromProject = () => {
            // Guard: skip if a device switch is in progress to avoid overwriting Redux
            if (deviceSwitchInProgress.current) return;

            // Una carga externa siempre instala project.json como Programación.
            // Sincronizar el ref y el modo evita que el efecto de salida de
            // Electrónica copie ese proyecto recién cargado sobre su workspace.
            programmingProjectRef.current = vm.toJSON();
            programmingProjectArchiveRef.current = vm.saveProjectSb3();
            previousDeviceModeRef.current = 'game';
            onSetDeviceMode('game');
            const profile = vm.getDeviceProfile();
            onSelectDeviceModeDevice(profile);
            // Una tarjeta activa sólo habilita sus bloques. No debe decidir si
            // el usuario está trabajando en Programación o Electrónica.
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

    const handleVelxioStateChange = useCallback(state => {
        if (state) onSetCircuitData(state);
    }, [onSetCircuitData]);

    const handleOpenClassroom = useCallback(() => {
        const s = classroomStateRef.current;
        if (s.active) {
            if (s.role === ROLES.SERVIDOR) {
                setClassroomConsoleOpen(true);
            } else {
                setClassroomRosterOpen(true);
            }
        } else {
            setClassroomSetupOpen(true);
        }
    }, []);

    const handleOpenClassroomSimulator = useCallback(() => {
        const s = classroomStateRef.current;
        if (!s.active || s.role !== ROLES.SERVIDOR) return;
        if (!isClassroomSimulatorAvailable()) {
            console.warn('[Classroom] Simulador no disponible (requiere Tauri).');
            return;
        }
        const port = (s.config && s.config.port) ? s.config.port : 8870;
        if (openClassroomSimulator({port, code: s.code})) {
            
        }
    }, []);

    // Restaurar circuito cuando circuitData cambia (despues de cargar .flynt)
    useEffect(() => {
        if (!circuitData || !velxioRef.current) return;

        const restore = async () => {
            try {
                if (velxioRef.current && velxioRef.current.loadCircuitState) {
                    const result = await velxioRef.current.loadCircuitState(circuitData);
                    if (result) {
                        
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

    // --- Puente SketchForge 3D -----------------------------------------------
    // Pide al iframe el proyecto editable .skf actual. Si el editor de SketchForge
    // no está montado (ej. dashboard), devuelve la caché o el .skf restaurado
    // desde un .flynt, para no bloquear el guardado esperando una respuesta.
    const requestSketchforgeSkf = useCallback(async () => {
        const iframe = sketchforgeFrameRef.current;
        if (!iframe || !iframe.contentWindow || !sketchforgeEditorReadyRef.current) {
            return sketchforgeCacheRef.current || sketchforgeLatestReduxRef.current || null;
        }
        const requestId = `skf-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise(resolve => {
            const timeout = window.setTimeout(() => {
                sketchforgeResolversRef.current.delete(requestId);
                resolve(sketchforgeCacheRef.current || sketchforgeLatestReduxRef.current || null);
            }, 15000);
            sketchforgeResolversRef.current.set(requestId, result => {
                window.clearTimeout(timeout);
                resolve(result || sketchforgeCacheRef.current || sketchforgeLatestReduxRef.current || null);
            });
            iframe.contentWindow.postMessage({type: 'SKETCHFORGE_EXPORT_SKF', requestId}, '*');
        });
    }, []);

    // Envía formas generadas por la IA al iframe de SketchForge. Resuelve cuando
    // llega SKETCHFORGE_IMPORT_SHAPES_RESULT o tras un timeout de 20s.
    const sendSketchforgeImport = useCallback((payload) => {
        const iframe = sketchforgeFrameRef.current;
        if (!iframe || !iframe.contentWindow || !sketchforgeEditorReadyRef.current) {
            return Promise.resolve({ok: false, error: 'El editor 3D no está listo.'});
        }
        return new Promise(resolve => {
            const timeout = window.setTimeout(() => {
                sketchforgeImportResolversRef.current.delete(payload.requestId);
                resolve({ok: false, error: 'Tiempo de espera agotado al aplicar las formas 3D.'});
            }, 20000);
            sketchforgeImportResolversRef.current.set(payload.requestId, result => {
                window.clearTimeout(timeout);
                resolve(result);
            });
            iframe.contentWindow.postMessage({
                type: 'SKETCHFORGE_IMPORT_SHAPES',
                requestId: payload.requestId,
                clear: !!payload.clear,
                shapes: payload.shapes
            }, '*');
        });
    }, []);

    // Vacía la cola de importaciones 3D cuando el editor de SketchForge está listo.
    const flushSketchforgeImportQueue = useCallback(() => {
        if (!sketchforgeEditorReadyRef.current || !sketchforgeFrameRef.current) return;
        const queue = sketchforgeImportQueueRef.current;
        if (queue.length === 0) return;
        sketchforgeImportQueueRef.current = [];
        queue.forEach(payload => {
            sendSketchforgeImport(payload).catch(() => {});
        });
    }, [sendSketchforgeImport]);

    // La IA generó un modelo 3D (script3D): lo interpreta y lo envía a
    // SketchForge. Si el editor 3D no está listo, lo encola y avisa en el chat.
    const handleAiShapes3DGenerated = useCallback(async (script3D, clearExisting) => {
        try {
            const mod = await import('../../lib/ai-3d-interpreter');
            const result = mod.interpret(script3D);
            if (!result.ok) {
                return {ok: false, error: (result.errors || []).join('; ')};
            }
            const clear = typeof clearExisting === 'boolean' ? clearExisting : result.clear;
            const payload = {
                requestId: `ai-shapes-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                clear: clear,
                shapes: result.shapes
            };
            if (deviceMode === 'diseno' && sketchforgeEditorReadyRef.current && sketchforgeFrameRef.current) {
                const sendResult = await sendSketchforgeImport(payload);
                if (!sendResult.ok) {
                    return {ok: false, error: sendResult.error || 'No se pudieron aplicar las formas.'};
                }
                return {ok: true, count: result.shapes.length};
            }
            sketchforgeImportQueueRef.current.push(payload);
            return {
                ok: true,
                queued: true,
                count: result.shapes.length,
                error: 'Formas listas. Abrí Diseño 3D para aplicarlas.'
            };
        } catch (e) {
            return {ok: false, error: e.message || 'Error al interpretar el modelo 3D.'};
        }
    }, [deviceMode, sendSketchforgeImport]);

    // Captura debounced del .skf cuando el proyecto 3D cambia, se restaura o el
    // editor se (re)monta. Debounce con trailing: cada evento reinicia el timer,
    // así los eventos rápidos (mount + import) coalescen en una sola captura.
    const scheduleSketchforgeCapture = useCallback(() => {
        if (sketchforgeCaptureTimerRef.current !== null) {
            window.clearTimeout(sketchforgeCaptureTimerRef.current);
        }
        sketchforgeCaptureTimerRef.current = window.setTimeout(() => {
            sketchforgeCaptureTimerRef.current = null;
            requestSketchforgeSkf();
        }, 1500);
    }, [requestSketchforgeSkf]);

    // Captura el estado del circuito de Velxio para incluirlo en el .flynt.
    const requestCircuitState = useCallback(async () => {
        try {
            if (velxioRef.current && velxioRef.current.saveCircuitState) {
                const state = await velxioRef.current.saveCircuitState();
                if (state) {
                    onSetCircuitData(state);
                    return state;
                }
            }
        } catch (e) {
            console.warn('[GUI] Error capturing circuit state:', e);
        }
        // Fallback: estado sincronizado al ocultar Circuitos o persistido al desmontar.
        if (circuitData) return circuitData;
        try {
            if (deviceModeDevice && deviceModeDevice.deviceId) {
                const key = getVelxioStateKey(deviceModeDevice.deviceId);
                const raw = window.localStorage.getItem(key);
                if (raw) return JSON.parse(raw);
            }
        } catch (e) { /* ignore */ }
        return null;
    }, [circuitData, deviceModeDevice, onSetCircuitData]);

    // Listener de mensajes del iframe de SketchForge (shell + editor).
    useEffect(() => {
        const handleSketchforgeMessage = event => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            const frame = sketchforgeFrameRef.current;
            if (!frame || event.source !== frame.contentWindow) return;

            if (data.type === 'SKETCHFORGE_READY') {
                // Shell de SketchForge cargado (page.tsx). El editor puede tardar más.
                sketchforgeReadyRef.current = true;
                setSketchforgeReady(true);
                return;
            }
            if (data.type === 'SKETCHFORGE_EDITOR_READY') {
                // El editor de SketchForge está montado y puede responder exportaciones.
                sketchforgeEditorReadyRef.current = true;
                // Aplicar cualquier modelo 3D que la IA haya dejado en cola.
                flushSketchforgeImportQueue();
                // Refrescar la caché del .skf: el editor puede haber cargado otro proyecto.
                scheduleSketchforgeCapture();
                return;
            }
            if (data.type === 'SKETCHFORGE_PROJECT_CHANGED') {
                // El proyecto 3D cambió: refrescar la caché del .skf (debounced).
                scheduleSketchforgeCapture();
                return;
            }
            if (data.type === 'SKETCHFORGE_EXPORT_SKF_RESULT') {
                const resolver = sketchforgeResolversRef.current.get(data.requestId);
                if (resolver) {
                    sketchforgeResolversRef.current.delete(data.requestId);
                    if (data.error) {
                        resolver(null);
                    } else if (data.bytes && Array.isArray(data.bytes)) {
                        const bytes = new Uint8Array(data.bytes);
                        sketchforgeCacheRef.current = {bytes};
                        onClearSketchforgeData();
                        resolver({bytes});
                    } else {
                        resolver(null);
                    }
                }
                return;
            }
            if (data.type === 'SKETCHFORGE_IMPORT_SKF_RESULT') {
                // Tras restaurar el .skf importado, capturarlo en caché para que el
                // siguiente guardado lo incluya aunque no se edite nada.
                scheduleSketchforgeCapture();
                return;
            }
            if (data.type === 'SKETCHFORGE_IMPORT_SHAPES_RESULT') {
                // El editor aplicó (o falló al aplicar) las formas generadas por la IA.
                const importResolver = sketchforgeImportResolversRef.current.get(data.requestId);
                if (importResolver) {
                    sketchforgeImportResolversRef.current.delete(data.requestId);
                    importResolver({
                        ok: !!data.ok,
                        count: data.count || 0,
                        error: data.error || null
                    });
                }
                return;
            }
        };
        window.addEventListener('message', handleSketchforgeMessage);
        return () => window.removeEventListener('message', handleSketchforgeMessage);
    }, [scheduleSketchforgeCapture, onClearSketchforgeData, flushSketchforgeImportQueue]);

    // Restaurar el proyecto 3D (.skf) al abrir la pestaña Diseño 3D tras importar un .flynt.
    useEffect(() => {
        if (deviceMode !== 'diseno') {
            sketchforgeReadyRef.current = false;
            sketchforgeEditorReadyRef.current = false;
            sketchforgeRestoredRef.current = false;
            setSketchforgeReady(false);
            return;
        }
        if (!sketchforgeSkf || !sketchforgeSkf.bytes) return;
        if (sketchforgeRestoredRef.current) return;
        const iframe = sketchforgeFrameRef.current;
        if (!iframe || !iframe.contentWindow || !sketchforgeReady) return;
        sketchforgeRestoredRef.current = true;
        iframe.contentWindow.postMessage({
            type: 'SKETCHFORGE_IMPORT_SKF',
            requestId: `stblock-restore-${Date.now()}`,
            bytes: Array.from(new Uint8Array(sketchforgeSkf.bytes)),
            fileName: 'restored.skf'
        }, '*');
    }, [deviceMode, sketchforgeSkf, sketchforgeReady]);

    // Al salir de la pestaña Diseño 3D: descartar el debounce pendiente y hacer
    // una última captura best-effort antes de que el iframe se desmonte.
    useEffect(() => {
        if (deviceMode === 'diseno') return;
        if (sketchforgeCaptureTimerRef.current !== null) {
            window.clearTimeout(sketchforgeCaptureTimerRef.current);
            sketchforgeCaptureTimerRef.current = null;
        }
        requestSketchforgeSkf();
    }, [deviceMode, requestSketchforgeSkf]);

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

    // Botón flotante de IA arrastrable. aiBtnPos guarda la posición en px tras
    // arrastrarlo (null = usar la posición CSS por defecto).
    const [aiBtnPos, setAiBtnPos] = useState(null);
    const aiBtnDragRef = useRef(null); // datos del arrastre en curso
    const aiBtnMovedRef = useRef(false); // true si el último puntero arrastró el botón

    const handleAiBtnPointerDown = useCallback(e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // solo botón izquierdo
        const rect = e.currentTarget.getBoundingClientRect();
        aiBtnMovedRef.current = false;
        aiBtnDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origLeft: rect.left,
            origTop: rect.top
        };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) { /* captura no soportada: fallback con eventos de ventana */ }
    }, []);

    const handleAiBtnPointerMove = useCallback(e => {
        const drag = aiBtnDragRef.current;
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        // Umbral para distinguir un click de un arrastre.
        if (!aiBtnMovedRef.current && (Math.abs(dx) + Math.abs(dy) < 4)) return;
        aiBtnMovedRef.current = true;
        const btnSize = 44;
        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        const x = Math.min(Math.max(drag.origLeft + dx, 0), Math.max(0, vw - btnSize));
        const y = Math.min(Math.max(drag.origTop + dy, 0), Math.max(0, vh - btnSize));
        setAiBtnPos({x: x, y: y});
    }, []);

    const handleAiBtnPointerUp = useCallback(() => {
        aiBtnDragRef.current = null;
    }, []);

    const handleAiBtnClick = useCallback(() => {
        if (aiBtnMovedRef.current) {
            aiBtnMovedRef.current = false;
            return; // fue un arrastre, no abrir el chat
        }
        setIsAiOpen(true);
        setIsAiMinimized(false);
    }, []);

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
        const mapped = TABS_CONFIG.map((t, i) => i === 1 ? {...t, label: costsmesLabel} : t);
        if (classroomReadOnlyBlocks) {
            return mapped.filter(t => t.id === 'code');
        }
        return mapped;
    }, [targetIsStage, classroomReadOnlyBlocks]);

    useEffect(() => {
        if (classroomReadOnlyBlocks && activeTabIndex !== 0) {
            onActivateTab(0);
        }
    }, [classroomReadOnlyBlocks, activeTabIndex, onActivateTab]);

    // Pre-rendered panels — always mounted, visibility toggled via CSS
    const codePanel = useMemo(() => (
        <Box className={styles.blocksWrapper}>
            <Blocks
                key={`${blocksId}/${theme}`}
                canUseCloud={canUseCloud}
                grow={1}
                isVisible={blocksTabVisible}
                isPythonEditMode={isPythonEditMode}
                workspaceReadOnly={classroomReadOnlyBlocks}
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
    ), [blocksId, theme, canUseCloud, blocksTabVisible, isPythonEditMode, classroomReadOnlyBlocks, vm, basePath, stageSize, handleCodeGenerated]);

    const costumePanel = useMemo(() => <CostumeTab vm={vm} />, [vm]);
    const soundPanel = useMemo(() => <SoundTab vm={vm} />, [vm]);
    const aiPanel = useMemo(() => (
        <AiTab
            vm={vm}
            pendingExplain={pendingExplain}
            projectKey={projectKey}
            onClearExplain={onClearExplain}
            onMentorGuidance={handleMentorGuidance}
            onActivateTab={onActivateTab}
            reanalyzeTick={reanalyzeTick}
            activeMode={aiActiveMode}
            onPythonCodeGenerated={handleAiPythonCodeGenerated}
            onArduinoCodeGenerated={handleAiArduinoCodeGenerated}
            onShapes3DGenerated={handleAiShapes3DGenerated}
        />
    ), [vm, pendingExplain, projectKey, onClearExplain, handleMentorGuidance, onActivateTab,
        reanalyzeTick, aiActiveMode, handleAiPythonCodeGenerated, handleAiArduinoCodeGenerated,
        handleAiShapes3DGenerated]);

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
                        isFullScreen={isFullScreen}
                        isRendererSupported={isRendererSupported}
                        isRtl={isRtl}
                        isPythonEditMode={isPythonEditMode}
                        onSyncPythonToBlocks={handleSyncToBlocks}
                        pythonExecutor={pythonExecutor}
                        pythonCode={pythonCode}
                        stageSize={stageSize}
                        vm={vm}
                    />
                    <Box className={styles.targetWrapper}>
                        <TargetPane
                            stageSize={stageSize}
                            vm={vm}
                            onDeleteTargetPythonCode={removePythonCodeForTarget}
                            onRestoreTargetPythonCode={restorePythonCodeForTarget}
                            classroomCanAddSprite={classroomCanAdd}
                            classroomCanDeleteSprite={classroomCanDelete}
                            classroomCanRenameSprite={classroomCanRename}
                            classroomCanEditCurrent={classroomCanEditCurrent}
                            classroomCanEditTargetId={classroomCanEditTargetId}
                            classroomStateActive={classroomState.active}
                            classroomAssignments={classroomAssignments}
                            classroomRoster={classroomState.roster || []}
                            classroomMyId={classroomMyId}
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
                            isOpen={effectivePanelOpen}
                            pythonCode={pythonCode}
                            isLocked={effectivePanelLocked}
                            isKeyLocked={isPythonKeyLocked}
                            onToggleOpen={() => setPythonPanelOpen(!pythonPanelOpen)}
                            onToggleLock={() => setPythonPanelLocked(!pythonPanelLocked)}
                            onRequestKeyLock={handleRequestKeyLock}
                            onRequestKeyUnlock={handleRequestKeyUnlock}
                            onCodeChange={setPythonCode}
                            onCopyCode={() => {}}
                            onSyncToBlocks={handleSyncToBlocks}
                            isProgrammingMode={deviceMode !== 'device'}
                            targetId={currentTargetId}
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
            onVelxioStateChange={handleVelxioStateChange}
        />
    );

    const renderEvaluacionMode = () => (
        <StudentEvaluacionPlayer
            vm={vm}
            onSetDeviceMode={onSetDeviceMode}
        />
    );

    const renderDiseno3DMode = () => (
        <div className={styles.diseno3DWrapper}>
            <iframe
                ref={sketchforgeFrameRef}
                className={styles.diseno3DFrame}
                src={STBLOCK_SKETCHFORGE_URL}
                title="SketchForge 3D"
                allow="fullscreen"
            />
        </div>
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
            {classroomState.active && classroomState.role === ROLES.CLIENTE && classroomReadOnlyBlocks && (
                <div className={styles.classroomReadOnlyBanner}>
                    <span className={styles.classroomReadOnlyBannerIcon}>🔒</span>
                    <span className={styles.classroomReadOnlyBannerText}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Modo Lectura: No tienes permiso para editar este elemento. Tu elemento asignado es: {resources}"
                                id="gui.gui.classroomReadOnly"
                                values={{
                                    resources: getAssignedResourceNames().join(', ') || 'Ninguno'
                                }}
                            />
                        </strong>
                    </span>
                </div>
            )}
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
            <PythonKeyModal
                isOpen={pythonKeyModalOpen}
                mode={pythonKeyModalMode}
                onCancel={() => setPythonKeyModalOpen(false)}
                onSetKey={handleSetKeyLock}
                onTryUnlock={handleTryUnlock}
            />
            <ClassroomSetupModal
                isOpen={classroomSetupOpen}
                onClose={() => setClassroomSetupOpen(false)}
            />
            <ClassroomConsole
                isOpen={classroomConsoleOpen}
                onClose={() => setClassroomConsoleOpen(false)}
                targets={classroomTargets}
            />
            <ClassroomRoster
                isOpen={classroomRosterOpen}
                onClose={() => setClassroomRosterOpen(false)}
                targets={classroomTargets}
            />
            {stbBoardPinoutVisible ? (
                <StbBoardPinoutModal
                    onClose={() => setStbBoardPinoutVisible(false)}
                />
            ) : null}
            <UpdateModal
                info={updateInfo}
                installing={updateInstalling}
                onDismiss={handleDismissUpdate}
                onExit={handleExitApp}
                onInstall={handleInstallUpdate}
                onRetry={() => runUpdateCheck({manual: true})}
            />
            <ClassroomBanner
                onOpenConsole={() => setClassroomConsoleOpen(true)}
                onOpenRoster={() => setClassroomRosterOpen(true)}
                onOpenSimulator={handleOpenClassroomSimulator}
                onLeave={() => classroomController.leave()}
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
                canManageFiles={canManageFiles && classroomCanSave}
                canRemix={canRemix}
                canSave={canSave && classroomCanSave}
                canShare={canShare}
                className={styles.menuBarPosition}
                enableCommunity={enableCommunity}
                isShared={isShared}
                isTotallyNormal={isTotallyNormal}
                modeToggleDisabled={isPythonKeyLocked || classroomForcePython || classroomForceBlocks}
                lockedModes={classroomLockedModes}
                classroomActive={classroomState.active}
                onOpenClassroom={handleOpenClassroom}
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
                onRequestCircuitState={requestCircuitState}
                onRequestSketchforgeSkf={requestSketchforgeSkf}
                onRequestWorkspaceState={requestWorkspaceState}
            />
            {deviceMode === 'device' ? renderDeviceMode() : deviceMode === 'diseno' ? renderDiseno3DMode() : deviceMode === 'evaluacion' ? renderEvaluacionMode() : renderEditor()}
            {!isFullScreen && <DragLayer />}
            {!isFullScreen && isAiOpen && (
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
            {!isFullScreen && !isAiOpen && (
                <button
                    className={styles.aiFloatingBtn}
                    style={aiBtnPos ? {left: aiBtnPos.x, top: aiBtnPos.y} : null}
                    onClick={handleAiBtnClick}
                    onPointerDown={handleAiBtnPointerDown}
                    onPointerMove={handleAiBtnPointerMove}
                    onPointerUp={handleAiBtnPointerUp}
                    onPointerCancel={handleAiBtnPointerUp}
                    title="Preguntar a la IA"
                >
                    <img
                        className={styles.aiFloatingBtnIcon}
                        src={aiIcon}
                        style={{filter: 'brightness(0) invert(1)'}}
                    />
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
    deviceMode: PropTypes.oneOf(['game', 'device', 'diseno', 'evaluacion']),
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
    sketchforgeSkf: PropTypes.object,
    deviceModeProgramMode: PropTypes.string,
    onRestoreDeviceState: PropTypes.func,
    onSetCircuitData: PropTypes.func,
    onClearCircuitData: PropTypes.func,
    onClearSketchforgeData: PropTypes.func,
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
    sketchforgeSkf: getSketchforgeData(state),
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
    onClearCircuitData: () => dispatch(clearCircuitData()),
    onClearSketchforgeData: () => dispatch(clearSketchforgeData())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(GUIComponent));
