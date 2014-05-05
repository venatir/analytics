module.exports = {
    mongo: [
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
            "reagragatable": true,
            "impressions": [
                {
                    "$match": {
                        "type": "impressions",
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
                                    $eq: ["$d.v3", "US"]
                                },
                                "US",
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", "GB"]
                                        },
                                        "GB",
                                        {
                                            $cond: [
                                                {
                                                    $eq: ["$d.v3", "JP"]
                                                },
                                                "JP",
                                                {
                                                    $cond: [
                                                        {
                                                            $eq: ["$d.v3", "IN"]
                                                        },
                                                        "IN",
                                                        "OTHER"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
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
                        "index": {
                            $avg: "$index"
                        }
                    }
                }
            ]
        },
        {
            "reagragatable": true,
            "wants": [
                {
                    "$match": {
                        "type": "wants",
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
                                    $eq: ["$d.v3", "US"]
                                },
                                "US",
                                {
                                    $cond: [
                                        {
                                            $eq: ["$d.v3", "GB"]
                                        },
                                        "GB",
                                        {
                                            $cond: [
                                                {
                                                    $eq: ["$d.v3", "JP"]
                                                },
                                                "JP",
                                                {
                                                    $cond: [
                                                        {
                                                            $eq: ["$d.v3", "IN"]
                                                        },
                                                        "IN",
                                                        "OTHER"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        v4: "$d.v4"
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
                        "index": {
                            $avg: "$v4"
                        }
                    }
                }
            ]
        }
    ]
};
