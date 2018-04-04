var mongoose = require('mongoose'),
    moment = require('moment'),
    domainModel = require('./schema/domain-model'),
    uuid = require('node-uuid');
   
require('graylog');
document = require('./db_model.js');
var documentObject = document.domainModel;
var _this = this;





exports.addRecordToVisit = function (visitId, records, res) {
    log("Entered in add record to visit", { level: LOG_DEBUG });
    // get visit
    documentObject.Visit.findById({ _id: visitId }, function (err, visit) {
        if (err) {
            log("Error in getting visit" + err, { level: LOG_ERR });
            res.send(500);
        } else {
            if (!visit.records) visit.records = [];
            visit.records = visit.records.concat(records);
            // save the visit
            visit.save(function (err) {
                if (err) {
                    log("Error in saving a visit" + err, { level: LOG_ERR });
                    if (res) res.send(500);
                }
                else {
                    log('Successfully saved visit', { level: LOG_INFO });
                    if (res) res.send(200);
                    //            redisClientForPublishing.publish(
                    //              REDIS_PUBLISH_CHANNEL_BASE_NAME+"addRecordToVisit",JSON.stringify(visit));
                    // TODO
                }
            });
        }
    });
}


/*************** prescription management******************/
// adding prescription to visit
exports.addPrescriptionToVisit = function (visitId, prescriptionId, res) {
    log("Entered in add record to visit", { level: LOG_DEBUG });
    // get visit
    documentObject.Visit.findById({ _id: visitId }, function (err, visit) {
        if (err) {
            log("Error in getting visit" + err, { level: LOG_ERR });
            res.send(500);
        } else {
            if (!visit.prescriptions) visit.prescriptions = [];
            visit.prescriptions = prescriptionId;
            // save the visit
            visit.save(function (err) {
                if (err) {
                    log("Error in saving a visit" + err, { level: LOG_ERR });
                    if (res) res.send(500);
                }
                else {
                    log('Successfully saved visit', { level: LOG_INFO });
                    if (res) res.send(200);
                }
            });
        }
    });
}

// create prescription and add to visit
exports.savePrescription = function (patientId, doctorId, prescriptionObj, res, visitId) {
    //Check if Patient is present in db
    //If found, then save prescription and return id
    log("Entered in savePrescription : ", { level: LOG_DEBUG });
    var prescription = new documentObject.Prescription();
    //Searching whether the given patientId is valid or not from the Patient collection
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            console.log(err);
            res.send("", 500);
        }
        else {
            if (patientObj === null) {
                res.send("", 404);
            }
            else {
                try {
                    //                console.log("creating  prescription step1");
                    prescription._id = uuid.v4();
                    prescription.doctorId = doctorId;
                    var dateArray = prescriptionObj.date.split("-");
                    var prescriptionDate = new Date();
                    prescriptionDate.setDate(dateArray[0]);
                    prescriptionDate.setMonth(dateArray[1] - 1);
                    prescriptionDate.setYear(dateArray[2]);
                    prescription.date = prescriptionDate;
                    prescription.diagnosis = prescriptionObj.diagnosis;
                    var conditionsSummery = new Array();
                    for (var countI = 0; countI < prescriptionObj.conditions.length; countI++) {
                        conditionsSummery.push(prescriptionObj.conditions[countI]);
                    }
                    prescription.conditions = conditionsSummery;
                    prescription.patient.platformIdentified = prescriptionObj.patient.platformIdentified;
                    prescription.patient.patientId = patientId;
                    prescription.patient.patientInfo.name = prescriptionObj.patient.patientInfo.name;
                    prescription.patient.patientInfo.sex = prescriptionObj.patient.patientInfo.sex;
                    prescription.patient.patientInfo.mobile = parseInt(prescriptionObj.patient.patientInfo.mobile);

                    var dobSplit = prescriptionObj.patient.patientInfo.dob.split("-");
                    var dobDate = new Date();
                    dobDate.setDate(dobSplit[0]);
                    dobDate.setMonth(dobSplit[1] - 1);
                    dobDate.setYear(dobSplit[2]);
                    prescription.patient.patientInfo.dob = dobDate;
                    //                console.log("adding patient additional info");

                    var additionalInfoSummery = new Array();
                    for (var countI = 0; countI < prescriptionObj.patient.patientInfo.additionalInfo.length; countI++) {
                        var keyObj = prescriptionObj.patient.patientInfo.additionalInfo[countI].key;
                        var valueObj = prescriptionObj.patient.patientInfo.additionalInfo[countI].value;
                        var keyValueObject = { key: keyObj, value: valueObj };
                        additionalInfoSummery.push(keyValueObject);
                    }
                    prescription.patient.patientInfo.additionalInfo = additionalInfoSummery;
                    console.log("adding drug dosage");
                    var drugsSummery = new Array();
                    for (var countI = 0; countI < prescriptionObj.drugAndDosages.length; countI++) {
                        var genericDrugObj = prescriptionObj.drugAndDosages[countI].genericDrug;
                        var brandedDrugObj = prescriptionObj.drugAndDosages[countI].brandedDrug;
                        var presentationObj = prescriptionObj.drugAndDosages[countI].presentation;
                        var remarksObj = prescriptionObj.drugAndDosages[countI].remarks;
                        console.log("remarks: " + remarksObj);

                        var drugsObj = prescriptionObj.drugAndDosages[countI].drugs;
                        console.log("drugs:" + drugsObj);
                        var dosagesObj = new Array();
                        console.log("adding dosage");
                        for (var countJ = 0; countJ < prescriptionObj.drugAndDosages[countI].dosages.length; countJ++) {
                            var doseValueObj = null; if (isFieldFilled(prescriptionObj.drugAndDosages[countI].dosages[countJ].doseValue)) {
                                doseValueObj = parseFloat(prescriptionObj.drugAndDosages[countI].dosages[countJ].doseValue);
                            }
                            var doseUnitObj = prescriptionObj.drugAndDosages[countI].dosages[countJ].doseUnit;
                            var numberOfDosesObj = prescriptionObj.drugAndDosages[countI].dosages[countJ].numberOfDoses;
                            var doseFrequencyObj = prescriptionObj.drugAndDosages[countI].dosages[countJ].doseFrequency;
                            var numDaysObj = null;
                            if (isFieldFilled(prescriptionObj.drugAndDosages[countI].dosages[countJ].numDays)) {
                                numDaysObj = parseInt(prescriptionObj.drugAndDosages[countI].dosages[countJ].numDays);
                            }

                            var dosageSummery = {
                                doseValue: doseValueObj,
                                doseUnit: doseUnitObj,
                                numberOfDoses: numberOfDosesObj,
                                doseFrequency: doseFrequencyObj,
                                numDays: numDaysObj
                            };
                            dosagesObj.push(dosageSummery);
                        }
                        var drugDosagesObj = {
                            genericDrug: genericDrugObj,
                            brandedDrug: brandedDrugObj,
                            presentation: presentationObj,
                            dosages: dosagesObj,
                            remarks: remarksObj,
                            drugs: drugsObj
                        };

                        drugsSummery.push(drugDosagesObj);
                    }
                    prescription.drugAndDosages = drugsSummery;
                    prescription.remarksInstructions = prescriptionObj.remarksInstructions;
                    prescription.comments = prescriptionObj.comments;
                    prescription.type = "Prescription";
                    console.log("addding prescription to db");
                    //Saving the data in the data base
                    prescription.save(function (err) {

                        if (err) {

                            log("Error occurred while saving Prescription in savePrescription" + err, { level: LOG_ERR });
                            console.log(err);
                            res.send("", 500);
                        }
                        else {
                            // CS: add record to the visit
                            _this.addPrescriptionToVisit(visitId, prescription._id);
                            log("Prescription saved with prescriptionId=" + prescription._id + " patientId=" +
                                patientId, { level: LOG_INFO });
                            //                        res.send("prescriptions/"+prescription._id); 
                            // changes by shaikh riyaz
                            var response = { "prescriptions_id": prescription._id };
                            res.send(response).status(200);
                            addPatientToDoctorsList(doctorId, patientId, function (data) { }, function (data) { });
                        }
                    });

                } catch (err) {
                    console.log(err);
                    res.send("", 500);
                }

            }
        }
    });

}

exports.orderPrescription = function (prescriptionId, res) {

    documentObject.Prescription.findById(prescriptionId, function (err, result) {
        if (err) {
            res.send("error");
        } else {
            var orderToCreate = new documentObject.PrescriptionOrder();
            orderToCreate._id = uuid.v4();
            orderToCreate.record = result._id;
            orderToCreate.patientId = result.patient.patientId;
            orderToCreate.doctorId = result.doctorId;
            orderToCreate.orderStatus = "Created";
            orderToCreate.save(function (err, response) {
                if (err) {
                    res.send("error try again");
                } else {
                    console.log(response);
                    var resp = { "oreder_id": response._id };
                    res.send(resp).status(200);
                }
            });
        }


    });


}

exports.getMedicationDetailsFromAllVisits = function (data, res) {
    console.log("doctorId: " + data.doctorId);
    console.log("patientId: " + data.patientId);
    log("Pharmacy module:Entered in get visits", { level: LOG_DEBUG });
    var visits = [];
    //    documentObject.Visit.find({doctorId: data.doctorId})
    documentObject.Visit.find({ $and: [{ doctorId: data.doctorId }, { patientId: data.patientId }] })
        .sort({ dateEpoch: -1 })
        .populate("prescriptions")
        .exec(function (err, docs) {
            if (err) {
                log("Error in retrieving visits" + err, { level: LOG_ERR });
                res.send(500);
            } else {
                //            log("Docs:" ,JSON.stringify(docs[0].prescriptions.drugAndDosages));
                if (!docs || docs.length == 0) {
                    res.send(docs);
                } else {

                    var options = {
                        path: 'prescriptions.drugAndDosages.drugs',
                        model: 'Drug'
                    };

                    documentObject.Visit.populate(docs, options, function (err, result) {
                        if (err) {
                            var response = { "_status": "something went wrong" };
                            res.send(response).status(500);
                        } else {
                            var drugsArray = new Array();
                            var response = new Array();

                            for (var i = 0; i < result.length; i++) {
                                drugsArray = drugsArray.concat(result[i].prescriptions.drugAndDosages);
                            }
                            res.json(drugsArray);
                        }
                    });
                }


            }
        });
}

exports.getCurrentMedicationsFromLastVisits = function (data, res) {
    //    log("Pharmacy module:Entered in get visits",{level: LOG_DEBUG});
    var visits = [];
    //    documentObject.Visit.find({doctorId: data.doctorId})
    documentObject.Visit.find({ $and: [{ doctorId: data.doctorId }, { patientId: data.patientId }] })
        .sort({ dateEpoch: -1 })
        .populate("prescriptions")
        .exec(function (err, docs) {
            if (err) {
                log("Error in retrieving visits" + err, { level: LOG_ERR });
                res.send(500);
            } else {
                //            log("Docs: " ,JSON.stringify(docs[0].prescriptions));
                if (!docs || docs.length == 0) {
                    res.send(docs);
                } else {

                    var options = {
                        path: 'prescriptions.drugAndDosages.drugs',
                        model: 'Drug'
                    };

                    documentObject.Visit.populate(docs, options, function (err, result) {
                        if (err) {
                            var response = { "_status": "something went wrong" };
                            res.send(response).status(500);
                        } else {
                            var drugsArray = new Array();
                            var response = new Array();
                            drugsArray = drugsArray.concat(result[0].prescriptions.drugAndDosages);

                            res.json(drugsArray);
                        }
                    });
                }


            }
        });
}


/************* Diagnostic Investigation Advice Management Services ***********/


exports.saveDiagnosticInvestigationAdvice = function (patientId, doctorId, diagnosticInvestigationAdviceObj, res, visitId) {
    log("Entered in saveDiagnosticInvestigationAdvice: ", { level: LOG_DEBUG });
    try {
        documentObject.Patient.findById(patientId, function (err, patientObj) {
            if (err) {
                log("Error while finding patient in saveDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
                res.send(500);
            }
            else {
                if (patientObj === null) {
                    log("Patient not found in saveDiagnosticInvestigationAdvice patientId =" + patientId, { level: LOG_ERR });
                    res.send(404);
                }
                else {
                    var adviceLetter = new documentObject.DiagnosticInvestigationAdvice();
                    adviceLetter._id = uuid.v4();
                    adviceLetter.type = 'DiagnosticInvestigationAdvice';
                    adviceLetter.investigations = diagnosticInvestigationAdviceObj.investigations;
                    adviceLetter.labName = diagnosticInvestigationAdviceObj.labName;
                    adviceLetter.clinicalNotes = diagnosticInvestigationAdviceObj.clinicalNotes;
                    adviceLetter.priority = diagnosticInvestigationAdviceObj.priority;
                    adviceLetter.patientId = patientId;
                    adviceLetter.doctorId = doctorId;

                    //set date for report
                    adviceLetter.date = getJSDateFromClientDateFormat(diagnosticInvestigationAdviceObj.date);
                    adviceLetter.createdOn = new Date();

                    //saving report
                    adviceLetter.save(function (err) {
                        if (err) {
                            log("Error occurred while saving dianosticInvestigationAdvice in saveDiagnosticInvestigationAdvice error=" + err, { level: LOG_ERR });
                            console.log(err);
                            res.send(500);
                        } else {
                            // CS: add record to the visit
                            _this.addRecordToVisit(visitId, [{ recordId: adviceLetter._id, recordType: "diagnosticInvestigationAdvice" }]);
                            log("DianosticInvestigationAdvice saved with reportId=" + adviceLetter._id + " patientId=" + patientId, { level: LOG_INFO });
                            res.send("diagnosticInvestigationAdvices/" + adviceLetter._id);
                            //                          redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"saveDiagnosticInvestigationAdvice",adviceLetter);
                            addPatientToDoctorsList(doctorId, patientId, function (data) { }, function (data) { });
                        }
                    });
                }
            }
        });

    } catch (err) {
        log("Error in saveDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
        res.send(500);
    }
}

exports.getDiagnosticInvestigationAdvice = function (patientId, diagnosticInvestigationAdviceId, req, res) {
    log("Entered in getDiagnosticInvestigationAdvice: ", { level: LOG_DEBUG });
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in getDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj === null) {
                log("Patient not found in getDiagnosticInvestigationAdvice patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticInvestigationAdvice.findById(diagnosticInvestigationAdviceId, function (err, adviceObj) {
                    if (err) {
                        log("Error while finding diagnosticReport in getDiagnosticInvestigationAdvice diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId, { level: LOG_ERR });
                        res.send(500);
                    }
                    else {
                        if (adviceObj == null) {
                            log("DiagnosticInvestigationAdvice not found in getDiagnosticInvestigationAdvice diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId, { level: LOG_ERR });
                            res.send("DIAGNOSTICINVESTIGATIONADVICE_NOT_FOUND", 404);
                        } else {
                            var adviceObjs = [];
                            adviceObjs.push(adviceObj);
                            convertDiagnosticInvestigationAdvicesToDtos(adviceObjs, res, false);
                            log("Returned from getDiagnosticInvestigationAdvice: ", { level: LOG_DEBUG });
                        }
                    }
                });
            }
        }
    });

}


function convertDiagnosticInvestigationAdvicesToDtos(adviceObjs, res, isArray) {
    var advicesToSendArray = [];
    adviceObjs.forEach(function (advice) {
        var adviceToSend = advice.toObject();
        var date = adviceToSend.date;
        adviceToSend.date = "" + date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
        //adviceToSend.time = "" + date.getHours() + "-" + date.getMinutes();
        advicesToSendArray.push(adviceToSend);
    });
    if (isArray) res.send(advicesToSendArray);
    else res.send(advicesToSendArray[0]);
}

exports.updateDiagnosticInvestigationAdvice = function (patientId, doctorId, diagnosticInvestigationAdviceId, updatedDiagnosticInvestigationAdvice, res) {
    //check if patient and advice exist
    //then update advice else throw error 404

    log("Entered in updateDiagnosticInvestigationAdvice: ", { level: LOG_DEBUG });
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in updateDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj === null) {
                log("Patient not found in updateDiagnosticInvestigationAdvice patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticInvestigationAdvice.findById(diagnosticInvestigationAdviceId, function (err, adviceToUpdate) {
                    if (err) {
                        log("Error while finding diagnosticReport in updateDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
                        res.send(500);
                    }
                    else {
                        if (adviceToUpdate == null) {
                            log("DiagnosticInvestigationAdvice not found in updateDiagnosticInvestigationAdvice patientId =" + patientId + " diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId, { level: LOG_ERR });
                            res.send("DIAGNOSTICINVESTIGATIONADVICE_NOT_FOUND", 404);
                        }
                        else {
                            adviceToUpdate.investigations = updatedDiagnosticInvestigationAdvice.investigations;
                            adviceToUpdate.labName = updatedDiagnosticInvestigationAdvice.labName;
                            adviceToUpdate.clinicalNotes = updatedDiagnosticInvestigationAdvice.clinicalNotes;
                            adviceToUpdate.priority = updatedDiagnosticInvestigationAdvice.priority;
                            //doctor & patient id are not updated
                            //update date for report
                            //TODO if date is given
                            //adviceToUpdate.date= getJSDateFromClientDateFormat(updatedDiagnosticInvestigationAdvice.date);
                            adviceToUpdate.updatedOn = new Date();

                            //saving updated advice
                            adviceToUpdate.save(function (err) {
                                if (err) {
                                    log("Error occurred while updating diagnosticInvestigationAdvice in updateDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
                                    console.log(err);
                                    res.send(500);
                                } else {
                                    log("DiagnosticInvestigationAdvice updated with diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId + " patientId=" + patientId, { level: LOG_INFO });
                                    log("Returned from updateDiagnosticInvestigationAdvice: ", { level: LOG_DEBUG });
                                    res.send(204);
                                    // redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"updateDiagnosticInvestigationAdvice",adviceToUpdate);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}


exports.removeDiagnosticInvestigationAdvice = function (patientId, diagnosticInvestigationAdviceId, res) {
    //check if patient is present then remove advice if found
    //else send error

    log("Entered in removeDiagnosticInvestigationAdvice ", { level: LOG_DEBUG });
    //Searching whether the given patientId is valid or not from the Patient collection
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in removeDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj == null) {
                log("Patient not found in removeDiagnosticInvestigationAdvice patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticInvestigationAdvice.findById(diagnosticInvestigationAdviceId, function (err, adviceObj) {
                    if (err) {
                        log("Error while finding diagnosticInvestigationAdvice in removeDiagnosticInvestigationAdvice", { level: LOG_ERR });
                        res.send("", 500);
                    }
                    else {
                        if (adviceObj == null) {
                            log("DiagnosticInvestigationAdvice not found for patientId=" + patientId + " diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId, { level: LOG_ERR });
                            res.send("DIAGNOSTICINVESTIGATIONADVICE_NOT_FOUND", 404);
                        }
                        else {
                            adviceObj.remove(function (err) {
                                if (err) {
                                    log("Error occurred while deleting diagnosticInvestigationAdvice in removeDiagnosticInvestigationAdvice" + err, { level: LOG_ERR });
                                    res.send(500);
                                }
                                else {
                                    res.send(204);
                                    log("DiagnosticInvestigationAdvice deleted with diagnosticInvestigationAdviceId=" + diagnosticInvestigationAdviceId + " patientId=" + patientId, { level: LOG_INFO });
                                    log("Returned from removeDiagnosticInvestigationAdvice", { level: LOG_DEBUG });
                                    // redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"removeDiagnosticInvestigationAdvice",adviceObj);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}


exports.getPreviousNDiagnosticInvestigationAdvices = function (patientId, limit, res) {
    //get previous diagnostic investigation advices of patient sorted in desc order
    //and send back to client

    log("Entered in  getPreviousNDiagnosticInvestigationAdvices ", { level: LOG_DEBUG });
    //Searching whether the given patientId is valid or not from the Patient collection
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in getPreviousNDiagnosticInvestigationAdvices" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj == null) {
                log("Patient not found in getPreviousNDiagnosticInvestigationAdvices patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticInvestigationAdvice.find({ patientId: patientId }).sort({ createdOn: -1 })
                    .limit(limit).exec(function (err, investigationAdvices) {
                        if (err) {
                            log("Error while finding DiagnosticInvestigationAdvice in getPreviousNDiagnosticInvestigationAdvices", { level: LOG_ERR });
                            res.send("", 500);
                        }
                        else {
                            if (investigationAdvices.length == 0) {
                                log("No DiagnosticInvestigationAdvices found for patientId=" + patientId, { level: LOG_INFO });
                                log("Returned from getPreviousNDiagnosticInvestigationAdvices ", { level: LOG_DEBUG });
                                res.send(investigationAdvices);
                            }
                            else {
                                log("Returned from getPreviousNDiagnosticInvestigationAdvices ", { level: LOG_DEBUG });
                                convertDiagnosticInvestigationAdvicesToDtos(investigationAdvices, res, true);
                            }
                        }
                    });
            }
        }
    });
}

///////////////


/********************** Diagnostic Report Management Services **********************/


exports.saveDiagnosticReport = function (patientId, doctorId, diagnosticReportObj, res, visitId) {
    log("Entered in saveDiagnosticReport: ", { level: LOG_DEBUG });
    try {
        documentObject.Patient.findById(patientId, function (err, patientObj) {
            if (err) {
                log("Error while finding patient in saveDiagnosticReport" + err, { level: LOG_ERR });
                res.send(500);
            }
            else {
                if (patientObj === null) {
                    log("Patient not found in saveDiagnosticReport patientId =" + patientId, { level: LOG_ERR });
                    res.send(404);
                }
                else {
                    var report = new documentObject.DiagnosticReport();
                    report._id = uuid.v4();
                    report.type = 'DiagnosticReport';
                    report.investigation = diagnosticReportObj.investigation;
                    report.remarks = diagnosticReportObj.remarks;
                    report.description = diagnosticReportObj.description;

                    report.patientId = patientId;
                    report.doctorId = doctorId;

                    //set date for report
                    report.date = getJSDateFromClientDateFormat(diagnosticReportObj.date, diagnosticReportObj.time);
                    //report.date = new Date(diagnosticReportObj.date.year, (diagnosticReportObj.date.month-1), diagnosticReportObj.date.day, diagnosticReportObj.time.hours, diagnosticReportObj.time.mins, 0, 0);
                    report.createdOn = report.date;

                    //saving report
                    report.save(function (err) {
                        if (err) {
                            log("Error occurred while saving diagnosticReport in saveDiagnosticReport" + err, { level: LOG_ERR });
                            console.log(err);
                            res.send(500);
                        } else {
                            // CS: add record to the visit
                            _this.addRecordToVisit(visitId, [{ recordId: report._id, recordType: "diagnosticReport" }]);
                            log("DiagnosticReport saved with reportId=" + report._id + " patientId=" + patientId, { level: LOG_INFO });
                            res.send("diagnosticReports/" + report._id);
                            //   redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"saveDiagnosticReport",report);
                            addPatientToDoctorsList(doctorId, patientId, function (data) { }, function (data) { });
                        }
                    });
                }
            }
        });

    } catch (err) {
        log("Error in saveDiagnosticReport" + err, { level: LOG_ERR });
        res.send(500);
    }
}


exports.getDiagnosticReport = function (patientId, diagnosticReportId, req, res) {
    log("Entered in getDiagnosticReport: ", { level: LOG_DEBUG });
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in getDiagnosticReport" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj === null) {
                log("Patient not found in getDiagnosticReport patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticReport.findById(diagnosticReportId, function (err, reportObj) {
                    if (err) {
                        log("Error while finding diagnosticReport in getDiagnosticReport diagnosticReportId=" + diagnosticReportId, { level: LOG_ERR });
                        res.send(500);
                    }
                    else {
                        if (reportObj == null) {
                            log("DiagnosticReport not found in getDiagnosticReport diagnosticReportId=" + diagnosticReportId, { level: LOG_ERR });
                            res.send("DIAGNOSTICREPORT_NOT_FOUND", 404);
                        } else {
                            var reportObjs = [];
                            reportObjs.push(reportObj);
                            convertDiagnosticReportsToDtos(reportObjs, res, false);
                            log("Returned from getDiagnosticReport: ", { level: LOG_DEBUG });
                        }
                    }
                });
            }
        }
    });

}

function convertDiagnosticReportsToDtos(reportObjs, res, isArray, callback) {
    var reportsToSendArray = [];
    reportObjs.forEach(function (reportObj) {
        var reportToSend = reportObj.toObject();
        var date = reportObj.date;
        reportToSend.type = "DiagnosticReport";
        reportToSend.date = "" + date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
        reportToSend.time = "" + date.getHours() + "-" + date.getMinutes();
        reportsToSendArray.push(reportToSend);
    });

    if (callback) {
        callback(reportsToSendArray);
    } else {
        if (isArray) res.send(reportsToSendArray);
        else res.send(reportsToSendArray[0]);
    }
}


exports.updateDiagnosticReport = function (patientId, diagnosticReportId, updatedDiagnosticReport, res) {
    //check if patient and report exist
    //then update report else throw error 404

    log("Entered in updateDiagnosticReport: ", { level: LOG_DEBUG });
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in updateDiagnosticReport" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj === null) {
                log("Patient not found in updateDiagnosticReport patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticReport.findById(diagnosticReportId, function (err, reportToUpdate) {
                    if (err) {
                        log("Error while finding diagnosticReport in updateDiagnosticReport" + err, { level: LOG_ERR });
                        res.send(500);
                    }
                    else {
                        if (reportToUpdate == null) {
                            log("DiagnosticReport not found in updateDiagnosticReport patientId =" + patientId + " diagnosticReportId=" + diagnosticReportId, { level: LOG_ERR });
                            res.send("DIAGNOSTICREPORT_NOT_FOUND", 404);
                        }
                        else {

                            reportToUpdate.type = 'DiagnosticReport';
                            reportToUpdate.investigation = updatedDiagnosticReport.investigation;
                            reportToUpdate.remarks = updatedDiagnosticReport.remarks;
                            reportToUpdate.description = updatedDiagnosticReport.description;
                            //doctor & patient id are not updated
                            //update date for report
                            reportToUpdate.date = getJSDateFromClientDateFormat(updatedDiagnosticReport.date, updatedDiagnosticReport.time);
                            reportToUpdate.updatedOn = new Date();

                            //saving updated report
                            reportToUpdate.save(function (err) {
                                if (err) {
                                    log("Error occurred while updating diagnosticReport in updateDiagnosticReport" + err, { level: LOG_ERR });
                                    console.log(err);
                                    res.send(500);
                                } else {
                                    log("DiagnosticReport updated with diagnosticReportId=" + diagnosticReportId + " patientId=" + patientId, { level: LOG_INFO });
                                    log("Returned from updateDiagnosticReport: ", { level: LOG_DEBUG });
                                    res.send(204);
                                    // redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"updateDiagnosticReport",reportToUpdate);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

exports.removeDiagnosticReport = function (patientId, diagnosticReportId, res) {
    //check if patient is present then remove report if found
    //else send error

    log("Entered in removeDiagnosticReport ", { level: LOG_DEBUG });
    //Searching whether the given patientId is valid or not from the Patient collection
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in removeDiagnosticReport" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj == null) {
                log("Patient not found in removeDiagnosticReport patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticReport.findById(diagnosticReportId, function (err, diagnosticReportObj) {
                    if (err) {
                        log("Error while finding diagnosticReport in removeDiagnosticReport", { level: LOG_ERR });
                        res.send("", 500);
                    }
                    else {
                        if (diagnosticReportObj == null) {
                            log("DiagnosticReport not found for patientId=" + patientId + " diagnosticReportId=" + diagnosticReportId, { level: LOG_ERR });
                            res.send("DIAGNOSTICREPORT_NOT_FOUND", 404);
                        }
                        else {
                            diagnosticReportObj.remove(function (err) {
                                if (err) {
                                    log("Error occurred while deleting diagnosticReport in removeDiagnosticReport" + err, { level: LOG_ERR });
                                    res.send(500);
                                }
                                else {
                                    res.send(204);
                                    log("DiagnosticReport deleted with diagnosticReportId=" + diagnosticReportId + " patientId=" + patientId, { level: LOG_INFO });
                                    log("Returned from removeDiagnosticReport", { level: LOG_DEBUG });
                                    // redisClientForPublishing.publish(REDIS_PUBLISH_CHANNEL_BASE_NAME+"removeDiagnosticReport",diagnosticReportObj);
                                }
                            });

                        }
                    }
                });
            }
        }
    });
}

exports.getAllDiagnosticReports = function (patientId, session, limit, req, res) {
    log("Entered in getAllDiagnosticReports: ", { level: LOG_DEBUG });
    documentObject.Patient.findById(patientId, function (err, patientObj) {
        if (err) {
            log("Error while finding patient in getAllDiagnosticReports" + err, { level: LOG_ERR });
            res.send(500);
        }
        else {
            if (patientObj === null) {
                log("Patient not found in getAllDiagnosticReports patientId =" + patientId, { level: LOG_ERR });
                res.send("PATIENT_NOT_FOUND", 404);
            }
            else {
                documentObject.DiagnosticReport.find({ patientId: patientId }).sort({ date: -1 })
                    .limit(limit).exec(function (err, reportObjs) {
                        if (err) {
                            log("Error while finding DiagnosticReport in getAllDiagnosticReports", { level: LOG_ERR });
                            res.send("", 500);
                        }
                        else {
                            log("Returned from getAllDiagnosticReports ", { level: LOG_DEBUG });
                            //res.send(assessmentObjs);
                            convertDiagnosticReportsToDtos(reportObjs, res, true, callbackFunction);

                            function callbackFunction(manualReportsToSendArray) {
                                getDiagnosticFileReportsFromFileServer(patientId, session, 'DiagnosticReportFile', function (chunk) {
                                    //                                        console.log("CHUNK" + chunk);
                                    var newArray = JSON.parse(chunk);
                                    var objs = [];
                                    objs = objs.concat(manualReportsToSendArray, newArray);
                                    objs.sort(function (obj1, obj2) {
                                        var date1, date2;
                                        if (obj1.type == "DiagnosticReport") {
                                            date1 = obj1.date;
                                        } else {
                                            date1 = obj1.createdOn;
                                        }

                                        if (obj2.type == "DiagnosticReport") {
                                            date2 = obj2.date;
                                        } else {
                                            date2 = obj2.createdOn;
                                        }
                                        //                                        var date1 = new Date(obj1.createdOn); // = new Date(dateArray[2],(dateArray[1]-1),dateArray[0]);
                                        ////                                            var dateArray = obj2.date.split("-");
                                        ////                                            var date2 = new Date(dateArray[2],(dateArray[1]-1),dateArray[0]);
                                        //                                        var date2 = new Date(obj2.createdOn);
                                        //in descending order
                                        if (date1 < date2) {
                                            return 1;
                                        } else {
                                            return -1;
                                        }
                                    });
                                    //                                        console.log(objs);
                                    objs.forEach(function (obj) {
                                        if (obj.type != "DiagnosticReport") {
                                            var date = new Date(obj.createdOn);
                                            obj.date = "" + date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
                                        }
                                    });
                                    res.send(objs);
                                }, function (error) {
                                    console.log(JSON.stringify(error));
                                    res.send(500);
                                });
                            }
                        }
                    });
            }
        }
    });
}

function getDiagnosticFileReportsFromFileServer(patientId, sessionId, podName, successCallback, errorCallback) {
    if (typeof sessionId === 'undefined' || sessionId == "") {
        errorCallback({ errorCode: 410 });
    }
    //a0a50c71-9b52-49b0-bb56-8cdcfc0ad931/DiagnosticReportFile/files?sessionId=123
    var path = '/' + patientId + '/' + podName + '/files?sessionId=' + sessionId;

    var options = {
        host: FILESERVER_CONFIG.serverHost,
        port: FILESERVER_CONFIG.serverPort,
        path: path
    };

    var data = "";
    http.get(options, function (res) {
        res.on("data", function (chunk) {
            //            console.log("reply " + chunk.toString());
            data += chunk;
        });

        res.on("end", function () {
            successCallback(data);
        });

    }).on('error', function (e) {
        console.log('ERROR: ' + e.message);
        errorCallback({ errorCode: 410 });
    });
}

function addPatientToDoctorsList(doctorId, patientId, successCallback, errorCallback) {
    //Searching the doctorId in Doctor collection having Patient id as patientId
    console.log("adding patient id to doctor list:" + patientId + ": " + doctorId);
    documentObject.Doctor.findOne({ externalEntityId: doctorId }, function (err, doctorObj) {
        if (err) {
            log("Error in connection with Doctor collection", { level: LOG_ERR });
            res.send("", 500);
        }
        else {
            if (doctorObj === null) {
                log("Doctor not found doctorId=" + doctorId, { level: LOG_ERR });
                errorCallback("Doctor not found doctorId=" + doctorId);
            }
            else {
                var index = doctorObj.patients.indexOf(patientId);
                if (index != -1) {
                    log("Patient Already added in the Database ", { level: LOG_ERR });
                    successCallback("Patient Already added in the Database");
                }
                else {
                    doctorObj.patients.push(patientId);
                    doctorObj.save(function (err) {
                        if (err) {
                            log("Error while adding patient" + err, { level: LOG_ERR });
                            errorCallback("Error while adding patient" + err);
                        }
                        else {
                            log("Successfully added patient", { level: LOG_INFO });
                            successCallback("Successfully added patient");
                        }
                    });
                }
            }
        }
    })

}

function isFieldFilled(value) {
    if (typeof value !== 'undefined' && value != "" && value != null) {
        return true;
    } else {
        return false;
    }
}

function getJSDateFromClientDateFormat(dateString, timeString) {
    if (typeof dateString === 'undefined' || dateString == null) {
        return new Date();
    }
    var dateArray = dateString.split('-');
    if (dateArray.length != 3) {
        return new Date();
    }
    var date = new Date();
    date.setYear(dateArray[2]);
    date.setMonth(dateArray[1] - 1);
    date.setDate(dateArray[0]);
    if (typeof timeString !== 'undefined' && timeString != "") {
        var timeArray = timeString.split('-');
        if (timeArray.length == 2 && !isNaN(timeArray[0]) && !isNaN(timeArray[1])) {
            date.setHours(timeArray[0]);
            date.setMinutes(timeArray[1]);
        } else {
            setTime();
        }
    } else {
        setTime();
    }

    function setTime() {
        date.setHours(0);
        date.setMinutes(0);
    }
    return date;
}
































