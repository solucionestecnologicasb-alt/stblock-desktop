/* Read-only source audit. Run: node scripts/audit-electronics-blocks.cjs */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const manifests = require('../scratch-vm/src/devices/device-manifests');
const Generator = require('../scratch-vm/src/generators/arduino');
const generator = new Generator();
function coverage(opcode) {
    if (generator.generators[opcode]) return 'handler';
    const alias = generator._opcodeAliases[opcode];
    if (alias === null) return 'stub';
    if (alias && generator.generators[alias]) return 'alias';
    for (const prefix of generator._knownPrefixes) {
        if (!opcode.startsWith(prefix)) continue;
        const suffix = opcode.slice(prefix.length);
        if (generator.generators[suffix] || generator.generators[suffix[0].toLowerCase() + suffix.slice(1)]) return 'prefix';
    }
    return 'missing';
}
const definitions = new Map();
const boards = Object.entries(manifests).map(([id, manifest]) => {
    const blocks = manifest.categories.flatMap(c => c.blocks).filter(b => b.json && b.info);
    const issues = [];
    const unsupported = [];
    for (const b of blocks) {
        const type = b.json.type;
        const status = coverage(type);
        if (manifest.type === 'arduino' && (status === 'missing' || status === 'stub')) {
            unsupported.push({type, status});
        }
        for (const a of b.json.args0 || []) {
            if (a.name && !Object.hasOwn(b.info.arguments || {}, a.name)) issues.push({type, argument: a.name});
        }
    }
    for (const c of manifest.categories) for (const b of [...c.blocks, ...(c.menus || [])]) {
        if (!b.json) continue;
        const previous = definitions.get(b.json.type);
        const json = JSON.stringify(b.json);
        if (!previous) definitions.set(b.json.type, {json, boards: [id], variants: []});
        else {
            previous.boards.push(id);
            if (previous.json !== json) previous.variants.push(id);
        }
    }
    return {id, type: manifest.type, blocks: blocks.length, categories: manifest.categories.length,
        arduinoCoverageApplicable: manifest.type === 'arduino', unsupported, argumentIssues: issues};
});
const extensions = require('../scratch-vm/src/devices/extension-catalog.json');
const result = {
    note: 'Static handler coverage only: does not prove correct generated code, compilation or hardware behavior. micro:bit uses a separate generator.',
    activeGenerator: 'scratch-vm/src/generators/arduino (shared by GUI and VM)',
    sharedDefinitionsPolicy: 'Preserve existing definitions and workspace blocks on board changes, as requested by the user.',
    boards,
    sharedDefinitionConflicts: [...definitions].filter(([, d]) => d.variants.length).map(([type,d]) => ({type, boards: d.boards, differingBoards: d.variants})),
    extensions: extensions.map(e => ({id: e.extensionId, name: e.name, blocks: e.blocks.map(b => ({
        opcode: `${e.extensionId}_${b.opcode}`, coverage: coverage(`${e.extensionId}_${b.opcode}`),
        guiHandler: !['missing', 'stub'].includes(coverage(`${e.extensionId}_${b.opcode}`))
    }))}))
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
