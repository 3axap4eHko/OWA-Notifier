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

    function setBadgeText(accounts) {
        var total = accounts.reduce( (total, account) => total + account.unread, 0 );
        var hasErrors = accounts.some( account => account.enabled && account.errors.length );

        var badgeText = '';
        if (total) {
            badgeText = total.toString()
        }
        if (hasErrors) {
            badgeText +='!';
        }
        Browser.Extension.setBadgeText(badgeText);
        return accounts;
    }

    function handleData(mappedAccounts) {
        return mappedAccounts.map( account => {
            var now = new Date();
            account.updated = now.getTime();
            runtimeState.accounts[account.guid] = account;
            if (account.enabled && !account.errors.length) {
                if ( account.unread < (account.unread = account.mails.length)) {
                    _.eventGo(runtimeState, 'notify.mails', account);
                }
                Object.keys(runtimeState.remindedAppointments).forEach( id => {
                    if (runtimeState.remindedAppointments[id].start < now) {
                        delete runtimeState.remindedAppointments[id];
                    }
                });
                account.appointments = account.appointments.reduce( (toRemind, appointment) => {
                    if (appointment.start >= now &&
                        appointment.start <= _.dateAddMinutes(now, appointment.remind) &&
                        !runtimeState.remindedAppointments.hasOwnProperty(appointment.id)) {
                        toRemind.push(appointment);
                        runtimeState.remindedAppointments[appointment.id] = appointment;
                    }
                    return toRemind;
                }, []);
                if (account.appointments.length) {
                    _.eventGo(runtimeState, 'notify.appointment', account);
                }
            } else {
                account.unread = 0;
            }

            return account;
        });
    }

    function getAccountMails(account) {
        return api.getFolderByName(account, account.folderId)
                    .catch( err => (account.error.push(err),[]))
                    .then( folder => api.getFolderUnreadMails(account, folder)
                                        .catch( err => (account.error.push(err),[])));
    }

    function getAccountsMails(accounts) {
        return Promise.all((accounts || []).map(account => {
            if (!account.enabled) {
                return Promise.resolve(null);
            }
            return getAccountMails(account).catch( error => {
                    account.errors.push(error.stack);
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
                account.errors.push(error.stack);
                logError(error.stack);
                return null;
            });
        }))
    }

    function mapData(accounts) {
        /** Reset All previous errors */
        accounts.forEach( account => account.errors = []);
        return Promise.all([getAccountsMails(accounts), getAccountsAppointments(accounts)]).then( data => {
            return accounts.map( (account, id) => Object.assign({}, account, {
                mails: data[0][id],
                unread: _.toInt(account.unread),
                appointments: data[1][id]
            }));
        });
    }

    function update() {
        var accounts = _.values(runtimeState.accounts);
        if (!accounts.length) {
            Browser.Extension.setBadgeText('setup');
            return Promise.resolve(0);
        }
        return mapData(accounts).then(handleData).then(setBadgeText).catch( () => 0);
    }

    function updateLopped() {
        return update().then( (a,b) => {
            setTimeout(updateLopped, runtimeState.config.updateInterval * 1000);
        });
    }

    function markAllAsRead(accountGuid) {
        var account = runtimeState.accounts[accountGuid];
        return api.changeMailsRead(account, account.mails, true).then(update);
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
        updateAccount: account => {
            runtimeState.accounts[account.guid] = Object.assign({}, account, {errors: [], mails: {}, appointments: {}});
            update();
            return Promise.resolve(runtimeState.accounts);
        },
        deleteAccount: account => {
            delete runtimeState.accounts[account.guid];
            update();
            return Promise.resolve(runtimeState.accounts);
        },
        getFolderList: account => api.getFoldersList(account),
        openUrl: Browser.openUrl,
        openSettingsGeneral: () => Browser.openUrl('options.html#general'),
        openSettingsAccounts: account => Browser.openUrl(`options.html#accounts${account ? '&guid='+account.guid : ''}`),
        openOwa: account => Browser.openUrl(account.serverOWA),
        testAccount: account => api.testCredentials(account),
        markAllAsRead: markAllAsRead
    });


    _.eventOn(runtimeState, 'notify.mails', account => {
        var mails = account.mails.slice(0,5).map( mail => Browser.Notify.createListItem(mail.from, mail.subject));
        console.log(`Notify mails for ${account.email}`);
        Browser.Notify.create({
            id: `emails_${account.guid}`,
            title: `${account.email} (${account.unread})`,
            message: `${account.unread} unread mail(s)`,
            iconUrl: Browser.Extension.getUrl(icon.image),
            items: mails,
            type: 'list',
            isClickable: true,
            liveTime: runtimeState.config.liveTime,
            notifyCloseBehavior: runtimeState.config.notifyCloseBehavior,
            onClick: () => Browser.openUrl(account.serverOWA),
            buttons: [
                Browser.Notify.createButton('Mark as Read', 'images/button_read.png', () => markAllAsRead(account.guid)),
                _closeButton
            ]
        });
        soundPlay(audioMail);
    });

    _.eventOn(runtimeState, 'notify.appointment', account => {
        console.log(`Notify appointments for ${account.email}`);
        var appointments = account.appointments.map( appointment => Browser.Notify.createListItem(appointment.subject, 'At ' + appointment.start));
        Browser.Notify.create({
            id: `appointment_${account.guid}`,
            title: `Appointment(s) for ${account.email} (${appointments.length})`,
            message: `Remind about ${appointments.length} appointment(s)`,
            iconUrl: Browser.Extension.getUrl(icon.image),
            items: appointments,
            type: 'list',
            isClickable: true,
            liveTime: runtimeState.config.liveTime,
            notifyCloseBehavior: runtimeState.config.notifyCloseBehavior,
            onClick: () => Browser.openUrl(account.serverOWA),
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

        Browser.state.onFocus(() => {
            Browser.Notify.refreshAll();
        });
        Browser.state.onActive(() => {
            Browser.Notify.refreshAll();
        });

        updateLopped();
        window.api = api;
        window.state = runtimeState;
    });

    Browser.storage.load().then( state => {
        var currentVersion = Browser.Extension.version;
        if (localStorage.getItem('version') !== currentVersion) {
            state.accounts = {};
            state.config = Object.assign({}, defaultConfig);
            Browser.storage.clear();
            localStorage.clear();
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
        } else {
            state.config = Object.assign({}, defaultConfig, state.config || {});
            state.accounts = state.accounts || {};
        }
        runtimeState.config = observableStorage(state.config, 'config');
        runtimeState.accounts = observableStorage(state.accounts, 'accounts');
        _.eventGo(runtimeState, 'extension.loaded');
    });

})();