$(function() {
    setInterval(function(){
        try {
            Extension.process();
        } catch (e) {
            Extension.logError(e);
        }
    }, 1000);
});

chrome.windows.onFocusChanged.addListener(function(window) {
    Extension.getConfig().then(function(config){
        if (config.popupClosing==='manually' && window != chrome.windows.WINDOW_ID_NONE) {
            Notify.refreshAll();
        }
    });
});

chrome.idle.onStateChanged.addListener(function(state) {
    Extension.getConfig().then(function(config){
        if (config.popupClosing==='manually' &&  state === 'active') {
            Notify.refreshAll();
        }
    });
});
