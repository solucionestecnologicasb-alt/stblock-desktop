import React from 'react';
import {FormattedMessage} from 'react-intl';
import classNames from 'classnames';
import styles from './loader.css';
import PropTypes from 'prop-types';
import mascotImage from '../../lib/default-project/stblock-mascot.png';

const messages = [
    {
        message: (
            <FormattedMessage
                defaultMessage="Preparando bloques …"
                description="One of the loading messages"
                id="gui.loader.stblock.message1"
            />
        ),
        weight: 50
    },
    {
        message: (
            <FormattedMessage
                defaultMessage="Cargando personajes …"
                description="One of the loading messages"
                id="gui.loader.stblock.message2"
            />
        ),
        weight: 50
    },
    {
        message: (
            <FormattedMessage
                defaultMessage="Iniciando asistente IA …"
                description="One of the loading messages"
                id="gui.loader.stblock.message3"
            />
        ),
        weight: 50
    },
    {
        message: (
            <FormattedMessage
                defaultMessage="Conectando recursos …"
                description="One of the loading messages"
                id="gui.loader.stblock.message4"
            />
        ),
        weight: 50
    },
    {
        message: (
            <FormattedMessage
                defaultMessage="Optimizando entorno …"
                description="One of the loading messages"
                id="gui.loader.stblock.message5"
            />
        ),
        weight: 20
    },
    {
        message: (
            <FormattedMessage
                defaultMessage="Casi listo …"
                description="One of the loading messages"
                id="gui.loader.stblock.message6"
            />
        ),
        weight: 10
    }
];

const mainMessages = {
    'gui.loader.headline': (
        <FormattedMessage
            defaultMessage="Cargando STBlock"
            description="Main loading message"
            id="gui.loader.stblock.headline"
        />
    ),
    'gui.loader.creating': (
        <FormattedMessage
            defaultMessage="Creando proyecto"
            description="Main creating message"
            id="gui.loader.stblock.creating"
        />
    )
};

const MascotAnimation = () => (
    <div className={styles.mascotContainer}>
        <div className={styles.orbitsContainer}>
            <div className={styles.orbit1}>
                <div className={styles.orbitDot} />
            </div>
            <div className={styles.orbit2}>
                <div className={styles.orbitDot} />
            </div>
            <div className={styles.orbit3}>
                <div className={styles.orbitDot} />
            </div>
        </div>
        <div className={styles.glowRing} />
        <div className={styles.mascotWrapper}>
            <img
                className={styles.mascot}
                src={mascotImage}
                alt="STBlock"
            />
        </div>
    </div>
);

const ProgressBar = () => (
    <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
            <div className={styles.progressFill} />
        </div>
    </div>
);

class LoaderComponent extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            messageNumber: 0
        };
    }
    componentDidMount () {
        this.intervalId = setInterval(() => {
            this.setState(prevState => ({
                messageNumber: (prevState.messageNumber + 1) % messages.length
            }));
        }, 2500);
    }
    componentWillUnmount () {
        clearInterval(this.intervalId);
    }
    render () {
        return (
            <div
                className={classNames(styles.background, {
                    [styles.fullscreen]: this.props.isFullScreen
                })}
            >
                <div className={styles.container}>
                    <MascotAnimation />
                    <div className={styles.title}>
                        {mainMessages[this.props.messageId]}
                    </div>
                    <ProgressBar />
                    <div className={styles.messageContainerOuter}>
                        <div className={styles.message}>
                            {messages[this.state.messageNumber].message}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

LoaderComponent.propTypes = {
    isFullScreen: PropTypes.bool,
    messageId: PropTypes.string
};
LoaderComponent.defaultProps = {
    isFullScreen: false,
    messageId: 'gui.loader.headline'
};

export default LoaderComponent;
