'use strict';
(function($){
    var xmlCache = {};

    function ExchangeAccount(username, password, serverEWS, serverOWA) {
        this.username = username;
        this.password = password;
        this.serverEWS = serverEWS;
        this.serverOWA = serverOWA;
    }
    ExchangeAccount.prototype = {
        constructor: ExchangeAccount
    };

    function getXML(actionXml) {
        actionXml = actionXml.toLowerCase();
        return new Promise(function(resolve, reject){
            if(!xmlCache[actionXml])
            {
                $.ajax({
                    type    : "GET",
                    url     :  actionXml,
                    dataType: "text",
                    success: function(response){
                        resolve(xmlCache[actionXml] = response);
                    },
                    error: function() {
                        reject(arguments)
                    }
                });
            } else {
                resolve(xmlCache[actionXml]);
            }
        });
    }

    function exchangeRequest(method, endpoint, data, account) {
        return new Promise(function(resolve, reject){
            $.ajax({
                type    : method,
                url     : account.serverEWS + endpoint,
                dataType: "xml",
                data: data,
                headers : {"Content-Type": "text/xml"},
                password: account.password,
                username: account.username,
                success: resolve,
                error: reject
            })
        });
    }

    function getItemInfo(item) {
        item = $(item);
        return {
            id: item.find('ItemId').attr('Id'),
            changeKey: item.find('ItemId').attr('ChangeKey')
        };
    }

    function getFolderInfo(folder) {
        folder = $(folder);
        return {
            id: folder.find('FolderId').attr('Id'),
            changeKey: folder.find('FolderId').attr('ChangeKey'),
            parentId: folder.find('ParentFolderId').attr('Id'),
            parentChangeKey: folder.find('ParentFolderId').attr('ChangeKey'),
            folderClass: folder.find('FolderClass').text(),
            displayName: folder.find('DisplayName').text(),
            totalCount: _.toInt(folder.find('TotalCount').text()),
            childFolderCount: _.toInt(folder.find('ChildFolderCount').text()),
            unreadCount: _.toInt(folder.find('UnreadCount').text())
        };
    }
    function getAppointmentInfo(appointment) {
        appointment = $(appointment);
        return {
            id: appointment.find('ItemId').attr('Id'),
            changeKey: appointment.find('ItemId').attr('ChangeKey'),
            subject: appointment.find('Subject').text(),
            start: new Date(appointment.find('Start').text()),
            end: new Date(appointment.find('End').text()),
            remind: _.toInt(appointment.find('ReminderMinutesBeforeStart').text()),
            location: appointment.find('Location').text(),
            body: appointment.find('Body').text()
        };
    }

    function getMailInfo(mail) {
        mail = $(mail);
        return {
            id: mail.find('ItemId').attr('Id'),
            changeKey: mail.find('ItemId').attr('ChangeKey'),
            sender: mail.find('Sender').find('Name').text(),
            from: mail.find('Sender').find('Name').text(),
            subject: mail.find('Subject').text(),
            importance: mail.find('Importance').text(),
            body: mail.find('Body').text()
        };
    }


    function ExchangeAPI(options) {
        options = options || {};
        this.xmlFolder = options.xmlFolder;
    }
    ExchangeAPI.prototype = {
        constructor: ExchangeAPI,
        createAccount: function (username, password, serverEWS, serverOWA) {
            return new ExchangeAccount(username, password, serverEWS, serverOWA);
        },
        getTypes: function(account) {
            return exchangeRequest('get', '/types.xsd', null, account);
        },
        getMessages: function(account) {
            return exchangeRequest('get', '/messages.xsd', null, account);
        },
        getServices: function (account) {
            return exchangeRequest('get', '/Services.wsdl', null, account);
        },
        doAction: function (name, account, parameters) {
            parameters = parameters || {};
            return getXML(this.xmlFolder + '/' + name + '.xml').then(function(xml){
                xml = _.fmtString(xml, parameters);
                return exchangeRequest('post', '/Exchange.asmx', xml, account);
            });
        },
        getFolder: function(folderName, account) {
            return this.doAction('get-folder', account, {Id: folderName}).then(getFolderInfo);
        },
        getFolderById: function(folder, account) {
            return this.doAction('get-folder-id', account, {Id: folder.id, ChangeKey: folder.changeKey}).then(getFolderInfo);
        },
        getItem: function(id, changeKey, account) {
            return this.doAction('get-item', account, {Id: id, ChangeKey: changeKey}).then(getItemInfo);
        },
        getAppointments: function(account) {
            var self = this;
            var startDate = _.toXsdDate(new Date()),
                endDate = _.toXsdDate(_.dateAddDays(new Date(),10));
            return self.doAction('get-appointment', account, {MaxEntriesReturned: 10, StartDate: startDate, EndDate: endDate }).then(function(response){
                var appointments = [];
                $(response).find('Items').children().each(function(id, appointment){
                    appointments.push(getAppointmentInfo(appointment));
                });
                return appointments;
            });
        },
        getFolderUnreadMails: function(folderName, account) {
            return this.doAction('get-unread-mails', account, {Id: folderName, MaxEntriesReturned: 10}).then(function(response){
                var mails = [];
                $(response).find('Message').each(function(id, mail){
                    mails.push(getMailInfo(mail));
                });
                return mails;
            });
        },
        getFolderUnreadMailsById: function(folder, account) {
            return this.doAction('get-unread-mails-id', account, {Id: folder.id, ChangeKey: folder.changeKey, MaxEntriesReturned: 10}).then(function(response){
                var mails = [];
                $(response).find('Message').each(function(id, mail){
                    mails.push(getMailInfo(mail));
                });
                return mails;
            });
        },
        getAllItemsFolder: function(account) {
            return this.doAction('all-items', account).then(getFolderInfo);
        },
        getTotalUnreadCount: function(account) {
            return this.getAllItemsFolder(account).then(function(folder){
                return folder.unreadCount;
            });
        },
        getFolderUnreadCount: function(folderName, account) {
            return this.getFolder(folderName, account).then(function(response){
                return _.toInt($(response).find('UnreadCount').text());
            });
        },
        getFolders: function(account) {
            return this.doAction('find-folder', account, {Id: 'root'}).then(function(response){
                var folders = [];
                $(response).find('Folders').children().each(function(id, folder){
                    folders.push(getFolderInfo(folder));
                });
                return folders;
            });
        },
        markAsRead: function(item) {
            return this.doAction('read-item', account, {Id: item.id, ChangeKey: item.changeKey}).then(function(response){
                return getItemInfo($(response).find('Message'));
            });
        }
    };

    this.ExchangeAPI = ExchangeAPI;
    this.ExchangeAccount = ExchangeAccount;

}.call(this.global || this.window || global || window, jQuery));