import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './mode-toggle.css';

const ModeToggle = ({mode, onModeChange, disabled, lockedModes, classroomActive, onOpenClassroom, showClassroom}) => {
    // Un modo puede quedar bloqueado globalmente (disabled) o por rol
    // (lockedModes, p. ej. cliente de Modo Aula no puede usar Electrónica).
    const isLocked = m => disabled || ((lockedModes || []).includes(m));
    return (
    <div className={styles.modeToggleContainer}>
        <div className={styles.modeToggle}>
            <button
                className={classNames(styles.modeButton, {
                    [styles.active]: mode === 'game',
                    [styles.disabled]: isLocked('game')
                })}
                onClick={() => !isLocked('game') && onModeChange('game')}
                disabled={isLocked('game')}
            >
                <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Icono de bloques/codigo */}
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <span className={styles.modeLabel}>Programacion</span>
            </button>
            <button
                className={classNames(styles.modeButton, {
                    [styles.active]: mode === 'device',
                    [styles.disabled]: isLocked('device')
                })}
                onClick={() => !isLocked('device') && onModeChange('device')}
                disabled={isLocked('device')}
            >
                <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Icono de electronica/circuito */}
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                    <path d="M9 6V3M15 6V3M9 18v3M15 18v3M6 9H3M6 15H3M18 9h3M18 15h3" />
                    <circle cx="12" cy="12" r="2" />
                </svg>
                <span className={styles.modeLabel}>Electronica</span>
            </button>
            <button
                className={classNames(styles.modeButton, {
                    [styles.active]: mode === 'diseno',
                    [styles.disabled]: isLocked('diseno')
                })}
                onClick={() => !isLocked('diseno') && onModeChange('diseno')}
                disabled={isLocked('diseno')}
            >
                <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Icono de diseño 3D / cubo */}
                    <path d="M12 2L20 6.5v9L12 20l-8-4.5v-9L12 2z" />
                    <path d="M12 12l8-4.5M12 12L4 7.5M12 12v8" />
                </svg>
                <span className={styles.modeLabel}>Diseño 3D</span>
            </button>
            <button
                className={classNames(styles.modeButton, {
                    [styles.active]: mode === 'evaluacion',
                    [styles.disabled]: isLocked('evaluacion')
                })}
                onClick={() => !isLocked('evaluacion') && onModeChange('evaluacion')}
                disabled={isLocked('evaluacion')}
            >
                <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Icono de evaluacion / gorro de graduacion */}
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
                <span className={styles.modeLabel}>Evaluacion</span>
            </button>
            {showClassroom && (
                <button
                    className={classNames(styles.modeButton, {
                        [styles.active]: classroomActive,
                        [styles.disabled]: disabled
                    })}
                    onClick={() => !disabled && onOpenClassroom && onOpenClassroom()}
                    disabled={disabled}
                >
                    <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {/* Icono de modo aula / escuela */}
                        <path d="M4 19v-9l8-6 8 6v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                        <path d="M9 22V12h6v10" />
                        <path d="M12 2v2" />
                    </svg>
                    <span className={styles.modeLabel}>{classroomActive ? 'En Clase' : 'Modo Aula'}</span>
                </button>
            )}
        </div>
    </div>
    );
};

ModeToggle.propTypes = {
    mode: PropTypes.oneOf(['game', 'device', 'diseno', 'evaluacion']).isRequired,
    onModeChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    lockedModes: PropTypes.arrayOf(PropTypes.oneOf(['game', 'device', 'diseno', 'evaluacion'])),
    classroomActive: PropTypes.bool,
    onOpenClassroom: PropTypes.func,
    showClassroom: PropTypes.bool
};

ModeToggle.defaultProps = {
    disabled: false,
    lockedModes: [],
    showClassroom: false
};

export default ModeToggle;
