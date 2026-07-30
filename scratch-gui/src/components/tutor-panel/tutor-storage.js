/**
 * STBlock - Sistema de Evaluaciones
 * Almacenamiento y persistencia de evaluaciones
 *
 * @author STB Academy
 * @version 1.0.0
 */

const STORAGE_KEY = 'stblock_evaluaciones';
const RESULTS_KEY = 'stblock_resultados';

// ═══════════════════════════════════════════════════════════
// EVALUACIONES
// ═══════════════════════════════════════════════════════════

/**
 * Obtener todas las evaluaciones guardadas
 */
export const getAllEvaluations = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[TutorStorage] Error al cargar evaluaciones:', error);
        return [];
    }
};

/**
 * Guardar evaluación
 */
export const saveEvaluation = (evaluation) => {
    try {
        const evaluations = getAllEvaluations();
        const existingIndex = evaluations.findIndex(e => e.id === evaluation.id);

        const evaluacionActualizada = {
            ...evaluation,
            fecha_modificacion: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            evaluations[existingIndex] = evaluacionActualizada;
        } else {
            evaluations.push({
                ...evaluacionActualizada,
                fecha_creacion: new Date().toISOString()
            });
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(evaluations));
        return { success: true, evaluation: evaluacionActualizada };
    } catch (error) {
        console.error('[TutorStorage] Error al guardar evaluación:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener evaluación por ID
 */
export const getEvaluation = (evaluationId) => {
    const evaluations = getAllEvaluations();
    return evaluations.find(e => e.id === evaluationId) || null;
};

/**
 * Eliminar evaluación
 */
export const deleteEvaluation = (evaluationId) => {
    try {
        const evaluations = getAllEvaluations();
        const filtered = evaluations.filter(e => e.id !== evaluationId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return { success: true };
    } catch (error) {
        console.error('[TutorStorage] Error al eliminar evaluación:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Duplicar evaluación
 */
export const duplicateEvaluation = (evaluationId) => {
    const original = getEvaluation(evaluationId);
    if (!original) return null;

    const duplicated = {
        ...JSON.parse(JSON.stringify(original)),
        id: `eval_${Date.now()}`,
        meta: {
            ...original.meta,
            titulo: `${original.meta.titulo} (copia)`
        },
        fecha_creacion: new Date().toISOString(),
        fecha_modificacion: new Date().toISOString()
    };

    // Regenerar IDs de ejercicios
    duplicated.ejercicios = duplicated.ejercicios.map((ej, index) => ({
        ...ej,
        id: `ej_${Date.now()}_${index}`
    }));

    saveEvaluation(duplicated);
    return duplicated;
};

// ═══════════════════════════════════════════════════════════
// EXPORTAR / IMPORTAR
// ═══════════════════════════════════════════════════════════

/**
 * Exportar evaluación a JSON
 */
export const exportEvaluation = (evaluationId) => {
    const evaluation = getEvaluation(evaluationId);
    if (!evaluation) return null;

    const exportData = {
        version: '1.0.0',
        tipo: 'stblock_evaluacion',
        exportado: new Date().toISOString(),
        evaluacion: evaluation
    };

    return JSON.stringify(exportData, null, 2);
};

/**
 * Exportar evaluación como archivo descargable
 */
export const downloadEvaluation = (evaluationId) => {
    const evaluation = getEvaluation(evaluationId);
    if (!evaluation) return false;

    const jsonStr = exportEvaluation(evaluationId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `${evaluation.meta.titulo.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
};

/**
 * Importar evaluación desde JSON
 */
export const importEvaluation = (jsonString) => {
    try {
        const data = JSON.parse(jsonString);

        // Validar estructura
        if (!data.evaluacion || !data.evaluacion.meta || !data.evaluacion.ejercicios) {
            throw new Error('Estructura de evaluación inválida');
        }

        // Asignar nuevo ID para evitar conflictos
        const imported = {
            ...data.evaluacion,
            id: `eval_imported_${Date.now()}`,
            fecha_importacion: new Date().toISOString(),
            meta: {
                ...data.evaluacion.meta,
                titulo: `${data.evaluacion.meta.titulo} (importado)`
            }
        };

        // Regenerar IDs de ejercicios
        imported.ejercicios = imported.ejercicios.map((ej, index) => ({
            ...ej,
            id: `ej_imported_${Date.now()}_${index}`
        }));

        saveEvaluation(imported);
        return { success: true, evaluation: imported };
    } catch (error) {
        console.error('[TutorStorage] Error al importar:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Importar desde archivo
 */
export const importFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = importEvaluation(e.target.result);
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.error));
            }
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsText(file);
    });
};

// ═══════════════════════════════════════════════════════════
// RESULTADOS DE ESTUDIANTES
// ═══════════════════════════════════════════════════════════

/**
 * Guardar resultado de estudiante
 */
export const saveResult = (evaluationId, studentResult) => {
    try {
        const results = getAllResults();
        results.push({
            id: `result_${Date.now()}`,
            evaluacion_id: evaluationId,
            fecha: new Date().toISOString(),
            ...studentResult
        });
        localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Obtener todos los resultados
 */
export const getAllResults = () => {
    try {
        const data = localStorage.getItem(RESULTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};

/**
 * Obtener resultados de una evaluación específica
 */
export const getResultsForEvaluation = (evaluationId) => {
    const results = getAllResults();
    return results.filter(r => r.evaluacion_id === evaluationId);
};

/**
 * Limpiar todos los datos (usar con cuidado)
 */
export const clearAllData = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(RESULTS_KEY);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════

/**
 * Generar ID único
 */
export const generateId = (prefix = 'item') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calcular puntuación total de evaluación
 */
export const calculateTotalScore = (ejercicios) => {
    return ejercicios.reduce((sum, ej) => sum + (ej.puntuacion || 0), 0);
};

/**
 * Obtener estadísticas de evaluaciones
 */
export const getStatistics = () => {
    const evaluations = getAllEvaluations();
    const results = getAllResults();

    return {
        total_evaluaciones: evaluations.length,
        total_resultados: results.length,
        evaluaciones_por_nivel: evaluations.reduce((acc, e) => {
            const nivel = e.meta?.nivel || 'sin_nivel';
            acc[nivel] = (acc[nivel] || 0) + 1;
            return acc;
        }, {}),
        promedio_ejercicios: evaluations.length > 0
            ? Math.round(evaluations.reduce((sum, e) => sum + e.ejercicios.length, 0) / evaluations.length)
            : 0
    };
};

export default {
    getAllEvaluations,
    saveEvaluation,
    getEvaluation,
    deleteEvaluation,
    duplicateEvaluation,
    exportEvaluation,
    downloadEvaluation,
    importEvaluation,
    importFromFile,
    saveResult,
    getAllResults,
    getResultsForEvaluation,
    clearAllData,
    generateId,
    calculateTotalScore,
    getStatistics
};
