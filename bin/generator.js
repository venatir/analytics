"use strict";
var options = require("./generator-config.js"),
    samples = Math.floor(options.intervalInMS / options.sampleRateInMS);

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