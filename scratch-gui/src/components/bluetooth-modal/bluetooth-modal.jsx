import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import Dots from '../connection-modal/dots.jsx';

import bluetoothGlyph from '../connection-modal/icons/bluetooth.svg';
import bluetoothWhiteGlyph from '../connection-modal/icons/bluetooth-white.svg';
import closeIcon from '../close-button/icon--close.svg';
import radarIcon from '../connection-modal/icons/searching.png';
import refreshIcon from '../connection-modal/icons/refresh.svg';
import warningIcon from '../connection-modal/icons/warning.svg';

import styles from './bluetooth-modal.css';

const BAUD_OPTIONS = [9600, 19200, 38400, 57600, 115200];

const messages = {
    baudLabel: 'Velocidad (baud)',
    close: 'Cerrar',
    connect: 'Conectar',
    connectedToPrefix: 'Conectado a',
    connecting: 'Conectando…',
    disconnect: 'Desconectar',
    hideOthers: 'Ocultar puertos no Bluetooth',
    noPorts: 'No se encontraron puertos.',
    portLabel: 'Puerto',
    refresh: 'Actualizar',
    retry: 'Reintentar',
    scanningEmpty: 'Buscando puertos Bluetooth…',
    selectDevice: 'Selecciona tu puerto Bluetooth de la lista.',
    showAll: 'mostrar todos los puertos',
    virtualComHint: 'Si usas un COM virtual para probar,'
};

const PortTile = props => (
    <Box className={styles.peripheralTile}>
        <Box className={styles.peripheralTileName}>
            <img
                className={styles.peripheralTileImage}
                src={bluetoothGlyph}
            />
            <Box className={styles.peripheralTileNameWrapper}>
                <Box className={styles.peripheralTileNameLabel}>
                    {props.portLabel}
                </Box>
                <Box className={styles.peripheralTileNameText}>
                    {props.name}
                </Box>
            </Box>
        </Box>
        <Box className={styles.peripheralTileWidgets}>
            <button
                disabled={props.disabled}
                onClick={props.onConnect}
            >
                {props.connectLabel}
            </button>
        </Box>
    </Box>
);

PortTile.propTypes = {
    connectLabel: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
    name: PropTypes.string.isRequired,
    onConnect: PropTypes.func.isRequired,
    portLabel: PropTypes.string.isRequired
};

PortTile.defaultProps = {
    disabled: false
};

const BluetoothModalComponent = function (props) {
    const {
        baudRate,
        connected,
        connecting,
        connectedPortName,
        error,
        loading,
        onBaudChange,
        onConnect,
        onDisconnect,
        onRequestClose,
        onScan,
        onToggleShowAll,
        ports,
        showAllPorts
    } = props;

    // Default view: only Bluetooth ports (Tauri marks HC-05 as port_type Bluetooth).
    const visiblePorts = showAllPorts ? ports : ports.filter(p => p.port_type === 'Bluetooth');
    const hasPorts = visiblePorts.length > 0;

    const showConnecting = connecting;
    const showConnected = !connecting && connected;
    const showError = !connecting && !connected && Boolean(error);
    const showList = !connecting && !connected && !showError;

    const handleBaudChange = e => onBaudChange(Number(e.target.value));

    return (
        <Modal
            className={styles.modalContent}
            contentLabel="Bluetooth"
            headerClassName={styles.header}
            headerImage={bluetoothGlyph}
            id="bluetoothModal"
            onRequestClose={onRequestClose}
        >
            {showConnecting ? (
                <Box className={styles.body}>
                    <Box className={styles.activityArea}>
                        <Box className={styles.centeredRow}>
                            <div className={styles.peripheralActivity}>
                                <img
                                    className={styles.peripheralActivityIcon}
                                    src={bluetoothGlyph}
                                />
                                <img
                                    className={styles.bluetoothConnectingIcon}
                                    src={bluetoothWhiteGlyph}
                                />
                            </div>
                        </Box>
                    </Box>
                    <Box className={styles.bottomArea}>
                        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                            {messages.connecting}
                        </Box>
                        <Dots
                            className={styles.bottomAreaItem}
                            counter={1}
                            total={3}
                        />
                        <div className={classNames(styles.bottomAreaItem, styles.segmentedButton)}>
                            <button
                                disabled
                                className={styles.connectionButton}
                            >
                                {messages.connecting}
                            </button>
                            <button
                                className={styles.connectionButton}
                                onClick={onRequestClose}
                            >
                                <img
                                    className={styles.abortConnectingIcon}
                                    src={closeIcon}
                                />
                            </button>
                        </div>
                    </Box>
                </Box>
            ) : null}

            {showConnected ? (
                <Box className={styles.body}>
                    <Box className={styles.activityArea}>
                        <Box className={styles.centeredRow}>
                            <div className={styles.peripheralActivity}>
                                <img
                                    className={styles.peripheralActivityIcon}
                                    src={bluetoothGlyph}
                                />
                                <img
                                    className={styles.bluetoothConnectedIcon}
                                    src={bluetoothWhiteGlyph}
                                />
                            </div>
                        </Box>
                    </Box>
                    <Box className={styles.bottomArea}>
                        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                            <div>{`${messages.connectedToPrefix} ${connectedPortName}`}</div>
                            <div className={styles.baudStatus}>{`@ ${baudRate} baud`}</div>
                        </Box>
                        <Dots
                            className={styles.bottomAreaItem}
                            success
                            total={3}
                        />
                        <div className={classNames(styles.bottomAreaItem, styles.cornerButtons)}>
                            <button
                                className={classNames(styles.redButton, styles.connectionButton)}
                                onClick={onDisconnect}
                            >
                                {messages.disconnect}
                            </button>
                            <button
                                className={styles.connectionButton}
                                onClick={onRequestClose}
                            >
                                {messages.close}
                            </button>
                        </div>
                    </Box>
                </Box>
            ) : null}

            {showError ? (
                <Box className={styles.body}>
                    <Box className={styles.activityArea}>
                        <Box className={styles.centeredRow}>
                            <img
                                className={classNames(styles.helpStepImage, styles.errorStepImage)}
                                src={warningIcon}
                            />
                        </Box>
                    </Box>
                    <Box className={styles.bottomArea}>
                        <div className={classNames(styles.bottomAreaItem, styles.instructions, styles.errorMessage)}>
                            {error}
                        </div>
                        <Dots
                            className={styles.bottomAreaItem}
                            error
                            total={3}
                        />
                        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                            <button
                                className={styles.connectionButton}
                                onClick={onScan}
                            >
                                <img
                                    className={styles.buttonIconRight}
                                    src={refreshIcon}
                                />
                                {messages.retry}
                            </button>
                        </Box>
                    </Box>
                </Box>
            ) : null}

            {showList ? (
                <Box className={styles.body}>
                    <Box className={styles.activityArea}>
                        {loading && !hasPorts ? (
                            <div className={styles.activityAreaInfo}>
                                <div className={styles.centeredRow}>
                                    <img
                                        className={classNames(styles.radarSmall, styles.radarSpin)}
                                        src={radarIcon}
                                    />
                                    <span>{messages.scanningEmpty}</span>
                                </div>
                            </div>
                        ) : null}
                        {!loading && !hasPorts ? (
                            <div className={styles.centeredRow}>
                                <img
                                    className={styles.helpStepImage}
                                    src={warningIcon}
                                />
                                <Box className={styles.emptyText}>
                                    <span>{messages.noPorts}</span>
                                    {showAllPorts ? null : <span>{messages.virtualComHint}</span>}
                                    <button
                                        className={styles.linkButton}
                                        onClick={onToggleShowAll}
                                    >
                                        {showAllPorts ? messages.hideOthers : messages.showAll}
                                    </button>
                                </Box>
                            </div>
                        ) : null}
                        {hasPorts ? (
                            <div className={styles.peripheralTilePane}>
                                {visiblePorts.map(port => {
                                    const handleConnect = () => onConnect(port.id, baudRate);
                                    return (
                                        <PortTile
                                            connectLabel={messages.connect}
                                            disabled={loading}
                                            key={port.id}
                                            name={port.name}
                                            // eslint-disable-next-line react/jsx-no-bind
                                            onConnect={handleConnect}
                                            portLabel={messages.portLabel}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}
                    </Box>
                    <Box className={styles.bottomArea}>
                        {hasPorts ? (
                            <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                                {messages.selectDevice}
                            </Box>
                        ) : null}
                        <div className={classNames(styles.bottomAreaItem, styles.baudRow)}>
                            <span className={styles.baudLabel}>{messages.baudLabel}</span>
                            <select
                                className={styles.baudSelect}
                                disabled={loading}
                                value={String(baudRate)}
                                // eslint-disable-next-line react/jsx-no-bind
                                onChange={handleBaudChange}
                            >
                                {BAUD_OPTIONS.map(value => (
                                    <option
                                        key={value}
                                        value={String(value)}
                                    >
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Dots
                            className={styles.bottomAreaItem}
                            counter={0}
                            total={3}
                        />
                        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                            <button
                                className={styles.connectionButton}
                                disabled={loading}
                                onClick={onScan}
                            >
                                {messages.refresh}
                                <img
                                    className={styles.buttonIconRight}
                                    src={refreshIcon}
                                />
                            </button>
                        </Box>
                    </Box>
                </Box>
            ) : null}
        </Modal>
    );
};

BluetoothModalComponent.propTypes = {
    baudRate: PropTypes.number,
    connected: PropTypes.bool,
    connectedPortName: PropTypes.string,
    connecting: PropTypes.bool,
    error: PropTypes.string,
    loading: PropTypes.bool,
    onBaudChange: PropTypes.func.isRequired,
    onConnect: PropTypes.func.isRequired,
    onDisconnect: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onScan: PropTypes.func.isRequired,
    onToggleShowAll: PropTypes.func.isRequired,
    ports: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        portName: PropTypes.string,
        port_type: PropTypes.string
    })),
    showAllPorts: PropTypes.bool
};

BluetoothModalComponent.defaultProps = {
    baudRate: 9600,
    connected: false,
    connectedPortName: '',
    connecting: false,
    error: null,
    loading: false,
    ports: [],
    showAllPorts: false
};

export default BluetoothModalComponent;
