import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, intlShape, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import log from '../lib/log';
import sharedMessages from './shared-messages';

import {
    LoadingStates,
    getIsLoadingUpload,
    getIsShowingWithoutId,
    onLoadedProject,
    requestProjectUpload
} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
import {
    openLoadingProject,
    closeLoadingProject
} from '../reducers/modals';
import {
    closeFileMenu
} from '../reducers/menus';
import {
    saveDeviceProject,
    setCodeViewContent,
    appendTerminalOutput,
    restoreDeviceState,
    setCircuitData,
    setCircuit3dData,
    clearCircuit3dData,
    setSketchforgeData
} from '../reducers/device-mode';

const messages = defineMessages({
    emptyProjectError: {
        id: 'gui.projectLoader.emptyProjectError',
        defaultMessage: 'The selected project file is empty. Save the project again and select the new file.',
        description: 'An error that displays when a selected local project file has zero bytes.'
    },
    loadError: {
        id: 'gui.projectLoader.loadError',
        defaultMessage: 'The project file that was selected failed to load.',
        description: 'An error that displays when a local project file fails to load.'
    }
});

/**
 * Higher Order Component to provide behavior for loading local project files into editor.
 * @param {React.Component} WrappedComponent the component to add project file loading functionality to
 * @returns {React.Component} WrappedComponent with project file loading functionality added
 *
 * <SBFileUploaderHOC>
 *     <WrappedComponent />
 * </SBFileUploaderHOC>
 */
const SBFileUploaderHOC = function (WrappedComponent) {
    class SBFileUploaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'createFileObjects',
                'getProjectTitleFromFilename',
                'handleFinishedLoadingUpload',
                'handleStartSelectingFileUpload',
                'handleChange',
                'onload',
                'loadBuffer',
                'removeFileObjects'
            ]);
        }
        componentDidMount () {
            if (typeof window !== 'undefined') {
                window.stblockLoadProjectFromBase64 = (filename, base64) => {
                    if (window.__stbLog) {
                        window.__stbLog('INFO', `[Uploader] stblockLoadProjectFromBase64 recibido: "${filename}", base64 len: ${base64 ? base64.length : 0}`);
                    }
                    try {
                        const binaryString = window.atob(base64);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        if (window.__stbLog) {
                            window.__stbLog('INFO', `[Uploader] Base64 decodificado correctamente. Buffer: ${bytes.buffer.byteLength} bytes. Llamando a loadBuffer...`);
                        }
                        this.loadBuffer(bytes.buffer, filename);
                    } catch (e) {
                        if (window.__stbLog) {
                            window.__stbLog('ERROR', `[Uploader] Error al decodificar base64: ${e.message}`, e.stack);
                        }
                        console.error('Error al decodificar proyecto:', e);
                        alert('Error al leer el proyecto seleccionado: ' + (e.message || e));
                        try {
                            this.props.onLoadingFinished(this.props.loadingState, false);
                        } catch (_) {}
                    }
                };
            }
        }
        componentDidUpdate (prevProps) {
            if (this.props.isLoadingUpload && !prevProps.isLoadingUpload) {
                this.handleFinishedLoadingUpload(); // cue step 5 below
            }
        }
        componentWillUnmount () {
            if (typeof window !== 'undefined' && window.stblockLoadProjectFromBase64) {
                delete window.stblockLoadProjectFromBase64;
            }
            this.removeFileObjects();
        }
        // step 1: this is where the upload process begins
        handleStartSelectingFileUpload () {
            this.createFileObjects(); // go to step 2
        }
        // step 2: create a FileReader and an <input> element, and issue a
        // pseudo-click to it. That will open the file chooser dialog.
        createFileObjects () {
            // redo step 7, in case it got skipped last time and its objects are
            // still in memory
            this.removeFileObjects();
            // create fileReader
            this.fileReader = new FileReader();
            this.fileReader.onload = this.onload;
            this.fileReader.onerror = () => {
                log.warn('FileReader error on upload');
                this.props.onLoadingFinished(this.props.loadingState, false);
                this.removeFileObjects();
            };
            this.fileReader.onabort = () => {
                this.props.onLoadingFinished(this.props.loadingState, false);
                this.removeFileObjects();
            };
            // create <input> element and add it to DOM
            this.inputElement = document.createElement('input');
            this.inputElement.accept = '.sb,.sb2,.sb3,.flynt,*/*';
            this.inputElement.style.display = 'none';
            this.inputElement.type = 'file';
            this.inputElement.onchange = this.handleChange; // connects to step 3
            document.body.appendChild(this.inputElement);
            // simulate a click to open file chooser dialog
            this.inputElement.click();
        }
        // step 3: user has picked a file using the file chooser dialog.
        // We don't actually load the file here, we only decide whether to do so.
        async handleChange (e) {
            const {
                intl,
                isShowingWithoutId,
                loadingState,
                projectChanged,
                userOwnsProject
            } = this.props;
            const thisFileInput = e.target;
            if (thisFileInput.files && thisFileInput.files.length > 0) {
                this.fileToUpload = thisFileInput.files[0];
                if (this.fileToUpload.size === 0) {
                    try {
                        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                            window.alert(intl.formatMessage(messages.emptyProjectError));
                        }
                    } catch (err) {}
                    this.props.closeFileMenu();
                    this.removeFileObjects();
                    return;
                }

                // If user owns the project, or user has changed the project,
                // we must confirm with the user that they really intend to
                // replace it. (If they don't own the project and haven't
                // changed it, no need to confirm.)
                let uploadAllowed = true;
                if (userOwnsProject || (projectChanged.changed && isShowingWithoutId)) {
                    const confirmMsg = intl.formatMessage(sharedMessages.replaceProjectWarning);
                    try {
                        if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
                            try {
                                const { confirm: tauriConfirm } = await import('@tauri-apps/plugin-dialog');
                                uploadAllowed = await tauriConfirm(confirmMsg, {
                                    title: 'STBlock',
                                    kind: 'warning'
                                });
                            } catch (e) {
                                uploadAllowed = true;
                            }
                        } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                            const res = window.confirm(confirmMsg);
                            if (res instanceof Promise) {
                                uploadAllowed = await res.catch(() => true);
                            } else {
                                uploadAllowed = Boolean(res);
                            }
                        }
                    } catch (err) {
                        uploadAllowed = true;
                    }
                }
                if (uploadAllowed) {
                    // cues step 4
                    this.props.requestProjectUpload(loadingState);
                } else {
                    // skips ahead to step 7
                    this.removeFileObjects();
                }
                this.props.closeFileMenu();
            } else {
                this.removeFileObjects();
            }
        }
        // step 4 is below, in mapDispatchToProps

        // step 5: called from componentDidUpdate when project state shows
        // that project data has finished "uploading" into the browser
        handleFinishedLoadingUpload () {
            if (this.fileToUpload && this.fileReader) {
                // begin to read data from the file. When finished,
                // cues step 6 using the reader's onload callback
                this.fileReader.readAsArrayBuffer(this.fileToUpload);
            } else {
                this.props.cancelFileUpload(this.props.loadingState);
                // skip ahead to step 7
                this.removeFileObjects();
            }
        }
        // used in step 6 below
        getProjectTitleFromFilename (fileInputFilename) {
            if (!fileInputFilename) return '';
            // only parse title with valid scratch project extensions
            // (.sb, .sb2, .sb3, and .flynt)
            const matches = fileInputFilename.match(/^(.*)\.(?:sb[23]?|flynt)$/);
            if (!matches) return '';
            return matches[1].substring(0, 100); // truncate project title to max 100 chars
        }
        // step 6: attached as a handler on our FileReader object; called when
        // file upload raw data is available in the reader
        onload () {
            if (this.fileReader) {
                var buffer = this.fileReader.result;
                var filename = this.fileToUpload && this.fileToUpload.name;
                this.loadBuffer(buffer, filename);
            }
        }
        async loadBuffer (buffer, filename) {
            const self = this;
            if (window.__stbLog) {
                window.__stbLog('INFO', `[Uploader] loadBuffer iniciado: "${filename || 'proyecto'}", buffer: ${buffer ? buffer.byteLength : 0} bytes`);
            }
            if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
                if (window.__stbLog) {
                    window.__stbLog('ERROR', '[Uploader] Buffer inválido o vacío');
                }
                self.props.onLoadingStarted();
                try {
                    alert(self.props.intl.formatMessage(messages.emptyProjectError)); // eslint-disable-line no-alert
                } catch (_) {}
                self.props.onLoadingFinished(self.props.loadingState, false);
                self.removeFileObjects();
                return;
            }

            self.props.onLoadingStarted();
            if (window.__stbLog) {
                window.__stbLog('INFO', `[Uploader] onLoadingStarted() ejecutado. loadingState="${self.props.loadingState}"`);
            }
            let loadingSuccess = false;

            // Failsafe timer: garantiza que la pantalla de carga no quede bloqueada indefinidamente
            const failsafeTimer = setTimeout(() => {
                if (window.__stbLog) {
                    window.__stbLog('WARN', '[Uploader] Failsafe timer (12s) activado: forzando fin de carga');
                }
                try {
                    self.props.onLoadingFinished(self.props.loadingState, false);
                } catch (_) {}
            }, 12000);

            try {
                let aiData = null;
                let deviceData = null;
                let sketchforgeData = null;
                let pythonData = null;

                const VMClass = self.props.vm && self.props.vm.constructor;
                if (VMClass) {
                    if (typeof VMClass.extractFlyntAll === 'function') {
                        try {
                            const allMeta = await VMClass.extractFlyntAll(buffer);
                            if (allMeta && allMeta.isFlynt) {
                                aiData = allMeta.aiData;
                                deviceData = allMeta.deviceData;
                                sketchforgeData = allMeta.sketchforgeData;
                                pythonData = allMeta.pythonData;
                            }
                        } catch (err) {
                            log.warn('extractFlyntAll failed, continuing with project load:', err);
                        }
                    } else if (typeof VMClass.isFlynt === 'function') {
                        try {
                            const isFlynt = await VMClass.isFlynt(buffer);
                            if (isFlynt) {
                                const promises = [
                                    VMClass.extractFlyntAiData ? VMClass.extractFlyntAiData(buffer).catch(() => null) : Promise.resolve(null),
                                    VMClass.extractFlyntDeviceData ? VMClass.extractFlyntDeviceData(buffer).catch(() => null) : Promise.resolve(null),
                                    VMClass.extractFlyntSketchforgeData ? VMClass.extractFlyntSketchforgeData(buffer).catch(() => null) : Promise.resolve(null),
                                    VMClass.extractFlyntPythonData ? VMClass.extractFlyntPythonData(buffer).catch(() => null) : Promise.resolve(null)
                                ];
                                const results = await Promise.all(promises);
                                aiData = results[0];
                                deviceData = results[1];
                                sketchforgeData = results[2];
                                pythonData = results[3];
                            }
                        } catch (err) {
                            log.warn('Legacy flynt extraction failed:', err);
                        }
                    }
                }

                try { localStorage.removeItem('ai_messages'); } catch (_) {}

                // Guardar los códigos Python y el candado con clave ANTES de loadProject:
                // el handler de PROJECT_LOADED en gui.jsx los lee para restaurar
                // el editor de texto y el estado de bloqueo del archivo cargado.
                if (pythonData && pythonData.pythonCodes) {
                    try {
                        localStorage.setItem('stblock_python_project_codes',
                            JSON.stringify(pythonData.pythonCodes));
                    } catch (_) {}
                } else {
                    try { localStorage.removeItem('stblock_python_project_codes'); } catch (_) {}
                }
                if (pythonData && pythonData.pythonKeyLock) {
                    try {
                        localStorage.setItem('stblock_python_project_key_lock',
                            String(pythonData.pythonKeyLock));
                    } catch (_) {}
                } else {
                    try { localStorage.removeItem('stblock_python_project_key_lock'); } catch (_) {}
                }

                // Cargar el proyecto en el VM de Scratch
                if (window.__stbLog) {
                    window.__stbLog('INFO', '[Uploader] Llamando a self.props.vm.loadProject(buffer)...');
                }
                const startTime = Date.now();
                await self.props.vm.loadProject(buffer);
                const elapsed = Date.now() - startTime;
                if (window.__stbLog) {
                    window.__stbLog('SUCCESS', `[Uploader] vm.loadProject finalizado exitosamente en ${elapsed}ms`);
                }

                if (filename) {
                    const uploadedProjectTitle = self.getProjectTitleFromFilename(filename);
                    self.props.onSetProjectTitle(uploadedProjectTitle);
                }
                loadingSuccess = true;

                // Restaurar datos de IA desde .flynt a localStorage
                if (aiData) {
                    try {
                        if (aiData.training) {
                            localStorage.setItem('ai_training_data',
                                typeof aiData.training === 'string' ?
                                    aiData.training : JSON.stringify(aiData.training));
                        }
                        if (aiData.session) {
                            localStorage.setItem('ai_session',
                                typeof aiData.session === 'string' ?
                                    aiData.session : JSON.stringify(aiData.session));
                        }
                        if (aiData.settings) {
                            if (aiData.settings.provider) {
                                localStorage.setItem('ai_provider', aiData.settings.provider);
                            }
                            if (aiData.settings.model) {
                                localStorage.setItem(
                                    aiData.settings.provider + '_model',
                                    aiData.settings.model);
                            }
                            if (aiData.settings.trainingEnabled !== undefined) {
                                localStorage.setItem('ai_training_enabled',
                                    aiData.settings.trainingEnabled);
                            }
                        }
                    } catch (_) {}
                }

                // Restaurar datos de dispositivos desde .flynt al store de Redux
                if (deviceData) {
                    try {
                        if (deviceData.deviceProjects) {
                            Object.keys(deviceData.deviceProjects).forEach(function (deviceId) {
                                const project = deviceData.deviceProjects[deviceId];
                                self.props.onRestoreDeviceProject(
                                    deviceId,
                                    project.projectData,
                                    project.hasBlocks
                                );
                            });
                        }
                        if (deviceData.terminalHistory && Array.isArray(deviceData.terminalHistory)) {
                            deviceData.terminalHistory.forEach(function (line) {
                                self.props.onAppendTerminal(line);
                            });
                        }
                        if (deviceData.connectionState) {
                            self.props.onRestoreDeviceState(deviceData.connectionState);
                        }
                        if (deviceData.circuitData) {
                            self.props.onSetCircuitData(deviceData.circuitData);
                        }
                        if (deviceData.circuit3dData) {
                            self.props.onSetCircuit3dData(deviceData.circuit3dData);
                        } else {
                            self.props.onClearCircuit3dData();
                        }
                        if (deviceData.conversation) {
                            localStorage.setItem('ai_conversation',
                                typeof deviceData.conversation === 'string' ?
                                    deviceData.conversation : JSON.stringify(deviceData.conversation));
                        }
                    } catch (_) {}
                } else {
                    self.props.onClearCircuit3dData();
                }

                // Restaurar proyecto 3D SketchForge (.skf)
                if (sketchforgeData) {
                    try {
                        self.props.onSetSketchforgeData(sketchforgeData);
                    } catch (_) {}
                }
            } catch (error) {
                if (window.__stbLog) {
                    window.__stbLog('ERROR', `[Uploader] Error en loadBuffer: ${error && (error.message || error)}`, error && error.stack);
                }
                log.warn('Error en loadBuffer:', error);
                try { localStorage.removeItem('stblock_python_project_codes'); } catch (_) {}
                try { localStorage.removeItem('stblock_python_project_key_lock'); } catch (_) {}
                try {
                    alert(self.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                } catch (_) {}
            } finally {
                clearTimeout(failsafeTimer);
                if (window.__stbLog) {
                    window.__stbLog('INFO', `[Uploader] Bloque finally: llamando a onLoadingFinished(success=${loadingSuccess})`);
                }
                try {
                    self.props.onLoadingFinished(self.props.loadingState, loadingSuccess);
                } catch (e) {
                    if (window.__stbLog) {
                        window.__stbLog('ERROR', `[Uploader] Error en onLoadingFinished: ${e.message}`, e.stack);
                    }
                    log.warn('Error en onLoadingFinished:', e);
                }
                self.removeFileObjects();
            }
        }
        // step 7: remove the <input> element from the DOM and clear reader and
        // fileToUpload reference, so those objects can be garbage collected
        removeFileObjects () {
            if (this.inputElement) {
                this.inputElement.value = null;
                document.body.removeChild(this.inputElement);
            }
            this.inputElement = null;
            this.fileReader = null;
            this.fileToUpload = null;
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                cancelFileUpload,
                closeFileMenu: closeFileMenuProp,
                isLoadingUpload,
                isShowingWithoutId,
                loadingState,
                onLoadingFinished,
                onLoadingStarted,
                onSetProjectTitle,
                projectChanged,
                requestProjectUpload: requestProjectUploadProp,
                userOwnsProject,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            return (
                <React.Fragment>
                    <WrappedComponent
                        onStartSelectingFileUpload={this.handleStartSelectingFileUpload}
                        {...componentProps}
                    />
                </React.Fragment>
            );
        }
    }

    SBFileUploaderComponent.propTypes = {
        canSave: PropTypes.bool,
        cancelFileUpload: PropTypes.func,
        closeFileMenu: PropTypes.func,
        intl: intlShape.isRequired,
        isLoadingUpload: PropTypes.bool,
        isShowingWithoutId: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onLoadingFinished: PropTypes.func,
        onLoadingStarted: PropTypes.func,
        onSetProjectTitle: PropTypes.func,
        onRestoreDeviceProject: PropTypes.func,
        onAppendTerminal: PropTypes.func,
        onRestoreDeviceState: PropTypes.func,
        onSetCircuitData: PropTypes.func,
        onSetCircuit3dData: PropTypes.func,
        onClearCircuit3dData: PropTypes.func,
        onSetSketchforgeData: PropTypes.func,
        projectChanged: PropTypes.shape({changed: PropTypes.bool, hasBeenSaved: PropTypes.bool}),
        requestProjectUpload: PropTypes.func,
        userOwnsProject: PropTypes.bool,
        vm: PropTypes.shape({
            loadProject: PropTypes.func
        })
    };
    const mapStateToProps = (state, ownProps) => {
        const loadingState = state.scratchGui.projectState.loadingState;
        const user = state.session && state.session.session && state.session.session.user;
        return {
            isLoadingUpload: getIsLoadingUpload(loadingState),
            isShowingWithoutId: getIsShowingWithoutId(loadingState),
            loadingState: loadingState,
            projectChanged: state.scratchGui.projectChanged,
            userOwnsProject: ownProps.authorUsername && user &&
                (ownProps.authorUsername === user.username),
            vm: state.scratchGui.vm
        };
    };
    const mapDispatchToProps = (dispatch, ownProps) => ({
        cancelFileUpload: loadingState => dispatch(onLoadedProject(loadingState, false, false)),
        closeFileMenu: () => dispatch(closeFileMenu()),
        // transition project state from loading to regular, and close
        // loading screen and file menu
        onLoadingFinished: (loadingState, success) => {
            if (window.__stbLog) {
                window.__stbLog('INFO', `[Uploader] onLoadingFinished: state="${loadingState}", success=${success}`);
            }
            try {
                const action = onLoadedProject(loadingState, ownProps.canSave, success);
                if (action) {
                    dispatch(action);
                } else {
                    dispatch({type: 'DONE_LOADING_VM_WITHOUT_ID'});
                }
            } catch (err) {
                if (window.__stbLog) {
                    window.__stbLog('ERROR', `[Uploader] Error en dispatch onLoadedProject: ${err.message}`, err.stack);
                }
            }
            try {
                dispatch(closeLoadingProject());
                if (window.__stbLog) {
                    window.__stbLog('INFO', '[Uploader] closeLoadingProject despachado exitosamente');
                }
            } catch (err) {
                if (window.__stbLog) {
                    window.__stbLog('ERROR', `[Uploader] Error al cerrar modal de carga: ${err.message}`, err.stack);
                }
            }
            try {
                dispatch(closeFileMenu());
            } catch (_) {}
        },
        // show project loading screen
        onLoadingStarted: () => dispatch(openLoadingProject()),
        onSetProjectTitle: title => dispatch(setProjectTitle(title)),
        // step 4: transition the project state so we're ready to handle the new
        // project data. When this is done, the project state transition will be
        // noticed by componentDidUpdate()
        requestProjectUpload: loadingState => dispatch(requestProjectUpload(loadingState)),
        // Restore device projects from .flynt file
        onRestoreDeviceProject: (deviceId, projectData, hasBlocks) =>
            dispatch(saveDeviceProject(deviceId, projectData, hasBlocks)),
        // Restore terminal output from .flynt file
        onAppendTerminal: line => dispatch(appendTerminalOutput(line)),
        // Restore connection state (selected device, port, settings)
        onRestoreDeviceState: deviceState => dispatch(restoreDeviceState(deviceState)),
        // Restore circuit data (legacy state)
        onSetCircuitData: circuitData => dispatch(setCircuitData(circuitData)),
        // Restore Circuito 3D data (Electronics Lab state)
        onSetCircuit3dData: circuit3dData => dispatch(setCircuit3dData(circuit3dData)),
        onClearCircuit3dData: () => dispatch(clearCircuit3dData()),
        // Restore 3D SketchForge project (.skf)
        onSetSketchforgeData: sketchforgeData => dispatch(setSketchforgeData(sketchforgeData))
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(SBFileUploaderComponent));
};

export {
    SBFileUploaderHOC as default
};
