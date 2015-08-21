(function(){
    function buildAccountBar(account) {
        var count = _.toInt(account.unread),
            icon = $('<i>', {'class': 'material-icons', html: 'mail', id: 'account-'+account.idx+'-info'}),
            hint = '';

        if (account.hasErrors) {
            icon.addClass('md-attention blink');
            hint = '<div class="mdl-tooltip" for="account-'+account.idx+'-info">Has a problem</div>';
        } else if (count) {
            icon.addClass('md-info blink');
            hint = '<div class="mdl-tooltip" for="account-'+account.idx+'-info">Has unread mails</div>';
        }
        icon = icon[0].outerHTML + hint;

        return $('<li>', {'class': 'mdl-shadow--2dp mdl-card__actions'}).append(
            $('<a>', {
                href: '#',
                'data-trigger': 'account.owa',
                'data-idx': account.idx
            }).append(account.email)
                .append($('<span>', {'class': 'counter', html: count + ' ' + icon}))
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