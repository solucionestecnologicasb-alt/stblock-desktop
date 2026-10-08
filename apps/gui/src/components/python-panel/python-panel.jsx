import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './python-panel.css';
import PythonHighlighter from './python-highlighter.jsx';
import PythonReferencePanel from './python-reference-panel.jsx';
import {loadPreferences, savePreferences} from '../../lib/python/python-storage.js';
import {parseFolds} from '../../lib/python/python-folds.js';

// Pares para auto-cierre de paréntesis/corchetes/llaves
const AUTO_CLOSE_PAIRS = {'(': ')', '[': ']', '{': '}'};
const BRACKET_CLOSE = {')': '(', ']': '[', '}': '{'};

// Icono de Python oficial (serpientes entrelazadas)
const PythonIcon = () => (
    <svg viewBox="0 0 24 24" width="22" height="22">
        <defs>
            <linearGradient id="pythonBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5A9FD4" />
                <stop offset="100%" stopColor="#306998" />
            </linearGradient>
            <linearGradient id="pythonYellow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD43B" />
                <stop offset="100%" stopColor="#FFE873" />
            </linearGradient>
        </defs>
        <path fill="url(#pythonBlue)" d="M11.9 2c-2.8 0-2.6 1.2-2.6 1.2v1.3h2.7v.4H6.3S4 4.6 4 7.5s2 2.8 2 2.8h1.2V9c0-1.1.9-2 2-2h3.4c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.8-1.5-1.9-1.6h-.4zm-1.5 1c.4 0 .7.3.7.7s-.3.6-.7.6-.6-.3-.6-.6.3-.7.6-.7z"/>
        <path fill="url(#pythonYellow)" d="M12.1 22c2.8 0 2.6-1.2 2.6-1.2v-1.3h-2.7v-.4h5.7s2.3.3 2.3-2.6-2-2.8-2-2.8h-1.2v1.3c0 1.1-.9 2-2 2h-3.4c-.9 0-1.6.7-1.6 1.6v1.8c0 .9.8 1.5 1.9 1.6h.4zm1.5-1c-.4 0-.7-.3-.7-.7s.3-.6.7-.6.6.3.6.6-.3.7-.6.7z"/>
    </svg>
);

// Iconos SVG con estilo consistente
const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
);

const UnlockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 019.9-1"/>
    </svg>
);

// Icono de llave (configurar candado con clave)
const KeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="7.5" cy="15.5" r="4.5" />
        <path d="M10.5 12.5L21 2" />
        <path d="M15 5l4 4" />
    </svg>
);

// Icono de candado con ojo de cerradura (bloqueado con clave)
const LockKeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
        <circle cx="12" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
        <path d="M12 18v4" />
    </svg>
);

const CopyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const FileIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className={styles.fileIcon}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
    </svg>
);

const InfoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className={styles.footerIcon}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
);

const HelpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

const ArrowUpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <polyline points="18 15 12 9 6 15"/>
    </svg>
);

const ArrowDownIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

// Icono de error
const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

// Icono de advertencia
const WarningIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);

// Icono de sprite
const SpriteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
    </svg>
);

// Icono de escenario
const StageIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
);

// Icono de variable (x)
const VariableIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="4" width="18" height="16" rx="4"/>
        <path d="M8 8l3 4-3 4"/>
        <path d="M14 16h3"/>
    </svg>
);

const PythonPanel = ({
    isOpen,
    pythonCode,
    isLocked,
    isKeyLocked,
    onToggleOpen,
    onToggleLock,
    onRequestKeyLock,
    onRequestKeyUnlock,
    onCodeChange,
    onCopyCode,
    onSyncToBlocks,
    isProgrammingMode,
    targetId,
    targetName,
    isStage,
    vm
}) => {
    const codeRef = useRef(null);
    const highlighterRef = useRef(null);
    const editorWrapperRef = useRef(null);
    const syncTimerRef = useRef(null);
    const codeCommitRef = useRef(null);
    const scrollFrameRef = useRef(null);
    const isComposingRef = useRef(false);
    const lastSyncedCodeRef = useRef('');
    const targetKey = targetId || targetName;
    const lastTargetRef = useRef(targetKey);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showVariables, setShowVariables] = useState(false);
    const [variablesList, setVariablesList] = useState([]);
    const [newVarName, setNewVarName] = useState('');
    const [errors, setErrors] = useState([]); // Lista de errores
    const [showErrors, setShowErrors] = useState(true); // Mostrar/ocultar panel de errores
    const [draftCode, setDraftCode] = useState(pythonCode || '');
    const draftCodeRef = useRef(pythonCode || '');
    // Línea donde está el cursor (para resaltarla como en Monaco)
    const [activeLine, setActiveLine] = useState(0);
    // Búsqueda de texto
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
    // Plegado de bloques (folding) estilo VS Code
    const [collapsedSigs, setCollapsedSigs] = useState([]);
    const [foldLayouts, setFoldLayouts] = useState([]);
    const foldOverlayRef = useRef(null);
    const prevFoldLayoutsRef = useRef([]);
    // Posición del cursor para el footer (Ln X, Col Y)
    const [cursorPos, setCursorPos] = useState({line: 1, col: 1});
    // Par de paréntesis/corchetes coincidente para resaltar
    const [bracketRanges, setBracketRanges] = useState(null);

    const defaultCode = `# Codigo Python generado por STBlock
# Arrastra bloques para ver el codigo aqui

# Ejemplo:
# sprite.move(10)
# sprite.turn_right(90)
# sprite.say("Hola!")
`;

    // Código que muestra el highlighter (usado también para buscar coincidencias)
    const displayCode = isLocked ? (pythonCode || defaultCode) : draftCode;

    // Bloques plegables del código actual (condiciones, funciones, bucles...)
    const folds = useMemo(() => parseFolds(displayCode), [displayCode]);
    const collapsedFolds = useMemo(
        () => folds.filter(f => collapsedSigs.indexOf(f.sig) !== -1),
        [folds, collapsedSigs]
    );
    // Rangos (índices 0-based de línea) de los cuerpos plegados, para que el
    // highlighter oculte esas líneas (opacity 0) sin quitarles el espacio.
    const collapsedRanges = useMemo(
        () => collapsedFolds.map(f => ({start: f.start, end: f.end})),
        [collapsedFolds]
    );
    const toggleFold = useCallback((sig) => {
        setCollapsedSigs(prev => {
            const next = prev.slice();
            const idx = next.indexOf(sig);
            if (idx !== -1) next.splice(idx, 1); else next.push(sig);
            return next;
        });
    }, []);

    // Calcula la posición de los indicadores/barras de plegado sobre el wrapper.
    // Se llama tras cada render, en cada frame de scroll y al redimensionar.
    const positionFolds = useCallback(() => {
        const wrapper = editorWrapperRef.current;
        const hs = highlighterRef.current;
        if (!wrapper || !hs) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        const items = [];
        for (const f of folds) {
            const headerEl = hs.querySelector(`[data-line="${f.header + 1}"]`);
            if (!headerEl) continue;
            const headerRect = headerEl.getBoundingClientRect();
            const collapsed = collapsedSigs.indexOf(f.sig) !== -1;
            const item = {
                sig: f.sig,
                top: headerRect.top - wrapperRect.top,
                height: headerRect.height,
                collapsed,
                hiddenLines: f.end - f.start + 1,
                bandTop: 0,
                bandHeight: 0,
                guideTop: 0,
                guideHeight: 0
            };
            if (collapsed) {
                const bodyStartEl = hs.querySelector(`[data-line="${f.start + 1}"]`);
                const bodyEndEl = hs.querySelector(`[data-line="${f.end + 1}"]`);
                if (bodyStartEl && bodyEndEl) {
                    const sr = bodyStartEl.getBoundingClientRect();
                    const er = bodyEndEl.getBoundingClientRect();
                    item.bandTop = sr.top - wrapperRect.top;
                    item.bandHeight = er.bottom - sr.top;
                }
            } else {
                // Línea guía del grupo: desde debajo de la cabecera hasta el
                // final del cuerpo, para visualizar el alcance del bloque.
                const bodyEndEl = hs.querySelector(`[data-line="${f.end + 1}"]`);
                if (bodyEndEl) {
                    const er = bodyEndEl.getBoundingClientRect();
                    item.guideTop = headerRect.bottom - wrapperRect.top;
                    item.guideHeight = Math.max(0, er.bottom - wrapperRect.top - item.guideTop);
                }
            }
            items.push(item);
        }

        // Solo actualizar estado si algo cambió (evita re-render en bucle).
        const prev = prevFoldLayoutsRef.current;
        let changed = prev.length !== items.length;
        if (!changed) {
            for (let i = 0; i < items.length; i++) {
                const a = items[i];
                const b = prev[i];
                if (!b || a.sig !== b.sig ||
                    Math.abs(a.top - b.top) > 0.6 ||
                    Math.abs(a.height - b.height) > 0.6 ||
                    a.collapsed !== b.collapsed ||
                    (a.collapsed && (Math.abs(a.bandTop - b.bandTop) > 0.6 ||
                        Math.abs(a.bandHeight - b.bandHeight) > 0.6)) ||
                    (!a.collapsed && (Math.abs(a.guideTop - b.guideTop) > 0.6 ||
                        Math.abs(a.guideHeight - b.guideHeight) > 0.6))) {
                    changed = true;
                    break;
                }
            }
        }
        if (changed) {
            prevFoldLayoutsRef.current = items;
            setFoldLayouts(items);
        }
    }, [folds, collapsedSigs]);

    const handleFoldClick = useCallback((sig) => {
        toggleFold(sig);
        requestAnimationFrame(() => {
            const ta = codeRef.current;
            if (ta) {
                const pos = ta.selectionStart;
                ta.focus();
                ta.setSelectionRange(pos, pos);
            }
        });
    }, [toggleFold]);

    // Ref "latest" de positionFolds para usarla en el ResizeObserver sin añadir
    // la dependencia al efecto (positionFolds cambia de identidad en cada tecla
    // porque folds cambia → recrear el observer en cada tecla sería un desperdicio).
    const positionFoldsRef = useRef(positionFolds);
    positionFoldsRef.current = positionFolds;

// Asegurar que el monitor block exista en runtime.monitorBlocks para que
// Scratch VM y el MonitorComponent de React puedan calcular el label y renderizar sin error.
const ensureMonitorBlockForVariable = (vm, varItem) => {
    if (!vm || !vm.runtime || !vm.runtime.monitorBlocks) return null;
    const isList = varItem.type === 'list';
    const opcode = isList ? 'data_listcontents' : 'data_variable';
    const fieldKey = isList ? 'LIST' : 'VARIABLE';

    let block = vm.runtime.monitorBlocks.getBlock(varItem.id);
    if (!block) {
        block = {
            id: varItem.id,
            opcode: opcode,
            inputs: {},
            fields: {
                [fieldKey]: {
                    name: varItem.name,
                    id: varItem.id,
                    value: varItem.name,
                    variableType: isList ? 'list' : ''
                }
            },
            topLevel: true,
            next: null,
            parent: null,
            shadow: false,
            x: 0,
            y: 0,
            isMonitored: !!varItem.visible,
            targetId: varItem.isGlobal ? null : (vm.editingTarget ? vm.editingTarget.id : null)
        };
        vm.runtime.monitorBlocks.createBlock(block);
    } else {
        if (!block.fields || !block.fields[fieldKey]) {
            block.fields = {
                [fieldKey]: {
                    name: varItem.name,
                    id: varItem.id,
                    value: varItem.name,
                    variableType: isList ? 'list' : ''
                }
            };
        }
        if (block.fields[fieldKey] && typeof block.fields[fieldKey].value === 'undefined') {
            block.fields[fieldKey].value = varItem.name;
        }
    }
    return block;
};

    // Refrescar lista de variables y su estado de visualización en pantalla
    const refreshVariables = useCallback(() => {
        if (!vm || !vm.runtime) return;
        const vars = [];
        const seenIds = new Set();

        // 1. Escenario (Variables globales)
        const stage = typeof vm.runtime.getTargetForStage === 'function'
            ? vm.runtime.getTargetForStage()
            : null;
        if (stage && stage.variables) {
            for (const [id, v] of Object.entries(stage.variables)) {
                if (v.type === '' || v.type === 'list') {
                    const isVisible = !!(
                        (vm.runtime._monitorState && vm.runtime._monitorState.get(id)?.get('visible')) ||
                        (vm.runtime.monitorBlocks && vm.runtime.monitorBlocks.getBlock(id)?.isMonitored)
                    );
                    const varItem = {
                        id,
                        name: v.name,
                        type: v.type === 'list' ? 'list' : 'variable',
                        value: v.value,
                        isGlobal: true,
                        visible: isVisible
                    };
                    ensureMonitorBlockForVariable(vm, varItem);
                    vars.push(varItem);
                    seenIds.add(id);
                }
            }
        }

        // 2. Sprite actual (Variables locales)
        const editingTarget = vm.editingTarget;
        if (editingTarget && editingTarget !== stage && editingTarget.variables) {
            for (const [id, v] of Object.entries(editingTarget.variables)) {
                if (!seenIds.has(id) && (v.type === '' || v.type === 'list')) {
                    const isVisible = !!(
                        (vm.runtime._monitorState && vm.runtime._monitorState.get(id)?.get('visible')) ||
                        (vm.runtime.monitorBlocks && vm.runtime.monitorBlocks.getBlock(id)?.isMonitored)
                    );
                    const varItem = {
                        id,
                        name: v.name,
                        type: v.type === 'list' ? 'list' : 'variable',
                        value: v.value,
                        isGlobal: false,
                        targetName: editingTarget.getName ? editingTarget.getName() : 'Sprite',
                        visible: isVisible
                    };
                    ensureMonitorBlockForVariable(vm, varItem);
                    vars.push(varItem);
                    seenIds.add(id);
                }
            }
        }

        setVariablesList(vars);
    }, [vm]);

    useEffect(() => {
        refreshVariables();
        if (!vm) return;

        const handleUpdate = () => refreshVariables();
        vm.addListener('MONITORS_UPDATE', handleUpdate);
        vm.addListener('PROJECT_CHANGED', handleUpdate);
        vm.addListener('workspaceUpdate', handleUpdate);
        vm.addListener('targetsUpdate', handleUpdate);
        vm.addListener('targetStateUpdate', handleUpdate);

        const timer = setInterval(refreshVariables, 1000);

        return () => {
            vm.removeListener('MONITORS_UPDATE', handleUpdate);
            vm.removeListener('PROJECT_CHANGED', handleUpdate);
            vm.removeListener('workspaceUpdate', handleUpdate);
            vm.removeListener('targetsUpdate', handleUpdate);
            vm.removeListener('targetStateUpdate', handleUpdate);
            clearInterval(timer);
        };
    }, [vm, refreshVariables]);

    const handleToggleMonitor = useCallback((varItem) => {
        if (!vm || !vm.runtime) return;
        const newVisible = !varItem.visible;

        // Asegurar que el bloque monitor exista en runtime.monitorBlocks
        ensureMonitorBlockForVariable(vm, varItem);

        if (vm.runtime.monitorBlocks) {
            vm.runtime.monitorBlocks.changeBlock({
                id: varItem.id,
                element: 'checkbox',
                value: newVisible
            }, vm.runtime);
        } else if (newVisible && typeof vm.runtime.requestShowMonitor === 'function') {
            vm.runtime.requestShowMonitor(varItem.id);
        } else if (!newVisible && typeof vm.runtime.requestHideMonitor === 'function') {
            vm.runtime.requestHideMonitor(varItem.id);
        }

        if (typeof vm.emitProjectChanged === 'function') {
            vm.emitProjectChanged();
        }
        refreshVariables();
    }, [vm, refreshVariables]);

    const handleToggleAllMonitors = useCallback((show) => {
        if (!vm || !vm.runtime) return;
        variablesList.forEach(v => {
            ensureMonitorBlockForVariable(vm, v);
            if (vm.runtime.monitorBlocks) {
                vm.runtime.monitorBlocks.changeBlock({
                    id: v.id,
                    element: 'checkbox',
                    value: show
                }, vm.runtime);
            }
        });
        if (typeof vm.emitProjectChanged === 'function') {
            vm.emitProjectChanged();
        }
        refreshVariables();
    }, [vm, variablesList, refreshVariables]);

    const handleCreateVariable = useCallback((e) => {
        if (e) e.preventDefault();
        if (!newVarName.trim() || !vm || !vm.runtime) return;
        const name = newVarName.trim();
        const stage = typeof vm.runtime.getTargetForStage === 'function'
            ? vm.runtime.getTargetForStage()
            : vm.editingTarget;
        if (stage) {
            if (typeof stage.lookupVariableByNameAndType === 'function') {
                const existing = stage.lookupVariableByNameAndType(name, '', true);
                if (existing) {
                    setNewVarName('');
                    return;
                }
            }
            let created = null;
            if (typeof stage.createVariable === 'function') {
                created = stage.createVariable(null, name, '');
            }
            if (created) {
                ensureMonitorBlockForVariable(vm, {
                    id: created.id,
                    name: created.name,
                    type: 'variable',
                    value: created.value,
                    isGlobal: true,
                    visible: false
                });
            }
            if (typeof vm.emitWorkspaceUpdate === 'function') {
                vm.emitWorkspaceUpdate();
            }
            if (typeof vm.emitProjectChanged === 'function') {
                vm.emitProjectChanged();
            }
            setNewVarName('');
            refreshVariables();
        }
    }, [vm, newVarName, refreshVariables]);

    const handleInsertText = useCallback((textToInsert) => {
        if (!codeRef.current) return;
        const textarea = codeRef.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const current = draftCodeRef.current || '';
        const newValue = current.substring(0, start) + textToInsert + current.substring(end);
        setDraftCode(newValue);
        draftCodeRef.current = newValue;
        if (onCodeChange) onCodeChange(newValue);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.selectionStart = start + textToInsert.length;
            textarea.selectionEnd = start + textToInsert.length;
        });
    }, [onCodeChange]);
    // Tamaño de fuente del editor Python (persistido)
    const [fontSize, setFontSize] = useState(() => {
        try {
            const prefs = loadPreferences();
            return (prefs && prefs.fontSize) || 14;
        } catch (e) {
            return 14;
        }
    });

    // Ancho del panel Python persistido en preferencias (en píxeles)
    const [panelWidth, setPanelWidth] = useState(() => {
        try {
            const prefs = loadPreferences();
            if (prefs && typeof prefs.panelWidth === 'number' && prefs.panelWidth >= 280) {
                return Math.min(window.innerWidth - 80, prefs.panelWidth);
            }
        } catch (e) {}
        return Math.max(360, Math.round(window.innerWidth * 0.5));
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(panelWidth);

    const handleResizeMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStartXRef.current = e.clientX;
        resizeStartWidthRef.current = panelWidth;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    }, [panelWidth]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const deltaX = resizeStartXRef.current - e.clientX;
            const parentWidth = window.innerWidth;
            const minWidth = 280;
            const maxWidth = Math.max(minWidth, parentWidth - 80);
            const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidthRef.current + deltaX));
            setPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            setPanelWidth(currentWidth => {
                try {
                    savePreferences({ panelWidth: currentWidth });
                } catch (e) {}
                return currentWidth;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizing]);

    const lastScrollLogRef = useRef(0);

    // Sincronizar el layout del textarea y el highlighter. Ambas capas deben
    // tener el MISMO ancho de texto para que envuelvan (wrap) las líneas largas
    // en el MISMO punto; si no, el cursor (textarea) no coincide con lo que se
    // ve (highlighter) y al hacer scroll el texto "se corre" (escribes arriba
    // o abajo de donde estás parado).
    //
    // Realimentación: la línea-content del highlighter debe tener el mismo ancho
    // que el texto del textarea. Como ambas capas comparten gutter y padding,
    // basta con igualar hs.clientWidth == ta.clientWidth. Cada llamada ajusta
    // --editor-sbw en la diferencia observada y converge en 1-2 pasos,
    // corrigiendo cualquier diferencia de renderizado (scrollbars overlay,
    // redondeo de píxeles, etc.). Además, diagnostica si las alturas de
    // contenido difieren (wrap desincronizado = el bug de "escribes arriba/abajo").
    const syncLayout = useCallback(() => {
        const wrapper = editorWrapperRef.current;
        const ta = codeRef.current;
        const hs = highlighterRef.current;
        if (!wrapper) return;

        // Modo lectura: no hay textarea, el highlighter usa ancho completo.
        if (!ta) {
            const next = '0px';
            if (wrapper.style.getPropertyValue('--editor-sbw') !== next) {
                wrapper.style.setProperty('--editor-sbw', next);
            }
            // La barra de plegado no debe cubrir el scrollbar del highlighter (8px).
            if (wrapper.style.getPropertyValue('--py-overlay-sbw') !== '8px') {
                wrapper.style.setProperty('--py-overlay-sbw', '8px');
            }
            return;
        }

        // Corrección fina (realimentación): la línea-content del highlighter
        // debe tener el MISMO ancho que el texto del textarea. Como ambas capas
        // comparten gutter y padding, basta con igualar hs.clientWidth ==
        // ta.clientWidth. Cada llamada ajusta --editor-sbw en la diferencia
        // observada; converge en 1-2 pasos y corrige cualquier diferencia de
        // renderizado (scrollbars overlay, redondeo, etc.).
        const currentSbw = parseFloat(wrapper.style.getPropertyValue('--editor-sbw')) || 0;
        let nextSbw = currentSbw;
        if (hs) {
            const diff = hs.clientWidth - ta.clientWidth;
            if (Math.abs(diff) > 1) {
                nextSbw = Math.max(0, currentSbw + diff);
                console.log('[PythonEditor][sync] ancho corregido:', {
                    hsClientW: hs.clientWidth,
                    taClientW: ta.clientWidth,
                    diff,
                    currentSbw,
                    nextSbw
                });
            }
        }

        const next = `${nextSbw}px`;
        if (wrapper.style.getPropertyValue('--editor-sbw') !== next) {
            wrapper.style.setProperty('--editor-sbw', next);
            console.log('[PythonEditor][sync] sbw:', nextSbw, 'px', {
                taClientW: ta.clientWidth,
                hsClientW: hs ? hs.clientWidth : null
            });
        }
        // La barra de plegado no debe cubrir el scrollbar del textarea: termina
        // donde acaba el área de texto (a la izquierda del scrollbar).
        if (wrapper.style.getPropertyValue('--py-overlay-sbw') !== next) {
            wrapper.style.setProperty('--py-overlay-sbw', next);
        }

        // 3) Diagnóstico de wrap desincronizado (limitado para no inundar).
        if (hs && Math.abs(ta.scrollHeight - hs.scrollHeight) > 3) {
            const now = performance.now();
            if (now - lastScrollLogRef.current > 300) {
                lastScrollLogRef.current = now;
                // Medidas extra para localizar la causa del desfase:
                //  - lineContentW: ancho real del texto del highlighter
                //    (si > taTextW, la línea no se encogió → palabra larga
                //    sin romper = min-width:auto del flex item).
                //  - taTextW: ancho del texto del textarea (clientWidth - paddings).
                //  - codeDisplayH: altura del contenido del highlighter.
                const codeDisplay = hs.firstElementChild || null;
                const firstLine = codeDisplay ? codeDisplay.firstElementChild : null;
                const lineContent = firstLine ? firstLine.children[1] || null : null;
                const taPadL = parseFloat(getComputedStyle(ta).paddingLeft);
                const taPadR = parseFloat(getComputedStyle(ta).paddingRight);
                const taTextW = isNaN(taPadL) ? null : ta.clientWidth - taPadL - taPadR;
                console.warn('[PythonEditor][sync] ALTURAS DESINCRONIZADAS (wrap distinto → escribes en otra línea):', {
                    textareaScrollHeight: ta.scrollHeight,
                    highlighterScrollHeight: hs.scrollHeight,
                    diff: hs.scrollHeight - ta.scrollHeight,
                    sbw: nextSbw,
                    taClientW: ta.clientWidth,
                    hsClientW: hs.clientWidth,
                    lineContentW: lineContent ? lineContent.clientWidth : null,
                    taTextW,
                    codeDisplayH: codeDisplay ? codeDisplay.scrollHeight : null
                });
            }
        }
    }, []);

    useLayoutEffect(() => {
        syncLayout();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
            syncLayout();
            positionFoldsRef.current();
        });
        if (resizeObserver && editorWrapperRef.current) resizeObserver.observe(editorWrapperRef.current);
        if (resizeObserver && codeRef.current) resizeObserver.observe(codeRef.current);
        window.addEventListener('resize', syncLayout);
        return () => {
            window.removeEventListener('resize', syncLayout);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [syncLayout, isLocked, fontSize]);

    // Reposicionar el overlay de plegado cuando cambia el contenido, la fuente,
    // el tamaño del editor o el estado colapsado.
    useLayoutEffect(() => {
        positionFolds();
    }, [positionFolds, displayCode, fontSize, searchOpen, isLocked, panelWidth]);

    // El scrollbar aparece/desaparece cuando el contenido crece/decrece
    // (texto largo), y la barra de búsqueda reduce la altura del editor.
    // Re-sincronizar en esos casos evita que el highlighter y el textarea se
    // desincronicen al hacer scroll (clic en una línea y el cursor escribe en
    // otra).
    useLayoutEffect(() => {
        syncLayout();
    }, [draftCode, searchOpen, syncLayout]);

    // Diagnóstico único al iniciar el editor: muestra el layout inicial para
    // ver si el ancho de ambas capas y sus alturas de contenido coinciden.
    useEffect(() => {
        const t = setTimeout(() => {
            syncLayout();
            const ta = codeRef.current;
            const hs = highlighterRef.current;
            const wr = editorWrapperRef.current;
            console.log('[PythonEditor][init] layout:', {
                taClientW: ta ? ta.clientWidth : null,
                hsClientW: hs ? hs.clientWidth : null,
                taScrollH: ta ? ta.scrollHeight : null,
                hsScrollH: hs ? hs.scrollHeight : null,
                taScrollTop: ta ? Math.round(ta.scrollTop) : null,
                sbw: wr ? wr.style.getPropertyValue('--editor-sbw') : null,
                fontSize
            });
        }, 500);
        return () => clearTimeout(t);
    }, [isLocked, syncLayout, fontSize]);

    // El texto se mantiene local mientras se escribe. Propagar cada tecla hasta
    // GUI vuelve a renderizar casi toda la aplicación, incluido el escenario.
    const commitDraft = () => {
        const pending = codeCommitRef.current;
        if (!pending) return;
        clearTimeout(pending.timer);
        codeCommitRef.current = null;
        pending.onCodeChange(pending.code);
    };

    useEffect(() => {
        if (codeCommitRef.current && targetKey === lastTargetRef.current) return;
        draftCodeRef.current = pythonCode || '';
        setDraftCode(pythonCode || '');
    }, [pythonCode, targetKey]);

    useEffect(() => () => {
        commitDraft();
        if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    }, []);

    // Resetear estado cuando cambia el target (sprite/escenario)
    useEffect(() => {
        if (targetKey !== lastTargetRef.current) {
            // Resetear referencia de código sincronizado para el nuevo target
            lastSyncedCodeRef.current = '';
            // Confirmar el texto pendiente usando el callback del target anterior.
            commitDraft();
            lastTargetRef.current = targetKey;
            // Limpiar errores del target anterior
            setErrors([]);
        }
    }, [targetKey]);

    // Sincronizar scroll entre textarea y highlighter. También re-sincronizamos
    // el layout en cada frame: si el texto crece y aparece el scrollbar, el
    // --editor-sbw debe actualizarse o el highlighter envuelve distinto.
    const handleScroll = (e) => {
        const {scrollTop, scrollLeft} = e.target;
        if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = requestAnimationFrame(() => {
            syncLayout();
            if (highlighterRef.current) {
                highlighterRef.current.scrollTop = scrollTop;
                highlighterRef.current.scrollLeft = scrollLeft;
                // Diagnóstico: si el highlighter no pudo llegar a scrollTop
                // (contenido más corto por wrap distinto), el scroll está
                // desincronizado y el texto visible no coincide con el cursor.
                const hsScroll = highlighterRef.current.scrollTop;
                if (Math.abs(hsScroll - scrollTop) > 1) {
                    console.warn('[PythonEditor][sync] scroll clamp (highlighter no alcanza):', {
                        textareaScrollTop: scrollTop,
                        highlighterScrollTop: hsScroll
                    });
                }
            }
            positionFolds();
            scrollFrameRef.current = null;
        });
    };

    // Encuentra el paréntesis/corchete/llave que coincide con el que está bajo
    // el cursor (o justo antes). Devuelve {start, end} con end EXCLUSIVO.
    const findMatchingBracket = useCallback((code, pos) => {
        if (!code) return null;
        const charAtCursor = code[pos];
        if (BRACKET_CLOSE[charAtCursor]) {
            // El cursor está sobre un cierre → buscar su apertura hacia atrás.
            let depth = 1;
            for (let i = pos - 1; i >= 0; i--) {
                const c = code[i];
                if (c === charAtCursor) {
                    depth++;
                } else if (c === BRACKET_CLOSE[charAtCursor]) {
                    depth--;
                    if (depth === 0) return {start: i, end: pos + 1};
                }
            }
            return null;
        }
        const charBefore = code[pos - 1];
        if (AUTO_CLOSE_PAIRS[charBefore]) {
            // El cursor está justo después de una apertura → buscar su cierre.
            let depth = 1;
            for (let i = pos; i < code.length; i++) {
                const c = code[i];
                if (c === AUTO_CLOSE_PAIRS[charBefore]) {
                    depth--;
                    if (depth === 0) return {start: pos - 1, end: i + 1};
                } else if (c === charBefore) {
                    depth++;
                }
            }
            return null;
        }
        return null;
    }, []);

    // Línea del cursor (resaltado estilo Monaco) + posición Ln/Col + paréntesis
    // coincidente + auto-expansión de bloques plegados bajo el cursor.
    const updateActiveLine = useCallback(() => {
        const ta = codeRef.current;
        if (!ta) return;
        const selStart = ta.selectionStart;
        const upTo = ta.value.slice(0, selStart);
        const line = upTo.split('\n').length;
        if (activeLine !== line) {
            console.log('[PythonEditor] línea activa:', line);
            setActiveLine(line);
        }

        // Posición del cursor para el footer (Ln X, Col Y)
        const col = selStart - (upTo.lastIndexOf('\n') + 1) + 1;
        setCursorPos(prev => (prev.line === line && prev.col === col) ? prev : {line, col});

        // Paréntesis/corchete coincidente con el cursor
        const bracket = findMatchingBracket(ta.value, selStart);
        setBracketRanges(prev => {
            if (!bracket && !prev) return prev;
            if (bracket && prev && bracket.start === prev.start && bracket.end === prev.end) return prev;
            return bracket;
        });

        // Auto-expandir los bloques plegados que contienen el cursor (flechas).
        // Se expanden TODOS los que contienen la línea (soportar anidados).
        collapsedFolds.forEach(f => {
            if (line >= f.start && line <= f.end) toggleFold(f.sig);
        });

        // Diagnóstico del bug "escribes arriba/abajo de donde estás parado":
        // si al mover el cursor las alturas de contenido difieren, el wrap está
        // desincronizado y el caret no coincide con lo que se ve.
        const hs = highlighterRef.current;
        if (hs) {
            const heightDelta = ta.scrollHeight - hs.scrollHeight;
            const scrollDelta = Math.abs(ta.scrollTop - hs.scrollTop);
            if (Math.abs(heightDelta) > 3 || scrollDelta > 1) {
                const now = performance.now();
                if (now - lastScrollLogRef.current > 300) {
                    lastScrollLogRef.current = now;
                    const wrapperSbw = editorWrapperRef.current ?
                        editorWrapperRef.current.style.getPropertyValue('--editor-sbw') : '?';
                    console.warn('[PythonEditor][caret] cursor en línea', line, 'con desync:', {
                        taScrollTop: Math.round(ta.scrollTop),
                        hsScrollTop: Math.round(hs.scrollTop),
                        taScrollHeight: ta.scrollHeight,
                        hsScrollHeight: hs.scrollHeight,
                        diffAlturas: heightDelta,
                        sbw: wrapperSbw
                    });
                }
            }
        }
    }, [activeLine, findMatchingBracket, collapsedFolds, toggleFold]);

    // Coincidencias de búsqueda sobre el código que muestra el highlighter.
    // Avanzar q.length (no de 1 en 1) para obtener coincidencias NO superpuestas,
    // igual que el buscador de Monaco: si no, "aa" en "aaaa" daría rangos que se
    // solapan y el highlighter duplicaría caracteres al renderizarlos.
    const searchMatches = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        const matches = [];
        let idx = displayCode.toLowerCase().indexOf(q);
        while (idx !== -1) {
            const line = displayCode.slice(0, idx).split('\n').length;
            matches.push({start: idx, end: idx + q.length, line});
            idx = displayCode.toLowerCase().indexOf(q, idx + q.length);
        }
        console.log('[PythonEditor] coincidencias:', matches.length);
        return matches;
    }, [searchQuery, displayCode]);

    // Llevar una línea a la vista centrándola (estimación: las líneas muy
    // largas pueden estar envueltas, así que no siempre es exacto, pero el
    // scroll-sync del textarea reajusta el highlighter en cada frame).
    const scrollToLine = useCallback((line) => {
        const lineHeight = (fontSize || 14) * 1.7;
        const ta = codeRef.current;
        if (ta) {
            const scrollTop = Math.max(0, (line - 1) * lineHeight - (ta.clientHeight / 2));
            ta.scrollTop = scrollTop;
            if (highlighterRef.current) highlighterRef.current.scrollTop = scrollTop;
        } else if (highlighterRef.current) {
            highlighterRef.current.scrollTop = Math.max(0, (line - 1) * lineHeight - (highlighterRef.current.clientHeight / 2));
        }
    }, [fontSize]);

    // Posicionar el cursor en una coincidencia y llevarla a la vista. NO usa
    // focus() en el textarea: si el foco pasara al textarea, la barra de
    // búsqueda lo perdería y Enter no seguiría navegando entre coincidencias.
    // La coincidencia activa se ve naranja en el highlighter.
    const selectMatch = (match) => {
        const ta = codeRef.current;
        if (ta) {
            ta.setSelectionRange(match.start, match.end);
        }
        scrollToLine(match.line);
        setActiveLine(match.line);
        console.log('[PythonEditor] ir a coincidencia línea:', match.line);
    };

    const goToMatch = (direction) => {
        if (searchMatches.length === 0) return;
        setActiveMatchIndex(prev => {
            const next = (prev + direction + searchMatches.length) % searchMatches.length;
            selectMatch(searchMatches[next]);
            return next;
        });
    };

    const closeSearch = () => {
        setSearchOpen(false);
        setSearchQuery('');
        setActiveMatchIndex(-1);
        const ta = codeRef.current;
        if (ta) {
            const pos = ta.selectionStart;
            ta.setSelectionRange(pos, pos);
            // Devolver el foco al editor al cerrar la búsqueda (estilo Monaco)
            ta.focus();
        }
    };

    // Resetear línea activa y resaltado de paréntesis al bloquear el panel o
    // cambiar de sprite (el textarea desaparece y quedaría información obsoleta).
    useEffect(() => {
        setActiveLine(0);
        setBracketRanges(null);
    }, [isLocked, targetKey]);

    // Atajo de teclado Ctrl+F / Cmd+F para abrir la búsqueda. Solo se
    // intercepta cuando el foco está dentro del panel Python (o en el cuerpo)
    // para no robarle el Ctrl+F al buscador de bloques u otras partes de la app.
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (!isOpen) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                const el = e.target;
                const inPanel = el && el.closest && el.closest('[data-stblock-python-panel="true"]');
                if (inPanel || el === document.body) {
                    e.preventDefault();
                    setSearchOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen]);

    // Auto-sincronización cuando cambia el código (debounced)
    useEffect(() => {
        // Solo sincronizar si:
        // - El panel está desbloqueado
        // - Hay código
        // - La función de sync existe
        // - El código es diferente al último sincronizado
        if (!isLocked && onSyncToBlocks && pythonCode !== lastSyncedCodeRef.current) {
            // Limpiar timer anterior
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
            }

            // La reconstrucción de bloques es costosa; esperar una pausa real.
            syncTimerRef.current = setTimeout(() => {
                const result = onSyncToBlocks(pythonCode, {centerGeneratedBlocks: true});
                if (result) {
                    // Actualizar errores
                    setErrors(result.errors || []);
                    // Actualizar lastSyncedCodeRef también cuando no se generaron
                    // bloques (result.success): si solo se actualizara con
                    // blocksCreated > 0, el efecto de sync se re-dispararía en
                    // bucle porque pythonCode nunca coincidiría con la referencia.
                    if (result.success) {
                        lastSyncedCodeRef.current = pythonCode;
                    }
                }
            }, 450);
        }

        // Cleanup
        return () => {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
            }
        };
    }, [pythonCode, isLocked, onSyncToBlocks, targetKey]);

    // Separar errores bloqueantes de advertencias educativas.
    const errorLines = useMemo(
        () => errors.filter(e => e.severity !== 'warning').map(e => e.line),
        [errors]
    );
    const warningLines = useMemo(
        () => errors.filter(e => e.severity === 'warning').map(e => e.line),
        [errors]
    );
    const errorCount = errorLines.length;
    const warningCount = warningLines.length;
    const diagnosticsLabel = useMemo(() => {
        const parts = [];
        if (errorCount) parts.push(`${errorCount} ${errorCount === 1 ? 'Error' : 'Errores'}`);
        if (warningCount) {
            parts.push(`${warningCount} ${warningCount === 1 ? 'Advertencia' : 'Advertencias'}`);
        }
        return parts.join(' • ');
    }, [errorCount, warningCount]);

    // Solo mostrar en modo Programacion
    if (!isProgrammingMode) {
        return null;
    }

    const handleCopy = () => {
        const codeToCopy = draftCode || '# Sin codigo para copiar';
        navigator.clipboard.writeText(codeToCopy).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
            if (onCopyCode) onCopyCode();
        }).catch(() => {
            // Fallback para navegadores que no soportan clipboard API
            if (codeRef.current) {
                codeRef.current.select();
                document.execCommand('copy');
                setCopyFeedback(true);
                setTimeout(() => setCopyFeedback(false), 2000);
            }
        });
    };

    // Propaga un valor del draft a la GUI de forma debounced (la reconstrucción
    // de bloques es costosa). Reutilizado por el textarea y por las ediciones
    // programáticas (Tab, Enter, auto-cierre, comentar, plegar...).
    const commitEdit = useCallback((value) => {
        if (isLocked || !onCodeChange) return;
        if (codeCommitRef.current) clearTimeout(codeCommitRef.current.timer);
        const pending = {
            code: value,
            onCodeChange,
            timer: setTimeout(() => {
                if (codeCommitRef.current !== pending) return;
                codeCommitRef.current = null;
                onCodeChange(value);
            }, 150)
        };
        codeCommitRef.current = pending;
    }, [isLocked, onCodeChange]);

    // Aplica una edición programática y restaura la selección en el siguiente
    // frame (para no pelear con el re-render del textarea controlado).
    const applyCodeEdit = useCallback((value, nextStart, nextEnd) => {
        draftCodeRef.current = value;
        setDraftCode(value);
        commitEdit(value);
        const ta = codeRef.current;
        if (ta && typeof nextStart === 'number' && typeof nextEnd === 'number') {
            requestAnimationFrame(() => {
                ta.focus();
                ta.setSelectionRange(nextStart, nextEnd);
            });
        }
    }, [commitEdit]);

    const handleCodeEdit = (e, forceCommit = false) => {
        const value = e.target.value;
        draftCodeRef.current = value;
        setDraftCode(value);
        if (isComposingRef.current && !forceCommit) return;
        commitEdit(value);
    };

    // Tab / Shift+Tab: indentar la selección completa sin borrar texto (VS Code).
    const handleTab = (e, ta) => {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const code = draftCodeRef.current;
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        let nextStart;
        let nextEnd;

        if (e.shiftKey) {
            // Dedent: quitar hasta 4 espacios por línea, sin pasarse del indente real.
            const selected = code.substring(lineStart, end);
            const lines = selected.split('\n');
            const newLines = lines.map(l => l.replace(/^ {1,4}/, ''));
            const replacement = newLines.join('\n');
            const firstRemoved = lines[0].length - newLines[0].length;
            const caretOffset = start - lineStart;
            const removedBeforeCaret = Math.min(caretOffset, firstRemoved);
            if (start === end) {
                nextStart = nextEnd = start - removedBeforeCaret;
            } else {
                nextStart = start - removedBeforeCaret;
                nextEnd = lineStart + replacement.length;
            }
            const newValue = code.substring(0, lineStart) + replacement + code.substring(end);
            applyCodeEdit(newValue, nextStart, nextEnd);
            return;
        }

        if (start === end) {
            // Tab simple: alinear al siguiente múltiplo de 4.
            const colInLine = start - lineStart;
            const spaces = 4 - (colInLine % 4);
            const newValue = code.substring(0, start) + ' '.repeat(spaces) + code.substring(end);
            applyCodeEdit(newValue, start + spaces, start + spaces);
            return;
        }

        // Indentar todas las líneas seleccionadas (desde el inicio de la línea
        // donde empieza la selección). Si la selección termina justo en un salto
        // de línea, no se indenta la línea vacía final (como hace VS Code).
        const selected = code.substring(lineStart, end);
        const endsWithNewline = selected.endsWith('\n');
        const body = endsWithNewline ? selected.slice(0, -1) : selected;
        const replacement = body.replace(/^/gm, '    ') + (endsWithNewline ? '\n' : '');
        const added = replacement.length - selected.length;
        applyCodeEdit(
            code.substring(0, lineStart) + replacement + code.substring(end),
            start + 4,
            end + added
        );
    };

    // Enter con auto-indentación: hereda la indentación de la línea y suma 4
    // espacios si la línea termina en ':' (abre un bloque) o si hay paréntesis
    // sin cerrar (continuación de expresión).
    const handleEnter = (e, ta) => {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const code = draftCodeRef.current;
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        const beforeCaret = code.substring(lineStart, start);
        const baseIndent = (beforeCaret.match(/^[ \t]*/) || [''])[0];
        const trimmed = beforeCaret.trimEnd();
        const openParens = (beforeCaret.match(/[([{]/g) || []).length;
        const closeParens = (beforeCaret.match(/[)\]}]/g) || []).length;
        let nextIndent = baseIndent;
        if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
            nextIndent += '    ';
        } else if (openParens > closeParens) {
            nextIndent += '    ';
        }
        const newValue = code.substring(0, start) + '\n' + nextIndent + code.substring(end);
        const caret = start + 1 + nextIndent.length;
        applyCodeEdit(newValue, caret, caret);
    };

    // Auto-cierre de paréntesis/corchetes/llaves/comillas (estilo VS Code).
    const handleAutoClose = (e, ta, key) => {
        const close = AUTO_CLOSE_PAIRS[key];
        if (!close) return false;
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const code = draftCodeRef.current;
        const nextChar = code[end] || '';
        const prevChar = code[start - 1] || '';

        if (start === end) {
            // Comillas: no auto-cerrar si escribimos dentro de una palabra
            // (ej. un apóstrofo) ni duplicar si ya hay una igual después.
            if (key === "'" || key === '"') {
                if (/[A-Za-z0-9_áéíóúñÁÉÍÓÚÑ]/.test(nextChar) ||
                    /[A-Za-z0-9_áéíóúñÁÉÍÓÚÑ]/.test(prevChar)) {
                    const newValue = code.substring(0, start) + key + code.substring(end);
                    applyCodeEdit(newValue, start + 1, start + 1);
                    return true;
                }
                if (nextChar === key) {
                    const newValue = code.substring(0, start) + key + code.substring(end + 1);
                    applyCodeEdit(newValue, start + 1, start + 1);
                    return true;
                }
            }
            // Paréntesis/corchetes: si ya hay un cierre justo después, saltarlo.
            if (nextChar === close) {
                ta.setSelectionRange(start + 1, start + 1);
                return true;
            }
            const newValue = code.substring(0, start) + key + close + code.substring(end);
            applyCodeEdit(newValue, start + 1, start + 1);
        } else {
            // Hay selección: envolverla con el par.
            const selected = code.substring(start, end);
            const newValue = code.substring(0, start) + key + selected + close + code.substring(end);
            applyCodeEdit(newValue, start + 1, end + 1);
        }
        return true;
    };

    // Backspace dentro de un par vacío: borra ambos caracteres.
    const handleBackspace = (e, ta) => {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (start !== end || start === 0) return false;
        const code = draftCodeRef.current;
        const prev = code[start - 1];
        const next = code[start] || '';
        const close = AUTO_CLOSE_PAIRS[prev];
        if (close && close === next) {
            e.preventDefault();
            const newValue = code.substring(0, start - 1) + code.substring(end + 1);
            applyCodeEdit(newValue, start - 1, start - 1);
            return true;
        }
        return false;
    };

    // Ctrl+/ (Cmd+/) : comentar / descomentar líneas.
    const toggleComment = () => {
        const ta = codeRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const code = draftCodeRef.current;
        const firstLineStart = code.lastIndexOf('\n', start - 1) + 1;
        let selEnd;
        if (start === end) {
            const nl = code.indexOf('\n', start);
            selEnd = nl === -1 ? code.length : nl;
        } else if (code[end - 1] === '\n') {
            selEnd = end - 1;
        } else {
            const nl = code.indexOf('\n', end);
            selEnd = nl === -1 ? code.length : nl;
        }
        const block = code.substring(firstLineStart, selEnd);
        const lines = block.split('\n');
        const nonEmpty = lines.filter(l => l.trim() !== '');
        const allCommented = nonEmpty.length > 0 && nonEmpty.every(l => /^\s*#/.test(l));
        const newBlock = allCommented
            ? lines.map(l => l.replace(/^(\s*)#/, '$1')).join('\n')
            : lines.map(l => (l.trim() === '' ? l : '#' + l)).join('\n');

        let nextStart;
        let nextEnd;
        if (start === end) {
            const caretOffset = start - firstLineStart;
            const firstLineBefore = lines[0];
            const firstLineAfter = newBlock.split('\n')[0];
            const delta = firstLineAfter.length - firstLineBefore.length;
            const newCaret = Math.max(firstLineStart,
                Math.min(start + delta, firstLineStart + firstLineAfter.length));
            nextStart = nextEnd = newCaret;
        } else {
            nextStart = firstLineStart;
            nextEnd = firstLineStart + newBlock.length;
        }
        const newValue = code.substring(0, firstLineStart) + newBlock + code.substring(selEnd);
        applyCodeEdit(newValue, nextStart, nextEnd);
    };

    // Al salir del textarea, confirmar cualquier texto pendiente. También
    // resetear el estado de composición IME: si el usuario hace clic fuera
    // durante una composición (sin compositionEnd), el texto quedaría sin
    // confirmar y las siguientes pulsaciones se ignorarían.
    const handleBlur = () => {
        isComposingRef.current = false;
        commitDraft();
    };

    // Ajustar tamaño de fuente del editor Python (10px - 28px)
    const updateFontSize = (delta) => {
        setFontSize(prev => {
            const next = Math.min(28, Math.max(10, prev + delta));
            try {
                savePreferences({fontSize: next});
            } catch (e) {
                // Ignorar errores de persistencia
            }
            return next;
        });
    };

    return (
        <>
            {/* Boton de toggle en el borde */}
            <div
                className={classNames(styles.toggleButton, {
                    [styles.panelOpen]: isOpen
                })}
                style={isOpen ? { right: `calc(${panelWidth}px - 2px)` } : undefined}
                onClick={onToggleOpen}
                title={isOpen ? 'Cerrar panel Python' : 'Abrir panel Python'}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onToggleOpen();
                }}
            >
                <div className={styles.toggleIcon}>
                    <span className={styles.pythonLogo}>Py</span>
                    <span className={styles.toggleArrow}>{isOpen ? '›' : '‹'}</span>
                </div>
            </div>

            {/* Panel principal */}
            <div
                data-stblock-python-panel="true"
                className={classNames(styles.pythonPanel, {
                    [styles.open]: isOpen,
                    [styles.resizing]: isResizing
                })}
                style={{
                    width: isOpen ? `${panelWidth}px` : 0
                }}
            >
                {/* Borde interactivo para redimensionar el ancho */}
                {isOpen && (
                    <div
                        className={classNames(styles.resizeHandle, {
                            [styles.isResizing]: isResizing
                        })}
                        onMouseDown={handleResizeMouseDown}
                        title="Arrastra para redimensionar el panel de Python"
                    >
                        <div className={styles.resizeHandleLine} />
                    </div>
                )}
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <PythonIcon />
                        <span>Python</span>
                        <span className={styles.targetBadge}>
                            {isStage ? <StageIcon /> : <SpriteIcon />}
                            {targetName || (isStage ? 'Escenario' : 'Sprite')}
                        </span>
                        {isKeyLocked ? (
                            <span className={classNames(styles.modeIndicator, styles.keyLockedIndicator)}>
                                Bloqueado con clave
                            </span>
                        ) : isLocked ? (
                            <span className={styles.modeIndicator}>Solo lectura</span>
                        ) : (
                            <span className={classNames(styles.modeIndicator, styles.editMode)}>
                                Edición activa
                            </span>
                        )}
                    </div>
                    <div className={styles.headerActions}>
                        {/* Botón Gestor de Variables en pantalla */}
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.variablesActive]: showVariables
                            })}
                            onClick={() => {
                                setShowVariables(!showVariables);
                                if (!showVariables && showHelp) setShowHelp(false);
                            }}
                            title="Mostrar / Ocultar variables en el escenario"
                        >
                            <VariableIcon />
                            {variablesList.filter(v => v.visible).length > 0 && (
                                <span className={styles.activeMonitorCount}>
                                    {variablesList.filter(v => v.visible).length}
                                </span>
                            )}
                        </button>
                        {/* Botón Ayuda */}
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.helpActive]: showHelp
                            })}
                            onClick={() => {
                                setShowHelp(!showHelp);
                                if (!showHelp && showVariables) setShowVariables(false);
                            }}
                            title="Referencia rápida de Python"
                        >
                            <HelpIcon />
                        </button>
                        {/* Botón Búsqueda (Ctrl+F) */}
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.searchActive]: searchOpen
                            })}
                            onClick={() => {
                                if (searchOpen) {
                                    closeSearch();
                                } else {
                                    setSearchOpen(true);
                                    setSearchQuery('');
                                    setActiveMatchIndex(-1);
                                }
                            }}
                            title="Buscar en el código (Ctrl+F)"
                        >
                            <SearchIcon />
                        </button>
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.unlocked]: !isLocked
                            })}
                            onClick={isKeyLocked ? undefined : onToggleLock}
                            disabled={isKeyLocked}
                            title={isKeyLocked
                                ? 'El candado con clave fija el modo Python (desbloquea con la clave)'
                                : (isLocked ? 'Desbloquear para editar' : 'Bloquear edicion')}
                        >
                            {isLocked ? <LockIcon /> : <UnlockIcon />}
                        </button>
                        {/* Botón candado con clave (solo sesión) */}
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.keyLockActive]: isKeyLocked
                            })}
                            onClick={isKeyLocked ? onRequestKeyUnlock : onRequestKeyLock}
                            title={isKeyLocked
                                ? 'Desbloquear modo bloque (ingresa la clave)'
                                : 'Bloquear modo Python con clave (solo alumnos)'
                            }
                        >
                            {isKeyLocked ? <LockKeyIcon /> : <KeyIcon />}
                        </button>
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.copied]: copyFeedback
                            })}
                            onClick={handleCopy}
                            title="Copiar codigo"
                        >
                            <CopyIcon />
                            {copyFeedback && (
                                <span className={styles.copyTooltip}>¡Copiado!</span>
                            )}
                        </button>
                        <button
                            className={styles.actionButton}
                            onClick={onToggleOpen}
                            title="Cerrar panel"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Area de codigo */}
                <div className={styles.codeContainer}>
                    <div className={styles.codeHeader}>
                        <FileIcon />
                        <span className={styles.fileName}>
                            {(targetName || (isStage ? 'escenario' : 'sprite')).toLowerCase().replace(/\s+/g, '_')}.py
                        </span>
                        <div className={styles.zoomControls}>
                            <button
                                className={styles.zoomButton}
                                onClick={() => updateFontSize(-1)}
                                title="Reducir tamaño del texto"
                                disabled={fontSize <= 10}
                            >−</button>
                            <span className={styles.zoomLabel}>{fontSize}px</span>
                            <button
                                className={styles.zoomButton}
                                onClick={() => updateFontSize(1)}
                                title="Aumentar tamaño del texto"
                                disabled={fontSize >= 28}
                            >+</button>
                        </div>
                    </div>
                    {/* Barra de búsqueda */}
                    {searchOpen && (
                        <div className={styles.searchBar}>
                            <input
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => {
                                    const q = e.target.value;
                                    setSearchQuery(q);
                                    // Calcular con el valor NUEVO del query (el
                                    // searchMatches del closure aún es del viejo).
                                    if (!q) {
                                        setActiveMatchIndex(-1);
                                    } else {
                                        const idx = displayCode.toLowerCase().indexOf(q.toLowerCase());
                                        if (idx !== -1) {
                                            setActiveMatchIndex(0);
                                            // Llevar la 1ª coincidencia a la vista
                                            const line = displayCode.slice(0, idx).split('\n').length;
                                            scrollToLine(line);
                                        } else {
                                            setActiveMatchIndex(-1);
                                        }
                                    }
                                }}
                                placeholder="Buscar en el codigo..."
                                autoFocus
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        if (e.shiftKey) goToMatch(-1);
                                        else goToMatch(1);
                                        e.preventDefault();
                                    } else if (e.key === 'Escape') {
                                        closeSearch();
                                    }
                                }}
                            />
                            <span className={styles.searchCount}>
                                {searchQuery && searchMatches.length > 0
                                    ? `${activeMatchIndex + 1} de ${searchMatches.length}`
                                    : (searchQuery ? '0 de 0' : '')}
                            </span>
                            <button
                                className={styles.searchNavButton}
                                onClick={() => goToMatch(-1)}
                                title="Coincidencia anterior (Shift+Enter)"
                                disabled={searchMatches.length === 0}
                            >
                                <ArrowUpIcon />
                            </button>
                            <button
                                className={styles.searchNavButton}
                                onClick={() => goToMatch(1)}
                                title="Siguiente coincidencia (Enter)"
                                disabled={searchMatches.length === 0}
                            >
                                <ArrowDownIcon />
                            </button>
                            <button
                                className={styles.searchCloseButton}
                                onClick={closeSearch}
                                title="Cerrar búsqueda (Esc)"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    )}
                    <div
                        ref={editorWrapperRef}
                        className={styles.editorWrapper}
                        style={{'--py-font-size': `${fontSize}px`}}
                    >
                        {/* Capa de syntax highlighting (siempre visible) */}
                        <div
                            ref={highlighterRef}
                            className={classNames(styles.highlighterScroll, {
                                [styles.scrollable]: isLocked
                            })}
                            onScroll={() => {
                                // Modo lectura: el highlighter controla el scroll.
                                positionFolds();
                                syncLayout();
                            }}
                        >
                            <PythonHighlighter
                                code={displayCode}
                                showLineNumbers={true}
                                errorLines={errorLines}
                                warningLines={warningLines}
                                activeLine={activeLine}
                                searchMatches={searchMatches}
                                activeMatchIndex={activeMatchIndex}
                                collapsedRanges={collapsedRanges}
                                bracketRanges={bracketRanges}
                                className={classNames(styles.highlighterLayer, {
                                    [styles.editable]: !isLocked
                                })}
                            />
                        </div>
                        {/* Textarea transparente para edición (solo cuando desbloqueado) */}
                        {!isLocked && (
                            <textarea
                                ref={codeRef}
                                className={`${styles.editorTextarea} python-editor-textarea no-vm-keyboard`}
                                value={draftCode}
                                onChange={handleCodeEdit}
                                onCompositionStart={() => {
                                    isComposingRef.current = true;
                                }}
                                onCompositionEnd={(e) => {
                                    isComposingRef.current = false;
                                    handleCodeEdit(e, true);
                                }}
                                onBlur={handleBlur}
                                onFocus={() => requestAnimationFrame(updateActiveLine)}
                                onSelect={updateActiveLine}
                                onClick={updateActiveLine}
                                onScroll={handleScroll}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();

                                    // Durante la composición IME (texto predictivo)
                                    // no interceptar teclas: Tab/Enter/auto-cierre
                                    // romperían la composición en curso.
                                    if (isComposingRef.current) return;

                                    if (e.key === 'Tab') {
                                        handleTab(e, e.target);
                                    } else if (e.key === 'Enter') {
                                        handleEnter(e, e.target);
                                    } else if (e.key === 'Backspace') {
                                        handleBackspace(e, e.target);
                                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === '/') {
                                        toggleComment();
                                    } else if (AUTO_CLOSE_PAIRS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                        handleAutoClose(e, e.target, e.key);
                                    } else if (BRACKET_CLOSE[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                        // Cierre: si ya hay uno igual justo después,
                                        // saltarlo sin duplicar (estilo VS Code).
                                        const ta = e.target;
                                        if (ta.selectionStart === ta.selectionEnd &&
                                            draftCodeRef.current[ta.selectionStart] === e.key) {
                                            e.preventDefault();
                                            const pos = ta.selectionStart + 1;
                                            ta.setSelectionRange(pos, pos);
                                        }
                                    }
                                }}
                                onKeyUp={(e) => {
                                    e.stopPropagation();
                                    updateActiveLine();
                                }}
                                onKeyPress={(e) => e.stopPropagation()}
                                onPaste={(e) => e.stopPropagation()}
                                onCut={(e) => e.stopPropagation()}
                                onCopy={(e) => e.stopPropagation()}
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                placeholder="# Escribe codigo Python..."
                            />
                        )}
                        {/* Overlay de plegado: indicadores en el gutter + barras de
                            "N líneas ocultas". pointer-events: none salvo en los
                            indicadores/barras, así el texto sigue siendo editable. */}
                        {folds.length > 0 && (
                            <div ref={foldOverlayRef} className={styles.foldOverlay}>
                                {foldLayouts.map(item => (
                                    <div key={item.sig}>
                                        <button
                                            type="button"
                                            className={classNames(styles.foldIndicator, {
                                                [styles.foldIndicatorCollapsed]: item.collapsed
                                            })}
                                            style={{top: item.top + (item.height - 18) / 2}}
                                            onClick={() => handleFoldClick(item.sig)}
                                            title={item.collapsed
                                                ? `Expandir bloque (${item.hiddenLines} ${item.hiddenLines === 1 ? 'línea oculta' : 'líneas ocultas'})`
                                                : 'Plegar bloque'}
                                            tabIndex={-1}
                                        >
                                            <span className={styles.foldArrow}>▸</span>
                                        </button>
                                        {!item.collapsed && item.guideHeight > 0 && (
                                            <div
                                                className={styles.foldGuide}
                                                style={{top: item.guideTop, height: item.guideHeight}}
                                            />
                                        )}
                                        {item.collapsed && (
                                            <div
                                                className={styles.foldBand}
                                                style={{top: item.bandTop, height: Math.max(1, item.bandHeight)}}
                                                onClick={() => handleFoldClick(item.sig)}
                                                onWheel={(e) => {
                                                    // Permitir scrollear aunque la rueda
                                                    // esté sobre la barra de plegado.
                                                    const ta = codeRef.current;
                                                    if (ta) {
                                                        ta.scrollTop += e.deltaY;
                                                    } else {
                                                        const hs = highlighterRef.current;
                                                        if (hs) {
                                                            hs.scrollTop += e.deltaY;
                                                            requestAnimationFrame(positionFolds);
                                                        }
                                                    }
                                                }}
                                                title="Haz clic para expandir el bloque"
                                            >
                                                <span className={styles.foldBandLabel}>
                                                    {item.hiddenLines} {item.hiddenLines === 1 ? 'línea oculta' : 'líneas ocultas'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Botones de zoom flotantes (estilo bloques) */}
                        <div className={styles.floatingZoomControls}>
                            <button
                                className={styles.floatingZoomButton}
                                onClick={() => updateFontSize(1)}
                                title="Aumentar tamaño del texto"
                                disabled={fontSize >= 28}
                            >
                                +
                            </button>
                            <button
                                className={styles.floatingZoomButton}
                                onClick={() => {
                                    setFontSize(14);
                                    try {
                                        savePreferences({fontSize: 14});
                                    } catch (e) {}
                                }}
                                title="Restablecer zoom"
                            >
                                ⟲
                            </button>
                            <button
                                className={styles.floatingZoomButton}
                                onClick={() => updateFontSize(-1)}
                                title="Reducir tamaño del texto"
                                disabled={fontSize <= 10}
                            >
                                −
                            </button>
                        </div>
                    </div>
                </div>

                {/* Panel de ayuda - Referencia interactiva */}
                {showHelp && (
                    <PythonReferencePanel onClose={() => setShowHelp(false)} />
                )}

                {/* Panel de Variables - Monitores en pantalla */}
                {showVariables && (
                    <div className={styles.variablesPanel}>
                        <div className={styles.variablesHeader}>
                            <div className={styles.variablesHeaderTitle}>
                                <VariableIcon />
                                <span>Variables en pantalla</span>
                                <span className={styles.variableBadge}>
                                    {variablesList.length}
                                </span>
                            </div>
                            <div className={styles.variablesHeaderActions}>
                                {variablesList.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.variablesActionLink}
                                            onClick={() => handleToggleAllMonitors(true)}
                                            title="Mostrar todas las variables en pantalla"
                                        >
                                            Mostrar todas
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.variablesActionLink}
                                            onClick={() => handleToggleAllMonitors(false)}
                                            title="Ocultar todas las variables"
                                        >
                                            Ocultar todas
                                        </button>
                                    </>
                                )}
                                <button
                                    className={styles.variablesClose}
                                    onClick={() => setShowVariables(false)}
                                    title="Cerrar"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>

                        <div className={styles.variablesDesc}>
                            Marca la casilla para mostrar el valor de la variable en el escenario.
                        </div>

                        <div className={styles.variablesList}>
                            {variablesList.length === 0 ? (
                                <div className={styles.noVariablesMsg}>
                                    No hay variables creadas todavía.<br />
                                    Crea una variable abajo o escribe <code>mi_variable = 0</code> en el código.
                                </div>
                            ) : (
                                variablesList.map(item => (
                                    <div
                                        key={item.id}
                                        className={classNames(styles.variableCard, {
                                            [styles.variableCardActive]: item.visible
                                        })}
                                    >
                                        <div className={styles.variableCardLeft}>
                                            <input
                                                type="checkbox"
                                                id={`var_chk_${item.id}`}
                                                checked={item.visible}
                                                onChange={() => handleToggleMonitor(item)}
                                                className={styles.variableCheckbox}
                                                title={item.visible ? 'Ocultar del escenario' : 'Mostrar en el escenario'}
                                            />
                                            <div className={styles.variableInfo}>
                                                <div className={styles.variableNameRow}>
                                                    <label htmlFor={`var_chk_${item.id}`} className={styles.variableName}>
                                                        {item.name}
                                                    </label>
                                                    <span className={classNames(styles.variableBadge, {
                                                        [styles.local]: !item.isGlobal,
                                                        [styles.list]: item.type === 'list'
                                                    })}>
                                                        {item.type === 'list' ? 'Lista' : item.isGlobal ? 'Global' : item.targetName || 'Sprite'}
                                                    </span>
                                                </div>
                                                <div className={styles.variableValuePreview} title="Valor actual en tiempo real">
                                                    Valor: {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value ?? 0)}
                                                </div>
                                            </div>
                                        </div>
                                        {!isLocked && (
                                            <div className={styles.variableCardActions}>
                                                <button
                                                    type="button"
                                                    className={styles.variableInsertBtn}
                                                    onClick={() => handleInsertText(item.name)}
                                                    title={`Insertar "${item.name}" en el código`}
                                                >
                                                    + Insertar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Formulario para crear variable rápidamente */}
                        <form className={styles.variablesCreateBar} onSubmit={handleCreateVariable}>
                            <input
                                type="text"
                                placeholder="Nombre de nueva variable..."
                                value={newVarName}
                                onChange={e => setNewVarName(e.target.value)}
                                className={styles.variablesCreateInput}
                            />
                            <button
                                type="submit"
                                disabled={!newVarName.trim()}
                                className={styles.variablesCreateBtn}
                            >
                                + Crear variable
                            </button>
                        </form>
                    </div>
                )}

                {/* Panel de errores */}
                {!isLocked && errors.length > 0 && showErrors && (
                    <div className={styles.errorsPanel}>
                        <div className={styles.errorsPanelHeader}>
                            <span className={styles.errorsTitle}>
                                {errorCount > 0 ? <ErrorIcon /> : <WarningIcon />}
                                {diagnosticsLabel}
                            </span>
                            <button
                                className={styles.closeErrorsButton}
                                onClick={() => setShowErrors(false)}
                                title="Ocultar errores"
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.errorsList}>
                            {errors.map((error, index) => (
                                <div
                                    key={index}
                                    className={classNames(styles.errorItem, {
                                        [styles.errorTypeError]: error.severity !== 'warning',
                                        [styles.errorTypeWarning]: error.severity === 'warning'
                                    })}
                                >
                                    <span className={styles.errorLine}>Línea {error.line}:</span>
                                    <span className={styles.errorMessage}>{error.message}</span>
                                    {error.suggestion && (
                                        <span className={styles.errorSuggestion}>
                                            Sugerencia: <code>{error.suggestion}</code>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Indicador de errores colapsado */}
                {!isLocked && errors.length > 0 && !showErrors && (
                    <button
                        className={classNames(styles.errorsCollapsed, {
                            [styles.warningsOnly]: errorCount === 0
                        })}
                        onClick={() => setShowErrors(true)}
                        title="Mostrar errores"
                    >
                        {errorCount > 0 ? <ErrorIcon /> : <WarningIcon />}
                        <span>{diagnosticsLabel}</span>
                    </button>
                )}

                {/* Footer con info */}
                <div
                    className={styles.footer}
                    title="Limitación: Pyodide corre en el hilo principal, por lo que un bucle `while True:` congela la pestaña."
                >
                    <InfoIcon />
                    <span className={styles.footerInfo}>
                        {isKeyLocked
                            ? 'Modo solo Python con candado • Los bloques están bloqueados, ingresa la clave para salir'
                            : isLocked
                                ? 'Arrastra bloques para generar código • Usa la bandera verde para ejecutar'
                                : errorCount > 0
                                    ? `${errorCount} error(es) encontrado(s) - Revisa tu código`
                                    : warningCount > 0
                                        ? `${warningCount} advertencia(s) - Los bloques se generaron correctamente`
                                    : 'Escribe código y los bloques se crean automáticamente • La bandera ejecuta el proyecto completo'
                        }
                    </span>
                    {!isLocked && (
                        <span className={styles.cursorPos} title="Posición del cursor">
                            Ln {cursorPos.line}, Col {cursorPos.col}
                        </span>
                    )}
                </div>
            </div>
        </>
    );
};

PythonPanel.propTypes = {
    isOpen: PropTypes.bool,
    pythonCode: PropTypes.string,
    isLocked: PropTypes.bool,
    isKeyLocked: PropTypes.bool,
    onToggleOpen: PropTypes.func,
    onToggleLock: PropTypes.func,
    onRequestKeyLock: PropTypes.func,
    onRequestKeyUnlock: PropTypes.func,
    onCodeChange: PropTypes.func,
    onCopyCode: PropTypes.func,
    onSyncToBlocks: PropTypes.func,
    isProgrammingMode: PropTypes.bool,
    targetId: PropTypes.string,
    targetName: PropTypes.string,
    isStage: PropTypes.bool,
    vm: PropTypes.object
};

PythonPanel.defaultProps = {
    isOpen: false,
    pythonCode: '',
    isLocked: true,
    isKeyLocked: false,
    onRequestKeyLock: () => {},
    onRequestKeyUnlock: () => {},
    isProgrammingMode: true,
    targetId: null,
    targetName: 'Sprite',
    isStage: false,
    vm: null
};

export default PythonPanel;
