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
        isClickable: true,
        liveTime: 15,
        notifyCloseBehavior: 'automatically',
        onClick: _.fnEmpty,
        onClose: _.fnEmpty,
        onCreate: _.fnEmpty,
        buttons: []
    };
    const notifyAllowedOptions = ['type', 'iconUrl', 'expandedMessage', 'appIconMaskUrl', 'title', 'message', 'contextMessage', 'priority', 'eventTime', 'buttons', 'imageUrl', 'items', 'progress', 'isClickable'];

    var notifyScope = {
        notifications: {}
    };

    class Notify {
        constructor(options) {
            var self = this;
            options = Object.assign({}, notifyDefaultOptions, options || {});
            options.type = options.type || 'basic';
            options.id = options.id || _.randomGUID();
            options.eventTime = Date.now();
            options.liveTime = _.toInt(options.liveTime);
            _p(self, options);

            _.eventOn(self, 'create', options.onCreate);
            _.eventOn(self, 'click', options.onClick);
            _.eventOn(self, 'close', options.onClose);
            options.buttons.forEach( (button, btnId) => {
                _.eventOn(self, `button${btnId}`, () => options.buttons[btnId].onClick(self) );
                self.close();
            });

            Browser.Notify.close(options.id).then( () => {
                chrome.notifications.create(self.id, self.notifyOptions, () => {
                    self.options.timerId = setTimeout(() => self.close(), self.options.liveTime * 1000);
                    notifyScope.notifications[self.id] = self;
                    _.eventGo(self, 'create', self);
                });
            });
        }
        get isAlive() {
            return (this.options.eventTime + (this.options.liveTime * 1000) - Date.now()) > 0;
        }
        click() {
            _.eventGo(this, 'click', this);
            this.close();
        }
        clickButton(btnId) {
            _.eventGo(this, `button${btnId}`, this);
            this.close();
        }
        close() {
            var self = this;
            return new Promise( resolve => {
                clearTimeout(self.options.timerId);
                chrome.notifications.clear(self.id, () => {
                    _.eventGo(self, 'close', this);
                    delete notifyScope.notifications[self.id];
                    resolve(self.options);
                });
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

    Browser.Notify = {
        createButton(title, iconUrl, onClick) {
            onClick = onClick || _.fnEmpty;
            return { title, iconUrl, onClick };
        },
        createListItem(title, message) {
            return { title, message };
        },
        create (options) {
            var notify = new Notify(options);
            return notify.id;
        },
        close(id) {
            if (notifyScope.notifications[id]) {
                return notifyScope.notifications[id].close();
            }
            return Promise.resolve(false);
        },
        refresh(id) {
            var notify = notifyScope.notifications[id];
            if (!notify || !notify.isAlive) {
                delete notifyScope.notifications[id];
            } else if (notify.options.notifyCloseBehavior == 'manually') {
                notify.close().then(options => new Notify(options));
            }
        },
        refreshAll() {
            return new Promise( resolve => {
                _.keys(notifyScope.notifications).forEach(Browser.Notify.refresh);
                resolve(_.keys(notifyScope.notifications));
            });
        },
        registerHandlers() {
            chrome.notifications.onClosed.addListener( (id, byUser) => {
                try {
                    if (byUser) {
                        Browser.Notify.close(id);
                    }
                } catch (e) {
                    console.log(e.stack);
                }
            });
            chrome.notifications.onClicked.addListener( id => {
                try {
                    var notify = notifyScope.notifications[id];
                    if (notify) {
                        notify.click();
                    }
                } catch (e) {
                    console.log(e.stack);
                }
            });
            chrome.notifications.onButtonClicked.addListener( (id, buttonId) => {
                try {
                    var notify = notifyScope.notifications[id];
                    if (notify) {
                        notify.clickButton(buttonId);
                    }
                    Browser.Notify.close(id);
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
                chrome.storage.sync.set(data, () => resolve(value) );
            });
        },
        load(name) {
            return new Promise( resolve => {
                chrome.storage.sync.get(null,  value => resolve( name ? value[name] : value) )
            });
        },
        clear () {
            return new Promise( resolve => chrome.storage.sync.clear(resolve));
        }
    };

    Browser.openUrl = url => {
        return new Promise(resolve => {
            chrome.tabs.query({}, tabs => {
                for (var i = 0, tab; tab = tabs[i]; i++) {
                    if (tab.url && ~tab.url.indexOf(url)) {
                        chrome.tabs.update(tab.id, {selected: true, url: url}, resolve);
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