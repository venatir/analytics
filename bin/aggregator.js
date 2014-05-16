"use strict";
var options = require("./aggregator-config.js"),
    analytics = require("../"),
    server = analytics.server(options);

server.register = function (dbs, endpoints, options) {
    analytics.aggregator.register(dbs, endpoints, options);
};

server.start();
