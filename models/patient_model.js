uuid = require('node-uuid'),
    user_audit = require('./user_audit.js'),
    integrationModel = require('./integrationAmqp.js'),
    http = require('http'),
    vitalsModule = require('../controllers/VitalController'),
    nursingController = require('../controllers/nursingController')
requestToHis = require('request')
require('graylog');
var moment = require("moment");
var async = require('async')
var fs = require('fs')
document = require('./db_model.js')
var documentObject = document.domainModel
var cpoeDocument = document.cpoeDataModel
var masterObject = document.mastersModel

module.exports.addNandaDiagnosis = function (data, res) {
    var problem = new documentObject.NandaDiagnosis(data);
    problem._id = uuid.v4();
    // problem.diagnosis.Domain = data.diagnosis.Domain._id;
    // problem.diagnosis.Class = data.diagnosis.Class._id;
    problem.save(function (err, done) {
        if (err) {
            var response = {
                '_error_message': 'Request Processing Error',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': '',
                '_status_Code': 200,
                '_status': 'Diagnosis added Successfully',
                'result': ''
            }
            res.send(response)
        }
    })
}

module.exports.updateNandaDiagnosis = function (data, res) {
    documentObject.NandaDiagnosis.findOneAndUpdate({ _id: data.problemId }, data, function (err, done) {
        if (err) {
            var response = {
                '_error_message': 'Request Processing Error',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!done) {
            var response = {
                '_error_message': 'Diagnosis not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'Diagnosis updated',
                'result': ''
            }
            res.send(response)
        }
    })
}

module.exports.getNandaDiagnosisByStatus = function (data, res) {
    try {
        documentObject.NandaDiagnosis.find({
            $and: [
                { visitId: data.visitId },
                { patientId: data.patientId },
                { status: data.status }
            ]
        }, function (err, done) {
            if (err) {
                var response = {
                    '_error_message': 'Request Processing Error',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': '',
                    '_status_Code': 200,
                    '_status': 'Success',
                    'result': done
                }
                res.send(response)
            }
        })
    } catch (e) {
        var response = {
            '_error_message': 'Unknown Error',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}

module.exports.getNandaDiagnosis = function (data, res) {
    try {
        log("PatientId: " + data.patientId + " VisitId: " + data.visitId)
        documentObject.NandaDiagnosis.find({
            $and: [
                { visitId: data.visitId },
                { patientId: data.patientId }
            ]
        }, function (err, done) {
            if (err) {
                var response = {
                    '_error_message': 'Request Processing Error',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': '',
                    '_status_Code': 200,
                    '_status': 'Success',
                    'result': done
                }
                res.send(response)
            }
        })
    } catch (e) {
        var response = {
            '_error_message': 'Unknown Error',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}

module.exports.patientLogin = function (jwt, data, res) {
    documentObject.User.findOne({ accessCode: data.accessCode }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Request Processing Error',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (result) {
            if (result.password === data.password) {
                if (result.userType === 'patient') {
                    documentObject.Patient.findOne({ _id: result.userId }, 'name gender residentialAddress patientImg mobile registrationDate mrn dob', function (err, userResult) {
                        if (err) {
                            var response = {
                                '_error_message': 'invalid user ',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else if (userResult) {
                            var tokenParam = {}
                            tokenParam._id = result._id
                            tokenParam.userName = result.accessCode
                            tokenParam.password = result.password
                            var token = jwt.sign(tokenParam, 'sofomo_pwd', {
                                expiresIn: '1 days'
                            })
                            var resObject = {}
                            resObject.user = userResult
                            resObject.token = token
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'done',
                                'result': resObject
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'invalid user ',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        }
                    })
                } else {
                    var response = {
                        '_error_message': 'invalid userType',
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'none'
                    }
                    res.send(response)
                }

            } else {
                var response = {
                    '_error_message': 'invalid password',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        } else {
            var response = {
                '_error_message': 'User not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getPatientVisitList = function (req, res) {
    try {
        documentObject.Patient.findOne({
            _id: req.params.patientId
        }, 'visitRecords').populate({
            path: 'visitRecords',
            model: 'Visit',
            select: 'visitDate primaryDoctor visitType OPD_IPD',
            sort: { 'date': -1 }
        }).exec(function (err, visitresult) {
            if (err) {
                var response = {
                    '_error_message': 'Request Processing Error',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (visitresult) {
                var response = {
                    '_error_message': '',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': visitresult
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'Record not found',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        })
    } catch (e) {
        var response = {
            '_error_message': 'Unexpexted Error',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}

module.exports.allergiesInput = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var count = 0
            var allergiestosave = new documentObject.Allergies()
            allergiestosave.patientId = data.patientId
            allergiestosave._id = uuid.v4()
            allergiestosave.allergyName = data.allergyName
            allergiestosave.date = data.date
            allergiestosave.nature = data.nature
            allergiestosave.observedHistory = data.observedHistory
            allergiestosave.severity = data.severity
            allergiestosave.comments = data.comments
            allergiestosave.originators = data.originators
            allergiestosave.symptoms = data.symptoms
            allergiestosave.markNKA = data.markNKA
            allergiestosave.originationDate = data.originationDate
            allergiestosave.type = data.type
            allergiestosave.state = data.state
            allergiestosave.doctorId = data.doctorId
            allergiestosave.visitId = data.visitId
            allergiestosave.allergyId = data.allergyId

            documentObject.Allergies.count({ allergyName: allergiestosave.allergyName, patientId: allergiestosave.patientId, state: 'active' || 'inactive' }, function (err, count1) {
                if (err) {
                    log(err)
                } else if (count1 > 0) {
                    var response = {
                        '_error_message': 'Duplicate Allergy Record',
                        '_status_Code': 405,
                        '_status': 'error',
                        'result': 'Allergy not added.'
                    }
                    res.send(response)
                } else {
                    allergiestosave.validate(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': err,
                                '_status_Code': 407,
                                '_status': 'Validation Error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            allergiestosave.save(function (err) {
                                if (err) {
                                    var response = {
                                        '_error_message': 'Error while processing request please check input',
                                        '_status_Code': 406,
                                        '_status': 'error',
                                        'result': 'none'
                                    }
                                    res.send(response)
                                } else {
                                    var userData = {
                                        // "UserAudit_id": uuid.v4(),
                                        'userId': data.doctorId,
                                        'recordType': 'Allergies',
                                        'recordId': allergiestosave._id,
                                        'action': 'Saving Patient Allergies To Database.',
                                        'subject': 'Patient',
                                        'subjectId': data.patientId,
                                        'timeStamp': Date.now()
                                    }

                                    user_audit.addUser_audit(userData)
                                    var response = {
                                        '_error_message': 'None',
                                        '_status_Code': 200,
                                        '_status': 'done',
                                        'result': ' Allergy added succefully.'
                                    }
                                    res.send(response)
                                }
                            })
                        }
                    })
                }
            })
        } else {
            // log("user  not found")
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getPatientAllergies = function (patientId, res) {
    log('in get patient allergies ......')
    documentObject.Allergies.find({ patientId: patientId }).sort({ date: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response);
        }

    })
}

module.exports.allergyUpdate = function (AllergyId, PatientId, data, res) {
    documentObject.Allergies.findOne({ _id: AllergyId, patientId: PatientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            if (result.state === 'error') {
                var response1 = {
                    '_error_message': 'The result is already marked as Error.',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response1)
            } else {
                if (data.state === 'error') {
                    result.state = 'error'
                } else if (data.state === 'active' && result.state != 'error') {
                    result.state = 'active'
                } else if (data.state === 'inactive' && result.state != 'error') {
                    result.state = 'inactive'
                }

                var userData = {
                    // "UserAudit_id": uuid.v4(),
                    'userId': data.doctorId,
                    'recordType': 'Allergies',
                    'recordId': AllergyId,
                    'action': 'Updating Patient Allergies as Active/Inactive/Error.',
                    'subject': 'Patient',
                    'subjectId': PatientId,
                    'timeStamp': Date.now()
                }
                user_audit.addUser_audit(userData)
                result.validate(function (err) {
                    if (err) {
                        var response = {
                            '_error_message': err,
                            '_status_Code': 407,
                            '_status': 'Validation Error',
                            'result': 'none'
                        }
                        res.send(response)
                    } else {
                        result.save(function (err) {
                            if (err) {
                                var response = {
                                    '_error_message': 'unable to process the request',
                                    '_status_Code': 201,
                                    '_status': 'error',
                                    'result': 'none'
                                }
                                res.send(response)
                            } else {
                                var response = {
                                    '_error_message': 'none',
                                    '_status_Code': 200,
                                    '_status': 'done',
                                    'result': 'Allergy updated successfully'
                                }
                                res.send(response)
                            }
                        })
                    }
                })
            }
        } else {
            var response = {
                '_error_message': 'invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.deleteAllergy = function (AllergyId, res) {
    documentObject.Allergies.remove({ _id: AllergyId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in Operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not found'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'Done',
                'result': 'Record Deleted Successfully.'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'invalid AllergyId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not deleted.'
            }
            res.send(response)
        }
    })
}

module.exports.postingsED = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = { '_status': 'somthing went wrong please try again' }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var inputPosting = new documentObject.Postings()
            inputPosting.patientId = data.patientId
            inputPosting.postingType = 'ED'
            inputPosting.sliderValue = data.sliderValue
            inputPosting.comment = data.comment
            inputPosting._id = uuid.v4()
            inputPosting.date = Date.now();
            inputPosting.visitId = data.visitId
            inputPosting.doctorId = data.doctorId
            inputPosting.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    inputPosting.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': data.doctorId,
                                'recordType': 'Postings ED',
                                'recordId': inputPosting._id,
                                'action': 'Saving Patient Postings.',
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Posting added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            // log("user  not found")
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.postingsNonED = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            res.json(Utility.output("Error in Database Operation", "ERROR"))
        } else if (document.isFieldFilled(result)) {
            var inputPosting = new documentObject.Postings()
            inputPosting.patientId = data.patientId
            inputPosting.postingType = 'Non ED'
            inputPosting.sliderValue = data.sliderValue
            inputPosting.comment = data.comment
            inputPosting._id = uuid.v4()
            inputPosting.date = Date.now()
            inputPosting.title = data.title
            inputPosting.status = data.status
            inputPosting.mediaFileURL = data.mediaFileURL
            inputPosting.visitId = data.visitId
            inputPosting.doctorId = data.doctorId
            inputPosting.fileType = data.fileType
            inputPosting.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    inputPosting.save(function (err, done) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                'userId': data.doctorId,
                                'recordType': 'Postings Non ED',
                                'recordId': inputPosting._id,
                                'action': 'Saving Patient Postings.',
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }
                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': done
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            res.json(Utility.output("Invalid patientId", "ERROR"))
        }
    })
}


module.exports.scanDocsDetails = function (data, res, req) {
    var EMR_CONFIG = require('config').get('ehrserver');
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            log(err.message);
            var response = {
                '_error_message': 'Request processing error',
                '_status_Code': 406,
                '_status': '',
                'result': 'none'
            }
            res.send(response)
        } else if (result) {
            var docDetails = new documentObject.scanDocument(data);
            if (!docDetails.fileName)
                return res.json(Utility.output('File name is required', 'VALIDATION_ERROR'));
            docDetails.mediaFileURL = docDetails.mediaFileURL.replace(EMR_CONFIG.ip + ":" + EMR_CONFIG.serverPort, "");
            docDetails.doctorId = req.decoded.userId;
            docDetails._id = uuid.v4();
            docDetails._id = new Date().getTime();
            docDetails.validate(function (err, valid) {
                if (err) {
                    var response = {
                        '_error_message': 'Validation Error: ' + err.message,
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    docDetails.save(function (err, done) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Document added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getScanDocs = function (req, res) {
    var EMR_CONFIG = require('config').get('ehrserver');
    var getPageCount = require('docx-pdf-pagecount');
    var path = require('path');
    var fs = require("fs");
    documentObject.scanDocument.aggregate([
        {
            "$match": {
                $and: [
                    { visitId: req.query['visitId'] },
                    { patientId: req.params.patientId }
                ]
            }
        },
        {
            $lookup: {
                from: "User",
                localField: "doctorId",
                foreignField: "userId",
                as: "User"
            }
        },
        { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "visitId": "$visitId",
                "doctorId": "$doctorId",
                "scanDocType": "$scanDocType",
                "comment": "$comment",
                "title": "$title",
                "mediaFileURL": "$mediaFileURL",
                "scanDocUploadFile": "$scanDocUploadFile",
                "date": "$date",
                "uploadedBy": { $concat: ["$User.firstName", " - ", "$User.lastName"] }
            }
        }
    ], function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (result) {
            var resultObj = [];
            async.eachSeries(result, function (eachData, callback_each) {
                eachData.fileMeta = {
                    error: null
                };
                eachData.mediaFileURL = eachData.mediaFileURL.substring(eachData.mediaFileURL.indexOf("/")).replace(EMR_CONFIG.ip + ":" + EMR_CONFIG.serverPort, "")
                if (eachData.fileName === undefined) {
                    eachData.fileName = eachData.mediaFileURL.substring(eachData.mediaFileURL.lastIndexOf("/") + 1);
                    if (eachData.fileName.indexOf("-") >= 0)
                        eachData.fileName = eachData.fileName.substring(eachData.mediaFileURL.indexOf("-") - 1);
                }
                fs.stat(APP_ROOT_PATH + '/data' + eachData.mediaFileURL, function (err, stats) {
                    if (err) {
                        eachData.mediaFileURL = "";
                        eachData.fileMeta.error = 'File not found';
                        resultObj.push(eachData);
                        delete eachData.fileName;
                        callback_each();
                    }
                    else {
                        var fileSizeInMegabytes = stats.size / 1000000.0;
                        if (eachData.mediaFileURL) {
                            var mediaFile = eachData.mediaFileURL;
                            eachData.pageCount = 1;
                            eachData.mediaFileURL = Utility.baseURL() + eachData.mediaFileURL;
                            eachData.fileMeta.fileName = eachData.fileName;
                            eachData.fileMeta.size = fileSizeInMegabytes;
                            eachData.fileMeta.extension = path.extname(eachData.fileName).toLowerCase();
                            delete eachData.fileName;
                            if (eachData.fileMeta.extension == ".pdf" || eachData.fileMeta.extension == ".docx" || eachData.fileMeta.extension == ".doc") {
                                getPageCount(APP_ROOT_PATH + '/data' + mediaFile)
                                    .then(pages => {
                                        eachData.pageCount = pages;
                                        resultObj.push(eachData);
                                        callback_each();
                                    })
                                    .catch((err) => {
                                        resultObj.push(eachData);
                                        callback_each();
                                    });
                            }
                            else if (eachData.fileMeta.extension == ".tif" || eachData.fileMeta.extension == ".tiff") {
                                var opta = {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    url: Utility.baseURL() + '/posting/convert/tiff2png?url=' + eachData.mediaFileURL
                                };
                                Utility.call_api(opta, function (err, body) {
                                    if (!err) {
                                        try {
                                            body = JSON.parse(body);
                                            if (body.result != undefined) {
                                                eachData.pageCount = body.result.length;
                                            }
                                            resultObj.push(eachData);
                                            callback_each();
                                        } catch (e) {
                                            resultObj.push(eachData);
                                            callback_each();
                                        }
                                    }
                                    else {
                                        resultObj.push(eachData);
                                        callback_each();
                                    }
                                });
                            }
                            else {
                                resultObj.push(eachData);
                                callback_each();
                            }
                        }

                    }
                });
            }, function () {
                return res.json(Utility.output(resultObj.length + ' document(s) fetched', 'SUCCESS', resultObj));
            });
        } else {
            return res.json(Utility.output('Invalid patient id', 'ERROR'));
        }
    });
};

module.exports.getPatientPostings = function (patientId, res) {
    log('in get patient Postings ......');
    var EMR_CONFIG = require('config').get('ehrserver');
    documentObject.Postings.find({ patientId: patientId }).sort({ date: -1 }).exec(function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (document.isFieldFilled(result)) {
            var resultObj = [];
            async.eachSeries(result, function (eachData, callback_each) {
                if (eachData.mediaFileURL !== undefined) {
                    if (eachData.mediaFileURL) {
                        eachData.mediaFileURL = Utility.baseURL() + eachData.mediaFileURL.substring(eachData.mediaFileURL.indexOf("/")).replace(EMR_CONFIG.ip + ":" + EMR_CONFIG.serverPort, "")
                    }
                }
                resultObj.push(eachData);
                callback_each();
            }, function () {
                return res.json(Utility.output(resultObj.length + ' record(s) fetched', 'SUCCESS', resultObj));
            });
        } else {
            return res.json(Utility.output('Invalid patient id', 'ERROR'));
        }
    })
}

module.exports.getPostingsLast48 = function (patientId, res) {
    log('in get patient postings of last 48 hours ......')
    documentObject.Postings.find({
        patientId: patientId, date: { $gte: (Date.now() - 172800000) }
    }).sort({ date: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

module.exports.deletePosting = function (postingId, res) {
    documentObject.Postings.remove({ _id: postingId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid PostingId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not found'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'Done',
                'result': 'Record Deleted Successfully.'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'Error in Operation',
                '_status_Code': 405,
                '_status': 'error',
                'result': 'Record Not deleted.'
            }
            res.send(response)
        }
    })
}

// module.exports.postingError = function (postingId, res) {
//     documentObject.Postings.findOne({ _id: postingId }, function (err, result) {

module.exports.postingError = function (postingId, PatientId, doctorId, res) {
    documentObject.Postings.findOne({ _id: postingId, patientId: PatientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            result.markError = true
            var userData = {
                // "UserAudit_id": uuid.v4(),
                'userId': doctorId,
                'recordType': 'Postings',
                'recordId': postingId,
                'action': 'Marking Patient Postings as Error.',
                'subject': 'Patient',
                'subjectId': PatientId,
                'timeStamp': Date.now()
            }

            user_audit.addUser_audit(userData)
            result.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    result.save(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error in operation',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'Record Not marked as error.'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Posting Marked error successfully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Posting not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        }
    })
}
// Lab Results Add

module.exports.addLabOrderResults = function (data, res) {
    documentObject.Patient.findOne({ mrn: data.mrn }, function (err, result) {
        if (err) {
            var response = { '_status': 'somthing went wrong please try again' }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var labInput = new documentObject.labOrderResults()
            labInput._id = uuid.v4()
            labInput.labOrder = data.labOrder
            labInput.patientName = data.patientName
            labInput.patientId = data.patientId
            labInput.mrn = data.mrn
            labInput.visitId = data.visitId
            labInput.visitNo = data.visitNo
            labInput.visitDate = data.visitDate
            labInput.visitType = data.visitType
            labInput.primaryDoctor = data.primaryDoctor
            labInput.clinicalDepartment = data.clinicalDepartment
            labInput.clinicName = data.clinicName
            labInput.testCategory = data.testCategory
            labInput.testCode = data.testCode
            labInput.testName = data.testName
            labInput.profileName = data.profileName
            labInput.sampleNumber = data.sampleNumber
            labInput.resultValue = data.resultValue
            labInput.parameterName = data.parameterName
            labInput.rangeUpper = data.rangeUpper
            labInput.rangeLower = data.rangeLower
            labInput.organismName = data.organismName
            labInput.antibioticsName = data.antibioticsName
            labInput.sensitivityResult = data.sensitivityResult
            labInput.units = data.units
            labInput.suggestion = data.suggestion
            labInput.footNotes = data.footNotes
            labInput.pathologistName = data.pathologistName
            labInput.orderDate = data.orderDate
            labInput.sampleCollectionDate = data.sampleCollectionDate
            labInput.sampleReceived = data.sampleReceived
            labInput.sampleStatus = data.sampleStatus
            labInput.samplePriority = data.samplePriority
            labInput.testResult = data.testResult
            labInput.userId = data.userId

            labInput.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    labInput.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': data.userId,
                                'recordType': 'Lab Order Results',
                                'recordId': labInput._id,
                                'action': "Entering Patient's Lab Order Results.",
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Lab orders added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            // log("user  not found")
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}
// Lab results view
module.exports.getLabOrderResults = function (mrn, res) {
    log('in get patient lab order results ......')
    documentObject.labOrderResults.find({ mrn: mrn }).sort({ testResult: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}
// Get patient Lab order results by date
module.exports.getLast10LabOrders = function (mrn, res) {
    documentObject.labOrderResults.find()
        .sort({ testResult: -1 })
        .limit(10)
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Unable to find the lab order results',
                    '_status_Code': 405,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (document.isFieldFilled(result)) {
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': result
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'No lab order results.',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        })
}
module.exports.getLabOrderResultsByDate = function (mrn, upper, lower, res) {
    log('in get patient lab order results by date ......')
    documentObject.labOrderResults.find({
        mrn: mrn, testResult: {
            $gte: lower,
            $lte: upper
        }
    }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'Invalid mrn',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

// Point of care

// POC input 

module.exports.POCinput = function (data, res) {
    var currentTime = new Date().getTime();
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = { '_status': 'somthing went wrong please try again' }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var testInput = new documentObject.POC()
            testInput._id = uuid.v4()
            testInput.visitId = data.visitId
            testInput.doctorId = data.doctorId
            testInput.patientId = data.patientId
            testInput.POCTestName = data.POCTestName
            testInput.POCtestList = data.listItems
            testInput.POCdate = currentTime

            testInput.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    testInput.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': data.doctorId,
                                'recordType': 'POC',
                                'recordId': testInput._id,
                                'action': 'Saving Patient POC result.',
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'POC added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getPOCByDateRange = function (req, res) {
    log('in get patient POC By Date Range......')
    var query = {
        $and: [
            { patientId: req.params.patientId },
            { POCdate: { $gte: req.query['lower'], $lte: req.query['upper'] } }
        ]
    };
    documentObject.POC.find(query, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'Result not found',
                '_status_Code': 406,
                '_status': '',
                'result': ''
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

// POC get or view
module.exports.getPOC = function (patientId, res) {
    log('in get patient POC ......')
    documentObject.POC.find({ patientId: patientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

module.exports.getPOCById = function (req, res) {
    log('in get patient POC By Id ......')
    documentObject.POC.find({ $and: [{ patientId: req.params.patientId }, { _id: req.params.pocId }] }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

// POC delete
module.exports.deletePOC = function (POCId, res) {
    documentObject.POC.remove({ _id: POCId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid POCId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not found'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'Done',
                'result': 'Record Deleted Successfully.'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'Error in Operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not deleted.'
            }
            res.send(response)
        }
    })
}
//Update POC

module.exports.updatePOCinput = function (data, res) {
    var dataToSet = {
        POCTestName: data.POCTestName,
        POCtestList: data.POCtestList,
        POCdate: data.POCdate
    };
    documentObject.POC.findOneAndUpdate({ $and: [{ _id: data.pocId }, { patientId: data.patientId }] }, dataToSet, function (err, success) {
        if (err) {
            var response = {
                '_error_message': 'Error in operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': ''
            }
            res.send(response)
        } else if (!success) {
            var response = {
                '_error_message': 'POC not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': ''
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': '',
                '_status_Code': 200,
                '_status': 'POC Update',
                'result': ''
            }
            res.send(response)
        }
    })
}

// Mark POC as Error

module.exports.POCError = function (POCId, doctorId, PatientId, res) {
    documentObject.POC.findOne({ _id: POCId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            result.markError = true
            var userData = {
                // "UserAudit_id": uuid.v4(),
                'userId': doctorId,
                'recordType': 'POC',
                'recordId': POCId,
                'action': 'Marking Patient POC as Error.',
                'subject': 'Patient',
                'subjectId': PatientId,
                'timeStamp': Date.now()
            }
            user_audit.addUser_audit(userData)
            result.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    result.save(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error in operation',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'Record Not marked as error.'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'POC Marked error successfully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'POC not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        }
    })
}
// Add Patients to the records

module.exports.addIPDPatient = function (data, res) {
    var regExp = /\(([^)]+)\)/

    var patientSave = new documentObject.Patient()

    patientSave._id = uuid.v4()
    patientSave.name = data.inputObj.PatientDetails.FirstName
    patientSave.prefix = data.inputObj.PatientDetails.Prefix
    patientSave.gender = data.inputObj.PatientDetails.Gender

    var RegiDate = regExp.exec(data.inputObj.PatientDetails.GeneralDetails.RegistrationDate)
    patientSave.registrationDate = RegiDate[1]

    // console.log("MRN No: "+data.inputObj.PatientDetails.CivilID)
    // patientSave.lastVisit = data.inputObj.LastVisit
    patientSave.mrn = data.inputObj.PatientDetails.GeneralDetails.MRNo
    patientSave.nric = data.inputObj.PatientDetails.CivilID
    patientSave.passportNumber = data.inputObj.PatientDetails.PassportNo
    patientSave.status = data.inputObj.PatientDetails.MaritalStatusCode
    patientSave.religion = data.inputObj.PatientDetails.ReligionCode
    patientSave.nationality = data.inputObj.PatientDetails.NationalityCode

    var dobMatch = regExp.exec(data.inputObj.PatientDetails.DateofBirth)
    patientSave.dob = dobMatch[1]

    console.log(' Age: ' + ((Date.now() - dobMatch[1]) / (31557600000)))

    /** Age Formula: ((new Date()).getTime() - timestamp) / (1000 * 60 * 60 * 24 * 365);*****/

    patientSave.emailId = data.inputObj.PatientDetails.Email
    patientSave.Occupation = data.inputObj.PatientDetails.Occupation
    patientSave.residentialAddress = data.inputObj.PatientDetails.ResiAdress
    patientSave.residentialCountry = data.inputObj.PatientDetails.CountryCode
    patientSave.residentialState = data.inputObj.PatientDetails.StateCode
    patientSave.residentialCity = data.inputObj.PatientDetails.CityCode
    // patientSave.residentialPostCode = data.inputObj.PatientDetails.Pincode
    patientSave.unitId = data.inputObj.PatientDetails.UnitID
    // patientSave.patientImg = data.inputObj.PatientDetails.patientImg
    patientSave.mobile = data.inputObj.PatientDetails.MobileNo
    // patientSave.visitRecords = data.visitRecords

    patientSave.save(function (err, patientSaveObj) {
        if (err) {
            console.log(err)
            var response = {
                '_error_message': 'Failed',
                '_status_Code': 400,
                '_status': 'Done',
                'result': 'Patient not added.'
            }
            res.send(response)
        } else {
            if (true) {
                addToDoctorList('7b6a2d7a-67c8-41db-94a2-98218dca024d', patientSaveObj._id)
                var sd = {
                    'doctorId': data.inputObj.PatientAdmissionDetails.Details.DoctorID,
                    'emrDetailUnitId': data.inputObj.PatientDetails.UnitIDs,
                    'OperationType': 'AcceptCase',
                    'OPD_IPD_ID': data.inputObj.PatientAdmissionDetails.Details.ID
                }

                // var emrRec = createEMRrecords(sd)

                requestToHis.post({ url: 'http://localhost:9400/addEmrDetails', form: sd }, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var dataObject = JSON.parse(body)

                        console.log('EMR Detail Id: ' + dataObject.result.EMRDetailID)
                        console.log('EMR Case Id: ' + dataObject.result.EMRCaseID)

                        var visitToSave = new documentObject.Visit()
                        visitToSave._id = uuid.v4()
                        visitToSave.EMRDetailId = dataObject.result.EMRDetailID
                        visitToSave.EMRCaseId = dataObject.result.EMRCaseID
                        visitToSave.OPD_IPD_ID = data.inputObj.PatientAdmissionDetails.Details.ID
                        visitToSave.HIS_Doctor_ID = data.inputObj.PatientAdmissionDetails.Details.DoctorID
                        // visitToSave.visit_opd_No = data.inputObj.PatientAdmissionDetails.Details.visit_opd_No
                        visitToSave.patientId = patientSaveObj._id
                        visitToSave.doctorId = '7b6a2d7a-67c8-41db-94a2-98218dca024d'

                        var visitDate = regExp.exec(data.inputObj.PatientAdmissionDetails.Details.AdmissionDate)

                        visitToSave.visitDate = visitDate[1]

                        visitToSave.visitType = 'Admitted'
                        visitToSave.location = data.inputObj.PatientAdmissionDetails.Details.WardDescription
                        visitToSave.careProvider = data.inputObj.PatientAdmissionDetails.Details.DoctorName

                        visitToSave.encounterType = data.inputObj.PatientAdmissionDetails.Details.EncounterTypeDescription
                        visitToSave.primaryDoctor = data.inputObj.PatientAdmissionDetails.Details.DoctorName
                        visitToSave.clinicalDepartment = data.inputObj.PatientAdmissionDetails.Details.Department
                        // visitToSave.clinicName = data.inputObj.PatientAdmissionDetails.Details.Cabin

                        for (kinInfo in data.inputObj.PatientAdmissionDetails.Details.KinDetailsList) {
                            var kinInfoObj = {
                                name: data.inputObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinName,
                                relation: data.inputObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinRelationDesc,
                                address: data.inputObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinAddr,
                                mobileno: data.inputObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinMobileNo,
                                occupation: data.inputObj.PatientAdmissionDetails.Details.KinDetailsList[kinInfo].KinOccupationDesc

                            }
                            visitToSave.kinInfo.push(kinInfoObj)
                        }

                        for (payeeInfo in data.inputObj.PatientSponsorDetails.PatientSponsorDetails) {
                            var payeeInfoObj = {
                                companyName: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].ComapnyName,
                                PatientCategory: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].PatientCategoryName,
                                tariff: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].TariffName,
                                priority: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].Priority,
                                companyType: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].CompanyCode
                            }
                            visitToSave.payeeInfo.push(payeeInfoObj)
                        }

                        // visitToSave.kinInfo = data.inputObj.PatientVisitDetails.kinInfo
                        visitToSave.payeeInfo = data.inputObj.PatientVisitDetails.payeeInfo

                        visitToSave.save(function (err, visitObj) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Failed',
                                    '_status_Code': 400,
                                    '_status': 'Done',
                                    'result': 'Visit not Created.'
                                }
                                res.send(response)
                            } else {
                                patientSaveObj.visitRecords.push(visitObj._id)
                                patientSaveObj.save(function (err, patientObjDemo) {
                                    if (err) {
                                        var response = {
                                            '_error_message': 'Failed',
                                            '_status_Code': 400,
                                            '_status': 'Done',
                                            'result': 'Visit PatientObj not Created.'
                                        }
                                        res.send(response)
                                    } else {
                                        var admissionToSave = new documentObject.Admission()
                                        admissionToSave._id = uuid.v4()
                                        admissionToSave.admittingDoctor = data.inputObj.PatientAdmissionDetails.Details.DoctorName
                                        admissionToSave.admittingDepartment = data.inputObj.PatientAdmissionDetails.Details.Department
                                        admissionToSave.admissionPurpose = data.inputObj.PatientAdmissionDetails.Details.EncounterTypeDescription
                                        admissionToSave.admissionType = data.inputObj.PatientAdmissionDetails.Details.AdmissionType
                                        // admissionToSave.className = data.inputObj.PatientAdmissionDetails.Details.className
                                        admissionToSave.wardName = data.inputObj.PatientAdmissionDetails.Details.WardDescription
                                        admissionToSave.roomNo = data.inputObj.PatientAdmissionDetails.Details.RoomCode
                                        admissionToSave.bedNo = data.inputObj.PatientAdmissionDetails.Details.BedDescription
                                        // admissionToSave.mlcCase = data.inputObj.PatientAdmissionDetails.Details.mlcCase

                                        admissionToSave.save(function (err, succ) {
                                            if (err) {
                                                var response = {
                                                    '_error_message': 'Failed',
                                                    '_status_Code': 400,
                                                    '_status': 'Done',
                                                    'result': 'Visit PatientObj Admission not Created.'
                                                }
                                                res.send(response)
                                            } else {
                                                var response = {
                                                    '_error_message': 'None',
                                                    '_status_Code': 200,
                                                    '_status': 'Done',
                                                    'result': 'Patient and Visit 2 and Admission added succefully. '
                                                }
                                                res.send(response)
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    } else {
                        var response = {
                            '_error_message': 'Failed',
                            '_status_Code': 400,
                            '_status': 'Done',
                            'result': ''
                        }
                        res.send(response)
                    }
                })
            }
        }
    })
}





module.exports.addPatient = function (data, res) {
    var regExp = /\(([^)]+)\)/

    var patientSave = new documentObject.Patient()

    patientSave._id = uuid.v4()
    patientSave.HIS_PatientId = data.inputObj.PatientDetails.GeneralDetails.PatientID
    patientSave.name = data.inputObj.PatientDetails.FirstName
    patientSave.prefix = data.inputObj.PatientDetails.Prefix
    patientSave.gender = data.inputObj.PatientDetails.Gender

    var RegiDate = regExp.exec(data.inputObj.PatientDetails.GeneralDetails.RegistrationDate)
    patientSave.registrationDate = RegiDate[1]

    // console.log("MRN No: "+data.inputObj.PatientDetails.CivilID)
    // patientSave.lastVisit = data.inputObj.LastVisit
    patientSave.mrn = data.inputObj.PatientDetails.GeneralDetails.MRNo
    patientSave.nric = data.inputObj.PatientDetails.CivilID
    patientSave.passportNumber = data.inputObj.PatientDetails.PassportNo
    patientSave.status = data.inputObj.PatientDetails.MaritalStatusCode
    patientSave.religion = data.inputObj.PatientDetails.ReligionCode
    patientSave.nationality = data.inputObj.PatientDetails.NationalityCode

    var dobMatch = regExp.exec(data.inputObj.PatientDetails.DateofBirth)
    patientSave.dob = dobMatch[1]

    console.log(' Age: ' + ((Date.now() - dobMatch[1]) / (31557600000)))

    /** Age Formula: ((new Date()).getTime() - timestamp) / (1000 * 60 * 60 * 24 * 365);*****/

    patientSave.emailId = data.inputObj.PatientDetails.Email
    patientSave.Occupation = data.inputObj.PatientDetails.Occupation
    patientSave.residentialAddress = data.inputObj.PatientDetails.ResiAdress
    patientSave.residentialCountry = data.inputObj.PatientDetails.CountryCode
    patientSave.residentialState = data.inputObj.PatientDetails.StateCode
    patientSave.residentialCity = data.inputObj.PatientDetails.CityCode
    patientSave.residentialPostCode = data.inputObj.PatientDetails.PinCodeEditable
    patientSave.unitId = data.inputObj.PatientDetails.UnitID
    // patientSave.patientImg = data.inputObj.PatientDetails.patientImg
    patientSave.mobile = data.inputObj.PatientDetails.MobileNo
    // patientSave.visitRecords = data.visitRecords

    patientSave.save(function (err, patientSaveObj) {
        if (err) {
            var response = {
                '_error_message': 'Failed',
                '_status_Code': 400,
                '_status': 'Done',
                'result': 'Patient not added.'
            }
            res.send(response)
        } else {
            log('In Patient Registration ')
            if (!data.inputObj.IsIPDAdmission) {
                addToDoctorList('7b6a2d7a-67c8-41db-94a2-98218dca024d', patientSaveObj._id)

                var sd = {
                    'doctorId': data.inputObj.PatientVisitDetails.VisitDetails.DoctorID,
                    'emrDetailUnitId': data.inputObj.PatientDetails.UnitID,
                    'OperationType': 'AcceptCase',
                    'OPD_IPD_ID': data.inputObj.PatientVisitDetails.VisitDetails.ID
                }

                // var emrRec = createEMRrecords(sd)

                requestToHis.post({ url: 'http://localhost:9400/addEmrDetails', form: sd }, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var dataObject = JSON.parse(body)
                        console.log('EMR Detail Id: ' + dataObject.result.EMRDetailID)
                        console.log('EMR Case Id: ' + dataObject.result.EMRCaseID)
                        // res.json(dataObject)

                        var visitToSave = new documentObject.Visit()
                        visitToSave._id = uuid.v4()
                        visitToSave.OPD_IPD_ID = data.inputObj.PatientVisitDetails.VisitDetails.ID
                        visitToSave.EMRDetailId = dataObject.result.EMRDetailID
                        visitToSave.EMRCaseId = dataObject.result.EMRCaseID
                        visitToSave.HIS_Doctor_ID = data.inputObj.PatientVisitDetails.VisitDetails.DoctorID
                        visitToSave.visit_opd_No = data.inputObj.PatientVisitDetails.VisitDetails.visit_opd_No
                        visitToSave.patientId = patientSaveObj._id
                        visitToSave.doctorId = '7b6a2d7a-67c8-41db-94a2-98218dca024d'

                        var visitDate = regExp.exec(data.inputObj.PatientVisitDetails.VisitDetails.Date)

                        visitToSave.visitDate = visitDate[1]

                        console.log('Visit Type from: ' + data.inputObj.PatientVisitDetails.VisitDetails.VisitTypeDescription)

                        if (data.inputObj.PatientVisitDetails.VisitDetails.VisitTypeDescription === null ||
                            data.inputObj.PatientVisitDetails.VisitDetails.VisitTypeDescription === 'undefined') {
                            data.inputObj.PatientVisitDetails.VisitDetails.VisitTypeDescription = 'New'
                        }
                        visitToSave.visitType = data.inputObj.PatientVisitDetails.VisitDetails.VisitTypeDescription
                        visitToSave.location = data.inputObj.PatientVisitDetails.VisitDetails.Cabin
                        visitToSave.careProvider = data.inputObj.PatientVisitDetails.VisitDetails.Doctor

                        visitToSave.encounterType = data.inputObj.PatientVisitDetails.VisitDetails.EncounterType
                        visitToSave.primaryDoctor = data.inputObj.PatientVisitDetails.VisitDetails.Doctor
                        visitToSave.clinicalDepartment = data.inputObj.PatientVisitDetails.VisitDetails.Department
                        visitToSave.clinicName = data.inputObj.PatientVisitDetails.VisitDetails.Cabin

                        for (kinInfo in data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList) {
                            var kinInfoObj = {
                                name: data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinName,
                                relation: data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinRelationDesc,
                                address: data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinAddr,
                                mobileno: data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinMobileNo,
                                occupation: data.inputObj.PatientVisitDetails.VisitDetails.KinDetailsList[kinInfo].KinOccupationDesc

                            }
                            visitToSave.kinInfo.push(kinInfoObj)
                        }
                        for (payeeInfo in data.inputObj.PatientSponsorDetails.PatientSponsorDetails) {
                            var payeeInfoObj = {
                                companyName: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].ComapnyName,
                                PatientCategory: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].PatientCategoryName,
                                tariff: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].TariffName,
                                priority: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].Priority,
                                companyType: data.inputObj.PatientSponsorDetails.PatientSponsorDetails[payeeInfo].CompanyCode
                            }
                            visitToSave.payeeInfo.push(payeeInfoObj)
                        }
                        // visitToSave.kinInfo = data.inputObj.PatientVisitDetails.kinInfo
                        // visitToSave.payeeInfo = data.inputObj.PatientVisitDetails.payeeInfo
                        visitToSave.save(function (err, visitObj) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Failed',
                                    '_status_Code': 400,
                                    '_status': 'Done',
                                    'result': 'Visit not Created.'
                                }
                                res.send(response)
                            } else {
                                patientSaveObj.visitRecords.push(visitObj._id)
                                patientSaveObj.save(function (err, patientObjDemo) {
                                    if (err) {
                                        console.log('err' + err)
                                        res.send(406)
                                    } else {
                                        // console.log("With visitId: " + patientObjDemo)
                                        // console.log("Visit Info: " + visitObj)
                                        var response = {
                                            '_error_message': 'None',
                                            '_status_Code': 200,
                                            '_status': 'Done',
                                            'result': 'Patient and Visit 2 added succefully. '
                                        }
                                        res.send(response)
                                    }
                                })
                                // var response = {
                                //     "_error_message": "None",
                                //     "_status_Code": 200,
                                //     "_status": "Done",
                                //     "result": "Patient and Visit added succefully. "
                                // }
                                // res.send(response)
                            }
                        })
                    }
                })
            } else {
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'Done',
                    'result': 'Patient added succefully. ' + patientSaveObj._id
                }
                res.send(response)
            }
        }
    })
}

function createEMRrecords(sd) {
    console.log('Called EMR records Function')
    requestToHis.post({ url: 'http://localhost:9400/addEmrDetails', form: sd }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var dataObject = JSON.parse(body)
            console.log('EMR Detail Id: ' + dataObject.result.EMRDetailId)
            console.log('EMR Case Id: ' + dataObject.result.EMRCaseId)
            // res.json(dataObject)
            return dataObject
        } else {
            var response = {
                '_error_message': 'Failed',
                '_status_Code': 400,
                '_status': 'Done',
                'result': ''
            }
            res.send(response)
        }
    })
}

function addToDoctorList(doctId, patientId) {
    documentObject.Doctor.findOne({ _id: doctId }, function (err, patientAdd) {
        if (err) {
            return 0
        } else {
            patientAdd.patients.push(patientId)
            patientAdd.save(function (err, success) {
                if (err) {
                    return 0
                } else {
                    // console.log(success)
                    return 1
                }
            })
        }
    })
}
module.exports.getPatientHeaderInfo = function (patientId, res, req) {
    log('in get patients details......')
    //steps:
    // 2. find height
    // 3. find weight
    // 1 .find patient information
    //4.calculate bsa
    // return results
    var flagDetails = [];
    var height = {};
    var weight = {};
    async.parallel([
        function (callback) {
            documentObject.Patient.find({ _id: patientId, isActive: true }, function (err, result) {
                if (err) {
                    var response = {
                        '_error_message': 'Error while processing request please check input',
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'none'
                    }
                    res.send(response)
                } else if (document.isFieldFilled(result)) {
                    console.log('Patient Found looking for allergies')
                    var responseObject = {}
                    responseObject.flag = true
                    // console.log(result);
                    result = Utility.mongoObjectToNormalObject(result);
                    delete result[0]['visitRecords'];
                    DOBDate = result[0].dob
                    var age = ((Date.now() - DOBDate) / (31557600000))
                    result[0].age = parseInt(age)
                    var days = (Date.now() - (result[0].registrationDate))
                    days = parseInt(days / (60 * 60 * 24 * 1000))
                    if (days === 1) {
                        result[0].ALOS = (days + ' day')
                    } else {
                        result[0].ALOS = (days + ' days')
                    }
                    documentObject.Allergies.find({
                        patientId: patientId,
                        "state": "active",
                        "severity": "severe"
                    }, function (err, allergyResult) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            documentObject.flag.find({
                                patientId: patientId,
                                flagValue: true,
                                is_active: true,
                                markError: false
                            }).populate({ path: '_m_flag', model: masterObject.m_flag }).sort({ timeStamp: -1 }).exec(function (err, flagResult) {
                                flagDetails = flagResult;
                                if (err) {
                                    var response = {
                                        '_error_message': 'Error while processing request please check input',
                                        '_status_Code': 406,
                                        '_status': 'error',
                                        'result': 'none'
                                    }
                                    res.send(response)
                                } else {
                                    documentObject.Visit.aggregate([
                                        {
                                            "$match": {
                                                "$or": [
                                                    { patientId: result[0]._id, IsCancel: { '$ne': true } },
                                                    { patientId: result[0]._id, isDemoPatient: true }
                                                ]
                                            }
                                        },
                                        { "$sort": { dateEpoch: -1 } },
                                        {
                                            $lookup: {
                                                from: "User",
                                                localField: "doctorId",
                                                foreignField: "userId",
                                                as: "doctor"
                                            }
                                        },
                                        { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
                                        {
                                            $project: {
                                                "_id": "$_id",
                                                "clinicalDepartment": "$clinicalDepartment",
                                                "primaryDoctor": "$primaryDoctor",
                                                "careProvider": "$careProvider",
                                                "location": "$searchBox.location",
                                                "VisitTypeID": "$VisitTypeID",
                                                "visitType": "$visitType",
                                                "visitDate": "$visitDate",
                                                "doctorId": "$doctorId",
                                                "patientId": "$patients",
                                                "OPD_IPD": "$OPD_IPD",
                                                "visitNo": "$visitNo",
                                                "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                                "HIS_PatientId": "$HIS_PatientId",
                                                "kinInfo": "$kinInfo",
                                                "OPD_IPD_ID": "$OPD_IPD_ID",
                                                "dateEpoch": "$dateEpoch",
                                                "doctor": {
                                                    "userId": "$doctor.userId",
                                                    "firstName": "$doctor.firstName",
                                                    "lastName": "$doctor.lastName",
                                                    "email": "$doctor.email",
                                                    "hisUserId": "$doctor.hisUserId",
                                                },
                                                "visitStatus": {
                                                    $cond: [{ $eq: ["$OPD_IPD", 1] }, 'IP', 'OP']
                                                }
                                            }
                                        }
                                    ], function (err, visitResult) {
                                        if (err) {
                                            var response = {
                                                '_error_message': 'Error while processing request please check input',
                                                '_status_Code': 406,
                                                '_status': 'error',
                                                'result': 'none'
                                            }
                                            res.send(response)
                                        } else if (visitResult.length) {
                                            if (visitResult[0].visitType === 'Admitted' || 'admitted') {
                                                result[0].visitStatus = 'IP'
                                            } else {
                                                result[0].visitStatus = 'OP'
                                            }
                                            responseObject.location = visitResult[0].location
                                            responseObject.careProvider = visitResult[0].careProvider
                                            responseObject.patientInfo = result
                                            responseObject.Allergies = allergyResult
                                            responseObject.flagResult = [];
                                            responseObject.visits = visitResult;
                                            responseObject.default_visit = null;
                                            async.eachSeries(visitResult, function (eachVisit, callback_eachSeries) {
                                                if (eachVisit.doctorId === req.decoded.userId) {
                                                    responseObject.default_visit = eachVisit._id;
                                                }
                                                callback_eachSeries();
                                            }, function () {
                                                if (!responseObject.default_visit)
                                                    responseObject.default_visit = visitResult[0]._id;
                                                callback(null, responseObject);
                                            });
                                        } else {
                                            responseObject.patientInfo = result
                                            responseObject.Allergies = allergyResult
                                            responseObject.flagResult = [];
                                            responseObject.visits = [];
                                            callback(null, responseObject)
                                        }
                                    });
                                }
                            })
                        }
                    })
                } else {
                    return res.json(Utility.output('Patient not found', 'ERROR'));
                    callback(null, { flag: false })
                }
            })
        },
        function (callback) {
            //heightId = '110fadab-6784-4c3f-ad0d-eadd078ec083'
            documentObject.Vital.findOne({
                patientId: patientId,
                vitalName: new RegExp("height", "i"),
                markError: false,
                unitId: { $exists: true }
            }).sort({ date: -1 }).exec(function (err, result) {
                if (err) {
                    log(err)
                    callback(err, null)
                } else {
                    // log(result)
                    height = result
                    callback(null, height)
                }
            })
        },
        function (callback) {
            var weightId = 'f9fae10e-9b8a-44cd-a674-c67f486c703d'
            documentObject.Vital.findOne({
                patientId: patientId,
                vitalName: new RegExp("weight", "i"),
                markError: false,
                unitId: { $exists: true }
            }).sort({ date: -1 }).exec(function (err, result) {
                if (err) {
                    log(err)
                    callback(err, null);
                } else {
                    log("Weight", result)
                    weight = result
                    callback(null, weight)
                }
            })
        }
    ], function (err, results) {
        if (err) {
        } else if (results[0].flag) {
            //console.log(results)
            log('calculating bsa')
            var BSA
            if (results[1] && results[2]) {
                BSA = (results[1].vitalValue * results[2].vitalValue);
                results[2].height = results[1].vitalValue;
                results[2].weight = results[2].vitalValue;
            } else {
                BSA = 0;
                results[2] = [];
                results[2].height = null;
                results[2].weight = null;
            }
            BSA = BSA / 3600
            BSA = Math.sqrt(BSA)

            results[0].bsa = BSA.toFixed(2);
            results[0].weight = results[2].weight;
            results[0].weight_unit = "kg";
            var flagColor = CONSTANT.flag_colors;
            async.eachSeries(flagDetails, function iteratee(eachFlag, callback_each) {
                var temp = JSON.parse(JSON.stringify(eachFlag));
                temp['flag_color'] = "#ffffff";
                if (eachFlag.flagType !== undefined) {
                    if (eachFlag.flagType) {
                        if (flagColor[eachFlag.flagType.toLowerCase()] !== undefined)
                            temp['flag_color'] = flagColor[eachFlag.flagType.toLowerCase()];
                    }
                }
                if (eachFlag._m_flag !== undefined) {
                    if (eachFlag._m_flag) {
                        if (flagColor[eachFlag._m_flag.Flag_Type.toLowerCase()] !== undefined)
                            temp['flag_color'] = flagColor[eachFlag._m_flag.Flag_Type.toLowerCase()];
                        temp.flagName = eachFlag._m_flag.Name;
                        temp.flagType = eachFlag._m_flag.Flag_Type;
                        delete temp._m_flag;
                    }
                }
                if (eachFlag.is_active === undefined)
                    temp['is_active'] = true;
                results[0].flagResult.push(temp);
                callback_each();
            }, function () {
                document.sendResponse('none', 200, 'done', results[0], res)
            });
        } else {
            document.sendResponse('patient not found', 404, 'error', "", res)
        }
    })
}

// Add FLAG to the patient

module.exports.addFlag = function (data, res) {
    // log("hit received")
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Failed',
                '_status_Code': 405,
                '_status': 'error',
                'result': 'Flag not added.'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var count = 0
            var resp = true
            for (var flag = 0; flag < data.flagList.length; flag++) {
                // log("flag counter:" + flag)
                var flagObj = data.flagList[flag];
                var mFlagID = '';
                if (flagObj._m_flag !== undefined)
                    if (Utility.checkObjectIdValidation(flagObj._m_flag))
                        mFlagID = new ObjectID(flagObj._m_flag);
                var flagSave = new documentObject.flag()
                flagSave._id = uuid.v4()
                flagSave.visitId = data.visitId
                flagSave.doctorId = data.doctorId
                flagSave.patientId = data.patientId
                flagSave.flagName = flagObj.flagName
                flagSave.flagValue = flagObj.flagValue
                flagSave.flagType = Utility.escape(flagObj.flagType)
                flagSave.timeStamp = Date.now(),
                    flagSave._m_flag = mFlagID;
                flagSave.is_active = true
                documentObject.flag.count({ flagName: flagSave.flagName, patientId: data.patientId, markError: false }, function (err, flagCount) {
                    if (err) {
                        log(err)
                    } else if (flagCount > 0) {
                        count = flagCount
                    } else {
                        log('saving flag')
                        flagSave.validate(function (err) {
                            if (err) {
                                var response = {
                                    '_error_message': err,
                                    '_status_Code': 407,
                                    '_status': 'Validation Error',
                                    'result': 'none'
                                }
                                res.send(response)
                            } else {
                                flagSave.save(function (err, flagSaved) {
                                    if (err) {
                                        var response = {
                                            '_error_message': err,
                                            '_status_Code': 406,
                                            '_status': 'Error in processing request',
                                            'result': 'none'
                                        }
                                        res.send(response)
                                    } else {
                                        var userData = {
                                            // "UserAudit_id": uuid.v4(),
                                            'userId': data.doctorId,
                                            'recordType': 'Flags',
                                            'recordId': flagSave._id,
                                            'action': 'Saving Patient Flags.',
                                            'subject': 'Patient',
                                            'subjectId': data.patientId,
                                            'timeStamp': Date.now()
                                        }
                                        if (flagSaved.flagValue) {
                                            syncFlag(flagObj, data.patientId)
                                            var parameters = {
                                                patientId: flagSaved.patientId,
                                                visitId: flagSaved.visitId,
                                                exchange: 'notification',
                                                key: 'flagAlert'
                                            }
                                            integrationModel.sendNotification(flagSaved, parameters);
                                        }
                                        user_audit.addUser_audit(userData)
                                    }
                                })
                            }
                        })
                    }
                    // log("flag count:" + flag)
                    if (flag + 1 >= data.flagList.length && resp) {
                        if (count > 0) {
                            resp = false
                            var response = {
                                '_error_message': 'Duplicate Flag Records',
                                '_status_Code': 405,
                                '_status': 'error',
                                'result': 'Flag not added.'
                            }
                            res.send(response)
                        } else {
                            resp = false
                            /*******************Edited By Harshal********************/
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': ' flag added succefully.'
                            }
                            res.send(response)
                            /*****************************************************/
                        }
                    }
                })
            }
        } else {
            var response = {
                '_error_message': 'invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Flag not added.'
            }
            res.send(response)
        }
    })
}

// Flag View

module.exports.getFlag = function (patientId, res) {
    log('in get patient flag ......')
    documentObject.flag.find({ patientId: patientId }).populate({ path: '_m_flag', model: masterObject.m_flag }).sort({ timeStamp: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var flags = [];
            var flagColor = CONSTANT.flag_colors;
            async.eachSeries(result, function iteratee(eachFlag, callback_each) {
                var temp = JSON.parse(JSON.stringify(eachFlag));
                temp['flag_color'] = "#ffffff";
                if (eachFlag.flagType !== undefined) {
                    if (eachFlag.flagType) {
                        if (flagColor[eachFlag.flagType.toLowerCase()] !== undefined)
                            temp['flag_color'] = flagColor[eachFlag.flagType.toLowerCase()];
                    }
                }
                if (eachFlag._m_flag !== undefined) {
                    if (eachFlag._m_flag) {
                        if (flagColor[eachFlag._m_flag.Flag_Type.toLowerCase()] !== undefined)
                            temp['flag_color'] = flagColor[eachFlag._m_flag.Flag_Type.toLowerCase()];
                        temp.flagName = eachFlag._m_flag.Name;
                        temp.flagType = eachFlag._m_flag.Flag_Type;
                        delete temp._m_flag;
                    }
                }
                if (eachFlag.is_active === undefined)
                    temp['is_active'] = true;
                flags.push(temp);
                callback_each();
            }, function () {
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': flags
                }
                res.send(response)
            });
        } else {
            return res.json(Utility.output('No flag has been found', 'SUCCESS', []));
        }
    })
}

// Update Flag value.

// Mark Error Flag value.

module.exports.flagError = function (data, res) {
    documentObject.flag.findOne({ _id: data.flagId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            result.markError = true
            var userData = {
                'userId': data.doctorId,
                'recordType': 'Flag',
                'recordId': data.flagName,
                'action': 'Marking Patient Flags as Error.',
                'subject': 'Patient',
                'subjectId': data.patientId,
                'timeStamp': Date.now()
            }
            user_audit.addUser_audit(userData)
            result.save(function (err, result) {
                if (err) {
                    var response = {
                        '_error_message': 'Error in operation',
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'Record Not marked as error.'
                    }
                    res.send(response)
                } else {
                    var response = {
                        '_error_message': 'none',
                        '_status_Code': 200,
                        '_status': 'Done',
                        'result': 'Flag Marked error successfully.'
                    }
                    res.send(response)
                }
            })
        } else {
            var response = {
                '_error_message': 'Flag not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        }
    })
}

// updateing flag value

module.exports.updateFlag = function (data, res) {
    documentObject.flag.findOne({ _id: data.flagId }, function (err, result) {
        if (err) {
            return res.json(Utility.output(err, "ERROR"));
        } else if (document.isFieldFilled(result)) {
            result.flagValue = data.flagValue;
            result.is_active = true;
            result.timeStamp = new Date().getTime();
            if (data.is_active === "false" || data.is_active === false) {
                result.is_active = false;
                result.flagValue = false;
            }
            var userData = {
                'userId': data.doctorId,
                'recordType': 'Flag',
                'recordId': data.flagName,
                'action': 'Updating Patient Flag.',
                'subject': 'Patient',
                'subjectId': data.patientId,
                'timeStamp': Date.now()
            }
            user_audit.addUser_audit(userData)
            result.save(function (err, result) {
                if (err) {
                    return res.json(Utility.output(err, "ERROR"));
                } else {
                    var response = {
                        '_error_message': 'none',
                        '_status_Code': 200,
                        '_status': 'Done',
                        'result': 'Flag updated successfully.'
                    }
                    res.send(response)
                }
            })
        } else {
            var response = {
                '_error_message': 'Flag not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        }
    })
}

// Intake and OutPut Add

module.exports.intakeOutputAdd = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = { '_status': 'somthing went wrong please try again' }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var intakeOutput = new documentObject.intakeOutput()
            intakeOutput.patientId = data.patientId
            intakeOutput.intakeOutputType = data.intakeOutputType
            intakeOutput.value = data.value
            intakeOutput.qualifiers = data.qualifiers
            intakeOutput._id = uuid.v4()
            intakeOutput.timeStamp = data.timeStamp
            intakeOutput.parameter = data.parameter
            intakeOutput.POPFlag = data.POPFlag
            intakeOutput.visitId = data.visitId
            intakeOutput.doctorId = data.doctorId

            intakeOutput.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    intakeOutput.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': data.doctorId,
                                'recordType': 'Intake/Output',
                                'recordId': intakeOutput._id,
                                'action': 'Saving Patient intake Output.',
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Intake/Output record added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            // log("user  not found")
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

// Intake and Output View

module.exports.getIntakeOutput = function (patientId, res) {
    log('in get patient Intake / Output ......')
    documentObject.intakeOutput.find({ patientId: patientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

// Intake Output Get Results by date

module.exports.getIntOutByDate = function (patientId, upper, lower, res) {
    log('in get patient lab order results by date ......')
    var totalIntake = 0, totalOutput = 0
    var resObj = {}
    documentObject.intakeOutput.find({
        patientId: patientId, timeStamp: {
            $gte: lower,
            $lte: upper
        }
    }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (result.length > 0) {
            var length = result.length
            result.forEach(function (item, index) {
                // calculate total intake and output
                if (document.isFieldFilled(item.value) && item.markError == false && item.intakeOutputType.toLowerCase() == 'intake') {
                    totalIntake += item.value
                } else if (document.isFieldFilled(item.value) && item.markError == false) {
                    totalOutput += item.value
                }
                // sending response
                if (index >= length - 1) {
                    resObj.totalIntake = totalIntake
                    resObj.totalOutput = totalOutput
                    resObj.results = result
                    var response = {
                        '_error_message': 'None',
                        '_status_Code': 200,
                        '_status': 'done',
                        'result': resObj
                    }
                    res.send(response)
                }
            })
        } else {
            // no records for given time 
            resObj.totalIntake = totalIntake
            resObj.totalOutput = totalOutput
            resObj.results = []
            document.sendResponse('None', 200, 'done', resObj, res)
        }
    })
}

// Intake Output Mark Error

module.exports.intakeOutputError = function (intakeOutputId, doctorId, PatientId, res) {
    documentObject.intakeOutput.findOne({ _id: intakeOutputId, patientId: PatientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in operation',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            result.markError = true
            result.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    result.save(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error in operation',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'Record Not marked as error.'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': doctorId,
                                'recordType': 'Intake Output',
                                'recordId': intakeOutputId,
                                'action': 'Marking Patient Intake output as Error.',
                                'subject': 'Patient',
                                'subjectId': PatientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'intakeOutput Marked error successfully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Record not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'Record Not marked as error.'
            }
            res.send(response)
        }
    })
}

module.exports.patientInfoByMrn = function (p_mrn, res) {
    documentObject.Patient.findOne({ mrn: p_mrn })
        .populate({
            path: 'visitRecords',
            model: 'Visit',
            sort: { 'date': -1 }
        })
        .limit(1)
        .exec(function (err, resultByMrn) {
            if (err) {
                res.send(406)
            } else if (!resultByMrn) {
                res.send(406)
            } else {
                res.json(resultByMrn, 200)
            }
        })
}

// Get Patient Details

module.exports.getAllPatientDetails = function (doctorId, res) {
    // console.log("doctorId: " + doctorId)
    documentObject.Doctor.findOne({ _id: doctorId })
        .populate(
            {
                path: 'patients',
                model: 'Patient'
            })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'invalid doctorId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                // console.log("found patients: "+result)
                var options = {
                    path: 'patients.visitRecords',
                    model: 'Visit',
                    sort: { 'patients.visitRecords.dateEpoch': -1 }
                }
                // populate docotrVisit from patients by doctorid            
                documentObject.Visit.populate(result, options, function (err, result1) {
                    if (err) {
                        var response = {
                            '_error_message': 'No visit Records for doctor',
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'Record Not found'
                        }
                        res.send(response)
                    } else {
                        if (result1.patients.length === 0) {
                            var response = {
                                '_error_message': 'No patient on  Records for doctor',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'Record Not found'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'done',
                                'result': result1
                            }
                            res.send(response)
                        }
                    }
                })
            } else {
                // console.log("response:" + result)
                var response = {
                    '_error_message': 'No patient on  Records for doctor',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            }
        })
}
module.exports.getAllPatients = function (doctorId, res) {
    // console.log("doctorId: " + doctorId)
    documentObject.Doctor.findOne({ _id: doctorId })
        .populate(
            {
                path: 'patients',
                model: 'Patient',
                populate: { path: 'visitRecords', model: 'Visit', options: { sort: { 'dateEpoch': -1 }, limit: 1 } },
                options: { sort: { 'visitRecords.dateEpoch': 1 } }
            })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'invalid doctorId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                // console.log("found patients: "+result)        
                document.sendResponse('none', 200, 'done', result, res)
            } else {
                // console.log("response:" + result)
                var response = {
                    '_error_message': 'No patient on  Records for doctor',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            }
        })
}

module.exports.getAllPatientsToVisit = function (req, res) {
    let userId = req.params.userId
    // log(date)
    let userType = req.decoded.userType;
    let resultObj = [];
    let matchQuery = {
        "$or": [
            { "doctorId": userId, "isActive": 'true', "IsCancel": { '$ne': true } },
            { "isDemoPatient": true }
        ]
    };
    async.waterfall([
        function (cb_main) {
            // step 1 check usertype is nurse or not
            if (userType != undefined && userType.toLowerCase() == 'staff') {
                nursingController.userStationsAccess(userId, false, function (err, docs) {
                    if (err) {
                        cb_main(err)
                    } else if (docs.stationResult.length > 0) {
                        matchQuery["$or"] = [
                            { 'searchBox.bedNo': { $in: docs.stationResult[0].bedNumbers }, "isActive": 'true', "IsCancel": { '$ne': true } },
                            // { "isDemoPatient": true },
                            { 'searchBox.bedNo': { $in: docs.stationResult[0].bedIDs }, "isActive": 'true', "IsCancel": { '$ne': true } },
                        ]
                        cb_main();
                    } else {
                        // no nursing station found
                        matchQuery["$or"] = [
                            { 'searchBox.bedNo': { $in: [] }, "isActive": 'true', "IsCancel": { '$ne': true } },
                            { 'searchBox.bedNo': { $in: [] }, "isActive": 'true', "IsCancel": { '$ne': true } },
                        ]
                        cb_main();
                    }
                })
            } else {
                cb_main();
            }
        }, function (cb_main) {
            // console.log(matchQuery)
            documentObject.Visit.find(matchQuery)
                .populate({ path: 'patientId', model: 'Patient' })
                .sort({ visitDate: -1 })
                .exec(function (err, visitResults) {
                    if (err) {
                        cb_main(err);
                    } else {
                        var currentDate = new Date();
                        var patientExists = {};
                        visitResults = Utility.mongoObjectToNormalObject(visitResults);

                        var today = new Date((currentDate.getMonth() + 1) + "/" + currentDate.getDate() + "/" + currentDate.getFullYear() + " GMT +8");
                        async.eachSeries(visitResults, function (eachVisit, callback_each) {
                            if (!eachVisit.patientId.isActive)
                                return callback_each();
                            cpoeDocument.CpoeOrder.findOne({
                                //"_id":"988be23b-c65a-4ae7-9b47-cb52b9d9bb21"
                                'orderItems.attentionDoctorId': userId,
                                'orderCategory': 'procedure order',
                                "orderStatus": { "$in": ["active", "pending"] }, //Keep pending status till intregation setup HIS[OT]
                                "patientId": eachVisit.patientId._id,
                                "orderItems.clinicalIndicateDate": today.getTime()
                            }, function (err, cpoeOrder) {
                                if (err) {
                                    cb_main(err);
                                }
                                if (cpoeOrder) {
                                    eachVisit.visitType = "surgery";
                                    eachVisit.surgeryDetails = cpoeOrder.orderItems;
                                }
                                if (patientExists[eachVisit.patientId._id] === undefined) {
                                    eachVisit['last_visit'] = null;
                                    async.parallel([
                                        function (callback_inner2) {
                                            documentObject.flag.findOne({ patientId: eachVisit.patientId._id, flagValue: true, is_active: true, markError: false }).populate({ path: '_m_flag', model: masterObject.m_flag }).sort({ timeStamp: -1 }).exec(function (err, flagResult) {
                                                if (flagResult) {
                                                    eachVisit.flag = flagResult._m_flag.Name;
                                                }
                                                else {
                                                    eachVisit.flag = "";
                                                }
                                                callback_inner2();
                                            });
                                        },
                                        function (callback_inner2) {
                                            documentObject.Complaint.findOne({ patientId: eachVisit.patientId._id, status: "active" }).sort({ date: -1 }).exec(function (err, complaint) {
                                                if (complaint) {
                                                    eachVisit.primaryDiagnosis = complaint.description;
                                                }
                                                else {
                                                    eachVisit.primaryDiagnosis = "";
                                                }
                                                callback_inner2();
                                            });
                                        },
                                    ], function () {
                                        resultObj.push(eachVisit);
                                        patientExists[eachVisit.patientId._id] = { location: resultObj.length - 1, number_of_hit: 1 };
                                        callback_each();
                                    });
                                } else {
                                    if (patientExists[eachVisit.patientId._id].number_of_hit === 1) {
                                        resultObj[patientExists[eachVisit.patientId._id].location]['last_visit'] = eachVisit.visitDate;
                                        patientExists[eachVisit.patientId._id].number_of_hit += 1;
                                    }
                                    callback_each();
                                }
                            });
                        }, function () {
                            // document.sendResponse('', 200, '', resultObj, res)
                            cb_main();
                        });
                    }
                })
        }
    ], function (err) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing',
                '_status_Code': 406,
                '_status': 'error',
                'result': err
            }
            res.send(response)
        } else {
            document.sendResponse('', 200, resultObj.length + " records found", resultObj, res)
        }
    })


};



module.exports.mapDiagnosisToProblem = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, res_patient) {
        if (err) {
            var response = {
                '_error_message': 'Request not processed, Provide correct input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!res_patient) {
            var response = {
                '_error_message': 'User not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            documentObject.MappedComplaint.findOne({ diagnosis: data.diagnosis }, function (err, alreadyMapped) {
                if (err) {
                    var response = {
                        '_error_message': 'Request not processed, Provide correct input',
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'none'
                    }
                    res.send(response)
                } else if (alreadyMapped) {
                    if (Array.isArray(data.problems)) {
                        // data.problems.forEach(function (element, index) {
                        // complaintToSave.problems.push(element)
                        // }, this)
                        alreadyMapped.problems = data.problems
                    }
                    alreadyMapped.save(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Unable to save Dignosis',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'done',
                                'result': 'Dignosis saved'
                            }
                            res.send(response)
                        }
                    })
                } else {
                    documentObject.Complaint.findOne({ _id: data.diagnosis }, function (err, res_diag) {
                        if (err) {
                            var response = {
                                '_error_message': 'Request not processed, Provide correct input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else if (!res_diag) {
                            var response = {
                                '_error_message': 'Diagnosis not found',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            if (res_diag.type == 'primary' || res_diag.type == 'secondary') {
                                var complaintToSave = new documentObject.MappedComplaint()
                                complaintToSave._id = uuid.v4()
                                complaintToSave.patientId = data.patientId
                                complaintToSave.visitId = data.visitId
                                complaintToSave.diagnosis = data.diagnosis
                                if (Array.isArray(data.problems)) {
                                    // data.problems.forEach(function (element, index) {
                                    //     complaintToSave.problems.push(element)
                                    // }, this)
                                    complaintToSave.problems = data.problems
                                }
                                complaintToSave.save(function (err, result) {
                                    if (err) {
                                        var response = {
                                            '_error_message': 'Unable to save Dignosis',
                                            '_status_Code': 406,
                                            '_status': 'error',
                                            'result': 'none'
                                        }
                                        res.send(response)
                                    } else {
                                        var response = {
                                            '_error_message': 'none',
                                            '_status_Code': 200,
                                            '_status': 'done',
                                            'result': 'Dignosis saved'
                                        }
                                        res.send(response)
                                    }
                                })
                            } else {
                                var response = {
                                    '_error_message': 'Selected problem is not a Diagnosis.',
                                    '_status_Code': 406,
                                    '_status': 'error',
                                    'result': 'none'
                                }
                                res.send(response)
                            }
                        }
                    })
                }
            })
        }
    })
}

module.exports.addPatientComplaints = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
        if (!result) {
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            return res.json(response)
        }
        documentObject.Complaint.count({
            patientId: result._id,
            icdCode: data.icdCode,
            status: { $in: ["active", "inactive"] }
        }, function (err, existComplaint) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            if (existComplaint) {
                var response = {
                    '_error_message': 'Duplicate Complaint Record',
                    '_status_Code': 405,
                    '_status': 'error',
                    'result': 'Complaint not added.'
                }
                return res.json(response)
            }
            var complaintToSave = new documentObject.Complaint()
            complaintToSave._id = uuid.v4()
            complaintToSave.doctorId = data.doctorId
            complaintToSave.doctorName = data.doctorName
            complaintToSave.patientId = result._id
            complaintToSave.icdCode = data.icdCode
            complaintToSave.description = data.description
            complaintToSave.text_problem = data.text_problem
            complaintToSave.status = data.status
            complaintToSave.displayName = data.displayName
            if (data.type != 'primary' && data.type != 'secondary') {
                complaintToSave.type = 'problem'
            } else {
                complaintToSave.type = data.type
            }
            complaintToSave.severity = data.severity
            complaintToSave.date = data.date
            complaintToSave.visitId = data.visitId
            complaintToSave.duration = data.duration
            complaintToSave.comments = data.comments
            complaintToSave.createdOn = Date.now()
            complaintToSave.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    return res.json(response)
                }
                complaintToSave.save(function (err) {
                    if (err) {
                        var response = {
                            '_error_message': 'Error while processing request please check input',
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'none'
                        }
                        return res.json(response)
                    }
                    var userData = {
                        // "UserAudit_id": uuid.v4(),
                        'userId': data.doctorId,
                        'recordType': 'Complaints',
                        'recordId': complaintToSave._id,
                        'action': 'Saving Patient Complaints.',
                        'subject': 'Patient',
                        'subjectId': data.patientId,
                        'timeStamp': Date.now()
                    }
                    syncComplaints(data, complaintToSave)
                    user_audit.addUser_audit(userData)
                    var response = {
                        '_error_message': 'None',
                        '_status_Code': 200,
                        '_status': 'done',
                        'result': ' Complaint added succefully.'
                    }
                    return res.json(response)
                })
            })
        });
    });
}

module.exports.getPatientAllComplaints = function (patientId, res) {
    documentObject.Complaint.find({ patientId: patientId })
        .sort({ createdOn: -1 })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'invalid input',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': result
                }
                res.send(response)
            }
        })
}

module.exports.getPatientAllComplaintsActive = function (patientId, res) {
    log('in get patient patient complaints which are active ......')
    documentObject.Complaint.find({ patientId: patientId, status: 'active' }).sort({ createdOn: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': ' ',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': '',
                '_status_Code': 406,
                '_status': 'Complaints Not found',
                'result': ''
            }
            res.send(response)
        }
    })
}

module.exports.getPatientComplaintsByVisit = function (patientId, visitId, res) {
    documentObject.Complaint.find({ visitId: visitId, patientId: patientId }).sort({ createdOn: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}

module.exports.setComplaintError = function (complaintId, PatientId, data, res) {
    documentObject.Complaint.findOne({ _id: complaintId, patientId: PatientId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'invalid input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            if (result.status === 'error') {
                var response1 = {
                    '_error_message': 'The result is already marked as Error.',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response1)
            } else {
                if (data.status === 'error') {
                    result.status = 'error'
                } else if (data.status === 'active' && result.status != 'error') {
                    result.status = 'active'
                } else if (data.status === 'inactive' && result.status != 'error') {
                    result.status = 'inactive'
                }

                var userData = {
                    // "UserAudit_id": uuid.v4(),
                    'userId': data.doctorId,
                    'recordType': 'Complaints',
                    'recordId': complaintId,
                    'action': 'Marking Patient complaints as Active/Inactive/Error.',
                    'subject': 'Patient',
                    'subjectId': PatientId,
                    'timeStamp': Date.now()
                }
                user_audit.addUser_audit(userData)
                result.validate(function (err) {
                    if (err) {
                        var response = {
                            '_error_message': err,
                            '_status_Code': 407,
                            '_status': 'Validation Error',
                            'result': 'none'
                        }
                        res.send(response)
                    } else {
                        result.save(function (err) {
                            if (err) {
                                var response = {
                                    '_error_message': 'unable to process the request',
                                    '_status_Code': 201,
                                    '_status': 'error',
                                    'result': 'none'
                                }
                                res.send(response)
                            } else {
                                var response = {
                                    '_error_message': 'none',
                                    '_status_Code': 200,
                                    '_status': 'done',
                                    'result': 'complaint updated successfully'
                                }
                                res.send(response)
                            }
                        })
                    }
                })
            }
        } else {
            var response = {
                '_error_message': 'invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.updatePatientDocument = function (data, idObj, res) {
    if (data.isSigned) {
        var response = {
            '_error_message': 'Template is not editable',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    } else {
        var dataToSet = {
            title: data.title,
            isSigned: data.isSigned,
            updatedOn: Date.now(),
            signedOn: (data.isSigned) ? Date.now() : '',
            filledDocument: data.template,
            preview: data.preview
        }

        documentObject.PatientDocument.findOneAndUpdate({ _id: idObj.documentId }, dataToSet, function (err, success) {
            if (err) {
                var response = {
                    '_error_message': 'Request Processing error',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (!success) {
                var response = {
                    '_error_message': 'unsaved document',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': '',
                    '_status_Code': 200,
                    '_status': 'Document Updated Successfully',
                    'result': 'none'
                }
                res.send(response)
            }
        })
    }

}

module.exports.postPatientDocument = function (data, idObj, res) {
    var patientDoc = new documentObject.PatientDocument()
    patientDoc._id = uuid.v4();
    patientDoc.title = data.title
    patientDoc.doctorId = data.doctorId
    patientDoc.patientId = idObj.patientId
    patientDoc.visitId = idObj.visitId
    patientDoc.isSigned = data.isSigned
    patientDoc.observerList.push(
        {
            doctorId: data.doctorId,
            isSigned: (data.isSigned) ? data.isSigned : false
        }
    )
    patientDoc.signedOn = (data.isSigned) ? Date.now() : '';
    patientDoc.filledDocument = data.template
    patientDoc.preview = data.preview;
    patientDoc.save(function (err, docSave) {
        if (err) {
            var response = {
                '_error_message': 'Patient Template not Saved',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': '',
                '_status_Code': 200,
                '_status': 'done',
                'result': docSave._id
            }
            res.send(response)
        }
    })
}

module.exports.getFilledPatientDocument = function (data, res) {
    documentObject.PatientDocument.findOne({ _id: data.documentId }, function (err, savedDocument) {
        if (err) {
            var response = {
                '_error_message': 'Request Processing error',
                '_status_Code': 406,
                '_status': 'Error',
                'result': ''
            }
            res.send(response)
        } else if (!savedDocument) {
            var response = {
                '_error_message': 'Document not found',
                '_status_Code': 406,
                '_status': 'Error',
                'result': ''
            }
            res.send(response)
        } else {
            if (savedDocument.isSigned) {
                //console.log("Info")
                documentObject.User.findOne({ userId: savedDocument.doctorId }, 'hospitalName prefix email lastName firstName unitDepartments', function (err, doctorInfo) {
                    if (err) {
                        var response = {
                            '_error_message': err.message,
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': ""
                        }
                        res.send(response)
                    } else {
                        //console.log("DoctorInfo: "+JSON.stringify(doctorInfo))
                        savedDocument.doctorInfo = doctorInfo
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': savedDocument
                        }
                        res.send(response)
                    }
                })
            } else {
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': savedDocument
                }
                res.send(response)
            }
        }
    })
}

module.exports.getPatientDocument = function (data, res) {
    var query = {};
    query['LocationId'] = parseInt(data.location)

    if (data.category != undefined || data.category != null){
        query['ID'] = data.category
    }
    console.log("Query: "+JSON.stringify(query));

    masterObject.m_template_category.aggregate([
        {
            $match: query
        }, {
            $group:
                {
                    _id: "LocationId",
                    category: { $push: "$ID" },
                    description: { $push: "$Category" }
                }
        }
    ], (err, success) => {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else {
            if (!success.length) {
                return res.json(Utility.output('No master template has been found', 'ERROR'));
            }

            var catogories = success[0].category.concat(success[0].description);

            documentObject.PatientDocument.aggregate([
                {
                    $match: {
                        $and: [
                            { 'filledDocument.template.template.category': { $in: catogories } },
                            { patientId: data.patientId },
                            { visitId: data.visitId }
                        ]
                    }
                },
                { $unwind: { path: "$observerList", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "User",
                        localField: "observerList.doctorId",
                        foreignField: "userId",
                        as: "doctor"
                    }
                },
                { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "doctorId": "$doctorId",
                        "patientId": "$patientId",
                        "visitId": "$visitId",
                        "isSigned": "$isSigned",
                        "_id": "$_id",
                        "title": "$title",
                        "preview": '$preview',
                        "category": "$filledDocument.template.template.category",
                        "subCategory":"$filledDocument.template.template.subCategory",
                        "observerList": {
                            "doctorId": "$observerList.doctorId",
                            "doctorName": "$doctor.firstName",
                            "isSigned": "$observerList.isSigned",
                            "signedOn": "$observerList.signedOn"
                        }
                    }
                }, {
                    $match: {
                        $and: [
                            { "observerList.doctorId": data.doctorId },
                        ]
                    }
                },
                { "$sort": { 'observerList.signedOn': -1 } }
            ], (err, results) => {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                else {
                    // return res.json(Utility.output(err, 'SUCCESS', results));
                    if (
                        (parseInt(data.location) == 1 && data.category == 12) || (parseInt(data.location) == 1 && data.category == undefined)
                    ) {
                        console.log("Its Executing");
                        documentObject.continuous_notes.aggregate([
                            {
                                $match: {
                                    patientId: data.patientId,
                                    visitId: data.visitId
                                }
                            },
                            { "$sort": { 'date_of_modification': -1 } },
                            {
                                $lookup: {
                                    from: "User",
                                    localField: "userId",
                                    foreignField: "userId",
                                    as: "User"
                                },
                            },
                            { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
                            {
                                $group: {
                                    _id: "$visitId",
                                    doctorId: { $first: "$userId" },
                                    doctorName: { $first: "$User.firstName" },
                                    visitId: { $first: "$visitId" },
                                    signedOn: { $first: "$date_of_modification" },
                                    patientId: { $last: "$patientId" },
                                    title: { $first: "$treatment" }
                                }
                            },
                            {
                                $project: {
                                    observerList: {
                                        "doctorId": "$doctorId",
                                        "doctorName": "$doctorName",
                                        "isSigned": "true",
                                        "signedOn": "$signedOn"
                                    },
                                    visitId: "$visitId",
                                    patientId: "$patientId",
                                    isContinuousNote: "true",
                                    category: "12",
                                    title: "Progress Note"
                                }
                            }
                        ], function (err, continousNote) {
                            console.log(err);
                            var returnObj = [];
                            if (continousNote !== undefined)
                                returnObj = continousNote;
                            returnObj = returnObj.concat(results);
                            returnObj.sort(function (a, b) {
                                return b.observerList.signedOn - a.observerList.signedOn;
                            });
                            return res.json(Utility.output(err, 'SUCCESS', returnObj));
                        });
                    } else
                        return res.json(Utility.output(err, 'SUCCESS', results));
                }
            })
        }
    })
}

module.exports.getPatientDocumentWithSubcategory = function (data, res) {
    var query = {
        $and: [
            { 'filledDocument.template.template.category': data.category },
            { patientId: data.patientId },
            { visitId: data.visitId },
            { 'filledDocument.template.template.subCategory': data.subcategory }
        ]
    }
    documentObject.PatientDocument.aggregate([
        {
            $match: query
        },
        { $unwind: { path: "$observerList", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "User",
                localField: "observerList.doctorId",
                foreignField: "userId",
                as: "doctor"
            }
        },
        { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "doctorId": "$doctorId",
                "patientId": "$patientId",
                "visitId": "$visitId",
                "isSigned": "$isSigned",
                "_id": "$_id",
                "title": "$title",
                "preview": '$preview',
                "observerList": {
                    "doctorId": "$observerList.doctorId",
                    "doctorName": "$doctor.firstName",
                    "isSigned": "$observerList.isSigned",
                    "signedOn": "$observerList.signedOn"
                }
                // {
                //     $filter: {
                //         input: "$observerList",
                //         as: "item",
                //         cond: {$and:[
                //             {$eq: ['$$item.doctorId', data.doctorId]},
                //             {$eq: ['$$item.isSigned', "true"]}
                //         ] }
                //     }
                // }
            }
        },
        // {
        //     $project: {
        //         "doctorId": "$doctorId",
        //         "patientId": "$patientId",
        //         "visitId": "$visitId",
        //         "isSigned": "$isSigned",
        //         "_id": "$_id",
        //         "title": "$title",
        //         "observerList": "$observerList"
        //     }
        // }, 
        {
            $match: {
                $and: [
                    { "observerList.doctorId": data.doctorId },
                ]
            }
        },
        { "$sort": { 'observerList.signedOn': -1 } }
    ], (err, results) => {
        if (err)
            return res.json(Utility.output(err, 'ERROR'));
        else
            return res.json(Utility.output(err, 'SUCCESS', results));
    })
    // documentObject.PatientDocument.find({
    //     $and: [
    //         { 'filledDocument.template.template.category': data.category },
    //         { patientId: data.patientId },
    //         { visitId:data.visitId},
    //         { 'filledDocument.template.template.subCategory': data.subcategory }
    //     ]
    // }, 'isSigned doctorId title updatedOn signedOn').populate({
    //     path: 'doctorId',
    //     model: 'Doctor',
    //     select: 'firstName'
    // }).exec(function (err, results) {
    //     if (err) {
    //         var response = {
    //             '_error_message': 'Request processing input',
    //             '_status_Code': 406,
    //             '_status': 'error',
    //             'result': 'none'
    //         }
    //         res.json(response)
    //     } else {
    //         var response = {
    //             '_error_message': '',
    //             '_status_Code': 200,
    //             '_status': 'done',
    //             'result': results
    //         }
    //         res.json(response)
    //     }
    // })
}

module.exports.getSignedPatientDocument = function (data, res) {
    masterObject.m_template_category.aggregate([
        {
            $match: { LocationId: parseInt(data.location) }
        }, {
            $group:
                {
                    _id: "LocationId",
                    category: { $push: "$ID" },
                    description: { $push: "$Category" }
                }
        }
    ], (err, success) => {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else {
            if (!success.length)
                return res.json(Utility.output('No master template has been found', 'ERROR'));
            var catogories = success[0].category.concat(success[0].description);
            console.log(JSON.stringify(catogories));
            documentObject.PatientDocument.aggregate([
                {
                    $match: {
                        $and: [
                            { 'filledDocument.template.template.category': { $in: catogories } },
                            { patientId: data.patientId },
                            { visitId: data.visitId }
                        ]
                    }
                },
                { $unwind: { path: "$observerList", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "User",
                        localField: "observerList.doctorId",
                        foreignField: "userId",
                        as: "doctor"
                    }
                },
                { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "doctorId": "$doctorId",
                        "patientId": "$patientId",
                        "visitId": "$visitId",
                        "isSigned": "$isSigned",
                        "_id": "$_id",
                        "title": "$title",
                        "preview": '$preview',
                        "observerList": {
                            "doctorId": "$observerList.doctorId",
                            "doctorName": "$doctor.firstName",
                            "isSigned": "$observerList.isSigned",
                            "signedOn": "$observerList.signedOn"
                        }
                    }
                }, {
                    $match: {
                        $and: [
                            //{ "observerList.doctorId": data.doctorId },
                            { "observerList.isSigned": "true" }
                        ]
                    }
                },
                { "$sort": { 'observerList.signedOn': -1 } }
            ], (err, results) => {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                else {
                    if (parseInt(data.location) === 1) {
                        documentObject.continuous_notes.aggregate([
                            {
                                $match: {
                                    patientId: data.patientId,
                                    visitId: data.visitId
                                }
                            },
                            { "$sort": { 'date_of_modification': -1 } },
                            {
                                $lookup: {
                                    from: "User",
                                    localField: "userId",
                                    foreignField: "userId",
                                    as: "User"
                                },
                            },
                            { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
                            {
                                $group: {
                                    _id: "$visitId",
                                    doctorId: { $first: "$userId" },
                                    doctorName: { $first: "$User.firstName" },
                                    visitId: { $first: "$visitId" },
                                    signedOn: { $first: "$date_of_modification" },
                                    patientId: { $last: "$patientId" },
                                    title: { $first: "$treatment" }
                                }
                            },
                            {
                                $project: {
                                    observerList: {
                                        "doctorId": "$doctorId",
                                        "doctorName": "$doctorName",
                                        "isSigned": "true",
                                        "signedOn": "$signedOn"
                                    },
                                    visitId: "$visitId",
                                    patientId: "$patientId",
                                    isContinuousNote: "true",
                                    title: "Progress Note"
                                }
                            }
                        ], function (err, continousNote) {
                            console.log(err);
                            var returnObj = [];
                            if (continousNote !== undefined)
                                returnObj = continousNote;
                            returnObj = returnObj.concat(results);
                            returnObj.sort(function (a, b) {
                                return b.observerList.signedOn - a.observerList.signedOn;
                            });
                            return res.json(Utility.output(err, 'SUCCESS', returnObj));
                        });
                    } else
                        return res.json(Utility.output(err, 'SUCCESS', results));
                }
            })
        }
    })
}

module.exports.signTemplate = function (data, res) {
    try {
        console.log("Sign Template called.")
        documentObject.User.findOne({ userId: data.doctorId }, function (err, success) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            } else if (!success) {
                return res.json(Utility.output('Doctor Not found', 'ERROR'));
            } else {
                if (success.signCode === data.signCode) {
                    var signedDoctor = {
                        doctorId: data.doctorId,
                        isSigned: true,
                        signedOn: Date.now()
                    }
                    documentObject.PatientDocument.findOne({ _id: data.documentId }, function (err, done) {
                        if (err) {
                            return res.json(Utility.output(err, 'ERROR'));
                        } else if (!done) {
                            return res.json(Utility.output('Document Not found', 'ERROR'));
                        } else {
                            let index = done.observerList.findIndex(obj => obj.doctorId == data.doctorId)
                            done.observerList[index] = signedDoctor;
                            if (document.isFieldFilled(data.cosigner)) {
                                log("Cosigner: " + data.cosigner)
                                if (done.observerList.findIndex(obj => obj.doctorId == data.cosigner) < 0)
                                    done.observerList.push({ doctorId: data.cosigner });
                            }
                            log(JSON.stringify(done.observerList));
                            done.save(function (err, saved) {
                                if (err) {
                                    return res.json(Utility.output('Document not signed', 'ERROR'));
                                } else {
                                    return res.json(Utility.output('Document Signed', 'SUCCESS'));
                                }
                            })
                        }
                    })
                } else {
                    return res.json(Utility.output('Incorrect Signature', 'ERROR'));
                }
            }
        })
    } catch (err) {
        return res.json(Utility.output(err, 'ERROR'));
    }
}

module.exports.getPatientSchema = function (res) {
    var sch = documentObject.Patient.schema
    var template = {}
    var schema = {}
    for (var key in sch.paths) {
        schema[key] = 'false'
    }

    template['patient'] = schema
    template['vitals'] = ['TEMPERATURE', 'PULSE', 'RESPIRATION', 'BLOOD PRESSURE', 'PULSE OXIMETRY', 'WEIGHT', 'HEIGHT']
    template['labs'] = {
        status: 'Active'
    }
    var response = {
        '_error_message': '',
        '_status_Code': 200,
        '_status': 'done',
        'result': template
    }
    res.json(response)
}

var getDoctorVisitsByDate = function (doctorId, upper, lower, res) {

    documentObject.Doctor.findOne({ _id: doctorId })
        .populate({
            path: 'patients'
        })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Invalid DoctorId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                console.log('found patients')
                var options = {
                    path: 'patients.visitRecords',
                    model: 'Visit',
                    match: { doctorId: doctorId, dateEpoch: { $gte: lower, $lte: upper } },
                    sort: { 'date': -1 },
                    limit: 1

                }
                // populate docotrVisit from patients by doctorid            
                documentObject.Visit.populate(result, options, function (err, result1) {
                    if (err) {
                        var response = {
                            '_error_message': 'Invalid DoctorId',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    } else {
                        var resultMrn = []
                        result1.patients.forEach(function (element, index) {
                            if (element.visitRecords.length > 0) {
                                resultMrn.push(element)
                            }
                        }, this)
                        var response = {
                            '_error_message': '',
                            '_status_Code': 200,
                            '_status': 'Done',
                            'result': resultMrn
                        }
                        res.send(response)
                    }
                })
            } else {
                // console.log("response:" + result)
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': []
                }
                // var response = { "_status": "no patients on records" }
                res.send(response)
            }
        })

}

module.exports.getSearchList = function (criteria, res) {
    var searchBy = criteria.searchBy
    switch (criteria.searchBy) {
        case 'date':
            getDoctorVisitsByDate(criteria.doctorId, criteria.upper, criteria.lower, res)
            break;
        case 'mrn':
            documentObject.Doctor.findOne({ _id: criteria.doctorId })
                .populate({
                    path: 'patients'
                })
                .exec(function (err, result) {
                    if (err) {
                        // var response = { "_status": "invalid doctorId" }
                        var response = {
                            '_error_message': 'Invalid DoctorId',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                        console.log('found patients')
                        var options = {
                            path: 'patients.visitRecords',
                            model: 'Visit',
                            sort: { 'date': -1 }
                        }
                        // populate docotrVisit from patients by doctorid            
                        documentObject.Visit.populate(result, options, function (err, result1) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Invalid DoctorId',
                                    '_status_Code': 406,
                                    '_status': '',
                                    'result': ''
                                }
                                res.send(response)
                            } else {
                                var resultMrn = []
                                result1.patients.forEach(function (element, index) {
                                    var regex = new RegExp(criteria.searchValue, 'i')
                                    // console.log(regex)
                                    if (regex.test(element.mrn) || regex.test(element.name) || regex.test(element.nric)) {
                                        resultMrn.push(element)
                                    }
                                    // if (element.mrn == criteria.searchValue) {
                                    //     resultMrn.push(element)
                                    // }
                                }, this)
                                var response = {
                                    '_error_message': '',
                                    '_status_Code': 200,
                                    '_status': 'Done',
                                    'result': resultMrn
                                }
                                res.send(response)
                            }
                        })
                    } else {
                        // console.log("response:" + result)
                        var response = {
                            '_error_message': 'no patients on records',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        // var response = { "_status": "no patients on records" }
                        res.send(response)
                    }
                })
            break;
        case 'clinic':
            documentObject.Doctor.findOne({ _id: criteria.doctorId })
                .populate({
                    path: 'patients'
                })
                .exec(function (err, result) {
                    if (err) {
                        var response = {
                            '_error_message': 'Invalid DoctorId',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                        console.log('found patients')
                        var options = {
                            path: 'patients.visitRecords',
                            model: 'Visit',
                            sort: { 'date': -1 }
                        }
                        // populate docotrVisit from patients by doctorid            
                        documentObject.Visit.populate(result, options, function (err, result1) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Invalid DoctorId',
                                    '_status_Code': 406,
                                    '_status': '',
                                    'result': ''
                                }
                                res.send(response)
                            } else {
                                var resultMrn = []
                                result1.patients.forEach(function (element, index) {
                                    element.visitRecords.forEach(function (element1) {
                                        // console.log(element1.location+"------"+criteria.searchValue)
                                        var regex = new RegExp(criteria.searchValue, 'i')
                                        if (regex.test(element1.location)) {
                                            resultMrn.push(element)
                                        }
                                        // if (element1.location == criteria.searchValue) {
                                        //     resultMrn.push(element)
                                        // }
                                    }, this)
                                }, this)

                                var response = {
                                    '_error_message': '',
                                    '_status_Code': 200,
                                    '_status': 'Done',
                                    'result': resultMrn
                                }
                                res.send(response)
                            }
                        })
                    } else {
                        var response = {
                            '_error_message': 'no patients on records',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    }
                })
            break

        case 'department':
            documentObject.Doctor.findOne({ _id: criteria.doctorId })
                .populate({
                    path: 'patients'
                })
                .exec(function (err, result) {
                    if (err) {
                        var response = {
                            '_error_message': 'Invalid DoctorId',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                        console.log('found patients')
                        var options = {
                            path: 'patients.visitRecords',
                            model: 'Visit',
                            sort: { 'date': -1 }
                        }
                        // populate docotrVisit from patients by doctorid            
                        documentObject.Visit.populate(result, options, function (err, result1) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Invalid DoctorId',
                                    '_status_Code': 406,
                                    '_status': '',
                                    'result': ''
                                }
                                res.send(response)
                            } else {
                                // fs.writeFile('result1.txt', JSON.stringify(result), function (err) {
                                //   if (err) {
                                //     log(err)
                                //   } else {
                                //     log('Data write')
                                //   }
                                // })
                                console.log('Result by provider')
                                var resultMrn = []
                                result1.patients.forEach(function (element, index) {
                                    var flag = true
                                    element.visitRecords.forEach(function (element1) {
                                        // console.log(element1.location+"------"+criteria.searchValue)
                                        // console.log(element1.clinicalDepartment+"------"+criteria.searchValue)
                                        var regex = new RegExp(criteria.searchValue, 'i')
                                        if (regex.test(element1.clinicalDepartment)) {
                                            if (flag)
                                                resultMrn.push(element)
                                            flag = false
                                        }
                                        // if (element1.location == criteria.searchValue) {
                                        //     resultMrn.push(element)
                                        // }
                                    }, this)
                                }, this)

                                var response = {
                                    '_error_message': '',
                                    '_status_Code': 200,
                                    '_status': 'Done',
                                    'result': resultMrn
                                }
                                res.send(response)
                            }
                        })
                    } else {
                        var response = {
                            '_error_message': 'no patients on records',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    }
                })
            break;

        case 'provider':
            documentObject.Doctor.findOne({ _id: criteria.doctorId })
                .populate({
                    path: 'patients'
                })
                .exec(function (err, result) {
                    if (err) {
                        var response = {
                            '_error_message': 'Invalid DoctorId',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    } else if (document.isFieldFilled(result) && result.patients.length > 0) {
                        console.log('found patients')
                        var options = {
                            path: 'patients.visitRecords',
                            model: 'Visit',
                            sort: { 'date': -1 }
                        }
                        // populate docotrVisit from patients by doctorid            
                        documentObject.Visit.populate(result, options, function (err, result1) {
                            if (err) {
                                var response = {
                                    '_error_message': 'Invalid DoctorId',
                                    '_status_Code': 406,
                                    '_status': '',
                                    'result': ''
                                }
                                res.send(response)
                            } else {
                                console.log('Result by provider')
                                var resultMrn = []
                                result1.patients.forEach(function (element, index) {
                                    element.visitRecords.forEach(function (element1) {
                                        // console.log(element1.careProvider+"------"+criteria.searchValue)

                                        var regex = new RegExp(criteria.searchValue, 'i')
                                        if (regex.test(element1.careProvider)) {
                                            resultMrn.push(element)
                                        }
                                        // if (element1.location == criteria.searchValue) {
                                        //     resultMrn.push(element)
                                        // }
                                    }, this)
                                }, this)

                                var response = {
                                    '_error_message': '',
                                    '_status_Code': 200,
                                    '_status': 'Done',
                                    'result': resultMrn
                                }
                                res.send(response)
                            }
                        })
                    } else {
                        var response = {
                            '_error_message': 'no patients on records',
                            '_status_Code': 406,
                            '_status': '',
                            'result': ''
                        }
                        res.send(response)
                    }
                })
            break;
    }
}

module.exports.searchPatients = function (criteria, res, req) {
    var query = {};
    var sohamQuery = {};
    var sortQuery = { visitDate: -1 };
    var patientExists = {};
    var currentDate = new Date();
    var today = new Date((currentDate.getMonth() + 1) + "/" + currentDate.getDate() + "/" + currentDate.getFullYear());
    let userType = req.decoded.userType;

    let station = {
        'bedNumbers': [],
        'bedIDs': [],
        'wards': [],
        'cabins': [],
        "stationAccess": false,
        "stationError": null,
    }
    station.timeOffset = parseInt(moment().subtract(12, 'h').format('x'));
    if (userType != undefined && userType.toLowerCase() == 'staff') {
        station.stationAccess = true;
    }
    nursingController.userStationsAccess(req.decoded.userId, station.stationAccess, function (err, docs) {
        if (err) {
            station.stationError = err;
        } else {
            if (docs.stationResult.length > 0) {
                station.bedNumbers = docs.stationResult[0].bedNumbers;
                station.wards = docs.stationResult[0].wards;
            }
            if (docs.cabinResult.length > 0) {
                station.cabins = docs.cabinResult[0].cabins;
            }

            switch (criteria.searchBy.toLowerCase()) {
                case 'mrn':
                    query = { "$and": [] };
                    query["$and"].push({
                        "$or": [
                            { 'searchBox.mrn': { $regex: '^' + criteria.searchValue, $options: 'i' } },
                            { 'searchBox.name': { $regex: criteria.searchValue, $options: 'i' } }
                        ]
                    });
                    // if user is a staff
                    if (station.stationAccess == true) {
                        query["$and"].push({
                            "$or": [
                                {
                                    '$and': [
                                        { 'OPD_IPD': 1 },
                                        { 'searchBox.bedNo': { $in: station.bedNumbers } },
                                        {
                                            '$or': [
                                                { 'isDischarged': 'false' },
                                                { 'dischargeDateTime': { $gte: station.timeOffset } }
                                            ]
                                        }
                                    ]
                                },
                                { '$and': [{ 'OPD_IPD': 0 }, { 'searchBox.CabinID': { $in: station.cabins } }] }
                            ]
                        });
                    }

                    // query = {
                    //     "$or": [
                    //         { 'searchBox.mrn': { $regex: '^' + criteria.searchValue, $options: 'i' } },
                    //         { 'searchBox.name': { $regex: criteria.searchValue, $options: 'i' } }
                    //     ]
                    // }
                    sortQuery = { 'HIS_PatientId': 1 }
                    break;
                case 'clinic':
                    query = {
                        'searchBox.CabinID': parseInt(criteria.searchValue)
                    };
                    if (station.stationAccess == true && !(station.cabins.indexOf(parseInt(criteria.searchValue)) > 0)) {
                        query['searchBox.CabinID'] = [];
                    }
                    break;
                case 'ward':
                    query = {
                        'searchBox.WardID': parseInt(criteria.searchValue)
                    };
                    if (station.stationAccess == true && !(station.wards.indexOf(parseInt(criteria.searchValue)) > 0)) {
                        query['searchBox.WardID'] = [];
                    }
                    break;
                case 'department':
                    query = {
                        'searchBox.DepartmentID': parseInt(criteria.searchValue)
                    };
                    break;
                case 'date':
                    query = {
                        "$or": [
                            { "doctorId": criteria.doctorId, "isActive": 'true' },
                            { "isDemoPatient": true }
                        ]
                    };
                    if(criteria.lower && criteria.upper)
                        query.visitDate={ $gte: parseInt(criteria.lower), $lte: parseInt(criteria.upper) };
                    else if(!criteria.lower && criteria.upper)
                        query.visitDate={$lte: parseInt(criteria.upper) };
                    else if(criteria.lower && !criteria.upper)
                        query.visitDate={$gte: parseInt(criteria.lower) };
                    break;
                default:
                    document.sendResponse('', 200, 'done', [], res);
            }
            sohamQuery['patientId.isActive'] = true;
            query['IsCancel'] = { '$ne': true };
            if (!req.decoded.accessMLC)
                query["IsMLC"] = false;

            documentObject.Visit.aggregate([
                {
                    "$match": query
                },
                {"$sort":sortQuery},
                { $limit: 20 },
                {
                    $lookup:
                        {
                            from: "patients",
                            localField: "patientId",
                            foreignField: "_id",
                            as: "patients"
                        }
                },
                { $unwind: { path: "$patients", preserveNullAndEmptyArrays: true } },
                { "$sort": { visitDate: -1 } },
                {
                    $group: {
                        "_id": "$patientId",
                        "visitID": { "$first": "$_id" },
                        "searchBox": { "$first": "$searchBox" },
                        "clinicalDepartment": { "$first": "$clinicalDepartment" },
                        "primaryDoctor": { "$first": "$primaryDoctor" },
                        "careProvider": { "$first": "$careProvider" },
                        "location": { "$first": "$location" },
                        "patientType": { "$first": "$patientType" },
                        "VisitTypeID": { "$first": "$VisitTypeID" },
                        "visitType": { "$first": "$visitType" },
                        "visitDate": { "$push": "$visitDate" },
                        "doctorId": { "$first": "$doctorId" },
                        "patientId": { "$first": "$patients" },
                        "OPD_IPD": { "$first": "$OPD_IPD" },
                        "HIS_Doctor_ID": { "$first": "$HIS_Doctor_ID" },
                        "HIS_PatientId": { "$first": "$HIS_PatientId" },
                        "OPD_IPD_ID": { "$first": "$OPD_IPD_ID" },
                        "disabled": { "$first": "$disabled" },
                        "isActive": { "$first": "$isActive" },
                        "isDischarged": { "$first": "$isDischarged" },
                        "primaryDiagnosis": { "$first": "$primaryDiagnosis" },
                        "admission": { "$first": "$admission" },
                        "documents": { "$first": "$documents" },
                        "payeeInfo": { "$first": "$payeeInfo" },
                        "kinInfo": { "$first": "$kinInfo" },
                        "dateEpoch": { "$first": "$dateEpoch" }
                    }
                },
                {
                    $project: {
                        // "patientId": "$patientId",
                        "visitID": "$visitID",
                        "visitDate": { $arrayElemAt: ['$visitDate', 0] },
                        "last_visit": { $arrayElemAt: ['$visitDate', 1] },
                        "searchBox": "$searchBox",
                        "mrn": "$searchBox.mrn",
                        "clinicalDepartment": "$clinicalDepartment",
                        "primaryDoctor": "$primaryDoctor",
                        "careProvider": "$careProvider",
                        "location": "$location",
                        "patientType": "$patientType",
                        "VisitTypeID": "$VisitTypeID",
                        "visitType": "$visitType",
                        "doctorId": "$doctorId",
                        "patientId": "$patientId",
                        "OPD_IPD": "$OPD_IPD",
                        "HIS_Doctor_ID": "$HIS_Doctor_ID",
                        "HIS_PatientId": "$HIS_PatientId",
                        "OPD_IPD_ID": "$OPD_IPD_ID",
                        "disabled": "$disabled",
                        "isActive": "$isActive",
                        "isDischarged": "$isDischarged",
                        "primaryDiagnosis": "$primaryDiagnosis",
                        "admission": "$admission",
                        "documents": "$documents",
                        "payeeInfo": "$payeeInfo",
                        "kinInfo": "$kinInfo",
                        "dateEpoch": "$dateEpoch"
                    }
                },
                { '$sort': sortQuery },
                { "$match": sohamQuery },
                { "$limit": 15 }
            ], function (err, result) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                var resultObj = [];
                async.eachSeries(result, function (eachVisit, callback_each) {
                    eachVisit = Utility.mongoObjectToNormalObject(eachVisit);
                    eachVisit._id = eachVisit.visitID;
                    delete eachVisit.visitID;
                    if (eachVisit.doctorId !== req.decoded.userId) {
                        eachVisit.visitType = "other";
                        eachVisit.VisitTypeID = 0;
                        eachVisit['last_visit'] = eachVisit.visitDate;
                        if (eachVisit.patientId.isActive) {
                            documentObject.Visit.findOne({ doctorId: req.decoded.userId, patientId: eachVisit.patientId, IsCancel: { '$ne': true } }, function (err, ownVisit) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                if (ownVisit)
                                    eachVisit.visitType = ownVisit.visitType;
                                resultObj.push(eachVisit);
                                callback_each();
                            });
                        }
                        else {
                            resultObj.push(eachVisit);
                            callback_each();
                        }
                    }
                    else {
                        cpoeDocument.CpoeOrder.findOne({
                            //"_id":"988be23b-c65a-4ae7-9b47-cb52b9d9bb21"
                            'orderItems.attentionDoctorId': req.decoded.userId,
                            'orderCategory': 'procedure order',
                            "orderStatus": "active",
                            "patientId": eachVisit.patientId._id,
                            "orderItems.clinicalIndicateDate": today.getTime()
                        }, function (err, cpoeOrder) {
                            if (cpoeOrder)
                                eachVisit.visitType = "surgery";
                            if (patientExists[eachVisit.patientId._id] === undefined) {
                                eachVisit['last_visit'] = eachVisit.visitDate;
                                resultObj.push(eachVisit);
                                patientExists[eachVisit.patientId._id] = { location: resultObj.length - 1, number_of_hit: 1 };
                                callback_each();
                            }
                            else {
                                if (patientExists[eachVisit.patientId._id].number_of_hit === 1) {
                                    resultObj[patientExists[eachVisit.patientId._id].location]['last_visit'] = eachVisit.visitDate;
                                    patientExists[eachVisit.patientId._id].number_of_hit += 1;
                                }
                                callback_each();
                            }
                        });
                    }
                }, function () {
                    return res.json(Utility.output(resultObj.length + ' record(s) has been fetched', 'SUCCESS', resultObj));
                });
            });
        }
    })

}

module.exports.createVisit = function (data, res) {
    documentObject.Patient.findOne({ _id: data.patientId }, function (err, result) {
        if (err) {
            var response = { '_status': 'somthing went wrong please try again' }
            res.send(response)
        } else if (document.isFieldFilled(result)) {
            var visitToSave = new documentObject.Visit()

            visitToSave._id = uuid.v4()
            visitToSave.date = data.date
            visitToSave.dischargeDate = data.dischargeDate
            visitToSave.patientId = data.patientId
            visitToSave.doctorId = data.doctorId
            visitToSave.patientName = data.patientName
            visitToSave.mrn = data.mrn
            visitToSave.visitId = data.visitId
            visitToSave.visit_opd_No = data.visit_opd_No
            visitToSave.visitDate = data.visitDate
            visitToSave.primaryDoctor = data.primaryDoctor
            visitToSave.clinicalDepartment = data.clinicalDepartment
            visitToSave.clinicName = data.clinicName
            visitToSave.nextOfKinName = data.nextOfKinName
            visitToSave.nextOfKinMobileNo = data.nextOfKinMobileNo
            visitToSave.nextOfKinResidentialAddress = data.nextOfKinResidentialAddress
            visitToSave.nextOfKinRelation = data.nextOfKinRelation
            visitToSave.patientType = data.patientType
            visitToSave.companyName = data.companyName
            visitToSave.tariffName = data.tariffName
            visitToSave.visitType = data.visitType
            visitToSave.careProvider = data.careProvider
            // visitToSave.primaryDiagnosis = data.primaryDiagnosis
            visitToSave.visitId = data.visitId
            // visitToSave.lastVisit=data.lastVisit
            visitToSave.flag = data.flag
            visitToSave.location = data.location
            visitToSave.flagValue = data.flagValue
            visitToSave.primaryDiagnosis = data.primaryDiagnosis
            // visitToSave.vitalRecords = data.vitalRecords
            // visitToSave.cpoeOrders = data.cpoeOrders
            // visitToSave.prescriptions = data.prescriptions

            visitToSave.save(function (err, result1) {
                if (err) {
                    console.log(err)
                    var response = { '_status': 'somthing went wrong please try again' }
                    res.send(response)
                } else {
                    // console.log(result1)
                    console.log(result1)
                    if (!document.isFieldFilled(result.visitRecords))
                        result.visitRecords = []
                    result.visitRecords.push(result1._id)
                    result.save()
                    var response = { '_status': 'done', 'visitId': result1._id }
                    res.send(response)
                }
            })
        } else {
            var response = { '_status': 'invalid patientId' }
            res.send(response)
        }
    })
}

module.exports.getLastVisitDetails = function (_doctorId, _patientId, res) {
    documentObject.Visit.find({ 'patientId': _patientId, doctorId: _doctorId })
        .sort({ date: -1 })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Record Not found',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            } else if (document.isFieldFilled(result)) {

                // res.send(result)

                // send only last Record
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': result[0]
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'Record Not found',
                    '_status_Code': 201,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
                // var response = { "_status": "no result found" }
                // res.send(response)
            }
        })
}
module.exports.getPatientRecords = function (data, res) {
    var query = {};
    if (data.mrn !== undefined)
        query = { $or: [{ patientId: data.patientId }, { "searchBox.mrn": data.mrn }] };
    else
        query = { patientId: data.patientId };
    documentObject.Visit.find(query, '_id patientId patientType location primaryDoctor clinicalDepartment visitDate')
        .populate('patientId', 'dob nationality nric registrationDate mobile patientImg gender name')
        .sort({ dateEpoch: -1 })
        .limit(2)
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Error while processing request please check input',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (document.isFieldFilled(result)) {
                var mainResult = {
                    'labResults': [],
                    'vitalsList': [],
                    'medicationResults': [],
                    'visitDetails': result[0]
                }
                var condParam = []
                condParam[0] = result[0]._id
                if (result.length == 2) {
                    condParam[1] = result[1]._id
                }
                // documentObject.Vital.find().where('visitId').in(condParam)               
                var count = 0

                async.parallel([function (parallel_callback) {
                    // documentObject.Vital.find({ visitId: { $in: condParam }, markError: false })
                    //     .sort({ date: -1 })
                    //     .exec(function (err, vitalResult) {
                    //         if (err) {
                    //             parallel_callback(err, null)
                    //         } else {
                    //             var index = [];
                    //             var vitalArray = [];
                    //             // finding distinct vital records
                    //             vitalResult.forEach(function (item) {
                    //                 if (index.indexOf(item.vitalId) < 0) {
                    //                     vitalArray.push(item)
                    //                     index.push(item.vitalId)
                    //                 }
                    //             })
                    //             mainResult.vitalsList = vitalArray;
                    //             parallel_callback(null, vitalArray)
                    //         }
                    //     })
                    var query = {
                        $match: {
                            visitId: { $in: condParam }, markError: false
                        }
                    }
                    vitalsModule.getVitals(query, function (err, vitals) {
                        if (err) {
                            console.log("Error in DB operation " + err)
                            parallel_callback();
                        } else {
                            mainResult.vitalsList = vitals;
                            parallel_callback(null, vitals)
                        }
                    })
                }, function (parallel_callback) {
                    documentObject.labOrderResults.find({ visitId: { $in: condParam } }, function (err, labResults) {
                        if (err) {
                            parallel_callback(err, null)
                        } else {
                            mainResult.labResults = labResults
                            parallel_callback(null, labResults);
                        }

                    })
                }, function (parallel_callback) {
                    documentObject.Medication.find({ visitId: { $in: condParam }, "status": "active" })
                        .sort({ date: -1 })
                        .exec(function (err, medResults) {
                            if (err) {
                                parallel_callback(err, null)
                            } else {
                                mainResult.medicationResults = medResults
                                parallel_callback(null, medResults);
                            }

                        })
                }], function (err, parallelResults) {
                    if (err) {
                        log(err)
                        var response = {
                            '_error_message': 'Error while processing request please check input',
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'none'
                        }
                        res.send(response)
                    } else {

                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': mainResult
                        }
                        res.send(response)
                    }

                })

            } else {
                var response = {
                    '_error_message': 'No Patient visits on records ',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        })
}

// medication crud Operation
module.exports.addMedication = function (data, patientId, res) {
    documentObject.Patient.findOne({ _id: patientId }, '_id', function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (result) {
            var medicationToSave = new documentObject.Medication()
            medicationToSave._id = uuid.v4()
            medicationToSave.patientId = patientId
            medicationToSave.startDate = data.startDate
            medicationToSave.stopDate = data.stopDate
            medicationToSave.status = data.status.toString().toLowerCase()
            medicationToSave.orderBy = data.orderBy
            medicationToSave.visitId = data.visitId
            medicationToSave.orderType = data.orderType
            medicationToSave.drugName = data.drugName
            medicationToSave.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    medicationToSave.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var userData = {
                                // "UserAudit_id": uuid.v4(),
                                'userId': data.doctorId,
                                'recordType': 'Medication',
                                'recordId': medicationToSave._id,
                                'action': 'Saving Patient Medication To Database.',
                                'subject': 'Patient',
                                'subjectId': data.patientId,
                                'timeStamp': Date.now()
                            }

                            user_audit.addUser_audit(userData)
                            var response = {
                                '_error_message': 'None',
                                '_status_Code': 200,
                                '_status': 'Done',
                                'result': 'Medication added succefully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            // log("user  not found")
            var response = {
                '_error_message': 'Invalid patientId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getMedication = function (patientId, res) {
    documentObject.Medication.find({ patientId: patientId }).sort({ date: -1 }).exec(function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (result) {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'Invalid Patient',
                '_status_Code': 405,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}


module.exports.getPatientMedication = function (patientId, res) {
    console.log("patientId", patientId);
    documentObject.Medication.aggregate([
        { "$match": { patientId: patientId } },
        {
            $lookup:
                {
                    from: "User",
                    localField: "orderBy",
                    foreignField: "userId",
                    as: "orderBy"
                }
        },
        { $unwind: { path: "$orderBy", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: "$_id",
                orderType: "$orderType",
                patientId: "$patientId",
                drugName: "$drugName",
                drugId: "$drugId",
                drugGenericName: "$drugGenericName",
                dosage: "$dosage",
                dosage_unit: "$dosage_unit",
                schedule: "$schedule",
                status: "$status",
                startDate: "$startDate",
                endDate: "$endDate",
                orderBy: "$orderBy.userId",
                orderItems: '$orderItems',
                visitId: "$visitId",
                date: "$date",
                firstName: "$orderBy.firstName",
                lastName: "$orderBy.lastName",
                onBehalf: '$onBehalf',
                medicationDispensedStatus: "$medicationDispensedStatus"
            }
        }
    ], function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        return res.json(Utility.output(result.length + " record(s) found", 'SUCCESS', result));
    });
    /*
    documentObject.Medication.find({patientId: patientId}, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })*/
};

module.exports.getActiveMedication = function (patientId, res) {
    documentObject.Medication.find({ $and: [{ patientId: patientId }, { "status": "active" }] })
        .sort({ date: -1 }).exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Error while processing request please check input',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': result
                }
                res.send(response)
            }
        })
}

module.exports.updateMedication = function (medId, status, res) {
    documentObject.Medication.findOne({ _id: medId }, function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (result) {
            result.status = status
            result.validate(function (err) {
                if (err) {
                    var response = {
                        '_error_message': err,
                        '_status_Code': 407,
                        '_status': 'Validation Error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    result.save(function (err) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else {
                            var response = {
                                '_error_message': 'none',
                                '_status_Code': 200,
                                '_status': 'error',
                                'result': 'Records Updated successfully.'
                            }
                            res.send(response)
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Invalid Input',
                '_status_Code': 405,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}
var syncFlag = function (data, patientId) {
    // log("...syncing flags");    
    documentObject.Visit.findOne({ patientId: patientId }).sort({ dateEpoch: -1 }).exec(function (err, result) {
        if (err) {
            log(err)
        } else {
            // log(result)
            result.flag = data.flagName
            result.save(function (err) {
                if (err) {
                    log(err)
                }
            })
        }
    })
}
var syncComplaints = function (data, complaint) {
    documentObject.Visit.findOne({ _id: data.visitId }, function (err, result) {
        if (err) {
            log(err)
        } else {
            result.primaryDiagnosis = complaint.description
            result.save(function (err) {
                if (err) {
                    log(err)
                }
            })
        }
    })
    if (data.type === "primary")
        documentObject.Complaint.find({ patientId: data.patientId, type: 'primary' }, function (err, result) {
            if (err) {
                log(err)
            } else {
                for (var item in result) {
                    if (result[item]._id !== complaint._id) {
                        result[item].type = 'secondary'
                        log('modified following record')
                        result[item].save(function (err) {
                            if (err) {
                                log(err)
                            }
                        })
                    }
                }
            }
        })
}

module.exports.medicationSearch = function (criteria, res) {
    var searchBy = criteria.searchBy
    documentObject.Medication.find({ patientId: criteria.patientId })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    '_error_message': 'Invalid DrugName',
                    '_status_Code': 406,
                    '_status': 'Error',
                    'result': 'None'
                }
                res.send(response)
            } else if (document.isFieldFilled(result)) {
                var resultName = []
                result.forEach(function (element, index) {
                    var regex = new RegExp(criteria.searchValue, 'i')
                    if (regex.test(element.drugName)) {
                        resultName.push(element)
                    }
                }, this)
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'Done',
                    'result': resultName
                }
                res.send(response)
            } else {
                var response = {
                    '_error_message': 'no Medication on records',
                    '_status_Code': 406,
                    '_status': 'Error',
                    'result': 'None'
                }
                res.send(response)
            }
        })
}

module.exports.preferredDiagnosis = function (doctorId, res) {
    documentObject.Complaint.aggregate([
        {
            $match: { doctorId: doctorId, $or: [{ type: 'secondary' }, { type: 'primary' }] }
        },
        {
            $group: {
                doctorId: { $first: '$doctorId' },
                description: { $first: '$description' },
                _id: '$icdCode', // $region is the column name in collection
                count: { $sum: 1 }
            }
        }, { $limit: 20 },
        { $sort: { count: -1 } }
    ], function (err, result) {
        if (err) {
            var response = {
                '_error_message': 'Error in Operation',
                '_status_Code': 406,
                '_status': 'Error',
                'result': 'None'
            }
            res.send(response)
        } else {
            log('preferred problems length of result:' + result.length)
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'Done',
                'result': result
            }
            res.send(response)
        }
    })
}

module.exports.preferredProblems = function (doctorId, res) {
    documentObject.Complaint.aggregate([
        {
            $match: { doctorId: doctorId, type: 'problem' }
        },
        {
            $group: {
                doctorId: { $first: '$doctorId' },
                description: { $first: '$description' },
                _id: '$icdCode', // $region is the column name in collection
                count: { $sum: 1 }
            }
        }, { $limit: 20 },
        { $sort: { count: -1 } }
    ], function (err, result) {
        if (err) {
            log(err)
            var response = {
                '_error_message': 'Error in Operation',
                '_status_Code': 406,
                '_status': 'Error',
                'result': 'None'
            }
            res.send(response)
        } else {
            log('preferred problems length of result:' + result.length)
            var response = {
                '_error_message': 'None',
                '_status_Code': 200,
                '_status': 'Done',
                'result': result
            }
            res.send(response)
        }
    })
}