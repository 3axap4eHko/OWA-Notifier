'use strict';
(global => {
    function ifRetStr(cond, ...value) {
        value = value.length ? value[0] : cond;
        return cond === undefined ? '' : value;
    }

    function ifRetObj(cond, ...value) {
        value = value.length ? value[0] : cond;
        return cond === undefined ? {} : value;
    }

    function ifRetArr(cond, ...value) {
        value = value.length ? value[0] : cond;
        return cond === undefined ? [] : value;
    }

    global.Icon = React.createClass({
        render() {
            return (
                <i {...this.props}
                    className={`material-icons ${ifRetStr(this.props.className)}`}>
                    {this.props.icon}
                </i>
            )
        }
    });

    global.MdlButton = React.createClass({
        render() {
            var children = this.props.children;
            if (this.props.hasOwnProperty('icon')) {
                if (this.props.hasOwnProperty('children')) {
                    if (!Array.isArray(children)) {
                        children = [children]
                    }
                } else {
                    children = [];
                }
                children.unshift(<Icon key="__icon" icon={this.props.icon} />);
            }
            return ( <button
                    {...this.props}
                    className={`mdl-button mdl-js-button ${ifRetStr(this.props.className)}`} >
                    {children}
                </button>
            )
        }
    });

    global.MdlButtonFAB = React.createClass({
        render() {
            return ( <MdlButton
                    {...this.props}
                    className={`mdl-button--fab ${ifRetStr(this.props.className)}`} />
            )
        }
    });

    global.MdlButtonRaised = React.createClass({
        render() {
            return ( <MdlButton
                    {...this.props}
                    className={`mdl-button--raised ${ifRetStr(this.props.className)}`} />
            )
        }
    });

    global.MdlButtonIcon = React.createClass({
        render() {
            return ( <MdlButton
                    {...this.props}
                    className={`mdl-button--icon ${ifRetStr(this.props.className)}`}>
                    <i className="material-icons">{this.props.children}</i>
                </MdlButton>
            )
        }
    });

    global.MdlCard = React.createClass({
        render() {
            return (
                <div {...ifRetObj(this.props.attr)} className={`mdl-card mdl-shadow--2dp ${ifRetStr(this.props.className)}`}>
                    <div className="mdl-card__title"><h2 className="mdl-card__title-text">{this.props.title}</h2></div>
                    {this.props.children}
                    <div class="mdl-card__actions mdl-card--border">
                        {ifRetArr(this.props.actions)}
                        </div>
                    <div className="mdl-card__menu">
                        {ifRetArr(this.props.menu)}
                    </div>
                </div>
            )
        }
    });

    global.MdlSelect = React.createClass({
        getDefaultProps() {
            return {
                values: []
            }
        },
        onSelect (event) {
            var element = document.getElementById(this.props.target);
            element.value = event.currentTarget.textContent;
            event = new Event('input', { bubbles: true });
            element.dispatchEvent(event);
        },
        render() {
            var values = _.pairs(this.props.values || {});
            var pos = this.props.position || 'mdl-menu--bottom-left';
            return (
                <ul className={`mdl-menu mdl-js-menu mdl-js-ripple-effect ${pos}`} htmlFor={this.props.target}>
                    {values.map( (pair,id) => <li key={id} className="mdl-menu__item" onClick={this.onSelect} data-value={pair.value}>{pair.key}</li> )}
                </ul>
            )
        }
    });

    global.FormEmptyField = React.createClass({
        render() {
            return (
                <li className={`${this.props.className || ''}`}>
                    {this.props.children}
                </li>
            )
        }
    });

    global.FormFieldBase = React.createClass({
        render() {
            var tooltip = this.props.tooltip;
            if (tooltip) {
                tooltip = (<div className="mdl-tooltip" htmlFor={`${this.props.id}__view`}>
                            {this.props.tooltip}
                            </div>);
            }
            var error = this.props.error;
            if (error) {
                error = (<span className="mdl-textfield__error">{error}</span>);
            }
            return (
                <FormEmptyField className={this.props.className || ''}>
                    <label htmlFor={`${this.props.id}__view`} className="mdl-textfield__label">{this.props.label}</label>
                    {this.props.children}
                    {error}
                    {tooltip}
                </FormEmptyField>
            )
        }
    });

    global.FormInputField = React.createClass({
        getDefaultProps() {
            return {
                type: 'text',
                required: false,
                defaultValue: '',
                placeholder: '',
                onValue: _.fnEmpty
            }
        },
        onChange() {
            this.props.onValue(this.refs.input.value, this.refs.input.name);
        },
        render() {
            return (
                <FormFieldBase
                    className={`${this.props.className || ''} mdl-textfield mdl-js-textfield mdl-textfield--floating-label`}
                    id={this.props.id}
                    label={this.props.label}
                    tooltip={this.props.tooltip}
                    error={this.props.error}
                    >
                    <input type={this.props.type} name={this.props.name} id={`${this.props.id}__view`}
                           className="mdl-textfield__input" required={this.props.required}
                           defaultValue={this.props.defaultValue} placeholder={this.props.placeholder}
                           onChange={this.onChange} ref="input" />
                </FormFieldBase>
            )
        }
    });


    global.FormSelectField = React.createClass({
        getDefaultProps() {
            return {
                onValue: _.fnEmpty
            }
        },
        onSelect () {
            var key = this.refs.view.value;
            this.refs.input.value = this.props.values[key];
            this.props.onValue(this.refs.input.value, this.refs.input.name);
        },
        render() {
            var attr = this.props.attr || {};
            var defaultValue = _.first(this.props.values, key => key === this.props.defaultKey, Object.keys(this.props.values)[0]).key;
            return (
                <FormFieldBase
                    className={`mdl-textfield mdl-js-textfield mdl-textfield--floating-label ${this.props.className || ''}`}
                    id={this.props.id}
                    label={this.props.label}
                    tooltip={this.props.tooltip}
                    >
                    <input type="hidden" id={this.props.id} name={this.props.name} ref="input"
                           defaultValue={this.props.values[defaultValue]} />
                    <input type="text" id={`${this.props.id}__view`} className="mdl-textfield__input" ref="view"
                           tabIndex="0" readOnly defaultValue={defaultValue} {...attr} onChange={this.onSelect} />
                    <MdlSelect
                        target={`${this.props.id}__view`}
                        values={this.props.values}
                        />
                </FormFieldBase>
            )
        }
    });

    global.FormRangeField = React.createClass({
        getDefaultProps() {
            return {
                onValue: _.fnEmpty
            }
        },
        onChange() {
            this.props.onValue(this.refs.input.value, this.refs.input.name);
        },
        render() {
            return (
                <FormEmptyField className={this.props.className || ''} >
                    <label htmlFor={this.props.id}>{this.props.label}</label>
                    <input
                        className="mdl-slider mdl-js-slider"
                        type="range"
                        id={this.props.id}
                        name={this.props.name}
                        defaultValue={_.toFloatOrDefault(this.props.defaultValue, 0)}
                        min={_.toFloatOrDefault(this.props.min, 0)}
                        max={_.toFloatOrDefault(this.props.max, 1)}
                        step={_.toFloatOrDefault(this.props.step, 0.01)}
                        tabIndex="0"
                        onChange={this.onChange}
                        ref="input"
                        />
                    <div className="mdl-tooltip" htmlFor={this.props.id}>
                        {this.props.tooltip}
                    </div>
                </FormEmptyField>
            )
        }
    });

})(window);
