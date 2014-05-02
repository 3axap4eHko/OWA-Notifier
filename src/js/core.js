(function () {
    Object.defineProperty(Object.prototype, 'toArray', {
        value: function () {
            return Array.prototype.slice.apply(this, [0]);
        }
    });
    Object.defineProperty(Object.prototype, 'toInt', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseInt(this.toString())) ? value : parseInt(defaultValue || 0);
        }
    });
    Object.defineProperty(Object.prototype, 'toFloat', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseFloat(this.toString())) ? value : parseFloat(defaultValue || 0);
        }
    });

    Object.defineProperty(Object.prototype, 'is', {
        value: function (type) {
            return Object.prototype.toString.apply(this).slice(8,-1)==type;
        }
    });

    Object.defineProperty(Function, 'empty', {
        value: function () {
        }
    });
    Object.defineProperty(Function, 'true', {
        value: function () {
            return true;
        }
    });
    Object.defineProperty(Function, 'false', {
        value: function () {
            return true;
        }
    });
    Object.defineProperty(Function, 'args', {
        value: function (value) {
            return value;
        }
    });
    Object.defineProperty(Function, 'log', {
        value: function () {
            console.log(arguments);
        }
    });

    Object.defineProperty(String.prototype, 'fmt', {
        value: function () {
            var result = this.toString();
            arguments.toArray().forEach(function (value, idx) {
                result = result.replace('{' + idx + '}', value);
            });

            return result;
        }
    });

    Object.defineProperty(Number.prototype, 'fmt', {
        value: function (iSize) {
            iSize = (iSize || 0).toInt();
            var s = this+"";
            while (s.length < iSize) s = "0" + s;
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
        }
    };

    Object.defineProperty(Date.prototype, 'fmt', {
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