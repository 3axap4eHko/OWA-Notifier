'use strict';

( (global) => {
    var _p = _.p();
    var xmlCache = {};

    const MaxEntriesReturned = 100;

    function getXML(actionXml) {
        actionXml = actionXml.toLowerCase();
        return new Promise((resolve, reject) => {
            if(!xmlCache[actionXml])
            {
                Browser.ajax({
                    url: actionXml,
                    onLoad: xhr => resolve(xmlCache[actionXml] = xhr.responseText),
                    onError: reject,
                    onAbort: reject
                });
            } else {
                resolve(xmlCache[actionXml]);
            }
        });
    }

    function exchangeRequest(method, endpoint, data, account) {
        return new Promise((resolve, reject) => {
            var authUrl = account.serverEWS + endpoint;
            if (account.username) {
                authUrl = authUrl.replace('://','://'+ encodeURIComponent(account.username) + '@');
                if (account.password) {
                    authUrl = authUrl.replace('@', ':' + encodeURIComponent(account.password) + '@');
                }
            }
            document.execCommand('ClearAuthenticationCache', 'false');
            Browser.ajax({
                url: authUrl,
                method: method,
                data: data,
                withCredentials: false,
                headers : {
                    'Content-Type': 'text/xml',
                    'Cache-Control': 'no-cache',
                    //'Authorization': 'Basic ' + btoa(account.username + ':' + account.password)
                },
                onLoad: xhr => {
                    resolve(xhr.responseXML);
                },
                onError: reject,
                onAbort: reject
            });
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
        static createAccount(username, password, serverEWS, serverOWA) {
            return {username, password, serverEWS, serverOWA};
        }

        static getItemInfo(item) {
            return {
                id: Browser.getXMLAttribute(item, 'ItemId', 'Id'),
                changeKey: Browser.getXMLAttribute(item, 'ItemId', 'ChangeKey')
            };
        }
        static getFolderInfo(folder) {
            return {
                id: Browser.getXMLAttribute(folder, 'FolderId', 'Id'),
                changeKey: Browser.getXMLAttribute(folder, 'FolderId', 'ChangeKey'),
                parentId: Browser.getXMLAttribute(folder, 'ParentFolderId', 'Id'),
                parentChangeKey: Browser.getXMLAttribute(folder, 'ParentFolderId', 'ChangeKey'),
                folderClass: Browser.getXMLElementText(folder, 'FolderClass'),
                displayName: Browser.getXMLElementText(folder, 'DisplayName'),
                totalCount: _.toInt(Browser.getXMLElementText(folder, 'TotalCount')),
                childFolderCount: _.toInt(Browser.getXMLElementText(folder, 'ChildFolderCount')),
                unreadCount: _.toInt(Browser.getXMLElementText(folder, 'UnreadCount'))
            };
        }
        static getAppointmentInfo(appointment) {
            return {
                id: Browser.getXMLAttribute(appointment, 'ItemId', 'Id'),
                changeKey: Browser.getXMLAttribute(appointment, 'ItemId', 'ChangeKey'),
                subject: Browser.getXMLElementText(appointment, 'Subject'),
                start: new Date(Browser.getXMLElementText(appointment, 'Start')),
                end: new Date(Browser.getXMLElementText(appointment, 'End')),
                remind: _.toInt(Browser.getXMLElementText(appointment, 'ReminderMinutesBeforeStart')),
                location: Browser.getXMLElementText(appointment, 'Location')
            };
        }
        static getMailInfo(mail) {
            var sender = Browser.getXMLElement(mail, 'Sender');
            return {
                id: Browser.getXMLAttribute(mail, 'ItemId', 'Id'),
                changeKey: Browser.getXMLAttribute(mail, 'ItemId', 'ChangeKey'),
                sender: Browser.getXMLElementText(sender, 'Name'),
                from: Browser.getXMLElementText(sender, 'Name'),
                subject: Browser.getXMLElementText(mail, 'Subject'),
                importance: Browser.getXMLElementText(mail, 'Importance'),
                body: Browser.getXMLElementText(mail, 'Body')
            };
        }
        static getTypes (account) {
            return exchangeRequest('get', '/types.xsd', null, account);
        }
        static getMessages (account) {
            return exchangeRequest('get', '/messages.xsd', null, account);
        }
        static getServices(account) {
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
            var startDate = _.dateToXsd(new Date()),
                endDate = _.dateToXsd(_.dateAddDays(new Date(),10));
            return this.doAction('get-appointment', account, {MaxEntriesReturned: 10, StartDate: startDate, EndDate: endDate }).then( response => {
                return Browser.getXMLElementChildren(response, 'Items').map(ExchangeAPI.getAppointmentInfo);
            });
        }
        getFolderUnreadMails (folderName, account) {
            return this.doAction('get-unread-mails', account, {Id: folderName, MaxEntriesReturned: 10}).then( response => {
                return Browser.getXMLElementChildren(response, 'Items').map(ExchangeAPI.getMailInfo);
            });
        }
        getFolderUnreadMailsById (folder, account) {
            return this.doAction('get-unread-mails-id', account, {Id: folder.id, ChangeKey: folder.changeKey, MaxEntriesReturned: folder.unreadCount || 1}).then( response => {
                return Browser.getXMLElementChildren(response, 'Items').map(ExchangeAPI.getMailInfo);
            });
        }
        getAllItemsFolder (account) {
            return this.doAction('all-items', account).then(ExchangeAPI.getFolderInfo);
        }
        getTotalUnreadCount (account) {
            return this.getAllItemsFolder(account).then( folder => folder.unreadCount );
        }
        getFolderUnreadCount (folderName, account) {
            return this.getFolder(folderName, account).then( response => _.toInt(Browser.getXMLElementText(response, 'UnreadCount')) );
        }
        getFolders (account) {
            return this.doAction('find-folder', account, {Id: 'root'})
                .then( response => Browser.getXMLElementChildren(response, 'Folders').map(ExchangeAPI.getFolderInfo));
        }
        testCredentials(account) {
            return this.getAllItemsFolder(account)
                .then( _.fnFalse )
                .catch( error => {
                    if (error instanceof XMLHttpRequest) {
                        return ({code: error.status, message: error.statusText});
                    }
                    return ({code: -1, message: error.stack || error});
                });
        }
        markAllAsRead (folderInfo, account) {
            return this.getFolderUnreadMailsById(folderInfo, account).then( mails => {
                if (mails.length === 0) {
                    return Promise.resolve(0);
                }
                return getXML(`${this.xmlFolder}/read-item-template.xml`).then( readItemXML => {
                    var changes = mails.map( mail => _.fmtString(readItemXML, {Id: mail.id, ChangeKey: mail.changeKey}));
                    return this.doAction('change-items', account, {Changes: changes.join('\r\n')});
                });
            });
        }
    }

    global.ExchangeAPI = ExchangeAPI;
})(window, Browser);