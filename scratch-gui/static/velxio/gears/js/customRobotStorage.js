/**
 * customRobotStorage.js
 * API para almacenar y gestionar robots personalizados en localStorage
 * Diseñado para el editor de robots personalizado para niños
 */

var customRobotStorage = (function() {
  'use strict';

  var STORAGE_KEY = 'stblock_custom_robots';

  /**
   * Obtiene todos los robots guardados
   * @returns {Array} Lista de robots guardados
   */
  function getAll() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      var robots = JSON.parse(data);
      return Array.isArray(robots) ? robots : [];
    } catch (e) {
      console.error('[customRobotStorage] Error al leer robots:', e);
      return [];
    }
  }

  /**
   * Obtiene un robot por su ID
   * @param {string} id - ID del robot
   * @returns {Object|null} Robot encontrado o null
   */
  function getById(id) {
    var robots = getAll();
    return robots.find(function(robot) { return robot.id === id; }) || null;
  }

  /**
   * Obtiene robots filtrados por tipo de tarjeta
   * @param {string} boardType - Tipo de tarjeta (ej: 'arduinoNano', 'arduinoUno', 'stbBoardV2')
   * @returns {Array} Lista de robots compatibles
   */
  function getByBoardType(boardType) {
    var robots = getAll();
    if (!boardType) return robots;

    return robots.filter(function(robot) {
      // Si el robot no tiene boardType definido, asume que es compatible
      if (!robot.boardType) return true;
      // Verifica compatibilidad exacta o si la tarjeta es compatible
      return robot.boardType === boardType || isCompatibleBoard(robot.boardType, boardType);
    });
  }

  /**
   * Verifica si dos tipos de tarjeta son compatibles
   * @param {string} robotBoard - Tipo de tarjeta del robot
   * @param {string} targetBoard - Tipo de tarjeta objetivo
   * @returns {boolean} true si son compatibles
   */
  function isCompatibleBoard(robotBoard, targetBoard) {
    // Definir grupos de compatibilidad (tarjetas con pines similares)
    var arduinoUnoGroup = ['arduinoUno', 'arduinoNano', 'arduinoLeonardo', 'arduinoUnoR4Minima', 'arduinoUnoR4Wifi'];
    var arduinoMegaGroup = ['arduinoMega2560'];
    var stboardGroup = ['stbBoardV1', 'stbBoardV2', 'stBoardExtension'];
    var esp32Group = ['arduinoEsp32', 'arduinoEsp32S3'];
    var esp8266Group = ['arduinoEsp8266NodeMCU'];
    var picoGroup = ['arduinoRaspberryPiPico', 'arduinoRaspberryPiPicoW', 'arduinoRaspberryPiPico2', 'arduinoRaspberryPiPico2W'];
    var microbitGroup = ['microbit', 'microbitV2'];
    var k210Group = ['arduinoK210MaixDock', 'arduinoK210Maixduino'];
    var legoGroup = ['ev3'];

    function inSameGroup(a, b, group) {
      return group.indexOf(a) !== -1 && group.indexOf(b) !== -1;
    }

    // Las tarjetas del mismo grupo son compatibles
    if (inSameGroup(robotBoard, targetBoard, arduinoUnoGroup)) return true;
    if (inSameGroup(robotBoard, targetBoard, arduinoMegaGroup)) return true;
    if (inSameGroup(robotBoard, targetBoard, stboardGroup)) return true;
    if (inSameGroup(robotBoard, targetBoard, esp32Group)) return true;
    if (inSameGroup(robotBoard, targetBoard, esp8266Group)) return true;
    if (inSameGroup(robotBoard, targetBoard, picoGroup)) return true;
    if (inSameGroup(robotBoard, targetBoard, microbitGroup)) return true;
    if (inSameGroup(robotBoard, targetBoard, k210Group)) return true;
    if (inSameGroup(robotBoard, targetBoard, legoGroup)) return true;

    return false;
  }

  /**
   * Guarda o actualiza un robot
   * @param {Object} robot - Datos del robot a guardar
   * @returns {Object} Robot guardado con metadatos actualizados
   */
  function save(robot) {
    if (!robot || typeof robot !== 'object') {
      throw new Error('Robot inválido');
    }

    var robots = getAll();
    var now = new Date().toISOString();
    var existingIndex = robots.findIndex(function(r) { return r.id === robot.id; });

    // Asegurar que tenga un ID único
    if (!robot.id) {
      robot.id = 'custom-robot-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    }

    // Actualizar metadatos de tiempo
    if (existingIndex >= 0) {
      robot.updatedAt = now;
      robot.createdAt = robots[existingIndex].createdAt || now;
      robots[existingIndex] = robot;
    } else {
      robot.createdAt = now;
      robot.updatedAt = now;
      robots.push(robot);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(robots));
      return robot;
    } catch (e) {
      console.error('[customRobotStorage] Error al guardar robot:', e);
      throw new Error('No se pudo guardar el robot. Revisa el espacio de almacenamiento.');
    }
  }

  /**
   * Elimina un robot por su ID
   * @param {string} id - ID del robot a eliminar
   * @returns {boolean} true si se eliminó, false si no existía
   */
  function remove(id) {
    var robots = getAll();
    var initialLength = robots.length;
    robots = robots.filter(function(robot) { return robot.id !== id; });

    if (robots.length === initialLength) {
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(robots));
      return true;
    } catch (e) {
      console.error('[customRobotStorage] Error al eliminar robot:', e);
      throw new Error('No se pudo eliminar el robot.');
    }
  }

  /**
   * Exporta un robot a JSON (descarga archivo)
   * @param {Object} robot - Robot a exportar
   * @param {string} [filename] - Nombre del archivo (opcional)
   */
  function exportToJSON(robot, filename) {
    if (!robot) {
      throw new Error('No hay robot para exportar');
    }

    var exportData = {
      schema: 'stblock-custom-robot-v1',
      exportedAt: new Date().toISOString(),
      robot: robot
    };

    var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || (robot.name || 'mi-robot').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Importa un robot desde JSON (archivo o string)
   * @param {string|Object} json - JSON string o objeto parseado
   * @returns {Object} Robot importado y guardado
   */
  function importFromJSON(json) {
    var data;

    try {
      if (typeof json === 'string') {
        data = JSON.parse(json);
      } else {
        data = json;
      }
    } catch (e) {
      throw new Error('El archivo no tiene un formato JSON válido');
    }

    // Verificar estructura del archivo exportado
    var robot;
    if (data.schema === 'stblock-custom-robot-v1' && data.robot) {
      robot = data.robot;
    } else if (data.chassis || data.components) {
      // Compatibilidad con formato directo de robot
      robot = data;
    } else {
      throw new Error('El formato del archivo no es compatible');
    }

    // Generar nuevo ID para evitar conflictos
    var originalName = robot.name || 'Robot Importado';
    robot.id = 'custom-robot-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    robot.name = originalName + ' (importado)';
    robot.importedAt = new Date().toISOString();

    return save(robot);
  }

  /**
   * Importa desde un archivo File
   * @param {File} file - Archivo a importar
   * @returns {Promise<Object>} Promesa que resuelve al robot importado
   */
  function importFromFile(file) {
    return new Promise(function(resolve, reject) {
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }

      var reader = new FileReader();
      reader.onload = function() {
        try {
          var robot = importFromJSON(reader.result);
          resolve(robot);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function() {
        reject(new Error('Error al leer el archivo'));
      };
      reader.readAsText(file);
    });
  }

  /**
   * Genera un thumbnail del canvas como base64
   * @param {HTMLCanvasElement} canvas - Canvas 3D del robot
   * @param {number} [maxSize=200] - Tamaño máximo del thumbnail
   * @returns {string} Data URL de la imagen
   */
  function generateThumbnail(canvas, maxSize) {
    maxSize = maxSize || 200;

    var thumbCanvas = document.createElement('canvas');
    var size = Math.min(canvas.width, canvas.height, maxSize);
    thumbCanvas.width = size;
    thumbCanvas.height = size;

    var ctx = thumbCanvas.getContext('2d');
    var scale = size / Math.max(canvas.width, canvas.height);
    var w = canvas.width * scale;
    var h = canvas.height * scale;
    var x = (size - w) / 2;
    var y = (size - h) / 2;

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(canvas, x, y, w, h);

    return thumbCanvas.toDataURL('image/png', 0.8);
  }

  /**
   * Duplica un robot existente
   * @param {string} id - ID del robot a duplicar
   * @returns {Object} Robot duplicado y guardado
   */
  function duplicate(id) {
    var original = getById(id);
    if (!original) {
      throw new Error('Robot no encontrado');
    }

    var copy = JSON.parse(JSON.stringify(original));
    copy.id = 'custom-robot-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    copy.name = (original.name || 'Robot') + ' (copia)';
    delete copy.createdAt;
    delete copy.updatedAt;

    return save(copy);
  }

  /**
   * Obtiene estadísticas de almacenamiento
   * @returns {Object} Estadísticas {count, usedBytes, estimatedLimit}
   */
  function getStats() {
    var robots = getAll();
    var dataSize = localStorage.getItem(STORAGE_KEY) || '';

    return {
      count: robots.length,
      usedBytes: dataSize.length * 2, // UTF-16 = 2 bytes per char
      estimatedLimit: 5 * 1024 * 1024 // ~5MB typical localStorage limit
    };
  }

  /**
   * Convierte un robot personalizado al formato robotTemplate para usar en el simulador
   * @param {Object} customRobot - Robot guardado en localStorage
   * @returns {Object} Robot en formato compatible con robotTemplates
   */
  function toSimulatorFormat(customRobot) {
    if (!customRobot || !customRobot.chassis) {
      throw new Error('Robot inválido para conversión');
    }

    var chassis = customRobot.chassis;
    var wheels = customRobot.wheels || [];
    var components = customRobot.components || [];

    // Calcular dimensiones de ruedas basado en los datos guardados
    var wheelLeft = wheels.find(function(w) { return w.id === 'wheel-left' || w.port === 'A1'; });
    var wheelRight = wheels.find(function(w) { return w.id === 'wheel-right' || w.port === 'A2'; });

    var wheelRadius = wheelLeft ? wheelLeft.radius : 4.0;
    var wheelWidth = wheelLeft ? wheelLeft.width : 2.0;
    var wheelSpacingX = 0;
    if (wheelLeft && wheelRight) {
      wheelSpacingX = Math.abs(wheelRight.position[0] - wheelLeft.position[0]);
    } else {
      wheelSpacingX = chassis.size[0] + 2;
    }

    // Convertir componentes al formato del simulador
    var simComponents = components.map(function(comp) {
      return {
        type: comp.type,
        position: comp.position || [0, 0, 0],
        rotation: comp.rotation || [0, 0, 0],
        options: comp.options || null
      };
    });

    return {
      name: customRobot.id,
      shortDescription: customRobot.name || 'Robot Personalizado',
      longDescription: '<p>Robot creado con el Editor de Robots STBlock</p>',
      longerDescription: '',
      thumbnail: customRobot.thumbnail || '',
      bodyWidth: chassis.size[0],
      bodyLength: chassis.size[1],
      bodyHeight: chassis.size[2],
      bodyColor: chassis.color || '#f09c0d',
      bodyMass: chassis.mass || 120,
      bodyFriction: chassis.friction || 0.5,
      wheelDiameter: wheelRadius * 2,
      wheelWidth: wheelWidth,
      wheelToBodyOffset: 0.2,
      bodyEdgeToWheelCenterY: 1,
      bodyEdgeToWheelCenterZ: (chassis.size[1] / 2) - 2,
      wheelMass: 200,
      casterMass: 0,
      caster: true,
      wheelFriction: 10,
      casterFriction: 0,
      components: simComponents,
      // Datos extra para mantener compatibilidad
      customRobotId: customRobot.id,
      isCustomRobot: true,
      boardType: customRobot.boardType || 'stbBoardV2',
      driftEnabled: chassis.driftEnabled || false,
      driftLeft: chassis.driftLeft || 10
    };
  }

  // API pública
  return {
    getAll: getAll,
    getById: getById,
    getByBoardType: getByBoardType,
    isCompatibleBoard: isCompatibleBoard,
    save: save,
    remove: remove,
    delete: remove, // Alias
    exportToJSON: exportToJSON,
    importFromJSON: importFromJSON,
    importFromFile: importFromFile,
    generateThumbnail: generateThumbnail,
    duplicate: duplicate,
    getStats: getStats,
    toSimulatorFormat: toSimulatorFormat,
    STORAGE_KEY: STORAGE_KEY
  };
})();

// Exportar para uso en módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = customRobotStorage;
}
