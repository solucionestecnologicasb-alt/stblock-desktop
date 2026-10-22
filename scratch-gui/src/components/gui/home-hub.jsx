import React, {useCallback} from 'react';
import PropTypes from 'prop-types';
import styles from './home-hub.css';

const HomeHub = ({
    onSelectMode,
    onNewProject,
    onOpenProject,
    onClose
}) => {
    const handleAction = useCallback((action) => {
        return (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (action) action();
        };
    }, []);

    const handleSelectGame = handleAction(() => {
        onSelectMode('game');
        onClose();
    });

    const handleSelectDevice = handleAction(() => {
        onSelectMode('device');
        onClose();
    });

    const handleSelectDiseno = handleAction(() => {
        onSelectMode('diseno');
        onClose();
    });

    const handleSelectEvaluacion = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        onSelectMode('evaluacion');
        onClose();
    };

    const handleNew = handleAction(() => {
        if (onNewProject) onNewProject();
        onClose();
    });

    const handleOpen = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        onClose();
        if (onOpenProject) onOpenProject();
    };

    const handleResume = handleAction(onClose);

    return (
        <div className={styles.homeHubOverlay}>
            <div className={styles.homeHubHero}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div>
                        <h1 className={styles.homeHubGreeting}>👋 ¡Hola, Inventor!</h1>
                        <p className={styles.homeHubSubtitle}>¿Qué deseas crear hoy en STBlock?</p>
                    </div>
                    <button
                        type="button"
                        className={styles.homeHubCloseBtn}
                        onClick={handleResume}
                        aria-label="Cerrar Hub"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className={styles.homeHubSectionTitle}>ESPACIOS DE TRABAJO</div>
            <div className={styles.homeHubModesGrid}>
                <div
                    className={styles.homeHubModeCard}
                    onClick={handleSelectGame}
                >
                    <span className={styles.homeHubCardIcon}>🧩</span>
                    <span className={styles.homeHubCardTitle}>Programación</span>
                    <span className={styles.homeHubCardDesc}>Bloques Scratch y código Python interactivo</span>
                </div>

                <div
                    className={styles.homeHubModeCard}
                    onClick={handleSelectDevice}
                >
                    <span className={styles.homeHubCardIcon}>⚡</span>
                    <span className={styles.homeHubCardTitle}>Electrónica</span>
                    <span className={styles.homeHubCardDesc}>Circuitos 2D, sensores y emulador Arduino</span>
                </div>

                <div
                    className={styles.homeHubModeCard}
                    onClick={handleSelectDiseno}
                >
                    <span className={styles.homeHubCardIcon}>🧊</span>
                    <span className={styles.homeHubCardTitle}>Diseño 3D</span>
                    <span className={styles.homeHubCardDesc}>Modelado de robots y partes en 3D</span>
                </div>

                <div
                    className={styles.homeHubModeCard}
                    onClick={handleSelectEvaluacion}
                >
                    <span className={styles.homeHubCardIcon}>🎓</span>
                    <span className={styles.homeHubCardTitle}>Evaluaciones</span>
                    <span className={styles.homeHubCardDesc}>Pruebas y desafíos interactivos de robótica</span>
                </div>
            </div>

            <div className={styles.homeHubSectionTitle}>ACCIONES RÁPIDAS</div>
            <div className={styles.homeHubActionsBar}>
                <button
                    type="button"
                    className={styles.homeHubPrimaryBtn}
                    onClick={handleNew}
                >
                    <span>➕</span>
                    <span>Nuevo Proyecto</span>
                </button>
                <button
                    type="button"
                    className={styles.homeHubSecondaryBtn}
                    onClick={handleOpen}
                >
                    <span>📂</span>
                    <span>Abrir Archivo</span>
                </button>
            </div>

            <div className={styles.homeHubSectionTitle}>PROYECTOS RECIENTES</div>
            <div className={styles.homeHubProjectsList}>
                <div
                    className={styles.homeHubProjectItem}
                    onTouchEnd={handleResume}
                    onClick={handleResume}
                >
                    <div className={styles.homeHubProjectInfo}>
                        <span className={styles.homeHubProjectFileIcon}>📄</span>
                        <div>
                            <div className={styles.homeHubProjectName}>Proyecto Actual en Edición</div>
                            <div className={styles.homeHubProjectMeta}>Continuar donde lo dejaste &bull; Toca para abrir</div>
                        </div>
                    </div>
                    <span className={styles.homeHubProjectOpenArrow}>→</span>
                </div>
            </div>

            <div className={styles.homeHubLoginTeaser}>
                <div className={styles.homeHubLoginText}>
                    <strong>STB Academy Cloud</strong> (Próximamente)<br />
                    Guarda tus proyectos en la nube y accede desde cualquier dispositivo.
                </div>
                <button
                    type="button"
                    className={styles.homeHubLoginBtn}
                    onClick={() => alert('Próximamente: Inicio de sesión STB Academy Cloud')}
                    onTouchEnd={() => alert('Próximamente: Inicio de sesión STB Academy Cloud')}
                >
                    Conectar
                </button>
            </div>
        </div>
    );
};

HomeHub.propTypes = {
    onSelectMode: PropTypes.func.isRequired,
    onNewProject: PropTypes.func,
    onOpenProject: PropTypes.func,
    onClose: PropTypes.func.isRequired
};

export default HomeHub;
