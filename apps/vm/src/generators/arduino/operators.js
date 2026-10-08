/**
 * Arduino Operators Block Generators
 * Math operations, comparisons, logic
 */

module.exports = {
    // Addition
    operator_add (block, blocks) {
        const num1 = this.generateValue(block, 'NUM1', blocks);
        const num2 = this.generateValue(block, 'NUM2', blocks);
        return `(${num1} + ${num2})`;
    },

    // Subtraction
    operator_subtract (block, blocks) {
        const num1 = this.generateValue(block, 'NUM1', blocks);
        const num2 = this.generateValue(block, 'NUM2', blocks);
        return `(${num1} - ${num2})`;
    },

    // Multiplication
    operator_multiply (block, blocks) {
        const num1 = this.generateValue(block, 'NUM1', blocks);
        const num2 = this.generateValue(block, 'NUM2', blocks);
        return `(${num1} * ${num2})`;
    },

    // Division
    operator_divide (block, blocks) {
        const num1 = this.generateValue(block, 'NUM1', blocks);
        const num2 = this.generateValue(block, 'NUM2', blocks);
        return `(${num1} / ${num2})`;
    },

    // Random
    operator_random (block, blocks) {
        const from = this.generateValue(block, 'FROM', blocks);
        const to = this.generateValue(block, 'TO', blocks);
        return `random(${from}, ${to} + 1)`;
    },

    _promoteCompareOperands (op1, op2) {
        if (this.globalVars) {
            // Check for String comparison promotion
            if (this.globalVars.has(op1) && op2.startsWith('"') && op2.endsWith('"')) {
                this.addGlobalVar(op1, 'String', '""');
            } else if (this.globalVars.has(op2) && op1.startsWith('"') && op1.endsWith('"')) {
                this.addGlobalVar(op2, 'String', '""');
            }
            // Check for float comparison promotion
            else if (this.globalVars.has(op1) && op2.includes('.') && !isNaN(parseFloat(op2))) {
                this.addGlobalVar(op1, 'float', '0.0');
            } else if (this.globalVars.has(op2) && op1.includes('.') && !isNaN(parseFloat(op1))) {
                this.addGlobalVar(op2, 'float', '0.0');
            }
        }
    },

    _processCompareOperand (op, otherType) {
        if (!otherType) return op;
        if ((otherType === 'int' || otherType === 'float') && op.startsWith('"') && op.endsWith('"')) {
            const unquoted = op.slice(1, -1);
            if (!isNaN(Number(unquoted)) && unquoted.trim() !== '') {
                return unquoted;
            }
        }
        if (otherType === 'char' && op.startsWith('"') && op.endsWith('"') && op.length === 3) {
            return `'${op.charAt(1)}'`;
        }
        return op;
    },

    // Greater than
    operator_gt (block, blocks) {
        let op1 = this.generateValue(block, 'OPERAND1', blocks);
        let op2 = this.generateValue(block, 'OPERAND2', blocks);
        this._promoteCompareOperands(op1, op2);
        
        const type1 = this.globalVars && this.globalVars.has(op1) ? this.globalVars.get(op1).type : null;
        const type2 = this.globalVars && this.globalVars.has(op2) ? this.globalVars.get(op2).type : null;
        
        op1 = this._processCompareOperand(op1, type2);
        op2 = this._processCompareOperand(op2, type1);
        
        return `(${op1} > ${op2})`;
    },

    // Less than
    operator_lt (block, blocks) {
        let op1 = this.generateValue(block, 'OPERAND1', blocks);
        let op2 = this.generateValue(block, 'OPERAND2', blocks);
        this._promoteCompareOperands(op1, op2);
        
        const type1 = this.globalVars && this.globalVars.has(op1) ? this.globalVars.get(op1).type : null;
        const type2 = this.globalVars && this.globalVars.has(op2) ? this.globalVars.get(op2).type : null;
        
        op1 = this._processCompareOperand(op1, type2);
        op2 = this._processCompareOperand(op2, type1);
        
        return `(${op1} < ${op2})`;
    },

    // Equals
    operator_equals (block, blocks) {
        let op1 = this.generateValue(block, 'OPERAND1', blocks);
        let op2 = this.generateValue(block, 'OPERAND2', blocks);
        this._promoteCompareOperands(op1, op2);
        
        const type1 = this.globalVars && this.globalVars.has(op1) ? this.globalVars.get(op1).type : null;
        const type2 = this.globalVars && this.globalVars.has(op2) ? this.globalVars.get(op2).type : null;
        
        op1 = this._processCompareOperand(op1, type2);
        op2 = this._processCompareOperand(op2, type1);
        
        return `(${op1} == ${op2})`;
    },

    // AND
    operator_and (block, blocks) {
        const op1 = this.generateValue(block, 'OPERAND1', blocks);
        const op2 = this.generateValue(block, 'OPERAND2', blocks);
        return `(${op1} && ${op2})`;
    },

    // OR
    operator_or (block, blocks) {
        const op1 = this.generateValue(block, 'OPERAND1', blocks);
        const op2 = this.generateValue(block, 'OPERAND2', blocks);
        return `(${op1} || ${op2})`;
    },

    // NOT
    operator_not (block, blocks) {
        const op = this.generateValue(block, 'OPERAND', blocks);
        return `(!${op})`;
    },

    // Modulo
    operator_mod (block, blocks) {
        const num1 = this.generateValue(block, 'NUM1', blocks);
        const num2 = this.generateValue(block, 'NUM2', blocks);
        return `(${num1} % ${num2})`;
    },

    // Round
    operator_round (block, blocks) {
        const num = this.generateValue(block, 'NUM', blocks);
        return `round(${num})`;
    },

    // Math operations (abs, floor, ceiling, sqrt, sin, cos, tan, etc.)
    operator_mathop (block, blocks) {
        const num = this.generateValue(block, 'NUM', blocks);
        const op = this.getFieldValue(block, 'OPERATOR');

        const mathOps = {
            'abs': `abs(${num})`,
            'floor': `floor(${num})`,
            'ceiling': `ceil(${num})`,
            'sqrt': `sqrt(${num})`,
            'sin': `sin(${num} * PI / 180)`,
            'cos': `cos(${num} * PI / 180)`,
            'tan': `tan(${num} * PI / 180)`,
            'asin': `asin(${num}) * 180 / PI`,
            'acos': `acos(${num}) * 180 / PI`,
            'atan': `atan(${num}) * 180 / PI`,
            'ln': `log(${num})`,
            'log': `log10(${num})`,
            'e ^': `exp(${num})`,
            '10 ^': `pow(10, ${num})`
        };

        return mathOps[op] || num;
    },

    // Join strings
    operator_join (block, blocks) {
        const str1 = this.generateValue(block, 'STRING1', blocks);
        const str2 = this.generateValue(block, 'STRING2', blocks);
        return `String(${str1}) + String(${str2})`;
    },

    // Letter of string
    operator_letter_of (block, blocks) {
        const letter = this.generateValue(block, 'LETTER', blocks);
        const str = this.generateValue(block, 'STRING', blocks);
        return `String(${str}).charAt(${letter} - 1)`;
    },

    // Length of string
    operator_length (block, blocks) {
        const str = this.generateValue(block, 'STRING', blocks);
        return `String(${str}).length()`;
    },

    // Contains
    operator_contains (block, blocks) {
        const str1 = this.generateValue(block, 'STRING1', blocks);
        const str2 = this.generateValue(block, 'STRING2', blocks);
        return `(String(${str1}).indexOf(${str2}) != -1)`;
    },

    // Arduino-specific: Power
    arduino_pow (block, blocks) {
        const base = this.generateValue(block, 'BASE', blocks);
        const exp = this.generateValue(block, 'EXPONENT', blocks);
        return `pow(${base}, ${exp})`;
    },

    // Arduino-specific: Min
    arduino_min (block, blocks) {
        const a = this.generateValue(block, 'A', blocks);
        const b = this.generateValue(block, 'B', blocks);
        return `min(${a}, ${b})`;
    },

    // Arduino-specific: Max
    arduino_max (block, blocks) {
        const a = this.generateValue(block, 'A', blocks);
        const b = this.generateValue(block, 'B', blocks);
        return `max(${a}, ${b})`;
    },

    // Text/number literal
    text (block, blocks) {
        const value = this.getFieldValue(block, 'TEXT');
        if (value === '' || value === undefined) return '""';
        // Check if it's a number
        if (!isNaN(value)) return value;
        // It's a string
        return `"${value}"`;
    },

    math_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_integer (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_positive_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_whole_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_angle (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    // Boolean true literal
    operator_boolean_true (block, blocks) {
        return 'true';
    },

    // Boolean false literal
    operator_boolean_false (block, blocks) {
        return 'false';
    }
};
