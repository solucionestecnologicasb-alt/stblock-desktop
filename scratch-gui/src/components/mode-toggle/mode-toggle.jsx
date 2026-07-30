import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './mode-toggle.css';

const ModeToggle = ({mode, onModeChange, disabled}) => (
    <div className={styles.modeToggleContainer}>
        <div className={styles.modeToggle}>
            <button
                className={classNames(styles.modeButton, {
                    [styles.active]: mode === 'game',
                    [styles.disabled]: disabled
                })}
                onClick={() => !disabled && onModeChange('game')}
                disabled={disabled}
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
                    [styles.disabled]: disabled
                })}
                onClick={() => !disabled && onModeChange('device')}
                disabled={disabled}
            >
                <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Icono de electronica/circuito */}
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                    <path d="M9 6V3M15 6V3M9 18v3M15 18v3M6 9H3M6 15H3M18 9h3M18 15h3" />
                    <circle cx="12" cy="12" r="2" />
                </svg>
                <span className={styles.modeLabel}>Electronica</span>
            </button>
        </div>
    </div>
);

ModeToggle.propTypes = {
    mode: PropTypes.oneOf(['game', 'device']).isRequired,
    onModeChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

ModeToggle.defaultProps = {
    disabled: false
};

export default ModeToggle;
