function createBlocks(vm, blockData) {
    if (!vm || !vm.editingTarget) {
        return {success: false, error: 'No editing target', total: 0, errors: []};
    }

    if (!blockData || !blockData.blockMap) {
        return {success: false, error: 'No block data', total: 0, errors: []};
    }

    var targetBlocks = vm.editingTarget.blocks;
    var blockMap = blockData.blockMap;
    var total = 0;
    var errors = [];

    // Shadows must be created before their parents
    var order = [];
    var created = {};

    function addToOrder(id) {
        if (created[id]) return;
        var block = blockMap[id];
        if (!block) return;

        // Shadow blocks have no dependencies
        if (block.shadow) {
            order.push(id);
            created[id] = true;
            return;
        }

        // Create inputs (shadows and child blocks) first
        for (var inputName in block.inputs) {
            if (!Object.prototype.hasOwnProperty.call(block.inputs, inputName)) continue;
            var input = block.inputs[inputName];
            if (input.shadow && input.shadow !== input.block) {
                addToOrder(input.shadow);
            }
            if (input.block) {
                addToOrder(input.block);
            }
        }

        // Create next block (recursively processes its dependencies too)
        if (block.next) {
            addToOrder(block.next);
        }

        if (!created[id]) {
            order.push(id);
            created[id] = true;
        }
    }

    // Build order: all blocks processed via dependency graph
    for (var id in blockMap) {
        if (!Object.prototype.hasOwnProperty.call(blockMap, id)) continue;
        addToOrder(id);
    }

    // Create blocks in order
    for (var oi = 0; oi < order.length; oi++) {
        var blockId = order[oi];
        var block = blockMap[blockId];

        if (targetBlocks._blocks[blockId]) {
            continue;
        }

        var blockJSON = {
            id: block.id,
            opcode: block.opcode,
            inputs: block.inputs || {},
            fields: block.fields || {},
            next: block.next || null,
            parent: block.parent || null,
            topLevel: !!block.topLevel,
            shadow: !!block.shadow,
            mutation: block.mutation || null
        };

        if (block.topLevel && !block.shadow) {
            blockJSON.x = block.x || 30;
            blockJSON.y = block.y || 30;
        }

        try {
            targetBlocks.createBlock(blockJSON);
            total++;
        } catch (e) {
            errors.push(block.opcode + ': ' + e.message);
        }
    }

    // Emit workspace update to refresh the UI
    try {
        vm.emitWorkspaceUpdate();
    } catch (e) {
        errors.push('emitWorkspaceUpdate: ' + e.message);
        // Fallback: try requestBlocksUpdate via runtime
        try {
            vm.runtime.requestBlocksUpdate();
        } catch (e2) {
            // Silent fail
        }
    }

    // Extra fallback: directly emit workspace update event
    try {
        vm.emit('workspaceUpdate', {xml: ''});
    } catch (_e) {}

    return {
        success: errors.length === 0,
        total: total,
        errors: errors,
        blockIds: Object.keys(blockMap)
    };
}

export default createBlocks;
