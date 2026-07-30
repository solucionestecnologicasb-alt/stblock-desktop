/**
 * PinManager - Sistema centralizado de gestión de pines para Gearbot
 *
 * Funcionalidades:
 * - Rastrear todos los pines en uso
 * - Validar conflictos de pines
 * - Gestionar pines por tarjeta (Arduino Uno, ESP32, Pico, etc.)
 * - Notificar cambios mediante eventos
 */

var PinManager = (function() {
  'use strict';

  // ============================================
  // DATOS DE TARJETAS - Pines disponibles por tipo
  // ============================================
  var boardData = {
    // STBlock / STBoard V2 (basado en Arduino Mega con puertos)
    stbBoardV2: {
      name: 'STBoard V2',
      category: 'stblock',
      // Sistema de puertos (cada puerto tiene pines PWM y analog integrados)
      usesPortSystem: true,
      ports: {
        // Puerto: { pwmPin (servo), analogPins, digitalPins }
        '2':  { pwm: 46, analog: ['A0','A1'], digital: ['D22','D23'] },
        '3':  { pwm: 45, analog: ['A2','A3'], digital: ['D24','D25'] },
        '4':  { pwm: 9,  analog: ['A4','A5'], digital: ['D26','D27'] },
        '5':  { pwm: 8,  analog: ['A6','A7'], digital: ['D28','D29'] },
        '7':  { pwm: 4,  analog: ['A8','A9'], digital: ['D30','D31'] },
        '8':  { pwm: 5,  analog: ['A10','A11'], digital: ['D32','D33'] },
        '9':  { pwm: 6,  analog: ['A12'], digital: ['D34','D35'] },
        '10': { pwm: 7,  analog: [], digital: ['D36','D37'] }
      },
      // Puertos de motor (comunicación UART a nodos ATmega328)
      motorPorts: {
        'A1': { node: 'A', motor: 0, description: 'Motor A1 (típico izquierdo)' },
        'A2': { node: 'A', motor: 1, description: 'Motor A2 (típico derecho)' },
        'B3': { node: 'B', motor: 0, description: 'Motor B3 (auxiliar)' },
        'B4': { node: 'B', motor: 1, description: 'Motor B4 (auxiliar)' }
      },
      // Sensores integrados en la placa (NO configurables)
      integratedSensors: {
        'gyroscope':   { name: 'Giroscopio MPU6050', protocol: 'i2c', address: '0x68', pins: { sda: 20, scl: 21 } },
        'light':       { name: 'Sensor de Luz LDR', protocol: 'analog', pin: 'A15' },
        'temperature': { name: 'Sensor Temp LM335', protocol: 'analog', pin: 'A14' },
        'microphone':  { name: 'Micrófono', protocol: 'analog', pin: 'A13' },
        'buzzer':      { name: 'Buzzer', protocol: 'pwm', pin: 12 },
        'irReceiver':  { name: 'Receptor IR', protocol: 'digital', pin: 13 },
        'irEmitter':   { name: 'Emisor IR', protocol: 'digital', pin: 44 },
        'oled':        { name: 'Pantalla OLED', protocol: 'i2c', address: '0x3C', pins: { sda: 20, scl: 21 } },
        'matrix':      { name: 'Matriz LED 8x8', protocol: 'spi', pins: { din: 51, clk: 52, cs: 53 } },
        'buttonB1':    { name: 'Botón B1', protocol: 'digital', pin: 38 },
        'buttonB2':    { name: 'Botón B2', protocol: 'digital', pin: 39 },
        'buttonB3':    { name: 'Botón B3', protocol: 'digital', pin: 40 },
        'buttonB4':    { name: 'Botón B4', protocol: 'digital', pin: 41 },
        'buttonB5':    { name: 'Botón B5', protocol: 'digital', pin: 42 },
        'buttonB6':    { name: 'Botón B6', protocol: 'digital', pin: 43 }
      },
      // Pines tradicionales (para compatibilidad)
      digitalPins: ['Puerto 2','Puerto 3','Puerto 4','Puerto 5','Puerto 7','Puerto 8','Puerto 9','Puerto 10'],
      analogPins: ['Puerto 2','Puerto 3','Puerto 4','Puerto 5','Puerto 7','Puerto 8','Puerto 9'],
      pwmPins: ['Puerto 2','Puerto 3','Puerto 4','Puerto 5','Puerto 7','Puerto 8','Puerto 9','Puerto 10'],
      i2cPins: { sda: 'D20', scl: 'D21' },
      serialPins: { rx: 'D0', tx: 'D1' },
      motorPins: ['A1','A2','B3','B4']
    },

    // Arduino Uno
    arduinoUno: {
      name: 'Arduino Uno',
      category: 'arduino',
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' },
      motorPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13']
    },

    // Arduino Nano
    arduinoNano: {
      name: 'Arduino Nano',
      category: 'arduino',
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5','A6','A7'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' },
      motorPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13']
    },

    // Arduino Mega 2560
    arduinoMega2560: {
      name: 'Arduino Mega 2560',
      category: 'arduino',
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D22','D23','D24','D25','D26','D27','D28','D29','D30','D31','D32','D33','D34','D35','D36','D37','D38','D39','D40','D41','D42','D43','D44','D45','D46','D47','D48','D49','D50','D51','D52','D53'],
      analogPins: ['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
      pwmPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D44','D45','D46'],
      i2cPins: { sda: 'D20', scl: 'D21' },
      serialPins: { rx: 'D0', tx: 'D1', rx1: 'D19', tx1: 'D18', rx2: 'D17', tx2: 'D16', rx3: 'D15', tx3: 'D14' },
      motorPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D22','D23','D24','D25','D26','D27','D28','D29','D30','D31']
    },

    // ESP32
    arduinoEsp32: {
      name: 'ESP32',
      category: 'esp32',
      digitalPins: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27','GPIO32','GPIO33'],
      analogPins: ['GPIO32','GPIO33','GPIO34','GPIO35','GPIO36','GPIO39'],
      pwmPins: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27'],
      i2cPins: { sda: 'GPIO21', scl: 'GPIO22' },
      serialPins: { rx: 'GPIO3', tx: 'GPIO1', rx2: 'GPIO16', tx2: 'GPIO17' },
      motorPins: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO23','GPIO25','GPIO26','GPIO27']
    },

    // ESP32-S3
    arduinoEsp32S3: {
      name: 'ESP32-S3',
      category: 'esp32',
      digitalPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21'],
      analogPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10'],
      pwmPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21'],
      i2cPins: { sda: 'GPIO8', scl: 'GPIO9' },
      serialPins: { rx: 'GPIO44', tx: 'GPIO43' },
      motorPins: ['GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21']
    },

    // ESP8266 NodeMCU
    arduinoEsp8266NodeMCU: {
      name: 'ESP8266 NodeMCU',
      category: 'esp8266',
      digitalPins: ['D0','D1','D2','D3','D4','D5','D6','D7','D8'],
      analogPins: ['A0'],
      pwmPins: ['D1','D2','D3','D4','D5','D6','D7','D8'],
      i2cPins: { sda: 'D2', scl: 'D1' },
      serialPins: { rx: 'D9', tx: 'D10' },
      motorPins: ['D0','D1','D2','D3','D4','D5','D6','D7','D8']
    },

    // Raspberry Pi Pico
    arduinoRaspberryPiPico: {
      name: 'Raspberry Pi Pico',
      category: 'pico',
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' },
      motorPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15']
    },

    // Raspberry Pi Pico W
    arduinoRaspberryPiPicoW: {
      name: 'Raspberry Pi Pico W',
      category: 'pico',
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' },
      motorPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15']
    },

    // Micro:bit V1
    microbit: {
      name: 'Micro:bit V1',
      category: 'microbit',
      digitalPins: ['P0','P1','P2','P8','P12','P13','P14','P15','P16'],
      analogPins: ['P0','P1','P2'],
      pwmPins: ['P0','P1','P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P0', tx: 'P1' },
      motorPins: ['P8','P12','P13','P14','P15','P16']
    },

    // Micro:bit V2
    microbitV2: {
      name: 'Micro:bit V2',
      category: 'microbit',
      digitalPins: ['P0','P1','P2','P8','P12','P13','P14','P15','P16'],
      analogPins: ['P0','P1','P2'],
      pwmPins: ['P0','P1','P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P0', tx: 'P1' },
      motorPins: ['P8','P12','P13','P14','P15','P16']
    },

    // LEGO EV3
    ev3: {
      name: 'LEGO EV3',
      category: 'lego',
      digitalPins: ['in1','in2','in3','in4'],
      analogPins: ['in1','in2','in3','in4'],
      pwmPins: ['outA','outB','outC','outD'],
      i2cPins: {},
      serialPins: {},
      motorPins: ['outA','outB','outC','outD']
    }
  };

  // ============================================
  // DEFINICIONES DE PINES POR COMPONENTE
  // ============================================
  var componentPinDefinitions = {
    // SENSORES
    'UltrasonicSensor': {
      name: 'Sensor Ultrasónico',
      realComponent: 'HC-SR04',
      protocol: 'digital',
      pins: [
        { id: 'trig', name: 'TRIG', type: 'digital', required: true, description: 'Pulso de trigger' },
        { id: 'echo', name: 'ECHO', type: 'digital', required: true, description: 'Recibe eco' }
      ]
    },
    'ColorSensor': {
      name: 'Sensor de Color',
      realComponent: 'TCS34725',
      protocol: 'i2c',
      i2cAddress: '0x29',
      i2cAddressAlt: null,  // Sin dirección alternativa
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c', required: true, description: 'Datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c', required: true, description: 'Reloj I2C' }
      ]
    },
    'TouchSensor': {
      name: 'Sensor de Contacto',
      realComponent: 'Push Button',
      protocol: 'digital',
      pins: [
        { id: 'signal', name: 'SIGNAL', type: 'digital', required: true, description: 'Señal de contacto' }
      ]
    },
    'GyroSensor': {
      name: 'Giroscopio',
      realComponent: 'MPU6050',
      protocol: 'i2c',
      i2cAddress: '0x68',
      i2cAddressAlt: '0x69',  // AD0=HIGH
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c', required: true, description: 'Datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c', required: true, description: 'Reloj I2C' }
      ]
    },
    'GPSSensor': {
      name: 'Sensor GPS',
      realComponent: 'NEO-6M',
      protocol: 'serial',
      baudRate: 9600,
      pins: [
        { id: 'rx', name: 'RX', type: 'serial', required: true, description: 'Recibe datos' },
        { id: 'tx', name: 'TX', type: 'serial', required: true, description: 'Envía comandos' }
      ]
    },
    'LaserRangeSensor': {
      name: 'Sensor Láser',
      realComponent: 'VL53L0X',
      protocol: 'i2c',
      i2cAddress: '0x29',
      i2cAddressAlt: '0x30',  // Configurable via software
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c', required: true, description: 'Datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c', required: true, description: 'Reloj I2C' }
      ]
    },
    'LineFollowerSensor': {
      name: 'Seguidor de Línea',
      realComponent: 'TCRT5000 x3',
      protocol: 'analog',
      pins: [
        { id: 'left', name: 'LEFT', type: 'analog', required: true, description: 'Sensor izquierdo' },
        { id: 'center', name: 'CENTER', type: 'analog', required: true, description: 'Sensor central' },
        { id: 'right', name: 'RIGHT', type: 'analog', required: true, description: 'Sensor derecho' }
      ]
    },
    'TemperatureSensor': {
      name: 'Sensor Temperatura',
      realComponent: 'DS18B20',
      protocol: 'onewire',
      pins: [
        { id: 'data', name: 'DATA', type: 'digital', required: true, description: 'Datos OneWire' }
      ]
    },
    'HumiditySensor': {
      name: 'Sensor Humedad',
      realComponent: 'DHT11',
      protocol: 'dht',
      pins: [
        { id: 'data', name: 'DATA', type: 'digital', required: true, description: 'Datos DHT' }
      ]
    },
    'GasSensor': {
      name: 'Sensor de Gas',
      realComponent: 'MQ-2',
      protocol: 'analog',
      pins: [
        { id: 'ao', name: 'AO', type: 'analog', required: true, description: 'Salida analógica' }
      ]
    },
    'CameraSensor': {
      name: 'Cámara',
      realComponent: 'OV7670',
      protocol: 'i2c',
      i2cAddress: '0x21',
      i2cAddressAlt: '0x42',
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c', required: true, description: 'Config I2C (SCCB)' },
        { id: 'scl', name: 'SCL', type: 'i2c', required: true, description: 'Reloj I2C (SCCB)' }
      ]
    },
    'LidarSensor': {
      name: 'LIDAR 360°',
      realComponent: 'RPLIDAR A1',
      protocol: 'serial',
      baudRate: 115200,
      pins: [
        { id: 'rx', name: 'RX', type: 'serial', required: true, description: 'Recibe datos' },
        { id: 'tx', name: 'TX', type: 'serial', required: true, description: 'Envía comandos' },
        { id: 'pwm', name: 'MOTOR', type: 'pwm', required: true, description: 'Control motor' }
      ]
    },

    // ACTUADORES
    'MagnetActuator': {
      name: 'Electroimán',
      realComponent: 'Electromagnet',
      pins: [
        { id: 'control', name: 'CTRL', type: 'digital', required: true, description: 'Encendido/Apagado' }
      ]
    },
    'Pen': {
      name: 'Lápiz',
      realComponent: 'Servo + Pen',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm', required: true, description: 'Control servo' }
      ]
    },
    'ArmActuator': {
      name: 'Brazo Articulado',
      realComponent: 'Servo MG996R',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm', required: true, description: 'Control servo' }
      ]
    },
    'SwivelActuator': {
      name: 'Base Giratoria',
      realComponent: 'Servo',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm', required: true, description: 'Control servo' }
      ]
    },
    'LinearActuator': {
      name: 'Actuador Lineal',
      realComponent: 'Linear + L298N',
      pins: [
        { id: 'dir1', name: 'DIR1', type: 'digital', required: true, description: 'Dirección 1' },
        { id: 'dir2', name: 'DIR2', type: 'digital', required: true, description: 'Dirección 2' },
        { id: 'pwm', name: 'PWM', type: 'pwm', required: true, description: 'Velocidad' }
      ]
    },

    // RUEDAS/MOTORES
    'WheelActuator': {
      name: 'Rueda Motorizada',
      realComponent: 'DC Motor + L298N',
      pins: [
        { id: 'dir1', name: 'DIR1', type: 'digital', required: true, description: 'Dirección 1' },
        { id: 'dir2', name: 'DIR2', type: 'digital', required: true, description: 'Dirección 2' },
        { id: 'pwm', name: 'PWM', type: 'pwm', required: true, description: 'Velocidad' }
      ]
    },
    'WheelDrive': {
      name: 'Rueda Motorizada',
      realComponent: 'DC Motor + L298N',
      pins: [
        { id: 'dir1', name: 'DIR1', type: 'digital', required: true, description: 'Dirección 1' },
        { id: 'dir2', name: 'DIR2', type: 'digital', required: true, description: 'Dirección 2' },
        { id: 'pwm', name: 'PWM', type: 'pwm', required: true, description: 'Velocidad' }
      ]
    }
  };

  // ============================================
  // ESTADO INTERNO
  // ============================================
  var state = {
    boardType: 'arduinoUno',
    usedPins: {},        // { 'D2': { componentId, componentType, pinRole, componentName, isI2C } }
    usedI2CAddresses: {}, // { '0x29': { componentId, componentType, componentName } }
    components: {},      // { componentId: { type, name, enabled, pins: { pinRole: pin }, i2cAddress } }
    listeners: {}        // Event listeners
  };

  // Verificar si un tipo de pin es I2C (puede compartirse)
  function isI2CPin(pinType) {
    return pinType === 'i2c';
  }

  // ============================================
  // FUNCIONES ESPECÍFICAS STBOARD V2
  // ============================================

  /**
   * Verificar si la tarjeta actual usa sistema de puertos
   */
  function usesPortSystem() {
    var board = getBoardData();
    return board && board.usesPortSystem === true;
  }

  /**
   * Obtener puertos disponibles para sensores/servos
   */
  function getAvailablePorts() {
    var board = getBoardData();
    if (!board || !board.ports) return [];

    var usedPorts = [];
    // Obtener puertos ya asignados
    for (var compId in state.components) {
      var comp = state.components[compId];
      if (comp.port) {
        usedPorts.push(String(comp.port));
      }
    }

    // Retornar puertos no usados
    return Object.keys(board.ports).filter(function(port) {
      return usedPorts.indexOf(port) === -1;
    });
  }

  /**
   * Obtener información de un puerto específico
   */
  function getPortInfo(portNumber) {
    var board = getBoardData();
    if (!board || !board.ports) return null;
    return board.ports[String(portNumber)] || null;
  }

  /**
   * Obtener puertos de motor disponibles (A1, A2, B3, B4)
   */
  function getMotorPorts() {
    var board = getBoardData();
    if (!board || !board.motorPorts) {
      // Fallback para otras tarjetas
      return board && board.motorPins ? board.motorPins : [];
    }
    return Object.keys(board.motorPorts);
  }

  /**
   * Obtener información de un puerto de motor
   */
  function getMotorPortInfo(motorPort) {
    var board = getBoardData();
    if (!board || !board.motorPorts) return null;
    return board.motorPorts[motorPort] || null;
  }

  /**
   * Verificar si un sensor es integrado en la tarjeta
   */
  function isIntegratedSensor(sensorType) {
    var board = getBoardData();
    if (!board || !board.integratedSensors) return false;

    // Mapeo de tipos de componentes a sensores integrados
    var mapping = {
      'GyroSensor': 'gyroscope',
      'TemperatureSensor': 'temperature',
      'LightSensor': 'light',
      'TouchSensor': null,  // Los botones B1-B6 son integrados pero TouchSensor puede ser externo
      'Buzzer': 'buzzer'
    };

    var integratedKey = mapping[sensorType];
    return integratedKey && board.integratedSensors[integratedKey] !== undefined;
  }

  /**
   * Obtener información de sensor integrado
   */
  function getIntegratedSensorInfo(sensorType) {
    var board = getBoardData();
    if (!board || !board.integratedSensors) return null;

    var mapping = {
      'GyroSensor': 'gyroscope',
      'TemperatureSensor': 'temperature',
      'LightSensor': 'light',
      'Buzzer': 'buzzer',
      'IRSensor': 'irReceiver'
    };

    var key = mapping[sensorType];
    return key ? board.integratedSensors[key] : null;
  }

  /**
   * Obtener todos los sensores integrados de la tarjeta actual
   */
  function getIntegratedSensors() {
    var board = getBoardData();
    if (!board || !board.integratedSensors) return {};
    return board.integratedSensors;
  }

  /**
   * Obtener definición de pines adaptada según la tarjeta
   * Para STBoard V2, convierte a sistema de puertos
   */
  function getAdaptedPinDefinition(componentType) {
    var def = componentPinDefinitions[componentType];
    if (!def) return null;

    var board = getBoardData();

    // Si es STBoard V2 y el sensor es integrado, retornar info especial
    if (board && board.integratedSensors) {
      var integratedInfo = getIntegratedSensorInfo(componentType);
      if (integratedInfo) {
        return {
          name: def.name,
          realComponent: def.realComponent || integratedInfo.name,
          protocol: integratedInfo.protocol,
          integrated: true,
          integratedInfo: integratedInfo,
          pins: [] // Sin pines configurables
        };
      }
    }

    // Si es STBoard V2 y es un motor/rueda, usar puertos de motor (A1, A2, B3, B4)
    if (board && board.motorPorts && isMotorComponent(componentType)) {
      return {
        name: def.name,
        realComponent: 'Motor UART (PID)',
        protocol: 'uart-motor',
        usesMotorPort: true,
        motorPorts: Object.keys(board.motorPorts),
        pins: [{
          id: 'motorPort',
          name: 'MOTOR',
          type: 'motor',
          required: true,
          description: 'Puerto de motor (A1, A2, B3, B4)'
        }]
      };
    }

    // Si usa sistema de puertos, adaptar definición para sensores externos
    if (board && board.usesPortSystem && def.protocol !== 'i2c' && !isMotorComponent(componentType)) {
      return {
        name: def.name,
        realComponent: def.realComponent,
        protocol: def.protocol,
        usesPort: true,
        portType: getPortTypeForComponent(componentType),
        pins: [{
          id: 'port',
          name: 'PUERTO',
          type: 'port',
          required: true,
          description: 'Puerto de conexión (2-10)'
        }]
      };
    }

    return def;
  }

  /**
   * Verificar si un tipo de componente es un motor/rueda
   */
  function isMotorComponent(componentType) {
    var motorTypes = ['WheelActuator', 'WheelDrive', 'Motor', 'LinearActuator'];
    return motorTypes.indexOf(componentType) !== -1;
  }

  /**
   * Determinar tipo de puerto requerido para un componente
   */
  function getPortTypeForComponent(componentType) {
    var def = componentPinDefinitions[componentType];
    if (!def) return 'digital';

    switch (def.protocol) {
      case 'analog':
        return 'analog';
      case 'pwm':
        return 'servo';
      case 'digital':
      case 'onewire':
      case 'dht':
        return 'digital';
      default:
        return 'digital';
    }
  }

  // ============================================
  // FUNCIONES PÚBLICAS
  // ============================================

  /**
   * Establecer tipo de tarjeta
   */
  function setBoard(boardType) {
    if (!boardData[boardType]) {
      console.warn('[PinManager] Tarjeta desconocida:', boardType, '- usando arduinoUno');
      boardType = 'arduinoUno';
    }
    state.boardType = boardType;
    emit('boardChanged', { boardType: boardType, board: boardData[boardType] });
    return boardData[boardType];
  }

  /**
   * Obtener tipo de tarjeta actual
   */
  function getBoard() {
    return state.boardType;
  }

  /**
   * Obtener datos de la tarjeta actual
   */
  function getBoardData() {
    return boardData[state.boardType] || boardData.arduinoUno;
  }

  /**
   * Obtener todos los datos de tarjetas
   */
  function getAllBoards() {
    return boardData;
  }

  /**
   * Obtener pines disponibles por categoría
   */
  function getAvailablePins(pinType) {
    var board = getBoardData();
    var allPins = [];

    switch (pinType) {
      case 'digital':
        allPins = board.digitalPins || [];
        break;
      case 'analog':
        allPins = board.analogPins || [];
        break;
      case 'pwm':
        allPins = board.pwmPins || [];
        break;
      case 'i2c':
        if (board.i2cPins) {
          allPins = [board.i2cPins.sda, board.i2cPins.scl].filter(Boolean);
        }
        break;
      case 'serial':
        if (board.serialPins) {
          allPins = [board.serialPins.rx, board.serialPins.tx].filter(Boolean);
        }
        break;
      default:
        allPins = board.digitalPins || [];
    }

    // Filtrar pines ya en uso
    return allPins.filter(function(pin) {
      return !state.usedPins[pin];
    });
  }

  /**
   * Obtener todos los pines de una categoría (incluyendo usados)
   */
  function getAllPinsOfType(pinType) {
    var board = getBoardData();

    switch (pinType) {
      case 'digital':
        return board.digitalPins || [];
      case 'analog':
        return board.analogPins || [];
      case 'pwm':
        return board.pwmPins || [];
      case 'i2c':
        return board.i2cPins ? [board.i2cPins.sda, board.i2cPins.scl].filter(Boolean) : [];
      case 'serial':
        return board.serialPins ? [board.serialPins.rx, board.serialPins.tx].filter(Boolean) : [];
      default:
        return board.digitalPins || [];
    }
  }

  /**
   * Verificar si un pin está disponible
   */
  function isPinAvailable(pin) {
    return !state.usedPins[pin];
  }

  /**
   * Verificar si un pin es el estándar I2C
   */
  function isStandardI2CPin(pin) {
    var board = getBoardData();
    if (!board.i2cPins) return false;
    return pin === board.i2cPins.sda || pin === board.i2cPins.scl;
  }

  /**
   * Verificar si un pin es el estándar Serial
   */
  function isStandardSerialPin(pin) {
    var board = getBoardData();
    if (!board.serialPins) return false;
    return pin === board.serialPins.rx || pin === board.serialPins.tx;
  }

  /**
   * Registrar un componente
   */
  function registerComponent(componentId, componentType, componentName, enabled) {
    state.components[componentId] = {
      type: componentType,
      name: componentName || componentType,
      enabled: enabled !== false,
      pins: {}
    };
    emit('componentRegistered', { componentId: componentId, componentType: componentType });
    return state.components[componentId];
  }

  /**
   * Eliminar registro de un componente
   */
  function unregisterComponent(componentId) {
    if (!state.components[componentId]) return;

    // Liberar todos los pines del componente
    releaseComponentPins(componentId);

    delete state.components[componentId];
    emit('componentUnregistered', { componentId: componentId });
  }

  /**
   * Asignar un pin a un componente
   */
  function assignPin(componentId, pinRole, pin, pinType) {
    if (!state.components[componentId]) {
      console.warn('[PinManager] Componente no registrado:', componentId);
      return { success: false, error: 'Componente no registrado' };
    }

    // Determinar si este pin es I2C
    var compType = state.components[componentId].type;
    var compDef = componentPinDefinitions[compType];
    var isCurrentPinI2C = pinType === 'i2c';

    // Si no se especificó pinType, intentar detectarlo
    if (!pinType && compDef && compDef.pins) {
      var pinDef = compDef.pins.find(function(p) { return p.id === pinRole; });
      if (pinDef) {
        isCurrentPinI2C = pinDef.type === 'i2c';
      }
    }

    // Verificar si el pin ya está en uso por otro componente
    if (state.usedPins[pin]) {
      var existing = state.usedPins[pin];
      if (existing.componentId !== componentId) {
        // PERMITIR compartir pines I2C (es un bus compartido)
        if (isCurrentPinI2C && existing.isI2C) {
          // Pines I2C pueden compartirse, no hay conflicto
          console.log('[PinManager] Pin I2C compartido:', pin, 'por', componentId, 'y', existing.componentId);
        } else {
          // Conflicto real para pines no-I2C
          return {
            success: false,
            error: 'Pin en uso',
            conflict: {
              pin: pin,
              usedBy: existing.componentName,
              usedFor: existing.pinRole
            }
          };
        }
      }
    }

    // Liberar pin anterior si existe (solo para pines no-I2C o si es el único usuario)
    var oldPin = state.components[componentId].pins[pinRole];
    if (oldPin && oldPin !== pin) {
      // Solo eliminar si este componente era el único usuario
      if (state.usedPins[oldPin] && state.usedPins[oldPin].componentId === componentId) {
        delete state.usedPins[oldPin];
      }
    }

    // Asignar nuevo pin
    state.components[componentId].pins[pinRole] = pin;

    // Para pines I2C, no sobrescribir si ya existe (bus compartido)
    if (!state.usedPins[pin] || !isCurrentPinI2C) {
      state.usedPins[pin] = {
        componentId: componentId,
        componentType: state.components[componentId].type,
        componentName: state.components[componentId].name,
        pinRole: pinRole,
        isI2C: isCurrentPinI2C
      };
    }

    emit('pinAssigned', {
      componentId: componentId,
      pinRole: pinRole,
      pin: pin,
      oldPin: oldPin,
      isI2C: isCurrentPinI2C
    });

    return { success: true, oldPin: oldPin };
  }

  /**
   * Asignar dirección I2C a un componente
   */
  function assignI2CAddress(componentId, address) {
    if (!state.components[componentId]) {
      return { success: false, error: 'Componente no registrado' };
    }

    // Verificar si la dirección ya está en uso
    if (state.usedI2CAddresses[address]) {
      var existing = state.usedI2CAddresses[address];
      if (existing.componentId !== componentId) {
        return {
          success: false,
          error: 'Dirección I2C en uso',
          conflict: {
            address: address,
            usedBy: existing.componentName
          }
        };
      }
    }

    // Liberar dirección anterior si existe
    var oldAddress = state.components[componentId].i2cAddress;
    if (oldAddress && oldAddress !== address) {
      delete state.usedI2CAddresses[oldAddress];
    }

    // Asignar nueva dirección
    state.components[componentId].i2cAddress = address;
    state.usedI2CAddresses[address] = {
      componentId: componentId,
      componentType: state.components[componentId].type,
      componentName: state.components[componentId].name
    };

    emit('i2cAddressAssigned', {
      componentId: componentId,
      address: address,
      oldAddress: oldAddress
    });

    return { success: true, oldAddress: oldAddress };
  }

  /**
   * Obtener dirección I2C de un componente
   */
  function getComponentI2CAddress(componentId) {
    if (!state.components[componentId]) return null;
    return state.components[componentId].i2cAddress || null;
  }

  /**
   * Obtener dirección I2C por defecto de un tipo de componente
   */
  function getDefaultI2CAddress(componentType) {
    var def = componentPinDefinitions[componentType];
    if (def && def.i2cAddress) {
      return def.i2cAddress;
    }
    return null;
  }

  /**
   * Verificar si una dirección I2C está disponible
   */
  function isI2CAddressAvailable(address) {
    return !state.usedI2CAddresses[address];
  }

  /**
   * Liberar un pin específico
   */
  function releasePin(pin) {
    if (!state.usedPins[pin]) return false;

    var info = state.usedPins[pin];
    delete state.usedPins[pin];

    // También eliminar del componente
    if (state.components[info.componentId]) {
      var pins = state.components[info.componentId].pins;
      for (var role in pins) {
        if (pins[role] === pin) {
          delete pins[role];
          break;
        }
      }
    }

    emit('pinReleased', { pin: pin, componentId: info.componentId });
    return true;
  }

  /**
   * Liberar todos los pines de un componente
   */
  function releaseComponentPins(componentId) {
    if (!state.components[componentId]) return;

    var pins = state.components[componentId].pins;
    var released = [];

    for (var role in pins) {
      var pin = pins[role];
      if (state.usedPins[pin]) {
        delete state.usedPins[pin];
        released.push(pin);
      }
    }

    state.components[componentId].pins = {};
    emit('componentPinsReleased', { componentId: componentId, pins: released });
    return released;
  }

  /**
   * Obtener información de un pin
   */
  function getPinInfo(pin) {
    return state.usedPins[pin] || null;
  }

  /**
   * Obtener todos los pines de un componente
   */
  function getComponentPins(componentId) {
    if (!state.components[componentId]) return {};
    return Object.assign({}, state.components[componentId].pins);
  }

  /**
   * Obtener definición de pines de un tipo de componente
   */
  function getComponentPinDefinition(componentType) {
    return componentPinDefinitions[componentType] || null;
  }

  /**
   * Habilitar/deshabilitar un componente
   */
  function setComponentEnabled(componentId, enabled) {
    if (!state.components[componentId]) return false;

    var wasEnabled = state.components[componentId].enabled;
    state.components[componentId].enabled = enabled;

    if (wasEnabled && !enabled) {
      // Al deshabilitar, liberar pines
      releaseComponentPins(componentId);
    }

    emit('componentToggled', {
      componentId: componentId,
      enabled: enabled,
      wasEnabled: wasEnabled
    });

    return true;
  }

  /**
   * Verificar si un componente está habilitado
   */
  function isComponentEnabled(componentId) {
    if (!state.components[componentId]) return false;
    return state.components[componentId].enabled;
  }

  /**
   * Obtener todos los conflictos de pines
   */
  function getConflicts() {
    var conflicts = [];
    var pinCounts = {};

    // Contar usos de cada pin
    for (var pin in state.usedPins) {
      if (!pinCounts[pin]) pinCounts[pin] = [];
      pinCounts[pin].push(state.usedPins[pin]);
    }

    // Detectar duplicados (no debería pasar, pero por seguridad)
    for (var pin in pinCounts) {
      if (pinCounts[pin].length > 1) {
        conflicts.push({
          pin: pin,
          components: pinCounts[pin]
        });
      }
    }

    return conflicts;
  }

  /**
   * Validar toda la configuración
   */
  function validateAll() {
    var issues = [];
    var board = getBoardData();

    for (var componentId in state.components) {
      var comp = state.components[componentId];
      if (!comp.enabled) continue;

      var pinDef = componentPinDefinitions[comp.type];
      if (!pinDef) continue;

      // Verificar que todos los pines requeridos estén asignados
      pinDef.pins.forEach(function(pinInfo) {
        if (pinInfo.required && !comp.pins[pinInfo.id]) {
          issues.push({
            type: 'missing',
            componentId: componentId,
            componentName: comp.name,
            pinRole: pinInfo.id,
            pinName: pinInfo.name,
            message: comp.name + ' necesita el pin ' + pinInfo.name
          });
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Obtener estadísticas de uso de pines
   */
  function getPinStats() {
    var board = getBoardData();
    var usedDigital = 0, usedAnalog = 0, usedPWM = 0;

    for (var pin in state.usedPins) {
      if (board.digitalPins && board.digitalPins.indexOf(pin) !== -1) usedDigital++;
      if (board.analogPins && board.analogPins.indexOf(pin) !== -1) usedAnalog++;
      if (board.pwmPins && board.pwmPins.indexOf(pin) !== -1) usedPWM++;
    }

    return {
      digital: {
        used: usedDigital,
        total: board.digitalPins ? board.digitalPins.length : 0,
        available: (board.digitalPins ? board.digitalPins.length : 0) - usedDigital
      },
      analog: {
        used: usedAnalog,
        total: board.analogPins ? board.analogPins.length : 0,
        available: (board.analogPins ? board.analogPins.length : 0) - usedAnalog
      },
      pwm: {
        used: usedPWM,
        total: board.pwmPins ? board.pwmPins.length : 0,
        available: (board.pwmPins ? board.pwmPins.length : 0) - usedPWM
      }
    };
  }

  /**
   * Obtener pines predeterminados para un componente según la tarjeta
   */
  function getDefaultPinsForComponent(componentType, boardType) {
    boardType = boardType || state.boardType;
    var board = boardData[boardType] || boardData.arduinoUno;
    var pinDef = componentPinDefinitions[componentType];

    if (!pinDef) return {};

    var result = {};
    var tempUsed = Object.keys(state.usedPins);

    pinDef.pins.forEach(function(pinInfo) {
      if (!pinInfo.required) return;

      var candidates = [];

      // Seleccionar pines según tipo
      switch (pinInfo.type) {
        case 'i2c':
          if (board.i2cPins) {
            if (pinInfo.id === 'sda' || pinInfo.name === 'SDA') {
              candidates = [board.i2cPins.sda];
            } else {
              candidates = [board.i2cPins.scl];
            }
          }
          break;
        case 'serial':
          if (board.serialPins) {
            if (pinInfo.id === 'rx' || pinInfo.name === 'RX') {
              candidates = [board.serialPins.rx];
            } else {
              candidates = [board.serialPins.tx];
            }
          }
          break;
        case 'analog':
          candidates = board.analogPins || [];
          break;
        case 'pwm':
          candidates = board.pwmPins || [];
          break;
        default:
          candidates = board.digitalPins || [];
      }

      // Buscar primer pin disponible
      for (var i = 0; i < candidates.length; i++) {
        if (tempUsed.indexOf(candidates[i]) === -1) {
          result[pinInfo.id] = candidates[i];
          tempUsed.push(candidates[i]);
          break;
        }
      }
    });

    return result;
  }

  /**
   * Limpiar todo el estado
   */
  function clear() {
    state.usedPins = {};
    state.usedI2CAddresses = {};
    state.components = {};
    emit('cleared', {});
  }

  /**
   * Exportar estado actual
   */
  function exportState() {
    return {
      boardType: state.boardType,
      components: JSON.parse(JSON.stringify(state.components))
    };
  }

  /**
   * Importar estado
   */
  function importState(data) {
    if (data.boardType) {
      setBoard(data.boardType);
    }

    clear();

    if (data.components) {
      for (var componentId in data.components) {
        var comp = data.components[componentId];
        registerComponent(componentId, comp.type, comp.name, comp.enabled);

        for (var pinRole in comp.pins) {
          assignPin(componentId, pinRole, comp.pins[pinRole]);
        }
      }
    }

    emit('stateImported', data);
  }

  // ============================================
  // SISTEMA DE EVENTOS
  // ============================================

  function on(event, callback) {
    if (!state.listeners[event]) {
      state.listeners[event] = [];
    }
    state.listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!state.listeners[event]) return;
    var idx = state.listeners[event].indexOf(callback);
    if (idx > -1) {
      state.listeners[event].splice(idx, 1);
    }
  }

  function emit(event, data) {
    if (!state.listeners[event]) return;
    state.listeners[event].forEach(function(callback) {
      try {
        callback(data);
      } catch (e) {
        console.error('[PinManager] Error in event listener:', e);
      }
    });
  }

  // ============================================
  // API PÚBLICA
  // ============================================
  return {
    // Tarjeta
    setBoard: setBoard,
    getBoard: getBoard,
    getBoardData: getBoardData,
    getAllBoards: getAllBoards,

    // Pines
    getAvailablePins: getAvailablePins,
    getAllPinsOfType: getAllPinsOfType,
    isPinAvailable: isPinAvailable,
    isStandardI2CPin: isStandardI2CPin,
    isStandardSerialPin: isStandardSerialPin,
    getPinInfo: getPinInfo,
    assignPin: assignPin,
    releasePin: releasePin,

    // Componentes
    registerComponent: registerComponent,
    unregisterComponent: unregisterComponent,
    getComponentPins: getComponentPins,
    getComponentPinDefinition: getComponentPinDefinition,
    releaseComponentPins: releaseComponentPins,
    setComponentEnabled: setComponentEnabled,
    isComponentEnabled: isComponentEnabled,
    getDefaultPinsForComponent: getDefaultPinsForComponent,

    // I2C
    assignI2CAddress: assignI2CAddress,
    getComponentI2CAddress: getComponentI2CAddress,
    getDefaultI2CAddress: getDefaultI2CAddress,
    isI2CAddressAvailable: isI2CAddressAvailable,

    // STBoard V2 / Sistema de Puertos
    usesPortSystem: usesPortSystem,
    getAvailablePorts: getAvailablePorts,
    getPortInfo: getPortInfo,
    getMotorPorts: getMotorPorts,
    getMotorPortInfo: getMotorPortInfo,
    isIntegratedSensor: isIntegratedSensor,
    getIntegratedSensorInfo: getIntegratedSensorInfo,
    getIntegratedSensors: getIntegratedSensors,
    getAdaptedPinDefinition: getAdaptedPinDefinition,
    getPortTypeForComponent: getPortTypeForComponent,
    isMotorComponent: isMotorComponent,

    // Validación
    getConflicts: getConflicts,
    validateAll: validateAll,
    getPinStats: getPinStats,

    // Estado
    clear: clear,
    exportState: exportState,
    importState: importState,

    // Eventos
    on: on,
    off: off,

    // Datos
    boardData: boardData,
    componentPinDefinitions: componentPinDefinitions
  };

})();

// Exportar para Node.js si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinManager;
}
