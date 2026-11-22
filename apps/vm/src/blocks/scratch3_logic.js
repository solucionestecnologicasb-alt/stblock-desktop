const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNum = value => Cast.toNumber(value);
const toStr = value => Cast.toString(value);

class Scratch3LogicBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._state = 'inicio';
        this._previousState = '';
        this._marks = Object.create(null);
        this._counters = Object.create(null);
        this._tests = {passed: 0, failed: 0, total: 0, messages: []};
        this._lastFrameTime = Date.now();
        this._deltaTime = 0;
        this._fps = 0;
        this._lastMouse = {x: 0, y: 0};
        this._mouseSpeed = 0;
        this._eventData = Object.create(null);
        this.runtime.on('PROJECT_START', this.reset.bind(this));
        this.runtime.on('PROJECT_STOP_ALL', this.resetRuntimeOnly.bind(this));
    }

    getPrimitives () {
        return {
            logic_true: () => true,
            logic_false: () => false,
            logic_xor: this.xor,
            logic_implies: this.implies,
            logic_equalStrict: this.equalStrict,
            logic_between: this.between,
            logic_outside: this.outside,
            logic_clamp: this.clampValue,
            logic_map: this.mapValue,
            logic_lerp: this.lerp,
            logic_distance: this.distance,
            logic_angleTo: this.angleTo,
            logic_roundDecimals: this.roundDecimals,
            logic_percent: this.percent,
            logic_sign: this.sign,
            logic_textContains: this.textContains,
            logic_textStarts: this.textStarts,
            logic_textEnds: this.textEnds,
            logic_textReplace: this.textReplace,
            logic_toNumber: this.toNumber,
            logic_toText: this.toText,
            logic_jsonGet: this.jsonGet,
            logic_jsonSet: this.jsonSet,
            logic_jsonHas: this.jsonHas,
            logic_jsonStringify: this.jsonStringify,
            logic_listFromText: this.listFromText,
            logic_listJoin: this.listJoin,
            logic_listLength: this.listLength,
            logic_listItem: this.listItem,
            logic_listContains: this.listContains,

            control_waitUntilTimeout: this.waitUntilTimeout,
            control_everySeconds: this.everySeconds,
            control_forSeconds: this.forSeconds,
            control_countHere: this.countHere,

            sensing_deltaTime: this.deltaTime,
            sensing_fps: this.fps,
            sensing_stageWidth: () => this.runtime.constructor.STAGE_WIDTH,
            sensing_stageHeight: () => this.runtime.constructor.STAGE_HEIGHT,
            sensing_mouseSpeed: this.mouseSpeed,
            sensing_mousePreviousX: () => this._lastMouse.x,
            sensing_mousePreviousY: () => this._lastMouse.y,

            event_everyFrame: () => true,
            event_everySeconds: this.hatEverySeconds,
            event_emitCustom: this.emitCustom,
            event_emitCustomWithData: this.emitCustomWithData,
            event_whenCustom: this.whenCustom,
            event_eventData: this.eventData,

            state_set: this.setState,
            state_current: () => this._state,
            state_previous: () => this._previousState,
            state_is: this.stateIs,
            state_back: this.stateBack,
            state_reset: this.stateReset,

            debug_log: this.debugLog,
            debug_warn: this.debugWarn,
            debug_error: this.debugError,
            debug_pauseIf: this.debugPauseIf,
            debug_mark: this.debugMark,
            debug_msSinceMark: this.debugMsSinceMark,
            debug_count: this.debugCount,
            debug_counter: this.debugCounter,

            test_assertTrue: this.assertTrue,
            test_assertEqual: this.assertEqual,
            test_assertBetween: this.assertBetween,
            test_reset: this.testReset,
            test_passed: () => this._tests.passed,
            test_failed: () => this._tests.failed,
            test_total: () => this._tests.total,
            test_report: this.testReport
        };
    }

    getHats () {
        return {
            event_everyFrame: {restartExistingThreads: false, edgeActivated: true},
            event_everySeconds: {restartExistingThreads: false, edgeActivated: true},
            event_whenCustom: {restartExistingThreads: true}
        };
    }

    reset () {
        this._state = 'inicio';
        this._previousState = '';
        this._marks = Object.create(null);
        this._counters = Object.create(null);
        this.testReset();
        this.resetRuntimeOnly();
    }

    resetRuntimeOnly () {
        this._lastFrameTime = Date.now();
        this._deltaTime = 0;
        this._fps = 0;
        this._lastMouse = {x: 0, y: 0};
        this._mouseSpeed = 0;
        this._eventData = Object.create(null);
    }

    _tickTiming (util) {
        const now = Date.now();
        const dt = Math.max(0, (now - this._lastFrameTime) / 1000);
        if (dt > 0) {
            this._deltaTime = dt;
            this._fps = Math.round(1 / dt);
        }
        this._lastFrameTime = now;
        const x = util.ioQuery('mouse', 'getScratchX');
        const y = util.ioQuery('mouse', 'getScratchY');
        const dx = x - this._lastMouse.x;
        const dy = y - this._lastMouse.y;
        this._mouseSpeed = dt > 0 ? Math.sqrt((dx * dx) + (dy * dy)) / dt : 0;
        this._lastMouse = {x, y};
    }

    xor (args) { return Cast.toBoolean(args.A) !== Cast.toBoolean(args.B); }
    implies (args) { return !Cast.toBoolean(args.A) || Cast.toBoolean(args.B); }
    equalStrict (args) { return args.A === args.B || toStr(args.A) === toStr(args.B); }
    between (args) { const v = toNum(args.VALUE); return v >= toNum(args.MIN) && v <= toNum(args.MAX); }
    outside (args) { const v = toNum(args.VALUE); return v < toNum(args.MIN) || v > toNum(args.MAX); }
    clampValue (args) { return clamp(toNum(args.VALUE), toNum(args.MIN), toNum(args.MAX)); }
    mapValue (args) {
        const inMin = toNum(args.IN_MIN); const inMax = toNum(args.IN_MAX);
        const outMin = toNum(args.OUT_MIN); const outMax = toNum(args.OUT_MAX);
        if (inMax === inMin) return outMin;
        return outMin + ((toNum(args.VALUE) - inMin) * (outMax - outMin) / (inMax - inMin));
    }
    lerp (args) { return toNum(args.A) + ((toNum(args.B) - toNum(args.A)) * toNum(args.T)); }
    distance (args) { const dx = toNum(args.X2) - toNum(args.X1); const dy = toNum(args.Y2) - toNum(args.Y1); return Math.sqrt((dx * dx) + (dy * dy)); }
    angleTo (args) { return 90 - MathUtil.radToDeg(Math.atan2(toNum(args.Y2) - toNum(args.Y1), toNum(args.X2) - toNum(args.X1))); }
    roundDecimals (args) { const f = Math.pow(10, Math.max(0, Math.round(toNum(args.DECIMALS)))); return Math.round(toNum(args.VALUE) * f) / f; }
    percent (args) { const total = toNum(args.TOTAL); return total === 0 ? 0 : (toNum(args.PART) / total) * 100; }
    sign (args) { return Math.sign(toNum(args.VALUE)); }
    textContains (args) { return toStr(args.TEXT).indexOf(toStr(args.PART)) !== -1; }
    textStarts (args) { return toStr(args.TEXT).startsWith(toStr(args.PART)); }
    textEnds (args) { return toStr(args.TEXT).endsWith(toStr(args.PART)); }
    textReplace (args) { return toStr(args.TEXT).split(toStr(args.FIND)).join(toStr(args.REPLACE)); }
    toNumber (args) { return toNum(args.VALUE); }
    toText (args) { return toStr(args.VALUE); }

    _parseJSON (value, fallback) {
        try { return JSON.parse(toStr(value)); } catch (e) { return fallback; }
    }
    jsonGet (args) { const obj = this._parseJSON(args.JSON, {}); const value = obj[toStr(args.KEY)]; return value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : value); }
    jsonSet (args) { const obj = this._parseJSON(args.JSON, {}); obj[toStr(args.KEY)] = args.VALUE; return JSON.stringify(obj); }
    jsonHas (args) { const obj = this._parseJSON(args.JSON, {}); return Object.prototype.hasOwnProperty.call(obj, toStr(args.KEY)); }
    jsonStringify (args) { return JSON.stringify(args.VALUE); }
    listFromText (args) { return JSON.stringify(toStr(args.TEXT).split(toStr(args.SEP))); }
    listJoin (args) { const list = this._parseJSON(args.LIST, []); return Array.isArray(list) ? list.join(toStr(args.SEP)) : ''; }
    listLength (args) { const list = this._parseJSON(args.LIST, []); return Array.isArray(list) ? list.length : 0; }
    listItem (args) { const list = this._parseJSON(args.LIST, []); const i = Math.round(toNum(args.INDEX)) - 1; return Array.isArray(list) && i >= 0 && i < list.length ? list[i] : ''; }
    listContains (args) { const list = this._parseJSON(args.LIST, []); return Array.isArray(list) && list.map(String).indexOf(toStr(args.VALUE)) !== -1; }

    waitUntilTimeout (args, util) {
        if (Cast.toBoolean(args.CONDITION)) return;
        if (!util.stackFrame.started) {
            util.stackFrame.started = Date.now();
            util.stackFrame.timeout = Math.max(0, toNum(args.SECS)) * 1000;
        }
        if ((Date.now() - util.stackFrame.started) < util.stackFrame.timeout) util.yield();
    }
    everySeconds (args, util) {
        if (!util.stackFrame.next) util.stackFrame.next = Date.now();
        if (Date.now() >= util.stackFrame.next) {
            util.stackFrame.next = Date.now() + (Math.max(0.01, toNum(args.SECS)) * 1000);
            util.startBranch(1, false);
        }
    }
    forSeconds (args, util) {
        if (!util.stackFrame.started) util.stackFrame.started = Date.now();
        if ((Date.now() - util.stackFrame.started) <= Math.max(0, toNum(args.SECS)) * 1000) {
            util.startBranch(1, true);
        }
    }
    countHere (args) { const key = toStr(args.NAME); this._counters[key] = (this._counters[key] || 0) + 1; return this._counters[key]; }

    deltaTime (args, util) { this._tickTiming(util); return this._deltaTime; }
    fps (args, util) { this._tickTiming(util); return this._fps; }
    mouseSpeed (args, util) { this._tickTiming(util); return this._mouseSpeed; }

    hatEverySeconds (args, util) {
        const id = util.thread.topBlock;
        const interval = Math.max(0.01, toNum(args.SECS)) * 1000;
        const now = Date.now();
        const last = util.target.__logicEverySecondLast || (util.target.__logicEverySecondLast = Object.create(null));
        if (!last[id]) { last[id] = now; return false; }
        if (now - last[id] >= interval) { last[id] = now; return true; }
        return false;
    }
    emitCustom (args, util) { util.startHats('event_whenCustom', {NAME: toStr(args.NAME)}); }
    emitCustomWithData (args, util) { const name = toStr(args.NAME); this._eventData[name] = args.DATA; util.startHats('event_whenCustom', {NAME: name}); }
    whenCustom () { return true; }
    eventData (args) { return this._eventData[toStr(args.NAME)] || ''; }

    setState (args) { this._previousState = this._state; this._state = toStr(args.NAME); }
    stateIs (args) { return this._state === toStr(args.NAME); }
    stateBack () { const s = this._state; this._state = this._previousState; this._previousState = s; }
    stateReset () { this._previousState = this._state; this._state = 'inicio'; }

    debugLog (args) { console.log('[STBlock]', args.VALUE); }
    debugWarn (args) { console.warn('[STBlock]', args.VALUE); }
    debugError (args) { console.error('[STBlock]', args.VALUE); }
    debugPauseIf (args, util) { if (Cast.toBoolean(args.CONDITION)) util.yield(); }
    debugMark (args) { this._marks[toStr(args.NAME)] = Date.now(); }
    debugMsSinceMark (args) { const mark = this._marks[toStr(args.NAME)]; return mark ? Date.now() - mark : 0; }
    debugCount (args) { const key = toStr(args.NAME); this._counters[key] = (this._counters[key] || 0) + 1; }
    debugCounter (args) { return this._counters[toStr(args.NAME)] || 0; }

    _recordTest (passed, message) { this._tests.total++; if (passed) this._tests.passed++; else this._tests.failed++; this._tests.messages.push((passed ? 'OK: ' : 'FALLA: ') + message); }
    assertTrue (args) { this._recordTest(Cast.toBoolean(args.CONDITION), toStr(args.NAME)); }
    assertEqual (args) { this._recordTest(toStr(args.VALUE) === toStr(args.EXPECTED), `${toStr(args.NAME)} (${toStr(args.VALUE)} == ${toStr(args.EXPECTED)})`); }
    assertBetween (args) { const v = toNum(args.VALUE); this._recordTest(v >= toNum(args.MIN) && v <= toNum(args.MAX), toStr(args.NAME)); }
    testReset () { this._tests = {passed: 0, failed: 0, total: 0, messages: []}; }
    testReport () { return `${this._tests.passed}/${this._tests.total} pruebas pasadas, ${this._tests.failed} fallidas`; }
}

module.exports = Scratch3LogicBlocks;
