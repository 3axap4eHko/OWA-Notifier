function Exchange() {

    var defaultConfig = {
        serverOWA: '',
        serverEWS: '',
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
    exchange.errors = [];
    exchange.lastUpdate = null;
    exchange.maxNotificationNumber = 10; 

    exchange.load = function () {
        $.extend(exchange, defaultConfig, localStorage);
        return exchange;
    };

    exchange.save = function (serverOWA, serverEWS, updateInterval, username, password, volume) {
        localStorage.serverOWA = serverOWA;
        localStorage.serverEWS = serverEWS;
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
        if (exchange.serverOWA && exchange.serverEWS && exchange.updateInterval && exchange.username && exchange.password) {
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
            url     : exchange.serverEWS + '/Exchange.asmx',
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
                    if (tab.url && (tab.url.indexOf(exchange.serverOWA) > -1)) {
                        chrome.tabs.update(tab.id, {selected: true, url: tab.url});
                        return;
                    }
                }
                exchange.owa(exchange.serverOWA, exchange.username, exchange.password);
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
        var changed = false;
        unread = exchange.getUnreadCount(unread);
        if (unread < 0) {
            exchange.disable('error');
        } else {
            if (unread == 0) {
                exchange.enable('');
            } else {
                if (unread > oldUnread) {
                    changed = true;
                    exchange.playSound(exchange.volume);
                    cjs.animate();
                    exchange.enable(unread.toString());
                } else {
                    exchange.enable(unread.toString());
                }
            }
        }
        exchange.unread = unread;
        return changed;
    };

    exchange.animate = function () {
        cjs.animateRotation(function () {
            exchange.enable();
        })
    };


    exchange.displayNotifications = function (data) {
        
        var unreadMessages = $(data).find("Items")[0].childNodes;
        var currentDate = new Date();
        $.each(unreadMessages, function (index, value) {
            
            //Break if we already displayed too many notifications
            if(index > exchange.maxNotificationNumber-1) {
                return false;
            }
            
            //If we have a lst update time then filter messages to display just the ones we didn't displayed yet
            if(exchange.lastUpdate != null) {
                var receivedDateStr = $(value).find("DateTimeReceived")[0].firstChild.nodeValue;
                var receivedDate = Date.parse(receivedDateStr);
                if(receivedDate < exchange.lastUpdate) {
                    return true;
                }
            }
            //TODO: Change this to use rich notifications once they are available everywhere
            var notification = webkitNotifications.createNotification(
                "images/icon256.png",
                "New email from: "+$(value).find("Name")[0].firstChild.nodeValue,
                $(value).find("Subject")[0].firstChild.nodeValue
            );
            
            notification.onclick = function(event) {
                exchange.goToInbox();
            }

            notification.show();
        });
        exchange.lastUpdate = currentDate.valueOf();
    }

    exchange.getUnread = function () {
        var unreadCallback = function(data) {
            var items = $(data).find("Items");
            
            if (exchange.updateIcon(items.length ? items[0].childNodes.length : 0)) {
                exchange.displayNotifications(data);
            }
            exchange.countSet = true;
            if (!exchange.listener) {
                exchange.addListener();
            }
        };
        exchange.update(unreadCallback);
    };

    exchange.test = function (serverEWS, updateInterval, username, password, onSuccess, onError) {

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
                url     : serverEWS + '/Exchange.asmx',
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

        var serverOWA = $(formSelector).find('#outlook-web-access').val();
        var serverEWS = $(formSelector).find('#exchange-web-service').val();
        var updateInterval = parseInt($(formSelector).find('#updateInterval').val());
        var username = $(formSelector).find('#username').val();
        var password = $(formSelector).find('#password').val();
        var volume = $(formSelector).find('#volume').val();
        var success = function () {
            exchange.save(serverOWA, serverEWS, updateInterval, username, password, volume);
            onSuccess();
        };
        exchange.test(serverEWS, updateInterval, username, password, success, onError);
        return exchange;
    };

    exchange.loadForm = function (formSelector) {
        exchange.load();
        $(formSelector).find('#outlook-web-access').val(exchange.serverOWA);
        $(formSelector).find('#exchange-web-service').val(exchange.serverEWS);
        $(formSelector).find('#updateInterval').val(exchange.updateInterval);
        $(formSelector).find('#username').val(exchange.username);
        $(formSelector).find('#password').val(exchange.password);
        $(formSelector).find('#volume').val(exchange.volume);
        return exchange;
    };

    exchange.validForm = function (formSelector) {
        return $(formSelector).find('#exchange-web-service').val() && $(formSelector).find('#outlook-web-access').val() && $(formSelector).find('#updateInterval').val() && $(formSelector).find('#username').val() && $(formSelector).find('#password').val();

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

    exchange.work = function () {
        exchange.xmlAction('items', function () {
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




