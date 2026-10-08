const Cast = require('../util/cast');

class Scratch3ControlBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "counter" block value. For compatibility with 2.0.
         * @type {number}
         */
        this._counter = 0;

        this.runtime.on('RUNTIME_DISPOSED', this.clearCounter.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            control_repeat: this.repeat,
            control_repeat_until: this.repeatUntil,
            control_while: this.repeatWhile,
            control_for_each: this.forEach,
            control_forever: this.forever,
            control_wait: this.wait,
            control_wait_until: this.waitUntil,
            control_if: this.if,
            control_if_else: this.ifElse,
            control_stop: this.stop,
            control_create_clone_of: this.createClone,
            control_delete_this_clone: this.deleteClone,
            control_get_counter: this.getCounter,
            control_incr_counter: this.incrCounter,
            control_clear_counter: this.clearCounter,
            control_all_at_once: this.allAtOnce,
            control_for_range: this.forRange,
            control_for_each_list: this.forEachList,
            control_break: this.breakLoop,
            control_continue: this.continueLoop,
            control_infinite_loop: this.infiniteLoop,
            control_if_elseif_else: this.ifElseIfElse,
            control_switch_case_default: this.switchCaseDefault
        };
    }

    getHats () {
        return {
            control_start_as_clone: {
                restartExistingThreads: false
            }
        };
    }

    repeat (args, util) {
        const times = Math.round(Cast.toNumber(args.TIMES));
        // Initialize loop
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            util.startBranch(1, true);
        }
    }

    repeatUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is false (repeat UNTIL), start the branch.
        if (!condition) {
            util.startBranch(1, true);
        }
    }

    repeatWhile (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is true (repeat WHILE), start the branch.
        if (condition) {
            util.startBranch(1, true);
        }
    }

    forEach (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);

        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }

        if (util.stackFrame.index < Number(args.VALUE)) {
            util.stackFrame.index++;
            variable.value = util.stackFrame.index;
            util.startBranch(1, true);
        }
    }

    waitUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (!condition) {
            util.yield();
        }
    }

    forever (args, util) {
        util.startBranch(1, true);
    }

    infiniteLoop (args, util) {
        util.startBranch(1, true);
    }

    wait (args, util) {
        if (util.stackTimerNeedsInit()) {
            const duration = Math.max(0, 1000 * Cast.toNumber(args.DURATION));

            util.startStackTimer(duration);
            this.runtime.requestRedraw();
            util.yield();
        } else if (!util.stackTimerFinished()) {
            util.yield();
        }
    }

    if (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        }
    }

    ifElse (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        } else {
            util.startBranch(2, false);
        }
    }

    stop (args, util) {
        const option = args.STOP_OPTION;
        if (option === 'all') {
            util.stopAll();
        } else if (option === 'other scripts in sprite' ||
            option === 'other scripts in stage') {
            util.stopOtherTargetThreads();
        } else if (option === 'this script') {
            util.stopThisScript();
        }
    }

    createClone (args, util) {
        // Cast argument to string
        args.CLONE_OPTION = Cast.toString(args.CLONE_OPTION);

        // Set clone target
        let cloneTarget;
        if (args.CLONE_OPTION === '_myself_') {
            cloneTarget = util.target;
        } else {
            cloneTarget = this.runtime.getSpriteTargetByName(args.CLONE_OPTION);
        }

        // If clone target is not found, return
        if (!cloneTarget) return;

        // Create clone
        const newClone = cloneTarget.makeClone();
        if (newClone) {
            this.runtime.addTarget(newClone);

            // Place behind the original target.
            newClone.goBehindOther(cloneTarget);
        }
    }

    deleteClone (args, util) {
        if (util.target.isOriginal) return;
        this.runtime.disposeTarget(util.target);
        this.runtime.stopForTarget(util.target);
    }

    getCounter () {
        return this._counter;
    }

    clearCounter () {
        this._counter = 0;
    }

    incrCounter () {
        this._counter++;
    }

    allAtOnce (args, util) {
        // Since the "all at once" block is implemented for compatiblity with
        // Scratch 2.0 projects, it behaves the same way it did in 2.0, which
        // is to simply run the contained script (like "if 1 = 1").
        // (In early versions of Scratch 2.0, it would work the same way as
        // "run without screen refresh" custom blocks do now, but this was
        // removed before the release of 2.0.)
        util.startBranch(1, false);
    }

    // ---- Custom loop blocks from openblock-blocks ---- //

    forRange (args, util) {
        if (util.stackFrame.breakLoop) {
            util.stackFrame.breakLoop = false;
            return;
        }
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        const start = Cast.toNumber(args.START);
        const end = Cast.toNumber(args.END);
        let step = Cast.toNumber(args.STEP);
        if (step === 0) {
            step = 1;
        }
        if (typeof util.stackFrame.rangeCurrent === 'undefined') {
            util.stackFrame.rangeCurrent = start;
        } else {
            util.stackFrame.rangeCurrent += step;
        }
        const current = util.stackFrame.rangeCurrent;
        const withinRange = step > 0 ? current <= end : current >= end;
        if (withinRange) {
            variable.value = current;
            util.startBranch(1, true);
        }
    }

    forEachList (args, util) {
        if (util.stackFrame.breakLoop) {
            util.stackFrame.breakLoop = false;
            return;
        }
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (typeof util.stackFrame.listIndex === 'undefined') {
            util.stackFrame.listIndex = 0;
            util.stackFrame.listItems = list.value.slice();
        }
        if (util.stackFrame.listIndex < util.stackFrame.listItems.length) {
            variable.value = util.stackFrame.listItems[util.stackFrame.listIndex];
            util.stackFrame.listIndex++;
            util.startBranch(1, true);
        }
    }

    /**
     * Find the nearest enclosing loop frame index in the execution stack.
     * Used by break/continue to navigate back to the loop.
     * @param {object} util - Thread utility
     * @returns {number} Index of the loop frame, or -1 if not found.
     */
    _getNearestLoopFrameIndex (util) {
        for (let i = util.thread.stackFrames.length - 1; i >= 0; i--) {
            if (util.thread.stackFrames[i].isLoop) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Unwind the execution stack back to the given frame index.
     * @param {object} util - Thread utility
     * @param {number} loopFrameIndex - Target frame index
     */
    _unwindToLoop (util, loopFrameIndex) {
        while (util.thread.stack.length - 1 > loopFrameIndex) {
            util.thread.popStack();
        }
    }

    breakLoop (args, util) {
        const loopFrameIndex = this._getNearestLoopFrameIndex(util);
        if (loopFrameIndex < 0) return;
        util.thread.stackFrames[loopFrameIndex].breakLoop = true;
        this._unwindToLoop(util, loopFrameIndex);
    }

    continueLoop (args, util) {
        const loopFrameIndex = this._getNearestLoopFrameIndex(util);
        if (loopFrameIndex < 0) return;
        this._unwindToLoop(util, loopFrameIndex);
    }

    ifElseIfElse (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        const condition2 = Cast.toBoolean(args.CONDITION2);
        if (condition) {
            util.startBranch(1, false);
        } else if (condition2) {
            util.startBranch(2, false);
        } else {
            util.startBranch(3, false);
        }
    }

    switchCaseDefault (args, util) {
        if (Cast.compare(args.VALUE, args.CASE1) === 0) {
            util.startBranch(1, false);
        } else if (Cast.compare(args.VALUE, args.CASE2) === 0) {
            util.startBranch(2, false);
        } else {
            util.startBranch(3, false);
        }
    }
}

module.exports = Scratch3ControlBlocks;
