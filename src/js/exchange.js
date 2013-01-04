function Exchange() {

    var defaultConfig = {
        server: '',
        updateInterval: 30,
        username: '',
        password: '',
        volume: 0.3,
        unread: 0
    };

    var exchange = this;
    var cjs = new CJS({});
    var timerId = 0;

    exchange.countSet = false;
    exchange.listener = false;
    exchange.data = '';
    exchange.errors =[];

    exchange.load = function () {
        $.extend(exchange, defaultConfig, localStorage);
        return exchange;
    };

    exchange.save = function (server, updateInterval, username, password, volume) {
        localStorage.server = server;
        localStorage.updateInterval = updateInterval;
        localStorage.username = username;
        localStorage.password = password;
        localStorage.volume = volume;
        localStorage.unread = 0;
        exchange.load();
        exchange.run();
        return exchange;
    };

    exchange.isValid = function () {
        exchange.load();
        if (exchange.server && exchange.updateInterval && exchange.username && exchange.password) {
            return true
        }
        return false;
    };

    exchange.xmlAction = function (action, callback) {
        $.ajax({
            type    : "POST",
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
            url     : exchange.server + '/ews/Exchange.asmx',
            dataType: "xml",
            headers : {"Content-Type": "text/xml"},
            data    : exchange.data,
            password: exchange.password,
            username: exchange.username,
            success : callback,
            error   : function () {
                chrome.browserAction.setBadgeText({text: 'error'});
            }
        })

    };

    exchange.goToInbox = function () {
        chrome.tabs.getAllInWindow(undefined, function (tabs) {
            if (exchange.isValid()) {
                for (var i = 0, tab; tab = tabs[i]; i++) {
                    if (tab.url && (tab.url.indexOf(exchange.server) > -1)) {
                        chrome.tabs.update(tab.id, {selected: true, url: tab.url});
                        return;
                    }
                }
                exchange.owa(exchange.server, exchange.username, exchange.password);
            } else {
                chrome.tabs.create({url: chrome.extension.getURL('owa_options.html')});
            }
        });
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
                    exchange.playSound(exchange.volume);
                    cjs.animate();
                    exchange.enable(unread.toString());
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
        })
    };

    exchange.getUnread = function () {
        var unreadCallback = function (data) {
            exchange.updateIcon($(data).find("UnreadCount")[0].childNodes[0].nodeValue);
            exchange.countSet = true;
            if (!exchange.listener) {
                exchange.addListener();
            }
        };
        exchange.update(unreadCallback);
    };

    exchange.test = function (server, updateInterval, username, password, onSuccess, onError) {

        if ((typeof updateInterval !== 'number') || isNaN(updateInterval) || !(updateInterval > 0)) {
            chrome.browserAction.setBadgeText({text: 'error'});
            if (onError) {
                onError(
                    [
                        'updateInterval'
                    ])
            }
            return;
        }
        this.xmlAction('folders', function () {
            $.ajax({
                type    : "POST",
                url     : server + '/ews/Exchange.asmx',
                dataType: "xml",
                headers : {"Content-Type": "text/xml"},
                data    : exchange.data,
                password: password,
                username: username,
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

        var server = $(formSelector).find('#server').val();
        var updateInterval = parseInt($(formSelector).find('#updateInterval').val());
        var username = $(formSelector).find('#username').val();
        var password = $(formSelector).find('#password').val();
        var volume = $(formSelector).find('#volume').val();
        var success = function () {
            exchange.save(server, updateInterval, username, password, volume);
            onSuccess();
        };
        exchange.test(server, updateInterval, username, password, success, onError);
        return exchange;
    };

    exchange.loadForm = function (formSelector) {
        exchange.load();
        $(formSelector).find('#server').val(exchange.server);
        $(formSelector).find('#updateInterval').val(exchange.updateInterval);
        $(formSelector).find('#username').val(exchange.username);
        $(formSelector).find('#password').val(exchange.password);
        $(formSelector).find('#volume').val(exchange.volume);
        return exchange;
    };

    exchange.validForm = function (formSelector) {
        return $(formSelector).find('#server').val() && $(formSelector).find('#updateInterval').val() && $(formSelector).find('#username').val() && $(formSelector).find('#password').val();

    };

    exchange.owa = function(server, login, password){
        var form = $('<form>',{action: server + '/owa', target: 'owa', method: 'post'});
        form.append($('<input>', {name: 'forcedownlevel', value: '0'}))
            .append($('<input>', {name: 'username', value: login}))
            .append($('<input>', {name: 'password', value: password}))
            .append($('<input>', {name: 'isUtf8', value: 1}));
        form.submit();
    };

    exchange.work = function(){
        exchange.xmlAction('folders', function () {
            exchange.getUnread();
        });
    };

    exchange.run = function () {
        clearTimeout(timerId);
        exchange.work();
        timerId = setInterval(exchange.work, exchange.updateInterval * 1000);
        return exchange;
    };
    exchange.load();
    chrome.browserAction.onClicked.addListener(exchange.goToInbox);
}




