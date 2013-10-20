(function(){
    var exch = new Exchange();
})();

$(document).on('click','[data-action]', function()
{
    switch ($(this).data('action'))
    {
        case 'settings':
            window.open(chrome.extension.getURL('owa_options.html'), 'owa_options');
            break;
    }
    return false;
});