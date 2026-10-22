import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import {FormattedMessage} from 'react-intl';

import styles from './crash-message.css';
import reloadIcon from './reload.svg';

const CrashMessage = props => (
    <div className={styles.crashWrapper}>
        <Box className={styles.body}>
            <img
                className={styles.reloadIcon}
                src={reloadIcon}
            />
            <h2>
                <FormattedMessage
                    defaultMessage="Oops! Something went wrong."
                    description="Crash Message title"
                    id="gui.crashMessage.label"
                />
            </h2>
            <p>
                <FormattedMessage
                    defaultMessage={'We are so sorry, but it looks like STBlock has crashed. This bug has been' +
                        ' automatically reported. Please refresh your page to try' +
                        ' again.'}
                    description="Message to inform the user that page has crashed."
                    id="gui.crashMessage.stblock.description"
                />
            </p>
            {props.eventId && (
                <p>
                    <FormattedMessage
                        defaultMessage="Your error was logged with id {errorId}"
                        description="Message to inform the user that page has crashed."
                        id="gui.crashMessage.errorNumber"
                        values={{
                            errorId: props.eventId
                        }}
                    />
                </p>
            )}
            {props.error && (
                <div style={{
                    marginTop: '16px',
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#1e1e2e',
                    color: '#f38ba8',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid #45475a',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{fontWeight: 'bold', color: '#fab387', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>[DEBUG STBLOCK: {props.action || 'Unknown'}]</span>
                        <button
                            type="button"
                            style={{
                                background: '#89b4fa',
                                color: '#11111b',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                const errText = `ACTION: ${props.action || 'None'}\nERROR: ${props.error?.message || props.error}\nSTACK: ${props.error?.stack || 'No stack'}\nCOMPONENT STACK: ${props.errorInfo?.componentStack || 'No component stack'}`;
                                if (navigator.clipboard) {
                                    navigator.clipboard.writeText(errText).then(() => alert('¡Error copiado al portapapeles!')).catch(() => prompt('Copia este error:', errText));
                                } else {
                                    prompt('Copia este error:', errText);
                                }
                            }}
                        >
                            Copiar Error
                        </button>
                    </div>
                    <div style={{color: '#f9e2af', fontWeight: 'bold', marginBottom: '4px', wordBreak: 'break-word'}}>
                        {props.error.message || String(props.error)}
                    </div>
                    {props.error.stack && (
                        <pre style={{margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#cdd6f4', fontSize: '10px'}}>
                            {props.error.stack}
                        </pre>
                    )}
                    {props.errorInfo && props.errorInfo.componentStack && (
                        <pre style={{marginTop: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#a6adc8', fontSize: '9px'}}>
                            {props.errorInfo.componentStack}
                        </pre>
                    )}
                </div>
            )}
            <button
                className={styles.reloadButton}
                onClick={props.onReload}
            >
                <FormattedMessage
                    defaultMessage="Reload"
                    description="Button to reload the page when page crashes"
                    id="gui.crashMessage.reload"
                />
            </button>
        </Box>
    </div>
);

CrashMessage.propTypes = {
    eventId: PropTypes.string,
    onReload: PropTypes.func.isRequired
};

export default CrashMessage;
