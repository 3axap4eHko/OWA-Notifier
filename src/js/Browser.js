'use strict';

((window) => {
    const _p = _.p();
    var Browser = {};

    var messageScope = {};
    Browser.Message = {
        send(action, ...args) {
            return new Promise(resolve => chrome.runtime.sendMessage({action: action, args: args }, resolve) );
        },
        on(action, listener) {
            _.eventOn(messageScope, action, event => listener(event.args, event.response) );
            return Browser.Message;
        },
        proxy(target) {
            Object.keys(target).forEach( key => Browser.Message.on(key, (args, response) => target[key](...args).then(response)) );
        }
    };

    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        if (sender.id !== chrome.runtime.id) return;
        request = request || {};
        _.eventGo(messageScope, request.action, {args: _.toArray(request.args), response: sendResponse });
        return true;
    });

    const notifyDefaultOptions = {
        title: 'Notification title',
        message: 'Notification message',
        iconUrl: '',
        onClick: _.fnEmpty,
        onClose: _.fnEmpty,
        buttons: []
    };
    const notifyAllowedOptions = ['type', 'iconUrl', 'appIconMaskUrl', 'title', 'message', 'contextMessage', 'priority', 'eventTime', 'buttons', 'imageUrl', 'items', 'progress', 'isClickable'];

    class Notify {
        constructor(options) {
            var self = this;
            options = Object.assign({}, notifyDefaultOptions, options || {});
            options.type = options.type || 'basic';
            options.id = options.id || _.randomGuid();
            options.eventTime = Date.now();
            _p(self, options);
            _.eventOn(self, 'click', options.onClick);
            _.eventOn(self, 'close', options.onClose);
            _.eventOn(self, 'button', (id, btnId) => {
                if(options.buttons[btnId]) {
                    options.buttons[btnId].onClick(self);
                }
            });
        }
        get options () {
            return _p(this);
        }
        get id () {
            return this.options.id;
        }
        get notifyOptions() {
            var options = this.options;
            var notifyOptions = notifyAllowedOptions.reduce((notifyOptions, key) => {
                if (options.hasOwnProperty(key)) {
                    notifyOptions[key] = options[key];
                }
                return notifyOptions;
            }, {} );
            notifyOptions.buttons = notifyOptions.buttons.map( button =>({title: button.title, iconUrl: button.iconUrl}));

            return notifyOptions;
        }
    }
    var notifyScope = {
        notifications: {}
    };
    Browser.Notify = {
        createButton(title, iconUrl, onClick) {
            onClick = onClick || _.fnEmpty;
            return { title, iconUrl, onClick };
        },
        createListItem(title, message) {
            return { title, message };
        },

        create (notify) {
            if (!(notify instanceof Notify)) {
                notify = new Notify(notify);
            }

            return new Promise( resolve => {
                chrome.notifications.create(notify.id, notify.notifyOptions, id => {
                    if (notify.options.liveTime) {
                        notify.options.timerId = setTimeout(() => Browser.Notify.close(id), _.toInt(notify.options.liveTime) * 1000);
                    }
                    resolve(notify);
                    if (notify.options.notifyCloseBehavior == 'manually') {
                        notifyScope.notifications[id] = notify;
                    }
                });
            });
        },
        close(id) {
            return new Promise( resolve => {
                var notify = notifyScope.notifications[id];
                if (notify) {
                    chrome.notifications.clear(id, removed => resolve(notify));
                }
                delete notifyScope.notifications[id];
            });
        },
        refresh(id) {
            return Browser.Notify.close(id).then( notify => Browser.Notify.create(notify) );
        },
        refreshAll() {
            return Promise.all(_.keys(notifyScope.notifications).map(Browser.Notify.refresh));
        },
        registerHandlers() {
            chrome.notifications.onClosed.addListener( (id, byUser) => {
                try {
                    var notify = notifyScope.notifications[id];
                    if (notify && byUser) {
                        _.eventGo(notify, 'close', id, byUser);
                        delete notifyScope.notifications[id];
                    }
                } catch (e) {
                    console.log(e.stack);
                }
            });
            chrome.notifications.onClicked.addListener( id => {
                try {
                    var notify = notifyScope.notifications[id];
                    if (notify) {
                        _.eventGo(notify, 'click', id);
                        Browser.Notify.close(id);
                    }
                } catch (e) {
                    console.log(e.stack);
                }
            });
            chrome.notifications.onButtonClicked.addListener( (id, buttonId) => {
                try {
                    var notify = notifyScope.notifications[id];
                    if (notify) {
                        _.eventGo(notify, 'button', id, buttonId);
                        Browser.Notify.close(id);
                    }
                } catch (e) {
                    console.log(e.stack);
                }
            });
        }
    };

    const stateScope = {};
    Browser.state = {
        onFocus(listener) {
            _.eventOn(stateScope, 'focus', listener);
        },
        onBlur(listener) {
            _.eventOn(stateScope, 'blur', listener);
        },
        onActive(listener) {
            _.eventOn(stateScope, 'active', listener);
        },
        onIdle(listener) {
            _.eventOn(stateScope, 'idle', listener);
        },
        onLocked(listener) {
            _.eventOn(stateScope, 'locked', listener);
        }
    };
    chrome.windows.onFocusChanged.addListener( window => {
        if (window != chrome.windows.WINDOW_ID_NONE) {
            _.eventGo(stateScope, 'focus');
        } else {
            _.eventGo(stateScope, 'blur');
        }
    });
    chrome.idle.onStateChanged.addListener(state => {
        _.eventGo(stateScope, state);
    });

    Browser.log = {
        write (message) {
            var messages = Browser.log.read();
            messages[Date.now()] = message;
            localStorage.setItem('logs', JSON.stringify(messages));
            return message;
        },
        read () {
            return JSON.parse(localStorage.getItem('logs')) || {};
        },
        clear () {
            localStorage.setItem('logs', '{}');
        }
    };

    Browser.storage = {
        save (name, value) {
            return new Promise(resolve => {
                var data = {};
                data[name] = value;
                chrome.storage.local.set(data, () => resolve(value) );
            });
        },
        load(name) {
            return new Promise( resolve => {
                chrome.storage.local.get(undefined,  value => resolve( name ? value[name] : value) )
            });
        }
    };

    Browser.openUrl = url => {
        return new Promise(resolve => {
            chrome.tabs.query({}, tabs => {
                for (var i = 0, tab; tab = tabs[i]; i++) {
                    if (tab.url && ~tab.url.indexOf(url)) {
                        chrome.tabs.update(tab.id, {selected: true, url: tab.url}, resolve);
                        return;
                    }
                }
                chrome.tabs.create({url: url}, resolve);
            });
        });
    };

    const defaultXHROptions = {
        method: 'GET',
        data: null,
        headers: {},
        charset: 'utf-8',
        responseType: '',
        onLoad: _.fnEmpty,
        onProgress: _.fnEmpty,
        onError: _.fnEmpty,
        onAbort: _.fnEmpty,
        onSending: _.fnEmpty
    };

    function normalizeHeaderName(name) {
        return (name || '').split(/[-_\s]/g).map(_.stringToUpperCaseFirst).join('-');
    }

    Browser.ajax = options => {
        options = _.merge({}, defaultXHROptions, options);
        options.method = options.method.toUpperCase();

        var xhr = new XMLHttpRequest();

        xhr.addEventListener('progress', () => options.onProgress(xhr));
        xhr.addEventListener('load', () => {
            if ( _.toInt(xhr.status/100) == 2 ) {
                options.onLoad(xhr);
            } else {
                options.onError(xhr)
            }
        });
        xhr.addEventListener('error', () => options.onError(xhr));
        xhr.addEventListener('abort', () => options.onAbort(xhr));

        xhr.open(options.method, options.url, true);
        if (options.withCredentials) {
            xhr.withCredentials = true;
        }
        _.each(options.headers, (values, name) => {
            if (!_.isArray(values)){
                values = [values];
            }
            name = normalizeHeaderName(name);
            values.forEach( value => xhr.setRequestHeader(name, value));
        });
        xhr.responseType = options.responseType;
        options.onSending(xhr);
        xhr.send(options.data);
    };

    Browser.Extension = {
        get version() {
            return chrome.app.getDetails().version;
        },
        getUrl(uri) {
            return chrome.extension.getURL(uri);
        },
        setBadgeText(text) {
            chrome.browserAction.setBadgeText({text});
        },
        get storeUrl() {
            return 'https://chrome.google.com/webstore/detail/outlook-web-access-notifi/hldldpjjjagjfikfknadmnnmpbbhgihg';
        }
    };

    Browser.getXMLElement = (xml, tagName) => {
        return xml.getElementsByTagName(tagName)[0];
    };
    Browser.getXMLElementText = (xml, tagName) => {
        return (xml.getElementsByTagName(tagName)[0] || {}).innerHTML;
    };
    Browser.getXMLElementChildren = (xml, tagName) => {
        return _.toArray((xml.getElementsByTagName(tagName)[0] || {}).children);
    };
    Browser.getXMLAttribute = (xml, tagName, attribute) => {
        return (xml.getElementsByTagName(tagName)[0] || {getAttribute: _.fnEmpty} ).getAttribute(attribute);
    };
    window.Browser = Browser;


    class Time {
        constructor(hours, minutes, seconds){
            this.hours = _.toInt(hours);
            this.minutes = _.toInt(minutes);
            this.seconds = _.toInt(seconds);
        }
        getTotalSeconds(){
            return _.toInt(this.seconds) + 60*_.toInt(this.minutes) + 3600*_.toInt(this.hours);
        };
        toString(){
            return _.fmtNumber(this.hours,2) + ':' + _.fmtNumber(this.minutes,2) + ':' + _.fmtNumber(this.seconds,2);
        }
    }
    Time.fromString = function(string){
        return _.create(Time, string.split(':'));
    };
    Time.fromSeconds = function(seconds){
        var time = new Time();
        time.seconds = seconds % 60;
        time.minutes = _.toInt(( seconds - time.seconds ) % 3600 / 60);
        time.hours = _.toInt(seconds / 3600);
        return time;
    };
    window.Time = Time;
})(window);