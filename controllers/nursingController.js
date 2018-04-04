var uuid = require('node-uuid');
var async = require('async')
var fs = require('fs')
const util = require('util');
document = require('../models/db_model.js')
var documentObject = document.domainModel
var cpoeDocument = document.cpoeDataModel
var masterObject = document.mastersModel;
var moment = require("moment");

module.exports.stationPatientDashboard = function (req, res) {
    let userId = req.decoded.userId;
    documentObject.User.findOne({ 'userId': userId, }, 'NursingStations', function (err, user) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
            let data = {};
            user = JSON.parse(JSON.stringify(user));
            data.stations = user.NursingStations != undefined ? user.NursingStations : [];
            stationDashboard(data, function (err, results) {
                if (err) {
                    document.sendResponse('something went wrong please try again', 405, 'error', err, res)
                } else {
                    document.sendResponse(results.length + ' Items found', 200, 'done', results, res);
                }
            })
        }
    })

}
module.exports.stationDashboardByWard = function (req, res) {
    let userId = req.decoded.userId;
    let data = {};
    // data.stations = user.NursingStations != undefined ? JSON.parse(JSON.stringify(user)).NursingStations : [];
    data.stations = [];
    data.wards = [];
    data.wards.push(parseInt(req.query.wardId));
    data.stations.push(parseInt(req.query.stationId));
    stationWardDashboard(data, function (err, results) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
            document.sendResponse(results.length + ' Items found', 200, 'done', results, res);
        }
    })

}
module.exports.stationDashboardByCabin = function (req, res) {
    let userId = req.decoded.userId;
    let data = {};
    // data.stations = user.NursingStations != undefined ? JSON.parse(JSON.stringify(user)).NursingStations : [];
    data.cabins = [];
    data.cabins.push(parseInt(req.query.cabinId));
    stationCabinDashboard(data, function (err, results) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
            document.sendResponse(results.length + ' Items found', 200, 'done', results, res);
        }
    })

}
module.exports.stationPatientList = function (req, res) {
    let userId = req.decoded.userId;
    documentObject.User.findOne({ 'userId': userId }, function (err, user) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
            let data = {};
            data.stations = JSON.parse(JSON.stringify(user)).NursingStations;
            stationPatientDetails(data, function (err, results) {
                if (err) {
                    document.sendResponse('something went wrong please try again', 405, 'error', err, res)
                } else {
                    document.sendResponse(results.length + ' Items found', 200, 'done', results, res);
                }
            })
        }
    })

}
module.exports.addNursingTask = function (req, res) {
    var newTask = new documentObject.nursing_tasks(req.body);
    newTask._id = uuid.v4();
    newTask.PatientId = req.params.patientId;
    newTask.VisitId = req.params.visitId;
    newTask.Created_By = req.decoded.userId;
    newTask.save(function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse('success', 200, 'done', result, res);
        }
    })
}
module.exports.visitNursingTaskList = function (req, res) {
    documentObject.nursing_tasks.find({ visitId: req.params.visitId }, function (err, results) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(' success', 200, 'done', results, res);
        }

    })
}
module.exports.visitIncomleteTaskList = function (req, res) {
    documentObject.nursing_tasks.find(
        { visitId: req.params.visitId, IsComplete: false, IsError: false },
        function (err, results) {
            if (err) {
                document.sendResponse('something went wrong please try again', 501, 'error', err, res)
            } else {
                document.sendResponse(' success', 200, 'done', results, res);
            }

        })
}
module.exports.markErrorTask = function (taskId, res) {
    documentObject.nursing_tasks.findOneAndUpdate({ _id: taskId }, { $set: { IsError: true } }, function (err) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(' success', 200, 'done', {}, res);
        }
    })
}
module.exports.markCompleteTask = function (taskId, res) {
    documentObject.nursing_tasks.findOneAndUpdate({ _id: taskId }, { $set: { IsComplete: true } }, function (err) {

        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(' success', 200, 'done', {}, res);
        }

    })
}
module.exports.updateTask = function (req, res) {
    let data = req.body;
    let payload = {};
    payload.Task = data.Task;
    payload.Urgency = data.Urgency;
    payload.StopDate = data.StopDate;
    payload.Updated_By = req.decoded.userId;
    payload.Updated_At = Date.now();
    documentObject.nursing_tasks.findOneAndUpdate({ _id: req.params.taskId }, payload, function (err) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(' success', 200, 'done', {}, res);
        }

    })
}
module.exports.acknowledgeOrder = function (req, res) {
    var tempHistory = {};
    tempHistory.action = 'Acknowledge pending order.';
    tempHistory.userId = req.decoded.userId;
    tempHistory.timestamp = new Date();
    var updateData = {
        $set: { isAcknowledged: true },
        $push: { activityLog: tempHistory }
    }
    cpoeDocument.CpoeOrder.findOneAndUpdate({ _id: req.params.orderId }, updateData, function (err) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(' success', 200, 'done', {}, res);
        }
    })
}
let stationDashboard = function (data, cb) {
    let condition1;
    if (util.isNullOrUndefined(data)) {
        condition1 = {
            'OPD_IPD': 1
        }
    } else {
        condition1 = {
            'station.ID': {
                $in: data.stations
            }
        }
    }
    console.log(condition1)
    documentObject.Visit.aggregate([
        {
            $match: {
                // $or: [
                //     {
                'isActive': 'true',
                'IsCancel': false,
                'isDischarged': 'false',
                'OPD_IPD': 1
                // },
                // { 'isDemoPatient': true }
                // ]
            }
        },
        {
            $lookup: {
                from: 'm_clinics',
                localField: 'searchBox.CabinID',
                foreignField: 'ID',
                as: 'clinic'
            }
        },
        {
            $lookup: {
                from: 'm_beds',
                localField: 'searchBox.bedNo',
                foreignField: 'Description',
                as: 'Bed'
            }
        },
        {
            $unwind: {
                path: '$Bed',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'm_nursing_station_details',
                localField: 'Bed.ID',
                foreignField: 'BedID',
                as: 'stationDef'
            }
        }, {
            $unwind: {
                path: '$stationDef',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $lookup: {
                from: 'm_wards',
                localField: 'Bed.WardId',
                foreignField: 'ID',
                as: 'wards'
            }
        },
        // {
        //     $lookup: {
        //         from: 'm_nursing_stations',
        //         localField: 'stationDef.NursingStationDefID',
        //         foreignField: 'ID',
        //         as: 'stationDetails'
        //     }
        // },
        {
            $project: {
                'visitId': '$_id',
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'cpoeorder': 1,
                "medication": 1,
                'cpoeorderCount': 1,
                'medicationCount': 1,
                // 'nursingTasksCount': 1,
                'patientId': 1,
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                station: { $concatArrays: ['$wards', '$clinic'] }
            }
        },
        {
            $unwind: {
                path: '$station'
            }
        }, {
            $match: {
                $or: [
                    {
                        $and: [{ 'OPD_IPD': 1 }, condition1]
                    },
                    {
                        $and: [{ 'OPD_IPD': 0 }, { 'OPD_IPD': 1 }] //making this fails
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',

                as: 'patient'
            }
        }, {
            $unwind: {
                path: '$patient'
            }
        },
        {
            $lookup: {
                from: 'cpoeorders',
                localField: '_id',
                foreignField: 'visitId',
                as: 'cpoeorder'
            }
        },
        {
            $unwind: { path: '$cpoeorder', preserveNullAndEmptyArrays: true }

        },
        {
            $group: {
                _id: '$_id',
                'visitId': { $first: '$_id' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorder": { $push: '$cpoeorder' },
                'cpoeorderCount': {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $eq: ['$cpoeorder.orderStatus', 'pending'] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }
            }
        },
        {
            $lookup: {
                from: 'medications',
                localField: '_id',
                foreignField: 'visitId',
                as: 'medication'
            }
        },
        {
            $unwind: { path: '$medication', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                "medicationCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $eq: ['$medication.status', 'active'] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $lookup: {
                from: 'nursing_tasks',
                localField: '_id',
                foreignField: 'VisitId',
                as: 'nursingTasks'
            }
        },
        {
            $unwind: { path: '$nursingTasks', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: 'OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                // "cpoeorder": { $first: '$cpoeorder' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                // "medication": { $push: '$medication' },
                "medicationCount": { $first: "$medicationCount" },
                "nursingTasks": { $push: '$nursingTasks' },
                "nursingTasksCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $and: [{ $eq: ['$nursingTasks.IsComplete', false] }, { $eq: ['$nursingTasks.IsError', false] }] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $project: {
                'visitId': 1,
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'patient': {
                    '_id': '$patient._id',
                    'gender': '$patient.gender',
                    'name': '$patient.name',
                    'dob': '$patient.dob'
                },
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                "station": 1,
                'cpoeorder': 1,
                "medication": 1,
                'cpoeorderCount': 1,
                "medicationCount": 1,
                "nursingTasks": 1,
                "nursingTasksCount": 1,
                "resultCount": "1",
                "identifier": { $concat: [{ $substr: ['$OPD_IPD', 0, -1] }, '-', { $substr: ['$station.ID', 0, -1] }] } //to convert INT into STRING
            }
        },
        {
            $match: {
                $or: [
                    { "nursingTasksCount": { $gte: 1 } },
                    { "medicationCount": { $gte: 1 } },
                    { "cpoeorderCount": { $gte: 1 } },
                    { "resultCount": { $gte: "1" } }, // no results for now 
                ]
            }
        },
        {
            $group: {
                "_id": '$identifier',
                "UnitID": { $first: '$station.ID' },
                "Code": { $first: '$station.Code' },
                "Description": { $first: '$station.Description' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                "visits": {
                    $push: {
                        'visitId': '$_id',
                        'searchBox': '$searchBox',
                        'doctorId': '$doctorId',
                        'patient': '$patient',
                        'visitDate': '$visitDate',
                        // "visitNo": "$visitNo",
                        // "visitType": "$visitType",
                        // "patientType": '$patientType',
                        // "location": "$location",
                        "careProvider": "$careProvider",
                        "primaryDoctor": "$primaryDoctor",
                        "clinicalDepartment": '$clinicalDepartment',
                        "cpoeorderCount": '$cpoeorderCount',
                        "medicationCount": '$medicationCount',
                        "nursingTasksCount": "$nursingTasksCount",
                        "nursingTasks": "$nursingTasks",
                        "resultCount": "$resultCount"
                    }
                }
            }
        }
    ], function (err, results) {
        if (err) {
            cb(err, null)
        } else {
            cb(null, results);
        }
    })
}
// patient list using station ID and wardId
let stationWardDashboard = function (data, cb) {
    console.log(data)
    let timeOffset = parseInt(moment().subtract(12, 'h').format('x'));
    documentObject.Visit.aggregate([
        {
            $match: {
                'isActive': 'true',
                'IsCancel': false,
                '$or': [
                    { 'isDischarged': 'false' },
                    { 'dischargeDateTime': { $gte: timeOffset } }
                ],
                'OPD_IPD': 1
            }
        },
        {
            $lookup: {
                from: 'm_beds',
                localField: 'searchBox.bedNo',
                foreignField: 'Description',
                as: 'Bed'
            }
        },
        {
            $unwind: {
                path: '$Bed',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                'Bed.WardId': { $in: data.wards }
            }
        },
        {
            $lookup: {
                from: 'm_nursing_station_details',
                localField: 'Bed.ID',
                foreignField: 'BedID',
                as: 'stationDef'
            }
        }, {
            $unwind: {
                path: '$stationDef',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                'stationDef.NursingStationDefID': { $in: data.stations }
            }
        },
        {
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',
                as: 'patient'
            }
        }, {
            $unwind: {
                path: '$patient'
            }
        },
        {
            $lookup: {
                from: 'cpoeorders',
                localField: '_id',
                foreignField: 'visitId',
                as: 'cpoeorder'
            }
        },
        {
            $unwind: { path: '$cpoeorder', preserveNullAndEmptyArrays: true }

        },
        {
            $group: {
                _id: '$_id',
                'visitId': { $first: '$_id' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorder": { $push: '$cpoeorder' },
                'cpoeorderCount': {
                    $sum:
                        {
                            $cond:
                                {
                                    // if: { $eq: ['$cpoeorder.orderStatus', 'pending'] },
                                    if: { $and: [{ $eq: ['$cpoeorder.orderStatus', 'pending'] }, { $eq: ['$cpoeorder.isAcknowledged', false] }] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }
            }
        },
        {
            $lookup: {
                from: 'medications',
                localField: '_id',
                foreignField: 'visitId',
                as: 'medication'
            }
        },
        {
            $unwind: { path: '$medication', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorder": { $first: '$cpoeorder' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                "medicationCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $eq: ['$medication.status', 'active'] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $lookup: {
                from: 'nursing_tasks',
                localField: '_id',
                foreignField: 'VisitId',
                as: 'nursingTasks'
            }
        },
        {
            $unwind: { path: '$nursingTasks', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: 'OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorder": { $first: '$cpoeorder' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                // "medication": { $push: '$medication' },
                "medicationCount": { $first: "$medicationCount" },
                "nursingTasks": { $push: '$nursingTasks' },
                "nursingTasksCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $and: [{ $eq: ['$nursingTasks.IsComplete', false] }, { $eq: ['$nursingTasks.IsError', false] }] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $project: {
                'visitId': 1,
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'patient': {
                    '_id': '$patient._id',
                    'gender': '$patient.gender',
                    'name': '$patient.name',
                    'dob': '$patient.dob'
                },
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                'cpoeorder': {
                    $filter: {
                        input: "$cpoeorder",
                        as: "item",
                        cond: { $eq: ["$$item.orderStatus", "pending"] }
                    }
                },
                "medication": 1,
                'cpoeorderCount': 1,
                "medicationCount": 1,
                "nursingTasks": 1,
                "nursingTasksCount": 1,
                "resultCount": "1",
            }
        },
        {
            $match: {
                $or: [
                    { "nursingTasksCount": { $gte: 1 } },
                    { "medicationCount": { $gte: 1 } },
                    { "cpoeorderCount": { $gte: 1 } },
                    { "resultCount": { $gte: "1" } }, // no results for now 
                ]
            }
        }
    ], function (err, results) {
        if (err) {
            cb(err, null)
        } else {
            // console.log(results)
            cb(null, results);
        }
    })
}

// patient list using station ID and wardId
let stationCabinDashboard = function (data, cb) {
    console.log(data)
    documentObject.Visit.aggregate([
        {
            $match: {
                'isActive': 'true',
                'IsCancel': false,
                'isDischarged': 'false',
                'searchBox.CabinID': { $in: data.cabins }

            }
        },
        {
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',
                as: 'patient'
            }
        },
        {
            $unwind: {
                path: '$patient'
            }
        },
        {
            $lookup: {
                from: 'cpoeorders',
                localField: '_id',
                foreignField: 'visitId',
                as: 'cpoeorder'
            }
        },
        {
            $unwind: { path: '$cpoeorder', preserveNullAndEmptyArrays: true }

        },
        {
            $group: {
                _id: '$_id',
                'visitId': { $first: '$_id' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorder": { $push: '$cpoeorder' },
                'cpoeorderCount': {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $eq: ['$cpoeorder.orderStatus', 'pending'] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }
            }
        },
        {
            $lookup: {
                from: 'medications',
                localField: '_id',
                foreignField: 'visitId',
                as: 'medication'
            }
        },
        {
            $unwind: { path: '$medication', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: '$OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                "medicationCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $eq: ['$medication.status', 'active'] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $lookup: {
                from: 'nursing_tasks',
                localField: '_id',
                foreignField: 'VisitId',
                as: 'nursingTasks'
            }
        },
        {
            $unwind: { path: '$nursingTasks', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: '$visitId',
                'visitId': { $first: '$visitId' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                'searchBox': { $first: '$searchBox' },
                'doctorId': { $first: '$doctorId' },
                'patient': { $first: '$patient' },
                'visitDate': { $first: '$visitDate' },
                "OPD_IPD_ID": { $first: 'OPD_IPD_ID' },
                "visitNo": { $first: '$visitNo' },
                "visitType": { $first: '$visitType' },
                "patientType": { $first: '$patientType' },
                "location": { $first: '$location' },
                "careProvider": { $first: '$careProvider' },
                "primaryDoctor": { $first: '$primaryDoctor' },
                "clinicalDepartment": { $first: '$clinicalDepartment' },
                "station": { $first: '$station' },
                // "cpoeorder": { $first: '$cpoeorder' },
                "cpoeorderCount": { $first: '$cpoeorderCount' },
                // "medication": { $push: '$medication' },
                "medicationCount": { $first: "$medicationCount" },
                "nursingTasks": { $push: '$nursingTasks' },
                "nursingTasksCount": {
                    $sum:
                        {
                            $cond:
                                {
                                    if: { $and: [{ $eq: ['$nursingTasks.IsComplete', false] }, { $eq: ['$nursingTasks.IsError', false] }] },
                                    then: 1,
                                    else: 0
                                }

                        }
                }

            }
        },
        {
            $project: {
                'visitId': 1,
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'patient': {
                    '_id': '$patient._id',
                    'gender': '$patient.gender',
                    'name': '$patient.name',
                    'dob': '$patient.dob'
                },
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                'cpoeorder': 1,
                "medication": 1,
                'cpoeorderCount': 1,
                "medicationCount": 1,
                "nursingTasks": 1,
                "nursingTasksCount": 1,
                "resultCount": "1",
            }
        },
        {
            $match: {
                $or: [
                    { "nursingTasksCount": { $gte: 1 } },
                    { "medicationCount": { $gte: 1 } },
                    { "cpoeorderCount": { $gte: 1 } },
                    { "resultCount": { $gte: "1" } }, // no results for now 
                ]
            }
        }
    ], function (err, results) {
        if (err) {
            cb(err, null)
        } else {
            // console.log(results)
            cb(null, results);
        }
    })
}
// retrive allowed  bedID, bed number and cabin of user
module.exports.userStationsAccess = function (userId, flag, callback) {
    let output = {};
    console.log('flag', flag)
    if (flag == true) {
        async.parallel([
            function (cb_parallel) {
                documentObject.User.aggregate([
                    {
                        $match: {
                            "userId": userId
                        }
                    },
                    {
                        $lookup: {
                            from: 'm_nursing_station_details',
                            localField: 'NursingStations',
                            foreignField: 'NursingStationDefID',
                            as: 'station'
                        }
                    },
                    {
                        $unwind: { path: '$station' }
                    }, {
                        $match: {
                            'station.Status': 1
                        }
                    },
                    {
                        $lookup: {
                            from: 'm_beds',
                            localField: 'station.BedID',
                            foreignField: 'ID',
                            as: 'beds'
                        }
                    },
                    {
                        $unwind: { path: '$beds' }
                    }, {
                        $match: {
                            'beds.Status': 1
                        }
                    },
                    {
                        $group: {
                            '_id': '$userId',
                            'bedNumbers': { $push: '$beds.Description' },
                            'bedIDs': { $push: '$beds.ID' },
                            'wards': { $push: '$beds.WardId' }
                        }
                    }
                ], function (err, docs) {
                    if (err) {
                        cb_parallel(err)
                    } else {
                        output.stationResult = docs;
                        cb_parallel()
                    }
                })
            }, function (cb_parallel) {
                documentObject.User.aggregate([
                    {
                        $match: {
                            "userId": userId
                        }
                    },
                    {
                        $lookup: {
                            from: 'm_clinics',
                            localField: 'cabins',
                            foreignField: 'ID',
                            as: 'cabin'
                        }
                    },
                    {
                        $unwind: { path: '$cabin' }
                    }, {
                        $match: {
                            'cabin.Status': 1
                        }
                    },
                    {
                        $group: {
                            '_id': '$userId',
                            'cabins': { $push: '$cabin.ID' }
                        }
                    }
                ], function (err, docs) {
                    if (err) {
                        cb_parallel(err)
                    } else {
                        output.cabinResult = docs;
                        cb_parallel();
                    }
                })
            }
        ], function (err) {
            if (err) {
                callback(err, null)
            } else {
                callback(null, output)
            }
        })
    } else {
        output.cabinResult = []
        output.stationResult = []
        callback(null, output)
    }
}
module.exports.userWardList = function (userId, callback) {
    let result = {};
    async.parallel([function (cb) {
        documentObject.User.aggregate([
            {
                $match: {
                    "userId": userId
                }
            },
            {
                $lookup: {
                    from: 'm_nursing_station_details',
                    localField: 'NursingStations',
                    foreignField: 'NursingStationDefID',
                    as: 'station'
                }
            },
            {
                $unwind: { path: '$station' }
            }, {
                $match: {
                    'station.Status': 1
                }
            },
            {
                $lookup: {
                    from: 'm_beds',
                    localField: 'station.BedID',
                    foreignField: 'ID',
                    as: 'beds'
                }
            },
            {
                $unwind: { path: '$beds' }
            }, {
                $match: {
                    'beds.Status': 1
                }
            },
            {
                $lookup: {
                    from: 'm_wards',
                    localField: 'beds.WardId',
                    foreignField: 'ID',
                    as: 'ward'
                }
            },
            {
                $unwind: { path: '$ward' }
            },
            {
                $group: {
                    '_id': { "ward": '$ward.ID', "station": '$station.NursingStationDefID' },
                    'wardId': { $first: '$ward.ID' },
                    'Description': { $first: '$ward.Description' },
                    'Code': { $first: '$ward.Code' },
                    'stationId': { $first: '$station.NursingStationDefID', }
                }
            }
        ], function (err, docs) {
            if (err) {
                cb(err);
            } else {
                result.wards = docs;
                cb(null);
            }
        })
    }, function (cb) {
        documentObject.User.aggregate([
            {
                $match: {
                    "userId": userId
                }
            },
            {
                $lookup: {
                    from: 'm_clinics',
                    localField: 'cabins',
                    foreignField: 'ID',
                    as: 'cabin'
                }
            },
            {
                $unwind: { path: '$cabin' }
            }, {
                $match: {
                    'cabin.Status': 1
                }
            },
            {
                $group: {
                    '_id': '$cabin.ID',
                    'cabinId': { $first: '$cabin.ID' },
                    "Code": { $first: '$cabin.ID' },
                    "Description": { $first: '$cabin.Description' }
                }
            }
        ], function (err, docs) {
            if (err) {
                cb(err);
            } else {
                result.cabins = docs;
                cb(null);
            }
        })
    }], function (err) {
        if (err) {
            callback(err);
        } else {
            // result.wards = docs;
            callback(null, result.wards.concat(result.cabins));
        }
    })

}

let stationPatientDetails = function (data, cb) {
    let condition1;
    if (util.isNullOrUndefined(data)) {
        condition1 = {
            $and: [{ 'OPD_IPD': 1 }, { 'OPD_IPD': 1 }]
        }
    } else {
        condition1 = {
            $and: [
                { 'OPD_IPD': 1 },
                {
                    'station.ID': {
                        // $in: data.stations
                        $in: [6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
                    }
                }
            ]
        }
    }
    console.log(condition1)
    documentObject.Visit.aggregate([
        {
            $match:
                // {
                // $or: [
                {
                    'isActive': 'true',
                    'IsCancel': false,
                    'isDischarged': 'false'
                },
            //     { 'isDemoPatient': true }
            // ]
            // }
        },
        {
            $lookup: {
                from: 'm_clinics',
                localField: 'searchBox.CabinID',
                foreignField: 'ID',
                as: 'clinic'
            }
        },
        {
            $lookup: {
                from: 'm_beds',
                localField: 'searchBox.bedNo',
                foreignField: 'Description',
                as: 'Bed'
            }
        },
        {
            $unwind: {
                path: '$Bed',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'm_nursing_station_details',
                localField: 'Bed.ID',
                foreignField: 'BedID',
                as: 'stationDef'
            }
        }, {
            $unwind: {
                path: '$stationDef',
                preserveNullAndEmptyArrays: true
            }
        }, {
            $lookup: {
                from: 'm_wards',
                localField: 'Bed.WardId',
                foreignField: 'ID',
                as: 'wards'
            }
        },
        // {
        //     $lookup: {
        //         from: 'm_nursing_stations',
        //         localField: 'stationDef.NursingStationDefID',
        //         foreignField: 'ID',
        //         as: 'stationDetails'
        //     }
        // },
        {
            $project: {
                'visitId': '$_id',
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'cpoeorder': 1,
                "medication": 1,
                'cpoeorderCount': 1,
                'medicationCount': 1,
                'nursingTasksCount': 1,
                'patientId': 1,
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                station: { $concatArrays: ['$wards', '$clinic'] }
            }
        },
        {
            $unwind: {
                path: '$station'
            }
        }, {
            $match: {
                $or: [{
                    $and: [{ 'OPD_IPD': 1 }, condition1]
                },
                {
                    $and: [{ 'OPD_IPD': 0 }, { 'OPD_IPD': 0 }]
                }]
            }
        },
        {
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',

                as: 'patient'
            }
        }, {
            $unwind: {
                path: '$patient'
            }
        },
        {
            $project: {
                'visitId': 1,
                'OPD_IPD': 1,
                'searchBox': 1,
                'doctorId': 1,
                'patient': {
                    '_id': '$patient._id',
                    'gender': '$patient.gender',
                    'name': '$patient.name',
                    'dob': '$patient.dob',
                    'mrn': '$patient.mrn'
                },
                'visitDate': 1,
                "OPD_IPD_ID": 1,
                "visitNo": 1,
                "visitType": 1,
                "patientType": 1,
                "location": 1,
                "careProvider": 1,
                "primaryDoctor": 1,
                "clinicalDepartment": 1,
                "station": 1,
                "identifier": { $concat: [{ $substr: ['$OPD_IPD', 0, -1] }, '-', { $substr: ['$station.ID', 0, -1] }] } //to convert INT into STRING
            }
        },
        {
            $group: {
                "_id": '$identifier',
                "UnitID": { $first: '$station.ID' },
                "Code": { $first: '$station.Code' },
                "Description": { $first: '$station.Description' },
                'OPD_IPD': { $first: '$OPD_IPD' },
                "visits": {
                    $push: {
                        'visitId': '$_id',
                        'searchBox': '$searchBox',
                        'doctorId': '$doctorId',
                        'patient': '$patient',
                        'visitDate': '$visitDate',
                        "visitNo": "$visitNo",
                        // "visitType": "$visitType",
                        // "patientType": '$patientType',
                        "location": "$location",
                        "careProvider": "$careProvider",
                        "primaryDoctor": "$primaryDoctor",
                        "clinicalDepartment": '$clinicalDepartment',
                    }
                }
            }
        }, {
            $sort: {
                "OPD_IPD": 1
            }
        }
    ], function (err, results) {
        if (err) {
            cb(err, null)
        } else {
            cb(null, results);
        }
    })
}
module.exports.Model = {
    dashboard: stationDashboard,
    patients: stationPatientDetails
}