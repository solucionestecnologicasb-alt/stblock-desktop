const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const test = require('node:test');
const Runtime = require('../scratch-vm/src/engine/runtime');
const {loadCostumeFromAsset} = require('../scratch-vm/src/import/load-costume');
const VirtualMachine = require('../scratch-vm/src/virtual-machine');
const trackSkinRedraw = require('../scratch-vm/src/util/track-skin-redraw');

for (const kind of ['sprite', 'backdrop']) {
    test(`delayed SVG decoding redraws a newly loaded ${kind}`, async () => {
        const runtime = new Runtime();
        const skin = new EventEmitter();
        let decoded = false;
        let displayed = 'Dove';
        let draws = 0;
        const renderer = {
            _allSkins: {0: skin},
            createSVGSkin: () => 0,
            getSkinSize: () => [100, 100],
            getSkinRotationCenter: () => [50, 50],
            draw: () => {
                draws++;
                if (decoded) displayed = 'new costume';
            }
        };
        runtime.renderer = renderer;
        runtime.storage = {AssetType: {ImageVector: {runtimeFormat: 'svg'}}};
        try {
            await loadCostumeFromAsset({
                name: 'new costume',
                asset: {
                    assetId: 'new-asset',
                    assetType: {runtimeFormat: 'svg'},
                    decodeText: () => '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>'
                }
            }, runtime);
            // The target requests a frame before the browser has decoded its SVG.
            runtime.requestRedraw();
            runtime._step();
            assert.equal(runtime.redrawRequested, false);
            assert.equal(displayed, 'Dove');
            decoded = true;
            skin.emit('WasAltered');
            assert.equal(runtime.redrawRequested, true);
            runtime._step();
            assert.equal(displayed, 'new costume');
            assert.equal(runtime.redrawRequested, false);
            runtime._step();
            assert.equal(draws, 2, 'unchanged frames still skip rendering');
        } finally {
            runtime.storage = null;
            runtime.dispose();
        }
    });
}

test('imported and edited costumes share one redraw listener per skin', () => {
    let requests = 0;
    const runtime = {requestRedraw: () => requests++};
    const skin = new EventEmitter();
    trackSkinRedraw(runtime, skin);
    VirtualMachine.prototype._trackSkinRedraw.call({runtime}, skin);
    assert.equal(skin.listenerCount('WasAltered'), 1);
    skin.emit('WasAltered');
    assert.equal(requests, 1);
});
