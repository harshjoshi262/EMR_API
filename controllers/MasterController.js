var async = require('async');
var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var UserManagement = document.userManagementModel;

module.exports = function MasterController() {
    this.rehub_get = function (req, res, next) {
        MasterModel.m_rehub.find({}, function (err, rehubMaster) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!rehubMaster.length)
                return res.json(Utility.output('No rehub master record has been found', 'ERROR'));
            return res.json(Utility.output('Rehub master records fetched', 'SUCCESS', rehubMaster));
        });
    };
    this.referral_service_get = function (req, res, next) {
        var serviceName = Utility.escape(req.params.serviceName);
        if (!serviceName)
            return res.json(Utility.output('No referral service record(s) has been found', 'ERROR'));
        MasterModel.m_refferal_service.find({ service_name: new RegExp(serviceName, 'i') }).limit(20).exec(function (err, referralServiceMaster) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!referralServiceMaster.length)
                return res.json(Utility.output('No referral service record(s) has been found', 'ERROR'));
            return res.json(Utility.output(referralServiceMaster.length + ' referral service record(s) fetched', 'SUCCESS', referralServiceMaster));
        });
    };
    this.diet_types_get = function (req, res, next) {
        MasterModel.m_diet_types.find({}, function (err, dietTypes) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!dietTypes.length)
                return res.json(Utility.output('No diet type(s) has been found', 'ERROR'));
            return res.json(Utility.output(dietTypes.length + ' diet type(s) fetched', 'SUCCESS', dietTypes));
        });
    };
    this.getNewLabTestByCategory = function (req, res, next) {
        // console.log('why this ')
        var tempQuery = {}
        if (req.query.isOutsourced == 'true') {
            tempQuery = { IsOutSourced: 1 }
        } else {
            tempQuery = { CategoryID: { $in: req.query.category.split(',') } };
        }

        MasterModel.m_labtest.find({
            $and: [
                tempQuery,
                { Description: new RegExp(req.params.search, 'i') }
            ]
        }, 'ID Description Status CategoryID ServiceID').limit(20).exec(function (err, items) {
            if (err) {
                return res.json(Utility.output(err, "ERROR"));
            }
            return res.json(Utility.output(items.lenght + " record(s) found", "SUCCESS", items));
        });
    };
    this.getLabCategory = function (req, res, next) {
        MasterModel.m_labCategory.aggregate([{
            $match: { Status: 1 }
        },
        {
            $group: {
                _id: "$EMR Description",
                categoryID: { $push: "$ID" },
                Code: { $push: '$Code' }
            }
        }
        ], function (err, items) {
            if (err) {
                return res.json(Utility.output(err, "ERROR"));
            }
            return res.json(Utility.output(items.lenght + " record(s) found", "SUCCESS", items));
        });
    }
    this.enteral_nutritions_get = function (req, res, next) {
        MasterModel.m_enteral_nutritions.find({}, function (err, result) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!result.length)
                return res.json(Utility.output('No Enteral Nutrition(s) has been found', 'ERROR'));
            return res.json(Utility.output(result.length + ' Enteral Nutrition(s) fetched', 'SUCCESS', result));
        });
    };
    this.drug_search = function (req, res, next, searchOver) {
        var returnObj = [];
        var innerObj = {};
        if (!req.query.search)
            return res.json(Utility.output('Search Keyword is required', 'ERROR'));
        // var group;
        // if (req.query.isConsumable == 'true') { group = 14 } else { group = 13 }
        var drug = req.query.search;
        var query = {
            '$or': [
                { 'Abbreviations': { $regex: drug, $options: 'i' } },//Old one { 'Abbreviations': { $regex: '^' + drug, $options: 'i' } }
                { 'EMRItemName': { $regex: drug, $options: 'i' } } //Old one { 'EMRItemName': { $regex: '^' + drug, $options: 'i' } }
            ],
            'ItemGroup': 13,
            Status: 1
        };
        if (req.query.isConsumable == 'true') {
            delete query.ItemGroup;
            query.IsConsumable = 1;// group = 14
        }
        var searchOverQuery = {};
        if (searchOver)
            searchOver = searchOver.toUpperCase();
        if (searchOver === 'SOL')
            searchOverQuery['Dispensing_Type'] = { $in: [new RegExp('SOL', 'i'), new RegExp('INJ', 'i')] };
        if (searchOver === 'INJ')
            searchOverQuery['Dispensing_Type'] = { $in: [new RegExp('SOL', 'i'), new RegExp('INJ', 'i')] };


        MasterModel.m_drugmasters_new.aggregate([
            {
                "$match": query
            },
            {
                $lookup: {
                    from: "m_dispensingtype",
                    localField: "DispencingType",
                    foreignField: "ID",
                    as: "m_dispensingtype"
                }
            },
            {
                $lookup: {
                    from: "m_routes",
                    localField: "Route",
                    foreignField: "ID",
                    as: "m_routes"
                }
            },
            {
                $lookup: {
                    from: "m_frequencies",
                    localField: "Frequency",
                    foreignField: "ID",
                    as: "m_frequencies"
                }
            },
            {
                $lookup: {
                    from: "m_molecules",
                    localField: "MoleculeName",
                    foreignField: "ID",
                    as: "m_molecules"
                }
            },
            { $unwind: { path: "$m_dispensingtype", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$m_molecules", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$m_routes", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$m_frequencies", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "Drug_HIS_ID": "$ID",
                    "ItemCode": "$ItemCode",
                    "BrandName": "$BrandName",
                    "ItemName": "$ItemName",
                    "EMRItemName": "$EMRItemName",
                    "Abbreviations": "$Abbreviations",
                    "Dosage": { $cond: { if: { $ifNull: ["$Dosage", false] }, then: '$Dosage', else: "" } },
                    "DosageUnit": { $cond: { if: { $ifNull: ["$DosageUnit", false] }, then: "$DosageUnit", else: "" } },
                    "Dispensing_Type_HIS_ID": { $cond: { if: { $ifNull: ['$m_dispensingtype.ID', false] }, then: '$m_dispensingtype.ID', else: null } },
                    "Dispensing_Type": { $cond: { if: { $ifNull: ['$m_dispensingtype.Code', false] }, then: '$m_dispensingtype.Code', else: null } },
                    "Molecule_HIS_ID": "$m_molecules.ID",
                    "MoleculeName": "$m_molecules.Description",
                    "Route": "$m_routes.Description",
                    "Route_HIS_ID": "$m_routes.ID",
                    "Strength": "$Strength",
                    "Suggestions": { $cond: { if: { $ifNull: ["$Suggestions", false] }, then: '$Suggestions', else: null } },
                    "DefaultFrequency": "$m_frequencies.Description",
                    "DefaultFrequency_HIS_ID": "$m_frequencies.ID"
                }
            },
            {
                "$match": searchOverQuery
            },
            { "$limit": 20 }
        ], function (err, result) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!result.length) {
                if (searchOver === 'SOL')
                    return res.json(Utility.output('No solution(s) has been found', 'SUCCESS'));
                if (searchOver === 'INJ')
                    return res.json(Utility.output('No additive(s) has been found', 'SUCCESS'));
                return res.json(Utility.output('No drug(s) has been found', 'SUCCESS'));
            }
            async.eachSeries(result, function (eachDrug, callback_inner) {
                eachDrug = JSON.parse(JSON.stringify(eachDrug));
                if (innerObj[eachDrug.EMRItemName + "**" + eachDrug.Dispensing_Type] === undefined)
                    innerObj[eachDrug.EMRItemName + "**" + eachDrug.Dispensing_Type] = [];
                if (eachDrug.Route === undefined) {
                    eachDrug.Route = null;
                    eachDrug.Route_HIS_ID = null;
                }
                if (eachDrug.DefaultFrequency === undefined) {
                    eachDrug.DefaultFrequency = null;
                    eachDrug.DefaultFrequency_HIS_ID = null;
                }
                innerObj[eachDrug.EMRItemName + "**" + eachDrug.Dispensing_Type].push(eachDrug);
                callback_inner();
            }, function () {
                async.forEachOf(innerObj, function (eachDrug, displayName, callback_inner1) {
                    var temp = {
                        'drugName': displayName.substring(0, displayName.indexOf('**')),
                        'values': eachDrug,
                        'Dispensing_Type': eachDrug[0].Dispensing_Type
                    };
                    returnObj.push(temp);
                    callback_inner1();
                }, function () {
                    if (searchOver === "SOL")
                        return res.json(Utility.output(returnObj.length + ' solution(s) fetched', 'SUCCESS', returnObj));
                    if (searchOver === 'INJ')
                        return res.json(Utility.output(returnObj.length + ' additive(s) fetched', 'SUCCESS', returnObj));
                    return res.json(Utility.output(returnObj.length + ' drug(s) fetched', 'SUCCESS', returnObj));
                });
            });
        });
    };
    this.medicalSupplySearch = function (req, res, next) {
        var medical = req.query.search;
        var query = {
            '$or': [
                { 'Item.Abbreviations': { $regex: medical, $options: 'i' } },
                { 'Item.ItemName': { $regex: medical, $options: 'i' } }
            ]
        };
        MasterModel.m_itemGroup.aggregate([
            {
                $match: { IsMedicalSupply: true }

            }, 
            {
                $lookup: {
                    from: "m_drugmasters_new",
                    localField: "ID",
                    foreignField: "ItemGroup",
                    as: "Item"
                }
            },
           /*{
                "$addFields": {
                    "Item": {
                        "$arrayElemAt": [
                            {
                                "$filter": {
                                    "input": "$Item",
                                    "as": "Item",
                                    "cond": {
                                        '$or': [
                                            { '$$item.Abbreviations': { $regex: medical, $options: 'i' } },
                                            { '$$item.ItemName': { $regex: medical, $options: 'i' } }
                                        ]
                                    }
                                }
                            }, 0
                        ]
                    }
                }
            },*/
            {
                $unwind: { path: '$Item', preserveNullAndEmptyArrays: true }
            },
            {
                $match: query
            },
            {
                $limit: 20
            },
            {
                $lookup: {
                    from: "m_molecules",
                    localField: "Item.MoleculeName",
                    foreignField: "ID",
                    as: "m_molecules"
                }
            },
            {
                $unwind: { path: "$m_molecules", preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    "Drug_HIS_ID": "$Item.ID",
                    "ItemCode": "$Item.ItemCode",
                    "BrandName": "$Item.BrandName",
                    "ItemName": "$Item.ItemName",
                    "Molecule_HIS_ID": "$m_molecules.ID",
                    "MoleculeName": "$m_molecules.Description",
                    "EMRItemName": "$Item.EMRItemName",
                    "Abbreviations": "$Item.Abbreviations",
                    "recordId": '$Item._id'
                }
            }
        ]).allowDiskUse(true).exec(function (err, results) { 
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            } else {
                res.json(Utility.output(results.length + ' drug(s) fetched', 'SUCCESS', results));
            }
        })
    }
    this.get_all_masters = function (req, res, next) {
        var returnObj = [];
        async.forEachOf(CONSTANT.master_models_mapper, function (modelName, masterName, callback_inner1) {
            var temp = {
                slug: masterName,
                master_name: ''
            };
            masterName = masterName.replace("m_", "");
            temp.master_name = masterName;
            returnObj.push(temp);
            callback_inner1();
        }, function () {
            return res.json(Utility.output(returnObj.length + ' master(s) fetched', 'SUCCESS', returnObj));
        });
    };
    this.get_master_fields = function (req, res, next) {
        var slug = req.query.slug || "";
        if (CONSTANT.master_models_mapper[slug.toLowerCase()] === undefined)
            return res.json(Utility.output('Slug is mandatory', 'ERROR'));
        var returnObj = {
            slug: slug.toLowerCase(),
            master_name: slug.toLowerCase().replace("m_", ""),
            fields: []
        };
        var fields = require('mongoose').model(CONSTANT.master_models_mapper[slug.toLowerCase()]).schema.paths;
        async.forEachOf(fields, function (value, key, callback_inner2) {
            if (key === "_id" || key === "date_of_creation" || key === "date_of_modification" || key === "created_by") { }
            else {
                returnObj.fields.push({
                    'field_name': key,
                    'field_type': value.instance,
                    'field_validators': value.validators,
                    'field_type': (key === "Status") ? "select_box" : "text_box",
                    'select_box_values': (key === "Status") ? [{ value: "1", "text": "Active" }, { value: "2", "text": "Inactive" }] : []
                });
            }
            callback_inner2();
        }, function () {
            return res.json(Utility.output(returnObj.fields.length + ' field(s) fetched', 'SUCCESS', returnObj));
        });
    };
    this.get_master_data = function (req, res, next) {
        req.query.slug = req.query.slug || "";
        if (!req.query.slug)
            return res.json(Utility.output('Slug is mandatory', 'VALIDATION_ERROR'));
        if (CONSTANT.master_models_mapper[req.query.slug] === undefined)
            return res.json(Utility.output('Slug is not added into our slug list', 'VALIDATION_ERROR'));
        var perPage = CONSTANT.max_record_per_page;
        if (!req.query.page)
            req.query.page = 0;
        var page = Math.max(0, req.query.page);
        var select = Utility.escape(req.query.select);
        var matchQuery = decodeURIComponent(req.query.query);
        if (select)
            select = select.split(",");
        var project = {};
        if (page)
            page -= 1;
        var result = {
            'page': page + 1 || 1,
            'per_page_record': perPage,
            'results': []
        };
        var query = [];
        if (matchQuery && Utility.isJson(matchQuery)) {
            query.push(
                { $match: JSON.parse(matchQuery) }
            );
        }
        query.push(
            project
        );
        if (req.query.pagination === "false" || req.query.pagination === false) { } else {
            query.push({ "$skip": (perPage * page) },
                { "$limit": perPage });
        }
        var fields = require('mongoose').model(CONSTANT.master_models_mapper[req.query.slug]).schema.paths;
        async.forEachOf(fields, function (value, key, callback_inner2) {
            if (project['$project'] === undefined)
                project['$project'] = {};
            if (!select)
                project['$project'][key] = "$" + key;
            else {
                if (select.indexOf(key) > -1)
                    project['$project'][key] = "$" + key;
            }
            callback_inner2();
        }, function () {
            MasterModel[req.query.slug].aggregate(query, function (err, masterData) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                result.results = masterData;
                return res.json(Utility.output(result.results.length + ' record(s) fetched', 'SUCCESS', result));
            });
        });
    };
    this.update_master_data = function (req, res, next) {
        var currentTime = new Date().getTime();
        req.body.slug = req.body.slug || "";
        if (CONSTANT.master_models_mapper[req.body.slug.toLowerCase()] === undefined)
            return res.json(Utility.output('Slug is mandatory', 'VALIDATION_ERROR'));
        if (req.body._id && req.body._id !== '') {
            MasterModel[req.body.slug.toLowerCase()].findOne({ _id: req.body._id }, function (err, masterData) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (!masterData)
                    return res.json(Utility.output('Sorry!! Record not found', 'ERROR'));
                var fields = require('mongoose').model(CONSTANT.master_models_mapper[req.body.slug.toLowerCase()]).schema.paths;
                async.forEachOf(fields, function (value, key, callback_inner2) {
                    if (req.body[key] !== undefined) {
                        if (key === "_id") { }
                        else
                            masterData[key] = req.body[key];
                    }
                    callback_inner2();
                }, function () {
                    if (masterData["date_of_creation"] === undefined)
                        masterData["date_of_creation"] = currentTime;
                    if (!masterData["date_of_creation"]) {
                        masterData["date_of_creation"] = currentTime;
                    }

                    if (masterData["created_by"] === undefined)
                        masterData["created_by"] = req.decoded.userId;
                    if (!masterData["created_by"]) {
                        masterData["created_by"] = req.decoded.userId;
                    }

                    if (masterData["Status"] === undefined)
                        masterData["Status"] = 1;
                    if (masterData["Status"] === null)
                        masterData["Status"] = 1;
                    masterData["date_of_modification"] = currentTime;
                    masterData["updated_by"] = req.decoded.userId;
                    masterData.save(function (err) {
                        if (err)
                            return res.json(Utility.output(err, 'ERROR'));
                        return res.json(Utility.output('Updated', 'SUCCESS'));
                    });
                });
            });
        }
        else {
            var insertData = {};
            var fields = require('mongoose').model(CONSTANT.master_models_mapper[req.body.slug.toLowerCase()]).schema.paths;
            async.forEachOf(fields, function (value, key, callback_inner2) {
                if (req.body[key] !== undefined) {
                    if (key === "_id") { }
                    else if (key === "created_by")
                        insertData['created_by'] = req.decoded.userId;
                    else
                        insertData[key] = req.body[key];
                }
                else
                    insertData[key] = null;
                callback_inner2();
            }, function () {
                insertData["date_of_creation"] = currentTime;
                insertData["date_of_modification"] = currentTime;
                insertData["updated_by"] = req.decoded.userId;
                insertData["created_by"] = req.decoded.userId;
                insertData["Status"] = 1;
                new MasterModel[req.body.slug.toLowerCase()](insertData).save(function (err) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    return res.json(Utility.output('Updated', 'SUCCESS'));
                });
            });
        }
    };
    this.get_user_unit = function (req, res, next) {
        UserManagement.d_unitMaster.find({ isActive: true }, 'code description').sort({ created_at: -1 }).exec(function (err, units) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            return res.json(Utility.output(units.length + ' Unit(s) are found', 'SUCCESS', units));
        });
    };
    this.getHelpTextbyKey = function (req, res, next) {
        if (!req.query.key)
            return res.json(Utility.output("Key is required", 'VALIDATION_ERROR'));
        MasterModel.m_help_texts.findOne({ key: Utility.escape(req.query.key) }, 'displayName help_text', function (err, result) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!result)
                return res.json(Utility.output("Help Text not found", 'ERROR'));
            return res.json(Utility.output(result.displayName + "'s help text", 'SUCCESS', result));
        });
    };
    this.InsertRecord = function (masterData, RMQID, callback) {
        var data = JSON.parse(masterData);
        if (CONSTANT.master_models_mapper[data.TableName] === undefined)
            callback(RMQID, "Error", "Table Name not Valid")
        else {
            console.log("In else Statement: ");
            new MasterModel[data.TableName.toLowerCase()](data).save(function (err) {
                if (err)
                    callback(RMQID, "Error", err)
                else
                    callback(RMQID, "Success")
            });
        }
    };
    this.InsertUpdateRecord = function (masterData, RMQID, callback) {
        var data = JSON.parse(masterData);
        if (CONSTANT.master_models_mapper[data.TableName] === undefined)
            callback(RMQID, "Error", "Table Name not Valid")
        else {
            MasterModel[data.TableName].findOne({ ID: data.ID }, function (err, done) {
                if (err)
                    callback(RMQID, "Error", err)
                else if (!done) {
                    console.log("Inserted: " + data.ID);
                    new MasterModel[data.TableName](data).save(function (err) {
                        if (err)
                            callback(RMQID, "Error", err)
                        else
                            callback(RMQID, "Success")
                    });
                }
                else {
                    console.log("Updated: " + data.ID);
                    done = Object.assign(done, data);
                    done.save(function (err, saved) {
                        if (err)
                            callback(RMQID, "Error", err)
                        else {
                            callback(RMQID, "Success")
                        }
                    })
                }
            });
        }
    };
    this.DeleteRecord = function (masterData, RMQID, callback) {
        var data = JSON.parse(masterData);
        var data = JSON.parse(masterData);
        if (CONSTANT.master_models_mapper[data.TableName] === undefined)
            callback(RMQID, "Error", "Table Name not Valid")
        else {
            console.log("In else Statement: ");
            MasterModel[data.TableName].remove({ ID: data.ID }, function (err) {
                if (err)
                    callback(RMQID, "Error", err)
                else
                    callback(RMQID, "Success")
            });
        }
    };
};
