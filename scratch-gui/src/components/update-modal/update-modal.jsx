import PropTypes from 'prop-types';
import React from 'react';

import {cleanSpanishText} from '../../lib/stblock-updater';
import styles from './update-modal.css';

const UpdateIcon = ({type}) => {
    switch (type) {
    case 'installing':
        return (
            <svg
                className={styles.spinIcon}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
        );
    case 'downloading':
        return (
            <svg
                className={styles.bounceIcon}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
        );
    case 'mandatory':
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        );
    case 'current':
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        );
    case 'error':
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        );
    default:
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
            </svg>
        );
    }
};

UpdateIcon.propTypes = {
    type: PropTypes.string
};

const UpdateModal = ({
    info,
    installing,
    progress,
    onInstall,
    onDismiss,
    onExit,
    onRetry
}) => {
    if (!info) return null;
    const status = info.status || 'available';
    const mandatory = Boolean(info.mandatory);
    const available = status === 'available';
    const current = status === 'current';
    const error = status === 'error';

    const isRestarting = progress && progress.stage === 'restarting';
    const isInstallingPhase = progress && progress.stage === 'installing';

    const iconType = installing
        ? (isInstallingPhase || isRestarting ? 'installing' : 'downloading')
        : (mandatory ? 'mandatory' : error ? 'error' : current ? 'current' : 'available');

    const iconClass = [
        styles.icon,
        installing
            ? (isInstallingPhase || isRestarting ? styles.iconInstalling : styles.iconDownloading)
            : (mandatory ? styles.iconMandatory : current ? styles.iconCurrent : error ? styles.iconError : '')
    ].filter(Boolean).join(' ');

    const modalClass = [
        styles.modal,
        mandatory ? styles.modalMandatory : '',
        current ? styles.modalCurrent : '',
        error ? styles.modalError : ''
    ].filter(Boolean).join(' ');

    const statusPillClass = [
        styles.statusPill,
        installing
            ? (isInstallingPhase || isRestarting ? styles.statusPillInstalling : styles.statusPillDownloading)
            : (mandatory ? styles.statusPillMandatory : current ? styles.statusPillCurrent : error ? styles.statusPillError : '')
    ].filter(Boolean).join(' ');

    const statusText = installing
        ? (isRestarting ? 'Reiniciando' : isInstallingPhase ? 'Instalando' : 'Descargando')
        : (mandatory ? 'Obligatoria' : error ? 'Error' : current ? 'Al día' : 'Disponible');

    const cleanTitle = installing
        ? (isRestarting
            ? 'Reiniciando STBlock...'
            : isInstallingPhase
                ? 'Instalando actualización...'
                : 'Descargando actualización...')
        : (cleanSpanishText(info.title) || (mandatory ? 'Actualización obligatoria' : error ? 'Error de actualización' : 'Actualización disponible'));

    const cleanMessage = installing
        ? ((progress && progress.statusText) || 'Descargando la nueva versión de STBlock...')
        : (cleanSpanishText(info.message) || 'Hay una nueva versión de STBlock disponible.');

    return (
        <div className={styles.overlay}>
            <div className={modalClass} role="dialog" aria-modal="true">
                <div className={styles.hero}>
                    <div className={statusPillClass}>{statusText}</div>
                    <div className={iconClass}>
                        <UpdateIcon type={iconType} />
                    </div>
                    <h2 className={styles.title}>{cleanTitle}</h2>
                    <p className={styles.message}>{cleanMessage}</p>
                </div>

                <div className={styles.body}>
                    <div className={styles.versions}>
                        <div className={styles.versionBox}>
                            <span className={styles.versionLabel}>Versión Actual</span>
                            <span className={styles.versionValue}>{info.currentVersion || 'Actual'}</span>
                        </div>
                        <div className={styles.versionBox}>
                            <span className={styles.versionLabel}>{available ? 'Nueva Versión' : 'Estado'}</span>
                            <span className={styles.versionValue}>{info.latestVersion || 'OK'}</span>
                        </div>
                    </div>

                    {installing ? (
                        <div className={styles.progressSection}>
                            <div className={styles.progressHeaderRow}>
                                <span className={styles.progressStatus}>
                                    <span
                                        className={[
                                            styles.pulseDot,
                                            isInstallingPhase || isRestarting ? styles.pulseDotInstalling : ''
                                        ].filter(Boolean).join(' ')}
                                    />
                                    {progress ? progress.statusText : 'Conectando con el servidor...'}
                                </span>
                                <span className={styles.progressPercentage}>
                                    {progress ? `${progress.percent}%` : '0%'}
                                </span>
                            </div>

                            <div className={styles.progressBarTrack}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{width: `${Math.max(4, progress ? progress.percent : 0)}%`}}
                                >
                                    <div className={styles.progressBarShimmer} />
                                </div>
                            </div>

                            <div className={styles.metricsGrid}>
                                <div className={styles.metricItem}>
                                    <span className={styles.metricLabel}>Descargado</span>
                                    <span className={styles.metricValue}>
                                        {progress && progress.totalBytes > 0
                                            ? `${progress.downloadedFormatted} / ${progress.totalFormatted}`
                                            : (progress ? progress.downloadedFormatted : '0 MB')}
                                    </span>
                                </div>
                                <div className={styles.metricItem}>
                                    <span className={styles.metricLabel}>Velocidad</span>
                                    <span className={styles.metricValue}>
                                        {progress ? progress.speedFormatted : 'Iniciando...'}
                                    </span>
                                </div>
                                {progress && progress.etaFormatted ? (
                                    <div className={styles.metricItem}>
                                        <span className={styles.metricLabel}>Tiempo restante</span>
                                        <span className={styles.metricValue}>
                                            {progress.etaFormatted}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {!installing && mandatory ? (
                        <div className={styles.warning}>
                            ⚠️ Debes instalar esta actualización para continuar utilizando STBlock.
                        </div>
                    ) : null}

                    {!installing && available && !info.canInstall ? (
                        <div className={styles.error}>
                            Paquete firmado no disponible para descarga directa en esta versión.
                        </div>
                    ) : null}

                    {!installing && info.policyError ? (
                        <div className={styles.warning}>
                            Política: {cleanSpanishText(info.policyError)}
                        </div>
                    ) : null}

                    {!installing && (error || info.updateError) ? (
                        <div className={styles.error}>
                            <div className={styles.errorTitle}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>Aviso de error</span>
                            </div>
                            <div className={styles.errorMessage}>
                                {cleanSpanishText(info.updateError || info.message)}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className={styles.actions}>
                    {installing ? (
                        <React.Fragment>
                            {mandatory ? (
                                <button className={styles.secondaryButton} onClick={onExit}>
                                    Salir
                                </button>
                            ) : null}
                            <button className={styles.primaryButton} disabled>
                                {isRestarting
                                    ? 'Reiniciando...'
                                    : isInstallingPhase
                                        ? 'Instalando...'
                                        : `Descargando... ${progress ? progress.percent : 0}%`}
                            </button>
                        </React.Fragment>
                    ) : error ? (
                        <React.Fragment>
                            {mandatory ? (
                                <button className={styles.secondaryButton} onClick={onExit}>
                                    Salir
                                </button>
                            ) : (
                                <button className={styles.secondaryButton} onClick={onDismiss}>
                                    Cerrar
                                </button>
                            )}
                            {info.canInstall ? (
                                <button className={styles.primaryButton} onClick={onInstall}>
                                    Reintentar descarga
                                </button>
                            ) : (
                                <button className={styles.primaryButton} onClick={onRetry}>
                                    Reintentar búsqueda
                                </button>
                            )}
                        </React.Fragment>
                    ) : available ? (
                        <React.Fragment>
                            {mandatory ? (
                                <button className={styles.secondaryButton} onClick={onExit}>
                                    Salir
                                </button>
                            ) : (
                                <button className={styles.secondaryButton} onClick={onDismiss}>
                                    Más tarde
                                </button>
                            )}
                            <button
                                className={styles.primaryButton}
                                disabled={!info.canInstall}
                                onClick={onInstall}
                            >
                                Actualizar ahora
                            </button>
                        </React.Fragment>
                    ) : (
                        <button className={styles.primaryButton} onClick={onDismiss}>
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
    progress: PropTypes.object,
    onDismiss: PropTypes.func,
    onExit: PropTypes.func,
    onInstall: PropTypes.func,
    onRetry: PropTypes.func
};

UpdateModal.defaultProps = {
    info: null,
    installing: false,
    progress: null,
    onDismiss: () => {},
    onExit: () => {},
    onInstall: () => {},
    onRetry: () => {}
};

export default UpdateModal;
