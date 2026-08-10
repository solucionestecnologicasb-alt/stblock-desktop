/**
 * STBlock - Modo Aula
 * Consola del servidor (anfitrión): solicitudes pendientes, directorio de
 * conexiones y asignación de recursos (personajes/fondos) a cada cliente.
 *
 * Recibe `targets` desde gui.jsx (los recursos vivos del VM de Scratch).
 */

import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import styles from './classroom-console.css';
import classroomController from '../../lib/classroom/classroom-controller';
import {ROLES} from '../../lib/classroom/classroom-access';

const SCOPE_LABELS = {
    bloques: 'Bloques 🧩',
    python: 'Python 🐍',
    ambos: 'Bloques + Python 🔄'
};

const PURPOSE_LABELS = {
    programacion: 'Programación 💻',
    electronica: 'Electrónica ⚡',
    diseno: 'Diseño 🎨'
};

const avatarColorFor = (id, name) => {
    const colors = ['#00b359', '#0ea5e9', '#f97316', '#8b5cf6', '#eab308', '#3b82f6', '#ec4899', '#14b8a6'];
    let hash = 0;
    const str = id || name || '';
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
};

const ClassroomConsole = ({isOpen, onClose, targets}) => {
    const [state, setState] = useState(classroomController.getState());

    useEffect(() => {
        if (isOpen) {
            // Re-sincronizar con el estado actual: si la solicitud llegó mientras el
            // panel estaba cerrado, useState conserva el estado viejo y sin esto
            // seguiría mostrando "Sin solicitudes en espera" aunque ya haya cola.
            const fresh = classroomController.getState();
            console.log('[Classroom] Consola abierta — solicitudes en espera:', fresh.pendingQueue);
            setState(fresh);
            const unsub = classroomController.subscribe(setState);
            return () => unsub();
        }
        return undefined;
    }, [isOpen]);

    if (!isOpen) return null;

    const config = state.config || {};
    const isHost = state.role === ROLES.SERVIDOR;
    const connectedCount = state.roster.filter(c => c.connected).length;
    const pendingCount = state.pendingQueue.length;
    const assignedCount = Object.keys(state.assignments || {}).length;

    const myId = state.clientId;
    const targetById = {};
    (targets || []).forEach(t => { targetById[t.id] = t; });

    // Recursos que aún no están asignados (para mostrar en el select)
    const ownerName = id => {
        const c = state.roster.find(r => r.id === id);
        if (!c) return '—';
        if (id === myId) return `${c.name} (tú)`;
        return c.name;
    };

    const assignOwner = (targetName, ownerId) => {
        classroomController.assignResource(targetName, ownerId);
    };

    const closeSession = () => {
        classroomController.leave();
        onClose();
    };

    const runClass = () => {
        if (state.classRunning) {
            classroomController.stopClass();
        } else {
            classroomController.runClass();
        }
    };

    return (
        <div className={styles['classroom-overlay']}>
            <div className={styles['classroom-panel']}>
                <div className={styles['classroom-header']}>
                    <div className={styles['classroom-header-left']}>
                        <div className={styles['classroom-logo']}>🏫</div>
                        <div className={styles['classroom-title-group']}>
                            <h2 className={styles['classroom-title']}>Consola del servidor</h2>
                            <p className={styles['classroom-subtitle']}>
                                {config.name || 'Sesión sin nombre'} · Código {state.code}
                            </p>
                        </div>
                    </div>
                    <div className={styles['classroom-header-right']}>
                        <span className={styles['classroom-live-badge']}>
                            <span className={styles['classroom-live-dot']} />
                            En vivo
                        </span>
                        <button
                            className={`${styles['classroom-btn-icon']} ${styles['classroom-btn-close']}`}
                            onClick={onClose}
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className={styles['classroom-stats']}>
                    <div className={styles['classroom-stat']}>
                        <div className={styles['classroom-stat-icon']}>👥</div>
                        <div className={styles['classroom-stat-info']}>
                            <h4>{connectedCount}<span style={{fontSize: 12, color: '#888'}}> / {config.maxConnections}</span></h4>
                            <p>Conectados</p>
                        </div>
                    </div>
                    <div className={styles['classroom-stat']}>
                        <div className={styles['classroom-stat-icon']}>⏳</div>
                        <div className={styles['classroom-stat-info']}>
                            <h4>{pendingCount}</h4>
                            <p>En espera</p>
                        </div>
                    </div>
                    <div className={styles['classroom-stat']}>
                        <div className={styles['classroom-stat-icon']}>📌</div>
                        <div className={styles['classroom-stat-info']}>
                            <h4>{assignedCount}</h4>
                            <p>Recursos asignados</p>
                        </div>
                    </div>
                    <div className={styles['classroom-stat']}>
                        <div className={styles['classroom-stat-icon']}>📦</div>
                        <div className={styles['classroom-stat-info']}>
                            <h4>{targets ? targets.length : 0}</h4>
                            <p>Total de recursos</p>
                        </div>
                    </div>
                </div>

                <div className={styles['classroom-content']}>
                    {/* Información de la sesión */}
                    <div className={styles['classroom-section']}>
                        <div className={styles['classroom-section-header']}>
                            <h3 className={styles['classroom-section-title']}>
                                <span>ℹ️</span> Información de la sesión
                            </h3>
                        </div>
                        <div className={styles['classroom-session-grid']}>
                            <div className={styles['classroom-session-item']}>
                                <div className={styles['classroom-session-label']}>🔑 Código</div>
                                <div className={styles['classroom-session-value']}>{state.code}</div>
                            </div>
                            <div className={styles['classroom-session-item']}>
                                <div className={styles['classroom-session-label']}>🌐 Dirección</div>
                                <div className={styles['classroom-session-value']}>{state.serverAddress || '—'}</div>
                            </div>
                            <div className={styles['classroom-session-item']}>
                                <div className={styles['classroom-session-label']}>🎯 Propósito</div>
                                <div className={styles['classroom-session-value']}>
                                    {PURPOSE_LABELS[config.purpose] || '—'}
                                </div>
                            </div>
                            <div className={styles['classroom-session-item']}>
                                <div className={styles['classroom-session-label']}>📐 Alcance</div>
                                <div className={styles['classroom-session-value']}>
                                    {SCOPE_LABELS[config.scope] || '—'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Solicitudes pendientes */}
                    <div className={styles['classroom-section']}>
                        <div className={styles['classroom-section-header']}>
                            <h3 className={styles['classroom-section-title']}>
                                <span>⏳</span> Solicitudes de ingreso
                            </h3>
                            {pendingCount > 0 && (
                                <span className={styles['classroom-section-badge']}>{pendingCount}</span>
                            )}
                        </div>
                        {state.pendingQueue.length === 0 ? (
                            <div className={styles['classroom-empty']}>
                                <span className={styles['classroom-empty-icon']}>🌙</span>
                                Sin solicitudes en espera.
                            </div>
                        ) : (
                            <div className={styles['classroom-requests']}>
                                {state.pendingQueue.map(req => (
                                    <div key={req.id} className={styles['classroom-request']}>
                                        <div className={styles['classroom-request-user']}>
                                            <div
                                                className={styles['classroom-avatar']}
                                                style={{background: avatarColorFor(req.id, req.name)}}
                                            >
                                                {(req.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className={styles['classroom-request-info']}>
                                                <div className={styles['classroom-request-name']}>{req.name}</div>
                                                <div className={styles['classroom-request-time']}>
                                                    Solicitó ingresar
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles['classroom-request-actions']}>
                                            <button
                                                className={`${styles['classroom-btn']} ${styles['classroom-btn-primary']} ${styles['classroom-btn-sm']}`}
                                                onClick={() => classroomController.acceptRequest(req.id)}
                                            >
                                                ✅ Aceptar
                                            </button>
                                            <button
                                                className={`${styles['classroom-btn']} ${styles['classroom-btn-danger']} ${styles['classroom-btn-sm']}`}
                                                onClick={() => classroomController.rejectRequest(req.id)}
                                            >
                                                ❌ Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Directorio */}
                    <div className={styles['classroom-section']}>
                        <div className={styles['classroom-section-header']}>
                            <h3 className={styles['classroom-section-title']}>
                                <span>👥</span> Directorio de la clase
                            </h3>
                            <span className={styles['classroom-section-badge']}>{state.roster.length}</span>
                        </div>
                        {state.roster.length === 0 ? (
                            <div className={styles['classroom-empty']}>
                                <span className={styles['classroom-empty-icon']}>📭</span>
                                Aún no hay participantes.
                            </div>
                        ) : (
                            <div className={styles['classroom-roster-list']}>
                                {state.roster.map(client => (
                                    <div key={client.id} className={styles['classroom-roster-item']}>
                                        <div
                                            className={styles['classroom-roster-color']}
                                            style={{background: client.color || '#ccc'}}
                                        />
                                        <span className={styles['classroom-roster-name']}>
                                            {client.name}
                                            {client.id === myId && ' (tú)'}
                                        </span>
                                        <span
                                            className={
                                                styles['classroom-role-tag'] +
                                                (client.role ? ' ' + styles[client.role] : '')
                                            }
                                        >
                                            {client.role || 'cliente'}
                                        </span>
                                        <span
                                            className={
                                                styles['classroom-status-tag'] +
                                                (client.connected
                                                    ? ' ' + styles.connected
                                                    : ' ' + styles.disconnected)
                                            }
                                        >
                                            {client.connected ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Asignación de recursos */}
                    <div className={styles['classroom-section']}>
                        <div className={styles['classroom-section-header']}>
                            <h3 className={styles['classroom-section-title']}>
                                <span>📌</span> Asignación de recursos
                            </h3>
                            <span className={styles['classroom-section-badge']}>
                                {assignedCount} / {targets ? targets.length : 0}
                            </span>
                        </div>
                        <p className={styles['classroom-hint']}>
                            Asigna cada personaje o fondo a un cliente. Solo el dueño podrá editarlo.
                        </p>
                        {!targets || targets.length === 0 ? (
                            <div className={styles['classroom-empty']}>
                                <span className={styles['classroom-empty-icon']}>🎨</span>
                                Aún no hay personajes ni fondos en el proyecto. Créalos en el editor
                                y regresa aquí para asignarlos.
                            </div>
                        ) : (
                            <div className={styles['classroom-assignments']}>
                                {targets.map(target => {
                                    // La clave de asignación es el NOMBRE del recurso (estable al
                                    // serializar/cargar el proyecto). El id del target se regenera en
                                    // cada carga, por lo que no sirve como clave entre cliente y servidor.
                                    const ownerId = (state.assignments || {})[target.getName()];
                                    const isStage = target.isStage;
                                    return (
                                        <div key={target.id} className={styles['classroom-assignment']}>
                                            <div className={styles['classroom-assignment-icon']}>
                                                {isStage ? '🖼️' : '🎭'}
                                            </div>
                                            <div className={styles['classroom-assignment-info']}>
                                                <div className={styles['classroom-assignment-name']}>
                                                    {target.getName()}
                                                </div>
                                                <div className={styles['classroom-assignment-type']}>
                                                    {isStage ? 'Fondo / Escenario' : 'Personaje'}
                                                </div>
                                            </div>
                                            <div className={styles['classroom-assignment-control']}>
                                                {ownerId ? (
                                                    <div className={styles['classroom-assignment-owner']}>
                                                        <span
                                                            className={styles['classroom-owner-dot']}
                                                            style={{background: '#00b359'}}
                                                        />
                                                        {ownerName(ownerId)}
                                                    </div>
                                                ) : null}
                                                <select
                                                    className={styles['classroom-assignment-select']}
                                                    value={ownerId || ''}
                                                    onChange={e => assignOwner(target.getName(), e.target.value)}
                                                >
                                                    <option value="">— Sin asignar —</option>
                                                    <option value={myId}>🗝️ {state.name} (tú)</option>
                                                    {state.roster
                                                        .filter(c => c.id !== myId)
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles['classroom-footer']}>
                    <div className={styles['classroom-footer-info']}>
                        {state.classRunning ? (
                            <span>🟢 La clase está en ejecución</span>
                        ) : (
                            <span>⏸️ Clase en pausa</span>
                        )}
                    </div>
                    <div className={styles['classroom-footer-actions']}>
                        {isHost && (
                            <button
                                className={`${styles['classroom-btn']} ${
                                    state.classRunning ? styles['classroom-btn-stop'] : styles['classroom-btn-run']
                                }`}
                                onClick={runClass}
                            >
                                {state.classRunning ? '🛑 Detener clase' : '▶️ Ejecutar clase'}
                            </button>
                        )}
                        <button
                            className={`${styles['classroom-btn']} ${styles['classroom-btn-leave']}`}
                            onClick={closeSession}
                        >
                            🚪 Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ClassroomConsole.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    targets: PropTypes.array
};

export default ClassroomConsole;
