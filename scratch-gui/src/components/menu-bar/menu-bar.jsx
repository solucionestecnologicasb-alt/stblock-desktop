import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

import {
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu
} from '../../reducers/menus';

import collectMetadata from '../../lib/collect-metadata';

import styles from './menu-bar.css';

import dropdownCaret from './dropdown-caret.svg';
import aboutIcon from './icon--about.svg';
import fileIcon from './icon--file.svg';
import deviceIcon from './icon--device.svg';

import ModeToggle from '../mode-toggle/mode-toggle.jsx';
import {
    setDeviceMode,
    getDeviceMode,
    getSelectedDevice,
    getDeviceProjects,
    getTerminalOutput,
    getCodeViewContent
} from '../../reducers/device-mode';
import sharedMessages from '../../lib/shared-messages';

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const AboutButton = props => (
    <Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleSetMode',
            'handleKeyPress',
            'handleSaveToComputer',
            'handleDeviceModeChange'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickNew () {
        // if the project is dirty, and user owns the project, we will autosave.
        // but if they are not logged in and can't save, user should consider
        // downloading or logging in first.
        // Note that if user is logged in and editing someone else's project,
        // they'll lose their work.
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );
        this.props.onRequestCloseFile();
        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
        this.props.onRequestCloseFile();
    }
    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleSetMode (mode) {
        return () => {
            // Turn on/off filters for modes.
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }
    async handleSaveToComputer () {
        this.props.onRequestCloseFile();
        try {
            // Gather AI data from localStorage for .flynt bundle
            var aiData = {};
            try {
                var trainingRaw = localStorage.getItem('ai_training_data');
                if (trainingRaw) aiData.training = JSON.parse(trainingRaw);
                var sessionRaw = localStorage.getItem('ai_session');
                if (sessionRaw) aiData.session = JSON.parse(sessionRaw);
                var prov = localStorage.getItem('ai_provider') || '';
                aiData.settings = {
                    provider: prov,
                    model: localStorage.getItem(prov + '_model') || '',
                    trainingEnabled: localStorage.getItem('ai_training_enabled')
                };
                // Include AI conversation history
                var conversationRaw = localStorage.getItem('ai_conversation');
                if (conversationRaw) aiData.conversation = JSON.parse(conversationRaw);
            } catch (_) {}

            // Gather device data for .flynt bundle
            var deviceData = {};
            try {
                // Device projects (workspaces per device)
                if (this.props.deviceProjects && Object.keys(this.props.deviceProjects).length > 0) {
                    deviceData.deviceProjects = this.props.deviceProjects;
                }
                // Code editor state
                deviceData.codeState = {
                    currentCode: this.props.deviceCodeContent || '',
                    currentDevice: this.props.deviceModeSelectedDevice ?
                        this.props.deviceModeSelectedDevice.deviceId : null
                };
                // Terminal history (last 100 lines)
                if (this.props.deviceTerminalOutput && this.props.deviceTerminalOutput.length > 0) {
                    deviceData.terminalHistory = this.props.deviceTerminalOutput.slice(-100);
                }
            } catch (_) {}

            const content = await this.props.vm.saveProjectFlynt(aiData, deviceData);
            const filename = this.getProjectFilename();

            const defaultPath = localStorage.getItem('scratchDefaultPath');
            const defaultPathEnabled = localStorage.getItem('scratchDefaultPathEnabled') === 'true';

            if (defaultPathEnabled && defaultPath) {
                const filePath = `${defaultPath}\\${filename}`;
                await invoke('save_file', { path: filePath, content: Array.from(new Uint8Array(content)) });
            } else {
                const filePath = await save({
                    defaultPath: filename,
                    filters: [{ name: 'Flynt Project', extensions: ['flynt'] }]
                });
                if (filePath) {
                    await invoke('save_file', { path: filePath, content: Array.from(new Uint8Array(content)) });
                }
            }
        } catch (e) {
            if (e instanceof Error && e.message === 'NotInvoking') {
                // User cancelled the dialog
                return;
            }
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Tauri save not available, using browser download fallback:', e);
            }
        }
        if (this.props.onProjectTelemetryEvent) {
            const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
            this.props.onProjectTelemetryEvent('projectDidSave', metadata);
        }
    }
    getProjectFilename () {
        let filenameTitle = this.props.projectTitle;
        if (!filenameTitle || filenameTitle.length === 0) {
            filenameTitle = 'STBlock Project';
        }
        return `${filenameTitle.substring(0, 100)}.flynt`;
    }
    handleDeviceModeChange (newMode) {
        if (newMode === 'device' && !this.props.deviceModeSelectedDevice) {
            // If switching to device mode without a device selected, open the library
            if (this.props.onRequestOpenDeviceLibrary) {
                this.props.onRequestOpenDeviceLibrary();
            }
        } else {
            this.props.onSetDeviceMode(newMode);
        }
    }
    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) {
            // hide the button
            return null;
        }
        if (typeof onClickAbout === 'function') {
            // make a button which calls a function
            return <AboutButton onClick={onClickAbout} />;
        }
        // assume it's an array of objects
        // each item must have a 'title' FormattedMessage and a 'handleClick' function
        // generate a menu with items for each object in the array
        return (
            <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                    [styles.active]: this.props.aboutMenuOpen
                })}
                onMouseUp={this.props.onRequestOpenAbout}
            >
                <img
                    className={styles.aboutIcon}
                    src={aboutIcon}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                    onRequestClose={this.props.onRequestCloseAbout}
                >
                    {
                        onClickAbout.map(itemProps => (
                            <MenuItem
                                key={itemProps.title}
                                isRtl={this.props.isRtl}
                                onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                            >
                                {itemProps.title}
                            </MenuItem>
                        ))
                    }
                </MenuBarMenu>
            </div>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        // Show the About button only if we have a handler for it (like in the desktop app)
        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);
        return (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        <ModeToggle
                            mode={this.props.deviceMode}
                            onModeChange={this.handleDeviceModeChange}
                        />
                        <SettingsMenu
                            canChangeLanguage={this.props.canChangeLanguage}
                            canChangeTheme={this.props.canChangeTheme}
                            isRtl={this.props.isRtl}
                            onRequestClose={this.props.onRequestCloseSettings}
                            onRequestOpen={this.props.onClickSettings}
                            settingsMenuOpen={this.props.settingsMenuOpen}
                            onUploadFirmware={this.props.onUploadFirmware}
                            deviceModeConnected={this.props.deviceModeConnected}
                            selectedDevice={this.props.selectedDevice}
                        />
                        {(this.props.canManageFiles) && (
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable, {
                                    [styles.active]: this.props.fileMenuOpen
                                })}
                                onMouseUp={this.props.onClickFile}
                            >
                                <img src={fileIcon} />
                                <span className={styles.collapsibleLabel}>
                                    <FormattedMessage
                                        defaultMessage="File"
                                        description="Text for file dropdown menu"
                                        id="gui.menuBar.file"
                                    />
                                </span>
                                <img src={dropdownCaret} />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.fileMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                    onRequestClose={this.props.onRequestCloseFile}
                                >
                                    <MenuSection>
                                        <MenuItem
                                            isRtl={this.props.isRtl}
                                            onClick={this.handleClickNew}
                                        >
                                            {newProjectMessage}
                                        </MenuItem>
                                    </MenuSection>
                                    {(this.props.canSave || this.props.canCreateCopy || this.props.canRemix) && (
                                        <MenuSection>
                                            {this.props.canSave && (
                                                <MenuItem onClick={this.handleClickSave}>
                                                    {saveNowMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canCreateCopy && (
                                                <MenuItem onClick={this.handleClickSaveAsCopy}>
                                                    {createCopyMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canRemix && (
                                                <MenuItem onClick={this.handleClickRemix}>
                                                    {remixMessage}
                                                </MenuItem>
                                            )}
                                        </MenuSection>
                                    )}
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.props.onStartSelectingFileUpload}
                                        >
                                            {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                                        </MenuItem>
                                        <MenuItem onClick={this.handleSaveToComputer}>
                                            <FormattedMessage
                                                defaultMessage="Save to your computer"
                                                description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
                                                id="gui.menuBar.downloadToComputer"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </div>
                        )}

                        <div
                            className={classNames(styles.menuBarItem, styles.hoverable)}
                            onMouseUp={this.props.onRequestOpenDeviceLibrary}
                        >
                            <img src={deviceIcon} />
                            <span className={classNames(styles.collapsibleLabel)}>
                                {this.props.deviceMode === 'device'
                                    ? (this.props.deviceModeSelectedDevice ? this.props.deviceModeSelectedDevice.name : 'Seleccionar dispositivo')
                                    : (this.props.selectedDevice ? this.props.selectedDevice.name : 'Seleccionar dispositivo')
                                }
                            </span>
                        </div>
                        {this.props.deviceModeSelectedDevice && this.props.deviceModeSelectedDevice.deviceId === 'stbBoardV2' && (
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('show-stbboard-pinout'));
                                }}
                                title="Ver mapa de pines interactivo de STBoard V2"
                                style={{
                                    marginLeft: '8px',
                                    padding: '3px 12px',
                                    background: 'linear-gradient(135deg, rgb(44 131 29), rgb(69 129 113))',
                                    color: 'rgb(255 255 255)',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: 'rgb(0 210 255 / 0%) 0px 0px 10px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    userSelect: 'none',
                                    height: '24px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = 'rgb(0 210 255 / 0%) 0px 0px 10px';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'rgb(0 210 255 / 0%) 0px 0px 10px';
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                <span>Mapa de Pines</span>
                            </div>
                        )}
                        {this.props.isTotallyNormal && (
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable, {
                                    [styles.active]: this.props.modeMenuOpen
                                })}
                                onMouseUp={this.props.onClickMode}
                            >
                                <div className={classNames(styles.editMenu)}>
                                    <FormattedMessage
                                        defaultMessage="Mode"
                                        description="Mode menu item in the menu bar"
                                        id="gui.menuBar.modeMenu"
                                    />
                                </div>
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.modeMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                    onRequestClose={this.props.onRequestCloseMode}
                                >
                                    <MenuSection>
                                        <MenuItem onClick={this.handleSetMode('NOW')}>
                                            <span className={classNames({[styles.inactive]: !this.props.modeNow})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Normal mode"
                                                description="April fools: resets editor to not have any pranks"
                                                id="gui.menuBar.normalMode"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.handleSetMode('2020')}>
                                            <span className={classNames({[styles.inactive]: !this.props.mode2020})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Caturday mode"
                                                description="April fools: Cat blocks mode"
                                                id="gui.menuBar.caturdayMode"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </div>
                        )}
                    </div>
                </div>
                {this.props.canEditTitle ? (
                    <div className={classNames(styles.menuBarItem, styles.titleFieldCentered)}>
                        <MenuBarItemTooltip
                            enable
                            id="title-field"
                        >
                            <ProjectTitleInput />
                        </MenuBarItemTooltip>
                    </div>
                ) : ((this.props.authorUsername && this.props.authorUsername !== this.props.username) ? (
                    <AuthorInfo
                        className={styles.authorInfo}
                        imageUrl={this.props.authorThumbnailUrl}
                        projectTitle={this.props.projectTitle}
                        userId={this.props.authorId}
                        username={this.props.authorUsername}
                    />
                ) : null)}
                <div className={styles.accountInfoGroup} />

                {aboutButton}

            </Box>
        );
    }
}

MenuBar.propTypes = {
    aboutMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    className: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    deviceMode: PropTypes.oneOf(['game', 'device']),
    deviceModeSelectedDevice: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    }),
    fileMenuOpen: PropTypes.bool,
    intl: intlShape,
    isRtl: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    mode2020: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    onClickFile: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onSetDeviceMode: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpenDeviceLibrary: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    selectedDevice: PropTypes.shape({
        name: PropTypes.string
    }),
    onUploadFirmware: PropTypes.func,
    deviceModeConnected: PropTypes.bool,
    onSetTimeTravelMode: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    projectTitle: PropTypes.string,
    settingsMenuOpen: PropTypes.bool,
    username: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};



const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    return {
        aboutMenuOpen: aboutMenuOpen(state),
        deviceMode: getDeviceMode(state),
        deviceModeSelectedDevice: getSelectedDevice(state),
        deviceProjects: getDeviceProjects(state),
        deviceTerminalOutput: getTerminalOutput(state),
        deviceCodeContent: getCodeViewContent(state),
        fileMenuOpen: fileMenuOpen(state),
        isRtl: state.locales.isRtl,
        locale: state.locales.locale,
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        settingsMenuOpen: settingsMenuOpen(state),
        username: user ? user.username : null,
        vm: state.scratchGui.vm,
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state)
    };
};

const mapDispatchToProps = dispatch => ({
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode)),
    onSetDeviceMode: mode => dispatch(setDeviceMode(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);
