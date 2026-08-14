import React, {useMemo, useRef} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import styles from './python-panel.css';

/**
 * Tokenizador de Python para syntax highlighting
 * Basado en los patrones de VS Code
 */

// Palabras clave de Python
const KEYWORDS = new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
    'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
    'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
]);

// Funciones built-in de Python
const BUILTINS = new Set([
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
    'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr',
    'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter',
    'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr',
    'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass',
    'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
    'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property',
    'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
    'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type',
    'vars', 'zip', '__import__'
]);

// Constantes de Python
const CONSTANTS = new Set(['True', 'False', 'None']);

// Funciones de STBlock
const STBLOCK_FUNCTIONS = new Set([
    'sprite', 'escenario', 'sonido', 'raton', 'esperar', 'aleatorio',
    'preguntar', 'respuesta', 'fisica', 'camara', 'mover', 'girar_derecha',
    'girar_izquierda', 'ir_a', 'ir_a_xy', 'deslizar_a', 'deslizar_a_xy',
    'apuntar_en_direccion', 'apuntar_hacia', 'cambiar_x', 'fijar_x',
    'cambiar_y', 'fijar_y', 'rebotar_si_toca_borde', 'decir', 'pensar',
    'cambiar_disfraz', 'siguiente_disfraz', 'cambiar_fondo', 'siguiente_fondo',
    'cambiar_tamaño', 'fijar_tamaño', 'mostrar', 'esconder', 'quitar_efectos',
    'reproducir', 'reproducir_hasta_terminar', 'detener_todos', 'fijar_volumen',
    'enviar_mensaje', 'enviar_mensaje_y_esperar', 'crear_clon', 'borrar_este_clon',
    'tocando', 'tocando_color', 'distancia_a', 'tecla_presionada',
    'reiniciar_cronometro', 'cronometro', 'saltar', 'fijar_gravedad',
    'fijar_velocidad', 'aplicar_gravedad', 'en_suelo', 'en_aire',
    'fijar_salud', 'cambiar_salud', 'recibir_daño', 'curar',
    'seguir', 'fijar_posicion', 'sacudir', 'zoom', 'colisiona_con',

    // Objeto placa (dispositivos Arduino / STBoard V2 / micro:bit)
    'placa',
    // Pines
    'modo', 'escribir_digital', 'escribir_analogico', 'leer_digital', 'leer_analogico',
    // Servos
    'conectar_servo', 'desconectar_servo', 'escribir_servo', 'escribir_servo_pulso',
    'velocidad_servo_continuo', 'centrar_servo', 'detener_servo_continuo',
    'mover_servo_suave', 'servo_conectado', 'leer_angulo_servo', 'leer_pulso_servo',
    // Serial
    'serial_iniciar', 'serial_enviar', 'serial_enviar_linea', 'serial_disponible',
    'serial_leer', 'serial_leer_hasta', 'serial_vaciar',
    // STBoard V2: puertos
    'mover_servo_puerto', 'mover_servo_puerto_pulsos', 'desconectar_servo_puerto',
    'mover_servo_puerto_suave',
    // I2C
    'i2c_iniciar', 'i2c_velocidad', 'i2c_iniciar_transmision', 'i2c_enviar_byte',
    'i2c_enviar_texto', 'i2c_finalizar_transmision', 'i2c_solicitar', 'i2c_disponible',
    'i2c_leer', 'i2c_escanear',
    // SPI
    'spi_iniciar', 'spi_configurar', 'spi_iniciar_transaccion', 'spi_transferir',
    'spi_transferir_lista', 'spi_finalizar_transaccion', 'spi_finalizar',
    // Datos
    'mapear', 'limitar', 'convertir', 'caracter_ascii', 'ascii_numero',
    'operacion_bits', 'no_bits',
    // Matemáticas
    'potencia', 'raiz_cuadrada', 'valor_absoluto', 'redondear', 'redondear_decimales',
    'aleatorio_rango', 'semilla_aleatoria', 'semilla_aleatoria_analogica', 'micros',
    // Texto
    'texto_longitud', 'texto_caracter', 'texto_subcadena', 'texto_caso', 'texto_recortar',
    'texto_empieza_con', 'texto_termina_con', 'texto_indice_de', 'texto_reemplazar',
    'texto_repetir', 'texto_a_ascii', 'texto_de_ascii',
    // Arrays
    'array_declarar', 'array_declarar_con_valores', 'array_obtener', 'array_poner',
    'array_longitud', 'array_agregar', 'array_quitar_ultimo', 'array_insertar',
    'array_eliminar', 'array_indice_de', 'array_contiene', 'array_limpiar',
    'array_invertir', 'suma_array', 'promedio_array', 'maximo_array', 'minimo_array',
    'ordenar_array',
    // Structs
    'struct_definir', 'struct_crear', 'struct_poner', 'struct_obtener',
    'struct_array_crear', 'struct_array_poner', 'struct_array_obtener'
]);

/**
 * Tokeniza una línea de código Python
 */
const tokenizeLine = (line) => {
    const tokens = [];
    let remaining = line;
    let position = 0;

    while (remaining.length > 0) {
        let matched = false;

        // Espacios en blanco al inicio
        const whitespaceMatch = remaining.match(/^(\s+)/);
        if (whitespaceMatch) {
            tokens.push({ type: 'whitespace', value: whitespaceMatch[1] });
            remaining = remaining.slice(whitespaceMatch[1].length);
            position += whitespaceMatch[1].length;
            matched = true;
            continue;
        }

        // Comentarios
        if (remaining.startsWith('#')) {
            // Verificar si es un header especial
            if (remaining.includes('═') || remaining.includes('STBlock') || remaining.includes('https://')) {
                tokens.push({ type: 'header', value: remaining });
            } else {
                tokens.push({ type: 'comment', value: remaining });
            }
            break;
        }

        // Strings con triple comillas
        const tripleQuoteMatch = remaining.match(/^("""[\s\S]*?"""|'''[\s\S]*?''')/);
        if (tripleQuoteMatch) {
            tokens.push({ type: 'string', value: tripleQuoteMatch[1] });
            remaining = remaining.slice(tripleQuoteMatch[1].length);
            matched = true;
            continue;
        }

        // Strings simples
        const stringMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
        if (stringMatch) {
            tokens.push({ type: 'string', value: stringMatch[1] });
            remaining = remaining.slice(stringMatch[1].length);
            matched = true;
            continue;
        }

        // Decoradores
        const decoratorMatch = remaining.match(/^(@\w+)/);
        if (decoratorMatch) {
            tokens.push({ type: 'decorator', value: decoratorMatch[1] });
            remaining = remaining.slice(decoratorMatch[1].length);
            matched = true;
            continue;
        }

        // Números (incluyendo flotantes y científicos)
        const numberMatch = remaining.match(/^(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)/);
        if (numberMatch) {
            tokens.push({ type: 'number', value: numberMatch[1] });
            remaining = remaining.slice(numberMatch[1].length);
            matched = true;
            continue;
        }

        // Identificadores y palabras clave
        const identifierMatch = remaining.match(/^([a-zA-Z_áéíóúñÁÉÍÓÚÑ][a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]*)/);
        if (identifierMatch) {
            const word = identifierMatch[1];
            let type = 'variable';

            if (KEYWORDS.has(word)) {
                type = word === 'def' || word === 'class' ? 'definition' : 'keyword';
            } else if (CONSTANTS.has(word)) {
                type = 'boolean';
            } else if (BUILTINS.has(word)) {
                type = 'builtin';
            } else if (STBLOCK_FUNCTIONS.has(word)) {
                type = 'function';
            } else if (word === 'self') {
                type = 'self';
            } else if (word === 'import' || word === 'from') {
                type = 'import';
            }

            // Detectar si es un nombre de función (seguido de paréntesis)
            if (type === 'variable' && remaining.slice(word.length).match(/^\s*\(/)) {
                type = 'function';
            }

            tokens.push({ type, value: word });
            remaining = remaining.slice(word.length);
            matched = true;
            continue;
        }

        // Operadores
        const operatorMatch = remaining.match(/^([+\-*/%=<>!&|^~]+|:)/);
        if (operatorMatch) {
            tokens.push({ type: 'operator', value: operatorMatch[1] });
            remaining = remaining.slice(operatorMatch[1].length);
            matched = true;
            continue;
        }

        // Puntuación
        const punctuationMatch = remaining.match(/^([()[\]{},.:;])/);
        if (punctuationMatch) {
            tokens.push({ type: 'punctuation', value: punctuationMatch[1] });
            remaining = remaining.slice(1);
            matched = true;
            continue;
        }

        // Cualquier otro carácter
        if (!matched) {
            tokens.push({ type: 'text', value: remaining[0] });
            remaining = remaining.slice(1);
        }
    }

    return tokens;
};

const TOKEN_CLASS_NAMES = {
    comment: styles.tokenComment,
    header: styles.tokenHeader,
    keyword: styles.tokenKeyword,
    definition: styles.tokenDefinition,
    function: styles.tokenFunction,
    decorator: styles.tokenDecorator,
    string: styles.tokenString,
    number: styles.tokenNumber,
    operator: styles.tokenOperator,
    boolean: styles.tokenBoolean,
    builtin: styles.tokenBuiltin,
    variable: styles.tokenVariable,
    parameter: styles.tokenParameter,
    class: styles.tokenClass,
    punctuation: styles.tokenPunctuation,
    self: styles.tokenSelf,
    import: styles.tokenImport
};

const HighlightedLine = React.memo(({
    lineNumber,
    tokens,
    hasError,
    hasWarning,
    isHighlighted,
    showLineNumbers
}) => {
    const lineClass = [
        styles.codeLine,
        hasError ? styles.hasError : '',
        hasWarning ? styles.hasWarning : '',
        isHighlighted ? styles.hasHighlight : ''
    ].filter(Boolean).join(' ');

    return (
        <div
            className={lineClass}
            title={hasError ? 'Esta línea tiene un error' :
                (hasWarning ? 'Esta línea tiene una advertencia' : '')}
        >
            {showLineNumbers && (
                <span className={styles.lineNumber}>{lineNumber}</span>
            )}
            <span className={styles.lineContent}>
                {tokens.map((token, tokenIndex) => {
                    const tokenClass = TOKEN_CLASS_NAMES[token.type];
                    return tokenClass ? (
                        <span
                            key={tokenIndex}
                            className={tokenClass}
                        >
                            {token.value}
                        </span>
                    ) : <span key={tokenIndex}>{token.value}</span>;
                })}
                {tokens.length === 0 && '\u00A0'}
            </span>
        </div>
    );
});
HighlightedLine.displayName = 'HighlightedLine';

HighlightedLine.propTypes = {
    lineNumber: PropTypes.number.isRequired,
    tokens: PropTypes.arrayOf(PropTypes.shape({
        type: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
    })).isRequired,
    hasError: PropTypes.bool.isRequired,
    hasWarning: PropTypes.bool.isRequired,
    isHighlighted: PropTypes.bool.isRequired,
    showLineNumbers: PropTypes.bool.isRequired
};

/**
 * Componente que renderiza código Python con syntax highlighting
 * Soporta marcado de líneas con errores y resaltado de debug
 */
const PythonHighlighter = ({
    code,
    showLineNumbers,
    className,
    errorLines = [],
    warningLines = [],
    highlightLine = null
}) => {
    // Conservar los tokens de las líneas que no cambiaron. Antes, cada tecla
    // volvía a tokenizar el archivo completo y recreaba todos sus spans.
    const tokenCacheRef = useRef(new Map());
    const highlightedCode = useMemo(() => {
        if (!code) return [];

        const lines = code.split('\n');
        const errorLineSet = new Set(errorLines);
        const warningLineSet = new Set(warningLines);
        const previousCache = tokenCacheRef.current;
        const nextCache = new Map();
        const occurrenceByText = new Map();
        const result = lines.map((line, lineIndex) => {
            const occurrence = occurrenceByText.get(line) || 0;
            occurrenceByText.set(line, occurrence + 1);
            const cacheKey = `${occurrence}\u0000${line}`;
            const tokens = previousCache.get(cacheKey) || tokenizeLine(line);
            nextCache.set(cacheKey, tokens);
            const lineNumber = lineIndex + 1;
            return {
                lineNumber,
                tokens,
                hasError: errorLineSet.has(lineNumber),
                hasWarning: warningLineSet.has(lineNumber),
                isHighlighted: highlightLine === lineNumber
            };
        });
        tokenCacheRef.current = nextCache;
        return result;
    }, [code, errorLines, warningLines, highlightLine]);

    return (
        <div className={`${styles.codeDisplay} ${className || ''}`}>
            {highlightedCode.map(line => (
                <HighlightedLine
                    key={line.lineNumber}
                    lineNumber={line.lineNumber}
                    tokens={line.tokens}
                    hasError={line.hasError}
                    hasWarning={line.hasWarning}
                    isHighlighted={line.isHighlighted}
                    showLineNumbers={showLineNumbers}
                />
            ))}
        </div>
    );
};

PythonHighlighter.propTypes = {
    code: PropTypes.string,
    showLineNumbers: PropTypes.bool,
    className: PropTypes.string,
    errorLines: PropTypes.arrayOf(PropTypes.number),
    warningLines: PropTypes.arrayOf(PropTypes.number),
    highlightLine: PropTypes.number
};

PythonHighlighter.defaultProps = {
    code: '',
    showLineNumbers: true,
    className: '',
    errorLines: [],
    warningLines: [],
    highlightLine: null
};

const mapStateToProps = state => ({
    highlightLine: state.scratchGui.debugHighlight ?
        state.scratchGui.debugHighlight.highlightLine : null
});

export default connect(mapStateToProps)(PythonHighlighter);
