/**
 * Arduino Data Block Generators
 * Variables and lists
 */

module.exports = {
    // Get variable value
    data_variable (block, blocks) {
        const varName = this.getFieldValue(block, 'VARIABLE');
        // Sanitize variable name for C++
        const safeName = this.sanitizeVarName(varName);
        return safeName;
    },

    // Set variable
    data_setvariableto (block, blocks) {
        const varName = this.getFieldValue(block, 'VARIABLE');
        const value = this.generateValue(block, 'VALUE', blocks);
        const safeName = this.sanitizeVarName(varName);

        // Extract type from variable name suffix
        let varType = 'int';
        let initVal = '0';
        const suffixMatch = String(varName).match(/\[(int|float|char|String)\]\s*$/i);
        if (suffixMatch) {
            const typeLabel = suffixMatch[1].toLowerCase();
            if (typeLabel === 'float') {
                varType = 'float';
                initVal = '0.0';
            } else if (typeLabel === 'char') {
                varType = 'char';
                initVal = "'\\0'";
            } else if (typeLabel === 'string') {
                varType = 'String';
                initVal = '""';
            }
        } else {
            // Infer type from generated Arduino expression if no suffix.
            const inferredType = this.inferArduinoValueType ? this.inferArduinoValueType(value) : 'int';
            if (inferredType === 'String') {
                varType = 'String';
                initVal = '""';
            } else if (inferredType === 'float') {
                varType = 'float';
                initVal = '0.0';
            } else if (inferredType === 'char') {
                varType = 'char';
                initVal = "'\\0'";
            }
        }

        // Add or promote global variable declaration
        this.addGlobalVar(safeName, varType, initVal);

        // Clean value quotes if target is numeric (int or float)
        let processedValue = this.normalizeArduinoValue ? this.normalizeArduinoValue(value) : value;
        const processedValueType = this.inferArduinoValueType ? this.inferArduinoValueType(processedValue) : varType;
        if (varType === 'int' || varType === 'float') {
            if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
                const unquoted = processedValue.slice(1, -1);
                if (!isNaN(Number(unquoted)) && unquoted.trim() !== '') {
                    processedValue = unquoted;
                }
            }
        } else if (varType === 'char' && processedValue.startsWith('"') && processedValue.endsWith('"') && processedValue.length === 3) {
            // Process value if target type is char and value is a single-character string literal
            processedValue = `'${processedValue.charAt(1)}'`;
        } else if (varType === 'char' && processedValueType === 'String') {
            processedValue = `${processedValue}.charAt(0)`;
        }

        return `${safeName} = ${processedValue};\n`;
    },

    // Change variable by
    data_changevariableby (block, blocks) {
        const varName = this.getFieldValue(block, 'VARIABLE');
        const value = this.generateValue(block, 'VALUE', blocks);
        const safeName = this.sanitizeVarName(varName);

        // Extract type from variable name suffix
        let varType = 'int';
        let initVal = '0';
        const suffixMatch = String(varName).match(/\[(int|float|char|String)\]\s*$/i);
        if (suffixMatch) {
            const typeLabel = suffixMatch[1].toLowerCase();
            if (typeLabel === 'float') {
                varType = 'float';
                initVal = '0.0';
            } else if (typeLabel === 'char') {
                varType = 'char';
                initVal = "'\\0'";
            } else if (typeLabel === 'string') {
                varType = 'String';
                initVal = '""';
            }
        } else {
            // Change by block usually implies a number
            const inferredType = this.inferArduinoValueType ? this.inferArduinoValueType(value) : 'int';
            if (inferredType === 'float') {
                varType = 'float';
                initVal = '0.0';
            }
        }

        // Add or promote global variable declaration
        this.addGlobalVar(safeName, varType, initVal);

        // Clean value quotes if target is numeric (int or float)
        let processedValue = this.normalizeArduinoValue ? this.normalizeArduinoValue(value) : value;
        if (varType === 'int' || varType === 'float') {
            if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
                const unquoted = processedValue.slice(1, -1);
                if (!isNaN(Number(unquoted)) && unquoted.trim() !== '') {
                    processedValue = unquoted;
                }
            }
        }

        return `${safeName} += ${processedValue};\n`;
    },

    // Show variable (for compatibility - becomes serial print)
    data_showvariable (block, blocks) {
        const varName = this.getFieldValue(block, 'VARIABLE');
        const safeName = this.sanitizeVarName(varName);
        this.addSetupCode('Serial.begin(9600);');
        return `Serial.print("${varName}: "); Serial.println(${safeName});\n`;
    },

    // Hide variable (no-op in Arduino)
    data_hidevariable (block, blocks) {
        return '// Variable hidden\n';
    },

    // List operations
    data_addtolist (block, blocks) {
        const item = this.generateValue(block, 'ITEM', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);

        // Note: Arduino doesn't have dynamic arrays, this is simplified
        return `// Add to list: ${safeName}.add(${item});\n`;
    },

    data_deleteoflist (block, blocks) {
        const index = this.generateValue(block, 'INDEX', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `// Delete from list: ${safeName}.remove(${index});\n`;
    },

    data_deletealloflist (block, blocks) {
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `// Clear list: ${safeName}.clear();\n`;
    },

    data_insertatlist (block, blocks) {
        const item = this.generateValue(block, 'ITEM', blocks);
        const index = this.generateValue(block, 'INDEX', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `// Insert in list: ${safeName}.insert(${index}, ${item});\n`;
    },

    data_replaceitemoflist (block, blocks) {
        const item = this.generateValue(block, 'ITEM', blocks);
        const index = this.generateValue(block, 'INDEX', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `${safeName}[${index} - 1] = ${item};\n`;
    },

    data_itemoflist (block, blocks) {
        const index = this.generateValue(block, 'INDEX', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `${safeName}[${index} - 1]`;
    },

    data_itemnumoflist (block, blocks) {
        const item = this.generateValue(block, 'ITEM', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `// Index of ${item} in ${safeName}`;
    },

    data_lengthoflist (block, blocks) {
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `sizeof(${safeName}) / sizeof(${safeName}[0])`;
    },

    data_listcontainsitem (block, blocks) {
        const item = this.generateValue(block, 'ITEM', blocks);
        const listName = this.getFieldValue(block, 'LIST');
        const safeName = this.sanitizeVarName(listName);
        return `/* ${safeName} contains ${item} */`;
    }
};
