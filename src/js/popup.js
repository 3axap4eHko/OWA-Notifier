(function(){
    function buildAccountBar(account) {
        debugger;
        return $('<li>', {'class': 'mdl-shadow--2dp mdl-card__actions'}).append(
            $('<a>', {
                href: '#',
                'data-trigger': 'account.owa',
                'data-idx': account.idx,
                html: account.email + _.fmtString('<span class="counter">{count} <i class="material-icons">mail</i></span>', {count: _.toInt(account.unread)})
            })
        )
    }

    function updateMails() {
        var mailContainer = $('#mails');
        mailContainer.empty();

        Extension.getAccounts().then(function(accounts){
            _.each(accounts, function(account){
                mailContainer.append(buildAccountBar(account));
            });
        });
    }

    $(document).on('account.owa', function(event, data){
        var idx = _.toInt(data.idx);
        Extension.getAccounts().then(function(accounts){
            Extension.openOwa(accounts[idx]);
        })
    });

    $(document).on('settings.general', function(){
        Extension.openSettingsGeneral();
    });

    $(document).on('settings.accounts', function(){
        Extension.openSettingsAccounts();
    });

    $(document).on('report.bug', function(){
        Extension.openUrl('https://github.com/3axap4eHko/OWA-Notifier/issues');
    });


    $(function(){
        updateMails();
    })

})();