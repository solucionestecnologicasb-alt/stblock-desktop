/**
 * STBlock Evaluaciones - Definiciones de Bloques estilo Scratch para Blockly
 * Replica los bloques de la sección de Programación incluyendo personalizados
 */

(function() {
  'use strict';

  // ==================== COLORES DE CATEGORÍAS (Scratch) ====================
  var COLORS = {
    motion: { primary: '#4C97FF', secondary: '#4280D7', tertiary: '#3373CC' },
    looks: { primary: '#9966FF', secondary: '#855CD6', tertiary: '#774DCB' },
    sound: { primary: '#CF63CF', secondary: '#C94FC9', tertiary: '#BD42BD' },
    events: { primary: '#FFBF00', secondary: '#E6AC00', tertiary: '#CC9900' },
    control: { primary: '#FFAB19', secondary: '#EC9C13', tertiary: '#CF8B17' },
    sensing: { primary: '#5CB1D6', secondary: '#47A8D1', tertiary: '#2E8EB8' },
    operators: { primary: '#59C059', secondary: '#46B946', tertiary: '#389438' },
    variables: { primary: '#FF8C1A', secondary: '#FF8000', tertiary: '#DB6E00' },
    lists: { primary: '#FF661A', secondary: '#FF5500', tertiary: '#E64D00' },
    myblocks: { primary: '#FF6680', secondary: '#FF4D6A', tertiary: '#FF3355' },
    pen: { primary: '#0fBD8C', secondary: '#0DA57A', tertiary: '#0B8E69' },
    music: { primary: '#D65CD6', secondary: '#C94FC9', tertiary: '#BD42BD' },
    // Extensiones personalizadas
    logic: { primary: '#48BF53', secondary: '#389D42', tertiary: '#2E7D35' },
    data: { primary: '#FF8C1A', secondary: '#DB6E00', tertiary: '#B85C00' },
    state: { primary: '#9966FF', secondary: '#774DCB', tertiary: '#5F3CA5' },
    debug: { primary: '#607D8B', secondary: '#455A64', tertiary: '#37474F' },
    test: { primary: '#FF6680', secondary: '#D94D67', tertiary: '#B33D53' },
    // Bloques de juego
    gravity: { primary: '#5B7CFA', secondary: '#4561C9', tertiary: '#334AA0' },
    physics: { primary: '#00A8A8', secondary: '#0B8585', tertiary: '#086A6A' },
    camera: { primary: '#7B61FF', secondary: '#6046CF', tertiary: '#4A35A8' },
    ai: { primary: '#2EBD59', secondary: '#238F43', tertiary: '#1B7135' },
    combat: { primary: '#E04444', secondary: '#B83232', tertiary: '#912626' }
  };

  // ==================== INICIALIZAR BLOCKLY ====================
  window.ScratchBlockly = {
    colors: COLORS,
    workspace: null,

    init: function(containerId, options) {
      var container = document.getElementById(containerId);
      if (!container) {
        console.error('[ScratchBlockly] Container not found:', containerId);
        return null;
      }

      // Registrar bloques
      this.registerAllBlocks();

      // Configuración del workspace
      var config = {
        toolbox: this.createToolbox(options),
        grid: {
          spacing: 20,
          length: 3,
          colour: '#555',
          snap: true
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true
        },
        renderer: 'zelos',
        theme: this.createTheme()
      };

      // Crear workspace
      this.workspace = Blockly.inject(containerId, config);

      console.log('[ScratchBlockly] Initialized successfully');
      return this.workspace;
    },

    // ==================== CREAR TEMA OSCURO ====================
    createTheme: function() {
      return Blockly.Theme.defineTheme('scratchDark', {
        'base': Blockly.Themes.Zelos,
        'blockStyles': {
          'motion_blocks': { 'colourPrimary': COLORS.motion.primary },
          'looks_blocks': { 'colourPrimary': COLORS.looks.primary },
          'sound_blocks': { 'colourPrimary': COLORS.sound.primary },
          'event_blocks': { 'colourPrimary': COLORS.events.primary },
          'control_blocks': { 'colourPrimary': COLORS.control.primary },
          'sensing_blocks': { 'colourPrimary': COLORS.sensing.primary },
          'operator_blocks': { 'colourPrimary': COLORS.operators.primary },
          'variable_blocks': { 'colourPrimary': COLORS.variables.primary },
          'list_blocks': { 'colourPrimary': COLORS.lists.primary },
          'procedure_blocks': { 'colourPrimary': COLORS.myblocks.primary }
        },
        'categoryStyles': {
          'motion_category': { 'colour': COLORS.motion.primary },
          'looks_category': { 'colour': COLORS.looks.primary },
          'sound_category': { 'colour': COLORS.sound.primary },
          'events_category': { 'colour': COLORS.events.primary },
          'control_category': { 'colour': COLORS.control.primary },
          'sensing_category': { 'colour': COLORS.sensing.primary },
          'operators_category': { 'colour': COLORS.operators.primary },
          'variables_category': { 'colour': COLORS.variables.primary }
        },
        'componentStyles': {
          'workspaceBackgroundColour': '#1e1e2e',
          'toolboxBackgroundColour': '#181825',
          'toolboxForegroundColour': '#cdd6f4',
          'flyoutBackgroundColour': '#1e1e2e',
          'flyoutForegroundColour': '#cdd6f4',
          'flyoutOpacity': 0.95,
          'scrollbarColour': '#45475a',
          'scrollbarOpacity': 0.7,
          'insertionMarkerColour': '#89b4fa',
          'insertionMarkerOpacity': 0.5,
          'markerColour': '#f38ba8',
          'cursorColour': '#f5e0dc'
        },
        'fontStyle': {
          'family': '"Helvetica Neue", Helvetica, Arial, sans-serif',
          'weight': 'bold',
          'size': 12
        }
      });
    },

    // ==================== REGISTRAR TODOS LOS BLOQUES ====================
    registerAllBlocks: function() {
      this.registerMotionBlocks();
      this.registerLooksBlocks();
      this.registerSoundBlocks();
      this.registerEventBlocks();
      this.registerControlBlocks();
      this.registerSensingBlocks();
      this.registerOperatorBlocks();
      this.registerVariableBlocks();
      this.registerPenBlocks();
      this.registerMusicBlocks();
      // Bloques personalizados
      this.registerLogicBlocks();
      this.registerStateBlocks();
      this.registerDebugBlocks();
      this.registerGameBlocks();
    },

    // ==================== BLOQUES DE MOVIMIENTO ====================
    registerMotionBlocks: function() {
      var color = COLORS.motion.primary;

      Blockly.Blocks['motion_movesteps'] = {
        init: function() {
          this.jsonInit({
            "message0": "mover %1 pasos",
            "args0": [{ "type": "input_value", "name": "STEPS", "check": "Number" }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_turnright'] = {
        init: function() {
          this.jsonInit({
            "message0": "girar ↻ %1 grados",
            "args0": [{ "type": "input_value", "name": "DEGREES", "check": "Number" }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_turnleft'] = {
        init: function() {
          this.jsonInit({
            "message0": "girar ↺ %1 grados",
            "args0": [{ "type": "input_value", "name": "DEGREES", "check": "Number" }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_goto'] = {
        init: function() {
          this.jsonInit({
            "message0": "ir a %1",
            "args0": [{ "type": "field_dropdown", "name": "TO", "options": [["posición aleatoria", "_random_"], ["puntero del ratón", "_mouse_"]] }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_gotoxy'] = {
        init: function() {
          this.jsonInit({
            "message0": "ir a x: %1 y: %2",
            "args0": [{ "type": "input_value", "name": "X", "check": "Number" }, { "type": "input_value", "name": "Y", "check": "Number" }],
            "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_glidesecstoxy'] = {
        init: function() {
          this.jsonInit({
            "message0": "deslizar en %1 segs a x: %2 y: %3",
            "args0": [{ "type": "input_value", "name": "SECS", "check": "Number" }, { "type": "input_value", "name": "X", "check": "Number" }, { "type": "input_value", "name": "Y", "check": "Number" }],
            "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_pointindirection'] = {
        init: function() {
          this.jsonInit({
            "message0": "apuntar en dirección %1",
            "args0": [{ "type": "input_value", "name": "DIRECTION", "check": "Number" }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_pointtowards'] = {
        init: function() {
          this.jsonInit({
            "message0": "apuntar hacia %1",
            "args0": [{ "type": "field_dropdown", "name": "TOWARDS", "options": [["puntero del ratón", "_mouse_"]] }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_changexby'] = {
        init: function() {
          this.jsonInit({ "message0": "cambiar x por %1", "args0": [{ "type": "input_value", "name": "DX", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };

      Blockly.Blocks['motion_setx'] = {
        init: function() {
          this.jsonInit({ "message0": "fijar x a %1", "args0": [{ "type": "input_value", "name": "X", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };

      Blockly.Blocks['motion_changeyby'] = {
        init: function() {
          this.jsonInit({ "message0": "cambiar y por %1", "args0": [{ "type": "input_value", "name": "DY", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };

      Blockly.Blocks['motion_sety'] = {
        init: function() {
          this.jsonInit({ "message0": "fijar y a %1", "args0": [{ "type": "input_value", "name": "Y", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };

      Blockly.Blocks['motion_ifonedgebounce'] = {
        init: function() {
          this.jsonInit({ "message0": "rebotar si toca un borde", "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };

      Blockly.Blocks['motion_setrotationstyle'] = {
        init: function() {
          this.jsonInit({
            "message0": "fijar estilo de rotación %1",
            "args0": [{ "type": "field_dropdown", "name": "STYLE", "options": [["izquierda-derecha", "left-right"], ["no rotar", "don't rotate"], ["libre", "all around"]] }],
            "previousStatement": null, "nextStatement": null, "colour": color
          });
        }
      };

      Blockly.Blocks['motion_xposition'] = { init: function() { this.jsonInit({ "message0": "posición en x", "output": "Number", "colour": color }); } };
      Blockly.Blocks['motion_yposition'] = { init: function() { this.jsonInit({ "message0": "posición en y", "output": "Number", "colour": color }); } };
      Blockly.Blocks['motion_direction'] = { init: function() { this.jsonInit({ "message0": "dirección", "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE APARIENCIA ====================
    registerLooksBlocks: function() {
      var color = COLORS.looks.primary;

      Blockly.Blocks['looks_sayforsecs'] = {
        init: function() {
          this.jsonInit({ "message0": "decir %1 durante %2 segundos", "args0": [{ "type": "input_value", "name": "MESSAGE" }, { "type": "input_value", "name": "SECS", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };
      Blockly.Blocks['looks_say'] = { init: function() { this.jsonInit({ "message0": "decir %1", "args0": [{ "type": "input_value", "name": "MESSAGE" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_thinkforsecs'] = {
        init: function() {
          this.jsonInit({ "message0": "pensar %1 durante %2 segundos", "args0": [{ "type": "input_value", "name": "MESSAGE" }, { "type": "input_value", "name": "SECS", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };
      Blockly.Blocks['looks_think'] = { init: function() { this.jsonInit({ "message0": "pensar %1", "args0": [{ "type": "input_value", "name": "MESSAGE" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_switchcostumeto'] = { init: function() { this.jsonInit({ "message0": "cambiar disfraz a %1", "args0": [{ "type": "field_dropdown", "name": "COSTUME", "options": [["disfraz1", "costume1"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_nextcostume'] = { init: function() { this.jsonInit({ "message0": "siguiente disfraz", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_switchbackdropto'] = { init: function() { this.jsonInit({ "message0": "cambiar fondo a %1", "args0": [{ "type": "field_dropdown", "name": "BACKDROP", "options": [["fondo1", "backdrop1"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_nextbackdrop'] = { init: function() { this.jsonInit({ "message0": "siguiente fondo", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_changesizeby'] = { init: function() { this.jsonInit({ "message0": "cambiar tamaño por %1", "args0": [{ "type": "input_value", "name": "CHANGE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_setsizeto'] = { init: function() { this.jsonInit({ "message0": "fijar tamaño a %1 %", "args0": [{ "type": "input_value", "name": "SIZE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_changeeffectby'] = {
        init: function() {
          this.jsonInit({ "message0": "cambiar efecto %1 por %2", "args0": [{ "type": "field_dropdown", "name": "EFFECT", "options": [["color", "COLOR"], ["ojo de pez", "FISHEYE"], ["remolino", "WHIRL"], ["pixelar", "PIXELATE"], ["mosaico", "MOSAIC"], ["brillo", "BRIGHTNESS"], ["desvanecer", "GHOST"]] }, { "type": "input_value", "name": "CHANGE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };
      Blockly.Blocks['looks_seteffectto'] = {
        init: function() {
          this.jsonInit({ "message0": "fijar efecto %1 a %2", "args0": [{ "type": "field_dropdown", "name": "EFFECT", "options": [["color", "COLOR"], ["ojo de pez", "FISHEYE"], ["remolino", "WHIRL"], ["pixelar", "PIXELATE"], ["mosaico", "MOSAIC"], ["brillo", "BRIGHTNESS"], ["desvanecer", "GHOST"]] }, { "type": "input_value", "name": "VALUE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color });
        }
      };
      Blockly.Blocks['looks_cleargraphiceffects'] = { init: function() { this.jsonInit({ "message0": "quitar efectos gráficos", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_show'] = { init: function() { this.jsonInit({ "message0": "mostrar", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_hide'] = { init: function() { this.jsonInit({ "message0": "esconder", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_gotofrontback'] = { init: function() { this.jsonInit({ "message0": "ir a capa %1", "args0": [{ "type": "field_dropdown", "name": "FRONT_BACK", "options": [["delantera", "front"], ["trasera", "back"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_goforwardbackwardlayers'] = { init: function() { this.jsonInit({ "message0": "ir %1 %2 capas", "args0": [{ "type": "field_dropdown", "name": "FORWARD_BACKWARD", "options": [["hacia adelante", "forward"], ["hacia atrás", "backward"]] }, { "type": "input_value", "name": "NUM", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['looks_costumenumbername'] = { init: function() { this.jsonInit({ "message0": "%1 de disfraz", "args0": [{ "type": "field_dropdown", "name": "NUMBER_NAME", "options": [["número", "number"], ["nombre", "name"]] }], "output": null, "colour": color }); } };
      Blockly.Blocks['looks_backdropnumbername'] = { init: function() { this.jsonInit({ "message0": "%1 de fondo", "args0": [{ "type": "field_dropdown", "name": "NUMBER_NAME", "options": [["número", "number"], ["nombre", "name"]] }], "output": null, "colour": color }); } };
      Blockly.Blocks['looks_size'] = { init: function() { this.jsonInit({ "message0": "tamaño", "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE SONIDO ====================
    registerSoundBlocks: function() {
      var color = COLORS.sound.primary;
      Blockly.Blocks['sound_playuntildone'] = { init: function() { this.jsonInit({ "message0": "tocar sonido %1 hasta que termine", "args0": [{ "type": "field_dropdown", "name": "SOUND_MENU", "options": [["pop", "pop"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sound_play'] = { init: function() { this.jsonInit({ "message0": "tocar sonido %1", "args0": [{ "type": "field_dropdown", "name": "SOUND_MENU", "options": [["pop", "pop"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sound_stopallsounds'] = { init: function() { this.jsonInit({ "message0": "detener todos los sonidos", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sound_changevolumeby'] = { init: function() { this.jsonInit({ "message0": "cambiar volumen por %1", "args0": [{ "type": "input_value", "name": "VOLUME", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sound_setvolumeto'] = { init: function() { this.jsonInit({ "message0": "fijar volumen a %1 %", "args0": [{ "type": "input_value", "name": "VOLUME", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sound_volume'] = { init: function() { this.jsonInit({ "message0": "volumen", "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE EVENTOS ====================
    registerEventBlocks: function() {
      var color = COLORS.events.primary;
      Blockly.Blocks['event_whenflagclicked'] = { init: function() { this.jsonInit({ "message0": "🚩 al hacer clic en la bandera", "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whenkeypressed'] = { init: function() { this.jsonInit({ "message0": "al presionar tecla %1", "args0": [{ "type": "field_dropdown", "name": "KEY_OPTION", "options": [["espacio", "space"], ["flecha arriba", "up arrow"], ["flecha abajo", "down arrow"], ["flecha derecha", "right arrow"], ["flecha izquierda", "left arrow"], ["cualquiera", "any"]] }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whenthisspriteclicked'] = { init: function() { this.jsonInit({ "message0": "al hacer clic en este objeto", "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whenbackdropswitchesto'] = { init: function() { this.jsonInit({ "message0": "cuando el fondo cambie a %1", "args0": [{ "type": "field_dropdown", "name": "BACKDROP", "options": [["fondo1", "backdrop1"]] }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whengreaterthan'] = { init: function() { this.jsonInit({ "message0": "cuando %1 > %2", "args0": [{ "type": "field_dropdown", "name": "WHENGREATERTHANMENU", "options": [["volumen", "LOUDNESS"], ["temporizador", "TIMER"]] }, { "type": "input_value", "name": "VALUE", "check": "Number" }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whenbroadcastreceived'] = { init: function() { this.jsonInit({ "message0": "al recibir %1", "args0": [{ "type": "field_dropdown", "name": "BROADCAST_OPTION", "options": [["mensaje1", "message1"]] }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_broadcast'] = { init: function() { this.jsonInit({ "message0": "enviar %1", "args0": [{ "type": "field_dropdown", "name": "BROADCAST_INPUT", "options": [["mensaje1", "message1"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_broadcastandwait'] = { init: function() { this.jsonInit({ "message0": "enviar %1 y esperar", "args0": [{ "type": "field_dropdown", "name": "BROADCAST_INPUT", "options": [["mensaje1", "message1"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      // Eventos personalizados
      Blockly.Blocks['event_everyframe'] = { init: function() { this.jsonInit({ "message0": "⚡ cada frame", "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_everyseconds'] = { init: function() { this.jsonInit({ "message0": "⏱ cada %1 segundos", "args0": [{ "type": "input_value", "name": "SECS", "check": "Number" }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_whencustom'] = { init: function() { this.jsonInit({ "message0": "cuando ocurra evento %1", "args0": [{ "type": "input_value", "name": "NAME" }], "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_emitcustom'] = { init: function() { this.jsonInit({ "message0": "emitir evento %1", "args0": [{ "type": "input_value", "name": "NAME" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['event_emitcustomwithdata'] = { init: function() { this.jsonInit({ "message0": "emitir evento %1 con dato %2", "args0": [{ "type": "input_value", "name": "NAME" }, { "type": "input_value", "name": "DATA" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
    },

    // ==================== BLOQUES DE CONTROL ====================
    registerControlBlocks: function() {
      var color = COLORS.control.primary;
      Blockly.Blocks['control_wait'] = { init: function() { this.jsonInit({ "message0": "esperar %1 segundos", "args0": [{ "type": "input_value", "name": "DURATION", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_repeat'] = { init: function() { this.jsonInit({ "message0": "repetir %1", "args0": [{ "type": "input_value", "name": "TIMES", "check": "Number" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_forever'] = { init: function() { this.jsonInit({ "message0": "por siempre", "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "colour": color }); } };
      Blockly.Blocks['control_if'] = { init: function() { this.jsonInit({ "message0": "si %1 entonces", "args0": [{ "type": "input_value", "name": "CONDITION", "check": "Boolean" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_if_else'] = { init: function() { this.jsonInit({ "message0": "si %1 entonces", "args0": [{ "type": "input_value", "name": "CONDITION", "check": "Boolean" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "message2": "si no", "message3": "%1", "args3": [{ "type": "input_statement", "name": "SUBSTACK2" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_wait_until'] = { init: function() { this.jsonInit({ "message0": "esperar hasta que %1", "args0": [{ "type": "input_value", "name": "CONDITION", "check": "Boolean" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_repeat_until'] = { init: function() { this.jsonInit({ "message0": "repetir hasta que %1", "args0": [{ "type": "input_value", "name": "CONDITION", "check": "Boolean" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_stop'] = { init: function() { this.jsonInit({ "message0": "detener %1", "args0": [{ "type": "field_dropdown", "name": "STOP_OPTION", "options": [["todos", "all"], ["este programa", "this script"], ["otros programas", "other scripts in sprite"]] }], "previousStatement": null, "colour": color }); } };
      Blockly.Blocks['control_start_as_clone'] = { init: function() { this.jsonInit({ "message0": "al comenzar como clon", "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_create_clone_of'] = { init: function() { this.jsonInit({ "message0": "crear clon de %1", "args0": [{ "type": "field_dropdown", "name": "CLONE_OPTION", "options": [["mí mismo", "_myself_"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_delete_this_clone'] = { init: function() { this.jsonInit({ "message0": "borrar este clon", "previousStatement": null, "colour": color }); } };
      // Control avanzado
      Blockly.Blocks['control_for_range'] = { init: function() { this.jsonInit({ "message0": "para %1 desde %2 hasta %3 paso %4", "args0": [{ "type": "field_variable", "name": "VARIABLE" }, { "type": "input_value", "name": "START", "check": "Number" }, { "type": "input_value", "name": "END", "check": "Number" }, { "type": "input_value", "name": "STEP", "check": "Number" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_every_seconds'] = { init: function() { this.jsonInit({ "message0": "cada %1 segundos", "args0": [{ "type": "input_value", "name": "SECS", "check": "Number" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_for_seconds'] = { init: function() { this.jsonInit({ "message0": "durante %1 segundos", "args0": [{ "type": "input_value", "name": "SECS", "check": "Number" }], "message1": "%1", "args1": [{ "type": "input_statement", "name": "SUBSTACK" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['control_break'] = { init: function() { this.jsonInit({ "message0": "salir del ciclo", "previousStatement": null, "colour": color }); } };
      Blockly.Blocks['control_continue'] = { init: function() { this.jsonInit({ "message0": "continuar ciclo", "previousStatement": null, "nextStatement": null, "colour": color }); } };
    },

    // ==================== BLOQUES DE SENSORES ====================
    registerSensingBlocks: function() {
      var color = COLORS.sensing.primary;
      Blockly.Blocks['sensing_touchingobject'] = { init: function() { this.jsonInit({ "message0": "¿tocando %1 ?", "args0": [{ "type": "field_dropdown", "name": "TOUCHINGOBJECTMENU", "options": [["puntero del ratón", "_mouse_"], ["borde", "_edge_"]] }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['sensing_touchingcolor'] = { init: function() { this.jsonInit({ "message0": "¿tocando el color %1 ?", "args0": [{ "type": "input_value", "name": "COLOR" }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['sensing_coloristouchingcolor'] = { init: function() { this.jsonInit({ "message0": "¿color %1 tocando %2 ?", "args0": [{ "type": "input_value", "name": "COLOR" }, { "type": "input_value", "name": "COLOR2" }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['sensing_distanceto'] = { init: function() { this.jsonInit({ "message0": "distancia a %1", "args0": [{ "type": "field_dropdown", "name": "DISTANCETOMENU", "options": [["puntero del ratón", "_mouse_"]] }], "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_askandwait'] = { init: function() { this.jsonInit({ "message0": "preguntar %1 y esperar", "args0": [{ "type": "input_value", "name": "QUESTION" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sensing_answer'] = { init: function() { this.jsonInit({ "message0": "respuesta", "output": "String", "colour": color }); } };
      Blockly.Blocks['sensing_keypressed'] = { init: function() { this.jsonInit({ "message0": "¿tecla %1 presionada?", "args0": [{ "type": "field_dropdown", "name": "KEY_OPTION", "options": [["espacio", "space"], ["flecha arriba", "up arrow"], ["flecha abajo", "down arrow"], ["flecha derecha", "right arrow"], ["flecha izquierda", "left arrow"]] }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['sensing_mousedown'] = { init: function() { this.jsonInit({ "message0": "¿ratón presionado?", "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['sensing_mousex'] = { init: function() { this.jsonInit({ "message0": "posición x del ratón", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_mousey'] = { init: function() { this.jsonInit({ "message0": "posición y del ratón", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_loudness'] = { init: function() { this.jsonInit({ "message0": "volumen del sonido", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_timer'] = { init: function() { this.jsonInit({ "message0": "cronómetro", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_resettimer'] = { init: function() { this.jsonInit({ "message0": "reiniciar cronómetro", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['sensing_current'] = { init: function() { this.jsonInit({ "message0": "%1 actual", "args0": [{ "type": "field_dropdown", "name": "CURRENTMENU", "options": [["año", "YEAR"], ["mes", "MONTH"], ["fecha", "DATE"], ["día de la semana", "DAYOFWEEK"], ["hora", "HOUR"], ["minuto", "MINUTE"], ["segundo", "SECOND"]] }], "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_dayssince2000'] = { init: function() { this.jsonInit({ "message0": "días desde 2000", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_username'] = { init: function() { this.jsonInit({ "message0": "nombre de usuario", "output": "String", "colour": color }); } };
      // Sensing extendido
      Blockly.Blocks['sensing_deltatime'] = { init: function() { this.jsonInit({ "message0": "delta time", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_fps'] = { init: function() { this.jsonInit({ "message0": "FPS actual", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_stagewidth'] = { init: function() { this.jsonInit({ "message0": "ancho del escenario", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_stageheight'] = { init: function() { this.jsonInit({ "message0": "alto del escenario", "output": "Number", "colour": color }); } };
      Blockly.Blocks['sensing_mousespeed'] = { init: function() { this.jsonInit({ "message0": "velocidad del mouse", "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE OPERADORES ====================
    registerOperatorBlocks: function() {
      var color = COLORS.operators.primary;
      Blockly.Blocks['operator_add'] = { init: function() { this.jsonInit({ "message0": "%1 + %2", "args0": [{ "type": "input_value", "name": "NUM1", "check": "Number" }, { "type": "input_value", "name": "NUM2", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_subtract'] = { init: function() { this.jsonInit({ "message0": "%1 - %2", "args0": [{ "type": "input_value", "name": "NUM1", "check": "Number" }, { "type": "input_value", "name": "NUM2", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_multiply'] = { init: function() { this.jsonInit({ "message0": "%1 × %2", "args0": [{ "type": "input_value", "name": "NUM1", "check": "Number" }, { "type": "input_value", "name": "NUM2", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_divide'] = { init: function() { this.jsonInit({ "message0": "%1 / %2", "args0": [{ "type": "input_value", "name": "NUM1", "check": "Number" }, { "type": "input_value", "name": "NUM2", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_random'] = { init: function() { this.jsonInit({ "message0": "número al azar entre %1 y %2", "args0": [{ "type": "input_value", "name": "FROM", "check": "Number" }, { "type": "input_value", "name": "TO", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_gt'] = { init: function() { this.jsonInit({ "message0": "%1 > %2", "args0": [{ "type": "input_value", "name": "OPERAND1", "check": "Number" }, { "type": "input_value", "name": "OPERAND2", "check": "Number" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_lt'] = { init: function() { this.jsonInit({ "message0": "%1 < %2", "args0": [{ "type": "input_value", "name": "OPERAND1", "check": "Number" }, { "type": "input_value", "name": "OPERAND2", "check": "Number" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_equals'] = { init: function() { this.jsonInit({ "message0": "%1 = %2", "args0": [{ "type": "input_value", "name": "OPERAND1" }, { "type": "input_value", "name": "OPERAND2" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_and'] = { init: function() { this.jsonInit({ "message0": "%1 y %2", "args0": [{ "type": "input_value", "name": "OPERAND1", "check": "Boolean" }, { "type": "input_value", "name": "OPERAND2", "check": "Boolean" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_or'] = { init: function() { this.jsonInit({ "message0": "%1 o %2", "args0": [{ "type": "input_value", "name": "OPERAND1", "check": "Boolean" }, { "type": "input_value", "name": "OPERAND2", "check": "Boolean" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_not'] = { init: function() { this.jsonInit({ "message0": "no %1", "args0": [{ "type": "input_value", "name": "OPERAND", "check": "Boolean" }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_join'] = { init: function() { this.jsonInit({ "message0": "unir %1 %2", "args0": [{ "type": "input_value", "name": "STRING1" }, { "type": "input_value", "name": "STRING2" }], "inputsInline": true, "output": "String", "colour": color }); } };
      Blockly.Blocks['operator_letter_of'] = { init: function() { this.jsonInit({ "message0": "letra %1 de %2", "args0": [{ "type": "input_value", "name": "LETTER", "check": "Number" }, { "type": "input_value", "name": "STRING" }], "inputsInline": true, "output": "String", "colour": color }); } };
      Blockly.Blocks['operator_length'] = { init: function() { this.jsonInit({ "message0": "longitud de %1", "args0": [{ "type": "input_value", "name": "STRING" }], "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_contains'] = { init: function() { this.jsonInit({ "message0": "¿%1 contiene %2 ?", "args0": [{ "type": "input_value", "name": "STRING1" }, { "type": "input_value", "name": "STRING2" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['operator_mod'] = { init: function() { this.jsonInit({ "message0": "%1 módulo %2", "args0": [{ "type": "input_value", "name": "NUM1", "check": "Number" }, { "type": "input_value", "name": "NUM2", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_round'] = { init: function() { this.jsonInit({ "message0": "redondear %1", "args0": [{ "type": "input_value", "name": "NUM", "check": "Number" }], "output": "Number", "colour": color }); } };
      Blockly.Blocks['operator_mathop'] = { init: function() { this.jsonInit({ "message0": "%1 de %2", "args0": [{ "type": "field_dropdown", "name": "OPERATOR", "options": [["abs", "abs"], ["piso", "floor"], ["techo", "ceiling"], ["raíz", "sqrt"], ["sin", "sin"], ["cos", "cos"], ["tan", "tan"], ["asin", "asin"], ["acos", "acos"], ["atan", "atan"], ["ln", "ln"], ["log", "log"], ["e ^", "e ^"], ["10 ^", "10 ^"]] }, { "type": "input_value", "name": "NUM", "check": "Number" }], "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE VARIABLES ====================
    registerVariableBlocks: function() {
      var varColor = COLORS.variables.primary;
      var listColor = COLORS.lists.primary;
      Blockly.Blocks['data_setvariableto'] = { init: function() { this.jsonInit({ "message0": "fijar %1 a %2", "args0": [{ "type": "field_variable", "name": "VARIABLE", "variable": "mi variable" }, { "type": "input_value", "name": "VALUE" }], "previousStatement": null, "nextStatement": null, "colour": varColor }); } };
      Blockly.Blocks['data_changevariableby'] = { init: function() { this.jsonInit({ "message0": "cambiar %1 por %2", "args0": [{ "type": "field_variable", "name": "VARIABLE", "variable": "mi variable" }, { "type": "input_value", "name": "VALUE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": varColor }); } };
      Blockly.Blocks['data_showvariable'] = { init: function() { this.jsonInit({ "message0": "mostrar variable %1", "args0": [{ "type": "field_variable", "name": "VARIABLE", "variable": "mi variable" }], "previousStatement": null, "nextStatement": null, "colour": varColor }); } };
      Blockly.Blocks['data_hidevariable'] = { init: function() { this.jsonInit({ "message0": "esconder variable %1", "args0": [{ "type": "field_variable", "name": "VARIABLE", "variable": "mi variable" }], "previousStatement": null, "nextStatement": null, "colour": varColor }); } };
      Blockly.Blocks['data_addtolist'] = { init: function() { this.jsonInit({ "message0": "añadir %1 a %2", "args0": [{ "type": "input_value", "name": "ITEM" }, { "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "previousStatement": null, "nextStatement": null, "colour": listColor }); } };
      Blockly.Blocks['data_deleteoflist'] = { init: function() { this.jsonInit({ "message0": "borrar %1 de %2", "args0": [{ "type": "input_value", "name": "INDEX", "check": "Number" }, { "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "previousStatement": null, "nextStatement": null, "colour": listColor }); } };
      Blockly.Blocks['data_deletealloflist'] = { init: function() { this.jsonInit({ "message0": "borrar todo de %1", "args0": [{ "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "previousStatement": null, "nextStatement": null, "colour": listColor }); } };
      Blockly.Blocks['data_insertatlist'] = { init: function() { this.jsonInit({ "message0": "insertar %1 en %2 de %3", "args0": [{ "type": "input_value", "name": "ITEM" }, { "type": "input_value", "name": "INDEX", "check": "Number" }, { "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "previousStatement": null, "nextStatement": null, "colour": listColor }); } };
      Blockly.Blocks['data_replaceitemoflist'] = { init: function() { this.jsonInit({ "message0": "reemplazar elemento %1 de %2 con %3", "args0": [{ "type": "input_value", "name": "INDEX", "check": "Number" }, { "type": "field_variable", "name": "LIST", "variable": "mi lista" }, { "type": "input_value", "name": "ITEM" }], "previousStatement": null, "nextStatement": null, "colour": listColor }); } };
      Blockly.Blocks['data_itemoflist'] = { init: function() { this.jsonInit({ "message0": "elemento %1 de %2", "args0": [{ "type": "input_value", "name": "INDEX", "check": "Number" }, { "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "output": null, "colour": listColor }); } };
      Blockly.Blocks['data_lengthoflist'] = { init: function() { this.jsonInit({ "message0": "longitud de %1", "args0": [{ "type": "field_variable", "name": "LIST", "variable": "mi lista" }], "output": "Number", "colour": listColor }); } };
      Blockly.Blocks['data_listcontainsitem'] = { init: function() { this.jsonInit({ "message0": "¿%1 contiene %2 ?", "args0": [{ "type": "field_variable", "name": "LIST", "variable": "mi lista" }, { "type": "input_value", "name": "ITEM" }], "output": "Boolean", "colour": listColor }); } };
    },

    // ==================== BLOQUES DE LÁPIZ ====================
    registerPenBlocks: function() {
      var color = COLORS.pen.primary;
      Blockly.Blocks['pen_clear'] = { init: function() { this.jsonInit({ "message0": "borrar todo", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_stamp'] = { init: function() { this.jsonInit({ "message0": "sellar", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_pendown'] = { init: function() { this.jsonInit({ "message0": "bajar lápiz", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_penup'] = { init: function() { this.jsonInit({ "message0": "subir lápiz", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_setpencolortocolor'] = { init: function() { this.jsonInit({ "message0": "fijar color de lápiz a %1", "args0": [{ "type": "input_value", "name": "COLOR" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_changepensizeby'] = { init: function() { this.jsonInit({ "message0": "cambiar tamaño de lápiz por %1", "args0": [{ "type": "input_value", "name": "SIZE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['pen_setpensizeto'] = { init: function() { this.jsonInit({ "message0": "fijar tamaño de lápiz a %1", "args0": [{ "type": "input_value", "name": "SIZE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
    },

    // ==================== BLOQUES DE MÚSICA ====================
    registerMusicBlocks: function() {
      var color = COLORS.music.primary;
      Blockly.Blocks['music_playdrumforbeats'] = { init: function() { this.jsonInit({ "message0": "tocar tambor %1 durante %2 tiempos", "args0": [{ "type": "field_dropdown", "name": "DRUM", "options": [["(1) Bombo", "1"], ["(2) Caja", "2"]] }, { "type": "input_value", "name": "BEATS", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_restforbeats'] = { init: function() { this.jsonInit({ "message0": "silencio durante %1 tiempos", "args0": [{ "type": "input_value", "name": "BEATS", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_playnoteforbeats'] = { init: function() { this.jsonInit({ "message0": "tocar nota %1 durante %2 tiempos", "args0": [{ "type": "input_value", "name": "NOTE", "check": "Number" }, { "type": "input_value", "name": "BEATS", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_setinstrument'] = { init: function() { this.jsonInit({ "message0": "fijar instrumento a %1", "args0": [{ "type": "field_dropdown", "name": "INSTRUMENT", "options": [["(1) Piano", "1"], ["(2) Guitarra", "2"]] }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_settempo'] = { init: function() { this.jsonInit({ "message0": "fijar tempo a %1", "args0": [{ "type": "input_value", "name": "TEMPO", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_changetempo'] = { init: function() { this.jsonInit({ "message0": "cambiar tempo por %1", "args0": [{ "type": "input_value", "name": "TEMPO", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['music_gettempo'] = { init: function() { this.jsonInit({ "message0": "tempo", "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE LÓGICA AVANZADA ====================
    registerLogicBlocks: function() {
      var color = COLORS.logic.primary;
      var dataColor = COLORS.data.primary;
      Blockly.Blocks['logic_true'] = { init: function() { this.jsonInit({ "message0": "verdadero", "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['logic_false'] = { init: function() { this.jsonInit({ "message0": "falso", "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['logic_xor'] = { init: function() { this.jsonInit({ "message0": "%1 xor %2", "args0": [{ "type": "input_value", "name": "A", "check": "Boolean" }, { "type": "input_value", "name": "B", "check": "Boolean" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['logic_between'] = { init: function() { this.jsonInit({ "message0": "%1 entre %2 y %3", "args0": [{ "type": "input_value", "name": "VALUE", "check": "Number" }, { "type": "input_value", "name": "MIN", "check": "Number" }, { "type": "input_value", "name": "MAX", "check": "Number" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['logic_clamp'] = { init: function() { this.jsonInit({ "message0": "limitar %1 entre %2 y %3", "args0": [{ "type": "input_value", "name": "VALUE", "check": "Number" }, { "type": "input_value", "name": "MIN", "check": "Number" }, { "type": "input_value", "name": "MAX", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_map'] = { init: function() { this.jsonInit({ "message0": "mapear %1 de %2-%3 a %4-%5", "args0": [{ "type": "input_value", "name": "VALUE" }, { "type": "input_value", "name": "IN_MIN" }, { "type": "input_value", "name": "IN_MAX" }, { "type": "input_value", "name": "OUT_MIN" }, { "type": "input_value", "name": "OUT_MAX" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_lerp'] = { init: function() { this.jsonInit({ "message0": "interpolar %1 a %2 por %3", "args0": [{ "type": "input_value", "name": "A", "check": "Number" }, { "type": "input_value", "name": "B", "check": "Number" }, { "type": "input_value", "name": "T", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_distance'] = { init: function() { this.jsonInit({ "message0": "distancia x1:%1 y1:%2 x2:%3 y2:%4", "args0": [{ "type": "input_value", "name": "X1" }, { "type": "input_value", "name": "Y1" }, { "type": "input_value", "name": "X2" }, { "type": "input_value", "name": "Y2" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_rounddecimals'] = { init: function() { this.jsonInit({ "message0": "redondear %1 a %2 decimales", "args0": [{ "type": "input_value", "name": "VALUE", "check": "Number" }, { "type": "input_value", "name": "DECIMALS", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_percent'] = { init: function() { this.jsonInit({ "message0": "porcentaje %1 de %2", "args0": [{ "type": "input_value", "name": "PART", "check": "Number" }, { "type": "input_value", "name": "TOTAL", "check": "Number" }], "inputsInline": true, "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_textcontains'] = { init: function() { this.jsonInit({ "message0": "texto %1 contiene %2", "args0": [{ "type": "input_value", "name": "TEXT" }, { "type": "input_value", "name": "PART" }], "inputsInline": true, "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['logic_textreplace'] = { init: function() { this.jsonInit({ "message0": "reemplazar %1 por %2 en %3", "args0": [{ "type": "input_value", "name": "FIND" }, { "type": "input_value", "name": "REPLACE" }, { "type": "input_value", "name": "TEXT" }], "inputsInline": true, "output": "String", "colour": color }); } };
      Blockly.Blocks['logic_tonumber'] = { init: function() { this.jsonInit({ "message0": "convertir %1 a número", "args0": [{ "type": "input_value", "name": "VALUE" }], "output": "Number", "colour": color }); } };
      Blockly.Blocks['logic_totext'] = { init: function() { this.jsonInit({ "message0": "convertir %1 a texto", "args0": [{ "type": "input_value", "name": "VALUE" }], "output": "String", "colour": color }); } };
      // JSON/Data
      Blockly.Blocks['logic_jsonget'] = { init: function() { this.jsonInit({ "message0": "objeto %1 propiedad %2", "args0": [{ "type": "input_value", "name": "JSON" }, { "type": "input_value", "name": "KEY" }], "inputsInline": true, "output": null, "colour": dataColor }); } };
      Blockly.Blocks['logic_jsonset'] = { init: function() { this.jsonInit({ "message0": "objeto %1 poner %2 a %3", "args0": [{ "type": "input_value", "name": "JSON" }, { "type": "input_value", "name": "KEY" }, { "type": "input_value", "name": "VALUE" }], "inputsInline": true, "output": null, "colour": dataColor }); } };
      Blockly.Blocks['logic_jsonstringify'] = { init: function() { this.jsonInit({ "message0": "convertir %1 a JSON", "args0": [{ "type": "input_value", "name": "VALUE" }], "output": "String", "colour": dataColor }); } };
    },

    // ==================== BLOQUES DE ESTADO ====================
    registerStateBlocks: function() {
      var color = COLORS.state.primary;
      Blockly.Blocks['state_set'] = { init: function() { this.jsonInit({ "message0": "cambiar estado a %1", "args0": [{ "type": "input_value", "name": "NAME" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['state_current'] = { init: function() { this.jsonInit({ "message0": "estado actual", "output": "String", "colour": color }); } };
      Blockly.Blocks['state_previous'] = { init: function() { this.jsonInit({ "message0": "estado anterior", "output": "String", "colour": color }); } };
      Blockly.Blocks['state_is'] = { init: function() { this.jsonInit({ "message0": "estado actual es %1", "args0": [{ "type": "input_value", "name": "NAME" }], "output": "Boolean", "colour": color }); } };
      Blockly.Blocks['state_back'] = { init: function() { this.jsonInit({ "message0": "volver al estado anterior", "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['state_reset'] = { init: function() { this.jsonInit({ "message0": "reiniciar estado", "previousStatement": null, "nextStatement": null, "colour": color }); } };
    },

    // ==================== BLOQUES DE DEBUG ====================
    registerDebugBlocks: function() {
      var color = COLORS.debug.primary;
      Blockly.Blocks['debug_log'] = { init: function() { this.jsonInit({ "message0": "consola imprimir %1", "args0": [{ "type": "input_value", "name": "VALUE" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['debug_warn'] = { init: function() { this.jsonInit({ "message0": "consola advertencia %1", "args0": [{ "type": "input_value", "name": "VALUE" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['debug_error'] = { init: function() { this.jsonInit({ "message0": "consola error %1", "args0": [{ "type": "input_value", "name": "VALUE" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['debug_pauseif'] = { init: function() { this.jsonInit({ "message0": "pausar si %1", "args0": [{ "type": "input_value", "name": "CONDITION", "check": "Boolean" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['debug_mark'] = { init: function() { this.jsonInit({ "message0": "marcar tiempo %1", "args0": [{ "type": "input_value", "name": "NAME" }], "previousStatement": null, "nextStatement": null, "colour": color }); } };
      Blockly.Blocks['debug_mssincemark'] = { init: function() { this.jsonInit({ "message0": "ms desde marca %1", "args0": [{ "type": "input_value", "name": "NAME" }], "output": "Number", "colour": color }); } };
    },

    // ==================== BLOQUES DE JUEGO ====================
    registerGameBlocks: function() {
      var g = COLORS.gravity.primary;
      var p = COLORS.physics.primary;
      var c = COLORS.camera.primary;
      var ai = COLORS.ai.primary;
      var cb = COLORS.combat.primary;

      // Gravedad
      Blockly.Blocks['game_setgravity'] = { init: function() { this.jsonInit({ "message0": "fijar gravedad a %1", "args0": [{ "type": "input_value", "name": "GRAVITY", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": g }); } };
      Blockly.Blocks['game_changegravity'] = { init: function() { this.jsonInit({ "message0": "cambiar gravedad por %1", "args0": [{ "type": "input_value", "name": "GRAVITY", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": g }); } };
      Blockly.Blocks['game_gravity'] = { init: function() { this.jsonInit({ "message0": "gravedad", "output": "Number", "colour": g }); } };
      Blockly.Blocks['game_applygravity'] = { init: function() { this.jsonInit({ "message0": "aplicar gravedad", "previousStatement": null, "nextStatement": null, "colour": g }); } };
      Blockly.Blocks['game_jump'] = { init: function() { this.jsonInit({ "message0": "saltar con fuerza %1", "args0": [{ "type": "input_value", "name": "FORCE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": g }); } };
      Blockly.Blocks['game_isonground'] = { init: function() { this.jsonInit({ "message0": "tocando suelo con tolerancia %1", "args0": [{ "type": "input_value", "name": "TOLERANCE", "check": "Number" }], "output": "Boolean", "colour": g }); } };
      Blockly.Blocks['game_setgroundy'] = { init: function() { this.jsonInit({ "message0": "fijar suelo en y %1", "args0": [{ "type": "input_value", "name": "Y", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": g }); } };
      Blockly.Blocks['game_resetphysics'] = { init: function() { this.jsonInit({ "message0": "reiniciar físicas", "previousStatement": null, "nextStatement": null, "colour": g }); } };

      // Física
      Blockly.Blocks['game_setvelocity'] = { init: function() { this.jsonInit({ "message0": "fijar velocidad x %1 y %2", "args0": [{ "type": "input_value", "name": "VX", "check": "Number" }, { "type": "input_value", "name": "VY", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_changevelocity'] = { init: function() { this.jsonInit({ "message0": "cambiar velocidad x %1 y %2", "args0": [{ "type": "input_value", "name": "VX", "check": "Number" }, { "type": "input_value", "name": "VY", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_velocityx'] = { init: function() { this.jsonInit({ "message0": "velocidad x", "output": "Number", "colour": p }); } };
      Blockly.Blocks['game_velocityy'] = { init: function() { this.jsonInit({ "message0": "velocidad y", "output": "Number", "colour": p }); } };
      Blockly.Blocks['game_applyvelocity'] = { init: function() { this.jsonInit({ "message0": "aplicar velocidad", "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_setfriction'] = { init: function() { this.jsonInit({ "message0": "fijar fricción a %1", "args0": [{ "type": "input_value", "name": "FRICTION", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_setbounce'] = { init: function() { this.jsonInit({ "message0": "fijar rebote a %1", "args0": [{ "type": "input_value", "name": "BOUNCE", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_applyforce'] = { init: function() { this.jsonInit({ "message0": "aplicar fuerza %1 en dirección %2", "args0": [{ "type": "input_value", "name": "FORCE", "check": "Number" }, { "type": "input_value", "name": "DIRECTION", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_stopmotion'] = { init: function() { this.jsonInit({ "message0": "detener movimiento %1", "args0": [{ "type": "field_dropdown", "name": "AXIS", "options": [["todo", "all"], ["x", "x"], ["y", "y"]] }], "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_clamptostage'] = { init: function() { this.jsonInit({ "message0": "mantener dentro del escenario", "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_bounceonstageedge'] = { init: function() { this.jsonInit({ "message0": "rebotar en borde del escenario", "previousStatement": null, "nextStatement": null, "colour": p }); } };
      Blockly.Blocks['game_speed'] = { init: function() { this.jsonInit({ "message0": "rapidez", "output": "Number", "colour": p }); } };

      // Cámara
      Blockly.Blocks['game_camerasetxy'] = { init: function() { this.jsonInit({ "message0": "cámara ir a x %1 y %2", "args0": [{ "type": "input_value", "name": "X", "check": "Number" }, { "type": "input_value", "name": "Y", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": c }); } };
      Blockly.Blocks['game_camerachangexy'] = { init: function() { this.jsonInit({ "message0": "mover cámara x %1 y %2", "args0": [{ "type": "input_value", "name": "X", "check": "Number" }, { "type": "input_value", "name": "Y", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": c }); } };
      Blockly.Blocks['game_camerafollowthis'] = { init: function() { this.jsonInit({ "message0": "cámara seguir este sprite suavidad %1", "args0": [{ "type": "input_value", "name": "STRENGTH", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": c }); } };
      Blockly.Blocks['game_camerasetzoom'] = { init: function() { this.jsonInit({ "message0": "fijar zoom de cámara a %1", "args0": [{ "type": "input_value", "name": "ZOOM", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": c }); } };
      Blockly.Blocks['game_camerashake'] = { init: function() { this.jsonInit({ "message0": "sacudir cámara intensidad %1", "args0": [{ "type": "input_value", "name": "AMOUNT", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": c }); } };
      Blockly.Blocks['game_camerax'] = { init: function() { this.jsonInit({ "message0": "cámara x", "output": "Number", "colour": c }); } };
      Blockly.Blocks['game_cameray'] = { init: function() { this.jsonInit({ "message0": "cámara y", "output": "Number", "colour": c }); } };
      Blockly.Blocks['game_camerazoom'] = { init: function() { this.jsonInit({ "message0": "zoom de cámara", "output": "Number", "colour": c }); } };

      // IA
      Blockly.Blocks['game_aimovetoxy'] = { init: function() { this.jsonInit({ "message0": "IA mover hacia x %1 y %2 velocidad %3", "args0": [{ "type": "input_value", "name": "X", "check": "Number" }, { "type": "input_value", "name": "Y", "check": "Number" }, { "type": "input_value", "name": "SPEED", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": ai }); } };
      Blockly.Blocks['game_aimovetowardtarget'] = { init: function() { this.jsonInit({ "message0": "IA perseguir %1 velocidad %2", "args0": [{ "type": "input_value", "name": "TARGET" }, { "type": "input_value", "name": "SPEED", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": ai }); } };
      Blockly.Blocks['game_aifleefromtarget'] = { init: function() { this.jsonInit({ "message0": "IA huir de %1 velocidad %2", "args0": [{ "type": "input_value", "name": "TARGET" }, { "type": "input_value", "name": "SPEED", "check": "Number" }], "inputsInline": true, "previousStatement": null, "nextStatement": null, "colour": ai }); } };
      Blockly.Blocks['game_aifacetarget'] = { init: function() { this.jsonInit({ "message0": "IA mirar a %1", "args0": [{ "type": "input_value", "name": "TARGET" }], "previousStatement": null, "nextStatement": null, "colour": ai }); } };
      Blockly.Blocks['game_aidistancetotarget'] = { init: function() { this.jsonInit({ "message0": "distancia IA a %1", "args0": [{ "type": "input_value", "name": "TARGET" }], "output": "Number", "colour": ai }); } };
      Blockly.Blocks['game_aitargetinrange'] = { init: function() { this.jsonInit({ "message0": "%1 está en rango %2", "args0": [{ "type": "input_value", "name": "TARGET" }, { "type": "input_value", "name": "RANGE", "check": "Number" }], "inputsInline": true, "output": "Boolean", "colour": ai }); } };
      Blockly.Blocks['game_aiwander'] = { init: function() { this.jsonInit({ "message0": "IA deambular velocidad %1", "args0": [{ "type": "input_value", "name": "SPEED", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": ai }); } };

      // Combate
      Blockly.Blocks['game_setmaxhealth'] = { init: function() { this.jsonInit({ "message0": "fijar vida máxima a %1", "args0": [{ "type": "input_value", "name": "HEALTH", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_sethealth'] = { init: function() { this.jsonInit({ "message0": "fijar vida a %1", "args0": [{ "type": "input_value", "name": "HEALTH", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_changehealth'] = { init: function() { this.jsonInit({ "message0": "cambiar vida por %1", "args0": [{ "type": "input_value", "name": "HEALTH", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_health'] = { init: function() { this.jsonInit({ "message0": "vida", "output": "Number", "colour": cb }); } };
      Blockly.Blocks['game_maxhealth'] = { init: function() { this.jsonInit({ "message0": "vida máxima", "output": "Number", "colour": cb }); } };
      Blockly.Blocks['game_healthpercent'] = { init: function() { this.jsonInit({ "message0": "vida %", "output": "Number", "colour": cb }); } };
      Blockly.Blocks['game_isalive'] = { init: function() { this.jsonInit({ "message0": "está vivo", "output": "Boolean", "colour": cb }); } };
      Blockly.Blocks['game_damageself'] = { init: function() { this.jsonInit({ "message0": "recibir daño %1", "args0": [{ "type": "input_value", "name": "AMOUNT", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_healself'] = { init: function() { this.jsonInit({ "message0": "curar %1", "args0": [{ "type": "input_value", "name": "AMOUNT", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_setinvincible'] = { init: function() { this.jsonInit({ "message0": "hacer invencible por %1 segundos", "args0": [{ "type": "input_value", "name": "SECS", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
      Blockly.Blocks['game_isinvincible'] = { init: function() { this.jsonInit({ "message0": "es invencible", "output": "Boolean", "colour": cb }); } };
      Blockly.Blocks['game_revive'] = { init: function() { this.jsonInit({ "message0": "revivir con vida %1", "args0": [{ "type": "input_value", "name": "HEALTH", "check": "Number" }], "previousStatement": null, "nextStatement": null, "colour": cb }); } };
    },

    // ==================== CREAR TOOLBOX ====================
    createToolbox: function(options) {
      var isDevices = (options && options.entorno === 'dispositivos');
      if (isDevices) {
        var boardId = (options && options.tarjeta) || (window.evaluacionState && window.evaluacionState.tarjeta) || 'stbBoardV2';
        var dynamicXml = '';
        if (typeof window.registerDynamicDeviceBlocks === 'function') {
          dynamicXml = window.registerDynamicDeviceBlocks(boardId);
        } else {
          dynamicXml = '<category name="Arduino" colour="#00979C">' + this.getArduinoBlocks() + '</category>';
        }
        return '<xml id="toolbox">' +
          dynamicXml +
          '<category name="Control" colour="' + COLORS.control.primary + '">' + this.getControlBlocks() + '</category>' +
          '<category name="Operadores" colour="' + COLORS.operators.primary + '">' + this.getOperatorsBlocks() + '</category>' +
          '<category name="Variables" colour="' + COLORS.variables.primary + '">' + this.getVariablesBlocks() + '</category>' +
          '</xml>';
      }

      return '<xml id="toolbox">' +
        '<category name="Movimiento" colour="' + COLORS.motion.primary + '">' + this.getMotionBlocks() + '</category>' +
        '<category name="Apariencia" colour="' + COLORS.looks.primary + '">' + this.getLooksBlocks() + '</category>' +
        '<category name="Sonido" colour="' + COLORS.sound.primary + '">' + this.getSoundBlocks() + '</category>' +
        '<category name="Eventos" colour="' + COLORS.events.primary + '">' + this.getEventsBlocks() + '</category>' +
        '<category name="Control" colour="' + COLORS.control.primary + '">' + this.getControlBlocks() + '</category>' +
        '<category name="Sensores" colour="' + COLORS.sensing.primary + '">' + this.getSensingBlocks() + '</category>' +
        '<category name="Operadores" colour="' + COLORS.operators.primary + '">' + this.getOperatorsBlocks() + '</category>' +
        '<category name="Variables" colour="' + COLORS.variables.primary + '">' + this.getVariablesBlocks() + '</category>' +
        '<category name="Listas" colour="' + COLORS.lists.primary + '">' + this.getListsBlocks() + '</category>' +
        '<sep></sep>' +
        '<category name="Lápiz" colour="' + COLORS.pen.primary + '">' + this.getPenBlocks() + '</category>' +
        '<category name="Música" colour="' + COLORS.music.primary + '">' + this.getMusicBlocks() + '</category>' +
        '<sep></sep>' +
        '<category name="Lógica+" colour="' + COLORS.logic.primary + '">' + this.getLogicBlocks() + '</category>' +
        '<category name="Estado" colour="' + COLORS.state.primary + '">' + this.getStateBlocks() + '</category>' +
        '<category name="Debug" colour="' + COLORS.debug.primary + '">' + this.getDebugBlocks() + '</category>' +
        '<sep></sep>' +
        '<category name="Gravedad" colour="' + COLORS.gravity.primary + '">' + this.getGravityBlocks() + '</category>' +
        '<category name="Física" colour="' + COLORS.physics.primary + '">' + this.getPhysicsBlocks() + '</category>' +
        '<category name="Cámara" colour="' + COLORS.camera.primary + '">' + this.getCameraBlocks() + '</category>' +
        '<category name="IA" colour="' + COLORS.ai.primary + '">' + this.getAIBlocks() + '</category>' +
        '<category name="Combate" colour="' + COLORS.combat.primary + '">' + this.getCombatBlocks() + '</category>' +
        '</xml>';
    },

    getMotionBlocks: function() { return '<block type="motion_movesteps"><value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="motion_turnright"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block><block type="motion_turnleft"><value name="DEGREES"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block><sep gap="24"></sep><block type="motion_goto"></block><block type="motion_gotoxy"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="motion_glidesecstoxy"><value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><sep gap="24"></sep><block type="motion_pointindirection"><value name="DIRECTION"><shadow type="math_number"><field name="NUM">90</field></shadow></value></block><block type="motion_pointtowards"></block><sep gap="24"></sep><block type="motion_changexby"><value name="DX"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="motion_setx"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="motion_changeyby"><value name="DY"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="motion_sety"><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><sep gap="24"></sep><block type="motion_ifonedgebounce"></block><block type="motion_setrotationstyle"></block><sep gap="24"></sep><block type="motion_xposition"></block><block type="motion_yposition"></block><block type="motion_direction"></block>'; },
    getLooksBlocks: function() { return '<block type="looks_sayforsecs"><value name="MESSAGE"><shadow type="text"><field name="TEXT">¡Hola!</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block><block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">¡Hola!</field></shadow></value></block><block type="looks_thinkforsecs"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block><block type="looks_think"><value name="MESSAGE"><shadow type="text"><field name="TEXT">Hmm...</field></shadow></value></block><sep gap="24"></sep><block type="looks_switchcostumeto"></block><block type="looks_nextcostume"></block><block type="looks_switchbackdropto"></block><block type="looks_nextbackdrop"></block><sep gap="24"></sep><block type="looks_changesizeby"><value name="CHANGE"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="looks_setsizeto"><value name="SIZE"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><sep gap="24"></sep><block type="looks_changeeffectby"><value name="CHANGE"><shadow type="math_number"><field name="NUM">25</field></shadow></value></block><block type="looks_seteffectto"><value name="VALUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="looks_cleargraphiceffects"></block><sep gap="24"></sep><block type="looks_show"></block><block type="looks_hide"></block><block type="looks_gotofrontback"></block><block type="looks_size"></block>'; },
    getSoundBlocks: function() { return '<block type="sound_playuntildone"></block><block type="sound_play"></block><block type="sound_stopallsounds"></block><sep gap="24"></sep><block type="sound_changevolumeby"><value name="VOLUME"><shadow type="math_number"><field name="NUM">-10</field></shadow></value></block><block type="sound_setvolumeto"><value name="VOLUME"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="sound_volume"></block>'; },
    getEventsBlocks: function() { return '<block type="event_whenflagclicked"></block><block type="event_whenkeypressed"></block><block type="event_whenthisspriteclicked"></block><block type="event_whenbackdropswitchesto"></block><sep gap="24"></sep><block type="event_whengreaterthan"><value name="VALUE"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><sep gap="24"></sep><block type="event_whenbroadcastreceived"></block><block type="event_broadcast"></block><block type="event_broadcastandwait"></block><sep gap="24"></sep><block type="event_everyframe"></block><block type="event_everyseconds"><value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="event_whencustom"><value name="NAME"><shadow type="text"><field name="TEXT">evento</field></shadow></value></block><block type="event_emitcustom"><value name="NAME"><shadow type="text"><field name="TEXT">evento</field></shadow></value></block>'; },
    getControlBlocks: function() { return '<block type="control_wait"><value name="DURATION"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><sep gap="24"></sep><block type="control_repeat"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="control_forever"></block><sep gap="24"></sep><block type="control_if"></block><block type="control_if_else"></block><block type="control_wait_until"></block><block type="control_repeat_until"></block><sep gap="24"></sep><block type="control_for_range"><value name="START"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="END"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="STEP"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="control_every_seconds"><value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="control_for_seconds"><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block><sep gap="24"></sep><block type="control_break"></block><block type="control_continue"></block><block type="control_stop"></block><sep gap="24"></sep><block type="control_start_as_clone"></block><block type="control_create_clone_of"></block><block type="control_delete_this_clone"></block>'; },
    getSensingBlocks: function() { return '<block type="sensing_touchingobject"></block><block type="sensing_touchingcolor"></block><block type="sensing_coloristouchingcolor"></block><block type="sensing_distanceto"></block><sep gap="24"></sep><block type="sensing_askandwait"><value name="QUESTION"><shadow type="text"><field name="TEXT">¿Cómo te llamas?</field></shadow></value></block><block type="sensing_answer"></block><sep gap="24"></sep><block type="sensing_keypressed"></block><block type="sensing_mousedown"></block><block type="sensing_mousex"></block><block type="sensing_mousey"></block><sep gap="24"></sep><block type="sensing_loudness"></block><block type="sensing_timer"></block><block type="sensing_resettimer"></block><sep gap="24"></sep><block type="sensing_deltatime"></block><block type="sensing_fps"></block><block type="sensing_stagewidth"></block><block type="sensing_stageheight"></block><block type="sensing_mousespeed"></block><sep gap="24"></sep><block type="sensing_current"></block><block type="sensing_dayssince2000"></block><block type="sensing_username"></block>'; },
    getOperatorsBlocks: function() { return '<block type="operator_add"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><block type="operator_subtract"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><block type="operator_multiply"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><block type="operator_divide"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><sep gap="24"></sep><block type="operator_random"><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><sep gap="24"></sep><block type="operator_gt"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block><block type="operator_lt"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block><block type="operator_equals"><value name="OPERAND1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="OPERAND2"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block><sep gap="24"></sep><block type="operator_and"></block><block type="operator_or"></block><block type="operator_not"></block><sep gap="24"></sep><block type="operator_join"><value name="STRING1"><shadow type="text"><field name="TEXT">hola </field></shadow></value><value name="STRING2"><shadow type="text"><field name="TEXT">mundo</field></shadow></value></block><block type="operator_letter_of"><value name="LETTER"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="STRING"><shadow type="text"><field name="TEXT">mundo</field></shadow></value></block><block type="operator_length"><value name="STRING"><shadow type="text"><field name="TEXT">mundo</field></shadow></value></block><block type="operator_contains"><value name="STRING1"><shadow type="text"><field name="TEXT">manzana</field></shadow></value><value name="STRING2"><shadow type="text"><field name="TEXT">a</field></shadow></value></block><sep gap="24"></sep><block type="operator_mod"><value name="NUM1"><shadow type="math_number"><field name="NUM"></field></shadow></value><value name="NUM2"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><block type="operator_round"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block><block type="operator_mathop"><value name="NUM"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>'; },
    getVariablesBlocks: function() { return '<block type="data_setvariableto"><value name="VALUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="data_changevariableby"><value name="VALUE"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="data_showvariable"></block><block type="data_hidevariable"></block>'; },
    getListsBlocks: function() { return '<block type="data_addtolist"><value name="ITEM"><shadow type="text"><field name="TEXT">cosa</field></shadow></value></block><block type="data_deleteoflist"><value name="INDEX"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="data_deletealloflist"></block><block type="data_insertatlist"><value name="ITEM"><shadow type="text"><field name="TEXT">cosa</field></shadow></value><value name="INDEX"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="data_replaceitemoflist"><value name="INDEX"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="ITEM"><shadow type="text"><field name="TEXT">cosa</field></shadow></value></block><sep gap="24"></sep><block type="data_itemoflist"><value name="INDEX"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="data_lengthoflist"></block><block type="data_listcontainsitem"><value name="ITEM"><shadow type="text"><field name="TEXT">cosa</field></shadow></value></block>'; },
    getPenBlocks: function() { return '<block type="pen_clear"></block><block type="pen_stamp"></block><sep gap="24"></sep><block type="pen_pendown"></block><block type="pen_penup"></block><sep gap="24"></sep><block type="pen_setpencolortocolor"></block><block type="pen_changepensizeby"><value name="SIZE"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="pen_setpensizeto"><value name="SIZE"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>'; },
    getMusicBlocks: function() { return '<block type="music_playdrumforbeats"><value name="BEATS"><shadow type="math_number"><field name="NUM">0.25</field></shadow></value></block><block type="music_restforbeats"><value name="BEATS"><shadow type="math_number"><field name="NUM">0.25</field></shadow></value></block><block type="music_playnoteforbeats"><value name="NOTE"><shadow type="math_number"><field name="NUM">60</field></shadow></value><value name="BEATS"><shadow type="math_number"><field name="NUM">0.25</field></shadow></value></block><block type="music_setinstrument"></block><sep gap="24"></sep><block type="music_settempo"><value name="TEMPO"><shadow type="math_number"><field name="NUM">60</field></shadow></value></block><block type="music_changetempo"><value name="TEMPO"><shadow type="math_number"><field name="NUM">20</field></shadow></value></block><block type="music_gettempo"></block>'; },
    getLogicBlocks: function() { return '<block type="logic_true"></block><block type="logic_false"></block><sep gap="24"></sep><block type="logic_xor"></block><block type="logic_between"><value name="VALUE"><shadow type="math_number"><field name="NUM">50</field></shadow></value><value name="MIN"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="MAX"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="logic_clamp"><value name="VALUE"><shadow type="math_number"><field name="NUM">50</field></shadow></value><value name="MIN"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="MAX"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="logic_map"></block><block type="logic_lerp"><value name="A"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="B"><shadow type="math_number"><field name="NUM">100</field></shadow></value><value name="T"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value></block><block type="logic_distance"></block><block type="logic_rounddecimals"><value name="VALUE"><shadow type="math_number"><field name="NUM">3.14159</field></shadow></value><value name="DECIMALS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block><block type="logic_percent"><value name="PART"><shadow type="math_number"><field name="NUM">25</field></shadow></value><value name="TOTAL"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><sep gap="24"></sep><block type="logic_textcontains"></block><block type="logic_textreplace"></block><block type="logic_tonumber"></block><block type="logic_totext"></block><sep gap="24"></sep><block type="logic_jsonget"></block><block type="logic_jsonset"></block><block type="logic_jsonstringify"></block>'; },
    getStateBlocks: function() { return '<block type="state_set"><value name="NAME"><shadow type="text"><field name="TEXT">inicio</field></shadow></value></block><block type="state_current"></block><block type="state_previous"></block><block type="state_is"><value name="NAME"><shadow type="text"><field name="TEXT">inicio</field></shadow></value></block><block type="state_back"></block><block type="state_reset"></block>'; },
    getDebugBlocks: function() { return '<block type="debug_log"><value name="VALUE"><shadow type="text"><field name="TEXT">mensaje</field></shadow></value></block><block type="debug_warn"><value name="VALUE"><shadow type="text"><field name="TEXT">advertencia</field></shadow></value></block><block type="debug_error"><value name="VALUE"><shadow type="text"><field name="TEXT">error</field></shadow></value></block><block type="debug_pauseif"></block><sep gap="24"></sep><block type="debug_mark"><value name="NAME"><shadow type="text"><field name="TEXT">marca1</field></shadow></value></block><block type="debug_mssincemark"><value name="NAME"><shadow type="text"><field name="TEXT">marca1</field></shadow></value></block>'; },
    getGravityBlocks: function() { return '<block type="game_setgravity"><value name="GRAVITY"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="game_changegravity"><value name="GRAVITY"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value></block><block type="game_gravity"></block><sep gap="24"></sep><block type="game_applygravity"></block><block type="game_jump"><value name="FORCE"><shadow type="math_number"><field name="NUM">15</field></shadow></value></block><block type="game_isonground"><value name="TOLERANCE"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block><block type="game_setgroundy"><value name="Y"><shadow type="math_number"><field name="NUM">-150</field></shadow></value></block><block type="game_resetphysics"></block>'; },
    getPhysicsBlocks: function() { return '<block type="game_setvelocity"><value name="VX"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="VY"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="game_changevelocity"><value name="VX"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="VY"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="game_velocityx"></block><block type="game_velocityy"></block><block type="game_speed"></block><sep gap="24"></sep><block type="game_applyvelocity"></block><block type="game_setfriction"><value name="FRICTION"><shadow type="math_number"><field name="NUM">0.9</field></shadow></value></block><block type="game_setbounce"><value name="BOUNCE"><shadow type="math_number"><field name="NUM">0.8</field></shadow></value></block><block type="game_applyforce"><value name="FORCE"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="DIRECTION"><shadow type="math_number"><field name="NUM">90</field></shadow></value></block><sep gap="24"></sep><block type="game_stopmotion"></block><block type="game_clamptostage"></block><block type="game_bounceonstageedge"></block>'; },
    getCameraBlocks: function() { return '<block type="game_camerasetxy"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="game_camerachangexy"><value name="X"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block><block type="game_camerafollowthis"><value name="STRENGTH"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value></block><block type="game_camerasetzoom"><value name="ZOOM"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block><block type="game_camerashake"><value name="AMOUNT"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><sep gap="24"></sep><block type="game_camerax"></block><block type="game_cameray"></block><block type="game_camerazoom"></block>'; },
    getAIBlocks: function() { return '<block type="game_aimovetoxy"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block><block type="game_aimovetowardtarget"><value name="TARGET"><shadow type="text"><field name="TEXT">Sprite1</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block><block type="game_aifleefromtarget"><value name="TARGET"><shadow type="text"><field name="TEXT">Sprite1</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block><block type="game_aifacetarget"><value name="TARGET"><shadow type="text"><field name="TEXT">Sprite1</field></shadow></value></block><sep gap="24"></sep><block type="game_aidistancetotarget"><value name="TARGET"><shadow type="text"><field name="TEXT">Sprite1</field></shadow></value></block><block type="game_aitargetinrange"><value name="TARGET"><shadow type="text"><field name="TEXT">Sprite1</field></shadow></value><value name="RANGE"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="game_aiwander"><value name="SPEED"><shadow type="math_number"><field name="NUM">3</field></shadow></value></block>'; },
    getArduinoBlocks: function() {
      return '<block type="arduino_when_started"></block>' +
             '<block type="arduino_loop"></block>' +
             '<sep gap="24"></sep>' +
             '<block type="arduino_pinMode"></block>' +
             '<block type="arduino_digitalWrite"></block>' +
             '<block type="arduino_digitalRead"></block>' +
             '<sep gap="24"></sep>' +
             '<block type="arduino_analogWrite"></block>' +
             '<block type="arduino_analogRead"></block>' +
             '<sep gap="24"></sep>' +
             '<block type="arduino_delay"></block>' +
             '<block type="arduino_servo"></block>' +
             '<block type="arduino_ultrasonic"></block>';
    },
    getCombatBlocks: function() { return '<block type="game_setmaxhealth"><value name="HEALTH"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="game_sethealth"><value name="HEALTH"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block><block type="game_changehealth"><value name="HEALTH"><shadow type="math_number"><field name="NUM">-10</field></shadow></value></block><block type="game_health"></block><block type="game_maxhealth"></block><block type="game_healthpercent"></block><block type="game_isalive"></block><sep gap="24"></sep><block type="game_damageself"><value name="AMOUNT"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block><block type="game_healself"><value name="AMOUNT"><shadow type="math_number"><field name="NUM">20</field></shadow></value></block><block type="game_setinvincible"><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block><block type="game_isinvincible"></block><block type="game_revive"><value name="HEALTH"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>'; },

    // ==================== UTILIDADES ====================
    getWorkspaceState: function() { if (!this.workspace) return null; return Blockly.serialization.workspaces.save(this.workspace); },
    loadWorkspaceState: function(state) { if (!this.workspace || !state) return; Blockly.serialization.workspaces.load(state, this.workspace); },
    getXML: function() { if (!this.workspace) return ''; var xml = Blockly.Xml.workspaceToDom(this.workspace); return Blockly.Xml.domToText(xml); },
    loadXML: function(xmlText) { if (!this.workspace || !xmlText) return; var xml = Blockly.utils.xml.textToDom(xmlText); Blockly.Xml.domToWorkspace(xml, this.workspace); },
    clear: function() { if (this.workspace) this.workspace.clear(); },
    setReadOnly: function(readonly) { if (this.workspace) this.workspace.options.readOnly = readonly; },
    onChange: function(callback) { if (this.workspace) this.workspace.addChangeListener(callback); }
  };

  if (window.Blockly) {
    var arduinoColors = {
      arduino: '#00979C',
      control: '#FFAB19'
    };

    var arduinoBlockDefs = [
      {
        "type": "arduino_when_started",
        "message0": "Al iniciar Arduino",
        "nextStatement": null,
        "colour": arduinoColors.control,
        "tooltip": "Código ejecutado en void setup()",
        "helpUrl": ""
      },
      {
        "type": "arduino_loop",
        "message0": "Bucle por siempre",
        "nextStatement": null,
        "colour": arduinoColors.control,
        "tooltip": "Código ejecutado en void loop()",
        "helpUrl": ""
      },
      {
        "type": "arduino_pinMode",
        "message0": "configurar pin %1 como %2",
        "args0": [
          {
            "type": "field_number",
            "name": "PIN",
            "value": 13,
            "min": 0,
            "max": 53
          },
          {
            "type": "field_dropdown",
            "name": "MODE",
            "options": [
              ["SALIDA (OUTPUT)", "OUTPUT"],
              ["ENTRADA (INPUT)", "INPUT"]
            ]
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": arduinoColors.arduino,
        "tooltip": "Establece el modo de un pin",
        "helpUrl": ""
      },
      {
        "type": "arduino_digitalWrite",
        "message0": "escribir pin digital %1 %2",
        "args0": [
          {
            "type": "field_number",
            "name": "PIN",
            "value": 13,
            "min": 0,
            "max": 53
          },
          {
            "type": "field_dropdown",
            "name": "LEVEL",
            "options": [
              ["ALTO (HIGH)", "HIGH"],
              ["BAJO (LOW)", "LOW"]
            ]
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": arduinoColors.arduino,
        "tooltip": "Escribe un valor HIGH o LOW en un pin digital",
        "helpUrl": ""
      },
      {
        "type": "arduino_digitalRead",
        "message0": "leer pin digital %1",
        "args0": [
          {
            "type": "field_number",
            "name": "PIN",
            "value": 2,
            "min": 0,
            "max": 53
          }
        ],
        "output": "Boolean",
        "colour": arduinoColors.arduino,
        "tooltip": "Lee el estado lógico de un pin digital",
        "helpUrl": ""
      },
      {
        "type": "arduino_analogWrite",
        "message0": "escribir pin analógico (PWM) %1 valor %2",
        "args0": [
          {
            "type": "field_number",
            "name": "PIN",
            "value": 3,
            "min": 0,
            "max": 53
          },
          {
            "type": "field_number",
            "name": "VALUE",
            "value": 255,
            "min": 0,
            "max": 255
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": arduinoColors.arduino,
        "tooltip": "Escribe un valor analógico (PWM) de 0 a 255",
        "helpUrl": ""
      },
      {
        "type": "arduino_analogRead",
        "message0": "leer pin analógico %1",
        "args0": [
          {
            "type": "field_dropdown",
            "name": "PIN",
            "options": [
              ["A0", "A0"],
              ["A1", "A1"],
              ["A2", "A2"],
              ["A3", "A3"],
              ["A4", "A4"],
              ["A5", "A5"]
            ]
          }
        ],
        "output": "Number",
        "colour": arduinoColors.arduino,
        "tooltip": "Lee el valor analógico de un pin (0-1023)",
        "helpUrl": ""
      },
      {
        "type": "arduino_delay",
        "message0": "esperar %1 milisegundos",
        "args0": [
          {
            "type": "field_number",
            "name": "MS",
            "value": 1000,
            "min": 0
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": arduinoColors.control,
        "tooltip": "Pausa el programa durante los milisegundos especificados",
        "helpUrl": ""
      },
      {
        "type": "arduino_servo",
        "message0": "escribir servo pin %1 ángulo %2",
        "args0": [
          {
            "type": "field_number",
            "name": "PIN",
            "value": 9,
            "min": 0,
            "max": 53
          },
          {
            "type": "field_number",
            "name": "ANGLE",
            "value": 90,
            "min": 0,
            "max": 180
          }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": arduinoColors.arduino,
        "tooltip": "Posiciona un servo motor de 0 a 180 grados",
        "helpUrl": ""
      },
      {
        "type": "arduino_ultrasonic",
        "message0": "leer sensor ultrasonido trig %1 echo %2 (cm)",
        "args0": [
          {
            "type": "field_number",
            "name": "TRIG",
            "value": 4
          },
          {
            "type": "field_number",
            "name": "ECHO",
            "value": 5
          }
        ],
        "output": "Number",
        "colour": arduinoColors.arduino,
        "tooltip": "Lee la distancia del sensor ultrasónico en centímetros",
        "helpUrl": ""
      }
    ];

    Blockly.defineBlocksWithJsonArray(arduinoBlockDefs);
  }

  console.log('[ScratchBlockly] Module loaded with custom blocks');
})();
