'use strict';

var EmailBar = React.createClass({
    getInitialState() {
        return {count: 0};
    },
    componentWillMount() {
        this.setState({
            count: _.toInt(this.props.account.unread)
        });
    },
    openSettingsAccounts() {
        ExtensionAPI.openSettingsAccounts(this.props.account);
    },
    openOwa() {
        ExtensionAPI.openUrl(this.props.account.serverOWA);
    },
    markAllRead() {
        ExtensionAPI.markAllAsRead(this.props.account.guid);
    },
    render() {
        var count = this.state.count;
        if (count === 0) {
            count = '';
        } else {
            count = `(${count})`;
        }
        var alert = '';
        if (this.props.account.errors.length) {
            alert = (
            <a href="#" className="pull-left action" onClick={this.openSettingsAccounts}>
                <Icon title="Open Settings" className="blink md-attention" icon="error"  />
            </a>);
        }
        return (
            <li className="mdl-shadow--2dp mdl-card__actions">
                <a href="#" className="pull-left" onClick={this.openOwa} title="Open OWA">
                    {this.props.account.email} {count}
                </a>
                {alert}
                <MdlButtonIcon className="pull-right action" onClick={this.openSettingsAccounts} title="Edit Account">
                    settings applications
                </MdlButtonIcon>
                <MdlButtonIcon className="pull-right action" onClick={this.markAllRead} title="Mark All as Read">
                    drafts
                </MdlButtonIcon>
            </li>
        );
    }
});

var EmailBars = React.createClass({
    render() {
        var accounts = ExtensionAPI.getAccountList(this.props.accounts);
        return (
            <ul className="mdl-bar" id="mails">
                {accounts.map( account => <EmailBar key={account.guid} account={account}/> )}
            </ul>
        );
    }
});


(function(){
    ExtensionAPI.getAccounts().then( accounts => {
        ReactDOM.render(<EmailBars accounts={accounts} />, document.getElementById('mails'));
    });
    $(document).on('click', '[data-open-url]', event => {
        var url = $(event.currentTarget).data('open-url');
        ExtensionAPI.openUrl(url);
    });
})();