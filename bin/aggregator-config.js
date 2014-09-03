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
    ]
};
