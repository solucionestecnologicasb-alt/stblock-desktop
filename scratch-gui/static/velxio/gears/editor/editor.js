(function () {
  'use strict';
  console.log("[STBLOCK-DEBUG] editor.js loaded successfully!");

  function resolveApiBase() {
    var protocol = window.location.protocol || '';
    var host = window.location.hostname || '';
    var isLocalHttp = host === 'localhost' || host === '127.0.0.1' || host === '' || host === 'tauri.localhost' || host.endsWith('.localhost');
    var isDesktopLocal = protocol !== 'http:' && protocol !== 'https:';
    if (isDesktopLocal || isLocalHttp) return 'http://localhost:3001';
    return '/wp-json/bpp/v1';
  }

  var API_BASE = resolveApiBase();

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('editorCanvas');
  var ctx = canvas.getContext('2d');
  var selectedId = null;
  var dragging = false;
  var textureUrl = '';
  var textureDimensions = null;
  var state = createState();
  var ADMIN_PASSWORD = 'STB.2023';

  // --- Robot Editor Variables ---
  var robotCanvas = $('robotCanvas');
  var robotEngine = null;
  var robotScene = null;
  var robotCamera = null;
  var robotState = createDefaultRobotState();
  var selectedRobotPartId = null;
  var robotMeshes = {};
  var activeMode = 'maps'; // 'maps', 'robots' or 'parts'
  var activePartConnectionBoard = null;
  var robotDraggingPart = false;
  var robotDragPartId = null;
  var robotDragOffset = null;
  var robotDragPlaneY = 0;

  // --- Piece Preset Builder Variables ---
  var pieceCanvas = $('pieceCanvas');
  var pieceEngine = null;
  var pieceScene = null;
  var pieceCamera = null;
  var pieceState = createDefaultPieceState();
  var selectedPieceSegmentId = null;
  var pieceMeshes = {};
  var pieceTestValue = 90;
  var pieceRenderToken = 0;
  var pieceDraggingSegment = false;
  var pieceDragSegmentId = null;
  var pieceDragOffset = null;
  var pieceDragPlaneY = 0;
  var pieceDragMode = null;
  var piecePivotDragOffset = null;

  window.registerDynamicDeviceBlocks = function(boardId) {
    function normalizeDeviceShadowXML(xml) {
      if (typeof xml !== 'string') return xml;
      return xml.replace(
        /<shadow\b([^>]*)\btype=(['"])(math_uint8_number|math_half_angle)\2([^>]*)>([\s\S]*?)<\/shadow>/g,
        function(match, beforeType, quote, _type, afterType, content) {
          var numMatch = content.match(/<field\b[^>]*\bname=(['"])NUM\1[^>]*>([\s\S]*?)<\/field>/);
          if (!numMatch) return match;
          return '<shadow' + beforeType + 'type=' + quote + 'math_number' + quote + afterType + '><field name=' + numMatch[1] + 'NUM' + numMatch[1] + '>' + numMatch[2] + '</field></shadow>';
        }
      );
    }

    var toolboxXml = '';
    var parentWin = window.parent;
    var manifests = (parentWin && parentWin.deviceManifests) || window.deviceManifests;
    if (manifests) {
      var manifest = manifests[boardId || 'stbBoardV2'];
      if (manifest && manifest.categories) {
        manifest.categories.forEach(function(cat) {
          // Registrar menús (bloques de sombra/dropdowns)
          if (cat.menus && Array.isArray(cat.menus)) {
            cat.menus.forEach(function(m) {
              if (m.json && m.json.type) {
                if (typeof Blockly !== 'undefined' && !Blockly.Blocks[m.json.type]) {
                  Blockly.Blocks[m.json.type] = {
                    init: function() {
                      this.jsonInit(m.json);
                    }
                  };
                }
              }
            });
          }

          var catXml = '';
          cat.blocks.forEach(function(b) {
            if (b.json && b.json.type) {
              if (typeof Blockly !== 'undefined' && !Blockly.Blocks[b.json.type]) {
                Blockly.Blocks[b.json.type] = {
                  init: function() {
                    this.jsonInit(b.json);
                  }
                };
              }
            }
            if (b.xml) {
              catXml += normalizeDeviceShadowXML(b.xml);
            }
          });
          toolboxXml += '<category name="' + (cat.name || 'Dispositivo') + '" colour="' + (cat.color1 || '#00979C') + '">' + catXml + '</category>';
        });
      }
    }
    if (!toolboxXml && typeof window.ScratchBlockly !== 'undefined' && typeof window.ScratchBlockly.getArduinoBlocks === 'function') {
      toolboxXml += '<category name="Arduino" colour="#00979C">' + window.ScratchBlockly.getArduinoBlocks() + '</category>';
    }
    return toolboxXml;
  };

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

  var surfacePresets = {
    smooth: {color: '#f5f7fb', friction: 0.8, restitution: 0.05},
    rough: {color: '#9ca3af', friction: 1.25, restitution: 0.02},
    earth: {color: '#8a5d35', friction: 1.05, restitution: 0.02},
    sand: {color: '#d8b879', friction: 1.4, restitution: 0},
    grass: {color: '#5f9d52', friction: 1.0, restitution: 0.02},
    ice: {color: '#ccecff', friction: 0.03, restitution: 0.02},
    water: {color: '#4aa7d8', friction: 2.2, restitution: 0},
    custom: {color: '#ffffff', friction: 0.8, restitution: 0.05}
  };

  function createState() {
    return {
      metadata: {name: 'Nuevo escenario', id: 'nuevo-escenario', description: ''},
      options: {
        imageURL: '',
        imageScale: 1,
        uScale: 1,
        vScale: 1,
        surfaceType: 'smooth',
        length: 300,
        width: 300,
        wall: true,
        wallHeight: 18,
        wallThickness: 5,
        wallColor: '#162033',
        groundFriction: 0.8,
        groundRestitution: 0.05,
        startPos: 'center',
        startPosXYZ: [0, 0, 0],
        startRot: 0,
        ambientLight: 0.65,
        directionalLight: 0.8,
        lightColor: '#ffffff',
        skyColor: '#dbeafe',
        gravity: -98.1,
        windX: 0,
        windZ: 0,
        windStrength: 0,
        fogEnabled: false,
        fogDensity: 0.002,
        fogColor: '#dbeafe',
        objects: [],
        rules: [],
        scoreboardEnabled: false,
        scoreboardTeamA: 'Equipo Rojo',
        scoreboardTeamB: 'Equipo Azul',
        scoreboardWinScore: 5,
        arenaMode: false,
        arenaRobotCount: 1,
        arenaTeamCount: 2,
        arenaSpawnMode: 'individual',
        arenaTeams: [],
        arenaRobots: [],
        arenaStartPositions: [],
        arenaStartPosXYZ: [],
        arenaStartRot: [],
        winCondition: 'none',
        winTargetScore: 5,
        winTimerDuration: 60,
        winOnComplete: 'stopAll'
      },
      editor: {protectStart: true, startClearance: 35, textureDimensions: null}
    };
  }

  function number(id, fallback) {
    var value = Number($(id).value);
    return isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function slug(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'escenario';
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { $('toast').classList.remove('show'); }, 2200);
  }

  // Modal de confirmación personalizado (reemplaza confirm() nativo que Tauri bloquea)
  function showConfirm(message, onConfirm, onCancel) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1e293b;padding:24px;border-radius:12px;max-width:400px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    modal.innerHTML = '<p style="color:#e2e8f0;margin:0 0 20px;font-size:14px;">' + message + '</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;">' +
      '<button id="confirmNo" style="padding:10px 24px;background:#475569;border:none;border-radius:6px;color:#fff;cursor:pointer;">Cancelar</button>' +
      '<button id="confirmYes" style="padding:10px 24px;background:#ef4444;border:none;border-radius:6px;color:#fff;cursor:pointer;">Confirmar</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('confirmYes').onclick = function() {
      overlay.remove();
      if (onConfirm) onConfirm();
    };
    document.getElementById('confirmNo').onclick = function() {
      overlay.remove();
      if (onCancel) onCancel();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    };
  }

  function showAlert(message, onOk) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1e293b;padding:24px;border-radius:12px;width:90%;max-width:380px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);border-top: 4px solid #3b82f6;';
    modal.innerHTML = '<p style="color:#f1f5f9;margin:0 0 20px;font-size:14px;line-height:1.6;font-family:sans-serif;">' + message + '</p>' +
      '<div style="display:flex;justify-content:center;">' +
      '<button id="alertOk" style="padding:10px 32px;background:#3b82f6;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold;font-family:sans-serif;font-size:13px;transition:all 0.2s;">Entendido</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('alertOk').onclick = function() {
      overlay.remove();
      if (onOk) onOk();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.remove();
        if (onOk) onOk();
      }
    };
  }

  function showPrompt(message, defaultValue, onOk, onCancel) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1e293b;padding:24px;border-radius:12px;width:90%;max-width:380px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);border-top: 4px solid #3b82f6;';
    modal.innerHTML = '<p style="color:#f1f5f9;margin:0 0 14px;font-size:14px;font-weight:bold;line-height:1.5;font-family:sans-serif;">' + message + '</p>' +
      '<input id="promptInput" type="text" value="' + (defaultValue || '') + '" style="width:100%;box-sizing:border-box;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;margin-bottom:20px;outline:none;font-size:13px;font-family:sans-serif;">' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
      '<button id="promptCancel" style="padding:10px 20px;background:#475569;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;font-family:sans-serif;">Cancelar</button>' +
      '<button id="promptSubmit" style="padding:10px 24px;background:#3b82f6;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold;font-size:13px;font-family:sans-serif;">Aceptar</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var input = document.getElementById('promptInput');
    input.focus();
    input.select();
    
    input.onkeydown = function(e) {
      if (e.key === 'Enter') {
        var val = input.value;
        overlay.remove();
        if (onOk) onOk(val);
      }
    };

    document.getElementById('promptSubmit').onclick = function() {
      var val = input.value;
      overlay.remove();
      if (onOk) onOk(val);
    };
    document.getElementById('promptCancel').onclick = function() {
      overlay.remove();
      if (onCancel) onCancel();
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    };
  }

  function initializeAdminLock() {
    if (sessionStorage.getItem('stblockWorldEditorUnlocked') === 'yes') {
      $('adminLock').classList.add('unlocked');
      return;
    }
    $('adminLogin').addEventListener('submit', function (event) {
      event.preventDefault();
      if ($('adminPassword').value !== ADMIN_PASSWORD) {
        $('loginError').textContent = 'Clave incorrecta.';
        $('adminPassword').select();
        return;
      }
      sessionStorage.setItem('stblockWorldEditorUnlocked', 'yes');
      $('adminLock').classList.add('unlocked');
      resizeCanvas();
    });
  }

  function makeObject(type) {
    var id = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var typeNames = {
      box: 'Caja', cylinder: 'Cilindro', sphere: 'Esfera', wall: 'Pared interior',
      ball: 'Balon', zone: 'Zona', line: 'Linea', model: 'Modelo 3D',
      door: 'Puerta', ramp: 'Rampa', elevator: 'Ascensor', conveyor: 'Cinta transportadora',
      goal: 'Porteria', button: 'Boton/Presion', light: 'Luz', teleporter: 'Teletransportador',
      sound: 'Sonido', terrain: 'Zona de terreno'
    };
    var baseType = (type === 'zone' || type === 'line' || type === 'wall' || type === 'goal') ? 'box' :
      type === 'ball' ? 'sphere' : type === 'light' ? 'sphere' : type === 'sound' ? 'sphere' :
      type === 'button' ? 'box' : type === 'door' ? 'box' : type === 'ramp' ? 'box' :
      type === 'elevator' ? 'box' : type === 'conveyor' ? 'box' : type === 'teleporter' ? 'box' :
      type === 'terrain' ? 'box' : type;

    var object = {
      id: id,
      name: typeNames[type] || type,
      type: baseType,
      editorType: type,
      position: [0, 0, type === 'line' ? 0.2 : type === 'wall' ? 10 : type === 'ball' ? 5 : type === 'door' ? 0 : 5],
      rotation: [0, 0, 0],
      rotationMode: 'degrees',
      size: type === 'line' ? [80, 3, 0.4] : type === 'wall' ? [80, 5, 20] :
        type === 'door' ? [30, 3, 50] : type === 'ramp' ? [100, 40, 3] :
        type === 'goal' ? [60, 10, 40] : type === 'button' ? [20, 20, 5] :
        type === 'light' ? [6, 6, 6] : type === 'teleporter' ? [30, 30, 5] :
        type === 'sound' ? [10, 10, 10] : type === 'conveyor' ? [80, 30, 5] :
        type === 'elevator' ? [60, 60, 5] : [10, 10, 10],
      color: type === 'zone' ? '#22c55e' : type === 'line' ? '#111111' :
        type === 'wall' ? '#162033' : type === 'ball' ? '#ffffff' :
        type === 'door' ? '#8B4513' : type === 'ramp' ? '#a06540' :
        type === 'elevator' ? '#888888' : type === 'conveyor' ? '#555555' :
        type === 'goal' ? '#ffd43b' : type === 'button' ? '#e5484d' :
        type === 'light' ? '#ffdd57' : type === 'teleporter' ? '#aa66ff' :
        type === 'sound' ? '#66ccff' : '#4c6fff',
      physicsOptions: type === 'zone' || type === 'line' || type === 'goal' ? false :
        type === 'button' ? false : type === 'light' ? false : type === 'sound' ? false :
        type === 'teleporter' ? false : type === 'ball' ? {
          mass: 2, friction: 0.35, restitution: 0.65, dampLinear: 0.05, dampAngular: 0.05, group: 1, mask: -1
        } : 'fixed',
      mass: type === 'ball' ? 2 : type === 'elevator' ? 50 : 10,
      friction: 0.4,
      restitution: 0.05,
      magnetic: false,
      modelURL: '',
      modelScale: 1,
      laserDetection: type === 'zone' ? 'invisible' : 'normal',
      ultrasonicDetection: type === 'zone' ? 'invisible' : 'normal',
      isPickable: true,
      triggerZone: type === 'zone',
      // New type properties
      destructibleHP: 0,
      destructibleRespawnTime: 0,
      // Door
      doorWidth: 30, doorHeight: 50, doorThickness: 3,
      hingeMotorSpeed: 90, hingeMotorMaxForce: 5000,
      hingeOpenAngle: 90, hingeCloseAngle: 0,
      hingeAxis: 'Y', hingeState: 'closed', doorMass: 20, doorAutoClose: 0,
      // Ramp
      rampMode: 'fixed', rampAngle: 30, rampLength: 100, rampWidth: 40,
      rampThickness: 0.8, rampMass: 12,
      // Elevator
      elevatorMass: 50, elevatorOffset: 50, elevatorSpeed: 20, elevatorWait: 1, elevatorAuto: true,
      // Conveyor
      conveyorSpeed: 50, conveyorForce: 200, conveyorDirection: 0, conveyorActive: true,
      // Terrain
      terrainType: 'rough', terrainRoughness: 3.5,
      // Goal
      goalTeam: 'A',
      // Light
      lightColor: '#ffffff', lightIntensity: 1, lightRange: 50,
      // Teleporter
      teleporterTargetX: 0, teleporterTargetY: 0, teleporterTargetZ: 0,
      teleporterCooldown: 1,
      // Sound
      soundURL: '', soundLoop: false, soundVolume: 0.5,
      // Animation
      animationMode: 'none',
      animationKeys: []
    };
    state.options.objects.push(object);
    selectedId = id;
    renderAll();
  }

  function selected() {
    return state.options.objects.find(function (object) { return object.id === selectedId; });
  }

  function syncStateFromForm() {
    state.metadata.name = $('mapName').value.trim() || 'Escenario';
    state.metadata.id = slug($('mapId').value || state.metadata.name);
    state.metadata.description = $('mapDescription').value;
    state.options.length = clamp(number('groundLength', 300), 50, 5000);
    state.options.width = clamp(number('groundWidth', 300), 50, 5000);
    state.options.surfaceType = $('surfaceType').value;
    state.options.wall = $('wallEnabled').checked;
    state.options.wallHeight = clamp(number('wallHeight', 18), 0, 200);
    state.options.wallThickness = clamp(number('wallThickness', 5), 1, 100);
    state.options.wallColor = $('wallColor').value;
    state.options.groundFriction = clamp(number('groundFriction', 0.8), 0, 5);
    state.options.groundRestitution = clamp(number('groundRestitution', 0.05), 0, 1);
    state.options.skyColor = $('skyColor').value;
    state.options.lightColor = $('lightColor').value;
    state.options.ambientLight = clamp(number('ambientLight', 0.65), 0, 2);
    state.options.directionalLight = clamp(number('directionalLight', 0.8), 0, 3);
    state.options.gravity = clamp(number('gravity', -98.1), -300, 0);
    state.options.windX = clamp(number('windX', 0), -1, 1);
    state.options.windZ = clamp(number('windZ', 0), -1, 1);
    state.options.windStrength = clamp(number('windStrength', 0), 0, 100);
    state.options.fogEnabled = $('fogEnabled').checked;
    state.options.fogDensity = clamp(number('fogDensity', 0.002), 0, 0.05);
    state.options.fogColor = $('fogColor').value;
    state.options.startPosXYZ = [number('robotX', 0), number('robotY', 0), 0];
    state.options.startRot = number('robotRotation', 0);
    state.editor.protectStart = $('protectStart').checked;
    state.editor.startClearance = clamp(number('startClearance', 35), 10, 200);
    state.options.imageURL = textureUrl || state.options.imageURL;
    if (textureDimensions) {
      state.options.imageScale = 1;
      state.options.uScale = state.options.length * 10 / textureDimensions.width;
      state.options.vScale = state.options.width * 10 / textureDimensions.height;
    }

    // Scoreboard
    state.options.scoreboardEnabled = $('scoreboardEnabled') ? $('scoreboardEnabled').checked : false;
    if ($('scoreboardTeamA')) state.options.scoreboardTeamA = $('scoreboardTeamA').value;
    if ($('scoreboardTeamB')) state.options.scoreboardTeamB = $('scoreboardTeamB').value;
    if ($('scoreboardWinScore')) state.options.scoreboardWinScore = clamp(number('scoreboardWinScore', 5), 1, 100);

    // Win conditions
    if ($('winCondition')) state.options.winCondition = $('winCondition').value;
    if ($('winTargetScore')) state.options.winTargetScore = clamp(number('winTargetScore', 5), 1, 100);
    if ($('winTimerDuration')) state.options.winTimerDuration = clamp(number('winTimerDuration', 60), 5, 600);
    if ($('winOnComplete')) state.options.winOnComplete = $('winOnComplete').value;

    // Arena mode
    if ($('arenaMode')) state.options.arenaMode = $('arenaMode').checked;
    if ($('arenaRobotCount')) state.options.arenaRobotCount = clamp(number('arenaRobotCount', 1), 1, 8);
    if ($('arenaTeamCount')) state.options.arenaTeamCount = clamp(number('arenaTeamCount', 2), 2, 4);
    if ($('arenaSpawnMode')) state.options.arenaSpawnMode = $('arenaSpawnMode').value;
    state.options.arenaTeams = [];
    for (var teamIndex = 1; teamIndex <= 4; teamIndex++) {
      state.options.arenaTeams.push({
        id: String.fromCharCode(64 + teamIndex),
        name: $('arenaTeamName' + teamIndex).value,
        color: $('arenaTeamColor' + teamIndex).value,
        position: [number('arenaTeamX' + teamIndex, 0), number('arenaTeamY' + teamIndex, 0)],
        size: [number('arenaTeamW' + teamIndex, 80), number('arenaTeamD' + teamIndex, 80)],
        rotation: number('arenaTeamRot' + teamIndex, 0)
      });
    }
    state.options.arenaRobots = [];
    state.options.arenaStartPosXYZ = [];
    state.options.arenaStartRot = [];
    for (var robotIndex = 1; robotIndex <= state.options.arenaRobotCount; robotIndex++) {
      var teamId = $('arenaRobotTeam' + robotIndex).value;
      var team = state.options.arenaTeams.find(function (item) { return item.id === teamId; });
      var x = number('arenaRobotX' + robotIndex, 0);
      var y = number('arenaRobotY' + robotIndex, 0);
      var rotation = number('arenaRobotRot' + robotIndex, team ? team.rotation : 0);
      if (state.options.arenaSpawnMode === 'team' && team) {
        var teamMembers = state.options.arenaRobots.filter(function (item) { return item.teamId === teamId; }).length;
        var columns = Math.max(1, Math.floor(team.size[0] / 30));
        x = team.position[0] + (teamMembers % columns) * 30 - Math.min(team.size[0] / 2 - 15, (columns - 1) * 15);
        y = team.position[1] + Math.floor(teamMembers / columns) * 30 - team.size[1] / 2 + 15;
      }
      state.options.arenaRobots.push({teamId: teamId, position: [x, y, 0], rotation: rotation});
      state.options.arenaStartPosXYZ.push([x, y, 0]);
      state.options.arenaStartRot.push(rotation);
    }

    $('mapId').value = state.metadata.id;
  }

  function syncObjectFromForm() {
    var object = selected();
    if (!object) return;
    object.name = $('objectName').value || object.name;
    object.position = [number('objectX', 0), number('objectY', 0), Math.max(0, number('objectZ', 0))];
    object.size = [
      Math.max(0.1, number('objectW', 10)),
      Math.max(0.1, number('objectD', 10)),
      Math.max(0.1, number('objectH', 10))
    ];
    object.rotation = [number('objectRX', 0), number('objectRY', 0), number('objectRZ', 0)];
    object.color = $('objectColor').value;
    object.modelScale = clamp(number('objectScale', 1), 0.001, 1000);
    object.mass = clamp(number('objectMass', 10), 0.1, 10000);
    object.friction = clamp(number('objectFriction', 0.4), 0, 5);
    object.restitution = clamp(number('objectBounce', 0.05), 0, 1);
    object.magnetic = $('objectMagnetic').checked;
    object.laserDetection = $('objectLaser').checked ? 'normal' : 'invisible';
    object.ultrasonicDetection = $('objectUltrasonic').checked ? 'normal' : 'invisible';
    var physics = $('objectPhysics').value;
    object.physicsBehavior = physics === 'kinematic' ? 'kinematic' : undefined;
    object.physicsOptions = physics === 'sensor' ? false :
      physics === 'moveable' ? {
        mass: object.mass, friction: object.friction, restitution: object.restitution,
        dampLinear: 0.1, dampAngular: 0.1, group: 1, mask: -1
      } : 'fixed';
    object.motionStart = [number('motionStartX', object.position[0]), number('motionStartY', object.position[1]), number('motionStartZ', object.position[2])];
    object.motionEnd = [number('motionEndX', object.position[0] + 50), number('motionEndY', object.position[1]), number('motionEndZ', object.position[2])];
    object.motionTrigger = $('motionTrigger').value;
    object.motionCycle = $('motionCycle').value;
    object.motionSpeed = clamp(number('motionSpeed', 20), 0.1, 1000);
    object.motionDelay = clamp(number('motionDelay', 0), 0, 300);
    object.motionWait = clamp(number('motionWait', 0), 0, 300);
    object.motionRetrigger = $('motionRetrigger').checked;

    // Type-specific properties
    if (object.editorType === 'door') {
      object.doorWidth = clamp(number('doorWidth', 30), 5, 500);
      object.doorHeight = clamp(number('doorHeight', 50), 5, 500);
      object.doorThickness = clamp(number('doorThickness', 3), 0.5, 50);
      object.hingeMotorSpeed = clamp(number('hingeMotorSpeed', 90), 1, 720);
      object.hingeMotorMaxForce = clamp(number('hingeMotorMaxForce', 5000), 100, 50000);
      object.hingeOpenAngle = clamp(number('hingeOpenAngle', 90), -170, 170);
      object.hingeCloseAngle = clamp(number('hingeCloseAngle', 0), -170, 170);
      object.hingeState = $('hingeState').value;
      object.doorMass = clamp(number('doorMass', 20), 1, 500);
      object.doorAutoClose = clamp(number('doorAutoClose', 0), 0, 300);
    }
    if (object.editorType === 'ramp') {
      object.rampMode = $('rampMode').value;
      object.rampAngle = clamp(number('rampAngle', 30), 0, 60);
      object.rampLength = clamp(number('rampLength', 100), 10, 1000);
      object.rampWidth = clamp(number('rampWidth', 40), 10, 500);
      object.rampThickness = clamp(number('rampThickness', 0.8), 0.25, 1.5);
      object.rampMass = clamp(number('rampMass', 12), 1, 500);
    }
    if (object.editorType === 'elevator') {
      object.elevatorOffset = clamp(number('elevatorOffset', 50), 5, 500);
      object.elevatorSpeed = clamp(number('elevatorSpeed', 20), 1, 200);
      object.elevatorWait = clamp(number('elevatorWait', 1), 0, 30);
      object.elevatorAuto = $('elevatorAuto').checked;
    }
    if (object.editorType === 'conveyor') {
      object.conveyorSpeed = clamp(number('conveyorSpeed', 50), 0, 500);
      object.conveyorForce = clamp(number('conveyorForce', 200), 0, 2000);
      object.conveyorDirection = number('conveyorDirection', 0) % 360;
      object.conveyorActive = $('conveyorActive').checked;
    }
    if (object.editorType === 'terrain') {
      object.terrainType = $('terrainType').value;
      object.terrainRoughness = clamp(number('terrainRoughness', 3.5), 0, 20);
    }

    if (object.editorType === 'goal') {
      object.goalTeam = $('goalTeam').value;
    }
    if (object.editorType === 'button') {
      object.buttonActionId = $('buttonActionId') ? $('buttonActionId').value : '';
    }
    if (object.editorType === 'light') {
      object.lightColor = $('lightColorPicker') ? $('lightColorPicker').value : '#ffffff';
      object.lightIntensity = clamp(number('lightIntensity', 1), 0, 10);
      object.lightRange = clamp(number('lightRange', 50), 1, 500);
    }
    if (object.editorType === 'teleporter') {
      object.teleporterTargetX = number('teleporterTargetX', 0);
      object.teleporterTargetY = number('teleporterTargetY', 0);
      object.teleporterTargetZ = clamp(number('teleporterTargetZ', 0), 0, 500);
      object.teleporterCooldown = clamp(number('teleporterCooldown', 1), 0, 30);
    }
    if (object.editorType === 'sound') {
      object.soundVolume = clamp(number('soundVolume', 0.5), 0, 1);
      object.soundLoop = $('soundLoop') ? $('soundLoop').checked : false;
    }

    // Destructible
    object.destructibleHP = clamp(number('destructibleHP', 0), 0, 100000);
    object.destructibleRespawnTime = clamp(number('destructibleRespawn', 0), 0, 300);

    // Animation
    if ($('animMode')) {
      object.animationMode = $('animMode').value;
    }

    renderAll();
  }

  function loadForm() {
    $('mapName').value = state.metadata.name;
    $('mapId').value = state.metadata.id;
    $('mapDescription').value = state.metadata.description || '';
    $('groundLength').value = state.options.length;
    $('groundWidth').value = state.options.width;
    $('surfaceType').value = state.options.surfaceType || 'smooth';
    $('wallEnabled').checked = state.options.wall;
    $('wallHeight').value = state.options.wallHeight;
    $('wallThickness').value = state.options.wallThickness;
    $('wallColor').value = state.options.wallColor;
    $('groundFriction').value = state.options.groundFriction;
    $('groundRestitution').value = state.options.groundRestitution;
    ['skyColor', 'lightColor', 'ambientLight', 'directionalLight', 'gravity',
      'windX', 'windZ', 'windStrength', 'fogDensity', 'fogColor'].forEach(function (key) {
      $(key).value = state.options[key];
    });
    $('fogEnabled').checked = state.options.fogEnabled;
    $('robotX').value = state.options.startPosXYZ[0];
    $('robotY').value = state.options.startPosXYZ[1];
    $('robotRotation').value = state.options.startRot;
    $('protectStart').checked = state.editor.protectStart;
    $('startClearance').value = state.editor.startClearance;

    // Scoreboard
    if ($('scoreboardEnabled')) $('scoreboardEnabled').checked = state.options.scoreboardEnabled;
    if ($('scoreboardTeamA')) $('scoreboardTeamA').value = state.options.scoreboardTeamA || 'Equipo Rojo';
    if ($('scoreboardTeamB')) $('scoreboardTeamB').value = state.options.scoreboardTeamB || 'Equipo Azul';
    if ($('scoreboardWinScore')) $('scoreboardWinScore').value = state.options.scoreboardWinScore || 5;
    if ($('winCondition')) $('winCondition').value = state.options.winCondition || 'none';
    if ($('winTargetScore')) $('winTargetScore').value = state.options.winTargetScore || 5;
    if ($('winTimerDuration')) $('winTimerDuration').value = state.options.winTimerDuration || 60;
    if ($('winOnComplete')) $('winOnComplete').value = state.options.winOnComplete || 'stopAll';
    if ($('arenaMode')) $('arenaMode').checked = state.options.arenaMode;
    if ($('arenaRobotCount')) $('arenaRobotCount').value = state.options.arenaRobotCount || 1;
    if ($('arenaTeamCount')) $('arenaTeamCount').value = state.options.arenaTeamCount || 2;
    if ($('arenaSpawnMode')) $('arenaSpawnMode').value = state.options.arenaSpawnMode || 'individual';
    (state.options.arenaTeams || []).forEach(function (team, index) {
      var n = index + 1;
      if (n > 4) return;
      $('arenaTeamName' + n).value = team.name || ('Equipo ' + team.id);
      $('arenaTeamColor' + n).value = team.color || '#4c6fff';
      $('arenaTeamX' + n).value = team.position ? team.position[0] : 0;
      $('arenaTeamY' + n).value = team.position ? team.position[1] : 0;
      $('arenaTeamW' + n).value = team.size ? team.size[0] : 80;
      $('arenaTeamD' + n).value = team.size ? team.size[1] : 80;
      $('arenaTeamRot' + n).value = team.rotation || 0;
    });
    (state.options.arenaRobots || []).forEach(function (robot, index) {
      var n = index + 1;
      if (n > 8) return;
      $('arenaRobotTeam' + n).value = robot.teamId || 'A';
      $('arenaRobotX' + n).value = robot.position ? robot.position[0] : 0;
      $('arenaRobotY' + n).value = robot.position ? robot.position[1] : 0;
      $('arenaRobotRot' + n).value = robot.rotation || 0;
    });

    renderAll();
  }

  var typeNameMap = {
    box: 'Caja', cylinder: 'Cilindro', sphere: 'Esfera', wall: 'Pared interior',
    ball: 'Balon', zone: 'Zona', line: 'Linea', model: 'Modelo 3D',
    door: 'Puerta', ramp: 'Rampa', elevator: 'Ascensor', conveyor: 'Cinta',
    goal: 'Porteria', button: 'Boton', light: 'Luz', teleporter: 'TP',
    sound: 'Sonido', terrain: 'Terreno'
  };

  function injectTypePanel(editorType) {
    var area = $('typePropertiesArea');
    if (!area) return;
    area.innerHTML = '';
    if (!editorType || editorType === 'box' || editorType === 'cylinder' ||
        editorType === 'sphere' || editorType === 'wall' || editorType === 'line' ||
        editorType === 'zone' || editorType === 'ball' || editorType === 'model') return;

    var panels = {
      door: '<details class="inspect-section" open>' +
        '<summary>Puerta motorizada</summary><div class="section-body">' +
        '<label>Estado inicial<select id="hingeState"><option value="closed">Cerrada</option><option value="open">Abierta</option></select></label>' +
        '<div class="three-cols">' +
        '<label>Ancho<input id="doorWidth" type="number" value="30" min="5" max="500"></label>' +
        '<label>Alto<input id="doorHeight" type="number" value="50" min="5" max="500"></label>' +
        '<label>Grosor<input id="doorThickness" type="number" value="3" min="0.5" max="50"></label>' +
        '<label>Angulo abierta<input id="hingeOpenAngle" type="number" value="90" min="-170" max="170"></label>' +
        '<label>Angulo cerrada<input id="hingeCloseAngle" type="number" value="0" min="-170" max="170"></label>' +
        '<label>Velocidad (grados/s)<input id="hingeMotorSpeed" type="number" value="90" min="1" max="720"></label>' +
        '<label>Fuerza motor<input id="hingeMotorMaxForce" type="number" value="5000" min="100" max="50000"></label>' +
        '<label>Masa hoja<input id="doorMass" type="number" value="20" min="1" max="500"></label>' +
        '<label>Cierre automatico (s)<input id="doorAutoClose" type="number" value="0" min="0" max="300" step="0.1"></label></div></div></details>',
      ramp: '<details class="inspect-section" open>' +
        '<summary>Rampa</summary><div class="section-body">' +
        '<label>Comportamiento<select id="rampMode"><option value="fixed">Fija</option><option value="mobile">Movil con pivote central</option></select></label>' +
        '<div class="three-cols">' +
        '<label>Angulo fijo<input id="rampAngle" type="number" value="30" min="0" max="60"></label>' +
        '<label>Largo<input id="rampLength" type="number" value="100" min="10" max="1000"></label>' +
        '<label>Ancho<input id="rampWidth" type="number" value="40" min="10" max="500"></label>' +
        '<label>Espesor<input id="rampThickness" type="number" value="0.8" min="0.25" max="1.5" step="0.05"></label>' +
        '<label>Masa movil<input id="rampMass" type="number" value="12" min="1" max="500"></label></div></div></details>',
      elevator: '<details class="inspect-section" open>' +
        '<summary>Ascensor</summary><div class="section-body"><div class="two-cols">' +
        '<label>Recorrido (cm)<input id="elevatorOffset" type="number" value="50" min="5" max="500"></label>' +
        '<label>Velocidad (cm/s)<input id="elevatorSpeed" type="number" value="20" min="1" max="200"></label>' +
        '<label>Espera (s)<input id="elevatorWait" type="number" value="1" min="0" max="30" step="0.1"></label></div>' +
        '<label class="check"><input id="elevatorAuto" type="checkbox" checked> Movimiento automatico</label></div></details>',
      conveyor: '<details class="inspect-section" open>' +
        '<summary>Cinta transportadora</summary><div class="section-body"><div class="two-cols">' +
        '<label>Velocidad maxima (cm/s)<input id="conveyorSpeed" type="number" value="50" min="0" max="500"></label>' +
        '<label>Fuerza (cm/s2)<input id="conveyorForce" type="number" value="200" min="0" max="2000"></label>' +
        '<label>Direccion (grados)<input id="conveyorDirection" type="number" value="0"></label></div>' +
        '<label class="check"><input id="conveyorActive" type="checkbox" checked> Cinta activa</label></div></details>',
      goal: '<details class="inspect-section" open>' +
        '<summary>Porteria</summary><div class="section-body">' +
        '<label>Equipo<select id="goalTeam"><option value="A">Equipo Rojo (A)</option><option value="B">Equipo Azul (B)</option></select></label></div></details>',
      button: '<details class="inspect-section" open>' +
        '<summary>Boton / Placa de presion</summary><div class="section-body">' +
        '<label>ID accion<input id="buttonActionId" placeholder="opcional"></label></div></details>',
      light: '<details class="inspect-section" open>' +
        '<summary>Luz puntual</summary><div class="section-body">' +
        '<label>Color<input id="lightColorPicker" type="color" value="#ffffff"></label>' +
        '<div class="two-cols">' +
        '<label>Intensidad<input id="lightIntensity" type="number" value="1" min="0" max="10" step="0.1"></label>' +
        '<label>Alcance<input id="lightRange" type="number" value="50" min="1" max="500"></label></div></div></details>',
      teleporter: '<details class="inspect-section" open>' +
        '<summary>Teletransportador</summary><div class="section-body">' +
        '<div class="three-cols">' +
        '<label>Destino X<input id="teleporterTargetX" type="number" value="0"></label>' +
        '<label>Destino Y<input id="teleporterTargetY" type="number" value="0"></label>' +
        '<label>Altura Z<input id="teleporterTargetZ" type="number" value="0" min="0" max="500"></label></div>' +
        '<label>Enfriamiento (s)<input id="teleporterCooldown" type="number" value="1" min="0" max="30"></label></div></details>',
      terrain: '<details class="inspect-section" open>' +
        '<summary>Zona de terreno</summary><div class="section-body">' +
        '<label>Material<select id="terrainType"><option value="rough">Rugosa</option><option value="earth">Tierra</option><option value="sand">Arena</option><option value="grass">Cesped</option><option value="ice">Hielo</option><option value="water">Agua</option><option value="smooth">Lisa</option></select></label>' +
        '<label>Irregularidad (cm)<input id="terrainRoughness" type="number" value="3.5" min="0" max="20" step="0.5"></label></div></details>',
      sound: '<details class="inspect-section" open>' +
        '<summary>Sonido</summary><div class="section-body">' +
        '<label>Audio<button id="addSoundFile" class="primary" style="width:100%;margin-top:4px">Seleccionar archivo</button></label>' +
        '<input id="soundFile" type="file" accept=".mp3,.wav,.ogg" hidden>' +
        '<div class="two-cols">' +
        '<label>Volumen<input id="soundVolume" type="number" value="0.5" min="0" max="1" step="0.1"></label>' +
        '<label class="check"><input id="soundLoop" type="checkbox"> Repetir</label></div></div></details>'
    };
    if (panels[editorType]) {
      area.innerHTML = panels[editorType];
      // Bind change events on newly created fields
      area.querySelectorAll('input,select,textarea').forEach(function(input) {
        input.addEventListener('change', function() {
          if (input.closest('#objectInspector')) syncObjectFromForm();
          renderAll();
        });
      });
      // Bind sound file upload
      var soundBtn = $('addSoundFile');
      if (soundBtn) {
        soundBtn.onclick = function() { var sf = $('soundFile'); if (sf) sf.click(); };
      }
    }
  }

  function loadInspector() {
    var object = selected();
    $('noSelection').hidden = !!object;
    $('objectInspector').hidden = !object;
    if (!object) return;

    // Set type badge
    var tName = typeNameMap[object.editorType] || object.editorType || object.type;
    $('objectTypeDisplay').textContent = tName;

    // Inject type-specific panel
    injectTypePanel(object.editorType);

    $('objectName').value = object.name;
    $('objectX').value = object.position[0];
    $('objectY').value = object.position[1];
    $('objectZ').value = object.position[2];
    $('objectW').value = object.size[0];
    $('objectD').value = object.size[1];
    $('objectH').value = object.size[2];
    $('objectRX').value = object.rotation[0];
    $('objectRY').value = object.rotation[1];
    $('objectRZ').value = object.rotation[2];
    $('objectColor').value = object.color || '#4c6fff';
    $('objectScale').value = object.modelScale || 1;
    $('objectMass').value = object.mass || 10;
    $('objectFriction').value = object.friction == null ? 0.4 : object.friction;
    $('objectBounce').value = object.restitution || 0;
    $('objectMagnetic').checked = !!object.magnetic;
    $('objectLaser').checked = object.laserDetection !== 'invisible';
    $('objectUltrasonic').checked = object.ultrasonicDetection !== 'invisible';
    $('objectPhysics').value = object.physicsBehavior === 'kinematic' ? 'kinematic' :
      object.physicsOptions === false ? 'sensor' :
      typeof object.physicsOptions === 'object' ? 'moveable' : 'fixed';
    var motionStart = Array.isArray(object.motionStart) ? object.motionStart : object.position;
    var motionEnd = Array.isArray(object.motionEnd) ? object.motionEnd :
      [object.position[0] + 50, object.position[1], object.position[2]];
    $('motionStartX').value = motionStart[0];
    $('motionStartY').value = motionStart[1];
    $('motionStartZ').value = motionStart[2];
    $('motionEndX').value = motionEnd[0];
    $('motionEndY').value = motionEnd[1];
    $('motionEndZ').value = motionEnd[2];
    $('motionTrigger').value = object.motionTrigger || 'always';
    $('motionCycle').value = object.motionCycle || 'pingpong';
    $('motionSpeed').value = object.motionSpeed || 20;
    $('motionDelay').value = object.motionDelay || 0;
    $('motionWait').value = object.motionWait || 0;
    $('motionRetrigger').checked = !!object.motionRetrigger;
    $('kinematicPanel').hidden = $('objectPhysics').value !== 'kinematic';

    // Type-specific fields
    if ($('modelUnit')) $('modelUnit').value = object.modelUnit || 'cm';
    if ($('terrainType')) $('terrainType').value = object.terrainType || 'rough';
    if ($('terrainRoughness')) $('terrainRoughness').value =
      typeof object.terrainRoughness === 'number' ? object.terrainRoughness : 3.5;
    if ($('doorWidth')) $('doorWidth').value = object.doorWidth || 30;
    if ($('doorHeight')) $('doorHeight').value = object.doorHeight || 50;
    if ($('doorThickness')) $('doorThickness').value = object.doorThickness || 3;
    if ($('hingeMotorSpeed')) $('hingeMotorSpeed').value = object.hingeMotorSpeed || 90;
    if ($('hingeMotorMaxForce')) $('hingeMotorMaxForce').value = object.hingeMotorMaxForce <= 100 ? 5000 : (object.hingeMotorMaxForce || 5000);
    if ($('hingeOpenAngle')) $('hingeOpenAngle').value = object.hingeOpenAngle == null ? 90 : object.hingeOpenAngle;
    if ($('hingeCloseAngle')) $('hingeCloseAngle').value = object.hingeCloseAngle || 0;
    if ($('hingeState')) $('hingeState').value = object.hingeState || 'closed';
    if ($('doorMass')) $('doorMass').value = object.doorMass || 20;
    if ($('doorAutoClose')) $('doorAutoClose').value = object.doorAutoClose || 0;
    if ($('rampMode')) $('rampMode').value = object.rampMode || 'fixed';
    if ($('rampAngle')) $('rampAngle').value = object.rampAngle || 30;
    if ($('rampLength')) $('rampLength').value = object.rampLength || 100;
    if ($('rampWidth')) $('rampWidth').value = object.rampWidth || 40;
    if ($('rampThickness')) $('rampThickness').value = object.rampThickness || 0.8;
    if ($('rampMass')) $('rampMass').value = object.rampMass || 12;
    if ($('elevatorOffset')) $('elevatorOffset').value = object.elevatorOffset || 50;
    if ($('elevatorSpeed')) $('elevatorSpeed').value = object.elevatorSpeed || 20;
    if ($('elevatorWait')) $('elevatorWait').value = object.elevatorWait == null ? 1 : object.elevatorWait;
    if ($('elevatorAuto')) $('elevatorAuto').checked = object.elevatorAuto !== false;
    if ($('conveyorSpeed')) $('conveyorSpeed').value = object.conveyorSpeed == null ? 50 : object.conveyorSpeed;
    if ($('conveyorForce')) $('conveyorForce').value = object.conveyorForce == null ? 200 : object.conveyorForce;
    if ($('conveyorDirection')) $('conveyorDirection').value = object.conveyorDirection || 0;
    if ($('conveyorActive')) $('conveyorActive').checked = object.conveyorActive !== false;
    if ($('goalTeam')) $('goalTeam').value = object.goalTeam || 'A';
    if ($('buttonActionId')) $('buttonActionId').value = object.buttonActionId || '';
    if ($('lightColorPicker')) $('lightColorPicker').value = object.lightColor || '#ffffff';
    if ($('lightIntensity')) $('lightIntensity').value = object.lightIntensity || 1;
    if ($('lightRange')) $('lightRange').value = object.lightRange || 50;
    if ($('teleporterTargetX')) $('teleporterTargetX').value = object.teleporterTargetX || 0;
    if ($('teleporterTargetY')) $('teleporterTargetY').value = object.teleporterTargetY || 0;
    if ($('teleporterTargetZ')) $('teleporterTargetZ').value = object.teleporterTargetZ || 0;
    if ($('teleporterCooldown')) $('teleporterCooldown').value = object.teleporterCooldown || 1;
    if ($('soundVolume')) $('soundVolume').value = object.soundVolume || 0.5;
    if ($('soundLoop')) $('soundLoop').checked = !!object.soundLoop;

    // Destructible fields
    if ($('destructibleHP')) $('destructibleHP').value = object.destructibleHP || 0;
    if ($('destructibleRespawn')) $('destructibleRespawn').value = object.destructibleRespawnTime || 0;

    // Animation
    if ($('animMode')) $('animMode').value = object.animationMode || 'none';
    renderAnimationKeys(object);
  }

  function renderAnimationKeys(object) {
    var container = $('animationKeyList');
    if (!container) return;
    container.innerHTML = '';
    if (!object.animationKeys) object.animationKeys = [];
    object.animationKeys.forEach(function(key, index) {
      var row = document.createElement('div');
      row.className = 'anim-key-row';
      row.innerHTML =
        '<span>#' + (index + 1) + '</span>' +
        '<input class="anim-time" type="number" value="' + (key.time || 0) + '" min="0" step="0.1" style="width:50px">' +
        '<span class="anim-label">Pos:</span>' +
        '<input class="anim-px" type="number" value="' + (key.position[0] || 0) + '" style="width:45px">' +
        '<input class="anim-py" type="number" value="' + (key.position[1] || 0) + '" style="width:45px">' +
        '<input class="anim-pz" type="number" value="' + (key.position[2] || 0) + '" style="width:45px">' +
        '<span class="anim-label">Rot:</span>' +
        '<input class="anim-rx" type="number" value="' + (key.rotation[0] || 0) + '" style="width:40px">' +
        '<input class="anim-ry" type="number" value="' + (key.rotation[1] || 0) + '" style="width:40px">' +
        '<input class="anim-rz" type="number" value="' + (key.rotation[2] || 0) + '" style="width:40px">' +
        '<button class="danger anim-remove" style="padding:2px 6px;font-size:10px">X</button>';
      row.querySelector('.anim-remove').onclick = function() {
        object.animationKeys.splice(index, 1);
        renderAnimationKeys(object);
        syncObjectFromForm();
      };
      ['time', 'px', 'py', 'pz', 'rx', 'ry', 'rz'].forEach(function(field) {
        var input = row.querySelector('.anim-' + field);
        if (input) {
          input.onchange = function() {
            if (field === 'time') {
              object.animationKeys[index].time = clamp(Number(input.value), 0, 3600);
            } else if (field[0] === 'p') {
              var posIdx = {px: 0, py: 1, pz: 2}[field];
              object.animationKeys[index].position[posIdx] = Number(input.value) || 0;
            } else if (field[0] === 'r') {
              var rotIdx = {rx: 0, ry: 1, rz: 2}[field];
              object.animationKeys[index].rotation[rotIdx] = Number(input.value) || 0;
            }
          };
        }
      });
      container.appendChild(row);
    });
  }

  function resizeCanvas() {
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * ratio);
    canvas.height = Math.floor(canvas.clientHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function metrics() {
    var padding = 40;
    var scale = Math.min(
      (canvas.clientWidth - padding * 2) / state.options.length,
      (canvas.clientHeight - padding * 2) / state.options.width
    );
    return {scale: scale, ox: canvas.clientWidth / 2, oy: canvas.clientHeight / 2};
  }

  function worldToCanvas(x, y) {
    var m = metrics();
    return {x: m.ox + x * m.scale, y: m.oy - y * m.scale};
  }

  function canvasToWorld(x, y) {
    var m = metrics();
    return {x: (x - m.ox) / m.scale, y: (m.oy - y) / m.scale};
  }

  function draw() {
    var m = metrics();
    var left = m.ox - state.options.length * m.scale / 2;
    var top = m.oy - state.options.width * m.scale / 2;
    var width = state.options.length * m.scale;
    var height = state.options.width * m.scale;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = '#08101d';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = surfacePresets[state.options.surfaceType || 'smooth'].color;
    ctx.fillRect(left, top, width, height);
    if (state.options.wall) {
      ctx.strokeStyle = state.options.wallColor;
      ctx.lineWidth = Math.max(3, state.options.wallThickness * m.scale);
      ctx.strokeRect(left, top, width, height);
    }
    drawGrid(left, top, width, height, m);
    state.options.objects.forEach(function (object) { drawObject(object, m); });
    if (state.options.arenaMode && Array.isArray(state.options.arenaStartPosXYZ)) {
      document.querySelectorAll('#arenaTeamsConfig .arena-config-card').forEach(function (card, index) {
        card.style.display = index < state.options.arenaTeamCount ? '' : 'none';
      });
      document.querySelectorAll('#arenaRobotsConfig .arena-config-card').forEach(function (card, index) {
        card.style.display = index < state.options.arenaRobotCount ? '' : 'none';
      });
      state.options.arenaStartPosXYZ.forEach(function (position, index) {
        var arenaPoint = worldToCanvas(position[0], position[1]);
        var assignment = state.options.arenaRobots[index];
        var team = state.options.arenaTeams.find(function (item) { return item.id === assignment.teamId; });
        ctx.beginPath(); ctx.arc(arenaPoint.x, arenaPoint.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = team ? team.color : '#4c6fff'; ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), arenaPoint.x, arenaPoint.y);
      });
    }
    var robot = worldToCanvas(state.options.startPosXYZ[0], state.options.startPosXYZ[1]);
    ctx.beginPath();
    ctx.arc(robot.x, robot.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  function drawGrid(left, top, width, height, m) {
    if (!$('snapEnabled').checked) return;
    var step = Math.max(1, number('gridSize', 10)) * m.scale;
    if (step < 5) return;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(30,50,80,.18)';
    ctx.lineWidth = 1;
    for (var x = left; x <= left + width; x += step) { ctx.moveTo(x, top); ctx.lineTo(x, top + height); }
    for (var y = top; y <= top + height; y += step) { ctx.moveTo(left, y); ctx.lineTo(left + width, y); }
    ctx.stroke();
  }

  function drawRoundedRect(x, y, width, height, radius) {
    var r = Math.min(radius || 6, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawArrow(x1, y1, x2, y2, color) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var head = 8;
    ctx.strokeStyle = color || '#ffffff';
    ctx.fillStyle = color || '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function drawMapObjectBase(object, w, h) {
    var color = object.color || '#4c6fff';
    if (object.editorType === 'ball') {
      var gradient = ctx.createRadialGradient(-w * 0.18, -h * 0.22, 1, 0, 0, Math.max(w, h) / 2);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.35, color);
      gradient.addColorStop(1, '#1f2937');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (object.editorType === 'zone' || object.editorType === 'teleporter') {
      ctx.fillStyle = color;
      ctx.globalAlpha = object.editorType === 'zone' ? 0.28 : 0.55;
      drawRoundedRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = object.editorType === 'teleporter' ? '#d8b4fe' : '#86efac';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    if (object.type === 'sphere' || object.type === 'cylinder' || object.editorType === 'light' || object.editorType === 'sound') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      drawRoundedRect(-w / 2, -h / 2, w, h, object.editorType === 'wall' ? 2 : 5);
      ctx.fill();
    }
  }

  function drawObject(object, m) {
    var point = worldToCanvas(object.position[0], object.position[1]);
    var w = Math.max(6, object.size[0] * m.scale);
    var h = Math.max(6, object.size[1] * m.scale);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-object.rotation[1] * Math.PI / 180);
    ctx.globalAlpha = object.editorType === 'zone' ? 0.35 : 0.9;

    drawMapObjectBase(object, w, h);

    ctx.globalAlpha = 1;
    if (object.editorType === 'door') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(-w / 2, -h / 2, Math.max(4, w * 0.08), h);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(-w / 2 + Math.max(4, w * 0.08), 0, 5, 0, Math.PI * 2);
      ctx.fill();
      drawArrow(-w * 0.15, 0, w * 0.35, -h * 0.25, '#ffffff');
    } else if (object.editorType === 'ramp') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, h / 2 - 4);
      ctx.lineTo(w / 2 - 4, -h / 2 + 4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.closePath();
      ctx.fill();
    } else if (object.editorType === 'elevator') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 3, -h / 3, w * 2 / 3, h * 2 / 3);
      drawArrow(0, h * 0.25, 0, -h * 0.25, '#ffffff');
      drawArrow(0, -h * 0.25, 0, h * 0.25, '#ffffff');
    } else if (object.editorType === 'conveyor') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      for (var cx = -w / 2 + 8; cx < w / 2; cx += 14) {
        drawArrow(cx - 4, 0, cx + 5, 0, 'rgba(255,255,255,0.8)');
      }
    } else if (object.editorType === 'goal') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      for (var gx = -w / 2; gx <= w / 2; gx += 8) {
        ctx.beginPath(); ctx.moveTo(gx, -h / 2); ctx.lineTo(gx, h / 2); ctx.stroke();
      }
      for (var gy = -h / 2; gy <= h / 2; gy += 8) {
        ctx.beginPath(); ctx.moveTo(-w / 2, gy); ctx.lineTo(w / 2, gy); ctx.stroke();
      }
    } else if (object.editorType === 'button') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (object.editorType === 'light') {
      var rays = 8;
      ctx.strokeStyle = object.lightColor || '#ffdd57';
      ctx.lineWidth = 2;
      for (var a = 0; a < rays; a++) {
        var angle = a * Math.PI * 2 / rays;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * Math.min(w, h) * 0.25, Math.sin(angle) * Math.min(w, h) * 0.25);
        ctx.lineTo(Math.cos(angle) * Math.min(w, h) * 0.55, Math.sin(angle) * Math.min(w, h) * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = object.lightColor || '#ffdd57';
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else if (object.editorType === 'teleporter') {
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      for (var t = 0; t < 3; t++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, w * (0.18 + t * 0.1), h * (0.18 + t * 0.1), t * 0.35, 0, Math.PI * 1.55);
        ctx.stroke();
      }
    } else if (object.editorType === 'sound') {
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', 0, 0);
      ctx.strokeStyle = '#e0f2fe';
      ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.28, -0.8, 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.42, -0.8, 0.8); ctx.stroke();
    } else if (object.editorType === 'model') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 3, -h / 3, w * 2 / 3, h * 2 / 3);
      ctx.beginPath(); ctx.moveTo(-w / 3, -h / 3); ctx.lineTo(0, -h / 2); ctx.lineTo(w / 3, -h / 3); ctx.stroke();
    }

    if (object.id === selectedId) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function renderLayers() {
    $('objectCount').textContent = state.options.objects.length;
    $('layers').innerHTML = '';
    state.options.objects.forEach(function (object) {
      var row = document.createElement('div');
      row.className = 'layer' + (object.id === selectedId ? ' active' : '');
      row.innerHTML = '<span class="layer-color"></span><span></span><small></small>';
      row.querySelector('.layer-color').style.background = object.color;
      row.children[1].textContent = object.name;
      row.children[2].textContent = object.editorType || object.type;
      row.onclick = function () { selectedId = object.id; renderAll(); };
      $('layers').appendChild(row);
    });
  }

  function addMazeWall(x, y, width, depth, height, thickness) {
    var object = {
      id: 'maze-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
      name: 'Pared de laberinto', type: 'box', editorType: 'wall', position: [x, y, height / 2],
      rotation: [0, 0, 0], rotationMode: 'degrees', size: [width, depth, height],
      color: state.options.wallColor, physicsOptions: 'fixed', mass: 10, friction: 0.4,
      restitution: 0.05, magnetic: false, modelURL: '', modelScale: 1,
      laserDetection: 'normal', ultrasonicDetection: 'normal', isPickable: true, generatedMaze: true
    };
    object.motionStart = object.position.slice();
    object.motionEnd = [object.position[0] + 50, object.position[1], object.position[2]];
    state.options.objects.push(object);
  }

  function generateMaze() {
    syncStateFromForm();
    state.options.objects = state.options.objects.filter(function (object) { return !object.generatedMaze; });
    var columns = clamp(number('mazeColumns', 6), 2, 12);
    var rows = clamp(number('mazeRows', 6), 2, 12);
    var margin = clamp(number('mazeMargin', 15), 0, 100);
    var thickness = state.options.wallThickness;
    var height = state.options.wallHeight;
    var cellW = (state.options.length - margin * 2) / columns;
    var cellH = (state.options.width - margin * 2) / rows;
    var visited = new Array(columns * rows).fill(false);
    var open = {};
    var stack = [0];
    visited[0] = true;
    while (stack.length) {
      var current = stack[stack.length - 1];
      var cx = current % columns;
      var cy = Math.floor(current / columns);
      var neighbors = [];
      if (cx > 0 && !visited[current - 1]) neighbors.push(current - 1);
      if (cx < columns - 1 && !visited[current + 1]) neighbors.push(current + 1);
      if (cy > 0 && !visited[current - columns]) neighbors.push(current - columns);
      if (cy < rows - 1 && !visited[current + columns]) neighbors.push(current + columns);
      if (!neighbors.length) { stack.pop(); continue; }
      var next = neighbors[Math.floor(Math.random() * neighbors.length)];
      open[Math.min(current, next) + ':' + Math.max(current, next)] = true;
      visited[next] = true;
      stack.push(next);
    }
    for (var row = 0; row < rows; row++) {
      for (var column = 0; column < columns; column++) {
        var index = row * columns + column;
        var centerX = -state.options.length / 2 + margin + column * cellW + cellW / 2;
        var centerY = -state.options.width / 2 + margin + row * cellH + cellH / 2;
        if (column < columns - 1 && !open[index + ':' + (index + 1)]) {
          addMazeWall(centerX + cellW / 2, centerY, thickness, cellH + thickness, height, thickness);
        }
        if (row < rows - 1 && !open[index + ':' + (index + columns)]) {
          addMazeWall(centerX, centerY + cellH / 2, cellW + thickness, thickness, height, thickness);
        }
      }
    }
    selectedId = null;
    renderAll();
    toast('Laberinto generado');
  }

  function fillSelect(select, objects, includeRobot) {
    if (!select) return;
    var previous = select.value;
    select.innerHTML = '';
    if (includeRobot) {
      var robotOption = document.createElement('option');
      robotOption.value = 'robot'; robotOption.textContent = 'Robot'; select.appendChild(robotOption);
    }
    objects.forEach(function (object) {
      var option = document.createElement('option');
      option.value = object.id; option.textContent = object.name; select.appendChild(option);
    });
    if (Array.from(select.options).some(function (option) { return option.value === previous; })) {
      select.value = previous;
    }
  }

  function renderRules() {
    var objects = state.options.objects;
    fillSelect($('ruleTrigger'), objects.filter(function (object) { return object.triggerZone || object.editorType === 'button'; }), false);
    fillSelect($('ruleActor'), objects.filter(function (object) { return !object.triggerZone; }), true);
    fillSelect($('ruleTarget'), objects, false);
    $('rulesList').innerHTML = '';
    (state.options.rules || []).forEach(function (rule) {
      var row = document.createElement('div'); row.className = 'saved-map';
      var label = document.createElement('span');
      label.textContent = rule.name || rule.action;
      var remove = document.createElement('button'); remove.textContent = 'X'; remove.className = 'danger';
      remove.onclick = function () {
        state.options.rules = state.options.rules.filter(function (item) { return item.id !== rule.id; });
        renderRules();
      };
      row.append(label, remove); $('rulesList').appendChild(row);
    });
  }

  function renderAll() {
    $('canvasInfo').textContent = state.options.length + ' x ' + state.options.width + ' cm';
    renderLayers();
    renderRules();
    loadInspector();
    draw();
  }

  function mapPayload() {
    syncStateFromForm();
    var options = JSON.parse(JSON.stringify(state.options));
    options.objects.forEach(function (object) {
      delete object.mass;
      delete object.friction;
      delete object.restitution;
    });
    if (!options.imageURL) {
      options.imageURL = makeSurfaceTexture(surfacePresets[options.surfaceType].color);
      options.imageScale = 1;
      options.uScale = options.length * 10 / 512;
      options.vScale = options.width * 10 / 512;
    }
    return {version: 2, worldName: 'stblockUser', metadata: state.metadata, editor: state.editor, options: options};
  }

  function makeSurfaceTexture(color) {
    var tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    var tileCtx = tile.getContext('2d');
    tileCtx.fillStyle = color;
    tileCtx.fillRect(0, 0, 512, 512);
    if (state.options.surfaceType === 'rough' || state.options.surfaceType === 'earth' ||
        state.options.surfaceType === 'sand' || state.options.surfaceType === 'grass') {
      for (var i = 0; i < 1400; i++) {
        tileCtx.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.08) + ')';
        tileCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    }
    return tile.toDataURL('image/png');
  }

  async function saveMap() {
    var payload = mapPayload();
    var response = await fetch(API_BASE + '/api/gears/maps/' + encodeURIComponent(payload.metadata.id), {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text());
    toast('Escenario guardado');
    await refreshMaps();
    return response.json();
  }

  async function refreshMaps() {
    try {
      var maps = await fetch(API_BASE + '/api/gears/maps').then(function (response) { return response.json(); });
      $('savedMaps').innerHTML = '';
      maps.forEach(function (map) {
        var row = document.createElement('div');
        row.className = 'saved-map';
        var load = document.createElement('button');
        load.textContent = map.name;
        load.onclick = function () { loadMapUrl(map.url); };
        var remove = document.createElement('button');
        remove.textContent = 'X';
        remove.className = 'danger';
        remove.onclick = async function () {
          await fetch(API_BASE + '/api/gears/maps/' + encodeURIComponent(map.id), {method: 'DELETE'});
          refreshMaps();
        };
        row.append(load, remove);
        $('savedMaps').appendChild(row);
      });
    } catch(e) { /* silently fail */ }
  }

  async function loadMapUrl(url) {
    var payload = await fetch(withCacheBuster(url)).then(function (response) { return response.json(); });
    applyPayload(payload);
    toast('Escenario cargado');
  }

  function applyPayload(payload) {
    if (!payload || payload.worldName !== 'stblockUser') throw new Error('Formato no compatible');
    state = createState();
    state.metadata = Object.assign(state.metadata, payload.metadata || {});
    state.options = Object.assign(state.options, payload.options || {});
    state.editor = Object.assign(state.editor, payload.editor || {});
    state.options.objects.forEach(function (object, index) {
      object.id = object.id || 'obj-loaded-' + index + '-' + Date.now();
      object.name = object.name || 'Objeto ' + (index + 1);
      object.editorType = object.editorType || object.type;
      object.triggerZone = object.triggerZone || object.editorType === 'zone';
      object.animationKeys = object.animationKeys || [];
      object.animationMode = object.animationMode || 'none';
    });
    state.options.rules = Array.isArray(state.options.rules) ? state.options.rules : [];
    textureUrl = state.options.imageURL || '';
    textureDimensions = null;
    if (state.editor.textureDimensions) {
      textureDimensions = state.editor.textureDimensions;
    }
    selectedId = null;
    loadForm();
  }

  function safeAssetName(fileName) {
    var base = String(fileName || 'asset').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    return Date.now() + '-' + base;
  }

  async function uploadAsset(file) {
    var filename = safeAssetName(file.name);
    var response = await fetch(API_BASE + '/api/gears/assets/' + encodeURIComponent(filename), {
      method: 'PUT', headers: {'Content-Type': file.type || 'application/octet-stream'}, body: file
    });
    if (!response.ok) throw new Error(await response.text());
    var asset = await response.json();
    asset.filename = asset.filename || filename;
    asset.originalName = file.name;
    asset.url = asset.url || (API_BASE + '/api/gears/assets/' + encodeURIComponent(asset.filename));
    return asset;
  }

  function gearbotEntityUrl(kind, id, saved) {
    if (saved && saved.url) return saved.url;
    var path = kind === 'robot' ? '/api/gears/robots/admin/' : '/api/gears/maps/';
    return API_BASE + path + encodeURIComponent(id);
  }

  function gearbotEditorReturnUrl(mode, entityId) {
    var url = new URL('index.html', window.location.href);
    url.searchParams.set('adminMode', mode || 'robots');
    if (mode === 'robots' && entityId) url.searchParams.set('robotId', entityId);
    if (mode === 'maps' && entityId) url.searchParams.set('mapId', entityId);
    return url.href;
  }

  function appendGearbotReturnParams(url, mode, entityId) {
    var testUrl = new URL(url, window.location.href);
    testUrl.searchParams.set('adminTest', '1');
    testUrl.searchParams.set('returnTo', gearbotEditorReturnUrl(mode, entityId));
    return testUrl.href;
  }

  function createGearbotTestWindow(targetName) {
    try {
      return window.open('', targetName || '_blank');
    } catch (error) {
      return null;
    }
  }

  function openGearbotTest(url, targetName, existingWindow) {
    var absoluteUrl = new URL(url, window.location.href).href;
    var opened = existingWindow || null;
    try {
      if (opened && !opened.closed) {
        opened.location.href = absoluteUrl;
        opened.focus && opened.focus();
        return;
      }
      opened = window.open(absoluteUrl, targetName || '_blank');
    } catch (error) {
      console.warn('[STBLOCK-GEARBOT] window.open no disponible, navegando en la ventana actual', error);
    }
    if (!opened || opened.closed) {
      window.location.href = absoluteUrl;
    }
  }


  // --- Piece Preset Builder Functions ---
  function createDefaultPieceState() {
    return {
      schema: 'stblock-piece-preset-v1',
      id: 'servo-sg90',
      name: 'Servo SG90',
      category: 'actuator',
      type: 'rotary-servo',
      description: '',
      segments: [
        makePieceSegment('fixed', 'Carcasa'),
        makePieceSegment('rotary', 'Eje')
      ],
      controls: {input: 'value', min: 0, max: 180, defaultValue: 90}
    };
  }

  function makePieceSegment(role, name) {
    var id = 'segment-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    var defaultAxis = role === 'linear' ? [0, 1, 0] : [1, 0, 0];
    var defaultLimits = role === 'linear' ? [0, 5] : [0, 180];
    return {
      id: id,
      name: name || pieceRoleLabel(role),
      role: role || 'fixed',
      parentId: role === 'fixed' || !pieceState || !(pieceState.segments || []).length ? '' : pieceState.segments[0].id,
      modelURL: '',
      modelName: '',
      position: [0, role === 'rotary' ? 3 : 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      pivot: [0, 0, 0],
      axis: defaultAxis,
      limits: defaultLimits,
      speed: role === 'continuous' ? 120 : 90,
      mass: role === 'fixed' ? 20 : 5,
      friction: 0.5,
      collider: true,
      color: role === 'fixed' ? '#2f8cff' : role === 'linear' ? '#00a884' : '#f59e0b'
    };
  }

  function pieceRoleLabel(role) {
    return {
      fixed: 'Fija', rotary: 'Rotacion', continuous: 'Giro continuo',
      linear: 'Lineal', free: 'Fisica libre'
    }[role] || 'Subpieza';
  }

  function selectedPieceSegment() {
    return (pieceState.segments || []).find(function(segment) { return segment.id === selectedPieceSegmentId; }) || null;
  }

  function syncPieceStateFromForm() {
    if (!$('pieceNameInput')) return;
    pieceState.name = $('pieceNameInput').value || 'Pieza nueva';
    pieceState.id = slug($('pieceIdInput').value || pieceState.name);
    $('pieceIdInput').value = pieceState.id;
    pieceState.category = $('pieceCategoryInput').value || 'custom';
    pieceState.type = $('pieceTypeInput').value || 'custom';
    pieceState.description = $('pieceDescriptionInput').value || '';
    pieceState.pinCount = parseInt($('piecePinCountInput').value) || 1;
  }

  function loadPieceForm() {
    if (!$('pieceNameInput')) return;
    $('pieceNameInput').value = pieceState.name || '';
    $('pieceIdInput').value = pieceState.id || '';
    $('pieceCategoryInput').value = pieceState.category || 'custom';
    $('pieceTypeInput').value = pieceState.type || 'custom';
    $('pieceDescriptionInput').value = pieceState.description || '';
    if ($('piecePinCountInput')) $('piecePinCountInput').value = pieceState.pinCount || 1;
    renderPieceSegmentsList();
    selectPieceSegment(selectedPieceSegmentId || ((pieceState.segments || [])[0] || {}).id || null);
  }

  function renderPieceSegmentsList() {
    var list = $('pieceSegmentsList');
    if (!list) return;
    list.innerHTML = '';
    var segments = pieceState.segments || [];
    $('pieceSegmentCount').textContent = segments.length;
    segments.forEach(function(segment) {
      var row = document.createElement('div');
      row.className = 'layer' + (segment.id === selectedPieceSegmentId ? ' active' : '');
      row.innerHTML = '<span class="layer-color" style="background:' + (segment.color || '#38bdf8') + '"></span><span></span><small></small><button class="danger" title="Eliminar subpieza" style="margin-left:auto;padding:1px 6px;font-size:10px;line-height:1;">X</button>';
      row.children[1].textContent = segment.name || 'Subpieza';
      row.children[2].textContent = pieceRoleLabel(segment.role);
      row.onclick = function() { selectPieceSegment(segment.id); };
      row.children[3].onclick = function(event) {
        event.stopPropagation();
        removePieceSegment(segment.id);
      };
      list.appendChild(row);
    });
  }

  function populatePieceParentSelect(segment) {
    var select = $('segmentParentInput');
    if (!select) return;
    select.innerHTML = '<option value="">Sin padre</option>';
    (pieceState.segments || []).forEach(function(candidate) {
      if (segment && candidate.id === segment.id) return;
      var option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.name || candidate.id;
      select.appendChild(option);
    });
  }

  function selectPieceSegment(id) {
    selectedPieceSegmentId = id;
    var segment = selectedPieceSegment();
    renderPieceSegmentsList();
    if (!$('pieceSegmentInspector')) return;
    $('noPieceSegmentSelected').hidden = !!segment;
    $('pieceSegmentInspector').hidden = !segment;
    if (!segment) return;
    populatePieceParentSelect(segment);
    $('segmentNameInput').value = segment.name || '';
    $('segmentRoleInput').value = segment.role || 'fixed';
    $('segmentParentInput').value = segment.parentId || '';
    $('segmentX').value = (segment.position || [0, 0, 0])[0];
    $('segmentY').value = (segment.position || [0, 0, 0])[1];
    $('segmentZ').value = (segment.position || [0, 0, 0])[2];
    $('segmentRX').value = (segment.rotation || [0, 0, 0])[0];
    $('segmentRY').value = (segment.rotation || [0, 0, 0])[1];
    $('segmentRZ').value = (segment.rotation || [0, 0, 0])[2];
    $('segmentScale').value = segment.scale || 1;
    $('segmentAxisX').value = (segment.axis || [1, 0, 0])[0];
    $('segmentAxisY').value = (segment.axis || [1, 0, 0])[1];
    $('segmentAxisZ').value = (segment.axis || [1, 0, 0])[2];
    $('segmentPivotX').value = (segment.pivot || [0, 0, 0])[0];
    $('segmentPivotY').value = (segment.pivot || [0, 0, 0])[1];
    $('segmentPivotZ').value = (segment.pivot || [0, 0, 0])[2];
    $('segmentMin').value = (segment.limits || [0, 180])[0];
    $('segmentMax').value = (segment.limits || [0, 180])[1];
    $('segmentSpeed').value = segment.speed || 90;
    $('segmentMass').value = segment.mass || 0;
    $('segmentFriction').value = segment.friction == null ? 0.5 : segment.friction;
    $('segmentColor').value = segment.color || '#2f8cff';
    $('segmentCollider').checked = segment.collider !== false;
    $('segmentModelName').value = segment.modelName || 'Sin modelo 3D';
    setSegmentMeasurementFields(segment);
  }

  function syncPieceSegmentFromForm() {
    var segment = selectedPieceSegment();
    if (!segment || !$('segmentNameInput')) return;
    segment.name = $('segmentNameInput').value || segment.name || 'Subpieza';
    segment.role = $('segmentRoleInput').value || 'fixed';
    segment.parentId = $('segmentParentInput').value || '';
    segment.position = [number('segmentX', 0), number('segmentY', 0), number('segmentZ', 0)];
    segment.rotation = [number('segmentRX', 0), number('segmentRY', 0), number('segmentRZ', 0)];
    segment.scale = number('segmentScale', 1);
    segment.axis = [number('segmentAxisX', 1), number('segmentAxisY', 0), number('segmentAxisZ', 0)];
    segment.pivot = [number('segmentPivotX', 0), number('segmentPivotY', 0), number('segmentPivotZ', 0)];
    segment.limits = [number('segmentMin', 0), number('segmentMax', segment.role === 'linear' ? 5 : 180)];
    segment.speed = number('segmentSpeed', 90);
    segment.mass = number('segmentMass', segment.role === 'fixed' ? 20 : 5);
    segment.friction = number('segmentFriction', 0.5);
    segment.color = $('segmentColor').value || '#2f8cff';
    segment.collider = $('segmentCollider').checked;
    renderPieceSegmentsList();
  }

  function addPieceSegment(role) {
    syncPieceStateFromForm();
    if (selectedPieceSegmentId) syncPieceSegmentFromForm();
    var segment = makePieceSegment(role || 'fixed');
    pieceState.segments.push(segment);
    selectPieceSegment(segment.id);
    renderPiece3D();
  }

  function removePieceSegment(id) {
    if (!id) return;
    pieceState.segments = (pieceState.segments || []).filter(function(segment) { return segment.id !== id; });
    pieceState.segments.forEach(function(segment) {
      if (segment.parentId === id) segment.parentId = '';
    });
    selectedPieceSegmentId = ((pieceState.segments || [])[0] || {}).id || null;
    selectPieceSegment(selectedPieceSegmentId);
    renderPiece3D();
  }

  function duplicatePieceSegment() {
    var segment = selectedPieceSegment();
    if (!segment) return;
    var copy = JSON.parse(JSON.stringify(segment));
    copy.id = 'segment-' + Date.now();
    copy.name = (copy.name || 'Subpieza') + ' copia';
    copy.position[0] += 2;
    pieceState.segments.push(copy);
    selectPieceSegment(copy.id);
    renderPiece3D();
  }

  function initPiece3DScene() {
    if (!pieceCanvas || pieceEngine) return;
    pieceEngine = new BABYLON.Engine(pieceCanvas, true, {preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: true});
    pieceScene = new BABYLON.Scene(pieceEngine);
    pieceScene.clearColor = new BABYLON.Color4(0.03, 0.05, 0.09, 1);
    pieceCamera = new BABYLON.ArcRotateCamera('pieceCamera', Math.PI / 4, Math.PI / 3, 55, BABYLON.Vector3.Zero(), pieceScene);
    pieceCamera.attachControl(pieceCanvas, true);
    new BABYLON.HemisphericLight('pieceLight', new BABYLON.Vector3(0, 1, 0), pieceScene).intensity = 0.85;
    var dir = new BABYLON.DirectionalLight('pieceDirLight', new BABYLON.Vector3(-0.4, -0.8, -0.3), pieceScene);
    dir.intensity = 0.55;
    var grid = BABYLON.MeshBuilder.CreateGround('pieceGrid', {width: 80, height: 80, subdivisions: 20}, pieceScene);
    var gridMat = new BABYLON.StandardMaterial('pieceGridMat', pieceScene);
    gridMat.diffuseColor = new BABYLON.Color3(0.07, 0.10, 0.16);
    gridMat.specularColor = BABYLON.Color3.Black();
    grid.material = gridMat;
    pieceEngine.runRenderLoop(function() { if (pieceScene) pieceScene.render(); });
    window.addEventListener('resize', function() { if (pieceEngine) pieceEngine.resize(); });
    bindPieceDragHandlers();
  }

  function bindPieceDragHandlers() {
    if (!pieceCanvas || pieceCanvas.dataset.dragHandlersBound === 'yes') return;
    pieceCanvas.dataset.dragHandlersBound = 'yes';

    pieceCanvas.addEventListener('pointerdown', function(event) {
      if (activeMode !== 'parts' || !pieceScene || event.button !== 0) return;
      var hit = pickPieceSegment(event);
      if (!hit || !hit.segment) return;
      event.preventDefault();
      event.stopPropagation();
      try { pieceCanvas.setPointerCapture(event.pointerId); } catch (e) {}
      selectPieceSegment(hit.segment.id);
      if (hit.isPivot) startPiecePivotDrag(hit.segment, event);
      else startPieceSegmentDrag(hit.segment, event);
    });

    pieceCanvas.addEventListener('pointermove', function(event) {
      if (!pieceDraggingSegment) return;
      event.preventDefault();
      event.stopPropagation();
      if (pieceDragMode === 'pivot') movePiecePivotDrag(event);
      else movePieceSegmentDrag(event);
    });

    window.addEventListener('pointerup', function(event) {
      stopPieceSegmentDrag(event);
    });
  }

  function pieceSegmentFromMesh(mesh) {
    var current = mesh;
    while (current) {
      if (current.metadata && current.metadata.stblockPieceSegmentId) {
        var id = current.metadata.stblockPieceSegmentId;
        return (pieceState.segments || []).find(function(segment) { return segment.id === id; }) || null;
      }
      current = current.parent;
    }
    return null;
  }

  function pickPieceSegment(event) {
    var rect = pieceCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var pick = pieceScene.pick(x, y, function(mesh) {
      return mesh && mesh.name !== 'pieceGrid' && !!pieceSegmentFromMesh(mesh);
    });
    if (!pick || !pick.hit || !pick.pickedMesh) return null;
    var segment = pieceSegmentFromMesh(pick.pickedMesh);
    return segment ? {segment: segment, point: pick.pickedPoint, mesh: pick.pickedMesh, isPivot: isPiecePivotMarkerMesh(pick.pickedMesh)} : null;
  }

  function pointerToPiecePlane(event, planeY) {
    var rect = pieceCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var ray = pieceScene.createPickingRay(x, y, BABYLON.Matrix.Identity(), pieceCamera);
    var plane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, planeY, 0), BABYLON.Axis.Y);
    var distance = ray.intersectsPlane(plane);
    if (distance == null) return null;
    return ray.origin.add(ray.direction.scale(distance));
  }

  function startPieceSegmentDrag(segment, event) {
    if (!segment || !segment.position) return;
    pieceDragMode = 'segment';
    pieceDragSegmentId = segment.id;
    pieceDragPlaneY = Number(segment.position[1]) || 0;
    var point = pointerToPiecePlane(event, pieceDragPlaneY);
    if (!point) return;
    pieceDragOffset = new BABYLON.Vector3(segment.position[0] - point.x, 0, segment.position[2] - point.z);
    pieceDraggingSegment = true;
    if (pieceCamera) pieceCamera.detachControl(pieceCanvas);
    pieceCanvas.style.cursor = 'grabbing';
  }

  function pointerToPieceLocalXYPlane(event, segment) {
    if (!segment || !pieceScene || !pieceCamera) return null;
    var root = pieceMeshes[segment.id];
    if (!root) return null;
    root.computeWorldMatrix(true);
    var world = root.getWorldMatrix();
    var origin = BABYLON.Vector3.TransformCoordinates(vectorFromArray(segment.pivot, [0, 0, 0]), world);
    var normal = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Z, world).normalize();
    var rect = pieceCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var ray = pieceScene.createPickingRay(x, y, BABYLON.Matrix.Identity(), pieceCamera);
    var plane = BABYLON.Plane.FromPositionAndNormal(origin, normal);
    var distance = ray.intersectsPlane(plane);
    if (distance == null) return null;
    var worldPoint = ray.origin.add(ray.direction.scale(distance));
    var inverse = world.clone();
    inverse.invert();
    return BABYLON.Vector3.TransformCoordinates(worldPoint, inverse);
  }

  function startPiecePivotDrag(segment, event) {
    if (!segment) return;
    pieceDragMode = 'pivot';
    pieceDragSegmentId = segment.id;
    var point = pointerToPieceLocalXYPlane(event, segment);
    if (!point) return;
    var pivot = vectorFromArray(segment.pivot, [0, 0, 0]);
    piecePivotDragOffset = new BABYLON.Vector3(pivot.x - point.x, pivot.y - point.y, 0);
    pieceDraggingSegment = true;
    if (pieceCamera) pieceCamera.detachControl(pieceCanvas);
    pieceCanvas.style.cursor = 'grabbing';
  }

  function movePieceSegmentDrag(event) {
    var segment = selectedPieceSegment();
    if (!segment || segment.id !== pieceDragSegmentId || !pieceDragOffset) return;
    var point = pointerToPiecePlane(event, pieceDragPlaneY);
    if (!point) return;
    segment.position[0] = Number((point.x + pieceDragOffset.x).toFixed(2));
    segment.position[2] = Number((point.z + pieceDragOffset.z).toFixed(2));
    updatePieceSegmentPositionUI(segment);
    updatePieceSegmentMeshPosition(segment);
  }

  function movePiecePivotDrag(event) {
    var segment = selectedPieceSegment();
    if (!segment || segment.id !== pieceDragSegmentId || !piecePivotDragOffset) return;
    var point = pointerToPieceLocalXYPlane(event, segment);
    if (!point) return;
    var current = segment.pivot || [0, 0, 0];
    segment.pivot = [
      roundPivotValue(point.x + piecePivotDragOffset.x),
      roundPivotValue(point.y + piecePivotDragOffset.y),
      roundPivotValue(current[2])
    ];
    updatePieceSegmentPivotUI(segment);
    updatePieceSegmentPivotVisual(segment);
  }

  function stopPieceSegmentDrag(event) {
    if (!pieceDraggingSegment) return;
    pieceDraggingSegment = false;
    pieceDragSegmentId = null;
    pieceDragOffset = null;
    pieceDragMode = null;
    piecePivotDragOffset = null;
    if (pieceCanvas) {
      pieceCanvas.style.cursor = 'default';
      if (event && event.pointerId != null) {
        try { pieceCanvas.releasePointerCapture(event.pointerId); } catch (e) {}
      }
    }
    if (pieceCamera) pieceCamera.attachControl(pieceCanvas, true);
    renderPieceSegmentsList();
  }

  function updatePieceSegmentPositionUI(segment) {
    if (!segment || segment.id !== selectedPieceSegmentId) return;
    if ($('segmentX')) $('segmentX').value = segment.position[0];
    if ($('segmentY')) $('segmentY').value = segment.position[1];
    if ($('segmentZ')) $('segmentZ').value = segment.position[2];
  }

  function updatePieceSegmentPivotUI(segment) {
    if (!segment || segment.id !== selectedPieceSegmentId) return;
    if ($('segmentPivotX')) $('segmentPivotX').value = (segment.pivot || [0, 0, 0])[0];
    if ($('segmentPivotY')) $('segmentPivotY').value = (segment.pivot || [0, 0, 0])[1];
    if ($('segmentPivotZ')) $('segmentPivotZ').value = (segment.pivot || [0, 0, 0])[2];
  }

  function updatePieceSegmentPivotVisual(segment) {
    if (!segment || !pieceScene) return;
    var root = pieceMeshes[segment.id];
    var pivotNode = pieceScene.getTransformNodeByName('piecePivot-' + segment.id);
    if (!root || !pivotNode) return;
    var pivot = vectorFromArray(segment.pivot, [0, 0, 0]);
    pivotNode.position = pivot;
    var visualOffset = pivot.scale(-1);
    pivotNode.getChildren().forEach(function(child) {
      if (child && child.position) child.position = visualOffset.clone();
    });
    var marker = pieceScene.getMeshByName('piecePivotMarker-' + segment.id);
    if (marker) marker.position = pivot.clone();
    var oldLine = pieceScene.getMeshByName('piecePivotAxis-' + segment.id);
    if (oldLine) oldLine.dispose();
    var axis = vectorFromArray(segment.axis, [1, 0, 0]);
    if (axis.length && axis.length() > 0.0001) axis.normalize();
    var line = BABYLON.MeshBuilder.CreateLines('piecePivotAxis-' + segment.id, {
      points: [pivot.clone(), pivot.add(axis.scale(5))]
    }, pieceScene);
    line.parent = root;
    line.color = new BABYLON.Color3(1, 0.15, 0.15);
    line.metadata = {stblockPieceSegmentId: segment.id, stblockPivotMarker: true};
    updateSegmentMeasurement(segment, root);
  }

  function updatePieceSegmentMeshPosition(segment) {
    var mesh = pieceMeshes[segment.id];
    if (!mesh) return;
    applySegmentBaseTransform(mesh, segment);
    updateSegmentMeasurement(segment, mesh);
  }

  function clearPieceMeshes() {
    Object.keys(pieceMeshes).forEach(function(id) {
      var mesh = pieceMeshes[id];
      if (mesh && mesh.dispose) mesh.dispose();
    });
    pieceMeshes = {};
    if (pieceScene) {
      pieceScene.meshes.slice().forEach(function(mesh) {
        if (mesh.metadata && mesh.metadata.stblockPieceSegmentId) mesh.dispose();
      });
    }
  }

  function vectorFromArray(values, fallback) {
    values = values || fallback || [0, 0, 0];
    return new BABYLON.Vector3(Number(values[0]) || 0, Number(values[1]) || 0, Number(values[2]) || 0);
  }

  function createSegmentPlaceholder(segment) {
    var mesh;
    if (segment.role === 'linear') {
      mesh = BABYLON.MeshBuilder.CreateBox(segment.id, {width: 3, height: 3, depth: 9}, pieceScene);
    } else if (segment.role === 'rotary' || segment.role === 'continuous') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(segment.id, {diameter: 4, height: 8, tessellation: 32}, pieceScene);
      mesh.rotation.z = Math.PI / 2;
    } else {
      mesh = BABYLON.MeshBuilder.CreateBox(segment.id, {width: 12, height: 6, depth: 8}, pieceScene);
    }
    return mesh;
  }

  function segmentMeasurementLabel(measurement) {
    if (!measurement) return 'Sin medir';
    return formatMm(measurement.widthMm) + ' x ' + formatMm(measurement.heightMm) + ' x ' + formatMm(measurement.depthMm) + ' mm';
  }

  function formatMm(value) {
    var numberValue = Number(value);
    if (!isFinite(numberValue)) return '-';
    return Math.round(numberValue * 10) / 10;
  }

  function setSegmentMeasurementFields(segment) {
    if (!$('segmentMeasureW')) return;
    var measurement = segment && segment.measurement;
    $('segmentMeasureW').value = measurement ? formatMm(measurement.widthMm) : '';
    $('segmentMeasureH').value = measurement ? formatMm(measurement.heightMm) : '';
    $('segmentMeasureD').value = measurement ? formatMm(measurement.depthMm) : '';
    if ($('segmentMeasureHint')) {
      $('segmentMeasureHint').textContent = measurement ?
        ('Medido desde bounding box del visor: ' + segmentMeasurementLabel(measurement)) :
        'Aun no hay medida calculada.';
    }
  }

  function isPiecePivotMarkerMesh(mesh) {
    return !!(mesh && mesh.metadata && mesh.metadata.stblockPivotMarker);
  }

  function collectMeasurableMeshes(mesh) {
    var meshes = [];
    if (mesh && mesh.getChildMeshes) {
      meshes = mesh.getChildMeshes(false).filter(function(child) {
        return child && child.getBoundingInfo && !isPiecePivotMarkerMesh(child);
      });
    }
    if (!meshes.length && mesh && mesh.getBoundingInfo && !isPiecePivotMarkerMesh(mesh)) meshes = [mesh];
    return meshes;
  }

  function calculateMeshBounds(mesh, localToRoot) {
    if (!mesh || !pieceScene) return null;
    pieceScene.render();
    mesh.computeWorldMatrix(true);
    var rootInverse = null;
    if (localToRoot) {
      rootInverse = mesh.getWorldMatrix().clone();
      rootInverse.invert();
    }
    var min = null;
    var max = null;
    collectMeasurableMeshes(mesh).forEach(function(child) {
      child.computeWorldMatrix(true);
      var vectors = child.getBoundingInfo().boundingBox.vectorsWorld;
      vectors.forEach(function(v) {
        var point = rootInverse ? BABYLON.Vector3.TransformCoordinates(v, rootInverse) : v;
        if (!min) {
          min = point.clone();
          max = point.clone();
          return;
        }
        min.x = Math.min(min.x, point.x); min.y = Math.min(min.y, point.y); min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x); max.y = Math.max(max.y, point.y); max.z = Math.max(max.z, point.z);
      });
    });
    if (!min || !max) return null;
    return {min: min, max: max, center: min.add(max).scale(0.5)};
  }

  function measureMeshBoundsMm(mesh) {
    var bounds = calculateMeshBounds(mesh, false);
    if (!bounds) return null;
    return {
      widthMm: Math.abs(bounds.max.x - bounds.min.x) * 10,
      heightMm: Math.abs(bounds.max.y - bounds.min.y) * 10,
      depthMm: Math.abs(bounds.max.z - bounds.min.z) * 10,
      source: 'bounding-box',
      updatedAt: new Date().toISOString()
    };
  }

  function updateSegmentMeasurement(segment, mesh) {
    if (!segment || !mesh) return;
    var measurement = measureMeshBoundsMm(mesh);
    if (!measurement) return;
    segment.measurement = measurement;
    if (segment.id === selectedPieceSegmentId) setSegmentMeasurementFields(segment);
  }

  function measureSelectedPieceSegment() {
    var segment = selectedPieceSegment();
    if (!segment) return;
    var mesh = pieceMeshes[segment.id];
    if (!mesh) {
      renderPiece3D();
      mesh = pieceMeshes[segment.id];
    }
    if (!mesh) {
      toast('No hay malla visible para medir');
      return;
    }
    updateSegmentMeasurement(segment, mesh);
    setSegmentMeasurementFields(segment);
    toast('Medida calculada: ' + segmentMeasurementLabel(segment.measurement));
  }

  function roundPivotValue(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function centerSelectedPiecePivotToModel() {
    var segment = selectedPieceSegment();
    if (!segment) return;
    var mesh = pieceMeshes[segment.id];
    if (!mesh) {
      renderPiece3D();
      mesh = pieceMeshes[segment.id];
    }
    var bounds = calculateMeshBounds(mesh, true);
    if (!bounds) {
      toast('No hay modelo visible para centrar el pivote');
      return;
    }
    segment.pivot = [roundPivotValue(bounds.center.x), roundPivotValue(bounds.center.y), roundPivotValue(bounds.center.z)];
    selectPieceSegment(segment.id);
    renderPiece3D();
    toast('Pivote centrado en el modelo');
  }

  function applyMaterialToMeshTree(mesh, material) {
    if (!mesh || !material) return;
    if (mesh.material !== undefined) mesh.material = material;
    if (mesh.getChildMeshes) {
      mesh.getChildMeshes(false).forEach(function(child) {
        if (child && child.material !== undefined) child.material = material;
      });
    }
  }

  function applySegmentBaseTransform(root, segment) {
    root.position = vectorFromArray(segment.position, [0, 0, 0]);
    var rotation = segment.rotation || [0, 0, 0];
    root.rotation = new BABYLON.Vector3(
      (Number(rotation[0]) || 0) * Math.PI / 180,
      (Number(rotation[1]) || 0) * Math.PI / 180,
      (Number(rotation[2]) || 0) * Math.PI / 180
    );
    var scale = Number(segment.scale) || 1;
    root.scaling = new BABYLON.Vector3(scale, scale, scale);
  }

  function createPiecePivotMarker(segment, baseRoot, pivotNode) {
    var marker = BABYLON.MeshBuilder.CreateSphere('piecePivotMarker-' + segment.id, {diameter: 1.2, segments: 12}, pieceScene);
    marker.parent = baseRoot;
    marker.position = vectorFromArray(segment.pivot, [0, 0, 0]);
    marker.metadata = {stblockPieceSegmentId: segment.id, stblockPivotMarker: true};
    var mat = pieceScene.getMaterialByName('piecePivotMarkerMat') || new BABYLON.StandardMaterial('piecePivotMarkerMat', pieceScene);
    mat.diffuseColor = new BABYLON.Color3(1, 0.08, 0.08);
    mat.emissiveColor = new BABYLON.Color3(0.6, 0, 0);
    marker.material = mat;

    var axis = vectorFromArray(segment.axis, [1, 0, 0]);
    if (axis.length && axis.length() > 0.0001) axis.normalize();
    var line = BABYLON.MeshBuilder.CreateLines('piecePivotAxis-' + segment.id, {
      points: [marker.position, marker.position.add(axis.scale(5))]
    }, pieceScene);
    line.parent = baseRoot;
    line.color = new BABYLON.Color3(1, 0.15, 0.15);
    line.metadata = {stblockPieceSegmentId: segment.id, stblockPivotMarker: true};
  }

  function stylePieceMesh(mesh, segment) {
    var baseRoot = new BABYLON.TransformNode('pieceRoot-' + segment.id, pieceScene);
    baseRoot.metadata = {stblockPieceSegmentId: segment.id};
    applySegmentBaseTransform(baseRoot, segment);

    var pivotNode = new BABYLON.TransformNode('piecePivot-' + segment.id, pieceScene);
    pivotNode.parent = baseRoot;
    pivotNode.position = vectorFromArray(segment.pivot, [0, 0, 0]);
    pivotNode.metadata = {stblockPieceSegmentId: segment.id, stblockPivotNode: true};

    mesh.metadata = mesh.metadata || {};
    mesh.metadata.stblockPieceSegmentId = segment.id;
    mesh.parent = pivotNode;
    mesh.position = vectorFromArray(segment.pivot, [0, 0, 0]).scale(-1);

    var mat = new BABYLON.StandardMaterial('pieceMat-' + segment.id, pieceScene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(segment.color || '#2f8cff');
    mat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    applyMaterialToMeshTree(mesh, mat);

    createPiecePivotMarker(segment, baseRoot, pivotNode);
    pieceMeshes[segment.id] = baseRoot;
    applyPieceTestTransform(segment, baseRoot, pieceTestValue);
    updateSegmentMeasurement(segment, baseRoot);
  }

  function importSegmentModel(segment, renderToken) {
    if (!segment.modelURL || !pieceScene) return;
    var url = segment.modelURL;
    var slash = url.lastIndexOf('/');
    var root = slash >= 0 ? url.slice(0, slash + 1) : '';
    var file = slash >= 0 ? url.slice(slash + 1) : url;
    BABYLON.SceneLoader.ImportMesh('', root, file, pieceScene, function(meshes) {
      if (renderToken !== pieceRenderToken) {
        meshes.forEach(function(mesh) { if (mesh && mesh.dispose) mesh.dispose(); });
        return;
      }
      var rootMesh = new BABYLON.TransformNode('pieceModelRoot-' + segment.id, pieceScene);
      rootMesh.metadata = {stblockPieceSegmentId: segment.id};
      meshes.forEach(function(mesh) {
        mesh.parent = rootMesh;
        mesh.metadata = {stblockPieceSegmentId: segment.id};
      });
      stylePieceMesh(rootMesh, segment);
    }, null, function() {
      if (renderToken === pieceRenderToken) toast('No se pudo previsualizar el modelo: ' + (segment.modelName || segment.id));
    });
  }

  function renderPiece3D() {
    if (!pieceScene) return;
    pieceRenderToken++;
    var renderToken = pieceRenderToken;
    clearPieceMeshes();
    (pieceState.segments || []).forEach(function(segment) {
      if (segment.modelURL) {
        importSegmentModel(segment, renderToken);
      } else {
        stylePieceMesh(createSegmentPlaceholder(segment), segment);
      }
    });
  }

  function applyPieceTestTransform(segment, mesh, rawValue) {
    if (!mesh || !segment || segment.role === 'fixed' || segment.role === 'free') return;
    var limits = segment.limits || [0, 180];
    var min = Number(limits[0]) || 0;
    var max = Number(limits[1]);
    if (!isFinite(max)) max = segment.role === 'linear' ? 5 : 180;
    var t = clamp(Number(rawValue) || 0, 0, 180) / 180;
    var value = min + ((max - min) * t);
    var axis = vectorFromArray(segment.axis, [1, 0, 0]);
    if (axis.length && axis.length() > 0.0001) axis.normalize();
    if (segment.role === 'linear') {
      mesh.position = vectorFromArray(segment.position, [0, 0, 0]).add(axis.scale(value));
      return;
    }
    var pivotNode = pieceScene.getTransformNodeByName('piecePivot-' + segment.id);
    if (!pivotNode) return;
    pivotNode.rotation = BABYLON.Vector3.Zero();
    var radians = value * Math.PI / 180;
    pivotNode.rotate(axis, radians, BABYLON.Space.LOCAL);
  }

  function updatePieceTest(value) {
    pieceTestValue = Number(value);
    if ($('pieceTestValue')) $('pieceTestValue').value = String(pieceTestValue);
    (pieceState.segments || []).forEach(function(segment) {
      var mesh = pieceMeshes[segment.id];
      if (mesh) applyPieceTestTransform(segment, mesh, pieceTestValue);
    });
  }

  async function loadModelForSelectedPieceSegment(file) {
    var segment = selectedPieceSegment();
    if (!segment) {
      addPieceSegment('fixed');
      segment = selectedPieceSegment();
    }
    var asset = await uploadAsset(file);
    segment.modelURL = asset.url;
    segment.modelName = file.name;
    segment.modelAsset = {filename: asset.filename, url: asset.url, originalName: file.name};
    selectPieceSegment(segment.id);
    renderPiece3D();
    toast('Modelo cargado en subpieza: ' + file.name);
  }

  function getStoredPiecePresets() {
    try {
      var presets = JSON.parse(localStorage.getItem('stblock_piece_presets') || '[]');
      return Array.isArray(presets) ? presets : [];
    } catch (error) {
      return [];
    }
  }

  function storePiecePreset(preset) {
    var presets = getStoredPiecePresets().filter(function(item) { return item.id !== preset.id; });
    presets.push(JSON.parse(JSON.stringify(preset)));
    localStorage.setItem('stblock_piece_presets', JSON.stringify(presets));
    return presets;
  }

  function savePiecePreset() {
    syncPieceStateFromForm();
    if (selectedPieceSegmentId) syncPieceSegmentFromForm();
    storePiecePreset(pieceState);
    renderSavedPiecePresets();
    renderCustomRobotPieces();
    toast('Preset guardado localmente: ' + pieceState.name);
  }

  function currentPiecePresetJson() {
    syncPieceStateFromForm();
    if (selectedPieceSegmentId) syncPieceSegmentFromForm();
    return JSON.stringify(pieceState, null, 2);
  }

  async function exportPiecePreset() {
    var json = currentPiecePresetJson();
    var filename = (pieceState.id || 'pieza') + '.piece.json';
    
    if (window.__TAURI__) {
      try {
        var dialog = window.__TAURI__.dialog;
        var core = window.__TAURI__.core;
        if (dialog && dialog.save && core && core.invoke) {
          var filePath = await dialog.save({
            defaultPath: filename,
            filters: [{ name: 'JSON', extensions: ['json'] }]
          });
          if (filePath) {
            var bytes = Array.from(new TextEncoder().encode(json));
            await core.invoke('save_file', { path: filePath, content: bytes });
            toast('Preset guardado: ' + filename);
          }
          return;
        }
      } catch (e) {
        console.warn('[STBLOCK-PIECES] Error usando Tauri dialog/core:', e);
      }
    }

    if (window.showSaveFilePicker) {
      try {
        var handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Preset de pieza STBlock',
            accept: {'application/json': ['.json']}
          }]
        });
        var writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        toast('JSON guardado: ' + filename);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          toast('Exportacion cancelada');
          return;
        }
        console.warn('[STBLOCK-PIECES] No se pudo usar selector de ruta, usando descarga normal', error);
      }
    }
    var objectUrl = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
    var link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(objectUrl); }, 1000);
    toast('Selector de ruta no disponible. JSON descargado: ' + filename);
  }

  async function copyPiecePresetJson() {
    var json = currentPiecePresetJson();
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard no disponible');
      await navigator.clipboard.writeText(json);
      toast('JSON copiado al portapapeles');
    } catch (error) {
      console.log('[STBLOCK-PIECES] JSON de pieza:', json);
      toast('No se pudo copiar. JSON impreso en consola.');
    }
  }

  function removeStoredPiecePreset(id) {
    var presets = getStoredPiecePresets().filter(function(item) { return item.id !== id; });
    localStorage.setItem('stblock_piece_presets', JSON.stringify(presets));
    renderSavedPiecePresets();
    renderCustomRobotPieces();
  }

  function loadStoredPiecePreset(id) {
    var preset = getStoredPiecePresets().find(function(item) { return item.id === id; });
    if (!preset) return;
    pieceState = JSON.parse(JSON.stringify(preset));
    selectedPieceSegmentId = ((pieceState.segments || [])[0] || {}).id || null;
    loadPieceForm();
    renderPiece3D();
    toast('Preset cargado: ' + pieceState.name);
  }

  function renderSavedPiecePresets() {
    var list = $('savedPiecePresets');
    if (!list) return;
    list.innerHTML = '';
    var presets = getStoredPiecePresets();
    if (!presets.length) {
      var empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Todavia no hay presets guardados.';
      list.appendChild(empty);
      return;
    }
    presets.forEach(function(preset) {
      var row = document.createElement('div');
      row.className = 'saved-map';
      var load = document.createElement('button');
      load.textContent = preset.name || preset.id;
      load.onclick = function() { loadStoredPiecePreset(preset.id); };
      var remove = document.createElement('button');
      remove.textContent = 'X';
      remove.className = 'danger';
      remove.title = 'Eliminar preset';
      remove.onclick = function(event) {
        event.stopPropagation();
        removeStoredPiecePreset(preset.id);
        toast('Preset eliminado');
      };
      row.appendChild(load);
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  function getInstalledPiecePreset(id) {
    var preset = installedPiecePresets.find(function(item) { return item.id === id; });
    return preset ? JSON.parse(JSON.stringify(preset)) : null;
  }

  function getAvailablePiecePresets() {
    var byId = {};
    getStoredPiecePresets().forEach(function(preset) {
      if (preset && preset.id) byId[preset.id] = JSON.parse(JSON.stringify(preset));
    });
    return Object.keys(byId).map(function(id) { return byId[id]; });
  }

  function renderCustomRobotPieces() {
    var list = $('customRobotPieces');
    if (!list) return;
    list.innerHTML = '';
    var presets = getAvailablePiecePresets();
    if (!presets.length) {
      var empty = document.createElement('div');
      empty.className = 'hint';
      empty.style.gridColumn = '1 / -1';
      empty.textContent = 'Crea presets en la pestaña Piezas.';
      list.appendChild(empty);
      return;
    }
    presets.forEach(function(preset) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.name || preset.id || 'Pieza personalizada';
      button.title = (preset.category || 'custom') + ' · ' + (preset.type || 'custom');
      button.onclick = function() { addRobotPartFromPiecePreset(preset); };
      list.appendChild(button);
    });
  }

  function presetToRobotComponentType(preset) {
    if (!preset) return 'CustomPiecePreset';
    if (preset.type === 'rotary-servo') return 'CustomServoActuator';
    if (preset.type === 'continuous-motor') return 'CustomMotorActuator';
    if (preset.type === 'linear-actuator' || preset.type === 'solenoid') return 'CustomLinearActuator';
    return 'CustomPiecePreset';
  }

  function inferInstalledPiecePresetIdFromPart(part) {
    if (!part) return null;
    var explicit = part.customPresetId || (part.options && part.options.customPresetId) || null;
    if (explicit) return explicit;
    var text = String((part.name || '') + ' ' + (part.id || '')).toLowerCase();
    if (part.type === 'SwivelActuator' || text.indexOf('servo rotaci') !== -1) return 'servo-sg90-360';
    if (part.type === 'ArmActuator' || text.indexOf('servo bisagra') !== -1) return 'servo-sg90';
    if (text.indexOf('sg90') !== -1 && (text.indexOf('360') !== -1 || text.indexOf('continuo') !== -1)) return 'servo-sg90-360';
    if (text.indexOf('sg90') !== -1) return 'servo-sg90';
    return null;
  }

  function isCustomPresetRobotPart(part) {
    return !!(part && (part.customPreset || part.customPresetId || inferInstalledPiecePresetIdFromPart(part) || (part.options && part.options.customPreset) || part.type === 'CustomServoActuator' || part.type === 'CustomMotorActuator' || part.type === 'CustomLinearActuator' || part.type === 'CustomPiecePreset'));
  }

  function normalizeCustomPresetRobotPart(part) {
    if (!isCustomPresetRobotPart(part)) return;
    if (!part.options) part.options = {};
    var inferredPresetId = inferInstalledPiecePresetIdFromPart(part);
    var preset = part.customPreset || part.options.customPreset || getInstalledPiecePreset(part.customPresetId) || getInstalledPiecePreset(inferredPresetId);
    if (preset) {
      var clone = JSON.parse(JSON.stringify(preset));
      part.customPreset = clone;
      part.customPresetId = clone.id || part.customPresetId || inferredPresetId;
      part.options.customPreset = clone;
      part.options.customPresetId = part.customPresetId;
      if (!part.name || /^Pieza personalizada$/i.test(part.name) || part.name === 'Servo Bisagra' || part.name === 'Servo Rotación') part.name = clone.name || part.name;
      part.type = presetToRobotComponentType(clone);
      if (clone.controls) {
        if (typeof part.options.minAngle === 'undefined') part.options.minAngle = clone.controls.min || 0;
        if (typeof part.options.maxAngle === 'undefined') part.options.maxAngle = clone.controls.max || 180;
      }
      console.log('[STBlock AdminPreset] normalizado', {id: part.id, name: part.name, type: part.type, presetId: part.customPresetId});
    }
  }

  function normalizeCustomPresetRobotParts() {
    (robotState.components || []).forEach(normalizeCustomPresetRobotPart);
  }

  function addRobotPartFromPiecePreset(preset) {
    if (!preset) return;
    var clone = JSON.parse(JSON.stringify(preset));
    var id = 'part-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var componentType = presetToRobotComponentType(clone);
    var part = {
      id: id,
      name: clone.name || 'Pieza personalizada',
      type: componentType,
      customPresetId: clone.id,
      customPreset: clone,
      port: '',
      parentId: 'chassis',
      position: [0, robotState.chassis.size[2] / 2 + 2, 0],
      rotation: [0, 0, 0],
      options: {
        customPreset: clone,
        minAngle: (clone.controls && clone.controls.min) || 0,
        maxAngle: (clone.controls && clone.controls.max) || 180,
        speed: 90,
        maxForce: 150,
        models: []
      },
      connections: {}
    };
    if (clone.category === 'structure' || clone.type === 'free-physics' || componentType === 'CustomPiecePreset') {
      part.mechanicalOnly = clone.category === 'structure' || clone.type === 'free-physics';
    }
    if (!part.mechanicalOnly) {
      getRobotBoards().forEach(function(boardId) { ensurePartConnection(part, boardId); });
      applyPartConnectionToLegacy(part, robotState.boardType || getRobotBoards()[0]);
    }
    robotState.components.push(part);
    selectedRobotPartId = id;
    renderRobotPartsList();
    selectRobotPart(id);
    renderRobot3D();
    toast('Pieza agregada: ' + part.name);
  }

  function initPieceBuilder() {
    if (!$('switchToParts')) return;

    ['pieceNameInput', 'pieceIdInput', 'pieceCategoryInput', 'pieceTypeInput', 'pieceDescriptionInput'].forEach(function(id) {
      var element = $(id);
      if (element) element.addEventListener('change', syncPieceStateFromForm);
    });

    ['segmentNameInput', 'segmentRoleInput', 'segmentParentInput', 'segmentX', 'segmentY', 'segmentZ',
      'segmentRX', 'segmentRY', 'segmentRZ', 'segmentScale', 'segmentAxisX', 'segmentAxisY', 'segmentAxisZ',
      'segmentPivotX', 'segmentPivotY', 'segmentPivotZ', 'segmentMin', 'segmentMax', 'segmentSpeed',
      'segmentMass', 'segmentFriction', 'segmentColor', 'segmentCollider'].forEach(function(id) {
      var element = $(id);
      if (!element) return;
      element.addEventListener('change', function() {
        syncPieceSegmentFromForm();
        renderPiece3D();
      });
    });

    document.querySelectorAll('[data-add-piece-segment]').forEach(function(button) {
      button.onclick = function() { addPieceSegment(button.dataset.addPieceSegment); };
    });

    if ($('measurePieceSegment')) $('measurePieceSegment').onclick = measureSelectedPieceSegment;
    if ($('centerPiecePivot')) $('centerPiecePivot').onclick = centerSelectedPiecePivotToModel;
    $('btnLoadPieceSegmentModel').onclick = function() { $('pieceSegmentModelFile').click(); };
    $('pieceSegmentModelFile').onchange = async function() {
      var file = $('pieceSegmentModelFile').files[0];
      if (!file) return;
      try {
        await loadModelForSelectedPieceSegment(file);
      } catch (error) {
        console.error('[STBLOCK-PIECE] No se pudo cargar modelo', error);
        toast('No se pudo cargar modelo: ' + error.message);
      } finally {
        $('pieceSegmentModelFile').value = '';
      }
    };

    $('deletePieceSegment').onclick = function() { removePieceSegment(selectedPieceSegmentId); };
    $('duplicatePieceSegment').onclick = duplicatePieceSegment;
    $('newPiece').onclick = function() {
      pieceState = createDefaultPieceState();
      selectedPieceSegmentId = null;
      loadPieceForm();
      renderPiece3D();
      toast('Nueva pieza creada');
    };
    $('savePiece').onclick = savePiecePreset;
    $('exportPiece').onclick = exportPiecePreset;
    if ($('copyPieceJson')) $('copyPieceJson').onclick = copyPiecePresetJson;
    $('testPiece').onclick = function() { updatePieceTest(90); toast('Prueba aplicada en visor'); };
    $('pieceTestValue').addEventListener('input', function() { updatePieceTest($('pieceTestValue').value); });
    $('pieceTestMin').onclick = function() { updatePieceTest(0); };
    $('pieceTestMax').onclick = function() { updatePieceTest(180); };
    $('pieceTestReset').onclick = function() { updatePieceTest(90); };

    if ($('refreshPiecePresets')) $('refreshPiecePresets').onclick = renderSavedPiecePresets;
    $('importPiece').onclick = function() { $('pieceJsonFile').click(); };
    $('pieceJsonFile').onchange = function() {
      var file = $('pieceJsonFile').files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() {
        try {
          var data = JSON.parse(reader.result);
          if (!data.segments || !Array.isArray(data.segments)) throw new Error('Formato de pieza no compatible');
          pieceState = data;
          selectedPieceSegmentId = ((pieceState.segments || [])[0] || {}).id || null;
          loadPieceForm();
          renderPiece3D();
          storePiecePreset(pieceState);
          renderSavedPiecePresets();
          renderCustomRobotPieces();
          toast('Preset de pieza importado');
        } catch (error) {
          toast(error.message);
        }
      };
      reader.readAsText(file);
    };

    loadPieceForm();
    renderSavedPiecePresets();
  }

  // --- Robot Editor Functions ---
  function createDefaultRobotState() {
    return {
      id: "nuevo-robot",
      name: "Nuevo Robot",
      boardType: "stbBoardV2",
      boardTypes: ["stbBoardV2"],
      chassisType: "box",
      chassis: {
        size: [15, 20, 8],
        yOffset: 0,
        mass: 120,
        friction: 0.5,
        color: "#f09c0d",
        modelURL: "",
        modelScale: 1.0,
        driftEnabled: false,
        driftLeft: 10
      },
      wheels: [
        { id: "wheel-left", port: "A1", radius: 4.0, width: 2.0, position: [-8, 0, 4] },
        { id: "wheel-right", port: "A2", radius: 4.0, width: 2.0, position: [8, 0, 4] }
      ],
      components: [],
      mechanicalJoints: []
    };
  }

  function initRobotEditor() {
    $('switchToMaps').onclick = function () {
      activeMode = 'maps';
      $('switchToMaps').className = 'primary';
      $('switchToRobots').className = 'ghost';
      if ($('switchToParts')) $('switchToParts').className = 'ghost';
      if ($('switchToEvaluaciones')) $('switchToEvaluaciones').className = 'ghost';
      $('mapWorkspace').style.display = 'grid';
      $('robotWorkspace').style.display = 'none';
      if ($('pieceWorkspace')) $('pieceWorkspace').style.display = 'none';
      if ($('evaluacionesWorkspace')) $('evaluacionesWorkspace').style.display = 'none';
      $('mapActions').style.display = 'flex';
      $('robotActions').style.display = 'none';
      if ($('pieceActions')) $('pieceActions').style.display = 'none';
      if ($('evaluacionesActions')) $('evaluacionesActions').style.display = 'none';
      resizeCanvas();
    };

    $('switchToRobots').onclick = function () {
      console.log("[STBLOCK-DEBUG] Tab Switch to Robots clicked");
      activeMode = 'robots';
      $('switchToMaps').className = 'ghost';
      $('switchToRobots').className = 'primary';
      if ($('switchToParts')) $('switchToParts').className = 'ghost';
      if ($('switchToEvaluaciones')) $('switchToEvaluaciones').className = 'ghost';
      $('mapWorkspace').style.display = 'none';
      $('robotWorkspace').style.display = 'grid';
      if ($('pieceWorkspace')) $('pieceWorkspace').style.display = 'none';
      if ($('evaluacionesWorkspace')) $('evaluacionesWorkspace').style.display = 'none';
      $('mapActions').style.display = 'none';
      $('robotActions').style.display = 'flex';
      if ($('pieceActions')) $('pieceActions').style.display = 'none';
      if ($('evaluacionesActions')) $('evaluacionesActions').style.display = 'none';

      console.log("[STBLOCK-DEBUG] robotCanvas client dimensions before defer:", robotCanvas.clientWidth, "x", robotCanvas.clientHeight);

      // Defer initialization by 50ms to allow grid layout to complete and give canvas non-zero dimensions
      setTimeout(function () {
        console.log("[STBLOCK-DEBUG] Deferred init running. robotCanvas dimensions:", robotCanvas.clientWidth, "x", robotCanvas.clientHeight);
        if (!robotEngine) {
          initRobot3DScene();
        } else {
          robotEngine.resize();
        }
        renderRobot3D();
      }, 50);
    };

    if ($('switchToParts')) {
      $('switchToParts').onclick = function () {
        activeMode = 'parts';
        $('switchToMaps').className = 'ghost';
        $('switchToRobots').className = 'ghost';
        $('switchToParts').className = 'primary';
        if ($('switchToEvaluaciones')) $('switchToEvaluaciones').className = 'ghost';
        $('mapWorkspace').style.display = 'none';
        $('robotWorkspace').style.display = 'none';
        $('pieceWorkspace').style.display = 'grid';
        if ($('evaluacionesWorkspace')) $('evaluacionesWorkspace').style.display = 'none';
        $('mapActions').style.display = 'none';
        $('robotActions').style.display = 'none';
        $('pieceActions').style.display = 'flex';
        if ($('evaluacionesActions')) $('evaluacionesActions').style.display = 'none';
        setTimeout(function () {
          if (!pieceEngine) initPiece3DScene();
          if (pieceEngine) pieceEngine.resize();
          renderPiece3D();
        }, 50);
      };
    }

    // --- EVALUACIONES TAB ---
    if ($('switchToEvaluaciones')) {
      $('switchToEvaluaciones').onclick = function () {
        activeMode = 'evaluaciones';
        $('switchToMaps').className = 'ghost';
        $('switchToRobots').className = 'ghost';
        if ($('switchToParts')) $('switchToParts').className = 'ghost';
        $('switchToEvaluaciones').className = 'primary';
        $('mapWorkspace').style.display = 'none';
        $('robotWorkspace').style.display = 'none';
        if ($('pieceWorkspace')) $('pieceWorkspace').style.display = 'none';
        $('evaluacionesWorkspace').style.display = 'grid';
        $('mapActions').style.display = 'none';
        $('robotActions').style.display = 'none';
        if ($('pieceActions')) $('pieceActions').style.display = 'none';
        $('evaluacionesActions').style.display = 'flex';

        // Initialize evaluaciones editor if needed
        setTimeout(function() {
          initEvaluacionesEditor();
          refreshEvaluaciones();
        }, 50);
      };
    }

    // Chassis bindings
    ['chassisW', 'chassisD', 'chassisH', 'chassisYOffset', 'chassisMass', 'chassisFriction', 'chassisColor', 'robotChassisType', 'chassisDriftEnabled', 'chassisDriftLeft'].forEach(function(id) {
      if ($(id)) {
        $(id).addEventListener('change', function() {
          syncRobotStateFromForm();
          renderRobot3D();
        });
      }
    });

    if ($('chassisDriftLeft')) {
      $('chassisDriftLeft').addEventListener('input', function() {
        $('chassisDriftValue').textContent = $('chassisDriftLeft').value + '%';
        syncRobotStateFromForm();
      });
    }

    $('robotChassisType').addEventListener('change', function() {
      var type = $('robotChassisType').value;
      $('customChassisUploadSection').hidden = (type !== 'custom');
      syncRobotStateFromForm();
      renderRobot3D();
    });

    $('robotBoardType').addEventListener('change', function() {
      if (selectedRobotPartId) syncRobotPartFromForm(activePartConnectionBoard);
      syncRobotStateFromForm();
      ensureRobotCompatibilityState();
      if (selectedRobotPartId) {
        selectRobotPart(selectedRobotPartId);
      }
      renderRobot3D();
    });

    $('btnLoadChassisModel').onclick = function () { $('chassisModelFile').click(); };

    $('chassisModelFile').onchange = async function () {
      var file = $('chassisModelFile').files[0];
      if (!file) return;
      try {
        var extension = (file.name.split('.').pop() || '').toLowerCase();
        var asset = await uploadAsset(file);
        robotState.chassisType = 'custom';
        $('robotChassisType').value = 'custom';
        $('customChassisUploadSection').hidden = false;
        robotState.chassis.modelURL = asset.url;
        robotState.chassis.modelName = file.name;
        robotState.chassis.modelUnit = extension === 'stl' ? 'mm' :
          extension === 'glb' || extension === 'gltf' ? 'm' : 'cm';
        robotState.chassis.modelScale = robotState.chassis.modelUnit === 'mm' ? 0.1 :
          robotState.chassis.modelUnit === 'm' ? 100 : 1;
        toast('Chasis 3D cargado: ' + file.name);
        renderRobot3D();
      } catch (e) {
        console.error('[STBLOCK-ROBOT] No se pudo cargar el chasis 3D', e);
        toast('No se pudo cargar el chasis 3D: ' + e.message);
      } finally {
        $('chassisModelFile').value = '';
      }
    };

    // Tab bindings
    $('btnTabChassis').onclick = function () {
      $('btnTabChassis').classList.add('active');
      $('btnTabPart').classList.remove('active');
      $('panel-r-chassis').classList.add('active');
      $('panel-r-part').classList.remove('active');
    };

    $('btnTabPart').onclick = function () {
      $('btnTabChassis').classList.remove('active');
      $('btnTabPart').classList.add('active');
      $('panel-r-chassis').classList.remove('active');
      $('panel-r-part').classList.add('active');
    };

    // Component bindings
    document.querySelectorAll('[data-add-part]').forEach(function (button) {
      button.onclick = function () {
        addRobotPart(button.dataset.addPart);
      };
    });
    document.querySelectorAll('[data-add-installed-piece]').forEach(function (button) {
      button.onclick = function () {
        var preset = getInstalledPiecePreset(button.dataset.addInstalledPiece);
        if (!preset) {
          toast('Pieza instalada no encontrada');
          return;
        }
        addRobotPartFromPiecePreset(preset);
      };
    });

    if ($('refreshCustomRobotPieces')) {
      $('refreshCustomRobotPieces').onclick = renderCustomRobotPieces;
    }
    renderCustomRobotPieces();

    // Property inspector bindings
    ['partNameInput', 'partPortSelect', 'partParentSelect', 'partX', 'partY', 'partZ', 'partRX', 'partRY', 'partRZ',
     'partServoMin', 'partServoMax', 'partServoSpeed', 'partServoForce',
     'partWheelRadius', 'partWheelWidth',
     'partStructW', 'partStructH', 'partStructD', 'partStructDiameter', 'partStructRoundH', 'partStructMass', 'partStructFriction', 'partStructColor', 'partAttachMode',
     'partJointEnabled', 'partJointType', 'partJointTarget', 'partJointAX', 'partJointAY', 'partJointAZ', 'partJointBX', 'partJointBY', 'partJointBZ', 'partJointAxisX', 'partJointAxisY', 'partJointAxisZ',
     'partArduinoDir1', 'partArduinoDir2', 'partArduinoPWM',
     'partDefaultActive', 'partExclusionGroup'].forEach(function(id) {
      var element = $(id);
      if (element) {
        element.addEventListener('change', function() {
          syncRobotPartFromForm();
          renderRobot3D();
        });
      }
    });

    if ($('partConnectionBoard')) {
      $('partConnectionBoard').addEventListener('change', function() {
        syncRobotPartFromForm(activePartConnectionBoard);
        activePartConnectionBoard = $('partConnectionBoard').value || robotState.boardType;
        selectRobotPart(selectedRobotPartId);
      });
    }

    $('btnAddMeshToPart').onclick = function () { $('partModelFile').click(); };

    $('partModelFile').onchange = async function () {
      var file = $('partModelFile').files[0];
      if (!file) return;
      try {
        var asset = await uploadAsset(file);
        var part = selectedRobotPart();
        if (part) {
          if (!part.options) part.options = {};
          if (!part.options.models) part.options.models = [];
          part.options.models.push({
            name: file.name,
            url: asset.url,
            scale: 1.0
          });
          toast('Modelo 3D añadido');
          renderPartMeshSetList();
          renderRobot3D();
        }
      } catch (e) { toast(e.message); }
    };

    $('deleteRobotPartBtn').onclick = function () {
      removeRobotPart(selectedRobotPartId);
    };

    $('duplicateRobotPart').onclick = function () {
      var part = selectedRobotPart();
      if (!part) return;
      var copy = JSON.parse(JSON.stringify(part));
      copy.id = 'part-' + Date.now();
      copy.name += ' copia';
      copy.position[0] += 2; // offset
      robotState.components.push(copy);
      selectedRobotPartId = copy.id;
      renderRobotPartsList();
      selectRobotPart(copy.id);
      renderRobot3D();
    };

    $('newRobot').onclick = function () {
      robotState = createDefaultRobotState();
      selectedRobotPartId = null;
      loadRobotForm();
      if (robotScene) renderRobot3D();
      toast('Nuevo robot creado');
    };

    $('saveRobot').onclick = function () {
      saveAdminRobot().catch(function (error) { toast(error.message); });
    };

    $('testRobot').onclick = async function () {
      var testWindow = createGearbotTestWindow('stblock-robot-test');
      try {
        toast('Preparando simulador...');
        var saved = await saveAdminRobot();
        var robotUrl = gearbotEntityUrl('robot', robotState.id, saved) + '?v=' + Date.now();
        var url = appendGearbotReturnParams('../index.html?stblockWebGL=1-v11&robotJSON=' + encodeURIComponent(robotUrl), 'robots', robotState.id);
        openGearbotTest(url, 'stblock-robot-test', testWindow);
      } catch (error) {
        if (testWindow && !testWindow.closed) testWindow.close();
        console.error('[STBLOCK-GEARBOT] No se pudo probar el robot', error);
        toast('No se pudo abrir el simulador: ' + error.message);
      }
    };

    $('importRobot').onclick = function () { $('robotJsonFile').click(); };
    $('robotJsonFile').onchange = function () {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data.chassis) throw new Error('Formato de robot no compatible');
          robotState = data;
          loadRobotForm();
          renderRobot3D();
          toast('Robot importado');
        } catch (error) { toast(error.message); }
      };
      reader.readAsText($('robotJsonFile').files[0]);
    };

    $('exportRobot').onclick = function () {
      if (selectedRobotPartId) syncRobotPartFromForm(activePartConnectionBoard);
      syncRobotStateFromForm();
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(robotState, null, 2)], {type: 'application/json'}));
      link.download = robotState.id + '.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    $('refreshAdminRobots').onclick = refreshAdminRobots;

    // Vincular botones de robots personalizados (localStorage)
    if ($('refreshCustomRobots')) {
      $('refreshCustomRobots').onclick = refreshCustomRobots;
    }
    if ($('syncToCustom')) {
      $('syncToCustom').onclick = syncRobotToCustomStorage;
    }

    initPieceBuilder();
    loadRobotForm();
    refreshAdminRobots().catch(function () {});
    refreshCustomRobots(); // Cargar robots personalizados
  }

  function bindRobotDragHandlers() {
    if (!robotCanvas || robotCanvas.dataset.dragHandlersBound === 'yes') return;
    robotCanvas.dataset.dragHandlersBound = 'yes';

    robotCanvas.addEventListener('pointerdown', function(event) {
      if (activeMode !== 'robots' || !robotScene || event.button !== 0) return;
      var hit = pickRobotPart(event);
      if (!hit || !hit.part) return;
      event.preventDefault();
      event.stopPropagation();
      selectRobotPart(hit.part.id);
      startRobotPartDrag(hit.part, event);
    });

    robotCanvas.addEventListener('pointermove', function(event) {
      if (!robotDraggingPart) return;
      event.preventDefault();
      event.stopPropagation();
      moveRobotPartDrag(event);
    });

    window.addEventListener('pointerup', function() {
      stopRobotPartDrag();
    });
  }

  function robotPartFromMesh(mesh) {
    var current = mesh;
    while (current) {
      if (current.metadata && current.metadata.stblockPartId) {
        var id = current.metadata.stblockPartId;
        return (robotState.wheels || []).concat(robotState.components || []).find(function(part) {
          return part.id === id;
        }) || null;
      }
      current = current.parent;
    }
    return null;
  }

  function pickRobotPart(event) {
    var rect = robotCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var pick = robotScene.pick(x, y, function(mesh) {
      return mesh && mesh.name !== 'grid' && !!robotPartFromMesh(mesh);
    });
    if (!pick || !pick.hit || !pick.pickedMesh) return null;
    var part = robotPartFromMesh(pick.pickedMesh);
    return part ? {part: part, point: pick.pickedPoint} : null;
  }

  function pointerToRobotPlane(event, planeY) {
    var rect = robotCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var ray = robotScene.createPickingRay(x, y, BABYLON.Matrix.Identity(), robotCamera);
    var plane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, planeY, 0), BABYLON.Axis.Y);
    var distance = ray.intersectsPlane(plane);
    if (distance == null) return null;
    return ray.origin.add(ray.direction.scale(distance));
  }

  function startRobotPartDrag(part, event) {
    if (!part || !part.position) return;
    robotDragPartId = part.id;
    robotDragPlaneY = Number(part.position[1]) || 0;
    var point = pointerToRobotPlane(event, robotDragPlaneY);
    if (!point) return;
    robotDragOffset = new BABYLON.Vector3(part.position[0] - point.x, 0, part.position[2] - point.z);
    robotDraggingPart = true;
    if (robotCamera) robotCamera.detachControl(robotCanvas);
    robotCanvas.style.cursor = 'grabbing';
  }

  function moveRobotPartDrag(event) {
    var part = selectedRobotPart();
    if (!part || part.id !== robotDragPartId || !robotDragOffset) return;
    var point = pointerToRobotPlane(event, robotDragPlaneY);
    if (!point) return;
    part.position[0] = Number((point.x + robotDragOffset.x).toFixed(2));
    part.position[2] = Number((point.z + robotDragOffset.z).toFixed(2));
    updateRobotPartPositionUI(part);
    updateRobotPartMeshPosition(part);
  }

  function stopRobotPartDrag() {
    if (!robotDraggingPart) return;
    robotDraggingPart = false;
    robotDragPartId = null;
    robotDragOffset = null;
    robotCanvas.style.cursor = 'default';
    if (robotCamera) robotCamera.attachControl(robotCanvas, true);
    renderRobotPartsList();
  }

  function updateRobotPartPositionUI(part) {
    if (!part || part.id !== selectedRobotPartId) return;
    if ($('partX')) $('partX').value = part.position[0];
    if ($('partY')) $('partY').value = part.position[1];
    if ($('partZ')) $('partZ').value = part.position[2];
  }

  function updateRobotPartMeshPosition(part) {
    if (!robotScene || !part) return;
    var isBaseWheel = part.id && part.id.indexOf('wheel-') === 0;
    var pivot = robotScene.getTransformNodeByName('pivot-' + part.id);
    if (pivot) {
      pivot.position.x = part.position[0];
      pivot.position.y = part.position[1];
      pivot.position.z = part.position[2];
      return;
    }
    var mesh = robotMeshes[part.id];
    if (!mesh) return;
    mesh.position.x = part.position[0];
    mesh.position.z = part.position[2];
    if (isBaseWheel) {
      mesh.position.y = part.position[1] + (part.radius || 0);
    } else {
      mesh.position.y = part.position[1];
    }
  }

  function initRobot3DScene() {
    console.log("[STBLOCK-DEBUG] initRobot3DScene starting. Canvas size:", robotCanvas.clientWidth, "x", robotCanvas.clientHeight);

    robotCanvas.addEventListener("webglcontextlost", function(event) {
      console.error("[STBLOCK-DEBUG] WebGL context lost event fired on robotCanvas!", event);
    }, false);
    robotCanvas.addEventListener("webglcontextrestored", function(event) {
      console.log("[STBLOCK-DEBUG] WebGL context restored on robotCanvas!", event);
    }, false);

    try {
      robotEngine = new BABYLON.Engine(robotCanvas, true, {
        disableWebGL2Support: true
      });
      console.log("[STBLOCK-DEBUG] BABYLON.Engine created successfully");
    } catch (e) {
      console.error("[STBLOCK-DEBUG] Failed to create BABYLON.Engine:", e);
    }
    robotScene = new BABYLON.Scene(robotEngine);
    robotScene.clearColor = new BABYLON.Color4(0.05, 0.08, 0.15, 1);

    robotCamera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 3, 35, BABYLON.Vector3.Zero(), robotScene);
    robotCamera.attachControl(robotCanvas, true);
    bindRobotDragHandlers();

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), robotScene);
    light.intensity = 0.75;
    var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 0.5), robotScene);
    dirLight.intensity = 0.45;

    // Draw grid plane
    var grid = BABYLON.MeshBuilder.CreateGround("grid", {width: 100, height: 100, subdivisions: 20}, robotScene);
    var gridMat = new BABYLON.StandardMaterial("gridMat", robotScene);
    gridMat.wireframe = true;
    gridMat.diffuseColor = new BABYLON.Color3(0.15, 0.25, 0.35);
    grid.material = gridMat;

    window.addEventListener('blur', function () {
      if (robotEngine) robotEngine.stopRenderLoop();
    });

    window.addEventListener('focus', function () {
      if (robotEngine && robotScene && activeMode === 'robots') {
        robotEngine.stopRenderLoop();
        robotEngine.runRenderLoop(function () {
          if (activeMode === 'robots' && robotScene) {
            robotScene.render();
          }
        });
      }
    });

    robotEngine.runRenderLoop(function () {
      if (activeMode === 'robots' && robotScene) {
        robotScene.render();
      }
    });
  }

  function normalizeBoardId(boardId) {
    if (boardId === 'stblock_v2') return 'stbBoardV2';
    if (boardId === 'arduino_uno') return 'arduinoUno';
    return boardId || 'stbBoardV2';
  }

  function getSelectedRobotBoardsFromForm() {
    var select = $('robotBoardType');
    if (!select) return [normalizeBoardId(robotState.boardType)];
    var values = Array.prototype.slice.call(select.selectedOptions || []).map(function(option) {
      return normalizeBoardId(option.value);
    });
    if (!values.length) values = [normalizeBoardId(select.value || robotState.boardType)];
    return values.filter(function(value, index) { return values.indexOf(value) === index; });
  }

  function getRobotBoards() {
    var boards = Array.isArray(robotState.boardTypes) ? robotState.boardTypes.slice() : [];
    if (robotState.boardType) boards.unshift(robotState.boardType);
    boards = boards.map(normalizeBoardId).filter(Boolean);
    if (!boards.length) boards = ['stbBoardV2'];
    return boards.filter(function(value, index) { return boards.indexOf(value) === index; });
  }

  function setRobotBoardSelectValues(boards) {
    var select = $('robotBoardType');
    if (!select) return;
    var selected = boards.length ? boards : ['stbBoardV2'];
    Array.prototype.slice.call(select.options).forEach(function(option) {
      option.selected = selected.indexOf(option.value) !== -1;
    });
  }

  function getBoardLabel(boardId) {
    var select = $('robotBoardType');
    if (select) {
      var option = Array.prototype.slice.call(select.options).find(function(item) { return item.value === boardId; });
      if (option) return option.textContent;
    }
    return boardId;
  }

  function isRobotSensorPart(part, isBaseWheel) {
    return !isBaseWheel && part && part.type && (part.type.indexOf('Sensor') !== -1 || part.type === 'Pen');
  }

  // Definiciones de pines realistas para componentes Arduino
  var componentPinDefinitions = {
    'UltrasonicSensor': { pins: ['TRIG', 'ECHO'], pinCount: 2, pinTypes: ['digital-output', 'digital-input'], realComponent: 'HC-SR04' },
    'ColorSensor': { pins: ['SDA', 'SCL'], pinCount: 2, protocol: 'I2C', realComponent: 'TCS34725' },
    'GyroSensor': { pins: ['SDA', 'SCL', 'INT'], pinCount: 3, protocol: 'I2C', realComponent: 'MPU6050' },
    'GPSSensor': { pins: ['RX', 'TX'], pinCount: 2, protocol: 'Serial', realComponent: 'NEO-6M' },
    'TouchSensor': { pins: ['SIGNAL'], pinCount: 1, realComponent: 'Push Button' },
    'LineFollowerSensor': { pins: ['LEFT', 'CENTER', 'RIGHT'], pinCount: 3, pinTypes: ['analog', 'analog', 'analog'], realComponent: 'TCRT5000 x3' },
    'TemperatureSensor': { pins: ['DATA'], pinCount: 1, protocol: 'OneWire', realComponent: 'DS18B20' },
    'HumiditySensor': { pins: ['DATA'], pinCount: 1, protocol: 'DHT', realComponent: 'DHT11' },
    'GasSensor': { pins: ['AO', 'DO'], pinCount: 2, realComponent: 'MQ-2' },
    'LaserRangeSensor': { pins: ['SDA', 'SCL'], pinCount: 2, protocol: 'I2C', realComponent: 'VL53L0X' },
    'LidarSensor': { pins: ['RX', 'TX', 'MOTOR'], pinCount: 3, realComponent: 'RPLIDAR A1' },
    'CameraSensor': { pins: ['SDA', 'SCL'], pinCount: 2, protocol: 'I2C', realComponent: 'OV7670' },
    'ServoMotor': { pins: ['PWM'], pinCount: 1, realComponent: 'SG90/MG996R' },
    'LinearActuator': { pins: ['DIR1', 'DIR2', 'PWM'], pinCount: 3, realComponent: 'L298N Driver' },
    'MagnetActuator': { pins: ['CTRL', 'PWM'], pinCount: 2, realComponent: 'Electromagnet' },
    'Pen': { pins: ['PWM'], pinCount: 1, realComponent: 'Servo Pen' },
    'ArmActuator': { pins: ['PWM', 'DIR1', 'DIR2'], pinCount: 3, realComponent: 'Servo/Motor' },
    'SwivelActuator': { pins: ['PWM'], pinCount: 1, realComponent: 'Servo 360°' },
    'PaintballLauncherActuator': { pins: ['TRIGGER', 'LOADER'], pinCount: 2, realComponent: 'Solenoid' },
    'WheelDrive': { pins: ['DIR1', 'DIR2', 'PWM'], pinCount: 3, realComponent: 'DC Motor + L298N' },
    'Motor': { pins: ['DIR1', 'DIR2', 'PWM'], pinCount: 3, realComponent: 'DC Motor' }
  };

  function getPartPinDefinition(partType) {
    return componentPinDefinitions[partType] || null;
  }

  function getPartPinCount(part) {
    if (!part) return 1;

    // Primero buscar en definiciones realistas de Arduino
    var pinDef = getPartPinDefinition(part.type);
    if (pinDef && pinDef.pinCount) {
      return pinDef.pinCount;
    }

    // Buscar en preset personalizado
    var preset = part.customPreset || part.options && part.options.customPreset;
    if (preset && preset.pinCount) return preset.pinCount;
    // Buscar en presets instalados
    var presetId = part.customPresetId || (part.options && part.options.customPresetId);
    if (presetId) {
      var installed = installedPiecePresets.find(function(p) { return p.id === presetId; });
      if (installed && installed.pinCount) return installed.pinCount;
    }
    // Defaults según tipo
    if (part.type === 'Motor' || part.type === 'WheelDrive') return 3; // Dir1, Dir2, PWM
    return 1;
  }

  function getBoardPorts(board, isSensor) {
    var category = getBoardCategory(board);
    if (category === 'stblock') return isSensor ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] : ['A1', 'A2', 'B3', 'B4'];
    if (category === 'microbit') return ['P0', 'P1', 'P2', 'P3', 'P4', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P19', 'P20'];
    if (category === 'ev3') return isSensor ? ['in1', 'in2', 'in3', 'in4'] : ['outA', 'outB', 'outC', 'outD'];
    return getArduinoPins(board);
  }

  function defaultConnectionForBoard(part, board) {
    var isBaseWheel = part && part.id && part.id.startsWith('wheel-');
    var isSensor = isRobotSensorPart(part, isBaseWheel);
    var category = getBoardCategory(board);
    if (category === 'arduino' && !isSensor) {
      var pins = getArduinoPins(board);
      var pwmPins = getArduinoPWMPins(board);
      return {
        mode: 'arduinoMotor',
        arduinoDir1: pins[0] || 'D2',
        arduinoDir2: pins[1] || 'D3',
        arduinoPWM: pwmPins[0] || 'D5',
        port: 'arduino_motor_' + (pins[0] || 'D2') + '_' + (pins[1] || 'D3') + '_' + (pwmPins[0] || 'D5')
      };
    }
    var ports = getBoardPorts(board, isSensor);
    return {mode: 'port', port: ports[0] || ''};
  }

  function ensurePartConnection(part, board) {
    board = normalizeBoardId(board || robotState.boardType);
    if (!part.connections) part.connections = {};
    if (!part.connections[board]) {
      var fallback = defaultConnectionForBoard(part, board);
      if (board === normalizeBoardId(robotState.boardType)) {
        fallback.port = part.port || fallback.port;
        fallback.arduinoDir1 = part.arduinoDir1 || fallback.arduinoDir1;
        fallback.arduinoDir2 = part.arduinoDir2 || fallback.arduinoDir2;
        fallback.arduinoPWM = part.arduinoPWM || fallback.arduinoPWM;
      }
      part.connections[board] = fallback;
    }
    return part.connections[board];
  }

  function applyPartConnectionToLegacy(part, board) {
    var connection = ensurePartConnection(part, board || robotState.boardType);
    part.port = connection.port || part.port;
    if (connection.mode === 'arduinoMotor') {
      part.arduinoDir1 = connection.arduinoDir1;
      part.arduinoDir2 = connection.arduinoDir2;
      part.arduinoPWM = connection.arduinoPWM;
    }
  }

  function ensureRobotCompatibilityState() {
    robotState.boardType = normalizeBoardId(robotState.boardType || 'stbBoardV2');
    robotState.boardTypes = getRobotBoards();
    if (robotState.boardTypes.indexOf(robotState.boardType) === -1) {
      robotState.boardTypes.unshift(robotState.boardType);
    }
    robotState.boardType = robotState.boardTypes[0];
    (robotState.wheels || []).concat(robotState.components || []).forEach(function(part) {
      robotState.boardTypes.forEach(function(board) { ensurePartConnection(part, board); });
      applyPartConnectionToLegacy(part, robotState.boardType);
    });
  }

  function isStructuralPart(part) {
    return !!part && (part.type === 'Box' || part.type === 'Cylinder' || part.type === 'Sphere');
  }

  function ensureMechanicalJointsState() {
    if (!Array.isArray(robotState.mechanicalJoints)) robotState.mechanicalJoints = [];
    return robotState.mechanicalJoints;
  }

  function mechanicalJointForPart(partId) {
    return ensureMechanicalJointsState().find(function(joint) { return joint.partB === partId || joint.b === partId; }) || null;
  }

  function removeMechanicalJointsForPart(partId) {
    robotState.mechanicalJoints = ensureMechanicalJointsState().filter(function(joint) {
      return joint.partA !== partId && joint.partB !== partId && joint.a !== partId && joint.b !== partId;
    });
  }

  function removeRobotPart(id) {
    if (!id) return;
    if (id.indexOf('wheel-') === 0) {
      toast('Las ruedas base no se pueden eliminar');
      return;
    }
    var before = robotState.components.length;
    robotState.components = robotState.components.filter(function(comp) { return comp.id !== id; });
    if (robotState.components.length === before) return;
    removeMechanicalJointsForPart(id);
    robotState.components.forEach(function(comp) {
      if (comp.parentId === id) comp.parentId = 'chassis';
    });
    selectedRobotPartId = null;
    renderRobotPartsList();
    selectRobotPart(null);
    renderRobot3D();
    toast('Pieza eliminada');
  }

  function selectedRobotPart() {
    if (!selectedRobotPartId) return null;
    if (selectedRobotPartId.startsWith('wheel-')) {
      return robotState.wheels.find(function(w) { return w.id === selectedRobotPartId; });
    }
    return robotState.components.find(function(c) { return c.id === selectedRobotPartId; });
  }

  function loadRobotForm() {
    robotState.boardType = normalizeBoardId(robotState.boardType || 'stbBoardV2');
    robotState.boardTypes = (Array.isArray(robotState.boardTypes) && robotState.boardTypes.length) ?
      robotState.boardTypes.map(normalizeBoardId) : [robotState.boardType];
    ensureRobotCompatibilityState();
    ensureMechanicalJointsState();

    $('robotNameInput').value = robotState.name;
    $('robotIdInput').value = robotState.id;
    $('robotChassisType').value = robotState.chassisType || 'box';
    $('customChassisUploadSection').hidden = (robotState.chassisType !== 'custom');
    setRobotBoardSelectValues(robotState.boardTypes);

    // Fill chassis form
    $('chassisW').value = robotState.chassis.size[0];
    $('chassisD').value = robotState.chassis.size[1];
    $('chassisH').value = robotState.chassis.size[2];
    $('chassisYOffset').value = typeof robotState.chassis.yOffset !== 'undefined' ? robotState.chassis.yOffset : 0;
    $('chassisMass').value = robotState.chassis.mass;
    $('chassisFriction').value = robotState.chassis.friction;
    $('chassisColor').value = robotState.chassis.color || '#f09c0d';

    if ($('chassisDriftEnabled')) {
      $('chassisDriftEnabled').checked = !!robotState.chassis.driftEnabled;
    }
    if ($('chassisDriftLeft')) {
      $('chassisDriftLeft').value = typeof robotState.chassis.driftLeft !== 'undefined' ? robotState.chassis.driftLeft : 10;
      $('chassisDriftValue').textContent = $('chassisDriftLeft').value + '%';
    }

    renderRobotPartsList();
    selectRobotPart(null);
  }

  function syncRobotStateFromForm() {
    robotState.name = $('robotNameInput').value.trim() || 'Mi Robot';
    robotState.id = slug($('robotIdInput').value || robotState.name);
    robotState.chassisType = $('robotChassisType').value;
    if ($('robotBoardType')) {
      robotState.boardTypes = getSelectedRobotBoardsFromForm();
      robotState.boardType = robotState.boardTypes[0] || 'stbBoardV2';
    }
    robotState.chassis.size = [
      clamp(number('chassisW', 15), 2, 100),
      clamp(number('chassisD', 20), 2, 100),
      clamp(number('chassisH', 8), 1, 100)
    ];
    robotState.chassis.yOffset = clamp(number('chassisYOffset', 0), 0, 100);
    robotState.chassis.mass = clamp(number('chassisMass', 120), 10, 5000);
    robotState.chassis.friction = clamp(number('chassisFriction', 0.5), 0, 5);
    robotState.chassis.color = $('chassisColor').value;
    if ($('chassisDriftEnabled')) {
      robotState.chassis.driftEnabled = $('chassisDriftEnabled').checked;
    }
    if ($('chassisDriftLeft')) {
      robotState.chassis.driftLeft = parseInt($('chassisDriftLeft').value, 10) || 0;
    }
    $('robotIdInput').value = robotState.id;
    ensureRobotCompatibilityState();
  }

  function syncRobotPartFromForm() {
    var part = selectedRobotPart();
    if (!part) return;
    normalizeCustomPresetRobotPart(part);

    var isBaseWheel = part.id.startsWith('wheel-');
    if (!isBaseWheel) {
      part.name = $('partNameInput').value || part.name;
      if ($('partParentSelect')) {
        part.parentId = $('partParentSelect').value || 'chassis';
      }

      // Save activation and exclusion properties
      part.defaultActive = $('partDefaultActive').checked;
      part.exclusionGroup = $('partExclusionGroup').value.trim() || '';

      // Enforce exclusion rules: if this part is active, disable all other parts in the same group
      if (part.defaultActive && part.exclusionGroup) {
        robotState.components.forEach(function(otherPart) {
          if (otherPart.id !== part.id && otherPart.exclusionGroup && otherPart.exclusionGroup.toLowerCase() === part.exclusionGroup.toLowerCase()) {
            otherPart.defaultActive = false;
          }
        });
      }
    }

    var isMechanicalOnly = isStructuralPart(part);
    var board = normalizeBoardId(arguments.length ? arguments[0] : (activePartConnectionBoard || ($('partConnectionBoard') && $('partConnectionBoard').value) || robotState.boardType));
    var isSensor = isRobotSensorPart(part, isBaseWheel);
    if (!isMechanicalOnly) {
      var connection = ensurePartConnection(part, board);
      var isArduinoMotor = (getBoardCategory(board) === 'arduino' && !isSensor);
      if (isArduinoMotor) {
        connection.mode = 'arduinoMotor';
        if ($('partArduinoDir1')) connection.arduinoDir1 = $('partArduinoDir1').value;
        if ($('partArduinoDir2')) connection.arduinoDir2 = $('partArduinoDir2').value;
        if ($('partArduinoPWM')) connection.arduinoPWM = $('partArduinoPWM').value;
        connection.port = 'arduino_motor_' + (connection.arduinoDir1 || 'D2') + '_' + (connection.arduinoDir2 || 'D3') + '_' + (connection.arduinoPWM || 'D5');
      } else {
        connection.mode = 'port';
        connection.port = $('partPortSelect').value;

        // Save multiple pins if component requires more than one pin
        var pinCount = getPartPinCount(part);
        if (pinCount > 1) {
          connection.pins = [];
          for (var i = 0; i < pinCount; i++) {
            var pinSel = $('partPin' + i);
            if (pinSel) {
              connection.pins.push(pinSel.value);
            }
          }
          // Use first pin as main port for backward compatibility
          if (connection.pins.length > 0) {
            connection.port = connection.pins[0];
          }
        }
      }
      part.connections[board] = connection;
      if (board === robotState.boardType) applyPartConnectionToLegacy(part, board);
    }

    part.position = [
      number('partX', 0),
      number('partY', 0),
      number('partZ', 0)
    ];

    if (!isBaseWheel) {
      part.rotation = [
        number('partRX', 0),
        number('partRY', 0),
        number('partRZ', 0)
      ];
    }

    var isWheel = isBaseWheel || part.type === 'WheelPassive';
    if (isWheel) {
      part.radius = number('partWheelRadius', 4.0);
      part.width = number('partWheelWidth', 2.0);
    }

    if (part.type && (part.type.indexOf('servo') !== -1 || part.type.indexOf('Custom') === 0 || part.type === 'ArmActuator' || part.type === 'SwivelActuator' || part.type === 'LinearActuator')) {
      if (!part.options) part.options = {};
      var isLinearActuator = part.type === 'LinearActuator';
      part.options.minAngle = number('partServoMin', isLinearActuator ? -10 : 0);
      part.options.maxAngle = number('partServoMax', isLinearActuator ? 10 : 180);
      part.options.speed = number('partServoSpeed', isLinearActuator ? 30 : 90);
      part.options.maxForce = number('partServoForce', 150);
    }

    if (isStructuralPart(part)) {
      if (!part.options) part.options = {};
      part.options.attachMode = $('partAttachMode') ? $('partAttachMode').value : (part.options.attachMode || 'free');
      part.options.mass = number('partStructMass', part.options.mass || 80);
      part.options.friction = number('partStructFriction', part.options.friction || 0.5);
      part.options.color = (($('partStructColor') && $('partStructColor').value) || '#A3CF0D').replace('#', '');
      if (part.type === 'Box') {
        part.options.width = number('partStructW', part.options.width || 6);
        part.options.height = number('partStructH', part.options.height || 2);
        part.options.depth = number('partStructD', part.options.depth || 6);
      } else if (part.type === 'Cylinder') {
        part.options.diameter = number('partStructDiameter', part.options.diameter || 4);
        part.options.height = number('partStructRoundH', part.options.height || 2);
      } else if (part.type === 'Sphere') {
        part.options.diameter = number('partStructDiameter', part.options.diameter || 4);
      }
    }

    if (!isBaseWheel) syncPartMechanicalJointFromForm(part);
    renderRobotPartsList();
  }

  function syncPartMechanicalJointFromForm(part) {
    if (!part || !$('partJointEnabled')) return;
    removeMechanicalJointsForPart(part.id);
    if (!$('partJointEnabled').checked) return;
    var target = $('partJointTarget').value || 'chassis';
    if (!target || target === part.id) return;
    ensureMechanicalJointsState().push({
      id: 'joint-' + part.id,
      enabled: true,
      type: $('partJointType').value || 'point',
      partA: target,
      partB: part.id,
      anchorA: [number('partJointBX', 0), number('partJointBY', 0), number('partJointBZ', 0)],
      anchorB: [number('partJointAX', 0), number('partJointAY', 0), number('partJointAZ', 0)],
      axisA: [number('partJointAxisX', 0), number('partJointAxisY', 1), number('partJointAxisZ', 0)],
      axisB: [number('partJointAxisX', 0), number('partJointAxisY', 1), number('partJointAxisZ', 0)]
    });
  }

  function getBoardCategory(boardId) {
    if (boardId === 'stblock_v2' || boardId === 'stbBoardV2' || boardId === 'stBoardExtension') {
      return 'stblock';
    }
    if (boardId === 'microbit' || boardId === 'microbitV2') {
      return 'microbit';
    }
    if (boardId === 'ev3') {
      return 'ev3';
    }
    return 'arduino';
  }

  function getArduinoPins(board) {
    if (board.indexOf('Mega2560') !== -1 || board === 'arduinoMega2560' || board === 'stbBoardV2') {
      return ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D21', 'D22', 'D23', 'D24', 'D25', 'D26', 'D27', 'D28', 'D29', 'D30', 'D31', 'D32', 'D33', 'D34', 'D35', 'D36', 'D37', 'D38', 'D39', 'D40', 'D41', 'D42', 'D43', 'D44', 'D45', 'D46', 'D47', 'D48', 'D49', 'D50', 'D51', 'D52', 'D53', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'];
    }
    if (board.indexOf('Esp32') !== -1 || board.indexOf('ESP32') !== -1) {
      return ['G2', 'G4', 'G5', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G21', 'G22', 'G23', 'G25', 'G26', 'G27', 'G32', 'G33', 'G34', 'G35', 'G36', 'G39'];
    }
    if (board.indexOf('Esp8266') !== -1 || board.indexOf('NodeMCU') !== -1) {
      return ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'A0'];
    }
    if (board.indexOf('Pico') !== -1) {
      return ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18', 'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'];
    }
    return ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  }

  function getArduinoPWMPins(board) {
    if (board.indexOf('Mega2560') !== -1 || board === 'arduinoMega2560' || board === 'stbBoardV2') {
      return ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D44', 'D45', 'D46'];
    }
    if (board.indexOf('Esp32') !== -1 || board.indexOf('ESP32') !== -1) {
      return ['G2', 'G4', 'G5', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G21', 'G22', 'G23', 'G25', 'G26', 'G27'];
    }
    if (board.indexOf('Esp8266') !== -1 || board.indexOf('NodeMCU') !== -1) {
      return ['D1', 'D2', 'D5', 'D6', 'D7', 'D8'];
    }
    if (board.indexOf('Pico') !== -1) {
      return ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18', 'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'];
    }
    return ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'];
  }

  function addRobotPart(type) {
    var id = 'part-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    var nameMapping = {
      struct_box: 'Pieza Caja',
      struct_cylinder: 'Pieza Cilindro',
      struct_sphere: 'Pieza Esfera',
      struct_model: 'Diseño 3D',
      wheel: 'Rueda Adicional',
      caster_wheel: 'Rueda Loca',
      linear: 'Actuador Lineal',
      magnet: 'Electroimán',
      paintball: 'Lanzador Paintball',
      ultrasonic: 'Sensor Ultrasonido',
      color: 'Sensor de Color',
      touch: 'Sensor de Contacto',
      gyro: 'Giroscopio',
      laser: 'Láser Distancia',
      lidar: 'LIDAR 360',
      gps: 'Sensor GPS',
      pen: 'Lápiz Trazador',
      linefollower: 'Seguidor de Línea (3 ch)',
      gas: 'Sensor de Gas (PPM)',
      temperature: 'Sensor Temperatura',
      humidity: 'Sensor Humedad'
    };

    var typeMapping = {
      struct_box: 'Box',
      struct_cylinder: 'Cylinder',
      struct_sphere: 'Sphere',
      struct_model: 'Box',
      wheel: 'WheelPassive',
      caster_wheel: 'WheelPassive',
      linear: 'LinearActuator',
      magnet: 'MagnetActuator',
      paintball: 'PaintballLauncherActuator',
      ultrasonic: 'UltrasonicSensor',
      color: 'ColorSensor',
      touch: 'TouchSensor',
      gyro: 'GyroSensor',
      laser: 'LaserRangeSensor',
      lidar: 'LidarSensor',
      gps: 'GPSSensor',
      pen: 'Pen',
      linefollower: 'LineFollowerSensor',
      gas: 'GasSensor',
      temperature: 'TemperatureSensor',
      humidity: 'HumiditySensor'
    };

    var componentType = typeMapping[type] || 'Box';
    var sensorTypes = ['UltrasonicSensor', 'ColorSensor', 'TouchSensor', 'GyroSensor', 'LaserRangeSensor', 'LidarSensor', 'GPSSensor', 'Pen', 'LineFollowerSensor', 'GasSensor', 'TemperatureSensor', 'HumiditySensor'];
    var isSensor = sensorTypes.indexOf(componentType) !== -1;

    var board = robotState.boardType || 'stbBoardV2';
    var defaultPort = '';
    var category = getBoardCategory(board);
    if (category === 'stblock') {
      defaultPort = isSensor ? '1' : 'A1';
    } else if (category === 'microbit') {
      defaultPort = 'P0';
    } else if (category === 'arduino') {
      defaultPort = isSensor ? 'D2' : 'arduino_motor_D2_D3_D5';
    } else {
      defaultPort = isSensor ? 'in1' : 'outA';
    }

    var isStructural = componentType === 'Box' || componentType === 'Cylinder' || componentType === 'Sphere';

    var part = {
      id: id,
      name: nameMapping[type] || type,
      type: componentType,
      port: defaultPort,
      position: [0, robotState.chassis.size[2] / 2 + 1, 0],
      rotation: [0, 0, 0],
      options: {
        modelURL: '',
        modelScale: 1.0,
        models: [] // Alternative models list (part set)
      }
    };

    if (isStructural) {
      part.mechanicalOnly = true;
      part.structuralKind = type === 'struct_model' ? 'model' : type;
      part.parentId = 'chassis';
      part.options.attachMode = 'free';
      part.options.mass = 80;
      part.options.friction = 0.5;
      part.options.restitution = 0.2;
      part.options.color = 'A3CF0D';
      if (componentType === 'Box') {
        part.options.width = type === 'struct_model' ? 4 : 6;
        part.options.height = type === 'struct_model' ? 4 : 2;
        part.options.depth = type === 'struct_model' ? 4 : 6;
      } else if (componentType === 'Cylinder') {
        part.options.diameter = 4;
        part.options.height = 2;
      } else if (componentType === 'Sphere') {
        part.options.diameter = 4;
      }
    }

    if (!isStructural) {
      part.connections = {};
      getRobotBoards().forEach(function(boardId) {
        ensurePartConnection(part, boardId);
      });
      applyPartConnectionToLegacy(part, robotState.boardType || board);
    }

    if (type.indexOf('servo') !== -1 || type === 'linear') {
      part.options.minAngle = (type === 'linear') ? -10 : 0;
      part.options.maxAngle = (type === 'linear') ? 10 : 180;
      part.options.speed = (type === 'linear') ? 30 : 90;
      part.options.maxForce = 150;
      part.options.mass = 50;
    }

    if (componentType === 'WheelPassive') {
      part.radius = 2.5;
      part.width = 1.5;
      part.position = [0, part.radius, 0];
      part.options.mass = 120;
      part.options.friction = 0.2;
      part.options.restitution = 0.1;
    }

    if (type === 'caster_wheel') {
      part.radius = 2.0;
      part.width = 1.1;
      part.position = [0, part.radius, -Math.max(0, (robotState.chassis.size[1] / 2) - part.radius)];
      part.options.caster = true;
      part.options.casterFriction = 0.04;
      part.options.mass = 80;
      part.options.friction = 0.05;
      part.options.restitution = 0.05;
    }

    robotState.components.push(part);
    selectedRobotPartId = id;
    renderRobotPartsList();
    selectRobotPart(id);
    renderRobot3D();

    if (type === 'struct_model' && $('partModelFile')) {
      setTimeout(function() { $('partModelFile').click(); }, 0);
    }
  }

  function selectRobotPart(id) {
    selectedRobotPartId = id;
    var part = selectedRobotPart();

    // Highlight in 3D
    for (var key in robotMeshes) {
      if (robotMeshes[key]) {
        robotMeshes[key].showBoundingBox = (key === id);
      }
    }

    if (!part) {
      $('noPartSelected').hidden = false;
      $('robotPartInspector').hidden = true;
      return;
    }

    $('noPartSelected').hidden = true;
    $('robotPartInspector').hidden = false;

    // Set tab
    $('btnTabChassis').classList.remove('active');
    $('btnTabPart').classList.add('active');
    $('panel-r-chassis').classList.remove('active');
    $('panel-r-part').classList.add('active');

    // Fill inspector
    var isBaseWheel = id.startsWith('wheel-');
    var isMechanicalOnly = isStructuralPart(part);
    var partName = isBaseWheel ? (id === 'wheel-left' ? 'Rueda Base Izquierda' : 'Rueda Base Derecha') : (part.name || 'Pieza');
    var partType = isBaseWheel ? 'Wheel' : (part.type || 'Componente');

    $('partNameInput').value = partName;
    $('partTypeDisplay').value = partType;

    // Fill activation and exclusion properties
    var actPanel = $('panel-part-activation');
    if (actPanel) {
      actPanel.hidden = isBaseWheel;
    }
    if (!isBaseWheel) {
      $('partDefaultActive').checked = (part.defaultActive !== false);
      $('partExclusionGroup').value = part.exclusionGroup || '';
    }

    var parentSelect = $('partParentSelect');
    if (parentSelect) {
      parentSelect.innerHTML = '';

      // Chassis option
      var optChassis = document.createElement('option');
      optChassis.value = 'chassis';
      optChassis.textContent = 'Chasis Principal';
      parentSelect.appendChild(optChassis);

      // Other components
      robotState.components.forEach(function(comp) {
        if (comp.id !== part.id) {
          var opt = document.createElement('option');
          opt.value = comp.id;
          opt.textContent = comp.name || comp.type;
          parentSelect.appendChild(opt);
        }
      });

      parentSelect.value = part.parentId || 'chassis';
      $('labelPartParentSelect').hidden = isBaseWheel;
    }

    // Fill ports dropdown dynamically based on the selected compatible board
    var boards = getRobotBoards();
    var boardSelect = $('partConnectionBoard');
    var select = $('partPortSelect');
    if (isMechanicalOnly) {
      if (boardSelect) boardSelect.innerHTML = '';
      if (select) select.innerHTML = '';
      if ($('labelPartConnectionBoard')) $('labelPartConnectionBoard').hidden = true;
      if ($('labelPartPortSelect')) $('labelPartPortSelect').hidden = true;
      if ($('panel-part-arduino-motor')) $('panel-part-arduino-motor').hidden = true;
    } else {
      if (boardSelect) {
        boardSelect.innerHTML = '';
        boards.forEach(function(boardId) {
          var opt = document.createElement('option');
          opt.value = boardId;
          opt.textContent = getBoardLabel(boardId);
          boardSelect.appendChild(opt);
        });
        if (!activePartConnectionBoard || boards.indexOf(activePartConnectionBoard) === -1) {
          activePartConnectionBoard = robotState.boardType || boards[0];
        }
        boardSelect.value = activePartConnectionBoard;
        $('labelPartConnectionBoard').hidden = boards.length <= 1;
      }

      var board = normalizeBoardId(activePartConnectionBoard || robotState.boardType || 'stbBoardV2');
      var isSensor = isRobotSensorPart(part, isBaseWheel);
      var connection = ensurePartConnection(part, board);
      select.innerHTML = '';
      var category = getBoardCategory(board);
      var ports = getBoardPorts(board, isSensor);
      ports.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p; opt.textContent = p; select.appendChild(opt);
      });

      var isArduinoMotor = (category === 'arduino' && !isSensor);
      $('panel-part-arduino-motor').hidden = !isArduinoMotor;

      if (isArduinoMotor) {
        $('labelPartPortSelect').hidden = true;

        function populatePinSelect(selectId, currentValue, isPWM) {
          var sel = $(selectId);
          if (!sel) return;
          sel.innerHTML = '';
          var pins = isPWM ? getArduinoPWMPins(board) : getArduinoPins(board);
          pins.forEach(function(pin) {
            var opt = document.createElement('option');
            opt.value = pin; opt.textContent = pin; sel.appendChild(opt);
          });
          if (currentValue && pins.indexOf(currentValue) === -1) {
            var custom = document.createElement('option');
            custom.value = currentValue;
            custom.textContent = currentValue + ' (no disponible en esta tarjeta)';
            sel.appendChild(custom);
          }
          sel.value = currentValue || pins[0];
        }

        populatePinSelect('partArduinoDir1', connection.arduinoDir1 || (getArduinoPins(board)[0] || 'D2'), false);
        populatePinSelect('partArduinoDir2', connection.arduinoDir2 || (getArduinoPins(board)[1] || 'D3'), false);
        populatePinSelect('partArduinoPWM', connection.arduinoPWM || (getArduinoPWMPins(board)[0] || 'D5'), true);
      } else {
        $('labelPartPortSelect').hidden = false;
        if (connection.port && ports.indexOf(connection.port) === -1) {
          var customPort = document.createElement('option');
          customPort.value = connection.port;
          customPort.textContent = connection.port + ' (no disponible en esta tarjeta)';
          select.appendChild(customPort);
        }
        select.value = connection.port || ports[0];
      }

      // Panel de múltiples pines según definición realista del componente
      var multiPinsPanel = $('panel-part-multi-pins');
      var multiPinsContainer = $('multiPinsContainer');
      if (multiPinsPanel && multiPinsContainer) {
        var pinDef = getPartPinDefinition(part.type);
        var pinCount = pinDef ? pinDef.pinCount : getPartPinCount(part);

        if (pinCount > 1 && !isArduinoMotor) {
          multiPinsPanel.hidden = false;
          $('labelPartPortSelect').hidden = true;
          multiPinsContainer.innerHTML = '';

          // Actualizar título con el componente real
          var titleEl = $('multiPinsTitle');
          if (titleEl && pinDef && pinDef.realComponent) {
            titleEl.textContent = '🔌 Pines ' + pinDef.realComponent;
            if (pinDef.protocol) {
              titleEl.textContent += ' (' + pinDef.protocol + ')';
            }
          }

          // Usar nombres de pines reales si están definidos
          var pinLabels = pinDef && pinDef.pins ? pinDef.pins : ['Pin 1', 'Pin 2', 'Pin 3', 'Pin 4', 'Pin 5', 'Pin 6'];
          var allPins = getArduinoPins(board);

          for (var i = 0; i < pinCount; i++) {
            var label = document.createElement('label');
            label.textContent = pinLabels[i] || ('Pin ' + (i + 1));
            var sel = document.createElement('select');
            sel.id = 'partPin' + i;
            sel.dataset.pinIndex = i;
            sel.dataset.pinName = pinLabels[i] || ('pin' + i);

            allPins.forEach(function(pin) {
              var opt = document.createElement('option');
              opt.value = pin;
              opt.textContent = pin;
              sel.appendChild(opt);
            });

            // Cargar valor guardado
            var savedPins = connection.pins || [];
            sel.value = savedPins[i] || allPins[i] || allPins[0];

            label.appendChild(sel);
            multiPinsContainer.appendChild(label);
          }
        } else {
          multiPinsPanel.hidden = true;
        }
      }
    }

    // Coordinates
    $('partX').value = part.position[0];
    $('partY').value = part.position[1];
    $('partZ').value = part.position[2];

    // Rotation (hide for base wheels, show for others)
    var rotPanel = $('panel-part-rotation');
    if (rotPanel) {
      rotPanel.hidden = isBaseWheel;
    }
    var rotation = part.rotation || [0, 0, 0];
    $('partRX').value = rotation[0];
    $('partRY').value = rotation[1];
    $('partRZ').value = rotation[2];

    // Show wheel panel if applicable
    var isWheel = isBaseWheel || part.type === 'WheelPassive';
    $('panel-part-wheel').hidden = !isWheel;
    if (isWheel) {
      $('partWheelRadius').value = part.radius || 4.0;
      $('partWheelWidth').value = part.width || 2.0;
    }

    // Show servo panel if applicable
    var isServo = !isBaseWheel && (part.type === 'ArmActuator' || part.type === 'SwivelActuator' || part.type === 'LinearActuator' || part.type === 'CustomServoActuator' || part.type === 'CustomMotorActuator' || part.type === 'CustomLinearActuator');
    $('panel-part-servo').hidden = !isServo;
    if (isServo && part.options) {
      $('partServoMin').value = part.options.minAngle || 0;
      $('partServoMax').value = part.options.maxAngle || 0;
      $('partServoSpeed').value = part.options.speed || 90;
      $('partServoForce').value = part.options.maxForce || 100;
    }

    var structurePanel = $('panel-part-structure');
    if (structurePanel) {
      structurePanel.hidden = !isMechanicalOnly;
      if (isMechanicalOnly) {
        var opts = part.options || {};
        $('partAttachMode').value = opts.attachMode || 'free';
        $('partStructMass').value = typeof opts.mass !== 'undefined' ? opts.mass : 80;
        $('partStructFriction').value = typeof opts.friction !== 'undefined' ? opts.friction : 0.5;
        $('partStructColor').value = '#' + String(opts.color || 'A3CF0D').replace('#', '');
        $('panel-part-box-size').hidden = part.type !== 'Box';
        $('panel-part-round-size').hidden = part.type !== 'Cylinder' && part.type !== 'Sphere';
        $('partStructW').value = opts.width || 6;
        $('partStructH').value = opts.height || 2;
        $('partStructD').value = opts.depth || 6;
        $('partStructDiameter').value = opts.diameter || 4;
        $('partStructRoundH').value = opts.height || 2;
        $('partStructRoundH').disabled = part.type === 'Sphere';
      }
    }

    var jointPanel = $('panel-part-joint');
    if (jointPanel) {
      jointPanel.hidden = isBaseWheel;
      if (!isBaseWheel) {
        var joint = mechanicalJointForPart(part.id);
        var targetSelect = $('partJointTarget');
        targetSelect.innerHTML = '';
        var chassisOption = document.createElement('option');
        chassisOption.value = 'chassis';
        chassisOption.textContent = 'Chasis Principal';
        targetSelect.appendChild(chassisOption);
        robotState.components.forEach(function(comp) {
          if (comp.id !== part.id) {
            var opt = document.createElement('option');
            opt.value = comp.id;
            opt.textContent = comp.name || comp.type;
            targetSelect.appendChild(opt);
          }
        });
        $('partJointEnabled').checked = !!joint;
        $('partJointType').value = joint ? (joint.type || 'point') : 'point';
        targetSelect.value = joint ? (joint.partA || joint.a || 'chassis') : 'chassis';
        var anchorB = joint ? (joint.anchorB || joint.connectedPivot || [0, 0, 0]) : [0, 0, 0];
        var anchorA = joint ? (joint.anchorA || joint.mainPivot || [0, 0, 0]) : [0, 0, 0];
        var axis = joint ? (joint.axisA || joint.mainAxis || [0, 1, 0]) : [0, 1, 0];
        $('partJointAX').value = anchorB[0] || 0;
        $('partJointAY').value = anchorB[1] || 0;
        $('partJointAZ').value = anchorB[2] || 0;
        $('partJointBX').value = anchorA[0] || 0;
        $('partJointBY').value = anchorA[1] || 0;
        $('partJointBZ').value = anchorA[2] || 0;
        $('partJointAxisX').value = axis[0] || 0;
        $('partJointAxisY').value = typeof axis[1] !== 'undefined' ? axis[1] : 1;
        $('partJointAxisZ').value = axis[2] || 0;
        $('panel-part-joint-axis').hidden = $('partJointType').value !== 'hinge';
      }
    }

    // Show mesh list for all components
    $('panel-part-mesh').hidden = false;
    renderPartMeshSetList();
  }

  function renderPartMeshSetList() {
    var part = selectedRobotPart();
    var container = $('partMeshSetList');
    if (!container || !part) return;
    container.innerHTML = '';

    if (!part.options) part.options = {};
    if (!part.options.models) part.options.models = [];

    if (part.options.models.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:10px 0;">No hay mallas cargadas. El robot usará la caja básica.</div>';
      return;
    }

    part.options.models.forEach(function (model, index) {
      model.scale = clamp(Number(model.scale) || 1, 0.001, 1000);

      var row = document.createElement('div');
      row.className = 'saved-map';
      row.style.background = '#0a0f1e';
      row.style.padding = '6px';
      row.style.borderRadius = '5px';
      row.style.marginBottom = '4px';
      row.style.alignItems = 'center';
      row.style.gap = '6px';

      var label = document.createElement('span');
      label.textContent = model.name;
      label.style.fontSize = '11px';
      label.style.flex = '1';
      label.style.minWidth = '0';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';

      var scaleLabel = document.createElement('label');
      scaleLabel.textContent = 'Escala';
      scaleLabel.style.display = 'inline-flex';
      scaleLabel.style.alignItems = 'center';
      scaleLabel.style.gap = '4px';
      scaleLabel.style.fontSize = '10px';
      scaleLabel.style.color = '#cbd5e1';
      scaleLabel.style.margin = '0';
      scaleLabel.style.whiteSpace = 'nowrap';

      var scaleInput = document.createElement('input');
      scaleInput.type = 'number';
      scaleInput.min = '0.001';
      scaleInput.max = '1000';
      scaleInput.step = '0.05';
      scaleInput.value = model.scale;
      scaleInput.title = 'Escala general del modelo 3D';
      scaleInput.style.width = '64px';
      scaleInput.style.padding = '2px 4px';
      scaleInput.onchange = function () {
        model.scale = clamp(Number(scaleInput.value) || 1, 0.001, 1000);
        scaleInput.value = model.scale;
        renderRobot3D();
      };
      scaleLabel.appendChild(scaleInput);

      var remove = document.createElement('button');
      remove.textContent = 'X';
      remove.className = 'danger';
      remove.style.padding = '1px 6px';
      remove.style.fontSize = '10px';
      remove.onclick = function () {
        part.options.models.splice(index, 1);
        renderPartMeshSetList();
        renderRobot3D();
      };

      row.append(label, scaleLabel, remove);
      container.appendChild(row);
    });
  }

  function splitSceneFileUrl(url) {
    var value = String(url || '');
    var queryStart = value.search(/[?#]/);
    var pathPart = queryStart === -1 ? value : value.slice(0, queryStart);
    var suffix = queryStart === -1 ? '' : value.slice(queryStart);
    var slash = pathPart.lastIndexOf('/');
    if (slash === -1) {
      return {rootUrl: '', fileName: value};
    }
    return {
      rootUrl: pathPart.slice(0, slash + 1),
      fileName: pathPart.slice(slash + 1) + suffix
    };
  }

  function renderCustomRobotChassis(chassisMat) {
    var modelURL = robotState.chassis && robotState.chassis.modelURL;
    var urlParts = splitSceneFileUrl(modelURL);
    BABYLON.SceneLoader.ImportMesh('', urlParts.rootUrl, urlParts.fileName, robotScene, function (newMeshes) {
      var meshes = (newMeshes || []).filter(function (mesh) {
        return mesh && mesh.getTotalVertices && mesh.getTotalVertices() > 0;
      });
      if (!meshes.length) {
        console.warn('[STBLOCK-ROBOT] El modelo de chasis no trajo mallas visibles:', modelURL);
        toast('El modelo 3D no contiene mallas visibles');
        return;
      }

      var root = new BABYLON.TransformNode('chassis', robotScene);
      meshes.forEach(function (mesh, index) {
        mesh.name = index === 0 ? 'chassis-mesh' : 'chassis-mesh-' + index;
        mesh.material = chassisMat;
        mesh.parent = root;
      });

      var scale = Number(robotState.chassis.modelScale) || 1;
      root.computeWorldMatrix(true);
      var min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
      var max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
      meshes.forEach(function (mesh) {
        mesh.computeWorldMatrix(true);
        var box = mesh.getBoundingInfo().boundingBox;
        min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
        max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
      });
      var center = min.add(max).scale(0.5);
      var height = Math.max(1, max.y - min.y);
      meshes.forEach(function (mesh) {
        mesh.position.x -= center.x;
        mesh.position.y -= center.y;
        mesh.position.z -= center.z;
        if (selectedRobotPartId === 'chassis') mesh.showBoundingBox = true;
      });
      root.scaling = new BABYLON.Vector3(scale, scale, scale);
      root.position.y = (height * scale) / 2 + (Number(robotState.chassis.yOffset) || 0);
      robotMeshes.chassis = root;
    }, null, function (_scene, message, exception) {
      console.error('[STBLOCK-ROBOT] Error importando chasis 3D:', modelURL, message, exception);
      toast('No se pudo mostrar el chasis 3D');
    });
  }

  function renderRobotPartsList() {
    $('robotPartCount').textContent = robotState.components.length + robotState.wheels.length;
    var list = $('robotPartsList');
    if (!list) return;
    list.innerHTML = '';

    function mainPortLabel(part) {
      var connection = ensurePartConnection(part, robotState.boardType || getRobotBoards()[0]);
      return connection.port || part.port || '';
    }

    // Wheels
    robotState.wheels.forEach(function(wheel) {
      var row = document.createElement('div');
      row.className = 'layer' + (wheel.id === selectedRobotPartId ? ' active' : '');
      row.innerHTML = '<span class="layer-color" style="background:#555"></span><span></span><small>Rueda Fija</small>';
      row.children[1].textContent = 'Rueda ' + (wheel.id === 'wheel-left' ? 'Izquierda' : 'Derecha') + ' (' + mainPortLabel(wheel) + ')';
      row.onclick = function () { selectRobotPart(wheel.id); };
      list.appendChild(row);
    });

    // Components
    robotState.components.forEach(function(comp) {
      var row = document.createElement('div');
      row.className = 'layer' + (comp.id === selectedRobotPartId ? ' active' : '');
      var color = comp.type.indexOf('Sensor') !== -1 ? '#22c55e' : '#ffd43b';
      row.innerHTML = '<span class="layer-color" style="background:' + color + '"></span><span></span><small></small><button class="danger" title="Eliminar pieza" style="margin-left:auto;padding:1px 6px;font-size:10px;line-height:1;">X</button>';

      var nameSuffix = '';
      if (comp.defaultActive === false) {
        nameSuffix = ' (Inactivo)';
        row.style.opacity = '0.6';
      }

      row.children[1].textContent = comp.name + ' (' + mainPortLabel(comp) + ')' + nameSuffix;
      row.children[2].textContent = comp.type.replace('Sensor', '').replace('Actuator', '');
      row.onclick = function () { selectRobotPart(comp.id); };
      row.children[3].onclick = function (event) {
        event.stopPropagation();
        removeRobotPart(comp.id);
      };
      list.appendChild(row);
    });
  }


  function createPartPreviewRoot(comp, pivot) {
    var root = new BABYLON.TransformNode(comp.id, robotScene);
    root.parent = pivot;
    root.metadata = {stblockPartId: comp.id};
    robotMeshes[comp.id] = root;
    return root;
  }

  function applyPartPreviewMesh(mesh, comp, root, material) {
    mesh.parent = root;
    mesh.metadata = Object.assign({}, mesh.metadata, {stblockPartId: comp.id});
    if (material) mesh.material = material;
    if (selectedRobotPartId === comp.id) mesh.showBoundingBox = true;
    return mesh;
  }

  function previewMaterial(name, color) {
    var mat = robotScene.getMaterialByName(name);
    if (!mat) {
      mat = new BABYLON.StandardMaterial(name, robotScene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(color);
      mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.18);
    }
    return mat;
  }

  function applyCustomPresetSegmentTransform(segment, node) {
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

  function createCustomPresetPivotedNode(comp, segment, parent) {
    var baseRoot = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-base', robotScene);
    baseRoot.parent = parent;
    baseRoot.metadata = {stblockPartId: comp.id};
    applyCustomPresetSegmentTransform(segment, baseRoot);

    var pivotNode = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-pivot', robotScene);
    pivotNode.parent = baseRoot;
    pivotNode.position = vectorFromArray(segment.pivot, [0, 0, 0]);
    pivotNode.metadata = {stblockPartId: comp.id};
    return {base: baseRoot, pivot: pivotNode, visualOffset: vectorFromArray(segment.pivot, [0, 0, 0]).scale(-1)};
  }

  function importRobotPresetSegmentModel(comp, segment, parent, material) {
    if (!segment.modelURL || !robotScene) return false;
    var url = segment.modelURL;
    var slash = url.lastIndexOf('/');
    var rootUrl = slash >= 0 ? url.slice(0, slash + 1) : '';
    var file = slash >= 0 ? url.slice(slash + 1) : url;
    BABYLON.SceneLoader.ImportMesh('', rootUrl, file, robotScene, function(meshes) {
      var pivoted = createCustomPresetPivotedNode(comp, segment, parent);
      var modelRoot = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-model', robotScene);
      modelRoot.parent = pivoted.pivot;
      modelRoot.position = pivoted.visualOffset;
      modelRoot.metadata = {stblockPartId: comp.id};
      meshes.forEach(function(mesh) {
        mesh.parent = modelRoot;
        mesh.metadata = {stblockPartId: comp.id};
        if (material) mesh.material = material;
        if (selectedRobotPartId === comp.id) mesh.showBoundingBox = true;
      });
    }, null, function() {
      toast('No se pudo mostrar modelo de preset: ' + (segment.modelName || segment.name || segment.id));
    });
    return true;
  }

  function createCustomPiecePresetPreview(comp, root) {
    var preset = comp.customPreset || (comp.options && comp.options.customPreset) || {};
    var segments = preset.segments || [];
    console.log('[STBlock AdminPreset] preview custom preset', {id: comp.id, name: comp.name, type: comp.type, presetId: preset.id || comp.customPresetId, segments: segments.length});
    if (!segments.length) {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-custom-empty', {width: 4, height: 3, depth: 4}, robotScene), comp, root, previewMaterial('previewCustomPresetMat', '#38BDF8'));
      return root;
    }
    segments.forEach(function(segment, index) {
      var segMat = previewMaterial('previewPresetSegmentMat-' + (segment.color || '#38BDF8').replace('#', ''), segment.color || (index === 0 ? '#38BDF8' : '#F59E0B'));
      var pivoted = createCustomPresetPivotedNode(comp, segment, root);
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
      if (!segment.modelURL) return;
      var url = segment.modelURL;
      var slash = url.lastIndexOf('/');
      var rootUrl = slash >= 0 ? url.slice(0, slash + 1) : '';
      var file = slash >= 0 ? url.slice(slash + 1) : url;
      console.log('[STBlock AdminPreset] cargando STL', {component: comp.id, segment: segment.id, root: rootUrl, file: file});
      BABYLON.SceneLoader.ImportMesh('', rootUrl, file, robotScene, function(meshes) {
        console.log('[STBlock AdminPreset] STL cargado', {component: comp.id, segment: segment.id, meshes: meshes && meshes.length});
        if (fallback && !fallback.isDisposed()) fallback.dispose();
        var modelRoot = new BABYLON.TransformNode(comp.id + '-' + segment.id + '-model', robotScene);
        modelRoot.parent = pivoted.pivot;
        modelRoot.position = pivoted.visualOffset;
        modelRoot.metadata = {stblockPartId: comp.id};
        (meshes || []).forEach(function(mesh) {
          mesh.parent = modelRoot;
          mesh.metadata = Object.assign({}, mesh.metadata, {stblockPartId: comp.id});
          mesh.material = segMat;
          if (selectedRobotPartId === comp.id) mesh.showBoundingBox = true;
        });
      }, null, function(scene, message, exception) {
        console.error('[STBlock AdminPreset] error cargando STL', {component: comp.id, segment: segment.id, url: segment.modelURL, message: message, exception: exception});
        toast('No se pudo mostrar modelo de preset: ' + (segment.modelName || segment.name || segment.id));
      });
    });
    return root;
  }

  function createRobotComponentPreview(comp, compMat, pivot) {
    var opts = comp.options || {};
    var root = createPartPreviewRoot(comp, pivot);
    var baseMat = previewMaterial('previewBaseMat', '#A39C0D');
    var pivotMat = previewMaterial('previewPivotMat', '#808080');
    var armMat = previewMaterial('previewArmMat', '#A3CF0D');
    var darkMat = previewMaterial('previewDarkMat', '#262626');
    var orangeMat = previewMaterial('previewOrangeMat', '#E1A32B');

    if (comp.customPreset || comp.type === 'CustomPiecePreset' || comp.type === 'CustomServoActuator' || comp.type === 'CustomMotorActuator' || comp.type === 'CustomLinearActuator') {
      return createCustomPiecePresetPreview(comp, root);
    }

    if (comp.type === 'ArmActuator') {
      var armLength = Number(opts.armLength) || 18;
      var baseA = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-base-a', {height: 3, width: 0.5, depth: 3}, robotScene), comp, root, baseMat);
      baseA.position.x = -0.75;
      var baseB = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-base-b', {height: 3, width: 0.5, depth: 3}, robotScene), comp, root, baseMat);
      baseB.position.x = 0.75;
      var pivotMesh = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-pivot', {height: 0.5, width: 2.4, depth: 0.5}, robotScene), comp, root, pivotMat);
      pivotMesh.position.y = 0.5;
      var arm = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-arm', {height: 1, width: 1, depth: armLength}, robotScene), comp, root, armMat);
      arm.position.y = 0.5;
      arm.position.z = (armLength / 2) - 1;
      return root;
    }

    if (comp.type === 'SwivelActuator') {
      var width = Number(opts.width) || 3;
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-base', {height: 1, width: width, depth: width}, robotScene), comp, root, baseMat);
      var platform = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-platform', {height: 0.5, diameter: width / 3 * 2.5, tessellation: 24}, robotScene), comp, root, pivotMat);
      platform.position.y = 0.75;
      return root;
    }

    if (comp.type === 'LinearActuator') {
      var linearWidth = Number(opts.width) || 2;
      var baseLength = Number(opts.baseLength) || 5;
      var baseThickness = Number(opts.baseThickness) || 1;
      var platformLength = Number(opts.platformLength) || 2;
      var platformThickness = Number(opts.platformThickness) || 1;
      var startPos = Number(opts.startPos) || 0;
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-base', {height: linearWidth, width: baseLength, depth: baseThickness}, robotScene), comp, root, baseMat);
      var slider = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-platform', {height: linearWidth, width: platformLength, depth: platformThickness}, robotScene), comp, root, pivotMat);
      slider.position.z = (baseThickness + platformThickness) / 2;
      slider.position.x = startPos;
      return root;
    }

    if (comp.type === 'MagnetActuator') {
      var attractor = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-attractor', {height: 1, diameter: 2, tessellation: 24}, robotScene), comp, root, pivotMat);
      attractor.position.y = -0.75;
      var rear = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-rear', {height: 2, width: 2, depth: 2}, robotScene), comp, root, compMat);
      rear.position.y = 0.25;
      return root;
    }

    if (comp.type === 'Pen') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {height: 3, width: 1.5, depth: 1.5}, robotScene), comp, root, orangeMat);
      var tip = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-tip', {height: 1, diameterTop: 1.5, diameterBottom: 0.01, tessellation: 4}, robotScene), comp, root, darkMat);
      tip.position.y = -2;
      return root;
    }

    if (comp.type === 'PaintballLauncherActuator') {
      var launcher = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-barrel', {diameter: 1.4, height: 6, tessellation: 24}, robotScene), comp, root, compMat);
      launcher.rotation.x = Math.PI / 2;
      launcher.position.z = 2;
      return root;
    }

    if (comp.type === 'WheelPassive') {
      var passiveWheel = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id, {
        diameter: (comp.radius || 2.5) * 2,
        height: comp.width || 1.5,
        tessellation: 24
      }, robotScene), comp, root, darkMat);
      passiveWheel.rotation.z = Math.PI / 2;
      return root;
    }

    if (isStructuralPart(comp)) {
      var structOpts = comp.options || {};
      var structMesh = null;
      if (comp.type === 'Cylinder') {
        structMesh = BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {
          diameter: Number(structOpts.diameter) || 4,
          height: Number(structOpts.height) || 2,
          tessellation: 32
        }, robotScene);
      } else if (comp.type === 'Sphere') {
        structMesh = BABYLON.MeshBuilder.CreateSphere(comp.id + '-body', {
          diameter: Number(structOpts.diameter) || 4,
          segments: 24
        }, robotScene);
      } else {
        structMesh = BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {
          width: Number(structOpts.width) || 6,
          height: Number(structOpts.height) || 2,
          depth: Number(structOpts.depth) || 6
        }, robotScene);
      }
      applyPartPreviewMesh(structMesh, comp, root, compMat);
      return root;
    }

    var sensorBodyMat = previewMaterial('previewSensorBodyMat', '#22C55E');
    var sensorDarkMat = previewMaterial('previewSensorDarkMat', '#111827');
    var sensorLensMat = previewMaterial('previewSensorLensMat', '#E600E6');
    var sensorRedMat = previewMaterial('previewSensorRedMat', '#E60000');
    var sensorBlueMat = previewMaterial('previewSensorBlueMat', '#0077CC');
    var sensorMetalMat = previewMaterial('previewSensorMetalMat', '#C0C0C0');

    if (comp.type === 'UltrasonicSensor') {
      var sonarBody = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 5, height: 2, depth: 2}, robotScene), comp, root, sensorBodyMat);
      sonarBody.position.z = -0.25;
      var eyeL = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eye-l', {height: 0.5, diameter: 2, tessellation: 24}, robotScene), comp, root, sensorLensMat);
      eyeL.rotation.x = -Math.PI / 2;
      eyeL.position.x = -1.5;
      eyeL.position.z = 1;
      var eyeR = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-eye-r', {height: 0.5, diameter: 2, tessellation: 24}, robotScene), comp, root, sensorLensMat);
      eyeR.rotation.x = -Math.PI / 2;
      eyeR.position.x = 1.5;
      eyeR.position.z = 1;
      return root;
    }

    if (comp.type === 'ColorSensor') {
      var colorBody = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 2, height: 2, depth: 3}, robotScene), comp, root, sensorBodyMat);
      colorBody.position.z = -0.35;
      var colorEye = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-eye', {diameterX: 1, diameterY: 1, diameterZ: 0.6, segments: 16}, robotScene), comp, root, sensorRedMat);
      colorEye.position.z = 1.35;
      return root;
    }

    if (comp.type === 'TouchSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 2.5, height: 2, depth: 2.5}, robotScene), comp, root, previewMaterial('previewTouchBodyMat', '#FFFFFF'));
      var button = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-button', {width: 2.2, height: 0.55, depth: 2.2}, robotScene), comp, root, sensorRedMat);
      button.position.y = -1.25;
      return root;
    }

    if (comp.type === 'GyroSensor' || comp.type === 'GPSSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 2, height: 1, depth: 2}, robotScene), comp, root, sensorBodyMat);
      var plate = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-plate', {diameter: 1.35, height: 0.18, tessellation: 24}, robotScene), comp, root, sensorDarkMat);
      plate.position.y = 0.6;
      return root;
    }

    if (comp.type === 'LineFollowerSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 4, height: 0.6, depth: 1.5}, robotScene), comp, root, sensorDarkMat);
      [-1.5, 0, 1.5].forEach(function (x, index) {
        var eye = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-line-eye-' + index, {diameter: 0.55, segments: 12}, robotScene), comp, root, sensorRedMat);
        eye.position.x = x;
        eye.position.y = -0.45;
        eye.position.z = 0.25;
      });
      return root;
    }

    if (comp.type === 'GasSensor') {
      var gas = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {diameter: 1.5, height: 1.2, tessellation: 24}, robotScene), comp, root, previewMaterial('previewGasMat', '#888888'));
      var cap = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-cap', {diameter: 0.9, height: 0.18, tessellation: 24}, robotScene), comp, root, sensorDarkMat);
      cap.position.y = 0.7;
      return root;
    }

    if (comp.type === 'TemperatureSensor') {
      var stem = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-stem', {diameter: 0.35, height: 2.2, tessellation: 16}, robotScene), comp, root, sensorMetalMat);
      stem.rotation.z = Math.PI / 2;
      var bulb = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-bulb', {diameter: 0.8, segments: 16}, robotScene), comp, root, sensorRedMat);
      bulb.position.x = -1.1;
      return root;
    }

    if (comp.type === 'HumiditySensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 1.4, height: 0.3, depth: 1.4}, robotScene), comp, root, sensorBlueMat);
      var drop = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateSphere(comp.id + '-drop', {diameterX: 0.55, diameterY: 0.75, diameterZ: 0.55, segments: 16}, robotScene), comp, root, previewMaterial('previewHumidityDropMat', '#38BDF8'));
      drop.position.y = 0.45;
      return root;
    }

    if (comp.type === 'LaserRangeSensor') {
      var laser = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 1.5, height: 2.5, depth: 1.5}, robotScene), comp, root, sensorBodyMat);
      var emitter = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-emitter', {height: 0.25, diameter: 0.8, tessellation: 16}, robotScene), comp, root, sensorRedMat);
      emitter.rotation.x = Math.PI / 2;
      emitter.position.z = 0.85;
      var beam = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-beam', {width: 0.12, height: 0.12, depth: 2.4}, robotScene), comp, root, sensorRedMat);
      beam.position.z = 2.1;
      return root;
    }

    if (comp.type === 'LidarSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-body', {diameter: 4, height: 1, tessellation: 32}, robotScene), comp, root, sensorBodyMat);
      var head = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-head', {diameter: 2.2, height: 0.35, tessellation: 32}, robotScene), comp, root, sensorDarkMat);
      head.position.y = 0.65;
      for (var rayIndex = 0; rayIndex < 4; rayIndex++) {
        var ray = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-ray-' + rayIndex, {width: 0.08, height: 0.08, depth: 3.2}, robotScene), comp, root, sensorLensMat);
        ray.position.y = 0.85;
        ray.rotation.y = rayIndex * Math.PI / 2;
        ray.position.x = Math.sin(ray.rotation.y) * 1.6;
        ray.position.z = Math.cos(ray.rotation.y) * 1.6;
      }
      return root;
    }

    if (comp.type === 'CameraSensor') {
      applyPartPreviewMesh(BABYLON.MeshBuilder.CreateBox(comp.id + '-body', {width: 1.5, height: 1.5, depth: 2.5}, robotScene), comp, root, sensorBodyMat);
      var lens = applyPartPreviewMesh(BABYLON.MeshBuilder.CreateCylinder(comp.id + '-lens', {height: 0.45, diameter: 1, tessellation: 24}, robotScene), comp, root, sensorDarkMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 1.35;
      return root;
    }

    var mesh = BABYLON.MeshBuilder.CreateBox(comp.id, {width: 2, height: 2, depth: 2}, robotScene);
    applyPartPreviewMesh(mesh, comp, root, compMat);
    return root;
  }

  function renderRobot3D() {
    console.log("[STBLOCK-DEBUG] renderRobot3D starting. robotScene exists:", !!robotScene);
    if (!robotScene) return;
    normalizeCustomPresetRobotParts();
    console.log('[STBlock AdminPreset] render components', (robotState.components || []).map(function(comp) {
      return {
        id: comp.id,
        name: comp.name,
        type: comp.type,
        customPresetId: comp.customPresetId || (comp.options && comp.options.customPresetId) || null,
        hasPreset: !!(comp.customPreset || (comp.options && comp.options.customPreset))
      };
    }));

    // Clear all existing meshes, transform nodes and materials (except grid and its material)
    if (robotScene.meshes) {
      var meshesToDispose = robotScene.meshes.filter(function (m) {
        return m.name !== 'grid';
      });
      meshesToDispose.forEach(function (m) { m.dispose(); });
    }
    if (robotScene.transformNodes) {
      var nodesToDispose = robotScene.transformNodes.slice();
      nodesToDispose.forEach(function (n) { n.dispose(); });
    }
    if (robotScene.materials) {
      var matsToDispose = robotScene.materials.filter(function (mat) {
        return mat.name !== 'gridMat';
      });
      matsToDispose.forEach(function (mat) { mat.dispose(); });
    }
    robotMeshes = {};

    // 1. Chassis mesh
    var chassisMat = new BABYLON.StandardMaterial("chassisMat", robotScene);
    chassisMat.diffuseColor = BABYLON.Color3.FromHexString(robotState.chassis.color || '#f09c0d');
    chassisMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    if (robotState.chassisType === 'custom' && robotState.chassis.modelURL) {
      renderCustomRobotChassis(chassisMat);
    } else {
      // Default parametric box
      var chassis = BABYLON.MeshBuilder.CreateBox("chassis", {
        width: robotState.chassis.size[0],
        depth: robotState.chassis.size[1],
        height: robotState.chassis.size[2]
      }, robotScene);
      chassis.material = chassisMat;
      chassis.position.y = robotState.chassis.size[2] / 2 + (Number(robotState.chassis.yOffset) || 0);
      robotMeshes['chassis'] = chassis;
    }

    // 2. Render Wheels
    var wheelMat = new BABYLON.StandardMaterial("wheelMat", robotScene);
    wheelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);

    robotState.wheels.forEach(function(wheel) {
      var wMesh = BABYLON.MeshBuilder.CreateCylinder("wheel-" + wheel.id, {
        diameter: wheel.radius * 2,
        height: wheel.width || 2,
        tessellation: 16
      }, robotScene);
      wMesh.material = wheelMat;
      // Position wheel
      wMesh.position = new BABYLON.Vector3(wheel.position[0], wheel.position[1] + wheel.radius, wheel.position[2]);
      wMesh.rotation.z = Math.PI / 2; // Turn cylinder sideways
      wMesh.metadata = Object.assign({}, wMesh.metadata, {stblockPartId: wheel.id});
      robotMeshes[wheel.id] = wMesh;
      if (selectedRobotPartId === wheel.id) wMesh.showBoundingBox = true;
    });

    // 3. Render Components
    robotState.components.forEach(function(comp) {
      var compMat = new BABYLON.StandardMaterial("compMat-" + comp.id, robotScene);
      var isSensor = comp.type.indexOf('Sensor') !== -1;
      if (isStructuralPart(comp)) {
        compMat.diffuseColor = BABYLON.Color3.FromHexString('#' + String((comp.options && comp.options.color) || 'A3CF0D').replace('#', ''));
      } else {
        compMat.diffuseColor = isSensor ? new BABYLON.Color3(0.1, 0.8, 0.3) : new BABYLON.Color3(0.9, 0.8, 0.1);
      }

      // Pivot helper parent mesh
      var pivot = new BABYLON.TransformNode("pivot-" + comp.id, robotScene);
      pivot.metadata = {stblockPartId: comp.id};
      pivot.position = new BABYLON.Vector3(comp.position[0], comp.position[1], comp.position[2]);
      pivot.rotation = new BABYLON.Vector3(
        comp.rotation[0] * Math.PI / 180,
        comp.rotation[1] * Math.PI / 180,
        comp.rotation[2] * Math.PI / 180
      );

      var mesh = null;
      if (comp.options && comp.options.models && comp.options.models.length > 0) {
        var model = comp.options.models[0];
        var root = createPartPreviewRoot(comp, pivot);
        BABYLON.SceneLoader.ImportMesh("", "", model.url, robotScene, function (newMeshes) {
          mesh = newMeshes[0];
          (newMeshes || []).forEach(function (loadedMesh, index) {
            loadedMesh.name = index === 0 ? comp.id : comp.id + '-' + index;
            loadedMesh.metadata = Object.assign({}, loadedMesh.metadata, {stblockPartId: comp.id});
            loadedMesh.parent = root;
            loadedMesh.material = compMat;
            var modelScale = Number(model.scale) || 1;
            loadedMesh.scaling = new BABYLON.Vector3(modelScale, modelScale, modelScale);
            if (selectedRobotPartId === comp.id) loadedMesh.showBoundingBox = true;
          });
        });
      } else {
        mesh = createRobotComponentPreview(comp, compMat, pivot);
      }
    });

    // 4. Hierarchy Parenting Second Pass
    robotState.components.forEach(function(comp) {
      var pivot = robotScene.getTransformNodeByName("pivot-" + comp.id);
      if (pivot && comp.parentId && comp.parentId !== 'chassis' && (!comp.options || comp.options.attachMode !== 'free')) {
        var parentMesh = robotMeshes[comp.parentId];
        if (parentMesh) {
          pivot.parent = parentMesh;
        }
      }
    });
  }

  async function saveAdminRobot() {
    if (selectedRobotPartId) syncRobotPartFromForm(activePartConnectionBoard);
    syncRobotStateFromForm();
    normalizeCustomPresetRobotParts();
    var response = await fetch(API_BASE + '/api/gears/robots/admin/' + encodeURIComponent(robotState.id), {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(robotState)
    });
    if (!response.ok) throw new Error(await response.text());
    toast('Robot guardado con exito');
    await refreshAdminRobots();
    return response.json();
  }

  async function refreshAdminRobots() {
    try {
      var list = await fetch(API_BASE + '/api/gears/robots/admin').then(function(r) { return r.json(); });
      var container = $('savedAdminRobots');
      if (!container) return;
      container.innerHTML = '';
      list.forEach(function(robot) {
        var row = document.createElement('div');
        row.className = 'saved-map';

        var load = document.createElement('button');
        load.textContent = robot.name;
        load.onclick = function() { loadRobotUrl(robot.url); };

        var remove = document.createElement('button');
        remove.textContent = 'X';
        remove.className = 'danger';
        remove.onclick = async function() {
          await fetch(API_BASE + '/api/gears/robots/admin/' + encodeURIComponent(robot.id), {method: 'DELETE'});
          refreshAdminRobots();
        };

        row.append(load, remove);
        container.appendChild(row);
      });
    } catch(e) {}
  }

  // ============================================
  // ROBOTS PERSONALIZADOS (localStorage)
  // ============================================
  function refreshCustomRobots() {
    if (typeof customRobotStorage === 'undefined') {
      console.warn('[EDITOR] customRobotStorage no está disponible');
      return;
    }

    var container = $('savedCustomRobots');
    if (!container) return;

    var robots = customRobotStorage.getAll();
    container.innerHTML = '';

    if (robots.length === 0) {
      container.innerHTML = '<div class="empty">No hay robots personalizados guardados.</div>';
      return;
    }

    robots.forEach(function(robot) {
      var row = document.createElement('div');
      row.className = 'saved-map';

      var load = document.createElement('button');
      load.textContent = robot.name || robot.id;
      load.title = 'Cargar este robot en el editor';
      load.onclick = function() {
        loadCustomRobot(robot.id);
      };

      var edit = document.createElement('button');
      edit.textContent = '✏️';
      edit.title = 'Abrir en el Editor de Robots para Niños';
      edit.onclick = function() {
        window.open('../custom-robot-builder/index.html?edit=' + encodeURIComponent(robot.id), '_blank');
      };

      var remove = document.createElement('button');
      remove.textContent = 'X';
      remove.className = 'danger';
      remove.title = 'Eliminar este robot';
      remove.onclick = (function(r) {
        return function() {
          showConfirm('¿Eliminar el robot "' + (r.name || r.id) + '"?', function() {
            customRobotStorage.remove(r.id);
            refreshCustomRobots();
            toast('Robot eliminado');
          });
        };
      })(robot);

      row.append(load, edit, remove);
      container.appendChild(row);
    });
  }

  function loadCustomRobot(robotId) {
    if (typeof customRobotStorage === 'undefined') return;

    var robot = customRobotStorage.getById(robotId);
    if (!robot) {
      toast('Robot no encontrado');
      return;
    }

    // Convertir formato customRobot a formato editor
    robotState = {
      id: robot.id,
      name: robot.name || 'Robot Personalizado',
      chassisType: robot.chassisType || 'box',
      chassis: robot.chassis || { size: [15, 20, 8], yOffset: 0, mass: 120, friction: 0.5, color: '#f09c0d' },
      wheels: robot.wheels || [],
      components: robot.components || [],
      boardType: robot.boardType || 'stbBoardV2',
      isCustomRobot: true,
      customRobotSource: robotId
    };

    selectedRobotPartId = null;
    loadRobotForm();
    if (robotScene) renderRobot3D();
    toast('Robot "' + robotState.name + '" cargado');
  }

  function syncRobotToCustomStorage() {
    if (typeof customRobotStorage === 'undefined') {
      toast('Error: Sistema de almacenamiento no disponible');
      return;
    }

    // Sincronizar formulario con estado
    if (selectedRobotPartId) syncRobotPartFromForm(activePartConnectionBoard);
    syncRobotStateFromForm();

    // Preparar robot para guardar
    var robotToSave = {
      id: robotState.customRobotSource || robotState.id || ('custom-robot-' + Date.now()),
      name: robotState.name || 'Mi Robot',
      boardType: robotState.boardType || 'stbBoardV2',
      chassisType: robotState.chassisType || 'box',
      chassis: robotState.chassis,
      wheels: robotState.wheels || [],
      components: robotState.components || [],
      thumbnail: '' // Se puede generar del canvas si es necesario
    };

    // Generar thumbnail si hay canvas disponible
    if (robotCanvas && typeof customRobotStorage.generateThumbnail === 'function') {
      try {
        robotToSave.thumbnail = customRobotStorage.generateThumbnail(robotCanvas);
      } catch (e) {
        console.warn('No se pudo generar thumbnail:', e);
      }
    }

    try {
      customRobotStorage.save(robotToSave);
      robotState.customRobotSource = robotToSave.id; // Recordar el ID para futuras sincronizaciones
      refreshCustomRobots();
      toast('Robot guardado en "Mis Robots Personalizados"');
    } catch (e) {
      toast('Error al guardar: ' + e.message);
    }
  }

  function withCacheBuster(url) {
    var separator = String(url || '').indexOf('?') === -1 ? '?' : '&';
    return url + separator + 'v=' + Date.now();
  }

  async function loadRobotUrl(url) {
    try {
      var data = await fetch(withCacheBuster(url)).then(function(r) { return r.json(); });
      robotState = data;
      loadRobotForm();
      if (robotScene) renderRobot3D();
      toast('Robot cargado');
    } catch(e) { toast('Error cargando el robot'); }
  }

  function bind() {
    document.querySelectorAll('[data-add]').forEach(function (button) {
      button.onclick = function () { makeObject(button.dataset.add); };
    });
    document.querySelectorAll('.tabs button').forEach(function (button) {
      button.onclick = function () {
        document.querySelectorAll('.tabs button,.tab').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
        var panel = document.querySelector('[data-panel="' + button.dataset.tab + '"]');
        if (panel) panel.classList.add('active');
      };
    });
    document.querySelectorAll('input,select,textarea').forEach(function (input) {
      input.addEventListener('change', function () {
        syncStateFromForm();
        if (input.closest('#objectInspector')) syncObjectFromForm();
        renderAll();
      });
    });
    $('mapName').addEventListener('input', function () {
      if ($('mapId').value === 'nuevo-escenario') $('mapId').value = slug($('mapName').value);
    });
    $('surfaceType').onchange = function () {
      var preset = surfacePresets[$('surfaceType').value];
      $('groundFriction').value = preset.friction;
      $('groundRestitution').value = preset.restitution;
      textureUrl = '';
      syncStateFromForm();
      renderAll();
    };
    $('groundTexture').onchange = async function () {
      var file = $('groundTexture').files[0];
      if (!file) return;
      textureUrl = (await uploadAsset(file)).url;
      var dimensions = await imageDimensions(file);
      textureDimensions = dimensions;
      state.editor.textureDimensions = dimensions;
      state.options.imageScale = 1;
      state.options.uScale = state.options.length * 10 / dimensions.width;
      state.options.vScale = state.options.width * 10 / dimensions.height;
      $('surfaceType').value = 'custom';
      toast('Textura cargada');
    };
    $('addModel').onclick = function () { $('modelFile').click(); };
    $('generateMaze').onclick = generateMaze;
    $('clearMaze').onclick = function () {
      state.options.objects = state.options.objects.filter(function (object) {
        return object.editorType !== 'wall' && !object.generatedMaze;
      });
      selectedId = null; renderAll(); toast('Paredes interiores eliminadas');
    };

    $('addRule').onclick = function () {
      if (!$('ruleTrigger').value) { toast('Agrega y selecciona una zona activadora'); return; }
      var action = $('ruleAction').value;
      var skipTarget = ['lightOn', 'lightOff', 'startTimer', 'stopTimer', 'resetTimer', 'addTime',
        'resetScore', 'scoreGoal'].indexOf(action) !== -1;
      if (!skipTarget && !$('ruleTarget').value) {
        toast('Selecciona un objeto objetivo'); return;
      }
      state.options.rules = state.options.rules || [];
      var rule = {
        id: 'rule-' + Date.now(),
        name: action + ' al entrar en zona',
        triggerId: $('ruleTrigger').value,
        actorId: $('ruleActor').value || 'robot',
        targetId: $('ruleTarget').value,
        event: 'enter', action: action,
        offset: [number('ruleX', 0), number('ruleY', 0), number('ruleZ', 0)],
        duration: clamp(number('ruleDuration', 1), 0, 30),
        color: $('ruleColor').value,
        once: $('ruleOnce').checked,
        team: $('ruleTeam') ? $('ruleTeam').value : 'A'
      };
      state.options.rules.push(rule);
      renderRules(); toast('Accion agregada');
    };

    $('modelFile').onchange = async function () {
      var file = $('modelFile').files[0];
      if (!file) return;
      try {
        var extension = (file.name.split('.').pop() || '').toLowerCase();
        var asset = await uploadAsset(file);
        makeObject('model');
        var object = selected();
        object.type = 'model';
        object.modelURL = asset.url;
        object.name = file.name;
        object.modelUnit = extension === 'stl' ? 'mm' :
          extension === 'glb' || extension === 'gltf' ? 'm' : 'cm';
        object.modelScale = object.modelUnit === 'mm' ? 0.1 : object.modelUnit === 'm' ? 100 : 1;
        renderAll();
        toast('Modelo 3D cargado: ' + file.name);
      } catch (error) {
        toast('No se pudo cargar el modelo: ' + error.message);
      } finally {
        $('modelFile').value = '';
      }
    };
    $('saveMap').onclick = function () { saveMap().catch(function (error) { toast(error.message); }); };
    $('testMap').onclick = async function () {
      var testWindow = createGearbotTestWindow('stblock-world-test');
      try {
        toast('Preparando simulador...');
        var saved = await saveMap();
        syncStateFromForm();
        var page = state.options.arenaMode ? '../arena.html' : '../index.html';
        var worldUrl = gearbotEntityUrl('map', state.metadata.id, saved) + '?v=' + Date.now();
        var url = appendGearbotReturnParams(page + '?stblockWebGL=1-v12&worldJSON=' + encodeURIComponent(worldUrl), 'maps', state.metadata.id);
        openGearbotTest(url, 'stblock-world-test', testWindow);
      } catch (error) {
        if (testWindow && !testWindow.closed) testWindow.close();
        console.error('[STBLOCK-GEARBOT] No se pudo probar el escenario', error);
        toast('No se pudo abrir el simulador: ' + error.message);
      }
    };
    $('refreshMaps').onclick = refreshMaps;
    $('newMap').onclick = function () {
      state = createState();
      textureUrl = '';
      textureDimensions = null;
      selectedId = null;
      loadForm();
    };
    $('importMap').onclick = function () { $('jsonFile').click(); };
    $('jsonFile').onchange = function () {
      var reader = new FileReader();
      reader.onload = function () { try { applyPayload(JSON.parse(reader.result)); } catch (error) { toast(error.message); } };
      reader.readAsText($('jsonFile').files[0]);
    };
    $('exportMap').onclick = function () {
      var payload = mapPayload();
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
      link.download = payload.metadata.id + '.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };
    $('deleteObject').onclick = function () {
      state.options.objects = state.options.objects.filter(function (object) { return object.id !== selectedId; });
      selectedId = null; renderAll();
    };
    $('duplicateObject').onclick = function () {
      var object = selected(); if (!object) return;
      var copy = JSON.parse(JSON.stringify(object));
      copy.id = 'obj-' + Date.now(); copy.name += ' copia'; copy.position[0] += 10; copy.position[1] += 10;
      if (Array.isArray(copy.motionStart)) { copy.motionStart[0] += 10; copy.motionStart[1] += 10; }
      if (Array.isArray(copy.motionEnd)) { copy.motionEnd[0] += 10; copy.motionEnd[1] += 10; }
      state.options.objects.push(copy); selectedId = copy.id; renderAll();
    };

    // Animation
    $('addAnimKey').onclick = function () {
      var object = selected();
      if (!object) return;
      if (!object.animationKeys) object.animationKeys = [];
      var lastTime = 0;
      if (object.animationKeys.length > 0) {
        lastTime = object.animationKeys[object.animationKeys.length - 1].time || 0;
      }
      object.animationKeys.push({
        time: lastTime + 1,
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      });
      renderAnimationKeys(object);
      syncObjectFromForm();
    };
    $('clearAnimKeys').onclick = function () {
      var object = selected();
      if (!object) return;
      object.animationKeys = [];
      renderAnimationKeys(object);
      syncObjectFromForm();
    };

    // Sound upload - delegated handler for dynamically injected panels
    document.addEventListener('change', async function(event) {
      if (event.target.id === 'soundFile') {
        var file = event.target.files[0];
        if (!file) return;
        var asset = await uploadAsset(file);
        var object = selected();
        if (object) {
          object.soundURL = asset.url;
          object.name = file.name;
          renderAll();
          toast('Audio cargado');
        }
      }
    });

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', function (event) {
      if (dragging && event && event.pointerId != null) {
        try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
      }
      dragging = false;
      canvas.style.cursor = 'crosshair';
    });
    window.addEventListener('resize', resizeCanvas);
  }

  function pointerDown(event) {
    var rect = canvas.getBoundingClientRect();
    var point = canvasToWorld(event.clientX - rect.left, event.clientY - rect.top);
    var hit = state.options.objects.slice().reverse().find(function (object) {
      return Math.abs(point.x - object.position[0]) <= object.size[0] / 2 &&
        Math.abs(point.y - object.position[1]) <= object.size[1] / 2;
    });
    selectedId = hit ? hit.id : null;
    dragging = !!hit;
    if (dragging) {
      event.preventDefault();
      try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
      canvas.style.cursor = 'grabbing';
    }
    renderAll();
  }

  function imageDimensions(file) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(image.src);
        resolve({width: image.naturalWidth, height: image.naturalHeight});
      };
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });
  }

  function pointerMove(event) {
    if (!dragging || !selected()) return;
    event.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var point = canvasToWorld(event.clientX - rect.left, event.clientY - rect.top);
    var grid = $('snapEnabled').checked ? Math.max(1, number('gridSize', 10)) : 0;
    var object = selected();
    object.position[0] = grid ? Math.round(point.x / grid) * grid : Math.round(point.x * 10) / 10;
    object.position[1] = grid ? Math.round(point.y / grid) * grid : Math.round(point.y * 10) / 10;
    var halfX = state.options.length / 2 - object.size[0] / 2;
    var halfY = state.options.width / 2 - object.size[1] / 2;
    object.position[0] = clamp(object.position[0], -halfX, halfX);
    object.position[1] = clamp(object.position[1], -halfY, halfY);
    loadInspector();
    draw();
  }

  bind();
  initializeAdminLock();
  loadForm();
  initRobotEditor();

  var editorParams = new URLSearchParams(window.location.search);
  var isStudentMode = window.location.search.indexOf('mode=student') !== -1;
  if (isStudentMode) {
    document.body.classList.add('student-mode');
    if ($('adminLock')) $('adminLock').style.display = 'none';
    
    if (window.ScratchBlockly && typeof window.ScratchBlockly.registerAllBlocks === 'function') {
      try {
        window.ScratchBlockly.registerAllBlocks();
        console.log('[STBLOCK-STUDENT] Bloques de Scratch registrados correctamente para el alumno.');
      } catch (e) {
        console.warn('[STBLOCK-STUDENT] Error registrando bloques:', e);
      }
    }

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'load-student-evaluation') {
        console.log('[STBLOCK-STUDENT] Recibida evaluación del alumno:', event.data.evaluation);
        previewEvaluacion(event.data.evaluation);
      }
    });
  }
  var adminMode = editorParams.get('adminMode') || editorParams.get('mode');
  var returnRobotId = editorParams.get('robotId');
  var returnMapId = editorParams.get('mapId');
  var initialBoardType = editorParams.get('boardType');

  // Si viene de crear robot personalizado, bypass del login y ocultar otros tabs
  var isCustomRobotMode = adminMode === 'robots' && editorParams.get('mode');
  var loadFromStorage = editorParams.get('loadFromStorage') === 'true';

  if (isCustomRobotMode) {
    $('adminLock').style.display = 'none';
    // Ocultar tabs de Escenarios y Piezas
    if ($('switchToMaps')) $('switchToMaps').style.display = 'none';
    if ($('switchToParts')) $('switchToParts').style.display = 'none';
    // Cambiar título
    document.title = 'Editor de Robots - STBlock';

    // Si viene con loadFromStorage, cargar robot desde localStorage
    if (loadFromStorage) {
      setTimeout(function() {
        try {
          var savedRobot = localStorage.getItem('stblock_edit_robot');
          if (savedRobot) {
            var robotData = JSON.parse(savedRobot);
            // Limpiar localStorage después de cargar
            localStorage.removeItem('stblock_edit_robot');

            // Cargar el robot en el editor
            robotState = robotData;
            loadRobotForm();
            if (robotScene) renderRobot3D();
            toast('Robot "' + (robotData.name || 'Sin nombre') + '" cargado para edición');
          }
        } catch (e) {
          console.warn('[Editor] Error cargando robot desde localStorage:', e);
          toast('Error al cargar el robot');
        }
      }, 200);
    }
    // Si hay tarjeta especificada pero no loadFromStorage, es un robot nuevo
    else if (initialBoardType) {
      // La tarjeta se seleccionará automáticamente más abajo
    }
    // Si no hay tarjeta ni loadFromStorage, mostrar diálogo de selección (fallback)
    else {
      setTimeout(function() {
        showBoardSelectionDialog();
      }, 100);
    }
  }

  // Función para mostrar diálogo de selección de tarjeta
  function showBoardSelectionDialog() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:24px;max-width:500px;width:90%;color:white;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
    dialog.innerHTML =
      '<h2 style="margin:0 0 8px 0;font-size:20px;">Crear Robot Personalizado</h2>' +
      '<p style="color:#888;margin:0 0 20px 0;">Selecciona la tarjeta controladora para tu robot:</p>' +
      '<select id="boardSelectDialog" style="width:100%;padding:12px;font-size:16px;border-radius:8px;border:1px solid #333;background:#0d1424;color:white;margin-bottom:20px;">' +
        '<optgroup label="STBlock / STBoard">' +
          '<option value="stbBoardV2" selected>STBoard V2</option>' +
          '<option value="stBoardExtension">STBoard Extension</option>' +
        '</optgroup>' +
        '<optgroup label="Arduino">' +
          '<option value="arduinoUno">Arduino Uno</option>' +
          '<option value="arduinoNano">Arduino Nano</option>' +
          '<option value="arduinoLeonardo">Arduino Leonardo</option>' +
          '<option value="arduinoMega2560">Arduino Mega 2560</option>' +
          '<option value="arduinoUnoR4Minima">Arduino Uno R4 Minima</option>' +
          '<option value="arduinoUnoR4Wifi">Arduino Uno R4 WiFi</option>' +
          '<option value="makeyMakey">Makey Makey</option>' +
        '</optgroup>' +
        '<optgroup label="ESP32 / ESP8266">' +
          '<option value="arduinoEsp32">ESP32</option>' +
          '<option value="arduinoEsp32S3">ESP32-S3</option>' +
          '<option value="arduinoEsp8266NodeMCU">NodeMCU (ESP8266)</option>' +
        '</optgroup>' +
        '<optgroup label="Raspberry Pi Pico">' +
          '<option value="arduinoRaspberryPiPico">Raspberry Pi Pico</option>' +
          '<option value="arduinoRaspberryPiPicoW">Raspberry Pi Pico W</option>' +
          '<option value="arduinoRaspberryPiPico2">Raspberry Pi Pico 2</option>' +
          '<option value="arduinoRaspberryPiPico2W">Raspberry Pi Pico 2 W</option>' +
        '</optgroup>' +
        '<optgroup label="Micro:bit">' +
          '<option value="microbit">Micro:bit</option>' +
          '<option value="microbitV2">Micro:bit V2</option>' +
        '</optgroup>' +
        '<optgroup label="K210 (RISC-V)">' +
          '<option value="arduinoK210MaixDock">MaixDock</option>' +
          '<option value="arduinoK210Maixduino">Maixduino</option>' +
        '</optgroup>' +
        '<optgroup label="Otros">' +
          '<option value="ev3">LEGO MINDSTORMS EV3</option>' +
        '</optgroup>' +
      '</select>' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
        '<button id="boardSelectCancel" style="padding:10px 20px;border-radius:6px;border:1px solid #444;background:transparent;color:white;cursor:pointer;">Cancelar</button>' +
        '<button id="boardSelectConfirm" style="padding:10px 24px;border-radius:6px;border:none;background:#6366f1;color:white;cursor:pointer;font-weight:bold;">Continuar</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('boardSelectCancel').onclick = function() {
      window.close();
    };

    document.getElementById('boardSelectConfirm').onclick = function() {
      var selectedBoard = document.getElementById('boardSelectDialog').value;
      overlay.remove();

      // Seleccionar la tarjeta en el editor
      if ($('robotBoardType')) {
        var options = $('robotBoardType').options;
        for (var i = 0; i < options.length; i++) {
          options[i].selected = (options[i].value === selectedBoard);
        }
      }

      // Ir a la pestaña de robots
      $('switchToRobots').click();
    };
  }

  if (adminMode === 'robots') {
    setTimeout(function () {
      $('switchToRobots').click();
      // Si hay tarjeta especificada, seleccionarla
      if (initialBoardType && $('robotBoardType')) {
        var options = $('robotBoardType').options;
        for (var i = 0; i < options.length; i++) {
          options[i].selected = (options[i].value === initialBoardType);
        }
      }
      if (returnRobotId) {
        loadRobotUrl(gearbotEntityUrl('robot', returnRobotId)).catch(function () {});
      }
    }, 60);
  } else if (adminMode === 'maps') {
    setTimeout(function () {
      $('switchToMaps').click();
      if (returnMapId) {
        loadMapUrl(gearbotEntityUrl('map', returnMapId)).catch(function () {});
      }
    }, 60);
  } else if (adminMode === 'parts') {
    setTimeout(function () {
      if ($('switchToParts')) $('switchToParts').click();
    }, 60);
  }

  refreshMaps().catch(function () { toast('No se pudo leer la biblioteca local'); });
  setTimeout(resizeCanvas, 0);

  // ====================================================================
  // SISTEMA DE EVALUACIONES - STBlock Tutor Panel
  // ====================================================================

  var evaluacionState = createDefaultEvaluacionState();
  var selectedEjercicioId = null;
  var evaluacionesInitialized = false;

  // Tipos de ejercicios con sus configuraciones
  var TIPOS_EJERCICIO = {
    quiz: { nombre: 'Quiz', color: '#9966FF', icono: '❓' },
    verdadero_falso: { nombre: 'Verdadero/Falso', color: '#22c55e', icono: '✓✗' },
    multiple_respuesta: { nombre: 'Selección Múltiple', color: '#3b82f6', icono: '☑️' },
    relacionar: { nombre: 'Relacionar', color: '#f59e0b', icono: '🔗' },
    completar_codigo: { nombre: 'Completar Código', color: '#4C97FF', icono: '📝' },
    ordenar_bloques: { nombre: 'Ordenar Bloques', color: '#FFAB19', icono: '📊' },
    que_hace_codigo: { nombre: '¿Qué Hace?', color: '#CF63CF', icono: '🔍' },
    escribir_codigo: { nombre: 'Escribir Código', color: '#FF8C1A', icono: '💻' },
    depurar_codigo: { nombre: 'Depurar', color: '#ef4444', icono: '🐛' },
    reto_ejecucion: { nombre: 'Reto', color: '#00b359', icono: '🎯' },
    // Ejercicios con bloques visuales
    bloques_completar: { nombre: 'Completar Bloques', color: '#4C97FF', icono: '🧩', esBloque: true },
    bloques_ordenar: { nombre: 'Ordenar Bloques', color: '#FFAB19', icono: '🔢', esBloque: true },
    bloques_armar: { nombre: 'Armar Programa', color: '#9966FF', icono: '🏗️', esBloque: true },
    bloques_corregir: { nombre: 'Corregir Bloques', color: '#ef4444', icono: '🔧', esBloque: true },
    // Ejercicios de electrónica con simulador Velxio
    circuito_armar: { nombre: 'Armar Circuito', color: '#00979C', icono: '🔌' },
    circuito_depurar: { nombre: 'Depurar Circuito', color: '#ef4444', icono: '🔧' },
    circuito_cuestionario: { nombre: 'Circuito + Quiz', color: '#3b82f6', icono: '☑️' },
    circuito_codigo: { nombre: 'Circuito + Código', color: '#FF8C1A', icono: '💻' }
  };

  // Plantillas predefinidas
  var PLANTILLAS_EVALUACION = {
    bucles_basico: {
      titulo: 'Introducción a Bucles',
      nivel: 'basico',
      tiempoLimite: 15,
      tags: ['bucles', 'repetición', 'básico'],
      ejercicios: [
        { tipo: 'quiz', enunciado: '¿Qué bloque se usa para repetir acciones varias veces?', puntos: 10, opciones: [{texto: 'Repetir', correcta: true}, {texto: 'Si entonces', correcta: false}, {texto: 'Mover', correcta: false}] },
        { tipo: 'verdadero_falso', enunciado: 'El bloque "repetir 10 veces" ejecuta las acciones exactamente 10 veces.', puntos: 10, respuesta: true },
        { tipo: 'ordenar_bloques', enunciado: 'Ordena los bloques para hacer que el sprite se mueva en cuadrado:', puntos: 15, bloques: ['repetir 4 veces', 'mover 100 pasos', 'girar 90 grados', 'fin repetir'] },
        { tipo: 'completar_codigo', enunciado: 'Completa el código para dibujar un triángulo:', puntos: 15, codigo: 'repetir ___ veces\n  mover 100 pasos\n  girar ___ grados', respuestas: ['3', '120'] },
        { tipo: 'que_hace_codigo', enunciado: '¿Qué dibuja este código?', puntos: 10, codigo: 'repetir 6 veces\n  mover 50 pasos\n  girar 60 grados', resultado: 'Un hexágono' }
      ]
    },
    movimiento_101: {
      titulo: 'Movimiento Básico',
      nivel: 'basico',
      tiempoLimite: 10,
      tags: ['movimiento', 'coordenadas', 'básico'],
      ejercicios: [
        { tipo: 'quiz', enunciado: '¿Qué bloque mueve al sprite hacia adelante?', puntos: 10, opciones: [{texto: 'Mover X pasos', correcta: true}, {texto: 'Ir a x: y:', correcta: false}, {texto: 'Deslizar', correcta: false}] },
        { tipo: 'verdadero_falso', enunciado: 'El centro del escenario tiene coordenadas (0, 0).', puntos: 10, respuesta: true },
        { tipo: 'completar_codigo', enunciado: 'Completa para mover el sprite al centro:', puntos: 15, codigo: 'ir a x: ___ y: ___', respuestas: ['0', '0'] },
        { tipo: 'relacionar', enunciado: 'Relaciona cada bloque con su función:', puntos: 15, pares: [{izquierda: 'mover 10 pasos', derecha: 'Avanza en la dirección actual'}, {izquierda: 'ir a x: y:', derecha: 'Teletransporta a posición'}, {izquierda: 'girar 15 grados', derecha: 'Rota el sprite'}] }
      ]
    },
    condicionales: {
      titulo: 'Condicionales',
      nivel: 'intermedio',
      tiempoLimite: 20,
      tags: ['condicionales', 'si-entonces', 'lógica'],
      ejercicios: [
        { tipo: 'quiz', enunciado: '¿Cuándo se ejecuta el código dentro de "si entonces"?', puntos: 10, opciones: [{texto: 'Cuando la condición es verdadera', correcta: true}, {texto: 'Siempre', correcta: false}, {texto: 'Nunca', correcta: false}] },
        { tipo: 'verdadero_falso', enunciado: 'El bloque "si entonces sino" siempre ejecuta una de las dos ramas.', puntos: 10, respuesta: true },
        { tipo: 'que_hace_codigo', enunciado: '¿Qué hace este código?', puntos: 15, codigo: 'si <tocando borde?> entonces\n  rebotar si toca borde', resultado: 'Hace que el sprite rebote cuando toca el borde' },
        { tipo: 'completar_codigo', enunciado: 'Completa la condición:', puntos: 15, codigo: 'si <___ = 10> entonces\n  decir "¡Ganaste!"', respuestas: ['puntos'] },
        { tipo: 'ordenar_bloques', enunciado: 'Ordena para crear un detector de colisión:', puntos: 20, bloques: ['si <tocando sprite1?> entonces', 'cambiar puntos por 1', 'tocar sonido pop', 'fin si'] },
        { tipo: 'escribir_codigo', enunciado: 'Escribe un condicional que haga decir "Hola" si el sprite está en la mitad derecha del escenario.', puntos: 20, palabrasClave: ['si', 'posición x', '>', '0', 'decir'] }
      ]
    },
    variables: {
      titulo: 'Variables',
      nivel: 'intermedio',
      tiempoLimite: 15,
      tags: ['variables', 'datos', 'operadores'],
      ejercicios: [
        { tipo: 'quiz', enunciado: '¿Qué es una variable?', puntos: 10, opciones: [{texto: 'Un espacio para guardar datos', correcta: true}, {texto: 'Un tipo de bloque', correcta: false}, {texto: 'Un sprite especial', correcta: false}] },
        { tipo: 'verdadero_falso', enunciado: 'Las variables pueden cambiar su valor durante la ejecución del programa.', puntos: 10, respuesta: true },
        { tipo: 'completar_codigo', enunciado: 'Crea un contador que aumente cada segundo:', puntos: 15, codigo: 'fijar contador a ___\nrepetir siempre\n  esperar 1 segundo\n  cambiar contador por ___', respuestas: ['0', '1'] },
        { tipo: 'que_hace_codigo', enunciado: 'Analiza este código:', puntos: 15, codigo: 'fijar vidas a 3\nrepetir hasta que <vidas = 0>\n  cambiar vidas por -1\n  esperar 1 segundo', resultado: 'Cuenta regresiva de 3 a 0, restando 1 cada segundo' },
        { tipo: 'depurar_codigo', enunciado: 'Encuentra y corrige el error:', puntos: 20, codigoError: 'fijar puntos a 0\nsi <tocando enemigo?> entonces\n  fijar puntos a 0', codigoCorregido: 'fijar puntos a 0\nsi <tocando enemigo?> entonces\n  cambiar puntos por -1' }
      ]
    }
  };

  function createDefaultEvaluacionState() {
    return {
      id: 'eval-' + Date.now(),
      titulo: 'Nueva Evaluación',
      descripcion: '',
      nivel: 'basico',
      tiempoLimite: 15,
      tags: [],
      ejercicios: [],
      notificarResultado: 'avanzar',
      reglaSalida: 'continuar',
      ejerciciosAzar: 0,
      tiempoAlerta: 1,
      permitirRetroceder: true,
      entorno: 'robotica',
      tarjeta: 'stbBoardV2',
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };
  }

  function createDefaultEjercicio(tipo) {
    var base = {
      id: 'ej-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      tipo: tipo,
      enunciado: '',
      puntos: 10,
      intentosMax: -1,
      pista: '',
      explicacion: ''
    };

    // Añadir campos específicos según el tipo
    switch (tipo) {
      case 'quiz':
      case 'multiple_respuesta':
        base.opciones = [
          { texto: 'Opción A', correcta: true },
          { texto: 'Opción B', correcta: false },
          { texto: 'Opción C', correcta: false }
        ];
        break;
      case 'verdadero_falso':
        base.respuesta = true;
        break;
      case 'completar_codigo':
        base.codigo = '';
        base.respuestas = [];
        break;
      case 'ordenar_bloques':
        base.bloques = [];
        base.distractores = [];
        break;
      case 'que_hace_codigo':
        base.codigo = '';
        base.resultado = '';
        break;
      case 'escribir_codigo':
        base.solucion = '';
        base.palabrasClave = [];
        break;
      case 'relacionar':
        base.pares = [
          { izquierda: '', derecha: '' }
        ];
        break;
      case 'depurar_codigo':
        base.codigoError = '';
        base.codigoCorregido = '';
        base.tipoError = 'sintaxis';
        break;
      case 'reto_ejecucion':
        base.descripcionReto = '';
        base.condiciones = {};
        base.bloquesPermitidos = [];
        base.maxBloques = 0;
        break;
      // Ejercicios con bloques visuales
      case 'bloques_completar':
        base.bloquesBase = [];         // Bloques ya colocados
        base.dropZones = [];           // Zonas donde colocar bloques
        base.bloquesDisponibles = [];  // Bloques que puede usar el estudiante
        base.bloquesCorrectos = {};    // Mapeo de dropZone -> bloque correcto
        base.bloquesState = null;      // Estado completo (bloques + variables + mis bloques)
        break;
      case 'bloques_ordenar':
        base.bloquesOrdenados = [];    // Orden correcto
        base.bloquesDesordenados = []; // Bloques a ordenar (se generan automáticamente)
        base.incluirDistractores = false;
        base.distractores = [];
        base.bloquesState = null;
        break;
      case 'bloques_armar':
        base.bloquesSolucion = [];     // Solución completa
        base.bloquesDisponibles = [];  // Categorías de bloques disponibles
        base.restricciones = {
          maxBloques: 0,               // 0 = sin límite
          categoriasPermitidas: []     // vacío = todas
        };
        base.bloquesState = null;
        break;
      case 'bloques_corregir':
        base.bloquesConError = [];     // Programa con errores
        base.bloquesCorrectos = [];    // Solución correcta
        base.tipoError = 'logica';     // 'logica', 'orden', 'faltante', 'sobrante'
        base.pistas = [];
        base.bloquesState = null;
        break;
      case 'circuito_armar':
        base.circuitoSolucion = null;
        base.circuitoDiagrama = null;
        break;
      case 'circuito_depurar':
        base.circuitoSolucion = null;
        base.circuitoInicial = null;
        base.circuitoDiagrama = null;
        break;
      case 'circuito_cuestionario':
        base.circuitoInicial = null;
        base.opciones = [
          { texto: 'Opción A', correcta: true },
          { texto: 'Opción B', correcta: false },
          { texto: 'Opción C', correcta: false }
        ];
        break;
      case 'circuito_codigo':
        base.circuitoSolucion = null;
        base.arduinoSimTime = 2000;
        base.arduinoSimExpected = '';
        base.circuitoDiagrama = null;
        base.progMode = 'codigo';        // 'codigo' o 'bloques'
        base.ocultar = 'programacion';   // 'programacion' o 'circuito'
        base.bloquesInfo = null;         // Si progMode === 'bloques'
        break;
    }

    return base;
  }

  function initEvaluacionesEditor() {
    if (evaluacionesInitialized) return;
    evaluacionesInitialized = true;

    console.log('[STBLOCK-DEBUG] Initializing Evaluaciones Editor');

    // Sincronizar estado desde el form
    ['evalTitulo', 'evalId', 'evalDescripcion', 'evalNivel', 'evalEntorno', 'evalTarjeta', 'evalTiempo', 'evalTags', 'evalNotificarResultado', 'evalReglaSalida', 'evalEjerciciosAzar', 'evalTiempoAlerta', 'evalPermitirRetroceder'].forEach(function(id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', syncEvaluacionStateFromForm);
        el.addEventListener('input', syncEvaluacionStateFromForm);
      }
    });

    if ($('evalEntorno')) {
      $('evalEntorno').addEventListener('change', function() {
        var isDevices = $('evalEntorno').value === 'dispositivos';
        if ($('lblEvalTarjeta')) $('lblEvalTarjeta').style.display = isDevices ? 'block' : 'none';
        var opt = $('evalModoCodigoOption');
        if (opt) {
          opt.textContent = isDevices ? 'Código (Arduino/texto)' : 'Código (Python/texto)';
        }
        var ej = getSelectedEjercicio();
        if (ej) showBloquesEditor(ej);
        filterEjerciciosByMode();
      });
    }

    if ($('evalTarjeta')) {
      $('evalTarjeta').addEventListener('change', function() {
        var ej = getSelectedEjercicio();
        if (ej) showBloquesEditor(ej);
      });
    }

    // Filtrar ejercicios según el modo seleccionado
    if ($('evalModo')) {
      $('evalModo').addEventListener('change', filterEjerciciosByMode);
      filterEjerciciosByMode();
    }

    // Configurar la carga de resultados del estudiante
    if ($('btnSubirResultados') && $('fileResultados')) {
      $('btnSubirResultados').onclick = function() {
        $('fileResultados').click();
      };
      $('fileResultados').onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var r = new FileReader();
        r.onload = function(evt) {
          try {
            var res = verifyAndLoadResult(evt.target.result);
            mostrarReporteResultado(res);
            toast('Reporte cargado correctamente');
          } catch(err) {
            showAlert('Error al leer reporte: ' + err.message);
          }
        };
        r.readAsText(file);
        e.target.value = '';
      };
    }

    // Botones de agregar ejercicio
    document.querySelectorAll('[data-add-ejercicio]').forEach(function(btn) {
      btn.onclick = function() {
        var tipo = btn.getAttribute('data-add-ejercicio');
        addEjercicio(tipo);
      };
    });

    // Tabs del panel derecho
    document.querySelectorAll('[data-tab-eval]').forEach(function(tab) {
      tab.onclick = function() {
        var tabName = tab.getAttribute('data-tab-eval');
        document.querySelectorAll('[data-tab-eval]').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('[data-panel-eval]').forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.querySelector('[data-panel-eval="' + tabName + '"]');
        if (panel) panel.classList.add('active');
      };
    });

    // Botones de acciones
    if ($('newEvaluacion')) $('newEvaluacion').onclick = newEvaluacion;
    if ($('saveEvaluacion')) $('saveEvaluacion').onclick = saveEvaluacion;
    if ($('exportEvaluacion')) $('exportEvaluacion').onclick = exportEvaluacion;
    if ($('importEvaluacion')) $('importEvaluacion').onclick = function() { $('evaluacionJsonFile').click(); };
    if ($('previewEvaluacion')) $('previewEvaluacion').onclick = previewEvaluacion;
    if ($('refreshEvaluaciones')) $('refreshEvaluaciones').onclick = refreshEvaluaciones;

    if ($('evaluacionJsonFile')) {
      $('evaluacionJsonFile').onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var data = JSON.parse(ev.target.result);
            loadEvaluacion(data);
            toast('Evaluación importada: ' + data.titulo);
          } catch (err) {
            toast('Error al importar: ' + err.message);
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      };
    }

    // Botones de ejercicio
    if ($('duplicateEjercicio')) $('duplicateEjercicio').onclick = duplicateSelectedEjercicio;
    if ($('deleteEjercicio')) $('deleteEjercicio').onclick = deleteSelectedEjercicio;
    if ($('moveEjercicioUp')) $('moveEjercicioUp').onclick = function() { moveEjercicio(-1); };
    if ($('moveEjercicioDown')) $('moveEjercicioDown').onclick = function() { moveEjercicio(1); };

    // Plantillas
    document.querySelectorAll('[data-plantilla]').forEach(function(el) {
      el.onclick = function() {
        var plantillaId = el.getAttribute('data-plantilla');
        loadPlantilla(plantillaId);
      };
    });

    // Campos del inspector de ejercicio
    ['ejercicioEnunciado', 'ejercicioPuntos', 'ejercicioIntentosMax', 'ejercicioPista', 'ejercicioExplicacion'].forEach(function(id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', syncEjercicioFromForm);
        el.addEventListener('input', syncEjercicioFromForm);
      }
    });

    // Opciones específicas de tipo
    initTipoEspecificoBindings();

    refreshEvaluaciones();
    updateEvaluacionStats();
  }

  function initTipoEspecificoBindings() {
    // Quiz - agregar opción
    if ($('addOpcionQuiz')) {
      $('addOpcionQuiz').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.opciones) ej.opciones = [];
        ej.opciones.push({ texto: 'Nueva opción', correcta: false });
        renderOpcionesQuiz();
        syncEjercicioFromForm();
      };
    }

    // V/F
    if ($('respuestaVF')) {
      $('respuestaVF').onchange = function() {
        var ej = getSelectedEjercicio();
        if (ej) {
          ej.respuesta = ($('respuestaVF').value === 'true');
        }
      };
    }

    // Completar código
    if ($('codigoConHuecos')) {
      $('codigoConHuecos').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.codigo = $('codigoConHuecos').value;
      };
    }
    if ($('addRespuestaHueco')) {
      $('addRespuestaHueco').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.respuestas) ej.respuestas = [];
        ej.respuestas.push('');
        renderRespuestasHuecos();
      };
    }

    // Ordenar bloques
    if ($('bloquesOrden')) {
      $('bloquesOrden').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.bloques = $('bloquesOrden').value.split('\n').filter(function(b) { return b.trim(); });
      };
    }
    if ($('mostrarDistractores')) {
      $('mostrarDistractores').onchange = function() {
        var area = $('distractoresArea');
        if (area) area.hidden = !$('mostrarDistractores').checked;
      };
    }
    if ($('bloquesDistractores')) {
      $('bloquesDistractores').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.distractores = $('bloquesDistractores').value.split('\n').filter(function(b) { return b.trim(); });
      };
    }

    // Qué hace el código
    if ($('codigoAnalizar')) {
      $('codigoAnalizar').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.codigo = $('codigoAnalizar').value;
      };
    }
    if ($('resultadoEsperado')) {
      $('resultadoEsperado').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.resultado = $('resultadoEsperado').value;
      };
    }

    // Escribir código
    if ($('codigoSolucion')) {
      $('codigoSolucion').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.solucion = $('codigoSolucion').value;
      };
    }
    if ($('palabrasClave')) {
      $('palabrasClave').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.palabrasClave = $('palabrasClave').value.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
      };
    }

    // Relacionar - agregar par
    if ($('addParRelacion')) {
      $('addParRelacion').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.pares) ej.pares = [];
        ej.pares.push({ izquierda: '', derecha: '' });
        renderParesRelacion();
      };
    }

    // Depurar
    if ($('codigoConError')) {
      $('codigoConError').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.codigoError = $('codigoConError').value;
      };
    }
    if ($('codigoCorregido')) {
      $('codigoCorregido').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.codigoCorregido = $('codigoCorregido').value;
      };
    }
    if ($('tipoError')) {
      $('tipoError').onchange = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.tipoError = $('tipoError').value;
      };
    }

    if ($('arduinoSimTime')) {
      $('arduinoSimTime').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.arduinoSimTime = parseInt($('arduinoSimTime').value) || 2000;
      };
    }
    if ($('arduinoSimExpected')) {
      $('arduinoSimExpected').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.arduinoSimExpected = $('arduinoSimExpected').value;
      };
    }

    // Reto
    if ($('descReto')) {
      $('descReto').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.descripcionReto = $('descReto').value;
      };
    }
    if ($('condicionesExito')) {
      $('condicionesExito').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) {
          try {
            ej.condiciones = JSON.parse($('condicionesExito').value);
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
      };
    }
    if ($('bloquesPermitidos')) {
      $('bloquesPermitidos').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.bloquesPermitidos = $('bloquesPermitidos').value.split(',').map(function(b) { return b.trim(); }).filter(Boolean);
      };
    }
    if ($('maxBloques')) {
      $('maxBloques').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.maxBloques = parseInt($('maxBloques').value) || 0;
      };
    }

    // Armar circuito (Velxio)
    if ($('btnEditarCircuitoSolucion')) {
      $('btnEditarCircuitoSolucion').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorCircuitoSolucion(ej, 'circuitoSolucion');
      };
    }
    if ($('circuitoDiagramaFile')) {
      $('circuitoDiagramaFile').onchange = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        var file = this.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var base64 = e.target.result;
            ej.circuitoDiagrama = base64;
            actualizarCircuitoEditorUI(ej);
          };
          reader.readAsDataURL(file);
        }
      };
    }
    if ($('btnEliminarCircuitoDiagrama')) {
      $('btnEliminarCircuitoDiagrama').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        ej.circuitoDiagrama = null;
        if ($('circuitoDiagramaFile')) $('circuitoDiagramaFile').value = '';
        actualizarCircuitoEditorUI(ej);
      };
    }

    // Depurar circuito (Velxio)
    if ($('btnEditarCircuitoInicial')) {
      $('btnEditarCircuitoInicial').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorCircuitoSolucion(ej, 'circuitoInicial');
      };
    }
    if ($('btnEditarCircuitoSolucionDepurar')) {
      $('btnEditarCircuitoSolucionDepurar').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorCircuitoSolucion(ej, 'circuitoSolucion');
      };
    }
    if ($('circuitoDepurarDiagramaFile')) {
      $('circuitoDepurarDiagramaFile').onchange = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        var file = this.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var base64 = e.target.result;
            ej.circuitoDiagrama = base64;
            actualizarCircuitoDepurarEditorUI(ej);
          };
          reader.readAsDataURL(file);
        }
      };
    }
    if ($('btnEliminarCircuitoDepurarDiagrama')) {
      $('btnEliminarCircuitoDepurarDiagrama').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        ej.circuitoDiagrama = null;
        if ($('circuitoDepurarDiagramaFile')) $('circuitoDepurarDiagramaFile').value = '';
        actualizarCircuitoDepurarEditorUI(ej);
      };
    }

    // Circuito + Quiz (Velxio)
    if ($('btnEditarCircuitoCuestionario')) {
      $('btnEditarCircuitoCuestionario').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorCircuitoSolucion(ej, 'circuitoInicial');
      };
    }
    if ($('addOpcionCircuitoQuiz')) {
      $('addOpcionCircuitoQuiz').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.opciones) ej.opciones = [];
        ej.opciones.push({ texto: 'Nueva Opción', correcta: false });
        renderOpcionesCircuitoQuiz();
        syncEjercicioFromForm();
      };
    }

    // Circuito + Código (Velxio)
    if ($('circuitoCodigoProgMode')) {
      $('circuitoCodigoProgMode').onchange = function() {
        var ej = getSelectedEjercicio();
        if (ej) {
          ej.progMode = this.value;
          actualizarCircuitoCodigoEditorUI(ej);
          renderEjercicioEditorCentral(ej);
        }
      };
    }
    if ($('circuitoCodigoOcultar')) {
      $('circuitoCodigoOcultar').onchange = function() {
        var ej = getSelectedEjercicio();
        if (ej) {
          ej.ocultar = this.value;
          actualizarCircuitoCodigoEditorUI(ej);
          renderEjercicioEditorCentral(ej);
        }
      };
    }
    if ($('btnEditarCircuitoCodigoBloquesSolucion')) {
      $('btnEditarCircuitoCodigoBloquesSolucion').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorBloquesSolucion(ej);
      };
    }
    if ($('btnEditarCircuitoCodigoSolucion')) {
      $('btnEditarCircuitoCodigoSolucion').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorCircuitoSolucion(ej, 'circuitoSolucion');
      };
    }
    if ($('circuitoCodigoSimTime')) {
      $('circuitoCodigoSimTime').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.arduinoSimTime = parseInt(this.value) || 2000;
      };
    }
    if ($('circuitoCodigoSimExpected')) {
      $('circuitoCodigoSimExpected').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) ej.arduinoSimExpected = this.value;
      };
    }
    if ($('circuitoCodigoTextSolucion')) {
      $('circuitoCodigoTextSolucion').oninput = function() {
        var ej = getSelectedEjercicio();
        if (ej) {
          if (!ej.circuitoSolucion) {
            ej.circuitoSolucion = { boards: [], components: [], wires: [], fileGroups: [] };
          }
          if (!ej.circuitoSolucion.fileGroups) {
            ej.circuitoSolucion.fileGroups = [];
          }
          
          var fileGroups = ej.circuitoSolucion.fileGroups;
          var foundFile = null;
          fileGroups.forEach(function(g) {
            if (g.files) {
              g.files.forEach(function(f) {
                if (f.name.endsWith('.ino') || f.name.endsWith('.cpp')) {
                  foundFile = f;
                }
              });
            }
          });
          
          if (foundFile) {
            foundFile.content = this.value;
          } else {
            fileGroups.push({
              id: 'sketch',
              name: 'sketch',
              files: [{ name: 'main.ino', content: this.value }]
            });
          }
          actualizarCircuitoCodigoEditorUI(ej);
        }
      };
    }
    if ($('circuitoCodigoDiagramaFile')) {
      $('circuitoCodigoDiagramaFile').onchange = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        var file = this.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var base64 = e.target.result;
            ej.circuitoDiagrama = base64;
            actualizarCircuitoCodigoEditorUI(ej);
          };
          reader.readAsDataURL(file);
        }
      };
    }
    if ($('btnEliminarCircuitoCodigoDiagrama')) {
      $('btnEliminarCircuitoCodigoDiagrama').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        ej.circuitoDiagrama = null;
        if ($('circuitoCodigoDiagramaFile')) $('circuitoCodigoDiagramaFile').value = '';
        actualizarCircuitoCodigoEditorUI(ej);
      };
    }
  }

  // Filtrar los botones de ejercicios según el modo seleccionado y entorno
  function filterEjerciciosByMode() {
    var modo = $('evalModo') ? $('evalModo').value : 'mixto';
    var entorno = (evaluacionState && evaluacionState.entorno) || 'robotica';
    var grid = $('ejerciciosGrid');
    if (!grid) return;

    // Obtener todos los elementos con data-grupo
    var elementos = grid.querySelectorAll('[data-grupo]');

    elementos.forEach(function(el) {
      var grupos = el.getAttribute('data-grupo').split(' ');
      var mostrar = false;

      if (grupos.indexOf('electronica') !== -1) {
        mostrar = (entorno === 'dispositivos');
      } else {
        if (modo === 'mixto') {
          mostrar = true;
        } else if (modo === 'codigo') {
          mostrar = grupos.indexOf('codigo') !== -1;
        } else if (modo === 'bloques') {
          mostrar = grupos.indexOf('bloques') !== -1;
        }
      }

      el.style.display = mostrar ? '' : 'none';
    });

    // También guardar el modo en el estado
    if (evaluacionState) {
      evaluacionState.modo = modo;
    }
  }

  function syncEvaluacionStateFromForm() {
    evaluacionState.titulo = ($('evalTitulo') && $('evalTitulo').value) || 'Nueva Evaluación';
    evaluacionState.id = ($('evalId') && $('evalId').value) || 'nueva-evaluacion';
    evaluacionState.descripcion = ($('evalDescripcion') && $('evalDescripcion').value) || '';
    evaluacionState.nivel = ($('evalNivel') && $('evalNivel').value) || 'basico';
    evaluacionState.entorno = ($('evalEntorno') && $('evalEntorno').value) || 'robotica';
    evaluacionState.tarjeta = ($('evalTarjeta') && $('evalTarjeta').value) || 'stbBoardV2';
    evaluacionState.tiempoLimite = parseInt(($('evalTiempo') && $('evalTiempo').value) || '15');
    evaluacionState.tags = ($('evalTags') && $('evalTags').value) ? $('evalTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
    evaluacionState.modo = ($('evalModo') && $('evalModo').value) || 'mixto';
    evaluacionState.notificarResultado = ($('evalNotificarResultado') && $('evalNotificarResultado').value) || 'avanzar';
    evaluacionState.reglaSalida = ($('evalReglaSalida') && $('evalReglaSalida').value) || 'continuar';
    evaluacionState.ejerciciosAzar = parseInt(($('evalEjerciciosAzar') && $('evalEjerciciosAzar').value) || '0');
    evaluacionState.tiempoAlerta = parseInt(($('evalTiempoAlerta') && $('evalTiempoAlerta').value) || '1');
    evaluacionState.permitirRetroceder = $('evalPermitirRetroceder') ? $('evalPermitirRetroceder').checked : true;
    evaluacionState.fechaModificacion = new Date().toISOString();
  }

  function syncFormFromEvaluacionState() {
    if ($('evalTitulo')) $('evalTitulo').value = evaluacionState.titulo;
    if ($('evalId')) $('evalId').value = evaluacionState.id;
    if ($('evalDescripcion')) $('evalDescripcion').value = evaluacionState.descripcion || '';
    if ($('evalNivel')) $('evalNivel').value = evaluacionState.nivel;
    if ($('evalEntorno')) {
      $('evalEntorno').value = evaluacionState.entorno || 'robotica';
      var isDevices = evaluacionState.entorno === 'dispositivos';
      if ($('lblEvalTarjeta')) $('lblEvalTarjeta').style.display = isDevices ? 'block' : 'none';
      var opt = $('evalModoCodigoOption');
      if (opt) {
        opt.textContent = isDevices ? 'Código (Arduino/texto)' : 'Código (Python/texto)';
      }
    }
    if ($('evalTarjeta')) $('evalTarjeta').value = evaluacionState.tarjeta || 'stbBoardV2';
    if ($('evalTiempo')) $('evalTiempo').value = evaluacionState.tiempoLimite;
    if ($('evalTags')) $('evalTags').value = (evaluacionState.tags || []).join(', ');
    if ($('evalNotificarResultado')) $('evalNotificarResultado').value = evaluacionState.notificarResultado || 'avanzar';
    if ($('evalReglaSalida')) $('evalReglaSalida').value = evaluacionState.reglaSalida || 'continuar';
    if ($('evalEjerciciosAzar')) $('evalEjerciciosAzar').value = evaluacionState.ejerciciosAzar !== undefined ? evaluacionState.ejerciciosAzar : 0;
    if ($('evalTiempoAlerta')) $('evalTiempoAlerta').value = evaluacionState.tiempoAlerta !== undefined ? evaluacionState.tiempoAlerta : 1;
    if ($('evalPermitirRetroceder')) $('evalPermitirRetroceder').checked = evaluacionState.permitirRetroceder !== undefined ? evaluacionState.permitirRetroceder : true;

    // Restaurar modo de ejercicios y filtrar botones
    if ($('evalModo')) {
      $('evalModo').value = evaluacionState.modo || 'mixto';
      filterEjerciciosByMode();
    }
  }

  function addEjercicio(tipo) {
    var ej = createDefaultEjercicio(tipo);
    evaluacionState.ejercicios.push(ej);
    renderEjerciciosList();
    selectEjercicio(ej.id);
    toast('Ejercicio agregado: ' + TIPOS_EJERCICIO[tipo].nombre);
  }

  function renderEjerciciosList() {
    var container = $('evalEjerciciosList');
    if (!container) return;

    container.innerHTML = '';
    var count = $('evalEjercicioCount');
    if (count) count.textContent = evaluacionState.ejercicios.length;

    evaluacionState.ejercicios.forEach(function(ej, idx) {
      var tipo = TIPOS_EJERCICIO[ej.tipo] || { nombre: ej.tipo, color: '#666', icono: '?' };
      var div = document.createElement('div');
      div.className = 'layer' + (selectedEjercicioId === ej.id ? ' selected' : '');
      div.style.borderLeft = '3px solid ' + tipo.color;
      div.innerHTML = '<span style="margin-right: 6px;">' + tipo.icono + '</span>' +
        '<span class="layer-name">' + (idx + 1) + '. ' + (ej.enunciado ? ej.enunciado.substring(0, 30) + (ej.enunciado.length > 30 ? '...' : '') : tipo.nombre) + '</span>' +
        '<span style="margin-left: auto; font-size: 10px; color: #94a3b8;">' + ej.puntos + 'pts</span>';
      div.onclick = function() { selectEjercicio(ej.id); };
      container.appendChild(div);
    });
  }

  function selectEjercicio(id) {
    selectedEjercicioId = id;
    renderEjerciciosList();

    var ej = getSelectedEjercicio();
    var noSel = $('noEjercicioSelected');
    var editor = $('ejercicioEditor');
    var noProps = $('noEjercicioProps');
    var inspector = $('ejercicioInspector');
    var noResp = $('noRespuestasConfig');
    var respEditor = $('respuestasEditor');

    if (!ej) {
      if (noSel) noSel.style.display = 'block';
      if (editor) editor.hidden = true;
      if (noProps) noProps.style.display = 'block';
      if (inspector) inspector.hidden = true;
      if (noResp) noResp.style.display = 'block';
      if (respEditor) respEditor.hidden = true;
      return;
    }

    if (noSel) noSel.style.display = 'none';
    if (editor) editor.hidden = false;
    if (noProps) noProps.style.display = 'none';
    if (inspector) inspector.hidden = false;
    if (noResp) noResp.style.display = 'none';
    if (respEditor) respEditor.hidden = false;

    // Actualizar tipo display
    var tipo = TIPOS_EJERCICIO[ej.tipo] || { nombre: ej.tipo, color: '#666' };
    var typeDisplay = $('ejercicioTypeDisplay');
    if (typeDisplay) {
      typeDisplay.textContent = tipo.nombre;
      typeDisplay.style.background = tipo.color + '22';
      typeDisplay.style.color = tipo.color;
      typeDisplay.style.border = '1px solid ' + tipo.color;
    }

    // Actualizar campos básicos
    if ($('ejercicioEnunciado')) $('ejercicioEnunciado').value = ej.enunciado || '';
    if ($('ejercicioPuntos')) $('ejercicioPuntos').value = ej.puntos || 10;
    if ($('ejercicioIntentosMax')) $('ejercicioIntentosMax').value = (ej.intentosMax !== undefined ? ej.intentosMax : -1);
    if ($('ejercicioPista')) $('ejercicioPista').value = ej.pista || '';
    if ($('ejercicioExplicacion')) $('ejercicioExplicacion').value = ej.explicacion || '';

    // Mostrar editor específico del tipo
    showTipoEditor(ej);

    // Renderizar editor central
    renderEjercicioEditorCentral(ej);
  }

  function getSelectedEjercicio() {
    if (!selectedEjercicioId) return null;
    return evaluacionState.ejercicios.find(function(e) { return e.id === selectedEjercicioId; });
  }

  function showTipoEditor(ej) {
    // Ocultar todos los editores de tipo
    var editores = ['opcionesQuizEditor', 'opcionesVFEditor', 'opcionesCompletarEditor',
                    'opcionesOrdenarEditor', 'opcionesQueHaceEditor', 'opcionesEscribirEditor',
                    'opcionesRelacionarEditor', 'opcionesDepurarEditor', 'opcionesRetoEditor', 
                    'opcionesCircuitoEditor', 'opcionesCircuitoDepurarEditor', 'opcionesCircuitoCuestionarioEditor', 'opcionesCircuitoCodigoEditor'];
    editores.forEach(function(id) {
      var el = $(id);
      if (el) el.hidden = true;
    });

    // Mostrar el editor correspondiente
    switch (ej.tipo) {
      case 'quiz':
      case 'multiple_respuesta':
        if ($('opcionesQuizEditor')) $('opcionesQuizEditor').hidden = false;
        renderOpcionesQuiz();
        break;
      case 'verdadero_falso':
        if ($('opcionesVFEditor')) $('opcionesVFEditor').hidden = false;
        if ($('respuestaVF')) $('respuestaVF').value = ej.respuesta ? 'true' : 'false';
        break;
      case 'completar_codigo':
        if ($('opcionesCompletarEditor')) $('opcionesCompletarEditor').hidden = false;
        if ($('codigoConHuecos')) $('codigoConHuecos').value = ej.codigo || '';
        renderRespuestasHuecos();
        break;
      case 'ordenar_bloques':
        if ($('opcionesOrdenarEditor')) $('opcionesOrdenarEditor').hidden = false;
        if ($('bloquesOrden')) $('bloquesOrden').value = (ej.bloques || []).join('\n');
        if ($('mostrarDistractores')) $('mostrarDistractores').checked = (ej.distractores && ej.distractores.length > 0);
        if ($('distractoresArea')) $('distractoresArea').hidden = !(ej.distractores && ej.distractores.length > 0);
        if ($('bloquesDistractores')) $('bloquesDistractores').value = (ej.distractores || []).join('\n');
        break;
      case 'que_hace_codigo':
        if ($('opcionesQueHaceEditor')) $('opcionesQueHaceEditor').hidden = false;
        if ($('codigoAnalizar')) $('codigoAnalizar').value = ej.codigo || '';
        if ($('resultadoEsperado')) $('resultadoEsperado').value = ej.resultado || '';
        break;
      case 'escribir_codigo':
        if ($('opcionesEscribirEditor')) $('opcionesEscribirEditor').hidden = false;
        if ($('codigoSolucion')) $('codigoSolucion').value = ej.solucion || '';
        if ($('palabrasClave')) $('palabrasClave').value = (ej.palabrasClave || []).join(', ');
        
        var isDevices = evaluacionState && evaluacionState.entorno === 'dispositivos';
        if ($('arduinoSimulationConfig')) {
          $('arduinoSimulationConfig').style.display = isDevices ? 'block' : 'none';
          if ($('arduinoSimTime')) $('arduinoSimTime').value = ej.arduinoSimTime || 2000;
          if ($('arduinoSimExpected')) $('arduinoSimExpected').value = ej.arduinoSimExpected || '';
        }
        break;
      case 'relacionar':
        if ($('opcionesRelacionarEditor')) $('opcionesRelacionarEditor').hidden = false;
        renderParesRelacion();
        break;
      case 'depurar_codigo':
        if ($('opcionesDepurarEditor')) $('opcionesDepurarEditor').hidden = false;
        if ($('codigoConError')) $('codigoConError').value = ej.codigoError || '';
        if ($('codigoCorregido')) $('codigoCorregido').value = ej.codigoCorregido || '';
        if ($('tipoError')) $('tipoError').value = ej.tipoError || 'sintaxis';
        break;
      case 'reto_ejecucion':
        if ($('opcionesRetoEditor')) $('opcionesRetoEditor').hidden = false;
        if ($('descReto')) $('descReto').value = ej.descripcionReto || '';
        if ($('condicionesExito')) $('condicionesExito').value = JSON.stringify(ej.condiciones || {}, null, 2);
        if ($('bloquesPermitidos')) $('bloquesPermitidos').value = (ej.bloquesPermitidos || []).join(', ');
        if ($('maxBloques')) $('maxBloques').value = ej.maxBloques || 0;
        break;
      case 'circuito_armar':
        if ($('opcionesCircuitoEditor')) $('opcionesCircuitoEditor').hidden = false;
        actualizarCircuitoEditorUI(ej);
        break;
      case 'circuito_depurar':
        if ($('opcionesCircuitoDepurarEditor')) $('opcionesCircuitoDepurarEditor').hidden = false;
        actualizarCircuitoDepurarEditorUI(ej);
        break;
      case 'circuito_cuestionario':
        if ($('opcionesCircuitoCuestionarioEditor')) $('opcionesCircuitoCuestionarioEditor').hidden = false;
        actualizarCircuitoCuestionarioEditorUI(ej);
        break;
      case 'circuito_codigo':
        if ($('opcionesCircuitoCodigoEditor')) $('opcionesCircuitoCodigoEditor').hidden = false;
        actualizarCircuitoCodigoEditorUI(ej);
        break;
    }
  }

  function actualizarCircuitoEditorUI(ej) {
    var estado = $('estadoCircuitoSolucion');
    if (estado) {
      if (ej.circuitoSolucion && ej.circuitoSolucion.components) {
        var numComp = ej.circuitoSolucion.components.length;
        var numWires = (ej.circuitoSolucion.wires || []).length;
        estado.textContent = '🔌 Circuito guardado: ' + numComp + ' comp., ' + numWires + ' conex.';
        estado.style.background = '#022c22';
        estado.style.borderColor = '#0f5132';
        estado.style.color = '#34d399';
      } else {
        estado.textContent = 'Sin circuito guardado';
        estado.style.background = '#1e293b';
        estado.style.borderColor = '#334155';
        estado.style.color = '#94a3b8';
      }
    }

    var preview = $('circuitoDiagramaPreview');
    var delBtn = $('btnEliminarCircuitoDiagrama');
    if (preview) {
      if (ej.circuitoDiagrama) {
        preview.innerHTML = '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
        if (delBtn) delBtn.style.display = 'block';
      } else {
        preview.innerHTML = '<span style="color: #64748b; font-size: 11px;">Sin imagen cargada</span>';
        if (delBtn) delBtn.style.display = 'none';
      }
    }
  }

  function actualizarCircuitoDepurarEditorUI(ej) {
    var estInit = $('estadoCircuitoInicial');
    if (estInit) {
      if (ej.circuitoInicial && ej.circuitoInicial.components) {
        estInit.textContent = '🔌 Circuito Inicial: ' + ej.circuitoInicial.components.length + ' comp.';
        estInit.style.background = '#3b0764';
        estInit.style.borderColor = '#581c87';
        estInit.style.color = '#c084fc';
      } else {
        estInit.textContent = 'Sin circuito inicial';
        estInit.style.background = '#1e293b';
        estInit.style.borderColor = '#334155';
        estInit.style.color = '#94a3b8';
      }
    }

    var estSol = $('estadoCircuitoSolucionDepurar');
    if (estSol) {
      if (ej.circuitoSolucion && ej.circuitoSolucion.components) {
        estSol.textContent = '🔌 Circuito Solución: ' + ej.circuitoSolucion.components.length + ' comp.';
        estSol.style.background = '#022c22';
        estSol.style.borderColor = '#0f5132';
        estSol.style.color = '#34d399';
      } else {
        estSol.textContent = 'Sin circuito solución';
        estSol.style.background = '#1e293b';
        estSol.style.borderColor = '#334155';
        estSol.style.color = '#94a3b8';
      }
    }

    var preview = $('circuitoDepurarDiagramaPreview');
    var delBtn = $('btnEliminarCircuitoDepurarDiagrama');
    if (preview) {
      if (ej.circuitoDiagrama) {
        preview.innerHTML = '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
        if (delBtn) delBtn.style.display = 'block';
      } else {
        preview.innerHTML = '<span style="color: #64748b; font-size: 11px;">Sin imagen cargada</span>';
        if (delBtn) delBtn.style.display = 'none';
      }
    }
  }

  function actualizarCircuitoCuestionarioEditorUI(ej) {
    var estado = $('estadoCircuitoCuestionario');
    if (estado) {
      if (ej.circuitoInicial && ej.circuitoInicial.components) {
        estado.textContent = '🔌 Circuito guardado: ' + ej.circuitoInicial.components.length + ' comp.';
        estado.style.background = '#022c22';
        estado.style.borderColor = '#0f5132';
        estado.style.color = '#34d399';
      } else {
        estado.textContent = 'Sin circuito guardado';
        estado.style.background = '#1e293b';
        estado.style.borderColor = '#334155';
        estado.style.color = '#94a3b8';
      }
    }
    renderOpcionesCircuitoQuiz();
  }

  function renderOpcionesCircuitoQuiz() {
    var ej = getSelectedEjercicio();
    var container = $('opcionesCircuitoQuizList');
    if (!ej || !container) return;

    container.innerHTML = '';
    (ej.opciones || []).forEach(function(op, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px; padding: 8px; background: #1e293b; border-radius: 4px;';
      div.innerHTML =
        '<input type="radio" name="opcionCircuitoQuizCorrecta" ' + (op.correcta ? 'checked' : '') + ' data-idx="' + idx + '" style="width: 18px; height: 18px;">' +
        '<input type="text" value="' + (op.texto || '').replace(/"/g, '&quot;') + '" data-idx="' + idx + '" style="flex: 1; padding: 6px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; font-size: 11px;">' +
        '<button data-delete="' + idx + '" style="padding: 4px 8px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer;">×</button>';
      
      div.querySelector('input[type="radio"]').onchange = function() {
        ej.opciones.forEach(function(o, i) {
          o.correcta = (i === idx);
        });
        syncEjercicioFromForm();
      };

      div.querySelector('input[type="text"]').oninput = function() {
        op.texto = this.value;
        syncEjercicioFromForm();
      };

      div.querySelector('button').onclick = function() {
        ej.opciones.splice(idx, 1);
        renderOpcionesCircuitoQuiz();
        syncEjercicioFromForm();
      };

      container.appendChild(div);
    });
  }

function checkHasCode(fileGroups) {
    if (!fileGroups) return false;
    var hasCode = false;
    if (typeof fileGroups.forEach === 'function') {
      fileGroups.forEach(function(g) {
        if (g && g.files && g.files.length > 0) hasCode = true;
      });
    } else if (typeof fileGroups === 'object') {
      Object.keys(fileGroups).forEach(function(k) {
        var g = fileGroups[k];
        if (g && g.files && g.files.length > 0) hasCode = true;
      });
    }
    return hasCode;
  }

  function extractArduinoCode(fileGroups) {
    var code = "";
    if (!fileGroups) return code;
    function processFiles(files) {
      if (!files) return;
      files.forEach(function(f) {
        if (f && f.name && (f.name === 'main.ino' || f.name === 'sketch.ino' || f.name.endsWith('.ino') || f.name.endsWith('.cpp'))) {
          code = f.content || "";
        }
      });
    }
    if (typeof fileGroups.forEach === 'function') {
      fileGroups.forEach(function(g) {
        if (g && g.files) processFiles(g.files);
      });
    } else if (typeof fileGroups === 'object') {
      Object.keys(fileGroups).forEach(function(k) {
        var g = fileGroups[k];
        if (g && g.files) processFiles(g.files);
      });
    }
    return code;
  }

  function actualizarCircuitoCodigoEditorUI(ej) {
    var estado = $('estadoCircuitoCodigoSolucion');
    if (estado) {
      if (ej.circuitoSolucion && ej.circuitoSolucion.components) {
        var hasCode = checkHasCode(ej.circuitoSolucion.fileGroups);
        estado.textContent = '🔌 Circuito Solución + ' + (hasCode ? 'Código Solución' : 'Sin Código');
        estado.style.background = '#022c22';
        estado.style.borderColor = '#0f5132';
        estado.style.color = '#34d399';
      } else {
        estado.textContent = 'Sin solución guardada';
        estado.style.background = '#1e293b';
        estado.style.borderColor = '#334155';
        estado.style.color = '#94a3b8';
      }
    }

    if ($('circuitoCodigoProgMode')) {
      $('circuitoCodigoProgMode').value = ej.progMode || 'codigo';
    }
    if ($('circuitoCodigoOcultar')) {
      $('circuitoCodigoOcultar').value = ej.ocultar || 'programacion';
    }

    var blocksContainer = $('circuitoCodigoBloquesSolucionContainer');
    if (blocksContainer) {
      blocksContainer.style.display = (ej.progMode === 'bloques') ? 'block' : 'none';
    }

    var blocksStatus = $('estadoCircuitoCodigoBloquesSolucion');
    if (blocksStatus) {
      var blocksCount = ej.bloquesInfo ? ej.bloquesInfo.length : 0;
      if (blocksCount > 0) {
        blocksStatus.textContent = '🧩 ' + blocksCount + ' bloques solución guardados';
        blocksStatus.style.background = '#022c22';
        blocksStatus.style.borderColor = '#0f5132';
        blocksStatus.style.color = '#34d399';
      } else {
        blocksStatus.textContent = 'Sin bloques guardados';
        blocksStatus.style.background = '#1e293b';
        blocksStatus.style.borderColor = '#334155';
        blocksStatus.style.color = '#94a3b8';
      }
    }

    if ($('circuitoCodigoSimTime')) $('circuitoCodigoSimTime').value = ej.arduinoSimTime || 2000;
    if ($('circuitoCodigoSimExpected')) $('circuitoCodigoSimExpected').value = ej.arduinoSimExpected || '';

    var textCodeContainer = $('circuitoCodigoTextSolucionContainer');
    if (textCodeContainer) {
      textCodeContainer.style.display = (ej.progMode === 'codigo') ? 'block' : 'none';
    }

    var textCodeInput = $('circuitoCodigoTextSolucion');
    if (textCodeInput) {
      if (document.activeElement !== textCodeInput) {
        var currentCode = extractArduinoCode(ej.circuitoSolucion ? ej.circuitoSolucion.fileGroups : null) || '';
        textCodeInput.value = currentCode;
      }
    }

    var preview = $('circuitoCodigoDiagramaPreview');
    var delBtn = $('btnEliminarCircuitoCodigoDiagrama');
    if (preview) {
      if (ej.circuitoDiagrama) {
        preview.innerHTML = '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
        if (delBtn) delBtn.style.display = 'block';
      } else {
        preview.innerHTML = '<span style="color: #64748b; font-size: 11px;">Sin imagen cargada</span>';
        if (delBtn) delBtn.style.display = 'none';
      }
    }
  }

  function initializeVelxioBoard(win, stbBoardId) {
    var BOARD_COMPAT_MAP = {
      arduinoUno: 'arduino-uno',
      stBoardExtension: 'arduino-uno',
      arduinoNano: 'arduino-nano',
      arduinoLeonardo: 'arduino-uno',
      arduinoMega2560: 'arduino-mega',
      arduinoMega: 'arduino-mega',
      stbBoardV2: 'arduino-mega',
      arduinoUnoR4Minima: 'arduino-uno',
      arduinoUnoR4Wifi: 'arduino-uno',
      esp32: 'esp32',
      esp32s3: 'esp32-s3',
      arduinoEsp32: 'esp32',
      arduinoEsp32S3: 'esp32-s3',
      arduinoEsp8266NodeMCU: 'arduino-uno',
      arduinoK210MaixDock: 'arduino-uno',
      arduinoK210Maixduino: 'arduino-uno',
      raspberryPiPico: 'raspberry-pi-pico',
      arduinoRaspberryPiPico: 'raspberry-pi-pico',
      arduinoRaspberryPiPicoW: 'pi-pico-w',
      arduinoRaspberryPiPico2: 'raspberry-pi-pico',
      arduinoRaspberryPiPico2W: 'pi-pico-w'
    };
    var compatBoard = BOARD_COMPAT_MAP[stbBoardId] || 'arduino-uno';

    if (win.__VELXIO_ADD_BOARD && win.__VELXIO_GET_BOARDS && win.__VELXIO_REMOVE_BOARD) {
      try {
        var existing = win.__VELXIO_GET_BOARDS();
        existing.forEach(function(b) {
          win.__VELXIO_REMOVE_BOARD(b.id);
        });
        var addedBoardId = win.__VELXIO_ADD_BOARD(compatBoard, 200, 200);
        if (win.__VELXIO_SET_ACTIVE_BOARD) {
          win.__VELXIO_SET_ACTIVE_BOARD(addedBoardId || compatBoard);
        }
        if (win.__VELXIO_KEEP_ONLY_BOARD) {
          win.__VELXIO_KEEP_ONLY_BOARD(addedBoardId || compatBoard);
        }
      } catch (e) {
        console.warn('[Velxio Editor] Error initializing board:', e);
      }
    }
  }

  function abrirEditorCircuitoSolucion(ejercicio, targetKey) {
    var key = targetKey || 'circuitoSolucion';
    var isInit = (key === 'circuitoInicial');
    
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); z-index: 99999; display: flex; flex-direction: column; font-family: sans-serif; color: #e2e8f0;';

    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #0f172a; border-bottom: 1px solid #1e293b;';
    
    var titleText = isInit ? '🔌 Diseñador de Circuito Inicial (Velxio)' : '🔌 Diseñador de Circuito Solución (Velxio)';
    var descText = isInit ? 'Diseña el estado inicial del circuito (con errores o incompleto) que el alumno tendrá que corregir.' : 'Diseña el circuito correcto y funcional que servirá para verificar la respuesta del alumno.';
    
    header.innerHTML = '<div>' +
      '  <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: ' + (isInit ? '#ef4444' : '#00979C') + ';">' + titleText + '</h3>' +
      '  <span style="font-size: 11px; color: #64748b;">' + descText + '</span>' +
      '</div>';

    var container = document.createElement('div');
    container.style.cssText = 'flex: 1; position: relative; background: #0f172a;';

    var iframe = document.createElement('iframe');
    iframe.src = '../../index.html#/editor';
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    container.appendChild(iframe);

    var footer = document.createElement('div');
    footer.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px; padding: 12px 20px; background: #0f172a; border-top: 1px solid #1e293b;';
    
    var btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.className = 'danger';
    btnCancel.style.padding = '8px 16px';
    btnCancel.onclick = function() {
      overlay.remove();
    };

    var btnSave = document.createElement('button');
    btnSave.textContent = isInit ? 'Guardar Circuito Inicial' : 'Guardar Circuito Solución';
    btnSave.className = 'primary';
    btnSave.style.padding = '8px 16px';
    btnSave.onclick = function() {
      try {
        var win = iframe.contentWindow;
        var boardStore = win.__VELXIO_BOARD_STORE;
        var fileStore = win.__VELXIO_FILE_STORE;
        if (!boardStore || typeof boardStore.getState !== 'function') {
          alert('El simulador aún se está inicializando. Por favor espera.');
          return;
        }

        var boardState = boardStore.getState();
        var state = {
          boards: boardState.boards || [],
          activeBoardId: boardState.activeBoardId || null,
          components: boardState.components || [],
          wires: boardState.wires || [],
          fileGroups: null
        };

        if (fileStore && typeof fileStore.getState === 'function') {
          var fileState = fileStore.getState();
          if (fileState && fileState.fileGroups) {
            state.fileGroups = fileState.fileGroups;
            state.activeGroupId = fileState.activeGroupId || null;
            state.activeGroupFileId = fileState.activeGroupFileId || {};
            state.openGroupFileIds = fileState.openGroupFileIds || {};
          }
        }

        if (state.components.length === 0) {
          alert('Por favor agrega componentes al simulador antes de guardar.');
          return;
        }

        ejercicio[key] = state;
        
        // Actualizar la UI del editor de opciones según el tipo
        if (ejercicio.tipo === 'circuito_armar') {
          actualizarCircuitoEditorUI(ejercicio);
        } else if (ejercicio.tipo === 'circuito_depurar') {
          actualizarCircuitoDepurarEditorUI(ejercicio);
        } else if (ejercicio.tipo === 'circuito_cuestionario') {
          actualizarCircuitoCuestionarioEditorUI(ejercicio);
        } else if (ejercicio.tipo === 'circuito_codigo') {
          actualizarCircuitoCodigoEditorUI(ejercicio);
        }
        
        toast('Esquema de circuito guardado con éxito');
        overlay.remove();
      } catch (e) {
        console.error('Error al guardar circuito:', e);
        alert('Ocurrió un error al guardar el circuito: ' + e.message);
      }
    };

    footer.appendChild(btnCancel);
    footer.appendChild(btnSave);

    overlay.appendChild(header);
    overlay.appendChild(container);
    overlay.appendChild(footer);

    document.body.appendChild(overlay);

    var pollAttempts = 0;
    var maxPollAttempts = 50;
    var pollInterval = setInterval(function() {
      pollAttempts++;
      try {
        var win = iframe.contentWindow;
        var boardStore = win.__VELXIO_BOARD_STORE;
        var fileStore = win.__VELXIO_FILE_STORE;
        if (boardStore && typeof boardStore.getState === 'function') {
          clearInterval(pollInterval);
          
          if (ejercicio[key]) {
            var storeState = boardStore.getState();
            if (storeState.loadProjectState) {
              storeState.loadProjectState(ejercicio[key]);
            }
            if (ejercicio[key].fileGroups && fileStore && typeof fileStore.getState === 'function') {
              var fStoreState = fileStore.getState();
              if (fStoreState.loadFileGroups) {
                fStoreState.loadFileGroups(ejercicio[key].fileGroups);
              }
            }
          } else {
            var boardId = evaluacionState.tarjeta || 'stbBoardV2';
            initializeVelxioBoard(win, boardId);
          }
        }
      } catch (e) {
      }
      if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollInterval);
        console.warn('[Velxio Editor] Timed out waiting for stores to initialize.');
      }
    }, 200);
  }

  function renderOpcionesQuiz() {
    var ej = getSelectedEjercicio();
    var container = $('opcionesQuizList');
    if (!ej || !container) return;

    container.innerHTML = '';
    (ej.opciones || []).forEach(function(op, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px; padding: 8px; background: #1e293b; border-radius: 4px;';
      div.innerHTML =
        '<input type="' + (ej.tipo === 'multiple_respuesta' ? 'checkbox' : 'radio') + '" name="opcionCorrecta" ' + (op.correcta ? 'checked' : '') + ' data-idx="' + idx + '" style="width: 18px; height: 18px;">' +
        '<input type="text" value="' + (op.texto || '').replace(/"/g, '&quot;') + '" data-idx="' + idx + '" style="flex: 1; padding: 6px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0;">' +
        '<button data-delete="' + idx + '" style="padding: 4px 8px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer;">×</button>';
      container.appendChild(div);
    });

    // Bindings
    container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function(radio) {
      radio.onchange = function() {
        var idx = parseInt(radio.getAttribute('data-idx'));
        if (ej.tipo === 'multiple_respuesta') {
          ej.opciones[idx].correcta = radio.checked;
        } else {
          ej.opciones.forEach(function(o, i) { o.correcta = (i === idx); });
          renderOpcionesQuiz();
        }
      };
    });
    container.querySelectorAll('input[type="text"]').forEach(function(input) {
      input.oninput = function() {
        var idx = parseInt(input.getAttribute('data-idx'));
        ej.opciones[idx].texto = input.value;
      };
    });
    container.querySelectorAll('button[data-delete]').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-delete'));
        ej.opciones.splice(idx, 1);
        renderOpcionesQuiz();
      };
    });
  }

  function renderRespuestasHuecos() {
    var ej = getSelectedEjercicio();
    var container = $('respuestasHuecosList');
    if (!ej || !container) return;

    container.innerHTML = '';
    (ej.respuestas || []).forEach(function(resp, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 6px;';
      div.innerHTML =
        '<span style="color: #94a3b8; min-width: 60px;">Hueco ' + (idx + 1) + ':</span>' +
        '<input type="text" value="' + (resp || '').replace(/"/g, '&quot;') + '" data-idx="' + idx + '" style="flex: 1; padding: 6px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; font-family: monospace;">' +
        '<button data-delete="' + idx + '" style="padding: 4px 8px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer;">×</button>';
      container.appendChild(div);
    });

    container.querySelectorAll('input[type="text"]').forEach(function(input) {
      input.oninput = function() {
        var idx = parseInt(input.getAttribute('data-idx'));
        ej.respuestas[idx] = input.value;
      };
    });
    container.querySelectorAll('button[data-delete]').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-delete'));
        ej.respuestas.splice(idx, 1);
        renderRespuestasHuecos();
      };
    });
  }

  function renderParesRelacion() {
    var ej = getSelectedEjercicio();
    var container = $('paresRelacionList');
    if (!ej || !container) return;

    container.innerHTML = '';
    (ej.pares || []).forEach(function(par, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'display: grid; grid-template-columns: 1.2fr auto 1fr auto; gap: 6px; align-items: center; margin-bottom: 8px; padding: 8px; background: #1e293b; border-radius: 4px;';
      
      var isBlockly = !!par.blocklyState;
      var leftInputHtml = isBlockly 
        ? '<div style="font-size: 11px; color: #a78bfa; font-weight: bold; background: rgba(153, 102, 255, 0.15); padding: 6px; border-radius: 4px; border: 1px dashed #9966FF; text-align: center; flex: 1;">[Lienzo con Bloques]</div>'
        : '<input type="text" placeholder="Izquierda (Texto)" value="' + (par.izquierda || '').replace(/"/g, '&quot;') + '" data-idx="' + idx + '" data-side="izquierda" style="padding: 6px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; width: 100%; flex: 1;">';

      div.innerHTML =
        '<div style="display: flex; gap: 4px; align-items: center; width: 100%;">' +
          leftInputHtml +
          '<button class="btn-par-bloques" data-idx="' + idx + '" style="padding: 6px 10px; background: ' + (isBlockly ? '#10b981' : '#3b82f6') + '; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px; white-space: nowrap;">' + (isBlockly ? '✏️ Bloques' : '🧩 Bloques') + '</button>' +
          (isBlockly ? '<button class="btn-par-eliminar-bloques" data-idx="' + idx + '" style="padding: 6px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px; font-weight: bold;">🗑️</button>' : '') +
        '</div>' +
        '<span style="color: #94a3b8;">↔</span>' +
        '<input type="text" placeholder="Derecha" value="' + (par.derecha || '').replace(/"/g, '&quot;') + '" data-idx="' + idx + '" data-side="derecha" style="padding: 6px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; width: 100%;">' +
        '<button data-delete="' + idx + '" style="padding: 4px 8px; background: #ef4444; border: none; border-radius: 4px; color: white; cursor: pointer;">✕</button>';
      container.appendChild(div);
    });

    container.querySelectorAll('input[data-side]').forEach(function(input) {
      input.oninput = function() {
        var idx = parseInt(input.getAttribute('data-idx'));
        var side = input.getAttribute('data-side');
        ej.pares[idx][side] = input.value;
      };
    });
    container.querySelectorAll('.btn-par-bloques').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-idx'));
        abrirEditorBloquesParaPar(ej, idx);
      };
    });
    container.querySelectorAll('.btn-par-eliminar-bloques').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-idx'));
        delete ej.pares[idx].blocklyState;
        delete ej.pares[idx].bloquesInfo;
        renderParesRelacion();
      };
    });
    container.querySelectorAll('button[data-delete]').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-delete'));
        ej.pares.splice(idx, 1);
        renderParesRelacion();
      };
    });
  }

  function renderEjercicioEditorCentral(ej) {
    var container = $('ejercicioEditor');
    if (!container) return;

    var tipo = TIPOS_EJERCICIO[ej.tipo] || { nombre: ej.tipo, color: '#666', icono: '?' };

    var html = '<div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 16px;">';
    html += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">';
    html += '<span style="font-size: 32px;">' + tipo.icono + '</span>';
    html += '<div>';
    html += '<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; background: ' + tipo.color + '22; color: ' + tipo.color + '; border: 1px solid ' + tipo.color + ';">' + tipo.nombre + '</span>';
    html += '<h3 style="margin: 4px 0 0; color: #e2e8f0;">' + (ej.enunciado || 'Sin enunciado') + '</h3>';
    html += '</div>';
    html += '</div>';
    html += '<div style="color: #94a3b8; font-size: 12px;">Puntos: ' + ej.puntos + ' • ID: ' + ej.id + '</div>';
    html += '</div>';

    // Vista previa según tipo
    html += '<div style="padding: 16px; background: #1e293b; border-radius: 8px;">';
    html += '<h4 style="margin: 0 0 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Vista Previa</h4>';

    switch (ej.tipo) {
      case 'quiz':
      case 'multiple_respuesta':
        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        (ej.opciones || []).forEach(function(op, idx) {
          var icon = ej.tipo === 'multiple_respuesta' ? '☐' : '○';
          var correct = op.correcta ? ' ✓' : '';
          html += '<div style="padding: 10px 14px; background: ' + (op.correcta ? '#22c55e22' : '#0f172a') + '; border: 1px solid ' + (op.correcta ? '#22c55e' : '#334155') + '; border-radius: 6px; color: #e2e8f0;">' + icon + ' ' + (op.texto || 'Opción ' + (idx + 1)) + correct + '</div>';
        });
        html += '</div>';
        break;
      case 'verdadero_falso':
        html += '<div style="display: flex; gap: 12px;">';
        html += '<div style="flex: 1; padding: 16px; text-align: center; background: ' + (ej.respuesta ? '#22c55e22' : '#0f172a') + '; border: 2px solid ' + (ej.respuesta ? '#22c55e' : '#334155') + '; border-radius: 8px; color: #e2e8f0; font-weight: bold;">VERDADERO' + (ej.respuesta ? ' ✓' : '') + '</div>';
        html += '<div style="flex: 1; padding: 16px; text-align: center; background: ' + (!ej.respuesta ? '#ef444422' : '#0f172a') + '; border: 2px solid ' + (!ej.respuesta ? '#ef4444' : '#334155') + '; border-radius: 8px; color: #e2e8f0; font-weight: bold;">FALSO' + (!ej.respuesta ? ' ✓' : '') + '</div>';
        html += '</div>';
        break;
      case 'completar_codigo':
        html += '<pre style="background: #0f172a; padding: 16px; border-radius: 6px; color: #e2e8f0; font-family: monospace; white-space: pre-wrap; margin: 0;">' + highlightHuecos(ej.codigo || '') + '</pre>';
        if (ej.respuestas && ej.respuestas.length > 0) {
          html += '<div style="margin-top: 12px; padding: 10px; background: #22c55e22; border-radius: 6px;"><strong style="color: #22c55e;">Respuestas:</strong> ' + ej.respuestas.join(', ') + '</div>';
        }
        break;
      case 'ordenar_bloques':
        html += '<div style="display: flex; flex-direction: column; gap: 6px;">';
        (ej.bloques || []).forEach(function(bloque, idx) {
          html += '<div style="padding: 10px; background: #3b82f622; border: 1px solid #3b82f6; border-radius: 6px; color: #e2e8f0; font-family: monospace;">' + (idx + 1) + '. ' + bloque + '</div>';
        });
        html += '</div>';
        if (ej.distractores && ej.distractores.length > 0) {
          html += '<div style="margin-top: 12px;"><span style="color: #ef4444; font-size: 11px;">Distractores:</span> ' + ej.distractores.join(', ') + '</div>';
        }
        break;
      case 'que_hace_codigo':
        html += '<pre style="background: #0f172a; padding: 16px; border-radius: 6px; color: #e2e8f0; font-family: monospace; white-space: pre-wrap; margin: 0;">' + (ej.codigo || 'Sin código') + '</pre>';
        html += '<div style="margin-top: 12px; padding: 10px; background: #22c55e22; border-radius: 6px;"><strong style="color: #22c55e;">Resultado esperado:</strong> ' + (ej.resultado || 'No definido') + '</div>';
        break;
      case 'escribir_codigo':
        html += '<div style="padding: 16px; background: #0f172a; border: 2px dashed #334155; border-radius: 8px; min-height: 100px; color: #64748b; text-align: center;">Área donde el estudiante escribirá código</div>';
        if (ej.palabrasClave && ej.palabrasClave.length > 0) {
          html += '<div style="margin-top: 12px;"><span style="color: #f59e0b;">Palabras clave requeridas:</span> ' + ej.palabrasClave.map(function(p) { return '<code style="background: #f59e0b22; padding: 2px 6px; border-radius: 3px; color: #f59e0b;">' + p + '</code>'; }).join(' ') + '</div>';
        }
        break;
      case 'relacionar':
        html += '<div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">';
        (ej.pares || []).forEach(function(par) {
          html += '<div style="padding: 10px; background: #9966FF22; border: 1px solid #9966FF; border-radius: 6px; text-align: center;">' + (par.izquierda || '?') + '</div>';
          html += '<span style="color: #94a3b8;">↔</span>';
          html += '<div style="padding: 10px; background: #f59e0b22; border: 1px solid #f59e0b; border-radius: 6px; text-align: center;">' + (par.derecha || '?') + '</div>';
        });
        html += '</div>';
        break;
      case 'depurar_codigo':
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';
        html += '<div><div style="color: #ef4444; font-size: 11px; margin-bottom: 6px;">CON ERROR</div><pre style="background: #ef444422; padding: 12px; border-radius: 6px; color: #fca5a5; font-family: monospace; white-space: pre-wrap; margin: 0; border: 1px solid #ef4444;">' + (ej.codigoError || '') + '</pre></div>';
        html += '<div><div style="color: #22c55e; font-size: 11px; margin-bottom: 6px;">CORREGIDO</div><pre style="background: #22c55e22; padding: 12px; border-radius: 6px; color: #86efac; font-family: monospace; white-space: pre-wrap; margin: 0; border: 1px solid #22c55e;">' + (ej.codigoCorregido || '') + '</pre></div>';
        html += '</div>';
        break;
      case 'reto_ejecucion':
        html += '<div style="padding: 16px; background: #00b35922; border: 2px solid #00b359; border-radius: 8px;">';
        html += '<div style="font-size: 24px; margin-bottom: 8px;">🎯</div>';
        html += '<p style="color: #e2e8f0; margin: 0;">' + (ej.descripcionReto || 'Descripción del reto') + '</p>';
        html += '</div>';
        if (ej.bloquesPermitidos && ej.bloquesPermitidos.length > 0) {
          html += '<div style="margin-top: 12px;"><span style="color: #3b82f6;">Bloques permitidos:</span> ' + ej.bloquesPermitidos.join(', ') + '</div>';
        }
        if (ej.maxBloques > 0) {
          html += '<div style="margin-top: 6px; color: #f59e0b;">Máximo ' + ej.maxBloques + ' bloques</div>';
        }
        break;

      // === EJERCICIOS CON BLOQUES VISUALES ===
      case 'bloques_completar':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px; min-height: 150px; position: relative;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🧩 EJERCICIO DE COMPLETAR BLOQUES</div>';
        if (ej.bloquesSolucion && ej.bloquesSolucion.length > 0) {
          html += '<div style="color: #22c55e; font-size: 12px;">✓ ' + ej.bloquesSolucion.length + ' bloques en la solución</div>';
        } else {
          html += '<div style="color: #f59e0b; font-size: 12px;">⚠ Sin solución definida. Usa el botón "Abrir editor de solución" en la pestaña Bloques.</div>';
        }
        if (ej.dropZones && ej.dropZones.length > 0) {
          html += '<div style="color: #3b82f6; font-size: 12px; margin-top: 4px;">📍 ' + ej.dropZones.length + ' hueco(s) para completar</div>';
        }
        html += '</div>';
        break;

      case 'bloques_ordenar':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🔢 EJERCICIO DE ORDENAR BLOQUES</div>';
        if (ej.bloquesOrdenados && ej.bloquesOrdenados.length > 0) {
          html += '<div style="display: flex; flex-direction: column; gap: 6px;">';
          ej.bloquesOrdenados.forEach(function(bloque, idx) {
            html += '<div style="padding: 8px 12px; background: #FFAB1922; border: 1px solid #FFAB19; border-radius: 6px; color: #e2e8f0; font-size: 12px;"><span style="color: #FFAB19; margin-right: 8px;">' + (idx + 1) + '.</span>' + bloque + '</div>';
          });
          html += '</div>';
        } else {
          html += '<div style="color: #f59e0b; font-size: 12px;">⚠ Sin bloques definidos. Usa el editor de solución.</div>';
        }
        html += '</div>';
        break;

      case 'bloques_armar':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px; min-height: 150px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🏗️ EJERCICIO DE ARMAR PROGRAMA</div>';
        html += '<div style="padding: 20px; border: 2px dashed #9966FF; border-radius: 8px; text-align: center; color: #9966FF;">';
        html += '<div style="font-size: 32px; margin-bottom: 8px;">🧩</div>';
        html += '<p style="margin: 0; font-size: 12px;">El estudiante armará un programa completo con bloques</p>';
        html += '</div>';
        if (ej.restricciones && ej.restricciones.maxBloques > 0) {
          html += '<div style="margin-top: 12px; color: #f59e0b; font-size: 12px;">Máximo ' + ej.restricciones.maxBloques + ' bloques</div>';
        }
        html += '</div>';
        break;

      case 'bloques_corregir':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🔧 EJERCICIO DE CORREGIR BLOQUES</div>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';
        html += '<div>';
        html += '<div style="color: #ef4444; font-size: 11px; margin-bottom: 6px;">❌ CON ERROR</div>';
        html += '<div style="padding: 12px; background: #ef444422; border: 1px solid #ef4444; border-radius: 6px; min-height: 80px; color: #fca5a5; font-size: 11px;">';
        html += (ej.bloquesConError && ej.bloquesConError.length > 0) ? ej.bloquesConError.length + ' bloques' : 'Sin definir';
        html += '</div></div>';
        html += '<div>';
        html += '<div style="color: #22c55e; font-size: 11px; margin-bottom: 6px;">✓ CORRECTO</div>';
        html += '<div style="padding: 12px; background: #22c55e22; border: 1px solid #22c55e; border-radius: 6px; min-height: 80px; color: #86efac; font-size: 11px;">';
        html += (ej.bloquesCorrectos && ej.bloquesCorrectos.length > 0) ? ej.bloquesCorrectos.length + ' bloques' : 'Sin definir';
        html += '</div></div>';
        html += '</div>';
        html += '</div>';
        break;
      case 'circuito_armar':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🔌 EJERCICIO DE ARMAR CIRCUITO (VELXIO)</div>';
        if (ej.circuitoSolucion && ej.circuitoSolucion.components) {
          var numComp = ej.circuitoSolucion.components.length;
          var numWires = (ej.circuitoSolucion.wires || []).length;
          html += '<div style="color: #22c55e; font-size: 12px; font-weight: bold;">✓ Circuito solución guardado: ' + numComp + ' componentes y ' + numWires + ' conexiones.</div>';
        } else {
          html += '<div style="color: #f59e0b; font-size: 12px;">⚠ Sin circuito solución guardado. Usa el botón "Diseñar Circuito Solución" en la pestaña Opciones.</div>';
        }
        if (ej.circuitoDiagrama) {
          html += '<div style="margin-top: 12px;">';
          html += '<span style="color: #3b82f6; font-size: 11px; display: block; margin-bottom: 6px;">Diagrama de Conexión (Referencia):</span>';
          html += '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 150px; border: 1px solid #334155; border-radius: 6px; object-fit: contain; background: #0b0f19; padding: 4px;">';
          html += '</div>';
        }
        html += '</div>';
        break;
      case 'circuito_depurar':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">🔧 EJERCICIO DE DEPURAR CIRCUITO (VELXIO)</div>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">';
        
        var compInit = ej.circuitoInicial && ej.circuitoInicial.components ? ej.circuitoInicial.components.length + ' comp.' : 'No definido';
        html += '<div>';
        html += '<div style="color: #ef4444; font-size: 11px; margin-bottom: 6px;">❌ CIRCUITO INICIAL (CON ERRORES)</div>';
        html += '<div style="padding: 12px; background: #ef444422; border: 1px solid #ef4444; border-radius: 6px; color: #fca5a5; font-size: 11px; text-align: center;">' + compInit + '</div>';
        html += '</div>';

        var compSol = ej.circuitoSolucion && ej.circuitoSolucion.components ? ej.circuitoSolucion.components.length + ' comp.' : 'No definido';
        html += '<div>';
        html += '<div style="color: #22c55e; font-size: 11px; margin-bottom: 6px;">✓ CIRCUITO SOLUCIÓN (CORRECTO)</div>';
        html += '<div style="padding: 12px; background: #22c55e22; border: 1px solid #22c55e; border-radius: 6px; color: #86efac; font-size: 11px; text-align: center;">' + compSol + '</div>';
        html += '</div>';
        
        html += '</div>';
        if (ej.circuitoDiagrama) {
          html += '<div style="margin-top: 12px;">';
          html += '<span style="color: #3b82f6; font-size: 11px; display: block; margin-bottom: 6px;">Diagrama de Conexión (Referencia):</span>';
          html += '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 150px; border: 1px solid #334155; border-radius: 6px; object-fit: contain; background: #0b0f19; padding: 4px;">';
          html += '</div>';
        }
        html += '</div>';
        break;
      case 'circuito_cuestionario':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">☑️ EJERCICIO DE CIRCUITO + QUIZ (VELXIO)</div>';
        
        if (ej.circuitoInicial && ej.circuitoInicial.components) {
          html += '<div style="color: #22c55e; font-size: 12px; font-weight: bold; margin-bottom: 12px;">✓ Circuito de inspección guardado (' + ej.circuitoInicial.components.length + ' componentes).</div>';
        } else {
          html += '<div style="color: #f59e0b; font-size: 12px; margin-bottom: 12px;">⚠ Sin circuito de inspección guardado. Usa el botón "Diseñar Circuito" en la pestaña Opciones.</div>';
        }

        html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        (ej.opciones || []).forEach(function(op, idx) {
          var icon = '○';
          var correct = op.correcta ? ' ✓ (Correcta)' : '';
          html += '<div style="padding: 10px 14px; background: ' + (op.correcta ? '#22c55e22' : '#0f172a') + '; border: 1px solid ' + (op.correcta ? '#22c55e' : '#334155') + '; border-radius: 6px; color: #e2e8f0; font-size: 12px;">' + icon + ' ' + (op.texto || 'Opción ' + (idx + 1)) + correct + '</div>';
        });
        html += '</div>';
        html += '</div>';
        break;
      case 'circuito_codigo':
        html += '<div style="background: #0f172a; border-radius: 8px; padding: 16px;">';
        html += '<div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">💻 EJERCICIO DE CIRCUITO + PROGRAMACIÓN (VELXIO)</div>';
        
        var pMode = ej.progMode || 'codigo';
        var hideMode = ej.ocultar || 'programacion';
        html += '<div style="display: flex; gap: 8px; margin-bottom: 12px;">';
        html += '  <span style="background: #3b82f622; color: #3b82f6; border: 1px solid #3b82f644; padding: 2px 8px; border-radius: 4px; font-size: 10px;">' + (pMode === 'bloques' ? '🧩 Bloques' : '💻 Código Texto') + '</span>';
        html += '  <span style="background: #ef444422; color: #f87171; border: 1px solid #ef444444; padding: 2px 8px; border-radius: 4px; font-size: 10px;">Ocultar: ' + (hideMode === 'programacion' ? 'Programación' : 'Circuito') + '</span>';
        html += '</div>';

        if (ej.circuitoSolucion && ej.circuitoSolucion.components) {
          var hasCode = (pMode === 'bloques') ? (ej.bloquesInfo && ej.bloquesInfo.length > 0) : checkHasCode(ej.circuitoSolucion.fileGroups);
          html += '<div style="color: #22c55e; font-size: 12px; font-weight: bold;">✓ Solución guardada: ' + ej.circuitoSolucion.components.length + ' componentes y ' + (hasCode ? 'programa configurado' : 'sin programa') + '.</div>';
        } else {
          html += '<div style="color: #f59e0b; font-size: 12px;">⚠ Sin circuito ni solución guardada. Usa la pestaña Opciones.</div>';
        }

        html += '<div style="margin-top: 12px; font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">';
        html += '  <div><strong>Tiempo de simulación:</strong> ' + (ej.arduinoSimTime || 2000) + ' ms</div>';
        html += '  <div><strong>Estados de pines esperados:</strong> <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">' + (ej.arduinoSimExpected || '{}') + '</code></div>';
        html += '</div>';

        if (ej.circuitoDiagrama) {
          html += '<div style="margin-top: 12px;">';
          html += '<span style="color: #3b82f6; font-size: 11px; display: block; margin-bottom: 6px;">Diagrama de Conexión (Referencia):</span>';
          html += '<img src="' + ej.circuitoDiagrama + '" style="max-width: 100%; max-height: 150px; border: 1px solid #334155; border-radius: 6px; object-fit: contain; background: #0b0f19; padding: 4px;">';
          html += '</div>';
        }
        html += '</div>';
        break;
    }

    html += '</div>';

    // Pista y explicación
    if (ej.pista) {
      html += '<div style="margin-top: 16px; padding: 12px; background: #f59e0b22; border-left: 3px solid #f59e0b; border-radius: 0 6px 6px 0;"><strong style="color: #f59e0b;">💡 Pista:</strong> <span style="color: #e2e8f0;">' + ej.pista + '</span></div>';
    }
    if (ej.explicacion) {
      html += '<div style="margin-top: 8px; padding: 12px; background: #3b82f622; border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0;"><strong style="color: #3b82f6;">📖 Explicación:</strong> <span style="color: #e2e8f0;">' + ej.explicacion + '</span></div>';
    }

    container.innerHTML = html;
  }

  function highlightHuecos(code) {
    return code.replace(/___/g, '<span style="background: #f59e0b; color: #0f172a; padding: 2px 12px; border-radius: 3px; font-weight: bold;">___</span>');
  }

  function syncEjercicioFromForm() {
    var ej = getSelectedEjercicio();
    if (!ej) return;

    ej.enunciado = $('ejercicioEnunciado') ? $('ejercicioEnunciado').value : '';
    ej.puntos = parseInt($('ejercicioPuntos') ? $('ejercicioPuntos').value : '10');
    ej.intentosMax = parseInt($('ejercicioIntentosMax') ? $('ejercicioIntentosMax').value : '-1');
    ej.pista = $('ejercicioPista') ? $('ejercicioPista').value : '';
    ej.explicacion = $('ejercicioExplicacion') ? $('ejercicioExplicacion').value : '';

    renderEjerciciosList();
    renderEjercicioEditorCentral(ej);
  }

  function duplicateSelectedEjercicio() {
    var ej = getSelectedEjercicio();
    if (!ej) { toast('Selecciona un ejercicio'); return; }

    var newEj = JSON.parse(JSON.stringify(ej));
    newEj.id = 'ej-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    var idx = evaluacionState.ejercicios.findIndex(function(e) { return e.id === ej.id; });
    evaluacionState.ejercicios.splice(idx + 1, 0, newEj);

    renderEjerciciosList();
    selectEjercicio(newEj.id);
    toast('Ejercicio duplicado');
  }

  function deleteSelectedEjercicio() {
    var ej = getSelectedEjercicio();
    if (!ej) { toast('Selecciona un ejercicio'); return; }

    showConfirm('¿Eliminar este ejercicio?', function() {
      evaluacionState.ejercicios = evaluacionState.ejercicios.filter(function(e) { return e.id !== ej.id; });
      selectedEjercicioId = null;
      renderEjerciciosList();
      selectEjercicio(null);
      toast('Ejercicio eliminado');
    });
  }

  function moveEjercicio(direction) {
    var ej = getSelectedEjercicio();
    if (!ej) return;

    var idx = evaluacionState.ejercicios.findIndex(function(e) { return e.id === ej.id; });
    var newIdx = idx + direction;

    if (newIdx < 0 || newIdx >= evaluacionState.ejercicios.length) return;

    var temp = evaluacionState.ejercicios[idx];
    evaluacionState.ejercicios[idx] = evaluacionState.ejercicios[newIdx];
    evaluacionState.ejercicios[newIdx] = temp;

    renderEjerciciosList();
  }

  function newEvaluacion() {
    var doCreate = function() {
      evaluacionState = createDefaultEvaluacionState();
      selectedEjercicioId = null;
      syncFormFromEvaluacionState();
      renderEjerciciosList();
      selectEjercicio(null);
      toast('Nueva evaluación creada');
    };

    if (evaluacionState.ejercicios.length > 0) {
      showConfirm('¿Crear nueva evaluación? Se perderán los cambios no guardados.', doCreate);
    } else {
      doCreate();
    }
  }

  function saveEvaluacion() {
    syncEvaluacionStateFromForm();

    var evaluaciones = JSON.parse(localStorage.getItem('stblock_evaluaciones') || '[]');
    var idx = evaluaciones.findIndex(function(e) { return e.id === evaluacionState.id; });

    if (idx >= 0) {
      evaluaciones[idx] = JSON.parse(JSON.stringify(evaluacionState));
    } else {
      evaluaciones.push(JSON.parse(JSON.stringify(evaluacionState)));
    }

    localStorage.setItem('stblock_evaluaciones', JSON.stringify(evaluaciones));
    refreshEvaluaciones();
    updateEvaluacionStats();
    toast('Evaluación guardada: ' + evaluacionState.titulo);
  }

  function exportEvaluacion() {
    syncEvaluacionStateFromForm();
    var json = JSON.stringify(evaluacionState, null, 2);
    var filename = (evaluacionState.id || 'evaluacion') + '.json';
    
    if (window.__TAURI__) {
      try {
        var dialog = window.__TAURI__.dialog;
        var core = window.__TAURI__.core;
        if (dialog && dialog.save && core && core.invoke) {
          dialog.save({
            defaultPath: filename,
            filters: [{ name: 'JSON', extensions: ['json'] }]
          }).then(function(filePath) {
            if (filePath) {
              var bytes = Array.from(new TextEncoder().encode(json));
              core.invoke('save_file', { path: filePath, content: bytes })
                .then(function() {
                  toast('JSON guardado: ' + filename);
                })
                .catch(function(err) {
                  console.error('[Editor] Error en save_file:', err);
                  showAlert('Error al guardar archivo: ' + err.message);
                });
            }
          }).catch(function(err) {
            console.error('[Editor] Error en dialog.save:', err);
          });
          return;
        }
      } catch (e) {
        console.warn('[Editor] Error al usar Tauri dialog/core:', e);
      }
    }
    
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    
    toast('Evaluación exportada');
  }

  function loadEvaluacion(data) {
    evaluacionState = data;
    if (!evaluacionState.id) evaluacionState.id = 'eval-' + Date.now();
    selectedEjercicioId = null;
    syncFormFromEvaluacionState();
    renderEjerciciosList();
    selectEjercicio(null);
  }

  function loadPlantilla(plantillaId) {
    var plantilla = PLANTILLAS_EVALUACION[plantillaId];
    if (!plantilla) {
      toast('Plantilla no encontrada');
      return;
    }

    var doLoad = function() {
      evaluacionState = createDefaultEvaluacionState();
      evaluacionState.titulo = plantilla.titulo;
      evaluacionState.nivel = plantilla.nivel;
      evaluacionState.tiempoLimite = plantilla.tiempoLimite;
      evaluacionState.tags = plantilla.tags.slice();
      evaluacionState.id = plantillaId + '-' + Date.now();

      plantilla.ejercicios.forEach(function(ejData) {
        var ej = createDefaultEjercicio(ejData.tipo);
        Object.assign(ej, ejData);
        ej.id = 'ej-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        evaluacionState.ejercicios.push(ej);
      });

      selectedEjercicioId = null;
      syncFormFromEvaluacionState();
      renderEjerciciosList();
      selectEjercicio(null);
      toast('Plantilla cargada: ' + plantilla.titulo);
    };

    if (evaluacionState.ejercicios.length > 0) {
      showConfirm('¿Cargar plantilla? Se reemplazará la evaluación actual.', doLoad);
    } else {
      doLoad();
    }
  }

  function refreshEvaluaciones() {
    var container = $('savedEvaluaciones');
    if (!container) return;

    var evaluaciones = JSON.parse(localStorage.getItem('stblock_evaluaciones') || '[]');

    if (evaluaciones.length === 0) {
      container.innerHTML = '<div class="empty" style="padding: 16px; text-align: center; color: #64748b;">No hay evaluaciones guardadas</div>';
      return;
    }

    container.innerHTML = '';
    evaluaciones.forEach(function(ev) {
      var div = document.createElement('div');
      div.className = 'map-card' + (evaluacionState.id === ev.id ? ' selected' : '');
      div.innerHTML =
        '<strong>' + ev.titulo + '</strong>' +
        '<span style="color: #94a3b8; font-size: 11px; display: block; margin-top: 2px;">' + (ev.ejercicios ? ev.ejercicios.length : 0) + ' ej. • ' + (ev.nivel || 'básico') + '</span>' +
        '<div style="display: flex; gap: 4px; margin-top: 6px;">' +
        '<button data-load="' + ev.id + '" style="flex: 1; padding: 4px 6px; font-size: 10px;">Cargar</button>' +
        '<button data-play="' + ev.id + '" style="padding: 4px 8px; font-size: 10px; background: #10b981; border: none; border-radius: 4px; color: white; cursor: pointer;">👁️ Ver</button>' +
        '<button data-delete="' + ev.id + '" style="padding: 4px 8px; font-size: 10px; background: #ef4444;">×</button>' +
        '</div>';
      container.appendChild(div);
    });

    container.querySelectorAll('button[data-load]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-load');
        var ev = evaluaciones.find(function(e) { return e.id === id; });
        if (ev) loadEvaluacion(JSON.parse(JSON.stringify(ev)));
      };
    });

    container.querySelectorAll('button[data-play]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-play');
        var ev = evaluaciones.find(function(e) { return e.id === id; });
        if (ev) previewEvaluacion(JSON.parse(JSON.stringify(ev)));
      };
    });

    container.querySelectorAll('button[data-delete]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-delete');
        showConfirm('¿Eliminar esta evaluación?', function() {
          var evals = JSON.parse(localStorage.getItem('stblock_evaluaciones') || '[]');
          evals = evals.filter(function(ev) { return ev.id !== id; });
          localStorage.setItem('stblock_evaluaciones', JSON.stringify(evals));
          refreshEvaluaciones();
          updateEvaluacionStats();
          toast('Evaluación eliminada');
        });
      };
    });
  }

  function updateEvaluacionStats() {
    var evaluaciones = JSON.parse(localStorage.getItem('stblock_evaluaciones') || '[]');
    var totalEjercicios = evaluaciones.reduce(function(sum, ev) { return sum + (ev.ejercicios ? ev.ejercicios.length : 0); }, 0);

    if ($('statTotalEvals')) $('statTotalEvals').textContent = evaluaciones.length;
    if ($('statTotalEjercicios')) $('statTotalEjercicios').textContent = totalEjercicios;
  }

  window.simulateArduinoCode = function(cppCode, maxDurationMs) {
    var pins = {};
    var timeline = [];
    var currentTime = 0;
    
    var code = cppCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    var setupMatch = code.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\}/);
    var loopMatch = code.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*?)\}/);
    
    if (!setupMatch || !loopMatch) {
      return { error: 'No se encontraron las funciones setup() o loop().' };
    }
    
    var setupContent = setupMatch[1];
    var loopContent = loopMatch[1];
    
    function pinMode(pin, mode) {
      pins[pin] = { mode: mode, val: 0 };
      timeline.push({ t: currentTime, pin: pin, mode: mode });
    }
    
    function digitalWrite(pin, val) {
      var valNum = (val === 'HIGH' || val === 1 || val === '1') ? 1 : 0;
      if (!pins[pin]) pins[pin] = { mode: 'OUTPUT' };
      pins[pin].val = valNum;
      timeline.push({ t: currentTime, pin: pin, val: valNum });
    }
    
    function analogWrite(pin, val) {
      if (!pins[pin]) pins[pin] = { mode: 'OUTPUT' };
      pins[pin].val = val;
      timeline.push({ t: currentTime, pin: pin, val: val, type: 'PWM' });
    }
    
    function delay(ms) {
      currentTime += parseInt(ms) || 0;
    }
    
    function transpile(block) {
      return block
        .replace(/\bint\b/g, 'var')
        .replace(/\bconst\s+var\b/g, 'var')
        .replace(/\bconst\b/g, 'var')
        .replace(/pinMode\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'pinMode($1, "$2")')
        .replace(/digitalWrite\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'digitalWrite($1, "$2")')
        .replace(/analogWrite\s*\(\s*(\w+)\s*,\s*([\w+\-*\/ ]+)\s*\)/g, 'analogWrite($1, $2)')
        .replace(/delay\s*\(\s*([\w+\-*\/ ]+)\s*\)/g, 'delay($1)')
        .replace(/HIGH/g, '1')
        .replace(/LOW/g, '0')
        .replace(/OUTPUT/g, '"OUTPUT"')
        .replace(/INPUT/g, '"INPUT"');
    }
    
    var jsSetup = transpile(setupContent);
    var jsLoop = transpile(loopContent);
    
    try {
      var runnerSetup = new Function('pinMode', 'digitalWrite', 'analogWrite', 'delay', jsSetup);
      runnerSetup(pinMode, digitalWrite, analogWrite, delay);
      
      var runnerLoop = new Function('pinMode', 'digitalWrite', 'analogWrite', 'delay', jsLoop);
      var iterations = 0;
      while (currentTime < maxDurationMs && iterations < 100) {
        runnerLoop(pinMode, digitalWrite, analogWrite, delay);
        iterations++;
      }
    } catch (e) {
      return { error: 'Error de sintaxis lógica en tu código: ' + e.message };
    }
    
    return { pins: pins, timeline: timeline, duration: currentTime };
  };

  function previewEvaluacion(specificEval) {
    var isEvent = (specificEval && (specificEval instanceof Event || typeof specificEval.preventDefault === 'function'));
    if (isEvent || !specificEval) {
      syncEvaluacionStateFromForm();
    }
    var targetEval = isEvent ? evaluacionState : (specificEval || evaluacionState);
    targetEval = JSON.parse(JSON.stringify(targetEval)); // Clonar para evitar mutar el estado original en memoria
    window.targetEval = targetEval; // Exponer globalmente para la inicialización de Blockly en vista previa

    // Mezcla aleatoria si se configuró ejercicios al azar y no hay progreso previo
    var hasSavedProgress = false;
    try {
      if (isStudentMode && targetEval) {
        hasSavedProgress = !!localStorage.getItem('stblock_student_progress_' + targetEval.id);
      }
    } catch(e) {}
    if (!hasSavedProgress && targetEval.ejercicios && targetEval.ejercicios.length > 0 && targetEval.ejerciciosAzar > 0) {
      var poolSize = targetEval.ejercicios.length;
      var count = Math.min(targetEval.ejerciciosAzar, poolSize);
      var shuffled = targetEval.ejercicios.slice().sort(function() { return 0.5 - Math.random(); });
      targetEval.ejercicios = shuffled.slice(0, count);
      console.log('[STBLOCK-STUDENT] Primera carga: Selección aleatoria de ejercicios. Seleccionados:', count, 'de', poolSize);
    }

    console.log('[STBLOCK-DEBUG-PREVIEW] previewEvaluacion iniciada.');
    console.log('[STBLOCK-DEBUG-PREVIEW] targetEval:', targetEval);

    var numEjercicios = targetEval.ejercicios ? targetEval.ejercicios.length : 0;
    console.log('[STBLOCK-DEBUG-PREVIEW] numEjercicios calculado:', numEjercicios);

    var timerInterval = null;
    var timeLeft = parseInt(targetEval.tiempoLimite || 15) * 60;
    var timeWasAgotado = false;

    // Crear modal de preview
    var overlay = document.createElement('div');
    overlay.id = 'evalPreviewOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';

    var modal = document.createElement('div');
    modal.id = 'evalPreviewModal';
    modal.style.cssText = 'background: #1e293b; border-radius: 12px; width: 100%; max-width: 800px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;';

    var header = document.createElement('div');
    header.id = 'evalPreviewHeader';
    header.style.cssText = 'padding: 16px 20px; background: #19663d; display: flex; justify-content: space-between; align-items: center;';
    
    var headerHtml = '<div><h2 style="margin: 0; color: white;">' + targetEval.titulo + '</h2>' +
                     '<span style="color: #86efac; font-size: 12px;">' + numEjercicios + ' ejercicios • ' + targetEval.tiempoLimite + ' min</span></div>' +
                     '<div style="display: flex; align-items: center; gap: 12px;">' +
                     '  <div id="previewTimer" style="background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 14px; color: #f87171; display: none; align-items: center; gap: 6px; border: 1px solid rgba(248,113,113,0.3);">' +
                     '    ⏱️ <span id="timerClock">00:00</span>' +
                     '  </div>' +
                     '  <button id="closePreview" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; line-height: 1;">×</button>' +
                     '</div>';
    header.innerHTML = headerHtml;

    var content = document.createElement('div');
    content.id = 'previewContent';
    content.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px;';

    var footer = document.createElement('div');
    footer.id = 'evalPreviewFooter';
    footer.style.cssText = 'padding: 16px 20px; background: #0f172a; display: flex; justify-content: space-between; align-items: center;';
    footer.innerHTML = '<div id="previewProgress" style="color: #94a3b8;">Presentación</div><div style="display: flex; gap: 8px;"><button id="prevEj" class="ghost" style="padding: 8px 16px;">← Anterior</button><button id="nextEj" class="primary" style="padding: 8px 16px;">Siguiente →</button></div>';

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var currentIdx = -1; // Portada
    var respuestas = [];
    var respuestasDetalladas = [];
    var intentosRealizados = {};
    window._showingExerciseIntro = false;
    window._evaluacionFinalizada = false;

    // Sincronizar evaluacionState para handlers globales si viene specificEval
    if (!isEvent && specificEval) {
      evaluacionState = specificEval;
    }

    // Regla de salida: bloqueo estricto (ocultar botón de cerrar en cabecera)
    if (targetEval.reglaSalida === 'bloqueo' && $('closePreview')) {
      $('closePreview').style.display = 'none';
    }

    // Función para guardar el progreso del estudiante en tiempo real (en localStorage)
    function syncStudentProgressToParent() {
      if (isStudentMode && targetEval) {
        var progress = {
          evalId: targetEval.id,
          currentIdx: currentIdx,
          respuestas: respuestas,
          intentosRealizados: intentosRealizados,
          timeLeft: timeLeft,
          timestamp: Date.now(),
          ejercicios: targetEval.ejercicios
        };
        localStorage.setItem('stblock_student_progress_' + targetEval.id, JSON.stringify(progress));
      }
    }

    // Intentar recuperar progreso previo para el alumno
    if (isStudentMode && targetEval) {
      try {
        var savedStr = localStorage.getItem('stblock_student_progress_' + targetEval.id);
        if (savedStr) {
          var parsed = JSON.parse(savedStr);
          var elapsedSecs = Math.floor((Date.now() - parsed.timestamp) / 1000);
          var calculatedTimeLeft = parsed.timeLeft - elapsedSecs;
          
          if (calculatedTimeLeft > 0) {
            timeLeft = calculatedTimeLeft;
            if (parsed.ejercicios) {
              targetEval.ejercicios = parsed.ejercicios;
              numEjercicios = targetEval.ejercicios.length;
            }
            if (parsed.intentosRealizados) {
              intentosRealizados = parsed.intentosRealizados;
            }
            if (targetEval.reglaSalida === 'reiniciar') {
              respuestas = [];
              currentIdx = -1;
              intentosRealizados = {};
              console.log('[STBLOCK-STUDENT] Progreso reiniciado (Regla: reiniciar). Tiempo restante:', timeLeft);
            } else {
              respuestas = parsed.respuestas || [];
              currentIdx = parsed.currentIdx;
              console.log('[STBLOCK-STUDENT] Progreso restaurado. Ejercicio:', currentIdx, 'Tiempo:', timeLeft);
            }
          } else {
            console.log('[STBLOCK-STUDENT] El tiempo de la prueba expiró mientras el alumno estaba fuera.');
            localStorage.removeItem('stblock_student_progress_' + targetEval.id);
            timeLeft = 0;
            timeWasAgotado = true;
          }
        }
      } catch (e) {
        console.warn('[STBLOCK-STUDENT] Error cargando progreso guardado:', e);
      }
    }

    function cleanupTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    function startTimer() {
      if (numEjercicios === 0) return;
      cleanupTimer();
      var timerEl = document.getElementById('previewTimer');
      var clockEl = document.getElementById('timerClock');
      if (timerEl) timerEl.style.display = 'flex';
      
      var initialMins = Math.floor(timeLeft / 60);
      var initialSecs = timeLeft % 60;
      if (clockEl) {
        clockEl.textContent = (initialMins < 10 ? '0' : '') + initialMins + ':' + (initialSecs < 10 ? '0' : '') + initialSecs;
      }

      timerInterval = setInterval(function() {
        if (timeLeft <= 0) {
          cleanupTimer();
          timeIsUp();
          return;
        }
        timeLeft--;
        syncStudentProgressToParent();
        
        var mins = Math.floor(timeLeft / 60);
        var secs = timeLeft % 60;
        if (clockEl) {
          clockEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        
        var warningSecs = parseInt(targetEval.tiempoAlerta !== undefined ? targetEval.tiempoAlerta : 1) * 60;
        if (timeLeft <= warningSecs && clockEl) {
          clockEl.style.color = '#f87171';
          clockEl.style.borderColor = '#ef4444';
          clockEl.style.animation = 'btn-pulse 1s infinite alternate';
        }
      }, 1000);
    }

    function timeIsUp() {
      timeWasAgotado = true;
      
      var interactiveArea = document.getElementById('ejercicioInteractivo');
      if (interactiveArea) {
        interactiveArea.innerHTML = '<div style="text-align: center; padding: 40px; background: #ef44441a; border: 2px solid #ef4444; border-radius: 8px; color: #f87171;">' +
                                    '<span style="font-size: 48px; display: block; margin-bottom: 12px;">🚨</span>' +
                                    '<h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">¡TIEMPO AGOTADO!</h3>' +
                                    '<p style="margin: 0; font-size: 13px;">Se ha superado el tiempo límite configurado para esta evaluación.</p>' +
                                    '</div>';
      }

      var prevBtn = $('prevEj');
      var nextBtn = $('nextEj');
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) {
        nextBtn.textContent = 'Ver Resultados 📊';
        nextBtn.onclick = function() {
          showFinalResults();
        };
      }
      
      toast('🚨 ¡Tiempo límite alcanzado! La evaluación ha finalizado.');
    }

    function showFinalResults() {
      window._evaluacionFinalizada = true;
      cleanupTimer();
      if (isStudentMode && targetEval) {
        localStorage.removeItem('stblock_student_progress_' + targetEval.id);
      }
      var total = respuestas.length;
      var correctas = respuestas.filter(function(r) { return r === true; }).length;
      var aprobado = correctas === total;

      var htmlFinal = '';
      
      if (targetEval && targetEval.notificarResultado === 'silencio') {
        htmlFinal = '<div style="text-align: center; padding: 50px 30px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 600px; margin: 20px auto; border-top: 5px solid #10b981;">' +
                     '  <div class="animated-float" style="font-size: 72px; margin-bottom: 24px; animation-duration: 3s;">🏁</div>' +
                     '  <h2 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 10px 0;">¡Evaluación completada!</h2>' +
                     '  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 auto 30px; max-width: 400px;">Has terminado todos los ejercicios de esta evaluación de forma exitosa. Tus respuestas han sido registradas.</p>' +
                     '</div>';
      } else {
        if (aprobado) {
          htmlFinal = '<div style="text-align: center; padding: 50px 30px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 600px; margin: 20px auto; border-top: 5px solid #10b981;">' +
                       '  <div class="animated-float" style="font-size: 72px; margin-bottom: 24px; filter: drop-shadow(0 10px 15px rgba(16,185,129,0.2));">🏆</div>' +
                       '  <h2 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 10px 0;">¡Evaluación aprobada!</h2>' +
                       '  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 auto 24px; max-width: 400px;">¡Excelente trabajo! Has resuelto todos los retos de forma impecable.</p>' +
                       '  <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 24px;">' +
                       '    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 24px; text-align: center;">' +
                       '      <div style="font-size: 10px; color: #047857; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">Aciertos</div>' +
                       '      <div style="font-size: 28px; font-weight: 800; color: #10b981;">' + correctas + ' <span style="font-size: 18px; font-weight: 400; color: #6b7280;">/ ' + total + '</span></div>' +
                       '    </div>' +
                       '    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 24px; text-align: center;">' +
                       '      <div style="font-size: 10px; color: #15803d; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">Puntaje</div>' +
                       '      <div style="font-size: 28px; font-weight: 800; color: #15803d;">100%</div>' +
                       '    </div>' +
                       '  </div>' +
                       '</div>';
        } else {
          var porcentaje = Math.round((correctas / total) * 100);
          htmlFinal = '<div style="text-align: center; padding: 50px 30px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 600px; margin: 20px auto; border-top: 5px solid #ef4444;">' +
                       '  <div class="btn-pulse" style="font-size: 72px; margin-bottom: 24px; display: inline-block; filter: drop-shadow(0 10px 15px rgba(239,68,68,0.15)); animation-duration: 2s;">❌</div>' +
                       '  <h2 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 10px 0;">Evaluación no aprobada</h2>' +
                       '  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 auto 24px; max-width: 400px;">Algunos ejercicios tienen respuestas incorrectas o faltantes. ¡Sigue practicando para mejorar!</p>' +
                       '  <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 30px;">' +
                       '    <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 12px 24px; text-align: center;">' +
                       '      <div style="font-size: 10px; color: #b91c1c; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">Aciertos</div>' +
                       '      <div style="font-size: 28px; font-weight: 800; color: #ef4444;">' + correctas + ' <span style="font-size: 18px; font-weight: 400; color: #6b7280;">/ ' + total + '</span></div>' +
                       '    </div>' +
                       '    <div style="background: #fff5f5; border: 1px solid #feb2b2; border-radius: 10px; padding: 12px 24px; text-align: center;">' +
                       '      <div style="font-size: 10px; color: #c53030; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">Puntaje</div>' +
                       '      <div style="font-size: 28px; font-weight: 800; color: #c53030;">' + porcentaje + '%</div>' +
                       '    </div>' +
                       '  </div>' +
                       '  <button id="btnReintentarEval" class="primary btn-pulse" style="padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 9999px; color: white; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); transition: all 0.2s;">🔄 Reintentar evaluación</button>' +
                       '</div>';
        }
      }

      content.innerHTML = htmlFinal;
      var btnLabel = isStudentMode ? 'Finalizar y Salir 🏁' : 'Cerrar vista previa';
      footer.innerHTML = '<div></div><button id="closePreviewBtn" class="primary" style="padding: 12px 24px;">' + btnLabel + '</button>';
      $('closePreviewBtn').onclick = closeAction;

      if (targetEval && targetEval.notificarResultado !== 'silencio' && !aprobado) {
        $('btnReintentarEval').onclick = function() {
          window._evaluacionFinalizada = false;
          intentosRealizados = {};
          currentIdx = 0;
          window._showingExerciseIntro = true;
          respuestas = [];
          timeLeft = parseInt(targetEval.tiempoLimite || 15) * 60;
          timeWasAgotado = false;
          renderPreviewEjercicio();
          startTimer();
        };
      }
    }

    function renderPreviewEjercicio() {
      function escapeHtml(text) {
        if (!text) return '';
        return text.toString()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      if (timeWasAgotado) {
        timeIsUp();
        return;
      }

      if (currentIdx === -1) {
        // Renderizar Portada/Presentación de la Evaluación
        var html = '<div class="intro-card-fancy" style="padding: 10px; display: flex; flex-direction: column; gap: 12px; text-align: center;">';
        
        // Icono animado y título
        html += '<div>';
        html += '  <div class="animated-float" style="font-size: 52px; margin-bottom: 8px; filter: drop-shadow(0 4px 6px rgba(16,185,129,0.2));">🚀</div>';
        html += '  <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">' + (targetEval.titulo || 'Nueva Evaluación') + '</h1>';
        
        // Nivel y Tags
        html += '  <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-items: center; margin-bottom: 12px;">';
        
        var colorNivel = '#10b981';
        var textNivel = 'Básico';
        if (targetEval.nivel === 'medio') {
          colorNivel = '#f59e0b';
          textNivel = 'Intermedio';
        } else if (targetEval.nivel === 'avanzado') {
          colorNivel = '#ef4444';
          textNivel = 'Avanzado';
        }
        
        html += '    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: ' + colorNivel + '1a; color: ' + colorNivel + '; border: 1px solid ' + colorNivel + '33;">⚡ ' + textNivel + '</span>';
        
        var tags = (targetEval.tags || []);
        tags.forEach(function(tag) {
          if (!tag.trim()) return;
          html += '    <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 10px; background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1;">🏷️ ' + tag.trim() + '</span>';
        });
        
        html += '  </div>';
        html += '</div>';

        // Mascotita/Burbuja de bienvenida interactiva
        html += '<div class="welcome-bubble" style="text-align: left; margin: 0 auto 8px; max-width: 780px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">';
        html += '  <span class="animated-float" style="font-size: 32px; animation-duration: 4s !important;">🤖</span>';
        html += '  <div>';
        html += '    <strong style="color: #047857; font-size: 13px;">¡Hola, futuro programador!</strong>';
        html += '    <p style="margin: 2px 0 0 0; font-size: 12px; color: #065f46; line-height: 1.4;">Prepara tu ingenio y tus bloques de lógica. Lee la descripción del reto y pulsa el botón de abajo para arrancar.</p>';
        html += '  </div>';
        html += '</div>';
        
        // Descripción
        var descText = targetEval.descripcion || 'Esta evaluación no contiene una descripción detallada.';
        html += '<div style="padding: 12px 16px; background: #f4f7ff; border-radius: 8px; border-left: 4px solid #38bdf8; font-size: 13px; line-height: 1.5; color: #4b5563; text-align: left; max-width: 780px; margin: 0 auto 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01);">';
        html += '  <p style="margin: 0; font-style: italic;">' + descText + '</p>';
        html += '</div>';

        // Detalles / Parámetros
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; max-width: 800px; margin: 4px auto 12px; width: 100%;">';
        
        // Tiempo
        html += '  <div class="parameter-card-fancy" style="padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; gap: 10px; text-align: left;">';
        html += '    <span style="font-size: 22px;">⏱️</span>';
        html += '    <div><div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em;">TIEMPO LÍMITE</div><div style="font-weight: bold; font-size: 12px; color: #1f2937;">' + (targetEval.tiempoLimite || '15') + ' minutos</div></div>';
        html += '  </div>';

        // Modo
        var labelModo = 'Mixto (Bloques+Preguntas)';
        if (targetEval.modo === 'bloques') labelModo = 'Bloques Visuales';
        else if (targetEval.modo === 'preguntas') labelModo = 'Solo Preguntas';
        
        html += '  <div class="parameter-card-fancy" style="padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; gap: 10px; text-align: left;">';
        html += '    <span style="font-size: 22px;">🧩</span>';
        html += '    <div><div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em;">MODO RETO</div><div style="font-weight: bold; font-size: 12px; color: #1f2937;">' + labelModo + '</div></div>';
        html += '  </div>';

        // Feedback
        var labelNotif = 'Al Avanzar';
        if (targetEval.notificarResultado === 'instante') labelNotif = 'Al Instante';
        else if (targetEval.notificarResultado === 'silencio') labelNotif = 'Al Finalizar';
        
        html += '  <div class="parameter-card-fancy" style="padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; gap: 10px; text-align: left;">';
        html += '    <span style="font-size: 22px;">📢</span>';
        html += '    <div><div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em;">RESPUESTAS</div><div style="font-weight: bold; font-size: 12px; color: #1f2937;">' + labelNotif + '</div></div>';
        html += '  </div>';

        html += '</div>'; // Fin grid

        // Botón comenzar
        html += '<div style="text-align: center; margin-top: 6px;">';
        html += '  <button id="btnComenzarEvaluacion" class="primary btn-pulse" style="padding: 12px 32px; font-size: 14px; font-weight: bold; border-radius: 9999px; cursor: pointer; border: none; transition: all 0.2s; outline: none;">¡Comenzar Evaluación! 🚀</button>';
        html += '</div>';

        html += '</div>'; // Fin portada

        content.innerHTML = html;

        var timerEl = document.getElementById('previewTimer');
        if (timerEl) timerEl.style.display = 'none';

        var progressEl = $('previewProgress');
        if (progressEl) progressEl.textContent = 'Presentación';
        
        var prevBtn = $('prevEj');
        if (prevBtn) prevBtn.disabled = true;
        
        var nextBtn = $('nextEj');
        if (nextBtn) {
          nextBtn.textContent = numEjercicios === 0 ? 'Sin ejercicios' : 'Comenzar 🚀';
          nextBtn.disabled = numEjercicios === 0;
        }

        var btnComenzar = document.getElementById('btnComenzarEvaluacion');
        if (btnComenzar) {
          if (numEjercicios === 0) {
            btnComenzar.style.opacity = '0.5';
            btnComenzar.style.cursor = 'not-allowed';
            btnComenzar.textContent = 'Sin ejercicios';
            btnComenzar.onclick = function() {
              toast('Agrega ejercicios en el editor para poder comenzar.');
            };
          } else {
            btnComenzar.onclick = function() {
              currentIdx = 0;
              window._showingExerciseIntro = true;
              renderPreviewEjercicio();
              startTimer();
            };
          }
        }
        return;
      }

      var ej = targetEval.ejercicios[currentIdx];
      if (!ej) return;
      var tipo = TIPOS_EJERCICIO[ej.tipo];

      if (window._showingExerciseIntro) {
        var html = '<div style="padding: 10px; color: #e2e8f0; display: flex; flex-direction: column; gap: 20px;">';
        
        html += '<div>';
        html += '<span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; background: ' + tipo.color + '22; color: ' + tipo.color + '; margin-bottom: 8px;">' + tipo.icono + ' ' + tipo.nombre + '</span>';
        html += '<h2 style="margin: 0; color: #fff; font-size: 24px; font-weight: bold;">Reto #' + (currentIdx + 1) + '</h2>';
        html += '</div>';

        html += '<div style="padding: 18px; background: #0f172a; border-radius: 8px; border-left: 4px solid ' + tipo.color + '; margin-bottom: 10px;">';
        html += '<h4 style="margin: 0 0 6px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">INSTRUCCIÓN</h4>';
        html += '<p style="margin: 0; font-size: 16px; font-weight: 500; color: #f1f5f9; line-height: 1.5;">' + (ej.enunciado || 'Resuelve el ejercicio planteado.') + '</p>';
        html += '</div>';

        var descTipo = '';
        var queHacer = '';
        switch (ej.tipo) {
          case 'quiz':
            descTipo = 'Pregunta de opción múltiple con una única respuesta correcta.';
            queHacer = 'Lee atentamente el enunciado y selecciona la opción que consideres correcta entre las opciones presentadas.';
            break;
          case 'multiple_respuesta':
            descTipo = 'Pregunta de opción múltiple con varias respuestas correctas.';
            queHacer = 'Lee atentamente el enunciado y selecciona una o más opciones correctas entre las presentadas.';
            break;
          case 'verdadero_falso':
            descTipo = 'Pregunta de afirmación con respuesta binaria.';
            queHacer = 'Decide si la afirmación es VERDADERA o FALSA y haz clic en el botón correspondiente.';
            break;
          case 'bloques_completar':
            descTipo = 'Completar bloques de código (Huecos).';
            queHacer = 'Verás un programa que tiene algunos espacios vacíos (huecos). Arrastra los bloques correctos desde el panel para rellenar los huecos y completar el programa de forma correcta.';
            break;
          case 'bloques_ordenar':
            descTipo = 'Ordenar secuencias de bloques.';
            queHacer = 'Los bloques del programa se encuentran dispersos por el lienzo. Debes ordenarlos y acoplarlos de arriba hacia abajo para reconstruir el programa en el orden de ejecución correcto.';
            break;
          case 'bloques_armar':
            descTipo = 'Armar programa desde cero.';
            queHacer = 'El lienzo de trabajo está completamente vacío. Debes construir el programa solicitado utilizando los bloques disponibles en la paleta de la izquierda.';
            break;
          case 'bloques_corregir':
            descTipo = 'Corregir error en programa (Depuración).';
            queHacer = 'Se te presenta un programa completo pero que contiene un error de lógica. Analiza el código y haz clic sobre el bloque culpable que contiene el error para seleccionarlo y marcar la respuesta.';
            break;
          case 'completar_codigo':
            descTipo = 'Completar código con huecos.';
            queHacer = 'Verás un fragmento de código con algunos espacios vacíos marcados como ?. Escribe la respuesta correcta en cada caja de texto para completar el programa.';
            break;
          case 'ordenar_bloques':
            descTipo = 'Ordenar líneas de código.';
            queHacer = 'Las líneas del programa están desordenadas. Usa los botones ▲ y ▼ para ordenar las líneas de arriba hacia abajo hasta reconstruir el código correcto.';
            break;
          case 'que_hace_codigo':
            descTipo = '¿Qué hace el código?';
            queHacer = 'Analiza detalladamente el código que se te presenta y escribe el resultado exacto de su ejecución.';
            break;
          case 'escribir_codigo':
            descTipo = 'Escribir código libre.';
            queHacer = 'Escribe un programa desde cero en el editor. Asegúrate de incluir todas las palabras clave indicadas en la parte superior.';
            break;
          case 'depurar_codigo':
            descTipo = 'Depurar código.';
            queHacer = 'El programa presentado contiene un error. Identifica la línea con el error, edítala directamente en el editor y corrígela.';
            break;
          case 'reto_ejecucion':
            descTipo = 'Reto de ejecución en arena 3D.';
            queHacer = 'Completa el reto de ejecución. Cuando estés listo, haz clic en "Simular Ejecución 3D" para verificar que se cumplen todas las condiciones de éxito.';
            break;
          default:
            descTipo = 'Ejercicio interactivo.';
            queHacer = 'Resuelve el reto siguiendo las instrucciones del enunciado.';
        }

        html += '<div style="padding: 16px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; font-size: 13px; line-height: 1.6;">';
        html += '<div style="margin-bottom: 12px;"><strong style="color: #38bdf8;">📝 ¿En qué consiste?:</strong> <span style="color: #cbd5e1;">' + descTipo + '</span></div>';
        html += '<div><strong style="color: #86efac;">👉 ¿Qué debes hacer?:</strong> <span style="color: #cbd5e1;">' + queHacer + '</span></div>';
        html += '</div>';

        if (ej.pista) {
          html += '<div style="padding: 12px; background: #f59e0b1a; border: 1px solid #f59e0b33; border-radius: 6px; font-size: 13px;">';
          html += '<strong style="color: #f59e0b;">💡 Pista de ayuda:</strong> <span style="color: #cbd5e1;">' + ej.pista + '</span>';
          html += '</div>';
        }

        html += '<div style="text-align: center; margin-top: 15px;">';
        html += '<button id="btnComenzarReto" class="primary" style="padding: 12px 30px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.2s;">🧩 Comenzar Reto</button>';
        html += '</div>';

        html += '</div>';

        content.innerHTML = html;

        var progressEl = $('previewProgress');
        if (progressEl) {
          progressEl.textContent = 'Reto ' + (currentIdx + 1) + ' (Explicación)';
        }
        var prevBtn = $('prevEj');
        if (prevBtn) {
          prevBtn.disabled = false;
        }
        var nextBtn = $('nextEj');
        if (nextBtn) {
          nextBtn.textContent = 'Comenzar Reto 🧩';
          nextBtn.disabled = false;
        }

        var btnComenzar = document.getElementById('btnComenzarReto');
        if (btnComenzar) {
          btnComenzar.onclick = function() {
            window._showingExerciseIntro = false;
            renderPreviewEjercicio();
          };
        }
        return;
      }

      var html = '<div style="margin-bottom: 20px;">';
      html += '<span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; background: ' + tipo.color + '22; color: ' + tipo.color + '; margin-bottom: 12px;">' + tipo.icono + ' ' + tipo.nombre + '</span>';
      html += '<h3 style="margin: 0; color: #e2e8f0; font-size: 18px;">' + ej.enunciado + '</h3>';
      html += '</div>';

      // Render opciones interactivas según tipo
      html += '<div id="ejercicioInteractivo">';
      switch (ej.tipo) {
        case 'quiz':
        case 'multiple_respuesta':
          if (ej.blocklyState) {
            html += '<div id="quizBloquesPreviewContainer" style="height: 180px; background: #0f172a; border-radius: 8px; overflow: hidden; margin-bottom: 16px; border: 1px solid #334155;"></div>';
          }
          (ej.opciones || []).forEach(function(op, idx) {
            var prefix = ej.tipo === 'multiple_respuesta' ? '☑️ ' : '🔘 ';
            html += '<div class="preview-option" data-idx="' + idx + '" style="padding: 14px; margin-bottom: 8px; background: #0f172a; border: 2px solid #334155; border-radius: 8px; cursor: pointer; transition: all 0.2s;">' + prefix + op.texto + '</div>';
          });
          break;
        case 'verdadero_falso':
          if (ej.blocklyState) {
            html += '<div id="quizBloquesPreviewContainer" style="height: 180px; background: #0f172a; border-radius: 8px; overflow: hidden; margin-bottom: 16px; border: 1px solid #334155;"></div>';
          }
          html += '<div style="display: flex; gap: 16px;">';
          html += '<div class="preview-option" data-value="true" style="flex: 1; padding: 20px; text-align: center; background: #0f172a; border: 2px solid #334155; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s;">VERDADERO</div>';
          html += '<div class="preview-option" data-value="false" style="flex: 1; padding: 20px; text-align: center; background: #0f172a; border: 2px solid #334155; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s;">FALSO</div>';
          html += '</div>';
          break;
        case 'bloques_completar':
        case 'bloques_ordenar':
        case 'bloques_armar':
        case 'bloques_corregir':
          html += '<div id="bloquesPreviewContainer" style="height: 400px; background: #0f172a; border-radius: 8px; overflow: hidden;"></div>';
          break;
        case 'relacionar':
          html += '<div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; align-items: start;">';
          
          // Columna izquierda (Bloques / Textos de origen)
          html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
          html += '<h4 style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Izquierda (Selecciona uno)</h4>';
          (ej.pares || []).forEach(function(par, idx) {
            html += '<div class="rel-left-card" data-idx="' + idx + '" style="position: relative; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 8px; cursor: pointer; transition: all 0.2s; min-height: 80px; display: flex; flex-direction: column; justify-content: center;">';
            if (par.blocklyState) {
              html += '<div id="relBlocklyContainer_' + idx + '" style="height: 120px; background: #0b0f19; border-radius: 6px; overflow: hidden; pointer-events: none;"></div>';
            } else {
              html += '<div style="font-weight: 500; font-size: 14px; color: #f1f5f9;">' + (par.izquierda || '') + '</div>';
            }
            html += '<span class="rel-badge" style="position: absolute; top: 4px; right: 4px; font-size: 9px; padding: 2px 6px; border-radius: 999px; background: rgba(0,0,0,0.4); color: #94a3b8; display: none;"></span>';
            html += '</div>';
          });
          html += '</div>';

          // Columna derecha (Textos de destino - barajados)
          html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
          html += '<h4 style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Derecha (Asocia con el seleccionado)</h4>';
          
          if (!window._relacionarDerechaShuffled || window._shuffledExerciseId !== ej.id) {
            var derArray = (ej.pares || []).map(function(p) { return p.derecha; });
            for (var i = derArray.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var temp = derArray[i];
              derArray[i] = derArray[j];
              derArray[j] = temp;
            }
            window._relacionarDerechaShuffled = derArray;
            window._shuffledExerciseId = ej.id;
            window._relacionarConexiones = [];
            window._selectedLeftIdx = null;
          }

          window._relacionarDerechaShuffled.forEach(function(derechaVal, idx) {
            html += '<div class="rel-right-card" data-val="' + derechaVal.replace(/"/g, '&quot;') + '" style="position: relative; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 8px; cursor: pointer; transition: all 0.2s; min-height: 80px; display: flex; align-items: center;">';
            html += '<div style="font-weight: 500; font-size: 14px; color: #f1f5f9;">' + derechaVal + '</div>';
            html += '<span class="rel-badge" style="position: absolute; top: 4px; right: 4px; font-size: 9px; padding: 2px 6px; border-radius: 999px; background: rgba(0,0,0,0.4); color: #94a3b8; display: none;"></span>';
            html += '</div>';
          });

          html += '</div>';
          html += '</div>';
          break;

        case 'completar_codigo':
          var htmlCode = (ej.codigo || '');
          var parts = htmlCode.split('___');
          var codeHtml = '';
          parts.forEach(function(part, idx) {
            codeHtml += escapeHtml(part);
            if (idx < parts.length - 1) {
              var expected = (ej.respuestas && ej.respuestas[idx] || '').trim();
              var w = Math.max(50, expected.length * 9);
              codeHtml += '<input type="text" class="completar-input" data-idx="' + idx + '" data-expected="' + expected.toLowerCase().replace(/"/g, '&quot;') + '" placeholder="?" style="background: #1e293b; border: 1px solid #475569; border-radius: 4px; color: #f59e0b; padding: 2px 8px; width: ' + w + 'px; font-family: monospace; font-weight: bold; text-align: center; margin: 0 4px; outline: none; transition: all 0.2s;">';
            }
          });
          html += '<pre style="background: #0f172a; padding: 16px; border-radius: 6px; color: #e2e8f0; font-family: monospace; font-size: 14px; white-space: pre-wrap; margin: 0; border: 1px solid #334155;">' + codeHtml + '</pre>';
          
          setTimeout(function() {
            content.querySelectorAll('.completar-input').forEach(function(inp) {
              inp.oninput = function() {
                if (targetEval && targetEval.notificarResultado === 'instante') {
                  var val = inp.value.trim().toLowerCase();
                  var expected = inp.getAttribute('data-expected');
                  if (val === expected) {
                    inp.style.borderColor = '#10b981';
                    inp.style.background = '#10b9811a';
                    inp.style.color = '#10b981';
                  } else {
                    inp.style.borderColor = '#ef4444';
                    inp.style.background = '#ef44441a';
                    inp.style.color = '#ef4444';
                  }
                }
              };
            });
          }, 50);
          break;

        case 'ordenar_bloques':
          if (!window._ordenarActivos || window._shuffledExerciseId !== ej.id) {
            var allBlocks = [];
            (ej.bloques || []).forEach(function(b, i) {
              allBlocks.push({ text: b, isDistractor: false, id: 'b-' + i });
            });
            if (ej.distractores && ej.distractores.length > 0) {
              ej.distractores.forEach(function(d, i) {
                allBlocks.push({ text: d, isDistractor: true, id: 'd-' + i });
              });
            }
            // Shuffle
            for (var i = allBlocks.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var temp = allBlocks[i];
              allBlocks[i] = allBlocks[j];
              allBlocks[j] = temp;
            }
            window._ordenarActivos = [];
            window._ordenarDisponibles = allBlocks;
            window._shuffledExerciseId = ej.id;
          }
          
          html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; min-height: 250px;">';
          
          // Secuencia activa
          html += '<div style="background: #0f172a; padding: 12px; border: 2px dashed #334155; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">';
          html += '<h4 style="margin: 0 0 8px 0; color: #38bdf8; font-size: 11px; text-transform: uppercase;">Secuencia Activa (Tu Solución)</h4>';
          if (window._ordenarActivos.length === 0) {
            html += '<div id="activePlaceholder" style="flex: 1; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 13px; font-style: italic; min-height: 150px; text-align: center;">Agrega bloques de código desde la derecha pulsando ➕</div>';
          } else {
            window._ordenarActivos.forEach(function(item, idx) {
              html += '<div class="ord-active-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #3b82f61a; border: 1px solid #3b82f6; border-radius: 6px; font-family: monospace; color: #f1f5f9; font-size: 13px;">';
              html += '<span>' + escapeHtml(item.text) + '</span>';
              html += '<div style="display: flex; gap: 4px; align-items: center;">';
              html += '<button class="ord-move-up" data-idx="' + idx + '" style="padding: 2px 6px; background: #1e293b; border: 1px solid #334155; color: #38bdf8; border-radius: 3px; cursor: pointer; font-size: 10px;">▲</button>';
              html += '<button class="ord-move-down" data-idx="' + idx + '" style="padding: 2px 6px; background: #1e293b; border: 1px solid #334155; color: #38bdf8; border-radius: 3px; cursor: pointer; font-size: 10px;">▼</button>';
              html += '<button class="ord-remove" data-idx="' + idx + '" style="padding: 2px 6px; background: #ef444422; border: 1px solid #ef4444; color: #ef4444; border-radius: 3px; cursor: pointer; font-size: 10px;">🗑️</button>';
              html += '</div>';
              html += '</div>';
            });
          }
          html += '</div>';

          // Bloques disponibles
          html += '<div style="background: #1e293b; padding: 12px; border: 1px solid #334155; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">';
          html += '<h4 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 11px; text-transform: uppercase;">Bloques Disponibles</h4>';
          if (window._ordenarDisponibles.length === 0) {
            html += '<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 13px; font-style: italic; min-height: 150px;">No quedan bloques disponibles</div>';
          } else {
            window._ordenarDisponibles.forEach(function(item, idx) {
              html += '<div class="ord-avail-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; font-family: monospace; color: #94a3b8; font-size: 13px;">';
              html += '<span>' + escapeHtml(item.text) + '</span>';
              html += '<button class="ord-add" data-idx="' + idx + '" style="padding: 2px 8px; background: #f59e0b22; border: 1px solid #f59e0b; color: #f59e0b; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">➕</button>';
              html += '</div>';
            });
          }
          html += '</div>';
          html += '</div>';
          
          setTimeout(function() {
            var container = content;
            container.querySelectorAll('.ord-add').forEach(function(btn) {
              btn.onclick = function() {
                var idx = parseInt(btn.getAttribute('data-idx'));
                var item = window._ordenarDisponibles.splice(idx, 1)[0];
                window._ordenarActivos.push(item);
                renderPreviewEjercicio();
              };
            });
            container.querySelectorAll('.ord-remove').forEach(function(btn) {
              btn.onclick = function() {
                var idx = parseInt(btn.getAttribute('data-idx'));
                var item = window._ordenarActivos.splice(idx, 1)[0];
                window._ordenarDisponibles.push(item);
                renderPreviewEjercicio();
              };
            });
            container.querySelectorAll('.ord-move-up').forEach(function(btn) {
              btn.onclick = function() {
                var idx = parseInt(btn.getAttribute('data-idx'));
                if (idx > 0) {
                  var temp = window._ordenarActivos[idx];
                  window._ordenarActivos[idx] = window._ordenarActivos[idx - 1];
                  window._ordenarActivos[idx - 1] = temp;
                  renderPreviewEjercicio();
                }
              };
            });
            container.querySelectorAll('.ord-move-down').forEach(function(btn) {
              btn.onclick = function() {
                var idx = parseInt(btn.getAttribute('data-idx'));
                if (idx < window._ordenarActivos.length - 1) {
                  var temp = window._ordenarActivos[idx];
                  window._ordenarActivos[idx] = window._ordenarActivos[idx + 1];
                  window._ordenarActivos[idx + 1] = temp;
                  renderPreviewEjercicio();
                }
              };
            });
          }, 50);
          break;

        case 'que_hace_codigo':
          html += '<pre style="background: #0f172a; padding: 16px; border-radius: 6px; color: #e2e8f0; font-family: monospace; font-size: 14px; white-space: pre-wrap; margin: 0 0 16px 0; border: 1px solid #334155;">' + escapeHtml(ej.codigo || '') + '</pre>';
          html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
          html += '<label style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase;">Tu Respuesta:</label>';
          html += '<input type="text" id="queHaceInput" placeholder="Escribe aquí tu análisis..." style="width: 100%; background: #0f172a; border: 2px solid #334155; border-radius: 8px; color: #fff; padding: 12px; font-size: 14px; outline: none; transition: border 0.2s;">';
          html += '</div>';
          break;

        case 'escribir_codigo':
          html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
          if (ej.palabrasClave && ej.palabrasClave.length > 0) {
            html += '<div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">';
            html += '<span style="color: #94a3b8; font-size: 11px; font-weight: bold;">PALABRAS CLAVE REQUERIDAS:</span>';
            ej.palabrasClave.forEach(function(kw) {
              html += '<code class="kw-badge" data-kw="' + kw + '" style="background: #1e293b; border: 1px solid #334155; padding: 3px 8px; border-radius: 4px; color: #f59e0b; font-size: 11px; font-family: monospace; transition: all 0.2s;">' + escapeHtml(kw) + '</code>';
            });
            html += '</div>';
          }
          
          var initialVal = (respuestasDetalladas[currentIdx] !== undefined) ? respuestasDetalladas[currentIdx] : '';
          if (!initialVal && targetEval && targetEval.entorno === 'dispositivos') {
            initialVal = "void setup() {\n  // Configura aquí tus pines virtuales\n}\n\nvoid loop() {\n  // Tu código repetitivo aquí\n}";
          }
          
          html += '<div style="display: flex; border: 2px solid #334155; border-radius: 8px; background: #0f172a; overflow: hidden; font-family: monospace; font-size: 14px;">';
          html += '<div id="codeGutter" style="background: #1e293b; padding: 12px 8px; color: #64748b; text-align: right; user-select: none; border-right: 1px solid #334155; min-width: 32px; line-height: 1.5;">1</div>';
          html += '<textarea id="escribirCodigoTextarea" placeholder="Escribe tu código aquí..." style="flex: 1; height: 180px; background: transparent; border: none; color: #e2e8f0; padding: 12px; outline: none; resize: vertical; line-height: 1.5; font-family: monospace; font-size: 14px; margin: 0;">' + escapeHtml(initialVal) + '</textarea>';
          html += '</div>';
          html += '</div>';
          
          setTimeout(function() {
            var ta = document.getElementById('escribirCodigoTextarea');
            var gutter = document.getElementById('codeGutter');
            if (ta && gutter) {
              ta.onkeydown = function(e) {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  var start = ta.selectionStart;
                  var end = ta.selectionEnd;
                  ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
                  ta.selectionStart = ta.selectionEnd = start + 2;
                  ta.oninput();
                }
              };

              ta.oninput = function() {
                var lines = ta.value.split('\n').length;
                var gutterHtml = '';
                for (var i = 1; i <= lines; i++) {
                  gutterHtml += i + '<br>';
                }
                gutter.innerHTML = gutterHtml;

                var code = ta.value.toLowerCase();
                content.querySelectorAll('.kw-badge').forEach(function(badge) {
                  var kw = badge.getAttribute('data-kw').toLowerCase();
                  if (code.indexOf(kw) !== -1) {
                    badge.style.borderColor = '#10b981';
                    badge.style.background = '#10b98122';
                    badge.style.color = '#10b981';
                  } else {
                    badge.style.borderColor = '#334155';
                    badge.style.background = '#1e293b';
                    badge.style.color = '#f59e0b';
                  }
                });
              };
              ta.oninput();
            }
          }, 50);
          break;

        case 'depurar_codigo':
          html += '<div style="margin-bottom: 12px; padding: 8px 12px; background: #ef44441a; border: 1px solid #ef444433; border-radius: 6px; display: inline-block;">';
          html += '<span style="color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠️ TIPO DE ERROR:</span> ';
          var labelError = 'Sintaxis';
          if (ej.tipoError === 'logica') labelError = 'Lógica';
          else if (ej.tipoError === 'ejecucion') labelError = 'Ejecución';
          html += '<span style="color: #f1f5f9; font-size: 12px; font-weight: bold;">' + labelError + '</span>';
          html += '</div>';

          html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">';
          // Original
          html += '<div>';
          html += '<label style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 6px;">Código Original (Con Error):</label>';
          html += '<pre style="background: #ef44440a; border: 1px solid #ef444433; border-radius: 6px; padding: 12px; color: #f87171; font-family: monospace; font-size: 13px; margin: 0; line-height: 1.5; white-space: pre-wrap; height: 180px; overflow-y: auto;">' + escapeHtml(ej.codigoError || '') + '</pre>';
          html += '</div>';
          
          // Editor de corrección
          var initialDepurarCode = (respuestasDetalladas[currentIdx] !== undefined) ? respuestasDetalladas[currentIdx] : (ej.codigoError || '');
          html += '<div>';
          html += '<label style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 6px;">Tu Corrección:</label>';
          html += '<div style="display: flex; border: 2px solid #334155; border-radius: 8px; background: #0f172a; overflow: hidden; font-family: monospace; font-size: 13px; height: 180px;">';
          html += '<div id="depurarGutter" style="background: #1e293b; padding: 12px 8px; color: #64748b; text-align: right; user-select: none; border-right: 1px solid #334155; min-width: 32px; line-height: 1.5;">1</div>';
          html += '<textarea id="depurarCodigoTextarea" style="flex: 1; background: transparent; border: none; color: #e2e8f0; padding: 12px; outline: none; resize: none; line-height: 1.5; font-family: monospace; font-size: 13px; margin: 0; overflow-y: auto;">' + escapeHtml(initialDepurarCode) + '</textarea>';
          html += '</div>';
          html += '</div>';
          html += '</div>';
          
          setTimeout(function() {
            var ta = document.getElementById('depurarCodigoTextarea');
            var gutter = document.getElementById('depurarGutter');
            if (ta && gutter) {
              ta.onkeydown = function(e) {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  var start = ta.selectionStart;
                  var end = ta.selectionEnd;
                  ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
                  ta.selectionStart = ta.selectionEnd = start + 2;
                  ta.oninput();
                }
              };

              ta.oninput = function() {
                var lines = ta.value.split('\n').length;
                var gutterHtml = '';
                for (var i = 1; i <= lines; i++) {
                  gutterHtml += i + '<br>';
                }
                gutter.innerHTML = gutterHtml;
              };
              ta.oninput();
            }
          }, 50);
          break;

        case 'reto_ejecucion':
          html += '<div style="display: flex; flex-direction: column; gap: 16px; background: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155;">';
          html += '<div>';
          html += '<h4 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 11px; text-transform: uppercase;">Objetivo del Reto</h4>';
          html += '<p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">' + escapeHtml(ej.descripcionReto || 'Completar el reto de ejecución.') + '</p>';
          html += '</div>';
          
          html += '<div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start;">';
          // Condiciones
          html += '<div>';
          if (ej.maxBloques > 0 || (ej.bloquesPermitidos && ej.bloquesPermitidos.length > 0)) {
            html += '<div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 10px; background: #1e293b; border-radius: 6px; font-size: 12px; margin-bottom: 12px;">';
            if (ej.maxBloques > 0) {
              html += '<div><span style="color: #94a3b8;">Límite de bloques:</span> <strong style="color: #f59e0b;">' + ej.maxBloques + '</strong></div>';
            }
            if (ej.bloquesPermitidos && ej.bloquesPermitidos.length > 0) {
              html += '<div><span style="color: #94a3b8;">Permitidos:</span> <strong style="color: #38bdf8;">' + ej.bloquesPermitidos.join(', ') + '</strong></div>';
            }
            html += '</div>';
          }
          
          html += '<h4 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 11px; text-transform: uppercase;">Condiciones de éxito</h4>';
          html += '<div style="display: flex; flex-direction: column; gap: 6px;">';
          var conds = ej.condiciones || {};
          var condKeys = Object.keys(conds);
          if (condKeys.length === 0) {
            html += '<div style="color: #64748b; font-size: 13px; font-style: italic;">No se definieron condiciones específicas.</div>';
          } else {
            condKeys.forEach(function(k) {
              html += '<div class="reto-cond-item" data-key="' + k + '" style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 13px;">';
              html += '<span class="cond-checkbox" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #64748b; border-radius: 3px; background: transparent;"></span>';
              html += '<span>' + escapeHtml(k + ': ' + JSON.stringify(conds[k])) + '</span>';
              html += '</div>';
            });
          }
          html += '</div>';
          html += '</div>';
          
          // Simulador Grid 2D
          html += '<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">';
          html += '<label style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase;">Arena de Física 3D</label>';
          html += '<div id="arenaGrid" style="width: 160px; height: 160px; background: #0b0f19; border: 2px solid #334155; border-radius: 8px; position: relative; overflow: hidden; display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 1fr);">';
          for (var g = 0; g < 25; g++) {
            html += '<div style="border: 1px solid rgba(51, 65, 85, 0.2);"></div>';
          }
          html += '<div id="robotDot" style="position: absolute; width: 16px; height: 16px; background: #8b5cf6; border-radius: 50%; left: 16px; top: 120px; transition: all 0.6s ease-in-out; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #8b5cf6;"><span style="font-size: 9px; color: white;">🤖</span></div>';
          html += '<div id="targetDot" style="position: absolute; width: 16px; height: 16px; background: #10b981; border-radius: 50%; left: 120px; top: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #10b981;"><span style="font-size: 9px; color: white;">🎯</span></div>';
          html += '</div>';
          html += '<button id="btnSimularReto" style="width: 100%; padding: 10px; background: #8b5cf6; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 13px;">⚡ Iniciar Simulación</button>';
          html += '<div id="simStatus" style="font-size: 11px; color: #94a3b8; font-style: italic; text-align: center; height: 16px; margin-top: 4px;"></div>';
          html += '</div>';

          html += '</div>'; // Fin sub-grid
          html += '</div>';
          
          window._retoSuperado = false;
          setTimeout(function() {
            var btn = document.getElementById('btnSimularReto');
            var status = document.getElementById('simStatus');
            var robot = document.getElementById('robotDot');
            if (btn && robot) {
              btn.onclick = function() {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                status.textContent = 'Simulando física...';
                
                setTimeout(function() {
                  robot.style.left = '80px';
                  robot.style.top = '80px';
                  var items = content.querySelectorAll('.reto-cond-item');
                  if (items.length > 0) {
                    var firstCheckbox = items[0].querySelector('.cond-checkbox');
                    firstCheckbox.style.border = '2px solid #10b981';
                    firstCheckbox.style.background = '#10b981';
                    firstCheckbox.innerHTML = '<span style="color: #fff; font-size: 9px; display: block; text-align: center; line-height: 10px;">✓</span>';
                    items[0].style.color = '#10b981';
                  }
                }, 800);

                setTimeout(function() {
                  robot.style.left = '120px';
                  robot.style.top = '20px';
                  var items = content.querySelectorAll('.reto-cond-item');
                  for (var idx = 1; idx < items.length; idx++) {
                    var cb = items[idx].querySelector('.cond-checkbox');
                    cb.style.border = '2px solid #10b981';
                    cb.style.background = '#10b981';
                    cb.innerHTML = '<span style="color: #fff; font-size: 9px; display: block; text-align: center; line-height: 10px;">✓</span>';
                    items[idx].style.color = '#10b981';
                  }
                  status.textContent = '🎉 ¡Simulación completada!';
                  status.style.color = '#10b981';
                  window._retoSuperado = true;
                }, 1800);
              };
            }
          }, 50);
          break;
        case 'circuito_armar':
        case 'circuito_depurar':
          html += '<div style="display: flex; flex-direction: column; gap: 12px; height: 600px;">';
          
          if (ej.circuitoDiagrama) {
            html += '<div style="display: flex; justify-content: flex-start; margin-bottom: 8px;">';
            html += '  <button id="btnVerDiagramaRef" style="padding: 8px 16px; background: #00979C; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: all 0.2s;">';
            html += '    🖼️ Ver diagrama de conexión';
            html += '  </button>';
            html += '</div>';
          }

          html += '<div style="flex: 1; border: 2px solid #334155; border-radius: 8px; overflow: hidden; background: #0b0f19; min-height: 400px; position: relative;">';
          html += '  <iframe id="velxioPlayerIframe" src="../../index.html#/editor" style="width: 100%; height: 100%; border: none;"></iframe>';
          html += '</div>';
          html += '</div>';

          // Instanciar eventos en diferido
          setTimeout(function() {
            if (ej.circuitoDiagrama) {
              var btnRef = document.getElementById('btnVerDiagramaRef');
              if (btnRef) {
                btnRef.onclick = function() {
                  var lightbox = document.createElement('div');
                  lightbox.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); z-index: 100000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
                  
                  var img = document.createElement('img');
                  img.src = ej.circuitoDiagrama;
                  img.style.cssText = 'max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; border: 2px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5);';
                  
                  lightbox.onclick = function() {
                    lightbox.remove();
                  };
                  
                  lightbox.appendChild(img);
                  document.body.appendChild(lightbox);
                };
              }
            }

            var playerIframe = document.getElementById('velxioPlayerIframe');
            if (playerIframe) {
              var pollAttempts = 0;
              var maxPollAttempts = 50;
              var pollInterval = setInterval(function() {
                pollAttempts++;
                try {
                  var win = playerIframe.contentWindow;
                  var boardStore = win.__VELXIO_BOARD_STORE;
                  var fileStore = win.__VELXIO_FILE_STORE;
                  if (boardStore && typeof boardStore.getState === 'function') {
                    clearInterval(pollInterval);
                    
                    var savedProgress = null;
                    try {
                      var key = 'stblock_student_circuit_' + targetEval.id + '_' + ej.id;
                      var data = localStorage.getItem(key);
                      if (data) savedProgress = JSON.parse(data);
                    } catch(e) {}

                    if (savedProgress) {
                      var storeState = boardStore.getState();
                      if (storeState.loadProjectState) {
                        storeState.loadProjectState(savedProgress);
                      }
                      if (savedProgress.fileGroups && fileStore && typeof fileStore.getState === 'function') {
                        var fStoreState = fileStore.getState();
                        if (fStoreState.loadFileGroups) {
                          fStoreState.loadFileGroups(savedProgress.fileGroups);
                        }
                      }
                    } else if (ej.circuitoInicial) {
                      var storeState = boardStore.getState();
                      if (storeState.loadProjectState) {
                        storeState.loadProjectState(ej.circuitoInicial);
                      }
                      if (ej.circuitoInicial.fileGroups && fileStore && typeof fileStore.getState === 'function') {
                        var fStoreState = fileStore.getState();
                        if (fStoreState.loadFileGroups) {
                          fStoreState.loadFileGroups(ej.circuitoInicial.fileGroups);
                        }
                      }
                    } else {
                      var boardId = targetEval.tarjeta || 'stbBoardV2';
                      initializeVelxioBoard(win, boardId);
                    }
                  }
                } catch(e) {}
                if (pollAttempts >= maxPollAttempts) {
                  clearInterval(pollInterval);
                  console.warn('[Velxio Player] Timed out waiting for stores to initialize.');
                }
              }, 200);
            }
          }, 50);
          break;

        case 'circuito_codigo':
          var pMode = ej.progMode || 'codigo';
          var hideMode = ej.ocultar || 'programacion';
          
          // Toolbar superior para alternar vistas
          html += '<div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; background: #1e293b; padding: 6px; border-radius: 30px; border: 1px solid #334155; width: fit-content; margin-left: auto; margin-right: auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">';
          html += '  <button id="btnToggleProgOnly" style="background: transparent; color: #94a3b8; border: none; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">';
          html += '    🧩 Programación';
          html += '  </button>';
          html += '  <button id="btnToggleSplit" style="background: #334155; color: #fff; border: none; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">';
          html += '    🌗 Vista Dividida';
          html += '  </button>';
          html += '  <button id="btnToggleCircuitOnly" style="background: transparent; color: #94a3b8; border: none; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">';
          html += '    🔌 Circuito';
          html += '  </button>';
          html += '</div>';

          // Contenedor Grid principal
          html += '<div id="circuitoCodigoGridContainer" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; height: 600px;">';
          
          // Izquierda: Blockly/Código Panel
          html += '  <div id="leftPanelCircuitoCodigo" style="display: flex; flex-direction: column; background: #0f172a; border-radius: 8px; border: 1px solid #334155; overflow: hidden; height: 100%;">';
          html += '    <div style="padding: 10px 16px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">';
          if (pMode === 'bloques') {
            html += '      <strong style="color: #e2e8f0; font-size: 13px;">🧩 Programación por Bloques</strong>';
            if (hideMode === 'circuito') {
              html += '      <span style="font-size: 11px; color: #10b981; font-weight: bold;">✓ Solución en Bloques (Lectura)</span>';
            }
          } else {
            if (hideMode === 'circuito') {
              html += '      <strong style="color: #e2e8f0; font-size: 13px;">💻 Código Arduino de Control (Lectura)</strong>';
            } else {
              html += '      <strong style="color: #e2e8f0; font-size: 13px;">💻 Código Arduino de Control (Escritura)</strong>';
            }
          }
          html += '    </div>';
          
          if (pMode === 'bloques') {
            html += '    <div style="display: flex; flex: 1; min-height: 0;">';
            if (hideMode === 'programacion') {
              html += '      <div id="toolboxPreviewArea" style="width: 200px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column;">';
              html += '        <div style="padding: 12px 16px; border-bottom: 1px solid #334155;"><h4 style="margin: 0; color: #e2e8f0; font-size: 13px;">📦 Bloques disponibles</h4></div>';
              html += '        <div id="toolboxBlocklyContainer" style="flex: 1; min-height: 200px;"></div>';
              html += '      </div>';
            } else {
              html += '      <div id="toolboxPreviewArea" style="display: none;">';
              html += '        <div id="toolboxBlocklyContainer"></div>';
              html += '      </div>';
            }
            html += '      <div id="workspacePreviewArea" style="flex: 1; display: flex; flex-direction: column; position: relative;">';
            html += '        <div id="mainBlocklyContainer" style="flex: 1; height: 100%; width: 100%;"></div>';
            html += '      </div>';
            html += '    </div>';
          } else {
            // Modo código
            if (hideMode === 'circuito') {
              var solutionCode = extractArduinoCode(ej.circuitoSolucion ? ej.circuitoSolucion.fileGroups : null) || "// No hay código de solución configurado.";
              html += '    <pre style="flex: 1; margin: 0; padding: 16px; background: #0b0f19; color: #38bdf8; font-family: monospace; font-size: 13px; line-height: 1.5; overflow: auto; white-space: pre-wrap;">' + escapeHtml(solutionCode) + '</pre>';
            } else {
              var initialCode = "";
              try {
                var key = 'stblock_student_circuit_' + targetEval.id + '_' + ej.id;
                var val = localStorage.getItem(key);
                if (val) {
                  var saved = JSON.parse(val);
                  initialCode = extractArduinoCode(saved.fileGroups) || "";
                }
              } catch(e) {}
              if (!initialCode && ej.circuitoSolucion && ej.circuitoSolucion.fileGroups) {
                initialCode = extractArduinoCode(ej.circuitoSolucion.fileGroups) || "";
              }
              html += '    <div style="flex: 1; display: flex; font-family: monospace; font-size: 13px; min-height: 0; background: #0b0f19;">';
              html += '      <div id="studentCodeGutter" style="background: #1e293b; padding: 12px 8px; color: #64748b; text-align: right; user-select: none; border-right: 1px solid #334155; min-width: 32px; line-height: 1.5;">1</div>';
              html += '      <textarea id="studentCodeTextarea" style="flex: 1; background: transparent; border: none; color: #38bdf8; padding: 12px; outline: none; resize: none; line-height: 1.5; font-family: monospace; font-size: 13px; margin: 0; overflow-y: auto;" placeholder="// Escribe tu código Arduino aquí...">' + escapeHtml(initialCode) + '</textarea>';
              html += '    </div>';
            }
          }
          html += '  </div>';

          // Derecha: Velxio / Circuit Panel
          html += '  <div id="rightPanelCircuitoCodigo" style="display: flex; flex-direction: column; gap: 12px; height: 100%;">';
          if (ej.circuitoDiagrama) {
            html += '    <div style="display: flex; justify-content: flex-start;">';
            html += '      <button id="btnVerDiagramaRef" style="padding: 8px 16px; background: #00979C; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: all 0.2s;">';
            html += '        🖼️ Ver diagrama de conexión';
            html += '      </button>';
            html += '    </div>';
          }
          html += '    <div style="flex: 1; border: 2px solid #334155; border-radius: 8px; overflow: hidden; background: #0b0f19;">';
          html += '      <iframe id="velxioPlayerIframe" src="../../index.html#/editor" style="width: 100%; height: 100%; border: none;"></iframe>';
          html += '    </div>';
          html += '  </div>';

          html += '</div>';

          // Inicializar eventos en diferido para circuito_codigo
          setTimeout(function() {
            var btnProg = document.getElementById('btnToggleProgOnly');
            var btnSplit = document.getElementById('btnToggleSplit');
            var btnCirc = document.getElementById('btnToggleCircuitOnly');
            var gridContainer = document.getElementById('circuitoCodigoGridContainer');
            var leftPanel = document.getElementById('leftPanelCircuitoCodigo');
            var rightPanel = document.getElementById('rightPanelCircuitoCodigo');

            function setViewMode(mode) {
              if (mode === 'prog') {
                leftPanel.style.display = 'flex';
                rightPanel.style.display = 'none';
                gridContainer.style.display = 'block'; // Ocupa todo
                
                btnProg.style.background = '#38bdf8';
                btnProg.style.color = '#0f172a';
                btnSplit.style.background = 'transparent';
                btnSplit.style.color = '#94a3b8';
                btnCirc.style.background = 'transparent';
                btnCirc.style.color = '#94a3b8';
              } else if (mode === 'circ') {
                leftPanel.style.display = 'none';
                rightPanel.style.display = 'flex';
                gridContainer.style.display = 'block';
                
                btnProg.style.background = 'transparent';
                btnProg.style.color = '#94a3b8';
                btnSplit.style.background = 'transparent';
                btnSplit.style.color = '#94a3b8';
                btnCirc.style.background = '#38bdf8';
                btnCirc.style.color = '#0f172a';
              } else {
                leftPanel.style.display = 'flex';
                rightPanel.style.display = 'flex';
                gridContainer.style.display = 'grid';
                gridContainer.style.gridTemplateColumns = '1fr 1.2fr';
                
                btnProg.style.background = 'transparent';
                btnProg.style.color = '#94a3b8';
                btnSplit.style.background = '#334155';
                btnSplit.style.color = '#fff';
                btnCirc.style.background = 'transparent';
                btnCirc.style.color = '#94a3b8';
              }
              if (pMode === 'bloques' && window._previewWorkspace) {
                setTimeout(function() {
                  Blockly.svgResize(window._previewWorkspace);
                }, 100);
              }
            }

            if (btnProg && btnSplit && btnCirc) {
              btnProg.onclick = function() { setViewMode('prog'); };
              btnSplit.onclick = function() { setViewMode('split'); };
              btnCirc.onclick = function() { setViewMode('circ'); };
            }

            if (pMode === 'bloques') {
              var isReadOnly = (hideMode === 'circuito');
              var cats = ej.categoriasPermitidas || ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'lists', 'custom', 'pen', 'music', 'logic', 'state', 'debug', 'gravity', 'physics'];
              initPreviewBlockly(ej, cats, !isReadOnly);
              // Redimensionar Blockly después de que se renderice en el DOM para evitar que colapse a altura 0
              setTimeout(function() {
                if (window._previewWorkspace) {
                  Blockly.svgResize(window._previewWorkspace);
                }
              }, 400);
            } else if (pMode === 'codigo' && hideMode === 'programacion') {
              var ta = document.getElementById('studentCodeTextarea');
              var gutter = document.getElementById('studentCodeGutter');
              if (ta && gutter) {
                ta.onkeydown = function(e) {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    var start = ta.selectionStart;
                    var end = ta.selectionEnd;
                    ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
                    ta.selectionStart = ta.selectionEnd = start + 2;
                    ta.oninput();
                  }
                };
                ta.oninput = function() {
                  var lines = ta.value.split('\n').length;
                  var gutterHtml = '';
                  for (var i = 1; i <= lines; i++) {
                    gutterHtml += i + '<br>';
                  }
                  gutter.innerHTML = gutterHtml;
                  
                  // Sincronizar el código del textarea hacia el fileStore del Iframe de Velxio
                  var playerIframe = document.getElementById('velxioPlayerIframe');
                  if (playerIframe) {
                    try {
                      var win = playerIframe.contentWindow;
                      var fileStore = win.__VELXIO_FILE_STORE;
                      if (fileStore && typeof fileStore.getState === 'function') {
                        var fStoreState = fileStore.getState();
                        if (fStoreState.fileGroups) {
                          var foundFile = null;
                          fStoreState.fileGroups.forEach(function(g) {
                            if (g.files) {
                              g.files.forEach(function(f) {
                                if (f.name.endsWith('.ino') || f.name.endsWith('.cpp')) {
                                  foundFile = f;
                                }
                              });
                            }
                          });
                          if (foundFile) {
                            foundFile.content = ta.value;
                          }
                        }
                      }
                    } catch(ex) {}
                  }
                };
                ta.oninput();
              }
            }

            if (ej.circuitoDiagrama) {
              var btnRef = document.getElementById('btnVerDiagramaRef');
              if (btnRef) {
                btnRef.onclick = function() {
                  var lightbox = document.createElement('div');
                  lightbox.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); z-index: 100000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
                  var img = document.createElement('img');
                  img.src = ej.circuitoDiagrama;
                  img.style.cssText = 'max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; border: 2px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5);';
                  lightbox.onclick = function() { lightbox.remove(); };
                  lightbox.appendChild(img);
                  document.body.appendChild(lightbox);
                };
              }
            }

            var playerIframe = document.getElementById('velxioPlayerIframe');
            if (playerIframe) {
              var pollAttempts = 0;
              var maxPollAttempts = 50;
              var pollInterval = setInterval(function() {
                pollAttempts++;
                try {
                  var win = playerIframe.contentWindow;
                  var boardStore = win.__VELXIO_BOARD_STORE;
                  var fileStore = win.__VELXIO_FILE_STORE;
                  if (boardStore && typeof boardStore.getState === 'function') {
                    clearInterval(pollInterval);
                    
                    var savedProgress = null;
                    try {
                      var key = 'stblock_student_circuit_' + targetEval.id + '_' + ej.id;
                      var data = localStorage.getItem(key);
                      if (data) savedProgress = JSON.parse(data);
                    } catch(e) {}

                    if (savedProgress) {
                      var storeState = boardStore.getState();
                      if (storeState.loadProjectState) {
                        storeState.loadProjectState(savedProgress);
                      }
                      if (savedProgress.fileGroups && fileStore && typeof fileStore.getState === 'function') {
                        var fStoreState = fileStore.getState();
                        if (fStoreState.loadFileGroups) {
                          fStoreState.loadFileGroups(savedProgress.fileGroups);
                        }
                      }
                    } else if (hideMode === 'programacion') {
                      var storeState = boardStore.getState();
                      if (storeState.loadProjectState && ej.circuitoSolucion) {
                        var circuitOnly = Object.assign({}, ej.circuitoSolucion);
                        circuitOnly.fileGroups = null; // Quitar el código solución
                        storeState.loadProjectState(circuitOnly);
                      } else {
                        var boardId = targetEval.tarjeta || 'stbBoardV2';
                        initializeVelxioBoard(win, boardId);
                      }
                    } else {
                      var storeState = boardStore.getState();
                      var startCircuit = ej.circuitoInicial || { boards: [{ id: 'uno', type: targetEval.tarjeta || 'stbBoardV2' }], components: [], wires: [] };
                      if (storeState.loadProjectState) {
                        storeState.loadProjectState(startCircuit);
                      }
                      if (ej.circuitoSolucion && ej.circuitoSolucion.fileGroups && fileStore && typeof fileStore.getState === 'function') {
                        var fStoreState = fileStore.getState();
                        if (fStoreState.loadFileGroups) {
                          fStoreState.loadFileGroups(ej.circuitoSolucion.fileGroups);
                        }
                      }
                    }
                  }
                } catch(e) {}
                if (pollAttempts >= maxPollAttempts) {
                  clearInterval(pollInterval);
                  console.warn('[Velxio Player] Timed out waiting for stores to initialize.');
                }
              }, 200);
            }
          }, 100);
          break;
        case 'circuito_cuestionario':
          html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 600px;">';
          
          // Izquierda: Quiz
          html += '  <div style="display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155;">';
          html += '    <h3 style="margin: 0 0 8px 0; color: #e2e8f0; font-size: 14px;">Elige la respuesta correcta:</h3>';
          html += '    <div style="display: flex; flex-direction: column; gap: 8px;">';
          (ej.opciones || []).forEach(function(op, idx) {
            var inputId = 'cuestionarioOpt_' + ej.id + '_' + idx;
            var isChecked = respuestasDetalladas[currentIdx] === op.texto;
            html += '      <label for="' + inputId + '" class="preview-option' + (isChecked ? ' selected' : '') + '" data-idx="' + idx + '" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; cursor: pointer; color: #e2e8f0; font-size: 13px; transition: all 0.2s;">';
            html += '        <input type="radio" id="' + inputId + '" name="circuitoQuizRadio_' + ej.id + '" value="' + op.texto + '" ' + (isChecked ? 'checked' : '') + ' style="width: 18px; height: 18px; cursor: pointer;">';
            html += '        <span>' + op.texto + '</span>';
            html += '      </label>';
          });
          html += '    </div>';
          html += '  </div>';

          // Derecha: Velxio
          html += '  <div style="border: 2px solid #334155; border-radius: 8px; overflow: hidden; background: #0b0f19; min-height: 400px;">';
          html += '    <iframe id="velxioPlayerIframe" src="../../index.html#/editor" style="width: 100%; height: 100%; border: none;"></iframe>';
          html += '  </div>';
          html += '</div>';

          // Instanciar eventos en diferido
          setTimeout(function() {
            var optionsEls = document.querySelectorAll('.preview-option[data-idx]');
            optionsEls.forEach(function(el) {
              el.onclick = function(e) {
                optionsEls.forEach(function(other) {
                  other.classList.remove('selected');
                  var otherInput = other.querySelector('input');
                  if (otherInput) otherInput.checked = false;
                });
                el.classList.add('selected');
                var radio = el.querySelector('input');
                if (radio) {
                  radio.checked = true;
                  respuestasDetalladas[currentIdx] = radio.value;
                }
              };
            });

            var playerIframe = document.getElementById('velxioPlayerIframe');
            if (playerIframe) {
              var pollAttempts = 0;
              var maxPollAttempts = 50;
              var pollInterval = setInterval(function() {
                pollAttempts++;
                try {
                  var win = playerIframe.contentWindow;
                  var boardStore = win.__VELXIO_BOARD_STORE;
                  if (boardStore && typeof boardStore.getState === 'function') {
                    clearInterval(pollInterval);
                    
                    if (ej.circuitoInicial) {
                      var storeState = boardStore.getState();
                      if (storeState.loadProjectState) {
                        storeState.loadProjectState(ej.circuitoInicial);
                      }
                    } else {
                      var boardId = targetEval.tarjeta || 'stbBoardV2';
                      initializeVelxioBoard(win, boardId);
                    }
                  }
                } catch(e) {}
                if (pollAttempts >= maxPollAttempts) {
                  clearInterval(pollInterval);
                }
              }, 200);
            }
          }, 50);
          break;
        default:
          html += '<div style="padding: 40px; background: #0f172a; border-radius: 8px; text-align: center; color: #64748b;">Vista previa de "' + tipo.nombre + '" disponible en la versión para estudiantes</div>';
      }
      html += '</div>';

      // Renderizar sub-Blockly para cada par de relacionar
      if (ej.tipo === 'relacionar') {
        (ej.pares || []).forEach(function(par, idx) {
          if (par.blocklyState) {
            setTimeout(function() {
              var containerId = 'relBlocklyContainer_' + idx;
              var containerEl = document.getElementById(containerId);
              if (containerEl && typeof Blockly !== 'undefined') {
                var ws = Blockly.inject(containerEl, {
                  readOnly: true,
                  scrollbars: false,
                  renderer: 'zelos',
                  theme: Blockly.Themes.Dark || Blockly.Themes.Classic,
                  zoom: { startScale: 0.7 }
                });
                try {
                  Blockly.serialization.workspaces.load(par.blocklyState, ws);
                  ws.scroll(30, 30);
                  setTimeout(function() { Blockly.svgResize(ws); }, 50);
                } catch(e) {
                  console.error('Error al cargar bloques para par en preview:', e);
                }
              }
            }, 50);
          }
        });
      }

      // Renderizar bloques si es ejercicio de bloques o quiz/múltiple/VF con bloques
      if (ej.tipo.startsWith('bloques_') && typeof renderEjercicioBloquesPreview === 'function') {
        setTimeout(function() {
          var bloquesContainer = document.getElementById('bloquesPreviewContainer');
          if (bloquesContainer) {
            renderEjercicioBloquesPreview(ej, bloquesContainer, true); // true = modo alumno
          }
        }, 50);
      }

      if ((ej.tipo === 'quiz' || ej.tipo === 'multiple_respuesta' || ej.tipo === 'verdadero_falso') && ej.blocklyState) {
        setTimeout(function() {
          var bloquesContainer = document.getElementById('quizBloquesPreviewContainer');
          if (bloquesContainer && typeof Blockly !== 'undefined') {
            var ws = Blockly.inject(bloquesContainer, {
              readOnly: true,
              scrollbars: true,
              renderer: 'zelos',
              theme: Blockly.Themes.Dark || Blockly.Themes.Classic,
              zoom: { startScale: 0.8, controls: false, wheel: false }
            });
            try {
              Blockly.serialization.workspaces.load(ej.blocklyState, ws);
              // Posicionar un poco hacia el centro para mejor visibilidad
              ws.scroll(40, 40);
              setTimeout(function() { Blockly.svgResize(ws); }, 50);
            } catch(err) {
              console.error('Error al cargar bloques en Quiz/Multiple/VF:', err);
            }
          }
        }, 50);
      }

      if (ej.pista) {
        html += '<div style="margin-top: 16px; padding: 12px; background: #f59e0b22; border-radius: 6px;"><strong style="color: #f59e0b;">💡 Pista:</strong> ' + ej.pista + '</div>';
      }

      content.innerHTML = html;
      
      var progressEl = $('previewProgress');
      if (progressEl) {
        progressEl.textContent = 'Ejercicio ' + (currentIdx + 1) + ' de ' + targetEval.ejercicios.length;
      }
      var prevBtn = $('prevEj');
      if (prevBtn) {
        if (targetEval.permitirRetroceder === false) {
          prevBtn.disabled = true;
          prevBtn.style.opacity = '0.4';
          prevBtn.style.cursor = 'not-allowed';
        } else {
          prevBtn.disabled = currentIdx === -1;
          prevBtn.style.opacity = '';
          prevBtn.style.cursor = '';
        }
      }
      var nextBtn = $('nextEj');
      if (nextBtn) {
        nextBtn.textContent = currentIdx === targetEval.ejercicios.length - 1 ? 'Finalizar ✓' : 'Siguiente →';
      }

      // Event listeners para opciones
      content.querySelectorAll('.preview-option').forEach(function(opt) {
        opt.onmouseover = function() { if (!opt.classList.contains('selected')) opt.style.borderColor = '#3b82f6'; };
        opt.onmouseout = function() { if (!opt.classList.contains('selected')) opt.style.borderColor = '#334155'; };
        opt.onclick = function() {
          if (ej.tipo === 'multiple_respuesta') {
            opt.classList.toggle('selected');
            
            if (targetEval && targetEval.notificarResultado === 'instante') {
              var idx = parseInt(opt.getAttribute('data-idx'));
              var esCorrecto = (ej.opciones[idx] && (ej.opciones[idx].correcta === true || ej.opciones[idx].correcta === 'true'));
              var isSelected = opt.classList.contains('selected');
              
              if (isSelected) {
                if (esCorrecto) {
                  opt.style.borderColor = '#10b981';
                  opt.style.background = '#10b98122';
                } else {
                  opt.style.borderColor = '#ef4444';
                  opt.style.background = '#ef444422';
                }
              } else {
                opt.style.borderColor = '#334155';
                opt.style.background = '#0f172a';
              }
            } else {
              if (opt.classList.contains('selected')) {
                opt.style.borderColor = '#3b82f6';
                opt.style.background = '#3b82f622';
              } else {
                opt.style.borderColor = '#334155';
                opt.style.background = '#0f172a';
              }
            }
          } else {
            content.querySelectorAll('.preview-option').forEach(function(o) {
              o.classList.remove('selected');
              o.style.borderColor = '#334155';
              o.style.background = '#0f172a';
            });
            opt.classList.add('selected');
            
            if (targetEval && targetEval.notificarResultado === 'instante') {
              var esCorrecto = false;
              if (ej.tipo === 'quiz') {
                var idx = parseInt(opt.getAttribute('data-idx'));
                esCorrecto = (ej.opciones[idx] && (ej.opciones[idx].correcta === true || ej.opciones[idx].correcta === 'true'));
              } else if (ej.tipo === 'verdadero_falso') {
                var val = opt.getAttribute('data-value') === 'true';
                esCorrecto = (ej.respuesta === val || ej.respuesta.toString() === val.toString());
              }
              
              if (esCorrecto) {
                opt.style.borderColor = '#10b981';
                opt.style.background = '#10b98122';
              } else {
                opt.style.borderColor = '#ef4444';
                opt.style.background = '#ef444422';
              }
            } else {
              opt.style.borderColor = '#3b82f6';
              opt.style.background = '#3b82f622';
            }
          }
        };
      });

      if (ej.tipo === 'relacionar') {
        var coloresParejas = [
          { border: '#3b82f6', bg: '#3b82f61a' },
          { border: '#10b981', bg: '#10b9811a' },
          { border: '#f59e0b', bg: '#f59e0b1a' },
          { border: '#ec4899', bg: '#ec48991a' },
          { border: '#8b5cf6', bg: '#8b5cf61a' },
          { border: '#06b6d4', bg: '#06b6d41a' }
        ];

        var actualizarEstilosRelacionar = function() {
          content.querySelectorAll('.rel-left-card').forEach(function(card) {
            card.style.borderColor = '#334155';
            card.style.background = '#0f172a';
            var badge = card.querySelector('.rel-badge');
            if (badge) badge.style.display = 'none';
          });
          content.querySelectorAll('.rel-right-card').forEach(function(card) {
            card.style.borderColor = '#334155';
            card.style.background = '#0f172a';
            var badge = card.querySelector('.rel-badge');
            if (badge) badge.style.display = 'none';
          });

          if (window._selectedLeftIdx !== null) {
            var selCard = content.querySelector('.rel-left-card[data-idx="' + window._selectedLeftIdx + '"]');
            if (selCard) {
              selCard.style.borderColor = '#38bdf8';
              selCard.style.background = 'rgba(56, 189, 248, 0.1)';
            }
          }

          window._relacionarConexiones.forEach(function(conn, connIdx) {
            var color = coloresParejas[connIdx % coloresParejas.length];

            var leftCard = content.querySelector('.rel-left-card[data-idx="' + conn.leftIdx + '"]');
            if (leftCard) {
              leftCard.style.borderColor = color.border;
              leftCard.style.background = color.bg;
              var badge = leftCard.querySelector('.rel-badge');
              if (badge) {
                badge.textContent = '🔗 Pareja #' + (connIdx + 1);
                badge.style.display = 'inline-block';
                badge.style.color = color.border;
              }
            }

            var rightCard = content.querySelector('.rel-right-card[data-val="' + conn.rightVal.replace(/"/g, '\\"') + '"]');
            if (rightCard) {
              rightCard.style.borderColor = color.border;
              rightCard.style.background = color.bg;
              var badge = rightCard.querySelector('.rel-badge');
              if (badge) {
                badge.textContent = '🔗 Pareja #' + (connIdx + 1);
                badge.style.display = 'inline-block';
                badge.style.color = color.border;
              }
            }
          });
        };

        content.querySelectorAll('.rel-left-card').forEach(function(card) {
          card.onclick = function() {
            var leftIdx = parseInt(card.getAttribute('data-idx'));
            
            var connIdx = -1;
            for (var i = 0; i < window._relacionarConexiones.length; i++) {
              if (window._relacionarConexiones[i].leftIdx === leftIdx) {
                connIdx = i;
                break;
              }
            }
            if (connIdx !== -1) {
              window._relacionarConexiones.splice(connIdx, 1);
              window._selectedLeftIdx = null;
              actualizarEstilosRelacionar();
              return;
            }

            window._selectedLeftIdx = leftIdx;
            actualizarEstilosRelacionar();
          };
        });

        content.querySelectorAll('.rel-right-card').forEach(function(card) {
          card.onclick = function() {
            var rightVal = card.getAttribute('data-val');

            var connIdx = -1;
            for (var i = 0; i < window._relacionarConexiones.length; i++) {
              if (window._relacionarConexiones[i].rightVal === rightVal) {
                connIdx = i;
                break;
              }
            }
            if (connIdx !== -1) {
              window._relacionarConexiones.splice(connIdx, 1);
              window._selectedLeftIdx = null;
              actualizarEstilosRelacionar();
              return;
            }

            if (window._selectedLeftIdx !== null) {
              window._relacionarConexiones = window._relacionarConexiones.filter(function(conn) {
                return conn.leftIdx !== window._selectedLeftIdx && conn.rightVal !== rightVal;
              });

              window._relacionarConexiones.push({
                leftIdx: window._selectedLeftIdx,
                rightVal: rightVal
              });

              window._selectedLeftIdx = null;
              actualizarEstilosRelacionar();
            } else {
              toast('Primero selecciona un elemento de la columna izquierda.');
            }
          };
        });

        actualizarEstilosRelacionar();
      }
      syncStudentProgressToParent();
    }

    renderPreviewEjercicio();

    var closeAction = function() {
      var isCompleted = (currentIdx === -1 || window._evaluacionFinalizada === true);
      
      if (targetEval && targetEval.reglaSalida === 'bloqueo') {
        if (!isCompleted) {
          showAlert('No puedes abandonar la evaluación actual hasta que la completes.');
          return;
        }
      }

      if (isStudentMode && targetEval && window._evaluacionFinalizada === true) {
        showPrompt('Por favor, ingresa tu nombre completo para descargar tu comprobante de resultados:', '', function(nombreAlumno) {
          if (!nombreAlumno || !nombreAlumno.trim()) {
            showAlert('Debes ingresar tu nombre completo para finalizar y descargar el comprobante.', function() {
              closeAction(); // Volver a pedir el nombre
            });
            return;
          }

          var total = respuestas.length;
          var correctas = respuestas.filter(function(r) { return r === true; }).length;

          var detalles = targetEval.ejercicios.map(function(ej, idx) {
            return {
              enunciado: ej.enunciado,
              tipo: ej.tipo,
              puntos: ej.puntos,
              correcto: respuestas[idx] === true,
              respuestaAlumno: respuestasDetalladas[idx] || null
            };
          });

          var tiempoMax = parseInt(targetEval.tiempoLimite || 15) * 60;
          var tiempoTranscurrido = tiempoMax - timeLeft;

          var resultData = {
            alumno: nombreAlumno.trim(),
            evalId: targetEval.id,
            evalTitulo: targetEval.titulo,
            fecha: new Date().toISOString(),
            tiempoTotalSegundos: tiempoTranscurrido,
            aciertos: correctas,
            total: total,
            porcentaje: Math.round((correctas / total) * 100),
            ejerciciosDetalle: detalles
          };

          try {
            var secureContent = generateSecureResult(resultData);
            downloadFile(secureContent, 'resultado_' + nombreAlumno.trim().replace(/\s+/g, '_') + '_' + targetEval.id + '.stbeval', function(saved) {
              if (saved) {
                proceedClose();
              } else {
                showAlert('El archivo no se guardó. Puedes volver a intentarlo haciendo clic en Finalizar.');
              }
            });
          } catch(e) {
            console.error('Error al generar comprobante:', e);
            showAlert('Error al generar el comprobante. Intenta de nuevo.');
          }
        });
        return;
      }

      proceedClose();

      function proceedClose() {
        overlay.remove();
        cleanupTimer();
        localStorage.removeItem('stblock_student_progress_' + targetEval.id);
        if (isStudentMode && window.parent) {
          window.parent.postMessage({ type: 'student-evaluacion-finished' }, '*');
        }
      }
    };
    $('closePreview').onclick = closeAction;
    $('prevEj').onclick = function() { 
      if (currentIdx > -1) { 
        if (window._showingExerciseIntro) {
          if (currentIdx === 0) {
            currentIdx = -1;
            window._showingExerciseIntro = false;
            cleanupTimer();
          } else {
            currentIdx--;
            window._showingExerciseIntro = false;
          }
        } else {
          window._showingExerciseIntro = true;
        }
        renderPreviewEjercicio(); 
      } 
    };
    $('nextEj').onclick = function() {
      if (currentIdx === -1) {
        if (numEjercicios === 0) {
          toast('Agrega ejercicios en el editor para comenzar.');
          return;
        }
        currentIdx = 0;
        window._showingExerciseIntro = true;
        renderPreviewEjercicio();
        startTimer();
        return;
      }

      if (window._showingExerciseIntro) {
        window._showingExerciseIntro = false;
        renderPreviewEjercicio();
        return;
      }

      // Validar el ejercicio actual antes de avanzar
      var esCorrecto = false;
      var currentEj = targetEval.ejercicios[currentIdx];

      function normalizeText(t) {
        if (!t) return '';
        return t.toString().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (currentEj.tipo.startsWith('bloques_')) {
        var res = window.verificarRespuestaBloques(currentEj, (targetEval && targetEval.notificarResultado === 'silencio'));
        esCorrecto = (res && res.porcentaje === 100);
        if (window._previewWorkspace) {
          try {
            var xmlDom = Blockly.Xml.workspaceToDom(window._previewWorkspace);
            respuestasDetalladas[currentIdx] = Blockly.Xml.domToText(xmlDom);
          } catch(e) {
            console.error('[Preview] Error serializing block workspace:', e);
          }
        }
      } else if (currentEj.tipo === 'circuito_armar' || currentEj.tipo === 'circuito_depurar' || currentEj.tipo === 'circuito_codigo') {
        var isCircuitoCodigo = (currentEj.tipo === 'circuito_codigo');
        var progMode = isCircuitoCodigo ? (currentEj.progMode || 'codigo') : 'circuitoOnly';
        var hideMode = isCircuitoCodigo ? (currentEj.ocultar || 'programacion') : 'circuitoOnly';

        if (isCircuitoCodigo && progMode === 'bloques' && hideMode === 'programacion') {
          // Caso: Bloques y Ocultar Programación (Alumno escribe bloques, circuito ya prearmado y correcto)
          var res = window.verificarRespuestaBloques(currentEj, (targetEval && targetEval.notificarResultado === 'silencio'));
          esCorrecto = (res && res.porcentaje === 100);
          
          if (window._previewWorkspace) {
            try {
              var xmlDom = ScratchBlockly.Xml.workspaceToDom(window._previewWorkspace);
              var xmlText = ScratchBlockly.Xml.domToText(xmlDom);
              respuestasDetalladas[currentIdx] = xmlText;
              localStorage.setItem('stblock_student_blocks_' + targetEval.id + '_' + currentEj.id, xmlText);
            } catch(e) {}
          }
        } else {
          // Caso regular o híbrido (donde se valida el circuito en Velxio)
          var res = window.verificarRespuestaCircuito(currentEj, (isCircuitoCodigo || (targetEval && targetEval.notificarResultado === 'silencio')));
          esCorrecto = (res && res.porcentaje === 100);

          var playerIframe = document.getElementById('velxioPlayerIframe');
          if (playerIframe) {
            try {
              var win = playerIframe.contentWindow;
              var boardStore = win.__VELXIO_BOARD_STORE;
              var fileStore = win.__VELXIO_FILE_STORE;
              if (boardStore && typeof boardStore.getState === 'function') {
                var boardState = boardStore.getState();
                var stateToSave = {
                  boards: boardState.boards || [],
                  activeBoardId: boardState.activeBoardId || null,
                  components: boardState.components || [],
                  wires: boardState.wires || [],
                  fileGroups: null
                };

                if (fileStore && typeof fileStore.getState === 'function') {
                  var fileState = fileStore.getState();
                  if (fileState && fileState.fileGroups) {
                    stateToSave.fileGroups = fileState.fileGroups;
                  }
                }

                // Asegurar que si hay un textarea de código activo, guardamos ese contenido en fileGroups
                var ta = document.getElementById('studentCodeTextarea');
                if (ta) {
                  var studentTextCode = ta.value;
                  if (!stateToSave.fileGroups) {
                    stateToSave.fileGroups = [{ id: 'sketch', name: 'sketch', files: [{ name: 'main.ino', content: studentTextCode }] }];
                  } else {
                    var found = false;
                    stateToSave.fileGroups.forEach(function(g) {
                      if (g.files) {
                        g.files.forEach(function(f) {
                          if (f.name.endsWith('.ino') || f.name.endsWith('.cpp')) {
                            f.content = studentTextCode;
                            found = true;
                          }
                        });
                      }
                    });
                    if (!found) {
                      stateToSave.fileGroups.push({
                        id: 'sketch',
                        name: 'sketch',
                        files: [{ name: 'main.ino', content: studentTextCode }]
                      });
                    }
                  }
                }

                var stateStr = JSON.stringify(stateToSave);
                respuestasDetalladas[currentIdx] = stateStr;
                
                var key = 'stblock_student_circuit_' + targetEval.id + '_' + currentEj.id;
                localStorage.setItem(key, stateStr);

                if (isCircuitoCodigo) {
                  if (progMode === 'codigo' && hideMode === 'programacion') {
                    // Alumno escribe código C++, validamos con simulación de hardware
                    var studentCode = ta ? ta.value : extractArduinoCode(stateToSave.fileGroups);
                    if (esCorrecto) {
                      if (currentEj.arduinoSimExpected) {
                        try {
                          var expected = JSON.parse(currentEj.arduinoSimExpected);
                          var simResult = window.simulateArduinoCode(studentCode, currentEj.arduinoSimTime || 2000);
                          if (simResult.error) {
                            esCorrecto = false;
                            var msg = 'Error en código: ' + simResult.error;
                            mostrarResultadoVerificacion(0, 2, 0, [], msg);
                          } else {
                            var pinsMatch = true;
                            var failedPin = null;
                            Object.keys(expected).forEach(function(pin) {
                              var expectedVal = parseInt(expected[pin]);
                              var actualPinState = simResult.pins[pin];
                              if (!actualPinState || actualPinState.val !== expectedVal) {
                                pinsMatch = false;
                                failedPin = pin;
                              }
                            });
                            esCorrecto = pinsMatch;
                            
                            var finalPct = esCorrecto ? 100 : 80;
                            var msg = esCorrecto ? '¡Excelente! Circuito armado y código correcto.' :
                                      'Circuito armado correctamente, pero el pin ' + failedPin + ' no tiene el estado esperado.';
                            mostrarResultadoVerificacion(esCorrecto ? 2 : 1, 2, finalPct, [], msg);
                          }
                        } catch (e) {
                          console.error('[ArduinoSim] JSON expected parse error:', e);
                        }
                      } else {
                        mostrarResultadoVerificacion(2, 2, 100, [], '¡Excelente! Circuito y código guardados.');
                      }
                    }
                  }
                }
              }
            } catch(e) {
              console.error('[Preview] Error serializing circuit state:', e);
            }
          }
        }
      } else if (currentEj.tipo === 'circuito_cuestionario') {
        var correctOption = currentEj.opciones.find(function(o) { return o.correcta === true || o.correcta === 'true'; });
        var userSelection = respuestasDetalladas[currentIdx];
        esCorrecto = (correctOption && userSelection === correctOption.texto);
        
        var percentage = esCorrecto ? 100 : 0;
        var msg = esCorrecto ? '¡Respuesta correcta!' : 'Respuesta incorrecta. Revisa tu inspección del circuito.';
        mostrarResultadoVerificacion(esCorrecto ? 1 : 0, 1, percentage, [], msg);

        var playerIframe = document.getElementById('velxioPlayerIframe');
        if (playerIframe) {
          try {
            var win = playerIframe.contentWindow;
            var boardStore = win.__VELXIO_BOARD_STORE;
            if (boardStore && typeof boardStore.getState === 'function') {
              var boardState = boardStore.getState();
              var stateToSave = {
                boards: boardState.boards || [],
                activeBoardId: boardState.activeBoardId || null,
                components: boardState.components || [],
                wires: boardState.wires || []
              };
              var stateStr = JSON.stringify(stateToSave);
              var key = 'stblock_student_circuit_' + targetEval.id + '_' + currentEj.id;
              localStorage.setItem(key, stateStr);
            }
          } catch(e) {}
        }
      } else {
        if (currentEj.tipo === 'multiple_respuesta') {
          var correctCount = 0;
          var totalCount = currentEj.opciones.length;
          var userSelections = [];
          
          currentEj.opciones.forEach(function(op, idx) {
            var optEl = content.querySelector('.preview-option[data-idx="' + idx + '"]');
            var isSelected = optEl && optEl.classList.contains('selected');
            if (isSelected) userSelections.push(op.texto);
            var isCorrect = (op.correcta === true || op.correcta === 'true');
            if (isSelected === isCorrect) {
              correctCount++;
            }
          });
          esCorrecto = (correctCount === totalCount);
          respuestasDetalladas[currentIdx] = userSelections.join(', ');
        } else if (currentEj.tipo === 'relacionar') {
          var correctConnections = 0;
          var totalPares = currentEj.pares.length;
          var userPairs = [];
          
          if (window._relacionarConexiones && window._relacionarConexiones.length === totalPares) {
            window._relacionarConexiones.forEach(function(conn) {
              var expectedDerecha = currentEj.pares[conn.leftIdx].derecha;
              var izquierda = currentEj.pares[conn.leftIdx].izquierda;
              userPairs.push(izquierda + ' ↔ ' + conn.rightVal);
              if (expectedDerecha === conn.rightVal) {
                correctConnections++;
              }
            });
          }
          esCorrecto = (correctConnections === totalPares);
          respuestasDetalladas[currentIdx] = userPairs.join('; ');
        } else if (currentEj.tipo === 'completar_codigo') {
          var inputs = content.querySelectorAll('.completar-input');
          var respuestasCorrectas = currentEj.respuestas || [];
          var todosCorrectos = true;
          var userInputs = [];
          inputs.forEach(function(inp) {
            var idx = parseInt(inp.getAttribute('data-idx'));
            var val = inp.value.trim().toLowerCase();
            userInputs.push(inp.value.trim());
            var expected = (respuestasCorrectas[idx] || '').trim().toLowerCase();
            if (val !== expected) {
              todosCorrectos = false;
              if (targetEval && targetEval.notificarResultado === 'instante') {
                inp.style.borderColor = '#ef4444';
                inp.style.color = '#ef4444';
              }
            } else {
              if (targetEval && targetEval.notificarResultado === 'instante') {
                inp.style.borderColor = '#10b981';
                inp.style.color = '#10b981';
              }
            }
          });
          esCorrecto = todosCorrectos;
          respuestasDetalladas[currentIdx] = userInputs.join(', ');
        } else if (currentEj.tipo === 'ordenar_bloques') {
          var userOrder = window._ordenarActivos || [];
          var expectedOrder = currentEj.bloques || [];
          var esCorrectoList = true;
          if (userOrder.length !== expectedOrder.length) {
            esCorrectoList = false;
          } else {
            for (var k = 0; k < expectedOrder.length; k++) {
              if (userOrder[k] !== expectedOrder[k]) {
                esCorrectoList = false;
                break;
              }
            }
          }
          esCorrecto = esCorrectoList;
          respuestasDetalladas[currentIdx] = userOrder.join(' → ');
        } else if (currentEj.tipo === 'que_hace_codigo') {
          var inp = content.querySelector('#queHaceInput');
          var val = inp ? inp.value.trim().toLowerCase() : '';
          var expected = (currentEj.resultado || '').trim().toLowerCase();
          esCorrecto = (val === expected);
          respuestasDetalladas[currentIdx] = inp ? inp.value.trim() : '';
          if (targetEval && targetEval.notificarResultado === 'instante' && inp) {
            if (esCorrecto) {
              inp.style.borderColor = '#10b981';
              inp.style.background = '#10b98111';
            } else {
              inp.style.borderColor = '#ef4444';
              inp.style.background = '#ef444411';
            }
          }
        } else if (currentEj.tipo === 'escribir_codigo') {
          var ta = content.querySelector('#escribirCodigoTextarea');
          var codeVal = ta ? ta.value : '';
          var val = codeVal.toLowerCase();
          var keywords = currentEj.palabrasClave || [];
          var allKeywordsPresent = true;
          keywords.forEach(function(kw) {
            if (val.indexOf(kw.toLowerCase()) === -1) {
              allKeywordsPresent = false;
            }
          });
          esCorrecto = allKeywordsPresent;
          
          if (esCorrecto && targetEval.entorno === 'dispositivos' && currentEj.arduinoSimExpected) {
            try {
              var expected = JSON.parse(currentEj.arduinoSimExpected);
              var simResult = window.simulateArduinoCode(codeVal, currentEj.arduinoSimTime || 2000);
              if (simResult.error) {
                esCorrecto = false;
                console.error('[ArduinoSim] Error:', simResult.error);
              } else {
                var pinsMatch = true;
                Object.keys(expected).forEach(function(pin) {
                  var expectedVal = parseInt(expected[pin]);
                  var actualPinState = simResult.pins[pin];
                  if (!actualPinState || actualPinState.val !== expectedVal) {
                    pinsMatch = false;
                  }
                });
                esCorrecto = pinsMatch;
              }
            } catch (e) {
              console.error('[ArduinoSim] JSON expected parse error:', e);
            }
          }
          
          respuestasDetalladas[currentIdx] = codeVal;
          if (targetEval && targetEval.notificarResultado === 'instante' && ta) {
            if (esCorrecto) {
              ta.style.borderColor = '#10b981';
              ta.style.background = '#10b98111';
            } else {
              ta.style.borderColor = '#ef4444';
              ta.style.background = '#ef444411';
            }
          }
        } else if (currentEj.tipo === 'depurar_codigo') {
          var ta = content.querySelector('#depurarCodigoTextarea');
          var val = ta ? ta.value.trim().replace(/\r\n/g, '\n') : '';
          var expected = (currentEj.codigoCorregido || '').trim().replace(/\r\n/g, '\n');
          esCorrecto = (val === expected);
          respuestasDetalladas[currentIdx] = ta ? ta.value : '';
          if (targetEval && targetEval.notificarResultado === 'instante' && ta) {
            if (esCorrecto) {
              ta.style.borderColor = '#10b981';
              ta.style.color = '#10b981';
              ta.style.background = '#10b98111';
            } else {
              ta.style.borderColor = '#ef4444';
              ta.style.color = '#ef4444';
              ta.style.background = '#ef444411';
            }
          }
        } else if (currentEj.tipo === 'reto_ejecucion') {
          esCorrecto = (window._retoSuperado === true);
          respuestasDetalladas[currentIdx] = 'Simulación 3D';
        } else {
          var selectedOpt = content.querySelector('.preview-option.selected');
          if (selectedOpt) {
            if (currentEj.tipo === 'quiz') {
              var idx = parseInt(selectedOpt.getAttribute('data-idx'));
              esCorrecto = (currentEj.opciones[idx] && (currentEj.opciones[idx].correcta === true || currentEj.opciones[idx].correcta === 'true'));
              respuestasDetalladas[currentIdx] = selectedOpt.textContent.trim();
            } else if (currentEj.tipo === 'verdadero_falso') {
              var val = selectedOpt.getAttribute('data-value') === 'true';
              esCorrecto = (currentEj.respuesta === val || currentEj.respuesta.toString() === val.toString());
              respuestasDetalladas[currentIdx] = val ? 'Verdadero' : 'Falso';
            }
          }
        }
      }

      if (targetEval.notificarResultado === 'instante') {
        if (esCorrecto) {
          respuestas[currentIdx] = true;
          syncStudentProgressToParent();
          if (currentIdx < targetEval.ejercicios.length - 1) {
            currentIdx++;
            window._showingExerciseIntro = true;
            renderPreviewEjercicio();
          } else {
            showFinalResults();
          }
        } else {
          intentosRealizados[currentIdx] = (intentosRealizados[currentIdx] || 0) + 1;
          var maxAttempts = (currentEj.intentosMax !== undefined && currentEj.intentosMax !== null) ? parseInt(currentEj.intentosMax) : -1;
          var allowedAttempts = maxAttempts >= 0 ? maxAttempts + 1 : Infinity;
          var remaining = allowedAttempts - intentosRealizados[currentIdx];
          
          if (remaining > 0) {
            toast('❌ Respuesta incorrecta. Te quedan ' + remaining + ' intento(s).');
            syncStudentProgressToParent();
          } else {
            showAlert('❌ Respuesta incorrecta. Has agotado tus ' + allowedAttempts + ' intento(s) para este ejercicio. Avanzando al siguiente.', function() {
              respuestas[currentIdx] = false;
              syncStudentProgressToParent();
              if (currentIdx < targetEval.ejercicios.length - 1) {
                currentIdx++;
                window._showingExerciseIntro = true;
                renderPreviewEjercicio();
              } else {
                showFinalResults();
              }
            });
          }
        }
      } else {
        respuestas[currentIdx] = esCorrecto;
        syncStudentProgressToParent();
        if (currentIdx < targetEval.ejercicios.length - 1) {
          currentIdx++;
          window._showingExerciseIntro = true;
          renderPreviewEjercicio();
        } else {
          showFinalResults();
        }
      }
    };
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); cleanupTimer(); } };
  }

  function generateSecureResult(resultData) {
    var rawJson = JSON.stringify(resultData);
    var checksum = 0;
    for (var i = 0; i < rawJson.length; i++) {
      checksum = (checksum + rawJson.charCodeAt(i) * (i + 1)) % 1000000007;
    }
    var packageObj = {
      d: rawJson,
      c: checksum
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(packageObj))));
  }

  function verifyAndLoadResult(encodedStr) {
    try {
      var decodedPackage = JSON.parse(decodeURIComponent(escape(atob(encodedStr))));
      var rawJson = decodedPackage.d;
      var expectedChecksum = decodedPackage.c;
      
      var actualChecksum = 0;
      for (var i = 0; i < rawJson.length; i++) {
        actualChecksum = (actualChecksum + rawJson.charCodeAt(i) * (i + 1)) % 1000000007;
      }
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error('La firma de seguridad no coincide. El archivo ha sido manipulado.');
      }
      
      return JSON.parse(rawJson);
    } catch(e) {
      throw new Error('Archivo inválido o formato corrupto: ' + e.message);
    }
  }

  function downloadFile(content, fileName, callback) {
    if (window.__TAURI__) {
      try {
        var dialog = window.__TAURI__.dialog;
        var core = window.__TAURI__.core;
        if (dialog && dialog.save && core && core.invoke) {
          dialog.save({
            defaultPath: fileName,
            filters: [{ name: 'STBlock Eval Result', extensions: ['stbeval'] }]
          }).then(function(filePath) {
            if (filePath) {
              var bytes = Array.from(new TextEncoder().encode(content));
              core.invoke('save_file', { path: filePath, content: bytes })
                .then(function() {
                  toast('Resultado guardado correctamente');
                  if (typeof callback === 'function') callback(true);
                })
                .catch(function(err) {
                  console.error('[Editor] Error en save_file:', err);
                  showAlert('Error al guardar archivo: ' + err.message);
                  if (typeof callback === 'function') callback(false);
                });
            } else {
              if (typeof callback === 'function') callback(false);
            }
          }).catch(function(err) {
            console.error('[Editor] Error en dialog.save:', err);
            if (typeof callback === 'function') callback(false);
          });
          return;
        }
      } catch(e) {
        console.error('Error al invocar Tauri save dialog:', e);
      }
    }

    try {
      var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof callback === 'function') callback(true);
      }, 1000);
    } catch(err) {
      console.error('Error en descarga web:', err);
      if (typeof callback === 'function') callback(false);
    }
  }

  function abrirVisualizadorCircuitoAlumno(alumnoName, stateStr, title) {
    var state = null;
    try {
      state = JSON.parse(stateStr);
    } catch(e) {
      alert('Error al leer el estado del circuito');
      return;
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 12000; display: flex; flex-direction: column; font-family: sans-serif;';

    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #0f172a; border-bottom: 1px solid #1e293b; color: white;';
    header.innerHTML = '<div>' +
      '  <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #38bdf8;">🔌 Circuito Enviado por ' + escapeHtml(alumnoName) + '</h3>' +
      '  <span style="font-size: 11px; color: #64748b;">Ejercicio: ' + escapeHtml(title) + '</span>' +
      '</div>';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'danger';
    closeBtn.style.padding = '8px 16px';
    closeBtn.onclick = function() { overlay.remove(); };
    header.appendChild(closeBtn);

    var container = document.createElement('div');
    container.style.cssText = 'flex: 1; position: relative; background: #0b0f19;';

    var iframe = document.createElement('iframe');
    iframe.src = '../../index.html#/editor';
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    container.appendChild(iframe);

    overlay.appendChild(header);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Poll to load student progress
    var pollAttempts = 0;
    var maxPollAttempts = 50;
    var pollInterval = setInterval(function() {
      pollAttempts++;
      try {
        var win = iframe.contentWindow;
        var boardStore = win.__VELXIO_BOARD_STORE;
        var fileStore = win.__VELXIO_FILE_STORE;
        if (boardStore && typeof boardStore.getState === 'function') {
          clearInterval(pollInterval);
          var storeState = boardStore.getState();
          if (storeState.loadProjectState) {
            storeState.loadProjectState(state);
          }
          if (state.fileGroups && fileStore && typeof fileStore.getState === 'function') {
            var fStoreState = fileStore.getState();
            if (fStoreState.loadFileGroups) {
              fStoreState.loadFileGroups(state.fileGroups);
            }
          }
        }
      } catch(e) {}
      if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollInterval);
      }
    }, 200);
  }

  function abrirVisualizadorBloquesAlumno(alumnoName, xmlText, title) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 12000; display: flex; flex-direction: column; font-family: sans-serif;';

    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #0f172a; border-bottom: 1px solid #1e293b; color: white;';
    header.innerHTML = '<div>' +
      '  <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #a78bfa;">🧩 Bloques Enviados por ' + escapeHtml(alumnoName) + '</h3>' +
      '  <span style="font-size: 11px; color: #64748b;">Ejercicio: ' + escapeHtml(title) + '</span>' +
      '</div>';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'danger';
    closeBtn.style.padding = '8px 16px';
    closeBtn.onclick = function() { overlay.remove(); };
    header.appendChild(closeBtn);

    var container = document.createElement('div');
    container.id = 'studentBlocksViewerContainer';
    container.style.cssText = 'flex: 1; position: relative; background: #0b0f19;';

    overlay.appendChild(header);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    setTimeout(function() {
      if (window.ScratchBlockly) {
        var workspace = window.ScratchBlockly.inject(container, {
          readOnly: true,
          scrollbars: true,
          zoom: { controls: true, wheel: true }
        });
        try {
          var xml = window.ScratchBlockly.Xml.textToDom(xmlText);
          window.ScratchBlockly.Xml.domToWorkspace(xml, workspace);
        } catch(e) {
          console.error('[Viewer] Error loading blocks XML:', e);
        }
      }
    }, 50);
  }

  function mostrarReporteResultado(res) {
    var overlay = document.createElement('div');
    overlay.id = 'evalResultReportOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15,23,42,0.85); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: sans-serif;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background: #ffffff; border-radius: 12px; width: 100%; max-width: 750px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; color: #1e293b;';

    var header = document.createElement('div');
    header.style.cssText = 'padding: 18px 24px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;';
    
    var headerTitle = document.createElement('div');
    headerTitle.innerHTML = '<h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #38bdf8;">📊 Reporte de Resultados</h3>' +
                            '<span style="font-size: 11px; color: #94a3b8;">Evaluación ID: ' + res.evalId + '</span>';
    
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background: transparent; border: none; color: #94a3b8; font-size: 28px; cursor: pointer; line-height: 1;';
    closeBtn.onclick = function() { overlay.remove(); };

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);

    var content = document.createElement('div');
    content.style.cssText = 'padding: 24px; overflow-y: auto; max-height: 70vh;';

    var grid = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px;">' +
               '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: left;">' +
               '    <div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">ALUMNO</div>' +
               '    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + res.alumno + '">' + res.alumno + '</div>' +
               '  </div>' +
               '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: left;">' +
               '    <div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">TIEMPO TOTAL</div>' +
               '    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">' + formatTiempo(res.tiempoTotalSegundos) + '</div>' +
               '  </div>' +
               '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: left;">' +
               '    <div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">ACIERTOS</div>' +
               '    <div style="font-size: 13px; font-weight: 700; color: #10b981; margin-top: 4px;">' + res.aciertos + ' <span style="color: #64748b; font-weight: 400;">/ ' + res.total + '</span></div>' +
               '  </div>' +
               '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: left;">' +
               '    <div style="font-size: 9px; color: #64748b; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">CALIFICACIÓN</div>' +
               '    <div style="font-size: 13px; font-weight: 700; color: ' + (res.porcentaje === 100 ? '#15803d' : '#b91c1c') + '; margin-top: 4px;">' + res.porcentaje + '%</div>' +
               '  </div>' +
               '</div>';

    var evalTitleInfo = '<div style="margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">' +
                        '  <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 16px; font-weight: 700;">' + res.evalTitulo + '</h4>' +
                        '  <span style="font-size: 11px; color: #64748b;">Entregado el: ' + new Date(res.fecha).toLocaleString() + '</span>' +
                        '</div>';

    var tableHtml = '<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">' +
                    '  <thead>' +
                    '    <tr style="border-bottom: 2px solid #e2e8f0; color: #475569;">' +
                    '      <th style="padding: 10px 8px; font-weight: 600;">No.</th>' +
                    '      <th style="padding: 10px 8px; font-weight: 600;">Ejercicio</th>' +
                    '      <th style="padding: 10px 8px; font-weight: 600;">Tipo</th>' +
                    '      <th style="padding: 10px 8px; font-weight: 600; text-align: center;">Puntos</th>' +
                    '      <th style="padding: 10px 8px; font-weight: 600; text-align: right;">Estado</th>' +
                    '    </tr>' +
                    '  </thead>' +
                    '  <tbody>';

    (res.ejerciciosDetalle || []).forEach(function(det, idx) {
      var rowColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      var statusBadge = det.correcto ? 
                        '<span style="background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">✓ Correcto</span>' :
                        '<span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">✗ Incorrecto</span>';
      
      var answerDetail = '';
      if (det.respuestaAlumno) {
        var isCode = det.tipo === 'escribir_codigo' || det.tipo === 'depurar_codigo';
        var isCircuit = det.tipo === 'circuito_armar' || det.tipo === 'circuito_depurar' || det.tipo === 'circuito_codigo';
        var displayVal = det.respuestaAlumno;

        if (isCircuit) {
          var isXmlBlocks = (displayVal.indexOf('<xml') === 0);
          var isJsonCircuit = (displayVal.indexOf('{"') === 0);
          
          if (isXmlBlocks) {
            var btnId = 'btnVerBloquesAlumno_' + idx;
            answerDetail = '<div style="margin-top: 6px; display: flex; gap: 8px;">' +
                           '  <button id="' + btnId + '" style="padding: 6px 12px; background: #854d0e; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">' +
                           '    🧩 Ver Bloques del Alumno' +
                           '  </button>';
            
            var ej = targetEval.ejercicios[idx];
            if (ej && ej.circuitoSolucion) {
              var circBtnId = 'btnVerCircuitoAlumno_' + idx;
              answerDetail += '  <button id="' + circBtnId + '" style="padding: 6px 12px; background: #00979C; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">' +
                              '    🔌 Ver Circuito' +
                              '  </button>';
              
              setTimeout(function() {
                var btn = document.getElementById(circBtnId);
                if (btn) {
                  btn.onclick = function() {
                    abrirVisualizadorCircuitoAlumno(res.alumno, JSON.stringify(ej.circuitoSolucion), det.enunciado);
                  };
                }
              }, 50);
            }
            answerDetail += '</div>';

            setTimeout(function() {
              var btn = document.getElementById(btnId);
              if (btn) {
                btn.onclick = function() {
                  abrirVisualizadorBloquesAlumno(res.alumno, displayVal, det.enunciado);
                };
              }
            }, 50);
          } else if (isJsonCircuit) {
            var state = null;
            try { state = JSON.parse(displayVal); } catch(e) {}
            
            var btnId = 'btnVerCircuitoAlumno_' + idx;
            answerDetail = '<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">' +
                           '  <div>' +
                           '    <button id="' + btnId + '" style="padding: 6px 12px; background: #00979C; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">' +
                           '      🔌 Ver Circuito del Alumno' +
                           '    </button>' +
                           '  </div>';
            
            if (state && state.fileGroups) {
              var studentCode = extractArduinoCode(state.fileGroups);
              if (studentCode) {
                answerDetail += '  <details style="font-size: 11px;"><summary style="cursor: pointer; color: #3b82f6; font-weight: bold; outline: none; user-select: none;">👁️ Ver código enviado</summary>' +
                                '    <pre style="margin-top: 6px; background: #0f172a; padding: 10px; border-radius: 6px; color: #86efac; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 150px; text-align: left;">' + escapeHtml(studentCode) + '</pre>' +
                                '  </details>';
              }
            }
            answerDetail += '</div>';

            setTimeout(function() {
              var btn = document.getElementById(btnId);
              if (btn) {
                btn.onclick = function() {
                  abrirVisualizadorCircuitoAlumno(res.alumno, displayVal, det.enunciado);
                };
              }
            }, 50);
          } else {
            var btnId = 'btnVerCircuitoAlumno_' + idx;
            answerDetail = '<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">' +
                           '  <details style="font-size: 11px;"><summary style="cursor: pointer; color: #3b82f6; font-weight: bold; outline: none; user-select: none;">👁️ Ver código enviado</summary>' +
                           '    <pre style="margin-top: 6px; background: #0f172a; padding: 10px; border-radius: 6px; color: #86efac; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 150px; text-align: left;">' + escapeHtml(displayVal) + '</pre>' +
                           '  </details>';
            
            var ej = targetEval.ejercicios[idx];
            if (ej && ej.circuitoSolucion) {
              answerDetail += '  <div>' +
                              '    <button id="' + btnId + '" style="padding: 6px 12px; background: #00979C; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">' +
                              '      🔌 Ver Circuito (Solución/Referencia)' +
                              '    </button>' +
                              '  </div>';
              
              setTimeout(function() {
                var btn = document.getElementById(btnId);
                if (btn) {
                  btn.onclick = function() {
                    abrirVisualizadorCircuitoAlumno(res.alumno, JSON.stringify(ej.circuitoSolucion), det.enunciado);
                  };
                }
              }, 50);
            }
            answerDetail += '</div>';
          }
        } else if (isCode) {
          answerDetail = '<details style="margin-top: 6px; font-size: 11px;"><summary style="cursor: pointer; color: #3b82f6; font-weight: bold; outline: none; user-select: none;">👁️ Ver código enviado</summary>' +
                         '<pre style="margin-top: 6px; background: #0f172a; padding: 10px; border-radius: 6px; color: #86efac; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 150px; text-align: left;">' + displayVal.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>';
        } else {
          answerDetail = '<div style="margin-top: 4px; font-size: 11px; color: #64748b;"><strong>Respuesta:</strong> <span style="color: #475569;">' + displayVal + '</span></div>';
        }
      }

      tableHtml += '    <tr style="background: ' + rowColor + '; border-bottom: 1px solid #f1f5f9;">' +
                   '      <td style="padding: 12px 8px; color: #64748b; vertical-align: top;">' + (idx + 1) + '</td>' +
                   '      <td style="padding: 12px 8px; font-weight: 500; color: #0f172a; max-width: 320px; vertical-align: top;">' +
                   '        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + det.enunciado + '">' + det.enunciado + '</div>' +
                   '        ' + answerDetail +
                   '      </td>' +
                   '      <td style="padding: 12px 8px; color: #64748b; vertical-align: top;">' + (TIPOS_EJERCICIO[det.tipo] ? TIPOS_EJERCICIO[det.tipo].nombre : det.tipo) + '</td>' +
                   '      <td style="padding: 12px 8px; text-align: center; color: #475569; vertical-align: top;">' + det.puntos + '</td>' +
                   '      <td style="padding: 12px 8px; text-align: right; vertical-align: top;">' + statusBadge + '</td>' +
                   '    </tr>';
    });

    tableHtml += '  </tbody>' +
                 '</table>';

    content.innerHTML = grid + evalTitleInfo + tableHtml;

    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;';
    
    var btnClose = document.createElement('button');
    btnClose.textContent = 'Entendido';
    btnClose.style.cssText = 'padding: 10px 24px; background: #0f172a; border: none; border-radius: 6px; color: #ffffff; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;';
    btnClose.onclick = function() { overlay.remove(); };
    
    footer.appendChild(btnClose);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function formatTiempo(segundos) {
    if (segundos <= 0) return '0 seg';
    var mins = Math.floor(segundos / 60);
    var secs = segundos % 60;
    if (mins > 0) {
      return mins + ' min ' + (secs > 0 ? secs + ' seg' : '');
    }
    return secs + ' seg';
  }

  // Add CSS styles for evaluaciones tabs
  (function() {
    var style = document.createElement('style');
    style.textContent = '[data-panel-eval] { display: none; } [data-panel-eval].active { display: block; }';
    document.head.appendChild(style);
  })();

  // ====================================================================
  // INTEGRACIÓN DEL EDITOR DE BLOQUES VISUALES
  // ====================================================================

  var tutorBlocksEditor = null;
  var tutorBlocksSolucion = null;

  function initBloquesEditor() {
    // Inicializar editor de bloques si TutorBlocks está disponible
    if (typeof TutorBlocks === 'undefined') {
      console.warn('TutorBlocks no está cargado');
      return;
    }

    // Botón para abrir editor de solución
    if ($('btnEditarSolucionBloques')) {
      $('btnEditarSolucionBloques').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        abrirEditorBloquesSolucion(ej);
      };
    }

    // Agregar zona de drop
    if ($('addDropZone')) {
      $('addDropZone').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.dropZones) ej.dropZones = [];
        ej.dropZones.push({
          id: 'dz-' + Date.now(),
          x: 50 + (ej.dropZones.length * 20),
          y: 50 + (ej.dropZones.length * 20),
          bloqueEsperado: '',
          categoriaPermitida: ''
        });
        renderDropZonesConfig();
      };
    }

    // Renderizar configuración de bloques disponibles
    renderBloquesDisponiblesConfig();
  }

  function renderBloquesDisponiblesConfig() {
    var container = $('bloquesDisponiblesConfig');
    if (!container || typeof BLOCK_CATEGORIES === 'undefined') return;

    var html = '';
    BLOCK_CATEGORIES.forEach(function(cat) {
      var color = BLOCK_COLORS[cat.id] ? BLOCK_COLORS[cat.id].primary : '#666';
      html += '<div style="margin-bottom: 8px;">';
      html += '<label class="check" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">';
      html += '<input type="checkbox" data-categoria="' + cat.id + '" checked>';
      html += '<span style="display: inline-block; width: 12px; height: 12px; background: ' + color + '; border-radius: 3px;"></span>';
      html += '<span style="color: #e2e8f0;">' + cat.icon + ' ' + cat.name + '</span>';
      html += '</label>';
      html += '</div>';
    });

    container.innerHTML = html;

    // Eventos
    container.querySelectorAll('input[data-categoria]').forEach(function(cb) {
      cb.onchange = function() {
        var ej = getSelectedEjercicio();
        if (!ej) return;
        if (!ej.bloquesDisponibles) ej.bloquesDisponibles = [];

        var cat = cb.getAttribute('data-categoria');
        if (cb.checked) {
          if (ej.bloquesDisponibles.indexOf(cat) === -1) {
            ej.bloquesDisponibles.push(cat);
          }
        } else {
          ej.bloquesDisponibles = ej.bloquesDisponibles.filter(function(c) { return c !== cat; });
        }
      };
    });
  }

  function renderDropZonesConfig() {
    var container = $('dropZonesList');
    var ej = getSelectedEjercicio();
    if (!container || !ej) return;

    container.innerHTML = '';
    (ej.dropZones || []).forEach(function(zone, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'padding: 8px; background: #1e293b; border-radius: 6px; margin-bottom: 8px;';
      div.innerHTML =
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
        '<strong style="color: #94a3b8; font-size: 11px;">Hueco ' + (idx + 1) + '</strong>' +
        '<button data-delete-zone="' + idx + '" style="padding: 2px 6px; background: #ef4444; border: none; border-radius: 3px; color: white; cursor: pointer; font-size: 10px;">×</button>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">' +
        '<label style="font-size: 11px;">X<input type="number" data-zone="' + idx + '" data-field="x" value="' + (zone.x || 0) + '" style="width: 100%; padding: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 3px; color: #e2e8f0;"></label>' +
        '<label style="font-size: 11px;">Y<input type="number" data-zone="' + idx + '" data-field="y" value="' + (zone.y || 0) + '" style="width: 100%; padding: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 3px; color: #e2e8f0;"></label>' +
        '</div>' +
        '<label style="font-size: 11px;">Bloque correcto<select data-zone="' + idx + '" data-field="bloqueEsperado" style="width: 100%; padding: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 3px; color: #e2e8f0;">' +
        '<option value="">Cualquiera</option>' +
        getBlockOptionsHTML(zone.bloqueEsperado) +
        '</select></label>';
      container.appendChild(div);
    });

    // Eventos
    container.querySelectorAll('input[data-zone], select[data-zone]').forEach(function(input) {
      input.onchange = function() {
        var idx = parseInt(input.getAttribute('data-zone'));
        var field = input.getAttribute('data-field');
        var value = input.value;
        if (field === 'x' || field === 'y') value = parseInt(value) || 0;
        ej.dropZones[idx][field] = value;
      };
    });

    container.querySelectorAll('button[data-delete-zone]').forEach(function(btn) {
      btn.onclick = function() {
        var idx = parseInt(btn.getAttribute('data-delete-zone'));
        ej.dropZones.splice(idx, 1);
        renderDropZonesConfig();
      };
    });
  }

  function getBlockOptionsHTML(selected) {
    if (typeof BLOCK_CATALOG === 'undefined') return '';
    var html = '';
    Object.keys(BLOCK_CATALOG).forEach(function(blockId) {
      var block = BLOCK_CATALOG[blockId];
      var sel = (blockId === selected) ? ' selected' : '';
      html += '<option value="' + blockId + '"' + sel + '>' + block.text.replace(/%\d+/g, '___') + '</option>';
    });
    return html;
  }

  // ====================================================================
  // SISTEMA COMPLETO DE BLOQUES - MODO COMPLETAR
  // ====================================================================

  // Variable global para rastrear bloques ocultos durante la edición
  var bloquesOcultosTemp = [];

  function abrirEditorBloquesParaPar(ejercicio, parIdx) {
    if (typeof Blockly === 'undefined' || typeof ScratchBlockly === 'undefined') {
      toast('Error: Blockly no está cargado');
      return;
    }

    var par = ejercicio.pares[parIdx];

    // Crear modal con editor de bloques
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; flex-direction: column;';

    var header = document.createElement('div');
    var bgHeader = 'linear-gradient(135deg, #f59e0b, #9a3412)';
    
    header.style.cssText = 'padding: 12px 20px; background: ' + bgHeader + '; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = '<div><h2 style="margin: 0; color: white;">🧩 Editor de Bloques (Par #' + (parIdx + 1) + ')</h2><p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">Diseña los bloques que se mostrarán en la columna izquierda para emparejar.</p></div><button id="cerrarEditorBloquesPar" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 6px;">✕</button>';

    var container = document.createElement('div');
    container.id = 'editorBloquesParContainer';
    container.style.cssText = 'flex: 1; overflow: hidden; min-height: 400px;';

    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px 20px; background: #0f172a; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #334155;';
    footer.innerHTML = '<button id="cancelarBloquesPar" style="padding: 10px 20px; background: #334155; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer;">Cancelar</button><button id="guardarBloquesPar" style="padding: 10px 24px; background: #10b981; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">✓ Guardar</button>';

    overlay.appendChild(header);
    overlay.appendChild(container);
    overlay.appendChild(footer);
    document.body.appendChild(overlay);

    var blocklyWorkspace = null;

    function cerrarEditor() {
      if (blocklyWorkspace) {
        blocklyWorkspace.dispose();
      }
      overlay.remove();
    }

    // Inicializar Blockly
    setTimeout(function() {
      console.log('[Editor] Inicializando Blockly para par...');
      blocklyWorkspace = ScratchBlockly.init('editorBloquesParContainer', { entorno: evaluacionState ? evaluacionState.entorno : 'robotica', tarjeta: evaluacionState ? evaluacionState.tarjeta : 'stbBoardV2' });

      // Cargar estado si existe
      if (par.blocklyState) {
        try {
          Blockly.serialization.workspaces.load(par.blocklyState, blocklyWorkspace);
        } catch (e) {
          console.error('Error al cargar bloques para par:', e);
        }
      }
    }, 100);

    $('cerrarEditorBloquesPar').onclick = cerrarEditor;
    $('cancelarBloquesPar').onclick = cerrarEditor;
    $('guardarBloquesPar').onclick = function() {
      if (!blocklyWorkspace) return;

      // Guardar estado completo
      par.blocklyState = Blockly.serialization.workspaces.save(blocklyWorkspace);

      // Extraer info de bloques
      var allBlocks = blocklyWorkspace.getAllBlocks(false);
      par.bloquesInfo = allBlocks.map(function(block) {
        return {
          id: block.id,
          type: block.type
        };
      });

      toast('✓ Guardado: ' + allBlocks.length + ' bloques para el Par #' + (parIdx + 1));
      cerrarEditor();
      renderParesRelacion();
    };
  }

  function abrirEditorBloquesSolucion(ejercicio) {
    if (typeof Blockly === 'undefined' || typeof ScratchBlockly === 'undefined') {
      toast('Error: Blockly no está cargado');
      return;
    }

    // Copiar bloques ocultos existentes
    bloquesOcultosTemp = ejercicio.bloquesOcultos ? ejercicio.bloquesOcultos.slice() : [];

    // Crear modal con editor de bloques
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; flex-direction: column;';

    var header = document.createElement('div');
    var isCorregir = ejercicio.tipo === 'bloques_corregir';
    var bgHeader = isCorregir ? 'linear-gradient(135deg, #7f1d1d, #450a0a)' : 'linear-gradient(135deg, #19663d, #0d4026)';
    var textHeader = isCorregir 
      ? 'Crea el código con error • <strong style="background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 3px;">Ctrl + Clic</strong> en el bloque con error para marcarlo como el culpable'
      : 'Crea la solución • <strong style="background: #f59e0b; color: #000; padding: 2px 6px; border-radius: 3px;">Ctrl + Clic</strong> en un bloque para marcarlo como hueco';
    
    header.style.cssText = 'padding: 12px 20px; background: ' + bgHeader + '; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = '<div><h2 style="margin: 0; color: white;">🧩 Editor de Bloques</h2><p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">' + textHeader + '</p></div><button id="cerrarEditorBloques" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 6px;">✕</button>';

    // Barra de info
    var infoBar = document.createElement('div');
    infoBar.id = 'infoBarBloques';
    infoBar.style.cssText = 'padding: 8px 20px; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;';
    
    var labelErrores = isCorregir ? 'Errores' : 'Huecos';
    var colorErrores = isCorregir ? '#ef4444' : '#f59e0b';
    var textInfo = isCorregir 
      ? 'El alumno deberá hacer clic sobre el bloque con error para seleccionarlo'
      : 'Los bloques marcados como hueco aparecerán vacíos para el alumno';

    infoBar.innerHTML = '<div style="display: flex; gap: 20px; font-size: 12px;"><span style="color: #94a3b8;">Total: <strong id="contadorTotalBloques" style="color: #e2e8f0;">0</strong></span><span style="color: #94a3b8;">' + labelErrores + ': <strong id="contadorHuecos" style="color: ' + colorErrores + ';">0</strong></span></div><div style="font-size: 11px; color: #64748b;">' + textInfo + '</div>';

    var container = document.createElement('div');
    container.id = 'editorBloquesSolucionContainer';
    container.style.cssText = 'flex: 1; overflow: hidden; min-height: 400px;';

    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px 20px; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155;';
    
    var btnLimpiarText = isCorregir ? 'Quitar todos los errores' : 'Quitar todos los huecos';
    footer.innerHTML = '<div style="display: flex; gap: 8px;"><button id="limpiarHuecos" style="padding: 8px 16px; background: #334155; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer; font-size: 12px;">' + btnLimpiarText + '</button></div><div style="display: flex; gap: 12px;"><button id="cancelarBloques" style="padding: 10px 20px; background: #334155; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer;">Cancelar</button><button id="guardarBloques" style="padding: 10px 24px; background: #10b981; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">✓ Guardar</button></div>';

    overlay.appendChild(header);
    overlay.appendChild(infoBar);
    overlay.appendChild(container);
    overlay.appendChild(footer);
    document.body.appendChild(overlay);

    var blocklyWorkspace = null;

    // Inicializar Blockly
    setTimeout(function() {
      console.log('[Editor] Inicializando Blockly con menú contextual...');
      blocklyWorkspace = ScratchBlockly.init('editorBloquesSolucionContainer', { entorno: evaluacionState ? evaluacionState.entorno : 'robotica', tarjeta: evaluacionState ? evaluacionState.tarjeta : 'stbBoardV2' });

      // Cargar estado si existe
      if (ejercicio.blocklyState) {
        try {
          Blockly.serialization.workspaces.load(ejercicio.blocklyState, blocklyWorkspace);
        } catch (e) {
          console.warn('Error cargando estado Blockly:', e);
        }
      }

      Blockly.svgResize(blocklyWorkspace);

      // Configurar menú contextual personalizado
      configurarCtrlClick(blocklyWorkspace);

      // Actualizar contadores
      actualizarContadores(blocklyWorkspace);

      // Listener para cambios
      blocklyWorkspace.addChangeListener(function() {
        actualizarContadores(blocklyWorkspace);
        actualizarEstilosBloques(blocklyWorkspace);
      });

      // Aplicar estilos iniciales a bloques ocultos
      setTimeout(function() {
        actualizarEstilosBloques(blocklyWorkspace);
      }, 200);

      window.addEventListener('resize', function() {
        if (blocklyWorkspace) Blockly.svgResize(blocklyWorkspace);
      });
    }, 100);

    // Actualizar contadores
    function actualizarContadores(ws) {
      if (!ws) return;
      var total = ws.getAllBlocks(false).length;
      var huecos = bloquesOcultosTemp.length;
      var totalEl = document.getElementById('contadorTotalBloques');
      var huecosEl = document.getElementById('contadorHuecos');
      if (totalEl) totalEl.textContent = total;
      if (huecosEl) huecosEl.textContent = huecos;
    }

    // Configurar Ctrl+Clic para marcar huecos
    function configurarCtrlClick(ws) {
      var svgEl = ws.getParentSvg();
      var container = document.getElementById('editorBloquesSolucionContainer');
      // console.log('[Editor] SVG Element:', svgEl);
      // console.log('[Editor] Container:', container);

      if (!svgEl || !container) {
        console.warn('[Editor] No se encontró SVG o container del workspace');
        return;
      }

      // Debounce para evitar doble toggle
      var lastToggle = { blockId: null, time: 0 };

      // Solo usar pointerdown - es más confiable y evita doble disparo
      container.addEventListener('pointerdown', function(e) {
        if (!e.ctrlKey && !e.metaKey) return;

        // El ctrl+click es válido para completar y corregir bloques
        if (ejercicio.tipo !== 'bloques_completar' && ejercicio.tipo !== 'bloques_corregir') {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        // console.log('[Editor] Ctrl+Click detectado en:', e.target.tagName);

        var block = findBlockAtPoint(ws, e.clientX, e.clientY, e.target);
        if (block) {
          // Evitar doble toggle del mismo bloque en menos de 300ms
          var now = Date.now();
          if (lastToggle.blockId === block.id && (now - lastToggle.time) < 300) {
            // console.log('[Editor] Ignorando doble toggle para:', block.id);
            return;
          }

          lastToggle.blockId = block.id;
          lastToggle.time = now;

          // console.log('[Editor] Bloque encontrado:', block.id, block.type);
          toggleBloqueOculto(block.id, ws);
        } else {
          // console.log('[Editor] No se encontró bloque');
        }
      }, true);

      // console.log('[Editor] Ctrl+Clic configurado correctamente');
    }

    // Encontrar bloque en una posición específica
    function findBlockAtPoint(ws, clientX, clientY, targetElement) {
      var allBlocks = ws.getAllBlocks(false);

      // Método 1: Buscar por elemento target directamente
      if (targetElement) {
        var current = targetElement;
        while (current && current !== document.body) {
          for (var j = 0; j < allBlocks.length; j++) {
            var block = allBlocks[j];
            var svg = block.getSvgRoot ? block.getSvgRoot() : block.svgGroup_;
            if (svg && svg === current) {
              return block;
            }
          }
          current = current.parentElement;
        }
      }

      // Método 2: Buscar por data-id
      if (targetElement) {
        var blockElement = targetElement.closest('[data-id]');
        if (blockElement) {
          var dataId = blockElement.getAttribute('data-id');
          for (var k = 0; k < allBlocks.length; k++) {
            if (allBlocks[k].id === dataId) {
              return allBlocks[k];
            }
          }
        }

        // Método 3: Buscar clase blocklyDraggable
        var draggable = targetElement.closest('.blocklyDraggable');
        if (draggable) {
          for (var m = 0; m < allBlocks.length; m++) {
            var blockSvg = allBlocks[m].getSvgRoot ? allBlocks[m].getSvgRoot() : allBlocks[m].svgGroup_;
            if (blockSvg === draggable) {
              return allBlocks[m];
            }
          }
        }
      }

      // Método 4: elementsFromPoint
      var elementsAtPoint = document.elementsFromPoint(clientX, clientY);

      for (var i = 0; i < elementsAtPoint.length; i++) {
        var el = elementsAtPoint[i];

        for (var n = 0; n < allBlocks.length; n++) {
          var blk = allBlocks[n];
          var svgRoot = blk.getSvgRoot ? blk.getSvgRoot() : blk.svgGroup_;

          if (svgRoot && (svgRoot === el || svgRoot.contains(el))) {
            return blk;
          }
        }
      }

      return null;
    }

    // Toggle hueco / bloque con error
    function toggleBloqueOculto(blockId, ws) {
      var isOculto = bloquesOcultosTemp.indexOf(blockId) !== -1;

      if (isOculto) {
        bloquesOcultosTemp = bloquesOcultosTemp.filter(function(id) { return id !== blockId; });
        if (ejercicio.tipo === 'bloques_corregir') {
          toast('✓ Bloque marcado como correcto');
        } else {
          toast('✓ Bloque visible para el alumno');
        }
      } else {
        bloquesOcultosTemp.push(blockId);
        if (ejercicio.tipo === 'bloques_corregir') {
          toast('🚨 Bloque marcado con ERROR (Culpable)');
        } else {
          toast('🔲 Bloque marcado como HUECO');
        }
      }

      actualizarContadores(ws);
      actualizarEstilosBloques(ws);
    }

    // Actualizar estilos visuales de bloques ocultos
    function actualizarEstilosBloques(ws) {
      if (!ws) return;

      // Inyectar CSS de animación si no existe
      if (!document.getElementById('hueco-styles')) {
        var style = document.createElement('style');
        style.id = 'hueco-styles';
        style.textContent = `
          @keyframes pulseHueco {
            0%, 100% {
              filter: drop-shadow(0 0 6px #f59e0b) drop-shadow(0 0 12px #f59e0b) brightness(1.1);
            }
            50% {
              filter: drop-shadow(0 0 12px #fbbf24) drop-shadow(0 0 24px #fbbf24) brightness(1.3);
            }
          }
          @keyframes pulseError {
            0%, 100% {
              filter: drop-shadow(0 0 6px #ef4444) drop-shadow(0 0 12px #ef4444) brightness(1.1);
            }
            50% {
              filter: drop-shadow(0 0 12px #f87171) drop-shadow(0 0 24px #f87171) brightness(1.3);
            }
          }
          .bloque-marcado-hueco {
            animation: pulseHueco 1s ease-in-out infinite !important;
          }
          .bloque-marcado-hueco .blocklyPath {
            stroke: #f59e0b !important;
            stroke-width: 4px !important;
            stroke-dasharray: 10 5 !important;
          }
          .bloque-marcado-error {
            animation: pulseError 1s ease-in-out infinite !important;
          }
          .bloque-marcado-error .blocklyPath {
            stroke: #ef4444 !important;
            stroke-width: 4px !important;
            stroke-dasharray: 6 3 !important;
          }
        `;
        document.head.appendChild(style);
      }

      var allBlocks = ws.getAllBlocks(false);

      allBlocks.forEach(function(block) {
        var svgRoot = block.getSvgRoot ? block.getSvgRoot() : null;

        if (!svgRoot) {
          return;
        }

        var isOculto = bloquesOcultosTemp.indexOf(block.id) !== -1;

        if (isOculto) {
          svgRoot.setAttribute('data-hueco-marcado', 'true');

          var mainPath = null;
          for (var i = 0; i < svgRoot.children.length; i++) {
            var child = svgRoot.children[i];
            if (child.classList && child.classList.contains('blocklyPath')) {
              mainPath = child;
              break;
            }
          }

          var colorStroke = (ejercicio && ejercicio.tipo === 'bloques_corregir') ? '#ef4444' : '#ff6600';
          if (mainPath) {
            if (!mainPath.getAttribute('data-original-fill')) {
              mainPath.setAttribute('data-original-fill', mainPath.getAttribute('fill') || '');
            }
            mainPath.style.stroke = colorStroke;
            mainPath.style.strokeWidth = '4px';
            mainPath.setAttribute('data-hueco', 'true');
          }

          var existingLabel = null;
          for (var j = 0; j < svgRoot.children.length; j++) {
            if (svgRoot.children[j].classList && svgRoot.children[j].classList.contains('hueco-label')) {
              existingLabel = svgRoot.children[j];
              break;
            }
          }

          var textLabel = (ejercicio && ejercicio.tipo === 'bloques_corregir') ? 'ERROR' : 'HUECO';
          var bgLabel = (ejercicio && ejercicio.tipo === 'bloques_corregir') ? '#ef4444' : '#f59e0b';
          
          if (!existingLabel) {
            var label = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            label.setAttribute('class', 'hueco-label');
            label.setAttribute('transform', 'translate(5, 5)');

            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '55');
            rect.setAttribute('height', '18');
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', bgLabel);

            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '27');
            text.setAttribute('y', '13');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.textContent = textLabel;

            label.appendChild(rect);
            label.appendChild(text);
            svgRoot.appendChild(label);
          } else {
            var rect = existingLabel.querySelector('rect');
            var text = existingLabel.querySelector('text');
            if (rect) rect.setAttribute('fill', bgLabel);
            if (text) {
              text.textContent = textLabel;
              text.setAttribute('fill', '#fff');
            }
          }
        } else {
          svgRoot.removeAttribute('data-hueco-marcado');

          var markedPath = svgRoot.querySelector('[data-hueco="true"]');
          if (markedPath) {
            markedPath.style.stroke = '';
            markedPath.style.strokeWidth = '';
            markedPath.removeAttribute('data-hueco');
          }

          var label = svgRoot.querySelector('.hueco-label');
          if (label) {
            label.remove();
          }
        }
      });
    }

    // Cerrar
    function cerrarEditor() {
      if (blocklyWorkspace) blocklyWorkspace.dispose();
      overlay.remove();
    }

    document.getElementById('cerrarEditorBloques').onclick = cerrarEditor;
    document.getElementById('cancelarBloques').onclick = cerrarEditor;

    // Limpiar huecos
    document.getElementById('limpiarHuecos').onclick = function() {
      bloquesOcultosTemp = [];
      actualizarContadores(blocklyWorkspace);
      actualizarEstilosBloques(blocklyWorkspace);
      toast('Todos los huecos eliminados');
    };

    // Guardar
    document.getElementById('guardarBloques').onclick = function() {
      if (!blocklyWorkspace) return;

      // Guardar estado completo
      ejercicio.blocklyState = Blockly.serialization.workspaces.save(blocklyWorkspace);

      // Guardar bloques ocultos
      ejercicio.bloquesOcultos = bloquesOcultosTemp.slice();

      // Extraer información de bloques
      var allBlocks = blocklyWorkspace.getAllBlocks(false);
      ejercicio.bloquesInfo = allBlocks.map(function(block) {
        return {
          id: block.id,
          type: block.type,
          oculto: ejercicio.bloquesOcultos.indexOf(block.id) !== -1
        };
      });

      var totalBlocks = allBlocks.length;
      var totalHuecos = ejercicio.bloquesOcultos.length;
      toast('✓ Guardado: ' + totalBlocks + ' bloques, ' + totalHuecos + ' huecos');

      cerrarEditor();
      actualizarEstadoBloques(ejercicio);
    };
  }

  // Actualizar estado en el panel
  function actualizarEstadoBloques(ejercicio) {
    var estadoEl = $('estadoBloques');
    if (!estadoEl) return;

    if (!ejercicio.blocklyState || !ejercicio.bloquesInfo) {
      estadoEl.innerHTML = '<span style="color: #64748b;">Sin solución guardada</span>';
      return;
    }

    var total = ejercicio.bloquesInfo.length;
    var huecos = ejercicio.bloquesOcultos ? ejercicio.bloquesOcultos.length : 0;

    if (ejercicio.tipo === 'quiz' || ejercicio.tipo === 'multiple_respuesta' || ejercicio.tipo === 'verdadero_falso') {
      estadoEl.innerHTML = '✓ <strong style="color: #10b981;">' + total + '</strong> bloques guardados (se mostrarán estáticos)';
    } else if (ejercicio.tipo === 'bloques_corregir') {
      estadoEl.innerHTML = '✓ <strong style="color: #10b981;">' + total + '</strong> bloques guardados • <strong style="color: #ef4444;">' + huecos + '</strong> errores marcados';
    } else {
      estadoEl.innerHTML = '✓ <strong style="color: #10b981;">' + total + '</strong> bloques guardados • <strong style="color: #f59e0b;">' + huecos + '</strong> huecos';
    }
  }

  // Obtener color de un bloque por su tipo
  function getBlockColor(type) {
    if (!type) return '#666';
    if (type.startsWith('motion')) return '#4C97FF';
    if (type.startsWith('looks')) return '#9966FF';
    if (type.startsWith('sound')) return '#CF63CF';
    if (type.startsWith('event')) return '#FFBF00';
    if (type.startsWith('control')) return '#FFAB19';
    if (type.startsWith('sensing')) return '#5CB1D6';
    if (type.startsWith('operator')) return '#59C059';
    if (type.startsWith('data')) return '#FF8C1A';
    if (type.startsWith('pen')) return '#0fBD8C';
    if (type.startsWith('music')) return '#D65CD6';
    if (type.startsWith('logic')) return '#48BF53';
    if (type.startsWith('state')) return '#9966FF';
    if (type.startsWith('debug')) return '#607D8B';
    if (type.startsWith('game')) return '#5B7CFA';
    return '#666';
  }

  // Mostrar/ocultar el editor de bloques según el tipo de ejercicio
  function showBloquesEditor(ejercicio) {
    var noConfig = $('noBloquesConfig');
    var configEditor = $('bloquesConfigEditor');

    if (!ejercicio || !TIPOS_EJERCICIO[ejercicio.tipo] || (!TIPOS_EJERCICIO[ejercicio.tipo].esBloque && ejercicio.tipo !== 'quiz' && ejercicio.tipo !== 'multiple_respuesta' && ejercicio.tipo !== 'verdadero_falso')) {
      if (noConfig) noConfig.style.display = 'block';
      if (configEditor) configEditor.hidden = true;
      return;
    }

    if (noConfig) noConfig.style.display = 'none';
    if (configEditor) configEditor.hidden = false;

    // Mostrar/ocultar secciones específicas según el modo (completar vs ordenar vs quiz/multiple/VF)
    var estadoSection = $('bloquesEstadoSection');
    var categoriasSection = $('bloquesCategoriasSection');
    if (ejercicio.tipo === 'bloques_ordenar' || ejercicio.tipo === 'bloques_armar' || ejercicio.tipo === 'quiz' || ejercicio.tipo === 'multiple_respuesta' || ejercicio.tipo === 'verdadero_falso') {
      if (estadoSection) estadoSection.style.display = 'none';
      if (categoriasSection) categoriasSection.style.display = 'none';
    } else {
      if (estadoSection) estadoSection.style.display = 'block';
      if (categoriasSection) categoriasSection.style.display = 'block';
    }

    // Actualizar checkboxes de categorías dinámicamente según el entorno
    var catContainer = $('bloquesCategoriasConfig');
    if (catContainer) {
      var isDevices = (evaluacionState && evaluacionState.entorno === 'dispositivos');
      var catHtml = '';

      if (isDevices) {
        var boardId = evaluacionState.tarjeta || 'stbBoardV2';
        var manifests = window.deviceManifests;
        var deviceCategories = [];
        if (manifests && manifests[boardId] && manifests[boardId].categories) {
          manifests[boardId].categories.forEach(function(cat) {
            deviceCategories.push({
              id: cat.id,
              name: cat.name || 'Dispositivo',
              color: cat.color1 || '#00979C'
            });
          });
        } else {
          deviceCategories.push({ id: 'arduino', name: 'Arduino', color: '#00979C' });
        }

        // Añadir categorías de Arduino
        deviceCategories.forEach(function(cat) {
          catHtml += '<label style="display: flex; align-items: center; gap: 6px; padding: 4px; cursor: pointer;">' +
                  '  <input type="checkbox" data-categoria="' + cat.id + '">' +
                  '  <span style="color: ' + cat.color + ';">⚡ ' + cat.name + '</span>' +
                  '</label>';
        });

        // Añadir categorías estándar básicas para Arduino
        var standardCats = [
          { id: 'control', name: 'Control', color: '#FFAB19', icon: '🔄' },
          { id: 'operators', name: 'Operadores', color: '#59C059', icon: '🔢' },
          { id: 'variables', name: 'Variables', color: '#FF8C1A', icon: '📦' }
        ];
        standardCats.forEach(function(cat) {
          catHtml += '<label style="display: flex; align-items: center; gap: 6px; padding: 4px; cursor: pointer;">' +
                  '  <input type="checkbox" data-categoria="' + cat.id + '">' +
                  '  <span style="color: ' + cat.color + ';">' + cat.icon + ' ' + cat.name + '</span>' +
                  '</label>';
        });
      } else {
        // Categorías de Programación
        var programmingCats = [
          { id: 'motion', name: 'Movimiento', color: '#4C97FF', icon: '➡️' },
          { id: 'looks', name: 'Apariencia', color: '#9966FF', icon: '👁️' },
          { id: 'sound', name: 'Sonido', color: '#CF63CF', icon: '🔊' },
          { id: 'events', name: 'Eventos', color: '#FFBF00', icon: '🏴' },
          { id: 'control', name: 'Control', color: '#FFAB19', icon: '🔄' },
          { id: 'sensing', name: 'Sensores', color: '#5CB1D6', icon: '📡' },
          { id: 'operators', name: 'Operadores', color: '#59C059', icon: '🔢' },
          { id: 'variables', name: 'Variables', color: '#FF8C1A', icon: '📦' },
          { id: 'lists', name: 'Listas', color: '#FF661A', icon: '📋' },
          { id: 'pen', name: 'Lápiz', color: '#0fBD8C', icon: '✏️' },
          { id: 'music', name: 'Música', color: '#D65CD6', icon: '🎵' },
          { id: 'logic', name: 'Lógica+', color: '#48BF53', icon: '🟢' },
          { id: 'state', name: 'Estado', color: '#9966FF', icon: '⚙️' },
          { id: 'debug', name: 'Debug', color: '#607D8B', icon: '🐛' },
          { id: 'gravity', name: 'Gravedad', color: '#5B7CFA', icon: '🪐' },
          { id: 'physics', name: 'Física', color: '#00A8A8', icon: '⚛️' },
          { id: 'custom', name: 'Personalizados', color: '#5B7CFA', icon: '⚡' }
        ];
        programmingCats.forEach(function(cat) {
          catHtml += '<label style="display: flex; align-items: center; gap: 6px; padding: 4px; cursor: pointer;">' +
                  '  <input type="checkbox" data-categoria="' + cat.id + '">' +
                  '  <span style="color: ' + cat.color + ';">' + cat.icon + ' ' + cat.name + '</span>' +
                  '</label>';
        });
      }

      catContainer.innerHTML = catHtml;

      // Sincronizar estado
      if (!ejercicio.categoriasPermitidas) {
        ejercicio.categoriasPermitidas = [];
        catContainer.querySelectorAll('input[data-categoria]').forEach(function(cb) {
          cb.checked = true;
          ejercicio.categoriasPermitidas.push(cb.getAttribute('data-categoria'));
        });
      } else {
        catContainer.querySelectorAll('input[data-categoria]').forEach(function(cb) {
          var cat = cb.getAttribute('data-categoria');
          cb.checked = ejercicio.categoriasPermitidas.indexOf(cat) !== -1;
        });
      }

      // Vincular eventos onchange dinámicos
      catContainer.querySelectorAll('input[data-categoria]').forEach(function(cb) {
        cb.onchange = function() {
          var ej = getSelectedEjercicio();
          if (!ej) return;
          ej.categoriasPermitidas = [];
          catContainer.querySelectorAll('input[data-categoria]:checked').forEach(function(checked) {
            ej.categoriasPermitidas.push(checked.getAttribute('data-categoria'));
          });
        };
      });
    }

    // Actualizar texto del tip dinámicamente según el tipo de ejercicio
    var tipEl = $('bloquesTip');
    if (tipEl) {
      if (ejercicio.tipo === 'bloques_corregir') {
        tipEl.innerHTML = '<strong>Tip:</strong> En el editor, haz <strong style="background: #ef4444; color: #fff; padding: 1px 4px; border-radius: 2px;">Ctrl + Clic</strong> en el bloque con error para marcarlo como el culpable.';
      } else if (ejercicio.tipo === 'bloques_ordenar' || ejercicio.tipo === 'bloques_armar') {
        tipEl.innerHTML = '<strong>Tip:</strong> Diseña el programa solución completo. Los bloques se procesarán de forma automática para el alumno.';
      } else if (ejercicio.tipo === 'quiz' || ejercicio.tipo === 'multiple_respuesta' || ejercicio.tipo === 'verdadero_falso') {
        tipEl.innerHTML = '<strong>Tip:</strong> Diseña el diagrama de bloques que se mostrará como parte estática del enunciado de la pregunta.';
      } else {
        tipEl.innerHTML = '<strong>Tip:</strong> En el editor, haz <strong style="background: #f59e0b; color: #000; padding: 1px 4px; border-radius: 2px;">Ctrl + Clic</strong> en un bloque para marcarlo como hueco.';
      }
    }

    // Actualizar estado
    actualizarEstadoBloques(ejercicio);
  }

  // Inicializar sistema de bloques
  function initBloquesEditor() {
    // Botón para abrir editor de solución
    if ($('btnEditarSolucionBloques')) {
      $('btnEditarSolucionBloques').onclick = function() {
        var ej = getSelectedEjercicio();
        if (!ej) {
          toast('Selecciona un ejercicio primero');
          return;
        }
        abrirEditorBloquesSolucion(ej);
      };
    }

    // Eventos para checkboxes de categorías
    var catContainer = $('bloquesCategoriasConfig');
    if (catContainer) {
      catContainer.querySelectorAll('input[data-categoria]').forEach(function(cb) {
        cb.onchange = function() {
          var ej = getSelectedEjercicio();
          if (!ej) return;

          // Guardar categorías seleccionadas
          ej.categoriasPermitidas = [];
          catContainer.querySelectorAll('input[data-categoria]:checked').forEach(function(checked) {
            ej.categoriasPermitidas.push(checked.getAttribute('data-categoria'));
          });
        };
      });
    }
  }

  // ====================================================================
  // VISTA PREVIA DE EJERCICIO DE BLOQUES (para la vista previa general)
  // ====================================================================

  // Esta función será llamada desde la vista previa general de evaluaciones
  window.renderEjercicioBloquesPreview = function(ejercicio, container, modoAlumno) {
    if (!ejercicio || !ejercicio.blocklyState) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;"><p>No hay solución de bloques configurada.</p></div>';
      return;
    }

    // Obtener categorías permitidas
    var categoriasPermitidas = ejercicio.categoriasPermitidas || ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'lists', 'custom', 'pen', 'music', 'logic', 'state', 'debug', 'gravity', 'physics'];

    // Layout principal con dos áreas Blockly
    container.innerHTML = '<div style="display: flex; flex-direction: column; height: 100%;">' +
      '<div style="display: flex; flex: 1; gap: 0;">' +
        '<div id="toolboxPreviewArea" style="width: 280px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column;">' +
          '<div style="padding: 12px 16px; border-bottom: 1px solid #334155;"><h4 style="margin: 0; color: #e2e8f0; font-size: 13px;">📦 Bloques disponibles</h4><p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">Arrastra los bloques al área de trabajo</p></div>' +
          '<div id="toolboxBlocklyContainer" style="flex: 1; min-height: 300px;"></div>' +
        '</div>' +
        '<div id="workspacePreviewArea" style="flex: 1; display: flex; flex-direction: column;">' +
          '<div style="padding: 12px 16px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">' +
            '<div><h4 style="margin: 0; color: #e2e8f0; font-size: 13px;">🧩 Completa el ejercicio</h4><p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">Arrastra bloques desde la izquierda para completar los huecos</p></div>' +
            '<div id="huecosInfo" style="background: #1e293b; padding: 6px 12px; border-radius: 6px; color: #f59e0b; font-size: 12px;">Huecos: <strong id="huecosCount">0</strong></div>' +
          '</div>' +
          '<div id="mainBlocklyContainer" style="flex: 1; min-height: 350px;"></div>' +
        '</div>' +
      '</div>' +
      '<div style="padding: 12px 20px; background: #0f172a; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 12px;">' +
        '<button id="btnLimpiarPreview" style="padding: 10px 20px; background: #334155; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer; font-size: 13px;">🗑️ Limpiar</button>' +
        '<button id="btnVerificarBloques" style="padding: 10px 24px; background: #10b981; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px; font-weight: bold;">✓ Verificar respuesta</button>' +
      '</div>' +
      '</div>';

    // Esperar a que los contenedores estén listos
    setTimeout(function() {
      initPreviewBlockly(ejercicio, categoriasPermitidas, modoAlumno);

      // Configurar botones
      var btnVerificar = document.getElementById('btnVerificarBloques');
      var btnLimpiar = document.getElementById('btnLimpiarPreview');

      if (btnVerificar) {
        if (evaluacionState && evaluacionState.notificarResultado === 'silencio') {
          btnVerificar.style.display = 'none';
        } else {
          btnVerificar.style.display = '';
        }

        // Deshabilitar botón si ya se agotaron los intentos en la carga inicial
        if (modoAlumno && evaluacionState) {
          try {
            var progressStr = localStorage.getItem('stblock_student_progress_' + evaluacionState.id);
            if (progressStr) {
              var progress = JSON.parse(progressStr);
              var curIdx = progress.currentIdx;
              var maxAttempts = (ejercicio.intentosMax !== undefined) ? parseInt(ejercicio.intentosMax) : -1;
              if (maxAttempts >= 0) {
                var currentAttempts = (progress.intentosRealizados && progress.intentosRealizados[curIdx]) || 0;
                var allowedAttempts = maxAttempts + 1;
                if (currentAttempts >= allowedAttempts) {
                  btnVerificar.disabled = true;
                  btnVerificar.style.opacity = '0.5';
                  btnVerificar.textContent = 'Intentos agotados 🔒';
                }
              }
            }
          } catch(e) {}
        }

        btnVerificar.onclick = function() {
          if (modoAlumno && evaluacionState) {
            try {
              var progressStr = localStorage.getItem('stblock_student_progress_' + evaluacionState.id);
              if (progressStr) {
                var progress = JSON.parse(progressStr);
                progress.intentosRealizados = progress.intentosRealizados || {};
                var curIdx = progress.currentIdx;
                var maxAttempts = (ejercicio.intentosMax !== undefined) ? parseInt(ejercicio.intentosMax) : -1;
                
                if (maxAttempts >= 0) {
                  var currentAttempts = (progress.intentosRealizados[curIdx] || 0);
                  var allowedAttempts = maxAttempts + 1;
                  
                  if (currentAttempts >= allowedAttempts) {
                    showAlert('Has agotado tus intentos permitidos para este ejercicio.');
                    return;
                  }
                  
                  currentAttempts++;
                  progress.intentosRealizados[curIdx] = currentAttempts;
                  localStorage.setItem('stblock_student_progress_' + evaluacionState.id, JSON.stringify(progress));
                  
                  var res = window.verificarRespuestaBloques(ejercicio);
                  var isCorrect = (res && res.porcentaje === 100);
                  
                  if (isCorrect) {
                    toast('✓ ¡Respuesta correcta!');
                  } else {
                    var remaining = allowedAttempts - currentAttempts;
                    if (remaining > 0) {
                      toast('❌ Respuesta incorrecta. Te quedan ' + remaining + ' intento(s).');
                    } else {
                      showAlert('❌ Respuesta incorrecta. Has agotado tus ' + allowedAttempts + ' intento(s) para este ejercicio. Pulsa "Siguiente" para continuar.');
                      btnVerificar.disabled = true;
                      btnVerificar.style.opacity = '0.5';
                      btnVerificar.textContent = 'Intentos agotados 🔒';
                    }
                  }
                  return;
                }
              }
            } catch(e) {
              console.error('Error en verificar intentos:', e);
            }
          }
          window.verificarRespuestaBloques(ejercicio);
        };
      }

      if (btnLimpiar) {
        btnLimpiar.onclick = function() {
          if (window._previewWorkspace) {
            // Limpiar solo los bloques añadidos por el alumno
            var blocks = window._previewWorkspace.getAllBlocks(false);
            blocks.forEach(function(b) { b.dispose(false, false); });

            // Volver a crear los marcadores
            crearMarcadoresHuecos(window._previewWorkspace);

            // Quitar resultado anterior
            var result = document.getElementById('verificacionResultado');
            if (result) result.remove();
          }
        };
      }

      // Actualizar contador de huecos
      setTimeout(function() {
        var count = document.getElementById('huecosCount');
        if (count && window._expectedBlocks) {
          count.textContent = window._expectedBlocks.length;
        }
      }, 300);

    }, 100);
  };

  // Serialización compacta para comparación estructural (modo bloques_armar)
  function obtenerEstructuraCompacta(block) {
    if (!block) return null;
    if (block.isShadow && block.isShadow()) return null;

    var struct = {
      type: block.type,
      fields: {},
      inputs: {},
      next: obtenerEstructuraCompacta(block.getNextBlock())
    };

    if (block.inputList) {
      block.inputList.forEach(function(input) {
        if (input.fieldRow) {
          input.fieldRow.forEach(function(field) {
            if (field.name && typeof field.getValue === 'function') {
              struct.fields[field.name] = field.getValue();
            }
          });
        }
        if (input.connection && input.connection.targetBlock()) {
          var child = input.connection.targetBlock();
          if (child) {
            if (child.isShadow && child.isShadow()) {
              var shadowVal = '';
              child.inputList.forEach(function(shInput) {
                if (shInput.fieldRow) {
                  shInput.fieldRow.forEach(function(shField) {
                    if (typeof shField.getValue === 'function') {
                      shadowVal = shField.getValue();
                    }
                  });
                }
              });
              struct.inputs[input.name] = {
                type: child.type,
                value: shadowVal
              };
            } else {
              struct.inputs[input.name] = obtenerEstructuraCompacta(child);
            }
          }
        }
      });
    }

    return struct;
  }

  // Comparación recursiva de estructuras
  function sonEstructurasIguales(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.type !== b.type) return false;

    // Comparar fields
    var keysA = Object.keys(a.fields);
    var keysB = Object.keys(b.fields);
    if (keysA.length !== keysB.length) return false;
    for (var i = 0; i < keysA.length; i++) {
      var k = keysA[i];
      if (a.fields[k] !== b.fields[k]) return false;
    }

    // Comparar inputs
    var inputKeysA = Object.keys(a.inputs);
    var inputKeysB = Object.keys(b.inputs);
    if (inputKeysA.length !== inputKeysB.length) return false;
    for (var i = 0; i < inputKeysA.length; i++) {
      var k = inputKeysA[i];
      if (a.inputs[k] && a.inputs[k].value !== undefined) {
        if (!b.inputs[k] || b.inputs[k].value === undefined) return false;
        if (a.inputs[k].value !== b.inputs[k].value) return false;
      } else {
        if (!sonEstructurasIguales(a.inputs[k], b.inputs[k])) return false;
      }
    }

    // Comparar next
    return sonEstructurasIguales(a.next, b.next);
  }

  // Inicializar Blockly para la vista previa
  function initPreviewBlockly(ejercicio, categoriasPermitidas, modoAlumno) {
    if (!categoriasPermitidas) categoriasPermitidas = [];
    var isCircuitoCodigo = (ejercicio && ejercicio.tipo === 'circuito_codigo');
    var isCircuitoCodigoArmarProg = isCircuitoCodigo && (ejercicio.progMode === 'bloques') && (ejercicio.ocultar === 'programacion');

    var mainContainer = document.getElementById('mainBlocklyContainer');
    var toolboxContainer = document.getElementById('toolboxBlocklyContainer');
    var toolboxArea = document.getElementById('toolboxPreviewArea');

    if (!mainContainer || !toolboxContainer) {
      console.warn('[Preview] Containers not found');
      return;
    }

    // Inyectar estilos globales de Blockly si no existen
    if (!document.getElementById('blockly-toolbox-custom-styles')) {
      var style = document.createElement('style');
      style.id = 'blockly-toolbox-custom-styles';
      style.textContent = `
        .blocklyToolboxCategoryLabel {
          color: #e2e8f0 !important;
          font-family: 'Outfit', 'Inter', sans-serif !important;
          font-weight: 500 !important;
          font-size: 13px !important;
        }
        .blocklyTreeRow:hover .blocklyToolboxCategoryLabel,
        .blocklyToolboxCategory:hover .blocklyToolboxCategoryLabel,
        .blocklyTreeRowSelected .blocklyToolboxCategoryLabel {
          color: #ffffff !important;
        }
      `;
      document.head.appendChild(style);
    }

    if (ejercicio && (ejercicio.tipo === 'bloques_ordenar' || ejercicio.tipo === 'bloques_corregir')) {
      if (toolboxArea) toolboxArea.style.display = 'none';
    } else {
      if (toolboxArea) toolboxArea.style.display = 'block';
    }

    // Crear toolbox XML
    var toolboxXml = '';
    
    if (ejercicio && ejercicio.tipo === 'bloques_armar') {
      try {
        if (ejercicio.blocklyState) {
          var tempDiv = document.createElement('div');
          var tempWorkspace = Blockly.inject(tempDiv, { renderer: 'zelos' });
          Blockly.serialization.workspaces.load(ejercicio.blocklyState, tempWorkspace);
          
          window._solutionStructures = [];
          var solTopBlocks = tempWorkspace.getTopBlocks(true);
          solTopBlocks.forEach(function(b) {
            if (b.isShadow && b.isShadow()) return;
            window._solutionStructures.push(obtenerEstructuraCompacta(b));
          });

          var allSolBlocks = tempWorkspace.getAllBlocks(false);
          toolboxXml = '<xml id="toolbox-preview" style="display: none">';
          toolboxXml += '<category name="Bloques necesarios" colour="#9966FF">';
          
          allSolBlocks.forEach(function(b) {
            if (b.isShadow && b.isShadow()) return;
            var xml = Blockly.Xml.blockToDom(b);
            var nextNode = xml.querySelector('next');
            if (nextNode) {
              xml.removeChild(nextNode);
            }
            toolboxXml += Blockly.Xml.domToText(xml);
          });
          
          toolboxXml += '</category></xml>';
          tempWorkspace.dispose();
          console.log('[STBLOCK-SNAP] Modo Armar: Toolbox generado desde la solución.');
        } else {
          toolboxXml = '<xml id="toolbox-preview" style="display: none"><category name="Bloques necesarios" colour="#9966FF"></category></xml>';
        }
      } catch (err) {
        console.error('[STBLOCK-SNAP] Error al generar toolbox para bloques_armar:', err);
        toolboxXml = '<xml id="toolbox-preview" style="display: none"></xml>';
      }
    } else {
      toolboxXml = '<xml id="toolbox-preview" style="display: none">';
      if (window.ScratchBlockly) {
        var categoriesConfig = [];
        
        var activeEval = window.targetEval || evaluacionState;
        if (activeEval && activeEval.entorno === 'dispositivos') {
          var boardId = activeEval.tarjeta || 'stbBoardV2';
          var dynamicXml = '';
          if (typeof window.registerDynamicDeviceBlocks === 'function') {
            dynamicXml = window.registerDynamicDeviceBlocks(boardId);
          } else {
            dynamicXml = '<category name="Arduino" colour="#00979C">' + window.ScratchBlockly.getArduinoBlocks() + '</category>';
          }
          toolboxXml += dynamicXml;

          categoriesConfig = [
            { id: 'control', name: 'Control', color: window.ScratchBlockly.colors.control.primary, method: 'getControlBlocks' },
            { id: 'operators', name: 'Operadores', color: window.ScratchBlockly.colors.operators.primary, method: 'getOperatorsBlocks' },
            { id: 'variables', name: 'Variables', color: window.ScratchBlockly.colors.variables.primary, method: 'getVariablesBlocks' }
          ];
          
          categoriesConfig.forEach(function(cat) {
            if (categoriasPermitidas.length === 0 || categoriasPermitidas.indexOf(cat.id) !== -1) {
              var blocksXml = '';
              if (typeof window.ScratchBlockly[cat.method] === 'function') {
                blocksXml = window.ScratchBlockly[cat.method]();
              }
              toolboxXml += '<category name="' + cat.name + '" colour="' + cat.color + '">' + blocksXml + '</category>';
            }
          });
        } else {
          categoriesConfig = [
            { id: 'motion', name: 'Movimiento', color: window.ScratchBlockly.colors.motion.primary, method: 'getMotionBlocks' },
            { id: 'looks', name: 'Apariencia', color: window.ScratchBlockly.colors.looks.primary, method: 'getLooksBlocks' },
            { id: 'sound', name: 'Sonido', color: window.ScratchBlockly.colors.sound.primary, method: 'getSoundBlocks' },
            { id: 'events', name: 'Eventos', color: window.ScratchBlockly.colors.events.primary, method: 'getEventsBlocks' },
            { id: 'control', name: 'Control', color: window.ScratchBlockly.colors.control.primary, method: 'getControlBlocks' },
            { id: 'sensing', name: 'Sensores', color: window.ScratchBlockly.colors.sensing.primary, method: 'getSensingBlocks' },
            { id: 'operators', name: 'Operadores', color: window.ScratchBlockly.colors.operators.primary, method: 'getOperatorsBlocks' },
            { id: 'variables', name: 'Variables', color: window.ScratchBlockly.colors.variables.primary, method: 'getVariablesBlocks' },
            { id: 'lists', name: 'Listas', color: window.ScratchBlockly.colors.lists.primary, method: 'getListsBlocks' },
            { id: 'pen', name: 'Lápiz', color: window.ScratchBlockly.colors.pen.primary, method: 'getPenBlocks' },
            { id: 'music', name: 'Música', color: window.ScratchBlockly.colors.music.primary, method: 'getMusicBlocks' },
            { id: 'logic', name: 'Lógica+', color: window.ScratchBlockly.colors.logic.primary, method: 'getLogicBlocks' },
            { id: 'state', name: 'Estado', color: window.ScratchBlockly.colors.state.primary, method: 'getStateBlocks' },
            { id: 'debug', name: 'Debug', color: window.ScratchBlockly.colors.debug.primary, method: 'getDebugBlocks' },
            { id: 'gravity', name: 'Gravedad', color: window.ScratchBlockly.colors.gravity.primary, method: 'getGravityBlocks' },
            { id: 'physics', name: 'Física', color: window.ScratchBlockly.colors.physics.primary, method: 'getPhysicsBlocks' }
          ];
          
          categoriesConfig.forEach(function(cat) {
            if (categoriasPermitidas.indexOf(cat.id) !== -1) {
              var blocksXml = '';
              if (typeof window.ScratchBlockly[cat.method] === 'function') {
                blocksXml = window.ScratchBlockly[cat.method]();
              }
              toolboxXml += '<category name="' + cat.name + '" colour="' + cat.color + '">' + blocksXml + '</category>';
            }
          });
        }
      }
      toolboxXml += '</xml>';
    }

    // Guardar referencia global para verificación
    window._previewWorkspace = null;
    window._expectedBlocks = [];
    window._selectedCulpritId = null;
    window._selectedCulpritIndex = null;
    window._correctErrorIndices = [];

    // Workspace principal (donde está la solución con huecos)
    var mainWorkspace = null;
    try {
      mainWorkspace = Blockly.inject(mainContainer, {
        toolbox: (ejercicio && (ejercicio.tipo === 'bloques_ordenar' || ejercicio.tipo === 'bloques_corregir')) ? null : toolboxXml,
        renderer: 'zelos',
        theme: Blockly.Themes.Dark || Blockly.Themes.Classic,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 2,
          minScale: 0.5
        },
        grid: {
          spacing: 20,
          length: 3,
          colour: '#333',
          snap: true
        },
        trashcan: true,
        scrollbars: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true
        }
      });

      window._previewWorkspace = mainWorkspace;

      // Cargar el estado guardado
      if (ejercicio.blocklyState) {
        if (ejercicio.tipo === 'bloques_armar' || isCircuitoCodigoArmarProg) {
          // El lienzo inicia completamente vacío para armar
          console.log('[STBLOCK-SNAP] Modo Armar: Iniciando lienzo vacío.');
        } else {
          Blockly.serialization.workspaces.load(ejercicio.blocklyState, mainWorkspace);
          
          if (ejercicio.tipo === 'bloques_ordenar') {
            setTimeout(function() {
              // 1. Registrar conexiones correctas antes de esparcir
              window._correctConnections = [];
              var allBlocks = mainWorkspace.getAllBlocks(false);
              allBlocks.forEach(function(b) {
                var parent = b.getParent();
                window._correctConnections.push({
                  blockId: b.id,
                  type: b.type,
                  parentId: parent ? parent.id : null,
                  isRoot: !parent
                });
              });

              // 2. Desconectar y esparcir los bloques aleatoriamente
              allBlocks.forEach(function(b) {
                if (b.isShadow && b.isShadow()) return; // Ignorar bloques sombra
                if (b.previousConnection && b.previousConnection.targetConnection) {
                  try {
                    b.previousConnection.disconnect();
                  } catch (err) {
                    console.warn('[STBLOCK-SNAP] Error al desconectar conexion previa:', err);
                  }
                }
                if (b.outputConnection && b.outputConnection.targetConnection) {
                  try {
                    b.outputConnection.disconnect();
                  } catch (err) {
                    console.warn('[STBLOCK-SNAP] Error al desconectar salida:', err);
                  }
                }
              });

              allBlocks.forEach(function(b) {
                if (b.isShadow && b.isShadow()) return; // Ignorar bloques sombra
                var targetX = 50 + Math.random() * 300;
                var targetY = 50 + Math.random() * 300;
                var currentPos = b.getRelativeToSurfaceXY();
                b.moveBy(targetX - currentPos.x, targetY - currentPos.y);
                
                b.setMovable(true);
                b.setEditable(true);
                b.isOriginal = false;
              });

              console.log('[STBLOCK-SNAP] Modo Ordenar: Bloques esparcidos al azar después de renderizar.');
              Blockly.svgResize(mainWorkspace);
            }, 200);
          } else if (ejercicio.tipo === 'bloques_corregir') {
            // Calcular índices de los bloques marcados con error en la solución
            try {
              window._correctErrorIndices = [];
              if (ejercicio.blocklyState && ejercicio.bloquesOcultos) {
                var tempDiv = document.createElement('div');
                var tempWorkspace = Blockly.inject(tempDiv, { renderer: 'zelos' });
                Blockly.serialization.workspaces.load(ejercicio.blocklyState, tempWorkspace);
                var allSolBlocks = tempWorkspace.getAllBlocks(false);
                ejercicio.bloquesOcultos.forEach(function(origId) {
                  for (var i = 0; i < allSolBlocks.length; i++) {
                    if (allSolBlocks[i].id === origId) {
                      window._correctErrorIndices.push(i);
                      break;
                    }
                  }
                });
                tempWorkspace.dispose();
                console.log('[STBLOCK-SNAP] Índices correctos con error calculados:', window._correctErrorIndices);
              }
            } catch (err) {
              console.error('[STBLOCK-SNAP] Error calculando índices de error:', err);
            }

            setTimeout(function() {
              // Inyectar CSS de resaltado si no existe
              if (!document.getElementById('preview-corregir-styles')) {
                var style = document.createElement('style');
                style.id = 'preview-corregir-styles';
                style.textContent = `
                  .bloque-seleccionado-culpable > .blocklyPath {
                    stroke: #f59e0b !important;
                    stroke-width: 5px !important;
                  }
                  .bloque-correcto-culpable > .blocklyPath {
                    stroke: #10b981 !important;
                    stroke-width: 5px !important;
                  }
                  .bloque-incorrecto-culpable > .blocklyPath {
                    stroke: #ef4444 !important;
                    stroke-width: 5px !important;
                  }
                `;
                document.head.appendChild(style);
              }

              // Poner cursor pointer y bloquear todos los bloques
              mainWorkspace.getAllBlocks(false).forEach(function(b) {
                b.isOriginal = true;
                b.setMovable(false);
                b.setEditable(false);
                var svg = b.getSvgRoot ? b.getSvgRoot() : null;
                if (svg && !b.isShadow()) {
                  svg.style.cursor = 'pointer';
                }
              });

              // Configurar un único listener de pointerdown en el contenedor
              var previewContainer = document.getElementById('mainBlocklyContainer');
              if (previewContainer) {
                if (previewContainer._pointerdownListener) {
                  previewContainer.removeEventListener('pointerdown', previewContainer._pointerdownListener, true);
                }

                previewContainer._pointerdownListener = function(e) {
                  var allBlocks = mainWorkspace.getAllBlocks(false);
                  var clickedBlock = null;
                  var current = e.target;
                  
                  // Escalar en el árbol DOM del elemento clicado para encontrar el bloque correspondiente
                  while (current && current !== previewContainer) {
                    for (var j = 0; j < allBlocks.length; j++) {
                      var block = allBlocks[j];
                      var svg = block.getSvgRoot ? block.getSvgRoot() : null;
                      if (svg && svg === current) {
                        clickedBlock = block;
                        break;
                      }
                    }
                    if (clickedBlock) break;
                    current = current.parentElement;
                  }

                  if (!clickedBlock) {
                    var blockElement = e.target.closest('[data-id]');
                    if (blockElement) {
                      var dataId = blockElement.getAttribute('data-id');
                      for (var k = 0; k < allBlocks.length; k++) {
                        if (allBlocks[k].id === dataId) {
                          clickedBlock = allBlocks[k];
                          break;
                        }
                      }
                    }
                  }

                  // Si se hizo clic en un bloque sombra, seleccionar su bloque padre real
                  if (clickedBlock && clickedBlock.isShadow && clickedBlock.isShadow()) {
                    var parent = clickedBlock.getParent();
                    if (parent) clickedBlock = parent;
                  }

                  // Resetear clases de todos los bloques
                  allBlocks.forEach(function(otherB) {
                    var otherSvg = otherB.getSvgRoot ? otherB.getSvgRoot() : null;
                    if (otherSvg) {
                      otherSvg.classList.remove('bloque-seleccionado-culpable');
                      otherSvg.classList.remove('bloque-correcto-culpable');
                      otherSvg.classList.remove('bloque-incorrecto-culpable');
                    }
                  });

                  if (clickedBlock) {
                    e.stopPropagation();
                    var clickedIndex = allBlocks.indexOf(clickedBlock);
                    window._selectedCulpritIndex = clickedIndex;
                    console.log('[STBLOCK-SNAP] Click directo detectado en bloque culpable índice:', clickedIndex, 'ID:', clickedBlock.id);

                    // Añadir clase de seleccionado
                    var svg = clickedBlock.getSvgRoot ? clickedBlock.getSvgRoot() : null;
                    if (svg) {
                      svg.classList.add('bloque-seleccionado-culpable');
                    }

                    if (ejercicio && window._previewWorkspace && evaluacionState && evaluacionState.notificarResultado === 'instante') {
                      window.verificarRespuestaBloques(ejercicio, true); // true = silencioso
                    }
                  } else {
                    // Clic en el fondo del workspace
                    window._selectedCulpritIndex = null;
                    console.log('[STBLOCK-SNAP] Clic en fondo: deseleccionando bloque.');

                    if (ejercicio && window._previewWorkspace && evaluacionState && evaluacionState.notificarResultado === 'instante') {
                      window.verificarRespuestaBloques(ejercicio, true);
                    }
                  }
                };

                previewContainer.addEventListener('pointerdown', previewContainer._pointerdownListener, true);
              }
            }, 200);
          } else {
            // Modo Completar: Bloquear todos los bloques cargados inicialmente
            mainWorkspace.getAllBlocks(false).forEach(function(b) {
              b.isOriginal = true;
              b.setMovable(false);
              b.setEditable(false);
            });
          }
        }
      }

      Blockly.svgResize(mainWorkspace);

      // Listener para cambios (feedback al instante y auto-conexión de hijos)
      mainWorkspace.addChangeListener(function(e) {
        // Imprimir todos los eventos para depuración
        console.log('[STBLOCK-SNAP] Evento detectado:', e.type, 'BlockID:', e.blockId);

        // Evitar ejecutar lógica de verificación y estilos MIENTRAS se está arrastrando un bloque
        var isDragging = typeof mainWorkspace.isDragging === 'function' ? mainWorkspace.isDragging() : false;
        if (isDragging) {
          return;
        }

        if (ejercicio && ejercicio.tipo === 'bloques_corregir') {
          // Si cambian cosas en el UI, nos aseguramos que el feedback al instante funcione si está activo
          if (ejercicio && window._previewWorkspace && evaluacionState && evaluacionState.notificarResultado === 'instante') {
            window.verificarRespuestaBloques(ejercicio, true); // true = silencioso
          }
          return; // Bypass completo
        }

        if (ejercicio && (ejercicio.tipo === 'bloques_ordenar' || ejercicio.tipo === 'bloques_armar')) {
          // Imprimir el estado de todos los bloques en el workspace
          if (e.type === 'move' || e.type === 'ui') {
            console.log('[STBLOCK-DEBUG-STATUS] --- ESTADO DE TODOS LOS BLOQUES ---');
            mainWorkspace.getAllBlocks(false).forEach(function(b) {
              if (b.isShadow && b.isShadow()) return;
              console.log('[STBLOCK-DEBUG-BLOCK] ID:', b.id, 'Tipo:', b.type, 'Movable:', b.isMovable(), 'Editable:', b.isEditable(), 'Parent:', b.getParent() ? b.getParent().id : 'none');
            });
          }

          // Resetear estilos de borde al mover/cambiar
          mainWorkspace.getAllBlocks(false).forEach(function(b) {
            var svg = b.getSvgRoot ? b.getSvgRoot() : null;
            if (svg) {
              var path = svg.querySelector('.blocklyPath');
              if (path) {
                path.style.stroke = '';
                path.style.strokeWidth = '';
              }
            }
          });
          
          // Feedback al instante para modo ordenar si está activo
          if (ejercicio && window._previewWorkspace && evaluacionState && evaluacionState.notificarResultado === 'instante') {
            window.verificarRespuestaBloques(ejercicio, true); // true = silencioso
          }
          return; // Bypass completo de la lógica de huecos e inmovilización
        }

        // 0. Mantener todos los bloques originales y bloque_hueco estrictamente inamovibles y no editables en todo momento
        mainWorkspace.getAllBlocks(false).forEach(function(b) {
          // Resetear estilos de borde al mover/cambiar
          if (b.type !== 'bloque_hueco') {
            var svg = b.getSvgRoot ? b.getSvgRoot() : null;
            if (svg) {
              var path = svg.querySelector('.blocklyPath');
              if (path) {
                path.style.stroke = '';
                path.style.strokeWidth = '';
              }
            }
          }

          if (b.isOriginal || b.type === 'bloque_hueco') {
            b.setMovable(false);
            b.setEditable(false);
          } else {
            b.setMovable(true);
          }
        });

        console.log('[STBLOCK-SNAP] Evento detectado:', e.type, 'BlockID:', e.blockId);

        // 1. Detectar si el alumno ha movido un bloque nuevo cerca del hueco
        if (window._expectedBlocks && window._expectedBlocks.length > 0) {
          var allBlocks = mainWorkspace.getAllBlocks(false);
          
          window._expectedBlocks.forEach(function(expected) {
            var parentBlock = mainWorkspace.getBlockById(expected.parentId);
            var childBlock = mainWorkspace.getBlockById(expected.childId);
            var huecoBlock = expected.huecoBlockId ? mainWorkspace.getBlockById(expected.huecoBlockId) : null;
            
            // Encontrar qué bloque del alumno está ocupando el hueco (si ya está colocado)
            var placedBlock = null;
            if (parentBlock) {
              if (expected.parentConnection === 'next' && parentBlock.nextConnection) {
                placedBlock = parentBlock.nextConnection.targetBlock();
              } else if (expected.parentConnection === 'input' && expected.inputName) {
                var input = parentBlock.getInput(expected.inputName);
                placedBlock = (input && input.connection) ? input.connection.targetBlock() : null;
              }
            }

            if (huecoBlock) {
              // Buscar bloques del alumno que estén sueltos en el workspace y arrastrados cerca del hueco
              allBlocks.forEach(function(b) {
                if (b.isOriginal || b.type === 'bloque_hueco') return;
                if (b.getParent()) return; // Solo buscar bloques raíz/independientes arrastrados
                
                var huecoPos = huecoBlock.getRelativeToSurfaceXY();
                var bPos = b.getRelativeToSurfaceXY();
                var dist = Math.sqrt(Math.pow(huecoPos.x - bPos.x, 2) + Math.pow(huecoPos.y - bPos.y, 2));
                
                // Si la distancia es menor a 80px, auto-conectamos
                if (dist < 80) {
                  console.log('[STBLOCK-SNAP] Bloque del alumno soltado cerca del hueco. Distancia:', dist, 'Bloque:', b.type);
                  try {
                    Blockly.Events.disable();
                    
                    // Desconectar el hijo del bloque hueco
                    if (childBlock && childBlock.previousConnection && childBlock.previousConnection.targetBlock() === huecoBlock) {
                      childBlock.previousConnection.disconnect();
                    }
                    
                    // Desconectar el bloque hueco del padre
                    if (huecoBlock.previousConnection && huecoBlock.previousConnection.targetBlock()) {
                      huecoBlock.previousConnection.disconnect();
                    }
                    
                    // Destruir el bloque hueco
                    huecoBlock.dispose(false);
                    expected.huecoBlockId = null;
                    
                    // Conectar el bloque del alumno al padre
                    if (parentBlock) {
                      if (expected.parentConnection === 'next' && parentBlock.nextConnection) {
                        parentBlock.nextConnection.connect(b.previousConnection);
                      } else if (expected.parentConnection === 'input' && expected.inputName) {
                        var input = parentBlock.getInput(expected.inputName);
                        if (input && input.connection) {
                          input.connection.connect(b.previousConnection);
                        }
                      }
                    }
                    
                    // Conectar el hijo al final de la pila del bloque del alumno
                    if (childBlock && childBlock.previousConnection) {
                      var lastBlockInStack = b;
                      while (lastBlockInStack.nextConnection && lastBlockInStack.nextConnection.targetBlock()) {
                        lastBlockInStack = lastBlockInStack.nextConnection.targetBlock();
                      }
                      if (lastBlockInStack.nextConnection) {
                        lastBlockInStack.nextConnection.connect(childBlock.previousConnection);
                      }
                    }
                    
                    Blockly.Events.enable();
                    console.log('[STBLOCK-SNAP] -> bloque_hueco reemplazado exitosamente.');
                  } catch (err) {
                    console.error('[STBLOCK-SNAP] Error auto-conectando:', err);
                    Blockly.Events.enable();
                  }
                }
              });
            } else if (!placedBlock) {
              // El alumno quitó su respuesta, por lo que el hueco ha quedado vacío. Re-creamos el bloque_hueco
              console.log('[STBLOCK-SNAP] El hueco está vacío. Re-creando bloque_hueco.');
              try {
                Blockly.Events.disable();
                
                var newHueco = mainWorkspace.newBlock('bloque_hueco');
                newHueco.isOriginal = true;
                newHueco.setMovable(false);
                newHueco.setEditable(false);
                newHueco.initSvg();
                newHueco.render();
                expected.huecoBlockId = newHueco.id;
                
                if (newHueco.getSvgRoot()) {
                  newHueco.getSvgRoot().classList.add('bloque-hueco-visual');
                }
                
                // Conectar al padre
                if (parentBlock) {
                  if (expected.parentConnection === 'next' && parentBlock.nextConnection) {
                    parentBlock.nextConnection.connect(newHueco.previousConnection);
                  } else if (expected.parentConnection === 'input' && expected.inputName) {
                    var input = parentBlock.getInput(expected.inputName);
                    if (input && input.connection) {
                      input.connection.connect(newHueco.previousConnection);
                    }
                  }
                }
                
                // Conectar al hijo
                if (childBlock && childBlock.previousConnection && !childBlock.previousConnection.targetBlock()) {
                  newHueco.nextConnection.connect(childBlock.previousConnection);
                }
                
                Blockly.Events.enable();
                console.log('[STBLOCK-SNAP] -> bloque_hueco re-creado.');
              } catch (err) {
                console.error('[STBLOCK-SNAP] Error re-creando bloque_hueco:', err);
                Blockly.Events.enable();
              }
            }
          });
        }

        // 2. Feedback al instante
        if (ejercicio && window._previewWorkspace && evaluacionState && evaluacionState.notificarResultado === 'instante') {
          window.verificarRespuestaBloques(ejercicio, true); // true = silencioso
        }
      });

      // Ocultar completamente los bloques que son huecos y recordar qué eran (solo para modo completar)
      if (modoAlumno && ejercicio.tipo === 'bloques_completar' && ejercicio.bloquesOcultos && ejercicio.bloquesOcultos.length > 0) {
        setTimeout(function() {
          ocultarHuecosYRecordar(mainWorkspace, ejercicio.bloquesOcultos);
        }, 200);
      }

      console.log('[Preview] Blockly workspace initialized');

    } catch (e) {
      console.error('[Preview] Error initializing Blockly:', e);
      mainContainer.innerHTML = '<div style="padding: 20px; color: #ef4444;">Error al cargar Blockly: ' + e.message + '</div>';
    }
  }

  // Identificar y reemplazar los bloques ocultos por bloques HUECO especiales
  function ocultarHuecosYRecordar(workspace, bloquesOcultos) {
    if (!workspace) return;

    console.log('[STBLOCK-SNAP] ocultarHuecosYRecordar iniciado. Huecos configurados:', bloquesOcultos);

    // Inyectar CSS de bloque hueco transparente si no existe
    if (!document.getElementById('bloque-hueco-visual-styles')) {
      var style = document.createElement('style');
      style.id = 'bloque-hueco-visual-styles';
      style.textContent = `
        .bloque-hueco-visual > .blocklyPath {
          fill: rgba(245, 158, 11, 0.15) !important;
          fill-opacity: 0.15 !important;
          stroke: #f59e0b !important;
          stroke-width: 2px !important;
          stroke-dasharray: 6 4 !important;
        }
        .bloque-hueco-visual > g > text,
        .bloque-hueco-visual > g > g > text,
        .bloque-hueco-visual > text {
          fill: #f59e0b !important;
          fill-opacity: 0.8 !important;
          font-weight: bold !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Registrar el bloque de hueco si no existe
    if (typeof Blockly !== 'undefined' && !Blockly.Blocks['bloque_hueco']) {
      Blockly.Blocks['bloque_hueco'] = {
        init: function() {
          this.jsonInit({
            "message0": "¿? HUECO",
            "previousStatement": null,
            "nextStatement": null,
            "colour": "#f59e0b",
            "inputsInline": true
          });
        }
      };
    }

    window._expectedBlocks = [];
    window._hiddenBlockIds = [];
    var allBlocks = workspace.getAllBlocks(false);
    var blocksToRemove = [];

    // Registrar e identificar bloques ocultos
    allBlocks.forEach(function(block) {
      if (block.isShadow && block.isShadow()) return; // Ignorar bloques sombra

      var isOculto = bloquesOcultos.indexOf(block.id) !== -1;
      if (isOculto) {
        var parent = block.getParent();
        var parentConnection = null;
        var inputName = null;
        var childBlock = block.nextConnection ? block.nextConnection.targetBlock() : null;

        if (parent) {
          if (parent.nextConnection && parent.nextConnection.targetBlock() === block) {
            parentConnection = 'next';
          } else {
            var input = parent.inputList.find(function(inp) {
              return inp.connection && inp.connection.targetBlock() === block;
            });
            if (input) {
              parentConnection = 'input';
              inputName = input.name;
            }
          }
        }

        console.log('[STBLOCK-SNAP] Hueco detectado para reemplazo:', {
          id: block.id,
          type: block.type,
          parentId: parent ? parent.id : null,
          parentConnection: parentConnection,
          childId: childBlock ? childBlock.id : null
        });

        blocksToRemove.push({
          block: block,
          parentId: parent ? parent.id : null,
          parentConnection: parentConnection,
          inputName: inputName,
          childBlock: childBlock,
          position: block.getRelativeToSurfaceXY(),
          type: block.type
        });
      }
    });

    // Reemplazar cada bloque oculto por un bloque_hueco
    blocksToRemove.forEach(function(item) {
      var block = item.block;
      var parent = item.parentId ? workspace.getBlockById(item.parentId) : null;
      var childBlock = item.childBlock;

      // Crear el bloque_hueco
      var huecoBlock = workspace.newBlock('bloque_hueco');
      huecoBlock.isOriginal = true;
      huecoBlock.setMovable(false);
      huecoBlock.setEditable(false);
      huecoBlock.initSvg();
      huecoBlock.render();

      if (huecoBlock.getSvgRoot()) {
        huecoBlock.getSvgRoot().classList.add('bloque-hueco-visual');
      }

      // Posicionar el bloque_hueco
      huecoBlock.moveBy(item.position.x, item.position.y);

      // Desconectar el bloque original y conectar el bloque_hueco
      if (block.nextConnection && childBlock) {
        block.nextConnection.disconnect();
      }

      // Conectar el bloque_hueco al padre
      if (parent) {
        try {
          if (item.parentConnection === 'next') {
            parent.nextConnection.connect(huecoBlock.previousConnection);
          } else if (item.parentConnection === 'input' && item.inputName) {
            var input = parent.getInput(item.inputName);
            if (input && input.connection) {
              input.connection.connect(huecoBlock.previousConnection);
            }
          }
        } catch (e) {
          console.warn('[STBLOCK-SNAP] Error conectando hueco al padre:', e);
        }
      }

      // Conectar el hijo al bloque_hueco
      if (childBlock) {
        try {
          huecoBlock.nextConnection.connect(childBlock.previousConnection);
        } catch (e) {
          console.warn('[STBLOCK-SNAP] Error conectando hijo al hueco:', e);
        }
      }

      // Registrar en el estado esperado
      window._expectedBlocks.push({
        id: block.id,
        huecoBlockId: huecoBlock.id,
        type: block.type,
        position: item.position,
        parentId: item.parentId,
        parentConnection: item.parentConnection,
        inputName: item.inputName,
        childId: childBlock ? childBlock.id : null
      });

      window._hiddenBlockIds.push(block.id);

      // Eliminar el bloque original
      block.dispose(false);
      console.log('[STBLOCK-SNAP] Reemplazado bloque oculto por bloque_hueco:', block.id, '->', huecoBlock.id);
    });

    console.log('[STBLOCK-SNAP] Total de huecos creados:', window._expectedBlocks.length);
  }




  window.verificarRespuestaCircuito = function(ejercicio, silencioso) {
    var playerIframe = document.getElementById('velxioPlayerIframe');
    if (!playerIframe) {
      return { correctos: 0, total: 1, porcentaje: 0, mensaje: 'Simulador no disponible' };
    }
    
    try {
      var win = playerIframe.contentWindow;
      var boardStore = win.__VELXIO_BOARD_STORE;
      if (!boardStore || typeof boardStore.getState !== 'function') {
        return { correctos: 0, total: 1, porcentaje: 0, mensaje: 'El simulador se está inicializando' };
      }
      
      var boardState = boardStore.getState();
      var studentState = {
        boards: boardState.boards || [],
        components: boardState.components || [],
        wires: boardState.wires || []
      };

      if (!ejercicio.circuitoSolucion || !ejercicio.circuitoSolucion.components) {
        var res = { correctos: 1, total: 1, porcentaje: 100, mensaje: 'Sin circuito solución configurado. Aprobado por defecto.' };
        if (!silencioso) {
          mostrarResultadoVerificacion(res.correctos, res.total, res.porcentaje, [], res.mensaje);
        }
        return res;
      }

      // 1. Verificar inventario de componentes
      var solCompCounts = {};
      ejercicio.circuitoSolucion.components.forEach(function(c) {
        solCompCounts[c.type] = (solCompCounts[c.type] || 0) + 1;
      });

      var studCompCounts = {};
      studentState.components.forEach(function(c) {
        studCompCounts[c.type] = (studCompCounts[c.type] || 0) + 1;
      });

      var missingComponents = [];
      for (var type in solCompCounts) {
        var solCount = solCompCounts[type];
        var studCount = studCompCounts[type] || 0;
        if (studCount < solCount) {
          var friendlyName = type.replace('wokwi-', '').replace('arduino-', '').toUpperCase();
          missingComponents.push(friendlyName);
        }
      }

      var totalWires = ejercicio.circuitoSolucion.wires.length;
      var totalSteps = totalWires + 1; // 1 paso para componentes, N pasos para cables

      if (missingComponents.length > 0) {
        var msg = 'Faltan componentes requeridos: ' + missingComponents.join(', ');
        var res = { correctos: 0, total: totalSteps, porcentaje: 0, mensaje: msg };
        if (!silencioso) {
          mostrarResultadoVerificacion(res.correctos, res.total, res.porcentaje, [], res.mensaje);
        }
        return res;
      }

      // 2. Construir grafo de conexiones del estudiante
      var adj = {};
      function addEdge(u, v) {
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
      }

      // Conexiones físicas (cables del alumno)
      studentState.wires.forEach(function(w) {
        if (w.start && w.end && w.start.componentId && w.end.componentId) {
          var u = w.start.componentId + "::" + w.start.pinName;
          var v = w.end.componentId + "::" + w.end.pinName;
          addEdge(u, v);
        }
      });

      // Conexiones internas de protoboards
      studentState.components.forEach(function(c) {
        if (c.type && c.type.indexOf('breadboard') !== -1) {
          var isHalf = (c.type.indexOf('half') !== -1);
          var maxRows = isHalf ? 30 : 63;
          for (var r = 1; r <= maxRows; r++) {
            var colTop = ['a', 'b', 'c', 'd', 'e'];
            for (var i = 0; i < colTop.length - 1; i++) {
              addEdge(c.id + "::" + colTop[i] + r, c.id + "::" + colTop[i+1] + r);
            }
            var colBottom = ['f', 'g', 'h', 'i', 'j'];
            for (var i = 0; i < colBottom.length - 1; i++) {
              addEdge(c.id + "::" + colBottom[i] + r, c.id + "::" + colBottom[i+1] + r);
            }
          }
          // Conexiones de buses de alimentación (separados en rieles superior "1." e inferior "2.")
          var wiredPins = [];
          for (var pinNode in adj) {
            var parts = pinNode.split('::');
            if (parts[0] === c.id) {
              wiredPins.push(parts[1]);
            }
          }
          var plusWiredTop = wiredPins.filter(function(p) { return (p.indexOf('plus') !== -1 || p.indexOf('vcc') !== -1 || p.indexOf('PWR') !== -1) && p.indexOf('2.') === -1; });
          for (var i = 0; i < plusWiredTop.length - 1; i++) {
            addEdge(c.id + "::" + plusWiredTop[i], c.id + "::" + plusWiredTop[i+1]);
          }
          var plusWiredBottom = wiredPins.filter(function(p) { return (p.indexOf('plus') !== -1 || p.indexOf('vcc') !== -1 || p.indexOf('PWR') !== -1) && p.indexOf('1.') === -1; });
          for (var i = 0; i < plusWiredBottom.length - 1; i++) {
            addEdge(c.id + "::" + plusWiredBottom[i], c.id + "::" + plusWiredBottom[i+1]);
          }
          var minusWiredTop = wiredPins.filter(function(p) { return (p.indexOf('minus') !== -1 || p.indexOf('gnd') !== -1 || p.indexOf('GND') !== -1) && p.indexOf('2.') === -1; });
          for (var i = 0; i < minusWiredTop.length - 1; i++) {
            addEdge(c.id + "::" + minusWiredTop[i], c.id + "::" + minusWiredTop[i+1]);
          }
          var minusWiredBottom = wiredPins.filter(function(p) { return (p.indexOf('minus') !== -1 || p.indexOf('gnd') !== -1 || p.indexOf('GND') !== -1) && p.indexOf('1.') === -1; });
          for (var i = 0; i < minusWiredBottom.length - 1; i++) {
            addEdge(c.id + "::" + minusWiredBottom[i], c.id + "::" + minusWiredBottom[i+1]);
          }
        }
      });

      // BFS para etiquetar redes conductoras
      var visited = {};
      var pinToNetId = {};
      var netCounter = 0;

      function bfs(startNode, netId) {
        var queue = [startNode];
        visited[startNode] = true;
        pinToNetId[startNode] = netId;

        while (queue.length > 0) {
          var curr = queue.shift();
          var neighbors = adj[curr] || [];
          neighbors.forEach(function(neighbor) {
            if (!visited[neighbor]) {
              visited[neighbor] = true;
              pinToNetId[neighbor] = netId;
              queue.push(neighbor);
            }
          });
        }
      }

      for (var node in adj) {
        if (!visited[node]) {
          bfs(node, netCounter++);
        }
      }

      // 3. Generar emparejamientos permutacionales de componentes por tipo
      var solCompsByType = {};
      ejercicio.circuitoSolucion.components.forEach(function(c) {
        if (!solCompsByType[c.type]) solCompsByType[c.type] = [];
        solCompsByType[c.type].push(c.id);
      });

      var studCompsByType = {};
      studentState.components.forEach(function(c) {
        if (!studCompsByType[c.type]) studCompsByType[c.type] = [];
        studCompsByType[c.type].push(c.id);
      });

      function permute(arr) {
        if (arr.length <= 1) return [arr];
        var result = [];
        for (var i = 0; i < arr.length; i++) {
          var current = arr[i];
          var remaining = arr.slice(0, i).concat(arr.slice(i + 1));
          var remainingPerms = permute(remaining);
          for (var j = 0; j < remainingPerms.length; j++) {
            result.push([current].concat(remainingPerms[j]));
          }
        }
        return result;
      }

      var solBoardId = null;
      if (ejercicio.circuitoSolucion.boards && ejercicio.circuitoSolucion.boards[0]) {
        solBoardId = ejercicio.circuitoSolucion.boards[0].id;
      } else if (ejercicio.circuitoSolucion.activeBoardId) {
        solBoardId = ejercicio.circuitoSolucion.activeBoardId;
      }
      
      var studBoardId = null;
      if (studentState.boards && studentState.boards[0]) {
        studBoardId = studentState.boards[0].id;
      } else if (studentState.activeBoardId) {
        studBoardId = studentState.activeBoardId;
      }

      var types = Object.keys(solCompsByType);
      var mappings = [{}];
      if (solBoardId && studBoardId) {
        var baseMap = {};
        baseMap[solBoardId] = studBoardId;
        mappings = [baseMap];
      }

      types.forEach(function(type) {
        var solIds = solCompsByType[type];
        var studIds = studCompsByType[type] || [];
        var perms = permute(studIds);

        var nextMappings = [];
        mappings.forEach(function(existingMap) {
          perms.forEach(function(perm) {
            var newMap = Object.assign({}, existingMap);
            solIds.forEach(function(solId, index) {
              if (index < perm.length) {
                newMap[solId] = perm[index];
              }
            });
            nextMappings.push(newMap);
          });
        });
        mappings = nextMappings;
      });

      // 4. Evaluar la satisfacción de conexiones para cada mapeo
      var bestScore = 0;
      var bestMapping = null;

      mappings.forEach(function(M) {
        var score = 0;
        ejercicio.circuitoSolucion.wires.forEach(function(w) {
          if (w.start && w.end) {
            var solStartComp = w.start.componentId;
            var solStartPin = w.start.pinName;
            var solEndComp = w.end.componentId;
            var solEndPin = w.end.pinName;

            var studStartComp = M[solStartComp];
            var studEndComp = M[solEndComp];

            if (studStartComp && studEndComp) {
              var u = studStartComp + "::" + solStartPin;
              var v = studEndComp + "::" + solEndPin;

              if (pinToNetId[u] !== undefined && pinToNetId[v] !== undefined && pinToNetId[u] === pinToNetId[v]) {
                score++;
              }
            }
          }
        });
        if (score > bestScore) {
          bestScore = score;
          bestMapping = M;
        }
      });

      // 5. Devolver resultado final de verificación
      var correctos = bestScore + 1; // +1 por tener todos los componentes requeridos
      var porcentaje = Math.round((correctos / totalSteps) * 100);
      var esCorrecto = (porcentaje === 100);
      
      var msg = esCorrecto ? '¡Excelente! Circuito armado correctamente.' :
                'Componentes correctos, pero fallan conexiones. Conexiones correctas: ' + bestScore + ' de ' + totalWires + '.';

      var res = { correctos: correctos, total: totalSteps, porcentaje: porcentaje, mensaje: msg };
      if (!silencioso) {
        mostrarResultadoVerificacion(res.correctos, res.total, res.porcentaje, [], res.mensaje);
      }
      return res;

    } catch (e) {
      console.error('Error al verificar circuito:', e);
      return { correctos: 0, total: 1, porcentaje: 0, mensaje: 'Error al verificar circuito: ' + e.message };
    }
  };

  // Verificar respuesta de bloques - NUEVA VERSIÓN
  window.verificarRespuestaBloques = function(ejercicio, silencioso) {
    var workspace = window._previewWorkspace;
    
    if (ejercicio && ejercicio.tipo === 'bloques_corregir') {
      if (!workspace) {
        return { correctos: 0, total: 0, porcentaje: 0, mensaje: 'Workspace no inicializado' };
      }
      
      var correctErrorIndices = window._correctErrorIndices || [];
      if (correctErrorIndices.length === 0) {
        return { correctos: 0, total: 0, porcentaje: 0, mensaje: 'No se configuró ningún bloque con error por el docente' };
      }
      
      var selectedCulpritIndex = window._selectedCulpritIndex;
      var correcto = false;
      
      console.log('[STBLOCK-DEBUG-CORREGIR] --- VERIFICACIÓN DE ERROR ---');
      console.log('[STBLOCK-DEBUG-CORREGIR] Índice Seleccionado por Alumno:', selectedCulpritIndex);
      console.log('[STBLOCK-DEBUG-CORREGIR] Índices con Error Esperados:', correctErrorIndices);
      
      if (selectedCulpritIndex !== undefined && selectedCulpritIndex !== null && correctErrorIndices.indexOf(selectedCulpritIndex) !== -1) {
        correcto = true;
      }
      console.log('[STBLOCK-DEBUG-CORREGIR] ¿Es correcta la selección?:', correcto);
      
      // Limpiar estilos anteriores
      workspace.getAllBlocks(false).forEach(function(b) {
        var svg = b.getSvgRoot ? b.getSvgRoot() : null;
        if (svg) {
          svg.classList.remove('bloque-seleccionado-culpable');
          svg.classList.remove('bloque-correcto-culpable');
          svg.classList.remove('bloque-incorrecto-culpable');
        }
      });

      var previewBlocks = workspace.getAllBlocks(false);
      if (correcto) {
        var b = previewBlocks[selectedCulpritIndex];
        if (b) {
          var svg = b.getSvgRoot ? b.getSvgRoot() : null;
          if (svg) {
            svg.classList.add('bloque-correcto-culpable');
          }
        }
      } else {
        if (selectedCulpritIndex !== undefined && selectedCulpritIndex !== null) {
          var b = previewBlocks[selectedCulpritIndex];
          if (b) {
            var svg = b.getSvgRoot ? b.getSvgRoot() : null;
            if (svg) {
              svg.classList.add('bloque-incorrecto-culpable');
            }
          }
        }
      }

      var correctos = correcto ? 1 : 0;
      var total = 1;
      var porcentaje = correcto ? 100 : 0;
      
      var detalles = [{
        bloque: (selectedCulpritIndex !== undefined && selectedCulpritIndex !== null && previewBlocks[selectedCulpritIndex]) ? previewBlocks[selectedCulpritIndex].type : 'Ninguno',
        correcto: correcto
      }];

      if (!silencioso) {
        mostrarResultadoVerificacion(correctos, total, porcentaje, detalles);
      }

      return {
        correctos: correctos,
        total: total,
        porcentaje: porcentaje,
        detalles: detalles
      };
    }
    
    if (ejercicio && ejercicio.tipo === 'bloques_armar') {
      var solutionStructures = window._solutionStructures || [];
      if (!workspace || solutionStructures.length === 0) {
        return { correctos: 0, total: 0, porcentaje: 0, mensaje: 'No hay solución de bloques guardada' };
      }
      
      var studentBlocks = workspace.getTopBlocks(true);
      var studentStructures = [];
      studentBlocks.forEach(function(b) {
        if (b.isShadow && b.isShadow()) return;
        studentStructures.push({
          blockId: b.id,
          structure: obtenerEstructuraCompacta(b)
        });
      });

      var total = solutionStructures.length;
      var correctos = 0;
      var detalles = [];
      
      // Limpiar estilos de borde previos de todos los bloques
      workspace.getAllBlocks(false).forEach(function(b) {
        var svg = b.getSvgRoot ? b.getSvgRoot() : null;
        if (svg) {
          var path = svg.querySelector('.blocklyPath');
          if (path) {
            path.style.stroke = '';
            path.style.strokeWidth = '';
          }
        }
      });

      // Comparar estructuras
      solutionStructures.forEach(function(solStruct) {
        var foundIndex = -1;
        for (var i = 0; i < studentStructures.length; i++) {
          if (sonEstructurasIguales(solStruct, studentStructures[i].structure)) {
            foundIndex = i;
            break;
          }
        }

        if (foundIndex !== -1) {
          correctos++;
          var matchedBlockId = studentStructures[foundIndex].blockId;
          var matchedBlock = workspace.getBlockById(matchedBlockId);
          if (matchedBlock) {
            matchedBlock.getDescendants(false).forEach(function(child) {
              var svg = child.getSvgRoot ? child.getSvgRoot() : null;
              if (svg) {
                var path = svg.querySelector('.blocklyPath');
                if (path) {
                  path.style.stroke = '#10b981';
                  path.style.strokeWidth = '4px';
                }
              }
            });
          }
          studentStructures.splice(foundIndex, 1);
          detalles.push({
            bloque: solStruct.type,
            correcto: true
          });
        } else {
          detalles.push({
            bloque: solStruct.type,
            correcto: false
          });
        }
      });

      // Los bloques sobrantes del alumno que no emparejaron se marcan en rojo
      studentStructures.forEach(function(item) {
        var wrongBlock = workspace.getBlockById(item.blockId);
        if (wrongBlock) {
          wrongBlock.getDescendants(false).forEach(function(child) {
            var svg = child.getSvgRoot ? child.getSvgRoot() : null;
            if (svg) {
              var path = svg.querySelector('.blocklyPath');
              if (path) {
                path.style.stroke = '#ef4444';
                path.style.strokeWidth = '4px';
              }
            }
          });
        }
      });

      var porcentaje = total > 0 ? Math.round((correctos / total) * 100) : 0;

      // Si hay bloques sobrantes incorrectos en el lienzo, penalizar porcentaje
      if (studentStructures.length > 0 && porcentaje === 100) {
        porcentaje = 90; // Penalización por dejar basura
      }

      if (!silencioso) {
        mostrarResultadoVerificacion(correctos, total, porcentaje, detalles);
      }

      return {
        correctos: correctos,
        total: total,
        porcentaje: porcentaje,
        detalles: detalles
      };
    }
    
    if (ejercicio && ejercicio.tipo === 'bloques_ordenar') {
      var correctConnections = window._correctConnections || [];
      if (!workspace || correctConnections.length === 0) {
        return { correctos: 0, total: 0, porcentaje: 0, mensaje: 'No hay bloques para verificar' };
      }
      
      var total = correctConnections.length;
      var correctos = 0;
      var detalles = [];

      correctConnections.forEach(function(item) {
        var b = workspace.getBlockById(item.blockId);
        var correcto = false;
        var actualParent = b ? b.getParent() : null;

        if (b) {
          if (item.isRoot) {
            correcto = !actualParent;
          } else {
            correcto = (actualParent && actualParent.id === item.parentId);
          }
        }

        console.log('[STBLOCK-SNAP] Verificando bloque:', item.type, 'ID:', item.blockId,
                    'Esperado Padre:', item.parentId, 'Actual Padre:', actualParent ? actualParent.id : 'NINGUNO',
                    'Es Raíz Esperada:', item.isRoot, 'Es Raíz Actual:', !actualParent,
                    'Resultado:', correcto ? '✓ CORRECTO' : '✗ INCORRECTO');

        if (correcto) {
          correctos++;
          if (b) {
            var svg = b.getSvgRoot ? b.getSvgRoot() : null;
            if (svg) {
              var path = svg.querySelector('.blocklyPath');
              if (path) {
                path.style.stroke = '#10b981';
                path.style.strokeWidth = '4px';
              }
            }
          }
        } else {
          if (b) {
            var svg = b.getSvgRoot ? b.getSvgRoot() : null;
            if (svg) {
              var path = svg.querySelector('.blocklyPath');
              if (path) {
                path.style.stroke = '#ef4444';
                path.style.strokeWidth = '4px';
              }
            }
          }
        }

        detalles.push({
          bloque: b ? b.type : item.type,
          correcto: correcto
        });
      });

      var porcentaje = total > 0 ? Math.round((correctos / total) * 100) : 0;
      
      if (!silencioso) {
        mostrarResultadoVerificacion(correctos, total, porcentaje, detalles);
      }

      return {
        correctos: correctos,
        total: total,
        porcentaje: porcentaje,
        detalles: detalles
      };
    }

    var expectedBlocks = window._expectedBlocks || [];
    var hiddenBlockIds = window._hiddenBlockIds || [];

    if (!workspace || expectedBlocks.length === 0) {
      return { correctos: 0, total: 0, porcentaje: 0, mensaje: 'No hay bloques para verificar' };
    }

    var total = expectedBlocks.length;
    var correctos = 0;
    var detalles = [];

    // Verificar la existencia y el tipo de los bloques encajados en las conexiones correctas
    expectedBlocks.forEach(function(expected, index) {
      var correcto = false;
      var colocadoType = null;
      var connectedBlock = null;

      if (expected.parentId) {
        // El bloque oculto tenía un bloque padre
        var parentBlock = workspace.getBlockById(expected.parentId);
        if (parentBlock) {
          if (expected.parentConnection === 'next') {
            connectedBlock = parentBlock.nextConnection ? parentBlock.nextConnection.targetBlock() : null;
          } else if (expected.parentConnection === 'input' && expected.inputName) {
            var input = parentBlock.getInput(expected.inputName);
            connectedBlock = (input && input.connection) ? input.connection.targetBlock() : null;
          }

          if (connectedBlock) {
            colocadoType = connectedBlock.type;
            if (connectedBlock.type === expected.type) {
              correcto = true;
            }
          }
        }
      } else {
        // El bloque oculto era un bloque independiente
        var currentBlocks = workspace.getAllBlocks(false);
        var matchingBlock = currentBlocks.find(function(b) {
          if (b.type !== expected.type) return false;
          if (b.getParent()) return false; // Debe ser independiente también
          
          var pos = b.getRelativeToSurfaceXY();
          var dist = Math.sqrt(Math.pow(pos.x - expected.position.x, 2) + Math.pow(pos.y - expected.position.y, 2));
          return dist < 50; // Tolerancia de 50px
        });

        if (matchingBlock) {
          correcto = true;
          colocadoType = expected.type;
          connectedBlock = matchingBlock;
        }
      }

      // Aplicar resaltado al bloque colocado (si no es el bloque_hueco)
      if (connectedBlock && connectedBlock.type !== 'bloque_hueco') {
        var svg = connectedBlock.getSvgRoot ? connectedBlock.getSvgRoot() : null;
        if (svg) {
          var path = svg.querySelector('.blocklyPath');
          if (path) {
            if (correcto) {
              path.style.stroke = '#10b981';
              path.style.strokeWidth = '4px';
            } else {
              path.style.stroke = '#ef4444';
              path.style.strokeWidth = '4px';
            }
          }
        }
      }

      var vacio = (colocadoType === null || colocadoType === 'bloque_hueco');
      if (correcto) {
        correctos++;
        detalles.push({
          hueco: index + 1,
          esperado: expected.type,
          colocado: colocadoType,
          correcto: true
        });
        marcarHuecoResultado(index, true, false);
      } else {
        detalles.push({
          hueco: index + 1,
          esperado: expected.type,
          colocado: colocadoType || 'ninguno',
          correcto: false
        });
        marcarHuecoResultado(index, false, vacio);
      }
    });

    var porcentaje = total > 0 ? Math.round((correctos / total) * 100) : 0;

    // Mostrar resultado visual
    if (!silencioso) {
      mostrarResultadoVerificacion(correctos, total, porcentaje, detalles);
    }

    return {
      correctos: correctos,
      total: total,
      porcentaje: porcentaje,
      detalles: detalles
    };
  };

  // Mostrar resultado de verificación
  function mostrarResultadoVerificacion(correctos, total, porcentaje, detalles, customMessage) {
    // Buscar o crear contenedor de resultado
    var existingResult = document.getElementById('verificacionResultado');
    if (existingResult) existingResult.remove();

    var container = document.getElementById('workspacePreviewArea');
    if (!container) return;

    var resultDiv = document.createElement('div');
    resultDiv.id = 'verificacionResultado';

    var bgColor = porcentaje === 100 ? '#10b981' : (porcentaje >= 50 ? '#f59e0b' : '#ef4444');
    var icon = porcentaje === 100 ? '✓' : (porcentaje >= 50 ? '◐' : '✗');

    resultDiv.style.cssText = 'padding: 16px 20px; background: ' + bgColor + '; color: white; display: flex; justify-content: space-between; align-items: center;';

    var mensaje = customMessage || (porcentaje === 100 ? '¡Perfecto! Todos los bloques correctos' :
                  (porcentaje >= 50 ? 'Buen intento, pero faltan algunos bloques' : 'Revisa tu respuesta'));

    resultDiv.innerHTML = '<div><span style="font-size: 24px; margin-right: 12px;">' + icon + '</span><strong>' + mensaje + '</strong></div>' +
      '<div style="text-align: right;"><div style="font-size: 24px; font-weight: bold;">' + correctos + '/' + total + '</div><div style="font-size: 12px; opacity: 0.9;">' + porcentaje + '% correcto</div></div>';

    container.insertBefore(resultDiv, container.firstChild.nextSibling);

    // Resaltar marcadores de lienzo según resultado
    var canvasMarkers = document.querySelectorAll('.hueco-marker');
    canvasMarkers.forEach(function(marker, idx) {
      var rect = marker.querySelector('rect');
      var text = marker.querySelector('text');
      var detalle = detalles[idx];
      if (detalle && detalle.correcto) {
        rect.setAttribute('fill', 'rgba(16, 185, 129, 0.3)');
        rect.setAttribute('stroke', '#10b981');
        text.setAttribute('fill', '#10b981');
        text.textContent = '✓ CORRECTO';
      } else {
        var esVacio = (!detalle || detalle.colocado === 'ninguno');
        if (esVacio) {
          rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
          rect.setAttribute('stroke', '#ef4444');
          text.setAttribute('fill', '#ef4444');
          text.textContent = '✗ MAL: VACÍO';
        } else {
          rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
          rect.setAttribute('stroke', '#ef4444');
          text.setAttribute('fill', '#ef4444');
          text.textContent = '✗ MAL: ' + (detalle.colocado.split('_').slice(-1)[0]);
        }
      }
    });
  }

  // Marcar un hueco individual como correcto, incorrecto o vacío (basado en su index)
  function marcarHuecoResultado(index, correcto, vacio) {
    var marker = document.querySelector('.hueco-marker[data-index="' + index + '"]');
    if (marker) {
      var rect = marker.querySelector('rect');
      var text = marker.querySelector('text');
      if (vacio) {
        rect.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
        rect.setAttribute('stroke', '#f59e0b');
        text.setAttribute('fill', '#f59e0b');
        text.textContent = '¿? HUECO #' + (index + 1);
      } else if (correcto) {
        rect.setAttribute('fill', 'rgba(16, 185, 129, 0.3)');
        rect.setAttribute('stroke', '#10b981');
        text.setAttribute('fill', '#10b981');
        text.textContent = '✓ CORRECTO';
      } else {
        rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
        rect.setAttribute('stroke', '#ef4444');
        text.setAttribute('fill', '#ef4444');
        text.textContent = '✗ INCORRECTO';
      }
    }
  }

  // Función antigua para compatibilidad
  window.verificarRespuestaBloquesLegacy = function(ejercicio) {
    var huecos = document.querySelectorAll('.bloque-hueco');
    var correctos = 0;
    var total = huecos.length;

    huecos.forEach(function(hueco) {
      var filledType = hueco.getAttribute('data-filled-type');
      var expectedType = hueco.getAttribute('data-expected-type');

      if (filledType === expectedType) {
        correctos++;
        hueco.style.boxShadow = '0 0 0 3px #10b981';
      } else if (filledType) {
        hueco.style.boxShadow = '0 0 0 3px #ef4444';
      }
    });

    return {
      correctos: correctos,
      total: total,
      porcentaje: total > 0 ? Math.round((correctos / total) * 100) : 0
    };
  };

  function getBloquesPorCategoriasPreview(categorias) {
    var bloques = [];
    var bloquesPorCategoria = {
      motion: [
        { type: 'motion_movesteps', text: 'mover _ pasos', color: '#4C97FF' },
        { type: 'motion_turnright', text: 'girar ↻ grados', color: '#4C97FF' },
        { type: 'motion_turnleft', text: 'girar ↺ grados', color: '#4C97FF' },
        { type: 'motion_gotoxy', text: 'ir a x: y:', color: '#4C97FF' },
        { type: 'motion_changexby', text: 'cambiar x por', color: '#4C97FF' },
        { type: 'motion_changeyby', text: 'cambiar y por', color: '#4C97FF' }
      ],
      looks: [
        { type: 'looks_say', text: 'decir', color: '#9966FF' },
        { type: 'looks_sayforsecs', text: 'decir _ por _ seg', color: '#9966FF' },
        { type: 'looks_show', text: 'mostrar', color: '#9966FF' },
        { type: 'looks_hide', text: 'esconder', color: '#9966FF' },
        { type: 'looks_changesizeby', text: 'cambiar tamaño por', color: '#9966FF' }
      ],
      events: [
        { type: 'event_whenflagclicked', text: '🚩 al hacer clic', color: '#FFBF00' },
        { type: 'event_whenkeypressed', text: 'al presionar tecla', color: '#FFBF00' },
        { type: 'event_whenthisspriteclicked', text: 'al hacer clic en este', color: '#FFBF00' }
      ],
      control: [
        { type: 'control_wait', text: 'esperar _ seg', color: '#FFAB19' },
        { type: 'control_repeat', text: 'repetir _', color: '#FFAB19' },
        { type: 'control_forever', text: 'por siempre', color: '#FFAB19' },
        { type: 'control_if', text: 'si _ entonces', color: '#FFAB19' },
        { type: 'control_if_else', text: 'si _ si no', color: '#FFAB19' }
      ],
      sensing: [
        { type: 'sensing_touchingobject', text: '¿tocando?', color: '#5CB1D6' },
        { type: 'sensing_keypressed', text: '¿tecla presionada?', color: '#5CB1D6' },
        { type: 'sensing_mousedown', text: '¿ratón presionado?', color: '#5CB1D6' }
      ],
      operators: [
        { type: 'operator_add', text: '_ + _', color: '#59C059' },
        { type: 'operator_subtract', text: '_ - _', color: '#59C059' },
        { type: 'operator_multiply', text: '_ × _', color: '#59C059' },
        { type: 'operator_equals', text: '_ = _', color: '#59C059' },
        { type: 'operator_gt', text: '_ > _', color: '#59C059' },
        { type: 'operator_lt', text: '_ < _', color: '#59C059' }
      ],
      sound: [
        { type: 'sound_play', text: 'tocar sonido', color: '#CF63CF' },
        { type: 'sound_playuntildone', text: 'tocar hasta terminar', color: '#CF63CF' }
      ],
      variables: [
        { type: 'data_setvariableto', text: 'fijar variable a', color: '#FF8C1A' },
        { type: 'data_changevariableby', text: 'cambiar variable por', color: '#FF8C1A' }
      ]
    };

    categorias.forEach(function(cat) {
      if (bloquesPorCategoria[cat]) {
        bloques = bloques.concat(bloquesPorCategoria[cat]);
      }
    });

    return bloques;
  }

  // Reemplazar selectEjercicio para actualizar panel de bloques
  if (typeof selectEjercicio !== 'undefined') {
    var _origSelect = selectEjercicio;
    selectEjercicio = function(id) {
      _origSelect(id);
      var ej = getSelectedEjercicio ? getSelectedEjercicio() : null;
      showBloquesEditor(ej);
    };
  }

  // Inicializar cuando se carga
  setTimeout(function() {
    initBloquesEditor();
  }, 500);

}());
