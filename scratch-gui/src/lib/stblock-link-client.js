/**
 * STBlock Link Client
 *
 * Provides WebSocket communication with STBlock Link desktop application
 * for serial port access, compilation, and upload from web browsers.
 *
 * Protocol: JSON-RPC 2.0 over WebSocket
 * Ports: 20111 (HTTP) / 20113 (HTTPS)
 */

const STBLOCK_LINK_DOWNLOAD_URL = 'https://stbacademy.net/wp-content/plugins/bolt-page-plugin/assets/STBlock-Link.exe';

// Connection states
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

class STBlockLinkClient {
    constructor() {
        this._ws = null;
        this._requestID = 0;
        this._openRequests = {};
        this._connectionState = ConnectionState.DISCONNECTED;
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 3;
        this._reconnectDelay = 1000;

        // Event handlers
        this._onConnectionStateChange = null;
        this._onSerialData = null;
        this._onUploadStdout = null;
        this._onUploadError = null;
        this._onPeripheralList = null;
        this._onPeripheralUnplug = null;
    }

    /**
     * Get the WebSocket URL based on current protocol
     */
    static getWebSocketUrl(type = 'serialport') {
        const isHttps = typeof window !== 'undefined' &&
            window.location &&
            window.location.protocol === 'https:';
        const wsProtocol = isHttps ? 'wss:' : 'ws:';
        const wsPort = isHttps ? '20113' : '20111';
        return `${wsProtocol}//127.0.0.1:${wsPort}/openblock/${type}`;
    }

    /**
     * Get download URL for STBlock Link
     */
    static getDownloadUrl() {
        return STBLOCK_LINK_DOWNLOAD_URL;
    }

    /**
     * Check if STBlock Link is available by attempting a connection
     * @returns {Promise<boolean>} - true if available
     */
    static async isAvailable() {
        return new Promise(resolve => {
            const url = STBlockLinkClient.getWebSocketUrl('serialport');
            const ws = new WebSocket(url);
            const timeout = setTimeout(() => {
                ws.close();
                resolve(false);
            }, 2000);

            ws.onopen = () => {
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    }

    /**
     * Get current connection state
     */
    get connectionState() {
        return this._connectionState;
    }

    /**
     * Check if connected to STBlock Link
     */
    get isConnected() {
        return this._ws && this._ws.readyState === WebSocket.OPEN;
    }

    /**
     * Set connection state change handler
     */
    onConnectionStateChange(handler) {
        this._onConnectionStateChange = handler;
    }

    /**
     * Set serial data handler
     */
    onSerialData(handler) {
        this._onSerialData = handler;
    }

    /**
     * Set upload stdout handler
     */
    onUploadStdout(handler) {
        this._onUploadStdout = handler;
    }

    /**
     * Set upload error handler
     */
    onUploadError(handler) {
        this._onUploadError = handler;
    }

    /**
     * Set peripheral list handler
     */
    onPeripheralList(handler) {
        this._onPeripheralList = handler;
    }

    /**
     * Set peripheral unplug handler
     */
    onPeripheralUnplug(handler) {
        this._onPeripheralUnplug = handler;
    }

    /**
     * Connect to STBlock Link
     * @param {string} type - Connection type: 'serialport', 'ble', 'bt'
     * @returns {Promise<boolean>}
     */
    async connect(type = 'serialport') {
        if (this.isConnected) {
            return true;
        }

        this._setConnectionState(ConnectionState.CONNECTING);

        return new Promise((resolve, reject) => {
            const url = STBlockLinkClient.getWebSocketUrl(type);

            try {
                this._ws = new WebSocket(url);
            } catch (error) {
                this._setConnectionState(ConnectionState.ERROR);
                reject(new Error('Failed to create WebSocket connection'));
                return;
            }

            const timeout = setTimeout(() => {
                this._ws.close();
                this._setConnectionState(ConnectionState.ERROR);
                reject(new Error('Connection timeout'));
            }, 5000);

            this._ws.onopen = () => {
                clearTimeout(timeout);
                this._reconnectAttempts = 0;
                this._setConnectionState(ConnectionState.CONNECTED);
                resolve(true);
            };

            this._ws.onclose = () => {
                clearTimeout(timeout);
                this._setConnectionState(ConnectionState.DISCONNECTED);
                this._handleDisconnect();
            };

            this._ws.onerror = (error) => {
                clearTimeout(timeout);
                this._setConnectionState(ConnectionState.ERROR);
                reject(new Error('WebSocket error: STBlock Link may not be running'));
            };

            this._ws.onmessage = (event) => {
                this._handleMessage(event);
            };
        });
    }

    /**
     * Disconnect from STBlock Link
     */
    disconnect() {
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this._setConnectionState(ConnectionState.DISCONNECTED);
        this._openRequests = {};
    }

    /**
     * Discover available peripherals (serial ports)
     * @param {object} options - Discovery options
     * @returns {Promise<object>}
     */
    async discover(options = {}) {
        return this._sendRequest('discover', options);
    }

    /**
     * Connect to a peripheral
     * @param {string} peripheralId - The peripheral ID
     * @param {object} config - Connection configuration
     * @returns {Promise<object>}
     */
    async connectPeripheral(peripheralId, config = {}) {
        return this._sendRequest('connect', { peripheralId, peripheralConfig: config });
    }

    /**
     * Disconnect from peripheral
     * @returns {Promise<void>}
     */
    async disconnectPeripheral() {
        return this._sendRequest('disconnect');
    }

    /**
     * Write data to serial port
     * @param {string} message - Data to send
     * @param {string} encoding - Encoding type
     * @returns {Promise<object>}
     */
    async write(message, encoding = null) {
        const params = { message };
        if (encoding) {
            params.encoding = encoding;
        }
        return this._sendRequest('write', params);
    }

    /**
     * Update baud rate
     * @param {number} baudRate - New baud rate
     * @returns {Promise<object>}
     */
    async updateBaudrate(baudRate) {
        return this._sendRequest('updateBaudrate', { baudRate });
    }

    /**
     * Upload code to device
     * @param {string} code - Arduino code to compile and upload
     * @param {object} config - Device configuration (fqbn, etc.)
     * @param {object} library - Extension library if any
     * @returns {Promise<object>}
     */
    async upload(code, config, library = null) {
        const params = {
            message: code,
            config: {
                ...config,
                library
            }
        };
        return this._sendRequest('upload', params);
    }

    /**
     * Upload firmware to device
     * @param {object} config - Firmware configuration
     * @returns {Promise<object>}
     */
    async uploadFirmware(config) {
        return this._sendRequest('uploadFirmware', config);
    }

    /**
     * Abort current upload
     * @returns {Promise<object>}
     */
    async abortUpload() {
        return this._sendRequest('abortUpload');
    }

    /**
     * Send a JSON-RPC request
     * @private
     */
    _sendRequest(method, params) {
        if (!this.isConnected) {
            return Promise.reject(new Error('Not connected to STBlock Link'));
        }

        const requestID = this._requestID++;

        const promise = new Promise((resolve, reject) => {
            // Set timeout for request (longer timeout of 120 seconds for compilation and upload)
            const timeoutDuration = (method === 'upload' || method === 'uploadFirmware') ? 120000 : 30000;
            const timeout = setTimeout(() => {
                delete this._openRequests[requestID];
                reject(new Error(`Request timeout: ${method}`));
            }, timeoutDuration);

            this._openRequests[requestID] = { resolve, reject, timeout };
        });

        const request = {
            jsonrpc: '2.0',
            method,
            params,
            id: requestID
        };

        this._ws.send(JSON.stringify(request));

        return promise;
    }

    /**
     * Handle incoming WebSocket message
     * @private
     */
    _handleMessage(event) {
        let json;
        try {
            json = JSON.parse(event.data);
        } catch (error) {
            console.error('STBlockLinkClient: Invalid JSON message', error);
            return;
        }

        if (json.jsonrpc !== '2.0') {
            console.error('STBlockLinkClient: Bad JSON-RPC version', json);
            return;
        }

        // Check if it's a response to our request
        if (json.hasOwnProperty('id') && !json.hasOwnProperty('method')) {
            this._handleResponse(json);
        } else if (json.hasOwnProperty('method')) {
            // It's a notification/call from the server
            this._handleServerCall(json);
        }
    }

    /**
     * Handle response to our request
     * @private
     */
    _handleResponse(json) {
        const { id, result, error } = json;
        const request = this._openRequests[id];

        if (!request) {
            console.warn('STBlockLinkClient: Response for unknown request', id);
            return;
        }

        clearTimeout(request.timeout);
        delete this._openRequests[id];

        if (error) {
            request.reject(new Error(error.message || 'Unknown error'));
        } else {
            request.resolve(result);
        }
    }

    /**
     * Handle server-initiated calls/notifications
     * @private
     */
    _handleServerCall(json) {
        const { method, params } = json;

        switch (method) {
        case 'didDiscoverPeripheral':
            if (this._onPeripheralList) {
                this._onPeripheralList(params);
            }
            break;

        case 'onMessage':
            if (this._onSerialData) {
                this._onSerialData(params.message);
            }
            break;

        case 'uploadStdout':
            if (this._onUploadStdout) {
                this._onUploadStdout(params.message);
            }
            break;

        case 'uploadError':
            if (this._onUploadError) {
                this._onUploadError(params.message);
            }
            break;

        case 'peripheralUnplug':
            if (this._onPeripheralUnplug) {
                this._onPeripheralUnplug();
            }
            break;

        case 'connectError':
            console.error('STBlockLinkClient: Connect error', params.message);
            break;

        default:
            console.log('STBlockLinkClient: Unknown method', method, params);
        }
    }

    /**
     * Set connection state and notify handler
     * @private
     */
    _setConnectionState(state) {
        this._connectionState = state;
        if (this._onConnectionStateChange) {
            this._onConnectionStateChange(state);
        }
    }

    /**
     * Handle disconnect - attempt reconnection if appropriate
     * @private
     */
    _handleDisconnect() {
        // Reject all pending requests
        Object.values(this._openRequests).forEach(request => {
            clearTimeout(request.timeout);
            request.reject(new Error('Disconnected from STBlock Link'));
        });
        this._openRequests = {};
    }
}

// Singleton instance
let _instance = null;

/**
 * Get singleton instance of STBlockLinkClient
 */
const getSTBlockLinkClient = () => {
    if (!_instance) {
        _instance = new STBlockLinkClient();
    }
    return _instance;
};

export {
    STBlockLinkClient,
    getSTBlockLinkClient,
    ConnectionState,
    STBLOCK_LINK_DOWNLOAD_URL
};

export default STBlockLinkClient;
