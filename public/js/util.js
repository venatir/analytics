/**
 * get a column of multi-dimensional array or DataFrame-like array
 * @param index
 * @param deep
 * @returns {Array}
 */
Array.prototype.getColumn = function (index, deep) {
    var ret = [],
        i;
    if (typeof deep === 'undefined') {
        deep = 0;
    }
    if (this[0] instanceof Object) {
        this.forEach(function (d) {
            if (deep) {
                ret.push(getDeepValue(d, index));
            } else {
                ret.push(d[index]);
            }
        });
    } else {
        for (i = 0; i < this.getColumnLength(); i++) {
            ret.push(this[i][index]);
        }
    }
    return ret;
};
/**
 * index by key
 * key elements MUST be unique
 * @param key
 * @returns {{}}
 */
Array.prototype.indexBy = function (key) {
    var ret = {};
    this.forEach(function (d) {
        ret[d[key]] = d;
    });
    return ret;
};
/**
 * index by key
 * similar to indexBy but key elements can be non-unique and elements of return object are array
 * @param key
 * @return {*}
 */
Array.prototype.indexMultiBy = function (key) {
    var ret = {};
    this.forEach(function (d) {
        if (ret[d[key]] == null) {
            ret[d[key]] = [];
        }
        ret[d[key]].push(d);
    });
    return ret;
};
/**
 * index by key
 * key elements MUST be unique
 * @param key
 * @returns {{}}
 */
Array.prototype.indexBy = function (key) {
    var ret = {};
    this.forEach(function (d) {
        ret[d[key]] = d;
    });
    return ret;
};
/**
 * sortBy
 * only applies to arrays like [{a:1,b:2},...]
 * may conflict with cubism
 * @param key
 * @param direction
 */
Array.prototype.sortBy = function (key, direction) {
    if (direction == null) {
        direction = 'desc';
    }
    switch (("" + direction).toLowerCase()) {
        case 'desc':
            direction = 1;
            break;
        case 'asc':
            direction = -1;
            break;
        default :
    }
    var lookup = this.indexBy(key),
        ret = [],
        indexes = this.getColumn(key)._sort(direction),
        i;
    for (i = 0; i < indexes.length; i++) {
        ret.push(lookup[indexes[i]]);
    }
    return ret;
};
/**
 * select by indexes
 * use indexMultiBy and _.flatten
 * only applies to arrays like [{a:1,b:2},...]
 * may conflict with cubism
 * @param key
 * @param [indexes]
 */
Array.prototype.ix = function (key, indexes) {
    if (indexes == null) {
        return this.getColumn(key);
    }
    var lookup = this.indexMultiBy(key),
        i,
        ret = [];
    if (!(indexes instanceof Array)) {
        indexes = [indexes];
    }
    for (i = 0; i < indexes.length; i++) {
        if (lookup[indexes[i]] != null) {
            ret.push(lookup[indexes[i]]);
        }
    }
    ret = _.flatten(ret);
    return ret;
};
/**
 * select columns
 * @param keys
 */
Array.prototype.icol = function (keys) {
    if (keys == null) {
        throw Error('keys should not be null');
    }
    if (!(keys instanceof Array)) {
        keys = [keys];
    }
    var row,
        ret = [];
    this.forEach(function (d) {
        row = {};
        keys.forEach(function (key) {
            row[key] = d[key];
        });
        ret.push(row);
    });
    return ret;
};
/**
 * sort a simple array
 * 1    ascending
 * -1   descending
 * @param direction
 * @returns {Array}
 * @private
 */
Array.prototype._sort = function (direction) {
    return this.sort(function (a, b) {
        switch (direction) {
            case 1:
                return (a > b) ? 1 : -1;
            case 2:
                return (a < b) ? 1 : -1;
            default :
                return 1
        }
    });
};
/**
 * return a unique array
 * @returns {Array}
 */
Array.prototype.unique = function () {
    var i,
        ret = [],
        tmp = {};
    for (i = 0; i < this.length; i++) {
        tmp[this[i]] = 1;
    }
    for (i in tmp) {
        if (tmp.hasOwnProperty(i)) {
            ret.push(i);
        }
    }
    return ret;
};
/**
 * max
 * @returns {*}
 */
Array.prototype.max = function () {
    var ret;
    for (var i = 0; i < this.length; i++) {
        if (typeof ret === "undefined") {
            ret = this[i];
        }
        if (ret < this[i]) {
            ret = this[i];
        }
    }
    return ret;
};
/**
 * min
 * @returns {*}
 */
Array.prototype.min = function () {
    var ret;
    for (var i = 0; i < this.length; i++) {
        if (typeof ret === "undefined") {
            ret = this[i];
        }
        if (ret > this[i]) {
            ret = this[i];
        }
    }
    return ret;
};
/**
 * unflatten
 * @param data
 * @returns {*}
 */
JSON.unflatten = function (data) {
    "use strict";
    if (Object(data) !== data || Array.isArray(data))
        return data;
    var regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
    for (var p in data) {
        var cur = resultholder,
            prop = "",
            m;
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[""] || resultholder;
};
/**
 *
 * @param data
 * @returns {{}}
 */
JSON.flatten = function (data) {
    var result = {};

    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++)
                recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + "." + p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }

    recurse(data, "");
    return result;
};

/**
 * flatten a dataframe-like array
 * require JSON.flatten
 * @returns {Array}
 */
Array.prototype.flatten = function () {
    var ret = [];
    this.forEach(function (d) {
        ret.push(JSON.flatten(d));
    });
    return ret;
};
/**
 * return size of an object
 * @param obj
 * @returns {number}
 */
function size(obj) {
    var n = 0,
        i;
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            n++;
        }
    }
    return n;
}

/**
 * create element
 * @param type
 * @param [attrs]
 * @param [text]
 * @returns {HTMLElement}
 */
function createElem(type, attrs, text) {
    var elem = document.createElement(type),
        attr;

    if (typeof attrs !== "undefined" && attrs instanceof Object) {
        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                elem[attr] = attrs[attr];
            }
        }
    }

    if (typeof text !== 'undefined') {
        elem.innerText = text;
    }

    return elem;
}

/**
 * replace all elements in a string
 * @param oldVal
 * @param [newVal]
 * @returns {string}
 */
String.prototype.replaceAll = function (oldVal, newVal) {
    if (newVal == null) {
        newVal = '';
    }
    return this.split(oldVal).join(newVal);
};