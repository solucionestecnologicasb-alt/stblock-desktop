/**
 * Device Extension Activator
 * Converts device extension metadata to scratch-blocks JSON and toolbox XML definitions,
 * registers them with the VM runtime, and handles activation/deactivation.
 */

const EXTENSION_COLORS = {
    sensors: {color1: '#4CBF6A', color2: '#389D53', color3: '#267A3E'},
    actuators: {color1: '#FF8C1A', color2: '#CC7015', color3: '#A65A0F'},
    display: {color1: '#0FBD8C', color2: '#0C9B73', color3: '#0A7D5C'},
    communication: {color1: '#9966FF', color2: '#784BE6', color3: '#5C38B8'},
    other: {color1: '#CF63CF', color2: '#BD42BD', color3: '#A033A0'}
};

/**
 * Generate scratch-blocks JSON for a single block from extension metadata
 */
const generateBlockJSON = (opcode, blockInfo, extensionId, colors) => {
    const extendedOpcode = `${extensionId}_${opcode}`;
    const blockJSON = {
        type: extendedOpcode,
        inputsInline: true,
        category: blockInfo.category || 'extension',
        colour: colors.color1,
        colourSecondary: colors.color2,
        colourTertiary: colors.color3
    };

    // Set output/statement shape based on blockType
    switch (blockInfo.blockType) {
    case 'command':
        blockJSON.outputShape = 0; // SQUARE
        blockJSON.previousStatement = null;
        blockJSON.nextStatement = null;
        break;
    case 'reporter':
        blockJSON.output = 'Number';
        blockJSON.outputShape = 1; // ROUND
        break;
    case 'boolean':
        blockJSON.output = 'Boolean';
        blockJSON.outputShape = 2; // HEXAGONAL
        break;
    }

    // Build args0 from text template and arguments
    const args0 = [];
    let argCount = 0;
    let message0 = blockInfo.text.replace(/\[([^\]]+)\]/g, (match, argName) => {
        argCount++;
        const argDef = blockInfo.arguments ? blockInfo.arguments[argName] : null;
        if (argDef) {
            const argEntry = {
                type: 'input_value',
                name: argName
            };
            if (argDef.type === 'boolean' || argDef.type === 'Boolean') {
                argEntry.check = 'Boolean';
            }
            if (argDef.menu) {
                const menuVal = argDef.menu;
                if (Array.isArray(menuVal)) {
                    argEntry.type = 'field_dropdown';
                    argEntry.options = menuVal.map(item => [item, item]);
                } else {
                    argEntry.type = 'field_dropdown';
                    argEntry.options = menuVal.map(item => [item, item]);
                }
            }
            args0.push(argEntry);
        } else {
            args0.push({
                type: 'input_value',
                name: argName
            });
        }
        return `%${argCount}`;
    });

    // If there are no arguments but the text has no placeholders, create a simple message
    if (!message0) {
        message0 = blockInfo.text || '';
    }

    blockJSON.message0 = message0;
    if (args0.length > 0) {
        blockJSON.args0 = args0;
    }

    return blockJSON;
};

/**
 * Generate the toolbox XML for a block, so it appears in the flyout palette.
 * This mirrors what runtime._convertBlockForScratchBlocks does for the xml property.
 */
const generateBlockXML = (opcode, blockInfo, extensionId) => {
    const extendedOpcode = `${extensionId}_${opcode}`;
    const inputs = [];

    if (blockInfo.arguments) {
        Object.keys(blockInfo.arguments).forEach(argName => {
            const argDef = blockInfo.arguments[argName];
            const defaultValue = typeof argDef.defaultValue !== 'undefined' ?
                String(argDef.defaultValue) : '';

            if (argDef.menu) {
                // Field dropdown: <field name="argName">defaultValue</field>
                inputs.push(`<field name="${argName}">${xmlEscape(defaultValue)}</field>`);
            } else if (argDef.type === 'boolean' || argDef.type === 'Boolean') {
                // Boolean: <value name="argName"></value> (no shadow)
                inputs.push(`<value name="${argName}"></value>`);
            } else if (argDef.type === 'number') {
                // Number: <value name="argName"><shadow type="math_number"><field name="NUM">val</field></shadow></value>
                inputs.push(
                    `<value name="${argName}">` +
                    `<shadow type="math_number"><field name="NUM">${xmlEscape(defaultValue)}</field></shadow>` +
                    `</value>`
                );
            } else if (argDef.type === 'string') {
                // String: <value name="argName"><shadow type="text"><field name="TEXT">val</field></shadow></value>
                inputs.push(
                    `<value name="${argName}">` +
                    `<shadow type="text"><field name="TEXT">${xmlEscape(defaultValue)}</field></shadow>` +
                    `</value>`
                );
            } else {
                // Fallback: generic input value with math_number shadow
                inputs.push(
                    `<value name="${argName}">` +
                    `<shadow type="math_number"><field name="NUM">${xmlEscape(defaultValue)}</field></shadow>` +
                    `</value>`
                );
            }
        });
    }

    return `<block type="${extendedOpcode}">${inputs.join('')}</block>`;
};

/**
 * Escape special XML characters
 */
const xmlEscape = (str) => {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Build a CategoryInfo object for an extension that can be
 * pushed to runtime._deviceBlockInfo
 */
const buildExtensionCategoryInfo = (extension, extColor) => {
    const colors = extColor || EXTENSION_COLORS[extension.category] || EXTENSION_COLORS.other;

    const categoryInfo = {
        id: extension.extensionId,
        name: extension.name,
        color1: colors.color1,
        color2: colors.color2,
        color3: colors.color3,
        blocks: [],
        customFieldTypes: {},
        menus: [],
        menuInfo: {}
    };

    if (extension.blocks && extension.blocks.length > 0) {
        extension.blocks.forEach(blockInfo => {
            const blockJSON = generateBlockJSON(
                blockInfo.opcode,
                blockInfo,
                extension.extensionId,
                colors
            );
            const blockXML = generateBlockXML(
                blockInfo.opcode,
                blockInfo,
                extension.extensionId
            );
            categoryInfo.blocks.push({
                info: blockInfo,
                json: blockJSON,
                xml: blockXML
            });
        });
    }

    return categoryInfo;
};

/**
 * Activate a device extension by registering its blocks with the VM runtime
 */
const activateDeviceExtension = (vm, extension) => {
    if (!vm || !vm.runtime) {
        console.error('[DeviceExtActivator] No VM/runtime available');
        return;
    }

    const runtime = vm.runtime;
    const existingIndex = runtime._deviceBlockInfo.findIndex(
        ci => ci.id === extension.extensionId
    );
    if (existingIndex >= 0) {
        console.log('[DeviceExtActivator] Extension already active:', extension.extensionId);
        return;
    }

    const extColor = EXTENSION_COLORS[extension.category] || EXTENSION_COLORS.other;
    const categoryInfo = buildExtensionCategoryInfo(extension, extColor);

    // Add to device block info
    runtime._deviceBlockInfo.push(categoryInfo);

    // Emit BLOCKSINFO_UPDATE so blocks.jsx picks it up
    runtime.emit(runtime.constructor.BLOCKSINFO_UPDATE, categoryInfo);

    console.log('[DeviceExtActivator] Activated extension:', extension.extensionId,
        'with', categoryInfo.blocks.length, 'blocks');
};

/**
 * Deactivate a device extension by removing its blocks from the VM runtime
 * and refreshing the workspace so the toolbox updates.
 */
const deactivateDeviceExtension = (vm, extension) => {
    if (!vm || !vm.runtime) {
        console.error('[DeviceExtActivator] No VM/runtime available');
        return;
    }

    const runtime = vm.runtime;
    const existingIndex = runtime._deviceBlockInfo.findIndex(
        ci => ci.id === extension.extensionId
    );

    if (existingIndex < 0) {
        console.log('[DeviceExtActivator] Extension not active:', extension.extensionId);
        return;
    }

    // Remove from device block info
    runtime._deviceBlockInfo.splice(existingIndex, 1);

    // Refresh workspace so the toolbox XML is regenerated without this extension
    vm.refreshWorkspace();

    console.log('[DeviceExtActivator] Deactivated extension:', extension.extensionId);
};

export {
    activateDeviceExtension,
    deactivateDeviceExtension,
    buildExtensionCategoryInfo,
    generateBlockJSON,
    EXTENSION_COLORS
};
