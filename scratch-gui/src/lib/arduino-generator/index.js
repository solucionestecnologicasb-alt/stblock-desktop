/**
 * Arduino Code Generator for ScratchBlocks/Blockly
 * Uses Blockly's generator pattern to convert blocks to Arduino C++ code
 */

/**
 * Initialize the Arduino generator for ScratchBlocks
 * @param {Object} ScratchBlocks - The ScratchBlocks/Blockly instance
 * @returns {Object} The Arduino generator
 */
const initArduinoGenerator = (ScratchBlocks) => {
    // Create Arduino generator extending Blockly.Generator
    const Arduino = new ScratchBlocks.Generator('Arduino');

    // Generator state
    Arduino.includes_ = new Set();
    Arduino.globalVars_ = new Map();
    Arduino.setupCode_ = [];
    Arduino.loopCode_ = [];
    Arduino.definitions_ = new Map();

    /**
     * Reset generator state before code generation
     */
    Arduino.reset = function () {
        this.includes_ = new Set();
        this.globalVars_ = new Map();
        this.setupCode_ = [];
        this.loopCode_ = [];
        this.definitions_ = new Map();
    };

    /**
     * Add an include statement
     * @param {string} header - Header file name
     */
    Arduino.addInclude = function (header) {
        this.includes_.add(header);
    };

    /**
     * Add a global variable
     * @param {string} name - Variable name
     * @param {string} type - Variable type
     * @param {string} initialValue - Initial value
     */
    Arduino.addGlobalVar = function (name, type, initialValue = '') {
        if (!this.globalVars_.has(name)) {
            this.globalVars_.set(name, {type, initialValue});
        }
    };

    /**
     * Add code to setup()
     * @param {string} code - Code line
     */
    Arduino.addSetupCode = function (code) {
        if (!this.setupCode_.includes(code)) {
            this.setupCode_.push(code);
        }
    };

    /**
     * Sanitize variable name for C++
     * @param {string} name - Original variable name
     * @returns {string}
     */
    Arduino.sanitizeVarName = function (name) {
        if (!name) return 'var';
        let safe = String(name).replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(safe)) {
            safe = '_' + safe;
        }
        const reserved = ['int', 'float', 'double', 'char', 'void', 'bool',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
            'continue', 'return', 'true', 'false', 'null', 'class', 'struct'];
        if (reserved.includes(safe.toLowerCase())) {
            safe = '_' + safe;
        }
        return safe;
    };

    /**
     * Get value from a block input
     * @param {Object} block - The block
     * @param {string} name - Input name
     * @param {string} defaultValue - Default if not found
     * @returns {string}
     */
    Arduino.getInputValue = function (block, name, defaultValue = '0') {
        const input = block.getInput(name);
        if (!input) return defaultValue;

        const connection = input.connection;
        if (!connection || !connection.targetBlock()) {
            // Check for shadow block
            const targetBlock = connection ? connection.targetBlock() : null;
            if (targetBlock && targetBlock.isShadow()) {
                return this.blockToCode(targetBlock) || defaultValue;
            }
            return defaultValue;
        }

        const targetBlock = connection.targetBlock();
        const code = this.blockToCode(targetBlock);
        return Array.isArray(code) ? code[0] : (code || defaultValue);
    };

    /**
     * Get field value from a block
     * @param {Object} block - The block
     * @param {string} name - Field name
     * @returns {string}
     */
    Arduino.getFieldValue = function (block, name) {
        const field = block.getField(name);
        return field ? field.getValue() : '';
    };

    // Order of operations (precedence)
    Arduino.ORDER_ATOMIC = 0;
    Arduino.ORDER_UNARY_POSTFIX = 1;
    Arduino.ORDER_UNARY_PREFIX = 2;
    Arduino.ORDER_MULTIPLICATIVE = 3;
    Arduino.ORDER_ADDITIVE = 4;
    Arduino.ORDER_SHIFT = 5;
    Arduino.ORDER_RELATIONAL = 6;
    Arduino.ORDER_EQUALITY = 7;
    Arduino.ORDER_BITWISE_AND = 8;
    Arduino.ORDER_BITWISE_XOR = 9;
    Arduino.ORDER_BITWISE_OR = 10;
    Arduino.ORDER_LOGICAL_AND = 11;
    Arduino.ORDER_LOGICAL_OR = 12;
    Arduino.ORDER_CONDITIONAL = 13;
    Arduino.ORDER_ASSIGNMENT = 14;
    Arduino.ORDER_COMMA = 15;
    Arduino.ORDER_NONE = 99;

    /**
     * Initialize for new code generation
     */
    Arduino.init = function (workspace) {
        this.reset();
    };

    /**
     * Finalize the generated code
     * @param {string} code - The generated code from all blocks
     * @returns {string} Complete Arduino sketch
     */
    Arduino.finish = function (code) {
        console.log('[DEBUG] Arduino.finish - includes_ size:', this.includes_.size);
        console.log('[DEBUG] Arduino.finish - definitions_ size:', this.definitions_.size);
        console.log('[DEBUG] Arduino.finish - definitions keys:', Array.from(this.definitions_.keys()));
        let finalCode = '// generado por STB academy\n';

        // Includes
        for (const include of this.includes_) {
            finalCode += `#include <${include}>\n`;
        }
        if (this.includes_.size > 0) {
            finalCode += '\n';
        }

        // Global variables
        for (const [name, info] of this.globalVars_) {
            if (info.initialValue) {
                finalCode += `${info.type} ${name} = ${info.initialValue};\n`;
            } else {
                finalCode += `${info.type} ${name};\n`;
            }
        }
        if (this.globalVars_.size > 0) {
            finalCode += '\n';
        }

        // Definitions (structs, helper functions, etc.) - BEFORE setup()
        for (const [name, defCode] of this.definitions_) {
            if (name !== 'repeat') {
                finalCode += defCode + '\n\n';
            }
        }

        // Setup function
        finalCode += 'void setup() {\n';
        if (this.setupCode_.length > 0) {
            for (const line of this.setupCode_) {
                const lines = line.split('\n');
                for (const l of lines) {
                    if (l.trim()) {
                        finalCode += `  ${l}\n`;
                    } else {
                        finalCode += '\n';
                    }
                }
            }
        } else {
            finalCode += '  // Inicialización\n';
        }
        finalCode += '}\n\n';

        // Loop function
        finalCode += 'void loop() {\n';

        // Add loopCode_ first (runtime ticks, etc.)
        if (this.loopCode_ && this.loopCode_.length > 0) {
            for (const line of this.loopCode_) {
                const lines = line.split('\n');
                for (const l of lines) {
                    if (l.trim()) {
                        finalCode += `  ${l}\n`;
                    } else {
                        finalCode += '\n';
                    }
                }
            }
        }

        // Then add block-generated code
        if (code.trim()) {
            const lines = code.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    finalCode += `  ${line}\n`;
                } else {
                    finalCode += '\n';
                }
            }
        }

        // If no code at all, add placeholder comment
        if ((!this.loopCode_ || this.loopCode_.length === 0) && !code.trim()) {
            finalCode += '  // Código principal\n';
        }

        finalCode += '}\n';

        // If there's a repeat function, append it at the end
        if (this.definitions_.has('repeat')) {
            finalCode += '\n' + this.definitions_.get('repeat') + '\n';
        }

        return finalCode;
    };

    /**
     * Strip leading indentation from code
     */
    Arduino.scrubNakedValue = function (line) {
        return line + ';\n';
    };

    /**
     * Common tasks for generating code from blocks
     */
    Arduino.scrub_ = function (block, code) {
        const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
        const nextCode = this.blockToCode(nextBlock);
        return code + nextCode;
    };

    // ===== BLOCK GENERATORS =====

    // --- Event/Hat Blocks ---

    Arduino['event_whenflagclicked'] = function (block) {
        // This is a hat block - the code inside goes to setup or loop
        return '';
    };

    Arduino['stbBoardV2_whenArduinoBegin'] = function (block) {
        return '';
    };

    // --- Control Blocks ---

    Arduino['control_forever'] = function (block) {
        // Forever loops are handled by loop() - get substack
        const substack = this.statementToCode(block, 'SUBSTACK');
        return substack;
    };

    Arduino['control_repeat'] = function (block) {
        const times = this.valueToCode(block, 'TIMES', this.ORDER_ATOMIC) || '10';
        const substack = this.statementToCode(block, 'SUBSTACK');
        return `for (int i = 0; i < ${times}; i++) {\n${substack}}\n`;
    };

    Arduino['control_if'] = function (block) {
        const condition = this.valueToCode(block, 'CONDITION', this.ORDER_NONE) || 'false';
        const substack = this.statementToCode(block, 'SUBSTACK');
        return `if (${condition}) {\n${substack}}\n`;
    };

    Arduino['control_if_else'] = function (block) {
        const condition = this.valueToCode(block, 'CONDITION', this.ORDER_NONE) || 'false';
        const substack1 = this.statementToCode(block, 'SUBSTACK');
        const substack2 = this.statementToCode(block, 'SUBSTACK2');
        return `if (${condition}) {\n${substack1}} else {\n${substack2}}\n`;
    };

    Arduino['control_wait'] = function (block) {
        const duration = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '1';
        return `delay(${duration} * 1000);\n`;
    };

    Arduino['control_wait_until'] = function (block) {
        const condition = this.valueToCode(block, 'CONDITION', this.ORDER_NONE) || 'true';
        return `while (!(${condition})) { delay(10); }\n`;
    };

    Arduino['control_repeat_until'] = function (block) {
        const condition = this.valueToCode(block, 'CONDITION', this.ORDER_NONE) || 'false';
        const substack = this.statementToCode(block, 'SUBSTACK');
        return `while (!(${condition})) {\n${substack}}\n`;
    };

    // --- Operators ---

    Arduino['operator_add'] = function (block) {
        const num1 = this.valueToCode(block, 'NUM1', this.ORDER_ADDITIVE) || '0';
        const num2 = this.valueToCode(block, 'NUM2', this.ORDER_ADDITIVE) || '0';
        return [`(${num1} + ${num2})`, this.ORDER_ADDITIVE];
    };

    Arduino['operator_subtract'] = function (block) {
        const num1 = this.valueToCode(block, 'NUM1', this.ORDER_ADDITIVE) || '0';
        const num2 = this.valueToCode(block, 'NUM2', this.ORDER_ADDITIVE) || '0';
        return [`(${num1} - ${num2})`, this.ORDER_ADDITIVE];
    };

    Arduino['operator_multiply'] = function (block) {
        const num1 = this.valueToCode(block, 'NUM1', this.ORDER_MULTIPLICATIVE) || '0';
        const num2 = this.valueToCode(block, 'NUM2', this.ORDER_MULTIPLICATIVE) || '0';
        return [`(${num1} * ${num2})`, this.ORDER_MULTIPLICATIVE];
    };

    Arduino['operator_divide'] = function (block) {
        const num1 = this.valueToCode(block, 'NUM1', this.ORDER_MULTIPLICATIVE) || '0';
        const num2 = this.valueToCode(block, 'NUM2', this.ORDER_MULTIPLICATIVE) || '1';
        return [`(${num1} / ${num2})`, this.ORDER_MULTIPLICATIVE];
    };

    Arduino['operator_mod'] = function (block) {
        const num1 = this.valueToCode(block, 'NUM1', this.ORDER_MULTIPLICATIVE) || '0';
        const num2 = this.valueToCode(block, 'NUM2', this.ORDER_MULTIPLICATIVE) || '1';
        return [`((int)(${num1}) % (int)(${num2}))`, this.ORDER_MULTIPLICATIVE];
    };

    Arduino['operator_random'] = function (block) {
        const from = this.valueToCode(block, 'FROM', this.ORDER_ATOMIC) || '1';
        const to = this.valueToCode(block, 'TO', this.ORDER_ATOMIC) || '10';
        return [`random(${from}, ${to} + 1)`, this.ORDER_ATOMIC];
    };

    Arduino['operator_gt'] = function (block) {
        const operand1 = this.valueToCode(block, 'OPERAND1', this.ORDER_RELATIONAL) || '0';
        const operand2 = this.valueToCode(block, 'OPERAND2', this.ORDER_RELATIONAL) || '0';
        return [`(${operand1} > ${operand2})`, this.ORDER_RELATIONAL];
    };

    Arduino['operator_lt'] = function (block) {
        const operand1 = this.valueToCode(block, 'OPERAND1', this.ORDER_RELATIONAL) || '0';
        const operand2 = this.valueToCode(block, 'OPERAND2', this.ORDER_RELATIONAL) || '0';
        return [`(${operand1} < ${operand2})`, this.ORDER_RELATIONAL];
    };

    Arduino['operator_equals'] = function (block) {
        const operand1 = this.valueToCode(block, 'OPERAND1', this.ORDER_EQUALITY) || '0';
        const operand2 = this.valueToCode(block, 'OPERAND2', this.ORDER_EQUALITY) || '0';
        return [`(${operand1} == ${operand2})`, this.ORDER_EQUALITY];
    };

    Arduino['operator_and'] = function (block) {
        const operand1 = this.valueToCode(block, 'OPERAND1', this.ORDER_LOGICAL_AND) || 'false';
        const operand2 = this.valueToCode(block, 'OPERAND2', this.ORDER_LOGICAL_AND) || 'false';
        return [`(${operand1} && ${operand2})`, this.ORDER_LOGICAL_AND];
    };

    Arduino['operator_or'] = function (block) {
        const operand1 = this.valueToCode(block, 'OPERAND1', this.ORDER_LOGICAL_OR) || 'false';
        const operand2 = this.valueToCode(block, 'OPERAND2', this.ORDER_LOGICAL_OR) || 'false';
        return [`(${operand1} || ${operand2})`, this.ORDER_LOGICAL_OR];
    };

    Arduino['operator_not'] = function (block) {
        const operand = this.valueToCode(block, 'OPERAND', this.ORDER_UNARY_PREFIX) || 'false';
        return [`!${operand}`, this.ORDER_UNARY_PREFIX];
    };

    Arduino['operator_round'] = function (block) {
        const num = this.valueToCode(block, 'NUM', this.ORDER_ATOMIC) || '0';
        return [`round(${num})`, this.ORDER_ATOMIC];
    };

    Arduino['operator_mathop'] = function (block) {
        const operator = block.getFieldValue('OPERATOR') || 'abs';
        const num = this.valueToCode(block, 'NUM', this.ORDER_ATOMIC) || '0';

        const opMap = {
            'abs': `abs(${num})`,
            'floor': `floor(${num})`,
            'ceiling': `ceil(${num})`,
            'sqrt': `sqrt(${num})`,
            'sin': `sin(${num} * PI / 180)`,
            'cos': `cos(${num} * PI / 180)`,
            'tan': `tan(${num} * PI / 180)`,
            'asin': `(asin(${num}) * 180 / PI)`,
            'acos': `(acos(${num}) * 180 / PI)`,
            'atan': `(atan(${num}) * 180 / PI)`,
            'ln': `log(${num})`,
            'log': `log10(${num})`,
            'e ^': `exp(${num})`,
            '10 ^': `pow(10, ${num})`
        };

        return [opMap[operator] || `${operator}(${num})`, this.ORDER_ATOMIC];
    };

    // --- Literal/Shadow Blocks ---

    Arduino['math_number'] = function (block) {
        const num = block.getFieldValue('NUM') || '0';
        return [num, this.ORDER_ATOMIC];
    };

    Arduino['math_integer'] = function (block) {
        const num = block.getFieldValue('NUM') || '0';
        return [num, this.ORDER_ATOMIC];
    };

    Arduino['math_whole_number'] = function (block) {
        const num = block.getFieldValue('NUM') || '0';
        return [num, this.ORDER_ATOMIC];
    };

    Arduino['math_positive_number'] = function (block) {
        const num = block.getFieldValue('NUM') || '0';
        return [num, this.ORDER_ATOMIC];
    };

    Arduino['math_angle'] = function (block) {
        const num = block.getFieldValue('NUM') || '0';
        return [num, this.ORDER_ATOMIC];
    };

    Arduino['text'] = function (block) {
        const text = block.getFieldValue('TEXT') || '';
        return [`"${text}"`, this.ORDER_ATOMIC];
    };

    // --- Variables ---

    Arduino['data_setvariableto'] = function (block) {
        const varName = this.sanitizeVarName(block.getFieldValue('VARIABLE'));
        const value = this.valueToCode(block, 'VALUE', this.ORDER_ASSIGNMENT) || '0';
        this.addGlobalVar(varName, 'float', '0');
        return `${varName} = ${value};\n`;
    };

    Arduino['data_changevariableby'] = function (block) {
        const varName = this.sanitizeVarName(block.getFieldValue('VARIABLE'));
        const value = this.valueToCode(block, 'VALUE', this.ORDER_ADDITIVE) || '1';
        this.addGlobalVar(varName, 'float', '0');
        return `${varName} += ${value};\n`;
    };

    Arduino['data_variable'] = function (block) {
        const varName = this.sanitizeVarName(block.getFieldValue('VARIABLE'));
        this.addGlobalVar(varName, 'float', '0');
        return [varName, this.ORDER_ATOMIC];
    };

    // --- Arduino I/O Blocks ---

    Arduino['arduino_digitalWrite'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '13';
        const value = block.getFieldValue('VALUE') || this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || 'HIGH';
        const state = (value === 'HIGH' || value === '1' || value === 'true') ? 'HIGH' : 'LOW';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${state});\n`;
    };

    Arduino['arduino_digitalRead'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT);`);
        return [`digitalRead(${pin})`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_analogWrite'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '3';
        const value = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '0';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `analogWrite(${pin}, ${value});\n`;
    };

    Arduino['arduino_analogRead'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || 'A0';
        return [`analogRead(${pin})`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_setPinMode'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '13';
        const mode = block.getFieldValue('MODE') || 'OUTPUT';
        return `pinMode(${pin}, ${mode});\n`;
    };

    Arduino['arduino_tone'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '8';
        const freq = this.valueToCode(block, 'FREQUENCY', this.ORDER_ATOMIC) || '440';
        return `tone(${pin}, ${freq});\n`;
    };

    Arduino['arduino_toneWithDuration'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '8';
        const freq = this.valueToCode(block, 'FREQUENCY', this.ORDER_ATOMIC) || '440';
        const duration = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '500';
        return `tone(${pin}, ${freq}, ${duration});\n`;
    };

    Arduino['arduino_noTone'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '8';
        return `noTone(${pin});\n`;
    };

    Arduino['arduino_map'] = function (block) {
        const value = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '0';
        const fromLow = this.valueToCode(block, 'FROM_LOW', this.ORDER_ATOMIC) || '0';
        const fromHigh = this.valueToCode(block, 'FROM_HIGH', this.ORDER_ATOMIC) || '1023';
        const toLow = this.valueToCode(block, 'TO_LOW', this.ORDER_ATOMIC) || '0';
        const toHigh = this.valueToCode(block, 'TO_HIGH', this.ORDER_ATOMIC) || '255';
        return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_constrain'] = function (block) {
        const value = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '0';
        const low = this.valueToCode(block, 'LOW', this.ORDER_ATOMIC) || '0';
        const high = this.valueToCode(block, 'HIGH', this.ORDER_ATOMIC) || '255';
        return [`constrain(${value}, ${low}, ${high})`, this.ORDER_ATOMIC];
    };

    // Serial
    Arduino['arduino_serialPrint'] = function (block) {
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        this.addSetupCode('Serial.begin(9600);');
        return `Serial.print(${text});\n`;
    };

    Arduino['arduino_serialPrintln'] = function (block) {
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        this.addSetupCode('Serial.begin(9600);');
        return `Serial.println(${text});\n`;
    };

    Arduino['arduino_serialAvailable'] = function (block) {
        this.addSetupCode('Serial.begin(9600);');
        return ['Serial.available()', this.ORDER_ATOMIC];
    };

    Arduino['arduino_serialRead'] = function (block) {
        this.addSetupCode('Serial.begin(9600);');
        return ['Serial.read()', this.ORDER_ATOMIC];
    };

    // --- Servo Blocks ---

    Arduino['arduino_servoWrite'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '9';
        const angle = this.valueToCode(block, 'ANGLE', this.ORDER_ATOMIC) || '90';
        const servoName = `servo_${pin}`;
        this.addInclude('Servo.h');
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);
        return `${servoName}.write(${angle});\n`;
    };

    Arduino['arduino_servoRead'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '9';
        const servoName = `servo_${pin}`;
        this.addInclude('Servo.h');
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);
        return [`${servoName}.read()`, this.ORDER_ATOMIC];
    };

    // --- STBoard Specific Blocks ---

    Arduino['setDigitalOutput'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '13';
        const level = block.getFieldValue('LEVEL') || block.getFieldValue('level') || 'HIGH';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${level});\n`;
    };

    Arduino['setPwmOutput'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '3';
        const value = this.valueToCode(block, 'OUT', this.ORDER_ATOMIC) || '0';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `analogWrite(${pin}, ${value});\n`;
    };

    Arduino['readDigitalPin'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT);`);
        return [`digitalRead(${pin})`, this.ORDER_ATOMIC];
    };

    Arduino['readAnalogPin'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || 'A0';
        return [`analogRead(${pin})`, this.ORDER_ATOMIC];
    };

    // STBoard OLED
    Arduino['iniciarPantallaOled'] = function (block) {
        const addr = block.getFieldValue('ADDR') || '0x3C';
        this.addInclude('Wire.h');
        this.addInclude('Adafruit_GFX.h');
        this.addInclude('Adafruit_SSD1306.h');
        this.addGlobalVar('display', 'Adafruit_SSD1306', 'Adafruit_SSD1306(128, 64, &Wire, -1)');
        return `Wire.begin();\ndisplay.begin(SSD1306_SWITCHCAPVCC, ${addr});\ndisplay.clearDisplay();\ndisplay.setTextSize(1);\ndisplay.setTextColor(SSD1306_WHITE);\n`;
    };

    Arduino['limpiarPantallaOled'] = function (block) {
        return 'display.clearDisplay();\n';
    };

    Arduino['actualizarPantallaOled'] = function (block) {
        return 'display.display();\n';
    };

    Arduino['escribirTextoOled'] = function (block) {
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        return `display.print(${text});\n`;
    };

    Arduino['escribirLineaOled'] = function (block) {
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        return `display.println(${text});\n`;
    };

    Arduino['establecerCursorOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        return `display.setCursor(${x}, ${y});\n`;
    };

    // STBoard Init Boot Screen
    Arduino['stbBoardV2_initBootScreen'] = function (block) {
        this.addInclude('Wire.h');
        this.addInclude('Adafruit_GFX.h');
        this.addInclude('Adafruit_SSD1306.h');
        this.addGlobalVar('display', 'Adafruit_SSD1306', 'Adafruit_SSD1306(128, 64, &Wire, -1)');
        this.addSetupCode('Wire.begin();');
        this.addSetupCode('display.begin(SSD1306_SWITCHCAPVCC, 0x3C);');
        this.addSetupCode('display.clearDisplay();');
        this.addSetupCode('display.setTextSize(1);');
        this.addSetupCode('display.setTextColor(SSD1306_WHITE);');
        this.addSetupCode('display.display();');
        return '';
    };

    // Servo STBoard style
    Arduino['setServoOutput'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '9';
        const angle = this.valueToCode(block, 'OUT', this.ORDER_ATOMIC) || '90';
        const servoName = `servo_${pin}`;
        this.addInclude('Servo.h');
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);
        return `${servoName}.write(${angle});\n`;
    };

    // Multi Serial
    Arduino['multiSerialBegin'] = function (block) {
        const serialNo = block.getFieldValue('NO') || '0';
        const baud = block.getFieldValue('VALUE') || this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '9600';
        const serialName = serialNo === '0' ? 'Serial' : `Serial${serialNo}`;
        return `${serialName}.begin(${baud});\n`;
    };

    Arduino['multiSerialPrint'] = function (block) {
        const serialNo = block.getFieldValue('NO') || '0';
        const text = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '""';
        const eol = block.getFieldValue('EOL') || 'warp';
        const serialName = serialNo === '0' ? 'Serial' : `Serial${serialNo}`;
        if (eol === 'warp' || eol === 'newline') {
            return `${serialName}.println(${text});\n`;
        }
        return `${serialName}.print(${text});\n`;
    };

    // Menu/Shadow blocks for dropdowns
    Arduino['arduino_pin_menu_level'] = function (block) {
        const level = block.getFieldValue('level') || 'HIGH';
        return [level, this.ORDER_ATOMIC];
    };

    Arduino['arduino_pin_menu_mode'] = function (block) {
        const mode = block.getFieldValue('mode') || 'OUTPUT';
        return [mode, this.ORDER_ATOMIC];
    };

    Arduino['arduino_pin_menu_digitalPin'] = function (block) {
        const pin = block.getFieldValue('pin') || '0';
        return [pin, this.ORDER_ATOMIC];
    };

    Arduino['arduino_pin_menu_analogPin'] = function (block) {
        const pin = block.getFieldValue('pin') || 'A0';
        return [pin, this.ORDER_ATOMIC];
    };

    Arduino['arduino_pin_menu_pwmPin'] = function (block) {
        const pin = block.getFieldValue('pin') || '3';
        return [pin, this.ORDER_ATOMIC];
    };

    // --- More STBoard V2 Blocks ---

    // DHT Sensor
    Arduino['leerDHT'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '2';
        const type = block.getFieldValue('TYPE') || 'temperature';
        this.addInclude('DHT.h');
        this.addGlobalVar(`dht_${pin}`, 'DHT', `DHT(${pin}, DHT11)`);
        this.addSetupCode(`dht_${pin}.begin();`);
        if (type === 'temperature' || type === 'temp') {
            return [`dht_${pin}.readTemperature()`, this.ORDER_ATOMIC];
        }
        return [`dht_${pin}.readHumidity()`, this.ORDER_ATOMIC];
    };

    // Ultrasonic Sensor
    Arduino['leerUltrasonico'] = function (block) {
        const trigPin = block.getFieldValue('TRIG') || this.valueToCode(block, 'TRIG', this.ORDER_ATOMIC) || '9';
        const echoPin = block.getFieldValue('ECHO') || this.valueToCode(block, 'ECHO', this.ORDER_ATOMIC) || '10';
        this.addSetupCode(`pinMode(${trigPin}, OUTPUT);`);
        this.addSetupCode(`pinMode(${echoPin}, INPUT);`);
        return [`([]() { digitalWrite(${trigPin}, LOW); delayMicroseconds(2); digitalWrite(${trigPin}, HIGH); delayMicroseconds(10); digitalWrite(${trigPin}, LOW); return pulseIn(${echoPin}, HIGH) * 0.034 / 2; })()`, this.ORDER_ATOMIC];
    };

    // Buzzer / Tone
    Arduino['reproducirTono'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '8';
        const freq = this.valueToCode(block, 'FREQ', this.ORDER_ATOMIC) || '440';
        const duration = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '500';
        return `tone(${pin}, ${freq}, ${duration});\n`;
    };

    Arduino['detenerTono'] = function (block) {
        const pin = block.getFieldValue('PIN') || this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '8';
        return `noTone(${pin});\n`;
    };

    // RGB LED
    Arduino['establecerLedRGB'] = function (block) {
        const pinR = block.getFieldValue('PIN_R') || this.valueToCode(block, 'PIN_R', this.ORDER_ATOMIC) || '9';
        const pinG = block.getFieldValue('PIN_G') || this.valueToCode(block, 'PIN_G', this.ORDER_ATOMIC) || '10';
        const pinB = block.getFieldValue('PIN_B') || this.valueToCode(block, 'PIN_B', this.ORDER_ATOMIC) || '11';
        const r = this.valueToCode(block, 'R', this.ORDER_ATOMIC) || '255';
        const g = this.valueToCode(block, 'G', this.ORDER_ATOMIC) || '0';
        const b = this.valueToCode(block, 'B', this.ORDER_ATOMIC) || '0';
        this.addSetupCode(`pinMode(${pinR}, OUTPUT);`);
        this.addSetupCode(`pinMode(${pinG}, OUTPUT);`);
        this.addSetupCode(`pinMode(${pinB}, OUTPUT);`);
        return `analogWrite(${pinR}, ${r});\nanalogWrite(${pinG}, ${g});\nanalogWrite(${pinB}, ${b});\n`;
    };

    // OLED Drawing
    Arduino['dibujarPixelOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        return `display.drawPixel(${x}, ${y}, SSD1306_WHITE);\n`;
    };

    Arduino['dibujarLineaOled'] = function (block) {
        const x0 = this.valueToCode(block, 'X0', this.ORDER_ATOMIC) || '0';
        const y0 = this.valueToCode(block, 'Y0', this.ORDER_ATOMIC) || '0';
        const x1 = this.valueToCode(block, 'X1', this.ORDER_ATOMIC) || '10';
        const y1 = this.valueToCode(block, 'Y1', this.ORDER_ATOMIC) || '10';
        return `display.drawLine(${x0}, ${y0}, ${x1}, ${y1}, SSD1306_WHITE);\n`;
    };

    Arduino['dibujarRectanguloOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        const w = this.valueToCode(block, 'W', this.ORDER_ATOMIC) || '10';
        const h = this.valueToCode(block, 'H', this.ORDER_ATOMIC) || '10';
        const filled = block.getFieldValue('FILLED') || 'false';
        if (filled === 'true' || filled === 'filled') {
            return `display.fillRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
        }
        return `display.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    };

    Arduino['dibujarCirculoOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '64';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '32';
        const r = this.valueToCode(block, 'R', this.ORDER_ATOMIC) || '10';
        const filled = block.getFieldValue('FILLED') || 'false';
        if (filled === 'true' || filled === 'filled') {
            return `display.fillCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
        }
        return `display.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    };

    Arduino['establecerTamanoTextoOled'] = function (block) {
        const size = this.valueToCode(block, 'SIZE', this.ORDER_ATOMIC) || '1';
        return `display.setTextSize(${size});\n`;
    };

    // I2C
    Arduino['iniciarI2C'] = function (block) {
        this.addInclude('Wire.h');
        return 'Wire.begin();\n';
    };

    Arduino['escribirI2C'] = function (block) {
        const addr = this.valueToCode(block, 'ADDR', this.ORDER_ATOMIC) || '0x00';
        const data = this.valueToCode(block, 'DATA', this.ORDER_ATOMIC) || '0';
        this.addInclude('Wire.h');
        return `Wire.beginTransmission(${addr});\nWire.write(${data});\nWire.endTransmission();\n`;
    };

    // Data conversion
    Arduino['dataConvert'] = function (block) {
        const value = this.valueToCode(block, 'DATA', this.ORDER_ATOMIC) || '0';
        const type = block.getFieldValue('TYPE') || 'integer';
        switch (type) {
        case 'integer':
        case 'int':
            return [`((int)(${value}))`, this.ORDER_ATOMIC];
        case 'float':
        case 'decimal':
            return [`((float)(${value}))`, this.ORDER_ATOMIC];
        case 'string':
            return [`String(${value})`, this.ORDER_ATOMIC];
        default:
            return [value, this.ORDER_ATOMIC];
        }
    };

    // Bitwise operations
    Arduino['bitwiseOp'] = function (block) {
        const a = this.valueToCode(block, 'ARG0', this.ORDER_ATOMIC) || '0';
        const b = this.valueToCode(block, 'ARG1', this.ORDER_ATOMIC) || '0';
        const op = block.getFieldValue('OP') || '&';
        let operator;
        switch (op) {
        case 'and':
        case '&':
            operator = '&';
            break;
        case 'or':
        case '|':
            operator = '|';
            break;
        case 'xor':
        case '^':
            operator = '^';
            break;
        case 'leftShift':
        case '<<':
            operator = '<<';
            break;
        case 'rightShift':
        case '>>':
            operator = '>>';
            break;
        default:
            operator = '&';
        }
        return [`(${a} ${operator} ${b})`, this.ORDER_ATOMIC];
    };

    Arduino['bitwiseNot'] = function (block) {
        const value = this.valueToCode(block, 'ARG0', this.ORDER_ATOMIC) || '0';
        return [`(~${value})`, this.ORDER_UNARY_PREFIX];
    };

    // Delay
    Arduino['control_delay'] = function (block) {
        const ms = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '1000';
        return `delay(${ms});\n`;
    };

    Arduino['arduino_delay'] = function (block) {
        const ms = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '1000';
        return `delay(${ms});\n`;
    };

    Arduino['delay'] = function (block) {
        const ms = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '1000';
        return `delay(${ms});\n`;
    };

    // Millis
    Arduino['arduino_millis'] = function (block) {
        return ['millis()', this.ORDER_ATOMIC];
    };

    // --- Arduino Extension Blocks (prefixed with arduino_) ---
    // These are the blocks from scratch3_arduino extension

    Arduino['arduino_whenArduinoBegin'] = function (block) {
        // Hat block for setup
        return '';
    };

    Arduino['arduino_connect'] = function (block) {
        // Connection is runtime only, not generated code
        return '// Conectar Arduino (runtime)\n';
    };

    Arduino['arduino_disconnect'] = function (block) {
        return '// Desconectar Arduino (runtime)\n';
    };

    Arduino['arduino_isConnected'] = function (block) {
        return ['true', this.ORDER_ATOMIC];
    };

    Arduino['arduino_delayMs'] = function (block) {
        const ms = this.valueToCode(block, 'MS', this.ORDER_ATOMIC) || '1000';
        return `delay(${ms});\n`;
    };

    Arduino['arduino_servoWrite'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '9';
        const angle = this.valueToCode(block, 'ANGLE', this.ORDER_ATOMIC) || '90';
        const servoName = `servo_${pin}`;
        this.addInclude('Servo.h');
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);
        return `${servoName}.write(${angle});\n`;
    };

    Arduino['arduino_servoRead'] = function (block) {
        const pin = this.valueToCode(block, 'PIN', this.ORDER_ATOMIC) || '9';
        const servoName = `servo_${pin}`;
        this.addInclude('Servo.h');
        this.addGlobalVar(servoName, 'Servo');
        return [`${servoName}.read()`, this.ORDER_ATOMIC];
    };

    // ========================================
    // STBoard V2 Extension Blocks
    // ========================================

    // --- Inicio (Start) Blocks ---
    Arduino['arduino_stbv2inicio_stbBoardV2_whenArduinoBegin'] = function (block) {
        // Hat block - setup is handled by generator framework
        return '';
    };

    Arduino['arduino_stbv2inicio_stbBoardV2_initBootScreen'] = function (block) {
        console.log('[DEBUG] initBootScreen generator function executed');
        // Initialize OLED display with boot screen - FULL VERSION matching OpenBlock
        this.addInclude('Wire.h');
        this.addInclude('Adafruit_GFX.h');
        this.addInclude('Adafruit_SSD1306.h');
        this.addInclude('Adafruit_INA219.h');

        // Add OLED base definitions
        this.definitions_.set('stb_v2_oled_base', `struct STBV2OledState {
  bool initialized;
  uint8_t address;
  uint8_t textSize;
  uint16_t textColor;
  uint16_t backgroundColor;
};

const uint8_t STB_V2_OLED_WIDTH = 128;
const uint8_t STB_V2_OLED_HEIGHT = 64;

Adafruit_SSD1306 stbV2Oled(STB_V2_OLED_WIDTH, STB_V2_OLED_HEIGHT, &Wire, -1);
STBV2OledState stbV2OledState = {false, 0x3C, 1, SSD1306_WHITE, SSD1306_BLACK};

void stbV2OledEnsureInit() {
  if (stbV2OledState.initialized) {
    return;
  }
  Wire.begin();
  if (!stbV2Oled.begin(SSD1306_SWITCHCAPVCC, stbV2OledState.address)) {
    return;
  }
  stbV2Oled.setRotation(2);
  stbV2Oled.clearDisplay();
  stbV2Oled.setTextWrap(true);
  stbV2Oled.setTextSize(stbV2OledState.textSize);
  stbV2Oled.setTextColor(stbV2OledState.textColor, stbV2OledState.backgroundColor);
  stbV2Oled.display();
  stbV2OledState.initialized = true;
}

void stbV2OledInit(uint8_t address) {
  stbV2OledState.address = address;
  stbV2OledState.initialized = false;
  stbV2OledEnsureInit();
  if (!stbV2OledState.initialized) {
    return;
  }
  stbV2Oled.clearDisplay();
  stbV2Oled.setCursor(0, 0);
  stbV2Oled.display();
}`);

        // Add buttons base definitions
        this.definitions_.set('stb_v2_buttons_base', `struct STBV2ButtonState { uint8_t pin; bool currentPressed; bool lastRawPressed; unsigned long lastChangeMs; uint32_t pressCount; };
const unsigned long STB_V2_BUTTON_DEBOUNCE_MS = 20UL;
bool stbV2ButtonsInitialized = false;
STBV2ButtonState stbV2Buttons[6] = {{38,false,false,0UL,0UL},{39,false,false,0UL,0UL},{40,false,false,0UL,0UL},{41,false,false,0UL,0UL},{42,false,false,0UL,0UL},{43,false,false,0UL,0UL}};
int8_t stbV2ButtonIndexFromName(const String& buttonName) { if (buttonName == "B1") return 0; if (buttonName == "B2") return 1; if (buttonName == "B3") return 2; if (buttonName == "B4") return 3; if (buttonName == "B5") return 4; if (buttonName == "B6") return 5; return -1; }
void stbV2ButtonsTick() { unsigned long now = millis(); for (uint8_t i = 0; i < 6; ++i) { STBV2ButtonState &button = stbV2Buttons[i]; bool rawPressed = digitalRead(button.pin) == HIGH; if (rawPressed != button.lastRawPressed) { button.lastRawPressed = rawPressed; button.lastChangeMs = now; } if ((now - button.lastChangeMs) >= STB_V2_BUTTON_DEBOUNCE_MS && button.currentPressed != rawPressed) { button.currentPressed = rawPressed; if (button.currentPressed) { button.pressCount++; } } } }
void stbV2ButtonsInit() { if (stbV2ButtonsInitialized) return; for (uint8_t i = 0; i < 6; ++i) { pinMode(stbV2Buttons[i].pin, INPUT); } stbV2ButtonsTick(); stbV2ButtonsInitialized = true; }
bool stbV2ReadButton(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return false; stbV2ButtonsTick(); return stbV2Buttons[index].currentPressed; }`);

        // Add boot UI control base
        this.definitions_.set('stb_v2_boot_ui_control', `bool stbV2BootUiEnabled = false;
bool stbV2BootUiAllowModeButtons = false;
void stbV2BootUiDisable() {
  stbV2BootUiEnabled = false;
}
void stbV2BootUiDisableModeButtons() {
  stbV2BootUiAllowModeButtons = false;
}`);

        // Add INA219 definition
        this.definitions_.set('define_ina219', 'Adafruit_INA219 ina219;');

        // Add the complete bootscreen UI definitions
        this.definitions_.set('stbv2_bootscreen_ui', `unsigned long stbV2BatteryLastReadMs = 0UL;
unsigned long stbV2UiLastDrawMs = 0UL;
unsigned long stbV2AnimLastFrameMs = 0UL;
unsigned long stbV2ModeSelectLastMs = 0UL;
float stbV2BatteryPercent = 100.0f;
float stbV2BatteryVoltage = 0.0f;
float stbV2BatteryCurrentmA = 0.0f;
bool stbV2BatteryCharging = false;
bool stbV2BatteryReady = false;
uint8_t stbV2OledMode = 0;
uint8_t stbV2AnimFrame = 0;
bool stbV2ButtonHandled[6] = {false, false, false, false, false, false};
const unsigned long STB_V2_BATTERY_READ_INTERVAL_MS = 60000UL;
const unsigned long STB_V2_BATTERY_READ_CHARGING_INTERVAL_MS = 1800UL;
const unsigned long STB_V2_UI_REDRAW_INTERVAL_MS = 140UL;
const unsigned long STB_V2_ANIM_INTERVAL_MS = 180UL;
const unsigned long STB_V2_MODE_SELECT_DEBOUNCE_MS = 280UL;

float stbV2ClampBatteryPercent(float value) {
  if (value < 0.0f) return 0.0f;
  if (value > 100.0f) return 100.0f;
  return value;
}

float stbV2BatteryPercentFromVoltage(float voltage) {
  return stbV2ClampBatteryPercent(((voltage - 6.0f) / (8.4f - 6.0f)) * 100.0f);
}

float stbV2NormalizeBatteryVoltage(float value) {
  if (!isfinite(value)) return 0.0f;
  if (value < 0.0f) return 0.0f;
  if (value > 10.5f) return 0.0f;
  return value;
}

void stbV2DrawBatteryGauge(float percent) {
  int x = 6;
  int y = 18;
  int w = 28;
  int h = 42;
  stbV2Oled.drawRoundRect(x, y, w, h, 4, SSD1306_WHITE);
  stbV2Oled.fillRect(x + w, y + 12, 4, 16, SSD1306_WHITE);
  int innerH = h - 6;
  int fillH = static_cast<int>((innerH * percent) / 100.0f);
  if (fillH < 0) fillH = 0;
  if (fillH > innerH) fillH = innerH;
  if (fillH > 0) {
    stbV2Oled.fillRoundRect(x + 3, y + h - 3 - fillH, w - 6, fillH, 2, SSD1306_WHITE);
  }
  if (stbV2BatteryCharging) {
    uint8_t step = stbV2AnimFrame % 4;
    if (step >= 1) stbV2Oled.fillRect(x + 4, y + 28, w - 8, 8, SSD1306_WHITE);
    if (step >= 2) stbV2Oled.fillRect(x + 4, y + 18, w - 8, 8, SSD1306_WHITE);
    if (step >= 3) stbV2Oled.fillRect(x + 4, y + 8, w - 8, 8, SSD1306_WHITE);
  }
}

void stbV2DrawBatteryDashboard() {
  stbV2Oled.clearDisplay();
  stbV2Oled.setTextColor(SSD1306_WHITE);
  stbV2Oled.setTextWrap(false);
  stbV2Oled.setTextSize(1);
  stbV2Oled.setCursor(4, 2);
  stbV2Oled.print("B1 BATERIA");
  stbV2Oled.setCursor(82, 2);
  stbV2Oled.print(stbV2BatteryCharging ? "CARGA" : "LISTO");
  stbV2DrawBatteryGauge(stbV2BatteryPercent);
  stbV2Oled.setTextSize(3);
  stbV2Oled.setCursor(42, 14);
  if (stbV2BatteryPercent < 10.0f) stbV2Oled.print(" ");
  if (stbV2BatteryPercent < 100.0f) stbV2Oled.print(" ");
  stbV2Oled.print(static_cast<int>(stbV2BatteryPercent + 0.5f));
  stbV2Oled.print("%");
  stbV2Oled.setTextSize(1);
  stbV2Oled.setCursor(44, 40);
  stbV2Oled.print(stbV2BatteryVoltage, 2);
  stbV2Oled.print("V");
  stbV2Oled.setCursor(84, 40);
  if (stbV2BatteryCurrentmA >= 0.0f) stbV2Oled.print("+");
  stbV2Oled.print(stbV2BatteryCurrentmA, 0);
  stbV2Oled.print("mA");
  stbV2Oled.setCursor(44, 54);
  stbV2Oled.print("B2..B6 MODOS");
  stbV2Oled.display();
}

void stbV2DrawEyesMode() {
  int leftX = 14;
  int rightX = 72;
  int y = 16;
  int w = 42;
  int h = 20;
  stbV2Oled.clearDisplay();
  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
  if ((stbV2AnimFrame % 8) == 4) {
    stbV2Oled.drawFastHLine(leftX, y + 10, w, SSD1306_WHITE);
    stbV2Oled.drawFastHLine(rightX, y + 10, w, SSD1306_WHITE);
  } else {
    stbV2Oled.drawRoundRect(leftX, y, w, h, 8, SSD1306_WHITE);
    stbV2Oled.drawRoundRect(rightX, y, w, h, 8, SSD1306_WHITE);
    int dx = (stbV2AnimFrame % 4) == 1 ? 4 : ((stbV2AnimFrame % 4) == 3 ? -4 : 0);
    stbV2Oled.fillCircle(leftX + 21 + dx, y + 10, 5, SSD1306_WHITE);
    stbV2Oled.fillCircle(rightX + 21 + dx, y + 10, 5, SSD1306_WHITE);
  }
  stbV2Oled.display();
}

void stbV2DrawAngryMode() {
  stbV2Oled.clearDisplay();
  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
  stbV2Oled.drawLine(18, 18, 48, 10, SSD1306_WHITE);
  stbV2Oled.drawLine(80, 10, 110, 18, SSD1306_WHITE);
  stbV2Oled.fillRoundRect(20, 20, 28, 10, 4, SSD1306_WHITE);
  stbV2Oled.fillRoundRect(80, 20, 28, 10, 4, SSD1306_WHITE);
  stbV2Oled.fillCircle(34 + ((stbV2AnimFrame % 2) ? 2 : -2), 25, 3, SSD1306_BLACK);
  stbV2Oled.fillCircle(94 + ((stbV2AnimFrame % 2) ? -2 : 2), 25, 3, SSD1306_BLACK);
  stbV2Oled.drawCircle(64, 46, 16, SSD1306_WHITE);
  stbV2Oled.fillRect(48, 46, 32, 8, SSD1306_BLACK);
  stbV2Oled.drawFastHLine(46, 52, 36, SSD1306_WHITE);
  stbV2Oled.display();
}

void stbV2DrawOrbitMode() {
  static const int8_t px[8] = {0, 18, 26, 18, 0, -18, -26, -18};
  static const int8_t py[8] = {-22, -16, 0, 16, 22, 16, 0, -16};
  stbV2Oled.clearDisplay();
  stbV2Oled.drawCircle(64, 32, 24, SSD1306_WHITE);
  stbV2Oled.fillCircle(64, 32, 5, SSD1306_WHITE);
  uint8_t frame = stbV2AnimFrame % 8;
  stbV2Oled.fillCircle(64 + px[frame], 32 + py[frame], 4, SSD1306_WHITE);
  stbV2Oled.fillCircle(64 - px[frame], 32 - py[frame], 3, SSD1306_WHITE);
  stbV2Oled.drawFastHLine(20, 56, 88, SSD1306_WHITE);
  stbV2Oled.display();
}

void stbV2DrawEqualizerMode() {
  static const uint8_t patterns[6][5] = {
    {12, 22, 34, 18, 28},
    {26, 14, 30, 38, 20},
    {36, 24, 12, 28, 40},
    {18, 34, 26, 12, 30},
    {30, 18, 38, 24, 14},
    {14, 28, 20, 36, 26}
  };
  uint8_t frame = stbV2AnimFrame % 6;
  stbV2Oled.clearDisplay();
  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
  for (uint8_t i = 0; i < 5; ++i) {
    int x = 16 + (i * 22);
    int h = patterns[frame][i];
    stbV2Oled.drawRoundRect(x, 52 - h, 14, h, 2, SSD1306_WHITE);
    stbV2Oled.fillRoundRect(x + 2, 54 - h, 10, h - 4, 2, SSD1306_WHITE);
  }
  stbV2Oled.display();
}

void stbV2DrawStarsMode() {
  static const uint8_t sx[8] = {14, 36, 58, 82, 104, 24, 72, 112};
  static const uint8_t sy[8] = {12, 28, 10, 24, 14, 46, 42, 50};
  stbV2Oled.clearDisplay();
  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
  for (uint8_t i = 0; i < 8; ++i) {
    uint8_t phase = (stbV2AnimFrame + i) % 4;
    int x = sx[i];
    int y = sy[i];
    stbV2Oled.drawPixel(x, y, SSD1306_WHITE);
    if (phase > 0) {
      stbV2Oled.drawFastHLine(x - 1, y, 3, SSD1306_WHITE);
      stbV2Oled.drawFastVLine(x, y - 1, 3, SSD1306_WHITE);
    }
    if (phase > 2) {
      stbV2Oled.drawPixel(x - 1, y - 1, SSD1306_WHITE);
      stbV2Oled.drawPixel(x + 1, y + 1, SSD1306_WHITE);
      stbV2Oled.drawPixel(x + 1, y - 1, SSD1306_WHITE);
      stbV2Oled.drawPixel(x - 1, y + 1, SSD1306_WHITE);
    }
  }
  stbV2Oled.fillCircle(62, 34, 8, SSD1306_WHITE);
  stbV2Oled.fillCircle(72, 34, 8, SSD1306_WHITE);
  stbV2Oled.fillTriangle(54, 34, 80, 34, 67, 54, SSD1306_WHITE);
  stbV2Oled.display();
}

void stbV2DrawWavesMode() {
  stbV2Oled.clearDisplay();
  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
  for (uint8_t x = 0; x < 128; x += 4) {
    int y1 = 18 + static_cast<int>(6.0f * sin((x + stbV2AnimFrame * 8) * 0.15f));
    int y2 = 34 + static_cast<int>(7.0f * sin((x + stbV2AnimFrame * 10) * 0.12f));
    int y3 = 50 + static_cast<int>(5.0f * sin((x + stbV2AnimFrame * 12) * 0.18f));
    stbV2Oled.fillCircle(x, y1, 1, SSD1306_WHITE);
    stbV2Oled.fillCircle(x, y2, 1, SSD1306_WHITE);
    stbV2Oled.fillCircle(x, y3, 1, SSD1306_WHITE);
  }
  stbV2Oled.display();
}

void stbV2RenderCurrentMode() {
  switch (stbV2OledMode) {
    case 0: stbV2DrawBatteryDashboard(); break;
    case 1: stbV2DrawEyesMode(); break;
    case 2: stbV2DrawAngryMode(); break;
    case 3: stbV2DrawOrbitMode(); break;
    case 4: stbV2DrawEqualizerMode(); break;
    case 5: stbV2DrawStarsMode(); break;
    default: stbV2DrawWavesMode(); break;
  }
}

void stbV2HandleModeButtons() {
  unsigned long now = millis();
  for (uint8_t i = 0; i < 6; ++i) {
    bool pressed = stbV2ReadButton(String("B") + String(i + 1));
    if (pressed && !stbV2ButtonHandled[i] && (now - stbV2ModeSelectLastMs) >= STB_V2_MODE_SELECT_DEBOUNCE_MS) {
      stbV2OledMode = i;
      stbV2ButtonHandled[i] = true;
      stbV2ModeSelectLastMs = now;
      stbV2UiLastDrawMs = 0UL;
    }
    if (!pressed) {
      stbV2ButtonHandled[i] = false;
    }
  }
}

void stbV2ReadBatteryStatus() {
  float validSum = 0.0f;
  uint8_t validCount = 0;
  float currentSum = 0.0f;
  for (uint8_t i = 0; i < 4; ++i) {
    float busVoltage = ina219.getBusVoltage_V();
    float shuntVoltage = ina219.getShuntVoltage_mV() / 1000.0f;
    float loadVoltage = stbV2NormalizeBatteryVoltage(busVoltage + shuntVoltage);
    if (loadVoltage <= 0.0f) {
      loadVoltage = stbV2NormalizeBatteryVoltage(busVoltage);
    }
    if (loadVoltage > 0.0f) {
      validSum += loadVoltage;
      validCount++;
    }
    currentSum += ina219.getCurrent_mA();
    delay(2);
  }
  if (validCount > 0) {
    float sampledVoltage = validSum / validCount;
    if (!stbV2BatteryReady) {
      stbV2BatteryVoltage = sampledVoltage;
    } else {
      stbV2BatteryVoltage = (stbV2BatteryVoltage * 0.75f) + (sampledVoltage * 0.25f);
    }
  }
  stbV2BatteryCurrentmA = currentSum / 4.0f;
  stbV2BatteryCharging = stbV2BatteryCurrentmA > 20.0f;
  float sampledPercent = stbV2BatteryPercentFromVoltage(stbV2BatteryVoltage);
  if (!stbV2BatteryReady) {
    stbV2BatteryPercent = sampledPercent;
    stbV2BatteryReady = true;
  } else {
    stbV2BatteryPercent = (stbV2BatteryPercent * 0.78f) + (sampledPercent * 0.22f);
  }
  stbV2BatteryPercent = stbV2ClampBatteryPercent(stbV2BatteryPercent);
  stbV2BatteryLastReadMs = millis();
}

void stbV2BatteryUiTick() {
  unsigned long now = millis();
  if (!stbV2BootUiEnabled) {
    return;
  }
  if (stbV2BootUiAllowModeButtons) {
    stbV2HandleModeButtons();
  }
  unsigned long readInterval = stbV2BatteryCharging ? STB_V2_BATTERY_READ_CHARGING_INTERVAL_MS : STB_V2_BATTERY_READ_INTERVAL_MS;
  if (!stbV2BatteryReady || now - stbV2BatteryLastReadMs >= readInterval) {
    stbV2ReadBatteryStatus();
  }
  if (now - stbV2AnimLastFrameMs >= STB_V2_ANIM_INTERVAL_MS) {
    stbV2AnimFrame++;
    stbV2AnimLastFrameMs = now;
  }
  if (now - stbV2UiLastDrawMs >= STB_V2_UI_REDRAW_INTERVAL_MS) {
    stbV2RenderCurrentMode();
    stbV2UiLastDrawMs = now;
  }
}

void stbV2ShowWelcomeSequence() {
  static const char *msgs[2] = {"BIENVENIDO", "STBOARD V2"};
  for (uint8_t i = 0; i < 2; ++i) {
    stbV2Oled.clearDisplay();
    stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);
    stbV2Oled.drawRoundRect(4, 4, 120, 56, 6, SSD1306_WHITE);
    stbV2Oled.setTextColor(SSD1306_WHITE);
    stbV2Oled.setTextWrap(false);
    stbV2Oled.setTextSize(2);
    int16_t x1, y1;
    uint16_t w, h;
    stbV2Oled.getTextBounds(msgs[i], 0, 0, &x1, &y1, &w, &h);
    int textX = (128 - static_cast<int>(w)) / 2;
    if (textX < 0) textX = 0;
    stbV2Oled.setCursor(textX, 18);
    stbV2Oled.print(msgs[i]);
    stbV2Oled.setTextSize(1);
    stbV2Oled.setCursor(24, 44);
    stbV2Oled.print(i == 0 ? "Sistema iniciado" : "Midiendo bateria");
    stbV2Oled.display();
    delay(650);
  }
}`);

        // Add repeat definition (to be placed at the end of final code)
        this.definitions_.set('repeat', `void repeat() {
  stbV2ButtonsTick();
  stbV2BatteryUiTick();
}`);

        // Add setup code
        this.addSetupCode('stbV2ButtonsInit();');
        this.addSetupCode('stbV2OledInit(0x3C);');
        this.addSetupCode('ina219.begin();');
        this.addSetupCode('Wire.setClock(400000);');
        this.addSetupCode('stbV2BootUiEnabled = true;');
        this.addSetupCode('stbV2BootUiAllowModeButtons = true;');
        this.addSetupCode('stbV2ReadBatteryStatus();');
        this.addSetupCode('stbV2ShowWelcomeSequence();');
        this.addSetupCode('stbV2DrawBatteryDashboard();\n');

        // Add loop code
        this.loopCode_.push('repeat();');

        return '';
    };

    // Also register the non-prefixed version
    Arduino['stbv2inicio_stbBoardV2_initBootScreen'] = function (block) {
        return Arduino['arduino_stbv2inicio_stbBoardV2_initBootScreen'].call(this, block);
    };

    // ========================================
    // STBoard V2 Servo/Ports Helper Functions
    // ========================================

    // Map port number to physical pin for STBoard V2
    const stbV2ServoPinForPort = (portValue) => {
        switch (String(portValue)) {
        case '2': return '46';
        case '3': return '45';
        case '4': return '9';
        case '5': return '8';
        case '7': return '4';
        case '8': return '5';
        case '9': return '6';
        case '10': return '7';
        default: return '21';
        }
    };

    // Add servo definitions for a specific pin
    const ensureServoDefinitionForPin = (generator, pin) => {
        generator.addInclude('Servo.h');

        const suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
        const defKey = `servo_def_${suffix}`;

        if (!generator.definitions_.has(defKey)) {
            generator.definitions_.set('openblock_cooperative_delay', `void repeat(void) __attribute__((weak));
void openBlockCooperativeDelay(unsigned long durationMs) {
  unsigned long startMs = millis();
  while (millis() - startMs < durationMs) {
    if (repeat) {
      repeat();
    }
    unsigned long elapsedMs = millis() - startMs;
    unsigned long remainingMs = durationMs > elapsedMs ? (durationMs - elapsedMs) : 0UL;
    delay(remainingMs > 2UL ? 2UL : 1UL);
  }
}`);

            generator.definitions_.set(defKey, `Servo servo_${suffix};
int servo_${suffix}_angle = 90;
int servo_${suffix}_pulse = 1500;
int servo_${suffix}_min = 544;
int servo_${suffix}_max = 2400;
bool servo_${suffix}_attached = false;

void servoAttach_${suffix}(int minUs, int maxUs) {
  if (minUs < 100) minUs = 544;
  if (maxUs <= minUs) maxUs = 2400;
  servo_${suffix}_min = minUs;
  servo_${suffix}_max = maxUs;
  if (servo_${suffix}_attached) {
    servo_${suffix}.detach();
  }
  servo_${suffix}.attach(${pin}, servo_${suffix}_min, servo_${suffix}_max);
  servo_${suffix}_attached = true;
}

void servoEnsure_${suffix}() {
  if (!servo_${suffix}_attached) {
    servoAttach_${suffix}(servo_${suffix}_min, servo_${suffix}_max);
  }
}

void servoWriteAngle_${suffix}(int angle) {
  servoEnsure_${suffix}();
  servo_${suffix}_angle = constrain(angle, 0, 180);
  servo_${suffix}.write(servo_${suffix}_angle);
  servo_${suffix}_pulse = map(servo_${suffix}_angle, 0, 180, servo_${suffix}_min, servo_${suffix}_max);
}

void servoWritePulse_${suffix}(int pulseUs) {
  servoEnsure_${suffix}();
  servo_${suffix}_pulse = constrain(pulseUs, servo_${suffix}_min, servo_${suffix}_max);
  servo_${suffix}.writeMicroseconds(servo_${suffix}_pulse);
  servo_${suffix}_angle = map(servo_${suffix}_pulse, servo_${suffix}_min, servo_${suffix}_max, 0, 180);
}

void servoWriteContinuous_${suffix}(int speedPercent) {
  servoEnsure_${suffix}();
  int constrainedSpeed = constrain(speedPercent, -100, 100);
  servo_${suffix}_pulse = map(constrainedSpeed, -100, 100, servo_${suffix}_min, servo_${suffix}_max);
  servo_${suffix}.writeMicroseconds(servo_${suffix}_pulse);
}

void servoCenter_${suffix}() {
  servoWriteAngle_${suffix}(90);
}

void servoStopContinuous_${suffix}() {
  servoWritePulse_${suffix}(1500);
}

void servoMoveSmooth_${suffix}(int targetAngle, unsigned long durationMs) {
  servoEnsure_${suffix}();
  int startAngle = servo_${suffix}_angle;
  int finalAngle = constrain(targetAngle, 0, 180);
  if (durationMs == 0) {
    servoWriteAngle_${suffix}(finalAngle);
    return;
  }
  int delta = finalAngle - startAngle;
  int steps = abs(delta);
  if (steps == 0) {
    servoWriteAngle_${suffix}(finalAngle);
    return;
  }
  unsigned long stepDelay = durationMs / static_cast<unsigned long>(steps);
  if (stepDelay == 0) {
    stepDelay = 1;
  }
  int direction = delta > 0 ? 1 : -1;
  for (int current = startAngle; current != finalAngle; current += direction) {
    servoWriteAngle_${suffix}(current);
    openBlockCooperativeDelay(stepDelay);
  }
  servoWriteAngle_${suffix}(finalAngle);
}

void servoDetach_${suffix}() {
  if (servo_${suffix}_attached) {
    servo_${suffix}.detach();
    servo_${suffix}_attached = false;
  }
}`);
        }
    };

    // --- STBoard V2 Port/Servo Blocks ---
    Arduino['stbv2puertos_moverServoPuerto'] = function (block) {
        const port = block.getFieldValue('PORT') || '2';
        const angle = this.valueToCode(block, 'ANGLE', this.ORDER_ATOMIC) || '90';
        const pin = stbV2ServoPinForPort(port);
        if (!pin) {
            return `// Puerto sin soporte para servo: ${port}\n`;
        }
        ensureServoDefinitionForPin(this, pin);
        const suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
        return `servoWriteAngle_${suffix}(${angle});\n`;
    };

    Arduino['arduino_stbv2puertos_moverServoPuerto'] = function (block) {
        return Arduino['stbv2puertos_moverServoPuerto'].call(this, block);
    };

    Arduino['stbv2puertos_moverServoPuertoPorPulsos'] = function (block) {
        const port = block.getFieldValue('PORT') || '2';
        const pulse = this.valueToCode(block, 'PULSE', this.ORDER_ATOMIC) || '1500';
        const pin = stbV2ServoPinForPort(port);
        if (!pin) {
            return `// Puerto sin soporte para servo: ${port}\n`;
        }
        ensureServoDefinitionForPin(this, pin);
        const suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
        return `servoWritePulse_${suffix}(${pulse});\n`;
    };

    Arduino['arduino_stbv2puertos_moverServoPuertoPorPulsos'] = function (block) {
        return Arduino['stbv2puertos_moverServoPuertoPorPulsos'].call(this, block);
    };

    Arduino['stbv2puertos_desconectarServoPuerto'] = function (block) {
        const port = block.getFieldValue('PORT') || '2';
        const pin = stbV2ServoPinForPort(port);
        if (!pin) {
            return `// Puerto sin soporte para servo: ${port}\n`;
        }
        ensureServoDefinitionForPin(this, pin);
        const suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
        return `servoDetach_${suffix}();\n`;
    };

    Arduino['arduino_stbv2puertos_desconectarServoPuerto'] = function (block) {
        return Arduino['stbv2puertos_desconectarServoPuerto'].call(this, block);
    };

    Arduino['stbv2puertos_moverServoPuertoSuavemente'] = function (block) {
        const port = block.getFieldValue('PORT') || '2';
        const angle = this.valueToCode(block, 'ANGLE', this.ORDER_ATOMIC) || '90';
        const time = this.valueToCode(block, 'TIME', this.ORDER_ATOMIC) || '1000';
        const pin = stbV2ServoPinForPort(port);
        if (!pin) {
            return `// Puerto sin soporte para servo: ${port}\n`;
        }
        ensureServoDefinitionForPin(this, pin);
        const suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
        return `servoMoveSmooth_${suffix}(${angle}, ${time});\n`;
    };

    Arduino['arduino_stbv2puertos_moverServoPuertoSuavemente'] = function (block) {
        return Arduino['stbv2puertos_moverServoPuertoSuavemente'].call(this, block);
    };

    // --- OLED Blocks ---
    Arduino['arduino_stbv2oled_iniciarPantallaOled'] = function (block) {
        const addr = block.getFieldValue('ADDR') || '0x3C';
        this.addInclude('Wire.h');
        this.addInclude('Adafruit_GFX.h');
        this.addInclude('Adafruit_SSD1306.h');
        this.addGlobalVar('display', 'Adafruit_SSD1306', 'Adafruit_SSD1306(128, 64, &Wire, -1)');
        return `Wire.begin();\ndisplay.begin(SSD1306_SWITCHCAPVCC, ${addr});\ndisplay.clearDisplay();\ndisplay.setTextSize(1);\ndisplay.setTextColor(SSD1306_WHITE);\n`;
    };

    Arduino['arduino_stbv2oled_limpiarPantallaOled'] = function (block) {
        return 'display.clearDisplay();\n';
    };

    Arduino['arduino_stbv2oled_actualizarPantallaOled'] = function (block) {
        return 'display.display();\n';
    };

    Arduino['arduino_stbv2oled_establecerCursorOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        return `display.setCursor(${x}, ${y});\n`;
    };

    Arduino['arduino_stbv2oled_imprimirOled'] = function (block) {
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        const eol = block.getFieldValue('EOL') || 'none';
        if (eol === 'newline' || eol === 'warp') {
            return `display.println(${text});\n`;
        }
        return `display.print(${text});\n`;
    };

    Arduino['arduino_stbv2oled_mostrarTextoOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        const text = this.valueToCode(block, 'TEXT', this.ORDER_ATOMIC) || '""';
        return `display.setCursor(${x}, ${y});\ndisplay.print(${text});\n`;
    };

    Arduino['arduino_stbv2oled_configurarTextoOled'] = function (block) {
        const size = this.valueToCode(block, 'SIZE', this.ORDER_ATOMIC) || '1';
        const color = block.getFieldValue('COLOR') || 'WHITE';
        const colorValue = color === 'WHITE' ? 'SSD1306_WHITE' : 'SSD1306_BLACK';
        return `display.setTextSize(${size});\ndisplay.setTextColor(${colorValue});\n`;
    };

    Arduino['arduino_stbv2oled_dibujarPixelOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        const color = block.getFieldValue('COLOR') || 'WHITE';
        const colorValue = color === 'WHITE' ? 'SSD1306_WHITE' : 'SSD1306_BLACK';
        return `display.drawPixel(${x}, ${y}, ${colorValue});\n`;
    };

    Arduino['arduino_stbv2oled_dibujarLineaOled'] = function (block) {
        const x0 = this.valueToCode(block, 'X0', this.ORDER_ATOMIC) || '0';
        const y0 = this.valueToCode(block, 'Y0', this.ORDER_ATOMIC) || '0';
        const x1 = this.valueToCode(block, 'X1', this.ORDER_ATOMIC) || '10';
        const y1 = this.valueToCode(block, 'Y1', this.ORDER_ATOMIC) || '10';
        return `display.drawLine(${x0}, ${y0}, ${x1}, ${y1}, SSD1306_WHITE);\n`;
    };

    Arduino['arduino_stbv2oled_dibujarRectanguloOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        const w = this.valueToCode(block, 'W', this.ORDER_ATOMIC) || '10';
        const h = this.valueToCode(block, 'H', this.ORDER_ATOMIC) || '10';
        return `display.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    };

    Arduino['arduino_stbv2oled_rellenarRectanguloOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '0';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '0';
        const w = this.valueToCode(block, 'W', this.ORDER_ATOMIC) || '10';
        const h = this.valueToCode(block, 'H', this.ORDER_ATOMIC) || '10';
        return `display.fillRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    };

    Arduino['arduino_stbv2oled_dibujarCirculoOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '64';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '32';
        const r = this.valueToCode(block, 'R', this.ORDER_ATOMIC) || '10';
        return `display.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    };

    Arduino['arduino_stbv2oled_rellenarCirculoOled'] = function (block) {
        const x = this.valueToCode(block, 'X', this.ORDER_ATOMIC) || '64';
        const y = this.valueToCode(block, 'Y', this.ORDER_ATOMIC) || '32';
        const r = this.valueToCode(block, 'R', this.ORDER_ATOMIC) || '10';
        return `display.fillCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    };

    // --- Buzzer Blocks ---
    Arduino['arduino_stbv2buzzer_encenderBuzzer'] = function (block) {
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        this.addSetupCode('pinMode(BUZZER_PIN, OUTPUT);');
        return 'digitalWrite(BUZZER_PIN, HIGH);\n';
    };

    Arduino['arduino_stbv2buzzer_apagarBuzzer'] = function (block) {
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        return 'digitalWrite(BUZZER_PIN, LOW);\n';
    };

    Arduino['arduino_stbv2buzzer_tocarTonoBuzzer'] = function (block) {
        const freq = this.valueToCode(block, 'FREQ', this.ORDER_ATOMIC) || '440';
        const duration = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '500';
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        return `tone(BUZZER_PIN, ${freq}, ${duration});\n`;
    };

    Arduino['arduino_stbv2buzzer_tocarTonoContinuoBuzzer'] = function (block) {
        const freq = this.valueToCode(block, 'FREQ', this.ORDER_ATOMIC) || '440';
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        return `tone(BUZZER_PIN, ${freq});\n`;
    };

    Arduino['arduino_stbv2buzzer_silencioBuzzer'] = function (block) {
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        return 'noTone(BUZZER_PIN);\n';
    };

    Arduino['arduino_stbv2buzzer_tocarNotaBuzzer'] = function (block) {
        const note = block.getFieldValue('NOTE') || 'C4';
        const duration = this.valueToCode(block, 'DURATION', this.ORDER_ATOMIC) || '500';
        const noteFreqs = {
            'C3': 131, 'D3': 147, 'E3': 165, 'F3': 175, 'G3': 196, 'A3': 220, 'B3': 247,
            'C4': 262, 'D4': 294, 'E4': 330, 'F4': 349, 'G4': 392, 'A4': 440, 'B4': 494,
            'C5': 523, 'D5': 587, 'E5': 659, 'F5': 698, 'G5': 784, 'A5': 880, 'B5': 988
        };
        const freq = noteFreqs[note] || 440;
        this.addGlobalVar('BUZZER_PIN', 'const int', '8');
        return `tone(BUZZER_PIN, ${freq}, ${duration});\n`;
    };

    // --- Button Blocks ---
    Arduino['arduino_stbv2buttons_leerBoton'] = function (block) {
        const btn = block.getFieldValue('BUTTON') || 'A';
        const pinMap = {'A': '2', 'B': '3', 'C': '4', 'D': '5'};
        const pin = pinMap[btn] || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT_PULLUP);`);
        return [`!digitalRead(${pin})`, this.ORDER_UNARY_PREFIX];
    };

    Arduino['arduino_stbv2buttons_botonPresionado'] = function (block) {
        const btn = block.getFieldValue('BUTTON') || 'A';
        const pinMap = {'A': '2', 'B': '3', 'C': '4', 'D': '5'};
        const pin = pinMap[btn] || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT_PULLUP);`);
        return [`!digitalRead(${pin})`, this.ORDER_UNARY_PREFIX];
    };

    Arduino['arduino_stbv2buttons_esperarHastaBotonPresionado'] = function (block) {
        const btn = block.getFieldValue('BUTTON') || 'A';
        const pinMap = {'A': '2', 'B': '3', 'C': '4', 'D': '5'};
        const pin = pinMap[btn] || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT_PULLUP);`);
        return `while (digitalRead(${pin})) { delay(10); }\n`;
    };

    // --- Light Sensor Blocks ---
    Arduino['arduino_stbv2light_porcentajeLuz'] = function (block) {
        this.addGlobalVar('LIGHT_PIN', 'const int', 'A0');
        return [`map(analogRead(LIGHT_PIN), 0, 1023, 0, 100)`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_stbv2light_leerLuzRaw'] = function (block) {
        this.addGlobalVar('LIGHT_PIN', 'const int', 'A0');
        return [`analogRead(LIGHT_PIN)`, this.ORDER_ATOMIC];
    };

    // --- Temperature Blocks ---
    Arduino['arduino_stbv2temperature_temperaturaCelsius'] = function (block) {
        this.addGlobalVar('TEMP_PIN', 'const int', 'A1');
        return [`(analogRead(TEMP_PIN) * 5.0 / 1024.0 - 0.5) * 100`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_stbv2temperature_leerTemperaturaRaw'] = function (block) {
        this.addGlobalVar('TEMP_PIN', 'const int', 'A1');
        return [`analogRead(TEMP_PIN)`, this.ORDER_ATOMIC];
    };

    // --- Motor Blocks ---
    Arduino['arduino_stbv2motores_configurarMotores'] = function (block) {
        this.addInclude('STBMotors.h');
        this.addGlobalVar('motors', 'STBMotors');
        this.addSetupCode('motors.begin();');
        return '';
    };

    Arduino['arduino_stbv2motores_avanzarMotor'] = function (block) {
        const speed = this.valueToCode(block, 'SPEED', this.ORDER_ATOMIC) || '100';
        return `motors.forward(${speed});\n`;
    };

    Arduino['arduino_stbv2motores_retrocederMotor'] = function (block) {
        const speed = this.valueToCode(block, 'SPEED', this.ORDER_ATOMIC) || '100';
        return `motors.backward(${speed});\n`;
    };

    Arduino['arduino_stbv2motores_girarMotor'] = function (block) {
        const side = block.getFieldValue('SIDE') || 'left';
        const speed = this.valueToCode(block, 'SPEED', this.ORDER_ATOMIC) || '100';
        if (side === 'left') {
            return `motors.turnLeft(${speed});\n`;
        }
        return `motors.turnRight(${speed});\n`;
    };

    Arduino['arduino_stbv2motores_detenerMotor'] = function (block) {
        return 'motors.stop();\n';
    };

    // --- Pin Blocks (arduino_pin category) ---
    Arduino['arduino_pin_setPinMode'] = function (block) {
        const pin = block.getFieldValue('PIN') || '13';
        const mode = block.getFieldValue('MODE') || 'OUTPUT';
        return `pinMode(${pin}, ${mode});\n`;
    };

    Arduino['arduino_pin_setDigitalOutput'] = function (block) {
        const pin = block.getFieldValue('PIN') || '13';
        const level = block.getFieldValue('LEVEL') || 'HIGH';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${level});\n`;
    };

    Arduino['arduino_pin_setPwmOutput'] = function (block) {
        const pin = block.getFieldValue('PIN') || '3';
        const value = this.valueToCode(block, 'OUT', this.ORDER_ATOMIC) || '0';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `analogWrite(${pin}, ${value});\n`;
    };

    Arduino['arduino_pin_readDigitalPin'] = function (block) {
        const pin = block.getFieldValue('PIN') || '2';
        this.addSetupCode(`pinMode(${pin}, INPUT);`);
        return [`digitalRead(${pin})`, this.ORDER_ATOMIC];
    };

    Arduino['arduino_pin_readAnalogPin'] = function (block) {
        const pin = block.getFieldValue('PIN') || 'A0';
        return [`analogRead(${pin})`, this.ORDER_ATOMIC];
    };

    // --- Serial Blocks (arduino_serial category) ---
    Arduino['arduino_serial_multiSerialBegin'] = function (block) {
        const baud = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '9600';
        return `Serial.begin(${baud});\n`;
    };

    Arduino['arduino_serial_multiSerialPrint'] = function (block) {
        const text = this.valueToCode(block, 'VALUE', this.ORDER_ATOMIC) || '""';
        const eol = block.getFieldValue('EOL') || 'warp';
        this.addSetupCode('Serial.begin(9600);');
        if (eol === 'warp' || eol === 'newline') {
            return `Serial.println(${text});\n`;
        }
        return `Serial.print(${text});\n`;
    };

    Arduino['arduino_serial_multiSerialAvailable'] = function (block) {
        this.addSetupCode('Serial.begin(9600);');
        return ['Serial.available()', this.ORDER_ATOMIC];
    };

    Arduino['arduino_serial_multiSerialReadAByte'] = function (block) {
        this.addSetupCode('Serial.begin(9600);');
        return ['Serial.read()', this.ORDER_ATOMIC];
    };

    // Fallback for extension blocks (try to generate reasonable code)
    Arduino.blockToCode = function (block) {
        if (!block) return '';

        const generator = this[block.type];
        if (generator) {
            const code = generator.call(this, block);
            if (Array.isArray(code)) {
                return code;
            }
            // Handle statement blocks with next
            if (block.nextConnection) {
                const nextBlock = block.nextConnection.targetBlock();
                const nextCode = this.blockToCode(nextBlock);
                return code + nextCode;
            }
            return code;
        }

        // Check for extension blocks with common patterns
        const opcode = block.type || '';
        const lowerOpcode = opcode.toLowerCase();

        // Menu/shadow blocks - try to get the field value
        if (opcode.includes('_menu_') || opcode.includes('menu')) {
            const fields = block.inputList && block.inputList[0] && block.inputList[0].fieldRow;
            if (fields && fields.length > 0) {
                const value = fields[0].getValue();
                return [value, this.ORDER_ATOMIC];
            }
        }

        // Hat blocks - just return empty (they define program structure)
        if (lowerOpcode.includes('when') || lowerOpcode.includes('inicio') || lowerOpcode.includes('begin')) {
            return '';
        }

        // Init/setup blocks - often add to setup
        if (lowerOpcode.includes('init') || lowerOpcode.includes('iniciar') || lowerOpcode.includes('configurar')) {
            // Try to get any meaningful info from the block
            const comment = `// Inicializar: ${opcode.split('_').pop()}\n`;
            return comment;
        }

        // Unknown block - add comment
        console.warn(`[ArduinoGenerator] No generator for block type: ${opcode}`);
        return `// Bloque no soportado: ${opcode}\n`;
    };



    

    

    

    

    

    

    // =========================================================
    // COMPATIBILITY LAYER FOR ORIGINAL OPENBLOCK GENERATORS
    // =========================================================

    const definitionsProxy = new Proxy({}, {
        set: (target, key, value) => {
            let val = value;
            if (Array.isArray(value)) val = value.join('\n');
            Arduino.definitions_.set(key, val);
            return true;
        },
        get: (target, key) => {
            if (key === 'set' || key === 'get' || key === 'has' || key === 'keys' || key === 'values' || key === 'entries' || key === 'delete' || key === 'clear' || key === 'size') {
                return Arduino.definitions_[key].bind(Arduino.definitions_);
            }
            return Arduino.definitions_.get(key);
        }
    });

    const includesProxy = new Proxy({}, {
        set: (target, key, value) => {
            let str = String(value);
            const regex = /#include\s*[<"]([^>"]+)[>"]/g;
            let match;
            let found = false;
            while ((match = regex.exec(str)) !== null) {
                Arduino.includes_.add(match[1]);
                found = true;
            }
            if (!found) {
                let clean = str.replace(/#include\s*[<"]?/, '').replace(/[>"]?$/, '').trim();
                if (clean) Arduino.includes_.add(clean);
            }
            return true;
        },
        get: (target, key) => {
            if (key === 'add' || key === 'has' || key === 'delete' || key === 'clear' || key === 'size') {
                return Arduino.includes_[key].bind(Arduino.includes_);
            }
            return Arduino.includes_[key];
        }
    });

    const setupsProxy = new Proxy({}, {
        set: (target, key, value) => {
            let val = value;
            if (Array.isArray(value)) val = value.join('\n');
            Arduino.addSetupCode(val);
            return true;
        }
    });

    const loopsProxy = new Proxy({}, {
        set: (target, key, value) => {
            let val = value;
            if (Array.isArray(value)) val = value.join('\n');
            if (!Arduino.loopCode_.includes(val)) Arduino.loopCode_.push(val);
            return true;
        }
    });

    const Blockly = {
        Arduino: {
            ORDER_ATOMIC: Arduino.ORDER_ATOMIC,
            ORDER_UNARY_POSTFIX: Arduino.ORDER_UNARY_POSTFIX,
            valueToCode: (b, name, order) => Arduino.valueToCode(b, name, order),
            statementToCode: (b, name) => Arduino.statementToCode(b, name),
            addInclude: (key, code) => Arduino.addInclude(key),
            addDefinition: (key, code) => Arduino.definitions_.set(key, code),
            addSetup: (key, code) => Arduino.addSetupCode(code),
            addLoopTrap: (branch, id) => branch,
            definitions_: definitionsProxy,
            includes_: includesProxy,
            setups_: setupsProxy,
            loops_: loopsProxy,
            INDENT: '  '
        }
    };

    function ensureOpenBlockCooperativeDelay () {
Blockly.Arduino.definitions_['definitions_openblock_cooperative_delay'] = [
    'void stbV2RuntimeTick(void) __attribute__((weak));',
    'void openBlockCooperativeDelay(unsigned long durationMs) {',
    '  unsigned long startMs = millis();',
    '  while (millis() - startMs < durationMs) {',
    '    if (stbV2RuntimeTick) {',
    '      stbV2RuntimeTick();',
    '    }',
    '    unsigned long elapsedMs = millis() - startMs;',
    '    unsigned long remainingMs = durationMs > elapsedMs ? (durationMs - elapsedMs) : 0UL;',
    '    delay(remainingMs > 2UL ? 2UL : 1UL);',
    '  }',
    '}'
  ].join('\n');
    }

    function ensureSTBExtensionRuntime () {
Blockly.Arduino.definitions_['stb_extension_motor_runtime'] = [
    'struct STBExtMotorConfig {',
    '  float wheelDiameterCm;',
    '  float maxRpm;',
    '  float trackWidthCm;',
    '  bool configured;',
    '};',
    '',
    'struct STBExtMotorState {',
    '  int lastSpeedPercent;',
    '  volatile long encoderTicks;',
    '  float distanceCm;',
    '};',
    '',
    'struct STBExtTriggerConfig {',
    '  bool enabled;',
    '  uint8_t pin;',
    '  bool greaterThan;',
    '  int threshold;',
    '  uint8_t targetMask;',
    '};',
    '',
    'const uint8_t STB_EXT_A1_IN1 = 6;',
    'const uint8_t STB_EXT_A1_IN2 = 9;',
    'const uint8_t STB_EXT_A2_IN1 = 10;',
    'const uint8_t STB_EXT_A2_IN2 = 11;',
    'const uint8_t STB_EXT_A1_ENC_A = 2;',
    'const uint8_t STB_EXT_A1_ENC_B = 3;',
    'const uint8_t STB_EXT_A2_ENC_A = 4;',
    'const uint8_t STB_EXT_A2_ENC_B = 5;',
    'const uint8_t STB_EXT_TRIGGER_0 = A0;',
    'const uint8_t STB_EXT_TRIGGER_1 = A1;',
    'const float STB_EXT_DEFAULT_WHEEL_DIAMETER_CM = 6.5f;',
    'const float STB_EXT_DEFAULT_MAX_RPM = 120.0f;',
    'const float STB_EXT_DEFAULT_TRACK_WIDTH_CM = 14.0f;',
    'const float STB_EXT_PULSES_PER_REV = 4320.0f;',
    '',
    'STBExtMotorConfig stbExtMotorConfig = {',
    '  STB_EXT_DEFAULT_WHEEL_DIAMETER_CM,',
    '  STB_EXT_DEFAULT_MAX_RPM,',
    '  STB_EXT_DEFAULT_TRACK_WIDTH_CM,',
    '  false',
    '};',
    '',
    'STBExtMotorState stbExtMotorA1 = {0, 0, 0.0f};',
    'STBExtMotorState stbExtMotorA2 = {0, 0, 0.0f};',
    'STBExtTriggerConfig stbExtTriggers[2] = {',
    '  {false, STB_EXT_TRIGGER_0, true, 500, 3},',
    '  {false, STB_EXT_TRIGGER_1, true, 500, 3}',
    '};',
    'bool stbExtInvertA1 = false;',
    'bool stbExtInvertA2 = false;',
    'volatile uint8_t stbExtPrevA1EncAB = 0;',
    'volatile uint8_t stbExtPrevA2EncAB = 0;',
    '',
    'float stbExtWheelCircumferenceCm() {',
    '  return 3.1415926f * stbExtMotorConfig.wheelDiameterCm;',
    '}',
    '',
    'float stbExtTicksPerCm() {',
    '  return STB_EXT_PULSES_PER_REV / stbExtWheelCircumferenceCm();',
    '}',
    '',
    'void stbExtConfigMotors(float wheelDiameterCm, float maxRpm, float trackWidthCm) {',
    '  stbExtMotorConfig.wheelDiameterCm = wheelDiameterCm > 0 ? wheelDiameterCm : STB_EXT_DEFAULT_WHEEL_DIAMETER_CM;',
    '  stbExtMotorConfig.maxRpm = maxRpm > 0 ? maxRpm : STB_EXT_DEFAULT_MAX_RPM;',
    '  stbExtMotorConfig.trackWidthCm = trackWidthCm > 0 ? trackWidthCm : STB_EXT_DEFAULT_TRACK_WIDTH_CM;',
    '  stbExtMotorConfig.configured = true;',
    '  stbExtMotorA1.lastSpeedPercent = 0;',
    '  stbExtMotorA2.lastSpeedPercent = 0;',
    '  stbExtInvertA1 = false;',
    '  stbExtInvertA2 = false;',
    '  stbExtTriggers[0].enabled = false;',
    '  stbExtTriggers[1].enabled = false;',
    '}',
    '',
    'int stbExtClampSpeedPercent(int speedPercent) {',
    '  return constrain(speedPercent, -100, 100);',
    '}',
    '',
    'uint8_t stbExtMotorMaskFromName(const String& motor) {',
    '  if (motor == "A1") {',
    '    return 1;',
    '  }',
    '  if (motor == "A2") {',
    '    return 2;',
    '  }',
    '  return 3;',
    '}',
    '',
    'float stbExtTicksToCm(long ticks) {',
    '  return ticks / stbExtTicksPerCm();',
    '}',
    '',
    'float stbExtDistanceValueToTicks(float value, const String& unit) {',
    '  float magnitude = value < 0 ? -value : value;',
    '  if (unit == "CM") {',
    '    return magnitude * stbExtTicksPerCm();',
    '  }',
    '  if (unit == "ROTATIONS") {',
    '    return magnitude * STB_EXT_PULSES_PER_REV;',
    '  }',
    '  return (magnitude / 360.0f) * STB_EXT_PULSES_PER_REV;',
    '}',
    '',
    'float stbExtTurnValueToTicks(float value, const String& unit) {',
    '  float magnitude = value < 0 ? -value : value;',
    '  if (unit == "ROTATIONS") {',
    '    return magnitude * STB_EXT_PULSES_PER_REV;',
    '  }',
    '  float arcCm = 3.1415926f * stbExtMotorConfig.trackWidthCm * (magnitude / 360.0f);',
    '  return arcCm * stbExtTicksPerCm();',
    '}',
    '',
    'int stbExtApplyDirection(int speedPercent, bool inverted) {',
    '  return inverted ? -speedPercent : speedPercent;',
    '}',
    '',
    'uint8_t stbExtReadEncoderAB(uint8_t pinA, uint8_t pinB) {',
    '  return static_cast<uint8_t>((digitalRead(pinA) << 1) | digitalRead(pinB));',
    '}',
    '',
    'int8_t stbExtQuadratureDelta(uint8_t previousState, uint8_t currentState) {',
    '  static const int8_t table[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};',
    '  return table[((previousState & 0x03) << 2) | (currentState & 0x03)];',
    '}',
    '',
    'void stbExtResetEncoderTracking() {',
    '  noInterrupts();',
    '  stbExtPrevA1EncAB = stbExtReadEncoderAB(STB_EXT_A1_ENC_A, STB_EXT_A1_ENC_B);',
    '  stbExtPrevA2EncAB = stbExtReadEncoderAB(STB_EXT_A2_ENC_A, STB_EXT_A2_ENC_B);',
    '  interrupts();',
    '}',
    '',
    'void stbExtSyncMotorDistance(STBExtMotorState& motorState) {',
    '  motorState.distanceCm = stbExtTicksToCm(motorState.encoderTicks);',
    '}',
    '',
    'void stbExtHandleEncoderChange() {',
    '  uint8_t currentA1 = stbExtReadEncoderAB(STB_EXT_A1_ENC_A, STB_EXT_A1_ENC_B);',
    '  int8_t deltaA1 = stbExtQuadratureDelta(stbExtPrevA1EncAB, currentA1);',
    '  if (deltaA1 != 0) {',
    '    stbExtMotorA1.encoderTicks += deltaA1;',
    '    stbExtPrevA1EncAB = currentA1;',
    '  }',
    '  uint8_t currentA2 = stbExtReadEncoderAB(STB_EXT_A2_ENC_A, STB_EXT_A2_ENC_B);',
    '  int8_t deltaA2 = stbExtQuadratureDelta(stbExtPrevA2EncAB, currentA2);',
    '  if (deltaA2 != 0) {',
    '    stbExtMotorA2.encoderTicks += deltaA2;',
    '    stbExtPrevA2EncAB = currentA2;',
    '  }',
    '}',
    '',
    'void stbExtInitEncoderInterrupts() {',
    '  stbExtResetEncoderTracking();',
    '  PCICR |= (1 << PCIE2);',
    '  PCMSK2 |= (1 << PCINT18) | (1 << PCINT19) | (1 << PCINT20) | (1 << PCINT21);',
    '}',
    '',
    'ISR(PCINT2_vect) {',
    '  stbExtHandleEncoderChange();',
    '}',
    '',
    'void stbExtSetMotorDirection(const String& motor, bool inverted) {',
    '  if (motor == "A1") {',
    '    stbExtInvertA1 = inverted;',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtInvertA2 = inverted;',
    '    return;',
    '  }',
    '}',
    '',
    'void stbExtSetStoredSpeed(const String& motor, int speedPercent) {',
    '  int clamped = stbExtClampSpeedPercent(speedPercent);',
    '  if (motor == "A1") {',
    '    stbExtMotorA1.lastSpeedPercent = clamped;',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtMotorA2.lastSpeedPercent = clamped;',
    '    return;',
    '  }',
    '  stbExtMotorA1.lastSpeedPercent = clamped;',
    '  stbExtMotorA2.lastSpeedPercent = clamped;',
    '}',
    '',
    'void stbExtConfigureTrigger(uint8_t triggerIndex, bool greaterThan, int threshold, const String& targetMotor) {',
    '  if (triggerIndex > 1) {',
    '    return;',
    '  }',
    '  stbExtTriggers[triggerIndex].enabled = true;',
    '  stbExtTriggers[triggerIndex].pin = triggerIndex == 0 ? STB_EXT_TRIGGER_0 : STB_EXT_TRIGGER_1;',
    '  stbExtTriggers[triggerIndex].greaterThan = greaterThan;',
    '  stbExtTriggers[triggerIndex].threshold = threshold;',
    '  stbExtTriggers[triggerIndex].targetMask = stbExtMotorMaskFromName(targetMotor);',
    '}',
    '',
    'void stbExtDisableTrigger(uint8_t triggerIndex) {',
    '  if (triggerIndex > 1) {',
    '    return;',
    '  }',
    '  stbExtTriggers[triggerIndex].enabled = false;',
    '}',
    '',
    'void stbExtDisableAllTriggers() {',
    '  stbExtTriggers[0].enabled = false;',
    '  stbExtTriggers[1].enabled = false;',
    '}',
    '',
    'void stbExtEvaluateTriggers(bool& stopA1, bool& stopA2) {',
    '  stopA1 = false;',
    '  stopA2 = false;',
    '  for (uint8_t i = 0; i < 2; i++) {',
    '    if (!stbExtTriggers[i].enabled) {',
    '      continue;',
    '    }',
    '    int reading = analogRead(stbExtTriggers[i].pin);',
    '    bool matched = stbExtTriggers[i].greaterThan ? reading > stbExtTriggers[i].threshold : reading < stbExtTriggers[i].threshold;',
    '    if (!matched) {',
    '      continue;',
    '    }',
    '    if ((stbExtTriggers[i].targetMask & 1) != 0) {',
    '      stopA1 = true;',
    '    }',
    '    if ((stbExtTriggers[i].targetMask & 2) != 0) {',
    '      stopA2 = true;',
    '    }',
    '  }',
    '}',
    '',
    'void stbExtCheckTriggers() {',
    '  bool stopA1 = false;',
    '  bool stopA2 = false;',
    '  stbExtEvaluateTriggers(stopA1, stopA2);',
    '  if (stopA1) {',
    '    stbExtStopMotor("A1");',
    '  }',
    '  if (stopA2) {',
    '    stbExtStopMotor("A2");',
    '  }',
    '}',
    '',
    'float stbExtSpeedPercentToRpm(int speedPercent) {',
    '  return (stbExtMotorConfig.maxRpm * speedPercent) / 100.0f;',
    '}',
    '',
    'float stbExtGetCurrentMotorRpm(const String& motor) {',
    '  if (motor == "A1") {',
    '    return stbExtSpeedPercentToRpm(stbExtMotorA1.lastSpeedPercent);',
    '  }',
    '  if (motor == "A2") {',
    '    return stbExtSpeedPercentToRpm(stbExtMotorA2.lastSpeedPercent);',
    '  }',
    '  return (stbExtSpeedPercentToRpm(stbExtMotorA1.lastSpeedPercent) + stbExtSpeedPercentToRpm(stbExtMotorA2.lastSpeedPercent)) / 2.0f;',
    '}',
    '',
    'float stbExtGetCurrentMotorDistanceCm(const String& motor) {',
    '  if (motor == "A1") {',
    '    return stbExtTicksToCm(stbExtMotorA1.encoderTicks);',
    '  }',
    '  if (motor == "A2") {',
    '    return stbExtTicksToCm(stbExtMotorA2.encoderTicks);',
    '  }',
    '  return (stbExtTicksToCm(stbExtMotorA1.encoderTicks) + stbExtTicksToCm(stbExtMotorA2.encoderTicks)) / 2.0f;',
    '}',
    '',
    'void stbExtResetMotorDistance(const String& motor) {',
    '  noInterrupts();',
    '  if (motor == "A1") {',
    '    stbExtMotorA1.encoderTicks = 0;',
    '    stbExtMotorA1.distanceCm = 0.0f;',
    '    interrupts();',
    '    stbExtResetEncoderTracking();',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtMotorA2.encoderTicks = 0;',
    '    stbExtMotorA2.distanceCm = 0.0f;',
    '    interrupts();',
    '    stbExtResetEncoderTracking();',
    '    return;',
    '  }',
    '  stbExtMotorA1.encoderTicks = 0;',
    '  stbExtMotorA1.distanceCm = 0.0f;',
    '  stbExtMotorA2.encoderTicks = 0;',
    '  stbExtMotorA2.distanceCm = 0.0f;',
    '  interrupts();',
    '  stbExtResetEncoderTracking();',
    '}',
    '',
    'int stbExtGetStoredSpeedPercent(const String& motor) {',
    '  if (motor == "A1") {',
    '    return stbExtMotorA1.lastSpeedPercent;',
    '  }',
    '  if (motor == "A2") {',
    '    return stbExtMotorA2.lastSpeedPercent;',
    '  }',
    '  int a1Magnitude = abs(stbExtMotorA1.lastSpeedPercent);',
    '  int a2Magnitude = abs(stbExtMotorA2.lastSpeedPercent);',
    '  if (a1Magnitude == 0 && a2Magnitude == 0) {',
    '    return 0;',
    '  }',
    '  return a1Magnitude >= a2Magnitude ? stbExtMotorA1.lastSpeedPercent : stbExtMotorA2.lastSpeedPercent;',
    '}',
    '',
    'bool stbExtMotorsConfigured() {',
    '  return stbExtMotorConfig.configured;',
    '}',
    '',
    'bool stbExtIsMotorMoving(const String& motor) {',
    '  if (motor == "A1") {',
    '    return stbExtMotorA1.lastSpeedPercent != 0;',
    '  }',
    '  if (motor == "A2") {',
    '    return stbExtMotorA2.lastSpeedPercent != 0;',
    '  }',
    '  return stbExtMotorA1.lastSpeedPercent != 0 || stbExtMotorA2.lastSpeedPercent != 0;',
    '}',
    '',
    'long stbExtGetMotorEncoderTicks(const String& motor) {',
    '  if (motor == "A1") {',
    '    return stbExtMotorA1.encoderTicks;',
    '  }',
    '  if (motor == "A2") {',
    '    return stbExtMotorA2.encoderTicks;',
    '  }',
    '  return (stbExtMotorA1.encoderTicks + stbExtMotorA2.encoderTicks) / 2;',
    '}',
    '',
    'int stbExtSpeedPercentToPwm(int speedPercent) {',
    '  int magnitude = abs(speedPercent);',
    '  return map(magnitude, 0, 100, 0, 255);',
    '}',
    '',
    'void stbExtDrivePins(uint8_t pinForward, uint8_t pinReverse, int speedPercent) {',
    '  int pwmValue = stbExtSpeedPercentToPwm(speedPercent);',
    '  if (speedPercent > 0) {',
    '    analogWrite(pinForward, pwmValue);',
    '    digitalWrite(pinReverse, LOW);',
    '    return;',
    '  }',
    '  if (speedPercent < 0) {',
    '    digitalWrite(pinForward, LOW);',
    '    analogWrite(pinReverse, pwmValue);',
    '    return;',
    '  }',
    '  digitalWrite(pinForward, LOW);',
    '  digitalWrite(pinReverse, LOW);',
    '}',
    '',
    'void stbExtRunMotor(const String& motor) {',
    '  if (motor == "A1") {',
    '    stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(stbExtMotorA1.lastSpeedPercent, stbExtInvertA1));',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(stbExtMotorA2.lastSpeedPercent, stbExtInvertA2));',
    '    return;',
    '  }',
    '  stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(stbExtMotorA1.lastSpeedPercent, stbExtInvertA1));',
    '  stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(stbExtMotorA2.lastSpeedPercent, stbExtInvertA2));',
    '}',
    '',
    'void stbExtReverseMotor(const String& motor) {',
    '  if (motor == "A1") {',
    '    stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(-abs(stbExtMotorA1.lastSpeedPercent), stbExtInvertA1));',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(-abs(stbExtMotorA2.lastSpeedPercent), stbExtInvertA2));',
    '    return;',
    '  }',
    '  stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(-abs(stbExtMotorA1.lastSpeedPercent), stbExtInvertA1));',
    '  stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(-abs(stbExtMotorA2.lastSpeedPercent), stbExtInvertA2));',
    '}',
    '',
    'void stbExtRunMotorWithSpeed(const String& motor, int speedPercent) {',
    '  int clamped = stbExtClampSpeedPercent(speedPercent);',
    '  if (motor == "A1") {',
    '    stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(clamped, stbExtInvertA1));',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(clamped, stbExtInvertA2));',
    '    return;',
    '  }',
    '  stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(clamped, stbExtInvertA1));',
    '  stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(clamped, stbExtInvertA2));',
    '}',
    '',
    'unsigned long stbExtDurationToMs(float value, const String& unit) {',
    '  float safeValue = value < 0 ? 0 : value;',
    '  if (unit == "SECONDS") {',
    '    return (unsigned long)(safeValue * 1000.0f);',
    '  }',
    '  return (unsigned long)(safeValue);',
    '}',
    '',
    'void stbExtMoveMotorDistance(const String& motor, float value, const String& unit, int speedPercent) {',
    '  int clampedSpeed = stbExtClampSpeedPercent(speedPercent);',
    '  int directionSign = value < 0 ? -1 : 1;',
    '  int commandSpeed = abs(clampedSpeed) * directionSign;',
    '  long startA1Ticks = stbExtMotorA1.encoderTicks;',
    '  long startA2Ticks = stbExtMotorA2.encoderTicks;',
    '  float targetTicks = stbExtTurnValueToTicks(value, unit);',
    '  bool useA1 = (motor == "A1" || motor == "BOTH");',
    '  bool useA2 = (motor == "A2" || motor == "BOTH");',
    '  bool doneA1 = !useA1;',
    '  bool doneA2 = !useA2;',
    '  if (targetTicks <= 0 || commandSpeed == 0) {',
    '    stbExtStopMotor(motor);',
    '    return;',
    '  }',
    '  stbExtResetEncoderTracking();',
    '  if (useA1) {',
    '    stbExtRunMotorWithSpeed("A1", commandSpeed);',
    '  }',
    '  if (useA2) {',
    '    stbExtRunMotorWithSpeed("A2", commandSpeed);',
    '  }',
    '  while (!doneA1 || !doneA2) {',
    '    bool stopA1 = false;',
    '    bool stopA2 = false;',
    '    stbExtEvaluateTriggers(stopA1, stopA2);',
    '    if (stopA1 && useA1 && !doneA1) {',
    '      stbExtStopMotor("A1");',
    '      doneA1 = true;',
    '    }',
    '    if (stopA2 && useA2 && !doneA2) {',
    '      stbExtStopMotor("A2");',
    '      doneA2 = true;',
    '    }',
    '    if (useA1 && !doneA1) {',
    '      stbExtSyncMotorDistance(stbExtMotorA1);',
    '      if ((float)labs(stbExtMotorA1.encoderTicks - startA1Ticks) >= targetTicks) {',
    '        stbExtStopMotor("A1");',
    '        doneA1 = true;',
    '      }',
    '    }',
    '    if (useA2 && !doneA2) {',
    '      stbExtSyncMotorDistance(stbExtMotorA2);',
    '      if ((float)labs(stbExtMotorA2.encoderTicks - startA2Ticks) >= targetTicks) {',
    '        stbExtStopMotor("A2");',
    '        doneA2 = true;',
    '      }',
    '    }',
    '    delay(1);',
    '  }',
    '}',
    '',
    'void stbExtTurnByAmount(const String& side, float value, const String& unit, int speedPercent) {',
    '  int clampedSpeed = abs(stbExtClampSpeedPercent(speedPercent));',
    '  int directionSign = value < 0 ? -1 : 1;',
    '  int a1Command = 0;',
    '  int a2Command = 0;',
    '  long startA1Ticks = stbExtMotorA1.encoderTicks;',
    '  long startA2Ticks = stbExtMotorA2.encoderTicks;',
    '  float targetTicks = stbExtDistanceValueToTicks(value, unit);',
    '  bool doneA1 = false;',
    '  bool doneA2 = false;',
    '  if (targetTicks <= 0 || clampedSpeed == 0) {',
    '    stbExtStopMotor("BOTH");',
    '    return;',
    '  }',
    '  if (side == "RIGHT") {',
    '    a1Command = clampedSpeed * directionSign;',
    '    a2Command = -clampedSpeed * directionSign;',
    '  } else {',
    '    a1Command = -clampedSpeed * directionSign;',
    '    a2Command = clampedSpeed * directionSign;',
    '  }',
    '  stbExtResetEncoderTracking();',
    '  stbExtRunMotorWithSpeed("A1", a1Command);',
    '  stbExtRunMotorWithSpeed("A2", a2Command);',
    '  while (!doneA1 || !doneA2) {',
    '    bool stopA1 = false;',
    '    bool stopA2 = false;',
    '    stbExtEvaluateTriggers(stopA1, stopA2);',
    '    if (stopA1 && !doneA1) {',
    '      stbExtStopMotor("A1");',
    '      doneA1 = true;',
    '    }',
    '    if (stopA2 && !doneA2) {',
    '      stbExtStopMotor("A2");',
    '      doneA2 = true;',
    '    }',
    '    if (!doneA1) {',
    '      stbExtSyncMotorDistance(stbExtMotorA1);',
    '      if ((float)labs(stbExtMotorA1.encoderTicks - startA1Ticks) >= targetTicks) {',
    '        stbExtStopMotor("A1");',
    '        doneA1 = true;',
    '      }',
    '    }',
    '    if (!doneA2) {',
    '      stbExtSyncMotorDistance(stbExtMotorA2);',
    '      if ((float)labs(stbExtMotorA2.encoderTicks - startA2Ticks) >= targetTicks) {',
    '        stbExtStopMotor("A2");',
    '        doneA2 = true;',
    '      }',
    '    }',
    '    delay(1);',
    '  }',
    '}',
    '',
    'void stbExtTurn(const String& side) {',
    '  int a1Magnitude = abs(stbExtMotorA1.lastSpeedPercent);',
    '  int a2Magnitude = abs(stbExtMotorA2.lastSpeedPercent);',
    '  if (side == "RIGHT") {',
    '    stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(a1Magnitude, stbExtInvertA1));',
    '    stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(-a2Magnitude, stbExtInvertA2));',
    '    return;',
    '  }',
    '  stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(-a1Magnitude, stbExtInvertA1));',
    '  stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(a2Magnitude, stbExtInvertA2));',
    '}',
    '',
    'void stbExtStopMotor(const String& motor) {',
    '  if (motor == "A1") {',
    '    digitalWrite(STB_EXT_A1_IN1, LOW);',
    '    digitalWrite(STB_EXT_A1_IN2, LOW);',
    '    return;',
    '  }',
    '  if (motor == "A2") {',
    '    digitalWrite(STB_EXT_A2_IN1, LOW);',
    '    digitalWrite(STB_EXT_A2_IN2, LOW);',
    '    return;',
    '  }',
    '  digitalWrite(STB_EXT_A1_IN1, LOW);',
    '  digitalWrite(STB_EXT_A1_IN2, LOW);',
    '  digitalWrite(STB_EXT_A2_IN1, LOW);',
    '  digitalWrite(STB_EXT_A2_IN2, LOW);',
    '}'
  ].join('\n');

  Blockly.Arduino.setups_['stb_extension_motor_pins'] = [
    'pinMode(STB_EXT_A1_IN1, OUTPUT);',
    'pinMode(STB_EXT_A1_IN2, OUTPUT);',
    'pinMode(STB_EXT_A2_IN1, OUTPUT);',
    'pinMode(STB_EXT_A2_IN2, OUTPUT);',
    'digitalWrite(STB_EXT_A1_IN1, LOW);',
    'digitalWrite(STB_EXT_A1_IN2, LOW);',
    'digitalWrite(STB_EXT_A2_IN1, LOW);',
    'digitalWrite(STB_EXT_A2_IN2, LOW);',
    'pinMode(STB_EXT_A1_ENC_A, INPUT_PULLUP);',
    'pinMode(STB_EXT_A1_ENC_B, INPUT_PULLUP);',
    'pinMode(STB_EXT_A2_ENC_A, INPUT_PULLUP);',
    'pinMode(STB_EXT_A2_ENC_B, INPUT_PULLUP);',
    'pinMode(STB_EXT_TRIGGER_0, INPUT);',
    'pinMode(STB_EXT_TRIGGER_1, INPUT);'
  ].join('\n');
    }

    function ensureSTBExtensionBase () {
Blockly.Arduino.includes_['include_servo'] = '#include <Servo.h>';
  Blockly.Arduino.definitions_['stb_extension_motor_base'] = [
    'struct STBExtMotorConfig { float wheelDiameterCm; float maxRpm; float trackWidthCm; bool configured; };',
    'struct STBExtMotorState { int lastSpeedPercent; int appliedSpeedPercent; volatile long encoderTicks; float distanceCm; float estimatedDistanceCm; unsigned long lastEstimateMs; };',
    'struct STBExtTriggerConfig { bool enabled; uint8_t pin; bool greaterThan; int threshold; uint8_t targetMask; };',
    'const uint8_t STB_EXT_A1_IN1 = 6;',
    'const uint8_t STB_EXT_A1_IN2 = 9;',
    'const uint8_t STB_EXT_A2_IN1 = 10;',
    'const uint8_t STB_EXT_A2_IN2 = 11;',
    'const uint8_t STB_EXT_A1_ENC_A = 2;',
    'const uint8_t STB_EXT_A1_ENC_B = 3;',
    'const uint8_t STB_EXT_A2_ENC_A = 4;',
    'const uint8_t STB_EXT_A2_ENC_B = 5;',
    'const uint8_t STB_EXT_TRIGGER_0 = A0;',
    'const uint8_t STB_EXT_TRIGGER_1 = A1;',
    'const float STB_EXT_DEFAULT_WHEEL_DIAMETER_CM = 6.5f;',
    'const float STB_EXT_DEFAULT_MAX_RPM = 120.0f;',
    'const float STB_EXT_DEFAULT_TRACK_WIDTH_CM = 14.0f;',
    'const float STB_EXT_PULSES_PER_REV = 4320.0f;',
    'const uint8_t STB_EXT_SERVO_A1_PIN = 2;',
    'const uint8_t STB_EXT_SERVO_A2_PIN = 3;',
    'const int STB_EXT_SERVO_STOP_US = 1500;',
    'const int STB_EXT_SERVO_MIN_US = 1000;',
    'const int STB_EXT_SERVO_MAX_US = 2000;',
    'enum STBExtMotorType { STB_EXT_MOTOR_DC = 0, STB_EXT_MOTOR_SERVO_360 = 1 };',
    'void stbExtSyncMotorDistance(STBExtMotorState& motorState);',
    'void stbExtUpdateServoEstimate(STBExtMotorState& motorState);',
    'void stbExtSetAppliedSpeed(STBExtMotorState& motorState, int speedPercent);',
    'void stbExtSetMotorType(STBExtMotorType motorType);',
    'STBExtMotorType stbExtMotorType = STB_EXT_MOTOR_DC;',
    'Servo stbExtServoA1;',
    'Servo stbExtServoA2;',
    'bool stbExtServoA1Attached = false;',
    'bool stbExtServoA2Attached = false;',
    'int stbExtServoA1StopUs = STB_EXT_SERVO_STOP_US;',
    'int stbExtServoA2StopUs = STB_EXT_SERVO_STOP_US;',
    'int stbExtServoMinUs = STB_EXT_SERVO_MIN_US;',
    'int stbExtServoMaxUs = STB_EXT_SERVO_MAX_US;',
    'float stbExtServoDistanceCorrection = 1.0f;',
    'float stbExtServoTurnCorrection = 1.0f;',
    'STBExtMotorConfig stbExtMotorConfig = { STB_EXT_DEFAULT_WHEEL_DIAMETER_CM, STB_EXT_DEFAULT_MAX_RPM, STB_EXT_DEFAULT_TRACK_WIDTH_CM, false };',
    'STBExtMotorState stbExtMotorA1 = {0, 0, 0, 0.0f, 0.0f, 0UL};',
    'STBExtMotorState stbExtMotorA2 = {0, 0, 0, 0.0f, 0.0f, 0UL};',
    'STBExtTriggerConfig stbExtTriggers[2] = { {false, STB_EXT_TRIGGER_0, true, 500, 3}, {false, STB_EXT_TRIGGER_1, true, 500, 3} };',
    'bool stbExtInvertA1 = false;',
    'bool stbExtInvertA2 = false;',
    'volatile uint8_t stbExtPrevA1EncAB = 0;',
    'volatile uint8_t stbExtPrevA2EncAB = 0;',
    'float stbExtWheelCircumferenceCm() { return 3.1415926f * stbExtMotorConfig.wheelDiameterCm; }',
    'float stbExtTicksPerCm() { return STB_EXT_PULSES_PER_REV / stbExtWheelCircumferenceCm(); }',
    'int stbExtClampSpeedPercent(int speedPercent) { return constrain(speedPercent, -100, 100); }',
    'uint8_t stbExtMotorMaskFromName(const String& motor) { if (motor == "A1") { return 1; } if (motor == "A2") { return 2; } return 3; }',
    'float stbExtTicksToCm(long ticks) { return ticks / stbExtTicksPerCm(); }',
    'float stbExtDistanceValueToTicks(float value, const String& unit) { float magnitude = value < 0 ? -value : value; if (unit == "CM") { return magnitude * stbExtTicksPerCm(); } if (unit == "ROTATIONS") { return magnitude * STB_EXT_PULSES_PER_REV; } return (magnitude / 360.0f) * STB_EXT_PULSES_PER_REV; }',
    'float stbExtTurnValueToTicks(float value, const String& unit) { float magnitude = value < 0 ? -value : value; if (unit == "ROTATIONS") { return magnitude * STB_EXT_PULSES_PER_REV; } float arcCm = 3.1415926f * stbExtMotorConfig.trackWidthCm * (magnitude / 360.0f); return arcCm * stbExtTicksPerCm(); }',
    'int stbExtApplyDirection(int speedPercent, bool inverted) { return inverted ? -speedPercent : speedPercent; }',
    'uint8_t stbExtReadEncoderAB(uint8_t pinA, uint8_t pinB) { return static_cast<uint8_t>((digitalRead(pinA) << 1) | digitalRead(pinB)); }',
    'int8_t stbExtQuadratureDelta(uint8_t previousState, uint8_t currentState) { static const int8_t table[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0}; return table[((previousState & 0x03) << 2) | (currentState & 0x03)]; }',
    'void stbExtResetEncoderTracking() { noInterrupts(); stbExtPrevA1EncAB = stbExtReadEncoderAB(STB_EXT_A1_ENC_A, STB_EXT_A1_ENC_B); stbExtPrevA2EncAB = stbExtReadEncoderAB(STB_EXT_A2_ENC_A, STB_EXT_A2_ENC_B); interrupts(); }',
    'void stbExtSyncMotorDistance(STBExtMotorState& motorState) { motorState.distanceCm = stbExtTicksToCm(motorState.encoderTicks); }',
    'void stbExtHandleEncoderChange() { uint8_t currentA1 = stbExtReadEncoderAB(STB_EXT_A1_ENC_A, STB_EXT_A1_ENC_B); int8_t deltaA1 = stbExtQuadratureDelta(stbExtPrevA1EncAB, currentA1); if (deltaA1 != 0) { stbExtMotorA1.encoderTicks += deltaA1; stbExtPrevA1EncAB = currentA1; } uint8_t currentA2 = stbExtReadEncoderAB(STB_EXT_A2_ENC_A, STB_EXT_A2_ENC_B); int8_t deltaA2 = stbExtQuadratureDelta(stbExtPrevA2EncAB, currentA2); if (deltaA2 != 0) { stbExtMotorA2.encoderTicks += deltaA2; stbExtPrevA2EncAB = currentA2; } }',
    'void stbExtInitEncoderInterrupts() { stbExtResetEncoderTracking(); PCICR |= (1 << PCIE2); PCMSK2 |= (1 << PCINT18) | (1 << PCINT19) | (1 << PCINT20) | (1 << PCINT21); }',
    'ISR(PCINT2_vect) { stbExtHandleEncoderChange(); }',
    'int stbExtSpeedPercentToPwm(int speedPercent) { int magnitude = abs(speedPercent); return map(magnitude, 0, 100, 0, 255); }',
    'void stbExtDrivePins(uint8_t pinForward, uint8_t pinReverse, int speedPercent) { int pwmValue = stbExtSpeedPercentToPwm(speedPercent); if (speedPercent > 0) { analogWrite(pinForward, pwmValue); digitalWrite(pinReverse, LOW); return; } if (speedPercent < 0) { digitalWrite(pinForward, LOW); analogWrite(pinReverse, pwmValue); return; } digitalWrite(pinForward, LOW); digitalWrite(pinReverse, LOW); }',
    'void stbExtCheckTriggers();',
    'void stbExtUpdateServoEstimate(STBExtMotorState& motorState) { unsigned long now = millis(); if (motorState.lastEstimateMs == 0UL) { motorState.lastEstimateMs = now; return; } unsigned long elapsedMs = now - motorState.lastEstimateMs; motorState.lastEstimateMs = now; if (stbExtMotorType != STB_EXT_MOTOR_SERVO_360 || motorState.appliedSpeedPercent == 0) { return; } float rpm = stbExtMotorConfig.maxRpm * abs(motorState.appliedSpeedPercent) / 100.0f; float direction = motorState.appliedSpeedPercent < 0 ? -1.0f : 1.0f; motorState.estimatedDistanceCm += direction * stbExtWheelCircumferenceCm() * rpm * elapsedMs * stbExtServoDistanceCorrection / 60000.0f; }',
    'void stbExtSetAppliedSpeed(STBExtMotorState& motorState, int speedPercent) { stbExtUpdateServoEstimate(motorState); motorState.appliedSpeedPercent = stbExtClampSpeedPercent(speedPercent); }',
    'int stbExtServoPulseForSpeed(int speedPercent, int stopUs) { int clamped = stbExtClampSpeedPercent(speedPercent); int maxOffset = min(stbExtServoMaxUs - stopUs, stopUs - stbExtServoMinUs); if (clamped >= 0) { return map(clamped, 0, 100, stopUs, stopUs + maxOffset); } return map(clamped, -100, 0, stopUs - maxOffset, stopUs); }',
    'void stbExtEnsureServoAttached(const String& motor) { if (motor == "A1" && !stbExtServoA1Attached) { stbExtServoA1.attach(STB_EXT_SERVO_A1_PIN); stbExtServoA1.writeMicroseconds(stbExtServoA1StopUs); stbExtServoA1Attached = true; return; } if (motor == "A2" && !stbExtServoA2Attached) { stbExtServoA2.attach(STB_EXT_SERVO_A2_PIN); stbExtServoA2.writeMicroseconds(stbExtServoA2StopUs); stbExtServoA2Attached = true; } }',
    'void stbExtDriveServo(const String& motor, int speedPercent) { if (motor == "A1") { stbExtEnsureServoAttached("A1"); stbExtServoA1.writeMicroseconds(stbExtServoPulseForSpeed(speedPercent, stbExtServoA1StopUs)); return; } stbExtEnsureServoAttached("A2"); stbExtServoA2.writeMicroseconds(stbExtServoPulseForSpeed(speedPercent, stbExtServoA2StopUs)); }',
    'void stbExtDriveMotor(const String& motor, int speedPercent) { if (motor == "BOTH") { stbExtDriveMotor("A1", speedPercent); stbExtDriveMotor("A2", speedPercent); return; } bool inverted = motor == "A1" ? stbExtInvertA1 : stbExtInvertA2; int appliedSpeed = stbExtApplyDirection(stbExtClampSpeedPercent(speedPercent), inverted); STBExtMotorState& motorState = motor == "A1" ? stbExtMotorA1 : stbExtMotorA2; stbExtSetAppliedSpeed(motorState, appliedSpeed); if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtDriveServo(motor, appliedSpeed); return; } if (motor == "A1") { stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, appliedSpeed); return; } stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, appliedSpeed); }',
    'void stbExtStopMotor(const String& motor) { if (motor == "BOTH") { stbExtStopMotor("A1"); stbExtStopMotor("A2"); return; } STBExtMotorState& motorState = motor == "A1" ? stbExtMotorA1 : stbExtMotorA2; stbExtSetAppliedSpeed(motorState, 0); if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtEnsureServoAttached(motor); if (motor == "A1") { stbExtServoA1.writeMicroseconds(stbExtServoA1StopUs); stbExtServoA1.detach(); stbExtServoA1Attached = false; return; } stbExtServoA2.writeMicroseconds(stbExtServoA2StopUs); stbExtServoA2.detach(); stbExtServoA2Attached = false; return; } if (motor == "A1") { digitalWrite(STB_EXT_A1_IN1, LOW); digitalWrite(STB_EXT_A1_IN2, LOW); return; } digitalWrite(STB_EXT_A2_IN1, LOW); digitalWrite(STB_EXT_A2_IN2, LOW); }',
    'unsigned long stbExtServoDistanceDurationMs(float value, const String& unit, int speedPercent) { float magnitude = value < 0 ? -value : value; float rotations = unit == "CM" ? magnitude / stbExtWheelCircumferenceCm() : (unit == "ROTATIONS" ? magnitude : magnitude / 360.0f); float rpm = stbExtMotorConfig.maxRpm * abs(stbExtClampSpeedPercent(speedPercent)) / 100.0f; float correction = stbExtServoDistanceCorrection > 0.0f ? stbExtServoDistanceCorrection : 1.0f; if (rotations <= 0.0f || rpm <= 0.0f) { return 0UL; } return static_cast<unsigned long>((rotations * 60000.0f) / (rpm * correction)); }',
    'void stbExtMoveServoDistance(const String& motor, float value, const String& unit, int speedPercent) { int directionSign = value < 0 ? -1 : 1; int commandSpeed = abs(stbExtClampSpeedPercent(speedPercent)) * directionSign; unsigned long durationMs = stbExtServoDistanceDurationMs(value, unit, commandSpeed); if (durationMs == 0UL || commandSpeed == 0) { stbExtStopMotor(motor); return; } stbExtDriveMotor(motor, commandSpeed); for (unsigned long startMs = millis(); millis() - startMs < durationMs; delay(1)) { stbExtCheckTriggers(); } stbExtStopMotor(motor); }',
    'unsigned long stbExtServoTurnDurationMs(float value, const String& unit, int speedPercent) { float magnitude = value < 0 ? -value : value; float degrees = unit == "ROTATIONS" ? magnitude * 360.0f : magnitude; float wheelArcCm = 3.1415926f * stbExtMotorConfig.trackWidthCm * (degrees / 360.0f); return static_cast<unsigned long>(stbExtServoDistanceDurationMs(wheelArcCm, String("CM"), speedPercent) * stbExtServoTurnCorrection); }',
    'void stbExtTurnServo(const String& side, int speedPercent) { int magnitude = abs(stbExtClampSpeedPercent(speedPercent)); if (side == "RIGHT") { stbExtDriveMotor("A1", magnitude); stbExtDriveMotor("A2", -magnitude); return; } stbExtDriveMotor("A1", -magnitude); stbExtDriveMotor("A2", magnitude); }',
    'void stbExtTurnServoByAmount(const String& side, float value, const String& unit, int speedPercent) { int magnitude = abs(stbExtClampSpeedPercent(speedPercent)); unsigned long durationMs = stbExtServoTurnDurationMs(value, unit, magnitude); if (durationMs == 0UL || magnitude == 0) { stbExtStopMotor("BOTH"); return; } if (value < 0) { side = side == "RIGHT" ? String("LEFT") : String("RIGHT"); } stbExtTurnServo(side, magnitude); for (unsigned long startMs = millis(); millis() - startMs < durationMs; delay(1)) { stbExtCheckTriggers(); } stbExtStopMotor("BOTH"); }',
    'unsigned long stbExtDurationToMs(float value, const String& unit) { float safeValue = value < 0 ? 0 : value; if (unit == "SECONDS") { return (unsigned long)(safeValue * 1000.0f); } return (unsigned long)(safeValue); }'
  ].join('\n');

  Blockly.Arduino.setups_['stb_extension_motor_pins'] = [
    'pinMode(STB_EXT_A1_IN1, OUTPUT);',
    'pinMode(STB_EXT_A1_IN2, OUTPUT);',
    'pinMode(STB_EXT_A2_IN1, OUTPUT);',
    'pinMode(STB_EXT_A2_IN2, OUTPUT);',
    'digitalWrite(STB_EXT_A1_IN1, LOW);',
    'digitalWrite(STB_EXT_A1_IN2, LOW);',
    'digitalWrite(STB_EXT_A2_IN1, LOW);',
    'digitalWrite(STB_EXT_A2_IN2, LOW);',
    'pinMode(STB_EXT_A1_ENC_A, INPUT_PULLUP);',
    'pinMode(STB_EXT_A1_ENC_B, INPUT_PULLUP);',
    'pinMode(STB_EXT_A2_ENC_A, INPUT_PULLUP);',
    'pinMode(STB_EXT_A2_ENC_B, INPUT_PULLUP);',
    'stbExtInitEncoderInterrupts();',
    'pinMode(STB_EXT_TRIGGER_0, INPUT);',
    'pinMode(STB_EXT_TRIGGER_1, INPUT);'
  ].join('\n');
    }

    function ensureSTBExtensionConfigHelpers () {
ensureSTBExtensionBase();
  Blockly.Arduino.definitions_['stb_extension_motor_config'] = [
    'void stbExtConfigMotors(float wheelDiameterCm, float maxRpm, float trackWidthCm) { stbExtMotorConfig.wheelDiameterCm = wheelDiameterCm > 0 ? wheelDiameterCm : STB_EXT_DEFAULT_WHEEL_DIAMETER_CM; stbExtMotorConfig.maxRpm = maxRpm > 0 ? maxRpm : STB_EXT_DEFAULT_MAX_RPM; stbExtMotorConfig.trackWidthCm = trackWidthCm > 0 ? trackWidthCm : STB_EXT_DEFAULT_TRACK_WIDTH_CM; stbExtMotorConfig.configured = true; stbExtMotorA1.lastSpeedPercent = 0; stbExtMotorA2.lastSpeedPercent = 0; stbExtTriggers[0].enabled = false; stbExtTriggers[1].enabled = false; }',
    'void stbExtSetMotorType(STBExtMotorType motorType) { stbExtStopMotor("BOTH"); stbExtMotorType = motorType; if (motorType == STB_EXT_MOTOR_SERVO_360) { PCMSK2 &= ~((1 << PCINT18) | (1 << PCINT19) | (1 << PCINT20) | (1 << PCINT21)); return; } stbExtInitEncoderInterrupts(); }',
    'void stbExtConfigServo360(int stopA1Us, int stopA2Us, int minUs, int maxUs, float distanceCorrection, float turnCorrection) { stbExtServoA1StopUs = constrain(stopA1Us, 544, 2400); stbExtServoA2StopUs = constrain(stopA2Us, 544, 2400); stbExtServoMinUs = constrain(minUs, 544, stbExtServoA1StopUs); stbExtServoMaxUs = constrain(maxUs, stbExtServoA1StopUs, 2400); stbExtServoDistanceCorrection = distanceCorrection > 0.0f ? distanceCorrection : 1.0f; stbExtServoTurnCorrection = turnCorrection > 0.0f ? turnCorrection : 1.0f; if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtStopMotor("BOTH"); } }',
    'void stbExtTestServoPulse(const String& motor, int pulseUs) { if (stbExtMotorType != STB_EXT_MOTOR_SERVO_360) { return; } int pulse = constrain(pulseUs, stbExtServoMinUs, stbExtServoMaxUs); if (motor == "BOTH") { stbExtTestServoPulse("A1", pulse); stbExtTestServoPulse("A2", pulse); return; } stbExtEnsureServoAttached(motor); stbExtSetAppliedSpeed(motor == "A1" ? stbExtMotorA1 : stbExtMotorA2, 0); if (motor == "A1") { stbExtServoA1.writeMicroseconds(pulse); return; } stbExtServoA2.writeMicroseconds(pulse); }',
    'void stbExtSetMotorDirection(const String& motor, bool inverted) { if (motor == "A1") { stbExtInvertA1 = inverted; return; } if (motor == "A2") { stbExtInvertA2 = inverted; return; } }',
    'void stbExtSetStoredSpeed(const String& motor, int speedPercent) { int clamped = stbExtClampSpeedPercent(speedPercent); if (motor == "A1") { stbExtMotorA1.lastSpeedPercent = clamped; return; } if (motor == "A2") { stbExtMotorA2.lastSpeedPercent = clamped; return; } stbExtMotorA1.lastSpeedPercent = clamped; stbExtMotorA2.lastSpeedPercent = clamped; }',
    'bool stbExtMotorsConfigured() { return stbExtMotorConfig.configured; }'
  ].join('\n');
    }

    function ensureSTBExtensionTriggerHelpers () {
ensureSTBExtensionBase();
  Blockly.Arduino.definitions_['stb_extension_motor_triggers'] = [
    'void stbExtConfigureTrigger(uint8_t triggerIndex, bool greaterThan, int threshold, const String& targetMotor) { if (triggerIndex > 1) { return; } stbExtTriggers[triggerIndex].enabled = true; stbExtTriggers[triggerIndex].pin = triggerIndex == 0 ? STB_EXT_TRIGGER_0 : STB_EXT_TRIGGER_1; stbExtTriggers[triggerIndex].greaterThan = greaterThan; stbExtTriggers[triggerIndex].threshold = threshold; stbExtTriggers[triggerIndex].targetMask = stbExtMotorMaskFromName(targetMotor); }',
    'void stbExtDisableTrigger(uint8_t triggerIndex) { if (triggerIndex > 1) { return; } stbExtTriggers[triggerIndex].enabled = false; }',
    'void stbExtDisableAllTriggers() { stbExtTriggers[0].enabled = false; stbExtTriggers[1].enabled = false; }',
    'void stbExtEvaluateTriggers(bool& stopA1, bool& stopA2) { stopA1 = false; stopA2 = false; for (uint8_t i = 0; i < 2; i++) { if (!stbExtTriggers[i].enabled) { continue; } int reading = analogRead(stbExtTriggers[i].pin); bool matched = stbExtTriggers[i].greaterThan ? reading > stbExtTriggers[i].threshold : reading < stbExtTriggers[i].threshold; if (!matched) { continue; } if ((stbExtTriggers[i].targetMask & 1) != 0) { stopA1 = true; } if ((stbExtTriggers[i].targetMask & 2) != 0) { stopA2 = true; } } }',
    'void stbExtCheckTriggers() { bool stopA1 = false; bool stopA2 = false; stbExtEvaluateTriggers(stopA1, stopA2); if (stopA1) { stbExtStopMotor("A1"); } if (stopA2) { stbExtStopMotor("A2"); } }'
  ].join('\n');
    }

    function ensureSTBExtensionStatusHelpers () {
ensureSTBExtensionBase();
  Blockly.Arduino.definitions_['stb_extension_motor_status'] = [
    'float stbExtSpeedPercentToRpm(int speedPercent) { return (stbExtMotorConfig.maxRpm * speedPercent) / 100.0f; }',
    'float stbExtGetCurrentMotorRpm(const String& motor) { if (motor == "A1") { return stbExtSpeedPercentToRpm(stbExtMotorA1.appliedSpeedPercent); } if (motor == "A2") { return stbExtSpeedPercentToRpm(stbExtMotorA2.appliedSpeedPercent); } return (stbExtSpeedPercentToRpm(stbExtMotorA1.appliedSpeedPercent) + stbExtSpeedPercentToRpm(stbExtMotorA2.appliedSpeedPercent)) / 2.0f; }',
    'int stbExtGetAppliedSpeedPercent(const String& motor) { if (motor == "A1") { return stbExtMotorA1.appliedSpeedPercent; } if (motor == "A2") { return stbExtMotorA2.appliedSpeedPercent; } return (stbExtMotorA1.appliedSpeedPercent + stbExtMotorA2.appliedSpeedPercent) / 2; }',
    'float stbExtGetCurrentMotorDistanceCm(const String& motor) { if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtUpdateServoEstimate(stbExtMotorA1); stbExtUpdateServoEstimate(stbExtMotorA2); if (motor == "A1") { return stbExtMotorA1.estimatedDistanceCm; } if (motor == "A2") { return stbExtMotorA2.estimatedDistanceCm; } return (stbExtMotorA1.estimatedDistanceCm + stbExtMotorA2.estimatedDistanceCm) / 2.0f; } if (motor == "A1") { return stbExtTicksToCm(stbExtMotorA1.encoderTicks); } if (motor == "A2") { return stbExtTicksToCm(stbExtMotorA2.encoderTicks); } return (stbExtTicksToCm(stbExtMotorA1.encoderTicks) + stbExtTicksToCm(stbExtMotorA2.encoderTicks)) / 2.0f; }',
    'void stbExtResetMotorDistance(const String& motor) { stbExtUpdateServoEstimate(stbExtMotorA1); stbExtUpdateServoEstimate(stbExtMotorA2); noInterrupts(); if (motor == "A1") { stbExtMotorA1.encoderTicks = 0; stbExtMotorA1.distanceCm = 0.0f; stbExtMotorA1.estimatedDistanceCm = 0.0f; interrupts(); stbExtResetEncoderTracking(); return; } if (motor == "A2") { stbExtMotorA2.encoderTicks = 0; stbExtMotorA2.distanceCm = 0.0f; stbExtMotorA2.estimatedDistanceCm = 0.0f; interrupts(); stbExtResetEncoderTracking(); return; } stbExtMotorA1.encoderTicks = 0; stbExtMotorA1.distanceCm = 0.0f; stbExtMotorA1.estimatedDistanceCm = 0.0f; stbExtMotorA2.encoderTicks = 0; stbExtMotorA2.distanceCm = 0.0f; stbExtMotorA2.estimatedDistanceCm = 0.0f; interrupts(); stbExtResetEncoderTracking(); }',
    'int stbExtGetStoredSpeedPercent(const String& motor) { if (motor == "A1") { return stbExtMotorA1.lastSpeedPercent; } if (motor == "A2") { return stbExtMotorA2.lastSpeedPercent; } int a1Magnitude = abs(stbExtMotorA1.lastSpeedPercent); int a2Magnitude = abs(stbExtMotorA2.lastSpeedPercent); if (a1Magnitude == 0 && a2Magnitude == 0) { return 0; } return a1Magnitude >= a2Magnitude ? stbExtMotorA1.lastSpeedPercent : stbExtMotorA2.lastSpeedPercent; }',
    'bool stbExtIsMotorMoving(const String& motor) { if (motor == "A1") { return stbExtMotorA1.appliedSpeedPercent != 0; } if (motor == "A2") { return stbExtMotorA2.appliedSpeedPercent != 0; } return stbExtMotorA1.appliedSpeedPercent != 0 || stbExtMotorA2.appliedSpeedPercent != 0; }',
    'long stbExtGetMotorEncoderTicks(const String& motor) { if (motor == "A1") { return stbExtMotorA1.encoderTicks; } if (motor == "A2") { return stbExtMotorA2.encoderTicks; } return (stbExtMotorA1.encoderTicks + stbExtMotorA2.encoderTicks) / 2; }'
  ].join('\n');
    }

    function ensureSTBExtensionMoveHelpers () {
ensureSTBExtensionBase();
  Blockly.Arduino.definitions_['stb_extension_motor_move'] = [
    'void stbExtRunMotor(const String& motor) { if (motor == "A1") { stbExtDriveMotor("A1", stbExtMotorA1.lastSpeedPercent); return; } if (motor == "A2") { stbExtDriveMotor("A2", stbExtMotorA2.lastSpeedPercent); return; } stbExtDriveMotor("A1", stbExtMotorA1.lastSpeedPercent); stbExtDriveMotor("A2", stbExtMotorA2.lastSpeedPercent); }',
    'void stbExtReverseMotor(const String& motor) { if (motor == "A1") { stbExtDriveMotor("A1", -abs(stbExtMotorA1.lastSpeedPercent)); return; } if (motor == "A2") { stbExtDriveMotor("A2", -abs(stbExtMotorA2.lastSpeedPercent)); return; } stbExtDriveMotor("A1", -abs(stbExtMotorA1.lastSpeedPercent)); stbExtDriveMotor("A2", -abs(stbExtMotorA2.lastSpeedPercent)); }',
    'void stbExtRunMotorWithSpeed(const String& motor, int speedPercent) { int clamped = stbExtClampSpeedPercent(speedPercent); if (motor == "A1") { stbExtDriveMotor("A1", clamped); return; } if (motor == "A2") { stbExtDriveMotor("A2", clamped); return; } stbExtDriveMotor("A1", clamped); stbExtDriveMotor("A2", clamped); }'
  ].join('\n');
    }

    function ensureSTBExtensionDistanceHelpers () {
ensureSTBExtensionBase();
  ensureSTBExtensionMoveHelpers();
  ensureSTBExtensionTriggerHelpers();
  Blockly.Arduino.definitions_['stb_extension_motor_distance'] = 'void stbExtMoveMotorDistance(const String& motor, float value, const String& unit, int speedPercent) { if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtMoveServoDistance(motor, value, unit, speedPercent); return; } int clampedSpeed = stbExtClampSpeedPercent(speedPercent); int directionSign = value < 0 ? -1 : 1; int commandSpeed = abs(clampedSpeed) * directionSign; long startA1Ticks = stbExtMotorA1.encoderTicks; long startA2Ticks = stbExtMotorA2.encoderTicks; float targetTicks = stbExtDistanceValueToTicks(value, unit); bool useA1 = (motor == "A1" || motor == "BOTH"); bool useA2 = (motor == "A2" || motor == "BOTH"); bool doneA1 = !useA1; bool doneA2 = !useA2; if (targetTicks <= 0 || commandSpeed == 0) { stbExtStopMotor(motor); return; } stbExtResetEncoderTracking(); if (useA1) { stbExtRunMotorWithSpeed("A1", commandSpeed); } if (useA2) { stbExtRunMotorWithSpeed("A2", commandSpeed); } while (!doneA1 || !doneA2) { bool stopA1 = false; bool stopA2 = false; stbExtEvaluateTriggers(stopA1, stopA2); if (stopA1 && useA1 && !doneA1) { stbExtStopMotor("A1"); doneA1 = true; } if (stopA2 && useA2 && !doneA2) { stbExtStopMotor("A2"); doneA2 = true; } if (useA1 && !doneA1) { stbExtSyncMotorDistance(stbExtMotorA1); if ((float)labs(stbExtMotorA1.encoderTicks - startA1Ticks) >= targetTicks) { stbExtStopMotor("A1"); doneA1 = true; } } if (useA2 && !doneA2) { stbExtSyncMotorDistance(stbExtMotorA2); if ((float)labs(stbExtMotorA2.encoderTicks - startA2Ticks) >= targetTicks) { stbExtStopMotor("A2"); doneA2 = true; } } delay(1); } }';
    }

    function ensureSTBExtensionTurnHelpers () {
ensureSTBExtensionBase();
  ensureSTBExtensionMoveHelpers();
  ensureSTBExtensionTriggerHelpers();
  Blockly.Arduino.definitions_['stb_extension_motor_turn'] = [
    'void stbExtTurn(const String& side) { int a1Magnitude = abs(stbExtMotorA1.lastSpeedPercent); int a2Magnitude = abs(stbExtMotorA2.lastSpeedPercent); if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { int turnSpeed = a1Magnitude >= a2Magnitude ? a1Magnitude : a2Magnitude; stbExtTurnServo(side, turnSpeed); return; } if (side == "RIGHT") { stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(a1Magnitude, stbExtInvertA1)); stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(-a2Magnitude, stbExtInvertA2)); return; } stbExtDrivePins(STB_EXT_A1_IN1, STB_EXT_A1_IN2, stbExtApplyDirection(-a1Magnitude, stbExtInvertA1)); stbExtDrivePins(STB_EXT_A2_IN1, STB_EXT_A2_IN2, stbExtApplyDirection(a2Magnitude, stbExtInvertA2)); }',
    'void stbExtTurnByAmount(const String& side, float value, const String& unit, int speedPercent) { int clampedSpeed = abs(stbExtClampSpeedPercent(speedPercent)); if (stbExtMotorType == STB_EXT_MOTOR_SERVO_360) { stbExtTurnServoByAmount(side, value, unit, clampedSpeed); return; } int directionSign = value < 0 ? -1 : 1; int a1Command = 0; int a2Command = 0; long startA1Ticks = stbExtMotorA1.encoderTicks; long startA2Ticks = stbExtMotorA2.encoderTicks; float targetTicks = stbExtTurnValueToTicks(value, unit); bool doneA1 = false; bool doneA2 = false; if (targetTicks <= 0 || clampedSpeed == 0) { stbExtStopMotor("BOTH"); return; } if (side == "RIGHT") { a1Command = clampedSpeed * directionSign; a2Command = -clampedSpeed * directionSign; } else { a1Command = -clampedSpeed * directionSign; a2Command = clampedSpeed * directionSign; } stbExtResetEncoderTracking(); stbExtRunMotorWithSpeed("A1", a1Command); stbExtRunMotorWithSpeed("A2", a2Command); while (!doneA1 || !doneA2) { bool stopA1 = false; bool stopA2 = false; stbExtEvaluateTriggers(stopA1, stopA2); if (stopA1 && !doneA1) { stbExtStopMotor("A1"); doneA1 = true; } if (stopA2 && !doneA2) { stbExtStopMotor("A2"); doneA2 = true; } if (!doneA1) { stbExtSyncMotorDistance(stbExtMotorA1); if ((float)labs(stbExtMotorA1.encoderTicks - startA1Ticks) >= targetTicks) { stbExtStopMotor("A1"); doneA1 = true; } } if (!doneA2) { stbExtSyncMotorDistance(stbExtMotorA2); if ((float)labs(stbExtMotorA2.encoderTicks - startA2Ticks) >= targetTicks) { stbExtStopMotor("A2"); doneA2 = true; } } delay(1); } }'
  ].join('\n');
    }

    function ensureStbV2MegaRuntime () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaBase () {
ensureStbV2GyroBase();
  ensureStbV2GyroCalibrationHelpers();
  Blockly.Arduino.definitions_['stb_v2_runtime_base'] = [
    'struct STBV2BoardConfig { float wheelDiameterCm; float maxRpm; float trackWidthCm; bool initialized; };',
    'struct STBV2MotorState { bool enabled; bool configured; bool invertDirection; bool motionActive; bool busy; bool targetReached; bool fault; uint8_t sideRole; uint8_t currentState; int lastSpeedPercent; int appliedSpeedPercent; int16_t appliedPwm; int32_t encoderTicks; int32_t resetOffsetTicks; int32_t measuredRpmX100; uint16_t lastStopReason; uint8_t nodeIndex; uint8_t localIndex; unsigned long timedMoveStopAtMs; };',
    'struct STBV2NodeState { bool rxSynced; uint8_t rxIndex; uint8_t rxBuffer[16]; uint8_t lastAckTarget; uint8_t lastAckFlags; uint8_t lastErrorTarget; uint8_t lastErrorCode; uint8_t lastRxSequence; unsigned long lastStatusRequestMs; };',
    'const uint8_t STB_V2_NODE_COUNT = 2;',
    'const uint8_t STB_V2_MOTOR_COUNT = 4;',
    'const uint8_t STB_V2_CMD_HEARTBEAT = 0x01;',
    'const uint8_t STB_V2_CMD_CONFIG_NODE = 0x10;',
    'const uint8_t STB_V2_CMD_CONFIG_MOTOR = 0x11;',
    'const uint8_t STB_V2_CMD_PREPARE_MOVE = 0x20;',
    'const uint8_t STB_V2_CMD_GO = 0x21;',
    'const uint8_t STB_V2_CMD_SET_BIAS = 0x22;',
    'const uint8_t STB_V2_CMD_STOP = 0x23;',
    'const uint8_t STB_V2_CMD_STOP_ALL = 0x25;',
    'const uint8_t STB_V2_CMD_GET_STATUS = 0x24;',
    'const uint8_t STB_V2_CMD_STATUS = 0x80;',
    'const uint8_t STB_V2_CMD_ACK = 0x82;',
    'const uint8_t STB_V2_CMD_ERROR = 0xE0;',
    'const uint8_t STB_V2_STATE_IDLE = 0;',
    'const uint8_t STB_V2_STATE_ARMED = 1;',
    'const uint8_t STB_V2_STATE_RUNNING = 2;',
    'const uint8_t STB_V2_STATE_DONE = 3;',
    'const uint8_t STB_V2_STATE_FAULT = 4;',
    'const uint8_t STB_V2_SIDE_NONE = 0;',
    'const uint8_t STB_V2_SIDE_LEFT = 1;',
    'const uint8_t STB_V2_SIDE_RIGHT = 2;',
    'const float STB_V2_DEFAULT_WHEEL_DIAMETER_CM = 6.5f;',
    'const float STB_V2_DEFAULT_MAX_RPM = 120.0f;',
    'const float STB_V2_DEFAULT_TRACK_WIDTH_CM = 14.0f;',
    'const unsigned long STB_V2_HEARTBEAT_INTERVAL_MS = 250UL;',
    'const unsigned long STB_V2_STATUS_POLL_INTERVAL_MS = 30UL;',
    'const unsigned long STB_V2_MOTION_GYRO_ENGAGE_DELAY_MS = 35UL;',
    'const unsigned long STB_V2_GYRO_SUPERVISOR_INTERVAL_MS = 20UL;',
    'const unsigned long STB_V2_TURN_SETTLE_MS = 60UL;',
    'const float STB_V2_MOTION_GYRO_KP = 3.5f;',
    'const float STB_V2_MOTION_GYRO_KD = 0.70f;',
    'const float STB_V2_MOTION_GYRO_KI = 0.15f;',
    'const float STB_V2_MOTION_GYRO_INTEGRAL_LIMIT = 12.0f;',
    'const float STB_V2_MOTION_GYRO_DEADBAND_DEG = 0.25f;',
    'const float STB_V2_MOTION_GYRO_EXIT_DEADBAND_DEG = 0.12f;',
    'const float STB_V2_MOTION_GYRO_EXIT_RATE_DEG_S = 1.2f;',
    'const float STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG = 2.2f;',
    'const float STB_V2_MOTION_GYRO_STRONG_CORRECTION_MAX_DEG = 5.0f;',
    'const float STB_V2_MOTION_GYRO_STRONG_GAIN_MAX = 1.25f;',
    'const float STB_V2_MOTION_GYRO_STRONG_BIAS_MAX = 1.10f;',
    'const unsigned long STB_V2_MOTION_START_SOFTEN_MS = 160UL;',
    'const int STB_V2_MOTION_START_SOFTEN_MAX_BIAS_X10 = 120;',
    'const float STB_V2_GYRO_SIDE_LOCK_MIN_ANGLE_DEG = 0.5f;',
    'const uint8_t STB_V2_GYRO_SIDE_LOCK_CONFIRM_SAMPLES = 2;',
    'const float STB_V2_GYRO_ANGLE_FILTER_ALPHA = 0.48f;',
    'const float STB_V2_GYRO_RATE_FILTER_ALPHA = 0.32f;',
    'const unsigned long STB_V2_GYRO_SIDE_LOCK_WINDOW_MS = 1000UL;',
    'const int STB_V2_MOTION_GYRO_BIAS_SLEW_X10 = 30;',
    'const int STB_V2_MOTION_GYRO_RELEASE_SLEW_X10 = 90;',
    'const int STB_V2_MOTION_GYRO_TRIM_MAX_BIAS_X10 = 200;',
    'const int STB_V2_MOTION_GYRO_MIN_BOOST_X10 = 60;',
    'const int STB_V2_MOTION_GYRO_SATURATION_PWM = 245;',
    'const float STB_V2_MOTION_GYRO_MIN_CORRECTION_RPM = 2.5f;',
    'const float STB_V2_MOTION_GYRO_MAX_CORRECTION_RPM = 12.0f;',
    'const float STB_V2_MOTION_GYRO_NEAR_CENTER_MAX_RPM = 3.5f;',
    'const float STB_V2_MOTION_GYRO_MID_BAND_MAX_RPM = 7.0f;',
    'const float STB_V2_MOTION_GYRO_CENTER_COAST_DEG = 0.55f;',
    'const float STB_V2_MOTION_GYRO_LEFT_TRIM_SCALE = 1.15f;',
    'const float STB_V2_MOTION_GYRO_RIGHT_TRIM_SCALE = 1.15f;',
    'const int STB_V2_MOTION_GYRO_LEFT_TRIM_MAX_X10 = 230;',
    'const int STB_V2_MOTION_GYRO_RIGHT_TRIM_MAX_X10 = 230;',
    'const int STB_V2_MOTION_GYRO_NEGATIVE_TRIM_MAX_X10 = 200;',
    'const int STB_V2_MOTION_GYRO_UNLEARNED_MAX_BOOST_X10 = 100;',
    'const float STB_V2_MOTION_GYRO_TRIM_MIN_RPM = 45.0f;',
    'const float STB_V2_MOTION_GYRO_TRIM_MIN_REDUCTION_RPM = 4.0f;',
    'const float STB_V2_MOTION_GYRO_TRIM_MAX_REDUCTION_RPM = 12.0f;',
    'const float STB_V2_MOTION_GYRO_CONTROL_LOOKAHEAD_S = 0.20f;',
    'const float STB_V2_MOTION_GYRO_RELEASE_LOOKAHEAD_S = 0.38f;',
    'const float STB_V2_MOTION_GYRO_RELEASE_MIN_ANGLE_DEG = 0.70f;',
    'const float STB_V2_MOTION_GYRO_RELEASE_MAX_ANGLE_DEG = 5.0f;',
    'const float STB_V2_MOTION_GYRO_RELEASE_MIN_RATE_DEG_S = 1.5f;',
    'const float STB_V2_MOTION_GYRO_REENGAGE_ANGLE_DEG = 1.8f;',
    'const float STB_V2_MOTION_GYRO_REENGAGE_RATE_SCALE = 0.18f;',
    'const float STB_V2_MOTION_GYRO_REENGAGE_MAX_ANGLE_DEG = 2.6f;',
    'const float STB_V2_MOTION_GYRO_TARGET_BAND_DEG = 3.0f;',
    'const unsigned long STB_V2_MOTION_GYRO_RELEASE_COAST_MS = 160UL;',
    'const unsigned long STB_V2_MOTION_GYRO_ACTION_HOLD_MS = 320UL;',
    'const uint8_t STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES = 2;',
    'const unsigned long STB_V2_MOTION_GYRO_SATURATION_CONFIRM_MS = 350UL;',
    'const unsigned long STB_V2_MOTION_GYRO_POLARITY_LEARN_MS = 180UL;',
    'const float STB_V2_MOTION_GYRO_POLARITY_MIN_ERROR_DEG = 0.7f;',
    'const float STB_V2_MOTION_GYRO_POLARITY_GROWTH_DEG = 0.25f;',
    'const float STB_V2_TURN_GYRO_TOLERANCE_DEG = 2.0f;',
    'const unsigned long STB_V2_TURN_GYRO_STALL_CANCEL_MS = 1000UL;',
    'const float STB_V2_TURN_GYRO_STALL_MIN_PROGRESS_DEG = 0.45f;',
    'const bool STB_V2_DEBUG_MOTION = true;',
    'const bool STB_V2_DEBUG_OSCILLATION = true;',
    'const bool STB_V2_PROFILE_MOTION = true;',
    'const bool STB_V2_ENABLE_FINAL_HEADING_CORRECTION = false;',
    'const int8_t STB_V2_GYRO_BIAS_POLARITY = -1;',
    'const int8_t STB_V2_GYRO_ACTION_NONE = 0;',
    'const int8_t STB_V2_GYRO_ACTION_BOOST_LEFT = 1;',
    'const int8_t STB_V2_GYRO_ACTION_BOOST_RIGHT = 2;',
    'const int8_t STB_V2_GYRO_ACTION_TRIM_LEFT = -1;',
    'const int8_t STB_V2_GYRO_ACTION_TRIM_RIGHT = -2;',
    '#ifndef STB_V2_ENCODER_TICKS_PER_REV',
    '#define STB_V2_ENCODER_TICKS_PER_REV 4320.0f',
    '#endif',
    'STBV2BoardConfig stbV2BoardConfig = { STB_V2_DEFAULT_WHEEL_DIAMETER_CM, STB_V2_DEFAULT_MAX_RPM, STB_V2_DEFAULT_TRACK_WIDTH_CM, false };',
    'STBV2MotorState stbV2Motors[STB_V2_MOTOR_COUNT];',
    'STBV2NodeState stbV2Nodes[STB_V2_NODE_COUNT];',
    'unsigned long stbV2LastHeartbeatMs = 0UL;',
    'unsigned long stbV2LastStatusPollMs = 0UL;',
    'uint8_t stbV2StatusPollNode = 0;',
    'bool stbV2MotionGyroAssist = false;',
    'String stbV2MotionGyroOrientation = "HORIZONTAL";',
    'bool stbV2GyroOrientDebugPrinted = false;',
    'bool stbV2MotionContinuousActive = false;',
    'bool stbV2MotionDistanceActive = false;',
    'bool stbV2MotionReverse = false;',
    'unsigned long stbV2MotionStartMs = 0UL;',
    'bool stbV2MotionIsTurn = false;',
    'float stbV2MotionTargetDistanceCm = 0.0f;',
    'int stbV2MotionLeftBaseSpeedPercent = 0;',
    'int stbV2MotionRightBaseSpeedPercent = 0;',
    'int stbV2MotionLeftCalibrationPercent = 100;',
    'int stbV2MotionRightCalibrationPercent = 100;',
    'uint8_t stbV2GyroAdjustSide = STB_V2_SIDE_NONE;',
    'uint8_t stbV2GyroAdjustSideCandidate = STB_V2_SIDE_NONE;',
    'uint8_t stbV2GyroAdjustSideCandidateCount = 0;',
    'unsigned long stbV2GyroAdjustSidePendingSinceMs = 0UL;',
    'unsigned long stbV2LastGyroSupervisorMs = 0UL;',
    'float stbV2GyroTargetYaw = 0.0f;',
    'float stbV2LastGyroAngle = 0.0f;',
    'float stbV2GyroFilteredAngle = 0.0f;',
    'float stbV2GyroFilteredRate = 0.0f;',
    'float stbV2GyroIntegral = 0.0f;',
    'int stbV2GyroAppliedLeftBiasX10 = 0;',
    'int stbV2GyroAppliedRightBiasX10 = 0;',
    'int stbV2LastLeftBiasX10 = 0;',
    'int stbV2LastRightBiasX10 = 0;',
    'int8_t stbV2GyroCorrectionPolarity = 1;',
    'bool stbV2GyroPolarityLocked = false;',
    'bool stbV2GyroPolarityLearned = false;',
    'float stbV2GyroPolarityProbeStartAbsError = 0.0f;',
    'unsigned long stbV2GyroPolarityProbeStartMs = 0UL;',
    'int8_t stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE;',
    'int8_t stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE;',
    'uint8_t stbV2GyroCandidateActionCount = 0;',
    'unsigned long stbV2GyroActionSinceMs = 0UL;',
    'int8_t stbV2GyroCorrectionDirection = 0;',
    'unsigned long stbV2GyroSaturationSinceMs = 0UL;',
    'unsigned long stbV2GyroReleaseUntilMs = 0UL;',
    'bool stbV2GyroCorrectionEngaged = false;',
    'bool stbV2StartDelayEnabled = false;',
    'uint8_t stbV2StartDelaySide = STB_V2_SIDE_NONE;',
    'unsigned long stbV2StartDelayMs = 10UL;',
    'uint8_t stbV2Checksum(const uint8_t *data) { uint8_t sum = 0; for (uint8_t i = 0; i < 15; ++i) { sum = static_cast<uint8_t>(sum + data[i]); } return sum; }',
    'void stbV2WriteI32(uint8_t *data, uint8_t offset, int32_t value) { data[offset] = static_cast<uint8_t>(value & 0xFF); data[offset + 1] = static_cast<uint8_t>((value >> 8) & 0xFF); data[offset + 2] = static_cast<uint8_t>((value >> 16) & 0xFF); data[offset + 3] = static_cast<uint8_t>((value >> 24) & 0xFF); }',
    'void stbV2WriteU16(uint8_t *data, uint8_t offset, uint16_t value) { data[offset] = static_cast<uint8_t>(value & 0xFF); data[offset + 1] = static_cast<uint8_t>((value >> 8) & 0xFF); }',
    'int32_t stbV2ReadI32(const uint8_t *data, uint8_t offset) { return static_cast<int32_t>((static_cast<uint32_t>(data[offset]) << 0) | (static_cast<uint32_t>(data[offset + 1]) << 8) | (static_cast<uint32_t>(data[offset + 2]) << 16) | (static_cast<uint32_t>(data[offset + 3]) << 24)); }',
    'uint16_t stbV2ReadU16(const uint8_t *data, uint8_t offset) { return static_cast<uint16_t>((static_cast<uint16_t>(data[offset]) << 0) | (static_cast<uint16_t>(data[offset + 1]) << 8)); }',
    'const char* stbV2MotorName(uint8_t motorIndex) { switch (motorIndex) { case 0: return "A1"; case 1: return "A2"; case 2: return "B3"; case 3: return "B4"; default: return "?"; } }',
    'void stbV2DebugMotionLine(const String& tag, const String& msg) { if (!STB_V2_DEBUG_MOTION) return; Serial.print("DBG,tag="); Serial.print(tag); Serial.print(",msg="); Serial.println(msg); }',
    'void stbV2ProfileMotionLine(const String& phase, unsigned long durationMs) { if (!STB_V2_PROFILE_MOTION) return; Serial.print("PROFILE,phase="); Serial.print(phase); Serial.print(",ms="); Serial.println(durationMs); }',
    'void stbV2DebugMotorSnapshot(const String& tag, uint8_t motorIndex) { if (!STB_V2_DEBUG_MOTION || motorIndex >= STB_V2_MOTOR_COUNT) return; STBV2MotorState &motor = stbV2Motors[motorIndex]; Serial.print("MOTOR,tag="); Serial.print(tag); Serial.print(",name="); Serial.print(stbV2MotorName(motorIndex)); Serial.print(",node="); Serial.print(motor.nodeIndex); Serial.print(",local="); Serial.print(motor.localIndex); Serial.print(",side="); Serial.print(motor.sideRole); Serial.print(",state="); Serial.print(motor.currentState); Serial.print(",busy="); Serial.print(motor.busy ? 1 : 0); Serial.print(",active="); Serial.print(motor.motionActive ? 1 : 0); Serial.print(",spd="); Serial.print(motor.appliedSpeedPercent); Serial.print(",pwm="); Serial.print(motor.appliedPwm); Serial.print(",rpm="); Serial.print(static_cast<float>(motor.measuredRpmX100) / 100.0f, 1); Serial.print(",ticks="); Serial.println(motor.encoderTicks); }',
    'void stbV2DebugGyroMove(const String& phase, unsigned long now, float angle, float rate, float error, float correction, int leftBiasX10, int rightBiasX10, int8_t leftIdx, int8_t rightIdx) { (void)phase; (void)now; (void)angle; (void)rate; (void)error; (void)correction; (void)leftBiasX10; (void)rightBiasX10; (void)leftIdx; (void)rightIdx; }',
    'HardwareSerial& stbV2PortForNode(uint8_t nodeIndex) { return nodeIndex == 0 ? Serial1 : Serial3; }',
    'void stbV2SendFrame(uint8_t nodeIndex, uint8_t cmd, uint8_t target, uint8_t flags, int32_t value1, int32_t value2, uint16_t value3, uint8_t extraByte) { uint8_t frame[16] = {0}; frame[0] = 0xAA; frame[1] = cmd; frame[2] = target; frame[3] = flags; stbV2WriteI32(frame, 4, value1); stbV2WriteI32(frame, 8, value2); stbV2WriteU16(frame, 12, value3); frame[14] = extraByte; frame[15] = stbV2Checksum(frame); stbV2PortForNode(nodeIndex).write(frame, 16); }',
    'int8_t stbV2MotorIndexFromNodeLocal(uint8_t nodeIndex, uint8_t localIndex) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2Motors[i].nodeIndex == nodeIndex && stbV2Motors[i].localIndex == localIndex) { return static_cast<int8_t>(i); } } return -1; }',
    'void stbV2HandleStatus(uint8_t nodeIndex, const uint8_t *frame) { if (frame[2] == 0xFF) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2Motors[i].nodeIndex != nodeIndex) continue; stbV2Motors[i].fault = true; stbV2Motors[i].busy = false; stbV2Motors[i].motionActive = false; stbV2Motors[i].currentState = STB_V2_STATE_FAULT; stbV2Motors[i].lastStopReason = STB_V2_STATE_FAULT; stbV2Motors[i].appliedSpeedPercent = 0; stbV2Motors[i].appliedPwm = 0; if (STB_V2_DEBUG_MOTION) stbV2DebugMotorSnapshot(String("FAULT"), i); } return; } int8_t motorIndex = stbV2MotorIndexFromNodeLocal(nodeIndex, frame[2]); if (motorIndex < 0) return; STBV2MotorState &motor = stbV2Motors[motorIndex]; uint8_t previousState = motor.currentState; motor.currentState = frame[3]; motor.encoderTicks = stbV2ReadI32(frame, 4); motor.measuredRpmX100 = stbV2ReadI32(frame, 8); motor.appliedPwm = static_cast<int16_t>(stbV2ReadU16(frame, 12)); motor.fault = motor.currentState == STB_V2_STATE_FAULT; motor.targetReached = motor.currentState == STB_V2_STATE_DONE; motor.busy = motor.currentState == STB_V2_STATE_ARMED || motor.currentState == STB_V2_STATE_RUNNING; motor.motionActive = motor.busy; if (!motor.busy) { motor.appliedSpeedPercent = 0; motor.timedMoveStopAtMs = 0UL; motor.lastStopReason = motor.currentState; } if (STB_V2_DEBUG_MOTION && previousState != motor.currentState) stbV2DebugMotorSnapshot(String("STATE"), static_cast<uint8_t>(motorIndex)); }',
    'void stbV2HandleAck(uint8_t nodeIndex, const uint8_t *frame) { stbV2Nodes[nodeIndex].lastAckTarget = frame[2]; stbV2Nodes[nodeIndex].lastAckFlags = frame[3]; }',
    'void stbV2HandleError(uint8_t nodeIndex, const uint8_t *frame) { stbV2Nodes[nodeIndex].lastErrorTarget = frame[2]; stbV2Nodes[nodeIndex].lastErrorCode = frame[3]; }',
    'void stbV2HandleFrame(uint8_t nodeIndex, const uint8_t *frame) { stbV2Nodes[nodeIndex].lastRxSequence = frame[14]; switch (frame[1]) { case STB_V2_CMD_STATUS: stbV2HandleStatus(nodeIndex, frame); break; case STB_V2_CMD_ACK: stbV2HandleAck(nodeIndex, frame); break; case STB_V2_CMD_ERROR: stbV2HandleError(nodeIndex, frame); break; } }',
    'void stbV2PumpSerial(uint8_t nodeIndex) { HardwareSerial &port = stbV2PortForNode(nodeIndex); STBV2NodeState &node = stbV2Nodes[nodeIndex]; while (port.available() > 0) { uint8_t incoming = static_cast<uint8_t>(port.read()); if (node.rxIndex == 0) { if (incoming != 0xAA) continue; node.rxBuffer[node.rxIndex++] = incoming; node.rxSynced = true; continue; } if (incoming == 0xAA && node.rxIndex != 0) { node.rxBuffer[0] = incoming; node.rxIndex = 1; node.rxSynced = true; continue; } node.rxBuffer[node.rxIndex++] = incoming; if (node.rxIndex < 16) continue; node.rxIndex = 0; if (stbV2Checksum(node.rxBuffer) != node.rxBuffer[15]) continue; stbV2HandleFrame(nodeIndex, node.rxBuffer); } }',
    'void stbV2InitMotorMap() { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { stbV2Motors[i].enabled = false; stbV2Motors[i].configured = false; stbV2Motors[i].invertDirection = false; stbV2Motors[i].motionActive = false; stbV2Motors[i].busy = false; stbV2Motors[i].targetReached = false; stbV2Motors[i].fault = false; stbV2Motors[i].sideRole = STB_V2_SIDE_NONE; stbV2Motors[i].currentState = STB_V2_STATE_IDLE; stbV2Motors[i].lastSpeedPercent = 100; stbV2Motors[i].appliedSpeedPercent = 0; stbV2Motors[i].appliedPwm = 0; stbV2Motors[i].encoderTicks = 0; stbV2Motors[i].resetOffsetTicks = 0; stbV2Motors[i].measuredRpmX100 = 0; stbV2Motors[i].lastStopReason = 0; stbV2Motors[i].timedMoveStopAtMs = 0UL; } stbV2Motors[0].nodeIndex = 0; stbV2Motors[0].localIndex = 0; stbV2Motors[1].nodeIndex = 0; stbV2Motors[1].localIndex = 1; stbV2Motors[2].nodeIndex = 1; stbV2Motors[2].localIndex = 0; stbV2Motors[3].nodeIndex = 1; stbV2Motors[3].localIndex = 1; for (uint8_t i = 0; i < STB_V2_NODE_COUNT; ++i) { stbV2Nodes[i].rxSynced = false; stbV2Nodes[i].rxIndex = 0; for (uint8_t j = 0; j < 16; ++j) { stbV2Nodes[i].rxBuffer[j] = 0; } stbV2Nodes[i].lastAckTarget = 0; stbV2Nodes[i].lastAckFlags = 0; stbV2Nodes[i].lastErrorTarget = 0; stbV2Nodes[i].lastErrorCode = 0; stbV2Nodes[i].lastRxSequence = 0; stbV2Nodes[i].lastStatusRequestMs = 0UL; } }',
    'void stbV2RequestStatus(uint8_t nodeIndex, uint8_t target) { stbV2SendFrame(nodeIndex, STB_V2_CMD_GET_STATUS, target, 0, 0, 0, 0, 0); stbV2Nodes[nodeIndex].lastStatusRequestMs = millis(); }',
    'void stbV2InitRuntime() { if (stbV2BoardConfig.initialized) return; Serial.begin(115200); Serial1.begin(115200); Serial3.begin(115200); delay(300); stbV2InitMotorMap(); stbV2SendFrame(0, STB_V2_CMD_CONFIG_NODE, 0xFF, 0, 0, 0, 0, 0); stbV2SendFrame(1, STB_V2_CMD_CONFIG_NODE, 0xFF, 0, 0, 0, 0, 0); stbV2BoardConfig.initialized = true; stbV2LastHeartbeatMs = millis(); stbV2LastStatusPollMs = millis(); }',
    'float stbV2WheelCircumferenceCm() { return stbV2BoardConfig.wheelDiameterCm * 3.1415926f; }',
    'float stbV2TicksToCm(int32_t ticks) { return (fabsf(static_cast<float>(ticks)) * stbV2WheelCircumferenceCm()) / STB_V2_ENCODER_TICKS_PER_REV; }',
    'int32_t stbV2CmToTicks(float cm) { return lroundf((fabsf(cm) / stbV2WheelCircumferenceCm()) * STB_V2_ENCODER_TICKS_PER_REV); }',
    'float stbV2MotionProgressCm() { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (leftIdx < 0 || rightIdx < 0) return 0.0f; float leftCm = stbV2TicksToCm(stbV2Motors[leftIdx].encoderTicks - stbV2Motors[leftIdx].resetOffsetTicks); float rightCm = stbV2TicksToCm(stbV2Motors[rightIdx].encoderTicks - stbV2Motors[rightIdx].resetOffsetTicks); return (leftCm + rightCm) * 0.5f; }',

    'float stbV2WrapAngleDeg(float angleDeg) { while (angleDeg > 180.0f) angleDeg -= 360.0f; while (angleDeg < -180.0f) angleDeg += 360.0f; return angleDeg; }',
    'float stbV2SignedTurnProgressDeg() { float delta = stbV2WrapAngleDeg(stbV2Gyro.angleDeg - stbV2GyroTargetYaw); return delta; }',
    'int stbV2MotionTargetRpmFromPercent(int speedPercent) { float configuredMaxRpm = stbV2BoardConfig.maxRpm; return static_cast<int>(constrain(roundf((constrain(abs(speedPercent), 0, 100) / 100.0f) * configuredMaxRpm), 0.0f, configuredMaxRpm)); }',
    'int8_t stbV2SelectorToSingleMotorIndex(const String& selector) { if (selector == "A1") return 0; if (selector == "A2") return 1; if (selector == "B3") return 2; if (selector == "B4") return 3; return -1; }',
    'bool stbV2MotorInMotionGroup(uint8_t motorIndex) { return stbV2Motors[motorIndex].sideRole == STB_V2_SIDE_LEFT || stbV2Motors[motorIndex].sideRole == STB_V2_SIDE_RIGHT; }',
    'bool stbV2SelectorMatchesMotor(const String& selector, uint8_t motorIndex) { if (selector == "ALL") return true; if (selector == "MOTION") return stbV2MotorInMotionGroup(motorIndex); int8_t single = stbV2SelectorToSingleMotorIndex(selector); return single >= 0 && static_cast<uint8_t>(single) == motorIndex; }',
    'int8_t stbV2FindMotorBySide(uint8_t sideRole) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2Motors[i].configured && stbV2Motors[i].enabled && stbV2Motors[i].sideRole == sideRole) return static_cast<int8_t>(i); } return -1; }',
    'bool stbV2HasMotionPair() { return stbV2FindMotorBySide(STB_V2_SIDE_LEFT) >= 0 && stbV2FindMotorBySide(STB_V2_SIDE_RIGHT) >= 0; }',
    'void stbV2SendConfigMotor(uint8_t motorIndex) { STBV2MotorState &motor = stbV2Motors[motorIndex]; uint8_t flags = 0; if (motor.enabled) flags |= 0x01; if (motor.invertDirection) flags |= 0x02; stbV2SendFrame(motor.nodeIndex, STB_V2_CMD_CONFIG_MOTOR, motor.localIndex, flags, 0, 0, 0, 0); }',
    'void stbV2SetBoardDefaults(float wheelDiameterCm, float maxRpm, float trackWidthCm) { stbV2BoardConfig.wheelDiameterCm = max(0.1f, wheelDiameterCm); stbV2BoardConfig.maxRpm = max(1.0f, maxRpm); stbV2BoardConfig.trackWidthCm = max(0.1f, trackWidthCm); }',
    'void stbV2ConfigureMotor(uint8_t motorIndex, uint8_t sideRole) { stbV2InitRuntime(); if (motorIndex >= STB_V2_MOTOR_COUNT) return; STBV2MotorState &motor = stbV2Motors[motorIndex]; motor.enabled = sideRole != STB_V2_SIDE_NONE; motor.configured = true; motor.sideRole = sideRole; stbV2SendConfigMotor(motorIndex); delay(5); stbV2RuntimeTick(); }',
    'void stbV2SetDirection(uint8_t motorIndex, bool inverted) { stbV2InitRuntime(); if (motorIndex >= STB_V2_MOTOR_COUNT) return; stbV2Motors[motorIndex].invertDirection = inverted; if (stbV2Motors[motorIndex].configured) stbV2SendConfigMotor(motorIndex); }',
    'void stbV2SetSpeed(uint8_t motorIndex, int speedPercent) { if (motorIndex >= STB_V2_MOTOR_COUNT) return; stbV2Motors[motorIndex].lastSpeedPercent = constrain(speedPercent, -100, 100); }',
    'void stbV2SetSpeedBySelector(const String& selector, int speedPercent) { int8_t single = stbV2SelectorToSingleMotorIndex(selector); if (single >= 0) { stbV2SetSpeed(static_cast<uint8_t>(single), speedPercent); return; } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (selector == "ALL" || (selector == "MOTION" && stbV2MotorInMotionGroup(i))) stbV2SetSpeed(i, speedPercent); } }',
    'void stbV2SetMotionBaseCalibration(int leftPercent, int rightPercent) { stbV2MotionLeftCalibrationPercent = constrain(leftPercent, 40, 140); stbV2MotionRightCalibrationPercent = constrain(rightPercent, 40, 140); }',
    'void stbV2ScaleMotionPairSpeeds(int requestedPeakPercent, int &leftSpeed, int &rightSpeed) { int requestedPeak = constrain(abs(requestedPeakPercent), 1, 100); int peak = max(abs(leftSpeed), abs(rightSpeed)); if (peak <= 0) { leftSpeed = requestedPeak; rightSpeed = requestedPeak; return; } float scale = static_cast<float>(requestedPeak) / static_cast<float>(peak); leftSpeed = max(1, static_cast<int>(roundf(abs(leftSpeed) * scale))); rightSpeed = max(1, static_cast<int>(roundf(abs(rightSpeed) * scale))); }',
    'void stbV2ApplyMotionBaseCalibration(int &leftSpeed, int &rightSpeed) { leftSpeed = constrain(static_cast<int>(lroundf(static_cast<float>(leftSpeed) * static_cast<float>(stbV2MotionLeftCalibrationPercent) / 100.0f)), 1, 100); rightSpeed = constrain(static_cast<int>(lroundf(static_cast<float>(rightSpeed) * static_cast<float>(stbV2MotionRightCalibrationPercent) / 100.0f)), 1, 100); }',
    'void stbV2ApplyGyroAssistSpeedCap(int &leftSpeed, int &rightSpeed) { (void)leftSpeed; (void)rightSpeed; }',
    'void stbV2PrepareGyroForMotion() { if (!stbV2MotionGyroAssist) return; if (stbV2MotionIsTurn) return; stbV2ConfigureMotionGyro(); if (!stbV2Gyro.ready) stbV2InitGyroHardware(); if (!stbV2Gyro.ready) return; if (!stbV2Gyro.calibrated) stbV2CalibrateGyro(); if (stbV2Gyro.ready && stbV2Gyro.calibrated && !stbV2Gyro.postureCalibrated) stbV2CalibrateGyroPosture(); if (stbV2Gyro.ready && stbV2Gyro.calibrated && stbV2Gyro.postureCalibrated) { stbV2ResetGyroAngle(); stbV2GyroTargetYaw = 0.0f; stbV2LastGyroAngle = 0.0f; stbV2GyroFilteredAngle = 0.0f; stbV2GyroFilteredRate = 0.0f; stbV2GyroIntegral = 0.0f; stbV2GyroAppliedLeftBiasX10 = 0; stbV2GyroAppliedRightBiasX10 = 0; stbV2GyroAdjustSide = STB_V2_SIDE_NONE; stbV2GyroAdjustSideCandidate = STB_V2_SIDE_NONE; stbV2GyroAdjustSideCandidateCount = 0; stbV2GyroAdjustSidePendingSinceMs = 0UL; stbV2LastGyroSupervisorMs = 0UL; stbV2GyroCorrectionPolarity = 1; stbV2GyroPolarityLocked = (stbV2MotionGyroOrientation != "VERTICAL"); stbV2GyroPolarityLearned = stbV2GyroPolarityLocked; stbV2GyroPolarityProbeStartAbsError = 0.0f; stbV2GyroPolarityProbeStartMs = 0UL; stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroActionSinceMs = 0UL; stbV2GyroCorrectionDirection = 0; stbV2GyroSaturationSinceMs = 0UL; stbV2GyroReleaseUntilMs = 0UL; stbV2GyroCorrectionEngaged = false; } }',
    'bool stbV2PrepareTurnGyro() { stbV2ConfigureMotionGyro(); if (!stbV2InitGyroHardware()) return false; if (!stbV2Gyro.calibrated) stbV2CalibrateGyro(); if (stbV2Gyro.ready && stbV2Gyro.calibrated && !stbV2Gyro.postureCalibrated) stbV2CalibrateGyroPosture(); stbV2UpdateGyro(); return stbV2Gyro.ready && stbV2Gyro.calibrated && stbV2Gyro.postureCalibrated; }',
    'bool stbV2GyroAssistReady() { return stbV2MotionGyroAssist && stbV2Gyro.ready && stbV2Gyro.calibrated && stbV2Gyro.postureCalibrated; }',
    'void stbV2SetMotionControlMode(const String& mode, const String& orientation) { stbV2MotionGyroAssist = (mode == "PID_GYRO" || mode == "GYRO"); stbV2MotionGyroOrientation = (orientation == "VERTICAL") ? "VERTICAL" : "HORIZONTAL"; if (stbV2MotionGyroAssist) stbV2ConfigureMotionGyro(); }',
    'void stbV2ConfigureMotionGyro() { stbV2InitGyroHardware(); if (!stbV2Gyro.ready) return; if (stbV2MotionGyroOrientation != "VERTICAL") { stbV2ConfigureGyro(String("Z"), true); return; } stbV2UpdateGyro(); float ax = fabsf(stbV2Gyro.accel[0]); float ay = fabsf(stbV2Gyro.accel[1]); String axis = String("X"); float g = stbV2Gyro.accel[0]; if (ay > ax) { axis = String("Y"); g = stbV2Gyro.accel[1]; } bool inverted = g > 0.0f; stbV2ConfigureGyro(axis, inverted); if (STB_V2_DEBUG_MOTION && !stbV2GyroOrientDebugPrinted) { stbV2DebugMotionLine(String("GYRO_ORIENT"), String("mode=VERTICAL,axis=") + axis + ",sign=" + (inverted ? String("-1") : String("1")) + ",ax=" + String(stbV2Gyro.accel[0]) + ",ay=" + String(stbV2Gyro.accel[1]) + ",az=" + String(stbV2Gyro.accel[2])); stbV2GyroOrientDebugPrinted = true; } }',
    'void stbV2PrepareMotorMove(uint8_t motorIndex, int32_t signedTicks, int speedPercent) { STBV2MotorState &motor = stbV2Motors[motorIndex]; int rpm = stbV2MotionTargetRpmFromPercent(speedPercent); if (rpm <= 0) rpm = 1; if (STB_V2_DEBUG_MOTION) { Serial.print("DBG PREPARE motor="); Serial.print(stbV2MotorName(motorIndex)); Serial.print(" ticks="); Serial.print(signedTicks); Serial.print(" speed="); Serial.print(speedPercent); Serial.print(" rpm="); Serial.println(rpm); } stbV2SendFrame(motor.nodeIndex, STB_V2_CMD_PREPARE_MOVE, motor.localIndex, 0, signedTicks, rpm * 100, 0, 0); motor.motionActive = true; motor.busy = true; motor.targetReached = false; motor.fault = false; motor.currentState = STB_V2_STATE_ARMED; motor.appliedSpeedPercent = signedTicks >= 0 ? abs(speedPercent) : -abs(speedPercent); }',
    'bool stbV2WaitMotorState(uint8_t motorIndex, uint8_t expectedState, unsigned long timeoutMs) { unsigned long startMs = millis(); while (millis() - startMs < timeoutMs) { stbV2RuntimeTick(); if (stbV2Motors[motorIndex].currentState == expectedState) return true; if (stbV2Motors[motorIndex].fault) return false; delay(2); } return false; }',
    'void stbV2GoMotor(uint8_t motorIndex) { STBV2MotorState &motor = stbV2Motors[motorIndex]; if (STB_V2_DEBUG_MOTION) stbV2DebugMotionLine(String("GO"), String("motor=") + stbV2MotorName(motorIndex)); stbV2SendFrame(motor.nodeIndex, STB_V2_CMD_GO, motor.localIndex, 0, 0, 0, 0, 0); motor.currentState = STB_V2_STATE_RUNNING; }',
    'void stbV2SetStartDelay(uint8_t sideRole, unsigned long delayMs) { stbV2StartDelayEnabled = sideRole == STB_V2_SIDE_LEFT || sideRole == STB_V2_SIDE_RIGHT; stbV2StartDelaySide = stbV2StartDelayEnabled ? sideRole : STB_V2_SIDE_NONE; stbV2StartDelayMs = constrain(delayMs, 0UL, 1000UL); }',
    'void stbV2DisableStartDelay() { stbV2StartDelayEnabled = false; stbV2StartDelaySide = STB_V2_SIDE_NONE; }',
    'void stbV2GoMotionPair(uint8_t leftIdx, uint8_t rightIdx) { if (!stbV2StartDelayEnabled || stbV2StartDelayMs == 0UL) { stbV2GoMotor(leftIdx); stbV2GoMotor(rightIdx); return; } uint8_t firstIdx = stbV2StartDelaySide == STB_V2_SIDE_LEFT ? rightIdx : leftIdx; uint8_t delayedIdx = stbV2StartDelaySide == STB_V2_SIDE_LEFT ? leftIdx : rightIdx; stbV2GoMotor(firstIdx); delay(stbV2StartDelayMs); stbV2GoMotor(delayedIdx); }',
    'void stbV2SendBiasPair(int leftBiasX10, int rightBiasX10) { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (leftIdx >= 0 && leftBiasX10 != stbV2LastLeftBiasX10) { STBV2MotorState &left = stbV2Motors[leftIdx]; stbV2SendFrame(left.nodeIndex, STB_V2_CMD_SET_BIAS, left.localIndex, 0, leftBiasX10, 0, 0, 0); stbV2LastLeftBiasX10 = leftBiasX10; } if (rightIdx >= 0 && rightBiasX10 != stbV2LastRightBiasX10) { STBV2MotorState &right = stbV2Motors[rightIdx]; stbV2SendFrame(right.nodeIndex, STB_V2_CMD_SET_BIAS, right.localIndex, 0, rightBiasX10, 0, 0, 0); stbV2LastRightBiasX10 = rightBiasX10; } }',
    'int stbV2MoveBiasToward(int currentBiasX10, int targetBiasX10, int stepX10) { if (currentBiasX10 < targetBiasX10) return min(currentBiasX10 + stepX10, targetBiasX10); if (currentBiasX10 > targetBiasX10) return max(currentBiasX10 - stepX10, targetBiasX10); return currentBiasX10; }',
    'void stbV2ApplyGyroBiasTargets(int leftTargetBiasX10, int rightTargetBiasX10) { if (leftTargetBiasX10 != 0) { stbV2GyroAppliedRightBiasX10 = 0; stbV2GyroAppliedLeftBiasX10 = stbV2MoveBiasToward(stbV2GyroAppliedLeftBiasX10, leftTargetBiasX10, STB_V2_MOTION_GYRO_BIAS_SLEW_X10); } else if (rightTargetBiasX10 != 0) { stbV2GyroAppliedLeftBiasX10 = 0; stbV2GyroAppliedRightBiasX10 = stbV2MoveBiasToward(stbV2GyroAppliedRightBiasX10, rightTargetBiasX10, STB_V2_MOTION_GYRO_BIAS_SLEW_X10); } else { stbV2GyroAppliedLeftBiasX10 = stbV2MoveBiasToward(stbV2GyroAppliedLeftBiasX10, 0, STB_V2_MOTION_GYRO_RELEASE_SLEW_X10); stbV2GyroAppliedRightBiasX10 = stbV2MoveBiasToward(stbV2GyroAppliedRightBiasX10, 0, STB_V2_MOTION_GYRO_RELEASE_SLEW_X10); } stbV2SendBiasPair(stbV2GyroAppliedLeftBiasX10, stbV2GyroAppliedRightBiasX10); }',
    'void stbV2ClearBias() { stbV2GyroAppliedLeftBiasX10 = 0; stbV2GyroAppliedRightBiasX10 = 0; stbV2SendBiasPair(0, 0); }',
    'int8_t stbV2GyroActionDirection(int8_t action) { if (action == STB_V2_GYRO_ACTION_BOOST_RIGHT || action == STB_V2_GYRO_ACTION_TRIM_LEFT) return 1; if (action == STB_V2_GYRO_ACTION_BOOST_LEFT || action == STB_V2_GYRO_ACTION_TRIM_RIGHT) return -1; return 0; }',
    'int8_t stbV2GyroBoostActionForDirection(int8_t direction) { return direction > 0 ? STB_V2_GYRO_ACTION_BOOST_RIGHT : STB_V2_GYRO_ACTION_BOOST_LEFT; }',
    'int8_t stbV2GyroTrimActionForDirection(int8_t direction) { return direction > 0 ? STB_V2_GYRO_ACTION_TRIM_LEFT : STB_V2_GYRO_ACTION_TRIM_RIGHT; }',
    'int stbV2GyroBiasFromDeltaRpm(int baseSpeedPercent, float deltaRpm, int maxMagnitudeX10) { float nominalRpm = stbV2BoardConfig.maxRpm * static_cast<float>(constrain(abs(baseSpeedPercent), 1, 100)) / 100.0f; if (nominalRpm <= 1.0f) return 0; int biasX10 = static_cast<int>(lroundf((deltaRpm / nominalRpm) * 1000.0f)); return constrain(biasX10, -maxMagnitudeX10, maxMagnitudeX10); }',
    'void stbV2BeginMotionPair(int32_t leftTicks, int32_t rightTicks, int leftSpeed, int rightSpeed, bool reverseMotion) { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (leftIdx < 0 || rightIdx < 0) return; if (STB_V2_DEBUG_MOTION) { Serial.print("DBG BEGIN pair leftTicks="); Serial.print(leftTicks); Serial.print(" rightTicks="); Serial.print(rightTicks); Serial.print(" leftSpeed="); Serial.print(leftSpeed); Serial.print(" rightSpeed="); Serial.print(rightSpeed); Serial.print(" reverse="); Serial.println(reverseMotion ? 1 : 0); } stbV2MotionReverse = reverseMotion; stbV2MotionIsTurn = (leftTicks < 0 && rightTicks > 0) || (leftTicks > 0 && rightTicks < 0); stbV2MotionLeftBaseSpeedPercent = abs(leftSpeed); stbV2MotionRightBaseSpeedPercent = abs(rightSpeed); stbV2PrepareGyroForMotion(); stbV2Motors[leftIdx].resetOffsetTicks = stbV2Motors[leftIdx].encoderTicks; stbV2Motors[rightIdx].resetOffsetTicks = stbV2Motors[rightIdx].encoderTicks; stbV2PrepareMotorMove(static_cast<uint8_t>(leftIdx), leftTicks, leftSpeed); stbV2PrepareMotorMove(static_cast<uint8_t>(rightIdx), rightTicks, rightSpeed); bool leftArmed = stbV2WaitMotorState(static_cast<uint8_t>(leftIdx), STB_V2_STATE_ARMED, 300UL); bool rightArmed = stbV2WaitMotorState(static_cast<uint8_t>(rightIdx), STB_V2_STATE_ARMED, 300UL); if (!leftArmed || !rightArmed) { if (STB_V2_DEBUG_MOTION) { Serial.print("DBG,tag=ARM_TIMEOUT,msg=left="); Serial.print(leftArmed ? 1 : 0); Serial.print(",right="); Serial.println(rightArmed ? 1 : 0); } stbV2SendFrame(stbV2Motors[leftIdx].nodeIndex, STB_V2_CMD_STOP, stbV2Motors[leftIdx].localIndex, 0, 0, 0, 0, 0); stbV2SendFrame(stbV2Motors[rightIdx].nodeIndex, STB_V2_CMD_STOP, stbV2Motors[rightIdx].localIndex, 0, 0, 0, 0, 0); stbV2Motors[leftIdx].motionActive = false; stbV2Motors[leftIdx].busy = false; stbV2Motors[leftIdx].currentState = STB_V2_STATE_IDLE; stbV2Motors[rightIdx].motionActive = false; stbV2Motors[rightIdx].busy = false; stbV2Motors[rightIdx].currentState = STB_V2_STATE_IDLE; stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionIsTurn = false; stbV2MotionTargetDistanceCm = 0.0f; return; } stbV2GoMotionPair(static_cast<uint8_t>(leftIdx), static_cast<uint8_t>(rightIdx)); stbV2MotionContinuousActive = labs(leftTicks) >= 2000000000L && labs(rightTicks) >= 2000000000L; stbV2MotionDistanceActive = !stbV2MotionContinuousActive; stbV2MotionTargetDistanceCm = stbV2MotionDistanceActive && (leftTicks == rightTicks) ? stbV2TicksToCm(leftTicks) : 0.0f; stbV2MotionStartMs = millis(); if (stbV2MotionGyroAssist) stbV2ClearBias(); }',
    'void stbV2MoveMotorContinuousByIndex(uint8_t motorIndex, int speedPercent) { int32_t sentinel = speedPercent >= 0 ? 2147483647L : -2147483647L; stbV2PrepareMotorMove(motorIndex, sentinel, abs(speedPercent)); stbV2WaitMotorState(motorIndex, STB_V2_STATE_ARMED, 300UL); stbV2GoMotor(motorIndex); stbV2Motors[motorIndex].motionActive = true; }',
    'void stbV2MoveBySelector(const String& selector) { stbV2InitRuntime(); int8_t single = stbV2SelectorToSingleMotorIndex(selector); if (single >= 0) { stbV2MoveMotorContinuousByIndex(static_cast<uint8_t>(single), abs(stbV2Motors[single].lastSpeedPercent)); return; } if (selector == "MOTION" && stbV2HasMotionPair()) { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); int leftSpeed = abs(stbV2Motors[leftIdx].lastSpeedPercent); int rightSpeed = abs(stbV2Motors[rightIdx].lastSpeedPercent); stbV2ApplyMotionBaseCalibration(leftSpeed, rightSpeed); stbV2ApplyGyroAssistSpeedCap(leftSpeed, rightSpeed); stbV2BeginMotionPair(2147483647L, 2147483647L, leftSpeed, rightSpeed, false); return; } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (selector == "ALL") stbV2MoveMotorContinuousByIndex(i, abs(stbV2Motors[i].lastSpeedPercent)); } }',
    'void stbV2ReverseBySelector(const String& selector) { stbV2InitRuntime(); int8_t single = stbV2SelectorToSingleMotorIndex(selector); if (single >= 0) { stbV2MoveMotorContinuousByIndex(static_cast<uint8_t>(single), -abs(stbV2Motors[single].lastSpeedPercent)); return; } if (selector == "MOTION" && stbV2HasMotionPair()) { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); int leftSpeed = abs(stbV2Motors[leftIdx].lastSpeedPercent); int rightSpeed = abs(stbV2Motors[rightIdx].lastSpeedPercent); stbV2ApplyMotionBaseCalibration(leftSpeed, rightSpeed); stbV2ApplyGyroAssistSpeedCap(leftSpeed, rightSpeed); stbV2BeginMotionPair(-2147483647L, -2147483647L, leftSpeed, rightSpeed, true); return; } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (selector == "ALL") stbV2MoveMotorContinuousByIndex(i, -abs(stbV2Motors[i].lastSpeedPercent)); } }',
    'void stbV2StopMotorByIndex(uint8_t motorIndex) { unsigned long profileStartMs = millis(); STBV2MotorState &motor = stbV2Motors[motorIndex]; for (uint8_t attempt = 0; attempt < 2; ++attempt) { stbV2SendFrame(motor.nodeIndex, STB_V2_CMD_SET_BIAS, motor.localIndex, 0, -1000, 0, 0, 0); delay(1); } delay(6); for (uint8_t attempt = 0; attempt < 3; ++attempt) { stbV2SendFrame(motor.nodeIndex, STB_V2_CMD_STOP, motor.localIndex, 0, 0, 0, 0, 0); stbV2PumpSerial(motor.nodeIndex); delay(2); } motor.motionActive = false; motor.busy = false; motor.currentState = STB_V2_STATE_IDLE; motor.appliedSpeedPercent = 0; motor.appliedPwm = 0; motor.timedMoveStopAtMs = 0UL; stbV2ProfileMotionLine(String("stop_motor_") + stbV2MotorName(motorIndex), millis() - profileStartMs); }',
    'void stbV2StopBySelector(const String& selector, bool aggressive = false) { unsigned long profileStartMs = millis(); int8_t single = stbV2SelectorToSingleMotorIndex(selector); if (single >= 0) { if (aggressive) { stbV2SendFrame(stbV2Motors[single].nodeIndex, STB_V2_CMD_STOP_ALL, stbV2Motors[single].localIndex, 0, 0, 0, 0, 0); stbV2PumpSerial(stbV2Motors[single].nodeIndex); } stbV2StopMotorByIndex(static_cast<uint8_t>(single)); stbV2ProfileMotionLine(String("stop_") + selector, millis() - profileStartMs); return; } bool stopMotionGroup = selector == "MOTION" || selector == "ALL"; uint8_t stopCmd = aggressive ? STB_V2_CMD_STOP_ALL : STB_V2_CMD_STOP; if (stopMotionGroup) { if (!aggressive) { for (uint8_t attempt = 0; attempt < 2; ++attempt) { stbV2SendFrame(0, STB_V2_CMD_SET_BIAS, 0xFF, 0, -1000, 0, 0, 0); stbV2SendFrame(1, STB_V2_CMD_SET_BIAS, 0xFF, 0, -1000, 0, 0, 0); stbV2PumpSerial(0); stbV2PumpSerial(1); delay(1); } delay(6); } for (uint8_t attempt = 0; attempt < 3; ++attempt) { stbV2SendFrame(0, stopCmd, 0xFF, 0, 0, 0, 0, 0); stbV2SendFrame(1, stopCmd, 0xFF, 0, 0, 0, 0, 0); stbV2PumpSerial(0); stbV2PumpSerial(1); delay(2); } } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (!stbV2SelectorMatchesMotor(selector, i)) continue; stbV2Motors[i].motionActive = false; stbV2Motors[i].busy = false; stbV2Motors[i].currentState = STB_V2_STATE_IDLE; stbV2Motors[i].appliedSpeedPercent = 0; stbV2Motors[i].appliedPwm = 0; stbV2Motors[i].timedMoveStopAtMs = 0UL; if (!stopMotionGroup) stbV2StopMotorByIndex(i); } stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionIsTurn = false; stbV2MotionTargetDistanceCm = 0.0f; stbV2GyroIntegral = 0.0f; stbV2ClearBias(); stbV2ProfileMotionLine(String("stop_") + selector, millis() - profileStartMs); }',
    'int32_t stbV2DistanceValueToMm(float value, const String& unit) { float magnitude = fabsf(value); float distanceCm = magnitude; if (unit == "MM") distanceCm = magnitude / 10.0f; else if (unit == "M") distanceCm = magnitude * 100.0f; else if (unit == "REV") distanceCm = magnitude * stbV2WheelCircumferenceCm(); else if (unit == "DEG") distanceCm = (magnitude / 360.0f) * stbV2WheelCircumferenceCm(); return lroundf((value < 0.0f ? -distanceCm : distanceCm) * 10.0f); }',
    'int32_t stbV2TurnValueToWheelDistanceMm(float value, const String& unit) { float magnitude = fabsf(value); float angleDeg = magnitude; if (unit == "REV") angleDeg = magnitude * 360.0f; else if (unit == "RAD") angleDeg = magnitude * 57.2957795f; float arcCm = (3.1415926f * stbV2BoardConfig.trackWidthCm) * (angleDeg / 360.0f); return lroundf(arcCm * 10.0f); }',
    'void stbV2MoveDistanceByIndex(uint8_t motorIndex, int32_t distanceMm, int speedPercent) { int32_t ticks = stbV2CmToTicks(static_cast<float>(distanceMm) / 10.0f); if (distanceMm < 0) ticks = -ticks; if (speedPercent == 0) speedPercent = abs(stbV2Motors[motorIndex].lastSpeedPercent); stbV2PrepareMotorMove(motorIndex, ticks, abs(speedPercent)); stbV2WaitMotorState(motorIndex, STB_V2_STATE_ARMED, 300UL); stbV2GoMotor(motorIndex); }',
    'void stbV2MoveDistanceBySelector(const String& selector, int32_t distanceMm, int speedPercent) { if (STB_V2_DEBUG_MOTION) { Serial.print("DBG MOVE_DIST selector="); Serial.print(selector); Serial.print(" mm="); Serial.print(distanceMm); Serial.print(" speedArg="); Serial.println(speedPercent); } stbV2InitRuntime(); int8_t single = stbV2SelectorToSingleMotorIndex(selector); if (single >= 0) { stbV2MoveDistanceByIndex(static_cast<uint8_t>(single), distanceMm, speedPercent); return; } if (selector == "MOTION" && stbV2HasMotionPair()) { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); int leftSpeed = abs(stbV2Motors[leftIdx].lastSpeedPercent); int rightSpeed = abs(stbV2Motors[rightIdx].lastSpeedPercent); if (speedPercent > 0) { stbV2ScaleMotionPairSpeeds(speedPercent, leftSpeed, rightSpeed); } stbV2ApplyMotionBaseCalibration(leftSpeed, rightSpeed); stbV2ApplyGyroAssistSpeedCap(leftSpeed, rightSpeed); if (STB_V2_DEBUG_MOTION) { Serial.print("DBG MOVE_DIST pair leftSpeed="); Serial.print(leftSpeed); Serial.print(" rightSpeed="); Serial.println(rightSpeed); } int32_t ticks = stbV2CmToTicks(static_cast<float>(distanceMm) / 10.0f); if (distanceMm < 0) ticks = -ticks; stbV2BeginMotionPair(ticks, ticks, leftSpeed, rightSpeed, distanceMm < 0); return; } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (selector == "ALL") stbV2MoveDistanceByIndex(i, distanceMm, speedPercent); } }',
    'void stbV2MoveDistanceBlocking(const String& selector, int32_t distanceMm, int speedPercent) { unsigned long profileStartMs = millis(); if (distanceMm == 0) { stbV2StopBySelector(selector); stbV2ProfileMotionLine(String("move_distance_zero_") + selector, millis() - profileStartMs); return; } stbV2MoveDistanceBySelector(selector, distanceMm, speedPercent); unsigned long waitStartMs = millis(); stbV2WaitForSelectorIdle(selector, 120000UL); stbV2ProfileMotionLine(String("move_wait_") + selector, millis() - waitStartMs); if (STB_V2_ENABLE_FINAL_HEADING_CORRECTION && stbV2MotionGyroAssist && selector == "MOTION" && stbV2Gyro.ready) { unsigned long correctionStartMs = millis(); delay(60); stbV2UpdateGyro(); float finalError = stbV2WrapAngleDeg(stbV2Gyro.angleDeg); if (fabsf(finalError) > 2.0f) { String turnSide = finalError > 0.0f ? "RIGHT" : "LEFT"; stbV2TurnByAmount(turnSide, fabsf(finalError), "DEGREES", 0); } stbV2ProfileMotionLine(String("move_final_heading_") + selector, millis() - correctionStartMs); } stbV2ProfileMotionLine(String("move_total_") + selector, millis() - profileStartMs); }',
    'void stbV2TurnContinuous(const String& side) { if (!stbV2HasMotionPair()) return; int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); int turnSpeed = max(abs(stbV2Motors[leftIdx].lastSpeedPercent), abs(stbV2Motors[rightIdx].lastSpeedPercent)); turnSpeed = constrain(turnSpeed, 35, 100); if (side == "RIGHT") stbV2BeginMotionPair(2147483647L, -2147483647L, turnSpeed, turnSpeed, false); else stbV2BeginMotionPair(-2147483647L, 2147483647L, turnSpeed, turnSpeed, false); }',
    'float stbV2TurnValueToDegrees(float value, const String& unit) { float magnitude = fabsf(value); if (unit == "DEGREES" || unit == "DEG") { return magnitude; } float wheelDistanceCm = magnitude * stbV2WheelCircumferenceCm(); float headingChangeDeg = (wheelDistanceCm / (3.1415926f * stbV2BoardConfig.trackWidthCm)) * 360.0f; return headingChangeDeg; }',
    'void stbV2TurnByAmount(const String& side, float value, const String& unit, int speedPercent) { unsigned long profileStartMs = millis(); if (!stbV2HasMotionPair()) return; int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); int turnSpeed = max(abs(stbV2Motors[leftIdx].lastSpeedPercent), abs(stbV2Motors[rightIdx].lastSpeedPercent)); if (speedPercent > 0) { turnSpeed = abs(speedPercent); } turnSpeed = constrain(turnSpeed, 45, 100); bool hasGyro = stbV2PrepareTurnGyro(); float targetAngleDeg = hasGyro ? stbV2TurnValueToDegrees(value, unit) : 0.0f; if (hasGyro && targetAngleDeg > 1.0f) { stbV2UpdateGyro(); float startAngle = stbV2Gyro.angleDeg; String activeSide = ""; int activeSpeed = 0; unsigned long turnStartMs = millis(); unsigned long timeoutMs = static_cast<unsigned long>((targetAngleDeg / 90.0f) * 3800.0f) + 2500UL; timeoutMs = constrain(timeoutMs, 2500UL, 12000UL); float lastProgressDeg = 0.0f; unsigned long lastProgressMs = millis(); while (millis() - turnStartMs < timeoutMs) { stbV2UpdateGyro(); float actualTurn = fabsf(stbV2WrapAngleDeg(stbV2Gyro.angleDeg - startAngle)); float error = targetAngleDeg - actualTurn; if (fabsf(error) <= STB_V2_TURN_GYRO_TOLERANCE_DEG) break; if (fabsf(actualTurn - lastProgressDeg) >= STB_V2_TURN_GYRO_STALL_MIN_PROGRESS_DEG) { lastProgressDeg = actualTurn; lastProgressMs = millis(); } else if (millis() - lastProgressMs >= STB_V2_TURN_GYRO_STALL_CANCEL_MS) { stbV2ProfileMotionLine(String("turn_gyro_cancel_stall"), millis() - lastProgressMs); break; } float absError = fabsf(error); int corrSpeed = absError > 8.0f ? 100 : 90; String corrSide = error >= 0.0f ? side : ((side == "RIGHT") ? "LEFT" : "RIGHT"); if (activeSide != corrSide || activeSpeed != corrSpeed) { if (activeSide.length() > 0) { stbV2StopBySelector("MOTION", true); delay(12); } if (corrSide == "RIGHT") { stbV2BeginMotionPair(2147483647L, -2147483647L, corrSpeed, corrSpeed, false); } else { stbV2BeginMotionPair(-2147483647L, 2147483647L, corrSpeed, corrSpeed, false); } activeSide = corrSide; activeSpeed = corrSpeed; } unsigned long sampleStartMs = millis(); while (millis() - sampleStartMs < 10UL) { stbV2RuntimeTick(); delay(2); } } if (activeSide.length() > 0) { stbV2StopBySelector("MOTION", true); delay(20); } stbV2ProfileMotionLine(String("turn_gyro_total"), millis() - turnStartMs); stbV2ProfileMotionLine(String("turn_total"), millis() - profileStartMs); return; } int32_t wheelDistanceMm = stbV2TurnValueToWheelDistanceMm(value, unit); int32_t wheelTicks = stbV2CmToTicks(static_cast<float>(wheelDistanceMm) / 10.0f); if (side == "RIGHT") { stbV2BeginMotionPair(wheelTicks, -wheelTicks, turnSpeed, turnSpeed, false); } else { stbV2BeginMotionPair(-wheelTicks, wheelTicks, turnSpeed, turnSpeed, false); } stbV2WaitForSelectorIdle("MOTION", 15000UL); stbV2ProfileMotionLine(String("turn_odometry_fallback"), millis() - profileStartMs); }',
    'unsigned long stbV2DurationToMs(float value, const String& unit) { return unit == "SECONDS" ? static_cast<unsigned long>(max(0.0f, value) * 1000.0f) : static_cast<unsigned long>(max(0.0f, value)); }',
    'void stbV2StopAndSettle(const String& selector, unsigned long settleMs) { stbV2StopBySelector(selector); unsigned long startMs = millis(); while (millis() - startMs < settleMs) { stbV2RuntimeTick(); delay(2); } stbV2RuntimeTick(); }',
    'void stbV2MoveForDurationAsync(const String& selector, int speedPercent, unsigned long durationMs) { if (speedPercent != 0) { stbV2SetSpeedBySelector(selector, abs(speedPercent)); } if (speedPercent >= 0) stbV2MoveBySelector(selector); else stbV2ReverseBySelector(selector); for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2SelectorMatchesMotor(selector, i)) stbV2Motors[i].timedMoveStopAtMs = millis() + durationMs; } }',
    'void stbV2MoveForDurationBlocking(const String& selector, int speedPercent, unsigned long durationMs) { stbV2MoveForDurationAsync(selector, speedPercent, durationMs); stbV2SafeDelay(durationMs); stbV2StopAndSettle(selector, 220UL); }',
    'void stbV2MoveForDurationUsingStoredSpeedAsync(const String& selector, bool reverse, unsigned long durationMs) { if (reverse) stbV2ReverseBySelector(selector); else stbV2MoveBySelector(selector); for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2SelectorMatchesMotor(selector, i)) stbV2Motors[i].timedMoveStopAtMs = millis() + durationMs; } }',
    'void stbV2MoveForDurationUsingStoredSpeedBlocking(const String& selector, bool reverse, unsigned long durationMs) { stbV2MoveForDurationUsingStoredSpeedAsync(selector, reverse, durationMs); stbV2SafeDelay(durationMs); stbV2StopAndSettle(selector, 220UL); }',
    'void stbV2SafeDelay(unsigned long durationMs) { unsigned long startMs = millis(); while (millis() - startMs < durationMs) { stbV2RuntimeTick(); delay(2); } }',
    'bool stbV2MotorsConfigured() { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2Motors[i].configured && stbV2Motors[i].enabled) return true; } return false; }',
    'float stbV2AverageMetricBySelector(const String& selector, uint8_t metricType) { float total = 0.0f; uint8_t count = 0; for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (!stbV2SelectorMatchesMotor(selector, i)) continue; if (metricType == 0) total += static_cast<float>(stbV2Motors[i].lastSpeedPercent); else if (metricType == 1) total += static_cast<float>(stbV2Motors[i].measuredRpmX100) / 100.0f; else if (metricType == 2) total += static_cast<float>(stbV2Motors[i].encoderTicks - stbV2Motors[i].resetOffsetTicks); else total += stbV2TicksToCm(stbV2Motors[i].encoderTicks - stbV2Motors[i].resetOffsetTicks); count++; } return count == 0 ? 0.0f : total / static_cast<float>(count); }',
    'float stbV2GetStoredSpeedPercent(const String& selector) { return stbV2AverageMetricBySelector(selector, 0); }',
    'float stbV2GetCurrentMotorRpm(const String& selector) { return stbV2AverageMetricBySelector(selector, 1); }',
    'float stbV2GetEncoderValue(const String& selector) { return stbV2AverageMetricBySelector(selector, 2); }',
    'float stbV2GetDistanceCm(const String& selector) { return stbV2AverageMetricBySelector(selector, 3); }',
    'bool stbV2IsMotorMoving(const String& selector) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2SelectorMatchesMotor(selector, i) && (stbV2Motors[i].motionActive || stbV2Motors[i].busy)) return true; } return false; }',
    'void stbV2ResetDistanceBySelector(const String& selector) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2SelectorMatchesMotor(selector, i)) stbV2Motors[i].resetOffsetTicks = stbV2Motors[i].encoderTicks; } }',
    'String stbV2StopReasonText(uint16_t reason) { if (reason == STB_V2_STATE_DONE) return String("COMPLETADO"); if (reason == STB_V2_STATE_FAULT) return String("FALLA"); if (reason == STB_V2_STATE_RUNNING) return String("EN_MOVIMIENTO"); if (reason == STB_V2_STATE_ARMED) return String("PREPARADO"); return String("DETENIDO"); }',
    'String stbV2GetLastStopReason(const String& selector) { for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2SelectorMatchesMotor(selector, i)) return stbV2StopReasonText(stbV2Motors[i].lastStopReason); } return String("NINGUNO"); }',
    'int stbV2GetLastErrorCode(uint8_t nodeIndex) { return nodeIndex < STB_V2_NODE_COUNT ? static_cast<int>(stbV2Nodes[nodeIndex].lastErrorCode) : -1; }',
    'void stbV2ConfigureTriggerBySelector(const String& triggerSelector, bool greaterThan, int threshold, const String& targetSelector) { (void)triggerSelector; (void)greaterThan; (void)threshold; (void)targetSelector; }',
    'void stbV2DisableTriggerBySelector(const String& triggerSelector) { (void)triggerSelector; }',
    'void stbV2DisableAllTriggers() {}',
    'void stbV2RunGyroSupervisor() { if (stbV2MotionIsTurn) return; if (!stbV2MotionContinuousActive && !stbV2MotionDistanceActive) return; if (!stbV2GyroAssistReady()) return; if (millis() - stbV2MotionStartMs < STB_V2_MOTION_GYRO_ENGAGE_DELAY_MS) return; int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (leftIdx < 0 || rightIdx < 0) return; if (!stbV2Motors[leftIdx].busy && !stbV2Motors[rightIdx].busy) { stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionTargetDistanceCm = 0.0f; stbV2GyroIntegral = 0.0f; stbV2ClearBias(); return; } unsigned long now = millis(); if (stbV2LastGyroSupervisorMs == 0UL) { stbV2LastGyroSupervisorMs = now; return; } unsigned long elapsedMs = now - stbV2LastGyroSupervisorMs; if (elapsedMs < STB_V2_GYRO_SUPERVISOR_INTERVAL_MS) return; float dt = static_cast<float>(elapsedMs) / 1000.0f; if (dt <= 0.0f) return; stbV2LastGyroSupervisorMs = now; float rawAngle = stbV2WrapAngleDeg(stbV2Gyro.angleDeg); float blendedAngle = stbV2GyroFilteredAngle + (STB_V2_GYRO_ANGLE_FILTER_ALPHA * stbV2WrapAngleDeg(rawAngle - stbV2GyroFilteredAngle)); float rawRate = stbV2WrapAngleDeg(blendedAngle - stbV2LastGyroAngle) / dt; stbV2GyroFilteredRate = (stbV2GyroFilteredRate * (1.0f - STB_V2_GYRO_RATE_FILTER_ALPHA)) + (rawRate * STB_V2_GYRO_RATE_FILTER_ALPHA); stbV2GyroFilteredAngle = blendedAngle; stbV2LastGyroAngle = blendedAngle; float angle = stbV2WrapAngleDeg(stbV2GyroFilteredAngle); float controlAngle = stbV2MotionReverse ? -angle : angle; float controlRate = stbV2MotionReverse ? -stbV2GyroFilteredRate : stbV2GyroFilteredRate; float errorAngle = fabsf(controlAngle) < STB_V2_MOTION_GYRO_DEADBAND_DEG ? 0.0f : controlAngle; float absErrorDeg = fabsf(errorAngle); if (absErrorDeg <= STB_V2_MOTION_GYRO_DEADBAND_DEG && fabsf(controlRate) < 2.0f) { stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroActionSinceMs = 0UL; stbV2GyroPolarityProbeStartMs = 0UL; stbV2GyroIntegral = 0.0f; stbV2DebugGyroMove(String("STRAIGHT"), now, angle, controlRate, errorAngle, 0.0f, 0, 0, leftIdx, rightIdx); stbV2ApplyGyroBiasTargets(0, 0); return; } float strongCorrectionMix = 0.0f; if (absErrorDeg > STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG) { strongCorrectionMix = constrain((absErrorDeg - STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG) / (STB_V2_MOTION_GYRO_STRONG_CORRECTION_MAX_DEG - STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG), 0.0f, 1.0f); } float gainBoost = 1.0f + ((STB_V2_MOTION_GYRO_STRONG_GAIN_MAX - 1.0f) * strongCorrectionMix); float biasBoost = 1.0f + ((STB_V2_MOTION_GYRO_STRONG_BIAS_MAX - 1.0f) * strongCorrectionMix); stbV2GyroIntegral = constrain(stbV2GyroIntegral + (errorAngle * dt), -25.0f, 25.0f); float correction = constrain(((errorAngle * STB_V2_MOTION_GYRO_KP) + (stbV2GyroIntegral * STB_V2_MOTION_GYRO_KI) + (controlRate * STB_V2_MOTION_GYRO_KD)) * gainBoost, -35.0f, 35.0f); float signedCorrection = correction * static_cast<float>(stbV2GyroCorrectionPolarity) * static_cast<float>(STB_V2_GYRO_BIAS_POLARITY); bool leftSaturated = abs(stbV2Motors[leftIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM; bool rightSaturated = abs(stbV2Motors[rightIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM; int8_t desiredAction = signedCorrection > 0.0f ? STB_V2_GYRO_ACTION_BOOST_RIGHT : STB_V2_GYRO_ACTION_BOOST_LEFT; if (desiredAction == STB_V2_GYRO_ACTION_BOOST_LEFT && leftSaturated) desiredAction = STB_V2_GYRO_ACTION_TRIM_RIGHT; if (desiredAction == STB_V2_GYRO_ACTION_BOOST_RIGHT && rightSaturated) desiredAction = STB_V2_GYRO_ACTION_TRIM_LEFT; if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_NONE) { if (desiredAction != stbV2GyroCandidateAction) { stbV2GyroCandidateAction = desiredAction; stbV2GyroCandidateActionCount = 1; } else if (stbV2GyroCandidateActionCount < STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) { stbV2GyroCandidateActionCount++; } if (stbV2GyroCandidateActionCount >= STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) { stbV2GyroActiveAction = desiredAction; stbV2GyroActionSinceMs = now; stbV2GyroPolarityProbeStartMs = 0UL; } } else if (desiredAction != stbV2GyroActiveAction && now - stbV2GyroActionSinceMs >= STB_V2_MOTION_GYRO_ACTION_HOLD_MS) { if (desiredAction != stbV2GyroCandidateAction) { stbV2GyroCandidateAction = desiredAction; stbV2GyroCandidateActionCount = 1; } else if (stbV2GyroCandidateActionCount < STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) { stbV2GyroCandidateActionCount++; } if (stbV2GyroCandidateActionCount >= STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) { stbV2GyroActiveAction = desiredAction; stbV2GyroActionSinceMs = now; stbV2GyroCandidateActionCount = 0; stbV2GyroPolarityProbeStartMs = 0UL; } } else { stbV2GyroCandidateAction = desiredAction; stbV2GyroCandidateActionCount = 0; } if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_NONE) { stbV2DebugGyroMove(String("WAIT_ACTION"), now, angle, controlRate, errorAngle, correction, 0, 0, leftIdx, rightIdx); stbV2ApplyGyroBiasTargets(0, 0); return; } if (!stbV2GyroPolarityLocked && absErrorDeg >= STB_V2_MOTION_GYRO_POLARITY_MIN_ERROR_DEG) { if (stbV2GyroPolarityProbeStartMs == 0UL) { stbV2GyroPolarityProbeStartMs = now; stbV2GyroPolarityProbeStartAbsError = absErrorDeg; } else if (now - stbV2GyroPolarityProbeStartMs >= STB_V2_MOTION_GYRO_POLARITY_LEARN_MS) { if (absErrorDeg > stbV2GyroPolarityProbeStartAbsError + STB_V2_MOTION_GYRO_POLARITY_GROWTH_DEG) { stbV2GyroCorrectionPolarity = -stbV2GyroCorrectionPolarity; stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroActionSinceMs = 0UL; stbV2GyroIntegral = 0.0f; stbV2GyroPolarityProbeStartMs = 0UL; stbV2DebugGyroMove(String("POLARITY_FLIP"), now, angle, controlRate, errorAngle, correction, 0, 0, leftIdx, rightIdx); stbV2ApplyGyroBiasTargets(0, 0); return; } stbV2GyroPolarityLocked = true; } } int magnitudeX10 = constrain(static_cast<int>(roundf(fabsf(correction) * 12.0f * biasBoost)), STB_V2_MOTION_GYRO_MIN_BOOST_X10, STB_V2_MOTION_GYRO_TRIM_MAX_BIAS_X10); int leftTargetBiasX10 = 0; int rightTargetBiasX10 = 0; String phase = String("ONE_NONE_P") + String(stbV2GyroCorrectionPolarity); if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_BOOST_LEFT) { leftTargetBiasX10 = magnitudeX10; phase = String("ONE_BOOST_LEFT_P") + String(stbV2GyroCorrectionPolarity); } else if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_BOOST_RIGHT) { rightTargetBiasX10 = magnitudeX10; phase = String("ONE_BOOST_RIGHT_P") + String(stbV2GyroCorrectionPolarity); } else if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_TRIM_LEFT) { leftTargetBiasX10 = -min(magnitudeX10, STB_V2_MOTION_GYRO_NEGATIVE_TRIM_MAX_X10); phase = String("ONE_TRIM_LEFT_P") + String(stbV2GyroCorrectionPolarity); } else if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_TRIM_RIGHT) { rightTargetBiasX10 = -min(magnitudeX10, STB_V2_MOTION_GYRO_NEGATIVE_TRIM_MAX_X10); phase = String("ONE_TRIM_RIGHT_P") + String(stbV2GyroCorrectionPolarity); } stbV2DebugGyroMove(phase, now, angle, controlRate, errorAngle, correction, leftTargetBiasX10, rightTargetBiasX10, leftIdx, rightIdx); stbV2ApplyGyroBiasTargets(leftTargetBiasX10, rightTargetBiasX10); }',
    'void stbV2RunSingleWheelGyroSupervisor() {',
    '  if (stbV2MotionIsTurn || (!stbV2MotionContinuousActive && !stbV2MotionDistanceActive)) return;',
    '  unsigned long now = millis();',
    '  int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT);',
    '  int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT);',
    '  if (leftIdx < 0 || rightIdx < 0) return;',
    '  bool leftDone = stbV2Motors[leftIdx].currentState == STB_V2_STATE_DONE;',
    '  bool rightDone = stbV2Motors[rightIdx].currentState == STB_V2_STATE_DONE;',
    '  if (leftDone || rightDone) { stbV2DebugMotionLine(String("PAIR_DONE_STOP"), String(leftDone ? "LEFT" : "RIGHT")); stbV2StopBySelector(String("MOTION"), true); return; }',
    '  if (!stbV2Motors[leftIdx].busy && !stbV2Motors[rightIdx].busy) { stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionTargetDistanceCm = 0.0f; stbV2GyroIntegral = 0.0f; stbV2ClearBias(); return; }',
    '  if (!stbV2GyroAssistReady() || now - stbV2MotionStartMs < STB_V2_MOTION_GYRO_ENGAGE_DELAY_MS) return;',
    '  if (stbV2LastGyroSupervisorMs == 0UL) { stbV2LastGyroSupervisorMs = now; return; }',
    '  unsigned long elapsedMs = now - stbV2LastGyroSupervisorMs;',
    '  if (elapsedMs < STB_V2_GYRO_SUPERVISOR_INTERVAL_MS) return;',
    '  float dt = static_cast<float>(elapsedMs) / 1000.0f;',
    '  if (dt <= 0.0f) return;',
    '  stbV2LastGyroSupervisorMs = now;',
    '  float rawAngle = stbV2WrapAngleDeg(stbV2Gyro.angleDeg);',
    '  float blendedAngle = stbV2GyroFilteredAngle + (STB_V2_GYRO_ANGLE_FILTER_ALPHA * stbV2WrapAngleDeg(rawAngle - stbV2GyroFilteredAngle));',
    '  float rawRate = stbV2WrapAngleDeg(blendedAngle - stbV2LastGyroAngle) / dt;',
    '  stbV2GyroFilteredRate = (stbV2GyroFilteredRate * (1.0f - STB_V2_GYRO_RATE_FILTER_ALPHA)) + (rawRate * STB_V2_GYRO_RATE_FILTER_ALPHA);',
    '  stbV2GyroFilteredAngle = blendedAngle;',
    '  stbV2LastGyroAngle = blendedAngle;',
    '  float angle = stbV2WrapAngleDeg(blendedAngle);',
    '  float controlAngle = stbV2MotionReverse ? -angle : angle;',
    '  float controlRate = stbV2MotionReverse ? -stbV2GyroFilteredRate : stbV2GyroFilteredRate;',
    '  float projectedAngle = controlAngle + (controlRate * STB_V2_MOTION_GYRO_CONTROL_LOOKAHEAD_S);',
    '  bool anySaturated = abs(stbV2Motors[leftIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM || abs(stbV2Motors[rightIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM;',
    '  bool bothSaturated = abs(stbV2Motors[leftIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM && abs(stbV2Motors[rightIdx].appliedPwm) >= STB_V2_MOTION_GYRO_SATURATION_PWM;',
    '  float leftAbsRpm = fabsf(static_cast<float>(stbV2Motors[leftIdx].measuredRpmX100) / 100.0f);',
    '  float rightAbsRpm = fabsf(static_cast<float>(stbV2Motors[rightIdx].measuredRpmX100) / 100.0f);',
    '  if (bothSaturated && leftAbsRpm < 20.0f && rightAbsRpm < 20.0f) { stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCorrectionDirection = 0; stbV2GyroIntegral = 0.0f; stbV2ApplyGyroBiasTargets(0, 0); return; }',
    '  float absErrorDeg = fabsf(controlAngle);',
    '  float projectedAbsErrorDeg = fabsf(projectedAngle);',
    '  if (!stbV2GyroCorrectionEngaged && projectedAbsErrorDeg >= STB_V2_MOTION_GYRO_DEADBAND_DEG) stbV2GyroCorrectionEngaged = true;',
    '  if (stbV2GyroCorrectionEngaged && absErrorDeg <= STB_V2_MOTION_GYRO_EXIT_DEADBAND_DEG && fabsf(controlRate) <= STB_V2_MOTION_GYRO_EXIT_RATE_DEG_S) stbV2GyroCorrectionEngaged = false;',
    '  if (!stbV2GyroCorrectionEngaged) {',
    '    stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroCorrectionDirection = 0; stbV2GyroActionSinceMs = 0UL; stbV2GyroSaturationSinceMs = 0UL; stbV2GyroPolarityProbeStartMs = 0UL; stbV2GyroIntegral = 0.0f;',
    '    stbV2ApplyGyroBiasTargets(0, 0);',
    '    return;',
    '  }',
    '  if (absErrorDeg <= STB_V2_MOTION_GYRO_CENTER_COAST_DEG && projectedAbsErrorDeg < STB_V2_MOTION_GYRO_TARGET_BAND_DEG) { stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroCorrectionDirection = 0; stbV2GyroIntegral *= 0.75f; stbV2GyroReleaseUntilMs = now + STB_V2_MOTION_GYRO_RELEASE_COAST_MS; stbV2ApplyGyroBiasTargets(0, 0); return; }',
    '  float currentErrorSign = controlAngle >= 0.0f ? 1.0f : -1.0f;',
    '  float centerRate = controlRate * currentErrorSign;',
    '  float directionAngle = projectedAbsErrorDeg >= STB_V2_MOTION_GYRO_DEADBAND_DEG ? projectedAngle : controlAngle;',
    '  float errorSign = directionAngle > 0.0f ? 1.0f : -1.0f;',
    '  float awayRate = controlRate * errorSign;',
    '  float dynamicReengageAngle = constrain(fabsf(controlRate) * STB_V2_MOTION_GYRO_REENGAGE_RATE_SCALE, STB_V2_MOTION_GYRO_REENGAGE_ANGLE_DEG, STB_V2_MOTION_GYRO_REENGAGE_MAX_ANGLE_DEG);',
    '  bool projectedOutsideTargetBand = projectedAbsErrorDeg >= STB_V2_MOTION_GYRO_TARGET_BAND_DEG;',
    '  if (now < stbV2GyroReleaseUntilMs && centerRate <= 0.0f && absErrorDeg < dynamicReengageAngle && !projectedOutsideTargetBand) { stbV2GyroIntegral *= 0.90f; stbV2ApplyGyroBiasTargets(0, 0); return; }',
    '  if (now >= stbV2GyroReleaseUntilMs) stbV2GyroReleaseUntilMs = 0UL;',
    '  float releaseAngleDeg = constrain(fabsf(controlRate) * STB_V2_MOTION_GYRO_RELEASE_LOOKAHEAD_S, STB_V2_MOTION_GYRO_RELEASE_MIN_ANGLE_DEG, STB_V2_MOTION_GYRO_RELEASE_MAX_ANGLE_DEG);',
    '  bool projectedCrossing = controlAngle * projectedAngle <= 0.0f && absErrorDeg > STB_V2_MOTION_GYRO_EXIT_DEADBAND_DEG && !projectedOutsideTargetBand;',
    '  if (projectedCrossing || (centerRate <= -STB_V2_MOTION_GYRO_RELEASE_MIN_RATE_DEG_S && absErrorDeg <= releaseAngleDeg)) { stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroCorrectionDirection = 0; stbV2GyroActionSinceMs = 0UL; stbV2GyroSaturationSinceMs = 0UL; stbV2GyroPolarityProbeStartMs = 0UL; stbV2GyroIntegral *= 0.70f; stbV2GyroReleaseUntilMs = now + STB_V2_MOTION_GYRO_RELEASE_COAST_MS; stbV2ApplyGyroBiasTargets(0, 0); return; }',
    '  float rateContribution = awayRate > 0.0f ? awayRate * STB_V2_MOTION_GYRO_KD : 0.0f;',
    '  float controlErrorDeg = awayRate > 0.0f ? max(absErrorDeg, projectedAbsErrorDeg) : absErrorDeg;',
    '  float strongMix = constrain((controlErrorDeg - STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG) / (STB_V2_MOTION_GYRO_STRONG_CORRECTION_MAX_DEG - STB_V2_MOTION_GYRO_STRONG_CORRECTION_START_DEG), 0.0f, 1.0f);',
    '  float gainBoost = 1.0f + ((STB_V2_MOTION_GYRO_STRONG_GAIN_MAX - 1.0f) * strongMix);',
    '  float biasBoost = 1.0f + ((STB_V2_MOTION_GYRO_STRONG_BIAS_MAX - 1.0f) * strongMix);',
    '  bool returningToCenter = controlAngle * controlRate < 0.0f;',
    '  if (anySaturated) stbV2GyroIntegral *= 0.50f; else if (absErrorDeg < 0.8f || returningToCenter) stbV2GyroIntegral *= 0.92f; else { if (stbV2GyroIntegral * controlAngle < 0.0f) stbV2GyroIntegral *= 0.25f; stbV2GyroIntegral = constrain(stbV2GyroIntegral + (controlAngle * dt), -STB_V2_MOTION_GYRO_INTEGRAL_LIMIT, STB_V2_MOTION_GYRO_INTEGRAL_LIMIT); }',
    '  float integralContributionRpm = fabsf(stbV2GyroIntegral) * STB_V2_MOTION_GYRO_KI;',
    '  float dynamicCorrectionMaxRpm = absErrorDeg < 1.0f ? STB_V2_MOTION_GYRO_NEAR_CENTER_MAX_RPM : (absErrorDeg < 2.0f ? STB_V2_MOTION_GYRO_MID_BAND_MAX_RPM : STB_V2_MOTION_GYRO_MAX_CORRECTION_RPM);',
    '  float correctionRpm = constrain(((controlErrorDeg * STB_V2_MOTION_GYRO_KP) + rateContribution + integralContributionRpm) * gainBoost, STB_V2_MOTION_GYRO_MIN_CORRECTION_RPM, dynamicCorrectionMaxRpm);',
    '  int8_t direction = static_cast<int8_t>(errorSign) * stbV2GyroCorrectionPolarity * STB_V2_GYRO_BIAS_POLARITY;',
    '  int8_t trimAction = stbV2GyroTrimActionForDirection(direction);',
    '  int8_t desiredAction = trimAction;',
    '  if (direction != stbV2GyroCorrectionDirection) {',
    '    stbV2GyroIntegral *= 0.25f;',
    '    if (desiredAction != stbV2GyroCandidateAction) { stbV2GyroCandidateAction = desiredAction; stbV2GyroCandidateActionCount = 1; } else if (stbV2GyroCandidateActionCount < STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) { stbV2GyroCandidateActionCount++; }',
    '    stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroActionSinceMs = 0UL; stbV2GyroSaturationSinceMs = 0UL; stbV2GyroPolarityProbeStartMs = 0UL;',
    '    stbV2ClearBias();',
    '    if (stbV2GyroCandidateActionCount < STB_V2_MOTION_GYRO_ACTION_CONFIRM_SAMPLES) return;',
    '    stbV2GyroCorrectionDirection = direction; stbV2GyroActiveAction = desiredAction; stbV2GyroActionSinceMs = now; stbV2GyroCandidateActionCount = 0;',
    '  }',
    '  if (stbV2GyroActionDirection(stbV2GyroActiveAction) != direction || stbV2GyroActiveAction != desiredAction) { stbV2GyroActiveAction = desiredAction; stbV2GyroActionSinceMs = now; }',
    '  if (!stbV2GyroPolarityLocked && absErrorDeg >= STB_V2_MOTION_GYRO_POLARITY_MIN_ERROR_DEG) {',
    '    if (stbV2GyroPolarityProbeStartMs == 0UL) { stbV2GyroPolarityProbeStartMs = now; stbV2GyroPolarityProbeStartAbsError = absErrorDeg; }',
    '    else if (now - stbV2GyroPolarityProbeStartMs >= STB_V2_MOTION_GYRO_POLARITY_LEARN_MS) {',
    '      if (absErrorDeg > stbV2GyroPolarityProbeStartAbsError + STB_V2_MOTION_GYRO_POLARITY_GROWTH_DEG) { stbV2GyroCorrectionPolarity = -stbV2GyroCorrectionPolarity; stbV2GyroPolarityLocked = true; stbV2GyroPolarityLearned = true; stbV2GyroCorrectionDirection = 0; stbV2GyroActiveAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateAction = STB_V2_GYRO_ACTION_NONE; stbV2GyroCandidateActionCount = 0; stbV2GyroSaturationSinceMs = 0UL; stbV2GyroPolarityProbeStartMs = 0UL; stbV2GyroIntegral = 0.0f; stbV2ClearBias(); return; }',
    '      stbV2GyroPolarityLocked = true; stbV2GyroPolarityLearned = true;',
    '    }',
    '  }',
    '  float requestedDeltaRpm = correctionRpm * biasBoost;',
    '  int leftTargetBiasX10 = 0; int rightTargetBiasX10 = 0;',
    '  if (stbV2GyroActiveAction == STB_V2_GYRO_ACTION_TRIM_LEFT) leftTargetBiasX10 = stbV2GyroBiasFromDeltaRpm(stbV2MotionLeftBaseSpeedPercent, -(requestedDeltaRpm * STB_V2_MOTION_GYRO_LEFT_TRIM_SCALE), STB_V2_MOTION_GYRO_LEFT_TRIM_MAX_X10);',
    '  else rightTargetBiasX10 = stbV2GyroBiasFromDeltaRpm(stbV2MotionRightBaseSpeedPercent, -(requestedDeltaRpm * STB_V2_MOTION_GYRO_RIGHT_TRIM_SCALE), STB_V2_MOTION_GYRO_RIGHT_TRIM_MAX_X10);',
    '  if (!stbV2GyroPolarityLocked) { leftTargetBiasX10 = constrain(leftTargetBiasX10, -STB_V2_MOTION_GYRO_UNLEARNED_MAX_BOOST_X10, STB_V2_MOTION_GYRO_UNLEARNED_MAX_BOOST_X10); rightTargetBiasX10 = constrain(rightTargetBiasX10, -STB_V2_MOTION_GYRO_UNLEARNED_MAX_BOOST_X10, STB_V2_MOTION_GYRO_UNLEARNED_MAX_BOOST_X10); }',
    '  stbV2ApplyGyroBiasTargets(leftTargetBiasX10, rightTargetBiasX10);',
    '}',
    'void stbV2RuntimeTick() { if (!stbV2BoardConfig.initialized) return; stbV2PumpSerial(0); stbV2PumpSerial(1); unsigned long now = millis(); if (now - stbV2LastHeartbeatMs >= STB_V2_HEARTBEAT_INTERVAL_MS) { stbV2SendFrame(0, STB_V2_CMD_HEARTBEAT, 0xFF, 0, 0, 0, 0, 0); stbV2SendFrame(1, STB_V2_CMD_HEARTBEAT, 0xFF, 0, 0, 0, 0, 0); stbV2LastHeartbeatMs = now; } if (now - stbV2LastStatusPollMs >= STB_V2_STATUS_POLL_INTERVAL_MS) { stbV2RequestStatus(stbV2StatusPollNode, 0xFF); stbV2StatusPollNode = (stbV2StatusPollNode + 1) % STB_V2_NODE_COUNT; stbV2LastStatusPollMs = now; } for (uint8_t i = 0; i < STB_V2_MOTOR_COUNT; ++i) { if (stbV2Motors[i].timedMoveStopAtMs > 0UL && now >= stbV2Motors[i].timedMoveStopAtMs) { stbV2StopMotorByIndex(i); } } if (stbV2Gyro.ready) stbV2UpdateGyro(); stbV2RunSingleWheelGyroSupervisor(); }',
    'void stbV2WaitForSelectorIdle(const String& selector, unsigned long timeoutMs) { unsigned long startMs = millis(); while (millis() - startMs < timeoutMs) { stbV2RuntimeTick(); if (!stbV2IsMotorMoving(selector)) { if (selector == "MOTION") { stbV2MotionDistanceActive = false; stbV2MotionContinuousActive = false; stbV2MotionTargetDistanceCm = 0.0f; stbV2GyroIntegral = 0.0f; stbV2ClearBias(); } return; } if (selector == "MOTION") { int8_t leftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); int8_t rightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (leftIdx >= 0 && rightIdx >= 0) { bool leftDone = stbV2Motors[leftIdx].currentState == STB_V2_STATE_DONE; bool rightDone = stbV2Motors[rightIdx].currentState == STB_V2_STATE_DONE; if (leftDone != rightDone) { stbV2StopBySelector(selector, true); return; } } } delay(2); } stbV2StopBySelector(selector); }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_runtime_init'] = 'stbV2InitRuntime();';
  // Keep the Mega2560 runtime alive in loop() so the motor nodes keep
  // receiving heartbeats and status polling while user code is idle.
  Blockly.Arduino.loops_['stb_v2_runtime_loop'] = 'stbV2RuntimeTick();';
    }

    function ensureStbV2MegaConfigHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaMoveHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaDistanceHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaTurnHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaStatusHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2MegaTriggerHelpers () {
ensureStbV2MegaBase();
    }

    function ensureStbV2LocalRuntime () {
Blockly.Arduino.definitions_['stb_v2_local_runtime'] = [
    'struct STBV2LocalButtonState {',
    '  uint8_t pin;',
    '  bool currentPressed;',
    '  bool lastRawPressed;',
    '  unsigned long lastChangeMs;',
    '  uint32_t pressCount;',
    '};',
    '',
    'struct STBV2LocalInfraredState {',
    '  uint8_t receiverPin;',
    '  uint8_t emitterPin;',
    '  bool receiverDetected;',
    '  bool lastRawDetected;',
    '  bool emitterActive;',
    '  unsigned long lastChangeMs;',
    '  uint32_t detectionCount;',
    '};',
    '',
    'struct STBV2LocalBuzzerState {',
    '  uint8_t pin;',
    '  bool active;',
    '  uint16_t frequencyHz;',
    '};',
    '',
    'struct STBV2LocalMicrophoneState {',
    '  uint8_t pin;',
    '  bool calibrated;',
    '  uint16_t baselineRaw;',
    '};',
    '',
    'struct STBV2LocalBluetoothState {',
    '  bool started;',
    '  unsigned long baudRate;',
    '};',
    '',
    'const uint8_t STB_V2_LOCAL_MIC_PIN = A13;',
    'const uint8_t STB_V2_LOCAL_LM335_PIN = A14;',
    'const uint8_t STB_V2_LOCAL_LDR_PIN = A15;',
    'const unsigned long STB_V2_LOCAL_BUTTON_DEBOUNCE_MS = 20UL;',
    'const unsigned long STB_V2_LOCAL_IR_DEBOUNCE_MS = 5UL;',
    '',
    'bool stbV2LocalRuntimeInitialized = false;',
    'STBV2LocalButtonState stbV2LocalButtons[6] = {',
    '  {38, false, false, 0UL, 0UL},',
    '  {39, false, false, 0UL, 0UL},',
    '  {40, false, false, 0UL, 0UL},',
    '  {41, false, false, 0UL, 0UL},',
    '  {42, false, false, 0UL, 0UL},',
    '  {43, false, false, 0UL, 0UL}',
    '};',
    'STBV2LocalInfraredState stbV2LocalInfrared = {13, 44, false, false, false, 0UL, 0UL};',
    'STBV2LocalBuzzerState stbV2LocalBuzzer = {12, false, 0};',
    'STBV2LocalMicrophoneState stbV2LocalMicrophone = {STB_V2_LOCAL_MIC_PIN, false, 0};',
    'STBV2LocalBluetoothState stbV2LocalBluetooth = {false, 0UL};',
    '',
    'unsigned long stbV2LocalDurationMs(float value, const String& unit) {',
    '  if (value < 0.0f) {',
    '    value = 0.0f;',
    '  }',
    '  return unit == "SECONDS" ? static_cast<unsigned long>(value * 1000.0f) : static_cast<unsigned long>(value);',
    '}',
    '',
    'bool stbV2LocalCompareFloat(float leftValue, const String& comparison, float rightValue) {',
    '  if (comparison == "GT") { return leftValue > rightValue; }',
    '  if (comparison == "LT") { return leftValue < rightValue; }',
    '  if (comparison == "GTE") { return leftValue >= rightValue; }',
    '  if (comparison == "LTE") { return leftValue <= rightValue; }',
    '  if (comparison == "EQ") { return fabsf(leftValue - rightValue) <= 0.01f; }',
    '  if (comparison == "NEQ") { return fabsf(leftValue - rightValue) > 0.01f; }',
    '  return false;',
    '}',
    '',
    'int8_t stbV2LocalButtonIndexFromName(const String& buttonName) {',
    '  if (buttonName == "B1") return 0;',
    '  if (buttonName == "B2") return 1;',
    '  if (buttonName == "B3") return 2;',
    '  if (buttonName == "B4") return 3;',
    '  if (buttonName == "B5") return 4;',
    '  if (buttonName == "B6") return 5;',
    '  return -1;',
    '}',
    '',
    'void stbV2LocalUpdateButtons() {',
    '  unsigned long now = millis();',
    '  for (uint8_t i = 0; i < 6; ++i) {',
    '    STBV2LocalButtonState &button = stbV2LocalButtons[i];',
    '    bool rawPressed = digitalRead(button.pin) == HIGH;',
    '    if (rawPressed != button.lastRawPressed) {',
    '      button.lastRawPressed = rawPressed;',
    '      button.lastChangeMs = now;',
    '    }',
    '    if ((now - button.lastChangeMs) >= STB_V2_LOCAL_BUTTON_DEBOUNCE_MS && button.currentPressed != rawPressed) {',
    '      button.currentPressed = rawPressed;',
    '      if (button.currentPressed) {',
    '        button.pressCount++;',
    '      }',
    '    }',
    '  }',
    '}',
    '',
    'bool stbV2LocalReadButton(const String& buttonName) {',
    '  int8_t index = stbV2LocalButtonIndexFromName(buttonName);',
    '  if (index < 0) { return false; }',
    '  stbV2LocalUpdateButtons();',
    '  return stbV2LocalButtons[index].currentPressed;',
    '}',
    '',
    'uint32_t stbV2LocalGetButtonCount(const String& buttonName) {',
    '  int8_t index = stbV2LocalButtonIndexFromName(buttonName);',
    '  if (index < 0) { return 0; }',
    '  stbV2LocalUpdateButtons();',
    '  return stbV2LocalButtons[index].pressCount;',
    '}',
    '',
    'void stbV2LocalResetButtonCount(const String& buttonName) {',
    '  int8_t index = stbV2LocalButtonIndexFromName(buttonName);',
    '  if (index < 0) { return; }',
    '  stbV2LocalButtons[index].pressCount = 0;',
    '}',
    '',
    'void stbV2LocalUpdateInfrared() {',
    '  bool rawDetected = digitalRead(stbV2LocalInfrared.receiverPin) == HIGH;',
    '  unsigned long now = millis();',
    '  if (rawDetected != stbV2LocalInfrared.lastRawDetected) {',
    '    stbV2LocalInfrared.lastRawDetected = rawDetected;',
    '    stbV2LocalInfrared.lastChangeMs = now;',
    '  }',
    '  if ((now - stbV2LocalInfrared.lastChangeMs) >= STB_V2_LOCAL_IR_DEBOUNCE_MS && rawDetected != stbV2LocalInfrared.receiverDetected) {',
    '    stbV2LocalInfrared.receiverDetected = rawDetected;',
    '    if (rawDetected) {',
    '      stbV2LocalInfrared.detectionCount++;',
    '    }',
    '  }',
    '}',
    '',
    'bool stbV2LocalInfraredDetected() {',
    '  stbV2LocalUpdateInfrared();',
    '  return stbV2LocalInfrared.receiverDetected;',
    '}',
    '',
    'uint32_t stbV2LocalGetInfraredDetectionCount() {',
    '  stbV2LocalUpdateInfrared();',
    '  return stbV2LocalInfrared.detectionCount;',
    '}',
    '',
    'void stbV2LocalResetInfraredDetectionCount() {',
    '  stbV2LocalInfrared.detectionCount = 0;',
    '}',
    '',
    'void stbV2LocalSetInfraredEmitter(bool active) {',
    '  stbV2LocalInfrared.emitterActive = active;',
    '  digitalWrite(stbV2LocalInfrared.emitterPin, active ? HIGH : LOW);',
    '}',
    '',
    'bool stbV2LocalInfraredEmitterActive() {',
    '  return stbV2LocalInfrared.emitterActive;',
    '}',
    '',
    'uint32_t stbV2LocalMeasureInfraredPulses(unsigned long durationMs) {',
    '  if (durationMs == 0UL) { return 0UL; }',
    '  unsigned long startMs = millis();',
    '  bool lastState = stbV2LocalInfraredDetected();',
    '  uint32_t pulseCount = 0UL;',
    '  while ((millis() - startMs) < durationMs) {',
    '    stbV2LocalRuntimeTick();',
    '    bool currentState = stbV2LocalInfrared.receiverDetected;',
    '    if (currentState && !lastState) {',
    '      pulseCount++;',
    '    }',
    '    lastState = currentState;',
    '  }',
    '  return pulseCount;',
    '}',
    '',
    'void stbV2LocalEmitInfraredPulses(uint32_t pulseCount, unsigned long durationMs) {',
    '  if (pulseCount == 0UL) {',
    '    stbV2LocalSetInfraredEmitter(false);',
    '    return;',
    '  }',
    '  if (durationMs == 0UL) { durationMs = pulseCount; }',
    '  unsigned long totalUs = durationMs * 1000UL;',
    '  unsigned long periodUs = totalUs / pulseCount;',
    '  if (periodUs < 2UL) { periodUs = 2UL; }',
    '  unsigned long onUs = periodUs / 2UL;',
    '  unsigned long offUs = periodUs - onUs;',
    '  if (onUs == 0UL) { onUs = 1UL; }',
    '  if (offUs == 0UL) { offUs = 1UL; }',
    '  for (uint32_t i = 0; i < pulseCount; ++i) {',
    '    stbV2LocalSetInfraredEmitter(true);',
    '    delayMicroseconds(static_cast<unsigned int>(onUs));',
    '    stbV2LocalSetInfraredEmitter(false);',
    '    if (i + 1UL < pulseCount) {',
    '      delayMicroseconds(static_cast<unsigned int>(offUs));',
    '    }',
    '  }',
    '  stbV2LocalSetInfraredEmitter(false);',
    '}',
    '',
    'uint16_t stbV2LocalNoteFrequency(const String& note) {',
    '  if (note == "C4") return 262;',
    '  if (note == "D4") return 294;',
    '  if (note == "E4") return 330;',
    '  if (note == "F4") return 349;',
    '  if (note == "G4") return 392;',
    '  if (note == "A4") return 440;',
    '  if (note == "B4") return 494;',
    '  if (note == "C5") return 523;',
    '  return 440;',
    '}',
    '',
    'void stbV2LocalBuzzerOn(uint16_t frequencyHz) {',
    '  if (frequencyHz == 0) { frequencyHz = 440; }',
    '  tone(stbV2LocalBuzzer.pin, frequencyHz);',
    '  stbV2LocalBuzzer.active = true;',
    '  stbV2LocalBuzzer.frequencyHz = frequencyHz;',
    '}',
    '',
    'void stbV2LocalBuzzerOff() {',
    '  noTone(stbV2LocalBuzzer.pin);',
    '  stbV2LocalBuzzer.active = false;',
    '  stbV2LocalBuzzer.frequencyHz = 0;',
    '}',
    '',
    'void stbV2LocalPlayTone(uint16_t frequencyHz, unsigned long durationMs) {',
    '  stbV2LocalBuzzerOn(frequencyHz);',
    '  if (durationMs > 0UL) {',
    '    delay(durationMs);',
    '    stbV2LocalBuzzerOff();',
    '  }',
    '}',
    '',
    'void stbV2LocalPlayNote(const String& note, unsigned long durationMs) {',
    '  stbV2LocalPlayTone(stbV2LocalNoteFrequency(note), durationMs);',
    '}',
    '',
    'bool stbV2LocalBuzzerActive() { return stbV2LocalBuzzer.active; }',
    'uint16_t stbV2LocalBuzzerFrequency() { return stbV2LocalBuzzer.frequencyHz; }',
    '',
    'int stbV2LocalReadLightRaw() { return analogRead(STB_V2_LOCAL_LDR_PIN); }',
    '',
    'float stbV2LocalReadLightPercent() {',
    '  int raw = constrain(stbV2LocalReadLightRaw(), 0, 1023);',
    '  return ((1023.0f - static_cast<float>(raw)) * 100.0f) / 1023.0f;',
    '}',
    '',
    'bool stbV2LocalHasBrightLight() { return stbV2LocalReadLightPercent() >= 70.0f; }',
    'bool stbV2LocalHasLowLight() { return stbV2LocalReadLightPercent() <= 30.0f; }',
    '',
    'int stbV2LocalReadTemperatureRaw() { return analogRead(STB_V2_LOCAL_LM335_PIN); }',
    'float stbV2LocalReadTemperatureVoltage() { return (static_cast<float>(stbV2LocalReadTemperatureRaw()) * 5.0f) / 1023.0f; }',
    'float stbV2LocalReadTemperatureKelvin() { return stbV2LocalReadTemperatureVoltage() * 100.0f; }',
    'float stbV2LocalReadTemperatureCelsius() { return stbV2LocalReadTemperatureKelvin() - 273.15f; }',
    'bool stbV2LocalIsHot() { return stbV2LocalReadTemperatureCelsius() >= 30.0f; }',
    'bool stbV2LocalIsCold() { return stbV2LocalReadTemperatureCelsius() <= 20.0f; }',
    '',
    'int stbV2LocalReadMicrophoneRaw() { return analogRead(stbV2LocalMicrophone.pin); }',
    '',
    'void stbV2LocalCalibrateMicrophone() {',
    '  const uint16_t samples = 200;',
    '  uint32_t total = 0UL;',
    '  for (uint16_t i = 0; i < samples; ++i) {',
    '    total += static_cast<uint32_t>(stbV2LocalReadMicrophoneRaw());',
    '    delay(2);',
    '  }',
    '  stbV2LocalMicrophone.baselineRaw = static_cast<uint16_t>(total / samples);',
    '  stbV2LocalMicrophone.calibrated = true;',
    '}',
    '',
    'bool stbV2LocalMicrophoneCalibrated() { return stbV2LocalMicrophone.calibrated; }',
    '',
    'float stbV2LocalReadSoundLevelPercent() {',
    '  int raw = stbV2LocalReadMicrophoneRaw();',
    '  int baseline = stbV2LocalMicrophone.calibrated ? stbV2LocalMicrophone.baselineRaw : 512;',
    '  int deviation = abs(raw - baseline);',
    '  float percent = (static_cast<float>(deviation) * 100.0f) / 512.0f;',
    '  if (percent < 0.0f) { percent = 0.0f; }',
    '  if (percent > 100.0f) { percent = 100.0f; }',
    '  return percent;',
    '}',
    '',
    'bool stbV2LocalHasLoudSound() { return stbV2LocalReadSoundLevelPercent() >= 60.0f; }',
    'bool stbV2LocalHasLowSound() { return stbV2LocalReadSoundLevelPercent() <= 15.0f; }',
    '',
    'HardwareSerial& stbV2LocalBluetoothPort() { return Serial2; }',
    '',
    'void stbV2LocalBluetoothBegin(unsigned long baudRate) {',
    '  if (baudRate == 0UL) { baudRate = 9600UL; }',
    '  stbV2LocalBluetoothPort().begin(baudRate);',
    '  stbV2LocalBluetooth.started = true;',
    '  stbV2LocalBluetooth.baudRate = baudRate;',
    '}',
    '',
    'void stbV2LocalBluetoothEnd() {',
    '  if (stbV2LocalBluetooth.started) {',
    '    stbV2LocalBluetoothPort().end();',
    '  }',
    '  stbV2LocalBluetooth.started = false;',
    '  stbV2LocalBluetooth.baudRate = 0UL;',
    '}',
    '',
    'bool stbV2LocalBluetoothStarted() { return stbV2LocalBluetooth.started; }',
    'int stbV2LocalBluetoothAvailable() { return stbV2LocalBluetooth.started ? stbV2LocalBluetoothPort().available() : 0; }',
    'bool stbV2LocalBluetoothHasData() { return stbV2LocalBluetoothAvailable() > 0; }',
    '',
    'void stbV2LocalBluetoothPrint(const String& text) {',
    '  if (!stbV2LocalBluetooth.started) { stbV2LocalBluetoothBegin(9600UL); }',
    '  stbV2LocalBluetoothPort().print(text);',
    '}',
    '',
    'void stbV2LocalBluetoothPrintLine(const String& text) {',
    '  if (!stbV2LocalBluetooth.started) { stbV2LocalBluetoothBegin(9600UL); }',
    '  stbV2LocalBluetoothPort().println(text);',
    '}',
    '',
    'void stbV2LocalBluetoothWriteByte(uint8_t value) {',
    '  if (!stbV2LocalBluetooth.started) { stbV2LocalBluetoothBegin(9600UL); }',
    '  stbV2LocalBluetoothPort().write(value);',
    '}',
    '',
    'int stbV2LocalBluetoothReadByte() {',
    '  if (!stbV2LocalBluetooth.started || !stbV2LocalBluetoothHasData()) { return -1; }',
    '  return stbV2LocalBluetoothPort().read();',
    '}',
    '',
    'String stbV2LocalBluetoothReadString() {',
    '  if (!stbV2LocalBluetooth.started || !stbV2LocalBluetoothHasData()) { return String(""); }',
    '  return stbV2LocalBluetoothPort().readString();',
    '}',
    '',
    'String stbV2LocalBluetoothReadLine() {',
    '  if (!stbV2LocalBluetooth.started || !stbV2LocalBluetoothHasData()) { return String(""); }',
    '  return stbV2LocalBluetoothPort().readStringUntil(\'\\n\');',
    '}',
    '',
    'void stbV2LocalBluetoothClearBuffer() {',
    '  while (stbV2LocalBluetoothHasData()) {',
    '    stbV2LocalBluetoothPort().read();',
    '  }',
    '}',
    '',
    'void stbV2LocalInitRuntime() {',
    '  if (stbV2LocalRuntimeInitialized) { return; }',
    '  for (uint8_t i = 0; i < 6; ++i) {',
    '    pinMode(stbV2LocalButtons[i].pin, INPUT);',
    '  }',
    '  pinMode(stbV2LocalInfrared.receiverPin, INPUT);',
    '  pinMode(stbV2LocalInfrared.emitterPin, OUTPUT);',
    '  digitalWrite(stbV2LocalInfrared.emitterPin, LOW);',
    '  pinMode(stbV2LocalBuzzer.pin, OUTPUT);',
    '  noTone(stbV2LocalBuzzer.pin);',
    '  stbV2LocalUpdateButtons();',
    '  stbV2LocalUpdateInfrared();',
    '  stbV2LocalRuntimeInitialized = true;',
    '}',
    '',
    'void stbV2LocalRuntimeTick() {',
    '  if (!stbV2LocalRuntimeInitialized) { return; }',
    '  stbV2LocalUpdateButtons();',
    '  stbV2LocalUpdateInfrared();',
    '}'
  ].join('\n');

  Blockly.Arduino.setups_['stb_v2_local_runtime_setup'] = 'stbV2LocalInitRuntime();';
  Blockly.Arduino.loops_['stb_v2_local_runtime_loop'] = 'stbV2LocalRuntimeTick();';
    }

    function ensureStbV2LocalUtilsRuntime () {
Blockly.Arduino.definitions_['stb_v2_local_utils_runtime'] = [
    'unsigned long stbV2LocalDurationMs(float value, const String& unit) {',
    '  if (value < 0.0f) { value = 0.0f; }',
    '  return unit == "SECONDS" ? static_cast<unsigned long>(value * 1000.0f) : static_cast<unsigned long>(value);',
    '}',
    '',
    'bool stbV2LocalCompareFloat(float leftValue, const String& comparison, float rightValue) {',
    '  if (comparison == "GT") { return leftValue > rightValue; }',
    '  if (comparison == "LT") { return leftValue < rightValue; }',
    '  if (comparison == "GTE") { return leftValue >= rightValue; }',
    '  if (comparison == "LTE") { return leftValue <= rightValue; }',
    '  if (comparison == "EQ") { return fabsf(leftValue - rightValue) <= 0.01f; }',
    '  if (comparison == "NEQ") { return fabsf(leftValue - rightValue) > 0.01f; }',
    '  return false;',
    '}'
  ].join('\n');
    }

    function ensureStbV2ButtonsRuntime () {
Blockly.Arduino.definitions_['stb_v2_buttons_runtime'] = [
    'struct STBV2ButtonState { uint8_t pin; bool currentPressed; bool lastRawPressed; unsigned long lastChangeMs; uint32_t pressCount; };',
    'const unsigned long STB_V2_BUTTON_DEBOUNCE_MS = 20UL;',
    'bool stbV2ButtonsInitialized = false;',
    'STBV2ButtonState stbV2Buttons[6] = {{38,false,false,0UL,0UL},{39,false,false,0UL,0UL},{40,false,false,0UL,0UL},{41,false,false,0UL,0UL},{42,false,false,0UL,0UL},{43,false,false,0UL,0UL}};',
    'int8_t stbV2ButtonIndexFromName(const String& buttonName) { if (buttonName == "B1") return 0; if (buttonName == "B2") return 1; if (buttonName == "B3") return 2; if (buttonName == "B4") return 3; if (buttonName == "B5") return 4; if (buttonName == "B6") return 5; return -1; }',
    'void stbV2ButtonsTick() { unsigned long now = millis(); for (uint8_t i = 0; i < 6; ++i) { STBV2ButtonState &button = stbV2Buttons[i]; bool rawPressed = digitalRead(button.pin) == HIGH; if (rawPressed != button.lastRawPressed) { button.lastRawPressed = rawPressed; button.lastChangeMs = now; } if ((now - button.lastChangeMs) >= STB_V2_BUTTON_DEBOUNCE_MS && button.currentPressed != rawPressed) { button.currentPressed = rawPressed; if (button.currentPressed) { button.pressCount++; } } } }',
    'void stbV2ButtonsInit() { if (stbV2ButtonsInitialized) return; for (uint8_t i = 0; i < 6; ++i) { pinMode(stbV2Buttons[i].pin, INPUT); } stbV2ButtonsTick(); stbV2ButtonsInitialized = true; }',
    'bool stbV2ReadButton(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return false; stbV2ButtonsTick(); return stbV2Buttons[index].currentPressed; }',
    'uint32_t stbV2GetButtonCount(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return 0; stbV2ButtonsTick(); return stbV2Buttons[index].pressCount; }',
    'void stbV2ResetButtonCount(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return; stbV2Buttons[index].pressCount = 0; }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_buttons_setup'] = 'stbV2ButtonsInit();';
  Blockly.Arduino.loops_['stb_v2_buttons_loop'] = 'stbV2ButtonsTick();';
    }

    function ensureStbV2ButtonsBase () {
Blockly.Arduino.definitions_['stb_v2_buttons_base'] = [
    'struct STBV2ButtonState { uint8_t pin; bool currentPressed; bool lastRawPressed; unsigned long lastChangeMs; uint32_t pressCount; };',
    'const unsigned long STB_V2_BUTTON_DEBOUNCE_MS = 20UL;',
    'bool stbV2ButtonsInitialized = false;',
    'STBV2ButtonState stbV2Buttons[6] = {{38,false,false,0UL,0UL},{39,false,false,0UL,0UL},{40,false,false,0UL,0UL},{41,false,false,0UL,0UL},{42,false,false,0UL,0UL},{43,false,false,0UL,0UL}};',
    'int8_t stbV2ButtonIndexFromName(const String& buttonName) { if (buttonName == "B1") return 0; if (buttonName == "B2") return 1; if (buttonName == "B3") return 2; if (buttonName == "B4") return 3; if (buttonName == "B5") return 4; if (buttonName == "B6") return 5; return -1; }',
    'void stbV2ButtonsTick() { unsigned long now = millis(); for (uint8_t i = 0; i < 6; ++i) { STBV2ButtonState &button = stbV2Buttons[i]; bool rawPressed = digitalRead(button.pin) == HIGH; if (rawPressed != button.lastRawPressed) { button.lastRawPressed = rawPressed; button.lastChangeMs = now; } if ((now - button.lastChangeMs) >= STB_V2_BUTTON_DEBOUNCE_MS && button.currentPressed != rawPressed) { button.currentPressed = rawPressed; if (button.currentPressed) { button.pressCount++; } } } }',
    'void stbV2ButtonsInit() { if (stbV2ButtonsInitialized) return; for (uint8_t i = 0; i < 6; ++i) { pinMode(stbV2Buttons[i].pin, INPUT); } stbV2ButtonsTick(); stbV2ButtonsInitialized = true; }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_buttons_setup'] = 'stbV2ButtonsInit();';
  Blockly.Arduino.loops_['stb_v2_buttons_loop'] = 'stbV2ButtonsTick();';
    }

    function ensureStbV2ButtonsReadHelper () {
ensureStbV2ButtonsBase();
  Blockly.Arduino.definitions_['stb_v2_buttons_read'] = 'bool stbV2ReadButton(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return false; stbV2ButtonsTick(); return stbV2Buttons[index].currentPressed; }';
    }

    function ensureStbV2ButtonsCountHelper () {
ensureStbV2ButtonsBase();
  Blockly.Arduino.definitions_['stb_v2_buttons_count'] = 'uint32_t stbV2GetButtonCount(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return 0; stbV2ButtonsTick(); return stbV2Buttons[index].pressCount; }';
    }

    function ensureStbV2ButtonsResetHelper () {
ensureStbV2ButtonsBase();
  Blockly.Arduino.definitions_['stb_v2_buttons_reset'] = 'void stbV2ResetButtonCount(const String& buttonName) { int8_t index = stbV2ButtonIndexFromName(buttonName); if (index < 0) return; stbV2Buttons[index].pressCount = 0; }';
    }

    function ensureStbV2InfraredRuntime () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_infrared_runtime'] = [
    'struct STBV2InfraredState { uint8_t receiverPin; uint8_t emitterPin; bool receiverDetected; bool lastRawDetected; bool emitterActive; unsigned long lastChangeMs; uint32_t detectionCount; };',
    'const unsigned long STB_V2_IR_DEBOUNCE_MS = 5UL;',
    'bool stbV2InfraredInitialized = false;',
    'STBV2InfraredState stbV2Infrared = {13, 44, false, false, false, 0UL, 0UL};',
    'void stbV2InfraredTick() { bool rawDetected = digitalRead(stbV2Infrared.receiverPin) == HIGH; unsigned long now = millis(); if (rawDetected != stbV2Infrared.lastRawDetected) { stbV2Infrared.lastRawDetected = rawDetected; stbV2Infrared.lastChangeMs = now; } if ((now - stbV2Infrared.lastChangeMs) >= STB_V2_IR_DEBOUNCE_MS && rawDetected != stbV2Infrared.receiverDetected) { stbV2Infrared.receiverDetected = rawDetected; if (rawDetected) { stbV2Infrared.detectionCount++; } } }',
    'void stbV2InfraredInit() { if (stbV2InfraredInitialized) return; pinMode(stbV2Infrared.receiverPin, INPUT); pinMode(stbV2Infrared.emitterPin, OUTPUT); digitalWrite(stbV2Infrared.emitterPin, LOW); stbV2InfraredTick(); stbV2InfraredInitialized = true; }',
    'bool stbV2InfraredDetected() { stbV2InfraredTick(); return stbV2Infrared.receiverDetected; }',
    'uint32_t stbV2GetInfraredDetectionCount() { stbV2InfraredTick(); return stbV2Infrared.detectionCount; }',
    'void stbV2ResetInfraredDetectionCount() { stbV2Infrared.detectionCount = 0; }',
    'void stbV2SetInfraredEmitter(bool active) { stbV2Infrared.emitterActive = active; digitalWrite(stbV2Infrared.emitterPin, active ? HIGH : LOW); }',
    'bool stbV2InfraredEmitterActive() { return stbV2Infrared.emitterActive; }',
    'uint32_t stbV2MeasureInfraredPulses(unsigned long durationMs) { if (durationMs == 0UL) return 0UL; unsigned long startMs = millis(); bool lastState = stbV2InfraredDetected(); uint32_t pulseCount = 0UL; while ((millis() - startMs) < durationMs) { stbV2InfraredTick(); bool currentState = stbV2Infrared.receiverDetected; if (currentState && !lastState) { pulseCount++; } lastState = currentState; } return pulseCount; }',
    'void stbV2EmitInfraredPulses(uint32_t pulseCount, unsigned long durationMs) { if (pulseCount == 0UL) { stbV2SetInfraredEmitter(false); return; } if (durationMs == 0UL) { durationMs = pulseCount; } unsigned long totalUs = durationMs * 1000UL; unsigned long periodUs = totalUs / pulseCount; if (periodUs < 2UL) { periodUs = 2UL; } unsigned long onUs = periodUs / 2UL; unsigned long offUs = periodUs - onUs; if (onUs == 0UL) { onUs = 1UL; } if (offUs == 0UL) { offUs = 1UL; } for (uint32_t i = 0; i < pulseCount; ++i) { stbV2SetInfraredEmitter(true); delayMicroseconds(static_cast<unsigned int>(onUs)); stbV2SetInfraredEmitter(false); if (i + 1UL < pulseCount) { delayMicroseconds(static_cast<unsigned int>(offUs)); } } stbV2SetInfraredEmitter(false); }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_infrared_setup'] = 'stbV2InfraredInit();';
  Blockly.Arduino.loops_['stb_v2_infrared_loop'] = 'stbV2InfraredTick();';
    }

    function ensureStbV2InfraredBase () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_infrared_base'] = [
    'struct STBV2InfraredState { uint8_t receiverPin; uint8_t emitterPin; bool receiverDetected; bool lastRawDetected; bool emitterActive; unsigned long lastChangeMs; uint32_t detectionCount; };',
    'const unsigned long STB_V2_IR_DEBOUNCE_MS = 5UL;',
    'bool stbV2InfraredInitialized = false;',
    'STBV2InfraredState stbV2Infrared = {13, 44, false, false, false, 0UL, 0UL};',
    'void stbV2InfraredTick() { bool rawDetected = digitalRead(stbV2Infrared.receiverPin) == HIGH; unsigned long now = millis(); if (rawDetected != stbV2Infrared.lastRawDetected) { stbV2Infrared.lastRawDetected = rawDetected; stbV2Infrared.lastChangeMs = now; } if ((now - stbV2Infrared.lastChangeMs) >= STB_V2_IR_DEBOUNCE_MS && rawDetected != stbV2Infrared.receiverDetected) { stbV2Infrared.receiverDetected = rawDetected; if (rawDetected) { stbV2Infrared.detectionCount++; } } }',
    'void stbV2InfraredInit() { if (stbV2InfraredInitialized) return; pinMode(stbV2Infrared.receiverPin, INPUT); pinMode(stbV2Infrared.emitterPin, OUTPUT); digitalWrite(stbV2Infrared.emitterPin, LOW); stbV2InfraredTick(); stbV2InfraredInitialized = true; }'
  ].join('\n');
    }

    function ensureStbV2InfraredDetectHelper () {
ensureStbV2InfraredBase();
  Blockly.Arduino.definitions_['stb_v2_infrared_detect'] = 'bool stbV2InfraredDetected() { stbV2InfraredInit(); stbV2InfraredTick(); return stbV2Infrared.receiverDetected; }';
    }

    function ensureStbV2InfraredCountHelpers () {
ensureStbV2InfraredBase();
  Blockly.Arduino.definitions_['stb_v2_infrared_count'] = [
    'uint32_t stbV2GetInfraredDetectionCount() { stbV2InfraredInit(); stbV2InfraredTick(); return stbV2Infrared.detectionCount; }',
    'void stbV2ResetInfraredDetectionCount() { stbV2InfraredInit(); stbV2Infrared.detectionCount = 0; }'
  ].join('\n');
    }

    function ensureStbV2InfraredEmitterHelpers () {
ensureOpenBlockCooperativeDelay();
  ensureStbV2InfraredBase();
  Blockly.Arduino.definitions_['stb_v2_infrared_emitter'] = [
    'void stbV2SetInfraredEmitter(bool active) { stbV2InfraredInit(); stbV2Infrared.emitterActive = active; digitalWrite(stbV2Infrared.emitterPin, active ? HIGH : LOW); }',
    'bool stbV2InfraredEmitterActive() { stbV2InfraredInit(); return stbV2Infrared.emitterActive; }'
  ].join('\n');
    }

    function ensureStbV2InfraredPulseHelpers () {
ensureStbV2InfraredDetectHelper();
  ensureStbV2InfraredEmitterHelpers();
  Blockly.Arduino.definitions_['stb_v2_infrared_pulses'] = [
    'uint32_t stbV2MeasureInfraredPulses(unsigned long durationMs) { if (durationMs == 0UL) return 0UL; unsigned long startMs = millis(); bool lastState = stbV2InfraredDetected(); uint32_t pulseCount = 0UL; while ((millis() - startMs) < durationMs) { stbV2InfraredTick(); bool currentState = stbV2Infrared.receiverDetected; if (currentState && !lastState) { pulseCount++; } lastState = currentState; } return pulseCount; }',
    'void stbV2EmitInfraredPulses(uint32_t pulseCount, unsigned long durationMs) { if (pulseCount == 0UL) { stbV2SetInfraredEmitter(false); return; } if (durationMs == 0UL) { durationMs = pulseCount; } unsigned long totalUs = durationMs * 1000UL; unsigned long periodUs = totalUs / pulseCount; if (periodUs < 2UL) { periodUs = 2UL; } unsigned long onUs = periodUs / 2UL; unsigned long offUs = periodUs - onUs; if (onUs == 0UL) { onUs = 1UL; } if (offUs == 0UL) { offUs = 1UL; } for (uint32_t i = 0; i < pulseCount; ++i) { stbV2SetInfraredEmitter(true); delayMicroseconds(static_cast<unsigned int>(onUs)); stbV2SetInfraredEmitter(false); if (i + 1UL < pulseCount) { delayMicroseconds(static_cast<unsigned int>(offUs)); } } stbV2SetInfraredEmitter(false); }'
  ].join('\n');
    }

    function ensureStbV2BuzzerRuntime () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_buzzer_runtime'] = [
    'struct STBV2BuzzerState { uint8_t pin; bool active; uint16_t frequencyHz; };',
    'bool stbV2BuzzerInitialized = false;',
    'STBV2BuzzerState stbV2Buzzer = {12, false, 0};',
    'void stbV2BuzzerInit() { if (stbV2BuzzerInitialized) return; pinMode(stbV2Buzzer.pin, OUTPUT); noTone(stbV2Buzzer.pin); stbV2BuzzerInitialized = true; }',
    'uint16_t stbV2NoteFrequency(const String& note) { if (note == "C4") return 262; if (note == "D4") return 294; if (note == "E4") return 330; if (note == "F4") return 349; if (note == "G4") return 392; if (note == "A4") return 440; if (note == "B4") return 494; if (note == "C5") return 523; return 440; }',
    'void stbV2BuzzerOn(uint16_t frequencyHz) { stbV2BuzzerInit(); if (frequencyHz == 0) { frequencyHz = 440; } tone(stbV2Buzzer.pin, frequencyHz); stbV2Buzzer.active = true; stbV2Buzzer.frequencyHz = frequencyHz; }',
    'void stbV2BuzzerOff() { stbV2BuzzerInit(); noTone(stbV2Buzzer.pin); stbV2Buzzer.active = false; stbV2Buzzer.frequencyHz = 0; }',
    'void stbV2PlayTone(uint16_t frequencyHz, unsigned long durationMs) { stbV2BuzzerOn(frequencyHz); if (durationMs > 0UL) { openBlockCooperativeDelay(durationMs); stbV2BuzzerOff(); } }',
    'void stbV2PlayNote(const String& note, unsigned long durationMs) { stbV2PlayTone(stbV2NoteFrequency(note), durationMs); }',
    'bool stbV2BuzzerActive() { return stbV2Buzzer.active; }',
    'uint16_t stbV2BuzzerFrequency() { return stbV2Buzzer.frequencyHz; }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_buzzer_setup'] = 'stbV2BuzzerInit();';
    }

    function ensureStbV2BuzzerBase () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_buzzer_base'] = [
    'struct STBV2BuzzerState { uint8_t pin; bool active; uint16_t frequencyHz; };',
    'bool stbV2BuzzerInitialized = false;',
    'STBV2BuzzerState stbV2Buzzer = {12, false, 0};',
    'void stbV2BuzzerInit() { if (stbV2BuzzerInitialized) return; pinMode(stbV2Buzzer.pin, OUTPUT); noTone(stbV2Buzzer.pin); stbV2BuzzerInitialized = true; }',
    'uint16_t stbV2NoteFrequency(const String& note) { if (note == "C4") return 262; if (note == "D4") return 294; if (note == "E4") return 330; if (note == "F4") return 349; if (note == "G4") return 392; if (note == "A4") return 440; if (note == "B4") return 494; if (note == "C5") return 523; return 440; }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_buzzer_setup'] = 'stbV2BuzzerInit();';
    }

    function ensureStbV2BuzzerOnOffHelpers () {
ensureOpenBlockCooperativeDelay();
  ensureStbV2BuzzerBase();
  Blockly.Arduino.definitions_['stb_v2_buzzer_onoff'] = [
    'void stbV2BuzzerOn(uint16_t frequencyHz) { stbV2BuzzerInit(); if (frequencyHz == 0) { frequencyHz = 440; } tone(stbV2Buzzer.pin, frequencyHz); stbV2Buzzer.active = true; stbV2Buzzer.frequencyHz = frequencyHz; }',
    'void stbV2BuzzerOff() { stbV2BuzzerInit(); noTone(stbV2Buzzer.pin); stbV2Buzzer.active = false; stbV2Buzzer.frequencyHz = 0; }'
  ].join('\n');
    }

    function ensureStbV2BuzzerPlayToneHelper () {
ensureStbV2BuzzerOnOffHelpers();
  Blockly.Arduino.definitions_['stb_v2_buzzer_play_tone'] = 'void stbV2PlayTone(uint16_t frequencyHz, unsigned long durationMs) { stbV2BuzzerOn(frequencyHz); if (durationMs > 0UL) { openBlockCooperativeDelay(durationMs); stbV2BuzzerOff(); } }';
    }

    function ensureStbV2BuzzerPlayNoteHelper () {
ensureStbV2BuzzerPlayToneHelper();
  Blockly.Arduino.definitions_['stb_v2_buzzer_play_note'] = 'void stbV2PlayNote(const String& note, unsigned long durationMs) { stbV2PlayTone(stbV2NoteFrequency(note), durationMs); }';
    }

    function ensureStbV2BuzzerStateHelpers () {
ensureStbV2BuzzerBase();
  Blockly.Arduino.definitions_['stb_v2_buzzer_state'] = [
    'bool stbV2BuzzerActive() { return stbV2Buzzer.active; }',
    'uint16_t stbV2BuzzerFrequency() { return stbV2Buzzer.frequencyHz; }'
  ].join('\n');
    }

    function ensureStbV2LightRuntime () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_light_runtime'] = [
    'const uint8_t STB_V2_LDR_PIN = A15;',
    'int stbV2ReadLightRaw() { return analogRead(STB_V2_LDR_PIN); }',
    'float stbV2ReadLightPercent() { int raw = constrain(stbV2ReadLightRaw(), 0, 1023); return ((1023.0f - static_cast<float>(raw)) * 100.0f) / 1023.0f; }',
    'bool stbV2HasBrightLight() { return stbV2ReadLightPercent() >= 70.0f; }',
    'bool stbV2HasLowLight() { return stbV2ReadLightPercent() <= 30.0f; }'
  ].join('\n');
    }

    function ensureStbV2LightBase () {
Blockly.Arduino.definitions_['stb_v2_light_base'] = [
    'const uint8_t STB_V2_LDR_PIN = A15;',
    'int stbV2ReadLightRaw() { return analogRead(STB_V2_LDR_PIN); }'
  ].join('\n');
    }

    function ensureStbV2LightPercentHelper () {
ensureStbV2LightBase();
  Blockly.Arduino.definitions_['stb_v2_light_percent'] = 'float stbV2ReadLightPercent() { int raw = constrain(stbV2ReadLightRaw(), 0, 1023); return ((1023.0f - static_cast<float>(raw)) * 100.0f) / 1023.0f; }';
    }

    function ensureStbV2LightStateHelpers () {
ensureStbV2LightPercentHelper();
  Blockly.Arduino.definitions_['stb_v2_light_state'] = [
    'bool stbV2HasBrightLight() { return stbV2ReadLightPercent() >= 70.0f; }',
    'bool stbV2HasLowLight() { return stbV2ReadLightPercent() <= 30.0f; }'
  ].join('\n');
    }

    function ensureStbV2TemperatureRuntime () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_temperature_runtime'] = [
    'const uint8_t STB_V2_LM335_PIN = A14;',
    'int stbV2ReadTemperatureRaw() { return analogRead(STB_V2_LM335_PIN); }',
    'float stbV2ReadTemperatureVoltage() { return (static_cast<float>(stbV2ReadTemperatureRaw()) * 5.0f) / 1023.0f; }',
    'float stbV2ReadTemperatureKelvin() { return stbV2ReadTemperatureVoltage() * 100.0f; }',
    'float stbV2ReadTemperatureCelsius() { return stbV2ReadTemperatureKelvin() - 273.15f; }',
    'bool stbV2IsHot() { return stbV2ReadTemperatureCelsius() >= 30.0f; }',
    'bool stbV2IsCold() { return stbV2ReadTemperatureCelsius() <= 20.0f; }'
  ].join('\n');
    }

    function ensureStbV2TemperatureBase () {
Blockly.Arduino.definitions_['stb_v2_temperature_base'] = [
    'const uint8_t STB_V2_LM335_PIN = A14;',
    'int stbV2ReadTemperatureRaw() { return analogRead(STB_V2_LM335_PIN); }',
    'float stbV2ReadTemperatureVoltage() { return (static_cast<float>(stbV2ReadTemperatureRaw()) * 5.0f) / 1023.0f; }'
  ].join('\n');
    }

    function ensureStbV2TemperatureKelvinHelper () {
ensureStbV2TemperatureBase();
  Blockly.Arduino.definitions_['stb_v2_temperature_kelvin'] = 'float stbV2ReadTemperatureKelvin() { return stbV2ReadTemperatureVoltage() * 100.0f; }';
    }

    function ensureStbV2TemperatureCelsiusHelper () {
ensureStbV2TemperatureKelvinHelper();
  Blockly.Arduino.definitions_['stb_v2_temperature_celsius'] = 'float stbV2ReadTemperatureCelsius() { return stbV2ReadTemperatureKelvin() - 273.15f; }';
    }

    function ensureStbV2TemperatureStateHelpers () {
ensureStbV2TemperatureCelsiusHelper();
  Blockly.Arduino.definitions_['stb_v2_temperature_state'] = [
    'bool stbV2IsHot() { return stbV2ReadTemperatureCelsius() >= 30.0f; }',
    'bool stbV2IsCold() { return stbV2ReadTemperatureCelsius() <= 20.0f; }'
  ].join('\n');
    }

    function ensureStbV2MicrophoneRuntime () {
ensureStbV2LocalUtilsRuntime();
  Blockly.Arduino.definitions_['stb_v2_microphone_runtime'] = [
    'struct STBV2MicrophoneState { uint8_t pin; bool calibrated; uint16_t baselineRaw; };',
    'STBV2MicrophoneState stbV2Microphone = {A13, false, 0};',
    'int stbV2ReadMicrophoneRaw() { return analogRead(stbV2Microphone.pin); }',
    'void stbV2CalibrateMicrophone() { const uint16_t samples = 200; uint32_t total = 0UL; for (uint16_t i = 0; i < samples; ++i) { total += static_cast<uint32_t>(stbV2ReadMicrophoneRaw()); delay(2); } stbV2Microphone.baselineRaw = static_cast<uint16_t>(total / samples); stbV2Microphone.calibrated = true; }',
    'bool stbV2MicrophoneCalibrated() { return stbV2Microphone.calibrated; }',
    'float stbV2ReadSoundLevelPercent() { int raw = stbV2ReadMicrophoneRaw(); int baseline = stbV2Microphone.calibrated ? stbV2Microphone.baselineRaw : 512; int deviation = abs(raw - baseline); float percent = (static_cast<float>(deviation) * 100.0f) / 512.0f; if (percent < 0.0f) { percent = 0.0f; } if (percent > 100.0f) { percent = 100.0f; } return percent; }',
    'bool stbV2HasLoudSound() { return stbV2ReadSoundLevelPercent() >= 60.0f; }',
    'bool stbV2HasLowSound() { return stbV2ReadSoundLevelPercent() <= 15.0f; }'
  ].join('\n');
    }

    function ensureStbV2MicrophoneBase () {
Blockly.Arduino.definitions_['stb_v2_microphone_base'] = [
    'struct STBV2MicrophoneState { uint8_t pin; bool calibrated; uint16_t baselineRaw; };',
    'STBV2MicrophoneState stbV2Microphone = {A13, false, 0};',
    'int stbV2ReadMicrophoneRaw() { return analogRead(stbV2Microphone.pin); }'
  ].join('\n');
    }

    function ensureStbV2MicrophoneCalibrateHelper () {
ensureStbV2MicrophoneBase();
  Blockly.Arduino.definitions_['stb_v2_microphone_calibrate'] = [
    'void stbV2CalibrateMicrophone() { const uint16_t samples = 200; uint32_t total = 0UL; for (uint16_t i = 0; i < samples; ++i) { total += static_cast<uint32_t>(stbV2ReadMicrophoneRaw()); delay(2); } stbV2Microphone.baselineRaw = static_cast<uint16_t>(total / samples); stbV2Microphone.calibrated = true; }',
    'bool stbV2MicrophoneCalibrated() { return stbV2Microphone.calibrated; }'
  ].join('\n');
    }

    function ensureStbV2MicrophoneSoundLevelHelper () {
ensureStbV2MicrophoneBase();
  Blockly.Arduino.definitions_['stb_v2_microphone_sound_level'] = 'float stbV2ReadSoundLevelPercent() { int raw = stbV2ReadMicrophoneRaw(); int baseline = stbV2Microphone.calibrated ? stbV2Microphone.baselineRaw : 512; int deviation = abs(raw - baseline); float percent = (static_cast<float>(deviation) * 100.0f) / 512.0f; if (percent < 0.0f) { percent = 0.0f; } if (percent > 100.0f) { percent = 100.0f; } return percent; }';
    }

    function ensureStbV2MicrophoneStateHelpers () {
ensureStbV2MicrophoneSoundLevelHelper();
  Blockly.Arduino.definitions_['stb_v2_microphone_state'] = [
    'bool stbV2HasLoudSound() { return stbV2ReadSoundLevelPercent() >= 60.0f; }',
    'bool stbV2HasLowSound() { return stbV2ReadSoundLevelPercent() <= 15.0f; }'
  ].join('\n');
    }

    function ensureStbV2BluetoothRuntime () {
Blockly.Arduino.definitions_['stb_v2_bluetooth_runtime'] = [
    'struct STBV2BluetoothState { bool started; unsigned long baudRate; };',
    'STBV2BluetoothState stbV2Bluetooth = {false, 0UL};',
    'HardwareSerial& stbV2BluetoothPort() { return Serial2; }',
    'void stbV2BluetoothBegin(unsigned long baudRate) { if (baudRate == 0UL) { baudRate = 9600UL; } stbV2BluetoothPort().begin(baudRate); stbV2Bluetooth.started = true; stbV2Bluetooth.baudRate = baudRate; }',
    'void stbV2BluetoothEnd() { if (stbV2Bluetooth.started) { stbV2BluetoothPort().end(); } stbV2Bluetooth.started = false; stbV2Bluetooth.baudRate = 0UL; }',
    'bool stbV2BluetoothStarted() { return stbV2Bluetooth.started; }',
    'int stbV2BluetoothAvailable() { return stbV2Bluetooth.started ? stbV2BluetoothPort().available() : 0; }',
    'bool stbV2BluetoothHasData() { return stbV2BluetoothAvailable() > 0; }',
    'void stbV2BluetoothPrint(const String& text) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().print(text); }',
    'void stbV2BluetoothPrintLine(const String& text) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().println(text); }',
    'void stbV2BluetoothWriteByte(uint8_t value) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().write(value); }',
    'int stbV2BluetoothReadByte() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return -1; } return stbV2BluetoothPort().read(); }',
    'String stbV2BluetoothReadString() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return String(""); } return stbV2BluetoothPort().readString(); }',
    'String stbV2BluetoothReadLine() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return String(""); } return stbV2BluetoothPort().readStringUntil(\'\\n\'); }',
    'void stbV2BluetoothClearBuffer() { while (stbV2BluetoothHasData()) { stbV2BluetoothPort().read(); } }'
  ].join('\n');
    }

    function ensureStbV2BluetoothBase () {
Blockly.Arduino.definitions_['stb_v2_bluetooth_base'] = [
    'struct STBV2BluetoothState { bool started; unsigned long baudRate; };',
    'STBV2BluetoothState stbV2Bluetooth = {false, 0UL};',
    'HardwareSerial& stbV2BluetoothPort() { return Serial2; }',
    'void stbV2BluetoothBegin(unsigned long baudRate) { if (baudRate == 0UL) { baudRate = 9600UL; } stbV2BluetoothPort().begin(baudRate); stbV2Bluetooth.started = true; stbV2Bluetooth.baudRate = baudRate; }',
    'void stbV2BluetoothEnd() { if (stbV2Bluetooth.started) { stbV2BluetoothPort().end(); } stbV2Bluetooth.started = false; stbV2Bluetooth.baudRate = 0UL; }',
    'bool stbV2BluetoothStarted() { return stbV2Bluetooth.started; }',
    'int stbV2BluetoothAvailable() { return stbV2Bluetooth.started ? stbV2BluetoothPort().available() : 0; }',
    'bool stbV2BluetoothHasData() { return stbV2BluetoothAvailable() > 0; }'
  ].join('\n');
    }

    function ensureStbV2BluetoothPrintHelpers () {
ensureStbV2BluetoothBase();
  Blockly.Arduino.definitions_['stb_v2_bluetooth_print'] = [
    'void stbV2BluetoothPrint(const String& text) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().print(text); }',
    'void stbV2BluetoothPrintLine(const String& text) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().println(text); }',
    'void stbV2BluetoothWriteByte(uint8_t value) { if (!stbV2Bluetooth.started) { stbV2BluetoothBegin(9600UL); } stbV2BluetoothPort().write(value); }'
  ].join('\n');
    }

    function ensureStbV2BluetoothReadHelpers () {
ensureStbV2BluetoothBase();
  Blockly.Arduino.definitions_['stb_v2_bluetooth_read'] = [
    'int stbV2BluetoothReadByte() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return -1; } return stbV2BluetoothPort().read(); }',
    'String stbV2BluetoothReadString() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return String(""); } return stbV2BluetoothPort().readString(); }',
    'String stbV2BluetoothReadLine() { if (!stbV2Bluetooth.started || !stbV2BluetoothHasData()) { return String(""); } return stbV2BluetoothPort().readStringUntil(\'\\n\'); }',
    'void stbV2BluetoothClearBuffer() { while (stbV2BluetoothHasData()) { stbV2BluetoothPort().read(); } }'
  ].join('\n');
    }

    function ensureStbV2GyroRuntime () {
Blockly.Arduino.includes_.stb_v2_gyro = [
    '#include <Wire.h>',
    '#include <Adafruit_MPU6050.h>',
    '#include <Adafruit_Sensor.h>'
  ].join('\n');

  Blockly.Arduino.definitions_['stb_v2_gyro_runtime'] = [
    'struct STBV2GyroState {',
    '  bool ready;',
    '  bool calibrated;',
    '  bool postureCalibrated;',
    '  uint8_t yawAxis;',
    '  int8_t yawSign;',
    '  float accel[3];',
    '  float gyro[3];',
    '  float gyroBias[3];',
    '  float baselineAccel[3];',
    '  float angleDeg;',
    '  unsigned long lastUpdateMs;',
    '};',
    '',
    'const uint8_t STB_V2_GYRO_AXIS_X = 0;',
    'const uint8_t STB_V2_GYRO_AXIS_Y = 1;',
    'const uint8_t STB_V2_GYRO_AXIS_Z = 2;',
    'const float STB_V2_GYRO_ENCODER_MIN_RATIO = 0.70f;',
    'const float STB_V2_GYRO_ENCODER_MAX_RATIO = 1.30f;',
    'const float STB_V2_GYRO_SHAKE_ACCEL_DELTA = 3.5f;',
    'const float STB_V2_GYRO_SHAKE_RATE_DEG = 120.0f;',
    'const float STB_V2_GYRO_TILT_THRESHOLD_DEG = 18.0f;',
    'const unsigned long STB_V2_GYRO_TURN_TIMEOUT_MS = 8000UL;',
    '',
    'Adafruit_MPU6050 stbV2Mpu;',
    'sensors_event_t stbV2MpuAccelEvent, stbV2MpuGyroEvent, stbV2MpuTempEvent;',
    'STBV2GyroState stbV2Gyro = {false, false, false, STB_V2_GYRO_AXIS_Z, 1, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, 0.0f, 0UL};',
    '',
    'uint8_t stbV2GyroAxisFromText(const String& axis) {',
    '  if (axis == "X") {',
    '    return STB_V2_GYRO_AXIS_X;',
    '  }',
    '  if (axis == "Y") {',
    '    return STB_V2_GYRO_AXIS_Y;',
    '  }',
    '  return STB_V2_GYRO_AXIS_Z;',
    '}',
    '',
    'float stbV2GyroArrayValue(const float values[3], uint8_t axis) {',
    '  if (axis > 2) {',
    '    return 0.0f;',
    '  }',
    '  return values[axis];',
    '}',
    '',
    'float stbV2GyroVectorMagnitude(const float values[3]) {',
    '  return sqrtf((values[0] * values[0]) + (values[1] * values[1]) + (values[2] * values[2]));',
    '}',
    '',
    'float stbV2GyroVectorDot(const float a[3], const float b[3]) {',
    '  return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);',
    '}',
    '',
    'float stbV2GetYawRateDeg() {',
    '  float corrected[3] = {',
    '    stbV2Gyro.gyro[0] - stbV2Gyro.gyroBias[0],',
    '    stbV2Gyro.gyro[1] - stbV2Gyro.gyroBias[1],',
    '    stbV2Gyro.gyro[2] - stbV2Gyro.gyroBias[2]',
    '  };',
    '  if (stbV2Gyro.postureCalibrated) {',
    '    float gravity[3] = {stbV2Gyro.accel[0], stbV2Gyro.accel[1], stbV2Gyro.accel[2]};',
    '    float gravityMag = stbV2GyroVectorMagnitude(gravity);',
    '    if (gravityMag < 6.0f || gravityMag > 13.5f) {',
    '      gravity[0] = stbV2Gyro.baselineAccel[0];',
    '      gravity[1] = stbV2Gyro.baselineAccel[1];',
    '      gravity[2] = stbV2Gyro.baselineAccel[2];',
    '      gravityMag = stbV2GyroVectorMagnitude(gravity);',
    '    }',
    '    if (gravityMag > 0.001f) {',
    '      return (stbV2GyroVectorDot(corrected, gravity) / gravityMag) * 57.2957795f * static_cast<float>(stbV2Gyro.yawSign);',
    '    }',
    '  }',
    '  float axisRateRad = stbV2GyroArrayValue(corrected, stbV2Gyro.yawAxis);',
    '  return axisRateRad * 57.2957795f * static_cast<float>(stbV2Gyro.yawSign);',
    '}',
    '',
    'bool stbV2InitGyroHardware() {',
    '  if (stbV2Gyro.ready) {',
    '    return true;',
    '  }',
    '  Wire.begin();',
    '  if (!stbV2Mpu.begin()) {',
    '    stbV2Gyro.ready = false;',
    '    return false;',
    '  }',
    '  stbV2Mpu.setAccelerometerRange(MPU6050_RANGE_4_G);',
    '  stbV2Mpu.setGyroRange(MPU6050_RANGE_500_DEG);',
    '  stbV2Mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);',
    '  stbV2Gyro.ready = true;',
    '  stbV2Gyro.lastUpdateMs = millis();',
    '  return true;',
    '}',
    '',
    'void stbV2ConfigureGyro(const String& axis, bool inverted) {',
    '  stbV2InitGyroHardware();',
    '  stbV2Gyro.yawAxis = stbV2GyroAxisFromText(axis);',
    '  stbV2Gyro.yawSign = inverted ? -1 : 1;',
    '}',
    '',
    'void stbV2ResetGyroAngle() {',
    '  stbV2Gyro.angleDeg = 0.0f;',
    '  stbV2Gyro.lastUpdateMs = millis();',
    '}',
    '',
    'void stbV2UpdateGyro() {',
    '  if (!stbV2InitGyroHardware()) {',
    '    return;',
    '  }',
    '  stbV2Mpu.getEvent(&stbV2MpuAccelEvent, &stbV2MpuGyroEvent, &stbV2MpuTempEvent);',
    '  stbV2Gyro.accel[0] = stbV2MpuAccelEvent.acceleration.x;',
    '  stbV2Gyro.accel[1] = stbV2MpuAccelEvent.acceleration.y;',
    '  stbV2Gyro.accel[2] = stbV2MpuAccelEvent.acceleration.z;',
    '  stbV2Gyro.gyro[0] = stbV2MpuGyroEvent.gyro.x;',
    '  stbV2Gyro.gyro[1] = stbV2MpuGyroEvent.gyro.y;',
    '  stbV2Gyro.gyro[2] = stbV2MpuGyroEvent.gyro.z;',
    '  unsigned long now = millis();',
    '  if (stbV2Gyro.lastUpdateMs == 0UL) {',
    '    stbV2Gyro.lastUpdateMs = now;',
    '    return;',
    '  }',
    '  float dt = static_cast<float>(now - stbV2Gyro.lastUpdateMs) / 1000.0f;',
    '  stbV2Gyro.lastUpdateMs = now;',
    '  if (dt <= 0.0f || dt > 0.25f) {',
    '    return;',
    '  }',
    '  float yawRateDeg = stbV2GetYawRateDeg();',
    '  stbV2Gyro.angleDeg += yawRateDeg * dt;',
    '}',
    '',
    'void stbV2CalibrateGyro() {',
    '  if (!stbV2InitGyroHardware()) {',
    '    return;',
    '  }',
    '  float sums[3] = {0.0f, 0.0f, 0.0f};',
    '  const uint16_t samples = 200;',
    '  for (uint16_t i = 0; i < samples; ++i) {',
    '    stbV2Mpu.getEvent(&stbV2MpuAccelEvent, &stbV2MpuGyroEvent, &stbV2MpuTempEvent);',
    '    sums[0] += stbV2MpuGyroEvent.gyro.x;',
    '    sums[1] += stbV2MpuGyroEvent.gyro.y;',
    '    sums[2] += stbV2MpuGyroEvent.gyro.z;',
    '    delay(2);',
    '  }',
    '  for (uint8_t i = 0; i < 3; ++i) {',
    '    stbV2Gyro.gyroBias[i] = sums[i] / static_cast<float>(samples);',
    '  }',
    '  stbV2Gyro.calibrated = true;',
    '  stbV2ResetGyroAngle();',
    '  stbV2UpdateGyro();',
    '  for (uint8_t i = 0; i < 3; ++i) {',
    '    stbV2Gyro.baselineAccel[i] = stbV2Gyro.accel[i];',
    '  }',
    '  stbV2Gyro.postureCalibrated = true;',
    '}',
    '',
    'void stbV2CalibrateGyroPosture() {',
    '  stbV2UpdateGyro();',
    '  for (uint8_t i = 0; i < 3; ++i) {',
    '    stbV2Gyro.baselineAccel[i] = stbV2Gyro.accel[i];',
    '  }',
    '  stbV2Gyro.postureCalibrated = true;',
    '}',
    '',
    'bool stbV2GyroReady() {',
    '  return stbV2Gyro.ready;',
    '}',
    '',
    'float stbV2GetGyroAcceleration(const String& axis) {',
    '  stbV2UpdateGyro();',
    '  return stbV2GyroArrayValue(stbV2Gyro.accel, stbV2GyroAxisFromText(axis));',
    '}',
    '',
    'float stbV2GetGyroAngularVelocity(const String& axis) {',
    '  stbV2UpdateGyro();',
    '  uint8_t axisIndex = stbV2GyroAxisFromText(axis);',
    '  float axisRateRad = stbV2GyroArrayValue(stbV2Gyro.gyro, axisIndex) - stbV2GyroArrayValue(stbV2Gyro.gyroBias, axisIndex);',
    '  return axisRateRad * 57.2957795f;',
    '}',
    '',
    'float stbV2GetGyroAngle() {',
    '  stbV2UpdateGyro();',
    '  return stbV2Gyro.angleDeg;',
    '}',
    '',
    'float stbV2GetTiltAngleDeg() {',
    '  stbV2UpdateGyro();',
    '  if (!stbV2Gyro.postureCalibrated) {',
    '    return 0.0f;',
    '  }',
    '  float baselineMag = stbV2GyroVectorMagnitude(stbV2Gyro.baselineAccel);',
    '  float currentMag = stbV2GyroVectorMagnitude(stbV2Gyro.accel);',
    '  if (baselineMag < 0.001f || currentMag < 0.001f) {',
    '    return 0.0f;',
    '  }',
    '  float cosine = stbV2GyroVectorDot(stbV2Gyro.baselineAccel, stbV2Gyro.accel) / (baselineMag * currentMag);',
    '  if (cosine > 1.0f) {',
    '    cosine = 1.0f;',
    '  }',
    '  if (cosine < -1.0f) {',
    '    cosine = -1.0f;',
    '  }',
    '  return acosf(cosine) * 57.2957795f;',
    '}',
    '',
    'bool stbV2IsShaken() {',
    '  stbV2UpdateGyro();',
    '  if (!stbV2Gyro.postureCalibrated) {',
    '    return false;',
    '  }',
    '  float delta[3] = {',
    '    stbV2Gyro.accel[0] - stbV2Gyro.baselineAccel[0],',
    '    stbV2Gyro.accel[1] - stbV2Gyro.baselineAccel[1],',
    '    stbV2Gyro.accel[2] - stbV2Gyro.baselineAccel[2]',
    '  };',
    '  float accelDelta = stbV2GyroVectorMagnitude(delta);',
    '  float maxRate = fabsf(stbV2GetGyroAngularVelocity(String("X")));',
    '  maxRate = max(maxRate, fabsf(stbV2GetGyroAngularVelocity(String("Y"))));',
    '  maxRate = max(maxRate, fabsf(stbV2GetGyroAngularVelocity(String("Z"))));',
    '  return accelDelta >= STB_V2_GYRO_SHAKE_ACCEL_DELTA || maxRate >= STB_V2_GYRO_SHAKE_RATE_DEG;',
    '}',
    '',
    'bool stbV2CompareFloat(float leftValue, const String& comparison, float rightValue) {',
    '  if (comparison == "GT") {',
    '    return leftValue > rightValue;',
    '  }',
    '  if (comparison == "LT") {',
    '    return leftValue < rightValue;',
    '  }',
    '  if (comparison == "GTE") {',
    '    return leftValue >= rightValue;',
    '  }',
    '  if (comparison == "LTE") {',
    '    return leftValue <= rightValue;',
    '  }',
    '  if (comparison == "EQ") {',
    '    return fabsf(leftValue - rightValue) <= 0.01f;',
    '  }',
    '  if (comparison == "NEQ") {',
    '    return fabsf(leftValue - rightValue) > 0.01f;',
    '  }',
    '  return false;',
    '}'
  ].join('\n');

  Blockly.Arduino.setups_['stb_v2_gyro_setup'] = [
    'stbV2InitGyroHardware();',
    'stbV2ConfigureGyro(String("Z"), true);'
  ].join('\n');
    }

    function ensureStbV2GyroBase () {
Blockly.Arduino.includes_.stb_v2_gyro = [
    '#include <Wire.h>',
    '#include <Adafruit_MPU6050.h>',
    '#include <Adafruit_Sensor.h>'
  ].join('\n');

  Blockly.Arduino.definitions_['stb_v2_gyro_base'] = [
    'struct STBV2GyroState {',
    '  bool ready;',
    '  bool calibrated;',
    '  bool postureCalibrated;',
    '  uint8_t yawAxis;',
    '  int8_t yawSign;',
    '  float accel[3];',
    '  float gyro[3];',
    '  float gyroBias[3];',
    '  float baselineAccel[3];',
    '  float angleDeg;',
    '  unsigned long lastUpdateMs;',
    '};',
    '',
    'const uint8_t STB_V2_GYRO_AXIS_X = 0;',
    'const uint8_t STB_V2_GYRO_AXIS_Y = 1;',
    'const uint8_t STB_V2_GYRO_AXIS_Z = 2;',
    'const float STB_V2_GYRO_SHAKE_ACCEL_DELTA = 3.5f;',
    'const float STB_V2_GYRO_SHAKE_RATE_DEG = 120.0f;',
    'const float STB_V2_GYRO_TILT_THRESHOLD_DEG = 18.0f;',
    'const unsigned long STB_V2_GYRO_TURN_TIMEOUT_MS = 8000UL;',
    '',
    'Adafruit_MPU6050 stbV2Mpu;',
    'sensors_event_t stbV2MpuAccelEvent, stbV2MpuGyroEvent, stbV2MpuTempEvent;',
    'STBV2GyroState stbV2Gyro = {false, false, false, STB_V2_GYRO_AXIS_Z, 1, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, 0.0f, 0UL};',
    '',
    'uint8_t stbV2GyroAxisFromText(const String& axis) { if (axis == "X") { return STB_V2_GYRO_AXIS_X; } if (axis == "Y") { return STB_V2_GYRO_AXIS_Y; } return STB_V2_GYRO_AXIS_Z; }',
    'float stbV2GyroArrayValue(const float values[3], uint8_t axis) { if (axis > 2) { return 0.0f; } return values[axis]; }',
    'float stbV2GyroVectorMagnitude(const float values[3]) { return sqrtf((values[0] * values[0]) + (values[1] * values[1]) + (values[2] * values[2])); }',
    'float stbV2GyroVectorDot(const float a[3], const float b[3]) { return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]); }',
    'float stbV2GetYawRateDeg() { float corrected[3] = { stbV2Gyro.gyro[0] - stbV2Gyro.gyroBias[0], stbV2Gyro.gyro[1] - stbV2Gyro.gyroBias[1], stbV2Gyro.gyro[2] - stbV2Gyro.gyroBias[2] }; float axisRateRad = stbV2GyroArrayValue(corrected, stbV2Gyro.yawAxis); return axisRateRad * 57.2957795f * static_cast<float>(stbV2Gyro.yawSign); }',
    'bool stbV2InitGyroHardware() { if (stbV2Gyro.ready) { return true; } Wire.begin(); Wire.setWireTimeout(25000UL, true); Wire.clearWireTimeoutFlag(); if (!stbV2Mpu.begin()) { stbV2Gyro.ready = false; return false; } stbV2Mpu.setAccelerometerRange(MPU6050_RANGE_4_G); stbV2Mpu.setGyroRange(MPU6050_RANGE_500_DEG); stbV2Mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); stbV2Gyro.ready = true; stbV2Gyro.lastUpdateMs = millis(); return true; }',
    'void stbV2ConfigureGyro(const String& axis, bool inverted) { stbV2InitGyroHardware(); stbV2Gyro.yawAxis = stbV2GyroAxisFromText(axis); stbV2Gyro.yawSign = inverted ? -1 : 1; }',
    'void stbV2ResetGyroAngle() { stbV2Gyro.angleDeg = 0.0f; stbV2Gyro.lastUpdateMs = millis(); }',
    'void stbV2UpdateGyro() { if (!stbV2InitGyroHardware()) { return; } stbV2Mpu.getEvent(&stbV2MpuAccelEvent, &stbV2MpuGyroEvent, &stbV2MpuTempEvent); stbV2Gyro.accel[0] = stbV2MpuAccelEvent.acceleration.x; stbV2Gyro.accel[1] = stbV2MpuAccelEvent.acceleration.y; stbV2Gyro.accel[2] = stbV2MpuAccelEvent.acceleration.z; stbV2Gyro.gyro[0] = stbV2MpuGyroEvent.gyro.x; stbV2Gyro.gyro[1] = stbV2MpuGyroEvent.gyro.y; stbV2Gyro.gyro[2] = stbV2MpuGyroEvent.gyro.z; unsigned long now = millis(); if (stbV2Gyro.lastUpdateMs == 0UL) { stbV2Gyro.lastUpdateMs = now; return; } float dt = static_cast<float>(now - stbV2Gyro.lastUpdateMs) / 1000.0f; stbV2Gyro.lastUpdateMs = now; if (dt <= 0.0f || dt > 0.25f) { return; } float yawRateDeg = stbV2GetYawRateDeg(); stbV2Gyro.angleDeg += yawRateDeg * dt; }',
    'bool stbV2GyroReady() { return stbV2Gyro.ready; }',
    'bool stbV2CompareFloat(float leftValue, const String& comparison, float rightValue) { if (comparison == "GT") { return leftValue > rightValue; } if (comparison == "LT") { return leftValue < rightValue; } if (comparison == "GTE") { return leftValue >= rightValue; } if (comparison == "LTE") { return leftValue <= rightValue; } if (comparison == "EQ") { return fabsf(leftValue - rightValue) <= 0.01f; } if (comparison == "NEQ") { return fabsf(leftValue - rightValue) > 0.01f; } return false; }'
  ].join('\n');
    }

    function ensureStbV2GyroCalibrationHelpers () {
ensureStbV2GyroBase();
  Blockly.Arduino.definitions_['stb_v2_gyro_calibration'] = [
    'void stbV2CalibrateGyro() { if (!stbV2InitGyroHardware()) { return; } float sums[3] = {0.0f, 0.0f, 0.0f}; const uint16_t samples = 200; for (uint16_t i = 0; i < samples; ++i) { stbV2Mpu.getEvent(&stbV2MpuAccelEvent, &stbV2MpuGyroEvent, &stbV2MpuTempEvent); sums[0] += stbV2MpuGyroEvent.gyro.x; sums[1] += stbV2MpuGyroEvent.gyro.y; sums[2] += stbV2MpuGyroEvent.gyro.z; delay(2); } for (uint8_t i = 0; i < 3; ++i) { stbV2Gyro.gyroBias[i] = sums[i] / static_cast<float>(samples); } stbV2Gyro.calibrated = true; stbV2ResetGyroAngle(); stbV2UpdateGyro(); for (uint8_t i = 0; i < 3; ++i) { stbV2Gyro.baselineAccel[i] = stbV2Gyro.accel[i]; } stbV2Gyro.postureCalibrated = true; }',
    'void stbV2CalibrateGyroPosture() { stbV2UpdateGyro(); for (uint8_t i = 0; i < 3; ++i) { stbV2Gyro.baselineAccel[i] = stbV2Gyro.accel[i]; } stbV2Gyro.postureCalibrated = true; }'
  ].join('\n');
    }

    function ensureStbV2GyroReadHelpers () {
ensureStbV2GyroBase();
  Blockly.Arduino.definitions_['stb_v2_gyro_read'] = [
    'float stbV2GetGyroAcceleration(const String& axis) { stbV2UpdateGyro(); return stbV2GyroArrayValue(stbV2Gyro.accel, stbV2GyroAxisFromText(axis)); }',
    'float stbV2GetGyroAngularVelocity(const String& axis) { stbV2UpdateGyro(); uint8_t axisIndex = stbV2GyroAxisFromText(axis); float axisRateRad = stbV2GyroArrayValue(stbV2Gyro.gyro, axisIndex) - stbV2GyroArrayValue(stbV2Gyro.gyroBias, axisIndex); return axisRateRad * 57.2957795f; }',
    'float stbV2GetGyroAngle() { stbV2UpdateGyro(); return stbV2Gyro.angleDeg; }',
    'float stbV2GetTiltAngleDeg() { stbV2UpdateGyro(); if (!stbV2Gyro.postureCalibrated) { return 0.0f; } float baselineMag = stbV2GyroVectorMagnitude(stbV2Gyro.baselineAccel); float currentMag = stbV2GyroVectorMagnitude(stbV2Gyro.accel); if (baselineMag < 0.001f || currentMag < 0.001f) { return 0.0f; } float cosine = stbV2GyroVectorDot(stbV2Gyro.baselineAccel, stbV2Gyro.accel) / (baselineMag * currentMag); if (cosine > 1.0f) { cosine = 1.0f; } if (cosine < -1.0f) { cosine = -1.0f; } return acosf(cosine) * 57.2957795f; }'
  ].join('\n');
    }

    function ensureStbV2GyroPredicateHelpers () {
ensureStbV2GyroReadHelpers();
  Blockly.Arduino.definitions_['stb_v2_gyro_predicates'] = [
    'bool stbV2IsShaken() { stbV2UpdateGyro(); if (!stbV2Gyro.postureCalibrated) { return false; } float delta[3] = { stbV2Gyro.accel[0] - stbV2Gyro.baselineAccel[0], stbV2Gyro.accel[1] - stbV2Gyro.baselineAccel[1], stbV2Gyro.accel[2] - stbV2Gyro.baselineAccel[2] }; float accelDelta = stbV2GyroVectorMagnitude(delta); float maxRate = fabsf(stbV2GetGyroAngularVelocity(String("X"))); maxRate = max(maxRate, fabsf(stbV2GetGyroAngularVelocity(String("Y")))); maxRate = max(maxRate, fabsf(stbV2GetGyroAngularVelocity(String("Z")))); return accelDelta >= STB_V2_GYRO_SHAKE_ACCEL_DELTA || maxRate >= STB_V2_GYRO_SHAKE_RATE_DEG; }',
    'bool stbV2IsTilted(float degrees) { return stbV2GetTiltAngleDeg() >= degrees; }'
  ].join('\n');
    }

    function ensureStbV2GyroMotionRuntime () {
ensureStbV2MegaBase();
  ensureStbV2GyroRuntime();
  Blockly.Arduino.definitions_['stb_v2_gyro_motion_runtime'] = [
    'void stbV2TurnByGyro(const String& side, float degrees, int speedPercent) {',
    '  stbV2TurnByAmount(side, degrees, String("DEGREES"), speedPercent);',
    '  stbV2WaitForSelectorIdle(String("MOTION"), 120000UL);',
    '}'
  ].join('\n');
    }

    function ensureStbV2MatrixRuntime () {
Blockly.Arduino.includes_.stb_v2_matrix = '#include <LedControl.h>';
  Blockly.Arduino.definitions_['stb_v2_matrix_runtime'] = [
    'struct STBV2MatrixState {',
    '  bool initialized;',
    '  bool enabled;',
    '  uint8_t intensity;',
    '  uint8_t rows[8];',
    '};',
    '',
    'const uint8_t STB_V2_MATRIX_DIN = 51;',
    'const uint8_t STB_V2_MATRIX_CLK = 52;',
    'const uint8_t STB_V2_MATRIX_CS = 53;',
    '',
    'LedControl stbV2MatrixDriver = LedControl(STB_V2_MATRIX_DIN, STB_V2_MATRIX_CLK, STB_V2_MATRIX_CS, 1);',
    'STBV2MatrixState stbV2Matrix = {false, true, 8, {0, 0, 0, 0, 0, 0, 0, 0}};',
    '',
    'void stbV2MatrixSync() { for (uint8_t row = 0; row < 8; ++row) { stbV2MatrixDriver.setRow(0, row, stbV2Matrix.rows[row]); } }',
    'void stbV2MatrixInit() { if (stbV2Matrix.initialized) return; stbV2MatrixDriver.shutdown(0, false); stbV2MatrixDriver.setIntensity(0, stbV2Matrix.intensity); stbV2MatrixDriver.clearDisplay(0); stbV2Matrix.initialized = true; stbV2Matrix.enabled = true; stbV2MatrixSync(); }',
    'void stbV2MatrixSetEnabled(bool enabled) { stbV2MatrixInit(); stbV2Matrix.enabled = enabled; stbV2MatrixDriver.shutdown(0, !enabled); }',
    'void stbV2MatrixSetIntensity(int value) { stbV2MatrixInit(); stbV2Matrix.intensity = constrain(value, 0, 15); stbV2MatrixDriver.setIntensity(0, stbV2Matrix.intensity); }',
    'void stbV2MatrixClear() { stbV2MatrixInit(); for (uint8_t i = 0; i < 8; ++i) { stbV2Matrix.rows[i] = 0; } stbV2MatrixDriver.clearDisplay(0); }',
    'void stbV2MatrixFill(bool on) { stbV2MatrixInit(); uint8_t value = on ? 0xFF : 0x00; for (uint8_t i = 0; i < 8; ++i) { stbV2Matrix.rows[i] = value; } stbV2MatrixSync(); }',
    'void stbV2MatrixSetPixel(int x, int y, bool on) { stbV2MatrixInit(); if (x < 0 || x > 7 || y < 0 || y > 7) return; uint8_t bit = static_cast<uint8_t>(7 - x); if (on) stbV2Matrix.rows[y] |= static_cast<uint8_t>(1u << bit); else stbV2Matrix.rows[y] &= static_cast<uint8_t>(~(1u << bit)); stbV2MatrixDriver.setRow(0, y, stbV2Matrix.rows[y]); }',
    'bool stbV2MatrixGetPixel(int x, int y) { stbV2MatrixInit(); if (x < 0 || x > 7 || y < 0 || y > 7) return false; uint8_t bit = static_cast<uint8_t>(7 - x); return (stbV2Matrix.rows[y] & static_cast<uint8_t>(1u << bit)) != 0; }',
    'void stbV2MatrixTogglePixel(int x, int y) { stbV2MatrixSetPixel(x, y, !stbV2MatrixGetPixel(x, y)); }',
    'void stbV2MatrixSetRowPattern(int row, uint8_t value) { stbV2MatrixInit(); if (row < 0 || row > 7) return; stbV2Matrix.rows[row] = value; stbV2MatrixDriver.setRow(0, row, value); }',
    'void stbV2MatrixSetColumnPattern(int col, uint8_t value) { stbV2MatrixInit(); if (col < 0 || col > 7) return; for (uint8_t row = 0; row < 8; ++row) { bool on = (value & static_cast<uint8_t>(1u << (7 - row))) != 0; stbV2MatrixSetPixel(col, row, on); } }',
    'void stbV2MatrixShowPattern(uint8_t r0, uint8_t r1, uint8_t r2, uint8_t r3, uint8_t r4, uint8_t r5, uint8_t r6, uint8_t r7) { stbV2MatrixSetRowPattern(0,r0); stbV2MatrixSetRowPattern(1,r1); stbV2MatrixSetRowPattern(2,r2); stbV2MatrixSetRowPattern(3,r3); stbV2MatrixSetRowPattern(4,r4); stbV2MatrixSetRowPattern(5,r5); stbV2MatrixSetRowPattern(6,r6); stbV2MatrixSetRowPattern(7,r7); }',
    'void stbV2MatrixShift(const String& dir) { stbV2MatrixInit(); if (dir == "LEFT") { for (uint8_t i = 0; i < 8; ++i) stbV2Matrix.rows[i] <<= 1; } else if (dir == "RIGHT") { for (uint8_t i = 0; i < 8; ++i) stbV2Matrix.rows[i] >>= 1; } else if (dir == "UP") { for (uint8_t i = 0; i < 7; ++i) stbV2Matrix.rows[i] = stbV2Matrix.rows[i + 1]; stbV2Matrix.rows[7] = 0; } else if (dir == "DOWN") { for (int i = 7; i > 0; --i) stbV2Matrix.rows[i] = stbV2Matrix.rows[i - 1]; stbV2Matrix.rows[0] = 0; } stbV2MatrixSync(); }',
    'void stbV2MatrixCharPattern(char ch, uint8_t pattern[8]) { for (uint8_t i = 0; i < 8; ++i) pattern[i] = 0; if (ch >= \'a\' && ch <= \'z\') ch = static_cast<char>(ch - 32); switch (ch) {',
    'case \'0\': { uint8_t p[8] = {0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'1\': { uint8_t p[8] = {0x18,0x38,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'2\': { uint8_t p[8] = {0x3C,0x66,0x06,0x1C,0x30,0x66,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'3\': { uint8_t p[8] = {0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'4\': { uint8_t p[8] = {0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0x00}; memcpy(pattern,p,8); break; } case \'5\': { uint8_t p[8] = {0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'6\': { uint8_t p[8] = {0x1C,0x30,0x60,0x7C,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'7\': { uint8_t p[8] = {0x7E,0x66,0x06,0x0C,0x18,0x18,0x18,0x00}; memcpy(pattern,p,8); break; } case \'8\': { uint8_t p[8] = {0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'9\': { uint8_t p[8] = {0x3C,0x66,0x66,0x3E,0x06,0x0C,0x38,0x00}; memcpy(pattern,p,8); break; }',
    'case \'A\': { uint8_t p[8] = {0x18,0x3C,0x66,0x66,0x7E,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'B\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x66,0x66,0x7C,0x00}; memcpy(pattern,p,8); break; } case \'C\': { uint8_t p[8] = {0x3C,0x66,0x60,0x60,0x60,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'D\': { uint8_t p[8] = {0x78,0x6C,0x66,0x66,0x66,0x6C,0x78,0x00}; memcpy(pattern,p,8); break; } case \'E\': { uint8_t p[8] = {0x7E,0x60,0x60,0x7C,0x60,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'F\': { uint8_t p[8] = {0x7E,0x60,0x60,0x7C,0x60,0x60,0x60,0x00}; memcpy(pattern,p,8); break; } case \'G\': { uint8_t p[8] = {0x3C,0x66,0x60,0x6E,0x66,0x66,0x3E,0x00}; memcpy(pattern,p,8); break; } case \'H\': { uint8_t p[8] = {0x66,0x66,0x66,0x7E,0x66,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'I\': { uint8_t p[8] = {0x3C,0x18,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'J\': { uint8_t p[8] = {0x1E,0x0C,0x0C,0x0C,0x0C,0x6C,0x38,0x00}; memcpy(pattern,p,8); break; } case \'K\': { uint8_t p[8] = {0x66,0x6C,0x78,0x70,0x78,0x6C,0x66,0x00}; memcpy(pattern,p,8); break; } case \'L\': { uint8_t p[8] = {0x60,0x60,0x60,0x60,0x60,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'M\': { uint8_t p[8] = {0x63,0x77,0x7F,0x6B,0x63,0x63,0x63,0x00}; memcpy(pattern,p,8); break; } case \'N\': { uint8_t p[8] = {0x66,0x76,0x7E,0x7E,0x6E,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'O\': { uint8_t p[8] = {0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'P\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x60,0x60,0x60,0x00}; memcpy(pattern,p,8); break; } case \'Q\': { uint8_t p[8] = {0x3C,0x66,0x66,0x66,0x6E,0x3C,0x0E,0x00}; memcpy(pattern,p,8); break; } case \'R\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x78,0x6C,0x66,0x00}; memcpy(pattern,p,8); break; } case \'S\': { uint8_t p[8] = {0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'T\': { uint8_t p[8] = {0x7E,0x5A,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'U\': { uint8_t p[8] = {0x66,0x66,0x66,0x66,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'V\': { uint8_t p[8] = {0x66,0x66,0x66,0x66,0x66,0x3C,0x18,0x00}; memcpy(pattern,p,8); break; } case \'W\': { uint8_t p[8] = {0x63,0x63,0x63,0x6B,0x7F,0x77,0x63,0x00}; memcpy(pattern,p,8); break; } case \'X\': { uint8_t p[8] = {0x66,0x66,0x3C,0x18,0x3C,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'Y\': { uint8_t p[8] = {0x66,0x66,0x66,0x3C,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'Z\': { uint8_t p[8] = {0x7E,0x06,0x0C,0x18,0x30,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; }',
    'case \'-\': { uint8_t p[8] = {0x00,0x00,0x00,0x7E,0x00,0x00,0x00,0x00}; memcpy(pattern,p,8); break; } case \'!\': { uint8_t p[8] = {0x18,0x18,0x18,0x18,0x18,0x00,0x18,0x00}; memcpy(pattern,p,8); break; } case \'?\': { uint8_t p[8] = {0x3C,0x66,0x06,0x0C,0x18,0x00,0x18,0x00}; memcpy(pattern,p,8); break; } default: break; } }',
    'void stbV2MatrixShowChar(const String& text) { stbV2MatrixInit(); char ch = text.length() > 0 ? text.charAt(0) : \' \'; uint8_t pattern[8]; stbV2MatrixCharPattern(ch, pattern); for (uint8_t row = 0; row < 8; ++row) stbV2Matrix.rows[row] = pattern[row]; stbV2MatrixSync(); }',
    'void stbV2MatrixShowNumber(long value) { String text = String(value); if (text.length() > 0) { char ch = text.charAt(text.length() - 1); stbV2MatrixShowChar(String(ch)); } }',
    'void stbV2MatrixScrollColumnIn(uint8_t columnBits) { stbV2MatrixInit(); for (uint8_t row = 0; row < 8; ++row) { bool on = (columnBits & static_cast<uint8_t>(1u << (7 - row))) != 0; stbV2Matrix.rows[row] <<= 1; if (on) { stbV2Matrix.rows[row] |= 0x01; } } stbV2MatrixSync(); }',
    'void stbV2MatrixShowText(const String& text, unsigned long delayMs) { if (delayMs == 0UL) delayMs = 120UL; if (text.length() == 0) { stbV2MatrixClear(); return; } for (uint16_t chIndex = 0; chIndex < text.length(); ++chIndex) { uint8_t pattern[8]; stbV2MatrixCharPattern(text.charAt(chIndex), pattern); for (uint8_t col = 0; col < 8; ++col) { uint8_t columnBits = 0; for (uint8_t row = 0; row < 8; ++row) { if ((pattern[row] & static_cast<uint8_t>(1u << (7 - col))) != 0) { columnBits |= static_cast<uint8_t>(1u << (7 - row)); } } stbV2MatrixScrollColumnIn(columnBits); openBlockCooperativeDelay(delayMs); } stbV2MatrixScrollColumnIn(0); openBlockCooperativeDelay(delayMs); } for (uint8_t i = 0; i < 8; ++i) { stbV2MatrixScrollColumnIn(0); openBlockCooperativeDelay(delayMs); } }'
  ].join('\n');
  Blockly.Arduino.setups_['stb_v2_matrix_setup'] = 'stbV2MatrixInit();';
    }

    function ensureStbV2MatrixBase () {
ensureOpenBlockCooperativeDelay();
  Blockly.Arduino.includes_.stb_v2_matrix = '#include <LedControl.h>';
  Blockly.Arduino.definitions_['stb_v2_matrix_base'] = [
    'struct STBV2MatrixState {',
    '  bool initialized;',
    '  bool enabled;',
    '  uint8_t intensity;',
    '  uint8_t rows[8];',
    '};',
    '',
    'const uint8_t STB_V2_MATRIX_DIN = 51;',
    'const uint8_t STB_V2_MATRIX_CLK = 52;',
    'const uint8_t STB_V2_MATRIX_CS = 53;',
    '',
    'LedControl stbV2MatrixDriver = LedControl(STB_V2_MATRIX_DIN, STB_V2_MATRIX_CLK, STB_V2_MATRIX_CS, 1);',
    'STBV2MatrixState stbV2Matrix = {false, true, 8, {0, 0, 0, 0, 0, 0, 0, 0}};',
    '',
    'void stbV2MatrixSync() { for (uint8_t row = 0; row < 8; ++row) { stbV2MatrixDriver.setRow(0, row, stbV2Matrix.rows[row]); } }',
    'void stbV2MatrixInit() { if (stbV2Matrix.initialized) return; stbV2MatrixDriver.shutdown(0, false); stbV2MatrixDriver.setIntensity(0, stbV2Matrix.intensity); stbV2MatrixDriver.clearDisplay(0); stbV2Matrix.initialized = true; stbV2Matrix.enabled = true; stbV2MatrixSync(); }'
  ].join('\n');
    }

    function ensureStbV2MatrixEnableHelper () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_enable'] = 'void stbV2MatrixSetEnabled(bool enabled) { stbV2MatrixInit(); stbV2Matrix.enabled = enabled; stbV2MatrixDriver.shutdown(0, !enabled); }';
    }

    function ensureStbV2MatrixIntensityHelper () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_intensity'] = 'void stbV2MatrixSetIntensity(int value) { stbV2MatrixInit(); stbV2Matrix.intensity = constrain(value, 0, 15); stbV2MatrixDriver.setIntensity(0, stbV2Matrix.intensity); }';
    }

    function ensureStbV2MatrixClearHelper () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_clear'] = 'void stbV2MatrixClear() { stbV2MatrixInit(); for (uint8_t i = 0; i < 8; ++i) { stbV2Matrix.rows[i] = 0; } stbV2MatrixDriver.clearDisplay(0); }';
    }

    function ensureStbV2MatrixFillHelper () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_fill'] = 'void stbV2MatrixFill(bool on) { stbV2MatrixInit(); uint8_t value = on ? 0xFF : 0x00; for (uint8_t i = 0; i < 8; ++i) { stbV2Matrix.rows[i] = value; } stbV2MatrixSync(); }';
    }

    function ensureStbV2MatrixPixelHelpers () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_pixels'] = [
    'void stbV2MatrixSetPixel(int x, int y, bool on) { stbV2MatrixInit(); if (x < 0 || x > 7 || y < 0 || y > 7) return; uint8_t bit = static_cast<uint8_t>(7 - x); if (on) stbV2Matrix.rows[y] |= static_cast<uint8_t>(1u << bit); else stbV2Matrix.rows[y] &= static_cast<uint8_t>(~(1u << bit)); stbV2MatrixDriver.setRow(0, y, stbV2Matrix.rows[y]); }',
    'bool stbV2MatrixGetPixel(int x, int y) { stbV2MatrixInit(); if (x < 0 || x > 7 || y < 0 || y > 7) return false; uint8_t bit = static_cast<uint8_t>(7 - x); return (stbV2Matrix.rows[y] & static_cast<uint8_t>(1u << bit)) != 0; }',
    'void stbV2MatrixTogglePixel(int x, int y) { stbV2MatrixSetPixel(x, y, !stbV2MatrixGetPixel(x, y)); }'
  ].join('\n');
    }

    function ensureStbV2MatrixPatternHelpers () {
ensureStbV2MatrixPixelHelpers();
  Blockly.Arduino.definitions_['stb_v2_matrix_patterns'] = [
    'void stbV2MatrixSetRowPattern(int row, uint8_t value) { stbV2MatrixInit(); if (row < 0 || row > 7) return; stbV2Matrix.rows[row] = value; stbV2MatrixDriver.setRow(0, row, value); }',
    'void stbV2MatrixSetColumnPattern(int col, uint8_t value) { stbV2MatrixInit(); if (col < 0 || col > 7) return; for (uint8_t row = 0; row < 8; ++row) { bool on = (value & static_cast<uint8_t>(1u << (7 - row))) != 0; stbV2MatrixSetPixel(col, row, on); } }',
    'void stbV2MatrixShowPattern(uint8_t r0, uint8_t r1, uint8_t r2, uint8_t r3, uint8_t r4, uint8_t r5, uint8_t r6, uint8_t r7) { stbV2MatrixSetRowPattern(0,r0); stbV2MatrixSetRowPattern(1,r1); stbV2MatrixSetRowPattern(2,r2); stbV2MatrixSetRowPattern(3,r3); stbV2MatrixSetRowPattern(4,r4); stbV2MatrixSetRowPattern(5,r5); stbV2MatrixSetRowPattern(6,r6); stbV2MatrixSetRowPattern(7,r7); }'
  ].join('\n');
    }

    function ensureStbV2MatrixShiftHelper () {
ensureStbV2MatrixBase();
  Blockly.Arduino.definitions_['stb_v2_matrix_shift'] = 'void stbV2MatrixShift(const String& dir) { stbV2MatrixInit(); if (dir == "LEFT") { for (uint8_t i = 0; i < 8; ++i) stbV2Matrix.rows[i] <<= 1; } else if (dir == "RIGHT") { for (uint8_t i = 0; i < 8; ++i) stbV2Matrix.rows[i] >>= 1; } else if (dir == "UP") { for (uint8_t i = 0; i < 7; ++i) stbV2Matrix.rows[i] = stbV2Matrix.rows[i + 1]; stbV2Matrix.rows[7] = 0; } else if (dir == "DOWN") { for (int i = 7; i > 0; --i) stbV2Matrix.rows[i] = stbV2Matrix.rows[i - 1]; stbV2Matrix.rows[0] = 0; } stbV2MatrixSync(); }';
    }

    function ensureStbV2MatrixTextHelpers () {
ensureStbV2MatrixBase();
  ensureStbV2MatrixClearHelper();
  Blockly.Arduino.definitions_['stb_v2_matrix_text'] = [
    'void stbV2MatrixCharPattern(char ch, uint8_t pattern[8]) { for (uint8_t i = 0; i < 8; ++i) pattern[i] = 0; if (ch >= \'a\' && ch <= \'z\') ch = static_cast<char>(ch - 32); switch (ch) {',
    'case \'0\': { uint8_t p[8] = {0x3C,0x66,0x6E,0x76,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'1\': { uint8_t p[8] = {0x18,0x38,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'2\': { uint8_t p[8] = {0x3C,0x66,0x06,0x1C,0x30,0x66,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'3\': { uint8_t p[8] = {0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'4\': { uint8_t p[8] = {0x0C,0x1C,0x3C,0x6C,0x7E,0x0C,0x0C,0x00}; memcpy(pattern,p,8); break; } case \'5\': { uint8_t p[8] = {0x7E,0x60,0x7C,0x06,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'6\': { uint8_t p[8] = {0x1C,0x30,0x60,0x7C,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'7\': { uint8_t p[8] = {0x7E,0x66,0x06,0x0C,0x18,0x18,0x18,0x00}; memcpy(pattern,p,8); break; } case \'8\': { uint8_t p[8] = {0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'9\': { uint8_t p[8] = {0x3C,0x66,0x66,0x3E,0x06,0x0C,0x38,0x00}; memcpy(pattern,p,8); break; }',
    'case \'A\': { uint8_t p[8] = {0x18,0x3C,0x66,0x66,0x7E,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'B\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x66,0x66,0x7C,0x00}; memcpy(pattern,p,8); break; } case \'C\': { uint8_t p[8] = {0x3C,0x66,0x60,0x60,0x60,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'D\': { uint8_t p[8] = {0x78,0x6C,0x66,0x66,0x66,0x6C,0x78,0x00}; memcpy(pattern,p,8); break; } case \'E\': { uint8_t p[8] = {0x7E,0x60,0x60,0x7C,0x60,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'F\': { uint8_t p[8] = {0x7E,0x60,0x60,0x7C,0x60,0x60,0x60,0x00}; memcpy(pattern,p,8); break; } case \'G\': { uint8_t p[8] = {0x3C,0x66,0x60,0x6E,0x66,0x66,0x3E,0x00}; memcpy(pattern,p,8); break; } case \'H\': { uint8_t p[8] = {0x66,0x66,0x66,0x7E,0x66,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'I\': { uint8_t p[8] = {0x3C,0x18,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'J\': { uint8_t p[8] = {0x1E,0x0C,0x0C,0x0C,0x0C,0x6C,0x38,0x00}; memcpy(pattern,p,8); break; } case \'K\': { uint8_t p[8] = {0x66,0x6C,0x78,0x70,0x78,0x6C,0x66,0x00}; memcpy(pattern,p,8); break; } case \'L\': { uint8_t p[8] = {0x60,0x60,0x60,0x60,0x60,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; } case \'M\': { uint8_t p[8] = {0x63,0x77,0x7F,0x6B,0x63,0x63,0x63,0x00}; memcpy(pattern,p,8); break; } case \'N\': { uint8_t p[8] = {0x66,0x76,0x7E,0x7E,0x6E,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'O\': { uint8_t p[8] = {0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'P\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x60,0x60,0x60,0x00}; memcpy(pattern,p,8); break; } case \'Q\': { uint8_t p[8] = {0x3C,0x66,0x66,0x66,0x6E,0x3C,0x0E,0x00}; memcpy(pattern,p,8); break; } case \'R\': { uint8_t p[8] = {0x7C,0x66,0x66,0x7C,0x78,0x6C,0x66,0x00}; memcpy(pattern,p,8); break; } case \'S\': { uint8_t p[8] = {0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'T\': { uint8_t p[8] = {0x7E,0x5A,0x18,0x18,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'U\': { uint8_t p[8] = {0x66,0x66,0x66,0x66,0x66,0x66,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'V\': { uint8_t p[8] = {0x66,0x66,0x66,0x66,0x66,0x3C,0x18,0x00}; memcpy(pattern,p,8); break; } case \'W\': { uint8_t p[8] = {0x63,0x63,0x63,0x6B,0x7F,0x77,0x63,0x00}; memcpy(pattern,p,8); break; } case \'X\': { uint8_t p[8] = {0x66,0x66,0x3C,0x18,0x3C,0x66,0x66,0x00}; memcpy(pattern,p,8); break; } case \'Y\': { uint8_t p[8] = {0x66,0x66,0x66,0x3C,0x18,0x18,0x3C,0x00}; memcpy(pattern,p,8); break; } case \'Z\': { uint8_t p[8] = {0x7E,0x06,0x0C,0x18,0x30,0x60,0x7E,0x00}; memcpy(pattern,p,8); break; }',
    'case \'-\': { uint8_t p[8] = {0x00,0x00,0x00,0x7E,0x00,0x00,0x00,0x00}; memcpy(pattern,p,8); break; } case \'!\': { uint8_t p[8] = {0x18,0x18,0x18,0x18,0x18,0x00,0x18,0x00}; memcpy(pattern,p,8); break; } case \'?\': { uint8_t p[8] = {0x3C,0x66,0x06,0x0C,0x18,0x00,0x18,0x00}; memcpy(pattern,p,8); break; } default: break; } }',
    'void stbV2MatrixShowChar(const String& text) { stbV2MatrixInit(); char ch = text.length() > 0 ? text.charAt(0) : \' \'; uint8_t pattern[8]; stbV2MatrixCharPattern(ch, pattern); for (uint8_t row = 0; row < 8; ++row) stbV2Matrix.rows[row] = pattern[row]; stbV2MatrixSync(); }',
    'void stbV2MatrixShowNumber(long value) { String text = String(value); if (text.length() > 0) { char ch = text.charAt(text.length() - 1); stbV2MatrixShowChar(String(ch)); } }',
    'void stbV2MatrixScrollColumnIn(uint8_t columnBits) { stbV2MatrixInit(); for (uint8_t row = 0; row < 8; ++row) { bool on = (columnBits & static_cast<uint8_t>(1u << (7 - row))) != 0; stbV2Matrix.rows[row] <<= 1; if (on) { stbV2Matrix.rows[row] |= 0x01; } } stbV2MatrixSync(); }',
    'void stbV2MatrixShowText(const String& text, unsigned long delayMs) { if (delayMs == 0UL) delayMs = 120UL; if (text.length() == 0) { stbV2MatrixClear(); return; } for (uint16_t chIndex = 0; chIndex < text.length(); ++chIndex) { uint8_t pattern[8]; stbV2MatrixCharPattern(text.charAt(chIndex), pattern); for (uint8_t col = 0; col < 8; ++col) { uint8_t columnBits = 0; for (uint8_t row = 0; row < 8; ++row) { if ((pattern[row] & static_cast<uint8_t>(1u << (7 - col))) != 0) { columnBits |= static_cast<uint8_t>(1u << (7 - row)); } } stbV2MatrixScrollColumnIn(columnBits); openBlockCooperativeDelay(delayMs); } stbV2MatrixScrollColumnIn(0); openBlockCooperativeDelay(delayMs); } for (uint8_t i = 0; i < 8; ++i) { stbV2MatrixScrollColumnIn(0); openBlockCooperativeDelay(delayMs); } }'
  ].join('\n');
    }

    function ensureStbV2OledBase () {
Blockly.Arduino.includes_.stb_v2_oled = '#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>';
  Blockly.Arduino.definitions_['stb_v2_oled_base'] = [
    'struct STBV2OledState {',
    '  bool initialized;',
    '  uint8_t address;',
    '  uint8_t textSize;',
    '  uint16_t textColor;',
    '  uint16_t backgroundColor;',
    '};',
    '',
    'const uint8_t STB_V2_OLED_WIDTH = 128;',
    'const uint8_t STB_V2_OLED_HEIGHT = 64;',
    '',
    'Adafruit_SSD1306 stbV2Oled(STB_V2_OLED_WIDTH, STB_V2_OLED_HEIGHT, &Wire, -1);',
    'STBV2OledState stbV2OledState = {false, 0x3C, 1, SSD1306_WHITE, SSD1306_BLACK};',
    '',
    'void stbV2OledEnsureInit() {',
    '  if (stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  Wire.begin();',
    '  if (!stbV2Oled.begin(SSD1306_SWITCHCAPVCC, stbV2OledState.address)) {',
    '    return;',
    '  }',
    '  stbV2Oled.setRotation(2);',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.setTextWrap(true);',
    '  stbV2Oled.setTextSize(stbV2OledState.textSize);',
    '  stbV2Oled.setTextColor(stbV2OledState.textColor, stbV2OledState.backgroundColor);',
    '  stbV2Oled.display();',
    '  stbV2OledState.initialized = true;',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledInitHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_init'] = [
    'void stbV2OledInit(uint8_t address) {',
    '  stbV2OledState.address = address;',
    '  stbV2OledState.initialized = false;',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.setCursor(0, 0);',
    '  stbV2Oled.display();',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledClearHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_clear'] = [
    'void stbV2OledClear() {',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.display();',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledRefreshHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_refresh'] = [
    'void stbV2OledRefresh() {',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.display();',
    '}'
  ].join('\n');
    }

    function ensureStbV2BootUiControlBase () {
Blockly.Arduino.definitions_['stb_v2_boot_ui_control'] = [
    'bool stbV2BootUiEnabled = false;',
    'bool stbV2BootUiAllowModeButtons = false;',
    'void stbV2BootUiDisable() {',
    '  stbV2BootUiEnabled = false;',
    '}',
    'void stbV2BootUiDisableModeButtons() {',
    '  stbV2BootUiAllowModeButtons = false;',
    '}'
  ].join('\n');
    }

    function ensureStbV2BootUiDisableModeButtonsSetup () {
ensureStbV2BootUiControlBase();
  Blockly.Arduino.setups_['stb_v2_boot_ui_disable_mode_buttons'] = 'stbV2BootUiDisableModeButtons();';
    }

    function ensureStbV2OledCursorHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_cursor'] = [
    'void stbV2OledSetCursor(int16_t x, int16_t y) {',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.setCursor(x, y);',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledTextStyleHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_text_style'] = [
    'void stbV2OledSetTextStyle(uint8_t size, uint16_t color, uint16_t bgColor) {',
    '  stbV2OledEnsureInit();',
    '  stbV2OledState.textSize = constrain(size, 1, 8);',
    '  stbV2OledState.textColor = color;',
    '  stbV2OledState.backgroundColor = bgColor;',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.setTextSize(stbV2OledState.textSize);',
    '  stbV2Oled.setTextColor(stbV2OledState.textColor, stbV2OledState.backgroundColor);',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledPrintHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_print'] = [
    'void stbV2OledPrint(const String& data, bool newline) {',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  if (newline) {',
    '    stbV2Oled.println(data);',
    '  } else {',
    '    stbV2Oled.print(data);',
    '  }',
    '  stbV2Oled.display();',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledDrawTextHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_text'] = [
    'void stbV2OledDrawTextAt(int16_t x, int16_t y, const String& data) {',
    '  stbV2OledEnsureInit();',
    '  if (!stbV2OledState.initialized) {',
    '    return;',
    '  }',
    '  stbV2Oled.setCursor(x, y);',
    '  stbV2Oled.print(data);',
    '  stbV2Oled.display();',
    '}'
  ].join('\n');
    }

    function ensureStbV2OledDrawPixelHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_pixel'] = 'void stbV2OledDrawPixel(int16_t x, int16_t y, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.drawPixel(x, y, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledDrawLineHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_line'] = 'void stbV2OledDrawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.drawLine(x0, y0, x1, y1, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledDrawRectHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_rect'] = 'void stbV2OledDrawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.drawRect(x, y, w, h, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledFillRectHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_fill_rect'] = 'void stbV2OledFillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.fillRect(x, y, w, h, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledDrawCircleHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_circle'] = 'void stbV2OledDrawCircle(int16_t x, int16_t y, int16_t r, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.drawCircle(x, y, r, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledFillCircleHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_fill_circle'] = 'void stbV2OledFillCircle(int16_t x, int16_t y, int16_t r, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.fillCircle(x, y, r, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledDrawTriangleHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_draw_triangle'] = 'void stbV2OledDrawTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.drawTriangle(x0, y0, x1, y1, x2, y2, color); stbV2Oled.display(); }';
    }

    function ensureStbV2OledFillTriangleHelper () {
ensureStbV2OledBase();
  Blockly.Arduino.definitions_['stb_v2_oled_fill_triangle'] = 'void stbV2OledFillTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) { stbV2OledEnsureInit(); if (!stbV2OledState.initialized) return; stbV2Oled.fillTriangle(x0, y0, x1, y1, x2, y2, color); stbV2Oled.display(); }';
    }

    function ensureArraysRuntime () {
if (Blockly.Arduino.definitions_['arrays_runtime']) return;
  Blockly.Arduino.definitions_['arrays_runtime'] = [
    '// Simple dynamic array template for Arduino',
    'template<typename T>',
    'class SimpleArray {',
    'private:',
    '  T* data;',
    '  int capacity;',
    '  int count;',
    '  void resize(int newCap) {',
    '    T* newData = new T[newCap];',
    '    for (int i = 0; i < count; i++) newData[i] = data[i];',
    '    delete[] data;',
    '    data = newData;',
    '    capacity = newCap;',
    '  }',
    'public:',
    '  SimpleArray(int cap = 10) : capacity(cap), count(0) { data = new T[capacity]; }',
    '  ~SimpleArray() { delete[] data; }',
    '  int length() { return count; }',
    '  int size() { return count; }',
    '  T get(int index) { if (index >= 0 && index < count) return data[index]; return T(); }',
    '  void set(int index, T value) { if (index >= 0 && index < count) data[index] = value; }',
    '  void push(T value) { if (count >= capacity) resize(capacity * 2); data[count++] = value; }',
    '  T pop() { if (count > 0) return data[--count]; return T(); }',
    '  void insert(int index, T value) {',
    '    if (index < 0 || index > count) return;',
    '    if (count >= capacity) resize(capacity * 2);',
    '    for (int i = count; i > index; i--) data[i] = data[i-1];',
    '    data[index] = value;',
    '    count++;',
    '  }',
    '  void remove(int index) {',
    '    if (index < 0 || index >= count) return;',
    '    for (int i = index; i < count - 1; i++) data[i] = data[i+1];',
    '    count--;',
    '  }',
    '  int indexOf(T value) {',
    '    for (int i = 0; i < count; i++) if (data[i] == value) return i;',
    '    return -1;',
    '  }',
    '  bool contains(T value) { return indexOf(value) != -1; }',
    '  void clear() { count = 0; }',
    '  void reverse() {',
    '    for (int i = 0; i < count / 2; i++) {',
    '      T temp = data[i];',
    '      data[i] = data[count - 1 - i];',
    '      data[count - 1 - i] = temp;',
    '    }',
    '  }',
    '};'
  ].join('\n');
    }

    function ensureStbV2PrecisionRuntime () {
ensureStbV2MegaBase();
  Blockly.Arduino.definitions_['stb_v2_precision_runtime'] = [
    'struct STBV2PrecisionConfig { float leftScalePct; float rightScalePct; int minSpeedPct; unsigned long launchWindowMs; float gyroKp; float gyroKd; float encoderKp; float maxCorrectionPct; float angleDeadbandDeg; int8_t gyroPolarity; };',
    'STBV2PrecisionConfig stbV2PrecisionConfig = {100.0f, 100.0f, 25, 0UL, 3.0f, 0.5f, 0.0f, 20.0f, 0.30f, -1};',
    'const float STB_V2_PRECISION_GYRO_KI = 0.8f;',
    'const float STB_V2_PRECISION_INTEGRAL_LIMIT = 3.0f;',
    'const float STB_V2_PRECISION_CORRECTION_SLEW_PCT = 1.6f;',
    'const float STB_V2_PRECISION_EMERGENCY_MAX_PCT = 65.0f;',
    'const float STB_V2_PRECISION_EMERGENCY_ENCODER_START_CM = 0.60f;',
    'const float STB_V2_PRECISION_EMERGENCY_ENCODER_FULL_CM = 1.80f;',
    'const float STB_V2_PRECISION_EMERGENCY_YAW_START_DEG = 2.0f;',
    'const float STB_V2_PRECISION_EMERGENCY_YAW_FULL_DEG = 6.0f;',
    'const float STB_V2_PRECISION_APPROACH_DISTANCE_CM = 6.0f;',
    'const float STB_V2_PRECISION_APPROACH_GAIN = 12.0f;',
    'const float STB_V2_PRECISION_APPROACH_MAX_PCT = 20.0f;',
    'bool stbV2PrecisionActive = false;',
    'bool stbV2PrecisionDistanceMove = false;',
    'bool stbV2PrecisionReverse = false;',
    'int8_t stbV2PrecisionLeftIdx = -1;',
    'int8_t stbV2PrecisionRightIdx = -1;',
    'int32_t stbV2PrecisionLeftStartTicks = 0;',
    'int32_t stbV2PrecisionRightStartTicks = 0;',
    'unsigned long stbV2PrecisionStartedMs = 0UL;',
    'unsigned long stbV2PrecisionLastControlMs = 0UL;',
    'float stbV2PrecisionStartYaw = 0.0f;',
    'float stbV2PrecisionLastRawYawError = 0.0f;',
    'float stbV2PrecisionFilteredYawRate = 0.0f;',
    'int stbV2PrecisionLastLeftBiasX10 = 0;',
    'int stbV2PrecisionLastRightBiasX10 = 0;',
    'int32_t stbV2PrecisionTargetTicks = 0;',
    'float stbV2PrecisionTargetDistanceCm = 0.0f;',
    'int stbV2PrecisionLeftCommandPct = 0;',
    'int stbV2PrecisionRightCommandPct = 0;',
    'float stbV2PrecisionLastYawError = 0.0f;',
    'float stbV2PrecisionLastCorrectionPct = 0.0f;',
    'float stbV2PrecisionLastEncoderErrorCm = 0.0f;',
    'float stbV2PrecisionGyroIntegral = 0.0f;',
    'float stbV2PrecisionAppliedCorrectionPct = 0.0f;',
    'float stbV2PrecisionArrivalCorrectionPct = 0.0f;',
    'unsigned long stbV2PrecisionFinishStartedMs = 0UL;',
    'const unsigned long STB_V2_PRECISION_FINISH_TIMEOUT_MS = 900UL;',
    'const bool STB_V2_TRACE_PRECISION = true;',
    'const unsigned long STB_V2_PRECISION_TRACE_INTERVAL_MS = 80UL;',
    'uint16_t stbV2PrecisionTraceSeq = 0;',
    'unsigned long stbV2PrecisionLastTraceMs = 0UL;',
    'void stbV2PrecisionTraceSample(const char *phase, bool force) { if (!STB_V2_TRACE_PRECISION) return; if (stbV2PrecisionLeftIdx < 0 || stbV2PrecisionRightIdx < 0) return; unsigned long now = millis(); if (!force && now - stbV2PrecisionLastTraceMs < STB_V2_PRECISION_TRACE_INTERVAL_MS) return; stbV2PrecisionLastTraceMs = now; STBV2MotorState &left = stbV2Motors[stbV2PrecisionLeftIdx]; STBV2MotorState &right = stbV2Motors[stbV2PrecisionRightIdx]; int32_t leftTravelTicks = labs(left.encoderTicks - stbV2PrecisionLeftStartTicks); int32_t rightTravelTicks = labs(right.encoderTicks - stbV2PrecisionRightStartTicks); float leftTravelCm = stbV2TicksToCm(leftTravelTicks); float rightTravelCm = stbV2TicksToCm(rightTravelTicks); float physicalYaw = stbV2Gyro.ready ? stbV2WrapAngleDeg(stbV2Gyro.angleDeg - stbV2PrecisionStartYaw) : 0.0f; Serial.print("PREC,seq="); Serial.print(stbV2PrecisionTraceSeq); Serial.print(",t="); Serial.print(now - stbV2PrecisionStartedMs); Serial.print(",ph="); Serial.print(phase); Serial.print(",rev="); Serial.print(stbV2PrecisionReverse ? 1 : 0); Serial.print(",targetCm="); Serial.print(stbV2PrecisionTargetDistanceCm, 2); Serial.print(",cmd="); Serial.print(stbV2PrecisionLeftCommandPct); Serial.print(":"); Serial.print(stbV2PrecisionRightCommandPct); Serial.print(",yaw="); Serial.print(stbV2PrecisionLastYawError, 2); Serial.print(",physYaw="); Serial.print(physicalYaw, 2); Serial.print(",rate="); Serial.print(stbV2PrecisionFilteredYawRate, 2); Serial.print(",corr="); Serial.print(stbV2PrecisionLastCorrectionPct, 2); Serial.print(",encErr="); Serial.print(stbV2PrecisionLastEncoderErrorCm, 3); Serial.print(",bias="); Serial.print(stbV2PrecisionLastLeftBiasX10); Serial.print(":"); Serial.print(stbV2PrecisionLastRightBiasX10); Serial.print(",ticks="); Serial.print(leftTravelTicks); Serial.print(":"); Serial.print(rightTravelTicks); Serial.print(",cm="); Serial.print(leftTravelCm, 2); Serial.print(":"); Serial.print(rightTravelCm, 2); Serial.print(",pwm="); Serial.print(left.appliedPwm); Serial.print(":"); Serial.print(right.appliedPwm); Serial.print(",rpm="); Serial.print(static_cast<float>(left.measuredRpmX100) / 100.0f, 1); Serial.print(":"); Serial.print(static_cast<float>(right.measuredRpmX100) / 100.0f, 1); Serial.print(",state="); Serial.print(left.currentState); Serial.print(":"); Serial.print(right.currentState); Serial.print(",busy="); Serial.print(left.busy ? 1 : 0); Serial.print(":"); Serial.println(right.busy ? 1 : 0); }',
    'void stbV2PrecisionTraceBegin(bool gyroReady, int32_t signedTargetTicks, int requestedSpeed) { if (!STB_V2_TRACE_PRECISION) return; stbV2PrecisionLastTraceMs = 0UL; Serial.print("PREC_BEGIN,seq="); Serial.print(stbV2PrecisionTraceSeq); Serial.print(",rev="); Serial.print(stbV2PrecisionReverse ? 1 : 0); Serial.print(",gyro="); Serial.print(gyroReady ? 1 : 0); Serial.print(",targetCm="); Serial.print(stbV2PrecisionTargetDistanceCm, 2); Serial.print(",targetTicks="); Serial.print(stbV2PrecisionTargetTicks); Serial.print(",signedTicks="); Serial.print(signedTargetTicks); Serial.print(",requested="); Serial.print(requestedSpeed); Serial.print(",cmd="); Serial.print(stbV2PrecisionLeftCommandPct); Serial.print(":"); Serial.print(stbV2PrecisionRightCommandPct); Serial.print(",scale="); Serial.print(stbV2PrecisionConfig.leftScalePct, 1); Serial.print(":"); Serial.print(stbV2PrecisionConfig.rightScalePct, 1); Serial.print(",kp="); Serial.print(stbV2PrecisionConfig.gyroKp, 2); Serial.print(",kd="); Serial.print(stbV2PrecisionConfig.gyroKd, 2); Serial.print(",encKp="); Serial.print(stbV2PrecisionConfig.encoderKp, 2); Serial.print(",max="); Serial.print(stbV2PrecisionConfig.maxCorrectionPct, 1); Serial.print(",pol="); Serial.println(stbV2PrecisionConfig.gyroPolarity); }',
    'void stbV2PrecisionTraceStop(const char *reason) { if (!STB_V2_TRACE_PRECISION) return; Serial.print("PREC_END,seq="); Serial.print(stbV2PrecisionTraceSeq); Serial.print(",reason="); Serial.print(reason); Serial.print(",lastYaw="); Serial.print(stbV2PrecisionLastYawError, 2); Serial.print(",lastCorr="); Serial.print(stbV2PrecisionLastCorrectionPct, 2); Serial.print(",lastEncErr="); Serial.println(stbV2PrecisionLastEncoderErrorCm, 3); }',
    'void stbV2PrecisionSetMotorAdjust(float leftScalePct, float rightScalePct, int minSpeedPct, unsigned long launchWindowMs) { stbV2PrecisionConfig.leftScalePct = constrain(leftScalePct, 20.0f, 180.0f); stbV2PrecisionConfig.rightScalePct = constrain(rightScalePct, 20.0f, 180.0f); stbV2PrecisionConfig.minSpeedPct = constrain(minSpeedPct, 10, 80); stbV2PrecisionConfig.launchWindowMs = constrain(launchWindowMs, 0UL, 1500UL); }',
    'void stbV2PrecisionSetControl(float gyroKp, float gyroKd, float encoderKp, float maxCorrectionPct, float angleDeadbandDeg, int polarity) { stbV2PrecisionConfig.gyroKp = constrain(gyroKp, 0.0f, 30.0f); stbV2PrecisionConfig.gyroKd = constrain(gyroKd, 0.0f, 20.0f); stbV2PrecisionConfig.encoderKp = constrain(encoderKp, 0.0f, 20.0f); stbV2PrecisionConfig.maxCorrectionPct = constrain(maxCorrectionPct, 0.0f, 90.0f); stbV2PrecisionConfig.angleDeadbandDeg = constrain(angleDeadbandDeg, 0.0f, 5.0f); stbV2PrecisionConfig.gyroPolarity = polarity < 0 ? -1 : 1; }',
    'bool stbV2PrecisionPrepareGyro() { stbV2ConfigureGyro(String("Z"), true); if (!stbV2Gyro.ready) stbV2InitGyroHardware(); if (!stbV2Gyro.ready) return false; if (!stbV2Gyro.calibrated) stbV2CalibrateGyro(); if (stbV2Gyro.ready && stbV2Gyro.calibrated && !stbV2Gyro.postureCalibrated) stbV2CalibrateGyroPosture(); if (!stbV2Gyro.ready || !stbV2Gyro.calibrated || !stbV2Gyro.postureCalibrated) return false; stbV2ResetGyroAngle(); stbV2UpdateGyro(); return true; }',
    'void stbV2PrecisionSendBias(int leftBiasX10, int rightBiasX10) { if (stbV2PrecisionLeftIdx < 0 || stbV2PrecisionRightIdx < 0) return; leftBiasX10 = constrain(leftBiasX10, -900, 0); rightBiasX10 = constrain(rightBiasX10, -900, 0); if (leftBiasX10 != stbV2PrecisionLastLeftBiasX10) { STBV2MotorState &left = stbV2Motors[stbV2PrecisionLeftIdx]; stbV2SendFrame(left.nodeIndex, STB_V2_CMD_SET_BIAS, left.localIndex, 0, leftBiasX10, 0, 0, 0); stbV2PrecisionLastLeftBiasX10 = leftBiasX10; } if (rightBiasX10 != stbV2PrecisionLastRightBiasX10) { STBV2MotorState &right = stbV2Motors[stbV2PrecisionRightIdx]; stbV2SendFrame(right.nodeIndex, STB_V2_CMD_SET_BIAS, right.localIndex, 0, rightBiasX10, 0, 0, 0); stbV2PrecisionLastRightBiasX10 = rightBiasX10; } }',
    'void stbV2PrecisionClearState() { stbV2PrecisionActive = false; stbV2PrecisionDistanceMove = false; stbV2PrecisionReverse = false; stbV2PrecisionLeftIdx = -1; stbV2PrecisionRightIdx = -1; stbV2PrecisionLastLeftBiasX10 = 0; stbV2PrecisionLastRightBiasX10 = 0; stbV2PrecisionTargetTicks = 0; stbV2PrecisionTargetDistanceCm = 0.0f; stbV2PrecisionLeftCommandPct = 0; stbV2PrecisionRightCommandPct = 0; stbV2PrecisionGyroIntegral = 0.0f; stbV2PrecisionAppliedCorrectionPct = 0.0f; stbV2PrecisionArrivalCorrectionPct = 0.0f; stbV2PrecisionFinishStartedMs = 0UL; stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionIsTurn = false; stbV2MotionTargetDistanceCm = 0.0f; }',
    'void stbV2PrecisionStop(const char *reason = "MANUAL") { if (!stbV2PrecisionActive) return; stbV2PrecisionTraceSample("STOP_PRE", true); stbV2PrecisionSendBias(0, 0); stbV2StopBySelector(String("MOTION"), true); stbV2RuntimeTick(); stbV2PrecisionTraceStop(reason); stbV2PrecisionClearState(); }',
    'void stbV2PrecisionRuntimeTick() {',
    '  if (!stbV2PrecisionActive) return;',
    '  unsigned long now = millis();',
    '  if (now - stbV2PrecisionLastControlMs < 15UL) return;',
    '  float dt = static_cast<float>(now - stbV2PrecisionLastControlMs) / 1000.0f;',
    '  stbV2PrecisionLastControlMs = now;',
    '  if (stbV2PrecisionLeftIdx < 0 || stbV2PrecisionRightIdx < 0) { stbV2PrecisionStop("NO_PAIR"); return; }',
    '  STBV2MotorState &left = stbV2Motors[stbV2PrecisionLeftIdx]; STBV2MotorState &right = stbV2Motors[stbV2PrecisionRightIdx];',
    '  if (left.fault || right.fault) { stbV2PrecisionStop("FAULT"); return; }',
    '  bool leftDone = left.currentState == STB_V2_STATE_DONE; bool rightDone = right.currentState == STB_V2_STATE_DONE;',
    '  if (stbV2PrecisionDistanceMove && leftDone && rightDone) { stbV2PrecisionStop("BOTH_DONE"); return; }',
    '  if (stbV2PrecisionDistanceMove && (leftDone || rightDone)) { if (stbV2PrecisionFinishStartedMs == 0UL) { stbV2PrecisionFinishStartedMs = now; stbV2PrecisionSendBias(0, 0); stbV2PrecisionAppliedCorrectionPct = 0.0f; stbV2PrecisionArrivalCorrectionPct = 0.0f; stbV2PrecisionTraceSample(leftDone ? "ONE_DONE_LEFT" : "ONE_DONE_RIGHT", true); } if (now - stbV2PrecisionFinishStartedMs >= STB_V2_PRECISION_FINISH_TIMEOUT_MS) { stbV2PrecisionStop(leftDone ? "FINISH_LEFT_TIMEOUT" : "FINISH_RIGHT_TIMEOUT"); return; } if (stbV2Gyro.ready) stbV2UpdateGyro(); stbV2PrecisionLastYawError = stbV2Gyro.ready ? stbV2WrapAngleDeg(stbV2Gyro.angleDeg - stbV2PrecisionStartYaw) : stbV2PrecisionLastYawError; stbV2PrecisionTraceSample(leftDone ? "WAIT_RIGHT" : "WAIT_LEFT", false); return; }',
    '  if (!left.busy && !right.busy) { stbV2PrecisionStop("IDLE"); return; }',
    '  int32_t leftTravel = labs(left.encoderTicks - stbV2PrecisionLeftStartTicks); int32_t rightTravel = labs(right.encoderTicks - stbV2PrecisionRightStartTicks);',
    '  if (stbV2Gyro.ready) stbV2UpdateGyro();',
    '  float physicalYawError = stbV2Gyro.ready ? stbV2WrapAngleDeg(stbV2Gyro.angleDeg - stbV2PrecisionStartYaw) : 0.0f;',
    '  float rawYawError = stbV2PrecisionReverse ? -physicalYawError : physicalYawError;',
    '  float rawYawRate = dt > 0.0f ? stbV2WrapAngleDeg(rawYawError - stbV2PrecisionLastRawYawError) / dt : 0.0f; stbV2PrecisionLastRawYawError = rawYawError;',
    '  stbV2PrecisionFilteredYawRate += (rawYawRate - stbV2PrecisionFilteredYawRate) * 0.35f;',
    '  float yawError = fabsf(rawYawError) < stbV2PrecisionConfig.angleDeadbandDeg ? 0.0f : rawYawError;',
    '  float encoderErrorCm = stbV2TicksToCm(leftTravel) - stbV2TicksToCm(rightTravel);',
    '  float leftRemainCm = stbV2PrecisionDistanceMove ? max(0.0f, stbV2PrecisionTargetDistanceCm - stbV2TicksToCm(leftTravel)) : 9999.0f; float rightRemainCm = stbV2PrecisionDistanceMove ? max(0.0f, stbV2PrecisionTargetDistanceCm - stbV2TicksToCm(rightTravel)) : 9999.0f;',
    '  bool approachActive = stbV2PrecisionDistanceMove && min(leftRemainCm, rightRemainCm) <= STB_V2_PRECISION_APPROACH_DISTANCE_CM;',
    '  bool returningToCenter = yawError != 0.0f && (yawError * stbV2PrecisionFilteredYawRate) < 0.0f;',
    '  if (approachActive) stbV2PrecisionGyroIntegral *= 0.86f; else if (yawError == 0.0f || fabsf(rawYawError) < 0.8f) stbV2PrecisionGyroIntegral *= 0.78f; else if (returningToCenter) stbV2PrecisionGyroIntegral *= 0.90f; else { if (stbV2PrecisionGyroIntegral * yawError < 0.0f) stbV2PrecisionGyroIntegral *= 0.25f; stbV2PrecisionGyroIntegral = constrain(stbV2PrecisionGyroIntegral + (yawError * dt), -STB_V2_PRECISION_INTEGRAL_LIMIT, STB_V2_PRECISION_INTEGRAL_LIMIT); }',
    '  float gyroCorrectionPct = ((yawError * stbV2PrecisionConfig.gyroKp) + (stbV2PrecisionFilteredYawRate * stbV2PrecisionConfig.gyroKd) + (stbV2PrecisionGyroIntegral * STB_V2_PRECISION_GYRO_KI)) * stbV2PrecisionConfig.gyroPolarity;',
    '  stbV2PrecisionArrivalCorrectionPct = approachActive ? constrain(encoderErrorCm * STB_V2_PRECISION_APPROACH_GAIN, -STB_V2_PRECISION_APPROACH_MAX_PCT, STB_V2_PRECISION_APPROACH_MAX_PCT) : 0.0f;',
    '  float correctionPct = gyroCorrectionPct + (encoderErrorCm * stbV2PrecisionConfig.encoderKp) + stbV2PrecisionArrivalCorrectionPct;',
    '  if (now - stbV2PrecisionStartedMs < stbV2PrecisionConfig.launchWindowMs) { const int32_t launchLeadTicks = 18; if (leftTravel > rightTravel + launchLeadTicks && rightTravel < 36) correctionPct = max(correctionPct, stbV2PrecisionConfig.maxCorrectionPct); else if (rightTravel > leftTravel + launchLeadTicks && leftTravel < 36) correctionPct = min(correctionPct, -stbV2PrecisionConfig.maxCorrectionPct); }',
    '  float encoderEmergencyMix = constrain((fabsf(encoderErrorCm) - STB_V2_PRECISION_EMERGENCY_ENCODER_START_CM) / (STB_V2_PRECISION_EMERGENCY_ENCODER_FULL_CM - STB_V2_PRECISION_EMERGENCY_ENCODER_START_CM), 0.0f, 1.0f);',
    '  float yawEmergencyMix = constrain((fabsf(rawYawError) - STB_V2_PRECISION_EMERGENCY_YAW_START_DEG) / (STB_V2_PRECISION_EMERGENCY_YAW_FULL_DEG - STB_V2_PRECISION_EMERGENCY_YAW_START_DEG), 0.0f, 1.0f);',
    '  float emergencyMix = max(encoderEmergencyMix, yawEmergencyMix);',
    '  float activeCorrectionMaxPct = stbV2PrecisionConfig.maxCorrectionPct + ((max(stbV2PrecisionConfig.maxCorrectionPct, STB_V2_PRECISION_EMERGENCY_MAX_PCT) - stbV2PrecisionConfig.maxCorrectionPct) * emergencyMix);',
    '  correctionPct = constrain(correctionPct, -activeCorrectionMaxPct, activeCorrectionMaxPct);',
    '  if (stbV2PrecisionAppliedCorrectionPct < correctionPct) stbV2PrecisionAppliedCorrectionPct = min(stbV2PrecisionAppliedCorrectionPct + STB_V2_PRECISION_CORRECTION_SLEW_PCT, correctionPct); else if (stbV2PrecisionAppliedCorrectionPct > correctionPct) stbV2PrecisionAppliedCorrectionPct = max(stbV2PrecisionAppliedCorrectionPct - STB_V2_PRECISION_CORRECTION_SLEW_PCT, correctionPct);',
    '  stbV2PrecisionLastYawError = rawYawError; stbV2PrecisionLastCorrectionPct = stbV2PrecisionAppliedCorrectionPct; stbV2PrecisionLastEncoderErrorCm = encoderErrorCm;',
    '  int correctionX10 = static_cast<int>(lroundf(fabsf(stbV2PrecisionAppliedCorrectionPct) * 10.0f));',
    '  if (stbV2PrecisionAppliedCorrectionPct > 0.0f) stbV2PrecisionSendBias(-correctionX10, 0); else if (stbV2PrecisionAppliedCorrectionPct < 0.0f) stbV2PrecisionSendBias(0, -correctionX10); else stbV2PrecisionSendBias(0, 0);',
    '  stbV2PrecisionTraceSample(approachActive ? "APPROACH" : "RUN", false);',
    '}',
    'bool stbV2PrecisionBegin(float distanceCm, int speedPct, bool distanceMove, bool reverseMove) {',
    '  stbV2InitRuntime(); if (!stbV2HasMotionPair()) return false;',
    '  stbV2StopBySelector(String("MOTION"), true); stbV2RuntimeTick();',
    '  stbV2PrecisionLeftIdx = stbV2FindMotorBySide(STB_V2_SIDE_LEFT); stbV2PrecisionRightIdx = stbV2FindMotorBySide(STB_V2_SIDE_RIGHT); if (stbV2PrecisionLeftIdx < 0 || stbV2PrecisionRightIdx < 0) return false;',
    '  int requestedSpeed = constrain(abs(speedPct), stbV2PrecisionConfig.minSpeedPct, 100);',
    '  int leftSpeed = constrain(static_cast<int>(lroundf(requestedSpeed * stbV2PrecisionConfig.leftScalePct / 100.0f)), 1, 100);',
    '  int rightSpeed = constrain(static_cast<int>(lroundf(requestedSpeed * stbV2PrecisionConfig.rightScalePct / 100.0f)), 1, 100);',
    '  int32_t targetTicks = distanceMove ? stbV2CmToTicks(fabsf(distanceCm)) : 2147483647L; if (distanceMove && targetTicks <= 0) return false; int32_t signedTargetTicks = reverseMove ? -targetTicks : targetTicks;',
    '  bool gyroReady = stbV2PrecisionPrepareGyro();',
    '  STBV2MotorState &left = stbV2Motors[stbV2PrecisionLeftIdx]; STBV2MotorState &right = stbV2Motors[stbV2PrecisionRightIdx];',
    '  stbV2MotionContinuousActive = false; stbV2MotionDistanceActive = false; stbV2MotionIsTurn = true;',
    '  stbV2PrepareMotorMove(static_cast<uint8_t>(stbV2PrecisionLeftIdx), signedTargetTicks, leftSpeed); stbV2PrepareMotorMove(static_cast<uint8_t>(stbV2PrecisionRightIdx), signedTargetTicks, rightSpeed);',
    '  bool leftArmed = stbV2WaitMotorState(static_cast<uint8_t>(stbV2PrecisionLeftIdx), STB_V2_STATE_ARMED, 350UL); bool rightArmed = stbV2WaitMotorState(static_cast<uint8_t>(stbV2PrecisionRightIdx), STB_V2_STATE_ARMED, 350UL); if (!leftArmed || !rightArmed) { stbV2StopBySelector(String("MOTION"), true); stbV2PrecisionClearState(); return false; }',
    '  stbV2PrecisionLeftStartTicks = left.encoderTicks; stbV2PrecisionRightStartTicks = right.encoderTicks; stbV2PrecisionLastLeftBiasX10 = 0; stbV2PrecisionLastRightBiasX10 = 0;',
    '  stbV2PrecisionTargetTicks = distanceMove ? targetTicks : -1; stbV2PrecisionTargetDistanceCm = distanceMove ? fabsf(distanceCm) : 0.0f; stbV2PrecisionLeftCommandPct = leftSpeed; stbV2PrecisionRightCommandPct = rightSpeed; stbV2PrecisionReverse = reverseMove;',
    '  stbV2PrecisionStartYaw = gyroReady ? stbV2Gyro.angleDeg : 0.0f; stbV2PrecisionLastRawYawError = 0.0f; stbV2PrecisionFilteredYawRate = 0.0f; stbV2PrecisionLastYawError = 0.0f; stbV2PrecisionLastCorrectionPct = 0.0f; stbV2PrecisionLastEncoderErrorCm = 0.0f; stbV2PrecisionGyroIntegral = 0.0f; stbV2PrecisionAppliedCorrectionPct = 0.0f; stbV2PrecisionArrivalCorrectionPct = 0.0f; stbV2PrecisionFinishStartedMs = 0UL;',
    '  stbV2GoMotionPair(static_cast<uint8_t>(stbV2PrecisionLeftIdx), static_cast<uint8_t>(stbV2PrecisionRightIdx));',
    '  stbV2PrecisionStartedMs = millis(); stbV2PrecisionLastControlMs = stbV2PrecisionStartedMs; stbV2PrecisionDistanceMove = distanceMove; stbV2PrecisionActive = true; stbV2PrecisionTraceSeq++; stbV2PrecisionTraceBegin(gyroReady, signedTargetTicks, requestedSpeed); stbV2PrecisionTraceSample("START", true); return true;',
    '}',
    'void stbV2PrecisionMoveDistanceBlocking(float distanceCm, int speedPct, bool reverseMove = false) { if (!stbV2PrecisionBegin(distanceCm, speedPct, true, reverseMove)) return; unsigned long timeoutMs = constrain(static_cast<unsigned long>(fabsf(distanceCm) * 1200.0f) + 4000UL, 4000UL, 30000UL); unsigned long startMs = millis(); while (stbV2PrecisionActive && millis() - startMs < timeoutMs) { stbV2RuntimeTick(); stbV2PrecisionRuntimeTick(); delay(2); } if (stbV2PrecisionActive) stbV2PrecisionStop("TIMEOUT"); }',
    'void stbV2PrecisionMoveContinuous(int speedPct, bool reverseMove = false) { stbV2PrecisionBegin(0.0f, speedPct, false, reverseMove); }'
  ].join('\n');
  Blockly.Arduino.loops_['stb_v2_precision_runtime_loop'] = 'stbV2PrecisionRuntimeTick();';
    }

    function stbV2CanonicalDurationExpr (value, timeUnit) {
return timeUnit === 'SECONDS' ? 'stbV2DurationToMs(' + value + ', "SECONDS")' : 'stbV2DurationToMs(' + value + ', "MILLISECONDS")';
    }

    function stbV2CanonicalDistanceExpr (value, distanceUnit, negative) {
return 'stbV2DistanceValueToMm(' + (negative ? '-(' + value + ')' : value) + ', "' + distanceUnit + '")';
    }

    function stbV2CanonicalTurnCode (side, value, turnUnit, waitForIdle) {
var code = 'stbV2TurnByAmount("' + side + '", ' + value + ', "' + turnUnit + '", 0);\n';
  if (waitForIdle) {
    code += 'stbV2WaitForSelectorIdle("MOTION", 120000UL);\n';
  }
  return code;
    }

    Arduino['stbv2puertos_moverServoPuerto'] = function(block) {
        var port = block.getFieldValue('PORT') || '2';
  var angle = Blockly.Arduino.valueToCode(block, 'ANGLE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  var pin = stbV2ServoPinForPort(port);
  if (!pin) {
    return '// Puerto sin soporte para servo: ' + String(port) + '\n';
  }
  ensureServoDefinitionForPin(pin);
  var suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
  return 'servoWriteAngle_' + suffix + '(' + angle + ');\n';
    };
    Arduino['arduino_stbv2puertos_moverServoPuerto'] = Arduino['stbv2puertos_moverServoPuerto'];
    Arduino['stbv2puertos_moverServoPuertoPorPulsos'] = function(block) {
        var port = block.getFieldValue('PORT') || '2';
  var pulse = Blockly.Arduino.valueToCode(block, 'PULSE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1500';
  var pin = stbV2ServoPinForPort(port);
  if (!pin) {
    return '// Puerto sin soporte para servo: ' + String(port) + '\n';
  }
  ensureServoDefinitionForPin(pin);
  var suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
  return 'servoWritePulse_' + suffix + '(' + pulse + ');\n';
    };
    Arduino['arduino_stbv2puertos_moverServoPuertoPorPulsos'] = Arduino['stbv2puertos_moverServoPuertoPorPulsos'];
    Arduino['stbv2puertos_desconectarServoPuerto'] = function(block) {
        var port = block.getFieldValue('PORT') || '2';
  var pin = stbV2ServoPinForPort(port);
  if (!pin) {
    return '// Puerto sin soporte para servo: ' + String(port) + '\n';
  }
  ensureServoDefinitionForPin(pin);
  var suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
  return 'servoDetach_' + suffix + '();\n';
    };
    Arduino['arduino_stbv2puertos_desconectarServoPuerto'] = Arduino['stbv2puertos_desconectarServoPuerto'];
    Arduino['stbv2puertos_moverServoPuertoSuavemente'] = function(block) {
        var port = block.getFieldValue('PORT') || '2';
  var angle = Blockly.Arduino.valueToCode(block, 'ANGLE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1000';
  var pin = stbV2ServoPinForPort(port);
  if (!pin) {
    return '// Puerto sin soporte para servo: ' + String(port) + '\n';
  }
  ensureServoDefinitionForPin(pin);
  var suffix = String(pin).replace(/[^A-Za-z0-9_]/g, '_');
  return 'servoMoveSmooth_' + suffix + '(' + angle + ', ' + time + ');\n';
    };
    Arduino['arduino_stbv2puertos_moverServoPuertoSuavemente'] = Arduino['stbv2puertos_moverServoPuertoSuavemente'];
    Arduino['stbv2inicio_stbBoardV2_initBootScreen'] = function(block) {
        // Inicialización de Pantalla OLED (Presentación previa)
  ensureStbV2OledInitHelper();
  ensureStbV2ButtonsReadHelper();
  ensureStbV2BootUiControlBase();
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  
  // Agregar Adafruit_INA219
  Blockly.Arduino.includes_['include_ina219'] = '#include <Adafruit_INA219.h>';
  Blockly.Arduino.definitions_['define_ina219'] = 'Adafruit_INA219 ina219;';

  Blockly.Arduino.definitions_['define_stbv2_bootscreen_ui'] = [
    'unsigned long stbV2BatteryLastReadMs = 0UL;',
    'unsigned long stbV2UiLastDrawMs = 0UL;',
    'unsigned long stbV2AnimLastFrameMs = 0UL;',
    'unsigned long stbV2ModeSelectLastMs = 0UL;',
    'float stbV2BatteryPercent = 100.0f;',
    'float stbV2BatteryVoltage = 0.0f;',
    'float stbV2BatteryCurrentmA = 0.0f;',
    'bool stbV2BatteryCharging = false;',
    'bool stbV2BatteryReady = false;',
    'uint8_t stbV2OledMode = 0;',
    'uint8_t stbV2AnimFrame = 0;',
    'bool stbV2ButtonHandled[6] = {false, false, false, false, false, false};',
    'const unsigned long STB_V2_BATTERY_READ_INTERVAL_MS = 60000UL;',
    'const unsigned long STB_V2_BATTERY_READ_CHARGING_INTERVAL_MS = 1800UL;',
    'const unsigned long STB_V2_UI_REDRAW_INTERVAL_MS = 140UL;',
    'const unsigned long STB_V2_ANIM_INTERVAL_MS = 180UL;',
    'const unsigned long STB_V2_MODE_SELECT_DEBOUNCE_MS = 280UL;',
    '',
    'float stbV2ClampBatteryPercent(float value) {',
    '  if (value < 0.0f) return 0.0f;',
    '  if (value > 100.0f) return 100.0f;',
    '  return value;',
    '}',
    '',
    'float stbV2BatteryPercentFromVoltage(float voltage) {',
    '  return stbV2ClampBatteryPercent(((voltage - 6.0f) / (8.4f - 6.0f)) * 100.0f);',
    '}',
    '',
    'float stbV2NormalizeBatteryVoltage(float value) {',
    '  if (!isfinite(value)) return 0.0f;',
    '  if (value < 0.0f) return 0.0f;',
    '  if (value > 10.5f) return 0.0f;',
    '  return value;',
    '}',
    '',
    'void stbV2DrawBatteryGauge(float percent) {',
    '  int x = 6;',
    '  int y = 18;',
    '  int w = 28;',
    '  int h = 42;',
    '  stbV2Oled.drawRoundRect(x, y, w, h, 4, SSD1306_WHITE);',
    '  stbV2Oled.fillRect(x + w, y + 12, 4, 16, SSD1306_WHITE);',
    '  int innerH = h - 6;',
    '  int fillH = static_cast<int>((innerH * percent) / 100.0f);',
    '  if (fillH < 0) fillH = 0;',
    '  if (fillH > innerH) fillH = innerH;',
    '  if (fillH > 0) {',
    '    stbV2Oled.fillRoundRect(x + 3, y + h - 3 - fillH, w - 6, fillH, 2, SSD1306_WHITE);',
    '  }',
    '  if (stbV2BatteryCharging) {',
    '    uint8_t step = stbV2AnimFrame % 4;',
    '    if (step >= 1) stbV2Oled.fillRect(x + 4, y + 28, w - 8, 8, SSD1306_WHITE);',
    '    if (step >= 2) stbV2Oled.fillRect(x + 4, y + 18, w - 8, 8, SSD1306_WHITE);',
    '    if (step >= 3) stbV2Oled.fillRect(x + 4, y + 8, w - 8, 8, SSD1306_WHITE);',
    '  }',
    '}',
    '',
    'void stbV2DrawBatteryDashboard() {',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.setTextColor(SSD1306_WHITE);',
    '  stbV2Oled.setTextWrap(false);',
    '  stbV2Oled.setTextSize(1);',
    '  stbV2Oled.setCursor(4, 2);',
    '  stbV2Oled.print("B1 BATERIA");',
    '  stbV2Oled.setCursor(82, 2);',
    '  stbV2Oled.print(stbV2BatteryCharging ? "CARGA" : "LISTO");',
    '  stbV2DrawBatteryGauge(stbV2BatteryPercent);',
    '  stbV2Oled.setTextSize(3);',
    '  stbV2Oled.setCursor(42, 14);',
    '  if (stbV2BatteryPercent < 10.0f) stbV2Oled.print(" ");',
    '  if (stbV2BatteryPercent < 100.0f) stbV2Oled.print(" ");',
    '  stbV2Oled.print(static_cast<int>(stbV2BatteryPercent + 0.5f));',
    '  stbV2Oled.print("%");',
    '  stbV2Oled.setTextSize(1);',
    '  stbV2Oled.setCursor(44, 40);',
    '  stbV2Oled.print(stbV2BatteryVoltage, 2);',
    '  stbV2Oled.print("V");',
    '  stbV2Oled.setCursor(84, 40);',
    '  if (stbV2BatteryCurrentmA >= 0.0f) stbV2Oled.print("+");',
    '  stbV2Oled.print(stbV2BatteryCurrentmA, 0);',
    '  stbV2Oled.print("mA");',
    '  stbV2Oled.setCursor(44, 54);',
    '  stbV2Oled.print("B2..B6 MODOS");',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawEyesMode() {',
    '  int leftX = 14;',
    '  int rightX = 72;',
    '  int y = 16;',
    '  int w = 42;',
    '  int h = 20;',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '  if ((stbV2AnimFrame % 8) == 4) {',
    '    stbV2Oled.drawFastHLine(leftX, y + 10, w, SSD1306_WHITE);',
    '    stbV2Oled.drawFastHLine(rightX, y + 10, w, SSD1306_WHITE);',
    '  } else {',
    '    stbV2Oled.drawRoundRect(leftX, y, w, h, 8, SSD1306_WHITE);',
    '    stbV2Oled.drawRoundRect(rightX, y, w, h, 8, SSD1306_WHITE);',
    '    int dx = (stbV2AnimFrame % 4) == 1 ? 4 : ((stbV2AnimFrame % 4) == 3 ? -4 : 0);',
    '    stbV2Oled.fillCircle(leftX + 21 + dx, y + 10, 5, SSD1306_WHITE);',
    '    stbV2Oled.fillCircle(rightX + 21 + dx, y + 10, 5, SSD1306_WHITE);',
    '  }',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawAngryMode() {',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '  stbV2Oled.drawLine(18, 18, 48, 10, SSD1306_WHITE);',
    '  stbV2Oled.drawLine(80, 10, 110, 18, SSD1306_WHITE);',
    '  stbV2Oled.fillRoundRect(20, 20, 28, 10, 4, SSD1306_WHITE);',
    '  stbV2Oled.fillRoundRect(80, 20, 28, 10, 4, SSD1306_WHITE);',
    '  stbV2Oled.fillCircle(34 + ((stbV2AnimFrame % 2) ? 2 : -2), 25, 3, SSD1306_BLACK);',
    '  stbV2Oled.fillCircle(94 + ((stbV2AnimFrame % 2) ? -2 : 2), 25, 3, SSD1306_BLACK);',
    '  stbV2Oled.drawCircle(64, 46, 16, SSD1306_WHITE);',
    '  stbV2Oled.fillRect(48, 46, 32, 8, SSD1306_BLACK);',
    '  stbV2Oled.drawFastHLine(46, 52, 36, SSD1306_WHITE);',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawOrbitMode() {',
    '  static const int8_t px[8] = {0, 18, 26, 18, 0, -18, -26, -18};',
    '  static const int8_t py[8] = {-22, -16, 0, 16, 22, 16, 0, -16};',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawCircle(64, 32, 24, SSD1306_WHITE);',
    '  stbV2Oled.fillCircle(64, 32, 5, SSD1306_WHITE);',
    '  uint8_t frame = stbV2AnimFrame % 8;',
    '  stbV2Oled.fillCircle(64 + px[frame], 32 + py[frame], 4, SSD1306_WHITE);',
    '  stbV2Oled.fillCircle(64 - px[frame], 32 - py[frame], 3, SSD1306_WHITE);',
    '  stbV2Oled.drawFastHLine(20, 56, 88, SSD1306_WHITE);',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawEqualizerMode() {',
    '  static const uint8_t patterns[6][5] = {',
    '    {12, 22, 34, 18, 28},',
    '    {26, 14, 30, 38, 20},',
    '    {36, 24, 12, 28, 40},',
    '    {18, 34, 26, 12, 30},',
    '    {30, 18, 38, 24, 14},',
    '    {14, 28, 20, 36, 26}',
    '  };',
    '  uint8_t frame = stbV2AnimFrame % 6;',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '  for (uint8_t i = 0; i < 5; ++i) {',
    '    int x = 16 + (i * 22);',
    '    int h = patterns[frame][i];',
    '    stbV2Oled.drawRoundRect(x, 52 - h, 14, h, 2, SSD1306_WHITE);',
    '    stbV2Oled.fillRoundRect(x + 2, 54 - h, 10, h - 4, 2, SSD1306_WHITE);',
    '  }',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawStarsMode() {',
    '  static const uint8_t sx[8] = {14, 36, 58, 82, 104, 24, 72, 112};',
    '  static const uint8_t sy[8] = {12, 28, 10, 24, 14, 46, 42, 50};',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '  for (uint8_t i = 0; i < 8; ++i) {',
    '    uint8_t phase = (stbV2AnimFrame + i) % 4;',
    '    int x = sx[i];',
    '    int y = sy[i];',
    '    stbV2Oled.drawPixel(x, y, SSD1306_WHITE);',
    '    if (phase > 0) {',
    '      stbV2Oled.drawFastHLine(x - 1, y, 3, SSD1306_WHITE);',
    '      stbV2Oled.drawFastVLine(x, y - 1, 3, SSD1306_WHITE);',
    '    }',
    '    if (phase > 2) {',
    '      stbV2Oled.drawPixel(x - 1, y - 1, SSD1306_WHITE);',
    '      stbV2Oled.drawPixel(x + 1, y + 1, SSD1306_WHITE);',
    '      stbV2Oled.drawPixel(x + 1, y - 1, SSD1306_WHITE);',
    '      stbV2Oled.drawPixel(x - 1, y + 1, SSD1306_WHITE);',
    '    }',
    '  }',
    '  stbV2Oled.fillCircle(62, 34, 8, SSD1306_WHITE);',
    '  stbV2Oled.fillCircle(72, 34, 8, SSD1306_WHITE);',
    '  stbV2Oled.fillTriangle(54, 34, 80, 34, 67, 54, SSD1306_WHITE);',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2DrawWavesMode() {',
    '  stbV2Oled.clearDisplay();',
    '  stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '  for (uint8_t x = 0; x < 128; x += 4) {',
    '    int y1 = 18 + static_cast<int>(6.0f * sin((x + stbV2AnimFrame * 8) * 0.15f));',
    '    int y2 = 34 + static_cast<int>(7.0f * sin((x + stbV2AnimFrame * 10) * 0.12f));',
    '    int y3 = 50 + static_cast<int>(5.0f * sin((x + stbV2AnimFrame * 12) * 0.18f));',
    '    stbV2Oled.fillCircle(x, y1, 1, SSD1306_WHITE);',
    '    stbV2Oled.fillCircle(x, y2, 1, SSD1306_WHITE);',
    '    stbV2Oled.fillCircle(x, y3, 1, SSD1306_WHITE);',
    '  }',
    '  stbV2Oled.display();',
    '}',
    '',
    'void stbV2RenderCurrentMode() {',
    '  switch (stbV2OledMode) {',
    '    case 0: stbV2DrawBatteryDashboard(); break;',
    '    case 1: stbV2DrawEyesMode(); break;',
    '    case 2: stbV2DrawAngryMode(); break;',
    '    case 3: stbV2DrawOrbitMode(); break;',
    '    case 4: stbV2DrawEqualizerMode(); break;',
    '    case 5: stbV2DrawStarsMode(); break;',
    '    default: stbV2DrawWavesMode(); break;',
    '  }',
    '}',
    '',
    'void stbV2HandleModeButtons() {',
    '  unsigned long now = millis();',
    '  for (uint8_t i = 0; i < 6; ++i) {',
    '    bool pressed = stbV2ReadButton(String("B") + String(i + 1));',
    '    if (pressed && !stbV2ButtonHandled[i] && (now - stbV2ModeSelectLastMs) >= STB_V2_MODE_SELECT_DEBOUNCE_MS) {',
    '      stbV2OledMode = i;',
    '      stbV2ButtonHandled[i] = true;',
    '      stbV2ModeSelectLastMs = now;',
    '      stbV2UiLastDrawMs = 0UL;',
    '    }',
    '    if (!pressed) {',
    '      stbV2ButtonHandled[i] = false;',
    '    }',
    '  }',
    '}',
    '',
    'void stbV2ReadBatteryStatus() {',
    '  float validSum = 0.0f;',
    '  uint8_t validCount = 0;',
    '  float currentSum = 0.0f;',
    '  for (uint8_t i = 0; i < 4; ++i) {',
    '    float busVoltage = ina219.getBusVoltage_V();',
    '    float shuntVoltage = ina219.getShuntVoltage_mV() / 1000.0f;',
    '    float loadVoltage = stbV2NormalizeBatteryVoltage(busVoltage + shuntVoltage);',
    '    if (loadVoltage <= 0.0f) {',
    '      loadVoltage = stbV2NormalizeBatteryVoltage(busVoltage);',
    '    }',
    '    if (loadVoltage > 0.0f) {',
    '      validSum += loadVoltage;',
    '      validCount++;',
    '    }',
    '    currentSum += ina219.getCurrent_mA();',
    '    delay(2);',
    '  }',
    '  if (validCount > 0) {',
    '    float sampledVoltage = validSum / validCount;',
    '    if (!stbV2BatteryReady) {',
    '      stbV2BatteryVoltage = sampledVoltage;',
    '    } else {',
    '      stbV2BatteryVoltage = (stbV2BatteryVoltage * 0.75f) + (sampledVoltage * 0.25f);',
    '    }',
    '  }',
    '  stbV2BatteryCurrentmA = currentSum / 4.0f;',
    '  stbV2BatteryCharging = stbV2BatteryCurrentmA > 20.0f;',
    '  float sampledPercent = stbV2BatteryPercentFromVoltage(stbV2BatteryVoltage);',
    '  if (!stbV2BatteryReady) {',
    '    stbV2BatteryPercent = sampledPercent;',
    '    stbV2BatteryReady = true;',
    '  } else {',
    '    stbV2BatteryPercent = (stbV2BatteryPercent * 0.78f) + (sampledPercent * 0.22f);',
    '  }',
    '  stbV2BatteryPercent = stbV2ClampBatteryPercent(stbV2BatteryPercent);',
    '  stbV2BatteryLastReadMs = millis();',
    '}',
    '',
    'void stbV2BatteryUiTick() {',
    '  unsigned long now = millis();',
    '  if (!stbV2BootUiEnabled) {',
    '    return;',
    '  }',
    '  if (stbV2BootUiAllowModeButtons) {',
    '    stbV2HandleModeButtons();',
    '  }',
    '  unsigned long readInterval = stbV2BatteryCharging ? STB_V2_BATTERY_READ_CHARGING_INTERVAL_MS : STB_V2_BATTERY_READ_INTERVAL_MS;',
    '  if (!stbV2BatteryReady || now - stbV2BatteryLastReadMs >= readInterval) {',
    '    stbV2ReadBatteryStatus();',
    '  }',
    '  if (now - stbV2AnimLastFrameMs >= STB_V2_ANIM_INTERVAL_MS) {',
    '    stbV2AnimFrame++;',
    '    stbV2AnimLastFrameMs = now;',
    '  }',
    '  if (now - stbV2UiLastDrawMs >= STB_V2_UI_REDRAW_INTERVAL_MS) {',
    '    stbV2RenderCurrentMode();',
    '    stbV2UiLastDrawMs = now;',
    '  }',
    '}',
    '',
    'void stbV2ShowWelcomeSequence() {',
    '  static const char *msgs[2] = {"BIENVENIDO", "STBOARD V2"};',
    '  for (uint8_t i = 0; i < 2; ++i) {',
    '    stbV2Oled.clearDisplay();',
    '    stbV2Oled.drawRoundRect(0, 0, 128, 64, 8, SSD1306_WHITE);',
    '    stbV2Oled.drawRoundRect(4, 4, 120, 56, 6, SSD1306_WHITE);',
    '    stbV2Oled.setTextColor(SSD1306_WHITE);',
    '    stbV2Oled.setTextWrap(false);',
    '    stbV2Oled.setTextSize(2);',
    '    int16_t x1, y1;',
    '    uint16_t w, h;',
    '    stbV2Oled.getTextBounds(msgs[i], 0, 0, &x1, &y1, &w, &h);',
    '    int textX = (128 - static_cast<int>(w)) / 2;',
    '    if (textX < 0) textX = 0;',
    '    stbV2Oled.setCursor(textX, 18);',
    '    stbV2Oled.print(msgs[i]);',
    '    stbV2Oled.setTextSize(1);',
    '    stbV2Oled.setCursor(24, 44);',
    '    stbV2Oled.print(i == 0 ? "Sistema iniciado" : "Midiendo bateria");',
    '    stbV2Oled.display();',
    '    delay(650);',
    '  }',
    '}'
  ].join('\n');

  // Setup code: OLED Screen
  Blockly.Arduino.setups_['setup_stbv2_bootscreen'] = [
    'stbV2OledInit(0x3C);',
    'ina219.begin();',
    'Wire.setClock(400000);',
    'stbV2BootUiEnabled = true;',
    'stbV2BootUiAllowModeButtons = true;',
    'stbV2ReadBatteryStatus();',
    'stbV2ShowWelcomeSequence();',
    'stbV2DrawBatteryDashboard();'
  ].join('\n  ');

  Blockly.Arduino.loops_['loop_stbv2_battery'] = 'stbV2BatteryUiTick();';

  return branch;
    };
    Arduino['arduino_stbv2inicio_stbBoardV2_initBootScreen'] = Arduino['stbv2inicio_stbBoardV2_initBootScreen'];
    Arduino['stbv2inicio_stbBoardV2_whenArduinoBegin'] = function(block) {
        var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
        if (branch) {
            Blockly.Arduino.setups_['user_setup'] = branch;
        }
        return '';
    };
    Arduino['arduino_stbv2inicio_stbBoardV2_whenArduinoBegin'] = Arduino['stbv2inicio_stbBoardV2_whenArduinoBegin'];
    Arduino['stbv2motores_configurarMotores'] = function(block) {
        ensureStbV2MegaConfigHelpers();
  var wheelDiameter = Blockly.Arduino.valueToCode(block, 'WHEEL_DIAMETER', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '6.5';
  var maxRpm = Blockly.Arduino.valueToCode(block, 'MAX_RPM', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '120';
  var trackWidth = Blockly.Arduino.valueToCode(block, 'TRACK_WIDTH', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '14';
  return 'stbV2SetBoardDefaults(' + wheelDiameter + ', ' + maxRpm + ', ' + trackWidth + ');\n';
    };
    Arduino['arduino_stbv2motores_configurarMotores'] = Arduino['stbv2motores_configurarMotores'];
    Arduino['stbv2motores_configurarMotorLado'] = function(block) {
        ensureStbV2MegaConfigHelpers();
  var motor = block.getFieldValue('MOTOR') || 'A1';
  var side = block.getFieldValue('SIDE') || 'NONE';
  var motorIndexMap = {A1: 0, A2: 1, B3: 2, B4: 3};
  var sideConstMap = {
    LEFT: 'STB_V2_SIDE_LEFT',
    RIGHT: 'STB_V2_SIDE_RIGHT',
    NONE: 'STB_V2_SIDE_NONE'
  };
  return 'stbV2ConfigureMotor(' + motorIndexMap[motor] + ', ' + sideConstMap[side] + ');\n';
    };
    Arduino['arduino_stbv2motores_configurarMotorLado'] = Arduino['stbv2motores_configurarMotorLado'];
    Arduino['stbv2motores_definirDireccionMotor'] = function(block) {
        ensureStbV2MegaConfigHelpers();
  var motor = block.getFieldValue('MOTOR') || 'A1';
  var direction = block.getFieldValue('DIRECTION') || 'NORMAL';
  var motorIndexMap = {A1: 0, A2: 1, B3: 2, B4: 3};
  return 'stbV2SetDirection(' + motorIndexMap[motor] + ', ' + (direction === 'INVERTED' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2motores_definirDireccionMotor'] = Arduino['stbv2motores_definirDireccionMotor'];
    Arduino['stbv2motores_definirVelocidadMotor'] = function(block) {
        ensureStbV2MegaConfigHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '100';
  return 'stbV2RuntimeTick();\n' +
    'stbV2SetSpeedBySelector("' + motor + '", ' + speed + ');\n';
    };
    Arduino['arduino_stbv2motores_definirVelocidadMotor'] = Arduino['stbv2motores_definirVelocidadMotor'];
    Arduino['stbv2motores_definirModoAvance'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var orientation = block.getFieldValue('ORIENTATION') || 'HORIZONTAL';
  return 'stbV2RuntimeTick();\n' +
    'stbV2SetMotionControlMode("PID_GYRO", "' + orientation + '");\n';
    };
    Arduino['arduino_stbv2motores_definirModoAvance'] = Arduino['stbv2motores_definirModoAvance'];
    Arduino['stbv2motores_avanzarMotor'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return 'stbV2RuntimeTick();\n' +
    'stbV2MoveBySelector("' + motor + '");\n';
    };
    Arduino['arduino_stbv2motores_avanzarMotor'] = Arduino['stbv2motores_avanzarMotor'];
    Arduino['stbv2motores_retrocederMotor'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return 'stbV2RuntimeTick();\n' +
    'stbV2ReverseBySelector("' + motor + '");\n';
    };
    Arduino['arduino_stbv2motores_retrocederMotor'] = Arduino['stbv2motores_retrocederMotor'];
    Arduino['stbv2motores_detenerMotor'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return 'stbV2RuntimeTick();\n' +
    'stbV2StopBySelector("' + motor + '");\n';
    };
    Arduino['arduino_stbv2motores_detenerMotor'] = Arduino['stbv2motores_detenerMotor'];
    Arduino['stbv2motores_avanzarMotorPorTiempo'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  return 'stbV2MoveForDurationUsingStoredSpeedBlocking("' + motor + '", false, ' + stbV2CanonicalDurationExpr(value, timeUnit) + ');\n';
    };
    Arduino['arduino_stbv2motores_avanzarMotorPorTiempo'] = Arduino['stbv2motores_avanzarMotorPorTiempo'];
    Arduino['stbv2motores_avanzarMotorPorTiempoSinEsperar'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  return 'stbV2MoveForDurationUsingStoredSpeedAsync("' + motor + '", false, ' + stbV2CanonicalDurationExpr(value, timeUnit) + ');\n';
    };
    Arduino['arduino_stbv2motores_avanzarMotorPorTiempoSinEsperar'] = Arduino['stbv2motores_avanzarMotorPorTiempoSinEsperar'];
    Arduino['stbv2motores_avanzarMotorPorDistancia'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  return 'stbV2MoveDistanceBlocking("' + motor + '", ' + stbV2CanonicalDistanceExpr(value, distanceUnit, false) + ', 0);\n';
    };
    Arduino['arduino_stbv2motores_avanzarMotorPorDistancia'] = Arduino['stbv2motores_avanzarMotorPorDistancia'];
    Arduino['stbv2motores_avanzarMotorPorDistanciaSinEsperar'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  return 'stbV2MoveDistanceBySelector("' + motor + '", ' + stbV2CanonicalDistanceExpr(value, distanceUnit, false) + ', 0);\n';
    };
    Arduino['arduino_stbv2motores_avanzarMotorPorDistanciaSinEsperar'] = Arduino['stbv2motores_avanzarMotorPorDistanciaSinEsperar'];
    Arduino['stbv2motores_girarMotor'] = function(block) {
        ensureStbV2MegaTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  return 'stbV2RuntimeTick();\n' +
    'stbV2TurnContinuous("' + side + '");\n';
    };
    Arduino['arduino_stbv2motores_girarMotor'] = Arduino['stbv2motores_girarMotor'];
    Arduino['stbv2motores_girarMotorPorValor'] = function(block) {
        ensureStbV2MegaTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var turnUnit = block.getFieldValue('TURN_UNIT') || 'DEGREES';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  return stbV2CanonicalTurnCode(side, value, turnUnit, true);
    };
    Arduino['arduino_stbv2motores_girarMotorPorValor'] = Arduino['stbv2motores_girarMotorPorValor'];
    Arduino['stbv2motores_girarMotorPorValorSinEsperar'] = function(block) {
        ensureStbV2MegaTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var turnUnit = block.getFieldValue('TURN_UNIT') || 'DEGREES';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  return stbV2CanonicalTurnCode(side, value, turnUnit, false);
    };
    Arduino['arduino_stbv2motores_girarMotorPorValorSinEsperar'] = Arduino['stbv2motores_girarMotorPorValorSinEsperar'];
    Arduino['stbv2motores_avanzarHastaQue'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var condition = Blockly.Arduino.valueToCode(block, 'CONDITION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (!(' + condition + ')) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2MoveBySelector("' + motor + '");\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  code += 'stbV2StopBySelector("' + motor + '");\n';
  return code;
    };
    Arduino['arduino_stbv2motores_avanzarHastaQue'] = Arduino['stbv2motores_avanzarHastaQue'];
    Arduino['stbv2motores_retrocederMotorPorTiempoSinEsperar'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  return 'stbV2MoveForDurationUsingStoredSpeedAsync("' + motor + '", true, ' + stbV2CanonicalDurationExpr(value, timeUnit) + ');\n';
    };
    Arduino['arduino_stbv2motores_retrocederMotorPorTiempoSinEsperar'] = Arduino['stbv2motores_retrocederMotorPorTiempoSinEsperar'];
    Arduino['stbv2motores_retrocederMotorPorTiempo'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  return 'stbV2MoveForDurationUsingStoredSpeedBlocking("' + motor + '", true, ' + stbV2CanonicalDurationExpr(value, timeUnit) + ');\n';
    };
    Arduino['arduino_stbv2motores_retrocederMotorPorTiempo'] = Arduino['stbv2motores_retrocederMotorPorTiempo'];
    Arduino['stbv2motores_retrocederMotorPorDistanciaSinEsperar'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  return 'stbV2MoveDistanceBySelector("' + motor + '", ' + stbV2CanonicalDistanceExpr(value, distanceUnit, true) + ', 0);\n';
    };
    Arduino['arduino_stbv2motores_retrocederMotorPorDistanciaSinEsperar'] = Arduino['stbv2motores_retrocederMotorPorDistanciaSinEsperar'];
    Arduino['stbv2motores_retrocederMotorPorDistancia'] = function(block) {
        ensureStbV2MegaDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  return 'stbV2MoveDistanceBlocking("' + motor + '", ' + stbV2CanonicalDistanceExpr(value, distanceUnit, true) + ', 0);\n';
    };
    Arduino['arduino_stbv2motores_retrocederMotorPorDistancia'] = Arduino['stbv2motores_retrocederMotorPorDistancia'];
    Arduino['stbv2motores_retrocederHastaQue'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var condition = Blockly.Arduino.valueToCode(block, 'CONDITION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (!(' + condition + ')) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2ReverseBySelector("' + motor + '");\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  code += 'stbV2StopBySelector("' + motor + '");\n';
  return code;
    };
    Arduino['arduino_stbv2motores_retrocederHastaQue'] = Arduino['stbv2motores_retrocederHastaQue'];
    Arduino['stbv2motores_girarHastaQue'] = function(block) {
        ensureStbV2MegaTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var condition = Blockly.Arduino.valueToCode(block, 'CONDITION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (!(' + condition + ')) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2TurnContinuous("' + side + '");\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  code += 'stbV2StopBySelector("MOTION");\n';
  return code;
    };
    Arduino['arduino_stbv2motores_girarHastaQue'] = Arduino['stbv2motores_girarHastaQue'];
    Arduino['stbv2motores_detenerSi'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  var condition = Blockly.Arduino.valueToCode(block, 'CONDITION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || 'false';
  var code = '';
  code += 'if (' + condition + ') {\n';
  code += Blockly.Arduino.INDENT + 'stbV2StopBySelector("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2motores_detenerSi'] = Arduino['stbv2motores_detenerSi'];
    Arduino['stbv2motores_velocidadActualMotor'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return ['stbV2GetCurrentMotorRpm("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_velocidadActualMotor'] = Arduino['stbv2motores_velocidadActualMotor'];
    Arduino['stbv2motores_motorEnMovimiento'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return ['stbV2IsMotorMoving("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_motorEnMovimiento'] = Arduino['stbv2motores_motorEnMovimiento'];
    Arduino['stbv2motores_encoderMotor'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return ['stbV2GetEncoderValue("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_encoderMotor'] = Arduino['stbv2motores_encoderMotor'];
    Arduino['stbv2motores_distanciaRecorridaMotor'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return ['stbV2GetDistanceCm("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_distanciaRecorridaMotor'] = Arduino['stbv2motores_distanciaRecorridaMotor'];
    Arduino['stbv2motores_reiniciarDistanciaMotor'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return 'stbV2RuntimeTick();\n' +
    'stbV2ResetDistanceBySelector("' + motor + '");\n';
    };
    Arduino['arduino_stbv2motores_reiniciarDistanciaMotor'] = Arduino['stbv2motores_reiniciarDistanciaMotor'];
    Arduino['stbv2motores_motivoParadaMotor'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'MOTION';
  return ['stbV2GetLastStopReason("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_motivoParadaMotor'] = Arduino['stbv2motores_motivoParadaMotor'];
    Arduino['stbv2motores_codigoErrorNodo'] = function(block) {
        ensureStbV2MegaStatusHelpers();
  var node = block.getFieldValue('NODE') || '0';
  return ['stbV2GetLastErrorCode(' + node + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2motores_codigoErrorNodo'] = Arduino['stbv2motores_codigoErrorNodo'];
    Arduino['stbv2motores_esperarSeguro'] = function(block) {
        ensureStbV2MegaBase();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_ATOMIC) || '1';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var code = 'stbV2RuntimeTick();\n';
  if (timeUnit === 'SECONDS') {
    code += 'stbV2SafeDelay((unsigned long)(' + value + ') * 1000UL);\n';
  } else {
    code += 'stbV2SafeDelay((unsigned long)(' + value + '));\n';
  }
  return code;
    };
    Arduino['arduino_stbv2motores_esperarSeguro'] = Arduino['stbv2motores_esperarSeguro'];
    Arduino['stbv2gyro_configurarGiroscopio'] = function(block) {
        ensureStbV2GyroBase();
  var axis = block.getFieldValue('AXIS') || 'Z';
  var direction = block.getFieldValue('DIRECTION') || 'NORMAL';
  return 'stbV2ConfigureGyro(String("' + axis + '"), ' + (direction === 'INVERTED' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2gyro_configurarGiroscopio'] = Arduino['stbv2gyro_configurarGiroscopio'];
    Arduino['stbv2gyro_calibrarGiroscopio'] = function(block) {
        ensureStbV2GyroCalibrationHelpers();
  return 'stbV2CalibrateGyro();\n';
    };
    Arduino['arduino_stbv2gyro_calibrarGiroscopio'] = Arduino['stbv2gyro_calibrarGiroscopio'];
    Arduino['stbv2gyro_calibrarPosturaGiroscopio'] = function(block) {
        ensureStbV2GyroCalibrationHelpers();
  return 'stbV2CalibrateGyroPosture();\n';
    };
    Arduino['arduino_stbv2gyro_calibrarPosturaGiroscopio'] = Arduino['stbv2gyro_calibrarPosturaGiroscopio'];
    Arduino['stbv2gyro_reiniciarAnguloGiroscopio'] = function(block) {
        ensureStbV2GyroBase();
  return 'stbV2ResetGyroAngle();\n';
    };
    Arduino['arduino_stbv2gyro_reiniciarAnguloGiroscopio'] = Arduino['stbv2gyro_reiniciarAnguloGiroscopio'];
    Arduino['stbv2gyro_leerGiroscopio'] = function(block) {
        ensureStbV2GyroBase();
  return 'stbV2UpdateGyro();\n';
    };
    Arduino['arduino_stbv2gyro_leerGiroscopio'] = Arduino['stbv2gyro_leerGiroscopio'];
    Arduino['stbv2gyro_girarConGiroscopio'] = function(block) {
        ensureStbV2GyroMotionRuntime();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  return 'stbV2TurnByGyro(String("' + side + '"), ' + value + ', 0);\n';
    };
    Arduino['arduino_stbv2gyro_girarConGiroscopio'] = Arduino['stbv2gyro_girarConGiroscopio'];
    Arduino['stbv2gyro_giroscopioListo'] = function(block) {
        ensureStbV2GyroBase();
  return ['stbV2GyroReady()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_giroscopioListo'] = Arduino['stbv2gyro_giroscopioListo'];
    Arduino['stbv2gyro_anguloGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  return ['stbV2GetGyroAngle()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_anguloGiroscopio'] = Arduino['stbv2gyro_anguloGiroscopio'];
    Arduino['stbv2gyro_anguloInclinacionTarjeta'] = function(block) {
        ensureStbV2GyroReadHelpers();
  return ['stbV2GetTiltAngleDeg()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_anguloInclinacionTarjeta'] = Arduino['stbv2gyro_anguloInclinacionTarjeta'];
    Arduino['stbv2gyro_aceleracionGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  return ['stbV2GetGyroAcceleration(String("' + axis + '"))', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_aceleracionGiroscopio'] = Arduino['stbv2gyro_aceleracionGiroscopio'];
    Arduino['stbv2gyro_velocidadAngularGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  return ['stbV2GetGyroAngularVelocity(String("' + axis + '"))', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_velocidadAngularGiroscopio'] = Arduino['stbv2gyro_velocidadAngularGiroscopio'];
    Arduino['stbv2gyro_mientrasVelocidadAngularGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (stbV2CompareFloat(stbV2GetGyroAngularVelocity(String("' + axis + '")), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2gyro_mientrasVelocidadAngularGiroscopio'] = Arduino['stbv2gyro_mientrasVelocidadAngularGiroscopio'];
    Arduino['stbv2gyro_mientrasAceleracionGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (stbV2CompareFloat(stbV2GetGyroAcceleration(String("' + axis + '")), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2gyro_mientrasAceleracionGiroscopio'] = Arduino['stbv2gyro_mientrasAceleracionGiroscopio'];
    Arduino['stbv2gyro_mientrasAnguloGiroscopio'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'while (stbV2CompareFloat(stbV2GetGyroAngle(), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2gyro_mientrasAnguloGiroscopio'] = Arduino['stbv2gyro_mientrasAnguloGiroscopio'];
    Arduino['stbv2gyro_velocidadAngularGiroscopioCumple'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return ['stbV2CompareFloat(stbV2GetGyroAngularVelocity(String("' + axis + '")), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_velocidadAngularGiroscopioCumple'] = Arduino['stbv2gyro_velocidadAngularGiroscopioCumple'];
    Arduino['stbv2gyro_aceleracionGiroscopioCumple'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var axis = block.getFieldValue('AXIS') || 'Z';
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return ['stbV2CompareFloat(stbV2GetGyroAcceleration(String("' + axis + '")), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_aceleracionGiroscopioCumple'] = Arduino['stbv2gyro_aceleracionGiroscopioCumple'];
    Arduino['stbv2gyro_anguloGiroscopioCumple'] = function(block) {
        ensureStbV2GyroReadHelpers();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '90';
  return ['stbV2CompareFloat(stbV2GetGyroAngle(), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_anguloGiroscopioCumple'] = Arduino['stbv2gyro_anguloGiroscopioCumple'];
    Arduino['stbv2gyro_tarjetaAgitada'] = function(block) {
        ensureStbV2GyroPredicateHelpers();
  return ['stbV2IsShaken()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_tarjetaAgitada'] = Arduino['stbv2gyro_tarjetaAgitada'];
    Arduino['stbv2gyro_tarjetaInclinada'] = function(block) {
        ensureStbV2GyroPredicateHelpers();
  return ['stbV2IsTilted(STB_V2_GYRO_TILT_THRESHOLD_DEG)', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_tarjetaInclinada'] = Arduino['stbv2gyro_tarjetaInclinada'];
    Arduino['stbv2gyro_tarjetaInclinadaMasDe'] = function(block) {
        ensureStbV2GyroPredicateHelpers();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  return ['stbV2IsTilted(' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2gyro_tarjetaInclinadaMasDe'] = Arduino['stbv2gyro_tarjetaInclinadaMasDe'];
    Arduino['stbv2gyro_esperarHastaTarjetaAgitada'] = function(block) {
        ensureStbV2GyroPredicateHelpers();
  var code = 'while (!stbV2IsShaken()) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2UpdateGyro();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2gyro_esperarHastaTarjetaAgitada'] = Arduino['stbv2gyro_esperarHastaTarjetaAgitada'];
    Arduino['stbv2gyro_esperarHastaTarjetaInclinada'] = function(block) {
        ensureStbV2GyroPredicateHelpers();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var code = 'while (!stbV2IsTilted(' + value + ')) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2UpdateGyro();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2gyro_esperarHastaTarjetaInclinada'] = Arduino['stbv2gyro_esperarHastaTarjetaInclinada'];
    Arduino['stbv2infrared_leerReceptorInfrarrojo'] = function(block) {
        ensureStbV2InfraredDetectHelper();
  return ['(stbV2InfraredDetected() ? 1 : 0)', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2infrared_leerReceptorInfrarrojo'] = Arduino['stbv2infrared_leerReceptorInfrarrojo'];
    Arduino['stbv2infrared_senalInfrarrojaDetectada'] = function(block) {
        ensureStbV2InfraredDetectHelper();
  return ['stbV2InfraredDetected()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2infrared_senalInfrarrojaDetectada'] = Arduino['stbv2infrared_senalInfrarrojaDetectada'];
    Arduino['stbv2infrared_esperarHastaSenalInfrarroja'] = function(block) {
        ensureStbV2InfraredDetectHelper();
  var code = 'while (!stbV2InfraredDetected()) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2InfraredTick();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2infrared_esperarHastaSenalInfrarroja'] = Arduino['stbv2infrared_esperarHastaSenalInfrarroja'];
    Arduino['stbv2infrared_mientrasSenalInfrarroja'] = function(block) {
        ensureStbV2InfraredDetectHelper();
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2InfraredDetected()) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'stbV2InfraredTick();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2infrared_mientrasSenalInfrarroja'] = Arduino['stbv2infrared_mientrasSenalInfrarroja'];
    Arduino['stbv2infrared_contadorSenalInfrarroja'] = function(block) {
        ensureStbV2InfraredCountHelpers();
  return ['stbV2GetInfraredDetectionCount()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2infrared_contadorSenalInfrarroja'] = Arduino['stbv2infrared_contadorSenalInfrarroja'];
    Arduino['stbv2infrared_pulsosInfrarrojosEnTiempo'] = function(block) {
        ensureStbV2InfraredPulseHelpers();
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  var unit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  return ['stbV2MeasureInfraredPulses(stbV2LocalDurationMs(' + time + ', String("' + unit + '")))', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2infrared_pulsosInfrarrojosEnTiempo'] = Arduino['stbv2infrared_pulsosInfrarrojosEnTiempo'];
    Arduino['stbv2infrared_reiniciarContadorSenalInfrarroja'] = function(block) {
        ensureStbV2InfraredCountHelpers();
  return 'stbV2ResetInfraredDetectionCount();\n';
    };
    Arduino['arduino_stbv2infrared_reiniciarContadorSenalInfrarroja'] = Arduino['stbv2infrared_reiniciarContadorSenalInfrarroja'];
    Arduino['stbv2infrared_encenderEmisorInfrarrojo'] = function(block) {
        ensureStbV2InfraredEmitterHelpers();
  return 'stbV2SetInfraredEmitter(true);\n';
    };
    Arduino['arduino_stbv2infrared_encenderEmisorInfrarrojo'] = Arduino['stbv2infrared_encenderEmisorInfrarrojo'];
    Arduino['stbv2infrared_apagarEmisorInfrarrojo'] = function(block) {
        ensureStbV2InfraredEmitterHelpers();
  return 'stbV2SetInfraredEmitter(false);\n';
    };
    Arduino['arduino_stbv2infrared_apagarEmisorInfrarrojo'] = Arduino['stbv2infrared_apagarEmisorInfrarrojo'];
    Arduino['stbv2infrared_ponerEmisorInfrarrojo'] = function(block) {
        ensureStbV2InfraredEmitterHelpers();
  var state = block.getFieldValue('STATE') || 'OFF';
  return 'stbV2SetInfraredEmitter(' + (state === 'ON' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2infrared_ponerEmisorInfrarrojo'] = Arduino['stbv2infrared_ponerEmisorInfrarrojo'];
    Arduino['stbv2infrared_emitirInfrarrojoPorTiempo'] = function(block) {
        ensureStbV2InfraredEmitterHelpers();
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '500';
  var unit = block.getFieldValue('TIME_UNIT') || 'MILLISECONDS';
  var code = 'stbV2SetInfraredEmitter(true);\n';
  code += 'openBlockCooperativeDelay(stbV2LocalDurationMs(' + time + ', String("' + unit + '")));\n';
  code += 'stbV2SetInfraredEmitter(false);\n';
  return code;
    };
    Arduino['arduino_stbv2infrared_emitirInfrarrojoPorTiempo'] = Arduino['stbv2infrared_emitirInfrarrojoPorTiempo'];
    Arduino['stbv2infrared_emitirPulsosInfrarrojos'] = function(block) {
        ensureStbV2InfraredPulseHelpers();
  var count = Blockly.Arduino.valueToCode(block, 'COUNT', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  var unit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  return 'stbV2EmitInfraredPulses(static_cast<uint32_t>(' + count + '), stbV2LocalDurationMs(' + time + ', String("' + unit + '")));\n';
    };
    Arduino['arduino_stbv2infrared_emitirPulsosInfrarrojos'] = Arduino['stbv2infrared_emitirPulsosInfrarrojos'];
    Arduino['stbv2infrared_emisorInfrarrojoActivo'] = function(block) {
        ensureStbV2InfraredEmitterHelpers();
  return ['stbV2InfraredEmitterActive()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2infrared_emisorInfrarrojoActivo'] = Arduino['stbv2infrared_emisorInfrarrojoActivo'];

    // ============================================================
    // Sensor de Color TCS34725 (I2C) - STBoard V2
    // ============================================================

    function ensureStbV2Color() {
        Blockly.Arduino.includes_['include_wire'] = '#include <Wire.h>';
        Blockly.Arduino.includes_['include_tcs34725'] = '#include <Adafruit_TCS34725.h>';
        Blockly.Arduino.definitions_['definitions_stb_v2_color'] = [
            'Adafruit_TCS34725 stbV2Tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);',
            'bool stbV2TcsOk = false;',
            '',
            'void stbV2ColorInit() {',
            '  if (!stbV2TcsOk) {',
            '    Wire.begin();',
            '    stbV2TcsOk = stbV2Tcs.begin();',
            '  }',
            '}',
            '',
            'void stbV2ColorReadRaw(uint16_t &r, uint16_t &g, uint16_t &b, uint16_t &c) {',
            '  stbV2ColorInit();',
            '  if (!stbV2TcsOk) { r = g = b = c = 0; return; }',
            '  stbV2Tcs.getRawData(&r, &g, &b, &c);',
            '}',
            '',
            'uint16_t stbV2ColorReadRed() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  if (c == 0) return 0;',
            '  return map(r, 0, c, 0, 255);',
            '}',
            '',
            'uint16_t stbV2ColorReadGreen() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  if (c == 0) return 0;',
            '  return map(g, 0, c, 0, 255);',
            '}',
            '',
            'uint16_t stbV2ColorReadBlue() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  if (c == 0) return 0;',
            '  return map(b, 0, c, 0, 255);',
            '}',
            '',
            'uint16_t stbV2ColorReadClear() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  return c;',
            '}',
            '',
            'float stbV2ColorReadHue() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  if (c == 0) return 0.0;',
            '  float rf = (float)r / c;',
            '  float gf = (float)g / c;',
            '  float bf = (float)b / c;',
            '  float maxC = max(rf, max(gf, bf));',
            '  float minC = min(rf, min(gf, bf));',
            '  float delta = maxC - minC;',
            '  float hue = 0.0;',
            '  if (delta > 0.01) {',
            '    if (maxC == rf) hue = 60.0 * fmod((gf - bf) / delta, 6.0);',
            '    else if (maxC == gf) hue = 60.0 * ((bf - rf) / delta + 2.0);',
            '    else hue = 60.0 * ((rf - gf) / delta + 4.0);',
            '  }',
            '  if (hue < 0) hue += 360.0;',
            '  return hue;',
            '}',
            '',
            'String stbV2ColorReadName() {',
            '  uint16_t r, g, b, c;',
            '  stbV2ColorReadRaw(r, g, b, c);',
            '  if (c < 50) return "negro";',
            '  float maxC = max((float)r, max((float)g, (float)b));',
            '  float minC = min((float)r, min((float)g, (float)b));',
            '  float sat = (maxC > 0) ? (1.0 - minC / maxC) * 100.0 : 0.0;',
            '  if (sat < 20 && c > 200) return "blanco";',
            '  float hue = stbV2ColorReadHue();',
            '  if (hue < 30 || hue >= 340) return "rojo";',
            '  if (hue < 90) return "amarillo";',
            '  if (hue < 163) return "verde";',
            '  if (hue < 283) return "azul";',
            '  return "rojo";',
            '}',
            '',
            'bool stbV2ColorIsColor(const String& colorName) {',
            '  return stbV2ColorReadName() == colorName;',
            '}'
        ].join('\n');
    }

    // Color detectado (nombre del color)
    Arduino['arduino_stbv2color_colorDetectado'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadName()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_colorDetectado'] = Arduino['arduino_stbv2color_colorDetectado'];
    Arduino['colorDetectado'] = Arduino['arduino_stbv2color_colorDetectado'];

    // Es color X?
    Arduino['arduino_stbv2color_esColor'] = function(block) {
        ensureStbV2Color();
        var color = Blockly.Arduino.valueToCode(block, 'COLOR', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '"rojo"';
        if (!color.startsWith('"') && !color.startsWith("'")) {
            color = '"' + color + '"';
        }
        return ['stbV2ColorIsColor(' + color + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_esColor'] = Arduino['arduino_stbv2color_esColor'];
    Arduino['esColor'] = Arduino['arduino_stbv2color_esColor'];

    // Leer componente de color (R, G, B, Clear, Hue)
    Arduino['arduino_stbv2color_leerComponenteColor'] = function(block) {
        ensureStbV2Color();
        var component = Blockly.Arduino.valueToCode(block, 'COMPONENT', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '"RED"';
        component = component.replace(/"/g, '');
        switch (component) {
            case 'RED': return ['stbV2ColorReadRed()', Blockly.Arduino.ORDER_ATOMIC];
            case 'GREEN': return ['stbV2ColorReadGreen()', Blockly.Arduino.ORDER_ATOMIC];
            case 'BLUE': return ['stbV2ColorReadBlue()', Blockly.Arduino.ORDER_ATOMIC];
            case 'CLEAR': return ['stbV2ColorReadClear()', Blockly.Arduino.ORDER_ATOMIC];
            case 'HUE': return ['stbV2ColorReadHue()', Blockly.Arduino.ORDER_ATOMIC];
            default: return ['stbV2ColorReadRed()', Blockly.Arduino.ORDER_ATOMIC];
        }
    };
    Arduino['stbv2color_leerComponenteColor'] = Arduino['arduino_stbv2color_leerComponenteColor'];
    Arduino['leerComponenteColor'] = Arduino['arduino_stbv2color_leerComponenteColor'];

    // Valor rojo (0-255)
    Arduino['arduino_stbv2color_valorRojo'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadRed()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_valorRojo'] = Arduino['arduino_stbv2color_valorRojo'];
    Arduino['valorRojo'] = Arduino['arduino_stbv2color_valorRojo'];

    // Valor verde (0-255)
    Arduino['arduino_stbv2color_valorVerde'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadGreen()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_valorVerde'] = Arduino['arduino_stbv2color_valorVerde'];
    Arduino['valorVerde'] = Arduino['arduino_stbv2color_valorVerde'];

    // Valor azul (0-255)
    Arduino['arduino_stbv2color_valorAzul'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadBlue()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_valorAzul'] = Arduino['arduino_stbv2color_valorAzul'];
    Arduino['valorAzul'] = Arduino['arduino_stbv2color_valorAzul'];

    // Valor claridad
    Arduino['arduino_stbv2color_valorClaridad'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadClear()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_valorClaridad'] = Arduino['arduino_stbv2color_valorClaridad'];
    Arduino['valorClaridad'] = Arduino['arduino_stbv2color_valorClaridad'];

    // Valor tono (hue 0-360)
    Arduino['arduino_stbv2color_valorTono'] = function(block) {
        ensureStbV2Color();
        return ['stbV2ColorReadHue()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_valorTono'] = Arduino['arduino_stbv2color_valorTono'];
    Arduino['valorTono'] = Arduino['arduino_stbv2color_valorTono'];

    // Sensor de color conectado?
    Arduino['arduino_stbv2color_sensorColorConectado'] = function(block) {
        ensureStbV2Color();
        return ['stbV2TcsOk', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbv2color_sensorColorConectado'] = Arduino['arduino_stbv2color_sensorColorConectado'];
    Arduino['sensorColorConectado'] = Arduino['arduino_stbv2color_sensorColorConectado'];

    Arduino['stbv2buzzer_encenderBuzzer'] = function(block) {
        ensureStbV2BuzzerOnOffHelpers();
  return 'stbV2BuzzerOn(440);\n';
    };
    Arduino['arduino_stbv2buzzer_encenderBuzzer'] = Arduino['stbv2buzzer_encenderBuzzer'];
    Arduino['stbv2buzzer_apagarBuzzer'] = function(block) {
        ensureStbV2BuzzerOnOffHelpers();
  return 'stbV2BuzzerOff();\n';
    };
    Arduino['arduino_stbv2buzzer_apagarBuzzer'] = Arduino['stbv2buzzer_apagarBuzzer'];
    Arduino['stbv2buzzer_tocarTonoBuzzer'] = function(block) {
        ensureStbV2BuzzerPlayToneHelper();
  var freq = Blockly.Arduino.valueToCode(block, 'FREQ', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '440';
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '500';
  var unit = block.getFieldValue('TIME_UNIT') || 'MILLISECONDS';
  return 'stbV2PlayTone(static_cast<uint16_t>(' + freq + '), stbV2LocalDurationMs(' + time + ', String("' + unit + '")));\n';
    };
    Arduino['arduino_stbv2buzzer_tocarTonoBuzzer'] = Arduino['stbv2buzzer_tocarTonoBuzzer'];
    Arduino['stbv2buzzer_tocarNotaBuzzer'] = function(block) {
        ensureStbV2BuzzerPlayNoteHelper();
  var note = block.getFieldValue('NOTE') || 'A4';
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '500';
  var unit = block.getFieldValue('TIME_UNIT') || 'MILLISECONDS';
  return 'stbV2PlayNote(String("' + note + '"), stbV2LocalDurationMs(' + time + ', String("' + unit + '")));\n';
    };
    Arduino['arduino_stbv2buzzer_tocarNotaBuzzer'] = Arduino['stbv2buzzer_tocarNotaBuzzer'];
    Arduino['stbv2buzzer_tocarTonoContinuoBuzzer'] = function(block) {
        ensureStbV2BuzzerOnOffHelpers();
  var freq = Blockly.Arduino.valueToCode(block, 'FREQ', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '440';
  return 'stbV2BuzzerOn(static_cast<uint16_t>(' + freq + '));\n';
    };
    Arduino['arduino_stbv2buzzer_tocarTonoContinuoBuzzer'] = Arduino['stbv2buzzer_tocarTonoContinuoBuzzer'];
    Arduino['stbv2buzzer_tocarNotaContinuaBuzzer'] = function(block) {
        ensureStbV2BuzzerOnOffHelpers();
  var note = block.getFieldValue('NOTE') || 'A4';
  return 'stbV2BuzzerOn(stbV2NoteFrequency(String("' + note + '")));\n';
    };
    Arduino['arduino_stbv2buzzer_tocarNotaContinuaBuzzer'] = Arduino['stbv2buzzer_tocarNotaContinuaBuzzer'];
    Arduino['stbv2buzzer_silencioBuzzer'] = function(block) {
        ensureStbV2BuzzerOnOffHelpers();
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '250';
  var unit = block.getFieldValue('TIME_UNIT') || 'MILLISECONDS';
  return 'stbV2BuzzerOff();\n' +
    'openBlockCooperativeDelay(stbV2LocalDurationMs(' + time + ', String("' + unit + '")));\n';
    };
    Arduino['arduino_stbv2buzzer_silencioBuzzer'] = Arduino['stbv2buzzer_silencioBuzzer'];
    Arduino['stbv2buzzer_buzzerActivo'] = function(block) {
        ensureStbV2BuzzerStateHelpers();
  return ['stbV2BuzzerActive()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2buzzer_buzzerActivo'] = Arduino['stbv2buzzer_buzzerActivo'];
    Arduino['stbv2buzzer_frecuenciaBuzzer'] = function(block) {
        ensureStbV2BuzzerStateHelpers();
  return ['stbV2BuzzerFrequency()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2buzzer_frecuenciaBuzzer'] = Arduino['stbv2buzzer_frecuenciaBuzzer'];
    Arduino['stbv2light_leerLuzRaw'] = function(block) {
        ensureStbV2LightBase();
  return ['stbV2ReadLightRaw()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2light_leerLuzRaw'] = Arduino['stbv2light_leerLuzRaw'];
    Arduino['stbv2light_porcentajeLuz'] = function(block) {
        ensureStbV2LightPercentHelper();
  return ['stbV2ReadLightPercent()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2light_porcentajeLuz'] = Arduino['stbv2light_porcentajeLuz'];
    Arduino['stbv2light_hayMuchaLuz'] = function(block) {
        ensureStbV2LightStateHelpers();
  return ['stbV2HasBrightLight()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2light_hayMuchaLuz'] = Arduino['stbv2light_hayMuchaLuz'];
    Arduino['stbv2light_hayPocaLuz'] = function(block) {
        ensureStbV2LightStateHelpers();
  return ['stbV2HasLowLight()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2light_hayPocaLuz'] = Arduino['stbv2light_hayPocaLuz'];
    Arduino['stbv2light_luzCumple'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2LightPercentHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  return ['stbV2LocalCompareFloat(stbV2ReadLightPercent(), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2light_luzCumple'] = Arduino['stbv2light_luzCumple'];
    Arduino['stbv2light_esperarHastaLuz'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2LightPercentHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  var code = 'while (!stbV2LocalCompareFloat(stbV2ReadLightPercent(), String("' + condition + '"), ' + value + ')) {\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2light_esperarHastaLuz'] = Arduino['stbv2light_esperarHastaLuz'];
    Arduino['stbv2light_mientrasLuz'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2LightPercentHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2LocalCompareFloat(stbV2ReadLightPercent(), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2light_mientrasLuz'] = Arduino['stbv2light_mientrasLuz'];
    Arduino['stbv2temperature_leerTemperaturaRaw'] = function(block) {
        ensureStbV2TemperatureBase();
  return ['stbV2ReadTemperatureRaw()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_leerTemperaturaRaw'] = Arduino['stbv2temperature_leerTemperaturaRaw'];
    Arduino['stbv2temperature_temperaturaCelsius'] = function(block) {
        ensureStbV2TemperatureCelsiusHelper();
  return ['stbV2ReadTemperatureCelsius()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_temperaturaCelsius'] = Arduino['stbv2temperature_temperaturaCelsius'];
    Arduino['stbv2temperature_temperaturaKelvin'] = function(block) {
        ensureStbV2TemperatureKelvinHelper();
  return ['stbV2ReadTemperatureKelvin()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_temperaturaKelvin'] = Arduino['stbv2temperature_temperaturaKelvin'];
    Arduino['stbv2temperature_haceCalor'] = function(block) {
        ensureStbV2TemperatureStateHelpers();
  return ['stbV2IsHot()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_haceCalor'] = Arduino['stbv2temperature_haceCalor'];
    Arduino['stbv2temperature_haceFrio'] = function(block) {
        ensureStbV2TemperatureStateHelpers();
  return ['stbV2IsCold()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_haceFrio'] = Arduino['stbv2temperature_haceFrio'];
    Arduino['stbv2temperature_temperaturaCumple'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2TemperatureCelsiusHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '25';
  return ['stbV2LocalCompareFloat(stbV2ReadTemperatureCelsius(), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2temperature_temperaturaCumple'] = Arduino['stbv2temperature_temperaturaCumple'];
    Arduino['stbv2temperature_esperarHastaTemperatura'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2TemperatureCelsiusHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '25';
  var code = 'while (!stbV2LocalCompareFloat(stbV2ReadTemperatureCelsius(), String("' + condition + '"), ' + value + ')) {\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2temperature_esperarHastaTemperatura'] = Arduino['stbv2temperature_esperarHastaTemperatura'];
    Arduino['stbv2temperature_mientrasTemperatura'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2TemperatureCelsiusHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '25';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2LocalCompareFloat(stbV2ReadTemperatureCelsius(), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2temperature_mientrasTemperatura'] = Arduino['stbv2temperature_mientrasTemperatura'];
    Arduino['stbv2microphone_calibrarMicrofono'] = function(block) {
        ensureStbV2MicrophoneCalibrateHelper();
  return 'stbV2CalibrateMicrophone();\n';
    };
    Arduino['arduino_stbv2microphone_calibrarMicrofono'] = Arduino['stbv2microphone_calibrarMicrofono'];
    Arduino['stbv2microphone_leerMicrofonoRaw'] = function(block) {
        ensureStbV2MicrophoneBase();
  return ['stbV2ReadMicrophoneRaw()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_leerMicrofonoRaw'] = Arduino['stbv2microphone_leerMicrofonoRaw'];
    Arduino['stbv2microphone_nivelSonido'] = function(block) {
        ensureStbV2MicrophoneSoundLevelHelper();
  return ['stbV2ReadSoundLevelPercent()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_nivelSonido'] = Arduino['stbv2microphone_nivelSonido'];
    Arduino['stbv2microphone_microfonoCalibrado'] = function(block) {
        ensureStbV2MicrophoneCalibrateHelper();
  return ['stbV2MicrophoneCalibrated()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_microfonoCalibrado'] = Arduino['stbv2microphone_microfonoCalibrado'];
    Arduino['stbv2microphone_haySonidoFuerte'] = function(block) {
        ensureStbV2MicrophoneStateHelpers();
  return ['stbV2HasLoudSound()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_haySonidoFuerte'] = Arduino['stbv2microphone_haySonidoFuerte'];
    Arduino['stbv2microphone_hayPocoSonido'] = function(block) {
        ensureStbV2MicrophoneStateHelpers();
  return ['stbV2HasLowSound()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_hayPocoSonido'] = Arduino['stbv2microphone_hayPocoSonido'];
    Arduino['stbv2microphone_sonidoCumple'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2MicrophoneSoundLevelHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  return ['stbV2LocalCompareFloat(stbV2ReadSoundLevelPercent(), String("' + condition + '"), ' + value + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2microphone_sonidoCumple'] = Arduino['stbv2microphone_sonidoCumple'];
    Arduino['stbv2microphone_esperarHastaSonido'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2MicrophoneSoundLevelHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  var code = 'while (!stbV2LocalCompareFloat(stbV2ReadSoundLevelPercent(), String("' + condition + '"), ' + value + ')) {\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2microphone_esperarHastaSonido'] = Arduino['stbv2microphone_esperarHastaSonido'];
    Arduino['stbv2microphone_mientrasSonido'] = function(block) {
        ensureStbV2LocalUtilsRuntime();
  ensureStbV2MicrophoneSoundLevelHelper();
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '50';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2LocalCompareFloat(stbV2ReadSoundLevelPercent(), String("' + condition + '"), ' + value + ')) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2microphone_mientrasSonido'] = Arduino['stbv2microphone_mientrasSonido'];
    Arduino['stbv2bluetooth_iniciarBluetooth'] = function(block) {
        ensureStbV2BluetoothBase();
  var baud = Blockly.Arduino.valueToCode(block, 'BAUD', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '9600';
  return 'stbV2BluetoothBegin(static_cast<unsigned long>(' + baud + '));\n';
    };
    Arduino['arduino_stbv2bluetooth_iniciarBluetooth'] = Arduino['stbv2bluetooth_iniciarBluetooth'];
    Arduino['stbv2bluetooth_cerrarBluetooth'] = function(block) {
        ensureStbV2BluetoothBase();
  return 'stbV2BluetoothEnd();\n';
    };
    Arduino['arduino_stbv2bluetooth_cerrarBluetooth'] = Arduino['stbv2bluetooth_cerrarBluetooth'];
    Arduino['stbv2bluetooth_bluetoothIniciado'] = function(block) {
        ensureStbV2BluetoothBase();
  return ['stbV2BluetoothStarted()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_bluetoothIniciado'] = Arduino['stbv2bluetooth_bluetoothIniciado'];
    Arduino['stbv2bluetooth_hayDatosBluetooth'] = function(block) {
        ensureStbV2BluetoothBase();
  return ['stbV2BluetoothHasData()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_hayDatosBluetooth'] = Arduino['stbv2bluetooth_hayDatosBluetooth'];
    Arduino['stbv2bluetooth_bytesBluetoothDisponibles'] = function(block) {
        ensureStbV2BluetoothBase();
  return ['stbV2BluetoothAvailable()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_bytesBluetoothDisponibles'] = Arduino['stbv2bluetooth_bytesBluetoothDisponibles'];
    Arduino['stbv2bluetooth_enviarTextoBluetooth'] = function(block) {
        ensureStbV2BluetoothPrintHelpers();
  var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_NONE) || 'String("")';
  return 'stbV2BluetoothPrint(String(' + text + '));\n';
    };
    Arduino['arduino_stbv2bluetooth_enviarTextoBluetooth'] = Arduino['stbv2bluetooth_enviarTextoBluetooth'];
    Arduino['stbv2bluetooth_enviarLineaBluetooth'] = function(block) {
        ensureStbV2BluetoothPrintHelpers();
  var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_NONE) || 'String("")';
  return 'stbV2BluetoothPrintLine(String(' + text + '));\n';
    };
    Arduino['arduino_stbv2bluetooth_enviarLineaBluetooth'] = Arduino['stbv2bluetooth_enviarLineaBluetooth'];
    Arduino['stbv2bluetooth_enviarNumeroBluetooth'] = function(block) {
        ensureStbV2BluetoothPrintHelpers();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_NONE) || '0';
  return 'stbV2BluetoothPrint(String(' + value + '));\n';
    };
    Arduino['arduino_stbv2bluetooth_enviarNumeroBluetooth'] = Arduino['stbv2bluetooth_enviarNumeroBluetooth'];
    Arduino['stbv2bluetooth_enviarByteBluetooth'] = function(block) {
        ensureStbV2BluetoothPrintHelpers();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_NONE) || '0';
  return 'stbV2BluetoothWriteByte(static_cast<uint8_t>(' + value + '));\n';
    };
    Arduino['arduino_stbv2bluetooth_enviarByteBluetooth'] = Arduino['stbv2bluetooth_enviarByteBluetooth'];
    Arduino['stbv2bluetooth_leerByteBluetooth'] = function(block) {
        ensureStbV2BluetoothReadHelpers();
  return ['stbV2BluetoothReadByte()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_leerByteBluetooth'] = Arduino['stbv2bluetooth_leerByteBluetooth'];
    Arduino['stbv2bluetooth_leerTextoBluetooth'] = function(block) {
        ensureStbV2BluetoothReadHelpers();
  return ['stbV2BluetoothReadString()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_leerTextoBluetooth'] = Arduino['stbv2bluetooth_leerTextoBluetooth'];
    Arduino['stbv2bluetooth_leerLineaBluetooth'] = function(block) {
        ensureStbV2BluetoothReadHelpers();
  return ['stbV2BluetoothReadLine()', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2bluetooth_leerLineaBluetooth'] = Arduino['stbv2bluetooth_leerLineaBluetooth'];
    Arduino['stbv2bluetooth_limpiarBufferBluetooth'] = function(block) {
        ensureStbV2BluetoothReadHelpers();
  return 'stbV2BluetoothClearBuffer();\n';
    };
    Arduino['arduino_stbv2bluetooth_limpiarBufferBluetooth'] = Arduino['stbv2bluetooth_limpiarBufferBluetooth'];
    Arduino['stbv2bluetooth_esperarHastaDatoBluetooth'] = function(block) {
        ensureStbV2BluetoothBase();
  var code = 'while (!stbV2BluetoothHasData()) {\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2bluetooth_esperarHastaDatoBluetooth'] = Arduino['stbv2bluetooth_esperarHastaDatoBluetooth'];
    Arduino['stbv2bluetooth_mientrasHayaDatosBluetooth'] = function(block) {
        ensureStbV2BluetoothBase();
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2BluetoothHasData()) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2bluetooth_mientrasHayaDatosBluetooth'] = Arduino['stbv2bluetooth_mientrasHayaDatosBluetooth'];
    Arduino['stbv2matrix_iniciarMatrizLed'] = function(block) {
        ensureStbV2MatrixBase();
  return 'stbV2MatrixInit();\n';
    };
    Arduino['arduino_stbv2matrix_iniciarMatrizLed'] = Arduino['stbv2matrix_iniciarMatrizLed'];
    Arduino['stbv2matrix_encenderMatrizLed'] = function(block) {
        ensureStbV2MatrixEnableHelper();
  return 'stbV2MatrixSetEnabled(true);\n';
    };
    Arduino['arduino_stbv2matrix_encenderMatrizLed'] = Arduino['stbv2matrix_encenderMatrizLed'];
    Arduino['stbv2matrix_apagarMatrizLed'] = function(block) {
        ensureStbV2MatrixEnableHelper();
  return 'stbV2MatrixSetEnabled(false);\n';
    };
    Arduino['arduino_stbv2matrix_apagarMatrizLed'] = Arduino['stbv2matrix_apagarMatrizLed'];
    Arduino['stbv2matrix_brilloMatrizLed'] = function(block) {
        ensureStbV2MatrixIntensityHelper();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '8';
  return 'stbV2MatrixSetIntensity(' + value + ');\n';
    };
    Arduino['arduino_stbv2matrix_brilloMatrizLed'] = Arduino['stbv2matrix_brilloMatrizLed'];
    Arduino['stbv2matrix_limpiarMatrizLed'] = function(block) {
        ensureStbV2MatrixClearHelper();
  return 'stbV2MatrixClear();\n';
    };
    Arduino['arduino_stbv2matrix_limpiarMatrizLed'] = Arduino['stbv2matrix_limpiarMatrizLed'];
    Arduino['stbv2matrix_llenarMatrizLed'] = function(block) {
        ensureStbV2MatrixFillHelper();
  var state = block.getFieldValue('STATE') || 'ON';
  return 'stbV2MatrixFill(' + (state === 'ON' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2matrix_llenarMatrizLed'] = Arduino['stbv2matrix_llenarMatrizLed'];
    Arduino['stbv2matrix_ponerPixelMatrizLed'] = function(block) {
        ensureStbV2MatrixPixelHelpers();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var state = block.getFieldValue('STATE') || 'ON';
  return 'stbV2MatrixSetPixel(' + x + ', ' + y + ', ' + (state === 'ON' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2matrix_ponerPixelMatrizLed'] = Arduino['stbv2matrix_ponerPixelMatrizLed'];
    Arduino['stbv2matrix_alternarPixelMatrizLed'] = function(block) {
        ensureStbV2MatrixPixelHelpers();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return 'stbV2MatrixTogglePixel(' + x + ', ' + y + ');\n';
    };
    Arduino['arduino_stbv2matrix_alternarPixelMatrizLed'] = Arduino['stbv2matrix_alternarPixelMatrizLed'];
    Arduino['stbv2matrix_pixelMatrizLedEncendido'] = function(block) {
        ensureStbV2MatrixPixelHelpers();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return ['stbV2MatrixGetPixel(' + x + ', ' + y + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2matrix_pixelMatrizLedEncendido'] = Arduino['stbv2matrix_pixelMatrizLedEncendido'];
    Arduino['stbv2matrix_dibujarFilaMatrizLed'] = function(block) {
        ensureStbV2MatrixPatternHelpers();
  var row = Blockly.Arduino.valueToCode(block, 'ROW', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '255';
  return 'stbV2MatrixSetRowPattern(' + row + ', static_cast<uint8_t>(' + value + '));\n';
    };
    Arduino['arduino_stbv2matrix_dibujarFilaMatrizLed'] = Arduino['stbv2matrix_dibujarFilaMatrizLed'];
    Arduino['stbv2matrix_dibujarColumnaMatrizLed'] = function(block) {
        ensureStbV2MatrixPatternHelpers();
  var col = Blockly.Arduino.valueToCode(block, 'COL', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '255';
  return 'stbV2MatrixSetColumnPattern(' + col + ', static_cast<uint8_t>(' + value + '));\n';
    };
    Arduino['arduino_stbv2matrix_dibujarColumnaMatrizLed'] = Arduino['stbv2matrix_dibujarColumnaMatrizLed'];
    Arduino['stbv2matrix_mostrarPatronMatrizLed'] = function(block) {
        ensureStbV2MatrixPatternHelpers();
  var args = [];
  for (var i = 0; i < 8; i++) {
    args.push(Blockly.Arduino.valueToCode(block, 'R' + i, Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0');
  }
  return 'stbV2MatrixShowPattern(' + args.map(function(v) { return 'static_cast<uint8_t>(' + v + ')'; }).join(', ') + ');\n';
    };
    Arduino['arduino_stbv2matrix_mostrarPatronMatrizLed'] = Arduino['stbv2matrix_mostrarPatronMatrizLed'];
    Arduino['stbv2matrix_desplazarMatrizLed'] = function(block) {
        ensureStbV2MatrixShiftHelper();
  var dir = block.getFieldValue('DIR') || 'LEFT';
  return 'stbV2MatrixShift(String("' + dir + '"));\n';
    };
    Arduino['arduino_stbv2matrix_desplazarMatrizLed'] = Arduino['stbv2matrix_desplazarMatrizLed'];
    Arduino['stbv2matrix_mostrarCaracterMatrizLed'] = function(block) {
        ensureStbV2MatrixTextHelpers();
  var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_NONE) || 'String("A")';
  return 'stbV2MatrixShowChar(String(' + text + '));\n';
    };
    Arduino['arduino_stbv2matrix_mostrarCaracterMatrizLed'] = Arduino['stbv2matrix_mostrarCaracterMatrizLed'];
    Arduino['stbv2matrix_mostrarLetraMatrizLed'] = function(block) {
        ensureStbV2MatrixTextHelpers();
  var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_NONE) || 'String("A")';
  return 'stbV2MatrixShowChar(String(' + text + '));\n';
    };
    Arduino['arduino_stbv2matrix_mostrarLetraMatrizLed'] = Arduino['stbv2matrix_mostrarLetraMatrizLed'];
    Arduino['stbv2matrix_mostrarNumeroMatrizLed'] = function(block) {
        ensureStbV2MatrixTextHelpers();
  var value = Blockly.Arduino.valueToCode(block, 'VALUE', Blockly.Arduino.ORDER_NONE) || '0';
  return 'stbV2MatrixShowNumber(' + value + ');\n';
    };
    Arduino['arduino_stbv2matrix_mostrarNumeroMatrizLed'] = Arduino['stbv2matrix_mostrarNumeroMatrizLed'];
    Arduino['stbv2matrix_mostrarTextoMatrizLed'] = function(block) {
        ensureStbV2MatrixTextHelpers();
  var text = Blockly.Arduino.valueToCode(block, 'TEXT', Blockly.Arduino.ORDER_NONE) || 'String("HOLA")';
  var time = Blockly.Arduino.valueToCode(block, 'TIME', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '300';
  return 'stbV2MatrixShowText(String(' + text + '), static_cast<unsigned long>(' + time + '));\n';
    };
    Arduino['arduino_stbv2matrix_mostrarTextoMatrizLed'] = Arduino['stbv2matrix_mostrarTextoMatrizLed'];
    Arduino['stbv2oled_iniciarPantallaOled'] = function(block) {
        ensureStbV2OledInitHelper();
  ensureStbV2BootUiControlBase();
  var addr = block.getFieldValue('ADDR') || '0x3C';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledInit(' + addr + ');\n';
    };
    Arduino['arduino_stbv2oled_iniciarPantallaOled'] = Arduino['stbv2oled_iniciarPantallaOled'];
    Arduino['stbv2oled_limpiarPantallaOled'] = function(block) {
        ensureStbV2OledClearHelper();
  ensureStbV2BootUiControlBase();
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledClear();\n';
    };
    Arduino['arduino_stbv2oled_limpiarPantallaOled'] = Arduino['stbv2oled_limpiarPantallaOled'];
    Arduino['stbv2oled_actualizarPantallaOled'] = function(block) {
        ensureStbV2OledRefreshHelper();
  ensureStbV2BootUiControlBase();
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledRefresh();\n';
    };
    Arduino['arduino_stbv2oled_actualizarPantallaOled'] = Arduino['stbv2oled_actualizarPantallaOled'];
    Arduino['stbv2oled_establecerCursorOled'] = function(block) {
        ensureStbV2OledCursorHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledSetCursor(' + x + ', ' + y + ');\n';
    };
    Arduino['arduino_stbv2oled_establecerCursorOled'] = Arduino['stbv2oled_establecerCursorOled'];
    Arduino['stbv2oled_configurarTextoOled'] = function(block) {
        ensureStbV2OledTextStyleHelper();
  ensureStbV2BootUiControlBase();
  var size = Blockly.Arduino.valueToCode(block, 'SIZE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  var bgColor = block.getFieldValue('BGCOLOR') || 'SSD1306_BLACK';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledSetTextStyle(' + size + ', ' + color + ', ' + bgColor + ');\n';
    };
    Arduino['arduino_stbv2oled_configurarTextoOled'] = Arduino['stbv2oled_configurarTextoOled'];
    Arduino['stbv2oled_imprimirOled'] = function(block) {
        ensureStbV2OledPrintHelper();
  ensureStbV2BootUiControlBase();
  var data = Blockly.Arduino.valueToCode(block, 'DATA', Blockly.Arduino.ORDER_NONE) || '"Hola"';
  var eol = block.getFieldValue('EOL') || 'PRINT';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledPrint(String(' + data + '), ' + (eol === 'PRINTLN' ? 'true' : 'false') + ');\n';
    };
    Arduino['arduino_stbv2oled_imprimirOled'] = Arduino['stbv2oled_imprimirOled'];
    Arduino['stbv2oled_mostrarTextoOled'] = function(block) {
        ensureStbV2OledDrawTextHelper();
  ensureStbV2BootUiControlBase();
  var data = Blockly.Arduino.valueToCode(block, 'DATA', Blockly.Arduino.ORDER_NONE) || '"Hola"';
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawTextAt(' + x + ', ' + y + ', String(' + data + '));\n';
    };
    Arduino['arduino_stbv2oled_mostrarTextoOled'] = Arduino['stbv2oled_mostrarTextoOled'];
    Arduino['stbv2oled_dibujarPixelOled'] = function(block) {
        ensureStbV2OledDrawPixelHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawPixel(' + x + ', ' + y + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_dibujarPixelOled'] = Arduino['stbv2oled_dibujarPixelOled'];
    Arduino['stbv2oled_dibujarLineaOled'] = function(block) {
        ensureStbV2OledDrawLineHelper();
  ensureStbV2BootUiControlBase();
  var x0 = Blockly.Arduino.valueToCode(block, 'X0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y0 = Blockly.Arduino.valueToCode(block, 'Y0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var x1 = Blockly.Arduino.valueToCode(block, 'X1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '127';
  var y1 = Blockly.Arduino.valueToCode(block, 'Y1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '63';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawLine(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_dibujarLineaOled'] = Arduino['stbv2oled_dibujarLineaOled'];
    Arduino['stbv2oled_dibujarRectanguloOled'] = function(block) {
        ensureStbV2OledDrawRectHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var w = Blockly.Arduino.valueToCode(block, 'W', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var h = Blockly.Arduino.valueToCode(block, 'H', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_dibujarRectanguloOled'] = Arduino['stbv2oled_dibujarRectanguloOled'];
    Arduino['stbv2oled_rellenarRectanguloOled'] = function(block) {
        ensureStbV2OledFillRectHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var w = Blockly.Arduino.valueToCode(block, 'W', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var h = Blockly.Arduino.valueToCode(block, 'H', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledFillRect(' + x + ', ' + y + ', ' + w + ', ' + h + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_rellenarRectanguloOled'] = Arduino['stbv2oled_rellenarRectanguloOled'];
    Arduino['stbv2oled_dibujarCirculoOled'] = function(block) {
        ensureStbV2OledDrawCircleHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '64';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '32';
  var r = Blockly.Arduino.valueToCode(block, 'R', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawCircle(' + x + ', ' + y + ', ' + r + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_dibujarCirculoOled'] = Arduino['stbv2oled_dibujarCirculoOled'];
    Arduino['stbv2oled_rellenarCirculoOled'] = function(block) {
        ensureStbV2OledFillCircleHelper();
  ensureStbV2BootUiControlBase();
  var x = Blockly.Arduino.valueToCode(block, 'X', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '64';
  var y = Blockly.Arduino.valueToCode(block, 'Y', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '32';
  var r = Blockly.Arduino.valueToCode(block, 'R', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledFillCircle(' + x + ', ' + y + ', ' + r + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_rellenarCirculoOled'] = Arduino['stbv2oled_rellenarCirculoOled'];
    Arduino['stbv2oled_dibujarTrianguloOled'] = function(block) {
        ensureStbV2OledDrawTriangleHelper();
  ensureStbV2BootUiControlBase();
  var x0 = Blockly.Arduino.valueToCode(block, 'X0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var y0 = Blockly.Arduino.valueToCode(block, 'Y0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var x1 = Blockly.Arduino.valueToCode(block, 'X1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '30';
  var y1 = Blockly.Arduino.valueToCode(block, 'Y1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var x2 = Blockly.Arduino.valueToCode(block, 'X2', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var y2 = Blockly.Arduino.valueToCode(block, 'Y2', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '30';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledDrawTriangle(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_dibujarTrianguloOled'] = Arduino['stbv2oled_dibujarTrianguloOled'];
    Arduino['stbv2oled_rellenarTrianguloOled'] = function(block) {
        ensureStbV2OledFillTriangleHelper();
  ensureStbV2BootUiControlBase();
  var x0 = Blockly.Arduino.valueToCode(block, 'X0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var y0 = Blockly.Arduino.valueToCode(block, 'Y0', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var x1 = Blockly.Arduino.valueToCode(block, 'X1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '30';
  var y1 = Blockly.Arduino.valueToCode(block, 'Y1', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var x2 = Blockly.Arduino.valueToCode(block, 'X2', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var y2 = Blockly.Arduino.valueToCode(block, 'Y2', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '30';
  var color = block.getFieldValue('COLOR') || 'SSD1306_WHITE';
  return 'stbV2BootUiDisable();\n' +
    'stbV2OledFillTriangle(' + x0 + ', ' + y0 + ', ' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ', ' + color + ');\n';
    };
    Arduino['arduino_stbv2oled_rellenarTrianguloOled'] = Arduino['stbv2oled_rellenarTrianguloOled'];
    Arduino['stbv2buttons_leerBoton'] = function(block) {
        ensureStbV2ButtonsReadHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  return ['(stbV2ReadButton(String("' + button + '")) ? 1 : 0)', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2buttons_leerBoton'] = Arduino['stbv2buttons_leerBoton'];
    Arduino['stbv2buttons_botonPresionado'] = function(block) {
        ensureStbV2ButtonsReadHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  return ['stbV2ReadButton(String("' + button + '"))', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2buttons_botonPresionado'] = Arduino['stbv2buttons_botonPresionado'];
    Arduino['stbv2buttons_esperarHastaBotonPresionado'] = function(block) {
        ensureStbV2ButtonsReadHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  var code = 'while (!stbV2ReadButton(String("' + button + '"))) {\n';
  code += Blockly.Arduino.INDENT + 'stbV2ButtonsTick();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2buttons_esperarHastaBotonPresionado'] = Arduino['stbv2buttons_esperarHastaBotonPresionado'];
    Arduino['stbv2buttons_mientrasBotonPresionado'] = function(block) {
        ensureStbV2ButtonsReadHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = 'while (stbV2ReadButton(String("' + button + '"))) {\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'stbV2ButtonsTick();\n';
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  return code;
    };
    Arduino['arduino_stbv2buttons_mientrasBotonPresionado'] = Arduino['stbv2buttons_mientrasBotonPresionado'];
    Arduino['stbv2buttons_contadorBoton'] = function(block) {
        ensureStbV2ButtonsCountHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  return ['stbV2GetButtonCount(String("' + button + '"))', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['arduino_stbv2buttons_contadorBoton'] = Arduino['stbv2buttons_contadorBoton'];
    Arduino['stbv2buttons_reiniciarContadorBoton'] = function(block) {
        ensureStbV2ButtonsResetHelper();
  ensureStbV2BootUiDisableModeButtonsSetup();
  var button = block.getFieldValue('BUTTON') || 'B1';
  return 'stbV2ResetButtonCount(String("' + button + '"));\n';
    };
    Arduino['arduino_stbv2buttons_reiniciarContadorBoton'] = Arduino['stbv2buttons_reiniciarContadorBoton'];
    Arduino['stbv2motores_activarRetrasoArranque'] = function(block) {
        ensureStbV2MegaMoveHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var delayMs = Blockly.Arduino.valueToCode(block, 'DELAY_MS', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '10';
  var sideConstant = side === 'LEFT' ? 'STB_V2_SIDE_LEFT' : 'STB_V2_SIDE_RIGHT';
  return 'stbV2SetStartDelay(' + sideConstant + ', ' + delayMs + ');\n';
    };
    Arduino['arduino_stbv2motores_activarRetrasoArranque'] = Arduino['stbv2motores_activarRetrasoArranque'];
    Arduino['stbv2precision_ajustarMotoresPrecision'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var leftScale = Blockly.Arduino.valueToCode(block, 'LEFT_SCALE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '100';
  var rightScale = Blockly.Arduino.valueToCode(block, 'RIGHT_SCALE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '100';
  var minSpeed = Blockly.Arduino.valueToCode(block, 'MIN_SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '25';
  var launchMs = Blockly.Arduino.valueToCode(block, 'LAUNCH_MS', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  return 'stbV2PrecisionSetMotorAdjust(' + leftScale + ', ' + rightScale + ', ' + minSpeed + ', ' + launchMs + ');\n';
    };
    Arduino['arduino_stbv2precision_ajustarMotoresPrecision'] = Arduino['stbv2precision_ajustarMotoresPrecision'];
    Arduino['stbv2precision_ajustarControlPrecision'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var gyroKp = Blockly.Arduino.valueToCode(block, 'GYRO_KP', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '3.0';
  var gyroKd = Blockly.Arduino.valueToCode(block, 'GYRO_KD', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0.5';
  var encoderKp = Blockly.Arduino.valueToCode(block, 'ENCODER_KP', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  var maxCorrection = Blockly.Arduino.valueToCode(block, 'MAX_CORRECTION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '20';
  var deadband = Blockly.Arduino.valueToCode(block, 'DEADBAND', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0.30';
  var polarity = Blockly.Arduino.valueToCode(block, 'POLARITY', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '-1';
  return 'stbV2PrecisionSetControl(' + gyroKp + ', ' + gyroKd + ', ' + encoderKp + ', ' + maxCorrection + ', ' + deadband + ', ' + polarity + ');\n';
    };
    Arduino['arduino_stbv2precision_ajustarControlPrecision'] = Arduino['stbv2precision_ajustarControlPrecision'];
    Arduino['stbv2precision_avanzarPrecisionPorDistancia'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var distance = Blockly.Arduino.valueToCode(block, 'DISTANCE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '5';
  var speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '45';
  return 'stbV2PrecisionMoveDistanceBlocking(' + distance + ', ' + speed + ');\n';
    };
    Arduino['arduino_stbv2precision_avanzarPrecisionPorDistancia'] = Arduino['stbv2precision_avanzarPrecisionPorDistancia'];
    Arduino['stbv2precision_retrocederPrecisionPorDistancia'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var distance = Blockly.Arduino.valueToCode(block, 'DISTANCE', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '5';
  var speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '45';
  return 'stbV2PrecisionMoveDistanceBlocking(' + distance + ', ' + speed + ', true);\n';
    };
    Arduino['arduino_stbv2precision_retrocederPrecisionPorDistancia'] = Arduino['stbv2precision_retrocederPrecisionPorDistancia'];
    Arduino['stbv2precision_avanzarPrecisionContinuo'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '45';
  return 'stbV2PrecisionMoveContinuous(' + speed + ');\n';
    };
    Arduino['arduino_stbv2precision_avanzarPrecisionContinuo'] = Arduino['stbv2precision_avanzarPrecisionContinuo'];
    Arduino['stbv2precision_retrocederPrecisionContinuo'] = function(block) {
        ensureStbV2PrecisionRuntime();
  var speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '45';
  return 'stbV2PrecisionMoveContinuous(' + speed + ', true);\n';
    };
    Arduino['arduino_stbv2precision_retrocederPrecisionContinuo'] = Arduino['stbv2precision_retrocederPrecisionContinuo'];
    Arduino['arduino_motores_seleccionarTipoMotores'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var motorType = block.getFieldValue('MOTOR_TYPE') || 'DC';
  var motorTypeConstant = motorType === 'SERVO_360' ? 'STB_EXT_MOTOR_SERVO_360' : 'STB_EXT_MOTOR_DC';
  return 'stbExtSetMotorType(' + motorTypeConstant + ');\n';
    };
    Arduino['stbext_seleccionarTipoMotores'] = Arduino['arduino_motores_seleccionarTipoMotores'];
    Arduino['arduino_motores_configurarMotores'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var wheelDiameter = Blockly.Arduino.valueToCode(
    block,
    'WHEEL_DIAMETER',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '6.5';
  var maxRpm = Blockly.Arduino.valueToCode(
    block,
    'MAX_RPM',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '120';
  var trackWidth = Blockly.Arduino.valueToCode(
    block,
    'TRACK_WIDTH',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '14';

  return 'stbExtConfigMotors(' + wheelDiameter + ', ' + maxRpm + ', ' + trackWidth + ');\n';
    };
    Arduino['stbext_configurarMotores'] = Arduino['arduino_motores_configurarMotores'];
    Arduino['arduino_motores_calibrarServos360'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var stopA1Us = Blockly.Arduino.valueToCode(block, 'STOP_A1_US', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1500';
  var stopA2Us = Blockly.Arduino.valueToCode(block, 'STOP_A2_US', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1500';
  var minUs = Blockly.Arduino.valueToCode(block, 'MIN_US', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1000';
  var maxUs = Blockly.Arduino.valueToCode(block, 'MAX_US', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '2000';
  var distanceCorrection = Blockly.Arduino.valueToCode(block, 'DISTANCE_CORRECTION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  var turnCorrection = Blockly.Arduino.valueToCode(block, 'TURN_CORRECTION', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1';
  return 'stbExtConfigServo360(' + stopA1Us + ', ' + stopA2Us + ', ' + minUs + ', ' + maxUs + ', ' +
    distanceCorrection + ', ' + turnCorrection + ');\n';
    };
    Arduino['stbext_calibrarServos360'] = Arduino['arduino_motores_calibrarServos360'];
    Arduino['arduino_motores_probarPulsoServo360'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var pulseUs = Blockly.Arduino.valueToCode(block, 'PULSE_US', Blockly.Arduino.ORDER_UNARY_POSTFIX) || '1500';
  return 'stbExtTestServoPulse("' + motor + '", ' + pulseUs + ');\n';
    };
    Arduino['stbext_probarPulsoServo360'] = Arduino['arduino_motores_probarPulsoServo360'];
    Arduino['arduino_motores_definirDireccionMotorA1'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var direction = block.getFieldValue('DIRECTION') || 'NORMAL';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtSetMotorDirection("A1", ' + (direction === 'INVERTED' ? 'true' : 'false') + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_definirDireccionMotorA1'] = Arduino['arduino_motores_definirDireccionMotorA1'];
    Arduino['arduino_motores_definirDireccionMotorA2'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var direction = block.getFieldValue('DIRECTION') || 'NORMAL';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtSetMotorDirection("A2", ' + (direction === 'INVERTED' ? 'true' : 'false') + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_definirDireccionMotorA2'] = Arduino['arduino_motores_definirDireccionMotorA2'];
    Arduino['arduino_motores_definirVelocidadMotor'] = function(block) {
        ensureSTBExtensionConfigHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var speed = Blockly.Arduino.valueToCode(
    block,
    'SPEED',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '100';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtSetStoredSpeed("' + motor + '", ' + speed + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_definirVelocidadMotor'] = Arduino['arduino_motores_definirVelocidadMotor'];
    Arduino['arduino_motores_avanzarMotor'] = function(block) {
        ensureSTBExtensionMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtRunMotor("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_avanzarMotor'] = Arduino['arduino_motores_avanzarMotor'];
    Arduino['arduino_motores_retrocederMotor'] = function(block) {
        ensureSTBExtensionMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtReverseMotor("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_retrocederMotor'] = Arduino['arduino_motores_retrocederMotor'];
    Arduino['arduino_motores_avanzarMotorPorTiempo'] = function(block) {
        ensureSTBExtensionMoveHelpers();
  ensureSTBExtensionTriggerHelpers();
  ensureSTBExtensionBase();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var timeUnit = block.getFieldValue('TIME_UNIT') || 'SECONDS';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '2';
  var speed = Blockly.Arduino.valueToCode(
    block,
    'SPEED',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '80';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtRunMotorWithSpeed("' + motor + '", ' + speed + ');\n';
  code += '  for (unsigned long stbExtTimedStart = millis(); millis() - stbExtTimedStart < stbExtDurationToMs(' + value + ', "' + timeUnit + '"); delay(1)) {\n';
  code += '    stbExtCheckTriggers();\n';
  code += '  }\n';
  code += '  stbExtStopMotor("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_avanzarMotorPorTiempo'] = Arduino['arduino_motores_avanzarMotorPorTiempo'];
    Arduino['arduino_motores_avanzarMotorPorDistancia'] = function(block) {
        ensureSTBExtensionDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '10';
  var speed = Blockly.Arduino.valueToCode(
    block,
    'SPEED',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '80';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtMoveMotorDistance("' + motor + '", ' + value + ', "' + distanceUnit + '", ' + speed + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_avanzarMotorPorDistancia'] = Arduino['arduino_motores_avanzarMotorPorDistancia'];
    Arduino['arduino_motores_avanzarMotorPorDistanciaGuardada'] = function(block) {
        ensureSTBExtensionDistanceHelpers();
  ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '10';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtMoveMotorDistance("' + motor + '", ' + value + ', "' + distanceUnit + '", stbExtGetStoredSpeedPercent("' + motor + '"));\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_avanzarMotorPorDistanciaGuardada'] = Arduino['arduino_motores_avanzarMotorPorDistanciaGuardada'];
    Arduino['arduino_motores_retrocederMotorPorDistancia'] = function(block) {
        ensureSTBExtensionDistanceHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '10';
  var speed = Blockly.Arduino.valueToCode(
    block,
    'SPEED',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '80';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtMoveMotorDistance("' + motor + '", -(' + value + '), "' + distanceUnit + '", ' + speed + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_retrocederMotorPorDistancia'] = Arduino['arduino_motores_retrocederMotorPorDistancia'];
    Arduino['arduino_motores_retrocederMotorPorDistanciaGuardada'] = function(block) {
        ensureSTBExtensionDistanceHelpers();
  ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var distanceUnit = block.getFieldValue('DISTANCE_UNIT') || 'CM';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '10';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtMoveMotorDistance("' + motor + '", -(' + value + '), "' + distanceUnit + '", stbExtGetStoredSpeedPercent("' + motor + '"));\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_retrocederMotorPorDistanciaGuardada'] = Arduino['arduino_motores_retrocederMotorPorDistanciaGuardada'];
    Arduino['arduino_motores_girarMotor'] = function(block) {
        ensureSTBExtensionTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtTurn("' + side + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_girarMotor'] = Arduino['arduino_motores_girarMotor'];
    Arduino['arduino_motores_girarMotorPorValor'] = function(block) {
        ensureSTBExtensionTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var turnUnit = block.getFieldValue('TURN_UNIT') || 'DEGREES';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '90';
  var speed = Blockly.Arduino.valueToCode(
    block,
    'SPEED',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '80';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtTurnByAmount("' + side + '", ' + value + ', "' + turnUnit + '", ' + speed + ');\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_girarMotorPorValor'] = Arduino['arduino_motores_girarMotorPorValor'];
    Arduino['arduino_motores_girarMotorPorValorGuardado'] = function(block) {
        ensureSTBExtensionTurnHelpers();
  ensureSTBExtensionStatusHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var turnUnit = block.getFieldValue('TURN_UNIT') || 'DEGREES';
  var value = Blockly.Arduino.valueToCode(
    block,
    'VALUE',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '90';
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  stbExtTurnByAmount("' + side + '", ' + value + ', "' + turnUnit + '", stbExtGetStoredSpeedPercent("BOTH"));\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_girarMotorPorValorGuardado'] = Arduino['arduino_motores_girarMotorPorValorGuardado'];
    Arduino['arduino_motores_detenerMotor'] = function(block) {
        ensureSTBExtensionBase();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var code = '';
  code += 'stbExtStopMotor("' + motor + '");\n';
  return code;
    };
    Arduino['stbext_detenerMotor'] = Arduino['arduino_motores_detenerMotor'];
    Arduino['arduino_motores_avanzarHastaQue'] = function(block) {
        ensureSTBExtensionMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var condition = Blockly.Arduino.valueToCode(
    block,
    'CONDITION',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  while (!(' + condition + ')) {\n';
  code += '    stbExtRunMotor("' + motor + '");\n';
  code += branch;
  code += '    repeat();\n';
  code += '  }\n';
  code += '  stbExtStopMotor("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_avanzarHastaQue'] = Arduino['arduino_motores_avanzarHastaQue'];
    Arduino['arduino_motores_retrocederHastaQue'] = function(block) {
        ensureSTBExtensionMoveHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var condition = Blockly.Arduino.valueToCode(
    block,
    'CONDITION',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'if (stbExtMotorConfig.configured) {\n';
  code += '  while (!(' + condition + ')) {\n';
  code += '    stbExtReverseMotor("' + motor + '");\n';
  code += branch;
  code += '    repeat();\n';
  code += '  }\n';
  code += '  stbExtStopMotor("' + motor + '");\n';
  code += '}\n';
  return code;
    };
    Arduino['stbext_retrocederHastaQue'] = Arduino['arduino_motores_retrocederHastaQue'];
    Arduino['arduino_motores_girarHastaQue'] = function(block) {
        ensureSTBExtensionTurnHelpers();
  var side = block.getFieldValue('SIDE') || 'RIGHT';
  var condition = Blockly.Arduino.valueToCode(
    block,
    'CONDITION',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'if (!stbExtMotorConfig.configured) {\n';
  code += '  return;\n';
  code += '}\n';
  code += 'while (!(' + condition + ')) {\n';
  code += Blockly.Arduino.INDENT + 'stbExtTurn("' + side + '");\n';
  code += branch;
  code += Blockly.Arduino.INDENT + 'repeat();\n';
  code += '}\n';
  code += 'stbExtStopMotor("BOTH");\n';
  return code;
    };
    Arduino['stbext_girarHastaQue'] = Arduino['arduino_motores_girarHastaQue'];
    Arduino['arduino_motores_detenerSi'] = function(block) {
        ensureSTBExtensionBase();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  var condition = Blockly.Arduino.valueToCode(
    block,
    'CONDITION',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || 'false';
  var branch = Blockly.Arduino.statementToCode(block, 'SUBSTACK');
  branch = Blockly.Arduino.addLoopTrap(branch, block.id);
  var code = '';
  code += 'if (' + condition + ') {\n';
  code += Blockly.Arduino.INDENT + 'stbExtStopMotor("' + motor + '");\n';
  code += branch;
  code += '}\n';
  return code;
    };
    Arduino['stbext_detenerSi'] = Arduino['arduino_motores_detenerSi'];
    Arduino['arduino_motores_configurarTrigger'] = function(block) {
        ensureSTBExtensionTriggerHelpers();
  var pin = block.getFieldValue('PIN') || '0';
  var condition = block.getFieldValue('CONDITION') || 'GT';
  var targetMotors = block.getFieldValue('TARGET_MOTORS') || 'BOTH';
  var threshold = Blockly.Arduino.valueToCode(
    block,
    'THRESHOLD',
    Blockly.Arduino.ORDER_UNARY_POSTFIX
  ) || '500';
  var code = '';
  Blockly.Arduino.loops_['stb_extension_trigger_check'] = 'stbExtCheckTriggers();';
  code += 'stbExtConfigureTrigger(' + pin + ', ' + (condition === 'GT' ? 'true' : 'false') + ', ' + threshold + ', "' + targetMotors + '");\n';
  return code;
    };
    Arduino['stbext_configurarTrigger'] = Arduino['arduino_motores_configurarTrigger'];
    Arduino['arduino_motores_desactivarTrigger'] = function(block) {
        ensureSTBExtensionTriggerHelpers();
  var pin = block.getFieldValue('PIN') || '0';
  return 'stbExtDisableTrigger(' + pin + ');\n';
    };
    Arduino['stbext_desactivarTrigger'] = Arduino['arduino_motores_desactivarTrigger'];
    Arduino['arduino_motores_velocidadActualMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtGetCurrentMotorRpm("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_velocidadActualMotor'] = Arduino['arduino_motores_velocidadActualMotor'];
    Arduino['arduino_motores_velocidadAplicadaMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtGetAppliedSpeedPercent("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_velocidadAplicadaMotor'] = Arduino['arduino_motores_velocidadAplicadaMotor'];
    Arduino['arduino_motores_velocidadGuardadaMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtGetStoredSpeedPercent("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_velocidadGuardadaMotor'] = Arduino['arduino_motores_velocidadGuardadaMotor'];
    Arduino['arduino_motores_motorEnMovimiento'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtIsMotorMoving("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_motorEnMovimiento'] = Arduino['arduino_motores_motorEnMovimiento'];
    Arduino['arduino_motores_encoderMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtGetMotorEncoderTicks("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_encoderMotor'] = Arduino['arduino_motores_encoderMotor'];
    Arduino['arduino_motores_distanciaRecorridaMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return ['stbExtGetCurrentMotorDistanceCm("' + motor + '")', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_distanciaRecorridaMotor'] = Arduino['arduino_motores_distanciaRecorridaMotor'];
    Arduino['arduino_motores_reiniciarDistanciaMotor'] = function(block) {
        ensureSTBExtensionStatusHelpers();
  var motor = block.getFieldValue('MOTOR') || 'BOTH';
  return 'stbExtResetMotorDistance("' + motor + '");\n';
    };
    Arduino['stbext_reiniciarDistanciaMotor'] = Arduino['arduino_motores_reiniciarDistanciaMotor'];
    Arduino['arduino_motores_leerTrigger'] = function(block) {
        var pin = block.getFieldValue('PIN') || '0';
  var analogPin = pin === '0' ? 'A0' : 'A1';
  return ['analogRead(' + analogPin + ')', Blockly.Arduino.ORDER_ATOMIC];
    };
    Arduino['stbext_leerTrigger'] = Arduino['arduino_motores_leerTrigger'];

    return Arduino;
};

export default initArduinoGenerator;
