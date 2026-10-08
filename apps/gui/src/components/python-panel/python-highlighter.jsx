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

            if (word === 'import' || word === 'from') {
                // Debe comprobarse antes que KEYWORDS: import/from también están
                // en ese set y de lo contrario nunca se usaría el token 'import'.
                type = 'import';
            } else if (KEYWORDS.has(word)) {
                type = word === 'def' || word === 'class' ? 'definition' : 'keyword';
            } else if (CONSTANTS.has(word)) {
                type = 'boolean';
            } else if (BUILTINS.has(word)) {
                type = 'builtin';
            } else if (STBLOCK_FUNCTIONS.has(word)) {
                type = 'function';
            } else if (word === 'self') {
                type = 'self';
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

// Divide un token en segmentos según los rangos que lo atraviesan (coincidencias
// de búsqueda y paréntesis/corchete coincidente). Los rangos usan el mismo
// espacio de coordenadas que el token (offsets relativos al contenido de la
// línea), así el resaltado convive con el syntax highlighting sin romperlo.
const splitTokenByRanges = (token, ranges, tokenStart) => {
    if (!ranges || ranges.length === 0) {
        return [{text: token.value, isMatch: false, isActiveMatch: false, kind: null}];
    }
    const tokenEnd = tokenStart + token.value.length;
    const segments = [];
    let cursor = 0;
    for (const r of ranges) {
        if (r.end <= tokenStart || r.start >= tokenEnd) continue;
        // Clamp al cursor: si una búsqueda se solapa con el paréntesis
        // coincidente, el segundo rango no debe re-dibujar caracteres ya
        // consumidos (evita duplicar texto al renderizar).
        const s = Math.max(tokenStart, r.start, tokenStart + cursor);
        const e = Math.min(tokenEnd, r.end);
        if (s >= e) continue;
        if (s > tokenStart + cursor) {
            segments.push({
                text: token.value.slice(cursor, s - tokenStart),
                isMatch: false,
                isActiveMatch: false,
                kind: null
            });
        }
        segments.push({
            text: token.value.slice(s - tokenStart, e - tokenStart),
            isMatch: true,
            isActiveMatch: r.isActive,
            kind: r.kind
        });
        cursor = e - tokenStart;
    }
    if (cursor < token.value.length) {
        segments.push({
            text: token.value.slice(cursor),
            isMatch: false,
            isActiveMatch: false,
            kind: null
        });
    }
    return segments;
};

const HighlightedLine = React.memo(({
    lineNumber,
    tokens,
    hasError,
    hasWarning,
    isHighlighted,
    isActiveLine,
    isFolded,
    matchRanges,
    showLineNumbers
}) => {
    const lineClass = [
        styles.codeLine,
        hasError ? styles.hasError : '',
        hasWarning ? styles.hasWarning : '',
        isHighlighted ? styles.hasHighlight : '',
        isActiveLine ? styles.hasActiveLine : '',
        isFolded ? styles.folded : ''
    ].filter(Boolean).join(' ');

    // Renderizar cada token, dividiéndolo donde lo atraviesa una coincidencia
    // de búsqueda o un paréntesis coincidente para marcarla sin perder el color.
    let tokenPos = 0;
    const renderedSpans = [];
    tokens.forEach((token, tokenIndex) => {
        const tokenStart = tokenPos;
        tokenPos += token.value.length;
        const tokenClass = TOKEN_CLASS_NAMES[token.type];
        const segments = splitTokenByRanges(token, matchRanges, tokenStart);
        segments.forEach((seg, segIndex) => {
            let cls = tokenClass || '';
            if (seg.isMatch) {
                if (seg.kind === 'bracket') {
                    cls += ` ${styles.bracketHighlight}`;
                } else {
                    cls += ` ${seg.isActiveMatch ? styles.searchHighlightActive : styles.searchHighlight}`;
                }
            }
            renderedSpans.push(
                <span key={`${tokenIndex}-${segIndex}`} className={cls.trim()}>
                    {seg.text}
                </span>
            );
        });
    });

    return (
        <div
            className={lineClass}
            data-line={lineNumber}
            title={hasError ? 'Esta línea tiene un error' :
                (hasWarning ? 'Esta línea tiene una advertencia' : '')}
        >
            {showLineNumbers && (
                <span className={styles.lineNumber}>{lineNumber}</span>
            )}
            <span className={styles.lineContent}>
                {renderedSpans}
                {renderedSpans.length === 0 && '\u00A0'}
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
    isActiveLine: PropTypes.bool.isRequired,
    isFolded: PropTypes.bool.isRequired,
    matchRanges: PropTypes.arrayOf(PropTypes.shape({
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
        isActive: PropTypes.bool.isRequired,
        kind: PropTypes.string
    })),
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
    highlightLine = null,
    activeLine = 0,
    searchMatches = [],
    activeMatchIndex = -1,
    collapsedRanges = [],
    bracketRanges = null
}) => {
    // Conservar los tokens de las líneas que no cambiaron. Antes, cada tecla
    // volvía a tokenizar el archivo completo y recreaba todos sus spans.
    const tokenCacheRef = useRef(new Map());
    const highlightedCode = useMemo(() => {
        if (!code) return [];

        const lines = code.split('\n');
        const errorLineSet = new Set(errorLines);
        const warningLineSet = new Set(warningLines);

        // Rangos de resaltado por línea (offsets relativos al contenido de cada
        // línea): coincidencias de búsqueda + paréntesis/corchete coincidente.
        // kind distingue para aplicar un estilo distinto a cada uno.
        const rangesByLine = new Map();
        const addRange = (lineIdx, start, end, kind, isActive) => {
            let arr = rangesByLine.get(lineIdx);
            if (!arr) {
                arr = [];
                rangesByLine.set(lineIdx, arr);
            }
            arr.push({start, end, kind, isActive});
        };

        if (searchMatches && searchMatches.length > 0) {
            let lineOffset = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineStart = lineOffset;
                const lineEnd = lineStart + lines[i].length;
                searchMatches.forEach((m, mi) => {
                    if (m.end <= lineStart || m.start > lineEnd) return;
                    addRange(i,
                        Math.max(0, m.start - lineStart),
                        Math.min(lines[i].length, m.end - lineStart),
                        'search',
                        mi === activeMatchIndex);
                });
                lineOffset = lineEnd + 1;
            }
        }

        // Par de paréntesis/corchete coincidente (offsets globales, end exclusivo).
        if (bracketRanges && typeof bracketRanges.start === 'number' &&
            typeof bracketRanges.end === 'number') {
            const {start, end} = bracketRanges;
            const lineStarts = [];
            let off = 0;
            for (let i = 0; i < lines.length; i++) {
                lineStarts.push(off);
                off += lines[i].length + 1;
            }
            const locateLine = (pos) => {
                for (let i = 0; i < lineStarts.length; i++) {
                    if (pos < lineStarts[i] + lines[i].length) return i;
                }
                return lines.length - 1;
            };
            const startLine = locateLine(start);
            const endLine = locateLine(end);
            if (startLine === endLine) {
                addRange(startLine,
                    start - lineStarts[startLine],
                    end - lineStarts[startLine],
                    'bracket', false);
            } else {
                addRange(startLine,
                    start - lineStarts[startLine],
                    lines[startLine].length,
                    'bracket', false);
                const endOffset = end - lineStarts[endLine];
                if (endOffset > 0) {
                    addRange(endLine, 0,
                        Math.min(lines[endLine].length, endOffset),
                        'bracket', false);
                }
            }
        }

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

            // ¿Está esta línea dentro del cuerpo de un bloque plegado? Se oculta
            // visualmente (opacity 0) pero conserva su espacio para que el
            // textarea y el highlighter sigan perfectamente alineados.
            let isFolded = false;
            if (collapsedRanges.length > 0) {
                for (let i = 0; i < collapsedRanges.length; i++) {
                    const r = collapsedRanges[i];
                    if (lineIndex >= r.start && lineIndex <= r.end) {
                        isFolded = true;
                        break;
                    }
                }
            }

            const lineRanges = rangesByLine.get(lineIndex);
            const sortedRanges = lineRanges ? lineRanges.slice().sort((a, b) => a.start - b.start) : null;
            return {
                lineNumber,
                tokens,
                hasError: errorLineSet.has(lineNumber),
                hasWarning: warningLineSet.has(lineNumber),
                isHighlighted: highlightLine === lineNumber,
                isActiveLine: activeLine === lineNumber,
                isFolded,
                matchRanges: sortedRanges
            };
        });
        tokenCacheRef.current = nextCache;
        return result;
    }, [code, errorLines, warningLines, highlightLine, activeLine, searchMatches, activeMatchIndex, collapsedRanges, bracketRanges]);

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
                    isActiveLine={line.isActiveLine}
                    isFolded={line.isFolded}
                    matchRanges={line.matchRanges}
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
    highlightLine: PropTypes.number,
    activeLine: PropTypes.number,
    searchMatches: PropTypes.arrayOf(PropTypes.shape({
        start: PropTypes.number,
        end: PropTypes.number,
        line: PropTypes.number
    })),
    activeMatchIndex: PropTypes.number,
    collapsedRanges: PropTypes.arrayOf(PropTypes.shape({
        start: PropTypes.number,
        end: PropTypes.number
    })),
    bracketRanges: PropTypes.shape({
        start: PropTypes.number,
        end: PropTypes.number
    })
};

PythonHighlighter.defaultProps = {
    code: '',
    showLineNumbers: true,
    className: '',
    errorLines: [],
    warningLines: [],
    highlightLine: null,
    activeLine: 0,
    searchMatches: [],
    activeMatchIndex: -1,
    collapsedRanges: [],
    bracketRanges: null
};

const mapStateToProps = state => ({
    highlightLine: state.scratchGui.debugHighlight ?
        state.scratchGui.debugHighlight.highlightLine : null
});

export default connect(mapStateToProps)(PythonHighlighter);
