"use strict";
var endpoint = require("./endpoint.js");

var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

function post(putter) {
    return function (request, response) {
        var content = "";
        request.on("data", function (chunk) {
            content += chunk;
        });
        request.on("end", function () {
            try {
                JSON.parse(content).forEach(putter);
            } catch (e) {
                response.writeHead(400, headers);
                response.end(JSON.stringify({error: e.toString()}));
                return;
            }
            response.writeHead(200, headers);
            response.end("{}");
        });
    };
}

//noinspection JSLint
exports.register = function (dbs, endpoints, options) {
    var db = dbs.events,
        putter = require("./event.js").putterInit(db, options),
        poster = post(putter);

    endpoints.ws.push(
        endpoint("/1.0/event/put", putter)
    );

    endpoints.http.push(
        endpoint("POST", "/1.0/event/put", poster)
    );

    endpoints.udp = putter;
};
