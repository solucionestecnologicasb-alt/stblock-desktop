import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {KIDS_BLOCK_INSTRUCTIONS, KIDS_DIRECTION_INSTRUCTIONS, normalizeKidsVoiceText} from '../scratch-gui/src/lib/kids-voice-text.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(new URL('../sketchforge/package.json', import.meta.url));
const ts = require('typescript');
export const voiceOutput = resolve(root, 'scratch-gui/static/kids/voice/es');
export const voiceSources = [
    'scratch-gui/src/components/kids-experience/scratchjr-kids-workspace.jsx',
    'scratch-gui/src/components/kids-experience/story-challenges.js',
    'scratch-gui/static/kids/stblock-kids-bridge.js'
];
const ruleSources = [
    'vendor/scratchjr-reborn/src/app/src/editor/ui/Palette.ts',
    'vendor/scratchjr-reborn/src/app/src/editor/engine/Prims.ts',
    'vendor/scratchjr-reborn/src/app/src/editor/ScratchJr.ts'
];

export async function collectKidsVoiceCatalog() {
    const phrases = new Map();
    const add = raw => {
        if (typeof raw !== 'string') return;
        const text = raw.trim().replace(/\s+/g, ' ');
        if (!text || text.length > 2000 || /[<>{}]|https?:|data:|#[0-9a-f]{3,}/i.test(text)) return;
        const key = normalizeKidsVoiceText(text);
        if (key && /[a-záéíóúüñ]/.test(key)) phrases.set(key, text);
    };
    Object.values(KIDS_BLOCK_INSTRUCTIONS).forEach(add);
    Object.values(KIDS_DIRECTION_INSTRUCTIONS).forEach(add);
    for (const file of voiceSources) {
        const source = await readFile(resolve(root, file), 'utf8');
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
        const walk = node => {
            if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'BLOCK_LABELS' && node.initializer) {
                const labels = item => {if (ts.isStringLiteralLike(item)) add(item.text);ts.forEachChild(item, labels);};
                labels(node.initializer);
            }
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
                node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle || node.kind === ts.SyntaxKind.TemplateTail) {
                // Include complete messages and template fragments. Short labels used as
                // substitutions (actor names, blocks, hints) are included as well.
                const value = node.text;
                if (/\s/.test(value) || node.parent && ts.isPropertyAssignment(node.parent) && /^(name|title|label|speech|hint|story|summary|objective|lesson|message|prompt|solutionText)$/.test(node.parent.name.getText(ast))) add(value);
            }
            ts.forEachChild(node, walk);
        };
        walk(ast);
    }
    for (const file of ruleSources) {
        const source = await readFile(resolve(root,file),'utf8');
        const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
        const strings = node => {if (ts.isStringLiteralLike(node)) add(node.text);ts.forEachChild(node,strings);};
        const walk = node => {
            if (ts.isCallExpression(node) && /notifyRuleViolation/.test(node.expression.getText(ast))) node.arguments.forEach(strings);
            ts.forEachChild(node,walk);
        };
        walk(ast);
    }
    // Record whole sentences too, so interpolated messages keep natural phrasing.
    for (const text of [...phrases.values()]) for (const sentence of text.split(/(?<=[.!?;:])\s+/)) add(sentence);
    const words = new Set([...phrases.keys()].flatMap(key => key.split(' ')));
    ['más','menos','especial'].forEach(word => words.add(word));
    for (const word of words) if (!phrases.has(word)) phrases.set(word, word);
    for (let number = 0; number <= 200; number++) phrases.set(String(number), String(number));
    const letters = {a:'a', b:'be', c:'ce', d:'de', e:'e', f:'efe', g:'ge', h:'hache', i:'i', j:'jota', k:'ka', l:'ele', m:'eme', n:'ene', o:'o', p:'pe'};
    for (const [key, text] of Object.entries(letters)) if (!phrases.has(key)) phrases.set(key, text);
    const entries = [...phrases].sort(([a],[b]) => a.localeCompare(b,'es')).map(([key,text]) => ({key,text,file:createHash('sha256').update(key).digest('hex').slice(0,24)+'.wav'}));
    return {schema:1, language:'es', entries};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const catalog = await collectKidsVoiceCatalog();
    console.log(JSON.stringify(catalog));
}
