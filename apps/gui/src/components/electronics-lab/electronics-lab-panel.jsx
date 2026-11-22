import React, {useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './electronics-lab-panel.css';
import {
    STBLOCK_ELECTRONICS_LAB_URL,
    getElectronicsLabStaticUrl,
    isLocalDev
} from '../../lib/electronics-lab-url';
import {isMobileDevice} from '../../lib/device-detector';

const ElectronicsLabPanel = forwardRef(({
    active,
    className,
    pointerEvents,
    vm,
    code,
    deviceId,
    deviceProjects,
    circuit3dData,
    onCircuitStateChange
}, ref) => {
    const iframeRef = useRef(null);
    const getInitialUrl = () => {
        let base = STBLOCK_ELECTRONICS_LAB_URL;
        const params = [];
        if (isMobileDevice()) {
            params.push('mobile=1');
        }
        params.push(`t=${Date.now()}`);
        base += (base.includes('?') ? '&' : '?') + params.join('&');
        return base;
    };
    const [url, setUrl] = useState(getInitialUrl);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [hasFallenBack, setHasFallenBack] = useState(false);

    const pendingRequestsRef = useRef(new Map());
    const iframeReadyRef = useRef(false);
    const lastSentCircuitRef = useRef(null);
    // [FIX] Conjunto de firmas de contenido de los estados que el PROPIO simulador nos ha
    // enviado recientemente. Se usa un Set (no un único valor) porque una misma acción del
    // usuario dispara VARIOS mensajes STBLOCK_CIRCUIT_3D_STATE_CHANGED; con un solo valor,
    // el efecto de sincronización corre con un `circuit3dData` anterior a la última firma,
    // no coincide y reenvía el estado al iframe (eco) → loadCircuitData → reset del circuito.
    const MAX_SIMULATOR_SIGS = 60;
    const simulatorSigsRef = useRef(new Set());
    const getCircuitSignature = useCallback((state) => {
        if (!state || state.clear || (state.data && state.data.clear)) return 'clear';
        try {
            return JSON.stringify(state);
        } catch (_) {
            return null;
        }
    }, []);
    const rememberSimulatorSig = useCallback((sig) => {
        if (sig === null) return;
        const set = simulatorSigsRef.current;
        set.add(sig);
        // Acotar el tamaño: descartar las firmas más antiguas (FIFO, orden de inserción).
        if (set.size > MAX_SIMULATOR_SIGS) {
            const oldest = set.values().next().value;
            set.delete(oldest);
        }
    }, []);

    const codeRef = useRef(code);
    codeRef.current = code;
    const deviceIdRef = useRef(deviceId);
    deviceIdRef.current = deviceId;
    const deviceProjectsRef = useRef(deviceProjects);
    deviceProjectsRef.current = deviceProjects;

    // Sincronizar todos los códigos disponibles (placa activa y placas guardadas) hacia el simulador 3D
    const syncAllCodesToIframe = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow || !iframeReadyRef.current) return;

        // 1. Notificar la placa actualmente seleccionada en STBlock
        if (deviceIdRef.current) {
            iframe.contentWindow.postMessage({
                type: 'stblock-device-changed',
                boardType: deviceIdRef.current
            }, '*');
        }

        // 2. Si hay códigos guardados para otras placas en el proyecto, sincronizarlos
        if (deviceProjectsRef.current && typeof deviceProjectsRef.current === 'object') {
            Object.keys(deviceProjectsRef.current).forEach((devId) => {
                const proj = deviceProjectsRef.current[devId];
                if (proj && typeof proj.code === 'string' && proj.code.trim()) {
                    iframe.contentWindow.postMessage({
                        type: 'stblock-update-code',
                        code: proj.code,
                        boardType: devId
                    }, '*');
                }
            });
        }

        // 3. El código actual de la placa activa tiene máxima prioridad
        if (codeRef.current) {
            iframe.contentWindow.postMessage({
                type: 'stblock-update-code',
                code: codeRef.current,
                boardType: deviceIdRef.current || 'arduinoUno'
            }, '*');
        }
    }, []);

    // Sincronizar Play / Stop de STBlock (Green Flag y Stop button) con el simulador 3D
    useEffect(() => {
        if (!vm) return;
        const runtime = vm.runtime;
        if (!runtime) return;

        const handleProjectStart = () => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow || !iframeReadyRef.current) return;
            iframe.contentWindow.postMessage({
                type: 'stblock-run',
                code: codeRef.current || '',
                boardType: deviceIdRef.current || 'arduinoUno'
            }, '*');
        };

        const handleProjectStop = () => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow || !iframeReadyRef.current) return;
            iframe.contentWindow.postMessage({
                type: 'stblock-stop'
            }, '*');
        };

        runtime.on('PROJECT_START', handleProjectStart);
        runtime.on('PROJECT_STOP_ALL', handleProjectStop);

        return () => {
            runtime.removeListener('PROJECT_START', handleProjectStart);
            runtime.removeListener('PROJECT_STOP_ALL', handleProjectStop);
        };
    }, [vm]);

    // Enviar estado de circuito al iframe de forma segura
    const sendCircuitToIframe = useCallback((state) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow || !iframeReadyRef.current) return;

        iframe.contentWindow.postMessage({
            type: 'STBLOCK_LOAD_CIRCUIT_3D_STATE',
            payload: state || { clear: true }
        }, '*');
    }, []);

    // Sincronizar hacia el iframe cuando cambia el código, la placa activa o los proyectos guardados
    useEffect(() => {
        syncAllCodesToIframe();
    }, [code, deviceId, deviceProjects, loaded, syncAllCodesToIframe]);

    // Escuchar mensajes del iframe (Ready, State Change, Responses)
    useEffect(() => {
        const handleMessage = (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'STBLOCK_CIRCUIT_3D_READY' || data.type === 'STBLOCK_ELECTRONICS_LAB_READY') {
                iframeReadyRef.current = true;
                // El iframe acaba de iniciar; sincronizar de inmediato circuito, tarjeta activa y códigos
                rememberSimulatorSig(getCircuitSignature(circuit3dData));
                sendCircuitToIframe(circuit3dData);
                syncAllCodesToIframe();
            } else if (data.type === 'STBLOCK_CIRCUIT_3D_STATE_CHANGED') {
                // El usuario modificó el circuito 3D; actualizar Redux en tiempo real
                if (typeof onCircuitStateChange === 'function' && data.payload) {
                    lastSentCircuitRef.current = data.payload;
                    rememberSimulatorSig(getCircuitSignature(data.payload));
                    onCircuitStateChange(data.payload);
                }
            } else if (data.type === 'STBLOCK_CIRCUIT_3D_STATE_RESPONSE' && data.requestId) {
                const resolver = pendingRequestsRef.current.get(data.requestId);
                if (resolver) {
                    pendingRequestsRef.current.delete(data.requestId);
                    if (data.payload && typeof onCircuitStateChange === 'function') {
                        lastSentCircuitRef.current = data.payload;
                        rememberSimulatorSig(getCircuitSignature(data.payload));
                        onCircuitStateChange(data.payload);
                    }
                    resolver(data.payload);
                }
            } else if (data.type === 'STBLOCK_REQUEST_ARDUINO_COMPILE') {
                const isTauri = typeof window !== 'undefined' && (
                    (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') ||
                    (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function')
                );
                if (isTauri) {
                    const invoke = (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) ||
                                   window.__TAURI__.core.invoke;
                    const sketchCode = data.code || codeRef.current || '';
                    const fqbn = data.fqbn || (data.board === 'arduinoNano' ? 'arduino:avr:nano' : 'arduino:avr:uno');
                    const sketchName = `stblock_sketch_${Date.now()}`;
                    invoke('compile_arduino_sketch', {
                        code: sketchCode,
                        fqbn: fqbn,
                        sketchName: sketchName
                    }).then((result) => {
                        if (result && result.success && result.hexContent) {
                            const iframe = iframeRef.current;
                            if (iframe && iframe.contentWindow) {
                                iframe.contentWindow.postMessage({
                                    type: 'STBLOCK_LOAD_ARDUINO_HEX',
                                    hex: result.hexContent,
                                    boardType: data.board || deviceIdRef.current || 'arduinoUno',
                                    autoStart: true
                                }, '*');
                            }
                        }
                    }).catch((err) => {
                        console.warn('[ElectronicsLabPanel] Error en compilación nativa de Arduino:', err);
                    });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [circuit3dData, sendCircuitToIframe, onCircuitStateChange]);

    // Reaccionar a cambios en circuit3dData (ej. usuario cargó otro archivo .flynt o nuevo proyecto).
    // Solo reenviamos al iframe si el estado NO coincide con el último que el propio simulador reportó.
    useEffect(() => {
        if (!iframeReadyRef.current) return;
        const sig = getCircuitSignature(circuit3dData);
        // Skip si esta firma corresponde a un estado que el propio simulador nos envió
        // (aunque no sea el ÚLTIMO: varias STATE_CHANGED por acción). Así se evita el eco.
        if (sig !== null && simulatorSigsRef.current.has(sig)) return;
        lastSentCircuitRef.current = circuit3dData;
        rememberSimulatorSig(sig);
        sendCircuitToIframe(circuit3dData);
    }, [circuit3dData, sendCircuitToIframe, getCircuitSignature, rememberSimulatorSig]);

    const saveCircuitState = useCallback(() => {
        return new Promise((resolve) => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow || !iframeReadyRef.current) {
                resolve(circuit3dData || null);
                return;
            }
            const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const timer = setTimeout(() => {
                pendingRequestsRef.current.delete(requestId);
                resolve(circuit3dData || null);
            }, 2000);

            pendingRequestsRef.current.set(requestId, (payload) => {
                clearTimeout(timer);
                if (payload && onCircuitStateChange) {
                    lastSentCircuitRef.current = payload;
                    rememberSimulatorSig(getCircuitSignature(payload));
                    onCircuitStateChange(payload);
                }
                resolve(payload || circuit3dData || null);
            });

            iframe.contentWindow.postMessage({
                type: 'STBLOCK_GET_CIRCUIT_3D_STATE',
                requestId
            }, '*');
        });
    }, [circuit3dData, onCircuitStateChange, getCircuitSignature, rememberSimulatorSig]);

    const loadCircuitState = useCallback((state) => {
        lastSentCircuitRef.current = state;
        sendCircuitToIframe(state);
    }, [sendCircuitToIframe]);

    useImperativeHandle(ref, () => ({
        getIframe: () => iframeRef.current,
        saveCircuitState,
        loadCircuitState,
        startSimulation: () => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow) return;
            syncAllCodesToIframe();
            iframe.contentWindow.postMessage({
                type: 'stblock-run',
                code: codeRef.current || '',
                boardType: deviceIdRef.current || 'arduinoUno'
            }, '*');
        },
        stopSimulation: () => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow) return;
            iframe.contentWindow.postMessage({
                type: 'stblock-stop'
            }, '*');
        },
        sendSerialInput: (text) => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                    type: 'SERIAL_INPUT',
                    data: text
                }, '*');
            }
        },
        reload: () => {
            if (iframeRef.current) {
                iframeRef.current.src = url;
            }
        }
    }), [saveCircuitState, loadCircuitState, url]);

    const handleIframeLoad = useCallback(() => {
        setLoaded(true);
        setError(null);
        iframeReadyRef.current = true;
        sendCircuitToIframe(circuit3dData);
        syncAllCodesToIframe();
    }, [circuit3dData, sendCircuitToIframe, syncAllCodesToIframe]);

    const handleIframeError = useCallback(() => {
        // En entorno dev, si falla conectar al dev server (localhost:5173), intentar con el static build
        if (isLocalDev() && !hasFallenBack) {
            setHasFallenBack(true);
            let fallback = getElectronicsLabStaticUrl();
            if (isMobileDevice()) {
                fallback += (fallback.includes('?') ? '&' : '?') + 'mobile=1';
            }
            setUrl(fallback);
            if (iframeRef.current) {
                iframeRef.current.src = fallback;
            }
            return;
        }
        setError('No se pudo cargar Circuito 3D');
    }, [hasFallenBack]);

    const handleRetry = useCallback(() => {
        setError(null);
        setLoaded(false);
        if (iframeRef.current) {
            iframeRef.current.src = url;
        }
    }, [url]);

    return (
        <div
            className={classNames(styles.container, className)}
            style={{display: active ? 'flex' : 'none'}}
        >
            {!loaded && !error && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                    <span>{'Cargando Circuito 3D...'}</span>
                </div>
            )}

            {error && (
                <div className={styles.errorOverlay}>
                    <strong>{'Error de carga'}</strong>
                    <p>{error}</p>
                    <button
                        className={styles.retryBtn}
                        onClick={handleRetry}
                    >
                        {'Reintentar'}
                    </button>
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={url}
                className={styles.iframe}
                style={{pointerEvents: pointerEvents || 'auto'}}
                title="Circuito 3D - Electronics Lab"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="fullscreen; clipboard-read; clipboard-write"
            />
        </div>
    );
});

ElectronicsLabPanel.displayName = 'ElectronicsLabPanel';

ElectronicsLabPanel.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    pointerEvents: PropTypes.string,
    vm: PropTypes.object,
    deviceId: PropTypes.string,
    code: PropTypes.string,
    deviceProjects: PropTypes.object,
    circuit3dData: PropTypes.object,
    onCircuitStateChange: PropTypes.func
};

ElectronicsLabPanel.defaultProps = {
    active: false,
    className: '',
    pointerEvents: 'auto',
    vm: null,
    deviceId: null,
    code: '',
    deviceProjects: null,
    circuit3dData: null,
    onCircuitStateChange: null
};

export default ElectronicsLabPanel;
