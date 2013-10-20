// Select all range inputs, watch for change
$(document).on('change', "input[type='range']", function() {
    var el, newPoint, newPlace, width, offset;
    // Cache this for efficiency
    el = $(this);
    // Measure width of range input
    width = el.width();
    // Figure out placement percentage between left and right of input
    newPoint = (el.val() - el.attr("min")) / (el.attr("max") - el.attr("min"));
    // Janky value to get pointer to line up better
    offset = -1.3;
    // Prevent bubble from going beyond left or right (unsupported browsers)
    if (newPoint < 0) { newPlace = 0; }
    else if (newPoint > 1) { newPlace = width; }
    else { newPlace = width * newPoint + offset; offset -= newPoint; }
    // Move bubble
    el.next("output").css({
        left: newPlace,
        marginLeft: offset + "%"
    });
});

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
        form.find('.form-group').removeClass('error');
        var success = function () {
            $('div.alert.alert-success').slideDown();
            setTimeout(function () {
                $('div.alert.alert-success').slideUp();
            }, 3000);
        };

        var error = function (errorFields) {
            $.each(errorFields, function (key, value) {
                form.find('#' + value).parents('.form-group').addClass('error')
            });
            $('div.alert.alert-error').slideDown();
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