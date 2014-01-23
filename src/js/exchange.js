/**
 * TODO http://msdn.microsoft.com/en-us/library/exchange/aa580274(v=exchg.150).aspx
 */
 
function Exchange() {

    var defaultConfig = {
        serverEWS: '',
        serverOWA: '',
        updateInterval: 30,
        displayTime: 15,
        username: '',
        password: '',
        volume: 0.3
    };

    var exchange = this;
    var cjs = new CJS({});
    var timerId = 0;
    var OWAPermissions = {permissions:['notifications'],origins:['<all_urls>']};

    exchange.countSet = false;
    exchange.listener = false;
    exchange.data = '';
    exchange.errors = [];
    exchange.options = {};
    exchange.unread = 0;
    exchange.unreadItems = [];
    exchange.permitted = false;
    exchange.notify = null;

    exchange.load = function () {
        Object.keys(defaultConfig).forEach(function(optionKey){
            exchange.options[optionKey] = localStorage.getItem(optionKey);
        });
        return exchange;
    };

    exchange.save = function ( options ) {
        $.extend(localStorage, options);
        exchange.load();
        return exchange;
    };

    exchange.isValid = function () {
        exchange.load();
        var result = Object.keys(defaultConfig).every(function(optionKey)
        {
            return exchange.options[optionKey] !== null;
        });

        return result;
    };

    exchange.xmlAction = function (action, callback) {
        $.ajax({
            type    : "GET",
            url     : chrome.extension.getURL('xml/' + action + '.xml'),
            dataType: "text",
            success : function (data) {
                exchange.data = data;
                callback();
            },
            error   : function () {
                chrome.browserAction.setBadgeText({text: 'error'});
            }
        })
    };

    exchange.addListener = function () {
        exchange.listener = true;
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
            if (changeInfo.url) {
                exchange.getUnread();
            }
        });
    };

    exchange.update = function (callback) {
        $.ajax({
            type    : "POST",
            url     : exchange.options.serverEWS + '/Exchange.asmx',
            dataType: "xml",
            headers : {"Content-Type": "text/xml"},
            data    : exchange.data,
            password: exchange.options.password,
            username: exchange.options.username,
            success : callback,
            error   : function () {
                chrome.browserAction.setBadgeText({text: 'error'});
            }
        })

    };

    exchange.goToInbox = function () {

        if (exchange.isValid()) {
            chrome.tabs.query({}, function (tabs) {
                    for (var i = 0, tab; tab = tabs[i]; i++) {
                        if (tab.url && (tab.url.indexOf(exchange.options.serverOWA) > -1)) {
                            chrome.tabs.update(tab.id, {selected: true, url: tab.url});
                            return;
                        }
                    }
                    exchange.owa(exchange.options.serverOWA, exchange.options.username, exchange.options.password);
            });
        } else {
            chrome.tabs.create({url: chrome.extension.getURL('owa_options.html')});
        }
    };

    exchange.disable = function (text) {
        cjs.enableIcon(false);
        chrome.browserAction.setBadgeText({text: text});
    };

    exchange.enable = function (text) {
        cjs.enableIcon(true);
        chrome.browserAction.setBadgeText({text: text});
    };

    exchange.getUnreadCount = function (unread) {
        unread = parseInt(unread);
        return isNaN(unread) ? -1 : unread;
    };

    exchange.playSound = function(volume){
        if(volume){
            cjs.volume(volume);
        }
        cjs.playSound();
    };

    exchange.notification = function(url, data, onclick)
    {
        if (!window.webkitNotifications)
        {
            console.error('Notifications are not supported for this Browser/OS version yet.');
            return;
        }
        if (exchange.permitted) {
            //TODO: change on notifications API will be updated
            exchange.notify && exchange.notify.cancel();
            exchange.notify  = window.webkitNotifications.createNotification(chrome.extension.getURL('images/icon128.png'), data.title, data.message);
            exchange.notify.onclick = onclick || Function.empty;
            exchange.notify.show();
            setTimeout((function() { this.close();}).bind(exchange.notify), (exchange.options.displayTime || 15) * 1000);
        } else {
            window.webkitNotifications.requestPermission();
        }
    };

    exchange.updateIcon = function (unread) {
        var oldUnread = exchange.getUnreadCount(exchange.unread);
        exchange.unread = exchange.getUnreadCount(unread);
        if (exchange.unread < 0) {
            exchange.disable('error');
        } else {
            if (exchange.unread == 0) {
                exchange.enable('');
            } else {
                if (exchange.unread > oldUnread) {
                    exchange.playSound(exchange.options.volume);
                    cjs.animate();
                    exchange.enable(exchange.unread.toString());
                    exchange.notification(
                        'notify.html',
                        {
                            title: ('You have {0} unread mail{1}').fmt(unread, unread>1?'s':''),
                            message: 'Click to view'
                        },
                        function() {
                            exchange.goToInbox();
                            this.close();
                        }
                    );

                } else {
                    exchange.enable(exchange.unread.toString());
                }
            }
        }
    };

    exchange.animate = function () {
        cjs.animateRotation(function () {
            exchange.enable();
        });
    };

    exchange.getUnread = function () {
        var unreadCallback = function (data) {
            var count = $(data).find("UnreadCount")[0].childNodes[0].nodeValue;
            exchange.updateIcon(count);
            exchange.countSet = true;
        };
        exchange.update(unreadCallback);
    };

    exchange.test = function (options, onSuccess, onError) {
        exchange.xmlAction('folders', function () {
            $.ajax({
                type    : "POST",
                url     : options.serverEWS + '/Exchange.asmx',
                dataType: "xml",
                headers : {"Content-Type": "text/xml"},
                data    : exchange.data,
                password: options.password,
                username: options.username,
                success : onSuccess,
                error   : function (jqXHR, textStatus, errorThrown) {
                    if (errorThrown == 'Unauthorized') {
                        onError(
                            [
                                'username',
                                'password'
                            ])
                    } else {
                        onError(
                            [
                                'server'
                            ])
                    }
                }
            })
        })
    };

    exchange.saveForm = function (formSelector, onSuccess, onError) {
        var options = {};
        $(formSelector).find('[data-options]').each(function()
        {
            var $this = $(this),
                filter = window[$this.data('filter')] || Function.self;
            options[$this.data('options')] = filter($this.val());
        });

        var success = function () {
            exchange.save(options);
            onSuccess();
        };
        exchange.test(options, success, onError);
        return exchange;
    };

    exchange.loadForm = function (formSelector) {
        exchange.load();
        $(formSelector).find('[data-options]').each(function()
        {
            var $this = $(this);
            $this.val(exchange.options[$this.data('options')]);
        });
        return exchange;
    };

    exchange.validForm = function (formSelector) {
        var val = '';
        return $(formSelector).find('[data-options]').toArray().every(function(element){
            val = $(element).val();
            return val !== '' && val !== null;
        });
    };

    exchange.owa = function(server, login, password){
        var form = $('<form>',{action: server + '/auth.owa', target: 'owa', method: 'post', id: 'owaAuthForm'})
            .append($('<input>', {name: 'forcedownlevel', value: '0'}))
            .append($('<input>', {name: 'flags', value: 4}))
            .append($('<input>', {name: 'trusted', value: 4}))
            .append($('<input>', {name: 'destination', value: server + '/'}))
            .append($('<input>', {name: 'username', value: login}))
            .append($('<input>', {name: 'password', value: password}))
            .append($('<input>', {name: 'isUtf8', value: 1}));
        $.post(server + '/auth.owa', form.serialize());
        form.remove();
        window.open(server, 'owa');
    };

    exchange.work = function() {
        clearTimeout(timerId);
        if( !exchange.isValid() )
        {
            timerId = setTimeout(exchange.work, 1000);
            window.chrome.browserAction.setBadgeText({text: 'setup'});
        }
        else
        {
            timerId = setTimeout(exchange.work, exchange.options.updateInterval * 1000);
            exchange.xmlAction('folders', function () {
                exchange.getUnread();
            });
        }
    };

    exchange.run = function () {
        exchange.addListener();
        exchange.work();

        return exchange;
    };

    exchange.permitted = window.webkitNotifications.checkPermission() === 0;
    exchange.load();
    window.chrome.browserAction.onClicked.addListener(exchange.goToInbox);

    if (localStorage.getItem('version')!=chrome.app.getDetails().version)
    {
        localStorage.setItem('version', chrome.app.getDetails().version);
        var notify = window.webkitNotifications.createNotification(chrome.extension.getURL('images/icon128.png'), 'Outlook Web Access Notifier', 'Version update notification');
        notify.onclick = function ()
        {
            chrome.tabs.create({url: 'https://chrome.google.com/webstore/detail/owa-notifier/hldldpjjjagjfikfknadmnnmpbbhgihg/details'});
            this.cancel();
        };
        notify.show();
    }
}




