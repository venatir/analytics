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
exports.register = function (db, endpoints, options) {
    var event = require("./event").getter(db);

    endpoints.ws.push(endpoint("/1.0/event/get", event));

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

        function callback(d) {
            if (d === null) {
                response.end(JSON.stringify(data.reverse()));
            }
            else {
                data.push(d);
            }
        }

        if (event(request, callback) < 0) {
            response.writeHead(400, headers);
            response.end(JSON.stringify(data[0]));
        } else {
            response.writeHead(200, headers);
        }

    }

    function typesGet(request, response) {
        types(url.parse(request.url, true).query, function (data) {
            response.writeHead(200, headers);
            response.end(JSON.stringify(data));
        });
    }

    endpoints.http.push(
        endpoint("GET", "/1.0/event", eventGet),
        endpoint("GET", "/1.0/event/get", eventGet),
        endpoint("GET", "/1.0/types", typesGet),
        endpoint("GET", "/1.0/types/get", typesGet)
    );

};

