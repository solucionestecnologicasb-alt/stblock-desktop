var world_stblockPractice = new function() {
  World_Base.call(this);
  this.parent = {};
  for (var property in this) {
    this.parent[property] = this[property];
  }

  var self = this;
  var colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  this.name = 'stblockPractice';
  this.shortDescription = 'Zona de practica STBlock';
  this.longDescription =
    '<p>Mesa libre de practica de 3 m por 3 m con paredes perimetrales.</p>' +
    '<p>Incluye ocho objetos moviles de diferentes tamanos, colores y posiciones que cambian al reiniciar el escenario.</p>';
  this.thumbnail = 'textures/maps/stblock-academy-floor.png';
  this.optionsConfigurations = [];

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function overlapsCenter(x, z, padding) {
    return Math.abs(x) < padding && Math.abs(z) < padding;
  }

  function createPracticeObjects() {
    var objects = [];

    for (var index = 0; index < 8; index++) {
      var width = Math.round(randomBetween(10, 20));
      var depth = Math.round(randomBetween(10, 20));
      var height = Math.round(randomBetween(8, 20));
      var x;
      var z;

      do {
        x = Math.round(randomBetween(-125, 125));
        z = Math.round(randomBetween(-125, 125));
      } while (overlapsCenter(x, z, 42));

      objects.push({
        type: 'box',
        position: [x, z, height / 2],
        size: [width, depth, height],
        color: colors[index],
        physicsOptions: {
          mass: Math.max(2, Math.round(width * depth * height / 900)),
          friction: 0.45,
          restitution: 0.08,
          dampLinear: 0.12,
          dampAngular: 0.18,
          group: 1,
          mask: -1
        },
        magnetic: index < 4,
        receiveShadows: true,
        castShadows: true
      });
    }

    return objects;
  }

  this.defaultOptions = Object.assign({}, this.defaultOptions, {
    imageURL: 'textures/maps/stblock-academy-floor.png',
    imageScale: 3000 / 1254,
    uScale: 1,
    vScale: 1,
    groundType: 'box',
    wall: true,
    wallHeight: 18,
    wallThickness: 5,
    wallColor: '#162033',
    groundFriction: 0.85,
    wallFriction: 0.4,
    groundRestitution: 0.02,
    wallRestitution: 0.08,
    startPos: 'center',
    startPosXYZStr: '',
    startRotStr: '0',
    objects: []
  });

  this.setOptions = function(options) {
    var selectedOptions = Object.assign({}, self.defaultOptions, options || {});
    selectedOptions.objects = createPracticeObjects();
    self.mergeOptionsWithDefault(selectedOptions);
    return self.parent.setOptions(selectedOptions);
  };

  this.init = function() {
    self.setOptions();
  };
};

world_stblockPractice.init();

if (typeof worlds == 'undefined') {
  var worlds = [];
}
worlds.unshift(world_stblockPractice);
