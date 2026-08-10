import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {connect} from 'react-redux';

import ControlsComponent from '../components/controls/controls.jsx';
import classroomController from '../lib/classroom/classroom-controller';

import {
    setDebugArmed,
    setDebugActive,
    setDebugSpeed
} from '../reducers/vm-status';

class Controls extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleGreenFlagClick',
            'handleStopAllClick',
            'handleDebugClick',
            'handleSpeedChange'
        ]);
    }
    handleGreenFlagClick (e) {
        e.preventDefault();
        const classroomState = classroomController.getState();
        if (classroomState.active && classroomState.role === 'servidor') {
            classroomController.runClass();
        } else {
            if (e.shiftKey) {
                this.props.vm.setTurboMode(!this.props.turbo);
            } else {
                if (!this.props.isStarted) {
                    this.props.vm.start();
                }
                
                if (classroomState.active && classroomState.role === 'cliente') {
                    const vm = this.props.vm;
                    vm.runtime.stopAll();
                    vm.runtime.emit('PROJECT_START');
                    vm.runtime.ioDevices.clock.resetProjectTimer();
                    vm.runtime.targets.forEach(target => target.clearEdgeActivatedValues());
                    
                    const assignments = classroomState.assignments || {};
                    const myId = classroomState.clientId;
                    
                    for (let i = 0; i < vm.runtime.targets.length; i++) {
                        const target = vm.runtime.targets[i];
                        const isAssignedToMe = assignments[target.getName()] === myId;
                        if (isAssignedToMe) {
                            target.onGreenFlag();
                            vm.runtime.startHats('event_whenflagclicked', null, target);
                        }
                    }
                } else {
                    this.props.vm.greenFlag();
                }

                // Si debug está armado, reactivar debug y comenzar stepping controlado
                if (this.props.debugArmed) {
                    this.props.vm.setDebugMode(this.props.debugSpeed);
                    this.props.vm.startDebug();
                    this.props.onDebugActive(true);
                }
            }
        }
    }
    handleStopAllClick (e) {
        e.preventDefault();
        const classroomState = classroomController.getState();
        if (classroomState.active && classroomState.role === 'servidor') {
            classroomController.stopClass();
        } else {
            // stopAll() ya desactiva debug mode internamente
            // DEBUG_MODE_DEACTIVATED event limpia el estado Redux automáticamente
            this.props.vm.stopAll();
        }
    }
    handleDebugClick (e) {
        e.preventDefault();
        if (this.props.debugActive) {
            // Si debug está activo, no hacer nada (ya ejecutando)
            return;
        }
        // Toggle debug armed state
        this.props.onDebugArmed(!this.props.debugArmed);
    }
    handleSpeedChange (e) {
        const speed = parseInt(e.target.value, 10);
        this.props.onDebugSpeed(speed);
        // La velocidad se aplica en handleGreenFlagClick cuando se activa debug
    }
    render () {
        const {
            vm, // eslint-disable-line no-unused-vars
            isStarted, // eslint-disable-line no-unused-vars
            projectRunning,
            turbo,
            debugArmed, // eslint-disable-line no-unused-vars
            debugActive, // eslint-disable-line no-unused-vars
            debugSpeed, // eslint-disable-line no-unused-vars
            onDebugArmed, // eslint-disable-line no-unused-vars
            onDebugActive, // eslint-disable-line no-unused-vars
            onDebugSpeed, // eslint-disable-line no-unused-vars
            ...props
        } = this.props;
        return (
            <ControlsComponent
                {...props}
                active={projectRunning}
                turbo={turbo}
                debugArmed={debugArmed}
                debugActive={debugActive}
                debugSpeed={debugSpeed}
                onGreenFlagClick={this.handleGreenFlagClick}
                onStopAllClick={this.handleStopAllClick}
                onDebugClick={this.handleDebugClick}
                onSpeedChange={this.handleSpeedChange}
            />
        );
    }
}

Controls.propTypes = {
    isStarted: PropTypes.bool.isRequired,
    projectRunning: PropTypes.bool.isRequired,
    turbo: PropTypes.bool.isRequired,
    vm: PropTypes.instanceOf(VM),
    debugArmed: PropTypes.bool,
    debugActive: PropTypes.bool,
    debugSpeed: PropTypes.number,
    onDebugArmed: PropTypes.func,
    onDebugActive: PropTypes.func,
    onDebugSpeed: PropTypes.func
};

const mapStateToProps = state => ({
    isStarted: state.scratchGui.vmStatus.running,
    projectRunning: state.scratchGui.vmStatus.running,
    turbo: state.scratchGui.vmStatus.turbo,
    debugArmed: state.scratchGui.vmStatus.debugArmed,
    debugActive: state.scratchGui.vmStatus.debugActive,
    debugSpeed: state.scratchGui.vmStatus.debugSpeed
});

const mapDispatchToProps = dispatch => ({
    onDebugArmed: armed => dispatch(setDebugArmed(armed)),
    onDebugActive: active => dispatch(setDebugActive(active)),
    onDebugSpeed: speed => dispatch(setDebugSpeed(speed))
});

export default connect(mapStateToProps, mapDispatchToProps)(Controls);
