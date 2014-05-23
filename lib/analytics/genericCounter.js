"use strict";
var myutils = require("./myutils.js"),
    mongodb = require("mongodb"),
    type_re = /^[a-z][a-zA-Z0-9_]+$/,
    MAX_RETURNED_RECORDS = 10000,
    util = require("util");
function customQuery(collectionObj, filter, limit, streamified, messageSender) {
    var temp;
    if (filter === undefined) {
        filter = {};
    }
    if (limit === undefined) {
        limit = MAX_RETURNED_RECORDS;
    }

    collectionObj.aggregate([
            {
                "$match": filter
            },
            {
                "$group": {
                    "_id": "$t",
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                "$sort": {
                    _id: 1
                }
            },
            {
                $limit: limit
            }
        ],
        {},
        function (error, result) {
            if (error) {
                throw error;
            }
            messageSender(result);
            if (streamified) {
                // this is hardcoded, but with good reason. In a stream, we only provide 5 seconds back.
                // We do not provide just the last second as there can be additional updates happening in the database
                // If 5 seconds is not enough, the DB is screwed anyway
                limit = 5;
                setTimeout(
                    function () {
                        //move filter to cover just the last 5 seconds
                        temp = new Date().getTime();
                        temp = temp - temp % 1000 - 5000;
                        filter._id.$gte= myutils.objectIdFromDate(temp);
                        filter._id.$lt= myutils.objectIdFromDate(temp+1000);
                        customQuery(collectionObj, filter, limit, streamified, messageSender);
                    },
                    1000
                );
            }
        });
}

module.exports = function (db) {
    var collection,
        streamsByName = {};

    function open(messageSender) {
        return !messageSender.closed;
    }

    function counter(request, messageSender) {

        var stream = !request.hasOwnProperty("stop"),
            start = new Date(request.start).getTime(),
            stop = stream ? undefined : (request.stop ? (new Date(request.stop)).getTime() : undefined),
            name = request.hasOwnProperty("name") ? request.name : undefined,
            type = request.hasOwnProperty("type") ? request.type : undefined,
            limit,
            filter,
            streams,
            collectionName;

        // Validate the date and type.
        if (!type_re.test(request.type)) {
            messageSender({error: "invalid type"});
            return -1;
        }

        // Validate the dates.
        if (isNaN(start)) {
            messageSender({error: "invalid start"});
            return -1;
        }
        if (isNaN(stop)) {
            stop = undefined;
        }

        if (!stream) {
            if (stop === undefined) {
                messageSender({error: "invalid stop"});
                return -1;
            }
        }

        // Set an optional limit on the number of documents to return.
        if (request.hasOwnProperty("limit")) {
            limit = request.limit;
        }

        if (limit !== undefined || limit > MAX_RETURNED_RECORDS) {
            limit = MAX_RETURNED_RECORDS;
        }

        // Copy any expression filters into the match object.
        filter = {_id: {$gte: myutils.objectIdFromDate(start)}};
        if (stop !== undefined) {
            filter._id.$lt = myutils.objectIdFromDate(stop);
        }

        if (name === undefined) {
            collectionName = "events";
            if (type !== undefined) {
                filter.type = type;
            }
            else {
                throw "We cannot query events without a type";
            }
        } else {
            collectionName = name;
        }

        db.collectionNames(collectionName, {}, function (err, result) {
            if (err) {
                throw  err;
            }
            if (result.length !== 1) {
                throw "The number of results for collection: " + collectionName + " is different than 1";
            }
            collection = db.collection(collectionName);

            // For streaming queries, share streams for efficient polling.
            if (stream && collectionName && streamsByName) {
                streams = streamsByName[collectionName];

                if (streams && streams.waiting && Array.isArray(streams.waiting)) {
                    streams.waiting.push(messageSender);
                    customQuery(collection, filter, limit, true, messageSender);
                }
                else {
                    if (streamsByName && collectionName) {
                        streams = streamsByName[collectionName] = {waiting: [], active: [messageSender]};
                        customQuery(collection, filter, limit, true, function (document) {

                            // If there's a name, send it to all active, open clients.
                            if (document) {
                                streams.active.forEach(function (messageSender) {
                                    if (!messageSender.closed) {
                                        messageSender(document);
                                    }
                                });
                            }
                            else {
                                streams.active = streams.active.concat(streams.waiting).filter(open);
                                streams.waiting = [];

                                // If no clients remain, then it's safe to delete the shared
                                // stream, and we'll no longer be responsible for polling.
                                if (!streams.active.length) {
                                    delete streamsByName[collectionName];
                                }
                            }
                        });
                    }
                }
            }
            else {
                customQuery(collection, filter, limit, false, messageSender);

            }
        });

    }

    counter.close = function (messageSender) {
        messageSender.closed = true;
    };

    return counter;
};




