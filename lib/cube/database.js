var mongodb = require("mongodb");

var database = module.exports = {};

database.open = function (config, callback) {
    var url = config["mongo-url"] || database.configurl(config),
        options = config["mongo-options"] || database.configOptions(config);
    return mongodb.Db.connect(url, options, callback);
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