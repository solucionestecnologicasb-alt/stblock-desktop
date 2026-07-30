import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './device-selector.css';

const getDeviceCategory = (device) => {
    if (!device.deviceId) return 'other';
    const id = device.deviceId.toLowerCase();
    if (id === 'null') return 'unselect';
    // STBOARD must be checked before arduino since stb could match arduino pattern
    if (id.includes('stb') || id.includes('stboard')) return 'stboard';
    if (id.includes('esp') || id.includes('nodemcu')) return 'esp';
    if (id.includes('microbit')) return 'microbit';
    if (id.includes('raspberry') || id.includes('pico')) return 'raspberrypi';
    if (id.includes('arduino') || id.includes('k210') || id.includes('maix')) return 'arduino';
    return 'other';
};

const DeviceSelector = ({
    deviceData,
    onRequestClose,
    onDeviceSelected,
    title,
    visible,
    selectedDeviceId
}) => {
    const [localSelectedDevice, setLocalSelectedDevice] = React.useState(null);

    React.useEffect(() => {
        if (visible && selectedDeviceId) {
            const device = deviceData.find(d => d.deviceId === selectedDeviceId);
            setLocalSelectedDevice(device || null);
        }
    }, [visible, selectedDeviceId, deviceData]);

    if (!visible) return null;

    // Group devices by category
    const categorizedDevices = {
        unselect: [],
        stboard: [],
        arduino: [],
        esp: [],
        raspberrypi: [],
        microbit: [],
        other: []
    };

    deviceData.forEach(device => {
        const category = getDeviceCategory(device);
        if (categorizedDevices[category]) {
            categorizedDevices[category].push(device);
        } else {
            categorizedDevices.other.push(device);
        }
    });

    const handleSelect = (device) => {
        setLocalSelectedDevice(device);
    };

    const handleConfirm = () => {
        if (localSelectedDevice) {
            onDeviceSelected(localSelectedDevice);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onRequestClose();
        }
    };

    const renderDeviceCard = (device) => (
        <button
            key={device.deviceId}
            className={classNames(styles.deviceCard, {
                [styles.selected]: localSelectedDevice?.deviceId === device.deviceId
            })}
            onClick={() => handleSelect(device)}
        >
            <div className={styles.deviceIconWrapper}>
                {device.iconURL ? (
                    <img
                        src={device.iconURL}
                        alt={device.name}
                        className={styles.deviceImage}
                    />
                ) : (
                    <div className={styles.devicePlaceholder}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="3" width="16" height="18" rx="2" />
                            <circle cx="12" cy="17" r="1" />
                            <path d="M8 7h8M8 11h8" />
                        </svg>
                    </div>
                )}
            </div>
            <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>{device.name}</span>
                <span className={styles.deviceDescription}>{device.description}</span>
            </div>
            {localSelectedDevice?.deviceId === device.deviceId && (
                <div className={styles.selectedBadge}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                </div>
            )}
        </button>
    );

    const categoryLabels = {
        stboard: 'STBOARD',
        arduino: 'Arduino',
        esp: 'ESP / WiFi',
        raspberrypi: 'Raspberry Pi',
        microbit: 'Micro:bit',
        other: 'Otros Dispositivos'
    };

    const categoryIcons = {
        stboard: (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="#19663d" />
                <rect x="5" y="7" width="14" height="10" rx="1" fill="#0d4a2a" />
                <circle cx="8" cy="12" r="2" fill="#00b359" />
                <circle cx="16" cy="12" r="2" fill="#00b359" />
                <rect x="10" y="10" width="4" height="4" rx="1" fill="#00b359" />
                <path d="M7 3v2M12 3v2M17 3v2M7 19v2M12 19v2M17 19v2" stroke="#19663d" strokeWidth="1.5" />
            </svg>
        ),
        arduino: (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="6" width="18" height="12" rx="2" fill="#00979D" />
                <rect x="5" y="8" width="14" height="8" rx="1" fill="#006B70" />
                <rect x="9" y="2" width="6" height="4" rx="1" fill="#888" />
            </svg>
        ),
        esp: (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="6" width="16" height="12" rx="2" fill="#1A1A2E" />
                <rect x="6" y="8" width="12" height="8" rx="1" fill="#E94560" />
                <circle cx="9" cy="12" r="2" fill="#1A1A2E" />
                <circle cx="15" cy="12" r="2" fill="#1A1A2E" />
            </svg>
        ),
        raspberrypi: (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#C51A4A" />
                <circle cx="12" cy="12" r="4" fill="#A1173F" />
            </svg>
        ),
        microbit: (
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="8" width="20" height="8" rx="4" fill="#00ED00" />
                <circle cx="6" cy="12" r="2" fill="#FFD700" />
                <circle cx="18" cy="12" r="2" fill="#FFD700" />
            </svg>
        )
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{title || 'Seleccionar Dispositivo'}</h2>
                    <p className={styles.modalSubtitle}>
                        Elige la placa con la que deseas programar
                    </p>
                </div>

                <div className={styles.deviceCategories}>
                    {/* Unselect device option */}
                    {categorizedDevices.unselect.length > 0 && (
                        <div className={styles.categorySection}>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.unselect.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* STBOARD devices - First! */}
                    {categorizedDevices.stboard.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={classNames(styles.categoryTitle, styles.stboardTitle)}>
                                <span className={styles.categoryIcon}>
                                    {categoryIcons.stboard}
                                </span>
                                {categoryLabels.stboard}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.stboard.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* Arduino devices */}
                    {categorizedDevices.arduino.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={styles.categoryTitle}>
                                <span className={styles.categoryIcon}>
                                    {categoryIcons.arduino}
                                </span>
                                {categoryLabels.arduino}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.arduino.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* ESP / WiFi devices */}
                    {categorizedDevices.esp.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={styles.categoryTitle}>
                                <span className={styles.categoryIcon}>
                                    {categoryIcons.esp}
                                </span>
                                {categoryLabels.esp}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.esp.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* Raspberry Pi devices */}
                    {categorizedDevices.raspberrypi.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={styles.categoryTitle}>
                                <span className={styles.categoryIcon}>
                                    {categoryIcons.raspberrypi}
                                </span>
                                {categoryLabels.raspberrypi}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.raspberrypi.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* Micro:bit devices */}
                    {categorizedDevices.microbit.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={styles.categoryTitle}>
                                <span className={styles.categoryIcon}>
                                    {categoryIcons.microbit}
                                </span>
                                {categoryLabels.microbit}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.microbit.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}

                    {/* Other devices */}
                    {categorizedDevices.other.length > 0 && (
                        <div className={styles.categorySection}>
                            <h3 className={styles.categoryTitle}>
                                {categoryLabels.other}
                            </h3>
                            <div className={styles.deviceGrid}>
                                {categorizedDevices.other.map(renderDeviceCard)}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelButton} onClick={onRequestClose}>
                        Cancelar
                    </button>
                    <button
                        className={classNames(styles.confirmButton, {
                            [styles.disabled]: !localSelectedDevice
                        })}
                        onClick={handleConfirm}
                        disabled={!localSelectedDevice}
                    >
                        {localSelectedDevice ? `Continuar con ${localSelectedDevice.name}` : 'Selecciona un dispositivo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

DeviceSelector.propTypes = {
    deviceData: PropTypes.array.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onDeviceSelected: PropTypes.func.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    selectedDeviceId: PropTypes.string
};

DeviceSelector.defaultProps = {
    visible: false
};

export default DeviceSelector;
