/**
 * Arduino Events Block Generators
 * Event handlers and triggers
 */

module.exports = {
    // When Arduino begins (setup)
    arduino_whenArduinoBegins (block, blocks) {
        // This is a hat block - handled in main generator
        return '';
    },

    // When flag clicked (treated as setup)
    event_whenflagclicked (block, blocks) {
        // This is a hat block - handled in main generator
        return '';
    },

    // Forever loop block
    arduino_forever (block, blocks) {
        // This is a hat block - handled in main generator
        return '';
    },

    // When key pressed (not directly supported, but can map to button)
    event_whenkeypressed (block, blocks) {
        const key = this.getFieldValue(block, 'KEY_OPTION');
        return `// When key "${key}" pressed - use button input\n`;
    },

    // Broadcast (can be used for function calls)
    event_broadcast (block, blocks) {
        const message = this.generateValue(block, 'BROADCAST_INPUT', blocks);
        const funcName = this.sanitizeFunctionName(message);
        return `${funcName}();\n`;
    },

    // Broadcast and wait
    event_broadcastandwait (block, blocks) {
        const message = this.generateValue(block, 'BROADCAST_INPUT', blocks);
        const funcName = this.sanitizeFunctionName(message);
        return `${funcName}();\n`;
    },

    // When I receive broadcast (becomes a function)
    event_whenbroadcastreceived (block, blocks) {
        const message = this.getFieldValue(block, 'BROADCAST_OPTION');
        const funcName = this.sanitizeFunctionName(message);

        // Generate function code
        let funcCode = `void ${funcName}() {\n`;

        if (block.next) {
            const innerCode = this.generateStack(block.next, blocks);
            const lines = innerCode.split('\n').filter(l => l.trim());
            for (const line of lines) {
                funcCode += '    ' + line + '\n';
            }
        }

        funcCode += '}\n';
        this.functions.set(funcName, funcCode);

        return '';
    },

    // Clone events (not supported in Arduino)
    control_start_as_clone (block, blocks) {
        return '// Clone start - not supported in Arduino\n';
    },

    control_create_clone_of (block, blocks) {
        return '// Create clone - not supported in Arduino\n';
    },

    control_delete_this_clone (block, blocks) {
        return '// Delete clone - not supported in Arduino\n';
    },

    // Custom procedure definition
    procedures_definition (block, blocks) {
        // Get the prototype. The real prototype may be connected as the `block`,
        // or (e.g. when deserialized from a shadow) only as `shadow`.
        if (block.inputs && block.inputs.custom_block) {
            const protoId = block.inputs.custom_block.block || block.inputs.custom_block.shadow;
            if (protoId) {
                const proto = blocks[protoId];
                if (proto && proto.mutation) {
                    const procName = this.sanitizeFunctionName(proto.mutation.proccode);

                    let funcCode = `void ${procName}() {\n`;

                    // Procedure body: check SUBSTACK (standard Scratch C-block) first,
                    // fall back to next (alternative representation)
                    let bodyBlockId = null;
                    if (block.inputs && block.inputs.SUBSTACK && block.inputs.SUBSTACK.block) {
                        bodyBlockId = block.inputs.SUBSTACK.block;
                    } else if (block.next) {
                        bodyBlockId = block.next;
                    }

                    if (bodyBlockId) {
                        const innerCode = this.generateStack(bodyBlockId, blocks);
                        const lines = innerCode.split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            funcCode += '    ' + line + '\n';
                        }
                    }

                    funcCode += '}\n';
                    this.functions.set(procName, funcCode);
                }
            }
        }
        return '';
    },

    // Custom procedure call
    procedures_call (block, blocks) {
        if (block.mutation && block.mutation.proccode) {
            const procName = this.sanitizeFunctionName(block.mutation.proccode);
            return `${procName}();\n`;
        }
        return '';
    },

    // Procedure call with return value
    procedures_call_return (block, blocks) {
        if (block.mutation && block.mutation.proccode) {
            const procName = this.sanitizeFunctionName(block.mutation.proccode);
            return `${procName}()`;
        }
        return '0';
    },

    // Exit procedure early
    procedures_exit (block, blocks) {
        return 'return;\n';
    },

    // Return value from procedure
    procedures_return_value (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks);
        return `return ${value};\n`;
    }
};
