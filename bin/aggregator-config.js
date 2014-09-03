module.exports = {
    "aggregations": [
        {
            "reaggragatable": true,
            "web_banners_impressions": [
                {
                    "$match": {
<<<<<<< HEAD
                        "type": "want" //mandatory
=======
                        "type": "web.trending.banners" //mandatory
>>>>>>> 69cd0ded9085104d0d1cb79802957c6a0e1ba1f4
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
<<<<<<< HEAD
                        v1: "$d.srv",
                        v2: "$d.sbj"
=======
                        v1: "$d.pagetype",
                        v2: "$d.u_gdr"
>>>>>>> 69cd0ded9085104d0d1cb79802957c6a0e1ba1f4
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
        },
        {
            "reaggragatable": true,
            "mobile_banners_impressions": [
                {
                    "$match": {
                        "type": "api.trending.lists" //mandatory
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
