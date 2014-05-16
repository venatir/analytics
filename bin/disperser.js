"use strict";
var options = require("./disperser-config.js"),
    analytics = require("../"),
    server = analytics.server(options);

server.register = function (dbs, endpoints, options) {
    analytics.disperser.register(dbs, endpoints, options);
};

server.start();
