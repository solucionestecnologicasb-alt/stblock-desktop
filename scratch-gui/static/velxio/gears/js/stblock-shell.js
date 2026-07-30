(function () {
  'use strict';

  var labels = [
    ['.runSim', 'Ejecutar'],
    ['.world', 'Escenario'],
    ['.reset', 'Reiniciar'],
    ['.ruler', 'Medir'],
    ['.joystick', 'Control manual'],
    ['.hubButtons', 'Botones'],
    ['.sensors', 'Sensores'],
    ['.cameraSelector', 'Camara']
  ];

  var robotMessagesEs = {
    '#main-select_robot#': {es: 'Seleccionar robot'},
    '#robot-dimensions#': {es: 'Dimensiones'},
    '#robot-wheelDiameter#': {es: 'Diametro de las ruedas'},
    '#robot-wheelSpacing#': {es: 'Separacion entre ruedas'},
    '#robot-actuators#': {es: 'Actuadores'},
    '#robot-port#': {es: 'Puerto'},
    '#robot-leftWheel#': {es: 'Rueda izquierda'},
    '#robot-rightWheel#': {es: 'Rueda derecha'},
    '#robot-electromagnet#': {es: 'Electroiman'},
    '#robot-motorizedArm#': {es: 'Brazo motorizado'},
    '#robot-swivel#': {es: 'Plataforma giratoria'},
    '#robot-linear#': {es: 'Actuador lineal'},
    '#robot-paintball#': {es: 'Lanzador de paintball'},
    '#robot-sensors#': {es: 'Sensores'},
    '#robot-color#': {es: 'Sensor de color'},
    '#robot-front#': {es: 'Frontal'},
    '#robot-left#': {es: 'Izquierdo'},
    '#robot-right#': {es: 'Derecho'},
    '#robot-back#': {es: 'Trasero'},
    '#robot-arm#': {es: 'Brazo'},
    '#robot-ultrasonic#': {es: 'Sensor ultrasonico de distancia'},
    '#robot-gyro#': {es: 'Giroscopio'},
    '#robot-laser#': {es: 'Sensor laser de distancia'},
    '#robot-lidar#': {es: 'Sensor LIDAR (distancia 360 grados)'},
    '#robot-pen#': {es: 'Lapiz'},
    '#robot-touch#': {es: 'Sensor tactil'},
    '#robot-wheel#': {es: 'Rueda'},
    '#robot-singleFollowerShort#': {es: 'Seguidor de linea de un sensor'},
    '#robot-singleFollowerLong#': {es:
      '<p>Este robot esta equipado con un sensor de color para seguir lineas.</p>' +
      '<p>Un electroiman en la parte inferior permite recoger objetos magneticos y un lapiz permite dibujar en el escenario el recorrido del robot.</p>' +
      '<p>Es apropiado para aprender los fundamentos del seguimiento de lineas, aunque algunos mapas requieren dos sensores.</p>'},
    '#robot-doubleFollowerShort#': {es: 'Seguidor de linea de dos sensores'},
    '#robot-doubleFollowerLong#': {es:
      '<p>Este robot esta equipado con dos sensores de color para seguir lineas.</p>' +
      '<p>Un electroiman inferior permite recoger objetos magneticos. El giroscopio y el GPS permiten movimientos precisos incluso fuera de la linea.</p>'},
    '#robot-paintballShort#': {es: 'Robot de paintball'},
    '#robot-paintballLong#': {es:
      '<p>Es similar al seguidor de linea de dos sensores, pero incorpora un lanzador de paintball sobre un brazo motorizado. El sensor ultrasonico se sustituye por un sensor laser de largo alcance (5 m).</p>' +
      '<p>Consulta la documentacion del lanzador de paintball para aprender a utilizarlo.</p>'},
    '#robot-mazeShort#': {es: 'Explorador de laberintos'},
    '#robot-mazeLong#': {es:
      '<p>Este robot utiliza tres sensores ultrasonicos para navegar por laberintos y un sensor de color para detectar el punto final.</p>' +
      '<p>Un electroiman inferior permite recoger objetos magneticos y el giroscopio ayuda al robot a avanzar en linea recta.</p>'},
    '#robot-maze2Short#': {es: 'Explorador de laberintos MkII'},
    '#robot-maze2Long#': {es:
      '<p>Este explorador avanzado sustituye los tres sensores ultrasonicos por un sensor laser y un sensor de color frontal instalado sobre una plataforma giratoria.</p>' +
      '<p>El sensor de color frontal esta configurado para largo alcance (30 cm) y un campo de vision estrecho (30 grados).</p>'},
    '#robot-towShort#': {es: 'Grua de remolque'},
    '#robot-towLong#': {es:
      '<p>Este robot esta equipado con un iman instalado en un brazo.</p>' +
      '<p>Puede recoger o remolcar objetos magneticos. Debes evitar golpear el objeto al girar.</p>'},
    '#robot-craneShort#': {es: 'Robot grua'},
    '#robot-craneLong#': {es:
      '<p>Este robot incorpora un electroiman en el extremo de un brazo de grua de dos segmentos.</p>' +
      '<p>Alcanza mayor altura y distancia que otros robots, y el sensor de color del extremo permite identificar el objeto recogido.</p>' +
      '<p>Pliega el brazo durante el desplazamiento para no obstruir el sensor ultrasonico.</p>'},
    '#robot-cageShort#': {es: 'Robot jaula'},
    '#robot-cageLong#': {es:
      '<p>Este robot posee una jaula movil para capturar y transportar bloques. Un sensor de color frontal detecta la presencia y el color de los bloques.</p>' +
      '<p>La jaula puede ampliarse desde el configurador de robots cuando una mision requiera mayor capacidad.</p>'},
    '#robot-footballShort#': {es: 'Robot de futbol'},
    '#robot-footballLong#': {es:
      '<p>Este robot utiliza electroimanes delanteros y traseros para capturar y lanzar la pelota.</p>' +
      '<p>Sus electroimanes tienen mayor alcance y potencia que los modelos estandar.</p>'},
    '#robot-WROSportShort#': {es: 'WRO RoboSport'},
    '#robot-WROSportLong#': {es:
      '<p>Robot de ejemplo para WRO RoboSport.</p>' +
      '<p>Utiliza el electroiman del puerto C para capturar y lanzar la pelota. Para disparar, establece la potencia del iman en -100 %.</p>'}
  };

  var worldMessagesEs = {
    '#sim-select_world#': {es: 'Seleccionar escenario'},
    '#sim-save#': {es: 'Guardar'},
    '#sim-load#': {es: 'Cargar'},
    '#sim-default#': {es: 'Restablecer'},
    '#sim-cancel#': {es: 'Cancelar'},
    '#sim-ok#': {es: 'Aceptar'}
  };

  var worldDescriptionsEs = {
    stblockPractice: ['Zona de practica STBlock', '<p>Mesa libre de practica de 3 m por 3 m con paredes perimetrales.</p><p>Incluye ocho objetos moviles de diferentes tamanos, colores y posiciones que cambian al reiniciar el escenario.</p>'],
    arena: ['Arena multirrobot', '<p>Escenarios para varios robots que compiten o colaboran entre si.</p>'],
    configurator: ['Mapa del configurador', '<p>Escenario utilizado para configurar y probar robots personalizados.</p>'],
    custom: ['Escenario personalizado', '<p>Crea un escenario utilizando una imagen y configura sus dimensiones, paredes y posicion inicial.</p>'],
    fireRescue: ['Rescate de incendios', '<p>Desafios de rescate en los que el robot debe localizar y atender zonas de incendio.</p>'],
    football: ['Cancha de futbol', '<p>Arena de futbol para uno o varios robots.</p>'],
    grid: ['Mapa cuadriculado (20 cm)', '<p>Campo cuadriculado configurable para practicar movimientos, distancias y giros.</p>'],
    gyro: ['Desafios con giroscopio', '<p>Serie de desafios centrados en el uso del giroscopio.</p>'],
    lineFollowing: ['Desafios de seguimiento de linea', '<p>Serie de desafios relacionados con el seguimiento de lineas.</p><p>Reto general: crea un solo programa capaz de completar todos los desafios excepto "Intersecciones 1".</p>'],
    maze: ['Mapa de laberinto', '<p>Genera un laberinto de tamano configurable.</p><p>El laberinto cambia aleatoriamente, salvo que establezcas una semilla.</p>'],
    missions: ['Misiones (FLL, WRO y otras)', '<p>Este escenario contiene misiones de First Lego League (FLL), World Robot Olympiad (WRO) y otras competiciones.</p>'],
    paintball: ['Desafios de paintball', '<p>Escenarios para practicar el uso del lanzador de paintball.</p>'],
    sumo: ['Desafios de sumo', '<p>Empuja a los oponentes fuera de la plataforma sin que tu robot caiga.</p>']
  };

  var worldOptionTextEs = {
    'Select Challenge': 'Seleccionar desafio',
    'Select Mission': 'Seleccionar mision',
    'Select Challenges': 'Seleccionar desafios',
    'Select Image': 'Seleccionar imagen',
    'Time Limit': 'Limite de tiempo',
    'Stop robots when time is up': 'Detener los robots cuando termine el tiempo',
    'Random Seed': 'Semilla aleatoria',
    'Maze Seed': 'Semilla del laberinto',
    'Starting Position': 'Posicion inicial',
    'Starting Position (Single Player Mode)': 'Posicion inicial (modo de un jugador)',
    'Starting Position (x, y)': 'Posicion inicial (x, y)',
    'Starting Position (x, y, z)': 'Posicion inicial (x, y, z)',
    'Starting Rotation (degrees)': 'Rotacion inicial (grados)',
    'Image URL': 'URL de la imagen',
    'Upload Image': 'Cargar imagen',
    'Ground Type': 'Tipo de suelo',
    'Display Timer': 'Mostrar temporizador',
    'Timer Duration (s)': 'Duracion del temporizador (s)',
    'At Timer End': 'Al terminar el tiempo',
    'Image Scale Factor': 'Escala de la imagen',
    'Wall': 'Pared',
    'Wall Present': 'Mostrar pared',
    'Wall Height (cm)': 'Altura de la pared (cm)',
    'Wall Thickness (cm)': 'Grosor de la pared (cm)',
    'Length of field (cm)': 'Largo del campo (cm)',
    'Width of field (cm)': 'Ancho del campo (cm)',
    'Width of goal (cm)': 'Ancho de la porteria (cm)',
    'Shot Clock Duration (s)': 'Duracion del reloj de tiro (s)',
    ' Ball Starting Position (x, y)': 'Posicion inicial de la pelota (x, y)',
    'Ball Heading (degrees)': 'Direccion de la pelota (grados)',
    'Randomly Flip Ball Heading ': 'Invertir aleatoriamente la direccion de la pelota',
    'Random Flipping': 'Inversion aleatoria',
    'Ball Minimum Speed (cm/s)': 'Velocidad minima de la pelota (cm/s)',
    'Ball Speed Range (cm/s)': 'Rango de velocidad de la pelota (cm/s)',
    'Ball Damping': 'Amortiguacion de la pelota',
    'Ball Friction': 'Friccion de la pelota',
    'Width of Straight Run challenge': 'Ancho del desafio de recorrido recto',
    'Maze Type': 'Tipo de laberinto',
    'Number of columns': 'Numero de columnas',
    'Number of rows': 'Numero de filas',
    'Cell size (cm)': 'Tamano de celda (cm)',
    'Timer': 'Temporizador',
    'Show Timer': 'Mostrar temporizador',
    'Missions': 'Misiones',
    'Mission Objects Present': 'Mostrar objetos de la mision',
    'Randomize world': 'Generar escenario aleatorio'
  };

  var worldChoiceTextEs = {
    'Simple Curves': 'Curvas simples',
    'Sharp Turns': 'Giros cerrados',
    'Gaps 1': 'Espacios 1',
    'Gaps 2': 'Espacios 2',
    'Obstacles 1': 'Obstaculos 1',
    'Obstacles 2': 'Obstaculos 2',
    'Obstacles 3': 'Obstaculos 3',
    'Obstacles 4': 'Obstaculos 4',
    'Junctions 1': 'Intersecciones 1',
    'Junctions 2': 'Intersecciones 2',
    'Straight Run': 'Recorrido recto',
    'Square Loops': 'Vueltas cuadradas',
    'Random Direction': 'Direccion aleatoria',
    'Fixed Dummies': 'Objetivos fijos',
    'Random Dummies': 'Objetivos aleatorios',
    'No Border': 'Sin borde',
    'Pillars': 'Pilares',
    'Perfect': 'Perfecto',
    'Imperfect': 'Imperfecto',
    'Mission Default': 'Predeterminada de la mision',
    'Center': 'Centro',
    'Bottom Left': 'Abajo a la izquierda',
    'Bottom Center': 'Abajo al centro',
    'Bottom Right': 'Abajo a la derecha',
    'Elementary': 'Elemental',
    'Junior': 'Junior',
    'Senior': 'Senior',
    'Future Engineer Simple': 'Ingenieria del futuro - simple',
    'Future Engineer Open': 'Ingenieria del futuro - abierto',
    'Future Engineer Obstacle': 'Ingenieria del futuro - obstaculos'
  };

  function translateWorldChoice(text) {
    if (worldChoiceTextEs[text]) return worldChoiceTextEs[text];
    return text
      .replace('(Elementary)', '(Elemental)')
      .replace('(Future Engineer Simple)', '(Ingenieria del futuro - simple)')
      .replace('(Future Engineer Open)', '(Ingenieria del futuro - abierto)')
      .replace('(Future Engineer Obstacle)', '(Ingenieria del futuro - obstaculos)')
      .replace('No Models', 'Sin modelos')
      .replace('Randomization', 'Variacion');
  }

  function installWorldTranslations() {
    i18n.append(worldMessagesEs);
    if (!window.worlds) return;

    worlds.forEach(function (world) {
      var description = worldDescriptionsEs[world.name];
      if (description) {
        world.shortDescription = description[0];
        world.longDescription = description[1];
      }

      (world.optionsConfigurations || []).forEach(function (configuration) {
        configuration.title = worldOptionTextEs[configuration.title] || configuration.title;
        if (configuration.label) {
          configuration.label = worldOptionTextEs[configuration.label] || configuration.label;
        }
        if (configuration.help) {
          configuration.help = configuration.help
            .replace('Leave this blank to generate a random maze', 'Deja este campo vacio para generar un laberinto aleatorio')
            .replace('Mission objects are only available for some missions.', 'Los objetos solo estan disponibles en algunas misiones.')
            .replace('Set the starting rotation in degrees. Positive rotation is clockwise.', 'Indica la rotacion inicial en grados. Los valores positivos giran en sentido horario.')
            .replace(/Enter using this format.*$/, 'Usa el formato "x, y" en centimetros. El centro de la imagen corresponde a "0, 0".');
        }
        if (configuration.options) {
          configuration.options.forEach(function (option) {
            option[0] = translateWorldChoice(option[0]);
          });
        }
      });
    });
  }

  function installRobotTranslations() {
    i18n.append(robotMessagesEs);

    var originalSelectRobot = main.selectRobot;
    main.selectRobot = function () {
      originalSelectRobot.apply(main, arguments);
      window.setTimeout(function () {
        var dialogWindow = document.querySelector('.dialogWindow');
        if (!dialogWindow) return;
        var cancel = dialogWindow.querySelector('button.cancel');
        var confirm = dialogWindow.querySelector('button.confirm');
        if (cancel) cancel.textContent = 'Cancelar';
        if (confirm) confirm.textContent = 'Aceptar';
      }, 0);
    };
  }

  function addRobotButton() {
    var simPanel = document.getElementById('simPanel');
    if (!simPanel || simPanel.querySelector('.stblockRobot')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'stblockRobot';
    button.setAttribute('aria-label', 'Seleccionar robot');
    button.setAttribute('data-stblock-label', 'Robot');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M9 3h6v2h-2v2h4a3 3 0 013 3v7a3 3 0 01-3 3H7a3 3 0 01-3-3v-7a3 3 0 013-3h4V5H9V3zm-2 6a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1H7zm2 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>' +
      '</svg>';
    button.addEventListener('click', function () {
      main.selectRobot();
    });
    simPanel.appendChild(button);
  }

  function createControlDock() {
    var simulator = document.getElementById('simPanel');
    if (!simulator || simulator.querySelector('.stblockDock')) return;

    var dock = document.createElement('div');
    dock.className = 'stblockDock';
    simulator.appendChild(dock);

    [
      '.runSim',
      '.world',
      '.reset',
      '.stblockRobot',
      '.ruler',
      '.joystick',
      '.hubButtons',
      '.sensors',
      '.cameraSelector'
    ].forEach(function (selector) {
      var control = simulator.querySelector(selector);
      if (control) dock.appendChild(control);
    });
  }

  function activateSimulator() {
    document.querySelectorAll('main nav li.active').forEach(function (element) {
      element.classList.remove('active');
    });
    document.querySelectorAll('.panels > .panel.active').forEach(function (element) {
      element.classList.remove('active');
    });

    var simulator = document.getElementById('simPanel');
    var simulatorNav = document.getElementById('navSim');
    if (simulator) simulator.classList.add('active');
    if (simulatorNav) simulatorNav.classList.add('active');

    function startRenderLoop() {
      if (!window.babylon || !babylon.engine || !babylon.scene) {
        window.setTimeout(startRenderLoop, 100);
        return;
      }
      simPanel.onActive();
      babylon.engine.resize();
      window.dispatchEvent(new Event('resize'));

      // Iframe focus changes must not stop the physics/render loop.

    }

    startRenderLoop();
  }

  function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  function initRobotTestPanel() {
    var robotJSON = getParameterByName('robotJSON');
    if (!robotJSON) return;

    // Create the test panel floating container
    var panel = document.createElement('div');
    panel.id = 'stblockTestPanel';
    panel.className = 'stblock-test-panel';
    panel.innerHTML = 
      '<div class="stblock-test-header">' +
        '<h3>Panel de Prueba de Robot</h3>' +
        '<button id="closeTestPanelBtn">&times;</button>' +
      '</div>' +
      '<div class="stblock-test-body">' +
        '<div class="stblock-test-section">' +
          '<h4>Servomotores</h4>' +
          '<div id="testServosContainer"></div>' +
        '</div>' +
        '<div class="stblock-test-section">' +
          '<h4>Conjunto de Piezas</h4>' +
          '<div id="testPartsContainer"></div>' +
        '</div>' +
        '<div class="stblock-test-section">' +
          '<h4>Sensores</h4>' +
          '<div id="testSensorsContainer"></div>' +
        '</div>' +
        '<div class="stblock-test-section">' +
          '<h4>Controles Rápidos</h4>' +
          '<div class="stblock-test-buttons">' +
            '<button id="btnQuickForward">Avanzar</button>' +
            '<button id="btnQuickBackward">Retroceder</button>' +
            '<button id="btnQuickLeft">Girar Izq</button>' +
            '<button id="btnQuickRight">Girar Der</button>' +
            '<button id="btnQuickStop" class="danger">Detener</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    // Add CSS stylesheet
    var style = document.createElement('style');
    style.innerHTML = `
      .stblock-test-panel {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 320px;
        max-height: calc(100% - 130px);
        background: var(--stb-surface, rgba(10, 15, 29, 0.9));
        border: 1px solid var(--stb-border, rgba(255, 255, 255, 0.3));
        border-radius: 16px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(12px);
        color: white;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .stblock-test-panel.hide {
        opacity: 0;
        transform: translateY(-20px);
        pointer-events: none;
      }
      .stblock-test-header {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid var(--stb-border, rgba(255, 255, 255, 0.3));
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .stblock-test-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
      }
      .stblock-test-header button {
        background: none;
        border: none;
        color: #aaa;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
      }
      .stblock-test-header button:hover {
        color: white;
      }
      .stblock-test-body {
        padding: 14px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .stblock-test-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stblock-test-section h4 {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--stb-blue, #4c6fff);
      }
      .stblock-test-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stblock-test-item-label {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #ccc;
      }
      .stblock-test-item input[type="range"] {
        width: 100%;
        accent-color: var(--stb-blue, #4c6fff);
        cursor: pointer;
      }
      .stblock-test-item select {
        width: 100%;
        background: #0d1424;
        color: white;
        border: 1px solid var(--stb-border, rgba(255, 255, 255, 0.3));
        border-radius: 6px;
        padding: 5px;
        font-size: 11px;
        outline: none;
      }
      .stblock-test-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .stblock-test-buttons button {
        background: rgba(76, 111, 255, 0.15);
        border: 1px solid rgba(76, 111, 255, 0.3);
        color: white;
        border-radius: 6px;
        padding: 8px;
        font-size: 11px;
        cursor: pointer;
      }
      .stblock-test-buttons button:hover {
        background: rgba(76, 111, 255, 0.3);
      }
      .stblock-test-buttons button.danger {
        background: rgba(229, 72, 77, 0.15);
        border: 1px solid rgba(229, 72, 77, 0.3);
        grid-column: span 2;
      }
      .stblock-test-buttons button.danger:hover {
        background: rgba(229, 72, 77, 0.3);
      }
      .sensor-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 11px;
      }
      .sensor-row:last-child {
        border-bottom: none;
      }
      .sensor-port {
        font-family: monospace;
        color: #888;
      }
    `;
    document.head.appendChild(style);

    // Bind Close Button
    document.getElementById('closeTestPanelBtn').onclick = function() {
      panel.classList.add('hide');
    };

    // Add test toggle button to the bottom dock
    var dock = document.querySelector('.stblockDock');
    if (dock) {
      var toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'stblockTestToggle';
      toggleBtn.setAttribute('aria-label', 'Panel de Prueba');
      toggleBtn.setAttribute('data-stblock-label', 'Prueba');
      toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:24px;height:24px;fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>';
      toggleBtn.addEventListener('click', function () {
        panel.classList.toggle('hide');
      });
      dock.appendChild(toggleBtn);

      var toggleStyle = document.createElement('style');
      toggleStyle.innerHTML = `
        body.stblock-gears .stblockTestToggle {
          position: relative;
          inset: auto;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          box-sizing: border-box;
          padding: 0;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.42);
          border-radius: 15px;
          background: linear-gradient(145deg, #ff9f43, #d35400);
          box-shadow: 0 7px 16px rgba(211, 84, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.28);
          cursor: pointer;
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }
        body.stblock-gears .stblockTestToggle:hover {
          transform: translateY(-4px) scale(1.05);
          filter: brightness(1.12);
          box-shadow: 0 12px 24px rgba(211, 84, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.38);
        }
        body.stblock-gears .stblockTestToggle:active {
          transform: translateY(0) scale(0.96);
        }
      `;
      document.head.appendChild(toggleStyle);
    }

    var activeRobot = null;
    var intervalId = null;

    function findRobotAndPopulate() {
      if (typeof robots === 'undefined' || robots.length === 0 || !robots[0].body) {
        setTimeout(findRobotAndPopulate, 100);
        return;
      }
      activeRobot = robots[0];
      populateControls();
      
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(updateStatus, 100);
    }

    function formatPortName(port) {
      if (!port) return '';
      if (port.startsWith('arduino_motor_')) {
        var parts = port.split('_');
        return 'Puente H (' + parts[2] + ',' + parts[3] + ',' + parts[4] + ')';
      }
      return port;
    }

    function populateControls() {
      var servosContainer = document.getElementById('testServosContainer');
      var partsContainer = document.getElementById('testPartsContainer');
      servosContainer.innerHTML = '';
      partsContainer.innerHTML = '';

      var hasServos = false;
      var hasAlternativeParts = false;

      activeRobot.components.forEach(function(comp) {
        if (comp.type === 'ArmActuator' || comp.type === 'SwivelActuator') {
          hasServos = true;
          var minAngle = comp.options.minAngle || -15;
          var maxAngle = comp.options.maxAngle || 180;
          
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          div.innerHTML = 
            '<div class="stblock-test-item-label">' +
              '<span>' + formatPortName(comp.port) + ' (' + (comp.type === 'ArmActuator' ? 'Bisagra' : 'Rotación') + ')</span>' +
              '<span class="servo-val" data-port="' + comp.port + '">0°</span>' +
            '</div>' +
            '<input type="range" class="servo-slider" data-port="' + comp.port + '" min="' + minAngle + '" max="' + maxAngle + '" value="' + (comp.options.startAngle || 0) + '">';
          servosContainer.appendChild(div);

          var slider = div.querySelector('input');
          slider.addEventListener('input', function() {
            comp.speed_sp = 90;
            comp.position_target = parseFloat(slider.value);
            comp.mode = comp.modes.RUN_TO_POS;
          });
        } else if (comp.type === 'LinearActuator') {
          hasServos = true;
          var minVal = comp.options.min || -10;
          var maxVal = comp.options.max || 10;
          
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          div.innerHTML = 
            '<div class="stblock-test-item-label">' +
              '<span>' + formatPortName(comp.port) + ' (Actuador Lineal)</span>' +
              '<span class="servo-val" data-port="' + comp.port + '">0 cm</span>' +
            '</div>' +
            '<input type="range" class="servo-slider" data-port="' + comp.port + '" min="' + minVal + '" max="' + maxVal + '" step="0.1" value="' + (comp.options.startPos || 0) + '">';
          servosContainer.appendChild(div);

          var slider = div.querySelector('input');
          slider.addEventListener('input', function() {
            comp.speed_sp = 30;
            comp.position_target = parseFloat(slider.value) * (comp.options.degreesPerCm || 360);
            comp.mode = comp.modes.RUN_TO_POS;
          });
        } else if (comp.type === 'MagnetActuator') {
          hasServos = true;
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          div.style.flexDirection = 'row';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'space-between';
          div.innerHTML = 
            '<span style="font-size: 11px;">' + formatPortName(comp.port) + ' (Electroimán)</span>' +
            '<button class="stblock-toggle-btn" data-port="' + comp.port + '" style="padding: 4px 8px; font-size: 10px; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 4px;">Encender</button>';
          servosContainer.appendChild(div);

          var btn = div.querySelector('button');
          btn.addEventListener('click', function() {
            if (comp.mode === comp.modes.RUN) {
              comp.stop();
              btn.textContent = 'Encender';
              btn.style.background = 'rgba(255,255,255,0.05)';
            } else {
              comp.speed_sp = 1050;
              comp.mode = comp.modes.RUN;
              btn.textContent = 'Apagar';
              btn.style.background = 'rgba(76, 111, 255, 0.4)';
            }
          });
        } else if (comp.type === 'PaintballLauncherActuator') {
          hasServos = true;
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          div.style.flexDirection = 'row';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'space-between';
          div.innerHTML = 
            '<span style="font-size: 11px;">' + formatPortName(comp.port) + ' (Lanzador Paintball)</span>' +
            '<button style="padding: 4px 8px; font-size: 10px; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 4px;">Disparar</button>';
          servosContainer.appendChild(div);

          var btn = div.querySelector('button');
          btn.addEventListener('click', function() {
            comp.position = -200;
            comp.firePaintball();
          });
        } else if (comp.type === 'Pen') {
          hasServos = true;
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          div.style.flexDirection = 'row';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'space-between';
          div.innerHTML = 
            '<span style="font-size: 11px;">' + formatPortName(comp.port) + ' (Lápiz Trazador)</span>' +
            '<button class="stblock-toggle-btn" data-port="' + comp.port + '" style="padding: 4px 8px; font-size: 10px; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 4px;">Bajar Lápiz</button>';
          servosContainer.appendChild(div);

          var btn = div.querySelector('button');
          btn.addEventListener('click', function() {
            comp.isDown = !comp.isDown;
            if (comp.isDown) {
              btn.textContent = 'Subir Lápiz';
              btn.style.background = 'rgba(76, 111, 255, 0.4)';
            } else {
              btn.textContent = 'Bajar Lápiz';
              btn.style.background = 'rgba(255,255,255,0.05)';
            }
          });
        }

        if (comp.options && comp.options.models && comp.options.models.length > 1) {
          hasAlternativeParts = true;
          var div = document.createElement('div');
          div.className = 'stblock-test-item';
          
          var optionsHtml = '';
          comp.options.models.forEach(function(model, idx) {
            optionsHtml += '<option value="' + idx + '">' + model.name + '</option>';
          });

          div.innerHTML = 
            '<div class="stblock-test-item-label">' +
              '<span>Pieza (' + formatPortName(comp.port) + ')</span>' +
            '</div>' +
            '<select class="part-select-' + comp.port + '">' + optionsHtml + '</select>';
          partsContainer.appendChild(div);

          var select = div.querySelector('select');
          select.addEventListener('change', function() {
            if (typeof comp.setEquippedModel === 'function') {
              comp.setEquippedModel(parseInt(select.value));
            }
          });
        }
      });

      if (!hasServos) {
        servosContainer.innerHTML = '<div style="font-size:11px;color:#aaa;text-align:center;padding:8px;">Sin servomotores</div>';
      }
      if (!hasAlternativeParts) {
        partsContainer.innerHTML = '<div style="font-size:11px;color:#aaa;text-align:center;padding:8px;">Sin piezas alternativas</div>';
      }

      document.getElementById('btnQuickForward').onclick = function() {
        if (!activeRobot.leftWheel || !activeRobot.rightWheel) return;
        activeRobot.leftWheel.speed_sp = 180;
        activeRobot.leftWheel.mode = activeRobot.leftWheel.modes.RUN;
        activeRobot.rightWheel.speed_sp = 180;
        activeRobot.rightWheel.mode = activeRobot.rightWheel.modes.RUN;
      };

      document.getElementById('btnQuickBackward').onclick = function() {
        if (!activeRobot.leftWheel || !activeRobot.rightWheel) return;
        activeRobot.leftWheel.speed_sp = -180;
        activeRobot.leftWheel.mode = activeRobot.leftWheel.modes.RUN;
        activeRobot.rightWheel.speed_sp = -180;
        activeRobot.rightWheel.mode = activeRobot.rightWheel.modes.RUN;
      };

      document.getElementById('btnQuickLeft').onclick = function() {
        if (!activeRobot.leftWheel || !activeRobot.rightWheel) return;
        activeRobot.leftWheel.speed_sp = -180;
        activeRobot.leftWheel.mode = activeRobot.leftWheel.modes.RUN;
        activeRobot.rightWheel.speed_sp = 180;
        activeRobot.rightWheel.mode = activeRobot.rightWheel.modes.RUN;
      };

      document.getElementById('btnQuickRight').onclick = function() {
        if (!activeRobot.leftWheel || !activeRobot.rightWheel) return;
        activeRobot.leftWheel.speed_sp = 180;
        activeRobot.leftWheel.mode = activeRobot.leftWheel.modes.RUN;
        activeRobot.rightWheel.speed_sp = -180;
        activeRobot.rightWheel.mode = activeRobot.rightWheel.modes.RUN;
      };

      document.getElementById('btnQuickStop').onclick = function() {
        if (activeRobot.leftWheel) {
          activeRobot.leftWheel.speed_sp = 0;
          activeRobot.leftWheel.stop();
        }
        if (activeRobot.rightWheel) {
          activeRobot.rightWheel.speed_sp = 0;
          activeRobot.rightWheel.stop();
        }
      };
    }

    function updateStatus() {
      if (!activeRobot) return;

      activeRobot.components.forEach(function(comp) {
        if (comp.type === 'ArmActuator' || comp.type === 'SwivelActuator') {
          var label = document.querySelector('.servo-val[data-port="' + comp.port + '"]');
          if (label) {
            var currentAngle = Math.round(comp.position + comp.positionAdjustment);
            label.textContent = currentAngle + '°';
          }
        } else if (comp.type === 'LinearActuator') {
          var label = document.querySelector('.servo-val[data-port="' + comp.port + '"]');
          if (label) {
            var currentPos = Math.round((comp.position / (comp.options.degreesPerCm || 360)) * 10) / 10;
            label.textContent = currentPos + ' cm';
          }
        }
      });

      var sensorsContainer = document.getElementById('testSensorsContainer');
      if (sensorsContainer) {
        var html = '';
        var hasSensors = false;

        activeRobot.components.forEach(function(comp) {
          var isSensor = comp.type.indexOf('Sensor') !== -1 || comp.type === 'Pen';
          if (isSensor) {
            hasSensors = true;
            var valStr = 'N/A';
            if (comp.type === 'ColorSensor') {
              if (typeof comp.getRGB === 'function') {
                var rgb = comp.getRGB();
                if (typeof Colors !== 'undefined' && typeof Colors.toHSV === 'function') {
                  var hsv = Colors.toHSV(rgb);
                  var color = Colors.toColor(hsv);
                  var colorName = Colors.toColorName(color);
                  valStr = colorName + ' (' + color + ')';
                } else {
                  valStr = 'RGB(' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')';
                }
              }
            } else if (comp.type === 'LineFollowerSensor') {
              if (typeof comp.getReadings === 'function') {
                var readings = comp.getReadings();
                valStr = 'I:' + Math.round(readings[0] * 100) + '% C:' + Math.round(readings[1] * 100) + '% D:' + Math.round(readings[2] * 100) + '%';
              }
            } else if (comp.type === 'GasSensor') {
              if (typeof comp.getPPM === 'function') {
                valStr = Math.round(comp.getPPM()) + ' ppm';
              }
            } else if (comp.type === 'TemperatureSensor') {
              if (typeof comp.getTemperature === 'function') {
                valStr = (Math.round(comp.getTemperature() * 10) / 10) + ' °C';
              }
            } else if (comp.type === 'HumiditySensor') {
              if (typeof comp.getHumidity === 'function') {
                valStr = Math.round(comp.getHumidity()) + ' %';
              }
            } else if (comp.type === 'UltrasonicSensor' || comp.type === 'LaserRangeSensor') {
              if (typeof comp.getDistance === 'function') {
                valStr = (Math.round(comp.getDistance() * 10) / 10) + ' cm';
              }
            } else if (comp.type === 'LidarSensor') {
              if (typeof comp.getDistances === 'function') {
                var dists = comp.getDistances();
                var minLidar = Math.min(...dists);
                valStr = 'Min: ' + (Math.round(minLidar * 10) / 10) + ' cm';
              }
            } else if (comp.type === 'GyroSensor') {
              if (typeof comp.getYawAngle === 'function') {
                valStr = Math.round(comp.getYawAngle()) + '°';
              }
            } else if (comp.type === 'TouchSensor') {
              if (typeof comp.isPressed === 'function') {
                valStr = comp.isPressed() ? 'PRESIONADO' : 'LIBRE';
              }
            } else if (comp.type === 'GPSSensor') {
              if (typeof comp.getPosition === 'function') {
                var pos = comp.getPosition();
                valStr = 'X:' + Math.round(pos[0]) + ' Z:' + Math.round(pos[2]);
              }
            } else {
              valStr = comp.position ? Math.round(comp.position) : 'Activo';
            }

            html += 
              '<div class="sensor-row">' +
                '<span><span class="sensor-port">' + formatPortName(comp.port) + ':</span> ' + comp.type.replace('Sensor','') + '</span>' +
                '<strong>' + valStr + '</strong>' +
              '</div>';
          }
        });

        if (!hasSensors) {
          sensorsContainer.innerHTML = '<div style="font-size:11px;color:#aaa;text-align:center;padding:8px;">Sin sensores</div>';
        } else {
          sensorsContainer.innerHTML = html;
        }
      }
    }

    findRobotAndPopulate();
  }

  function initializeStblockShell() {
    document.body.classList.add('stblock-gears');
    localStorage.setItem('LANG', 'es');
    installRobotTranslations();
    installWorldTranslations();

    labels.forEach(function (entry) {
      var element = document.querySelector(entry[0]);
      if (!element) return;
      element.setAttribute('data-stblock-label', entry[1]);
      element.setAttribute('aria-label', entry[1]);
      element.setAttribute('title', entry[1]);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        element.click();
      });
    });

    addRobotButton();
    createControlDock();
    activateSimulator();
    initRobotTestPanel();
  }

  document.addEventListener('keydown', function (event) {
    if (!event.ctrlKey || !event.altKey || event.code !== 'KeyE') return;
    event.preventDefault();
    console.log('[GEARBOT] Ctrl+Alt+E detectado en stblock-shell');
    if (window.parent !== window) {
      console.log('[GEARBOT] Enviando postMessage al padre');
      window.parent.postMessage({type: 'stblock-open-world-editor'}, '*');
    } else {
      console.log('[GEARBOT] Abriendo editor directamente');
      window.open('/static/velxio/gears/editor/index.html', 'stblock-editor');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStblockShell);
  } else {
    initializeStblockShell();
  }
}());


