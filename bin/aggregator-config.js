module.exports = {mongo: [
    {
        "mongo-host": "192.168.56.101",
        "mongo-port": 27017,
        "mongo-database": "shopcade_cube_events",
        "mongo-username": null,
        "mongo-password": null
    },
    {
        "mongo-host": "192.168.56.101",
        "mongo-port": 27017,
        "mongo-database": "shopcade_cube_aggregations",
        "mongo-username": null,
        "mongo-password": null
    }
],
    "aggregations": [
        {
            "aggregation_name_1": [
                {
                    "$match": {
                        "type": "mytest",
                        "t": "This gets overwritten with the correct expressions for the 1 or 5 minute intervals"
                    }
                },
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.v1",
                        v2: "$d.v2",
                        v3: {
                            $cond: [
                                {
                                    $eq: ["$d.v3", 10]
                                },
                                10,
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", 11]
                                        },
                                        11,
                                        "OTHER"
                                    ]
                                }
                            ]
                        },
                        index: "$d.index"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2",
                            "v3": "$v3"
                        },
                        "count": {
                            $sum: 1
                        },
                        "value": {
                            $avg: "$index"
                        }
                    }
                }
            ]
        },
        {
            "aggregation_name_2": [
                {
                    "$match": {
                        "type": "mytest",
                        "t": "This gets overwritten with the correct expressions for the 1 or 5 minute intervals"
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.v1",
                        v2: "$d.v2",
                        v3: {
                            $cond: [
                                {
                                    $eq: ["$d.v3", 10]
                                },
                                10,
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", 11]
                                        },
                                        11,
                                        "OTHER"
                                    ]
                                }
                            ]
                        },
                        index: "$d.index"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2",
                            "v3": "$v3"
                        },
                        "count": {
                            $sum: 1
                        },
                        "value": {
                            $avg: "$index"
                        }
                    }
                }
            ]
        },
        {
            "aggregation_name_3": [
                {
                    "$match": {
                        "type": "mytest",
                        "t": "This gets overwritten with the correct expressions for the 1 or 5 minute intervals"
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.v1",
                        v2: "$d.v2",
                        v3: {
                            $cond: [
                                {
                                    $eq: ["$d.v3", 10]
                                },
                                10,
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", 11]
                                        },
                                        11,
                                        "OTHER"
                                    ]
                                }
                            ]
                        },
                        index: "$d.index"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2",
                            "v3": "$v3"
                        },
                        "count": {
                            $sum: 1
                        },
                        "value": {
                            $avg: "$index"
                        }
                    }
                }
            ]
        },
        {
            "aggregation_name_4": [
                {
                    "$match": {
                        "type": "mytest",
                        "t": "This gets overwritten with the correct expressions for the 1 or 5 minute intervals"
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.v1",
                        v2: "$d.v2",
                        v3: {
                            $cond: [
                                {
                                    $eq: ["$d.v3", 10]
                                },
                                10,
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", 11]
                                        },
                                        11,
                                        "OTHER"
                                    ]
                                }
                            ]
                        },
                        index: "$d.index"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2",
                            "v3": "$v3"
                        },
                        "count": {
                            $sum: 1
                        },
                        "value": {
                            $avg: "$index"
                        }
                    }
                }
            ]
        }
    ]
};
