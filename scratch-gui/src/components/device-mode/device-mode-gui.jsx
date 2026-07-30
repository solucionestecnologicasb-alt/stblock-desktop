import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './device-mode-gui.css';
import TabBar from '../tab-bar/tab-bar.jsx';
import SplitContainer from '../split-container/split-container.jsx';
import Box from '../box/box.jsx';
import CodeEditor from '../code-editor/code-editor.jsx';
import DeviceExtensionLibrary from '../device-extension-library/device-extension-library.jsx';

// Icons for tabs
import codeIcon from '../gui/icon--code.svg';

// Velxio Circuit Simulator
import VelxioCircuit from '../velxio-circuit/velxio-circuit.jsx';

// Lock icons for code editor
import lockIcon from './icon--lock.svg';
import unlockIcon from './icon--unlock.svg';

// Custom icons for device mode tabs (base64 encoded SVGs)
const simulatorIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIyIiB5PSIzIiB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHJ4PSIyIiBmaWxsPSIjODU1Q0Q2Ii8+PHJlY3QgeD0iNCIgeT0iNSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjgiIHJ4PSIxIiBmaWxsPSIjRTlFMEZGIi8+PHJlY3QgeD0iNiIgeT0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjODU1Q0Q2Ii8+PC9zdmc+';

const circuitIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1IiBjeT0iNSIgcj0iMiIgZmlsbD0iIzg1NUNENiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iNSIgcj0iMiIgZmlsbD0iIzg1NUNENiIvPjxjaXJjbGUgY3g9IjUiIGN5PSIxNSIgcj0iMiIgZmlsbD0iIzg1NUNENiIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iMTUiIHI9IjIiIGZpbGw9IiM4NTVDRDYiLz48cGF0aCBkPSJNNSA3VjEzTTE1IDdWMTNNNyA1SDEzTTcgMTVIMTMiIHN0cm9rZT0iIzg1NUNENiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgcng9IjEiIGZpbGw9IiM4NTVDRDYiLz48L3N2Zz4=';

// Size toggle icons
const largeSizeIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSIyIiBzdHJva2U9IiM1NzVFNzUiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTYgNkwxNCAxNE0xNCA2TDYgMTQiIHN0cm9rZT0iIzU3NUU3NSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz4=';

const smallSizeIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHJ4PSIyIiBzdHJva2U9IiM1NzVFNzUiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PC9zdmc+';

// Connection state constants
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

// Get LED class based on connection state
const getLedClass = (connectionState, isConnected) => {
    if (connectionState === ConnectionState.CONNECTING) return styles.ledConnecting;
    if (connectionState === ConnectionState.ERROR) return styles.ledError;
    if (isConnected || connectionState === ConnectionState.CONNECTED) return styles.ledConnected;
    return styles.ledDisconnected;
};

// Get connection status text
const getConnectionText = (connectionState, isConnected, deviceName, portName) => {
    if (connectionState === ConnectionState.CONNECTING) return 'Conectando...';
    if (connectionState === ConnectionState.ERROR) return 'Error';
    if (isConnected || connectionState === ConnectionState.CONNECTED) {
        if (portName) return portName;
        if (deviceName) return deviceName;
        return 'Conectado';
    }
    return 'Desconectado';
};

// Code Header Component - simplified with LED indicator and action buttons
const CodeHeader = ({
    isLarge,
    onSetLarge,
    onSetSmall,
    isConnected,
    connectionState,
    deviceName,
    portName,
    onConnect,
    onDisconnect,
    onUpload,
    isUploading,
    onUploadFirmware
}) => {
    const ledClass = getLedClass(connectionState, isConnected);
    const statusText = getConnectionText(connectionState, isConnected, deviceName, portName);
    const isActuallyConnected = isConnected || connectionState === ConnectionState.CONNECTED;
    const isConnecting = connectionState === ConnectionState.CONNECTING;

    return (
        <div className={styles.codeHeader}>
            <div className={styles.codeHeaderLeft}>
                <div className={styles.sizeToggleGroup}>
                    <button
                        className={classNames(styles.sizeButton, {[styles.sizeButtonActive]: !isLarge})}
                        onClick={onSetSmall}
                        title="Vista pequeña"
                    >
                        <img src={smallSizeIcon} alt="" className={styles.sizeButtonIcon} />
                    </button>
                    <button
                        className={classNames(styles.sizeButton, {[styles.sizeButtonActive]: isLarge})}
                        onClick={onSetLarge}
                        title="Vista grande"
                    >
                        <img src={largeSizeIcon} alt="" className={styles.sizeButtonIcon} />
                    </button>
                </div>
            </div>
            <div className={styles.codeHeaderRight}>
                {/* Connection Info */}
                <div className={styles.connectionInfo}>
                    {/* LED Indicator */}
                    <div
                        className={classNames(styles.ledIndicator, ledClass)}
                        title={statusText}
                    />
                </div>
                {/* Connect/Disconnect USB Button */}
                <button
                    className={classNames(styles.connectBtnUsb, {
                        [styles.connectBtnUsbConnected]: isActuallyConnected,
                        [styles.connectBtnUsbConnecting]: isConnecting
                    })}
                    onClick={isActuallyConnected ? onDisconnect : onConnect}
                    disabled={isConnecting}
                    title={isActuallyConnected ? 'Desconectar dispositivo' : isConnecting ? 'Conectando...' : 'Conectar dispositivo'}
                >
                    {isConnecting ? (
                        <div className={styles.buttonSpinner} />
                    ) : isActuallyConnected ? (
                        // Premium Connected USB Icon (Socket & Plug Joined)
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="13" width="18" height="8" rx="2" strokeWidth="2.2" />
                            <path d="M7 17h10" strokeWidth="1.5" />
                            <path d="M8 13V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7" strokeWidth="2.2" />
                            <path d="M12 4v4" strokeWidth="1.5" />
                            <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
                        </svg>
                    ) : (
                        // Premium Disconnected USB Icon (Socket & Plug Separated, with Diagonal Slash)
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="15" width="18" height="6" rx="1.5" opacity="0.65" />
                            <path d="M8 10V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6" opacity="0.65" />
                            <line x1="2" y1="22" x2="22" y2="2" stroke="#ef4444" strokeWidth="2.5" />
                        </svg>
                    )}
                </button>

                {/* Upload Button */}
                <button
                    className={classNames(styles.uploadButtonLong, {
                        [styles.uploadingLong]: isUploading,
                        [styles.uploadBtnTextSmall]: !isLarge
                    })}
                    onClick={onUpload}
                    disabled={!isActuallyConnected || isUploading}
                    title={isUploading ? 'Subiendo...' : 'Cargar Código'}
                >
                    {isUploading ? (
                        <div className={styles.buttonSpinner} style={{marginRight: '6px'}} />
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight: '6px'}}>
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                    )}
                    {isLarge ? (isUploading ? 'Subiendo...' : 'Cargar Código') : (isUploading ? 'Subiendo...' : 'Cargar')}
                </button>
            </div>
        </div>
    );
};

CodeHeader.propTypes = {
    isLarge: PropTypes.bool,
    onSetLarge: PropTypes.func,
    onSetSmall: PropTypes.func,
    isConnected: PropTypes.bool,
    connectionState: PropTypes.oneOf(['disconnected', 'connecting', 'connected', 'error']),
    deviceName: PropTypes.string,
    portName: PropTypes.string,
    onConnect: PropTypes.func,
    onDisconnect: PropTypes.func,
    onUpload: PropTypes.func,
    isUploading: PropTypes.bool
};

CodeHeader.defaultProps = {
    connectionState: 'disconnected'
};

// Code View Panel Component (like Stage) - now uses Monaco Editor
const CodeViewPanel = ({
    code,
    isLarge,
    onCopy,
    isLocked,
    onToggleLock,
    manualCode,
    onCodeChange
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const textareaRef = useRef(null);

    // The displayed code depends on lock state
    const displayedCode = isLocked ? code : manualCode;

    const handleCopy = useCallback(() => {
        // Si hay texto seleccionado, copiar solo la selección
        const selection = window.getSelection().toString();
        const textToCopy = selection || displayedCode;
        if (navigator.clipboard && textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        }
        if (onCopy) onCopy(textToCopy);
    }, [displayedCode, onCopy]);

    const handleCodeChange = useCallback((e) => {
        if (onCodeChange) {
            onCodeChange(e.target.value);
        }
    }, [onCodeChange]);

    return (
        <div className={classNames(styles.codePanel, {[styles.codePanelLarge]: isLarge})}>
            {/* Lock button */}
            <button
                className={classNames(styles.lockButton, {[styles.lockButtonUnlocked]: !isLocked})}
                onClick={onToggleLock}
                title={isLocked ? 'Desbloquear para editar código manualmente' : 'Bloquear para usar código de bloques'}
            >
                <img
                    alt={isLocked ? 'Bloqueado' : 'Desbloqueado'}
                    className={styles.lockIcon}
                    src={isLocked ? lockIcon : unlockIcon}
                />
            </button>
            <div className={styles.codeEditorWrapper}>
                {isLocked ? (
                    <CodeEditor
                        code={displayedCode}
                        language="arduino"
                        readOnly={true}
                    />
                ) : (
                    <textarea
                        ref={textareaRef}
                        className={styles.codeTextarea}
                        value={manualCode}
                        onChange={handleCodeChange}
                        spellCheck={false}
                        placeholder="// Escribe tu código Arduino aquí..."
                    />
                )}
            </div>
            <button
                className={classNames(styles.copyButton, {[styles.copySuccess]: copySuccess})}
                onClick={handleCopy}
                title={copySuccess ? 'Copiado!' : 'Copiar código'}
            >
                {copySuccess ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                )}
            </button>
            {/* Indicator when unlocked */}
            {!isLocked && (
                <div className={styles.manualModeIndicator}>
                    Modo manual - Los bloques no afectan el código
                </div>
            )}
        </div>
    );
};

CodeViewPanel.propTypes = {
    code: PropTypes.string.isRequired,
    isLarge: PropTypes.bool,
    onCopy: PropTypes.func,
    isLocked: PropTypes.bool,
    onToggleLock: PropTypes.func,
    manualCode: PropTypes.string,
    onCodeChange: PropTypes.func
};

// Available baud rates
const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 256000];

// EOL options
const EOL_OPTIONS = [
    {value: 'none', label: 'Sin fin de línea'},
    {value: 'lf', label: 'LF (\\n)'},
    {value: 'cr', label: 'CR (\\r)'},
    {value: 'crlf', label: 'CR+LF (\\r\\n)'}
];

// Convert text to hex display
const textToHex = text => {
    if (!text) return '';
    return text.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
};

// Terminal Panel Component (like Target Pane)
const TerminalPanel = ({
    output,
    onClear,
    onSend,
    isConnected,
    settings,
    onSettingsChange
}) => {
    const [inputValue, setInputValue] = useState('');
    const terminalRef = React.useRef(null);

    // Default settings if not provided
    const currentSettings = settings || {
        baudRate: 9600,
        isHexMode: false,
        isPaused: false,
        eol: 'lf',
        autoScroll: true
    };

    useEffect(() => {
        if (terminalRef.current && currentSettings.autoScroll) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output, currentSettings.autoScroll]);

    const handleSend = () => {
        if (inputValue.trim() && onSend) {
            // Add EOL based on settings
            let textToSend = inputValue;
            switch (currentSettings.eol) {
            case 'lf':
                textToSend += '\n';
                break;
            case 'cr':
                textToSend += '\r';
                break;
            case 'crlf':
                textToSend += '\r\n';
                break;
            default:
                // 'none' - no EOL added
                break;
            }
            onSend(textToSend);
            setInputValue('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const handleSettingChange = (key, value) => {
        if (onSettingsChange) {
            onSettingsChange({[key]: value});
        }
    };

    // Format line based on hex mode
    const formatLine = line => {
        const text = line.text || line;
        if (currentSettings.isHexMode) {
            return textToHex(text);
        }
        return text;
    };

    return (
        <div className={styles.terminalPanel}>
            <div className={styles.terminalHeader}>
                <span className={styles.terminalTitle}>Terminal Serial</span>
                <div className={styles.terminalControls}>
                    {/* Baud Rate Selector */}
                    <select
                        className={styles.baudRateSelect}
                        value={currentSettings.baudRate}
                        onChange={e => handleSettingChange('baudRate', parseInt(e.target.value, 10))}
                        title="Velocidad de baudios"
                    >
                        {BAUD_RATES.map(rate => (
                            <option key={rate} value={rate}>{rate}</option>
                        ))}
                    </select>

                    {/* EOL Selector */}
                    <select
                        className={styles.eolSelect}
                        value={currentSettings.eol}
                        onChange={e => handleSettingChange('eol', e.target.value)}
                        title="Fin de línea"
                    >
                        {EOL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Hex Mode Toggle */}
                    <button
                        className={classNames(styles.terminalBtn, {
                            [styles.terminalBtnActive]: currentSettings.isHexMode
                        })}
                        onClick={() => handleSettingChange('isHexMode', !currentSettings.isHexMode)}
                        title={currentSettings.isHexMode ? 'Modo texto' : 'Modo hexadecimal'}
                    >
                        HEX
                    </button>

                    {/* Pause Toggle */}
                    <button
                        className={classNames(styles.terminalBtn, {
                            [styles.terminalBtnActive]: currentSettings.isPaused
                        })}
                        onClick={() => handleSettingChange('isPaused', !currentSettings.isPaused)}
                        title={currentSettings.isPaused ? 'Reanudar' : 'Pausar'}
                    >
                        {currentSettings.isPaused ? '▶' : '⏸'}
                    </button>

                    {/* Auto-scroll Toggle */}
                    <button
                        className={classNames(styles.terminalBtn, {
                            [styles.terminalBtnActive]: currentSettings.autoScroll
                        })}
                        onClick={() => handleSettingChange('autoScroll', !currentSettings.autoScroll)}
                        title={currentSettings.autoScroll ? 'Auto-scroll activo' : 'Auto-scroll desactivado'}
                    >
                        ↓
                    </button>
                </div>
            </div>
            <div
                className={classNames(styles.terminalContent, {
                    [styles.terminalPaused]: currentSettings.isPaused
                })}
                ref={terminalRef}
            >
                {output.length === 0 ? (
                    <div className={styles.terminalPlaceholder}>
                        Conecta un dispositivo para ver la salida serial...
                    </div>
                ) : (
                    output.map((line, index) => (
                        <div key={index} className={classNames(styles.terminalLine, {
                            [styles.errorLine]: line.type === 'error',
                            [styles.successLine]: line.type === 'success',
                            [styles.infoLine]: line.type === 'info'
                        })}>
                            <span className={styles.lineTimestamp}>{line.timestamp || ''}</span>
                            <span className={styles.lineText}>{formatLine(line)}</span>
                        </div>
                    ))
                )}
            </div>
            {currentSettings.isPaused && (
                <div className={styles.pausedIndicator}>
                    ⏸ Pausado - Los nuevos datos no se mostrarán
                </div>
            )}
            <div className={styles.terminalInput}>
                <input
                    type="text"
                    placeholder={isConnected ? 'Enviar comando...' : 'Conecta un dispositivo...'}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!isConnected}
                    className={styles.inputField}
                />
                <button
                    className={styles.sendButton}
                    onClick={handleSend}
                    disabled={!isConnected || !inputValue.trim()}
                >
                    Enviar
                </button>
                {/* Clear Button - next to send */}
                <button
                    className={styles.clearBtnInline}
                    onClick={onClear}
                    title="Limpiar terminal"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

TerminalPanel.propTypes = {
    output: PropTypes.array.isRequired,
    onClear: PropTypes.func,
    onSend: PropTypes.func,
    isConnected: PropTypes.bool,
    settings: PropTypes.shape({
        baudRate: PropTypes.number,
        isHexMode: PropTypes.bool,
        isPaused: PropTypes.bool,
        eol: PropTypes.string,
        autoScroll: PropTypes.bool
    }),
    onSettingsChange: PropTypes.func
};

TerminalPanel.defaultProps = {
    output: [],
    isConnected: false,
    settings: null,
    onSettingsChange: null
};

// Blocks Panel - renders the actual blocks workspace or placeholder
const BlocksPanel = ({blocksComponent, onOpenExtensions}) => {
    if (blocksComponent) {
        return (
            <div className={styles.blocksPanel}>
                <div className={styles.blocksWrapper}>
                    {blocksComponent}
                </div>
                {/* Botón de extensión pequeño en esquina inferior izquierda */}
                <div className={styles.extensionButtonContainer}>
                    <button
                        className={styles.extensionButton}
                        onClick={onOpenExtensions}
                        title="Agregar extensión"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // Show placeholder when no blocks component
    return (
        <div className={classNames(styles.blocksPanel, styles.blocksPanelEmpty)}>
            <div className={styles.placeholderContent}>
                <svg className={styles.placeholderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <h3>Bloques de Código</h3>
                <p>Selecciona un dispositivo para ver los bloques</p>
            </div>
        </div>
    );
};

BlocksPanel.propTypes = {
    blocksComponent: PropTypes.node,
    onOpenExtensions: PropTypes.func
};

// Simulator Panel - Gearbot iframe with STBlock integration
const SimulatorPanel = ({code, deviceId, active, onSerialOutput, onStatusChange}) => {
    const iframeRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const [gearbotReady, setGearbotReady] = useState(false);
    const [currentRobot, setCurrentRobot] = useState(null);
    const iframeUrl = 'static/velxio/gears/index.html?stblockWebGL=1-v11&embedded=1';

    // Listen for messages from the iframe (Gearbot)
    useEffect(() => {
        const handleMessage = (event) => {
            if (!event.data || typeof event.data !== 'object') return;

            switch (event.data.type) {
            case 'gearbot-ready':
                setGearbotReady(true);
                setCurrentRobot(event.data.robotId);
                if (onStatusChange) onStatusChange('ready', event.data);
                break;

            case 'gearbot-status':
                if (event.data.status === 'running') {
                    setIsRunning(true);
                } else if (event.data.status === 'stopped' || event.data.status === 'reset') {
                    setIsRunning(false);
                }
                if (onStatusChange) onStatusChange(event.data.status, event.data);
                break;

            case 'gearbot-error':
                setIsRunning(false);
                if (onSerialOutput) {
                    onSerialOutput({
                        text: `[Error Gearbot] ${event.data.error}`,
                        type: 'error',
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
                break;

            case 'gearbot-robot-loaded':
                setCurrentRobot(event.data.robotId);
                if (onSerialOutput) {
                    onSerialOutput({
                        text: `[Gearbot] Robot cargado: ${event.data.robotName}`,
                        type: 'info',
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
                break;

            case 'stblock-serial-output':
                if (onSerialOutput) {
                    onSerialOutput(event.data.text);
                }
                break;

            case 'gearbot-serial':
                // Recibir datos del monitor serial desde Gearbot
                if (onSerialOutput && event.data.text) {
                    var text = String(event.data.text);
                    // Si es un mensaje de error, agregar marcador para estilo
                    if (event.data.isError) {
                        text = '%c[ERROR]%c ' + text;
                    }
                    onSerialOutput(text);
                }
                break;

            default:
                break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSerialOutput, onStatusChange]);

    // Function to send code to Gearbot for execution
    const executeCode = useCallback(() => {
        console.log('[SimulatorPanel] executeCode llamado');
        console.log('[SimulatorPanel] iframeRef.current:', iframeRef.current);
        console.log('[SimulatorPanel] contentWindow:', iframeRef.current?.contentWindow);
        console.log('[SimulatorPanel] code:', code);
        console.log('[SimulatorPanel] code length:', code ? code.length : 0);
        console.log('[SimulatorPanel] deviceId:', deviceId);

        if (!iframeRef.current || !iframeRef.current.contentWindow) {
            console.error('[SimulatorPanel] ERROR: iframe no disponible');
            return;
        }

        // Determine language based on deviceId
        let language = 'arduino';
        if (deviceId && deviceId.startsWith('stb')) {
            language = 'stboard';
        }

        const message = {
            type: 'stblock-execute',
            code: code,
            language: language,
            boardType: deviceId || 'arduinoUno'
        };

        console.log('[SimulatorPanel] Enviando mensaje a iframe:', message);
        iframeRef.current.contentWindow.postMessage(message, '*');
        console.log('[SimulatorPanel] postMessage enviado exitosamente');

        setIsRunning(true);

        if (onSerialOutput) {
            onSerialOutput({
                text: '[STBlock] Ejecutando código en simulador...',
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }, [code, deviceId, onSerialOutput]);

    // Function to stop execution
    const stopExecution = useCallback(() => {
        if (!iframeRef.current || !iframeRef.current.contentWindow) return;

        iframeRef.current.contentWindow.postMessage({
            type: 'stblock-stop'
        }, '*');

        setIsRunning(false);
    }, []);

    // Function to reset simulator
    const resetSimulator = useCallback(() => {
        if (!iframeRef.current || !iframeRef.current.contentWindow) return;

        iframeRef.current.contentWindow.postMessage({
            type: 'stblock-reset'
        }, '*');

        setIsRunning(false);
    }, []);

    // Request robot list when deviceId changes
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && gearbotReady && deviceId) {
            iframeRef.current.contentWindow.postMessage({
                type: 'stblock-get-robots',
                boardType: deviceId
            }, '*');
        }
    }, [deviceId, gearbotReady]);

    // Enviar código actualizado al iframe cuando cambia
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && gearbotReady && code) {
            // Enviar el código al iframe para que lo tenga disponible
            iframeRef.current.contentWindow.postMessage({
                type: 'stblock-update-code',
                code: code,
                language: deviceId && deviceId.startsWith('stb') ? 'stboard' : 'arduino',
                boardType: deviceId || 'arduinoUno'
            }, '*');
        }
    }, [code, deviceId, gearbotReady]);

    // Escuchar peticiones de ejecución desde el iframe
    useEffect(() => {
        const handleMessage = (event) => {
            if (!event.data || typeof event.data !== 'object') return;

            if (event.data.type === 'gearbot-request-execute') {
                // El iframe pide ejecutar - enviamos el código actual
                executeCode();
            } else if (event.data.type === 'gearbot-request-reset') {
                // El iframe pide reiniciar
                resetSimulator();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [executeCode, resetSimulator]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: active ? 'flex' : 'none',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0
        }}>
            {/* Gearbot iframe - sin barra de control, usa los botones internos del iframe */}
            <iframe
                ref={iframeRef}
                src={iframeUrl}
                style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    minHeight: 0
                }}
                title="Simulador Gearbot"
            />
        </div>
    );
};

SimulatorPanel.propTypes = {
    code: PropTypes.string,
    deviceId: PropTypes.string,
    active: PropTypes.bool,
    onSerialOutput: PropTypes.func,
    onStatusChange: PropTypes.func
};

// Circuits Panel (Velxio simulator)
// Usamos un wrapper que siempre mantiene VelxioCircuit montado
// pero lo oculta visualmente cuando no está activo
const CircuitsPanel = ({code, deviceId, active, componentRef, onSerialOutput}) => (
    <div style={{
        width: '100%',
        height: '100%',
        display: active ? 'flex' : 'none',
        minWidth: 0,
        minHeight: 0
    }}>
        <VelxioCircuit
            ref={componentRef}
            code={code}
            deviceId={deviceId}
            active={active}
            onSerialOutput={onSerialOutput}
        />
    </div>
);

CircuitsPanel.propTypes = {
    code: PropTypes.string,
    deviceId: PropTypes.string,
    active: PropTypes.bool,
    componentRef: PropTypes.object,
    onSerialOutput: PropTypes.func
};

// Vertical Resizer Component for Code/Terminal split
const VerticalResizer = ({onResize}) => {
    const resizerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (resizerRef.current) {
                const container = resizerRef.current.parentElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const headerHeight = 44; // Height of CodeHeader
                    const availableHeight = rect.height - headerHeight;
                    const mouseY = e.clientY - rect.top - headerHeight;
                    const ratio = Math.max(0.2, Math.min(0.8, mouseY / availableHeight));
                    onResize(ratio);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onResize]);

    return (
        <div
            ref={resizerRef}
            className={classNames(styles.verticalResizer, {[styles.verticalResizerActive]: isDragging})}
            onMouseDown={handleMouseDown}
        >
            <div className={styles.resizerHandle} />
        </div>
    );
};

VerticalResizer.propTypes = {
    onResize: PropTypes.func.isRequired
};

// Main Device Mode GUI Component
const DeviceModeGUI = ({
    code,
    terminalOutput,
    terminalSettings,
    device,
    port,
    isConnected,
    connectionState,
    isUploading,
    onClearTerminal,
    onSendToTerminal,
    onTerminalSettingsChange,
    onConnect,
    onDisconnect,
    onUpload,
    onActivateExtension,
    onDeactivateExtension,
    blocksComponent,
    isRtl,
    isCodeLocked: propIsCodeLocked,
    manualCode: propManualCode,
    onCodeLockChange,
    onManualCodeChange,
    onUploadFirmware,
    velxioRef,
    onVelxioSerialOutput
}) => {
    // Size mode state - default to small view
    const [isLarge, setIsLarge] = useState(false);

    // Code/Terminal split ratio (0.65 = code takes 65% of space)
    const [codeTerminalRatio, setCodeTerminalRatio] = useState(0.65);

    // Code lock state - when locked, uses block-generated code
    // When unlocked, allows manual code editing
    const [localIsCodeLocked, setLocalIsCodeLocked] = useState(true);
    const isCodeLocked = propIsCodeLocked !== undefined ? propIsCodeLocked : localIsCodeLocked;

    // Manual code - stores the user's manually written code
    const [localManualCode, setLocalManualCode] = useState(code || '');
    const manualCode = propManualCode !== undefined ? propManualCode : localManualCode;

    // Update manual code when block code changes (only if locked)
    useEffect(() => {
        if (isCodeLocked && code) {
            if (onManualCodeChange) {
                onManualCodeChange(code);
            } else {
                setLocalManualCode(code);
            }
        }
    }, [code, isCodeLocked, onManualCodeChange]);

    // Handle toggle lock
    const handleToggleLock = useCallback(() => {
        const newLockState = !isCodeLocked;
        if (onCodeLockChange) {
            onCodeLockChange(newLockState);
        } else {
            setLocalIsCodeLocked(newLockState);
        }

        // If locking again, reset manual code to block code
        if (newLockState && code) {
            if (onManualCodeChange) {
                onManualCodeChange(code);
            } else {
                setLocalManualCode(code);
            }
        }
    }, [isCodeLocked, code, onCodeLockChange, onManualCodeChange]);

    // Handle manual code change
    const handleManualCodeChange = useCallback((newCode) => {
        if (onManualCodeChange) {
            onManualCodeChange(newCode);
        } else {
            setLocalManualCode(newCode);
        }
    }, [onManualCodeChange]);

    // Get the code to use for upload (depends on lock state)
    const getCodeForUpload = useCallback(() => {
        return isCodeLocked ? code : manualCode;
    }, [isCodeLocked, code, manualCode]);

    // Handle upload with the correct code
    const handleUpload = useCallback(() => {
        if (onUpload) {
            const codeToUpload = isCodeLocked ? code : manualCode;
            onUpload(codeToUpload);
        }
    }, [onUpload, isCodeLocked, code, manualCode]);

    // Tab state
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [secondaryTabIndex, setSecondaryTabIndex] = useState(null);
    const [splitPrimaryIndex, setSplitPrimaryIndex] = useState(null);
    const [splitMode, setSplitMode] = useState(false);
    const [splitRatio, setSplitRatio] = useState(0.5);
    const [tabOrder, setTabOrder] = useState([0, 1, 2]);
    const [isDragToSplit, setIsDragToSplit] = useState(false);
    const [dragZone, setDragZone] = useState(null);

    // Device extension library state
    const [extensionLibraryVisible, setExtensionLibraryVisible] = useState(false);
    const [loadedExtensions, setLoadedExtensions] = useState([]);

    // Handle open extension library
    const handleOpenExtensionLibrary = useCallback(() => {
        setExtensionLibraryVisible(true);
    }, []);

    // Handle close extension library
    const handleCloseExtensionLibrary = useCallback(() => {
        setExtensionLibraryVisible(false);
    }, []);

    // Handle select/deselect extension (toggle)
    const handleSelectExtension = useCallback((extension) => {
        const isAlreadyLoaded = loadedExtensions.includes(extension.extensionId);

        if (isAlreadyLoaded) {
            // Deselect: remove from loaded list and deactivate blocks
            setLoadedExtensions(prev => prev.filter(id => id !== extension.extensionId));
            if (onDeactivateExtension) {
                onDeactivateExtension(extension);
            }
        } else {
            // Select: add to loaded list and activate blocks
            setLoadedExtensions(prev => [...prev, extension.extensionId]);
            if (onActivateExtension) {
                onActivateExtension(extension);
            }
        }
        setExtensionLibraryVisible(false);
    }, [loadedExtensions, onActivateExtension, onDeactivateExtension]);



    // Tab configuration
    const tabsConfig = useMemo(() => [
        {id: 'code', label: <span>Código</span>, icon: codeIcon},
        {id: 'simulator', label: <span>Simulador</span>, icon: simulatorIcon},
        {id: 'circuits', label: <span>Circuitos</span>, icon: circuitIcon}
    ], []);

    // Panels for tabs
    const effectiveCode = isCodeLocked ? code : manualCode;
    const isCircuitsVisible = activeTabIndex === 2 || secondaryTabIndex === 2;
    const velxioDeviceId = device?.deviceId || device?.id || null;

    const blocksPanel = useMemo(() => (
        <BlocksPanel
            blocksComponent={blocksComponent}
            onOpenExtensions={handleOpenExtensionLibrary}
        />
    ), [blocksComponent, handleOpenExtensionLibrary]);
    const simulatorPanel = useMemo(() => (
        <SimulatorPanel
            code={effectiveCode}
            deviceId={velxioDeviceId}
            active={activeTabIndex === 1 || secondaryTabIndex === 1}
            onSerialOutput={onVelxioSerialOutput}
        />
    ), [effectiveCode, velxioDeviceId, activeTabIndex, secondaryTabIndex, onVelxioSerialOutput]);

    const circuitsPanel = useMemo(() => (
        <CircuitsPanel
            code={effectiveCode}
            deviceId={velxioDeviceId}
            active={isCircuitsVisible}
            componentRef={velxioRef}
            onSerialOutput={onVelxioSerialOutput}
        />
    ), [effectiveCode, velxioDeviceId, isCircuitsVisible, velxioRef, onVelxioSerialOutput]);

    const panels = useMemo(() => [blocksPanel, simulatorPanel, circuitsPanel],
        [blocksPanel, simulatorPanel, circuitsPanel]);

    const handleTabClick = useCallback(index => {
        if (index === -1) {
            if (splitMode) setActiveTabIndex(splitPrimaryIndex);
            return;
        }
        setActiveTabIndex(index);
    }, [splitMode, splitPrimaryIndex]);

    const handleSetSecondaryTab = useCallback((index) => {
        if (index === null) {
            setSecondaryTabIndex(null);
            setSplitMode(false);
            setSplitPrimaryIndex(null);
        } else {
            setSecondaryTabIndex(index);
            setSplitMode(true);
            setSplitPrimaryIndex(activeTabIndex);
        }
    }, [activeTabIndex]);

    const handleSwapTabs = useCallback(() => {
        const temp = activeTabIndex;
        setActiveTabIndex(secondaryTabIndex);
        setSecondaryTabIndex(temp);
    }, [activeTabIndex, secondaryTabIndex]);

    const handleTabReorder = useCallback(newOrder => {
        setTabOrder(newOrder);
    }, []);

    const handleDragToSplitPanel = useCallback((active, zone) => {
        setIsDragToSplit(active);
        setDragZone(active ? zone : null);
    }, []);

    const handleRatioChange = useCallback(ratio => {
        setSplitRatio(ratio);
    }, []);

    const handleCloseSecondary = useCallback(() => {
        setSecondaryTabIndex(null);
        setSplitMode(false);
        setSplitPrimaryIndex(null);
    }, []);

    const isInSplit = splitMode && splitPrimaryIndex != null &&
        (activeTabIndex === splitPrimaryIndex || activeTabIndex === secondaryTabIndex);
    const partnerIndex = isInSplit ?
        (activeTabIndex === splitPrimaryIndex ? secondaryTabIndex : splitPrimaryIndex) :
        null;
    const showSplit = partnerIndex != null;

    return (
    <>
        <Box className={styles.bodyWrapper}>
            <Box className={styles.flexWrapper}>
                {/* Left side: Code + Terminal (like stageAndTargetWrapper) */}
                <Box className={classNames(styles.codeAndTerminalWrapper, {
                    [styles.codeAndTerminalWrapperLarge]: isLarge
                })}>
                    {/* Header with size toggle and action buttons */}
                    <CodeHeader
                        isLarge={isLarge}
                        onSetLarge={() => setIsLarge(true)}
                        onSetSmall={() => setIsLarge(false)}
                        isConnected={isConnected}
                        connectionState={connectionState}
                        deviceName={device ? device.name : null}
                        portName={port}
                        onConnect={onConnect}
                        onDisconnect={onDisconnect}
                        onUpload={handleUpload}
                        isUploading={isUploading}
                        onUploadFirmware={onUploadFirmware}
                    />
                    {/* Resizable Code + Terminal area */}
                    <div className={styles.codeTerminalContainer}>
                        {/* Code view (like stage) */}
                        <div
                            className={styles.codeViewWrapper}
                            style={{flex: `0 0 ${codeTerminalRatio * 100}%`}}
                        >
                            <CodeViewPanel
                                code={code}
                                isLarge={isLarge}
                                isLocked={isCodeLocked}
                                onToggleLock={handleToggleLock}
                                manualCode={manualCode}
                                onCodeChange={handleManualCodeChange}
                            />
                        </div>
                        {/* Resizer handle */}
                        <VerticalResizer onResize={setCodeTerminalRatio} />
                        {/* Terminal (like target pane) */}
                        <div
                            className={styles.terminalViewWrapper}
                            style={{flex: `0 0 ${(1 - codeTerminalRatio) * 100}%`}}
                        >
                            <TerminalPanel
                                output={terminalOutput}
                                isConnected={isConnected}
                                onClear={onClearTerminal}
                                onSend={onSendToTerminal}
                                settings={terminalSettings}
                                onSettingsChange={onTerminalSettingsChange}
                            />
                        </div>
                    </div>
                </Box>
                {/* Right side: Tabs + Content (like editorWrapper) */}
                <Box className={styles.editorWrapper}>
                    <TabBar
                        tabs={tabsConfig}
                        tabOrder={tabOrder}
                        activeTabIndex={activeTabIndex}
                        secondaryTabIndex={secondaryTabIndex}
                        splitPrimaryIndex={splitPrimaryIndex}
                        splitMode={splitMode}
                        onTabClick={handleTabClick}
                        onTabReorder={handleTabReorder}
                        onSetSecondaryTab={handleSetSecondaryTab}
                        onActivateTab={setActiveTabIndex}
                        onDragToSplitPanel={handleDragToSplitPanel}
                        rtl={isRtl}
                    />
                    <div className={styles.tabsBody} data-tabs-body>
                        <SplitContainer
                            panels={panels}
                            primaryIndex={activeTabIndex}
                            secondaryIndex={partnerIndex}
                            splitMode={showSplit}
                            splitRatio={splitRatio}
                            splitDirection="horizontal"
                            onRatioChange={handleRatioChange}
                            onCloseSecondary={handleCloseSecondary}
                            onSwap={handleSwapTabs}
                        />
                        {isDragToSplit && !showSplit && dragZone && (
                            <div className={classNames(styles.dropIndicator, dragZone === 'left' ? styles.dropLeft : styles.dropRight)}>
                                <span>Soltar aquí para pantalla dividida</span>
                            </div>
                        )}
                    </div>
                </Box>
            </Box>
        </Box>
        {/* Device Extension Library Modal */}
        <DeviceExtensionLibrary
            visible={extensionLibraryVisible}
            loadedExtensions={loadedExtensions}
            onSelectExtension={handleSelectExtension}
            onClose={handleCloseExtensionLibrary}
        />
    </>
    );
};

DeviceModeGUI.propTypes = {
    code: PropTypes.string,
    terminalOutput: PropTypes.array,
    terminalSettings: PropTypes.shape({
        baudRate: PropTypes.number,
        isHexMode: PropTypes.bool,
        isPaused: PropTypes.bool,
        eol: PropTypes.string,
        autoScroll: PropTypes.bool
    }),
    device: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    }),
    port: PropTypes.string,
    isConnected: PropTypes.bool,
    connectionState: PropTypes.oneOf(['disconnected', 'connecting', 'connected', 'error']),
    isUploading: PropTypes.bool,
    onClearTerminal: PropTypes.func,
    onSendToTerminal: PropTypes.func,
    onTerminalSettingsChange: PropTypes.func,
    onConnect: PropTypes.func,
    onDisconnect: PropTypes.func,
    onUpload: PropTypes.func,
    blocksComponent: PropTypes.node,
    isRtl: PropTypes.bool,
    isCodeLocked: PropTypes.bool,
    manualCode: PropTypes.string,
    onCodeLockChange: PropTypes.func,
    onManualCodeChange: PropTypes.func,
    onUploadFirmware: PropTypes.func,
    velxioRef: PropTypes.object,
    onVelxioSerialOutput: PropTypes.func
};

DeviceModeGUI.defaultProps = {
    code: '// Código generado aparecerá aquí\n\nvoid setup() {\n  // Inicialización\n}\n\nvoid loop() {\n  // Código principal\n}',
    terminalOutput: [],
    isConnected: false,
    connectionState: 'disconnected',
    isUploading: false,
    isRtl: false
};

// Export connection state constants for external use
export {ConnectionState};

export default DeviceModeGUI;
