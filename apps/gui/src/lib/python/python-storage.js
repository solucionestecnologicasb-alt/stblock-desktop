/**
 * STBlock - Persistencia del Panel Python
 *
 * Guarda y restaura el estado del panel Python en localStorage
 */

const STORAGE_KEYS = {
    PANEL_OPEN: 'stblock_python_panel_open',
    PANEL_LOCKED: 'stblock_python_panel_locked',
    CUSTOM_CODE: 'stblock_python_custom_code',
    LAST_GENERATED_CODE: 'stblock_python_last_generated',
    PREFERENCES: 'stblock_python_preferences'
};

/**
 * Guarda el estado del panel Python
 */
export function savePanelState(state) {
    try {
        if (typeof state.isOpen !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.PANEL_OPEN, JSON.stringify(state.isOpen));
        }
        if (typeof state.isLocked !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.PANEL_LOCKED, JSON.stringify(state.isLocked));
        }
        if (typeof state.customCode !== 'undefined' && state.customCode) {
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CODE, state.customCode);
        }
        if (typeof state.lastGeneratedCode !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.LAST_GENERATED_CODE, state.lastGeneratedCode);
        }
        return true;
    } catch (error) {
        console.warn('Error guardando estado del panel Python:', error);
        return false;
    }
}

/**
 * Restaura el estado del panel Python
 */
export function loadPanelState() {
    try {
        const isOpen = localStorage.getItem(STORAGE_KEYS.PANEL_OPEN);
        const isLocked = localStorage.getItem(STORAGE_KEYS.PANEL_LOCKED);
        const customCode = localStorage.getItem(STORAGE_KEYS.CUSTOM_CODE);
        const lastGeneratedCode = localStorage.getItem(STORAGE_KEYS.LAST_GENERATED_CODE);

        return {
            isOpen: isOpen ? JSON.parse(isOpen) : false,
            isLocked: isLocked ? JSON.parse(isLocked) : true,
            customCode: customCode || '',
            lastGeneratedCode: lastGeneratedCode || ''
        };
    } catch (error) {
        console.warn('Error cargando estado del panel Python:', error);
        return {
            isOpen: false,
            isLocked: true,
            customCode: '',
            lastGeneratedCode: ''
        };
    }
}

/**
 * Limpia el estado guardado (para nuevo proyecto)
 */
export function clearPanelState() {
    try {
        localStorage.removeItem(STORAGE_KEYS.PANEL_OPEN);
        localStorage.removeItem(STORAGE_KEYS.PANEL_LOCKED);
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_CODE);
        localStorage.removeItem(STORAGE_KEYS.LAST_GENERATED_CODE);
        return true;
    } catch (error) {
        console.warn('Error limpiando estado del panel Python:', error);
        return false;
    }
}

/**
 * Guarda preferencias del usuario (tema, tamaño de fuente, etc.)
 */
export function savePreferences(prefs) {
    try {
        const existing = loadPreferences();
        const merged = { ...existing, ...prefs };
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(merged));
        return true;
    } catch (error) {
        console.warn('Error guardando preferencias Python:', error);
        return false;
    }
}

/**
 * Carga preferencias del usuario
 */
export function loadPreferences() {
    try {
        const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        return prefs ? JSON.parse(prefs) : {
            fontSize: 14,
            showLineNumbers: true,
            autoSync: false
        };
    } catch (error) {
        return {
            fontSize: 14,
            showLineNumbers: true,
            autoSync: false
        };
    }
}

/**
 * Exporta datos de Python para incluir en proyecto .flynt
 */
export function exportPythonData() {
    const state = loadPanelState();
    const prefs = loadPreferences();

    return {
        panelState: state,
        preferences: prefs,
        version: '1.0'
    };
}

/**
 * Importa datos de Python desde proyecto .flynt
 */
export function importPythonData(data) {
    if (!data || !data.panelState) {
        return false;
    }

    try {
        savePanelState(data.panelState);
        if (data.preferences) {
            savePreferences(data.preferences);
        }
        return true;
    } catch (error) {
        console.warn('Error importando datos Python:', error);
        return false;
    }
}

export default {
    savePanelState,
    loadPanelState,
    clearPanelState,
    savePreferences,
    loadPreferences,
    exportPythonData,
    importPythonData,
    STORAGE_KEYS
};
