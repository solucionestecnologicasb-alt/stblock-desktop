/**
 * STBlock - Módulo Python
 *
 * Exporta todas las funcionalidades del generador y runtime Python
 */

// Generador de código
export { default as PythonGenerator, getGenerator, generatePythonCode, generatePythonCodeWithMap } from './python-generator';
export { BLOCK_TO_PYTHON, BLOCK_DESCRIPTIONS, indent, escapeString, formatNumber } from './block-mappings';

// Runtime y ejecución
export { loadPyodide, runPython, isReady, preload } from './python-runtime';
export { default as PythonExecutor, createExecutor } from './python-executor';

// Tooltips educativos
export { default as PYTHON_TOOLTIPS, getTooltip, getTooltipsByCategory } from './block-tooltips';

// Sincronización Python → Bloques
export { pythonToBlocks, syncPythonToWorkspace, clearPythonBlocks } from './python-to-blocks';

// Persistencia de estado
export {
    savePanelState,
    loadPanelState,
    clearPanelState,
    savePreferences,
    loadPreferences,
    exportPythonData,
    importPythonData
} from './python-storage';
