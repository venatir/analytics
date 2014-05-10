"use strict";
var myutils = require("./myutils.js"),
    mongodb = require("mongodb"),
    type_re = /^[a-z][a-zA-Z0-9_]+$/,
    MAX_RETURNED_RECORDS = 10000;
function customQuery(collectionObj, filter, sort, limit, batchSize, streamified, documentHandler) {
    // set MongoDB cursor options
    var cursorOptions={},
        cursor,
        stream;

    if (filter === undefined) {
        filter = {};
    }
    if (sort === undefined) {
        sort = {$natural: -1};
    }

    if (streamified) {
        cursorOptions = {
            tailable: true,
            awaitdata: true,
            numberOfRetries: -1
        };
    }

    cursor = collectionObj.find(filter, cursorOptions);
    if (streamified) {
        stream = cursor.sort({$natural: -1}).stream();
        stream.on('data', function (document) {
            documentHandler({id: document._id instanceof mongodb.ObjectID ? undefined : document._id, time: document.t, data: document.d});
        });
    }
    else {
        cursor = cursor.sort(sort).limit(limit).batchSize(batchSize);
        cursor.each(function (error, document) {
            if (documentHandler.closed) {
                //noinspection JSLint
                return cursor.close(function (error, result) {
                    if (error) {
                        throw error;
                    }
                    //do nothing
                });
            }

            if (error) {
                throw error;
            }

            // A null name indicates that there are no more results.
            if (document) {
                documentHandler({id: document._id instanceof mongodb.ObjectID ? undefined : document._id, time: document.t, data: document.d});
            }
            else {
                documentHandler(null);
            }
        });
    }
}

module.exports = function (db) {
    var collection,
        streamsByName = {};

    function open(documentHandler) {
        return !documentHandler.closed;
    }

    function getter(request, documentHandler) {

        var stream = !request.hasOwnProperty("stop"),
            start = new Date(request.start).getTime(),
            stop = stream ? undefined : (request.stop ? (new Date(request.stop)).getTime() : undefined),
            name = request.hasOwnProperty("name") ? request.name : undefined,
            type = request.hasOwnProperty("type") ? request.type : undefined,
            limit,
            sort,
            batchSize,
            filter,
            streams,
            collectionName;

        // Validate the date and type.
        if (!type_re.test(request.type)) {
            documentHandler({error: "invalid type"});
            return -1;
        }

        // Validate the dates.
        if (isNaN(start)) {
            documentHandler({error: "invalid start"});
            return -1;
        }
        if (isNaN(stop)) {
            stop = undefined;
        }

        if (!stream) {
            if (stop === undefined) {
                documentHandler({error: "invalid stop"});
                return -1;
            }
        }

        // Set an optional limit on the number of documents to return.
        sort = {_id: -1};
        batchSize = 10000;
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
                    streams.waiting.push(documentHandler);
                    customQuery(collection, filter, sort, limit, batchSize, true, documentHandler);
                }
                else {
                    if (streamsByName && collectionName) {
                        streams = streamsByName[collectionName] = {waiting: [], active: [documentHandler]};
                        customQuery(collection, filter, sort, limit, batchSize, true, function (document) {

                            // If there's an name, send it to all active, open clients.
                            if (document) {
                                streams.active.forEach(function (documentHandler) {
                                    if (!documentHandler.closed) {
                                        documentHandler(document);
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
                customQuery(collection, filter, sort, limit, batchSize, false, documentHandler);

            }
        });

    }

    getter.close = function (documentHandler) {
        documentHandler.closed = true;
    };

    return getter;
};




