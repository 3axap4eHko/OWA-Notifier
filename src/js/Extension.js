'use strict';
(function ($) {
    var icon = {
            disable: {
                image: 'images/icon_d.png',
                background: [190, 190, 190, 230]
            },
            enable: {
                image: 'images/icon.png',
                background: [208, 0, 24, 255]
            },
            animation: {
                frames: 36,
                speed: 10
            },
            image: 'images/icon128.png',
            width: 19,
            height: 19
        },
        defaultConfig = {
            mailSound: 'sounds/sound4.ogg',
            appointmentSound: 'sounds/sound3.ogg',
            updateInterval: 30,
            displayTime: 15,
            volume: 0.3,
            popupClosing: 'automatically'
        },
        audio = document.createElement('audio'),
        api = new ExchangeAPI({
            xmlFolder: chrome.extension.getURL('xml')
        }),
        remindedAppointments = {};

    function logError(error) {
        console.error(error);
        return error;
    }

    function logErrorDefault(defaultValue) {
        return error => ( logError(error), defaultValue );
    }

    function setIconEnabled(enabled) {
        if (enabled) {
            chrome.browserAction.setIcon({path: icon.enable.image});
            chrome.browserAction.setBadgeBackgroundColor({color: icon.enable.background});
        } else {
            chrome.browserAction.setIcon({path: icon.disable.image});
            chrome.browserAction.setBadgeBackgroundColor({color: icon.disable.background});
        }
    }

    function soundPlay(soundFile) {
        try {
            audio.pause();
            audio.currentTime = 0;
            if (soundFile) {
                audio.setAttribute('src', soundFile);
            }
            audio.play();
        } catch (e) {
        }
    }

    function soundVolume(value) {
        try {
            audio.muted = (value == 0);
            audio.volume = value;
        } catch (e) {
        }
    }

    function openUrl(url, needToClosePopup) {

        if (typeof needToClosePopup == 'undefined') {
            needToClosePopup = false;
        }

        chrome.tabs.query({}, tabs => {

            var sTab = null;
            for (var i = 0, tab; tab = tabs[i]; i++) {
                if (tab.url && ~tab.url.indexOf(url)) {
                    sTab = tab;
                }
            }
    
            if (sTab === null) {
                chrome.tabs.create({url: url});
            } else {
                chrome.tabs.update(sTab.id, {selected: true, url: sTab.url});
            }
    
            if (needToClosePopup) {
                try {
                    closePopup();
                } catch (err) {
                    // ---
                }
            }
        });
    }

    function openOwa(account) {
        return (openUrl(account.serverOWA, true), account);
        /*
         var submit,
         form = $('<form>', {
         action: account.serverOWA + '/auth.owa',
         target: '_owa' + account.username,
         method: 'post',
         id: 'owaAuthForm'
         })
         .append($('<input>', {name: 'forcedownlevel', value: '0'}))
         .append($('<input>', {name: 'flags', value: 4}))
         .append($('<input>', {name: 'trusted', value: 4}))
         .append($('<input>', {name: 'destination', value: account.serverOWA + '/'}))
         .append($('<input>', {name: 'username', value: account.username}))
         .append($('<input>', {name: 'password', value: account.password}))
         .append($('<input>', {name: 'isUtf8', value: 1}))
         .append(submit = $('<input>', {type: 'submit'}));
         try {
         submit.click();
         } catch (e) {
         }
         form.remove();
         */
    }

    function openOwaClosure(account) {
        return () => openOwa(account);
    }

    var _closeButton = Notify.button('Close','images/button_close.png', notification => notification.remove() );

    function notifyEmails(accountsMails) {
        var total = 0;
        var globalWarning = false;
        var badgeText = '';
        var notifyMails = accountsMails.filter( accountMails => {
            var account = accountMails[0],
                mailsCount = _.toInt(accountMails[1]),
                displayTime = _.toInt(accountMails[2]),
                doNotify = mailsCount > _.toInt(account.unread);
            account.hasErrors |= !_.is(accountMails[1], Number);
            globalWarning |= account.hasErrors;
            total += mailsCount;
            account.unread = mailsCount;
            if (doNotify) {
                Notify.createBasic('email_' + account.idx, {
                    title: account.email,
                    message: mailsCount + ' unread mail(s)',
                    iconUrl: chrome.extension.getURL(icon.image),
                    isClickable: true,
                    expired: displayTime,
                    buttons: [Notify.button('Open OWA','images/icon_d.png', openOwaClosure(account)),  _closeButton]
                }, openOwaClosure(account), _.fnEmpty);
            }
            return doNotify;
        });
        if (total) {
            badgeText = total.toString();
            if (notifyMails.length > 0) {
                Extension.getConfig().then( config => {
                    soundVolume(config.volume);
                    soundPlay(config.mailSound);
                });
            }
        }
        if (globalWarning) {
            badgeText += ' !';
        }
        chrome.browserAction.setBadgeText({text: badgeText});

        return notifyMails;
    }

    function notifyAppointments(accountsAppointments) {
        var toRemind = [];
        accountsAppointments.forEach( accountAppointments =>  {

            var account         = accountAppointments[0],
                appointments    = accountAppointments[1],
                displayTime     = _.toInt(accountAppointments[2]);

            account.hasErrors |= !Array.isArray(appointments);

            appointments = account.hasErrors ? [] : appointments.filter( appointment => {
                if (appointment.start >= new Date() &&
                    appointment.start <= _.dateAddMinutes(new Date(), appointment.remind) && !remindedAppointments.hasOwnProperty(appointment.id)
                ) {
                    remindedAppointments[appointment.id] = appointment;
                    toRemind.push(appointment);
                } else if (appointment.start < new Date() && remindedAppointments.hasOwnProperty(appointment.id)) {
                    delete remindedAppointments[appointment.id];
                }
            }).map( appointment =>  Notify.item(appointment.subject, 'At ' + appointment.start) );

            if (appointments.length) {
                Notify.createList('appointment_' + account.idx, {
                    title: 'Appointment(s) for ' + account.email,
                    message: '',
                    iconUrl: chrome.extension.getURL(icon.image),
                    items: appointments,
                    isClickable: true,
                    expired: displayTime,
                    buttons: [_closeButton]
                }, openOwaClosure(account), _.fnEmpty);
            }

            return appointments.length;
        });
        if (toRemind.length > 0) {
            Extension.getConfig().then( config => {
                soundVolume(config.volume);
                soundPlay(config.mailSound);
            });
        }

        return toRemind;
    }

    function storageSave(name, value) {
        return new Promise(resolve => {
            var data = {};
            data[name] = value;
            chrome.storage.local.set(data, () => resolve(value) );
        });
    }

    function storageLoad(name) {
        return new Promise( resolve => chrome.storage.local.get(name,  value => resolve(value[name]) ) );
    }

    class Account extends ExchangeAccount {
        constructor(email, username, password, serverEWS, serverOWA, folder) {
            super(username, password, serverEWS, serverOWA);
            this.email = email;
            this.folder = folder || 'root';
            this.enabled = true;
            this.unread = 0;
            this.hasErrors = false;
        }
    }

    var updateTimer = 0;
    var Extension = {
        logError: error => new Promise( resolve => resolve(logError(error)) ),
        getConfig: () => storageLoad('config').then( loadedConfig => loadedConfig ? loadedConfig : Extension.setConfig(defaultConfig) ),
        setConfig: config => storageSave('config', config || defaultConfig).then( savedConfig => savedConfig ),
        getAccounts: () => storageLoad('accounts').then( loadedAccounts => loadedAccounts || [] ),
        setAccounts: accounts => storageSave('accounts', accounts || []).then( savedAccounts => savedAccounts ),
        openUrl: url => openUrl(url),
        openSettingsGeneral: () => openUrl(chrome.extension.getURL('options.html#settings-general')),
        openSettingsAccounts: () => openUrl(chrome.extension.getURL('options.html#settings-accounts')),
        openOwa: account => new Promise( resolve => resolve(openOwa(account)) ),
        getUnreadEmails: accounts => Promise.all(_.map(accounts, account => account.folder === 'root'
                ? api.getAllItemsFolder(account)
                    .then( folder => api.getFolderUnreadMailsById(folder, account)
                               .then( mails => [account, mails])
                               .catch(logErrorDefault([])) )
                    .catch(logErrorDefault([]))
                : api.getFolderUnreadMails('inbox', account)
                    .then( mails => [account, mails] )
                    .catch(logErrorDefault([]))
        )),
        testAccount: account => api.getFolders(account),
        getFolderInfo: (accounts, displayTime) => Promise.all(_.map(accounts, account => {
                if (!account.enabled) {
                    return [account,0,0];
                }
                if (account.folder === 'root') {
                    return api.getFolders(account).then(function(folders){
                        return [account, folders.filter(function(folder){ return folder.folderClass === 'IPF'}).shift().unreadCount, displayTime];
                    }).catch(logErrorDefault([account, null]));
                } else {
                    return api.getFolder(account.folder, account).then(function (folder) {
                        return [account, folder.unreadCount, displayTime];
                    }).catch(logErrorDefault([account, null]));
                }
        })),
        getAppointments: (accounts, displayTime) => Promise.all(_.map(accounts, account => {
                if (!account.enabled) {
                    return [account,0,0];
                }
                return api.getAppointments(account).then(function (appointments) {
                    return [account, appointments, displayTime];
                }).catch(logErrorDefault([account, null]));
        })),
        update: () => Extension.getAccounts().then(function (accounts) {
                if (accounts.length === 0) {
                    chrome.browserAction.setBadgeText({text: 'setup'});
                    return [];
                }
                /** Reset All previous errors */
                accounts.forEach(function(account){account.hasErrors = false;});

                return Promise.all([
                    Extension.getFolderInfo(accounts, Extension.update.displayTime).then(notifyEmails),
                    Extension.getAppointments(accounts, Extension.update.displayTime).then(notifyAppointments)
                ]).then( result => Extension.setAccounts(accounts).then(() => result) );
        }),
        process: () => Extension.getConfig().then( config => {
                if (Extension.update.displayTime !== config.displayTime) {
                    Extension.update.displayTime = config.displayTime;
                }
                if (Extension.update.interval !== config.updateInterval) {
                    Extension.update.interval = config.updateInterval;
                    clearInterval(updateTimer);
                    Extension.update().then( () => updateTimer = setInterval(Extension.update, config.updateInterval * 1000) );
                }
        })
    };
    //Async loading
    setTimeout(() => {
        audio.setAttribute('preload', 'auto');
        audio.setAttribute('src', defaultConfig.mailSound);
    },0);


    if (localStorage.getItem('version') !== chrome.app.getDetails().version) {
        localStorage.setItem('version', chrome.app.getDetails().version);
        Notify.createBasic(null, {
            title: 'New version',
            message: 'Outlook Web Access updated to ' + chrome.app.getDetails().version,
            iconUrl: chrome.extension.getURL(icon.image),
            buttons: [_closeButton]
        }, () =>  openUrl('https://chrome.google.com/webstore/detail/outlook-web-access-notifi/hldldpjjjagjfikfknadmnnmpbbhgihg'), _.fnEmpty);
    }

    this.Account = Account;
    this.Extension = Extension;
}.call(this.global || this.window || global || window, jQuery));
