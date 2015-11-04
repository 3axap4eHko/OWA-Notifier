'use strict';
( $ => {
    var _p = _.p();
    var xmlCache = {};

    class ExchangeAccount {
        constructor(username, password, serverEWS, serverOWA) {
            this.username = username;
            this.password = password;
            this.serverEWS = serverEWS;
            this.serverOWA = serverOWA;
        }
    }

    function getXML(actionXml) {
        actionXml = actionXml.toLowerCase();
        return new Promise((resolve, reject) => {
            if(!xmlCache[actionXml])
            {
                $.ajax({
                    type    : 'GET',
                    url     :  actionXml,
                    dataType: 'text',
                    success: response => resolve(xmlCache[actionXml] = response),
                    error: error => reject(error)
                });
            } else {
                resolve(xmlCache[actionXml]);
            }
        });
    }

    function exchangeRequest(method, endpoint, data, account) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type    : method,
                url     : account.serverEWS + endpoint,
                dataType: 'xml',
                data: data,
                headers : {'Content-Type': 'text/xml'},
                password: account.password,
                username: account.username,
                success: resolve,
                error: reject
            })
        });
    }

    class ExchangeAPI {
        constructor (options) {
            options = options || {};
            _p(this, {
                xmlFolder: options.xmlFolder
            });
        }
        get xmlFolder() {
            return _p(this).xmlFolder;
        }
        static getItemInfo(item) {
            item = $(item);
            return {
                id: item.find('ItemId').attr('Id'),
                changeKey: item.find('ItemId').attr('ChangeKey')
            };
        }
        static getFolderInfo(folder) {
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
        static getAppointmentInfo(appointment) {
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
        static getMailInfo(mail) {
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
        static createAccount (username, password, serverEWS, serverOWA) {
            return new ExchangeAccount(username, password, serverEWS, serverOWA);
        }
        static getTypes (account) {
            return exchangeRequest('get', '/types.xsd', null, account);
        }
        static getMessages (account) {
            return exchangeRequest('get', '/messages.xsd', null, account);
        }
        static getServices (account) {
            return exchangeRequest('get', '/Services.wsdl', null, account);
        }
        doAction (name, account, parameters) {
            parameters = parameters || {};
            return getXML(`${this.xmlFolder}/${name}.xml`).then( xml => {
                xml = _.fmtString(xml, parameters);
                return exchangeRequest('post', '/Exchange.asmx', xml, account);
            });
        }
        getFolder (folderName, account) {
            return this.doAction('get-folder', account, {Id: folderName}).then(ExchangeAPI.getFolderInfo);
        }
        getFolderById (folder, account) {
            return this.doAction('get-folder-id', account, {Id: folder.id, ChangeKey: folder.changeKey}).then(ExchangeAPI.getFolderInfo);
        }
        getItem (id, changeKey, account) {
        return this.doAction('get-item', account, {Id: id, ChangeKey: changeKey}).then(ExchangeAPI.getItemInfo);
        }
        getAppointments (account) {
            var self = this;
            var startDate = _.toXsdDate(new Date()),
                endDate = _.toXsdDate(_.dateAddDays(new Date(),10));
            return self.doAction('get-appointment', account, {MaxEntriesReturned: 10, StartDate: startDate, EndDate: endDate }).then( response => {
                var appointments = [];
                $(response).find('Items').children().each((id, appointment) => appointments.push(ExchangeAPI.getAppointmentInfo(appointment)) );
                return appointments;
            });
        }
        getFolderUnreadMails (folderName, account) {
            return this.doAction('get-unread-mails', account, {Id: folderName, MaxEntriesReturned: 10}).then( response => {
                var mails = [];
                $(response).find('Message').each( (id, mail) => mails.push(ExchangeAPI.getMailInfo(mail)) );
                return mails;
            });
        }
        getFolderUnreadMailsById (folder, account) {
            return this.doAction('get-unread-mails-id', account, {Id: folder.id, ChangeKey: folder.changeKey, MaxEntriesReturned: 10}).then( response => {
                var mails = [];
                $(response).find('Message').each( (id, mail) => mails.push(ExchangeAPI.getMailInfo(mail)) );
                return mails;
            });
        }
        getAllItemsFolder (account) {
            return this.doAction('all-items', account).then(ExchangeAPI.getFolderInfo);
        }
        getTotalUnreadCount (account) {
            return this.getAllItemsFolder(account).then( folder => folder.unreadCount );
        }
        getFolderUnreadCount (folderName, account) {
            return this.getFolder(folderName, account).then( response => _.toInt($(response).find('UnreadCount').text()) );
        }
        getFolders (account) {
            return this.doAction('find-folder', account, {Id: 'root'}).then( response => {
                var folders = [];
                $(response).find('Folders').children().each( (id, folder) => folders.push(ExchangeAPI.getFolderInfo(folder)));
                return folders;
            });
        }
        markAsRead (account, folder) {
            return this.doAction('mark-as-read', account, {Id: folder}).then( response => ExchangeAPI.getItemInfo($(response).find('Message')) );
        }
    }

    this.ExchangeAPI = ExchangeAPI;
    this.ExchangeAccount = ExchangeAccount;

}).call(this.global || this.window || global || window, jQuery);