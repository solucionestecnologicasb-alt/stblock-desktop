/**
 * STBlock - Vista Previa de Evaluación
 * Permite probar la evaluación como lo haría un estudiante
 *
 * @author STB Academy
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import styles from './tutor-preview.css';
import { EXERCISE_TYPES } from './tutor-types';

// ═══════════════════════════════════════════════════════════
// ICONOS SVG
// ═══════════════════════════════════════════════════════════

const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    Edit: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    Refresh: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
        </svg>
    ),
    ChevronRight: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9,18 15,12 9,6" />
        </svg>
    ),
    Check: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" />
        </svg>
    ),
    X: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    ),
    GripVertical: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
            <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
        </svg>
    )
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════

const TutorPreview = ({ evaluation, onClose, onEdit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState({});
    const [showResults, setShowResults] = useState(false);

    const ejercicios = evaluation.ejercicios || [];
    const currentExercise = ejercicios[currentIndex];
    const totalExercises = ejercicios.length;

    // Calcular progreso
    const answeredCount = Object.keys(submitted).length;
    const progress = totalExercises > 0 ? (answeredCount / totalExercises) * 100 : 0;

    // Calcular puntuación
    const { correctCount, incorrectCount, totalScore, earnedScore } = useMemo(() => {
        let correct = 0;
        let incorrect = 0;
        let total = 0;
        let earned = 0;

        ejercicios.forEach((ej, index) => {
            total += ej.puntuacion || 0;
            if (submitted[index]) {
                const isCorrect = checkAnswer(ej, answers[index]);
                if (isCorrect) {
                    correct++;
                    earned += ej.puntuacion || 0;
                } else {
                    incorrect++;
                }
            }
        });

        return { correctCount: correct, incorrectCount: incorrect, totalScore: total, earnedScore: earned };
    }, [ejercicios, answers, submitted]);

    // Guardar respuesta
    const handleAnswer = useCallback((answer) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
    }, [currentIndex]);

    // Enviar respuesta actual
    const handleSubmit = useCallback(() => {
        setSubmitted(prev => ({ ...prev, [currentIndex]: true }));
    }, [currentIndex]);

    // Siguiente ejercicio
    const handleNext = useCallback(() => {
        if (currentIndex < totalExercises - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setShowResults(true);
        }
    }, [currentIndex, totalExercises]);

    // Anterior ejercicio
    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    // Reiniciar
    const handleRestart = useCallback(() => {
        setCurrentIndex(0);
        setAnswers({});
        setSubmitted({});
        setShowResults(false);
    }, []);

    // Pantalla de resultados
    if (showResults) {
        const percentage = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;
        const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : percentage >= 40 ? '💪' : '📚';

        return (
            <div className={styles.previewContainer}>
                <header className={styles.previewHeader}>
                    <div className={styles.previewHeaderLeft}>
                        <button className={styles.previewBackBtn} onClick={onClose}>
                            <Icons.Back />
                        </button>
                        <h1 className={styles.previewTitle}>{evaluation.meta?.titulo}</h1>
                    </div>
                </header>

                <div className={styles.previewContent}>
                    <div className={styles.exercisePreviewCard}>
                        <div className={styles.resultsScreen}>
                            <div className={styles.resultsIcon}>{emoji}</div>
                            <h2 className={styles.resultsTitle}>
                                {percentage >= 80 ? '¡Excelente trabajo!' :
                                    percentage >= 60 ? '¡Buen trabajo!' :
                                        percentage >= 40 ? '¡Sigue practicando!' : '¡No te rindas!'}
                            </h2>
                            <p className={styles.resultsSubtitle}>Has completado la evaluación</p>

                            <div className={styles.resultsScore}>
                                <span className={styles.resultsScoreValue}>{earnedScore}/{totalScore}</span>
                                <span className={styles.resultsScoreLabel}>puntos obtenidos</span>
                            </div>

                            <div className={styles.resultsStats}>
                                <div className={styles.resultsStat}>
                                    <span className={`${styles.resultsStatValue} ${styles.correct}`}>{correctCount}</span>
                                    <span className={styles.resultsStatLabel}>Correctas</span>
                                </div>
                                <div className={styles.resultsStat}>
                                    <span className={`${styles.resultsStatValue} ${styles.incorrect}`}>{incorrectCount}</span>
                                    <span className={styles.resultsStatLabel}>Incorrectas</span>
                                </div>
                                <div className={styles.resultsStat}>
                                    <span className={styles.resultsStatValue} style={{ color: '#4C97FF' }}>{percentage}%</span>
                                    <span className={styles.resultsStatLabel}>Porcentaje</span>
                                </div>
                            </div>

                            <div className={styles.resultsActions}>
                                <button
                                    className={`${styles.navBtn} ${styles.navBtnPrev}`}
                                    onClick={handleRestart}
                                >
                                    <Icons.Refresh /> Intentar de nuevo
                                </button>
                                <button
                                    className={`${styles.navBtn} ${styles.navBtnNext}`}
                                    onClick={onEdit}
                                >
                                    <Icons.Edit /> Editar evaluación
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.previewContainer}>
            {/* Header */}
            <header className={styles.previewHeader}>
                <div className={styles.previewHeaderLeft}>
                    <button className={styles.previewBackBtn} onClick={onClose}>
                        <Icons.Back />
                    </button>
                    <h1 className={styles.previewTitle}>{evaluation.meta?.titulo}</h1>
                    <span className={styles.previewBadge}>Vista previa</span>
                </div>
                <div className={styles.previewHeaderRight}>
                    <button
                        className={`${styles.previewBtn} ${styles.previewBtnEdit}`}
                        onClick={onEdit}
                    >
                        <Icons.Edit /> Editar
                    </button>
                    <button
                        className={`${styles.previewBtn} ${styles.previewBtnRestart}`}
                        onClick={handleRestart}
                    >
                        <Icons.Refresh /> Reiniciar
                    </button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className={styles.previewProgress}>
                <div className={styles.progressInfo}>
                    <span className={styles.progressIcon}>📝</span>
                    <span>Ejercicio {currentIndex + 1} de {totalExercises}</span>
                </div>
                <div className={styles.progressBarContainer}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className={styles.progressStats}>
                    <span className={`${styles.progressStat} ${styles.correct}`}>
                        ✓ {correctCount}
                    </span>
                    <span className={`${styles.progressStat} ${styles.incorrect}`}>
                        ✗ {incorrectCount}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className={styles.previewContent}>
                {currentExercise ? (
                    <ExercisePreview
                        exercise={currentExercise}
                        answer={answers[currentIndex]}
                        isSubmitted={submitted[currentIndex]}
                        onAnswer={handleAnswer}
                        onSubmit={handleSubmit}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        canGoPrev={currentIndex > 0}
                        canGoNext={true}
                        isLast={currentIndex === totalExercises - 1}
                    />
                ) : (
                    <div className={styles.exercisePreviewCard}>
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                            No hay ejercicios en esta evaluación
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Preview de Ejercicio Individual
// ═══════════════════════════════════════════════════════════

const ExercisePreview = ({
    exercise,
    answer,
    isSubmitted,
    onAnswer,
    onSubmit,
    onNext,
    onPrev,
    canGoPrev,
    canGoNext,
    isLast
}) => {
    const typeConfig = EXERCISE_TYPES[exercise.tipo];
    const isCorrect = isSubmitted ? checkAnswer(exercise, answer) : null;

    return (
        <div className={styles.exercisePreviewCard}>
            {/* Header */}
            <div className={styles.exercisePreviewHeader}>
                <div className={styles.exercisePreviewType}>
                    <div
                        className={styles.exercisePreviewTypeIcon}
                        style={{ background: `${typeConfig?.color}20`, color: typeConfig?.color }}
                    >
                        {typeConfig?.icono}
                    </div>
                    <span className={styles.exercisePreviewTypeName}>{typeConfig?.nombre}</span>
                </div>
                <h2 className={styles.exercisePreviewTitle}>{exercise.titulo}</h2>
                <p className={styles.exercisePreviewPoints}>
                    ⭐ {exercise.puntuacion} puntos
                </p>
            </div>

            {/* Body */}
            <div className={styles.exercisePreviewBody}>
                <ExerciseContent
                    type={exercise.tipo}
                    exercise={exercise}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    onAnswer={onAnswer}
                />

                {/* Feedback */}
                {isSubmitted && (
                    <div className={`${styles.exerciseFeedback} ${isCorrect ? styles.correct : styles.incorrect}`}>
                        <span className={styles.feedbackIcon}>
                            {isCorrect ? '✅' : '❌'}
                        </span>
                        <div className={styles.feedbackContent}>
                            <h4>{isCorrect ? '¡Correcto!' : 'Incorrecto'}</h4>
                            {exercise.explicacion && (
                                <p>{exercise.explicacion}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={styles.exercisePreviewFooter}>
                <button
                    className={`${styles.navBtn} ${styles.navBtnPrev}`}
                    onClick={onPrev}
                    disabled={!canGoPrev}
                >
                    <Icons.ChevronLeft /> Anterior
                </button>

                {!isSubmitted ? (
                    <button
                        className={`${styles.navBtn} ${styles.navBtnNext}`}
                        onClick={onSubmit}
                        disabled={answer === undefined || answer === null}
                    >
                        Comprobar
                    </button>
                ) : (
                    <button
                        className={`${styles.navBtn} ${styles.navBtnNext} ${isLast ? styles.navBtnSubmit : ''}`}
                        onClick={onNext}
                    >
                        {isLast ? 'Ver resultados' : 'Siguiente'} <Icons.ChevronRight />
                    </button>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Contenido específico por tipo
// ═══════════════════════════════════════════════════════════

const ExerciseContent = ({ type, exercise, answer, isSubmitted, onAnswer }) => {
    switch (type) {
        case 'quiz':
        case 'que_hace_codigo':
            return (
                <>
                    {type === 'que_hace_codigo' && exercise.codigo && (
                        <div className={styles.codePreview}>
                            <pre style={{ margin: 0, color: '#d4d4d4' }}>{exercise.codigo}</pre>
                        </div>
                    )}
                    <p className={styles.quizQuestion}>{exercise.pregunta}</p>
                    <div className={styles.quizOptions}>
                        {(exercise.opciones || []).map((opcion, index) => {
                            const isSelected = answer === index;
                            const isCorrectOption = exercise.correcta === index;
                            let className = styles.quizOption;

                            if (isSubmitted) {
                                className += ` ${styles.disabled}`;
                                if (isCorrectOption) className += ` ${styles.correct}`;
                                else if (isSelected) className += ` ${styles.incorrect}`;
                            } else if (isSelected) {
                                className += ` ${styles.selected}`;
                            }

                            return (
                                <div
                                    key={index}
                                    className={className}
                                    onClick={() => !isSubmitted && onAnswer(index)}
                                >
                                    <span className={styles.quizOptionLetter}>
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className={styles.quizOptionText}>{opcion}</span>
                                    {isSubmitted && isCorrectOption && (
                                        <span className={styles.quizOptionIcon}>✓</span>
                                    )}
                                    {isSubmitted && isSelected && !isCorrectOption && (
                                        <span className={styles.quizOptionIcon}>✗</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            );

        case 'verdadero_falso':
            return (
                <>
                    <p className={styles.tfStatement}>{exercise.afirmacion}</p>
                    <div className={styles.tfOptions}>
                        {[true, false].map(value => {
                            const isSelected = answer === value;
                            const isCorrectOption = exercise.respuesta === value;
                            let className = `${styles.tfOption} ${value ? styles.true : styles.false}`;

                            if (isSubmitted) {
                                className += ` ${styles.disabled}`;
                                if (isSelected) className += ` ${styles.selected}`;
                            } else if (isSelected) {
                                className += ` ${styles.selected}`;
                            }

                            return (
                                <div
                                    key={String(value)}
                                    className={className}
                                    onClick={() => !isSubmitted && onAnswer(value)}
                                >
                                    <div className={styles.tfOptionIcon}>
                                        {value ? '✓' : '✗'}
                                    </div>
                                    <div className={styles.tfOptionText}>
                                        {value ? 'Verdadero' : 'Falso'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            );

        case 'completar_codigo':
            return (
                <CompleteCodePreview
                    exercise={exercise}
                    answer={answer || {}}
                    isSubmitted={isSubmitted}
                    onAnswer={onAnswer}
                />
            );

        case 'ordenar_bloques':
            return (
                <OrderBlocksPreview
                    exercise={exercise}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    onAnswer={onAnswer}
                />
            );

        case 'multiple_respuesta':
            return (
                <>
                    <p className={styles.quizQuestion}>{exercise.pregunta}</p>
                    <div className={styles.quizOptions}>
                        {(exercise.opciones || []).map((opcion, index) => {
                            const currentAnswer = answer || [];
                            const isSelected = currentAnswer.includes(index);
                            const isCorrectOption = (exercise.correctas || []).includes(index);
                            let className = styles.quizOption;

                            if (isSubmitted) {
                                className += ` ${styles.disabled}`;
                                if (isCorrectOption) className += ` ${styles.correct}`;
                                else if (isSelected) className += ` ${styles.incorrect}`;
                            } else if (isSelected) {
                                className += ` ${styles.selected}`;
                            }

                            const toggleSelect = () => {
                                if (isSubmitted) return;
                                if (isSelected) {
                                    onAnswer(currentAnswer.filter(i => i !== index));
                                } else {
                                    onAnswer([...currentAnswer, index].sort());
                                }
                            };

                            return (
                                <div
                                    key={index}
                                    className={className}
                                    onClick={toggleSelect}
                                >
                                    <span className={styles.quizOptionLetter}>
                                        {isSelected ? '☑' : '☐'}
                                    </span>
                                    <span className={styles.quizOptionText}>{opcion}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            );

        case 'escribir_codigo':
            return (
                <>
                    <p className={styles.writeInstruction}>{exercise.instruccion}</p>
                    <div className={styles.writeEditor}>
                        <div className={styles.writeEditorHeader}>
                            <span className={styles.writeEditorDot} style={{ background: '#ff5f56' }} />
                            <span className={styles.writeEditorDot} style={{ background: '#ffbd2e' }} />
                            <span className={styles.writeEditorDot} style={{ background: '#27ca40' }} />
                        </div>
                        <textarea
                            value={answer || exercise.codigo_inicial || ''}
                            onChange={(e) => !isSubmitted && onAnswer(e.target.value)}
                            placeholder="Escribe tu código aquí..."
                            disabled={isSubmitted}
                        />
                    </div>
                </>
            );

        default:
            return (
                <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                    Vista previa no disponible para este tipo de ejercicio.
                </div>
            );
    }
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Completar Código Preview
// ═══════════════════════════════════════════════════════════

const CompleteCodePreview = ({ exercise, answer, isSubmitted, onAnswer }) => {
    const codigo = exercise.codigo || '';
    const blanks = exercise.blanks || {};

    // Parsear código y reemplazar {{nombre}} con inputs
    const parts = codigo.split(/(\{\{\w+\}\})/g);

    const handleBlankChange = (blankName, value) => {
        onAnswer({ ...answer, [blankName]: value });
    };

    return (
        <div className={styles.codePreview}>
            <pre style={{ margin: 0 }}>
                {parts.map((part, index) => {
                    const match = part.match(/\{\{(\w+)\}\}/);
                    if (match) {
                        const blankName = match[1];
                        const blankConfig = blanks[blankName] || {};
                        const value = answer[blankName] || '';
                        const isCorrect = isSubmitted && blankConfig.validos?.some(v =>
                            String(v).toLowerCase().trim() === String(value).toLowerCase().trim()
                        );

                        let inputClass = '';
                        if (isSubmitted) {
                            inputClass = isCorrect ? styles.correct : styles.incorrect;
                        }

                        return (
                            <span key={index} className={styles.codeBlank}>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleBlankChange(blankName, e.target.value)}
                                    disabled={isSubmitted}
                                    className={inputClass}
                                    placeholder={blankName}
                                />
                            </span>
                        );
                    }
                    return <span key={index} className={styles.codeText}>{part}</span>;
                })}
            </pre>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Ordenar Bloques Preview
// ═══════════════════════════════════════════════════════════

const OrderBlocksPreview = ({ exercise, answer, isSubmitted, onAnswer }) => {
    const bloques = exercise.bloques || [];
    const [draggedIndex, setDraggedIndex] = useState(null);

    // Inicializar orden si no hay respuesta
    const currentOrder = answer || bloques.map((_, i) => i);

    const handleDragStart = (index) => {
        if (isSubmitted) return;
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (isSubmitted || draggedIndex === null || draggedIndex === index) return;

        const newOrder = [...currentOrder];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, removed);
        onAnswer(newOrder);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <>
            <p className={styles.orderInstruction}>{exercise.instruccion}</p>
            <div className={styles.orderBlocks}>
                {currentOrder.map((blockIndex, position) => (
                    <div
                        key={blockIndex}
                        className={`${styles.orderBlock} ${draggedIndex === position ? styles.dragging : ''}`}
                        draggable={!isSubmitted}
                        onDragStart={() => handleDragStart(position)}
                        onDragOver={(e) => handleDragOver(e, position)}
                        onDragEnd={handleDragEnd}
                    >
                        <span className={styles.orderBlockHandle}>
                            <Icons.GripVertical />
                        </span>
                        <span className={styles.orderBlockNumber}>{position + 1}</span>
                        <span className={styles.orderBlockText}>{bloques[blockIndex]}</span>
                    </div>
                ))}
            </div>
        </>
    );
};

// ═══════════════════════════════════════════════════════════
// HELPER: Verificar respuesta
// ═══════════════════════════════════════════════════════════

const checkAnswer = (exercise, answer) => {
    switch (exercise.tipo) {
        case 'quiz':
        case 'que_hace_codigo':
            return answer === exercise.correcta;

        case 'verdadero_falso':
            return answer === exercise.respuesta;

        case 'completar_codigo': {
            const blanks = exercise.blanks || {};
            return Object.keys(blanks).every(blankName => {
                const blankConfig = blanks[blankName];
                const userValue = (answer || {})[blankName];
                return blankConfig.validos?.some(v =>
                    String(v).toLowerCase().trim() === String(userValue || '').toLowerCase().trim()
                );
            });
        }

        case 'ordenar_bloques': {
            const correctOrder = exercise.orden_correcto || exercise.bloques?.map((_, i) => i);
            const userOrder = answer || [];
            return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
        }

        case 'multiple_respuesta': {
            const correctas = [...(exercise.correctas || [])].sort();
            const userAnswer = [...(answer || [])].sort();
            return JSON.stringify(userAnswer) === JSON.stringify(correctas);
        }

        case 'escribir_codigo': {
            // Validación simple: contiene patrones
            const validacion = exercise.validacion || {};
            if (validacion.tipo === 'contiene') {
                return (validacion.patrones || []).every(patron =>
                    (answer || '').includes(patron)
                );
            }
            return true; // Sin validación automática
        }

        default:
            return true;
    }
};

export default TutorPreview;
