/**
 * Arduino Generator Wrapper for STBlock GUI
 *
 * This module provides a bridge between the Scratch/Blockly workspace
 * and the ArduinoGenerator from scratch-vm.
 *
 * It exposes a Blockly-compatible API with workspaceToCode(workspace).
 */

// Static import of ArduinoGenerator from local scratch-vm
// Webpack handles CommonJS interop at build time for module.exports
import ArduinoGenerator from '../../../scratch-vm/src/generators/arduino/index.js';

/**
 * Convert Blockly workspace blocks to the format expected by ArduinoGenerator
 * @param {Object} workspace - Blockly workspace
 * @returns {Object} - Blocks in ArduinoGenerator format
 */
function extractBlocksFromWorkspace(workspace) {
    const blocks = {};

    if (!workspace || !workspace.getAllBlocks) {
        console.warn('[ArduinoGenerator] Invalid workspace');
        return blocks;
    }

    const allBlocks = workspace.getAllBlocks(false);

    for (const block of allBlocks) {
        if (!block || !block.id) continue;

        const blockData = {
            id: block.id,
            opcode: block.type,
            topLevel: !block.parentBlock_,
            parent: block.parentBlock_ ? block.parentBlock_.id : null,
            next: block.nextConnection && block.nextConnection.targetBlock()
                ? block.nextConnection.targetBlock().id
                : null,
            inputs: {},
            fields: {}
        };

        // Extract inputs (connected blocks and shadow blocks)
        if (block.inputList) {
            for (const input of block.inputList) {
                if (!input.name) continue;

                const inputData = {
                    name: input.name,
                    block: null,
                    shadow: null
                };

                // Check for connected block
                if (input.connection && input.connection.targetBlock()) {
                    const targetBlock = input.connection.targetBlock();
                    inputData.block = targetBlock.id;

                    // Check if it's a shadow block
                    if (targetBlock.isShadow()) {
                        inputData.shadow = targetBlock.id;
                        inputData.block = null;
                    }
                }

                // Check for shadow block
                if (input.connection && input.connection.getShadowDom()) {
                    const shadowBlock = input.connection.targetBlock();
                    if (shadowBlock && shadowBlock.isShadow()) {
                        inputData.shadow = shadowBlock.id;
                    }
                }

                blockData.inputs[input.name] = inputData;
            }
        }

        // Extract fields (dropdowns, text inputs, etc.)
        // Primary source: block.fieldRow (standard Blockly API)
        if (block.fieldRow) {
            for (const field of block.fieldRow) {
                if (field.name !== undefined && field.name !== null && field.getValue) {
                    let value = field.getValue();
                    // For variable fields, getValue() returns the internal variable ID.
                    // Use getText() to get the actual variable name (e.g., "hora" instead of "_90R_exUi5y...").
                    if (field.getVariable && field.getText) {
                        value = field.getText();
                    }
                    if (value !== null && value !== undefined) {
                        blockData.fields[field.name] = {
                            name: field.name,
                            value: value
                        };
                    }
                }
            }
        }

        // Secondary source: fields inside inputs (scratch-blocks variant)
        if (block.inputList) {
            for (const input of block.inputList) {
                if (input.fieldRow) {
                    for (const field of input.fieldRow) {
                        if (field.name !== undefined && field.name !== null && field.getValue && !blockData.fields[field.name]) {
                            let value = field.getValue();
                            // Same fix for variable fields
                            if (field.getVariable && field.getText) {
                                value = field.getText();
                            }
                            if (value !== null && value !== undefined) {
                                blockData.fields[field.name] = {
                                    name: field.name,
                                    value: value
                                };
                            }
                        }
                    }
                }
            }
        }

        // Extract mutation data (for procedures, broadcasts, etc.)
        // Use mutationToDom() which is the standard Blockly API for mutation serialization
        if (block.mutationToDom) {
            try {
                const mutationDom = block.mutationToDom();
                if (mutationDom && mutationDom.hasAttributes()) {
                    const proccode = mutationDom.getAttribute('proccode');
                    if (proccode) {
                        blockData.mutation = {
                            proccode: proccode,
                            argumentIds: mutationDom.getAttribute('argumentids') || '[]',
                            argumentNames: mutationDom.getAttribute('argumentnames') || '[]',
                            warp: mutationDom.getAttribute('warp') === 'true'
                        };
                    }
                }
            } catch (e) {
                // Some blocks throw when mutationToDom is called without proper state
            }
        }

        // Fallback: try to get mutation from direct block properties (scratch-blocks internal)
        if (!blockData.mutation && block.procCode_) {
            blockData.mutation = {
                proccode: block.procCode_,
                argumentIds: JSON.stringify(block.argumentIds_ || []),
                argumentNames: JSON.stringify(block.argumentNames_ || []),
                warp: block.warp_ || false
            };
        }

        blocks[block.id] = blockData;
    }

    return blocks;
}

/**
 * Create a Blockly-compatible Arduino generator
 * @param {Object} ScratchBlocks - The ScratchBlocks (Blockly) module
 * @returns {Object} - Generator with workspaceToCode method
 */
function initArduinoGenerator(ScratchBlocks) {
    const generator = new ArduinoGenerator();

    return {
        /**
         * Generate Arduino code from workspace
         * @param {Object} workspace - Blockly workspace
         * @returns {string} - Generated Arduino code
         */
        workspaceToCode(workspace) {
            try {
                // Extract blocks from workspace
                const blocks = extractBlocksFromWorkspace(workspace);

                // Generate code using ArduinoGenerator
                const code = generator.generateCode(blocks, null);

                return code;
            } catch (error) {
                console.error('[ArduinoGenerator] Error generating code:', error);
                return `// Error generando código: ${error.message}\n\nvoid setup() {\n    // Error\n}\n\nvoid loop() {\n    // Error\n}\n`;
            }
        },

        /**
         * Get the underlying ArduinoGenerator instance
         * @returns {ArduinoGenerator}
         */
        getGenerator() {
            return generator;
        },

        /**
         * Reset the generator state
         */
        reset() {
            generator.reset();
        }
    };
}

// Default export
export default initArduinoGenerator;

// Named exports
export { initArduinoGenerator, extractBlocksFromWorkspace };
