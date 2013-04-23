$(document).ready(function () {

    var form = $('form#notifier-options');
    var exchange = new Exchange();
    exchange.loadForm(form);

    if (exchange.validForm(form)) {
        form.find('input#save').removeClass('disabled')
    } else {
        form.find('input#save').addClass('disabled')
    }

    form.find('input#reset').click(function () {
        exchange.loadForm(form);
    });

    form.find('#test').click(function () {
        exchange.owa(
            form.find('input#outlook-web-access').val(),
            form.find('input#username').val(),
            form.find('input#password').val()
        );
    });

    form.find('input#save').click(function () {
        $('div.alert').hide();
        form.find('.control-group').removeClass('error');
        var success = function () {
            $('div.alert.alert-success').show();
            setTimeout(function () {
                $('div.alert.alert-success').hide();
            }, 3000);
        };

        var error = function (errorFields) {
            $.each(errorFields, function (key, value) {
                form.find('#' + value).parents('.control-group').addClass('error')
            });
            $('div.alert.alert-error').show();
        };

        exchange.saveForm(form, success, error);
        return false;
    });

    form.find('input').keyup(function () {
        if (exchange.validForm(form)) {
            form.find('input#save').removeClass('disabled')
        } else {
            form.find('input#save').addClass('disabled')
        }
        return true;
    });

    form.find('input#volume').change(function () {
        form.find('#volumeDisplay').html(Math.ceil(form.find('input#volume').val()*100) + ' %');
    });

    form.find('input#volume').mouseup(function () {
        exchange.playSound(form.find('input#volume').val());
    });

    form.find('input#volume').change();
});