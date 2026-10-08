/**
 * Custom Device Block Definitions
 *
 * Defines additional blocks for device mode that are not present in
 * standard scratch-blocks (MIT official). These blocks are adapted from
 * openblock-blocks and provide Arduino-appropriate functionality:
 *   - Operators: boolean true/false reporters
 *   - Control: for-range, for-each-list, break, continue, if-elseif-else, switch-case
 *   - Procedures: call-with-return, exit, return-value
 */

/**
 * Register all custom blocks on the given ScratchBlocks instance.
 * Must be called after ScratchBlocks is fully initialized.
 * @param {object} ScratchBlocks - The ScratchBlocks (Blockly) module
 */
export default function registerCustomDeviceBlocks (ScratchBlocks) {
    const SB = ScratchBlocks;

    // ========================================================================
    // OPERATORS
    // ========================================================================

    /**
     * Boolean true literal reporter
     */
    SB.Blocks['operator_boolean_true'] = {
        init: function () {
            this.jsonInit({
                message0: 'true',
                category: SB.Categories.operators,
                extensions: ['colours_operators', 'output_boolean']
            });
        }
    };

    /**
     * Boolean false literal reporter
     */
    SB.Blocks['operator_boolean_false'] = {
        init: function () {
            this.jsonInit({
                message0: 'false',
                category: SB.Categories.operators,
                extensions: ['colours_operators', 'output_boolean']
            });
        }
    };

    // ========================================================================
    // CONTROL
    // ========================================================================

    /**
     * For-range loop: "para VARIABLE desde START hasta END paso STEP"
     */
    SB.Blocks['control_for_range'] = {
        init: function () {
            this.jsonInit({
                type: 'control_for_range',
                message0: 'para %1 desde %2 hasta %3 paso %4',
                message1: '%1',
                args0: [
                    {type: 'field_variable', name: 'VARIABLE'},
                    {type: 'input_value', name: 'START'},
                    {type: 'input_value', name: 'END'},
                    {type: 'input_value', name: 'STEP'}
                ],
                args1: [
                    {type: 'input_statement', name: 'SUBSTACK'}
                ],
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * For-each-list loop: "para cada elemento VARIABLE en lista LIST"
     */
    SB.Blocks['control_for_each_list'] = {
        init: function () {
            this.jsonInit({
                type: 'control_for_each_list',
                message0: 'para cada elemento %1 en lista %2',
                message1: '%1',
                args0: [
                    {type: 'field_variable', name: 'VARIABLE'},
                    {type: 'field_variable', name: 'LIST', variableTypes: [SB.LIST_VARIABLE_TYPE]}
                ],
                args1: [
                    {type: 'input_statement', name: 'SUBSTACK'}
                ],
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * Break out of current loop
     */
    SB.Blocks['control_break'] = {
        init: function () {
            this.jsonInit({
                type: 'control_break',
                message0: 'salir del ciclo',
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * Continue to next loop iteration
     */
    SB.Blocks['control_continue'] = {
        init: function () {
            this.jsonInit({
                type: 'control_continue',
                message0: 'continuar ciclo',
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * If-elseif-else multi-branch conditional
     */
    SB.Blocks['control_if_elseif_else'] = {
        init: function () {
            this.jsonInit({
                type: 'control_if_elseif_else',
                message0: SB.Msg.CONTROL_IF,
                message1: '%1',
                message2: 'si no, si %1 entonces',
                message3: '%1',
                message4: SB.Msg.CONTROL_ELSE,
                message5: '%1',
                args0: [
                    {type: 'input_value', name: 'CONDITION', check: 'Boolean'}
                ],
                args1: [
                    {type: 'input_statement', name: 'SUBSTACK'}
                ],
                args2: [
                    {type: 'input_value', name: 'CONDITION2', check: 'Boolean'}
                ],
                args3: [
                    {type: 'input_statement', name: 'SUBSTACK2'}
                ],
                args5: [
                    {type: 'input_statement', name: 'SUBSTACK3'}
                ],
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * Switch-case-default: evaluate a value against cases
     */
    SB.Blocks['control_switch_case_default'] = {
        init: function () {
            this.jsonInit({
                type: 'control_switch_case_default',
                message0: 'evaluar %1',
                message1: 'caso %1',
                message2: '%1',
                message3: 'caso %1',
                message4: '%1',
                message5: 'caso contrario',
                message6: '%1',
                args0: [
                    {type: 'input_value', name: 'VALUE'}
                ],
                args1: [
                    {type: 'input_value', name: 'CASE1'}
                ],
                args2: [
                    {type: 'input_statement', name: 'SUBSTACK'}
                ],
                args3: [
                    {type: 'input_value', name: 'CASE2'}
                ],
                args4: [
                    {type: 'input_statement', name: 'SUBSTACK2'}
                ],
                args6: [
                    {type: 'input_statement', name: 'SUBSTACK3'}
                ],
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_statement']
            });
        }
    };

    /**
     * Infinite loop: "bucle infinito" - generates while(true) wherever placed
     */
    SB.Blocks['control_infinite_loop'] = {
        init: function () {
            this.jsonInit({
                type: 'control_infinite_loop',
                message0: 'bucle infinito',
                message1: '%1',
                message2: '%1',
                lastDummyAlign2: 'RIGHT',
                args1: [
                    {type: 'input_statement', name: 'SUBSTACK'}
                ],
                args2: [
                    {
                        type: 'field_image',
                        src: SB.mainWorkspace.options.pathToMedia + 'repeat.svg',
                        width: 24,
                        height: 24,
                        alt: '*',
                        flip_rtl: true
                    }
                ],
                category: SB.Categories.control,
                extensions: ['colours_control', 'shape_end']
            });
        }
    };

    // ========================================================================
    // PROCEDURES
    // ========================================================================

    /**
     * Call a procedure as a reporter (returns a value)
     * Uses the same ProcedureUtils infrastructure as procedures_call.
     */
    SB.Blocks['procedures_call_return'] = {
        init: function () {
            this.jsonInit({
                extensions: ['colours_more', 'output_number', 'output_string',
                    'procedure_call_contextmenu']
            });
            this.procCode_ = '';
            this.argumentIds_ = [];
            this.warp_ = false;
        },
        getProcCode: SB.ScratchBlocks.ProcedureUtils.getProcCode,
        removeAllInputs_: SB.ScratchBlocks.ProcedureUtils.removeAllInputs_,
        disconnectOldBlocks_: SB.ScratchBlocks.ProcedureUtils.disconnectOldBlocks_,
        deleteShadows_: SB.ScratchBlocks.ProcedureUtils.deleteShadows_,
        createAllInputs_: SB.ScratchBlocks.ProcedureUtils.createAllInputs_,
        updateDisplay_: SB.ScratchBlocks.ProcedureUtils.updateDisplay_,
        mutationToDom: SB.ScratchBlocks.ProcedureUtils.callerMutationToDom,
        domToMutation: SB.ScratchBlocks.ProcedureUtils.callerDomToMutation,
        populateArgument_: SB.ScratchBlocks.ProcedureUtils.populateArgumentOnCaller_,
        addProcedureLabel_: SB.ScratchBlocks.ProcedureUtils.addLabelField_,
        attachShadow_: SB.ScratchBlocks.ProcedureUtils.attachShadow_,
        buildShadowDom_: SB.ScratchBlocks.ProcedureUtils.buildShadowDom_
    };

    /**
     * Exit the current procedure early
     */
    SB.Blocks['procedures_exit'] = {
        init: function () {
            this.jsonInit({
                type: 'procedures_exit',
                message0: 'salir de la funcion',
                category: SB.Categories.more,
                extensions: ['colours_more', 'shape_statement']
            });
        }
    };

    /**
     * Return a value from a procedure
     */
    SB.Blocks['procedures_return_value'] = {
        init: function () {
            this.jsonInit({
                type: 'procedures_return_value',
                message0: 'devolver %1',
                args0: [
                    {type: 'input_value', name: 'VALUE'}
                ],
                category: SB.Categories.more,
                extensions: ['colours_more', 'shape_statement']
            });
        }
    };
}
