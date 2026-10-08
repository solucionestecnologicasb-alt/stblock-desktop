import React, {useRef, useMemo} from 'react';
import PropTypes from 'prop-types';
import styles from './code-editor.css';

/**
 * Simple Code Editor Component with syntax highlighting
 * Uses native HTML for reliable rendering
 */

// Arduino/C++ syntax highlighting
const highlightCode = (code) => {
    if (!code) return '';

    // Tokenize first, then convert to HTML to avoid regex conflicts
    const tokens = [];
    let remaining = code;

    // Patterns in order of priority
    const patterns = [
        { type: 'comment', regex: /^\/\*[\s\S]*?\*\// },
        { type: 'comment', regex: /^\/\/[^\n]*/ },
        { type: 'string', regex: /^"(?:[^"\\]|\\.)*"/ },
        { type: 'string', regex: /^'(?:[^'\\]|\\.)*'/ },
        { type: 'preprocessor', regex: /^#\s*(?:include|define|ifdef|ifndef|endif|pragma|if|else|elif|undef|error|warning)[^\n]*/ },
        { type: 'keyword', regex: /^(?:void|int|float|double|char|bool|boolean|byte|word|long|short|unsigned|signed|const|static|volatile|extern|if|else|for|while|do|switch|case|default|break|continue|return|true|false|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|sizeof|typedef|struct|enum|class)\b/ },
        { type: 'function', regex: /^(?:setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|millis|micros|map|constrain|min|max|abs|pow|sqrt|sin|cos|tan|random|randomSeed|tone|noTone|pulseIn|attachInterrupt|detachInterrupt|interrupts|noInterrupts|Serial|Wire|SPI|begin|end|print|println|read|write|available|flush|attach|detach|display|clearDisplay|setTextSize|setTextColor|setCursor|drawPixel|drawLine|drawRect|fillRect|drawCircle|fillCircle)\b/ },
        { type: 'number', regex: /^(?:0x[0-9a-fA-F]+|0b[01]+|\d+\.?\d*[fFdDlL]?)\b/ }
    ];

    while (remaining.length > 0) {
        let matched = false;

        for (const pattern of patterns) {
            const match = remaining.match(pattern.regex);
            if (match) {
                tokens.push({ type: pattern.type, value: match[0] });
                remaining = remaining.slice(match[0].length);
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Take one character as plain text
            const char = remaining[0];
            // Merge with previous plain token if exists
            if (tokens.length > 0 && tokens[tokens.length - 1].type === 'plain') {
                tokens[tokens.length - 1].value += char;
            } else {
                tokens.push({ type: 'plain', value: char });
            }
            remaining = remaining.slice(1);
        }
    }

    // Convert tokens to HTML
    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const typeToClass = {
        comment: 'cm',
        string: 'st',
        preprocessor: 'pp',
        keyword: 'kw',
        function: 'fn',
        number: 'nu'
    };

    return tokens.map(token => {
        const escaped = escapeHtml(token.value);
        const className = typeToClass[token.type];
        if (className) {
            return `<span class="${className}">${escaped}</span>`;
        }
        return escaped;
    }).join('');
};

const CodeEditor = ({
    code,
    language,
    readOnly,
    onChange
}) => {
    const containerRef = useRef(null);
    const codeRef = useRef(null);

    // Memoize highlighted code
    const highlightedCode = useMemo(() => highlightCode(code), [code]);

    // Line numbers
    const lineNumbers = useMemo(() => {
        if (!code) return ['1'];
        const lines = code.split('\n');
        return lines.map((_, i) => String(i + 1));
    }, [code]);

    return (
        <div
            className={styles.codeEditorContainer}
            ref={containerRef}
        >
            <div className={styles.codeWrapper}>
                <div className={styles.lineNumbers}>
                    {lineNumbers.map((num, i) => (
                        <div key={i} className={styles.lineNumber}>{num}</div>
                    ))}
                </div>
                <pre className={styles.codeContent}>
                    <code
                        ref={codeRef}
                        className={styles.codeBlock}
                        dangerouslySetInnerHTML={{__html: highlightedCode || '// Sin código'}}
                    />
                </pre>
            </div>
        </div>
    );
};

CodeEditor.propTypes = {
    code: PropTypes.string,
    language: PropTypes.string,
    readOnly: PropTypes.bool,
    onChange: PropTypes.func
};

CodeEditor.defaultProps = {
    code: '',
    language: 'arduino',
    readOnly: true
};

export default CodeEditor;
