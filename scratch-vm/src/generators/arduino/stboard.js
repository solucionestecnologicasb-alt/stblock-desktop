/**
 * Arduino STBoard V2 Specific Block Generators
 * OLED display, sensors, and board-specific features
 */

module.exports = {
    // ============================================
    // Hat blocks (when board starts)
    // ============================================

    // When Arduino begins (STBoard style)
    stbBoardV2_whenArduinoBegin (block, blocks) {
        // This is a hat block - handled in main generator
        return '';
    },

    // Init boot screen
    stbBoardV2_initBootScreen (block, blocks) {
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
    },

    // ============================================
    // OLED Display blocks
    // ============================================

    // Initialize OLED display
    iniciarPantallaOled (block, blocks) {
        const addr = this.getFieldValue(block, 'ADDR') || '0x3C';
        this.addInclude('Wire.h');
        this.addInclude('Adafruit_GFX.h');
        this.addInclude('Adafruit_SSD1306.h');
        this.addGlobalVar('display', 'Adafruit_SSD1306', 'Adafruit_SSD1306(128, 64, &Wire, -1)');
        return `Wire.begin();
display.begin(SSD1306_SWITCHCAPVCC, ${addr});
display.clearDisplay();
display.setTextSize(1);
display.setTextColor(SSD1306_WHITE);
`;
    },

    // Clear OLED display
    limpiarPantallaOled (block, blocks) {
        return 'display.clearDisplay();\n';
    },

    // Update OLED display
    actualizarPantallaOled (block, blocks) {
        return 'display.display();\n';
    },

    // Set cursor position
    establecerCursorOled (block, blocks) {
        const x = this.generateValue(block, 'X', blocks) || '0';
        const y = this.generateValue(block, 'Y', blocks) || '0';
        return `display.setCursor(${x}, ${y});\n`;
    },

    // Print text on OLED
    escribirTextoOled (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        return `display.print(${text});\n`;
    },

    // Print line on OLED
    escribirLineaOled (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        return `display.println(${text});\n`;
    },

    // Set text size
    establecerTamanoTextoOled (block, blocks) {
        const size = this.generateValue(block, 'SIZE', blocks) || '1';
        return `display.setTextSize(${size});\n`;
    },

    // Set text color
    establecerColorTextoOled (block, blocks) {
        const color = this.getFieldValue(block, 'COLOR') || 'WHITE';
        const colorValue = color === 'WHITE' ? 'SSD1306_WHITE' : 'SSD1306_BLACK';
        return `display.setTextColor(${colorValue});\n`;
    },

    // Draw pixel
    dibujarPixelOled (block, blocks) {
        const x = this.generateValue(block, 'X', blocks) || '0';
        const y = this.generateValue(block, 'Y', blocks) || '0';
        return `display.drawPixel(${x}, ${y}, SSD1306_WHITE);\n`;
    },

    // Draw line
    dibujarLineaOled (block, blocks) {
        const x0 = this.generateValue(block, 'X0', blocks) || '0';
        const y0 = this.generateValue(block, 'Y0', blocks) || '0';
        const x1 = this.generateValue(block, 'X1', blocks) || '10';
        const y1 = this.generateValue(block, 'Y1', blocks) || '10';
        return `display.drawLine(${x0}, ${y0}, ${x1}, ${y1}, SSD1306_WHITE);\n`;
    },

    // Draw rectangle
    dibujarRectanguloOled (block, blocks) {
        const x = this.generateValue(block, 'X', blocks) || '0';
        const y = this.generateValue(block, 'Y', blocks) || '0';
        const w = this.generateValue(block, 'W', blocks) || '10';
        const h = this.generateValue(block, 'H', blocks) || '10';
        const filled = this.getFieldValue(block, 'FILLED') || 'false';
        if (filled === 'true' || filled === 'filled') {
            return `display.fillRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
        }
        return `display.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
    },

    // Draw circle
    dibujarCirculoOled (block, blocks) {
        const x = this.generateValue(block, 'X', blocks) || '64';
        const y = this.generateValue(block, 'Y', blocks) || '32';
        const r = this.generateValue(block, 'R', blocks) || '10';
        const filled = this.getFieldValue(block, 'FILLED') || 'false';
        if (filled === 'true' || filled === 'filled') {
            return `display.fillCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
        }
        return `display.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
    },

    // ============================================
    // Buzzer / Sound blocks
    // ============================================

    // Play tone
    reproducirTono (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks) || '8';
        const freq = this.generateValue(block, 'FREQ', blocks) || '440';
        const duration = this.generateValue(block, 'DURATION', blocks) || '500';
        return `tone(${pin}, ${freq}, ${duration});\n`;
    },

    // Stop tone
    detenerTono (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks) || '8';
        return `noTone(${pin});\n`;
    },

    // ============================================
    // LED RGB blocks
    // ============================================

    // Set RGB LED
    establecerLedRGB (block, blocks) {
        const pinR = this.getFieldValue(block, 'PIN_R') || this.generateValue(block, 'PIN_R', blocks) || '9';
        const pinG = this.getFieldValue(block, 'PIN_G') || this.generateValue(block, 'PIN_G', blocks) || '10';
        const pinB = this.getFieldValue(block, 'PIN_B') || this.generateValue(block, 'PIN_B', blocks) || '11';
        const r = this.generateValue(block, 'R', blocks) || '255';
        const g = this.generateValue(block, 'G', blocks) || '0';
        const b = this.generateValue(block, 'B', blocks) || '0';
        this.addSetupCode(`pinMode(${pinR}, OUTPUT);`);
        this.addSetupCode(`pinMode(${pinG}, OUTPUT);`);
        this.addSetupCode(`pinMode(${pinB}, OUTPUT);`);
        return `analogWrite(${pinR}, ${r});
analogWrite(${pinG}, ${g});
analogWrite(${pinB}, ${b});\n`;
    },

    // ============================================
    // Sensor blocks
    // ============================================

    // Read DHT sensor
    leerDHT (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks) || '2';
        const type = this.getFieldValue(block, 'TYPE') || 'temperature';
        this.addInclude('DHT.h');
        this.addGlobalVar(`dht_${pin}`, 'DHT', `DHT(${pin}, DHT11)`);
        this.addSetupCode(`dht_${pin}.begin();`);
        if (type === 'temperature' || type === 'temp') {
            return `dht_${pin}.readTemperature()`;
        }
        return `dht_${pin}.readHumidity()`;
    },

    // Read ultrasonic sensor
    leerUltrasonico (block, blocks) {
        const trigPin = this.getFieldValue(block, 'TRIG') || this.generateValue(block, 'TRIG', blocks) || '9';
        const echoPin = this.getFieldValue(block, 'ECHO') || this.generateValue(block, 'ECHO', blocks) || '10';
        this.addSetupCode(`pinMode(${trigPin}, OUTPUT);`);
        this.addSetupCode(`pinMode(${echoPin}, INPUT);`);
        return `([]() {
    digitalWrite(${trigPin}, LOW);
    delayMicroseconds(2);
    digitalWrite(${trigPin}, HIGH);
    delayMicroseconds(10);
    digitalWrite(${trigPin}, LOW);
    return pulseIn(${echoPin}, HIGH) * 0.034 / 2;
})()`;
    },

    // ============================================
    // I2C blocks
    // ============================================

    // I2C begin
    iniciarI2C (block, blocks) {
        this.addInclude('Wire.h');
        return 'Wire.begin();\n';
    },

    // I2C write
    escribirI2C (block, blocks) {
        const addr = this.generateValue(block, 'ADDR', blocks) || '0x00';
        const data = this.generateValue(block, 'DATA', blocks) || '0';
        this.addInclude('Wire.h');
        return `Wire.beginTransmission(${addr});
Wire.write(${data});
Wire.endTransmission();\n`;
    },

    // ============================================
    // Interrupts
    // ============================================

    // Attach interrupt
    attachInterrupt (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks) || '2';
        const mode = this.getFieldValue(block, 'MODE') || 'RISING';
        const funcName = `isr_${pin}`;
        // Note: The function body would need to be defined separately
        return `attachInterrupt(digitalPinToInterrupt(${pin}), ${funcName}, ${mode});\n`;
    },

    // Detach interrupt
    detachInterrupt (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks) || '2';
        return `detachInterrupt(digitalPinToInterrupt(${pin}));\n`;
    },

    // ============================================
    // Utility blocks
    // ============================================

    // Data convert
    dataConvert (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '0';
        const type = this.getFieldValue(block, 'TYPE') || 'integer';
        switch (type) {
        case 'integer':
        case 'int':
            return `((int)(${value}))`;
        case 'float':
        case 'decimal':
            return `((float)(${value}))`;
        case 'string':
            return `String(${value})`;
        default:
            return value;
        }
    },

    // Data convert ASCII character
    dataConvertASCIICharacter (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '65';
        return `((char)(${value}))`;
    },

    // Data convert ASCII number
    dataConvertASCIINumber (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || "'A'";
        return `((int)(${value}))`;
    },

    // Bitwise operation
    bitwiseOp (block, blocks) {
        const a = this.generateValue(block, 'ARG0', blocks) || '0';
        const b = this.generateValue(block, 'ARG1', blocks) || '0';
        const op = this.getFieldValue(block, 'OP') || '&';
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
        return `(${a} ${operator} ${b})`;
    },

    // Bitwise NOT
    bitwiseNot (block, blocks) {
        const value = this.generateValue(block, 'ARG0', blocks) || '0';
        return `(~${value})`;
    },

    // Array declare
    arrayDeclare (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'arr';
        const type = this.getFieldValue(block, 'TYPE') || 'int';
        const size = this.generateValue(block, 'SIZE', blocks) || '10';
        const safeName = this.sanitizeVarName(name);
        this.addGlobalVar(safeName, `${type}[${size}]`);
        return '';
    },

    // ============================================
    // Math shadow blocks (number inputs)
    // ============================================

    math_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_integer (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_whole_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_positive_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_uint8_number (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_angle (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '0';
    },

    math_half_angle (block, blocks) {
        return this.getFieldValue(block, 'NUM') || '90';
    },

    text (block, blocks) {
        const text = this.getFieldValue(block, 'TEXT') || '';
        return `"${text}"`;
    },

    // ============================================
    // Menu/dropdown blocks
    // ============================================

    // Level menu (HIGH/LOW)
    arduino_pin_menu_level (block, blocks) {
        return this.getFieldValue(block, 'level') || 'HIGH';
    },

    // Mode menu (INPUT/OUTPUT/INPUT_PULLUP)
    arduino_pin_menu_mode (block, blocks) {
        return this.getFieldValue(block, 'mode') || 'OUTPUT';
    },

    // Pin menu
    arduino_pin_menu_digitalPin (block, blocks) {
        return this.getFieldValue(block, 'pin') || '0';
    },

    arduino_pin_menu_analogPin (block, blocks) {
        return this.getFieldValue(block, 'pin') || 'A0';
    },

    arduino_pin_menu_pwmPin (block, blocks) {
        return this.getFieldValue(block, 'pin') || '3';
    },

    // Boolean menu
    arduino_menu_boolean (block, blocks) {
        const value = this.getFieldValue(block, 'boolean') || 'true';
        return value === 'true' ? 'true' : 'false';
    },

    // Interrupt mode menu
    arduino_pin_menu_interruptMode (block, blocks) {
        return this.getFieldValue(block, 'mode') || 'RISING';
    },

    // Serial number menu
    arduino_serial_menu_serialNo (block, blocks) {
        return this.getFieldValue(block, 'NO') || '0';
    },

    // EOL (end of line) menu
    arduino_serial_menu_eol (block, blocks) {
        return this.getFieldValue(block, 'eol') || 'warp';
    }
};
