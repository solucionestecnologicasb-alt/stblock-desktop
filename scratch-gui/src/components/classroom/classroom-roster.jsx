/**
 * STBlock - Modo Aula
 * Panel de directorio (roster) deslizante. Visible para todos los participantes.
 *
 * Muestra: participantes conectados, asignación de recursos y configuración
 * de la sesión.
 */

import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import styles from './classroom-roster.css';
import classroomController from '../../lib/classroom/classroom-controller';

const SCOPE_LABELS = {
    bloques: 'Bloques 🧩',
    python: 'Python 🐍',
    ambos: 'Bloques + Python 🔄'
};

const ClassroomRoster = ({isOpen, onClose, targets}) => {
    const [state, setState] = useState(classroomController.getState());

    useEffect(() => {
        if (isOpen) {
            // Re-sincronizar con el estado actual del controlador (mismo motivo que
            // en la consola: useState conserva el estado capturado al montar).
            const fresh = classroomController.getState();
            console.log('[Classroom] Directorio abierto — participantes:', fresh.roster);
            setState(fresh);
            const unsub = classroomController.subscribe(setState);
            return () => unsub();
        }
        return undefined;
    }, [isOpen]);

    if (!isOpen) return null;

    const config = state.config || {};
    const myId = state.clientId;
    const assignments = state.assignments || {};

    const clientNameById = {};
    state.roster.forEach(c => {
        clientNameById[c.id] = c.name + (c.id === myId ? ' (tú)' : '');
    });

    // Las asignaciones están indexadas por NOMBRE (estable entre cliente y
    // servidor), así que se resuelven contra targets por nombre.
    const targetByName = {};
    (targets || []).forEach(t => { targetByName[t.getName()] = t; });

    const assignedEntries = Object.keys(assignments)
        .filter(targetName => {
            // Solo mostrar recursos que existen en el proyecto actual
            return !targets || targets.length === 0 || targetByName[targetName];
        })
        .map(targetName => ({
            targetName,
            ownerId: assignments[targetName]
        }));

    return (
        <React.Fragment>
            <div
                className={styles['classroom-roster-overlay']}
                onClick={onClose}
            />
            <div className={styles['classroom-roster-panel']}>
                <div className={styles['classroom-roster-header']}>
                    <div className={styles['classroom-roster-header-left']}>
                        <span className={styles['classroom-roster-logo']}>👥</span>
                        <div>
                            <h3 className={styles['classroom-roster-title']}>Directorio</h3>
                            <p className={styles['classroom-roster-subtitle']}>
                                {(config.name || 'Sesión') + ' · Código ' + (state.code || '')}
                            </p>
                        </div>
                    </div>
                    <button
                        className={styles['classroom-btn-icon']}
                        onClick={onClose}
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles['classroom-roster-body']}>
                    <div className={styles['classroom-roster-section']}>
                        <h4 className={styles['classroom-roster-section-title']}>
                            <span>🧑‍🤝‍🧑</span> Participantes ({state.roster.length})
                        </h4>
                        {state.roster.length === 0 ? (
                            <div className={styles['classroom-roster-empty']}>
                                Aún no hay participantes.
                            </div>
                        ) : (
                            state.roster.map(client => (
                                <div key={client.id} className={styles['classroom-roster-item']}>
                                    <span
                                        className={styles['classroom-roster-dot']}
                                        style={{background: client.color || '#ccc'}}
                                    />
                                    <span className={styles['classroom-roster-name']}>
                                        {client.name}
                                        {client.id === myId && ' (tú)'}
                                    </span>
                                    <span
                                        className={
                                            styles['classroom-roster-role'] +
                                            (client.role ? ' ' + styles[client.role] : ' ' + styles.cliente)
                                        }
                                    >
                                        {client.role === 'cliente' ? 'estudiante' : (client.role || 'estudiante')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles['classroom-roster-section']}>
                        <h4 className={styles['classroom-roster-section-title']}>
                            <span>📌</span> Recursos asignados
                        </h4>
                        {assignedEntries.length === 0 ? (
                            <div className={styles['classroom-roster-empty']}>
                                El servidor aún no asigna recursos.
                            </div>
                        ) : (
                            assignedEntries.map(entry => {
                                const target = targetByName[entry.targetName];
                                const isStage = target ? target.isStage : false;
                                return (
                                    <div key={entry.targetName} className={styles['classroom-roster-assignment']}>
                                        <span className={styles['classroom-roster-assignment-icon']}>
                                            {isStage ? '🖼️' : '🎭'}
                                        </span>
                                        <span className={styles['classroom-roster-assignment-target']}>
                                            {target ? target.getName() : entry.targetName}
                                        </span>
                                        <span className={styles['classroom-roster-assignment-arrow']}>→</span>
                                        <span className={styles['classroom-roster-assignment-owner']}>
                                            {clientNameById[entry.ownerId] || '—'}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className={styles['classroom-roster-section']}>
                        <h4 className={styles['classroom-roster-section-title']}>
                            <span>⚙️</span> Sesión
                        </h4>
                        <div className={styles['classroom-roster-config']}>
                            <div className={styles['classroom-roster-config-row']}>
                                <span className={styles['classroom-roster-config-label']}>🎯 Propósito</span>
                                <span className={styles['classroom-roster-config-value']}>
                                    {config.purpose || '—'}
                                </span>
                            </div>
                            <div className={styles['classroom-roster-config-row']}>
                                <span className={styles['classroom-roster-config-label']}>📐 Alcance</span>
                                <span className={styles['classroom-roster-config-value']}>
                                    {SCOPE_LABELS[config.scope] || config.scope || '—'}
                                </span>
                            </div>
                            <div className={styles['classroom-roster-config-row']}>
                                <span className={styles['classroom-roster-config-label']}>👥 Límite</span>
                                <span className={styles['classroom-roster-config-value']}>
                                    {config.maxConnections || '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

ClassroomRoster.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    targets: PropTypes.array
};

export default ClassroomRoster;
