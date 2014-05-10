"use strict";

var mongodb = require("mongodb");
module.exports.objectIdFromDate = function (ts) {
    return new mongodb.ObjectID(Math.floor(ts / 1000).toString(16) + "0000000000000000");
};
module.exports.dateFromObjectId = function (obj) {
    return obj.getTimestamp();
};
module.exports.epochFromObjectId = function (obj) {
    return parseInt(obj.valueOf().slice(0, 8), 16);
};
module.exports.epochMSFromObjectId = function (obj) {
    return parseInt(obj.valueOf().slice(0, 8), 16);
};
module.exports.isInt = function (n) {
    return typeof n === 'number' && parseFloat(n) === parseInt(n, 10) && !isNaN(n);
};