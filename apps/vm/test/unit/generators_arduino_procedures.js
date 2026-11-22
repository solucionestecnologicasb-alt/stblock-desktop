const test = require('tap').test;
const ArduinoGenerator = require('../../src/generators/arduino/index.js');

// A procedure definition's body can be stored in two ways, depending on how the
// Blockly workspace is serialized:
//   - block.next                    (standard hat stack)
//   - block.inputs.SUBSTACK.block   (C-block style)
// The prototype may also be referenced through inputs.custom_block.block or
// inputs.custom_block.shadow. The generator must handle all of these.
const makeBlocks = function (opts) {
    const blocks = {
        hat: {
            opcode: 'stbBoardV2_whenArduinoBegin',
            topLevel: true,
            parent: null,
            next: 'call',
            inputs: {},
            fields: {}
        },
        call: {
            opcode: 'procedures_call',
            parent: 'hat',
            next: null,
            mutation: {proccode: 'hd', argumentids: '[]'},
            inputs: {},
            fields: {}
        },
        def: {
            opcode: 'procedures_definition',
            topLevel: true,
            parent: null,
            next: opts.bodyViaNext ? 'body1' : null,
            inputs: {
                custom_block: {
                    name: 'custom_block',
                    block: opts.protoViaShadow ? null : 'proto',
                    shadow: opts.protoViaShadow ? 'proto' : null
                },
                SUBSTACK: opts.bodyViaSubstack ? {name: 'SUBSTACK', block: 'body1', shadow: null} : null
            },
            fields: {}
        },
        proto: {
            opcode: 'procedures_prototype',
            parent: 'def',
            next: null,
            mutation: {proccode: 'hd', argumentids: '[]'},
            inputs: {},
            fields: {}
        },
        body1: {
            opcode: 'arduino_digitalWrite',
            parent: 'def',
            next: null,
            inputs: {
                PIN: {name: 'PIN', block: 'pin', shadow: null}
            },
            fields: {VALUE: {name: 'VALUE', value: 'HIGH'}}
        },
        pin: {
            opcode: 'math_number',
            parent: 'body1',
            next: null,
            inputs: {},
            fields: {NUM: {name: 'NUM', value: '13'}}
        }
    };
    // Drop the empty SUBSTACK entry to keep the fixture honest for non-C-block runs.
    if (!opts.bodyViaSubstack) {
        delete blocks.def.inputs.SUBSTACK;
    }
    return blocks;
};

const generate = function (blocks) {
    const gen = new ArduinoGenerator();
    const code = gen.generateCode(blocks, {targets: []});
    return {code, funcs: Array.from(gen.functions.keys())};
};

test('procedure definition registered when body is stored via block.next', t => {
    const {code, funcs} = generate(makeBlocks({bodyViaNext: true}));
    t.same(funcs, ['hd']);
    t.match(code, /void hd\(\) \{\s*digitalWrite\(13, HIGH\);/);
    t.end();
});

test('procedure definition registered when body is stored via inputs.SUBSTACK', t => {
    const {code, funcs} = generate(makeBlocks({bodyViaSubstack: true}));
    t.same(funcs, ['hd']);
    t.match(code, /void hd\(\) \{\s*digitalWrite\(13, HIGH\);/);
    t.end();
});

test('procedure definition registered when prototype is referenced via shadow', t => {
    const {code, funcs} = generate(makeBlocks({bodyViaNext: true, protoViaShadow: true}));
    t.same(funcs, ['hd']);
    t.match(code, /void hd\(\) \{\s*digitalWrite\(13, HIGH\);/);
    t.end();
});

test('procedure call still emits hd(); in setup', t => {
    const {code} = generate(makeBlocks({bodyViaSubstack: true}));
    t.match(code, /void setup\(\) \{\s*hd\(\);/);
    t.end();
});
