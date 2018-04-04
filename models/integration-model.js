var mongoose = require('mongoose'),
    uuid = require('node-uuid'),
    user_audit = require("./user_audit.js");
require('graylog');
document = require('./db_model.js');
var documentObject = document.domainModel;




/****************Admissions Tranfer and Discharge Services***********
 * 
 * 
 * 
 * 
 *                                                                        */



module.exports.admissionInput = function (data, res) {

    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            };
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            //25
            var admissionToSave = new documentObject.Admission();
            admissionToSave._id = uuid.v4();
            admissionToSave.patientName = data.patientName;
            admissionToSave.mrn = data.mrn;
            admissionToSave.visitId = data.visitId;
            admissionToSave.visit_admissionNo = data.visit_admissionNo;
            admissionToSave.visitDateTime = data.visitDateTime;
            admissionToSave.visitType = data.visitType;
            admissionToSave.admittingDoctor = data.admittingDoctor;
            admissionToSave.admittingDepartment = data.admittingDepartment;
            admissionToSave.admissionPurpose = data.admissionPurpose;
            admissionToSave.admissionType = data.admissionType;
            admissionToSave.className = data.className;
            admissionToSave.wardName = data.wardName;
            admissionToSave.roomNo = data.roomNo;
            admissionToSave.bedNo = data.bedNo;
            admissionToSave.mlcCase = data.mlcCase;
            admissionToSave.attendingDoctor = data.attendingDoctor;
            admissionToSave.attendingDoctorClassification = data.attendingDoctorClassification;
            admissionToSave.nextOfKinName = data.nextOfKinName;
            admissionToSave.nextOfKinMobileNo = data.nextOfKinMobileNo;
            admissionToSave.nextOfKinResidentialAddress = data.nextOfKinResidentialAddress;
            admissionToSave.nextOfKinRelation = data.nextOfKinRelation;
            admissionToSave.patientType = data.patientType;
            admissionToSave.companyName = data.companyName;
            admissionToSave.tariffName = data.tariffName;
            admissionToSave.doctorId = data.doctorId;
            admissionToSave.patientId = data.patientId;

            admissionToSave.save(function (err) {
                if (err) {
                    var response = {
                        "_error_message": "Error while processing request please check input",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else {
                    var userData = {
                        "userId": data.doctorId,
                        "recordType": "Admissions/Tranfer/Discharge",
                        "recordId": admissionToSave._id,
                        "action": "Adding Patient's Admission",
                        "subject": "Patient",
                        "subjectId": data.patientId,
                        "timeStamp": Date.now()
                    };


                    user_audit.addUser_audit(userData);
                    var response = {
                        "_error_message": "None",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Admission added succefully."
                    };
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Invalid patientId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }


    });
}



/********* Update the Patient's Bed ******
 * 
 * 
 * 
 */



module.exports.updatePatientBedStatus = function (data, res) {
    documentObject.Admission.findOne({ _id: data.admissionId, patientId: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error in operation",
                "_status_Code": 406,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            result.className = data.className;
            result.wardName = data.wardName;
            result.roomNo = data.roomNo;
            result.bedNo = data.bedNo;
            result.transferDateTime = Date.now();

            var userData = {
                // "UserAudit_id": uuid.v4(),
                "userId": data.doctorId,
                "recordType": "Admissions/Tranfer/Discharge",
                "recordId": data.admissionId,
                "action": "Updating Patient's Bed Status",
                "subject": "Patient",
                "subjectId": data.patientId,
                "timeStamp": Date.now()
            };
            user_audit.addUser_audit(userData);
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        "_error_message": "Error in operation",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "Record Not Updated."
                    }
                    res.send(response);

                } else {
                    var response = {
                        "_error_message": "none",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Patient's bed updated successfully."
                    }
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Admission record not found",
                "_status_Code": 404,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        }
    });

}


module.exports.updatePatientDischarge = function (data, res) {

    documentObject.Admission.findOne({ _id: data.admissionId, patientId: data.patientId }, function (err, result) {


        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            };
            res.send(response);

        } else if (document.isFieldFilled(result)) {
            //25

            var dischargeToSave = new documentObject.Discharge();
            dischargeToSave._id = uuid.v4();
            dischargeToSave.patientId = data.patientId;
            dischargeToSave.doctorId = data.doctorId;
            dischargeToSave.visitId = data.visitId;
            dischargeToSave.admissionId = data.admissionId;
            dischargeToSave.dischargeStatus = data.dischargeStatus;
            dischargeToSave.dischargeDoneBy = data.dischargeDoneBy;
            dischargeToSave.dischargeDateTime = data.dischargeDateTime;



            dischargeToSave.save(function (err) {
                if (err) {
                    var response = {
                        "_error_message": "Error while processing request please check input",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else {
                    var userData = {
                        // "UserAudit_id": uuid.v4(),
                        "userId": data.doctorId,
                        "recordType": "Admissions/Tranfer/Discharge",
                        "recordId": dischargeToSave._id,
                        "action": "Adding Patient's Discharge Status",
                        "subject": "Patient",
                        "subjectId": data.patientId,
                        "timeStamp": Date.now()
                    };


                    user_audit.addUser_audit(userData);
                    var response = {
                        "_error_message": "None",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Discharge updated succefully."
                    };
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Invalid admission Id or patientId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }


    });
}



/************      Radiology Results       *********
 * 
 * 
 * 
 * 
 *                                  */


module.exports.radiologyInput = function (data, res) {

    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {


        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            };
            res.send(response);

        } else if (document.isFieldFilled(result)) {
            //25

            var radiologySave = new documentObject.Radiology();
            radiologySave._id = uuid.v4();
            radiologySave.doctorId = data.doctorId;
            radiologySave.patientId = data.patientId;
            radiologySave.patientName = data.patientName;
            radiologySave.mrn = data.mrn;
            radiologySave.visitId = data.visitId;
            radiologySave.visitNo = data.visitNo;
            radiologySave.visitDateTime = data.visitDateTime;
            radiologySave.visitType = data.visitType;
            radiologySave.primaryDoctor = data.primaryDoctor;
            radiologySave.clinicalDepartment = data.clinicalDepartment;
            radiologySave.clinicName = data.clinicName;
            radiologySave.testCategory = data.testCategory;
            radiologySave.testCode = data.testCode;
            radiologySave.testName = data.testName;
            radiologySave.modality = data.modality;
            radiologySave.testResult = data.testResult;
            radiologySave.diacomImg = data.diacomImg;
            radiologySave.orderDate = data.orderDate;
            radiologySave.testResultDateTime = data.testResultDateTime;
            radiologySave.testResultStatus = data.testResultStatus;
            radiologySave.resultDoneBy = data.resultDoneBy;

            radiologySave.save(function (err) {
                if (err) {
                    var response = {
                        "_error_message": "Error while processing request please check input",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else {
                    var userData = {
                        // "UserAudit_id": uuid.v4(),
                        "userId": data.doctorId,
                        "recordType": "Radiology",
                        "recordId": radiologySave._id,
                        "action": "Adding Patient's Radiology Results",
                        "subject": "Patient",
                        "subjectId": data.patientId,
                        "timeStamp": Date.now()
                    };


                    user_audit.addUser_audit(userData);
                    var response = {
                        "_error_message": "None",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Radiology Result updated succefully."
                    };
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Invalid visitId or patientId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }


    });
}




module.exports.updatePatientInformation = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error in operation",
                "_status_Code": 406,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            result.registrationDate = data.registrationDate;
            result.mrn = data.mrn;
            result.nric = data.nric;
            result.passportNo = data.passportNo;
            result.prefix = data.prefix;
            result.name = data.name;
            result.gender = data.gender;
            result.dob = data.dob;
            result.mobile = data.mobile;
            result.emailId = data.mobileNo;
            result.Occupation = data.Occupation;
            result.residentialAddress = data.residentialAddress;
            result.residentialCountry = data.residentialCountry;
            result.residentialState = data.residentialState;
            result.residentialCity = data.residentialCity;
            result.residentialPostCode = data.residentialPostCode;
            result.unitId = data.unitId;
            result.patientImg = data.patientImg;

            var userData = {
                // "UserAudit_id": uuid.v4(),
                "userId": data.doctorId,
                "recordType": "Patient Records",
                "recordId": data.admissionId,
                "action": "Update Patient's Demographic Information",
                "subject": "Patient",
                "subjectId": data.patientId,
                "timeStamp": Date.now()
            };
            user_audit.addUser_audit(userData);
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        "_error_message": "Error in operation",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "Record Not Updated."
                    }
                    res.send(response);

                } else {
                    var response = {
                        "_error_message": "none",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Patient's information updated successfully."
                    }
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Patient record not found",
                "_status_Code": 404,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        }
    });

}

module.exports.cancelVisit = function (data, res) {
    documentObject.Visit.findOne({ _id: data.visitId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error in operation",
                "_status_Code": 406,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            result.cancelDate = data.cancelDate;
            result.cancelRemark = data.cancelRemark;

            var userData = {

                "userId": data.doctorId,
                "recordType": "Visits",
                "recordId": data.visitId,
                "action": "Cancelling Patient's Visit ",
                "subject": "Patient",
                "subjectId": data.patientId,
                "timeStamp": Date.now()
            };
            user_audit.addUser_audit(userData);
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        "_error_message": "Error in operation",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "Record Not Updated."
                    }
                    res.send(response);

                } else {
                    var response = {
                        "_error_message": "none",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Patient's visit cancelled successfully."
                    }
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Patient's visit record not found",
                "_status_Code": 404,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        }
    });

}

module.exports.updateMedicationDispensedStatus = function (data, res) {
    documentObject.CpoeOrder.findOne({ _id: data.orderId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error in operation",
                "_status_Code": 406,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {

               var x = result.orderItems.length;

             for (var i = 0; i< x ; i++) {
                var medicationSave = new documentObject.Medication();

                medicationSave._id = uuid.v4();
                medicationSave.orderType = result.orderCategory;
                medicationSave.patientId = result.patientId;
                medicationSave.drugName = result.orderItems[i].name;
                medicationSave.status = "Active";
                medicationSave.startDate = Date.now();
                medicationSave.stopDate = Date.now();
                medicationSave.orderBy = result.orderingDoctorName;
                medicationSave.visitId = result.visitId;
                medicationSave.medicationDispensedStatus = "Active";
                console.log(medicationSave);

              medicationSave.save(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": "Error in operation",
                            "_status_Code": 406,
                            "_status": "error",
                            "result": "Record Not updated."
                        }
                        res.send(response);
                    }
                });

             }
            result.orderStatus = "dispensed";
            var userData = {
                // "UserAudit_id": uuid.v4(),
                "userId": data.doctorId,
                "recordType": "Medication",
                "recordId": medicationSave._id,
                "action": "Update medication dispensed status Information",
                "subject": "Patient",
                "subjectId": data.patientId,
                "timeStamp": Date.now()
            };
            user_audit.addUser_audit(userData);
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        "_error_message": "Error in operation",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "Record Not Updated."
                    }
                    res.send(response);

                } else {
                    var response = {
                        "_error_message": "none",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "Medication Dispense Status updated successfully."
                    }
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Medication record not found",
                "_status_Code": 404,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        }
    });

}



module.exports.OTinput = function (data, res) {

    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {


        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            };
            res.send(response);

        } else if (document.isFieldFilled(result)) {
            //25

            var OTsave = new documentObject.OT();
            OTsave._id = uuid.v4();
            OTsave.doctorId = data.doctorId;
            OTsave.visitId = data.visitId;
            OTsave.patientId = data.patientId;
            OTsave.procedureName = data.procedureName;
            OTsave.OTdate = data.OTdate
            OTsave.OTtheatre = data.OTtheatre;
            OTsave.OTtable = data.OTtable;
            OTsave.OTstartTime = data.OTstartTime;
            OTsave.OTendTime = data.OTendTime;
            OTsave.remarks = data.remarks;
            OTsave.specialRequirements = data.specialRequirements;

            OTsave.save(function (err) {
                if (err) {
                    var response = {
                        "_error_message": "Error while processing request please check input",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else {
                    var userData = {
                        // "UserAudit_id": uuid.v4(),
                        "userId": data.doctorId,
                        "recordType": "OT",
                        "recordId": OTsave._id,
                        "action": "Adding Patient's OT schedule",
                        "subject": "Patient",
                        "subjectId": data.patientId,
                        "timeStamp": Date.now()
                    };


                    user_audit.addUser_audit(userData);
                    var response = {
                        "_error_message": "None",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "OT schedule updated succefully."
                    };
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "Invalid or patientId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }


    });
}


module.exports.updateOTschedule = function (data, res) {
    documentObject.OT.findOne({ _id: data.OTid }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error in operation",
                "_status_Code": 406,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            result.procedureName = data.procedureName;
            result.OTdate = data.OTdate
            result.OTtheatre = data.OTtheatre;
            result.OTtable = data.OTtable;
            result.OTstartTime = data.OTstartTime;
            result.OTendTime = data.OTendTime;
            result.remarks = data.remarks;
            result.specialRequirements = data.specialRequirements;


            var userData = {

                "userId": data.doctorId,
                "recordType": "OT",
                "recordId": data.OTid,
                "action": "Update OT schedule Information",
                "subject": "Patient",
                "subjectId": data.patientId,
                "timeStamp": Date.now()
            };
            user_audit.addUser_audit(userData);
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        "_error_message": "Error in operation",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "Record Not Updated."
                    }
                    res.send(response);

                } else {
                    var response = {
                        "_error_message": "none",
                        "_status_Code": 200,
                        "_status": "Done",
                        "result": "OT schedule updated successfully."
                    }
                    res.send(response);
                }
            });
        } else {
            var response = {
                "_error_message": "OT record not found",
                "_status_Code": 404,
                "_status": "error",
                "result": "Record Not updated."
            }
            res.send(response);
        }
    });

}