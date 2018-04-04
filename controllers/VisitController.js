
let dbModel = require('../models/db_model');
let documentObject = document.domainModel;
let cpoeDocument = document.cpoeDataModel;
let MasterDocument = document.mastersModel;
let async = require('async');
let _ = require("underscore");
let winston = require('winston')
let mkdirp = require('mkdirp')
let fs = require('fs');
let SQL_CONFIG = require('config').get('HISDB');
var sql = require("mssql");
let integrationModel = require('../models/integrationAmqp');
let hl7model = require('../models/hl7-messages');
let notificationModel = require('../models/notification_model');

let regExp = /\(([^)]+)\)/

let dbConn = {
    server: SQL_CONFIG.server,
    database: SQL_CONFIG.database,
    user: SQL_CONFIG.user,
    password: SQL_CONFIG.password,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 200,
        min: 10,
        acquireTimeoutMills: 15000,
        idleTimeoutMillis: 60000
    }
};

var C_logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'logs/CronExecution.log' })
    ]
});

module.exports.Bedrelease = function (payload, rabbitmqId) {
    let data = JSON.parse(payload);
    log("Data Comes: BedRelease")
    data.BizActionObj.BedList.forEach(element => {

        var Discharge_Date = regExp.exec(element.AddedDateTime)

        documentObject.Visit.findOneAndUpdate(
            { OPD_IPD: 1, OPD_IPD_ID: element.AdmID },
            { $set: { isDischarged: "true", dischargeDateTime: Discharge_Date[1], isActive: "false" } },
            function (err, success) {
                if (err) {
                    log("Status not updated: " + err);
                    integrationModel.updateLogStatus(rabbitmqId, "ERROR", err);
                } else {
                    //log("Status is updated: " + JSON.stringify(success));
                    cpoeDocument.CpoeOrder.update(
                        { visitId: success._id, 'orderItems.isDischargeMedication': false, orderStatus: "active" },
                        { orderStatus: "completed" },
                        { multi: true },
                        function (err, OrderUpdate) {
                            if (err) {
                                log("Error while updating order status: " + err)
                                integrationModel.updateLogStatus(rabbitmqId, "ERROR", err);
                            } else {
                                documentObject.Medication.update(
                                    { visitId: success._id, 'orderItems.isDischargeMedication': false, status: "active" },
                                    { status: "completed" },
                                    { multi: true },
                                    function (err, MedicationUpdate) {
                                        if (err) {
                                            log("Error while updating Medication status: " + err)
                                            integrationModel.updateLogStatus(rabbitmqId, "ERROR", err);
                                        } else {
                                            log("All updation completed.")
                                            integrationModel.updateLogStatus(rabbitmqId, "SUCCESS", null);
                                        }
                                    })
                            }
                        })
                }
            })
    });
    cpoeDocument.CpoeOrder
}

module.exports.CancelVisit = function (payload, rabbitmqId) {
    let data = JSON.parse(payload);
    let OPD_IPD = (data.BizActionObj.IsopdIpd) ? 1 : 0;
    documentObject.Visit.findOneAndUpdate(
        { OPD_IPD_ID: data.BizActionObj.VisitID, OPD_IPD: OPD_IPD },
        {
            $set: { isActive: "false", IsCancel: true }
        },
        function (err, updated) {
            if (err) {
                integrationModel.updateLogStatus(rabbitmqId, "ERROR", err);
                log("Error while processing request" + err);
            }
            else {
                log("Visit Cancellation status Updated");
                integrationModel.updateLogStatus(rabbitmqId, "SUCCESS", null);
            }
        }
    )
}

module.exports.AddRegistration = function (opdData, rabbitMQLogID, cb = function () { }) {
    try {
        let data = JSON.parse(opdData);
        AddUpdatePatient(data, (err, success) => {
            if (err) {
                console.log("[Patient Registration] " + err)
                integrationModel.updateLogStatus(rabbitMQLogID, 'ERROR', err);
            } else if (success) {
                if (data.BizActionObj.IsRegisterOnly) {
                    //Send Message to PACS if required.
                    integrationModel.updateLogStatus(rabbitMQLogID, 'SUCCESS', null);
                } else {
                    AddUpdateVisit(data, success._id, (err, done) => {
                        if (err) {
                            console.log("[Visit Creation] " + err)
                            integrationModel.updateLogStatus(rabbitMQLogID, 'ERROR', err);
                        } else {
                            registerPatientVisitRecord(success._id, done._id);
                            hl7model.ConstructMessage(success, done);
                            integrationModel.updateLogStatus(rabbitMQLogID, 'SUCCESS', null);
                        }
                    })
                }
            } else {
                console.log("[Patient Registration] Patient Record not created");
                integrationModel.updateLogStatus(rabbitMQLogID, 'ERROR', "[Patient Registration] Patient Record not created");
            }
        })
    } catch (e) {
        integrationModel.updateLogStatus(rabbitMQLogID, 'ERROR', e);
        cb(e, null)
    }
}

module.exports.transferAdmission = function (payload, rabbitmqId) {
    console.log("Transfer Bed updated");
    let data = JSON.parse(payload);
    documentObject.Visit.findOne({
        OPD_IPD_ID: parseInt(data.BizActionObj.BedDetails.AdmID),
        visitNo: data.BizActionObj.BedDetails.IPDNo
    }, function (err, visit) {
        if (err)
            console.log("Error occured: " + err)
        else if (!visit)
            console.log("Visit not found")
        else {
            MasterDocument.bedMaster.findOne({ ID: parseInt(data.BizActionObj.BedDetails.ToBedID) }, (err, bed) => {
                if (err)
                    console.log("Error in finding bed: " + err);
                else {
                    MasterDocument.m_wards.findOne({ ID: parseInt(data.BizActionObj.BedDetails.WardID) }, (err, ward) => {
                        if (err)
                            console.log("Error in finding ward: " + err)
                        else {
                            var transferDate = regExp.exec(data.BizActionObj.BedDetails.ToDate)
                            let newBedInfo = {
                                bedId: bed.ID,
                                bedNo: bed.Description,
                                wardName: ward.Description,
                                WardID: ward.ID,
                                FromBedId: visit.BedInformation.bedId,
                                FromBed: visit.BedInformation.bedNo,
                                FromWardId: visit.BedInformation.WardID,
                                FromWard: visit.BedInformation.wardName,
                                transferDate: (document.isFieldFilled(transferDate)) ? transferDate[1] : '',
                                location: ward.Description
                            }
                            visit.IsTransfer = true;
                            visit.BedInformation = Object.assign(visit.BedInformation, newBedInfo);
                            visit.searchBox = Object.assign(visit.searchBox, newBedInfo);
                            visit.transferHistory.push(visit.BedInformation);
                            visit.save((err, Updated) => {
                                if (err)
                                    console.log("Visit record not updated: " + err)
                                else {
                                    console.log("Visit Updated");
                                }
                            })

                        }
                    });
                }
            })
        }
    })
}

function AddUpdatePatient(data, callback) {
    var patientSave = {};
    patientSave.HIS_PatientId = data.BizActionObj.PatientDetails.GeneralDetails.PatientID
    patientSave.name = (data.BizActionObj.PatientDetails.FirstName != "") ? data.BizActionObj.PatientDetails.FirstName : "Unknown";
    patientSave.prefix = data.BizActionObj.PatientDetails.Prefix
    patientSave.PrefixId = data.BizActionObj.PatientDetails.PrefixId
    patientSave.gender = data.BizActionObj.PatientDetails.Gender
    patientSave.GenderCode = data.BizActionObj.PatientDetails.GenderID
    patientSave.RaceID = data.BizActionObj.PatientDetails.RaceID

    log(`RaceID: ${data.BizActionObj.PatientDetails.RaceID}`)

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

    documentObject.Patient.findOne({ HIS_PatientId: patientSave.HIS_PatientId }, (err, done) => {
        if (err)
            callback("[MongoDB] Error while processing request");
        else if (!done) {
            let patientId = uuid.v4();
            let newPatient = new documentObject.Patient(patientSave);
            newPatient._id = patientId;
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
            newPatient.save(callback);
        } else {
            let patientId = done._id;
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
            done = Object.assign(done, patientSave);
            done.save(callback);
        }
    })
}

function AddUpdateVisit(data, patientId, callback) {
    try {
        if (!document.isFieldFilled(data.BizActionObj.PatientAdmissionDetails) &&
            !document.isFieldFilled(data.BizActionObj.PatientVisitDetails)) {
            callback("ObjectError", null)
        }
        else {
            var doctorId = (data.BizActionObj.IsIPDAdmission) ? data.BizActionObj.PatientAdmissionDetails.Details.DoctorID : data.BizActionObj.PatientVisitDetails.VisitDetails.DoctorID;
            documentObject.User.findOne({ hisUserId: doctorId }, function (err, done) {
                if (err) {
                    callback(err, null)
                } else if (!done) {
                    callback("Doctor Not Found", null)
                } else {
                    parseVisitData(data, function (visit) {
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
                                documentObject.Visit.findOneAndUpdate({ _id: previousVisit._id }, visit, callback);
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

function parseVisitData(data, callback) {
    var visitToSave = {
        kinInfo: [],
        payeeInfo: [],
        transferHistory: []
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
        //visitToSave.location = data.BizActionObj.PatientVisitDetails.VisitDetails.Cabin
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
                IsGurantor: data.BizActionObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].IsGurantor,
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
        //visitToSave.location = data.BizActionObj.PatientAdmissionDetails.Details.Ward
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
            //roomNo: data.BizActionObj.PatientAdmissionDetails.Details.RoomCode,
            bedNo: data.BizActionObj.PatientAdmissionDetails.Details.BedDescription,
            bedId: data.BizActionObj.PatientAdmissionDetails.Details.BedID,
            mrn: data.BizActionObj.PatientDetails.GeneralDetails.MRNo,
            name: data.BizActionObj.PatientDetails.FirstName
        }
        var bed = {
            WardID: data.BizActionObj.PatientAdmissionDetails.Details.WardID,
            admittingDoctor: data.BizActionObj.PatientAdmissionDetails.Details.DoctorName,
            admittingDepartment: data.BizActionObj.PatientAdmissionDetails.Details.DepartmentID,
            admissionType: data.BizActionObj.PatientAdmissionDetails.Details.AdmissionTypeID,
            wardName: data.BizActionObj.PatientAdmissionDetails.Details.Ward,
            //roomNo: data.BizActionObj.PatientAdmissionDetails.Details.RoomCode,
            bedNo: data.BizActionObj.PatientAdmissionDetails.Details.BedDescription,
            bedId: data.BizActionObj.PatientAdmissionDetails.Details.BedID,
            admissionDate: (document.isFieldFilled(visitDate)) ? visitDate[1] : '',
            IsActive: true
        }
        visitToSave.BedInformation = bed;
        visitToSave.transferHistory.push(bed);
        visitToSave.searchBox = searchData;

        for (kinInfo in data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList) {
            var kinInfoObj = {
                name: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinName,
                IsGurantor: data.BizActionObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].IsGurantor,
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

module.exports.SyncVisits = async function (visitList) {
    var OPD_IPD = await _.groupBy(visitList, (obj) => {
        return obj.OPD_IPD
    });

    if (Array.isArray(OPD_IPD["0"]) && OPD_IPD["0"].length > 0) {
        console.log("OPD Patient: " + JSON.stringify(OPD_IPD["0"]));
        syncOPVisit(OPD_IPD["0"]);
    }

    if (Array.isArray(OPD_IPD["1"]) && OPD_IPD["1"].length > 0) {
        console.log("OPD Patient: " + JSON.stringify(OPD_IPD["1"]));
        syncIPVisit(OPD_IPD["1"]);
    }
}

function syncOPVisit(VisitList) {
    let OPD_IPD_ID = [];
    VisitList.forEach(element => {
        OPD_IPD_ID.push(element.OPD_IPD_ID)
        C_logger.info("OPD VISIT ID: " + element.OPD_IPD_ID);
    });

    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query(`select        
        dbo.DecodeUTF8EncodedString( T_Registration.FirstName) as name,
        T_Registration.DateOfBirth as DateOfBirth,
        T_Registration.MRNo as mrn,
        T_Registration.UnitID as unitId,
        T_Registration.RegistrationDate as RegistrationDate,
        T_Registration.GenderID as GenderCode,
        T_Registration.ID as HIS_PatientId,
        T_Registration.MobileNo as mobile,
        T_Registration.PrefixID as prefix,
        
        dbo.DecodeUTF8EncodedString(T_Registration_Details.CivilID) as nric,
        T_Registration_Details.MaritalStatusID as maritalStatus,
        T_Registration_Details.ReligionID as religion,
        T_Registration_Details.NationalityID as nationality,
        T_Registration_Details.OccupationId as Occupation,
        T_Registration_Details.Email as emailId,
        T_Registration_Details.PassportNo as passportNo,
        dbo.DecodeUTF8EncodedString(T_Registration_Details.ResAddress) as residentialAddress,
        T_Registration_Details.ResStateID as residentialState,
        T_Registration_Details.ResCityID as residentialCity,
        T_Registration_Details.ResCountryID as residentialCountry,
        T_Registration_Details.ResPinCode as residentialPostCode,

		M_GenderMaster.Description as gender,
        
        T_Visit.ID as OPD_IPD_ID,
        T_Visit.Date as VISITDate,

        T_Visit.OPDNO as visitNo,
        T_Visit.DepartmentID as DepartmentID,
        T_Visit.PatientType as patientType,
        T_Visit_Details.CabinID as CabinID,

        T_Visit.DoctorID as HIS_Doctor_ID,
        T_Visit_Details.VisitTypeID as VisitTypeID,

		M_CabinMaster.Description as clinicName,
		M_DepartmentMaster.Description as clinicalDepartment,
		M_DoctorMaster.FirstName as primaryDoctor,
        
        T_Sponsor.ID as payeeInfoId,
        T_Sponsor.OPD_IPD as OPD_IPD,
        T_Sponsor.PatientCategoryID as patientCatID,
        T_Sponsor.CompanyID as CompanyID,
        T_Sponsor.TariffID as tariffID,
        T_Sponsor.PriorityID as PriorityID,

		M_CompanyMaster.Description as companyName,
        M_CompanyMaster.CompanyTypeId as companyCode,
		M_TariffMaster.Description as tariff,
		M_PatientCategoryMaster.Description as patientCategory,

        T_patient_KinDetails.ID as kinId,
        T_patient_KinDetails.KinName as kinName,
        T_patient_KinDetails.KinRelationId as kinRelationID,
        T_patient_KinDetails.KinAddress as kinaddress,
        T_patient_KinDetails.KinMobileNo as kinmobile,
        T_patient_KinDetails.KinOccupationID as kinoccupationID,
		M_RelationMaster.Description as kinRelation
        
        from T_Visit 
        inner join T_sponsor on T_Visit.ID = T_Sponsor.VisitAdmissionID and T_Sponsor.OPD_IPD = 0
        inner join T_Registration on T_Visit.PatientID = T_Registration.ID 
        inner join T_Visit_Details on T_Visit.ID =T_Visit_Details.ID
        inner join T_Registration_Details on T_Registration.ID =T_Registration_Details.ID
        left join T_patient_KinDetails on T_Visit.ID = T_patient_KinDetails.Opd_Ipd_Id and T_patient_KinDetails.OPD_IPD = 0
		left join M_GenderMaster on M_GenderMaster.ID = T_Registration.GenderID
		left join M_CabinMaster on M_CabinMaster.ID = T_Visit_Details.CabinID
		left join M_DepartmentMaster on M_DepartmentMaster.ID = T_Visit.DepartmentID
		left join M_DoctorMaster on M_DoctorMaster.ID = T_Visit.DoctorID
        left join M_RelationMaster on M_RelationMaster.ID=T_patient_KinDetails.KinRelationId
		left join M_CompanyMaster on M_CompanyMaster.ID=T_Sponsor.CompanyID
		left join M_TariffMaster on M_TariffMaster.ID=T_Sponsor.TariffID
        left join M_PatientCategoryMaster on M_PatientCategoryMaster.ID=T_Sponsor.PatientCategoryID
        where T_Visit.id in (${OPD_IPD_ID})`,
            (err, result) => {
                if (err) {
                    log("Error: " + err)
                } else {
                    log("Table Syncing Start")
                    async.eachSeries(result.recordset, function (record, asyncCallback) {
                        SchedularPatient(record, (err, patientId) => {
                            if (err) {
                                log("ERROR in Registor callback: " + err)
                                asyncCallback(err)
                            } else {
                                log("PatientID: " + patientId._id);
                                SchedulerVisit(record, patientId, (err, visitID) => {
                                    if (err) {
                                        asyncCallback(err)
                                    } else {
                                        let update_request = new sql.Request(conn);
                                        update_request.query(`update T_Registration_Integration
                                        set status=1
                                        where OPD_IPD_ID=${record.OPD_IPD_ID} and OPD_IPD=${record.OPD_IPD}`, (err, result) => {
                                                if (err) {
                                                    console.log("Status is not updated: " + err)
                                                    asyncCallback()
                                                } else {
                                                    console.log("Status is updated: ")
                                                    asyncCallback()
                                                }
                                            })
                                        log("VisitID: " + visitID._id)
                                    }
                                })
                            }
                        })
                    }, function (err) {
                        if (err) {
                            log("Big Error Occured" + err);
                        } else {
                            log("Task Completed");
                        }
                    })
                }
            })
    })
}

function syncIPVisit(VisitList) {
    let OPD_IPD_ID = [];
    VisitList.forEach(element => {
        OPD_IPD_ID.push(element.OPD_IPD_ID)
        C_logger.info("IPD VISIT ID: " + element.OPD_IPD_ID);
    });

    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query(`select 
        dbo.DecodeUTF8EncodedString( T_Registration.FirstName) as name,
        T_Registration.DateOfBirth as DateOfBirth,
        T_Registration.MRNo as mrn,
        T_Registration.UnitID as unitId,
        T_Registration.RegistrationDate as RegistrationDate,
        T_Registration.GenderID as GenderCode,
        T_Registration.ID as HIS_PatientId,
        T_Registration.MobileNo as mobile,
        T_Registration.PrefixID as prefix,
        
        dbo.DecodeUTF8EncodedString(T_Registration_Details.CivilID) as nric,
        T_Registration_Details.MaritalStatusID as maritalStatus,
        T_Registration_Details.ReligionID as religion,
        T_Registration_Details.NationalityID as nationality,
        T_Registration_Details.OccupationId as Occupation,
        T_Registration_Details.Email as emailId,
        T_Registration_Details.PassportNo as passportNo,
        dbo.DecodeUTF8EncodedString(T_Registration_Details.ResAddress) as residentialAddress,
        T_Registration_Details.ResStateID as residentialState,
        T_Registration_Details.ResCityID as residentialCity,
        T_Registration_Details.ResCountryID as residentialCountry,
        T_Registration_Details.ResPinCode as residentialPostCode,

		M_GenderMaster.Description as gender,

        T_Admission.ID as OPD_IPD_ID,
        T_Admission.Date as VISITDate,

        T_Admission.IPDNO as visitNo,
        T_Admission.DepartmentID as DepartmentID,
        --T_Visit.PatientType as patientType,
        T_AdmissionDetails.BedID as bedID,
		M_AdmissionType.Description as admissionType,

        T_Admission.DoctorID as HIS_Doctor_ID,
        --T_Visit_Details.VisitTypeID as VisitTypeID,
		M_BedMaster.Description as BedDescription,
		M_WardMaster.ID as WardID,
		M_WardMaster.Description as Ward,
		M_RoomMaster.Description as room,
		--M_CabinMaster.Description as clinicName,
		M_DepartmentMaster.Description as clinicalDepartment,
		M_DoctorMaster.FirstName as primaryDoctor,
        
		T_Sponsor.ID as payeeInfoId,
        T_Sponsor.OPD_IPD as OPD_IPD,
        T_Sponsor.PatientCategoryID as patientCatID,
        T_Sponsor.CompanyID as CompanyID,
        T_Sponsor.TariffID as tariffID,
        T_Sponsor.PriorityID as PriorityID,

		M_CompanyMaster.Description as companyName,
        M_CompanyMaster.CompanyTypeId as companyCode,
		M_TariffMaster.Description as tariff,
		M_PatientCategoryMaster.Description as patientCategory,

		T_patient_KinDetails.ID as kinId,
        T_patient_KinDetails.KinName as kinName,
        T_patient_KinDetails.KinRelationId as kinRelationID,
        T_patient_KinDetails.KinAddress as kinaddress,
        T_patient_KinDetails.KinMobileNo as kinmobile,
        T_patient_KinDetails.KinOccupationID as kinoccupationID,
		M_RelationMaster.Description as kinRelation
        
        from T_Admission 
        inner join T_sponsor on T_Admission.ID = T_Sponsor.VisitAdmissionID and T_Sponsor.OPD_IPD = 1
        inner join T_Registration on T_Admission.PatientID = T_Registration.ID 
        inner join T_AdmissionDetails on T_Admission.ID =T_AdmissionDetails.ID
		left join M_GenderMaster on M_GenderMaster.ID = T_Registration.GenderID
		left join M_BedMaster on M_BedMaster.ID = T_AdmissionDetails.BedID
		left join M_WardMaster on M_WardMaster.ID = M_BedMaster.WardId
		left join M_DepartmentMaster on M_DepartmentMaster.ID = T_Admission.DepartmentID
		left join M_DoctorMaster on M_DoctorMaster.ID = T_Admission.DoctorID
        inner join T_Registration_Details on T_Registration.ID =T_Registration_Details.ID
        left join T_patient_KinDetails on T_Admission.ID = T_patient_KinDetails.Opd_Ipd_Id and T_patient_KinDetails.OPD_IPD = 1
		left join M_RelationMaster on M_RelationMaster.ID=T_patient_KinDetails.KinRelationId
		left join M_CompanyMaster on M_CompanyMaster.ID=T_Sponsor.CompanyID
		left join M_TariffMaster on M_TariffMaster.ID=T_Sponsor.TariffID
		left join M_RoomMaster on M_RoomMaster.ID = M_BedMaster.RoomId
		left join M_AdmissionType on M_AdmissionType.ID = T_AdmissionDetails.AdmissionType
        left join M_PatientCategoryMaster on M_PatientCategoryMaster.ID=T_Sponsor.PatientCategoryID
        where OPD_IPD_ID in (${OPD_IPD_ID})`,
            (err, result) => {
                if (err) {
                    log("Error: " + err)
                } else {
                    console.log("Table Syncing Start: " + result.recordset.length)
                    async.eachSeries(result.recordset, function (record, asyncCallback) {
                        SchedularPatient(record, (err, patientId) => {
                            if (err) {
                                asyncCallback(err)
                            } else {
                                log("PatientID: " + patientId._id);
                                SchedulerVisit(record, patientId, (err, visitID) => {
                                    if (err) {
                                        //log("Error in Visit Callback: " + err)
                                        asyncCallback(err)
                                    } else {
                                        let update_request = new sql.Request(conn);
                                        update_request.query(`update T_Registration_Integration
                                        set status=1
                                        where OPD_IPD_ID=${record.OPD_IPD_ID} and OPD_IPD=${record.OPD_IPD}`, (err, result) => {
                                                if (err) {
                                                    console.log("Status is not updated: " + err)
                                                    asyncCallback()
                                                } else {
                                                    console.log("Status is updated: ")
                                                    asyncCallback()
                                                }
                                            })
                                        log("VisitID: " + visitID._id)
                                    }
                                })
                            }
                        })
                    }, function (err) {
                        if (err) {
                            log("Error Occured" + err);
                        } else {
                            log("Task Completed");
                        }
                    })
                }
            })
    })
}

function SchedularPatient(patient, registorCallback) {
    documentObject.Patient.findOne({ mrn: patient.mrn }, (err, previousPatient) => {
        if (err) {
            registorCallback(err);
        } else if (previousPatient) {
            log("Already Created Patient");
            previousPatient = Object.assign(previousPatient, patient);
            previousPatient.dob = new Date(patient.DateOfBirth).getTime();
            documentObject.Patient.findOneAndUpdate({ _id: previousPatient._id }, previousPatient, registorCallback)
            //asyncCallback();
        } else {
            var patientToSave = new documentObject.Patient(patient);
            patientToSave.dob = new Date(patient.DateOfBirth).getTime();
            patientToSave.registrationDate = new Date(patient.RegistrationDate).getTime();
            patientToSave._id = uuid.v4();
            patientToSave.save(registorCallback)
        }
    })
}

function SchedulerVisit(visit, patientId, visitCallback) {

    documentObject.Visit.findOne({ OPD_IPD_ID: visit.OPD_IPD_ID, OPD_IPD: visit.OPD_IPD }, (err, previousVisit) => {
        if (err) {
            visitCallback(err)
        } else if (previousVisit) {
            documentObject.User.findOne({ hisUserId: visit.HIS_Doctor_ID }, (err, user) => {
                if (err) {
                    visitCallback(err);
                } else if (user && user.hisUserId == 0) {
                    visitCallback("DoctorID is 0");
                } else if (user) {
                    previousVisit = Object.assign(previousVisit, visit);
                    previousVisit.patientId = patientId
                    previousVisit.doctorId = user.userId
                    previousVisit.visitDate = new Date(visit.VISITDate).getTime();
                    if (visit.OPD_IPD == 0) {
                        previousVisit.visitType = (visit.VisitTypeID == 2) ? 'Follow Up' : 'New';
                        previousVisit.VisitTypeID = visit.VisitTypeID;
                        previousVisit.patientType = 'OP';
                    } else {
                        previousVisit.visitType = 'Admitted'
                        previousVisit.VisitTypeID = 6
                        previousVisit.patientType = 'IP';
                        if (visit.bedID !== null) {
                            var bed = {
                                admittingDoctor: visit.primaryDoctor,
                                admittingDepartment: visit.clinicalDepartment,
                                admissionType: visit.admissionType,
                                wardName: visit.Ward,
                                roomNo: visit.room,
                                bedNo: visit.BedDescription,
                                bedId: visit.bedID
                            }

                            let bedindex = -1;
                            previousVisit.BedInformation.forEach(function (element, elementIndex) {
                                if (element.bedId == visit.bedID)
                                    bedindex = elementIndex;
                            }, this);

                            if (bedindex < 0) {
                                previousVisit.BedInformation.push(bed)
                            } else {
                                previousVisit.BedInformation.splice(bedindex, 1, bed)
                            }
                        }
                    }
                    previousVisit.dateEpoch = new Date().getTime();
                    var searchData = {
                        WardID: visit.WardID,
                        CabinID: visit.CabinID,
                        bedId: (visit.OPD_IPD == 1) ? visit.bedID : "",
                        clinicName: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        DepartmentID: visit.DepartmentID,
                        location: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        cinicalDepartment: visit.clinicalDepartment,
                        name: visit.name,
                        mrn: visit.mrn
                    }
                    previousVisit.searchBox = searchData;

                    if (visit.kinId !== null) {
                        var kinInfoObj = {
                            kinId: parseInt(visit.kinId),
                            name: visit.kinName,
                            relation: visit.kinRelation,
                            address: visit.kinaddress,
                            mobileno: visit.kinmobile,
                            occupation: visit.kinoccupationID
                        }

                        let kinindex = -1;
                        previousVisit.kinInfo.forEach(function (element, elementIndex) {
                            if (element.kinId == visit.kinId)
                                kinindex = elementIndex;
                        }, this);

                        if (kinindex < 0) {
                            previousVisit.kinInfo.push(kinInfoObj)
                        }
                        else {
                            previousVisit.kinInfo.splice(kinindex, 1, kinInfoObj)
                        }
                    }

                    if (visit.payeeInfoId !== null) {
                        var payeeInfoObj = {
                            payeeInfoId: parseInt(visit.payeeInfoId),
                            companyName: visit.companyName,
                            PatientCategory: visit.patientCategory,
                            tariff: visit.tariff,
                            priority: visit.PriorityID,
                            companyType: visit.companyCode
                        }

                        let payeeindex = -1;
                        previousVisit.payeeInfo.forEach(function (element, elementIndex) {
                            if (element.payeeInfoId == visit.payeeInfoId)
                                payeeindex = elementIndex;
                        }, this);

                        if (payeeindex < 0) {
                            previousVisit.payeeInfo.push(payeeInfoObj)
                        }
                        else {
                            previousVisit.payeeInfo.splice(payeeindex, 1, payeeInfoObj)
                        }

                    }

                    documentObject.Visit.findOneAndUpdate({ _id: previousVisit._id }, previousVisit, visitCallback);
                } else {
                    log("Doctor not found: " + visit.HIS_Doctor_ID + '  ==== ' + visit.OPD_IPD_ID)
                    visitCallback('Doctor not Found');
                }
            })
        } else {
            documentObject.User.findOne({ hisUserId: visit.HIS_Doctor_ID }, (err, user) => {
                if (err) {
                    visitCallback(err);
                } else if (user && user.hisUserId == 0) {
                    visitCallback("DoctorID is 0");
                } else if (user) {
                    var visitToSave = new documentObject.Visit(visit);
                    visitToSave._id = uuid.v4();
                    visitToSave.patientId = patientId
                    visitToSave.doctorId = user.userId
                    visitToSave.visitDate = new Date(visit.VISITDate).getTime();
                    if (visit.OPD_IPD == 0) {
                        visitToSave.visitType = (visit.VisitTypeID == 2) ? 'Follow Up' : 'New';
                        visitToSave.VisitTypeID = visit.VisitTypeID;
                        visitToSave.patientType = 'OP';
                    } else {
                        visitToSave.visitType = 'Admitted'
                        visitToSave.VisitTypeID = 6
                        visitToSave.patientType = 'IP';
                        if (visit.bedID !== null) {
                            var bed = {
                                admittingDoctor: visit.primaryDoctor,
                                admittingDepartment: visit.clinicalDepartment,
                                admissionType: visit.admissionType,
                                wardName: visit.Ward,
                                roomNo: visit.room,
                                bedNo: visit.BedDescription,
                                bedId: visit.bedID
                            }
                            visitToSave.BedInformation.push(bed);
                        }
                    }
                    visitToSave.dateEpoch = new Date().getTime();
                    var searchData = {
                        WardID: visit.WardID,
                        CabinID: visit.CabinID,
                        bedId: (visit.OPD_IPD == 1) ? visit.bedID : "",
                        clinicName: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        DepartmentID: visit.DepartmentID,
                        location: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        cinicalDepartment: visit.clinicalDepartment,
                        name: visit.name,
                        mrn: visit.mrn
                    }
                    visitToSave.searchBox = searchData;

                    if (visit.kinId !== null) {
                        var kinInfoObj = {
                            kinId: parseInt(visit.kinId),
                            name: visit.kinName,
                            relation: visit.kinRelation,
                            address: visit.kinaddress,
                            mobileno: visit.kinmobile,
                            occupation: visit.kinoccupationID
                        }
                        visitToSave.kinInfo.push(kinInfoObj)
                    }

                    if (visit.payeeInfoId !== null) {
                        var payeeInfoObj = {
                            payeeInfoId: parseInt(visit.payeeInfoId),
                            companyName: visit.companyName,
                            PatientCategory: visit.patientCategory,
                            tariff: visit.tariff,
                            priority: visit.PriorityID,
                            companyType: visit.companyCode
                        }
                        visitToSave.payeeInfo.push(payeeInfoObj)
                    }

                    visitToSave.save(visitCallback)
                } else {
                    log("Doctor not found: " + visit.HIS_Doctor_ID + '  ==== ' + visit.OPD_IPD_ID)
                    visitCallback('Doctor not Found');
                }
            })
        }
    })
}