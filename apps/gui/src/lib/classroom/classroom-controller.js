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

// Diagnóstico: traza por consola (visible en DevTools del webview).
// Se trunca para no volcar el JSON completo de los snapshots en cada sync.
const MAX_LOG = 800;
const logDiag = (msg) => {
    try {
        const s = String(msg || '');
        const text = s.length > MAX_LOG ?
            `${s.slice(0, MAX_LOG)}… (${s.length} chars)` :
            s;
        console.log(`[Classroom] ${text}`);
    } catch (e) {
        // ignorar
    }
};

// Traza con etiqueta de rol para distinguir el flujo del servidor (host) y del cliente.
const trace = (role, ...args) => {
    try {
        const parts = args.map(a => {
            const s = typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch (e) { return String(a); } })();
            return s.length > MAX_LOG ? `${s.slice(0, MAX_LOG)}… (${s.length} chars)` : s;
        });
        console.log(`[Classroom][${role}]`, ...parts);
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
        this._localIPs = null; // caché de IPs locales detectadas
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
            localIPs: [],   // IPs IPv4 de la máquina (no loopback), privadas primero
            hostIP: null,   // IP principal que los alumnos deben usar para conectarse
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

    // Elige la IP principal para los alumnos: preferir la de red privada (LAN).
    static pickPrimaryIP (ips) {
        if (!Array.isArray(ips) || ips.length === 0) return null;
        const isPrivate = ip =>
            /^10\./.test(ip) ||
            /^192\.168\./.test(ip) ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
        return ips.find(isPrivate) || ips[0];
    }

    // Método de instancia: IP principal recomendada para los alumnos.
    primaryIP () {
        return ClassroomController.pickPrimaryIP(this.state.localIPs);
    }

    // Consulta las IPs IPv4 locales al backend Tauri (con caché).
    async getLocalIPs () {
        if (this._localIPs) return this._localIPs;
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                const ips = await window.__TAURI__.core.invoke('classroom_local_ip');
                this._localIPs = Array.isArray(ips) ? ips.filter(ip => typeof ip === 'string') : [];
            } else {
                // Sin Tauri (dev en navegador): no hay red LAN real.
                this._localIPs = [];
            }
        } catch (e) {
            trace('Sistema', 'getLocalIPs ERROR →', String(e));
            this._localIPs = [];
        }
        this._set({localIPs: this._localIPs, hostIP: ClassroomController.pickPrimaryIP(this._localIPs)});
        return this._localIPs;
    }

    // ───────────────────────────────────────────────────────────
    //  Host: iniciar servidor (Tauri) y conectar como servidor
    // ───────────────────────────────────────────────────────────
    async startHosting ({name, code, scope, maxConnections, purpose = 'programacion', port = DEFAULT_PORT}) {
        trace('Servidor', 'INICIAR SESIÓN', {name, code, scope, maxConnections, purpose, port});
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                try {
                    const result = await window.__TAURI__.core.invoke('classroom_start_server', {port});
                    trace('Servidor', 'relay classroom_start_server OK →', result);
                } catch (e) {
                    trace('Servidor', 'relay classroom_start_server ERROR →', String(e));
                    if (String(e).includes('ya está en ejecución')) {
                        // Relay obsoleto de una sesión anterior: detener y reintentar.
                        trace('Servidor', 'Relay obsoleto detectado: classroom_stop_server + reintento...');
                        await window.__TAURI__.core.invoke('classroom_stop_server');
                        const result2 = await window.__TAURI__.core.invoke('classroom_start_server', {port});
                        trace('Servidor', 'relay classroom_start_server (reintento) OK →', result2);
                    } else {
                        console.warn('[Classroom] Error iniciando servidor:', e);
                    }
                }
            } else {
                console.warn('[Classroom] Sin Tauri: no se puede iniciar el servidor local.');
                trace('Servidor', 'relay classroom_start_server NO EJECUTADO (sin Tauri)');
            }
        } catch (e) {
            console.warn('[Classroom] Error iniciando servidor (final):', e);
            trace('Servidor', 'relay classroom_start_server ERROR FINAL →', String(e));
        }

        this.hostAddress = `127.0.0.1:${port}`;
        const clientId = this._genId();
        await this.getLocalIPs(); // pobla localIPs y hostIP en el estado
        const hostIP = this.state.hostIP;
        trace('Servidor', 'Configurando estado host, clientId=', clientId, 'hostAddress=', this.hostAddress, 'hostIP=', hostIP);
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
            hostIP,
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
        trace('Cliente', 'UNIRSE A SESIÓN', {host, port, code, name, clientId});
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
        trace(identify.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente', `WebSocket conectando a ${url} (role=${identify.role})`);
        let ws;
        try {
            ws = new WebSocket(url);
        } catch (e) {
            console.warn('[Classroom] Error creando WebSocket:', e);
            this._set({connectionState: 'closed', error: `No se pudo conectar: ${e.message}`});
            return;
        }
        this.ws = ws;
        this._closing = false;

        ws.onopen = () => {
            trace(identify.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente', 'WebSocket ABIERTO', `url=${url} readyState=${ws.readyState}`);
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

        ws.onclose = (ev) => {
            trace(
                identify.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente',
                'WebSocket CERRADO',
                `code=${ev && ev.code} reason=${ev && ev.reason} wasClean=${ev && ev.wasClean}`
            );
            this._handleClose();
        };

        ws.onerror = (ev) => {
            console.warn(
                '[Classroom] WebSocket ERROR',
                identify.role,
                'url=', url,
                'readyState=', ws.readyState,
                'event=', ev && ev.type
            );
            if (!this._closing) this._set({error: 'Error de conexión.'});
        };
    }

    _send (obj) {
        const roleLabel = this.state.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente';
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            trace(roleLabel, 'ENVIAR', JSON.stringify(obj));
            this.ws.send(JSON.stringify(obj));
        } else {
            console.warn(
                '[Classroom] ENVÍO FALLIDO (socket no abierto)',
                `role=${this.state.role}`,
                `ws=${!!this.ws}`,
                `readyState=${this.ws ? this.ws.readyState : 'n/a'}`,
                JSON.stringify(obj)
            );
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
        const roleLabel = this.state.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente';
        trace(roleLabel, 'RECIBIDO', `type=${msg.type} state=${this.state.connectionState}`, raw);
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
            const config = this.state.config || {};
            const codeOK = !config || !config.code || msg.code === config.code;
            trace('Servidor',
                '📥 SOLICITUD DE INGRESO',
                `name="${msg.name}"`,
                `clientId=${msg.clientId}`,
                `code="${msg.code}" (esperado="${config.code}", coincide=${codeOK})`,
                `roster=${this.state.roster.length}/${config.maxConnections}`);
            if (this.state.roster.length >= config.maxConnections) {
                trace('Servidor', 'Solicitud RECHAZADA: sesión llena.');
                this._toClient(msg.clientId, {type: MSG.REQUEST_REJECTED, reason: 'Sesión llena.'});
                return;
            }
            const req = {id: msg.clientId, name: msg.name, requestedAt: Date.now()};
            trace('Servidor', 'Solicitud encolada en pendingQueue, total=', this.state.pendingQueue.length + 1);
            this._set({pendingQueue: [...this.state.pendingQueue, req]});
            break;
        }
        case MSG.LEAVE: {
            trace('Servidor', 'Cliente abandonó la sesión clientId=', msg.clientId);
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
            trace('Servidor', 'TARGET_UPDATE recibido', `clientId=${msg.clientId} inRoster=${inRoster} targets=${names}`);
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
            trace('Cliente', '✅ SOLICITUD ACEPTADA por el servidor', `color=${msg.color} roster=${(msg.roster || []).length}`);
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
            trace('Cliente', '❌ SOLICITUD RECHAZADA por el servidor', msg.reason);
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
            trace('Cliente', 'PROJECT_SNAPSHOT recibido del servidor', `targets=${names}`);
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
        if (!req) {
            trace('Servidor', 'Aceptar solicitud ignorada: no está en pendingQueue requestId=', requestId);
            return;
        }
        trace('Servidor', '✅ ACEPTAR solicitud', `name="${req.name}"`, `clientId=${req.id}`);
        const color = COLORS[this.state.roster.length % COLORS.length];
        const client = {id: req.id, name: req.name, role: ROLES.CLIENTE, color, connected: true};
        const roster = [...this.state.roster, client];
        this._set({roster, pendingQueue: this.state.pendingQueue.filter(r => r.id !== requestId)});
        trace('Servidor', 'Enviando REQUEST_ACCEPTED a', req.id, 'roster=', roster.length);
        this._toClient(req.id, {
            type: MSG.REQUEST_ACCEPTED,
            clientId: req.id,
            color,
            config: this.state.config,
            roster,
            assignments: this.state.assignments
        });
        trace('Servidor', 'Difundiendo ROSTER_UPDATED (', roster.length, 'participantes )');
        this._broadcast({type: MSG.ROSTER_UPDATED, roster});
        if (this.config.onClientAccepted) {
            trace('Servidor', 'Notificando onClientAccepted');
            this.config.onClientAccepted(client);
        }
    }

    rejectRequest (requestId) {
        const req = this.state.pendingQueue.find(r => r.id === requestId);
        if (!req) {
            trace('Servidor', 'Rechazar solicitud ignorada: no está en pendingQueue requestId=', requestId);
            return;
        }
        trace('Servidor', '❌ RECHAZAR solicitud', `name="${req.name}"`, `clientId=${req.id}`);
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
        trace(this.state.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente', 'sendProjectUpdate', `role=${this.state.role} targets=${names} pyCodes=${Object.keys(pythonCodes || {}).length}`);
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
        trace('Servidor', 'sendSnapshotToClient →', clientId, `pyCodes=${Object.keys(pythonCodes || {}).length}`);
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
        trace(this.state.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente', 'Salir de la sesión');
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
        const wasServer = this.state.role === ROLES.SERVIDOR;
        trace(wasServer ? 'Servidor' : 'Cliente', 'Sesión cerrada', message || '(por el usuario)');
        this._closing = true;
        this._teardownSocket();
        if (wasServer && typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
            // El relay es del host: detenerlo al terminar la sesión para que el
            // puerto quede libre y no quede un "relay fantasma" (bug: "ya está en ejecución").
            window.__TAURI__.core.invoke('classroom_stop_server').then(
                r => trace('Servidor', 'relay classroom_stop_server OK →', r),
                e => trace('Servidor', 'relay classroom_stop_server ERROR →', String(e))
            );
        }
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
        const roleLabel = this.state.role === ROLES.SERVIDOR ? 'Servidor' : 'Cliente';
        trace(roleLabel, 'WS_CLOSE', `state=${this.state.connectionState} closing=${this._closing}`);
        if (this._closing) {
            this._closing = false;
            return;
        }
        if (this.state.active && this.state.connectionState !== 'closed') {
            trace(roleLabel, 'Cerrando sesión por conexión perdida.');
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
        trace('Servidor', 'BROADCAST → todos los clientes', payload && payload.type);
        this._send({type: MSG.BROADCAST, payload});
    }

    _toClient (clientId, payload) {
        trace('Servidor', 'TO_CLIENT →', clientId, payload && payload.type);
        this._send({type: MSG.TO_CLIENT, clientId, payload});
    }

    _genId () {
        return `c-${Date.now().toString(36)}-${Math.random().toString(36)
            .slice(2, 10)}`;
    }
}

const classroomController = new ClassroomController();
export default classroomController;
