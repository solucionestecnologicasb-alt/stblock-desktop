/**
 * Reglas de permisos del Modo Aula (funciones puras).
 *
 * Roles: servidor (anfitrión), supervisor (ayudante), cliente (estudiante).
 * Un recurso (sprite/fondo) es editable solo por su dueño; el servidor y el
 * supervisor pueden editar cualquier recurso. Fuera de sesión todo está permitido.
 */

export const ROLES = {
    SERVIDOR: 'servidor',
    SUPERVISOR: 'supervisor',
    CLIENTE: 'cliente'
};

export const SCOPES = {
    BLOQUES: 'bloques',
    PYTHON: 'python',
    AMBOS: 'ambos'
};

/**
 * ¿Está activa una sesión de Modo Aula?
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si el rol pertenece a una sesión activa.
 */
export const isInSession = role => role === ROLES.SERVIDOR || role === ROLES.SUPERVISOR || role === ROLES.CLIENTE;

/**
 * ¿El rol puede editar un recurso? (Fuera de sesión: siempre sí.)
 *
 * Las asignaciones están indexadas por el NOMBRE del recurso (no por su id):
 * el id de un target se regenera al cargar un proyecto, así que no es estable
 * entre el servidor y los clientes. El nombre sí se preserva en la
 * serialización/deserialización del proyecto.
 *
 * @param {string} role - Rol del participante.
 * @param {object} assignments - Mapa nombreDelRecurso → clientId del dueño.
 * @param {string} targetName - Nombre del recurso.
 * @param {string} myId - Identificador del participante actual.
 * @returns {boolean} true si puede editar el recurso.
 */
export const canEditTarget = (role, assignments, targetName, myId) => {
    if (!isInSession(role)) return true;
    if (role === ROLES.SERVIDOR || role === ROLES.SUPERVISOR) return true;
    // Cliente estándar: solo los recursos que se le asignaron.
    return assignments[targetName] === myId;
};

/**
 * ¿Puede crear/duplicar recursos? (Servidor y supervisor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede añadir recursos.
 */
export const canAddTarget = role => {
    if (!isInSession(role)) return true;
    return role === ROLES.SERVIDOR || role === ROLES.SUPERVISOR;
};

/**
 * ¿Puede eliminar recursos? (Solo servidor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede eliminar recursos.
 */
export const canDeleteTarget = role => {
    if (!isInSession(role)) return true;
    return role === ROLES.SERVIDOR;
};

/**
 * ¿Puede renombrar recursos? (Solo servidor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede renombrar recursos.
 */
export const canRenameTarget = role => {
    if (!isInSession(role)) return true;
    return role === ROLES.SERVIDOR;
};

/**
 * ¿Puede asignar recursos? (Solo servidor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede asignar recursos.
 */
export const canAssignTarget = role => role === ROLES.SERVIDOR;

/**
 * ¿Puede aceptar/rechazar solicitudes de ingreso? (Solo servidor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede aceptar solicitudes.
 */
export const canAcceptRequests = role => role === ROLES.SERVIDOR;

/**
 * ¿Puede ejecutar la clase (proyecto combinado)? (Solo servidor.)
 * @param {string} role - Rol del participante.
 * @returns {boolean} true si puede ejecutar la clase.
 */
export const canRunClass = role => role === ROLES.SERVIDOR;

/**
 * El directorio de la sesión lo ven todos.
 * @returns {boolean} siempre true.
 */
export const canSeeRoster = () => true;

/**
 * Alcance de programación: ¿se puede usar Python?
 * @param {string} scope - Alcance configurado de la sesión.
 * @returns {boolean} true si Python está permitido.
 */
export const canUsePython = scope => scope === SCOPES.PYTHON || scope === SCOPES.AMBOS;

/**
 * Alcance de programación: ¿se puede usar bloques?
 * @param {string} scope - Alcance configurado de la sesión.
 * @returns {boolean} true si los bloques están permitidos.
 */
export const canUseBlocks = scope => scope === SCOPES.BLOQUES || scope === SCOPES.AMBOS;
