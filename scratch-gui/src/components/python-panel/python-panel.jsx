import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './python-panel.css';
import PythonHighlighter from './python-highlighter.jsx';
import PythonReferencePanel from './python-reference-panel.jsx';
import {loadPreferences, savePreferences} from '../../lib/python/python-storage.js';

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

    // Medir el ancho del scrollbar del textarea y compensar el ancho del
    // highlighter para que AMBAS capas envuelvan (wrap) las líneas largas en
    // el MISMO punto. Si no se compensa, en equipos con scrollbars permanentes
    // (p. ej. Windows) el textarea pierde ancho de contenido mientras el
    // highlighter ocupa el ancho completo → las líneas se cortan distinto → el
    // cursor (textarea) no coincide con lo que se ve (highlighter). En equipos
    // con scrollbars overlay (p. ej. macOS) el ancho es 0 y no hay problema;
    // por eso el bug "varía según la máquina".
    useLayoutEffect(() => {
        const measureScrollbar = () => {
            const wrapper = editorWrapperRef.current;
            if (!wrapper) return;
            let sbw = 0;
            // Solo hay textarea en modo edición; en modo lectura el highlighter
            // muestra su propio scrollbar y no necesita compensación.
            if (codeRef.current) {
                sbw = codeRef.current.offsetWidth - codeRef.current.clientWidth;
            }
            wrapper.style.setProperty('--editor-sbw', `${sbw}px`);
        };
        measureScrollbar();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureScrollbar);
        if (resizeObserver && editorWrapperRef.current) resizeObserver.observe(editorWrapperRef.current);
        if (resizeObserver && codeRef.current) resizeObserver.observe(codeRef.current);
        window.addEventListener('resize', measureScrollbar);
        return () => {
            window.removeEventListener('resize', measureScrollbar);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [isLocked, fontSize]);

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

    // Sincronizar scroll entre textarea y highlighter
    const handleScroll = (e) => {
        const {scrollTop, scrollLeft} = e.target;
        if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = requestAnimationFrame(() => {
            if (highlighterRef.current) {
                highlighterRef.current.scrollTop = scrollTop;
                highlighterRef.current.scrollLeft = scrollLeft;
            }
            scrollFrameRef.current = null;
        });
    };

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

    const handleCodeEdit = (e, forceCommit = false) => {
        if (!isLocked && onCodeChange) {
            const value = e.target.value;
            draftCodeRef.current = value;
            setDraftCode(value);
            if (codeCommitRef.current) clearTimeout(codeCommitRef.current.timer);
            codeCommitRef.current = null;
            if (isComposingRef.current && !forceCommit) return;
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
        }
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

    const defaultCode = `# Codigo Python generado por STBlock
# Arrastra bloques para ver el codigo aqui

# Ejemplo:
# sprite.move(10)
# sprite.turn_right(90)
# sprite.say("Hola!")
`;

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
                        >
                            <PythonHighlighter
                                code={isLocked ? (pythonCode || defaultCode) : draftCode}
                                showLineNumbers={true}
                                errorLines={errorLines}
                                warningLines={warningLines}
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
                                onBlur={commitDraft}
                                onScroll={handleScroll}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();

                                    // Manejar Tab y Shift+Tab sin perder selección.
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        const textarea = e.target;
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const lineStart = draftCode.lastIndexOf('\n', start - 1) + 1;
                                        const selected = draftCode.substring(lineStart, end);
                                        let replacement;
                                        let nextStart;
                                        let nextEnd;
                                        if (e.shiftKey) {
                                            replacement = selected.replace(/^ {1,4}/gm, '');
                                            const removed = selected.length - replacement.length;
                                            nextStart = Math.max(lineStart, start - Math.min(4, start - lineStart));
                                            nextEnd = Math.max(nextStart, end - removed);
                                        } else if (start === end) {
                                            replacement = `${draftCode.substring(lineStart, start)}    `;
                                            nextStart = nextEnd = start + 4;
                                        } else {
                                            replacement = selected.replace(/^/gm, '    ');
                                            const added = replacement.length - selected.length;
                                            nextStart = start + 4;
                                            nextEnd = end + added;
                                        }
                                        const newValue = draftCode.substring(0, lineStart) +
                                            replacement + draftCode.substring(end);
                                        handleCodeEdit({target: {value: newValue}});

                                        requestAnimationFrame(() => {
                                            textarea.selectionStart = nextStart;
                                            textarea.selectionEnd = nextEnd;
                                        });
                                    }
                                }}
                                onKeyUp={(e) => e.stopPropagation()}
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
