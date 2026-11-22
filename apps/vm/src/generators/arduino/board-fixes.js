const read = (g,b,bs,key,defaultValue='0') => String(
    b.fields && b.fields[key] ? g.getFieldValue(b,key) : b.inputs && b.inputs[key] ? g.generateValue(b,key,bs) : defaultValue);
const pwm = function (b,bs) { return `analogWrite(${read(this,b,bs,'PIN')}, ${read(this,b,bs,'OUT')});\n`; };
const interrupt = function (b,bs) {
    const pin=read(this,b,bs,'PIN');
    const mode=read(this,b,bs,'MODE','RISING');
    if (!['RISING','FALLING','CHANGE','LOW','HIGH'].includes(mode)) throw new Error('modo de interrupcion no valido');
    const name=`stb_isr_${String(b.id || pin).replace(/\W/g,'_')}`;
    const body=b.inputs && b.inputs.SUBSTACK && b.inputs.SUBSTACK.block;
    // Defer the user stack to loop(): delay/serial/I2C are not ISR-safe.
    this.addDefinition(name, `volatile bool ${name}_pending = false;\n#if defined(ESP32) || defined(ESP8266)\nvoid IRAM_ATTR ${name}() { ${name}_pending=true; }\n#else\nvoid ${name}() { ${name}_pending=true; }\n#endif\n`);
    const code=body ? this.generateStack(body,bs) : '';
    this.addLoopCode(`noInterrupts();\nbool ${name}_run = ${name}_pending;\n${name}_pending = false;\ninterrupts();\nif (${name}_run) {\n${code}}\n`);
    return `attachInterrupt(digitalPinToInterrupt(${pin}), ${name}, ${mode});\n`;
};
module.exports = {
    arduino_serial_serialReadAByte () { return 'Serial.read()'; },
    arduino_pin_esp32SetPwmOutput: pwm,
    arduino_pin_k210SetPwmOutput: pwm,
    arduino_pin_esp32SetDACOutput (b,bs) { return `dacWrite(${read(this,b,bs,'PIN')}, ${read(this,b,bs,'OUT')});\n`; },
    arduino_pin_esp32ReadTouchPin (b,bs) { return `touchRead(${read(this,b,bs,'PIN')})`; },
    arduino_pin_esp32SetServoOutput (b,bs) {
        this.addInclude('ESP32Servo.h');
        const pin=read(this,b,bs,'PIN');
        if (!/^\d+$/.test(pin)) throw new Error('el pin del servo debe ser constante');
        this.addGlobalVar(`espServo_${pin}`,'Servo');
        this.addSetupCode(`espServo_${pin}.attach(${pin});`);
        return `espServo_${pin}.write(${read(this,b,bs,'OUT','90')});\n`;
    },
    arduino_pin_esp32AttachInterrupt: interrupt,
    arduino_pin_esp8266AttachInterrupt: interrupt,
    arduino_pin_esp32DetachInterrupt (b,bs) { return `detachInterrupt(digitalPinToInterrupt(${read(this,b,bs,'PIN')}));\n`; },
    arduino_serial_k210MultiSerialBegin (b,bs) {
        const port=read(this,b,bs,'NO');
        if (!/^[0-3]$/.test(port)) throw new Error('puerto serie K210 no valido');
        return `Serial${port === '0' ? '' : port}.begin(${read(this,b,bs,'BAUD','115200')}, ${read(this,b,bs,'RX_PIN','4')}, ${read(this,b,bs,'TX_PIN','5')});\n`;
    },
    arduino_serial_raspberryPiPicoMultiSerialBegin (b,bs) {
        const port=read(this,b,bs,'NO');
        if (!/^[0-2]$/.test(port)) throw new Error('puerto serie Pico no valido');
        return `Serial${port === '0' ? '' : port}.begin(${read(this,b,bs,'VALUE','9600')});\n`;
    }
};
