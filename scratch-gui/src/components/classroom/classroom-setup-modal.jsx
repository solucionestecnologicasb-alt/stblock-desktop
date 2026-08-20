/**
 * STBlock - Modo Aula
 * Modal de creación de sesión (servidor) o unión (cliente).
 *
 * Pasos:
 *  - Pestaña "Crear sesión": el anfitrión define nombre, código, alcance
 *    (bloques/python/ambos), número máximo de conexiones y puerto.
 *  - Pestaña "Unirse a sesión": el cliente indica IP del anfitrión, puerto,
 *    código de la clase y su nombre.
 *
 * Tras una conexión exitosa el modal se cierra y el banner toma el control.
 */

import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import styles from './classroom-setup-modal.css';
import classroomController from '../../lib/classroom/classroom-controller';
import {SCOPES} from '../../lib/classroom/classroom-access';

const DEFAULT_PORT = 8870;

const genCode = () => String(Math.floor(10000 + Math.random() * 90000));

const ScopeOption = ({icon, name, desc, selected, onClick}) => (
    <div
        className={styles['classroom-option'] + (selected ? ' ' + styles.selected : '')}
        onClick={onClick}
        role="button"
        tabIndex="0"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
        <span className={styles['classroom-option-icon']}>{icon}</span>
        <span className={styles['classroom-option-name']}>{name}</span>
        <span className={styles['classroom-option-desc']}>{desc}</span>
    </div>
);

ScopeOption.propTypes = {
    icon: PropTypes.string,
    name: PropTypes.string,
    desc: PropTypes.string,
    selected: PropTypes.bool,
    onClick: PropTypes.func
};

const ClassroomSetupModal = ({isOpen, onClose}) => {
    const [tab, setTab] = useState('crear'); // 'crear' | 'unirse'
    const [state, setState] = useState(classroomController.getState());

    // ── Formulario: crear sesión (servidor) ──
    const [hostName, setHostName] = useState('');
    const [code, setCode] = useState(() => genCode());
    const [scope, setScope] = useState(SCOPES.AMBOS);
    const [maxConnections, setMaxConnections] = useState(10);
    const [purpose, setPurpose] = useState('programacion');
    const [port, setPort] = useState(DEFAULT_PORT);

    // ── Formulario: unirse (cliente) ──
    const [clientName, setClientName] = useState('');
    const [joinHost, setJoinHost] = useState('127.0.0.1');
    const [joinPort, setJoinPort] = useState(DEFAULT_PORT);
    const [joinCode, setJoinCode] = useState('');

    // Estado de la detección de IP local: 'loading' | 'ok' | 'none'
    const [ipStatus, setIpStatus] = useState('loading');

    const busyRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            const unsub = classroomController.subscribe(setState);
            // Detectar la IP LAN del anfitrión para mostrarla automáticamente.
            classroomController.getLocalIPs().then(() => {
                const ips = classroomController.getState().localIPs;
                setIpStatus(Array.isArray(ips) && ips.length > 0 ? 'ok' : 'none');
            });
            return () => unsub();
        }
        return undefined;
    }, [isOpen]);

    // Cerrar el modal automáticamente al conectar (servidor u host conectado).
    useEffect(() => {
        if (isOpen && state.active && (
            state.connectionState === 'hosting' ||
            state.connectionState === 'connected'
        )) {
            onClose();
        }
    }, [isOpen, state.active, state.connectionState, onClose]);

    if (!isOpen) return null;

    const handleCreate = () => {
        if (busyRef.current) return;
        busyRef.current = true;
        classroomController.startHosting({
            name: hostName.trim() || 'Anfitrión',
            code: code.trim() || genCode(),
            scope,
            maxConnections: Number(maxConnections) || 10,
            purpose,
            port: Number(port) || DEFAULT_PORT
        }).finally(() => { busyRef.current = false; });
    };

    const handleJoin = () => {
        if (busyRef.current) return;
        busyRef.current = true;
        classroomController.joinSession({
            host: joinHost.trim() || '127.0.0.1',
            port: Number(joinPort) || DEFAULT_PORT,
            code: joinCode.trim(),
            name: clientName.trim() || 'Estudiante'
        }).finally(() => { busyRef.current = false; });
    };

    const renderStatus = () => {
        const s = state.connectionState;
        if (s === 'hosting') {
            return (
                <div className={`${styles['classroom-status']} ${styles['classroom-status-info']}`}>
                    <div className={styles['classroom-spinner']} />
                    <span className={styles['classroom-status-icon']}>🌐</span>
                    <span>Creando sesión…</span>
                </div>
            );
        }
        if (s === 'connecting') {
            return (
                <div className={`${styles['classroom-status']} ${styles['classroom-status-loading']}`}>
                    <div className={styles['classroom-spinner']} />
                    <span className={styles['classroom-status-icon']}>🔌</span>
                    <span>Conectando al servidor…</span>
                </div>
            );
        }
        if (s === 'pending') {
            return (
                <div className={`${styles['classroom-status']} ${styles['classroom-status-pending']}`}>
                    <span className={styles['classroom-status-icon']}>⏳</span>
                    <span>Solicitud enviada. Esperando la aprobación del servidor…</span>
                </div>
            );
        }
        if (s === 'rejected') {
            return (
                <div className={`${styles['classroom-status']} ${styles['classroom-status-error']}`}>
                    <span className={styles['classroom-status-icon']}>❌</span>
                    <span>{state.error || 'Solicitud rechazada.'}</span>
                </div>
            );
        }
        if (s === 'closed' && state.error) {
            return (
                <div className={`${styles['classroom-status']} ${styles['classroom-status-error']}`}>
                    <span className={styles['classroom-status-icon']}>⚠️</span>
                    <span>{state.error}</span>
                </div>
            );
        }
        return null;
    };

    const renderCreateForm = () => {
        const primaryIP = classroomController.primaryIP();
        return (
        <React.Fragment>
            <div className={styles['classroom-field']}>
                <label className={styles['classroom-label']}>
                    <span className={styles['classroom-label-icon']}>🧑‍🏫</span>
                    Tu nombre
                </label>
                <input
                    className={styles['classroom-input']}
                    placeholder="Ej. Prof. García"
                    value={hostName}
                    onChange={e => setHostName(e.target.value)}
                    maxLength={40}
                />
            </div>

            <div className={styles['classroom-code-box']}>
                <div className={styles['classroom-code-label']}>
                    <span>🌐</span> IP para los alumnos (haz clic para copiarla)
                </div>
                {ipStatus === 'ok' && primaryIP ? (
                    <div className={styles['classroom-ip-value']} title="Haz clic para copiar">
                        {primaryIP}
                    </div>
                ) : ipStatus === 'loading' ? (
                    <div className={styles['classroom-ip-loading']}>
                        <span className={styles['classroom-spinner']} />
                        Detectando IP…
                    </div>
                ) : (
                    <div className={styles['classroom-ip-loading']}>
                        No se pudo detectar la IP automáticamente.
                    </div>
                )}
                {ipStatus === 'ok' && state.localIPs.length > 1 && (
                    <div className={styles['classroom-ip-alt']}>
                        Otras: {state.localIPs.join(' · ')}
                    </div>
                )}
                <p className={styles['classroom-hint']}>
                    Los alumnos deben estar en la misma red Wi-Fi y escribir esta IP en
                    “Unirse a sesión”.
                </p>
            </div>

            <div className={styles['classroom-code-box']}>
                <div className={styles['classroom-code-label']}>
                    <span>🔑</span> Código de la clase (los alumnos lo necesitan)
                </div>
                <div className={styles['classroom-code-value']}>{code}</div>
            </div>

            <div className={styles['classroom-field']}>
                <label className={styles['classroom-label']}>
                    <span className={styles['classroom-label-icon']}>🎯</span>
                    ¿Qué se programará en esta clase?
                </label>
                <div className={styles['classroom-options']}>
                    <ScopeOption
                        icon="🧩"
                        name="Bloques"
                        desc="Solo Scratch"
                        selected={scope === SCOPES.BLOQUES}
                        onClick={() => setScope(SCOPES.BLOQUES)}
                    />
                    <ScopeOption
                        icon="🐍"
                        name="Python"
                        desc="Solo texto"
                        selected={scope === SCOPES.PYTHON}
                        onClick={() => setScope(SCOPES.PYTHON)}
                    />
                    <ScopeOption
                        icon="🔄"
                        name="Ambos"
                        desc="Bloques + Python"
                        selected={scope === SCOPES.AMBOS}
                        onClick={() => setScope(SCOPES.AMBOS)}
                    />
                </div>
            </div>

            <div className={styles['classroom-field-row']}>
                <div className={styles['classroom-field']}>
                    <label className={styles['classroom-label']}>
                        <span className={styles['classroom-label-icon']}>👥</span>
                        Máx. conexiones
                    </label>
                    <input
                        className={styles['classroom-input']}
                        type="number"
                        min="1"
                        max="60"
                        value={maxConnections}
                        onChange={e => setMaxConnections(e.target.value)}
                    />
                </div>
                <div className={styles['classroom-field']}>
                    <label className={styles['classroom-label']}>
                        <span className={styles['classroom-label-icon']}>🚪</span>
                        Puerto
                    </label>
                    <input
                        className={styles['classroom-input']}
                        type="number"
                        min="1"
                        max="65535"
                        value={port}
                        onChange={e => setPort(e.target.value)}
                    />
                </div>
            </div>

            <button
                className={`${styles['classroom-btn']} ${styles['classroom-btn-primary']}`}
                onClick={handleCreate}
                disabled={state.connectionState === 'connecting' || state.connectionState === 'hosting'}
            >
                <span className={styles['classroom-status-icon']}>🌐</span>
                Crear sesión
            </button>
        </React.Fragment>
        );
    };

    const renderJoinForm = () => (
        <React.Fragment>
            <div className={styles['classroom-field']}>
                <label className={styles['classroom-label']}>
                    <span className={styles['classroom-label-icon']}>🧑‍🎓</span>
                    Tu nombre
                </label>
                <input
                    className={styles['classroom-input']}
                    placeholder="Ej. Ana"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    maxLength={40}
                />
            </div>

            <div className={styles['classroom-field-row']}>
                <div className={styles['classroom-field']}>
                    <label className={styles['classroom-label']}>
                        <span className={styles['classroom-label-icon']}>🖥️</span>
                        IP del anfitrión
                    </label>
                    <input
                        className={styles['classroom-input']}
                        placeholder="192.168.1.10"
                        value={joinHost}
                        onChange={e => setJoinHost(e.target.value)}
                    />
                </div>
                <div className={styles['classroom-field']}>
                    <label className={styles['classroom-label']}>
                        <span className={styles['classroom-label-icon']}>🚪</span>
                        Puerto
                    </label>
                    <input
                        className={styles['classroom-input']}
                        type="number"
                        min="1"
                        max="65535"
                        value={joinPort}
                        onChange={e => setJoinPort(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles['classroom-field']}>
                <label className={styles['classroom-label']}>
                    <span className={styles['classroom-label-icon']}>🔑</span>
                    Código de la clase
                </label>
                <input
                    className={`${styles['classroom-input']} ${styles['code-input']}`}
                    placeholder="00000"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                    maxLength={5}
                />
            </div>

            <button
                className={`${styles['classroom-btn']} ${styles['classroom-btn-primary']}`}
                onClick={handleJoin}
                disabled={!joinCode.trim() || state.connectionState === 'connecting'}
            >
                <span className={styles['classroom-status-icon']}>🚀</span>
                Solicitar ingreso
            </button>
        </React.Fragment>
    );

    return (
        <div className={styles['classroom-overlay']}>
            <div className={styles['classroom-modal']}>
                <div className={styles['classroom-header']}>
                    <div className={styles['classroom-header-left']}>
                        <div className={styles['classroom-logo']}>🏫</div>
                        <div className={styles['classroom-title-group']}>
                            <h2 className={styles['classroom-title']}>Modo Aula</h2>
                            <p className={styles['classroom-subtitle']}>Programación colaborativa en clase</p>
                        </div>
                    </div>
                    <button
                        className={`${styles['classroom-btn-icon']} ${styles['classroom-btn-close']}`}
                        onClick={onClose}
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles['classroom-nav']}>
                    <button
                        className={styles['classroom-nav-tab'] + (tab === 'crear' ? ' ' + styles.active : '')}
                        onClick={() => setTab('crear')}
                    >
                        <span className={styles['classroom-nav-icon']}>🌐</span>
                        Crear sesión
                    </button>
                    <button
                        className={styles['classroom-nav-tab'] + (tab === 'unirse' ? ' ' + styles.active : '')}
                        onClick={() => setTab('unirse')}
                    >
                        <span className={styles['classroom-nav-icon']}>🚀</span>
                        Unirse a sesión
                    </button>
                </div>

                <div className={styles['classroom-body']}>
                    {renderStatus()}
                    {tab === 'crear' ? renderCreateForm() : renderJoinForm()}
                    <div className={styles['classroom-tip']}>
                        💡 <strong>¿Cómo funciona?</strong> El <strong>servidor</strong> crea la clase y asigna los
                        personajes. Los <strong>clientes</strong> solicitan ingresar y solo pueden editar lo que el
                        servidor les asigna. Todos ven la programación, pero cada quien edita la suya.
                    </div>
                </div>
            </div>
        </div>
    );
};

ClassroomSetupModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};

export default ClassroomSetupModal;
