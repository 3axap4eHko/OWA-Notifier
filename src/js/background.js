$(function() {
    setInterval(function(){
        Extension.process();
    }, 1000);
});

chrome.windows.onFocusChanged.addListener(function(window) {
    if (window != chrome.windows.WINDOW_ID_NONE) {
        Notify.refreshAll();
    }
});

chrome.idle.onStateChanged.addListener(function(state) {
    if (state === 'active') {
        Notify.refreshAll();
    }
});
