/**
 * Arduino I/O Block Generators
 * Digital and Analog I/O operations
 */

module.exports = {
    // digitalWrite(pin, value)
    arduino_digitalWrite (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const value = this.getFieldValue(block, 'VALUE') ||
                      this.generateValue(block, 'VALUE', blocks);

        const state = value === 'HIGH' || value === '1' || value === 'true' ? 'HIGH' : 'LOW';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${state});\n`;
    },

    // digitalRead(pin)
    arduino_digitalRead (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        this.addSetupCode(`pinMode(${pin}, INPUT);`);
        return `digitalRead(${pin})`;
    },

    // analogWrite(pin, value)
    arduino_analogWrite (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const value = this.generateValue(block, 'VALUE', blocks);
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `analogWrite(${pin}, ${value});\n`;
    },

    // analogRead(pin)
    arduino_analogRead (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        return `analogRead(${pin})`;
    },

    // pinMode(pin, mode)
    arduino_setPinMode (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const mode = this.getFieldValue(block, 'MODE') || 'OUTPUT';
        return `pinMode(${pin}, ${mode});\n`;
    },

    // tone(pin, frequency)
    arduino_tone (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const freq = this.generateValue(block, 'FREQUENCY', blocks);
        return `tone(${pin}, ${freq});\n`;
    },

    // tone(pin, frequency, duration)
    arduino_toneWithDuration (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const freq = this.generateValue(block, 'FREQUENCY', blocks);
        const duration = this.generateValue(block, 'DURATION', blocks);
        return `tone(${pin}, ${freq}, ${duration});\n`;
    },

    // noTone(pin)
    arduino_noTone (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        return `noTone(${pin});\n`;
    },

    // Set LED (simplified digitalWrite for LED)
    arduino_setLed (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const state = this.getFieldValue(block, 'STATE');
        const value = state === 'on' || state === 'ON' || state === '1' ? 'HIGH' : 'LOW';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${value});\n`;
    },

    // Read button
    arduino_readButton (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        this.addSetupCode(`pinMode(${pin}, INPUT_PULLUP);`);
        return `digitalRead(${pin})`;
    },

    // Map value
    arduino_map (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks);
        const fromLow = this.generateValue(block, 'FROM_LOW', blocks);
        const fromHigh = this.generateValue(block, 'FROM_HIGH', blocks);
        const toLow = this.generateValue(block, 'TO_LOW', blocks);
        const toHigh = this.generateValue(block, 'TO_HIGH', blocks);
        return `map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`;
    },

    // Constrain value
    arduino_constrain (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks);
        const low = this.generateValue(block, 'LOW', blocks);
        const high = this.generateValue(block, 'HIGH', blocks);
        return `constrain(${value}, ${low}, ${high})`;
    },

    // Serial print
    arduino_serialPrint (block, blocks) {
        const text = this.normalizeArduinoPrintValue(this.generateValue(block, 'TEXT', blocks));
        this.addSetupCode('Serial.begin(9600);');
        return `Serial.print(${text});\n`;
    },

    // Serial println
    arduino_serialPrintln (block, blocks) {
        const text = this.normalizeArduinoPrintValue(this.generateValue(block, 'TEXT', blocks));
        this.addSetupCode('Serial.begin(9600);');
        return `Serial.println(${text});\n`;
    },

    // Serial available
    arduino_serialAvailable (block, blocks) {
        this.addSetupCode('Serial.begin(9600);');
        return 'Serial.available()';
    },

    // Serial read
    arduino_serialRead (block, blocks) {
        this.addSetupCode('Serial.begin(9600);');
        return 'Serial.read()';
    },

    // Serial read string
    arduino_serialReadString (block, blocks) {
        this.addSetupCode('Serial.begin(9600);');
        return 'Serial.readString()';
    },

    // Pulse in
    arduino_pulseIn (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const value = this.getFieldValue(block, 'VALUE') || 'HIGH';
        return `pulseIn(${pin}, ${value})`;
    },

    // Pulse in with timeout
    arduino_pulseInTimeout (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const value = this.getFieldValue(block, 'VALUE') || 'HIGH';
        const timeout = this.generateValue(block, 'TIMEOUT', blocks);
        return `pulseIn(${pin}, ${value}, ${timeout})`;
    },

    // ============================================
    // STBoard / OpenBlock style blocks
    // ============================================

    // Set digital output (STBoard style)
    setDigitalOutput (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const level = this.getFieldValue(block, 'LEVEL') ||
                      this.getFieldValue(block, 'level') ||
                      this.generateValue(block, 'LEVEL', blocks) || 'HIGH';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `digitalWrite(${pin}, ${level});\n`;
    },

    // Set PWM output (STBoard style)
    setPwmOutput (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const value = this.generateValue(block, 'OUT', blocks) || '0';
        this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
        return `analogWrite(${pin}, ${value});\n`;
    },

    // Set pin mode (STBoard style)
    setPinMode (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const mode = this.getFieldValue(block, 'MODE') || 'OUTPUT';
        return `pinMode(${pin}, ${mode});\n`;
    },

    // Read digital pin (STBoard style)
    readDigitalPin (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        this.addSetupCode(`pinMode(${pin}, INPUT);`);
        return `digitalRead(${pin})`;
    },

    // Read analog pin (STBoard style)
    readAnalogPin (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        return `analogRead(${pin})`;
    },

    // Data map (STBoard style)
    dataMap (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '0';
        const fromLow = this.generateValue(block, 'ARG0', blocks) || '0';
        const fromHigh = this.generateValue(block, 'ARG1', blocks) || '1023';
        const toLow = this.generateValue(block, 'ARG2', blocks) || '0';
        const toHigh = this.generateValue(block, 'ARG3', blocks) || '255';
        return `map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`;
    },

    // Data constrain (STBoard style)
    dataConstrain (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '0';
        const low = this.generateValue(block, 'ARG0', blocks) || '0';
        const high = this.generateValue(block, 'ARG1', blocks) || '255';
        return `constrain(${value}, ${low}, ${high})`;
    },

    // Multi serial begin (STBoard style)
    multiSerialBegin (block, blocks) {
        const serialNo = this.getFieldValue(block, 'NO') || '0';
        const baud = this.getFieldValue(block, 'VALUE') || this.generateValue(block, 'VALUE', blocks) || '9600';
        if (serialNo === '0') {
            return `Serial.begin(${baud});\n`;
        }
        return `Serial${serialNo}.begin(${baud});\n`;
    },

    // Multi serial print (STBoard style)
    multiSerialPrint (block, blocks) {
        const serialNo = this.getFieldValue(block, 'NO') || '0';
        const text = this.normalizeArduinoPrintValue(this.generateValue(block, 'VALUE', blocks) || '""');
        const eol = this.getFieldValue(block, 'EOL') || 'warp';
        const serialName = serialNo === '0' ? 'Serial' : `Serial${serialNo}`;
        if (eol === 'warp' || eol === 'newline') {
            return `${serialName}.println(${text});\n`;
        }
        return `${serialName}.print(${text});\n`;
    },

    // Multi serial available (STBoard style)
    multiSerialAvailable (block, blocks) {
        const serialNo = this.getFieldValue(block, 'NO') || '0';
        const serialName = serialNo === '0' ? 'Serial' : `Serial${serialNo}`;
        return `${serialName}.available()`;
    },

    // Multi serial read a byte (STBoard style)
    multiSerialReadAByte (block, blocks) {
        const serialNo = this.getFieldValue(block, 'NO') || '0';
        const serialName = serialNo === '0' ? 'Serial' : `Serial${serialNo}`;
        return `${serialName}.read()`;
    }
};
