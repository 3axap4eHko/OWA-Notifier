function Observer(onComplete, count) {
    var _count = count || 0;
    this.started = function() {
        _count++;
    };
    this.finished = function() {
        (--_count==0) && onComplete();
    };
    this.count = function() {
        return _count;
    }
}

(function () {

    var _defaultOptions = {
        writable : true,
        enumerable : false,
        configurable : false
    };

    var extend = function () {
        var self = this,
            objects = Array.prototype.slice.call(arguments);
        objects.forEach(function(object){
            Object.keys(object).forEach(function(key){
                if (object.hasOwnProperty(key)) {
                    self[key] = object[key];
                }
            });
            function __() { this.constructor = self; }
            __.prototype = object.prototype;
            self.prototype = new __();
        });

        return self;
    };

    var define = function (object, property, options) {
        options = extend({}, _defaultOptions, options);
        return Object.defineProperty(object, property, options);
    };

    define(Object.prototype, 'extend', {
        value: function (){
            return extend.apply({}, [this].concat(arguments.toArray()));
        }
    });

    define(Object.prototype, 'toArray', {
        value: function () {
            return Array.prototype.slice.apply(this, [0]);
        }
    });

    define(Object.prototype, 'toInt', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseInt(this.toString())) ? value : parseInt(defaultValue || 0);
        }
    });

    define(Object.prototype, 'toFloat', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseFloat(this.toString())) ? value : parseFloat(defaultValue || 0);
        }
    });

    define(Object.prototype, 'each', {
        value: function (callback) {
            Object.keys(this).forEach(function(name) {
                this[name] = callback(this[name], name);
            });
            return this;
        }
    });

    define(Object.prototype, 'is', {
        value: function (type) {
            return Object.prototype.toString.apply(this).slice(8,-1)==type;
        }
    });

    define(Function, 'empty', {
        value: function () {
        }
    });
    define(Function, 'true', {
        value: function () {
            return true;
        }
    });
    define(Function, 'false', {
        value: function () {
            return true;
        }
    });
    define(Function, 'args', {
        value: function (value) {
            return value;
        }
    });
    define(Function, 'log', {
        value: function () {
            console.log(arguments);
        }
    });

    define(String.prototype, 'fmt', {
        value: function () {
            var result = this.toString();
            arguments.toArray().forEach(function (value, idx) {
                result = result.replace('{' + idx + '}', value);
            });

            return result;
        }
    });

    define(Number.prototype, 'fmt', {
        value: function (iSize) {
            iSize = (iSize || 0).toInt();
            var isNegative = this < 0,
                s = Math.abs(this)+"";
            while (s.length < iSize) s = "0" + s;
            if (isNegative) {
                s = "-" + s;
            }
            return s;
        }
    });

    var dateFilters = {
        'y': function(){
            return this.getFullYear().toString().substr(-2);
        },
        'Y': function(){
            return this.getFullYear();
        },
        'm': function(){
            return (this.getMonth()+1).fmt(2);
        },
        'd': function(){
            return this.getDate().fmt(2);
        },
        'h': function(){
            return this.getHours();
        },
        'H': function(){
            return this.getHours().fmt(2);
        },
        'i': function(){
            return this.getMinutes().fmt(2);
        },
        's': function(){
            return this.getSeconds().fmt(2);
        },
        'u': function(){
            return this.getMilliseconds();
        },
        'z': function(){
            return this.getTimezoneOffset();
        },
        'Z': function(){
            var diff = this.getTimezoneOffset()/60;
            return (diff|0).fmt(2) + ":" + (diff%1*60).fmt(2);
        }
    };

    define(Date.prototype, 'fmt', {
        value: function (format) {
            var date = this;
            return format.toArray().map(function(sign){
                if (dateFilters.hasOwnProperty(sign))
                {
                    sign = dateFilters[sign].call(date)
                }
                return sign;
            }).join('');
        }
    });

    define(Date.prototype, 'addYears', {
        value: function (years) {
            var date = new Date(this);
            date.setFullYear(date.getFullYear() + years);
            return date;
        }
    });
    define(Date.prototype, 'addMonths', {
        value: function (months) {
            var date = new Date(this);
            date.setMonth(date.getMonth() + months);
            return date;
        }
    });
    define(Date.prototype, 'addDays', {
        value: function (days) {
            var date = new Date(this);
            date.setDate(date.getDate() + days);
            return date;
        }
    });
    define(Date.prototype, 'addHours', {
        value: function (hours) {
            var date = new Date(this);
            date.setHours(date.getHours() + hours);
            return date;
        }
    });
    define(Date.prototype, 'addMinutes', {
        value: function (minutes) {
            var date = new Date(this);
            date.setMinutes(date.getMinutes() + minutes);
            return date;
        }
    });
    define(Date.prototype, 'addSeconds', {
        value: function (seconds) {
            var date = new Date(this);
            date.setSeconds(date.getSeconds() + seconds);
            return date;
        }
    });


    window.Filter = {
        toInt: function (value) {
            return value.toInt();
        },
        toFloat: function (value) {
            return value.toFloat();
        },
        parse: function (value) {
            return JSON.parse(value).toString();
        },
        toJson: function (value) {
            return JSON.stringify(value);
        },
        toString: function (value) {
            return value.toString();
        }
    };

})();