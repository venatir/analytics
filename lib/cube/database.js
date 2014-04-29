"use strict";
var mongodb = require("mongodb");

var database = module.exports = {};

database.openConnections = function (config, callback) {
    var mongoConfigs = config.mongo;
    if (Array.isArray(mongoConfigs)) {
        throw "Bad configuration of mongo";
    }
    mongoConfigs.forEach(function (mongoConfig) {
        var url = database.configurl(mongoConfig),
            options = mongoConfig["mongo-options"] || database.configOptions(mongoConfig);
        mongodb.Db.connect(url, options, callback);
    });
};

database.configurl = function (config) {
    var user = config["mongo-username"],
        pass = config["mongo-password"],
        host = config["mongo-host"] || "localhost",
        port = config["mongo-port"] || 27017,
        name = config["mongo-database"] || "cube",
        auth = user ? user + ":" + pass + "@" : "";
    return "mongodb://" + auth + host + ":" + port + "/" + name;
};

database.configOptions = function (config) {
    return {
        db: config["mongo-database-options"] || { safe: false },
        server: config["mongo-server-options"] || { auto_reconnect: true },
        replSet: { read_secondary: true }
    };
};