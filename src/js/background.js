$(() => {
    setInterval(() => {
        try {
            Extension.process();
        } catch (e) {
            Extension.logError(e);
        }
    }, 1000);
});

chrome.windows.onFocusChanged.addListener( window => {
    Extension.getConfig().then(config => {
        if (config.popupClosing==='manually' && window != chrome.windows.WINDOW_ID_NONE) {
            Notify.refreshAll();
        }
    });
});

chrome.idle.onStateChanged.addListener(state => {
    Extension.getConfig().then(config => {
        if (config.popupClosing==='manually' &&  state === 'active') {
            Notify.refreshAll();
        }
    });
});
