(function() {

    var global = this,
        _ = {};
    if (!global.Map) {
        function Map(){
            var mapValues = [],
                mapKeys = [];
            this.get = function(key) {
                var idx = mapKeys.indexOf(key);
                return mapValues[idx];
            };
            this.set = function(key, value) {
                var idx = mapKeys.indexOf(key);
                if (idx==-1) {
                    idx = mapKeys.push(key) - 1;
                }
                mapValues[idx] = value;
            };
            this.has = function (key) {
                return !!~mapKeys.indexOf(key);
            };
            this.remove = function (key) {
                var idx = mapKeys.indexOf(key);
                if (idx!=-1) {
                    mapKeys.splice(idx,1);
                    mapValues.splice(idx,1);
                }
            };
            this.clear = function(){
                mapKeys = [];
                mapValues = [];
            }
        }
    }

    _.p = function() {
        var map = new Map();
        return function(context, data, remove) {
            if (arguments.length==2) {
                return map.set(context, data);
            } else if (arguments.length==1) {
                return map.get(context);
            } else if (arguments.length==3 && remove) {
                return map.remove(context);
            }
            throw new Error('_.p called with wrong count of arguments');
        };
    };
    _.create = function(constructor, args) {
        constructor = Function.prototype.bind.apply(constructor, [null].concat(args));
        return new constructor();
    };
    _.is = function (value, type) {
        return Object.prototype.toString.call(value).slice(8, -1) == type.name;
    };
    _.isArray = function(value) {
        return _.is(value, Array);
    };
    _.isNumber = function(value) {
        return _.is(value, Number);
    };
    _.isDate = function(value) {
        return _.is(value, Date);
    };
    _.isString = function(value) {
        return _.is(value, String);
    };
    _.isObject = function(value) {
        return _.is(value, Object);
    };
    _.isFunction = function(value) {
        return _.is(value, Function);
    };

    _.toArray = function(target) {
        return Array.prototype.slice.call(target);
    };
    _.toInt = function(value, defaultValue) {
        return isFinite(value = parseInt(value)) ? value : parseInt(defaultValue || 0);
    };
    _.toFloat = function(value, defaultValue) {
        return isFinite(value = parseFloat(value)) ? value : parseFloat(defaultValue || 0);
    };

    _.areEquals = function (x, y) {
        'use strict';
        if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
        // after this just checking type of one would be enough
        if (x.constructor !== y.constructor) { return false; }
        // if they are functions, they should exactly refer to same one (because of closures)
        if (x instanceof Function) { return x === y; }
        // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
        if (x instanceof RegExp) { return x === y; }
        if (x === y || x.valueOf() === y.valueOf()) { return true; }
        if (Array.isArray(x) && x.length !== y.length) { return false; }

        // if they are dates, they must had equal valueOf
        if (x instanceof Date) { return false; }

        // if they are strictly equal, they both need to be object at least
        if (!(x instanceof Object)) { return false; }
        if (!(y instanceof Object)) { return false; }

        // recursive object equality check
        var p = Object.keys(x);
        return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
            p.every(function (i) { return Object.areEquals(x[i], y[i]); });
    };

    _.each = function (target, callback) {
        var keys = Object.keys(target);
        if (_.isArray(target)) {
            keys = keys.map(_.toInt);
        }
        keys.forEach(function(name) {
            target[name] = callback(target[name], name);
        });
    };
    _.map = function (target, callback) {
        var keys = Object.keys(target);
        if (_.isArray(target)) {
            keys = keys.map(_.toInt);
        }
        keys.forEach(function(name) {
            target[name] = callback(target[name], name);
        });
    };
    _.extend = function(target) {
        var isArray = _.isArray(target),
            objects = Array.prototype.slice.call(arguments);
        objects.forEach(function(object) {
            var keys = Object.keys(object);
            if (isArray) {
                keys = keys.map(_.toInt);
            }
            keys.forEach(function(key) {
                target[key] = object[key];
            });
        });
        return target;
    };
    _.shuffle = function(array) {
        for (var j, x,o = array.slice(), i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };
    _.randomInt = function(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    };
    _.randomString = function(size) {
        var result = '';
        for (var i = 0; i < size; i++)
        {
            var char = _.randomInt(0,1) == 1 ? 65 : 97;
            result += String.fromCharCode(_.randomInt(char, char+25));
        }
        return result;
    };

    _.fnEmpty = function() {};
    _.fnTrue = function() { return true; };
    _.fnFalse = function() { return false; };
    _.fnArgs = function() { return _.toArray(arguments); };
    _.fnArg = function() { return arguments[0]; };
    _.fnLog = function() { return console.log(arguments); };

    var urlParse = /^(\w+):\/\/(.*?)\/(.*)$/;
    _.url = function(url) {
        var matches = url.match(urlParse);
        if (!matches) {
            return {};
        }
        return {
            schema: matches[1],
            host: matches[2],
            href: matches[3],
            hash: matches[3].split('#')[1],
            query: matches[3].split('?')[1]
        };
    };

    _.fmtString = function(str, args) {
        var result = str.toString();
        _.each(args, function(value, key){
            var regexp = new RegExp('\\{' + key + '\\}', 'g');
            result = result.replace(regexp, value);
        });
        return result;
    };
    _.fmtNumber = function(num, iSize, forceSign) {
        iSize = _.toInt(iSize || 0);
        var isNegative = num < 0,
            s = Math.abs(num) + "";
        while (s.length < iSize) s = "0" + s;
        if (isNegative) {
            s = "-" + s;
        } else if (forceSign && num >0) {
            s = "+" + s;
        }
        return s;
    };

    var dateFilters = {
        'y': function() {
            return this.getFullYear().toString().substr(-2);
        },
        'Y': function() {
            return this.getFullYear();
        },
        'm': function() {
            return _.fmtNumber(this.getMonth() + 1, 2);
        },
        'd': function() {
            return _.fmtNumber(this.getDate(), 2);
        },
        'h': function() {
            return this.getHours();
        },
        'H': function() {
            return _.fmtNumber(this.getHours(), 2);
        },
        'i': function() {
            return _.fmtNumber(this.getMinutes(), 2);
        },
        's': function() {
            return _.fmtNumber(this.getSeconds(), 2);
        },
        'u': function() {
            return this.getMilliseconds();
        },
        'z': function() {
            return this.getTimezoneOffset();
        },
        'Z': function() {
            var diff = this.getTimezoneOffset() / 60;
            if (!this.getTimezoneOffset()) {
                return 'Z';
            }
            return _.fmtNumber(diff|0, 2, true) + ":" + _.fmtNumber(Math.abs(diff) % 1 * 60, 2);
        }
    };
    _.fmtDate = function(date, format) {
        return _.toArray(format).map(function(sign) {
            if (dateFilters.hasOwnProperty(sign)) {
                sign = dateFilters[sign].call(date)
            }
            return sign;
        }).join('');
    };
    _.dateFromSeconds = function(){

    };
    _.dateAddYears = function(date, years) {
        date = new Date(date);
        date.setFullYear(date.getFullYear() + years);
        return date;
    };
    _.dateAddMonths = function(date, months) {
        date = new Date(date);
        date.setMonth(date.getMonth() + months);
        return date;
    };
    _.dateAddDays = function(date, days) {
        date = new Date(date);
        date.setDate(date.getDate() + days);
        return date;
    };
    _.dateAddHours = function(date, hours) {
        date = new Date(date);
        date.setHours(date.getHours() + hours);
        return date;
    };
    _.dateAddMinutes = function(date, minutes) {
        date = new Date(date);
        date.setMinutes(date.getMinutes() + minutes);
        return date;
    };
    _.dateAddSeconds = function(date, seconds) {
        date = new Date(date);
        date.setSeconds(date.getSeconds() + seconds);
        return date;
    };
    _.toXsdDate = function (value) {
        return _.fmtDate(new Date(value), 'Y-m-dTH:i:sZ');
    };

    global._ = _;
    global.Filters = {
        toXsdDate: function (value) {
            return _.toXsdDate(value);
        },
        toDate: function (value) {
            return new Date(value);
        },
        toInt: function(value) {
            return _.toInt(value);
        },
        toFloat: function(value) {
            return _.toFloat(value);
        },
        unserialize: function(value) {
            return JSON.parse(value);
        },
        serialize: function(value) {
            return JSON.stringify(value);
        },
        toString: function(value, format) {
            if (_.is(value, Date)) {
                _.fmtDate(value, format);
            }
            return value.toString();
        }
    };
    Date.begin = function(){
        var d = new Date();
        d.setTime(0);
        return d;
    };
    Date.end = function(){
        var d = new Date();
        d.setTime(0);
        return d;
    };
    function Time(hours, minutes, seconds){
        var self = this;

        this.hours = _.toInt(hours);
        this.minutes = _.toInt(minutes);
        this.seconds = _.toInt(seconds);

        this.getTotalSeconds = function(){
            return _.toInt(self.seconds) + 60*_.toInt(self.minutes) + 3600*_.toInt(self.hours);
        };
        this.toString = function(){
            return _.fmtNumber(self.hours,2) + ':' + _.fmtNumber(self.minutes,2) + ':' + _.fmtNumber(self.seconds,2);
        }
    }
    Time.fromString = function(string){
        return _.create(Time,string.split(':'));
    };
    Time.fromSeconds = function(seconds){
        var time = new Time();
        time.seconds = seconds % 60;
        time.minutes = _.toInt(( seconds - time.seconds ) % 3600 / 60);
        time.hours = _.toInt(seconds / 3600);
        return time;
    };
    global.Time = Time;

}.call(this.global || this.window || global || window));