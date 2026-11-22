/**
 * stblock-bridge.js
 * Puente de comunicación entre STBlock y Gearbot
 * Recibe código de STBlock y lo ejecuta en el simulador
 */

/* global robot, skulpt, simPanel, ArduinoInterpreter, Sk */

var STBlockBridge = (function() {
  'use strict';

  var self = {
    initialized: false,
    currentExecution: null,
    currentBoardType: 'arduinoUno',  // Tarjeta actual desde STBlock
    storedCode: null,                // Código almacenado desde STBlock
    storedLanguage: 'arduino',       // Lenguaje del código almacenado

    /**
     * Obtener tarjeta actual
     */
    getBoardType: function() {
      return self.currentBoardType;
    },

    /**
     * Establecer tarjeta (llamado cuando STBlock envía boardType)
     */
    setBoardType: function(boardType) {
      if (!boardType) return;

      var oldBoard = self.currentBoardType;
      self.currentBoardType = boardType;

      console.log('[STBlock Bridge] Tarjeta cambiada:', oldBoard, '->', boardType);

      // Actualizar PinManager si existe
      if (typeof PinManager !== 'undefined') {
        PinManager.setBoard(boardType);
      }

      // Reinicializar panel de sensores si existe
      if (typeof simPanel !== 'undefined' && simPanel.initSensorsPanel) {
        simPanel.initSensorsPanel();
      }
    },

    /**
     * Inicializar el puente
     */
    init: function() {
      if (self.initialized) {
        console.log('[STBlock Bridge] Ya inicializado, ignorando');
        return;
      }

      console.log('%c[STBlock Bridge] ====================================', 'color: #00ff00; font-weight: bold');
      console.log('%c[STBlock Bridge] INICIALIZANDO PUENTE v3-debug', 'color: #00ff00; font-weight: bold');
      console.log('%c[STBlock Bridge] window.parent:', 'color: #00ff00', window.parent !== window ? 'Es iframe (correcto)' : 'Es ventana principal');
      console.log('%c[STBlock Bridge] ====================================', 'color: #00ff00; font-weight: bold');

      // Escuchar mensajes de STBlock (ventana padre)
      window.addEventListener('message', self.handleMessage);
      console.log('[STBlock Bridge] Listener de mensajes agregado a window');

      // Notificar que Gearbot está listo
      self.notifyReady();

      self.initialized = true;
      console.log('[STBlock Bridge] Inicialización completa');

      // DEBUG: Crear indicador visual de estado del bridge
      self.createDebugIndicator();

      // DEBUG: Heartbeat cada 10 segundos para confirmar que el bridge sigue activo
      setInterval(function() {
        console.log('[STBlock Bridge] ❤️ Heartbeat - Bridge activo, esperando mensajes...');
      }, 10000);

      // DEBUG: Función global para probar el bridge desde la consola
      window.testSTBlockBridge = function(testCode) {
        console.log('[STBlock Bridge] TEST: Simulando mensaje stblock-execute');
        self.showDebugMessage('TEST: Ejecutando código de prueba');
        self.handleMessage({
          data: {
            type: 'stblock-execute',
            code: testCode || 'print("Hola desde test")',
            language: 'python',
            boardType: 'stbBoardV2'
          }
        });
      };
      console.log('[STBlock Bridge] Función de prueba disponible: testSTBlockBridge("codigo")');

      // Función global para ejecutar código almacenado (llamada desde botones de GearBot)
      window.stblockExecuteStoredCode = function() {
        console.log('[STBlock Bridge] Botón de GearBot presionado - ejecutando código almacenado');
        self.executeStoredCode();
      };

      // Función global para verificar si estamos en modo embebido
      window.stblockIsEmbedded = function() {
        return window.parent !== window;
      };

      // Función global para verificar si hay código almacenado
      window.stblockHasStoredCode = function() {
        return !!self.storedCode;
      };
    },

    /**
     * Crear indicador visual de debug en esquina superior
     */
    createDebugIndicator: function() {
      var indicator = document.createElement('div');
      indicator.id = 'stblock-bridge-debug';
      indicator.style.cssText = 'position:fixed;top:5px;right:5px;z-index:99999;background:#333;color:#0f0;' +
        'padding:5px 10px;border-radius:4px;font-family:monospace;font-size:11px;max-width:300px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.5);';
      indicator.innerHTML = '🔌 STBlock Bridge: <span style="color:#0f0">READY</span>';
      document.body.appendChild(indicator);
      self.debugIndicator = indicator;
    },

    /**
     * Mostrar mensaje en el indicador de debug
     */
    showDebugMessage: function(msg, isError) {
      if (!self.debugIndicator) return;
      var color = isError ? '#f00' : '#0f0';
      self.debugIndicator.innerHTML = '🔌 STBlock: <span style="color:' + color + '">' + msg + '</span>';
      // Resetear después de 3 segundos
      setTimeout(function() {
        if (self.debugIndicator) {
          self.debugIndicator.innerHTML = '🔌 STBlock Bridge: <span style="color:#0f0">READY</span>';
        }
      }, 3000);
    },

    /**
     * Manejar mensajes entrantes
     */
    handleMessage: function(event) {
      var data = event.data;

      // DEBUG: Log TODOS los mensajes recibidos (incluso sin tipo)
      console.log('[STBlock Bridge] === MESSAGE RECEIVED ===');
      console.log('[STBlock Bridge] Origin:', event.origin);
      console.log('[STBlock Bridge] Data type:', typeof data);
      console.log('[STBlock Bridge] Data:', data);

      // Mostrar indicador visual
      if (data && typeof data === 'object' && data.type) {
        console.log('[STBlock Bridge] Message type:', data.type);
        self.showDebugMessage('MSG: ' + data.type);
      }

      if (!data || typeof data !== 'object') {
        console.log('[STBlock Bridge] Ignorando mensaje (no es objeto)');
        return;
      }

      switch (data.type) {
        case 'stblock-execute':
          console.log('[STBlock Bridge] >>> Ejecutar código recibido');
          self.executeCode(data);
          break;

        case 'stblock-stop':
          self.stopExecution();
          break;

        case 'stblock-reset':
          self.resetSimulator();
          break;

        case 'stblock-get-robots':
          // Actualizar tarjeta actual
          if (data.boardType) {
            self.setBoardType(data.boardType);
          }
          self.sendRobotList(data.boardType);
          break;

        case 'stblock-set-board':
          // Mensaje específico para cambiar tarjeta
          self.setBoardType(data.boardType);
          break;

        case 'stblock-select-robot':
          self.selectRobot(data.robotId);
          break;

        case 'stblock-ping':
          self.sendPong();
          break;

        case 'stblock-update-code':
          // Almacenar código para ejecución posterior (cuando el usuario presione el botón)
          self.storedCode = data.code;
          self.storedLanguage = data.language || 'arduino';
          if (data.boardType) {
            self.setBoardType(data.boardType);
          }
          console.log('[STBlock Bridge] Código almacenado (' + self.storedLanguage + ', ' + (data.code ? data.code.length : 0) + ' chars)');
          break;
      }
    },

    /**
     * Ejecutar el código almacenado (llamado desde los botones de GearBot)
     */
    executeStoredCode: function() {
      if (!self.storedCode) {
        console.warn('[STBlock Bridge] No hay código almacenado para ejecutar');
        // Notificar al padre que necesitamos código
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'gearbot-request-execute' }, '*');
        }
        return;
      }

      self.executeCode({
        code: self.storedCode,
        language: self.storedLanguage,
        boardType: self.currentBoardType
      });
    },

    /**
     * Ejecutar código recibido de STBlock
     */
    executeCode: function(data) {
      console.log('[STBlock Bridge] ========================================');
      console.log('[STBlock Bridge] Ejecutando código');
      console.log('[STBlock Bridge] Lenguaje:', data.language);
      console.log('[STBlock Bridge] Código recibido:\n', data.code);
      console.log('[STBlock Bridge] ========================================');

      // Mostrar indicador visual
      self.showDebugMessage('⚡ EJECUTANDO: ' + (data.language || 'auto'));

      // Verificar que tengamos robot
      if (typeof robot === 'undefined' || !robot) {
        self.showDebugMessage('❌ ERROR: No hay robot', true);
        self.sendError('No hay robot cargado en el simulador');
        return;
      }

      // Verificar compatibilidad de tarjeta
      if (data.boardType && robot.options && robot.options.boardType) {
        if (robot.options.boardType !== data.boardType) {
          self.sendError('Robot no compatible con tarjeta ' + data.boardType +
                        '. El robot está configurado para ' + robot.options.boardType);
          return;
        }
      }

      // Detener ejecución anterior
      self.stopExecution();

      // Reset robot
      if (robot.reset) robot.reset();

      // Ejecutar según lenguaje
      try {
        switch (data.language) {
          case 'arduino':
            self.executeArduinoCode(data.code);
            break;

          case 'stboard':
            self.executeSTBoardCode(data.code);
            break;

          case 'python':
            self.executePythonCode(data.code);
            break;

          default:
            // Intentar detectar el lenguaje
            if (data.code.indexOf('void setup') !== -1 || data.code.indexOf('void loop') !== -1) {
              self.executeArduinoCode(data.code);
            } else {
              self.executePythonCode(data.code);
            }
        }

        // Actualizar UI
        if (simPanel && simPanel.setRunIcon) {
          simPanel.setRunIcon('stop');
        }

        self.sendStatus('running');

      } catch (error) {
        console.error('[STBlock Bridge] Error ejecutando código:', error);
        self.sendError(error.message || String(error));
      }
    },

    /**
     * Ejecutar código Arduino
     */
    executeArduinoCode: function(cppCode) {
      console.log('[STBlock Bridge] Convirtiendo código Arduino a Python');

      // Inicializar intérprete Arduino
      ArduinoInterpreter.init(robot);

      // Convertir C++ a Python
      var pythonCode = self.convertArduinoToPython(cppCode);
      console.log('[STBlock Bridge] Código Python generado:\n', pythonCode);

      // Ejecutar Python
      self.executePythonCode(pythonCode);
    },

    /**
     * Ejecutar código STBoard
     * Detecta si es C++ o Python y ejecuta apropiadamente
     */
    executeSTBoardCode: function(code) {
      console.log('[STBlock Bridge] Ejecutando código STBoard');

      // Detectar si es código C++ (Arduino) o Python
      var isCpp = code.indexOf('#include') !== -1 ||
                  code.indexOf('void setup') !== -1 ||
                  code.indexOf('void loop') !== -1 ||
                  code.indexOf('struct ') !== -1;

      if (isCpp) {
        console.log('[STBlock Bridge] Código detectado como C++ - convirtiendo a Python');
        // Convertir C++ a Python
        var pythonCode = self.convertArduinoToPython(code);
        console.log('[STBlock Bridge] Código Python generado:\n', pythonCode.substring(0, 500) + '...');
        self.executePythonCode(pythonCode);
      } else {
        console.log('[STBlock Bridge] Código detectado como Python - ejecutando directamente');
        self.executePythonCode(code);
      }
    },

    /**
     * Ejecutar código Python con Skulpt
     */
    executePythonCode: function(code) {
      console.log('[STBlock Bridge] >>> Ejecutando Python...');
      console.log('[STBlock Bridge] skulpt disponible:', typeof skulpt !== 'undefined');
      console.log('[STBlock Bridge] Sk disponible:', typeof Sk !== 'undefined');

      // Mostrar indicador visual
      self.showDebugMessage('🐍 Ejecutando Python...');

      if (typeof skulpt !== 'undefined' && skulpt.runPython) {
        console.log('[STBlock Bridge] Usando skulpt.runPython (async)');
        try {
          skulpt.runPython(code, function(success, errorMsg) {
            if (success) {
              console.log('[STBlock Bridge] Código Python ejecutado correctamente');
              self.showDebugMessage('✅ Ejecución completada');
            } else {
              console.error('[STBlock Bridge] Error en ejecución Python:', errorMsg);
              self.showDebugMessage('❌ Error: ' + errorMsg.substring(0, 50), true);
              self.sendError(errorMsg);
            }
          });
        } catch (e) {
          console.error('[STBlock Bridge] Error al iniciar skulpt.runPython:', e);
          self.showDebugMessage('❌ Error: ' + e.toString().substring(0, 50), true);
          self.sendError(e.toString());
        }
      } else if (typeof Sk !== 'undefined') {
        console.log('[STBlock Bridge] Usando Sk directamente');
        // Ejecutar directamente con Skulpt
        Sk.configure({
          output: function(text) {
            // Mostrar en la consola de Gearbot
            if (simPanel && simPanel.consoleWrite) {
              simPanel.consoleWrite(text);
            }
            // Reenviar a STBlock via postMessage directo
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'gearbot-serial',
                text: String(text),
                timestamp: Date.now()
              }, '*');
            }
          },
          read: function(x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
              throw "File not found: '" + x + "'";
            }
            return Sk.builtinFiles["files"][x];
          }
        });

        var myPromise = Sk.misceval.asyncToPromise(function() {
          return Sk.importMainWithBody("<stdin>", false, code, true);
        });

        myPromise.catch(function(err) {
          console.error('[STBlock Bridge] Error Python:', err);
          self.sendError(err.toString());
        });
      } else {
        console.error('[STBlock Bridge] Skulpt no disponible');
        self.sendError('Intérprete Python no disponible');
      }
    },

    /**
     * Convertir código Arduino C++ a Python para Skulpt
     */
    convertArduinoToPython: function(cppCode) {
      var lines = [];

      // Imports
      lines.push('# Código generado automáticamente desde Arduino');
      lines.push('import simPython');
      lines.push('');
      lines.push('# Constantes Arduino');
      lines.push('HIGH = 1');
      lines.push('LOW = 0');
      lines.push('OUTPUT = "OUTPUT"');
      lines.push('INPUT = "INPUT"');
      lines.push('INPUT_PULLUP = "INPUT_PULLUP"');
      lines.push('');
      lines.push('# Inicializar Arduino');
      lines.push('arduino = simPython.Arduino()');
      lines.push('');

      // Funciones wrapper
      lines.push('def pinMode(pin, mode):');
      lines.push('    arduino.pinMode(pin, mode)');
      lines.push('');
      lines.push('def digitalWrite(pin, value):');
      lines.push('    arduino.digitalWrite(pin, value)');
      lines.push('');
      lines.push('def digitalRead(pin):');
      lines.push('    return arduino.digitalRead(pin)');
      lines.push('');
      lines.push('def analogWrite(pin, value):');
      lines.push('    arduino.analogWrite(pin, value)');
      lines.push('');
      lines.push('def analogRead(pin):');
      lines.push('    return arduino.analogRead(pin)');
      lines.push('');
      lines.push('def delay(ms):');
      lines.push('    arduino.delay(ms)');
      lines.push('');
      lines.push('def delayMicroseconds(us):');
      lines.push('    arduino.delayMicroseconds(us)');
      lines.push('');
      lines.push('def pulseIn(pin, state, timeout=1000000):');
      lines.push('    return arduino.pulseIn(pin, state, timeout)');
      lines.push('');
      lines.push('def millis():');
      lines.push('    return arduino.millis()');
      lines.push('');
      lines.push('def micros():');
      lines.push('    return arduino.micros()');
      lines.push('');

      // ============================================
      // STBoard V2 - Motor API
      // IMPORTANTE: Los nombres de funciones Python NO deben empezar con "stbV2"
      // para evitar que el catch-all las convierta a "pass"
      // ============================================
      lines.push('# STBoard V2 - Motores');
      lines.push('_stb_motors = {}');
      lines.push('_stb_speed = 50');
      lines.push('_stb_left_ports = []');
      lines.push('_stb_right_ports = []');
      lines.push('');

      // Configurar motor (LEFT, RIGHT, NONE)
      lines.push('def motorConfigure(port, side):');
      lines.push('    global _stb_motors, _stb_left_ports, _stb_right_ports');
      lines.push('    if port not in _stb_motors:');
      lines.push('        _stb_motors[port] = simPython.STBMotor(port)');
      lines.push('    _stb_motors[port].configure(side)');
      lines.push('    if side == "LEFT":');
      lines.push('        if port not in _stb_left_ports:');
      lines.push('            _stb_left_ports.append(port)');
      lines.push('    elif side == "RIGHT":');
      lines.push('        if port not in _stb_right_ports:');
      lines.push('            _stb_right_ports.append(port)');
      lines.push('    print("Motor " + port + " configurado como " + side)');
      lines.push('');

      // Establecer velocidad de motores de movimiento
      lines.push('def motionSetSpeed(speedPercent):');
      lines.push('    global _stb_speed');
      lines.push('    _stb_speed = speedPercent');
      lines.push('    print("Velocidad: " + str(speedPercent) + "%")');
      lines.push('');

      // Avanzar motores de movimiento
      lines.push('def motionForward(selector="MOTION", speed=None):');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = speed if speed is not None else _stb_speed');
      lines.push('    if selector == "MOTION":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        print("Avanzando...")');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].setSpeed(spd)');
      lines.push('');

      // Retroceder motores de movimiento
      lines.push('def motionBackward(selector="MOTION", speed=None):');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = -(speed if speed is not None else _stb_speed)');
      lines.push('    if selector == "MOTION":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        print("Retrocediendo...")');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].setSpeed(spd)');
      lines.push('');

      // Detener motores
      lines.push('def motionStop(selector="MOTION"):');
      lines.push('    global _stb_motors, _stb_left_ports, _stb_right_ports');
      lines.push('    if selector == "MOTION" or selector == "ALL":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].stop()');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].stop()');
      lines.push('        print("Motores detenidos")');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].stop()');
      lines.push('');

      // Girar izquierda
      lines.push('def motionTurnLeft(speed=None):');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = speed if speed is not None else _stb_speed');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].setSpeed(-spd)');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].setSpeed(spd)');
      lines.push('    print("Girando izquierda...")');
      lines.push('');

      // Girar derecha
      lines.push('def motionTurnRight(speed=None):');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = speed if speed is not None else _stb_speed');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].setSpeed(spd)');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].setSpeed(-spd)');
      lines.push('    print("Girando derecha...")');
      lines.push('');

      // ============================================
      // Funciones de conversión de unidades
      // ============================================
      lines.push('# Conversión de unidades');
      lines.push('def distanceToMm(value, unit):');
      lines.push('    """Convierte distancia a milímetros"""');
      lines.push('    if unit == "MM":');
      lines.push('        return value');
      lines.push('    elif unit == "CM":');
      lines.push('        return value * 10');
      lines.push('    elif unit == "M":');
      lines.push('        return value * 1000');
      lines.push('    elif unit == "IN":');
      lines.push('        return value * 25.4');
      lines.push('    elif unit == "FT":');
      lines.push('        return value * 304.8');
      lines.push('    else:');
      lines.push('        return value * 10  # Default: CM');
      lines.push('');
      lines.push('def angleToDegrees(value, unit):');
      lines.push('    """Convierte ángulo a grados"""');
      lines.push('    if unit == "DEG" or unit == "DEGREES":');
      lines.push('        return value');
      lines.push('    elif unit == "RAD" or unit == "RADIANS":');
      lines.push('        return value * 57.2958');
      lines.push('    elif unit == "TURNS":');
      lines.push('        return value * 360');
      lines.push('    elif unit == "QUARTER":');
      lines.push('        return value * 90');
      lines.push('    else:');
      lines.push('        return value  # Default: grados');
      lines.push('');

      // ============================================
      // Funciones de movimiento con distancia/tiempo
      // ============================================
      lines.push('# Movimiento con distancia');
      lines.push('def motionForwardDistance(selector, distance_mm, direction=0):');
      lines.push('    """Avanza/retrocede una distancia específica"""');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = _stb_speed if direction != 1 else -_stb_speed');
      lines.push('    if selector == "MOTION":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].setSpeed(spd)');
      lines.push('    # Calcular tiempo aproximado (velocidad ~200mm/s a 50%)');
      lines.push('    move_time = abs(distance_mm) / 200.0 * 1000');
      lines.push('    delay(int(move_time))');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('    if direction == 1:');
      lines.push('        print("Retrocediendo " + str(distance_mm) + "mm...")');
      lines.push('    else:');
      lines.push('        print("Avanzando " + str(distance_mm) + "mm...")');
      lines.push('');
      lines.push('def motionTurnAngle(direction, angle_deg, use_gyro=False):');
      lines.push('    """Gira un ángulo específico"""');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    spd = _stb_speed');
      lines.push('    if direction == "RIGHT":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(-spd)');
      lines.push('        print("Girando derecha " + str(angle_deg) + " grados...")');
      lines.push('    else:');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(-spd)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(spd)');
      lines.push('        print("Girando izquierda " + str(angle_deg) + " grados...")');
      lines.push('    # Calcular tiempo aproximado (velocidad ~180deg/s a 50%)');
      lines.push('    turn_time = abs(angle_deg) / 180.0 * 1000');
      lines.push('    delay(int(turn_time))');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('');
      lines.push('def motionForwardTime(selector, duration_ms):');
      lines.push('    """Avanza por un tiempo específico"""');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    if selector == "MOTION":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(_stb_speed)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(_stb_speed)');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].setSpeed(_stb_speed)');
      lines.push('    print("Avanzando por " + str(duration_ms) + "ms...")');
      lines.push('    delay(int(duration_ms))');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('');
      lines.push('def motionBackwardTime(selector, duration_ms):');
      lines.push('    """Retrocede por un tiempo específico"""');
      lines.push('    global _stb_motors, _stb_speed, _stb_left_ports, _stb_right_ports');
      lines.push('    if selector == "MOTION":');
      lines.push('        for port in _stb_left_ports:');
      lines.push('            _stb_motors[port].setSpeed(-_stb_speed)');
      lines.push('        for port in _stb_right_ports:');
      lines.push('            _stb_motors[port].setSpeed(-_stb_speed)');
      lines.push('    elif selector in _stb_motors:');
      lines.push('        _stb_motors[selector].setSpeed(-_stb_speed)');
      lines.push('    print("Retrocediendo por " + str(duration_ms) + "ms...")');
      lines.push('    delay(int(duration_ms))');
      lines.push('    for port in _stb_left_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('    for port in _stb_right_ports:');
      lines.push('        _stb_motors[port].stop()');
      lines.push('');

      // ============================================
      // Giroscopio
      // ============================================
      lines.push('# Giroscopio');
      lines.push('_gyro_angle = 0.0');
      lines.push('');
      lines.push('def gyroGetAngle():');
      lines.push('    global _gyro_angle');
      lines.push('    # En simulación, leer del sensor si existe');
      lines.push('    return _gyro_angle');
      lines.push('');
      lines.push('def gyroReset():');
      lines.push('    global _gyro_angle');
      lines.push('    _gyro_angle = 0.0');
      lines.push('');

      // ============================================
      // Sensores de entrada
      // ============================================
      lines.push('# Sensores');
      lines.push('def buttonRead(name):');
      lines.push('    return False');
      lines.push('');
      lines.push('def lightRead():');
      lines.push('    return 512');
      lines.push('');
      lines.push('def lightPercent():');
      lines.push('    return 50.0');
      lines.push('');
      lines.push('def temperatureCelsius():');
      lines.push('    return 25.0');
      lines.push('');
      lines.push('def microphoneRead():');
      lines.push('    return 512');
      lines.push('');
      lines.push('def soundLevelPercent():');
      lines.push('    return 20.0');
      lines.push('');

      // ============================================
      // Buzzer
      // ============================================
      lines.push('# Buzzer');
      lines.push('def buzzerTone(frequency, duration=0):');
      lines.push('    print("Buzzer: " + str(frequency) + "Hz")');
      lines.push('');
      lines.push('def buzzerOff():');
      lines.push('    pass');
      lines.push('');

      // ============================================
      // Sensor Ultrasónico (simulación para GearBot)
      // ============================================
      lines.push('# Sensor Ultrasónico (simulación GearBot)');
      lines.push('_stbV2UltraSensors = {}');
      lines.push('');
      lines.push('def _stbV2UltraCm(trigPin, echoPin):');
      lines.push('    key = str(trigPin) + "_" + str(echoPin)');
      lines.push('    if key not in _stbV2UltraSensors:');
      lines.push('        # Buscar sensor ultrasónico en los puertos de GearBot');
      lines.push('        sensor = None');
      lines.push('        for port in ["1","2","3","4","in1","in2","in3","in4"]:');
      lines.push('            try:');
      lines.push('                sensor = simPython.UltrasonicSensor(port)');
      lines.push('                break');
      lines.push('            except:');
      lines.push('                continue');
      lines.push('        _stbV2UltraSensors[key] = sensor');
      lines.push('    if _stbV2UltraSensors[key] is not None:');
      lines.push('        try:');
      lines.push('            return _stbV2UltraSensors[key].dist()');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    # Si no hay sensor, simular objeto a 30 cm');
      lines.push('    return 30.0');
      lines.push('');
      lines.push('def _stbV2UltraInch(trigPin, echoPin):');
      lines.push('    return _stbV2UltraCm(trigPin, echoPin) / 2.54');
      lines.push('');

      // ============================================
      // Sensor de Color TCS34725 (simulación GearBot)
      // ============================================
      lines.push('# Sensor de Color TCS34725 (simulación GearBot)');
      lines.push('_stbV2ColorSensor = None');
      lines.push('_stbV2ColorNameMap = {');
      lines.push('    "black": "negro", "blue": "azul", "green": "verde",');
      lines.push('    "yellow": "amarillo", "red": "rojo", "white": "blanco",');
      lines.push('    "brown": "marron"');
      lines.push('}');
      lines.push('');
      lines.push('def _stbV2GetColorSensor():');
      lines.push('    global _stbV2ColorSensor');
      lines.push('    if _stbV2ColorSensor is not None:');
      lines.push('        return _stbV2ColorSensor');
      lines.push('    for port in ["1","2","3","4","in1","in2","in3","in4"]:');
      lines.push('        try:');
      lines.push('            _stbV2ColorSensor = simPython.ColorSensor(port)');
      lines.push('            if _stbV2ColorSensor is not None:');
      lines.push('                break');
      lines.push('        except:');
      lines.push('            continue');
      lines.push('    return _stbV2ColorSensor');
      lines.push('');
      lines.push('def _stbV2ColorName():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            en = s.colorName().lower()');
      lines.push('            return _stbV2ColorNameMap.get(en, en)');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return "desconocido"');
      lines.push('');
      lines.push('def _stbV2ColorRed():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            return int(s.value()[0])');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return 0');
      lines.push('');
      lines.push('def _stbV2ColorGreen():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            return int(s.value()[1])');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return 0');
      lines.push('');
      lines.push('def _stbV2ColorBlue():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            return int(s.value()[2])');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return 0');
      lines.push('');
      lines.push('def _stbV2ColorClear():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            rgb = s.value()');
      lines.push('            return int((int(rgb[0]) + int(rgb[1]) + int(rgb[2])) / 3)');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return 0');
      lines.push('');
      lines.push('def _stbV2ColorHue():');
      lines.push('    s = _stbV2GetColorSensor()');
      lines.push('    if s is not None:');
      lines.push('        try:');
      lines.push('            hsv = s.valueHSV()');
      lines.push('            return float(hsv[0])');
      lines.push('        except:');
      lines.push('            pass');
      lines.push('    return 0.0');
      lines.push('');
      lines.push('def _stbV2ColorIsColor(colorName):');
      lines.push('    return _stbV2ColorName() == colorName');
      lines.push('');
      // ============================================
      // Monitor Serial - Comunicación Gearbot -> STBlock
      // ============================================
      lines.push('# Monitor Serial - Comunicación Gearbot -> STBlock');
      lines.push('');
      lines.push('def _sendToSTBlock(msgType, data):');
      lines.push('    """Enviar mensaje a STBlock via postMessage"""');
      lines.push('    try:');
      lines.push('        import js');
      lines.push('        if hasattr(js, "window") and hasattr(js.window, "parent"):');
      lines.push('            msg = {"type": msgType}');
      lines.push('            msg.update(data)');
      lines.push('            js.window.parent.postMessage(js.JSON.stringify(msg), "*")');
      lines.push('    except:');
      lines.push('        pass');
      lines.push('');
      lines.push('def serialPrint(value=""):');
      lines.push('    """Serial.print() - Enviar al monitor serial de STBlock"""');
      lines.push('    print(str(value), end="")');
      lines.push('');
      lines.push('def serialPrintln(value=""):');
      lines.push('    """Serial.println() - Enviar al monitor serial de STBlock con salto de línea"""');
      lines.push('    print(str(value))');
      lines.push('');
      lines.push('def serialPrintSensor(sensorName, value):');
      lines.push('    """Imprimir valor de sensor con formato"""');
      lines.push('    print("[" + str(sensorName) + "] " + str(value))');
      lines.push('');
      lines.push('# Alias para compatibilidad con Arduino');
      lines.push('Serial_print = serialPrint');
      lines.push('Serial_println = serialPrintln');
      lines.push('');

      // Extraer declaraciones de servo (Servo servo_N;)
      var servoDeclarations = [];
      var servoRegex = /Servo\s+(servo_(\d+))\s*;/g;
      var servoMatch;
      while ((servoMatch = servoRegex.exec(cppCode)) !== null) {
        var servoObjName = servoMatch[1];
        var servoPin = parseInt(servoMatch[2]);
        servoDeclarations.push({
          objName: servoObjName,
          pin: servoPin
        });
      }

      // Extraer definiciones de variables globales
      var globalVars = self.extractGlobalVariables(cppCode);
      if (globalVars.length > 0) {
        lines.push('# Variables globales');
        globalVars.forEach(function(v) {
          lines.push(v);
        });
        lines.push('');
      }

      // Inicializar servos en Python si hay declaraciones
      if (servoDeclarations.length > 0) {
        lines.push('# Inicializar servos');
        servoDeclarations.forEach(function(s) {
          lines.push(s.objName + ' = simPython.Servo()');
          lines.push(s.objName + '.attach(' + s.pin + ')');
        });
        lines.push('');
      }

      // Extraer y convertir funciones
      // Convertir stbV2DurationToMs en el código C++ ANTES de extraer funciones
      // Esto evita que la línea quede truncada si la extracción por llaves corta antes
      cppCode = cppCode.replace(/stbV2DurationToMs\s*\(\s*([^,]+)\s*,\s*"SECONDS"\s*\)/g, '($1 * 1000)');
      cppCode = cppCode.replace(/stbV2DurationToMs\s*\(\s*([^,]+)\s*,\s*"MILLISECONDS"\s*\)/g, '($1)');
      var setupCode = self.extractFunction(cppCode, 'setup');
      var loopCode = self.extractFunction(cppCode, 'loop');

      console.log('[STBlock Bridge] Setup code encontrado:', setupCode ? 'SI (' + setupCode.length + ' chars)' : 'NO');
      console.log('[STBlock Bridge] Loop code encontrado:', loopCode ? 'SI (' + loopCode.length + ' chars)' : 'NO');

      if (setupCode) {
        console.log('[STBlock Bridge] Setup code:\n', setupCode.substring(0, 300));
      }
      if (loopCode) {
        console.log('[STBlock Bridge] Loop code:\n', loopCode.substring(0, 300));
      }

      // Setup
      lines.push('# Función setup');
      lines.push('def setup():');
      if (setupCode) {
        var setupPy = self.convertCppBlockToPython(setupCode, '    ');
        console.log('[STBlock Bridge] Setup Python:\n', setupPy ? setupPy.substring(0, 300) : '(vacío)');
        if (setupPy && setupPy.trim()) {
          lines.push(setupPy);
          // Skulpt necesita al menos un statement real (no solo comentarios)
          var soloComentarios = setupPy.split('\n').every(function(l) {
            return !l.trim() || l.trim().startsWith('#');
          });
          if (soloComentarios) {
            lines.push('    pass');
          }
        } else {
          lines.push('    pass');
        }
      } else {
        lines.push('    pass');
      }
      lines.push('');

      // Loop
      lines.push('# Función loop');
      lines.push('def loop():');
      if (loopCode) {
        var loopPy = self.convertCppBlockToPython(loopCode, '    ');
        console.log('[STBlock Bridge] Loop Python:\n', loopPy ? loopPy.substring(0, 300) : '(vacío)');
        if (loopPy && loopPy.trim()) {
          lines.push(loopPy);
          // Skulpt necesita al menos un statement real (no solo comentarios)
          var soloComentarios = loopPy.split('\n').every(function(l) {
            return !l.trim() || l.trim().startsWith('#');
          });
          if (soloComentarios) {
            lines.push('    pass');
          }
        } else {
          lines.push('    pass');
        }
      } else {
        lines.push('    pass');
      }
      lines.push('');

      // Ejecución principal
      lines.push('# Ejecución');
      lines.push('setup()');
      lines.push('while True:');
      lines.push('    loop()');
      lines.push('    delay(10)  # 10ms entre iteraciones');

      var fullCode = lines.join('\n');

      // DEBUG: Mostrar código completo con números de línea
      console.log('[STBlock Bridge] ===== CÓDIGO PYTHON COMPLETO =====');
      var codeLines = fullCode.split('\n');
      for (var i = 0; i < codeLines.length; i++) {
        console.log('[L' + (i + 1) + '] ' + codeLines[i]);
      }
      console.log('[STBlock Bridge] ===== FIN CÓDIGO PYTHON =====');

      return fullCode;
    },

    /**
     * Extraer variables globales del código C++
     * Solo extrae variables simples del código del usuario, no de bibliotecas
     */
    extractGlobalVariables: function(code) {
      var vars = [];

      // Buscar el inicio del código del usuario (después de la última definición de biblioteca)
      // Las funciones setup() y loop() están al final del código
      var setupIndex = code.lastIndexOf('void setup()');
      if (setupIndex === -1) {
        setupIndex = code.length;
      }

      // Solo buscar en las últimas 2000 caracteres antes de setup (código del usuario)
      var userCodeStart = Math.max(0, setupIndex - 2000);
      var userCode = code.substring(userCodeStart, setupIndex);

      // Buscar variables simples (sin STB, sin _, no en funciones)
      var regex = /^\s*(int|float|double|long|byte|bool|boolean)\s+(\w+)\s*=\s*(\d+(?:\.\d+)?)\s*;/gm;
      var match;

      while ((match = regex.exec(userCode)) !== null) {
        var varName = match[2];
        var value = match[3];

        // Ignorar variables de sistema (empiezan con stb, STB, _, o servo)
        if (varName.match(/^(stb|STB|_|STBV2|servo)/i)) {
          continue;
        }

        vars.push(varName + ' = ' + value);
      }

      // NO extraer #define ni const de bibliotecas - causan errores de sintaxis

      console.log('[STBlock Bridge] Variables globales extraídas:', vars.length);
      return vars;
    },

    /**
     * Extraer cuerpo de una función C++
     * Busca específicamente setup() y loop() que están al final del código
     */
    extractFunction: function(code, funcName) {
      // Buscar todas las ocurrencias de la función
      var simpleRegex = new RegExp('void\\s+' + funcName + '\\s*\\(\\s*\\)\\s*\\{', 'gi');
      var matches = [];
      var match;

      while ((match = simpleRegex.exec(code)) !== null) {
        matches.push(match);
      }

      if (matches.length === 0) {
        console.log('[STBlock Bridge] Función ' + funcName + '() no encontrada');
        return null;
      }

      // Usar la última ocurrencia (setup/loop suelen estar al final)
      var lastMatch = matches[matches.length - 1];
      console.log('[STBlock Bridge] Encontrada función ' + funcName + '() en posición ' + lastMatch.index);

      var startIdx = lastMatch.index + lastMatch[0].length;
      var braceCount = 1;
      var endIdx = startIdx;

      while (braceCount > 0 && endIdx < code.length) {
        if (code[endIdx] === '{') braceCount++;
        if (code[endIdx] === '}') braceCount--;
        endIdx++;
      }

      var body = code.substring(startIdx, endIdx - 1);
      console.log('[STBlock Bridge] Cuerpo de ' + funcName + '() extraído (' + body.length + ' chars)');

      return body;
    },

    /**
     * Convertir bloque de código C++ a Python
     */
    convertCppBlockToPython: function(cppBlock, indent) {
      indent = indent || '';
      var lines = cppBlock.split('\n');
      var pyLines = [];
      var currentIndent = indent;
      var inMultiLineComment = false;

      lines.forEach(function(line) {
        var trimmed = line.trim();

        // Saltar líneas vacías
        if (!trimmed) return;

        // Manejar comentarios multilínea
        if (trimmed.startsWith('/*')) {
          inMultiLineComment = true;
          return;
        }
        if (trimmed.endsWith('*/')) {
          inMultiLineComment = false;
          return;
        }
        if (inMultiLineComment) return;

        // Comentarios de línea
        if (trimmed.startsWith('//')) {
          pyLines.push(currentIndent + '#' + trimmed.substring(2));
          return;
        }

        // Convertir línea
        var pyLine = self.convertCppLineToPython(trimmed);
        if (pyLine) {
          // Manejar bloques
          if (pyLine.endsWith(':')) {
            pyLines.push(currentIndent + pyLine);
            currentIndent += '    ';
          } else if (pyLine === 'END_BLOCK') {
            currentIndent = currentIndent.substring(4);
          } else {
            pyLines.push(currentIndent + pyLine);
          }
        }
      });

      return pyLines.join('\n');
    },

    /**
     * Convertir una línea de C++ a Python
     */
    convertCppLineToPython: function(line) {
      // Remover punto y coma final
      line = line.replace(/;$/, '');

      // Solo llave de cierre
      if (line === '}') {
        return 'END_BLOCK';
      }

      // Llave de apertura (ignorar)
      if (line === '{') {
        return null;
      }

      // if/else
      line = line.replace(/^if\s*\(\s*(.+?)\s*\)\s*\{?$/, function(_, cond) {
        return 'if ' + self.convertCondition(cond) + ':';
      });
      line = line.replace(/^else\s+if\s*\(\s*(.+?)\s*\)\s*\{?$/, function(_, cond) {
        return 'elif ' + self.convertCondition(cond) + ':';
      });
      line = line.replace(/^else\s*\{?$/, 'else:');

      // while
      line = line.replace(/^while\s*\(\s*(.+?)\s*\)\s*\{?$/, function(_, cond) {
        return 'while ' + self.convertCondition(cond) + ':';
      });

      // for (simplificado)
      line = line.replace(/^for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\+\+\s*\)\s*\{?$/,
        'for $1 in range($2, $3):');

      // Funciones Arduino (ya mapeadas como funciones globales)
      // No necesitan conversión adicional

      // Variables locales
      line = line.replace(/^(int|float|double|long|byte|bool|boolean|unsigned\s+\w+)\s+(\w+)\s*=\s*(.+)$/,
        '$2 = $3');
      line = line.replace(/^(int|float|double|long|byte|bool|boolean|unsigned\s+\w+)\s+(\w+)\s*$/,
        '$2 = 0');

      // Operadores
      line = line.replace(/&&/g, ' and ');
      line = line.replace(/\|\|/g, ' or ');
      line = line.replace(/!/g, 'not ');
      line = line.replace(/not\s*=/g, '!='); // Corregir != que se convirtió

      // Constantes
      line = line.replace(/\bHIGH\b/g, 'HIGH');
      line = line.replace(/\bLOW\b/g, 'LOW');
      line = line.replace(/\bOUTPUT\b/g, 'OUTPUT');
      line = line.replace(/\bINPUT\b/g, 'INPUT');
      line = line.replace(/\bINPUT_PULLUP\b/g, 'INPUT_PULLUP');
      line = line.replace(/\btrue\b/gi, 'True');
      line = line.replace(/\bfalse\b/gi, 'False');

      // ============================================
      // STBoard V2 - CONVERSIONES COMPLETAS
      // NOTA: Las funciones Python NO deben empezar con "stbV2" para evitar
      // que el catch-all las capture y las convierta a "pass"
      // ============================================

      // --- MOTORES ---
      // Runtime y configuración (se ignoran, son de bajo nivel)
      line = line.replace(/stbV2RuntimeTick\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2InitRuntime\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2SetBoardDefaults\s*\([^)]*\)/g, 'pass');

      // Configurar motor: stbV2ConfigureMotor(0, STB_V2_SIDE_LEFT)
      // Convierte a: motorConfigure("A1", "LEFT")
      line = line.replace(/stbV2ConfigureMotor\s*\(\s*(\d+)\s*,\s*STB_V2_SIDE_(\w+)\s*\)/g, function(_, idx, side) {
        var ports = ['A1', 'A2', 'B3', 'B4'];
        var port = ports[parseInt(idx)] || 'A1';
        return 'motorConfigure("' + port + '", "' + side + '")';
      });

      // Velocidad y dirección
      line = line.replace(/stbV2SetDirection\s*\([^)]*\)/g, 'pass');
      // stbV2SetSpeedBySelector("MOTION", 100) -> motionSetSpeed(100)
      line = line.replace(/stbV2SetSpeedBySelector\s*\(\s*"([^"]+)"\s*,\s*([^)]+)\s*\)/g, 'motionSetSpeed($2)');
      line = line.replace(/stbV2SetSpeed\s*\([^)]*\)/g, 'pass');

      // Movimiento
      // stbV2MoveBySelector("MOTION") -> motionForward("MOTION")
      line = line.replace(/stbV2MoveBySelector\s*\(\s*"([^"]+)"\s*\)/g, 'motionForward("$1")');
      // stbV2ReverseBySelector("MOTION") -> motionBackward("MOTION")
      line = line.replace(/stbV2ReverseBySelector\s*\(\s*"([^"]+)"\s*\)/g, 'motionBackward("$1")');
      // stbV2StopBySelector("MOTION") -> motionStop("MOTION")
      line = line.replace(/stbV2StopBySelector\s*\(\s*"([^"]+)"\s*(?:,\s*[^)]+)?\s*\)/g, 'motionStop("$1")');

      // Movimiento por tiempo
      // stbV2MoveForDurationUsingStoredSpeedBlocking("MOTION", false, (2 * 1000))
      // -> motionForward("MOTION"); delay((2 * 1000)); motionStop("MOTION")
      // NOTA: DurationToMs ya fue convertido ANTES de extractFunction (línea 729)
      // Usamos extracción manual con indexOf/substring porque las regex con .+
      // tienen problemas con los )) de cierre y el backtracking de paréntesis
      (function() {
        var funcName = '';
        if (line.indexOf('stbV2MoveForDurationUsingStoredSpeedBlocking(') === 0) {
          funcName = 'stbV2MoveForDurationUsingStoredSpeedBlocking';
        } else if (line.indexOf('stbV2MoveForDurationUsingStoredSpeedAsync(') === 0) {
          funcName = 'stbV2MoveForDurationUsingStoredSpeedAsync';
        }
        if (funcName) {
          var rest = line.substring(funcName.length + 1); // Después del (
          // Extraer selector entre comillas
          var q1 = rest.indexOf('"');
          if (q1 >= 0) {
            var q2 = rest.indexOf('"', q1 + 1);
            if (q2 >= 0) {
              var selector = rest.substring(q1 + 1, q2);
              // Buscar true/false después del selector
              var afterSel = rest.substring(q2 + 1);
              var isReverse = afterSel.indexOf('true') >= 0;
              var func = isReverse ? 'motionBackward' : 'motionForward';
              // Buscar la expresión de duración (después de la segunda coma)
              var comma1 = afterSel.indexOf(',');
              var afterBool = afterSel.substring(comma1 + 1).trim();
              var comma2 = afterBool.indexOf(',');
              var durPart = afterBool.substring(comma2 + 1).trim();
              // durPart = (2 * 1000))  -- extraer contando paréntesis anidados
              var durStart = durPart.indexOf('(');
              if (durStart >= 0) {
                var parenCount = 1;
                var durEnd = durStart + 1;
                while (parenCount > 0 && durEnd < durPart.length) {
                  if (durPart[durEnd] === '(') parenCount++;
                  if (durPart[durEnd] === ')') parenCount--;
                  durEnd++;
                }
                var durationExpr = durPart.substring(durStart, durEnd);
                line = func + '("' + selector + '"); delay(' + durationExpr + '); motionStop("' + selector + '")';
              }
            }
          }
        }
      })();
      // Fallback general: capturar ambos )) de cierre
      line = line.replace(/stbV2MoveForDuration\w*\s*\([^)]*\)\)/g, 'motionForward("MOTION")');

      // Movimiento por distancia
      // stbV2MoveDistanceBlocking("MOTION", stbV2DistanceValueToMm(10, "CM"), 0) -> motionForwardDistance("MOTION", 100)
      line = line.replace(
        /stbV2MoveDistance(?:Blocking|BySelector)\s*\(\s*"([^"]+)"\s*,\s*stbV2DistanceValueToMm\s*\(\s*([^,]+)\s*,\s*"([^"]+)"\s*\)[^)]*\)/g,
        function(match, selector, value, unit) {
          var num = parseFloat(value) || 0;
          var mm = num;
          if (unit === 'CM') mm = num * 10;
          else if (unit === 'M') mm = num * 1000;
          else if (unit === 'IN') mm = num * 25.4;
          else if (unit === 'FT') mm = num * 304.8;
          return 'motionForwardDistance("' + selector + '", ' + Math.round(mm) + ')';
        }
      );
      // stbV2TurnDistanceBlocking -> motionTurnRight (fallback sin ángulo real)
      line = line.replace(/stbV2TurnDistanceBlocking\s*\([^)]*\)/g, 'motionTurnRight(45)');

      // Giros continuos
      // stbV2TurnContinuous("RIGHT") -> motionTurnRight()
      line = line.replace(/stbV2TurnContinuous\s*\(\s*"RIGHT"\s*\)/g, 'motionTurnRight()');
      line = line.replace(/stbV2TurnContinuous\s*\(\s*"LEFT"\s*\)/g, 'motionTurnLeft()');

      // Giro con giroscopio -> motionTurnAngle (trata el valor como grados, no como velocidad)
      line = line.replace(/stbV2TurnByGyro\s*\(\s*String\s*\(\s*"([^"]+)"\s*\)\s*,\s*([^,]+)\s*,[^)]*\)/g, 'motionTurnAngle("$1", $2)');

      // Giro por ángulo (ej: stbV2TurnByAmount("RIGHT", 90, "DEGREES", 0) -> motionTurnAngle("RIGHT", 90))
      line = line.replace(
        /stbV2TurnByAmount\s*\(\s*"([^"]+)"\s*,\s*([^,]+)\s*,\s*"([^"]+)"\s*,\s*[^)]*\s*\)/g,
        function(match, direction, angle, unit) {
          var degrees = parseFloat(angle) || 0;
          if (unit === 'RAD' || unit === 'RADIANS') degrees = degrees * 57.2958;
          else if (unit === 'TURNS') degrees = degrees * 360;
          else if (unit === 'QUARTER') degrees = degrees * 90;
          return 'motionTurnAngle("' + direction + '", ' + Math.round(degrees) + ')';
        }
      );
      // stbV2WaitForSelectorIdle es una espera bloqueante - en simulación se omite
      line = line.replace(/stbV2WaitForSelectorIdle\s*\([^)]*\)/g, '');

      // SafeDelay
      line = line.replace(/stbV2SafeDelay\s*\(\s*\(unsigned\s+long\)\s*\(\s*([^)]+)\s*\)\s*\*\s*1000UL\s*\)/g, 'delay($1 * 1000)');
      line = line.replace(/stbV2SafeDelay\s*\(\s*\(unsigned\s+long\)\s*\(\s*([^)]+)\s*\)\s*\)/g, 'delay($1)');

      // Motor en movimiento
      line = line.replace(/stbV2IsMotorMoving\s*\([^)]*\)/g, 'False');
      line = line.replace(/stbV2ResetDistanceBySelector\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2SetMotionControlMode\s*\([^)]*\)/g, 'pass');

      // Lecturas de motor (devuelven valores simulados)
      line = line.replace(/stbV2GetStoredSpeedPercent\s*\([^)]*\)/g, '50');
      line = line.replace(/stbV2GetCurrentMotorRpm\s*\([^)]*\)/g, '100');
      line = line.replace(/stbV2GetEncoderValue\s*\([^)]*\)/g, '0');
      line = line.replace(/stbV2GetDistanceCm\s*\([^)]*\)/g, '0.0');
      line = line.replace(/stbV2MotionProgressCm\s*\(\s*\)/g, '0.0');
      line = line.replace(/stbV2GetLastStopReason\s*\([^)]*\)/g, '"MANUAL"');
      line = line.replace(/stbV2GetLastErrorCode\s*\([^)]*\)/g, '0');
      line = line.replace(/stbV2HasMotionPair\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2MotorsConfigured\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2MotorBusy\s*\([^)]*\)/g, 'False');
      line = line.replace(/stbV2ResetDistance\s*\([^)]*\)/g, 'pass');

      // --- GIROSCOPIO ---
      // Inicialización y configuración
      line = line.replace(/stbV2InitGyroHardware\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2ConfigureGyro\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2CalibrateGyro\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2CalibrateGyroPosture\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2UpdateGyro\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2ResetGyroAngle\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2PrepareTurnGyro\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2GyroAssistReady\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2GyroReady\s*\(\s*\)/g, 'True');

      // Lecturas del giroscopio
      line = line.replace(/stbV2GetGyroAngle\s*\(\s*\)/g, 'gyroGetAngle()');
      line = line.replace(/stbV2GetTiltAngleDeg\s*\(\s*\)/g, '0.0');
      line = line.replace(/stbV2GetGyroAcceleration\s*\([^)]*\)/g, '0.0');
      line = line.replace(/stbV2GetGyroAngularVelocity\s*\([^)]*\)/g, '0.0');

      // Acceso directo a struct
      line = line.replace(/stbV2Gyro\.angleDeg/g, '0.0');
      line = line.replace(/stbV2Gyro\.accel\[\d+\]/g, '0.0');
      line = line.replace(/stbV2Gyro\.gyro\[\d+\]/g, '0.0');
      line = line.replace(/stbV2Gyro\.\w+/g, '0');
      line = line.replace(/stbV2GetYawRateDeg\s*\(\s*\)/g, '0.0');
      line = line.replace(/stbV2CompareFloat\s*\([^)]*\)/g, 'False');
      line = line.replace(/stbV2TurnValueToDegrees\s*\([^)]*\)/g, '90.0');

      // --- BOTONES ---
      line = line.replace(/stbV2ButtonsInit\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2ButtonsTick\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2ReadButton\s*\(\s*"([^"]+)"\s*\)/g, 'False');
      line = line.replace(/stbV2GetButtonCount\s*\(\s*"([^"]+)"\s*\)/g, '0');
      line = line.replace(/stbV2ResetButtonCount\s*\([^)]*\)/g, 'pass');

      // --- INFRARROJO ---
      line = line.replace(/stbV2InfraredInit\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2InfraredTick\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2InfraredDetected\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2GetInfraredDetectionCount\s*\(\s*\)/g, '0');
      line = line.replace(/stbV2ResetInfraredCount\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2InfraredEmitterActive\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2SetInfraredEmitter\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MeasureInfraredPulses\s*\([^)]*\)/g, '0');
      line = line.replace(/stbV2EmitInfraredPulses\s*\([^)]*\)/g, 'pass');

      // --- BUZZER ---
      line = line.replace(/stbV2BuzzerInit\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerOn\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerOff\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerTone\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerNote\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerSilence\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BuzzerActive\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2BuzzerFrequency\s*\(\s*\)/g, '0');
      line = line.replace(/tone\s*\([^)]*\)/g, 'pass');
      line = line.replace(/noTone\s*\([^)]*\)/g, 'pass');

      // --- LUZ ---
      line = line.replace(/stbV2ReadLightRaw\s*\(\s*\)/g, '512');
      line = line.replace(/stbV2ReadLightPercent\s*\(\s*\)/g, '50.0');
      line = line.replace(/stbV2HasBrightLight\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2HasLowLight\s*\(\s*\)/g, 'False');

      // --- TEMPERATURA ---
      line = line.replace(/stbV2ReadTemperatureRaw\s*\(\s*\)/g, '512');
      line = line.replace(/stbV2ReadTemperatureVoltage\s*\(\s*\)/g, '2.5');
      line = line.replace(/stbV2ReadTemperatureKelvin\s*\(\s*\)/g, '298.0');
      line = line.replace(/stbV2ReadTemperatureCelsius\s*\(\s*\)/g, '25.0');
      line = line.replace(/stbV2IsHot\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2IsCold\s*\(\s*\)/g, 'False');

      // --- MICRÓFONO ---
      line = line.replace(/stbV2CalibrateMicrophone\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2ReadMicrophoneRaw\s*\(\s*\)/g, '512');
      line = line.replace(/stbV2ReadSoundLevelPercent\s*\(\s*\)/g, '20.0');
      line = line.replace(/stbV2MicrophoneCalibrated\s*\(\s*\)/g, 'True');
      line = line.replace(/stbV2HasLoudSound\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2HasLowSound\s*\(\s*\)/g, 'True');

      // --- OLED ---
      line = line.replace(/stbV2OledInit\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2OledEnsureInit\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2Oled\.\w+\s*\([^)]*\)/g, 'pass');
      line = line.replace(/display\.\w+\s*\([^)]*\)/g, 'pass');

      // --- BATERÍA / UI ---
      line = line.replace(/stbV2ReadBatteryStatus\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BatteryUiTick\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2DrawBatteryDashboard\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2DrawBatteryGauge\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2ShowWelcomeSequence\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BatteryPercent/g, '100.0');
      line = line.replace(/stbV2BatteryVoltage/g, '8.0');
      line = line.replace(/stbV2BatteryCharging/g, 'False');

      // --- BOOT UI ---
      line = line.replace(/stbV2BootUiEnabled\s*=\s*\w+/g, 'pass');
      line = line.replace(/stbV2BootUiAllowModeButtons\s*=\s*\w+/g, 'pass');
      line = line.replace(/stbV2BootUiDisable\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BootUiDisableModeButtons\s*\(\s*\)/g, 'pass');

      // --- BLUETOOTH ---
      line = line.replace(/stbV2BluetoothInit\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2BluetoothClose\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2BluetoothStarted\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2BluetoothHasData\s*\(\s*\)/g, 'False');
      line = line.replace(/stbV2BluetoothAvailable\s*\(\s*\)/g, '0');
      line = line.replace(/stbV2BluetoothSend\w*\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2BluetoothRead\w*\s*\([^)]*\)/g, '""');
      line = line.replace(/stbV2BluetoothClear\s*\(\s*\)/g, 'pass');

      // --- MATRIZ LED ---
      line = line.replace(/stbV2MatrixInit\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2MatrixOn\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2MatrixOff\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2MatrixBrightness\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixClear\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2MatrixFill\s*\(\s*\)/g, 'pass');
      line = line.replace(/stbV2MatrixSetPixel\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixTogglePixel\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixGetPixel\s*\([^)]*\)/g, 'False');
      line = line.replace(/stbV2MatrixDrawRow\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixDrawColumn\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixShowPattern\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixScroll\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixShowChar\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2MatrixShowText\s*\([^)]*\)/g, 'pass');

      // --- PRECISIÓN ---
      line = line.replace(/stbV2Precision\w+\s*\([^)]*\)/g, 'pass');
      line = line.replace(/stbV2PrecisionActive/g, 'False');

      // --- ULTRASONIDO (STBoard V2 vía puertos) ---
      // stbV2UltrasonicReadCm(trigPin, echoPin) -> _stbV2UltraCm(trigPin, echoPin)
      line = line.replace(/stbV2UltrasonicReadCm\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '_stbV2UltraCm($1, $2)');
      line = line.replace(/stbV2UltrasonicReadInch\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '_stbV2UltraInch($1, $2)');

      // --- COLOR SENSOR TCS34725 (STBoard V2 vía I2C) ---
      line = line.replace(/stbV2ColorReadName\s*\(\s*\)/g, '_stbV2ColorName()');
      line = line.replace(/stbV2ColorReadRed\s*\(\s*\)/g, '_stbV2ColorRed()');
      line = line.replace(/stbV2ColorReadGreen\s*\(\s*\)/g, '_stbV2ColorGreen()');
      line = line.replace(/stbV2ColorReadBlue\s*\(\s*\)/g, '_stbV2ColorBlue()');
      line = line.replace(/stbV2ColorReadClear\s*\(\s*\)/g, '_stbV2ColorClear()');
      line = line.replace(/stbV2ColorReadHue\s*\(\s*\)/g, '_stbV2ColorHue()');
      line = line.replace(/stbV2ColorIsColor\s*\([^)]*\)/g, function(m) {
        var inner = m.slice(m.indexOf('(') + 1, m.lastIndexOf(')'));
        return '_stbV2ColorIsColor(' + inner + ')';
      });

      // --- SERIAL MONITOR (comunicación Gearbot -> STBlock) ---
      // Serial.begin() - ignorar (no necesario en simulador)
      line = line.replace(/Serial\.begin\s*\([^)]*\)/g, 'pass');
      // Serial.println(valor) -> serialPrintln(valor)
      line = line.replace(/Serial\.println\s*\(\s*\)/g, 'serialPrintln()');
      line = line.replace(/Serial\.println\s*\(([^)]+)\)/g, 'serialPrintln($1)');
      // Serial.print(valor) -> serialPrint(valor)
      line = line.replace(/Serial\.print\s*\(([^)]+)\)/g, 'serialPrint($1)');
      // Serial.available() -> 0 (no hay entrada serial en simulador)
      line = line.replace(/Serial\.available\s*\(\s*\)/g, '0');
      // Serial.read() -> 0
      line = line.replace(/Serial\.read\s*\(\s*\)/g, '0');

      // --- I2C / Wire ---
      line = line.replace(/Wire\.\w+\s*\([^)]*\)/g, 'pass');
      line = line.replace(/ina219\.\w+\s*\([^)]*\)/g, 'pass');

      // --- Variables locales de versión local ---
      line = line.replace(/\bstbV2Local\w+\s*\([^)]*\)/g, 'pass');

      // --- Servo functions ---
      // Convertir llamadas a funciones wrapper de servo generadas por STBlock
      // servoWriteAngle_N(angle) -> servo_N.write(angle)
      line = line.replace(/servoWriteAngle_(\d+)\s*\(([^)]*)\)/g, 'servo_$1.write($2)');
      // servoWritePulse_N(pulse) -> servo_N.writeMicroseconds(pulse)
      line = line.replace(/servoWritePulse_(\d+)\s*\(([^)]*)\)/g, 'servo_$1.writeMicroseconds($2)');
      // servoWriteContinuous_N(speed) -> servo_N.writeMicroseconds(map(speed,-100,100,544,2400))
      line = line.replace(/servoWriteContinuous_(\d+)\s*\(([^)]*)\)/g, 'servo_$1.writeMicroseconds(int(544 + ($2 + 100) * (2400 - 544) / 200))');
      // servoCenter_N() -> servo_N.write(90)
      line = line.replace(/servoCenter_(\d+)\s*\(\s*\)/g, 'servo_$1.write(90)');
      // servoRead_N() -> servo_N.read()
      line = line.replace(/servoRead_(\d+)\s*\(\s*\)/g, 'servo_$1.read()');
      // servoStopContinuous_N() -> servo_N.writeMicroseconds(1500)
      line = line.replace(/servoStopContinuous_(\d+)\s*\(\s*\)/g, 'servo_$1.writeMicroseconds(1500)');
      // servoDetach_N() -> servo_N.detach()
      line = line.replace(/servoDetach_(\d+)\s*\(\s*\)/g, 'servo_$1.detach()');
      // servoAttach_N(minUs, maxUs) -> servo_N.attach(pin, minUs, maxUs) -- se ignora, attach ya se hizo
      line = line.replace(/servoAttach_\d+\s*\([^)]*\)/g, 'pass');
      // servoEnsure_N() -> pass (ya estamos seguros de que el servo existe)
      line = line.replace(/servoEnsure_\d+\s*\(\s*\)/g, 'pass');
      // servoMoveSmooth_N(target, duration) -> secuencia de pasos simplificada
      line = line.replace(/servoMoveSmooth_(\d+)\s*\(([^,]+),\s*([^)]+)\)/g, 'servo_$1.write($2); delay(($3 > 10 ? 10 : $3))');

      // --- Funciones genéricas restantes de stbV2 ---
      line = line.replace(/\bstbV2\w+\s*\([^)]*\)/g, 'pass');

      // ============================================
      // Ignorar definiciones de funciones auxiliares
      // ============================================

      // Ignorar definiciones de funciones (solo queremos las llamadas)
      if (line.match(/^(void|bool|float|int|uint8_t|int8_t|uint32_t|String|unsigned)\s+\w+\s*\(/)) {
        return null;
      }

      // Ignorar declaraciones de Servo (ya fueron procesadas en la preambulo)
      if (line.match(/^Servo\s+servo_\d+\s*;?\s*$/)) {
        return null;
      }

      // Ignorar variables de servo (int servo_N_angle, bool servo_N_attached, etc.)
      if (line.match(/^\w+\s+servo_\d+_\w+\s*/)) {
        return null;
      }

      // Ignorar structs y tipos
      if (line.match(/^struct\s+\w+/) || line.match(/^}\s*;?\s*$/) || line.match(/^typedef\s+/)) {
        return null;
      }

      // Ignorar includes
      if (line.match(/^#include/) || line.match(/^#define/) || line.match(/^#ifdef/) || line.match(/^#endif/)) {
        return null;
      }

      // Ignorar const de STBoard
      if (line.match(/^const\s+\w+\s+\w*STB/) || line.match(/^const\s+\w+\s+SSD1306/)) {
        return null;
      }

      // Ignorar declaraciones de objetos Adafruit
      if (line.match(/^Adafruit_\w+/) || line.match(/^sensors_event_t/) || line.match(/^STBV2\w+State/)) {
        return null;
      }

      return line;
    },

    /**
     * Convertir condición C++ a Python
     */
    convertCondition: function(cond) {
      cond = cond.replace(/&&/g, ' and ');
      cond = cond.replace(/\|\|/g, ' or ');
      cond = cond.replace(/!(\w)/g, 'not $1');
      cond = cond.replace(/\btrue\b/gi, 'True');
      cond = cond.replace(/\bfalse\b/gi, 'False');
      // Remover comillas alrededor de valores numéricos para evitar
      // TypeError: '<' not supported between instances of 'float' and 'str'
      cond = cond.replace(/"(-?\d+(\.\d+)?)"/g, '$1');
      return cond;
    },

    /**
     * Detener ejecución actual
     */
    stopExecution: function() {
      if (typeof skulpt !== 'undefined' && skulpt.hardInterrupt !== undefined) {
        skulpt.hardInterrupt = true;
      }

      if (simPanel && simPanel.setRunIcon) {
        simPanel.setRunIcon('run');
      }

      self.sendStatus('stopped');
    },

    /**
     * Resetear simulador
     */
    resetSimulator: function() {
      self.stopExecution();

      if (simPanel && simPanel.resetSim) {
        simPanel.resetSim(true);
      }

      ArduinoInterpreter.resetPinState();
      self.sendStatus('reset');
    },

    /**
     * Seleccionar robot
     */
    selectRobot: function(robotId) {
      console.log('[STBlock Bridge] Seleccionar robot:', robotId);

      if (!robotId) {
        self.sendError('ID de robot no especificado');
        return;
      }

      try {
        var robotConfig = null;

        // Verificar si es un robot personalizado
        if (robotId.startsWith('custom-robot-') && typeof customRobotStorage !== 'undefined') {
          var customRobot = customRobotStorage.getById(robotId);
          if (customRobot) {
            robotConfig = customRobotStorage.toSimulatorFormat(customRobot);
          }
        }
        // Verificar si es un robot de plantilla
        else if (robotId.startsWith('template-') && typeof robotTemplates !== 'undefined') {
          var index = parseInt(robotId.replace('template-', ''), 10);
          if (robotTemplates[index]) {
            robotConfig = robotTemplates[index];
          }
        }

        if (!robotConfig) {
          self.sendError('Robot no encontrado: ' + robotId);
          return;
        }

        // Cargar el robot en el simulador
        if (typeof robot !== 'undefined' && typeof main !== 'undefined' && main.loadRobot) {
          robot.options = robotConfig;
          main.loadRobot(robotConfig);

          self.postToParent({
            type: 'gearbot-robot-loaded',
            robotId: robotId,
            robotName: robotConfig.shortDescription || robotConfig.name
          });
        } else {
          self.sendError('Sistema de carga de robot no disponible');
        }

      } catch (error) {
        console.error('[STBlock Bridge] Error al seleccionar robot:', error);
        self.sendError('Error al cargar robot: ' + error.message);
      }
    },

    /**
     * Enviar lista de robots compatibles
     */
    sendRobotList: function(boardType) {
      var robotList = [];

      // Obtener robots personalizados filtrados por tarjeta
      if (typeof customRobotStorage !== 'undefined') {
        var customRobots = customRobotStorage.getByBoardType(boardType);
        customRobots.forEach(function(robot) {
          robotList.push({
            id: robot.id,
            name: robot.name || 'Robot sin nombre',
            thumbnail: robot.thumbnail || '',
            boardType: robot.boardType || 'stbBoardV2',
            isCustom: true
          });
        });
      }

      // También agregar robots predefinidos si están disponibles
      if (typeof robotTemplates !== 'undefined') {
        robotTemplates.forEach(function(template, index) {
          // Verificar compatibilidad de tarjeta
          var templateBoard = template.boardType || 'stbBoardV2';
          var isCompatible = !boardType || templateBoard === boardType ||
            (typeof customRobotStorage !== 'undefined' &&
             customRobotStorage.isCompatibleBoard(templateBoard, boardType));

          if (isCompatible) {
            robotList.push({
              id: 'template-' + index,
              name: template.shortDescription || template.name,
              thumbnail: template.thumbnail || '',
              boardType: templateBoard,
              isCustom: false
            });
          }
        });
      }

      // Enviar al padre
      self.postToParent({
        type: 'gearbot-robots',
        robots: robotList,
        boardType: boardType
      });
    },

    // ============================================
    // COMUNICACIÓN CON STBlock
    // ============================================

    /**
     * Notificar que Gearbot está listo
     */
    notifyReady: function() {
      self.postToParent({
        type: 'gearbot-ready',
        robotId: robot ? robot.options.id : null,
        boardType: robot ? robot.options.boardType : null
      });
    },

    /**
     * Enviar estado
     */
    sendStatus: function(status) {
      self.postToParent({
        type: 'gearbot-status',
        status: status
      });
    },

    /**
     * Enviar error
     */
    sendError: function(message) {
      self.postToParent({
        type: 'gearbot-error',
        error: message
      });

      if (simPanel && simPanel.consoleWriteErrors) {
        simPanel.consoleWriteErrors(message);
      }
    },

    /**
     * Responder ping
     */
    sendPong: function() {
      self.postToParent({
        type: 'gearbot-pong',
        timestamp: Date.now()
      });
    },

    /**
     * Enviar texto al monitor serial de STBlock
     * @param {string} text - Texto a enviar
     * @param {boolean} newline - Si agregar salto de línea
     */
    sendSerial: function(text, newline) {
      var output = String(text);
      if (newline) output += '\n';

      self.postToParent({
        type: 'gearbot-serial',
        text: output,
        timestamp: Date.now()
      });

      // También mostrar en consola local
      if (simPanel && simPanel.consoleWrite) {
        simPanel.consoleWrite(output);
      }
      console.log('[STBlock Bridge] Serial:', output);
    },

    /**
     * Enviar valor de sensor al monitor serial
     * @param {string} sensorName - Nombre del sensor
     * @param {any} value - Valor a enviar
     */
    sendSensorValue: function(sensorName, value) {
      var output = '[' + sensorName + '] ' + String(value);
      self.sendSerial(output, true);
    },

    /**
     * Enviar mensaje al padre (STBlock)
     */
    postToParent: function(data) {
      if (window.parent !== window) {
        window.parent.postMessage(data, '*');
      }
    }
  };

  return self;
})();

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      STBlockBridge.init();
    });
  } else {
    STBlockBridge.init();
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.STBlockBridge = STBlockBridge;
}
