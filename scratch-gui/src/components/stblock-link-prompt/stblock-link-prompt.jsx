import React from 'react';
import PropTypes from 'prop-types';
import styles from './stblock-link-prompt.css';

/**
 * STBlock Link Download Prompt
 * Shows when the user needs to download/start STBlock Link for web compilation
 */
const STBlockLinkPrompt = ({
    visible,
    downloadUrl,
    onClose,
    onRetry
}) => {
    if (!visible) return null;

    const handleDownload = () => {
        window.open(downloadUrl, '_blank');
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.iconContainer}>
                        <svg viewBox="0 0 24 24" className={styles.icon}>
                            <path
                                fill="currentColor"
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                            />
                        </svg>
                    </div>
                    <h2 className={styles.title}>STBlock Link Requerido</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        title="Cerrar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    <p className={styles.description}>
                        Para compilar y subir código desde el navegador, necesitas tener
                        <strong> STBlock Link</strong> instalado y ejecutándose en tu computadora.
                    </p>

                    <div className={styles.steps}>
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>1</span>
                            <span className={styles.stepText}>Descarga STBlock Link</span>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>2</span>
                            <span className={styles.stepText}>Instala la aplicación</span>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>3</span>
                            <span className={styles.stepText}>Ejecuta STBlock Link</span>
                        </div>
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>4</span>
                            <span className={styles.stepText}>Vuelve aquí y haz clic en "Reintentar"</span>
                        </div>
                    </div>

                    <div className={styles.note}>
                        <svg viewBox="0 0 24 24" className={styles.noteIcon}>
                            <path
                                fill="currentColor"
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                            />
                        </svg>
                        <span>
                            STBlock Link permite la comunicación entre el navegador y tu placa Arduino.
                            Debe estar ejecutándose mientras programas.
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    {onRetry && (
                        <button
                            className={styles.retryButton}
                            onClick={onRetry}
                        >
                            Reintentar
                        </button>
                    )}
                    <button
                        className={styles.downloadButton}
                        onClick={handleDownload}
                    >
                        <svg viewBox="0 0 24 24" className={styles.downloadIcon}>
                            <path
                                fill="currentColor"
                                d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
                            />
                        </svg>
                        Descargar STBlock Link
                    </button>
                </div>
            </div>
        </div>
    );
};

STBlockLinkPrompt.propTypes = {
    visible: PropTypes.bool.isRequired,
    downloadUrl: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onRetry: PropTypes.func
};

STBlockLinkPrompt.defaultProps = {
    onRetry: null
};

export default STBlockLinkPrompt;
