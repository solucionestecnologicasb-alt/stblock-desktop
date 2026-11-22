const GAME_COLORS = {
    gravity: ['#5B7CFA', '#4561C9', '#334AA0'],
    physics: ['#00A8A8', '#0B8585', '#086A6A'],
    camera: ['#7B61FF', '#6046CF', '#4A35A8'],
    ai: ['#2EBD59', '#238F43', '#1B7135'],
    combat: ['#E04444', '#B83232', '#912626']
};

const block = (SB, type, message0, args0, shape, colors) => {
    SB.Blocks[type] = {
        init: function () {
            const json = {
                type,
                message0,
                args0: args0 || [],
                colour: colors[0],
                colourSecondary: colors[1],
                colourTertiary: colors[2]
            };
            if (shape === 'boolean') {
                json.output = 'Boolean';
                json.outputShape = SB.OUTPUT_SHAPE_HEXAGONAL;
            } else if (shape === 'reporter') {
                json.output = null;
                json.outputShape = SB.OUTPUT_SHAPE_ROUND;
            } else {
                json.previousStatement = null;
                json.nextStatement = null;
            }
            this.jsonInit(json);
        }
    };
};

const numberArg = name => ({type: 'input_value', name});
const textArg = name => ({type: 'input_value', name});
const menuArg = (name, options) => ({type: 'field_dropdown', name, options});

export default function registerGameBlocks (ScratchBlocks) {
    const SB = ScratchBlocks;
    const g = GAME_COLORS.gravity;
    const p = GAME_COLORS.physics;
    const c = GAME_COLORS.camera;
    const ai = GAME_COLORS.ai;
    const cb = GAME_COLORS.combat;

    block(SB, 'game_setGravity', 'fijar gravedad a %1', [numberArg('GRAVITY')], 'command', g);
    block(SB, 'game_changeGravity', 'cambiar gravedad por %1', [numberArg('GRAVITY')], 'command', g);
    block(SB, 'game_gravity', 'gravedad', [], 'reporter', g);
    block(SB, 'game_setTerminalVelocity', 'fijar velocidad terminal a %1', [numberArg('VELOCITY')], 'command', g);
    block(SB, 'game_terminalVelocity', 'velocidad terminal', [], 'reporter', g);
    block(SB, 'game_setGroundY', 'fijar suelo en y %1', [numberArg('Y')], 'command', g);
    block(SB, 'game_groundY', 'y del suelo', [], 'reporter', g);
    block(SB, 'game_applyGravity', 'aplicar gravedad', [], 'command', g);
    block(SB, 'game_jump', 'saltar con fuerza %1', [numberArg('FORCE')], 'command', g);
    block(SB, 'game_isOnGround', 'tocando suelo con tolerancia %1', [numberArg('TOLERANCE')], 'boolean', g);
    block(SB, 'game_setAirControl', 'fijar control en aire a %1', [numberArg('AMOUNT')], 'command', g);
    block(SB, 'game_resetPhysics', 'reiniciar fÃ­sicas de este sprite', [], 'command', g);

    block(SB, 'game_setVelocity', 'fijar velocidad x %1 y %2', [numberArg('VX'), numberArg('VY')], 'command', p);
    block(SB, 'game_changeVelocity', 'cambiar velocidad x %1 y %2', [numberArg('VX'), numberArg('VY')], 'command', p);
    block(SB, 'game_velocityX', 'velocidad x', [], 'reporter', p);
    block(SB, 'game_velocityY', 'velocidad y', [], 'reporter', p);
    block(SB, 'game_setAcceleration', 'fijar aceleraciÃ³n x %1 y %2', [numberArg('AX'), numberArg('AY')], 'command', p);
    block(SB, 'game_applyVelocity', 'aplicar velocidad', [], 'command', p);
    block(SB, 'game_setFriction', 'fijar fricciÃ³n a %1', [numberArg('FRICTION')], 'command', p);
    block(SB, 'game_setBounce', 'fijar rebote a %1', [numberArg('BOUNCE')], 'command', p);
    block(SB, 'game_applyForce', 'aplicar fuerza %1 en direcciÃ³n %2', [numberArg('FORCE'), numberArg('DIRECTION')], 'command', p);
    block(SB, 'game_stopMotion', 'detener movimiento %1', [menuArg('AXIS', [['todo', 'all'], ['x', 'x'], ['y', 'y']])], 'command', p);
    block(SB, 'game_clampToStage', 'mantener dentro del escenario', [], 'command', p);
    block(SB, 'game_bounceOnStageEdge', 'rebotar en borde del escenario', [], 'command', p);
    block(SB, 'game_speed', 'rapidez', [], 'reporter', p);
    block(SB, 'game_setMass', 'fijar masa a %1', [numberArg('MASS')], 'command', p);

    block(SB, 'game_cameraSetXY', 'cÃ¡mara ir a x %1 y %2', [numberArg('X'), numberArg('Y')], 'command', c);
    block(SB, 'game_cameraChangeXY', 'mover cÃ¡mara x %1 y %2', [numberArg('X'), numberArg('Y')], 'command', c);
    block(SB, 'game_cameraFollowThis', 'cÃ¡mara seguir este sprite suavidad %1', [numberArg('STRENGTH')], 'command', c);
    block(SB, 'game_cameraFollowTarget', 'cÃ¡mara seguir %1 suavidad %2', [textArg('TARGET'), numberArg('STRENGTH')], 'command', c);
    block(SB, 'game_cameraSetZoom', 'fijar zoom de cÃ¡mara a %1', [numberArg('ZOOM')], 'command', c);
    block(SB, 'game_cameraChangeZoom', 'cambiar zoom por %1', [numberArg('ZOOM')], 'command', c);
    block(SB, 'game_cameraShake', 'sacudir cÃ¡mara intensidad %1', [numberArg('AMOUNT')], 'command', c);
    block(SB, 'game_cameraX', 'cÃ¡mara x', [], 'reporter', c);
    block(SB, 'game_cameraY', 'cÃ¡mara y', [], 'reporter', c);
    block(SB, 'game_cameraZoom', 'zoom de cÃ¡mara', [], 'reporter', c);
    block(SB, 'game_worldToScreenX', 'mundo x %1 a pantalla', [numberArg('X')], 'reporter', c);
    block(SB, 'game_worldToScreenY', 'mundo y %1 a pantalla', [numberArg('Y')], 'reporter', c);
    block(SB, 'game_screenToWorldX', 'pantalla x %1 a mundo', [numberArg('X')], 'reporter', c);
    block(SB, 'game_screenToWorldY', 'pantalla y %1 a mundo', [numberArg('Y')], 'reporter', c);
    block(SB, 'game_placeAtWorldXY', 'colocar este sprite en mundo x %1 y %2', [numberArg('X'), numberArg('Y')], 'command', c);

    block(SB, 'game_aiMoveToXY', 'IA mover hacia x %1 y %2 velocidad %3', [numberArg('X'), numberArg('Y'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiMoveTowardTarget', 'IA perseguir %1 velocidad %2', [textArg('TARGET'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiFleeFromTarget', 'IA huir de %1 velocidad %2', [textArg('TARGET'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiFaceTarget', 'IA mirar a %1', [textArg('TARGET')], 'command', ai);
    block(SB, 'game_aiDistanceToTarget', 'distancia IA a %1', [textArg('TARGET')], 'reporter', ai);
    block(SB, 'game_aiTargetInRange', '%1 estÃ¡ en rango %2', [textArg('TARGET'), numberArg('RANGE')], 'boolean', ai);
    block(SB, 'game_aiPatrolX', 'IA patrullar x %1 a x %2 velocidad %3', [numberArg('X1'), numberArg('X2'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiChaseIfInRange', 'IA perseguir %1 si rango %2 velocidad %3', [textArg('TARGET'), numberArg('RANGE'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiKeepDistance', 'IA mantener distancia de %1 min %2 max %3 vel %4', [textArg('TARGET'), numberArg('MIN'), numberArg('MAX'), numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiWander', 'IA deambular velocidad %1', [numberArg('SPEED')], 'command', ai);
    block(SB, 'game_aiStopNearTarget', 'IA cerca de %1 distancia %2', [textArg('TARGET'), numberArg('DISTANCE')], 'boolean', ai);

    block(SB, 'game_setMaxHealth', 'fijar vida mÃ¡xima a %1', [numberArg('HEALTH')], 'command', cb);
    block(SB, 'game_setHealth', 'fijar vida a %1', [numberArg('HEALTH')], 'command', cb);
    block(SB, 'game_changeHealth', 'cambiar vida por %1', [numberArg('HEALTH')], 'command', cb);
    block(SB, 'game_health', 'vida', [], 'reporter', cb);
    block(SB, 'game_maxHealth', 'vida mÃ¡xima', [], 'reporter', cb);
    block(SB, 'game_healthPercent', 'vida %', [], 'reporter', cb);
    block(SB, 'game_isAlive', 'estÃ¡ vivo', [], 'boolean', cb);
    block(SB, 'game_damageSelf', 'recibir daÃ±o %1', [numberArg('AMOUNT')], 'command', cb);
    block(SB, 'game_healSelf', 'curar %1', [numberArg('AMOUNT')], 'command', cb);
    block(SB, 'game_setAttackDamage', 'fijar daÃ±o de ataque a %1', [numberArg('AMOUNT')], 'command', cb);
    block(SB, 'game_attackTargetIfTouching', 'atacar %1 si lo toca', [textArg('TARGET')], 'command', cb);
    block(SB, 'game_damageTarget', 'hacer daÃ±o %1 a %2', [numberArg('AMOUNT'), textArg('TARGET')], 'command', cb);
    block(SB, 'game_setInvincible', 'hacer invencible por %1 segundos', [numberArg('SECS')], 'command', cb);
    block(SB, 'game_isInvincible', 'es invencible', [], 'boolean', cb);
    block(SB, 'game_knockbackFromTarget', 'retroceso desde %1 fuerza %2', [textArg('TARGET'), numberArg('FORCE')], 'command', cb);
    block(SB, 'game_revive', 'revivir con vida %1', [numberArg('HEALTH')], 'command', cb);
}
