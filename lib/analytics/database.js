"use strict";
var mongodb = require("mongodb"),
    mongoConfigs = require("../../bin/databases-config"),
    database = module.exports = {},
    myConnect = function (url, options, name, callback) {
        mongodb.Db.connect(url, options, function (error, db) {
            callback(error, db, name);
        });
    };

database.openConnections = function (callback) {
    var mongoDBType,
        url,
        options,
        mongoConfig;

    for (mongoDBType in mongoConfigs) {
        if (mongoConfigs.hasOwnProperty(mongoDBType)) {
            mongoConfig = mongoConfigs[mongoDBType];
            url = database.configurl(mongoConfig);
            options = mongoConfig["mongo-options"] || database.configOptions(mongoConfig);
            myConnect(url, options, mongoDBType, callback);
        }
    }
};

database.configurl = function (config) {
    var user = config["mongo-username"],
        pass = config["mongo-password"],
        host = config["mongo-host"] || "localhost",
        port = config["mongo-port"] || 27017,
        name = config["mongo-database"] || "analytics",
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