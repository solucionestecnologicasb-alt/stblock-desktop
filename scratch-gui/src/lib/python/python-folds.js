// Plegado de bloques Python (folding) estilo VS Code.
// Detecta funciones, clases, condicionales, bucles y demás bloques por
// indentación, respetando strings de triple comilla y la continuación
// implícita por paréntesis/corchetes/llaves.

const BLOCK_KEYWORDS = new Set([
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'with',
    'try', 'except', 'finally'
]);

const findTripleClose = (raw, from, tq) => {
    let idx = raw.indexOf(tq, from);
    while (idx !== -1 && raw[idx - 1] === '\\') {
        idx = raw.indexOf(tq, idx + 1);
    }
    return idx;
};

// Escanea una línea, actualizando el estado (triple string / profundidad de
// paréntesis) y devolviendo metadatos usados para detectar bloques.
const scanLine = (raw, state) => {
    const n = raw.length;
    let i = 0;
    let indent = 0;
    while (i < n && (raw[i] === ' ' || raw[i] === '\t')) {
        indent += raw[i] === '\t' ? 4 : 1;
        i++;
    }
    const rest = raw.slice(i);
    const isBlank = rest.trim() === '';
    if (isBlank) {
        return {
            indent,
            isBlank: true,
            isContinuation: state.parenDepth > 0 || state.inTriple !== null,
            codeToken: '',
            opensBlock: false
        };
    }

    let inTriple = state.inTriple;
    let parenDepth = state.parenDepth;
    let isContinuation = inTriple !== null || parenDepth > 0;

    // Si ya estamos dentro de un string de triple comilla, toda la línea es
    // contenido del string (no se analiza como código).
    if (inTriple) {
        const closeIdx = findTripleClose(raw, i, inTriple);
        if (closeIdx !== -1) {
            inTriple = null;
            i = closeIdx + 3;
        } else {
            state.inTriple = inTriple;
            state.parenDepth = parenDepth;
            return {
                indent,
                isBlank: false,
                isContinuation: true,
                codeToken: '',
                opensBlock: false
            };
        }
    }

    let codeToken = '';
    let lastSignificant = '';
    while (i < n) {
        const ch = raw[i];
        if (ch === '#') break; // comentario hasta el final de línea
        if (ch === '"' || ch === "'") {
            if (raw[i + 1] === ch && raw[i + 2] === ch) {
                const tq = ch + ch + ch;
                if (inTriple === null) {
                    inTriple = tq;
                    i += 3;
                    const closeIdx = findTripleClose(raw, i, tq);
                    if (closeIdx !== -1) {
                        inTriple = null;
                        i = closeIdx + 3;
                    }
                    continue;
                }
                inTriple = null;
                i += 3;
                continue;
            }
            // String de una línea
            i++;
            while (i < n && raw[i] !== ch) {
                if (raw[i] === '\\') i++;
                i++;
            }
            if (i < n) i++;
            lastSignificant = '"';
            continue;
        }
        if (ch === '(' || ch === '[' || ch === '{') {
            parenDepth++;
            lastSignificant = ch;
            i++;
            continue;
        }
        if (ch === ')' || ch === ']' || ch === '}') {
            parenDepth = Math.max(0, parenDepth - 1);
            lastSignificant = ch;
            i++;
            continue;
        }
        if (/[A-Za-z_]/.test(ch)) {
            const wStart = i;
            while (i < n && /[A-Za-z0-9_]/.test(raw[i])) i++;
            const word = raw.slice(wStart, i);
            if (!codeToken) codeToken = word;
            lastSignificant = word;
            continue;
        }
        if (!/\s/.test(ch)) {
            lastSignificant = ch;
        }
        i++;
    }

    state.inTriple = inTriple;
    state.parenDepth = parenDepth;

    const endsColon = lastSignificant === ':';
    const opensBlock = BLOCK_KEYWORDS.has(codeToken) && endsColon;
    return {
        indent,
        isBlank,
        isContinuation,
        codeToken,
        opensBlock
    };
};

/**
 * Devuelve los bloques plegables del código.
 *
 * Cada fold:
 *   { header: índice 0-based de la línea que abre el bloque,
 *     start:  índice 0-based de la primera línea del cuerpo,
 *     end:    índice 0-based de la última línea del cuerpo,
 *     indent, kw, sig }
 *
 * `sig` es una firma estable (indent|keyword|texto|counter) usada para
 * conservar el estado colapsado aunque cambien los números de línea.
 */
const parseFolds = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const state = {inTriple: null, parenDepth: 0};
    const meta = lines.map(line => scanLine(line, state));
    const keyCounts = new Map();
    const folds = [];

    for (let i = 0; i < meta.length; i++) {
        const m = meta[i];
        if (m.isBlank || m.isContinuation || !m.opensBlock) continue;
        const indent = m.indent;
        let lastBody = null;
        let sawAnyBody = false;

        for (let j = i + 1; j < meta.length; j++) {
            const mj = meta[j];
            if (mj.isBlank) continue; // las líneas en blanco no cortan el bloque
            if (mj.isContinuation) {
                lastBody = j;
                sawAnyBody = true;
                continue;
            }
            if (mj.indent > indent) {
                lastBody = j;
                sawAnyBody = true;
            } else {
                break; // dedent o mismo nivel → fin del cuerpo
            }
        }

        if (sawAnyBody) {
            const headerText = lines[i].trim();
            const base = `${indent}|${m.codeToken}|${headerText}`;
            const count = keyCounts.get(base) || 0;
            keyCounts.set(base, count + 1);
            folds.push({
                header: i,
                start: i + 1,
                end: lastBody,
                indent,
                kw: m.codeToken,
                sig: `${base}#${count}`
            });
        }
    }
    return folds;
};

export {parseFolds};
