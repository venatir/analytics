"use strict";
var mongodb = require("mongodb"),
    genericGetter = require("./genericGetter.js");

exports.getterInit = function (aggregationDB) {
    return genericGetter(aggregationDB);
};

