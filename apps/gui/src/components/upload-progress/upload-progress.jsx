import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './upload-progress.css';

/**
 * Upload Progress Modal
 * Shows compilation and upload progress with live terminal output
 */
const UploadProgress = ({
    visible,
    state,
    progress,
    message,
    logs,
    deviceName,
    portName,
    onClose,
    onCancel,
    onRetry
}) => {
    const terminalRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    if (!visible) return null;

    const isInProgress = state === 'preparing' || state === 'compiling' || state === 'uploading';
    const isSuccess = state === 'success';
    const isError = state === 'error';

    const getStateIcon = () => {
        switch (state) {
        case 'preparing':
        case 'compiling':
        case 'uploading':
            return (
                <div className={styles.spinnerIcon}>
                    <svg viewBox="0 0 50 50" className={styles.spinner}>
                        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            );
        case 'success':
            return (
                <div className={styles.successIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </div>
            );
        case 'error':
            return (
                <div className={styles.errorIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                </div>
            );
        default:
            return null;
        }
    };

    const getStateTitle = () => {
        switch (state) {
        case 'preparing':
            return 'Preparando...';
        case 'compiling':
            return 'Compilando';
        case 'uploading':
            return 'Subiendo';
        case 'success':
            return 'Completado';
        case 'error':
            return 'Error';
        default:
            return 'Procesando';
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={classNames(styles.modal, {
                [styles.expanded]: isExpanded
            })}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {getStateIcon()}
                        <span>{getStateTitle()}</span>
                    </h2>
                    {(isSuccess || isError) && (
                        <button
                            className={styles.closeButton}
                            onClick={onClose}
                            title="Cerrar"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Device info */}
                <div className={styles.deviceInfo}>
                    <span className={styles.deviceName}>{deviceName || 'Dispositivo'}</span>
                    {portName && (
                        <>
                            <span className={styles.separator}>•</span>
                            <span className={styles.portName}>{portName}</span>
                        </>
                    )}
                </div>

                {/* Progress bar */}
                {isInProgress && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{width: `${progress}%`}}
                            />
                        </div>
                        <span className={styles.progressText}>{Math.round(progress)}%</span>
                    </div>
                )}

                {/* Message */}
                <div className={classNames(styles.message, {
                    [styles.errorMessage]: isError,
                    [styles.successMessage]: isSuccess
                })}>
                    {message}
                </div>

                {/* Terminal output (expandable) */}
                <div className={styles.terminalSection}>
                    <button
                        className={styles.expandButton}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={classNames(styles.expandIcon, {
                                [styles.expandIconRotated]: isExpanded
                            })}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                        <span>Ver salida del compilador</span>
                        <span className={styles.logCount}>({logs.length})</span>
                    </button>

                    {isExpanded && (
                        <div className={styles.terminal} ref={terminalRef}>
                            {logs.length === 0 ? (
                                <div className={styles.terminalEmpty}>
                                    Esperando salida...
                                </div>
                            ) : (
                                logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={classNames(styles.logLine, {
                                            [styles.logError]: log.type === 'error',
                                            [styles.logSuccess]: log.type === 'success',
                                            [styles.logWarning]: log.type === 'warning'
                                        })}
                                    >
                                        <span className={styles.logTimestamp}>{log.timestamp}</span>
                                        <span className={styles.logMessage}>{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {isInProgress && (
                        <button
                            className={styles.cancelButton}
                            onClick={onCancel}
                        >
                            Cancelar
                        </button>
                    )}
                    {isError && onRetry && (
                        <button
                            className={styles.retryButton}
                            onClick={onRetry}
                        >
                            Reintentar
                        </button>
                    )}
                    {(isSuccess || isError) && (
                        <button
                            className={styles.closeBtn}
                            onClick={onClose}
                        >
                            {isSuccess ? 'Listo' : 'Cerrar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

UploadProgress.propTypes = {
    visible: PropTypes.bool.isRequired,
    state: PropTypes.oneOf(['idle', 'preparing', 'compiling', 'uploading', 'success', 'error']),
    progress: PropTypes.number,
    message: PropTypes.string,
    logs: PropTypes.arrayOf(PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
        timestamp: PropTypes.string
    })),
    deviceName: PropTypes.string,
    portName: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    onRetry: PropTypes.func
};

UploadProgress.defaultProps = {
    state: 'idle',
    progress: 0,
    message: '',
    logs: [],
    deviceName: '',
    portName: ''
};

export default UploadProgress;
