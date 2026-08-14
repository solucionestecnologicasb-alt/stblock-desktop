/**
 * Controlador de sesión del Modo Aula.
 *
 * Maneja la conexión WebSocket (nativa del navegador/webview), los roles
 * servidor/cliente, el directorio, las asignaciones y la cola de solicitudes.
 *
 * El relay Rust solo enruta; la autoridad de negocio vive aquí (en el rol servidor).
 *
 * Uso:
 *   import classroom from './classroom-controller';
 *   classroom.setConfig({ onRemoteProjectUpdate, onClientAccepted, onSessionClosed });
 *   const unsubscribe = classroom.subscribe(state => ...);
 *   classroom.startHosting({ name, scope, maxConnections, port });
 *   classroom.joinSession({ host, port, code, name });
 */

import MSG from './classroom-protocol';
import {ROLES} from './classroom-access';

const COLORS = ['#00b359', '#0ea5e9', '#f97316', '#8b5cf6', '#eab308', '#3b82f6', '#ec4899', '#14b8a6'];
const DEFAULT_PORT = 8870;

// Diagnóstico temporal: traza por consola (visible en DevTools del webview).
// Se trunca para no volcar el JSON completo de los snapshots en cada sync.
const logDiag = (msg) => {
    try {
        const MAX = 600;
        const text = msg && msg.length > MAX ?
            `${msg.slice(0, MAX)}… (${msg.length} chars)` :
            String(msg || '');
        
    } catch (e) {
        // ignorar
    }
};

class ClassroomController {
    constructor () {
        this.ws = null;
        this._closing = false;
        this.config = {};
        this.listeners = new Set();
        this.hostAddress = null;
        this.state = {
            active: false,
            role: null,
            clientId: null,
            name: '',
            code: '',
            color: null,
            connectionState: 'idle', // idle|hosting|connecting|pending|connected|rejected|closed
            error: null,
            config: null,
            roster: [],
            assignments: {},
            pendingQueue: [],
            serverAddress: null,
            classRunning: false
        };
    }

    getState () {
        return {
            ...this.state,
            roster: [...this.state.roster],
            assignments: {...this.state.assignments},
            pendingQueue: [...this.state.pendingQueue]
        };
    }

    subscribe (cb) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    setConfig (cfg) {
        this.config = {...this.config, ...cfg};
    }

    _emit () {
        const s = this.getState();
        this.listeners.forEach(cb => {
            try {
                cb(s);
            } catch (e) {
                console.warn('[Classroom] Error en listener:', e);
            }
        });
    }

    _set (patch) {
        this.state = {...this.state, ...patch};
        this._emit();
    }

    // ───────────────────────────────────────────────────────────
    //  Host: iniciar servidor (Tauri) y conectar como servidor
    // ───────────────────────────────────────────────────────────
    async startHosting ({name, code, scope, maxConnections, purpose = 'programacion', port = DEFAULT_PORT}) {
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('classroom_start_server', {port});
            } else {
                console.warn('[Classroom] Sin Tauri: no se puede iniciar el servidor local.');
            }
        } catch (e) {
            console.warn('[Classroom] Error iniciando servidor:', e);
        }

        this.hostAddress = `127.0.0.1:${port}`;
        const clientId = this._genId();
        this._set({
            active: true,
            role: ROLES.SERVIDOR,
            clientId,
            name,
            code,
            color: COLORS[0],
            config: {name, purpose, scope, maxConnections, port},
            connectionState: 'hosting',
            serverAddress: `ws://${this.hostAddress}`,
            roster: [{
                id: clientId,
                name: `${name} (servidor)`,
                role: ROLES.SERVIDOR,
                color: COLORS[0],
                connected: true
            }],
            assignments: {},
            pendingQueue: [],
            error: null
        });
        this._connect(`ws://${this.hostAddress}`, {role: ROLES.SERVIDOR, clientId, name});
    }

    // ───────────────────────────────────────────────────────────
    //  Cliente: unirse a una sesión
    // ───────────────────────────────────────────────────────────
    joinSession ({host, port, code, name}) {
        this.hostAddress = `${host}:${port}`;
        const clientId = this._genId();
        this._set({
            active: true,
            role: ROLES.CLIENTE,
            clientId,
            name,
            code,
            color: null,
            connectionState: 'connecting',
            serverAddress: `ws://${this.hostAddress}`,
            config: null,
            roster: [],
            assignments: {},
            pendingQueue: [],
            error: null
        });
        this._connect(`ws://${this.hostAddress}`, {role: ROLES.CLIENTE, clientId, name});
        // Devuelve una promesa resuelta para que el llamador pueda encadenar .finally()
        return Promise.resolve();
    }

    _connect (url, identify) {
        let ws;
        try {
            ws = new WebSocket(url);
        } catch (e) {
            this._set({connectionState: 'closed', error: `No se pudo conectar: ${e.message}`});
            return;
        }
        this.ws = ws;
        this._closing = false;

        ws.onopen = () => {
            logDiag(`OPEN ${url} role=${identify.role} clientId=${identify.clientId}`);
            this._send({type: MSG.IDENTIFY, role: identify.role, clientId: identify.clientId, name: identify.name});
            if (identify.role === ROLES.CLIENTE) {
                this._set({connectionState: 'pending'});
                this._send({
                    type: MSG.JOIN_REQUEST,
                    clientId: identify.clientId,
                    code: this.state.code,
                    name: identify.name
                });
            } else {
                this._set({connectionState: 'connected'});
            }
        };

        ws.onmessage = e => this._handleMessage(e.data);

        ws.onclose = () => this._handleClose();

        ws.onerror = () => {
            if (!this._closing) this._set({error: 'Error de conexión.'});
        };
    }

    _send (obj) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            logDiag(`SEND role=${this.state.role} ${JSON.stringify(obj)}`);
            this.ws.send(JSON.stringify(obj));
        } else {
            logDiag(`SEND-FALLIDO role=${this.state.role} ws=${!!this.ws} ready=${this.ws && this.ws.readyState} ${JSON.stringify(obj)}`);
        }
    }

    // ───────────────────────────────────────────────────────────
    //  Mensajes entrantes
    // ───────────────────────────────────────────────────────────
    _handleMessage (raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            return;
        }
        if (!msg || !msg.type) return;
        logDiag(`RECV role=${this.state.role} state=${this.state.connectionState} ${raw}`);
        if (this.state.role === ROLES.SERVIDOR) {
            this._handleHostMessage(msg);
        } else {
            this._handleClientMessage(msg);
        }
    }

    // ── Host ──
    _handleHostMessage (msg) {
        switch (msg.type) {
        case MSG.JOIN_REQUEST: {
            logDiag(`HOST_JOIN_REQUEST role=${this.state.role} roster=${this.state.roster.length} max=${(this.state.config || {}).maxConnections} ${JSON.stringify(msg)}`);
            const config = this.state.config || {};
            if (this.state.roster.length >= config.maxConnections) {
                this._toClient(msg.clientId, {type: MSG.REQUEST_REJECTED, reason: 'Sesión llena.'});
                return;
            }
            const req = {id: msg.clientId, name: msg.name, requestedAt: Date.now()};
            this._set({pendingQueue: [...this.state.pendingQueue, req]});
            break;
        }
        case MSG.LEAVE: {
            this._removeClient(msg.clientId);
            break;
        }
        case MSG.TARGET_UPDATE: {
            // Solo aceptar actualizaciones de clientes ya admitidos en el directorio.
            // Un cliente aún no aceptado no debe poder sobrescribir el proyecto del servidor.
            const inRoster = this.state.roster.some(c => c.id === msg.clientId);
            let names = '?';
            try {
                names = msg.projectJSON ? JSON.parse(msg.projectJSON).targets.map(t => t.name).join(', ') : 'sin-proyecto';
            } catch (e) {
                // ignorar
            }
            
            if (!inRoster) break;
            const payload = {
                sourceClientId: msg.clientId,
                projectJSON: msg.projectJSON,
                pythonCodes: msg.pythonCodes || {}
            };
            // El servidor es la autoridad: onRemoteProjectUpdate fusiona el proyecto
            // del cliente con el suyo y es quien difunde el resultado combinado
            // (sendProjectUpdate). Aquí NO se reenvía el proyecto crudo del cliente,
            // para que todos los clientes vean el estado fusionado y no uno parcial.
            if (this.config.onRemoteProjectUpdate) {
                this.config.onRemoteProjectUpdate(payload);
            }
            break;
        }
        default:
            break;
        }
    }

    // ── Cliente ──
    _handleClientMessage (msg) {
        switch (msg.type) {
        case MSG.REQUEST_ACCEPTED: {
            
            this._set({
                connectionState: 'connected',
                color: msg.color,
                config: msg.config,
                roster: msg.roster || [],
                assignments: msg.assignments || {}
            });
            break;
        }
        case MSG.REQUEST_REJECTED: {
            this._set({connectionState: 'rejected', error: msg.reason || 'Solicitud rechazada.'});
            this._teardownSocket();
            break;
        }
        case MSG.PROJECT_SNAPSHOT: {
            let names = '?';
            try {
                names = msg.projectJSON ? JSON.parse(msg.projectJSON).targets.map(t => t.name).join(', ') : 'sin-proyecto';
            } catch (e) {
                // ignorar
            }
            
            if (this.config.onRemoteProjectUpdate) {
                this.config.onRemoteProjectUpdate({
                    sourceClientId: null,
                    projectJSON: msg.projectJSON,
                    pythonCodes: msg.pythonCodes || {}
                });
            }
            break;
        }
        case MSG.PROJECT_UPDATED: {
            if (msg.sourceClientId === this.state.clientId) break; // eco propio
            let names = '?';
            try {
                names = msg.projectJSON ? JSON.parse(msg.projectJSON).targets.map(t => t.name).join(', ') : 'sin-proyecto';
            } catch (e) {
                // ignorar
            }
            
            if (this.config.onRemoteProjectUpdate) {
                this.config.onRemoteProjectUpdate({
                    sourceClientId: msg.sourceClientId,
                    projectJSON: msg.projectJSON,
                    pythonCodes: msg.pythonCodes || {}
                });
            }
            break;
        }
        case MSG.ROSTER_UPDATED:
            this._set({roster: msg.roster || []});
            break;
        case MSG.ASSIGNMENTS_UPDATED:
            
            this._set({assignments: msg.assignments || {}});
            break;
        case MSG.SESSION_UPDATED:
            this._set({config: msg.config});
            break;
        case MSG.CLASS_RUN:
            this._set({classRunning: true});
            if (this.config.onClassRun) this.config.onClassRun();
            break;
        case MSG.CLASS_STOP:
            this._set({classRunning: false});
            if (this.config.onClassStop) this.config.onClassStop();
            break;
        case MSG.SESSION_CLOSED:
            this._closeSession('Sesión cerrada por el servidor.');
            break;
        default:
            break;
        }
    }

    // ───────────────────────────────────────────────────────────
    //  Acciones del servidor (host)
    // ───────────────────────────────────────────────────────────
    acceptRequest (requestId) {
        const req = this.state.pendingQueue.find(r => r.id === requestId);
        if (!req) return;
        const color = COLORS[this.state.roster.length % COLORS.length];
        const client = {id: req.id, name: req.name, role: ROLES.CLIENTE, color, connected: true};
        const roster = [...this.state.roster, client];
        this._set({roster, pendingQueue: this.state.pendingQueue.filter(r => r.id !== requestId)});
        this._toClient(req.id, {
            type: MSG.REQUEST_ACCEPTED,
            clientId: req.id,
            color,
            config: this.state.config,
            roster,
            assignments: this.state.assignments
        });
        this._broadcast({type: MSG.ROSTER_UPDATED, roster});
        if (this.config.onClientAccepted) {
            this.config.onClientAccepted(client);
        }
    }

    rejectRequest (requestId) {
        const req = this.state.pendingQueue.find(r => r.id === requestId);
        if (!req) return;
        this._set({pendingQueue: this.state.pendingQueue.filter(r => r.id !== requestId)});
        this._toClient(req.id, {type: MSG.REQUEST_REJECTED, reason: 'Solicitud rechazada por el servidor.'});
    }

    assignResource (targetNameOrId, ownerId) {
        const assignments = {...this.state.assignments};
        if (ownerId) {
            assignments[targetNameOrId] = ownerId;
        } else {
            delete assignments[targetNameOrId];
        }
        this._set({assignments});
        this._broadcast({type: MSG.ASSIGNMENTS_UPDATED, assignments});
    }

    setSessionConfig (patch) {
        const config = {...this.state.config, ...patch};
        this._set({config});
        this._broadcast({type: MSG.SESSION_UPDATED, config});
    }

    // ───────────────────────────────────────────────────────────
    //  Sincronización de proyecto
    // ───────────────────────────────────────────────────────────
    sendProjectUpdate ({projectJSON, pythonCodes}) {
        let names = '?';
        try {
            names = JSON.parse(projectJSON).targets.map(t => t.name).join(', ');
        } catch (e) {
            // ignorar
        }
        
        if (this.state.role === ROLES.SERVIDOR) {
            this._broadcast({
                type: MSG.PROJECT_UPDATED,
                sourceClientId: this.state.clientId,
                projectJSON,
                pythonCodes: pythonCodes || {}
            });
        } else {
            this._send({
                type: MSG.TARGET_UPDATE,
                clientId: this.state.clientId,
                projectJSON,
                pythonCodes: pythonCodes || {}
            });
        }
    }

    sendSnapshotToClient (clientId, {projectJSON, pythonCodes}) {
        this._toClient(clientId, {
            type: MSG.PROJECT_SNAPSHOT,
            projectJSON,
            pythonCodes: pythonCodes || {}
        });
    }

    runClass () {
        this._set({classRunning: true});
        this._broadcast({type: MSG.CLASS_RUN});
        if (this.config.onClassRun) this.config.onClassRun();
    }

    stopClass () {
        this._set({classRunning: false});
        this._broadcast({type: MSG.CLASS_STOP});
        if (this.config.onClassStop) this.config.onClassStop();
    }

    // ───────────────────────────────────────────────────────────
    //  Cierre / salida
    // ───────────────────────────────────────────────────────────
    leave () {
        if (this.state.role === ROLES.SERVIDOR) {
            this._send({type: MSG.CLOSE_SESSION});
        } else if (this.state.clientId) {
            this._send({type: MSG.LEAVE, clientId: this.state.clientId});
        }
        this._closeSession(null);
    }

    _removeClient (clientId) {
        const roster = this.state.roster.filter(c => c.id !== clientId);
        const assignments = {...this.state.assignments};
        Object.keys(assignments).forEach(k => {
            if (assignments[k] === clientId) delete assignments[k];
        });
        this._set({
            roster,
            assignments,
            pendingQueue: this.state.pendingQueue.filter(r => r.id !== clientId)
        });
        this._broadcast({type: MSG.ROSTER_UPDATED, roster});
        this._broadcast({type: MSG.ASSIGNMENTS_UPDATED, assignments});
    }

    _closeSession (message) {
        this._closing = true;
        this._teardownSocket();
        this._set({
            active: false,
            role: null,
            clientId: null,
            name: '',
            color: null,
            connectionState: 'closed',
            error: message,
            config: null,
            roster: [],
            assignments: {},
            pendingQueue: [],
            serverAddress: null,
            classRunning: false
        });
        if (this.config.onSessionClosed) {
            this.config.onSessionClosed(message);
        }
    }

    _handleClose () {
        logDiag(`WS_CLOSE role=${this.state.role} state=${this.state.connectionState} closing=${this._closing}`);
        if (this._closing) {
            this._closing = false;
            return;
        }
        if (this.state.active && this.state.connectionState !== 'closed') {
            this._closeSession('Conexión perdida.');
        }
    }

    _teardownSocket () {
        if (this.ws) {
            try {
                this.ws.onopen = null;
                this.ws.onmessage = null;
                this.ws.onerror = null;
                this.ws.onclose = null;
                this.ws.close();
            } catch (e) {
                // ignorar
            }
        }
        this.ws = null;
    }

    // ───────────────────────────────────────────────────────────
    //  Utils
    // ───────────────────────────────────────────────────────────
    _broadcast (payload) {
        this._send({type: MSG.BROADCAST, payload});
    }

    _toClient (clientId, payload) {
        this._send({type: MSG.TO_CLIENT, clientId, payload});
    }

    _genId () {
        return `c-${Date.now().toString(36)}-${Math.random().toString(36)
            .slice(2, 10)}`;
    }
}

const classroomController = new ClassroomController();
export default classroomController;
