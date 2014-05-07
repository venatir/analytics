"use strict";
var endpoint = require("./endpoint.js"),
    url = require("url"),
    LIMIT_MAX = 1e4,
    headers = {
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
        eventGetter = require("./event.js").getterInit(eventsDB),
        aggregationGetter = require("./aggregation.js").getterInit(aggregationsDB);

    endpoints.ws.push(
        endpoint("/1.0/event/get", eventGetter),
        endpoint("/1.0/aggregation/get", aggregationGetter)
    );

    function eventGet(request, response) {
        request = url.parse(request.url, true).query;
        var data = [];

        if (!request.hasOwnProperty('start')) {
            request.start = 0;
        }
        if ((request.hasOwnProperty('limit') && (request.limit >= LIMIT_MAX))) {
            request.limit = LIMIT_MAX;
        }

        function documentHandler(dataElem) {
            if (dataElem === null) {
                response.end(JSON.stringify(data.reverse()));
            }
            else {
                data.push(dataElem);
            }
        }

        if (eventGetter(request, documentHandler) < 0) {
            response.writeHead(400, headers);
            response.end(JSON.stringify(data[0]));
        } else {
            response.writeHead(200, headers);
        }

    }

    function aggregationGet(request, response) {
        request = url.parse(request.url, true).query;
        var data = [];

        if (!request.hasOwnProperty('start')) {
            request.start = 0;
        }
        if ((request.hasOwnProperty('limit') && (request.limit >= LIMIT_MAX))) {
            request.limit = LIMIT_MAX;
        }

        function documentHandler(dataElem) {
            if (dataElem === null) {
                response.end(JSON.stringify(data.reverse()));
            }
            else {
                data.push(dataElem);
            }
        }

        if (aggregationGetter(request, documentHandler) < 0) {
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

