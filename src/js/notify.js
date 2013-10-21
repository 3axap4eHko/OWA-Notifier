var exchange = new Exchange();

$(document).on('click','[data-action]', function()
{
    var action = $(this).data('action');
    exchange[action]();
    setTimeout(function(){
        window.close();
    },1000);
});

$(document).ready(function(){
    var urlData = window.location.href.split('?')[1],
        data = {};
    urlData.split('&').forEach(function(value)
    {
        value = value.split('=');
        data[decodeURIComponent(value[0])] = decodeURIComponent(value[1]);
    });
    $('#title').html(data.title);
    $('#message').html(data.message);
});