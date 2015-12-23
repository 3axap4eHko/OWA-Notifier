'use strict';
( global => {


    const WizardStepTitle = React.createClass({
        render() {
            return (
                <div className="wizard-step-title">
                </div>
            );
        }
    });
    const WizardStepContent = React.createClass({
        render() {
            return (
                <div className="wizard-step-step">
                </div>
            );
        }
    });

    global.Wizard = React.createClass({
        render() {
            var children = this.props.children;
            return (
                <div className="wizard">
                    <div className="wizard-title">
                        {children.map( (child, id) => (<WizardStepTitle step={child}/>))}
                    </div>
                    <div className="wizard-content">
                        {children.map( child => (<WizardStep step={child}/>))}
                    </div>
                </div>
            );
        }
    });

})(window);