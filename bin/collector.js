"use strict";
var options = require("./collector-config.js"),
    analytics = require("../"),
    server = analytics.server(options);

server.register = function (dbs, endpoints, options) {
    analytics.collector.register(dbs, endpoints, options);
};

server.start();
