"use strict";

var options = require("./aggregator-config"),
    cube = require("../"),
    server = cube.server(options);

server.register = function (dbs, endpoints, options) {
    cube.aggregator.register(dbs, endpoints, options);
};

server.start();
