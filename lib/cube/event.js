"use strict";
var mongodb = require("mongodb"),
    type_re = /^[a-z][a-zA-Z0-9_]+$/;

exports.putter = function (db) {
    var eventsCollectionCreated = 0,
        eventsToSave = [],
        event;

    function handle(error) {
        if (error) {
            throw error;
        }
    }

    function save(event) {
        db.collection("events").save(event, handle);
    }

    function putter(request, callback) {
        var time = request.hasOwnProperty("time") ? new Date(request.time) : new Date();

        function saveEvents() {
            eventsToSave.forEach(function (event) {
                save(event);
            });
            eventsToSave = [];
        }

        // Validate the date and type.
        if (!type_re.test(request.type)) {
            callback({error: "invalid type"});
            return -1;
        }
        if (isNaN(time)) {
            callback({error: "invalid time"});
            return -1;
        }

        // If an id is specified, promote it to Mongo's primary key.
        event = {t: time, d: request.data, type: request.type};
        if (request.hasOwnProperty("id")) {
            event._id = request.id;
        }
        // If eventsCollectionCreated, save immediately.
        if (eventsCollectionCreated === 1) {
            return save(event);
        }

        // If someone is already creating the event collection
        // then append this event to the queue for later save.
        if (eventsCollectionCreated === 0.5) {
            return eventsToSave.push(event);
        }
        eventsCollectionCreated = 0.5;

        // Otherwise, it's up to us to see if the collection exists, verify the
        // associated indexes and save
        // any events that have queued up in the interim!

        // First add the new event to the queue.
        eventsToSave.push(event);

        // If the events collection exists, then we assume the indexes do
        // too. Otherwise, we must create the required collections and indexes.

        db.collectionNames("events", {}, function (error, names) {
            if (error) {
                throw error;
            }
            if (names.length) {
                eventsCollectionCreated = 1;
                return saveEvents();
            }
            var events = db.collection("events");

            // Events are indexed by time.
            events.ensureIndex({"t": 1}, handle);
            eventsCollectionCreated = 1;
            saveEvents();
        });
    }

    return putter;
};

function open(callback) {
    return !callback.closed;
}
