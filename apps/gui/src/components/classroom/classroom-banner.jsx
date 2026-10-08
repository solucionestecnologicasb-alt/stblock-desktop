/**
 * STBlock - Modo Aula
 * Banner de sesión activa mostrado en la parte superior del editor.
 *
 * Props de control (definidos en gui.jsx):
 *  - onOpenConsole: abrir consola (solo servidor)
 *  - onOpenRoster: abrir directorio
 *  - onOpenSimulator: abrir ventana simulada de 2ª PC (solo servidor)
 *  - onLeave: salir de la sesión
 */

import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import styles from './classroom-banner.css';
import classroomController from '../../lib/classroom/classroom-controller';
import {ROLES} from '../../lib/classroom/classroom-access';
import {isClassroomSimulatorAvailable} from '../../lib/classroom/classroom-simulator';

const ROLE_LABELS = {
    servidor: 'servidor',
    supervisor: 'supervisor',
    cliente: 'estudiante'
};

const ClassroomBanner = ({onOpenConsole, onOpenRoster, onOpenSimulator, onLeave}) => {
    const [state, setState] = useState(classroomController.getState());

    useEffect(() => {
        const unsub = classroomController.subscribe(setState);
        return () => unsub();
    }, []);

    if (!state.active) return null;

    const isHost = state.role === ROLES.SERVIDOR;
    const simAvailable = isClassroomSimulatorAvailable();
    const statusClass =
        state.connectionState === 'connected' || state.connectionState === 'hosting' ?
            styles['classroom-banner-status-live'] :
            styles['classroom-banner-status-waiting'];

    const statusText = state.classRunning ?
        '🟢 Clase en ejecución' :
        state.connectionState === 'pending' ?
            '⏳ En espera de aprobación' :
            '🔵 Sesión activa';

    const hostPort = state.config && state.config.port;
    // El anfitrión ve la IP LAN que los alumnos deben usar (no 127.0.0.1).
    const metaText = isHost
        ? `Código ${state.code} · IP ${state.hostIP || '127.0.0.1'}${hostPort ? `:${hostPort}` : ''}`
        : `Código ${state.code} · ${(state.serverAddress || '').replace(/^ws:\/\//, '')}`;

    return (
        <div className={styles['classroom-banner']}>
            <span className={styles['classroom-banner-logo']}>🏫</span>
            <div className={styles['classroom-banner-session']}>
                <span className={styles['classroom-banner-name']}>
                    {(state.config && state.config.name) || 'Sesión'}
                </span>
                <span className={styles['classroom-banner-meta']}>
                    {metaText}
                </span>
            </div>
            <div className={styles['classroom-banner-divider']} />
            <div className={styles['classroom-banner-me']}>
                <span
                    className={styles['classroom-banner-dot']}
                    style={{background: state.color || '#ccc'}}
                />
                <span className={styles['classroom-banner-myname']}>{state.name}</span>
                <span className={styles['classroom-banner-role']}>
                    {ROLE_LABELS[state.role] || state.role}
                </span>
            </div>
            <div className={styles['classroom-banner-spacer']} />
            <div className={`${styles['classroom-banner-status']} ${statusClass}`}>
                {statusText}
            </div>
            {isHost && (
                <button
                    className={styles['classroom-banner-btn']}
                    onClick={onOpenConsole}
                >
                    🎛️ Consola
                </button>
            )}
            {isHost && simAvailable && (
                <button
                    className={styles['classroom-banner-btn']}
                    onClick={onOpenSimulator}
                    title="Abre una segunda ventana que se une a la sesión como un segundo PC"
                >
                    🖥️ Simular 2ª PC
                </button>
            )}
            <button
                className={styles['classroom-banner-btn']}
                onClick={onOpenRoster}
            >
                👥 Directorio
            </button>
            <button
                className={`${styles['classroom-banner-btn']} ${styles['classroom-banner-btn-leave']}`}
                onClick={onLeave}
            >
                🚪 Salir
            </button>
        </div>
    );
};

ClassroomBanner.propTypes = {
    onOpenConsole: PropTypes.func,
    onOpenRoster: PropTypes.func,
    onOpenSimulator: PropTypes.func,
    onLeave: PropTypes.func
};

export default ClassroomBanner;
