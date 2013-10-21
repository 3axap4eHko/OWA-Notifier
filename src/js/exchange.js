/**
 * TODO http://msdn.microsoft.com/en-us/library/exchange/aa580274(v=exchg.150).aspx
 */
 
function Exchange() {

    var defaultConfig = {
        serverEWS: '',
        serverOWA: '',
        updateInterval: 30,
        notificationDelay: 30,
        username: '',
        password: '',
        volume: 0.3
    };

    var exchange = this;
    var cjs = new CJS({});
    var timerId = 0;

    exchange.countSet = false;
    exchange.listener = false;
    exchange.data = '';
    exchange.errors = [];
    exchange.options = {};
    exchange.unread = 0;
    exchange.unreadItems = [];

    exchange.load = function () {
        Object.keys(defaultConfig).forEach(function(optionKey){
            exchange.options[optionKey] = localStorage.getItem(optionKey);
        });
        return exchange;
    };

    exchange.save = function ( options ) {
        $.extend(localStorage, options, {unread: 0});
        exchange.load();
        exchange.run();
        return exchange;
    };

    exchange.isValid = function () {
        exchange.load();
        return Object.keys(defaultConfig).every(function(optionKey)
        {
            return exchange.options[optionKey] !== null;
        });
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
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
            if (changeInfo.url) {
                exchange.getUnread();
            }
        });
        exchange.listener = true;
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
            chrome.tabs.getAllInWindow(undefined, function (tabs) {
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

    exchange.notification = function(title, message)
    {
        var notify = webkitNotifications.createNotification("/images/icon128.png", title, message);
        notify.show();
        !!exchange.options.notificationDelay || setTimeout(function(){notify.close()}, exchange.options.notificationDelay * 1000);
    };

    exchange.updateIcon = function (unread) {
        var oldUnread = exchange.getUnreadCount(exchange.unread);
        unread = exchange.getUnreadCount(unread);
        if (unread < 0) {
            exchange.disable('error');
        } else {
            if (unread == 0) {
                exchange.enable('');
            } else {
                if (unread > oldUnread) {
                    exchange.playSound(exchange.options.volume);
                    cjs.animate();
                    exchange.enable(unread.toString());
                    exchange.notification('You have '+unread.toString()+' unread emails','');
                } else {
                    exchange.enable(unread.toString());
                }
            }
        }
        exchange.unread = unread;
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
            if (!exchange.listener) {
                exchange.addListener();
            }
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

    exchange.work = function(){
        exchange.xmlAction('folders', function () {
            exchange.getUnread();
        });
    };

    exchange.run = function () {
        clearTimeout(timerId);
        exchange.work();
        timerId = setInterval(exchange.work, exchange.options.updateInterval * 1000);

        if (chrome.commands) {
            chrome.commands.onCommand.addListener(function(command) {
                switch (command)
                {
                    case "openOWA":

                        break;
                    case "notifyOWA":

                        break;
                }
            });
        }
                return exchange;
    };
    exchange.load();
    chrome.browserAction.onClicked.addListener(exchange.goToInbox);
}




