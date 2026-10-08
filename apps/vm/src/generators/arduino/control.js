/**
 * Arduino Control Block Generators
 * Loops, conditionals, delays, etc.
 */

module.exports = {
    // delay(ms)
    arduino_delay (block, blocks) {
        const ms = this.generateValue(block, 'DURATION', blocks);
        return `delay(${ms});\n`;
    },

    // delayMicroseconds(us)
    arduino_delayMicroseconds (block, blocks) {
        const us = this.generateValue(block, 'DURATION', blocks);
        return `delayMicroseconds(${us});\n`;
    },

    // wait seconds (Scratch style)
    control_wait (block, blocks) {
        const seconds = this.generateValue(block, 'DURATION', blocks);
        const ms = `(${seconds} * 1000)`;
        return `delay(${ms});\n`;
    },

    // repeat N times
    control_repeat (block, blocks) {
        const times = this.generateValue(block, 'TIMES', blocks);
        let code = `for (int i = 0; i < ${times}; i++) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // repeat forever - just outputs inner code, no generated wrapping
    control_forever (block, blocks) {
        let code = '';

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        return code;
    },

    // infinite loop - generates while (true) { } wherever placed
    control_infinite_loop (block, blocks) {
        let code = 'while (true) {\n';

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // if condition
    control_if (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        let code = `if (${condition}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // if-else
    control_if_else (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        let code = `if (${condition}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '} else {\n';

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK2) {
            const substackId = block.inputs.SUBSTACK2.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // repeat until
    control_repeat_until (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        let code = `while (!(${condition})) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // wait until
    control_wait_until (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        return `while (!(${condition})) { delay(10); }\n`;
    },

    // stop all / stop this script
    control_stop (block, blocks) {
        const option = this.getFieldValue(block, 'STOP_OPTION');
        if (option === 'all') {
            return 'while(true) { delay(1000); } // Stop all\n';
        }
        return 'return; // Stop this script\n';
    },

    // Arduino-specific while loop
    arduino_while (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        let code = `while (${condition}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // Arduino for loop
    arduino_for (block, blocks) {
        const varName = this.getFieldValue(block, 'VAR') || 'i';
        const start = this.generateValue(block, 'START', blocks);
        const end = this.generateValue(block, 'END', blocks);
        const step = this.generateValue(block, 'STEP', blocks) || '1';

        let code = `for (int ${varName} = ${start}; ${varName} <= ${end}; ${varName} += ${step}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // millis()
    arduino_millis (block, blocks) {
        return 'millis()';
    },

    // micros()
    arduino_micros (block, blocks) {
        return 'micros()';
    },

    // ---- Custom control block generators ---- //

    // while loop
    control_while (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        let code = `while (${condition}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // for-each (count 1 to VALUE)
    control_for_each (block, blocks) {
        const varName = this.sanitizeVarName(this.getFieldValue(block, 'VARIABLE') || 'i');
        const value = this.generateValue(block, 'VALUE', blocks);
        let code = `for (int ${varName} = 1; ${varName} <= ${value}; ${varName}++) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // for-range (VARIABLE from START to END step STEP)
    control_for_range (block, blocks) {
        const varName = this.sanitizeVarName(this.getFieldValue(block, 'VARIABLE') || 'i');
        const start = this.generateValue(block, 'START', blocks);
        const end = this.generateValue(block, 'END', blocks);
        const step = this.generateValue(block, 'STEP', blocks) || '1';
        let code = `for (int ${varName} = ${start}; ${varName} <= ${end}; ${varName} += ${step}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // for-each-list (iterate over list items)
    control_for_each_list (block, blocks) {
        const varName = this.sanitizeVarName(this.getFieldValue(block, 'VARIABLE') || 'i');
        const listName = this.sanitizeVarName(this.getFieldValue(block, 'LIST') || 'list');
        let code = `for (int ${varName}_idx = 0; ${varName}_idx < ${listName}.size(); ${varName}_idx++) {\n`;
        code += this.getIndent() + '    ' + `${varName} = ${listName}[${varName}_idx];\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // break
    control_break (block, blocks) {
        return 'break;\n';
    },

    // continue
    control_continue (block, blocks) {
        return 'continue;\n';
    },

    // if-elseif-else
    control_if_elseif_else (block, blocks) {
        const condition = this.generateValue(block, 'CONDITION', blocks);
        const condition2 = this.generateValue(block, 'CONDITION2', blocks);
        let code = `if (${condition}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK) {
            const substackId = block.inputs.SUBSTACK.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + `} else if (${condition2}) {\n`;

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK2) {
            const substackId = block.inputs.SUBSTACK2.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '} else {\n';

        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK3) {
            const substackId = block.inputs.SUBSTACK3.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    },

    // switch-case-default
    control_switch_case_default (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks);
        const case1 = this.generateValue(block, 'CASE1', blocks);
        const case2 = this.generateValue(block, 'CASE2', blocks);
        let code = `switch (${value}) {\n`;

        this.indent++;
        // Case 1
        if (case1) {
            code += this.getIndent() + `case ${case1}:\n`;
            this.indent++;
            if (block.inputs && block.inputs.SUBSTACK) {
                const substackId = block.inputs.SUBSTACK.block;
                if (substackId) {
                    const innerCode = this.generateStack(substackId, blocks);
                    const lines = innerCode.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        code += this.getIndent() + line + '\n';
                    }
                }
            }
            code += this.getIndent() + 'break;\n';
            this.indent--;
        }

        // Case 2
        if (case2) {
            code += this.getIndent() + `case ${case2}:\n`;
            this.indent++;
            if (block.inputs && block.inputs.SUBSTACK2) {
                const substackId = block.inputs.SUBSTACK2.block;
                if (substackId) {
                    const innerCode = this.generateStack(substackId, blocks);
                    const lines = innerCode.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        code += this.getIndent() + line + '\n';
                    }
                }
            }
            code += this.getIndent() + 'break;\n';
            this.indent--;
        }

        // Default case
        code += this.getIndent() + 'default:\n';
        this.indent++;
        if (block.inputs && block.inputs.SUBSTACK3) {
            const substackId = block.inputs.SUBSTACK3.block;
            if (substackId) {
                const innerCode = this.generateStack(substackId, blocks);
                const lines = innerCode.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    code += this.getIndent() + line + '\n';
                }
            }
        }
        this.indent--;
        this.indent--;

        code += this.getIndent() + '}\n';
        return code;
    }
};
