const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class Scratch3GameBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._global = {
            gravity: -1,
            terminalVelocity: -18,
            groundY: -160,
            cameraX: 0,
            cameraY: 0,
            cameraZoom: 1,
            shake: 0
        };
        this.runtime.on('PROJECT_START', this.resetAll.bind(this));
        this.runtime.on('RUNTIME_DISPOSED', this.resetAll.bind(this));
    }

    getPrimitives () {
        return {
            game_setGravity: this.setGravity,
            game_changeGravity: this.changeGravity,
            game_gravity: this.getGravity,
            game_setTerminalVelocity: this.setTerminalVelocity,
            game_terminalVelocity: this.getTerminalVelocity,
            game_setGroundY: this.setGroundY,
            game_groundY: this.getGroundY,
            game_applyGravity: this.applyGravity,
            game_jump: this.jump,
            game_isOnGround: this.isOnGround,
            game_setAirControl: this.setAirControl,
            game_resetPhysics: this.resetPhysics,

            game_setVelocity: this.setVelocity,
            game_changeVelocity: this.changeVelocity,
            game_velocityX: this.getVelocityX,
            game_velocityY: this.getVelocityY,
            game_setAcceleration: this.setAcceleration,
            game_applyVelocity: this.applyVelocity,
            game_setFriction: this.setFriction,
            game_setBounce: this.setBounce,
            game_applyForce: this.applyForce,
            game_stopMotion: this.stopMotion,
            game_clampToStage: this.clampToStage,
            game_bounceOnStageEdge: this.bounceOnStageEdge,
            game_speed: this.getSpeed,
            game_setMass: this.setMass,

            game_cameraSetXY: this.cameraSetXY,
            game_cameraChangeXY: this.cameraChangeXY,
            game_cameraFollowThis: this.cameraFollowThis,
            game_cameraFollowTarget: this.cameraFollowTarget,
            game_cameraSetZoom: this.cameraSetZoom,
            game_cameraChangeZoom: this.cameraChangeZoom,
            game_cameraShake: this.cameraShake,
            game_cameraX: this.cameraX,
            game_cameraY: this.cameraY,
            game_cameraZoom: this.cameraZoom,
            game_worldToScreenX: this.worldToScreenX,
            game_worldToScreenY: this.worldToScreenY,
            game_screenToWorldX: this.screenToWorldX,
            game_screenToWorldY: this.screenToWorldY,
            game_placeAtWorldXY: this.placeAtWorldXY,

            game_aiMoveToXY: this.aiMoveToXY,
            game_aiMoveTowardTarget: this.aiMoveTowardTarget,
            game_aiFleeFromTarget: this.aiFleeFromTarget,
            game_aiFaceTarget: this.aiFaceTarget,
            game_aiDistanceToTarget: this.aiDistanceToTarget,
            game_aiTargetInRange: this.aiTargetInRange,
            game_aiPatrolX: this.aiPatrolX,
            game_aiChaseIfInRange: this.aiChaseIfInRange,
            game_aiKeepDistance: this.aiKeepDistance,
            game_aiWander: this.aiWander,
            game_aiStopNearTarget: this.aiStopNearTarget,

            game_setMaxHealth: this.setMaxHealth,
            game_setHealth: this.setHealth,
            game_changeHealth: this.changeHealth,
            game_health: this.getHealth,
            game_maxHealth: this.getMaxHealth,
            game_healthPercent: this.getHealthPercent,
            game_isAlive: this.isAlive,
            game_damageSelf: this.damageSelf,
            game_healSelf: this.healSelf,
            game_setAttackDamage: this.setAttackDamage,
            game_attackTargetIfTouching: this.attackTargetIfTouching,
            game_damageTarget: this.damageTarget,
            game_setInvincible: this.setInvincible,
            game_isInvincible: this.isInvincible,
            game_knockbackFromTarget: this.knockbackFromTarget,
            game_revive: this.revive
        };
    }

    resetAll () {
        this._global.gravity = -1;
        this._global.terminalVelocity = -18;
        this._global.groundY = -160;
        this._global.cameraX = 0;
        this._global.cameraY = 0;
        this._global.cameraZoom = 1;
        this._global.shake = 0;
    }

    _state (target) {
        if (!target.__stbGameState) {
            target.__stbGameState = {
                vx: 0,
                vy: 0,
                ax: 0,
                ay: 0,
                friction: 0,
                bounce: 0,
                mass: 1,
                airControl: 1,
                maxHealth: 100,
                health: 100,
                attackDamage: 10,
                invincibleUntil: 0,
                patrolDir: 1,
                wanderDir: 1
            };
        }
        return target.__stbGameState;
    }

    _targetByName (name) {
        const key = Cast.toString(name);
        if (key === '_mouse_') {
            return {
                x: this.runtime.ioDevices.mouse.getScratchX(),
                y: this.runtime.ioDevices.mouse.getScratchY(),
                isMouse: true
            };
        }
        return this.runtime.getSpriteTargetByName(key);
    }

    _moveToward (target, x, y, speed, away) {
        const dx = x - target.x;
        const dy = y - target.y;
        const dist = Math.sqrt((dx * dx) + (dy * dy));
        if (dist <= 0.0001) return dist;
        const dir = away ? -1 : 1;
        target.setXY(target.x + ((dx / dist) * speed * dir), target.y + ((dy / dist) * speed * dir));
        return dist;
    }

    _damageTarget (target, amount) {
        if (!target || target.isMouse) return;
        const state = this._state(target);
        const now = Date.now();
        if (state.invincibleUntil > now) return;
        state.health = clamp(state.health - Math.max(0, Cast.toNumber(amount)), 0, state.maxHealth);
    }

    setGravity (args) { this._global.gravity = Cast.toNumber(args.GRAVITY); }
    changeGravity (args) { this._global.gravity += Cast.toNumber(args.GRAVITY); }
    getGravity () { return this._global.gravity; }
    setTerminalVelocity (args) { this._global.terminalVelocity = Cast.toNumber(args.VELOCITY); }
    getTerminalVelocity () { return this._global.terminalVelocity; }
    setGroundY (args) { this._global.groundY = Cast.toNumber(args.Y); }
    getGroundY () { return this._global.groundY; }
    setAirControl (args, util) { this._state(util.target).airControl = Math.max(0, Cast.toNumber(args.AMOUNT)); }
    resetPhysics (args, util) { Object.assign(this._state(util.target), {vx: 0, vy: 0, ax: 0, ay: 0}); }

    applyGravity (args, util) {
        const state = this._state(util.target);
        state.vy += this._global.gravity;
        const terminal = this._global.terminalVelocity;
        state.vy = terminal < 0 ? Math.max(state.vy, terminal) : Math.min(state.vy, terminal);
        util.target.setXY(util.target.x + state.vx, util.target.y + state.vy);
        if (util.target.y < this._global.groundY) {
            util.target.setXY(util.target.x, this._global.groundY);
            state.vy = 0;
        }
    }

    jump (args, util) {
        if (this.isOnGround(args, util)) this._state(util.target).vy = Math.abs(Cast.toNumber(args.FORCE));
    }

    isOnGround (args, util) { return util.target.y <= this._global.groundY + Math.max(1, Cast.toNumber(args.TOLERANCE || 3)); }

    setVelocity (args, util) { const s = this._state(util.target); s.vx = Cast.toNumber(args.VX); s.vy = Cast.toNumber(args.VY); }
    changeVelocity (args, util) { const s = this._state(util.target); s.vx += Cast.toNumber(args.VX); s.vy += Cast.toNumber(args.VY); }
    getVelocityX (args, util) { return this._state(util.target).vx; }
    getVelocityY (args, util) { return this._state(util.target).vy; }
    setAcceleration (args, util) { const s = this._state(util.target); s.ax = Cast.toNumber(args.AX); s.ay = Cast.toNumber(args.AY); }
    setFriction (args, util) { this._state(util.target).friction = clamp(Cast.toNumber(args.FRICTION), 0, 1); }
    setBounce (args, util) { this._state(util.target).bounce = Math.max(0, Cast.toNumber(args.BOUNCE)); }
    setMass (args, util) { this._state(util.target).mass = Math.max(0.001, Cast.toNumber(args.MASS)); }

    applyVelocity (args, util) {
        const s = this._state(util.target);
        s.vx += s.ax;
        s.vy += s.ay;
        util.target.setXY(util.target.x + s.vx, util.target.y + s.vy);
        const frictionFactor = 1 - s.friction;
        s.vx *= frictionFactor;
        s.vy *= frictionFactor;
    }

    applyForce (args, util) {
        const s = this._state(util.target);
        const radians = MathUtil.degToRad(90 - Cast.toNumber(args.DIRECTION));
        const force = Cast.toNumber(args.FORCE) / Math.max(0.001, s.mass);
        s.vx += force * Math.cos(radians);
        s.vy += force * Math.sin(radians);
    }

    stopMotion (args, util) {
        const s = this._state(util.target);
        const axis = Cast.toString(args.AXIS);
        if (axis === 'x' || axis === 'all') s.vx = 0;
        if (axis === 'y' || axis === 'all') s.vy = 0;
    }

    clampToStage (args, util) {
        const halfW = this.runtime.constructor.STAGE_WIDTH / 2;
        const halfH = this.runtime.constructor.STAGE_HEIGHT / 2;
        util.target.setXY(clamp(util.target.x, -halfW, halfW), clamp(util.target.y, -halfH, halfH));
    }

    bounceOnStageEdge (args, util) {
        const s = this._state(util.target);
        const halfW = this.runtime.constructor.STAGE_WIDTH / 2;
        const halfH = this.runtime.constructor.STAGE_HEIGHT / 2;
        const bounce = s.bounce || 1;
        if (util.target.x <= -halfW || util.target.x >= halfW) s.vx = -s.vx * bounce;
        if (util.target.y <= -halfH || util.target.y >= halfH) s.vy = -s.vy * bounce;
        this.clampToStage(args, util);
    }

    getSpeed (args, util) { const s = this._state(util.target); return Math.sqrt((s.vx * s.vx) + (s.vy * s.vy)); }

    cameraSetXY (args) { this._global.cameraX = Cast.toNumber(args.X); this._global.cameraY = Cast.toNumber(args.Y); }
    cameraChangeXY (args) { this._global.cameraX += Cast.toNumber(args.X); this._global.cameraY += Cast.toNumber(args.Y); }
    cameraSetZoom (args) { this._global.cameraZoom = Math.max(0.05, Cast.toNumber(args.ZOOM)); }
    cameraChangeZoom (args) { this._global.cameraZoom = Math.max(0.05, this._global.cameraZoom + Cast.toNumber(args.ZOOM)); }
    cameraShake (args) { this._global.shake = Math.max(0, Cast.toNumber(args.AMOUNT)); }
    cameraX () { return this._global.cameraX; }
    cameraY () { return this._global.cameraY; }
    cameraZoom () { return this._global.cameraZoom; }

    cameraFollowThis (args, util) {
        const strength = clamp(Cast.toNumber(args.STRENGTH), 0, 1);
        this._global.cameraX += (util.target.x - this._global.cameraX) * strength;
        this._global.cameraY += (util.target.y - this._global.cameraY) * strength;
    }

    cameraFollowTarget (args) {
        const target = this._targetByName(args.TARGET);
        if (!target) return;
        const strength = clamp(Cast.toNumber(args.STRENGTH), 0, 1);
        this._global.cameraX += (target.x - this._global.cameraX) * strength;
        this._global.cameraY += (target.y - this._global.cameraY) * strength;
    }

    worldToScreenX (args) { return (Cast.toNumber(args.X) - this._global.cameraX) * this._global.cameraZoom; }
    worldToScreenY (args) { return (Cast.toNumber(args.Y) - this._global.cameraY) * this._global.cameraZoom; }
    screenToWorldX (args) { return (Cast.toNumber(args.X) / this._global.cameraZoom) + this._global.cameraX; }
    screenToWorldY (args) { return (Cast.toNumber(args.Y) / this._global.cameraZoom) + this._global.cameraY; }

    placeAtWorldXY (args, util) {
        const shakeX = this._global.shake ? (Math.random() - 0.5) * this._global.shake : 0;
        const shakeY = this._global.shake ? (Math.random() - 0.5) * this._global.shake : 0;
        util.target.setXY(this.worldToScreenX(args) + shakeX, this.worldToScreenY(args) + shakeY);
    }

    aiMoveToXY (args, util) { this._moveToward(util.target, Cast.toNumber(args.X), Cast.toNumber(args.Y), Cast.toNumber(args.SPEED), false); }
    aiMoveTowardTarget (args, util) { const t = this._targetByName(args.TARGET); if (t) this._moveToward(util.target, t.x, t.y, Cast.toNumber(args.SPEED), false); }
    aiFleeFromTarget (args, util) { const t = this._targetByName(args.TARGET); if (t) this._moveToward(util.target, t.x, t.y, Cast.toNumber(args.SPEED), true); }
    aiFaceTarget (args, util) { const t = this._targetByName(args.TARGET); if (!t) return; util.target.setDirection(90 - MathUtil.radToDeg(Math.atan2(t.y - util.target.y, t.x - util.target.x))); }
    aiDistanceToTarget (args, util) { const t = this._targetByName(args.TARGET); if (!t) return 10000; const dx = util.target.x - t.x; const dy = util.target.y - t.y; return Math.sqrt((dx * dx) + (dy * dy)); }
    aiTargetInRange (args, util) { return this.aiDistanceToTarget(args, util) <= Cast.toNumber(args.RANGE); }

    aiPatrolX (args, util) {
        const s = this._state(util.target);
        const left = Math.min(Cast.toNumber(args.X1), Cast.toNumber(args.X2));
        const right = Math.max(Cast.toNumber(args.X1), Cast.toNumber(args.X2));
        if (util.target.x <= left) s.patrolDir = 1;
        if (util.target.x >= right) s.patrolDir = -1;
        util.target.setXY(util.target.x + (Math.abs(Cast.toNumber(args.SPEED)) * s.patrolDir), util.target.y);
    }

    aiChaseIfInRange (args, util) { if (this.aiTargetInRange(args, util)) this.aiMoveTowardTarget(args, util); }

    aiKeepDistance (args, util) {
        const t = this._targetByName(args.TARGET);
        if (!t) return;
        const dist = this.aiDistanceToTarget(args, util);
        const min = Cast.toNumber(args.MIN);
        const max = Cast.toNumber(args.MAX);
        if (dist < min) this._moveToward(util.target, t.x, t.y, Cast.toNumber(args.SPEED), true);
        else if (dist > max) this._moveToward(util.target, t.x, t.y, Cast.toNumber(args.SPEED), false);
    }

    aiWander (args, util) {
        const s = this._state(util.target);
        if (Math.random() < 0.03) s.wanderDir = Math.round(Math.random() * 360) - 180;
        const radians = MathUtil.degToRad(90 - s.wanderDir);
        const speed = Cast.toNumber(args.SPEED);
        util.target.setXY(util.target.x + Math.cos(radians) * speed, util.target.y + Math.sin(radians) * speed);
        util.target.setDirection(s.wanderDir);
    }

    aiStopNearTarget (args, util) { return this.aiDistanceToTarget(args, util) <= Cast.toNumber(args.DISTANCE); }

    setMaxHealth (args, util) { const s = this._state(util.target); s.maxHealth = Math.max(1, Cast.toNumber(args.HEALTH)); s.health = clamp(s.health, 0, s.maxHealth); }
    setHealth (args, util) { const s = this._state(util.target); s.health = clamp(Cast.toNumber(args.HEALTH), 0, s.maxHealth); }
    changeHealth (args, util) { const s = this._state(util.target); s.health = clamp(s.health + Cast.toNumber(args.HEALTH), 0, s.maxHealth); }
    getHealth (args, util) { return this._state(util.target).health; }
    getMaxHealth (args, util) { return this._state(util.target).maxHealth; }
    getHealthPercent (args, util) { const s = this._state(util.target); return Math.round((s.health / s.maxHealth) * 100); }
    isAlive (args, util) { return this._state(util.target).health > 0; }
    damageSelf (args, util) { this._damageTarget(util.target, args.AMOUNT); }
    healSelf (args, util) { const s = this._state(util.target); s.health = clamp(s.health + Math.max(0, Cast.toNumber(args.AMOUNT)), 0, s.maxHealth); }
    setAttackDamage (args, util) { this._state(util.target).attackDamage = Math.max(0, Cast.toNumber(args.AMOUNT)); }
    damageTarget (args, util) { this._damageTarget(this._targetByName(args.TARGET), args.AMOUNT); }

    attackTargetIfTouching (args, util) {
        const target = this._targetByName(args.TARGET);
        if (target && !target.isMouse && util.target.isTouchingObject(Cast.toString(args.TARGET))) {
            this._damageTarget(target, this._state(util.target).attackDamage);
        }
    }

    setInvincible (args, util) { this._state(util.target).invincibleUntil = Date.now() + (Math.max(0, Cast.toNumber(args.SECS)) * 1000); }
    isInvincible (args, util) { return this._state(util.target).invincibleUntil > Date.now(); }

    knockbackFromTarget (args, util) {
        const t = this._targetByName(args.TARGET);
        if (!t) return;
        const s = this._state(util.target);
        const dx = util.target.x - t.x;
        const dy = util.target.y - t.y;
        const dist = Math.sqrt((dx * dx) + (dy * dy)) || 1;
        const force = Cast.toNumber(args.FORCE);
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
    }

    revive (args, util) {
        const s = this._state(util.target);
        s.health = clamp(Cast.toNumber(args.HEALTH), 1, s.maxHealth);
    }
}

module.exports = Scratch3GameBlocks;
