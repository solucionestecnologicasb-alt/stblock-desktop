import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './scratchjr-kids-workspace.css';

const PROJECT_KEY = 'stblock.kids.scratchjr.project';
const APP_PATH = 'static/scratchjr/app/';
const MODE_TABS = [
    {id: 'free', label: 'Libre', icon: '🎨'},
    {id: 'robot', label: 'Robot', icon: '🤖'},
    {id: 'story', label: 'Historia', icon: '📖'}
];

const projectKeyFor = mode => `${PROJECT_KEY}.${mode}`;

const ScratchJrKidsWorkspace = ({basePath, onExit, onConnectRobot, bluetoothConnected, bluetoothPortName, vm}) => {
    const iframeRef = useRef(null);
    const robotSendQueueRef = useRef(Promise.resolve());
    const [mode, setMode] = useState('free');
    const [projectOpen, setProjectOpen] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [blockVoiceEnabled, setBlockVoiceEnabled] = useState(() => {
        try {
            return window.localStorage.getItem('stblockKidsBlockVoice') !== 'off';
        } catch (_error) {
            return true;
        }
    });
    const [map, setMap] = useState('classroom');
    const [mapPickerOpen, setMapPickerOpen] = useState(false);
    const [rightActionRoot, setRightActionRoot] = useState(null);
    const readProjectId = activeMode => {
        try {
            return window.localStorage.getItem(projectKeyFor(activeMode)) ||
                (activeMode === 'story' ? window.localStorage.getItem(PROJECT_KEY) : null);
        } catch (_error) {
            return null;
        }
    };
    const makeFrameUrl = (activeMode, projectId = readProjectId(activeMode)) => {
        const appUrl = `${basePath}${APP_PATH}`;
        const modeQuery = `stblockKidsMode=${encodeURIComponent(activeMode)}`;
        return projectId ? `${appUrl}editor.html?pmd5=${encodeURIComponent(projectId)}&mode=edit&${modeQuery}` : `${appUrl}home.html?stblockKids=1&${modeQuery}`;
    };
    const [frameUrl, setFrameUrl] = useState(() => makeFrameUrl('free', null));
    const logoUrl = `${basePath}static/kids/stblock-kids-logo.jpg`;

    const sendModeToScratchJr = useCallback(nextMode => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (child) child.postMessage({type: 'STBLOCK_KIDS_MODE', mode: nextMode, map}, window.location.origin);
    }, [map]);

    const handleModeChange = nextMode => {
        setMode(nextMode);
        setProjectOpen(false);
        setRenameModalOpen(false);
        setMapPickerOpen(false);
        setFrameUrl(makeFrameUrl(nextMode));
    };

    const handleFrameLoad = useCallback(() => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (!child) return;
        sendModeToScratchJr(mode);
        try {
            const mountControls = () => {
                const centerPanel = child.document.querySelector('.centerpanel');
                const stageFrame = child.document.getElementById('stageframe');
                const topSection = child.document.getElementById('topsection');
                const blockPalette = child.document.getElementById('blockspalette');
                const scriptsContainer = child.document.getElementById('scriptscontainer');
                if (!centerPanel || !stageFrame || !topSection || !blockPalette || !scriptsContainer || !blockPalette.offsetWidth) return false;
                centerPanel.style.setProperty('position', 'absolute', 'important');
                centerPanel.style.setProperty('top', '0px', 'important');
                centerPanel.style.setProperty('left', '0px', 'important');
                const ensureDock = (className, side) => {
                    let dock = centerPanel.querySelector(`.${className}`);
                    if (!dock) {
                        dock = child.document.createElement('div');
                        dock.className = className;
                        dock.dataset.stblockKidsControlSide = side;
                        centerPanel.appendChild(dock);
                    }
                    return dock;
                };
                const leftDock = ensureDock('stblock-kids-left-actions', 'left');
                const rightDock = ensureDock('stblock-kids-right-actions', 'right');
                if (rightDock.dataset.stblockKidsConnectListener !== 'true') {
                    rightDock.dataset.stblockKidsConnectListener = 'true';
                    rightDock.addEventListener('click', event => {
                        const target = event.target;
                        const connectButton = target && target.closest && target.closest('.stblock-kids-connect-button');
                        if (connectButton) {
                            if (onConnectRobot) onConnectRobot();
                        }
                    });
                }
                ['setbkg', 'addtext', 'grid'].forEach(id => {
                    const control = child.document.getElementById(id);
                    if (control && mode === 'robot' && ['setbkg', 'addtext'].includes(id)) {
                        control.style.setProperty('display', 'none', 'important');
                    } else if (control) {
                        control.style.removeProperty('display');
                    }
                    if (control && control.parentElement !== leftDock) leftDock.appendChild(control);
                });
                ['go', 'resetall', 'full'].forEach(id => {
                    const control = child.document.getElementById(id);
                    if (control && control.parentElement !== rightDock) rightDock.appendChild(control);
                });
                setRightActionRoot(rightDock);
                child.setTimeout(() => child.dispatchEvent(new Event('stblock-kids-layout')), 200);
                return true;
            };
            setRightActionRoot(null);
            if (!mountControls()) {
                let attempts = 0;
                const retryMount = child.setInterval(() => {
                    attempts += 1;
                    if (mountControls() || attempts >= 100) child.clearInterval(retryMount);
                }, 100);
            }
            child.sessionStorage.setItem('stblockKids', '1');
            child.sessionStorage.setItem('stblockKidsMode', mode);
            child.document.documentElement.dataset.stblockKids = 'true';
            child.document.body.dataset.stblockKidsMode = mode;
            // ScratchJr can finish building its lobby before the iframe's load
            // handler runs. Apply the Kids lobby chrome here as well so the
            // top bar never flashes or remains in the embedded experience.
            const topbar = child.document.getElementById('topbar');
            const settings = child.document.getElementById('settings');
            const frame = child.document.getElementById('frame');
            if (topbar && settings && frame && !settings.classList.contains('kids-lobby-lock')) {
                settings.classList.add('kids-lobby-lock');
                settings.setAttribute('aria-label', 'Configuración para adultos');
                const gear = settings.querySelector('#geartab');
                if (gear) gear.setAttribute('aria-label', 'Configuración para adultos');
                const spacer = settings.firstElementChild;
                if (spacer && spacer.tagName !== 'LI') spacer.remove();
                frame.appendChild(settings);
                // Keep the tab elements available to Lobby.setPage; ScratchJr
                // updates their classes while the embedded lobby starts.
                topbar.classList.add('kids-lobby-hidden');
            }
            const url = new URL(child.location.href);
            setProjectOpen(url.pathname.endsWith('/editor.html'));
            const nextProjectId = url.searchParams.get('pmd5');
            if (nextProjectId) {
                window.localStorage.setItem(projectKeyFor(mode), nextProjectId);
                if (mode === 'story') window.localStorage.setItem(PROJECT_KEY, nextProjectId);
            }
            child.document.title = 'STBlock Kids';
            child.dispatchEvent(new Event('stblock-kids-layout'));
        } catch (_error) {
            // ScratchJr conserva su comportamiento si el navegador bloquea el acceso al iframe.
        }
    }, [mode, onConnectRobot, sendModeToScratchJr]);

    const openStoryLibrary = () => {
        setMode('story');
        setProjectOpen(false);
        setRenameModalOpen(false);
        const appUrl = `${basePath}${APP_PATH}`;
        setFrameUrl(`${appUrl}home.html?stblockKids=1&stblockKidsMode=story`);
    };

    const openRenameProject = () => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const projectApi = child && child.STBLOCK_KIDS_PROJECT;
        if (!projectApi) return;
        setRenameValue(projectApi.getName());
        setRenameModalOpen(true);
    };

    const saveProjectName = () => {
        const child = iframeRef.current && iframeRef.current.contentWindow;
        const projectApi = child && child.STBLOCK_KIDS_PROJECT;
        if (projectApi && projectApi.setName(renameValue)) {
            setRenameModalOpen(false);
        }
    };

    const handleMapChange = nextMap => {
        setMap(nextMap);
        setMapPickerOpen(false);
        const child = iframeRef.current && iframeRef.current.contentWindow;
        if (child) child.postMessage({type: 'STBLOCK_KIDS_MODE', mode: 'robot', map: nextMap}, window.location.origin);
    };

    const toggleBlockVoice = () => {
        const nextEnabled = !blockVoiceEnabled;
        setBlockVoiceEnabled(nextEnabled);
        try {
            window.localStorage.setItem('stblockKidsBlockVoice', nextEnabled ? 'on' : 'off');
        } catch (_error) {
            // Keep the control usable for this session if storage is unavailable.
        }
        if (!nextEnabled) {
            const child = iframeRef.current && iframeRef.current.contentWindow;
            if (child && child.speechSynthesis) child.speechSynthesis.cancel();
        }
    };

    useEffect(() => {
        document.body.dataset.stblockKidsRobot = mode === 'robot' ? 'true' : 'false';
        const handleRobotCommand = event => {
            if (event.source !== (iframeRef.current && iframeRef.current.contentWindow) || event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== 'STBLOCK_KIDS_ROBOT_COMMAND') return;
            const peripheral = vm && vm.runtime && vm.runtime.peripheralExtensions && vm.runtime.peripheralExtensions.bluetooth;
            if (!peripheral || !peripheral.isConnected || !peripheral.isConnected()) return;
            const {action, direction, steps} = event.data;
            const safeSteps = Math.max(1, Math.min(20, Math.round(Number(steps) || 1)));
            const line = action === 'move' ? `MOVE,${direction === 'backward' ? 'BACK' : 'FWD'},${safeSteps}` :
                action === 'turn' ? `TURN,${direction === 'left' ? 'LEFT' : 'RIGHT'},${safeSteps}` :
                    action === 'stop' ? 'STOP' : null;
            if (line) {
                robotSendQueueRef.current = robotSendQueueRef.current
                    .then(() => peripheral.sendLine(line))
                    .catch(error => console.warn('STBlock Kids: error enviando movimiento Bluetooth', error));
            }
        };
        window.addEventListener('message', handleRobotCommand);
        return () => {
            delete document.body.dataset.stblockKidsRobot;
            window.removeEventListener('message', handleRobotCommand);
        };
    }, [mode, onConnectRobot, vm]);

    const connectedLabel = useMemo(() => {
        if (!bluetoothConnected) return 'Conectar robot';
        return bluetoothPortName ? `Conectado · ${bluetoothPortName}` : 'Robot conectado';
    }, [bluetoothConnected, bluetoothPortName]);

    return (
        <main className={styles.workspace} data-mode={mode}>
            <header className={styles.toolbar}>
                <button className={styles.exit} onClick={onExit} type="button" aria-label="Cambiar entre STBlock y STBlock Kids" title="Elegir espacio">🏠</button>
                <button className={styles.spaceSelector} onClick={openStoryLibrary} type="button" aria-label="Ir a Mis proyectos" title="Mis proyectos">📁</button>
                <img className={styles.brand} src={logoUrl} alt="STBlock Kids" />
                <nav className={styles.modes} aria-label="Modo de trabajo">
                    {MODE_TABS.map(tab => (
                        <button
                            aria-pressed={mode === tab.id}
                            className={`${styles.modeButton} ${mode === tab.id ? styles.modeActive : ''}`}
                            key={tab.id}
                            onClick={() => handleModeChange(tab.id)}
                            type="button"
                        >
                            <span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span>
                        </button>
                    ))}
                    {projectOpen && (
                        <button className={styles.renameToggle} onClick={openRenameProject} type="button" aria-label="Cambiar nombre del proyecto" title="Cambiar nombre">
                            ✏️
                        </button>
                    )}
                    <button
                        className={styles.voiceToggle}
                        onClick={toggleBlockVoice}
                        type="button"
                        aria-label={blockVoiceEnabled ? 'Silenciar voz de los bloques' : 'Activar voz de los bloques'}
                        aria-pressed={blockVoiceEnabled}
                        title={blockVoiceEnabled ? 'Voz de los bloques activada' : 'Voz de los bloques silenciada'}
                    >
                        {blockVoiceEnabled ? '🔊' : '🔇'}
                    </button>
                </nav>
            </header>
            <section className={styles.editorSurface} aria-label="Editor STBlock Kids">
                <iframe
                    ref={iframeRef}
                    className={styles.editor}
                    src={frameUrl}
                    title="Editor de programación STBlock Kids"
                    allow="autoplay; camera; microphone"
                    onLoad={handleFrameLoad}
                />
                {mapPickerOpen && mode === 'robot' && (
                    <div className={styles.modalShade} role="presentation" onMouseDown={event => {
                        if (event.target === event.currentTarget) setMapPickerOpen(false);
                    }}>
                        <section className={styles.mapModal} role="dialog" aria-modal="true" aria-labelledby="mapModalTitle">
                            <button className={styles.modalClose} type="button" onClick={() => setMapPickerOpen(false)} aria-label="Cerrar">×</button>
                            <h2 id="mapModalTitle">¿A dónde vamos?</h2>
                            <p>Elige un mundo para tu robot</p>
                            <div className={styles.mapCards}>
                                {[
                                    ['classroom', '🏫', 'Salón'],
                                    ['city', '🏙️', 'Ciudad'],
                                    ['garden', '🌳', 'Jardín']
                                ].map(([id, icon, label]) => (
                                    <button key={id} className={`${styles.mapCard} ${map === id ? styles.mapCardActive : ''}`} onClick={() => handleMapChange(id)} type="button" aria-pressed={map === id}>
                                        <span aria-hidden="true">{icon}</span><strong>{label}</strong>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
                {renameModalOpen && (
                    <div className={styles.renameShade} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setRenameModalOpen(false); }}>
                        <section className={styles.renameModal} role="dialog" aria-modal="true" aria-labelledby="renameProjectTitle">
                            <h2 id="renameProjectTitle">Cambiar nombre</h2>
                            <label htmlFor="renameProjectInput">Nombre del proyecto</label>
                            <input
                                autoFocus
                                id="renameProjectInput"
                                maxLength={30}
                                onChange={event => setRenameValue(event.target.value)}
                                onKeyDown={event => { if (event.key === 'Enter') saveProjectName(); if (event.key === 'Escape') setRenameModalOpen(false); }}
                                value={renameValue}
                            />
                            <div className={styles.renameActions}>
                                <button onClick={() => setRenameModalOpen(false)} type="button">Cancelar</button>
                                <button className={styles.renameSave} disabled={!renameValue.trim()} onClick={saveProjectName} type="button">Guardar</button>
                            </div>
                        </section>
                    </div>
                )}
            </section>
            {rightActionRoot && createPortal(
                <div className="stblock-kids-react-actions" aria-label="Acciones STBlock Kids">
                    {mode === 'story' && (
                        <button className="stblock-kids-side-button stblock-kids-story-button" onClick={openStoryLibrary} type="button" aria-label="Historias">
                            <span aria-hidden="true">📖</span><span>Historias</span>
                        </button>
                    )}
                    {mode === 'robot' && (
                        <>
                            <button className="stblock-kids-side-button stblock-kids-world-button" onClick={() => setMapPickerOpen(true)} type="button" aria-label="Cambiar mundo">
                                <span aria-hidden="true">🌍</span><span>Mundos</span>
                            </button>
                            <button className={`stblock-kids-side-button stblock-kids-connect-button ${bluetoothConnected ? 'is-connected' : 'is-disconnected'}`} onClick={onConnectRobot} type="button" aria-label={connectedLabel} aria-pressed={bluetoothConnected}>
                                <span aria-hidden="true">{bluetoothConnected ? '🤖' : '🔵'}</span><span>{bluetoothConnected ? 'Conectado' : 'Conectar'}</span>
                            </button>
                        </>
                    )}
                </div>,
                rightActionRoot
            )}
        </main>
    );
};

export default ScratchJrKidsWorkspace;
