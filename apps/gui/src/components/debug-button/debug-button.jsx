import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import debugIcon from './icon--debug.svg';
import styles from './debug-button.css';

const DebugButtonComponent = function (props) {
    const {
        armed,
        active,
        className,
        onClick,
        title,
        ...componentProps
    } = props;
    return (
        <img
            className={classNames(
                className,
                styles.debugButton,
                {
                    [styles.isArmed]: armed,
                    [styles.isActive]: active
                }
            )}
            draggable={false}
            src={debugIcon}
            title={title}
            onClick={onClick}
            {...componentProps}
        />
    );
};

DebugButtonComponent.propTypes = {
    armed: PropTypes.bool,
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};

DebugButtonComponent.defaultProps = {
    armed: false,
    active: false,
    title: 'Debug'
};

export default DebugButtonComponent;
