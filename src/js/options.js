(function() {
    var filters = {
        time: {
            set: function(value) {
                return Time.fromSeconds(value);
            },
            get: function(value){
                return Time.fromString(value).getTotalSeconds();
            }
        }
    };

    function formToObject(form) {
        form = $(form);
        return form.serializeArray().reduce(function(obj, fieldData){
            var field = form.find('[name="' + fieldData.name + '"]');
            var filter = field.data('filter');
            if (filters[filter]) {
                fieldData.value = filters[filter].get(fieldData.value);
            }
            obj[fieldData.name] = fieldData.value;
            return obj;
        }, {});
    }

    function objectToForm(form, object) {
        form = $(form);
        form[0].reset();
        var evt = new Event('input',{bubbles: true, cancelable: false});
        _.each(object, function(value, key){
            var field = form.find('[name="' + key + '"]');
            if (field.length) {
                var filter = field.data('filter');
                if (filters[filter]) {
                    value = filters[filter].set(value);
                }
                field.val(value);
                field.trigger('change');
                field[0].dispatchEvent(evt);
            }
        });
        componentHandler.upgradeDom();
        return form;
    }


    function applyConfig(config) {
        objectToForm('#notifier-config', config);
    }

    function exportConfig() {
        return formToObject('#notifier-config');
    }

    function buildActions(idx) {
        var id = 'action-' + idx;
        return $('<td>', {'class': 'mdl-data-table__cell--icon'}).append(
                $('<button>', {'class': 'mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect mdl-button--colored', 'id': id}).append(
                $('<i>', {'class': 'material-icons','html': 'more_vert'})
            )
        ).append(
            $('<ul>', {'class': 'mdl-menu mdl-menu--bottom-left mdl-js-menu mdl-js-ripple-effect mdl-menu-actions', 'for': id}).append(
                $('<li>',{'class': 'mdl-menu__item', 'data-trigger': 'account.form', 'data-account-idx': idx}).append(
                    $('<a>',{'html':'<i class="material-icons">settings</i>'})
                )
            ).append(
                $('<li>',{'class': 'mdl-menu__item', 'data-trigger': 'account.delete', 'data-account-idx': idx}).append(
                    $('<a>',{'html':'<i class="material-icons">delete</i>'})
                )
            )
        );
    }

    function buildAccountRow(account) {
        var server = _.url(account.serverEWS),
            idx = account.idx;
        return $('<tr class="account-record">').append(
            $('<td>', {'class': 'mdl-data-table__cell--icon'}).append(
                $('<button>',{'class': 'mdl-button mdl-js-button mdl-button--icon mdl-button--colored', 'data-trigger': 'account.switch', 'data-account-idx': idx}).append(
                    $('<i>', {'class': 'material-icons' + (account.enabled ? '' : ' disabled'),'html': account.enabled ? 'notifications' : 'notifications_off'})
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
        var table = $('#accounts');
        table.empty();
        _.each(accounts, function(account){
            table.append(buildAccountRow(account));
        });
        componentHandler.upgradeDom();
    }

    $(function() {
        $('.mdl-layout__tab').each(function(idx, element){
            element = $(element);
            if (element.attr('href')===(document.location.hash || '#settings-general')) {
                element.addClass('is-active');
                $(element.attr('href')).addClass('is-active');
                return true;
            }
        });

        Extension.update();

        Extension.getAccounts().then(loadAccounts);

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

    $(document).on('account.form', function(event, data){
        var idx = _.toInt(data.accountIdx, -1),
            account;
        Extension.getAccounts().then(function(accounts){
            if (idx === -1) {
                account = new Account();
                account.idx = -1;
            } else {
                account = accounts[idx];
            }
            objectToForm('#account-form', account);
            $('#account-modal').modal('show');
        });
        return false;
    });

    $(document).on('account.save', function(event){
        var account = formToObject('#account-form'),
            idx = _.toInt(account.idx, -1);
        Extension.getAccounts().then(function(accounts){
            if (idx === -1) {
                accounts.push(account);
                account.idx = accounts.length - 1;
                account.enabled = true;
            } else {
                _.extend(accounts[idx],account);
            }
            Extension.setAccounts(accounts).then(loadAccounts);
            $('#account-modal').modal('hide');
        });
    });

    $(document).on('account.delete', function(event, data){
        var idx = _.toInt(data.accountIdx);
        $('#confirmation-modal').confirm({
            body: 'Are you sure you want to delete record ?',
            buttons: [
                {
                    title: 'OK',
                    attr: {
                        'class': 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent pull-left'
                    },
                    click: function(){
                        Extension.getAccounts().then(function(accounts){
                            accounts.splice(idx,1);
                            accounts.forEach(function(account, idx){
                                account.idx = idx;
                            });
                            Extension.setAccounts(accounts).then(loadAccounts);
                            $('#account-modal').modal('hide');
                        });
                    }
                },
                {
                    title: 'Cancel',
                    attr: {
                        'class': 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect pull-right',
                        'data-dismiss': 'modal'
                    }
                }
            ]
        });
    });

    $(document).on('account.switch', function(event, data){
        var idx = _.toInt(data.accountIdx);
        Extension.getAccounts().then(function(accounts){
            accounts[idx].enabled = !accounts[idx].enabled;
            Extension.setAccounts(accounts).then(loadAccounts);
            $('#account-modal').modal('hide');
        });
    });

}.call(this.global || this.window || global || window));