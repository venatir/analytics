"use strict";
var endpoint = require("./endpoint.js"),
    url = require("url");

// To avoid running out of memory, the GET endpoints have a maximum number of
// values they can return. If the limit is exceeded, only the most recent
// results are returned.
var LIMIT_MAX = 1e4;

//
var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};
//noinspection JSLint
exports.register = function (dbs, endpoints, options) {
    if (dbs.length !== 2) {
        throw "We need to receive exactly 2(two) databases";
    }
    var eventsDB = dbs[0],
        aggregationsDB = dbs[1],
        event = require("./event.js").getter(eventsDB),
        aggregation = require("./aggregation.js").getter(aggregationsDB);

    endpoints.ws.push(
        endpoint("/1.0/event/get", event),
        endpoint("/1.0/aggregation/get", aggregation)
    );

    function eventGet(request, response) {
        request = url.parse(request.url, true).query;

        var data = [];

        // Provide default start and stop times for recent events.
        // If the limit is not specified, or too big, use the maximum limit.
        if (!request.hasOwnProperty('stop')) {
            request.stop = Date.now();
        }
        if (!request.hasOwnProperty('start')) {
            request.start = 0;
        }
        if ((request.hasOwnProperty('limit') && (+request.limit <= LIMIT_MAX)) || (!request.hasOwnProperty('limit'))) {
            request.limit = LIMIT_MAX;
        }

        function callback(dataElem) {
            if (dataElem === null) {
                response.end(JSON.stringify(data.reverse()));
            }
            else {
                data.push(dataElem);
            }
        }

        if (event(request, callback) < 0) {
            response.writeHead(400, headers);
            response.end(JSON.stringify(data[0]));
        } else {
            response.writeHead(200, headers);
        }

    }

    function aggregationGet(request, response) {
        request = url.parse(request.url, true).query;

        var data = [];

        // Provide default start and stop times for recent events.
        // If the limit is not specified, or too big, use the maximum limit.
        if (!request.hasOwnProperty('stop')) {
            request.stop = Date.now();
        }
        if (!request.hasOwnProperty('start')) {
            request.start = 0;
        }
        if ((request.hasOwnProperty('limit') && (+request.limit <= LIMIT_MAX)) || (!request.hasOwnProperty('limit'))) {
            request.limit = LIMIT_MAX;
        }

        function callback(data) {
            if (data === null) {
                response.end(JSON.stringify(data.reverse()));
            }
            else {
                data.push(data);
            }
        }

        if (aggregation(request, callback) < 0) {
            response.writeHead(400, headers);
            response.end(JSON.stringify(data[0]));
        } else {
            response.writeHead(200, headers);
        }

    }

    endpoints.http.push(
        endpoint("GET", "/1.0/event/get", eventGet),
        endpoint("GET", "/1.0/aggregation/get", aggregationGet)
    );

};

