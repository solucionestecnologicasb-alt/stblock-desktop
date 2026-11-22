/**
 * builder.js
 * Lógica del Editor de Robot Personalizado para Niños
 * Tema púrpura/índigo STBlock
 */

(function() {
  'use strict';

  // ============================================
  // DOM HELPERS
  // ============================================
  var $ = function(id) { return document.getElementById(id); };

  // ============================================
  // STATE
  // ============================================
  var currentStep = 1;
  var selectedBoard = null;
  var selectedBase = null;
  var selectedTemplate = null;
  var selectedSavedRobot = null;

  var robotState = null;
  var selectedPartId = null;

  // Babylon.js
  var robotCanvas = null;
  var robotEngine = null;
  var robotScene = null;
  var robotCamera = null;
  var robotMeshes = {};

  // Drag state
  var draggingPart = false;
  var dragPartId = null;
  var dragOffset = null;
  var dragPlaneY = 0;

  // ============================================
  // ROBOT TEMPLATES (simple)
  // ============================================
  var defaultRobotThumb = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="#1e1b4b" width="80" height="80"/><rect x="20" y="25" width="40" height="25" rx="4" fill="#f09c0d"/><circle cx="28" cy="55" r="8" fill="#333"/><circle cx="52" cy="55" r="8" fill="#333"/><rect x="35" y="18" width="10" height="8" rx="2" fill="#6366f1"/></svg>');

  var robotTemplates = [
    {
      id: 'singleFollower',
      name: 'Seguidor de Línea Simple',
      thumbnail: defaultRobotThumb,
      description: 'Robot con un sensor de color para seguir líneas'
    },
    {
      id: 'doubleFollower',
      name: 'Seguidor de Línea Doble',
      thumbnail: defaultRobotThumb,
      description: 'Robot con dos sensores de color'
    },
    {
      id: 'mazeRunner',
      name: 'Corredor de Laberinto',
      thumbnail: defaultRobotThumb,
      description: 'Robot con sensores ultrasónicos'
    }
  ];

  // ============================================
  // BOARD DATA - Lista completa de dispositivos con pines realistas
  // ============================================
  var boardData = {
    // STBlock / STBoard (sistema de puertos simplificado)
    stbBoardV2: {
      name: 'STBoard V2',
      category: 'stblock',
      sensorPorts: ['1','2','3','4','5','6','7','8'],
      motorPorts: ['A1','A2','B3','B4'],
      digitalPins: ['1','2','3','4','5','6','7','8','A1','A2','B3','B4'],
      analogPins: ['1','2','3','4','5','6','7','8'],
      pwmPins: ['A1','A2','B3','B4'],
      i2cPins: { sda: '7', scl: '8' },
      serialPins: { rx: '1', tx: '2' }
    },
    stBoardExtension: {
      name: 'STBoard Extensión',
      category: 'stblock',
      sensorPorts: ['E1','E2','E3','E4'],
      motorPorts: ['EA','EB'],
      digitalPins: ['E1','E2','E3','E4','EA','EB'],
      analogPins: ['E1','E2','E3','E4'],
      pwmPins: ['EA','EB'],
      i2cPins: { sda: 'E3', scl: 'E4' },
      serialPins: { rx: 'E1', tx: 'E2' }
    },

    // Arduino Uno / Nano (ATmega328P)
    arduinoUno: {
      name: 'Arduino Uno',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },
    arduinoNano: {
      name: 'Arduino Nano',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5','A6','A7'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5','A6','A7'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },
    arduinoLeonardo: {
      name: 'Arduino Leonardo',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5'],
      pwmPins: ['D3','D5','D6','D9','D10','D11','D13'],
      i2cPins: { sda: 'D2', scl: 'D3' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },
    arduinoMega2560: {
      name: 'Arduino Mega 2560',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D22','D23','D24','D25','D26','D27','D28','D29','D30','D31'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D22','D23','D24','D25','D26','D27','D28','D29','D30','D31','D32','D33','D34','D35','D36','D37','D38','D39','D40','D41','D42','D43','D44','D45','D46','D47','D48','D49','D50','D51','D52','D53'],
      analogPins: ['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
      pwmPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D44','D45','D46'],
      i2cPins: { sda: 'D20', scl: 'D21' },
      serialPins: { rx: 'D0', tx: 'D1', rx1: 'D19', tx1: 'D18', rx2: 'D17', tx2: 'D16', rx3: 'D15', tx3: 'D14' }
    },
    arduinoUnoR4Minima: {
      name: 'Arduino Uno R4 Minima',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },
    arduinoUnoR4Wifi: {
      name: 'Arduino Uno R4 WiFi',
      category: 'arduino',
      sensorPorts: ['A0','A1','A2','A3','A4','A5'],
      motorPorts: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      digitalPins: ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'],
      analogPins: ['A0','A1','A2','A3','A4','A5'],
      pwmPins: ['D3','D5','D6','D9','D10','D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },
    makeyMakey: {
      name: 'Makey Makey',
      category: 'other',
      sensorPorts: ['UP','DOWN','LEFT','RIGHT','SPACE','CLICK'],
      motorPorts: [],
      digitalPins: ['UP','DOWN','LEFT','RIGHT','SPACE','CLICK','W','A','S','D','F','G'],
      analogPins: [],
      pwmPins: [],
      i2cPins: {},
      serialPins: {}
    },

    // ESP32 / ESP8266
    arduinoEsp32: {
      name: 'ESP32',
      category: 'esp32',
      sensorPorts: ['GPIO32','GPIO33','GPIO34','GPIO35','GPIO36','GPIO39'],
      motorPorts: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27'],
      digitalPins: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27','GPIO32','GPIO33'],
      analogPins: ['GPIO32','GPIO33','GPIO34','GPIO35','GPIO36','GPIO39'],
      pwmPins: ['GPIO2','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27'],
      i2cPins: { sda: 'GPIO21', scl: 'GPIO22' },
      serialPins: { rx: 'GPIO3', tx: 'GPIO1', rx2: 'GPIO16', tx2: 'GPIO17' }
    },
    arduinoEsp32S3: {
      name: 'ESP32-S3',
      category: 'esp32',
      sensorPorts: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8'],
      motorPorts: ['GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21'],
      digitalPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21'],
      analogPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10'],
      pwmPins: ['GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO8','GPIO9','GPIO10','GPIO11','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO20','GPIO21'],
      i2cPins: { sda: 'GPIO8', scl: 'GPIO9' },
      serialPins: { rx: 'GPIO44', tx: 'GPIO43' }
    },
    arduinoEsp8266NodeMCU: {
      name: 'ESP8266 NodeMCU',
      category: 'esp8266',
      sensorPorts: ['A0'],
      motorPorts: ['D0','D1','D2','D3','D4','D5','D6','D7','D8'],
      digitalPins: ['D0','D1','D2','D3','D4','D5','D6','D7','D8'],
      analogPins: ['A0'],
      pwmPins: ['D1','D2','D3','D4','D5','D6','D7','D8'],
      i2cPins: { sda: 'D2', scl: 'D1' },
      serialPins: { rx: 'D9', tx: 'D10' }
    },

    // Raspberry Pi Pico
    arduinoRaspberryPiPico: {
      name: 'Raspberry Pi Pico',
      category: 'pico',
      sensorPorts: ['GP26','GP27','GP28'],
      motorPorts: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' }
    },
    arduinoRaspberryPiPicoW: {
      name: 'Raspberry Pi Pico W',
      category: 'pico',
      sensorPorts: ['GP26','GP27','GP28'],
      motorPorts: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' }
    },
    arduinoRaspberryPiPico2: {
      name: 'Raspberry Pi Pico 2',
      category: 'pico',
      sensorPorts: ['GP26','GP27','GP28','GP29'],
      motorPorts: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28','GP29'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' }
    },
    arduinoRaspberryPiPico2W: {
      name: 'Raspberry Pi Pico 2 W',
      category: 'pico',
      sensorPorts: ['GP26','GP27','GP28','GP29'],
      motorPorts: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      digitalPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15','GP16','GP17','GP18','GP19','GP20','GP21','GP22'],
      analogPins: ['GP26','GP27','GP28','GP29'],
      pwmPins: ['GP0','GP1','GP2','GP3','GP4','GP5','GP6','GP7','GP8','GP9','GP10','GP11','GP12','GP13','GP14','GP15'],
      i2cPins: { sda: 'GP4', scl: 'GP5' },
      serialPins: { rx: 'GP1', tx: 'GP0' }
    },

    // Micro:bit
    microbit: {
      name: 'Micro:bit V1',
      category: 'microbit',
      sensorPorts: ['P0','P1','P2'],
      motorPorts: ['P8','P12','P13','P14','P15','P16'],
      digitalPins: ['P0','P1','P2','P8','P12','P13','P14','P15','P16'],
      analogPins: ['P0','P1','P2'],
      pwmPins: ['P0','P1','P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P0', tx: 'P1' }
    },
    microbitV2: {
      name: 'Micro:bit V2',
      category: 'microbit',
      sensorPorts: ['P0','P1','P2'],
      motorPorts: ['P8','P12','P13','P14','P15','P16'],
      digitalPins: ['P0','P1','P2','P8','P12','P13','P14','P15','P16'],
      analogPins: ['P0','P1','P2'],
      pwmPins: ['P0','P1','P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P0', tx: 'P1' }
    },

    // K210
    arduinoK210MaixDock: {
      name: 'K210 Maix Dock',
      category: 'k210',
      sensorPorts: ['IO6','IO7','IO8','IO9'],
      motorPorts: ['IO10','IO11','IO12','IO13','IO14','IO15'],
      digitalPins: ['IO6','IO7','IO8','IO9','IO10','IO11','IO12','IO13','IO14','IO15'],
      analogPins: [],
      pwmPins: ['IO10','IO11','IO12','IO13','IO14','IO15'],
      i2cPins: { sda: 'IO6', scl: 'IO7' },
      serialPins: { rx: 'IO6', tx: 'IO7' }
    },
    arduinoK210Maixduino: {
      name: 'K210 Maixduino',
      category: 'k210',
      sensorPorts: ['A0','A1','A2','A3'],
      motorPorts: ['D0','D1','D2','D3','D4','D5','D6','D7'],
      digitalPins: ['D0','D1','D2','D3','D4','D5','D6','D7'],
      analogPins: ['A0','A1','A2','A3'],
      pwmPins: ['D0','D1','D2','D3','D4','D5','D6','D7'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },

    // LEGO EV3 (sistema de puertos simplificado)
    ev3: {
      name: 'LEGO EV3',
      category: 'ev3',
      sensorPorts: ['in1','in2','in3','in4'],
      motorPorts: ['outA','outB','outC','outD'],
      digitalPins: ['in1','in2','in3','in4','outA','outB','outC','outD'],
      analogPins: ['in1','in2','in3','in4'],
      pwmPins: ['outA','outB','outC','outD'],
      i2cPins: { sda: 'in1', scl: 'in1' },
      serialPins: {}
    }
  };

  // ============================================
  // PART TYPES
  // ============================================
  var partTypes = {
    // Sensores
    'ultrasonic': { name: 'Sensor Ultrasónico', type: 'UltrasonicSensor', icon: '📏', category: 'sensor' },
    'color': { name: 'Sensor de Color', type: 'ColorSensor', icon: '🎨', category: 'sensor' },
    'touch': { name: 'Sensor de Contacto', type: 'TouchSensor', icon: '👆', category: 'sensor' },
    'gyro': { name: 'Giroscopio', type: 'GyroSensor', icon: '🧭', category: 'sensor' },
    'gps': { name: 'Sensor GPS', type: 'GPSSensor', icon: '📍', category: 'sensor' },
    'laser': { name: 'Láser Distancia', type: 'LaserRangeSensor', icon: '🔴', category: 'sensor' },
    'linefollower': { name: 'Seguidor de Línea', type: 'LineFollowerSensor', icon: '〰️', category: 'sensor' },
    'temperature': { name: 'Sensor Temperatura', type: 'TemperatureSensor', icon: '🌡️', category: 'sensor' },
    'humidity': { name: 'Sensor Humedad', type: 'HumiditySensor', icon: '💧', category: 'sensor' },
    'lidar': { name: 'LIDAR 360°', type: 'LidarSensor', icon: '🔵', category: 'sensor' },
    'gas': { name: 'Sensor de Gas', type: 'GasSensor', icon: '💨', category: 'sensor' },
    'camera': { name: 'Cámara', type: 'CameraSensor', icon: '📷', category: 'sensor' },
    // Actuadores
    'servo-sg90': { name: 'Servo SG90', type: 'ServoMotor', icon: '🔄', category: 'actuator', options: { servoType: 'sg90', maxAngle: 180 } },
    'servo-sg90-360': { name: 'Servo SG90 360°', type: 'ServoMotor', icon: '🔄', category: 'actuator', options: { servoType: 'sg90-360', continuous: true } },
    'servo-mg996': { name: 'Servo MG996', type: 'ServoMotor', icon: '🔄', category: 'actuator', options: { servoType: 'mg996', maxAngle: 180 } },
    'servo-mg996-360': { name: 'Servo MG996 360°', type: 'ServoMotor', icon: '🔄', category: 'actuator', options: { servoType: 'mg996-360', continuous: true } },
    'linear': { name: 'Actuador Lineal', type: 'LinearActuator', icon: '↔️', category: 'actuator' },
    'magnet': { name: 'Electroimán', type: 'MagnetActuator', icon: '🧲', category: 'actuator' },
    'pen': { name: 'Lápiz Trazador', type: 'Pen', icon: '✏️', category: 'actuator' },
    'arm': { name: 'Brazo Articulado', type: 'ArmActuator', icon: '🦾', category: 'actuator' },
    'swivel': { name: 'Actuador Giratorio', type: 'SwivelActuator', icon: '🔃', category: 'actuator' },
    'launcher': { name: 'Lanzador', type: 'PaintballLauncherActuator', icon: '🎯', category: 'actuator' },
    // Ruedas
    'wheel-left': { name: 'Rueda Izquierda', type: 'WheelDrive', icon: '⚙️', category: 'wheel' },
    'wheel-right': { name: 'Rueda Derecha', type: 'WheelDrive', icon: '⚙️', category: 'wheel' },
    'wheel-passive': { name: 'Rueda Pasiva', type: 'WheelPassive', icon: '⭕', category: 'actuator' },
    // Estructurales
    'struct-box': { name: 'Caja', type: 'Box', icon: '⬜', category: 'structural' },
    'struct-cylinder': { name: 'Cilindro', type: 'Cylinder', icon: '⭕', category: 'structural' },
    'struct-sphere': { name: 'Esfera', type: 'Sphere', icon: '🔵', category: 'structural' }
  };

  // ============================================
  // INSTALLED PIECE PRESETS (Servos con modelos 3D)
  // ============================================
  var installedPiecePresets = [{
    schema: 'stblock-piece-preset-v1',
    id: 'servo-sg90',
    name: 'Servo SG90',
    category: 'motor',
    type: 'rotary-servo',
    description: 'Servo motor sg90 de 180 grados',
    segments: [{
      id: 'servo-sg90-arm',
      name: 'Rotacion',
      role: 'rotary',
      parentId: 'servo-sg90-body',
      modelURL: '../models/parts/servo-sg90/SG90_arm_v2.stl',
      modelName: 'SG90_arm_v2.stl',
      position: [-2.94, 3.6, 1.63],
      rotation: [180, 90, 0],
      scale: 0.11,
      pivot: [0, 0, 0],
      axis: [0, 1, 0],
      limits: [0, 180],
      speed: 90,
      mass: 5,
      friction: 0.5,
      collider: true,
      color: '#f59e0b'
    }, {
      id: 'servo-sg90-body',
      name: 'carcasa',
      role: 'fixed',
      parentId: '',
      modelURL: '../models/parts/servo-sg90/SG90_v7.stl',
      modelName: 'SG90_v7.stl',
      position: [-3.6, 0, -0.14],
      rotation: [0, 0, 0],
      scale: 0.11,
      pivot: [0, 0, 0],
      axis: [1, 0, 0],
      limits: [0, 180],
      speed: 90,
      mass: 20,
      friction: 0.5,
      collider: true,
      color: '#2f8cff'
    }],
    controls: {input: 'value', min: 0, max: 180, defaultValue: 90},
    pinCount: 1
  }, {
    schema: 'stblock-piece-preset-v1',
    id: 'servo-sg90-360',
    name: 'Servo SG90 360',
    category: 'actuator',
    type: 'rotary-servo',
    description: 'Servo motor sg90 360',
    segments: [{
      id: 'servo-sg90-360-body',
      name: 'Carcasa',
      role: 'fixed',
      parentId: '',
      modelURL: '../models/parts/servo-sg90/SG90_v7.stl',
      modelName: 'SG90_v7.stl',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 0.11,
      pivot: [0, 0, 0],
      axis: [1, 0, 0],
      limits: [0, 180],
      speed: 90,
      mass: 20,
      friction: 0.5,
      collider: true,
      color: '#2f8cff'
    }, {
      id: 'servo-sg90-360-shaft',
      name: 'Eje',
      role: 'rotary',
      parentId: 'servo-sg90-360-body',
      modelURL: '../models/parts/servo-sg90/rueda_dentada4.stl',
      modelName: 'rueda_dentada4.stl',
      position: [-0.73, 3.3, 3.18],
      rotation: [180, 0, 0],
      scale: 0.06,
      pivot: [22.93, 6.5, 22.89],
      axis: [0, 1, 0],
      limits: [0, 360],
      speed: 90,
      mass: 5,
      friction: 0.5,
      collider: true,
      color: '#f59e0b'
    }],
    controls: {input: 'value', min: 0, max: 360, defaultValue: 180},
    pinCount: 1
  }, {
    schema: 'stblock-piece-preset-v1',
    id: 'servo-mg996',
    name: 'Servo MG996',
    category: 'motor',
    type: 'rotary-servo',
    description: 'Servo motor MG996 de 180 grados',
    segments: [{
      id: 'servo-mg996-arm',
      name: 'Rotacion',
      role: 'rotary',
      parentId: 'servo-mg996-body',
      modelURL: '../models/parts/servo-sg90/SG90_arm_v2.stl',
      modelName: 'SG90_arm_v2.stl',
      position: [-2.42, 5.7, 2.91],
      rotation: [180, 90, 0],
      scale: 0.25,
      pivot: [0, 0, 0],
      axis: [0, 1, 0],
      limits: [0, 180],
      speed: 90,
      mass: 5,
      friction: 0.5,
      collider: true,
      color: '#f59e0b'
    }, {
      id: 'servo-mg996-body',
      name: 'Carcasa',
      role: 'fixed',
      parentId: '',
      modelURL: '../models/parts/servo-sg90/SG90_v7.stl',
      modelName: 'SG90_v7.stl',
      position: [-3.6, 0, -0.14],
      rotation: [0, 0, 0],
      scale: 0.19,
      pivot: [0, 0, 0],
      axis: [1, 0, 0],
      limits: [0, 180],
      speed: 90,
      mass: 20,
      friction: 0.5,
      collider: true,
      color: '#2f8cff'
    }],
    controls: {input: 'value', min: 0, max: 180, defaultValue: 90},
    pinCount: 1
  }, {
    schema: 'stblock-piece-preset-v1',
    id: 'servo-mg996-360',
    name: 'Servo MG996 360',
    category: 'actuator',
    type: 'rotary-servo',
    description: 'Servo motor MG996 360',
    segments: [{
      id: 'servo-mg996-360-body',
      name: 'Carcasa',
      role: 'fixed',
      parentId: '',
      modelURL: '../models/parts/servo-sg90/SG90_v7.stl',
      modelName: 'SG90_v7.stl',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 0.19,
      pivot: [0, 0, 0],
      axis: [1, 0, 0],
      limits: [0, 180],
      speed: 90,
      mass: 20,
      friction: 0.5,
      collider: true,
      color: '#2f8cff'
    }, {
      id: 'servo-mg996-360-shaft',
      name: 'Eje',
      role: 'rotary',
      parentId: 'servo-mg996-360-body',
      modelURL: '../models/parts/servo-sg90/rueda_dentada4.stl',
      modelName: 'rueda_dentada4.stl',
      position: [-1.38, 5.9, 5.65],
      rotation: [180, 0, 0],
      scale: 0.11,
      pivot: [22.93, 6.5, 22.89],
      axis: [0, 1, 0],
      limits: [0, 360],
      speed: 90,
      mass: 5,
      friction: 0.5,
      collider: true,
      color: '#f59e0b'
    }],
    controls: {input: 'value', min: 0, max: 360, defaultValue: 180},
    pinCount: 1
  }];

  function getInstalledPiecePreset(id) {
    return installedPiecePresets.find(function(item) { return item.id === id; });
  }

  // ============================================
  // PIN DEFINITIONS - Configuración realista de pines Arduino
  // ============================================
  var componentPinDefinitions = {
    // ==================== SENSORES ====================
    'UltrasonicSensor': {
      name: 'Sensor Ultrasónico HC-SR04',
      realComponent: 'HC-SR04',
      pins: [
        { id: 'trig', name: 'TRIG', type: 'digital-output', required: true, description: 'Envía pulso ultrasónico de 10μs' },
        { id: 'echo', name: 'ECHO', type: 'digital-input', required: true, description: 'Recibe eco del pulso' }
      ],
      arduinoCode: 'digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW); duration = pulseIn(ECHO, HIGH);',
      datasheet: 'Rango: 2-400cm, Ángulo: 15°'
    },
    'ColorSensor': {
      name: 'Sensor de Color TCS34725',
      realComponent: 'TCS34725',
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c-data', required: true, description: 'Línea de datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c-clock', required: true, description: 'Línea de reloj I2C' }
      ],
      arduinoCode: 'Wire.begin(); tcs.begin();',
      datasheet: 'I2C Address: 0x29, RGB + Clear light'
    },
    'TouchSensor': {
      name: 'Sensor de Contacto',
      realComponent: 'Push Button / Microswitch',
      pins: [
        { id: 'signal', name: 'SIGNAL', type: 'digital-input-pullup', required: true, description: 'Señal de contacto (activo bajo)' }
      ],
      arduinoCode: 'pinMode(PIN, INPUT_PULLUP); pressed = (digitalRead(PIN) == LOW);',
      datasheet: 'Normalmente abierto, cierra al presionar'
    },
    'GyroSensor': {
      name: 'Giroscopio MPU6050',
      realComponent: 'MPU6050',
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c-data', required: true, description: 'Línea de datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c-clock', required: true, description: 'Línea de reloj I2C' },
        { id: 'int', name: 'INT', type: 'digital-input', required: false, description: 'Interrupción (opcional)' }
      ],
      arduinoCode: 'Wire.begin(); mpu.initialize();',
      datasheet: 'I2C Address: 0x68, 6-axis IMU (Gyro + Accel)'
    },
    'GPSSensor': {
      name: 'Sensor GPS NEO-6M',
      realComponent: 'NEO-6M',
      pins: [
        { id: 'rx', name: 'RX', type: 'serial-rx', required: true, description: 'Recibe datos del GPS (conectar a TX del GPS)' },
        { id: 'tx', name: 'TX', type: 'serial-tx', required: true, description: 'Envía comandos al GPS (conectar a RX del GPS)' }
      ],
      arduinoCode: 'SoftwareSerial gpsSerial(RX, TX); gpsSerial.begin(9600);',
      datasheet: 'Baud: 9600, Protocolo: NMEA'
    },
    'LaserRangeSensor': {
      name: 'Sensor Láser VL53L0X',
      realComponent: 'VL53L0X',
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c-data', required: true, description: 'Línea de datos I2C' },
        { id: 'scl', name: 'SCL', type: 'i2c-clock', required: true, description: 'Línea de reloj I2C' }
      ],
      arduinoCode: 'Wire.begin(); sensor.init(); sensor.startContinuous();',
      datasheet: 'I2C Address: 0x29, Rango: 0-2m, ToF'
    },
    'LineFollowerSensor': {
      name: 'Seguidor de Línea 3 Canales',
      realComponent: 'TCRT5000 x3',
      pins: [
        { id: 'left', name: 'LEFT', type: 'analog-input', required: true, description: 'Sensor izquierdo' },
        { id: 'center', name: 'CENTER', type: 'analog-input', required: true, description: 'Sensor central' },
        { id: 'right', name: 'RIGHT', type: 'analog-input', required: true, description: 'Sensor derecho' }
      ],
      arduinoCode: 'left = analogRead(A0); center = analogRead(A1); right = analogRead(A2);',
      datasheet: 'IR reflectivo, 0-1023 valores'
    },
    'TemperatureSensor': {
      name: 'Sensor Temperatura DS18B20',
      realComponent: 'DS18B20',
      pins: [
        { id: 'data', name: 'DATA', type: 'digital-onewire', required: true, description: 'Línea de datos OneWire' }
      ],
      arduinoCode: 'OneWire oneWire(PIN); DallasTemperature sensors(&oneWire);',
      datasheet: 'OneWire, -55°C a +125°C, ±0.5°C'
    },
    'HumiditySensor': {
      name: 'Sensor Humedad DHT11',
      realComponent: 'DHT11',
      pins: [
        { id: 'data', name: 'DATA', type: 'digital-dht', required: true, description: 'Línea de datos DHT' }
      ],
      arduinoCode: 'DHT dht(PIN, DHT11); humidity = dht.readHumidity();',
      datasheet: '20-90% HR, ±5% precisión'
    },
    'LidarSensor': {
      name: 'LIDAR 360° RPLIDAR A1',
      realComponent: 'RPLIDAR A1',
      pins: [
        { id: 'rx', name: 'RX', type: 'serial-rx', required: true, description: 'Recibe datos del LIDAR' },
        { id: 'tx', name: 'TX', type: 'serial-tx', required: true, description: 'Envía comandos al LIDAR' },
        { id: 'pwm', name: 'MOTOR', type: 'pwm-output', required: true, description: 'Control de velocidad del motor' }
      ],
      arduinoCode: 'lidar.begin(Serial1); analogWrite(MOTOR_PIN, 255);',
      datasheet: 'Serial 115200, 360° scan, 0.2-12m'
    },
    'GasSensor': {
      name: 'Sensor de Gas MQ-2',
      realComponent: 'MQ-2',
      pins: [
        { id: 'ao', name: 'AO', type: 'analog-input', required: true, description: 'Salida analógica (0-1023)' },
        { id: 'do', name: 'DO', type: 'digital-input', required: false, description: 'Salida digital (umbral)' }
      ],
      arduinoCode: 'ppm = analogRead(AO_PIN);',
      datasheet: 'Detecta: LPG, propano, metano, alcohol, humo'
    },
    'CameraSensor': {
      name: 'Cámara OV7670',
      realComponent: 'OV7670 / ESP32-CAM',
      pins: [
        { id: 'sda', name: 'SDA', type: 'i2c-data', required: true, description: 'Configuración I2C (SCCB)' },
        { id: 'scl', name: 'SCL', type: 'i2c-clock', required: true, description: 'Reloj I2C (SCCB)' },
        { id: 'vsync', name: 'VSYNC', type: 'digital-input', required: false, description: 'Sincronización vertical' },
        { id: 'href', name: 'HREF', type: 'digital-input', required: false, description: 'Referencia horizontal' },
        { id: 'pclk', name: 'PCLK', type: 'digital-input', required: false, description: 'Pixel clock' }
      ],
      arduinoCode: 'Wire.begin(); camera.init(); // O usar ESP32-CAM con WiFi',
      datasheet: 'I2C config + parallel data, o ESP32-CAM con streaming WiFi'
    },

    // ==================== ACTUADORES ====================
    'ServoMotor': {
      name: 'Servo Motor',
      realComponent: 'SG90 / MG996R',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm-output', required: true, description: 'Señal PWM de control (50Hz)' }
      ],
      arduinoCode: 'Servo myServo; myServo.attach(PIN); myServo.write(90);',
      datasheet: 'PWM 50Hz, 1-2ms pulso, 0-180° o continuo'
    },
    'LinearActuator': {
      name: 'Actuador Lineal',
      realComponent: 'Linear Actuator + L298N',
      pins: [
        { id: 'dir1', name: 'DIR1', type: 'digital-output', required: true, description: 'Dirección 1 (IN1)' },
        { id: 'dir2', name: 'DIR2', type: 'digital-output', required: true, description: 'Dirección 2 (IN2)' },
        { id: 'pwm', name: 'PWM', type: 'pwm-output', required: true, description: 'Velocidad (ENA)' }
      ],
      arduinoCode: 'digitalWrite(DIR1, HIGH); digitalWrite(DIR2, LOW); analogWrite(PWM, 200);',
      datasheet: 'Extender: DIR1=HIGH DIR2=LOW, Retraer: DIR1=LOW DIR2=HIGH'
    },
    'MagnetActuator': {
      name: 'Electroimán',
      realComponent: 'Electromagnet + MOSFET',
      pins: [
        { id: 'control', name: 'CTRL', type: 'digital-output', required: true, description: 'Encendido/Apagado' },
        { id: 'pwm', name: 'PWM', type: 'pwm-output', required: false, description: 'Control de potencia (opcional)' }
      ],
      arduinoCode: 'digitalWrite(CTRL, HIGH); // Activar',
      datasheet: 'Usar MOSFET o relay para corrientes altas'
    },
    'Pen': {
      name: 'Lápiz Trazador',
      realComponent: 'Servo + Pen holder',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm-output', required: true, description: 'Servo que sube/baja el lápiz' }
      ],
      arduinoCode: 'penServo.write(penDown ? 0 : 90);',
      datasheet: 'Servo estándar para control de altura'
    },
    'ArmActuator': {
      name: 'Brazo Articulado',
      realComponent: 'Servo MG996R / Motor DC',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm-output', required: true, description: 'Control de posición (servo) o velocidad (motor)' },
        { id: 'dir1', name: 'DIR1', type: 'digital-output', required: false, description: 'Dirección 1 (solo para motor DC)' },
        { id: 'dir2', name: 'DIR2', type: 'digital-output', required: false, description: 'Dirección 2 (solo para motor DC)' }
      ],
      arduinoCode: 'armServo.attach(PIN); armServo.write(angle);',
      datasheet: 'Servo: 0-180° | Motor DC: requiere encoder para posición'
    },
    'SwivelActuator': {
      name: 'Actuador Giratorio',
      realComponent: 'Servo de rotación continua',
      pins: [
        { id: 'signal', name: 'PWM', type: 'pwm-output', required: true, description: 'Señal PWM para control de rotación' }
      ],
      arduinoCode: 'swivelServo.attach(PIN); swivelServo.write(90); // 90=stop, <90=CCW, >90=CW',
      datasheet: 'Servo 360° continuo, velocidad proporcional a PWM'
    },
    'PaintballLauncherActuator': {
      name: 'Lanzador de Proyectiles',
      realComponent: 'Solenoide / Motor DC',
      pins: [
        { id: 'trigger', name: 'TRIGGER', type: 'digital-output', required: true, description: 'Activa el disparo (solenoide/relay)' },
        { id: 'loader', name: 'LOADER', type: 'digital-output', required: false, description: 'Motor de carga (opcional)' }
      ],
      arduinoCode: 'digitalWrite(TRIGGER, HIGH); delay(100); digitalWrite(TRIGGER, LOW);',
      datasheet: 'Solenoide 12V con MOSFET/Relay, tiempo de activación: 50-100ms'
    },

    // ==================== RUEDAS/MOTORES ====================
    'WheelDrive': {
      name: 'Motor DC con Driver',
      realComponent: 'Motor DC + L298N/TB6612',
      pins: [
        { id: 'dir1', name: 'DIR1', type: 'digital-output', required: true, description: 'Dirección 1 (IN1)' },
        { id: 'dir2', name: 'DIR2', type: 'digital-output', required: true, description: 'Dirección 2 (IN2)' },
        { id: 'pwm', name: 'PWM', type: 'pwm-output', required: true, description: 'Velocidad (ENA)' },
        { id: 'encA', name: 'ENC_A', type: 'digital-input', required: false, description: 'Encoder canal A (opcional)' },
        { id: 'encB', name: 'ENC_B', type: 'digital-input', required: false, description: 'Encoder canal B (opcional)' }
      ],
      arduinoCode: 'digitalWrite(DIR1, HIGH); digitalWrite(DIR2, LOW); analogWrite(PWM, speed);',
      datasheet: 'Adelante: DIR1=H DIR2=L, Atrás: DIR1=L DIR2=H, Frenar: DIR1=L DIR2=L'
    },
    'WheelPassive': {
      name: 'Rueda Pasiva',
      realComponent: 'Caster wheel',
      pins: [],
      arduinoCode: '// Sin control eléctrico',
      datasheet: 'Rueda libre sin motor'
    }
  };

  // Mapeo de tipos de pin a categoría de pines disponibles
  var pinTypeToPortCategory = {
    'digital-output': 'digitalPins',
    'digital-input': 'digitalPins',
    'digital-input-pullup': 'digitalPins',
    'digital-onewire': 'digitalPins',  // OneWire usa pines digitales
    'digital-dht': 'digitalPins',       // DHT usa pines digitales
    'analog-input': 'analogPins',
    'pwm-output': 'pwmPins',
    'serial-rx': 'digitalPins',  // Serial puede usar cualquier digital con SoftwareSerial
    'serial-tx': 'digitalPins',
    'i2c-data': 'digitalPins',   // I2C puede usar SDA específico o software I2C
    'i2c-clock': 'digitalPins'
  };

  // Pines I2C estándar por tarjeta
  var boardI2CPins = {
    'arduinoUno': { sda: 'A4', scl: 'A5' },
    'arduinoNano': { sda: 'A4', scl: 'A5' },
    'arduinoMega2560': { sda: 'D20', scl: 'D21' },
    'arduinoLeonardo': { sda: 'D2', scl: 'D3' },
    'arduinoEsp32': { sda: 'GPIO21', scl: 'GPIO22' },
    'arduinoEsp32S3': { sda: 'GPIO8', scl: 'GPIO9' },
    'arduinoRaspberryPiPico': { sda: 'GP4', scl: 'GP5' },
    'microbit': { sda: 'P20', scl: 'P19' },
    'microbitV2': { sda: 'P20', scl: 'P19' },
    'stbBoardV2': { sda: '7', scl: '8' }  // STBlock define sus propios
  };

  function getComponentPinDefinition(componentType) {
    return componentPinDefinitions[componentType] || null;
  }

  function getDefaultPinsForComponent(componentType, boardType) {
    var def = componentPinDefinitions[componentType];
    if (!def || !def.pins || def.pins.length === 0) return {};

    var board = boardData[boardType] || boardData.stbBoardV2;
    var usedPins = getAllUsedPins();
    var result = {};
    var i2cPins = board.i2cPins || boardI2CPins[boardType];
    var serialPins = board.serialPins;

    def.pins.forEach(function(pin) {
      if (!pin.required && pin.required !== true) return; // Solo pines requeridos por defecto

      // Caso especial para I2C - usar pines estándar
      if (pin.type === 'i2c-data' && i2cPins) {
        result[pin.id] = i2cPins.sda;
        return;
      }
      if (pin.type === 'i2c-clock' && i2cPins) {
        result[pin.id] = i2cPins.scl;
        return;
      }

      // Caso especial para Serial - usar pines estándar
      if (pin.type === 'serial-rx' && serialPins) {
        result[pin.id] = serialPins.rx;
        return;
      }
      if (pin.type === 'serial-tx' && serialPins) {
        result[pin.id] = serialPins.tx;
        return;
      }

      // Buscar puerto disponible según categoría
      var category = pinTypeToPortCategory[pin.type] || 'digitalPins';
      var ports = board[category] || board.digitalPins || [];

      for (var i = 0; i < ports.length; i++) {
        if (usedPins.indexOf(ports[i]) === -1) {
          result[pin.id] = ports[i];
          usedPins.push(ports[i]); // Marcar como usado para siguiente pin
          break;
        }
      }
    });

    return result;
  }

  function getAllUsedPins() {
    var used = [];
    if (!robotState) return used;

    // Pines de ruedas
    robotState.wheels.forEach(function(w) {
      if (w.port) used.push(w.port);
      if (w.pins) {
        Object.keys(w.pins).forEach(function(k) {
          if (w.pins[k]) used.push(w.pins[k]);
        });
      }
    });

    // Pines de componentes
    robotState.components.forEach(function(c) {
      if (c.port) used.push(c.port);
      if (c.pins) {
        Object.keys(c.pins).forEach(function(k) {
          if (c.pins[k]) used.push(c.pins[k]);
        });
      }
    });

    return used;
  }

  function validatePinConflicts() {
    var allPins = [];
    var conflicts = [];

    // Recopilar todos los pines usados
    if (robotState) {
      robotState.wheels.forEach(function(w) {
        if (w.pins) {
          Object.keys(w.pins).forEach(function(k) {
            if (w.pins[k]) allPins.push({ pin: w.pins[k], component: w.name, pinName: k });
          });
        }
      });
      robotState.components.forEach(function(c) {
        if (c.pins) {
          Object.keys(c.pins).forEach(function(k) {
            if (c.pins[k]) allPins.push({ pin: c.pins[k], component: c.name, pinName: k });
          });
        }
      });
    }

    // Detectar duplicados
    var pinMap = {};
    allPins.forEach(function(item) {
      if (!pinMap[item.pin]) {
        pinMap[item.pin] = [];
      }
      pinMap[item.pin].push(item);
    });

    Object.keys(pinMap).forEach(function(pin) {
      if (pinMap[pin].length > 1) {
        conflicts.push({
          pin: pin,
          usedBy: pinMap[pin]
        });
      }
    });

    return conflicts;
  }

  // ============================================
  // CREATE DEFAULT ROBOT STATE
  // ============================================
  function createDefaultRobotState() {
    return {
      id: 'custom-robot-' + Date.now(),
      name: 'Mi Robot',
      boardType: selectedBoard || 'stbBoardV2',
      chassisType: 'box',
      chassis: {
        size: [15, 20, 8],
        yOffset: 0,
        mass: 120,
        friction: 0.5,
        color: '#f09c0d',
        driftEnabled: false,
        driftLeft: 10
      },
      wheels: [
        { id: 'wheel-left', name: 'Rueda Izquierda', type: 'WheelDrive', port: 'A1', radius: 4.0, width: 2.0, position: [-8, 0, 4] },
        { id: 'wheel-right', name: 'Rueda Derecha', type: 'WheelDrive', port: 'A2', radius: 4.0, width: 2.0, position: [8, 0, 4] }
      ],
      components: [],
      thumbnail: ''
    };
  }

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  function toast(message, type) {
    var container = $('toastContainer');
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function() {
      el.remove();
    }, 3000);
  }

  // ============================================
  // STEP NAVIGATION
  // ============================================
  function goToStep(step) {
    currentStep = step;

    // Update step indicators
    document.querySelectorAll('.step').forEach(function(el) {
      var s = parseInt(el.dataset.step, 10);
      el.classList.remove('active', 'completed');
      if (s === step) el.classList.add('active');
      else if (s < step) el.classList.add('completed');
    });

    // Show/hide step content
    document.querySelectorAll('.wizard-step').forEach(function(el) {
      el.classList.remove('active');
    });
    $('step' + step).classList.add('active');

    // Initialize step 3
    if (step === 3) {
      initEditor();
    }
  }

  // ============================================
  // STEP 1: BOARD SELECTION
  // ============================================
  function initStep1() {
    var cards = document.querySelectorAll('.board-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        cards.forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        selectedBoard = card.dataset.board;
        $('btnStep1Next').disabled = false;
      });
    });

    $('btnStep1Next').addEventListener('click', function() {
      if (selectedBoard) {
        goToStep(2);
      }
    });
  }

  // ============================================
  // STEP 2: BASE SELECTION
  // ============================================
  function initStep2() {
    var cards = document.querySelectorAll('.base-card');

    // Update saved count
    var savedRobots = customRobotStorage.getAll();
    $('savedCount').textContent = savedRobots.length + ' guardados';

    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        cards.forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        selectedBase = card.dataset.base;

        // Show/hide sub-selectors
        $('templateSelector').classList.add('hidden');
        $('savedSelector').classList.add('hidden');

        if (selectedBase === 'template') {
          $('templateSelector').classList.remove('hidden');
          renderTemplateGrid();
        } else if (selectedBase === 'saved') {
          $('savedSelector').classList.remove('hidden');
          renderSavedGrid();
        }

        updateStep2Button();
      });
    });

    $('btnStep2Back').addEventListener('click', function() {
      goToStep(1);
    });

    $('btnStep2Next').addEventListener('click', function() {
      if (selectedBase === 'scratch') {
        robotState = createDefaultRobotState();
      } else if (selectedBase === 'template' && selectedTemplate) {
        robotState = createRobotFromTemplate(selectedTemplate);
      } else if (selectedBase === 'saved' && selectedSavedRobot) {
        robotState = JSON.parse(JSON.stringify(selectedSavedRobot));
      }
      goToStep(3);
    });

    if ($('btnStartFresh')) {
      $('btnStartFresh').addEventListener('click', function() {
        document.querySelector('.base-card[data-base="scratch"]').click();
      });
    }
  }

  function updateStep2Button() {
    var enabled = false;
    if (selectedBase === 'scratch') {
      enabled = true;
    } else if (selectedBase === 'template' && selectedTemplate) {
      enabled = true;
    } else if (selectedBase === 'saved' && selectedSavedRobot) {
      enabled = true;
    }
    $('btnStep2Next').disabled = !enabled;
  }

  function renderTemplateGrid() {
    var grid = $('templateGrid');
    grid.innerHTML = '';

    robotTemplates.forEach(function(template) {
      var item = document.createElement('div');
      item.className = 'template-item';
      item.dataset.id = template.id;
      item.innerHTML = '<img src="' + template.thumbnail + '" alt="' + template.name + '" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%231e1b4b%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2245%22 text-anchor=%22middle%22 fill=%22%238b5cf6%22 font-size=%2224%22>🤖</text></svg>\'"><span>' + template.name + '</span>';

      item.addEventListener('click', function() {
        document.querySelectorAll('.template-item').forEach(function(i) { i.classList.remove('selected'); });
        item.classList.add('selected');
        selectedTemplate = template.id;
        updateStep2Button();
      });

      grid.appendChild(item);
    });
  }

  function renderSavedGrid() {
    var grid = $('savedGrid');
    var empty = $('savedEmpty');
    grid.innerHTML = '';

    var savedRobots = customRobotStorage.getAll();

    if (savedRobots.length === 0) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    savedRobots.forEach(function(robot) {
      var item = document.createElement('div');
      item.className = 'saved-item';
      item.dataset.id = robot.id;

      var thumb = robot.thumbnail || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%231e1b4b%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2245%22 text-anchor=%22middle%22 fill=%22%238b5cf6%22 font-size=%2224%22>🤖</text></svg>';
      item.innerHTML = '<img src="' + thumb + '" alt="' + robot.name + '"><span>' + robot.name + '</span>';

      item.addEventListener('click', function() {
        document.querySelectorAll('.saved-item').forEach(function(i) { i.classList.remove('selected'); });
        item.classList.add('selected');
        selectedSavedRobot = robot;
        updateStep2Button();
      });

      grid.appendChild(item);
    });
  }

  function createRobotFromTemplate(templateId) {
    var state = createDefaultRobotState();
    state.name = 'Robot ' + templateId;

    // Add basic components based on template
    if (templateId === 'singleFollower') {
      state.components.push({
        id: 'color-1',
        name: 'Sensor Color',
        type: 'ColorSensor',
        port: '1',
        position: [0, 0, 10],
        rotation: [0, 0, 0]
      });
    } else if (templateId === 'doubleFollower') {
      state.components.push(
        { id: 'color-1', name: 'Sensor Color Izq', type: 'ColorSensor', port: '1', position: [-3, 0, 10], rotation: [0, 0, 0] },
        { id: 'color-2', name: 'Sensor Color Der', type: 'ColorSensor', port: '2', position: [3, 0, 10], rotation: [0, 0, 0] }
      );
    } else if (templateId === 'mazeRunner') {
      state.components.push(
        { id: 'ultra-1', name: 'Ultrasónico Frontal', type: 'UltrasonicSensor', port: '1', position: [0, 2, 10], rotation: [0, 0, 0] },
        { id: 'ultra-2', name: 'Ultrasónico Izq', type: 'UltrasonicSensor', port: '2', position: [-7, 2, 5], rotation: [0, -90, 0] },
        { id: 'ultra-3', name: 'Ultrasónico Der', type: 'UltrasonicSensor', port: '3', position: [7, 2, 5], rotation: [0, 90, 0] }
      );
    }

    return state;
  }

  // ============================================
  // STEP 3: EDITOR
  // ============================================
  function initEditor() {
    if (!robotState) {
      robotState = createDefaultRobotState();
    }

    robotCanvas = $('robotCanvas');

    // Initialize 3D scene with delay to ensure canvas has dimensions
    setTimeout(function() {
      initRobot3DScene();
      renderRobot3D();
      loadEditorForm();
      renderPartsList();
    }, 100);

    bindEditorEvents();
  }

  function bindEditorEvents() {
    // Chassis controls
    ['chassisW', 'chassisD', 'chassisH', 'chassisY', 'chassisColor', 'chassisMass'].forEach(function(id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', function() {
          syncChassisFromForm();
          renderRobot3D();
        });
      }
    });

    // Wheel controls
    ['wheelRadius', 'wheelWidth'].forEach(function(id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', function() {
          syncWheelsFromForm();
          renderRobot3D();
        });
      }
    });

    // Add part buttons
    document.querySelectorAll('[data-add]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        addPart(btn.dataset.add);
      });
    });

    // Part inspector controls (all fields including new wheel/servo/physics)
    var partFields = [
      'partName', 'partX', 'partY', 'partZ', 'partRX', 'partRY', 'partRZ', 'partPort',
      'partParent', // Hierarchy
      'partSizeW', 'partSizeH', 'partSizeD', 'partColor',
      // Wheel properties
      'wheelRadius', 'wheelWidth', 'wheelPassive',
      // Servo properties
      'servoMinAngle', 'servoMaxAngle', 'servoSpeed', 'servoForce', 'servoContinuous',
      // Physics properties
      'partAttachMode', 'partMass', 'partFriction'
    ];
    partFields.forEach(function(id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', function() {
          syncPartFromForm();
          renderRobot3D();
          renderPartsList();
        });
      }
    });

    // Toolbar buttons
    $('btnDuplicate').addEventListener('click', duplicateSelectedPart);
    $('btnDelete').addEventListener('click', deleteSelectedPart);

    // Dock buttons
    $('robotNameInput').addEventListener('change', function() {
      robotState.name = this.value || 'Mi Robot';
      $('robotNameDisplay').textContent = robotState.name;
    });

    $('btnSave').addEventListener('click', saveRobot);
    $('btnExport').addEventListener('click', exportRobot);
    $('btnTest').addEventListener('click', testRobot);
    $('btnRobotSettings').addEventListener('click', openSettings);

    // Settings modal
    $('btnCloseSettings').addEventListener('click', closeSettings);
    $('btnCancelSettings').addEventListener('click', closeSettings);
    $('btnApplySettings').addEventListener('click', applySettings);

    $('settingsDriftAmount').addEventListener('input', function() {
      $('driftValue').textContent = this.value + '%';
    });

    // Chassis type switching
    $('chassisType').addEventListener('change', function() {
      var isCustom = this.value === 'custom';
      $('chassisBoxSection').classList.toggle('hidden', isCustom);
      $('chassisModelSection').classList.toggle('hidden', !isCustom);
      robotState.chassisType = this.value;
      renderRobot3D();
    });

    // Chassis 3D model loading
    $('chassisModelFile').addEventListener('change', function() {
      loadChassisModel(this.files[0]);
    });

    // Remove chassis model
    if ($('btnRemoveChassisModel')) {
      $('btnRemoveChassisModel').addEventListener('click', function() {
        robotState.chassis.modelURL = null;
        robotState.chassis.modelName = null;
        $('chassisModelInfo').classList.add('hidden');
        $('chassisModelFile').value = '';
        renderRobot3D();
        toast('Modelo eliminado');
      });
    }

    // Model scale change
    $('chassisModelScale').addEventListener('change', function() {
      robotState.chassis.modelScale = parseFloat(this.value) || 1;
      renderRobot3D();
    });

    // Part 3D model loading
    $('partModelFile').addEventListener('change', function() {
      loadPartModel(this.files[0]);
    });

    // Remove part model
    if ($('btnRemovePartModel')) {
      $('btnRemovePartModel').addEventListener('click', function() {
        var part = getSelectedPart();
        if (part && part.options) {
          part.options.modelURL = null;
          part.options.modelName = null;
        }
        $('partModelInfo').classList.add('hidden');
        $('partModelFile').value = '';
        renderRobot3D();
        toast('Modelo eliminado');
      });
    }

    // Part model scale change
    $('partModelScale').addEventListener('change', function() {
      var part = getSelectedPart();
      if (part) {
        if (!part.options) part.options = {};
        part.options.modelScale = parseFloat(this.value) || 1;
        renderRobot3D();
      }
    });
  }

  // Load 3D model for a part
  function loadPartModel(file) {
    if (!file) return;

    var part = getSelectedPart();
    if (!part) {
      toast('Selecciona una pieza primero', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;

      if (!part.options) part.options = {};
      part.options.modelURL = dataUrl;
      part.options.modelName = file.name;
      part.options.modelScale = parseFloat($('partModelScale').value) || 1;

      $('partModelInfo').classList.remove('hidden');
      $('partModelName').textContent = file.name;

      renderRobot3D();
      toast('Modelo cargado: ' + file.name);
    };

    reader.onerror = function() {
      toast('Error al leer el archivo', 'error');
    };

    reader.readAsDataURL(file);
  }

  // Load 3D model for chassis
  function loadChassisModel(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      var extension = file.name.split('.').pop().toLowerCase();
      var dataUrl = e.target.result;

      robotState.chassis.modelURL = dataUrl;
      robotState.chassis.modelName = file.name;
      robotState.chassis.modelScale = parseFloat($('chassisModelScale').value) || 1;
      robotState.chassisType = 'custom';

      $('chassisType').value = 'custom';
      $('chassisBoxSection').classList.add('hidden');
      $('chassisModelSection').classList.remove('hidden');
      $('chassisModelInfo').classList.remove('hidden');
      $('chassisModelName').textContent = file.name;

      renderRobot3D();
      toast('Modelo cargado: ' + file.name);
    };

    reader.onerror = function() {
      toast('Error al leer el archivo', 'error');
    };

    reader.readAsDataURL(file);
  }

  // Render custom 3D chassis model
  function loadCustomChassis(chassis, chassisY) {
    if (!chassis.modelURL) return;

    var extension = (chassis.modelName || 'model.glb').split('.').pop().toLowerCase();
    var scale = chassis.modelScale || 1;

    // Create a placeholder mesh while loading
    var placeholder = BABYLON.MeshBuilder.CreateBox('chassis-placeholder', {
      width: chassis.size[0] * 0.8,
      height: chassis.size[2] * 0.8,
      depth: chassis.size[1] * 0.8
    }, robotScene);
    placeholder.position.y = chassisY;
    var placeholderMat = new BABYLON.StandardMaterial('chassisPlaceholderMat', robotScene);
    placeholderMat.diffuseColor = BABYLON.Color3.FromHexString(chassis.color || '#f09c0d');
    placeholderMat.alpha = 0.5;
    placeholder.material = placeholderMat;
    robotMeshes['chassis'] = placeholder;

    // Convert data URL to blob for loading
    try {
      var byteString = atob(chassis.modelURL.split(',')[1]);
      var mimeType = chassis.modelURL.split(',')[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var blob = new Blob([ab], { type: mimeType });
      var blobUrl = URL.createObjectURL(blob);

      // Determine file type for loader
      var pluginExtension = '.' + extension;
      if (extension === 'glb' || extension === 'gltf') {
        pluginExtension = '.glb';
      }

      BABYLON.SceneLoader.ImportMesh('', '', blobUrl, robotScene, function(meshes) {
        // Remove placeholder
        if (placeholder) {
          placeholder.dispose();
        }

        // Create parent node for all imported meshes
        var chassisRoot = new BABYLON.TransformNode('chassis-root', robotScene);
        chassisRoot.position.y = chassisY;
        chassisRoot.scaling = new BABYLON.Vector3(scale, scale, scale);

        // Parent all imported meshes
        meshes.forEach(function(mesh) {
          mesh.parent = chassisRoot;
          mesh.metadata = { partId: 'chassis' };
        });

        robotMeshes['chassis'] = chassisRoot;
        URL.revokeObjectURL(blobUrl);
        console.log('[STBlock Robot Builder] Modelo de chasis cargado:', chassis.modelName);
      }, null, function(scene, message, exception) {
        console.error('[STBlock Robot Builder] Error al cargar modelo:', message, exception);
        toast('Error al renderizar modelo 3D', 'error');
        URL.revokeObjectURL(blobUrl);
      }, pluginExtension);
    } catch (e) {
      console.error('[STBlock Robot Builder] Error procesando modelo:', e);
      toast('Error al procesar modelo 3D', 'error');
    }
  }

  // Load custom 3D model for a part
  function loadCustomPartModel(comp, opts, root) {
    if (!opts.modelURL) return;

    var extension = (opts.modelName || 'model.glb').split('.').pop().toLowerCase();
    var scale = opts.modelScale || 1;

    // Create a placeholder mesh while loading
    var darkMat = previewMaterial('previewDarkMat', '#262626');
    var placeholder = BABYLON.MeshBuilder.CreateBox(comp.id + '-placeholder', {
      width: 2, height: 2, depth: 2
    }, robotScene);
    placeholder.material = darkMat;
    placeholder.parent = root;

    // Convert data URL to blob for loading
    try {
      var byteString = atob(opts.modelURL.split(',')[1]);
      var mimeType = opts.modelURL.split(',')[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var blob = new Blob([ab], { type: mimeType });
      var blobUrl = URL.createObjectURL(blob);

      // Determine file type for loader
      var pluginExtension = '.' + extension;
      if (extension === 'glb' || extension === 'gltf') {
        pluginExtension = '.glb';
      }

      BABYLON.SceneLoader.ImportMesh('', '', blobUrl, robotScene, function(meshes) {
        // Remove placeholder
        if (placeholder) {
          placeholder.dispose();
        }

        // Parent all imported meshes to root and apply scale
        meshes.forEach(function(mesh) {
          mesh.parent = root;
          mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
          mesh.metadata = Object.assign({}, mesh.metadata, { partId: comp.id });
          if (selectedPartId === comp.id) {
            mesh.showBoundingBox = true;
          }
        });

        URL.revokeObjectURL(blobUrl);
        console.log('[STBlock Robot Builder] Modelo de pieza cargado:', opts.modelName);
      }, null, function(scene, message, exception) {
        console.error('[STBlock Robot Builder] Error al cargar modelo de pieza:', message, exception);
        URL.revokeObjectURL(blobUrl);
      }, pluginExtension);
    } catch (e) {
      console.error('[STBlock Robot Builder] Error procesando modelo de pieza:', e);
    }
  }

  function loadEditorForm() {
    // Chassis type
    var chassisType = robotState.chassisType || 'box';
    $('chassisType').value = chassisType;
    $('chassisBoxSection').classList.toggle('hidden', chassisType === 'custom');
    $('chassisModelSection').classList.toggle('hidden', chassisType !== 'custom');

    // Chassis parametric size
    $('chassisW').value = robotState.chassis.size[0];
    $('chassisD').value = robotState.chassis.size[1];
    $('chassisH').value = robotState.chassis.size[2];
    $('chassisY').value = robotState.chassis.yOffset || 0;
    $('chassisColor').value = robotState.chassis.color || '#f09c0d';
    $('chassisMass').value = robotState.chassis.mass || 120;

    // Chassis custom model
    if (robotState.chassis.modelURL) {
      $('chassisModelInfo').classList.remove('hidden');
      $('chassisModelName').textContent = robotState.chassis.modelName || 'modelo.glb';
      $('chassisModelScale').value = robotState.chassis.modelScale || 1;
    } else {
      $('chassisModelInfo').classList.add('hidden');
    }

    if (robotState.wheels.length > 0) {
      $('wheelRadius').value = robotState.wheels[0].radius || 4;
      $('wheelWidth').value = robotState.wheels[0].width || 2;
    }

    $('robotNameInput').value = robotState.name;
    $('robotNameDisplay').textContent = robotState.name;
  }

  function syncChassisFromForm() {
    robotState.chassis.size = [
      parseFloat($('chassisW').value) || 15,
      parseFloat($('chassisD').value) || 20,
      parseFloat($('chassisH').value) || 8
    ];
    robotState.chassis.yOffset = parseFloat($('chassisY').value) || 0;
    robotState.chassis.color = $('chassisColor').value;
    robotState.chassis.mass = parseFloat($('chassisMass').value) || 120;
  }

  function syncWheelsFromForm() {
    var radius = parseFloat($('wheelRadius').value) || 4;
    var width = parseFloat($('wheelWidth').value) || 2;
    robotState.wheels.forEach(function(wheel) {
      wheel.radius = radius;
      wheel.width = width;
    });
  }

  // ============================================
  // ADD / REMOVE PARTS
  // ============================================
  function addPart(partKey) {
    var info = partTypes[partKey];
    if (!info) {
      toast('Tipo de pieza desconocido', 'error');
      return;
    }

    var board = boardData[robotState.boardType] || boardData.stbBoardV2;
    var ports = info.category === 'sensor' ? board.sensorPorts : board.motorPorts;
    var usedPorts = getAllUsedPorts();
    var availablePort = ports.find(function(p) { return usedPorts.indexOf(p) === -1; }) || ports[0];

    // Calcular posición inicial visible (al frente del robot)
    var chassisLength = robotState.chassis.size[1] || 20;
    var chassisHeight = robotState.chassis.size[2] || 8;
    var initialPos = [0, chassisHeight / 2 + 2, chassisLength / 2 + 5]; // Al frente y arriba

    var newPart = {
      id: 'part-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: info.name,
      type: info.type,
      port: availablePort,
      position: initialPos,
      rotation: [0, 0, 0],
      options: info.options ? JSON.parse(JSON.stringify(info.options)) : {},
      pins: {}  // Configuración de pines Arduino realista
    };

    // Asignar pines predeterminados según el tipo de componente
    var pinDef = getComponentPinDefinition(info.type);
    if (pinDef && pinDef.pins && pinDef.pins.length > 0) {
      newPart.pins = getDefaultPinsForComponent(info.type, robotState.boardType);
      // Para compatibilidad, usar el primer pin requerido como puerto principal
      var firstRequiredPin = pinDef.pins.find(function(p) { return p.required; });
      if (firstRequiredPin && newPart.pins[firstRequiredPin.id]) {
        newPart.port = newPart.pins[firstRequiredPin.id];
      }
      console.log('[STBlock Robot Builder] Pines asignados para ' + info.type + ':', newPart.pins);
    }

    // Asignar preset de servo si corresponde (para cargar modelos 3D)
    if (partKey.indexOf('servo-') === 0) {
      var preset = getInstalledPiecePreset(partKey);
      if (preset) {
        newPart.customPresetId = partKey;
        newPart.customPreset = JSON.parse(JSON.stringify(preset));
        if (!newPart.options) newPart.options = {};
        newPart.options.customPresetId = partKey;
        newPart.options.customPreset = newPart.customPreset;
        console.log('[STBlock Robot Builder] Asignado preset de servo:', partKey);
      }
    }

    // Special positioning for certain types
    if (partKey === 'wheel-left') {
      newPart.position = [-robotState.chassis.size[0] / 2 - 1, 0, 0];
    } else if (partKey === 'wheel-right') {
      newPart.position = [robotState.chassis.size[0] / 2 + 1, 0, 0];
    } else if (info.category === 'structural') {
      newPart.size = [4, 4, 4];
      newPart.color = '#6366f1';
      newPart.position = [0, chassisHeight + 4, 0]; // Encima del chasis
    } else if (info.category === 'sensor') {
      // Sensores al frente del robot
      newPart.position = [0, chassisHeight / 2, chassisLength / 2 + 3];
    } else if (info.category === 'actuator') {
      // Actuadores encima del chasis
      newPart.position = [0, chassisHeight + 2, 0];
    }

    robotState.components.push(newPart);
    selectedPartId = newPart.id;

    renderPartsList();
    selectPart(newPart.id);
    renderRobot3D();
    toast('Pieza agregada: ' + info.name, 'success');
  }

  function getAllUsedPorts() {
    var ports = [];
    robotState.wheels.forEach(function(w) { if (w.port) ports.push(w.port); });
    robotState.components.forEach(function(c) { if (c.port) ports.push(c.port); });
    return ports;
  }

  function duplicateSelectedPart() {
    var part = getSelectedPart();
    if (!part || part.id.startsWith('wheel-')) {
      toast('No se puede duplicar esta pieza');
      return;
    }

    var copy = JSON.parse(JSON.stringify(part));
    copy.id = 'part-' + Date.now();
    copy.name += ' (copia)';
    copy.position[0] += 2;

    robotState.components.push(copy);
    selectedPartId = copy.id;
    renderPartsList();
    selectPart(copy.id);
    renderRobot3D();
    toast('Pieza duplicada');
  }

  function deleteSelectedPart() {
    if (!selectedPartId) return;

    if (selectedPartId.startsWith('wheel-')) {
      toast('Las ruedas base no se pueden eliminar');
      return;
    }

    robotState.components = robotState.components.filter(function(c) {
      return c.id !== selectedPartId;
    });

    selectedPartId = null;
    renderPartsList();
    selectPart(null);
    renderRobot3D();
    toast('Pieza eliminada');
  }

  // ============================================
  // PART SELECTION & INSPECTOR
  // ============================================
  function getSelectedPart() {
    if (!selectedPartId) return null;
    if (selectedPartId.startsWith('wheel-')) {
      return robotState.wheels.find(function(w) { return w.id === selectedPartId; });
    }
    return robotState.components.find(function(c) { return c.id === selectedPartId; });
  }

  // ============================================
  // PIN CONFIGURATION UI
  // ============================================
  function renderPinConfigUI(part, pinDef) {
    var container = $('pinConfigFields');
    container.innerHTML = '';

    // Show component chip
    $('pinComponentChip').textContent = pinDef.realComponent || pinDef.name;

    // Get board data
    var board = boardData[robotState.boardType] || boardData.stbBoardV2;
    var usedPins = getAllUsedPins();

    // Remove this component's pins from used list (so they appear as available)
    if (part.pins) {
      Object.values(part.pins).forEach(function(pin) {
        var idx = usedPins.indexOf(pin);
        if (idx > -1) usedPins.splice(idx, 1);
      });
    }

    // Render each pin field
    pinDef.pins.forEach(function(pinInfo) {
      if (!pinInfo.required && !part.pins[pinInfo.id]) {
        // Skip optional pins that aren't configured yet
        // Could add a "+ Add optional pin" button later
      }

      var row = document.createElement('div');
      row.className = 'pin-field-row';

      // Determine which ports to show based on pin type
      var pinCategory = pinTypeToPortCategory[pinInfo.type] || 'digitalPins';
      var availablePorts = board[pinCategory] || board.digitalPins || [];

      // Get I2C and serial standard pins
      var i2cPins = board.i2cPins || boardI2CPins[robotState.boardType];
      var serialPins = board.serialPins;
      var isI2C = pinInfo.type === 'i2c-data' || pinInfo.type === 'i2c-clock';
      var isSerial = pinInfo.type === 'serial-rx' || pinInfo.type === 'serial-tx';

      // Sort ports to put standard pins first for I2C and serial
      var sortedPorts = availablePorts.slice(); // Clone array
      if (isI2C && i2cPins) {
        var stdPin = pinInfo.type === 'i2c-data' ? i2cPins.sda : i2cPins.scl;
        var stdIdx = sortedPorts.indexOf(stdPin);
        if (stdIdx > 0) {
          sortedPorts.splice(stdIdx, 1);
          sortedPorts.unshift(stdPin);
        }
      }
      if (isSerial && serialPins) {
        var stdPin = pinInfo.type === 'serial-rx' ? serialPins.rx : serialPins.tx;
        var stdIdx = sortedPorts.indexOf(stdPin);
        if (stdIdx > 0) {
          sortedPorts.splice(stdIdx, 1);
          sortedPorts.unshift(stdPin);
        }
      }

      // Build select options
      var options = '<option value="">Seleccionar...</option>';
      sortedPorts.forEach(function(port) {
        var isUsed = usedPins.indexOf(port) > -1;
        var isSelected = part.pins && part.pins[pinInfo.id] === port;
        var label = port;

        // Add hint for standard pins
        if (isI2C && i2cPins) {
          if ((pinInfo.type === 'i2c-data' && port === i2cPins.sda) ||
              (pinInfo.type === 'i2c-clock' && port === i2cPins.scl)) {
            label += ' (estándar)';
          }
        }
        if (isSerial && serialPins) {
          if ((pinInfo.type === 'serial-rx' && port === serialPins.rx) ||
              (pinInfo.type === 'serial-tx' && port === serialPins.tx)) {
            label += ' (estándar)';
          }
        }

        if (isUsed && !isSelected) {
          label += ' (en uso)';
        }

        options += '<option value="' + port + '"' +
          (isSelected ? ' selected' : '') +
          (isUsed && !isSelected ? ' class="used-pin"' : '') +
          '>' + label + '</option>';
      });

      // Pin type badge
      var typeLabel = pinInfo.type.replace('digital-', 'D-').replace('analog-', 'A-').replace('pwm-', 'PWM ').replace('serial-', 'Ser ').replace('i2c-', 'I2C ');

      row.innerHTML =
        '<label>' +
          '<span class="pin-field-label">' +
            '<span class="pin-name">' + pinInfo.name + '</span>' +
            '<span class="pin-type">' + typeLabel + '</span>' +
            (pinInfo.required ? '' : '<span class="pin-optional">(opcional)</span>') +
          '</span>' +
          '<select id="pin_' + pinInfo.id + '" data-pin-id="' + pinInfo.id + '">' +
            options +
          '</select>' +
          '<span class="pin-field-description">' + (pinInfo.description || '') + '</span>' +
        '</label>';

      container.appendChild(row);

      // Add change listener
      row.querySelector('select').addEventListener('change', function() {
        syncPinsFromForm();
        checkPinConflicts();
        renderRobot3D();
      });
    });

    // Render help content
    var helpContent = $('pinHelpContent');
    helpContent.innerHTML = '';

    if (pinDef.arduinoCode) {
      helpContent.innerHTML += '<strong>Código Arduino:</strong><code>' + pinDef.arduinoCode + '</code>';
    }
    if (pinDef.datasheet) {
      helpContent.innerHTML += '<div class="datasheet">' + pinDef.datasheet + '</div>';
    }

    // Check for conflicts
    checkPinConflicts();
  }

  function syncPinsFromForm() {
    var part = getSelectedPart();
    if (!part) return;

    var pinDef = getComponentPinDefinition(part.type);
    if (!pinDef || !pinDef.pins) return;

    if (!part.pins) part.pins = {};

    pinDef.pins.forEach(function(pinInfo) {
      var select = $('pin_' + pinInfo.id);
      if (select) {
        part.pins[pinInfo.id] = select.value || null;
      }
    });

    // Update main port for compatibility (use first required pin)
    var firstRequired = pinDef.pins.find(function(p) { return p.required; });
    if (firstRequired && part.pins[firstRequired.id]) {
      part.port = part.pins[firstRequired.id];
    }

    console.log('[STBlock Robot Builder] Pines actualizados:', part.pins);
  }

  function checkPinConflicts() {
    var conflicts = validatePinConflicts();
    var warningEl = $('pinConflictWarning');
    var textEl = $('pinConflictText');

    if (conflicts.length > 0) {
      var messages = conflicts.map(function(c) {
        var users = c.usedBy.map(function(u) { return u.component + ' (' + u.pinName + ')'; }).join(', ');
        return 'Pin ' + c.pin + ' usado por: ' + users;
      });
      textEl.textContent = messages.join('; ');
      warningEl.classList.remove('hidden');

      // Mark conflicting selects
      document.querySelectorAll('#pinConfigFields select').forEach(function(sel) {
        var value = sel.value;
        var hasConflict = conflicts.some(function(c) { return c.pin === value; });
        sel.classList.toggle('conflict', hasConflict);
      });
    } else {
      warningEl.classList.add('hidden');
      document.querySelectorAll('#pinConfigFields select').forEach(function(sel) {
        sel.classList.remove('conflict');
      });
    }
  }

  function selectPart(id) {
    selectedPartId = id;

    // Update list selection
    document.querySelectorAll('.part-item').forEach(function(el) {
      el.classList.toggle('selected', el.dataset.id === id);
    });

    // Update inspector
    var part = getSelectedPart();
    if (!part) {
      $('inspectorEmpty').classList.remove('hidden');
      $('inspectorContent').classList.add('hidden');
      return;
    }

    $('inspectorEmpty').classList.add('hidden');
    $('inspectorContent').classList.remove('hidden');

    $('partName').value = part.name || '';
    $('partType').value = part.type || '';
    $('partX').value = part.position ? part.position[0] : 0;
    $('partY').value = part.position ? part.position[1] : 0;
    $('partZ').value = part.position ? part.position[2] : 0;
    $('partRX').value = part.rotation ? part.rotation[0] : 0;
    $('partRY').value = part.rotation ? part.rotation[1] : 0;
    $('partRZ').value = part.rotation ? part.rotation[2] : 0;

    // Port selector
    var board = boardData[robotState.boardType] || boardData.stbBoardV2;
    var isSensor = part.type && part.type.indexOf('Sensor') !== -1;
    var ports = isSensor ? board.sensorPorts : board.motorPorts;

    var portSelect = $('partPort');
    portSelect.innerHTML = '<option value="">Sin asignar</option>';
    ports.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      if (p === part.port) opt.selected = true;
      portSelect.appendChild(opt);
    });

    // Pin Configuration Section (Arduino realistic)
    var pinDef = getComponentPinDefinition(part.type);
    var hasPinConfig = pinDef && pinDef.pins && pinDef.pins.length > 0;

    console.log('[STBlock Robot Builder] selectPart - type:', part.type, 'pinDef:', pinDef, 'hasPinConfig:', hasPinConfig);

    // Ocultar puerto simple si hay configuración de pines múltiples
    var portSection = $('partPortSection');
    var pinSection = $('partPinConfigSection');

    if (portSection) {
      portSection.classList.toggle('hidden', hasPinConfig);
    }
    if (pinSection) {
      pinSection.classList.toggle('hidden', !hasPinConfig);
    }

    if (hasPinConfig && pinSection) {
      renderPinConfigUI(part, pinDef);
    }

    // Parent selector (for components, not wheels)
    var isComponent = !part.id.startsWith('wheel-');
    $('partParentSection').classList.toggle('hidden', !isComponent);
    if (isComponent) {
      var parentSelect = $('partParent');
      parentSelect.innerHTML = '<option value="chassis">Chasis (raíz)</option>';

      // Add other components as potential parents (except self)
      robotState.components.forEach(function(comp) {
        if (comp.id !== part.id) {
          var opt = document.createElement('option');
          opt.value = comp.id;
          opt.textContent = comp.name || comp.type;
          if (comp.id === part.parentId) opt.selected = true;
          parentSelect.appendChild(opt);
        }
      });

      // Set current parent
      if (!part.parentId || part.parentId === 'chassis') {
        parentSelect.value = 'chassis';
      }
    }

    // Size section for structural parts
    var isStructural = part.type === 'Box' || part.type === 'Cylinder' || part.type === 'Sphere';
    $('partSizeSection').classList.toggle('hidden', !isStructural);
    if (isStructural) {
      $('partSizeW').value = (part.options && part.options.width) || (part.size && part.size[0]) || 4;
      $('partSizeH').value = (part.options && part.options.height) || (part.size && part.size[1]) || 4;
      $('partSizeD').value = (part.options && part.options.depth) || (part.size && part.size[2]) || 4;
      $('partColor').value = (part.options && part.options.color) || part.color || '#6366f1';
    }

    // Wheel section
    var isWheel = part.type === 'WheelDrive' || part.type === 'WheelPassive';
    $('partWheelSection').classList.toggle('hidden', !isWheel);
    if (isWheel) {
      var opts = part.options || {};
      $('wheelRadius').value = opts.radius || part.radius || 4;
      $('wheelWidth').value = opts.width || part.width || 2;
      $('wheelPassive').checked = part.type === 'WheelPassive' || opts.passive || false;
    }

    // Servo section
    var isServo = part.type === 'ServoMotor';
    $('partServoSection').classList.toggle('hidden', !isServo);
    if (isServo) {
      var opts = part.options || {};
      $('servoMinAngle').value = opts.minAngle !== undefined ? opts.minAngle : -90;
      $('servoMaxAngle').value = opts.maxAngle !== undefined ? opts.maxAngle : 90;
      $('servoSpeed').value = opts.speed || 90;
      $('servoForce').value = opts.force || 150;
      $('servoContinuous').checked = opts.continuous || false;
    }

    // Physics section (for structural, actuators)
    var showPhysics = isStructural || part.type === 'ServoMotor' || part.type === 'LinearActuator' || part.type === 'MagnetActuator';
    $('partPhysicsSection').classList.toggle('hidden', !showPhysics);
    if (showPhysics) {
      var opts = part.options || {};
      $('partAttachMode').value = opts.attachMode || 'fixed';
      $('partMass').value = opts.mass || 50;
      $('partFriction').value = opts.friction !== undefined ? opts.friction : 0.5;
    }

    // Custom 3D model section (for structural parts, servos, actuators)
    var showModel = isStructural || part.type === 'ServoMotor' || part.type === 'LinearActuator' || part.type === 'MagnetActuator';
    $('partModelSection').classList.toggle('hidden', !showModel);
    if (showModel) {
      var opts = part.options || {};
      $('partModelScale').value = opts.modelScale || 1;
      if (opts.modelURL) {
        $('partModelInfo').classList.remove('hidden');
        $('partModelName').textContent = opts.modelName || 'modelo.glb';
      } else {
        $('partModelInfo').classList.add('hidden');
      }
      $('partModelFile').value = ''; // Reset file input
    }

    // Highlight mesh in 3D
    highlightPartMesh(id);
  }

  function syncPartFromForm() {
    var part = getSelectedPart();
    if (!part) return;

    part.name = $('partName').value || part.name;
    part.position = [
      parseFloat($('partX').value) || 0,
      parseFloat($('partY').value) || 0,
      parseFloat($('partZ').value) || 0
    ];
    part.rotation = [
      parseFloat($('partRX').value) || 0,
      parseFloat($('partRY').value) || 0,
      parseFloat($('partRZ').value) || 0
    ];
    part.port = $('partPort').value;

    // Sync pins if pin configuration is visible
    var pinDef = getComponentPinDefinition(part.type);
    if (pinDef && pinDef.pins && pinDef.pins.length > 0) {
      syncPinsFromForm();
    }

    // Parent ID (for hierarchy)
    var isComponent = !part.id.startsWith('wheel-');
    if (isComponent) {
      var parentValue = $('partParent').value;
      part.parentId = (parentValue === 'chassis' || !parentValue) ? null : parentValue;
    }

    // Ensure options object exists
    if (!part.options) part.options = {};

    // Structural parts
    var isStructural = part.type === 'Box' || part.type === 'Cylinder' || part.type === 'Sphere';
    if (isStructural) {
      part.options.width = parseFloat($('partSizeW').value) || 4;
      part.options.height = parseFloat($('partSizeH').value) || 4;
      part.options.depth = parseFloat($('partSizeD').value) || 4;
      part.options.color = $('partColor').value;
      // Legacy support
      part.size = [part.options.width, part.options.height, part.options.depth];
      part.color = part.options.color;
    }

    // Wheel properties
    var isWheel = part.type === 'WheelDrive' || part.type === 'WheelPassive';
    if (isWheel) {
      part.options.radius = parseFloat($('wheelRadius').value) || 4;
      part.options.width = parseFloat($('wheelWidth').value) || 2;
      part.options.passive = $('wheelPassive').checked;
      // Legacy support
      part.radius = part.options.radius;
      part.width = part.options.width;
      // Change type if passive checkbox changed
      if ($('wheelPassive').checked && part.type === 'WheelDrive') {
        part.type = 'WheelPassive';
        $('partType').value = 'WheelPassive';
      } else if (!$('wheelPassive').checked && part.type === 'WheelPassive') {
        part.type = 'WheelDrive';
        $('partType').value = 'WheelDrive';
      }
    }

    // Servo properties
    var isServo = part.type === 'ServoMotor';
    if (isServo) {
      part.options.minAngle = parseFloat($('servoMinAngle').value) || -90;
      part.options.maxAngle = parseFloat($('servoMaxAngle').value) || 90;
      part.options.speed = parseFloat($('servoSpeed').value) || 90;
      part.options.force = parseFloat($('servoForce').value) || 150;
      part.options.continuous = $('servoContinuous').checked;
    }

    // Physics properties
    var showPhysics = isStructural || part.type === 'ServoMotor' || part.type === 'LinearActuator' || part.type === 'MagnetActuator';
    if (showPhysics) {
      part.options.attachMode = $('partAttachMode').value;
      part.options.mass = parseFloat($('partMass').value) || 50;
      part.options.friction = parseFloat($('partFriction').value) || 0.5;
    }
  }

  function renderPartsList() {
    var list = $('partsList');
    list.innerHTML = '';

    var allParts = robotState.wheels.concat(robotState.components);
    $('partsCount').textContent = allParts.length;

    allParts.forEach(function(part) {
      var info = Object.values(partTypes).find(function(p) { return p.type === part.type; }) || { icon: '📦' };

      // Generate pin summary
      var pinSummary = '';
      if (part.pins && Object.keys(part.pins).length > 0) {
        var pinValues = Object.values(part.pins).filter(function(v) { return v; });
        pinSummary = pinValues.length > 0 ? pinValues.join(', ') : '';
      } else if (part.port) {
        pinSummary = part.port;
      }

      var item = document.createElement('div');
      item.className = 'part-item' + (part.id === selectedPartId ? ' selected' : '');
      item.dataset.id = part.id;
      item.innerHTML = '<span class="part-icon">' + info.icon + '</span><span class="part-name">' + part.name + '</span><span class="part-type">' + pinSummary + '</span>';

      item.addEventListener('click', function() {
        selectPart(part.id);
      });

      list.appendChild(item);
    });
  }

  // ============================================
  // 3D SCENE
  // ============================================
  function initRobot3DScene() {
    if (robotEngine) return; // Already initialized

    // Check if Babylon.js is loaded
    if (typeof BABYLON === 'undefined') {
      console.error('[STBlock Robot Builder] Babylon.js no está cargado');
      toast('Error: Motor 3D no disponible', 'error');
      return;
    }

    console.log('[STBlock Robot Builder] Inicializando escena 3D...');

    try {
      robotEngine = new BABYLON.Engine(robotCanvas, true, { disableWebGL2Support: true });
      robotScene = new BABYLON.Scene(robotEngine);
      robotScene.clearColor = new BABYLON.Color4(0.92, 0.96, 0.92, 1); // Light green background

      robotCamera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 3, 40, BABYLON.Vector3.Zero(), robotScene);
      robotCamera.attachControl(robotCanvas, true);
      robotCamera.wheelPrecision = 20;
      robotCamera.minZ = 0.1;

      // Lights
      var hemiLight = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), robotScene);
      hemiLight.intensity = 0.7;
      var dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, 0.5), robotScene);
      dirLight.intensity = 0.5;

      // Grid
      var grid = BABYLON.MeshBuilder.CreateGround('grid', { width: 100, height: 100, subdivisions: 20 }, robotScene);
      var gridMat = new BABYLON.StandardMaterial('gridMat', robotScene);
      gridMat.wireframe = true;
      gridMat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.45); // Green grid
      grid.material = gridMat;

      // Bind drag handlers
      bindDragHandlers();

      // Render loop
      robotEngine.runRenderLoop(function() {
        robotScene.render();
      });

      // Resize handler
      window.addEventListener('resize', function() {
        if (robotEngine) robotEngine.resize();
      });

      console.log('[STBlock Robot Builder] Escena 3D inicializada');
    } catch (error) {
      console.error('[STBlock Robot Builder] Error al inicializar escena 3D:', error);
      toast('Error al cargar visor 3D: ' + error.message, 'error');
    }
  }

  // ============================================
  // DRAG HANDLERS - Arrastrar piezas con el mouse
  // ============================================
  function bindDragHandlers() {
    if (!robotCanvas || robotCanvas.dataset.dragBound === 'yes') return;
    robotCanvas.dataset.dragBound = 'yes';

    // Pointer down - iniciar selección o arrastre
    robotCanvas.addEventListener('pointerdown', function(event) {
      if (!robotScene || event.button !== 0) return;

      var hit = pickPart(event);
      if (!hit || !hit.part) return;

      event.preventDefault();
      selectPart(hit.part.id);
      startDrag(hit.part, event);
    });

    // Pointer move - arrastrar pieza
    robotCanvas.addEventListener('pointermove', function(event) {
      if (!draggingPart) return;
      event.preventDefault();
      moveDrag(event);
    });

    // Pointer up - soltar pieza
    window.addEventListener('pointerup', function() {
      stopDrag();
    });

    // Cambiar cursor al pasar sobre piezas
    robotCanvas.addEventListener('pointermove', function(event) {
      if (draggingPart) return;
      var hit = pickPart(event);
      robotCanvas.style.cursor = hit && hit.part ? 'grab' : 'default';
    });
  }

  function getPartFromMesh(mesh) {
    var current = mesh;
    while (current) {
      if (current.metadata && current.metadata.partId) {
        var id = current.metadata.partId;
        // Buscar en ruedas y componentes
        var allParts = (robotState.wheels || []).concat(robotState.components || []);
        return allParts.find(function(p) { return p.id === id; }) || null;
      }
      current = current.parent;
    }
    return null;
  }

  function pickPart(event) {
    if (!robotScene || !robotCanvas) return null;

    var rect = robotCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var pick = robotScene.pick(x, y, function(mesh) {
      return mesh && mesh.name !== 'grid' && mesh.name !== 'chassis' && getPartFromMesh(mesh) !== null;
    });

    if (!pick || !pick.hit || !pick.pickedMesh) return null;

    var part = getPartFromMesh(pick.pickedMesh);
    return part ? { part: part, point: pick.pickedPoint } : null;
  }

  function pointerToPlane(event, planeY) {
    var rect = robotCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var ray = robotScene.createPickingRay(x, y, BABYLON.Matrix.Identity(), robotCamera);
    var plane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, planeY, 0), BABYLON.Axis.Y);
    var distance = ray.intersectsPlane(plane);

    if (distance == null) return null;
    return ray.origin.add(ray.direction.scale(distance));
  }

  function startDrag(part, event) {
    if (!part || !part.position) return;

    dragPartId = part.id;
    dragPlaneY = Number(part.position[1]) || 0;

    var point = pointerToPlane(event, dragPlaneY);
    if (!point) return;

    dragOffset = new BABYLON.Vector3(
      part.position[0] - point.x,
      0,
      part.position[2] - point.z
    );

    draggingPart = true;

    // Desactivar rotación de cámara mientras arrastramos
    if (robotCamera) robotCamera.detachControl(robotCanvas);
    robotCanvas.style.cursor = 'grabbing';
  }

  function moveDrag(event) {
    if (!draggingPart || !dragPartId) return;

    var part = getSelectedPart();
    if (!part || part.id !== dragPartId) return;

    var point = pointerToPlane(event, dragPlaneY);
    if (!point) return;

    // Actualizar posición
    part.position[0] = Number((point.x + dragOffset.x).toFixed(2));
    part.position[2] = Number((point.z + dragOffset.z).toFixed(2));

    // Actualizar UI del inspector
    updatePartPositionUI(part);

    // Actualizar mesh en 3D
    updatePartMeshPosition(part);
  }

  function stopDrag() {
    if (!draggingPart) return;

    draggingPart = false;
    dragPartId = null;
    dragOffset = null;

    robotCanvas.style.cursor = 'default';

    // Reactivar control de cámara
    if (robotCamera) robotCamera.attachControl(robotCanvas, true);

    renderPartsList();
  }

  function updatePartPositionUI(part) {
    if (!part || part.id !== selectedPartId) return;

    var partX = $('partX');
    var partY = $('partY');
    var partZ = $('partZ');

    if (partX) partX.value = part.position[0];
    if (partY) partY.value = part.position[1];
    if (partZ) partZ.value = part.position[2];
  }

  function updatePartMeshPosition(part) {
    if (!robotScene || !part) return;

    // Calcular offset Y del chasis
    var chassis = robotState.chassis;
    var chassisY = (chassis.yOffset || 0) + chassis.size[2] / 2;

    // Buscar el pivot o mesh de la pieza
    var pivot = robotScene.getTransformNodeByName('pivot-' + part.id);
    if (pivot) {
      pivot.position.x = part.position[0];
      pivot.position.y = chassisY + part.position[1];
      pivot.position.z = part.position[2];
      return;
    }

    // Si no hay pivot, buscar mesh directo
    var mesh = robotMeshes[part.id];
    if (mesh) {
      mesh.position.x = part.position[0];
      // Para ruedas, usar altura directa; para componentes, sumar offset del chasis
      if (part.id && part.id.indexOf('wheel') === 0) {
        mesh.position.y = (chassis.yOffset || 0) + (part.radius || 4);
      } else {
        mesh.position.y = chassisY + part.position[1];
      }
      mesh.position.z = part.position[2];
    }
  }

  // ============================================
  // FUNCIONES DE RENDERIZADO 3D REALISTA
  // ============================================

  // Cache de materiales para no recrearlos
  function previewMaterial(name, color) {
    var mat = robotScene.getMaterialByName(name);
    if (!mat) {
      mat = new BABYLON.StandardMaterial(name, robotScene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(color);
      mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.18);
    }
    return mat;
  }

  // Crear nodo raíz para una pieza
  function createPartPreviewRoot(comp, pivot) {
    var root = new BABYLON.TransformNode(comp.id, robotScene);
    root.parent = pivot;
    root.metadata = { partId: comp.id };
    robotMeshes[comp.id] = root;
    return root;
  }

  // Aplicar mesh a una pieza con material y bounding box
  function applyPartPreviewMesh(mesh, comp, root, material) {
    mesh.parent = root;
    mesh.metadata = Object.assign({}, mesh.metadata, { partId: comp.id });
    if (material) mesh.material = material;
    if (selectedPartId === comp.id) mesh.showBoundingBox = true;
    return mesh;
  }

  // ============================================
  // FUNCIONES PARA PRESETS CON MODELOS 3D
  // ============================================

  function vectorFromArray(arr, defaultArr) {
    var d = defaultArr || [0, 0, 0];
    if (!arr || !Array.isArray(arr)) return new BABYLON.Vector3(d[0], d[1], d[2]);
    return new BABYLON.Vector3(
      Number(arr[0]) || d[0],
      Number(arr[1]) || d[1],
      Number(arr[2]) || d[2]
    );
  }

  function applyPresetSegmentTransform(segment, node) {
    node.position = vectorFromArray(segment.position, [0, 0, 0]);
    var rotation = segment.rotation || [0, 0, 0];
    node.rotation = new BABYLON.Vector3(
      (Number(rotation[0]) || 0) * Math.PI / 180,
      (Number(rotation[1]) || 0) * Math.PI / 180,
      (Number(rotation[2]) || 0) * Math.PI / 180
    );
    var scale = Number(segment.scale) || 1;
    node.scaling = new BABYLON.Vector3(scale, scale, scale);
  }

  function createPresetPivotedNode(comp, segment, parent) {
    var baseRoot = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-base', robotScene);
    baseRoot.parent = parent;
    baseRoot.metadata = { partId: comp.id };
    applyPresetSegmentTransform(segment, baseRoot);

    var pivotNode = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-pivot', robotScene);
    pivotNode.parent = baseRoot;
    pivotNode.position = vectorFromArray(segment.pivot, [0, 0, 0]);
    pivotNode.metadata = { partId: comp.id };
    return {
      base: baseRoot,
      pivot: pivotNode,
      visualOffset: vectorFromArray(segment.pivot, [0, 0, 0]).scale(-1)
    };
  }

  function createCustomPiecePresetPreview(comp, root) {
    var preset = comp.customPreset || (comp.options && comp.options.customPreset) || {};
    var segments = preset.segments || [];

    console.log('[STBlock Robot Builder] Renderizando preset con modelos 3D:', {
      id: comp.id,
      name: comp.name,
      presetId: preset.id || comp.customPresetId,
      segments: segments.length
    });

    if (!segments.length) {
      // Fallback: caja genérica si no hay segmentos
      applyPartPreviewMesh(
        BABYLON.MeshBuilder.CreateBox(comp.id + '-preset-empty', {width: 4, height: 3, depth: 4}, robotScene),
        comp, root,
        previewMaterial('previewPresetMat', '#38BDF8')
      );
      return root;
    }

    segments.forEach(function(segment, index) {
      var segMat = previewMaterial(
        'previewPresetSegmentMat-' + (segment.color || '#38BDF8').replace('#', ''),
        segment.color || (index === 0 ? '#2f8cff' : '#F59E0B')
      );

      var pivoted = createPresetPivotedNode(comp, segment, root);

      // Crear fallback mientras carga el modelo
      var fallback;
      if (segment.role === 'linear') {
        fallback = BABYLON.MeshBuilder.CreateBox(comp.id + '-' + segment.id + '-fallback', {width: 3, height: 3, depth: 9}, robotScene);
      } else if (segment.role === 'rotary' || segment.role === 'continuous') {
        fallback = BABYLON.MeshBuilder.CreateCylinder(comp.id + '-' + segment.id + '-fallback', {diameter: 4, height: 8, tessellation: 32}, robotScene);
        fallback.rotation.z = Math.PI / 2;
      } else {
        fallback = BABYLON.MeshBuilder.CreateBox(comp.id + '-' + segment.id + '-fallback', {width: 12, height: 6, depth: 8}, robotScene);
      }
      fallback.position = pivoted.visualOffset;
      applyPartPreviewMesh(fallback, comp, pivoted.pivot, segMat);

      // Cargar modelo 3D si existe
      if (!segment.modelURL) return;

      var url = segment.modelURL;
      var slash = url.lastIndexOf('/');
      var rootUrl = slash >= 0 ? url.slice(0, slash + 1) : '';
      var file = slash >= 0 ? url.slice(slash + 1) : url;

      console.log('[STBlock Robot Builder] Cargando modelo STL:', {
        component: comp.id,
        segment: segment.id,
        file: file
      });

      BABYLON.SceneLoader.ImportMesh('', rootUrl, file, robotScene, function(meshes) {
        console.log('[STBlock Robot Builder] Modelo STL cargado:', {
          component: comp.id,
          segment: segment.id,
          meshes: meshes && meshes.length
        });

        // Eliminar fallback
        if (fallback && !fallback.isDisposed()) {
          fallback.dispose();
        }

        // Crear nodo para los meshes importados
        var modelRoot = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-model', robotScene);
        modelRoot.parent = pivoted.pivot;
        modelRoot.position = pivoted.visualOffset;
        modelRoot.metadata = { partId: comp.id };

        (meshes || []).forEach(function(mesh) {
          mesh.parent = modelRoot;
          mesh.metadata = Object.assign({}, mesh.metadata, { partId: comp.id });
          mesh.material = segMat;
          if (selectedPartId === comp.id) {
            mesh.showBoundingBox = true;
          }
        });
      }, null, function(scene, message, exception) {
        console.error('[STBlock Robot Builder] Error cargando modelo STL:', {
          component: comp.id,
          segment: segment.id,
          url: segment.modelURL,
          message: message
        });
      });
    });

    return root;
  }

  // Verificar si un componente tiene un preset con modelos 3D
  function hasCustomPreset(comp) {
    return !!(comp.customPreset || comp.customPresetId || (comp.options && (comp.options.customPreset || comp.options.customPresetId)));
  }

  // Crear vista previa realista de un componente
  function createRobotComponentPreview(comp, compMat, pivot) {
    var opts = comp.options || {};
    var root = createPartPreviewRoot(comp, pivot);

    console.log('[STBlock Robot Builder] Renderizando componente:', comp.type, comp.id, 'hasPreset:', hasCustomPreset(comp));

    // Check if this component has a preset with 3D models (servos, etc.)
    if (hasCustomPreset(comp)) {
      console.log('[STBlock Robot Builder] Usando preset con modelos 3D para:', comp.id);
      return createCustomPiecePresetPreview(comp, root);
    }

    // Check if this component has a custom 3D model
    if (opts.modelURL) {
      loadCustomPartModel(comp, opts, root);
      return root;
    }

    // Materiales predefinidos
    var baseMat = previewMaterial('previewBaseMat', '#A39C0D');
    var pivotMat = previewMaterial('previewPivotMat', '#808080');
    var armMat = previewMaterial('previewArmMat', '#A3CF0D');
    var darkMat = previewMaterial('previewDarkMat', '#262626');
    var orangeMat = previewMaterial('previewOrangeMat', '#E1A32B');
    var sensorBodyMat = previewMaterial('previewSensorBodyMat', '#22C55E');
    var sensorDarkMat = previewMaterial('previewSensorDarkMat', '#111827');
    var sensorLensMat = previewMaterial('previewSensorLensMat', '#E600E6');
    var sensorRedMat = previewMaterial('previewSensorRedMat', '#E60000');
    var sensorBlueMat = previewMaterial('previewSensorBlueMat', '#0077CC');
    var sensorMetalMat = previewMaterial('previewSensorMetalMat', '#C0C0C0');

    // === SENSORES ===

    if (comp.type === 'UltrasonicSensor') {
      console.log('[STBlock Robot Builder] Creando modelo ultrasónico:', comp.id);
      // Cuerpo del sensor (verde/turquesa como HC-SR04)
      var sonarBodyMat = previewMaterial('previewSonarBodyMat', '#0891B2');
      var sonarEyeMat = previewMaterial('previewSonarEyeMat', '#C0C0C0');
      var sonarMeshMat = previewMaterial('previewSonarMeshMat', '#1F2937');

      // PCB / Cuerpo principal
      var sonarBody = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
        width: 4.5, height: 2, depth: 1.5
      }, robotScene), comp, root, sonarBodyMat);
      sonarBody.position.z = -0.25;

      // Ojo izquierdo (transductor)
      var eyeBaseL = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eyebase-l', {
        height: 1.2, diameter: 1.6, tessellation: 24
      }, robotScene), comp, root, sonarEyeMat);
      eyeBaseL.rotation.x = -Math.PI / 2;
      eyeBaseL.position.x = -1.3;
      eyeBaseL.position.z = 0.85;

      // Malla del ojo izquierdo
      var eyeMeshL = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eyemesh-l', {
        height: 0.1, diameter: 1.4, tessellation: 24
      }, robotScene), comp, root, sonarMeshMat);
      eyeMeshL.rotation.x = -Math.PI / 2;
      eyeMeshL.position.x = -1.3;
      eyeMeshL.position.z = 1.5;

      // Ojo derecho (transductor)
      var eyeBaseR = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eyebase-r', {
        height: 1.2, diameter: 1.6, tessellation: 24
      }, robotScene), comp, root, sonarEyeMat);
      eyeBaseR.rotation.x = -Math.PI / 2;
      eyeBaseR.position.x = 1.3;
      eyeBaseR.position.z = 0.85;

      // Malla del ojo derecho
      var eyeMeshR = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eyemesh-r', {
        height: 0.1, diameter: 1.4, tessellation: 24
      }, robotScene), comp, root, sonarMeshMat);
      eyeMeshR.rotation.x = -Math.PI / 2;
      eyeMeshR.position.x = 1.3;
      eyeMeshR.position.z = 1.5;

      // Cristal oscilador
      var crystal = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-crystal', {
        height: 0.3, diameter: 0.8, tessellation: 16
      }, robotScene), comp, root, sonarMeshMat);
      crystal.position.y = 1.15;

      return root;
    }

    if (comp.type === 'ColorSensor') {
      console.log('[STBlock Robot Builder] Creando modelo sensor de color:', comp.id);
      var colorBodyMat = previewMaterial('previewColorBodyMat', '#374151');
      var colorLedMat = previewMaterial('previewColorLedMat', '#FBBF24');
      var colorLensMat = previewMaterial('previewColorLensMat', '#1F2937');

      // Cuerpo del sensor
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
        width: 2.5, height: 1.5, depth: 2.5
      }, robotScene), comp, root, colorBodyMat);

      // LED RGB (múltiples LEDs)
      var ledR = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-led-r', {
        diameter: 0.4, segments: 12
      }, robotScene), comp, root, previewMaterial('previewColorLedR', '#EF4444'));
      ledR.position.x = -0.5;
      ledR.position.y = -0.9;

      var ledG = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-led-g', {
        diameter: 0.4, segments: 12
      }, robotScene), comp, root, previewMaterial('previewColorLedG', '#22C55E'));
      ledG.position.x = 0;
      ledG.position.y = -0.9;

      var ledB = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-led-b', {
        diameter: 0.4, segments: 12
      }, robotScene), comp, root, previewMaterial('previewColorLedB', '#3B82F6'));
      ledB.position.x = 0.5;
      ledB.position.y = -0.9;

      // Fotodetector central
      var detector = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-detector', {
        diameter: 0.8, height: 0.3, tessellation: 16
      }, robotScene), comp, root, colorLensMat);
      detector.position.y = -0.9;
      detector.position.z = 0.5;

      // Cable/conector
      var connector = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-connector', {
        width: 1.5, height: 0.5, depth: 0.8
      }, robotScene), comp, root, colorBodyMat);
      connector.position.y = 0.95;

      return root;
    }

    if (comp.type === 'TouchSensor') {
      console.log('[STBlock Robot Builder] Creando modelo sensor de contacto:', comp.id);
      var touchBodyMat = previewMaterial('previewTouchBodyMat', '#F3F4F6');
      var touchButtonMat = previewMaterial('previewTouchButtonMat', '#DC2626');
      var touchBaseMat = previewMaterial('previewTouchBaseMat', '#374151');

      // Cuerpo del switch
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
        width: 2, height: 1.5, depth: 1.2
      }, robotScene), comp, root, touchBodyMat);

      // Base/montura
      var base = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-base', {
        width: 2.4, height: 0.3, depth: 1.5
      }, robotScene), comp, root, touchBaseMat);
      base.position.y = -0.9;

      // Brazo del bumper
      var arm = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-arm', {
        width: 3, height: 0.15, depth: 0.8
      }, robotScene), comp, root, touchBaseMat);
      arm.position.y = -1.15;
      arm.position.x = 0.8;

      // Botón (parte que se presiona)
      var button = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-button', {
        diameter: 0.5, height: 0.3, tessellation: 16
      }, robotScene), comp, root, touchButtonMat);
      button.rotation.x = Math.PI / 2;
      button.position.z = 0.75;

      // Terminales
      var terminal1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-term1', {
        diameter: 0.12, height: 0.5, tessellation: 8
      }, robotScene), comp, root, previewMaterial('previewTouchTermMat', '#C0C0C0'));
      terminal1.position.x = -0.6;
      terminal1.position.y = 1.0;

      var terminal2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-term2', {
        diameter: 0.12, height: 0.5, tessellation: 8
      }, robotScene), comp, root, previewMaterial('previewTouchTermMat', '#C0C0C0'));
      terminal2.position.x = 0.6;
      terminal2.position.y = 1.0;

      return root;
    }

    if (comp.type === 'GyroSensor' || comp.type === 'GPSSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 2, height: 1, depth: 2}, robotScene), comp, root, sensorBodyMat);
      var plate = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-plate', {diameter: 1.35, height: 0.18, tessellation: 24}, robotScene), comp, root, sensorDarkMat);
      plate.position.y = 0.6;
      return root;
    }

    if (comp.type === 'LineFollowerSensor') {
      console.log('[STBlock Robot Builder] Creando modelo seguidor de línea:', comp.id);
      var lineBodyMat = previewMaterial('previewLineBodyMat', '#1E3A8A');
      var lineIRMat = previewMaterial('previewLineIRMat', '#111827');
      var lineLedMat = previewMaterial('previewLineLedMat', '#DC2626');

      // PCB del sensor
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
        width: 5, height: 0.4, depth: 1.8
      }, robotScene), comp, root, lineBodyMat);

      // Sensores IR (pares emisor/receptor)
      [-1.8, -0.6, 0.6, 1.8].forEach(function(x, index) {
        // Emisor IR (negro)
        var emitter = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-emitter-' + index, {
          width: 0.5, height: 0.3, depth: 0.5
        }, robotScene), comp, root, lineIRMat);
        emitter.position.x = x;
        emitter.position.y = -0.35;
        emitter.position.z = 0.3;

        // LED indicador (rojo)
        var led = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-led-' + index, {
          diameter: 0.25, segments: 8
        }, robotScene), comp, root, lineLedMat);
        led.position.x = x;
        led.position.y = 0.35;
        led.position.z = 0;
      });

      // Potenciómetros de ajuste
      var pot1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-pot1', {
        diameter: 0.4, height: 0.2, tessellation: 12
      }, robotScene), comp, root, previewMaterial('previewLinePotMat', '#3B82F6'));
      pot1.position.x = -2.2;
      pot1.position.y = 0.3;

      var pot2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-pot2', {
        diameter: 0.4, height: 0.2, tessellation: 12
      }, robotScene), comp, root, previewMaterial('previewLinePotMat', '#3B82F6'));
      pot2.position.x = 2.2;
      pot2.position.y = 0.3;

      return root;
    }

    if (comp.type === 'TemperatureSensor') {
      console.log('[STBlock Robot Builder] Creando modelo sensor temperatura:', comp.id);
      var tempMetalMat = previewMaterial('previewTempMetalMat', '#9CA3AF');
      var tempBulbMat = previewMaterial('previewTempBulbMat', '#DC2626');
      var tempPcbMat = previewMaterial('previewTempPcbMat', '#1E40AF');

      // PCB pequeño
      var pcb = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-pcb', {
        width: 1.5, height: 0.2, depth: 1
      }, robotScene), comp, root, tempPcbMat);
      pcb.position.x = 1.5;

      // Vástago metálico (termistor NTC)
      var stem = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-stem', {
        diameter: 0.4, height: 2.5, tessellation: 16
      }, robotScene), comp, root, tempMetalMat);
      stem.rotation.z = Math.PI / 2;

      // Punta sensora
      var bulb = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-bulb', {
        diameter: 0.6, segments: 16
      }, robotScene), comp, root, tempBulbMat);
      bulb.position.x = -1.25;

      // Cables
      var wire1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-wire1', {
        diameter: 0.1, height: 0.8, tessellation: 8
      }, robotScene), comp, root, tempMetalMat);
      wire1.position.x = 1.5;
      wire1.position.z = 0.3;
      wire1.position.y = 0.5;

      var wire2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-wire2', {
        diameter: 0.1, height: 0.8, tessellation: 8
      }, robotScene), comp, root, tempMetalMat);
      wire2.position.x = 1.5;
      wire2.position.z = -0.3;
      wire2.position.y = 0.5;

      return root;
    }

    if (comp.type === 'HumiditySensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 1.4, height: 0.3, depth: 1.4}, robotScene), comp, root, sensorBlueMat);
      var drop = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-drop', {diameterX: 0.55, diameterY: 0.75, diameterZ: 0.55, segments: 16}, robotScene), comp, root, previewMaterial('previewHumidityDropMat', '#38BDF8'));
      drop.position.y = 0.45;
      return root;
    }

    if (comp.type === 'LaserRangeSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 1.5, height: 2.5, depth: 1.5}, robotScene), comp, root, sensorBodyMat);
      var emitter = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-emitter', {height: 0.25, diameter: 0.8, tessellation: 16}, robotScene), comp, root, sensorRedMat);
      emitter.rotation.x = Math.PI / 2;
      emitter.position.z = 0.85;
      var beam = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-beam', {width: 0.12, height: 0.12, depth: 2.4}, robotScene), comp, root, sensorRedMat);
      beam.position.z = 2.1;
      return root;
    }

    if (comp.type === 'LidarSensor') {
      console.log('[STBlock Robot Builder] Creando modelo LIDAR:', comp.id);
      var lidarBaseMat = previewMaterial('previewLidarBaseMat', '#1F2937');
      var lidarDomeMat = previewMaterial('previewLidarDomeMat', '#111827');
      var lidarLensMat = previewMaterial('previewLidarLensMat', '#EF4444');

      // Base del LIDAR
      var base = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-base', {
        diameter: 4, height: 1.2, tessellation: 32
      }, robotScene), comp, root, lidarBaseMat);

      // Domo giratorio
      var dome = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-dome', {
        diameter: 3.2, height: 1, tessellation: 32
      }, robotScene), comp, root, lidarDomeMat);
      dome.position.y = 1.1;

      // Ventana del sensor (roja)
      var window1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-window1', {
        width: 1.5, height: 0.6, depth: 0.1
      }, robotScene), comp, root, lidarLensMat);
      window1.position.y = 1.1;
      window1.position.z = 1.55;

      var window2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-window2', {
        width: 1.5, height: 0.6, depth: 0.1
      }, robotScene), comp, root, lidarLensMat);
      window2.position.y = 1.1;
      window2.position.z = -1.55;
      window2.rotation.y = Math.PI;

      var window3 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-window3', {
        width: 0.1, height: 0.6, depth: 1.5
      }, robotScene), comp, root, lidarLensMat);
      window3.position.y = 1.1;
      window3.position.x = 1.55;

      var window4 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-window4', {
        width: 0.1, height: 0.6, depth: 1.5
      }, robotScene), comp, root, lidarLensMat);
      window4.position.y = 1.1;
      window4.position.x = -1.55;

      // Tapa superior
      var topCap = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-topcap', {
        diameter: 2, height: 0.3, tessellation: 24
      }, robotScene), comp, root, lidarBaseMat);
      topCap.position.y = 1.75;

      return root;
    }

    if (comp.type === 'GasSensor') {
      console.log('[STBlock Robot Builder] Creando modelo sensor de gas:', comp.id);
      var gasBodyMat = previewMaterial('previewGasBodyMat', '#6B7280');
      var gasMeshMat = previewMaterial('previewGasMeshMat', '#374151');
      var gasPcbMat = previewMaterial('previewGasPcbMat', '#1E40AF');

      // PCB base
      var pcb = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-pcb', {
        width: 3, height: 0.2, depth: 2
      }, robotScene), comp, root, gasPcbMat);
      pcb.position.y = -0.5;

      // Cuerpo cilíndrico del sensor (MQ-2 style)
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {
        diameter: 1.8, height: 1.5, tessellation: 24
      }, robotScene), comp, root, gasBodyMat);
      body.position.y = 0.35;

      // Malla superior (donde entra el gas)
      var mesh = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-mesh', {
        diameter: 1.6, height: 0.3, tessellation: 24
      }, robotScene), comp, root, gasMeshMat);
      mesh.position.y = 1.25;

      // Pines del sensor
      [-0.5, 0, 0.5].forEach(function(x, i) {
        var pin = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-pin-' + i, {
          diameter: 0.1, height: 0.4, tessellation: 8
        }, robotScene), comp, root, previewMaterial('previewGasPinMat', '#C0C0C0'));
        pin.position.x = x;
        pin.position.y = -0.8;
        pin.position.z = 0.5;
      });

      // Potenciómetro de ajuste
      var pot = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-pot', {
        diameter: 0.5, height: 0.2, tessellation: 12
      }, robotScene), comp, root, previewMaterial('previewGasPotMat', '#3B82F6'));
      pot.position.x = 1.0;
      pot.position.y = -0.35;

      return root;
    }

    // === ACTUADORES ===

    if (comp.type === 'ServoMotor') {
      console.log('[STBlock Robot Builder] Creando modelo de servo:', comp.id);
      // Servo realista con cuerpo, eje y brazo
      var servoBodyMat = previewMaterial('previewServoBodyMat', '#1E40AF');
      var servoCapMat = previewMaterial('previewServoCapMat', '#0D2A6B');
      var servoArmMat = previewMaterial('previewServoArmMat', '#FFFFFF');
      var servoHubMat = previewMaterial('previewServoHubMat', '#FFD700');

      // Cuerpo principal del servo (azul oscuro)
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
        width: 2.3, height: 1.2, depth: 2.2
      }, robotScene), comp, root, servoBodyMat);

      // Tapa superior
      var topCap = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-topcap', {
        width: 2.3, height: 0.2, depth: 1.2
      }, robotScene), comp, root, servoCapMat);
      topCap.position.y = 0.7;
      topCap.position.z = -0.5;

      // Eje/Hub central (círculo dorado)
      var hub = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-hub', {
        diameter: 0.8, height: 0.4, tessellation: 24
      }, robotScene), comp, root, servoHubMat);
      hub.position.y = 0.8;

      // Brazo del servo (blanco)
      var arm = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-arm', {
        width: 0.5, height: 0.25, depth: 3.5
      }, robotScene), comp, root, servoArmMat);
      arm.position.y = 1.0;
      arm.position.z = 1.25;

      // Círculos en el brazo
      var armHole1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-armhole1', {
        diameter: 0.25, height: 0.3, tessellation: 12
      }, robotScene), comp, root, servoCapMat);
      armHole1.position.y = 1.0;
      armHole1.position.z = 2.0;

      var armHole2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-armhole2', {
        diameter: 0.25, height: 0.3, tessellation: 12
      }, robotScene), comp, root, servoCapMat);
      armHole2.position.y = 1.0;
      armHole2.position.z = 2.7;

      // Orejetas de montaje
      var tab1 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-tab1', {
        width: 0.4, height: 0.15, depth: 2.6
      }, robotScene), comp, root, servoBodyMat);
      tab1.position.x = 1.35;
      tab1.position.y = -0.15;

      var tab2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-tab2', {
        width: 0.4, height: 0.15, depth: 2.6
      }, robotScene), comp, root, servoBodyMat);
      tab2.position.x = -1.35;
      tab2.position.y = -0.15;

      return root;
    }

    if (comp.type === 'LinearActuator') {
      console.log('[STBlock Robot Builder] Creando modelo actuador lineal:', comp.id);
      var linearBaseMat = previewMaterial('previewLinearBaseMat', '#374151');
      var linearRodMat = previewMaterial('previewLinearRodMat', '#9CA3AF');
      var linearMotorMat = previewMaterial('previewLinearMotorMat', '#1F2937');

      // Cuerpo del motor
      var motorBody = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-motor', {
        width: 2.5, height: 2.5, depth: 3
      }, robotScene), comp, root, linearMotorMat);
      motorBody.position.z = -1;

      // Vástago/Rod
      var rod = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-rod', {
        diameter: 0.5, height: 6, tessellation: 16
      }, robotScene), comp, root, linearRodMat);
      rod.rotation.x = Math.PI / 2;
      rod.position.z = 2.5;

      // Protector del vástago
      var rodCover = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-cover', {
        diameter: 1.2, height: 2, tessellation: 16
      }, robotScene), comp, root, linearBaseMat);
      rodCover.rotation.x = Math.PI / 2;
      rodCover.position.z = 0.5;

      // Punta del actuador
      var tip = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-tip', {
        diameter: 0.8, height: 0.5, tessellation: 16
      }, robotScene), comp, root, linearRodMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 5.25;

      return root;
    }

    if (comp.type === 'MagnetActuator') {
      console.log('[STBlock Robot Builder] Creando modelo electroimán:', comp.id);
      var magnetCoreMat = previewMaterial('previewMagnetCoreMat', '#374151');
      var magnetCoilMat = previewMaterial('previewMagnetCoilMat', '#B45309');
      var magnetFaceMat = previewMaterial('previewMagnetFaceMat', '#6B7280');

      // Núcleo del electroimán
      var core = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-core', {
        diameter: 2, height: 2.5, tessellation: 24
      }, robotScene), comp, root, magnetCoreMat);

      // Bobina (cobre)
      var coil = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateTorus(comp.id + '-coil', {
        diameter: 2.2, thickness: 0.4, tessellation: 24
      }, robotScene), comp, root, magnetCoilMat);
      coil.position.y = 0;

      // Bobina adicional
      var coil2 = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateTorus(comp.id + '-coil2', {
        diameter: 2.2, thickness: 0.4, tessellation: 24
      }, robotScene), comp, root, magnetCoilMat);
      coil2.position.y = 0.6;

      // Cara de atracción
      var face = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-face', {
        diameter: 2.2, height: 0.3, tessellation: 24
      }, robotScene), comp, root, magnetFaceMat);
      face.position.y = -1.4;

      // Conector superior
      var connector = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-connector', {
        width: 1.5, height: 0.8, depth: 1.5
      }, robotScene), comp, root, magnetCoreMat);
      connector.position.y = 1.65;

      return root;
    }

    if (comp.type === 'Pen') {
      console.log('[STBlock Robot Builder] Creando modelo lápiz:', comp.id);
      var penBodyMat = previewMaterial('previewPenBodyMat', '#F59E0B');
      var penTipMat = previewMaterial('previewPenTipMat', '#1F2937');
      var penGripMat = previewMaterial('previewPenGripMat', '#6B7280');

      // Cuerpo del lápiz (hexagonal simulation con cilindro)
      var body = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {
        diameter: 1.2, height: 3.5, tessellation: 6
      }, robotScene), comp, root, penBodyMat);
      body.position.y = 0.5;

      // Punta metálica
      var tipHolder = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-tipholder', {
        diameterTop: 1.2, diameterBottom: 0.4, height: 0.8, tessellation: 6
      }, robotScene), comp, root, penGripMat);
      tipHolder.position.y = -1.15;

      // Punta del lápiz
      var tip = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-tip', {
        diameterTop: 0.4, diameterBottom: 0.05, height: 0.6, tessellation: 12
      }, robotScene), comp, root, penTipMat);
      tip.position.y = -1.85;

      // Borrador/tapa superior
      var eraser = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eraser', {
        diameter: 1.1, height: 0.5, tessellation: 6
      }, robotScene), comp, root, previewMaterial('previewPenEraserMat', '#EC4899'));
      eraser.position.y = 2.5;

      return root;
    }

    // === ESTRUCTURALES ===

    if (comp.type === 'Box') {
      var boxW = (comp.size && comp.size[0]) || (opts.width) || 4;
      var boxH = (comp.size && comp.size[1]) || (opts.height) || 4;
      var boxD = (comp.size && comp.size[2]) || (opts.depth) || 4;
      var structMat = previewMaterial('structMat-' + comp.id, comp.color || (opts.color) || '#6366f1');
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: boxW, height: boxH, depth: boxD}, robotScene), comp, root, structMat);
      return root;
    }

    if (comp.type === 'Cylinder') {
      var cylDiam = (comp.size && comp.size[0]) || (opts.diameter) || 4;
      var cylH = (comp.size && comp.size[1]) || (opts.height) || 4;
      var cylMat = previewMaterial('structMat-' + comp.id, comp.color || (opts.color) || '#6366f1');
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {diameter: cylDiam, height: cylH, tessellation: 32}, robotScene), comp, root, cylMat);
      return root;
    }

    if (comp.type === 'Sphere') {
      var sphDiam = (comp.size && comp.size[0]) || (opts.diameter) || 4;
      var sphMat = previewMaterial('structMat-' + comp.id, comp.color || (opts.color) || '#6366f1');
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-body', {diameter: sphDiam, segments: 24}, robotScene), comp, root, sphMat);
      return root;
    }

    // === RUEDA PASIVA ===
    if (comp.type === 'WheelPassive') {
      console.log('[STBlock Robot Builder] Creando modelo rueda pasiva:', comp.id);
      var passiveRadius = (opts.radius) || comp.radius || 2.5;
      var passiveWidth = (opts.width) || comp.width || 1.5;

      var wheelRubberMat = previewMaterial('previewWheelRubberMat', '#1F2937');
      var wheelHubMat = previewMaterial('previewWheelHubMat', '#9CA3AF');
      var wheelAxleMat = previewMaterial('previewWheelAxleMat', '#6B7280');

      // Llanta de goma
      var tire = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-tire', {
        diameter: passiveRadius * 2,
        height: passiveWidth,
        tessellation: 32
      }, robotScene), comp, root, wheelRubberMat);
      tire.rotation.z = Math.PI / 2;

      // Rin/Hub
      var hub = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-hub', {
        diameter: passiveRadius * 1.2,
        height: passiveWidth * 0.6,
        tessellation: 24
      }, robotScene), comp, root, wheelHubMat);
      hub.rotation.z = Math.PI / 2;

      // Centro del hub
      var center = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-center', {
        diameter: passiveRadius * 0.4,
        height: passiveWidth * 1.2,
        tessellation: 16
      }, robotScene), comp, root, wheelAxleMat);
      center.rotation.z = Math.PI / 2;

      return root;
    }

    // === DEFAULT: Caja genérica ===
    console.warn('[STBlock Robot Builder] Tipo de componente no reconocido, usando caja genérica:', comp.type);
    var mesh = BABYLON.MeshBuilder.CreateBox(comp.id, {width: 2, height: 2, depth: 2}, robotScene);
    applyPartPreviewMesh(mesh, comp, root, compMat);
    return root;
  }

  function renderRobot3D() {
    if (!robotScene) return;

    // Clear all existing meshes except grid
    if (robotScene.meshes) {
      var meshesToDispose = robotScene.meshes.filter(function(m) {
        return m.name !== 'grid';
      });
      meshesToDispose.forEach(function(m) { m.dispose(); });
    }
    if (robotScene.transformNodes) {
      var nodesToDispose = robotScene.transformNodes.slice();
      nodesToDispose.forEach(function(n) { n.dispose(); });
    }
    // Clear materials except grid and preview materials
    if (robotScene.materials) {
      var matsToDispose = robotScene.materials.filter(function(mat) {
        return mat.name !== 'gridMat' && mat.name.indexOf('preview') !== 0 && mat.name.indexOf('structMat') !== 0;
      });
      matsToDispose.forEach(function(mat) { mat.dispose(); });
    }
    robotMeshes = {};

    // Render chassis
    var chassis = robotState.chassis;
    var chassisY = (chassis.yOffset || 0) + chassis.size[2] / 2;

    // Check if we have a custom 3D model
    if (robotState.chassisType === 'custom' && chassis.modelURL) {
      loadCustomChassis(chassis, chassisY);
    } else {
      // Default parametric box chassis
      var chassisMesh = BABYLON.MeshBuilder.CreateBox('chassis', {
        width: chassis.size[0],
        height: chassis.size[2],
        depth: chassis.size[1]
      }, robotScene);

      chassisMesh.position.y = chassisY;
      var chassisMat = new BABYLON.StandardMaterial('chassisMat', robotScene);
      chassisMat.diffuseColor = BABYLON.Color3.FromHexString(chassis.color || '#f09c0d');
      chassisMesh.material = chassisMat;
      robotMeshes['chassis'] = chassisMesh;
    }

    // Render wheels
    robotState.wheels.forEach(function(wheel) {
      var wheelMesh = BABYLON.MeshBuilder.CreateCylinder('wheel-' + wheel.id, {
        diameter: (wheel.radius || 4) * 2,
        height: wheel.width || 2
      }, robotScene);

      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.position.x = wheel.position[0];
      wheelMesh.position.y = (chassis.yOffset || 0) + (wheel.radius || 4);
      wheelMesh.position.z = wheel.position[2];

      var wheelMat = new BABYLON.StandardMaterial('wheelMat-' + wheel.id, robotScene);
      wheelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
      wheelMesh.material = wheelMat;
      wheelMesh.metadata = { partId: wheel.id };
      robotMeshes[wheel.id] = wheelMesh;
    });

    // Render components usando modelos 3D realistas
    robotState.components.forEach(function(comp) {
      // Material por defecto para el componente
      var compMat = new BABYLON.StandardMaterial('compMat-' + comp.id, robotScene);
      var isSensor = comp.type && comp.type.indexOf('Sensor') !== -1;
      compMat.diffuseColor = isSensor ? new BABYLON.Color3(0.13, 0.77, 0.37) : new BABYLON.Color3(0.96, 0.62, 0.04);
      compMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

      // Crear pivot (TransformNode) para posicionar el componente
      var pivot = new BABYLON.TransformNode('pivot-' + comp.id, robotScene);
      pivot.metadata = { partId: comp.id };
      pivot.position = new BABYLON.Vector3(
        comp.position[0],
        chassisY + comp.position[1],
        comp.position[2]
      );
      if (comp.rotation) {
        pivot.rotation = new BABYLON.Vector3(
          comp.rotation[0] * Math.PI / 180,
          comp.rotation[1] * Math.PI / 180,
          comp.rotation[2] * Math.PI / 180
        );
      }

      // Crear modelo 3D realista del componente
      createRobotComponentPreview(comp, compMat, pivot);
    });

    // Highlight selected part
    if (selectedPartId) {
      highlightPartMesh(selectedPartId);
    }
  }

  function getPartFromMesh(mesh) {
    if (!mesh || !mesh.metadata || !mesh.metadata.partId) return null;
    var id = mesh.metadata.partId;
    return robotState.wheels.find(function(w) { return w.id === id; }) ||
           robotState.components.find(function(c) { return c.id === id; });
  }

  function highlightPartMesh(id) {
    if (!robotScene) return;

    // Reset all bounding boxes and emissive colors
    robotScene.meshes.forEach(function(mesh) {
      if (mesh.name !== 'grid') {
        mesh.showBoundingBox = false;
        if (mesh.material && mesh.material.emissiveColor) {
          mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
        }
      }
    });

    if (!id) return;

    // Find all meshes belonging to this part
    robotScene.meshes.forEach(function(mesh) {
      if (mesh.metadata && mesh.metadata.partId === id) {
        mesh.showBoundingBox = true;
        if (mesh.material && mesh.material.emissiveColor !== undefined) {
          mesh.material.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.35);
        }
      }
    });

    // Also check transform nodes (they store the root)
    var rootNode = robotMeshes[id];
    if (rootNode && rootNode.getChildMeshes) {
      rootNode.getChildMeshes().forEach(function(childMesh) {
        childMesh.showBoundingBox = true;
        if (childMesh.material && childMesh.material.emissiveColor !== undefined) {
          childMesh.material.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.35);
        }
      });
    }
  }

  // ============================================
  // SAVE / EXPORT / TEST
  // ============================================
  function saveRobot() {
    try {
      // Generate thumbnail
      if (robotCanvas && robotScene) {
        robotState.thumbnail = customRobotStorage.generateThumbnail(robotCanvas);
      }

      robotState.name = $('robotNameInput').value || 'Mi Robot';
      customRobotStorage.save(robotState);
      toast('Robot guardado correctamente', 'success');
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
    }
  }

  function exportRobot() {
    try {
      customRobotStorage.exportToJSON(robotState);
      toast('Robot exportado');
    } catch (e) {
      toast('Error al exportar: ' + e.message, 'error');
    }
  }

  function testRobot() {
    try {
      // Save first
      if (robotCanvas && robotScene) {
        robotState.thumbnail = customRobotStorage.generateThumbnail(robotCanvas);
      }
      customRobotStorage.save(robotState);

      // Convert to simulator format
      var simRobot = customRobotStorage.toSimulatorFormat(robotState);

      // Store in sessionStorage for the simulator to pick up
      sessionStorage.setItem('stblock_test_robot', JSON.stringify(simRobot));

      // Open simulator
      var simUrl = '../index.html?stblockWebGL=1&customRobot=' + encodeURIComponent(robotState.id);
      window.open(simUrl, 'stblock-robot-test');

      toast('Abriendo simulador...');
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
  }

  // ============================================
  // SETTINGS MODAL
  // ============================================
  function openSettings() {
    $('settingsModal').classList.remove('hidden');
    $('settingsName').value = robotState.name;

    // Populate board selector
    var boardSelect = $('settingsBoard');
    boardSelect.innerHTML = '';
    Object.keys(boardData).forEach(function(key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = boardData[key].name;
      if (key === robotState.boardType) opt.selected = true;
      boardSelect.appendChild(opt);
    });

    $('settingsDrift').checked = robotState.chassis.driftEnabled || false;
    $('settingsDriftAmount').value = robotState.chassis.driftLeft || 10;
    $('driftValue').textContent = ($('settingsDriftAmount').value) + '%';
  }

  function closeSettings() {
    $('settingsModal').classList.add('hidden');
  }

  function applySettings() {
    robotState.name = $('settingsName').value || 'Mi Robot';
    robotState.boardType = $('settingsBoard').value;
    robotState.chassis.driftEnabled = $('settingsDrift').checked;
    robotState.chassis.driftLeft = parseInt($('settingsDriftAmount').value, 10) || 10;

    $('robotNameInput').value = robotState.name;
    $('robotNameDisplay').textContent = robotState.name;

    closeSettings();
    toast('Configuración aplicada');
  }

  // ============================================
  // BACK BUTTON
  // ============================================
  function initBackButton() {
    $('btnBack').addEventListener('click', function() {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      } else {
        // Go back to main page
        if (confirm('¿Seguro que quieres salir? Los cambios no guardados se perderán.')) {
          // Try history.back() first (returns to simulator)
          if (window.history.length > 1) {
            window.history.back();
          } else {
            // Fallback to index.html
            window.location.href = '../index.html?stblockWebGL=1';
          }
        }
      }
    });
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    console.log('[STBlock Robot Builder] Inicializando...');

    try {
      initBackButton();
      initStep1();
      initStep2();

      // Check for edit mode (loading existing robot)
      var params = new URLSearchParams(window.location.search);
      var editId = params.get('edit');
      if (editId) {
        console.log('[STBlock Robot Builder] Modo edición, cargando robot:', editId);
        var robot = customRobotStorage.getById(editId);
        if (robot) {
          robotState = robot;
          selectedBoard = robot.boardType;
          goToStep(3);
          return;
        }
      }

      goToStep(1);
      console.log('[STBlock Robot Builder] Inicializado correctamente');
    } catch (error) {
      console.error('[STBlock Robot Builder] Error de inicialización:', error);
      alert('Error al cargar el editor: ' + error.message);
    }
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global error handler
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('[STBlock Robot Builder] Error:', msg, 'en línea', lineNo);
    return false;
  };

})();
