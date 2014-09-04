"use strict";
/*global nv*/
/*global d3*/
/*global dc*/
/*global $*/
/*global WebSocket*/
/*global document*/
/*global crossfilter*/
/*global window*/
var myUtils = {
    createElem: function (type, attrs, text) {
        var elem = document.createElement(type),
            attr;

        if (attrs !== undefined && attrs instanceof Object) {
            for (attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    elem[attr] = attrs[attr];
                }
            }
        }

        if (text !== undefined) {
            elem.innerText = text;
        }

        return elem;
    }
};

function Chart(config) {
    var that = this;
    this.addCharts = function (callback) {

        this.chart.width($("#" + this.chartAnchor).width())
            .height(250)
            .margins({top: 10, right: 30, bottom: 60, left: 60})
            .dimension(this.dimensionTime)
            .group(this.dimensionTimeGroup)
            .elasticY(true)
            // (optional) whether bar should be center to its x value. Not needed for ordinal chart, :default=false
            .centerBar(true)
            // (optional) set gap between bars manually in px, :default=2
            .gap(1)
            // (optional) set filter brush rounding
            .round(dc.round.floor)
            //            .alwaysUseRounding(true)
            .x(d3.scale.linear().domain([new Date().getTime() - config.chartParams.length, new Date().getTime()]))
            .renderHorizontalGridLines(true);
        this.formatChart();
        // customize the filter displayed in the control span
        //            .filterPrinter(function (filters) {
        //                var filter = filters[0], s = "";
        //                s += numberFormat(filter[0]) + "% -> " + numberFormat(filter[1]) + "%";
        //                return s;
        //            });

        if (callback) {
            callback();
        }
    };
    this.initSocket = function (callback) {
        this.socket = new WebSocket(config.chartParams.wsAddress);
        this.socket.onopen = function () {
            console.log(config.name + ": connected to " + config.chartParams.wsAddress);
            that.socket.send(JSON.stringify(that.socketPacket));
        };
        this.socket.onmessage = function (message) {
            var events;
            if (message) {
                if (message.data) {
                    events = JSON.parse(message.data);
                    if (events && (events.d || events.count || events.length)) {
                        //console.log(config.name + ": events " + events.toString());
                        that.dataHandler(events);
                    }
                }
            }
        };
        this.socket.onclose = function () {
            console.log(config.name + ": closed");
        };
        this.socket.onerror = function (error) {
            console.log(config.name + ": error", error);
        };
        if (callback) {
            callback();
        }
    };
    this.initHtml = function (callback) {
        if ($(this.chartAnchor + ' svg').length === 0) {  // create svg
            $("#charts")
                .append(myUtils.createElem('div', {id: this.chartAnchor}));
            $("#" + this.chartAnchor)
                .append(myUtils.createElem('h2', {className: 'title'}, config.name))  // title
                .append(myUtils.createElem('div', {className: 'control'}))  // for control buttons
                .append('<svg/>');  // svg for chart
        }

        if (callback) {
            callback();
        }
    };
    this.refreshAll = function () {
        var control,
            i,
            selectElem,
            optionElem;
        control = $("#" + this.chartAnchor + ' .control');
        control.append(myUtils.createElem('p'));

        if (this.dimensions && Array.isArray(this.dimensions)) {
            for (i = 0; i < this.dimensions.length; i++) {
                if ($('#' + this.chartAnchor + "-" + this.dimensions[i].name).length == 0) {
                    selectElem = myUtils.createElem('select', {className: 'select', id: this.chartAnchor + "-" + this.dimensions[i].name});
                    selectElem.add(myUtils.createElem('option', {"value": 'all'}, 'All'));  // add all selector
                    this.dimensions[i].dimension.group().all().map(function (d) {// get unique elements of the dimension
                        return d.key;
                    }).forEach(function (d) {
                        selectElem.add(myUtils.createElem('option', {"value": d}, d));
                    });
                    control.append(selectElem);
                }
            }
        }

        that.refreshChart();
    };
    this.setChartAnchor = function (chartAnchor) {
        //noinspection JSLint
        chartAnchor = chartAnchor.toLocaleLowerCase().replace(/[^a-z0-9]/g, "_");
        this.chartAnchor = chartAnchor;
        console.log(config.name + ": chartAnchor is set to " + this.chartAnchor);
    };
    this.pause = function () {
        clearInterval(that.intervalHandle);
    };
    this.resume = function () {
        setTimeout(function () {
            that.intervalHandle = setInterval(function () {
                that.refreshAll();
            }, config.refreshFrequency);
        }, 1e3);
    };
    this.chartAnchor = '';
    this.socket = null;
    if (config.chartParams.stop instanceof Date) {
        this.socketPacket.stop = config.chartParams.stop;
    }
    this.intervalHandle = 0;
    this.start = function () {
        this.setChartAnchor(config.name);
        that.initHtml(function () {
            that.initCustomForChart(function () {
                that.addCharts(function () {
                    that.initSocket(function () {
                        that.resume();
                    });
                });
            });
        });
    };
    this.dimensions = [];
    this.initCustomForChart = function (callback) {
        var i,
            temp;
        this.chart = dc.barChart("#" + this.chartAnchor);
        this.crossfilter = crossfilter();
        for (i in config.chartParams.dimensionsNames) {
            if (config.chartParams.dimensionsNames.hasOwnProperty(i)) {

                temp = {};
                temp.name = i;
                /*jshint -W083 */
                //noinspection JSLint
                (function (i, temp) {
                    temp.dimension = that.crossfilter.dimension(
                        function (d) {
                            return d[i];
                        }
                    );
                    temp.dimensionGroup = temp.dimension.group();
                    that.dimensions.push(temp);
                }(i, temp));
            }
        }
        this.dimensionTime = this.crossfilter.dimension(function (d) {
            return d.t;
        });
        this.dimensionTimeGroup = this.dimensionTime.group().reduceSum(function (d) {
            return d.count; //TODO: make this variable
        });

        if (callback) {
            callback();
        }
    };
    this.refreshChart = function (callback) {
        this.chart.x(d3.scale.linear().domain([new Date().getTime() - config.chartParams.length, new Date().getTime()]));
        this.chart.render();
        if (callback) {
            callback();
        }
    };
    this.dataHandler = function (doc) {
        var i;

        if (doc) {
            //format the doc in data to match crossfilter style
            for (i in doc.d) {
                if (doc.d.hasOwnProperty(i)) {
                    doc[i] = doc.d[i];
                }
            }
            delete doc.d;
            this.crossfilter.add([doc]);

            config.cutOff = new Date().getTime();
            config.cutOff = config.cutOff - config.length;
            this.dimensionTime.filterFunction(function (d) {
                return d < config.cutOff;
            });
            this.crossfilter.remove();
            this.dimensionTime.filterAll();
            //            this.refreshAll();
        }
    };

}

function EventsChart(config) {
    //defining dataHandler,chart and addCharts
    this.socketPacket = {
        type: config.chartParams.query.type,
        start: config.chartParams.start
    };
    this.formatChart = function () {
        this.chart.xAxis().tickFormat(function (d) {
            return ("0" + new Date(d).getMinutes()).substr(-2) + ":" + ("0" + new Date(d).getSeconds()).substr(-2);
        });
    };
    //applying the upper level constructor
    this.baseClass = Chart;
    this.baseClass(config);
}
EventsChart.prototype = Chart;

function AggregatedChart(config) {
    //defining dataHandler,chart and addCharts
    this.socketPacket = {
        name: config.chartParams.query.name,
        start: config.chartParams.start
    };
    this.formatChart = function () {
        this.chart.xAxis().tickFormat(function (d) {
            return ("0" + new Date(d).getHours()).substr(-2) + ":" + ("0" + new Date(d).getMinutes()).substr(-2);
        });
    };

    //applying the upper level constructor
    this.baseClass = Chart;
    this.baseClass(config);
}
AggregatedChart.prototype = Chart;

var chartsConfig = [
        {
            name: "Web Banner Impressions",
            chartType: "AggregatedChart", //can be "EventsChart" or "AggregatedChart" - meaning one or multiple dimensions
            renderingType: "xxx", //choose a style
            chartParams: {
                length: 3 * 3600 * 1e3, //1 hour
                wsAddress: "ws://" + window.location.hostname + ":1081/1.0/aggregation/get",
                query: {name: "web_banners_impressions_1m"},
                start: new Date(new Date().getTime() - 3 * 3600 * 1e3), //miliseconds ago
                stop: null, //null for a streaming chart
                dimensionsNames: {
                    "v1": "pagetype",
                    "v2": "gender"
                },
                dimensionOptions: {
                    "v1": [
                        "eu1",
                        "eu2"
                    ],
                    "v2": [
                        "type"
                    ]
                }
            },
            refreshFrequency: 30 * 1e3
        },
        {
            name: "Mobile Banner Impressions",
            chartType: "AggregatedChart", //can be "EventsChart" or "AggregatedChart" - meaning one or multiple dimensions
            renderingType: "xxx", //choose a style
            chartParams: {
                length: 3 * 3600 * 1e3, //1 hour
                wsAddress: "ws://" + window.location.hostname + ":1081/1.0/aggregation/get",
                query: {name: "mobile_banners_impressions_1m"},
                start: new Date(new Date().getTime() - 3 * 3600 * 1e3), //miliseconds ago
                stop: null, //null for a streaming chart
                dimensionsNames: {
                    "v1": "pagetype",
                    "v2": "gender"
                },
                dimensionOptions: {
                    "v1": [
                        "eu1",
                        "eu2"
                    ],
                    "v2": [
                        "type"
                    ]
                }
            },
            refreshFrequency: 30 * 1e3
        },
        {
            name: "Trending Products Impressions",
            chartType: "AggregatedChart", //can be "EventsChart" or "AggregatedChart" - meaning one or multiple dimensions
            renderingType: "xxx", //choose a style
            chartParams: {
                length: 3 * 3600 * 1e3, //1 hour
                wsAddress: "ws://" + window.location.hostname + ":1081/1.0/aggregation/get",
                query: {name: "trending_products_impressions_1m"},
                start: new Date(new Date().getTime() - 3 * 3600 * 1e3), //miliseconds ago
                stop: null, //null for a streaming chart
                dimensionsNames: {
                    "v1": "pagetype",
                    "v2": "gender"
                },
                dimensionOptions: {
                    "v1": [
                        "eu1",
                        "eu2"
                    ],
                    "v2": [
                        "type"
                    ]
                }
            },
            refreshFrequency: 30 * 1e3
        }
    ],
    charts = [],
    i;

for (i = 0; i < chartsConfig.length; i++) {
    charts[i] = new window[chartsConfig[i].chartType](chartsConfig[i]);
    charts[i].start();
}