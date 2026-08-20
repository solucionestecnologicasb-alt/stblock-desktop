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
                'removeFileObjects'
            ]);
        }
        componentDidUpdate (prevProps) {
            if (this.props.isLoadingUpload && !prevProps.isLoadingUpload) {
                this.handleFinishedLoadingUpload(); // cue step 5 below
            }
        }
        componentWillUnmount () {
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
            // create <input> element and add it to DOM
            this.inputElement = document.createElement('input');
            this.inputElement.accept = '.sb,.sb2,.sb3,.flynt';
            this.inputElement.style.display = 'none';
            this.inputElement.type = 'file';
            this.inputElement.onchange = this.handleChange; // connects to step 3
            document.body.appendChild(this.inputElement);
            // simulate a click to open file chooser dialog
            this.inputElement.click();
        }
        // step 3: user has picked a file using the file chooser dialog.
        // We don't actually load the file here, we only decide whether to do so.
        handleChange (e) {
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
                    alert(intl.formatMessage(messages.emptyProjectError)); // eslint-disable-line no-alert
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
                    uploadAllowed = confirm( // eslint-disable-line no-alert
                        intl.formatMessage(sharedMessages.replaceProjectWarning)
                    );
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
                var self = this;
                var buffer = this.fileReader.result;
                var filename = this.fileToUpload && this.fileToUpload.name;

                if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
                    self.props.onLoadingStarted();
                    alert(self.props.intl.formatMessage(messages.emptyProjectError)); // eslint-disable-line no-alert
                    self.props.onLoadingFinished(self.props.loadingState, false);
                    self.removeFileObjects();
                    return;
                }

                // Check if .flynt format and extract AI, device, 3D and Python data
                // before loading project.
                var aiDataPromise = Promise.resolve(null);
                var deviceDataPromise = Promise.resolve(null);
                var sketchforgeDataPromise = Promise.resolve(null);
                var pythonDataPromise = Promise.resolve(null);
                if (buffer && typeof buffer === 'object') {
                    var VMClass = self.props.vm && self.props.vm.constructor;
                    if (VMClass && VMClass.isFlynt) {
                        aiDataPromise = VMClass.isFlynt(buffer).then(function (isFlynt) {
                            if (isFlynt && VMClass.extractFlyntAiData) {
                                return VMClass.extractFlyntAiData(buffer);
                            }
                            return null;
                        });
                        deviceDataPromise = VMClass.isFlynt(buffer).then(function (isFlynt) {
                            if (isFlynt && VMClass.extractFlyntDeviceData) {
                                return VMClass.extractFlyntDeviceData(buffer);
                            }
                            return null;
                        });
                        sketchforgeDataPromise = VMClass.isFlynt(buffer).then(function (isFlynt) {
                            if (isFlynt && VMClass.extractFlyntSketchforgeData) {
                                return VMClass.extractFlyntSketchforgeData(buffer);
                            }
                            return null;
                        });
                        pythonDataPromise = VMClass.isFlynt(buffer).then(function (isFlynt) {
                            if (isFlynt && VMClass.extractFlyntPythonData) {
                                return VMClass.extractFlyntPythonData(buffer);
                            }
                            return null;
                        });
                    }
                }

                Promise.all([
                    aiDataPromise,
                    deviceDataPromise,
                    sketchforgeDataPromise,
                    pythonDataPromise
                ]).then(function (results) {
                    var aiData = results[0];
                    var deviceData = results[1];
                    var sketchforgeData = results[2];
                    var pythonData = results[3];
                    self.props.onLoadingStarted();
                    try { localStorage.removeItem('ai_messages'); } catch (e) {}
                    // Guardar los códigos Python ANTES de loadProject: el handler de
                    // PROJECT_LOADED en gui.jsx los lee para restaurar el editor de
                    // texto (los ids de target cambian al recargar).
                    if (pythonData && pythonData.pythonCodes) {
                        try {
                            localStorage.setItem('stblock_python_project_codes',
                                JSON.stringify(pythonData.pythonCodes));
                        } catch (_) {}
                    } else {
                        // No es un .flynt con datos Python: descartar códigos
                        // antiguos para no restaurarlos en otro proyecto.
                        try { localStorage.removeItem('stblock_python_project_codes'); } catch (_) {}
                    }
                    var loadingSuccess = false;
                    self.props.vm.loadProject(buffer)
                        .then(function () {
                            if (filename) {
                                var uploadedProjectTitle = self.getProjectTitleFromFilename(filename);
                                self.props.onSetProjectTitle(uploadedProjectTitle);
                            }
                            loadingSuccess = true;

                            // Restore AI data from .flynt to localStorage
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

                            // Restore device data from .flynt to Redux store
                            if (deviceData) {
                                try {
                                    // Restore device projects (workspaces per device)
                                    if (deviceData.deviceProjects) {
                                        Object.keys(deviceData.deviceProjects).forEach(function (deviceId) {
                                            var project = deviceData.deviceProjects[deviceId];
                                            self.props.onRestoreDeviceProject(
                                                deviceId,
                                                project.projectData,
                                                project.hasBlocks
                                            );
                                        });
                                    }
                                    // Restore terminal history
                                    if (deviceData.terminalHistory && Array.isArray(deviceData.terminalHistory)) {
                                        deviceData.terminalHistory.forEach(function (line) {
                                            self.props.onAppendTerminal(line);
                                        });
                                    }
                                    // Restore connection state (selected device, port, terminal settings)
                                    if (deviceData.connectionState) {
                                        self.props.onRestoreDeviceState(deviceData.connectionState);
                                    }
                                    // Restore circuit data (Velxio state)
                                    if (deviceData.circuitData) {
                                        self.props.onSetCircuitData(deviceData.circuitData);
                                    }
                                    // Restore AI conversation to localStorage
                                    if (deviceData.conversation) {
                                        localStorage.setItem('ai_conversation',
                                            typeof deviceData.conversation === 'string' ?
                                                deviceData.conversation : JSON.stringify(deviceData.conversation));
                                    }
                                } catch (_) {}
                            }

                            // Restore 3D SketchForge project (.skf) from .flynt to Redux store.
                            // Se conserva hasta que se capture un .skf más reciente del iframe.
                            if (sketchforgeData) {
                                try {
                                    self.props.onSetSketchforgeData(sketchforgeData);
                                } catch (_) {}
                            }
                        })
                        .catch(function (error) {
                            log.warn(error);
                            try { localStorage.removeItem('stblock_python_project_codes'); } catch (_) {}
                            alert(self.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                        })
                        .then(function () {
                            self.props.onLoadingFinished(self.props.loadingState, loadingSuccess);
                            // go back to step 7: whether project loading succeeded
                            // or failed, reset file objects
                            self.removeFileObjects();
                        });
                });
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
            dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
            dispatch(closeLoadingProject());
            dispatch(closeFileMenu());
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
        // Restore circuit data (Velxio state)
        onSetCircuitData: circuitData => dispatch(setCircuitData(circuitData)),
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
