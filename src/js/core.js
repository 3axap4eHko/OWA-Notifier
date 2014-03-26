(function () {
    Object.defineProperty(Object.prototype, 'toArray', {
        value: function () {
            return Array.prototype.slice.apply(this, [0]);
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
    Object.defineProperty(Function, 'self', {
        value: function (value) {
            return value;
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