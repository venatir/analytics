module.exports = {
    "aggregations": [
        {
            "reaggragatable": true,
            "web_banners_impressions": [
                {
                    "$match": {
                        "type": "web.trending.banners" //mandatory
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.plt",
                        v2: "$d.r_cc"
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
        },
        {
            "reaggragatable": true,
            "trending_products_impressions": [
                {
                    "$match": {
                        "type": "api.trending.products" //mandatory
                    }},
                {
                    "$project": {
                        _id: 0,
                        type: "$type",
                        v1: "$d.plt",
                        v2: "$d.r_gd",
                        v3: "$d.r_cc",
                        v4: "$d.pagetype"
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "type": "$type",
                            "v1": "$v1",
                            "v2": "$v2",
                            "v3": "$v3",
                            "v4": "$v4"
                        },
                        "count": {
                            $sum: 1
                        }
                    }
                }
            ]
        }
    ]
};
