"use strict";
var options = require("./disperser-config.js"),
    cube = require("../"),
    server = cube.server(options);

server.register = function (dbs, endpoints, options) {
    cube.disperser.register(dbs, endpoints, options);
};

server.start();
