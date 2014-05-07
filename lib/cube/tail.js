"use strict";
module.exports = function (collectionObj, filter, sort, documentParser) {
    // set MongoDB cursor options
    var cursorOptions = {
            tailable: true,
            awaitdata: true,
            numberOfRetries: -1
        },
        stream;

    if (filter === undefined) {
        filter = {};
    }
    if (sort === undefined) {
        sort = {$natural: -1};
    }

    stream = collectionObj.find(filter, cursorOptions).sort(sort).stream();

    stream.on('data', function (document) {
        documentParser(document);
    });
};