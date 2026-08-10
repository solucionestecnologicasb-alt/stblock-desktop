import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './python-key-modal.css';

// Icono de llave (configurar candado)
const KeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <circle cx="7.5" cy="15.5" r="4.5" />
        <path d="M10.5 12.5L21 2" />
        <path d="M15 5l4 4" />
    </svg>
);

// Icono de candado (desbloquear con clave)
const LockKeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
        <circle cx="12" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
        <path d="M12 18v4" />
    </svg>
);

const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

/**
 * Modal del candado con clave.
 * - mode 'set': el profesor crea una clave única para bloquear el modo Python.
 * - mode 'enter': el alumno ingresa la clave para volver al modo bloque.
 * La clave vive solo en memoria (sesión) y se pierde al recargar/cerrar.
 */
const PythonKeyModal = ({
    isOpen,
    mode,
    onCancel,
    onSetKey,
    onTryUnlock
}) => {
    const [key, setKey] = useState('');
    const [confirmKey, setConfirmKey] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // Resetear el formulario cada vez que se abre el modal o cambia el modo
    useEffect(() => {
        if (isOpen) {
            setKey('');
            setConfirmKey('');
            setError('');
            const t = setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 50);
            return () => clearTimeout(t);
        }
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const isSetMode = mode === 'set';

    const handleConfirm = () => {
        const trimmed = key.trim();
        if (!trimmed) {
            setError('La clave no puede estar vacía.');
            return;
        }
        if (isSetMode) {
            if (trimmed.length < 4) {
                setError('La clave debe tener al menos 4 caracteres.');
                return;
            }
            if (trimmed !== confirmKey.trim()) {
                setError('Las claves no coinciden.');
                return;
            }
            onSetKey(trimmed);
        } else {
            const ok = onTryUnlock(key);
            if (!ok) {
                setError('Clave incorrecta.');
            }
        }
    };

    const handleKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={classNames(styles.header, {[styles.locked]: !isSetMode})}>
                    {isSetMode ? <KeyIcon /> : <LockKeyIcon />}
                    <h2 className={styles.title}>
                        {isSetMode ? 'Bloquear modo Python' : 'Desbloquear modo bloque'}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onCancel}
                        title="Cerrar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={styles.body}>
                    <p className={styles.description}>
                        {isSetMode ? (
                            'Crea una clave única. Mientras esté activo el candado, los alumnos solo podrán usar el modo Python y no podrán salir al modo bloque sin ingresarla.'
                        ) : (
                            'Para volver al modo bloque, ingresa la clave única que se configuró al inicio de esta sesión.'
                        )}
                    </p>
                    <input
                        ref={inputRef}
                        type="password"
                        className={styles.input}
                        placeholder={isSetMode ? 'Crea una clave única' : 'Ingresa la clave'}
                        value={key}
                        onChange={e => {
                            setKey(e.target.value);
                            setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        autoComplete="new-password"
                        spellCheck={false}
                    />
                    {isSetMode && (
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Confirma la clave"
                            value={confirmKey}
                            onChange={e => {
                                setConfirmKey(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            autoComplete="new-password"
                            spellCheck={false}
                        />
                    )}
                    {error && (
                        <div className={styles.error}>
                            <ErrorIcon />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        className={classNames(styles.confirmButton, {[styles.unlock]: !isSetMode})}
                        onClick={handleConfirm}
                    >
                        {isSetMode ? 'Bloquear' : 'Desbloquear'}
                    </button>
                </div>
            </div>
        </div>
    );
};

PythonKeyModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    mode: PropTypes.oneOf(['set', 'enter']),
    onCancel: PropTypes.func.isRequired,
    onSetKey: PropTypes.func.isRequired,
    onTryUnlock: PropTypes.func.isRequired
};

PythonKeyModal.defaultProps = {
    mode: 'set'
};

export default PythonKeyModal;
