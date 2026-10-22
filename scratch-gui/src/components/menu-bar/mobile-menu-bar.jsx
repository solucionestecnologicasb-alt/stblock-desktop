import React, {useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import styles from './mobile-menu-bar.css';
import MobileAiSettingsModal from './mobile-ai-settings-modal.jsx';
import MobileSettingsModal from './mobile-settings-modal.jsx';
import MobileAboutModal from './mobile-about-modal.jsx';
import {selectLocale} from '../../reducers/locales.js';
import {setTheme} from '../../reducers/theme.js';
import {setReducedMotion} from '../../reducers/animations.js';

const MobileMenuBar = ({
    deviceMode,
    onModeChange,
    onClickNew,
    onClickSave,
    onStartSelectingFileUpload,
    onGreenFlag,
    onStopAll,
    onOpenSettings,
    onOpenAbout,
    onOpenHome,
    isHomeOpen,
    canSave,
    mobileStageVisible,
    mobileStageMode,
    onToggleMobileStage,
    onToggleMobilePip,
    mobilePythonOpen,
    onToggleMobilePython,
    onAddSprite,
    onAddBackdrop,
    isAiOpen,
    onToggleAi,
    mobileSerialOpen,
    onToggleMobileSerial,
    selectedDevice,
    onRequestOpenDeviceLibrary,
    currentLocale,
    onSelectLocale,
    currentTheme,
    onChangeTheme,
    reducedMotion,
    onSetReducedMotion
}) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [aiSettingsModalOpen, setAiSettingsModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [aboutModalOpen, setAboutModalOpen] = useState(false);

    // Wrapper para asegurar ejecución rápida en touch/click sin retardos
    const handleAction = useCallback((action) => {
        return (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (action) action();
        };
    }, []);

    const handleOpenDrawer = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(true);
    };
    const handleCloseDrawer = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
    };

    const handleHomeClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        if (onOpenHome) onOpenHome();
    };

    const handleNewClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        if (onClickNew) onClickNew();
    };

    const handleSaveClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        if (onClickSave) onClickSave();
    };

    const handleLoadClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        if (window.__stbLog) {
            window.__stbLog('INFO', '[Menu] Click en "Cargar desde Celular"');
        }
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.pickProjectFile === 'function') {
            if (window.__stbLog) {
                window.__stbLog('INFO', '[Menu] Invocando window.AndroidBridge.pickProjectFile()...');
            }
            window.AndroidBridge.pickProjectFile();
            return;
        }
        if (onStartSelectingFileUpload) onStartSelectingFileUpload();
    };

    const handleModeSelect = (mode) => {
        setDrawerOpen(false);
        if (onModeChange) onModeChange(mode);
    };

    const handleSelectGame = () => handleModeSelect('game');
    const handleSelectDevice = () => handleModeSelect('device');
    const handleSelectDiseno = () => handleModeSelect('diseno');
    const handleSelectEvaluacion = () => handleModeSelect('evaluacion');
    const handleSelectDeviceModal = () => {
        setDrawerOpen(false);
        if (onRequestOpenDeviceLibrary) onRequestOpenDeviceLibrary();
    };

    const handleAiClick = () => {
        setDrawerOpen(false);
        if (onToggleAi) onToggleAi();
    };

    const handleOpenAiSettings = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        setAiSettingsModalOpen(true);
    };

    const handlePipClick = handleAction(() => {
        if (onToggleMobilePip) onToggleMobilePip();
    });
    const handleStageClick = handleAction(() => {
        if (onToggleMobileStage) onToggleMobileStage();
    });
    const handlePythonClick = handleAction(() => {
        if (onToggleMobilePython) onToggleMobilePython();
    });

    const handleSettingsClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        setSettingsModalOpen(true);
        if (onOpenSettings) onOpenSettings();
    };

    const handleAboutClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDrawerOpen(false);
        setAboutModalOpen(true);
        if (onOpenAbout) onOpenAbout();
    };

    const handleRunClick = handleAction(onGreenFlag);
    const handleStopClick = handleAction(onStopAll);
    const handleSerialClick = handleAction(() => {
        if (onToggleMobileSerial) onToggleMobileSerial();
    });

    return (
        <React.Fragment>
            <header className={styles.mobileTopbar}>
                <div className={styles.mobileTopbarLeft}>
                    <button
                        type="button"
                        className={styles.mobileIconBtn}
                        onClick={handleOpenDrawer}
                        aria-label="Abrir Menú"
                    >
                        ☰
                    </button>
                    {deviceMode === 'evaluacion' ? (
                        <button
                            type="button"
                            className={classNames(styles.mobileIconBtn, styles.mobileBackBtn)}
                            onClick={() => handleModeSelect('game')}
                            title="Volver a Programación"
                        >
                            ←
                        </button>
                    ) : onOpenHome ? (
                        <button
                            type="button"
                            className={classNames(styles.mobileIconBtn, styles.homeBtn)}
                            onClick={handleHomeClick}
                            title="Inicio"
                        >
                            🏠
                        </button>
                    ) : null}
                    <span className={styles.mobileAppTitle}>
                        {deviceMode === 'evaluacion' ? 'Evaluaciones' : 'STBlock'}
                    </span>
                    {deviceMode !== 'evaluacion' && selectedDevice && selectedDevice.name ? (
                        <button
                            type="button"
                            className={styles.mobileDeviceBadgeBtn}
                            onClick={handleSelectDeviceModal}
                            title={`Tarjeta: ${selectedDevice.name}. Toca para cambiar.`}
                        >
                            {selectedDevice.iconURL && (
                                <img src={selectedDevice.iconURL} alt="" className={styles.mobileDeviceBadgeIcon} />
                            )}
                            <span className={styles.mobileDeviceBadgeText}>{selectedDevice.name}</span>
                        </button>
                    ) : null}
                </div>

                <div className={styles.mobileTopbarRight}>
                    {deviceMode === 'game' && !isHomeOpen && (
                        <React.Fragment>
                            {onToggleMobilePip && (
                                <button
                                    type="button"
                                    className={classNames(styles.mobileStageBtn, {
                                        [styles.active]: mobileStageMode === 'pip'
                                    })}
                                    onTouchEnd={handlePipClick}
                                    onClick={handlePipClick}
                                    title={mobileStageMode === 'pip' ? "Ocultar Vista Previa" : "Ver Vista Previa (Flotante)"}
                                >
                                    📺
                                </button>
                            )}
                            {onToggleMobileStage && (
                                <button
                                    type="button"
                                    className={classNames(styles.mobileStageBtn, {
                                        [styles.active]: mobileStageMode === 'fullscreen' || mobileStageVisible
                                    })}
                                    onTouchEnd={handleStageClick}
                                    onClick={handleStageClick}
                                    title={mobileStageMode === 'fullscreen' ? "Volver a Código" : "Juego a Pantalla Completa"}
                                >
                                    👁️
                                </button>
                            )}
                            {onToggleMobilePython && (
                                <button
                                    type="button"
                                    className={classNames(styles.mobilePythonBtn, {
                                        [styles.active]: mobilePythonOpen
                                    })}
                                    onTouchEnd={handlePythonClick}
                                    onClick={handlePythonClick}
                                    title={mobilePythonOpen ? "Ver Bloques" : "Modo Python"}
                                >
                                    🐍
                                </button>
                            )}
                        </React.Fragment>
                    )}
                    {deviceMode === 'device' && (
                        <React.Fragment>
                            {onToggleMobileSerial && (
                                <button
                                    type="button"
                                    className={classNames(styles.mobileSerialBtn, {
                                        [styles.active]: mobileSerialOpen
                                    })}
                                    onTouchEnd={handleSerialClick}
                                    onClick={handleSerialClick}
                                    title={mobileSerialOpen ? "Cerrar Monitor Serial" : "Abrir Monitor Serial"}
                                >
                                    📟
                                </button>
                            )}
                            <button
                                type="button"
                                className={styles.mobilePlayBtn}
                                onTouchEnd={handleRunClick}
                                onClick={handleRunClick}
                                title="Iniciar Simulación"
                            >
                                ▶
                            </button>
                            <button
                                type="button"
                                className={styles.mobileStopBtn}
                                onTouchEnd={handleStopClick}
                                onClick={handleStopClick}
                                title="Detener Simulación"
                            >
                                ⏹
                            </button>
                        </React.Fragment>
                    )}
                </div>
            </header>

            {/* Bottom Navigation Bar: Ergonómica para pulgares en móviles */}
            <nav className={styles.mobileBottomNav} aria-label="Navegación de Modos">
                <button
                    type="button"
                    className={classNames(styles.mobileBottomNavItem, {
                        [styles.active]: deviceMode === 'game' && !isAiOpen
                    })}
                    onClick={() => handleModeSelect('game')}
                >
                    <span className={styles.mobileBottomNavIcon}>🧩</span>
                    <span className={styles.mobileBottomNavLabel}>Programación</span>
                </button>
                <button
                    type="button"
                    className={classNames(styles.mobileBottomNavItem, {
                        [styles.active]: deviceMode === 'device' && !isAiOpen
                    })}
                    onClick={() => handleModeSelect('device')}
                >
                    <span className={styles.mobileBottomNavIcon}>⚡</span>
                    <span className={styles.mobileBottomNavLabel}>Electrónica</span>
                </button>
                <button
                    type="button"
                    className={classNames(styles.mobileBottomNavItem, {
                        [styles.active]: deviceMode === 'diseno' && !isAiOpen
                    })}
                    onClick={() => handleModeSelect('diseno')}
                >
                    <span className={styles.mobileBottomNavIcon}>🧊</span>
                    <span className={styles.mobileBottomNavLabel}>Diseño 3D</span>
                </button>
                <button
                    type="button"
                    className={classNames(styles.mobileBottomNavItem, {
                        [styles.active]: deviceMode === 'evaluacion' && !isAiOpen
                    })}
                    onClick={() => handleModeSelect('evaluacion')}
                >
                    <span className={styles.mobileBottomNavIcon}>🎓</span>
                    <span className={styles.mobileBottomNavLabel}>Evaluación</span>
                </button>
                {onToggleAi && (
                    <button
                        type="button"
                        className={classNames(styles.mobileBottomNavItem, styles.aiNavItem, {
                            [styles.active]: isAiOpen
                        })}
                        onClick={onToggleAi}
                    >
                        <span className={styles.mobileBottomNavIcon}>✨</span>
                        <span className={styles.mobileBottomNavLabel}>IA</span>
                    </button>
                )}
            </nav>

            {drawerOpen && (
                <div
                    className={styles.mobileDrawerOverlay}
                    onClick={handleCloseDrawer}
                >
                    <div
                        className={styles.mobileDrawer}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.mobileDrawerHeader}>
                            <div className={styles.mobileDrawerTitleGroup}>
                                <span className={styles.mobileDrawerTitle}>Menú STBlock</span>
                            </div>
                            <button
                                type="button"
                                className={styles.mobileDrawerCloseBtn}
                                onClick={handleCloseDrawer}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.mobileDrawerBody}>
                            <div className={styles.mobileDrawerSection}>
                                <span className={styles.mobileDrawerSectionLabel}>PROYECTO</span>
                                {onOpenHome && (
                                    <button
                                        type="button"
                                        className={styles.mobileDrawerItem}
                                        onClick={handleHomeClick}
                                    >
                                        <span className={styles.mobileDrawerItemIcon}>🏠</span>
                                        <span className={styles.mobileDrawerItemText}>Pantalla de Inicio (Hub)</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleNewClick}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>📄</span>
                                    <span className={styles.mobileDrawerItemText}>Nuevo Proyecto</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleSaveClick}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>💾</span>
                                    <span className={styles.mobileDrawerItemText}>Guardar Proyecto</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleLoadClick}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>📂</span>
                                    <span className={styles.mobileDrawerItemText}>Cargar desde Celular</span>
                                </button>
                            </div>

                            <div className={styles.mobileDrawerSection}>
                                <span className={styles.mobileDrawerSectionLabel}>MODO DE TRABAJO</span>
                                <button
                                    type="button"
                                    className={classNames(styles.mobileDrawerItem, {
                                        [styles.drawerItemActive]: deviceMode === 'game'
                                    })}
                                    onClick={handleSelectGame}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>🧩</span>
                                    <span className={styles.mobileDrawerItemText}>Programación Visual</span>
                                </button>
                                <button
                                    type="button"
                                    className={classNames(styles.mobileDrawerItem, {
                                        [styles.drawerItemActive]: deviceMode === 'device'
                                    })}
                                    onClick={handleSelectDevice}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>⚡</span>
                                    <span className={styles.mobileDrawerItemText}>Electrónica & Simulación</span>
                                </button>
                                <button
                                    type="button"
                                    className={classNames(styles.mobileDrawerItem, {
                                        [styles.drawerItemActive]: deviceMode === 'diseno'
                                    })}
                                    onClick={handleSelectDiseno}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>🧊</span>
                                    <span className={styles.mobileDrawerItemText}>Taller 3D (SketchForge)</span>
                                </button>
                                <button
                                    type="button"
                                    className={classNames(styles.mobileDrawerItem, {
                                        [styles.drawerItemActive]: deviceMode === 'evaluacion'
                                    })}
                                    onClick={handleSelectEvaluacion}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>🎓</span>
                                    <span className={styles.mobileDrawerItemText}>Evaluaciones</span>
                                </button>
                                {onRequestOpenDeviceLibrary && (
                                    <button
                                        type="button"
                                        className={styles.mobileDrawerItem}
                                        onClick={handleSelectDeviceModal}
                                    >
                                        <span className={styles.mobileDrawerItemIcon}>🎛️</span>
                                        <span className={styles.mobileDrawerItemText}>
                                            {selectedDevice && selectedDevice.name ? `Cambiar Placa (${selectedDevice.name})` : 'Seleccionar Placa / Tarjeta'}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className={styles.mobileDrawerSection}>
                                <span className={styles.mobileDrawerSectionLabel}>INTELIGENCIA ARTIFICIAL</span>
                                {onToggleAi && (
                                    <button
                                        type="button"
                                        className={classNames(styles.mobileDrawerItem, {
                                            [styles.drawerItemActive]: isAiOpen
                                        })}
                                        onClick={handleAiClick}
                                    >
                                        <span className={styles.mobileDrawerItemIcon}>✨</span>
                                        <span className={styles.mobileDrawerItemText}>Asistente de IA (Tutor)</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleOpenAiSettings}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>⚙️</span>
                                    <span className={styles.mobileDrawerItemText}>Configuración de IA (APIs & Modelos)</span>
                                </button>
                            </div>

                            <div className={styles.mobileDrawerSection}>
                                <span className={styles.mobileDrawerSectionLabel}>SISTEMA</span>
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleSettingsClick}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>⚙️</span>
                                    <span className={styles.mobileDrawerItemText}>Ajustes e Idioma</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={handleAboutClick}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>ℹ️</span>
                                    <span className={styles.mobileDrawerItemText}>Acerca de STBlock</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.mobileDrawerItem}
                                    onClick={() => {
                                        setDrawerOpen(false);
                                        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.checkForUpdate === 'function') {
                                            window.AndroidBridge.checkForUpdate();
                                        } else {
                                            alert("STBlock v0.1.44 está actualizado.");
                                        }
                                    }}
                                >
                                    <span className={styles.mobileDrawerItemIcon}>🔄</span>
                                    <span className={styles.mobileDrawerItemText}>Buscar Actualizaciones</span>
                                </button>
                            </div>
                        </div>

                        <div className={styles.mobileDrawerFooter}>
                            STBlock Mobile v0.1.44 &bull; STB Academy
                        </div>
                    </div>
                </div>
            )}

            <MobileAiSettingsModal
                isOpen={aiSettingsModalOpen}
                onClose={() => setAiSettingsModalOpen(false)}
            />

            <MobileSettingsModal
                isOpen={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                currentLocale={currentLocale}
                onSelectLocale={onSelectLocale}
                currentTheme={currentTheme}
                onChangeTheme={onChangeTheme}
                reducedMotion={reducedMotion}
                onSetReducedMotion={onSetReducedMotion}
            />

            <MobileAboutModal
                isOpen={aboutModalOpen}
                onClose={() => setAboutModalOpen(false)}
            />
        </React.Fragment>
    );
};

MobileMenuBar.propTypes = {
    deviceMode: PropTypes.string,
    onModeChange: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickSave: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onGreenFlag: PropTypes.func,
    onStopAll: PropTypes.func,
    onOpenSettings: PropTypes.func,
    onOpenAbout: PropTypes.func,
    onOpenHome: PropTypes.func,
    isHomeOpen: PropTypes.bool,
    canSave: PropTypes.bool,
    mobileStageVisible: PropTypes.bool,
    mobileStageMode: PropTypes.string,
    onToggleMobileStage: PropTypes.func,
    onToggleMobilePip: PropTypes.func,
    mobilePythonOpen: PropTypes.bool,
    onToggleMobilePython: PropTypes.func,
    onAddSprite: PropTypes.func,
    onAddBackdrop: PropTypes.func,
    isAiOpen: PropTypes.bool,
    onToggleAi: PropTypes.func,
    mobileSerialOpen: PropTypes.bool,
    onToggleMobileSerial: PropTypes.func,
    selectedDevice: PropTypes.object,
    onRequestOpenDeviceLibrary: PropTypes.func,
    currentLocale: PropTypes.string,
    onSelectLocale: PropTypes.func,
    currentTheme: PropTypes.string,
    onChangeTheme: PropTypes.func,
    reducedMotion: PropTypes.bool,
    onSetReducedMotion: PropTypes.func
};

const mapStateToProps = state => ({
    currentLocale: state.locales.locale,
    currentTheme: state.scratchGui.theme.theme,
    reducedMotion: state.scratchGui.animations.reducedMotion
});

const mapDispatchToProps = dispatch => ({
    onSelectLocale: locale => dispatch(selectLocale(locale)),
    onChangeTheme: theme => dispatch(setTheme(theme)),
    onSetReducedMotion: value => dispatch(setReducedMotion(value))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MobileMenuBar);

