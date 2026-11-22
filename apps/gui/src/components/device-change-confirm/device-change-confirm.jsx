import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './device-change-confirm.css';

const DeviceChangeConfirm = ({
    visible,
    currentDeviceName,
    newDeviceName,
    onConfirm,
    onCancel
}) => {
    if (!visible) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modalContent}>
                <div className={styles.modalIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className={styles.modalTitle}>Cambiar de Dispositivo</h2>
                <p className={styles.modalMessage}>
                    Tienes bloques en <strong>{currentDeviceName || 'el dispositivo actual'}</strong>.
                    <br /><br />
                    Al cambiar a <strong>{newDeviceName || 'otro dispositivo'}</strong>,
                    el área de bloques se limpiará porque los bloques no son compatibles entre dispositivos diferentes.
                </p>
                <div className={styles.warningBox}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>Los bloques de cada dispositivo se guardan por separado. Si vuelves al dispositivo anterior, tus bloques seguirán ahí.</span>
                </div>
                <div className={styles.modalButtons}>
                    <button className={styles.cancelButton} onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className={styles.confirmButton} onClick={onConfirm}>
                        Cambiar Dispositivo
                    </button>
                </div>
            </div>
        </div>
    );
};

DeviceChangeConfirm.propTypes = {
    visible: PropTypes.bool,
    currentDeviceName: PropTypes.string,
    newDeviceName: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

DeviceChangeConfirm.defaultProps = {
    visible: false
};

export default DeviceChangeConfirm;
