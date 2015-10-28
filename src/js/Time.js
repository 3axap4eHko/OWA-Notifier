'use strict';

class Time {
    constructor(hours, minutes, seconds){
        this.hours = _.toInt(hours);
        this.minutes = _.toInt(minutes);
        this.seconds = _.toInt(seconds);
    }
    getTotalSeconds(){
        return _.toInt(this.seconds) + 60*_.toInt(this.minutes) + 3600*_.toInt(this.hours);
    };
    toString(){
        return _.fmtNumber(this.hours,2) + ':' + _.fmtNumber(this.minutes,2) + ':' + _.fmtNumber(this.seconds,2);
    }
}

Time.fromString = function(string){
    return _.create(Time, string.split(':'));
};
Time.fromSeconds = function(seconds){
    var time = new Time();
    time.seconds = seconds % 60;
    time.minutes = _.toInt(( seconds - time.seconds ) % 3600 / 60);
    time.hours = _.toInt(seconds / 3600);
    return time;
};
