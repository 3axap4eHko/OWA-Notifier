'use strict';
(global => {

    const FormTimePickerField = React.createClass({
        render() {
            return (
                <FormFieldBase
                    className="mdl-textfield mdl-js-textfield mdl-textfield--floating-label mdl-cell--3-col"
                    id={this.props.id}
                    label={this.props.label}
                    tooltip={this.props.tooltip}
                    >
                    <MdlTimePicker
                        id={this.props.id}
                        name={this.props.name}
                        defaultValue={this.props.defaultValue}
                        placeholder={this.props.placeholder}
                        modal="time-picker-modal"
                        onValue={this.props.onValue}
                        />
                </FormFieldBase>
            )
        }
    });

    const CommonSettingsForm = React.createClass({
        onValue(value, name) {
            ExtensionAPI.updateConfig(value, name);
        },
        render() {
            var sounds = {
                "Sound 1": "sounds/sound1.ogg",
                "Sound 2": "sounds/sound2.ogg",
                "Sound 3": "sounds/sound3.ogg",
                "Sound 4": "sounds/sound4.ogg",
                "Sound 5": "sounds/sound5.ogg"
            };
            return (
                <div className="page-content">
                    <form id="notifier-config" action="#">
                        <ul className="mdl-list mdl-grid">
                            <FormTimePickerField
                                className="mdl-list__item_horizontal"
                                id="update-interval"
                                name="updateInterval"
                                defaultValue={Time.fromSeconds(this.props.config.updateInterval).toString()}
                                label="Update interval"
                                placeholder="Interval"
                                tooltip="Period of update state from Server."
                                onValue={this.onValue}
                                />
                            <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col"/>
                            <FormTimePickerField
                                className="mdl-list__item_horizontal"
                                id="live-time"
                                name="liveTime"
                                defaultValue={Time.fromSeconds(this.props.config.liveTime).toString()}
                                label="Notification Live time"
                                placeholder="Delay"
                                tooltip="Time of living a notification message."
                                onValue={this.onValue}
                                />
                        </ul>
                        <ul className="mdl-list mdl-grid">
                            <FormSelectField
                                className="mdl-list__item_horizontal mdl-cell--3-col"
                                id="mail-sound"
                                name="mailSound"
                                label="Mail Sound"
                                tooltip="Sound of mail notifications."
                                values={sounds}
                                defaultKey={this.props.config.mailSound}
                                onValue={this.onValue}
                                />
                            <FormEmptyField className="mdl-list__item_horizontal mdl-cell--3-col"/>
                            <FormSelectField
                                className="mdl-list__item_horizontal mdl-cell--3-col"
                                id="appointment-sound"
                                name="appointmentSound"
                                label="Appointment Sound"
                                tooltip="Sound of appointment notifications."
                                values={sounds}
                                defaultKey={this.props.config.appointmentSound}
                                onValue={this.onValue}
                            />
                        </ul>
                        <ul className="mdl-list mdl-grid">
                            <FormRangeField
                                className="mdl-list__item_horizontal mdl-cell--6-col"
                                id="volume"
                                name="volume"
                                label="Sound Volume"
                                min="0"
                                max="1"
                                step="0.01"
                                defaultValue={this.props.config.volume}
                                tooltip="Volume of the notifications sounds."
                                onValue={this.onValue}
                            />
                        </ul>
                        <ul className="mdl-list mdl-grid">
                            <FormSelectField
                                className="mdl-list__item_horizontal mdl-cell--6-col"
                                id="notify-close-behavior"
                                name="notifyCloseBehavior"
                                label="Notification close behavior"
                                tooltip="How notifications should be closed? Automatically or only by user action."
                                values={{
                                "Automatically": "automatically",
                                "Manually": "manually"
                                }}
                                defaultKey={this.props.config.notifyCloseBehavior}
                                onValue={this.onValue}
                                />
                        </ul>
                    </form>
                </div>
            )
        }
    });
    _.taskPush(global, 'settings-load', complete => {
        ExtensionAPI.getConfig().then( config => {
            ReactDOM.render(<CommonSettingsForm config = {config} />, document.getElementById('general'), complete);
        });
    });
})(window);
