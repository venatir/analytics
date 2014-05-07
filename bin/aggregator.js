"use strict";
var options = require("./aggregator-config.js"),
    cube = require("../"),
    server = cube.server(options);

server.register = function (dbs, endpoints, options) {
    cube.aggregator.register(dbs, endpoints, options);
};

server.start();
