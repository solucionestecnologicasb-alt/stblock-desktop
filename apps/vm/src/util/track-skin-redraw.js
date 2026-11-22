/**
 * Request a frame when an asynchronously decoded costume becomes renderable.
 * Both imported and edited SVGs must participate in dirty-state rendering.
 * @param {object} runtime Runtime which owns the skin.
 * @param {object} skin Renderer skin, if available.
 */
const trackSkinRedraw = (runtime, skin) => {
    if (!skin || typeof skin.on !== 'function') return;
    if (!runtime._skinRedrawTracked) runtime._skinRedrawTracked = new WeakSet();
    if (runtime._skinRedrawTracked.has(skin)) return;
    runtime._skinRedrawTracked.add(skin);
    skin.on('WasAltered', () => runtime.requestRedraw());
};

module.exports = trackSkinRedraw;
