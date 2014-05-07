"use strict";
var mongodb = require("mongodb"),
    util = require("util"),
    type_re = /^[a-z][a-zA-Z0-9_]+$/,
    STREAM_DEFAULT_DELAY = 60000,
    STREAM_INTERVAL = 20000;

//exports.putterInit = function (db) {
//    var eventsCollectionCreated = 0,
//        eventsToSave = [],
//        event;
//
//    function handle(error) {
//        if (error) {
//            throw error;
//        }
//    }
//
//    function save(event) {
//        db.collection("events").insert(event, {w: 0});
//    }
//
//    function putterInit(request, callback) {
//        var time = request.hasOwnProperty("time") ? new Date(request.time) : new Date();
//
//        function saveEvents() {
//            eventsToSave.forEach(function (event) {
//                save(event);
//            });
//            eventsToSave = [];
//        }
//
//        // Validate the date and type.
//        if (!type_re.test(request.type)) {
//            callback({error: "invalid type"});
//            return -1;
//        }
//        if (isNaN(time)) {
//            callback({error: "invalid time"});
//            return -1;
//        }
//
//        // If an id is specified, promote it to Mongo's primary key.
//        event = {t: time, d: request.data, type: request.type};
//        if (request.hasOwnProperty("id")) {
//            event._id = request.id;
//        }
//        // If eventsCollectionCreated, save immediately.
//        if (eventsCollectionCreated === 1) {
//            return save(event);
//        }
//
//        // If someone is already creating the event collection
//        // then append this event to the queue for later save.
//        if (eventsCollectionCreated === 0.5) {
//            return eventsToSave.push(event);
//        }
//        eventsCollectionCreated = 0.5;
//
//        // Otherwise, it's up to us to see if the collection exists, verify the
//        // associated indexes and save
//        // any events that have queued up in the interim!
//
//        // First add the new event to the queue.
//        eventsToSave.push(event);
//
//        // If the events collection exists, then we assume the indexes do
//        // too. Otherwise, we must create the required collections and indexes.
//
//        db.collectionNames("events", {}, function (error, names) {
//            if (error) {
//                throw error;
//            }
//            if (names.length) {
//                eventsCollectionCreated = 1;
//                return saveEvents();
//            }
//            var events = db.collection("events");
//
//            // Events are indexed by time.
//            events.ensureIndex({"t": 1}, handle);
//            eventsCollectionCreated = 1;
//            saveEvents();
//        });
//    }
//
//    return putterInit;
//};

exports.getterInit = function (aggregationDB) {
    var collection,// = eventsDB.collection("events"),
        streamsBySource = {};

    function open(callback) {
        return !callback.closed;
    }

    function getter(request, callback) {
        var stream = !request.hasOwnProperty("stop"),
            start = new Date(request.start).getTime(),
            stop = stream ? undefined : (request.stop ? (new Date(request.stop)).getTime() : undefined),
            aggregation = request.hasOwnProperty("aggregation") ? request.aggregation : undefined,
            frequency = request.hasOwnProperty("frequency") ? request.frequency : "1m",
            options,
            match,
            streams,
            collectionName;

        if (frequency !== "5m" && frequency !== "1m") {
            callback({error: "invalid frequency"});
            return -1;
        }
        // Validate the dates.
        if (isNaN(start)) {
            callback({error: "invalid start"});
            return -1;
        }
        if (!stream) {
            if (stop === undefined || isNaN(stop)) {
                callback({error: "invalid stop"});
                return -1;
            }
            stop = new Date(stop);
        }
        start = new Date(start);

        // Set an optional limit on the number of aggregations to return.
        options = {sort: {_id: -1}, batchSize: 10000};
        if (request.hasOwnProperty("limit")) {
            options.limit = +request.limit;
        }

        // Copy any expression filters into the match object.
        match = {t: {$gte: start, $lt: stop}};

        /*jslint todo: true */
        // TODO: validate collection name exists- based on aggregation name
        collectionName = aggregation + "_" + frequency;

        aggregationDB.collectionNames(collectionName, {}, function (err, result) {
            if (err) {
                throw  err;
            }
            if (result.length !== 1) {
                throw "The number of results for " + collectionName + " is different than 1";
            }

        });

        collection = aggregationDB.collection(collectionName);

        // Query for the desired aggregations.
        function query(callback) {
            console.log(new Error().stack.split("\n")[1].split("(")[1].split(")")[0]);
            collection.find(match, {}, options, function (error, cursor) {
                if (error) {
                    throw error;
                }
                cursor.each(function (error, aggregation) {

                    // If the callback is closed (i.e., if the WebSocket connection was
                    // closed), then abort the query. Note that closing the cursor mid-
                    // loop causes an error, which we subsequently ignore!
                    if (callback.closed) {
                        return cursor.close();
                    }

                    if (error) {
                        throw error;
                    }

                    // A null aggregation indicates that there are no more results.
                    if (aggregation) {
                        console.log(util.inspect(aggregation));
                        callback({id: aggregation._id instanceof mongodb.ObjectID ? undefined : aggregation._id, time: aggregation.t, data: aggregation.d});
                    }
                    else {
                        callback(null);
                    }
                });
            });
        }

        // For streaming queries, share streams for efficient polling.
        if (stream && aggregation && streamsBySource) {
            streams = streamsBySource[aggregation];

            // If there is an existing stream to attach to, backfill the initial set
            // of results to catch the client up to the stream. Add the new callback
            // to a queue, so that when the shared stream finishes its current poll,
            // it begins notifying the new client. Note that we don't pass the null
            // (end terminator) to the callback, because more results are to come!
            if (streams && streams.time && streams.waiting && Array.isArray(streams.waiting)) {
                match.t.$lt = streams.time;
                streams.waiting.push(callback);
                query(function (aggregation) {
                    if (aggregation) {
                        callback(aggregation);
                    }
                });
            }

            // Otherwise, we're creating a new stream, so we're responsible for
            // starting the polling loop. This means notifying active callbacks,
            // detecting when active callbacks are closed, advancing the time window,
            // and moving waiting clients to active clients.
            else {
                if (streamsBySource && aggregation) {
                    streams = streamsBySource[aggregation] = {time: stop, waiting: [], active: [callback]};
                    (function poll() {
                        query(function (aggregation) {

                            // If there's an aggregation, send it to all active, open clients.
                            if (aggregation) {
                                streams.active.forEach(function (callback) {
                                    if (!callback.closed) {
                                        callback(aggregation);
                                    }
                                });
                            }

                            // Otherwise, we've reached the end of a poll, and it's time to
                            // merge the waiting callbacks into the active callbacks. Advance
                            // the time range, and set a timeout for the next poll.
                            else {
                                streams.active = streams.active.concat(streams.waiting).filter(open);
                                streams.waiting = [];

                                // If no clients remain, then it's safe to delete the shared
                                // stream, and we'll no longer be responsible for polling.
                                if (!streams.active.length) {
                                    delete streamsBySource[aggregation];
                                    return;
                                }

                                match.t.$gte = streams.time;
                                match.t.$lt = streams.time = new Date(Date.now() - delay);
                                setTimeout(poll, STREAM_INTERVAL);
                            }
                        });
                    }());
                }
            }
        }

        // For non-streaming queries, just send the single batch!
        else {
            query(callback);
        }
    }

    getter.close = function (callback) {
        callback.closed = true;
    };

    return getter;
};

