(function(){
    function updateMails() {
        var mailContainer = $('#mails');
        mailContainer.empty();

        Extension.getAccounts().then(function(accounts){
            Extension.getUnreadEmails(accounts).then(function(result){
                _.each(result, function(accountMails){
                    var account = accountMails[0],
                        mails = accountMails[1];
                    mailContainer.append(
                        $('<li>', {'class': 'mdl-shadow--2dp mdl-card__actions'}).append(
                            $('<a>', {
                                href: '#',
                                'data-trigger': 'account.owa',
                                'data-idx': account.idx,
                                html: account.email + _.fmtString('<span class="counter">{count} <i class="material-icons">mail</i></span>', {count: mails.length})
                            })
                        )
                    );
                });
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