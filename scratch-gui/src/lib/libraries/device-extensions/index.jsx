/**
 * Extensiones de Dispositivo para STBlock
 *
 * Estas extensiones agregan bloques específicos para sensores y actuadores
 * cuando se está en modo dispositivo (Arduino, ESP32, etc.)
 */

import React from 'react';
import {getIconForExtension} from '../../device-extension-icons';

// Definición de categorías de extensiones
const EXTENSION_CATEGORIES = {
    sensors: 'Sensores',
    actuators: 'Actuadores',
    display: 'Pantallas',
    communication: 'Comunicación',
    other: 'Otros'
};

/**
 * Lista de extensiones de dispositivo disponibles
 */
const deviceExtensions = [
    // ==================== SENSORES ====================
    {
        extensionId: 'ultrasonic',
        name: 'Sensor Ultrasónico',
        description: 'Mide distancias usando ondas ultrasónicas (HC-SR04).',
        category: 'sensors',
        iconURL: null, // Se usará icono genérico
        tags: ['arduino', 'esp32', 'distance', 'hcsr04'],
        featured: true,
        library: 'NewPing', // Librería Arduino requerida
        blocks: [
            {
                opcode: 'ultrasonic_readDistance',
                blockType: 'reporter',
                text: 'distancia ultrasónico trig [TRIG] echo [ECHO]',
                arguments: {
                    TRIG: { type: 'number', defaultValue: 9 },
                    ECHO: { type: 'number', defaultValue: 10 }
                }
            }
        ],
        // Código Arduino para inicialización
        setupCode: '',
        // Includes necesarios
        includes: []
    },
    // ==================== STBoard V2 ULTRASÓNICO (Puertos) ====================
    {
        extensionId: 'stbV2Ultra',
        name: 'Ultrasónico STBoard V2',
        description: 'Sensor ultrasónico HC-SR04 para STBoard V2 mediante puertos digitales.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'stbboardv2', 'distance', 'hcsr04', 'ultrasonic'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'readDistCm',
                blockType: 'reporter',
                text: 'distancia ultrasonido puerto [PORT] cm',
                arguments: {
                    PORT: { type: 'number', defaultValue: 2 }
                }
            },
            {
                opcode: 'readDistInch',
                blockType: 'reporter',
                text: 'distancia ultrasonido puerto [PORT] pulgadas',
                arguments: {
                    PORT: { type: 'number', defaultValue: 2 }
                }
            },
            {
                opcode: 'objectDetected',
                blockType: 'boolean',
                text: 'objeto detectado? puerto [PORT] max [MAX] cm',
                arguments: {
                    PORT: { type: 'number', defaultValue: 2 },
                    MAX: { type: 'number', defaultValue: 50 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'dht',
        name: 'Sensor DHT11/DHT22',
        description: 'Mide temperatura y humedad del ambiente.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'temperature', 'humidity', 'dht11', 'dht22'],
        featured: true,
        library: 'DHT',
        blocks: [
            {
                opcode: 'dht_readTemperature',
                blockType: 'reporter',
                text: 'temperatura DHT pin [PIN] tipo [TYPE]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 2 },
                    TYPE: { type: 'string', menu: ['DHT11', 'DHT22'], defaultValue: 'DHT11' }
                }
            },
            {
                opcode: 'dht_readHumidity',
                blockType: 'reporter',
                text: 'humedad DHT pin [PIN] tipo [TYPE]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 2 },
                    TYPE: { type: 'string', menu: ['DHT11', 'DHT22'], defaultValue: 'DHT11' }
                }
            }
        ],
        includes: ['DHT.h']
    },
    {
        extensionId: 'ds18b20',
        name: 'Sensor DS18B20',
        description: 'Sensor de temperatura digital de alta precisión.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'temperature', 'onewire'],
        featured: true,
        library: 'DallasTemperature',
        blocks: [
            {
                opcode: 'ds18b20_readTemperature',
                blockType: 'reporter',
                text: 'temperatura DS18B20 pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 2 }
                }
            }
        ],
        includes: ['OneWire.h', 'DallasTemperature.h']
    },
    {
        extensionId: 'apds9960',
        name: 'Sensor APDS9960',
        description: 'Sensor de gestos, proximidad y color RGB.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'gesture', 'color', 'proximity', 'i2c'],
        featured: true,
        library: 'SparkFun_APDS9960',
        blocks: [
            {
                opcode: 'apds9960_readGesture',
                blockType: 'reporter',
                text: 'gesto APDS9960'
            },
            {
                opcode: 'apds9960_readProximity',
                blockType: 'reporter',
                text: 'proximidad APDS9960'
            },
            {
                opcode: 'apds9960_readColorRed',
                blockType: 'reporter',
                text: 'color rojo APDS9960'
            },
            {
                opcode: 'apds9960_readColorGreen',
                blockType: 'reporter',
                text: 'color verde APDS9960'
            },
            {
                opcode: 'apds9960_readColorBlue',
                blockType: 'reporter',
                text: 'color azul APDS9960'
            }
        ],
        includes: ['Wire.h', 'SparkFun_APDS9960.h']
    },
    {
        extensionId: 'ir_receiver',
        name: 'Receptor Infrarrojo',
        description: 'Recibe señales de controles remotos IR.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'infrared', 'remote'],
        featured: true,
        library: 'IRremote',
        blocks: [
            {
                opcode: 'ir_readCode',
                blockType: 'reporter',
                text: 'código IR recibido pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 11 }
                }
            },
            {
                opcode: 'ir_available',
                blockType: 'boolean',
                text: 'hay señal IR? pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 11 }
                }
            }
        ],
        includes: ['IRremote.h']
    },
    {
        extensionId: 'pir',
        name: 'Sensor PIR',
        description: 'Detecta movimiento mediante infrarrojos pasivos.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'motion', 'pir'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'pir_detected',
                blockType: 'boolean',
                text: 'movimiento detectado? pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 2 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'ldr',
        name: 'Sensor de Luz (LDR)',
        description: 'Mide la intensidad de luz ambiental.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'light', 'photoresistor'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'ldr_readValue',
                blockType: 'reporter',
                text: 'valor luz LDR pin [PIN]',
                arguments: {
                    PIN: { type: 'string', defaultValue: 'A0' }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'joystick',
        name: 'Joystick Analógico',
        description: 'Lee posición X, Y y botón del joystick.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'joystick', 'analog'],
        featured: false,
        library: null,
        blocks: [
            {
                opcode: 'joystick_readX',
                blockType: 'reporter',
                text: 'joystick X pin [PIN]',
                arguments: {
                    PIN: { type: 'string', defaultValue: 'A0' }
                }
            },
            {
                opcode: 'joystick_readY',
                blockType: 'reporter',
                text: 'joystick Y pin [PIN]',
                arguments: {
                    PIN: { type: 'string', defaultValue: 'A1' }
                }
            },
            {
                opcode: 'joystick_button',
                blockType: 'boolean',
                text: 'botón joystick presionado? pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 2 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'rotary_encoder',
        name: 'Encoder Rotatorio',
        description: 'Lee posición y dirección del encoder rotatorio.',
        category: 'sensors',
        iconURL: null,
        tags: ['arduino', 'esp32', 'encoder', 'rotation'],
        featured: false,
        library: 'Encoder',
        blocks: [
            {
                opcode: 'encoder_readPosition',
                blockType: 'reporter',
                text: 'posición encoder CLK [CLK] DT [DT]',
                arguments: {
                    CLK: { type: 'number', defaultValue: 2 },
                    DT: { type: 'number', defaultValue: 3 }
                }
            },
            {
                opcode: 'encoder_resetPosition',
                blockType: 'command',
                text: 'reiniciar encoder CLK [CLK] DT [DT]',
                arguments: {
                    CLK: { type: 'number', defaultValue: 2 },
                    DT: { type: 'number', defaultValue: 3 }
                }
            }
        ],
        includes: ['Encoder.h']
    },

    // ==================== ACTUADORES ====================
    {
        extensionId: 'servo',
        name: 'Servomotor',
        description: 'Controla servomotores de 0° a 180°.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'servo', 'motor'],
        featured: true,
        library: 'Servo',
        blocks: [
            {
                opcode: 'servo_setAngle',
                blockType: 'command',
                text: 'mover servo pin [PIN] a [ANGLE]°',
                arguments: {
                    PIN: { type: 'number', defaultValue: 9 },
                    ANGLE: { type: 'number', defaultValue: 90 }
                }
            }
        ],
        includes: ['Servo.h']
    },
    {
        extensionId: 'dc_motor',
        name: 'Motor DC (L298N)',
        description: 'Controla motores DC con driver L298N.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'motor', 'l298n'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'motor_forward',
                blockType: 'command',
                text: 'motor avanzar IN1 [IN1] IN2 [IN2] velocidad [SPEED]',
                arguments: {
                    IN1: { type: 'number', defaultValue: 8 },
                    IN2: { type: 'number', defaultValue: 9 },
                    SPEED: { type: 'number', defaultValue: 255 }
                }
            },
            {
                opcode: 'motor_backward',
                blockType: 'command',
                text: 'motor retroceder IN1 [IN1] IN2 [IN2] velocidad [SPEED]',
                arguments: {
                    IN1: { type: 'number', defaultValue: 8 },
                    IN2: { type: 'number', defaultValue: 9 },
                    SPEED: { type: 'number', defaultValue: 255 }
                }
            },
            {
                opcode: 'motor_stop',
                blockType: 'command',
                text: 'motor detener IN1 [IN1] IN2 [IN2]',
                arguments: {
                    IN1: { type: 'number', defaultValue: 8 },
                    IN2: { type: 'number', defaultValue: 9 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'stepper',
        name: 'Motor a Pasos',
        description: 'Controla motores paso a paso.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'stepper', 'motor'],
        featured: false,
        library: 'Stepper',
        blocks: [
            {
                opcode: 'stepper_move',
                blockType: 'command',
                text: 'mover stepper [STEPS] pasos velocidad [SPEED]',
                arguments: {
                    STEPS: { type: 'number', defaultValue: 100 },
                    SPEED: { type: 'number', defaultValue: 60 }
                }
            }
        ],
        includes: ['Stepper.h']
    },
    {
        extensionId: 'buzzer',
        name: 'Buzzer/Zumbador',
        description: 'Reproduce tonos y melodías.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'buzzer', 'sound'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'buzzer_tone',
                blockType: 'command',
                text: 'reproducir tono pin [PIN] frecuencia [FREQ] duración [DURATION]ms',
                arguments: {
                    PIN: { type: 'number', defaultValue: 8 },
                    FREQ: { type: 'number', defaultValue: 440 },
                    DURATION: { type: 'number', defaultValue: 500 }
                }
            },
            {
                opcode: 'buzzer_noTone',
                blockType: 'command',
                text: 'detener tono pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 8 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'relay',
        name: 'Módulo Relé',
        description: 'Controla dispositivos de alto voltaje.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'relay', 'switch'],
        featured: true,
        library: null,
        blocks: [
            {
                opcode: 'relay_on',
                blockType: 'command',
                text: 'activar relé pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 7 }
                }
            },
            {
                opcode: 'relay_off',
                blockType: 'command',
                text: 'desactivar relé pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 7 }
                }
            }
        ],
        includes: []
    },
    {
        extensionId: 'neopixel',
        name: 'NeoPixel/WS2812',
        description: 'Controla tiras y anillos de LEDs RGB direccionables.',
        category: 'actuators',
        iconURL: null,
        tags: ['arduino', 'esp32', 'led', 'rgb', 'neopixel', 'ws2812'],
        featured: true,
        library: 'Adafruit_NeoPixel',
        blocks: [
            {
                opcode: 'neopixel_init',
                blockType: 'command',
                text: 'inicializar NeoPixel pin [PIN] cantidad [NUM]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 6 },
                    NUM: { type: 'number', defaultValue: 8 }
                }
            },
            {
                opcode: 'neopixel_setColor',
                blockType: 'command',
                text: 'NeoPixel LED [INDEX] color R[R] G[G] B[B]',
                arguments: {
                    INDEX: { type: 'number', defaultValue: 0 },
                    R: { type: 'number', defaultValue: 255 },
                    G: { type: 'number', defaultValue: 0 },
                    B: { type: 'number', defaultValue: 0 }
                }
            },
            {
                opcode: 'neopixel_show',
                blockType: 'command',
                text: 'actualizar NeoPixel'
            },
            {
                opcode: 'neopixel_clear',
                blockType: 'command',
                text: 'apagar todos los NeoPixel'
            }
        ],
        includes: ['Adafruit_NeoPixel.h']
    },

    // ==================== PANTALLAS ====================
    {
        extensionId: 'lcd_i2c',
        name: 'Pantalla LCD I2C',
        description: 'Pantalla LCD 16x2 o 20x4 con interfaz I2C.',
        category: 'display',
        iconURL: null,
        tags: ['arduino', 'esp32', 'lcd', 'display', 'i2c'],
        featured: true,
        library: 'LiquidCrystal_I2C',
        blocks: [
            {
                opcode: 'lcd_init',
                blockType: 'command',
                text: 'inicializar LCD I2C dirección [ADDR] columnas [COLS] filas [ROWS]',
                arguments: {
                    ADDR: { type: 'string', defaultValue: '0x27' },
                    COLS: { type: 'number', defaultValue: 16 },
                    ROWS: { type: 'number', defaultValue: 2 }
                }
            },
            {
                opcode: 'lcd_print',
                blockType: 'command',
                text: 'LCD escribir [TEXT]',
                arguments: {
                    TEXT: { type: 'string', defaultValue: 'Hola!' }
                }
            },
            {
                opcode: 'lcd_setCursor',
                blockType: 'command',
                text: 'LCD cursor en columna [COL] fila [ROW]',
                arguments: {
                    COL: { type: 'number', defaultValue: 0 },
                    ROW: { type: 'number', defaultValue: 0 }
                }
            },
            {
                opcode: 'lcd_clear',
                blockType: 'command',
                text: 'LCD limpiar pantalla'
            },
            {
                opcode: 'lcd_backlight',
                blockType: 'command',
                text: 'LCD retroiluminación [STATE]',
                arguments: {
                    STATE: { type: 'string', menu: ['encender', 'apagar'], defaultValue: 'encender' }
                }
            }
        ],
        includes: ['Wire.h', 'LiquidCrystal_I2C.h']
    },
    {
        extensionId: 'oled',
        name: 'Pantalla OLED',
        description: 'Pantalla OLED SSD1306 128x64 o 128x32.',
        category: 'display',
        iconURL: null,
        tags: ['arduino', 'esp32', 'oled', 'display', 'i2c', 'ssd1306'],
        featured: true,
        library: 'Adafruit_SSD1306',
        blocks: [
            {
                opcode: 'oled_init',
                blockType: 'command',
                text: 'inicializar OLED ancho [WIDTH] alto [HEIGHT]',
                arguments: {
                    WIDTH: { type: 'number', defaultValue: 128 },
                    HEIGHT: { type: 'number', defaultValue: 64 }
                }
            },
            {
                opcode: 'oled_print',
                blockType: 'command',
                text: 'OLED escribir [TEXT] en X[X] Y[Y] tamaño [SIZE]',
                arguments: {
                    TEXT: { type: 'string', defaultValue: 'Hola!' },
                    X: { type: 'number', defaultValue: 0 },
                    Y: { type: 'number', defaultValue: 0 },
                    SIZE: { type: 'number', defaultValue: 1 }
                }
            },
            {
                opcode: 'oled_drawLine',
                blockType: 'command',
                text: 'OLED línea de X1[X1] Y1[Y1] a X2[X2] Y2[Y2]',
                arguments: {
                    X1: { type: 'number', defaultValue: 0 },
                    Y1: { type: 'number', defaultValue: 0 },
                    X2: { type: 'number', defaultValue: 127 },
                    Y2: { type: 'number', defaultValue: 63 }
                }
            },
            {
                opcode: 'oled_drawRect',
                blockType: 'command',
                text: 'OLED rectángulo X[X] Y[Y] ancho[W] alto[H] relleno[FILL]',
                arguments: {
                    X: { type: 'number', defaultValue: 0 },
                    Y: { type: 'number', defaultValue: 0 },
                    W: { type: 'number', defaultValue: 50 },
                    H: { type: 'number', defaultValue: 30 },
                    FILL: { type: 'string', menu: ['no', 'si'], defaultValue: 'no' }
                }
            },
            {
                opcode: 'oled_drawCircle',
                blockType: 'command',
                text: 'OLED círculo X[X] Y[Y] radio[R] relleno[FILL]',
                arguments: {
                    X: { type: 'number', defaultValue: 64 },
                    Y: { type: 'number', defaultValue: 32 },
                    R: { type: 'number', defaultValue: 20 },
                    FILL: { type: 'string', menu: ['no', 'si'], defaultValue: 'no' }
                }
            },
            {
                opcode: 'oled_clear',
                blockType: 'command',
                text: 'OLED limpiar pantalla'
            },
            {
                opcode: 'oled_display',
                blockType: 'command',
                text: 'OLED actualizar pantalla'
            }
        ],
        includes: ['Wire.h', 'Adafruit_GFX.h', 'Adafruit_SSD1306.h']
    },
    {
        extensionId: 'tm1637',
        name: 'Display 7 Segmentos TM1637',
        description: 'Display de 4 dígitos de 7 segmentos.',
        category: 'display',
        iconURL: null,
        tags: ['arduino', 'esp32', 'display', '7segment', 'tm1637'],
        featured: false,
        library: 'TM1637Display',
        blocks: [
            {
                opcode: 'tm1637_showNumber',
                blockType: 'command',
                text: 'TM1637 mostrar número [NUM] CLK[CLK] DIO[DIO]',
                arguments: {
                    NUM: { type: 'number', defaultValue: 1234 },
                    CLK: { type: 'number', defaultValue: 2 },
                    DIO: { type: 'number', defaultValue: 3 }
                }
            },
            {
                opcode: 'tm1637_setBrightness',
                blockType: 'command',
                text: 'TM1637 brillo [LEVEL]',
                arguments: {
                    LEVEL: { type: 'number', defaultValue: 7 }
                }
            },
            {
                opcode: 'tm1637_clear',
                blockType: 'command',
                text: 'TM1637 limpiar'
            }
        ],
        includes: ['TM1637Display.h']
    },

    // ==================== COMUNICACIÓN ====================
    {
        extensionId: 'bluetooth_hc05',
        name: 'Bluetooth HC-05/HC-06',
        description: 'Comunicación Bluetooth serial.',
        category: 'communication',
        iconURL: null,
        tags: ['arduino', 'bluetooth', 'hc05', 'hc06', 'serial'],
        featured: true,
        library: 'SoftwareSerial',
        blocks: [
            {
                opcode: 'bt_available',
                blockType: 'boolean',
                text: 'hay datos Bluetooth? RX[RX] TX[TX]',
                arguments: {
                    RX: { type: 'number', defaultValue: 10 },
                    TX: { type: 'number', defaultValue: 11 }
                }
            },
            {
                opcode: 'bt_read',
                blockType: 'reporter',
                text: 'leer Bluetooth RX[RX] TX[TX]',
                arguments: {
                    RX: { type: 'number', defaultValue: 10 },
                    TX: { type: 'number', defaultValue: 11 }
                }
            },
            {
                opcode: 'bt_send',
                blockType: 'command',
                text: 'enviar Bluetooth [TEXT] RX[RX] TX[TX]',
                arguments: {
                    TEXT: { type: 'string', defaultValue: 'Hola' },
                    RX: { type: 'number', defaultValue: 10 },
                    TX: { type: 'number', defaultValue: 11 }
                }
            }
        ],
        includes: ['SoftwareSerial.h']
    },
    {
        extensionId: 'rfid',
        name: 'Lector RFID RC522',
        description: 'Lee tarjetas y tags RFID/NFC.',
        category: 'communication',
        iconURL: null,
        tags: ['arduino', 'esp32', 'rfid', 'nfc', 'rc522'],
        featured: true,
        library: 'MFRC522',
        blocks: [
            {
                opcode: 'rfid_cardPresent',
                blockType: 'boolean',
                text: 'tarjeta RFID presente?'
            },
            {
                opcode: 'rfid_readUID',
                blockType: 'reporter',
                text: 'leer UID de tarjeta RFID'
            }
        ],
        includes: ['SPI.h', 'MFRC522.h']
    },

    // ==================== OTROS ====================
    {
        extensionId: 'rtc_ds1307',
        name: 'Reloj RTC DS1307',
        description: 'Reloj de tiempo real con batería.',
        category: 'other',
        iconURL: null,
        tags: ['arduino', 'esp32', 'rtc', 'clock', 'time', 'ds1307'],
        featured: false,
        library: 'RTClib',
        blocks: [
            {
                opcode: 'rtc_getHour',
                blockType: 'reporter',
                text: 'hora RTC'
            },
            {
                opcode: 'rtc_getMinute',
                blockType: 'reporter',
                text: 'minuto RTC'
            },
            {
                opcode: 'rtc_getSecond',
                blockType: 'reporter',
                text: 'segundo RTC'
            },
            {
                opcode: 'rtc_getDay',
                blockType: 'reporter',
                text: 'día RTC'
            },
            {
                opcode: 'rtc_getMonth',
                blockType: 'reporter',
                text: 'mes RTC'
            },
            {
                opcode: 'rtc_getYear',
                blockType: 'reporter',
                text: 'año RTC'
            }
        ],
        includes: ['Wire.h', 'RTClib.h']
    },
    {
        extensionId: 'sd_card',
        name: 'Tarjeta SD',
        description: 'Lee y escribe archivos en tarjetas SD.',
        category: 'other',
        iconURL: null,
        tags: ['arduino', 'esp32', 'sd', 'storage', 'file'],
        featured: false,
        library: 'SD',
        blocks: [
            {
                opcode: 'sd_init',
                blockType: 'boolean',
                text: 'inicializar SD CS pin [PIN]',
                arguments: {
                    PIN: { type: 'number', defaultValue: 10 }
                }
            },
            {
                opcode: 'sd_writeFile',
                blockType: 'command',
                text: 'escribir en SD archivo [FILE] texto [TEXT]',
                arguments: {
                    FILE: { type: 'string', defaultValue: 'data.txt' },
                    TEXT: { type: 'string', defaultValue: 'Hola' }
                }
            },
            {
                opcode: 'sd_readFile',
                blockType: 'reporter',
                text: 'leer de SD archivo [FILE]',
                arguments: {
                    FILE: { type: 'string', defaultValue: 'data.txt' }
                }
            }
        ],
        includes: ['SPI.h', 'SD.h']
    },
    {
        extensionId: 'keypad',
        name: 'Teclado Matricial 4x4',
        description: 'Lee teclas de un teclado matricial.',
        category: 'other',
        iconURL: null,
        tags: ['arduino', 'esp32', 'keypad', 'input'],
        featured: false,
        library: 'Keypad',
        blocks: [
            {
                opcode: 'keypad_getKey',
                blockType: 'reporter',
                text: 'tecla presionada'
            },
            {
                opcode: 'keypad_keyPressed',
                blockType: 'boolean',
                text: 'se presionó tecla?'
            }
        ],
        includes: ['Keypad.h']
    }
];

/**
 * Obtener extensiones por categoría
 * @param {string} category - Categoría de extensión
 * @returns {Array} Lista de extensiones filtradas
 */
const getExtensionsByCategory = (category) => {
    if (!category || category === 'all') {
        return deviceExtensions;
    }
    return deviceExtensions.filter(ext => ext.category === category);
};

/**
 * Obtener extensiones destacadas
 * @returns {Array} Lista de extensiones destacadas
 */
const getFeaturedExtensions = () => {
    return deviceExtensions.filter(ext => ext.featured);
};

/**
 * Buscar extensiones por tag o nombre
 * @param {string} query - Término de búsqueda
 * @returns {Array} Lista de extensiones que coinciden
 */
const searchExtensions = (query) => {
    if (!query) return deviceExtensions;
    const lowerQuery = query.toLowerCase();
    return deviceExtensions.filter(ext =>
        ext.name.toLowerCase().includes(lowerQuery) ||
        ext.description.toLowerCase().includes(lowerQuery) ||
        ext.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
};

/**
 * Obtener extensión por ID
 * @param {string} extensionId - ID de la extensión
 * @returns {Object|null} Extensión o null si no existe
 */
const getExtensionById = (extensionId) => {
    return deviceExtensions.find(ext => ext.extensionId === extensionId) || null;
};

/**
 * Verificar si una extensión es compatible con un dispositivo
 * @param {string} extensionId - ID de la extensión
 * @param {string} deviceType - Tipo de dispositivo (arduino, esp32, etc.)
 * @returns {boolean}
 */
const isExtensionCompatible = (extensionId, deviceType) => {
    const extension = getExtensionById(extensionId);
    if (!extension) return false;
    return extension.tags.includes(deviceType) || extension.tags.includes('arduino');
};

// Auto-assign icons to all extensions
deviceExtensions.forEach(ext => {
    if (!ext.iconURL) {
        ext.iconURL = getIconForExtension(ext.extensionId);
    }
});

export {
    deviceExtensions as default,
    deviceExtensions,
    EXTENSION_CATEGORIES,
    getExtensionsByCategory,
    getFeaturedExtensions,
    searchExtensions,
    getExtensionById,
    isExtensionCompatible
};
