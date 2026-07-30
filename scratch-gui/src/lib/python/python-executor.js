/**
 * STBlock - Python Executor
 *
 * Conecta el runtime de Python con el VM de Scratch,
 * permitiendo que el código Python controle los sprites.
 */

import { runPython, loadPyodide, isReady, preload } from './python-runtime';

/**
 * Clase que ejecuta código Python y lo conecta con el VM
 */
class PythonExecutor {
    constructor(vm) {
        this.vm = vm;
        this.isRunning = false;
        this.shouldStop = false;
        this.pendingWaits = [];
        this._testResults = { passed: 0, failed: 0, total: 0, messages: [] };
    }

    /**
     * Obtiene el target actual (sprite que se está editando)
     */
    getCurrentTarget() {
        return this.vm.editingTarget || this.vm.runtime.targets[0];
    }

    /**
     * Obtiene el runtime
     */
    getRuntime() {
        return this.vm.runtime;
    }

    /**
     * Crea los callbacks para el runtime de Python
     */
    createCallbacks() {
        const self = this;
        const target = this.getCurrentTarget();
        const runtime = this.getRuntime();

        return {
            // ─── Movimiento ───
            moveSteps: (steps) => {
                if (!target) return;
                const radians = (90 - target.direction) * Math.PI / 180;
                target.setXY(
                    target.x + steps * Math.cos(radians),
                    target.y + steps * Math.sin(radians)
                );
            },

            turnRight: (degrees) => {
                if (!target) return;
                target.setDirection(target.direction + degrees);
            },

            turnLeft: (degrees) => {
                if (!target) return;
                target.setDirection(target.direction - degrees);
            },

            goToXY: (x, y) => {
                if (!target) return;
                target.setXY(x, y);
            },

            goTo: (destination) => {
                if (!target) return;
                if (destination === '_mouse_') {
                    target.setXY(runtime.ioDevices.mouse.getX(), runtime.ioDevices.mouse.getY());
                } else if (destination === '_random_') {
                    target.setXY(
                        Math.round(Math.random() * 480 - 240),
                        Math.round(Math.random() * 360 - 180)
                    );
                }
            },

            glideToXY: (x, y, secs) => {
                // Glide es asíncrono, simulamos con setTimeout
                if (!target) return;
                const startX = target.x;
                const startY = target.y;
                const startTime = Date.now();
                const duration = secs * 1000;

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    target.setXY(
                        startX + (x - startX) * progress,
                        startY + (y - startY) * progress
                    );

                    if (progress < 1 && !self.shouldStop) {
                        requestAnimationFrame(animate);
                    }
                };
                animate();
            },

            pointInDirection: (direction) => {
                if (!target) return;
                target.setDirection(direction);
            },

            pointTowards: (targetName) => {
                if (!target) return;
                // Implementación simplificada
            },

            changeX: (dx) => {
                if (!target) return;
                target.setXY(target.x + dx, target.y);
            },

            changeY: (dy) => {
                if (!target) return;
                target.setXY(target.x, target.y + dy);
            },

            setX: (x) => {
                if (!target) return;
                target.setXY(x, target.y);
            },

            setY: (y) => {
                if (!target) return;
                target.setXY(target.x, y);
            },

            bounceOnEdge: () => {
                if (!target) return;
                const bounds = target.getBounds();
                if (bounds) {
                    if (bounds.left < -240 || bounds.right > 240) {
                        target.setDirection(-target.direction);
                    }
                    if (bounds.top > 180 || bounds.bottom < -180) {
                        target.setDirection(180 - target.direction);
                    }
                }
            },

            getX: () => target ? target.x : 0,
            getY: () => target ? target.y : 0,
            getDirection: () => target ? target.direction : 90,

            // ─── Apariencia ───
            say: (message) => {
                if (!target) return;
                runtime.emit('SAY', target, 'say', message);
            },

            sayForSecs: (message, secs) => {
                if (!target) return;
                runtime.emit('SAY', target, 'say', message);
                setTimeout(() => {
                    runtime.emit('SAY', target, 'say', '');
                }, secs * 1000);
            },

            think: (message) => {
                if (!target) return;
                runtime.emit('SAY', target, 'think', message);
            },

            thinkForSecs: (message, secs) => {
                if (!target) return;
                runtime.emit('SAY', target, 'think', message);
                setTimeout(() => {
                    runtime.emit('SAY', target, 'think', '');
                }, secs * 1000);
            },

            switchCostume: (name) => {
                if (!target) return;
                const index = target.getCostumeIndexByName(name);
                if (index !== -1) {
                    target.setCostume(index);
                }
            },

            nextCostume: () => {
                if (!target) return;
                target.setCostume((target.currentCostume + 1) % target.sprite.costumes.length);
            },

            changeSizeBy: (change) => {
                if (!target) return;
                target.setSize(target.size + change);
            },

            setSizeTo: (size) => {
                if (!target) return;
                target.setSize(size);
            },

            show: () => {
                if (!target) return;
                target.setVisible(true);
            },

            hide: () => {
                if (!target) return;
                target.setVisible(false);
            },

            changeEffect: (effect, change) => {
                if (!target) return;
                const effects = target.effects;
                const effectName = effect.toLowerCase();
                if (effectName in effects) {
                    target.setEffect(effectName, effects[effectName] + change);
                }
            },

            setEffect: (effect, value) => {
                if (!target) return;
                target.setEffect(effect.toLowerCase(), value);
            },

            clearEffects: () => {
                if (!target) return;
                target.clearEffects();
            },

            getSize: () => target ? target.size : 100,

            // ─── Sonido ───
            playSound: (name) => {
                if (!target) return;
                const sound = target.sprite.sounds.find(s => s.name === name);
                if (sound && runtime.audioEngine) {
                    runtime.audioEngine.playSound(target, sound);
                }
            },

            playSoundUntilDone: (name) => {
                // Versión simplificada
                if (!target) return;
                const sound = target.sprite.sounds.find(s => s.name === name);
                if (sound && runtime.audioEngine) {
                    runtime.audioEngine.playSound(target, sound);
                }
            },

            stopAllSounds: () => {
                if (runtime.audioEngine) {
                    runtime.audioEngine.stopAllSounds();
                }
            },

            setVolume: (volume) => {
                if (!target) return;
                target.volume = Math.max(0, Math.min(100, volume));
            },

            changeVolume: (change) => {
                if (!target) return;
                target.volume = Math.max(0, Math.min(100, target.volume + change));
            },

            getVolume: () => target ? target.volume : 100,

            // ─── Escenario ───
            switchBackdrop: (name) => {
                const stage = runtime.getTargetForStage();
                if (stage) {
                    const index = stage.getCostumeIndexByName(name);
                    if (index !== -1) {
                        stage.setCostume(index);
                    }
                }
            },

            nextBackdrop: () => {
                const stage = runtime.getTargetForStage();
                if (stage) {
                    stage.setCostume((stage.currentCostume + 1) % stage.sprite.costumes.length);
                }
            },

            getBackdropName: () => {
                const stage = runtime.getTargetForStage();
                return stage ? stage.sprite.costumes[stage.currentCostume].name : '';
            },

            getBackdropNumber: () => {
                const stage = runtime.getTargetForStage();
                return stage ? stage.currentCostume + 1 : 1;
            },

            // ─── Sensores ───
            isTouching: (targetName) => {
                if (!target) return false;
                if (targetName === '_mouse_') {
                    return target.isTouchingPoint(
                        runtime.ioDevices.mouse.getX(),
                        runtime.ioDevices.mouse.getY()
                    );
                } else if (targetName === '_edge_') {
                    const bounds = target.getBounds();
                    return bounds && (
                        bounds.left < -240 || bounds.right > 240 ||
                        bounds.top > 180 || bounds.bottom < -180
                    );
                }
                return false;
            },

            isTouchingColor: (color) => {
                // Implementación simplificada
                return false;
            },

            distanceTo: (targetName) => {
                if (!target) return 0;
                let destX = 0, destY = 0;
                if (targetName === '_mouse_') {
                    destX = runtime.ioDevices.mouse.getX();
                    destY = runtime.ioDevices.mouse.getY();
                }
                const dx = target.x - destX;
                const dy = target.y - destY;
                return Math.sqrt(dx * dx + dy * dy);
            },

            getMouseX: () => runtime.ioDevices.mouse.getX(),
            getMouseY: () => runtime.ioDevices.mouse.getY(),
            isMouseDown: () => runtime.ioDevices.mouse.getIsDown(),

            isKeyPressed: (key) => {
                return runtime.ioDevices.keyboard.getKeyIsDown(key);
            },

            ask: (question) => {
                runtime.emit('QUESTION', question);
            },

            getAnswer: () => runtime.ioDevices.answer || '',

            resetTimer: () => {
                runtime.ioDevices.clock.resetProjectTimer();
            },

            getTimer: () => runtime.ioDevices.clock.projectTimer(),

            // ─── Control ───
            wait: (secs) => {
                // Wait es manejado diferente en async
                return new Promise(resolve => {
                    setTimeout(resolve, secs * 1000);
                });
            },

            stopAll: () => {
                runtime.stopAll();
                self.shouldStop = true;
            },

            createClone: (target) => {
                if (target === '_myself_') {
                    runtime.ext_scratch3_control._createClone(
                        { CLONE_OPTION: { id: self.getCurrentTarget().id } },
                        { target: self.getCurrentTarget() }
                    );
                }
            },

            deleteThisClone: () => {
                const t = self.getCurrentTarget();
                if (t && t.isOriginal === false) {
                    runtime.disposeTarget(t);
                    runtime.stopForTarget(t);
                }
            },

            broadcast: (message) => {
                runtime.startHats('event_whenbroadcastreceived', {
                    BROADCAST_OPTION: message
                });
            },

            broadcastAndWait: (message) => {
                runtime.startHats('event_whenbroadcastreceived', {
                    BROADCAST_OPTION: message
                });
            },

            // ─── Física (extensiones de juego) ───
            setGravity: (value) => {
                runtime._gameGravity = value;
            },
            changeGravity: (value) => {
                runtime._gameGravity = (runtime._gameGravity || 0) + value;
            },
            getGravity: () => runtime._gameGravity || 0,

            setTerminalVelocity: (value) => {
                runtime._gameTerminalVelocity = value;
            },
            getTerminalVelocity: () => runtime._gameTerminalVelocity || 20,

            setGroundY: (y) => {
                runtime._gameGroundY = y;
            },
            getGroundY: () => runtime._gameGroundY || -180,

            setVelocityX: (vx) => {
                if (!target) return;
                target._velX = vx || 0;
            },
            setVelocityY: (vy) => {
                if (!target) return;
                target._velY = vy || 0;
            },
            setVelocity: (vx, vy) => {
                if (!target) return;
                target._velX = vx || 0;
                target._velY = vy || 0;
            },
            changeVelocity: (vx, vy) => {
                if (!target) return;
                target._velX = (target._velX || 0) + (vx || 0);
                target._velY = (target._velY || 0) + (vy || 0);
            },
            getVelocityX: () => (target && target._velX) || 0,
            getVelocityY: () => (target && target._velY) || 0,

            setAcceleration: (ax, ay) => {
                if (!target) return;
                target._accelX = ax || 0;
                target._accelY = ay || 0;
            },
            applyVelocity: () => {
                if (!target) return;
                const vx = target._velX || 0;
                const vy = target._velY || 0;
                target.setXY(target.x + vx, target.y + vy);
            },
            setFriction: (friction) => {
                if (!target) return;
                target._friction = Math.max(0, Math.min(1, friction));
            },
            setBounce: (bounce) => {
                if (!target) return;
                target._bounce = Math.max(0, Math.min(1, bounce));
            },
            applyForce: (force, direction) => {
                if (!target) return;
                const radians = (90 - direction) * Math.PI / 180;
                target._velX = (target._velX || 0) + force * Math.cos(radians);
                target._velY = (target._velY || 0) + force * Math.sin(radians);
            },
            stopMotion: (axis) => {
                if (!target) return;
                if (axis === 'todo' || axis === 'x') target._velX = 0;
                if (axis === 'todo' || axis === 'y') target._velY = 0;
            },
            clampToStage: () => {
                if (!target) return;
                const x = Math.max(-240, Math.min(240, target.x));
                const y = Math.max(-180, Math.min(180, target.y));
                target.setXY(x, y);
            },
            bounceOnStageEdge: () => {
                if (!target) return;
                const bounds = target.getBounds();
                if (bounds) {
                    if (bounds.left < -240 || bounds.right > 240) {
                        target._velX = -(target._velX || 0);
                    }
                    if (bounds.top > 180 || bounds.bottom < -180) {
                        target._velY = -(target._velY || 0);
                    }
                }
            },
            getSpeed: () => {
                if (!target) return 0;
                const vx = target._velX || 0;
                const vy = target._velY || 0;
                return Math.sqrt(vx * vx + vy * vy);
            },
            setMass: (mass) => {
                if (!target) return;
                target._mass = Math.max(0.1, mass);
            },
            setAirControl: (amount) => {
                if (!target) return;
                target._airControl = Math.max(0, Math.min(1, amount));
            },
            resetPhysics: () => {
                if (!target) return;
                target._velX = 0;
                target._velY = 0;
                target._accelX = 0;
                target._accelY = 0;
                target._friction = 0;
                target._bounce = 0;
                target._mass = 1;
                target._airControl = 1;
            },

            // ─── Salto y Gravedad ───
            jump: (force) => {
                if (!target) return;
                target._velY = -(force || 10);
            },

            applyGravity: () => {
                if (!target) return;
                const gravity = runtime._gameGravity || 0;
                const terminalVel = runtime._gameTerminalVelocity || 20;
                target._velY = (target._velY || 0) + gravity;
                if (target._velY > terminalVel) target._velY = terminalVel;
            },

            isOnGround: (tolerance) => {
                if (!target) return false;
                const groundY = runtime._gameGroundY || -180;
                const tol = tolerance !== undefined ? tolerance : 5;
                return target.y >= groundY - tol && target.y <= groundY + tol;
            },

            isInAir: () => {
                if (!target) return false;
                const groundY = runtime._gameGroundY || -180;
                return target.y < groundY - 5;
            },

            // ─── Salud y Combate ───
            setHealth: (value) => {
                if (!target) return;
                target._health = Math.max(0, Math.min(target._maxHealth || 100, value));
            },
            changeHealth: (amount) => {
                if (!target) return;
                const current = target._health !== undefined ? target._health : 100;
                target._health = Math.max(0, Math.min(target._maxHealth || 100, current + amount));
            },
            getHealth: () => (target && target._health !== undefined) ? target._health : 100,

            setMaxHealth: (value) => {
                if (!target) return;
                target._maxHealth = Math.max(1, value);
                if (target._health > target._maxHealth) target._health = target._maxHealth;
            },
            getMaxHealth: () => (target && target._maxHealth) || 100,

            getHealthPercent: () => {
                if (!target) return 100;
                const health = target._health !== undefined ? target._health : 100;
                const maxHealth = target._maxHealth || 100;
                return (health / maxHealth) * 100;
            },

            damageSelf: (amount) => {
                if (!target) return;
                if (target._invincibleUntil && Date.now() < target._invincibleUntil) return;
                const current = target._health !== undefined ? target._health : 100;
                target._health = Math.max(0, current - amount);
            },

            healSelf: (amount) => {
                if (!target) return;
                const current = target._health !== undefined ? target._health : 100;
                target._health = Math.min(target._maxHealth || 100, current + amount);
            },

            isAlive: () => {
                if (!target) return true;
                const health = target._health !== undefined ? target._health : 100;
                return health > 0;
            },

            setAttackDamage: (amount) => {
                if (!target) return;
                target._attackDamage = Math.max(0, amount);
            },

            attackTargetIfTouching: (targetName) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget && target.isTouchingSprite(otherTarget.getName())) {
                    const damage = target._attackDamage || 10;
                    otherTarget._health = Math.max(0, (otherTarget._health !== undefined ? otherTarget._health : 100) - damage);
                }
            },

            damageTarget: (amount, targetName) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    otherTarget._health = Math.max(0, (otherTarget._health !== undefined ? otherTarget._health : 100) - amount);
                }
            },

            setInvincible: (secs) => {
                if (!target) return;
                target._invincibleUntil = Date.now() + (secs * 1000);
            },

            isInvincible: () => {
                if (!target) return false;
                return target._invincibleUntil && Date.now() < target._invincibleUntil;
            },

            knockbackFromTarget: (targetName, force) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    target._velX = (dx / dist) * (force || 10);
                    target._velY = (dy / dist) * (force || 10);
                }
            },

            revive: (health) => {
                if (!target) return;
                target._health = health || 100;
                delete target._invincibleUntil;
            },

            isCollidingWith: (targetName) => {
                if (!target) return false;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                return otherTarget ? target.isTouchingSprite(otherTarget.getName()) : false;
            },

            placeAtWorldXY: (x, y) => {
                if (!target) return;
                target.setXY(x, y);
            },

            // ─── Cámara ───
            cameraFollow: (strength) => {
                runtime._cameraTarget = self.getCurrentTarget();
                runtime._cameraStrength = strength !== undefined ? strength : 0.1;
            },

            cameraSetXY: (x, y) => {
                runtime._cameraX = x;
                runtime._cameraY = y;
            },

            cameraMove: (x, y) => {
                runtime._cameraX = (runtime._cameraX || 0) + x;
                runtime._cameraY = (runtime._cameraY || 0) + y;
            },

            cameraFollowTarget: (targetName, strength) => {
                const camTarget = runtime.getSpriteTargetByName(targetName);
                runtime._cameraTarget = camTarget || null;
                runtime._cameraStrength = strength !== undefined ? strength : 0.1;
            },

            cameraShake: (intensity) => {
                runtime._cameraShake = { intensity: intensity || 5, duration: 0.3, startTime: Date.now() };
            },

            cameraSetZoom: (level) => {
                runtime._cameraZoom = Math.max(0.1, level);
            },

            cameraChangeZoom: (change) => {
                runtime._cameraZoom = Math.max(0.1, (runtime._cameraZoom || 1) + change);
            },

            getCameraX: () => runtime._cameraX || 0,
            getCameraY: () => runtime._cameraY || 0,
            getCameraZoom: () => runtime._cameraZoom || 1,

            worldToScreenX: (x) => {
                const camX = runtime._cameraX || 0;
                const zoom = runtime._cameraZoom || 1;
                return (x - camX) * zoom;
            },
            worldToScreenY: (y) => {
                const camY = runtime._cameraY || 0;
                const zoom = runtime._cameraZoom || 1;
                return (y - camY) * zoom;
            },
            screenToWorldX: (x) => {
                const camX = runtime._cameraX || 0;
                const zoom = runtime._cameraZoom || 1;
                return (x / zoom) + camX;
            },
            screenToWorldY: (y) => {
                const camY = runtime._cameraY || 0;
                const zoom = runtime._cameraZoom || 1;
                return (y / zoom) + camY;
            },

            // ─── Escenario ───
            getStageWidth: () => 480,
            getStageHeight: () => 360,

            // ─── Ratón extendido ───
            getMouseSpeed: () => {
                const mouse = runtime.ioDevices.mouse;
                if (!mouse._prevX) mouse._prevX = mouse.getX();
                if (!mouse._prevY) mouse._prevY = mouse.getY();
                const dx = mouse.getX() - mouse._prevX;
                const dy = mouse.getY() - mouse._prevY;
                mouse._prevX = mouse.getX();
                mouse._prevY = mouse.getY();
                return Math.sqrt(dx * dx + dy * dy);
            },
            getMousePreviousX: () => {
                const mouse = runtime.ioDevices.mouse;
                return mouse._prevX || mouse.getX();
            },
            getMousePreviousY: () => {
                const mouse = runtime.ioDevices.mouse;
                return mouse._prevY || mouse.getY();
            },

            // ─── Eventos ───
            emitCustomEvent: (name, data) => {
                runtime.startHats('event_whenCustom', { CUSTOM_EVENT: name });
            },
            getEventData: (name) => {
                return runtime._eventData || null;
            },

            // ─── Estados ───
            stateSet: (name) => {
                runtime._prevState = runtime._currentState || '';
                runtime._currentState = name;
            },
            stateCurrent: () => runtime._currentState || 'inicio',
            statePrevious: () => runtime._prevState || '',
            stateIs: (name) => (runtime._currentState || '') === name,
            stateBack: () => {
                const prev = runtime._prevState || 'inicio';
                runtime._prevState = runtime._currentState;
                runtime._currentState = prev;
            },
            stateReset: () => {
                runtime._prevState = runtime._currentState || '';
                runtime._currentState = 'inicio';
            },

            // ─── Debug ───
            debugLog: (value) => {
                console.log('[STBlock]', value);
            },
            debugWarn: (value) => {
                console.warn('[STBlock]', value);
            },
            debugError: (value) => {
                console.error('[STBlock]', value);
            },
            debugPauseIf: (condition) => {
                if (condition) {
                    debugger;
                }
            },
            debugMark: (name) => {
                if (!runtime._debugMarks) runtime._debugMarks = {};
                runtime._debugMarks[name] = Date.now();
            },
            debugMsSinceMark: (name) => {
                if (!runtime._debugMarks || !runtime._debugMarks[name]) return 0;
                return Date.now() - runtime._debugMarks[name];
            },
            debugCount: (name) => {
                if (!runtime._debugCounters) runtime._debugCounters = {};
                runtime._debugCounters[name] = (runtime._debugCounters[name] || 0) + 1;
            },
            debugCounter: (name) => {
                if (!runtime._debugCounters) return 0;
                return runtime._debugCounters[name] || 0;
            },

            // ─── Pruebas ───
            testAssertTrue: (condition, name) => {
                const results = self._testResults;
                results.total++;
                if (condition) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.messages.push(`Fallo: ${name || 'Sin nombre'} - se esperaba verdadero`);
                }
            },
            testAssertEqual: (value, expected, name) => {
                const results = self._testResults;
                results.total++;
                if (value === expected) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.messages.push(`Fallo: ${name || 'Sin nombre'} - se esperaba ${expected}, se obtuvo ${value}`);
                }
            },
            testAssertBetween: (value, min, max, name) => {
                const results = self._testResults;
                results.total++;
                if (value >= min && value <= max) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.messages.push(`Fallo: ${name || 'Sin nombre'} - ${value} no está entre ${min} y ${max}`);
                }
            },
            testReset: () => {
                self._testResults = { passed: 0, failed: 0, total: 0, messages: [] };
            },
            testPassed: () => self._testResults.passed || 0,
            testFailed: () => self._testResults.failed || 0,
            testTotal: () => self._testResults.total || 0,
            testReport: () => {
                const r = self._testResults;
                let report = `Pruebas: ${r.passed}/${r.total} pasadas`;
                if (r.failed > 0) {
                    report += `\nFallos:\n${r.messages.join('\n')}`;
                }
                return report;
            },

            // ─── IA ───
            aiMoveToXY: (x, y, speed) => {
                if (!target) return;
                const dx = x - target.x;
                const dy = y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const spd = speed || 2;
                if (dist > spd) {
                    target.setXY(target.x + (dx / dist) * spd, target.y + (dy / dist) * spd);
                } else {
                    target.setXY(x, y);
                }
            },
            aiMoveTowardTarget: (targetName, speed) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = otherTarget.x - target.x;
                    const dy = otherTarget.y - target.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const spd = speed || 2;
                    target.setXY(target.x + (dx / dist) * spd, target.y + (dy / dist) * spd);
                }
            },
            aiFleeFromTarget: (targetName, speed) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const spd = speed || 2;
                    target.setXY(target.x + (dx / dist) * spd, target.y + (dy / dist) * spd);
                }
            },
            aiFaceTarget: (targetName) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = otherTarget.x - target.x;
                    const dy = otherTarget.y - target.y;
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    target.setDirection(90 - angle);
                }
            },
            aiDistanceToTarget: (targetName) => {
                if (!target) return 0;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    return Math.sqrt(dx * dx + dy * dy);
                }
                return 0;
            },
            aiTargetInRange: (targetName, range) => {
                if (!target) return false;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    return Math.sqrt(dx * dx + dy * dy) <= range;
                }
                return false;
            },
            aiPatrolX: (x1, x2, speed) => {
                if (!target) return;
                if (!target._patrolDir) target._patrolDir = 1;
                const spd = (speed || 1) * target._patrolDir;
                target.setXY(target.x + spd, target.y);
                if (target.x >= x2) target._patrolDir = -1;
                if (target.x <= x1) target._patrolDir = 1;
            },
            aiChaseIfInRange: (targetName, range, speed) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= range) {
                        const spd = speed || 2;
                        target.setXY(target.x - (dx / (dist || 1)) * spd, target.y - (dy / (dist || 1)) * spd);
                    }
                }
            },
            aiKeepDistance: (targetName, minDist, maxDist, speed) => {
                if (!target) return;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const spd = speed || 1;
                    if (dist < minDist) {
                        target.setXY(target.x + (dx / dist) * spd, target.y + (dy / dist) * spd);
                    } else if (dist > maxDist) {
                        target.setXY(target.x - (dx / dist) * spd, target.y - (dy / dist) * spd);
                    }
                }
            },
            aiWander: (speed) => {
                if (!target) return;
                if (!target._wanderTimer || Date.now() - target._wanderTimer > 2000) {
                    target._wanderDir = Math.random() * 360;
                    target._wanderTimer = Date.now();
                }
                const radians = (90 - target._wanderDir) * Math.PI / 180;
                const spd = speed || 1;
                target.setXY(target.x + spd * Math.cos(radians), target.y + spd * Math.sin(radians));
            },
            aiStopNearTarget: (targetName, distance) => {
                if (!target) return false;
                const otherTarget = runtime.getSpriteTargetByName(targetName);
                if (otherTarget) {
                    const dx = target.x - otherTarget.x;
                    const dy = target.y - otherTarget.y;
                    return Math.sqrt(dx * dx + dy * dy) <= distance;
                }
                return false;
            },

            // ─── Runtime ───
            getDeltaTime: () => runtime.currentStepTime || 0.016,
            getFPS: () => {
                const dt = runtime.currentStepTime || 0.016;
                return dt > 0 ? Math.round(1 / dt) : 60;
            }
        };
    }

    /**
     * Ejecuta código Python
     */
    async execute(code, onOutput, onError, onComplete) {
        if (this.isRunning) {
            if (onError) onError('Ya hay código ejecutándose');
            return;
        }

        this.isRunning = true;
        this.shouldStop = false;

        try {
            // Asegurar que Pyodide esté cargado
            await loadPyodide();

            // Crear callbacks
            const callbacks = this.createCallbacks();

            // Ejecutar código
            const result = await runPython(code, callbacks);

            if (result.success) {
                if (result.output && onOutput) {
                    onOutput(result.output);
                }
                if (onComplete) onComplete(result.result);
            } else {
                if (onError) onError(result.error);
            }

        } catch (error) {
            if (onError) onError(error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Detiene la ejecución actual
     */
    stop() {
        this.shouldStop = true;
        this.isRunning = false;
    }

    /**
     * Verifica si está ejecutando
     */
    isExecuting() {
        return this.isRunning;
    }

    /**
     * Precarga Pyodide
     */
    preload() {
        preload();
    }

    /**
     * Verifica si Pyodide está listo
     */
    isPyodideReady() {
        return isReady();
    }
}

/**
 * Crea una instancia del ejecutor
 */
export function createExecutor(vm) {
    return new PythonExecutor(vm);
}

export default PythonExecutor;
