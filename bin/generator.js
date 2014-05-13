"use strict";
var options = require("./generator-config.js"),
    samples = Math.floor(options.intervalInMS / options.sampleRateInMS),
    WebSocket = require("ws"),
    ws = new WebSocket('ws://www.host.com/path');

function rnd_snd() {
    return (Math.random() * 2 - 1) + (Math.random() * 2 - 1) + (Math.random() * 2 - 1);
}

function rnd(min, max, mean, stdev) {
    var x = Math.round(rnd_snd() * stdev + mean);
    if (x < min) {
        return 0;
    }
    if (x > max) {
        return max;
    }
}

function computePacketsPerSampleInInterval(packets, samples) {
    var a = [],
        i,
        mean = options.packetsInInterval / samples,
        deviation = mean,
        remainingPackets;
    remainingPackets = packets;
    for (i = 0; i < samples; i++) {
        mean = remainingPackets / (samples - i);
        a[i] = rnd(mean, deviation);
        remainingPackets -= a[i];
    }
    return a;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendPacket() {
    var country = options.data.country[getRandomInt(0, options.data.country.length - 1)],
        gender = options.data.gender[getRandomInt(0, options.data.gender.length - 1)],
        device = options.data.device[getRandomInt(0, options.data.device.length - 1)],
        type = options.data.type[getRandomInt(0, options.data.device.type - 1)],
        ws = new WebSocket('ws://localhost:1080/1.0/event/put');

    ws.send(
        JSON.stringify({
            type: type,
            data: {
                v1: gender,
                v2: device,
                v3: country
            }})
    );
}

function sendPackets(n) {
    var i;
    for (i = 0; i < n; i++) {
        sendPacket();
    }
}

function sendForIntervals(a) {
    var i;
    for (i = 0; i < a.length; i++) {
        setTimeout(sendPackets(a[i]), i * options.sampleRateInMS);
    }
}

ws.on('open', function () {
    console.log("connected!");
});

sendForIntervals(computePacketsPerSampleInInterval)