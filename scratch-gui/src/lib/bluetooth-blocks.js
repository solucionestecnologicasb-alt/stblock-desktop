const COLORS = {
    bluetooth: ['#0A8BD6', '#0A73B5', '#075C93']
};

const block = (SB, type, message0, args0, shape, colors, message1, args1) => {
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
            if (message1) {
                json.message1 = message1;
                json.args1 = args1 || [];
            }
            if (shape === 'hat') {
                json.extensions = ['shape_hat'];
            } else if (shape === 'boolean') {
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
const v = name => ({type: 'input_value', name});

/**
 * Register the Bluetooth block category used in Programming mode.
 * @param {object} ScratchBlocks - the Scratch Blocks VM instance.
 */
export default function registerBluetoothBlocks (ScratchBlocks) {
    const SB = ScratchBlocks;
    const bt = COLORS.bluetooth;

    block(SB, 'bt_when_line', 'cuando llegue una línea por Bluetooth', [], 'hat', bt);
    block(SB, 'bt_connect', 'conectar Bluetooth en el puerto %1 a %2', [v('PUERTO'), v('BAUD')], 'command', bt);
    block(SB, 'bt_disconnect', 'desconectar Bluetooth', [], 'command', bt);
    block(SB, 'bt_isConnected', '¿Bluetooth conectado?', [], 'boolean', bt);
    block(SB, 'bt_send', 'enviar por Bluetooth %1', [v('TEXTO')], 'command', bt);
    block(SB, 'bt_sendLine', 'enviar línea por Bluetooth %1', [v('TEXTO')], 'command', bt);
    block(SB, 'bt_sendByte', 'enviar byte %1 por Bluetooth', [v('NUMERO')], 'command', bt);
    block(SB, 'bt_lineAvailable', '¿hay una línea por leer?', [], 'boolean', bt);
    block(SB, 'bt_byteAvailable', '¿hay un byte por leer?', [], 'boolean', bt);
    block(SB, 'bt_readLine', 'leer línea por Bluetooth', [], 'reporter', bt);
    block(SB, 'bt_readByte', 'leer byte por Bluetooth', [], 'reporter', bt);
    block(SB, 'bt_lastLine', 'última línea recibida por Bluetooth', [], 'reporter', bt);
    block(SB, 'bt_lastByte', 'último byte recibido por Bluetooth', [], 'reporter', bt);
    block(SB, 'bt_clearRx', 'vaciar datos recibidos por Bluetooth', [], 'command', bt);
}
