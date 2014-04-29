"use strict";
var options = require("./collector-config.js"),
    cube = require("../"),
    server = cube.server(options);

server.register = function (dbs, endpoints, options) {
    cube.collector.register(dbs, endpoints, options);
};

server.start();
