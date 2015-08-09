(function() {
    var filters = {
        time: {
            set: function(value) {
                var d = new Date(0,0,0,0,0,0,0);
                d.setSeconds(_.toInt(value));
                return _.fmtDate(d, 'H:i:s');
            },
            get: function(value){
                var d= new Date();
                d.setTime(0);
                value = value.split(':').map(_.toInt);
                d.setHours(d.getHours() + value[0]);
                d.setMinutes(d.getMinutes() + value[1]);
                d.setSeconds(d.getSeconds() + value[2]);
                return _.toInt(d.getTime()/1000);
            }
        }
    };
    function formToObject(form) {
        var $form = $(form),
            object = {};
        $form.find('[name]').each(function(id, field){
            var filter = field.data('filter');
            var key = field.attr('name');
            var value = field.val();
            if (filters[filter]) {
                value = filters[filter].get(value);
            }
            switch (field.attr('type')) {
                case 'checkbox':
                    break;
                default:
                    object[key] = value;
            }
        });
        return object;
    }


    function applyConfig(config) {
        var form = $('#notifier-config');
        _.each(config, function(value, key) {
            var field = form.find('[name="' + key + '"]');
            var filter = field.data('filter');
            if (filters[filter]) {
                value = filters[filter].set(value);
            }
            field.val(value);
            field.change();
        });
    }

    function exportConfig() {
        var fields = $('#notifier-config').find('[name]');
        var config = {};
        fields.each(function(id, field){
            field = $(field);
            var filter = field.data('filter');
            var key = field.attr('name');
            var value = field.val();
            if (filters[filter]) {
                value = filters[filter].get(value);
            }
            config[key] = value;
        });
        return config;
    }

    function buildActions(idx) {
        var id = 'action-' + idx;
        return $('<td>', {'class': 'mdl-data-table__cell--icon'}).append(
            $('<button>', {'class': 'mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect mdl-button--colored', 'id': id}).append(
                $('<i>', {'class': 'material-icons','html': 'more_vert'})
            )
        ).append(
            $('<ul>', {'class': 'mdl-menu mdl-menu--bottom-left mdl-js-menu mdl-js-ripple-effect mdl-menu-actions', 'for': id}).append(
                $('<li>',{'class': 'mdl-menu__item', 'data-trigger': 'account.edit', 'data-account-idx': idx}).append(
                    $('<a>',{'html':'<i class="material-icons">settings</i>'})
                )
            ).append(
                $('<li>',{'class': 'mdl-menu__item', 'data-trigger': 'account.delete', 'data-account-idx': idx}).append(
                    $('<a>',{'html':'<i class="material-icons">delete</i>'})
                )
            )
        );
    }

    function buildAccountRow(account, idx) {
        var server = _.url(account.serverEWS);
        return $('<tr class="account-record">').append(
            $('<td>', {'class': 'mdl-data-table__cell--icon'}).append(
                $('<button>',{'class': 'mdl-button mdl-js-button mdl-button--icon mdl-button--colored', 'data-trigger': 'account.switch', 'data-account-idx': idx}).append(
                    $('<i>', {'class': 'material-icons','html': account.enabled ? 'notifications' : 'notifications_off'})
                )
            )
        )
            .append($('<td>', {'class': 'mdl-data-table__cell--non-numeric', 'html': account.email,'title': account.email}))
            .append($('<td>', {'class': 'mdl-data-table__cell--non-numeric', 'html': account.username,'title': account.username}))
            .append($('<td>', {'class': 'mdl-data-table__cell--non-numeric', 'html': server.host, 'title': server.host}))
            .append($('<td>', {'class': 'mdl-data-table__cell--non-numeric', 'html': account.folder}))
            .append(buildActions(idx));
    }

    function loadAccounts(accounts) {
        var table = $('#accounts'),
            idx = 0;
        table.empty();
        _.each(accounts, function(account){
            table.append(buildAccountRow(account, idx++));
        });
    }

    function exportAccount() {
        var form = $('#account-form'),
            idx = _.toInt(form.find('#account-idx').val(), -1),
            account = new Account();
        form.find('[name]').each(function(id, field){
            //account[field.attr('name')] = field.val();
        })

    }

    $(function() {

        Extension.getAccounts().then(loadAccounts).then(function(){

        });

        Extension.getConfig().then(applyConfig).then(function() {
            $('#notifier-config').on('change', 'input,select', function(){
                Extension.setConfig(exportConfig());
            });
        });


        var sound = document.createElement('audio');
        sound.setAttribute('preload', 'auto');
        $(document).on('play', function(event){
            var $this = $(event.target),
                value = $this.val();
            try {
                sound.pause();
                sound.currentTime = 0;
                sound.setAttribute('src', value);
                sound.play();
                var volume = $('#volume').val();
                sound.muted = (volume == 0);
                sound.volume = volume;

            } catch (e) {
            }
        });
    });

    $(document).on('account.edit', function(event, data){
        var idx = _.toInt(data.accountIdx);
        Extension.getAccounts().then(function(accounts){
            var form = $('#account-form'),
                account = accounts[Object.keys(accounts)[idx]];
            form.find('#account-idx').val(idx);
            form.find('[name]').each(function(id, field){
                field = $(field);
                var value = account[field.attr('name')];
                switch (field.attr('type')) {
                    case 'checkbox':
                        value = !!value;
                        if(value) {
                            field.prop('checked', true);
                            field.attr('checked','checked');
                            //field.parents('.mdl-checkbox').addClass('is-checked');
                        } else {
                            field.prop('checked', false);
                            field.removeAttr('checked');
                            //field.parents('.mdl-checkbox').removeClass('is-checked');
                        }
                        break;
                    default:
                        field.val(value);
                }
                field.change();
            });
            $('#account-modal').modal('show');
        });
        return false;
    });

    $(document).on('account.save', function(event){
        var form = $('#account-form'),
            idx = _.toInt(form.find('#account-idx').val(), -1);
        debugger;
        form.find('[name]').each(function(){

        })
    });

    $(document).on('account.switch', function(event, data){
        var idx = _.toInt(data.accountIdx);
        Extension.getAccounts().then(function(accounts){
            var account = accounts[Object.keys(accounts)[idx]];
            account.enabled = !account.enabled;
            Extension.setAccount(account).then(function(accounts){
                loadAccounts(accounts);
            });
        });
        return false;
    });


}.call(this.global || this.window || global || window));

