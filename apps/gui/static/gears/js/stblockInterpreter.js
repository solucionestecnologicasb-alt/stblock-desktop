/**
 * STBlock C++ Interpreter for GearsBot
 *
 * Este módulo interpreta código C++ generado por los bloques de STBlock
 * y lo ejecuta en el simulador de GearsBot.
 *
 * IMPORTANTE: Respeta la configuración real de motores.
 * - Los puertos configurados en STBlock deben coincidir con GearsBot
 * - Si un motor no está configurado o el puerto no coincide, no se mueve
 * - La velocidad debe ser configurada explícitamente
 */

console.log('[STBlock Interpreter] Versión: debug-v12 cargada');

var stblockInterpreter = new function() {
  var self = this;

  // Estado del intérprete
  this.running = false;
  this.paused = false;
  this.loopInterval = null;
  this.loopCode = null;
  this.loopIterations = 0;
  this.maxLoopIterations = 10000; // Máximo de iteraciones para evitar loops infinitos

  // ═══════════════════════════════════════════════════════════════════════════
  // SISTEMA DE VARIABLES Y FUNCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  // Almacén de variables globales
  this.variables = {};

  // Almacén de funciones personalizadas
  this.functions = {};

  // Resetear variables y funciones
  this.resetVariables = function() {
    self.variables = {};
    self.functions = {};
  };

  // Obtener valor de variable
  this.getVariable = function(name) {
    if (self.variables.hasOwnProperty(name)) {
      return self.variables[name];
    }
    console.log('[STBlock] ⚠️ Variable no definida:', name);
    return 0;
  };

  // Establecer valor de variable
  this.setVariable = function(name, value) {
    self.variables[name] = value;
  };

  // Verificar si es un tipo de dato
  this.isDataType = function(word) {
    return ['int', 'float', 'double', 'bool', 'boolean', 'String', 'char', 'long', 'unsigned', 'short', 'byte', 'void'].includes(word);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DEL ROBOT - Refleja el estado real de STBoard V2
  // ═══════════════════════════════════════════════════════════════════════════

  this.config = {
    wheelDiameterCm: 5.6,
    maxRpm: 120,
    trackWidthCm: 14,
    initialized: false,
    speedConfigured: false  // Si se llamó a SetSpeedBySelector
  };

  // Estado de los 4 motores de STBoard V2
  this.motors = {
    A1: { index: 0, configured: false, enabled: false, side: 'NONE', speed: null, inverted: false },
    A2: { index: 1, configured: false, enabled: false, side: 'NONE', speed: null, inverted: false },
    B3: { index: 2, configured: false, enabled: false, side: 'NONE', speed: null, inverted: false },
    B4: { index: 3, configured: false, enabled: false, side: 'NONE', speed: null, inverted: false }
  };

  // Mapeo de índice a puerto
  this.indexToPort = ['A1', 'A2', 'B3', 'B4'];

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES DE VERIFICACIÓN DE PUERTOS GEARSBOT
  // ═══════════════════════════════════════════════════════════════════════════

  // Obtener el puerto de la rueda izquierda de GearsBot
  // Prioridad: 1) pinConfiguration (panel de sensores) 2) robot.options 3) default
  this.getGearsLeftPort = function() {
    // Primero verificar si hay configuración en el panel de sensores
    if (typeof simPanel !== 'undefined' && simPanel.pinConfiguration &&
        simPanel.pinConfiguration.components &&
        simPanel.pinConfiguration.components['motor_left'] &&
        simPanel.pinConfiguration.components['motor_left'].pins) {
      return simPanel.pinConfiguration.components['motor_left'].pins.port || 'A1';
    }

    // Fallback a robot.options
    if (robot && robot.options) {
      return robot.options.wheelLeftPort || 'A1';
    }

    return 'A1';
  };

  // Obtener el puerto de la rueda derecha de GearsBot
  this.getGearsRightPort = function() {
    // Primero verificar si hay configuración en el panel de sensores
    if (typeof simPanel !== 'undefined' && simPanel.pinConfiguration &&
        simPanel.pinConfiguration.components &&
        simPanel.pinConfiguration.components['motor_right'] &&
        simPanel.pinConfiguration.components['motor_right'].pins) {
      return simPanel.pinConfiguration.components['motor_right'].pins.port || 'A2';
    }

    // Fallback a robot.options
    if (robot && robot.options) {
      return robot.options.wheelRightPort || 'A2';
    }

    return 'A2';
  };

  // Verificar si un puerto STBlock coincide con un puerto GearsBot
  this.portMatchesGears = function(stblockPort, gearsSide) {
    if (gearsSide === 'LEFT') {
      return stblockPort === self.getGearsLeftPort();
    } else if (gearsSide === 'RIGHT') {
      return stblockPort === self.getGearsRightPort();
    }
    return false;
  };

  // Encontrar motor por lado (LEFT o RIGHT)
  this.findMotorBySide = function(side) {
    for (var port in self.motors) {
      var motor = self.motors[port];
      if (motor.configured && motor.enabled && motor.side === side) {
        return port;
      }
    }
    return null;
  };

  // Verificar si hay par de motores MOTION configurado Y que coincidan con GearsBot
  this.hasMotionPair = function() {
    var leftPort = self.findMotorBySide('LEFT');
    var rightPort = self.findMotorBySide('RIGHT');

    if (!leftPort || !rightPort) return false;

    // Verificar que los puertos coincidan con GearsBot
    var gearsLeft = self.getGearsLeftPort();
    var gearsRight = self.getGearsRightPort();

    return leftPort === gearsLeft && rightPort === gearsRight;
  };

  // Verificar si el motor está en el grupo MOTION
  this.motorInMotionGroup = function(port) {
    var motor = self.motors[port];
    return motor && motor.configured && motor.enabled &&
           (motor.side === 'LEFT' || motor.side === 'RIGHT');
  };

  // Obtener motores que coinciden con un selector Y con GearsBot
  this.getMotorsForSelector = function(selector) {
    var result = [];
    var gearsLeft = self.getGearsLeftPort();
    var gearsRight = self.getGearsRightPort();

    if (selector === 'MOTION') {
      // Solo motores que están configurados como LEFT/RIGHT Y coinciden con GearsBot
      for (var port in self.motors) {
        var motor = self.motors[port];
        if (motor.configured && motor.enabled) {
          if (motor.side === 'LEFT' && port === gearsLeft) {
            result.push({ port: port, gearsWheel: 'left', motor: motor });
          } else if (motor.side === 'RIGHT' && port === gearsRight) {
            result.push({ port: port, gearsWheel: 'right', motor: motor });
          }
        }
      }
    } else if (selector === 'ALL') {
      // Todos los motores configurados que coincidan con GearsBot
      for (var port in self.motors) {
        var motor = self.motors[port];
        if (motor.configured && motor.enabled) {
          if (port === gearsLeft) {
            result.push({ port: port, gearsWheel: 'left', motor: motor });
          } else if (port === gearsRight) {
            result.push({ port: port, gearsWheel: 'right', motor: motor });
          }
        }
      }
    } else if (self.motors[selector]) {
      // Motor específico
      var motor = self.motors[selector];
      if (motor.configured && motor.enabled) {
        if (selector === gearsLeft) {
          result.push({ port: selector, gearsWheel: 'left', motor: motor });
        } else if (selector === gearsRight) {
          result.push({ port: selector, gearsWheel: 'right', motor: motor });
        }
      }
    }

    return result;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN PRINCIPAL: Interpretar y ejecutar código C++
  // ═══════════════════════════════════════════════════════════════════════════

  this.run = function(cppCode) {
    console.log('[STBlock] ═══════════════════════════════════════════');
    console.log('[STBlock] Iniciando interpretación de código C++');
    console.log('[STBlock] ═══════════════════════════════════════════');

    // Detectar tipo de código
    var isArduino = self.isArduinoCode(cppCode);
    console.log('[STBlock] Tipo de código: ' + (isArduino ? 'Arduino' : 'STBoard V2'));

    // Resetear estado
    self.running = true;
    self._debugShown = false; // Reset debug flag
    self.paused = false;
    self.resetMotorState();
    self.resetArduinoPins();  // También resetear pines Arduino
    self.resetVariables();    // Resetear variables y funciones

    // Extraer y registrar funciones personalizadas antes de ejecutar
    self.extractCustomFunctions(cppCode);

    // Mostrar configuración de GearsBot
    var gearsLeft = self.getGearsLeftPort();
    var gearsRight = self.getGearsRightPort();
    console.log('[STBlock] GearsBot config: LEFT=' + gearsLeft + ', RIGHT=' + gearsRight);

    // Debug: mostrar de dónde vienen los puertos/pines
    if (typeof simPanel !== 'undefined' && simPanel.pinConfiguration) {
      console.log('[STBlock] Fuente: Panel de sensores (pinConfiguration)');
      if (simPanel.pinConfiguration.components) {
        var leftComp = simPanel.pinConfiguration.components['motor_left'];
        var rightComp = simPanel.pinConfiguration.components['motor_right'];
        console.log('[STBlock] motor_left pins:', leftComp ? JSON.stringify(leftComp.pins) : 'no definido');
        console.log('[STBlock] motor_right pins:', rightComp ? JSON.stringify(rightComp.pins) : 'no definido');

        // Si es Arduino, mostrar configuración de pines H-bridge
        if (isArduino) {
          console.log('[Arduino] ═══════════════════════════════════════════');
          console.log('[Arduino] Configuración de pines H-bridge:');
          if (leftComp && leftComp.pins) {
            console.log('[Arduino] Motor Izquierdo: DIR1=' + leftComp.pins.dir1 + ', DIR2=' + leftComp.pins.dir2 + ', PWM=' + leftComp.pins.pwm);
          }
          if (rightComp && rightComp.pins) {
            console.log('[Arduino] Motor Derecho: DIR1=' + rightComp.pins.dir1 + ', DIR2=' + rightComp.pins.dir2 + ', PWM=' + rightComp.pins.pwm);
          }
          console.log('[Arduino] ═══════════════════════════════════════════');
        }
      }
    } else {
      console.log('[STBlock] Fuente: robot.options (valores por defecto)');
    }

    // Extraer el código del setup() y loop()
    var setupCode = self.extractFunction(cppCode, 'setup');
    var loopCode = self.extractFunction(cppCode, 'loop');

    console.log('[STBlock] Setup:', setupCode ? 'encontrado' : 'vacío');
    console.log('[STBlock] Loop:', loopCode ? 'encontrado' : 'vacío');

    // Ejecutar setup
    if (setupCode) {
      console.log('[STBlock] --- Ejecutando setup() ---');
      self.executeBlock(setupCode);
    }

    // Mostrar estado de motores después del setup
    self.logMotorState();

    // Ejecutar loop continuamente con soporte para delays
    if (loopCode && self.running) {
      console.log('[STBlock] --- Iniciando loop() continuo ---');
      self.loopCode = loopCode;
      self.loopIterations = 0;
      self.loopRunning = true;

      // Iniciar primera iteración
      self.executeLoopIteration();
    } else {
      console.log('[STBlock] ═══════════════════════════════════════════');
      console.log('[STBlock] Ejecución completada (sin loop)');
    }
  };

  // Ejecutar una iteración del loop con callback
  this.executeLoopIteration = function() {
    if (!self.running || !self.loopCode || !self.loopRunning) {
      self.stopLoop();
      return;
    }

    if (self.loopIterations >= self.maxLoopIterations) {
      console.log('[STBlock] ⚠️ Loop alcanzó máximo de iteraciones');
      self.stopLoop();
      return;
    }

    self.loopIterations++;

    // En la primera iteración, mostrar el código del loop para debug
    if (self.loopIterations === 1) {
      console.log('[STBlock] Código del loop:');
      console.log(self.loopCode.substring(0, 500)); // Primeros 500 chars

      // Mostrar statements parseados del loop
      var loopStatements = self.parseStatements(self.loopCode);
      console.log('[STBlock] Loop statements parseados:', loopStatements.length);
      for (var k = 0; k < loopStatements.length; k++) {
        console.log('[STBlock] Loop stmt #' + k + ':', loopStatements[k].substring(0, 150));
      }
    }

    // Solo log cada 50 iteraciones para no llenar la consola
    if (self.loopIterations % 50 === 1) {
      console.log('[STBlock] Loop iteración #' + self.loopIterations);
    }

    // Ejecutar el cuerpo del loop con callback para saber cuándo termina
    var loopStatements = self.parseStatements(self.loopCode);
    self.executeLoopBodyWithCallback(loopStatements, 0, function() {
      // Cuando termine esta iteración, programar la siguiente
      if (self.running && self.loopRunning) {
        setTimeout(function() {
          self.executeLoopIteration();
        }, 10); // Pequeña pausa entre iteraciones
      }
    });
  };

  // Ejecutar cuerpo del loop con callback para cuando termine
  this.executeLoopBodyWithCallback = function(statements, index, onComplete) {
    if (!self.running || !self.loopRunning || index >= statements.length) {
      if (onComplete) onComplete();
      return;
    }

    var stmt = statements[index].trim();
    if (stmt.length === 0) {
      self.executeLoopBodyWithCallback(statements, index + 1, onComplete);
      return;
    }

    // Si es un while, manejar de forma especial
    if (stmt.startsWith('while')) {
      // Guardar callback para cuando el while termine
      self.onWhileComplete = function() {
        self.executeLoopBodyWithCallback(statements, index + 1, onComplete);
      };
      self.executeStatement(stmt);
      return;
    }

    // Detectar delay
    var delayMatch = stmt.match(/delay\s*\(\s*(\d+)\s*\)/);
    var safeDelayMatch = stmt.match(/stbV2SafeDelay\s*\(\s*(\d+)\s*\)/);

    if (delayMatch || safeDelayMatch) {
      var delayMs = parseInt(delayMatch ? delayMatch[1] : safeDelayMatch[1]);
      console.log('[STBlock] ⏱️ Delay ' + delayMs + 'ms en loop');

      setTimeout(function() {
        if (self.running && self.loopRunning) {
          console.log('[STBlock] ⏱️ Delay completado');
          self.executeLoopBodyWithCallback(statements, index + 1, onComplete);
        }
      }, delayMs);
      return;
    }

    // Ejecutar statement normal
    self.executeStatement(stmt);

    // Continuar con el siguiente statement
    self.executeLoopBodyWithCallback(statements, index + 1, onComplete);
  };

  // Detener el loop
  this.stopLoop = function() {
    self.loopRunning = false;
    if (self.loopInterval) {
      clearInterval(self.loopInterval);
      self.loopInterval = null;
    }
    self.loopCode = null;
    console.log('[STBlock] ═══════════════════════════════════════════');
    console.log('[STBlock] Loop detenido después de ' + self.loopIterations + ' iteraciones');
  };

  // Resetear estado de motores
  this.resetMotorState = function() {
    self.config.initialized = false;
    self.config.speedConfigured = false;
    for (var port in self.motors) {
      self.motors[port].configured = false;
      self.motors[port].enabled = false;
      self.motors[port].side = 'NONE';
      self.motors[port].speed = null;  // null = no configurado
      self.motors[port].inverted = false;
    }
  };

  // Log del estado de motores
  this.logMotorState = function() {
    var gearsLeft = self.getGearsLeftPort();
    var gearsRight = self.getGearsRightPort();

    console.log('[STBlock] Estado de motores STBlock:');
    for (var port in self.motors) {
      var m = self.motors[port];
      if (m.configured) {
        var match = '';
        if (port === gearsLeft) match = ' [=GearsBot LEFT]';
        else if (port === gearsRight) match = ' [=GearsBot RIGHT]';
        else match = ' [NO MATCH]';

        var speedStr = m.speed !== null ? m.speed + '%' : 'NO DEFINIDA';
        console.log('  ' + port + ': ' + m.side + ' (vel=' + speedStr + ')' + match);
      }
    }

    var leftPort = self.findMotorBySide('LEFT');
    var rightPort = self.findMotorBySide('RIGHT');
    var motionOk = self.hasMotionPair();
    console.log('[STBlock] MOTION pair: LEFT=' + (leftPort || 'NONE') + ', RIGHT=' + (rightPort || 'NONE'));
    console.log('[STBlock] MOTION válido: ' + (motionOk ? 'SÍ' : 'NO - puertos no coinciden con GearsBot'));
  };

  // Extraer contenido de una función
  this.extractFunction = function(code, funcName) {
    var regex = new RegExp('void\\s+' + funcName + '\\s*\\(\\s*\\)\\s*\\{', 'g');
    var match = regex.exec(code);
    if (!match) return null;

    var startIndex = match.index + match[0].length;
    var braceCount = 1;
    var endIndex = startIndex;

    while (braceCount > 0 && endIndex < code.length) {
      if (code[endIndex] === '{') braceCount++;
      else if (code[endIndex] === '}') braceCount--;
      endIndex++;
    }

    return code.substring(startIndex, endIndex - 1).trim();
  };

  // Ejecutar un bloque de código
  this.executeBlock = function(code) {
    var statements = self.parseStatements(code);

    // Debug: mostrar statements parseados (solo primera vez)
    if (!self._debugShown) {
      self._debugShown = true;
      console.log('[STBlock] Statements parseados:', statements.length);
      for (var j = 0; j < statements.length; j++) {
        console.log('[STBlock] Statement #' + j + ':', statements[j].substring(0, 100));
      }
    }

    // Ejecutar statements secuencialmente con soporte para delays
    self.executeStatementsSequentially(statements, 0);
  };

  // Ejecutar statements de forma secuencial con soporte para delays asíncronos
  this.executeStatementsSequentially = function(statements, index) {
    if (!self.running || index >= statements.length) {
      return;
    }

    var stmt = statements[index].trim();
    if (stmt.length === 0) {
      // Statement vacío, siguiente
      self.executeStatementsSequentially(statements, index + 1);
      return;
    }

    // Si es un while, guardar los statements restantes para ejecutar después
    if (stmt.startsWith('while')) {
      self.pendingStatements = statements.slice(index + 1);
      self.executeStatement(stmt);
      return; // El while asíncrono ejecutará los pendientes cuando termine
    }

    // Detectar delay
    var delayMatch = stmt.match(/delay\s*\(\s*(\d+)\s*\)/);
    var safeDelayMatch = stmt.match(/stbV2SafeDelay\s*\(\s*(\d+)\s*\)/);

    if (delayMatch || safeDelayMatch) {
      var delayMs = parseInt(delayMatch ? delayMatch[1] : safeDelayMatch[1]);
      console.log('[STBlock] ⏱️ Delay ' + delayMs + 'ms - pausando ejecución');

      // Programar continuación después del delay
      setTimeout(function() {
        if (self.running) {
          console.log('[STBlock] ⏱️ Delay completado - continuando ejecución');
          self.executeStatementsSequentially(statements, index + 1);
        }
      }, delayMs);
      return; // No continuar, setTimeout lo hará
    }

    // Ejecutar statement normal
    self.executeStatement(stmt);

    // Continuar con el siguiente statement
    self.executeStatementsSequentially(statements, index + 1);
  };

  // Parsear statements
  this.parseStatements = function(code) {
    var statements = [];
    var current = '';
    var braceCount = 0;

    for (var i = 0; i < code.length; i++) {
      var char = code[i];

      if (char === '{') {
        braceCount++;
        current += char;
      } else if (char === '}') {
        braceCount--;
        current += char;
        // Cuando braceCount vuelve a 0 después de }, es fin de bloque (while/if/for)
        if (braceCount === 0 && current.trim()) {
          statements.push(current.trim());
          current = '';
        }
      } else if (char === ';' && braceCount === 0) {
        statements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EJECUTAR STATEMENT INDIVIDUAL
  // ═══════════════════════════════════════════════════════════════════════════

  this.executeStatement = function(stmt) {
    // Debug: mostrar statement si es del loop y es un if
    if (stmt.startsWith('if')) {
      console.log('[STBlock] >>> Procesando IF:', stmt.substring(0, 100));
    }

    if (stmt.startsWith('//')) return;

    var commentIdx = stmt.indexOf('//');
    if (commentIdx > 0) {
      stmt = stmt.substring(0, commentIdx).trim();
    }

    // ═══ FILTRAR CÓDIGO C++ INTERNO ═══
    // Saltar statements que contienen sintaxis C++ que no podemos evaluar
    if (stmt.includes('static_cast') ||
        stmt.includes('0UL') ||
        stmt.includes('0.0f') ||
        stmt.includes('fabsf(') ||
        stmt.includes('millis()') ||
        stmt.includes('micros()') ||
        stmt.includes('sizeof(') ||
        stmt.includes('nullptr') ||
        stmt.includes('::') ||
        stmt.includes('->') ||
        stmt.includes('constexpr') ||
        stmt.includes('volatile') ||
        stmt.includes('uint8_t') ||
        stmt.includes('uint16_t') ||
        stmt.includes('uint32_t') ||
        stmt.includes('int8_t') ||
        stmt.includes('int16_t') ||
        stmt.includes('int32_t')) {
      return; // Ignorar sintaxis C++ avanzada
    }

    // Ignorar declaraciones de funciones internas (sin ejecutarlas)
    if (stmt.match(/^(static\s+)?(void|int|float|bool|char)\s+stb[V2_]/i)) {
      return;
    }

    // ═══ ESTRUCTURAS DE CONTROL (ANTES de los handlers de funciones) ═══
    // Es crítico verificar esto PRIMERO porque un if/while/for puede CONTENER
    // llamadas a funciones como stbV2StopBySelector dentro de su cuerpo
    if (stmt.startsWith('while')) {
      return self.handleWhile(stmt);
    }

    if (stmt.startsWith('for')) {
      return self.handleFor(stmt);
    }

    if (stmt.startsWith('if')) {
      return self.handleIfElse(stmt);
    }

    // ═══ FUNCIONES ARDUINO ═══
    if (stmt.includes('pinMode(')) {
      return self.handlePinMode(stmt);
    }

    if (stmt.includes('digitalWrite(')) {
      return self.handleDigitalWrite(stmt);
    }

    if (stmt.includes('analogWrite(')) {
      return self.handleAnalogWrite(stmt);
    }

    // ═══ SERIAL ARDUINO ═══
    if (stmt.includes('Serial.begin(')) {
      return self.handleSerialBegin(stmt);
    }

    if (stmt.includes('Serial.println(')) {
      return self.handleSerialPrintln(stmt);
    }

    if (stmt.includes('Serial.print(')) {
      return self.handleSerialPrint(stmt);
    }

    // ═══ CONFIGURACIÓN ═══
    if (stmt.includes('stbV2SetBoardDefaults(')) {
      return self.handleSetBoardDefaults(stmt);
    }

    if (stmt.includes('stbV2ConfigureMotor(')) {
      return self.handleConfigureMotor(stmt);
    }

    if (stmt.includes('stbV2SetDirection(')) {
      return self.handleSetDirection(stmt);
    }

    if (stmt.includes('stbV2SetSpeedBySelector(')) {
      return self.handleSetSpeed(stmt);
    }

    // ═══ MOVIMIENTO CONTINUO ═══
    if (stmt.includes('stbV2MoveBySelector(')) {
      return self.handleMoveBySelector(stmt);
    }

    if (stmt.includes('stbV2ReverseBySelector(')) {
      return self.handleReverseBySelector(stmt);
    }

    if (stmt.includes('stbV2StopBySelector(')) {
      return self.handleStopBySelector(stmt);
    }

    // ═══ MOVIMIENTO POR DISTANCIA ═══
    if (stmt.includes('stbV2MoveDistanceBlocking(')) {
      return self.handleMoveDistanceBlocking(stmt);
    }

    if (stmt.includes('stbV2MoveDistanceBySelector(')) {
      return self.handleMoveDistanceBySelector(stmt);
    }

    // ═══ MOVIMIENTO POR TIEMPO ═══
    if (stmt.includes('stbV2MoveForDurationBlocking(')) {
      return self.handleMoveForDurationBlocking(stmt);
    }

    if (stmt.includes('stbV2MoveForDurationUsingStoredSpeedBlocking(')) {
      return self.handleMoveForDurationStoredBlocking(stmt);
    }

    if (stmt.includes('stbV2MoveForDurationUsingStoredSpeedAsync(')) {
      return self.handleMoveForDurationStoredAsync(stmt);
    }

    // ═══ GIROS ═══
    if (stmt.includes('stbV2TurnByAmount(')) {
      return self.handleTurnByAmount(stmt);
    }

    if (stmt.includes('stbV2TurnContinuous(')) {
      return self.handleTurnContinuous(stmt);
    }

    // ═══ GIROSCOPIO ═══
    // stbV2ConfigureGyro(String("AXIS"), inverted)
    var configGyroMatch = stmt.match(/stbV2ConfigureGyro\s*\(\s*String\s*\(\s*["'](\w)["']\s*\)\s*,\s*(true|false)\s*\)/);
    if (configGyroMatch) {
      var axis = configGyroMatch[1];
      var inverted = configGyroMatch[2] === 'true';
      self.configureGyro(axis, inverted);
      return;
    }

    // stbV2CalibrateGyro()
    if (stmt.includes('stbV2CalibrateGyro()')) {
      self.calibrateGyro();
      return;
    }

    // stbV2CalibrateGyroPosture()
    if (stmt.includes('stbV2CalibrateGyroPosture()')) {
      self.calibrateGyro(); // Mismo efecto en simulador
      return;
    }

    // stbV2ResetGyroAngle()
    if (stmt.includes('stbV2ResetGyroAngle()')) {
      self.resetGyroAngle();
      return;
    }

    // stbV2UpdateGyro() - actualizar lecturas (no-op en simulador)
    if (stmt.includes('stbV2UpdateGyro()')) {
      // En el simulador, el giroscopio se actualiza automáticamente
      return;
    }

    // stbV2TurnByGyro(String("SIDE"), degrees, speed)
    var turnGyroMatch = stmt.match(/stbV2TurnByGyro\s*\(\s*String\s*\(\s*["'](\w+)["']\s*\)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
    if (turnGyroMatch) {
      var side = turnGyroMatch[1];
      var degrees = parseFloat(turnGyroMatch[2]);
      var speed = parseFloat(turnGyroMatch[3]) || 50;
      return self.turnByGyro(side, degrees, speed);
    }

    // ═══ CONTROL ═══
    if (stmt.includes('stbV2ResetDistanceBySelector(')) {
      return;
    }

    if (stmt.includes('delay(')) {
      return self.handleDelay(stmt);
    }

    if (stmt.includes('stbV2SafeDelay(')) {
      return self.handleDelay(stmt.replace('stbV2SafeDelay', 'delay'));
    }

    // ═══ VARIABLES ═══
    // Declaración con inicialización: int x = 5;
    var declMatch = stmt.match(/^(int|float|double|bool|boolean|String|char|long|byte)\s+(\w+)\s*=\s*(.+)$/);
    if (declMatch) {
      return self.handleVariableDeclaration(declMatch[1], declMatch[2], declMatch[3]);
    }

    // Declaración sin inicialización: int x;
    var declOnlyMatch = stmt.match(/^(int|float|double|bool|boolean|String|char|long|byte)\s+(\w+)\s*$/);
    if (declOnlyMatch) {
      return self.handleVariableDeclaration(declOnlyMatch[1], declOnlyMatch[2], null);
    }

    // Asignación: x = 5;
    var assignMatch = stmt.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch && !self.isDataType(assignMatch[1])) {
      return self.handleAssignment(assignMatch[1], assignMatch[2]);
    }

    // Incremento/Decremento: x++, x--, ++x, --x
    var incrMatch = stmt.match(/^(\w+)\s*\+\+$/) || stmt.match(/^\+\+\s*(\w+)$/);
    if (incrMatch) {
      var varName = incrMatch[1];
      self.setVariable(varName, self.getVariable(varName) + 1);
      return;
    }

    var decrMatch = stmt.match(/^(\w+)\s*--$/) || stmt.match(/^--\s*(\w+)$/);
    if (decrMatch) {
      var varName = decrMatch[1];
      self.setVariable(varName, self.getVariable(varName) - 1);
      return;
    }

    // Operadores compuestos: x += 5, x -= 3, etc.
    var compoundMatch = stmt.match(/^(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
    if (compoundMatch) {
      return self.handleCompoundAssignment(compoundMatch[1], compoundMatch[2], compoundMatch[3]);
    }

    // ═══ LLAMADA A FUNCIÓN PERSONALIZADA ═══
    var funcCallMatch = stmt.match(/^(\w+)\s*\(\s*(.*)\s*\)$/);
    if (funcCallMatch && self.functions[funcCallMatch[1]]) {
      return self.callFunction(funcCallMatch[1], funcCallMatch[2]);
    }

    // repeat() - en el simulador no hace nada especial
    if (stmt.includes('repeat()')) {
      return;
    }

    // Runtime (ignorar)
    if (stmt.includes('stbV2RuntimeTick()') ||
        stmt.includes('stbV2InitRuntime()') ||
        stmt.includes('stbV2SetMotionControlMode(') ||
        stmt.includes('stbV2WaitForSelectorIdle(')) {
      return;
    }

    // Catch-all: ignorar cualquier otra función stbV2* que no tengamos handler específico
    if (stmt.match(/stbV2\w+\s*\(/)) {
      return;
    }

    // Ignorar también funciones stb_ y STB_
    if (stmt.match(/stb_\w+\s*\(/) || stmt.match(/STB_\w+\s*\(/)) {
      return;
    }

    // Si llegamos aquí, intentar evaluar como expresión (por si es llamada a función sin usar resultado)
    if (stmt.length > 0 && !stmt.startsWith('#')) {
      // Ignorar includes y otras directivas de preprocesador
      if (!stmt.startsWith('#') && !stmt.startsWith('//')) {
        // console.log('[STBlock] Statement no reconocido:', stmt.substring(0, 60));
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE ESTRUCTURAS DE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleWhile = function(stmt) {
    console.log('[STBlock] >>> handleWhile recibió:', stmt.substring(0, 200));

    // while (!(condición)) { cuerpo }
    // Extraer condición y cuerpo
    var match = stmt.match(/while\s*\(\s*!\s*\(\s*(.+?)\s*\)\s*\)\s*\{([\s\S]*)\}/);
    if (!match) {
      // Intentar formato while (condición) { }
      match = stmt.match(/while\s*\(\s*(.+?)\s*\)\s*\{([\s\S]*)\}/);
      if (!match) {
        console.log('[STBlock] ⚠️ No se pudo parsear while:', stmt.substring(0, 100));
        return;
      }
      var condition = match[1];
      var body = match[2];
      var negated = false;
    } else {
      var condition = match[1];
      var body = match[2];
      var negated = true; // while (!(cond)) significa "mientras NO se cumpla"
    }

    console.log('[STBlock] While parseado: condición="' + condition + '", negada=' + negated);
    console.log('[STBlock] While cuerpo:', body.substring(0, 100));

    // Guardar el estado del while para ejecución asíncrona
    self.activeWhile = {
      condition: condition,
      body: body,
      negated: negated,
      iterations: 0,
      maxIterations: 10000
    };

    // Iniciar ejecución asíncrona del while
    self.runWhileAsync();
  };

  // Ejecutar while de forma asíncrona (permite que el simulador actualice y delays funcionen)
  this.runWhileAsync = function() {
    if (!self.activeWhile || !self.running) {
      self.activeWhile = null;
      return;
    }

    var w = self.activeWhile;

    // Verificar límite de iteraciones
    if (w.iterations >= w.maxIterations) {
      console.log('[STBlock] ⚠️ While alcanzó máximo de iteraciones');
      self.activeWhile = null;

      // Si hay callback, llamarlo
      if (self.onWhileComplete) {
        var callback = self.onWhileComplete;
        self.onWhileComplete = null;
        callback();
      }
      return;
    }

    // Evaluar condición
    var condResult = self.evaluateCondition(w.condition);
    var shouldContinue = w.negated ? !condResult : condResult;

    // Log cada 50 iteraciones
    if (w.iterations % 50 === 0) {
      console.log('[STBlock] While async iter #' + w.iterations + ': cond=' + condResult + ', continue=' + shouldContinue);
    }

    if (!shouldContinue) {
      console.log('[STBlock] While terminado en iteración #' + w.iterations + ': condición cumplida');
      self.activeWhile = null;

      // Si hay un callback de completado del while (desde loop), llamarlo
      if (self.onWhileComplete) {
        var callback = self.onWhileComplete;
        self.onWhileComplete = null;
        callback();
        return;
      }

      // Ejecutar statements pendientes que estaban después del while
      if (self.pendingStatements && self.pendingStatements.length > 0) {
        console.log('[STBlock] Ejecutando ' + self.pendingStatements.length + ' statements pendientes después del while');
        self.executeStatementsSequentially(self.pendingStatements, 0);
        self.pendingStatements = null;
      }
      return;
    }

    // Ejecutar cuerpo del while con soporte para delays
    var bodyStatements = self.parseStatements(w.body);
    w.iterations++;

    // Ejecutar el cuerpo y esperar a que termine (incluyendo delays)
    self.executeWhileBodyWithCallback(bodyStatements, 0, function() {
      // Cuando el cuerpo termine, programar siguiente iteración
      if (self.running && self.activeWhile) {
        setTimeout(function() {
          self.runWhileAsync();
        }, 10); // Pequeña pausa para dar tiempo al simulador
      }
    });
  };

  // Ejecutar cuerpo del while con callback para cuando termine
  this.executeWhileBodyWithCallback = function(statements, index, onComplete) {
    if (!self.running || index >= statements.length) {
      // Cuerpo completado
      if (onComplete) onComplete();
      return;
    }

    var stmt = statements[index].trim();
    if (stmt.length === 0) {
      self.executeWhileBodyWithCallback(statements, index + 1, onComplete);
      return;
    }

    // Detectar delay
    var delayMatch = stmt.match(/delay\s*\(\s*(\d+)\s*\)/);
    var safeDelayMatch = stmt.match(/stbV2SafeDelay\s*\(\s*(\d+)\s*\)/);

    if (delayMatch || safeDelayMatch) {
      var delayMs = parseInt(delayMatch ? delayMatch[1] : safeDelayMatch[1]);
      console.log('[STBlock] ⏱️ Delay ' + delayMs + 'ms en while');

      setTimeout(function() {
        if (self.running) {
          console.log('[STBlock] ⏱️ Delay completado');
          self.executeWhileBodyWithCallback(statements, index + 1, onComplete);
        }
      }, delayMs);
      return;
    }

    // Ejecutar statement normal
    self.executeStatement(stmt);

    // Continuar con el siguiente
    self.executeWhileBodyWithCallback(statements, index + 1, onComplete);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER IF/ELSE COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleIfElse = function(stmt) {
    console.log('[STBlock] handleIfElse recibió:', stmt.substring(0, 200));
    // Parsear if/else if/else completo
    var branches = self.parseIfElseBranches(stmt);
    console.log('[STBlock] Branches parseadas:', branches.length);

    for (var i = 0; i < branches.length; i++) {
      var branch = branches[i];

      if (branch.type === 'if' || branch.type === 'else if') {
        var condResult = self.evaluateCondition(branch.condition);
        console.log('[STBlock] ' + branch.type + ': ' + branch.condition + ' = ' + condResult);

        if (condResult) {
          self.executeBlock(branch.body);
          return; // Solo ejecutar una rama
        }
      } else if (branch.type === 'else') {
        console.log('[STBlock] else: ejecutando');
        self.executeBlock(branch.body);
        return;
      }
    }
  };

  // Parsear ramas if/else if/else
  this.parseIfElseBranches = function(stmt) {
    var branches = [];
    var remaining = stmt;

    // Primera rama: if
    var ifMatch = remaining.match(/^if\s*\(\s*(.+?)\s*\)\s*\{/);
    if (!ifMatch) return branches;

    var condition = ifMatch[1];
    var bodyStart = ifMatch.index + ifMatch[0].length;
    var bodyEnd = self.findMatchingBrace(remaining, bodyStart - 1);
    var body = remaining.substring(bodyStart, bodyEnd);

    branches.push({ type: 'if', condition: condition, body: body });
    remaining = remaining.substring(bodyEnd + 1).trim();

    // Buscar else if y else
    while (remaining.length > 0) {
      // else if
      var elseIfMatch = remaining.match(/^else\s+if\s*\(\s*(.+?)\s*\)\s*\{/);
      if (elseIfMatch) {
        condition = elseIfMatch[1];
        bodyStart = elseIfMatch[0].length;
        bodyEnd = self.findMatchingBrace(remaining, bodyStart - 1);
        body = remaining.substring(bodyStart, bodyEnd);

        branches.push({ type: 'else if', condition: condition, body: body });
        remaining = remaining.substring(bodyEnd + 1).trim();
        continue;
      }

      // else
      var elseMatch = remaining.match(/^else\s*\{/);
      if (elseMatch) {
        bodyStart = elseMatch[0].length;
        bodyEnd = self.findMatchingBrace(remaining, bodyStart - 1);
        body = remaining.substring(bodyStart, bodyEnd);

        branches.push({ type: 'else', condition: null, body: body });
        break;
      }

      break;
    }

    return branches;
  };

  // Encontrar llave de cierre correspondiente
  this.findMatchingBrace = function(str, startIdx) {
    var braceCount = 1;
    var i = startIdx + 1;

    while (braceCount > 0 && i < str.length) {
      if (str[i] === '{') braceCount++;
      else if (str[i] === '}') braceCount--;
      i++;
    }

    return i - 1;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER FOR LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleFor = function(stmt) {
    // for (init; condition; increment) { body }
    var match = stmt.match(/for\s*\(\s*(.+?)\s*;\s*(.+?)\s*;\s*(.+?)\s*\)\s*\{([\s\S]*)\}$/);
    if (!match) {
      console.log('[STBlock] ⚠️ No se pudo parsear for:', stmt.substring(0, 50));
      return;
    }

    var init = match[1].trim();
    var condition = match[2].trim();
    var increment = match[3].trim();
    var body = match[4];

    console.log('[STBlock] For: init=' + init + ', cond=' + condition + ', incr=' + increment);

    // Ejecutar inicialización
    self.executeStatement(init);

    // Guardar estado del for para ejecución asíncrona
    self.activeFor = {
      condition: condition,
      increment: increment,
      body: body,
      maxIterations: 10000,
      iterations: 0
    };

    // Iniciar ejecución asíncrona
    self.runForAsync();
  };

  // Ejecutar for de forma asíncrona
  this.runForAsync = function() {
    if (!self.activeFor || !self.running) {
      self.activeFor = null;
      return;
    }

    var f = self.activeFor;

    // Verificar límite de iteraciones
    if (f.iterations >= f.maxIterations) {
      console.log('[STBlock] ⚠️ For alcanzó máximo de iteraciones');
      self.activeFor = null;
      return;
    }

    // Evaluar condición
    var condResult = self.evaluateCondition(f.condition);
    if (!condResult) {
      console.log('[STBlock] For terminado en iteración #' + f.iterations);
      self.activeFor = null;
      return;
    }

    // Ejecutar cuerpo del for con soporte para delays
    var bodyStatements = self.parseStatements(f.body);
    f.iterations++;

    self.executeForBodyWithCallback(bodyStatements, 0, function() {
      // Cuando el cuerpo termine, ejecutar incremento y programar siguiente iteración
      if (self.running && self.activeFor) {
        self.executeStatement(f.increment);
        setTimeout(function() {
          self.runForAsync();
        }, 10);
      }
    });
  };

  // Ejecutar cuerpo del for con callback
  this.executeForBodyWithCallback = function(statements, index, onComplete) {
    if (!self.running || index >= statements.length) {
      if (onComplete) onComplete();
      return;
    }

    var stmt = statements[index].trim();
    if (stmt.length === 0) {
      self.executeForBodyWithCallback(statements, index + 1, onComplete);
      return;
    }

    // Detectar delay
    var delayMatch = stmt.match(/delay\s*\(\s*(\d+)\s*\)/);
    var safeDelayMatch = stmt.match(/stbV2SafeDelay\s*\(\s*(\d+)\s*\)/);

    if (delayMatch || safeDelayMatch) {
      var delayMs = parseInt(delayMatch ? delayMatch[1] : safeDelayMatch[1]);
      console.log('[STBlock] ⏱️ Delay ' + delayMs + 'ms en for');

      setTimeout(function() {
        if (self.running) {
          self.executeForBodyWithCallback(statements, index + 1, onComplete);
        }
      }, delayMs);
      return;
    }

    // Ejecutar statement normal
    self.executeStatement(stmt);
    self.executeForBodyWithCallback(statements, index + 1, onComplete);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE VARIABLES
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleVariableDeclaration = function(type, name, valueExpr) {
    var value;

    if (valueExpr === null) {
      // Sin inicialización - valor por defecto
      switch (type) {
        case 'int':
        case 'long':
        case 'byte':
        case 'short':
          value = 0;
          break;
        case 'float':
        case 'double':
          value = 0.0;
          break;
        case 'bool':
        case 'boolean':
          value = false;
          break;
        case 'String':
        case 'char':
          value = '';
          break;
        default:
          value = 0;
      }
    } else {
      value = self.evaluateExpression(valueExpr);
    }

    self.setVariable(name, value);
    console.log('[STBlock] Variable: ' + type + ' ' + name + ' = ' + value);
  };

  this.handleAssignment = function(name, valueExpr) {
    var value = self.evaluateExpression(valueExpr);
    self.setVariable(name, value);
  };

  this.handleCompoundAssignment = function(name, operator, valueExpr) {
    var currentValue = self.getVariable(name);
    var operand = self.evaluateExpression(valueExpr);

    switch (operator) {
      case '+=':
        self.setVariable(name, currentValue + operand);
        break;
      case '-=':
        self.setVariable(name, currentValue - operand);
        break;
      case '*=':
        self.setVariable(name, currentValue * operand);
        break;
      case '/=':
        self.setVariable(name, currentValue / operand);
        break;
      case '%=':
        self.setVariable(name, currentValue % operand);
        break;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EVALUADOR DE EXPRESIONES
  // ═══════════════════════════════════════════════════════════════════════════

  this.evaluateExpression = function(expr) {
    if (expr === undefined || expr === null) return 0;

    expr = expr.trim();

    // Booleanos
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Cadena de texto
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Número
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return parseFloat(expr);
    }

    // Variable simple
    if (/^\w+$/.test(expr) && self.variables.hasOwnProperty(expr)) {
      return self.getVariable(expr);
    }

    // Llamada a función de sensor
    var sensorValue = self.evaluateSensorExpression(expr);
    if (sensorValue !== null) {
      return sensorValue;
    }

    // Expresión matemática
    return self.evaluateMathExpression(expr);
  };

  // Evaluar expresión matemática
  this.evaluateMathExpression = function(expr) {
    // Detectar sintaxis C++ que no podemos evaluar - retornar 0 silenciosamente
    if (expr.includes('static_cast') ||
        expr.includes('0UL') ||
        expr.includes('0.0f') ||
        expr.includes('fabsf') ||
        expr.includes('millis()') ||
        expr.includes('micros()') ||
        expr.includes('sizeof') ||
        expr.includes('nullptr') ||
        expr.includes('::') ||
        expr.includes('->')) {
      return 0;
    }

    try {
      // Reemplazar variables por sus valores
      var processedExpr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, function(match) {
        // No reemplazar palabras reservadas o funciones conocidas
        if (['true', 'false', 'null', 'undefined', 'Math', 'abs', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'floor', 'ceil', 'round', 'min', 'max', 'random'].includes(match)) {
          return match;
        }
        if (self.variables.hasOwnProperty(match)) {
          return self.variables[match];
        }
        return match;
      });

      // Reemplazar operadores C++ por JavaScript
      processedExpr = processedExpr.replace(/\band\b/g, '&&');
      processedExpr = processedExpr.replace(/\bor\b/g, '||');
      processedExpr = processedExpr.replace(/\bnot\b/g, '!');

      // Evaluar de forma segura
      var result = Function('"use strict"; return (' + processedExpr + ')')();
      return result;
    } catch (e) {
      console.log('[STBlock] ⚠️ Error evaluando expresión:', expr, e.message);
      return 0;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES PERSONALIZADAS
  // ═══════════════════════════════════════════════════════════════════════════

  // Extraer funciones personalizadas del código
  // IMPORTANTE: Solo extraer funciones creadas por el usuario, NO las del runtime interno
  this.extractCustomFunctions = function(code) {
    // Lista de prefijos de funciones internas que NO debemos registrar
    var internalPrefixes = ['stbV2', 'stb_', 'STB_'];

    // Buscar definiciones de funciones: void nombreFuncion() { ... }
    var funcRegex = /void\s+(\w+)\s*\(\s*(.*?)\s*\)\s*\{/g;
    var match;

    while ((match = funcRegex.exec(code)) !== null) {
      var funcName = match[1];

      // Ignorar setup y loop
      if (funcName === 'setup' || funcName === 'loop') continue;

      // Ignorar funciones internas del runtime STBlock
      var isInternal = internalPrefixes.some(function(prefix) {
        return funcName.startsWith(prefix);
      });
      if (isInternal) continue;

      var params = match[2].trim();
      var startIdx = match.index + match[0].length;
      var endIdx = self.findMatchingBraceInCode(code, startIdx - 1);
      var body = code.substring(startIdx, endIdx);

      self.functions[funcName] = {
        params: params ? params.split(',').map(function(p) { return p.trim(); }) : [],
        body: body
      };

      console.log('[STBlock] Función de usuario registrada: ' + funcName + '(' + params + ')');
    }
  };

  // Encontrar llave de cierre en código
  this.findMatchingBraceInCode = function(code, startIdx) {
    var braceCount = 1;
    var i = startIdx + 1;

    while (braceCount > 0 && i < code.length) {
      if (code[i] === '{') braceCount++;
      else if (code[i] === '}') braceCount--;
      i++;
    }

    return i - 1;
  };

  // Llamar función personalizada
  this.callFunction = function(funcName, argsStr) {
    var func = self.functions[funcName];
    if (!func) {
      console.log('[STBlock] ⚠️ Función no encontrada:', funcName);
      return;
    }

    console.log('[STBlock] Llamando función: ' + funcName);

    // Parsear argumentos
    var args = argsStr ? argsStr.split(',').map(function(a) {
      return self.evaluateExpression(a.trim());
    }) : [];

    // Guardar variables actuales (para scope local)
    var savedVars = Object.assign({}, self.variables);

    // Asignar parámetros
    for (var i = 0; i < func.params.length && i < args.length; i++) {
      var paramName = func.params[i].replace(/^(int|float|double|bool|String)\s+/, '');
      self.setVariable(paramName, args[i]);
    }

    // Ejecutar cuerpo de la función
    self.executeBlock(func.body);

    // Restaurar variables (scope)
    self.variables = savedVars;
  };

  // Evaluar condición (soporta sensores, variables y expresiones)
  this.evaluateCondition = function(condition) {
    if (!condition) return false;
    condition = condition.trim();

    // Eliminar paréntesis extra que envuelven toda la condición
    // Ejemplo: ((x < 5)) -> x < 5
    while (condition.startsWith('(') && condition.endsWith(')')) {
      // Verificar que los paréntesis son balanceados y envuelven todo
      var inner = condition.slice(1, -1);
      var parenCount = 0;
      var isWrapped = true;
      for (var i = 0; i < inner.length; i++) {
        if (inner[i] === '(') parenCount++;
        else if (inner[i] === ')') parenCount--;
        if (parenCount < 0) {
          isWrapped = false;
          break;
        }
      }
      if (isWrapped && parenCount === 0) {
        condition = inner.trim();
      } else {
        break;
      }
    }

    // Booleanos directos
    if (condition === 'true') return true;
    if (condition === 'false') return false;

    // Variable booleana
    if (/^\w+$/.test(condition) && self.variables.hasOwnProperty(condition)) {
      return !!self.getVariable(condition);
    }

    // Negación: !condición o !(condición)
    if (condition.startsWith('!')) {
      var innerCond = condition.substring(1).trim();
      if (innerCond.startsWith('(') && innerCond.endsWith(')')) {
        innerCond = innerCond.slice(1, -1);
      }
      return !self.evaluateCondition(innerCond);
    }

    // Operadores lógicos && y ||
    var andParts = self.splitByOperator(condition, '&&');
    if (andParts.length > 1) {
      for (var i = 0; i < andParts.length; i++) {
        if (!self.evaluateCondition(andParts[i])) return false;
      }
      return true;
    }

    var orParts = self.splitByOperator(condition, '||');
    if (orParts.length > 1) {
      for (var i = 0; i < orParts.length; i++) {
        if (self.evaluateCondition(orParts[i])) return true;
      }
      return false;
    }

    // stbV2UltrasonicReadCm(trig, echo) < 40
    // También maneja: ((stbV2UltrasonicReadCm(22, 23) < "50"))
    var ultraCmMatch = condition.match(/stbV2UltrasonicReadCm\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*([<>=!]+)\s*"?(\d+\.?\d*)"?\)?$/);
    if (ultraCmMatch) {
      var echoPin = ultraCmMatch[2];
      var operator = ultraCmMatch[3];
      var thresholdStr = ultraCmMatch[4];
      var threshold = parseFloat(thresholdStr);
      var distance = self.readArduinoUltrasonic(echoPin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[STBlock] Ultrasonic: ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // Formato alternativo con paréntesis extra: ((sensor < "valor"))
    var ultraCmMatch2 = condition.match(/^\(?\s*stbV2UltrasonicReadCm\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*([<>=!]+)\s*"?(\d+\.?\d*)"?\s*\)?$/);
    if (ultraCmMatch2) {
      var echoPin = ultraCmMatch2[2];
      var operator = ultraCmMatch2[3];
      var threshold = parseFloat(ultraCmMatch2[4]);
      var distance = self.readArduinoUltrasonic(echoPin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[STBlock] Ultrasonic (alt): ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // Sensores de distancia: stbV2UltrasonicRead(...) < 20
    var ultraMatch = condition.match(/stbV2UltrasonicRead\s*\([^)]*\)\s*([<>=!]+)\s*(.+)$/);
    if (ultraMatch) {
      var operator = ultraMatch[1];
      var threshold = self.evaluateExpression(ultraMatch[2]);
      var distance = self.readUltrasonicSensor();
      return self.compareValues(distance, operator, threshold);
    }

    // ═══ ARDUINO: Sensor ultrasónico con pulseIn ═══
    // Formato: pulseIn(echoPin, HIGH) * 0.034 / 2 < 50
    // o: (pulseIn(echoPin, HIGH) * 0.034 / 2) < 50
    var pulseInMatch = condition.match(/\(?pulseIn\s*\(\s*(\d+)\s*,\s*HIGH\s*\)[^<>=!]*([<>=!]+)\s*"?(\d+\.?\d*)"?\)?/i);
    if (pulseInMatch) {
      var echoPin = pulseInMatch[1];
      var operator = pulseInMatch[2];
      var threshold = parseFloat(pulseInMatch[3]);
      var distance = self.readArduinoUltrasonic(echoPin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[Arduino] pulseIn Ultrasonic: ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // ARDUINO: getUltrasonicDistance(trig, echo) < 50
    var getUltraMatch = condition.match(/getUltrasonicDistance\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*([<>=!]+)\s*"?(\d+\.?\d*)"?/);
    if (getUltraMatch) {
      var echoPin = getUltraMatch[2];
      var operator = getUltraMatch[3];
      var threshold = parseFloat(getUltraMatch[4]);
      var distance = self.readArduinoUltrasonic(echoPin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[Arduino] getUltrasonicDistance: ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // ARDUINO: ultrasonicRead(pin) < 50 o ultrasonic_read(pin) < 50
    var ultraReadMatch = condition.match(/ultrasonic[_]?[rR]ead\s*\(\s*(\d+)\s*\)\s*([<>=!]+)\s*"?(\d+\.?\d*)"?/i);
    if (ultraReadMatch) {
      var pin = ultraReadMatch[1];
      var operator = ultraReadMatch[2];
      var threshold = parseFloat(ultraReadMatch[3]);
      var distance = self.readArduinoUltrasonic(pin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[Arduino] ultrasonicRead: ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // ARDUINO: leerUltrasonico(trig, echo) < 50 (formato español)
    var leerUltraMatch = condition.match(/leerUltrasonico\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*([<>=!]+)\s*"?(\d+\.?\d*)"?/);
    if (leerUltraMatch) {
      var echoPin = leerUltraMatch[2];
      var operator = leerUltraMatch[3];
      var threshold = parseFloat(leerUltraMatch[4]);
      var distance = self.readArduinoUltrasonic(echoPin);
      var result = self.compareValues(distance, operator, threshold);
      console.log('[Arduino] leerUltrasonico: ' + distance + ' ' + operator + ' ' + threshold + ' = ' + result);
      return result;
    }

    // ARDUINO: distanciaUltrasonico o similar variables < 50
    // Esto se manejará por el handler de comparación general más abajo

    // ═══ SENSOR DE COLOR STBoard V2 ═══

    // stbV2ColorIsColor("RED") o stbV2ColorIsColor("ROJO")
    var colorIsMatch = condition.match(/stbV2ColorIsColor\s*\(\s*["']?(\w+)["']?\s*\)/);
    if (colorIsMatch) {
      var targetColor = colorIsMatch[1];
      var result = self.isColorEqual(targetColor);
      console.log('[STBlock] Condición: stbV2ColorIsColor(' + targetColor + ') = ' + result);
      return result;
    }

    // stbV2ColorSensorColor() == "RED" (formato legacy)
    var colorMatch = condition.match(/stbV2ColorSensorColor\s*\([^)]*\)\s*==\s*["']?(\w+)["']?/);
    if (colorMatch) {
      var targetColor = colorMatch[1];
      var result = self.isColorEqual(targetColor);
      console.log('[STBlock] Condición: stbV2ColorSensorColor() == ' + targetColor + ' = ' + result);
      return result;
    }

    // stbV2ColorReadName() == "RED" o stbV2ColorReadName() == "ROJO"
    var colorNameMatch = condition.match(/stbV2ColorReadName\s*\(\s*\)\s*==\s*["']?(\w+)["']?/);
    if (colorNameMatch) {
      var targetColor = colorNameMatch[1];
      var result = self.isColorEqual(targetColor);
      console.log('[STBlock] Condición: stbV2ColorReadName() == ' + targetColor + ' = ' + result);
      return result;
    }

    // stbV2ColorReadName() != "RED"
    var colorNameNeqMatch = condition.match(/stbV2ColorReadName\s*\(\s*\)\s*!=\s*["']?(\w+)["']?/);
    if (colorNameNeqMatch) {
      var targetColor = colorNameNeqMatch[1];
      var result = !self.isColorEqual(targetColor);
      console.log('[STBlock] Condición: stbV2ColorReadName() != ' + targetColor + ' = ' + result);
      return result;
    }

    // Comparaciones de componentes RGB: stbV2ColorReadRed() > 100
    var colorCompMatch = condition.match(/stbV2ColorRead(Red|Green|Blue|Clear|Hue)\s*\(\s*\)\s*([<>=!]+)\s*(\d+)/);
    if (colorCompMatch) {
      var component = colorCompMatch[1];
      var operator = colorCompMatch[2];
      var threshold = parseInt(colorCompMatch[3]);
      var value;

      switch (component) {
        case 'Red': value = self.readColorRed(); break;
        case 'Green': value = self.readColorGreen(); break;
        case 'Blue': value = self.readColorBlue(); break;
        case 'Clear': value = self.readColorClear(); break;
        case 'Hue': value = self.readColorHue(); break;
        default: value = 0;
      }

      var result = self.compareValues(value, operator, threshold);
      console.log('[STBlock] Condición: stbV2ColorRead' + component + '() ' + operator + ' ' + threshold + ' = ' + result + ' (valor=' + value + ')');
      return result;
    }

    // Sensor de color conectado (stbV2TcsOk)
    if (condition.includes('stbV2TcsOk')) {
      var connected = self.isColorSensorConnected();
      console.log('[STBlock] Condición: stbV2TcsOk = ' + connected);
      return connected;
    }

    // Sensor táctil
    if (condition.includes('stbV2TouchSensorPressed')) {
      return self.readTouchSensor();
    }

    // ═══ GIROSCOPIO ═══

    // stbV2GyroReady() - giroscopio listo
    if (condition.includes('stbV2GyroReady()')) {
      var ready = self.isGyroReady();
      console.log('[STBlock] Condición stbV2GyroReady() = ' + ready);
      return ready;
    }

    // stbV2IsShaken() - tarjeta agitada
    if (condition.includes('stbV2IsShaken()')) {
      var shaken = self.isShaken();
      console.log('[STBlock] Condición stbV2IsShaken() = ' + shaken);
      return shaken;
    }

    // stbV2IsTilted(threshold) - tarjeta inclinada
    var tiltedMatch = condition.match(/stbV2IsTilted\s*\(\s*([\d.]+|STB_V2_GYRO_TILT_THRESHOLD_DEG)\s*\)/);
    if (tiltedMatch) {
      var threshold = tiltedMatch[1] === 'STB_V2_GYRO_TILT_THRESHOLD_DEG' ? 20 : parseFloat(tiltedMatch[1]);
      var tilted = self.isTilted(threshold);
      console.log('[STBlock] Condición stbV2IsTilted(' + threshold + ') = ' + tilted);
      return tilted;
    }

    // stbV2CompareFloat(...) - comparaciones con giroscopio
    var compareFloatMatch = condition.match(/stbV2CompareFloat\s*\(\s*(.+?)\s*,\s*String\s*\(\s*["'](\w+)["']\s*\)\s*,\s*([\d.-]+)\s*\)/);
    if (compareFloatMatch) {
      var valueExpr = compareFloatMatch[1];
      var condType = compareFloatMatch[2];
      var threshold = parseFloat(compareFloatMatch[3]);

      // Evaluar la expresión del valor
      var value = self.evaluateSensorExpression(valueExpr);
      if (value === null) {
        value = self.evaluateExpression(valueExpr);
      }

      var result = false;
      switch (condType) {
        case 'GT': result = value > threshold; break;
        case 'GE': result = value >= threshold; break;
        case 'LT': result = value < threshold; break;
        case 'LE': result = value <= threshold; break;
        case 'EQ': result = Math.abs(value - threshold) < 0.01; break;
        case 'NE': result = Math.abs(value - threshold) >= 0.01; break;
        default: result = false;
      }

      console.log('[STBlock] Condición stbV2CompareFloat(' + value.toFixed(2) + ', ' + condType + ', ' + threshold + ') = ' + result);
      return result;
    }

    // stbV2GyroAngle comparación directa
    var gyroMatch = condition.match(/stbV2GyroAngle\s*\([^)]*\)\s*([<>=!]+)\s*([\d.-]+)/);
    if (gyroMatch) {
      var operator = gyroMatch[1];
      var threshold = parseFloat(gyroMatch[2]);
      var angle = self.getGyroAngle();
      return self.compareValues(angle, operator, threshold);
    }

    // stbV2GetGyroAngle() comparación
    var gyroAngleMatch = condition.match(/stbV2GetGyroAngle\s*\(\s*\)\s*([<>=!]+)\s*([\d.-]+)/);
    if (gyroAngleMatch) {
      var operator = gyroAngleMatch[1];
      var threshold = parseFloat(gyroAngleMatch[2]);
      var angle = self.getGyroAngle();
      console.log('[STBlock] Condición gyroAngle ' + angle.toFixed(2) + ' ' + operator + ' ' + threshold);
      return self.compareValues(angle, operator, threshold);
    }

    // Motor en movimiento
    var movingMatch = condition.match(/stbV2IsMotorMoving\s*\(\s*"(\w+)"\s*\)/);
    if (movingMatch) {
      return self.isMotorMoving(movingMatch[1]);
    }

    // Comparación general: expresión operador expresión
    // Soporta variables, números, y expresiones
    var compMatch = condition.match(/(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)/);
    if (compMatch) {
      var leftExpr = compMatch[1].trim();
      var operator = compMatch[2];
      var rightExpr = compMatch[3].trim();

      var leftValue = self.evaluateExpression(leftExpr);
      var rightValue = self.evaluateExpression(rightExpr);

      var result = self.compareValues(leftValue, operator, rightValue);
      console.log('[STBlock] Comparación: ' + leftExpr + '(' + leftValue + ') ' + operator + ' ' + rightExpr + '(' + rightValue + ') = ' + result);
      return result;
    }

    // Intentar evaluar como expresión booleana
    try {
      var result = self.evaluateExpression(condition);
      return !!result;
    } catch (e) {
      console.log('[STBlock] ⚠️ Condición no reconocida:', condition);
      return false;
    }
  };

  // Dividir por operador respetando paréntesis
  this.splitByOperator = function(str, operator) {
    var parts = [];
    var current = '';
    var parenCount = 0;
    var i = 0;

    while (i < str.length) {
      if (str[i] === '(') {
        parenCount++;
        current += str[i];
      } else if (str[i] === ')') {
        parenCount--;
        current += str[i];
      } else if (parenCount === 0 && str.substring(i, i + operator.length) === operator) {
        parts.push(current.trim());
        current = '';
        i += operator.length - 1;
      } else {
        current += str[i];
      }
      i++;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  };

  this.compareValues = function(a, operator, b) {
    switch (operator) {
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      case '==': return a == b;
      case '!=': return a != b;
      default: return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LECTURA DE SENSORES (para condiciones)
  // ═══════════════════════════════════════════════════════════════════════════

  this.readUltrasonicSensor = function() {
    if (!robot || !robot.components) return 999;
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'UltrasonicSensor' && comp.getDistance) {
        return comp.getDistance();
      }
    }
    return 999;
  };

  this.readColorSensor = function() {
    if (!robot || !robot.components) {
      console.log('[STBlock] Color: robot no disponible');
      return 'NONE';
    }
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'ColorSensor' && comp.getRGB) {
        var rgb = comp.getRGB();
        var colorName = self.rgbToColorName(rgb);
        console.log('[STBlock] Color detectado: ' + colorName + ' (RGB: ' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')');
        return colorName;
      }
    }
    console.log('[STBlock] Color: sensor no encontrado');
    return 'NONE';
  };

  this.rgbToColorName = function(rgb) {
    if (!rgb || rgb.length < 3) return 'NONE';
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);

    // Negro - muy poca luz
    if (max < 30) return 'BLACK';

    // Blanco - todos los componentes altos
    if (min > 200) return 'WHITE';

    // Gris - todos similares, brillo medio
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && max > 50 && max < 200) return 'GRAY';

    // Calcular saturación y brillo
    var saturation = (max > 0) ? (max - min) / max : 0;

    // Si saturación muy baja y brillo alto, es blanco/gris
    if (saturation < 0.2 && max > 180) return 'WHITE';
    if (saturation < 0.15) return 'GRAY';

    // Usar HUE para colores saturados
    var hue = self.calculateHue(r, g, b);

    console.log('[STBlock] rgbToColorName: RGB(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ') hue=' + Math.round(hue) + ' sat=' + saturation.toFixed(2));

    // Clasificar por HUE
    // Rojo: 0-30 o 330-360
    if (hue < 30 || hue >= 330) return 'RED';
    // Naranja: 30-45
    if (hue >= 30 && hue < 45) return 'ORANGE';
    // Amarillo: 45-90
    if (hue >= 45 && hue < 90) return 'YELLOW';
    // Verde: 90-165
    if (hue >= 90 && hue < 165) return 'GREEN';
    // Cian: 165-200
    if (hue >= 165 && hue < 200) return 'CYAN';
    // Azul: 200-270
    if (hue >= 200 && hue < 270) return 'BLUE';
    // Púrpura/Morado: 270-330
    if (hue >= 270 && hue < 330) return 'PURPLE';

    return 'NONE';
  };

  // Calcular HUE de RGB (0-360)
  this.calculateHue = function(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;

    if (delta === 0) return 0;

    var hue;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;

    return hue;
  };

  // Mapeo de nombres de color español -> inglés
  this.colorNameMap = {
    'ROJO': 'RED', 'RED': 'RED',
    'VERDE': 'GREEN', 'GREEN': 'GREEN',
    'AZUL': 'BLUE', 'BLUE': 'BLUE',
    'AMARILLO': 'YELLOW', 'YELLOW': 'YELLOW',
    'NEGRO': 'BLACK', 'BLACK': 'BLACK',
    'BLANCO': 'WHITE', 'WHITE': 'WHITE',
    'NARANJA': 'ORANGE', 'ORANGE': 'ORANGE',
    'MORADO': 'PURPLE', 'PURPLE': 'PURPLE',
    'PURPURA': 'PURPLE',
    'CIAN': 'CYAN', 'CYAN': 'CYAN',
    'MARRON': 'BROWN', 'BROWN': 'BROWN',
    'GRIS': 'GRAY', 'GRAY': 'GRAY', 'GREY': 'GRAY',
    'NINGUNO': 'NONE', 'NONE': 'NONE'
  };

  // Normalizar nombre de color (español o inglés -> inglés mayúsculas)
  this.normalizeColorName = function(colorName) {
    if (!colorName) return 'NONE';
    var upper = colorName.toUpperCase().replace(/['"]/g, '');
    return self.colorNameMap[upper] || upper;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES DE LECTURA DEL SENSOR DE COLOR
  // ═══════════════════════════════════════════════════════════════════════════

  // Obtener RGB del sensor de color
  this.readColorRGB = function() {
    if (!robot || !robot.components) return [0, 0, 0];
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'ColorSensor' && comp.getRGB) {
        var rgb = comp.getRGB();
        console.log('[STBlock] Color RGB: [' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ']');
        return rgb;
      }
    }
    return [0, 0, 0];
  };

  // Leer componente Rojo
  this.readColorRed = function() {
    var rgb = self.readColorRGB();
    return Math.round(rgb[0]);
  };

  // Leer componente Verde
  this.readColorGreen = function() {
    var rgb = self.readColorRGB();
    return Math.round(rgb[1]);
  };

  // Leer componente Azul
  this.readColorBlue = function() {
    var rgb = self.readColorRGB();
    return Math.round(rgb[2]);
  };

  // Leer claridad (clear/luminosidad) - promedio RGB
  this.readColorClear = function() {
    var rgb = self.readColorRGB();
    return Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
  };

  // Leer tono (hue) - 0 a 360 grados
  this.readColorHue = function() {
    var rgb = self.readColorRGB();
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;

    if (delta === 0) return 0;

    var hue;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;

    console.log('[STBlock] Color Hue: ' + hue + '°');
    return hue;
  };

  // Verificar si el color detectado es igual a un color dado
  this.isColorEqual = function(targetColor) {
    var currentColor = self.readColorSensor();
    var normalizedTarget = self.normalizeColorName(targetColor);
    var result = currentColor === normalizedTarget;
    console.log('[STBlock] Color: ' + currentColor + ' == ' + normalizedTarget + ' ? ' + result);
    return result;
  };

  // Verificar si el sensor de color está conectado
  this.isColorSensorConnected = function() {
    if (!robot || !robot.components) {
      console.log('[STBlock] Sensor color: robot no disponible');
      return false;
    }
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'ColorSensor') {
        console.log('[STBlock] Sensor color: conectado');
        return true;
      }
    }
    console.log('[STBlock] Sensor color: no encontrado');
    return false;
  };

  this.readTouchSensor = function() {
    if (!robot || !robot.components) return false;
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'TouchSensor' && comp.isPressed) {
        return comp.isPressed();
      }
    }
    return false;
  };

  this.readGyroSensor = function() {
    if (!robot || !robot.components) return 0;
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'GyroSensor' && comp.getYawAngle) {
        return comp.getYawAngle();
      }
    }
    return 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES DE LECTURA DEL GIROSCOPIO
  // ═══════════════════════════════════════════════════════════════════════════

  // Obtener el componente GyroSensor
  this.getGyroSensor = function() {
    if (!robot || !robot.components) return null;
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'GyroSensor') {
        return comp;
      }
    }
    return null;
  };

  // Estado del giroscopio (simulado)
  this.gyroState = {
    configured: false,
    calibrated: false,
    axis: 'Z',
    inverted: false,
    angleOffset: 0
  };

  // Configurar giroscopio
  this.configureGyro = function(axis, inverted) {
    self.gyroState.axis = axis || 'Z';
    self.gyroState.inverted = inverted || false;
    self.gyroState.configured = true;
    console.log('[STBlock] Giroscopio configurado: eje=' + self.gyroState.axis + ', invertido=' + self.gyroState.inverted);
  };

  // Calibrar giroscopio
  this.calibrateGyro = function() {
    var gyro = self.getGyroSensor();
    if (gyro && gyro.reset) {
      gyro.reset();
    }
    self.gyroState.calibrated = true;
    self.gyroState.angleOffset = 0;
    console.log('[STBlock] Giroscopio calibrado');
  };

  // Reiniciar ángulo del giroscopio
  this.resetGyroAngle = function() {
    var gyro = self.getGyroSensor();
    if (gyro && gyro.reset) {
      gyro.reset();
    }
    self.gyroState.angleOffset = 0;
    console.log('[STBlock] Ángulo giroscopio reiniciado');
  };

  // Verificar si el giroscopio está listo
  this.isGyroReady = function() {
    var gyro = self.getGyroSensor();
    return gyro !== null;
  };

  // Verificar si el giroscopio está conectado
  this.isGyroConnected = function() {
    return self.getGyroSensor() !== null;
  };

  // Obtener ángulo del giroscopio (yaw)
  this.getGyroAngle = function() {
    var gyro = self.getGyroSensor();
    if (!gyro) return 0;

    var angle = 0;
    switch (self.gyroState.axis) {
      case 'X':
        angle = gyro.getRollAngle ? gyro.getRollAngle() : 0;
        break;
      case 'Y':
        angle = gyro.getPitchAngle ? gyro.getPitchAngle() : 0;
        break;
      case 'Z':
      default:
        angle = gyro.getYawAngle ? gyro.getYawAngle() : 0;
        break;
    }

    if (self.gyroState.inverted) {
      angle = -angle;
    }

    return angle - self.gyroState.angleOffset;
  };

  // Obtener ángulo de inclinación (pitch o roll según configuración)
  this.getTiltAngle = function() {
    var gyro = self.getGyroSensor();
    if (!gyro) return 0;

    // Calcular inclinación como combinación de pitch y roll
    var pitch = gyro.getPitchAngle ? gyro.getPitchAngle() : 0;
    var roll = gyro.getRollAngle ? gyro.getRollAngle() : 0;

    // Magnitud de la inclinación
    return Math.sqrt(pitch * pitch + roll * roll);
  };

  // Obtener velocidad angular del giroscopio
  this.getGyroAngularVelocity = function(axis) {
    var gyro = self.getGyroSensor();
    if (!gyro) return 0;

    var axisUpper = (axis || self.gyroState.axis).toUpperCase();

    switch (axisUpper) {
      case 'X':
        return gyro.getRollRate ? gyro.getRollRate() : 0;
      case 'Y':
        return gyro.getPitchRate ? gyro.getPitchRate() : 0;
      case 'Z':
      default:
        return gyro.getYawRate ? gyro.getYawRate() : 0;
    }
  };

  // Obtener aceleración del giroscopio (simulada como velocidad angular)
  this.getGyroAcceleration = function(axis) {
    // En GearsBot no hay acelerómetro real, usamos la velocidad angular como aproximación
    return self.getGyroAngularVelocity(axis);
  };

  // Verificar si la tarjeta está agitada (alta velocidad angular)
  this.isShaken = function() {
    var velX = Math.abs(self.getGyroAngularVelocity('X'));
    var velY = Math.abs(self.getGyroAngularVelocity('Y'));
    var velZ = Math.abs(self.getGyroAngularVelocity('Z'));

    var maxVel = Math.max(velX, velY, velZ);
    var threshold = 100; // grados/segundo

    return maxVel > threshold;
  };

  // Verificar si la tarjeta está inclinada
  this.isTilted = function(threshold) {
    threshold = threshold || 20; // grados por defecto
    var tiltAngle = self.getTiltAngle();
    return Math.abs(tiltAngle) > threshold;
  };

  // Girar usando el giroscopio (con PID simple)
  this.turnByGyro = function(side, degrees, speed) {
    if (!robot) return Promise.resolve();

    var targetAngle = Math.abs(degrees);
    var direction = (side === 'LEFT' || side === 'IZQUIERDA') ? -1 : 1;
    var currentAngle = self.getGyroAngle();
    var targetYaw = currentAngle + (direction * targetAngle);

    speed = speed || 50;
    var motorSpeed = Math.max(20, Math.min(100, speed));

    console.log('[STBlock] Girando con giroscopio: lado=' + side + ', grados=' + degrees + ', velocidad=' + speed);
    console.log('[STBlock] Ángulo actual=' + currentAngle + ', objetivo=' + targetYaw);

    return new Promise(function(resolve) {
      var checkInterval = setInterval(function() {
        var angle = self.getGyroAngle();
        var error = targetYaw - angle;

        // Ajuste proporcional de velocidad
        var absError = Math.abs(error);
        var adjustedSpeed = motorSpeed;

        if (absError < 10) {
          adjustedSpeed = Math.max(15, motorSpeed * (absError / 10));
        }

        if (absError < 2) {
          // Llegamos al objetivo
          if (robot.leftWheel) robot.leftWheel.stop();
          if (robot.rightWheel) robot.rightWheel.stop();
          clearInterval(checkInterval);
          console.log('[STBlock] Giro completado. Ángulo final=' + angle);
          resolve();
          return;
        }

        // Girar en la dirección correcta
        var turnDirection = error > 0 ? 1 : -1;
        var leftSpeed = -turnDirection * adjustedSpeed;
        var rightSpeed = turnDirection * adjustedSpeed;

        if (robot.leftWheel) {
          robot.leftWheel.setSpeed(leftSpeed);
        }
        if (robot.rightWheel) {
          robot.rightWheel.setSpeed(rightSpeed);
        }
      }, 20);

      // Timeout de seguridad (10 segundos)
      setTimeout(function() {
        clearInterval(checkInterval);
        if (robot.leftWheel) robot.leftWheel.stop();
        if (robot.rightWheel) robot.rightWheel.stop();
        console.log('[STBlock] Giro timeout');
        resolve();
      }, 10000);
    });
  };

  this.isMotorMoving = function(selector) {
    if (!robot) return false;
    var motors = self.getMotorsForSelector(selector);
    for (var i = 0; i < motors.length; i++) {
      var m = motors[i];
      if (m.gearsWheel === 'left' && robot.leftWheel) {
        if (robot.leftWheel.mode !== robot.leftWheel.modes.STOP) return true;
      }
      if (m.gearsWheel === 'right' && robot.rightWheel) {
        if (robot.rightWheel.mode !== robot.rightWheel.modes.STOP) return true;
      }
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleSetBoardDefaults = function(stmt) {
    var match = stmt.match(/stbV2SetBoardDefaults\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
    if (!match) return;

    self.config.wheelDiameterCm = parseFloat(match[1]);
    self.config.maxRpm = parseFloat(match[2]);
    self.config.trackWidthCm = parseFloat(match[3]);
    self.config.initialized = true;

    console.log('[STBlock] Config: wheel=' + self.config.wheelDiameterCm +
                'cm, rpm=' + self.config.maxRpm + ', track=' + self.config.trackWidthCm + 'cm');
  };

  this.handleConfigureMotor = function(stmt) {
    var match = stmt.match(/stbV2ConfigureMotor\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)/);
    if (!match) return;

    var motorIndex = parseInt(match[1]);
    var sideConst = match[2];

    if (motorIndex < 0 || motorIndex > 3) return;

    var port = self.indexToPort[motorIndex];
    var motor = self.motors[port];

    var side = 'NONE';
    if (sideConst.includes('LEFT')) side = 'LEFT';
    else if (sideConst.includes('RIGHT')) side = 'RIGHT';

    motor.configured = true;
    motor.enabled = (side !== 'NONE');
    motor.side = side;

    // Verificar coincidencia con GearsBot
    var gearsLeft = self.getGearsLeftPort();
    var gearsRight = self.getGearsRightPort();
    var matchStr = '';
    if (side === 'LEFT' && port === gearsLeft) matchStr = ' ✓ coincide';
    else if (side === 'RIGHT' && port === gearsRight) matchStr = ' ✓ coincide';
    else if (side !== 'NONE') matchStr = ' ✗ NO coincide con GearsBot';

    console.log('[STBlock] Motor ' + port + ' -> ' + side + matchStr);
  };

  this.handleSetDirection = function(stmt) {
    var match = stmt.match(/stbV2SetDirection\s*\(\s*(\d+)\s*,\s*(true|false)\s*\)/);
    if (!match) return;

    var motorIndex = parseInt(match[1]);
    var inverted = match[2] === 'true';

    if (motorIndex < 0 || motorIndex > 3) return;

    var port = self.indexToPort[motorIndex];
    self.motors[port].inverted = inverted;
  };

  this.handleSetSpeed = function(stmt) {
    var match = stmt.match(/stbV2SetSpeedBySelector\s*\(\s*"(\w+)"\s*,\s*(-?[\d.]+)\s*\)/);
    if (!match) return;

    var selector = match[1];
    var speed = parseInt(match[2]);

    self.config.speedConfigured = true;

    // Establecer velocidad en los motores del selector
    if (selector === 'MOTION' || selector === 'ALL') {
      for (var port in self.motors) {
        var motor = self.motors[port];
        if (motor.configured && motor.enabled) {
          if (selector === 'ALL' || motor.side === 'LEFT' || motor.side === 'RIGHT') {
            motor.speed = speed;
          }
        }
      }
    } else if (self.motors[selector]) {
      self.motors[selector].speed = speed;
    }

    console.log('[STBlock] Velocidad ' + selector + ' = ' + speed + '%');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE MOVIMIENTO CONTINUO
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleMoveBySelector = function(stmt) {
    var match = stmt.match(/stbV2MoveBySelector\s*\(\s*"(\w+)"\s*\)/);
    if (!match) return;

    var selector = match[1];
    self.moveMotors(selector, 1);
  };

  this.handleReverseBySelector = function(stmt) {
    var match = stmt.match(/stbV2ReverseBySelector\s*\(\s*"(\w+)"\s*\)/);
    if (!match) return;

    var selector = match[1];
    self.moveMotors(selector, -1);
  };

  this.handleStopBySelector = function(stmt) {
    var match = stmt.match(/stbV2StopBySelector\s*\(\s*"(\w+)"\s*\)/);
    if (!match) return;

    var selector = match[1];
    self.stopMotors(selector);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE MOVIMIENTO POR DISTANCIA
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleMoveDistanceBlocking = function(stmt) {
    var match = stmt.match(/stbV2MoveDistanceBlocking\s*\(\s*"(\w+)"\s*,\s*(.+?)\s*,\s*(-?\d+)\s*\)/);
    if (!match) return;

    var selector = match[1];
    var distanceExpr = match[2];
    var speedOverride = parseInt(match[3]);

    var distanceMm = self.evaluateDistanceExpression(distanceExpr);
    var distanceCm = distanceMm / 10;

    self.moveMotorsDistance(selector, distanceCm, speedOverride);
  };

  this.handleMoveDistanceBySelector = function(stmt) {
    return self.handleMoveDistanceBlocking(stmt);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE MOVIMIENTO POR TIEMPO
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleMoveForDurationBlocking = function(stmt) {
    var match = stmt.match(/stbV2MoveForDurationBlocking\s*\(\s*"(\w+)"\s*,\s*(-?\d+)\s*,\s*(\d+)\s*\)/);
    if (!match) return;

    var selector = match[1];
    var speed = parseInt(match[2]);
    var durationMs = parseInt(match[3]);

    self.moveMotorsForDuration(selector, speed, durationMs);
  };

  this.handleMoveForDurationStoredBlocking = function(stmt) {
    // stbV2MoveForDurationUsingStoredSpeedBlocking("MOTION", false, stbV2DurationToMs(2, "SECONDS"))
    var match = stmt.match(/stbV2MoveForDurationUsingStoredSpeedBlocking\s*\(\s*"(\w+)"\s*,\s*(true|false)\s*,\s*(.+?)\s*\)/);
    if (!match) {
      console.log('[STBlock] ⚠️ No se pudo parsear MoveForDurationStoredBlocking:', stmt);
      return;
    }

    var selector = match[1];
    var reverse = match[2] === 'true';
    var durationExpr = match[3];

    var durationMs = self.evaluateDurationExpression(durationExpr);
    console.log('[STBlock] MoveForDuration: selector=' + selector + ', reverse=' + reverse + ', duration=' + durationMs + 'ms');

    var direction = reverse ? -1 : 1;
    self.moveMotorsForDurationStored(selector, direction, durationMs);
  };

  this.handleMoveForDurationStoredAsync = function(stmt) {
    // stbV2MoveForDurationUsingStoredSpeedAsync("MOTION", false, stbV2DurationToMs(2, "SECONDS"))
    var match = stmt.match(/stbV2MoveForDurationUsingStoredSpeedAsync\s*\(\s*"(\w+)"\s*,\s*(true|false)\s*,\s*(.+?)\s*\)/);
    if (!match) {
      console.log('[STBlock] ⚠️ No se pudo parsear MoveForDurationStoredAsync:', stmt);
      return;
    }

    var selector = match[1];
    var reverse = match[2] === 'true';
    var durationExpr = match[3];

    var durationMs = self.evaluateDurationExpression(durationExpr);
    var direction = reverse ? -1 : 1;
    self.moveMotorsForDurationStored(selector, direction, durationMs);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE GIROS
  // ═══════════════════════════════════════════════════════════════════════════

  this.handleTurnByAmount = function(stmt) {
    var match = stmt.match(/stbV2TurnByAmount\s*\(\s*"(\w+)"\s*,\s*([\d.]+)\s*,\s*"(\w+)"\s*,\s*(\d+)\s*\)/);
    if (!match) return;

    var side = match[1];
    var value = parseFloat(match[2]);
    var unit = match[3];
    var speedOverride = parseInt(match[4]);

    var degrees = value;
    if (unit === 'REV') degrees = value * 360;
    else if (unit === 'RAD') degrees = value * 57.2957795;

    self.turnRobot(side, degrees, speedOverride);
  };

  this.handleTurnContinuous = function(stmt) {
    var match = stmt.match(/stbV2TurnContinuous\s*\(\s*"(\w+)"\s*\)/);
    if (!match) return;

    var side = match[1];
    self.turnRobotContinuous(side);
  };

  // NOTA: Los delays ahora se manejan en executeStatementsSequentially y executeWhileBodyWithCallback
  this.handleDelay = function(stmt) {
    // Esta función ya no se usa directamente - los delays se manejan en el flujo de ejecución
    var match = stmt.match(/delay\s*\(\s*(\d+)\s*\)/);
    if (match) {
      console.log('[STBlock] handleDelay llamado (legacy): ' + match[1] + 'ms');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES DE ACCIÓN EN EL ROBOT SIMULADO
  // ═══════════════════════════════════════════════════════════════════════════

  // Mover motores continuamente
  this.moveMotors = function(selector, direction) {
    if (!robot) {
      console.log('[STBlock] ERROR: Robot no disponible');
      return;
    }

    var motors = self.getMotorsForSelector(selector);

    if (motors.length === 0) {
      console.log('[STBlock] ⚠️ ' + selector + ': Ningún motor válido (puertos no coinciden con GearsBot)');
      return;
    }

    // Verificar velocidad
    var noSpeed = motors.some(function(m) { return m.motor.speed === null; });
    if (noSpeed) {
      console.log('[STBlock] ⚠️ ' + selector + ': Velocidad no definida - use "definir velocidad"');
      return;
    }

    var portList = motors.map(function(m) { return m.port; }).join(', ');
    console.log('[STBlock] Moviendo ' + selector + ' (dir=' + direction + '): ' + portList);

    motors.forEach(function(m) {
      var speed = m.motor.speed;
      var invertMult = m.motor.inverted ? -1 : 1;
      var actualSpeed = (speed / 100) * 1050 * direction * invertMult;

      if (m.gearsWheel === 'left' && robot.leftWheel) {
        robot.leftWheel.speed_sp = actualSpeed;
        robot.leftWheel.runForever();
      } else if (m.gearsWheel === 'right' && robot.rightWheel) {
        robot.rightWheel.speed_sp = actualSpeed;
        robot.rightWheel.runForever();
      }
    });
  };

  // Detener motores
  this.stopMotors = function(selector) {
    if (!robot) return;

    var motors = self.getMotorsForSelector(selector);

    motors.forEach(function(m) {
      if (m.gearsWheel === 'left' && robot.leftWheel) {
        robot.leftWheel.stop();
      } else if (m.gearsWheel === 'right' && robot.rightWheel) {
        robot.rightWheel.stop();
      }
    });
  };

  // Mover motores por distancia
  this.moveMotorsDistance = function(selector, distanceCm, speedOverride) {
    if (!robot) return;

    var motors = self.getMotorsForSelector(selector);

    if (motors.length === 0) {
      console.log('[STBlock] ⚠️ MoveDistance ' + selector + ': Ningún motor válido');
      return;
    }

    // Verificar velocidad
    var noSpeed = motors.some(function(m) {
      return speedOverride === 0 && m.motor.speed === null;
    });
    if (noSpeed) {
      console.log('[STBlock] ⚠️ MoveDistance: Velocidad no definida');
      return;
    }

    var direction = distanceCm >= 0 ? 1 : -1;
    var absDistance = Math.abs(distanceCm);

    var wheelDiameter = 5.6;
    var wheelCircumference = wheelDiameter * Math.PI;
    var rotations = absDistance / wheelCircumference;
    var wheelDegrees = rotations * 360 * direction;

    console.log('[STBlock] Mover ' + selector + ' ' + distanceCm + 'cm (' + Math.abs(wheelDegrees).toFixed(1) + '° rueda)');

    motors.forEach(function(m) {
      var speed = speedOverride > 0 ? speedOverride : m.motor.speed;
      var invertMult = m.motor.inverted ? -1 : 1;
      var motorSpeed = (speed / 100) * 1050;

      if (m.gearsWheel === 'left' && robot.leftWheel) {
        robot.leftWheel.speed_sp = motorSpeed;
        robot.leftWheel.position_target = robot.leftWheel.position + (wheelDegrees * invertMult);
        robot.leftWheel.runToPosition();
      } else if (m.gearsWheel === 'right' && robot.rightWheel) {
        robot.rightWheel.speed_sp = motorSpeed;
        robot.rightWheel.position_target = robot.rightWheel.position + (wheelDegrees * invertMult);
        robot.rightWheel.runToPosition();
      }
    });
  };

  // Mover motores por duración
  this.moveMotorsForDuration = function(selector, speedPercent, durationMs) {
    if (!robot) return;

    var motors = self.getMotorsForSelector(selector);

    if (motors.length === 0) {
      console.log('[STBlock] ⚠️ MoveForDuration ' + selector + ': Ningún motor válido');
      return;
    }

    var direction = speedPercent >= 0 ? 1 : -1;
    var speed = Math.abs(speedPercent);

    console.log('[STBlock] Mover ' + selector + ' por ' + durationMs + 'ms a ' + speedPercent + '%');

    motors.forEach(function(m) {
      var invertMult = m.motor.inverted ? -1 : 1;
      var motorSpeed = (speed / 100) * 1050 * direction * invertMult;

      if (m.gearsWheel === 'left' && robot.leftWheel) {
        robot.leftWheel.speed_sp = motorSpeed;
        robot.leftWheel.time_sp = durationMs / 1000;
        robot.leftWheel.time_target = Date.now() + durationMs;
        robot.leftWheel.runTimed();
      } else if (m.gearsWheel === 'right' && robot.rightWheel) {
        robot.rightWheel.speed_sp = motorSpeed;
        robot.rightWheel.time_sp = durationMs / 1000;
        robot.rightWheel.time_target = Date.now() + durationMs;
        robot.rightWheel.runTimed();
      }
    });
  };

  // Mover motores por duración con velocidad almacenada
  this.moveMotorsForDurationStored = function(selector, direction, durationMs) {
    if (!robot) return;

    var motors = self.getMotorsForSelector(selector);

    if (motors.length === 0) {
      console.log('[STBlock] ⚠️ MoveForDurationStored ' + selector + ': Ningún motor válido');
      return;
    }

    var noSpeed = motors.some(function(m) { return m.motor.speed === null; });
    if (noSpeed) {
      console.log('[STBlock] ⚠️ MoveForDurationStored: Velocidad no definida');
      return;
    }

    console.log('[STBlock] Mover ' + selector + ' por ' + durationMs + 'ms (vel almacenada, dir=' + direction + ')');

    motors.forEach(function(m) {
      var speed = m.motor.speed;
      var invertMult = m.motor.inverted ? -1 : 1;
      var motorSpeed = (speed / 100) * 1050 * direction * invertMult;

      if (m.gearsWheel === 'left' && robot.leftWheel) {
        robot.leftWheel.speed_sp = motorSpeed;
        robot.leftWheel.time_sp = durationMs / 1000;
        robot.leftWheel.time_target = Date.now() + durationMs;
        robot.leftWheel.runTimed();
      } else if (m.gearsWheel === 'right' && robot.rightWheel) {
        robot.rightWheel.speed_sp = motorSpeed;
        robot.rightWheel.time_sp = durationMs / 1000;
        robot.rightWheel.time_target = Date.now() + durationMs;
        robot.rightWheel.runTimed();
      }
    });
  };

  // Girar robot por cantidad
  this.turnRobot = function(side, degrees, speedOverride) {
    if (!robot) return;

    if (!self.hasMotionPair()) {
      console.log('[STBlock] ⚠️ Girar: MOTION no válido (puertos no coinciden con GearsBot)');
      return;
    }

    var motors = self.getMotorsForSelector('MOTION');
    var noSpeed = motors.some(function(m) {
      return speedOverride === 0 && m.motor.speed === null;
    });
    if (noSpeed) {
      console.log('[STBlock] ⚠️ Girar: Velocidad no definida');
      return;
    }

    var leftMotor = motors.find(function(m) { return m.gearsWheel === 'left'; });
    var rightMotor = motors.find(function(m) { return m.gearsWheel === 'right'; });

    var speed = speedOverride > 0 ? speedOverride :
                Math.max(leftMotor.motor.speed || 50, rightMotor.motor.speed || 50);

    var trackWidth = self.config.trackWidthCm;
    var wheelDiameter = 5.6;
    var arcLength = (Math.PI * trackWidth) * (degrees / 360);
    var wheelCircumference = wheelDiameter * Math.PI;
    var wheelDegrees = (arcLength / wheelCircumference) * 360;

    var motorSpeed = (speed / 100) * 1050;

    console.log('[STBlock] Girar ' + side + ' ' + degrees + '° (rueda: ' + wheelDegrees.toFixed(1) + '°)');

    var leftInvert = leftMotor.motor.inverted ? -1 : 1;
    var rightInvert = rightMotor.motor.inverted ? -1 : 1;

    if (side === 'RIGHT') {
      if (robot.leftWheel) {
        robot.leftWheel.speed_sp = motorSpeed;
        robot.leftWheel.position_target = robot.leftWheel.position + (wheelDegrees * leftInvert);
        robot.leftWheel.runToPosition();
      }
      if (robot.rightWheel) {
        robot.rightWheel.speed_sp = motorSpeed;
        robot.rightWheel.position_target = robot.rightWheel.position - (wheelDegrees * rightInvert);
        robot.rightWheel.runToPosition();
      }
    } else {
      if (robot.leftWheel) {
        robot.leftWheel.speed_sp = motorSpeed;
        robot.leftWheel.position_target = robot.leftWheel.position - (wheelDegrees * leftInvert);
        robot.leftWheel.runToPosition();
      }
      if (robot.rightWheel) {
        robot.rightWheel.speed_sp = motorSpeed;
        robot.rightWheel.position_target = robot.rightWheel.position + (wheelDegrees * rightInvert);
        robot.rightWheel.runToPosition();
      }
    }
  };

  // Girar robot continuamente
  this.turnRobotContinuous = function(side) {
    if (!robot) return;

    if (!self.hasMotionPair()) {
      console.log('[STBlock] ⚠️ Girar continuo: MOTION no válido');
      return;
    }

    var motors = self.getMotorsForSelector('MOTION');
    var noSpeed = motors.some(function(m) { return m.motor.speed === null; });
    if (noSpeed) {
      console.log('[STBlock] ⚠️ Girar continuo: Velocidad no definida');
      return;
    }

    var leftMotor = motors.find(function(m) { return m.gearsWheel === 'left'; });
    var rightMotor = motors.find(function(m) { return m.gearsWheel === 'right'; });

    var leftSpeed = (leftMotor.motor.speed / 100) * 1050 * (leftMotor.motor.inverted ? -1 : 1);
    var rightSpeed = (rightMotor.motor.speed / 100) * 1050 * (rightMotor.motor.inverted ? -1 : 1);

    console.log('[STBlock] Girar continuo ' + side);

    if (side === 'RIGHT') {
      if (robot.leftWheel) {
        robot.leftWheel.speed_sp = leftSpeed;
        robot.leftWheel.runForever();
      }
      if (robot.rightWheel) {
        robot.rightWheel.speed_sp = -rightSpeed;
        robot.rightWheel.runForever();
      }
    } else {
      if (robot.leftWheel) {
        robot.leftWheel.speed_sp = -leftSpeed;
        robot.leftWheel.runForever();
      }
      if (robot.rightWheel) {
        robot.rightWheel.speed_sp = rightSpeed;
        robot.rightWheel.runForever();
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  this.evaluateDistanceExpression = function(expr) {
    // stbV2DistanceValueToMm(10, "CM") -> 100
    // stbV2DistanceValueToMm(-(10), "CM") -> -100
    var match = expr.match(/stbV2DistanceValueToMm\s*\(\s*(-?\(?\s*-?[\d.]+\s*\)?)\s*,\s*"(\w+)"\s*\)/);
    if (match) {
      // Evaluar el valor (puede ser negativo como "-(10)" o "-10")
      var valueStr = match[1].replace(/[()]/g, '').trim();
      var value = parseFloat(valueStr);
      var unit = match[2];

      switch (unit) {
        case 'MM': return value;
        case 'CM': return value * 10;
        case 'M': return value * 1000;
        default: return value * 10;
      }
    }

    var num = parseFloat(expr);
    return isNaN(num) ? 0 : num;
  };

  this.evaluateDurationExpression = function(expr) {
    // stbV2DurationToMs(2, "SECONDS") -> 2000
    // stbV2DurationToMs(500, "MILLISECONDS") -> 500
    var match = expr.match(/stbV2DurationToMs\s*\(\s*([\d.]+)\s*,\s*"(\w+)"\s*\)/);
    if (match) {
      var value = parseFloat(match[1]);
      var unit = match[2];

      switch (unit) {
        case 'SECONDS': return value * 1000;
        case 'MILLISECONDS': return value;
        default: return value * 1000; // Asumir segundos
      }
    }

    // También manejar expresiones con UL al final (unsigned long)
    // Ejemplo: (unsigned long)(2) * 1000UL
    var ulMatch = expr.match(/\(unsigned long\)\s*\(\s*([\d.]+)\s*\)\s*\*\s*1000UL/);
    if (ulMatch) {
      return parseFloat(ulMatch[1]) * 1000;
    }

    // Número directo
    var num = parseFloat(expr);
    return isNaN(num) ? 1000 : num; // Default 1 segundo si no se puede parsear
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SOPORTE ARDUINO - Estado de pines y control de motores H-bridge
  // ═══════════════════════════════════════════════════════════════════════════

  // Estado de los pines Arduino (valor digital o PWM)
  this.arduinoPins = {};

  // Resetear estado de pines Arduino
  this.resetArduinoPins = function() {
    self.arduinoPins = {};
  };

  // Obtener configuración de pines de motor desde simPanel
  this.getArduinoMotorPins = function(motorName) {
    if (typeof simPanel !== 'undefined' && simPanel.pinConfiguration &&
        simPanel.pinConfiguration.components &&
        simPanel.pinConfiguration.components[motorName] &&
        simPanel.pinConfiguration.components[motorName].pins) {
      return simPanel.pinConfiguration.components[motorName].pins;
    }
    return null;
  };

  // Normalizar nombre de pin (D2 -> 2, A5 -> 5, 2 -> 2)
  this.normalizePin = function(pin) {
    if (typeof pin === 'string') {
      // Remover prefijo D, A, etc. y quedarse solo con el número
      var match = pin.match(/\d+/);
      if (match) {
        return match[0];
      }
      return pin;
    }
    return String(pin);
  };

  // Verificar si el código es Arduino (no STBoard V2)
  this.isArduinoCode = function(code) {
    // Si tiene funciones stbV2, es STBoard V2
    if (code.includes('stbV2')) return false;

    // Si tiene funciones Arduino básicas, es Arduino
    var arduinoIndicators = [
      'pinMode(',
      'digitalWrite(',
      'analogWrite(',
      'digitalRead(',
      'analogRead('
    ];

    for (var i = 0; i < arduinoIndicators.length; i++) {
      if (code.includes(arduinoIndicators[i])) {
        return true;
      }
    }
    return false;
  };

  // Handler para pinMode()
  this.handlePinMode = function(stmt) {
    var match = stmt.match(/pinMode\s*\(\s*(\d+)\s*,\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)/);
    if (!match) return;

    var pin = match[1];
    var mode = match[2];

    // Inicializar pin si no existe
    if (!self.arduinoPins[pin]) {
      self.arduinoPins[pin] = { mode: mode, digital: 0, pwm: 0 };
    } else {
      self.arduinoPins[pin].mode = mode;
    }

    console.log('[Arduino] pinMode(' + pin + ', ' + mode + ')');
  };

  // Handler para digitalWrite()
  this.handleDigitalWrite = function(stmt) {
    var match = stmt.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW|1|0)\s*\)/);
    if (!match) return;

    var pin = match[1];
    var value = (match[2] === 'HIGH' || match[2] === '1') ? 1 : 0;

    // Inicializar pin si no existe
    if (!self.arduinoPins[pin]) {
      self.arduinoPins[pin] = { mode: 'OUTPUT', digital: value, pwm: 0 };
    } else {
      self.arduinoPins[pin].digital = value;
    }

    console.log('[Arduino] digitalWrite(' + pin + ', ' + (value ? 'HIGH' : 'LOW') + ')');

    // Actualizar motores después de cada cambio de pin
    self.updateArduinoMotors();
  };

  // Handler para analogWrite()
  this.handleAnalogWrite = function(stmt) {
    var match = stmt.match(/analogWrite\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!match) return;

    var pin = match[1];
    var value = parseInt(match[2]);

    // Inicializar pin si no existe
    if (!self.arduinoPins[pin]) {
      self.arduinoPins[pin] = { mode: 'OUTPUT', digital: 0, pwm: value };
    } else {
      self.arduinoPins[pin].pwm = value;
    }

    console.log('[Arduino] analogWrite(' + pin + ', ' + value + ')');

    // Actualizar motores después de cada cambio de pin
    self.updateArduinoMotors();
  };

  // Actualizar estado de motores basado en pines Arduino
  this.updateArduinoMotors = function() {
    if (!robot) {
      console.log('[Arduino] updateArduinoMotors: robot no disponible');
      return;
    }

    // Debug: mostrar estado actual de pines
    console.log('[Arduino] Estado actual de pines:', JSON.stringify(self.arduinoPins));

    // Motor izquierdo
    var leftPins = self.getArduinoMotorPins('motor_left');
    console.log('[Arduino] motor_left config:', leftPins ? JSON.stringify(leftPins) : 'NO CONFIGURADO');

    if (leftPins && leftPins.dir1 && leftPins.dir2 && leftPins.pwm) {
      var leftResult = self.calculateMotorFromPins(leftPins);
      if (leftResult.active && robot.leftWheel) {
        var speed = (leftResult.speed / 255) * 1050 * leftResult.direction;
        console.log('[Arduino] Motor LEFT: dir=' + leftResult.direction + ', pwm=' + leftResult.speed + ' -> speed_sp=' + speed.toFixed(0));
        robot.leftWheel.speed_sp = speed;
        if (leftResult.speed > 0 && leftResult.direction !== 0) {
          robot.leftWheel.runForever();
          console.log('[Arduino] Motor LEFT: runForever()');
        } else {
          robot.leftWheel.stop();
          console.log('[Arduino] Motor LEFT: stop()');
        }
      } else if (robot.leftWheel && leftResult.speed === 0) {
        robot.leftWheel.stop();
      }
    } else {
      console.log('[Arduino] Motor LEFT: pines no configurados completamente');
    }

    // Motor derecho
    var rightPins = self.getArduinoMotorPins('motor_right');
    console.log('[Arduino] motor_right config:', rightPins ? JSON.stringify(rightPins) : 'NO CONFIGURADO');

    if (rightPins && rightPins.dir1 && rightPins.dir2 && rightPins.pwm) {
      var rightResult = self.calculateMotorFromPins(rightPins);
      if (rightResult.active && robot.rightWheel) {
        var speed = (rightResult.speed / 255) * 1050 * rightResult.direction;
        console.log('[Arduino] Motor RIGHT: dir=' + rightResult.direction + ', pwm=' + rightResult.speed + ' -> speed_sp=' + speed.toFixed(0));
        robot.rightWheel.speed_sp = speed;
        if (rightResult.speed > 0 && rightResult.direction !== 0) {
          robot.rightWheel.runForever();
          console.log('[Arduino] Motor RIGHT: runForever()');
        } else {
          robot.rightWheel.stop();
          console.log('[Arduino] Motor RIGHT: stop()');
        }
      } else if (robot.rightWheel && rightResult.speed === 0) {
        robot.rightWheel.stop();
      }
    } else {
      console.log('[Arduino] Motor RIGHT: pines no configurados completamente');
    }
  };

  // Calcular dirección y velocidad del motor basado en pines H-bridge
  this.calculateMotorFromPins = function(pins) {
    var dir1Pin = self.normalizePin(pins.dir1);
    var dir2Pin = self.normalizePin(pins.dir2);
    var pwmPin = self.normalizePin(pins.pwm);

    // Buscar el estado del pin (con o sin prefijo)
    var dir1State = self.getPinState(dir1Pin, 'digital');
    var dir2State = self.getPinState(dir2Pin, 'digital');
    var pwmValue = self.getPinState(pwmPin, 'pwm');

    console.log('[Arduino] Pins: dir1=' + dir1Pin + '(' + dir1State + '), dir2=' + dir2Pin + '(' + dir2State + '), pwm=' + pwmPin + '(' + pwmValue + ')');

    var result = {
      active: false,
      direction: 0,
      speed: 0
    };

    // H-bridge típico:
    // dir1=HIGH, dir2=LOW  -> adelante
    // dir1=LOW,  dir2=HIGH -> atrás
    // dir1=LOW,  dir2=LOW  -> detenido (coast)
    // dir1=HIGH, dir2=HIGH -> detenido (brake)

    if (dir1State === 1 && dir2State === 0) {
      result.active = true;
      result.direction = 1;  // Adelante
      result.speed = pwmValue;
    } else if (dir1State === 0 && dir2State === 1) {
      result.active = true;
      result.direction = -1; // Atrás
      result.speed = pwmValue;
    } else {
      result.active = true;
      result.direction = 0;
      result.speed = 0;
    }

    return result;
  };

  // Obtener estado de un pin (busca con varias variantes del nombre)
  this.getPinState = function(pin, type) {
    var normalized = self.normalizePin(pin);

    // Intentar con el pin normalizado
    if (self.arduinoPins[normalized]) {
      return type === 'pwm' ? self.arduinoPins[normalized].pwm : self.arduinoPins[normalized].digital;
    }

    // Intentar con prefijos D y A
    if (self.arduinoPins['D' + normalized]) {
      return type === 'pwm' ? self.arduinoPins['D' + normalized].pwm : self.arduinoPins['D' + normalized].digital;
    }
    if (self.arduinoPins['A' + normalized]) {
      return type === 'pwm' ? self.arduinoPins['A' + normalized].pwm : self.arduinoPins['A' + normalized].digital;
    }

    return 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIAL ARDUINO - Comunicación con monitor serial de STBlock
  // ═══════════════════════════════════════════════════════════════════════════

  this.serialInitialized = false;

  // Handler para Serial.begin()
  this.handleSerialBegin = function(stmt) {
    var match = stmt.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
    if (match) {
      self.serialInitialized = true;
      console.log('[Arduino] Serial.begin(' + match[1] + ')');
    }
  };

  // Handler para Serial.print()
  this.handleSerialPrint = function(stmt) {
    var value = self.extractSerialValue(stmt, 'Serial.print');
    if (value !== null) {
      self.sendToSerial(value, false);
    }
  };

  // Handler para Serial.println()
  this.handleSerialPrintln = function(stmt) {
    var value = self.extractSerialValue(stmt, 'Serial.println');
    if (value !== null) {
      self.sendToSerial(value, true);
    }
  };

  // Extraer valor de Serial.print/println (maneja expresiones anidadas)
  this.extractSerialValue = function(stmt, funcName) {
    // Buscar el contenido entre paréntesis (maneja paréntesis anidados)
    var startIdx = stmt.indexOf(funcName);
    if (startIdx === -1) return null;

    var parenStart = stmt.indexOf('(', startIdx);
    if (parenStart === -1) return null;

    var parenCount = 1;
    var parenEnd = parenStart + 1;
    while (parenCount > 0 && parenEnd < stmt.length) {
      if (stmt[parenEnd] === '(') parenCount++;
      else if (stmt[parenEnd] === ')') parenCount--;
      parenEnd++;
    }

    var content = stmt.substring(parenStart + 1, parenEnd - 1).trim();
    console.log('[Arduino] Serial content: "' + content + '"');

    // Si está vacío
    if (content === '') return '';

    // Si es una cadena de texto
    if ((content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))) {
      return content.slice(1, -1);
    }

    // Si es una llamada a función de sensor
    var sensorValue = self.evaluateSensorExpression(content);
    if (sensorValue !== null) {
      return sensorValue;
    }

    // Si es un número
    var num = parseFloat(content);
    if (!isNaN(num)) {
      return num;
    }

    // Si es concatenación de strings y valores
    if (content.includes('+')) {
      return self.evaluateConcatenation(content);
    }

    // Si es una variable o expresión, intentar evaluar
    return content;
  };

  // Evaluar concatenación de strings
  this.evaluateConcatenation = function(expr) {
    var parts = expr.split('+');
    var result = '';

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();

      // String literal
      if ((part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("'") && part.endsWith("'"))) {
        result += part.slice(1, -1);
        continue;
      }

      // Sensor expression
      var sensorVal = self.evaluateSensorExpression(part);
      if (sensorVal !== null) {
        result += String(sensorVal);
        continue;
      }

      // Número
      var num = parseFloat(part);
      if (!isNaN(num)) {
        result += String(num);
        continue;
      }

      // Variable desconocida
      result += part;
    }

    return result;
  };

  // Evaluar expresión de sensor
  this.evaluateSensorExpression = function(expr) {
    // Lambda de ultrasónico generada por STBlock:
    // ([]() { digitalWrite(9, LOW); ... pulseIn(10, HIGH) * 0.034 / 2; })()
    var lambdaUltraMatch = expr.match(/\[\]\s*\(\s*\)\s*\{.*?pulseIn\s*\(\s*(\d+)\s*,\s*HIGH\s*\).*?\}\s*\)\s*\(\s*\)/);
    if (lambdaUltraMatch) {
      var echoPin = lambdaUltraMatch[1];
      console.log('[Arduino] Detectada lambda ultrasónica, echoPin=' + echoPin);
      return self.readArduinoUltrasonic(echoPin);
    }

    // pulseIn(pin, HIGH) * 0.034 / 2 (cálculo de distancia ultrasónica)
    var pulseInMatch = expr.match(/pulseIn\s*\(\s*(\d+)\s*,\s*HIGH\s*\)/);
    if (pulseInMatch) {
      return self.readArduinoUltrasonic(pulseInMatch[1]);
    }

    // ultrasonic_read(pin) o ultrasonicRead(pin)
    var ultraMatch = expr.match(/ultrasonic[_]?[rR]ead\s*\(\s*(\d+)\s*\)/i);
    if (ultraMatch) {
      var pin = ultraMatch[1];
      return self.readArduinoUltrasonic(pin);
    }

    // getUltrasonicDistance(trigPin, echoPin)
    var ultraMatch2 = expr.match(/getUltrasonicDistance\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (ultraMatch2) {
      return self.readArduinoUltrasonic(ultraMatch2[1]);
    }

    // stbReadUltrasonic(port)
    var stbUltraMatch = expr.match(/stbReadUltrasonic\s*\(\s*(\d+)\s*\)/);
    if (stbUltraMatch) {
      return self.readArduinoUltrasonic(stbUltraMatch[1]);
    }

    // leerUltrasonico(trig, echo) - formato español
    var leerUltraMatch = expr.match(/leerUltrasonico\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (leerUltraMatch) {
      return self.readArduinoUltrasonic(leerUltraMatch[2]); // Usar echo pin
    }

    // stbV2UltrasonicReadCm(trig, echo) - STBoard V2 con pines
    var stbV2UltraCmMatch = expr.match(/stbV2UltrasonicReadCm\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (stbV2UltraCmMatch) {
      console.log('[Arduino] Detectado stbV2UltrasonicReadCm, trig=' + stbV2UltraCmMatch[1] + ', echo=' + stbV2UltraCmMatch[2]);
      return self.readArduinoUltrasonic(stbV2UltraCmMatch[2]); // Usar echo pin
    }

    // stbV2UltrasonicReadInch(trig, echo) - STBoard V2 pulgadas
    var stbV2UltraInchMatch = expr.match(/stbV2UltrasonicReadInch\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (stbV2UltraInchMatch) {
      var distanceCm = self.readArduinoUltrasonic(stbV2UltraInchMatch[2]);
      return Math.round(distanceCm / 2.54 * 10) / 10; // Convertir a pulgadas
    }

    // stbV2UltrasonicRead(port) - STBoard V2 puerto simple
    var stbV2UltraMatch = expr.match(/stbV2UltrasonicRead\s*\(\s*(\d+)\s*\)/);
    if (stbV2UltraMatch) {
      return self.readArduinoUltrasonic(stbV2UltraMatch[1]);
    }

    // analogRead(pin)
    var analogMatch = expr.match(/analogRead\s*\(\s*(\d+)\s*\)/);
    if (analogMatch) {
      return self.readAnalogSensor(analogMatch[1]);
    }

    // digitalRead(pin)
    var digitalMatch = expr.match(/digitalRead\s*\(\s*(\d+)\s*\)/);
    if (digitalMatch) {
      return self.readDigitalSensor(digitalMatch[1]);
    }

    // ═══ SENSOR DE COLOR STBoard V2 ═══

    // stbV2ColorReadName() - nombre del color detectado
    if (expr.match(/stbV2ColorReadName\s*\(\s*\)/)) {
      var colorName = self.readColorSensor();
      console.log('[STBlock] stbV2ColorReadName() = ' + colorName);
      return colorName;
    }

    // stbV2ColorReadRed() - componente rojo (0-255)
    if (expr.match(/stbV2ColorReadRed\s*\(\s*\)/)) {
      var red = self.readColorRed();
      console.log('[STBlock] stbV2ColorReadRed() = ' + red);
      return red;
    }

    // stbV2ColorReadGreen() - componente verde (0-255)
    if (expr.match(/stbV2ColorReadGreen\s*\(\s*\)/)) {
      var green = self.readColorGreen();
      console.log('[STBlock] stbV2ColorReadGreen() = ' + green);
      return green;
    }

    // stbV2ColorReadBlue() - componente azul (0-255)
    if (expr.match(/stbV2ColorReadBlue\s*\(\s*\)/)) {
      var blue = self.readColorBlue();
      console.log('[STBlock] stbV2ColorReadBlue() = ' + blue);
      return blue;
    }

    // stbV2ColorReadClear() - claridad/luminosidad
    if (expr.match(/stbV2ColorReadClear\s*\(\s*\)/)) {
      var clear = self.readColorClear();
      console.log('[STBlock] stbV2ColorReadClear() = ' + clear);
      return clear;
    }

    // stbV2ColorReadHue() - tono (0-360)
    if (expr.match(/stbV2ColorReadHue\s*\(\s*\)/)) {
      var hue = self.readColorHue();
      console.log('[STBlock] stbV2ColorReadHue() = ' + hue);
      return hue;
    }

    // stbV2ColorIsColor("COLOR") - comparación de color
    var colorIsMatch = expr.match(/stbV2ColorIsColor\s*\(\s*["']?(\w+)["']?\s*\)/);
    if (colorIsMatch) {
      var targetColor = colorIsMatch[1];
      var result = self.isColorEqual(targetColor);
      console.log('[STBlock] stbV2ColorIsColor(' + targetColor + ') = ' + result);
      return result ? 1 : 0;
    }

    // stbV2TcsOk - sensor de color conectado?
    if (expr.match(/stbV2TcsOk/)) {
      var connected = self.isColorSensorConnected();
      console.log('[STBlock] stbV2TcsOk = ' + connected);
      return connected ? 1 : 0;
    }

    // ═══ SENSOR GIROSCOPIO STBoard V2 ═══

    // stbV2GyroReady() - giroscopio listo?
    if (expr.match(/stbV2GyroReady\s*\(\s*\)/)) {
      var ready = self.isGyroReady();
      console.log('[STBlock] stbV2GyroReady() = ' + ready);
      return ready ? 1 : 0;
    }

    // stbV2GetGyroAngle() - ángulo del giroscopio
    if (expr.match(/stbV2GetGyroAngle\s*\(\s*\)/)) {
      var angle = self.getGyroAngle();
      console.log('[STBlock] stbV2GetGyroAngle() = ' + angle.toFixed(2));
      return angle;
    }

    // stbV2Gyro.angleDeg - ángulo directo
    if (expr.match(/stbV2Gyro\.angleDeg/)) {
      var angle = self.getGyroAngle();
      return angle;
    }

    // stbV2GetTiltAngleDeg() - ángulo de inclinación
    if (expr.match(/stbV2GetTiltAngleDeg\s*\(\s*\)/)) {
      var tilt = self.getTiltAngle();
      console.log('[STBlock] stbV2GetTiltAngleDeg() = ' + tilt.toFixed(2));
      return tilt;
    }

    // stbV2GetGyroAngularVelocity(String("AXIS")) - velocidad angular
    var angVelMatch = expr.match(/stbV2GetGyroAngularVelocity\s*\(\s*String\s*\(\s*["'](\w)["']\s*\)\s*\)/);
    if (angVelMatch) {
      var axis = angVelMatch[1];
      var velocity = self.getGyroAngularVelocity(axis);
      console.log('[STBlock] stbV2GetGyroAngularVelocity(' + axis + ') = ' + velocity.toFixed(2));
      return velocity;
    }

    // stbV2GetGyroAcceleration(String("AXIS")) - aceleración
    var accelMatch = expr.match(/stbV2GetGyroAcceleration\s*\(\s*String\s*\(\s*["'](\w)["']\s*\)\s*\)/);
    if (accelMatch) {
      var axis = accelMatch[1];
      var accel = self.getGyroAcceleration(axis);
      console.log('[STBlock] stbV2GetGyroAcceleration(' + axis + ') = ' + accel.toFixed(2));
      return accel;
    }

    // stbV2IsShaken() - tarjeta agitada?
    if (expr.match(/stbV2IsShaken\s*\(\s*\)/)) {
      var shaken = self.isShaken();
      console.log('[STBlock] stbV2IsShaken() = ' + shaken);
      return shaken ? 1 : 0;
    }

    // stbV2IsTilted(threshold) - tarjeta inclinada?
    var tiltedMatch = expr.match(/stbV2IsTilted\s*\(\s*([\d.]+)\s*\)/);
    if (tiltedMatch) {
      var threshold = parseFloat(tiltedMatch[1]);
      var tilted = self.isTilted(threshold);
      console.log('[STBlock] stbV2IsTilted(' + threshold + ') = ' + tilted);
      return tilted ? 1 : 0;
    }

    // stbV2IsTilted(STB_V2_GYRO_TILT_THRESHOLD_DEG) - con constante
    if (expr.match(/stbV2IsTilted\s*\(\s*STB_V2_GYRO_TILT_THRESHOLD_DEG\s*\)/)) {
      var tilted = self.isTilted(20); // Umbral por defecto: 20 grados
      console.log('[STBlock] stbV2IsTilted(default) = ' + tilted);
      return tilted ? 1 : 0;
    }

    // stbV2CompareFloat(value, condition, threshold) - comparación de flotantes
    var compareFloatMatch = expr.match(/stbV2CompareFloat\s*\(\s*(.+?)\s*,\s*String\s*\(\s*["'](\w+)["']\s*\)\s*,\s*([\d.-]+)\s*\)/);
    if (compareFloatMatch) {
      var valueExpr = compareFloatMatch[1];
      var condition = compareFloatMatch[2];
      var threshold = parseFloat(compareFloatMatch[3]);

      // Evaluar la expresión del valor
      var value = self.evaluateSensorExpression(valueExpr);
      if (value === null) {
        value = self.evaluateExpression(valueExpr);
      }

      var result = false;
      switch (condition) {
        case 'GT': result = value > threshold; break;
        case 'GE': result = value >= threshold; break;
        case 'LT': result = value < threshold; break;
        case 'LE': result = value <= threshold; break;
        case 'EQ': result = Math.abs(value - threshold) < 0.01; break;
        case 'NE': result = Math.abs(value - threshold) >= 0.01; break;
        default: result = false;
      }

      console.log('[STBlock] stbV2CompareFloat(' + value.toFixed(2) + ', ' + condition + ', ' + threshold + ') = ' + result);
      return result ? 1 : 0;
    }

    return null;
  };

  // Enviar al monitor serial de STBlock
  this.sendToSerial = function(value, newline) {
    var text = String(value);

    console.log('[Arduino] Serial: ' + text + (newline ? ' (newline)' : ''));

    // Enviar a STBlock via STBlockBridge
    if (typeof STBlockBridge !== 'undefined' && STBlockBridge.sendSerial) {
      STBlockBridge.sendSerial(text, newline);
    } else {
      // Fallback: enviar via postMessage directamente
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'gearbot-serial',
          text: text + (newline ? '\n' : ''),
          timestamp: Date.now()
        }, '*');
      }

      // También mostrar en consola de GearsBot
      if (typeof simPanel !== 'undefined' && simPanel.consoleWrite) {
        simPanel.consoleWrite(text + (newline ? '\n' : ''));
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LECTURA DE SENSORES ARDUINO
  // ═══════════════════════════════════════════════════════════════════════════

  // Leer sensor ultrasónico
  this.readArduinoUltrasonic = function(pin) {
    if (!robot || !robot.components) {
      console.log('[Arduino] Ultrasonic: robot no disponible');
      return 999;
    }

    // Buscar sensor ultrasónico configurado en ese puerto/pin
    var sensorConfig = self.findSensorByPin('UltrasonicSensor', pin);

    // Buscar el componente del robot
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'UltrasonicSensor' && comp.getDistance) {
        var distance = comp.getDistance();
        console.log('[Arduino] Ultrasonic pin ' + pin + ': ' + distance.toFixed(1) + ' cm');
        return Math.round(distance * 10) / 10; // 1 decimal
      }
    }

    console.log('[Arduino] Ultrasonic: sensor no encontrado');
    return 999;
  };

  // Leer sensor analógico
  this.readAnalogSensor = function(pin) {
    // Por ahora, simular lectura analógica
    // Buscar sensores que usen ese pin
    console.log('[Arduino] analogRead(' + pin + ')');

    if (!robot || !robot.components) return 0;

    // Buscar sensor de color o línea en ese pin
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'ColorSensor' && comp.getRGB) {
        var rgb = comp.getRGB();
        // Devolver intensidad promedio
        return Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
      }
      if (comp.type === 'LineFollowerSensor' && comp.getValue) {
        return comp.getValue();
      }
    }

    return 0;
  };

  // Leer sensor digital
  this.readDigitalSensor = function(pin) {
    console.log('[Arduino] digitalRead(' + pin + ')');

    if (!robot || !robot.components) return 0;

    // Buscar sensor táctil
    for (var i = 0; i < robot.components.length; i++) {
      var comp = robot.components[i];
      if (comp.type === 'TouchSensor' && comp.isPressed) {
        return comp.isPressed() ? 1 : 0;
      }
    }

    return 0;
  };

  // Buscar configuración de sensor por pin
  this.findSensorByPin = function(sensorType, pin) {
    if (typeof simPanel === 'undefined' || !simPanel.pinConfiguration) return null;

    var normalizedPin = self.normalizePin(pin);

    for (var compId in simPanel.pinConfiguration.components) {
      var comp = simPanel.pinConfiguration.components[compId];
      if (comp.type === sensorType) {
        for (var pinId in comp.pins) {
          if (self.normalizePin(comp.pins[pinId]) === normalizedPin) {
            return comp;
          }
        }
      }
    }

    return null;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECCIÓN DE CÓDIGO STBLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  this.isSTBlockCode = function(code) {
    var indicators = [
      'stbV2',
      '#include <Wire.h>',
      '#include <Adafruit_',
      'void setup()',
      'STB_V2_',
      'stbV2Motors',
      'stbV2Gyro'
    ];

    for (var i = 0; i < indicators.length; i++) {
      if (code.includes(indicators[i])) {
        return true;
      }
    }
    return false;
  };

  this.stop = function() {
    self.running = false;
    self.stopLoop();
    if (robot) {
      if (robot.leftWheel) robot.leftWheel.stop();
      if (robot.rightWheel) robot.rightWheel.stop();
    }
    console.log('[STBlock] Intérprete detenido');
  };
};

window.stblockInterpreter = stblockInterpreter;
