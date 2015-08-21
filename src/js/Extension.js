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
            volume: 0.3
        },
        audio = document.createElement('audio'),
        api = new ExchangeAPI({
            xmlFolder: chrome.extension.getURL('xml')
        }),
        remindedAppointments = {},
        isLegacyAPI = !chrome.notifications;

    audio.setAttribute('preload', 'auto');
    audio.setAttribute('src', defaultConfig.mailSound);

    function logError(error) {
        console.error(error);
        return error;
    }

    function logErrorDefault(defaultValue) {
        return function (error) {
            logError(error);
            return defaultValue;
        }
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

    function openUrl(url) {
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

    function openOwa(account) {
        return openUrl(account.serverOWA);
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
        return function () {
            openOwa(account);
        };
    }

    function notifyEmails(accountsMails) {
        var total = 0;
        var globalWarning = false;
        var badgeText = '';
        var notifyMails = accountsMails.filter(function (accountMails) {
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
                    expired: displayTime
                }, openOwaClosure(account), _.fnEmpty);
            }
            return doNotify;
        });
        if (total) {
            badgeText = total.toString();
            if (notifyMails.length > 0) {
                Extension.getConfig().then(function (config) {
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
        accountsAppointments.forEach(function (accountAppointments) {
            var account = accountAppointments[0],
                appointments = accountAppointments[1],
                displayTime = _.toInt(accountAppointments[2]);
            account.hasErrors |= !Array.isArray(appointments);
            appointments = account.hasErrors ? [] : appointments.filter(function (appointment) {
                if (appointment.start >= new Date() &&
                    appointment.start <= _.dateAddMinutes(new Date(), appointment.remind) && !remindedAppointments.hasOwnProperty(appointment.id)
                ) {
                    remindedAppointments[appointment.id] = appointment;
                    toRemind.push(appointment);
                } else if (appointment.start < new Date() && remindedAppointments.hasOwnProperty(appointment.id)) {
                    delete remindedAppointments[appointment.id];
                }
            }).map(function (appointment) {
                return Notify.item(appointment.subject, 'At ' + appointment.start);
            });
            if (appointments.length) {
                Notify.createList('appointment_' + account.idx, {
                    title: 'Appointment(s) for ' + account.email,
                    message: '',
                    iconUrl: chrome.extension.getURL(icon.image),
                    items: appointments,
                    isClickable: true,
                    expired: displayTime
                }, openOwaClosure(account), _.fnEmpty);
            }

            return appointments.length;
        });
        if (toRemind.length > 0) {
            Extension.getConfig().then(function (config) {
                soundVolume(config.volume);
                soundPlay(config.mailSound);
            });
        }

        return toRemind;
    }

    function storageSave(name, value) {
        return new Promise(function (resolve) {
            var data = {};
            data[name] = value;
            chrome.storage.local.set(data, function () {
                resolve(value)
            });
        });
    }

    function storageLoad(name) {
        return new Promise(function (resolve) {
            chrome.storage.local.get(name, function (value) {
                resolve(value[name]);
            });
        });
    }


    function Account(email, username, password, serverEWS, serverOWA, folder) {
        ExchangeAccount.call(this, username, password, serverEWS, serverOWA);
        this.enabled = true;
        this.email = email;
        this.folder = folder || 'root';
        this.unread = 0;
        this.hasErrors = false;
    }

    Account.prototype = new ExchangeAccount();
    Account.prototype.constructor = Account;

    var updateTimer = 0;
    var Extension = {
        logError: function (error) {
            return new Promise(function (resolve) {
                logError(error);
                resolve(error);
            });
        },
        getConfig: function () {
            return storageLoad('config').then(function (loadedConfig) {
                return (loadedConfig || defaultConfig);
            });
        },
        setConfig: function (config) {
            return storageSave('config', config || defaultConfig).then(function (savedConfig) {
                return savedConfig;
            });
        },
        getAccounts: function () {
            return storageLoad('accounts').then(function (loadedAccounts) {
                return (loadedAccounts || []);
            });
        },
        setAccounts: function (accounts) {
            return storageSave('accounts', accounts || []).then(function (savedAccounts) {
                return savedAccounts;
            });
        },
        openUrl: function (url) {
            openUrl(url);
        },
        openSettingsGeneral: function () {
            var optionsUrl = chrome.extension.getURL('options.html#settings-general');
            openUrl(optionsUrl);
        },
        openSettingsAccounts: function () {
            var optionsUrl = chrome.extension.getURL('options.html#settings-accounts');
            openUrl(optionsUrl);
        },
        openOwa: function (account) {
            return new Promise(function (resolve) {
                openOwa(account);
                resolve(account);
            });
        },
        getUnreadEmails: function (accounts) {
            return Promise.all(Object.keys(accounts).map(function (idx) {
                var account = accounts[idx];
                if (account.folder === 'root') {
                    return api.getAllItemsFolder(account).then(function (folder) {
                        return api.getFolderUnreadMailsById(folder, account).then(function (mails) {
                            return [account, mails];
                        }).catch(logErrorDefault([]));
                    }).catch(logErrorDefault([]));
                } else {
                    return api.getFolderUnreadMails('inbox', account).then(function (mails) {
                        return [account, mails];
                    }).catch(logErrorDefault([]));
                }
            }));
        },
        testAccount: function(account){
            return api.getFolders(account);
        },
        getFolderInfo: function (accounts, displayTime) {
            return Promise.all(Object.keys(accounts).map(function (idx) {
                var account = accounts[idx];
                if (account.folder === 'root') {
                    return api.getFolders(account).then(function(folders){
                        return [account, folders.filter(function(folder){ return folder.folderClass === 'IPF'}).shift().unreadCount, displayTime];
                    }).catch(logErrorDefault([account, null]));
                } else {
                    return api.getFolder(account.folder, account).then(function (folder) {
                        return [account, folder.unreadCount, displayTime];
                    }).catch(logErrorDefault([account, null]));
                }
            }));
        },
        getAppointments: function (accounts, displayTime) {
            return Promise.all(Object.keys(accounts).map(function (idx) {
                var account = accounts[idx];
                return api.getAppointments(account).then(function (appointments) {
                    return [account, appointments, displayTime];
                }).catch(logErrorDefault([account, null]));
            }));
        },
        update: function () {
            return Extension.getAccounts().then(function (accounts) {
                if (accounts.length === 0) {
                    chrome.browserAction.setBadgeText({text: 'setup'});
                    return [];
                }
                /** Reset All previous errors */
                accounts.forEach(function(account){account.hasErrors = false;});

                return Promise.all([
                    Extension.getFolderInfo(accounts, Extension.update.displayTime).then(notifyEmails),
                    Extension.getAppointments(accounts, Extension.update.displayTime).then(notifyAppointments)
                ]).then(function (result) {
                    return Extension.setAccounts(accounts).then(function () {
                        return result;
                    });
                })
            });
        },
        process: function () {
            return Extension.getConfig().then(function (config) {
                if (Extension.update.displayTime !== config.displayTime) {
                    Extension.update.displayTime = config.displayTime;
                }
                if (Extension.update.interval !== config.updateInterval) {
                    Extension.update.interval = config.updateInterval;
                    clearInterval(updateTimer);
                    Extension.update().then(function () {
                        updateTimer = setInterval(Extension.update, config.updateInterval * 1000);
                    });
                }
            })
        }
    };

    if (localStorage.getItem('version') !== chrome.app.getDetails().version) {
        localStorage.setItem('version', chrome.app.getDetails().version);
        Notify.createBasic(null, {
            title: 'New version',
            message: 'Outlook Web Access updated to ' + chrome.app.getDetails().version,
            iconUrl: chrome.extension.getURL(icon.image)
        }, function () {
            openUrl('https://chrome.google.com/webstore/detail/outlook-web-access-notifi/hldldpjjjagjfikfknadmnnmpbbhgihg');
        }, _.fnEmpty);

        /** Migration */
        var oldData = localStorage.getItem('accounts');
        if (oldData) {
            oldData = JSON.parse(oldData);
            var accountReplacer = /[^a-zA-Z0-9\._-]+/;
            Extension.setAccounts(oldData.map(function (account, idx) {
                account.idx = idx;
                account.email = account.username.replace(accountReplacer, '') + '@' + _.url(account.serverEWS).host;
                account.enabled = 1;
                account.unread = 0;
                return account;
            })).then(function () {
                localStorage.removeItem('accounts');
            });
        }

        oldData = localStorage.getItem('options');
        if (oldData) {
            oldData = JSON.parse(oldData);
            Extension.setConfig(oldData).then(function () {
                localStorage.removeItem('options');
            });
        }
    }

    this.Account = Account;
    this.Extension = Extension;

}.call(this.global || this.window || global || window, jQuery));