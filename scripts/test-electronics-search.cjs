const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const {JSDOM} = require('../node_modules/.pnpm/jsdom@28.1.0_supports-color@4.4.0/node_modules/jsdom');
const window = new JSDOM('').window;
const source = fs.readFileSync(path.join(root, 'scratch-gui/src/lib/block-search-index.js'), 'utf8')
    .replace(/export function /g, 'function ');
const api = vm.runInNewContext(source + '\n({buildSearchIndex, searchBlocks, buildSearchToolboxXML})', {
    DOMParser: window.DOMParser, XMLSerializer: window.XMLSerializer
});
const xml = '<xml><category id="pins" name="Pines" colour="#123456">' +
    '<block type="board_read"><value name="PIN"><shadow type="math_number">' +
    '<field name="NUM">13</field></shadow></value><mutation mode="analog"/></block></category></xml>';
const metadata = [{blocks: [{json: {type: 'board_read', message0: 'leer analógico %1'}}]}];
const index = api.buildSearchIndex(null, {Msg: {}}, xml, metadata);
const results = api.searchBlocks(index, '  analogico  ');
assert.equal(results.length, 1);
assert.equal(results[0].categoryLabel, 'Pines');
assert.equal(results[0].color, '#123456');
const doc = new window.DOMParser().parseFromString(api.buildSearchToolboxXML(results), 'text/xml');
assert.equal(doc.querySelector('shadow field').textContent, '13');
assert.equal(doc.querySelector('mutation').getAttribute('mode'), 'analog');
const fallback = api.buildSearchIndex(null, {Msg: {BOARD_READ: 'leer pin %1'}}, xml);
assert.equal(api.searchBlocks(fallback, 'leer')[0].name, 'leer pin');
assert.equal(api.searchBlocks(fallback, '   ').length, 0);
const manifests = require('../scratch-vm/src/devices/device-manifests');
for (const [id, manifest] of Object.entries(manifests)) {
    const toolbox = '<xml>' + manifest.categories.map((category, i) =>
        `<category id="c${i}" name="Category">` + category.blocks.map(block => block.xml || '').join('') +
        '</category>').join('') + '</xml>';
    const boardIndex = api.buildSearchIndex(null, {Msg: {}}, toolbox, manifest.categories);
    assert.ok(boardIndex.blocks.length > 0, id);
    const resultsXML = api.buildSearchToolboxXML(boardIndex.blocks);
    const parsed = new window.DOMParser().parseFromString(resultsXML, 'text/xml');
    assert.equal(parsed.querySelector('parsererror'), null, id);
    for (const result of boardIndex.blocks) assert.ok(result.xml.includes(result.type), id);
}
window.close();
console.log('PASS: Spanish labels, category metadata, shadow defaults, mutations, Scratch fallback, blank query; search XML for all 19 board manifests.');
