import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import GreenFlag from '../green-flag/green-flag.jsx';
import StopAll from '../stop-all/stop-all.jsx';
import TurboMode from '../turbo-mode/turbo-mode.jsx';
import DebugButton from '../debug-button/debug-button.jsx';
import SpeedSelect from '../speed-select/speed-select.jsx';

import styles from './controls.css';

const messages = defineMessages({
    goTitle: {
        id: 'gui.controls.go',
        defaultMessage: 'Go',
        description: 'Green flag button title'
    },
    stopTitle: {
        id: 'gui.controls.stop',
        defaultMessage: 'Stop',
        description: 'Stop button title'
    },
    debugTitle: {
        id: 'gui.controls.debug',
        defaultMessage: 'Debug',
        description: 'Debug button title'
    }
});

const Controls = function (props) {
    const {
        active,
        className,
        intl,
        onGreenFlagClick,
        onStopAllClick,
        turbo,

        // Debug props
        debugArmed,
        debugActive,
        debugSpeed,
        onDebugClick,
        onSpeedChange,

        ...componentProps
    } = props;
    return (
        <div
            className={classNames(styles.controlsContainer, className)}
            {...componentProps}
        >
            <GreenFlag
                active={active}
                title={intl.formatMessage(messages.goTitle)}
                onClick={onGreenFlagClick}
            />
            <StopAll
                active={active}
                title={intl.formatMessage(messages.stopTitle)}
                onClick={onStopAllClick}
            />
            <DebugButton
                armed={debugArmed}
                active={debugActive}
                title={intl.formatMessage(messages.debugTitle)}
                onClick={onDebugClick}
            />
            {debugArmed || debugActive ? (
                <SpeedSelect
                    debugSpeed={debugSpeed}
                    onChange={onSpeedChange}
                    disabled={debugActive}
                />
            ) : null}
            {turbo ? (
                <TurboMode />
            ) : null}
        </div>
    );
};

Controls.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onGreenFlagClick: PropTypes.func.isRequired,
    onStopAllClick: PropTypes.func.isRequired,
    turbo: PropTypes.bool,

    // Debug props
    debugArmed: PropTypes.bool,
    debugActive: PropTypes.bool,
    debugSpeed: PropTypes.number,
    onDebugClick: PropTypes.func,
    onSpeedChange: PropTypes.func
};

Controls.defaultProps = {
    active: false,
    turbo: false,
    debugArmed: false,
    debugActive: false,
    debugSpeed: 100
};

export default injectIntl(Controls);
