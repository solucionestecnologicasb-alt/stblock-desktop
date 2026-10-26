import React from 'react';
import mascotImage from '../../lib/default-project/stblock-mascot.png';
import styles from './experience-selector.css';

const ExperienceSelector = ({onSelect}) => (
    <main className={styles.screen}>
        <div className={styles.confetti} aria-hidden="true">
            <span>✦</span><span>●</span><span>✦</span><span>●</span><span>✦</span>
        </div>
        <header className={styles.brand}>
            <img src={mascotImage} alt="" />
            <div>
                <strong>ST<span>Block</span></strong>
                <small>¡Vamos a crear!</small>
            </div>
        </header>
        <section className={styles.content} aria-labelledby="experience-title">
            <div className={styles.mascotStage}>
                <div className={styles.mascotHalo} />
                <img src={mascotImage} alt="La mascota de STBlock" />
                <span className={styles.sparkle}>✦</span>
                <span className={styles.bubble}>¡Hola!</span>
            </div>
            <h1 id="experience-title">¿Qué vamos a explorar hoy?</h1>
            <p className={styles.subtitle}>Elige tu espacio para empezar a jugar y crear.</p>
            <div className={styles.choices}>
                <button className={`${styles.choice} ${styles.jr}`} onClick={() => onSelect('jr')}>
                    <span className={styles.choiceIcon} aria-hidden="true">🧩</span>
                    <span className={styles.choiceName}>STBlock</span>
                    <span className={styles.choiceDescription}>Programación, electrónica y creación</span>
                    <span className={styles.choiceArrow} aria-hidden="true">➜</span>
                </button>
                <button className={`${styles.choice} ${styles.kids}`} onClick={() => onSelect('kids')}>
                    <span className={styles.choiceIcon} aria-hidden="true">🌈</span>
                    <span className={styles.choiceName}>STBlock Kids</span>
                    <span className={styles.choiceDescription}>Aventuras para imaginar y descubrir</span>
                    <span className={styles.choiceArrow} aria-hidden="true">➜</span>
                </button>
            </div>
            <p className={styles.footer}>Toca una tarjeta para comenzar</p>
        </section>
    </main>
);

export default ExperienceSelector;
