"use strict";
var util = require("util"),
    url = require("url"),
    http = require("http"),
    dgram = require("dgram"),
    websocket = require("ws"),
    staticModule = require("node-static"),
    database = require('./database.js');

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

function ignore() {
    console.log("Ignoring...");
    // Responses for UDP are ignored; there's nowhere for them to go!
}

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
        id = 0,
        wss = new WebsocketServer(wsOptions);

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

    wss.on("upgrade", function () {
        console.log("-----upgrade-----");
    });

    // Register wss WebSocket listener.
    wss.on("connection", function (socket) {
        var url = socket.upgradeReq.url,
            foundMatch = false,
            i,
            n,
            endpoint,
            messageSender;

        // Forward messages to the appropriate endpoint, or close the connection.
        n = endpoints.ws.length;
        for (i = 0; i < n; i++) {
            if ((endpoint = endpoints.ws[i]).match(url)) {
                foundMatch = true;
                break;
            }
        }
        if (foundMatch) {
            messageSender = function (response) {
                socket.send(JSON.stringify(response));
            };

            messageSender.id = ++id;

            // Listen for socket disconnect.
            if (endpoint.dispatch.close) {
                socket.on("end", function () {
                    endpoint.dispatch.close(messageSender);
                });
            }

            socket.on("message", function (message) {
                console.log("Got message: " + message);
                console.log("Current WS status is " + socket.readyState);
                endpoint.dispatch(JSON.parse(message), messageSender);
            });
            return;
        }
        socket.close();
    });

    // Register HTTP listener.
    httpServer.on("request", function (request, response) {
        var u = url.parse(request.url),
            i,
            n,
            endpoint;

        // Forward messages to the appropriate endpoint, or 404.
        n = endpoints.http.length;
        for (i = 0; i < n; i++) {
            if ((endpoint = endpoints.http[i]).match(u.pathname, request.method)) {
                endpoint.dispatch(request, response);
                return;
            }
        }

        // If this request wasn't matched, see if there's a static file to serve.
        request.on("end", function () {
            file.serve(request, response, function (error) {
                if (error) {
                    response.writeHead(error.status, {"Content-Type": "text/plain"});
                    //noinspection JSLint
                    response.end(error.status + "");
                }
            });
        });

        // as of node v0.10, 'end' is not emitted unless read() called
        if (request.read !== undefined) {
            request.read();
        }
    });

    server.dbLength = 0;
    server.start = function () {
        // Connect to mongodb.
        util.log("starting mongodb client");
        var dbs = {};

        database.openConnections(function (error, db, name) {
            if (error) {
                throw error;
            }
            dbs[name] = db;
            server.dbLength++;
            if (server.dbLength === 2) {
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
