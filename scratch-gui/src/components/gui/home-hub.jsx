import React from 'react';
import PropTypes from 'prop-types';
import styles from './home-hub.css';

const HomeHub = ({
    onNewProject,
    onOpenProject,
    projects,
    onOpenSavedProject,
    saveError
}) => {
    const handleOpen = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (onOpenProject) onOpenProject();
    };

    return (
        <div className={styles.homeHubOverlay}>
            <div className={styles.homeHubHero}>
                <div className={styles.homeHubHeroTop}>
                    <div>
                        <span className={styles.homeHubEyebrow}><span aria-hidden="true">✦</span> TU ESPACIO CREATIVO</span>
                        <h1 className={styles.homeHubGreeting}>¡Hola, inventor!</h1>
                        <p className={styles.homeHubSubtitle}>Crea un proyecto o continúa donde lo dejaste.</p>
                    </div>
                </div>
            </div>

            <div className={styles.homeHubSectionHeading}>
                <div><span className={styles.homeHubSectionKicker}>TU ESPACIO</span><h2>Mis proyectos</h2></div>
                <span className={styles.homeHubSectionSpark} aria-hidden="true">✧</span>
            </div>
            {saveError ? <div className={styles.homeHubSaveError} role="alert">{saveError}</div> : null}
            <div className={styles.homeHubActionsBar}>
                <button
                    type="button"
                    className={styles.homeHubPrimaryBtn}
                    onClick={onNewProject}
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
                    <span>Cargar desde ordenador</span>
                </button>
            </div>
            <div className={styles.homeHubSavedProjects}>
                {projects.length ? projects.map(project => (
                    <button
                        type="button"
                        className={styles.homeHubSavedProject}
                        key={project.id}
                        onClick={() => onOpenSavedProject(project.id)}
                    >
                        <span className={styles.homeHubSavedProjectIcon}>🧩</span>
                        <span className={styles.homeHubSavedProjectInfo}>
                            <strong>{project.name}</strong>
                            <small>Guardado {new Date(project.updatedAt).toLocaleDateString()}</small>
                        </span>
                        <span className={styles.homeHubSavedProjectArrow} aria-hidden="true">›</span>
                    </button>
                )) : (
                    <div className={styles.homeHubEmptyProjects}>
                        <span aria-hidden="true">🌱</span>
                        <strong>Aún no tienes proyectos guardados</strong>
                        <small>Cuando crees uno, aparecerá aquí automáticamente.</small>
                    </div>
                )}
            </div>
            <p className={styles.homeHubFooter}>STBlock · Aprende creando</p>
        </div>
    );
};

HomeHub.propTypes = {
    onNewProject: PropTypes.func,
    onOpenProject: PropTypes.func,
    projects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        updatedAt: PropTypes.number.isRequired
    })),
    onOpenSavedProject: PropTypes.func,
    saveError: PropTypes.string
};

HomeHub.defaultProps = {
    projects: [],
    onOpenSavedProject: () => {},
    saveError: ''
};

export default HomeHub;
