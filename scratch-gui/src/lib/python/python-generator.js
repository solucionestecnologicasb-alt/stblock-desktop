/**
 * STBlock - Generador de código Python desde bloques Scratch
 *
 * Convierte el workspace de bloques visuales a código Python ejecutable.
 */

import { BLOCK_TO_PYTHON, indent, formatNumber, escapeString } from './block-mappings';

/**
 * Clase principal del generador Python
 */
class PythonGenerator {
    constructor() {
        this.indentLevel = 0;
        this.code = [];
        this.variables = new Set();
        this.lists = new Set();
        this.customBlocks = new Map();
    }

    /**
     * Genera código Python desde un workspace de Blockly/Scratch
     * @param {Workspace} workspace - El workspace de bloques
     * @returns {string} Código Python generado
     */
    generateFromWorkspace(workspace) {
        if (!workspace) {
            return this.getEmptyTemplate();
        }

        this.reset();

        try {
            // Obtener todos los bloques superiores (que inician scripts)
            const topBlocks = workspace.getTopBlocks(true);

            if (!topBlocks || topBlocks.length === 0) {
                return this.getEmptyTemplate();
            }

            // Recopilar variables y listas primero
            this.collectDataBlocks(workspace);

            // Generar header con imports y variables
            this.generateHeader();

            // Generar código para cada bloque superior
            for (const block of topBlocks) {
                if (block && !block.isShadow()) {
                    this.code.push('');
                    this.generateBlock(block);
                }
            }

            return this.code.join('\n');
        } catch (error) {
            console.warn('[PythonGenerator] Error generando código:', error);
            return this.getErrorTemplate(error.message);
        }
    }

    /**
     * Reinicia el estado del generador
     */
    reset() {
        this.indentLevel = 0;
        this.code = [];
        this.variables.clear();
        this.lists.clear();
        this.customBlocks.clear();
        this.variableIdToName = {};
        this.blockLineMap = {}; // Mapa blockId → línea Python (1-based)
    }

    /**
     * Verifica si un bloque es un evento (hat block)
     */
    isEventBlock(opcode) {
        return opcode && (
            opcode.startsWith('event_when') ||
            opcode === 'control_start_as_clone' ||
            opcode === 'procedures_definition' ||
            opcode.startsWith('game_on') ||
            // Hats de dispositivo (Arduino / STBoard V2 / micro:bit)
            opcode === 'arduino_whenArduinoBegin' ||
            opcode === 'microbit_whenmicrobitbegin'
        );
    }

    /**
     * Recopila variables y listas del workspace
     */
    collectDataBlocks(workspace) {
        try {
            // Obtener variables desde el modelo de variables del workspace
            const variableMap = workspace.getVariableMap();
            if (variableMap) {
                // Variables escalares
                const allVariables = variableMap.getVariablesOfType('') || [];
                for (const variable of allVariables) {
                    if (variable && variable.name) {
                        this.variables.add(variable.name);
                        // Mapear ID a nombre para uso posterior
                        this.variableIdToName = this.variableIdToName || {};
                        this.variableIdToName[variable.getId()] = variable.name;
                    }
                }

                // Listas
                const allLists = variableMap.getVariablesOfType('list') || [];
                for (const list of allLists) {
                    if (list && list.name) {
                        this.lists.add(list.name);
                        this.variableIdToName = this.variableIdToName || {};
                        this.variableIdToName[list.getId()] = list.name;
                    }
                }

                // Mensajes de difusión (broadcast_msg): se usan como nombre de
                // mensaje en enviar_mensaje(...) / @cuando_reciba(...), NO se
                // declaran como variables (no deben inicializarse a 0).
                const allBroadcast = variableMap.getVariablesOfType('broadcast_msg') || [];
                for (const broadcastVar of allBroadcast) {
                    if (broadcastVar && broadcastVar.name) {
                        this.variableIdToName = this.variableIdToName || {};
                        this.variableIdToName[broadcastVar.getId()] = broadcastVar.name;
                    }
                }
            }

            // Bloques personalizados
            const allBlocks = workspace.getAllBlocks(false);
            for (const block of allBlocks) {
                if (!block) continue;

                const opcode = block.type;

                if (opcode === 'procedures_definition') {
                    const procCode = this.getProcedureName(block);
                    if (procCode) {
                        this.customBlocks.set(procCode, block);
                    }
                }
            }
        } catch (e) {
            console.warn('[PythonGenerator] Error recopilando datos:', e);
        }
    }

    /**
     * Obtiene el nombre real de una variable dado su ID
     */
    getVariableName(varIdOrName) {
        if (!varIdOrName) return 'variable';
        // Si tenemos un mapeo de ID a nombre, usarlo
        if (this.variableIdToName && this.variableIdToName[varIdOrName]) {
            return this.variableIdToName[varIdOrName];
        }
        // Si no parece un ID (no tiene caracteres raros), es probablemente el nombre
        if (!/[{}+*]/.test(varIdOrName) && varIdOrName.length < 30) {
            return varIdOrName;
        }
        return 'variable';
    }

    /**
     * Obtiene el nombre real de un mensaje de difusión dado su ID.
     * A diferencia de las variables, el nombre del mensaje NO se sanitiza:
     * es un literal de cadena (enviar_mensaje("mi mensaje")).
     */
    getBroadcastMessageName(value) {
        if (!value) return '';
        if (this.variableIdToName && this.variableIdToName[value]) {
            return this.variableIdToName[value];
        }
        return value;
    }

    /**
     * Genera el header del archivo Python
     */
    generateHeader() {
        this.code.push('# ═══════════════════════════════════════════════════════════');
        this.code.push('# Código generado por STB Academy');
        this.code.push('# https://www.stbacademy.net');
        this.code.push('# ═══════════════════════════════════════════════════════════');
        this.code.push('');
        this.code.push('from stblock import sprite, escenario, sonido, raton');
        this.code.push('from stblock import esperar, aleatorio, preguntar, respuesta');
        this.code.push('from stblock import fisica, camara');
        this.code.push('');

        // Declarar variables
        if (this.variables.size > 0) {
            this.code.push('# Variables');
            for (const varName of this.variables) {
                const safeName = this.sanitizeVariableName(varName);
                this.code.push(`${safeName} = 0`);
            }
            this.code.push('');
        }

        // Declarar listas
        if (this.lists.size > 0) {
            this.code.push('# Listas');
            for (const listName of this.lists) {
                const safeName = this.sanitizeVariableName(listName);
                this.code.push(`${safeName} = []`);
            }
            this.code.push('');
        }
    }

    /**
     * Genera código para un bloque y sus hijos
     */
    generateBlock(block) {
        if (!block || block.isShadow()) return;

        const opcode = block.type;
        const mapping = BLOCK_TO_PYTHON[opcode];

        if (!mapping) {
            // Bloque no soportado
            this.code.push(this.getIndent() + `# Bloque no soportado: ${opcode}`);
            this.processNextBlock(block);
            return;
        }

        try {
            // Extraer argumentos del bloque
            const args = this.extractArgs(block);

            // Verificar si es un bloque de evento (hat block)
            const isEvent = this.isEventBlock(opcode);

            // Verificar si es un bloque con cuerpo (control)
            const hasSubstack = this.hasSubstack(block);
            const hasSubstack2 = this.hasSubstack2(block);

            let pythonCode;
            let bodyCode = null;
            let bodyCode2 = null;
            let bodyBlockInfos = [];
            let bodyBlockInfos2 = [];

            if (hasSubstack || hasSubstack2) {
                const bodyInfo = hasSubstack ?
                    this.generateSubstackWithInfo(block, 'SUBSTACK') :
                    {code: indent('pass'), blocks: []};
                bodyCode = bodyInfo.code;
                bodyBlockInfos = bodyInfo.blocks;

                if (hasSubstack2) {
                    const bodyInfo2 = this.generateSubstackWithInfo(block, 'SUBSTACK2');
                    bodyCode2 = bodyInfo2.code;
                    bodyBlockInfos2 = bodyInfo2.blocks;
                }

                if (typeof mapping === 'function') {
                    if (bodyCode2 !== null) {
                        pythonCode = mapping(args, bodyCode, bodyCode2);
                    } else {
                        pythonCode = mapping(args, bodyCode);
                    }
                } else {
                    pythonCode = mapping;
                }
            } else {
                // Bloque simple
                if (typeof mapping === 'function') {
                    pythonCode = mapping(args);
                } else {
                    pythonCode = mapping;
                }
            }

            // Agregar el código con indentación correcta
            if (pythonCode) {
                const trimmedLines = pythonCode.split('\n').filter(l => l.trim());
                const startLine = this.code.length + 1; // 1-based

                // Registrar este bloque en el blockLineMap
                this.blockLineMap[block.id] = startLine;

                // Registrar bloques del cuerpo (SUBSTACK)
                if (bodyCode && bodyBlockInfos.length > 0) {
                    const bodyLineCount = bodyCode.split('\n').filter(l => l.trim()).length;
                    const headerLineCount = trimmedLines.length - bodyLineCount;
                    for (const info of bodyBlockInfos) {
                        this.blockLineMap[info.block.id] = startLine + headerLineCount + info.lineOffset;
                    }
                }

                // Registrar bloques del segundo cuerpo (SUBSTACK2, ej. else)
                if (bodyCode2 && bodyBlockInfos2.length > 0) {
                    const body2Trimmed = bodyCode2.split('\n').filter(l => l.trim());
                    if (bodyCode) {
                        const body1LineCount = bodyCode.split('\n').filter(l => l.trim()).length;
                        // En if/else: "if COND:\nbody1\nelse:\nbody2"
                        // body2 empieza después de header1(1) + body1 + else(1)
                        const body2StartOffset = 1 + body1LineCount + 1;
                        for (const info of bodyBlockInfos2) {
                            this.blockLineMap[info.block.id] = startLine + body2StartOffset + info.lineOffset;
                        }
                    }
                }

                const lines = pythonCode.split('\n');
                lines.forEach((line, index) => {
                    if (line.trim()) {
                        // Solo agregar indentación a la primera línea
                        // Las líneas del body ya tienen su propia indentación
                        if (index === 0) {
                            this.code.push(this.getIndent() + line);
                        } else {
                            this.code.push(line);
                        }
                    }
                });
            }

            // Si es un bloque de evento, aumentar la indentación para los bloques siguientes
            if (isEvent) {
                this.indentLevel++;
                this.processNextBlock(block);
                this.indentLevel--;
            } else {
                // Procesar el siguiente bloque en la secuencia
                this.processNextBlock(block);
            }

        } catch (error) {
            console.warn(`[PythonGenerator] Error en bloque ${opcode}:`, error);
            this.code.push(this.getIndent() + `# Error generando: ${opcode}`);
            this.processNextBlock(block);
        }
    }

    /**
     * Genera código para un substack (cuerpo de un bloque de control)
     */
    generateSubstack(block, inputName) {
        const input = block.getInput(inputName);
        if (!input || !input.connection || !input.connection.targetBlock()) {
            return indent('pass');
        }

        const startBlock = input.connection.targetBlock();
        const lines = [];

        this.indentLevel++;
        let currentBlock = startBlock;

        while (currentBlock) {
            const blockCode = this.generateBlockToString(currentBlock);
            if (blockCode) {
                lines.push(blockCode);
            }
            currentBlock = this.getNextBlock(currentBlock);
        }

        this.indentLevel--;

        if (lines.length === 0) {
            return indent('pass');
        }

        return lines.join('\n');
    }

    /**
     * Como generateSubstack pero retorna también información de offsets de bloques
     * para poder mapear blockId → línea Python.
     * @returns {{code: string, blocks: Array<{block: object, lineOffset: number}>}}
     */
    generateSubstackWithInfo(block, inputName) {
        const input = block.getInput(inputName);
        if (!input || !input.connection || !input.connection.targetBlock()) {
            return {code: indent('pass'), blocks: []};
        }

        const startBlock = input.connection.targetBlock();
        const blockInfos = [];
        const lines = [];

        this.indentLevel++;
        let currentBlock = startBlock;
        let lineOffset = 0;

        while (currentBlock) {
            blockInfos.push({block: currentBlock, lineOffset: lineOffset});
            const blockCode = this.generateBlockToString(currentBlock);
            if (blockCode) {
                lines.push(blockCode);
                lineOffset += blockCode.split('\n').filter(l => l.trim()).length;
            }
            currentBlock = this.getNextBlock(currentBlock);
        }
        this.indentLevel--;

        if (lines.length === 0) {
            return {code: indent('pass'), blocks: []};
        }

        return {code: lines.join('\n'), blocks: blockInfos};
    }

    /**
     * Genera código de un bloque como string (sin agregarlo a this.code)
     */
    generateBlockToString(block) {
        if (!block || block.isShadow()) return '';

        const opcode = block.type;
        const mapping = BLOCK_TO_PYTHON[opcode];

        if (!mapping) {
            return this.getIndent() + `# Bloque no soportado: ${opcode}`;
        }

        try {
            const args = this.extractArgs(block);
            const hasSubstack = this.hasSubstack(block);
            const hasSubstack2 = this.hasSubstack2(block);

            let pythonCode;

            if (hasSubstack || hasSubstack2) {
                const bodyCode = this.generateSubstack(block, 'SUBSTACK');
                const bodyCode2 = hasSubstack2 ? this.generateSubstack(block, 'SUBSTACK2') : null;

                if (typeof mapping === 'function') {
                    if (bodyCode2 !== null) {
                        pythonCode = mapping(args, bodyCode, bodyCode2);
                    } else {
                        pythonCode = mapping(args, bodyCode);
                    }
                } else {
                    pythonCode = mapping;
                }
            } else {
                if (typeof mapping === 'function') {
                    pythonCode = mapping(args);
                } else {
                    pythonCode = mapping;
                }
            }

            if (pythonCode) {
                const lines = pythonCode.split('\n');
                return lines.map((line, index) => {
                    // Solo agregar indentación a la primera línea (la declaración del control)
                    // Las líneas del body ya tienen su propia indentación
                    if (index === 0) {
                        return this.getIndent() + line;
                    }
                    // Las líneas del body ya vienen indentadas correctamente
                    return line;
                }).join('\n');
            }

            return '';
        } catch (error) {
            return this.getIndent() + `# Error: ${opcode}`;
        }
    }

    /**
     * Extrae los argumentos de un bloque
     */
    extractArgs(block) {
        const args = {};
        const expressions = {}; // Track which args are expressions (not literals)

        if (!block.inputList) return args;

        // Manejo especial para procedimientos
        if (block.type === 'procedures_definition' || block.type === 'procedures_call') {
            const procInfo = this.getProcedureInfo(block);
            args.procedureName = procInfo.name;
            args.procedureParams = procInfo.params;

            // Para llamadas, extraer los valores de los argumentos
            if (block.type === 'procedures_call') {
                args.procedureArgs = this.extractProcedureCallArgs(block, procInfo.params.length);
            }

            return args;
        }

        for (const input of block.inputList) {
            // Campos directos
            if (input.fieldRow) {
                for (const field of input.fieldRow) {
                    if (field.name && field.getValue) {
                        let value = field.getValue();

                        // Si es un campo de variable o lista, traducir ID a nombre y sanitizar
                        if (field.name === 'VARIABLE' || field.name === 'LIST') {
                            value = this.getVariableName(value);
                            value = this.sanitizeVariableName(value);
                        } else if (field.name === 'BROADCAST_OPTION') {
                            // Los mensajes de difusión se guardan como ID de
                            // variable (broadcast_msg); traducir ID → nombre
                            // (sin sanitizar, es un literal de cadena).
                            value = this.getBroadcastMessageName(value);
                        }

                        args[field.name] = value;
                    }
                }
            }

            // Inputs con bloques conectados (para expresiones)
            if (input.connection && input.connection.targetBlock()) {
                const connectedBlock = input.connection.targetBlock();
                if (connectedBlock && !connectedBlock.isShadow()) {
                    // Es un bloque real (reportero), generar su código
                    const inputCode = this.generateExpression(connectedBlock);
                    if (input.name && inputCode) {
                        args[input.name] = inputCode;
                        // Marcar como expresión para no escapar/citar
                        expressions[input.name] = true;
                    }
                } else if (connectedBlock && connectedBlock.isShadow()) {
                    // Es un shadow block, extraer su valor
                    const shadowValue = this.extractShadowValue(connectedBlock);
                    if (input.name && shadowValue !== undefined) {
                        args[input.name] = shadowValue;
                    }
                }
            }
        }

        // Agregar metadata de expresiones
        args.__expressions__ = expressions;

        return args;
    }

    /**
     * Genera código para una expresión (bloque reportero)
     */
    generateExpression(block) {
        if (!block) return '';

        const opcode = block.type;
        const mapping = BLOCK_TO_PYTHON[opcode];

        if (mapping) {
            const args = this.extractArgs(block);
            if (typeof mapping === 'function') {
                return mapping(args);
            }
            return mapping;
        }

        // Si no hay mapeo, intentar obtener el valor del campo
        return this.getFieldValue(block, 'VALUE') ||
               this.getFieldValue(block, 'TEXT') ||
               this.getFieldValue(block, 'NUM') ||
               '';
    }

    /**
     * Extrae valor de un shadow block
     */
    extractShadowValue(block) {
        if (!block || !block.inputList) return undefined;

        for (const input of block.inputList) {
            if (input.fieldRow) {
                for (const field of input.fieldRow) {
                    if (field.getValue) {
                        let val = field.getValue();
                        // El menú de difusión (event_broadcast_menu) guarda el
                        // ID de la variable broadcast_msg; traducir a nombre.
                        if (field.name === 'BROADCAST_OPTION') {
                            val = this.getBroadcastMessageName(val);
                        }
                        return val;
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Obtiene el valor de un campo del bloque
     */
    getFieldValue(block, fieldName) {
        if (!block) return '';
        try {
            const field = block.getField(fieldName);
            return field ? field.getValue() : '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Verifica si el bloque tiene un substack
     */
    hasSubstack(block) {
        return block && block.getInput && block.getInput('SUBSTACK');
    }

    /**
     * Verifica si el bloque tiene un segundo substack (else)
     */
    hasSubstack2(block) {
        return block && block.getInput && block.getInput('SUBSTACK2');
    }

    /**
     * Obtiene el siguiente bloque en la secuencia
     */
    getNextBlock(block) {
        if (!block || !block.nextConnection) return null;
        return block.nextConnection.targetBlock();
    }

    /**
     * Procesa el siguiente bloque en la cadena
     */
    processNextBlock(block) {
        const nextBlock = this.getNextBlock(block);
        if (nextBlock) {
            this.generateBlock(nextBlock);
        }
    }

    /**
     * Obtiene el nombre de un procedimiento personalizado
     */
    getProcedureName(block) {
        try {
            if (block.getProcCode) {
                return block.getProcCode();
            }
            const mutation = block.mutationToDom && block.mutationToDom();
            if (mutation) {
                return mutation.getAttribute('proccode') || '';
            }
        } catch (e) {
            return '';
        }
        return '';
    }

    /**
     * Extrae información completa de un procedimiento (nombre y parámetros)
     */
    getProcedureInfo(block) {
        const info = {
            name: 'mi_bloque',
            params: [],
            proccode: ''
        };

        try {
            // Para procedures_definition, buscar el prototype dentro
            if (block.type === 'procedures_definition') {
                const customBlockInput = block.getInput('custom_block');
                if (customBlockInput && customBlockInput.connection) {
                    const prototypeBlock = customBlockInput.connection.targetBlock();
                    if (prototypeBlock) {
                        return this.getProcedureInfo(prototypeBlock);
                    }
                }
            }

            // Para procedures_prototype o procedures_call
            let proccode = '';
            let argumentNames = [];

            // Intentar obtener del mutation
            const mutation = block.mutationToDom && block.mutationToDom();
            if (mutation) {
                proccode = mutation.getAttribute('proccode') || '';
                const argNamesAttr = mutation.getAttribute('argumentnames');
                if (argNamesAttr) {
                    try {
                        argumentNames = JSON.parse(argNamesAttr);
                    } catch (e) {
                        argumentNames = [];
                    }
                }
            }

            // Si no hay mutation, intentar métodos directos
            if (!proccode && block.getProcCode) {
                proccode = block.getProcCode();
            }
            if (argumentNames.length === 0 && block.getArgNames) {
                argumentNames = block.getArgNames() || [];
            }

            info.proccode = proccode;

            // Extraer el nombre del procedimiento (quitar placeholders %s, %b, %n)
            const nameMatch = proccode.replace(/%[sbn]/g, '').trim();
            info.name = this.sanitizeVariableName(nameMatch) || 'mi_bloque';

            // Sanitizar nombres de parámetros
            info.params = argumentNames.map(name => this.sanitizeVariableName(name));

        } catch (e) {
            console.warn('[PythonGenerator] Error extrayendo info de procedimiento:', e);
        }

        return info;
    }

    /**
     * Genera código para un procedimiento (definición o llamada)
     */
    generateProcedureCode(block, isDefinition = true) {
        const info = this.getProcedureInfo(block);
        const paramsStr = info.params.join(', ');

        if (isDefinition) {
            return `def ${info.name}(${paramsStr}):`;
        } else {
            // Para llamadas, necesitamos los valores de los argumentos
            const args = this.extractProcedureCallArgs(block, info.params.length);
            return `${info.name}(${args.join(', ')})`;
        }
    }

    /**
     * Extrae los argumentos de una llamada a procedimiento
     */
    extractProcedureCallArgs(block, expectedCount) {
        const args = [];

        if (!block.inputList) return args;

        // Intentar obtener los IDs de los argumentos desde la mutación del bloque
        let argIds = [];
        const mutation = block.mutationToDom && block.mutationToDom();
        if (mutation) {
            const argIdsAttr = mutation.getAttribute('argumentids');
            if (argIdsAttr) {
                try {
                    argIds = JSON.parse(argIdsAttr);
                } catch (e) {}
            }
        }

        // Fallback: Buscar cualquier input que empiece por 'input' o 'arg'
        if (argIds.length === 0) {
            for (const input of block.inputList) {
                if (input.name && (input.name.startsWith('input') || input.name.startsWith('arg'))) {
                    argIds.push(input.name);
                }
            }
        }

        // Extraer el valor de cada argumento basándose en sus IDs
        for (const inputName of argIds) {
            const input = block.getInput(inputName);
            if (input && input.connection && input.connection.targetBlock()) {
                const argBlock = input.connection.targetBlock();
                if (argBlock.isShadow()) {
                    const value = this.extractShadowValue(argBlock);
                    args.push(value !== undefined ? value : '0');
                } else {
                    args.push(this.generateExpression(argBlock));
                }
            } else {
                args.push('0');
            }
        }

        // Rellenar con valores por defecto si faltan argumentos esperados
        while (args.length < expectedCount) {
            args.push('0');
        }

        return args;
    }

    /**
     * Sanitiza un nombre de variable para Python
     */
    sanitizeVariableName(name) {
        if (!name) return 'variable';
        return name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
            .replace(/^[0-9]/, '_$&')
            .toLowerCase() || 'variable';
    }

    /**
     * Obtiene la indentación actual
     */
    getIndent() {
        return '    '.repeat(this.indentLevel);
    }

    /**
     * Template para workspace vacío
     */
    getEmptyTemplate() {
        return `# ═══════════════════════════════════════════════════════════
# Código generado por STBlock
# ═══════════════════════════════════════════════════════════

from stblock import sprite, escenario, sonido
from stblock import esperar, aleatorio

# ¡Arrastra bloques para comenzar!
# El código Python aparecerá aquí automáticamente.

# Ejemplo:
# @cuando_bandera_verde
# def inicio():
#     sprite.decir("¡Hola!")
#     sprite.mover(10)
`;
    }

    /**
     * Template para errores
     */
    getErrorTemplate(errorMsg) {
        return `# ═══════════════════════════════════════════════════════════
# Código generado por STBlock
# ═══════════════════════════════════════════════════════════

# Ocurrió un error al generar el código:
# ${errorMsg || 'Error desconocido'}

# Por favor, verifica tus bloques e intenta de nuevo.
`;
    }
}

/**
 * Instancia singleton del generador
 */
let generatorInstance = null;

/**
 * Obtiene la instancia del generador
 */
export const getGenerator = () => {
    if (!generatorInstance) {
        generatorInstance = new PythonGenerator();
    }
    return generatorInstance;
};

/**
 * Genera código Python desde un workspace
 */
export const generatePythonCode = (workspace) => {
    return getGenerator().generateFromWorkspace(workspace);
};

/**
 * Genera código Python desde un workspace y retorna también el
 * mapa blockId → línea Python para el modo debug.
 * @returns {{code: string, blockLineMap: object}}
 */
export const generatePythonCodeWithMap = (workspace) => {
    const gen = getGenerator();
    const code = gen.generateFromWorkspace(workspace);
    return {code, blockLineMap: Object.assign({}, gen.blockLineMap)};
};

export default PythonGenerator;
