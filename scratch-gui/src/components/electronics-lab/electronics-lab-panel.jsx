import React, {useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './electronics-lab-panel.css';
import {
    STBLOCK_ELECTRONICS_LAB_URL,
    getElectronicsLabStaticUrl,
    isLocalDev
} from '../../lib/electronics-lab-url';

const ElectronicsLabPanel = forwardRef(({active, className, pointerEvents, code, deviceId}, ref) => {
    const iframeRef = useRef(null);
    const [url, setUrl] = useState(STBLOCK_ELECTRONICS_LAB_URL);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [hasFallenBack, setHasFallenBack] = useState(false);

    const pendingRequestsRef = useRef(new Map());

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

    useEffect(() => {
        const handleMessage = (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'STBLOCK_CIRCUIT_3D_STATE_RESPONSE' && data.requestId) {
                const resolver = pendingRequestsRef.current.get(data.requestId);
                if (resolver) {
                    pendingRequestsRef.current.delete(data.requestId);
                    resolver(data.payload);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const saveCircuitState = useCallback(() => {
        return new Promise((resolve) => {
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow) {
                resolve(null);
                return;
            }
            const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const timer = setTimeout(() => {
                pendingRequestsRef.current.delete(requestId);
                resolve(null);
            }, 3000);

            pendingRequestsRef.current.set(requestId, (payload) => {
                clearTimeout(timer);
                resolve(payload);
            });

            iframe.contentWindow.postMessage({
                type: 'STBLOCK_GET_CIRCUIT_3D_STATE',
                requestId
            }, '*');
        });
    }, []);

    const loadCircuitState = useCallback((state) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow || !state) return;
        iframe.contentWindow.postMessage({
            type: 'STBLOCK_LOAD_CIRCUIT_3D_STATE',
            payload: state
        }, '*');
    }, []);

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
    }, []);

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
    deviceId: PropTypes.string,
    code: PropTypes.string
};

ElectronicsLabPanel.defaultProps = {
    active: false,
    className: '',
    pointerEvents: 'auto',
    deviceId: null,
    code: ''
};

export default ElectronicsLabPanel;
