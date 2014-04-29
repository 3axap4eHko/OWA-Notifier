$(document).on('click','[data-action]', function()
{
    switch ($(this).data('action'))
    {
        case 'settings':
            window.open(chrome.extension.getURL('settings.html'), 'settings');
            break;
        case 'update':
            E.$.worker.main();
            break;
        case  'open-owa':
            var idx = $(this).parents('.mail-section').data('idx').toInt();
            var accounts = E.$.accounts.load();
            E.$.web.open(accounts[idx]);
            break;
    }
    return false;
});

function updateList()
{
    var options = E.$.options.load(),
        accounts = E.$.accounts.load(),
        mailBoxList = $('#mailbox-list'),
        server;
    mailBoxList.empty();
    if (options && accounts.length!=0)
    {
        accounts.forEach(function(account, idx) {
            server = new URL(account.serverEWS);
            mailBoxList.append(
                $('<div>', {'class': 'mail-section', 'data-idx': idx})
                    .append(
                        $('<div>', {'class': 'info'})
                            .append($('<a href="#" data-action="open-owa" title="Open Outlook Web Access">'+account.username+('({0}) <span class="pull-right">{1} <i class="glyphicon glyphicon-envelope"></i></span>').fmt(server.hostname, isFinite(account.unread) ? account.unread : '?' )+' </a>'))
                    )
            );
        });
    } else {
        E.$.options.open();
    }
}

$(document).on('unread', updateList);
$(updateList);