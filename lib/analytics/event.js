"use strict";
var mongodb = require("mongodb"),
    type_re = /^[a-z][a-zA-Z0-9_]+$/,
    genericGetter = require("./genericGetter.js"),
    genericCounter = require("./genericCounter.js"),
    myutils = require("./myutils.js"),
    util = require("util"),
    mongoConfigs = require("../../bin/databases-config");

exports.putterInit = function (db, options) {
    var eventsCollectionCreated = 0,
        eventsToSave = [],
        events = [],
        collectionSize = mongoConfigs.events.collectionSize,
        bufferSize = 10000,
        bufferTimestamp = (new Date()).getTime();

    if (!myutils.isInt(collectionSize)) {
        throw "Invalid collection size: " + collectionSize;
    }
    function handle(error) {
        if (error) {
            throw error;
        }
    }

    /**
     * @param events Array
     */
    function save(events) {
        var insertedDocs;
        //implementing buffering
        if (events !== undefined) {
            if (!Array.isArray(events)) {
                console.log("Ignoring save value: " + util.inspect(events, {colors: true, depth: null}));
                return;
            }
            eventsToSave = eventsToSave.concat(events);
        }
        if ((eventsToSave.length > bufferSize) || (new Date().getTime() - bufferTimestamp > 100 && eventsToSave.length > 0)) {
            insertedDocs = eventsToSave.splice(0, bufferSize);
            db.collection("events").insert(insertedDocs, {w: 0, forceServerObjectId: true});
            bufferTimestamp = new Date().getTime();
        }
        //console.log("Got event: " + util.inspect(event, {colors: true, depth: null}));
    }

    function putter(request, messageSenderCallback) {
        var time = new Date().getTime(),
            i;

        // validations
        if (!type_re.test(request.type)) {
            messageSenderCallback({error: "invalid type"});
            return -1;
        }
        if (isNaN(time)) {
            messageSenderCallback({error: "invalid time"});
            return -1;
        }

        if (!Array.isArray(request)) {
            request = [request];
        }
        for (i = 0; i < request.length; i++) {
            //diminishing time granularity, as it is not needed and saving just the second allows us to aggregate on time
            events[i] = {t: time - time % 1000, d: request[i].data, type: request[i].type};
        }
        // If eventsCollectionCreated, save immediately.
        if (eventsCollectionCreated === 1) {
            return save(events);
        }

        // If someone is already creating the events collection
        // then append this events to the queue for later save.
        if (eventsCollectionCreated === 0.5) {
            eventsToSave = eventsToSave.concat(events);
            return;
        }
        eventsCollectionCreated = 0.5;

        // Otherwise, it's up to us to see if the collection exists
        // and save any events that have queued up in the interim!

        // First add the new events to the queue.
        eventsToSave = eventsToSave.concat(events);

        // If the events collection exists, then we assume the indexes do
        // too. Otherwise, we must create the required collections and indexes.

        db.collectionNames("events", {}, function (error, names) {
            if (error) {
                throw error;
            }
            if (names.length) {
                eventsCollectionCreated = 1;
                return save();
            }

            // Events are indexed by _id, which is natural order. (which is time)
            db.createCollection("events", {capped: true, autoIndexId: true, size: collectionSize}, function (error, result) {
                handle(error);
                eventsCollectionCreated = 1;
                save();
            });
        });
    }

    return putter;
};

exports.getterInit = function (eventsDB) {
    return genericGetter(eventsDB);
};
exports.counterInit = function (eventsDB) {
    return genericCounter(eventsDB);
};
