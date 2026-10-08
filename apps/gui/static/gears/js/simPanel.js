var simPanel = new function() {
  var self = this;

  this.sensors = [];
  this.sensorsV2 = []; // Nueva versión del panel

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTES PARA PANEL DE SENSORES V2
  // ═══════════════════════════════════════════════════════════════════════════

  // Definición de pines requeridos por cada tipo de componente
  const COMPONENT_PIN_DEFINITIONS = {
    // === MOTORES ===
    'WheelDrive': {
      name: 'Motor DC',
      icon: '⚙️',
      category: 'motor',
      pinsRequired: [
        { id: 'dir1', label: 'DIR1', type: 'digital' },
        { id: 'dir2', label: 'DIR2', type: 'digital' },
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'motor_dc',
      canShare: false,
      stboardPort: true // En STBoard usa puerto simple
    },
    'ServoMotor': {
      name: 'Servo Motor',
      icon: '🔄',
      category: 'motor',
      pinsRequired: [
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'pwm',
      canShare: true
    },

    // === SENSORES ===
    'UltrasonicSensor': {
      name: 'Sensor Ultrasónico',
      icon: '📏',
      category: 'sensor',
      pinsRequired: [
        { id: 'trig', label: 'TRIG', type: 'digital' },
        { id: 'echo', label: 'ECHO', type: 'digital' }
      ],
      protocol: 'digital',
      canShare: false,
      stboardPort: true
    },
    'ColorSensor': {
      name: 'Sensor de Color',
      icon: '🎨',
      category: 'sensor',
      pinsRequired: [
        { id: 'sda', label: 'SDA', type: 'i2c' },
        { id: 'scl', label: 'SCL', type: 'i2c' }
      ],
      protocol: 'i2c',
      i2cAddress: '0x29',
      canShare: true,
      stboardPort: true
    },
    'GyroSensor': {
      name: 'Giroscopio',
      icon: '🧭',
      category: 'sensor',
      pinsRequired: [
        { id: 'sda', label: 'SDA', type: 'i2c' },
        { id: 'scl', label: 'SCL', type: 'i2c' }
      ],
      protocol: 'i2c',
      i2cAddress: '0x68',
      canShare: true,
      stboardPort: true
    },
    'GPSSensor': {
      name: 'GPS',
      icon: '🛰️',
      category: 'sensor',
      pinsRequired: [
        { id: 'rx', label: 'RX', type: 'serial' },
        { id: 'tx', label: 'TX', type: 'serial' }
      ],
      protocol: 'serial',
      canShare: true,
      stboardPort: true
    },
    'TouchSensor': {
      name: 'Sensor de Contacto',
      icon: '👆',
      category: 'sensor',
      pinsRequired: [
        { id: 'signal', label: 'SIGNAL', type: 'digital' }
      ],
      protocol: 'digital',
      canShare: false,
      stboardPort: true
    },
    'LineFollowerSensor': {
      name: 'Seguidor de Línea',
      icon: '➖',
      category: 'sensor',
      pinsRequired: [
        { id: 'left', label: 'IZQ', type: 'analog' },
        { id: 'center', label: 'CEN', type: 'analog' },
        { id: 'right', label: 'DER', type: 'analog' }
      ],
      protocol: 'analog',
      canShare: false,
      stboardPort: true
    },
    'TemperatureSensor': {
      name: 'Sensor Temperatura',
      icon: '🌡️',
      category: 'sensor',
      pinsRequired: [
        { id: 'data', label: 'DATA', type: 'onewire' }
      ],
      protocol: 'onewire',
      canShare: true,
      stboardPort: true
    },
    'HumiditySensor': {
      name: 'Sensor Humedad',
      icon: '💧',
      category: 'sensor',
      pinsRequired: [
        { id: 'data', label: 'DATA', type: 'digital' }
      ],
      protocol: 'dht',
      canShare: true,
      stboardPort: true
    },
    'GasSensor': {
      name: 'Sensor de Gas',
      icon: '💨',
      category: 'sensor',
      pinsRequired: [
        { id: 'ao', label: 'AO', type: 'analog' },
        { id: 'do', label: 'DO', type: 'digital', optional: true }
      ],
      protocol: 'analog',
      canShare: false,
      stboardPort: true
    },
    'LaserRangeSensor': {
      name: 'Sensor Láser',
      icon: '🔴',
      category: 'sensor',
      pinsRequired: [
        { id: 'sda', label: 'SDA', type: 'i2c' },
        { id: 'scl', label: 'SCL', type: 'i2c' }
      ],
      protocol: 'i2c',
      i2cAddress: '0x52',
      canShare: true,
      stboardPort: true
    },
    'LidarSensor': {
      name: 'LiDAR 360°',
      icon: '📡',
      category: 'sensor',
      pinsRequired: [
        { id: 'rx', label: 'RX', type: 'serial' },
        { id: 'tx', label: 'TX', type: 'serial' },
        { id: 'motor', label: 'MOTOR', type: 'pwm' }
      ],
      protocol: 'serial',
      canShare: false,
      stboardPort: true
    },
    'CameraSensor': {
      name: 'Cámara',
      icon: '📷',
      category: 'sensor',
      pinsRequired: [
        { id: 'sda', label: 'SDA', type: 'i2c' },
        { id: 'scl', label: 'SCL', type: 'i2c' }
      ],
      protocol: 'i2c',
      canShare: true,
      stboardPort: true
    },

    // === ACTUADORES ===
    'MagnetActuator': {
      name: 'Electroimán',
      icon: '🧲',
      category: 'actuator',
      pinsRequired: [
        { id: 'ctrl', label: 'CTRL', type: 'digital' }
      ],
      protocol: 'digital',
      canShare: false,
      stboardPort: true
    },
    'ArmActuator': {
      name: 'Brazo Robótico',
      icon: '🦾',
      category: 'actuator',
      pinsRequired: [
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'pwm',
      canShare: true,
      stboardPort: true
    },
    'SwivelActuator': {
      name: 'Plataforma Giratoria',
      icon: '🔃',
      category: 'actuator',
      pinsRequired: [
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'pwm',
      canShare: true,
      stboardPort: true
    },
    'LinearActuator': {
      name: 'Actuador Lineal',
      icon: '↔️',
      category: 'actuator',
      pinsRequired: [
        { id: 'dir1', label: 'DIR1', type: 'digital' },
        { id: 'dir2', label: 'DIR2', type: 'digital' },
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'motor_dc',
      canShare: false,
      stboardPort: true
    },
    'PaintballLauncherActuator': {
      name: 'Lanzador',
      icon: '🎯',
      category: 'actuator',
      pinsRequired: [
        { id: 'trigger', label: 'TRIGGER', type: 'digital' }
      ],
      protocol: 'digital',
      canShare: false,
      stboardPort: true
    },
    'Pen': {
      name: 'Lápiz Trazador',
      icon: '✏️',
      category: 'actuator',
      pinsRequired: [
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'pwm',
      canShare: true,
      stboardPort: true
    },
    'WheelActuator': {
      name: 'Rueda Motorizada',
      icon: '🛞',
      category: 'motor',
      pinsRequired: [
        { id: 'dir1', label: 'DIR1', type: 'digital' },
        { id: 'dir2', label: 'DIR2', type: 'digital' },
        { id: 'pwm', label: 'PWM', type: 'pwm' }
      ],
      protocol: 'motor_dc',
      canShare: false,
      stboardPort: true
    }
  };

  // Configuración de pines por tarjeta controladora
  const BOARD_PIN_CONFIGS = {
    // STBoard V2 - Puertos simplificados
    'stbBoardV2': {
      category: 'stblock',
      name: 'STBoard V2',
      motorPorts: ['A1', 'A2', 'B3', 'B4'],
      sensorPorts: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      internalMapping: true
    },
    'stBoardExtension': {
      category: 'stblock',
      name: 'STBoard Extension',
      motorPorts: ['A1', 'A2', 'B3', 'B4', 'C5', 'C6', 'D7', 'D8'],
      sensorPorts: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      internalMapping: true
    },

    // Arduino UNO
    'arduinoUno': {
      category: 'arduino',
      name: 'Arduino UNO',
      digitalPins: ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
      analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
      pwmPins: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },

    // Arduino Nano
    'arduinoNano': {
      category: 'arduino',
      name: 'Arduino Nano',
      digitalPins: ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
      analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
      pwmPins: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
      i2cPins: { sda: 'A4', scl: 'A5' },
      serialPins: { rx: 'D0', tx: 'D1' }
    },

    // Arduino Mega
    'arduinoMega2560': {
      category: 'arduino',
      name: 'Arduino Mega 2560',
      digitalPins: ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13',
                    'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D21', 'D22', 'D23', 'D24', 'D25',
                    'D26', 'D27', 'D28', 'D29', 'D30', 'D31', 'D32', 'D33', 'D34', 'D35', 'D36', 'D37',
                    'D38', 'D39', 'D40', 'D41', 'D42', 'D43', 'D44', 'D45', 'D46', 'D47', 'D48', 'D49',
                    'D50', 'D51', 'D52', 'D53'],
      analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'],
      pwmPins: ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D44', 'D45', 'D46'],
      i2cPins: { sda: 'D20', scl: 'D21' },
      serialPins: [
        { rx: 'D0', tx: 'D1' },
        { rx: 'D19', tx: 'D18' },
        { rx: 'D17', tx: 'D16' },
        { rx: 'D15', tx: 'D14' }
      ]
    },

    // ESP32
    'arduinoEsp32': {
      category: 'arduino',
      name: 'ESP32',
      digitalPins: ['G2', 'G4', 'G5', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19',
                    'G21', 'G22', 'G23', 'G25', 'G26', 'G27', 'G32', 'G33'],
      analogPins: ['G32', 'G33', 'G34', 'G35', 'G36', 'G39'],
      pwmPins: ['G2', 'G4', 'G5', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19',
                'G21', 'G22', 'G23', 'G25', 'G26', 'G27'],
      i2cPins: { sda: 'G21', scl: 'G22' },
      serialPins: [
        { rx: 'G3', tx: 'G1' },
        { rx: 'G16', tx: 'G17' }
      ]
    },
    'arduinoEsp32S3': {
      category: 'arduino',
      name: 'ESP32-S3',
      digitalPins: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
                    'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G21', 'G38', 'G39', 'G40', 'G41', 'G42'],
      analogPins: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'],
      pwmPins: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
                'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G21'],
      i2cPins: { sda: 'G8', scl: 'G9' },
      serialPins: { rx: 'G44', tx: 'G43' }
    },

    // ESP8266 / NodeMCU
    'arduinoEsp8266NodeMCU': {
      category: 'arduino',
      name: 'NodeMCU (ESP8266)',
      digitalPins: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
      analogPins: ['A0'],
      pwmPins: ['D1', 'D2', 'D5', 'D6', 'D7', 'D8'],
      i2cPins: { sda: 'D2', scl: 'D1' },
      serialPins: { rx: 'D9', tx: 'D10' }
    },

    // Raspberry Pi Pico
    'arduinoRaspberryPiPico': {
      category: 'arduino',
      name: 'Raspberry Pi Pico',
      digitalPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9',
                    'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18',
                    'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
      analogPins: ['GP26', 'GP27', 'GP28'],
      pwmPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9',
                'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18',
                'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
      i2cPins: [
        { sda: 'GP0', scl: 'GP1' },
        { sda: 'GP2', scl: 'GP3' }
      ],
      serialPins: [
        { rx: 'GP1', tx: 'GP0' },
        { rx: 'GP5', tx: 'GP4' }
      ]
    },
    'arduinoRaspberryPiPicoW': {
      category: 'arduino',
      name: 'Raspberry Pi Pico W',
      digitalPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9',
                    'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18',
                    'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
      analogPins: ['GP26', 'GP27', 'GP28'],
      pwmPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9',
                'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18',
                'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
      i2cPins: [
        { sda: 'GP0', scl: 'GP1' },
        { sda: 'GP2', scl: 'GP3' }
      ],
      serialPins: [
        { rx: 'GP1', tx: 'GP0' },
        { rx: 'GP5', tx: 'GP4' }
      ]
    },

    // Micro:bit
    'microbit': {
      category: 'microbit',
      name: 'BBC Micro:bit',
      digitalPins: ['P0', 'P1', 'P2', 'P3', 'P4', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16'],
      analogPins: ['P0', 'P1', 'P2', 'P3', 'P4', 'P10'],
      pwmPins: ['P0', 'P1', 'P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P1', tx: 'P0' }
    },
    'microbitV2': {
      category: 'microbit',
      name: 'BBC Micro:bit V2',
      digitalPins: ['P0', 'P1', 'P2', 'P3', 'P4', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16'],
      analogPins: ['P0', 'P1', 'P2', 'P3', 'P4', 'P10'],
      pwmPins: ['P0', 'P1', 'P2'],
      i2cPins: { sda: 'P20', scl: 'P19' },
      serialPins: { rx: 'P1', tx: 'P0' }
    }
  };

  // Estado de configuración de pines (se inicializa cuando se carga un robot)
  this.pinConfiguration = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // FIN CONSTANTES
  // ═══════════════════════════════════════════════════════════════════════════

  self.rulerState = 0;
  self.pickedPoints = [null, null];
  self.touchDevice = false;
  self.drag = false;
  self.showFPS = false;

  // Run on page load
  this.init = function() {
    self.$console = $('.console');
    self.$consoleBtn = $('.console .chevron');
    self.$consoleContent = $('.console .content');
    self.$consoleClear = $('.console .clear');
    self.$runSim = $('.runSim');
    self.$world = $('.world');
    self.$reset = $('.reset');
    self.$cameraSelector = $('.cameraSelector');
    self.$camera = $('.camera');
    self.$cameraOptions = $('.cameraOptions');
    self.$sensors = $('.sensors');
    self.$ruler = $('.ruler');
    self.$joystick = $('.joystick');
    self.$joystickIcon = $('.joystick > .icon');
    self.$virtualJoystick = $('.virtualJoystick');
    self.$virtualJoystickIndicator = $('.icon-virtualJoystickIndicator');
    self.$hubButtons = $('.hubButtons');
    self.$hubButtonsIcon = $('.hubButtons > .icon');
    self.$keyboard = $('.keyboard');
    self.$fps = $('.fps');
    self.$plotter = $('#plotter');
    self.$plotterCanvas = $('#plotterCanvas');
    self.$closePlotter = $('#plotter .close');
    self.$plotterPosition = $('#plotter .position');

    setOnClickAnimation([self.$runSim, self.$world, self.$reset, self.$camera, self.$ruler, self.$sensors, self.$joystickIcon, self.$hubButtonsIcon]);

    self.$sensorsPanel = $('.sensorReadings');
    self.$worldInfoPanel = $('.worldInfo');

    self.$consoleBtn.click(self.toggleConsole);
    self.$console.on('transitionend', self.scrollConsoleToBottom);
    self.$consoleClear.click(self.clearConsole);
    self.$runSim.click(self.runSim);
    self.$world.click(self.selectWorld);
    self.$reset.click(function() {
      if (babylon.cameraMode == 'follow') {
        self.resetSim().then(function(){
          babylon.resetCamera();
        });
      } else {
        self.resetSim();
      }
    });
    self.$camera.click(self.toggleCameraSelector);
    self.$cameraOptions.click(self.switchCamera);
    self.$sensors.click(self.toggleSensorsPanel);
    self.$closePlotter.click(self.closePlotter);
    self.$plotterCanvas[0].addEventListener('mousemove', self.plotterDisplayPosition);

    if (self.$hubButtons.length > 0) {
      self.$hubButtonsIcon.click(self.toggleHubButtons);
      self.setupHubButtons();
    }

    if (self.$virtualJoystick.length > 0) {
      self.$joystick.on('click', function(event) {
        if (self.$joystick.hasClass('closed') || $(event.target).closest('.icon').length) {
          self.toggleJoystick();

          if (!self.$joystick.hasClass('closed')) self.$joystick.trigger('focus');
        }
      });
      self.$joystick.on('keydown', function(event) {
        if ((event.key === 'Enter' || event.key === ' ') && $(event.target).is(self.$joystick)) {
          self.toggleJoystick();
          event.preventDefault();
        }
      });
      self.$keyboard.click(function(event) {
        event.stopPropagation();
        self.keyboardHelp();
      });
      self.setupJoystick();
      self.setupJoystickKeyControls();
    }

    self.$ruler[0].addEventListener('pointerup', function(e){
      if (e.pointerType == 'touch') {
        self.touchDevice = true;
      } else {
        self.touchDevice = false;
        babylon.marker1.isVisible = true;
      }
      self.toggleRuler();
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener('pointerdown', function(){
      self.drag = false;
    });
    window.addEventListener('pointermove', function(){
      self.drag = true;
    });
    window.addEventListener('pointerup', function(e){
      if (self.drag == false) {
        self.recordMeasurements();
      }
    });
    setInterval(self.displayMeasurements, 50);

    self.updateSensorsPanelTimer = setInterval(self.updateSensorsPanel, 250);
  };

  // Close plotter window
  this.closePlotter = function() {
    self.$plotter.addClass('hide');
  };

  // Draw plotter position
  this.plotterDisplayPosition = function(e) {
    let canvas = self.$plotterCanvas[0];
    let bounding = canvas.getBoundingClientRect();
    let x = e.clientX - bounding.left;
    let y = canvas.offsetHeight - (e.clientY - bounding.top);
    let w = canvas.maxX - canvas.minX;
    let h = canvas.maxY - canvas.minY;
    x = x / canvas.offsetWidth * w + canvas.minX;
    y = y / canvas.offsetHeight * h + canvas.minY;
    let angle = Math.atan2(y, x) / Math.PI * 180;
    let dist = Math.sqrt(x**2 + y**2);
    x = Math.round(x);
    y = Math.round(y);
    angle = Math.round(angle);
    dist = Math.round(dist);

    self.$plotterPosition.text('x: ' + x + ' y: ' + y + ' angle: ' + angle + ' dist: ' + dist);
  };

  // Run when the simPanel in inactive
  this.onInActive = function() {
    if (! skulpt.running) {
      babylon.engine.stopRenderLoop();
    }
  };

  // Run when the simPanel in active
  this.onActive = function() {
    if (babylon.engine._activeRenderLoops.length == 0)
    babylon.engine.runRenderLoop(function(){
      babylon.scene.render();
    });
  };

  function manualDebug() {}

  function ensureManualRenderLoop() {
    if (!babylon || !babylon.engine || !babylon.scene) return false;
    if (babylon.engine._activeRenderLoops.length === 0) {
      babylon.engine.runRenderLoop(function() { babylon.scene.render(); });
      manualDebug('render-loop-restarted', {reason: 'manual-control'});
    }
    return true;
  }

  // Setup virtual joystick
  this.setupJoystick = function() {
    function moveSteering(steering, speed) {
      ensureManualRenderLoop();
      if (typeof babylon.world.manualMoved == 'function') {
        babylon.world.manualMoved();
      }

      if (steering > 1) {
        steering = 1;
      } else if (steering < -1) {
        steering = -1;
      }
      if (speed > 1) {
        speed = 1;
      } else if (speed < -1) {
        speed = -1;
      }

      if (steering > 0) {
        robot.leftWheel.speed_sp = speed * 1000;
        robot.rightWheel.speed_sp = speed * 1000 * (1 - steering * 2);
        robot.leftWheel.runForever();
        robot.rightWheel.runForever();
      } else {
        robot.leftWheel.speed_sp = speed * 1000 * (1 + steering * 2)
        robot.rightWheel.speed_sp = speed * 1000;
        robot.leftWheel.runForever();
        robot.rightWheel.runForever();
      }
    }
    function stop() {
      robot.leftWheel.speed_sp = 0;
      robot.rightWheel.speed_sp = 0;
      robot.leftWheel.stop();
      robot.rightWheel.stop();
    }

    var joystickPointerId = null;
    var lastDriveDebug = 0;

    function driveFromPointer(e) {
      var rect = self.$virtualJoystick[0].getBoundingClientRect();
      var controlWidth = rect.width > 0 ? rect.width : 150;
      var controlHeight = rect.height > 0 ? rect.height : 150;
      var x = Math.max(0, Math.min(controlWidth, e.clientX - rect.left)) / controlWidth;
      var y = Math.max(0, Math.min(controlHeight, e.clientY - rect.top)) / controlHeight;
      self.$virtualJoystickIndicator[0].style.left = ((x - 0.5) * 150) + 'px';
      self.$virtualJoystickIndicator[0].style.top = ((y - 0.5) * 150) + 'px';

      var normalizedX = (x - 0.5) * 2;
      var normalizedY = (0.5 - y) * 2;
      var steering = 1 - 2 * Math.abs(Math.atan2(normalizedY, normalizedX) / Math.PI);
      var speed = Math.min(1, Math.sqrt(normalizedY * normalizedY + normalizedX * normalizedX));
      if (normalizedY < 0) {
        speed = -speed;
        steering = -steering;
      }

      if (!Number.isFinite(steering) || !Number.isFinite(speed)) return;
      moveSteering(steering, speed);
      if (Date.now() - lastDriveDebug > 250) {
        lastDriveDebug = Date.now();
        manualDebug('pointer-drive', {
          speed: speed, steering: steering,
          leftSpeedSp: robot.leftWheel.speed_sp,
          rightSpeedSp: robot.rightWheel.speed_sp,
          leftMode: robot.leftWheel.mode, rightMode: robot.rightWheel.mode,
          loops: babylon.engine._activeRenderLoops.length
        });
      }
    }

    self.$virtualJoystick[0].addEventListener('pointerdown', function(e) {
      joystickPointerId = e.pointerId;
      self.$virtualJoystick[0].setPointerCapture(e.pointerId);
      driveFromPointer(e);
      e.preventDefault();
      e.stopPropagation();
    });
    self.$virtualJoystick[0].addEventListener('pointermove', function(e) {
      if (joystickPointerId !== e.pointerId) return;
      driveFromPointer(e);
      e.preventDefault();
      e.stopPropagation();
    });

    function resetJoystick(e) {
      if (e && joystickPointerId !== null && e.pointerId !== joystickPointerId) return;
      if (e && self.$virtualJoystick[0].hasPointerCapture(e.pointerId)) {
        self.$virtualJoystick[0].releasePointerCapture(e.pointerId);
      }
      joystickPointerId = null;
      self.$virtualJoystickIndicator[0].style.left = '0px';
      self.$virtualJoystickIndicator[0].style.top = '0px';
      stop();
    }
    self.$virtualJoystick[0].addEventListener('pointerup', resetJoystick);
    self.$virtualJoystick[0].addEventListener('pointercancel', resetJoystick);
    self.$virtualJoystick[0].addEventListener('lostpointercapture', resetJoystick);
  };

  // Key controls for joystick
  this.setupJoystickKeyControls = function() {
    let left, right, up, down;

    function moveTank(leftWheel, rightWheel) {
      if (typeof babylon.world.manualMoved == 'function') {
        babylon.world.manualMoved();
      }

      robot.leftWheel.speed_sp = leftWheel;
      robot.rightWheel.speed_sp = rightWheel;
      if (leftWheel == 0) {
        robot.leftWheel.stop();
      } else {
        robot.leftWheel.runForever();
      }
      if (rightWheel == 0) {
        robot.rightWheel.stop();
      } else {
        robot.rightWheel.runForever();
      }
    }

    function drive() {
      let l = 0, r = 0;
      let SPEED = 200;

      if (up) {
        l = SPEED;
        r = SPEED;
        if (left) {
          l = 0;
        } else if (right) {
          r = 0;
        }
      } else if (down) {
        l = -SPEED;
        r = -SPEED;
        if (left) {
          r = 0;
        } else if (right) {
          l = 0;
        }
      } else if (left) {
        l = -SPEED / 2;
        r = SPEED / 2;
      } else if (right) {
        l = SPEED / 2;
        r = -SPEED / 2;
      }

      moveTank(l, r);
    }

    self.$joystick[0].addEventListener('keydown', event => {
      if (event.isComposing) {
        return;
      }
      if (self.$joystick.hasClass('closed')) {
        return;
      }

      if (event.key == 'ArrowLeft') {
        left = true;
      } else if (event.key == 'ArrowUp') {
        up = true;
      } else if (event.key == 'ArrowRight') {
        right = true;
      } else if (event.key == 'ArrowDown') {
        down = true;
      }
      drive();

      event.preventDefault();
    });

    self.$joystick[0].addEventListener('keyup', event => {
      if (event.isComposing) {
        return;
      }
      if (self.$joystick.hasClass('closed')) {
        return;
      }
      if (event.key == 'ArrowLeft') {
        left = false;
      } else if (event.key == 'ArrowUp') {
        up = false;
      } else if (event.key == 'ArrowRight') {
        right = false;
      } else if (event.key == 'ArrowDown') {
        down = false;
      }
      drive();
    });

    self.$joystick[0].addEventListener('focusout', event => {
      left = false;
      right = false;
      up = false;
      down = false;
      drive();
    });
  };

  // Help message for keyboard controls
  self.keyboardHelp = function() {
    let options = {
      title: 'Keyboard Controls',
      message:
        '<p>' +
        'Use the arrow keys to manually drive the robot. ' +
        'The virtual joystick window must be opened and selected (...click on it) for keyboard controls to work. ' +
        '</p>'
    }
    acknowledgeDialog(options);
  };

  // Toggle virtual joystick
  this.toggleJoystick = function() {
    self.$joystick.toggleClass('closed');
  };

  // Setup hub buttons
  this.setupHubButtons = function() {
    let backspace = 'backspace';
    let up = 'up';
    let down = 'down';
    let left = 'left';
    let right = 'right';
    let enter = 'enter';

    let buttons = {};
    buttons[backspace] = $('.hubButtons .icon-buttonsBackspace');
    buttons[up] = $('.hubButtons .icon-buttonsUp');
    buttons[down] = $('.hubButtons .icon-buttonsDown');
    buttons[left] = $('.hubButtons .icon-buttonsLeft');
    buttons[right] = $('.hubButtons .icon-buttonsRight');
    buttons[enter] = $('.hubButtons .icon-buttonsEnter');

    function setBtn(key, state) {
      return function(evt) {
        if (state) {
          evt.target.classList.add('pressed');
        } else {
          evt.target.classList.remove('pressed');
        }
        robot.setHubButton(key, state);
      }
    }

    for (let btn in buttons) {
      buttons[btn][0].addEventListener('pointerdown', setBtn(btn, true));
      buttons[btn][0].addEventListener('pointerup', setBtn(btn, false));
      buttons[btn][0].addEventListener('pointerout', setBtn(btn, false));
    }
  };

  // Toggle hub buttons
  this.toggleHubButtons = function() {
    self.$hubButtons.toggleClass('closed');
  };

  // toggle ruler
  this.toggleRuler = function() {
    if (self.$ruler.hasClass('closed')) {
      self.$ruler.removeClass('closed');
      self.rulerState = 1;
    } else {
      self.$ruler.addClass('closed');
      babylon.marker1.isVisible = false;
      babylon.marker2.isVisible = false;
      self.rulerState = 0;
    }
  };

  // display ruler measurements
  this.displayMeasurements = function(point) {
    if (self.rulerState == 0 || self.rulerState == 3) {
      return;
    }

    if (typeof point == 'undefined') {
      if (self.touchDevice) {
        return;
      }
      point = babylon.scene.pick(babylon.scene.pointerX, babylon.scene.pointerY);
    }
    if (!point.pickedPoint) {
      return;
    }

    if (self.touchDevice == false) {
      if (self.rulerState == 1) {
        babylon.marker1.position.x = point.pickedPoint.x;
        babylon.marker1.position.y = point.pickedPoint.y + 2;
        babylon.marker1.position.z = point.pickedPoint.z;
      } else if (self.rulerState == 2) {
        babylon.marker2.position.x = point.pickedPoint.x;
        babylon.marker2.position.y = point.pickedPoint.y + 2;
        babylon.marker2.position.z = point.pickedPoint.z;
      }
    }

    let prevPoint = null;
    if (self.rulerState == 1) {
      prevPoint = robot.body.absolutePosition;
    } else if (self.rulerState == 2) {
      prevPoint = self.pickedPoints[0];
    }

    let x = Math.round(point.pickedPoint.x * 10) / 10;
    let y = Math.round(point.pickedPoint.y * 10) / 10;
    let z = Math.round(point.pickedPoint.z * 10) / 10;
    let dist = Math.round(point.pickedPoint.subtract(prevPoint).length() * 10) / 10;
    let dx = point.pickedPoint.x - prevPoint.x;
    let dy = point.pickedPoint.z - prevPoint.z;
    let angle = Math.atan(dx / dy);
    if (dy < 0) {
      if (dx < 0) {
        angle = angle - Math.PI;
      } else {
        angle = Math.PI + angle;
      }
    }
    angle = Math.round(angle / Math.PI * 180 * 10) / 10;

    self.$ruler.find('.x').text('X: ' + x + ' cm');
    self.$ruler.find('.y').text('Y: ' + z + ' cm');
    self.$ruler.find('.alt').text(i18n.get('#sim-alt#') + ': ' + y + ' cm');
    self.$ruler.find('.dist').text(i18n.get('#sim-distance#') + ': ' + dist + ' cm');
    self.$ruler.find('.angle').text(i18n.get('#sim-angle#') + ': ' + angle + '°');
  };

  // Record ruler measurements
  this.recordMeasurements = function() {
    if (self.rulerState == 0) {
      return;
    }

    if (self.rulerState == 1) {
      let point = babylon.scene.pick(babylon.scene.pointerX, babylon.scene.pointerY);
      if (point.pickedPoint) {
        babylon.marker1.position.x = point.pickedPoint.x;
        babylon.marker1.position.y = point.pickedPoint.y + 2;
        babylon.marker1.position.z = point.pickedPoint.z;
        babylon.marker1.isVisible = true;

        if (self.touchDevice) {
          self.displayMeasurements(point);
        } else {
          babylon.marker2.position.x = point.pickedPoint.x;
          babylon.marker2.position.y = point.pickedPoint.y + 2;
          babylon.marker2.position.z = point.pickedPoint.z;
          babylon.marker2.isVisible = true;
        }
        self.rulerState = 2;
        self.pickedPoints[0] = point.pickedPoint;
      }
    } else if (self.rulerState == 2) {
      let point = babylon.scene.pick(babylon.scene.pointerX, babylon.scene.pointerY);
      if (point.pickedPoint) {
        babylon.marker2.position.x = point.pickedPoint.x;
        babylon.marker2.position.y = point.pickedPoint.y + 2;
        babylon.marker2.position.z = point.pickedPoint.z;
        babylon.marker2.isVisible = true;

        self.displayMeasurements(point);
        self.rulerState = 3;
        self.pickedPoints[1] = point.pickedPoint;
      }
    } else if (self.rulerState == 3) {
      self.rulerState = 2;
      self.pickedPoints[0] = self.pickedPoints[1];
      babylon.marker1.position.x = self.pickedPoints[0].x;
      babylon.marker1.position.y = self.pickedPoints[0].y + 2;
      babylon.marker1.position.z = self.pickedPoints[0].z;
      if (self.touchDevice) {
        babylon.marker2.isVisible = false;
      }
    }
  };

  // clear world info
  this.clearWorldInfoPanel = function() {
    self.$worldInfoPanel.empty();
  };

  // draw world info
  this.drawWorldInfo = function(html) {
    self.$worldInfoPanel.append(html);
  };

  // show world info
  this.showWorldInfoPanel = function() {
    self.$worldInfoPanel.removeClass('hide');
  };

  // hide world info
  this.hideWorldInfoPanel = function() {
    self.$worldInfoPanel.addClass('hide');
  };

  // init sensor panel
  this.initSensorsPanel = function() {
    function genDiv(sensorType, values) {
      let $div = $(
        '<div class="sensorReading">' +
          '<div class="sensorType"></div>' +
          '<table class="sensorValues"></table>' +
        '</div>'
      );

      $div.find('.sensorType').text(sensorType);
      let $table = $div.find('.sensorValues');
      valuesElements = [];
      values.forEach(function(value) {
        let $line = $('<tr><td class="sensorValueName">' + value + '</td><td class="sensorValue">-</td></tr>');
        valuesElements.push($line.find('.sensorValue'));
        $table.append($line);
      });

      return [$div, valuesElements];
    }

    var i = 1;
    var sensor = null;
    self.$sensorsPanel.empty();
    self.sensors = [];
    while (sensor = robot.getComponentByPort('in' + i)) {
      let tmp = null;
      if (sensor.type == 'ColorSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-color_sensor#'),
          [i18n.get('#sim-color#'), i18n.get('#sim-red#'), i18n.get('#sim-green#'), i18n.get('#sim-blue#'), i18n.get('#sim-intensity#')]
        );
      } else if (sensor.type == 'UltrasonicSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-ultrasonic#'),
          [i18n.get('#sim-distance#') + ' (cm)']
        );
      } else if (sensor.type == 'GyroSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-gyro#'),
          [i18n.get('#sim-angle#')]
        );
      } else if (sensor.type == 'GPSSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-gps#'),
          ['X (cm)', 'Y (cm)', i18n.get('#sim-altitude#')]
        );
      } else if (sensor.type == 'LaserRangeSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-laser#'),
          [i18n.get('#sim-distance#') + ' (cm)']
        );
      } else if (sensor.type == 'LidarSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-lidar#'),
          []
        );
      } else if (sensor.type == 'TouchSensor') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-touch#'),
          [i18n.get('#sim-is_pressed#')]
        );
      } else if (sensor.type == 'Pen') {
        tmp = genDiv(
          sensor.port + ': ' + i18n.get('#sim-pen#'),
          []
        );
      } else if (sensor.type == 'CameraSensor') {
        tmp = $(
          '<div class="sensorReading">' +
            '<div class="sensorType">' + sensor.port + ': ' + i18n.get('#sim-camera#') + '</div>' +
            '<table class="sensorValues">' +
              '<tr><td class="sensorValueName">' +
                '<button class="showRttView">' + i18n.get('#sim-show#') + '</button><button class="hideRttView">' + i18n.get('#sim-hide#') + '</button>' +
              '</td></tr>' +
            '</table>' +
          '</div>'
        );
        let clickHandler = function(type, port) {
          return function() {
            if (type == 'show') {
              babylon.rttViewMat.diffuseTexture = robot.getComponentByPort(port).renderTarget;
              babylon.rttView.setEnabled(true);
            } else {
              babylon.rttView.setEnabled(false);
            }
          }
        }

        tmp.find('.showRttView').click(clickHandler('show', sensor.port));
        tmp.find('.hideRttView').click(clickHandler('hide', sensor.port));
      } else {
        console.log(sensor);
      }

      if (tmp) {
        self.$sensorsPanel.append(tmp[0]);
        self.sensors.push([sensor, tmp[1]]);
      }
      i++;
    }

    if (robot.processedOptions.wheels) {
      let tmp = genDiv(
        'outA: ' + i18n.get('#sim-left_motor#'),
        [i18n.get('#sim-position#')]
      );
      self.$sensorsPanel.append(tmp[0]);
      self.sensors.push([robot.leftWheel, tmp[1]]);
      tmp = genDiv(
        'outB: ' + i18n.get('#sim-right_motor#'),
        [i18n.get('#sim-position#')]
      );
      self.$sensorsPanel.append(tmp[0]);
      self.sensors.push([robot.rightWheel, tmp[1]]);
    }

    let PORT_LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    i = robot.processedOptions.wheels ? 3 : 1;
    var motor = null;
    while (motor = robot.getComponentByPort('out' + PORT_LETTERS[i])) {
      if (motor.type == 'ArmActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-arm#'),
          [i18n.get('#sim-position#')]
          );
      } else if (motor.type == 'SwivelActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-swivel#'),
          [i18n.get('#sim-position#')]
          );
      } else if (motor.type == 'LinearActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-linear#'),
          [i18n.get('#sim-position#')]
          );
      } else if (motor.type == 'PaintballLauncherActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-paintball#'),
          [i18n.get('#sim-position#')]
          );
      } else if (motor.type == 'MagnetActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-magnet#'),
          [i18n.get('#sim-magnet_power#')]
          );
      } else if (motor.type == 'WheelActuator') {
        tmp = genDiv(
          motor.port + ': ' + i18n.get('#sim-wheel#'),
          [i18n.get('#sim-position#')]
          );
        }

      if (tmp) {
        self.$sensorsPanel.append(tmp[0]);
        self.sensors.push([motor, tmp[1]]);
      }
      i++;
    }
  };

  // update sensor panel
  this.updateSensorsPanel = function() {
    if (self.$sensorsPanel.hasClass('hide')) {
      return;
    }

    self.sensors.forEach(function(sensor) {
      if (sensor[0].type == 'ColorSensor') {
        let rgb = sensor[0].getRGB();
        let hsv = Colors.toHSV(rgb);
        let color = Colors.toColor(hsv);
        let colorName = Colors.toColorName(color);
        sensor[1][0].text(color + ' : ' + colorName);
        sensor[1][1].text(Math.round(rgb[0]));
        sensor[1][2].text(Math.round(rgb[1]));
        sensor[1][3].text(Math.round(rgb[2]));
        sensor[1][4].text(Math.round(rgb[0] / 2.55));
      } else if (sensor[0].type == 'UltrasonicSensor') {
        sensor[1][0].text(Math.round(sensor[0].getDistance() * 10) / 10);
      } else if (sensor[0].type == 'GyroSensor') {
        sensor[1][0].text(Math.round(sensor[0].getYawAngle()));
      } else if (sensor[0].type == 'GPSSensor') {
        let position = sensor[0].getPosition();
        sensor[1][0].text(Math.round(position[0] * 10) / 10);
        sensor[1][1].text(Math.round(position[2] * 10) / 10);
        sensor[1][2].text(Math.round(position[1] * 10) / 10);
      } else if (sensor[0].type == 'WheelActuator') {
        sensor[1][0].text(Math.round(sensor[0].position));
      } else if (sensor[0].type == 'ArmActuator') {
        sensor[1][0].text(Math.round(sensor[0].position));
      } else if (sensor[0].type == 'LaserRangeSensor') {
        sensor[1][0].text(Math.round(sensor[0].getDistance() * 10) / 10);
      } else if (sensor[0].type == 'TouchSensor') {
        sensor[1][0].text(sensor[0].isPressed());
      } else if (sensor[0].type == 'SwivelActuator') {
        sensor[1][0].text(Math.round(sensor[0].position));
      } else if (sensor[0].type == 'LinearActuator') {
        sensor[1][0].text(Math.round(sensor[0].position));
      } else if (sensor[0].type == 'PaintballLauncherActuator') {
        sensor[1][0].text(Math.round(sensor[0].position));
      } else if (sensor[0].type == 'MagnetActuator') {
        sensor[1][0].text(Math.round(sensor[0].power * 100 / sensor[0].options.maxPower));
      }
    });
  };

  // toggle sensors panel
  this.toggleSensorsPanel = function() {
    // Usar nuevo panel V2
    if (!self.pinConfiguration) {
      self.initPinConfiguration();
    }
    self.renderSensorsPanelV2();
    self.$sensorsPanel.toggleClass('hide');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL DE SENSORES V2 - Funciones principales
  // ═══════════════════════════════════════════════════════════════════════════

  // Inicializar configuración de pines para el robot actual
  this.initPinConfiguration = function() {
    // También verificar main.stblockBoardType por si STBlock lo actualizó
    let boardType = (robot.options && robot.options.boardType) ||
                    (typeof main !== 'undefined' && main.stblockBoardType) ||
                    'stbBoardV2';
    let boardConfig = BOARD_PIN_CONFIGS[boardType] || BOARD_PIN_CONFIGS['stbBoardV2'];

    console.log('[SimPanel] Inicializando panel con tarjeta:', boardType, '- categoría:', boardConfig.category);

    self.pinConfiguration = {
      boardType: boardType,
      boardConfig: boardConfig,
      usedPins: {},
      components: {}
    };

    // Obtener componentes del robot y asignar pines por defecto
    let components = self.getRobotComponentsV2();
    let pinIndex = { digital: 0, pwm: 0, analog: 0, motor: 0, sensor: 0 };

    // Procesar motores
    components.motors.forEach(function(comp) {
      self.assignDefaultPins(comp, boardConfig, pinIndex);
    });

    // Procesar sensores
    components.sensors.forEach(function(comp) {
      self.assignDefaultPins(comp, boardConfig, pinIndex);
    });

    // Procesar actuadores
    components.actuators.forEach(function(comp) {
      self.assignDefaultPins(comp, boardConfig, pinIndex);
    });

    // Intentar cargar configuración de sesión
    self.loadPinConfigFromSession();
  };

  // Asignar pines por defecto a un componente
  this.assignDefaultPins = function(comp, boardConfig, pinIndex) {
    let def = COMPONENT_PIN_DEFINITIONS[comp.type];
    if (!def) return;

    let pins = {};

    // Si es STBoard, usar puertos simples
    if (boardConfig.category === 'stblock') {
      if (def.category === 'motor') {
        let port = boardConfig.motorPorts[pinIndex.motor] || 'A1';
        pins = { port: port };
        pinIndex.motor++;
      } else {
        let port = boardConfig.sensorPorts[pinIndex.sensor] || '1';
        pins = { port: port };
        pinIndex.sensor++;
      }
    } else {
      // Arduino y otros - asignar pines individuales
      def.pinsRequired.forEach(function(pinReq) {
        if (pinReq.type === 'pwm') {
          pins[pinReq.id] = boardConfig.pwmPins[pinIndex.pwm] || 'D3';
          pinIndex.pwm++;
        } else if (pinReq.type === 'analog') {
          pins[pinReq.id] = boardConfig.analogPins[pinIndex.analog] || 'A0';
          pinIndex.analog++;
        } else if (pinReq.type === 'i2c') {
          // I2C usa pines fijos compartidos
          if (Array.isArray(boardConfig.i2cPins)) {
            pins[pinReq.id] = boardConfig.i2cPins[0][pinReq.id] || 'A4';
          } else {
            pins[pinReq.id] = boardConfig.i2cPins[pinReq.id] || 'A4';
          }
        } else if (pinReq.type === 'serial') {
          if (Array.isArray(boardConfig.serialPins)) {
            pins[pinReq.id] = boardConfig.serialPins[0][pinReq.id] || 'D0';
          } else {
            pins[pinReq.id] = boardConfig.serialPins[pinReq.id] || 'D0';
          }
        } else {
          // Digital
          pins[pinReq.id] = boardConfig.digitalPins[pinIndex.digital] || 'D2';
          pinIndex.digital++;
        }
      });
    }

    self.pinConfiguration.components[comp.id] = {
      type: comp.type,
      name: comp.name,
      pins: pins,
      protocol: def.protocol,
      canShare: def.canShare
    };

    // Registrar pines usados
    for (let pinId in pins) {
      let pinValue = pins[pinId];
      if (!self.pinConfiguration.usedPins[pinValue]) {
        self.pinConfiguration.usedPins[pinValue] = [];
      }
      self.pinConfiguration.usedPins[pinValue].push(comp.id);
    }
  };

  // Obtener todos los componentes del robot actual
  this.getRobotComponentsV2 = function() {
    let components = {
      motors: [],
      sensors: [],
      actuators: []
    };

    if (!robot || !robot.options) return components;

    // Ruedas/Motores base
    if (robot.leftWheel) {
      components.motors.push({
        id: 'motor_left',
        name: 'Motor Izquierdo',
        type: 'WheelDrive',
        instance: robot.leftWheel,
        port: robot.options.wheelLeftPort || 'A1'
      });
    }
    if (robot.rightWheel) {
      components.motors.push({
        id: 'motor_right',
        name: 'Motor Derecho',
        type: 'WheelDrive',
        instance: robot.rightWheel,
        port: robot.options.wheelRightPort || 'A2'
      });
    }

    // Componentes del array
    if (robot.components) {
      robot.components.forEach(function(comp, idx) {
        let def = COMPONENT_PIN_DEFINITIONS[comp.type];
        if (!def) return;

        let item = {
          id: comp.type.toLowerCase() + '_' + idx,
          name: def.name || comp.type,
          type: comp.type,
          instance: comp,
          port: comp.port || ('in' + (idx + 1))
        };

        if (def.category === 'sensor') {
          components.sensors.push(item);
        } else if (def.category === 'actuator') {
          components.actuators.push(item);
        } else if (def.category === 'motor') {
          components.motors.push(item);
        }
      });
    }

    return components;
  };

  // Renderizar el panel de sensores V2
  this.renderSensorsPanelV2 = function() {
    let $panel = self.$sensorsPanel;
    $panel.empty();

    // Verificar si el boardType ha cambiado
    let currentBoardType = (robot.options && robot.options.boardType) ||
                           (typeof main !== 'undefined' && main.stblockBoardType) ||
                           'stbBoardV2';

    if (!self.pinConfiguration || self.pinConfiguration.boardType !== currentBoardType) {
      console.log('[SimPanel] Reinicializando panel - boardType cambió a:', currentBoardType);
      self.pinConfiguration = null;
      self.initPinConfiguration();
    }

    let boardType = self.pinConfiguration.boardType;
    let boardConfig = self.pinConfiguration.boardConfig;
    let components = self.getRobotComponentsV2();

    // Inyectar estilos si no existen
    self.injectSensorsPanelStyles();

    // Crear estructura HTML
    let html = '<div class="sensors-panel-v2">';

    // Header
    html += `
      <div class="sp-header">
        <div class="sp-title">
          <span class="sp-icon">⚙️</span>
          <span>Configuración</span>
        </div>
        <div class="sp-board-info">
          <span class="sp-board-chip">${boardConfig.name || boardType}</span>
        </div>
      </div>
    `;

    // Sección Motores
    if (components.motors.length > 0) {
      html += self.renderSectionV2('motors', 'Motores', '🔧', components.motors);
    }

    // Sección Sensores
    if (components.sensors.length > 0) {
      html += self.renderSectionV2('sensors', 'Sensores', '📡', components.sensors);
    }

    // Sección Actuadores
    if (components.actuators.length > 0) {
      html += self.renderSectionV2('actuators', 'Actuadores', '🦾', components.actuators);
    }

    // Si no hay componentes
    if (components.motors.length === 0 && components.sensors.length === 0 && components.actuators.length === 0) {
      html += `
        <div class="sp-empty">
          <span class="sp-empty-icon">🤖</span>
          <p>No hay componentes en este robot</p>
        </div>
      `;
    }

    // Footer
    html += `
      <div class="sp-footer">
        <button class="sp-btn sp-btn-reset" title="Restaurar pines por defecto">🔄 Reiniciar</button>
        <div class="sp-conflict-indicator" style="display:none;">
          ⚠️ <span class="sp-conflict-count">0</span> conflictos
        </div>
      </div>
    </div>`;

    $panel.html(html);

    // Bind eventos
    self.bindSensorsPanelEventsV2();

    // Iniciar actualización de valores
    self.startSensorUpdatesV2();
  };

  // Renderizar una sección del panel
  this.renderSectionV2 = function(sectionId, title, icon, items) {
    let html = `
      <div class="sp-section sp-${sectionId}">
        <div class="sp-section-header" data-section="${sectionId}">
          <span class="sp-section-icon">${icon}</span>
          <span class="sp-section-title">${title} (${items.length})</span>
          <button class="sp-collapse-btn">▼</button>
        </div>
        <div class="sp-section-content">
    `;

    items.forEach(function(item) {
      html += self.renderComponentCardV2(item);
    });

    html += '</div></div>';
    return html;
  };

  // Renderizar tarjeta de componente
  this.renderComponentCardV2 = function(comp) {
    let def = COMPONENT_PIN_DEFINITIONS[comp.type] || {};
    let config = self.pinConfiguration.components[comp.id] || {};
    let boardConfig = self.pinConfiguration.boardConfig;
    let isSTBlock = boardConfig.category === 'stblock';

    let sharedClass = def.canShare ? 'sp-shared-bus' : '';
    let sharedBadge = def.canShare && def.protocol === 'i2c' ? '<span class="sp-shared-badge">I2C</span>' : '';
    if (def.canShare && def.protocol === 'serial') sharedBadge = '<span class="sp-shared-badge">Serial</span>';

    let html = `
      <div class="sp-component-card ${sharedClass}" data-component-id="${comp.id}">
        <div class="sp-component-header">
          <span class="sp-component-icon">${def.icon || '📦'}</span>
          <span class="sp-component-name">${comp.name}</span>
          ${sharedBadge}
          <span class="sp-component-status online">●</span>
        </div>
        <div class="sp-component-pins">
    `;

    // Renderizar pines
    if (isSTBlock) {
      // STBlock usa puertos simples
      let portOptions = def.category === 'motor' ? boardConfig.motorPorts : boardConfig.sensorPorts;
      let currentPort = config.pins ? config.pins.port : comp.port;

      html += `
        <div class="sp-pin-row">
          <label>Puerto</label>
          <select class="sp-pin-select" data-pin-id="port">
            ${portOptions.map(p => `<option value="${p}" ${p === currentPort ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (def.pinsRequired) {
      // Arduino y otros - pines individuales
      def.pinsRequired.forEach(function(pinReq) {
        let currentValue = config.pins ? config.pins[pinReq.id] : '';
        let pinOptions = self.getPinOptionsForType(pinReq.type, boardConfig);
        let isShared = def.canShare && (pinReq.type === 'i2c' || pinReq.type === 'serial');

        html += `
          <div class="sp-pin-row ${isShared ? 'sp-shared' : ''}">
            <label>${pinReq.label}</label>
            <select class="sp-pin-select ${isShared ? '' : ''}" data-pin-id="${pinReq.id}" ${isShared ? '' : ''}>
              ${pinOptions.map(p => `<option value="${p}" ${p === currentValue ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            ${isShared ? '<span class="sp-shared-icon" title="Pin compartido">🔗</span>' : ''}
          </div>
        `;
      });
    }

    html += '</div>';

    // Valor del componente
    html += `
        <div class="sp-component-value">
          <span class="sp-value-label">${self.getValueLabelV2(comp.type)}:</span>
          <span class="sp-value-data">-</span>
        </div>
      </div>
    `;

    return html;
  };

  // Obtener opciones de pines según tipo
  this.getPinOptionsForType = function(pinType, boardConfig) {
    switch (pinType) {
      case 'pwm':
        return boardConfig.pwmPins || [];
      case 'analog':
        return boardConfig.analogPins || [];
      case 'i2c':
        if (Array.isArray(boardConfig.i2cPins)) {
          return [boardConfig.i2cPins[0].sda, boardConfig.i2cPins[0].scl];
        }
        return [boardConfig.i2cPins.sda, boardConfig.i2cPins.scl];
      case 'serial':
        if (Array.isArray(boardConfig.serialPins)) {
          return [boardConfig.serialPins[0].rx, boardConfig.serialPins[0].tx];
        }
        return [boardConfig.serialPins.rx, boardConfig.serialPins.tx];
      case 'onewire':
      case 'digital':
      default:
        return boardConfig.digitalPins || [];
    }
  };

  // Obtener etiqueta de valor según tipo
  this.getValueLabelV2 = function(type) {
    const labels = {
      'WheelDrive': 'Velocidad',
      'UltrasonicSensor': 'Distancia',
      'ColorSensor': 'Color',
      'GyroSensor': 'Ángulo',
      'GPSSensor': 'Posición',
      'TouchSensor': 'Estado',
      'LaserRangeSensor': 'Distancia',
      'TemperatureSensor': 'Temperatura',
      'HumiditySensor': 'Humedad',
      'GasSensor': 'PPM',
      'MagnetActuator': 'Potencia',
      'ArmActuator': 'Posición',
      'SwivelActuator': 'Posición',
      'LinearActuator': 'Posición',
      'Pen': 'Estado',
      'WheelActuator': 'Velocidad'
    };
    return labels[type] || 'Valor';
  };

  // Bind eventos del panel
  this.bindSensorsPanelEventsV2 = function() {
    // Colapsar/expandir secciones
    self.$sensorsPanel.find('.sp-section-header').click(function() {
      $(this).parent('.sp-section').toggleClass('collapsed');
    });

    // Cambio de pin
    self.$sensorsPanel.find('.sp-pin-select').change(function() {
      let $select = $(this);
      let $card = $select.closest('.sp-component-card');
      let componentId = $card.data('component-id');
      let pinId = $select.data('pin-id');
      let newValue = $select.val();

      self.handlePinChangeV2(componentId, pinId, newValue, $select);
    });

    // Botón reiniciar
    self.$sensorsPanel.find('.sp-btn-reset').click(function() {
      self.resetPinConfigurationV2();
    });
  };

  // Manejar cambio de pin
  this.handlePinChangeV2 = function(componentId, pinId, newValue, $select) {
    let conflicts = self.validatePinAssignmentV2(componentId, pinId, newValue);

    if (conflicts.length > 0) {
      // Mostrar error
      $select.addClass('conflict');

      // Buscar pin alternativo
      let alternative = self.findAlternativePinV2(componentId, pinId, newValue);
      if (alternative) {
        // Asignar automáticamente el pin alternativo
        setTimeout(function() {
          $select.val(alternative);
          $select.removeClass('conflict');
          self.updatePinConfigurationV2(componentId, pinId, alternative);
          self.showToastV2('Pin ' + newValue + ' en uso. Asignado: ' + alternative, 'warning');
        }, 100);
      } else {
        self.showToastV2('No hay pines disponibles', 'error');
      }
      return;
    }

    $select.removeClass('conflict');
    self.updatePinConfigurationV2(componentId, pinId, newValue);
    self.savePinConfigToSession();
  };

  // Validar asignación de pin
  this.validatePinAssignmentV2 = function(componentId, pinId, newValue) {
    let conflicts = [];
    let myConfig = self.pinConfiguration.components[componentId];
    if (!myConfig) return conflicts;

    let myDef = COMPONENT_PIN_DEFINITIONS[myConfig.type];

    // Verificar si el pin ya está en uso
    for (let compId in self.pinConfiguration.components) {
      if (compId === componentId) continue;

      let comp = self.pinConfiguration.components[compId];
      let compDef = COMPONENT_PIN_DEFINITIONS[comp.type];

      for (let pId in comp.pins) {
        if (comp.pins[pId] === newValue) {
          // Verificar si es un bus compartido permitido
          if (myDef && compDef && myDef.canShare && compDef.canShare && myDef.protocol === compDef.protocol) {
            // OK - Bus compartido (I2C, Serial, etc.)
            continue;
          }

          conflicts.push({
            pin: newValue,
            conflictWith: compId,
            conflictPinId: pId
          });
        }
      }
    }

    return conflicts;
  };

  // Buscar pin alternativo
  this.findAlternativePinV2 = function(componentId, pinId, usedValue) {
    let config = self.pinConfiguration.components[componentId];
    if (!config) return null;

    let def = COMPONENT_PIN_DEFINITIONS[config.type];
    if (!def) return null;

    // Encontrar el tipo de pin requerido
    let pinReq = def.pinsRequired.find(p => p.id === pinId);
    if (!pinReq) return null;

    // Obtener opciones disponibles
    let options = self.getPinOptionsForType(pinReq.type, self.pinConfiguration.boardConfig);

    // Buscar uno que no esté en uso
    for (let i = 0; i < options.length; i++) {
      let candidate = options[i];
      if (candidate === usedValue) continue;

      let conflicts = self.validatePinAssignmentV2(componentId, pinId, candidate);
      if (conflicts.length === 0) {
        return candidate;
      }
    }

    return null;
  };

  // Actualizar configuración de pin
  this.updatePinConfigurationV2 = function(componentId, pinId, newValue) {
    if (!self.pinConfiguration.components[componentId]) return;

    let oldValue = self.pinConfiguration.components[componentId].pins[pinId];

    // Eliminar pin antiguo de usedPins
    if (oldValue && self.pinConfiguration.usedPins[oldValue]) {
      let idx = self.pinConfiguration.usedPins[oldValue].indexOf(componentId);
      if (idx > -1) {
        self.pinConfiguration.usedPins[oldValue].splice(idx, 1);
      }
    }

    // Actualizar pin
    self.pinConfiguration.components[componentId].pins[pinId] = newValue;

    // Registrar nuevo pin
    if (!self.pinConfiguration.usedPins[newValue]) {
      self.pinConfiguration.usedPins[newValue] = [];
    }
    self.pinConfiguration.usedPins[newValue].push(componentId);

    // Notificar cambio a STBlock
    self.notifyPinConfigChange();
  };

  // Reiniciar configuración de pines
  this.resetPinConfigurationV2 = function() {
    sessionStorage.removeItem('gearbot_pin_config_' + (robot.options ? robot.options.name : 'default'));
    self.pinConfiguration = null;
    self.initPinConfiguration();
    self.renderSensorsPanelV2();
    self.showToastV2('Pines restaurados', 'success');
  };

  // Guardar en sesión
  this.savePinConfigToSession = function() {
    if (!self.pinConfiguration) return;
    let key = 'gearbot_pin_config_' + (robot.options ? robot.options.name : 'default');
    sessionStorage.setItem(key, JSON.stringify(self.pinConfiguration.components));
  };

  // Cargar de sesión
  this.loadPinConfigFromSession = function() {
    let key = 'gearbot_pin_config_' + (robot.options ? robot.options.name : 'default');
    let boardTypeKey = key + '_boardType';
    let savedBoardType = sessionStorage.getItem(boardTypeKey);
    let currentBoardType = self.pinConfiguration.boardType;

    // Si la tarjeta cambió, no cargar configuración anterior
    if (savedBoardType && savedBoardType !== currentBoardType) {
      console.log('[SimPanel] Tarjeta cambió de', savedBoardType, 'a', currentBoardType, '- reiniciando configuración');
      sessionStorage.removeItem(key);
      sessionStorage.setItem(boardTypeKey, currentBoardType);
      return;
    }

    // Guardar tarjeta actual
    sessionStorage.setItem(boardTypeKey, currentBoardType);

    let saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        let components = JSON.parse(saved);
        // Verificar que los componentes coincidan
        for (let compId in components) {
          if (self.pinConfiguration.components[compId]) {
            self.pinConfiguration.components[compId].pins = components[compId].pins;
          }
        }
        // Recalcular usedPins
        self.pinConfiguration.usedPins = {};
        for (let compId in self.pinConfiguration.components) {
          let pins = self.pinConfiguration.components[compId].pins;
          for (let pinId in pins) {
            let pinValue = pins[pinId];
            if (!self.pinConfiguration.usedPins[pinValue]) {
              self.pinConfiguration.usedPins[pinValue] = [];
            }
            self.pinConfiguration.usedPins[pinValue].push(compId);
          }
        }
      } catch (e) {
        console.warn('[SimPanel] Error cargando configuración de sesión:', e);
      }
    }
  };

  // Notificar cambio de configuración a STBlock
  this.notifyPinConfigChange = function() {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'gearbot-pin-config-changed',
        pinConfiguration: self.pinConfiguration,
        timestamp: Date.now()
      }, '*');
    }
  };

  // Iniciar actualización de valores
  this.startSensorUpdatesV2 = function() {
    if (self.updateSensorsPanelTimerV2) {
      clearInterval(self.updateSensorsPanelTimerV2);
    }

    self.updateSensorsPanelTimerV2 = setInterval(function() {
      self.updateComponentValuesV2();
    }, 250);
  };

  // Actualizar valores de componentes
  this.updateComponentValuesV2 = function() {
    if (self.$sensorsPanel.hasClass('hide')) return;

    let components = self.getRobotComponentsV2();
    let allComponents = [...components.motors, ...components.sensors, ...components.actuators];

    allComponents.forEach(function(comp) {
      let $card = self.$sensorsPanel.find('.sp-component-card[data-component-id="' + comp.id + '"]');
      if (!$card.length || !comp.instance) return;

      let value = self.getComponentValueV2(comp);
      $card.find('.sp-value-data').html(value);
    });
  };

  // Obtener valor de componente
  this.getComponentValueV2 = function(comp) {
    if (!comp.instance) return '-';

    try {
      switch (comp.type) {
        case 'WheelDrive':
        case 'WheelActuator':
          // speed_sp máximo es ~1050, convertir a porcentaje (0-100%)
          let speed = Math.round(Math.abs(comp.instance.speed_sp || 0) / 10.5);
          return speed + '%';

        case 'UltrasonicSensor':
          return Math.round(comp.instance.getDistance() * 10) / 10 + ' cm';

        case 'ColorSensor':
          let rgb = comp.instance.getRGB();
          let hsv = Colors.toHSV(rgb);
          let color = Colors.toColor(hsv);
          let colorName = Colors.toColorName(color);
          let bgColor = 'rgb(' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')';
          return '<span class="sp-color-box" style="background:' + bgColor + ';">' + colorName + '</span>';

        case 'GyroSensor':
          return Math.round(comp.instance.getYawAngle()) + '°';

        case 'GPSSensor':
          let pos = comp.instance.getPosition();
          return Math.round(pos[0]) + ', ' + Math.round(pos[2]);

        case 'TouchSensor':
          return comp.instance.isPressed() ? '✓ Presionado' : '○ Libre';

        case 'LaserRangeSensor':
          return Math.round(comp.instance.getDistance() * 10) / 10 + ' cm';

        case 'MagnetActuator':
          let power = Math.round(comp.instance.power * 100 / (comp.instance.options.maxPower || 1));
          return power + '%';

        case 'ArmActuator':
        case 'SwivelActuator':
        case 'LinearActuator':
          return Math.round(comp.instance.position) + '°';

        case 'Pen':
          return comp.instance.position > 0 ? '✏️ Abajo' : '✏️ Arriba';

        default:
          return '-';
      }
    } catch (e) {
      return '-';
    }
  };

  // Mostrar toast
  this.showToastV2 = function(message, type) {
    let $toast = $('<div class="sp-toast sp-toast-' + type + '">' + message + '</div>');
    self.$sensorsPanel.append($toast);
    setTimeout(function() {
      $toast.addClass('show');
    }, 10);
    setTimeout(function() {
      $toast.removeClass('show');
      setTimeout(function() { $toast.remove(); }, 300);
    }, 2500);
  };

  // Inyectar estilos del panel
  this.injectSensorsPanelStyles = function() {
    if (document.getElementById('sp-v2-styles')) return;

    let styles = document.createElement('style');
    styles.id = 'sp-v2-styles';
    styles.textContent = `
      .sensors-panel-v2 {
        background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
        border-radius: 12px;
        color: white;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        overflow: hidden;
      }
      .sp-header {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .sp-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }
      .sp-board-chip {
        background: rgba(255,255,255,0.2);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }
      .sp-section {
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .sp-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        cursor: pointer;
        background: rgba(255,255,255,0.03);
        transition: background 0.2s;
      }
      .sp-section-header:hover {
        background: rgba(255,255,255,0.06);
      }
      .sp-section-icon { font-size: 16px; }
      .sp-section-title {
        flex: 1;
        font-weight: 600;
        font-size: 13px;
      }
      .sp-collapse-btn {
        background: none;
        border: none;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        padding: 4px;
        transition: transform 0.2s;
      }
      .sp-section.collapsed .sp-collapse-btn { transform: rotate(-90deg); }
      .sp-section.collapsed .sp-section-content { display: none; }
      .sp-section-content {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .sp-component-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 12px;
        transition: all 0.2s;
      }
      .sp-component-card:hover {
        border-color: rgba(99, 102, 241, 0.4);
        background: rgba(255,255,255,0.05);
      }
      .sp-component-card.sp-shared-bus {
        border-color: rgba(34, 197, 94, 0.3);
      }
      .sp-component-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .sp-component-icon { font-size: 18px; }
      .sp-component-name {
        flex: 1;
        font-weight: 600;
      }
      .sp-shared-badge {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
      }
      .sp-component-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
      }
      .sp-component-pins {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .sp-pin-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sp-pin-row label {
        width: 50px;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        font-weight: 500;
      }
      .sp-pin-select {
        flex: 1;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        color: white;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .sp-pin-select:hover { border-color: #6366f1; }
      .sp-pin-select:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }
      .sp-pin-select.conflict {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        animation: pulseConflict 0.5s ease;
      }
      @keyframes pulseConflict {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      .sp-shared-icon {
        font-size: 14px;
        cursor: help;
      }
      .sp-component-value {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .sp-value-label {
        color: rgba(255,255,255,0.5);
        font-size: 11px;
      }
      .sp-value-data {
        font-weight: 600;
        font-size: 14px;
        color: #22c55e;
      }
      .sp-color-box {
        padding: 2px 10px;
        border-radius: 4px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        font-size: 12px;
      }
      .sp-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(0,0,0,0.2);
      }
      .sp-btn {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .sp-btn:hover {
        background: rgba(255,255,255,0.15);
      }
      .sp-conflict-indicator {
        color: #ef4444;
        font-size: 12px;
        font-weight: 500;
      }
      .sp-empty {
        text-align: center;
        padding: 30px 20px;
        color: rgba(255,255,255,0.5);
      }
      .sp-empty-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 10px;
      }
      .sp-toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
      }
      .sp-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .sp-toast-success {
        background: #22c55e;
        color: white;
      }
      .sp-toast-warning {
        background: #f59e0b;
        color: white;
      }
      .sp-toast-error {
        background: #ef4444;
        color: white;
      }
    `;
    document.head.appendChild(styles);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIN PANEL DE SENSORES V2
  // ═══════════════════════════════════════════════════════════════════════════

  // switch camera
  this.switchCamera = function(e) {
    if (e.currentTarget.classList.contains('cameraArc')) {
      babylon.setCameraMode('arc');
      self.$camera.html('<span class="icon-cameraArc"></span>');

    } else if (e.currentTarget.classList.contains('cameraFollow')) {
      babylon.setCameraMode('follow');
      self.$camera.html('<span class="icon-cameraFollow"></span>');

    } else if (e.currentTarget.classList.contains('cameraTop')) {
      babylon.setCameraMode('orthoTop');
      self.$camera.html('<span class="icon-cameraTop"></span>');

    } else if (e.currentTarget.classList.contains('resetCamera')) {
      babylon.resetCamera();
      babylon.setCameraMode('follow');
      self.$camera.html('<span class="icon-cameraFollow"></span>');
    }

    self.$cameraSelector.addClass('closed');
  };

  // Toggle camera selector
  this.toggleCameraSelector = function() {
    let current = self.$camera.children()[0].className.replace('icon-', '');
    self.$cameraSelector.children().removeClass('hide');
    self.$cameraSelector.find('.' + current).addClass('hide');
    self.$cameraSelector.toggleClass('closed');
  };

  // Select world map
  this.selectWorld = function() {
    let $body = $('<div class="selectWorld"></div>');
    let $select = $('<select></select>');
    let $description = $('<div class="description"><img class="thumbnail" width="200" height="200"><div class="text"></div></div>');
    let $configurations = $('<div class="configurations"></div>');

    let worldOptionsSetting = {};

    function getTitle(opt) {
      let $title = $('<div class="configurationTitle"></div>');
      let $toolTip = $('<span> </span><div class="tooltip">?<div class="tooltiptext"></div></div>');
      $title.text(opt.title);

      if (opt.help) {
        $toolTip.find('.tooltiptext').text(opt.help);
        $title.append($toolTip);
      }
      if (opt.helpSide) {
        $toolTip.addClass(opt.helpSide);
      } else {
        $toolTip.addClass('right');
      }

      return $title;
    }

    function genSelect(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $select = $('<select></select>');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      opt.options.forEach(function(option){
        let $opt = $('<option></option>');
        $opt.prop('value', option[1]);
        $opt.text(option[0]);
        if (option[1] == currentVal) {
          $opt.attr('selected', true);
        }

        $select.append($opt);
      });

      $select.change(function(){
        worldOptionsSetting[opt.option] = $select.val();
      });

      $div.append(getTitle(opt));
      $div.append($select);

      return $div;
    }

    function genSelectWithHTML(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $select = $('<select></select>');
      let $html = $('<div></div>');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      opt.options.forEach(function(option){
        let $opt = $('<option></option>');
        $opt.prop('value', option[1]);
        $opt.text(option[0]);
        if (option[1] == currentVal) {
          $opt.attr('selected', true);
          $html.html(opt.optionsHTML[currentVal]);
        }

        $select.append($opt);
      });

      $select.change(function(){
        worldOptionsSetting[opt.option] = $select.val();
        $html.html(opt.optionsHTML[$select.val()]);
      });

      $div.append(getTitle(opt));
      $div.append($select);
      $div.append($html);

      return $div;
    }

    function genCheckBox(opt, currentOptions) {
      let id = Math.random().toString(36).substring(2, 6);
      let $div = $('<div class="configuration"></div>');
      let $checkbox = $('<input type="checkbox" id="' + id + '">');
      let $label = $('<label for="' + id + '"></label>');
      let currentVal = currentOptions[opt.option];

      $label.text(opt.label);

      if (currentVal) {
        $checkbox.prop('checked', true);
        worldOptionsSetting[opt.option] = true;
      } else {
        worldOptionsSetting[opt.option] = false;
      }
      $checkbox.change(function(){
        worldOptionsSetting[opt.option] = $checkbox.prop('checked');
      });

      $div.append(getTitle(opt));
      $div.append($checkbox);
      $div.append($label);

      return $div;
    }

    function genSlider(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $sliderBox = $(
        '<div class="slider">' +
          '<input type="range">' +
          '<input type="text">' +
        '</div>'
      );
      let $slider = $sliderBox.find('input[type=range]');
      let $input = $sliderBox.find('input[type=text]');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      $slider.attr('min', opt.min);
      $slider.attr('max', opt.max);
      $slider.attr('step', opt.step);
      $slider.attr('value', currentVal);
      $input.val(currentVal);

      $slider.on('input', function(){
        worldOptionsSetting[opt.option] = parseInt($slider.val());
        $input.val($slider.val());
      });
      $input.change(function(){
        worldOptionsSetting[opt.option] = parseInt($input.val());
        $slider.val($input.val());
      });

      $div.append(getTitle(opt));
      $div.append($sliderBox);

      return $div;
    }

    function genText(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $textBox = $('<div class="text"><input type="text"></div>');
      let $input = $textBox.find('input');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      $input.val(currentVal);

      $input.change(function(){
        worldOptionsSetting[opt.option] = $input.val();
      });

      $div.append(getTitle(opt));
      $div.append($textBox);

      return $div;
    }

    function genInt(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $textBox = $('<div class="text"><input type="text"></div>');
      let $input = $textBox.find('input');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      $input.val(currentVal);

      $input.change(function(){
        if (isNaN($input.val())) {
          worldOptionsSetting[opt.option] = $input.val();
        } else {
          worldOptionsSetting[opt.option] = parseInt($input.val());
        }
      });

      $div.append(getTitle(opt));
      $div.append($textBox);

      return $div;
    }

    function genFloat(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $textBox = $('<div class="text"><input type="text"></div>');
      let $input = $textBox.find('input');
      let currentVal = currentOptions[opt.option];
      worldOptionsSetting[opt.option] = currentVal;

      $input.val(currentVal);

      $input.change(function(){
        if (isNaN($input.val())) {
          worldOptionsSetting[opt.option] = $input.val();
        } else {
          worldOptionsSetting[opt.option] = parseFloat($input.val());
        }
      });

      $div.append(getTitle(opt));
      $div.append($textBox);

      return $div;
    }

    function genFile(opt, currentOptions) {
      let $div = $('<div class="configuration"></div>');
      let $file = $('<input type="file">');
      $file.attr('accept', opt.accept);

      $file.change(function(){
        if (this.files.length) {
          worldOptionsSetting[opt.option] = URL.createObjectURL(this.files[0]);
        }
      });

      $div.append(getTitle(opt));
      $div.append($file);

      return $div;
    }

    function displayWorldOptions(world, worldOptions) {
      $description.find('.text').html(world.longDescription);
      if (world.thumbnail) {
        $description.find('.thumbnail').attr('src', world.thumbnail);
      } else {
        $description.find('.thumbnail').attr('src', 'images/worlds/default_thumbnail.png');
      }

      $configurations.empty();
      worldOptionsSetting = {};
      for (let optionConfiguration of world.optionsConfigurations) {
        if (optionConfiguration.type == 'select') {
          $configurations.append(genSelect(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'selectWithHTML') {
          $configurations.append(genSelectWithHTML(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'checkbox') {
          $configurations.append(genCheckBox(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'slider') {
          $configurations.append(genSlider(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'text') {
          $configurations.append(genText(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'int') {
          $configurations.append(genInt(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'float') {
          $configurations.append(genFloat(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'file') {
          $configurations.append(genFile(optionConfiguration, worldOptions));
        } else if (optionConfiguration.type == 'set') {
          worldOptionsSetting[optionConfiguration.option] = optionConfiguration.value;
        }
      }
    }

    worlds.forEach(function(world){
      let $world = $('<option></option>');
      $world.prop('value', world.name);
      $world.text(world.shortDescription);
      if (world.name == babylon.world.name) {
        $world.attr('selected', 'selected');
        displayWorldOptions(world, world.options);
      }
      $select.append($world);
    });

    $body.append($select);
    $body.append($description);
    $body.append($configurations);

    $select.change(function(){
      let world = worlds.find(world => world.name == $select.val());
      displayWorldOptions(world, world.options);
    });

    let $buttons = $(
      '<button type="button" class="save btn-light">' + i18n.get('#sim-save#') + '</button>' +
      '<button type="button" class="load push-left btn-light">' + i18n.get('#sim-load#') + '</button>' +
      '<button type="button" class="default btn-light">' + i18n.get('#sim-default#') + '</button>' +
      '<button type="button" class="cancel btn-light">' + i18n.get('#sim-cancel#') + '</button>' +
      '<button type="button" class="confirm btn-success">' + i18n.get('#sim-ok#') + '</button>'
    );

    let $dialog = dialog(i18n.get('#sim-select_world#'), $body, $buttons);

    $buttons.siblings('.save').click(function() {
      let world = worlds.find(world => world.name == $select.val());
      let saveObj = {
        worldName: $select.val(),
        options: {}
      }
      Object.assign(saveObj.options, world.defaultOptions);
      Object.assign(saveObj.options, worldOptionsSetting);

      var hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:application/json;base64,' + btoa(JSON.stringify(saveObj, null, 2));
      hiddenElement.target = '_blank';
      hiddenElement.download = $select.val() + 'Map_config.json';
      hiddenElement.dispatchEvent(new MouseEvent('click'));
    });
    $buttons.siblings('.load').click(function() {
      var hiddenElement = document.createElement('input');
      hiddenElement.type = 'file';
      hiddenElement.accept = 'application/json,.json';
      hiddenElement.dispatchEvent(new MouseEvent('click'));
      hiddenElement.addEventListener('change', function(e){
        var reader = new FileReader();
        reader.onload = function() {
          let loadedSave = JSON.parse(this.result);
          let world = worlds.find(world => world.name == loadedSave.worldName);

          if (typeof world == 'undefined') {
            toastMsg(i18n.get('#sim-invalid_map#'));
            return;
          }

          $select.val(loadedSave.worldName);
          displayWorldOptions(world, loadedSave.options);
          worldOptionsSetting = loadedSave.options;
        };
        reader.readAsText(e.target.files[0]);
      });
    });
    $buttons.siblings('.default').click(function() {
      let world = worlds.find(world => world.name == $select.val());
      world.options = {};
      Object.assign(world.options, world.defaultOptions);
      displayWorldOptions(world, world.options);
      // displayWorldOptions(world, world.defaultOptions);
    });
    $buttons.siblings('.cancel').click(function() { $dialog.close(); });
    $buttons.siblings('.confirm').click(function(){
      babylon.world = worlds.find(world => world.name == $select.val());
      self.worldOptionsSetting = worldOptionsSetting;
      self.resetSim().then(function(){
        babylon.resetCamera();
        babylon.setCameraMode('follow');
        self.$camera.html('<span class="icon-cameraFollow"></span>');
      });
      $dialog.close();
    });
  };

  // Load world
  this.loadWorld = function(json) {
    try {
      let loadedSave = JSON.parse(json);
      console.info('[STBLOCK-WORLD-DEBUG] parsed', {
        worldName: loadedSave.worldName,
        objectCount: loadedSave.options && Array.isArray(loadedSave.options.objects) ? loadedSave.options.objects.length : 0,
        models: loadedSave.options && Array.isArray(loadedSave.options.objects) ?
          loadedSave.options.objects.filter(function(object) { return object.editorType === 'model'; }).map(function(object) {
            return {id: object.id, url: object.modelURL, scale: object.modelScale, unit: object.modelUnit, position: object.position};
          }) : []
      });

      // Is it a world file?
      if (typeof loadedSave.bodyHeight != 'undefined') {
        showErrorModal(i18n.get('#sim-invalid_world_file_robot#'));
        return;
      }

      // Is it a world file?
      let world = worlds.find(world => world.name == loadedSave.worldName);
      if (typeof world == 'undefined') {
        showErrorModal(i18n.get('#sim-invalid_map#'));
        return;
      }

      babylon.world = worlds.find(world => world.name == loadedSave.worldName);
      self.worldOptionsSetting = loadedSave.options;
      if (typeof babylon.world.setOptions == 'function') {
        babylon.world.setOptions(self.worldOptionsSetting);
      }
      self.resetSim().then(function(){
        console.info('[STBLOCK-WORLD-DEBUG] reset-complete', {
          world: babylon.world && babylon.world.name,
          sceneMeshes: babylon.scene ? babylon.scene.meshes.length : 0
        });
        babylon.resetCamera();
        babylon.setCameraMode('follow');
        self.$camera.html('<span class="icon-cameraFollow"></span>');
      }).catch(function(error) {
        console.error('[STBLOCK-WORLD-DEBUG] reset-error', error);
        showErrorModal('No se pudo construir el escenario: ' + (error && error.message ? error.message : error));
      });
    } catch (e) {
      console.error('[STBLOCK-WORLD-DEBUG] parse-error', e);
      showErrorModal(i18n.get('#sim-invalid_world_file_json#'));
    }
  };

  // Load from local file
  this.loadWorldLocal = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/json,.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      var reader = new FileReader();
      reader.onload = function() {
        self.loadWorld(this.result);
      };
      reader.readAsText(e.target.files[0]);
    });
  };

  // Load from URL
  this.loadWorldURL = function(url) {
    console.info('[STBLOCK-WORLD-DEBUG] fetch-map', {url: url});
    return fetch(url)
      .then(function(response) {
        console.info('[STBLOCK-WORLD-DEBUG] map-response', {
          url: url, status: response.status, ok: response.ok, contentType: response.headers.get('content-type')
        });
        if (response.ok) {
          return response.text();
        } else {
          toastMsg(i18n.get('#sim-not_found#'));
          return Promise.reject(new Error('invalid_map'));
        }
      })
      .then(function(response) {
        self.loadWorld(response);
      });
  };

  // Save to file
  this.saveWorld = function() {
    let world = babylon.world;
    let saveObj = {
      worldName: world.name,
      options: world.options
    }

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:application/json;base64,' + btoa(JSON.stringify(saveObj, null, 2));
    hiddenElement.target = '_blank';
    hiddenElement.download = world.name + 'Map_config.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  };

  // Stop the simulator
  this.stopSim = function(stopRobot) {
    if (typeof stopRobot == 'undefined') {
      let stopRobot = false;
    }

    skulpt.hardInterrupt = true;

    // Detener intérprete STBlock si está corriendo
    if (typeof stblockInterpreter !== 'undefined' && stblockInterpreter.running) {
      stblockInterpreter.stop();
    }

    self.setRunIcon('run');

    if (typeof babylon.world.stopSim == 'function') {
      babylon.world.stopSim();
    }


    if (stopRobot) {
      function repeatedReset(count) {
        if (count > 0) {
          robot.reset();
          setTimeout(function() { repeatedReset(count - 1) }, 100);
        }
      }
      repeatedReset(15);
    }
  };

  // Run the simulator
  this.runSim = function() {
    if (skulpt.running || (typeof stblockInterpreter !== 'undefined' && stblockInterpreter.running)) {
      self.stopSim();
    } else {
      // Verificar si hay código C++ de STBlock disponible
      var stblockCode = filesManager.files['stblock.cpp'] || (main && main.stblockCode);

      if (stblockCode && typeof stblockInterpreter !== 'undefined' && stblockInterpreter.isSTBlockCode(stblockCode)) {
        console.log('=== STBLOCK INTERPRETER ===');
        console.log('Código C++ de STBlock detectado');
        console.log('Longitud del código:', stblockCode.length);

        robot.reset();
        stblockInterpreter.run(stblockCode);
        self.setRunIcon('stop');

        if (typeof babylon.world.startSim == 'function') {
          babylon.world.startSim();
        }
        return;
      }

      // Código Python de GearsBot
      if (! filesManager.modified) {
        pythonPanel.loadPythonFromBlockly();
      }

      var pythonCode = filesManager.files['main.py'] || '';

      // También verificar si main.py contiene código C++ (por si el usuario lo pegó ahí)
      if (typeof stblockInterpreter !== 'undefined' && stblockInterpreter.isSTBlockCode(pythonCode)) {
        console.log('=== STBLOCK INTERPRETER (desde main.py) ===');
        console.log('Código C++ detectado en main.py');

        robot.reset();
        stblockInterpreter.run(pythonCode);
        self.setRunIcon('stop');

        if (typeof babylon.world.startSim == 'function') {
          babylon.world.startSim();
        }
        return;
      }

      // Código Python normal
      console.log('=== SKULPT PYTHON ===');
      console.log('Ejecutando código Python con Skulpt');

      robot.reset();
      skulpt.runPython(pythonCode);
      self.setRunIcon('stop');
      if (typeof babylon.world.startSim == 'function') {
        babylon.world.startSim();
      }
    }
  };

  // Set run icon
  this.setRunIcon = function(type) {
    if (type == 'run') {
      self.$runSim.html('<span class="icon-play"></span>');
    } else {
      self.$runSim.html('<span class="icon-stop"></span>');
    }
  };

  // Reset simulator
  this.resetSim = function(resetPython) {
    if (typeof resetPython == 'undefined') {
      resetPython = true;
    }

    return babylon.world.setOptions(self.worldOptionsSetting).then(function(){
      self.clearWorldInfoPanel();
      self.hideWorldInfoPanel();
      if (resetPython) {
        skulpt.hardInterrupt = true;
        self.setRunIcon('run');
      }
      return babylon.resetScene().then(function(){
        self.initSensorsPanel();
        // Reiniciar panel V2 manteniendo configuración de pines de sesión
        self.pinConfiguration = null;
        if (!self.$sensorsPanel.hasClass('hide')) {
          self.initPinConfiguration();
          self.renderSensorsPanelV2();
        }
      });
    });
  };

  // Strip html tags
  this.stripHTML = function(text) {
    const regex = /</g;
    const regex2 = />/g;
    return text.replace(regex, '&lt;').replace(regex2, '&gt;');
  }

  // write to console
  this.consoleWrite = function(text) {
    text = self.$consoleContent.html() + self.stripHTML(text);
    self.$consoleContent.html(text);
    self.scrollConsoleToBottom();
  };

  // write to console
  this.consoleWriteErrors = function(text) {
    text = '<span class="error">' + self.stripHTML(text) + '</span>\n';
    text = self.$consoleContent.html() + text;
    self.$consoleContent.html(text);
    self.scrollConsoleToBottom();
  };

  // clear all content
  this.clearConsole = function() {
    self.$consoleContent.html('');
  };

  // Toggle opening and closing of console
  this.toggleConsole = function() {
    self.$console.toggleClass('open');
  };

  // Scroll console to bottom
  this.scrollConsoleToBottom = function() {
    var pre = self.$consoleContent[0];
    pre.scrollTop = pre.scrollHeight - pre.clientHeight
  };

  // Toggle FPS display
  this.toggleFPS = function() {
    self.showFPS = ! self.showFPS;

    if (! self.showFPS) {
      self.$fps.text('');
    }
  };
}

simPanel.init();






