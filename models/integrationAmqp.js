var amqp = require('amqplib/callback_api')
var uuid = require('node-uuid')
var fs = require('fs')
var RABBITMQ_CONFIG = require('config').get('rabbitMQ');
var document = require('./db_model.js')
var mkdirp = require('mkdirp')
var winston = require('winston')
var hl7model = require('./hl7-messages')
var async = require('async');
var PACS_CONFIG = require('../config/PACS');
var notificationModel = require('./notification_model.js');
var usermanagement = require('./user_mangement.js');
var document = require('./db_model.js');
var masters = require('../controllers/MasterController');
var VisitModel = require('../controllers/VisitController');
var MasterController = new masters();
var documentObject = document.domainModel
var cpoeDocument = document.cpoeDataModel
var DataModelInt = document.INT_DataModel
var amqpConn = null;
var ObjectId = require('mongoose').Types.ObjectId;
var regExp = /\(([^)]+)\)/


var I_logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'logs/Pharmacy.log' })
    ]
});

var connectionString = 'amqp://' + RABBITMQ_CONFIG.accessUser + ':' + RABBITMQ_CONFIG.accessPassword + '@' + RABBITMQ_CONFIG.host + "?heartbeat=60";

var storeRabbitData = function (data, queue, type, key) {
    var currentDate = new Date();
    var isCompleted = false;
    var rabbitMQLogID = null;


    new documentObject.RabbitMQ({
        data: data,
        queue: queue,
        type: type,
        date_of_creation: currentDate.getTime(),
        date_time: currentDate,
        status: false,
        routingKey: key
    }).save(function (err, newRabbitMQLog) {
        //console.log(err);
        if (newRabbitMQLog)
            rabbitMQLogID = newRabbitMQLog._id;
        isCompleted = true;
    });

    while (!isCompleted) {
        require('deasync').runLoopOnce();
    }

    return rabbitMQLogID;
};

var storeRabbitData1 = function (data, queue, type, callback) {
    var currentDate = new Date();
    var isCompleted = false;
    var rabbitMQLogID = null;

    if (queue === 'Incoming') {
        new documentObject.ImagingLog({
            type: type,
            queue: queue
        }).save(callback)
    } else {
        new documentObject.RabbitMQ({
            data: data,
            queue: queue,
            type: type,
            date_of_creation: currentDate.getTime(),
            date_time: currentDate,
            status: false,
            routingKey: queue
        }).save(callback);
    }
};

var updateRabbitMQStatus = function (rabbitMQLogID, status, errMsg, data) {
    console.log("Status is " + status + " errMsg: " + errMsg + " ID: " + rabbitMQLogID)
    if (status === undefined)
        status = true;
    if (!status)
        status = true;
    if (status.toUpperCase() === "SUCCESS")
        status = true;
    if (status === 'ERROR')
        status = false;
    console.log("Updated: " + rabbitMQLogID + " == " + status + "  ====  " + JSON.stringify(data));
    documentObject.RabbitMQ.update(
        { _id: rabbitMQLogID },
        {
            $set: {
                status: status,
                errorMessage: JSON.stringify(errMsg),
                MRN: document.isFieldFilled(data) ? data.mrn : ""
            }
        }, function (err, noOfUpdate) {
            console.log("Updated " + err + JSON.stringify(noOfUpdate));
        });
};

module.exports.updateLogStatus = updateRabbitMQStatus;


function startConsumers() {
    amqpConn.createChannel(function (err, ch) {
        if (err) {
            log('[AMQP] Chanel create error: ' + err)
        } else {
            RABBITMQ_CONFIG.exchanges.forEach(function (exchng) {
                ch.assertExchange(exchng.exchange, "topic", { durable: true }, function (err, newExchange) {
                    log("Exchange Created");
                    exchng.queue.forEach(function (queues) {
                        ch.assertQueue(queues.name, { durable: true }, function (err, ok) {
                            log("Queue Created");
                            queues.keys.forEach(function (key) {
                                ch.bindQueue(ok.queue, newExchange.exchange, key);
                                // logger.info(newExchange.exchange + "  <----->  " + key + "  <----->  " + ok.queue)
                            }, this)
                            if (queues.isIncoming) {
                                ch.consume(ok.queue, function (msg) {
                                    storeRabbitData1(msg.content.toString(), msg.fields.routingKey, 'INCOMING', (err, done) => {
                                        if (document.isFieldFilled(done._id)) {
                                            ch.ack(msg);
                                            incommingMessage(msg, done._id);
                                        } else {
                                            ch.nack(msg);
                                            console.log("Negative ack send to RMQ");
                                        }
                                    })
                                }, { noAck: false }, function (err, reply) {
                                    log("Consumed message: " + ok.queue + " " + JSON.stringify(reply));
                                })
                            }
                        })
                    }, this)
                })
            }, this);
        }
    })
}

function incommingMessage(msg, rabbitMQLogID) {
    //var rabbitMQLogID = storeRabbitData(msg.content.toString(), "", 'INCOMING', msg.fields.routingKey);
    switch (msg.fields.routingKey) {
        case "R01":
            hl7model.getObservation(msg.content.toString(), rabbitMQLogID);
            break;
        case "BedRelease":
            //console.log("Bed Release: "+msg.content.toString())
            VisitModel.Bedrelease(msg.content.toString(), rabbitMQLogID);
            break;
        case "VisitCancel":
            //console.log("Bed Release: "+msg.content.toString())
            VisitModel.CancelVisit(msg.content.toString(), rabbitMQLogID);
            break;
        case "IPD":
        case "OPD":
            //OPRegistration(msg.content.toString(), rabbitMQLogID);
            VisitModel.AddRegistration(msg.content.toString(), rabbitMQLogID);
            break;
        case "Transfer":
            VisitModel.transferAdmission(msg.content.toString(), rabbitMQLogID);
            break;
        case "User_Doc":
            userCreation(msg.content.toString(), rabbitMQLogID);
            break;
        case "MLCPatient":
            updateMLCDetails(msg.content.toString(), rabbitMQLogID);
            break;
        case "Incoming":
            //hl7model.getObservation(msg, rabbitMQLogID);
            hl7model.IncomingPACSMessages(msg, rabbitMQLogID);
            break;
        case "MedicationDispence":
            updateMedicationStatus(msg.content.toString(), rabbitMQLogID);
            break;
        case "Insert":
            MasterController.InsertUpdateRecord(msg.content.toString(), rabbitMQLogID, function (RMQID, status, errMsg) {
                updateRabbitMQStatus(RMQID, status, errMsg);
            });
            break;
        case "Update":
            MasterController.InsertUpdateRecord(msg.content.toString(), rabbitMQLogID, function (RMQID, status, errMsg) {
                updateRabbitMQStatus(RMQID, status, errMsg);
            });
            break;
        case "Delete":
            MasterController.DeleteRecord(msg.content.toString(), rabbitMQLogID, function (RMQID, status, errMsg) {
                updateRabbitMQStatus(RMQID, status, errMsg);
            });
            break;
        default:
            break;
    }
}

if (RABBITMQ_CONFIG.switch.toUpperCase() === "ON")
    establishConnection();
else
    console.log('Switched Off RabbitMQ Interaction');

function establishConnection() {
    amqp.connect(connectionString, function (err, conn) {
        if (err) {
            log("[AMQP] ", err.message);
            return setTimeout(establishConnection, 1000);
        }
        conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
                log("[AMQP] conn error", err.toString());
            }
        });
        conn.on("blocked", function (reason) {
            log("[AMQP Connection Block] " + reason);
        });
        conn.on("close", function () {
            log("[AMQP] reconnecting");
            return setTimeout(establishConnection, 1000);
        });
        console.log("[AMQP] connected to RabitMQ: " + RABBITMQ_CONFIG.host);
        amqpConn = conn;
        startConsumers();
    });
}

function recordMsg(data) {
    fs.writeFile('/FailedMessages/' + data.BizActionObj.PatientDetails.GeneralDetails.MRNo + '.txt', JSON.stringify(data), function (err) {
        if (err) {
            log(err.message)
        }
    })
}

function userCreation(userData, rabbitMQLogID, cb = function () { }) {
    var data = JSON.parse(userData);
    var dobMatch = regExp.exec(data.BizActionobj.DoctorDetails.DOB)
    var usrId = uuid.v4();
    var userInfo = {
        _id: usrId,
        accessCode: "",
        email: data.BizActionobj.DoctorDetails.EmailId,
        name: data.BizActionobj.DoctorDetails.FirstName,
        hospitalName: "HLWE",
        hisUserId: data.BizActionobj.DoctorDetails.DoctorId,
        unit: data.BizActionobj.DoctorDetails.UnitID,
        firstName: data.BizActionobj.DoctorDetails.FirstName,
        dob: (document.isFieldFilled(dobMatch)) ? dobMatch[1] : '',
        userStatus: "unstable",
        userType: 'doctor',
        userId: usrId,
        setPassword: 'true',
        status: true,
        signCode: "testSign2"
    }
    documentObject.User.findOne({
        $and: [
            //{ accessCode: data.BizActionobj.DoctorDetails.EmailId },
            { hisUserId: data.BizActionobj.DoctorDetails.DoctorId }
        ]
    }, function (err, result) {
        if (err) {
            log("Error: " + err);
            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err);
        } else if (result) {
            console.log("User Update: ")
            documentObject.User.findOneAndUpdate(
                { _id: result._id },
                {
                    email: data.BizActionobj.DoctorDetails.EmailId,
                    name: data.BizActionobj.DoctorDetails.FirstName,
                    firstName: data.BizActionobj.DoctorDetails.FirstName,
                    unit: data.BizActionobj.DoctorDetails.UnitID,
                    status: data.BizActionobj.DoctorDetails.Status,
                    dob: (document.isFieldFilled(dobMatch)) ? dobMatch[1] : ''
                }, function (err, dataSave) {
                    if (err) {
                        log(err);
                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err);
                    } else {
                        log("Updated Doctor Record");
                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                    }
                })
        } else {
            console.log("User Create: ")
            documentObject.User.collection.insert(userInfo, function (err, result) {
                if (err) {
                    log("Error while saving: " + err);
                    updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err);
                } else if (result) {

                    var result = result.ops[0];
                    log(result);
                    updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                    // usermanagement.verifyUserByMail(result);
                    usermanagement.notifyUnstableUser(result);
                    //generateNotification()  //Call Generate Notification Function
                } else {
                    updateRabbitMQStatus(rabbitMQLogID, 'ERROR', userInfo);
                }
            })
        }
    })
}

function OPRegistration(opdData, rabbitMQLogID, cb = function () { }) {
    try {
        var data = JSON.parse(opdData);
        documentObject.Patient.findOne({ mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo }, function (err, regPatient) {
            if (err) {
                updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                cb(err, null)
            } else if (regPatient) {
                let temp1 = regPatient.nric != null ? regPatient.nric.slice(0, 5) : (data.BizActionObj.PatientDetails.CivilID != null ? data.BizActionObj.PatientDetails.CivilID.slice(0, 5) : null);
                let temp2 = data.BizActionObj.PatientDetails.CivilID != null ? data.BizActionObj.PatientDetails.CivilID.slice(0, 5) : null;
                let tempPass1 = (regPatient.passportNo == null) ? data.BizActionObj.PatientDetails.PassportNo : regPatient.passportNo.trim();
                console.log('existing nric: ' + temp1, "new nric   " + temp2);
                console.log('existing nric: ', tempPass1);
                if (temp1 != temp2 || tempPass1 != data.BizActionObj.PatientDetails.PassportNo) {
                    var conflictRecord = new documentObject.ConflictRecord();
                    conflictRecord._id = uuid.v4();
                    conflictRecord.passportNumber = data.BizActionObj.PatientDetails.PassportNo;
                    conflictRecord.nric = data.BizActionObj.PatientDetails.CivilID;
                    conflictRecord.existingNric = regPatient.nric;
                    conflictRecord.name = regPatient.name;
                    conflictRecord.mrn = regPatient.mrn;
                    conflictRecord.date = new Date();
                    conflictRecord.timestamp = Date.now();
                    conflictRecord.existingPassport = regPatient.passportNo;
                    var RegiDate = regExp.exec(data.BizActionObj.PatientDetails.GeneralDetails.RegistrationDate)
                    conflictRecord.registrationDate = (document.isFieldFilled(RegiDate)) ? RegiDate[1] : '';
                    conflictRecord.existingRegistrationDate = regPatient.registrationDate;
                    conflictRecord.save(function (err) {
                        if (err) {
                            console.log('err');
                        }
                    })
                } else if (!data.BizActionObj.IsRegisterOnly) {
                    var GeneratedId = {
                        patientId: regPatient._id
                    }
                    updatePatientRecord(data, GeneratedId, function (err, patientRecord) {
                        //console.log("Update: " + patientRecord.name)
                        if (err) {
                            console.log(err)
                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                            cb(err, null)
                        } else {
                            //console.log("Create Visit: " + patientRecord.name)
                            createOPVisit(data, regPatient._id, function (err, visitRecord) {
                                if (err) {
                                    if (err.message == 'ObjectError') {
                                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', "Addmission or Visit details null");
                                    } else {
                                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                    }
                                    cb(err, null)
                                } else {
                                    registerPatientVisitRecord(regPatient._id, visitRecord._id);
                                    hl7model.updatePatientRecord(patientRecord, visitRecord, rabbitMQLogID);
                                    // logger.log('info', '[OP] Patient: ' + regPatient._id + ' Visit: ' + visitRecord._id);
                                    if (rabbitMQLogID)
                                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                                    cb(null, true)
                                }
                            })

                        }
                    })
                }
                else {
                    if (rabbitMQLogID)
                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                    cb(null, true)
                }
            } else {
                registorPatient(data, function (err, patientRecord) {
                    if (err) {
                        log(err)
                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                        cb(err, null)
                    } else {
                        if (!data.BizActionObj.IsRegisterOnly) {
                            createOPVisit(data, patientRecord._id, function (err, visitRecord) {
                                if (err) {
                                    if (err.message == 'ObjectError') {
                                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', 'Addmission or Visit details null');
                                    } else {
                                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                    }
                                    // logger.log('error', '[OP] Error in Create Visit ');
                                    cb(err, null)
                                } else {

                                    registerPatientVisitRecord(patientRecord._id, visitRecord._id);
                                    hl7model.PacsRegistration(patientRecord, visitRecord, rabbitMQLogID);
                                    // logger.log('info', '[OP] New Patient: ' + patientRecord._id + ' & Visit: ' + visitRecord._id);
                                    if (rabbitMQLogID)
                                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                                    cb(null, true)
                                }
                            })
                        }
                        else {
                            if (rabbitMQLogID)
                                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                            cb(null, true)
                        }
                    }
                })
            }
        })
    } catch (e) {
        // logger.log('error', '[OP] Catched Error ');
        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', e.message);
        cb(e, null)
    }
}

function IPRegistration(opdData, rabbitMQLogID, cb = function () { }) {
    try {
        log("IP Registration called")
        var data = JSON.parse(opdData);
        log("MRNNO: " + data.BizActionObj.PatientDetails.GeneralDetails.MRNo);
        var GeneratedId = {
            admission: uuid.v4()
        }
        documentObject.Patient.findOne({ mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo }, function (err, regPatient) {
            if (err) {
                // logger.log('error', '[IP] Request Error: ');
                updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                cb(err, null)
            } else if (regPatient) {
                console.log("Already Registor Patient")
                GeneratedId.patientId = regPatient._id;
                if (!data.BizActionObj.IsRegisterOnly) {
                    log("Patient Update")
                    updatePatientRecord(data, GeneratedId, function (err, patientRecord) {
                        if (err) {
                            // logger.log('error', '[IP] Patient Update Error: ');
                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                            cb(err, null)
                        } else {
                            log("Patient Update and Visit")
                            createIPVisit(data, GeneratedId, function (err, visitRecord) {
                                if (err) {
                                    // logger.log('error', '[IP] Error in Create IP visit: ');
                                    updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                    cb(err, null)
                                } else {
                                    if (visitRecord.IsEmergancy)
                                        emergencyPatient(visitRecords);
                                    log("Patient Update and Visit and Admission")
                                    registerPatientVisitRecord(regPatient._id, visitRecord._id);
                                    hl7model.updatePatientRecord(patientRecord, visitRecord, rabbitMQLogID);
                                    createAdmission(data, GeneratedId, function (err, ok) {
                                        if (err) {
                                            // logger.log('error', '[IP] Error in creating admission');
                                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                            cb(err, null)
                                        } else {
                                            // logger.log('info', '[IP] Visit, Admission: ');
                                            if (rabbitMQLogID)
                                                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                                            cb(null, true)
                                        }
                                    })
                                }
                            })

                        }
                    })
                }
                else {
                    if (rabbitMQLogID)
                        updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                    cb(null, true);
                }
            } else {
                registorPatient(data, function (err, patientRecord) {
                    if (err) {
                        // logger.log('error', '[IP] Error in registor new patient');
                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                        cb(err, null)
                    } else {
                        console.log("New Registor Patient")
                        GeneratedId.patientId = patientRecord._id;
                        if (!data.BizActionObj.IsRegisterOnly) {
                            createIPVisit(data, GeneratedId, function (err, visitRecord) {
                                log("######")
                                if (err) {
                                    // logger.log('error', '[IP] Error in Create Visit');
                                    updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                    cb(err, null)
                                } else {
                                    if (visitRecord.IsEmergancy)
                                        emergencyPatient(visitRecords);
                                    registerPatientVisitRecord(patientRecord._id, visitRecord._id);
                                    hl7model.PacsRegistration(patientRecord, visitRecord, rabbitMQLogID);
                                    createAdmission(data, GeneratedId, function (err, ok) {
                                        if (err) {
                                            // logger.log('error', '[IP] Error in creating admission');
                                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                                            cb(err, null)
                                        } else {
                                            // logger.log('info', '[IP] New Patient, Visit, Admission: ');
                                            if (rabbitMQLogID)
                                                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                                            cb(null, true)
                                        }
                                    })
                                }
                            })
                        }
                        else {
                            if (rabbitMQLogID)
                                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                            cb(null, true)
                        }

                    }
                })
            }
        })
    } catch (e) {
        log(e.message)
        // logger.log('error', '[IP] Catched Error');
        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', e.message);
        cb(e, null)
    }
}

var placeOrder = function (order) {

    log("order receive: " + JSON.stringify(order));

    storeRabbitData1(JSON.stringify(order), order.orderCategory, 'OUTGOING', function (err, done) {
        try {
            if (err) {
                console.log("Error in log error: " + err.message)
                updateRabbitMQStatus(done._id, 'ERROR', err.message);
            } else {
                if (order.doctorId === undefined && order.userId !== undefined) {
                    order['doctorId'] = order.userId;
                }
                documentObject.Visit.aggregate([
                    {
                        "$match": { _id: order.visitId }
                    },
                    {
                        $lookup: {
                            from: "patients",
                            localField: "patientId",
                            foreignField: "_id",
                            as: "patient"
                        }
                    },
                    { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            "mrn": "$patient.mrn",
                            "HIS_PatientId": "$patient.HIS_PatientId",
                            "nric": "$patient.nric",
                            "unitId": "$patient.unitId",
                            "_id":"$patient._id",
                            "prefix": "$patient.prefix",
                            'name': "$patient.name",
                            "unitId": "$patient.unitId",
                            "GenderCode": "$patient.GenderCode",
                            "residentialCountry": "$patient.residentialCountry",
                            "mobile": "$patient.mobile",
                            "dob": "$patient.dob",
                            "RaceID": "$patient.RaceID",
                            "residentialAddress": "$patient.residentialAddress",
                            "residentialCity": "$patient.residentialCity",
                            "residentialState": "$patient.residentialState",
                            "residentialPostCode": "$patient.residentialPostCode",
                            "maritalStatus": "$patient.maritalStatus",
                            "religion": "$patient.religion",
                            "nationality": "$patient.nationality",
                            "NationalityID": "$patient.NationalityID",
                            "visitRecords": [{
                                "OPD_IPD_ID": "$OPD_IPD_ID",
                                "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                "OPD_IPD": "$OPD_IPD",
                                "patientType": "$patientType",
                                "location": "$location",
                                "room": "$room",
                                "_id":"$_id",
                                "careProvider": "$careProvider",
                                "visitNo": "$visitNo",
                                "visitDate": "$visitDate"
                            }]
                        }
                    }
                ], function (err, data) {
                    if (err) {
                        console.log("Error in getting patient information: " + err);
                        updateRabbitMQStatus(done._id, 'ERROR', err.message);
                    } else {
                        order.Identifier = data[0];
                        order.RMQID = done._id;
                        if (order.orderCategory == "Imaging Order")
                            hl7model.createOrder(data[0], data[0].visitRecords[0], order, done._id);
                        try {
                            amqp.connect(connectionString, function (err, connection) {
                                if (err) {
                                    log("Err: " + err);
                                    updateRabbitMQStatus(done._id, 'ERROR', err.message, data[0]);
                                } else {
                                    connection.createChannel(function (err, ch) {
                                        if (err) {
                                            console.log('Chanel create error: ' + err)
                                            updateRabbitMQStatus(done._id, 'ERROR', err.message, data[0]);
                                        } else {
                                            var ex = 'cpoeOrders';
                                            var key = order.orderCategory;
                                            var q = order.orderCategory;
                                            // ch.assertQueue(q, { durable: true });
                                            // ch.bindQueue(q, ex, key);
                                            ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                            ch.publish(ex, key, new Buffer(JSON.stringify(order)), { deliveryMode: true, confirm: true, noAck: false });
                                            if (done._id)
                                                updateRabbitMQStatus(done._id, 'SUCCESS', null, data[0]);
                                        }
                                    })
                                }
                            })
                        } catch (e) {
                            console.log(e)
                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', e.msg, data[0]);
                        }
                    }
                })
            }
        } catch (err) {
            log("Catched Exception");
            updateRabbitMQStatus(done._id, 'ERROR', err);
        }
    });
};

var cancelOrder = function (order) {
    if (orderCategory == "Imaging Order") {
        storeRabbitData1(JSON.stringify(order), order.orderCategory, 'OUTGOING', function (err, done) {
            if (err) {
                console.log("Error in cancelOrder: " + err.message)
                updateRabbitMQStatus(done._id, 'ERROR', err.message);
            } else {

                if (order.doctorId === undefined && order.userId !== undefined) {
                    order['doctorId'] = order.userId;
                }
                documentObject.Visit.aggregate([
                    {
                        "$match": { _id: order.visitId }
                    },
                    {
                        $lookup: {
                            from: "patients",
                            localField: "patientId",
                            foreignField: "_id",
                            as: "patient"
                        }
                    },
                    { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            "mrn": "$patient.mrn",
                            "HIS_PatientId": "$patient.HIS_PatientId",
                            "nric": "$patient.nric",
                            "unitId": "$patient.unitId",
                            "visitRecords": [{
                                "OPD_IPD_ID": "$OPD_IPD_ID",
                                "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                "OPD_IPD": "$OPD_IPD"
                            }]
                        }
                    }
                ], function (err, data) {
                    if (err) {
                        console.log("Error in placeOrder: " + err);
                        updateRabbitMQStatus(done._id, 'ERROR', err.message);
                    } else {
                        order.Identifier = data;
                        if (order.orderCategory == "Imaging Order")
                            hl7model.createOrder(data, data.visitRecords[0], order, done._id);
                        try {
                            amqp.connect(connectionString, function (err, connection) {
                                if (err) {
                                    log("Err: " + err);
                                    updateRabbitMQStatus(done._id, 'ERROR', err.message);
                                } else {
                                    connection.createChannel(function (err, ch) {
                                        if (err) {
                                            console.log('Chanel create error: ' + err)
                                            updateRabbitMQStatus(done._id, 'ERROR', err.message);
                                        } else {
                                            var ex = 'cpoeOrders';
                                            var key = order.orderCategory;
                                            var q = order.orderCategory;
                                            ch.assertQueue(q, { durable: true });
                                            ch.bindQueue(q, ex, key);
                                            ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                            ch.publish(ex, key, new Buffer(JSON.stringify(order)), { deliveryMode: true, confirm: true, noAck: false });
                                            if (done._id)
                                                updateRabbitMQStatus(done._id, 'SUCCESS', null);
                                        }
                                    })
                                }
                            })
                        } catch (e) {
                            console.log(e)
                            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', e.msg);
                        }
                    }
                })
            }

        });
    }
};

module.exports.cancelOrderToHIS = cancelOrder;

module.exports.placeOrderToHIS = placeOrder;

module.exports.sendNotification = function (message, options) {
    var rabbitMQLogID = storeRabbitData(JSON.stringify(message), options.key, 'OUTGOING');
    try {
        amqp.connect(connectionString, function (err, connection) {
            if (err) {
                updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                console.log("Error: " + err)
            } else {
                connection.createChannel(function (err, ch) {
                    if (err) {
                        console.log('Chanel create error: ' + err)
                        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                    } else {

                        var ex = options.exchange;
                        var key = options.key;

                        documentObject.Visit.aggregate([
                            {
                                "$match": { _id: message.visitId }
                            },
                            {
                                $lookup: {
                                    from: "patients",
                                    localField: "patientId",
                                    foreignField: "_id",
                                    as: "patient"
                                }
                            },
                            { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    "mrn": "$patient.mrn",
                                    "HIS_PatientId": "$patient.HIS_PatientId",
                                    "nric": "$patient.nric",
                                    "unitId": "$patient.unitId",
                                    "prefix": "$patient.prefix",
                                    'name': "$patient.name",
                                    "unitId": "$patient.unitId",
                                    "GenderCode": "$patient.GenderCode",
                                    "residentialCountry": "$patient.residentialCountry",
                                    "mobile": "$patient.mobile",
                                    "dob": "$patient.dob",
                                    "visitRecords": [{
                                        "OPD_IPD_ID": "$OPD_IPD_ID",
                                        "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                        "OPD_IPD": "$OPD_IPD"
                                    }]
                                }
                            }
                        ], function (err, data) {
                            if (err) {
                                console.log(err);
                                updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
                            } else {
                                message.Identifier = data;
                                log("Exchange: %s  %s" + ex, key);
                                //ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                ch.publish(ex, key, new Buffer(JSON.stringify(message)), { deliveryMode: true, confirm: true, noAck: false });
                                if (rabbitMQLogID)
                                    updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                            }
                        })
                    }
                })
            }
        })
    } catch (e) {
        console.log(e)
        updateRabbitMQStatus(rabbitMQLogID, 'ERROR', e.msg);
    }
}


function registorPatient(data, callback) {
    try {
        console.log(data);
        var patientSave = new documentObject.Patient()
        var patientId = uuid.v4();
        patientSave._id = patientId;
        patientSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID
        patientSave.name = data.BizActionObj.PatientDetails.FirstName
        patientSave.prefix = data.BizActionObj.PatientDetails.Prefix
        patientSave.PrefixId = data.BizActionObj.PatientDetails.PrefixId
        patientSave.gender = data.BizActionObj.PatientDetails.Gender
        patientSave.GenderCode = data.BizActionObj.PatientDetails.GenderID
        patientSave.RaceID = data.BizActionObj.PatientDetails.RaceID

        log(`In Create RaceID: ${data.BizActionObj.PatientDetails.RaceID}`)

        if (data.BizActionObj.PatientDetails.Photo != null) {
            var patientImg = new Buffer(data.BizActionObj.PatientDetails.Photo, 'binary').toString('base64')

            var dest = './data/files/' + patientId;

            mkdirp(dest, function (err) {
                if (err) return false;
                else return true;
            })

            patientSave.patientImg = '/files/' + patientId + "/Profile-" + Date.now() + ".png";

            fs.writeFile('./data' + patientSave.patientImg, patientImg, 'base64', function (err) {
                if (err) {
                    callback(err)
                }
                patientSave.patientImg = '/files/' + patientId + "/Profile-" + Date.now() + ".png";
            });
        }

        var RegiDate = regExp.exec(data.BizActionObj.PatientDetails.GeneralDetails.RegistrationDate)
        patientSave.registrationDate = (document.isFieldFilled(RegiDate)) ? RegiDate[1] : '';
        // log("GeneralDetails: "+JSON.stringify(data.BizActionObj.PatientDetails.GeneralDetails));
        log("MRN NO: " + data.BizActionObj.PatientDetails.GeneralDetails.MRNo);
        patientSave.mrn = data.BizActionObj.PatientDetails.GeneralDetails.MRNo
        patientSave.nric = data.BizActionObj.PatientDetails.CivilID
        patientSave.passportNo = data.BizActionObj.PatientDetails.PassportNo
        patientSave.status = data.BizActionObj.PatientDetails.MaritalStatusCode
        patientSave.maritalStatus = data.BizActionObj.PatientDetails.MaritalStatusID
        patientSave.religion = data.BizActionObj.PatientDetails.ReligionCode
        patientSave.nationality = data.BizActionObj.PatientDetails.NationalityCode
        patientSave.NationalityID = data.BizActionObj.PatientDetails.NationalityID
        var dobMatch = regExp.exec(data.BizActionObj.PatientDetails.DateofBirth)
        patientSave.dob = (document.isFieldFilled(dobMatch)) ? dobMatch[1] : '';
        patientSave.emailId = data.BizActionObj.PatientDetails.Email
        patientSave.Occupation = data.BizActionObj.PatientDetails.Occupation
        patientSave.residentialAddress = data.BizActionObj.PatientDetails.ResiAdress
        patientSave.residentialCountry = data.BizActionObj.PatientDetails.CountryCode
        patientSave.residentialState = data.BizActionObj.PatientDetails.StateCode
        patientSave.residentialCity = data.BizActionObj.PatientDetails.CityCode
        patientSave.residentialPostCode = data.BizActionObj.PatientDetails.PinCodeEditable
        patientSave.unitId = data.BizActionObj.PatientDetails.UnitID
        patientSave.mobile = data.BizActionObj.PatientDetails.MobileNo

        patientSave.save(callback);
    } catch (e) {
        callback(e)
    }
}

function updatePatientRecord(data, GeneratedId, callback) {
    var patientSave = {};
    patientSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID
    patientSave.name = data.BizActionObj.PatientDetails.FirstName
    patientSave.prefix = data.BizActionObj.PatientDetails.Prefix
    patientSave.PrefixId = data.BizActionObj.PatientDetails.PrefixId
    patientSave.gender = data.BizActionObj.PatientDetails.Gender
    patientSave.GenderCode = data.BizActionObj.PatientDetails.GenderID
    patientSave.RaceID = data.BizActionObj.PatientDetails.RaceID

    log(`In Updation RaceID: ${data.BizActionObj.PatientDetails.RaceID}`)

    if (data.BizActionObj.PatientDetails.Photo != null) {
        var patientImg = new Buffer(data.BizActionObj.PatientDetails.Photo, 'binary').toString('base64')

        var dest = './data/files/' + GeneratedId.patientId;

        mkdirp(dest, function (err) {
            if (err) return false;
            else return true;
        })

        patientSave.patientImg = '/files/' + GeneratedId.patientId + "/Profile-" + Date.now() + ".png";

        fs.writeFile('./data' + patientSave.patientImg, patientImg, 'base64', function (err) {
            if (err) {
                callback(err)
            }
            patientSave.patientImg = '/files/' + GeneratedId.patientId + "/Profile-" + Date.now() + ".png";
        });
    }

    var RegiDate = regExp.exec(data.BizActionObj.PatientDetails.GeneralDetails.RegistrationDate)
    patientSave.registrationDate = (document.isFieldFilled(RegiDate)) ? RegiDate[1] : '';
    //log("Update MRN NO: " + data.BizActionObj.PatientDetails.GeneralDetails.MRNo);
    patientSave.mrn = data.BizActionObj.PatientDetails.GeneralDetails.MRNo
    patientSave.nric = data.BizActionObj.PatientDetails.CivilID
    patientSave.passportNo = data.BizActionObj.PatientDetails.PassportNo
    patientSave.status = data.BizActionObj.PatientDetails.MaritalStatusCode
    patientSave.maritalStatus = data.BizActionObj.PatientDetails.MaritalStatusID
    patientSave.religion = data.BizActionObj.PatientDetails.ReligionCode
    patientSave.nationality = data.BizActionObj.PatientDetails.NationalityCode
    patientSave.NationalityID = data.BizActionObj.PatientDetails.NationalityID
    var dobMatch = regExp.exec(data.BizActionObj.PatientDetails.DateofBirth)
    patientSave.dob = (document.isFieldFilled(dobMatch)) ? dobMatch[1] : '';
    patientSave.emailId = data.BizActionObj.PatientDetails.Email
    patientSave.Occupation = data.BizActionObj.PatientDetails.Occupation
    patientSave.residentialAddress = data.BizActionObj.PatientDetails.ResiAdress
    patientSave.residentialCountry = data.BizActionObj.PatientDetails.CountryCode
    patientSave.residentialState = data.BizActionObj.PatientDetails.StateCode
    patientSave.residentialCity = data.BizActionObj.PatientDetails.CityCode
    patientSave.residentialPostCode = data.BizActionObj.PatientDetails.PinCodeEditable
    patientSave.unitId = data.BizActionObj.PatientDetails.UnitID
    patientSave.mobile = data.BizActionObj.PatientDetails.MobileNo

    documentObject.Patient.findOneAndUpdate({ _id: GeneratedId.patientId }, patientSave, callback)
}

var registerPatientVisitRecord = function (patientId, visitId, cb = function () { }) {
    documentObject.Patient.findOne({ _id: patientId }, function (err, patient) {
        if (err)
            cb(err, false);
        if (!patient)
            cb('Patient not found', false);
        else {
            if (patient.visitRecords === undefined)
                patient.visitRecords = [];
            else {
                if (!patient.visitRecords)
                    patient.visitRecords = [];
            }
            if (visitId) {
                patient.visitRecords.push(visitId);
                patient.save(function (err, updatedPatient) {
                    if (err)
                        cb(err, false);
                    else
                        cb(null, true);
                });
            }
            else {
                cb('Visit not found', false);
            }
        }
    });
};

function createOPVisit(data, patientId, callback) {
    try {
        if (!document.isFieldFilled(data.BizActionObj.PatientAdmissionDetails) &&
            !document.isFieldFilled(data.BizActionObj.PatientVisitDetails)) {
            callback({ message: 'ObjectError' }, null)
        }
        else {
            //log("Data Received in COPV")
            var doctorId = (data.BizActionObj.IsIPDAdmission) ? data.BizActionObj.PatientAdmissionDetails.Details.DoctorID : data.BizActionObj.PatientVisitDetails.VisitDetails.DoctorID;
            documentObject.User.findOne({ hisUserId: doctorId }, function (err, done) {
                if (err) {
                    callback(err, null)
                } else if (!done) {
                    //console.log("Doctor ID", data.BizActionObj.PatientVisitDetails.VisitDetails.DoctorID);
                    callback({ message: 'Doctor not found' }, null)
                } else {
                    parseVisitData(data, function (visit) {
                        //log("1: " + visit.OPD_IPD_ID + " 2: " + visit.OPD_IPD);
                        if (visit.OPD_IPD_ID == 0) {
                            return callback({ message: 'Visit Id is 0' }, null)
                        }
                        documentObject.Visit.findOne({
                            $and: [
                                { OPD_IPD_ID: visit.OPD_IPD_ID },
                                { OPD_IPD: visit.OPD_IPD }
                            ]
                        }, function (err, previousVisit) {
                            if (err) {
                                callback(err, null)
                            } else if (previousVisit) {
                                //log("Update Visit");
                                documentObject.Visit.findOneAndUpdate({ _id: previousVisit._id }, visit, callback);
                                // previousVisit = visit;
                                // previousVisit.patientId = patientId
                                // previousVisit.doctorId = done.userId
                                // previousVisit.save(callback)
                            } else {
                                log("Create Visit");
                                var visitToSave = new documentObject.Visit(visit);
                                visitToSave._id = uuid.v4();
                                visitToSave.patientId = patientId
                                visitToSave.doctorId = done.userId
                                visitToSave.save(function (err, visitRecord) {
                                    if (err) {
                                        callback(err, null)
                                    } else {
                                        if (document.isFieldFilled(visitRecord.QueueNo) && document.isFieldFilled(data.BizActionObj.PatientDetails.MobileNo)) {
                                            notificationModel.generateSms({
                                                to: data.BizActionObj.PatientDetails.MobileNo,
                                                content: `${visitRecord.searchBox.name}'s visit created with ${done.firstName} on ${visitRecord.visitDate}. Your Token number is ${visitRecord.QueueNo}`
                                            });
                                        }
                                        var smsData = {};
                                        if (done.personalInfo != undefined && typeof done.personalInfo != 'string') {
                                            smsData.to = done.personalInfo.mobileNo;
                                        }
                                        if (visitRecord.IsEmergancy == true) {
                                            smsData.content = 'New Emergancy visit for patient ' + visitRecord.searchBox.name + ' MRN:' + visitRecord.searchBox.mrn + " added in EMR."
                                            // generate notification
                                            var newNote = new documentObject.Notification();
                                            newNote._id = uuid.v4();
                                            newNote.userId = done.userId;
                                            newNote.message = smsData.content;
                                            newNote.location = visitRecord.location;
                                            newNote.visit = visitRecord._id;
                                            newNote.nType = 5;
                                            newNote.userType = "doctor";
                                            newNote.urgency = 'high';
                                            notificationModel.generateNotification(newNote, function (err) {
                                                if (err) {
                                                    console.log(err)
                                                }
                                            })
                                        } else {
                                            smsData.content = 'New visit for patient ' + visitRecord.searchBox.name + ' MRN:' + visitRecord.searchBox.mrn + " added in EMR."
                                        }
                                        notificationModel.generateSms(smsData);
                                        callback(null, visitRecord);
                                    }
                                })
                            }
                        })
                    })
                }
            })
        }
    } catch (error) {
        log("Catched Error:" + error);
        callback(error, null)
    }
}

function createIPVisit(data, GeneratedId, callback) {
    try {
        documentObject.User.findOne({ hisUserId: data.BizActionObj.PatientAdmissionDetails.Details.DoctorID }, function (err, done) {
            if (err) {
                callback(err, null)
            } else if (!done) {
                callback({ message: 'Doctor not found' }, null)
            } else {
                var visitToSave = new documentObject.Visit()
                visitToSave._id = uuid.v4();
                visitToSave.OPD_IPD_ID = data.BizActionObj.PatientAdmissionDetails.Details.ID
                visitToSave.visitNo = data.BizActionObj.PatientAdmissionDetails.Details.AdmissionNumber
                visitToSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID
                visitToSave.HIS_Doctor_ID = data.BizActionObj.PatientAdmissionDetails.Details.DoctorID
                visitToSave.OPD_IPD = (data.BizActionObj.IsIPDAdmission) ? 1 : 0;
                visitToSave.primaryDiagnosis = "";
                visitToSave.patientId = GeneratedId.patientId
                visitToSave.doctorId = done.userId
                visitToSave.IsEmergancy = data.BizActionObj.PatientDetails.IsEmergency;
                var visitDate = regExp.exec(data.BizActionObj.PatientAdmissionDetails.Details.AdmissionDate)
                visitToSave.visitDate = (document.isFieldFilled(visitDate)) ? visitDate[1] : '';
                visitToSave.visitType = 'Admitted'
                visitToSave.VisitTypeID = 6
                visitToSave.patientType = 'IP';
                visitToSave.location = data.BizActionObj.PatientAdmissionDetails.Details.Ward
                visitToSave.room = data.BizActionObj.PatientAdmissionDetails.Details.Room
                visitToSave.careProvider = data.BizActionObj.PatientAdmissionDetails.Details.DoctorName
                visitToSave.dateEpoch = new Date().getTime();
                visitToSave.encounterType = data.BizActionObj.PatientAdmissionDetails.Details.EncounterTypeDescription
                visitToSave.primaryDoctor = data.BizActionObj.PatientAdmissionDetails.Details.DoctorName
                visitToSave.clinicalDepartment = data.BizActionObj.PatientAdmissionDetails.Details.Department
                // visitToSave.clinicName = data.inputObj.PatientAdmissionDetails.Details.Cabin

                var searchData = {
                    WardID: data.BizActionObj.PatientAdmissionDetails.Details.WardID,
                    DepartmentID: data.BizActionObj.PatientAdmissionDetails.Details.DepartmentID,
                    location: data.BizActionObj.PatientAdmissionDetails.Details.Ward,
                    cinicalDepartment: data.BizActionObj.PatientAdmissionDetails.Details.Department,
                    mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo
                }

                visitToSave.searchBox = searchData;

                for (kinInfo in data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList) {
                    var kinInfoObj = {
                        name: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinName,
                        relation: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinRelationDesc,
                        address: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinAddr,
                        mobileno: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinMobileNo,
                        occupation: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinOccupationDesc

                    }
                    visitToSave.kinInfo.push(kinInfoObj)
                }
                for (payeeInfo in data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails) {
                    var payeeInfoObj = {
                        companyName: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].ComapnyName,
                        PatientCategory: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].PatientCategoryName,
                        tariff: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].TariffName,
                        priority: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].Priority,
                        companyType: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].CompanyCode
                    }
                    visitToSave.payeeInfo.push(payeeInfoObj)
                }
                visitToSave.admission.push(GeneratedId.admission);
                visitToSave.save(function (err, visitRecord) {
                    if (err) {
                        callback(err, null)
                    } else {
                        var data = {};
                        if (done.personalInfo != undefined && typeof done.personalInfo != 'string') {
                            data.to = done.personalInfo.mobileNo;
                        }
                        if (visitRecord.IsEmergancy == true) {
                            data.content = 'New Emergancy visit for patient ' + visitRecord.searchBox.name + ' MRN:' + searchData.mrn + " added in EMR."
                            // generate notification
                            var newNote = new documentObject.Notification();
                            newNote._id = uuid.v4();
                            newNote.userId = done.userId;
                            newNote.message = data.content;
                            newNote.location = visitRecord.location;
                            newNote.nType = 5;
                            newNote.visit = visitRecord._id;
                            newNote.userType = "doctor";
                            newNote.urgency = 'high';
                            notificationModel.generateNotification(newNote, function (err) {
                                if (err) {
                                    console.log(err)
                                }
                            });

                        } else {
                            data.content = 'New visit for patient ' + visitRecord.searchBox.name + ' MRN:' + searchData.mrn + " added in EMR."
                        }
                        notificationModel.generateSms(data);
                        callback(null, visitRecord)
                    }
                });
            }
        })
    } catch (error) {
        log("Catched Error:" + error);
        callback(error, null)
    }
}

function createAdmission(data, GeneratedId, callback) {
    var admissionToSave = new documentObject.Admission()
    admissionToSave._id = GeneratedId.admission
    admissionToSave.admittingDoctor = data.BizActionObj.PatientAdmissionDetails.Details.DoctorName
    admissionToSave.admittingDepartment = data.BizActionObj.PatientAdmissionDetails.Details.Department
    admissionToSave.admissionType = data.BizActionObj.PatientAdmissionDetails.Details.AdmissionType
    admissionToSave.wardName = data.BizActionObj.PatientAdmissionDetails.Details.Ward
    admissionToSave.roomNo = data.BizActionObj.PatientAdmissionDetails.Details.Room
    admissionToSave.bedNo = data.BizActionObj.PatientAdmissionDetails.Details.BedDescription
    admissionToSave.save(callback)
}

function addCMSVitals(cmsdata, rabbitMQLogID, cb) {
    var data = JSON.parse(cmsdata);
    documentObject.Visit.findOne({
        $and: [
            { HIS_PatientId: data.PatientId },
            { isActive: "true" }
        ]
    }, function (err, done) {
        if (err) {
            cb(err.message)
        } else if (!done) {
            cb("Visit not found");
        } else {
            var vitalData = {
                visitId: done._id,
                doctorId: done.doctorId,
                userId: done.doctorId,
                patientId: done.patientId,
                date: data.ObeservationDateTime
            }
            data.Obsservations.forEach(function (element) {
                for (vital in element) {
                    var newVitals = new documentObject.Vital(vitalData);
                    newVitals._id = uuid.v4();
                    newVitals.vitalName = vital;
                    newVitals.vitalValue = element[vital];
                    newVitals.save(function (err, ok) {
                        if (err) {
                            cb(err.message)
                        }
                    })
                }
            }, this);
            if (rabbitMQLogID)
                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS');
            cb("", "Vitals added Successfully.")
        }
    })
}

exports.demoVitals = addCMSVitals;

function updateMLCDetails(data, rabbitMQLogID, callback) {
    var data = JSON.parse(data);
    var mlcDate = regExp.exec(data.BizActionObj.AdmMLDCDetails.MLCDate);
    var mlcData = {
        'MLCNo': data.BizActionObj.AdmMLDCDetails.MLCNo,
        'Number': data.BizActionObj.AdmMLDCDetails.Number,
        'Authority': data.BizActionObj.AdmMLDCDetails.Authority,
        'PoliceStation': data.BizActionObj.AdmMLDCDetails.PoliceStation,
        'MLCDate': (document.isFieldFilled(mlcDate)) ? mlcDate[1] : ''
    }
    documentObject.Visit.findOneAndUpdate({ OPD_IPD_ID: data.BizActionObj.AdmMLDCDetails.AdmID }, { MLCDetails: mlcData, IsMLC: true }, function (err, update) {
        if (err) {
            log(err)
            updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err.message);
        } else {
            log("MLC Record Updated.")
            updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
        }
    })
}

function updateVisits() {
    try {
        documentObject.Patient.find({}, 'HIS_PatientId', function (err, done) {
            if (err) {
                log(err);
            } else {
                done.forEach(function (element) {
                    documentObject.Visit.findOneAndUpdate({ patientId: element._id }, { HIS_PatientId: element.HIS_PatientId }, function (err, ok) {
                        if (err) {
                            log(err)
                        } else {
                            log("updated: " + ok._id + " --- ID: " + ok.HIS_PatientId);
                        }
                    })
                }, this);
                //log(done);
            }
        })
    } catch (e) {
        log(e)
    }
}

exports.dataTransfertoHIS = function (opta, callback = function () { }) {
    //log("This function Called: "+JSON.stringify(opta))
    if (!opta.data)
        return callback(Utility.output('Data is required', 'ERROR'));
    if (!opta.exchange)
        return callback(Utility.output('Exchange name is required', 'ERROR'));
    if (!opta.key)
        return callback(Utility.output('Key name is required', 'ERROR'));
    if (!opta.queue)
        return callback(Utility.output('Queue name is required', 'ERROR'));
    //var rabbitMQLogID = storeRabbitData(JSON.stringify(opta.data), opta.key, 'OUTGOING',opta.key);
    storeRabbitData1(JSON.stringify(opta.data), opta.key, 'OUTGOING', (err, done) => {
        try {
            if (err) {
                log("Error----->  " + err);
            } else {
                amqp.connect(connectionString, function (err, connection) {
                    if (err) {
                        log(err)
                        updateRabbitMQStatus(done._id, 'ERROR', err.message, opta.data.Identifier);
                        return callback(Utility.output(err, 'ERROR'));
                    } else {
                        //log("Connected")
                        connection.createChannel(function (err, ch) {
                            if (err) {
                                updateRabbitMQStatus(done._id, 'ERROR', err.message, opta.data.Identifier);
                                return callback(Utility.output(err, 'ERROR'));
                            } else {
                                var ex = opta.exchange;
                                var key = opta.key;
                                var q = opta.queue;
                                opta.data.RMQID = done._id;
                                log("Data for send");
                                // ch.assertQueue(q, { durable: true });
                                // ch.bindQueue(q, ex, key);
                                ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                var status = ch.publish(ex, key, new Buffer(JSON.stringify(opta.data)), { deliveryMode: true, confirm: true, noAck: false });
                                log("Publish Status: " + status);
                                if (status) {
                                    updateRabbitMQStatus(done._id, 'SUCCESS', null, opta.data.Identifier);
                                    ch.close(function () { connection.close(); });
                                    callback(Utility.output('Successfully Sent', 'SUCCESS'));
                                }
                            }
                        })
                    }
                })
            }
        } catch (e) {
            updateRabbitMQStatus(done._id, 'ERROR', e.message);
            return callback(Utility.output(e, 'ERROR'));
        }
    });
};

var updateFailedMessages = function () {
    var async = require('async');
    var totalRecord = 0;
    var errorResult = 0;
    documentObject.RabbitMQ.find({ date_of_creation: { $gte: 1507460400542, $lt: 1507546800542 }, queue: { $in: ["OPD", "IPD"] } }
    ).exec(function (err, result) {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        console.log("Records to be updated: " + result.length);
        async.eachSeries(result, function (singleData, callback_each) {
            var rabbitMQLogID = singleData._id;
            var data = singleData.data;
            if (singleData.queue === "OPD") {
                console.log("called OPD");
                OPRegistration(data, rabbitMQLogID, function (err, success) {
                    if (err) {
                        console.error("Update Error: " + err)
                        errorResult++;
                    } else {
                        totalRecord++;
                    }
                    callback_each();
                });

            }
            else {
                console.log("called IPD");
                IPRegistration(data, rabbitMQLogID, function (err, success) {
                    if (err) {
                        console.error("Update Error: " + err)
                        errorResult++;
                    }
                    else {
                        totalRecord++;
                    }
                    callback_each();
                });

            }
        }, function () {
            console.log("Utility Result: \n1. Updated record: " + totalRecord + " \n2.Error Result: " + errorResult + " \nRecords to be updated: " + result.length)
        });
    });
};

exports.compareRabbitMQPatients = updateFailedMessages;

//updateFailedMessages();

function parseVisitData(data, callback) {
    var visitToSave = {
        kinInfo: [],
        payeeInfo: [],
        BedInformation: []
    };
    if (!data.BizActionObj.IsIPDAdmission) {
        log("OPD VISIT")
        visitToSave.OPD_IPD_ID = data.BizActionObj.PatientVisitDetails.VisitDetails.ID
        visitToSave.visitNo = data.BizActionObj.PatientVisitDetails.VisitDetails.VisitNumber
        visitToSave.OPD_IPD = (data.BizActionObj.IsIPDAdmission) ? 1 : 0;
        visitToSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID;
        visitToSave.HIS_Doctor_ID = data.BizActionObj.PatientVisitDetails.VisitDetails.DoctorID;
        visitToSave.UnitID = data.BizActionObj.PatientVisitDetails.VisitDetails.UnitId;
        //visitToSave.patientId = patientId
        //visitToSave.doctorId = done.userId
        var visitDate = regExp.exec(data.BizActionObj.PatientVisitDetails.VisitDetails.Date)
        visitToSave.visitDate = (document.isFieldFilled(visitDate)) ? visitDate[1] : '';

        var visitType = (data.BizActionObj.PatientVisitDetails.VisitDetails.VisitTypeID == 2) ? 'Follow Up' : 'New';

        visitToSave.visitType = visitType;
        visitToSave.IsEmergancy = data.BizActionObj.PatientDetails.IsEmergency;
        visitToSave.VisitTypeID = data.BizActionObj.PatientVisitDetails.VisitDetails.VisitTypeID;
        visitToSave.patientType = 'OP';
        visitToSave.location = data.BizActionObj.PatientVisitDetails.VisitDetails.Cabin
        visitToSave.careProvider = data.BizActionObj.PatientVisitDetails.VisitDetails.Doctor
        visitToSave.dateEpoch = new Date().getTime();
        visitToSave.encounterType = data.BizActionObj.PatientVisitDetails.VisitDetails.EncounterType
        visitToSave.primaryDoctor = data.BizActionObj.PatientVisitDetails.VisitDetails.Doctor
        visitToSave.clinicalDepartment = data.BizActionObj.PatientVisitDetails.VisitDetails.Department
        visitToSave.clinicName = data.BizActionObj.PatientVisitDetails.VisitDetails.Cabin
        if (document.isFieldFilled(data.BizActionObj.PatientVisitDetails.VisitDetails.TokenNo)) {
            visitToSave.QueueNo = data.BizActionObj.PatientVisitDetails.VisitDetails.TokenNo;
        }
        var searchData = {
            CabinID: data.BizActionObj.PatientVisitDetails.VisitDetails.CabinID,
            DepartmentID: data.BizActionObj.PatientVisitDetails.VisitDetails.DepartmentID,
            location: data.BizActionObj.PatientVisitDetails.VisitDetails.Cabin,
            cinicalDepartment: data.BizActionObj.PatientVisitDetails.VisitDetails.Department,
            clinicName: data.BizActionObj.PatientVisitDetails.VisitDetails.Cabin,
            mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo,
            name: data.BizActionObj.PatientDetails.FirstName
        }

        visitToSave.searchBox = searchData;

        for (kinInfo in data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList) {
            var kinInfoObj = {
                name: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinName,
                relation: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinRelationDesc,
                address: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinAddr,
                mobileno: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinMobileNo,
                occupation: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinOccupationDesc
            }
            visitToSave.kinInfo.push(kinInfoObj)
        }
        for (payeeInfo in data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails) {
            var payeeInfoObj = {
                companyName: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].ComapnyName,
                PatientCategory: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].PatientCategoryName,
                tariff: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].TariffName,
                priority: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].Priority,
                companyType: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].CompanyCode
            }
            visitToSave.payeeInfo.push(payeeInfoObj)
        }
        callback(visitToSave);
    } else {
        log("IPD Visit")
        visitToSave.OPD_IPD_ID = data.BizActionObj.PatientAdmissionDetails.Details.ID
        visitToSave.visitNo = data.BizActionObj.PatientAdmissionDetails.Details.AdmissionNumber
        visitToSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID
        visitToSave.HIS_Doctor_ID = data.BizActionObj.PatientAdmissionDetails.Details.DoctorID
        visitToSave.OPD_IPD = (data.BizActionObj.IsIPDAdmission) ? 1 : 0;
        visitToSave.UnitID = data.BizActionObj.PatientAdmissionDetails.Details.UnitId;
        // visitToSave.patientId = GeneratedId.patientId
        // visitToSave.doctorId = done.userId
        visitToSave.IsEmergancy = data.BizActionObj.PatientDetails.IsEmergency;
        var visitDate = regExp.exec(data.BizActionObj.PatientAdmissionDetails.Details.AdmissionDate)
        visitToSave.visitDate = (document.isFieldFilled(visitDate)) ? visitDate[1] : '';
        visitToSave.visitType = 'Admitted'
        visitToSave.VisitTypeID = 6
        visitToSave.patientType = 'IP';
        visitToSave.location = data.BizActionObj.PatientAdmissionDetails.Details.Ward
        visitToSave.room = data.BizActionObj.PatientAdmissionDetails.Details.Room
        visitToSave.careProvider = data.BizActionObj.PatientAdmissionDetails.Details.DoctorName
        visitToSave.dateEpoch = new Date().getTime();
        visitToSave.encounterType = data.BizActionObj.PatientAdmissionDetails.Details.EncounterTypeDescription
        visitToSave.primaryDoctor = data.BizActionObj.PatientAdmissionDetails.Details.DoctorName
        visitToSave.clinicalDepartment = data.BizActionObj.PatientAdmissionDetails.Details.Department
        // visitToSave.clinicName = data.inputObj.PatientAdmissionDetails.Details.Cabin

        var searchData = {
            WardID: data.BizActionObj.PatientAdmissionDetails.Details.WardID,
            DepartmentID: data.BizActionObj.PatientAdmissionDetails.Details.DepartmentID,
            location: data.BizActionObj.PatientAdmissionDetails.Details.Ward,
            cinicalDepartment: data.BizActionObj.PatientAdmissionDetails.Details.Department,
            roomNo: data.BizActionObj.PatientAdmissionDetails.Details.RoomCode,
            bedNo: data.BizActionObj.PatientAdmissionDetails.Details.BedDescription,
            mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo,
            name: data.BizActionObj.PatientDetails.FirstName
        }
        var bed = {
            WardID: data.BizActionObj.PatientAdmissionDetails.Details.WardID,
            admittingDoctor: data.BizActionObj.PatientAdmissionDetails.Details.DoctorName,
            admittingDepartment: data.BizActionObj.PatientAdmissionDetails.Details.DepartmentID,
            admissionType: data.BizActionObj.PatientAdmissionDetails.Details.AdmissionTypeID,
            wardName: data.BizActionObj.PatientAdmissionDetails.Details.Ward,
            roomNo: data.BizActionObj.PatientAdmissionDetails.Details.RoomCode,
            bedNo: data.BizActionObj.PatientAdmissionDetails.Details.BedDescription,
            admissionDate: (document.isFieldFilled(visitDate)) ? visitDate[1] : '',
            IsActive: true
        }
        visitToSave.BedInformation.push(bed);
        visitToSave.searchBox = searchData;

        for (kinInfo in data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList) {
            var kinInfoObj = {
                name: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinName,
                relation: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinRelationDesc,
                address: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinAddr,
                mobileno: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinMobileNo,
                occupation: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinOccupationDesc
            }
            visitToSave.kinInfo.push(kinInfoObj)
        }

        for (payeeInfo in data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails) {
            var payeeInfoObj = {
                companyName: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].ComapnyName,
                PatientCategory: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].PatientCategoryName,
                tariff: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].TariffName,
                priority: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].Priority,
                companyType: data.BizActionObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].CompanyCode
            }
            visitToSave.payeeInfo.push(payeeInfoObj)
        }
        callback(visitToSave)
    }
}

function updateMedicationStatus(pharmacyData, rabbitMQLogID) {
    var data = JSON.parse(pharmacyData);

    async.eachSeries(data.BizActionObj.ItemList, function (element, element_callback) {
        var query;
        if (element.ProgressID == 3 && element.Opd_Ipd == 1) {
            query = { $set: { canCancel: true, canDiscontinue: true, canEdit: true } };
        } else if (element.ProgressID == 1) {
            query = { $set: { canCancel: false, canDiscontinue: false, canEdit: false } };
        }
        cpoeDocument.CpoeOrder.findOneAndUpdate({ _id: element.EMROrderId }, query, (err, updated) => {
            if (err) {
                log("CPOE order cant modified: " + err)
                element_callback()
            } else if (updated) {
                log("CPOE record Updated")
                element_callback()
            } else {
                log("CPOE record not Found")
                element_callback()
            }
        })
    },
        function (err) {
            if (err) {
                updateRabbitMQStatus(rabbitMQLogID, 'ERROR', err);
                log("Error occured: " + err)
            } else {
                updateRabbitMQStatus(rabbitMQLogID, 'SUCCESS', null);
                log("Medication Dispence status updated.")
            }
        })
}

module.exports.pushFailedMessages = function () {
    documentObject.RabbitMQ.find({ routingKey: "pharmacy", status: false }, (err, done) => {
        if (err)
            log("Error while fetching data")
        else if (!done)
            log("Failed  pharmacy order is not found ")
        else {
            done.forEach(element => {
                var payload = JSON.parse(element.data);
                //if (payload.Identifier.mrn == 391) {
                payload.RMQID = element._id;
                //log("condition satisfy")
                amqp.connect(connectionString, function (err, connection) {
                    if (err) {
                        log(err);
                        updateRabbitMQStatus(element._id, 'ERROR', err.message);
                    } else {
                        connection.createChannel(function (err, ch) {
                            if (err) {
                                log(err);
                                updateRabbitMQStatus(element._id, 'ERROR', err.message);
                            } else {
                                var ex = 'cpoeOrders';
                                var key = element.routingKey;
                                ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                if (ch.publish(ex, key, new Buffer(JSON.stringify(payload)), { deliveryMode: true, confirm: true, noAck: false }))
                                    updateRabbitMQStatus(element._id, 'SUCCESS', "Send through Crone");

                            }
                        })
                    }
                })
                //}
            });
        }
    })
}

module.exports.ResendPharmacyOrder = function (data) {
    console.log("Date: " + new Date() + "   " + JSON.stringify(data));
    documentObject.RabbitMQ.find({
        _id: {
            $in: data
        }
    }, (err, done) => {
        if (err)
            log("Error while fetching data")
        else if (!done)
            console.log("Failed  pharmacy order is not found ")
        else {
            let count = 0;
            console.log("Connection String: " + connectionString)
            console.log("Length of data: " + done.length);
            async.eachSeries(done, (data, cb) => {
                setTimeout((element) => {
                    var payload = JSON.parse(element.data);
                    payload.RMQID = element._id;
                    amqp.connect(connectionString, function (err, connection) {
                        if (err) {
                            console.log(err);
                            cb(err);
                        } else {
                            connection.createChannel(function (err, ch) {
                                if (err) {
                                    console.log(err);
                                    cb(err);
                                } else {
                                    var ex = 'cpoeOrders';
                                    var key = element.routingKey;
                                    ch.assertExchange(ex, 'topic', { durable: true, confirm: true });
                                    if (ch.publish(ex, key, new Buffer(JSON.stringify(payload)), { deliveryMode: true, confirm: true, noAck: false })) {
                                        count++;
                                        console.log("Sent to RMQ  " + count + "  ----  " + element._id);
                                        ch.close(function () { connection.close(); });
                                        cb(null, count);
                                    } else {
                                        cb("Some Other error has occred");
                                    }
                                }
                            })
                        }
                    })
                }, 3000, data);
            }, (err, cnt) => {
                if (err)
                    console.log("Getting Error");
                else
                    console.log("Finally Done  " + cnt);
            })
        }
    })
}