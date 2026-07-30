/**
 * STBlock - Editor de Ejercicios
 * Componente para crear y editar ejercicios de evaluaciones
 *
 * @author STB Academy
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import styles from './tutor-ejercicio-editor.css';
import { EXERCISE_TYPES, CATEGORIES } from './tutor-types';
import { generateId } from './tutor-storage';

// ═══════════════════════════════════════════════════════════
// ICONOS SVG
// ═══════════════════════════════════════════════════════════

const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    Save: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17,21 17,13 7,13 7,21" />
            <polyline points="7,3 7,8 15,8" />
        </svg>
    ),
    Eye: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Plus: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
        </svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
    ),
    Copy: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    ),
    GripVertical: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
            <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
        </svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 12,15 18,9" />
        </svg>
    ),
    ChevronUp: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18,15 12,9 6,15" />
        </svg>
    ),
    Close: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    ),
    Settings: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
    )
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════

const TutorEjercicioEditor = ({ evaluation, onSave, onClose, onPreview }) => {
    // Estado de la evaluación
    const [editedEval, setEditedEval] = useState(() => JSON.parse(JSON.stringify(evaluation)));
    const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(
        editedEval.ejercicios.length > 0 ? 0 : null
    );
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Marcar cambios
    useEffect(() => {
        setHasChanges(true);
    }, [editedEval]);

    // Actualizar metadata
    const updateMeta = useCallback((key, value) => {
        setEditedEval(prev => ({
            ...prev,
            meta: { ...prev.meta, [key]: value }
        }));
    }, []);

    // Agregar nuevo ejercicio
    const addExercise = useCallback((tipo) => {
        const typeConfig = EXERCISE_TYPES[tipo];
        const newExercise = {
            id: generateId('ej'),
            tipo,
            titulo: `Nuevo ${typeConfig.nombre}`,
            puntuacion: 10,
            ...getDefaultValues(tipo)
        };

        setEditedEval(prev => ({
            ...prev,
            ejercicios: [...prev.ejercicios, newExercise]
        }));
        setSelectedExerciseIndex(editedEval.ejercicios.length);
        setShowTypeSelector(false);
    }, [editedEval.ejercicios.length]);

    // Actualizar ejercicio
    const updateExercise = useCallback((index, updates) => {
        setEditedEval(prev => ({
            ...prev,
            ejercicios: prev.ejercicios.map((ej, i) =>
                i === index ? { ...ej, ...updates } : ej
            )
        }));
    }, []);

    // Eliminar ejercicio
    const deleteExercise = useCallback((index) => {
        setEditedEval(prev => ({
            ...prev,
            ejercicios: prev.ejercicios.filter((_, i) => i !== index)
        }));
        if (selectedExerciseIndex >= index) {
            setSelectedExerciseIndex(Math.max(0, selectedExerciseIndex - 1));
        }
        if (editedEval.ejercicios.length <= 1) {
            setSelectedExerciseIndex(null);
        }
    }, [selectedExerciseIndex, editedEval.ejercicios.length]);

    // Duplicar ejercicio
    const duplicateExercise = useCallback((index) => {
        const original = editedEval.ejercicios[index];
        const duplicate = {
            ...JSON.parse(JSON.stringify(original)),
            id: generateId('ej'),
            titulo: `${original.titulo} (copia)`
        };
        setEditedEval(prev => ({
            ...prev,
            ejercicios: [
                ...prev.ejercicios.slice(0, index + 1),
                duplicate,
                ...prev.ejercicios.slice(index + 1)
            ]
        }));
        setSelectedExerciseIndex(index + 1);
    }, [editedEval.ejercicios]);

    // Mover ejercicio
    const moveExercise = useCallback((fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= editedEval.ejercicios.length) return;
        setEditedEval(prev => {
            const ejercicios = [...prev.ejercicios];
            const [moved] = ejercicios.splice(fromIndex, 1);
            ejercicios.splice(toIndex, 0, moved);
            return { ...prev, ejercicios };
        });
        setSelectedExerciseIndex(toIndex);
    }, [editedEval.ejercicios.length]);

    // Guardar
    const handleSave = () => {
        onSave(editedEval);
    };

    const selectedExercise = selectedExerciseIndex !== null
        ? editedEval.ejercicios[selectedExerciseIndex]
        : null;

    return (
        <div className={styles.editorContainer}>
            {/* Header */}
            <header className={styles.editorHeader}>
                <div className={styles.editorHeaderLeft}>
                    <button className={styles.editorBackBtn} onClick={onClose}>
                        <Icons.Back />
                    </button>
                    <input
                        type="text"
                        className={styles.editorTitleInput}
                        value={editedEval.meta.titulo}
                        onChange={(e) => updateMeta('titulo', e.target.value)}
                        placeholder="Título de la evaluación..."
                    />
                </div>
                <div className={styles.editorHeaderRight}>
                    <button
                        className={`${styles.editorBtn} ${styles.editorBtnPreview}`}
                        onClick={onPreview}
                    >
                        <Icons.Eye /> Previsualizar
                    </button>
                    <button
                        className={`${styles.editorBtn} ${styles.editorBtnSave}`}
                        onClick={handleSave}
                    >
                        <Icons.Save /> Guardar
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className={styles.editorBody}>
                {/* Sidebar - Lista de ejercicios */}
                <aside className={styles.editorSidebar}>
                    <div className={styles.editorSidebarHeader}>
                        <h3 className={styles.editorSidebarTitle}>
                            📝 Ejercicios ({editedEval.ejercicios.length})
                        </h3>
                        <button
                            className={styles.editorAddBtn}
                            onClick={() => setShowTypeSelector(true)}
                            title="Agregar ejercicio"
                        >
                            <Icons.Plus />
                        </button>
                    </div>
                    <div className={styles.editorExercisesList}>
                        {editedEval.ejercicios.map((ejercicio, index) => (
                            <ExerciseListItem
                                key={ejercicio.id}
                                exercise={ejercicio}
                                index={index}
                                isSelected={selectedExerciseIndex === index}
                                onSelect={() => setSelectedExerciseIndex(index)}
                                onDelete={() => deleteExercise(index)}
                                onDuplicate={() => duplicateExercise(index)}
                                onMoveUp={() => moveExercise(index, index - 1)}
                                onMoveDown={() => moveExercise(index, index + 1)}
                            />
                        ))}
                        {editedEval.ejercicios.length === 0 && (
                            <div className={styles.editorEmptyState} style={{ padding: '20px', textAlign: 'center' }}>
                                <p style={{ color: '#888', fontSize: '13px' }}>
                                    No hay ejercicios.<br />
                                    Haz clic en + para agregar.
                                </p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main - Editor de ejercicio */}
                <main className={styles.editorMain}>
                    <div className={styles.editorMainScroll}>
                        {/* Panel de Metadata */}
                        <MetadataPanel
                            meta={editedEval.meta}
                            onChange={updateMeta}
                            isOpen={showMetadata}
                            onToggle={() => setShowMetadata(!showMetadata)}
                        />

                        {/* Editor del ejercicio seleccionado */}
                        {selectedExercise ? (
                            <ExerciseForm
                                exercise={selectedExercise}
                                onChange={(updates) => updateExercise(selectedExerciseIndex, updates)}
                            />
                        ) : (
                            <div className={styles.editorEmptyState}>
                                <div className={styles.editorEmptyIcon}>📝</div>
                                <h3>Selecciona un ejercicio</h3>
                                <p>
                                    Elige un ejercicio de la lista o crea uno nuevo
                                    haciendo clic en el botón +
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Type Selector Modal */}
            {showTypeSelector && (
                <TypeSelectorModal
                    onSelect={addExercise}
                    onClose={() => setShowTypeSelector(false)}
                />
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Item de ejercicio en sidebar
// ═══════════════════════════════════════════════════════════

const ExerciseListItem = ({
    exercise,
    index,
    isSelected,
    onSelect,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown
}) => {
    const typeConfig = EXERCISE_TYPES[exercise.tipo];

    return (
        <div
            className={`${styles.exerciseItem} ${isSelected ? styles.selected : ''}`}
            onClick={onSelect}
        >
            <div className={styles.exerciseItemHeader}>
                <span className={styles.exerciseDragHandle}>
                    <Icons.GripVertical />
                </span>
                <span className={styles.exerciseNumber}>{index + 1}</span>
                <div className={styles.exerciseItemInfo}>
                    <h4 className={styles.exerciseItemTitle}>{exercise.titulo}</h4>
                    <p className={styles.exerciseItemType}>
                        {typeConfig?.icono} {typeConfig?.nombre || exercise.tipo}
                    </p>
                </div>
                <div className={styles.exerciseItemActions} onClick={(e) => e.stopPropagation()}>
                    <button
                        className={styles.exerciseActionBtn}
                        onClick={onDuplicate}
                        title="Duplicar"
                    >
                        <Icons.Copy />
                    </button>
                    <button
                        className={`${styles.exerciseActionBtn} ${styles.danger}`}
                        onClick={onDelete}
                        title="Eliminar"
                    >
                        <Icons.Trash />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Panel de Metadata
// ═══════════════════════════════════════════════════════════

const MetadataPanel = ({ meta, onChange, isOpen, onToggle }) => {
    return (
        <div className={styles.metadataPanel}>
            <div className={styles.metadataHeader}>
                <h3><Icons.Settings /> Configuración de Evaluación</h3>
                <button className={styles.metadataToggle} onClick={onToggle}>
                    {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                </button>
            </div>
            {isOpen && (
                <div className={styles.metadataBody}>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Descripción</label>
                            <textarea
                                className={`${styles.formInput} ${styles.formTextarea}`}
                                value={meta.descripcion || ''}
                                onChange={(e) => onChange('descripcion', e.target.value)}
                                placeholder="Descripción breve de la evaluación..."
                                rows={2}
                            />
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Tiempo límite (minutos)</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={meta.tiempo_limite_minutos || ''}
                                onChange={(e) => onChange('tiempo_limite_minutos', parseInt(e.target.value) || 0)}
                                min="0"
                                placeholder="0 = sin límite"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Nivel</label>
                            <select
                                className={`${styles.formInput} ${styles.formSelect}`}
                                value={meta.nivel || ''}
                                onChange={(e) => onChange('nivel', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="principiante">Principiante</option>
                                <option value="intermedio">Intermedio</option>
                                <option value="avanzado">Avanzado</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Etiquetas</label>
                        <TagsInput
                            tags={meta.tags || []}
                            onChange={(tags) => onChange('tags', tags)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Input de Tags
// ═══════════════════════════════════════════════════════════

const TagsInput = ({ tags, onChange }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (index) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.tagsInputContainer}>
            {tags.map((tag, index) => (
                <span key={index} className={styles.tagChip}>
                    {tag}
                    <button
                        className={styles.tagRemove}
                        onClick={() => removeTag(index)}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                type="text"
                className={styles.tagInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? 'Escribe y presiona Enter...' : ''}
            />
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Formulario de Ejercicio
// ═══════════════════════════════════════════════════════════

const ExerciseForm = ({ exercise, onChange }) => {
    const typeConfig = EXERCISE_TYPES[exercise.tipo];

    if (!typeConfig) {
        return <div>Tipo de ejercicio no reconocido: {exercise.tipo}</div>;
    }

    return (
        <div className={styles.exerciseForm}>
            <div className={styles.exerciseFormHeader}>
                <div
                    className={styles.exerciseFormIcon}
                    style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}
                >
                    {typeConfig.icono}
                </div>
                <div className={styles.exerciseFormHeaderInfo}>
                    <h3>{typeConfig.nombre}</h3>
                    <p>{typeConfig.descripcion}</p>
                </div>
            </div>

            <div className={styles.exerciseFormBody}>
                {/* Título del ejercicio */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Título del ejercicio</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={exercise.titulo || ''}
                        onChange={(e) => onChange({ titulo: e.target.value })}
                        placeholder="Título descriptivo..."
                    />
                </div>

                {/* Puntuación */}
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Puntuación</label>
                        <input
                            type="number"
                            className={styles.formInput}
                            value={exercise.puntuacion || 0}
                            onChange={(e) => onChange({ puntuacion: parseInt(e.target.value) || 0 })}
                            min="0"
                        />
                    </div>
                </div>

                {/* Campos específicos según el tipo */}
                <SpecificFields
                    type={exercise.tipo}
                    exercise={exercise}
                    onChange={onChange}
                    typeConfig={typeConfig}
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Campos específicos por tipo
// ═══════════════════════════════════════════════════════════

const SpecificFields = ({ type, exercise, onChange, typeConfig }) => {
    switch (type) {
        case 'quiz':
        case 'que_hace_codigo':
            return (
                <>
                    {type === 'que_hace_codigo' && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Código a analizar</label>
                            <textarea
                                className={`${styles.formInput} ${styles.formTextarea} ${styles.formCode}`}
                                value={exercise.codigo || ''}
                                onChange={(e) => onChange({ codigo: e.target.value })}
                                placeholder="Escribe el código aquí..."
                                rows={5}
                            />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Pregunta</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={exercise.pregunta || ''}
                            onChange={(e) => onChange({ pregunta: e.target.value })}
                            placeholder="¿Cuál es la pregunta?"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Opciones
                            <span className={styles.formLabelHint}>(marca la correcta)</span>
                        </label>
                        <OptionsEditor
                            options={exercise.opciones || []}
                            correctIndex={exercise.correcta}
                            onChange={(opciones) => onChange({ opciones })}
                            onCorrectChange={(correcta) => onChange({ correcta })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Explicación (opcional)</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea}`}
                            value={exercise.explicacion || ''}
                            onChange={(e) => onChange({ explicacion: e.target.value })}
                            placeholder="Explica por qué esta es la respuesta correcta..."
                            rows={2}
                        />
                    </div>
                </>
            );

        case 'verdadero_falso':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Afirmación</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={exercise.afirmacion || ''}
                            onChange={(e) => onChange({ afirmacion: e.target.value })}
                            placeholder="Escribe la afirmación a evaluar..."
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Respuesta correcta</label>
                        <div className={styles.formToggle}>
                            <button
                                className={`${styles.toggleOption} ${styles.true} ${exercise.respuesta === true ? styles.selected : ''}`}
                                onClick={() => onChange({ respuesta: true })}
                            >
                                ✓ Verdadero
                            </button>
                            <button
                                className={`${styles.toggleOption} ${styles.false} ${exercise.respuesta === false ? styles.selected : ''}`}
                                onClick={() => onChange({ respuesta: false })}
                            >
                                ✗ Falso
                            </button>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Explicación</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea}`}
                            value={exercise.explicacion || ''}
                            onChange={(e) => onChange({ explicacion: e.target.value })}
                            placeholder="¿Por qué es verdadero/falso?"
                            rows={2}
                        />
                    </div>
                </>
            );

        case 'completar_codigo':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Código con huecos
                            <span className={styles.formLabelHint}>Usa {'{{nombre}}'} para crear huecos</span>
                        </label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea} ${styles.formCode}`}
                            value={exercise.codigo || ''}
                            onChange={(e) => onChange({ codigo: e.target.value })}
                            placeholder="for _ in range({{veces}}):\n    sprite.mover({{pasos}})"
                            rows={6}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Respuestas de los huecos</label>
                        <BlanksEditor
                            codigo={exercise.codigo || ''}
                            blanks={exercise.blanks || {}}
                            onChange={(blanks) => onChange({ blanks })}
                        />
                    </div>
                </>
            );

        case 'ordenar_bloques':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Instrucción</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={exercise.instruccion || ''}
                            onChange={(e) => onChange({ instruccion: e.target.value })}
                            placeholder="Ordena los bloques para..."
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Bloques a ordenar
                            <span className={styles.formLabelHint}>(en el orden correcto)</span>
                        </label>
                        <BlocksEditor
                            blocks={exercise.bloques || []}
                            onChange={(bloques) => onChange({ bloques, orden_correcto: bloques.map((_, i) => i) })}
                        />
                    </div>
                </>
            );

        case 'multiple_respuesta':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Pregunta</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={exercise.pregunta || ''}
                            onChange={(e) => onChange({ pregunta: e.target.value })}
                            placeholder="¿Cuáles de estos...?"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Opciones
                            <span className={styles.formLabelHint}>(marca todas las correctas)</span>
                        </label>
                        <MultiOptionsEditor
                            options={exercise.opciones || []}
                            correctIndices={exercise.correctas || []}
                            onChange={(opciones) => onChange({ opciones })}
                            onCorrectChange={(correctas) => onChange({ correctas })}
                        />
                    </div>
                </>
            );

        case 'escribir_codigo':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Instrucción</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea}`}
                            value={exercise.instruccion || ''}
                            onChange={(e) => onChange({ instruccion: e.target.value })}
                            placeholder="Describe qué debe hacer el código..."
                            rows={3}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Código inicial (opcional)</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea} ${styles.formCode}`}
                            value={exercise.codigo_inicial || ''}
                            onChange={(e) => onChange({ codigo_inicial: e.target.value })}
                            placeholder="def inicio():\n    "
                            rows={4}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Solución de referencia</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea} ${styles.formCode}`}
                            value={exercise.solucion || ''}
                            onChange={(e) => onChange({ solucion: e.target.value })}
                            placeholder="def inicio():\n    sprite.mover(100)"
                            rows={6}
                        />
                    </div>
                </>
            );

        case 'relacionar':
            return (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Instrucción</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={exercise.instruccion || ''}
                            onChange={(e) => onChange({ instruccion: e.target.value })}
                            placeholder="Relaciona cada elemento con..."
                        />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Columna A (izquierda)</label>
                            <ListEditor
                                items={exercise.columna_a || []}
                                onChange={(columna_a) => onChange({ columna_a })}
                                placeholder="Elemento..."
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Columna B (derecha)</label>
                            <ListEditor
                                items={exercise.columna_b || []}
                                onChange={(columna_b) => onChange({ columna_b })}
                                placeholder="Relación..."
                            />
                        </div>
                    </div>
                </>
            );

        default:
            return (
                <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                    Editor para "{type}" no implementado aún.
                </div>
            );
    }
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Editor de Opciones (single select)
// ═══════════════════════════════════════════════════════════

const OptionsEditor = ({ options, correctIndex, onChange, onCorrectChange }) => {
    const addOption = () => {
        onChange([...options, '']);
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(newOptions);
    };

    const deleteOption = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        onChange(newOptions);
        if (correctIndex === index) {
            onCorrectChange(null);
        } else if (correctIndex > index) {
            onCorrectChange(correctIndex - 1);
        }
    };

    return (
        <div className={styles.optionsList}>
            {options.map((option, index) => (
                <div key={index} className={styles.optionItem}>
                    <span className={styles.optionIndex}>{String.fromCharCode(65 + index)}</span>
                    <input
                        type="text"
                        className={styles.optionInput}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Opción ${index + 1}...`}
                    />
                    <button
                        className={`${styles.optionCorrectBtn} ${correctIndex === index ? styles.selected : ''}`}
                        onClick={() => onCorrectChange(index)}
                        title="Marcar como correcta"
                    >
                        <Icons.Check />
                    </button>
                    <button
                        className={styles.optionDeleteBtn}
                        onClick={() => deleteOption(index)}
                        title="Eliminar opción"
                    >
                        <Icons.Close />
                    </button>
                </div>
            ))}
            <button className={styles.addOptionBtn} onClick={addOption}>
                <Icons.Plus /> Agregar opción
            </button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Editor de Opciones (multi select)
// ═══════════════════════════════════════════════════════════

const MultiOptionsEditor = ({ options, correctIndices, onChange, onCorrectChange }) => {
    const addOption = () => {
        onChange([...options, '']);
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(newOptions);
    };

    const toggleCorrect = (index) => {
        if (correctIndices.includes(index)) {
            onCorrectChange(correctIndices.filter(i => i !== index));
        } else {
            onCorrectChange([...correctIndices, index].sort());
        }
    };

    const deleteOption = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        onChange(newOptions);
        onCorrectChange(correctIndices.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    };

    return (
        <div className={styles.optionsList}>
            {options.map((option, index) => (
                <div key={index} className={styles.optionItem}>
                    <span className={styles.optionIndex}>{String.fromCharCode(65 + index)}</span>
                    <input
                        type="text"
                        className={styles.optionInput}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Opción ${index + 1}...`}
                    />
                    <button
                        className={`${styles.optionCorrectBtn} ${correctIndices.includes(index) ? styles.selected : ''}`}
                        onClick={() => toggleCorrect(index)}
                        title="Marcar/desmarcar como correcta"
                    >
                        <Icons.Check />
                    </button>
                    <button
                        className={styles.optionDeleteBtn}
                        onClick={() => deleteOption(index)}
                    >
                        <Icons.Close />
                    </button>
                </div>
            ))}
            <button className={styles.addOptionBtn} onClick={addOption}>
                <Icons.Plus /> Agregar opción
            </button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Editor de Blanks (huecos)
// ═══════════════════════════════════════════════════════════

const BlanksEditor = ({ codigo, blanks, onChange }) => {
    // Extraer nombres de huecos del código
    const blankNames = [...(codigo.matchAll(/\{\{(\w+)\}\}/g))].map(m => m[1]);
    const uniqueNames = [...new Set(blankNames)];

    const updateBlank = (name, field, value) => {
        onChange({
            ...blanks,
            [name]: {
                ...blanks[name],
                [field]: value
            }
        });
    };

    if (uniqueNames.length === 0) {
        return (
            <div style={{ padding: '16px', background: '#f8faf9', borderRadius: '8px', color: '#888', fontSize: '13px' }}>
                No se detectaron huecos. Usa la sintaxis {'{{nombre}}'} en el código.
            </div>
        );
    }

    return (
        <div className={styles.blanksList}>
            {uniqueNames.map(name => (
                <div key={name} className={styles.blankItem}>
                    <div className={styles.blankHeader}>
                        <span className={styles.blankName}>{`{{${name}}}`}</span>
                    </div>
                    <div className={styles.blankFields}>
                        <div>
                            <div className={styles.blankFieldLabel}>Valores válidos (separados por coma)</div>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={(blanks[name]?.validos || []).join(', ')}
                                onChange={(e) => updateBlank(name, 'validos', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                placeholder="10, 5, 15"
                            />
                        </div>
                        <div>
                            <div className={styles.blankFieldLabel}>Pistas (una por línea)</div>
                            <textarea
                                className={`${styles.formInput} ${styles.formTextarea}`}
                                value={(blanks[name]?.pistas || []).join('\n')}
                                onChange={(e) => updateBlank(name, 'pistas', e.target.value.split('\n').filter(Boolean))}
                                placeholder="Primera pista...\nSegunda pista..."
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Editor de Bloques
// ═══════════════════════════════════════════════════════════

const BlocksEditor = ({ blocks, onChange }) => {
    const addBlock = () => {
        onChange([...blocks, '']);
    };

    const updateBlock = (index, value) => {
        const newBlocks = [...blocks];
        newBlocks[index] = value;
        onChange(newBlocks);
    };

    const deleteBlock = (index) => {
        onChange(blocks.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.blocksEditor}>
            {blocks.map((block, index) => (
                <div key={index} className={styles.blockItemEditor}>
                    <Icons.GripVertical />
                    <span className={styles.blockOrder}>{index + 1}</span>
                    <input
                        type="text"
                        className={styles.blockTextInput}
                        value={block}
                        onChange={(e) => updateBlock(index, e.target.value)}
                        placeholder="Texto del bloque..."
                    />
                    <button
                        className={styles.optionDeleteBtn}
                        onClick={() => deleteBlock(index)}
                    >
                        <Icons.Close />
                    </button>
                </div>
            ))}
            <button className={styles.addOptionBtn} onClick={addBlock}>
                <Icons.Plus /> Agregar bloque
            </button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Editor de Lista simple
// ═══════════════════════════════════════════════════════════

const ListEditor = ({ items, onChange, placeholder }) => {
    const addItem = () => {
        onChange([...items, '']);
    };

    const updateItem = (index, value) => {
        const newItems = [...items];
        newItems[index] = value;
        onChange(newItems);
    };

    const deleteItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.optionsList}>
            {items.map((item, index) => (
                <div key={index} className={styles.optionItem}>
                    <span className={styles.optionIndex}>{index + 1}</span>
                    <input
                        type="text"
                        className={styles.optionInput}
                        value={item}
                        onChange={(e) => updateItem(index, e.target.value)}
                        placeholder={placeholder}
                    />
                    <button
                        className={styles.optionDeleteBtn}
                        onClick={() => deleteItem(index)}
                    >
                        <Icons.Close />
                    </button>
                </div>
            ))}
            <button className={styles.addOptionBtn} onClick={addItem}>
                <Icons.Plus /> Agregar
            </button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Modal de selección de tipo
// ═══════════════════════════════════════════════════════════

const TypeSelectorModal = ({ onSelect, onClose }) => {
    const exercisesByCategory = {
        basico: Object.values(EXERCISE_TYPES).filter(t => t.categoria === 'basico'),
        interactivo: Object.values(EXERCISE_TYPES).filter(t => t.categoria === 'interactivo'),
        avanzado: Object.values(EXERCISE_TYPES).filter(t => t.categoria === 'avanzado')
    };

    return (
        <div className={styles.typeSelectorOverlay} onClick={onClose}>
            <div className={styles.typeSelector} onClick={(e) => e.stopPropagation()}>
                <div className={styles.typeSelectorHeader}>
                    <h2>Selecciona el tipo de ejercicio</h2>
                    <button className={styles.typeSelectorClose} onClick={onClose}>
                        <Icons.Close />
                    </button>
                </div>
                <div className={styles.typeSelectorBody}>
                    {Object.entries(CATEGORIES).map(([key, category]) => (
                        <div key={key} className={styles.typeCategory}>
                            <h3 className={styles.typeCategoryTitle}>
                                {category.icono} {category.nombre}
                            </h3>
                            <div className={styles.typeGrid}>
                                {exercisesByCategory[key]?.map(type => (
                                    <div
                                        key={type.id}
                                        className={styles.typeCard}
                                        onClick={() => onSelect(type.id)}
                                    >
                                        <div className={styles.typeCardIcon}>{type.icono}</div>
                                        <h4 className={styles.typeCardName}>{type.nombre}</h4>
                                        <p className={styles.typeCardDesc}>{type.descripcion}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// HELPER: Valores por defecto para cada tipo
// ═══════════════════════════════════════════════════════════

const getDefaultValues = (tipo) => {
    switch (tipo) {
        case 'quiz':
            return { pregunta: '', opciones: ['', '', '', ''], correcta: null, explicacion: '' };
        case 'verdadero_falso':
            return { afirmacion: '', respuesta: true, explicacion: '' };
        case 'completar_codigo':
            return { codigo: '', blanks: {} };
        case 'ordenar_bloques':
            return { instruccion: '', bloques: [], orden_correcto: [] };
        case 'que_hace_codigo':
            return { codigo: '', pregunta: '', opciones: ['', '', '', ''], correcta: null };
        case 'escribir_codigo':
            return { instruccion: '', codigo_inicial: '', solucion: '', validacion: {} };
        case 'multiple_respuesta':
            return { pregunta: '', opciones: [], correctas: [] };
        case 'relacionar':
            return { instruccion: '', columna_a: [], columna_b: [], relaciones: [] };
        case 'depurar_codigo':
            return { instruccion: '', codigo_con_error: '', codigo_correcto: '' };
        case 'reto_ejecucion':
            return { instruccion: '', objetivo: {}, codigo_inicial: '', validacion: {} };
        default:
            return {};
    }
};

export default TutorEjercicioEditor;
