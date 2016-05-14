/*! Yin and Yang Core Framework v0.3.7 | Copyright (c) 2015-2016 Ivan (3axap4eHko) Zakharchenko*/
'use strict';
const isNode = typeof window !== 'object';

(function (global, undefined) {
    var _ = {
        DEBUG: 0,
        get isNode() {
            return isNode;
        }
    };

    /**
     * DEBUG
     */
    _.dbg = (...args) => {
        args.forEach(function (arg) {
            console.log(arg);
        });
        isNode && process.exit(0);
    };
    _.dmp = (value, txt) => {
        console.log(txt + ': ' + value);
        return value;
    };
    _.watch = callback => {
        var d = new Date();
        callback();
        return new Date().getTime() - d.getTime();
    };
    _.test =  (times, callback) => global.watch(() => { while(times--) callback(times); });

    /**
     * Private class storage factory
     * @returns {Function}
     */
    _.p = function () {
        var map = new WeakMap();
        return function (context, data, remove) {
            if (arguments.length === 2) {
                return map.set(context, data);
            } else if (arguments.length === 1) {
                return map.get(context);
            } else if (arguments.length === 3 && remove) {
                return map.remove(context);
            }
            throw new Error(`Private scope storage called with wrong count of arguments: ${arguments.length}`);
        };
    };
    const _p = _.p();
    
    function _getObjectValue(object, property, defaultValue) {
        defaultValue = defaultValue || {};
        if (!_p(object)) {
            _p(object,{});
        }
        var data = _p(object);
        if (!data.hasOwnProperty(property)) {
            data[property] = defaultValue;
        }
        return data[property];
    }

    /**
     * Validators
     */
    _.classOf           = value         => Object.prototype.toString.call(value).slice(8, -1);
    _.is                = (value, type) => _.classOf(value) == type.name;
    _.isArray           = value         => _.is(value, Array);
    _.isNumber          = value         => _.is(value, Number);
    _.isInteger         = value         => Number.isInteger(value);
    _.isFiniteNumber    = value         => _.isNumber(value) && isFinite(value);
    _.isDate            = value         => _.is(value, Date);
    _.isString          = value         => _.is(value, String);
    _.isNotEmptyString  = value         => _.isString(value) && value.length>0;
    _.isObject          = value         => _.is(value, Object);
    _.isFunction        = value         => _.is(value, Function);
    _.isBoolean         = value         => _.is(value, Boolean);
    _.isDefined         = value         => typeof value !== 'undefined';
    _.isNull            = value         => value === null;
    _.isValue           = value         => _.isDefined(value) && !_.isNull(value);
    _.isStructure       = value         => _.isObject(value) || _.isArray(value);
    _.isIterated        = value         => _.isObject(value) || _.isArray(value) || _.isString(value);
    _.isKeyValue        = value         => _.isObject(value) && value.hasOwnProperty('key') && value.hasOwnProperty('value');
    _.areEqual          = (x, y) => {
        if (x === null || x === undefined || y === null || y === undefined) {
            return x === y;
        }
        // after this just checking type of one would be enough
        if (x.constructor !== y.constructor) {
            return false;
        }
        // if they are functions, they should exactly refer to same one (because of closures)
        if (x instanceof Function) {
            return x === y;
        }
        // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current
        // ES)
        if (x instanceof RegExp) {
            return x === y;
        }
        if (x === y || x.valueOf() === y.valueOf()) {
            return true;
        }
        if (Array.isArray(x) && x.length !== y.length) {
            return false;
        }
        // if they are dates, they must had equal valueOf
        if (x instanceof Date) {
            return false;
        }
        // if they are strictly equal, they both need to be object at least
        if (!(x instanceof Object)) {
            return false;
        }
        if (!(y instanceof Object)) {
            return false;
        }
        // recursive object equality check
        var p = _.keys(x);
        return _.keys(y).every(i => p.indexOf(i) !== -1) && p.every( i => _.areEqual(x[i], y[i]));
    };
    
    /**
     * Filters
     */
    _.toInt             = value         => isFinite(value = parseInt(value)) ? value : 0;
    _.toIntOrDefault    = (value, def)  => isFinite(value = parseInt(value)) ? value : def || 0;
    _.toFloat           = value         => isFinite(value = parseFloat(value)) ? value : 0.0;
    _.toFloatOrDefault  = (value, def)  => isFinite(value = parseFloat(value)) ? value : def || 0.0;
    _.toArray           = Array.from;
    _.toArrayOf         = Array.of;
    _.toKeyValue        = (key, value)  => ({key: key, value: value});
    _.toKeyValueOf      = (target, key) => ({key: key, value: target[key]});
    _.toString          = value         => _.isValue(value) ? value.toString() : '';
    _.toJsonString      = value         => JSON.stringify(value);
    _.toJsonObject      = value         => JSON.parse(value);
    _.toCharCodes       = value         => _.toArray(value.toString()).map(c => c.charCodeAt(0) );
    _.toHex             = value         => (_.isNumber(value) ? [value] : _.toCharCodes(value)).map( value => value.toString(16)).join('');
    _.toHexArray        = value         => _.toArray(value).map(_.toHex);
    _.toHexFormat       = value         => _.toHexArray(value).map( (hex, idx) => hex + (++idx % 8 ? '' : '\n') ).join(' ');
    _.toNibbles         = value         => _.toHex(value).split('');
    _.to4Bit            = value         => ('000' + parseInt(value).toString(2)).slice(-4);
    _.to4BitFromHex     = value         => _.to4Bit(parseInt(value, 16));
    _.to8Bit            = value         => ('0000000' + parseInt(value).toString(2)).slice(-8);
    _.to8BitFromHex     = value         => _.to8Bit(parseInt(value, 16));

    function charRange(from, to) {
        var start = from.charCodeAt(0);
        var finish = to.charCodeAt(0);
        return new Array(finish - start + 1).fill(start).map( (v, idx) => String.fromCharCode(v+idx));
    }

    const baseAlphabet  = charRange('0','9').concat( charRange('A','Z'), charRange('a','z'), ['!', '#', '$', '%', '&', '(', ')', '*', '+', '-', ';', '<', '=', '>', '?', '@', '^', '_', '`', '{', '|', '}', '~']);

    _.toBase = (value, base, alphabet) => {
        alphabet = alphabet || baseAlphabet;
        base = _.toInt(base);
        value = _.toHex(value);
        const groupSize = Math.ceil(Math.log2(base));
        const bits = value.split('').map(_.to4BitFromHex).join('').split('');
        return _.groupOf(bits, groupSize)
            .map( bits => parseInt(bits.join(''), 2))
            .map( idx => alphabet[idx % base] );
    };
    const urlParseExpr = /^(\w+):\/\/(.*?)\/(.*)$/;
    _.urlParse =  url => {
        var matches = url.match(urlParseExpr);
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

    /**
     * Reflections
     */
    /**
     *
     * @param {Function} callback
     * @param {Array} args
     */
    _.apply = (callback, args) => callback(...args);
    /**
     *
     * @param {Function} callback
     * @param {...*} [args]
     */
    _.call = (callback, ...args) => callback(args);
    /**
     *
     * @param {Function} callback
     * @param {...*} [curryArgs]
     */
    _.curry = (callback, ...curryArgs) => (...args) => callback(...curryArgs, ...args);
    /**
     *
     * @param {Function} callback
     * @param {...*} [curryArgs]
     */
    _.curryRight = (callback, ...curryArgs) => (...args) => callback(...args, ...curryArgs);

    /**
     * Instantiate class by constructor and arguments
     * @param {Function} Constructor
     * @param {Array} args
     * @returns {Object}
     */
    _.create = (Constructor, args) => {
        Constructor = Function.prototype.bind.apply(Constructor, [null].concat(args));
        return new Constructor();
    };
    /**
     * Returns class factory
     * @param {Function} Constructor
     * @returns {Function}
     */
    _.factory = (Constructor) => (...args) => _.create(Constructor, args);
    /**
     * Define value in object
     */
    _.defineValue = (object, property, value) => Object.defineProperty(object, property, {
        writable: true,
        enumerable: false,
        configurable: false,
        value: value
    });
    /**
     * Define getter in object
     */
    _.defineGetter = (object, property, getter) => Object.defineProperty(object, property, {
        enumerable: false,
        configurable: false,
        get: getter
    });
    /**
     * Define setter in object
     */
    _.defineSetter = (object, property, setter) => Object.defineProperty(object, property, {
        enumerable: false,
        configurable: false,
        set: setter
    });
    /**
     * Define getter and setter in object
     */
    _.defineGetterSetter = (object, property, getter, setter) => Object.defineProperty(object, property, {
        enumerable: false,
        configurable: false,
        get: getter,
        set: setter
    });
    
    /**
     * Create an array with defined length filled by values
     * @param {Number} length
     * @param {*} value
     */
    _.range = (length, value) => new Array(length).fill(value);
    /**
     * Returns an array of the keys of a given target
     * @param {Object|Array|String|Number} target
     * @static
     * @returns {Array|Iterator.<number|string>}
     */
    _.keys = target => _.isFiniteNumber(target) ? _.range(target, 0) : (_.isObject(target) ? Object.keys(target) : Object.keys(target).map(_.toInt));
    /**
     * Returns an array of the values of a given target
     * @param {Object|Array|String} target
     * @static
     * @returns {Array|Iterator.<*>}
     */
    _.values = target => Object.keys(target).map( key => target[key]);
    /**
     * Returns an array of the key-value pairs of a given target
     * @param {Object|Array|String|Number} target
     * @static
     * @returns {Array.<{key: number|string, value: *}>}
     */
    _.pairs = target => _.keys(target).map( key => _.toKeyValueOf(target, key) );
    /**
     * Iterate each enumerable property in target
     *
     * @param {Object|Array|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     */
    _.each = (target, callback) => _.keys(target).forEach( key => callback(target[key], key, target));
    /**
     * Iterate each enumerable property in target and return true if no one callback return false
     *
     * @param {Object|Array|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     * @returns {Boolean}
     */
    _.every = (target, callback)=> _.keys(target).every( key => callback(target[key], key, target));
    /**
     * Iterate enumerable property in target and return true if any callback return true
     * @param {Object|Array|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     * @returns {Boolean}
     */
    _.any = _.some = (target, callback) => _.keys(target).some( key => callback(target[key], key, target));
    
    function _merge(target, source, skipStack) {
        Object.keys(source).forEach( key => {
            if (_.isStructure(target[key]) && _.isStructure(source[key])) {
                _merge(target[key], source[key], skipStack);
            } else {
                target[key] = source[key];
            }
        } );
        return target;
    }

    /**
     * Merge a few sources properties to the target
     * @param {Object|Array} target
     * @param {...Object|...Array} [args]
     * @returns {Object|Array}
     */
    _.merge = (target, ...args) => {
        if (!_.isValue(target)) {
            throw new TypeError('Cannot convert target to object');
        }
        args.filter(_.isStructure).forEach( source => _merge(target, source, new WeakMap()));

        return target;
    };
    /**
     * Clone target
     * @param {Object|Array} target
     * @returns {Object|Array}
     */
    _.clone = target => {
        if (_.isStructure(target)) {
            return _merge(_.isArray(target) ? [] : {}, target, []);
        }
        return target;
    };
    /**
     * Freeze target
     * @param {Object|Array} target
     * @param {Object} [args]
     * @returns {Object|Array}
     */
    _.freeze = (target, ...args) => {
        return Object.freeze(Object.assign(target, ...args));
    };

    /**
     * Iterators
     */
    /**
     * Call {callback} function {times} times
     * @param {Number} times
     * @param {function(Number=, Number=)} callback
     */
    _.repeat = (times, callback) => {
        var iteration = 0;
        while (iteration<times) callback(iteration++, times);
    };
    /**
     * Call {callback} function {times} times and follow result to {handler}
     * @param {Number} times
     * @param {function(Number=, Number=)} callback
     * @param {function(*=)} handler
     */
    _.repeatHandled = (times, callback, handler) => {
        var iteration = 0;
        while (iteration<times) handler(callback(iteration++, times));
    };

    /**
     * @param {Object|Array|String} target
     * @param {function(*=, Number=, Object|Array|String=)} callback
     * @returns {Object|Array|String}
     */
    _.map = (target, callback) => {
        if (_.isObject(target)) {
            return _.keys(target).reduce( (mapped, key) => (mapped[key] = callback(target[key], key, target), mapped), {});
        }
        if (_.isString(target)) {
            return _.toArray(target).map(callback).join('');
        }
        return _.toArray(target).map(callback);
    };
    /**
     * @param {Object|Array|String} target
     * @param {function(*=, *=, Number|String=, Object|Array|String=)} callback
     * @param {*} [init]
     * @returns {*}
     */
    _.reduce = (target, callback, ...init) => {
        var keys = _.keys(target);
        var values = _.values(target);
        init.unshift((cur, next, idx) => callback(cur, next, keys[idx], target));
        return values.reduce(...init);
    };
    /**
     * @param {Object|Array|String} target
     * @param {Number} size
     * @returns {Array}
     */
    _.groupOf = (target, size) => {
        const pairs = _.pairs(target);
        const pairsMaxIndex = pairs.length - 1;
        var grouped = pairs.reduceRight( (groups, pair, idx) => {
            if( (pairsMaxIndex - idx) % size) {
                groups[0].unshift(pair);
            } else {
                groups.unshift([pair]);
            }
            return groups;
        },[]);
        if (_.isObject(target)) {
            return grouped.map(group => group.reduce( (group, pair) => (group[pair.key]=pair.value,group), {}));
        }
        grouped = grouped.map(group => group.map( pair => pair.value));
        if (_.isString(target)) {
            grouped = grouped.map( group => group.join(''));
        }
        return grouped;
    };
    /**
     * @param {Object|Array|String} target
     * @param {function(*=, Number|String=, Object|Array|String=)} callback
     * @returns {Object|Array|String}
     */
    _.filter = (target, callback) => {
        var filtered = _.keys(target).reduce( (filtered, key) => {
            if (callback(target[key], key, target)) {
                filtered[key] = target[key];
            }
            return filtered;
        }, _.isObject(target) ? {} : [] );
        if (_.isString(filtered)) {
            filtered = filtered.join('');
        }
        return filtered;
    };

    /**
     * Returns first key-value pair from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     * @param {String|Number|{key, value}} [defaultKey]
     * @returns {{key, value}}
     */
    _.first = (target, callback, defaultKey) => {
        var firstKey = _.keys(target).find( key => callback(target[key], key, target));
        if (!_.isDefined(firstKey)) {
            firstKey = defaultKey;
        }
        return _.toKeyValueOf(target, firstKey);
    };
    /**
     * Returns last key-value pair from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     * @param {String|Number} [defaultKey]
     * @returns {{key, value}}
     */
    _.last = (target, callback, defaultKey) => {
        var last = _.keys(target).reduce((lastKey, key) => {
            if (callback(target[key], key, target)) {
                lastKey = key;
            }
            return lastKey;
        }, defaultKey);
        if (_.isKeyValue(last)) {
            return last;
        }
        return _.toKeyValueOf(target, last);
    };
    /**
     * Returns last key-value pair from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, *=, String|Number=, Array|Object|String=)} callback
     * @returns {{key: *, value: *}}
     */
    _.lastReduce = (target, callback) => {
        var keys = _.keys(target);
        var key = keys.reduce((curKey, nextKey) => callback(target[curKey], target[nextKey], nextKey, target) ? nextKey : curKey );
        return _.toKeyValueOf(target, key);
    };

    /**
     * Returns first key-value pair and remove it from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array|Object|String=)} callback
     * @returns {{key, value}}
     */
    _.take = (target, callback) => {
        var pair = _.first(target, callback);
        if (_.isObject(target)) {
            delete target[pair.key];
        } else if (_.isArray(target)) {
            target.splice(pair.key, 1);
        }
        return pair;
    };
    
    /**
     * Returns first key-value pair and remove it from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, *=, String|Number=, Array|Object|String=)} callback
     * @returns {{key, value}}
     */
    _.takeReduce = (target, callback) => {
        var keys = _.keys(target);
        var key = keys.reduce( (curKey, nextKey) => {
            var curValue = target[curKey];
            var nextValue = target[nextKey];
            if (callback(curValue, nextValue, curKey, target) === nextValue) {
                return nextKey;
            }
            return curKey;
        });
        var pair = _.toKeyValueOf(target, key);
        if (_.isArray(target)) {
            target.splice(pair.key, 1);
        } else {
            delete target[pair.key];
        }
        return pair;
    };

    /**
     * Sum all values of the target
     * @param {String|Array|Object} target
     * @returns {Number|String}
     */
    _.sum = target => _.values(target).reduce( (sum, value) => sum + value, _.isString(target) ? '' : 0);
    /**
     * Returns a maximum of given target
     * @param {String|Array|Object} target
     * @returns {{key, value}}
     */
    _.max = target => _.toKeyValueOf(target, _.keys(target).reduce( (maxKey, nextKey) => target[maxKey] >= target[nextKey] ? maxKey : nextKey));
    /**
     * Returns a minimum of given target
     * @param {String|Array|Object} target
     * @returns {{key, value}}
     */
    _.min = target => _.toKeyValueOf(target, _.keys(target).reduce( (minKey, nextKey) => target[minKey] <= target[nextKey] ? minKey : nextKey));
    /**
     * Counts of values
     * @param {String|Array|Object} target
     * @param {Function} callback
     * @returns {Number}
     */
    _.countOf = (target, callback) => _.keys(target).reduce( (count, key) => callback(target[key], key, target) ? count + 1 : count, 0);
    
    /**
     * Randomize
     */
    /**
     * Return random int value. If arguments not defined then return float value between 0 and 1
     * @param {Number} [min]
     * @param {Number} [max]
     * @returns {Number}
     */
    _.random = (min, max) => {
        if (min === undefined) {
            return Math.random();
        } else if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };
    /**
     * Return random boolean value
     * @returns {Boolean}
     */
    _.randomBool = () => Math.random() > 0.5;
    /**
     * Return random string [a-zA-Z] with defined size
     * @param {Number} size
     */
    _.randomString = (size) => _.range(size,'').map( c => String.fromCharCode(_.random(c = _.randomBool() ? 65 : 97, c + 25)) ).join('');
    /**
     * Return index of defined probability value argument
     * @param {...Number} probabilityData probability value
     * @returns {Number}
     */
    _.randomCase = (...probabilityData) => {
        var select = _.random(100),
            lost = 0;
        return _.first(probabilityData, value =>  {
            if (select < lost + value) {
                return true;
            }
            lost += value;
        }, probabilityData.length - 1).key;
    };

    function _s4() {
        return Math.floor(0x1000 +Math.random() * 0x0FFF).toString(16)
    }
    function _s12() {
        return ('0000' + Date.now().toString('16')).slice(-12);
    }
    /**
     * GUID string generator
     * @returns {String}
     */
    _.randomGUID = () => _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s12();

    /**
     * Shuffle all values of the target
     * @param {Array|Object|String} target
     * @returns {Array}
     */
    _.shuffle = function (target) {
        var values = _.values(target),
            result = [];
        while (values.length) {
            result.push(values.splice(_.random(values.length), 1)[0]);
        }
        return result;
    };
    /**
     * Functions
     */
    _.fnArgsCallFn      = callback => (...args) => callback(args);
    _.fnArgsApplyFn     = callback => (args)    => callback(...args);
    _.fnArgsValue       = (value, callback)     => (callback(value), value);
    _.fnEmpty           = ()                    => {};
    _.fnTrue            = ()                    => true;
    _.fnFalse           = ()                    => false;
    _.fnArgs            = (...args)             => args;
    _.fnArg             = arg                   => arg;
    _.fnCallback        = callback              => value => callback(value);
    _.fnLog             = (...args)             => console.log(...args);
    _.fnPromise         = callback              => new Promise(callback);
    _.fnPromises        = (...callbacks)        => Promise.all(callbacks.map(_.fnPromise));
    /**
     * Strings
     */
    _.stringToUpperCaseFirst    = str           => str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
    _.stringToPascalCase        = (str, join)   => str.split(/[\s\-_\.,]+/g).map(_.stringToUpperCaseFirst).join(join || '');
    _.stringToCamelCase         = str           => (str = _.stringToPascalCase(str)).charAt(0).toLowerCase() + str.substr(1);
    _.stringToCapitalize        = str           => str.toUpperCase();
    _.stringOccurrence          = (str, search) => (str.match(new RegExp(search,'g')) || []).length;

    _.stringPadLeft             = (str, size, char) =>  new Array(size).fill(char || ' ').join('').concat(str).slice(-size);
    _.stringPadRight            = (str, size, char) =>  str.concat(new Array(size).fill(char || ' ').join('')).slice(0, size);
    /**
     * Formatting
     */
    _.fmtString = (str, ...args) => {
        var result = str.toString();
        if (args.length == 1 && _.isStructure(args[0])) {
            args = args[0];
        }
        _.each(args, (value, key) => {
            var regexp = new RegExp('\\{' + key + '\\}', 'g');
            result = result.replace(regexp, value);
        });
        return result;
    };
    const zeros = '000000000000000';
    _.fmtNumber = (num, intSize, forceSign) => {
        num = _.toInt(num);
        intSize = _.toInt(intSize);
        var str = Math.abs(num) + '',
            strSize = str.length;
        str = strSize < intSize ? (zeros + str).slice(-intSize) : str;
        if (num < 0) {
            str = '-' + str;
        } else if (forceSign && num >0) {
            str = '+' + str;
        }
        return str;
    };

    const dateFilters = {
        'Y': date => date.getFullYear(),
        'y': date => date.getFullYear() % 100,
        'M': date => _.fmtNumber(date.getMonth() + 1, 2),
        'D': date => _.fmtNumber(date.getDate(), 2),
        'W': date => _.fmtNumber(date.getDay(), 2),
        'h': date => _.fmtNumber(date.getHours(), 2),
        'm': date => _.fmtNumber(date.getMinutes(), 2),
        's': date => _.fmtNumber(date.getSeconds(), 2),
        'u': date => date.getMilliseconds(),
        'z': date => date.getTimezoneOffset(),
        'Z': date => {
            var diff = date.getTimezoneOffset() / 60;
            if (!diff) {
                return 'Z';
            }
            return _.fmtNumber(diff|0, 2, true) + ':' + _.fmtNumber(Math.abs(diff) % 1 * 60, 2);
        }
    };
    _.fmtDate = function (date, format) {
        return _.toArray(format).map( token => dateFilters[token] ? dateFilters[token](date) : token).join('');
    };

    _.fmtDate.DATE_W3C      = 'Y-M-DTh:m:sZ:00';
    _.fmtDate.DATE_XSD      = 'Y-M-DTh:m:sZ';

    _.dateAddYears  = (date, years)     => _.fnArgsValue(new Date(date), date => date.setFullYear(date.getFullYear() + years));
    _.dateAddMonths = (date, months)    => _.fnArgsValue(new Date(date), date => date.setMonth(date.getMonth() + months));
    _.dateAddDays   = (date, days)      => _.fnArgsValue(new Date(date), date => date.setDate(date.getDate() + days));
    _.dateAddHours  = (date, hours)     => _.fnArgsValue(new Date(date), date => date.setHours(date.getHours() + hours));
    _.dateAddMinutes= (date, minutes)   => _.fnArgsValue(new Date(date), date => date.setMinutes(date.getMinutes() + minutes));
    _.dateAddSeconds= (date, seconds)   => _.fnArgsValue(new Date(date), date => date.setSeconds(date.getSeconds() + seconds));
    
    _.dateToXsd = date => _.fmtDate(date, _.fmtDate.DATE_XSD);

    Date.begin = function () {
        var d = Date.now;
        d.setTime(0);
        return d;
    };
    /**
     * Math
     */
    _.mathSqrDiff = (a, b) => (a-=b) * a;
    _.mathSqrtSum = (...values) => Math.pow(_.sum(values), 0.5);
    _.mathDistanceEuclidean = (...coordinates) => {
        var length = _.toInt(coordinates.length / 2);
        var sqrDiffs = _.range(length, 0).map((v, id) => _.mathSqrDiff(coordinates[id], coordinates[id+length]) );
        return _.mathSqrtSum(...sqrDiffs);
    };
    _.mathDistanceManhattan = (...coordinates) => {
        var length = _.toInt(coordinates.length / 2);
        var diffs = _.range(length, 0).map((v, id) => Math.abs(coordinates[id] - coordinates[id+length]) );
        return _.sum(diffs);
    };
    _.mathDistanceDiagonal = (...coordinates) => {
        var length = _.toInt(coordinates.length / 2);
        var diffs = _.range(length, 0).map((v, id) => Math.abs(coordinates[id] - coordinates[id+length]) );
        return Math.max(...diffs);
    };
    _.mathPointId = (x, y, width) => y * width + x;
    _.mathTransPoint = (x, y, toAngle, toDistance) => {
        return { 
            x: x + Math.cos(toAngle) * toDistance, 
            y: y + Math.sin(toAngle) * toDistance 
        };
    };
    
    /**
     * Path finder
     */
    const directions = [
        {x:  1, y:  0},
        {x:  0, y:  1},
        {x: -1, y:  0},
        {x:  0, y: -1},
        {x:  1, y:  1},
        {x: -1, y:  1},
        {x: -1, y: -1},
        {x:  1, y: -1}
    ];

    _.pathfinderAStar = (startPoint, finishPoint, width, height, weightCallback, heuristicCallback, maxIterationCount, onWhiteList) => {
        heuristicCallback = heuristicCallback || function(x, y) {
            return _.mathDistanceManhattan(x - finishPoint.x, y - finishPoint.y)*distance;
        };
        maxIterationCount = maxIterationCount || width*height;
        var iteration = 1,
            distance = _.mathDistanceManhattan(startPoint.x - finishPoint.x, startPoint.y - finishPoint.y) + 1,
            currentPoint,
            visitedList = {},
            blackList = {},
            whiteList = {},
            getPoint = function (id, x, y, pid, pg, pm) {
                var w = weightCallback(x, y),
                    h = heuristicCallback(x, y),
                    g = w + pg,
                    m = pm + 1;
                return {
                    id: id || _.mathPointId(x, y),
                    x: x,
                    y: y,
                    p: pid,
                    w: w,
                    h: h,
                    g: g,
                    m: m,
                    f: h + g
                };
            },
            whiteListReduce = function(point1, point2){
                return point1.f <= point2.f ? point1 : point2;
            },
            addToWhiteList = function (newPoint) {
                iteration++;
                visitedList[newPoint.id] = whiteList[newPoint.id] = newPoint;
                onWhiteList && onWhiteList(newPoint.x, newPoint.y);
            },
            directionToPoint = function(dir) {
                return getPoint(0, currentPoint.x + dir.x, currentPoint.y + dir.y, currentPoint.id, currentPoint.g, currentPoint.m);
            },
            excludeAlreadyHaven = function(newPoint) {
                return newPoint.x>=0 && newPoint.x<width && newPoint.y>=0 && newPoint.y<height && newPoint.w != Number.MAX_VALUE && !visitedList[newPoint.id];
            },
            result = [];
            
        startPoint = getPoint(_.mathPointId(startPoint.x, startPoint.y), startPoint.x, startPoint.y,-1,0,0);
        finishPoint = getPoint(_.mathPointId(finishPoint.x, finishPoint.y), finishPoint.x, finishPoint.y,-1,0,0);
        visitedList[startPoint.id] = whiteList[startPoint.id] = startPoint;
        
        while (iteration++<maxIterationCount && Object.keys(whiteList).length && (currentPoint = _.takeReduce(whiteList, whiteListReduce).value).id != finishPoint.id) {
            blackList[currentPoint.id] = currentPoint;
            directions.map(directionToPoint).filter(excludeAlreadyHaven).forEach(addToWhiteList);
        }
        
        if (currentPoint.id == finishPoint.id) {
            do {
                result.unshift({
                    x: currentPoint.x,
                    y: currentPoint.y,
                    dx: finishPoint.x - currentPoint.x,
                    dy: finishPoint.y - currentPoint.y
                });
                finishPoint = currentPoint;
                currentPoint = blackList[currentPoint.p];

            }while(currentPoint.p!=-1);
        }
        return result;
    };

    /**
     * EVENTS
     */
    const EVENT_LISTENERS = 'eventListeners';
    _.eventOn = (object, event, callback) => {
        var listeners = _getObjectValue(object, EVENT_LISTENERS);
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push({callback: callback});
        return _;
    };
    _.eventOnce = (object, event, callback) => {
        var listeners = _getObjectValue(object, EVENT_LISTENERS);
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push({callback: callback, once: 1});
        return _;
    };
    _.eventUn = (object, event, ...callbacks) => {
        var listeners = _getObjectValue(object, EVENT_LISTENERS);
        if (listeners[event]) {
            if (callbacks.length) {
                callbacks.forEach( callback => {
                    var idx = listeners[event].indexOf(callback);
                    if (!~idx) {
                        listeners[event].splice(idx, 1);
                    }
                });
            } else {
                delete listeners[event];
            }
        }
        return _;
    };
    _.eventGo = (object, event, ...args) => {
        var listeners = _getObjectValue(object, EVENT_LISTENERS);
        if (listeners[event]) {
            listeners[event].slice().forEach((listener, idx) => {
                listener.callback(...args);
                if (listener.once) {
                    listeners[event].splice(idx, 1);
                }
            })
        }
        return _;
    };
    /**
     * POOL
     */
    /**
     *
     * @param {Array|Object|String} target
     * @param {Function} callback
     * @param {Number} [poolSize]
     * @returns {Promise}
     */
    _.pool = (target, callback, poolSize) => {
        return new Promise((resolve, reject) => {
            try {
                var data = _.values(target);
                if (data.length === 0) {
                    return resolve([]);
                }
                var results = [];
                const next = result => {
                    dataPool.pop();
                    results.push(result);
                    if (data.length > 0) {
                        dataPool.unshift(data.shift());
                        callback(dataPool[0], next);
                    } else if(dataPool.length == 0) {
                        resolve(results);
                    }
                };
                var dataPool = data.splice(0, poolSize || data.length);
                dataPool.forEach(value => callback(value, next));
            } catch (error) {
                reject(error);
            }
        });

    };

    /**
     * TASKS
     */
    const TASK_LIST = 'taskList';

    function _getTaskTypeList(context, type) {
        return _getObjectValue(context, TASK_LIST)[type] = _getObjectValue(context, TASK_LIST)[type] || []
    }

    /**
     * Push the task(s) into context
     * @param {Array|Object} context
     * @param {String} type
     * @param {...function(...args, next)|Array.<Function>} [tasks]
     * @returns _
     */
    _.taskPush = (context, type, ...tasks) => {
        if (tasks.length == 1 && _.isArray(tasks[0])) {
            tasks = tasks[0];
        }
        var taskList = _getTaskTypeList(context, type);
        taskList.push(...tasks);

        return _;
    };

    /**
     * Delete the task(s) from context
     * @param {Object} context
     * @param {String} type
     * @param {...function(...args, next)|Array.<Function>} [tasks]
     * @returns _
     */
    _.taskDelete = (context, type, ...tasks) => {
        if (tasks.length == 1 && _.isArray(tasks)) {
            tasks = tasks[0];
        }
        var taskList = _getTaskTypeList(context, type);
        tasks.forEach( (task, idx) => {
            if ( ~(idx = taskList.indexOf(task)) ) {
                taskList.splice(idx,1);
            }
        });
        return _;
    };
    /**
     * Clear all context tasks
     * @param {Object} context
     * @param {String} type
     * @returns _
     */
    _.taskClear = (context, type) => {
        var taskList = _getTaskTypeList(context, type);
        taskList.splice(0);
        return _;
    };

    /**
     *
     * @param {Object} context
     * @param {String} type
     * @param {Number} [size]
     * @param {...*} [args]
     * @returns {Promise}
     */
    _.taskWait = (context, type, size, ...args) => {
        return new Promise((resolve, reject) => {
            const taskList = _getTaskTypeList(context, type);
            const handler = (task, complete) => task(...args, complete);
            _.pool(taskList, handler, size)
                .then(resolve)
                .catch(reject);
        });
    };
    /**
     * HISTORY
     */
    const HISTORY_LIST = 'historyList';

    _.historyMaxSize = 100;

    _.historyDo = (context, data) => {
        const historyUndo = _getObjectValue(context, HISTORY_LIST)['undo'] = _getObjectValue(context, HISTORY_LIST)['undo'] || [];
        _getObjectValue(context, HISTORY_LIST)['redo'] = [];
        if (historyUndo.length > _.historyMaxSize) {
            historyUndo.shift();
        }
        historyUndo.push(data);
    };
    _.historyHasUndo = (context) => {
        return !!(_getObjectValue(context, HISTORY_LIST)['undo'] = _getObjectValue(context, HISTORY_LIST)['undo'] || []).length;
    };
    _.historyUndo = (context) => {
        const historyUndo = _getObjectValue(context, HISTORY_LIST)['undo'] = _getObjectValue(context, HISTORY_LIST)['undo'] || [];
        const historyRedo = _getObjectValue(context, HISTORY_LIST)['redo'] = _getObjectValue(context, HISTORY_LIST)['redo'] || [];
        const data = historyUndo.pop();
        if (data) {
            historyRedo.push(data);
        }
        return data;
    };
    _.historyHasRedo = (context) => {
        return !!(_getObjectValue(context, HISTORY_LIST)['redo'] = _getObjectValue(context, HISTORY_LIST)['redo'] || []).length;
    };
    _.historyRedo = (context) => {
        const historyUndo = _getObjectValue(context, HISTORY_LIST)['undo'] = _getObjectValue(context, HISTORY_LIST)['undo'] || [];
        const historyRedo = _getObjectValue(context, HISTORY_LIST)['redo'] = _getObjectValue(context, HISTORY_LIST)['redo'] || [];
        const data = historyRedo.pop();
        if (data) {
            historyUndo.push(data);
        }
        return data;
    };
    _.historyClear = (context) => {
        _getObjectValue(context, HISTORY_LIST)['undo'] = [];
        _getObjectValue(context, HISTORY_LIST)['redo'] = [];
    };

    if (typeof module === 'object') {
        module.exports = _;
    } else {
        global._ = _;
    }

}(isNode ? global : window));