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