'use strict';
(global => {

    const defaultAccountValues = {
        guid: _.randomGuid(),
        created: Date.now(),
        enabled: true,
        email: '',
        username: '',
        password: '',
        serverEWS: '',
        serverOWA: '',
        folderId: 'all'
    };
    const folderIds = {
        "all": "All",
        "inbox": "Inbox"
    };

    function formToValues(form, oldValues) {
        var values = _.reduce(form.querySelectorAll('input[name]'), (values, element) => {
            values[element.name] = element.value;
            return values;
        }, {});
        return Object.assign({}, defaultAccountValues, oldValues, values);
    }

    function extractAccount(data) {
        return _.filter(data, (value, key) => defaultAccountValues.hasOwnProperty(key));
    }

    const AccountForm = React.createClass({
        getDefaultProps() {
            return Object.assign({}, defaultAccountValues);
        },
        onSubmit(event) {
            event.preventDefault();
            const self = this;
            var account = formToValues(event.currentTarget, extractAccount(this.props));
            var modal = document.getElementById('modal');
            var locker = document.getElementById('screen-locker');
            $(locker).show();
            ExtensionAPI.testAccount(account).then( error => {
                $(locker).hide();
                if (!error) {
                    ExtensionAPI.updateAccount(account).then( () => {
                        $(modal).modal('hide');
                        self.props.onSave(account);
                    });
                } else {
                    var ewsWrapper = document.getElementById('form-account-serverEWS__view').parentElement;
                    var usernameWrapper = document.getElementById('form-account-username__view').parentElement;
                    var passwordWrapper = document.getElementById('form-account-password__view').parentElement;
                    ewsWrapper.classList.remove('is-invalid');
                    usernameWrapper.classList.remove('is-invalid');
                    passwordWrapper.classList.remove('is-invalid');

                    if (~[0, 404].indexOf(error.code) ) {
                        ewsWrapper.classList.add('is-invalid');
                    } else if (~[401].indexOf(error.code)) {
                        usernameWrapper.classList.add('is-invalid');
                        passwordWrapper.classList.add('is-invalid');
                    } else {
                        Browser.log.write(error);
                    }
                }
            });

        },
        render () {
            return (
                <form action="#" onSubmit={this.onSubmit} autoComplete="off">
                    <input type="hidden" name="guid" defaultValue={this.props.guid} />
                    <ul className="mdl-list">
                        <FormInputField
                            className="mdl-list__item_vertical"
                            id="form-account-email"
                            name="email"
                            type="email"
                            label="Email"
                            required="true"
                            defaultValue={this.props.email}
                            />
                        <FormInputField
                            className="mdl-list__item_vertical"
                            id="form-account-serverEWS"
                            name="serverEWS"
                            type="url"
                            label="Exchange Server URL"
                            required="true"
                            defaultValue={this.props.serverEWS}
                            error="Invalid Microsoft Exchange Server address"
                            />
                        <FormInputField
                            className="mdl-list__item_vertical"
                            id="form-account-serverOWA"
                            name="serverOWA"
                            type="url"
                            label="Web Access URL"
                            required="true"
                            defaultValue={this.props.serverOWA}
                            ref="serverOWA"
                            />
                        <FormInputField
                            className="mdl-list__item_vertical"
                            id="form-account-username"
                            name="username"
                            type="text"
                            label="Username"
                            required="true"
                            defaultValue={this.props.username}
                            />
                        <FormInputField
                            className="mdl-list__item_vertical"
                            id="form-account-password"
                            name="password"
                            type="password"
                            label="Password"
                            required="true"
                            defaultValue={this.props.password}
                            error="Invalid pair Username Password"
                            />
                        <FormSelectField
                            className="mdl-list__item_vertical"
                            id="form-account-folderId"
                            name="folderId"
                            label="Check folder"
                            values={folderIds}
                            defaultKey={this.props.folderId}
                            />
                        <li className="mdl-list__item_vertical">
                            <ul className="mdl-list mdl-grid">
                                <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col">
                                    <MdlButtonRaised className="mdl-js-ripple-effect mdl-button--accent">
                                        OK
                                    </MdlButtonRaised>
                                </FormEmptyField>
                                <FormEmptyField className="mdl-list__item_horizontal mdl-cell--6-col"/>
                                <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col">
                                    <MdlButtonRaised className="mdl-js-ripple-effect" data-dismiss="modal">
                                        Cancel
                                    </MdlButtonRaised>
                                </FormEmptyField>
                            </ul>
                        </li>
                    </ul>
                </form>
            );
        }
    });

    function showAccountForm(account, onSave) {
        var modal = document.getElementById('modal');
        var body = modal.querySelector('.modal-body');
        ReactDOM.unmountComponentAtNode(body);
        ReactDOM.render(<AccountForm {...account} onSave={onSave}/>, body, () => {
            componentHandler.upgradeElements(modal);
            $(modal).modal('show');
        });
    }

    const Confirmation = React.createClass({
        getDefaultProps() {
            return {onConfirmed: _.fnEmpty};
        },
        render() {
            return (
                <ul className="mdl-list">
                    <li className="mdl-list__item_vertical">
                        <b>{this.props.message}</b>
                    </li>
                    <li className="mdl-list__item_vertical">
                        <ul className="mdl-list mdl-grid">
                            <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col">
                                <MdlButtonRaised className="mdl-js-ripple-effect mdl-button--accent" onClick={this.props.onConfirmed} data-dismiss="modal">
                                    OK
                                </MdlButtonRaised>
                            </FormEmptyField>
                            <FormEmptyField className="mdl-list__item_horizontal mdl-cell--6-col"/>
                            <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col">
                                <MdlButtonRaised className="mdl-js-ripple-effect" data-dismiss="modal">
                                    Cancel
                                </MdlButtonRaised>
                            </FormEmptyField>
                        </ul>
                    </li>
                </ul>
            );
        }
    });

    function showModal(content) {
        var modal = document.getElementById('modal');
        var body = modal.querySelector('.modal-body');
        ReactDOM.unmountComponentAtNode(body);
        ReactDOM.render(content, body, () => {
            componentHandler.upgradeElements(modal);
            $(modal).modal('show');
        });
    }

    const guidParser = /&guid=(.*)$/;

    const AccountsSettingsTableRow = React.createClass({
        _updateAccount(account) {
            this.setState(extractAccount(account));
        },
        componentWillMount() {
            this._updateAccount(this.props);
        },
        componentDidMount () {
            componentHandler.upgradeElements(this.refs.root);
            var guid = (window.location.hash.match(guidParser) || [])[1];
            if (guid === this.state.guid) {
                this.onEdit();
            }
        },
        OnSwitch () {
            this.state.enabled = !this.state.enabled;
            this._updateAccount(this.state);
            ExtensionAPI.updateAccount(extractAccount(this.state));
            componentHandler.upgradeElements(this.refs.root);
        },
        onEdit() {
            showAccountForm(this.state, account => {
                this._updateAccount(account);
            })
        },
        onDelete() {
            const self = this;
            const onConfirmed = () => ExtensionAPI.deleteAccount(this.state).then( account => self.props.updateTable(account));
            showModal((<Confirmation message={`Are you sure you want to delete ${this.state.email}?`} onConfirmed={onConfirmed}/>));
        },
        render() {
            var account = this.state;
            var server = _.urlParse(account.serverEWS);
            return (
                <tr className="account-record" ref="root">
                    <td className="mdl-data-table__cell--icon">
                        <MdlButton className="mdl-button--icon mdl-button--colored" onClick={this.OnSwitch}>
                            <i className={`material-icons ${account.enabled ? '' : ' disabled'}`}>{account.enabled ? 'notifications' : 'notifications_off'}</i>
                        </MdlButton>
                    </td>
                    <td className="mdl-data-table__cell--non-numeric" title={account.email}>{account.email}</td>
                    <td className="mdl-data-table__cell--non-numeric" title={account.username}>{account.username}</td>
                    <td className="mdl-data-table__cell--non-numeric" title={server.host}>{server.host}</td>
                    <td className="mdl-data-table__cell--non-numeric" title={folderIds[account.folderId]}>{folderIds[account.folderId]}</td>
                    <td className="mdl-data-table__cell--icon">
                        <MdlButtonIcon className="mdl-js-ripple-effect mdl-button--colored" id={`action-button-${account.guid}`}>more_vert</MdlButtonIcon>
                        <ul className="mdl-menu mdl-menu--bottom-left mdl-js-menu mdl-js-ripple-effect mdl-menu-actions"
                            htmlFor={`action-button-${account.guid}`}>
                            <li className="mdl-menu__item" onClick={this.onEdit}><Icon icon="settings"/></li>
                            <li className="mdl-menu__item" onClick={this.onDelete}><Icon icon="delete"/></li>
                        </ul>
                    </td>
                </tr>
            )
        }
    });

    const AccountsSettingsTable = React.createClass({
        getInitialState() {
            return {
                accounts: this.props.accounts
            }
        },
        onClick() {
            showAccountForm({guid: _.randomGuid(), created: Date.now()}, this.updateTable);
        },
        updateTable() {
            ExtensionAPI.getAccounts().then( accounts => this.setState({accounts}));
        },
        render() {
            var accounts = ExtensionAPI.getAccountList(this.state.accounts);
            return (
                <div className="page-content">
                    <table className="mdl-data-table mdl-js-data-table mdl-shadow--2dp">
                        <thead>
                        <tr className="account-record">
                            <th>Enabled</th>
                            <th className="mdl-data-table__cell--non-numeric">Email</th>
                            <th className="mdl-data-table__cell--non-numeric">Username</th>
                            <th className="mdl-data-table__cell--non-numeric">Sever</th>
                            <th className="mdl-data-table__cell--non-numeric">Folder</th>
                            <th className="mdl-data-table__cell--non-numeric"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {accounts.map( account => <AccountsSettingsTableRow
                                                                            key={account.guid}
                                                                            {...account}
                                                                            updateTable={this.updateTable}
                                                                        />)
                        }
                        </tbody>
                    </table>
                    <MdlButtonFAB
                        className="mdl-js-ripple-effect mdl-button--colored pull-right mdl-margin__10px mdl-shadow--6dp mdl-hover mdl-hover--scale25"
                        onClick={this.onClick} icon="add"/>
                </div>
            );
        }
    });
    _.taskPush(global, 'settings-load', complete => {
        ExtensionAPI.getAccounts().then(accounts => {
            ReactDOM.render(<AccountsSettingsTable accounts={accounts}/>, document.getElementById('accounts'), complete);
        });
    });
})(window);
