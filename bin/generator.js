"use strict";
var options = require("./generator-config.js"),
    samples = Math.floor(options.intervalInMS / options.sampleRateInMS),
    WS = require("ws"),
    ws = new WS('ws://localhost:1080/1.0/event/put'),
    randomTools = {
        basicGaussianRandom: function () {
            return (Math.random() * 2 - 1) + (Math.random() * 2 - 1) + (Math.random() * 2 - 1);
        },

        gaussianRandom: function (min, max, mean, stdev) {
            var x = Math.round(this.basicGaussianRandom() * stdev + mean);
            if (x < min) {
                return 0;
            }
            if (x > max) {
                return max;
            }
            return x;
        },

        getRandomInt: function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },
    packetGenerator = {
        computePacketsPerSampleInInterval: function (packets, samples) {
            var a = [],
                i,
                mean = options.packetsInInterval / samples,
                deviation = mean,
                remainingPackets;
            remainingPackets = packets;
            for (i = 0; i < samples; i++) {
                mean = remainingPackets / (samples - i);
                a[i] = randomTools.gaussianRandom(0, remainingPackets, mean, deviation);
                remainingPackets -= a[i];
            }
            return a;
        },
        sendPacket: function () {
            var country = options.data.country[randomTools.getRandomInt(0, options.data.country.length - 1)],
                gender = options.data.gender[randomTools.getRandomInt(0, options.data.gender.length - 1)],
                device = options.data.device[randomTools.getRandomInt(0, options.data.device.length - 1)],
                type = options.data.type[randomTools.getRandomInt(0, options.data.type.length - 1)],
                packet = JSON.stringify({
                    type: type,
                    data: {
                        v1: gender,
                        v2: device,
                        v3: country
                    }
                });
            console.log(packet);
            ws.send(packet);
        },
        sendPackets: function (n) {
            var i;
            for (i = 0; i < n; i++) {
                this.sendPacket();
            }
        },

        sendForPacketsForInterval: function (arrayOfPacketsInInterval) {
            var i;
            for (i = 0; i < arrayOfPacketsInInterval.length; i++) {
                setTimeout(this.sendPackets(arrayOfPacketsInInterval[i]), i * options.sampleRateInMS);
            }
        }
    };

ws.on('open', function () {
    console.log("connected!");
    var arrayOfPacketsInInterval = packetGenerator.computePacketsPerSampleInInterval(options.packetsInInterval, samples);
    packetGenerator.sendForPacketsForInterval(arrayOfPacketsInInterval);
});

