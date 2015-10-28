'use strict';
(function () {
/*! Yin and Yang Core Framework v0.0.1 | Copyright (c) 2015 Ivan (3axap4eHko) Zakharchenko */
    var global = this,
        isNode = !!global.process && !!global.process.version,
        _ = {};
   
    global.dbg = function () {
        Array.from(arguments).forEach(function (arg) {
            console.log(arg);
        });
        isNode && process.exit(0);
    };
    global.dmp = function (value, txt) {
        console.log(txt + ': ' + value);
        return value;
    };
    global.watch = function (callback) {
        var d = new Date();
        callback();
        return new Date().getTime() - d.getTime();
    };
    global.test = function (times, callback) {
        return global.watch(() => {
            while(times--) callback(times);
        });
    };

    /**
     * Private class storage factory
     * @returns {Function}
     */
    _.p = function () {
        var map = new WeakMap();
        return function (context, data, remove) {
            if (arguments.length == 2) {
                return map.set(context, data);
            } else if (arguments.length == 1) {
                return map.get(context);
            } else if (arguments.length == 3 && remove) {
                return map.remove(context);
            }
            throw new Error('_.p called with wrong count of arguments');
        };
    };
    var _p = _.p();
    
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
    _.isFiniteNumber    = value         => _.isNumber(value) && isFinite(value);
    _.isDate            = value         => _.is(value, Date);
    _.isString          = value         => _.is(value, String);
    _.isNotEmptyString  = value         => _.isString(value) && value.length>0;
    _.isObject          = value         => _.is(value, Object);
    _.isFunction        = value         => _.is(value, Function);
    _.isDefined         = value         => typeof value !== 'undefined';
    _.isNull            = value         => value === null;
    _.isValue           = value         => _.isDefined(value) && !_.isNull(value);
    _.isStructure       = value         => _.isObject(value) || _.isArray(value);
    _.isIterated        = value         => _.isObject(value) || _.isArray(value) || _.isString(value);
    _.isKeyValue        = value         => _.isObject(value) && value.hasOwnProperty('key') && value.hasOwnProperty('value');
    _.areEqual = function (x, y) {
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
        // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
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
    _.toInt             = value => isFinite(value = parseInt(value)) ? value : 0;
    _.toIntOrDefault    = (value, def) => isFinite(value = parseInt(value)) ? value : def || 0;
    _.toFloat           = value => isFinite(value = parseFloat(value)) ? value : 0.0;
    _.toFloatOrDefault  = (value, def) => isFinite(value = parseFloat(value)) ? value : def || 0.0;
    _.toArray           = Array.from;
    _.toArrayOf         = Array.of;
    _.toKeyValue        = (key, value)  => ({key: key, value: value});
    _.toKeyValueOf      = (target, key) => ({key: key, value: target[key]});
    _.toString          = value => _.isValue(value) ? value.toString() : '';
    _.toJsonString      = value => JSON.stringify(value);
    _.toJsonObject      = value => JSON.parse(value);
    _.toCharCodes       = value => _.toArray(value.toString()).map(c => c.charCodeAt(0) );
    _.toHex             = value => (_.isNumber(value) ? value : _.toString(value).charCodeAt(0)).toString(16);
    _.toHexArray        = value => _.toArray(value).map(_.toHex);
    _.toHexFormat       = value => _.toHexArray(value).map( (hex, idx) => hex + (++idx % 8 ? '' : '\n') ).join(' ');

    const urlParse = /^(\w+):\/\/(.*?)\/(.*)$/;
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


    /**
     * Reflections
     */
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
    _.factory = (Constructor) => function () {
        return _.create(Constructor, _.toArray(arguments));
    };
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
     * Returns an array of the keys of a given target
     * @param {Object|Array|String} target
     * @static
     * @returns {Array|Iterator.<number|string>}
     */
    _.keys = target => _.isObject(target) ? Object.keys(target) : Object.keys(target).map(_.toInt);

    /**
     * Returns an array of the values of a given target
     * @param {Object|Array|String} target
     * @static
     * @returns {Array|Iterator.<*>}
     */
    _.values = target => _.keys(target).map( key => target[key]);
    /**
     * Returns an array of the key-value pairs of a given target
     * @param {Object|Array|String} target
     * @static
     * @returns {Array.<{key: number|string, value: *}>}
     */
    _.pairs = target => _.keys(target).map( key => _.toKeyValueOf(target, key) );
    /**
     * 
     */
    _.merge = function (target) {
        if (!_.isValue(target)) {
            throw new TypeError('Cannot convert target to object');
        }
        _.toArray(arguments).slice(1).forEach(function (source) {
            if (!_.isStructure(source)) {
                return;
            }
            if (_.isArray(target) && _.isArray(source)) {
                target = target.concat(source);
            } else _.keys(source).forEach(function (key) {
                if (_.isStructure(source[key]) && _.isStructure(target[key])) {
                    target[key] = _.merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            });
        });

        return target;
    };
    _.extend = function (target, parent) {
        target = _.merge(target, parent);
        function __() {
            this.constructor = target;
        }

        __.prototype = parent.prototype;
        target.prototype = new __();
        return target;
    };
    _.clone = function (target) {
        if (_.isStructure(target)) {
            return _.keys(target).reduce( (result, key) => (result[key] = _.clone(target[key]), result), _.isArray(target) ? [] : {});
        }
        return target;
    };
    /**
     * Create array with length filled by values
     * @param {Number} length
     * @param {*} value
     */
    _.range = (length, value) => new Array(length).fill(value);

    /**
     * Iterators
     */
    /**
     * Call {callback} function {times} times
     * @param {Number} times
     * @param {Function} callback
     */
    _.repeat = (times, callback) => {
        var iteration = 0;
        while (iteration<times) callback(iteration++);
    };
    /**
     * Call {callback} function {times} times and follow result to {handler}
     * @param {Number} times
     * @param {Function} callback
     * @param {Function} handler
     */
    _.repeatHandled = (times, callback, handler) => {
        var iteration = 0;
        while (iteration<times) handler(callback(iteration++));
    };
    
    function* _iterator(data) {
        for(var d of data) {
            yield d;
        }
    }
    
    /**
     * Chained callbacks invocation
     * @param Array.<Function> target
     * @param {Array} args
     */
    _.flow = function (target) {
        var callbacks = _.toArray(target),
            flow = () => {
                    if(callbacks.length) {
                        var next = callbacks.shift();
                        next.apply(null, args);
                    }
                },
            args = _.toArray(arguments).slice(1).concat([flow]);
        flow();
    };
   
    /**
     * Iterate each enumerable property in target
     *
     * @param {Object|Array|String} target
     * @param callback
     */
    _.each = (target, callback) => (_.keys(target).forEach( key => callback(target[key], key, target)));
    /**
     * Iterate each enumerable property in target and return true if no one callback return false
     *
     * @param {Object|Array|String} target
     * @param {Function} callback
     * @returns {Boolean}
     */
    _.every = (target, callback)=> _.keys(target).every( key => callback(target[key], key, target));
    /**
     * Iterate enumerable property in target and return true if any callback return true
     * @param {Object|Array|String} target
     * @param {Function} callback
     * @returns {Boolean}
     */
    _.any = _.some = (target, callback) => _.keys(target).some( key => callback(target[key], key, target));
    /**
     *
     * @param {Object|Array|String} target
     * @param {Function} callback
     * @returns {*}
     */
    _.map = (target, callback) => {
        if (_.isObject(target)) {
            return _.keys(target).reduce( (mapped, key) => (mapped[key] = callback.call(target, target[key], key, target), mapped), {});
        }
        return _.toArray(target).map(callback);
    };
    _.reduce = function (target, callback, init) {
        var keys = _.keys(target);
        var values = _.values(target);
        var args = _.toArray(arguments).slice(1);
        args[0] = (cur, next, idx) => callback(cur, next, keys[idx], target);
        return values.reduce.apply(values, args);
    };
    _.select = (target, callback) => {
        var keys = _.keys(target);
        var key = keys.reduce((curKey, nextKey, idx) => callback(target[curKey], target[nextKey], nextKey, target) ? nextKey : curKey );
        return _.toKeyValueOf(target, key);
    };

    /**
     * Returns first key-value pair from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array.<*>=)} callback
     * @param {String|Number|{key, value}} [defaultKey]
     * @returns {{key, value}}
     */
    _.first = (target, callback, defaultKey) => {
        var firstKey;
        if (!_.keys(target).some( key => {
                if (callback(target[key], key, target)) {
                    firstKey = key;
                    return true;
                }
            })) {
            if (_.isKeyValue(defaultKey)) {
                return defaultKey;
            }
            firstKey = defaultKey;
        }
        return _.toKeyValueOf(target, firstKey);
    };
    /**
     * Returns last key-value pair from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array.<*>=)} callback
     * @param {String|Number} [defaultKey]
     * @returns {{key, value}}
     */
    _.last = (target, callback, defaultKey) => {
        var last = _.keys(target).reduce((lastKey, key) => {
            if (callback(target[key], key, target)) {
                lastKey = key;
            }
            return lastKey;
        }, defaultKey)
        if (_.isKeyValue(last)) {
            return last;
        }
        return _.toKeyValueOf(target, last);
    };

    /**
     * Returns first key-value pair and remove it from the target argument on truth callback result.
     * @param {Array|Object|String} target
     * @param {function(*=, String|Number=, Array.<*>=)} callback
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
     * @param {function(*=, String|Number=, Array.<*>=)} callback
     * @returns {{key, value}}
     */
    _.takeReduce = (target, callback) => {
        var keys = _.keys(target);
        var key = keys.reduce( (curKey, nextKey) => {
            var curValue = target[curKey];
            var nextValue = target[nextKey];
            if (callback(curValue, nextValue, curKey) === nextValue) {
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
     * @returns {Number}
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
     * Counts of values equal to countValue
     * @param {String|Array|Object} target
     * @param {*} countValue
     * @returns {Number}
     */
    _.countOf = (target, countValue) => _.sum(_.values(target).map( value => countValue === value ? 1 : 0 ));
    
    /**
     * Randomizer
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
    _.randomString = (size) => new Array(size).fill('').map( (c, idx) => String.fromCharCode(_.random(c = _.random(1) == 1 ? 65 : 97, c + 25)) ).join();
    _.randomCase = function () {
        var probabilityData = _.toArray(arguments),
            select = _.random(100),
            lost = 0;
        return _.first(probabilityData, function (value) {
            if (select < lost + value) {
                return true;
            }
            lost += value;
        }, probabilityData.length - 1).value;
    };
    /**
     * Shuffle all values of the target
     * @param target
     * @returns {Array|Iterator.<*>}
     */
    _.shuffle = function (target) {
        var value = _.values(target),
            result = [];
        while (value.length) {
            result.push(value.splice(_.random(value.length), 1)[0]);
        }
        return result;
    };
    /**
     * Functions
     */
    _.fnArgsCallback    = callback => function(){ return callback(arguments) };
    _.fnArgsValue       = (value, callback) => ( callback(value), value );
    _.fnEmpty           = ()        => {};
    _.fnTrue            = ()        => true;
    _.fnFalse           = ()        => false;
    _.fnArgs            = _.fnArgsCallback(_.toArray);
    _.fnArg             = arg       => arg;
    _.fnCallback        = callback => value => callback(value);
    _.fnLog             = _.fnArgsCallback(console.log);
    _.fnPromise         = callback => new Promise(callback);
    _.fnPromises        = function () {
        return Promise.all(_.toArray(arguments).map(_.fnPromise));
    };
    /**
     * Formatting
     */
    _.stringToUpperCaseFirst    = str           => str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
    _.stringToPascalCase        = (str, join)   => str.replace(/[\s\-_\.,]+/g, ' ').split(' ').map(_.toUpperCaseFirst).join(join || '');
    _.stringToCamelCase         = str           => (str = _.stringToPascalCase(str)).charAt(0).toLowerCase() + str.substr(1);
    _.stringCapitalize          = str           => str.toUpperCase();

    _.fmtString = function (str) {
        var result = str.toString();
        var args = _.toArray(arguments).slice(1);
        if (args.length == 1 && _.isStructure(args[0])) {
            args = args[0];
        }
        _.each(args, function (value, key) {
            var regexp = new RegExp('\\{' + key + '\\}', 'g');
            result = result.replace(regexp, value);
        });
        return result;
    };
    _.fmtNumber = function (num, iSize, forceSign) {
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
            return _.fmtNumber(diff|0, 2, true) + ":" + _.fmtNumber(Math.abs(diff) % 1 * 60, 2);
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
    
    _.toXsdDate = date => _.fmtDate(date, _.fmtDate.DATE_XSD);

    Date.begin = function () {
        var d = Date.now;
        d.setTime(0);
        return d;
    };
    /**
     * Math
     */
    _.mathSqrDiff = (a, b) => {
        return (a-=b) * a;
    };
    _.mathSqrtSum = (values) => {
        return Math.pow(_.sum(values), 0.5);
    };
    _.mathLengthEuclidean = function() {
        var coords = _.toArray(arguments),
            length = _.toInt(arguments.length / 2);
        var sqrDiffs = new Array(length).fill(0).map((v, id) => {
            return _.mathSqrDiff(coords[id], coords[id+length]);
        });
        return _.mathSqrtSum(sqrDiffs);
    };
    _.mathLengthManhattan = () => {
        var coords = _.toArray(arguments),
            length = _.toInt(arguments.length / 2);
        var diffs = new Array(length).fill(0).map((v, id) => {
            return Math.abs(coords[id] - coords[id+length]);
        });
        return _.sum(diffs);
    };
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
            return _.mathLengthManhattan(x - finishPoint.x, y - finishPoint.y)*distance;
        };
        maxIterationCount = maxIterationCount || width*height;
        var iteration = 1,
            distance = _.mathLengthManhattan(startPoint.x - finishPoint.x, startPoint.y - finishPoint.y) + 1,
            currentPoint,
            visitedList = {},
            blackList = {},
            whiteList = {},
            getPointId = function(x, y) {
                return y * (width) + x;
            },
            getPoint = function (id, x, y, pid, pg, pm) {
                var w = weightCallback(x, y),
                    h = heuristicCallback(x, y),
                    g = w + pg,
                    m = pm + 1;
                return {
                    id: id || getPointId(x, y),
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
                onWhiteList && onWhiteList(newPoint);
            },
            directionToPoint = function(dir) {
                return getPoint(0, currentPoint.x + dir.x, currentPoint.y + dir.y, currentPoint.id, currentPoint.g, currentPoint.m);
            },
            excludeAlreadyHaven = function(newPoint) {
                return newPoint.x>=0 && newPoint.x<width && newPoint.y>=0 && newPoint.y<height && newPoint.w != Number.MAX_VALUE && !visitedList[newPoint.id];
            },
            result = [];
            
        startPoint = getPoint(getPointId(startPoint.x, startPoint.y), startPoint.x, startPoint.y,-1,0,0);
        finishPoint = getPoint(getPointId(finishPoint.x, finishPoint.y), finishPoint.x, finishPoint.y,-1,0,0);
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
     * Simple events manager
     */
    const LISTENERS = 'listeners';
    _.evtOn = (object, event, callback) => {
        var listeners = _getObjectValue(object, LISTENERS);
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push({callback: callback});
    };
    _.evtOnce = (object, event, callback) => {
        var listeners = _getObjectValue(object, LISTENERS);
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push({callback: callback, once: 1});
    };
    _.evtUn = (object, event, calloback) => {
        var listeners = _getObjectValue(object, LISTENERS);
        if (listeners[event]) {
            var idx = listeners[event].indexOf(calloback);
            if (!~idx) {
                listeners[event].splice(idx, 1);
            }
        }
    };
    _.evtEmit = (object, event, value) => {
        var listeners = _getObjectValue(object, LISTENERS);
        if (listeners[event]) {
            listeners[event].slice().forEach((data, idx) => {
                data.callback(value);
                if (data.once) {
                    listeners[event].splice(idx, 1);
                }
            })
        }
    };
    
    /**
     * Simple middleware
     */
    const MIDDLEWARES = 'middlewares';
    _.mwUse = (object, middleware) => {
       var middlewares = _getObjectValue(object, MIDDLEWARES, []);
       if (middleware.hasOwnProperty('middleware')) {
           middlewares.push(middleware.middleware.bind(middleware));
       } else {
           middlewares.push(middleware);
       }
    };
    _.mwFlow = function(object) {
        var args = _.toArray(arguments).slice(1),
            middlewares = _getObjectValue(object, MIDDLEWARES, []).slice();
        _.flow.apply(null, [middlewares].concat(args));
    };
    if (isNode) {
        module.exports = _;
    } else {
        global._ = _;
    }

}).call(this.window || this.global || global || window);
