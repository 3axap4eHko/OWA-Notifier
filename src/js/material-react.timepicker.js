'use strict';
(global => {

    var MdlClockScale = React.createClass({
        onSelect(event) {
            this.props.onSelect(_.toInt(event.currentTarget.dataset.value));
        },
        render() {
            var start = _.toInt(this.props.start);
            var step = _.toIntOrDefault(this.props.step, 1);
            var value = _.toIntOrDefault(this.props.value, start - 1);
            var valueIdx = _.toInt((value - start)/step);
            var numbers = _.range(12, start).reduce( (numbers, v, id)=> {
                return numbers.concat([{
                    value: start + step*id,
                    className: 'time-picker-number mdl-js-button mdl-button--raised mdl-js-ripple-effect'
                }]);
            }, []);
            numbers[valueIdx].className += ' active';

            return (
                <div className="time-picker-table mdl-shadow--2dp">
                    {numbers.map( (num, id) => <div key={id} className={num.className} data-value={num.value} onClick={this.onSelect}>{num.value}</div>)}
                </div>
            )
        }
    });

    var MdlClockTable = React.createClass({
        render() {
            return (
                <ul className="mdl-list time-picker-display">
                    {this.props.time.map( (v, id) => <li key={id} id={`time-picker-clock-table-${id}`} className="mdl-list__item_horizontal time-picker-display-time">{_.fmtNumber(v, 2)}</li>)}
                </ul>
            )
        }
    });

    var MdlClock = React.createClass({
        getInitialState () {
            var result = this.props.value.split(':').map(_.toInt);
            return {index: 0, step: 1, result: result};
        },
        onSelect(value) {
            var index = this.state.index+1;
            var result = this.state.result.slice();
            result[this.state.index] = value;
            if (index < result.length) {
                this.setState({index: index, result: result, step: 5});
            } else {
                this.props.onSelect(result);
            }
        },
        render() {
            return (
                <div className={this.props.className || ''}>
                    <div id="time-picker-clock-scale">
                        <MdlClockScale onSelect={this.onSelect} step={this.state.step} value={this.state.result[this.state.index]} />
                    </div>
                    <MdlClockTable time={this.state.result} />
                </div>
            )
        }
    });



    global.MdlTimePicker = React.createClass({
        getDefaultProps() {
            return {
                onValue: _.fnEmpty
            }
        },
        onSelect(result) {
            $(document.getElementById(this.props.modal)).modal('hide');
            var time = new Time(...result);
            result = result.map( v => _.fmtNumber(v,2)).join(':');
            this.refs.view.value = result;
            this.refs.input.value = time.getTotalSeconds();
            this.props.onValue(this.refs.input.value, this.refs.input.name);
        },
        onFocus(event) {
            var container = document.getElementById(this.props.modal).querySelector('.modal-body');
            ReactDOM.unmountComponentAtNode(container);
            ReactDOM.render(<MdlClock onSelect={this.onSelect} value={event.currentTarget.value} />, container, () => {
                $(document.getElementById(this.props.modal)).modal('show');
            });
        },
        render() {
            var attr = this.props.attr || {};
            var time = Time.fromString(this.props.defaultValue || '0:0:0');
            return (
                <div>
                    <input type="hidden" id={this.props.id} name={this.props.name} value={time.getTotalSeconds()} ref="input" />
                    <input {...attr} type="text" id={`${this.props.id}__view`} className="mdl-textfield__input"
                                     value={this.props.defaultValue} placeholder={this.props.placeholder}
                                     readOnly={true} required={true} onFocus={this.onFocus} ref="view" />
                </div>
            );
        }
    });

})(window);