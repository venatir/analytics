"use strict";
var util = require('util');
exports.register = function (dbs, endpoints, options) {
    if (dbs.length !== 2) {
        throw "We need to receive exactly 2(two) databases";
    }
    var eventsDB = dbs[0];
    var aggregationsDB = dbs[1];

    function executeAggregation(aggregationArray) {
        var keys = 0;
        var aggregation;
        if (typeof aggregationArray === "object") {
            for (var keyName in aggregationArray) {
                if (aggregationArray.hasOwnProperty(keyName)) {
                    keys++;
                    aggregation = aggregationArray[keyName];
                }
            }
        }
        if (keys !== 1) {
            throw "Too many keys";
        }
        var currentTime = new Date().getTime();
        var t1 = currentTime - currentTime % 60000;
        var t0 = t1 - 60000;
        t0 = new Date(t0);
        t1 = new Date(t1);
        aggregation[0].$match.t = {"$gte": t0, "$lt": t1};
        console.log(util.inspect(aggregation, {  depth: null, colors: true}));
        eventsDB.collection("events").aggregate(aggregation, {}, function (err, result) {
            if (err) {
                throw err;
            }
            console.log(util.inspect(result, { depth: null, colors: true}));
            aggregationsDB.collection(keyName).insert({t: t0, d: result}, {}, function (err, result) {
                    if (err) {
                        throw err;
                    }
                }
            );
        });
    }

    options.aggregations.forEach(function (aggregation) {
        setInterval(function () {
            executeAggregation(aggregation);
        }, 5000);

    });
};