import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        dragOver,
        selectedDevice, // Evita propagar al DOM
        onZoomIn,
        onZoomOut,
        onZoomReset,
        ...componentProps
    } = props;
    return (
        <Box
            className={classNames(styles.blocks, {
                [styles.dragOver]: dragOver
            })}
            {...componentProps}
            componentRef={containerRef}
        >
            {onZoomIn && onZoomOut && onZoomReset && (
                <div className={styles.zoomControls}>
                    <button
                        className={styles.zoomButton}
                        onClick={onZoomIn}
                        title="Acercar (Zoom in)"
                    >
                        +
                    </button>
                    <button
                        className={styles.zoomButton}
                        onClick={onZoomReset}
                        title="Restablecer zoom"
                    >
                        ⟲
                    </button>
                    <button
                        className={styles.zoomButton}
                        onClick={onZoomOut}
                        title="Alejar (Zoom out)"
                    >
                        −
                    </button>
                </div>
            )}
        </Box>
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    onZoomIn: PropTypes.func,
    onZoomOut: PropTypes.func,
    onZoomReset: PropTypes.func
};
export default BlocksComponent;
