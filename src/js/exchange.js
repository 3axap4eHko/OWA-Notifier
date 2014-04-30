'use strict';
(function(){
    var config = {
            icon: {
                disable                    : {
                    image     : 'images/icon_d.png',
                    background: [190,190,190,230]
                },
                enable                     : {
                    image     : 'images/icon.png',
                    background:[208,0,24,255]
                },
                animation: {
                    frames: 36,
                    speed: 10
                },
                image: 'images/icon128.png',
                width: 19,
                height: 19
            },
            sound: 'sounds/mail_sound.ogg',
            defaultOptions: {
                updateInterval: 30,
                displayTime: 15,
                volume: 0.3
            }
        },
        audio = document.createElement('audio'),
        canvas = document.createElement('canvas'),
        canvasContext = audio.setAttribute('height', config.icon.height+'px') || audio.setAttribute('width',config.icon.width+'px') || canvas.getContext('2d'),
        image = document.createElement('img'),
        options = {},
        accounts = [],
        actionsData = {},
        E = {},
        items = [],
        folders = [],
        isOldAPI = !!chrome.notifications;

    audio.setAttribute('preload', 'auto');
    audio.setAttribute('src',config.sound);
    image.setAttribute('src',config.icon.image);

    function animation(drawing, options) {
        return function(){
            var id = setInterval((function(){
                canvasContext.save();
                drawing.apply(this);
                canvasContext.restore();
                chrome.browserAction.setIcon({imageData: canvasContext.getImageData(0, 0, options.width, options.height)});
                this.iteration += 1/this.frames;
                if (this.iteration >= 1)
                    clearInterval(id);
            }).bind({
                    iteration:0,
                    frames: options.frames,
                    context: options.context,
                    image: options.image,
                    height: options.height,
                    width: options.width
                }), options.speed);
        };
    }

    function getXML(action, callback) {
        if(!actionsData[action])
        {
            $.ajax({
                type    : "GET",
                url     :  chrome.extension.getURL('xml/' + action + '.xml'),
                dataType: "text",
                success: function(response){
                    actionsData[action] = response;
                    callback();
                }
            });
        } else {
            callback();
        }
    }

    function doAction(parameters, callback)
    {
        getXML(parameters.action, function(){
            $.ajax({
                type    : "POST",
                url     : parameters.serverEWS + '/Exchange.asmx',
                dataType: "xml",
                headers : {"Content-Type": "text/xml"},
                data    : String.prototype.fmt.apply(actionsData[parameters.action], parameters.format || []),
                password: parameters.password,
                username: parameters.username,
                success : callback,
                complete   : function (response) {
                    var code = response.status/100| 0;
                    if (code!==2)
                    {
                        if (response.statusText=='error')
                        {
                            response.status = 444;
                        }
                        chrome.browserAction.setBadgeText({text: 'e' + response.status});
                    }
                }
            })
        });
    }

    function openUrl(url)
    {
        chrome.tabs.query({}, function (tabs) {
            for (var i = 0, tab; tab = tabs[i]; i++) {
                if (tab.url && ~tab.url.indexOf(url)) {
                    chrome.tabs.update(tab.id, {selected: true, url: tab.url});
                    return;
                }
            }
            chrome.tabs.create({url: url});
        });
    }

    E.$ = {
        icon : {
            enable: function(enable){
                if(enable){
                    chrome.browserAction.setIcon({path: config.icon.enable.image});
                    chrome.browserAction.setBadgeBackgroundColor({color:config.icon.enable.background});
                }else{
                    chrome.browserAction.setIcon({path: config.icon.disable.image});
                    chrome.browserAction.setBadgeBackgroundColor({color:config.icon.disable.background});
                }
            },
            animate: {
                rotate: animation(function(){
                    this.context.clearRect(0, 0, this.width, this.height);
                    this.context.translate(Math.ceil(this.width / 2), Math.ceil(this.height / 2));
                    this.context.rotate(2 * Math.PI * ((1 - Math.sin(Math.PI / 2 + this.iteration * Math.PI)) / 2));
                    this.context.drawImage(this.image, -Math.ceil(this.width / 2), -Math.ceil(this.height / 2));
                },{ frames: config.icon.animation.frames,
                    speed: config.icon.animation.speed,
                    context: canvasContext,
                    image: image,
                    height: config.icon.height,
                    width: config.icon.width
                }),
                collapse: animation(function(){
                    var delta = 2* Math.PI * this.iteration;
                    this.context.clearRect(0, 0, this.width, this.height);
                    this.context.scale(1, 0.5 + 0.5*Math.cos(delta));
                    this.context.drawImage(this.image, 0, this.height * (0.5 - 0.5*Math.cos(delta)));
                },{ frames: config.icon.animation.frames,
                    speed: config.icon.animation.speed,
                    context: canvasContext,
                    image: image,
                    height: config.icon.height,
                    width: config.icon.width
                })
            }
        },
        sound: {
            play: function(soundFile) {
                try{
                    audio.pause();
                    audio.currentTime = 0;
                    if (soundFile){
                        audio.setAttribute('src', soundFile);
                    }
                    audio.play();
                }catch (e){

                }

                return E.$.sound;
            },
            volume: function(value)
            {
                try{
                    audio.muted=(value==0);
                    audio.volume=value;
                }catch (e){

                }

                return E.$.sound;
            }
        },
        accounts: {
            load : function()
            {
                return accounts=JSON.parse(localStorage.getItem('accounts'));
            },
            save: function(accs)
            {
                localStorage.setItem('accounts', JSON.stringify(accounts=accs));
            }
        },

        options: {
            open: function()
            {
                var optionsUrl = chrome.extension.getURL('settings.html');
                openUrl(optionsUrl);
            },
            load : function()
            {
                return options=JSON.parse(localStorage.getItem('options'));
            },
            save: function(opts)
            {
                localStorage.setItem('options', JSON.stringify(options=opts));
            }
        },
        web: {
            open: function(account)
            {
                var form = $('<form>',{action: account.serverOWA + '/auth.owa', target: 'owa', method: 'post', id: 'owaAuthForm'})
                    .append($('<input>', {name: 'forcedownlevel', value: '0'}))
                    .append($('<input>', {name: 'flags', value: 4}))
                    .append($('<input>', {name: 'trusted', value: 4}))
                    .append($('<input>', {name: 'destination', value: account.serverOWA + '/'}))
                    .append($('<input>', {name: 'username', value: account.username}))
                    .append($('<input>', {name: 'password', value: account.password}))
                    .append($('<input>', {name: 'isUtf8', value: 1}));
                try{
                    $.ajax({
                        url: account.serverOWA + '/auth.owa',
                        data: form.serialize(),
                        type: 'post',
                        username: account.username,
                        password: account.password
                    });
                }catch (e){
                }
                form.remove();
                openUrl(account.serverOWA);
            }
        },
        service: {
            updateUnread: function(account, callback)
            {
                var parameters = $.extend({action: 'find-folders', format: ['root']},account);
                doAction(parameters,
                    function (data) {
                        callback($(data).find('DisplayName:contains("AllItems")').parent().find('UnreadCount').text().toInt());
                    });

                return E.$.service;
            },
            updateUnreadInbox: function(account)
            {
                var parameters = $.extend({action: 'find-folders', format: ['inbox']},account);
                doAction(parameters,
                    function (data) {
                    });

                return E.$.service;
            },

            updateItems: function(account)
            {
                var parameters = $.extend({action: 'find-items'},account);
                doAction(parameters, function(data) {
                    var item;
                    items = [];
                    $(data).find("Message").each(function(idx, message){
                        message = $(message);
                        item = {
                            subject: message.find('Subject').text(),
                            from: message.find('Name').text(),
                            to: message.find('DisplayTo').text(),
                            cc: message.find('DisplayCc').text(),
                            importance: message.find('Importance').text()
                        };
                        items.push(item);
                    });
                    $(document).trigger('items');
                });

                return E.$.service;
            }
        },
        notification: {
            updateUnread: function(unread)
            {
                chrome.browserAction.getBadgeText({}, function(oldText){
                    if (oldText!=unread.toString())
                    {
                        if(unread.toInt()>0)
                        {
                        chrome.browserAction.setBadgeText({text: unread.toString()});
                        E.$.sound.volume(options.volume).play();
                        E.$.notification.notify({
                            title: 'Unread emails',
                            message: 'You have '+unread + ' emails',
                            icon: chrome.extension.getURL(config.icon.image)
                        });
                        $(document).trigger('unread');
                        } else {
                            chrome.browserAction.setBadgeText({text: ''});
                        }
                    }
                });

            },
            notify: isOldAPI ?
                (function(parameters) {
                    parameters.onclick || (this.notification && this.notification.cancel());
                    this.notification = window.webkitNotifications.createNotification(parameters.icon, parameters.title, parameters.message);
                    this.notification.onclick = parameters.onclick || (function()
                    {
                        for(var idx in accounts)
                        {
                            if (accounts.hasOwnProperty(idx) && parseInt(accounts[idx].unread)>0)
                            {
                                E.$.web.open(accounts[idx]);
                                this.notification.cancel();
                                return;
                            }
                        }
                    }).bind(this);
                    this.notification.show();
                    var displayTime = parameters.displayTime || options.displayTime;
                    displayTime>0 && setTimeout((function(){
                        this.notification && this.notification.cancel();
                    }).bind(this), displayTime * 1000);
                }).bind({notification: null})
                :
                (function(parameters) {
                    parameters.notificationId || chrome.notifications.clear(this.notificationId);
                    this.notificationId = parameters.notificationId || 'mailNotification'+(+new Date());
                    var displayTime = parameters.displayTime || options.displayTime;
                    chrome.notifications.create(this.notificationId, {
                        type: 'basic',
                        title: parameters.title,
                        message: parameters.message,
                        iconUrl: parameters.icon
                    }, function(notificationId){
                        displayTime>0 && setTimeout((function(){
                            chrome.notifications.clear(notificationId);
                        }).bind(this), displayTime * 1000);
                    });
                }).bind({notificationId: null})
        },
        worker: {
            main: function()
            {
                var unread = 0,
                    accounts = (E.$.accounts.load() || []),
                    observer = new Observer(function(){
                        E.$.notification.updateUnread(unread);
                        E.$.accounts.save(accounts);
                    },1);
                accounts.forEach(function(account){
                    observer.started();
                    E.$.service.updateUnread(account, function(count){
                        account.unread = count;
                        unread+=count;
                        observer.finished();
                    });
                });
                observer.finished();
            },
            controller: function()
            {
                options = E.$.options.load();
                accounts = (E.$.accounts.load() || []);
                if (options && accounts.length>0)
                {
                    if(E.$.worker.main.updateInterval!=options.updateInterval)
                    {
                        E.$.worker.main.updateInterval = options.updateInterval;
                        clearInterval(E.$.worker.main.timerId);
                        E.$.worker.main();
                        E.$.worker.main.timerId = setInterval(E.$.worker.main, options.updateInterval*1000);
                    }
                } else {
                    chrome.browserAction.setBadgeText({text: 'setup'});
                }
            }
        }

    };

    if (!isOldAPI)
    {
        chrome.notifications.onClicked.addListener(function(notificationId){
            switch (notificationId)
            {
                case 'about':
                    openUrl('https://chrome.google.com/webstore/detail/outlook-web-access-notifi/hldldpjjjagjfikfknadmnnmpbbhgihg');
                    break;

                case 'settings':
                    E.$.options.open();
                    break;
                default :
                    for(var idx in accounts)
                    {
                        if (accounts.hasOwnProperty(idx) && parseInt(accounts[idx].unread)>0)
                        {
                            E.$.web.open(accounts[idx]);
                            chrome.notifications.clear(notificationId);
                            return;
                        }
                    }
            }
        });
    }

    if(localStorage.getItem('version')!=chrome.app.getDetails().version)
    {
        var version = parseFloat(localStorage.getItem('version'));
        if(!isFinite(version) || version<2)
        {
            Object.keys(config.defaultOptions).forEach(function(key){
                options[key] = localStorage.getItem(key) || config.defaultOptions[key];
            });
            accounts = [];
            if (localStorage.hasOwnProperty('serverEWS'))
            {
                accounts.push({
                    serverEWS: localStorage.getItem('serverEWS'),
                    serverOWA: localStorage.getItem('serverOWA'),
                    username:  localStorage.getItem('username'),
                    password:  localStorage.getItem('password'),
                    unread: 0

                });
            }
            Object.keys(localStorage).forEach(function(name){
                localStorage.removeItem(name);
            });
            E.$.options.save(options);
            E.$.accounts.save(accounts);
        }
        localStorage.setItem('version', chrome.app.getDetails().version);

        E.$.notification.notify({
            title: 'New version',
            message: 'Outlook Web Access updated to ' + chrome.app.getDetails().version,
            icon: chrome.extension.getURL(config.icon.image),
            displayTime: 0,
            notificationId: 'about',
            onclick: function()
            {
                openUrl('https://chrome.google.com/webstore/detail/outlook-web-access-notifi/hldldpjjjagjfikfknadmnnmpbbhgihg');
            }
        });

    }
    E.$.icon.enable(true);
    E.$.options.load();
    E.$.accounts.load();

    window.E = E;
})();