/**
 * Arduino Uploader - Handles compilation and upload of Arduino code
 * Supports both Tauri (native desktop) and Web (via STBlock Link) environments
 */

import { STBlockLinkClient, getSTBlockLinkClient, STBLOCK_LINK_DOWNLOAD_URL } from './stblock-link-client';

/**
 * Check if running in Tauri environment
 * @returns {boolean}
 */
const isTauri = () => {
    return typeof window !== 'undefined' &&
           window.__TAURI__ !== undefined;
};

/**
 * Upload states
 */
const UploadState = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    COMPILING: 'compiling',
    UPLOADING: 'uploading',
    SUCCESS: 'success',
    ERROR: 'error'
};

/**
 * Environment types
 */
const Environment = {
    TAURI: 'tauri',
    WEB_STBLOCK_LINK: 'web_stblock_link',
    WEB_UNSUPPORTED: 'web_unsupported'
};

/**
 * Arduino Uploader Class
 * Manages the compilation and upload process for Arduino boards
 */
class ArduinoUploader {
    constructor () {
        this._state = UploadState.IDLE;
        this._progress = 0;
        this._message = '';
        this._logs = [];
        this._listeners = {};
        this._abortController = null;
        this._environment = null;
        this._stblockLinkClient = null;
    }

    /**
     * Get current state
     * @returns {string}
     */
    get state () {
        return this._state;
    }

    /**
     * Get current progress (0-100)
     * @returns {number}
     */
    get progress () {
        return this._progress;
    }

    /**
     * Get current message
     * @returns {string}
     */
    get message () {
        return this._message;
    }

    /**
     * Get compilation/upload logs
     * @returns {Array}
     */
    get logs () {
        return this._logs;
    }

    /**
     * Detect the current environment
     * @returns {Promise<string>}
     */
    async detectEnvironment () {
        // Check for Tauri first (desktop app)
        if (isTauri()) {
            this._environment = Environment.TAURI;
            return Environment.TAURI;
        }

        // Check for STBlock Link (web with external app)
        const stblockLinkAvailable = await STBlockLinkClient.isAvailable();
        if (stblockLinkAvailable) {
            this._environment = Environment.WEB_STBLOCK_LINK;
            return Environment.WEB_STBLOCK_LINK;
        }

        // Web without STBlock Link
        this._environment = Environment.WEB_UNSUPPORTED;
        return Environment.WEB_UNSUPPORTED;
    }

    /**
     * Get STBlock Link client instance
     * @returns {STBlockLinkClient}
     */
    getSTBlockLinkClient () {
        if (!this._stblockLinkClient) {
            this._stblockLinkClient = getSTBlockLinkClient();
        }
        return this._stblockLinkClient;
    }

    /**
     * Check if Arduino CLI is available
     * @returns {Promise<{available: boolean, version: string|null, path: string|null}>}
     */
    async checkArduinoCLI () {
        const env = await this.detectEnvironment();

        if (env === Environment.TAURI) {
            try {
                const { invoke } = window.__TAURI__.core;
                const result = await invoke('check_arduino_cli');
                return result;
            } catch (error) {
                return {
                    available: false,
                    version: null,
                    path: null,
                    error: error.toString()
                };
            }
        }

        if (env === Environment.WEB_STBLOCK_LINK) {
            // STBlock Link handles Arduino CLI internally
            return {
                available: true,
                version: 'STBlock Link',
                path: 'STBlock Link',
                error: null
            };
        }

        return {
            available: false,
            version: null,
            path: null,
            error: 'STBlock Link no está conectado. Descárgalo e inicia la aplicación.',
            downloadUrl: STBLOCK_LINK_DOWNLOAD_URL
        };
    }

    /**
     * Check if a board core is installed
     * @param {string} platform - Platform identifier (e.g., "arduino:avr")
     * @returns {Promise<boolean>}
     */
    async isCoreInstalled (platform) {
        const env = await this.detectEnvironment();

        if (env === Environment.TAURI) {
            try {
                const { invoke } = window.__TAURI__.core;
                return await invoke('is_arduino_core_installed', { platform });
            } catch (error) {
                console.error('Error checking core:', error);
                return false;
            }
        }

        // STBlock Link handles cores internally
        if (env === Environment.WEB_STBLOCK_LINK) {
            return true;
        }

        return false;
    }

    /**
     * Install a board core
     * @param {string} platform - Platform identifier
     * @param {function} onProgress - Progress callback
     * @returns {Promise<boolean>}
     */
    async installCore (platform, onProgress) {
        const env = await this.detectEnvironment();

        if (env === Environment.TAURI) {
            try {
                const { invoke } = window.__TAURI__.core;

                this._setState(UploadState.PREPARING, 'Instalando core de Arduino...');

                const result = await invoke('install_arduino_core', {
                    platform,
                    onProgress: progress => {
                        this._setProgress(progress);
                        if (onProgress) onProgress(progress);
                    }
                });

                return result;
            } catch (error) {
                this._setState(UploadState.ERROR, `Error instalando core: ${error}`);
                throw error;
            }
        }

        // STBlock Link handles core installation automatically
        if (env === Environment.WEB_STBLOCK_LINK) {
            return true;
        }

        throw new Error('La instalación de cores requiere STBlock Link o la aplicación de escritorio');
    }

    /**
     * Compile Arduino code
     * @param {string} code - Arduino C++ code
     * @param {Object} deviceProfile - Device profile with fqbn and platform
     * @param {function} onProgress - Progress callback
     * @returns {Promise<{success: boolean, hexPath: string|null, errors: string[]}>}
     */
    async compile (code, deviceProfile, onProgress) {
        const env = await this.detectEnvironment();

        if (!deviceProfile || !deviceProfile.fqbn) {
            throw new Error('Perfil de dispositivo inválido o sin FQBN');
        }

        this._logs = [];
        this._abortController = new AbortController();

        if (env === Environment.TAURI) {
            return this._compileTauri(code, deviceProfile, onProgress);
        }

        if (env === Environment.WEB_STBLOCK_LINK) {
            // STBlock Link compiles and uploads in one step
            // Return a placeholder for the compile step
            this._setState(UploadState.COMPILING, 'Preparando código...');
            this._setProgress(50);
            this._addLog('info', `Preparando para ${deviceProfile.name || deviceProfile.fqbn}...`);
            return { success: true, hexPath: null, usingSTBlockLink: true };
        }

        throw new Error('La compilación requiere STBlock Link. Descarga: ' + STBLOCK_LINK_DOWNLOAD_URL);
    }

    /**
     * Compile using Tauri (desktop)
     * @private
     */
    async _compileTauri (code, deviceProfile, onProgress) {
        try {
            this._setState(UploadState.COMPILING, 'Compilando código...');
            this._setProgress(0);
            this._addLog('info', `Compilando para ${deviceProfile.name || deviceProfile.fqbn}...`);

            const { invoke } = window.__TAURI__.core;

            // Create temporary sketch file
            const sketchName = `stblock_sketch_${Date.now()}`;

            const result = await invoke('compile_arduino_sketch', {
                code,
                fqbn: deviceProfile.fqbn,
                sketchName,
                onProgress: (progress, message) => {
                    this._setProgress(progress);
                    if (message) {
                        this._addLog('info', message);
                    }
                    if (onProgress) onProgress(progress, message);
                }
            });

            if (result.success) {
                this._addLog('success', 'Compilación exitosa!');
                this._setProgress(100);
                return result;
            } else {
                this._addLog('error', result.error || 'Error de compilación');
                this._setState(UploadState.ERROR, result.error || 'Error de compilación');
                return result;
            }

        } catch (error) {
            this._addLog('error', `Error: ${error}`);
            this._setState(UploadState.ERROR, error.toString());
            throw error;
        }
    }

    /**
     * Upload compiled code to device
     * @param {string} hexPath - Path to compiled .hex file
     * @param {string} port - Serial port name
     * @param {Object} deviceProfile - Device profile
     * @param {function} onProgress - Progress callback
     * @returns {Promise<{success: boolean, error: string|null}>}
     */
    async upload (hexPath, port, deviceProfile, onProgress) {
        const env = await this.detectEnvironment();

        if (!port) {
            throw new Error('No hay puerto seleccionado');
        }

        if (env === Environment.TAURI) {
            return this._uploadTauri(hexPath, port, deviceProfile, onProgress);
        }

        // This shouldn't be called directly for STBlock Link
        // as it uses compileAndUpload
        throw new Error('Use compileAndUpload para STBlock Link');
    }

    /**
     * Upload using Tauri (desktop)
     * @private
     */
    async _uploadTauri (hexPath, port, deviceProfile, onProgress) {
        try {
            this._setState(UploadState.UPLOADING, 'Subiendo código al dispositivo...');
            this._setProgress(0);
            this._addLog('info', `Subiendo a ${port}...`);

            const { invoke } = window.__TAURI__.core;

            const result = await invoke('upload_arduino_sketch', {
                hexPath,
                port,
                fqbn: deviceProfile.fqbn,
                onProgress: (progress, message) => {
                    this._setProgress(progress);
                    if (message) {
                        this._addLog('info', message);
                    }
                    if (onProgress) onProgress(progress, message);
                }
            });

            if (result.success) {
                this._addLog('success', 'Subida exitosa!');
                this._setState(UploadState.SUCCESS, 'Código subido correctamente');
                return result;
            } else {
                this._addLog('error', result.error || 'Error de subida');
                this._setState(UploadState.ERROR, result.error || 'Error de subida');
                return result;
            }

        } catch (error) {
            this._addLog('error', `Error: ${error}`);
            this._setState(UploadState.ERROR, error.toString());
            throw error;
        }
    }

    /**
     * Upload using STBlock Link (web)
     * @private
     */
    async _uploadSTBlockLink (code, port, deviceProfile, onProgress) {
        const client = this.getSTBlockLinkClient();

        try {
            // Connect to STBlock Link if not connected
            if (!client.isConnected) {
                this._setState(UploadState.PREPARING, 'Conectando a STBlock Link...');
                this._addLog('info', 'Conectando a STBlock Link...');
                await client.connect('serialport');
            }

            // Set up event handlers
            client.onUploadStdout(message => {
                this._addLog('info', message);
            });

            client.onUploadError(message => {
                this._addLog('error', message);
            });

            this._setState(UploadState.COMPILING, 'Compilando y subiendo...');
            this._setProgress(10);
            this._addLog('info', `Enviando código a STBlock Link para ${deviceProfile.name}...`);

            // Prepare config for STBlock Link (using deviceId/type compat fields for STBlock Link)
            const config = {
                board: deviceProfile.fqbn,
                fqbn: deviceProfile.fqbn,
                type: deviceProfile.type || 'arduino',
                deviceId: deviceProfile.deviceId || deviceProfile.id,
                port: port,
                // Additional options from device profile
                programMode: deviceProfile.programMode,
                program: deviceProfile.program
            };

            // Upload through STBlock Link (compiles and uploads)
            const result = await client.upload(code, config);

            if (result && !result.error) {
                this._addLog('success', 'Código subido correctamente!');
                this._setState(UploadState.SUCCESS, 'Código subido correctamente');
                this._setProgress(100);
                if (onProgress) onProgress(100, 'Completado');
                return { success: true };
            } else {
                const errorMsg = result?.error || 'Error desconocido';
                this._addLog('error', errorMsg);
                this._setState(UploadState.ERROR, errorMsg);
                return { success: false, error: errorMsg };
            }

        } catch (error) {
            this._addLog('error', `Error: ${error.message}`);
            this._setState(UploadState.ERROR, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Compile and upload in one step
     * @param {string} code - Arduino code
     * @param {string} port - Serial port
     * @param {Object} deviceProfile - Device profile
     * @param {function} onProgress - Progress callback
     * @returns {Promise<{success: boolean, error: string|null}>}
     */
    async compileAndUpload (code, port, deviceProfile, onProgress) {
        this._logs = [];
        const env = await this.detectEnvironment();

        // Extract clean COM port if it has display name, e.g. "CH340 (COM6)" -> "COM6"
        let cleanPort = port;
        if (port && typeof port === 'string') {
            const match = port.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                cleanPort = match[1];
            }
        }

        // Web with STBlock Link
        if (env === Environment.WEB_STBLOCK_LINK) {
            return this._uploadSTBlockLink(code, cleanPort, deviceProfile, onProgress);
        }

        // Tauri (desktop) - use the full compile then upload flow
        if (env === Environment.TAURI) {
            try {
                // Check Arduino CLI
                const cliCheck = await this.checkArduinoCLI();
                if (!cliCheck.available) {
                    throw new Error(cliCheck.error || 'Arduino CLI no está instalado');
                }

                // Check if core is installed
                const coreInstalled = await this.isCoreInstalled(deviceProfile.platform);
                if (!coreInstalled) {
                    this._addLog('warning', `Core ${deviceProfile.platform} no instalado. Instalando...`);
                    await this.installCore(deviceProfile.platform, progress => {
                        if (onProgress) onProgress(progress * 0.1, 'Instalando core...');
                    });
                }

                // Compile
                const compileResult = await this.compile(code, deviceProfile, (progress, message) => {
                    // Compile is 10-60% of total progress
                    if (onProgress) onProgress(10 + progress * 0.5, message);
                });

                if (!compileResult.success) {
                    return compileResult;
                }

                // Upload
                const uploadResult = await this.upload(
                    compileResult.hexPath,
                    cleanPort,
                    deviceProfile,
                    (progress, message) => {
                        // Upload is 60-100% of total progress
                        if (onProgress) onProgress(60 + progress * 0.4, message);
                    }
                );

                return uploadResult;

            } catch (error) {
                this._setState(UploadState.ERROR, error.toString());
                return { success: false, error: error.toString() };
            }
        }

        // Web without STBlock Link
        return {
            success: false,
            error: 'STBlock Link no está disponible',
            requiresSTBlockLink: true,
            downloadUrl: STBLOCK_LINK_DOWNLOAD_URL
        };
    }

    /**
     * Abort current operation
     */
    abort () {
        if (this._abortController) {
            this._abortController.abort();
        }

        // Try to abort STBlock Link upload if connected
        if (this._environment === Environment.WEB_STBLOCK_LINK && this._stblockLinkClient) {
            this._stblockLinkClient.abortUpload().catch(() => {});
        }

        this._setState(UploadState.IDLE, 'Operación cancelada');
    }

    /**
     * Reset uploader state
     */
    reset () {
        this._state = UploadState.IDLE;
        this._progress = 0;
        this._message = '';
        this._logs = [];
        this.emit('reset');
    }

    // Internal methods

    _setState (state, message = '') {
        this._state = state;
        this._message = message;
        this.emit('stateChange', { state, message });
    }

    _setProgress (progress) {
        this._progress = Math.min(100, Math.max(0, progress));
        this.emit('progress', this._progress);
    }

    _addLog (type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const log = { type, message, timestamp };
        this._logs.push(log);
        this.emit('log', log);
    }

    // Event emitter methods

    on (event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }

    off (event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
    }

    emit (event, ...args) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(...args));
        }
    }

    /**
     * Check if upload is supported in current environment
     * @returns {Promise<boolean>}
     */
    static async isSupported () {
        // Desktop Tauri
        if (isTauri()) {
            return true;
        }

        // Web with STBlock Link
        const stblockLinkAvailable = await STBlockLinkClient.isAvailable();
        return stblockLinkAvailable;
    }

    /**
     * Synchronous check for basic support (for UI rendering)
     * Returns true if Tauri, or unknown for web (need async check)
     * @returns {boolean|null} - true if Tauri, null if needs async check
     */
    static isSupportedSync () {
        if (isTauri()) {
            return true;
        }
        // Web needs async check
        return null;
    }

    /**
     * Get environment information
     * @returns {Promise<{type: string, supported: boolean, downloadUrl: string|null}>}
     */
    static async getEnvironmentInfo () {
        if (isTauri()) {
            return {
                type: Environment.TAURI,
                supported: true,
                downloadUrl: null
            };
        }

        const stblockLinkAvailable = await STBlockLinkClient.isAvailable();
        if (stblockLinkAvailable) {
            return {
                type: Environment.WEB_STBLOCK_LINK,
                supported: true,
                downloadUrl: null
            };
        }

        return {
            type: Environment.WEB_UNSUPPORTED,
            supported: false,
            downloadUrl: STBLOCK_LINK_DOWNLOAD_URL
        };
    }

    /**
     * Get a human-readable error message
     * @param {string} error - Error string
     * @returns {string}
     */
    static getErrorMessage (error) {
        const errorMap = {
            'Arduino CLI not found': 'Arduino CLI no está instalado. Por favor, instálalo desde arduino.cc/cli',
            'Board not found': 'No se encontró la placa. Verifica la conexión.',
            'Port busy': 'El puerto está ocupado. Cierra otras aplicaciones que lo estén usando.',
            'Compilation failed': 'Error de compilación. Revisa el código.',
            'Upload failed': 'Error al subir. Verifica la conexión y el puerto.',
            'Permission denied': 'Permiso denegado. Ejecuta la aplicación con permisos de administrador.',
            'Timeout': 'Tiempo de espera agotado. Intenta de nuevo.',
            'STBlock Link no está conectado': 'STBlock Link no está ejecutándose. Descarga e inicia la aplicación.',
            'Not connected to STBlock Link': 'No conectado a STBlock Link. Inicia la aplicación.'
        };

        for (const [key, msg] of Object.entries(errorMap)) {
            if (error.includes(key)) {
                return msg;
            }
        }

        return error;
    }

    /**
     * Get STBlock Link download URL
     * @returns {string}
     */
    static getSTBlockLinkDownloadUrl () {
        return STBLOCK_LINK_DOWNLOAD_URL;
    }
}

export { ArduinoUploader, UploadState, Environment, STBLOCK_LINK_DOWNLOAD_URL };
export default ArduinoUploader;
