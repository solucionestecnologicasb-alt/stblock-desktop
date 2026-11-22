import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './mobile-tabs-bar.css';

const MobileTabsBar = ({
    activeTab,
    onSelectTab,
    targetName,
    targetIcon,
    isStage
}) => {
    const tabs = [
        {id: 'code', label: 'Código', icon: '💻'},
        {id: 'costumes', label: isStage ? 'Fondos' : 'Disfraces', icon: '🎨'},
        {id: 'sounds', label: 'Sonidos', icon: '🔊'},
        {id: 'objects', label: 'Objetos', icon: '👾'}
    ];

    return (
        <div className={styles.mobileTabsContainer}>
            <div className={styles.mobileTabsList}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={classNames(styles.mobileTabButton, {
                            [styles.active]: activeTab === tab.id
                        })}
                        onClick={() => onSelectTab(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tarjeta translúcida que indica a qué personaje o fondo pertenece el código */}
            {targetName && (
                <div className={styles.activeTargetBadge} title={`Editando: ${targetName}`}>
                    {targetIcon && (
                        <img
                            src={targetIcon}
                            alt=""
                            className={styles.activeTargetThumb}
                        />
                    )}
                    <span className={styles.activeTargetName}>{targetName}</span>
                </div>
            )}
        </div>
    );
};

MobileTabsBar.propTypes = {
    activeTab: PropTypes.string.isRequired,
    onSelectTab: PropTypes.func.isRequired,
    targetName: PropTypes.string,
    targetIcon: PropTypes.string,
    isStage: PropTypes.bool
};

export default MobileTabsBar;
