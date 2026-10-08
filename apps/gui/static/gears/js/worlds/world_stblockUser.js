var world_stblockUser = new function() {
  World_Base.call(this);
  this.parent = {};
  for (var property in this) this.parent[property] = this[property];

  var self = this;
  var objectMeshes = {};
  var ruleStates = {};
  var tweens = [];
  var doorJoints = {};
  var conveyorData = {};
  var elevatorData = {};
  var kinematicData = {};
  var rampPivots = [];
  var scoreState = {teamA: 0, teamB: 0, gameStarted: false, gameOver: false, winner: null};
  var buttonData = {};
  var destructibleData = {};
  var sceneLights = {};
  var teleporterData = {};
  var sounds = {};
  var timerState = {running: false, remaining: 0, pausedAt: 0};
  var terrainZones = [];
  var waterZones = [];

  this.name = 'stblockUser';
  this.shortDescription = 'Escenario creado en STBlock';
  this.longDescription = '<p>Escenario personalizado creado con el editor administrativo de STBlock.</p>';
  this.optionsConfigurations = [];

  this.defaultOptions = Object.assign({}, this.defaultOptions, {
    imageURL: 'textures/maps/custom.png',
    imageScale: 1,
    surfaceType: 'smooth',
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
  });

  function safeNumber(value, fallback, min, max) {
    var number = Number(value);
    if (!isFinite(number)) number = fallback;
    return Math.max(min, Math.min(max, number));
  }

  this.setOptions = function(options) {
    var normalized = Object.assign({}, self.defaultOptions, options || {});
    normalized.ambientLight = safeNumber(normalized.ambientLight, 0.65, 0, 2);
    normalized.directionalLight = safeNumber(normalized.directionalLight, 0.8, 0, 3);
    normalized.gravity = safeNumber(normalized.gravity, -98.1, -300, 0);
    normalized.windStrength = safeNumber(normalized.windStrength, 0, 0, 100);
    normalized.fogDensity = safeNumber(normalized.fogDensity, 0.002, 0, 0.05);
    normalized.objects = Array.isArray(normalized.objects) ? normalized.objects.slice(0, 250) : [];
    terrainZones = normalized.objects.filter(function(object) { return object.editorType === 'terrain'; });
    normalized.objects = normalized.objects.filter(function(object) { return object.editorType !== 'terrain'; });
    normalized.rules = Array.isArray(normalized.rules) ? normalized.rules.slice(0, 100) : [];
    objectMeshes = {};
    ruleStates = {};
    tweens = [];
    doorJoints = {};
    conveyorData = {};
    elevatorData = {};
    kinematicData = {};
    rampPivots = [];
    buttonData = {};
    destructibleData = {};
    sceneLights = {};
    teleporterData = {};
    sounds = {};
    waterZones = [];
    scoreState = {teamA: 0, teamB: 0, gameStarted: false, gameOver: false, winner: null};

    normalized.objects.forEach(function(object, index) {
      object.id = object.id || 'object-' + index;

      // Older maps stored every imported format at scale 1 without recording its units.
      if (object.editorType === 'model' && !object.modelUnit) {
        var modelExtension = String(object.modelURL || '').split('?')[0].split('.').pop().toLowerCase();
        object.modelUnit = modelExtension === 'stl' ? 'mm' :
          modelExtension === 'glb' || modelExtension === 'gltf' ? 'm' : 'cm';
        if (safeNumber(object.modelScale, 1, 0.001, 1000) === 1) {
          object.modelScale = object.modelUnit === 'mm' ? 0.1 : object.modelUnit === 'm' ? 100 : 1;
        }
      }

      if (object.physicsBehavior === 'kinematic') {
        object.motionStart = Array.isArray(object.motionStart) ? object.motionStart.slice(0, 3) : object.position.slice(0, 3);
        object.motionEnd = Array.isArray(object.motionEnd) ? object.motionEnd.slice(0, 3) :
          [object.motionStart[0] + 50, object.motionStart[1], object.motionStart[2]];
        object.motionStart = [
          safeNumber(object.motionStart[0], object.position[0], -5000, 5000),
          safeNumber(object.motionStart[1], object.position[1], -5000, 5000),
          safeNumber(object.motionStart[2], object.position[2], 0, 5000)
        ];
        object.motionEnd = [
          safeNumber(object.motionEnd[0], object.motionStart[0] + 50, -5000, 5000),
          safeNumber(object.motionEnd[1], object.motionStart[1], -5000, 5000),
          safeNumber(object.motionEnd[2], object.motionStart[2], 0, 5000)
        ];
        object.position = object.motionStart.slice();
        object.motionTrigger = object.motionTrigger === 'touch' ? 'touch' : 'always';
        object.motionCycle = ['once', 'returnOnce', 'pingpong', 'loop'].indexOf(object.motionCycle) >= 0 ?
          object.motionCycle : 'pingpong';
        object.motionSpeed = safeNumber(object.motionSpeed, 20, 0.1, 1000);
        object.motionDelay = safeNumber(object.motionDelay, 0, 0, 300);
        object.motionWait = safeNumber(object.motionWait, 0, 0, 300);
        object.motionRetrigger = !!object.motionRetrigger;
        object.physicsOptions = 'fixed';
        if (object.editorType === 'elevator') object.elevatorAuto = false;
        if (object.editorType === 'ramp') object.rampMode = 'fixed';
        object.animationMode = 'none';
        object.animationKeys = [];
      }

      // Doors use a real static anchor and a dynamic leaf around a vertical hinge.
      if (object.editorType === 'door') {
        var doorWidth = safeNumber(object.doorWidth, 30, 5, 500);
        var doorHeight = safeNumber(object.doorHeight, 50, 5, 500);
        var doorThickness = safeNumber(object.doorThickness, 3, 0.5, 50);
        var doorPivot = Array.isArray(object.doorPivot) ? object.doorPivot.slice(0, 3) :
          Array.isArray(object.position) ? object.position.slice(0, 3) : [0, 0, 0];
        var doorBaseYaw = typeof object.doorBaseYaw === 'number' ? object.doorBaseYaw :
          Array.isArray(object.rotation) ? safeNumber(object.rotation[1], 0, -36000, 36000) : 0;
        object.hingeState = object.hingeState === 'open' ? 'open' : 'closed';
        object.hingeOpenAngle = safeNumber(object.hingeOpenAngle, 90, -170, 170);
        object.hingeCloseAngle = safeNumber(object.hingeCloseAngle, 0, -170, 170);
        object.hingeMotorSpeed = safeNumber(object.hingeMotorSpeed, 90, 1, 720);
        object.hingeMotorMaxForce = safeNumber(object.hingeMotorMaxForce, 5000, 100, 50000);
        if (object.hingeMotorMaxForce <= 100) object.hingeMotorMaxForce = 5000;
        object.doorAutoClose = safeNumber(object.doorAutoClose, 0, 0, 300);
        object.doorWidth = doorWidth;
        object.doorHeight = doorHeight;
        object.doorThickness = doorThickness;
        object.doorPivot = doorPivot;
        object.doorBaseYaw = doorBaseYaw;
        object.type = 'box';
        object.size = [doorWidth, doorThickness, doorHeight];
        var initialDoorAngle = object.hingeState === 'open' ? object.hingeOpenAngle : object.hingeCloseAngle;
        var totalDoorYaw = (doorBaseYaw + initialDoorAngle) * Math.PI / 180;
        object.position = [
          doorPivot[0] + Math.cos(totalDoorYaw) * doorWidth / 2,
          doorPivot[1] - Math.sin(totalDoorYaw) * doorWidth / 2,
          doorPivot[2] + doorHeight / 2
        ];
        object.rotation = [0, doorBaseYaw + initialDoorAngle, 0];
        object.physicsOptions = {
          mass: safeNumber(object.doorMass, 20, 1, 500),
          friction: safeNumber(object.friction, 0.6, 0, 5),
          restitution: 0.02,
          dampLinear: 0.2,
          dampAngular: 0.4,
          group: 1,
          mask: -1
        };
      }

      // Fixed ramps are thin inclined plates; mobile ramps are gravity-driven seesaws.
      if (object.editorType === 'ramp') {
        object.rampMode = object.rampMode === 'mobile' ? 'mobile' : 'fixed';
        var rampAngle = safeNumber(object.rampAngle, 30, 1, 60);
        var rampLength = safeNumber(object.rampLength || object.size[1], 100, 10, 1000);
        var rampWidth = safeNumber(object.rampWidth || object.size[0], 40, 10, 500);
        var rampThickness = safeNumber(object.rampThickness, 0.8, 0.25, 1.5);
        object.size = [rampWidth, rampLength, rampThickness];
        object.rotation = Array.isArray(object.rotation) ? object.rotation.slice() : [0, 0, 0];
        if (object.rampMode === 'mobile') {
          object.rotation[0] = 0;
          object.position[2] = Math.max(safeNumber(object.position[2], 5, 0, 5000), rampThickness / 2 + 1);
          object.physicsOptions = {
            mass: safeNumber(object.rampMass, 12, 1, 500),
            friction: safeNumber(object.friction, 0.8, 0, 5),
            restitution: 0.02,
            dampLinear: 0.15,
            dampAngular: 0.08,
            group: 1,
            mask: -1
          };
        } else {
          object.rotation[0] = rampAngle;
          var minimumCenterHeight = rampThickness / 2 + Math.sin(rampAngle * Math.PI / 180) * rampLength / 2;
          object.position[2] = Math.max(safeNumber(object.position[2], 0, 0, 5000), minimumCenterHeight);
          object.physicsOptions = 'fixed';
        }
      }

      // Elevators are thin kinematic platforms. Dynamic mass made them fall.
      if (object.editorType === 'elevator') {
        var oldElevatorThickness = safeNumber(object.size && object.size[2], 5, 0.25, 100);
        var elevatorThickness = safeNumber(object.elevatorThickness, 0.8, 0.25, 1.5);
        object.size = [object.size[0], object.size[1], elevatorThickness];
        if (object.position[2] <= oldElevatorThickness + 0.01) object.position[2] = elevatorThickness / 2;
        object.physicsOptions = 'fixed';
        object.elevatorOffset = safeNumber(object.elevatorOffset, 50, 5, 1000);
        object.elevatorSpeed = safeNumber(object.elevatorSpeed, 20, 1, 200);
        object.elevatorWait = safeNumber(object.elevatorWait, 1, 0, 30);
        object.elevatorAuto = object.elevatorAuto !== false;
      }

      // --- Feature 4: Goal setup ---
      if (object.editorType === 'goal') {
        object.triggerZone = true;
        object.physicsOptions = false;
      }

      // --- Feature 6: Button/pressure plate ---
      if (object.editorType === 'button') {
        buttonData[object.id] = {pressed: false};
      }

      // --- Feature 10: Teleporter ---
      if (object.editorType === 'teleporter') {
        teleporterData[object.id] = {
          targetX: object.teleporterTargetX || 0,
          targetY: object.teleporterTargetY || 0,
          targetZ: object.teleporterTargetZ || 0,
          cooldown: (object.teleporterCooldown || 1) * 1000,
          lastUsed: 0
        };
      }

      // Store data for later use in load()
      if (object.editorType === 'conveyor') {
        conveyorData[object.id] = {
          speed: safeNumber(object.conveyorSpeed, 50, 0, 500),
          force: safeNumber(object.conveyorForce, 200, 0, 2000),
          direction: safeNumber(object.conveyorDirection, 0, -36000, 36000),
          active: object.conveyorActive !== false,
          contacts: {}
        };
      }

      var previousCallback = object.callback;
      object.callback = function(mesh) {
        objectMeshes[object.id] = mesh;
        mesh.stblockObjectId = object.id;
        if (object.physicsBehavior === 'kinematic') {
          var kinematicBody = mesh.physicsImpostor && mesh.physicsImpostor.physicsBody;
          if (kinematicBody) {
            if (typeof kinematicBody.setCollisionFlags === 'function') {
              // Ammo/Bullet: CF_KINEMATIC_OBJECT and DISABLE_DEACTIVATION.
              kinematicBody.setCollisionFlags(kinematicBody.getCollisionFlags() | 2);
              kinematicBody.setActivationState(4);
            } else {
              // Cannon fallback.
              kinematicBody.type = 4;
              kinematicBody.mass = 0;
              kinematicBody.allowSleep = false;
              if (kinematicBody.updateMassProperties) kinematicBody.updateMassProperties();
            }
            mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
            mesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
          }
          kinematicData[object.id] = {
            mesh: mesh,
            object: object,
            start: new BABYLON.Vector3(object.motionStart[0], object.motionStart[2], object.motionStart[1]),
            end: new BABYLON.Vector3(object.motionEnd[0], object.motionEnd[2], object.motionEnd[1]),
            direction: 1,
            active: object.motionTrigger === 'always',
            completed: false,
            returned: false,
            waiting: object.motionDelay * 1000,
            touching: false,
            armed: true
          };
        }
        if (object.editorType === 'elevator') {
          elevatorData[object.id] = {
            mesh: mesh, object: object, bottom: mesh.position.y,
            top: mesh.position.y + object.elevatorOffset, direction: 1, waiting: 0
          };
        }
        if (object.triggerZone || object.editorType === 'goal') {
          mesh.isVisible = object.editorType === 'goal';
          mesh.isPickable = false;
        }

        // Store destructible HP on mesh
        if (object.destructibleHP > 0) {
          mesh.destructibleHP = object.destructibleHP;
          mesh.destructibleMaxHP = object.destructibleHP;
          mesh.destructibleRespawnTime = object.destructibleRespawnTime || 0;
        }

        if (object.editorType === 'button') {
          buttonData[object.id].mesh = mesh;
        }

        if (object.editorType === 'light') {
          mesh.lightColor = object.lightColor || '#ffffff';
          mesh.lightIntensity = object.lightIntensity || 1;
          mesh.lightRange = object.lightRange || 50;
          mesh.lightEnabled = true;
        }

        if (object.editorType === 'sound') {
          mesh.soundURL = object.soundURL || '';
          mesh.soundLoop = !!object.soundLoop;
          mesh.soundVolume = safeNumber(object.soundVolume, 0.5, 0, 1);
        }

        if (typeof previousCallback === 'function') previousCallback(mesh);
      };
    });
    self.mergeOptionsWithDefault(normalized);
    return self.parent.setOptions(normalized);
  };

  function actorInsideTrigger(rule, trigger) {
    if (!trigger || !trigger.isEnabled()) return false;
    if (rule.actorId === 'robot') {
      if (typeof robot === 'undefined' || !robot || !robot.body) return false;
      return trigger.intersectsPoint(robot.body.getAbsolutePosition());
    }
    var actor = objectMeshes[rule.actorId];
    return !!actor && actor.isEnabled() && trigger.intersectsMesh(actor, false);
  }

  function moveTarget(target, rule) {
    var offset = Array.isArray(rule.offset) ? rule.offset : [0, 0, 0];
    var destination = target.position.add(new BABYLON.Vector3(
      safeNumber(offset[0], 0, -5000, 5000),
      safeNumber(offset[2], 0, -5000, 5000),
      safeNumber(offset[1], 0, -5000, 5000)
    ));
    var duration = safeNumber(rule.duration, 1, 0, 30) * 1000;
    if (duration === 0) {
      target.position.copyFrom(destination);
      if (target.physicsImpostor) target.physicsImpostor.forceUpdate();
      return;
    }
    tweens.push({mesh: target, from: target.position.clone(), to: destination, elapsed: 0, duration: duration});
  }

  function executeRule(rule) {
    var target = objectMeshes[rule.targetId];

    // Global light actions
    if (rule.action === 'lightOn' || rule.action === 'lightOff') {
      babylon.scene.lights.forEach(function(light) {
        light.intensity = rule.action === 'lightOff' ? 0 :
          light instanceof BABYLON.HemisphericLight ? self.processedOptions.ambientLight :
            self.processedOptions.directionalLight;
      });
      return;
    }

    // Per-object light actions
    if (rule.action === 'objectLightOn' || rule.action === 'objectLightOff') {
      if (target && sceneLights[rule.targetId]) {
        sceneLights[rule.targetId].setEnabled(rule.action === 'objectLightOn');
      }
      return;
    }
    if (rule.action === 'setLightColor' && target && sceneLights[rule.targetId]) {
      sceneLights[rule.targetId].diffuse = BABYLON.Color3.FromHexString(rule.color || '#ffffff');
      return;
    }

    // Door actions
    if (rule.action === 'openDoor' || rule.action === 'closeDoor' || rule.action === 'toggleDoor') {
      var door = doorJoints[rule.targetId];
      if (door) {
        if (rule.action === 'openDoor') door.targetState = 'open';
        else if (rule.action === 'closeDoor') door.targetState = 'closed';
        else door.targetState = door.targetState === 'open' ? 'closed' : 'open';
        door.autoCloseRemaining = 0;
        door.reachedTarget = false;
        console.info('[STBLOCK-DOOR] command', {id: rule.targetId, state: door.targetState});
      }
      return;
    }

    // Conveyor actions
    if (rule.action === 'startConveyor' || rule.action === 'stopConveyor' || rule.action === 'reverseConveyor') {
      if (conveyorData[rule.targetId]) {
        if (rule.action === 'startConveyor') conveyorData[rule.targetId].active = true;
        else if (rule.action === 'stopConveyor') conveyorData[rule.targetId].active = false;
        else if (rule.action === 'reverseConveyor') conveyorData[rule.targetId].direction += 180;
      }
      return;
    }

    // Score actions
    if (rule.action === 'scoreGoal') {
      var team = rule.team || 'A';
      if (team === 'A') scoreState.teamA++;
      else scoreState.teamB++;
      updateScoreboard();
      return;
    }
    if (rule.action === 'resetScore') {
      scoreState.teamA = 0;
      scoreState.teamB = 0;
      updateScoreboard();
      return;
    }

    // Timer actions
    if (rule.action === 'startTimer') {
      timerState.running = true;
      if (timerState.remaining <= 0) {
        timerState.remaining = self.processedOptions.winTimerDuration || 60;
      }
      timerState.pausedAt = 0;
      return;
    }
    if (rule.action === 'stopTimer') {
      timerState.running = false;
      timerState.pausedAt = timerState.remaining;
      return;
    }
    if (rule.action === 'resetTimer') {
      timerState.running = false;
      timerState.remaining = self.processedOptions.winTimerDuration || 60;
      timerState.pausedAt = 0;
      return;
    }
    if (rule.action === 'addTime') {
      var amount = safeNumber(rule.offset ? rule.offset[0] : 10, 10, -300, 300);
      timerState.remaining = Math.max(0, timerState.remaining + amount);
      return;
    }

    // Destructible actions
    if (rule.action === 'damage' || rule.action === 'heal' || rule.action === 'destroy' || rule.action === 'repair') {
      if (target) {
        var hp = target.destructibleHP || 0;
        var maxHP = target.destructibleMaxHP || 1;
        if (rule.action === 'damage') {
          var dmg = safeNumber(rule.offset ? rule.offset[0] : 10, 10, 0, 10000);
          target.destructibleHP = Math.max(0, hp - dmg);
        } else if (rule.action === 'heal') {
          var heal = safeNumber(rule.offset ? rule.offset[0] : 10, 10, 0, 10000);
          target.destructibleHP = Math.min(maxHP, hp + heal);
        } else if (rule.action === 'destroy') {
          target.destructibleHP = 0;
        } else if (rule.action === 'repair') {
          target.destructibleHP = maxHP;
        }
        checkDestructible(target);
      }
      return;
    }

    // Button actions
    if (rule.action === 'pressButton' || rule.action === 'releaseButton') {
      if (buttonData[rule.targetId]) {
        var pressed = rule.action === 'pressButton';
        setButtonState(rule.targetId, pressed);
      }
      return;
    }

    // Teleporter actions
    if (rule.action === 'teleport') {
      if (teleporterData[rule.targetId]) {
        doTeleport(rule.targetId, rule);
      }
      return;
    }

    // Sound actions
    if (rule.action === 'playSound' || rule.action === 'stopSound' || rule.action === 'pauseSound' || rule.action === 'setVolume') {
      if (sounds[rule.targetId]) {
        var snd = sounds[rule.targetId];
        if (rule.action === 'playSound') {
          if (snd.isPlaying) snd.stop();
          snd.play();
        } else if (rule.action === 'stopSound') {
          snd.stop();
        } else if (rule.action === 'pauseSound') {
          snd.pause();
        } else if (rule.action === 'setVolume') {
          var vol = safeNumber(rule.offset ? rule.offset[0] : 0.5, 0.5, 0, 1);
          snd.setVolume(vol);
        }
      }
      return;
    }

    // Elevator actions
    if (rule.action === 'raiseElevator' || rule.action === 'lowerElevator') {
      if (target) {
        if (elevatorData[rule.targetId]) {
          elevatorData[rule.targetId].object.elevatorAuto = false;
        }
        var offsetY = (rule.action === 'raiseElevator' ? 1 : -1) * safeNumber(rule.offset ? rule.offset[2] : 50, 50, 0, 1000);
        var destination = target.position.add(new BABYLON.Vector3(0, offsetY, 0));
        var duration = safeNumber(rule.duration, 2, 0, 30) * 1000;
        if (duration === 0) {
          target.position.copyFrom(destination);
          if (target.physicsImpostor) target.physicsImpostor.forceUpdate();
          return;
        }
        tweens.push({mesh: target, from: target.position.clone(), to: destination, elapsed: 0, duration: duration});
      }
      return;
    }

    // Ramp actions
    if (rule.action === 'moveRamp') {
      if (target) moveTarget(target, rule);
      return;
    }

    // Existing actions
    if (!target) return;
    if (rule.action === 'move') moveTarget(target, rule);
    if (rule.action === 'toggleVisibility') target.setEnabled(!target.isEnabled());
    if (rule.action === 'show') target.setEnabled(true);
    if (rule.action === 'hide') target.setEnabled(false);
    if (rule.action === 'color' && rule.color) {
      target.material = target.material ? target.material.clone(target.id + '-rule-material') :
        new BABYLON.StandardMaterial(target.id + '-rule-material', babylon.scene);
      target.material.diffuseColor = BABYLON.Color3.FromHexString(rule.color);
    }
  }

  function renderRules() {
    (self.processedOptions.rules || []).forEach(function(rule) {
      var state = ruleStates[rule.id] || {inside: false, completed: false};
      var inside = actorInsideTrigger(rule, objectMeshes[rule.triggerId]);
      if (inside && !state.inside && !(rule.once && state.completed)) {
        executeRule(rule);
        state.completed = true;
      }
      state.inside = inside;
      ruleStates[rule.id] = state;
    });
  }

  function renderTweens(delta) {
    tweens = tweens.filter(function(tween) {
      tween.elapsed += delta;
      var amount = Math.min(1, tween.elapsed / tween.duration);
      tween.mesh.position.copyFrom(BABYLON.Vector3.Lerp(tween.from, tween.to, amount));
      if (tween.mesh.physicsImpostor) tween.mesh.physicsImpostor.forceUpdate();
      return amount < 1;
    });
  }

  function normalizeRadians(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function doorYaw(mesh) {
    if (!mesh.rotationQuaternion) return mesh.rotation.y;
    var q = mesh.rotationQuaternion;
    return Math.atan2(
      2 * (q.w * q.y + q.x * q.z),
      1 - 2 * (q.y * q.y + q.z * q.z)
    );
  }


  function renderDoorMotors(delta) {
    Object.keys(doorJoints).forEach(function(id) {
      var door = doorJoints[id];
      var object = door.object;
      if (door.targetState === 'open' && door.reachedTarget && object.doorAutoClose > 0) {
        door.autoCloseRemaining += delta;
        if (door.autoCloseRemaining >= object.doorAutoClose * 1000) {
          door.targetState = 'closed';
          door.reachedTarget = false;
          door.autoCloseRemaining = 0;
          console.info('[STBLOCK-DOOR] auto-close', {id: id});
        }
      }

      var current = normalizeRadians(doorYaw(door.mesh) - object.doorBaseYaw * Math.PI / 180);
      var desiredDegrees = door.targetState === 'open' ? object.hingeOpenAngle : object.hingeCloseAngle;
      var desired = desiredDegrees * Math.PI / 180;
      var error = normalizeRadians(desired - current);
      var tolerance = 1.5 * Math.PI / 180;
      if (Math.abs(error) <= tolerance) {
        // Keep a corrective hinge motor active. Moving the leaf transform here
        // creates penetrations that can lift robots or stall Cannon's solver.
        door.joint.setMotor(error > 0 ? -0.01 : error < 0 ? 0.01 : 0, object.hingeMotorMaxForce);
        if (!door.reachedTarget) {
          door.reachedTarget = true;
          door.autoCloseRemaining = 0;
          console.info('[STBLOCK-DOOR] reached', {id: id, state: door.targetState, angle: current * 180 / Math.PI});
        }
        return;
      }

      door.reachedTarget = false;
      var maximumMotorSpeed = object.hingeMotorSpeed * Math.PI / 180;
      var motorSpeed = Math.min(maximumMotorSpeed, Math.max(0.04, Math.abs(error) * 3));
      door.joint.setMotor(error > 0 ? -motorSpeed : motorSpeed, object.hingeMotorMaxForce);
    });
  }

  function meshesTouchWithPadding(first, second, padding) {
    if (!first || !second || !first.isEnabled() || !second.isEnabled()) return false;
    first.computeWorldMatrix(true);
    second.computeWorldMatrix(true);
    var a = first.getBoundingInfo().boundingBox;
    var b = second.getBoundingInfo().boundingBox;
    return a.minimumWorld.x <= b.maximumWorld.x + padding && a.maximumWorld.x + padding >= b.minimumWorld.x &&
      a.minimumWorld.y <= b.maximumWorld.y + padding && a.maximumWorld.y + padding >= b.minimumWorld.y &&
      a.minimumWorld.z <= b.maximumWorld.z + padding && a.maximumWorld.z + padding >= b.minimumWorld.z;
  }

  function activeRobotBodies() {
    if (typeof robots !== 'undefined' && Array.isArray(robots)) {
      return robots.filter(function(item) {
        return item && !item.disabled && item.body && item.body.physicsImpostor;
      }).map(function(item) { return item.body; });
    }
    if (typeof robot !== 'undefined' && robot && robot.body && robot.body.physicsImpostor) return [robot.body];
    return [];
  }

  function resetKinematic(data) {
    data.mesh.position.copyFrom(data.start);
    if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.forceUpdate();
    data.direction = 1;
    data.returned = false;
    data.completed = false;
    data.waiting = data.object.motionDelay * 1000;
  }

  function renderKinematics(delta) {
    Object.keys(kinematicData).forEach(function(id) {
      var data = kinematicData[id];
      var touching = activeRobotBodies().some(function(body) {
        return meshesTouchWithPadding(data.mesh, body, 1.2);
      });

      if (data.object.motionTrigger === 'touch' && !data.active) {
        if (!touching) data.armed = true;
        if (touching && data.armed && (!data.completed || data.object.motionRetrigger)) {
          if (data.completed) resetKinematic(data);
          data.active = true;
          data.armed = false;
          console.info('[STBLOCK-KINEMATIC] started', {id: id, trigger: 'touch'});
        }
      }
      data.touching = touching;
      if (!data.active || data.completed) {
        if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        return;
      }
      if (data.waiting > 0) {
        data.waiting = Math.max(0, data.waiting - delta);
        if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        return;
      }

      var target = data.direction > 0 ? data.end : data.start;
      var remaining = target.subtract(data.mesh.position);
      var distance = remaining.length();
      var safeDelta = Math.min(Math.max(delta, 1), 50);
      var step = Math.min(2, data.object.motionSpeed * safeDelta / 1000);
      if (distance > step) {
        var displacement = remaining.scale(step / distance);
        data.mesh.position.addInPlace(displacement);
        if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.forceUpdate();
        return;
      }

      // The final correction is below one physics step, so it cannot tunnel
      // deeply into another body. Stop before selecting the next cycle leg.
      if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
      data.mesh.position.copyFrom(target);
      if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.forceUpdate();
      data.waiting = data.object.motionWait * 1000;
      if (data.object.motionCycle === 'pingpong') {
        data.direction *= -1;
      } else if (data.object.motionCycle === 'loop') {
        data.mesh.position.copyFrom(data.start);
        if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.forceUpdate();
        data.direction = 1;
      } else if (data.object.motionCycle === 'returnOnce' && data.direction > 0) {
        data.direction = -1;
        data.returned = true;
      } else {
        data.active = false;
        data.completed = true;
        console.info('[STBLOCK-KINEMATIC] completed', {id: id, cycle: data.object.motionCycle});
      }
    });
  }

  function renderElevators(delta) {
    Object.keys(elevatorData).forEach(function(id) {
      var data = elevatorData[id];
      if (!data.object.elevatorAuto || !data.mesh || !data.mesh.isEnabled()) return;
      if (data.waiting > 0) {
        data.waiting = Math.max(0, data.waiting - delta);
        return;
      }
      var previousY = data.mesh.position.y;
      var nextY = previousY + data.object.elevatorSpeed * delta / 1000 * data.direction;
      if (nextY >= data.top) {
        nextY = data.top; data.direction = -1; data.waiting = data.object.elevatorWait * 1000;
      } else if (nextY <= data.bottom) {
        nextY = data.bottom; data.direction = 1; data.waiting = data.object.elevatorWait * 1000;
      }
      var movement = nextY - previousY;
      data.mesh.position.y = nextY;
      if (data.mesh.physicsImpostor) data.mesh.physicsImpostor.forceUpdate();

      if (movement !== 0 && typeof robot !== 'undefined' && robot && robot.body) {
        var robotPosition = robot.body.getAbsolutePosition();
        var platformPosition = data.mesh.getAbsolutePosition();
        var platformTop = platformPosition.y + data.object.size[2] / 2;
        var isAbove = Math.abs(robotPosition.x - platformPosition.x) <= data.object.size[0] / 2 + 4 &&
          Math.abs(robotPosition.z - platformPosition.z) <= data.object.size[1] / 2 + 4 &&
          robotPosition.y >= platformTop - 2 && robotPosition.y <= platformTop + 12;
        if (isAbove) {
          robot.body.position.y += movement;
          if (robot.body.physicsImpostor) robot.body.physicsImpostor.forceUpdate();
        }
      }
    });
  }

  function bodyIsOnConveyor(conveyor, body) {
    if (!conveyor || !body || !conveyor.isEnabled() || !body.isEnabled()) return false;
    conveyor.computeWorldMatrix(true);
    body.computeWorldMatrix(true);
    var belt = conveyor.getBoundingInfo().boundingBox;
    var actor = body.getBoundingInfo().boundingBox;
    var horizontalOverlap = actor.maximumWorld.x >= belt.minimumWorld.x &&
      actor.minimumWorld.x <= belt.maximumWorld.x &&
      actor.maximumWorld.z >= belt.minimumWorld.z &&
      actor.minimumWorld.z <= belt.maximumWorld.z;
    var verticalGap = actor.minimumWorld.y - belt.maximumWorld.y;
    return horizontalOverlap && verticalGap >= -1.5 && verticalGap <= 3.5;
  }

  function renderConveyors(delta) {
    var scene = babylon.scene;
    if (!scene) return;
    var deltaSeconds = Math.min(Math.max(delta, 0), 100) / 1000;
    for (var id in conveyorData) {
      var conv = conveyorData[id];
      if (!conv.active || conv.speed <= 0 || conv.force <= 0) continue;
      var mesh = objectMeshes[id];
      if (!mesh || !mesh.isEnabled()) continue;

      var radians = conv.direction * Math.PI / 180;
      var direction = new BABYLON.Vector3(Math.cos(radians), 0, Math.sin(radians));
      var currentContacts = {};
      scene.meshes.forEach(function(body) {
        if (body === mesh || !body.physicsImpostor) return;
        if (body.physicsImpostor.getParam('mass') <= 0) return;
        if (!bodyIsOnConveyor(mesh, body)) return;

        currentContacts[body.uniqueId] = true;
        if (!conv.contacts[body.uniqueId]) {
          console.info('[STBLOCK-CONVEYOR] contact', {
            conveyor: id, body: body.name, speed: conv.speed, force: conv.force, direction: conv.direction
          });
        }

        var velocity = body.physicsImpostor.getLinearVelocity() || BABYLON.Vector3.Zero();
        var currentAlongBelt = BABYLON.Vector3.Dot(velocity, direction);
        var speedDifference = conv.speed - currentAlongBelt;
        var maxSpeedChange = conv.force * deltaSeconds;
        var speedChange = Math.max(-maxSpeedChange, Math.min(maxSpeedChange, speedDifference));
        body.physicsImpostor.setLinearVelocity(velocity.add(direction.scale(speedChange)));
      });
      conv.contacts = currentContacts;
    }
  }

  function renderButtons() {
    for (var id in buttonData) {
      var btn = buttonData[id];
      var mesh = btn.mesh;
      if (!mesh || !mesh.isEnabled()) continue;
      var scene = babylon.scene;
      var pressed = false;
      scene.meshes.forEach(function(otherMesh) {
        if (otherMesh === mesh) return;
        if (!otherMesh.physicsImpostor) return;
        if (otherMesh.physicsImpostor.getParam('mass') <= 0) return;
        var dist = BABYLON.Vector3.Distance(
          mesh.getAbsolutePosition(),
          otherMesh.getAbsolutePosition()
        );
        if (dist < Math.max(mesh.scaling.x, mesh.scaling.z) * 1.5) {
          pressed = true;
        }
      });
      if (pressed !== btn.pressed) {
        btn.pressed = pressed;
        // Change color based on state
        if (mesh.material) {
          var color = pressed ? '#22c55e' : '#e5484d';
          mesh.material.diffuseColor = BABYLON.Color3.FromHexString(color);
        }
        // Trigger associated rules
        if (pressed) {
          (self.processedOptions.rules || []).forEach(function(rule) {
            if (rule.triggerId === id && rule.action === 'pressButton') {
              executeRule(rule);
            }
          });
        }
      }
    }
  }

  function checkDestructible(mesh) {
    if (!mesh || mesh.destructibleHP == null) return;
    if (mesh.destructibleHP <= 0) {
      mesh.setEnabled(false);
      if (mesh.physicsImpostor) {
        mesh.physicsImpostor.dispose();
        mesh.physicsImpostor = null;
      }
      if (mesh.destructibleRespawnTime > 0) {
        setTimeout(function() {
          mesh.destructibleHP = mesh.destructibleMaxHP;
          mesh.setEnabled(true);
        }, mesh.destructibleRespawnTime * 1000);
      }
    } else if (!mesh.isEnabled() && mesh.destructibleHP > 0) {
      mesh.setEnabled(true);
    }
  }

  function setButtonState(id, pressed) {
    if (!buttonData[id]) return;
    var mesh = buttonData[id].mesh;
    if (!mesh) return;
    buttonData[id].pressed = pressed;
    if (mesh.material) {
      var color = pressed ? '#22c55e' : '#e5484d';
      mesh.material.diffuseColor = BABYLON.Color3.FromHexString(color);
    }
    // Scale visual
    if (pressed) {
      mesh.scaling.y = 0.5;
    } else {
      mesh.scaling.y = 1.0;
    }
  }

  function doTeleport(id, rule) {
    var tp = teleporterData[id];
    if (!tp) return;
    var now = Date.now();
    if (now < tp.lastUsed + tp.cooldown) return;
    tp.lastUsed = now;
    var targetPos = new BABYLON.Vector3(tp.targetX, tp.targetZ || 0, tp.targetY);
    if (typeof robot !== 'undefined' && robot && robot.body) {
      robot.body.position.copyFrom(targetPos);
      if (robot.body.physicsImpostor) robot.body.physicsImpostor.forceUpdate();
    }
  }

  function updateScoreboard() {
    if (!self.processedOptions.scoreboardEnabled) return;
    if (typeof self.$scoreA !== 'undefined') {
      self.$scoreA.textContent = scoreState.teamA;
      self.$scoreB.textContent = scoreState.teamB;
    }
    evaluateWinConditions();
  }

  function evaluateWinConditions() {
    if (scoreState.gameOver) return;
    var winCondition = self.processedOptions.winCondition || 'none';
    if (winCondition === 'score' || winCondition === 'firstTo') {
      var winScore = self.processedOptions.winTargetScore || 5;
      if (scoreState.teamA >= winScore) {
        scoreState.gameOver = true;
        scoreState.winner = 'A';
        handleWin('A');
      } else if (scoreState.teamB >= winScore) {
        scoreState.gameOver = true;
        scoreState.winner = 'B';
        handleWin('B');
      }
    }
  }

  function handleWin(team) {
    if (typeof self.$winnerText !== 'undefined') {
      var name = team === 'A' ? self.processedOptions.scoreboardTeamA : self.processedOptions.scoreboardTeamB;
      self.$winnerText.textContent = 'Ganador: ' + name;
    }
    var onComplete = self.processedOptions.winOnComplete || 'stopAll';
    if (onComplete === 'stopAll' && typeof self.panel !== 'undefined') {
      self.panel.stopSim(true);
    }
  }

  function evaluateTimer() {
    if (!timerState.running) return;
    if (timerState.remaining <= 0) {
      timerState.running = false;
      var onComplete = self.processedOptions.winOnComplete || 'stopAll';
      if (onComplete === 'stopAll' && typeof self.panel !== 'undefined') {
        self.panel.stopSim(true);
      }
      return;
    }
  }

  var terrainStyles = {
    smooth: {color: '#f5f7fb', friction: 0.8, roughness: 0},
    rough: {color: '#9ca3af', friction: 1.25, roughness: 3.5},
    earth: {color: '#8a5d35', friction: 1.05, roughness: 2.5},
    sand: {color: '#d8b879', friction: 1.4, roughness: 1.5},
    grass: {color: '#5f9d52', friction: 1.0, roughness: 1.2},
    ice: {color: '#ccecff', friction: 0.03, roughness: 0},
    water: {color: '#4aa7d8', friction: 2.2, roughness: 0}
  };

  function terrainRandom(seed) {
    var value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function terrainMaterial(scene, type, alpha) {
    var style = terrainStyles[type] || terrainStyles.rough;
    var material = new BABYLON.StandardMaterial('terrain-' + type + '-' + Math.random(), scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(style.color);
    material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    material.alpha = typeof alpha === 'number' ? alpha : 1;
    return material;
  }

  function createTerrainTile(scene, name, x, z, width, depth, height, type, friction, material) {
    var tile = BABYLON.MeshBuilder.CreateBox(name, {
      width: width + 0.08,
      depth: depth + 0.08,
      height: height
    }, scene);
    tile.position = new BABYLON.Vector3(x, height / 2, z);
    tile.material = material || terrainMaterial(scene, type);
    tile.receiveShadows = true;
    tile.physicsImpostor = new BABYLON.PhysicsImpostor(tile, BABYLON.PhysicsImpostor.BoxImpostor, {
      mass: 0, friction: friction, restitution: 0.01, group: 1, mask: -1
    }, scene);
    return tile;
  }

  function createTerrainZone(scene, zone, index) {
    var type = zone.terrainType || 'rough';
    var style = terrainStyles[type] || terrainStyles.rough;
    var width = Math.max(5, safeNumber(zone.size && zone.size[0], 80, 5, 5000));
    var depth = Math.max(5, safeNumber(zone.size && zone.size[1], 80, 5, 5000));
    var centerX = safeNumber(zone.position && zone.position[0], 0, -5000, 5000);
    var centerZ = safeNumber(zone.position && zone.position[1], 0, -5000, 5000);
    var roughness = safeNumber(zone.terrainRoughness, style.roughness, 0, 20);
    var material = terrainMaterial(scene, type);

    if (type === 'water') {
      var water = BABYLON.MeshBuilder.CreateBox('terrain-water-' + index, {
        width: width, depth: depth, height: 0.12
      }, scene);
      water.position = new BABYLON.Vector3(centerX, 0.06, centerZ);
      material.alpha = 0.58;
      water.material = material;
      waterZones.push({x: centerX, z: centerZ, width: width, depth: depth});
      return;
    }

    if (roughness <= 0 || type === 'smooth' || type === 'ice') {
      createTerrainTile(scene, 'terrain-flat-' + index, centerX, centerZ, width, depth, 0.18,
        type, style.friction, material);
      return;
    }

    var columns = Math.max(3, Math.min(16, Math.round(width / 14)));
    var rows = Math.max(3, Math.min(16, Math.round(depth / 14)));
    var tileWidth = width / columns;
    var tileDepth = depth / rows;
    for (var row = 0; row < rows; row++) {
      for (var column = 0; column < columns; column++) {
        var seed = (index + 1) * 10000 + row * columns + column;
        var height = 0.25 + terrainRandom(seed) * roughness;
        var x = centerX - width / 2 + tileWidth * (column + 0.5);
        var z = centerZ - depth / 2 + tileDepth * (row + 0.5);
        createTerrainTile(scene, 'terrain-' + index + '-' + row + '-' + column,
          x, z, tileWidth, tileDepth, height, type, style.friction, material);
      }
    }
  }

  function createTerrain(scene) {
    var globalType = self.processedOptions.surfaceType || 'smooth';
    if (globalType !== 'smooth' && globalType !== 'custom') {
      createTerrainZone(scene, {
        terrainType: globalType,
        terrainRoughness: (terrainStyles[globalType] || terrainStyles.rough).roughness,
        position: [0, 0, 0],
        size: [self.processedOptions.groundLength, self.processedOptions.groundWidth, 0]
      }, 0);
    }
    terrainZones.forEach(function(zone, index) {
      createTerrainZone(scene, zone, index + 1);
    });
  }

  function applyWaterResistance() {
    if (!waterZones.length || typeof robot === 'undefined' || !robot || !robot.body ||
        !robot.body.physicsImpostor) return;
    var position = robot.body.getAbsolutePosition();
    var inWater = waterZones.some(function(zone) {
      return Math.abs(position.x - zone.x) <= zone.width / 2 &&
        Math.abs(position.z - zone.z) <= zone.depth / 2 && position.y < 25;
    });
    if (!inWater) return;
    var velocity = robot.body.physicsImpostor.getLinearVelocity();
    var angularVelocity = robot.body.physicsImpostor.getAngularVelocity();
    if (velocity) robot.body.physicsImpostor.setLinearVelocity(velocity.scale(0.88));
    if (angularVelocity) robot.body.physicsImpostor.setAngularVelocity(angularVelocity.scale(0.82));
  }
  this.load = function(scene) {
    return self.parent.load(scene).then(function() {
      scene.clearColor = BABYLON.Color4.FromHexString(self.processedOptions.skyColor + 'ff');
      scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, self.processedOptions.gravity, 0));
      scene.lights.forEach(function(light) {
        if (light instanceof BABYLON.HemisphericLight) {
          light.intensity = self.processedOptions.ambientLight;
          light.diffuse = BABYLON.Color3.FromHexString(self.processedOptions.lightColor);
        } else {
          light.intensity = self.processedOptions.directionalLight;
        }
      });
      createTerrain(scene);

      // Build gravity-driven seesaw ramps around a fixed center pivot.
      self.processedOptions.objects.forEach(function(obj) {
        if (obj.editorType !== 'ramp' || obj.rampMode !== 'mobile') return;
        var rampMesh = objectMeshes[obj.id];
        if (!rampMesh || !rampMesh.physicsImpostor) return;
        var pivot = BABYLON.MeshBuilder.CreateBox('ramp-pivot-' + obj.id, {size: 0.5}, scene);
        pivot.position.copyFrom(rampMesh.position);
        pivot.isVisible = false;
        pivot.physicsImpostor = new BABYLON.PhysicsImpostor(
          pivot, BABYLON.PhysicsImpostor.BoxImpostor,
          {mass: 0, friction: 0.8, restitution: 0}, scene
        );
        var yaw = (obj.rotation[1] || 0) * Math.PI / 180;
        var joint = new BABYLON.HingeJoint({
          mainPivot: BABYLON.Vector3.Zero(),
          connectedPivot: BABYLON.Vector3.Zero(),
          mainAxis: new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)),
          connectedAxis: new BABYLON.Vector3(1, 0, 0)
        });
        pivot.physicsImpostor.addJoint(rampMesh.physicsImpostor, joint);
        var support = BABYLON.MeshBuilder.CreateCylinder('ramp-support-' + obj.id, {
          height: obj.size[0] + 4, diameter: 2.5, tessellation: 24
        }, scene);
        support.position.copyFrom(rampMesh.position);
        support.position.y -= obj.size[2] / 2 + 1.25;
        support.rotation.z = Math.PI / 2;
        support.material = babylon.getMaterial(scene, '777');
        rampPivots.push({anchor: pivot, support: support, joint: joint});
      });

      if (self.processedOptions.fogEnabled) {
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogDensity = self.processedOptions.fogDensity;
        scene.fogColor = BABYLON.Color3.FromHexString(self.processedOptions.fogColor);
      }

      // Create physical door anchors and vertical hinge motors.
      self.processedOptions.objects.forEach(function(obj) {
        if (obj.editorType !== 'door') return;
        var doorMesh = objectMeshes[obj.id];
        if (!doorMesh || !doorMesh.physicsImpostor) return;
        var anchor = BABYLON.MeshBuilder.CreateBox('door-anchor-' + obj.id, {size: 0.5}, scene);
        anchor.position = new BABYLON.Vector3(
          obj.doorPivot[0], obj.doorPivot[2] + obj.doorHeight / 2, obj.doorPivot[1]
        );
        anchor.isVisible = false;
        anchor.material = babylon.getMaterial(scene, '0000');
        anchor.physicsImpostor = new BABYLON.PhysicsImpostor(
          anchor, BABYLON.PhysicsImpostor.BoxImpostor,
          {mass: 0, friction: 0.6, restitution: 0}, scene
        );
        var joint = new BABYLON.HingeJoint({
          mainPivot: BABYLON.Vector3.Zero(),
          connectedPivot: new BABYLON.Vector3(-obj.doorWidth / 2, 0, 0),
          mainAxis: BABYLON.Axis.Y,
          connectedAxis: BABYLON.Axis.Y
        });
        anchor.physicsImpostor.addJoint(doorMesh.physicsImpostor, joint);
        joint.setMotor(0, obj.hingeMotorMaxForce);
        doorJoints[obj.id] = {
          object: obj,
          mesh: doorMesh,
          anchor: anchor,
          joint: joint,
          targetState: obj.hingeState,
          reachedTarget: false,
          autoCloseRemaining: 0
        };
        console.info('[STBLOCK-DOOR] ready', {id: obj.id, state: obj.hingeState});
      });

      // --- Feature 8: Create per-object lights ---
      self.processedOptions.objects.forEach(function(obj) {
        var mesh = objectMeshes[obj.id];
        if (obj.editorType === 'light' && mesh) {
          try {
            var light = new BABYLON.PointLight('light-' + obj.id, mesh.position, scene);
            light.diffuse = BABYLON.Color3.FromHexString(obj.lightColor || '#ffffff');
            light.intensity = obj.lightIntensity || 1;
            light.range = obj.lightRange || 50;
            light.parent = mesh;
            sceneLights[obj.id] = light;
          } catch(e) {
            console.log('Error creating light:', e);
          }
        }
      });

      // --- Feature 9: Create sounds ---
      self.processedOptions.objects.forEach(function(obj) {
        var mesh = objectMeshes[obj.id];
        if (obj.editorType === 'sound' && mesh && obj.soundURL) {
          try {
            var sound = new BABYLON.Sound('sound-' + obj.id, obj.soundURL, scene, null, {
              loop: !!obj.soundLoop,
              volume: safeNumber(obj.soundVolume, 0.5, 0, 1),
              spatialSound: true,
              autoplay: false
            });
            sound.attachToMesh(mesh);
            sounds[obj.id] = sound;
          } catch(e) {
            console.log('Error loading sound:', e);
          }
        }
      });

      // --- Feature 4: Build scoreboard panel ---
      if (self.processedOptions.scoreboardEnabled) {
        self.panel.showWorldInfoPanel();
        self.panel.clearWorldInfoPanel();
        var $info = $(
          '<div class="mono row">' +
            '<div class="col" style="text-align:center">' +
              '<div style="font-size:11px;color:#8cf">' + (self.processedOptions.scoreboardTeamA || 'A') + '</div>' +
              '<div class="scoreA" style="font-size:32px;font-weight:bold">0</div>' +
            '</div>' +
            '<div class="col" style="text-align:center">' +
              '<div style="font-size:11px;color:#f88">' + (self.processedOptions.scoreboardTeamB || 'B') + '</div>' +
              '<div class="scoreB" style="font-size:32px;font-weight:bold">0</div>' +
            '</div>' +
            '<div class="col" style="text-align:center" id="winnerDisplay">' +
              '<div class="winner" style="font-size:14px;color:#ffd700"></div>' +
            '</div>' +
          '</div>'
        );
        self.panel.drawWorldInfo($info);
        self.$scoreA = $info.find('.scoreA');
        self.$scoreB = $info.find('.scoreB');
        self.$winnerText = $info.find('.winner');
      }

      // --- Feature 4: Setup goal detection ---
      self.processedOptions.objects.forEach(function(obj) {
        if (obj.editorType === 'goal' && objectMeshes[obj.id]) {
          objectMeshes[obj.id].goalTeam = obj.goalTeam || 'A';
        }
      });

      // Init timer
      timerState.remaining = self.processedOptions.winTimerDuration || 60;
    });
  };

  function detectGoals() {
    if (!self.processedOptions.scoreboardEnabled || scoreState.gameOver) return;
    var ballMesh = null;
    for (var id in objectMeshes) {
      var obj = objectMeshes[id];
      var objData = null;
      self.processedOptions.objects.forEach(function(o) {
        if (o.id === id) objData = o;
      });
      if (objData && objData.editorType === 'ball') {
        ballMesh = obj;
        break;
      }
    }
    if (!ballMesh) return;
    self.processedOptions.objects.forEach(function(obj) {
      if (obj.editorType !== 'goal') return;
      var goalMesh = objectMeshes[obj.id];
      if (!goalMesh || !goalMesh.isEnabled()) return;
      if (goalMesh.intersectsMesh(ballMesh, false)) {
        var team = obj.goalTeam || 'A';
        if (team === 'A') scoreState.teamA++;
        else scoreState.teamB++;
        updateScoreboard();
      }
    });
  }

  this.render = function(delta) {
    if (!self.processedOptions) return;

    // Call parent animation render (keyframes)
    self.parent.renderAnimation(delta);

    // Wind
    if (self.processedOptions.windStrength > 0) {
      var force = new BABYLON.Vector3(
        self.processedOptions.windX * self.processedOptions.windStrength,
        0,
        self.processedOptions.windZ * self.processedOptions.windStrength
      );
      babylon.scene.meshes.forEach(function(mesh) {
        if (!mesh.physicsImpostor || mesh.id.indexOf('worldBaseObject') !== 0) return;
        if (mesh.physicsImpostor.getParam('mass') > 0) {
          mesh.physicsImpostor.applyForce(force.scale(delta / 1000), mesh.getAbsolutePosition());
        }
      });
    }

    renderTweens(delta);
    renderDoorMotors(delta);
    renderRules();

    // --- New feature renders ---
    renderKinematics(delta);
    renderElevators(delta);
    renderConveyors(delta);
    renderButtons();
    applyWaterResistance();
    detectGoals();

    // Timer countdown
    if (timerState.running) {
      timerState.remaining -= delta / 1000;
      evaluateTimer();
    }
  };

  this.init = function() {
    self.setOptions();
  };
};

world_stblockUser.init();
if (typeof worlds == 'undefined') var worlds = [];
worlds.push(world_stblockUser);
