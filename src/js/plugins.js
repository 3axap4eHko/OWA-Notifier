(function(jQuery) {

    function secondsToTime(seconds) {
        return {
            hours: (seconds/3600|0),
            minutes: ((seconds-seconds%60)/60|0)%60,
            seconds: seconds % 60
        };
    }
    function timeToSeconds(time) {
        return parseInt(time.hours) * 3600 + parseInt(time.minutes) * 60 + parseInt(time.seconds);
    }

    function timeToStr(time) {
        return Object.keys(time).map(function(key){return time[key].toString().length<2 ? ('0'+time[key]) : time[key] ;}).join(':');
    }

    function secondsToStr(seconds){
        var time = secondsToTime(seconds);
        return timeToStr(time);
    }


    jQuery.fn.rawData = function(options)
    {
        var $this = $(this),
            data = {};
        if (options){
            Object.keys(options).forEach(function(key){
                data = options[key];
                if (data.is('Array')){
                    $this.find('[name="'+key+'[]"]').each(function(idx){
                        $(this).val(data[idx]);
                    });
                }else {
                    $this.find('[name="'+key+'"]').val(data);
                }
            });
            return this;
        }else {
            $this.serializeArray().forEach(function(input) {
                if (data.hasOwnProperty(input.name)) {
                    if (!data[input.name].is('Array')) {
                        data[input.name]=[data[input.name]];
                    }
                    data[input.name].push(input.value);
                }
                data[input.name] = input.value;
            });
            return data;
        }
    };

    var interval=null,
        popover=null;

    $(function(){
        var htmlForm = $('<form id="interval-picker" class="form-inline" role="form">' +
            '<div class="form-group">' +
                '<input type="number" class="form-control input-sm" name="hours" min="0" max="48" value="00">' +
            '</div> :' +
            '<div class="form-group">' +
                '<input type="number" class="form-control input-sm" name="minutes" min="0" max="60" value="00">' +
            '</div> :' +
            '<div class="form-group">' +
                '<input type="number" class="form-control input-sm" name="seconds" min="0" max="60" value="00">' +
            '</div>' +
            '<div class="form-group pull-right">' +
                '<button class="btn btn-xs btn-default" data-action="reset" title="Reset to 0"><i class="glyphicon glyphicon-ban-circle"></i></button>' +
                '<button class="btn btn-xs btn-success" data-action="apply"><i class="glyphicon glyphicon-ok"></i></button>' +
            '</div>' +
            '</form>');

        $('.interval-picker').popover({
            animation: false,
            html: true,
            container: 'body',
            placement: 'right',
            trigger: 'manual',
            content: function() {
                popover = $(this);
                var dataCtrl = $(this).next(),
                    seconds = parseInt(dataCtrl.val());
                interval = secondsToTime(isNaN(seconds) ? 0 : seconds);
                htmlForm.rawData(interval);

                return htmlForm;
            }
        }).on('shown.bs.popover', function (e) {
            htmlForm.find('input').trigger('focus');
        }).on('hide.bs.popover', function (e) {
            var dataCtrl = popover.next();
            popover.val(timeToStr(interval));
            dataCtrl.val(timeToSeconds(interval));
        });
        $('input[data-interval-view]').trigger('change');
    });

    $(document).on('focus','.interval-picker', function(e){
        popover && (e.target!=popover[0]) && popover.popover('hide');
        $(this).popover('show');
    });

    $(document).on('click', function(e) {
        var target = $(e.target);
        if (!target.hasClass('interval-picker') && !target.hasClass('popover') && !target.parents('.popover').length) {
            popover && (e.target!=popover[0]) && popover.popover('hide');
        }
    });

    $(document).on('click', 'form#interval-picker button', function() {
        var $this = $(this),
            form = $this.parents('form'),
            action = $this.data('action');
        switch (action) {
            case 'reset':
                form[0].reset();
                return;
                break;
            case 'apply':
                interval=form.rawData();
                break;
        }
        popover.popover('hide');
        return false;
    });


    $(document).on('submit','form#interval-picker', function(){

        return false;
    });

    $(document).on('change', 'input[data-interval-view]', function(){
        var $this = $(this),
            view = $($this.data('interval-view'));
        view.val(secondsToStr($this.val()));
    });

})(jQuery);
