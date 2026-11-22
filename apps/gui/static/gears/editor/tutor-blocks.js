/**
 * STBlock - Sistema de Bloques Visuales para Evaluaciones
 * Renderizado SVG idéntico a Scratch
 *
 * @author STB Academy
 * @version 2.0.0
 */

(function(global) {
  'use strict';

  // ==================== CONFIGURACIÓN DE COLORES (Scratch Exact) ====================
  var BLOCK_COLORS = {
    motion: { primary: '#4C97FF', secondary: '#4280D7', tertiary: '#3373CC' },
    looks: { primary: '#9966FF', secondary: '#855CD6', tertiary: '#774DCB' },
    sound: { primary: '#CF63CF', secondary: '#C94FC9', tertiary: '#BD42BD' },
    control: { primary: '#FFAB19', secondary: '#EC9C13', tertiary: '#CF8B17' },
    events: { primary: '#FFBF00', secondary: '#E6AC00', tertiary: '#CC9900' },
    sensing: { primary: '#5CB1D6', secondary: '#47A8D1', tertiary: '#2E8EB8' },
    operators: { primary: '#59C059', secondary: '#46B946', tertiary: '#389438' },
    variables: { primary: '#FF8C1A', secondary: '#FF8000', tertiary: '#DB6E00' },
    lists: { primary: '#FF661A', secondary: '#FF5500', tertiary: '#E64D00' },
    myblocks: { primary: '#FF6680', secondary: '#FF4D6A', tertiary: '#FF3355' },
    pen: { primary: '#0fBD8C', secondary: '#0DA57A', tertiary: '#0B8E69' }
  };

  // ==================== DIMENSIONES SCRATCH ====================
  var BLOCK_HEIGHT = 40;
  var BLOCK_MIN_WIDTH = 80;
  var NOTCH_WIDTH = 8;
  var NOTCH_HEIGHT = 4;
  var CORNER_RADIUS = 4;
  var HAT_HEIGHT = 20;
  var INPUT_HEIGHT = 24;
  var REPORTER_RADIUS = 12;
  var BOOLEAN_NOTCH = 8;

  // ==================== CATÁLOGO DE BLOQUES ====================
  var BLOCK_CATALOG = {
    // === MOVIMIENTO ===
    motion_movesteps: { category: 'motion', shape: 'stack', text: 'mover %1 pasos', args: [{ type: 'number', default: 10 }] },
    motion_turnright: { category: 'motion', shape: 'stack', text: 'girar ↻ %1 grados', args: [{ type: 'number', default: 15 }] },
    motion_turnleft: { category: 'motion', shape: 'stack', text: 'girar ↺ %1 grados', args: [{ type: 'number', default: 15 }] },
    motion_goto: { category: 'motion', shape: 'stack', text: 'ir a x: %1 y: %2', args: [{ type: 'number', default: 0 }, { type: 'number', default: 0 }] },
    motion_glideto: { category: 'motion', shape: 'stack', text: 'deslizar en %1 segs a x: %2 y: %3', args: [{ type: 'number', default: 1 }, { type: 'number', default: 0 }, { type: 'number', default: 0 }] },
    motion_pointindirection: { category: 'motion', shape: 'stack', text: 'apuntar en dirección %1', args: [{ type: 'number', default: 90 }] },
    motion_changexby: { category: 'motion', shape: 'stack', text: 'cambiar x por %1', args: [{ type: 'number', default: 10 }] },
    motion_changeyby: { category: 'motion', shape: 'stack', text: 'cambiar y por %1', args: [{ type: 'number', default: 10 }] },
    motion_setx: { category: 'motion', shape: 'stack', text: 'fijar x a %1', args: [{ type: 'number', default: 0 }] },
    motion_sety: { category: 'motion', shape: 'stack', text: 'fijar y a %1', args: [{ type: 'number', default: 0 }] },
    motion_ifonedgebounce: { category: 'motion', shape: 'stack', text: 'rebotar si toca un borde', args: [] },
    motion_xposition: { category: 'motion', shape: 'reporter', text: 'posición en x', args: [] },
    motion_yposition: { category: 'motion', shape: 'reporter', text: 'posición en y', args: [] },
    motion_direction: { category: 'motion', shape: 'reporter', text: 'dirección', args: [] },

    // === APARIENCIA ===
    looks_sayforsecs: { category: 'looks', shape: 'stack', text: 'decir %1 por %2 segundos', args: [{ type: 'string', default: '¡Hola!' }, { type: 'number', default: 2 }] },
    looks_say: { category: 'looks', shape: 'stack', text: 'decir %1', args: [{ type: 'string', default: '¡Hola!' }] },
    looks_thinkforsecs: { category: 'looks', shape: 'stack', text: 'pensar %1 por %2 segundos', args: [{ type: 'string', default: 'Hmm...' }, { type: 'number', default: 2 }] },
    looks_think: { category: 'looks', shape: 'stack', text: 'pensar %1', args: [{ type: 'string', default: 'Hmm...' }] },
    looks_show: { category: 'looks', shape: 'stack', text: 'mostrar', args: [] },
    looks_hide: { category: 'looks', shape: 'stack', text: 'esconder', args: [] },
    looks_changesizeby: { category: 'looks', shape: 'stack', text: 'cambiar tamaño por %1', args: [{ type: 'number', default: 10 }] },
    looks_setsizeto: { category: 'looks', shape: 'stack', text: 'fijar tamaño a %1 %', args: [{ type: 'number', default: 100 }] },
    looks_size: { category: 'looks', shape: 'reporter', text: 'tamaño', args: [] },

    // === SONIDO ===
    sound_playuntildone: { category: 'sound', shape: 'stack', text: 'tocar sonido %1 hasta que termine', args: [{ type: 'dropdown', options: ['pop', 'meow'], default: 'pop' }] },
    sound_play: { category: 'sound', shape: 'stack', text: 'iniciar sonido %1', args: [{ type: 'dropdown', options: ['pop', 'meow'], default: 'pop' }] },
    sound_stopallsounds: { category: 'sound', shape: 'stack', text: 'detener todos los sonidos', args: [] },
    sound_changevolumeby: { category: 'sound', shape: 'stack', text: 'cambiar volumen por %1', args: [{ type: 'number', default: -10 }] },
    sound_setvolumeto: { category: 'sound', shape: 'stack', text: 'fijar volumen a %1 %', args: [{ type: 'number', default: 100 }] },
    sound_volume: { category: 'sound', shape: 'reporter', text: 'volumen', args: [] },

    // === EVENTOS ===
    event_whenflagclicked: { category: 'events', shape: 'hat', text: '🏴 al hacer clic en bandera', args: [] },
    event_whenkeypressed: { category: 'events', shape: 'hat', text: 'al presionar tecla %1', args: [{ type: 'dropdown', options: ['espacio', '↑', '↓', '→', '←', 'a', 'b'], default: 'espacio' }] },
    event_whenthisspriteclicked: { category: 'events', shape: 'hat', text: 'al hacer clic en este objeto', args: [] },
    event_whenbroadcastreceived: { category: 'events', shape: 'hat', text: 'al recibir %1', args: [{ type: 'dropdown', options: ['mensaje1'], default: 'mensaje1' }] },
    event_broadcast: { category: 'events', shape: 'stack', text: 'enviar %1', args: [{ type: 'dropdown', options: ['mensaje1'], default: 'mensaje1' }] },
    event_broadcastandwait: { category: 'events', shape: 'stack', text: 'enviar %1 y esperar', args: [{ type: 'dropdown', options: ['mensaje1'], default: 'mensaje1' }] },

    // === CONTROL ===
    control_wait: { category: 'control', shape: 'stack', text: 'esperar %1 segundos', args: [{ type: 'number', default: 1 }] },
    control_repeat: { category: 'control', shape: 'cblock', text: 'repetir %1', args: [{ type: 'number', default: 10 }] },
    control_forever: { category: 'control', shape: 'cblock', text: 'por siempre', args: [], isCap: true },
    control_if: { category: 'control', shape: 'cblock', text: 'si %1 entonces', args: [{ type: 'boolean' }] },
    control_if_else: { category: 'control', shape: 'cblock', text: 'si %1 entonces', args: [{ type: 'boolean' }], hasElse: true },
    control_wait_until: { category: 'control', shape: 'stack', text: 'esperar hasta que %1', args: [{ type: 'boolean' }] },
    control_repeat_until: { category: 'control', shape: 'cblock', text: 'repetir hasta que %1', args: [{ type: 'boolean' }] },
    control_stop: { category: 'control', shape: 'cap', text: 'detener %1', args: [{ type: 'dropdown', options: ['todos', 'este programa'], default: 'todos' }] },

    // === SENSORES ===
    sensing_touchingobject: { category: 'sensing', shape: 'boolean', text: '¿tocando %1?', args: [{ type: 'dropdown', options: ['puntero', 'borde'], default: 'puntero' }] },
    sensing_touchingcolor: { category: 'sensing', shape: 'boolean', text: '¿tocando color %1?', args: [{ type: 'color', default: '#ff0000' }] },
    sensing_distanceto: { category: 'sensing', shape: 'reporter', text: 'distancia a %1', args: [{ type: 'dropdown', options: ['puntero'], default: 'puntero' }] },
    sensing_askandwait: { category: 'sensing', shape: 'stack', text: 'preguntar %1 y esperar', args: [{ type: 'string', default: '¿Cómo te llamas?' }] },
    sensing_answer: { category: 'sensing', shape: 'reporter', text: 'respuesta', args: [] },
    sensing_keypressed: { category: 'sensing', shape: 'boolean', text: '¿tecla %1 presionada?', args: [{ type: 'dropdown', options: ['espacio', '↑', '↓'], default: 'espacio' }] },
    sensing_mousedown: { category: 'sensing', shape: 'boolean', text: '¿ratón presionado?', args: [] },
    sensing_mousex: { category: 'sensing', shape: 'reporter', text: 'posición x del ratón', args: [] },
    sensing_mousey: { category: 'sensing', shape: 'reporter', text: 'posición y del ratón', args: [] },
    sensing_timer: { category: 'sensing', shape: 'reporter', text: 'cronómetro', args: [] },
    sensing_resettimer: { category: 'sensing', shape: 'stack', text: 'reiniciar cronómetro', args: [] },

    // === OPERADORES ===
    operator_add: { category: 'operators', shape: 'reporter', text: '%1 + %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_subtract: { category: 'operators', shape: 'reporter', text: '%1 - %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_multiply: { category: 'operators', shape: 'reporter', text: '%1 * %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_divide: { category: 'operators', shape: 'reporter', text: '%1 / %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_random: { category: 'operators', shape: 'reporter', text: 'número al azar entre %1 y %2', args: [{ type: 'number', default: 1 }, { type: 'number', default: 10 }] },
    operator_gt: { category: 'operators', shape: 'boolean', text: '%1 > %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_lt: { category: 'operators', shape: 'boolean', text: '%1 < %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_equals: { category: 'operators', shape: 'boolean', text: '%1 = %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_and: { category: 'operators', shape: 'boolean', text: '%1 y %2', args: [{ type: 'boolean' }, { type: 'boolean' }] },
    operator_or: { category: 'operators', shape: 'boolean', text: '%1 o %2', args: [{ type: 'boolean' }, { type: 'boolean' }] },
    operator_not: { category: 'operators', shape: 'boolean', text: 'no %1', args: [{ type: 'boolean' }] },
    operator_join: { category: 'operators', shape: 'reporter', text: 'unir %1 %2', args: [{ type: 'string', default: 'hola' }, { type: 'string', default: 'mundo' }] },
    operator_length: { category: 'operators', shape: 'reporter', text: 'longitud de %1', args: [{ type: 'string', default: 'mundo' }] },
    operator_mod: { category: 'operators', shape: 'reporter', text: '%1 mod %2', args: [{ type: 'number', default: '' }, { type: 'number', default: '' }] },
    operator_round: { category: 'operators', shape: 'reporter', text: 'redondear %1', args: [{ type: 'number', default: '' }] },

    // === VARIABLES ===
    data_setvariableto: { category: 'variables', shape: 'stack', text: 'fijar %1 a %2', args: [{ type: 'variable', default: 'mi variable' }, { type: 'number', default: 0 }] },
    data_changevariableby: { category: 'variables', shape: 'stack', text: 'cambiar %1 por %2', args: [{ type: 'variable', default: 'mi variable' }, { type: 'number', default: 1 }] },
    data_showvariable: { category: 'variables', shape: 'stack', text: 'mostrar variable %1', args: [{ type: 'variable', default: 'mi variable' }] },
    data_hidevariable: { category: 'variables', shape: 'stack', text: 'esconder variable %1', args: [{ type: 'variable', default: 'mi variable' }] },

    // === LISTAS ===
    data_addtolist: { category: 'lists', shape: 'stack', text: 'añadir %1 a %2', args: [{ type: 'string', default: 'cosa' }, { type: 'list', default: 'lista' }] },
    data_deleteoflist: { category: 'lists', shape: 'stack', text: 'borrar %1 de %2', args: [{ type: 'number', default: 1 }, { type: 'list', default: 'lista' }] },
    data_lengthoflist: { category: 'lists', shape: 'reporter', text: 'longitud de %1', args: [{ type: 'list', default: 'lista' }] },

    // === LÁPIZ ===
    pen_clear: { category: 'pen', shape: 'stack', text: 'borrar todo', args: [] },
    pen_stamp: { category: 'pen', shape: 'stack', text: 'sellar', args: [] },
    pen_pendown: { category: 'pen', shape: 'stack', text: 'bajar lápiz', args: [] },
    pen_penup: { category: 'pen', shape: 'stack', text: 'subir lápiz', args: [] },
    pen_setpencolortocolor: { category: 'pen', shape: 'stack', text: 'fijar color de lápiz a %1', args: [{ type: 'color', default: '#0000ff' }] },
    pen_setpensizeto: { category: 'pen', shape: 'stack', text: 'fijar tamaño de lápiz a %1', args: [{ type: 'number', default: 1 }] }
  };

  // ==================== CATEGORÍAS ====================
  var BLOCK_CATEGORIES = [
    { id: 'motion', name: 'Movimiento', icon: '➡️' },
    { id: 'looks', name: 'Apariencia', icon: '👁️' },
    { id: 'sound', name: 'Sonido', icon: '🔊' },
    { id: 'events', name: 'Eventos', icon: '🏴' },
    { id: 'control', name: 'Control', icon: '🔄' },
    { id: 'sensing', name: 'Sensores', icon: '📡' },
    { id: 'operators', name: 'Operadores', icon: '🔢' },
    { id: 'variables', name: 'Variables', icon: '📦', hasCustom: true },
    { id: 'lists', name: 'Listas', icon: '📋' },
    { id: 'myblocks', name: 'Mis Bloques', icon: '🧩', hasCustom: true },
    { id: 'pen', name: 'Lápiz', icon: '✏️' }
  ];

  // ==================== GENERADOR DE PATHS SVG (Estilo Scratch) ====================
  var ScratchPaths = {
    // Muesca superior (donde encaja el bloque de arriba)
    topNotch: function() {
      return 'c 2,0 3,1 4,' + NOTCH_HEIGHT + ' l ' + NOTCH_WIDTH + ',0 c 1,-' + (NOTCH_HEIGHT-1) + ' 2,-' + NOTCH_HEIGHT + ' 4,-' + NOTCH_HEIGHT;
    },

    // Muesca inferior (donde encaja el bloque de abajo)
    bottomNotch: function() {
      return 'c -2,0 -3,1 -4,' + NOTCH_HEIGHT + ' l -' + NOTCH_WIDTH + ',0 c -1,-' + (NOTCH_HEIGHT-1) + ' -2,-' + NOTCH_HEIGHT + ' -4,-' + NOTCH_HEIGHT;
    },

    // Path para bloque stack (apilable normal)
    stackBlock: function(width, height) {
      var w = Math.max(width, BLOCK_MIN_WIDTH);
      var h = height || BLOCK_HEIGHT;
      var r = CORNER_RADIUS;

      return 'M ' + r + ',0 ' +
             'L 15,0 ' + this.topNotch() + ' ' +
             'L ' + (w - r) + ',0 ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' ' +
             'L ' + w + ',' + (h - r) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + ' ' +
             'L ' + (15 + NOTCH_WIDTH + 8) + ',' + h + ' ' + this.bottomNotch() + ' ' +
             'L ' + r + ',' + h + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',-' + r + ' ' +
             'L 0,' + r + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r + ' ' +
             'Z';
    },

    // Path para bloque hat (inicio - bandera verde, eventos)
    hatBlock: function(width, height) {
      var w = Math.max(width, BLOCK_MIN_WIDTH);
      var h = height || BLOCK_HEIGHT;
      var r = CORNER_RADIUS;
      var hatR = 20;

      return 'M 0,' + hatR + ' ' +
             'c 25,-22 71,-22 96,0 ' +
             'L ' + (w - r) + ',' + hatR + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' ' +
             'L ' + w + ',' + (h + hatR - r) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + ' ' +
             'L ' + (15 + NOTCH_WIDTH + 8) + ',' + (h + hatR) + ' ' + this.bottomNotch() + ' ' +
             'L ' + r + ',' + (h + hatR) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',-' + r + ' ' +
             'Z';
    },

    // Path para bloque cap (final - sin muesca inferior)
    capBlock: function(width, height) {
      var w = Math.max(width, BLOCK_MIN_WIDTH);
      var h = height || BLOCK_HEIGHT;
      var r = CORNER_RADIUS;
      var capR = 12;

      return 'M ' + r + ',0 ' +
             'L 15,0 ' + this.topNotch() + ' ' +
             'L ' + (w - r) + ',0 ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' ' +
             'L ' + w + ',' + (h - capR) + ' ' +
             'a ' + capR + ',' + capR + ' 0 0 1 -' + capR + ',' + capR + ' ' +
             'L ' + capR + ',' + h + ' ' +
             'a ' + capR + ',' + capR + ' 0 0 1 -' + capR + ',-' + capR + ' ' +
             'L 0,' + r + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r + ' ' +
             'Z';
    },

    // Path para bloque reporter (redondeado)
    reporterBlock: function(width, height) {
      var w = Math.max(width, 50);
      var h = height || 28;
      var r = h / 2;

      return 'M ' + r + ',0 ' +
             'L ' + (w - r) + ',0 ' +
             'a ' + r + ',' + r + ' 0 0 1 0,' + h + ' ' +
             'L ' + r + ',' + h + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 0,-' + h + ' ' +
             'Z';
    },

    // Path para bloque boolean (hexagonal/diamante)
    booleanBlock: function(width, height) {
      var w = Math.max(width, 50);
      var h = height || 28;
      var notch = h / 3;

      return 'M ' + notch + ',0 ' +
             'L ' + (w - notch) + ',0 ' +
             'L ' + w + ',' + (h / 2) + ' ' +
             'L ' + (w - notch) + ',' + h + ' ' +
             'L ' + notch + ',' + h + ' ' +
             'L 0,' + (h / 2) + ' ' +
             'Z';
    },

    // Path para C-block (repetir, si-entonces)
    cBlock: function(width, height, innerHeight) {
      var w = Math.max(width, BLOCK_MIN_WIDTH);
      var topH = height || BLOCK_HEIGHT;
      var innerH = innerHeight || 40;
      var bottomH = 24;
      var r = CORNER_RADIUS;
      var indent = 16;
      var totalH = topH + innerH + bottomH;

      return 'M ' + r + ',0 ' +
             'L 15,0 ' + this.topNotch() + ' ' +
             'L ' + (w - r) + ',0 ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' ' +
             'L ' + w + ',' + (topH - r) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + ' ' +
             'L ' + (indent + 15 + NOTCH_WIDTH + 8) + ',' + topH + ' ' +
             'c -2,0 -3,1 -4,' + NOTCH_HEIGHT + ' l -' + NOTCH_WIDTH + ',0 c -1,-' + (NOTCH_HEIGHT-1) + ' -2,-' + NOTCH_HEIGHT + ' -4,-' + NOTCH_HEIGHT + ' ' +
             'L ' + (indent + r) + ',' + topH + ' ' +
             'a ' + r + ',' + r + ' 0 0 0 -' + r + ',' + r + ' ' +
             'L ' + indent + ',' + (topH + innerH - r) + ' ' +
             'a ' + r + ',' + r + ' 0 0 0 ' + r + ',' + r + ' ' +
             'L ' + (indent + 15) + ',' + (topH + innerH) + ' ' +
             'c 2,0 3,1 4,' + NOTCH_HEIGHT + ' l ' + NOTCH_WIDTH + ',0 c 1,-' + (NOTCH_HEIGHT-1) + ' 2,-' + NOTCH_HEIGHT + ' 4,-' + NOTCH_HEIGHT + ' ' +
             'L ' + (w - r) + ',' + (topH + innerH) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' ' +
             'L ' + w + ',' + (totalH - r) + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + ' ' +
             'L ' + (15 + NOTCH_WIDTH + 8) + ',' + totalH + ' ' + this.bottomNotch() + ' ' +
             'L ' + r + ',' + totalH + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 -' + r + ',-' + r + ' ' +
             'L 0,' + r + ' ' +
             'a ' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r + ' ' +
             'Z';
    }
  };

  // ==================== CLASE PRINCIPAL ====================
  function TutorBlocks(containerId) {
    console.log('[TutorBlocks] Creating instance for container:', containerId);
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[TutorBlocks] Container not found:', containerId);
      return;
    }

    this.blocks = [];
    this.dropZones = [];
    this.selectedCategory = 'motion';
    this.onChangeCallback = null;
    this.dragData = null;

    // Variables y bloques personalizados
    this.customVariables = [];
    this.customLists = [];
    this.customBlocks = [];

    this.init();
    console.log('[TutorBlocks] Initialized successfully. Workspace:', this.workspaceEl);
  }

  // ==================== INICIALIZACIÓN ====================
  TutorBlocks.prototype.init = function() {
    var self = this;
    this.container.innerHTML = '';
    this.container.className = 'tutor-blocks-container';

    // Estructura principal
    this.paletteEl = document.createElement('div');
    this.paletteEl.className = 'tb-palette';

    this.workspaceEl = document.createElement('div');
    this.workspaceEl.className = 'tb-workspace';

    this.container.appendChild(this.paletteEl);
    this.container.appendChild(this.workspaceEl);

    this.renderPalette();
    this.setupWorkspaceDrop();

    // Log de dimensiones después de renderizar
    setTimeout(function() {
      var containerRect = self.container.getBoundingClientRect();
      var workspaceRect = self.workspaceEl.getBoundingClientRect();
      console.log('[TutorBlocks] Container dimensions:', containerRect.width, 'x', containerRect.height);
      console.log('[TutorBlocks] Workspace dimensions:', workspaceRect.width, 'x', workspaceRect.height);
      console.log('[TutorBlocks] Workspace position:', workspaceRect.left, workspaceRect.top);
    }, 200);
  };

  // ==================== RENDERIZAR PALETA ====================
  TutorBlocks.prototype.renderPalette = function() {
    var self = this;
    this.paletteEl.innerHTML = '';

    // Tabs de categorías
    var tabsEl = document.createElement('div');
    tabsEl.className = 'tb-category-tabs';

    BLOCK_CATEGORIES.forEach(function(cat) {
      var color = BLOCK_COLORS[cat.id] ? BLOCK_COLORS[cat.id].primary : '#666';
      var tab = document.createElement('button');
      tab.className = 'tb-cat-tab' + (cat.id === self.selectedCategory ? ' active' : '');
      tab.style.background = color;
      tab.innerHTML = '<span class="tb-cat-icon">' + cat.icon + '</span>';
      tab.title = cat.name;
      tab.onclick = function() {
        self.selectedCategory = cat.id;
        self.renderPalette();
      };
      tabsEl.appendChild(tab);
    });

    this.paletteEl.appendChild(tabsEl);

    // Lista de bloques
    var blocksEl = document.createElement('div');
    blocksEl.className = 'tb-blocks-list';

    var catName = document.createElement('div');
    catName.className = 'tb-cat-name';
    var catData = BLOCK_CATEGORIES.find(function(c) { return c.id === self.selectedCategory; });
    catName.textContent = catData ? catData.name : '';
    catName.style.color = BLOCK_COLORS[self.selectedCategory] ? BLOCK_COLORS[self.selectedCategory].primary : '#fff';
    blocksEl.appendChild(catName);

    // Botones para crear variables/bloques personalizados
    if (this.selectedCategory === 'variables') {
      this.renderVariablesSection(blocksEl);
    } else if (this.selectedCategory === 'myblocks') {
      this.renderMyBlocksSection(blocksEl);
    } else {
      // Bloques normales del catálogo
      Object.keys(BLOCK_CATALOG).forEach(function(blockId) {
        var blockDef = BLOCK_CATALOG[blockId];
        if (blockDef.category === self.selectedCategory) {
          var blockEl = self.createBlockSVG(blockId, blockDef, true);
          blocksEl.appendChild(blockEl);
        }
      });
    }

    this.paletteEl.appendChild(blocksEl);
  };

  // ==================== SECCIÓN DE VARIABLES ====================
  TutorBlocks.prototype.renderVariablesSection = function(container) {
    var self = this;
    var colors = BLOCK_COLORS.variables;

    // Botón crear variable
    var createVarBtn = document.createElement('button');
    createVarBtn.className = 'tb-create-btn';
    createVarBtn.innerHTML = '+ Crear variable';
    createVarBtn.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 12px; background: ' + colors.primary + '; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;';
    createVarBtn.onclick = function() { self.showCreateVariableDialog(); };
    container.appendChild(createVarBtn);

    // Mostrar variables personalizadas
    if (this.customVariables.length > 0) {
      var varsLabel = document.createElement('div');
      varsLabel.style.cssText = 'font-size: 10px; color: #94a3b8; margin: 8px 0 4px; text-transform: uppercase;';
      varsLabel.textContent = 'Mis variables';
      container.appendChild(varsLabel);

      this.customVariables.forEach(function(varName) {
        // Bloque reporter de la variable
        var varBlock = self.createCustomVariableBlock(varName);
        container.appendChild(varBlock);
      });

      // Separador
      var sep = document.createElement('div');
      sep.style.cssText = 'height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;';
      container.appendChild(sep);
    }

    // Bloques de variables del catálogo
    Object.keys(BLOCK_CATALOG).forEach(function(blockId) {
      var blockDef = BLOCK_CATALOG[blockId];
      if (blockDef.category === 'variables') {
        var blockEl = self.createBlockSVG(blockId, blockDef, true);
        container.appendChild(blockEl);
      }
    });

    // Botón crear lista
    var createListBtn = document.createElement('button');
    createListBtn.className = 'tb-create-btn';
    createListBtn.innerHTML = '+ Crear lista';
    createListBtn.style.cssText = 'width: 100%; padding: 8px; margin: 12px 0; background: ' + BLOCK_COLORS.lists.primary + '; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;';
    createListBtn.onclick = function() { self.showCreateListDialog(); };
    container.appendChild(createListBtn);

    // Mostrar listas personalizadas
    if (this.customLists.length > 0) {
      this.customLists.forEach(function(listName) {
        var listBlock = self.createCustomListBlock(listName);
        container.appendChild(listBlock);
      });
    }

    // Bloques de listas del catálogo
    Object.keys(BLOCK_CATALOG).forEach(function(blockId) {
      var blockDef = BLOCK_CATALOG[blockId];
      if (blockDef.category === 'lists') {
        var blockEl = self.createBlockSVG(blockId, blockDef, true);
        container.appendChild(blockEl);
      }
    });
  };

  // ==================== SECCIÓN DE MIS BLOQUES ====================
  TutorBlocks.prototype.renderMyBlocksSection = function(container) {
    var self = this;
    var colors = BLOCK_COLORS.myblocks;

    // Botón crear bloque
    var createBlockBtn = document.createElement('button');
    createBlockBtn.className = 'tb-create-btn';
    createBlockBtn.innerHTML = '+ Crear bloque';
    createBlockBtn.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 12px; background: ' + colors.primary + '; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;';
    createBlockBtn.onclick = function() { self.showCreateBlockDialog(); };
    container.appendChild(createBlockBtn);

    // Mostrar bloques personalizados
    if (this.customBlocks.length > 0) {
      this.customBlocks.forEach(function(customBlock) {
        // Bloque "definir"
        var defineBlock = self.createCustomDefineBlock(customBlock);
        container.appendChild(defineBlock);

        // Bloque para llamar
        var callBlock = self.createCustomCallBlock(customBlock);
        container.appendChild(callBlock);
      });
    } else {
      var emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #64748b; font-size: 12px;';
      emptyMsg.innerHTML = 'No tienes bloques personalizados.<br><br>Crea uno para definir tus propias funciones.';
      container.appendChild(emptyMsg);
    }
  };

  // ==================== CREAR BLOQUE DE VARIABLE PERSONALIZADA ====================
  TutorBlocks.prototype.createCustomVariableBlock = function(varName) {
    var self = this;
    var colors = BLOCK_COLORS.variables;

    var wrapper = document.createElement('div');
    wrapper.className = 'tb-block-wrapper tb-shape-reporter tb-custom-var';
    wrapper.setAttribute('data-var-name', varName);
    wrapper.style.cssText = 'position: relative; display: inline-block; margin-bottom: 8px; cursor: grab;';
    wrapper._blockDef = { shape: 'reporter', category: 'variables' };

    var width = Math.max(this.measureText(varName) + 24, 60);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width + 4);
    svg.setAttribute('height', 28);
    svg.style.overflow = 'visible';

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ScratchPaths.reporterBlock(width, 24));
    path.setAttribute('fill', colors.primary);
    path.setAttribute('stroke', colors.tertiary);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('transform', 'translate(2, 2)');

    svg.appendChild(path);
    wrapper.appendChild(svg);

    // Texto
    var textEl = document.createElement('div');
    textEl.style.cssText = 'position: absolute; top: 5px; left: 0; right: 0; text-align: center; color: white; font-size: 11px; font-weight: bold; pointer-events: none;';
    textEl.textContent = varName;
    wrapper.appendChild(textEl);

    // Botón eliminar (pequeño)
    var deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.style.cssText = 'position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; background: #ef4444; color: white; border: none; border-radius: 50%; font-size: 12px; cursor: pointer; line-height: 1; display: none;';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      self.deleteVariable(varName);
    };
    wrapper.appendChild(deleteBtn);

    wrapper.onmouseenter = function() { deleteBtn.style.display = 'block'; };
    wrapper.onmouseleave = function() { deleteBtn.style.display = 'none'; };

    // Drag para variable
    this.setupCustomBlockDrag(wrapper, 'variable', varName);

    return wrapper;
  };

  // ==================== CREAR BLOQUE DE LISTA PERSONALIZADA ====================
  TutorBlocks.prototype.createCustomListBlock = function(listName) {
    var self = this;
    var colors = BLOCK_COLORS.lists;

    var wrapper = document.createElement('div');
    wrapper.className = 'tb-block-wrapper tb-shape-reporter tb-custom-list';
    wrapper.setAttribute('data-list-name', listName);
    wrapper.style.cssText = 'position: relative; display: inline-block; margin-bottom: 8px; cursor: grab;';
    wrapper._blockDef = { shape: 'reporter', category: 'lists' };

    var width = Math.max(this.measureText(listName) + 24, 60);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width + 4);
    svg.setAttribute('height', 28);
    svg.style.overflow = 'visible';

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ScratchPaths.reporterBlock(width, 24));
    path.setAttribute('fill', colors.primary);
    path.setAttribute('stroke', colors.tertiary);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('transform', 'translate(2, 2)');

    svg.appendChild(path);
    wrapper.appendChild(svg);

    var textEl = document.createElement('div');
    textEl.style.cssText = 'position: absolute; top: 5px; left: 0; right: 0; text-align: center; color: white; font-size: 11px; font-weight: bold; pointer-events: none;';
    textEl.textContent = listName;
    wrapper.appendChild(textEl);

    var deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.style.cssText = 'position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; background: #ef4444; color: white; border: none; border-radius: 50%; font-size: 12px; cursor: pointer; line-height: 1; display: none;';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      self.deleteList(listName);
    };
    wrapper.appendChild(deleteBtn);

    wrapper.onmouseenter = function() { deleteBtn.style.display = 'block'; };
    wrapper.onmouseleave = function() { deleteBtn.style.display = 'none'; };

    this.setupCustomBlockDrag(wrapper, 'list', listName);

    return wrapper;
  };

  // ==================== CREAR BLOQUE "DEFINIR" PERSONALIZADO ====================
  TutorBlocks.prototype.createCustomDefineBlock = function(customBlock) {
    var self = this;
    var colors = BLOCK_COLORS.myblocks;

    var wrapper = document.createElement('div');
    wrapper.className = 'tb-block-wrapper tb-shape-hat tb-custom-define';
    wrapper.style.cssText = 'position: relative; margin-bottom: 8px;';
    wrapper._blockDef = { shape: 'hat', category: 'myblocks' };

    var label = 'definir ' + customBlock.name;
    if (customBlock.params && customBlock.params.length > 0) {
      label += ' ' + customBlock.params.map(function(p) { return '(' + p + ')'; }).join(' ');
    }

    var width = Math.max(this.measureText(label) + 30, 100);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width + 4);
    svg.setAttribute('height', 64);
    svg.style.overflow = 'visible';

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ScratchPaths.hatBlock(width, 40));
    path.setAttribute('fill', colors.primary);
    path.setAttribute('stroke', colors.tertiary);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('transform', 'translate(2, 2)');

    svg.appendChild(path);
    wrapper.appendChild(svg);

    var textEl = document.createElement('div');
    textEl.style.cssText = 'position: absolute; top: 25px; left: 10px; color: white; font-size: 11px; font-weight: bold; pointer-events: none;';
    textEl.textContent = label;
    wrapper.appendChild(textEl);

    // Botón eliminar
    var deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; background: #ef4444; color: white; border: none; border-radius: 50%; font-size: 12px; cursor: pointer; line-height: 1; display: none;';
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      self.deleteCustomBlock(customBlock.name);
    };
    wrapper.appendChild(deleteBtn);

    wrapper.onmouseenter = function() { deleteBtn.style.display = 'block'; };
    wrapper.onmouseleave = function() { deleteBtn.style.display = 'none'; };

    // Define blocks are draggable
    this.setupCustomBlockDrag(wrapper, 'define', customBlock);

    return wrapper;
  };

  // ==================== CREAR BLOQUE "LLAMAR" PERSONALIZADO ====================
  TutorBlocks.prototype.createCustomCallBlock = function(customBlock) {
    var self = this;
    var colors = BLOCK_COLORS.myblocks;

    var wrapper = document.createElement('div');
    wrapper.className = 'tb-block-wrapper tb-shape-stack tb-custom-call';
    wrapper.style.cssText = 'position: relative; display: inline-block; margin-bottom: 8px; cursor: grab;';
    wrapper._blockDef = { shape: 'stack', category: 'myblocks' };

    var label = customBlock.name;
    if (customBlock.params && customBlock.params.length > 0) {
      label += ' ' + customBlock.params.map(function(p) { return '( )'; }).join(' ');
    }

    var width = Math.max(this.measureText(label) + 30, 80);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width + 4);
    svg.setAttribute('height', 44);
    svg.style.overflow = 'visible';

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ScratchPaths.stackBlock(width, 40));
    path.setAttribute('fill', colors.primary);
    path.setAttribute('stroke', colors.tertiary);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('transform', 'translate(2, 2)');

    svg.appendChild(path);
    wrapper.appendChild(svg);

    var textEl = document.createElement('div');
    textEl.style.cssText = 'position: absolute; top: 12px; left: 10px; color: white; font-size: 11px; font-weight: bold; pointer-events: none;';
    textEl.textContent = label;
    wrapper.appendChild(textEl);

    this.setupCustomBlockDrag(wrapper, 'call', customBlock);

    return wrapper;
  };

  // ==================== CONFIGURAR DRAG PARA BLOQUES PERSONALIZADOS ====================
  TutorBlocks.prototype.setupCustomBlockDrag = function(wrapper, type, data) {
    var self = this;

    wrapper.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      e.preventDefault();

      var clone = wrapper.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.zIndex = '100000';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.85';
      clone.style.left = (e.clientX - 40) + 'px';
      clone.style.top = (e.clientY - 20) + 'px';
      document.body.appendChild(clone);

      self.workspaceEl.classList.add('drag-active');

      function onMouseMove(ev) {
        clone.style.left = (ev.clientX - 40) + 'px';
        clone.style.top = (ev.clientY - 20) + 'px';
      }

      function onMouseUp(ev) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        clone.remove();
        self.workspaceEl.classList.remove('drag-active');

        var wsRect = self.workspaceEl.getBoundingClientRect();
        if (ev.clientX >= wsRect.left && ev.clientX <= wsRect.right &&
            ev.clientY >= wsRect.top && ev.clientY <= wsRect.bottom) {
          var x = ev.clientX - wsRect.left;
          var y = ev.clientY - wsRect.top;
          self.addCustomBlockToWorkspace(type, data, x, y);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  };

  // ==================== AGREGAR BLOQUE PERSONALIZADO AL WORKSPACE ====================
  TutorBlocks.prototype.addCustomBlockToWorkspace = function(type, data, x, y) {
    var blockEl;
    var instanceId = 'custom-' + Date.now();

    if (type === 'variable') {
      blockEl = this.createCustomVariableBlock(data);
      blockEl._customType = 'variable';
      blockEl._customData = data;
    } else if (type === 'list') {
      blockEl = this.createCustomListBlock(data);
      blockEl._customType = 'list';
      blockEl._customData = data;
    } else if (type === 'define') {
      blockEl = this.createCustomDefineBlock(data);
      blockEl._customType = 'define';
      blockEl._customData = data;
    } else if (type === 'call') {
      blockEl = this.createCustomCallBlock(data);
      blockEl._customType = 'call';
      blockEl._customData = data;
    }

    if (blockEl) {
      blockEl.style.position = 'absolute';
      blockEl.style.left = x + 'px';
      blockEl.style.top = y + 'px';
      blockEl.setAttribute('data-instance-id', instanceId);

      this.workspaceEl.appendChild(blockEl);
      this.makeBlockMovable(blockEl);

      this.blocks.push({
        id: instanceId,
        blockId: 'custom_' + type,
        element: blockEl,
        x: x,
        y: y,
        customType: type,
        customData: data
      });

      if (this.onChangeCallback) {
        this.onChangeCallback(this.getBlocksData());
      }
    }
  };

  // ==================== DIÁLOGOS PARA CREAR VARIABLES/BLOQUES ====================
  TutorBlocks.prototype.showCreateVariableDialog = function() {
    var self = this;
    var dialog = this.createDialog('Nueva Variable', [
      { id: 'varName', label: 'Nombre de la variable:', type: 'text', placeholder: 'mi variable' }
    ], function(values) {
      var name = values.varName.trim();
      if (name && self.customVariables.indexOf(name) === -1) {
        self.customVariables.push(name);
        self.renderPalette();
        self.notifyChange();
      }
    });
  };

  TutorBlocks.prototype.showCreateListDialog = function() {
    var self = this;
    var dialog = this.createDialog('Nueva Lista', [
      { id: 'listName', label: 'Nombre de la lista:', type: 'text', placeholder: 'mi lista' }
    ], function(values) {
      var name = values.listName.trim();
      if (name && self.customLists.indexOf(name) === -1) {
        self.customLists.push(name);
        self.renderPalette();
        self.notifyChange();
      }
    });
  };

  TutorBlocks.prototype.showCreateBlockDialog = function() {
    var self = this;
    var dialog = this.createDialog('Nuevo Bloque', [
      { id: 'blockName', label: 'Nombre del bloque:', type: 'text', placeholder: 'mi bloque' },
      { id: 'params', label: 'Parámetros (separados por coma):', type: 'text', placeholder: 'x, y, velocidad' }
    ], function(values) {
      var name = values.blockName.trim();
      var params = values.params ? values.params.split(',').map(function(p) { return p.trim(); }).filter(Boolean) : [];

      if (name && !self.customBlocks.find(function(b) { return b.name === name; })) {
        self.customBlocks.push({ name: name, params: params });
        self.renderPalette();
        self.notifyChange();
      }
    });
  };

  TutorBlocks.prototype.createDialog = function(title, fields, onSubmit) {
    var self = this;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100001; display: flex; align-items: center; justify-content: center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background: #1e293b; border-radius: 12px; padding: 20px; min-width: 300px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);';

    var titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin: 0 0 16px; color: white; font-size: 16px;';
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    var inputs = {};
    fields.forEach(function(field) {
      var label = document.createElement('label');
      label.style.cssText = 'display: block; margin-bottom: 12px; color: #94a3b8; font-size: 12px;';
      label.textContent = field.label;

      var input = document.createElement('input');
      input.type = field.type || 'text';
      input.placeholder = field.placeholder || '';
      input.style.cssText = 'width: 100%; padding: 8px 12px; margin-top: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: white; font-size: 14px; box-sizing: border-box;';

      inputs[field.id] = input;
      label.appendChild(input);
      dialog.appendChild(label);
    });

    var buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'padding: 8px 16px; background: transparent; border: 1px solid #475569; border-radius: 6px; color: #94a3b8; cursor: pointer;';
    cancelBtn.onclick = function() { overlay.remove(); };

    var submitBtn = document.createElement('button');
    submitBtn.textContent = 'Crear';
    submitBtn.style.cssText = 'padding: 8px 16px; background: #4C97FF; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer;';
    submitBtn.onclick = function() {
      var values = {};
      Object.keys(inputs).forEach(function(key) {
        values[key] = inputs[key].value;
      });
      onSubmit(values);
      overlay.remove();
    };

    buttons.appendChild(cancelBtn);
    buttons.appendChild(submitBtn);
    dialog.appendChild(buttons);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus first input
    var firstInput = Object.values(inputs)[0];
    if (firstInput) {
      setTimeout(function() { firstInput.focus(); }, 100);
    }

    // Enter para enviar
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitBtn.click();
      if (e.key === 'Escape') overlay.remove();
    });

    return overlay;
  };

  // ==================== ELIMINAR VARIABLES/LISTAS/BLOQUES ====================
  TutorBlocks.prototype.deleteVariable = function(name) {
    this.customVariables = this.customVariables.filter(function(v) { return v !== name; });
    this.renderPalette();
    this.notifyChange();
  };

  TutorBlocks.prototype.deleteList = function(name) {
    this.customLists = this.customLists.filter(function(l) { return l !== name; });
    this.renderPalette();
    this.notifyChange();
  };

  TutorBlocks.prototype.deleteCustomBlock = function(name) {
    this.customBlocks = this.customBlocks.filter(function(b) { return b.name !== name; });
    this.renderPalette();
    this.notifyChange();
  };

  TutorBlocks.prototype.notifyChange = function() {
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }
  };

  // ==================== CREAR BLOQUE SVG ====================
  TutorBlocks.prototype.createBlockSVG = function(blockId, blockDef, isPalette, instanceId, inputValues) {
    var self = this;
    var colors = BLOCK_COLORS[blockDef.category] || BLOCK_COLORS.motion;

    // Valores de inputs (usar defaults si no se proveen)
    var values = inputValues || {};
    var args = blockDef.args || [];
    args.forEach(function(arg, idx) {
      if (values[idx] === undefined) {
        // Usar variables/listas personalizadas como default si existen
        if (arg.type === 'variable' && self.customVariables.length > 0) {
          values[idx] = self.customVariables[0];
        } else if (arg.type === 'list' && self.customLists.length > 0) {
          values[idx] = self.customLists[0];
        } else {
          values[idx] = arg.default !== undefined ? arg.default : '';
        }
      }
    });

    // Calcular dimensiones basadas en el texto con inputs
    var estimatedWidth = this.estimateBlockWidth(blockDef, values);
    var blockWidth = Math.max(estimatedWidth, BLOCK_MIN_WIDTH);
    var blockHeight = BLOCK_HEIGHT;
    var totalHeight = blockHeight;

    // Ajustar para diferentes tipos
    if (blockDef.shape === 'hat') {
      totalHeight = blockHeight + 20;
    } else if (blockDef.shape === 'cblock') {
      totalHeight = blockHeight + 40 + 24;
    } else if (blockDef.shape === 'reporter' || blockDef.shape === 'boolean') {
      blockHeight = 28;
      totalHeight = 28;
    }

    // Contenedor principal
    var wrapper = document.createElement('div');
    wrapper.className = 'tb-block-wrapper tb-shape-' + blockDef.shape;
    wrapper.setAttribute('data-block-id', blockId);
    wrapper.setAttribute('data-instance-id', instanceId || '');
    wrapper.style.position = 'relative';
    wrapper.style.cursor = 'grab';
    wrapper.style.display = 'inline-block';

    // Guardar valores en el wrapper
    wrapper._inputValues = values;
    wrapper._blockDef = blockDef;

    // SVG para la forma del bloque
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', blockWidth + 4);
    svg.setAttribute('height', totalHeight + 4);
    svg.style.overflow = 'visible';
    svg.style.display = 'block';

    // Path del bloque
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var d = '';

    switch (blockDef.shape) {
      case 'hat':
        d = ScratchPaths.hatBlock(blockWidth, blockHeight);
        break;
      case 'cap':
        d = ScratchPaths.capBlock(blockWidth, blockHeight);
        break;
      case 'reporter':
        d = ScratchPaths.reporterBlock(blockWidth, blockHeight);
        break;
      case 'boolean':
        d = ScratchPaths.booleanBlock(blockWidth, blockHeight);
        break;
      case 'cblock':
        d = ScratchPaths.cBlock(blockWidth, blockHeight, 40);
        break;
      default:
        d = ScratchPaths.stackBlock(blockWidth, blockHeight);
    }

    path.setAttribute('d', d);
    path.setAttribute('fill', colors.primary);
    path.setAttribute('stroke', colors.tertiary);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('transform', 'translate(2, 2)');

    // Sombra
    var shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shadow.setAttribute('d', d);
    shadow.setAttribute('fill', 'rgba(0,0,0,0.15)');
    shadow.setAttribute('transform', 'translate(2, 4)');

    svg.appendChild(shadow);
    svg.appendChild(path);
    wrapper.appendChild(svg);

    // Contenedor de texto e inputs (overlay sobre el SVG)
    var contentOverlay = document.createElement('div');
    contentOverlay.className = 'tb-block-content';
    var topOffset = blockDef.shape === 'hat' ? 22 : (blockDef.shape === 'reporter' || blockDef.shape === 'boolean' ? 5 : 8);
    var leftOffset = blockDef.shape === 'boolean' ? 14 : 8;
    contentOverlay.style.cssText = 'position: absolute; top: ' + topOffset + 'px; left: ' + leftOffset + 'px; right: 8px; display: flex; align-items: center; flex-wrap: nowrap; gap: 4px; pointer-events: ' + (isPalette ? 'none' : 'auto') + '; white-space: nowrap;';

    // Parsear el texto del bloque y crear elementos
    var textParts = blockDef.text.split(/(%\d+)/);
    textParts.forEach(function(part) {
      if (/^%(\d+)$/.test(part)) {
        var argIndex = parseInt(part.substring(1)) - 1;
        var arg = args[argIndex];
        if (arg) {
          var inputEl = self.createInputElement(arg, values[argIndex], argIndex, isPalette, colors, wrapper);
          contentOverlay.appendChild(inputEl);
        }
      } else if (part.trim()) {
        var span = document.createElement('span');
        span.className = 'tb-block-text';
        span.textContent = part;
        span.style.cssText = 'color: #fff; font-size: 12px; font-weight: bold; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; white-space: nowrap;';
        contentOverlay.appendChild(span);
      }
    });

    wrapper.appendChild(contentOverlay);

    // Área interna para C-blocks (repetir, por siempre, si-entonces)
    if (blockDef.shape === 'cblock' && !isPalette) {
      var innerArea = document.createElement('div');
      innerArea.className = 'tb-cblock-inner';
      innerArea.style.cssText = 'position: absolute; left: 14px; right: 10px; top: 38px; min-height: 28px; ' +
        'background: rgba(0,0,0,0.12); border-radius: 4px; padding: 2px; display: flex; flex-direction: column;';

      // Guardar referencia
      wrapper._innerArea = innerArea;
      wrapper._innerBlocks = [];

      // Configurar como drop target
      self.setupCBlockInnerDrop(innerArea, wrapper);

      wrapper.appendChild(innerArea);
    }

    // Sistema de arrastre personalizado (evita restricciones de Tauri)
    if (isPalette) {

      wrapper.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Solo clic izquierdo
        e.preventDefault();

        console.log('[TutorBlocks] mousedown - starting drag:', blockId);

        // Crear clon para arrastrar
        var clone = wrapper.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.zIndex = '100000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.85';
        clone.style.transform = 'scale(1.05)';
        clone.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
        clone.style.left = (e.clientX - 40) + 'px';
        clone.style.top = (e.clientY - 20) + 'px';
        document.body.appendChild(clone);

        wrapper.classList.add('dragging');
        self.workspaceEl.classList.add('drag-active');

        var dragData = { blockId: blockId, def: blockDef };
        var hoveredSlot = null;
        var hoveredCBlockArea = null;

        function onMouseMove(ev) {
          clone.style.left = (ev.clientX - 40) + 'px';
          clone.style.top = (ev.clientY - 20) + 'px';

          // Verificar si está sobre el workspace
          var wsRect = self.workspaceEl.getBoundingClientRect();
          if (ev.clientX >= wsRect.left && ev.clientX <= wsRect.right &&
              ev.clientY >= wsRect.top && ev.clientY <= wsRect.bottom) {
            self.workspaceEl.classList.add('drag-active');

            // Verificar si está sobre un slot compatible (para reporter/boolean)
            if (blockDef.shape === 'reporter' || blockDef.shape === 'boolean') {
              var slot = self.findSlotAtPosition(ev.clientX, ev.clientY, blockDef.shape);
              if (slot !== hoveredSlot) {
                if (hoveredSlot) hoveredSlot.classList.remove('slot-hover');
                hoveredSlot = slot;
                if (hoveredSlot) hoveredSlot.classList.add('slot-hover');
              }
            }

            // Verificar si está sobre un área de C-block (para bloques apilables)
            if (blockDef.shape === 'stack' || blockDef.shape === 'cblock' || blockDef.shape === 'cap') {
              var cblockArea = self.findCBlockAreaAtPosition(ev.clientX, ev.clientY, blockDef.shape);
              if (cblockArea !== hoveredCBlockArea) {
                if (hoveredCBlockArea) hoveredCBlockArea.element.classList.remove('drag-over');
                hoveredCBlockArea = cblockArea;
                if (hoveredCBlockArea) hoveredCBlockArea.element.classList.add('drag-over');
              }
            }
          } else {
            self.workspaceEl.classList.remove('drag-active');
            if (hoveredSlot) {
              hoveredSlot.classList.remove('slot-hover');
              hoveredSlot = null;
            }
            if (hoveredCBlockArea) {
              hoveredCBlockArea.element.classList.remove('drag-over');
              hoveredCBlockArea = null;
            }
          }
        }

        function onMouseUp(ev) {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          clone.remove();
          wrapper.classList.remove('dragging');
          self.workspaceEl.classList.remove('drag-active');

          // Insertar en slot
          if (hoveredSlot) {
            hoveredSlot.classList.remove('slot-hover');
            self.insertBlockInSlot(hoveredSlot, dragData.blockId, dragData.def);
            console.log('[TutorBlocks] Inserted in slot');
            return;
          }

          // Insertar en C-block
          if (hoveredCBlockArea) {
            hoveredCBlockArea.element.classList.remove('drag-over');
            self.insertBlockInCBlock(hoveredCBlockArea, dragData.blockId, dragData.def);
            console.log('[TutorBlocks] Inserted in C-block');
            return;
          }

          // Verificar si soltó sobre el workspace
          var wsRect = self.workspaceEl.getBoundingClientRect();
          if (ev.clientX >= wsRect.left && ev.clientX <= wsRect.right &&
              ev.clientY >= wsRect.top && ev.clientY <= wsRect.bottom) {

            var x = ev.clientX - wsRect.left;
            var y = ev.clientY - wsRect.top;

            console.log('[TutorBlocks] Dropped on workspace at:', x, y);
            self.addBlockToWorkspace(dragData.blockId, dragData.def, x, y);
          } else {
            console.log('[TutorBlocks] Dropped outside workspace');
          }
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    } else {
      // Bloque en workspace - movible
      this.makeBlockMovable(wrapper);
    }

    return wrapper;
  };

  // ==================== TEXTO DEL BLOQUE ====================
  TutorBlocks.prototype.getBlockDisplayText = function(blockDef) {
    var text = blockDef.text;
    var args = blockDef.args || [];

    text = text.replace(/%(\d+)/g, function(match, num) {
      var arg = args[parseInt(num) - 1];
      if (!arg) return '___';

      switch (arg.type) {
        case 'number':
          return '(' + (arg.default || '  ') + ')';
        case 'string':
          return '"' + (arg.default || '  ') + '"';
        case 'boolean':
          return '<  >';
        case 'dropdown':
        case 'variable':
        case 'list':
          return '[' + (arg.default || '▼') + ']';
        case 'color':
          return '■';
        default:
          return '___';
      }
    });

    return text;
  };

  // ==================== MEDIR TEXTO ====================
  TutorBlocks.prototype.measureText = function(text) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = 'bold 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
    return ctx.measureText(text).width;
  };

  // ==================== ESTIMAR ANCHO DEL BLOQUE ====================
  TutorBlocks.prototype.estimateBlockWidth = function(blockDef, values) {
    var text = blockDef.text;
    var args = blockDef.args || [];
    var width = 20; // padding

    var parts = text.split(/(%\d+)/);
    var self = this;

    parts.forEach(function(part) {
      if (/^%(\d+)$/.test(part)) {
        var argIndex = parseInt(part.substring(1)) - 1;
        var arg = args[argIndex];
        var val = values[argIndex];
        if (arg) {
          if (arg.type === 'boolean') {
            width += 50; // espacio para input booleano
          } else if (arg.type === 'dropdown' || arg.type === 'variable' || arg.type === 'list') {
            width += Math.max(50, self.measureText(String(val || arg.default || '')) + 24);
          } else {
            width += Math.max(35, self.measureText(String(val || '')) + 16);
          }
        }
      } else {
        width += self.measureText(part);
      }
    });

    return width;
  };

  // ==================== CREAR ELEMENTO INPUT ====================
  TutorBlocks.prototype.createInputElement = function(arg, value, argIndex, isPalette, colors, wrapper) {
    var self = this;
    var container = document.createElement('span');
    container.className = 'tb-input-container tb-droppable';
    container.setAttribute('data-slot-type', 'reporter');
    container.setAttribute('data-arg-index', argIndex);
    container.style.cssText = 'display: inline-flex; align-items: center; position: relative;';

    if (arg.type === 'number' || arg.type === 'string') {
      // Input de texto/número con forma redondeada - puede recibir bloques reporter
      var input = document.createElement('input');
      input.type = arg.type === 'number' ? 'number' : 'text';
      input.value = value !== undefined ? value : (arg.default || '');
      input.className = 'tb-input tb-input-' + arg.type;
      input.style.cssText = 'width: ' + Math.max(35, String(value).length * 8 + 16) + 'px; ' +
        'height: 18px; ' +
        'padding: 0 6px; ' +
        'border: none; ' +
        'border-radius: ' + (arg.type === 'number' ? '9px' : '4px') + '; ' +
        'background: rgba(255,255,255,0.95); ' +
        'color: #333; ' +
        'font-size: 11px; ' +
        'font-weight: bold; ' +
        'text-align: center; ' +
        'outline: none; ' +
        'box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);';

      if (!isPalette) {
        input.style.pointerEvents = 'auto';
        input.addEventListener('input', function() {
          wrapper._inputValues[argIndex] = this.value;
          // Ajustar ancho dinámicamente
          this.style.width = Math.max(35, this.value.length * 8 + 16) + 'px';
          if (self.onChangeCallback) {
            self.onChangeCallback(self.getBlocksData());
          }
        });
        input.addEventListener('mousedown', function(e) {
          e.stopPropagation(); // Evitar que inicie drag al hacer clic en input
        });
        input.addEventListener('focus', function() {
          this.select();
        });

        // Configurar como drop target para bloques reporter
        self.setupSlotDropTarget(container, wrapper, argIndex, 'reporter');

        // Restaurar bloque insertado si value es un objeto de tipo 'block'
        if (value && typeof value === 'object' && value.type === 'block') {
          var slotBlockDef = BLOCK_CATALOG[value.blockId];
          if (slotBlockDef) {
            // Necesitamos insertar después de que el contenedor exista en DOM
            setTimeout(function() {
              self.insertBlockInSlot(container, value.blockId, slotBlockDef, value.values || {});
            }, 0);
          }
        }
      }
      container.appendChild(input);

    } else if (arg.type === 'dropdown' || arg.type === 'variable' || arg.type === 'list') {
      // Dropdown
      var select = document.createElement('select');
      select.className = 'tb-select';
      select.style.cssText = 'height: 18px; ' +
        'padding: 0 4px; ' +
        'border: none; ' +
        'border-radius: 4px; ' +
        'background: rgba(255,255,255,0.95); ' +
        'color: #333; ' +
        'font-size: 11px; ' +
        'font-weight: bold; ' +
        'outline: none; ' +
        'cursor: pointer;';

      // Obtener opciones según el tipo
      var options = [];
      if (arg.type === 'variable') {
        // Usar variables personalizadas si existen
        options = self.customVariables.length > 0 ? self.customVariables.slice() : [arg.default || 'mi variable'];
      } else if (arg.type === 'list') {
        // Usar listas personalizadas si existen
        options = self.customLists.length > 0 ? self.customLists.slice() : [arg.default || 'mi lista'];
      } else {
        options = arg.options || [arg.default || 'opción'];
      }

      options.forEach(function(opt) {
        var option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === value || (!value && opt === options[0])) option.selected = true;
        select.appendChild(option);
      });

      if (!isPalette) {
        select.style.pointerEvents = 'auto';
        select.addEventListener('change', function() {
          wrapper._inputValues[argIndex] = this.value;
          if (self.onChangeCallback) {
            self.onChangeCallback(self.getBlocksData());
          }
        });
        select.addEventListener('mousedown', function(e) {
          e.stopPropagation();
        });
      }
      container.appendChild(select);

    } else if (arg.type === 'boolean') {
      // Slot booleano (hexagonal vacío) - puede recibir bloques boolean
      var boolSlot = document.createElement('span');
      boolSlot.className = 'tb-bool-slot tb-droppable';
      boolSlot.setAttribute('data-slot-type', 'boolean');
      boolSlot.setAttribute('data-arg-index', argIndex);
      boolSlot.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; ' +
        'min-width: 36px; ' +
        'height: 18px; ' +
        'padding: 0 4px; ' +
        'background: rgba(0,0,0,0.25); ' +
        'clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%); ' +
        'border-radius: 2px; ' +
        'transition: background 0.2s;';

      if (!isPalette) {
        self.setupSlotDropTarget(boolSlot, wrapper, argIndex, 'boolean');

        // Restaurar bloque insertado si value es un objeto de tipo 'block'
        if (value && typeof value === 'object' && value.type === 'block') {
          var slotBlockDef = BLOCK_CATALOG[value.blockId];
          if (slotBlockDef) {
            setTimeout(function() {
              self.insertBlockInSlot(boolSlot, value.blockId, slotBlockDef, value.values || {});
            }, 0);
          }
        }
      }
      container.appendChild(boolSlot);

    } else if (arg.type === 'color') {
      // Selector de color
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = value || arg.default || '#ff0000';
      colorInput.className = 'tb-color-input';
      colorInput.style.cssText = 'width: 24px; ' +
        'height: 18px; ' +
        'padding: 0; ' +
        'border: 2px solid rgba(255,255,255,0.5); ' +
        'border-radius: 4px; ' +
        'cursor: pointer;';

      if (!isPalette) {
        colorInput.style.pointerEvents = 'auto';
        colorInput.addEventListener('input', function() {
          wrapper._inputValues[argIndex] = this.value;
          if (self.onChangeCallback) {
            self.onChangeCallback(self.getBlocksData());
          }
        });
        colorInput.addEventListener('mousedown', function(e) {
          e.stopPropagation();
        });
      }
      container.appendChild(colorInput);
    }

    return container;
  };

  // ==================== CONFIGURAR SLOT COMO DROP TARGET ====================
  TutorBlocks.prototype.setupSlotDropTarget = function(slotEl, parentWrapper, argIndex, slotType) {
    var self = this;

    // Marcar el slot para ser detectado durante el drag
    slotEl._slotInfo = {
      parentWrapper: parentWrapper,
      argIndex: argIndex,
      slotType: slotType
    };

    // Registrar el slot
    if (!this._slots) this._slots = [];
    this._slots.push(slotEl);
  };

  // ==================== VERIFICAR SI HAY SLOT BAJO EL CURSOR ====================
  TutorBlocks.prototype.findSlotAtPosition = function(clientX, clientY, blockShape) {
    if (!this._slots) return null;

    for (var i = 0; i < this._slots.length; i++) {
      var slot = this._slots[i];
      if (!slot.offsetParent) continue; // No está en el DOM

      var rect = slot.getBoundingClientRect();

      // Expandir área de detección para facilitar el drop
      var padding = 10;
      if (clientX >= rect.left - padding && clientX <= rect.right + padding &&
          clientY >= rect.top - padding && clientY <= rect.bottom + padding) {

        var slotType = slot.getAttribute('data-slot-type');

        // Verificar compatibilidad
        if (slotType === 'boolean' && blockShape === 'boolean') {
          return slot;
        }
        if (slotType === 'reporter' && (blockShape === 'reporter' || blockShape === 'boolean')) {
          return slot;
        }
      }
    }
    return null;
  };

  // ==================== INSERTAR BLOQUE EN SLOT ====================
  TutorBlocks.prototype.insertBlockInSlot = function(slot, blockId, blockDef, inputValues) {
    var self = this;
    var slotInfo = slot._slotInfo;
    if (!slotInfo) return;

    // Limpiar slot anterior
    slot.innerHTML = '';
    slot.style.background = 'transparent';
    slot.style.minWidth = 'auto';
    slot.style.padding = '0';
    slot.style.display = 'inline-block';
    slot.style.verticalAlign = 'middle';
    slot.style.lineHeight = '0';
    if (slot.classList.contains('tb-bool-slot')) {
      slot.style.clipPath = 'none';
      slot.style.height = 'auto';
    }

    // Crear mini-bloque para el slot (con isPalette=false para que registre sus propios slots)
    var miniBlock = this.createBlockSVG(blockId, blockDef, false, null, inputValues);
    miniBlock.style.transform = 'scale(0.8)';
    miniBlock.style.transformOrigin = 'left center';
    miniBlock.style.margin = '-2px 0';
    miniBlock.style.position = 'relative';
    miniBlock.style.pointerEvents = 'auto';
    miniBlock.style.verticalAlign = 'middle';
    miniBlock.classList.add('tb-slot-block');

    // Guardar referencia al bloque en el slot
    slot._insertedBlock = {
      blockId: blockId,
      blockDef: blockDef,
      element: miniBlock,
      values: inputValues || {}
    };

    // Permitir remover el bloque con doble clic
    miniBlock.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      self.removeBlockFromSlot(slot);
    });

    slot.appendChild(miniBlock);

    // Actualizar el valor del input del padre
    if (slotInfo.parentWrapper._inputValues) {
      slotInfo.parentWrapper._inputValues[slotInfo.argIndex] = {
        type: 'block',
        blockId: blockId,
        values: inputValues || {}
      };
    }

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }
  };

  // ==================== REMOVER BLOQUE DEL SLOT ====================
  TutorBlocks.prototype.removeBlockFromSlot = function(slot) {
    var slotInfo = slot._slotInfo;
    if (!slotInfo) return;

    slot.innerHTML = '';
    slot._insertedBlock = null;

    var slotType = slot.getAttribute('data-slot-type');

    if (slotType === 'boolean') {
      slot.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; ' +
        'min-width: 36px; height: 18px; padding: 0 4px; ' +
        'background: rgba(0,0,0,0.25); ' +
        'clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%); ' +
        'border-radius: 2px; transition: background 0.2s;';
    } else {
      // Recrear el input
      var input = document.createElement('input');
      input.type = 'text';
      input.value = '';
      input.className = 'tb-input';
      input.style.cssText = 'width: 35px; height: 18px; padding: 0 6px; border: none; ' +
        'border-radius: 9px; background: rgba(255,255,255,0.95); color: #333; ' +
        'font-size: 11px; font-weight: bold; text-align: center; outline: none; ' +
        'box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);';

      var self = this;
      input.addEventListener('input', function() {
        slotInfo.parentWrapper._inputValues[slotInfo.argIndex] = this.value;
        this.style.width = Math.max(35, this.value.length * 8 + 16) + 'px';
        if (self.onChangeCallback) {
          self.onChangeCallback(self.getBlocksData());
        }
      });
      input.addEventListener('mousedown', function(e) { e.stopPropagation(); });
      input.addEventListener('focus', function() { this.select(); });

      slot.appendChild(input);
    }

    // Limpiar valor
    if (slotInfo.parentWrapper._inputValues) {
      slotInfo.parentWrapper._inputValues[slotInfo.argIndex] = '';
    }

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }
  };

  // ==================== CONFIGURAR DROP EN C-BLOCK ====================
  TutorBlocks.prototype.setupCBlockInnerDrop = function(innerArea, parentWrapper) {
    var self = this;

    // Registrar el área interna
    if (!this._cblockAreas) this._cblockAreas = [];
    this._cblockAreas.push({
      element: innerArea,
      parent: parentWrapper
    });
  };

  // ==================== VERIFICAR SI HAY C-BLOCK ÁREA BAJO EL CURSOR ====================
  TutorBlocks.prototype.findCBlockAreaAtPosition = function(clientX, clientY, blockShape) {
    if (!this._cblockAreas) return null;
    // Solo bloques apilables pueden ir dentro de C-blocks
    if (blockShape === 'reporter' || blockShape === 'boolean' || blockShape === 'hat') return null;

    for (var i = 0; i < this._cblockAreas.length; i++) {
      var area = this._cblockAreas[i];
      if (!area.element.offsetParent) continue;

      var rect = area.element.getBoundingClientRect();

      // Expandir área de detección
      var padding = 10;
      if (clientX >= rect.left - padding && clientX <= rect.right + padding &&
          clientY >= rect.top - padding && clientY <= rect.bottom + padding) {
        return area;
      }
    }
    return null;
  };

  // ==================== INSERTAR BLOQUE EN C-BLOCK ====================
  TutorBlocks.prototype.insertBlockInCBlock = function(cblockArea, blockId, blockDef, inputValues) {
    var self = this;
    var innerArea = cblockArea.element;
    var parentWrapper = cblockArea.parent;

    // Crear el bloque (escala reducida para que quepa bien)
    var innerBlock = this.createBlockSVG(blockId, blockDef, false, null, inputValues);
    innerBlock.style.position = 'relative';
    innerBlock.style.margin = '2px 0';
    innerBlock.style.transform = 'scale(0.9)';
    innerBlock.style.transformOrigin = 'left top';
    innerBlock.classList.add('tb-inner-block');

    // Agregar al área interna
    innerArea.appendChild(innerBlock);

    // Guardar referencia
    if (!parentWrapper._innerBlocks) parentWrapper._innerBlocks = [];
    parentWrapper._innerBlocks.push({
      blockId: blockId,
      element: innerBlock,
      values: inputValues || {}
    });

    // Hacer el bloque movible para poder sacarlo
    this.makeInnerBlockMovable(innerBlock, innerArea, parentWrapper);

    // Ajustar altura del C-block después de que el bloque se renderice
    setTimeout(function() {
      self.adjustCBlockHeight(parentWrapper);
    }, 10);

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }
  };

  // ==================== HACER BLOQUE INTERNO MOVIBLE ====================
  TutorBlocks.prototype.makeInnerBlockMovable = function(blockEl, innerArea, parentWrapper) {
    var self = this;

    blockEl.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      e.preventDefault();
      e.stopPropagation();

      var clone = blockEl.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.zIndex = '100000';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.85';
      clone.style.left = (e.clientX - 40) + 'px';
      clone.style.top = (e.clientY - 20) + 'px';
      document.body.appendChild(clone);

      var blockId = blockEl.getAttribute('data-block-id');
      var blockDef = BLOCK_CATALOG[blockId] || blockEl._blockDef;

      function onMouseMove(ev) {
        clone.style.left = (ev.clientX - 40) + 'px';
        clone.style.top = (ev.clientY - 20) + 'px';
      }

      function onMouseUp(ev) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        clone.remove();

        // Verificar si soltó fuera del área interna
        var areaRect = innerArea.getBoundingClientRect();
        if (ev.clientX < areaRect.left || ev.clientX > areaRect.right ||
            ev.clientY < areaRect.top || ev.clientY > areaRect.bottom) {

          // Remover del área interna
          blockEl.remove();
          parentWrapper._innerBlocks = parentWrapper._innerBlocks.filter(function(b) {
            return b.element !== blockEl;
          });

          self.adjustCBlockHeight(parentWrapper);

          // Agregar al workspace principal si está sobre él
          var wsRect = self.workspaceEl.getBoundingClientRect();
          if (ev.clientX >= wsRect.left && ev.clientX <= wsRect.right &&
              ev.clientY >= wsRect.top && ev.clientY <= wsRect.bottom) {
            var x = ev.clientX - wsRect.left;
            var y = ev.clientY - wsRect.top;
            self.addBlockToWorkspace(blockId, blockDef, x, y);
          }

          if (self.onChangeCallback) {
            self.onChangeCallback(self.getBlocksData());
          }
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  };

  // ==================== AJUSTAR ALTURA DE C-BLOCK ====================
  TutorBlocks.prototype.adjustCBlockHeight = function(wrapper) {
    var innerArea = wrapper._innerArea;
    if (!innerArea) return;

    var innerBlocks = wrapper._innerBlocks || [];
    var totalHeight = 28; // Altura mínima

    innerBlocks.forEach(function(b) {
      if (b.element) {
        // Considerar la escala del bloque (0.9)
        var blockHeight = b.element.offsetHeight * 0.9;
        totalHeight += blockHeight + 4;
      }
    });

    innerArea.style.minHeight = totalHeight + 'px';

    // También ajustar el SVG del bloque
    var svg = wrapper.querySelector('svg');
    if (svg) {
      var newHeight = 38 + totalHeight + 20;
      svg.setAttribute('height', newHeight + 4);

      var path = svg.querySelector('path:not([fill="rgba(0,0,0,0.15)"])');
      var shadow = svg.querySelector('path[fill="rgba(0,0,0,0.15)"]');

      if (path) {
        var blockId = wrapper.getAttribute('data-block-id');
        var blockDef = BLOCK_CATALOG[blockId] || wrapper._blockDef;
        if (blockDef && blockDef.shape === 'cblock') {
          var newPath = ScratchPaths.cBlock(parseInt(svg.getAttribute('width')) - 4, 40, totalHeight);
          path.setAttribute('d', newPath);
          if (shadow) shadow.setAttribute('d', newPath);
        }
      }
    }
  };

  // ==================== WORKSPACE DROP ====================
  TutorBlocks.prototype.setupWorkspaceDrop = function() {
    var self = this;

    this.workspaceEl.addEventListener('dragenter', function(e) {
      e.preventDefault();
      self.workspaceEl.classList.add('drag-active');
      console.log('[TutorBlocks] dragenter workspace');
    });

    this.workspaceEl.addEventListener('dragleave', function(e) {
      // Solo remover si realmente salimos del workspace
      if (!self.workspaceEl.contains(e.relatedTarget)) {
        self.workspaceEl.classList.remove('drag-active');
      }
    });

    this.workspaceEl.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.workspaceEl.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.workspaceEl.classList.remove('drag-active');

      console.log('[TutorBlocks] drop event, dragData:', self.dragData);

      if (!self.dragData) {
        console.warn('[TutorBlocks] No dragData available');
        return;
      }

      var rect = self.workspaceEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      console.log('[TutorBlocks] Adding block at:', x, y);
      self.addBlockToWorkspace(self.dragData.blockId, self.dragData.def, x, y);
      self.dragData = null;
    });
  };

  // ==================== AGREGAR BLOQUE AL WORKSPACE ====================
  TutorBlocks.prototype.addBlockToWorkspace = function(blockId, blockDef, x, y, inputValues) {
    var instanceId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    var blockEl = this.createBlockSVG(blockId, blockDef, false, instanceId, inputValues);

    blockEl.style.position = 'absolute';
    blockEl.style.left = x + 'px';
    blockEl.style.top = y + 'px';

    this.workspaceEl.appendChild(blockEl);
    this.blocks.push({
      id: instanceId,
      blockId: blockId,
      element: blockEl,
      x: x,
      y: y
    });

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }

    return blockEl;
  };

  // ==================== CONSTANTES DE APILAMIENTO ====================
  var SNAP_DISTANCE = 25; // Distancia para activar el snap
  var BLOCK_STACK_HEIGHT = 40; // Altura estándar de un bloque para apilar

  // ==================== HACER BLOQUE MOVIBLE ====================
  TutorBlocks.prototype.makeBlockMovable = function(el) {
    var self = this;
    var isDragging = false;
    var startX, startY, origX, origY;
    var draggedStack = []; // Bloques que se mueven juntos

    el.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(el.style.left) || 0;
      origY = parseInt(el.style.top) || 0;
      el.style.zIndex = '1000';
      el.classList.add('dragging');

      // Obtener todos los bloques conectados debajo de este
      draggedStack = self.getConnectedBlocksBelow(el);
      draggedStack.forEach(function(stackEl, idx) {
        stackEl._dragOffsetX = parseInt(stackEl.style.left) - origX;
        stackEl._dragOffsetY = parseInt(stackEl.style.top) - origY;
        stackEl.style.zIndex = 1001 + idx;
      });
    });

    var onMove = function(e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var newX = origX + dx;
      var newY = origY + dy;

      el.style.left = newX + 'px';
      el.style.top = newY + 'px';

      // Mover bloques conectados
      draggedStack.forEach(function(stackEl) {
        stackEl.style.left = (newX + stackEl._dragOffsetX) + 'px';
        stackEl.style.top = (newY + stackEl._dragOffsetY) + 'px';
      });

      // Mostrar indicador de snap
      self.showSnapIndicator(el, newX, newY);
    };

    var onUp = function(e) {
      if (isDragging) {
        isDragging = false;
        el.style.zIndex = '';
        el.classList.remove('dragging');

        // Intentar conectar con otro bloque
        var snapped = self.trySnapBlock(el);

        // Actualizar posiciones en array
        self.updateBlockPositions(el, draggedStack);

        // Limpiar indicador de snap
        self.hideSnapIndicator();

        draggedStack = [];

        if (self.onChangeCallback) {
          self.onChangeCallback(self.getBlocksData());
        }
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    // Eliminar con clic derecho
    el.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      self.removeBlock(el);
    });
  };

  // ==================== OBTENER BLOQUES CONECTADOS DEBAJO ====================
  TutorBlocks.prototype.getConnectedBlocksBelow = function(el) {
    var connected = [];
    var instanceId = el.getAttribute('data-instance-id');
    var block = this.blocks.find(function(b) { return b.id === instanceId; });

    if (block && block.nextBlock) {
      var nextEl = this.getBlockElementById(block.nextBlock);
      if (nextEl) {
        connected.push(nextEl);
        connected = connected.concat(this.getConnectedBlocksBelow(nextEl));
      }
    }

    return connected;
  };

  // ==================== OBTENER ELEMENTO DE BLOQUE POR ID ====================
  TutorBlocks.prototype.getBlockElementById = function(instanceId) {
    var block = this.blocks.find(function(b) { return b.id === instanceId; });
    return block ? block.element : null;
  };

  // ==================== MOSTRAR INDICADOR DE SNAP ====================
  TutorBlocks.prototype.showSnapIndicator = function(el, x, y) {
    var self = this;

    // Los bloques reporter y boolean no se apilan
    var elBlockId = el.getAttribute('data-block-id');
    var elDef = BLOCK_CATALOG[elBlockId] || el._blockDef;
    if (elDef && (elDef.shape === 'reporter' || elDef.shape === 'boolean')) {
      this.hideSnapIndicator();
      el._snapTarget = null;
      return;
    }

    var elRect = el.getBoundingClientRect();
    var wsRect = this.workspaceEl.getBoundingClientRect();
    var elBottom = y + el.offsetHeight;
    var elTop = y;

    // Buscar bloque cercano para conectar
    var closestBlock = null;
    var closestDist = SNAP_DISTANCE;
    var snapType = null; // 'below' o 'above'

    this.blocks.forEach(function(b) {
      if (b.element === el) return;
      if (self.isBlockInStack(b.element, el)) return; // No conectar con bloques en la misma pila

      var bx = parseInt(b.element.style.left) || 0;
      var by = parseInt(b.element.style.top) || 0;
      var bHeight = b.element.offsetHeight || BLOCK_STACK_HEIGHT;

      // Verificar si puede conectarse debajo de este bloque
      var shape = b.element.getAttribute('data-block-id');
      var blockDef = BLOCK_CATALOG[shape] || b.element._blockDef;
      var canConnectBelow = !blockDef || (blockDef.shape !== 'cap' && blockDef.shape !== 'reporter' && blockDef.shape !== 'boolean');

      if (canConnectBelow) {
        // Verificar conexión debajo del bloque b
        var distX = Math.abs(x - bx);
        var distY = Math.abs(elTop - (by + bHeight - 8));

        if (distX < SNAP_DISTANCE && distY < SNAP_DISTANCE) {
          var dist = Math.sqrt(distX * distX + distY * distY);
          if (dist < closestDist) {
            closestDist = dist;
            closestBlock = b;
            snapType = 'below';
          }
        }
      }

      // Verificar conexión arriba del bloque b (el bloque arrastrado va arriba)
      var elShape = el.getAttribute('data-block-id');
      var elBlockDef = BLOCK_CATALOG[elShape] || el._blockDef;
      var canElConnectAbove = !elBlockDef || (elBlockDef.shape !== 'hat');

      if (canElConnectAbove && !b.prevBlock) {
        var distX2 = Math.abs(x - bx);
        var distY2 = Math.abs(elBottom - 8 - by);

        if (distX2 < SNAP_DISTANCE && distY2 < SNAP_DISTANCE) {
          var dist2 = Math.sqrt(distX2 * distX2 + distY2 * distY2);
          if (dist2 < closestDist) {
            closestDist = dist2;
            closestBlock = b;
            snapType = 'above';
          }
        }
      }
    });

    // Mostrar/ocultar indicador
    if (closestBlock) {
      this.showSnapLine(closestBlock, snapType);
      el._snapTarget = { block: closestBlock, type: snapType };
    } else {
      this.hideSnapIndicator();
      el._snapTarget = null;
    }
  };

  // ==================== VERIFICAR SI BLOQUE ESTÁ EN LA PILA ====================
  TutorBlocks.prototype.isBlockInStack = function(el, rootEl) {
    var connected = this.getConnectedBlocksBelow(rootEl);
    return connected.indexOf(el) !== -1;
  };

  // ==================== MOSTRAR LÍNEA DE SNAP ====================
  TutorBlocks.prototype.showSnapLine = function(targetBlock, snapType) {
    if (!this._snapLine) {
      this._snapLine = document.createElement('div');
      this._snapLine.className = 'tb-snap-line';
      this._snapLine.style.cssText = 'position: absolute; height: 4px; background: #fff; border-radius: 2px; pointer-events: none; z-index: 9999; box-shadow: 0 0 10px #4C97FF, 0 0 20px #4C97FF;';
      this.workspaceEl.appendChild(this._snapLine);
    }

    var bx = parseInt(targetBlock.element.style.left) || 0;
    var by = parseInt(targetBlock.element.style.top) || 0;
    var bWidth = targetBlock.element.offsetWidth || 100;
    var bHeight = targetBlock.element.offsetHeight || BLOCK_STACK_HEIGHT;

    this._snapLine.style.display = 'block';
    this._snapLine.style.left = bx + 'px';
    this._snapLine.style.width = bWidth + 'px';

    if (snapType === 'below') {
      this._snapLine.style.top = (by + bHeight - 6) + 'px';
    } else {
      this._snapLine.style.top = (by - 2) + 'px';
    }
  };

  // ==================== OCULTAR INDICADOR DE SNAP ====================
  TutorBlocks.prototype.hideSnapIndicator = function() {
    if (this._snapLine) {
      this._snapLine.style.display = 'none';
    }
  };

  // ==================== INTENTAR CONECTAR BLOQUE ====================
  TutorBlocks.prototype.trySnapBlock = function(el) {
    if (!el._snapTarget) return false;

    var target = el._snapTarget;
    var targetBlock = target.block;
    var snapType = target.type;

    var instanceId = el.getAttribute('data-instance-id');
    var block = this.blocks.find(function(b) { return b.id === instanceId; });

    if (!block) return false;

    var tx = parseInt(targetBlock.element.style.left) || 0;
    var ty = parseInt(targetBlock.element.style.top) || 0;
    var tHeight = targetBlock.element.offsetHeight || BLOCK_STACK_HEIGHT;

    if (snapType === 'below') {
      // Conectar debajo del target
      var newX = tx;
      var newY = ty + tHeight - 8; // Solapar un poco para la muesca

      // Calcular desplazamiento para bloques conectados
      var dx = newX - (parseInt(el.style.left) || 0);
      var dy = newY - (parseInt(el.style.top) || 0);

      el.style.left = newX + 'px';
      el.style.top = newY + 'px';
      block.x = newX;
      block.y = newY;

      // Mover bloques conectados debajo
      var connectedBelow = this.getConnectedBlocksBelow(el);
      connectedBelow.forEach(function(connEl) {
        var connBlock = this.blocks.find(function(b) { return b.element === connEl; });
        if (connBlock) {
          var cx = parseInt(connEl.style.left) + dx;
          var cy = parseInt(connEl.style.top) + dy;
          connEl.style.left = cx + 'px';
          connEl.style.top = cy + 'px';
          connBlock.x = cx;
          connBlock.y = cy;
        }
      }.bind(this));

      // Establecer conexiones
      // Si el target ya tenía un bloque conectado, desconectarlo
      if (targetBlock.nextBlock) {
        var oldNext = this.blocks.find(function(b) { return b.id === targetBlock.nextBlock; });
        if (oldNext) oldNext.prevBlock = null;
      }

      targetBlock.nextBlock = instanceId;
      block.prevBlock = targetBlock.id;

    } else if (snapType === 'above') {
      // Conectar arriba del target (el bloque arrastrado va arriba)
      var tHeight2 = el.offsetHeight || BLOCK_STACK_HEIGHT;
      var newX2 = tx;
      var newY2 = ty - tHeight2 + 8;

      var dx2 = newX2 - (parseInt(el.style.left) || 0);
      var dy2 = newY2 - (parseInt(el.style.top) || 0);

      el.style.left = newX2 + 'px';
      el.style.top = newY2 + 'px';
      block.x = newX2;
      block.y = newY2;

      // Mover bloques conectados debajo
      var connectedBelow2 = this.getConnectedBlocksBelow(el);
      connectedBelow2.forEach(function(connEl) {
        var connBlock = this.blocks.find(function(b) { return b.element === connEl; });
        if (connBlock) {
          var cx = parseInt(connEl.style.left) + dx2;
          var cy = parseInt(connEl.style.top) + dy2;
          connEl.style.left = cx + 'px';
          connEl.style.top = cy + 'px';
          connBlock.x = cx;
          connBlock.y = cy;
        }
      }.bind(this));

      // Establecer conexiones
      block.nextBlock = targetBlock.id;
      targetBlock.prevBlock = instanceId;
    }

    el._snapTarget = null;
    return true;
  };

  // ==================== ACTUALIZAR POSICIONES DE BLOQUES ====================
  TutorBlocks.prototype.updateBlockPositions = function(el, stackEls) {
    var instanceId = el.getAttribute('data-instance-id');
    var block = this.blocks.find(function(b) { return b.id === instanceId; });
    if (block) {
      block.x = parseInt(el.style.left) || 0;
      block.y = parseInt(el.style.top) || 0;
    }

    var self = this;
    stackEls.forEach(function(stackEl) {
      var stackId = stackEl.getAttribute('data-instance-id');
      var stackBlock = self.blocks.find(function(b) { return b.id === stackId; });
      if (stackBlock) {
        stackBlock.x = parseInt(stackEl.style.left) || 0;
        stackBlock.y = parseInt(stackEl.style.top) || 0;
      }
    });
  };

  // ==================== ELIMINAR BLOQUE ====================
  TutorBlocks.prototype.removeBlock = function(el) {
    var instanceId = el.getAttribute('data-instance-id');
    el.remove();
    this.blocks = this.blocks.filter(function(b) { return b.id !== instanceId; });

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getBlocksData());
    }
  };

  // ==================== MÉTODOS PÚBLICOS ====================
  TutorBlocks.prototype.getBlocksData = function() {
    var self = this;
    return this.blocks.map(function(b) {
      // Obtener valores de inputs del elemento
      var inputValues = b.element._inputValues || {};
      var data = {
        instanceId: b.id,
        blockId: b.blockId,
        x: b.x,
        y: b.y,
        values: inputValues
      };

      // Incluir conexiones
      if (b.prevBlock) data.prevBlock = b.prevBlock;
      if (b.nextBlock) data.nextBlock = b.nextBlock;

      // Incluir bloques internos (para C-blocks)
      if (b.element._innerBlocks && b.element._innerBlocks.length > 0) {
        data.innerBlocks = b.element._innerBlocks.map(function(inner) {
          return {
            blockId: inner.blockId,
            values: inner.element._inputValues || inner.values || {}
          };
        });
      }

      // Incluir datos de bloques personalizados
      if (b.customType) {
        data.customType = b.customType;
        data.customData = b.customData;
      }

      return data;
    });
  };

  // Obtener estado completo (bloques + variables + mis bloques)
  TutorBlocks.prototype.getFullState = function() {
    return {
      blocks: this.getBlocksData(),
      customVariables: this.customVariables.slice(),
      customLists: this.customLists.slice(),
      customBlocks: this.customBlocks.map(function(b) { return { name: b.name, params: b.params.slice() }; })
    };
  };

  // Cargar estado completo
  TutorBlocks.prototype.loadFullState = function(state) {
    if (!state) return;

    this.customVariables = state.customVariables || [];
    this.customLists = state.customLists || [];
    this.customBlocks = state.customBlocks || [];

    this.loadBlocks(state.blocks);
    this.renderPalette();
  };

  TutorBlocks.prototype.loadBlocks = function(blocksData) {
    var self = this;
    this.clear();

    // Mapeo de instanceId antiguo a nuevo
    var idMap = {};

    (blocksData || []).forEach(function(data) {
      var oldId = data.instanceId;
      var blockEl;

      // Manejar bloques personalizados
      if (data.customType) {
        self.addCustomBlockToWorkspace(data.customType, data.customData, data.x || 50, data.y || 50);
        var lastBlock = self.blocks[self.blocks.length - 1];
        if (lastBlock && oldId) {
          idMap[oldId] = lastBlock.id;
          lastBlock._loadedPrevBlock = data.prevBlock;
          lastBlock._loadedNextBlock = data.nextBlock;
        }
        return;
      }

      var blockDef = BLOCK_CATALOG[data.blockId];
      if (!blockDef) return;

      blockEl = self.addBlockToWorkspace(data.blockId, blockDef, data.x || 50, data.y || 50, data.values || {});
      var lastBlock = self.blocks[self.blocks.length - 1];
      if (lastBlock && oldId) {
        idMap[oldId] = lastBlock.id;
        lastBlock._loadedPrevBlock = data.prevBlock;
        lastBlock._loadedNextBlock = data.nextBlock;
      }
    });

    // Restaurar conexiones
    this.blocks.forEach(function(b) {
      if (b._loadedPrevBlock && idMap[b._loadedPrevBlock]) {
        b.prevBlock = idMap[b._loadedPrevBlock];
      }
      if (b._loadedNextBlock && idMap[b._loadedNextBlock]) {
        b.nextBlock = idMap[b._loadedNextBlock];
      }
      delete b._loadedPrevBlock;
      delete b._loadedNextBlock;
    });

    // Restaurar bloques internos de C-blocks
    (blocksData || []).forEach(function(data) {
      if (!data.innerBlocks || data.innerBlocks.length === 0) return;

      // Encontrar el bloque correspondiente
      var newId = idMap[data.instanceId];
      if (!newId) return;

      var block = self.blocks.find(function(b) { return b.id === newId; });
      if (!block || !block.element._innerArea) return;

      // Crear el área de C-block si no existe
      var cblockArea = {
        element: block.element._innerArea,
        parent: block.element
      };

      // Insertar cada bloque interno
      data.innerBlocks.forEach(function(innerData) {
        var innerBlockDef = BLOCK_CATALOG[innerData.blockId];
        if (!innerBlockDef) return;

        self.insertBlockInCBlock(cblockArea, innerData.blockId, innerBlockDef, innerData.values || {});
      });
    });
  };

  TutorBlocks.prototype.clear = function() {
    this.blocks.forEach(function(b) {
      if (b.element && b.element.parentNode) {
        b.element.remove();
      }
    });
    this.blocks = [];
  };

  TutorBlocks.prototype.onChange = function(callback) {
    this.onChangeCallback = callback;
  };

  TutorBlocks.prototype.setReadOnly = function(readonly) {
    if (readonly) {
      this.paletteEl.style.display = 'none';
      this.workspaceEl.classList.add('readonly');
    } else {
      this.paletteEl.style.display = '';
      this.workspaceEl.classList.remove('readonly');
    }
  };

  // ==================== DROP ZONES ====================
  TutorBlocks.prototype.addDropZone = function(x, y, acceptedBlocks, correctBlockId) {
    var self = this;
    var zoneId = 'dz-' + Date.now();

    var zone = document.createElement('div');
    zone.className = 'tb-drop-zone';
    zone.style.position = 'absolute';
    zone.style.left = x + 'px';
    zone.style.top = y + 'px';
    zone.setAttribute('data-zone-id', zoneId);
    zone.setAttribute('data-accepted', JSON.stringify(acceptedBlocks || []));
    zone.setAttribute('data-correct', correctBlockId || '');
    zone.innerHTML = '<span class="tb-dz-hint">?</span>';

    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', function() {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');

      if (!self.dragData) return;

      var blockId = self.dragData.blockId;
      var blockDef = self.dragData.def;
      var accepted = JSON.parse(zone.getAttribute('data-accepted') || '[]');

      if (accepted.length > 0 && accepted.indexOf(blockId) === -1) {
        zone.classList.add('incorrect');
        setTimeout(function() { zone.classList.remove('incorrect'); }, 500);
        return;
      }

      // Colocar bloque en la zona
      zone.innerHTML = '';
      var miniBlock = self.createBlockSVG(blockId, blockDef, false);
      miniBlock.style.position = 'relative';
      miniBlock.style.transform = 'scale(0.8)';
      miniBlock.style.transformOrigin = 'top left';
      zone.appendChild(miniBlock);
      zone.classList.add('filled');
      zone.setAttribute('data-placed', blockId);

      // Verificar si es correcto
      var correct = zone.getAttribute('data-correct');
      if (correct) {
        if (blockId === correct) {
          zone.classList.add('correct');
        } else {
          zone.classList.add('incorrect');
        }
      }

      self.dragData = null;
    });

    this.workspaceEl.appendChild(zone);
    this.dropZones.push({
      id: zoneId,
      element: zone,
      correctBlockId: correctBlockId
    });

    return zone;
  };

  TutorBlocks.prototype.checkAnswers = function() {
    var results = { correct: 0, total: this.dropZones.length };

    this.dropZones.forEach(function(dz) {
      var placed = dz.element.getAttribute('data-placed');
      if (placed === dz.correctBlockId) {
        results.correct++;
        dz.element.classList.add('correct');
        dz.element.classList.remove('incorrect');
      } else if (placed) {
        dz.element.classList.add('incorrect');
        dz.element.classList.remove('correct');
      }
    });

    return results;
  };

  TutorBlocks.prototype.clearDropZones = function() {
    this.dropZones.forEach(function(dz) {
      dz.element.remove();
    });
    this.dropZones = [];
  };

  // ==================== ESTILOS CSS ====================
  TutorBlocks.injectStyles = function() {
    if (document.getElementById('tutor-blocks-styles-v2')) return;

    var css = `
      .tutor-blocks-container {
        display: flex;
        height: 100%;
        background: #1e1e2e;
        border-radius: 8px;
        overflow: hidden;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      }

      .tb-palette {
        width: 200px;
        background: #2d2d3d;
        border-right: 1px solid #3d3d4d;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .tb-category-tabs {
        display: flex;
        flex-wrap: wrap;
        padding: 8px;
        gap: 4px;
        background: #252535;
        border-bottom: 1px solid #3d3d4d;
      }

      .tb-cat-tab {
        width: 32px;
        height: 32px;
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s, box-shadow 0.15s;
      }

      .tb-cat-tab:hover {
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }

      .tb-cat-tab.active {
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
      }

      .tb-cat-icon {
        font-size: 16px;
      }

      .tb-cat-name {
        padding: 8px 12px;
        font-weight: bold;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .tb-blocks-list {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px;
      }

      .tb-block-wrapper {
        margin-bottom: 8px;
        transition: transform 0.1s;
        user-select: none;
        -webkit-user-drag: element;
      }

      .tb-block-wrapper svg {
        pointer-events: none;
      }

      .tb-block-wrapper:hover {
        transform: scale(1.02);
      }

      .tb-block-wrapper.dragging {
        opacity: 0.7;
        transform: scale(1.05);
      }

      /* Inputs editables en bloques */
      .tb-block-content {
        user-select: none;
      }

      .tb-input {
        -webkit-appearance: none;
        -moz-appearance: textfield;
      }

      .tb-input::-webkit-inner-spin-button,
      .tb-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .tb-input:focus {
        background: #fff !important;
        box-shadow: 0 0 0 2px rgba(76, 151, 255, 0.5), inset 0 1px 3px rgba(0,0,0,0.2) !important;
      }

      .tb-select:focus {
        background: #fff !important;
        box-shadow: 0 0 0 2px rgba(76, 151, 255, 0.5) !important;
      }

      /* Slots que pueden recibir bloques */
      .tb-droppable.slot-hover {
        background: rgba(76, 151, 255, 0.4) !important;
        box-shadow: 0 0 8px rgba(76, 151, 255, 0.8);
      }

      .tb-bool-slot.slot-hover {
        background: rgba(76, 151, 255, 0.5) !important;
      }

      .tb-slot-block {
        cursor: pointer;
      }

      .tb-slot-block:hover {
        filter: brightness(1.1);
      }

      /* Área interna de C-blocks */
      .tb-cblock-inner {
        min-height: 24px;
        margin: 4px 8px 4px 16px;
        padding: 4px;
        background: rgba(0,0,0,0.15);
        border-radius: 4px;
        position: relative;
      }

      .tb-cblock-inner.drag-over {
        background: rgba(76, 151, 255, 0.3);
        box-shadow: inset 0 0 10px rgba(76, 151, 255, 0.5);
      }

      .tb-workspace {
        flex: 1;
        position: relative;
        min-height: 300px;
        background:
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 19px,
            rgba(255,255,255,0.05) 19px,
            rgba(255,255,255,0.05) 20px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 19px,
            rgba(255,255,255,0.05) 19px,
            rgba(255,255,255,0.05) 20px
          );
        background-color: #252535;
        overflow: auto;
        transition: background-color 0.2s, box-shadow 0.2s;
      }

      .tb-workspace.drag-active {
        background-color: #2d3d4d;
        box-shadow: inset 0 0 30px rgba(76, 151, 255, 0.3);
      }

      .tb-workspace.readonly {
        pointer-events: none;
        opacity: 0.8;
      }

      /* Drop Zones */
      .tb-drop-zone {
        min-width: 100px;
        min-height: 48px;
        border: 3px dashed rgba(255,255,255,0.3);
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .tb-drop-zone.drag-over {
        border-color: #4C97FF;
        background: rgba(76, 151, 255, 0.2);
        transform: scale(1.05);
      }

      .tb-drop-zone.filled {
        border-style: solid;
        background: transparent;
        padding: 4px;
      }

      .tb-drop-zone.correct {
        border-color: #59C059 !important;
        background: rgba(89, 192, 89, 0.2) !important;
      }

      .tb-drop-zone.incorrect {
        border-color: #FF6680 !important;
        background: rgba(255, 102, 128, 0.2) !important;
        animation: shake 0.3s;
      }

      .tb-dz-hint {
        color: rgba(255,255,255,0.3);
        font-size: 24px;
        font-weight: bold;
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      /* Scrollbar */
      .tb-blocks-list::-webkit-scrollbar,
      .tb-workspace::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .tb-blocks-list::-webkit-scrollbar-thumb,
      .tb-workspace::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
      }

      .tb-blocks-list::-webkit-scrollbar-track,
      .tb-workspace::-webkit-scrollbar-track {
        background: transparent;
      }
    `;

    var style = document.createElement('style');
    style.id = 'tutor-blocks-styles-v2';
    style.textContent = css;
    document.head.appendChild(style);
  };

  // Inyectar estilos
  TutorBlocks.injectStyles();

  // ==================== EXPORTAR ====================
  global.TutorBlocks = TutorBlocks;
  global.BLOCK_CATALOG = BLOCK_CATALOG;
  global.BLOCK_COLORS = BLOCK_COLORS;
  global.BLOCK_CATEGORIES = BLOCK_CATEGORIES;

})(window);
