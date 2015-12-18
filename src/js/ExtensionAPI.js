'use strict';
(function (window) {

    window.ExtensionAPI = {
        log (message) {
            return Browser.Message.send('log', message);
        },
        getLogs() {
            return Browser.Message.send('getLogs');
        },
        getSounds () {
            return Browser.Message.send('getSounds');
        },
        getConfig() {
            return Browser.Message.send('getConfig');
        },
        updateConfig(value, name) {
            return Browser.Message.send('updateConfig', value, name);
        },
        getAccounts () {
            return Browser.Message.send('getAccounts');
        },
        getAccountsStated() {
            return Browser.Message.send('getAccountsStated');
        },
        updateAccount(account) {
            return Browser.Message.send('updateAccount', account);
        },
        deleteAccount(account) {
            return Browser.Message.send('deleteAccount', account);
        },
        openUrl (url) {
            return Browser.Message.send('openUrl', url);
        },
        openSettingsGeneral() {
            return Browser.Message.send('openSettingsGeneral');
        },
        openSettingsAccounts(account) {
            return Browser.Message.send('openSettingsAccounts', account);
        },
        openOwa(account) {
            return Browser.Message.send('openOwa', account);
        },
        testAccount(account) {
            return Browser.Message.send('testAccount', account);
        },
        update() {
            return Browser.Message.send('update');
        },
        markAllAsRead(account) {
            return Browser.Message.send('markAllAsRead', account);
        },
        services() {
            return Object.keys(window.ExchangeAPI);
        },
        getAccountList(accounts) {
            return _.values(accounts).sort( (a, b) => a.created - b.created);
        }
    };

})(window);
