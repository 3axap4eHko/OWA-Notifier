'use strict';
(() => {
    const defaultConfig = {
            mailSound: 'sounds/sound4.ogg',
            appointmentSound: 'sounds/sound3.ogg',
            updateInterval: 30,
            liveTime: 30,
            volume: 0.3,
            notifyCloseBehavior: 'automatically'
    };
    const audioMail = document.getElementById('mail-sound');
    const audioAppointment = document.getElementById('appointment-sound');
    const api = new ExchangeAPI({ xmlFolder: Browser.Extension.getUrl('xml') });
    const icon = {
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
    };
    const _closeButton = Browser.Notify.createButton('Close','images/button_close.png', _.fnEmpty );
    var runtimeState = {
        accounts: {},
        accountsStates: {},
        config: {},
        remindedAppointments: {},
        updateTimerId: 0
    };

    function observableStorage(observable, storeName) {
        Object.observe(observable, changes => {
            Browser.storage.save(storeName, observable);
            changes.forEach( change => {
                _.eventGo(runtimeState, `${storeName}.${change.name}`, change.object[change.name]);
            });
            _.eventGo(runtimeState, `${storeName}`, observable);
        });
        return observable;
    }

    function getAccountStated(account) {
        return Object.assign({}, account, runtimeState.accountsStates[account.guid]);
    }

    function soundPlay(audio) {
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.play();
        } catch (e) {
        }
    }

    function logError(value) {
        return Promise.resolve(Browser.log.write(value));
    }

    function setBadgeText(mappedData) {
        var total = mappedData.reduce( (total, data) => total + data.state.unread, 0 );
        var hasErrors = mappedData.some( data => data.account.enabled && data.state.hasErrors );

        var badgeText = '';
        if (total) {
            badgeText = total.toString()
        }
        if (hasErrors) {
            badgeText +='!';
        }
        Browser.Extension.setBadgeText(badgeText);
        return mappedData;
    }

    function handleData(mappedData) {
        return mappedData.map( data => {
            if (data.account.enabled && !data.state.hasErrors) {
                var oldUnread = _.toInt(data.state.unread);

                if ( (data.state.unread = data.folder.unreadCount) > oldUnread) {
                    _.eventGo(runtimeState, 'notify.mails', data);
                }
                var now = new Date();
                Object.keys(runtimeState.remindedAppointments).forEach( id => {
                    if (runtimeState.remindedAppointments[id].start < now) {
                        delete runtimeState.remindedAppointments[id];
                    }
                });
                var toRemind = data.appointments.reduce( (toRemind, appointment) => {
                    if (appointment.start >= now &&
                        appointment.start <= _.dateAddMinutes(now, appointment.remind) &&
                        !runtimeState.remindedAppointments.hasOwnProperty(appointment.id)) {
                        toRemind.push(appointment);
                        runtimeState.remindedAppointments[appointment.id] = appointment;
                    }
                    return toRemind;
                }, []);
                if (toRemind.length) {
                    _.eventGo(runtimeState, 'notify.appointment', data, toRemind);
                }
            } else {
                data.state.unread = 0;
            }

            return data;
        });
    }

    function getAccountFolder(account) {
        return account.folder === 'root' ? api.getAllItemsFolder(account) : api.getFolder(account.folder, account);
    }

    function getAccountUnreadMails(account) {
        return getAccountFolder(account).then( folder => {
            return api.getFolderUnreadMailsById(folder, account).then( mails => ({folder, mails}));
        });
    }

    function getAccountsMails(accounts) {
        return Promise.all((accounts || []).map(account => {
            if (!account.enabled) {
                return Promise.resolve(null);
            }
            return getAccountUnreadMails(account).catch( error => {
                    runtimeState.accountsStates[account.guid].hasErrors = true;
                    runtimeState.accountsStates[account.guid].errors.push(error.stack);
                    logError(error.stack);
                    return null;
                });
        }))
    }
    function getAccountsAppointments(accounts) {
        return Promise.all((accounts || []).map( account => {
            if (!account.enabled) {
                return Promise.resolve(null);
            }
            return api.getAppointments(account).catch( error => {
                runtimeState.accountsStates[account.guid].hasErrors = true;
                runtimeState.accountsStates[account.guid].errors.push(error.stack);
                logError(error.stack);
                return null;
            });
        }))
    }

    function mapData(accounts) {
        /** Reset All previous errors */
        accounts.forEach( account => {
            runtimeState.accountsStates[account.guid] = runtimeState.accountsStates[account.guid] || {};
            runtimeState.accountsStates[account.guid].hasErrors = false;
            runtimeState.accountsStates[account.guid].errors = [];
        });
        return Promise.all([getAccountsMails(accounts), getAccountsAppointments(accounts)]).then( data => {
            return accounts.map( (account, id) => ({
                id: id,
                account: account,
                state: runtimeState.accountsStates[account.guid],
                mails: (data[0][id] || {}).mails,
                folder: (data[0][id] || {}).folder,
                appointments: data[1][id]
            }));
        });
    }

    function update() {
        var accounts = _.values(runtimeState.accounts);
        if (!accounts.length) {
            Browser.Extension.setBadgeText('setup');
            return Promise.resolve({});
        }
        return mapData(accounts).then(handleData).then(setBadgeText).catch( () => 0);
    }

    function updateLopped() {
        return update().then( () => {
            setTimeout(updateLopped, runtimeState.config.updateInterval * 1000);
        })
    }

    function markAllAsRead(account) {
        return getAccountUnreadMails(account).then( mails => {
            return api.markAllAsRead(mails, account).then(update);
        })
    }

    Browser.Notify.registerHandlers();

    Browser.Message.proxy({
        log: logError,
        getLogs: Browser.log.read,
        getSounds: () => Promise.resolve(_.range(5,'sounds/sound').map( (s, id) => `${s}${id+1}.ogg` )),
        getConfig: () => Promise.resolve(runtimeState.config),
        updateConfig: (value, name) => {
            runtimeState.config[name] = value;
            return Promise.resolve(runtimeState.config);
        },
        getAccounts: () => Promise.resolve(runtimeState.accounts),
        getAccountsStated: () => Promise.resolve(_.map(runtimeState.accounts, account => getAccountStated(account))),
        updateAccount: account => {
            runtimeState.accounts[account.guid] = account;
            update();
            return Promise.resolve(runtimeState.accounts);
        },
        deleteAccount: account => {
            delete runtimeState.accounts[account.guid];
            update();
            return Promise.resolve(runtimeState.accounts);
        },
        openUrl: Browser.openUrl,
        openSettingsGeneral: () => Browser.openUrl('options.html#general'),
        openSettingsAccounts: account => Browser.openUrl(`options.html#accounts${account ? '&guid='+account.guid : ''}`),
        openOwa: account => Browser.openUrl(account.serverOWA),
        testAccount: account => api.testCredentials(account),
        update: update,
        markAllAsRead: markAllAsRead
    });


    _.eventOn(runtimeState, 'notify.mails', event => {
        var mails = event.mails.slice(0,5).map( mail => Browser.Notify.createListItem(mail.subject, 'From: ' + mail.from));
        console.log(`Notify mails for ${event.account.email}`);
        Browser.Notify.create({
            id: `emails_${event.account.guid}`,
            title: `${event.account.email} (${event.state.unread})`,
            message: `${event.state.unread} unread mail(s)`,
            iconUrl: Browser.Extension.getUrl(icon.image),
            items: mails,
            type: 'list',
            isClickable: true,
            liveTime: runtimeState.config.liveTime,
            notifyCloseBehavior: runtimeState.config.notifyCloseBehavior,
            onClick: () => Browser.openUrl(event.account.serverOWA),
            buttons: [
                Browser.Notify.createButton('Mark as Read', 'images/button_read.png', () => api.markAllAsRead(event.mails, event.account).then(update)),
                _closeButton
            ]
        });
        soundPlay(audioMail);
    });

    _.eventOn(runtimeState, 'notify.appointment', (event, toRemind) => {
        console.log(`Notify appointments for ${event.account.email}`);
        var appointments = toRemind.map( appointment => Browser.Notify.createListItem(appointment.subject, 'At ' + appointment.start));
        Browser.Notify.create({
            id: `appointment_${event.account.guid}`,
            title: `Appointment(s) for ${event.account.email} (${toRemind.length})`,
            message: `Remind about ${toRemind.length} appointment(s)`,
            iconUrl: Browser.Extension.getUrl(icon.image),
            items: appointments,
            type: 'list',
            isClickable: true,
            liveTime: runtimeState.config.liveTime,
            notifyCloseBehavior: runtimeState.config.notifyCloseBehavior,
            onClick: () => Browser.openUrl(event.account.serverOWA),
            buttons: [_closeButton]
        });
        soundPlay(audioAppointment);
    });
    _.eventOn(runtimeState, 'extension.loaded', () => {
        console.log('Extension loaded');
        audioMail.setAttribute('src', runtimeState.config.mailSound);
        audioAppointment.setAttribute('src', runtimeState.config.appointmentSound);

        _.eventOn(runtimeState, 'config.mailSound', mailSound => {
            audioMail.setAttribute('src', mailSound);
            soundPlay(audioMail);
        });
        _.eventOn(runtimeState, 'config.appointmentSound', appointmentSound => {
            audioAppointment.setAttribute('src', appointmentSound);
            soundPlay(audioAppointment);
        });

        _.eventOn(runtimeState, 'config.volume', volume => {
            audioMail.muted = (volume == 0);
            audioMail.volume = volume;
            audioAppointment.muted = (volume == 0);
            audioAppointment.volume = volume;
        });

        Browser.state.onFocus(()=>{
            Browser.Notify.refreshAll();
        });
        Browser.state.onActive(()=>{
            Browser.Notify.refreshAll();
        });

        updateLopped();
    });

    Browser.storage.load().then( state => {
        state.config = Object.assign({}, defaultConfig, state.config || {});
        state.accounts = state.accounts || {};
        var currentVersion = Browser.Extension.version;
        if (localStorage.getItem('version') === currentVersion) {
            var accounts = {};
            _.values(state.accounts).filter( account => _.isNotEmptyString(account.username) ).forEach( (account, id) => {
                var guid = _.randomGuid();
                accounts[guid] = {
                    guid: guid,
                    created: account.created || Date.now() + id,
                    email: account.email,
                    enabled: account.enabled,
                    folder: account.folder,
                    password: account.password,
                    username: account.username,
                    serverEWS: account.serverEWS,
                    serverOWA: account.serverOWA
                };
            });
            Browser.storage.save('accounts', state.accounts = accounts);
            localStorage.setItem('version', currentVersion);

            Browser.Notify.create({
                title: `New version ${currentVersion}`,
                message: `Outlook Web Access Notifier was updated to ${currentVersion}`,
                iconUrl: Browser.Extension.getUrl(icon.image),
                buttons: [
                    _closeButton
                ],
                onClick: () =>  Browser.openUrl(Browser.Extension.storeUrl)
            });
        }
        runtimeState.config = observableStorage(state.config, 'config');
        runtimeState.accounts = observableStorage(state.accounts, 'accounts');
        _.eventGo(runtimeState, 'extension.loaded');
    });
})();