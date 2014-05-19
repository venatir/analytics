"use strict";
/*global nv*/
/*global d3*/
/*global $*/
/*global createElem*/
/*global WebSocket*/
/*global crossfilter*/
/*global window*/

var realTimeEvents = {
    refreshChart: function (callback) {
        d3.select(this.chartAnchor + ' svg')
            .datum([
                {
                    key: 'Events',
                    values: this.chartData
                }
            ])
            .transition().duration(800)
            .call(this.chart);

        //Figure out a good way to do this automatically
        nv.utils.windowResize(this.chart.update);

        if (callback) {
            callback();
        }
    },
    dataHandler: function (eventData) {
        var t,
            i,
            lastTime;

        if (eventData) {
            t = eventData.t;
        } else {
            t = (new Date()).getTime();
        }
        t = t - t % 1e3;

        //get the last timestamp
        if (this.chartData.length === 0) {
            //add the first element
            lastTime = (new Date()).getTime();
            lastTime = lastTime - lastTime % 1e3;
            this.chartData.push({x: new Date(lastTime), y: 0});
        } else {
            lastTime = this.chartData[this.chartData.length - 1].x.getTime();
        }

        if (lastTime < t) {
            //            console.log("add zeroes as necessary then insert t: " + t);
            for (i = lastTime + 1e3; i < t; i += 1e3) {
                this.chartData.push({x: new Date(i), y: 0});
            }
            if (eventData) {
                this.chartData.push({x: new Date(t), y: 1});
            }
            else {
                this.chartData.push({x: new Date(t), y: 0});
            }
        } else if (lastTime === t) {
            //            console.log("lastTime is t: " + t);
            if (eventData) {
                this.chartData[this.chartData.length - 1].y++;
            }
        } else if (lastTime > t) {
            //console.log("go back and look for the correct record to increment, but don,t go back too much t: " + t);
            for (i = this.chartData.length - 2; i > ((this.chartData.length - 7) > 0 ? this.chartData.length - 7 : 0); i--) {
                if (this.chartData[i].x.getTime() === t) {
                    this.chartData[i].y++;
                    break;
                }
            }
        }

        while (this.chartData.length > 60) {
            this.chartData.shift();
        }
    },
    refreshAll: function () {
        //this.refreshChartData(function () {
        this.dataHandler();
        if (this.chartData && this.chartData.length) {
            this.refreshChart();
        }
    },
    init: function () {
        var that = this,
            initSocket = function (callback) {
                that.socket = new WebSocket(that.socketConnection);
                that.socket.onopen = function () {
                    console.log("connected to " + that.socketConnection);
                    that.socket.send(JSON.stringify(that.socketPacket()));
                };
                that.socket.onmessage = function (message) {
                    var event;
                    if (message) {
                        if (message.data) {
                            event = JSON.parse(message.data);
                            if (event && event.d) {
                                that.dataHandler(event);
                            }
                        }
                    }
                };
                that.socket.onclose = function () {
                    console.log("closed");
                };
                that.socket.onerror = function (error) {
                    console.log("error", error);
                };
                if (callback) {
                    callback();
                }
            },
            initHtml = function (callback) {
                if ($(that.chartAnchor + ' svg').length === 0) {  // create svg
                    $(that.chartAnchor)
                        .append(createElem('div', {className: 'control'}))  // for control buttons
                        .append('<svg/>')  // svg for chart
                    ;
                }

                $(that.chartAnchor + ' .control')
                    .append(createElem('span', {className: 'title'}, 'Events'))  // title
                    .append(createElem('button', {className: 'pause'}, 'Pause'))  // pause button
                    .append(createElem('button', {className: 'resume'}, 'Resume'))  // resume
                ;

                $(that.chartAnchor + ' button.pause')
                    .click(function () {
                        that.pause();
                    })
                ;
                $(that.chartAnchor + ' button.resume')
                    .click(function () {
                        that.resume();
                    });
                if (callback) {
                    callback();
                }
            },
            addCharts = function (callback) {
                nv.addGraph(function () {
                    that.chart
                        .showLegend(false)
                        .margin({top: 10, bottom: 30, left: 60, right: 60})
                        .useInteractiveGuideline(true)
                    ;

                    that.chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the partent chart, so need to chain separately
                        .tickFormat(function (d) {
                            return d3.time.format('%X')(new Date(d));
                        });

                    that.chart.yAxis
                        .tickFormat(function (d) {
                            return d3.format('d')(d);
                        })
                        .axisLabel('Count')
                    ;
                    return that.chart;
                });

                if (callback) {
                    callback();
                }
            };
        initSocket(function () {
            initHtml(function () {
                addCharts(function () {
                    that.intervalHandle = setInterval(
                        function () {
                            that.refreshAll();
                        },
                        that.refreshFrequency);
                });
            });
        });
    },
    setEventType: function (eventType) {
        this.eventType = eventType;
        console.log('eventType is set to ' + this.eventType);
    },
    setChartAnchor: function (chartAnchor) {
        if (!chartAnchor.match('^#.*')) {
            chartAnchor = '#' + chartAnchor;
        }
        this.chartAnchor = chartAnchor;
        console.log('chartAnchor is set to ' + this.chartAnchor);
    },
    pause: function () {
        clearInterval(this.intervalHandle);
    },
    resume: function () {
        setTimeout(function () {
            this.intervalHandle = setInterval(function () {
                this.refreshAll();
            }, this.refreshFrequency);
        }, 1e3);
    },
    start: function (eventType) {
        this.setEventType(eventType);
        this.setChartAnchor("line-chart");
        this.init();
    },
    socketConnection: 'ws://localhost:1081/1.0/event/get',
    eventType: 't1',  // default event type
    chartAnchor: '',
    chartData: [],  // chartData should be formatted like {x: new Date, y: 130}...
    timer: {
        timePeriod: 60 * 1e3, // 60 seconds
        now: null,
        nowReal: null,
        min: null,
        max: null
    },
    refreshFrequency: 1e3,
    chart: nv.models.lineChart(),
    socket: null,
    socketPacket: function () {
        return {
            type: this.eventType,
            start: new Date(new Date().getTime() - this.timer.timePeriod)
        };
    },
    intervalHandle: 0
};

/**
 * create a real time instance for aggregation stack chart.
 * @type {RealTimeEvents}
 */
    //function RealTimeAggregations() {
    //    var this = this;
    //
    //    /**
    //     * add chart objects
    //     * @param callback
    //     */
    //    this.addCharts = function (callback) {
    //        this.dimTargetKeys.forEach(function (dimTargetKey) {
    //            var chart = nv.models.stackedAreaChart();
    //            nv.addGraph(function () {
    //                chart
    //                    .showLegend(false)
    //                    .margin({top: 10, bottom: 30, left: 60, right: 60})
    //                    .useInteractiveGuideline(true)
    //                ;
    //
    //                chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the partent chart, so need to chain separately
    //                    .tickFormat(function (d) {
    //                        return d3.time.format('%X')(new Date(d));
    //                    });
    //
    //                chart.yAxis
    //                    .tickFormat(function (d) {
    //                        return d3.format('d')(d);
    //                    })
    //                    .axisLabel('Count')
    //                ;
    //                return chart;
    //            });
    //
    //            this.charts[dimTargetKey] = chart;
    //        });
    //
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * refresh chart
    //     * @param callback
    //     */
    //    this.refreshChart = function (callback) {
    //        this.dimTargetKeys.forEach(function (dimTargetKey) {
    //            var chartId = this.chartAnchor.replaceAll('#') + '-' + dimTargetKey.replaceAll('.', '-'),
    //                chart = this.charts[dimTargetKey],
    //                chartData = this.chartDataList[dimTargetKey];
    //            d3.select('#' + chartId + ' svg')
    //                .datum(chartData)
    //                .transition().duration(1)
    //                .call(chart);
    //        });
    //
    //        //Figure out a good way to do this automatically
    //        //nv.utils.windowResize(this.chart.update);
    //
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * refresh chartData
    //     * @param callback
    //     */
    //    this.refreshChartData = function (callback) {
    //        this.chartDataList = {};
    //        var ndx = crossfilter(this._data),
    //            dimTime = ndx.dimension(function (d) {
    //                return new Date(d.time);
    //            });
    //        //        console.log(grpDimTime.all());//debug
    //        this.dimTargetKeys.forEach(function (dimTargetKey) {
    //            var chartData = [],  // store all data series for a stack chart
    //                dimTarget = ndx.dimension(function (d) {
    //                    return d[dimTargetKey];
    //                }),
    //                dimTargetValsUniq = this._data.ix(dimTargetKey).unique();
    //            dimTargetValsUniq.forEach(function (v) {
    //                var t,
    //                    tmp = {},
    //                    values,
    //                    x,
    //                    y;
    //                dimTarget.filter(v);
    //                values = dimTime.group().reduceSum(function (d) {
    //                    return d.count;
    //                }).all();  // store values for one series in a stack chart
    //                values.forEach(function (d) {
    //                    tmp[d.key.getTime()] = d.value;
    //                });
    //                values = [];
    //                for (t = this.timer.min; t < this.timer.now; t += this.resolution) {
    //                    x = new Date(t);
    //                    y = tmp[t] || 0;
    //                    values.push({
    //                        x: x,
    //                        y: y
    //                    });
    //                }
    //                chartData.push({
    //                    key: v,
    //                    values: values
    //                });
    //            });
    //            dimTarget.filter(null);
    //            this.chartDataList[dimTargetKey] = chartData;
    //        });
    //
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * handle incoming event data
    //     * @param aggregationData
    //     */
    //    this.dataHandler = function (aggregationData) {
    //        //        console.log(JSON.flatten(aggregationData));//debug
    //        this._data.push(JSON.flatten(aggregationData));
    //    };
    //
    //    /**
    //     * reset data
    //     */
    //    this.resetData = function (callback) {
    //        var tmp = [];
    //        this._data.forEach(function (d) {
    //            if (d.time >= this.timer.min) {
    //                tmp.push(d);
    //            }
    //        });
    //        this._data = tmp;
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * update timer
    //     * @param [callback]
    //     */
    //    this.updateTimer = function (callback) {
    //        var timer = this.timer;
    //        timer.nowReal = new Date().getTime();
    //        timer.now = timer.nowReal - timer.nowReal % this.resolution;
    //        timer.min = (timer.now - timer.timePeriod) - (timer.now - timer.timePeriod) % this.resolution;
    //        timer.max = timer.now - timer.now % this.resolution;
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * refresh all
    //     */
    //    this.refreshAll = function () {
    //        this.refreshChartData(function () {
    //            this.refreshChart(function () {
    //                this.resetData();
    //            });
    //            this.updateTimer();
    //        });
    //    };
    //
    //    /**
    //     * init HTML
    //     */
    //    this.initHtml = function (callback) {
    //        var $tmp = $('<div/>'),
    //            $anchor = $(this.chartAnchor),
    //            $control = $(createElem('div', {className: 'control'})),  // elements in control block
    //            selectorLookup = {
    //                'data.v1': ['male', 'female', 'all'],
    //                'data.v2': ['web', 'android', 'web', 'all'],
    //                'data.v3': ['GB', 'US', 'IN', 'JP', 'all']
    //            };// control block  TODO: add listeners to control stack area
    //        this.dimTargetKeys.forEach(function (dimTargetKey) {
    //            var selectorId = this.chartAnchor.replaceAll('#') + '-selector-' + dimTargetKey.replaceAll('.', '-'),
    //                $selector = $(createElem('select', {id: selectorId}));
    //            $selector.append('<option class="placeholder" selected>select a value</option>');  // default option
    //            selectorLookup[dimTargetKey].forEach(function (option) {
    //                $selector.append(createElem('option', {'value': option}, option));
    //            });
    //            $control
    //                .append($tmp.clone().append($selector).html())
    //            ;
    //        });
    //        $anchor
    //            .append($tmp.clone().append($control).html())
    //        ;
    //        this.dimTargetKeys.forEach(function (dimTargetKey) {
    //            var chartId = this.chartAnchor.replaceAll('#') + '-' + dimTargetKey.replaceAll('.', '-'),
    //                $elem = createElem('div', {id: chartId});
    //            $($elem)
    //                .append(createElem('svg'))
    //            ;
    //            $anchor
    //                .append($tmp.clone().append($elem).html())
    //            ;
    //        });
    //
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * major init
    //     */
    //    this.init = function () {
    //        this.initSocket(function () {
    //            this.initHtml(function () {
    //                this.addCharts(function () {
    //                    setTimeout(function () {
    //                        this.intervalHandle = setInterval(function () {
    //                            this.refreshAll();
    //                        }, this.refreshFrequency);  // refresh frequency
    //                    }, 2e3);  // initial waiting time
    //                });
    //            });
    //        });
    //    };
    //
    //    /**
    //     * initialize socket
    //     * @param [callback]
    //     */
    //    this.initSocket = function (callback) {
    //        if (this.socket !== null || this.socket !== undefined) {
    //            this.resetData(function () {
    //                this._data = [];
    //                this.chartData = [];
    //            });
    //        }
    //        this.socket = new WebSocket(this.socketConnection);
    //        this.socket.onopen = function () {
    //            console.log("connected to " + this.socketConnection);
    //            this.socket.send(JSON.stringify(this.socketPacket));
    //        };
    //        this.socket.onmessage = function (message) {
    //            var jsonData;
    //            if (message) {
    //                if (message.data) {
    //                    jsonData = JSON.parse(message.data);
    //                    if (jsonData && jsonData.data) {
    //                        this.dataHandler(jsonData);
    //                    }
    //                }
    //            }
    //        };
    //        this.socket.onclose = function () {
    //            console.log("closed");
    //        };
    //        this.socket.onerror = function (error) {
    //            console.log("error", error);
    //        };
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * init listeners
    //     * @param [callback]
    //     */
    //    this.initListners = function (callback) {
    //        console.log("Not implemented yet");
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    /**
    //     * set eventType
    //     * @param value
    //     */
    //    this.setAggType = function (value) {
    //        this.aggType = value;
    //        console.log('aggType is set to ' + this.aggType);
    //    };
    //
    //    /**
    //     * set chart html anchor
    //     * @param chartAnchor
    //     */
    //    this.setChartAnchor = function (chartAnchor) {
    //        if (!chartAnchor.match('^#.*')) {
    //            chartAnchor = '#' + chartAnchor;
    //        }
    //        this.chartAnchor = chartAnchor;
    //        console.log('chartAnchor is set to ' + this.chartAnchor);
    //    };
    //
    //    /**
    //     * set timePeriod
    //     * @param timePeriod
    //     * @param [callback]
    //     */
    //    this.setTimePeriod = function (timePeriod, callback) {
    //        this.timer.timePeriod = timePeriod;
    //        this._updateSocketPacket();
    //        console.log('timePeriod is set to ' + this.timer.timePeriod);
    //        if (callback) {
    //            callback();
    //        }
    //    };
    //
    //    this._updateSocketPacket = function () {
    //        this.socketPacket = {
    //            name: this.aggType,
    //            start: new Date(new Date().getTime() - this.timer.timePeriod)
    //        };
    //    };
    //
    //    /**
    //     * set socketConnection
    //     * @param value
    //     */
    //    this.setSocketConnection = function (value) {
    //        this.socketConnection = value;
    //    };
    //
    //    /**
    //     * set socketPacket
    //     * @param value
    //     */
    //    this.setSocketPacket = function (value) {
    //        this.socketPacket = value;
    //    };
    //    /**
    //     * set timePeriod
    //     * @param value
    //     */
    //    this.setsampleDuration = function (value) {
    //        this.timer.timePeriod = value;
    //    };
    //
    //    /**
    //     * pause refresh data
    //     */
    //    this.pause = function () {
    //        clearInterval(this.intervalHandle);
    //    };
    //
    //    /**
    //     * resume
    //     */
    //    this.resume = function () {
    //        setTimeout(function () {
    //            this.intervalHandle = setInterval(function () {
    //                this.refreshAll();
    //            }, this.refreshFrequency);
    //        }, 1e3);
    //    };
    //
    //    /**
    //     * test
    //     */
    //    this.test = function () {
    //        this.setAggType('t1');
    //        this.setChartAnchor('stack-charts');
    //        this.init();
    //    };
    //
    //    // variables
    //    this.aggType = 'agg1';
    //    this.chartAnchor = '';
    //    this.chartDataList = {};
    //    this._data = [];  // temporary data dictionary for aggregation
    //    this.timer = {
    //        timePeriod: 60 * 60 * 1e3, // 60 minutes
    //        now: null,
    //        nowReal: null,
    //        min: null,
    //        max: null
    //    };
    //    this.resolutionLookup = {
    //        '1m': 60 * 1e3,
    //        '5m': 5 * 60 * 1e3,
    //        '1h': 60 * 60 * 1e3
    //    };
    //    this.resolutionName = '1m';
    //    this.resolution = this.resolutionLookup[this.resolutionName];
    //    this.refreshFrequency = 5 * 1e3;  // refresh every 5 seconds, will be deprecated
    //    this.dimTargetKeys = [
    //        'data.v1',
    //        'data.v2',
    //        'data.v3'
    //    ];
    //    this.charts = {};
    //    this.socket = null;
    //    this.socketConnection = 'ws://localhost:1081/1.0/aggregation/get';
    //    this.socketPacket = {
    //        name: this.aggType + '_' + this.resolutionName,
    //        start: new Date(new Date().getTime() - this.timer.timePeriod)
    //    };
    //    this.intervalHandle = null;
    //}

function testRealTime() {
    realTimeEvents.start("t1");
}