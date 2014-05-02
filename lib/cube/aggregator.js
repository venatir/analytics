"use strict";
/*
 * Aggregation have fixed times of execution: 1m and 5m
 */
var util = require('util');
var lock = false;
//noinspection JSLint
exports.register = function (dbs, endpoints, options) {
    if (dbs.length !== 2) {
        throw "We need to receive exactly 2(two) databases";
    }
    var eventsDB = dbs[0],
        aggregationsDB = dbs[1];

    function executeAggregationCore5m(aggregation, aggregationName, t0_5m, t1_1m, reagregatable) {
        var aggGrKey,
            fiveMinAggregation,
            aggregationGroup,
            t1_5m,
            i;

        t1_5m = t0_5m + 300000;
        t1_5m = new Date(t1_5m);

        if (t1_5m <= t1_1m) {
            console.log("Starting 5 minute aggregation from time: " + new Date(t0_5m));

            //this way we can insure the 1 minute aggregation happens before the 5 minute one, so the 5 minute one can use the result of the first
            if (reagregatable === true) {
                for (i = 0; i < aggregation.length; i++) {
                    if (aggregation[i].$group !== undefined) {
                        aggregationGroup = JSON.parse(JSON.stringify(aggregation[i].$group));
                        break;
                    }
                }
                if (aggregationGroup === undefined) {
                    throw "Could not find $group statement for aggregation " + aggregationName;
                }
                aggregationGroup._id = "$key";

                console.log("Replacing $group params with new ones for reaggregating");
                //we can handle $sum,$avg,$min,$max:x - where x is not the same field or is a constant
                for (aggGrKey in aggregationGroup) {
                    if (aggregationGroup.hasOwnProperty(aggGrKey) && aggGrKey !== "_id") {
                        //console.log(util.inspect([aggregationGroup, aggGrKey], {color: true, depth: null}));

                        if (aggregationGroup[aggGrKey].$sum !== undefined) {
                            aggregationGroup[aggGrKey].$sum = "$" + aggGrKey;
                        } else if (aggregationGroup[aggGrKey].$avg !== undefined) {
                            delete aggregationGroup[aggGrKey].$avg;
                            aggregationGroup[aggGrKey].$sum = "$" + aggGrKey + "/5";
                        } else if (aggregationGroup[aggGrKey].$min !== undefined) {
                            aggregationGroup[aggGrKey].$min = "$" + aggGrKey;
                        } else if (aggregationGroup[aggGrKey].$max !== undefined) {
                            aggregationGroup[aggGrKey].$max = "$" + aggGrKey;
                        } else {
                            throw "Unrecognised keyword. We only accept $min, $max, $sum and $avg";
                        }
                    }
                }

                fiveMinAggregation = [
                    {"$match": {t: {$in: [new Date(t0_5m), new Date(t0_5m + 60000), new Date(t0_5m + 120000), new Date(t0_5m + 180000), new Date(t0_5m + 240000)]}}},
                    {"$group": aggregationGroup}
                ];

                console.log("Here is how the new aggregation for 5 minutes looks like: " + util.inspect(fiveMinAggregation, {color: true, depth: null}));
                aggregationsDB.collection(aggregationName + "_1m").aggregate(
                    fiveMinAggregation, {}, function (err, result) {
                        var insertEmptyRecord;
                        if (err) {
                            throw err;
                        }
                        if (result.length > 0) {
                            for (i = 0; i < result.length; i++) {
                                if (result[i]._id === undefined || result[i]._id === null) {
                                    insertEmptyRecord = true;
                                }
                                result[i].key = result[i]._id;
                                result[i].t = new Date(t0_5m);
                                delete result[i]._id;
                            }

                            //console.log(util.inspect(result, {color: true, depth: null}));
                            //noinspection JSLint
                            aggregationsDB.collection(aggregationName + "_5m").insert(result, {w: 1}, function (err, result) {
                                if (err) {
                                    throw err;
                                }

                                lock = false;
                            });
                        }
                        else {
                            insertEmptyRecord = true;
                        }
                        if (insertEmptyRecord) {
                            //noinspection JSLint
                            aggregationsDB.collection(aggregationName + "_5m").insert({t: new Date(t0_5m)}, {w: 1}, function (err, result) {
                                if (err) {
                                    throw err;
                                }

                                lock = false;
                            });
                        }
                    });
            }
            else {
                lock = false;
                throw "5 minute aggregations that are not reaggregatable are not yet implemented";
            }
        } else {
            lock = false;
        }
    }

    function executeAggregationCore1m(aggregation, aggregationName, t0_1m, reagregatable) {
        var i,
            t1_1m = t0_1m + 60000,
            t0_5m;

        console.log("Starting 1 minute aggregation from time:  " + new Date(t0_1m));

        t0_1m = new Date(t0_1m);
        t1_1m = new Date(t1_1m);
        if (t1_1m < new Date()) {
            //start aggregating
            aggregation[0].$match.t = {"$gte": t0_1m, "$lt": t1_1m};
            //console.log(util.inspect(aggregation, {  depth: null, colors: true}));
            eventsDB.collection("events").aggregate(aggregation, {}, function (err, result) {
                if (err) {
                    throw err;
                }
                //console.log(util.inspect(result, { depth: null, colors: true}));
                if (result.length > 0) {
                    console.log("Finished aggregating events for 1 minute for aggregation " + aggregationName);

                    for (i = 0; i < result.length; i++) {
                        result[i].key = result[i]._id;
                        result[i].t = t0_1m;
                        delete result[i]._id;
                    }
                    //noinspection JSLint
                    aggregationsDB.collection(aggregationName + "_1m").insert(result, {w: 1}, function (err, result) {
                            if (err) {
                                throw err;
                            }
                            console.log("Inserted events for 1 minute for aggregation " + aggregationName);

                            //now run the 5 minute aggregation
                            //First find at what point to start - say last 5 minute aggregation
                            aggregationsDB.collection(aggregationName + "_5m").find({}, {}, {sort: {_id: -1}, limit: 1}).toArray(function (err, result) {
                                if (err) {
                                    throw err;
                                }
                                //noinspection JSLint
                                if (result !== null && result.length > 0) {
                                    t0_5m = result[0].t.getTime() + 300000;
                                    executeAggregationCore5m(aggregation, aggregationName, t0_5m, t1_1m, reagregatable);
                                }
                                else {
                                    //no 5 minute aggregation yet
                                    //check the first 1 minute aggregation available
                                    aggregationsDB.collection(aggregationName + "_1m").find({}, {}, {sort: {_id: 1}, limit: 1}).toArray(function (err, result) {
                                        if (err) {
                                            throw err;
                                        }
                                        if (result === null || result.length === 0) {
                                            throw "Cannot find a 1 minute aggregation. This should never happen as this is only triggered after inserting a 1 minute aggregation";
                                        }

                                        t0_5m = result[0].t.getTime() - result[0].t.getTime() % 300000; // the t field represents the beginning of the time slot
                                        executeAggregationCore5m(aggregation, aggregationName, t0_5m, t1_1m, reagregatable);
                                    });
                                }
                            });
                        }
                    );
                }
                else {
                    console.log("Still inserting an empty entry with t :" + t0_1m + " so we can keep track of what ran");
                    //noinspection JSLint
                    aggregationsDB.collection(aggregationName + "_1m").insert({t: t0_1m}, {w: 1}, function (err, result) {
                        if (err) {
                            throw err;
                        }
                        lock = false;
                    });

                }
            });
        }
        else {
            lock = false;
        }
    }

    function executeAggregation(aggregationObject) {
        var keys = 0,
            aggregation,
            keyName,
            t0,
            aggregationName,
            reagregatable = false;

        if (lock !== true) {
            lock = true;
            if (typeof aggregationObject === "object") {
                for (keyName in aggregationObject) {
                    if (aggregationObject.hasOwnProperty(keyName)) {
                        if (keyName !== "reagragatable") {
                            aggregationName = keyName;
                            keys++;
                            aggregation = aggregationObject[keyName];
                        } else {
                            if (aggregationObject[keyName] === true) {
                                reagregatable = true;
                            }
                        }
                    }
                }
            }
            if (keys !== 1) {
                throw "Too many keys";
            }
            //get the last appearance of this aggregation and start from there
            aggregationsDB.collection(aggregationName + "_1m").find({}, {}, {sort: {_id: -1}, limit: 1}).toArray(function (err, result) {
                if (err) {
                    throw err;
                }

                if (result === null || result.length === 0) {
                    //no aggregations were found
                    eventsDB.collection("events").find({}, {}, {sort: {_id: 1}, limit: 1}).toArray(function (err, result) {
                        if (err) {
                            throw err;
                        }

                        if (result === null || result.length === 0) {
                            throw "There are no events, so we cannot aggregate";
                        }
                        t0 = result[0].t.getTime();
                        t0 = t0 - t0 % 60000;
                        executeAggregationCore1m(aggregation, aggregationName, t0, reagregatable);
                    });
                } else {
                    t0 = result[0].t.getTime() + 60000; // the t field represents the beginning of the time slot
                    executeAggregationCore1m(aggregation, aggregationName, t0, reagregatable);
                }
            });
        } else {
            console.log("Will not run as another aggregation is in progress");
        }
    }

    options.aggregations.forEach(function (aggregation) {
        setInterval(function () {
            executeAggregation(aggregation);
        }, 1000);
    });
};