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
});
