import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';

import {connect} from 'react-redux';
import VM from 'scratch-vm';

class TargetHighlight extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'getPageCoords'
        ]);
    }

    // Transform Scratch coordinates into percentages of the rendered stage.
    // The stage is responsive in the editor, so pixel coordinates calculated
    // from the nominal stage size drift when CSS resizes the canvas.
    getPageCoords (x, y) {
        const {vm} = this.props;
        // The renderers "nativeSize" is the [width, height] of the stage in scratch-units
        const nativeSize = vm.renderer.getNativeSize();
        return [
            ((x / nativeSize[0]) * 100) + 50,
            -((y / nativeSize[1]) * 100) + 50
        ];
    }

    render () {
        const {
            className,
            highlightedTargetId,
            highlightedTargetTime,
            vm
        } = this.props;

        if (!(highlightedTargetId && vm && vm.renderer &&
            vm.runtime.getTargetById(highlightedTargetId))) return null;

        const target = vm.runtime.getTargetById(highlightedTargetId);
        const bounds = vm.renderer.getBounds(target.drawableID);
        const [left, top] = this.getPageCoords(bounds.left, bounds.top);
        const [right, bottom] = this.getPageCoords(bounds.right, bounds.bottom);

        const pad = 2; // px

        return (
            <div
                className={className}
                // Ensure new DOM element each update to restart animation
                key={highlightedTargetTime}
                style={{
                    position: 'absolute',
                    top: `calc(${top}% - ${pad}px)`,
                    left: `calc(${left}% - ${pad}px)`,
                    width: `calc(${right - left}% + ${2 * pad}px)`,
                    height: `calc(${bottom - top}% + ${2 * pad}px)`
                }}
            />
        );
    }
}

TargetHighlight.propTypes = {
    className: PropTypes.string,
    highlightedTargetId: PropTypes.string,
    highlightedTargetTime: PropTypes.number,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = state => ({
    highlightedTargetTime: state.scratchGui.targets.highlightedTargetTime,
    highlightedTargetId: state.scratchGui.targets.highlightedTargetId,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = () => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(TargetHighlight);
