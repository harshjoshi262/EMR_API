var async = require('async');
var document = require('./db_model.js');
var uuid = require('node-uuid');
var mongoose = require('mongoose');
var objectId = require('mongoose').Types.ObjectId;
var documentObject12 = document.mastersModel;
var domainModel = document.domainModel;
var CONFIG = require('config');
var EHR_CONFIG = CONFIG.get('ehrserver');
module.exports.uploadTemplateImage = function (data, res) {
    var templateImage = new documentObject12.m_TemplateImage(data);
    templateImage.save(function (err, ok) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output("Image Upload successfully", 'SUCCESS', "Image Upload successfully"));
    });
}

module.exports.getTemplateImagesByCategory = function (req, res) {
    documentObject12.m_TemplateImage.find({ Category: req.params.category }, function (err, list) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(list.length + " record(s) found", 'SUCCESS', list));
    });
}

module.exports.getTemplateImages = function (data, res) {
    documentObject12.m_TemplateImage.find({}, function (err, list) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(list.length + " record(s) found", 'SUCCESS', list));
    });
}

module.exports.vitalView = function (req, res) {
    // documentObject12.m_vital.find({ speciality: "Common" }, ' vitalName _id priority').sort({ priority: 1 }).exec(function (err, items) {
    //     if (err) {
    //         return res.json(Utility.output(err, 'ERROR'));
    //     }
    //     return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    // });

    documentObject12.m_vital.find({ speciality: "Common", "IsSubVital": false }, ' vitalName Abbrevation _id ').sort({ priority: 1 }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });

    // documentObject12.m_vital.aggregate([
    //     {
    //         $group: {
    //             _id: "$parentVitalID",
    //             vitalName: { "$first": "$parentVitalName" }
    //         }
    //     }
    // ]).exec(function (err, items) {
    //     if (err) {
    //         return res.json(Utility.output(err, 'ERROR'));
    //     }
    //     return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    // });
};

module.exports.vitalsView = function (req, res) {
    documentObject12.vitals.find({ speciality: "Common" }, ' vitalName _id priority').sort({ priority: 1 }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.vitalsById = function (req, res) {

    // V 1.2
    var searchQuery = [];
    searchQuery.push({
        $match: { '_id': new ObjectID(req.params.id) }
    })

    searchQuery.push({
        $lookup: {
            from: "m_vitals",
            localField: "subVital",
            foreignField: "_id",
            as: "subVital"
        }
    })

    searchQuery.push({ $unwind: "$subVital" })
    searchQuery.push({ $unwind: "$subVital.unit" })
    searchQuery.push({ $unwind: "$subVital.unit.AgeRange" })


    if (req.query['age']) {
        searchQuery.push({
            $match: {
                'subVital.unit.AgeRange.minAge': { $lte: parseInt(req.query['age']) },
                'subVital.unit.AgeRange.maxAge': { $gte: parseInt(req.query['age']) }
            }
        })
    }

    searchQuery.push({
        $group: {
            "_id": "$subVital.vitalName",
            "vitalName": { $first: "$subVital.vitalName" },
            "vitalID": { $first: "$subVital._id" },
            "parentVitalID": { $first: "$_id" },
            "parentVitalName": { $first: "$vitalName" },
            "parentVitalAbbrevation": { $first: "$Abbrevation" },
            "parentVitalentryType": { $first: "$entryType" },
            "Abbrevation": { $first: "$subVital.Abbrevation" },
            "entryType": { $first: "$subVital.entryType" },
            "qualifire": { $first: "$subVital.qualifire" },
            "Priority": { $first: "$subVital.Priority" },
            "parentVitalcalculation": { $first: "$calculation" },
            "Status": { $first: "$subVital.Status" },
            "unit": { $push: "$subVital.unit" },
        }
    })

    searchQuery.push({
        $sort: { "Priority": 1 }
    })

    searchQuery.push({
        $group: {
            _id: "$parentVitalName",
            vitalName: { $first: "$parentVitalName" },
            vitalId: { $first: "$parentVitalID" },
            calculation: { $first: "$parentVitalcalculation" },
            subvital: { $push: "$$ROOT" }
        }
    })

    documentObject12.m_vital.aggregate(searchQuery, (err, success) => {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        if (!success)
            return res.json(Utility.output("0 record(s) found", 'SUCCESS', {}));
        return res.json(Utility.output(success.length + " record(s) found", 'SUCCESS', success));
    })

    // V 1.1
    // var searchQuery = [];
    // searchQuery.push({
    //     $match: { 'parentVitalID': new ObjectID(req.params.id) }
    // })
    // searchQuery.push({ $unwind: "$unit" })
    // searchQuery.push({ $unwind: "$unit.AgeRange" })

    // if (req.query['age']) {
    //     searchQuery.push({
    //         $match: {
    //             'unit.AgeRange.minAge': { $lte: parseInt(req.query['age']) },
    //             'unit.AgeRange.maxAge': { $gte: parseInt(req.query['age']) }
    //         }
    //     })
    // }

    // searchQuery.push({
    //     $group: {
    //         _id: "$vitalName",
    //         parentVitalID: { $first: "$parentVitalID" },
    //         parentVitalName: { $first: "$parentVitalName" },
    //         vitalName: { $first: "$vitalName" },
    //         Abbrevation: { $first: "$Abbrevation" },
    //         entryType: { $first: "$entryType" },
    //         calculation: { $first: "$calculation" },
    //         speciality: { $first: "$speciality" },
    //         Status: { $first: "$Status" },
    //         IsSubvital: { $first: "$IsSubvital" },
    //         unit: { $push: "$unit" }
    //     }
    // })

    // searchQuery.push({
    //     $group: {
    //         _id: "$parentVitalName",
    //         subvital: { $push: "$$ROOT" }
    //     }
    // })

    // documentObject12.m_vital.aggregate(searchQuery, (err, success) => {
    //     if (err)
    //         return res.json(Utility.output(err, 'ERROR'));
    //     if (!success)
    //         return res.json(Utility.output("0 record(s) found", 'SUCCESS', {}));
    //     return res.json(Utility.output(success.length + " record(s) found", 'SUCCESS', success));
    // })

    // V 1.0
    // var query = { _id: new ObjectID(req.params.id) };
    // if (req.query['age']) {
    //     query["$or"] = [{
    //         $and: [
    //             { 'unit.ageBased.minAge': { $lte: parseInt(req.query['age']) } },
    //             { 'unit.ageBased.maxAge': { $gte: parseInt(req.query['age']) } },
    //             { _id: new ObjectID(req.params.id) }
    //         ]
    //     },
    //     {
    //         $and: [
    //             { 'subVital.unit.ageBased.minAge': { $lte: parseInt(req.query['age']) } },
    //             { 'subVital.unit.ageBased.maxAge': { $gte: parseInt(req.query['age']) } },
    //             { _id: new ObjectID(req.params.id) }
    //         ]
    //     }];
    // }
    // try {
    //     documentObject12.vitals.findOne(query, function (err, done) {
    //         if (err) {
    //             return res.json(Utility.output(err, 'ERROR'));
    //         }
    //         if (!done)
    //             return res.json(Utility.output("0 record(s) found", 'SUCCESS', {}));
    //         return res.json(Utility.output("1 record(s) found", 'SUCCESS', done));
    //     });
    // } catch (e) {
    //     return res.json(Utility.output(e.message, 'ERROR'));
    // }
};

module.exports.vitalSetSearch = function (req, res) {
    log("search vitalset")
    var setId = req.query['setId'];
    documentObject12.prefVitalSet.findOne({ _id: setId }, function (err, vitalSet) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        if (!vitalSet)
            return res.json(Utility.output("0 records found", 'SUCCESS', []));
        else {
            var searchQuery = [];
            searchQuery.push({
                $match: {
                    _id: { $in: vitalSet.vitalList }
                }
            })

            searchQuery.push({
                $lookup: {
                    from: "m_vitals",
                    localField: "subVital",
                    foreignField: "_id",
                    as: "subVital"
                }
            })

            searchQuery.push({ $unwind: "$subVital" })
            searchQuery.push({ $unwind: "$subVital.unit" })
            searchQuery.push({ $unwind: "$subVital.unit.AgeRange" })


            if (req.query['age']) {
                searchQuery.push({
                    $match: {
                        'subVital.unit.AgeRange.minAge': { $lte: parseInt(req.query['age']) },
                        'subVital.unit.AgeRange.maxAge': { $gte: parseInt(req.query['age']) }
                    }
                })
            }

            searchQuery.push({
                $group: {
                    "_id": "$subVital.vitalName",
                    "vitalName": { $first: "$subVital.vitalName" },
                    "vitalID": { $first: "$subVital._id" },
                    "parentVitalID": { $first: "$_id" },
                    "parentVitalName": { $first: "$vitalName" },
                    "parentVitalAbbrevation": { $first: "$Abbrevation" },
                    "parentVitalentryType": { $first: "$entryType" },
                    "Abbrevation": { $first: "$subVital.Abbrevation" },
                    "entryType": { $first: "$subVital.entryType" },
                    "qualifire": { $first: "$subVital.qualifire" },
                    "parentVitalcalculation": { $first: "$calculation" },
                    "Status": { $first: "$subVital.Status" },
                    "unit": { $push: "$subVital.unit" },
                }
            })

            searchQuery.push({
                $group: {
                    _id: "$parentVitalName",
                    vitalName: { $first: "$parentVitalName" },
                    vitalId: { $first: "$parentVitalID" },
                    calculation: { $first: "$parentVitalcalculation" },
                    vital: { $push: "$$ROOT" }
                }
            })


            documentObject12.m_vital.aggregate(searchQuery).exec(function (err, items) {
                if (err) {
                    return res.json(Utility.output(err, 'ERROR'));
                }
                return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
            });
        }
    });
};

module.exports.vitalByName = function (req, res) {
    try {
        documentObject12.vitals.find({ vitalName: new RegExp(req.params.search, 'i') }, 'vitalName', function (err, done) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            return res.json(Utility.output(done.length + " records found", 'SUCCESS', done));
        })
    } catch (e) {
        return res.json(Utility.output(e.message, 'ERROR'));
    }
};

//////////**   notificationtype  master */
module.exports.addNotificationsType = function (data, res) {
    domainModel.notificationType.count(function (err, index) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else {
            var newType = new domainModel.notificationType();
            newType._id = document.isFieldFilled(index) && (index > 0) ? index : 0;
            newType.key = data.key;
            newType.isActive = data.isActive;
            newType.const = newType.key.toLowerCase();
            newType.actions = data.actions;
            newType.save(function (err, result) {
                if (err) {
                    return res.json(Utility.output(err, 'ERROR'));
                }
                return res.json(Utility.output("done", 'SUCCESS'));
            });
        }
    });
};

module.exports.getAllNotificationsType = function (res) {
    domainModel.notificationType.find().populate('actions').exec(function (err, results) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(results.length + " record(s) found", 'SUCCESS', results));
    });
};

module.exports.addNotificationsAction = function (data, res) {
    domainModel.notificationAction.count(function (err, index) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else {
            var newAction = new domainModel.notificationAction();
            newAction._id = document.isFieldFilled(index) && (index > 0) ? index : 0;
            newAction.key = data.key;
            newAction.isActive = data.isActive;
            newAction.DislayName = data.DislayName;
            newAction.save(function (err, result) {
                if (err) {
                    return res.json(Utility.output(err, 'ERROR'));
                }
                return res.json(Utility.output("done", 'SUCCESS'));
            });
        }
    });
};

module.exports.getAllNotificationActions = function (res) {
    domainModel.notificationAction.find({}, function (err, results) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(results.length + " record(s) found", 'SUCCESS', results));
    });
};

module.exports.addVital = function (req, res) {
    var data = req.body;
    let _data = [];

    if (data._id && data._id !== '') {

    } else {
        var vitalToSave = new documentObject12.m_vital(data);
        vitalToSave._id = new mongoose.Types.ObjectId();
        if (!Utility.IsNullOrEmpty(data.subVitals) && data.subVitals.length > 0) {
            async.eachSeries(data.subVitals, function (element, callback) {
                var subVitalToSave = new documentObject12.m_vital(element);
                subVitalToSave._id = new mongoose.Types.ObjectId();
                subVitalToSave.IsSubVital = true;
                subVitalToSave.save((err, success) => {
                    if (err) {
                        log("Error: " + err);
                        callback()
                    } else {
                        vitalToSave.subVital.push(success._id);
                        callback()
                    }
                })
            }, function (err, done) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                else {
                    vitalToSave.save((err, completed) => {
                        if (err)
                            return res.json(Utility.output(err, 'ERROR'));
                        else
                            return res.json(Utility.output("Vital Saved Successfully", 'SUCCESS'));
                    })
                }
            });
        } else {
            vitalToSave.subVital.push(vitalToSave._id);
            vitalToSave.save((err, completed) => {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                else
                    return res.json(Utility.output("Vital Saved Successfully", 'SUCCESS'));
            })
        }

    }
};

module.exports.vitalSearch = function (req, res) {
    log("search all vitals")

    var searchQuery = [];
    searchQuery.push({
        $match: { IsSubVital: false }
    })

    searchQuery.push({
        $lookup: {
            from: "m_vitals",
            localField: "subVital",
            foreignField: "_id",
            as: "subVital"
        }
    })

    searchQuery.push({ $unwind: "$subVital" })
    searchQuery.push({ $unwind: "$subVital.unit" })
    searchQuery.push({ $unwind: "$subVital.unit.AgeRange" })


    if (req.query['age']) {
        searchQuery.push({
            $match: {
                'subVital.unit.AgeRange.minAge': { $lte: parseInt(req.query['age']) },
                'subVital.unit.AgeRange.maxAge': { $gte: parseInt(req.query['age']) }
            }
        })
    }

    searchQuery.push({
        $group: {
            "_id": "$subVital.vitalName",
            "vitalName": { $first: "$subVital.vitalName" },
            "vitalID": { $first: "$subVital._id" },
            "parentVitalID": { $first: "$_id" },
            "parentVitalName": { $first: "$vitalName" },
            "parentVitalAbbrevation": { $first: "$Abbrevation" },
            "parentVitalentryType": { $first: "$entryType" },
            "Abbrevation": { $first: "$subVital.Abbrevation" },
            "entryType": { $first: "$subVital.entryType" },
            "qualifire": { $first: "$subVital.qualifire" },
            "parentVitalcalculation": { $first: "$calculation" },
            "Status": { $first: "$subVital.Status" },
            "unit": { $push: "$subVital.unit" },
        }
    })

    searchQuery.push({
        $group: {
            _id: "$parentVitalName",
            vitalName: { $first: "$parentVitalName" },
            vitalId: { $first: "$parentVitalID" },
            calculation: { $first: "$parentVitalcalculation" },
            vital: { $push: "$$ROOT" }
        }
    })


    documentObject12.m_vital.aggregate(searchQuery).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getPrefix = function (req, res) {
    var code = req.params.search;
    documentObject12.m_prefix.find({ Description: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getCountry = function (req, res) {
    var code = req.params.search;
    documentObject12.m_country.find({ Description: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getState = function (req, res) {
    var code = req.params.search;
    documentObject12.m_state.find({ $and: [{ Description: new RegExp(code, 'i') }, { CountryId: req.params.countryId }] }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getCity = function (req, res) {
    var code = req.params.search;
    documentObject12.m_city.find({ $and: [{ Description: new RegExp(code, 'i') }, { StateID: req.params.stateId }] }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.radiologyTestType = function (req, res) {
    documentObject12.m_radiology.distinct("Test_Category").exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.radiologyTestByType = function (req, res) {
    var code = req.params.search;
    var type = req.params.type;
    documentObject12.m_radiology.find({ $and: [{ Test_Category: type }, { Test_Name: new RegExp(code, 'i') }] }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.radiologyTestSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_radiology.find({ Test_Category: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.specimanSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_specimen.find({
        "$or": [
            { category_code: new RegExp(code, 'i') },
            { category_name: new RegExp(code, 'i') },
            { speciman: new RegExp(code, 'i') }]
    },
        '_id category_name category_code speciman')
        .limit(EHR_CONFIG.search_limit)
        .exec(function (err, items) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
        });
};

module.exports.sampleSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_sample.find({ Description: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.frequencySearch = function (req, res) {
    var code = req.params.search;
    code = code.replace(/[^\w\s]/gi, '');
    documentObject12.m_frequency.aggregate([
        {
            $lookup: {
                from: "m_dosefrequencydetails",
                localField: "ID",
                foreignField: "FrequencyID",
                as: "m_dosefrequencydetails"
            }
        },
        {
            $project: {
                "_id": "$_id",
                "day_frequency": { $size: "$m_dosefrequencydetails.FrequencyID" },
                "HIS_ID": "$ID",
                "Description": "$Description",
                "Token": "$Token",
                "Status": "$Status",
                "Abbreviation": "$Abbreviation",
                "NumberOfDays": "$NumberOfDays",
                "isPRN": "$Description"
            }
        },
        {
            "$match": {
                $or: [
                    { "Description": { $regex: '^' + code, $options: 'i' } },
                    { "Token": { $regex: '^' + code, $options: 'i' } },
                    { "Abbreviation": { $regex: '^' + code, $options: 'i' } }
                ],
                Status: 1
            }
        },
        { "$limit": 20 }
    ], function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(result.length + " record(s) found", 'SUCCESS', result));
    });
};

module.exports.labtestSearch = function (req, res) {
    var code = req.params.search;
    var cond = req.query['keyword'];
    var value = req.query['value'];
    var condition;
    if (cond.toLowerCase() == 'testname') {
        condition = { Test_Name: new RegExp(code, 'i') };
    } else {
        condition = { Test_Name: new RegExp(code, 'i'), Test_Category: new RegExp(value, 'i') };
    }
    documentObject12.m_labtest.find(condition).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getImagingChecklist = function (req, res) {
    documentObject12.m_checklist.find({ Code: req.params.category })
        .populate({
            path: 'Items',
            model: 'm_checklist_items'
        })
        .exec(function (err, items) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
        })
}

module.exports.searchImagingMaster = function (req, res) {
    var searchQuery = {
        Status: 1,
        CategoryID: parseFloat(req.query.category),
        EMRName: RegExp(req.params.searchValue, 'i')
    }
    // console.log(searchQuery)
    documentObject12.m_imagingMasterNew.aggregate([
        {
            $match: {
                $and: [
                    {
                        Status: 1,
                        CategoryID: parseFloat(req.query.category),

                    }, {
                        $or: [
                            {
                                EMRName: RegExp(req.params.searchValue, 'i')
                            }, {
                                Alias: RegExp(req.params.searchValue, 'i')
                            }
                        ]
                    }]
            }
        }
        , {
            $lookup: {
                from: "m_modalitymasters",
                localField: "ModalityId",
                foreignField: "Id",
                as: "ModalityCode"
            }
        }, {
            $unwind: { path: '$ModalityCode', preserveNullAndEmptyArrays: true }
        }, {
            $group: {
                _id: '$EMRName',
                values: {
                    $push: {
                        'ID': '$ID',
                        'Modifier': { $cond: [{ $eq: ['$Modifier', 'NULL'] }, "", "$Modifier"] },
                        'Code': '$Code',
                        'ServiceID': '$ServiceID',
                        "CategoryID": '$CategoryID',
                        'ModalityId': '$ModalityId',
                        'ModalityCode': '$ModalityCode.Description',
                        "Checklist": "$Checklist"
                    }
                }
            }
        }, {
            $project: {
                'ItemName': "$_id",
                "_id": false,
                'values': true
            }
        }, {
            $limit: EHR_CONFIG.search_limit
        }
    ]).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else {
            return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
        }
    })
}

module.exports.ImagingCategoryList = function (req, res) {
    documentObject12.m_imagingCategoryNew.find(
        function (err, items) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            } else {
                return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
            }
        })



}
module.exports.imagingProcedureListByCategory = function (req, res) {
    documentObject12.m_imaging.distinct("EMRDescription", {
        $and: [
            { CategoryID: req.params.code },
            { EMRDescription: new RegExp(req.params.search, 'i') }
        ]
    }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.imagingProcedureList = function (req, res) {
    documentObject12.m_imaging.aggregate([
        {
            $group: {
                "_id": "$EMRDescription"
            }
        },
        {
            "$match": { "_id": { $regex: '^' + req.params.search, $options: 'i' } }
        },
        { "$limit": 20 }
    ], function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (!items) {
            return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
        } else {
            var returnObj = [];
            async.eachSeries(items, function (eachItem, callback_inner) {
                returnObj.push(eachItem._id);
                callback_inner();
            }, function () {
                return res.json(Utility.output(returnObj.length + " record(s) found", 'SUCCESS', returnObj));
            });
        }
    });
};

module.exports.imagingProcedureDetails = function (req, res) {
    documentObject12.m_imaging.find(
        { EMRDescription: new RegExp(req.params.name, 'i') },
        { '_id': 0 }
    ).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.getImagingCategory = function (req, res) {
    documentObject12.m_imagingCategory.find({}, { '_id': 0, 'ID': 1, 'Description': 1 }, function (err, list) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(list.length + " record(s) found", 'SUCCESS', list));
    });
};

module.exports.getLabList = function (req, res) {
    documentObject12.m_lab.find({
        $and: [
            { Category_Code: req.params.code },
            { Test_Name: new RegExp(req.params.search, 'i') }
        ]
    }, "Test_Name Sample_type EMR_CATEGORY").limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + " record(s) found", 'SUCCESS', items));
    });
};

module.exports.pocTestList = function (req, res) {
    documentObject12.m_poc.distinct("Test").exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.pocTestDetails = function (req, res) {
    documentObject12.m_poc.find({ "Test": req.params.test }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.templateCategoryList = function (req, res) {
    var query = {};
    if (req.query['locationId'])
        query['LocationId'] = parseInt(req.query['LocationId'])
    documentObject12.m_template_category.find(query).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.templateSubCategoryList = function (req, res) {
    documentObject12.m_template_subcategory.find({ CategoryID: req.params.category }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.icdCodeSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.icdCodes.find(
        {
            $or: [{ CODE: new RegExp(code, 'i') },
            { SHORT_Discription: new RegExp(code, 'i') }]
        },
        'CODE SHORT_Discription')
        .sort({ CODE: 1 })
        .limit(EHR_CONFIG.search_limit)
        .exec(function (err, items) {
            if (err) {
                return res.json(Utility.output(err, "ERROR"));
            }
            return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
        });
};

module.exports.icd9cSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_icd9c.find({ description: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.servicesSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_services.find({ ServiceName: new RegExp(code, 'i') }, 'ServiceName Specialization Minimum_amount Maximum_amount Rate_editable').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.drugListSearch = function (req, res) {
    var drug = req.params.search;
    drug = drug.replace(/[^\w\s]/gi, '')
    documentObject12.drugList.find({ Item_Name: new RegExp(drug, 'i') }, 'Brand_Name Item_Name Route Generic_Name Strength_value Unit_of_strength').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.solutionSearch = function (req, res) {
    var drug = req.params.search;
    documentObject12.drugList.find({ $and: [{ Item_Name: new RegExp(drug, 'i') }, { Dispensing_Type: "SOL" }] }, 'Brand_Name Item_Name Route Generic_Name Strength_value Unit_of_strength').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.additiveSearch = function (req, res) {
    var drug = req.params.search;
    documentObject12.drugList.find({ $and: [{ Item_Name: new RegExp(drug, 'i') }, { Dispensing_Type: "INJ" }] }, 'Brand_Name Item_Name Route Generic_Name Strength_value Unit_of_strength').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.procedureSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_procedure.find({ Procedure_Name: new RegExp(code, 'i') }, 'Procedure_Id Procedure_Name Service_Id').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.procedureSearchByType = function (req, res) {
    var code = req.params.search;
    documentObject12.m_procedure.find({ $and: [{ Test_Category: new RegExp(req.params.type, 'i') }, { Procedure_Name: new RegExp(code, 'i') }] }, 'Procedure_Id Procedure_Name Service_Id').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};


module.exports.allergySearch = function (req, res) {
    var code = req.params.allergyName;
    documentObject12.m_allergy.find({ Allergy_Name: new RegExp(code, 'i') }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.flagSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_flag.find().exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.getNandaDiagnosis = function (req, res) {
    documentObject12.m_nanda_dignosis.find({
        $or: [
            { Diagnosis_Label: new RegExp(req.params.search, 'i') },
            { Diagnosis_Definition: new RegExp(req.params.search, 'i') }
        ]
    }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.getNandaDiagnosisDetails = function (req, res) {
    var result = {};
    try {
        documentObject12.m_nanda_dignosis.findOne({ _id: req.params.id }, function (err, dignosis) {
            if (err) {
                return res.json(Utility.output(err, "ERROR"));
            }
            log(dignosis);
            result.Order_within_Class = dignosis.Order_within_Class
            result.Diagnosis_Code = dignosis.Diagnosis_Code
            result.Diagnosis_Label = dignosis.Diagnosis_Label
            result.Diagnosis_Definition = dignosis.Diagnosis_Definition
            documentObject12.m_nanda_domain.findOne({ Domain: dignosis.Domain }, function (err, domains) {
                if (err) {
                    return res.json(Utility.output(err, "ERROR"));
                }
                result.Domain = domains;
                documentObject12.m_nanda_class.findOne({ Class: dignosis.Class }, function (err, classresult) {
                    if (err) {
                        return res.json(Utility.output(err, "ERROR"));
                    }
                    result.Class = classresult;
                    return res.json(Utility.output("1 record(s) found", "SUCCESS", result));
                });
            });
        });
    } catch (e) {
        return res.json(Utility.output(e.message, "ERROR"));
    }
};

module.exports.getLabTestByCategory = function (req, res) {
    documentObject12.m_labtest.find({
        $and: [
            { CategoryID: req.params.category },
            { Description: new RegExp(req.params.search, 'i') }
        ]
    }, 'ID Description Status ServiceID').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};
module.exports.autoRecordMasterByCategory = function (req, res) {
    documentObject12.m_recordMaster.find({
        $and: [
            { category: req.params.category },
            { displayName: new RegExp(req.params.search, 'i') }
        ]
    }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};
module.exports.getRecordMasterByCategory = function (req, res) {
    documentObject12.m_recordMaster.find({ category: req.params.category }).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
}

module.exports.addRecordMaster = function (req, res) {
    var newRecord = new documentObject12.m_recordMaster();
    newRecord._id = uuid.v4();
    newRecord.displayName = req.params.displayName;
    newRecord.category = req.params.category;
    newRecord.save(function (err, result) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        } else {
            return res.json(Utility.output(" record(s) added", "SUCCESS", result._id));
        }
    })
}

module.exports.getLabTest = function (req, res) {
    documentObject12.m_labtest.find({ Description: new RegExp(req.params.search, 'i') }, 'ID Description Status ServiceID CategoryID').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.getLabCategory = function (req, res) {
    documentObject12.m_labCategory.find({ IsEMRCategory: 1 }, 'ID Description Status IsEMRCategory').limit(10).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
}

module.exports.bloodComponentSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.M_BloodComponent.find({ Description: new RegExp(code, 'i') }, 'Id Description ServiceId').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        }
        return res.json(Utility.output(items.length + " record(s) found", "SUCCESS", items));
    });
};

module.exports.routeSearch = function (req, res) {
    var code = req.params.search;
    // documentObject12.M_Route.find({ Description: new RegExp(code, 'i') }, 'HIS_ID Description Code').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
    //     if (err) {
    //         return res.json(Utility.output(err, 'ERROR'));
    //     }
    //     return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    // });

    documentObject12.M_Route.aggregate([
        {
            "$match": { Description: new RegExp(code, 'i'), Status: 1 }
        }, {
            "$project": {
                "HIS_ID": "$ID",
                "Description": "$Description",
                "Code": "$Code"
            }
        }, {
            "$limit": 20
        }
    ], function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    })
};

module.exports.modifierSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.M_Modifier.find({ Description: new RegExp(code, 'i') }, 'HIS_ID Description').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    });
};

module.exports.genericSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.M_Generic.find({ Description: new RegExp(code, 'i') }, 'HIS_ID Description').limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    });
};

module.exports.departmentSearch = function (req, res) {
    var code = req.params.deptName;
    documentObject12.m_department.find({ Description: new RegExp(code, 'i') }, { '_id': 0, 'ID': 1, 'Description': 1 }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    });
};

module.exports.clinicSearch = function (req, res) {
    var code = req.params.clinicName;
    documentObject12.m_clinic.find({ Description: new RegExp(code, 'i') }, { '_id': 0, 'ID': 1, 'Description': 1 }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    });
};

module.exports.wardSearch = function (req, res) {
    var code = req.params.search;
    documentObject12.m_wards.find({
        $or: [
            { Code: new RegExp(code, 'i') },
            { Description: new RegExp(code, 'i') },
        ]
    }, { '_id': 0, 'Code': 1, 'ID': 1, 'Description': 1 }).limit(EHR_CONFIG.search_limit).exec(function (err, items) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(items.length + ' record(s) found', 'SUCCESS', items));
    });
};

module.exports.drugListSearchById = function (req, res) {
    var drugId = req.params.drugId;
    documentObject12.drugList.find({ _id: drugId }, function (err, drugObj) {
        if (err) {
            res.send("", 406)
        } else {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            return res.json(Utility.output(drugObj.length + ' record(s) found', 'SUCCESS', drugObj));
        }
    })
};

module.exports.addDataObject = function (req, res) {
    var data = req.body;
    //console.log(data);
    var m_DataObject_to_save = new documentObject12.m_dataObject();
    m_DataObject_to_save._id = uuid.v4();
    //m_DataObject_to_save.type = data.type;
    m_DataObject_to_save.title = data.title;
    m_DataObject_to_save.dataObject = data.dataObject;
    m_DataObject_to_save.datamodels = data.datamodels;
    //m_DataObject_to_save.table = data.table;
    m_DataObject_to_save.save(function (err) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output("Data Object Saved Successfully", 'SUCCESS', "Data Object Saved Successfully"));
    });
};

module.exports.updateDataObject = function (req, res) {
    var data = req.body;

    var dataToSet = {
        title: data.title,
        dataObject: data.dataObject,
        datamodels: data.datamodels
    };

    documentObject12.m_dataObject.findOneAndUpdate({ _id: req.params.doId }, dataToSet, function (err, success) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output("Data Object Updated Successfully", 'SUCCESS', "Data Object Updated Successfully"));
    })
};

module.exports.getDataObjectList = function (req, res) {
    documentObject12.m_dataObject.find({}, 'title', function (err, dataObjectList) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(dataObjectList.length + ' record(s) found', 'SUCCESS', dataObjectList));
    });
};

module.exports.removeDataObject = function (req, res) {
    documentObject12.m_dataObject.remove({ _id: req.params.doId }, function (err, done) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output("Data Object Deleted.", 'SUCCESS', "Data Object Deleted."));
    });
};

module.exports.getDataObjectById = function (req, res) {
    documentObject12.m_dataObject.find({ _id: req.params.doId }, function (err, dataObjectList) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(dataObjectList.length + ' record(s) found', 'SUCCESS', dataObjectList));
    });
};