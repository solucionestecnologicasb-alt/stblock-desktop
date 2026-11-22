import React from 'react';
import PropTypes from 'prop-types';
import styles from './mobile-ai-settings-modal.css';

const MobileAboutModal = ({
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    const handleOpenWebsite = () => {
        window.open('https://www.stbacademy.net', '_blank', 'noopener,noreferrer');
    };

    const handleCheckUpdate = () => {
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.checkForUpdate === 'function') {
            window.AndroidBridge.checkForUpdate();
        } else {
            alert('STBlock v0.1.46 está actualizado.');
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderInfo}>
                        <span className={styles.modalHeaderIcon}>ℹ️</span>
                        <div>
                            <h2 className={styles.modalTitle}>Acerca de STBlock</h2>
                            <p className={styles.modalSubtitle}>Versión Móvil</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody} style={{textAlign: 'center', padding: '24px 20px'}}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: '800',
                        margin: '0 auto 14px'
                    }}>
                        STB
                    </div>

                    <h3 style={{margin: '0 0 4px', fontSize: '1.25rem', color: '#0f172a'}}>
                        STBlock Mobile
                    </h3>
                    <p style={{
                        margin: '0 0 16px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#0284c7',
                        background: '#e0f2fe',
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px'
                    }}>
                        Versión 0.1.46 (Build 1046)
                    </p>

                    <p style={{margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.45}}>
                        Entorno interactivo para el aprendizaje de pensamiento computacional, programación visual por bloques, robótica y circuitos electrónicos 3D.
                    </p>

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '16px',
                        fontSize: '0.82rem',
                        color: '#64748b',
                        lineHeight: 1.4
                    }}>
                        <div>Desarrollado con dedicación por <strong>STB Academy</strong></div>
                        <div style={{marginTop: '4px'}}>Todos los derechos reservados &copy; 2026</div>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <button
                            type="button"
                            className={styles.touchSelect}
                            style={{
                                textAlign: 'center',
                                background: '#f1f5f9',
                                color: '#0f172a',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1.5px solid #cbd5e1'
                            }}
                            onClick={handleOpenWebsite}
                        >
                            🌐 Visitar stbacademy.net ↗
                        </button>

                        <button
                            type="button"
                            className={styles.touchSelect}
                            style={{
                                textAlign: 'center',
                                background: '#f0fdf4',
                                color: '#166534',
                                fontWeight: 650,
                                cursor: 'pointer',
                                border: '1.5px solid #86efac'
                            }}
                            onClick={handleCheckUpdate}
                        >
                            🔄 Buscar Actualizaciones
                        </button>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.btnSave}
                        style={{width: '100%', flex: '1 1 100%'}}
                        onClick={onClose}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

MobileAboutModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired
};

export default MobileAboutModal;
