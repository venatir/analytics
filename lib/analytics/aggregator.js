"use strict";
/*
 * Aggregations have fixed times of execution: 1m, 5m and 1h
 */
var util = require('util'),
    myutils = require("./myutils.js"),
    mongodb = require("mongodb"),
    mongoConfigs = require("../../bin/databases-config"),
    lock = {},
    myLog = function (param1, param2) {
        console.log(new Date() + " Agg: " + param1 + " :: " + param2);
    };
//noinspection JSLint
exports.register = function (dbs, endpoints, options) {
    var eventsDB = dbs.events,
        aggregationsDB = dbs.aggregations,
        save = function (aggregationName, documentsArray, interval) {
            var i;
            for (i = 0; i < documentsArray.length; i++) {
                if (documentsArray[i] === undefined || documentsArray[i].t === undefined) {
                    myLog(aggregationName, util.inspect(documentsArray));
                    throw "Failed to get t";
                }
                documentsArray[i]._id = new mongodb.ObjectID(documentsArray[i].t / 1000);
            }
            //noinspection JSLint
            aggregationsDB.collection(aggregationName + "_" + interval).insert(documentsArray, {w: 1}, function (error, result) {
                    if (error) {
                        throw error;
                    }
                    myLog(aggregationName, "Inserted " + documentsArray.length + " documents for the " + interval + " interval");
                }
            );
        },
        executeAggregationCore1h = function (aggregation, aggregationName, lastPossibleAggregatableElementTimestamp) {
            var reaggregation,
                aggregationGroup,
                t0_1h,
                t1_1h,
                i,
                determineTimestamps = function (callback) {
                    //try to continue from where we left off
                    aggregationsDB.collection(aggregationName + "_1h").find({}, {}, {sort: {_id: -1}, limit: 1}).toArray(function (error, result) {
                        if (error) {
                            throw error;
                        }

                        if (result === null || result.length === 0) {
                            //no previous aggregations were found. look for the first event of the aggregation type and start from there
                            aggregationsDB.collection(aggregationName + "_5m").find({}, {}, {sort: {_id: 1}, limit: 1}).toArray(function (error, result) {
                                if (error) {
                                    throw error;
                                }

                                if (!Array.isArray(result) || result.length === 0) {
                                    myLog(aggregationName, "There are no 5m records, so we cannot aggregate for 1 hour.");
                                    t0_1h = undefined;
                                } else {
                                    t0_1h = result[0].t;
                                    t0_1h = t0_1h - t0_1h % 3600000;
                                }

                                if (t0_1h === undefined) {
                                    lock[aggregationName].inProgress = false;
                                } else {
                                    t1_1h = t0_1h + 3600000;
                                    callback(aggregation, t0_1h, t1_1h);
                                }
                            });
                        } else {
                            // the t field represents the beginning of the time slot
                            // start aggregating from the next slot
                            t0_1h = result[0].t + 3600000;
                            t1_1h = t0_1h + 3600000;
                            callback(aggregation, t0_1h, t1_1h);
                        }
                    });
                },
                prepareReaggregation = function (aggregation) {
                    var aggGrKey;
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

                    //myLog(aggregationName,"Replacing $group params with new ones for reaggregating ...");
                    //we can handle $sum,$avg,$min,$max:x - where x is not the same field or is a constant
                    for (aggGrKey in aggregationGroup) {
                        if (aggregationGroup.hasOwnProperty(aggGrKey) && aggGrKey !== "_id") {
                            if (aggregationGroup[aggGrKey].$sum !== undefined) {
                                aggregationGroup[aggGrKey].$sum = "$" + aggGrKey;
                            } else if (aggregationGroup[aggGrKey].$avg !== undefined) {
                                delete aggregationGroup[aggGrKey].$avg;
                                aggregationGroup[aggGrKey].$sum = "$" + aggGrKey + "/12";
                            } else if (aggregationGroup[aggGrKey].$min !== undefined) {
                                aggregationGroup[aggGrKey].$min = "$" + aggGrKey;
                            } else if (aggregationGroup[aggGrKey].$max !== undefined) {
                                aggregationGroup[aggGrKey].$max = "$" + aggGrKey;
                            } else {
                                throw "Unrecognised keyword. We only accept $min, $max, $sum and $avg";
                            }
                        }
                    }

                    reaggregation = [
                        {"$match": {_id: {$gte: myutils.objectIdFromDate(t0_1h), $lt: myutils.objectIdFromDate(t0_1h + 3600000)}}},
                        {"$group": aggregationGroup}
                    ];
                    //myLog(aggregationName,"Here is how the new aggregation for 1 hour looks like: " + util.inspect(reaggregation, {color: true, depth: null}));
                },
                core = function (aggregation, t0_1h, t1_1h) {
                    if (t1_1h <= lastPossibleAggregatableElementTimestamp) {
                        myLog(aggregationName, "Starting 1 hour aggregation from time: " + new Date(t0_1h));
                        prepareReaggregation(aggregation);
                        aggregationsDB.collection(aggregationName + "_5m").aggregate(reaggregation, {}, function (error, result) {
                            if (error) {
                                throw error;
                            }
                            if (result.length > 0) {
                                myLog(aggregationName, "Finished aggregating documents from the 5 minute aggregation into the 1 hour aggregation ... now inserting.");

                                //put _id in key
                                for (i = 0; i < result.length; i++) {
                                    if (result[i]._id !== undefined && result[i]._id !== null) {
                                        result[i].key = result[i]._id;
                                        result[i].t = t0_1h;
                                        delete result[i]._id;
                                    }
                                    else {
                                        result.splice(i, 1);
                                        i--;
                                    }
                                }
                                if (result.length > 0) {
                                    save(aggregationName, result, "1h");
                                }
                                else {
                                    save(aggregationName, new Array({t: t0_1h}), "1h");
                                }
                            }
                            else {
                                myLog(aggregationName, "Still inserting an empty entry with t :" + t0_1h + " so we can keep track of what ran when");
                                save(aggregationName, new Array({t: t0_1h}), "1h");
                            }
                            lock[aggregationName].inProgress = false;

                        });

                    } else {
                        lock[aggregationName].inProgress = false;
                    }

                };
            determineTimestamps(core);
        },

        executeAggregationCore5m = function (aggregation, aggregationName, lastPossibleAggregatableElementTimestamp) {
            var reaggregation,
                aggregationGroup,
                t0_5m,
                t1_5m,
                i,
                determineTimestamps = function (callback) {
                    //try to continue from where we left off
                    aggregationsDB.collection(aggregationName + "_5m").find({}, {}, {sort: {_id: -1}, limit: 1}).toArray(function (error, result) {
                        if (error) {
                            throw error;
                        }

                        if (result === null || result.length === 0) {
                            //no previous aggregations were found. look for the first event of the aggregation type and start from there
                            aggregationsDB.collection(aggregationName + "_1m").find({}, {}, {sort: {_id: 1}, limit: 1}).toArray(function (error, result) {
                                if (error) {
                                    throw error;
                                }

                                if (!Array.isArray(result) || result.length === 0) {
                                    myLog(aggregationName, "There are no 1m records, so we cannot aggregate for 5 minutes.");
                                    t0_5m = undefined;
                                } else {
                                    t0_5m = result[0].t;
                                    t0_5m = t0_5m - t0_5m % 300000;
                                }

                                if (t0_5m === undefined) {
                                    lock[aggregationName].inProgress = false;
                                } else {
                                    t1_5m = t0_5m + 300000;
                                    callback(aggregation, t0_5m, t1_5m);
                                }
                            });
                        } else {
                            // the t field represents the beginning of the time slot
                            // start aggregating from the next slot
                            t0_5m = result[0].t + 300000;
                            t1_5m = t0_5m + 300000;
                            callback(aggregation, t0_5m, t1_5m);
                        }
                    });
                },
                prepareReaggregation = function (aggregation) {
                    var aggGrKey;
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

                    //myLog(aggregationName, "Replacing $group params with new ones for reaggregating");
                    //we can handle $sum,$avg,$min,$max:x - where x is not the same field or is a constant
                    for (aggGrKey in aggregationGroup) {
                        if (aggregationGroup.hasOwnProperty(aggGrKey) && aggGrKey !== "_id") {
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

                    reaggregation = [
                        {"$match": {_id: {$gte: myutils.objectIdFromDate(t0_5m), $lt: myutils.objectIdFromDate(t0_5m + 300000)}}},
                        {"$group": aggregationGroup}
                    ];
                    //myLog(aggregationName,"Here is how the new aggregation for 5 minutes looks like: " + util.inspect(reaggregation, {color: true, depth: null}));
                },
                core = function (aggregation, t0_5m, t1_5m) {
                    if (t1_5m <= lastPossibleAggregatableElementTimestamp) {
                        myLog(aggregationName, "Starting 5 minute aggregation from time: " + new Date(t0_5m));
                        prepareReaggregation(aggregation);
                        aggregationsDB.collection(aggregationName + "_1m").aggregate(reaggregation, {}, function (error, result) {
                            if (error) {
                                throw error;
                            }
                            if (result.length > 0) {
                                myLog(aggregationName, "Finished aggregating documents from the 1 minute aggregation into the 5 minutes aggregation ... now inserting.");

                                //put _id in key
                                for (i = 0; i < result.length; i++) {
                                    if (result[i]._id !== undefined && result[i]._id !== null) {
                                        result[i].key = result[i]._id;
                                        result[i].t = t0_5m;
                                        delete result[i]._id;
                                    }
                                    else {
                                        result.splice(i, 1);
                                        i--;
                                    }
                                }
                                if (result.length > 0) {
                                    save(aggregationName, result, "5m");
                                }
                                else {
                                    save(aggregationName, new Array({t: t0_5m}), "5m");
                                }
                            }
                            else {
                                myLog(aggregationName, "Still inserting an empty entry with t :" + t0_5m + " so we can keep track of what ran when");
                                save(aggregationName, new Array({t: t0_5m}), "5m");
                            }
                            executeAggregationCore1h(aggregation, aggregationName, t0_5m);
                        });
                    } else {
                        lock[aggregationName].inProgress = false;
                    }

                };
            determineTimestamps(core);
        },

        executeAggregationCore1m = function (aggregation, aggregationName, lastPossibleAggregatableElementTimestamp) {
            var t0_1m,
                i,
                t1_1m,
                determineTimestamps = function (callback) {
                    //try to continue from where we left off
                    aggregationsDB.collection(aggregationName + "_1m").find({}, {}, {sort: {_id: -1}, limit: 1}).toArray(function (error, result) {
                        if (error) {
                            throw error;
                        }

                        if (result === null || result.length === 0) {
                            //no previous aggregations were found. look for the first event of the aggregation type and start from there
                            eventsDB.collection("events").find({type: aggregation[0].$match.type}, {}, {sort: {_id: 1}, limit: 1}).toArray(function (error, result) {
                                if (error) {
                                    throw error;
                                }

                                if (!Array.isArray(result) || result.length === 0) {
                                    myLog(aggregationName, "There are no events of type " + aggregation[0].$match.type + ", so we cannot aggregate.");
                                    t0_1m = undefined;
                                } else {
                                    t0_1m = result[0].t;
                                    t0_1m = t0_1m - t0_1m % 60000;
                                }

                                if (t0_1m === undefined) {
                                    lock[aggregationName].inProgress = false;
                                } else {
                                    t1_1m = t0_1m + 60000;
                                    callback(aggregation, t0_1m, t1_1m);
                                }
                            });
                        } else {
                            // the t field represents the beginning of the time slot
                            // start aggregating from the next slot
                            t0_1m = result[0].t + 60000;
                            t1_1m = t0_1m + 60000;
                            callback(aggregation, t0_1m, t1_1m);
                        }
                    });
                },
                core = function (aggregation, t0_1m, t1_1m) {
                    if (t1_1m <= lastPossibleAggregatableElementTimestamp) {
                        myLog(aggregationName, "Starting 1 minute aggregation from time: " + new Date(t0_1m));
                        aggregation[0].$match._id = {"$gte": myutils.objectIdFromDate(t0_1m), "$lt": myutils.objectIdFromDate(t1_1m)};
                        eventsDB.collection("events").aggregate(aggregation, {}, function (error, result) {
                            if (error) {
                                throw error;
                            }
                            if (result.length > 0) {
                                myLog(aggregationName, "Finished aggregating documents from the events collection into the 1 minute aggregation ... now inserting.");

                                //put _id in key
                                for (i = 0; i < result.length; i++) {
                                    if (result[i]._id !== undefined && result[i]._id !== null) {
                                        result[i].key = result[i]._id;
                                        result[i].t = t0_1m;
                                        delete result[i]._id;
                                    }
                                    else {
                                        result.splice(i, 1);
                                        i--;
                                    }
                                }
                                if (result.length > 0) {
                                    save(aggregationName, result, "1m");
                                }
                                else {
                                    save(aggregationName, new Array({t: t0_1m}), "1m");
                                }
                            }
                            else {
                                myLog(aggregationName, "Still inserting an empty entry with t :" + t0_1m + " so we can keep track of what ran when");
                                //noinspection JSLint
                                save(aggregationName, new Array({t: t0_1m}), "1m");
                            }
                            executeAggregationCore5m(aggregation, aggregationName, t0_1m);
                        });
                    }
                    else {
                        lock[aggregationName].inProgress = false;
                    }
                };

            determineTimestamps(core);
        },

        createCappedCollectionsForAggregation = function (aggregationName) {
            var intervals = ["1m", "5m", "1h"],
                createCollection = function (callback, i) {
                    if (intervals[i] === undefined) {
                        lock[aggregationName].collectionsCreated = 1;
                    }
                    else {
                        aggregationsDB.collectionNames(aggregationName + "_" + intervals[i], {}, function (error, results) {
                            if (error) {
                                myLog(aggregationName, "Error: " + util.inspect(error));
                            } else {
                                if (results.length === 0) {
                                    //noinspection JSLint,JSUnusedLocalSymbols
                                    aggregationsDB.createCollection(aggregationName + "_" + intervals[i], {capped: true, autoIndexId: true, size: mongoConfigs.aggregations.collectionSize}, function (error, result) {
                                        if (error) {
                                            myLog(aggregationName, "Error: " + util.inspect(error));
                                        } else {
                                            myLog(aggregationName, "Created capped collection " + aggregationName + "_" + intervals[i] + " with a size of " + mongoConfigs.aggregations.collectionSize + " ...");
                                        }
                                        callback(callback, i + 1);
                                    });
                                }
                                else {
                                    myLog(aggregationName, "Collection " + aggregationName + "_" + intervals[i] + " already exists.");
                                    callback(callback, i + 1);
                                }
                            }
                        });
                    }
                };

            if (lock[aggregationName].collectionsCreated === 0) {
                lock[aggregationName].collectionsCreated = 0.5;
                myLog(aggregationName, "Preparing to create collections");
                createCollection(createCollection, 0);
            }
        },

        executeAggregation = function (aggregation, aggregationName) {
            myLog(aggregationName, "---***---***---***--- Starting new iteration... ---***---***---***---");
            createCappedCollectionsForAggregation(aggregationName);
            if (lock[aggregationName].inProgress !== true && lock[aggregationName].collectionsCreated === 1) {
                lock[aggregationName].inProgress = true;

                if (lock[aggregationName].collectionsCreated === 1) {
                    executeAggregationCore1m(aggregation, aggregationName, new Date().getTime());
                }
            }
            else {
                myLog(aggregationName, "Will not run as another aggregation is in progress or the capped collections are not yet in place");
            }
        },

        validateAndRunAggregation = function (aggregationObject, interval) {
            var keys = 0,
                aggregation,
                keyName,
                aggregationName,
                reagregatable = false;

            if (typeof aggregationObject === "object") {
                for (keyName in aggregationObject) {
                    if (aggregationObject.hasOwnProperty(keyName)) {
                        if (keyName !== "reaggragatable") {
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
            if (!reagregatable) {
                throw "Reaggregatable aggregations are not yet implemented";
            }

            if (keys !== 1) {
                throw "Too many keys";
            }

            if (!(aggregation && aggregation[0].$match && aggregation[0].$match.type)) {
                throw "You are missing the $match.type for aggregation " + aggregationName;
            }

            lock[aggregationName] = {};
            lock[aggregationName].collectionsCreated = 0;

            setInterval(function () {
                executeAggregation(aggregation, aggregationName);
            }, interval);
        };

    options.aggregations.forEach(function (aggregationObject) {
        validateAndRunAggregation(aggregationObject, 1000);
    });
};

