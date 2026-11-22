import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';

import Box from '../box/box.jsx';
import Dots from './dots.jsx';
import helpIcon from './icons/help.svg';
import backIcon from './icons/back.svg';
import bluetoothIcon from './icons/bluetooth.svg';
import stblockLinkIcon from './icons/stblock-link.svg';

import styles from './connection-modal.css';

const UnavailableStep = props => (
    <Box className={styles.body}>
        <Box className={styles.activityArea}>
            <div className={styles.scratchLinkHelp}>
                <div className={styles.scratchLinkHelpStep}>
                    <div className={styles.helpStepNumber}>
                        {'1'}
                    </div>
                    <div className={styles.helpStepImage}>
                        <img
                            className={styles.scratchLinkIcon}
                            src={stblockLinkIcon}
                        />
                    </div>
                    <div className={styles.helpStepText}>
                        <FormattedMessage
                            defaultMessage="Asegúrate de tener STBlock Link instalado y ejecutándose"
                            description="Message for getting STBlock Link installed"
                            id="gui.connection.unavailable.installstblocklink"
                        />
                    </div>
                </div>
                <div className={styles.scratchLinkHelpStep}>
                    <div className={styles.helpStepNumber}>
                        {'2'}
                    </div>
                    <div className={styles.helpStepImage}>
                        <img
                            className={styles.scratchLinkIcon}
                            src={bluetoothIcon}
                        />
                    </div>
                    <div className={styles.helpStepText}>
                        <FormattedMessage
                            defaultMessage="Verifica que el Bluetooth esté activado"
                            description="Message for making sure Bluetooth is enabled"
                            id="gui.connection.unavailable.enablebluetooth"
                        />
                    </div>
                </div>
                <div className={styles.scratchLinkHelpStep}>
                    <div className={styles.helpStepNumber}>
                        {'3'}
                    </div>
                    <div className={styles.helpStepImage}>
                        <img
                            className={styles.scratchLinkIcon}
                            src={stblockLinkIcon}
                        />
                    </div>
                    <div className={styles.helpStepText}>
                        <FormattedMessage
                            defaultMessage="Descarga STBlock Link desde stbacademy.net"
                            description="Message for downloading STBlock Link"
                            id="gui.connection.unavailable.downloadstblocklink"
                        />
                        <br />
                        <a
                            className={styles.downloadLink}
                            href="https://stbacademy.net/wp-content/plugins/bolt-page-plugin/assets/STBlock-Link.exe"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Descargar STBlock Link
                        </a>
                    </div>
                </div>
            </div>
        </Box>
        <Box className={styles.bottomArea}>
            <Dots
                error
                className={styles.bottomAreaItem}
                total={3}
            />
            <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                <button
                    className={styles.connectionButton}
                    onClick={props.onScanning}
                >
                    <img
                        className={classNames(styles.buttonIconLeft, styles.buttonIconBack)}
                        src={backIcon}
                    />
                    <FormattedMessage
                        defaultMessage="Reintentar"
                        description="Button to initiate trying the device connection again after an error"
                        id="gui.connection.unavailable.tryagainbutton"
                    />
                </button>
                <button
                    className={styles.connectionButton}
                    onClick={props.onHelp}
                >
                    <img
                        className={styles.buttonIconLeft}
                        src={helpIcon}
                    />
                    <FormattedMessage
                        defaultMessage="Ayuda"
                        description="Button to view help content"
                        id="gui.connection.unavailable.helpbutton"
                    />
                </button>
            </Box>
        </Box>
    </Box>
);

UnavailableStep.propTypes = {
    onHelp: PropTypes.func,
    onScanning: PropTypes.func
};

export default UnavailableStep;
