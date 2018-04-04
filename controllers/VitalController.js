var document = require('../models/db_model')
var async = require('async')
var documentObject = document.domainModel
var mongoose = require('mongoose');
var moment = require('moment');
var EMR_CONFIG = require('config').get('ehrserver');

module.exports.addMultipleVitalsToVisit = function (data, res) {
    documentObject.Visit.findOne({
        _id: data.visitId,
        patientId: data.patientId
    }, function (err, result) {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else if (!result)
            return res.json(Utility.output("Incorrect VisitId or PatientId", 'ERROR'));
        else {
            async.eachSeries(data.vitals, function (element, callback) {
                if (element.calculation !== '' || element.vitalName === 'BloodPressure') {
                    element.IsParentVital = true;
                    calculateVitalValue(element).then(value => {
                        element.vitalValue = value;
                        addVitalEntry(data, element, function (err, success) {
                            if (err) {
                                console.log("Error " + err);
                                callback(err);
                            } else {
                                callback();
                            }
                        });
                    });
                    console.log("Calculate the Parent Vital value");
                } else {
                    addVitalEntry(data, element, function (err, success) {
                        if (err) {
                            console.log("Error " + err);
                            callback(err);
                        } else {
                            callback();
                        }
                    });
                }

            }, function (err, result) {
                if (err) {
                    return res.json(Utility.output(err, 'ERROR'));
                } else {
                    return res.json(Utility.output("Vital Added", 'SUCCESS'));
                }
            })
        }
    })
}

module.exports.getPatientVitals = function (patientId, res, req) {
    var query = {
        "patientId": patientId
    };
    if (req.query.visitId)
        query.visitId = Utility.escape(req.query.visitId)
    documentObject.Vital.aggregate([
        {
            $match: query
        },
        {
            $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "vitalId",
                foreignField: "_id",
                as: "VitalInfo"
            }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "subVitals.vitalId",
                foreignField: "_id",
                as: "subVitals.VitalInfo"
            }
        },
        { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true } }, {
            "$redact": {
                "$cond": {
                    if: {
                        "$or": [
                            { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
                            { "$eq": ["$IsParentVital", true] }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        },
        { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
        , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
        {
            "$redact": {
                "$cond": {
                    if: {
                        $or: [
                            {
                                "$and": [
                                    {
                                        $lt: ["$VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            },
                            {
                                "$and": [
                                    {
                                        $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        }, {
            $project: {
                "_id": "$_id",
                "date": "$date",
                "patientId": "$patientId",
                "userId": "$userId",
                "visitId": "$visitId",
                "IsParentVital": "$IsParentVital",
                "markError": "$markError",
                "vitalName": "$vitalName",
                "qualifier": "$qualifier",
                "vitalValue": "$vitalValue",
                "status": {
                    $cond: {
                        if: { $eq: ["$VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
                "unitname": "$VitalInfo.unit.unitname",
                "subVitals.vitalName": 1,
                "subVitals.vitalValue": 1,
                "subVitals.qualifier": 1,
                "subVitals.status": {
                    $cond: {
                        if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
            }
        }, {
            $group: {
                _id: "$_id",
                "date": { $first: "$date" },
                "patientId": { $first: "$patientId" },
                "IsParentVital": { $first: "$IsParentVital" },
                "userId": { $first: "$userId" },
                "visitId": { $first: "$visitId" },
                "unitname": { $first: "$unitname" },
                "vitalName": { $first: "$vitalName" },
                "markError": { $first: "$markError" },
                "qualifier": { $first: "$qualifier" },
                "vitalValue": { $first: "$vitalValue" },
                "status": { $first: "$status" },
                "subVitals": { $push: "$subVitals" }
            }
        }, { $sort: { date: -1 } }
    ], function (err, success) {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else {
            success.forEach(R_element => {
                if (R_element.IsParentVital == null)
                    delete R_element.subVitals
                else {
                    R_element.subVitals.forEach(S_element => {
                        R_element.status = (R_element.status < S_element.status) ? S_element.status : R_element.status;
                    });
                }
            });
            return res.json(Utility.output(success.length + " item found", 'SUCCESS', success));
        }
    })
}

module.exports.getVitals = function (query, callback) {
    documentObject.Vital.aggregate([
        query,
        {
            $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "vitalId",
                foreignField: "_id",
                as: "VitalInfo"
            }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "subVitals.vitalId",
                foreignField: "_id",
                as: "subVitals.VitalInfo"
            }
        },
        { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true } }, {
            "$redact": {
                "$cond": {
                    if: {
                        "$or": [
                            { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
                            { "$eq": ["$IsParentVital", true] }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        },
        // {
        //     "$redact": {
        //         "$cond": [
        //             { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
        //             "$$KEEP",
        //             "$$PRUNE"
        //         ]
        //     }
        // },
        { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
        , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
        {
            "$redact": {
                "$cond": {
                    if: {
                        $or: [
                            {
                                "$and": [
                                    {
                                        $lt: ["$VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            },
                            {
                                "$and": [
                                    {
                                        $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        }, {
            $project: {
                "_id": "$_id",
                "date": "$date",
                "patientId": "$patientId",
                "userId": "$userId",
                "visitId": "$visitId",
                "markError": "$markError",
                "vitalName": "$vitalName",
                "qualifier": "$qualifier",
                "vitalValue": "$vitalValue",
                "status": {
                    $cond: {
                        if: { $eq: ["$VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: "Normal",
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: "Critical",
                                        else: "Abnormal"
                                    }
                                }
                            }
                        },
                        else: "Normal"
                    }
                },
                "unitname": "$VitalInfo.unit.unitname",
                "subVitals.vitalName": 1,
                "subVitals.vitalValue": 1,
                "subVitals.qualifier": 1,
                "subVitals.status": {
                    $cond: {
                        if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: "Normal",
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: "Critical",
                                        else: "Abnormal"
                                    }
                                }
                            }
                        },
                        else: "Normal"
                    }
                },
            }
        }, {
            $group: {
                _id: "$_id",
                "date": { $first: "$date" },
                "patientId": { $first: "$patientId" },
                "userId": { $first: "$userId" },
                "visitId": { $first: "$visitId" },
                "unitname": { $first: "$unitname" },
                "vitalName": { $first: "$vitalName" },
                "markError": { $first: "$markError" },
                "qualifier": { $first: "$qualifier" },
                "vitalValue": { $first: "$vitalValue" },
                "status": { $first: "$status" },
                "subVitals": { $push: "$subVitals" }
            }
        }, { $sort: { date: -1 } }
    ], callback)
}

module.exports.getPatientCoversheetVitals = function (data, res) {
    documentObject.Vital.aggregate([
        {
            $match: {
                "patientId": data.patientId,
                "markError": { $ne: true }
            }
        }, {
            $sort: { date: -1 }
        }, {
            $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "vitalId",
                foreignField: "_id",
                as: "VitalInfo"
            }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "subVitals.vitalId",
                foreignField: "_id",
                as: "subVitals.VitalInfo"
            }
        },
        { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true } }, {
            "$redact": {
                "$cond": {
                    if: {
                        "$or": [
                            { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
                            { "$eq": ["$IsParentVital", true] }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        }, { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
        , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
        {
            "$redact": {
                "$cond": {
                    if: {
                        $or: [
                            {
                                "$and": [
                                    {
                                        $lt: ["$VitalInfo.unit.AgeRe.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            },
                            {
                                "$and": [
                                    {
                                        $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        }, {
            $group: {
                "_id": "$vitalId",
                "date": { $first: "$date" },
                "patientId": { $first: "$patientId" },
                "userId": { $first: "$userId" },
                "visitId": { $first: "$visitId" },
                "vitalName": { $first: "$vitalName" },
                "qualifier": { $first: "$qualifier" },
                "vitalValue": { $first: "$vitalValue" },
                "subVitals": { $first: "$subVitals" },
                "markError": { $first: "$markError" },
                "createdOn": { $first: "$createdOn" },
                "VitalInfo": { $first: "$VitalInfo" }
            }
        }, {
            $project: {
                "_id": "$_id",
                "date": "$date",
                "patientId": "$patientId",
                "userId": "$userId",
                "visitId": "$visitId",
                "vitalName": "$vitalName",
                "markError": "$markError",
                "qualifier": "$qualifier",
                "vitalValue": "$vitalValue",
                "status": {
                    $cond: {
                        if: { $eq: ["$VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
                "unitname": "$VitalInfo.unit.unitname",
                "subVitals.vitalName": 1,
                "subVitals.vitalValue": 1,
                "subVitals.qualifier": 1,
                "subVitals.status": {
                    $cond: {
                        if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
            }
        }, {
            $group: {
                _id: "$_id",
                "date": { $first: "$date" },
                "patientId": { $first: "$patientId" },
                "userId": { $first: "$userId" },
                "visitId": { $first: "$visitId" },
                "unitname": { $first: "$unitname" },
                "vitalName": { $first: "$vitalName" },
                "qualifier": { $first: "$qualifier" },
                "markError": { $first: "$markError" },
                "vitalValue": { $first: "$vitalValue" },
                "status": { $first: "$status" },
                "subVitals": { $push: "$subVitals" }
            }
        }, { $sort: { date: -1 } },
        { $limit: 20 }
    ], function (err, success) {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else {
            success.forEach(R_element => {
                if (R_element.IsParentVital == null)
                    delete R_element.subVitals
                else {
                    R_element.subVitals.forEach(S_element => {
                        R_element.status = (R_element.status < S_element.status) ? S_element.status : R_element.status;
                    });
                }
            });
            return res.json(Utility.output(success.length + " item found", 'SUCCESS', success));
        }
    })
}

module.exports.getPatientVitalsByDate = function (query, res) {

    documentObject.Vital.aggregate([
        query, {
            $sort: { date: -1 }
        }, {
            $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "vitalId",
                foreignField: "_id",
                as: "VitalInfo"
            }
        }, {
            $lookup: {
                from: "m_vitals",
                localField: "subVitals.vitalId",
                foreignField: "_id",
                as: "subVitals.VitalInfo"
            }
        },
        { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
        {
            $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true }
        }, {
            "$redact": {
                "$cond": {
                    if: {
                        "$or": [
                            { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
                            { "$eq": ["$IsParentVital", true] }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        }, { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
        , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
        {
            "$redact": {
                "$cond": {
                    if: {
                        $or: [
                            {
                                "$and": [
                                    {
                                        $lt: ["$VitalInfo.unit.AgeRe.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            },
                            {
                                "$and": [
                                    {
                                        $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
                                    },
                                    {
                                        $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

                                    }
                                ]
                            }
                        ]
                    },
                    then: "$$KEEP",
                    else: "$$PRUNE"
                }
            }
        },
        {
            $project: {
                "_id": "$_id",
                "vitalId": "$vitalId",
                "date": "$date",
                "patientId": "$patientId",
                "userId": "$userId",
                "visitId": "$visitId",
                "IsParentVital": "$IsParentVital",
                "vitalName": "$vitalName",
                "markError": "$markError",
                "qualifier": "$qualifier",
                "vitalValue": "$vitalValue",
                "status": {
                    $cond: {
                        if: { $eq: ["$VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
                "unitname": "$VitalInfo.unit.unitname",
                "subVitals.vitalName": 1,
                "subVitals.vitalValue": 1,
                "subVitals.qualifier": 1,
                "subVitals.status": {
                    $cond: {
                        if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
                                        { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
                                    ]
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
                                                { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
                                            ]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                }
                            }
                        },
                        else: 0
                    }
                },
            }
        }, {
            $group: {
                _id: "$_id",
                "date": { $first: "$date" },
                "patientId": { $first: "$patientId" },
                "userId": { $first: "$userId" },
                "IsParentVital": { $first: "$IsParentVital" },
                "visitId": { $first: "$visitId" },
                "unitname": { $first: "$unitname" },
                "vitalId": { $first: "$vitalId" },
                "vitalName": { $first: "$vitalName" },
                "qualifier": { $first: "$qualifier" },
                "markError": { $first: "$markError" },
                "vitalValue": { $first: "$vitalValue" },
                "status": { $first: "$status" },
                "subVitals": { $push: "$subVitals" }
            }
        }, { $sort: { date: -1 } }
    ], function (err, success) {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else {
            // console.log(JSON.stringify(success))
            success.forEach(R_element => {
                if (R_element.IsParentVital == null)
                    delete R_element.subVitals
                else {
                    //console.log("\n"+JSON.stringify(R_element))
                    R_element.subVitals.forEach(S_element => {
                        R_element.status = (R_element.status < S_element.status) ? S_element.status : R_element.status;
                    });
                }
            });
            return res.json(Utility.output(success.length + " item found", 'SUCCESS', success));
        }
    })
}

function addVitalEntry(data, element, callback) {
    // var vitalToSave = new documentObject.Vital(element);
    // vitalToSave._id = new mongoose.Types.ObjectId();//Mongodb will create it by own Not required..
    // vitalToSave.visitId = data.visitId
    // vitalToSave.userId = data.userId
    // vitalToSave.patientId = data.patientId
    // vitalToSave.date = data.date
    // vitalToSave.save(callback)
    element._id = new mongoose.Types.ObjectId();//Mongodb will create it by own Not required..
    element.visitId = data.visitId
    element.userId = data.userId
    element.patientId = data.patientId
    element.date = data.date
    element.markError = false
    element.age = parseInt(element.age)
    element.vitalId = ObjectID(element.vitalId)
    element.unitId = ObjectID(element.unitId)
    element.subVitals.forEach(subelement => {
        subelement.vitalId = ObjectID(subelement.vitalId)
        subelement.unitId = ObjectID(subelement.unitId)
    });
    documentObject.Vital.collection.insert(element, callback)
}

async function calculateVitalValue(element) {
    var value = new Promise((resolve, reject) => {
        if (element.vitalName === 'BloodPressure') {
            let sys = element.subVitals.find(obj => {
                return obj.vitalName === 'Systolic'
            })
            let dia = element.subVitals.find(obj => {
                return obj.vitalName === 'Diastolic'
            })
            console.log("Calculated");
            let Syatolic = (sys.vitalValue) ? sys.vitalValue : 'NA';
            let Diastolic = (dia.vitalValue) ? dia.vitalValue : 'NA';
            resolve(Syatolic + "/" + Diastolic);
        } else {
            resolve("Vital not defined");
        }
    })
    return value;
}



/////Query Backup
// {
//     $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
// }, {
//     $lookup: {
//         from: "m_vitals",
//         localField: "vitalId",
//         foreignField: "_id",
//         as: "VitalInfo"
//     }
// }, {
//     $lookup: {
//         from: "m_vitals",
//         localField: "subVitals.vitalId",
//         foreignField: "_id",
//         as: "subVitals.VitalInfo"
//     }
// },
// { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
// { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
// { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
// {
//     $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true }
// }, {
//     "$redact": {
//         "$cond": {
//             if: {
//                 "$or": [
//                     { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
//                     { "$eq": ["$IsParentVital", true] }
//                 ]
//             },
//             then: "$$KEEP",
//             else: "$$PRUNE"
//         }
//     }
// }, { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
// , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
// {
//     "$redact": {
//         "$cond": {
//             if: {
//                 $or: [
//                     {
//                         "$and": [
//                             {
//                                 $lt: ["$VitalInfo.unit.AgeRe.minAge", "$age"]
//                             },
//                             {
//                                 $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

//                             }
//                         ]
//                     },
//                     {
//                         "$and": [
//                             {
//                                 $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
//                             },
//                             {
//                                 $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

//                             }
//                         ]
//                     }
//                 ]
//             },
//             then: "$$KEEP",
//             else: "$$PRUNE"
//         }
//     }
// },
// {
//     $project: {
//         "_id": "$_id",
//         "vitalId": "$vitalId",
//         "date": "$date",
//         "patientId": "$patientId",
//         "userId": "$userId",
//         "visitId": "$visitId",
//         "IsParentVital":"$IsParentVital",
//         "vitalName": "$vitalName",
//         "markError": "$markError",
//         "qualifier": "$qualifier",
//         "vitalValue": "$vitalValue",
//         "status": {
//             $cond: {
//                 if: { $eq: ["$VitalInfo.entryType", "integer"] },
//                 then: {
//                     $cond: {
//                         if: {
//                             $and: [
//                                 { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
//                                 { $lt: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
//                             ]
//                         },
//                         then: 0,
//                         else: {
//                             $cond: {
//                                 if: {
//                                     $or: [
//                                         { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
//                                         { $lt: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
//                                     ]
//                                 },
//                                 then: 2,
//                                 else: 1
//                             }
//                         }
//                     }
//                 },
//                 else: 0
//             }
//         },
//         "unitname": "$VitalInfo.unit.unitname",
//         "subVitals.vitalName": 1,
//         "subVitals.vitalValue": 1,
//         "subVitals.qualifier": 1,
//         "subVitals.status": {
//             $cond: {
//                 if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
//                 then: {
//                     $cond: {
//                         if: {
//                             $and: [
//                                 { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
//                                 { $lt: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
//                             ]
//                         },
//                         then: "Normal",
//                         else: {
//                             $cond: {
//                                 if: {
//                                     $or: [
//                                         { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
//                                         { $lt: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
//                                     ]
//                                 },
//                                 then: "Critical",
//                                 else: "Abnormal"
//                             }
//                         }
//                     }
//                 },
//                 else: "Normal"
//             }
//         },
//     }
// }, {
//     $group: {
//         _id: "$_id",
//         "date": { $first: "$date" },
//         "patientId": { $first: "$patientId" },
//         "userId": { $first: "$userId" },
//         "IsParentVital":{ $first: "$IsParentVital" },
//         "visitId": { $first: "$visitId" },
//         "unitname": { $first: "$unitname" },
//         "vitalId": { $first: "$vitalId" },
//         "vitalName": { $first: "$vitalName" },
//         "qualifier": { $first: "$qualifier" },
//         "markError": { $first: "$markError" },
//         "vitalValue": { $first: "$vitalValue" },
//         "status": { $first: "$status" },
//         "subVitals": { $push: "$subVitals" }
//     }
// }, { $sort: { date: -1 } }






// {
//     $unwind: { path: "$subVitals", preserveNullAndEmptyArrays: true }
// }, {
//     $lookup: {
//         from: "m_vitals",
//         localField: "vitalId",
//         foreignField: "_id",
//         as: "VitalInfo"
//     }
// }, {
//     $lookup: {
//         from: "m_vitals",
//         localField: "subVitals.vitalId",
//         foreignField: "_id",
//         as: "subVitals.VitalInfo"
//     }
// },
// { $unwind: { path: "$VitalInfo", preserveNullAndEmptyArrays: true } },
// { $unwind: { path: "$subVitals.VitalInfo", preserveNullAndEmptyArrays: true } },
// { $unwind: { path: "$VitalInfo.unit", preserveNullAndEmptyArrays: true } },
// { $unwind: { path: "$subVitals.VitalInfo.unit", preserveNullAndEmptyArrays: true } }, {
//     "$redact": {
//         "$cond": {
//             if: {
//                 "$or": [
//                     { "$eq": ["$unitId", "$VitalInfo.unit.unitId"] },
//                     { "$eq": ["$IsParentVital", true] }
//                 ]
//             },
//             then: "$$KEEP",
//             else: "$$PRUNE"
//         }
//     }
// }, { $unwind: { path: "$VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } }
// , { $unwind: { path: "$subVitals.VitalInfo.unit.AgeRange", preserveNullAndEmptyArrays: true } },
// {
//     "$redact": {
//         "$cond": {
//             if: {
//                 $or: [
//                     {
//                         "$and": [
//                             {
//                                 $lt: ["$VitalInfo.unit.AgeRe.minAge", "$age"]
//                             },
//                             {
//                                 $gte: ["$VitalInfo.unit.AgeRange.maxAge", "$age"]

//                             }
//                         ]
//                     },
//                     {
//                         "$and": [
//                             {
//                                 $lt: ["$subVitals.VitalInfo.unit.AgeRange.minAge", "$age"]
//                             },
//                             {
//                                 $gte: ["$subVitals.VitalInfo.unit.AgeRange.maxAge", "$age"]

//                             }
//                         ]
//                     }
//                 ]
//             },
//             then: "$$KEEP",
//             else: "$$PRUNE"
//         }
//     }
// }, {
//     $group: {
//         "_id": "$vitalId",
//         "date": { $first: "$date" },
//         "patientId": { $first: "$patientId" },
//         "userId": { $first: "$userId" },
//         "visitId": { $first: "$visitId" },
//         "vitalName": { $first: "$vitalName" },
//         "qualifier": { $first: "$qualifier" },
//         "vitalValue": { $first: "$vitalValue" },
//         "subVitals": { $first: "$subVitals" },
//         "markError": { $first: "$markError" },
//         "createdOn": { $first: "$createdOn" },
//         "VitalInfo": { $first: "$VitalInfo" }
//     }
// }, {
//     $project: {
//         "_id": "$_id",
//         "date": "$date",
//         "patientId": "$patientId",
//         "userId": "$userId",
//         "visitId": "$visitId",
//         "vitalName": "$vitalName",
//         "markError": "$markError",
//         "qualifier": "$qualifier",
//         "vitalValue": "$vitalValue",
//         "status": {
//             $cond: {
//                 if: { $eq: ["$VitalInfo.entryType", "integer"] },
//                 then: {
//                     $cond: {
//                         if: {
//                             $and: [
//                                 { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refLow"] },
//                                 { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.refHigh"] }
//                             ]
//                         },
//                         then: 0,
//                         else: {
//                             $cond: {
//                                 if: {
//                                     $or: [
//                                         { $gte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalHigh"] },
//                                         { $lte: ["$vitalValue", "$VitalInfo.unit.AgeRange.criticalLow"] }
//                                     ]
//                                 },
//                                 then: 2,
//                                 else: 1
//                             }
//                         }
//                     }
//                 },
//                 else: 0
//             }
//         },
//         "unitname": "$VitalInfo.unit.unitname",
//         "subVitals.vitalName": 1,
//         "subVitals.vitalValue": 1,
//         "subVitals.qualifier": 1,
//         "subVitals.status": {
//             $cond: {
//                 if: { $eq: ["$subVitals.VitalInfo.entryType", "integer"] },
//                 then: {
//                     $cond: {
//                         if: {
//                             $and: [
//                                 { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refLow"] },
//                                 { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.refHigh"] }
//                             ]
//                         },
//                         then: 0,
//                         else: {
//                             $cond: {
//                                 if: {
//                                     $or: [
//                                         { $gte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalHigh"] },
//                                         { $lte: ["$subVitals.vitalValue", "$subVitals.VitalInfo.unit.AgeRange.criticalLow"] }
//                                     ]
//                                 },
//                                 then: 2,
//                                 else: 1
//                             }
//                         }
//                     }
//                 },
//                 else: 0
//             }
//         },
//     }
// }, {
//     $group: {
//         _id: "$_id",
//         "date": { $first: "$date" },
//         "patientId": { $first: "$patientId" },
//         "userId": { $first: "$userId" },
//         "visitId": { $first: "$visitId" },
//         "unitname": { $first: "$unitname" },
//         "vitalName": { $first: "$vitalName" },
//         "qualifier": { $first: "$qualifier" },
//         "markError": { $first: "$markError" },
//         "vitalValue": { $first: "$vitalValue" },
//         "status": { $first: "$status" },
//         "subVitals": { $push: "$subVitals" }
//     }
// }, 