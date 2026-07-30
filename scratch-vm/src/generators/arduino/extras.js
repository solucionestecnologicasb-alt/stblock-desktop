/**
 * Arduino Extra Block Generators
 * Ported from openblock-blocks for backward compatibility with old STBlock .sb3 projects.
 *
 * Categories: Advanced, I2C, SPI, SD Card, Structs, Display extras, Math extras
 * Each generator produces EXACTLY the same C++ output as the original Blockly.Arduino['...'] generators.
 */

module.exports = {
    // ============================================
    // ADVANCED BLOCKS
    // ============================================

    // ---------- Watchdog ----------
    watchdogEnable (block, blocks) {
        const time = this.getFieldValue(block, 'TIME') || 'WDTO_8S';
        this.addInclude('avr/wdt.h');
        return `wdt_enable(${time});\n`;
    },

    watchdogReset (block, blocks) {
        this.addInclude('avr/wdt.h');
        return 'wdt_reset();\n';
    },

    // ---------- Analog Reference ----------
    setAnalogReference (block, blocks) {
        const ref = this.getFieldValue(block, 'REF') || 'DEFAULT';
        return `analogReference(${ref});\n`;
    },

    // ---------- Software Reset ----------
    softwareReset (block, blocks) {
        return 'asm volatile ("  jmp 0");\n';
    },

    // ---------- Advanced Interrupts ----------
    advancedAttachInterrupt (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '2';
        const mode = this.getFieldValue(block, 'MODE') || 'RISING';
        const func = this.getFieldValue(block, 'FUNC') || 'miFuncion';
        return `attachInterrupt(digitalPinToInterrupt(${pin}), ${func}, ${mode});\n`;
    },

    advancedDetachInterrupt (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '2';
        return `detachInterrupt(digitalPinToInterrupt(${pin}));\n`;
    },

    // ---------- Pulse In ----------
    advancedPulseIn (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '7';
        const type = this.getFieldValue(block, 'TYPE') || 'HIGH';
        return `pulseIn(${pin}, ${type})`;
    },

    // ---------- Shift Out ----------
    shiftOut (block, blocks) {
        const data = this.getFieldValue(block, 'DATA') || '11';
        const clock = this.getFieldValue(block, 'CLOCK') || '12';
        const order = this.getFieldValue(block, 'ORDER') || 'MSBFIRST';
        const val = this.generateValue(block, 'VAL', blocks) || '0';
        return `shiftOut(${data}, ${clock}, ${order}, ${val});\n`;
    },

    // ---------- Control Break ----------
    controlBreak (block, blocks) {
        return 'break;\n';
    },

    // ---------- Control Switch/Case/Default ----------
    controlSwitch (block, blocks) {
        const val = this.generateValue(block, 'VAL', blocks) || '0';
        const branch = this.generateStack(block, blocks);
        return `switch (${val}) {\n${branch}}\n`;
    },

    controlCase (block, blocks) {
        const val = this.generateValue(block, 'VAL', blocks) || '0';
        const branch = this.generateStack(block, blocks);
        return `case ${val}:\n${branch}  break;\n`;
    },

    controlDefault (block, blocks) {
        const branch = this.generateStack(block, blocks);
        return `default:\n${branch}  break;\n`;
    },

    // ---------- Raw Code ----------
    _resolveRawCode (block, blocks) {
        const fieldCode = this.getFieldValue(block, 'CODE');
        if (fieldCode) return fieldCode;

        // Try to generate value from CODE input
        const code = this.generateValue(block, 'CODE', blocks);
        if (code && code !== '0') {
            // Check if it's a text literal by looking at the connected block
            const input = block.inputs && block.inputs.CODE;
            if (input && input.block) {
                const valueBlock = blocks[input.block];
                if (valueBlock) {
                    if (valueBlock.opcode === 'text' || valueBlock.opcode === 'text_multiline') {
                        return this.getFieldValue(valueBlock, 'TEXT') || '';
                    }
                    if (valueBlock.opcode === 'math_number') {
                        return this.getFieldValue(valueBlock, 'NUM') || '0';
                    }
                }
            }
            return code;
        }
        return '';
    },

    rawCode (block, blocks) {
        const resolved = this._resolveRawCode(block, blocks);
        return (resolved || '') + '\n';
    },

    rawReporter (block, blocks) {
        const resolved = this._resolveRawCode(block, blocks);
        return resolved || '0';
    },

    rawDefinition (block, blocks) {
        const resolved = this._resolveRawCode(block, blocks);
        if (resolved) {
            const id = resolved.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
            this.addDefinition('raw_' + id + '\n' + resolved);
        }
        return '';
    },

    // ---------- Advanced Serial ----------
    advancedSerialAvailable (block, blocks) {
        return 'Serial.available() > 0';
    },

    serialReadStringUntil (block, blocks) {
        const char = this.getFieldValue(block, 'CHAR') || '\\n';
        return `Serial.readStringUntil("${char}")`;
    },

    serialFlush (block, blocks) {
        return 'Serial.flush();\n';
    },

    // ---------- Power Sleep ----------
    powerSleep (block, blocks) {
        const mode = this.getFieldValue(block, 'MODE') || 'SLEEP_MODE_PWR_DOWN';
        this.addInclude('avr/sleep.h');
        return `set_sleep_mode(${mode});\nsleep_mode();\n`;
    },

    // ============================================
    // I2C COMMUNICATION BLOCKS
    // ============================================

    i2cSetClock (block, blocks) {
        const speed = this.getFieldValue(block, 'SPEED') || '100000';
        this.addInclude('Wire.h');
        return `Wire.setClock(${speed});\n`;
    },

    i2cBeginTransmission (block, blocks) {
        const addr = this.generateValue(block, 'ADDR', blocks) || '0x3C';
        this.addInclude('Wire.h');
        return `Wire.beginTransmission(${addr});\n`;
    },

    i2cWriteByte (block, blocks) {
        const data = this.generateValue(block, 'DATA', blocks) || '0';
        this.addInclude('Wire.h');
        return `Wire.write((uint8_t)(${data}));\n`;
    },

    i2cWriteStringEx (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        this.addInclude('Wire.h');
        return `Wire.print(${text});\n`;
    },

    i2cRequestFrom (block, blocks) {
        const count = this.generateValue(block, 'COUNT', blocks) || '1';
        const addr = this.generateValue(block, 'ADDR', blocks) || '0x68';
        this.addInclude('Wire.h');
        return `Wire.requestFrom((uint8_t)(${addr}), (uint8_t)(${count}));\n`;
    },

    i2cAvailable (block, blocks) {
        this.addInclude('Wire.h');
        return 'Wire.available()';
    },

    i2cRead (block, blocks) {
        this.addInclude('Wire.h');
        return 'Wire.read()';
    },

    i2cScan (block, blocks) {
        this.addInclude('Wire.h');
        this.addDefinition([
            'void scanI2CDevices() {',
            '  Serial.println("Escaneando I2C...");',
            '  byte count = 0;',
            '  for (byte addr = 1; addr < 127; addr++) {',
            '    Wire.beginTransmission(addr);',
            '    if (Wire.endTransmission() == 0) {',
            '      Serial.print("Dispositivo encontrado: 0x");',
            '      if (addr < 16) Serial.print("0");',
            '      Serial.println(addr, HEX);',
            '      count++;',
            '    }',
            '  }',
            '  Serial.print("Total dispositivos: ");',
            '  Serial.println(count);',
            '}'
        ].join('\n'));
        return 'scanI2CDevices();\n';
    },

    // ============================================
    // SPI COMMUNICATION BLOCKS
    // ============================================

    spiBegin (block, blocks) {
        this.addInclude('SPI.h');
        this.addSetupCode('SPI.begin();');
        return '';
    },

    spiSettings (block, blocks) {
        const speed = this.generateValue(block, 'SPEED', blocks) || '4000000';
        const order = this.getFieldValue(block, 'ORDER') || 'MSBFIRST';
        const mode = this.getFieldValue(block, 'MODE') || 'SPI_MODE0';
        this.addInclude('SPI.h');
        this.addDefinition(`SPISettings spiSettings(${speed}, ${order}, ${mode});`);
        return '';
    },

    spiBeginTransaction (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '10';
        this.addInclude('SPI.h');
        this.addSetupCode(`pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, HIGH);`);
        // Ensure spiSettings exists with default if not set
        this.addDefinition('SPISettings spiSettings(4000000, MSBFIRST, SPI_MODE0);');
        let code = 'SPI.beginTransaction(spiSettings);\n';
        code += `digitalWrite(${pin}, LOW);\n`;
        return code;
    },

    spiTransfer (block, blocks) {
        const data = this.generateValue(block, 'DATA', blocks) || '0';
        this.addInclude('SPI.h');
        return `SPI.transfer(${data})`;
    },

    spiTransferArray (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'datos';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        const size = this.generateValue(block, 'SIZE', blocks) || '8';
        this.addInclude('SPI.h');
        this.addDefinition([
            'template<typename T>',
            'void spiTransferSimpleArray(SimpleArray<T>& arr, size_t count) {',
            '  size_t limit = count;',
            '  if (limit > (size_t)arr.size()) limit = (size_t)arr.size();',
            '  for (size_t i = 0; i < limit; i++) {',
            '    SPI.transfer((uint8_t)arr.get((int)i));',
            '  }',
            '}'
        ].join('\n'));
        return `spiTransferSimpleArray(${cleanName}, ${size});\n`;
    },

    spiEndTransaction (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '10';
        this.addInclude('SPI.h');
        let code = 'SPI.endTransaction();\n';
        code += `digitalWrite(${pin}, HIGH);\n`;
        return code;
    },

    spiEnd (block, blocks) {
        this.addInclude('SPI.h');
        return 'SPI.end();\n';
    },

    // ============================================
    // SD CARD BLOCKS
    // ============================================

    sdBegin (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || '10';
        this.addInclude('SD.h');
        this.addInclude('SPI.h');
        return `SD.begin(${pin})`;
    },

    sdExists (block, blocks) {
        const filename = this.generateValue(block, 'FILENAME', blocks) || '"data.txt"';
        this.addInclude('SD.h');
        return `SD.exists(${filename})`;
    },

    sdOpen (block, blocks) {
        const filename = this.generateValue(block, 'FILENAME', blocks) || '"data.txt"';
        const mode = this.getFieldValue(block, 'MODE') || 'FILE_WRITE';
        this.addInclude('SD.h');
        this.addGlobalVar('sdFile', 'File');
        return `(sdFile = SD.open(${filename}, ${mode}))`;
    },

    sdClose (block, blocks) {
        this.addInclude('SD.h');
        return 'sdFile.close();\n';
    },

    sdWrite (block, blocks) {
        const data = this.generateValue(block, 'DATA', blocks) || '""';
        this.addInclude('SD.h');
        return `sdFile.print(${data});\n`;
    },

    sdWriteLine (block, blocks) {
        const data = this.generateValue(block, 'DATA', blocks) || '""';
        this.addInclude('SD.h');
        return `sdFile.println(${data});\n`;
    },

    sdReadLine (block, blocks) {
        this.addInclude('SD.h');
        this.addDefinition([
            'String sdReadLine() {',
            '  String line = "";',
            '  while (sdFile.available()) {',
            '    char c = sdFile.read();',
            '    if (c == \'\\n\') break;',
            '    if (c != \'\\r\') line += c;',
            '  }',
            '  return line;',
            '}'
        ].join('\n'));
        return 'sdReadLine()';
    },

    sdReadAll (block, blocks) {
        this.addInclude('SD.h');
        this.addDefinition([
            'String sdReadAll() {',
            '  String content = "";',
            '  while (sdFile.available()) {',
            '    content += (char)sdFile.read();',
            '  }',
            '  return content;',
            '}'
        ].join('\n'));
        return 'sdReadAll()';
    },

    sdAvailable (block, blocks) {
        this.addInclude('SD.h');
        return 'sdFile.available()';
    },

    sdRemove (block, blocks) {
        const filename = this.generateValue(block, 'FILENAME', blocks) || '"old.txt"';
        this.addInclude('SD.h');
        return `SD.remove(${filename})`;
    },

    sdMkdir (block, blocks) {
        const dirname = this.generateValue(block, 'DIRNAME', blocks) || '"logs"';
        this.addInclude('SD.h');
        return `SD.mkdir(${dirname})`;
    },

    sdFileSize (block, blocks) {
        this.addInclude('SD.h');
        return 'sdFile.size()';
    },

    // ============================================
    // STRUCT BLOCKS
    // ============================================

    structDefine (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || '"Sensor"';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        const fields = this.generateValue(block, 'FIELDS', blocks) || '"temp:float"';
        const cleanFields = String(fields).replace(/^["']|["']$/g, '');

        const fieldLines = cleanFields.split(',').map(function(f) {
            const parts = f.trim().split(':');
            if (parts.length === 2) {
                return '  ' + parts[1].trim() + ' ' + parts[0].trim() + ';';
            }
            return '';
        }).filter(function(l) { return l !== ''; }).join('\n');

        this.addDefinition('struct ' + cleanName + ' {\n' + fieldLines + '\n};');
        return '';
    },

    structCreate (block, blocks) {
        const varname = this.generateValue(block, 'VARNAME', blocks) || '"miVar"';
        const cleanVarname = String(varname).replace(/^["']|["']$/g, '');
        const structname = this.generateValue(block, 'STRUCTNAME', blocks) || '"Sensor"';
        const cleanStructname = String(structname).replace(/^["']|["']$/g, '');
        this.addDefinition(structname + ' ' + cleanVarname + ';');
        return '';
    },

    structSet (block, blocks) {
        const varname = this.generateValue(block, 'VARNAME', blocks) || '"miVar"';
        const cleanVarname = String(varname).replace(/^["']|["']$/g, '');
        const field = this.generateValue(block, 'FIELD', blocks) || '"campo"';
        const cleanField = String(field).replace(/^["']|["']$/g, '');
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return cleanVarname + '.' + cleanField + ' = ' + value + ';\n';
    },

    structGet (block, blocks) {
        const varname = this.generateValue(block, 'VARNAME', blocks) || '"miVar"';
        const cleanVarname = String(varname).replace(/^["']|["']$/g, '');
        const field = this.generateValue(block, 'FIELD', blocks) || '"campo"';
        const cleanField = String(field).replace(/^["']|["']$/g, '');
        return cleanVarname + '.' + cleanField;
    },

    structArrayCreate (block, blocks) {
        const arrname = this.generateValue(block, 'ARRNAME', blocks) || '"arr"';
        const cleanArrname = String(arrname).replace(/^["']|["']$/g, '');
        const structname = this.generateValue(block, 'STRUCTNAME', blocks) || '"Sensor"';
        const cleanStructname = String(structname).replace(/^["']|["']$/g, '');
        const size = this.generateValue(block, 'SIZE', blocks) || '5';
        this.addDefinition(cleanStructname + ' ' + cleanArrname + '[' + size + '];');
        return '';
    },

    structArraySet (block, blocks) {
        const arrname = this.generateValue(block, 'ARRNAME', blocks) || '"arr"';
        const cleanArrname = String(arrname).replace(/^["']|["']$/g, '');
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const field = this.generateValue(block, 'FIELD', blocks) || '"campo"';
        const cleanField = String(field).replace(/^["']|["']$/g, '');
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return cleanArrname + '[' + index + '].' + cleanField + ' = ' + value + ';\n';
    },

    structArrayGet (block, blocks) {
        const arrname = this.generateValue(block, 'ARRNAME', blocks) || '"arr"';
        const cleanArrname = String(arrname).replace(/^["']|["']$/g, '');
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const field = this.generateValue(block, 'FIELD', blocks) || '"campo"';
        const cleanField = String(field).replace(/^["']|["']$/g, '');
        return cleanArrname + '[' + index + '].' + cleanField;
    },

    // ============================================
    // DISPLAY EXTRAS (Arduino LED Matrix)
    // ============================================

    displayShowUntilScrollDone (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '0';
        this.addInclude('ArduinoGraphics.h');
        this.addInclude('Arduino_LED_Matrix.h');
        this.addGlobalVar('matrix', 'ArduinoLEDMatrix');
        this.addSetupCode('matrix.begin();');
        this.addSetupCode('matrix.textFont(Font_4x6);');
        this.addSetupCode('matrix.beginText(0, 1, 0xFFFFFF);');
        this.addSetupCode('matrix.textScrollSpeed(100);');
        return `matrix.println((const char[]){${text}});\nmatrix.endText(SCROLL_LEFT);\n`;
    },

    displayLightPixelAt (block, blocks) {
        const sta = this.getFieldValue(block, 'STATE') || '1';
        const x = this.generateValue(block, 'X', blocks) || '0';
        const y = this.generateValue(block, 'Y', blocks) || '0';
        this.addInclude('Arduino_LED_Matrix.h');
        this.addGlobalVar('matrix', 'ArduinoLEDMatrix');
        this.addDefinition('byte frame[8][12] = { 0 };');
        this.addSetupCode('matrix.begin();');
        return `frame[${x}][${y}] = ${sta};\nmatrix.renderBitmap(frame, 8, 12);\n`;
    },

    // ============================================
    // MATH EXTRAS
    // ============================================

    mathRoundDecimals (block, blocks) {
        const num = this.generateValue(block, 'NUM', blocks) || '0';
        const decimals = this.generateValue(block, 'DECIMALS', blocks) || '2';
        this.addDefinition([
            'float roundToDecimals(float value, int decimals) {',
            '  float multiplier = pow(10.0, decimals);',
            '  return round(value * multiplier) / multiplier;',
            '}'
        ].join('\n'));
        return `roundToDecimals(${num}, ${decimals})`;
    },

    mathRandomSeedAnalog (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || 'A0';
        return `randomSeed(analogRead(${pin}));\n`;
    },

    mathArraySum (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'miArray';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        this.addDefinition([
            'template<typename T>',
            'T arraySum(SimpleArray<T>& arr) {',
            '  T sum = 0;',
            '  for (int i = 0; i < arr.size(); i++) {',
            '    sum += arr.get(i);',
            '  }',
            '  return sum;',
            '}'
        ].join('\n'));
        return `arraySum(${cleanName})`;
    },

    mathArrayAverage (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'miArray';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        this.addDefinition([
            'template<typename T>',
            'float arrayAverage(SimpleArray<T>& arr) {',
            '  if (arr.size() == 0) return 0;',
            '  T sum = 0;',
            '  for (int i = 0; i < arr.size(); i++) {',
            '    sum += arr.get(i);',
            '  }',
            '  return (float)sum / arr.size();',
            '}'
        ].join('\n'));
        return `arrayAverage(${cleanName})`;
    },

    mathArrayMax (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'miArray';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        this.addDefinition([
            'template<typename T>',
            'T arrayMax(SimpleArray<T>& arr) {',
            '  if (arr.size() == 0) return 0;',
            '  T maxVal = arr.get(0);',
            '  for (int i = 1; i < arr.size(); i++) {',
            '    if (arr.get(i) > maxVal) maxVal = arr.get(i);',
            '  }',
            '  return maxVal;',
            '}'
        ].join('\n'));
        return `arrayMax(${cleanName})`;
    },

    mathArrayMin (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'miArray';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        this.addDefinition([
            'template<typename T>',
            'T arrayMin(SimpleArray<T>& arr) {',
            '  if (arr.size() == 0) return 0;',
            '  T minVal = arr.get(0);',
            '  for (int i = 1; i < arr.size(); i++) {',
            '    if (arr.get(i) < minVal) minVal = arr.get(i);',
            '  }',
            '  return minVal;',
            '}'
        ].join('\n'));
        return `arrayMin(${cleanName})`;
    },

    mathArraySort (block, blocks) {
        const name = this.generateValue(block, 'NAME', blocks) || 'miArray';
        const cleanName = String(name).replace(/^["']|["']$/g, '');
        const order = this.getFieldValue(block, 'ORDER') || 'ASC';
        this.addDefinition([
            'template<typename T>',
            'void arraySort(SimpleArray<T>& arr, bool ascending) {',
            '  for (int i = 0; i < arr.size() - 1; i++) {',
            '    for (int j = i + 1; j < arr.size(); j++) {',
            '      bool swap = ascending ? (arr.get(i) > arr.get(j)) : (arr.get(i) < arr.get(j));',
            '      if (swap) {',
            '        T temp = arr.get(i);',
            '        arr.set(i, arr.get(j));',
            '        arr.set(j, temp);',
            '      }',
            '    }',
            '  }',
            '}'
        ].join('\n'));
        const ascending = order === 'ASC' ? 'true' : 'false';
        return `arraySort(${cleanName}, ${ascending});\n`;
    }
};
