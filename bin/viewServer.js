var express = require('express'),
    util = require('util'),
    path = require('path'),
    http = require('http'),
    fs = require('fs'),
    app = express(),
    port = 3001;

app.use("/", express.static('public'));
// env

app.set('port', process.env.port || port);
app.set('views', path.join(__dirname, '/public/views'));
app.set('view engine', 'jade');
//app.use(express.bodyParser());
app.disable('x-powered-by');

/**
 * route
 */
app.get('/', function (req, res) {
    res.render('overview', {title: 'overview'});
});

app.get('/:page', function (req, res) {
    var page = req.params.page;
    res.render(page, {title: page});
});

/**
 * read fs
 */
fs.readdirSync('public').forEach(function (file) {  // iterate through every sub-folder
    if (!file.match(/(\.ico$|views)/)) {
        app.use(express.static('public/' + file));
    }
});

(function () {
    http.createServer(app).listen(app.get('port'), function (req, res) {
        util.log('View server listening on port ' + port);
    });
})();
