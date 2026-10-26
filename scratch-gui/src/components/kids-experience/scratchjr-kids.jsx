import React, {useEffect, useRef, useState} from 'react';
import styles from './scratchjr-kids-v2.css';

const STORY_MISSIONS = [
    {id: 'star', title: 'La estrella perdida', character: '🐻', goal: '⭐', description: 'Guía a Tobi por el bosque hasta encontrar su estrella.', target: [1, 4], walls: [[2, 2]]},
    {id: 'flower', title: 'Una flor para Luna', character: '🐰', goal: '🌷', description: 'Ayuda a Luna a llevar una flor a su amiga.', target: [0, 3], walls: [[3, 1], [2, 1]]},
    {id: 'home', title: 'De vuelta a casa', character: '🦊', goal: '🏠', description: 'Encuentra el camino de regreso antes de que anochezca.', target: [1, 2], walls: [[3, 2], [2, 2]]}
];
const ROBOT_MISSION = {id: 'robot', title: 'Rescate en el jardín', character: '🤖', goal: '🔋', description: 'Guía al robot por el jardín hasta encontrar la batería.', target: [1, 4], walls: [[2, 2], [3, 3]]};
const COMMANDS = [
    {id: 'forward', icon: '⬆️', label: 'Avanzar', color: 'blue'},
    {id: 'left', icon: '↶', label: 'Girar', color: 'orange'},
    {id: 'right', icon: '↷', label: 'Girar', color: 'green'}
];
const START = [4, 0];
const FACE = [[-1, 0], [0, 1], [1, 0], [0, -1]];

const Brand = ({compact = false, src}) => (
    <img className={compact ? styles.logoCompact : styles.logo} src={src} alt="STBlock Kids" />
);

const KidsHeader = ({onBack, label, logo}) => (
    <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack} type="button" aria-label="Volver">←</button>
        <Brand compact src={logo} />
        <span className={styles.headerLabel}>{label}</span>
    </header>
);

const ModeCard = ({icon, title, description, color, onClick}) => (
    <button type="button" className={`${styles.modeCard} ${styles[color]}`} onClick={onClick}>
        <span className={styles.modeIcon} aria-hidden="true">{icon}</span>
        <span className={styles.modeTitle}>{title}</span>
        <span className={styles.modeDescription}>{description}</span>
        <span className={styles.modeArrow} aria-hidden="true">➜</span>
    </button>
);

const ScratchJrKids = ({basePath, onExit}) => {
    const logo = `${basePath}static/kids/stblock-kids-logo.jpg`;
    const [screen, setScreen] = useState('modes');
    const [mission, setMission] = useState(null);
    const [commands, setCommands] = useState([]);
    const [position, setPosition] = useState(START);
    const [direction, setDirection] = useState(0);
    const [running, setRunning] = useState(false);
    const [complete, setComplete] = useState(false);
    const [feedback, setFeedback] = useState('Toca las flechas para crear un camino.');
    const timerRef = useRef(null);
    const iframeRef = useRef(null);

    const resetPuzzle = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setCommands([]);
        setPosition(START);
        setDirection(0);
        setRunning(false);
        setComplete(false);
        setFeedback('Toca las flechas para crear un camino.');
    };

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const goHome = () => {
        resetPuzzle();
        setMission(null);
        setScreen('modes');
    };

    const openScratchJr = (mode, selectedMission = null) => {
        setMission(selectedMission);
        setScreen(mode);
    };

    const addCommand = command => {
        if (!running && commands.length < 10 && !complete) setCommands(previous => [...previous, command]);
    };

    const runProgram = () => {
        if (!mission || !commands.length || running || complete) return;
        let step = 0;
        let nextPosition = [...START];
        let nextDirection = 0;
        setRunning(true);
        setFeedback('¡Mira cómo sigue tus instrucciones!');
        const advance = () => {
            if (step >= commands.length) {
                setRunning(false);
                setFeedback('Prueba otro camino. ¡Tú puedes!');
                return;
            }
            const command = commands[step++];
            if (command === 'left') nextDirection = (nextDirection + 3) % 4;
            if (command === 'right') nextDirection = (nextDirection + 1) % 4;
            if (command === 'forward') {
                const vector = FACE[nextDirection];
                const candidate = [nextPosition[0] + vector[0], nextPosition[1] + vector[1]];
                const hitWall = candidate[0] < 0 || candidate[0] > 4 || candidate[1] < 0 || candidate[1] > 4 || mission.walls.some(wall => wall[0] === candidate[0] && wall[1] === candidate[1]);
                if (hitWall) {
                    setPosition(nextPosition);
                    setDirection(nextDirection);
                    setRunning(false);
                    setFeedback('¡Uy! Hay algo en el camino. Cambia tus flechas y prueba otra vez.');
                    return;
                }
                nextPosition = candidate;
            }
            setPosition([...nextPosition]);
            setDirection(nextDirection);
            if (nextPosition[0] === mission.target[0] && nextPosition[1] === mission.target[1]) {
                setRunning(false);
                setComplete(true);
                setFeedback('¡Lo lograste! ⭐');
                return;
            }
            timerRef.current = setTimeout(advance, 520);
        };
        timerRef.current = setTimeout(advance, 180);
    };

    const openStoryMission = selectedMission => {
        resetPuzzle();
        setMission(selectedMission);
        setScreen('story-play');
    };

    const openRobot = () => {
        resetPuzzle();
        setMission(ROBOT_MISSION);
        setScreen('robot');
    };

    if (screen === 'free') {
        return (
            <main className={styles.freeShell}>
                <iframe
                    ref={iframeRef}
                    className={styles.editor}
                    src={`${basePath}static/scratchjr/app/home.html?stblockKids=1`}
                    title="STBlock Kids - modo libre"
                    allow="autoplay; camera; microphone"
                    onLoad={() => {
                        try {
                            const doc = iframeRef.current.contentDocument;
                            doc.title = 'STBlock Kids';
                            const style = doc.createElement('style');
                            style.textContent = '#logotab,#helptab,#settings,#reference,#footer { display: none !important; } #topbar { background-color: #ffd34e !important; border-color: #e7b92e !important; }';
                            doc.head.appendChild(style);
                        } catch (_error) {
                            // El editor sigue funcionando si el contenedor impide personalizar el documento.
                        }
                    }}
                />
                <div className={styles.freeHeader}>
                    <button className={styles.backButton} onClick={goHome} type="button" aria-label="Volver a modos">←</button>
                    <Brand compact src={logo} />
                    <span className={styles.headerLabel}>MODO LIBRE</span>
                </div>
            </main>
        );
    }

    if (screen === 'modes') {
        return (
            <main className={styles.shell}>
                <button className={styles.exitButton} onClick={onExit} type="button" aria-label="Salir de STBlock Kids">×</button>
                <section className={styles.modeHome}>
                    <Brand src={logo} />
                    <h1>¿Qué vamos a explorar?</h1>
                    <p className={styles.lead}>Elige una aventura para empezar a jugar.</p>
                    <div className={styles.modeGrid}>
                        <ModeCard icon="📖" title="Modo historia" description="Resuelve aventuras paso a paso" color="storyCard" onClick={() => setScreen('story')} />
                        <ModeCard icon="🤖" title="Modo robot" description="Programa un robot para cumplir una misión" color="robotCard" onClick={openRobot} />
                        <ModeCard icon="🎨" title="Modo libre" description="Crea historias y animaciones a tu manera" color="freeCard" onClick={() => openScratchJr('free')} />
                    </div>
                    <div className={styles.footnote}><span>✦</span> Toca, descubre y vuelve a intentarlo <span>✦</span></div>
                </section>
            </main>
        );
    }

    if (screen === 'story') {
        return (
            <main className={styles.shell}>
                <KidsHeader onBack={goHome} label="MODO HISTORIA" logo={logo} />
                <section className={styles.storyContent}>
                    <div className={styles.sectionKicker}>ELIGE UNA AVENTURA</div>
                    <h1>¿A quién ayudamos hoy?</h1>
                    <p className={styles.lead}>Cada aventura tiene un reto. ¡Tú encuentras el camino!</p>
                    <div className={styles.missionGrid}>
                        {STORY_MISSIONS.map((item, index) => (
                            <button key={item.id} className={`${styles.missionCard} ${styles[`missionTone${index}`]}`} onClick={() => openStoryMission(item)} type="button">
                                <span className={styles.missionArt}><span>{item.character}</span><i>✦</i><b>{item.goal}</b></span>
                                <strong>{item.title}</strong>
                                <span>{item.description}</span>
                                <span className={styles.cardPlay}>JUGAR <b>▶</b></span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    if (screen === 'story-play' || screen === 'robot') {
        const robotMode = screen === 'robot';
        const title = robotMode ? 'MODO ROBOT' : 'MODO HISTORIA';
        return (
            <main className={styles.shell}>
                <KidsHeader onBack={() => { resetPuzzle(); setScreen(robotMode ? 'modes' : 'story'); }} label={title} logo={logo} />
                <section className={styles.puzzleContent}>
                    <div className={styles.puzzleIntro}>
                        <div className={styles.puzzleCharacter}>{mission.character}</div>
                        <div><div className={styles.sectionKicker}>{robotMode ? 'RETO DEL ROBOT' : 'RETO DE LA AVENTURA'}</div><h1>{mission.title}</h1><p>{mission.description}</p></div>
                    </div>
                    <div className={styles.puzzleLayout}>
                        <div className={styles.board} role="grid" aria-label="Tablero del reto">
                            {Array.from({length: 25}, (_unused, index) => {
                                const row = Math.floor(index / 5);
                                const col = index % 5;
                                const wall = mission.walls.some(cell => cell[0] === row && cell[1] === col);
                                const target = mission.target[0] === row && mission.target[1] === col;
                                const player = position[0] === row && position[1] === col;
                                return <div key={index} className={`${styles.cell} ${wall ? styles.wall : ''} ${target ? styles.target : ''}`} role="gridcell">
                                    {wall && <span>🌳</span>}{target && <span>{complete ? '✨' : mission.goal}</span>}{player && <span className={`${styles.player} ${styles[`face${direction}`]}`}>{mission.character}</span>}
                                </div>;
                            })}
                        </div>
                        <div className={styles.programPanel}>
                            <div className={styles.programTitle}><strong>Mi programa</strong><span>{commands.length}/10</span></div>
                            <div className={styles.commandRow} aria-label="Instrucciones agregadas">
                                {commands.length ? commands.map((command, index) => <span key={`${command}-${index}`} className={`${styles.commandChip} ${styles[`command${command}`]}`}>{COMMANDS.find(item => item.id === command).icon}</span>) : <span className={styles.emptyProgram}>Toca los bloques para comenzar</span>}
                            </div>
                            <div className={styles.commandPicker}>
                                {COMMANDS.map(command => <button key={command.id} className={`${styles.commandButton} ${styles[`command${command.id}`]}`} onClick={() => addCommand(command.id)} disabled={running || complete || commands.length >= 10} type="button"><span>{command.icon}</span><small>{command.label}</small></button>)}
                            </div>
                            <div className={styles.programActions}>
                                <button className={styles.softButton} onClick={() => { setCommands(value => value.slice(0, -1)); setComplete(false); }} disabled={running || !commands.length} type="button" aria-label="Quitar último bloque">⌫</button>
                                <button className={styles.softButton} onClick={resetPuzzle} disabled={running && !complete} type="button" aria-label="Empezar de nuevo">↻</button>
                                <button className={styles.runButton} onClick={runProgram} disabled={running || complete || !commands.length} type="button"><span>▶</span> ¡PROBAR!</button>
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.feedback} ${complete ? styles.success : ''}`} aria-live="polite">{feedback}</div>
                    {complete && <button type="button" className={styles.nextButton} onClick={robotMode ? resetPuzzle : () => { resetPuzzle(); setScreen('story'); }}>¡OTRA VEZ! <span>↻</span></button>}
                </section>
            </main>
        );
    }

    return null;
};

export default ScratchJrKids;
