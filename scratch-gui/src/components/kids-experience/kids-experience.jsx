import React, {useEffect, useRef, useState} from 'react';
import mascotImage from '../../lib/default-project/stblock-mascot.png';
import styles from './kids-experience.css';

const STEPS_TO_STAR = 4;

const KidsExperience = ({onExit}) => {
    const [screen, setScreen] = useState('home');
    const [actions, setActions] = useState([]);
    const [position, setPosition] = useState(0);
    const [crossedRiver, setCrossedRiver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showWin, setShowWin] = useState(false);
    const timers = useRef([]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const reset = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setActions([]);
        setPosition(0);
        setCrossedRiver(false);
        setIsPlaying(false);
        setShowWin(false);
    };

    const addAction = action => {
        if (!isPlaying && actions.length < 6) setActions(previous => [...previous, action]);
    };

    const play = () => {
        if (isPlaying || actions.length === 0) return;
        setIsPlaying(true);
        let nextPosition = position;
        let hasCrossed = crossedRiver;
        actions.forEach((action, index) => {
            const timer = setTimeout(() => {
                if (action === 'jump') {
                    nextPosition = Math.min(STEPS_TO_STAR, nextPosition + (nextPosition === 1 ? 2 : 1));
                    if (nextPosition >= 3) hasCrossed = true;
                } else if (action === 'step' && (nextPosition !== 1 || hasCrossed)) {
                    nextPosition = Math.min(STEPS_TO_STAR, nextPosition + 1);
                }
                setPosition(nextPosition);
                setCrossedRiver(hasCrossed);
                if (index === actions.length - 1) {
                    setIsPlaying(false);
                    setShowWin(nextPosition >= STEPS_TO_STAR && hasCrossed);
                }
            }, index * 620);
            timers.current.push(timer);
        });
    };

    const openMission = mode => {
        reset();
        setScreen(mode);
    };

    if (screen === 'home') {
        return (
            <main className={styles.app}>
                <header className={styles.topbar}>
                    <button className={styles.backButton} onClick={onExit} aria-label="Volver a STBlock Jr">←</button>
                    <div className={styles.kidsBrand}><img src={mascotImage} alt="" /><strong>STBlock <span>Kids</span></strong></div>
                    <span className={styles.topDecor} aria-hidden="true">✦</span>
                </header>
                <section className={styles.homeContent}>
                    <div className={styles.welcomeMascot}><img src={mascotImage} alt="" /><span>¡Hola, explorador!</span></div>
                    <h1>¿Qué hacemos hoy?</h1>
                    <p className={styles.homeSubtitle}>Elige una aventura o inventa la tuya.</p>
                    <div className={styles.missionCards}>
                        <button className={`${styles.missionCard} ${styles.missionBlue}`} onClick={() => openMission('mission')}>
                            <span className={styles.cardArt} aria-hidden="true"><span>🐢</span><span>🌉</span><span>⭐</span></span>
                            <span className={styles.cardTitle}>¡Rescatemos la estrella!</span>
                            <span className={styles.cardText}>Cruza el río y llega hasta ella</span>
                            <span className={styles.cardGo}>JUGAR <b>➜</b></span>
                        </button>
                        <button className={`${styles.missionCard} ${styles.missionPeach}`} onClick={() => openMission('free')}>
                            <span className={`${styles.cardArt} ${styles.freeArt}`} aria-hidden="true"><span>🦊</span><span>🎨</span><span>🌳</span></span>
                            <span className={styles.cardTitle}>¡A crear!</span>
                            <span className={styles.cardText}>Juega sin un reto, a tu manera</span>
                            <span className={styles.cardGo}>CREAR <b>➜</b></span>
                        </button>
                    </div>
                    <p className={styles.grownupNote}>Hecho para tocar, probar e imaginar</p>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.app}>
            <header className={styles.topbar}>
                <button className={styles.backButton} onClick={() => { reset(); setScreen('home'); }}>←</button>
                <div className={styles.kidsBrand}><img src={mascotImage} alt="" /><strong>STBlock <span>Kids</span></strong></div>
                <button className={styles.restartButton} onClick={reset} aria-label="Empezar de nuevo">↻</button>
            </header>
            <section className={styles.playContent}>
                <div className={styles.challengeHeader}>
                    <div className={styles.challengeBadge}>{screen === 'mission' ? '⭐ MISIÓN' : '🎨 A CREAR'}</div>
                    <h1>{screen === 'mission' ? '¡Ayuda a Tobi a llegar a la estrella!' : '¡Inventemos una aventura!'}</h1>
                    <p>{screen === 'mission' ? 'Hay un río en el camino. ¿Cómo lo cruzamos?' : 'Toca acciones y mira qué pasa.'}</p>
                </div>
                <div className={styles.playArea}>
                    <div className={`${styles.cloud} ${styles.cloudOne}`}>☁️</div>
                    <div className={`${styles.cloud} ${styles.cloudTwo}`}>☁️</div>
                    <div className={styles.sceneLabels}><span>INICIO</span>{screen === 'mission' && <span>META</span>}</div>
                    <div className={styles.path}>
                        {[0, 1, 2, 3, 4].map(index => (
                            <div key={index} className={`${styles.tile} ${index === 2 && screen === 'mission' ? styles.river : ''} ${position === index ? styles.activeTile : ''}`}>
                                {position === index && <span className={styles.turtle}>🐢</span>}
                                {index === 2 && screen === 'mission' && <span className={styles.tileObject}>{crossedRiver ? '🌿' : '💧'}</span>}
                                {index === STEPS_TO_STAR && screen === 'mission' && <span className={styles.tileObject}>{showWin ? '✨' : '⭐'}</span>}
                                {screen === 'free' && index === 4 && <span className={styles.tileObject}>🌳</span>}
                            </div>
                        ))}
                    </div>
                    {showWin && <div className={styles.winMessage}>¡Lo lograste! 🎉</div>}
                </div>
                <div className={styles.actionPanel}>
                    <div className={styles.actionHeading}><strong>¿Qué hará Tobi?</strong><span>{actions.length} / 6</span></div>
                    <div className={styles.actionRow}>
                        <button disabled={isPlaying} onClick={() => addAction('step')}><span>👣</span><small>Caminar</small></button>
                        <button disabled={isPlaying} onClick={() => addAction('jump')}><span>🐸</span><small>Saltar</small></button>
                        {screen === 'free' && <button disabled={isPlaying} onClick={() => addAction('wave')}><span>👋</span><small>Saludar</small></button>}
                        {actions.map((action, index) => <span className={styles.queuedAction} key={`${action}-${index}`}>{action === 'jump' ? '🐸' : action === 'wave' ? '👋' : '👣'}</span>)}
                    </div>
                    <div className={styles.playControls}>
                        <button className={styles.clearButton} disabled={isPlaying || actions.length === 0} onClick={() => setActions([])}>Borrar</button>
                        <button className={styles.playButton} disabled={isPlaying || actions.length === 0} onClick={play}><span>▶</span> ¡A jugar!</button>
                    </div>
                </div>
                {screen === 'mission' && !showWin && <p className={styles.hint}>Pista: toca una acción, luego otra, y mira qué sucede.</p>}
            </section>
        </main>
    );
};

export default KidsExperience;
