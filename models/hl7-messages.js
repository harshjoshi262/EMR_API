
var PACS_CONFIG = require('../config/PACS')
var document = require('./db_model.js')
var RABBITMQ_CONFIG = require('config').get('rabbitMQ')
var hl7 = require("simple-hl7");
var amqp = require('amqplib/callback_api')
let Message = require('../controllers/HL7Segments')

var parser = require("../controllers/HL7Segments");

var documentObject = document.domainModel
var MasterModel = document.mastersModel;
var CpoeModel = document.cpoeDataModel;
var ResultModel = document.resultDataModel;

var connectionString = 'amqp://' + RABBITMQ_CONFIG.accessUser + ':' + RABBITMQ_CONFIG.accessPassword + '@' + RABBITMQ_CONFIG.host + "?heartbeat=60";

var updatePacsMsgStatus = function (logId, obj) {
    documentObject.ImagingLog.update({ _id: logId }, {
        $set: obj
    }, function (err, noOfUpdate) {
        console.log("Updated " + err + JSON.stringify(noOfUpdate));
    })
}

function storeImagingLog(type, msgType, mrn, visitId, callback) {
    new documentObject.ImagingLog({
        type: type,
        queue: type,
        MRN: mrn,
        OPD_IPD_ID: visitId
    }).save(callback)
}

module.exports.PacsRegistration = function (patient, visit, rabbitMQLogID) {
    console.log("Patient Registration for Pacs")
    var event = (visit.patientType === "IP") ? PACS_CONFIG.ADT_A01 : PACS_CONFIG.ADT_A04;
    storeImagingLog("Outgoing", ADT, patient.mrn, visit.OPD_IPD_ID, (err, success) => {
        if (err) {
            return;
        } else {
            getADTSegment(ADT, patient, visit, success.messageNo, (err, adt) => {
                if (err)
                    log("ERROR: " + err)
                else {
                    var data = adt.log()
                    sendToQueue(ADT[1], ADT[0], data, success._id)
                }
            })
        }
    })
}

module.exports.ConstructMessage = function (patient, visit) {
    var event = (visit.patientType === "IP") ? PACS_CONFIG.ADT_A01 : PACS_CONFIG.ADT_A04;
    storeImagingLog("Outgoing", event, patient.mrn, visit.OPD_IPD_ID, (err, success) => {
        if (err) {
            return;
        } else {
            try {
                Message.SendMessage(event, success.messageNo, patient._id, visit._id);
            } catch (e) {
                console.log("[HL7 Message] " + e);
            }
        }
    })
}

function getADTSegment(ADT, patient, visit, messageNo, callback) {
    MasterModel.m_nationality.findOne({ ID: patient.NationalityID }, (err, record) => {
        if (err)
            callback(err)
        else {
            var adt = new hl7.Message(
                PACS_CONFIG.Sending_App,            //Sending App
                "",
                PACS_CONFIG.Receiving_App,          //Receiving App
                "",
                Utility.getHL7Date(new Date()),                         //Date time of message
                "",
                ADT,                                //Message Type 
                messageNo,                             //MessageID 
                "P",
                PACS_CONFIG.Version                 //HL7 Message Version
            );

            adt.addSegment("EVN",
                ADT[1],                              //Type 
                Utility.getHL7Date(new Date())                     //Date time    
            );

            adt.addSegment("PID",
                1,
                patient.HIS_PatientId,              //Patient ID (HIS ID)
                patient.mrn, //MRN
                patient.nric,
                patient.name,                         //Name
                "",
                Utility.getHL7Date(new Date(patient.dob)),                                                        //DOB
                Utility.checkValidField(patient.GenderCode),                            //Gender (F/M/O/U)
                "",
                Utility.checkValidField(patient.RaceID),                                                                 //Race Code
                [
                    patient.residentialAddress,
                    "",
                    patient.residentialCity,
                    patient.residentialState,
                    patient.residentialPostCode,
                    patient.residentialCountry
                ],                                                                  //Address
                Utility.checkValidField(patient.residentialCountry),                       //Country Code
                [patient.mobile],
                "",
                "",
                Utility.checkValidField(patient.maritalStatus),                 //Marital status Code
                Utility.checkValidField(patient.religion),                      //Religion Code
                "",
                "",             //SSN
                "", "", "", "", "", "", "", "",
                Utility.checkValidField(record.Description)                    //Nationality Code
            );

            adt.addSegment("PV1",
                1,               //Visit ID (HIS ID)
                (visit.patientType == "IP") ? "I" : "O",              //Patient Type (OP or IP)
                [Utility.checkValidField(visit.location), Utility.checkValidField(visit.room)],
                "",                             //Admission Type
                "",
                "",
                "", "", "", "", "", "", "",
                "",
                "", "",
                ["", visit.careProvider],
                "",
                visit.visitNo,                  //Visit No
                "",
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                Utility.getHL7Date(new Date(visit.visitDate))                 //Admission Date time
            );
            callback(null, adt);
        }
    })
}

module.exports.updatePatientRecord = function (patient, visit, rabbitMQLogID) {
    console.log("Patient Updation for Pacs")
    var ADT = PACS_CONFIG.ADT_A08;
    storeImagingLog("OUT", ADT, patient.mrn, visit.OPD_IPD_ID, (err, success) => {
        if (err) {
            return;
        } else {
            log("Data to save: " + success)
            getADTSegment(ADT, patient, visit, success.messageNo, (err, adt) => {
                if (err)
                    log("ERROR: " + err)
                else {
                    var data = adt.log()
                    sendToQueue(ADT[1], ADT[0], data, success._id)
                }
            })
        }
    })
}

module.exports.createOrder = function (patient, visit, order, rabbitMQLogID) {
    sendADTMessage(patient, visit);
    MasterModel.m_nationality.findOne({ ID: patient.NationalityID }, (err, record) => {
        if (err)
            log("Error: " + err)
        else {
            var orderStatus = "NW";
            orderStatus = (order.orderStatus === "cancelled") ? "CA" : "NW";

            var orm = new hl7.Message(
                PACS_CONFIG.Sending_App,            //Sending App
                "",
                PACS_CONFIG.Receiving_App,          //Receiving App
                "",
                Date.now(),                         //Date time of message
                "",
                PACS_CONFIG.ORM_O01,                //Message Type 
                "6423",                             //MessageID 
                "P",
                PACS_CONFIG.Version                 //HL7 Message Version
            );

            orm.addSegment("PID",
                1,
                patient.HIS_PatientId,              //Patient ID (HIS ID)
                patient.mrn, //MRN
                "",
                patient.name,                         //Name
                "",
                Utility.getHL7Date(new Date(patient.dob)),                                                        //DOB
                PACS_CONFIG.GenderConstant[patient.GenderCode],                            //Gender (F/M/O/U)
                "",
                Utility.checkValidField(patient.RaceID),                                                                 //Race Code
                [
                    patient.residentialAddress,
                    "",
                    patient.residentialCity,
                    patient.residentialState,
                    patient.residentialPostCode,
                    patient.residentialCountry
                ],                                                                  //Address
                Utility.checkValidField(patient.residentialCountry),                       //Country Code
                [patient.mobile],
                "",
                "",
                Utility.checkValidField(patient.maritalStatus),                 //Marital status Code
                Utility.checkValidField(patient.religion),                      //Religion Code
                "", "", "", "", "", "", "", "", "", "",
                (record) ? Utility.checkValidField(record.Description) : ""                    //Nationality Code
            );

            orm.addSegment("PV1",
                1,               //Visit ID (HIS ID)
                (visit.patientType == "IP") ? "I" : "O",              //Patient Type (OP or IP)
                [Utility.checkValidField(visit.location), Utility.checkValidField(visit.room)],
                "",                             //Admission Type
                "",
                "",
                "", "", "", "", "", "", "",
                "",
                "", "",
                [visit.HIS_Doctor_ID, visit.careProvider],
                "",
                visit.visitNo,                  //Visit No
                "",
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                Utility.getHL7Date(new Date(visit.visitDate))                 //Admission Date time
            );

            orm.addSegment("ORC",
                orderStatus,       //Type
                order.orderItems.OrderNo,      //Order No (change 1025 to orderID from HIS)
                "", "", "", "", "", "", "",
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Enter By (change 1 to Doctor HIS ID) 
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Verified By (change 1 to Doctor HIS ID)
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Ordering By (change 1 to Doctor HIS ID)
                "", "",
                Utility.getHL7Date(new Date(order.orderDate)),
                "", "", "", "", "",
                [order.clinicalDepartment]
            );

            orm.addSegment("OBR",
                0,
                order.orderItems.OrderNo,       //Order No (change 1025 to orderID from HIS)
                "",
                [order.orderItems.code, order.orderItems.imagingProcedure],     //Service Details (Change 10 to Service ID)
                order.orderItems.urgency,
                Utility.getHL7Date(new Date(order.orderItems.requestedDate)),
                "", "", "", "", "", "", "", "", "",
                [visit.HIS_Doctor_ID, order.orderingDoctorName],    //Ordering By (change 1 to Doctor HIS ID)
                "", "", "", "", "", "", "",
                ["DX", order.orderItems.imagingProcedure],
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                [order.orderItems.code, order.orderItems.imagingProcedure],     //Procedure Details (Change 10 to Imaging procedure ID)
                order.orderItems.modifier
            );

            var data = orm.log()
            sendToQueue(PACS_CONFIG.ORM_O01[1], PACS_CONFIG.ORM_O01[0], data, rabbitMQLogID)
            console.log("Order Message has been sent");
            if (order.orderStatus != "cancelled") {
                sendBillingFlag(patient, visit, order, rabbitMQLogID);
            }
        }
    })
}

function sendADTMessage(patient, visit, cb = function () { }) {
    var event = (visit.patientType === "IP") ? PACS_CONFIG.ADT_A01 : PACS_CONFIG.ADT_A04;
    storeImagingLog("Outgoing", event, patient.mrn, visit.OPD_IPD_ID, (err, success) => {
        if (err) {
            return;
            cb(false);
        } else {
            try {
                Message.SendMessage(event, success.messageNo, patient._id, visit._id, (status) => {
                    if (status) {
                        cb(true);
                    } else
                        cb(false);
                });
            } catch (e) {
                console.log("[HL7 Message] " + e);
                cb(false);
            }
        }
    })
}

function sendBillingFlag(patient, visit, order, rabbitMQLogID) {
    console.log("-------------------> In send billing flag")
    MasterModel.m_nationality.findOne({ ID: patient.NationalityID }, (err, record) => {
        if (err)
            log("Error: " + err)
        else {
            var orderStatus = "NW";
            orderStatus = (order.orderStatus === "cancelled") ? "CA" : "NW";

            var orm = new hl7.Message(
                PACS_CONFIG.Sending_App,            //Sending App
                "",
                PACS_CONFIG.Receiving_App,          //Receiving App
                "",
                Date.now(),                         //Date time of message
                "",
                PACS_CONFIG.ORM_O01,                //Message Type 
                "6423",                             //MessageID 
                "P",
                PACS_CONFIG.Version                 //HL7 Message Version
            );

            orm.addSegment("PID",
                1,
                patient.HIS_PatientId,              //Patient ID (HIS ID)
                patient.mrn, //MRN
                "",
                patient.name,                         //Name
                "",
                Utility.getHL7Date(new Date(patient.dob)),                                                        //DOB
                PACS_CONFIG.GenderConstant[patient.GenderCode],                            //Gender (F/M/O/U)
                "",
                Utility.checkValidField(patient.RaceID),                                                                 //Race Code
                [
                    patient.residentialAddress,
                    "",
                    patient.residentialCity,
                    patient.residentialState,
                    patient.residentialPostCode,
                    patient.residentialCountry
                ],                                                                  //Address
                Utility.checkValidField(patient.residentialCountry),                       //Country Code
                [patient.mobile],
                "",
                "",
                Utility.checkValidField(patient.maritalStatus),                 //Marital status Code
                Utility.checkValidField(patient.religion),                      //Religion Code
                "", "", "", "", "", "", "", "", "", "",
                (record) ? Utility.checkValidField(record.Description) : ""                   //Nationality Code
            );

            orm.addSegment("PV1",
                1,               //Visit ID (HIS ID)
                (visit.patientType == "IP") ? "I" : "O",              //Patient Type (OP or IP)
                [Utility.checkValidField(visit.location), Utility.checkValidField(visit.room)],
                "",                             //Admission Type
                "",
                "",
                "", "", "", "", "", "", "",
                "",
                "", "",
                [visit.HIS_Doctor_ID, visit.careProvider],
                "",
                visit.visitNo,                  //Visit No
                "",
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                Utility.getHL7Date(new Date(visit.visitDate))                 //Admission Date time
            );

            orm.addSegment("ORC",
                'XO',       //Type
                order.orderItems.OrderNo,      //Order No (change 1025 to orderID from HIS)
                "", "", "", "", "", "", "",
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Enter By (change 1 to Doctor HIS ID) 
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Verified By (change 1 to Doctor HIS ID)
                [visit.HIS_Doctor_ID, order.orderingDoctorName],   //Ordering By (change 1 to Doctor HIS ID)
                "", "",
                Utility.getHL7Date(new Date(order.orderDate)),
                "", "", "", "", "",
                [order.clinicalDepartment]
            );

            orm.addSegment("OBR",
                0,
                order.orderItems.OrderNo,       //Order No (change 1025 to orderID from HIS)
                "",
                [order.orderItems.code, order.orderItems.imagingProcedure, 'N'],     //Service Details (Change 10 to Service ID)
                order.orderItems.urgency,
                Utility.getHL7Date(new Date(order.orderItems.requestedDate)),
                "", "", "", "", "", "", "", "", "",
                [visit.HIS_Doctor_ID, order.orderingDoctorName],    //Ordering By (change 1 to Doctor HIS ID)
                "", "", "", "", "", "", "",
                [order.orderItems.ModalityCode, order.orderItems.imagingProcedure],
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                [order.orderItems.code, order.orderItems.imagingProcedure],     //Procedure Details (Change 10 to Imaging procedure ID)
                order.orderItems.modifier
            );

            var data = orm.log()
            sendToQueue(PACS_CONFIG.ORM_O01[1], PACS_CONFIG.ORM_O01[0], data, rabbitMQLogID, (status) => {
                if (status)
                    console.log("Billing Message has been sent");
            })
        }
    })
}

module.exports.IncomingPACSMessages = function (observation, rabbitMQLogID) {
    let parser = new hl7.Parser();
    let result = observation.content.toString();
    console.log("Result: ---->    " + result);
    let msg = parser.parse(result);

    if (typeof msg.getSegment("ORC") !== 'undefined') {
        console.log("Acknowledgment Message");
        getAcknowledgment(msg, rabbitMQLogID);
    } else if (typeof msg.getSegment("OBR") !== 'undefined' && typeof msg.getSegment("OBX") !== 'undefined') {
        console.log("Observation Message");
        getObservation(msg, rabbitMQLogID)
    }
}

module.exports.GetOrderDetails = function (req, res) {
    let accessionNo = req.params.accessionNo;
    CpoeModel.CpoeOrder.findOne({
        "orderCategory": "Imaging Order",
        'orderItems.OrderNo': accessionNo
    }, (err, result) => {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else if (result)
            return res.json(Utility.output("", 'SUCCESS', result));
        else
            return res.json(Utility.output("Order not found", 'ERROR'));
    })
}

function getObservation(msg, rabbitMQLogID) {

    let orderNo = msg.getSegment("OBR").getField(2);
    CpoeModel.CpoeOrder.findOne({
        "orderCategory": "Imaging Order",
        'orderItems.OrderNo': orderNo
    }, (err, success) => {
        if (err) {
            console.log("Error Occured")
        } else if (!success) {
            console.log("Order Not found: ");
        } else {
            console.log("Order found: ");
            let imaging_result = new ResultModel.R_Imaging();
            imaging_result.OrderNo = orderNo;
            imaging_result.patientId = success.patientId;
            imaging_result.visitId = success.visitId;
            imaging_result.orderId = success._id;
            imaging_result.Result_Message = msg.log();
            let _resultDate = msg.getSegment("OBR").getField(7);
            imaging_result.Observation_date = new Date(
                _resultDate.substr(0, 4) + "-" +
                _resultDate.substr(4, 2) + "-" +
                _resultDate.substr(6, 2) + "T" +
                _resultDate.substr(8, 2) + ":" +
                _resultDate.substr(10, 2) + ":" +
                _resultDate.substr(12, 2) + "Z"
            );

            //console.log("++++++>>> " + msg.header.getComponent(7, 1))

            imaging_result.Observation_by = msg.getSegment("OBX").getComponent(16, 1);
            imaging_result.Observation = "";
            for (let i = 0; i < msg.segments.length; i++) {
                if (msg.segments[i].name === 'OBX') {
                    imaging_result.Observation += msg.segments[i].getField(5) + "\n";
                }
            }

            imaging_result.save((err, saved) => {
                if (err) {
                    console.log("Error in save Result: " + JSON.stringify(err))
                    updatePacsMsgStatus(rabbitMQLogID, {
                        status: false,
                        MessageType: msg.header.getComponent(7, 1),
                        Operation: msg.header.getComponent(7, 2),
                        errorMessage: err,
                        data: msg.log()
                    })
                } else {
                    console.log("Imaging Result saved: ")
                    success.orderStatus = "completed";
                    success.save((err, done) => {
                        if (err)
                            console.log("Error occured: " + err);
                        else {
                            console.log("Imaging Result Status updated ")
                            new ResultModel.CPOE_Results({
                                CPOE_Category: "Imaging",
                                Result_Collection: ResultModel.R_Imaging.collection.collectionName,
                                CPOE_OrderId: success._id,
                                patientId: success.patientId,
                                visitId: success.visitId
                            }).save((err) => {
                                if (err)
                                    console.log("Error while updating common result: " + err);
                                else {
                                    console.log("Updated common result");
                                }
                            })
                        }
                    })

                    updatePacsMsgStatus(rabbitMQLogID, {
                        status: true,
                        MessageType: msg.header.getComponent(7, 1),
                        Operation: msg.header.getComponent(7, 2),
                        errorMessage: null,
                        data: msg.log()
                    })
                }
            })
        }
    })
}

function getAcknowledgment(msg, rabbitMQLogID) {
    let orderNo = msg.getSegment("OBR").getField(2);
    let status = msg.getSegment("ORC").getField(5);

    //console.log("Orderno: "+orderNo+"   Status of Order: "+PACS_CONFIG.OrderStatus[staus]);

    var updates = {
        'orderStatus': PACS_CONFIG.OrderStatus[status]
    }

    if (status === 'A') {
        updates['canCancel'] = false;
        updates['canEdit'] = false;
        updates['canDiscontinue'] = false;
    }

    CpoeModel.CpoeOrder.findOneAndUpdate({
        "orderCategory": "Imaging Order",
        'orderItems.OrderNo': orderNo
    }, updates, (err, success) => {
        if (err) {
            console.log("Error occured: " + err)
        } else {
            //console.log("Record Updated"+success)
            updatePacsMsgStatus(rabbitMQLogID, {
                status: true,
                MessageType: msg.header.getComponent(7, 1),
                Operation: msg.header.getComponent(7, 2),
                errorMessage: err,
                data: msg.log()
            })
        }
    })
}

function sendToQueue(key, q, data, LogID, cb = function () { }) {
    try {
        amqp.connect(connectionString, function (err, connection) {
            if (err) {
                console.log('Check Error Message: ' + err.message)
                updatePacsMsgStatus(LogID, {
                    status: false,
                    MessageType: q,
                    Operation: key,
                    errorMessage: err,
                    data: data
                });
                cb(false);
            } else {
                connection.createChannel(function (err, ch) {
                    if (err) {
                        console.log('Check Error Message: ' + err.message)
                        updatePacsMsgStatus(LogID, {
                            status: false,
                            MessageType: q,
                            Operation: key,
                            errorMessage: err,
                            data: data
                        });
                        cb(false);
                    } else {
                        var ex = 'PACS_Test';
                        ch.publish(ex, 'Outgoing', new Buffer(data), { deliveryMode: true, confirm: true, noAck: false });
                        if (LogID)
                            updatePacsMsgStatus(LogID, {
                                status: true,
                                MessageType: q,
                                Operation: key,
                                errorMessage: null,
                                data: data
                            });
                        cb(true);
                    }
                })
            }
        })
    } catch (e) {
        console.log('Check Cached: ' + err.message)
        updatePacsMsgStatus(rabbitMQLogID, false, err.message);
        cb(false);
    }
}

module.exports.getImagingResult = function (req, res) {

    let query = {
        'orderCategory': "Imaging Order",
        'orderItems.cpoeOrderId': req.params.id,
        'visitId': req.query['visitId']
    }

    CpoeModel.CpoeOrder.aggregate([
        {
            $match: query
        }, {
            $lookup: {
                from: "results_imagings",
                localField: "orderItems.OrderNo",
                foreignField: "OrderNo",
                as: "imagingResult"
            }
        }, {
            $lookup: {
                from: "User",
                localField: "userId",
                foreignField: "userId",
                as: "DoctorDetails"
            }
        }, {
            $lookup: {
                from: "patients",
                localField: "patientId",
                foreignField: "_id",
                as: "patientDetails"
            }
        }, {
            $unwind: { path: "$imagingResult", preserveNullAndEmptyArrays: true }
        }, {
            $unwind: { path: "$DoctorDetails", preserveNullAndEmptyArrays: true }
        }, {
            $unwind: { path: "$patientDetails", preserveNullAndEmptyArrays: true }
        }, {
            $project: {
                "orderName": 1,
                "orderDate": 1,
                "orderItems": 1,
                "orderStatus": 1,
                "orderingDoctorName": 1,
                "ImagingResult": {
                    "OrderNo": "$imagingResult.OrderNo",
                    "Observation": "$imagingResult.Observation",
                    "Observation_by": "$imagingResult.Observation_by",
                    "Observation_date": "$imagingResult.Observation_date",
                    "ImagingUrl": PACS_CONFIG.ImagingURL + "$imagingResult.OrderNo"
                },
                "PatientDetails": {
                    "Name": "$patientDetails.name",
                    "Gender": "$patientDetails.gender"
                },
                "DoctorDetails": {
                    "Name": "$DoctorDetails.firstName"
                }
            }
        }
    ], (err, success) => {
        if (err)
            res.json(Utility.output("Error while getting Result", "ERROR"))
        else {
            success[0].ImagingResult.ImagingUrl = PACS_CONFIG.ImagingURL + success[0].ImagingResult.OrderNo;
            res.json(Utility.output("Done", "SUCCESS", success))
        }
    })

}

module.exports.getImagingOrderList = function (req, res) {
    let query = {
        'orderCategory': "Imaging Order",
        "visitId": req.query['visitId']
    }

    if (req.query['orderStatus'] === "completed")
        query["orderStatus"] = "completed";

    CpoeModel.CpoeOrder.find(query, (err, success) => {
        if (err)
            res.json(Utility.output("Error while getting Result", "ERROR"))
        else
            res.json(Utility.output("Done", "SUCCESS", success))
    })
}

module.exports.sendToQueue2 = sendToQueue;
