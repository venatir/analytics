"use strict";
var options = require("./disperser-config.js"),
    cube = require("../"),
    server = cube.server(options);

server.register = function(db, endpoints) {
    cube.disperser.register(db, endpoints);
};

server.start();
