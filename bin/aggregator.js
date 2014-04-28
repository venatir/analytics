var options = require("./aggregator-config"),
    database = require('../lib/cube/database'),
    util = require('util');

options["mongo-database"] = options["mongo-database-events"];
database.open(options, function (err, eventsDB) {
    if (err) {
        throw err;
    }
    options["mongo-database"] = options["mongo-database-aggregations"];
    database.open(options, function (err, aggregationsDB) {
        if (err) {
            throw err;
        }

        function executeAggregation(aggregationObject) {

            //set the $gt for query in eventsDB
            var keys = 0;
            var aggregation;
            for (keyName in aggregationObject) {
                keys++;
                aggregation = aggregationObject[keyName];
            }
            if (keys != 1) {
                throw "Too many keys";
            }
            var currentTime = new Date().getTime();
            var t1 = currentTime - currentTime % 60000;
            var t0 = t1 - 60000;
            t0 = new Date(t0);
            t1 = new Date(t1);
            aggregation[0]["$match"]["t"] = {"$gte": t0, "$lt": t1};
            console.log(util.inspect(aggregation, {  depth: null, colors: true}));
            eventsDB.collection("events").aggregate(aggregation, {}, function (err, result) {
                if (err) {
                    throw err;
                }
                console.log(util.inspect(result, { depth: null, colors: true}));
                aggregationsDB.collection(keyName).insert({t: t0, d: result}, {}, function (err, result) {
                    if (err) {
                        throw err;
                    }
                });
            });


            //write to aggregationsDB
        }

        options.aggregations.forEach(function (aggregation) {
            setInterval(function () {
                executeAggregation(aggregation);
            }, 5000);

        });
    });
});
