/* Generators for the shared device extension catalog. Configuration used by
 * global C++ objects must be literal; invalid/dynamic configuration is reported,
 * never silently replaced with a different physical pin. */
const value = (g, b, bs, name, fallback = '0') =>
    (b.inputs && b.inputs[name]) || (b.fields && b.fields[name]) ?
        String(g.generateValue(b, name, bs)) : String(fallback);
const literal = (g, b, bs, name, fallback) => {
    const result = value(g, b, bs, name, fallback).replace(/^"(.*)"$/, '$1');
    if (!/^(?:0x[\da-f]+|\d+|A\d+)$/i.test(result)) throw new Error(`${name} requiere un pin o numero constante`);
    return result;
};
const field = (g, b, name, fallback) => g.getFieldValue(b, name) || fallback;
const object = (g, name, type, args, headers) => {
    headers.forEach(header => g.addInclude(header));
    g.addDefinition(name, `${type} ${name}${args ? `(${args})` : ''};\n`);
    return name;
};
const requireConfig = (g, key, b) => {
    if (!g.definitions.has(key)) throw new Error(`agrega el bloque de inicializacion antes de ${b.opcode}`);
    return key;
};
const configuredObject = (g, name, type, args, headers) => {
    const declaration = `${type} ${name}(${args});\n`;
    if (g.definitions.has(name) && g.definitions.get(name) !== declaration) throw new Error(`configuraciones incompatibles para ${name}`);
    object(g, name, type, args, headers);
    return name;
};
const pinRead = (analog, activeLow = false) => function (b, bs) {
    const pin = value(this, b, bs, 'PIN').replace(/^"(A\d+|\d+)"$/, '$1');
    if (!analog) this.addSetupCode(`pinMode(${pin}, ${activeLow ? 'INPUT_PULLUP' : 'INPUT'});`);
    return analog ? `analogRead(${pin})` : `(digitalRead(${pin}) == ${activeLow ? 'LOW' : 'HIGH'})`;
};
const dht = method => function (b, bs) {
    const pin = literal(this, b, bs, 'PIN', '2');
    const type = field(this, b, 'TYPE', 'DHT11');
    if (!['DHT11', 'DHT22'].includes(type)) throw new Error('tipo DHT no valido');
    const name = configuredObject(this, `stbx_dht_${pin}`, 'DHT', `${pin}, ${type}`, ['DHT.h']);
    this.addSetupCode(`${name}.begin();`);
    return `${name}.${method}()`;
};
const apds = (method, type) => function () {
    object(this, 'stbx_apds', 'SparkFun_APDS9960', '', ['Wire.h', 'SparkFun_APDS9960.h']);
    this.addSetupCode('Wire.begin();');
    this.addSetupCode('stbx_apds.init();');
    this.addSetupCode('stbx_apds.enableLightSensor(false);');
    this.addSetupCode('stbx_apds.enableProximitySensor(false);');
    if (method === 'readGesture') {
        this.addSetupCode('stbx_apds.enableGestureSensor(false);');
        return '(stbx_apds.isGestureAvailable() ? stbx_apds.readGesture() : 0)';
    }
    this.addFunction(`stbx_${method}`, `int stbx_${method}() { ${type} value = 0; return stbx_apds.${method}(value) ? value : -1; }`);
    return `stbx_${method}()`;
};
const ir = (g, b, bs) => {
    const pin = literal(g, b, bs, 'PIN', '11');
    const config = `// IR pin ${pin}\n`;
    if (g.definitions.has('stbx_ir_pin') && g.definitions.get('stbx_ir_pin') !== config) throw new Error('IRremote admite un receptor a la vez');
    g.addDefinition('stbx_ir_pin', config);
    g.addInclude('IRremote.h');
    g.addSetupCode(`IrReceiver.begin(${pin});`);
    g.addDefinition('stbx_ir_cache', 'bool stbx_ir_pending = false;\nunsigned long stbx_ir_code = 0;\n');
    g.addFunction('stbx_ir_poll', 'bool stbx_ir_poll() { if (!stbx_ir_pending && IrReceiver.decode()) { stbx_ir_code = (unsigned long)IrReceiver.decodedIRData.decodedRawData; stbx_ir_pending = true; IrReceiver.resume(); } return stbx_ir_pending; }');
    g.addFunction('stbx_ir_read', 'unsigned long stbx_ir_read() { if (!stbx_ir_poll()) return 0; stbx_ir_pending = false; return stbx_ir_code; }');
};
const encoder = (g, b, bs) => {
    const clk = literal(g,b,bs,'CLK','2'), dt = literal(g,b,bs,'DT','3');
    return object(g, `stbx_encoder_${clk}_${dt}`, 'Encoder', `${clk}, ${dt}`, ['Encoder.h']);
};
const motor = direction => function (b, bs) {
    const p1 = value(this,b,bs,'IN1'), p2 = value(this,b,bs,'IN2');
    const speed = value(this,b,bs,'SPEED','255');
    this.addSetupCode(`pinMode(${p1}, OUTPUT);`);
    this.addSetupCode(`pinMode(${p2}, OUTPUT);`);
    if (!direction) return `digitalWrite(${p1}, LOW);\ndigitalWrite(${p2}, LOW);\n`;
    return `digitalWrite(${direction > 0 ? p2 : p1}, LOW);\nanalogWrite(${direction > 0 ? p1 : p2}, constrain(${speed}, 0, 255));\n`;
};
const relay = state => function (b,bs) {
    const pin = value(this,b,bs,'PIN');
    this.addSetupCode(`pinMode(${pin}, OUTPUT);`);
    const active = field(this,b,'ACTIVE','HIGH') === 'LOW' ? 'LOW' : 'HIGH';
    return `digitalWrite(${pin}, ${state ? active : active === 'HIGH' ? 'LOW' : 'HIGH'});\n`;
};
const bt = (g,b,bs) => {
    const rx = literal(g,b,bs,'RX','10'), tx = literal(g,b,bs,'TX','11');
    const name = object(g,`stbx_bt_${rx}_${tx}`,'SoftwareSerial',`${rx}, ${tx}`,['SoftwareSerial.h']);
    g.addSetupCode(`${name}.begin(9600);`);
    return name;
};
const rfid = g => {
    requireConfig(g, 'stbx_rfid', {opcode:'RFID'});
    g.addDefinition('stbx_rfid_cache', 'bool stbx_rfid_pending = false;\n');
    g.addFunction('stbx_rfid_poll', 'bool stbx_rfid_poll() { if (!stbx_rfid_pending) stbx_rfid_pending = stbx_rfid.PICC_IsNewCardPresent() && stbx_rfid.PICC_ReadCardSerial(); return stbx_rfid_pending; }');
    g.addFunction('stbx_rfid_uid', 'String stbx_rfid_uid() { if (!stbx_rfid_poll()) return ""; String result; for (byte i=0; i<stbx_rfid.uid.size; i++) { if (stbx_rfid.uid.uidByte[i]<16) result += "0"; result += String(stbx_rfid.uid.uidByte[i], HEX); } result.toUpperCase(); stbx_rfid.PICC_HaltA(); stbx_rfid.PCD_StopCrypto1(); stbx_rfid_pending=false; return result; }');
};
const keypad = g => {
    requireConfig(g, 'stbx_keypad', {opcode:'teclado'});
    g.addDefinition('stbx_key_cache', "char stbx_key_pending = 0;\n");
    g.addFunction('stbx_key_poll', "bool stbx_key_poll() { if (!stbx_key_pending) stbx_key_pending=stbx_keypad.getKey(); return stbx_key_pending != 0; }");
    g.addFunction('stbx_key_read', 'String stbx_key_read() { if (!stbx_key_poll()) return ""; char key=stbx_key_pending; stbx_key_pending=0; return String(key); }');
};
const gen = {
    dht_dht_readTemperature: dht('readTemperature'),
    dht_dht_readHumidity: dht('readHumidity'),
    ds18b20_ds18b20_readTemperature (b,bs) {
        const pin = literal(this,b,bs,'PIN','2');
        object(this,`stbx_wire_${pin}`,'OneWire',pin,['OneWire.h','DallasTemperature.h']);
        const name=object(this,`stbx_ds_${pin}`,'DallasTemperature',`&stbx_wire_${pin}`,[]);
        this.addSetupCode(`${name}.begin();`);
        this.addFunction(`${name}_read`, `float ${name}_read() { ${name}.requestTemperatures(); return ${name}.getTempCByIndex(0); }`);
        return `${name}_read()`;
    },
    apds9960_apds9960_readGesture: apds('readGesture'),
    apds9960_apds9960_readProximity: apds('readProximity','uint8_t'),
    apds9960_apds9960_readColorRed: apds('readRedLight','uint16_t'),
    apds9960_apds9960_readColorGreen: apds('readGreenLight','uint16_t'),
    apds9960_apds9960_readColorBlue: apds('readBlueLight','uint16_t'),
    ir_receiver_ir_readCode (b,bs) { ir(this,b,bs); return 'stbx_ir_read()'; },
    ir_receiver_ir_available (b,bs) { ir(this,b,bs); return 'stbx_ir_poll()'; },
    pir_pir_detected: pinRead(false),
    ldr_ldr_readValue: pinRead(true),
    joystick_joystick_readX: pinRead(true),
    joystick_joystick_readY: pinRead(true),
    joystick_joystick_button: pinRead(false,true),
    rotary_encoder_encoder_readPosition (b,bs) { return `${encoder(this,b,bs)}.read()`; },
    rotary_encoder_encoder_resetPosition (b,bs) { return `${encoder(this,b,bs)}.write(0);\n`; },
    servo_servo_setAngle (b,bs) {
        const pin=literal(this,b,bs,'PIN','9');
        const header=this.deviceProfile && /esp32/i.test(this.deviceProfile.deviceId) ? 'ESP32Servo.h' : 'Servo.h';
        const name=object(this,`stbx_servo_${pin}`,'Servo','',[header]);
        this.addSetupCode(`${name}.attach(${pin});`);
        return `${name}.write(constrain(${value(this,b,bs,'ANGLE','90')}, 0, 180));\n`;
    },
    dc_motor_motor_forward: motor(1), dc_motor_motor_backward: motor(-1), dc_motor_motor_stop: motor(0),
    stepper_stepper_init (b,bs) {
        const args=['REV','P1','P2','P3','P4'].map((key,i)=>literal(this,b,bs,key,[200,8,9,10,11][i]));
        configuredObject(this,'stbx_stepper','Stepper',args.join(', '),['Stepper.h']);
        return '';
    },
    stepper_stepper_move (b,bs) {
        requireConfig(this,'stbx_stepper',b);
        return `stbx_stepper.setSpeed(max(1L, (long)(${value(this,b,bs,'SPEED','60')})));\nstbx_stepper.step(${value(this,b,bs,'STEPS','100')});\n`;
    },
    buzzer_buzzer_tone (b,bs) { return `tone(${value(this,b,bs,'PIN')}, ${value(this,b,bs,'FREQ')}, ${value(this,b,bs,'DURATION')});\n`; },
    buzzer_buzzer_noTone (b,bs) { return `noTone(${value(this,b,bs,'PIN')});\n`; },
    relay_relay_on: relay(true), relay_relay_off: relay(false),
    neopixel_neopixel_init (b,bs) {
        configuredObject(this,'stbx_pixels','Adafruit_NeoPixel',`${literal(this,b,bs,'NUM',8)}, ${literal(this,b,bs,'PIN',6)}, NEO_GRB + NEO_KHZ800`,['Adafruit_NeoPixel.h']);
        return 'stbx_pixels.begin();\nstbx_pixels.clear();\nstbx_pixels.show();\n';
    },
    neopixel_neopixel_setColor (b,bs) {
        requireConfig(this,'stbx_pixels',b);
        return `stbx_pixels.setPixelColor(${value(this,b,bs,'INDEX')}, stbx_pixels.Color(${['R','G','B'].map(k=>`constrain(${value(this,b,bs,k)}, 0, 255)`).join(', ')}));\n`;
    },
    neopixel_neopixel_show (b) { requireConfig(this,'stbx_pixels',b); return 'stbx_pixels.show();\n'; },
    neopixel_neopixel_clear (b) { requireConfig(this,'stbx_pixels',b); return 'stbx_pixels.clear();\nstbx_pixels.show();\n'; },
    lcd_i2c_lcd_init (b,bs) {
        configuredObject(this,'stbx_lcd','LiquidCrystal_I2C',['ADDR','COLS','ROWS'].map((k,i)=>literal(this,b,bs,k,['0x27',16,2][i])).join(', '),['Wire.h','LiquidCrystal_I2C.h']);
        return 'stbx_lcd.init();\nstbx_lcd.backlight();\n';
    },
    lcd_i2c_lcd_print (b,bs) { requireConfig(this,'stbx_lcd',b); return `stbx_lcd.print(${value(this,b,bs,'TEXT','""')});\n`; },
    lcd_i2c_lcd_setCursor (b,bs) { requireConfig(this,'stbx_lcd',b); return `stbx_lcd.setCursor(${value(this,b,bs,'COL')}, ${value(this,b,bs,'ROW')});\n`; },
    lcd_i2c_lcd_clear (b) { requireConfig(this,'stbx_lcd',b); return 'stbx_lcd.clear();\n'; },
    lcd_i2c_lcd_backlight (b) { requireConfig(this,'stbx_lcd',b); return `stbx_lcd.${field(this,b,'STATE','encender') === 'apagar' ? 'noBacklight' : 'backlight'}();\n`; },
    oled_oled_init (b,bs) {
        configuredObject(this,'stbx_oled','Adafruit_SSD1306',`${literal(this,b,bs,'WIDTH',128)}, ${literal(this,b,bs,'HEIGHT',64)}, &Wire, -1`,['Wire.h','Adafruit_GFX.h','Adafruit_SSD1306.h']);
        return `stbx_oled.begin(SSD1306_SWITCHCAPVCC, ${literal(this,b,bs,'ADDR','0x3C')});\nstbx_oled.clearDisplay();\nstbx_oled.setTextColor(SSD1306_WHITE);\n`;
    },
    oled_oled_print (b,bs) { requireConfig(this,'stbx_oled',b); return `stbx_oled.setCursor(${value(this,b,bs,'X')}, ${value(this,b,bs,'Y')});\nstbx_oled.setTextSize(${value(this,b,bs,'SIZE',1)});\nstbx_oled.print(${value(this,b,bs,'TEXT','""')});\n`; },
    oled_oled_clear (b) { requireConfig(this,'stbx_oled',b); return 'stbx_oled.clearDisplay();\n'; },
    oled_oled_display (b) { requireConfig(this,'stbx_oled',b); return 'stbx_oled.display();\n'; },
    tm1637_tm1637_showNumber (b,bs) {
        configuredObject(this,'stbx_tm','TM1637Display',`${literal(this,b,bs,'CLK',2)}, ${literal(this,b,bs,'DIO',3)}`,['TM1637Display.h']);
        this.addSetupCode('stbx_tm.setBrightness(7);');
        return `stbx_tm.showNumberDec(${value(this,b,bs,'NUM')});\n`;
    },
    tm1637_tm1637_setBrightness (b,bs) { requireConfig(this,'stbx_tm',b); return `stbx_tm.setBrightness(constrain(${value(this,b,bs,'LEVEL',7)}, 0, 7));\n`; },
    tm1637_tm1637_clear (b) { requireConfig(this,'stbx_tm',b); return 'stbx_tm.clear();\n'; },
    bluetooth_hc05_bt_available (b,bs) { return `(${bt(this,b,bs)}.available() > 0)`; },
    bluetooth_hc05_bt_read (b,bs) { return `${bt(this,b,bs)}.read()`; },
    bluetooth_hc05_bt_send (b,bs) { return `${bt(this,b,bs)}.print(${value(this,b,bs,'TEXT','""')});\n`; },
    rfid_rfid_init (b,bs) {
        configuredObject(this,'stbx_rfid','MFRC522',`${literal(this,b,bs,'SS',10)}, ${literal(this,b,bs,'RST',9)}`,['SPI.h','MFRC522.h']);
        return 'SPI.begin();\nstbx_rfid.PCD_Init();\n';
    },
    rfid_rfid_cardPresent () { rfid(this); return 'stbx_rfid_poll()'; },
    rfid_rfid_readUID () { rfid(this); return 'stbx_rfid_uid()'; },
    sd_card_sd_init (b,bs) { this.addInclude('SD.h'); this.addInclude('SPI.h'); return `SD.begin(${value(this,b,bs,'PIN',10)})`; },
    sd_card_sd_writeFile (b,bs) {
        this.addInclude('SD.h');
        return `{ File file = SD.open(String(${value(this,b,bs,'FILE','"data.txt"')}).c_str(), FILE_WRITE); if (file) { file.print(${value(this,b,bs,'TEXT','""')}); file.close(); } }\n`;
    },
    sd_card_sd_readFile (b,bs) {
        this.addInclude('SD.h');
        this.addFunction('stbx_sd_read', 'String stbx_sd_read(String name) { File file = SD.open(name.c_str(), FILE_READ); String result; if (file) { while(file.available()) result += (char)file.read(); file.close(); } return result; }');
        return `stbx_sd_read(String(${value(this,b,bs,'FILE','"data.txt"')}))`;
    },
    keypad_keypad_init (b,bs) {
        const rows=['R1','R2','R3','R4'].map((k,i)=>literal(this,b,bs,k,i+2));
        const cols=['C1','C2','C3','C4'].map((k,i)=>literal(this,b,bs,k,i+6));
        this.addDefinition('stbx_keymap', `char stbx_keys[4][4]={{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};\nbyte stbx_rows[4]={${rows}};\nbyte stbx_cols[4]={${cols}};\n`);
        configuredObject(this,'stbx_keypad','Keypad','makeKeymap(stbx_keys), stbx_rows, stbx_cols, 4, 4',['Keypad.h']);
        return '';
    },
    keypad_keypad_getKey () { keypad(this); return 'stbx_key_read()'; },
    keypad_keypad_keyPressed () { keypad(this); return 'stbx_key_poll()'; },
    stbV2Ultra_objectDetected (b,bs) {
        const distance=this.generators.stbV2Ultra_readDistCm.call(this,b,bs);
        this.addFunction('stbx_distance_detected','bool stbx_distance_detected(float distance, float maximum) { return distance > 0 && distance <= maximum; }');
        return `stbx_distance_detected(${distance}, ${value(this,b,bs,'MAX',50)})`;
    }
};
for (const [opcode, method, keys] of [
    ['oled_drawLine','drawLine',['X1','Y1','X2','Y2']],
    ['oled_drawRect','drawRect',['X','Y','W','H']],
    ['oled_drawCircle','drawCircle',['X','Y','R']]
]) gen[`oled_${opcode}`] = function (b,bs) {
    requireConfig(this,'stbx_oled',b);
    const draw=field(this,b,'FILL','no') === 'si' ? method.replace('draw','fill') : method;
    return `stbx_oled.${draw}(${keys.map(k=>value(this,b,bs,k)).join(', ')}, SSD1306_WHITE);\n`;
};
for (const [opcode,method] of Object.entries({Hour:'hour',Minute:'minute',Second:'second',Day:'day',Month:'month',Year:'year'})) {
    gen[`rtc_ds1307_rtc_get${opcode}`]=function () {
        object(this,'stbx_rtc','RTC_DS1307','',['Wire.h','RTClib.h']);
        this.addSetupCode('stbx_rtc.begin();');
        return `stbx_rtc.now().${method}()`;
    };
}
module.exports = gen;
