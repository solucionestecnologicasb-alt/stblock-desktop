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
            title: 'STBlock está actualizado',
            message: 'Ya tienes instalada la versión más reciente disponible para este canal.',
            policy,
            policyError: policyError ? policyError.message : null,
            updateError: updateError ? updateError.message : null
        };
    }

    return {
        status: 'available',
        currentVersion,
        latestVersion,
        mandatory,
        canInstall: Boolean(update),
        title: (policy && policy.title) || (mandatory ? 'Actualización obligatoria' : 'Actualización disponible'),
        message: (policy && policy.message) || 'Hay una nueva versión de STBlock disponible.',
        releaseUrl: policy && policy.releaseUrl,
        notes: (policy && (policy.notes || policy.body)) || (update && update.body) || '',
        policy,
        policyError: policyError ? policyError.message : null,
        updateError: updateError ? updateError.message : null
    };
};

export const installPendingSTBlockUpdate = async () => {
    if (!pendingUpdate) {
        throw new Error('No hay un paquete de actualización firmado disponible para instalar.');
    }
    await pendingUpdate.downloadAndInstall();
    const process = await import('@tauri-apps/plugin-process');
    await process.relaunch();
};

export const getUpdatePolicyUrl = getPolicyUrl;
export const UPDATE_POLICY_URL_STORAGE_KEY = POLICY_URL_STORAGE_KEY;
