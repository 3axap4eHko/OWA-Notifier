'use strict';

( (global) => {
    var _p = _.p();
    var xmlCache = {};

    const maxEntriesReturned = 100;
    const changesChunkSize = 1000;

    function getXML(actionXml) {
        actionXml = actionXml.toLowerCase();
        return new Promise((resolve, reject) => {
            if (_.isArray(xmlCache[actionXml])) {
                xmlCache[actionXml].push(resolve);
            } else if (!xmlCache[actionXml]) {
                xmlCache[actionXml] = [resolve];
                Browser.ajax({
                    url: actionXml,
                    onLoad: xhr => {
                        xmlCache[actionXml].forEach( resolve => resolve(xhr.responseText));
                        xmlCache[actionXml] = xhr.responseText;
                    },
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
        static getItem(item) {
            return {
                id: Browser.getXMLAttribute(item, 'ItemId', 'Id'),
                changeKey: Browser.getXMLAttribute(item, 'ItemId', 'ChangeKey')
            };
        }
        static getFolder(folder) {
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
        static getAppointment(appointment) {
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
        static getMail(mail) {
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
        getAction(name, parameters) {
            return getXML(`${this.xmlFolder}/${name}.xml`).then( xml => _.fmtString(xml, parameters));
        }
        doAction (name, account, parameters) {
            parameters = parameters || {};
            return this.getAction(name, parameters).then( xml => exchangeRequest('post', '/Exchange.asmx', xml, account))
        }
        getItemById (account, id) {
            return this.doAction('get-item-by-id', account, {id}).then(ExchangeAPI.getItem);
        }
        changeItems(account, itemChanges) {
            var itemChangesChunks = [];
            while (itemChanges.length > 0) {
                itemChangesChunks.push(itemChanges.splice(0, changesChunkSize));
            }
            return Promise.all(itemChangesChunks.map(changesChunk => this.doAction('change-items', account, {changes: changesChunk.join('\r\n')}) ));
        }
        findFoldersByClass (account, parentFolderName, folderClass) {
            return this.doAction('find-folder-by-class', account, {parentFolderName, folderClass})
                .then( response => Browser.getXMLElementChildren(response, 'Folders').map(ExchangeAPI.getFolder));
        }
        getFolderByName (account, folderName) {
            return this.doAction('get-folder-by-name', account, {folderName}).then(ExchangeAPI.getFolder);
        }
        getFolderById (account, id) {
            return this.doAction('get-folder-by-id', account, {id}).then(ExchangeAPI.getFolder);
        }
        getFolderRoot (account) {
            return this.getFolderByName(account,'msgfolderroot').then( folder => (folder.displayName = 'Root',folder));
        }
        getAppointments (account) {
            var startDate = _.dateToXsd(new Date()),
                endDate = _.dateToXsd(_.dateAddDays(new Date(),10));
            return this.doAction('get-appointments', account, {maxEntriesReturned, startDate, endDate}).then( response => {
                return Browser.getXMLElementChildren(response, 'Items').map(ExchangeAPI.getAppointment);
            });
        }
        getMailFoldersList (account) {
            return this.findFoldersByClass(account, 'msgfolderroot', 'IPF.Note')
        }
        getFolderUnreadMails (account, folder) {
            const mailsCount =  Math.max(folder.unreadCount,1);
            const pageCount = Math.ceil(mailsCount / changesChunkSize);
            const pages = _.range(pageCount, pageCount);
            return Promise.all(pages.map((v, id) => {
                return this.doAction('get-folder-unread-mails', account, {id: folder.id, maxEntriesReturned: mailsCount, offset: changesChunkSize*id})
                    .then( response => Browser.getXMLElementChildren(response, 'Items').map(ExchangeAPI.getMail))
            })).then( mailsSet => [].concat(...mailsSet));
        }
        testCredentials(account) {
            return this.getFolderRoot(account)
                .then( _.fnFalse )
                .catch( error => {
                    if (error instanceof XMLHttpRequest) {
                        return ({code: error.status, message: error.statusText});
                    }
                    return ({code: -1, message: error.stack || error});
                });
        }
        changeMailsRead (account, mails, read) {
            if (mails.length === 0) {
                return Promise.resolve(0);
            }
            return getXML(`${this.xmlFolder}/partials/change-item-read.xml`).then( partialXML => {
                var changes = mails.map( mail => _.fmtString(partialXML, {id: mail.id, changeKey: mail.changeKey, read}));
                return this.changeItems(account, changes);
            });
        }
    }

    global.ExchangeAPI = ExchangeAPI;
})(window, Browser);