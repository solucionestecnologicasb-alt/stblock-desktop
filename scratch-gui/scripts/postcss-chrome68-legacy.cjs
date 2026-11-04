/**
 * PostCSS plugin: fallbacks for CSS features that Chrome 68 (Android System
 * WebView on the HP Chromebook x360) does not implement.
 *
 * It only *prepends* declarations. Modern engines keep using the original
 * value; Chrome 68 discards the unsupported declaration and applies the
 * fallback instead.
 *
 * Handled:
 *   inset: <1-4 valores>       -> top / right / bottom / left
 *   dvh/svh/lvh, dvw/svw/lvw   -> vh / vw (el WebView no cambia de tamaño)
 *   env(safe-area-inset-*)     -> 0px
 *   min()/max()/clamp()        -> valor constante aproximado
 *
 * min()/max()/clamp() no se pueden resolver en tiempo de compilación. Se usa
 * una aproximación: min/max toman su primer argumento y clamp() el valor
 * preferido (el del medio). En pantallas anchas como la Chromebook es una
 * aproximación razonable y, al ser sólo un fallback, no afecta a Chrome
 * moderno.
 */

const DYNAMIC_UNITS = /(\d*\.?\d+)(dvh|svh|lvh|dvw|svw|lvw)\b/gi;
const SAFE_AREA = /(?:env|constant)\(\s*safe-area-inset-(?:top|right|bottom|left|inline-start|inline-end|block-start|block-end)(?:-[a-z-]+)?\s*(?:,[^()]*)?\)/gi;
const MATH_FUNCTIONS = ['clamp', 'min', 'max'];

function splitTopLevel(input, separator) {
    const parts = [];
    let depth = 0;
    let start = 0;
    let quote = null;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (quote) {
            if (ch === '\\') i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
        } else if (ch === separator && depth === 0) {
            parts.push(input.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(input.slice(start));
    return parts;
}

function findMatchingParen(input, openIndex) {
    let depth = 0;
    let quote = null;
    for (let i = openIndex; i < input.length; i++) {
        const ch = input[i];
        if (quote) {
            if (ch === '\\') i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function findFirstMathFunction(value) {
    const lower = value.toLowerCase();
    let best = null;
    for (const name of MATH_FUNCTIONS) {
        let index = lower.indexOf(`${name}(`);
        while (index !== -1) {
            const previous = index === 0 ? '' : value[index - 1];
            // Evita coincidencias dentro de otros identificadores (p. ej. minmax()).
            if (!/[a-z0-9_-]/i.test(previous)) break;
            index = lower.indexOf(`${name}(`, index + 1);
        }
        if (index !== -1 && (!best || index < best.index)) {
            best = {index, name};
        }
    }
    return best;
}

function approximateMathFunctions(value) {
    let result = value;
    let guard = 0;
    while (guard++ < 200) {
        const found = findFirstMathFunction(result);
        if (!found) break;
        const openIndex = result.indexOf('(', found.index);
        const closeIndex = findMatchingParen(result, openIndex);
        if (closeIndex === -1) break;
        const args = splitTopLevel(result.slice(openIndex + 1, closeIndex), ',');
        let chosen = args[0];
        if (found.name === 'clamp' && args.length >= 3) {
            chosen = args[1];
        }
        const replacement = approximateMathFunctions(chosen.trim());
        result = result.slice(0, found.index) + replacement + result.slice(closeIndex + 1);
    }
    return result;
}

function legacyValue(value) {
    if (!value) return value;
    let result = value.replace(SAFE_AREA, '0px');
    result = result.replace(DYNAMIC_UNITS, (match, number, unit) => number + unit.slice(1).toLowerCase());
    result = approximateMathFunctions(result);
    return result;
}

module.exports = () => ({
    postcssPlugin: 'postcss-chrome68-legacy',
    Declaration(decl) {
        if (!decl.value || decl.prop.startsWith('--')) return;

        if (decl.prop.toLowerCase() === 'inset') {
            const values = splitTopLevel(decl.value.trim(), ' ').filter(Boolean);
            if (values.length < 1 || values.length > 4) return;
            const [top, right = top, bottom = top, left = right] = values;
            decl.cloneBefore({prop: 'top', value: legacyValue(top)});
            decl.cloneBefore({prop: 'right', value: legacyValue(right)});
            decl.cloneBefore({prop: 'bottom', value: legacyValue(bottom)});
            decl.cloneBefore({prop: 'left', value: legacyValue(left)});
            return;
        }

        const fallback = legacyValue(decl.value);
        if (fallback !== decl.value) {
            decl.cloneBefore({value: fallback});
        }
    }
});

module.exports.postcss = true;
