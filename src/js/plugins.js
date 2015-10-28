(function () {

    var global = this,
        filters = {
            Percent: function (value) {
                return _.toInt(value * 100) + '%';
            }
        };

    function trigger(event) {
        var $this = $(this),
            $target = $($this.data('target') || this),
            onEvent = $this.data('trigger-on');
        if (!onEvent || onEvent === event.type) {
            $target.trigger($this.data('trigger'), $this.data());
            return false;
        }
    }

    $(document).on('click submit change', '[data-trigger]', trigger);

    $(document).on('mousemove change', '[data-display]', function (event) {
        var source = $(event.target);
        var label = $('label[for="' + source.attr('id') + '"]');
        var display = label.find('span');
        if (!display.length) {
            display = $('<span>');
            label.append(display);
        }
        var filterName = source.data('display');
        display.html(filters[filterName](source.val()));
    });

    $(document).on('focus', '.time-pick', function (event) {
        $(event.target).pickTime();
    });

    $(document).on('set', function (event, data) {
        var $this = $(event.target);
        $this.val(data.value);
        $this.change();
    });

    $(document).on('tab-switch', function (event) {
        document.location.hash = $(event.target).attr('href');
    });

    $(document).on('share', function (event, data) {
        Extension.openUrl(data.url);
    });

}.call(this.global || this.window || global || window));

function drawClock(timePickerTable, options, onSelect) {
    options = options || {};
    options.start = _.toInt(options.start);
    options.step = _.toIntOrDefault(options.step, 1);
    options.value = _.toIntOrDefault(options.value, options.start - 1);
    timePickerTable.empty();
    var callback = function () {
        onSelect($(this).data('value'));
    };
    for (var i = options.start; i < (options.start + 12); i++) {
        var value = options.start + options.step * i;
        var number = $('<div>', {
            'class': 'time-picker-number mdl-js-button mdl-button--raised mdl-js-ripple-effect',
            'html': value,
            'data-value': value
        });
        timePickerTable.append(number);
        number.on('click', callback);
        if (options.value >= options.start && value == options.value) {
            number.addClass('active');
        }
    }
}

function setValueDisplayTime(timePickerDisplayTime, id, value) {
    value = _.fmtNumber(value, 2);
    $(timePickerDisplayTime[id]).html(value);
    return value;
}

function setActiveDisplayTime(timePickerDisplayTime, id) {
    timePickerDisplayTime.removeClass('active');
    $(timePickerDisplayTime[id]).addClass('active');
}

function pickTime(timePicker, id, step, value) {
    return new Promise(function (resolve) {
        var timePickerTable = timePicker.find('.time-picker-table');
        var timePickerDisplayTime = timePicker.find('.time-picker-display-time');
        setActiveDisplayTime(timePickerDisplayTime, id);
        drawClock(timePickerTable, {step: step, value: value}, function (value) {
            setValueDisplayTime(timePickerDisplayTime, id, value);
            resolve(value);
        });
    });
}


var inputEvt = new Event('input',{bubbles: true, cancelable: false});

$.fn.triggerInput = function(){
    return this.each(function(id, element){
        element.dispatchEvent(inputEvt);
        $(element).change();
    });
};

$.fn.pickTime = function () {
    var $timePicker = $('#time-picker');
    var $this = $(this);
    var timePickerDisplayTime = $timePicker.find('.time-picker-display-time');
    var values = $(this).val().split(':').map(function (value, id) {
        return setValueDisplayTime(timePickerDisplayTime, id, value);
    });
    pickTime($timePicker, 0, 1, values[0]).then(function (hours) {
        return pickTime($timePicker, 1, 5, values[1]).then(function (minutes) {
            return pickTime($timePicker, 2, 5, values[2]).then(function (seconds) {
                return new Time(hours, minutes, seconds);
            })
        })
    }).then(function (time) {
        $this.val(time.toString());
        $this.change();
        $timePicker.modal('hide');
    });
    $timePicker.modal('show');
};

$.fn.lockScreen = function(options){
    options = options || {};
    var $this = $(this);
    $this.show();
};

$.fn.unlockScreen = function(options){
    options = options || {};
    var $this = $(this);
    $this.hide();
};


$.fn.confirm = function (options) {
    options = options || {};
    var $this = $(this),
        $body = $this.find('.modal-body'),
        $footer = $this.find('.modal-footer');
    $body.html(options.body);
    $footer.empty();
    _.each(options.buttons || [], function (button) {
        var btn = $('<button>', {
            html: button.title
        });
        _.each(button.attr || {}, function (attr, name) {
            btn.attr(name, attr);
        });
        if (button.click) {
            btn.click(button.click);
        }
        $footer.append(btn);
    });
    $this.modal('show');
};

$(function () {
    $('[data-display]').change();
});