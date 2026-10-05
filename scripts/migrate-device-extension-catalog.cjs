const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'scratch-gui/src/lib/libraries/device-extensions/index.jsx');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('const deviceExtensions = [')) process.exit(0);
const catalog = vm.runInNewContext(source.replace(/^import .*;\r?\n/gm, '')
    .replace(/export \{[\s\S]*?\};?\s*$/, '') + '\ndeviceExtensions;', {getIconForExtension: () => null});
catalog.forEach(e => { delete e.iconURL; e.programMode = ['upload']; });
fs.writeFileSync(path.join(root, 'scratch-vm/src/devices/extension-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
source = source.replace(/const deviceExtensions = \[[\s\S]*?\n\];/, 'const deviceExtensions = extensionCatalog.map(extension => ({...extension}));');
source = source.replace("import React from 'react';", "import extensionCatalog from 'scratch-vm/src/devices/extension-catalog.json';");
fs.writeFileSync(file, source);
let activator = fs.readFileSync(path.join(root, 'scratch-gui/src/lib/device-extension-activator.js'), 'utf8');
activator = activator.slice(0, activator.indexOf('/**\n * Activate') >= 0 ? activator.indexOf('/**\n * Activate') : activator.indexOf('/**\r\n * Activate'));
fs.writeFileSync(path.join(root, 'scratch-vm/src/devices/device-extensions.js'), activator + '\nmodule.exports = {buildExtensionCategoryInfo, generateBlockJSON, EXTENSION_COLORS};\n');
