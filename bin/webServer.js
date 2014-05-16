"use strict";
var express = require('express'),
    util = require('util'),
    path = require('path'),
    http = require('http'),
    fs = require('fs'),
    app = express(),
    port = 3001,
    i;

app.use("/", express.static('public'));
// env

app.set('port', process.env.port || port);
app.set('views', path.join(__dirname, '/public/views'));
app.set('view engine', 'jade');
app.disable('x-powered-by');

//routes
app.get('/', function (req, res) {
    res.render('overview', {title: 'overview'});
});

app.get('/:page', function (req, res) {
    var page = req.params.page;
    res.render(page, {title: page});
});

//public dir
fs.readdir("public", function (err, files) {
    if (err) {
        throw  err;
    }
    for (i = 0; i < files.length; i++) {
        if (!files[i].match(/(\.ico$|views)/)) {
            app.use(express.static('public/' + files[i]));
        }
    }
});

(function () {
    http.createServer(app).listen(app.get('port'), function (req, res) {
        util.log('View server listening on port ' + port);
    });
}());
