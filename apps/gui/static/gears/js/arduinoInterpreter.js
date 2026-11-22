/**
 * arduinoInterpreter.js
 * Interpreta comandos Arduino y los mapea a componentes del robot en Gearbot
 * Permite ejecutar código Arduino en el simulador
 */

/* global robot */

var ArduinoInterpreter = (function() {
  'use strict';

  var self = {
    // Estado global de pines
    pinState: {
      digital: {},   // { pin: 0/1 }
      analog: {},    // { pin: 0-1023 }
      pwm: {},       // { pin: 0-255 }
      mode: {},      // { pin: 'INPUT'/'OUTPUT'/'INPUT_PULLUP'/'PWM'/'SERVO' }
      servo: {}      // { pin: angle }
    },

    // Referencia al robot actual
    robot: null,

    // Mapeo de pines a componentes { pin: { type, pinRole, component } }
    pinToComponent: {},

    // Conflictos de pines detectados al construir el mapeo
    pinConflicts: [],

    // Conjunto de pines I2C para permitir uso compartido
    // Incluye formatos con/sin prefijo D, y pines STBoard V2 (7, 8)
    i2cPins: ['18', '19', '20', '21', 'A4', 'A5', 'SCL', 'SDA', '7', '8', 'D20', 'D21'],

    // Constantes Arduino
    HIGH: 1,
    LOW: 0,
    INPUT: 'INPUT',
    OUTPUT: 'OUTPUT',
    INPUT_PULLUP: 'INPUT_PULLUP',

    // Tiempo de inicio para millis()
    startTime: Date.now(),

    /**
     * Inicializar con robot
     */
    init: function(robotRef) {
      self.robot = robotRef || (typeof robot !== 'undefined' ? robot : null);
      self.startTime = Date.now();
      self.resetPinState();
      if (self.robot) {
        self.buildPinMapping();
      }
      console.log('[ArduinoInterpreter] Inicializado con robot:', self.robot ? self.robot.options.id : 'ninguno');
    },

    /**
     * Resetear estado de pines
     */
    resetPinState: function() {
      self.pinState = {
        digital: {},
        analog: {},
        pwm: {},
        mode: {},
        servo: {}
      };
    },

    /**
     * Verificar si un pin es I2C (permite uso compartido)
     */
    isI2CPin: function(pin) {
      var normalizedPin = self.normalizePin(pin);
      // También probar sin prefijo D (ej: D20 -> 20, D21 -> 21)
      var strippedPin = normalizedPin.replace(/^D/, '');
      return self.i2cPins.indexOf(normalizedPin) !== -1 ||
             self.i2cPins.indexOf(strippedPin) !== -1;
    },

    /**
     * Asignar pin con detección de conflictos
     */
    assignPinWithCheck: function(pin, mapping) {
      if (!pin) return;

      var existing = self.pinToComponent[pin];
      if (existing) {
        // Pines I2C pueden compartirse (bus compartido)
        if (self.isI2CPin(pin)) {
          // No hay conflicto para I2C, mantener el primero
          return;
        }
        // Registrar conflicto
        var compName = mapping.component.displayName ||
          mapping.component.type || 'Componente';
        var existingName = existing.component.displayName ||
          existing.component.type || 'Componente';
        self.pinConflicts.push({
          pin: pin,
          newComponent: compName,
          newRole: mapping.pinRole,
          existingComponent: existingName,
          existingRole: existing.pinRole,
          existingType: existing.type
        });
        console.warn('[ArduinoInterpreter] Conflicto de pin ' + pin + ': ' +
          existingName + ' y ' + compName);
        return;
      }

      self.pinToComponent[pin] = mapping;
    },

    /**
     * Construir mapeo de pines a componentes
     */
    buildPinMapping: function() {
      self.pinToComponent = {};
      self.pinConflicts = [];

      if (!self.robot) return;

      // Mapear ruedas
      if (self.robot.wheels) {
        self.robot.wheels.forEach(function(wheel) {
          if (wheel.pins) {
            if (wheel.pins.dir1) {
              self.assignPinWithCheck(wheel.pins.dir1, { type: 'motor_dir1', component: wheel, pinRole: 'dir1' });
            }
            if (wheel.pins.dir2) {
              self.assignPinWithCheck(wheel.pins.dir2, { type: 'motor_dir2', component: wheel, pinRole: 'dir2' });
            }
            if (wheel.pins.pwm) {
              self.assignPinWithCheck(wheel.pins.pwm, { type: 'motor_pwm', component: wheel, pinRole: 'pwm' });
            }
            if (wheel.pins.encA) {
              self.assignPinWithCheck(wheel.pins.encA, { type: 'encoder_a', component: wheel, pinRole: 'encA' });
            }
            if (wheel.pins.encB) {
              self.assignPinWithCheck(wheel.pins.encB, { type: 'encoder_b', component: wheel, pinRole: 'encB' });
            }
          }
          // Compatibilidad con arduinoDir1/Dir2/PWM
          if (wheel.arduinoDir1) {
            self.assignPinWithCheck(wheel.arduinoDir1, { type: 'motor_dir1', component: wheel, pinRole: 'dir1' });
          }
          if (wheel.arduinoDir2) {
            self.assignPinWithCheck(wheel.arduinoDir2, { type: 'motor_dir2', component: wheel, pinRole: 'dir2' });
          }
          if (wheel.arduinoPWM) {
            self.assignPinWithCheck(wheel.arduinoPWM, { type: 'motor_pwm', component: wheel, pinRole: 'pwm' });
          }
        });
      }

      // Mapear componentes (sensores y actuadores)
      // NOTA: La búsqueda real es DINÁMICA en getComponentByPin()
      // Este mapeo es solo para compatibilidad y debugging
      if (self.robot.components) {
        console.log('[ArduinoInterpreter] Componentes disponibles:', self.robot.components.length);
        self.robot.components.forEach(function(comp, idx) {
          var compPort = comp.port ? String(comp.port) : 'sin puerto';
          console.log('[ArduinoInterpreter]   [' + idx + '] ' + comp.type + ' puerto: ' + compPort);

          // Crear múltiples entradas en el mapeo para diferentes formatos de puerto
          if (comp.port) {
            var portStr = String(comp.port);
            var mapping = { type: comp.type, component: comp, pinRole: 'port' };

            // Puerto directo: "in1", "3", "in4"
            self.pinToComponent[portStr] = mapping;

            // Sin prefijo "in": "in1" -> "1"
            if (portStr.indexOf('in') === 0) {
              var numPart = portStr.replace('in', '');
              self.pinToComponent[numPart] = mapping;
              self.pinToComponent['Puerto ' + numPart] = mapping;
            } else {
              // Puerto numérico: "3" -> también "Puerto 3"
              self.pinToComponent['Puerto ' + portStr] = mapping;
            }
          }
        });
      }

      console.log('[ArduinoInterpreter] Mapeo de pines construido:',
        Object.keys(self.pinToComponent).length, 'entradas');
    },

    /**
     * Obtener lista de conflictos de pines
     */
    getPinConflicts: function() {
      return self.pinConflicts;
    },

    /**
     * Verificar si hay conflictos
     */
    hasPinConflicts: function() {
      return self.pinConflicts && self.pinConflicts.length > 0;
    },

    // ============================================
    // FUNCIONES ARDUINO CORE
    // ============================================

    /**
     * Configurar modo de pin
     */
    pinMode: function(pin, mode) {
      pin = self.normalizePin(pin);
      self.pinState.mode[pin] = mode;
      console.log('[Arduino] pinMode(' + pin + ', ' + mode + ')');
    },

    /**
     * Escribir valor digital
     */
    digitalWrite: function(pin, value) {
      pin = self.normalizePin(pin);
      value = value ? 1 : 0;
      self.pinState.digital[pin] = value;
      self.updateComponentFromPin(pin);
      // console.log('[Arduino] digitalWrite(' + pin + ', ' + value + ')');
    },

    /**
     * Leer valor digital
     */
    digitalRead: function(pin) {
      pin = self.normalizePin(pin);
      var mapping = self.getComponentByPin(pin);

      if (mapping) {
        switch (mapping.type) {
          case 'TouchSensor':
            // INPUT_PULLUP: presionado = LOW, no presionado = HIGH
            return mapping.component.isPressed ? (mapping.component.isPressed() ? 0 : 1) : 1;

          case 'UltrasonicSensor':
            // Pin ECHO devuelve estado del pulso
            if (mapping.pinRole === 'echo') {
              return self.pinState.digital[pin] || 0;
            }
            break;

          case 'encoder_a':
          case 'encoder_b':
            // Simular encoder (valores alternantes basados en posición)
            var pos = mapping.component.position || 0;
            var step = Math.floor(pos / 5) % 2;
            return mapping.pinRole === 'encA' ? step : (1 - step);
        }
      }

      return self.pinState.digital[pin] || 0;
    },

    /**
     * Escribir valor PWM (0-255)
     */
    analogWrite: function(pin, value) {
      pin = self.normalizePin(pin);
      value = Math.max(0, Math.min(255, Math.round(value)));
      self.pinState.pwm[pin] = value;
      self.updateComponentFromPin(pin);
      // console.log('[Arduino] analogWrite(' + pin + ', ' + value + ')');
    },

    /**
     * Leer valor analógico (0-1023)
     */
    analogRead: function(pin) {
      pin = self.normalizePin(pin);
      var mapping = self.getComponentByPin(pin);

      if (!mapping) {
        return self.pinState.analog[pin] || 0;
      }

      var comp = mapping.component;

      switch (mapping.type) {
        case 'UltrasonicSensor':
          // Distancia en cm, escalar a 0-1023 (máx 400cm)
          var dist = comp.getDistance ? comp.getDistance() : 255;
          return Math.round(Math.min(dist, 400) / 400 * 1023);

        case 'ColorSensor':
          // Promedio RGB escalado a 0-1023
          if (comp.getRGB) {
            var rgb = comp.getRGB();
            var avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
            return Math.round(avg / 255 * 1023);
          }
          return 0;

        case 'LineFollowerSensor':
          // Leer canal específico
          if (comp.getReadings) {
            var readings = comp.getReadings();
            if (mapping.pinRole === 'left') return Math.round(readings[0] * 1023);
            if (mapping.pinRole === 'center') return Math.round(readings[1] * 1023);
            if (mapping.pinRole === 'right') return Math.round(readings[2] * 1023);
          }
          return 512;

        case 'GasSensor':
          // PPM escalado a 0-1023
          if (comp.getPPM) {
            var ppm = comp.getPPM();
            return Math.round(Math.min(ppm, 5000) / 5000 * 1023);
          }
          return 0;

        case 'TemperatureSensor':
          // Temperatura escalada (-40 a 125°C → 0-1023)
          if (comp.getTemperature) {
            var temp = comp.getTemperature();
            return Math.round((temp + 40) / 165 * 1023);
          }
          return 512;

        case 'HumiditySensor':
          // Humedad 0-100% → 0-1023
          if (comp.getHumidity) {
            var hum = comp.getHumidity();
            return Math.round(hum / 100 * 1023);
          }
          return 512;

        case 'LaserRangeSensor':
          // Distancia mm escalada (0-2000mm → 0-1023)
          if (comp.getDistance) {
            var distLaser = comp.getDistance();
            return Math.round(Math.min(distLaser * 10, 2000) / 2000 * 1023);
          }
          return 0;

        default:
          return self.pinState.analog[pin] || 0;
      }
    },

    /**
     * Esperar pulso en pin (para HC-SR04)
     */
    pulseIn: function(pin, state, timeout) {
      pin = self.normalizePin(pin);
      timeout = timeout || 1000000; // 1 segundo por defecto

      var mapping = self.getComponentByPin(pin);

      // Para sensor ultrasónico, simular tiempo de eco
      if (mapping && mapping.type === 'UltrasonicSensor') {
        var distance = mapping.component.getDistance ? mapping.component.getDistance() : 100;
        // Tiempo en microsegundos: distancia * 2 / velocidad sonido (0.0343 cm/us)
        var timeUs = Math.round(distance * 58.2);
        return Math.min(timeUs, timeout);
      }

      return 0;
    },

    // ============================================
    // FUNCIONES DE TIEMPO
    // ============================================

    /**
     * Milisegundos desde inicio
     */
    millis: function() {
      return (Date.now() - self.startTime) % 0xFFFFFFFF;
    },

    /**
     * Microsegundos desde inicio
     */
    micros: function() {
      return Math.round((performance.now() * 1000) % 0xFFFFFFFF);
    },

    /**
     * Delay en milisegundos (retorna Promise)
     */
    delay: function(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    },

    /**
     * Delay en microsegundos (retorna Promise)
     */
    delayMicroseconds: function(us) {
      return new Promise(function(resolve) {
        setTimeout(resolve, Math.max(1, us / 1000));
      });
    },

    // ============================================
    // FUNCIONES SERVO
    // ============================================

    /**
     * Conectar servo a pin
     */
    servoAttach: function(pin) {
      pin = self.normalizePin(pin);
      self.pinState.mode[pin] = 'SERVO';
      self.pinState.servo[pin] = 90; // Posición inicial
    },

    /**
     * Escribir ángulo en servo
     */
    servoWrite: function(pin, angle) {
      pin = self.normalizePin(pin);
      angle = Math.max(0, Math.min(180, Math.round(angle)));
      self.pinState.servo[pin] = angle;

      // Buscar componente por pin o puerto (soporta STBoard V2)
      var mapping = self.getComponentByPin(pin);
      if (!mapping) {
        console.log('[Arduino] servoWrite: No se encontró componente para pin/puerto', pin);
        return;
      }
      console.log('[Arduino] servoWrite(' + pin + ', ' + angle + ') -> ' + mapping.type);

      var comp = mapping.component;

      switch (mapping.type) {
        case 'CustomServoActuator':
          // Servo personalizado: mapear ángulo 0-180 al rango del servo
          if (comp.setCustomPresetValue) {
            comp.setCustomPresetValue(angle);
          }
          break;

        case 'ArmActuator':
        case 'SwivelActuator':
          // Brazo/plataforma: ángulo 0-180 → posición 0-maxPosition
          var maxPos = comp.maxPosition || 180;
          comp.position_target = (angle / 180) * maxPos;
          if (comp.runToPosition) comp.runToPosition();
          break;

        case 'MagnetActuator':
          // Electroimán: 0 = apagado, 180 = máxima potencia
          // setPower espera fracción 0-1, no porcentaje
          if (comp.setPower) {
            var powerFraction = angle / 180;
            comp.setPower(powerFraction);
            console.log('[Arduino] MagnetActuator.setPower(' + powerFraction.toFixed(2) + ') desde ángulo ' + angle);
          }
          break;

        case 'Pen':
          // Lápiz: 0 = abajo, 90+ = arriba
          if (angle < 45) {
            if (comp.down) comp.down();
          } else {
            if (comp.up) comp.up();
          }
          break;

        case 'CustomMotorActuator':
        case 'CustomLinearActuator':
          // Motor/actuador lineal personalizado
          if (comp.setCustomPresetValue) {
            comp.setCustomPresetValue(angle);
          }
          break;

        case 'LinearActuator':
          // Actuador lineal: ángulo 0-180 → velocidad
          var dir1 = comp.pins && self.pinState.digital[comp.pins.dir1] || 0;
          var dir2 = comp.pins && self.pinState.digital[comp.pins.dir2] || 0;
          var speed = (angle / 180) * 100;
          if (dir1 === 1 && dir2 === 0) {
            comp.speed_sp = speed;
          } else if (dir1 === 0 && dir2 === 1) {
            comp.speed_sp = -speed;
          } else {
            comp.speed_sp = angle > 90 ? speed : (angle < 90 ? -speed : 0);
          }
          comp.position_target = 180; // Ir al máximo
          if (comp.runToPosition) comp.runToPosition();
          break;

        case 'PaintballLauncherActuator':
          // Lanzador: 180 = disparar
          if (angle >= 170 && comp.firePaintball) {
            comp.firePaintball();
          }
          break;
      }
    },

    /**
     * Leer ángulo del servo
     */
    servoRead: function(pin) {
      pin = self.normalizePin(pin);
      return self.pinState.servo[pin] || 90;
    },

    // ============================================
    // FUNCIONES DE ACTUALIZACIÓN
    // ============================================

    /**
     * Actualizar componente basado en cambio de pin
     */
    updateComponentFromPin: function(pin) {
      var mapping = self.getComponentByPin(pin);
      if (!mapping) return;

      // Motor DC (ruedas)
      if (mapping.type === 'motor_dir1' || mapping.type === 'motor_dir2' || mapping.type === 'motor_pwm') {
        self.updateMotor(mapping.component);
        return;
      }

      // Electroimán
      if (mapping.type === 'MagnetActuator') {
        self.updateMagnet(mapping.component, pin);
        return;
      }

      // Actuador lineal
      if (mapping.type === 'LinearActuator') {
        self.updateLinearActuator(mapping.component);
        return;
      }
    },

    /**
     * Actualizar motor DC basado en pines DIR1, DIR2, PWM
     */
    updateMotor: function(wheel) {
      if (!wheel) return;

      var pins = wheel.pins || {};
      var dir1Pin = pins.dir1 || wheel.arduinoDir1;
      var dir2Pin = pins.dir2 || wheel.arduinoDir2;
      var pwmPin = pins.pwm || wheel.arduinoPWM;

      var dir1 = self.pinState.digital[dir1Pin] || 0;
      var dir2 = self.pinState.digital[dir2Pin] || 0;
      var pwm = self.pinState.pwm[pwmPin] || 0;

      // Calcular velocidad: PWM 0-255 → speed_sp 0-800
      var maxSpeed = 800;
      var speed = (pwm / 255) * maxSpeed;

      // Determinar dirección
      if (dir1 === 1 && dir2 === 0) {
        wheel.speed_sp = speed;  // Adelante
      } else if (dir1 === 0 && dir2 === 1) {
        wheel.speed_sp = -speed; // Atrás
      } else if (dir1 === 1 && dir2 === 1) {
        wheel.speed_sp = 0;      // Frenar (brake)
        if (wheel.stop) wheel.stop();
        return;
      } else {
        wheel.speed_sp = 0;      // Costa (coast)
      }

      // Activar motor
      if (Math.abs(speed) > 0) {
        if (wheel.runForever) wheel.runForever();
      } else {
        if (wheel.stop) wheel.stop();
      }
    },

    /**
     * Actualizar electroimán
     */
    updateMagnet: function(magnet, changedPin) {
      if (!magnet || !magnet.pins) return;

      var ctrlPin = magnet.pins.control;
      var pwmPin = magnet.pins.pwm;

      var ctrl = self.pinState.digital[ctrlPin] || 0;
      var pwm = self.pinState.pwm[pwmPin];

      var power = 0;
      if (pwm !== undefined) {
        power = (pwm / 255) * 100;
      } else if (ctrl === 1) {
        power = 100;
      }

      if (magnet.setPower) {
        magnet.setPower(power);
      }
    },

    /**
     * Actualizar actuador lineal
     */
    updateLinearActuator: function(actuator) {
      if (!actuator || !actuator.pins) return;

      var dir1 = self.pinState.digital[actuator.pins.dir1] || 0;
      var dir2 = self.pinState.digital[actuator.pins.dir2] || 0;
      var pwm = self.pinState.pwm[actuator.pins.pwm] || 0;

      var speed = (pwm / 255) * 100;

      if (dir1 === 1 && dir2 === 0) {
        actuator.speed_sp = speed;
        if (actuator.runForever) actuator.runForever();
      } else if (dir1 === 0 && dir2 === 1) {
        actuator.speed_sp = -speed;
        if (actuator.runForever) actuator.runForever();
      } else {
        actuator.speed_sp = 0;
        if (actuator.stop) actuator.stop();
      }
    },

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Convertir número a letra de puerto (1=A, 2=B, 3=C, etc.)
     */
    numberToPortLetter: function(num) {
      var PORT_LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      num = parseInt(num, 10);
      if (num >= 1 && num <= 26) {
        return PORT_LETTERS[num];
      }
      return null;
    },

    /**
     * Buscar componente por pin o puerto
     * Soporta tanto sistema de pines tradicional como sistema de puertos STBoard V2
     * Similar a cómo los motores buscan por motorPort
     */
    getComponentByPin: function(pin) {
      pin = self.normalizePin(pin);

      // Primero intentar el mapeo preconstruido (para compatibilidad)
      var mapping = self.pinToComponent[pin];
      if (mapping) {
        return mapping;
      }

      // Buscar por "Puerto X" en el mapeo
      var portKey = 'Puerto ' + pin;
      mapping = self.pinToComponent[portKey];
      if (mapping) {
        return mapping;
      }

      // BÚSQUEDA DINÁMICA: Similar a cómo los motores buscan por motorPort
      // Esto permite que los cambios de puerto en la UI se reflejen inmediatamente
      if (self.robot && self.robot.components) {
        var found = null;

        // Convertir número a letra para puertos de actuador (3 -> C, 4 -> D, etc.)
        var portLetter = self.numberToPortLetter(pin);

        // Construir todas las variantes de puerto posibles
        var portVariants = [
          pin,                    // "4"
          'in' + pin,             // "in4" (sensores)
          pin.replace('in', ''),  // Si pin es "in4" -> "4"
          pin.replace('out', ''), // Si pin es "outC" -> "C"
        ];

        // Agregar variantes de actuador si el pin es un número
        if (portLetter) {
          portVariants.push('out' + portLetter);  // "outC" (actuadores)
          portVariants.push(portLetter);          // "C"
        }

        self.robot.components.forEach(function(comp) {
          if (found) return; // Ya encontrado

          // Normalizar el puerto del componente para comparar
          var compPort = comp.port ? String(comp.port) : '';

          for (var i = 0; i < portVariants.length; i++) {
            if (compPort === portVariants[i]) {
              found = {
                type: comp.type,
                component: comp,
                pinRole: 'port'
              };
              console.log('[ArduinoInterpreter] getComponentByPin(' + pin + ') -> DINÁMICO:', comp.type, 'puerto:', compPort);
              break;
            }
          }
        });

        if (found) return found;
      }

      // También probar con prefijo D (ej: D5 -> buscar puerto 5)
      if (pin.startsWith('D')) {
        var pinNum = pin.substring(1);
        return self.getComponentByPin(pinNum); // Recursivo sin el prefijo D
      }

      console.log('[ArduinoInterpreter] getComponentByPin(' + pin + ') -> NO encontrado');
      return null;
    },

    /**
     * Normalizar nombre de pin
     */
    normalizePin: function(pin) {
      if (typeof pin === 'number') {
        return String(pin);
      }
      return String(pin).toUpperCase().replace(/^PIN/i, '').trim();
    },

    /**
     * Mapear valor entre rangos
     */
    map: function(value, fromLow, fromHigh, toLow, toHigh) {
      return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
    },

    /**
     * Limitar valor a rango
     */
    constrain: function(value, low, high) {
      return Math.max(low, Math.min(high, value));
    }
  };

  return self;
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ArduinoInterpreter = ArduinoInterpreter;
}
