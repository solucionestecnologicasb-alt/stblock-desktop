const DEFAULT_POLICY_URL = 'https://github.com/solucionestecnologicasb-alt/stblock-releases/releases/latest/download/policy.json';
const POLICY_URL_STORAGE_KEY = 'stblock_update_policy_url';
const DISMISSED_VERSION_KEY = 'stblock_update_dismissed_version';

let pendingUpdate = null;

const isDesktopApp = () => typeof window !== 'undefined' && Boolean(window.__TAURI__);

const normalizeVersion = version => String(version || '0.0.0').replace(/^v/i, '').split(/[+-]/)[0];

const compareVersions = (a, b) => {
    const left = normalizeVersion(a).split('.').map(value => parseInt(value, 10) || 0);
    const right = normalizeVersion(b).split('.').map(value => parseInt(value, 10) || 0);
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i++) {
        const diff = (left[i] || 0) - (right[i] || 0);
        if (diff !== 0) return diff > 0 ? 1 : -1;
    }
    return 0;
};

const getCurrentVersion = async () => {
    if (!isDesktopApp()) return '0.0.0-dev';
    try {
        const app = await import('@tauri-apps/api/app');
        return await app.getVersion();
    } catch (_e) {
        return '0.0.0';
    }
};

const getPolicyUrl = () => {
    if (typeof window === 'undefined') return DEFAULT_POLICY_URL;
    try {
        return localStorage.getItem(POLICY_URL_STORAGE_KEY) || DEFAULT_POLICY_URL;
    } catch (_e) {
        return DEFAULT_POLICY_URL;
    }
};

const fetchPolicy = async () => {
    const url = getPolicyUrl();
    if (isDesktopApp()) {
        const tauri = await import('@tauri-apps/api/core');
        return tauri.invoke('fetch_update_policy', {url});
    }
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) {
        throw new Error(`No se pudo leer la política de actualización (${response.status})`);
    }
    return response.json();
};

const wasDismissed = version => {
    try {
        return sessionStorage.getItem(DISMISSED_VERSION_KEY) === normalizeVersion(version);
    } catch (_e) {
        return false;
    }
};

export const dismissRecommendedUpdate = version => {
    try {
        sessionStorage.setItem(DISMISSED_VERSION_KEY, normalizeVersion(version));
    } catch (_e) {
        // Best effort only.
    }
};

export const cleanSpanishText = text => {
    if (!text || typeof text !== 'string') return text;
    let s = text;
    try {
        if (/[\u00C0-\u00FF]/.test(s) && /[\u0080-\u00BF]/.test(s)) {
            const decoded = decodeURIComponent(escape(s));
            if (decoded && !decoded.includes('\uFFFD')) {
                s = decoded;
            }
        }
    } catch (_) {}

    return s
        .replace(/Ã¡/g, 'á').replace(/Ã/g, 'Á')
        .replace(/Ã©/g, 'é').replace(/Ã‰/g, 'É')
        .replace(/Ã­/g, 'í').replace(/Ã/g, 'Í')
        .replace(/Ã³/g, 'ó').replace(/Ã“/g, 'Ó')
        .replace(/Ãº/g, 'ú').replace(/Ãš/g, 'Ú')
        .replace(/Ã±/g, 'ñ').replace(/Ã‘/g, 'Ñ')
        .replace(/Actualizaci[\?oó\uFFFD]+n/gi, 'Actualización')
        .replace(/Versi[\?oó\uFFFD]+n/gi, 'Versión')
        .replace(/autom[\?aá\uFFFD]+ticas/gi, 'automáticas')
        .replace(/pol[\?ií\uFFFD]+tica/gi, 'política')
        .replace(/m[\?aá\uFFFD]+s/gi, 'más')
        .replace(/est[\?aá\uFFFD]+/gi, 'está')
        .replace(/despu[\?eé\uFFFD]+s/gi, 'después');
};

export const checkForSTBlockUpdates = async ({manual = false} = {}) => {
    if (!isDesktopApp()) {
        return {
            status: 'web-disabled',
            currentVersion: 'web',
            latestVersion: 'web',
            title: 'Actualizaciones de escritorio',
            message: 'Las actualizaciones automáticas solo aplican a la versión de escritorio.'
        };
    }
    const currentVersion = await getCurrentVersion();
    let policy = null;
    let policyError = null;
    let update = null;
    let updateError = null;

    try {
        policy = await fetchPolicy();
    } catch (e) {
        policyError = e;
    }

    if (isDesktopApp()) {
        try {
            const updater = await import('@tauri-apps/plugin-updater');
            update = await updater.check();
            pendingUpdate = update || null;
        } catch (e) {
            updateError = e;
            pendingUpdate = null;
        }
    }

    const latestVersion = normalizeVersion(
        (policy && (policy.latestVersion || policy.version)) ||
        (update && update.version) ||
        currentVersion
    );
    const minimumVersion = normalizeVersion(policy && policy.minimumVersion);
    const policyLevel = policy && policy.level === 'mandatory' ? 'mandatory' : 'recommended';
    const belowMinimum = minimumVersion !== '0.0.0' && compareVersions(currentVersion, minimumVersion) < 0;
    const newerByPolicy = compareVersions(latestVersion, currentVersion) > 0;
    const updateAvailable = Boolean(update) || newerByPolicy || belowMinimum;
    const mandatory = belowMinimum || policyLevel === 'mandatory';

    if (!manual && !mandatory && updateAvailable && wasDismissed(latestVersion)) {
        return {
            status: 'dismissed',
            currentVersion,
            latestVersion,
            mandatory: false
        };
    }

    if (!updateAvailable) {
        return {
            status: 'current',
            currentVersion,
            latestVersion,
            title: cleanSpanishText((policy && policy.title) || 'STBlock está actualizado'),
            message: cleanSpanishText((policy && policy.message) || 'Ya tienes instalada la versión más reciente disponible para este canal.'),
            policy,
            policyError: policyError ? cleanSpanishText(policyError.message) : null,
            updateError: updateError ? cleanSpanishText(updateError.message) : null
        };
    }

    const rawTitle = (policy && policy.title) || (mandatory ? 'Actualización obligatoria' : 'Actualización disponible');
    const rawMessage = (policy && policy.message) || 'Hay una nueva versión de STBlock disponible.';
    const rawNotes = (policy && (policy.notes || policy.body)) || (update && update.body) || '';

    return {
        status: 'available',
        currentVersion,
        latestVersion,
        mandatory,
        canInstall: Boolean(update),
        title: cleanSpanishText(rawTitle),
        message: cleanSpanishText(rawMessage),
        releaseUrl: policy && policy.releaseUrl,
        notes: cleanSpanishText(rawNotes),
        policy,
        policyError: policyError ? cleanSpanishText(policyError.message) : null,
        updateError: updateError ? cleanSpanishText(updateError.message) : null
    };
};

export const formatBytes = bytes => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
        const kb = bytes / 1024;
        return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
};

export const formatSpeed = bytesPerSec => {
    if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s';
    const mb = bytesPerSec / (1024 * 1024);
    if (mb >= 1) {
        return `${mb.toFixed(1)} MB/s`;
    }
    const kb = bytesPerSec / 1024;
    return `${kb.toFixed(0)} KB/s`;
};

export const formatEta = seconds => {
    if (!seconds || isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) return null;
    if (seconds < 60) {
        return `Quedan ~${Math.round(seconds)} s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `Quedan ~${mins}m ${secs}s`;
};

export const installPendingSTBlockUpdate = async onProgress => {
    let update = pendingUpdate;
    if (!update && isDesktopApp()) {
        try {
            const updater = await import('@tauri-apps/plugin-updater');
            update = await updater.check();
            pendingUpdate = update || null;
        } catch (_e) {
            // Error checked below
        }
    }

    if (!update) {
        throw new Error('No hay un paquete de actualización firmado disponible para instalar.');
    }

    let totalBytes = 0;
    let downloadedBytes = 0;
    let lastBytes = 0;
    let lastSpeedSampleTime = Date.now();
    let lastUiUpdateTime = 0;
    let smoothedSpeed = 0;

    const reportProgress = data => {
        if (typeof onProgress === 'function') {
            try {
                onProgress(data);
            } catch (err) {
                console.error('[STBlock Updater] Error in progress callback:', err);
            }
        }
    };

    reportProgress({
        stage: 'connecting',
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        downloadedFormatted: '0 MB',
        totalFormatted: 'Calculando...',
        speedFormatted: '--',
        etaFormatted: null,
        statusText: 'Conectando con el servidor de descargas...'
    });

    try {
        await update.downloadAndInstall(event => {
            if (event.event === 'Started') {
                totalBytes = (event.data && typeof event.data.contentLength === 'number') ?
                    event.data.contentLength : 0;
                lastSpeedSampleTime = Date.now();
                lastBytes = 0;
                reportProgress({
                    stage: 'downloading',
                    percent: 0,
                    downloadedBytes: 0,
                    totalBytes,
                    downloadedFormatted: '0 MB',
                    totalFormatted: totalBytes > 0 ? formatBytes(totalBytes) : 'Desconocido',
                    speedFormatted: 'Iniciando...',
                    etaFormatted: null,
                    statusText: 'Iniciando descarga...'
                });
            } else if (event.event === 'Progress') {
                const chunk = (event.data && typeof event.data.chunkLength === 'number') ?
                    event.data.chunkLength : 0;
                downloadedBytes += chunk;

                const now = Date.now();
                const elapsedSpeed = (now - lastSpeedSampleTime) / 1000;

                // Actualizar velocidad cada 300ms para amortiguar saltos
                if (elapsedSpeed >= 0.3) {
                    const bytesDiff = downloadedBytes - lastBytes;
                    const instantSpeed = elapsedSpeed > 0 ? (bytesDiff / elapsedSpeed) : 0;
                    smoothedSpeed = smoothedSpeed === 0 ?
                        instantSpeed :
                        (smoothedSpeed * 0.65 + instantSpeed * 0.35);
                    lastBytes = downloadedBytes;
                    lastSpeedSampleTime = now;
                }

                // Limitar actualizaciones de UI a ~8 veces por segundo para mantener React a 60fps
                if (now - lastUiUpdateTime >= 120) {
                    lastUiUpdateTime = now;

                    const percent = totalBytes > 0 ?
                        Math.min(99, Math.max(0, Math.round((downloadedBytes / totalBytes) * 100))) :
                        0;

                    const remainingBytes = totalBytes > downloadedBytes ? totalBytes - downloadedBytes : 0;
                    const etaSeconds = (smoothedSpeed > 0 && remainingBytes > 0) ?
                        (remainingBytes / smoothedSpeed) :
                        null;

                    reportProgress({
                        stage: 'downloading',
                        percent,
                        downloadedBytes,
                        totalBytes,
                        downloadedFormatted: formatBytes(downloadedBytes),
                        totalFormatted: totalBytes > 0 ? formatBytes(totalBytes) : 'Desconocido',
                        speedFormatted: formatSpeed(smoothedSpeed),
                        etaFormatted: formatEta(etaSeconds),
                        statusText: `Descargando actualización (${percent}%)...`
                    });
                }
            } else if (event.event === 'Finished') {
                reportProgress({
                    stage: 'installing',
                    percent: 100,
                    downloadedBytes: totalBytes || downloadedBytes,
                    totalBytes: totalBytes || downloadedBytes,
                    downloadedFormatted: formatBytes(totalBytes || downloadedBytes),
                    totalFormatted: formatBytes(totalBytes || downloadedBytes),
                    speedFormatted: 'Completado',
                    etaFormatted: null,
                    statusText: 'Descarga finalizada. Preparando instalación...'
                });
            }
        });
    } catch (err) {
        // Limpiar referencia para que el siguiente reintento pida una sesión limpia
        pendingUpdate = null;

        const rawMsg = err && err.message ? err.message : String(err);
        const lower = rawMsg.toLowerCase();
        let userMsg = rawMsg;

        if (
            lower.includes('connect') ||
            lower.includes('network') ||
            lower.includes('timed out') ||
            lower.includes('dns') ||
            lower.includes('unreachable') ||
            lower.includes('failed to send') ||
            lower.includes('tcp') ||
            lower.includes('socket') ||
            lower.includes('connection reset') ||
            lower.includes('broken pipe')
        ) {
            userMsg = 'Error de conexión: No se pudo conectar al servidor de descargas o la red se interrumpió. Comprueba tu conexión a internet e inténtalo de nuevo.';
        } else if (lower.includes('signature') || lower.includes('pubkey') || lower.includes('hash')) {
            userMsg = 'Error de seguridad: La firma digital de la actualización no es válida o no coincide.';
        } else if (lower.includes('permission') || lower.includes('access') || lower.includes('denied')) {
            userMsg = 'Error de permisos: El sistema no permitió guardar el instalador. Prueba ejecutando STBlock como Administrador.';
        } else if (lower.includes('space') || lower.includes('disk')) {
            userMsg = 'Error de espacio en disco: No hay suficiente espacio para descargar e instalar la nueva versión.';
        }

        const friendlyError = new Error(userMsg);
        friendlyError.originalError = err;
        throw friendlyError;
    }

    reportProgress({
        stage: 'restarting',
        percent: 100,
        downloadedBytes: totalBytes || downloadedBytes,
        totalBytes: totalBytes || downloadedBytes,
        downloadedFormatted: formatBytes(totalBytes || downloadedBytes),
        totalFormatted: formatBytes(totalBytes || downloadedBytes),
        speedFormatted: 'Listo',
        etaFormatted: null,
        statusText: 'Reiniciando STBlock...'
    });

    if (isDesktopApp()) {
        try {
            const tauri = await import('@tauri-apps/api/core');
            await tauri.invoke('prepare_for_update');
        } catch (_e) {
            // Ignorar si falla, el instalador NSIS tiene su propio kill de seguridad
        }
    }

    const process = await import('@tauri-apps/plugin-process');
    await process.relaunch();
};

/**
 * Cierra la aplicación. Se usa cuando hay una actualización obligatoria y el
 * usuario decide no instalarla: la app no debe seguir usándose en una versión
 * por debajo del mínimo permitido.
 */
export const exitSTBlockApp = async () => {
    if (!isDesktopApp()) return;
    const process = await import('@tauri-apps/plugin-process');
    await process.exit(0);
};

export const getUpdatePolicyUrl = getPolicyUrl;
export const UPDATE_POLICY_URL_STORAGE_KEY = POLICY_URL_STORAGE_KEY;
