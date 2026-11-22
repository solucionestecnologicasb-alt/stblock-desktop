/**
 * STBlock - Panel de Tutor
 * Componente principal para gestión de evaluaciones
 *
 * @author STB Academy
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './tutor-panel.css';
import { EXERCISE_TYPES, CATEGORIES } from './tutor-types';
import { getTemplatesList, createFromTemplate } from './tutor-templates';
import TutorStorage from './tutor-storage';
import TutorEjercicioEditor from './tutor-ejercicio-editor';
import TutorPreview from './tutor-preview';

// Iconos SVG inline para evitar dependencias
const Icons = {
    Close: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    ),
    Plus: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
        </svg>
    ),
    Search: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
        </svg>
    ),
    Edit: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    Trash: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
    ),
    Copy: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    ),
    Download: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
    ),
    Upload: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
    ),
    Play: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21" fill="currentColor" />
        </svg>
    ),
    Eye: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Settings: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
    ),
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
    Chart: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
    )
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════

const TutorPanel = ({ isOpen, onClose }) => {
    // Estados principales
    const [activeTab, setActiveTab] = useState('evaluaciones');
    const [evaluations, setEvaluations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvaluation, setSelectedEvaluation] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [statistics, setStatistics] = useState(null);

    // Referencia para input de archivo
    const fileInputRef = useRef(null);

    // Cargar evaluaciones al montar
    useEffect(() => {
        if (isOpen) {
            loadEvaluations();
            loadStatistics();
        }
    }, [isOpen]);

    const loadEvaluations = useCallback(() => {
        const evals = TutorStorage.getAllEvaluations();
        setEvaluations(evals);
    }, []);

    const loadStatistics = useCallback(() => {
        const stats = TutorStorage.getStatistics();
        setStatistics(stats);
    }, []);

    // Filtrar evaluaciones por búsqueda
    const filteredEvaluations = evaluations.filter(ev =>
        ev.meta?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.meta?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.meta?.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Crear nueva evaluación desde plantilla
    const handleCreateFromTemplate = (templateId) => {
        const newEval = createFromTemplate(templateId);
        if (newEval) {
            TutorStorage.saveEvaluation(newEval);
            loadEvaluations();
            setSelectedEvaluation(newEval);
            setIsEditing(true);
            setShowTemplates(false);
        }
    };

    // Crear evaluación vacía
    const handleCreateNew = () => {
        handleCreateFromTemplate('evaluacion_vacia');
    };

    // Editar evaluación
    const handleEdit = (evaluation) => {
        setSelectedEvaluation(evaluation);
        setIsEditing(true);
    };

    // Previsualizar evaluación
    const handlePreview = (evaluation) => {
        setSelectedEvaluation(evaluation);
        setIsPreviewing(true);
    };

    // Duplicar evaluación
    const handleDuplicate = (evaluationId) => {
        const duplicated = TutorStorage.duplicateEvaluation(evaluationId);
        if (duplicated) {
            loadEvaluations();
        }
    };

    // Eliminar evaluación
    const handleDelete = (evaluationId) => {
        TutorStorage.deleteEvaluation(evaluationId);
        loadEvaluations();
        setShowDeleteDialog(null);
    };

    // Exportar evaluación
    const handleExport = (evaluationId) => {
        TutorStorage.downloadEvaluation(evaluationId);
    };

    // Importar evaluación
    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                await TutorStorage.importFromFile(file);
                loadEvaluations();
            } catch (error) {
                console.error('Error al importar:', error);
                alert('Error al importar el archivo');
            }
        }
        event.target.value = '';
    };

    // Guardar evaluación editada
    const handleSaveEvaluation = (evaluation) => {
        TutorStorage.saveEvaluation(evaluation);
        loadEvaluations();
        setIsEditing(false);
        setSelectedEvaluation(null);
    };

    // Cerrar editor
    const handleCloseEditor = () => {
        setIsEditing(false);
        setSelectedEvaluation(null);
    };

    // Cerrar preview
    const handleClosePreview = () => {
        setIsPreviewing(false);
        setSelectedEvaluation(null);
    };

    if (!isOpen) return null;

    // Renderizar vista de edición
    if (isEditing && selectedEvaluation) {
        return (
            <div className={styles.tutorModalOverlay} onClick={(e) => e.target === e.currentTarget && handleCloseEditor()}>
                <div className={styles.tutorPanel}>
                    <TutorEjercicioEditor
                        evaluation={selectedEvaluation}
                        onSave={handleSaveEvaluation}
                        onClose={handleCloseEditor}
                        onPreview={() => {
                            setIsEditing(false);
                            setIsPreviewing(true);
                        }}
                    />
                </div>
            </div>
        );
    }

    // Renderizar vista de preview
    if (isPreviewing && selectedEvaluation) {
        return (
            <div className={styles.tutorModalOverlay} onClick={(e) => e.target === e.currentTarget && handleClosePreview()}>
                <div className={styles.tutorPanel}>
                    <TutorPreview
                        evaluation={selectedEvaluation}
                        onClose={handleClosePreview}
                        onEdit={() => {
                            setIsPreviewing(false);
                            setIsEditing(true);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tutorModalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.tutorPanel}>
                {/* Header */}
                <header className={styles.tutorHeader}>
                    <div className={styles.tutorHeaderLeft}>
                        <div className={styles.tutorLogo}>📚</div>
                        <div className={styles.tutorTitleGroup}>
                            <h1 className={styles.tutorTitle}>Panel de Tutor</h1>
                            <p className={styles.tutorSubtitle}>Sistema de Evaluaciones STBlock</p>
                        </div>
                    </div>
                    <div className={styles.tutorHeaderRight}>
                        <button
                            className={styles.tutorBtnIcon}
                            onClick={() => fileInputRef.current?.click()}
                            title="Importar evaluación"
                        >
                            <Icons.Upload />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                        />
                        <button
                            className={`${styles.tutorBtnIcon} ${styles.tutorBtnClose}`}
                            onClick={onClose}
                            title="Cerrar"
                        >
                            <Icons.Close />
                        </button>
                    </div>
                </header>

                {/* Navigation */}
                <nav className={styles.tutorNav}>
                    <button
                        className={`${styles.tutorNavTab} ${activeTab === 'evaluaciones' ? styles.active : ''}`}
                        onClick={() => setActiveTab('evaluaciones')}
                    >
                        <span className={styles.tutorNavIcon}>📋</span>
                        Mis Evaluaciones
                        {evaluations.length > 0 && (
                            <span className={styles.tutorNavBadge}>{evaluations.length}</span>
                        )}
                    </button>
                    <button
                        className={`${styles.tutorNavTab} ${activeTab === 'plantillas' ? styles.active : ''}`}
                        onClick={() => setActiveTab('plantillas')}
                    >
                        <span className={styles.tutorNavIcon}>📑</span>
                        Plantillas
                    </button>
                    <button
                        className={`${styles.tutorNavTab} ${activeTab === 'estadisticas' ? styles.active : ''}`}
                        onClick={() => setActiveTab('estadisticas')}
                    >
                        <span className={styles.tutorNavIcon}>📊</span>
                        Estadísticas
                    </button>
                </nav>

                {/* Content */}
                <div className={styles.tutorContent}>
                    <div className={styles.tutorContentScroll}>

                        {/* TAB: Evaluaciones */}
                        {activeTab === 'evaluaciones' && (
                            <>
                                {evaluations.length === 0 ? (
                                    <div className={styles.tutorWelcome}>
                                        <div className={styles.tutorWelcomeIcon}>🎓</div>
                                        <h2>¡Bienvenido al Panel de Tutor!</h2>
                                        <p>
                                            Aquí puedes crear evaluaciones personalizadas para tus estudiantes.
                                            Comienza creando tu primera evaluación desde cero o usando una plantilla.
                                        </p>
                                        <div className={styles.tutorActions}>
                                            <button
                                                className={`${styles.tutorBtn} ${styles.tutorBtnPrimary}`}
                                                onClick={handleCreateNew}
                                            >
                                                <Icons.Plus /> Nueva Evaluación
                                            </button>
                                            <button
                                                className={`${styles.tutorBtn} ${styles.tutorBtnSecondary}`}
                                                onClick={() => setActiveTab('plantillas')}
                                            >
                                                📑 Usar Plantilla
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.tutorListHeader}>
                                            <h2>
                                                📋 Mis Evaluaciones
                                            </h2>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div className={styles.tutorSearchBox}>
                                                    <Icons.Search />
                                                    <input
                                                        type="text"
                                                        className={styles.tutorSearchInput}
                                                        placeholder="Buscar evaluaciones..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    className={`${styles.tutorBtn} ${styles.tutorBtnPrimary} ${styles.tutorBtnSm}`}
                                                    onClick={handleCreateNew}
                                                >
                                                    <Icons.Plus /> Nueva
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.tutorEvaluationsGrid}>
                                            {filteredEvaluations.map(evaluation => (
                                                <EvaluationCard
                                                    key={evaluation.id}
                                                    evaluation={evaluation}
                                                    onEdit={() => handleEdit(evaluation)}
                                                    onPreview={() => handlePreview(evaluation)}
                                                    onDuplicate={() => handleDuplicate(evaluation.id)}
                                                    onDelete={() => setShowDeleteDialog(evaluation)}
                                                    onExport={() => handleExport(evaluation.id)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* TAB: Plantillas */}
                        {activeTab === 'plantillas' && (
                            <>
                                <div className={styles.tutorListHeader}>
                                    <h2>📑 Plantillas de Evaluación</h2>
                                </div>
                                <p style={{ color: '#666', marginBottom: '24px' }}>
                                    Usa estas plantillas como punto de partida para crear tus evaluaciones.
                                    Puedes personalizarlas después de crearlas.
                                </p>
                                <div className={styles.tutorTemplatesGrid}>
                                    {getTemplatesList().map(template => (
                                        <div
                                            key={template.id}
                                            className={styles.tutorTemplateCard}
                                            onClick={() => handleCreateFromTemplate(template.id)}
                                        >
                                            <div className={styles.tutorTemplateIcon}>{template.icono}</div>
                                            <h3 className={styles.tutorTemplateName}>{template.titulo}</h3>
                                            <p className={styles.tutorTemplateMeta}>
                                                {template.ejercicios_count} ejercicios • {template.puntuacion_total} pts
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* TAB: Estadísticas */}
                        {activeTab === 'estadisticas' && statistics && (
                            <>
                                <div className={styles.tutorListHeader}>
                                    <h2>📊 Estadísticas</h2>
                                </div>
                                <div className={styles.tutorStatsRow}>
                                    <div className={styles.tutorStatCard}>
                                        <div className={styles.tutorStatIcon} style={{ background: '#e8f3ed', color: '#00b359' }}>
                                            📋
                                        </div>
                                        <div className={styles.tutorStatInfo}>
                                            <h4>{statistics.total_evaluaciones}</h4>
                                            <p>Evaluaciones creadas</p>
                                        </div>
                                    </div>
                                    <div className={styles.tutorStatCard}>
                                        <div className={styles.tutorStatIcon} style={{ background: '#fff3e0', color: '#ff8c1a' }}>
                                            ✏️
                                        </div>
                                        <div className={styles.tutorStatInfo}>
                                            <h4>{statistics.promedio_ejercicios}</h4>
                                            <p>Promedio de ejercicios</p>
                                        </div>
                                    </div>
                                    <div className={styles.tutorStatCard}>
                                        <div className={styles.tutorStatIcon} style={{ background: '#e3f2fd', color: '#4c97ff' }}>
                                            📝
                                        </div>
                                        <div className={styles.tutorStatInfo}>
                                            <h4>{statistics.total_resultados}</h4>
                                            <p>Resultados guardados</p>
                                        </div>
                                    </div>
                                    <div className={styles.tutorStatCard}>
                                        <div className={styles.tutorStatIcon} style={{ background: '#fce4ec', color: '#cf63cf' }}>
                                            🏆
                                        </div>
                                        <div className={styles.tutorStatInfo}>
                                            <h4>{Object.keys(statistics.evaluaciones_por_nivel).length}</h4>
                                            <p>Niveles diferentes</p>
                                        </div>
                                    </div>
                                </div>

                                {Object.keys(statistics.evaluaciones_por_nivel).length > 0 && (
                                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginTop: '24px' }}>
                                        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Evaluaciones por Nivel</h3>
                                        {Object.entries(statistics.evaluaciones_por_nivel).map(([nivel, count]) => (
                                            <div key={nivel} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                <span style={{ flex: 1, textTransform: 'capitalize', color: '#666' }}>{nivel}</span>
                                                <div style={{ flex: 2, height: '8px', background: '#e8f3ed', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            width: `${(count / statistics.total_evaluaciones) * 100}%`,
                                                            height: '100%',
                                                            background: 'linear-gradient(90deg, #00b359, #19663d)',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ width: '30px', textAlign: 'right', color: '#333', fontWeight: '600' }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                {showDeleteDialog && (
                    <div className={styles.tutorModalOverlay} style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className={styles.tutorDialog}>
                            <div className={styles.tutorDialogIcon}>🗑️</div>
                            <h3>¿Eliminar evaluación?</h3>
                            <p>
                                Esta acción eliminará "{showDeleteDialog.meta?.titulo}" permanentemente.
                                Esta acción no se puede deshacer.
                            </p>
                            <div className={styles.tutorDialogActions}>
                                <button
                                    className={`${styles.tutorBtn} ${styles.tutorBtnGhost}`}
                                    onClick={() => setShowDeleteDialog(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className={`${styles.tutorBtn} ${styles.tutorBtnDanger}`}
                                    onClick={() => handleDelete(showDeleteDialog.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Tarjeta de Evaluación
// ═══════════════════════════════════════════════════════════

const EvaluationCard = ({ evaluation, onEdit, onPreview, onDuplicate, onDelete, onExport }) => {
    const meta = evaluation.meta || {};
    const ejerciciosCount = evaluation.ejercicios?.length || 0;
    const puntuacionTotal = evaluation.ejercicios?.reduce((sum, e) => sum + (e.puntuacion || 0), 0) || 0;

    return (
        <div className={styles.tutorEvalCard} onClick={onEdit}>
            <div className={styles.tutorEvalCardHeader}>
                <div
                    className={styles.tutorEvalIcon}
                    style={{ background: `${meta.color || '#00b359'}20`, color: meta.color || '#00b359' }}
                >
                    {meta.icono || '📝'}
                </div>
                <div className={styles.tutorEvalInfo}>
                    <h3 className={styles.tutorEvalTitle}>{meta.titulo || 'Sin título'}</h3>
                    <p className={styles.tutorEvalDesc}>{meta.descripcion || 'Sin descripción'}</p>
                </div>
            </div>

            <div className={styles.tutorEvalCardBody}>
                <div className={styles.tutorEvalStat}>
                    <span className={styles.tutorEvalStatIcon}>📝</span>
                    {ejerciciosCount} ejercicios
                </div>
                <div className={styles.tutorEvalStat}>
                    <span className={styles.tutorEvalStatIcon}>⭐</span>
                    {puntuacionTotal} pts
                </div>
                {meta.tiempo_limite_minutos && (
                    <div className={styles.tutorEvalStat}>
                        <span className={styles.tutorEvalStatIcon}>⏱️</span>
                        {meta.tiempo_limite_minutos} min
                    </div>
                )}
            </div>

            <div className={styles.tutorEvalCardFooter}>
                <div className={styles.tutorEvalTags}>
                    {meta.nivel && (
                        <span className={styles.tutorEvalTag}>{meta.nivel}</span>
                    )}
                    {meta.tags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className={styles.tutorEvalTag}>{tag}</span>
                    ))}
                </div>
                <div className={styles.tutorEvalActions} onClick={(e) => e.stopPropagation()}>
                    <button
                        className={styles.tutorEvalActionBtn}
                        onClick={onPreview}
                        title="Previsualizar"
                    >
                        <Icons.Eye />
                    </button>
                    <button
                        className={styles.tutorEvalActionBtn}
                        onClick={onDuplicate}
                        title="Duplicar"
                    >
                        <Icons.Copy />
                    </button>
                    <button
                        className={styles.tutorEvalActionBtn}
                        onClick={onExport}
                        title="Exportar"
                    >
                        <Icons.Download />
                    </button>
                    <button
                        className={`${styles.tutorEvalActionBtn} ${styles.danger}`}
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

export default TutorPanel;
