import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import bluetoothIcon from './icon--bluetooth.svg';
import styles from './bluetooth-button.css';

const BluetoothButtonComponent = function (props) {
    const {
        connected,
        connecting,
        className,
        onClick,
        title,
        ...componentProps
    } = props;
    return (
        <button
            className={classNames(
                className,
                styles.bluetoothButton,
                {
                    [styles.isConnected]: connected,
                    [styles.isConnecting]: connecting
                }
            )}
            onClick={onClick}
            title={title}
            {...componentProps}
        >
            <span className={styles.led} />
            <img
                className={styles.icon}
                draggable={false}
                src={bluetoothIcon}
                alt=""
            />
        </button>
    );
};

BluetoothButtonComponent.propTypes = {
    connected: PropTypes.bool,
    connecting: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string
};

BluetoothButtonComponent.defaultProps = {
    connected: false,
    connecting: false,
    title: 'Bluetooth'
};

export default BluetoothButtonComponent;
