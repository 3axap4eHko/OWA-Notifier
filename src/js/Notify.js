'use strict';
(function () {

    var notifications = {};
    var defaultOptions = {
        title: 'Notification title',
        message: 'Notification message',
        iconUrl: '',
        buttons: []
    };

    function _generateId() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    function _releaseNotify(id) {
        var notify = notifications[id];
        if (notify) {
            if (notify.timerId) {
                clearTimeout(notify.timerId);
            }
        }
        delete notifications[id];

        return notify;
    }

    function define(object, property, value, writable) {
        Object.defineProperty(object, property, {
            enumerable: false,
            configurable: false,
            writable: !!writable,
            value: value
        });
        return object;
    }

    class NotifyListItem {
        constructor(title, message) {
            this.title = title;
            this.message = message;
        }
    }

    class NotifyButton {
        constructor(title, icon, onClick) {
            this.title = title;
            this.iconUrl = icon;
            define(this, 'onClick', onClick || _.fnEmpty);
        }
    }

    class Notify {
        constructor (id, options, onClick, onClose, onCreate) {
            var self = this;
            options = options || {};
            options.eventTime = Date.now();
            if (options.expired) {
                options.timerId = setTimeout(() => self.remove(), _.toInt(options.expired) * 1000);
            }
            delete options.expired;
            _.extend(self, defaultOptions, options);
            if (id == null) {
                id = _generateId();
            }
            define(self, 'id', id);
            define(self, 'timerId', options.timerId);
            define(self, 'onClick', onClick);
            define(self, 'onClose', onClose);
            Promise.resolve(notifications[id] ? notifications[id].remove() : null)
                .then(() => chrome.notifications.create(id, self, id => onCreate(notifications[id] = self)) );
        }
        refresh () {
            var self = this;
            return new Promise(function (resolve) {
                chrome.notifications.clear(self.id, function (removed) {
                    chrome.notifications.create(self.id, self, function (id) {
                        resolve(notifications[id] = self);
                    });
                });
            });
        }
        remove () {
            var self = this;
            return new Promise( resolve => chrome.notifications.clear(self.id, resolve))
                .then( removed => removed ? _releaseNotify(self.id) : false );
        }
        static getAll () {
            return new Promise( resolve => chrome.notifications.getAll(resolve) );
        }
        static createCustom (id, options, onClick, onClose) {
            return Promise.resolve(notifications[id] ? notifications[id].remove() : 1)
                .then( ready => new Promise(resolve => new Notify(id, options, onClick, onClose, resolve)));
        }
        static createBasic (id, options, onClick, onClose) {
            options = options || {};
            options.type = 'basic';
            return Notify.createCustom(id, options, onClick, onClose);
        }
        static createImage (id, options, onClick, onClose) {
            options = options || {};
            options.type = 'image';
            return Notify.createCustom(id, options, onClick, onClose);
        }
        static createList (id, options, onClick, onClose) {
            options = options || {};
            options.type = 'list';
            return Notify.createCustom(id, options, onClick, onClose);
        }
        static createProgress (id, options, onClick, onClose) {
            options = options || {};
            options.type = 'progress';
            return Notify.createCustom(id, options, onClick, onClose);
        }
        static item (title, message) {
            return new NotifyListItem(title, message);
        }
        static button (title, icon, onClick) {
            return new NotifyButton(title, icon, onClick);
        }
        static refreshAll () {
            _.each(notifications, notification => notification.refresh() );
        }
    }

    chrome.notifications.onClosed.addListener( (id, byUser) => {
        try {
            if (byUser) {
                _releaseNotify(id).onClose();
            }
        } catch (e) {
            console.log(e.stack);
        }
    });
    chrome.notifications.onClicked.addListener( id => {
        try {
            if (notifications[id]) {
                notifications[id].remove().then( notification => notification.onClick(notification, id) );
            }
        } catch (e) {
            console.log(e.stack);
        }
    });
    chrome.notifications.onButtonClicked.addListener( (id, buttonId) => {
        try {
            if (notifications[id]) {
                notifications[id].remove().then( notification => notification.buttons[buttonId].onClick(notification, buttonId));
            }
        } catch (e) {
            console.log(e.stack);
        }
    });

    this.Notify = Notify;
}.call(this.global || this.window || global || window, jQuery));