'use strict';
(global => {
    _.taskWaitAsync(global, 'settings-load').then( () => {
        componentHandler.upgradeDom();
        var tab = '#general';
        if (window.location.hash.indexOf('#accounts')===0) {
            tab = '#accounts';
        }
        document.querySelector(`[href="${tab}"]`).click();
        window.location.hash = '';
    });
})(window);
