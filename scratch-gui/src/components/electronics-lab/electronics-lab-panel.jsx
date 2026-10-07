import React, {useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './electronics-lab-panel.css';
import {
    STBLOCK_ELECTRONICS_LAB_URL,
    getElectronicsLabStaticUrl,
    isLocalDev
} from '../../lib/electronics-lab-url';

const ElectronicsLabPanel = forwardRef(({
    active,
    className,
    pointerEvents,
    vm,
    code,
    deviceId,
    circuit3dData,
    onCircuitStateChange
}, ref) => {
    const iframeRef = useRef(null);
    const [url, setUrl] = useState(STBLOCK_ELECTRONICS_LAB_URL);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [hasFallenBack, setHasFallenBack] = useState(false);

    const pendingRequestsRef = useRef(new Map());
    const iframeReadyRef = useRef(false);
    const lastSentCircuitRef = useRef(null);

    const codeRef = useRef(code);
    codeRef.current = code;
    const deviceIdRef = useRef(deviceId);
    deviceIdRef.current = deviceId;

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

    // Notificar cambio de tarjeta/dispositivo activo en STBlock
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && deviceId) {
            iframeRef.current.contentWindow.postMessage({
                type: 'stblock-device-changed',
                boardType: deviceId
            }, '*');
        }
    }, [deviceId, loaded]);

    // Sincronizar el código actual hacia el laboratorio 3D para la tarjeta correspondiente
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && code) {
            iframeRef.current.contentWindow.postMessage({
                type: 'stblock-update-code',
                code: code,
                boardType: deviceId || 'arduinoUno'
            }, '*');
        }
    }, [code, deviceId, loaded]);

    // Escuchar mensajes del iframe (Ready, State Change, Responses)
    useEffect(() => {
        const handleMessage = (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'STBLOCK_CIRCUIT_3D_READY') {
                iframeReadyRef.current = true;
                // El iframe acaba de iniciar; sincronizar de inmediato el circuito del proyecto
                sendCircuitToIframe(circuit3dData);
            } else if (data.type === 'STBLOCK_CIRCUIT_3D_STATE_CHANGED') {
                // El usuario modificó el circuito 3D; actualizar Redux en tiempo real
                if (typeof onCircuitStateChange === 'function' && data.payload) {
                    lastSentCircuitRef.current = data.payload;
                    onCircuitStateChange(data.payload);
                }
            } else if (data.type === 'STBLOCK_CIRCUIT_3D_STATE_RESPONSE' && data.requestId) {
                const resolver = pendingRequestsRef.current.get(data.requestId);
                if (resolver) {
                    pendingRequestsRef.current.delete(data.requestId);
                    if (data.payload && typeof onCircuitStateChange === 'function') {
                        lastSentCircuitRef.current = data.payload;
                        onCircuitStateChange(data.payload);
                    }
                    resolver(data.payload);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [circuit3dData, sendCircuitToIframe, onCircuitStateChange]);

    // Reaccionar a cambios en circuit3dData (ej. usuario cargó otro archivo .flynt o nuevo proyecto)
    useEffect(() => {
        if (!iframeReadyRef.current) return;
        if (circuit3dData === lastSentCircuitRef.current) return;
        lastSentCircuitRef.current = circuit3dData;
        sendCircuitToIframe(circuit3dData);
    }, [circuit3dData, sendCircuitToIframe]);

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
                    onCircuitStateChange(payload);
                }
                resolve(payload || circuit3dData || null);
            });

            iframe.contentWindow.postMessage({
                type: 'STBLOCK_GET_CIRCUIT_3D_STATE',
                requestId
            }, '*');
        });
    }, [circuit3dData, onCircuitStateChange]);

    const loadCircuitState = useCallback((state) => {
        lastSentCircuitRef.current = state;
        sendCircuitToIframe(state);
    }, [sendCircuitToIframe]);

    useImperativeHandle(ref, () => ({
        getIframe: () => iframeRef.current,
        saveCircuitState,
        loadCircuitState,
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
    }, [circuit3dData, sendCircuitToIframe]);

    const handleIframeError = useCallback(() => {
        // En entorno dev, si falla conectar al dev server (localhost:5173), intentar con el static build
        if (isLocalDev() && !hasFallenBack) {
            setHasFallenBack(true);
            const fallback = getElectronicsLabStaticUrl();
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
    circuit3dData: null,
    onCircuitStateChange: null
};

export default ElectronicsLabPanel;
