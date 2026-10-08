/**
 * Protocolo de mensajes del Modo Aula (WebSocket, JSON).
 *
 * Roles del enrutamiento:
 * - El relay Rust enruta: cliente → servidor (host) y host → (broadcast | to-client).
 * - El host (React) es la autoridad de negocio (acepta, asigna, fusiona).
 * - `identify` / `broadcast` / `to-client` / `close-session` los consume el relay.
 */

export const MSG = {
    // Enrutado / control del relay (no se reenvían tal cual)
    IDENTIFY: 'identify',
    BROADCAST: 'broadcast',
    TO_CLIENT: 'to-client',
    CLOSE_SESSION: 'close-session',

    // Cliente → Host (el relay los reenvía al host)
    JOIN_REQUEST: 'join-request',
    LEAVE: 'leave',
    TARGET_UPDATE: 'target-update',

    // Host → Cliente (payloads enviados con broadcast / to-client)
    REQUEST_ACCEPTED: 'request-accepted',
    REQUEST_REJECTED: 'request-rejected',
    WELCOME: 'welcome',
    PROJECT_SNAPSHOT: 'project-snapshot',
    PROJECT_UPDATED: 'project-updated',
    ROSTER_UPDATED: 'roster-updated',
    ASSIGNMENTS_UPDATED: 'assignments-updated',
    SESSION_UPDATED: 'session-updated',
    CLASS_RUN: 'class-run',
    CLASS_STOP: 'class-stop',
    SESSION_CLOSED: 'session-closed'
};

export const CLIENT_TO_HOST = [
    MSG.JOIN_REQUEST,
    MSG.LEAVE,
    MSG.TARGET_UPDATE
];

export default MSG;
