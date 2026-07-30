import PropTypes from 'prop-types';
import React from 'react';

import styles from './update-modal.css';

const UpdateModal = ({info, installing, onInstall, onDismiss, onRetry}) => {
    if (!info) return null;
    const status = info.status || 'available';
    const mandatory = Boolean(info.mandatory);
    const available = status === 'available';
    const current = status === 'current';
    const error = status === 'error';
    const iconClass = [
        styles.icon,
        mandatory ? styles.iconMandatory : '',
        current ? styles.iconCurrent : '',
        error ? styles.iconError : ''
    ].filter(Boolean).join(' ');
    const modalClass = [
        styles.modal,
        mandatory ? styles.modalMandatory : '',
        current ? styles.modalCurrent : '',
        error ? styles.modalError : ''
    ].filter(Boolean).join(' ');
    const iconText = mandatory ? '!' : error ? 'x' : current ? '✓' : '↑';
    const statusText = mandatory ? 'Obligatoria' : error ? 'Revisar' : current ? 'Lista' : 'Disponible';
    const mainActionText = mandatory ? 'Actualizar' : 'Actualizar ahora';

    return (
        <div className={styles.overlay}>
            <div className={modalClass} role="dialog" aria-modal="true">
                <div className={styles.hero}>
                    <div className={styles.statusPill}>{statusText}</div>
                    <div className={iconClass}>{iconText}</div>
                    <h2 className={styles.title}>{info.title}</h2>
                    <p className={styles.message}>{info.message}</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.versions}>
                        <div className={styles.versionBox}>
                            <span className={styles.versionLabel}>Actual</span>
                            <span className={styles.versionValue}>{info.currentVersion || 'Actual'}</span>
                        </div>
                        <div className={styles.versionBox}>
                            <span className={styles.versionLabel}>{available ? 'Nueva' : 'Estado'}</span>
                            <span className={styles.versionValue}>{info.latestVersion || 'OK'}</span>
                        </div>
                    </div>
                    {mandatory ? (
                        <div className={styles.warning}>Debes instalarla para continuar.</div>
                    ) : null}
                    {available && !info.canInstall ? (
                        <div className={styles.error}>Paquete firmado no disponible para esta versión.</div>
                    ) : null}
                    {info.policyError ? (
                        <div className={styles.warning}>Política: {info.policyError}</div>
                    ) : null}
                    {info.updateError ? (
                        <div className={styles.error}>{info.updateError}</div>
                    ) : null}
                </div>
                <div className={styles.actions}>
                    {available && !mandatory ? (
                        <button className={styles.secondaryButton} disabled={installing} onClick={onDismiss}>
                            Más tarde
                        </button>
                    ) : null}
                    {available || error ? (
                        <button className={styles.secondaryButton} disabled={installing} onClick={onRetry}>
                            Reintentar
                        </button>
                    ) : null}
                    {available ? (
                        <button className={styles.primaryButton} disabled={installing || !info.canInstall} onClick={onInstall}>
                            {installing ? 'Instalando...' : mainActionText}
                        </button>
                    ) : (
                        <button className={styles.primaryButton} disabled={installing} onClick={onDismiss}>
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

UpdateModal.propTypes = {
    info: PropTypes.object,
    installing: PropTypes.bool,
    onDismiss: PropTypes.func,
    onInstall: PropTypes.func,
    onRetry: PropTypes.func
};

UpdateModal.defaultProps = {
    info: null,
    installing: false,
    onDismiss: () => {},
    onInstall: () => {},
    onRetry: () => {}
};

export default UpdateModal;
