/**
 * create a real time instance for events line chart.
 * To make it work, an HTML element with a specific ID needs to be added in the HTML file.
 * var rt = new RealTimeEvents();
 * rt.setChartAnchor('#line-chart');
 * rt.init();
 */
function RealTimeEvents() {
    /**
     * add chart object
     * @param callback
     */
    this.addCharts = function (callback) {
        nv.addGraph(function () {
            _this.chart
                .showLegend(false)
                .margin({top: 10, bottom: 30, left: 60, right: 60})
                .useInteractiveGuideline(true)
            ;

            _this.chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the partent chart, so need to chain separately
                .tickFormat(function (d) {
                    return d3.time.format('%X')(new Date(d))
                });

            _this.chart.yAxis
                .tickFormat(function (d) {
                    return d3.format('d')(d);
                })
                .axisLabel('Count')
            ;
            return _this.chart;
        });

        if (callback) {
            callback();
        }
    };

    /**
     * refresh chart
     * @param callback
     */
    this.refreshChart = function (callback) {
        d3.select(_this.chartAnchor + ' svg')
            .datum([
                {
                    key: 'Events',
                    values: _this.chartData
                }
            ])
            .transition().duration(1)
            .call(_this.chart);

        _this.chart.update();

        //TODO: Figure out a good way to do this automatically
        nv.utils.windowResize(_this.chart.update);

        if (callback) {
            callback();
        }
    };

    /**
     * refresh chartData
     * @param callback
     */
    this.refreshChartData = function (callback) {
        var timer = _this.timer;
        _this.chartData = [];
        for (var t = timer.min; t < timer.now; t += 1e3) {
            var x = new Date(t);
            var y = _this._data[t] ? _this._data[t] : 0;
            _this.chartData.push({
                x: x,
                y: y
            });
        }

        if (callback) {
            callback();
        }
    };

    /**
     * handle incoming event data
     * @param eventData
     */
    this.dataHandler = function (eventData) {
        var t = eventData['time'] - eventData['time'] % 1e3;
        if (typeof _this._data[t] === 'undefined') {
            _this._data[t] = 0;
        }
        _this._data[t]++;
    };

    /**
     * reset data
     */
    this.resetData = function (callback) {
        var i;
        for (i in _this._data) {
            if (_this._data.hasOwnProperty(i)) {
                if (Number(i) < _this.timer.min) {
                    delete _this._data[i];
                }
            }
        }
        if (callback) {
            callback();
        }
    };

    /**
     * update timer
     * @param [callback]
     */
    this.updateTimer = function (callback) {
        var timer = _this.timer;
        timer.nowReal = new Date().getTime();
        timer.now = timer.min = timer.nowReal - timer.nowReal % 1e3;
        timer.min = timer.now - timer.timePeriod;  // start of chart
        timer.max = timer.now - timer.now % 1e3;
        if (callback) {
            callback();
        }
    };

    /**
     * refresh all
     */
    this.refreshAll = function () {
        _this.refreshChartData(function () {
            if (_this.chartData && _this.chartData.length) {
                _this.refreshChart(function () {
                    _this.resetData();
                });
            }
            _this.updateTimer();
        });
    };

    /**
     * init HTML
     */
    this.initHtml = function (callback) {
        if ($(_this.chartAnchor + ' svg').length == 0) {  // create svg
            $(_this.chartAnchor)
                .append(createElem('div', {className: 'control'}))  // for control buttons
                .append('<svg/>')  // svg for chart
            ;
        }

        $(_this.chartAnchor + ' .control')
            .append(createElem('span', {className: 'title'}, 'Events'))  // title
            .append(createElem('button', {className: 'pause'}, 'Pause'))  // pause button
            .append(createElem('button', {className: 'resume'}, 'Resume'))  // resume
        ;

        $(_this.chartAnchor + ' button.pause')
            .click(function () {
                _this.pause();
            })
        ;
        $(_this.chartAnchor + ' button.resume')
            .click(function () {
                _this.resume();
            })
        ;

        if (callback) {
            callback();
        }
    };

    /**
     * major init
     */
    this.init = function () {
        _this.initSocket(function () {
            _this.initHtml(function () {
                _this.addCharts(function () {
                    setTimeout(function () {
                        _this.intervalHandle = setInterval(function () {
                            _this.refreshAll();
                        }, _this.refreshFrequency);
                    }, 1e3);
                });
            })
        });
    };

    /**
     * initialize socket
     * @param [callback]
     */
    this.initSocket = function (callback) {
        if (_this.socket != null) {
            _this.resetData(function () {
                _this._data = {};
                _this.chartData = [];
//                _this.refreshAll();
            });
            _this.socket.close();
        }
        _this.socket = new WebSocket(_this.socketConnection);
        _this.socket.onopen = function () {
            console.log("connected to " + _this.socketConnection);
            _this.socket.send(JSON.stringify(_this.socketPacket));
        };
        _this.socket.onmessage = function (message) {
            var event;
            if (message) {
                if (message.data) {
                    event = JSON.parse(message.data);
                    if (event && event.data) {
                        _this.dataHandler(event);
                    }
                }
            }
        };
        _this.socket.onclose = function () {
            console.log("closed");
        };
        _this.socket.onerror = function (error) {
            console.log("error", error);
        };
        if (callback) {
            callback();
        }
    };

    /**
     * set eventType
     * @param eventType
     */
    this.setEventType = function (eventType) {
        _this.eventType = eventType;
        console.log('eventType is set to ' + _this.eventType);
    };

    /**
     * set chart html anchor
     * @param chartAnchor
     */
    this.setChartAnchor = function (chartAnchor) {
        if (!chartAnchor.match('^#.*')) {
            chartAnchor = '#' + chartAnchor;
        }
        _this.chartAnchor = chartAnchor;
        console.log('chartAnchor is set to ' + _this.chartAnchor);
    };

    /**
     * set timePeriod
     * @param timePeriod
     * @param [callback]
     */
    this.setTimePeriod = function (timePeriod, callback) {
        _this.timer.timePeriod = timePeriod;
        _this._updateSocketPacket();
        console.log('timePeriod is set to ' + _this.timer.timePeriod);
        if (callback) {
            callback();
        }
    };

    this._updateSocketPacket = function () {
        _this.socketPacket = {
            type: _this.eventType,
            start: new Date(new Date().getTime() - _this.timer.timePeriod)
        };
    };

    /**
     * set socketConnection
     * @param value
     */
    this.setSocketConnection = function (value) {
        _this.socketConnection = value;
    };

    /**
     * set socketPacket
     * @param value
     */
    this.setSocketPacket = function (value) {
        _this.socketPacket = value;
    };
    /**
     * set timePeriod
     * @param value
     */
    this.setsampleDuration = function (value) {
        _this.timer.timePeriod = value;
    };

    /**
     * pause refresh data
     */
    this.pause = function () {
        clearInterval(_this.intervalHandle);
    };

    /**
     * resume
     */
    this.resume = function () {
        setTimeout(function () {
            _this.intervalHandle = setInterval(function () {
                _this.refreshAll();
            }, _this.refreshFrequency);
        }, 1e3);
    };

    /**
     * test
     */
    this.test = function () {
        _this.setEventType('type1');
        _this.setChartAnchor('line-chart');
        _this.init();
    };

    // variables
    var _this = this;
    this.eventType = 'type1';  // event type
    this.chartAnchor = '';
    this.chartData = [];  // chartData should be formatted like {x: new Date, y: 130}...
    this._data = {};  // temporary data dictionary for aggregation
    this.timer = {
        timePeriod: 60 * 1e3, // 60 seconds
        now: null,
        nowReal: null,
        min: null,
        max: null
    };
    this.refreshFrequency = 1e3;
    this.chart = nv.models.lineChart();
    this.socket = null;
    this.socketConnection = 'ws://localhost:1081/1.0/event/get';
    this.socketPacket = {
        type: _this.eventType,
        start: new Date(new Date().getTime() - _this.timer.timePeriod)
    };
    this.intervalHandle = null;
}

/**
 * create a real time instance for aggregation stack chart.
 * @type {RealTimeEvents}
 */
function RealTimeAggregations() {
    /**
     * add chart objects
     * @param callback
     */
    this.addCharts = function (callback) {
        _this.dimTargetKeys.forEach(function (dimTargetKey) {
            var chart = nv.models.stackedAreaChart();
            nv.addGraph(function () {
                chart
                    .showLegend(false)
                    .margin({top: 10, bottom: 30, left: 60, right: 60})
                    .useInteractiveGuideline(true)
                ;

                chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the partent chart, so need to chain separately
                    .tickFormat(function (d) {
                        return d3.time.format('%X')(new Date(d))
                    });

                chart.yAxis
                    .tickFormat(function (d) {
                        return d3.format('d')(d);
                    })
                    .axisLabel('Count')
                ;
                return chart;
            });

            _this.charts[dimTargetKey] = chart;
        });

        if (callback) {
            callback();
        }
    };

    /**
     * refresh chart
     * @param callback
     */
    this.refreshChart = function (callback) {
        _this.dimTargetKeys.forEach(function (dimTargetKey) {
            var chartId = _this.chartAnchor.replaceAll('#') + '-' + dimTargetKey.replaceAll('.', '-'),
                chart = _this.charts[dimTargetKey],
                chartData = _this.chartDataList[dimTargetKey];
            d3.select('#' + chartId + ' svg')
                .datum(chartData)
                .transition().duration(1)
                .call(chart);

            chart.update();
        });

        //TODO: Figure out a good way to do this automatically
//        nv.utils.windowResize(_this.chart.update);

        if (callback) {
            callback();
        }
    };

    /**
     * refresh chartData
     * @param callback
     */
    this.refreshChartData = function (callback) {
        _this.chartDataList = {};
        var ndx = crossfilter(_this._data),
            dimTime = ndx.dimension(function (d) {
                return new Date(d['time']);
            });
//        console.log(grpDimTime.all());//debug
        _this.dimTargetKeys.forEach(function (dimTargetKey) {
            var chartData = [],  // store all data series for a stack chart
                dimTarget = ndx.dimension(function (d) {
                    return d[dimTargetKey];
                }),
                dimTargetValsUniq = _this._data.ix(dimTargetKey).unique();
            dimTargetValsUniq.forEach(function (v) {
                var t,
                    tmp = {};
                dimTarget.filter(v);
                var values = dimTime.group().reduceSum(function (d) {
                    return d['count'];
                }).all();  // store values for one series in a stack chart
                values.forEach(function (d) {
                    tmp[d.key.getTime()] = d.value;
                });
                values = [];
                for (t = _this.timer.min; t < _this.timer.now; t += _this.resolution) {
                    var x = new Date(t),
                        y = tmp[t] ? tmp[t] : 0;
                    values.push({
                        x: x,
                        y: y
                    })
                }
                chartData.push({
                    key: v,
                    values: values
                });
            });
            dimTarget.filter(null);
            _this.chartDataList[dimTargetKey] = chartData;
        });

        if (callback) {
            callback();
        }
    };

    /**
     * handle incoming event data
     * @param aggregationData
     */
    this.dataHandler = function (aggregationData) {
        _this._data.push(JSON.flatten(aggregationData));
    };

    /**
     * reset data
     */
    this.resetData = function (callback) {
        var tmp = [];
        _this._data.forEach((function (d) {
            if (d['time'] >= _this.timer.min) {
                tmp.push(d);
            }
        }));
        _this._data = tmp;
        if (callback) {
            callback();
        }
    };

    /**
     * update timer
     * @param [callback]
     */
    this.updateTimer = function (callback) {
        var timer = _this.timer;
        timer.nowReal = new Date().getTime();
        timer.now = timer.nowReal - timer.nowReal % _this.resolution;
        timer.min = (timer.now - timer.timePeriod) - (timer.now - timer.timePeriod) % _this.resolution;
        timer.max = timer.now - timer.now % _this.resolution;
        if (callback) {
            callback();
        }
    };

    /**
     * refresh all
     */
    this.refreshAll = function () {
        _this.refreshChartData(function () {
            _this.refreshChart(function () {
                _this.resetData();
            });
            _this.updateTimer();
        });
    };

    /**
     * init HTML
     */
    this.initHtml = function (callback) {
        var $tmp = $('<div/>'),
            $anchor = $(_this.chartAnchor),
            $control = $(createElem('div', {className: 'control'}));  // elements in control block
        // control block  TODO: add listeners to control stack area
        var selectorLookup = {
            'data.v1': ['male', 'female', 'all'],
            'data.v2': ['web', 'android', 'web', 'all'],
            'data.v3': ['GB', 'US', 'IN', 'JP', 'all']
        };
        _this.dimTargetKeys.forEach(function (dimTargetKey) {
            var selectorId = _this.chartAnchor.replaceAll('#') + '-selector-' + dimTargetKey.replaceAll('.', '-'),
                $selector = $(createElem('select', {id: selectorId}));
            $selector.append('<option class="placeholder" selected>select a value</option>');  // default option
            selectorLookup[dimTargetKey].forEach(function (option) {
                $selector.append(createElem('option', {'value': option}, option));
            });
            $control
                .append($tmp.clone().append($selector).html())
            ;
        });
        $anchor
            .append($tmp.clone().append($control).html())
        ;
        _this.dimTargetKeys.forEach(function (dimTargetKey) {
            var chartId = _this.chartAnchor.replaceAll('#') + '-' + dimTargetKey.replaceAll('.', '-'),
                $elem = createElem('div', {id: chartId});
            $($elem)
                .append(createElem('svg'))
            ;
            $anchor
                .append($tmp.clone().append($elem).html())
            ;
        });

        if (callback) {
            callback();
        }
    };

    /**
     * major init
     */
    this.init = function () {
        _this.initSocket(function () {
            _this.initHtml(function () {
                _this.addCharts(function () {
                    setTimeout(function () {
                        _this.intervalHandle = setInterval(function () {
                            _this.refreshAll();
                        }, _this.refreshFrequency);  // refresh frequency
                    }, 2e3);  // initial waiting time
                });
            })
        });
    };

    /**
     * initialize socket
     * @param [callback]
     */
    this.initSocket = function (callback) {
        if (_this.socket != null) {
            _this.resetData(function () {
                _this._data = [];
                _this.chartData = [];
//                _this.refreshAll();
            });
            _this.socket.close();
        }
        _this.socket = new WebSocket(_this.socketConnection);
        _this.socket.onopen = function () {
            console.log("connected to " + _this.socketConnection);
            _this.socket.send(JSON.stringify(_this.socketPacket));
        };
        _this.socket.onmessage = function (message) {
            var jsonData;
            if (message) {
                if (message.data) {
                    jsonData = JSON.parse(message.data);
                    if (jsonData && jsonData.data) {
                        _this.dataHandler(jsonData);
                    }
                }
            }
        };
        _this.socket.onclose = function () {
            console.log("closed");
        };
        _this.socket.onerror = function (error) {
            console.log("error", error);
        };
        if (callback) {
            callback();
        }
    };

    /**
     * init listeners
     * @param [callback]
     */
    this.initListners = function (callback) {
        //TODO
    };

    /**
     * set eventType
     * @param value
     */
    this.setAggType = function (value) {
        _this.aggType = value;
        console.log('aggType is set to ' + _this.aggType);
    };

    /**
     * set chart html anchor
     * @param chartAnchor
     */
    this.setChartAnchor = function (chartAnchor) {
        if (!chartAnchor.match('^#.*')) {
            chartAnchor = '#' + chartAnchor;
        }
        _this.chartAnchor = chartAnchor;
        console.log('chartAnchor is set to ' + _this.chartAnchor);
    };

    /**
     * set timePeriod
     * @param timePeriod
     * @param [callback]
     */
    this.setTimePeriod = function (timePeriod, callback) {
        _this.timer.timePeriod = timePeriod;
        _this._updateSocketPacket();
        console.log('timePeriod is set to ' + _this.timer.timePeriod);
        if (callback) {
            callback();
        }
    };

    this._updateSocketPacket = function () {
        _this.socketPacket = {
            name: _this.aggType,
            start: new Date(new Date().getTime() - _this.timer.timePeriod)
        };
    };

    /**
     * set socketConnection
     * @param value
     */
    this.setSocketConnection = function (value) {
        _this.socketConnection = value;
    };

    /**
     * set socketPacket
     * @param value
     */
    this.setSocketPacket = function (value) {
        _this.socketPacket = value;
    };
    /**
     * set timePeriod
     * @param value
     */
    this.setsampleDuration = function (value) {
        _this.timer.timePeriod = value;
    };

    /**
     * pause refresh data
     */
    this.pause = function () {
        clearInterval(_this.intervalHandle);
    };

    /**
     * resume
     */
    this.resume = function () {
        setTimeout(function () {
            _this.intervalHandle = setInterval(function () {
                _this.refreshAll();
            }, _this.refreshFrequency);
        }, 1e3);
    };

    /**
     * test
     */
    this.test = function () {
        _this.setAggType('type1');
        _this.setChartAnchor('stack-charts');
        _this.init();
    };

    // variables
    var _this = this;
    this.aggType = 'agg1';
    this.chartAnchor = '';
    this.chartDataList = {};
    this._data = [];  // temporary data dictionary for aggregation
    this.timer = {
        timePeriod: 60 * 60 * 1e3, // 60 minutes
        now: null,
        nowReal: null,
        min: null,
        max: null
    };
    this.resolutionLookup = {
        '1m': 60 * 1e3,
        '5m': 5 * 60 * 1e3,
        '1h': 60 * 60 * 1e3
    };
    this.resolutionName = '1m';
    this.resolution = this.resolutionLookup[this.resolutionName];
    this.refreshFrequency = 5 * 1e3;  // refresh every 5 seconds, will be deprecated
    this.dimTargetKeys = [
        'data.v1',
        'data.v2',
        'data.v3'
    ];
    this.charts = {};
    this.socket = null;
    this.socketConnection = 'ws://localhost:1081/1.0/aggregation/get';
    this.socketPacket = {
        name: _this.aggType + '_' + _this.resolutionName,
        start: new Date(new Date().getTime() - _this.timer.timePeriod)
    };
    this.intervalHandle = null;
}

function testRealTime() {
    rte = new RealTimeEvents();
    rte.test();

    rta = new RealTimeAggregations();
    rta.test();
}