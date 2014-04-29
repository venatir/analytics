"use strict";
var util = require("util"),
    url = require("url"),
    http = require("http"),
    dgram = require("dgram"),
    websocket = require("ws"),
    staticModule = require("node-static"),
    database = require('./database');

// Configuration for WebSocket requests.

//var wsOptions = {
//    maxReceivedFrameSize: 0x10000,
//    maxReceivedMessageSize: 0x100000,
//    fragmentOutgoingMessages: true,
//    fragmentationThreshold: 0x4000,
//    keepalive: true,
//    keepaliveInterval: 20000,
//    assembleFragments: true,
//    disableNagleAlgorithm: true,
//    closeTimeout: 5000
//};

module.exports = function (options) {

    // Don't crash on errors.
    process.on("uncaughtException", function (error) {
        util.log("uncaught exception: " + error);
        util.log(error.stack);
    });

    var server = {},
        httpServer = http.createServer(),
        wsOptions = {server: httpServer},
        WebsocketServer = websocket.Server,
        file = new staticModule.Server("static"),
        endpoints = {ws: [], http: []},
        id = 0;

    // Register httpServer WebSocket listener with fallback.
    //    httpServer.on("upgrade", function (request, socket, head) {
    //        if ("sec-websocket-version" in request.headers) {
    //            request = new websocket.request(socket, request, wsOptions);
    //            request.readHandshake();
    //            connect(request.accept(request.requestedProtocols[0], request.origin), request.httpRequest);
    //        } else if (request.method === "GET" && /^websocket$/i.test(request.headers.upgrade) && /^upgrade$/i.test(request.headers.connection)) {
    //            wss.Connection(wss.manager, wss.options, request, socket, head);
    //        }
    //    });

    var wss = new WebsocketServer(wsOptions);
    wss.on("upgrade", function () {
        console.log("-----upgrade-----");
    });

    // Register wss WebSocket listener.
    wss.on("connection", function (socket) {
        var url = socket.upgradeReq.url;
        // Forward messages to the appropriate endpoint, or close the connection.
        var foundMatch = false;
        for (var i = -1, n = endpoints.ws.length, e; ++i < n;) {
            if ((e = endpoints.ws[i]).match(url)) {
                foundMatch = true;
            }
        }
        var connection = socket.connection;
        if (foundMatch) {
            var callback = function (response) {
                connection.sendUTF(JSON.stringify(response));
            };

            callback.id = ++id;

            // Listen for socket disconnect.
            if (e.dispatch.close) {
                socket.on("end", function () {
                    e.dispatch.close(callback);
                });
            }

            socket.on("message", function (message) {
                e.dispatch(JSON.parse(message.utf8Data || message), callback);
            });
            return;
        }
        connection.close();
    });

    // Register HTTP listener.
    httpServer.on("request", function (request, response) {
        var u = url.parse(request.url);

        // Forward messages to the appropriate endpoint, or 404.
        for (var i = -1, n = endpoints.http.length, e; ++i < n;) {
            if ((e = endpoints.http[i]).match(u.pathname, request.method)) {
                e.dispatch(request, response);

                return;
            }
        }

        // If this request wasn't matched, see if there's a static file to serve.
        request.on("end", function () {
            file.serve(request, response, function (error) {
                if (error) {
                    response.writeHead(error.status, {"Content-Type": "text/plain"});
                    response.end(error.status + "");
                }
            });
        });

        // as of node v0.10, 'end' is not emitted unless read() called
        if (request.read !== undefined) {
            request.read();
        }
    });

    server.start = function () {
        // Connect to mongodb.
        util.log("starting mongodb client");
        var dbs = [];

        database.openConnections(options, function (error, db) {
            if (error) {
                throw error;
            }
            dbs.push(db);
            if (dbs.length === options.mongo.length) {
                server.register(dbs, endpoints, options);
                if (options["http-port"] !== undefined) {
                    util.log("starting http server on port " + options["http-port"]);
                    httpServer.listen(options["http-port"]);
                    if (endpoints.udp && options["udp-port"] !== undefined) {
                        util.log("starting udp server on port " + options["udp-port"]);
                        var udp = dgram.createSocket("udp4");
                        udp.on("message", function (message) {
                            endpoints.udp(JSON.parse(message.toString("utf8")), ignore);
                        });
                        udp.bind(options["udp-port"]);
                    }
                }
            }
        });
    };

    return server;
};

function ignore() {
    // Responses for UDP are ignored; there's nowhere for them to go!
}
