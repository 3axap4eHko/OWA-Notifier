(function () {
    Object.defineProperty(Object.prototype, 'toArray', {
        value: function () {
            return Array.prototype.slice.apply(this, [0]);
        }
    });
    Object.defineProperty(Object.prototype, 'toInt', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseInt(this.toString())) ? value : parseInt(defaultValue);
        }
    });
    Object.defineProperty(Object.prototype, 'toFloat', {
        value: function (defaultValue) {
            var value;
            return isFinite(value = parseFloat(this.toString())) ? value : parseFloat(defaultValue);
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