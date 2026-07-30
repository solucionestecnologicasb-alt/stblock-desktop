/**
 * Arduino Array, Data, and Text Block Generators
 * Ported from openblock-blocks for backward compatibility with old STBlock .sb3 projects.
 *
 * Arrays use a SimpleArray<T> template class that provides dynamic array operations.
 * Data blocks provide map(), constrain(), and conversion utilities.
 * Text blocks provide string operations.
 */

module.exports = {
    // ============================================
    // Data: Map
    // ============================================
    dataMap (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '0';
        const fromLow = this.generateValue(block, 'ARG0', blocks) || '0';
        const fromHigh = this.generateValue(block, 'ARG1', blocks) || '1023';
        const toLow = this.generateValue(block, 'ARG2', blocks) || '0';
        const toHigh = this.generateValue(block, 'ARG3', blocks) || '255';
        return `map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`;
    },

    // Data: Constrain
    dataConstrain (block, blocks) {
        const value = this.generateValue(block, 'DATA', blocks) || '0';
        const low = this.generateValue(block, 'ARG0', blocks) || '0';
        const high = this.generateValue(block, 'ARG1', blocks) || '255';
        return `constrain(${value}, ${low}, ${high})`;
    },

    // ============================================
    // Text operations
    // ============================================
    textLength (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        return `String(${text}).length()`;
    },

    textCharAt (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        // Accept both INDEX (current) and POS (old STBlock)
        const pos = this.generateValue(block, 'POS', blocks) ||
                    this.generateValue(block, 'INDEX', blocks) || '0';
        return `String(String(${text}).charAt(${pos}))`;
    },

    textSubstring (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const start = this.generateValue(block, 'START', blocks) || '0';
        const end = this.generateValue(block, 'END', blocks) || '0';
        return `String(${text}).substring(${start}, ${end})`;
    },

    textCase (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const caseMode = this.getFieldValue(block, 'CASE') || 'upper';
        this.addDefinition([
            'String textToCase(String str, bool toUpper) {',
            '  String result = str;',
            '  for (unsigned int i = 0; i < result.length(); i++) {',
            '    result[i] = toUpper ? toupper(result[i]) : tolower(result[i]);',
            '  }',
            '  return result;',
            '}'
        ].join('\n'));
        const isUpper = caseMode === 'upper' ? 'true' : 'false';
        return `textToCase(String(${text}), ${isUpper})`;
    },

    textTrim (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        this.addDefinition([
            'String textTrim(String str) {',
            '  str.trim();',
            '  return str;',
            '}'
        ].join('\n'));
        return `textTrim(String(${text}))`;
    },

    textStartsWith (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const prefix = this.generateValue(block, 'PREFIX', blocks) || '""';
        return `String(${text}).startsWith(${prefix})`;
    },

    textEndsWith (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const suffix = this.generateValue(block, 'SUFFIX', blocks) || '""';
        return `String(${text}).endsWith(${suffix})`;
    },

    textIndexOf (block, blocks) {
        const search = this.generateValue(block, 'SEARCH', blocks) || '""';
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        return `String(${text}).indexOf(${search})`;
    },

    textReplace (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const oldStr = this.generateValue(block, 'OLD', blocks) || '""';
        const newStr = this.generateValue(block, 'NEW', blocks) || '""';
        this.addDefinition([
            'String textReplace(String str, String oldVal, String newVal) {',
            '  str.replace(oldVal, newVal);',
            '  return str;',
            '}'
        ].join('\n'));
        return `textReplace(String(${text}), ${oldStr}, ${newStr})`;
    },

    textRepeat (block, blocks) {
        const text = this.generateValue(block, 'TEXT', blocks) || '""';
        const count = this.generateValue(block, 'COUNT', blocks) || '1';
        this.addDefinition([
            'String textRepeat(String str, int count) {',
            '  String result = "";',
            '  for (int i = 0; i < count; i++) {',
            '    result += str;',
            '  }',
            '  return result;',
            '}'
        ].join('\n'));
        return `textRepeat(String(${text}), ${count})`;
    },

    textToAscii (block, blocks) {
        const char = this.generateValue(block, 'CHAR', blocks) || '"A"';
        return `(int)String(${char}).charAt(0)`;
    },

    textFromAscii (block, blocks) {
        const code = this.generateValue(block, 'CODE', blocks) || '65';
        return `String((char)(${code}))`;
    },

    // ============================================
    // Array operations (using SimpleArray<T>)
    // ============================================

    // Ensure the SimpleArray runtime template is included.
    // Called internally by array generators.
    _ensureArrayRuntime () {
        if (!this.generators) return;
        if (this._arrayRuntimeEnsured) return;
        this._arrayRuntimeEnsured = true;
        const runtime = `// Simple dynamic array template for Arduino
template<typename T>
class SimpleArray {
private:
  T* data;
  int capacity;
  int count;
  void resize(int newCap) {
    T* newData = new T[newCap];
    for (int i = 0; i < count; i++) newData[i] = data[i];
    delete[] data;
    data = newData;
    capacity = newCap;
  }
public:
  SimpleArray(int cap = 10) : capacity(cap), count(0) { data = new T[capacity]; }
  ~SimpleArray() { delete[] data; }
  int length() { return count; }
  int size() { return count; }
  T get(int index) { if (index >= 0 && index < count) return data[index]; return T(); }
  void set(int index, T value) { if (index >= 0 && index < count) data[index] = value; }
  void push(T value) { if (count >= capacity) resize(capacity * 2); data[count++] = value; }
  T pop() { if (count > 0) return data[--count]; return T(); }
  void insert(int index, T value) {
    if (index < 0 || index > count) return;
    if (count >= capacity) resize(capacity * 2);
    for (int i = count; i > index; i--) data[i] = data[i-1];
    data[index] = value;
    count++;
  }
  void remove(int index) {
    if (index < 0 || index >= count) return;
    for (int i = index; i < count - 1; i++) data[i] = data[i+1];
    count--;
  }
  int indexOf(T value) {
    for (int i = 0; i < count; i++) if (data[i] == value) return i;
    return -1;
  }
  bool contains(T value) { return indexOf(value) != -1; }
  void clear() { count = 0; }
  void reverse() {
    for (int i = 0; i < count / 2; i++) {
      T temp = data[i];
      data[i] = data[count - 1 - i];
      data[count - 1 - i] = temp;
    }
  }
};`;
        this.addDefinition(runtime);
    },

    // Declare array with size (old: arduino_arrays_arrayDeclare)
    arrayDeclare (block, blocks) {
        if (this.generators && this.generators._ensureArrayRuntime) {
            this.generators._ensureArrayRuntime.call(this);
        }
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const type = this.getFieldValue(block, 'TYPE') || 'int';
        const size = this.generateValue(block, 'SIZE', blocks) || '10';
        const safeName = this.sanitizeVarName(name);
        this.addGlobalVar(safeName, `SimpleArray<${type}>`, `(${size})`);
        return '';
    },

    // Declare array with initial values (old: arduino_arrays_arrayDeclareWithValues)
    arrayDeclareWithValues (block, blocks) {
        if (this.generators && this.generators._ensureArrayRuntime) {
            this.generators._ensureArrayRuntime.call(this);
        }
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const type = this.getFieldValue(block, 'TYPE') || 'int';
        const values = this.generateValue(block, 'VALUES', blocks) || '';
        const safeName = this.sanitizeVarName(name);
        this.addGlobalVar(safeName, `SimpleArray<${type}>`, '(10)');
        let code = '';
        if (values) {
            const cleanValues = String(values).replace(/^["']|["']$/g, '');
            const valueList = cleanValues.split(',');
            for (let i = 0; i < valueList.length; i++) {
                const val = valueList[i].trim();
                if (val) {
                    code += `${safeName}.push(${val});\n`;
                }
            }
        }
        return code;
    },

    // Get array element (old: arduino_arrays_arrayGet)
    arrayGet (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.get(${index})`;
    },

    // Set array element (old: arduino_arrays_arraySet)
    arraySet (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.set(${index}, ${value});\n`;
    },

    // Array length (old: arduino_arrays_arrayLength)
    arrayLength (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.length()`;
    },

    // Push to array (old: arduino_arrays_arrayPush)
    arrayPush (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.push(${value});\n`;
    },

    // Pop from array (old: arduino_arrays_arrayPop)
    arrayPop (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.pop()`;
    },

    // Insert into array (old: arduino_arrays_arrayInsert)
    arrayInsert (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.insert(${index}, ${value});\n`;
    },

    // Remove from array (old: arduino_arrays_arrayRemove)
    arrayRemove (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const index = this.generateValue(block, 'INDEX', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.remove(${index});\n`;
    },

    // Index of value in array (old: arduino_arrays_arrayIndexOf)
    arrayIndexOf (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.indexOf(${value})`;
    },

    // Array contains value (old: arduino_arrays_arrayContains)
    arrayContains (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.contains(${value})`;
    },

    // Clear array (old: arduino_arrays_arrayClear)
    arrayClear (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.clear();\n`;
    },

    // Reverse array (old: arduino_arrays_arrayReverse)
    arrayReverse (block, blocks) {
        const name = this.getFieldValue(block, 'NAME') || 'miArreglo';
        const safeName = this.sanitizeVarName(name);
        return `${safeName}.reverse();\n`;
    },

    // ============================================
    // Advanced EEPROM blocks
    // ============================================
    eepromWrite (block, blocks) {
        this.addInclude('EEPROM.h');
        const address = this.generateValue(block, 'ADDRESS', blocks) || '0';
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return `EEPROM.write(${address}, ${value});\n`;
    },

    eepromRead (block, blocks) {
        this.addInclude('EEPROM.h');
        const address = this.generateValue(block, 'ADDRESS', blocks) || '0';
        return `EEPROM.read(${address})`;
    },

    delayMicros (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks) || '1000';
        return `delayMicroseconds(${value});\n`;
    },

    getMicros (block, blocks) {
        return 'micros()';
    },

    // ============================================
    // I2C blocks
    // ============================================
    i2cBegin (block, blocks) {
        this.addInclude('Wire.h');
        return 'Wire.begin();\n';
    },

    i2cEndTransmission (block, blocks) {
        return 'Wire.endTransmission();\n';
    },

    i2cWrite (block, blocks) {
        const address = this.generateValue(block, 'ADDRESS', blocks) || '0';
        const data = this.generateValue(block, 'DATA', blocks) || '0';
        let code = '';
        code += `Wire.beginTransmission(${address});\n`;
        code += `Wire.write(${data});\n`;
        code += 'Wire.endTransmission();\n';
        return code;
    },

    i2cWriteString (block, blocks) {
        const address = this.generateValue(block, 'ADDRESS', blocks) || '0';
        const data = this.generateValue(block, 'DATA', blocks) || '""';
        let code = '';
        code += `Wire.beginTransmission(${address});\n`;
        code += `Wire.write(${data}.c_str());\n`;
        code += 'Wire.endTransmission();\n';
        return code;
    },

    // ============================================
    // Math blocks (old: arduino_math_*)
    // ============================================
    arduino_pow (block, blocks) {
        const base = this.generateValue(block, 'BASE', blocks) || '0';
        const exp = this.generateValue(block, 'EXP', blocks) || '0';
        return `pow(${base}, ${exp})`;
    },

    arduino_sqrt (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return `sqrt(${value})`;
    },

    arduino_abs (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return `abs(${value})`;
    },

    arduino_round (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return `round(${value})`;
    },

    arduino_random (block, blocks) {
        const low = this.generateValue(block, 'LOW', blocks) || '0';
        const high = this.generateValue(block, 'HIGH', blocks) || '100';
        return `random(${low}, ${high} + 1)`;
    },

    arduino_randomSeed (block, blocks) {
        const value = this.generateValue(block, 'VALUE', blocks) || '0';
        return `randomSeed(${value});\n`;
    },

    // ============================================
    // Display blocks (stubs for compatibility)
    // ============================================
    displayShowImage (block, blocks) {
        return '// Display show image - not implemented\n';
    },

    displayShowImageUntil (block, blocks) {
        return '// Display show image until - not implemented\n';
    },

    displayClear (block, blocks) {
        return '// Display clear - not implemented\n';
    },

    // ============================================
    // Operator boolean blocks
    // ============================================
    operator_boolean_true (block, blocks) {
        return 'true';
    },

    operator_boolean_false (block, blocks) {
        return 'false';
    }
};
