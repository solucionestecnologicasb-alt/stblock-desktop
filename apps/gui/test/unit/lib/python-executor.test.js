import PythonExecutor from '../../../src/lib/python/python-executor';

describe('PythonExecutor green flag program', () => {
    test('loads user code between resetting and firing green flag handlers', () => {
        const executor = new PythonExecutor({});
        const code = '@cuando_bandera_verde\ndef inicio():\n    sprite.mover(10)';
        const program = executor._buildGreenFlagProgram(code);

        expect(program.indexOf('_stblock_prepare_green_flag()')).toBeLessThan(program.indexOf(code));
        expect(program.indexOf(code)).toBeLessThan(program.indexOf('await _stblock_run_green_flag()'));
    });

    test('keeps direct Python statements executable on the green flag', () => {
        const executor = new PythonExecutor({});
        const code = 'sprite.mover(25)';
        const program = executor._buildGreenFlagProgram(code);

        expect(program).toContain(code);
        expect(program).toContain('await _stblock_run_green_flag()');
    });

    test('cooperative Python loops yield until the next animation frame', async () => {
        const executor = new PythonExecutor({
            editingTarget: {},
            runtime: {peripheralExtensions: {}}
        });
        const originalRequestAnimationFrame = global.requestAnimationFrame;
        let frameCallback;
        global.requestAnimationFrame = jest.fn(callback => {
            frameCallback = callback;
            return 1;
        });

        try {
            const yielded = executor.createCallbacks().yieldControl();
            expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
            frameCallback();
            await yielded;
        } finally {
            global.requestAnimationFrame = originalRequestAnimationFrame;
        }
    });
});
