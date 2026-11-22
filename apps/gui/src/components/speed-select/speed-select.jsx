import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './speed-select.css';

const SpeedSelectComponent = function (props) {
    const {
        className,
        debugSpeed,
        onChange,
        disabled,
        ...componentProps
    } = props;

    return (
        <div
            className={classNames(styles.speedSelect, className)}
            {...componentProps}
        >
            <span className={styles.speedLabel}>
                Velocidad:
            </span>
            <select
                className={styles.speedDropdown}
                value={debugSpeed}
                onChange={onChange}
                disabled={disabled}
            >
                <option value={100}>Normal</option>
                <option value={500}>Lento</option>
                <option value={1500}>Muy lento</option>
            </select>
        </div>
    );
};

SpeedSelectComponent.propTypes = {
    className: PropTypes.string,
    debugSpeed: PropTypes.number,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

SpeedSelectComponent.defaultProps = {
    debugSpeed: 100,
    disabled: false
};

export default SpeedSelectComponent;
