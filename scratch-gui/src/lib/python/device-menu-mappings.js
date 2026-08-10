/**
 * STBlock - Mapeos de menús de bloques de dispositivo
 *
 * Los bloques de dispositivo (Arduino, STBoard V2, micro:bit) guardan en sus
 * campos valores CANÓNICOS del manifest (p.ej. LEVEL='HIGH', MODE='OUTPUT',
 * EOL='warp'), mientras que la API Python usa etiquetas en español
 * (p.ej. placa.escribir_digital(13, "alto")).
 *
 * Este módulo centraliza la traducción en ambas direcciones:
 *   - MENU_VALUES   : etiqueta Python → valor canónico
 *   - MENU_LABELS   : valor canónico → etiqueta Python (inverso)
 *   - MENU_OPCODES  : opcode completo → {inputName: {shadowOpcode, fieldName}}
 *                     para inputs que usan <value><shadow type="...menu...">
 *   - formatPin     : formatea un pin para Python (evita Number('A0') = NaN)
 */

// ═══════════════════════════════════════════════════════════════
// MENU_VALUES: etiqueta Python → valor canónico del manifest
// ═══════════════════════════════════════════════════════════════
export const MENU_VALUES = {
    level: { 'alto': 'HIGH', 'bajo': 'LOW' },
    mode: {
        'entrada': 'INPUT',
        'salida': 'OUTPUT',
        'entrada_pullup': 'INPUT_PULLUP'
    },
    dataType: { 'entero': 'INTEGER', 'decimal': 'DECIMAL', 'texto': 'STRING' },
    roundMode: { 'redondear': 'round', 'redondear_arriba': 'ceil', 'redondear_abajo': 'floor' },
    textCase: { 'mayusculas': 'upper', 'minusculas': 'lower' },
    sortOrder: { 'ascendente': 'ASC', 'descendente': 'DESC' },
    spiMode: {
        'modo0': 'SPI_MODE0', 'modo1': 'SPI_MODE1',
        'modo2': 'SPI_MODE2', 'modo3': 'SPI_MODE3'
    },
    spiOrder: { 'msb_primero': 'MSBFIRST', 'lsb_primero': 'LSBFIRST' },
    bitwiseOp: {
        'y': '&', 'o': '|', 'xor': '^', 'no': '~',
        'desplazar_izquierda': '<<', 'desplazar_derecha': '>>'
    },
    // eol es especial: el Python usa True/False (booleano), el canónico warp/noWarp
    eol: { 'True': 'warp', 'False': 'noWarp' }
};

// ═══════════════════════════════════════════════════════════════
// MENU_LABELS: valor canónico → etiqueta Python (inverso)
// ═══════════════════════════════════════════════════════════════
export const MENU_LABELS = {};
for (const menu of Object.keys(MENU_VALUES)) {
    MENU_LABELS[menu] = {};
    for (const [label, canonical] of Object.entries(MENU_VALUES[menu])) {
        MENU_LABELS[menu][canonical] = label;
    }
}

// ═══════════════════════════════════════════════════════════════
// MENU_OPCODES: opcode completo → shadow-menus
// Se usa cuando el XML del bloque tiene:
//   <value name="LEVEL"><shadow type="arduino_pin_menu_level"><field name="level">HIGH</field></shadow></value>
// ═══════════════════════════════════════════════════════════════
export const MENU_OPCODES = {
    'arduino_pin_setDigitalOutput': {
        LEVEL: { shadowOpcode: 'arduino_pin_menu_level', fieldName: 'level', menuName: 'level' }
    },
    'microbit_pin_setDigitalOutput': {
        LEVEL: { shadowOpcode: 'microbit_pin_menu_level', fieldName: 'level', menuName: 'level' }
    }
};

/**
 * Convierte una etiqueta Python (o un valor canónico ya válido) al valor
 * canónico que espera el campo del bloque Scratch.
 * @param {string} menu - nombre del menú (level, mode, eol, dataType, ...)
 * @param {*} value - etiqueta Python o valor canónico
 * @returns {*} valor canónico
 */
export const menuToCanonical = (menu, value) => {
    const table = MENU_VALUES[menu];
    if (table && table[value] !== undefined) return table[value];
    return value;
};

/**
 * Convierte un valor canónico del manifest a la etiqueta Python.
 * Si el menú no está registrado, devuelve el valor tal cual.
 * @param {string} menu - nombre del menú
 * @param {*} value - valor canónico del manifest
 * @returns {string} etiqueta Python
 */
export const menuLabel = (menu, value) => {
    const table = MENU_LABELS[menu];
    if (table && table[value] !== undefined) return table[value];
    return String(value);
};

/**
 * Formatea un pin para Python. Los pines pueden ser numéricos ("13"), analógicos
 * ("A0"), expresiones (bloque reportero conectado) o variables.
 * formatNumberOrExpr("A0") devolvería '0' (Number('A0') === NaN), así que aquí
 * los pines no numéricos se emiten como string literal.
 * @param {*} value - valor del pin
 * @param {Object} [args] - args de la generación (para __expressions__)
 * @param {string} [argName] - nombre del argumento
 * @returns {string} pin formateado para Python
 */
export const formatPin = (value, args, argName) => {
    if (value === null || value === undefined) return '0';

    // Expresión conectada (bloque reportero)
    if (args && args.__expressions__ && args.__expressions__[argName]) {
        return String(value);
    }

    const strValue = String(value);
    // Expresión Python (variable, llamada, aritmética)
    if (strValue.includes('(') || strValue.includes('.') ||
        strValue.includes('+') || strValue.includes('*') || strValue.includes('/')) {
        return strValue;
    }
    // Número puro ("13" → 13)
    if (/^-?\d+(\.\d+)?$/.test(strValue)) {
        return String(Number(strValue));
    }
    // Pin analógico u otro no numérico ("A0") → string literal
    return `"${strValue}"`;
};
