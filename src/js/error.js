'use strict';
( (global) => {

    const ItemsPerPage = 20;

    function getErrors(errors, page) {
        return _.keys(errors).slice(ItemsPerPage*(page-1), ItemsPerPage*page).map( time => {
            return {time: _.fmtDate(new Date(parseInt(time)), 'Y/M/D h:m:s'), message: JSON.stringify(errors[time])}
        });
    }

    const ErrorTable = React.createClass({
        getInitialState() {
            return {errors: {}, page: 1};
        },
        componentWillMount() {
            this.state.errors = getErrors(this.props.errors, 0);
        },
        showPage(event) {

        },
        render() {
            var errors = this.state.errors;
            var pageCount = Math.ceil(Object.keys(this.props.errors).length / ItemsPerPage);
            return (
                <div className="page-content">
                    <div>Total pages : {pageCount}</div>
                    <table className="mdl-data-table mdl-js-data-table mdl-shadow--2dp mdl-cell--12-col-any">
                        <thead>
                        <tr>
                            <th className="mdl-cell--1-col-any">Time</th>
                            <th className="mdl-data-table__cell--non-numeric mdl-cell--11-col-any">Info</th>
                        </tr>
                        </thead>
                        <tbody>
                        {errors.map( error => (<tr>
                                                    <td>{error.time}</td>
                                                    <td className="mdl-data-table__cell--non-numeric">{error.message}</td>
                                                </tr>)
                        )}
                        </tbody>
                    </table>
                </div>
            );
        }
    });

    ReactDOM.render(<ErrorTable errors={Browser.log.read()}/>, document.getElementById('content'), componentHandler.upgradeDom);

})(window);