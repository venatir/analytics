module.exports = {
    "aggregations": [
        {
            "reaggragatable": true,
            "banners": [
                {
                    "$match": {
                        "type": "web.trending.banners" //mandatory
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.pagetype",
                        v2: "$d.u_gdr"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2"
                        },
                        "count": {
                            $sum: 1
                        }
                    }
                }
            ]
        }
        //        ,
        //        {
        //            "reaggragatable": true,
        //            "t2": [
        //                {
        //                    "$match": {
        //                        "type": "t2",
        //                        "t": "This gets overwritten with the correct expressions for the 1 or 5 minute intervals"
        //                    }},
        //                {
        //                    "$project": {
        //                        _id: 0,
        //                        type: "$type",
        //                        v1: "$d.v1",
        //                        v2: "$d.v2",
        //                        v3: {
        //                            $cond: [
        //                                {
        //                                    $eq: ["$d.v3", "US"]
        //                                },
        //                                "US",
        //                                {
        //                                    $cond: [
        //                                        {
        //                                            $eq: ["$d.v3", "GB"]
        //                                        },
        //                                        "GB",
        //                                        {
        //                                            $cond: [
        //                                                {
        //                                                    $eq: ["$d.v3", "JP"]
        //                                                },
        //                                                "JP",
        //                                                {
        //                                                    $cond: [
        //                                                        {
        //                                                            $eq: ["$d.v3", "IN"]
        //                                                        },
        //                                                        "IN",
        //                                                        "OTHER"
        //                                                    ]
        //                                                }
        //                                            ]
        //                                        }
        //                                    ]
        //                                }
        //                            ]
        //                        }
        //                    }
        //                },
        //                {
        //                    "$group": {
        //                        "_id": {
        //                            "type": "$type",
        //                            "v1": "$v1",
        //                            "v2": "$v2",
        //                            "v3": "$v3"
        //                        },
        //                        "count": {
        //                            $sum: 1
        //                        },
        //                        "index": {
        //                            $avg: "$index"
        //                        }
        //                    }
        //                }
        //            ]
        //        }
    ]
};
