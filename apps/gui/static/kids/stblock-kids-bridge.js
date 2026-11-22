(() => {
    if (window.parent === window) return;
    document.documentElement.dataset.stblockKids = 'true';
    const page = /editor\.html$/.test(location.pathname) ? 'editor' : 'home';
    const params = new URLSearchParams(location.search);
    const initialMode = params.get('stblockKidsMode') || sessionStorage.getItem('stblockKidsMode') || 'free';
    const initialMap = sessionStorage.getItem('stblockKidsMap') || 'classroom';
    window.STBLOCK_KIDS_MODE = initialMode;
    sessionStorage.setItem('stblockKidsMode', initialMode);
    sessionStorage.setItem('stblockKidsMap', initialMap);
    document.body.dataset.scratchjrPage = page;
    document.body.dataset.stblockKidsMode = initialMode;
    document.body.dataset.kidsMap = initialMap;

    window.addEventListener('message', event => {
        if (event.source !== window.parent || event.origin !== location.origin) return;
        if (event.data && event.data.type === 'STBLOCK_KIDS_MODE' && ['story', 'robot', 'free'].includes(event.data.mode)) {
            window.STBLOCK_KIDS_MODE = event.data.mode;
            sessionStorage.setItem('stblockKidsMode', event.data.mode);
            document.body.dataset.stblockKidsMode = event.data.mode;
            if (['classroom', 'city', 'garden'].includes(event.data.map)) {
                sessionStorage.setItem('stblockKidsMap', event.data.map);
                document.body.dataset.kidsMap = event.data.map;
            }
        }
    });

    if (page !== 'home' || params.get('stblockKidsLaunch') !== '1') return;
    let attempts = 0;
    const launch = window.setInterval(() => {
        const tile = document.getElementById('newproject');
        attempts += 1;
        if (!tile || !tile.getBoundingClientRect().width) {
            if (attempts > 150) window.clearInterval(launch);
            return;
        }
        window.clearInterval(launch);
        const rect = tile.getBoundingClientRect();
        const coordinates = {bubbles: true, cancelable: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, view: window};
        tile.dispatchEvent(new MouseEvent('mousedown', coordinates));
        tile.dispatchEvent(new MouseEvent('mouseup', coordinates));
    }, 100);
})();
