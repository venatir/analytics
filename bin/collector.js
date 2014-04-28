var options = require("./collector-config");
var cube = require("../");
var server = cube.server(options);

server.register = function (db, endpoints) {
    cube.collector.register(db, endpoints);
};

server.start();
