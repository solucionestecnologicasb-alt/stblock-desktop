/* eslint-env jest */
import targetsReducer, {updateTargets, updateTargetStates} from '../../../src/reducers/targets';

test('incremental target state preserves unchanged targets and structural metadata', () => {
    const initial = targetsReducer(undefined, updateTargets([
        {id: 'stage', isStage: true, name: 'Stage', x: 0},
        {id: 'one', isStage: false, name: 'One', x: 0, blocks: {large: true}},
        {id: 'two', isStage: false, name: 'Two', x: 5}
    ], 'one'));

    const unchangedSprite = initial.sprites.two;
    const next = targetsReducer(initial, updateTargetStates([
        {id: 'one', isStage: false, x: 25, y: -10}
    ]));

    expect(next.sprites.one.x).toBe(25);
    expect(next.sprites.one.y).toBe(-10);
    expect(next.sprites.one.name).toBe('One');
    expect(next.sprites.one.blocks).toEqual({large: true});
    expect(next.sprites.two).toBe(unchangedSprite);
    expect(next.editingTarget).toBe('one');
});

test('incremental state ignores targets not present in the structural list', () => {
    const initial = targetsReducer(undefined, updateTargets([], null));
    const next = targetsReducer(initial, updateTargetStates([
        {id: 'missing', isStage: false, x: 10}
    ]));
    expect(next).toBe(initial);
});
