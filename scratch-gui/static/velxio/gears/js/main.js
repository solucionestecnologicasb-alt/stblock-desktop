var main = new function() {
  var self = this;

  // Código C++ recibido de STBlock
  this.stblockCode = null;
  this.stblockBoardType = null;

  // Run on page load
  this.init = function() {
    self.$navs = $('nav li');
    self.$panelControls = $('.panelControlsArea .panelControls');
    self.$panels = $('.panels .panel');
    self.$fileMenu = $('.fileMenu');
    self.$pythonMenu = $('.pythonMenu');
    self.$robotMenu = $('.robotMenu');
    self.$worldsMenu = $('.worldsMenu');
    self.$helpMenu = $('.helpMenu');
    self.$projectName = $('#projectName');
    self.$languageMenu = $('.language');
    self.$newsButton = $('.news');

    self.updateTextLanguage();

    self.$navs.click(self.tabClicked);
    self.$fileMenu.click(self.toggleFileMenu);
    self.$pythonMenu.click(self.togglePythonMenu);
    self.$robotMenu.click(self.toggleRobotMenu);
    self.$worldsMenu.click(self.toggleWorldsMenu);
    self.$helpMenu.click(self.toggleHelpMenu);
    self.$languageMenu.click(self.toggleLanguageMenu);
    self.$newsButton.remove();

    self.$projectName.change(self.saveProjectName);

    window.addEventListener('beforeunload', self.checkUnsaved);
    blocklyPanel.onActive();
    self.loadProjectName();

    // Escuchar mensajes de STBlock
    self.initSTBlockListener();
  };

  // Inicializar listener para recibir código de STBlock
  this.initSTBlockListener = function() {
    window.addEventListener('message', function(event) {
      if (!event.data || typeof event.data !== 'object') return;

      // Recibir código C++ de STBlock (actualización)
      if (event.data.type === 'stblock-update-code') {
        console.log('[GearsBot] Código actualizado desde STBlock:', event.data.language);
        self.stblockCode = event.data.code;

        // Actualizar boardType si cambió
        var newBoardType = event.data.boardType;
        if (newBoardType && newBoardType !== self.stblockBoardType) {
          self.stblockBoardType = newBoardType;
          console.log('[GearsBot] Tarjeta cambiada a:', newBoardType);

          // Actualizar robot.options.boardType para que simPanel lo use
          if (robot && robot.options) {
            robot.options.boardType = newBoardType;
          }

          // Reiniciar configuración del panel de sensores
          if (typeof simPanel !== 'undefined' && simPanel.pinConfiguration) {
            simPanel.pinConfiguration = null;
            simPanel.initSensorsPanelV2();
          }
        } else if (newBoardType) {
          self.stblockBoardType = newBoardType;
        }

        // Guardar en filesManager para que simPanel lo use
        if (event.data.code) {
          filesManager.files['stblock.cpp'] = event.data.code;
          console.log('[GearsBot] Código C++ guardado (' + event.data.code.length + ' chars)');
        }
      }

      // Ejecutar código desde STBlock (cuando se presiona play en STBlock)
      if (event.data.type === 'stblock-execute') {
        console.log('[GearsBot] Comando EJECUTAR recibido de STBlock');
        self.stblockCode = event.data.code;

        // Actualizar boardType
        var newBoardType = event.data.boardType;
        if (newBoardType) {
          self.stblockBoardType = newBoardType;
          if (robot && robot.options) {
            robot.options.boardType = newBoardType;
          }
        }

        if (event.data.code) {
          filesManager.files['stblock.cpp'] = event.data.code;
          console.log('[GearsBot] Código C++ guardado y ejecutando... (tarjeta: ' + self.stblockBoardType + ')');

          // Ejecutar simulación
          setTimeout(function() {
            simPanel.runSim();
          }, 100);
        }
      }

      // Detener simulación desde STBlock
      if (event.data.type === 'stblock-stop') {
        console.log('[GearsBot] Comando DETENER recibido de STBlock');
        simPanel.stopSim();
      }

      // Resetear simulación desde STBlock
      if (event.data.type === 'stblock-reset') {
        console.log('[GearsBot] Comando RESET recibido de STBlock');
        simPanel.resetSim();
      }
    });

    // Notificar a STBlock que GearsBot está listo
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'gearbot-ready' }, '*');
      console.log('[GearsBot] Notificado a STBlock que está listo');
    }

    console.log('[GearsBot] STBlock listener inicializado');
  };

  // Update text already in html
  this.updateTextLanguage = function() {
    $('#navBlocks').text(i18n.get('#main-blocks#'));
    $('#navSim').text(i18n.get('#main-sim#'));
    self.$fileMenu.text(i18n.get('#main-file#'));
    self.$robotMenu.text(i18n.get('#main-robot#'));
    self.$worldsMenu.text(i18n.get('#main-worlds#'));
    self.$helpMenu.text(i18n.get('#main-help#'));
    $('#blocklyPages').text(i18n.get('#main-main#'));

  };

  // Toggle language menu
  this.toggleLanguageMenu = function(e) {
    if ($('.languageMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      function setLang(lang) {
        localStorage.setItem('LANG', lang);
        window.location.reload();
      }

      let menuItems = [
        {html: 'Deutsch', line: false, callback: function() { setLang('de'); }},
        {html: 'Ελληνικά', line: false, callback: function() { setLang('el'); }},
        {html: 'English', line: false, callback: function() { setLang('en'); }},
        {html: 'Español', line: false, callback: function() { setLang('es'); }},
        {html: 'Français', line: false, callback: function() { setLang('fr'); }},
        {html: '한국어', line: false, callback: function() { setLang('ko'); }},
        {html: 'עברית', line: false, callback: function() { setLang('he'); }},
        {html: 'Nederlands', line: false, callback: function() { setLang('nl'); }},
        {html: 'Português', line: false, callback: function() { setLang('pt'); }},
        {html: 'tlhIngan', line: false, callback: function() { setLang('tlh'); }},
        {html: 'Русский', line: false, callback: function() { setLang('ru'); }},
        {html: 'Magyar', line: false, callback: function() { setLang('hu'); }},
        {html: 'Italiano', line: false, callback: function() { setLang('it'); }},
      ];

      menuDropDown(self.$languageMenu, menuItems, {className: 'languageMenuDropDown', align: 'right'});
    }
  };

  // Open a window with a link to the arena page
  this.arenaWindow = function() {
    let options = {
      title: i18n.get('#main-arenaTitle#'),
      message: i18n.get('#main-arenaDescription#'),
      confirm: i18n.get('#main-arenaGo#')
    };
    confirmDialog(options, function(){
      self.openPage('arena.html');
    });
  };

  // Load project name from local storage
  this.loadProjectName = function() {
    self.$projectName.val(localStorage.getItem('projectName'));
  };

  // Remove problematic characters then save project name
  this.saveProjectName = function() {
    let filtered = self.$projectName.val().replace(/[^0-9a-zA-Z_\- ]/g, '').trim();
    self.$projectName.val(filtered);
    localStorage.setItem('projectName', filtered);
  };

  // Save robot to json file
  this.saveRobot = function() {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:application/json;charset=UTF-8,' + encodeURIComponent(JSON.stringify(robot.options, null, 2));
    hiddenElement.target = '_blank';
    hiddenElement.download = robot.options.name + 'Robot.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  };

  function translateCustomRobot(data) {
    let translated = {
      name: data.name || 'customRobot',
      bodyWidth: (data.chassis && data.chassis.size) ? data.chassis.size[0] : 14,
      bodyLength: (data.chassis && data.chassis.size) ? data.chassis.size[1] : 16,
      bodyHeight: (data.chassis && data.chassis.size) ? data.chassis.size[2] : 4,
      bodyMass: (data.chassis && data.chassis.mass) ? data.chassis.mass : 1000,
      bodyFriction: (data.chassis && data.chassis.friction) ? data.chassis.friction : 0.5,
      color: (data.chassis && data.chassis.color) ? data.chassis.color : '#F09C0D',
      
      boardType: data.boardType || 'stbBoardV2',
      chassis: {
        driftEnabled: (data.chassis && data.chassis.driftEnabled) || false,
        driftLeft: (data.chassis && typeof data.chassis.driftLeft !== 'undefined') ? data.chassis.driftLeft : 10
      },
      
      wheels: true,
      wheelDiameter: 5.6,
      wheelWidth: 0.8,
      wheelToBodyOffset: 0.2,
      bodyEdgeToWheelCenterY: 1,
      bodyEdgeToWheelCenterZ: 2,
      wheelMass: 200,
      casterMass: 0,
      caster: true,
      wheelFriction: 10,
      casterFriction: 0,
      
      imageType: (data.chassisType === 'custom' && data.chassis && data.chassis.modelURL) ? 'customModel' : 'all',
      imageURL: (data.chassis && data.chassis.modelURL) ? data.chassis.modelURL : '',
      modelScale: (data.chassis && data.chassis.modelScale) ? data.chassis.modelScale : 1.0,
      
      components: []
    };

    if (data.wheels) {
      translated.wheelsConfig = data.wheels.map(w => ({
        id: w.id,
        port: w.port,
        radius: w.radius || 2.8,
        width: w.width || 0.8,
        position: w.position || [0, 0, 0],
        arduinoDir1: w.arduinoDir1,
        arduinoDir2: w.arduinoDir2,
        arduinoPWM: w.arduinoPWM
      }));
    }

    if (data.wheels && data.wheels.length >= 2) {
      let leftW = data.wheels[0];
      let rightW = data.wheels[1];
      
      translated.wheelDiameter = (leftW.radius || 2.8) * 2;
      translated.wheelWidth = leftW.width || 0.8;
      translated.wheelLeftPort = leftW.port || 'outA';
      translated.wheelRightPort = rightW.port || 'outB';
      
      if (leftW.arduinoDir1) {
        translated.wheelLeftArduino = {
          dir1: leftW.arduinoDir1,
          dir2: leftW.arduinoDir2,
          pwm: leftW.arduinoPWM
        };
      }
      if (rightW.arduinoDir1) {
        translated.wheelRightArduino = {
          dir1: rightW.arduinoDir1,
          dir2: rightW.arduinoDir2,
          pwm: rightW.arduinoPWM
        };
      }
      
      let wX = Math.abs(leftW.position[0]);
      let wY = leftW.position[1];
      let wZ = leftW.position[2];
      
      translated.wheelToBodyOffset = wX - (translated.wheelWidth + translated.bodyWidth) / 2;
      translated.bodyEdgeToWheelCenterY = wY + (translated.bodyHeight / 2);
      translated.bodyEdgeToWheelCenterZ = (translated.bodyLength / 2) - wZ;
    }

    translated.allComponents = data.components || [];

    if (data.components) {
      // Determine active component IDs (active parent rule)
      let activeIds = new Set();
      let changed = true;
      while (changed) {
        changed = false;
        data.components.forEach(comp => {
          if (comp.defaultActive !== false && !activeIds.has(comp.id)) {
            let parentId = comp.parentId;
            if (!parentId || parentId === 'chassis') {
              activeIds.add(comp.id);
              changed = true;
            } else if (activeIds.has(parentId)) {
              activeIds.add(comp.id);
              changed = true;
            }
          }
        });
      }

      let rootComponents = [];
      let compMap = {};
      
      // First pass: translate each active component individually
      data.components.forEach(comp => {
        if (!activeIds.has(comp.id)) return;

        let rotRad = comp.rotation ? [
          comp.rotation[0] * Math.PI / 180,
          comp.rotation[1] * Math.PI / 180,
          comp.rotation[2] * Math.PI / 180
        ] : [0, 0, 0];
        
        let compOpt = {};
        if (comp.options) {
          Object.assign(compOpt, comp.options);
        }
        
        if (comp.type === 'ArmActuator' || comp.type === 'SwivelActuator') {
          compOpt.minAngle = (comp.options && typeof comp.options.minAngle !== 'undefined') ? comp.options.minAngle : -5;
          compOpt.maxAngle = (comp.options && typeof comp.options.maxAngle !== 'undefined') ? comp.options.maxAngle : 180;
          compOpt.startAngle = (comp.options && typeof comp.options.startAngle !== 'undefined') ? comp.options.startAngle : 0;
          compOpt.mass = (comp.options && typeof comp.options.mass !== 'undefined') ? comp.options.mass : 100;
          compOpt.models = comp.options ? comp.options.models : null;
        } else if (comp.type === 'LinearActuator') {
          compOpt.min = (comp.options && typeof comp.options.minAngle !== 'undefined') ? comp.options.minAngle : -10;
          compOpt.max = (comp.options && typeof comp.options.maxAngle !== 'undefined') ? comp.options.maxAngle : 10;
          compOpt.startPos = (comp.options && typeof comp.options.startAngle !== 'undefined') ? comp.options.startAngle : 0;
          compOpt.degreesPerCm = 360;
          compOpt.mass = (comp.options && typeof comp.options.mass !== 'undefined') ? comp.options.mass : 100;
        }
        
        let result = {
          type: comp.type,
          position: comp.position || [0, 0, 0],
          rotation: rotRad,
          port: comp.port,
          options: compOpt,
          components: [] // Nesting target
        };

        if (comp.arduinoDir1) {
          result.arduinoDir1 = comp.arduinoDir1;
          result.arduinoDir2 = comp.arduinoDir2;
          result.arduinoPWM = comp.arduinoPWM;
        }
        
        compMap[comp.id] = {
          translated: result,
          parentId: comp.parentId || 'chassis'
        };
      });

      // Second pass: associate child components with their parents, or put them in the root
      Object.keys(compMap).forEach(id => {
        let item = compMap[id];
        if (item.parentId !== 'chassis' && compMap[item.parentId]) {
          compMap[item.parentId].translated.components.push(item.translated);
        } else {
          rootComponents.push(item.translated);
        }
      });

      translated.components = rootComponents;
    }

    return translated;
  }

  // Load robot
  this.loadRobot = function(json) {
    try {
      var data = JSON.parse(json);

      // Check for our custom format
      if (data && data.chassis && data.wheels) {
        data = translateCustomRobot(data);
      }

      // Is it a world file?
      if (typeof data.worldName != 'undefined') {
        showErrorModal(i18n.get('#main-invalid_robot_file_world#'));
        return;
      }

      // Is it a robot file?
      if (typeof data.bodyHeight == 'undefined') {
        showErrorModal(i18n.get('#main-invalid_robot_file_robot#'));
        return;
      }

      robot.options = data;
      let i = robotTemplates.findIndex(r => r.name == robot.options.name);
      if (i == -1) {
        robotTemplates.push({...data});
      } else {
        robotTemplates[i] = {...data};
      }
      babylon.resetScene();
      skulpt.hardInterrupt = true;
      simPanel.setRunIcon('run');
      simPanel.initSensorsPanel();
    } catch (e) {
      showErrorModal(i18n.get('#main-invalid_robot_file_json#'));
    }

  };

  // Load robot from local json file
  this.loadRobotLocal = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/json,.json';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      var reader = new FileReader();
      reader.onload = function() {
        self.loadRobot(this.result);
      };
      reader.readAsText(e.target.files[0]);
    });
  };

  // Load robot from URL
  this.loadRobotURL = function(url) {
    return fetch(url)
      .then(function(response) {
        if (response.ok) {
          return response.text();
        } else {
          toastMsg(i18n.get('#sim-not_found#'));
          return Promise.reject(new Error('invalid_robot'));
        }
      })
      .then(function(response) {
        self.loadRobot(response);
      });
  };

  // About page
  this.openAbout = function() {
    let $body = $(
      '<div class="about">' +
        '<div></div>' +
        '<h3>Credits</h3>' +
        '<p>Created by Cort @ <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<p>This simulator would not have been possible without the great people behind:</p>' +
        '<ul>' +
          '<li><a href="https://www.babylonjs.com/" target="_blank">Babylon.js</a></li>' +
          '<li><a href="https://developers.google.com/blockly" target="_blank">Blockly</a></li>' +
          '<li><a href="https://ace.c9.io/" target="_blank">Ace Editor</a></li>' +
          '<li><a href="https://skulpt.org/" target="_blank">Skulpt</a></li>' +
          '<li><a href="https://github.com/kripken/ammo.js/" target="_blank">Ammo.js</a> (port of <a href="https://pybullet.org/wordpress/" target="_blank">Bullet</a>)</li>' +
        '</ul>' +
        '<p>Contributions from:</p>' +
        '<ul>' +
          '<li>Steven Murray</li>' +
          '<li>humbug99</li>' +
          '<li>Yuvix25</li>' +
        '</ul>' +
        '<p>Translations Contributed By:</p>' +
        '<ul>' +
          '<li>Français: Sébastien CANET &lt;scanet@libreduc.cc&gt;</li>' +
          '<li>Nederlands: Henry Romkes</li>' +
          '<li>Ελληνικά: <a href="https://eduact.org/en" target="_blank">Eduact</a></li>' +
          '<li>Español: edurobotic</li>' +
          '<li>Deutsch: Annette-Gymnasiums-Team (Johanna,Jule,Felix), germanicianus</li>' +
          '<li>עברית: Koby Fruchtnis</li>' +
          '<li>Русский: Pavel Khoroshevich &lt;khoroshevich.pa@gmail.com&gt;</li>' +
          '<li>Magyar: Niethammer Zoltán</li>' +
        '</ul>' +
        '<h3>Contact</h3>' +
        '<p>Please direct all complaints or requests to <a href="mailto:cort@aposteriori.com.sg">Cort</a>.</p>' +
        '<p>If you\'re in the market for STEM training, do consider <a href="https://aposteriori.com.sg" target="_blank">A Posteriori</a>.</p>' +
        '<h3>License</h3>' +
        '<p>GNU General Public License v3.0</p>' +
        '<p>Gears is a Free and Open Source Software</p>' +
      '</div>'
    );

    let $buttons = $(
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog('About', $body, $buttons);

    $buttons.click(function(){
      console.log('f')
      $dialog.close();
    });
  };

  // Open page in new tab
  this.openPage = function(url) {
    window.open(url, '_blank');
  };

  // Toggle help
  this.toggleHelpMenu = function(e) {
    if ($('.helpMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'Wiki', line: false, callback: function() { self.openPage('https://github.com/QuirkyCort/gears/wiki'); }},
        {html: 'Github', line: false, callback: function() { self.openPage('https://github.com/QuirkyCort/gears'); }},
        {html: 'URL Generator', line: false, callback: function() { self.openPage('genURL.html'); }},
        {html: i18n.get('#main-privacy#'), line: false, callback: function() { self.openPage('privacy.html'); }},
        {html: i18n.get('#main-about#'), line: true, callback: self.openAbout },
        {html: i18n.get('#main-display_fps#'), line: false, callback: simPanel.toggleFPS }
      ];
      if (simPanel.showFPS) {
        menuItems[5].html = '<span class="tick">&#x2713;</span> ' + menuItems[5].html;
      }

      menuDropDown(self.$helpMenu, menuItems, {className: 'helpMenuDropDown'});
    }
  };

  // Select robot from templates
  this.selectRobot = function() {
    let $body = $('<div class="selectRobot"></div>');
    let $select = $('<select></select>');
    let $description = $('<div class="description"><img class="thumbnail" width="200" height="200"><div class="text"></div></div>');
    let $configurations = $('<div class="configurations"></div>');

    // Default fallback thumbnail (inline SVG as data URL)
    let defaultThumb = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#1e1b4b" width="200" height="200"/><rect x="50" y="60" width="100" height="60" rx="8" fill="#f09c0d"/><circle cx="70" cy="140" r="20" fill="#333"/><circle cx="130" cy="140" r="20" fill="#333"/><rect x="85" y="45" width="30" height="20" rx="4" fill="#6366f1"/></svg>');

    // Track selection type
    let customRobots = [];

    // Load custom robots from localStorage
    try {
      if (typeof customRobotStorage !== 'undefined') {
        customRobots = customRobotStorage.getAll();
      }
    } catch (e) {
      console.warn('[STBLOCK] No se pudieron cargar robots personalizados:', e);
    }

    function displayRobotDescriptions(robotData, isCustom) {
      let thumbSrc = robotData.thumbnail || defaultThumb;

      if (isCustom) {
        $description.find('.text').html('<p>Robot personalizado creado con el Editor de Robots STBlock</p>');
        $description.find('.thumbnail').attr('src', thumbSrc);
        $configurations.html('<p><strong>Tarjeta:</strong> ' + (robotData.boardType || 'STBoard V2') + '</p>');
      } else {
        $description.find('.text').html(i18n.get(robotData.longDescription));
        $description.find('.thumbnail').attr('src', thumbSrc);
        $configurations.html(i18n.replace(robotData.longerDescription));
      }
    }

    // Add "Create Custom Robot" option
    let $createOption = $('<option></option>');
    $createOption.prop('value', '__create_new__');
    $createOption.text('+ Crear Robot Personalizado');
    $select.append($createOption);

    // Add "Load Custom Robot" option
    let $loadOption = $('<option></option>');
    $loadOption.prop('value', '__load_custom__');
    $loadOption.text('📂 Cargar Robot Personalizado');
    $select.append($loadOption);

    // Add separator
    let $separator = $('<option disabled>──────────────</option>');
    $select.append($separator);

    // Add custom robots from localStorage (Mis Robots guardados)
    if (customRobots.length > 0) {
      let $customHeader = $('<option disabled>── Mis Robots Guardados ──</option>');
      $select.append($customHeader);

      customRobots.forEach(function(customRobot) {
        let $robot = $('<option></option>');
        $robot.prop('value', 'custom:' + customRobot.id);
        $robot.text('🤖 ' + (customRobot.name || 'Robot Personalizado'));
        $select.append($robot);
      });

      let $separator2 = $('<option disabled>──────────────</option>');
      $select.append($separator2);
    }

    // Add template robots
    let $templatesHeader = $('<option disabled>── Robots Predefinidos ──</option>');
    $select.append($templatesHeader);

    robotTemplates.forEach(function(robotTemplate){
      let $robot = $('<option></option>');
      $robot.prop('value', robotTemplate.name);
      $robot.text(i18n.get(robotTemplate.shortDescription));
      if (robotTemplate.name == robot.options.name) {
        $robot.attr('selected', 'selected');
        displayRobotDescriptions(robotTemplate, false);
      }
      $select.append($robot);
    });

    $body.append($select);
    $body.append($description);
    $body.append($configurations);

    // Hidden file input for loading custom robots
    let $fileInput = $('<input type="file" accept=".json" style="display:none;">');
    $body.append($fileInput);

    $select.change(function(){
      let val = $select.val();

      if (val === '__create_new__') {
        $description.find('.text').html('<p>Abre el Editor de Robots para crear un robot personalizado desde cero.</p>');
        $description.find('.thumbnail').attr('src', defaultThumb);
        $configurations.html('<p>Haz clic en <strong>OK</strong> para abrir el editor y seleccionar la tarjeta.</p>');
        return;
      }

      if (val === '__load_custom__') {
        $description.find('.text').html('<p>Carga un robot personalizado desde un archivo JSON exportado.</p>');
        $description.find('.thumbnail').attr('src', defaultThumb);
        $configurations.html('<p>Haz clic en <strong>OK</strong> para seleccionar el archivo.</p>');
        return;
      }

      if (val.startsWith('custom:')) {
        let customId = val.replace('custom:', '');
        let customRobot = customRobots.find(r => r.id === customId);
        if (customRobot) {
          displayRobotDescriptions(customRobot, true);
        }
        return;
      }

      let robotTemplate = robotTemplates.find(robotTemplate => robotTemplate.name == val);
      if (robotTemplate) {
        displayRobotDescriptions(robotTemplate, false);
      }
    });

    // Handle file selection for loading custom robot
    $fileInput.change(function() {
      let file = this.files[0];
      if (file && typeof customRobotStorage !== 'undefined') {
        customRobotStorage.importFromFile(file).then(function(importedRobot) {
          alert('Robot "' + importedRobot.name + '" importado correctamente.');
          // Reload the dialog to show the new robot
          $dialog.close();
          self.selectRobot();
        }).catch(function(err) {
          alert('Error al importar robot: ' + err.message);
        });
      }
    });

    let $buttons = $(
      '<button type="button" class="cancel btn-light">Cancelar</button>' +
      '<button type="button" class="confirm btn-success">Ok</button>'
    );

    let $dialog = dialog(i18n.get('#main-select_robot#'), $body, $buttons);

    $buttons.siblings('.cancel').click(function() { $dialog.close(); });
    $buttons.siblings('.confirm').click(function(){
      let val = $select.val();

      // Create new custom robot - open editor
      if (val === '__create_new__') {
        $dialog.close();
        self.openRobotEditor();
        return;
      }

      // Load custom robot from file
      if (val === '__load_custom__') {
        $fileInput.click();
        return;
      }

      // Load saved custom robot from localStorage
      if (val.startsWith('custom:')) {
        let customId = val.replace('custom:', '');
        let customRobot = customRobots.find(r => r.id === customId);
        if (customRobot && typeof customRobotStorage.toSimulatorFormat === 'function') {
          robot.options = {};
          Object.assign(robot.options, customRobotStorage.toSimulatorFormat(customRobot));
          babylon.resetScene();
          skulpt.hardInterrupt = true;
          simPanel.setRunIcon('run');
          simPanel.initSensorsPanel();
          $dialog.close();
        }
        return;
      }

      // Load template robot
      robot.options = {};
      Object.assign(robot.options, robotTemplates.find(robotTemplate => robotTemplate.name == val));
      babylon.resetScene();
      skulpt.hardInterrupt = true;
      simPanel.setRunIcon('run');
      simPanel.initSensorsPanel();
      $dialog.close();
    });
  };

  // Open robot editor - opens in new window
  this.openRobotEditorWindow = function(editorPath) {
    console.log('[STBLOCK] Solicitando abrir editor de robots:', editorPath);

    // Send message to parent (STBlock) to open the editor window using Tauri API
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'stblock-open-robot-editor',
        editorPath: editorPath,
        boardType: null
      }, '*');
    } else {
      // Fallback for standalone mode
      window.location.href = editorPath;
    }
  };

  // Convert robotTemplate to editor format
  // El formato del editor usa:
  // - chassis.size[0] = width (ancho X)
  // - chassis.size[1] = depth (largo Z)
  // - chassis.size[2] = height (alto Y)
  // - posiciones en coordenadas del editor donde Y=0 es el suelo
  this.convertTemplateToEditorFormat = function(template) {
    let bodyWidth = template.bodyWidth || 14;
    let bodyLength = template.bodyLength || 16;
    let bodyHeight = template.bodyHeight || 4;
    let wheelRadius = (template.wheelDiameter || 5.6) / 2;
    let wheelWidth = template.wheelWidth || 0.8;

    let editorRobot = {
      id: 'robot_' + Date.now(),
      name: template.name + '_editado',
      boardType: template.boardType || 'stbBoardV2',
      boardTypes: template.boardTypes || ['stbBoardV2'],
      chassisType: template.imageType === 'customModel' ? 'custom' : 'box',
      chassis: {
        // size: [width, depth, height] = [ancho, largo, alto]
        size: [bodyWidth, bodyLength, bodyHeight],
        yOffset: 0,
        mass: template.bodyMass || 1000,
        friction: template.bodyFriction || 0.5,
        color: template.color || '#F09C0D',
        driftEnabled: (template.chassis && template.chassis.driftEnabled) || false,
        driftLeft: (template.chassis && template.chassis.driftLeft) || 10,
        modelURL: template.imageURL || '',
        modelScale: template.modelScale || 1.0
      },
      wheels: [],
      components: [],
      mechanicalJoints: []
    };

    // Calcular posiciones de ruedas para el editor
    // En el editor, las ruedas se posicionan con Y relativo al suelo
    let wheelToBodyOffset = template.wheelToBodyOffset || 0.2;
    let bodyEdgeToWheelCenterY = template.bodyEdgeToWheelCenterY || 1;
    let bodyEdgeToWheelCenterZ = template.bodyEdgeToWheelCenterZ || 2;

    // X: distancia desde el centro hacia los lados
    let wheelX = (bodyWidth / 2) + (wheelWidth / 2) + wheelToBodyOffset;
    // Y: posición vertical (0 = base de la rueda toca el suelo)
    let wheelY = 0;
    // Z: posición a lo largo del robot (positivo = adelante)
    let wheelZ = (bodyLength / 2) - bodyEdgeToWheelCenterZ;

    editorRobot.wheels = [
      {
        id: 'wheel_left',
        port: template.wheelLeftPort || 'A1',
        radius: wheelRadius,
        width: wheelWidth,
        position: [-wheelX, wheelY, wheelZ]
      },
      {
        id: 'wheel_right',
        port: template.wheelRightPort || 'A2',
        radius: wheelRadius,
        width: wheelWidth,
        position: [wheelX, wheelY, wheelZ]
      }
    ];

    // Convertir componentes
    // En el template: position es relativo al centro del chassis
    // En el editor: position es relativo al origen (Y=0 es el suelo)
    if (template.components) {
      template.components.forEach(function(comp, idx) {
        // Convertir posición del simulador al editor
        // En el simulador: Y=0 es el centro del chassis
        // En el editor: Y=0 es el suelo, el chassis está elevado
        let simPos = comp.position || [0, 0, 0];
        let editorPos = [
          simPos[0],                           // X se mantiene igual
          simPos[1] + (bodyHeight / 2),        // Y: ajustar desde centro del chassis al suelo
          simPos[2]                            // Z se mantiene igual
        ];

        // Determinar el puerto basado en el tipo de componente
        let port = 'in' + (idx + 1);
        if (comp.type === 'MagnetActuator') port = 'outC';
        if (comp.type === 'Pen') port = 'outD';
        if (comp.options && comp.options.port) port = comp.options.port;

        editorRobot.components.push({
          id: comp.type.toLowerCase() + '_' + idx,
          name: self.getComponentDisplayName(comp.type),
          type: comp.type,
          port: port,
          position: editorPos,
          rotation: comp.rotation || [0, 0, 0],
          options: comp.options || {}
        });
      });
    }

    return editorRobot;
  };

  // Helper para nombres de componentes
  this.getComponentDisplayName = function(type) {
    const names = {
      'ColorSensor': 'Sensor de Color',
      'UltrasonicSensor': 'Sensor Ultrasónico',
      'GyroSensor': 'Giroscopio',
      'GPSSensor': 'GPS',
      'MagnetActuator': 'Electroimán',
      'Pen': 'Lápiz',
      'LaserRangeSensor': 'Sensor Láser',
      'TouchSensor': 'Sensor de Tacto',
      'LightSensor': 'Sensor de Luz',
      'SwivelActuator': 'Plataforma Giratoria',
      'ArmActuator': 'Brazo',
      'PaintballLauncherActuator': 'Lanzador Paintball'
    };
    return names[type] || type;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROBOT WIZARD - Sistema de creación/edición de robots con animaciones
  // ═══════════════════════════════════════════════════════════════════════════

  // Inject wizard styles
  this.injectWizardStyles = function() {
    if (document.getElementById('stblock-wizard-styles')) return;

    let styles = document.createElement('style');
    styles.id = 'stblock-wizard-styles';
    styles.textContent = `
      @keyframes wizardFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes wizardSlideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes wizardSlideLeft {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes wizardSlideRight {
        from { opacity: 0; transform: translateX(-50px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes wizardPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes wizardGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
      }
      @keyframes wizardFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      @keyframes wizardShine {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes stepBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      .wizard-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(10, 10, 30, 0.95) 0%, rgba(20, 10, 40, 0.98) 100%);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: wizardFadeIn 0.3s ease-out;
        backdrop-filter: blur(10px);
      }
      .wizard-container {
        background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
        border-radius: 24px;
        padding: 0;
        max-width: 700px;
        width: 95%;
        color: white;
        box-shadow: 0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1);
        animation: wizardSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      .wizard-header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
        padding: 24px 32px;
        position: relative;
        overflow: hidden;
      }
      .wizard-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        background-size: 200% 100%;
        animation: wizardShine 3s infinite linear;
      }
      .wizard-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        position: relative;
        z-index: 1;
      }
      .wizard-header p {
        margin: 8px 0 0 0;
        opacity: 0.9;
        font-size: 14px;
        position: relative;
        z-index: 1;
      }
      .wizard-steps {
        display: flex;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        background: rgba(0,0,0,0.3);
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .wizard-step {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(255,255,255,0.05);
        transition: all 0.3s ease;
        opacity: 0.5;
      }
      .wizard-step.active {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        opacity: 1;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
      .wizard-step.completed {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        opacity: 1;
      }
      .wizard-step-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
      .wizard-step.active .wizard-step-number {
        background: rgba(255,255,255,0.3);
        animation: stepBounce 0.5s ease;
      }
      .wizard-step.completed .wizard-step-number {
        background: rgba(255,255,255,0.3);
      }
      .wizard-step-label {
        font-size: 13px;
        font-weight: 500;
      }
      .wizard-content {
        padding: 32px;
        overflow-y: auto;
        flex: 1;
      }
      .wizard-content.animating-out {
        animation: wizardSlideLeft 0.2s ease-in forwards;
        opacity: 0;
      }
      .wizard-content.animating-in {
        animation: wizardSlideRight 0.3s ease-out forwards;
      }
      .wizard-footer {
        padding: 20px 32px;
        background: rgba(0,0,0,0.3);
        border-top: 1px solid rgba(255,255,255,0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .wizard-btn {
        padding: 12px 28px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wizard-btn-secondary {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .wizard-btn-secondary:hover {
        background: rgba(255,255,255,0.15);
        transform: translateX(-3px);
      }
      .wizard-btn-primary {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
      .wizard-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
      }
      .wizard-btn-primary:active {
        transform: translateY(0);
      }
      .wizard-btn-success {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
      }
      .wizard-btn-success:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(34, 197, 94, 0.5);
      }
      .wizard-choice-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
      .wizard-choice-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 24px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .wizard-choice-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.1) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .wizard-choice-card:hover {
        border-color: #6366f1;
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 15px 40px rgba(99, 102, 241, 0.2);
      }
      .wizard-choice-card:hover::before {
        opacity: 1;
      }
      .wizard-choice-card.selected {
        border-color: #6366f1;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
        animation: wizardGlow 2s infinite;
      }
      .wizard-choice-card.new-robot {
        border-color: rgba(99, 102, 241, 0.3);
      }
      .wizard-choice-card.new-robot:hover {
        border-color: #6366f1;
      }
      .wizard-choice-card.edit-robot {
        border-color: rgba(34, 197, 94, 0.3);
      }
      .wizard-choice-card.edit-robot:hover {
        border-color: #22c55e;
        box-shadow: 0 15px 40px rgba(34, 197, 94, 0.2);
      }
      .wizard-choice-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 16px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1));
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        animation: wizardFloat 3s ease-in-out infinite;
        position: relative;
        z-index: 1;
      }
      .wizard-choice-card.edit-robot .wizard-choice-icon {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
      }
      .wizard-choice-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
      }
      .wizard-choice-desc {
        font-size: 13px;
        color: rgba(255,255,255,0.6);
        position: relative;
        z-index: 1;
      }
      .wizard-board-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .wizard-board-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.25s ease;
        text-align: center;
      }
      .wizard-board-card:hover {
        border-color: #6366f1;
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);
      }
      .wizard-board-card.selected {
        border-color: #6366f1;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
      }
      .wizard-board-icon {
        width: 50px;
        height: 50px;
        margin: 0 auto 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .wizard-board-icon svg {
        width: 100%;
        height: 100%;
      }
      .wizard-board-name {
        font-size: 13px;
        font-weight: 600;
      }
      .wizard-board-category {
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        margin-top: 4px;
      }
      .wizard-robot-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 350px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .wizard-robot-list::-webkit-scrollbar {
        width: 6px;
      }
      .wizard-robot-list::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.05);
        border-radius: 3px;
      }
      .wizard-robot-list::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.5);
        border-radius: 3px;
      }
      .wizard-robot-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .wizard-robot-card:hover {
        border-color: #6366f1;
        transform: translateX(5px);
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
      }
      .wizard-robot-card.selected {
        border-color: #6366f1;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
      }
      .wizard-robot-thumb {
        width: 70px;
        height: 70px;
        border-radius: 10px;
        object-fit: cover;
        background: rgba(0,0,0,0.3);
      }
      .wizard-robot-info {
        flex: 1;
      }
      .wizard-robot-name {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .wizard-robot-type {
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 10px;
        display: inline-block;
      }
      .wizard-robot-type.predefined {
        background: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
      }
      .wizard-robot-type.custom {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
      }
      .wizard-robot-arrow {
        font-size: 24px;
        color: rgba(255,255,255,0.3);
        transition: all 0.25s ease;
      }
      .wizard-robot-card:hover .wizard-robot-arrow {
        color: #6366f1;
        transform: translateX(5px);
      }
      .wizard-section-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255,255,255,0.4);
        margin: 20px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .wizard-section-title:first-child {
        margin-top: 0;
      }
    `;
    document.head.appendChild(styles);
  };

  // Board data with icons
  this.boardCategories = [
    {
      name: 'STBlock',
      boards: [
        { id: 'stbBoardV2', name: 'STBoard V2', icon: '🔧', color: '#f09c0d' },
        { id: 'stBoardExtension', name: 'STBoard Ext', icon: '🔌', color: '#f09c0d' }
      ]
    },
    {
      name: 'Arduino',
      boards: [
        { id: 'arduinoUno', name: 'Arduino Uno', icon: '🔵', color: '#00979d' },
        { id: 'arduinoNano', name: 'Arduino Nano', icon: '📍', color: '#00979d' },
        { id: 'arduinoMega2560', name: 'Mega 2560', icon: '📐', color: '#00979d' }
      ]
    },
    {
      name: 'ESP32',
      boards: [
        { id: 'arduinoEsp32', name: 'ESP32', icon: '📡', color: '#e7352c' },
        { id: 'arduinoEsp32S3', name: 'ESP32-S3', icon: '🚀', color: '#e7352c' },
        { id: 'arduinoEsp8266NodeMCU', name: 'NodeMCU', icon: '📶', color: '#1a8cff' }
      ]
    },
    {
      name: 'Raspberry Pi',
      boards: [
        { id: 'arduinoRaspberryPiPico', name: 'Pico', icon: '🍓', color: '#c51a4a' },
        { id: 'arduinoRaspberryPiPicoW', name: 'Pico W', icon: '🍓', color: '#c51a4a' }
      ]
    },
    {
      name: 'Micro:bit',
      boards: [
        { id: 'microbit', name: 'Micro:bit', icon: '💡', color: '#00ed00' },
        { id: 'microbitV2', name: 'Micro:bit V2', icon: '✨', color: '#00ed00' }
      ]
    }
  ];

  // Main wizard state
  this.wizardState = {
    step: 1,
    mode: null, // 'new' or 'edit'
    selectedBoard: null,
    selectedRobot: null
  };

  // Open the robot wizard
  this.openRobotEditor = function() {
    self.injectWizardStyles();
    self.wizardState = { step: 1, mode: null, selectedBoard: null, selectedRobot: null };
    self.renderWizard();
  };

  // Render the wizard
  this.renderWizard = function() {
    // Remove existing wizard if any
    $('.wizard-overlay').remove();

    let $overlay = $('<div class="wizard-overlay"></div>');
    let $container = $('<div class="wizard-container"></div>');

    // Header
    let headerTitle = 'Asistente de Robots';
    let headerDesc = 'Crea o modifica robots para tu simulador';
    if (self.wizardState.step === 2 && self.wizardState.mode === 'new') {
      headerTitle = 'Seleccionar Tarjeta';
      headerDesc = 'Elige la tarjeta controladora para tu robot';
    } else if (self.wizardState.step === 2 && self.wizardState.mode === 'edit') {
      headerTitle = 'Seleccionar Robot';
      headerDesc = 'Elige el robot que deseas modificar';
    } else if (self.wizardState.step === 3) {
      headerTitle = '¡Todo Listo!';
      headerDesc = 'Tu robot está preparado para ser editado';
    }

    let $header = $(`
      <div class="wizard-header">
        <h2>${headerTitle}</h2>
        <p>${headerDesc}</p>
      </div>
    `);

    // Steps indicator
    let step1Class = self.wizardState.step === 1 ? 'active' : (self.wizardState.step > 1 ? 'completed' : '');
    let step2Class = self.wizardState.step === 2 ? 'active' : (self.wizardState.step > 2 ? 'completed' : '');
    let step3Class = self.wizardState.step === 3 ? 'active' : '';

    let $steps = $(`
      <div class="wizard-steps">
        <div class="wizard-step ${step1Class}">
          <div class="wizard-step-number">${self.wizardState.step > 1 ? '✓' : '1'}</div>
          <div class="wizard-step-label">Acción</div>
        </div>
        <div class="wizard-step ${step2Class}">
          <div class="wizard-step-number">${self.wizardState.step > 2 ? '✓' : '2'}</div>
          <div class="wizard-step-label">${self.wizardState.mode === 'edit' ? 'Robot' : 'Tarjeta'}</div>
        </div>
        <div class="wizard-step ${step3Class}">
          <div class="wizard-step-number">3</div>
          <div class="wizard-step-label">Crear</div>
        </div>
      </div>
    `);

    // Content based on step
    let $content = $('<div class="wizard-content"></div>');

    if (self.wizardState.step === 1) {
      $content.html(self.renderStep1());
    } else if (self.wizardState.step === 2) {
      if (self.wizardState.mode === 'new') {
        $content.html(self.renderStep2Boards());
      } else {
        $content.html(self.renderStep2Robots());
      }
    } else if (self.wizardState.step === 3) {
      $content.html(self.renderStep3());
    }

    // Footer
    let $footer = $('<div class="wizard-footer"></div>');

    let backBtn = self.wizardState.step > 1 ?
      '<button class="wizard-btn wizard-btn-secondary wizard-back">← Atrás</button>' :
      '<button class="wizard-btn wizard-btn-secondary wizard-cancel">Cancelar</button>';

    let nextBtn = '';
    if (self.wizardState.step === 1) {
      nextBtn = ''; // No next button on step 1, selection triggers next
    } else if (self.wizardState.step === 2) {
      let disabled = (self.wizardState.mode === 'new' && !self.wizardState.selectedBoard) ||
                     (self.wizardState.mode === 'edit' && !self.wizardState.selectedRobot);
      nextBtn = `<button class="wizard-btn wizard-btn-primary wizard-next" ${disabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>Continuar →</button>`;
    } else if (self.wizardState.step === 3) {
      nextBtn = '<button class="wizard-btn wizard-btn-success wizard-finish">🚀 Abrir Editor</button>';
    }

    $footer.html(`<div>${backBtn}</div><div>${nextBtn}</div>`);

    // Assemble
    $container.append($header).append($steps).append($content).append($footer);
    $overlay.append($container);
    $('body').append($overlay);

    // Bind events
    self.bindWizardEvents($overlay);
  };

  // Render Step 1: Choose action
  this.renderStep1 = function() {
    return `
      <div class="wizard-choice-grid">
        <div class="wizard-choice-card new-robot" data-mode="new">
          <div class="wizard-choice-icon">🤖</div>
          <div class="wizard-choice-title">Crear Nuevo</div>
          <div class="wizard-choice-desc">Diseña un robot completamente nuevo desde cero</div>
        </div>
        <div class="wizard-choice-card edit-robot" data-mode="edit">
          <div class="wizard-choice-icon">✏️</div>
          <div class="wizard-choice-title">Modificar</div>
          <div class="wizard-choice-desc">Edita un robot existente o predefinido</div>
        </div>
      </div>
    `;
  };

  // Render Step 2: Board selection
  this.renderStep2Boards = function() {
    let html = '';

    self.boardCategories.forEach(function(category) {
      html += `<div class="wizard-section-title">${category.name}</div>`;
      html += '<div class="wizard-board-grid">';

      category.boards.forEach(function(board) {
        let selected = self.wizardState.selectedBoard === board.id ? 'selected' : '';
        html += `
          <div class="wizard-board-card ${selected}" data-board="${board.id}">
            <div class="wizard-board-icon">
              <span style="font-size:32px;">${board.icon}</span>
            </div>
            <div class="wizard-board-name">${board.name}</div>
          </div>
        `;
      });

      html += '</div>';
    });

    return html;
  };

  // Render Step 2: Robot selection
  this.renderStep2Robots = function() {
    let html = '<div class="wizard-robot-list">';

    // Predefined robots
    html += '<div class="wizard-section-title">Robots Predefinidos</div>';

    robotTemplates.forEach(function(template, idx) {
      let thumbSrc = template.thumbnail || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="#1e1b4b" width="80" height="80"/><rect x="20" y="25" width="40" height="25" rx="4" fill="#f09c0d"/><circle cx="28" cy="58" r="10" fill="#333"/><circle cx="52" cy="58" r="10" fill="#333"/></svg>');
      let robotName = i18n.get(template.shortDescription) || template.name;
      let selected = self.wizardState.selectedRobot && self.wizardState.selectedRobot.type === 'template' && self.wizardState.selectedRobot.index === idx ? 'selected' : '';

      html += `
        <div class="wizard-robot-card ${selected}" data-robot-type="template" data-robot-index="${idx}">
          <img class="wizard-robot-thumb" src="${thumbSrc}" alt="${robotName}">
          <div class="wizard-robot-info">
            <div class="wizard-robot-name">${robotName}</div>
            <span class="wizard-robot-type predefined">Predefinido</span>
          </div>
          <div class="wizard-robot-arrow">→</div>
        </div>
      `;
    });

    // Custom robots
    let customRobots = [];
    try {
      if (typeof customRobotStorage !== 'undefined') {
        customRobots = customRobotStorage.getAll();
      }
    } catch (e) {}

    if (customRobots.length > 0) {
      html += '<div class="wizard-section-title">Mis Robots Guardados</div>';

      customRobots.forEach(function(customRobot) {
        let thumbSrc = customRobot.thumbnail || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="#1e1b4b" width="80" height="80"/><rect x="20" y="25" width="40" height="25" rx="4" fill="#22c55e"/><circle cx="28" cy="58" r="10" fill="#333"/><circle cx="52" cy="58" r="10" fill="#333"/></svg>');
        let selected = self.wizardState.selectedRobot && self.wizardState.selectedRobot.type === 'custom' && self.wizardState.selectedRobot.id === customRobot.id ? 'selected' : '';

        html += `
          <div class="wizard-robot-card ${selected}" data-robot-type="custom" data-robot-id="${customRobot.id}">
            <img class="wizard-robot-thumb" src="${thumbSrc}" alt="${customRobot.name}">
            <div class="wizard-robot-info">
              <div class="wizard-robot-name">${customRobot.name || 'Robot Personalizado'}</div>
              <span class="wizard-robot-type custom">Personalizado</span>
            </div>
            <div class="wizard-robot-arrow">→</div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  };

  // Render Step 3: Confirmation
  this.renderStep3 = function() {
    let summary = '';

    if (self.wizardState.mode === 'new') {
      let boardName = 'Desconocida';
      self.boardCategories.forEach(function(cat) {
        cat.boards.forEach(function(b) {
          if (b.id === self.wizardState.selectedBoard) boardName = b.name;
        });
      });

      summary = `
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:80px;margin-bottom:20px;animation: wizardFloat 2s ease-in-out infinite;">🤖</div>
          <h3 style="font-size:24px;margin:0 0 10px 0;">Nuevo Robot</h3>
          <p style="color:rgba(255,255,255,0.6);margin:0 0 30px 0;">Se creará un robot con la tarjeta:</p>
          <div style="display:inline-block;background:linear-gradient(135deg, #6366f1, #8b5cf6);padding:12px 30px;border-radius:30px;font-size:18px;font-weight:600;">
            ${boardName}
          </div>
        </div>
      `;
    } else {
      let robotName = 'Robot';
      if (self.wizardState.selectedRobot) {
        if (self.wizardState.selectedRobot.type === 'template') {
          let template = robotTemplates[self.wizardState.selectedRobot.index];
          robotName = i18n.get(template.shortDescription) || template.name;
        } else {
          let customRobots = [];
          try { customRobots = customRobotStorage.getAll(); } catch(e) {}
          let customRobot = customRobots.find(r => r.id === self.wizardState.selectedRobot.id);
          if (customRobot) robotName = customRobot.name || 'Robot Personalizado';
        }
      }

      summary = `
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:80px;margin-bottom:20px;animation: wizardFloat 2s ease-in-out infinite;">✏️</div>
          <h3 style="font-size:24px;margin:0 0 10px 0;">Editar Robot</h3>
          <p style="color:rgba(255,255,255,0.6);margin:0 0 30px 0;">Se abrirá el editor con:</p>
          <div style="display:inline-block;background:linear-gradient(135deg, #22c55e, #16a34a);padding:12px 30px;border-radius:30px;font-size:18px;font-weight:600;">
            ${robotName}
          </div>
        </div>
      `;
    }

    return summary;
  };

  // Bind wizard events
  this.bindWizardEvents = function($overlay) {
    // Cancel/Close
    $overlay.find('.wizard-cancel').click(function() {
      $overlay.remove();
    });

    // Back button
    $overlay.find('.wizard-back').click(function() {
      if (self.wizardState.step > 1) {
        self.wizardState.step--;
        if (self.wizardState.step === 1) {
          self.wizardState.mode = null;
          self.wizardState.selectedBoard = null;
          self.wizardState.selectedRobot = null;
        }
        self.renderWizard();
      }
    });

    // Step 1: Choose mode
    $overlay.find('.wizard-choice-card').click(function() {
      let mode = $(this).data('mode');
      self.wizardState.mode = mode;
      self.wizardState.step = 2;
      self.renderWizard();
    });

    // Step 2: Board selection
    $overlay.find('.wizard-board-card').click(function() {
      let boardId = $(this).data('board');
      self.wizardState.selectedBoard = boardId;
      $overlay.find('.wizard-board-card').removeClass('selected');
      $(this).addClass('selected');
      // Enable next button
      $overlay.find('.wizard-next').css({opacity: 1, pointerEvents: 'auto'});
    });

    // Step 2: Robot selection
    $overlay.find('.wizard-robot-card').click(function() {
      let robotType = $(this).data('robot-type');
      if (robotType === 'template') {
        self.wizardState.selectedRobot = { type: 'template', index: $(this).data('robot-index') };
      } else {
        self.wizardState.selectedRobot = { type: 'custom', id: $(this).data('robot-id') };
      }
      $overlay.find('.wizard-robot-card').removeClass('selected');
      $(this).addClass('selected');
      // Enable next button
      $overlay.find('.wizard-next').css({opacity: 1, pointerEvents: 'auto'});
    });

    // Next button
    $overlay.find('.wizard-next').click(function() {
      if (self.wizardState.step === 2) {
        self.wizardState.step = 3;
        self.renderWizard();
      }
    });

    // Finish button
    $overlay.find('.wizard-finish').click(function() {
      $overlay.remove();
      self.launchRobotEditor();
    });

    // Click overlay to close (optional)
    $overlay.click(function(e) {
      if (e.target === $overlay[0]) {
        $overlay.remove();
      }
    });
  };

  // Launch the robot editor
  this.launchRobotEditor = function() {
    if (self.wizardState.mode === 'new') {
      // Open editor with selected board
      let editorPath = 'static/velxio/gears/editor/index.html?mode=robots&boardType=' + encodeURIComponent(self.wizardState.selectedBoard);
      self.openRobotEditorWindow(editorPath);
    } else if (self.wizardState.mode === 'edit') {
      // Get robot data and save to localStorage
      let robotData = null;

      if (self.wizardState.selectedRobot.type === 'template') {
        let template = robotTemplates[self.wizardState.selectedRobot.index];
        robotData = self.convertTemplateToEditorFormat(template);
      } else {
        let customRobots = [];
        try { customRobots = customRobotStorage.getAll(); } catch(e) {}
        robotData = customRobots.find(r => r.id === self.wizardState.selectedRobot.id);
      }

      if (robotData) {
        localStorage.setItem('stblock_edit_robot', JSON.stringify(robotData));
        let editorPath = 'static/velxio/gears/editor/index.html?mode=robots&loadFromStorage=true';
        self.openRobotEditorWindow(editorPath);
      }
    }
  };

  // Display current position
  this.displayPosition = function() {
    let x = Math.round(robot.body.position.x * 10) / 10;
    let y = Math.round(robot.body.position.z * 10) / 10;
    let angles = robot.body.absoluteRotationQuaternion.toEulerAngles();
    let rot = Math.round(angles.y / Math.PI * 1800) / 10;

    acknowledgeDialog({
      title: i18n.get('#main-robot_position#'),
      message: $(
        '<p>' + i18n.get('#main-position#') + ': ' + x + ', ' + y + '</p>' +
        '<p>' + i18n.get('#main-rotation#') + ': ' + rot + ' ' + i18n.get('#main-degrees#') + '</p>'
      )
    })
  };

  // Save current position
  this.savePosition = function() {
    let x = Math.round(robot.body.position.x * 10) / 10;
    let y = Math.round(robot.body.position.z * 10) / 10;
    let angles = robot.body.absoluteRotationQuaternion.toEulerAngles();
    let rot = Math.round(angles.y / Math.PI * 1800) / 10;

    if (typeof babylon.world.defaultOptions.startPosXYZStr != 'undefined') {
      babylon.world.options.startPosXYZStr = x + ',' +y;
    } else if (typeof babylon.world.defaultOptions.startPosXY != 'undefined') {
      babylon.world.options.startPosXY = x + ',' +y;
    } else {
      toastMsg(i18n.get('#main-cannot_save_position#'));
      return;
    }
    if (typeof babylon.world.defaultOptions.startRotStr != 'undefined') {
      babylon.world.options.startRotStr = rot.toString();
    } else if (typeof babylon.world.defaultOptions.startRot != 'undefined') {
      babylon.world.options.startRot = rot.toString();
    } else {
      toastMsg(i18n.get('#main-cannot_save_rotation#'));
    }
    babylon.world.setOptions();
  };

  // Clear current position
  this.clearPosition = function() {
    if (babylon.world.options.startPosXY) {
      babylon.world.options.startPosXY = '';
    }
    if (babylon.world.options.startRot) {
      babylon.world.options.startRot = '';
    }
    babylon.world.setOptions();
  };

  // Open a window with a link to the robot configurator page
  this.configuratorWindow = function() {
    let options = {
      title: i18n.get('#main-configurator_title#'),
      message: i18n.get('#main-configurator_description#'),
      confirm: i18n.get('#main-configurator_go#')
    };
    confirmDialog(options, function(){
      self.openPage('configurator.html');
    });
  };

  // Open a window with a link to the world builder page
  this.worldBuilderWindow = function() {
    let options = {
      title: i18n.get('#main-worldBuilder_title#'),
      message: i18n.get('#main-worldBuilder_description#'),
      confirm: i18n.get('#main-worldBuilder_go#')
    };
    confirmDialog(options, function(){
      self.openPage('builder.html');
    });
  };

  // Toggle robot menu
  this.toggleRobotMenu = function(e) {
    if ($('.robotMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: i18n.get('#main-select_robot#'), line: false, callback: self.selectRobot},
        {html: i18n.get('#main-robot_configurator#'), line: true, callback: self.configuratorWindow},
        {html: i18n.get('#main-robot_load_file#'), line: false, callback: self.loadRobotLocal},
        {html: i18n.get('#main-robot_save_file#'), line: true, callback: self.saveRobot},
        {html: i18n.get('#main-display_position#'), line: false, callback: self.displayPosition},
        {html: i18n.get('#main-save_position#'), line: false, callback: self.savePosition},
        {html: i18n.get('#main-clear_position#'), line: false, callback: self.clearPosition},
      ];

      menuDropDown(self.$robotMenu, menuItems, {className: 'robotMenuDropDown'});
    }
  };

  // Toggle worlds menu
  this.toggleWorldsMenu = function(e) {
    if ($('.worldsMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: i18n.get('#main-select_world#'), line: false, callback: simPanel.selectWorld},
        {html: i18n.get('#main-world_builder#'), line: false, callback: self.worldBuilderWindow},
        {html: i18n.get('#main-arena#'), line: true, callback: self.arenaWindow},
        {html: i18n.get('#main-world_load_file#'), line: false, callback: simPanel.loadWorldLocal},
        {html: i18n.get('#main-world_save_file#'), line: false, callback: simPanel.saveWorld},
      ];

      menuDropDown(self.$worldsMenu, menuItems, {className: 'worldsMenuDropDown'});
    }
  };

  // Toggle python
  this.togglePythonMenu = function(e) {
    if ($('.pythonMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: 'Ev3dev Mode', line: false, callback: self.switchToEv3dev},
        {html: 'Pybricks Mode', line: true, callback: self.switchToPybricks},
        {html: 'Zoom In', line: false, callback: pythonPanel.zoomIn},
        {html: 'Zoom Out', line: false, callback: pythonPanel.zoomOut},
        {html: 'Reset Zoom', line: false, callback: pythonPanel.zoomReset},
      ];
      var tickIndex;
      if (blockly.generator == ev3dev2_generator) {
        tickIndex = 0;
      } else if (blockly.generator == pybricks_generator) {
        tickIndex = 1;
      }
      menuItems[tickIndex].html = '<span class="tick">&#x2713;</span> ' + menuItems[tickIndex].html;

      menuDropDown(self.$pythonMenu, menuItems, {className: 'pythonMenuDropDown'});
    }
  };

  // switch to ev3dev
  this.switchToEv3dev = function() {
    blockly.generator = ev3dev2_generator;
    blockly.generator.load();
    // if (! pythonPanel.modified) {
    if (! filesManager.modified) {
      pythonPanel.loadPythonFromBlockly();
    }
  };

  // switch to pybricks
  this.switchToPybricks = function() {
    blockly.generator = pybricks_generator;
    blockly.generator.load();
    // if (! pythonPanel.modified) {
    if (! filesManager.modified) {
      pythonPanel.loadPythonFromBlockly();
    }
  };

  // Toggle filemenu
  this.toggleFileMenu = function(e) {
    if ($('.fileMenuDropDown').length == 0) {
      $('.menuDropDown').remove();
      e.stopPropagation();

      let menuItems = [
        {html: i18n.get('#main-new_program#'), line: true, callback: self.newProgram},
        {html: i18n.get('#main-load_blocks#'), line: false, callback: self.loadFromComputer},
        {html: i18n.get('#main-import_functions#'), line: false, callback: self.importFunctionsFromFile},
        {html: i18n.get('#main-save_blocks#'), line: true, callback: self.saveToComputer},
        {html: i18n.get('#main-load_python#'), line: false, callback: self.loadPythonFromComputer},
        {html: i18n.get('#main-save_python#'), line: true, callback: self.savePythonToComputer},
        {html: i18n.get('#main-export_zip#'), line: false, callback: self.saveZipToComputer},
        {html: i18n.get('#main-import_zip#'), line: false, callback: self.loadZipFromComputer}
      ];

      menuDropDown(self.$fileMenu, menuItems, {className: 'fileMenuDropDown'});
    }
  };

  // New program
  this.newProgram = function() {
    confirmDialog(i18n.get('#main-start_new_warning#'), function() {
      blockly.loadDefaultWorkspace();
      filesManager.modified = false;
      localStorage.setItem('gearsPythonModified', false);
      blocklyPanel.setDisable(false);
      self.$projectName.val('');
      self.saveProjectName();
    });
  };

  // save Zip to computer
  this.saveZipToComputer = function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'gearsBot';
    }

    let meta = {
      name: filename,
      pythonModified: filesManager.modified
    };

    var zip = new JSZip();
    zip.file('gearsBlocks.xml', blockly.getXmlText());
    if (filesManager.modified) {
      for (let filename in filesManager.files) {
        zip.file(filename, filesManager.files[filename]);
      };
    } else {
      zip.file('main.py', blockly.generator.genCode());
    }

    zip.file('gearsRobot.json', JSON.stringify(robot.options, null, 2));
    zip.file('meta.json', JSON.stringify(meta, null, 2));

    zip.generateAsync({type:'base64'})
    .then(function(content) {
      self.downloadFile(filename + '.zip', content, 'application/xml');
    });
  };

  this.loadZipFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/zip,.zip';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      var file = e.target.files[0];
      if (file) {
        var reader = new FileReader();

        reader.onload = function(e) {
          JSZip.loadAsync(e.target.result)
            .then(async function(zip) {
              filesManager.deleteAll();

              let pythonModified = true;
              if ('meta.json' in zip.files) {
                const metaParams = await loadFile(zip, 'meta.json');
                const meta = JSON.parse(metaParams);

                pythonModified = meta.pythonModified;
                self.$projectName.val(meta.name);
                self.saveProjectName();
              }

              if ('gearsBlocks.xml' in zip.files) {
                const xmlText = await loadFile(zip, 'gearsBlocks.xml');
                blockly.loadXmlText(xmlText);
              }

              if ('gearsRobot.json' in zip.files) {
                const robotConf = await loadFile(zip, 'gearsRobot.json')
                self.loadRobot(robotConf)
              }

              // Load Python files
              for (filename in zip.files) {
                if (filename.endsWith('.py')) {
                  const pythonCode = await loadFile(zip, filename);
                  if (filename == 'gearsPython.py') {
                    filename = 'main.py';
                  }
                  filesManager.add(filename, pythonCode);
                }
              }

              filesManager.modified = pythonModified;
              if (pythonModified) {
                blocklyPanel.setDisable(true);
                filesManager.unsaved = true;
                filesManager.saveLocalStorage();
              }
            })
            .catch(function(err) {
              console.error('JSZip error:', err);
              showErrorModal(i18n.get('#main-invalid_zip_package#'));
            });
        };

        async function loadFile(zip, filename) {
          const file = zip.file(filename);
          if (file) {
            return await file.async('text');
          }
          console.warn('File not found in zip:', filename);
          return null;
        }

        reader.onerror = function(err) {
          console.error('FileReader error:', err);
          alert('Failed to read file.');
        };

        reader.readAsArrayBuffer(file);
      } else {
        console.log('No file selected.');
      }
    });
  };

  // save to computer
  this.saveToComputer = function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'gearsBot';
    }
    self.downloadFile(filename + '.xml', encodeURIComponent(blockly.getXmlText()), 'application/xml;', encoding='charset=UTF-8');
  };

  // import functions from file
  this.importFunctionsFromFile = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/xml,.xml';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      var reader = new FileReader();
      reader.onload = function() {
        blockly.importXmlTextFunctions(this.result);
        toastMsg(i18n.get('#main-functions_imported'));
      };
      reader.readAsText(e.target.files[0]);
    });
  };

  // load from computer
  this.loadFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'application/xml,.xml';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      var reader = new FileReader();
      reader.onload = function() {
        blockly.loadXmlText(this.result);
      };
      reader.readAsText(e.target.files[0]);
      let filename = e.target.files[0].name.replace(/.xml/, '');
      self.$projectName.val(filename);
      self.saveProjectName();
    });
  };

  // Download to single file
  this.downloadFile = function(filename, content, mimetype, encoding='base64') {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:' + mimetype + ';' + encoding + ',' + content;
    hiddenElement.target = '_blank';
    hiddenElement.download = filename;
    hiddenElement.dispatchEvent(new MouseEvent('click'));
  }

  // Download to zip file
  this.downloadZipFile = function(filename, files) {
    var zip = new JSZip();
    for (let f in files) {
      zip.file(f, files[f]);
    }

    zip.generateAsync({
      type:'base64',
      compression: "DEFLATE"
    })
    .then(function(content) {
      self.downloadFile(filename + '.zip', content, 'application/zip');
    });
  }

  // save to computer
  this.savePythonToComputer = async function() {
    let filename = self.$projectName.val();
    if (filename.trim() == '') {
      filename = 'gearsBot';
    }

    if (filesManager.modified == false) {
      await pythonPanel.loadPythonFromBlockly();
    }
    filesManager.updateCurrentFile();

    self.downloadZipFile(filename, filesManager.files);
  };

  this.loadPythonFromComputer = function() {
    var hiddenElement = document.createElement('input');
    hiddenElement.type = 'file';
    hiddenElement.accept = 'text/x-python,.py,application/zip,.zip';
    hiddenElement.dispatchEvent(new MouseEvent('click'));
    hiddenElement.addEventListener('change', function(e){
      let filename = e.target.files[0].name;
      if (filename.endsWith('.zip')) {
        self.loadPythonFromComputerZip(e);
        self.$projectName.val(filename.replace(/\.zip$/, ''));
      } else {
        self.loadSinglePythonFile(e);
        self.$projectName.val(filename.replace(/\.py$/, ''));
      }
      self.saveProjectName();
    });
  };

  this.loadPythonFromComputerZip = function(e) {
    async function loadFiles(zip) {
      filesManager.deleteAll();

      let filenames = [];
      zip.forEach(function(path, file) {
        filenames.push(path);
      });

      if (! filenames.includes('main.py') && ! filenames.includes('gearsPython.py')) {
        console.log('No main.py or gearsPython.py in zip archive');
        throw new Error();
      }

      for (let filename of filenames) {
        if (filename.endsWith('.py')) {
          await zip.file(filename).async('string')
            .then(function(content){
              if (filename == 'gearsPython.py') {
                filename = 'main.py';
              }
              filesManager.add(filename, content);
            });
        }
      }

      filesManager.modified = true;
      filesManager.unsaved = true;
      filesManager.saveLocalStorage();
      self.tabClicked('navPython');
    }

    JSZip.loadAsync(e.target.files[0])
      .then(loadFiles)
      .catch(error => showErrorModal(i18n.get('#main-invalid_python_file#')));
  }

  this.loadSinglePythonFile = function(e) {
    var reader = new FileReader();
    reader.onload = function() {
      filesManager.deleteAll()
      filesManager.add('main.py', this.result);
      filesManager.modified = true;
      filesManager.unsaved = true;
      filesManager.saveLocalStorage();

      self.tabClicked('navPython');
      pythonPanel.warnModify();
    };
    reader.onerror = function() {
      console.log(reader.error);
    };
    reader.readAsText(e.target.files[0]);
  };

  // Check for unsaved changes
  this.checkUnsaved = function (event) {
    if (blockly.unsaved || filesManager.unsaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  // Clicked on tab
  this.tabClicked = function(tabNav) {
    if (typeof tabNav == 'string') {
      var match = tabNav;
    } else {
      var match = $(this)[0].id;
    }

    function getPanelByNav(nav) {
      if (nav == 'navBlocks') {
        return blocklyPanel;
      } else if (nav == 'navPython') {
        return pythonPanel;
      } else if (nav == 'navSim') {
        return simPanel;
      }
    };

    // when deleting a python module, inActiveNav and inActive will be undefined
    inActiveNav = self.$navs.siblings('.active').attr('id');
    inActive = getPanelByNav(inActiveNav);
    active = getPanelByNav(match);

    self.$navs.removeClass('active');
    $('#' + match).addClass('active');

    self.$panels.removeClass('active');
    self.$panels.siblings('[aria-labelledby="' + match + '"]').addClass('active');

    self.$panelControls.removeClass('active');
    self.$panelControls.siblings('[aria-labelledby="' + match + '"]').addClass('active');

    if ((inActive !== undefined) &&
        (typeof inActive.onInActive == 'function')) {
      inActive.onInActive();
    }
    if (typeof active.onActive == 'function') {
      active.onActive();
    }
  };

  this.showDialog = function(title, message) {
    let options = {
      title: title,
      message: message
    }
    acknowledgeDialog(options, function(){});
  }

  // External GearsBot announcements are disabled. STBlock owns this channel.
  this.showWhatsNew = function() {};
  this.showNews = function() {};
}

// Init class
main.init();
