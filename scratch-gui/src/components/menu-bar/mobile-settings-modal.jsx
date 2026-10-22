import React, {useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './mobile-ai-settings-modal.css';
import {DEFAULT_THEME, HIGH_CONTRAST_THEME} from '../../lib/themes';

const LANGUAGES = [
    {code: 'es', name: 'Español'},
    {code: 'es-419', name: 'Español Latinoamericano'},
    {code: 'en', name: 'English'},
    {code: 'pt-br', name: 'Português (Brasil)'},
    {code: 'fr', name: 'Français'},
    {code: 'de', name: 'Deutsch'},
    {code: 'it', name: 'Italiano'}
];

const MobileSettingsModal = ({
    isOpen,
    onClose,
    currentLocale,
    onSelectLocale,
    currentTheme,
    onChangeTheme,
    reducedMotion,
    onSetReducedMotion
}) => {
    if (!isOpen) return null;

    const isHighContrast = currentTheme === HIGH_CONTRAST_THEME;

    const handleLocaleChange = (e) => {
        const newLocale = e.target.value;
        if (onSelectLocale) {
            onSelectLocale(newLocale);
        }
    };

    const handleToggleTheme = () => {
        if (onChangeTheme) {
            onChangeTheme(isHighContrast ? DEFAULT_THEME : HIGH_CONTRAST_THEME);
        }
    };

    const handleToggleReducedMotion = () => {
        if (onSetReducedMotion) {
            onSetReducedMotion(!reducedMotion);
        }
    };

    const handleCheckUpdate = () => {
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.checkForUpdate === 'function') {
            window.AndroidBridge.checkForUpdate();
        } else {
            alert('STBlock v0.1.44 está actualizado.');
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderInfo}>
                        <span className={styles.modalHeaderIcon}>⚙️</span>
                        <div>
                            <h2 className={styles.modalTitle}>Ajustes e Idioma</h2>
                            <p className={styles.modalSubtitle}>Preferencias de STBlock</p>
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

                <div className={styles.modalBody}>
                    {/* Idioma */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="stblock-language-select">
                            <span>Idioma de la Aplicación</span>
                            <span className={styles.fieldLabelHint}>Texto de la interfaz y bloques</span>
                        </label>
                        <div className={styles.selectWrapper}>
                            <select
                                id="stblock-language-select"
                                className={styles.touchSelect}
                                value={currentLocale || 'es'}
                                onChange={handleLocaleChange}
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                            <span className={styles.selectCaret}>▼</span>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className={styles.togglesGroup}>
                        {/* Tema Alto Contraste */}
                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleTitle}>Modo Alto Contraste</span>
                                <span className={styles.toggleDesc}>Mejora la legibilidad de bloques y textos</span>
                            </div>
                            <button
                                type="button"
                                className={classNames(styles.toggleSwitch, {
                                    [styles.toggleSwitchOn]: isHighContrast,
                                    [styles.toggleSwitchOff]: !isHighContrast
                                })}
                                onClick={handleToggleTheme}
                                role="switch"
                                aria-checked={isHighContrast}
                            >
                                <span
                                    className={classNames(styles.toggleThumb, {
                                        [styles.toggleThumbOn]: isHighContrast,
                                        [styles.toggleThumbOff]: !isHighContrast
                                    })}
                                />
                            </button>
                        </div>

                        {/* Rendimiento sin animaciones */}
                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleTitle}>Rendimiento (sin animaciones)</span>
                                <span className={styles.toggleDesc}>Aumenta la fluidez en teléfonos de gama de entrada</span>
                            </div>
                            <button
                                type="button"
                                className={classNames(styles.toggleSwitch, {
                                    [styles.toggleSwitchOn]: reducedMotion,
                                    [styles.toggleSwitchOff]: !reducedMotion
                                })}
                                onClick={handleToggleReducedMotion}
                                role="switch"
                                aria-checked={reducedMotion}
                            >
                                <span
                                    className={classNames(styles.toggleThumb, {
                                        [styles.toggleThumbOn]: reducedMotion,
                                        [styles.toggleThumbOff]: !reducedMotion
                                    })}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Buscar actualizaciones */}
                    <div className={styles.fieldGroup} style={{marginTop: '16px'}}>
                        <button
                            type="button"
                            className={styles.touchSelect}
                            style={{
                                textAlign: 'center',
                                background: '#f1f5f9',
                                color: '#0369a1',
                                fontWeight: 650,
                                cursor: 'pointer',
                                border: '1.5px dashed #0284c7'
                            }}
                            onClick={handleCheckUpdate}
                        >
                            🔄 Buscar Actualizaciones en Google Play
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
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

MobileSettingsModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    currentLocale: PropTypes.string,
    onSelectLocale: PropTypes.func,
    currentTheme: PropTypes.string,
    onChangeTheme: PropTypes.func,
    reducedMotion: PropTypes.bool,
    onSetReducedMotion: PropTypes.func
};

export default MobileSettingsModal;
