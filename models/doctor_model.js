var mongoose = require('mongoose'),
    uuid = require('node-uuid'),
    user_audit = require('./user_audit.js'),
    request = require('request-promise');
require('graylog')
var document = require('./db_model.js')
var async = require('async')
var fs = require('fs')
var notificationModel = require('./notification_model');
var access = require('./access_model');
var EHR_SERVER_CONFIG = require('config').get('ehrserver');
var acl = require('./access_model').aclControl;

// var jwt = require('')
var documentObject = document.domainModel;
var documentMaster = document.mastersModel;
var cpoeDocument = document.cpoeDataModel;
var UserModel = document.userManagementModel;
// //////////////////////////////////////////////////////////////////////////////////////

module.exports.getTemplateList = function (doctId, res) {
    documentObject.FormTemplate.find({
        doctorId: doctId
    }, 'title isFavorite isNandacodeRequired').sort({ isFavorite: -1, created_at: -1 }).exec(function (err, TemplateList) {
        if (err) {
            console.log(err)
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
                'result': TemplateList
            }
            res.send(response)
        }
    })
}

module.exports.setTemplateFavourite = function (data, res) {
    try {
        documentObject.Doctor.findOne({ _id: data.doctorId }, function (err, result) {
            if (err) {
                var response = {
                    '_error_message': "Request Processing error",
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (!result) {
                var response = {
                    '_error_message': "Doctor not found",
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else {
                documentObject.FormTemplate.findOne({ _id: data.templateId, doctorId: data.doctorId }, function (err, template) {
                    if (err) {
                        var response = {
                            '_error_message': "Request Processing error",
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'none'
                        }
                        res.send(response)
                    } else if (!template) {
                        var response = {
                            '_error_message': "Template not found",
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'none'
                        }
                        res.send(response)
                    } else {
                        template.isFavorite = !template.isFavorite;
                        template.save(function (err, done) {
                            if (err) {
                                var response = {
                                    '_error_message': "Template not updated",
                                    '_status_Code': 406,
                                    '_status': 'error',
                                    'result': 'none'
                                }
                                res.send(response)
                            } else {
                                var response = {
                                    '_error_message': "",
                                    '_status_Code': 200,
                                    '_status': 'Done',
                                    'result': 'none'
                                }
                                res.send(response)
                            }

                        })
                    }
                })
            }
        })
    } catch (errMsg) {
        var response = {
            '_error_message': errMsg,
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}

module.exports.getTemplateListByCategory = function (data, res) {
    console.log("Location Id: " + data.location)
    // documentMaster.m_template_category.find({},function(err,success){
    //     console.log("----->  "+success);
    //     return res.send(200)
    // })

    documentMaster.m_template_category.aggregate([
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
            console.log("Categories: " + success[0].category);
            documentObject.FormTemplate.find({
                $or: [{
                    'template.category': { $in: success[0].category }
                }, {
                    'template.category': { $in: success[0].description }
                }]
            }, 'title isFavorite isNandacodeRequired formCount')
                .sort({ isFavorite: -1 })
                .sort({ formCount: -1 })
                .sort({ title: 1 })
                // .sort({ isFavorite: -1 })            
                .exec(function (err, TemplateListByCat) {
                    if (err) {
                        return res.json(Utility.output(err, 'ERROR'));
                    } else {
                        return res.json(Utility.output(err, 'SUCCESS', TemplateListByCat));
                    }
                })
        }
    })
}

module.exports.getTemplateById = function (doctId, templateId, res) {
    documentObject.FormTemplate.find({
        $and: [{
            _id: templateId
        }, {
            doctorId: doctId
        }]
    }, function (err, TemplateData) {
        if (err) {
            console.log(err)
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
                'result': TemplateData
            }
            res.send(response)
        }
    })
}

module.exports.deleteTemplate = function (templateId, res) {
    documentObject.FormTemplate.remove({
        _id: templateId
    }, function (err, TemplateData) {
        if (err) {
            // console.log(err)
            var response = {
                '_error_message': 'Error while processing request',
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
                'result': 'Template Removed'
            }
            res.send(response)
        }
    })
}

module.exports.updateTemplate = function (data, qparam, res) {
    var dataToSet = {
        title: data.title,
        template: data
    }

    documentObject.FormTemplate.findOneAndUpdate({
        $and: [{
            _id: qparam.templateId
        }, {
            doctorId: qparam.doctId
        }]
    }, dataToSet, function (err, TemplateData) {
        if (err) {
            console.log(err)
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
                'result': 'Template Updated'
            }
            res.send(response)
        }
    })
}

module.exports.postTemplate = function (data, doctId, res) {
    // console.log("Request comes")
    documentObject.Doctor.findOne({ _id: doctId }, function (err, success) {
        if (err) {
            var response = {
                '_error_message': err.message,
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!success) {
            var response = {
                '_error_message': "Doctor Not Found",
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var newTemplate = new documentObject.FormTemplate()
            newTemplate._id = uuid.v4()
            newTemplate.title = data.title.toUpperCase();
            newTemplate.doctorId = doctId
            newTemplate.template = data
            newTemplate.isNandacodeRequired = (data.category == 2) ? true : false;
            newTemplate.save(function (err, savedata) {
                if (err) {
                    console.log(err.message)
                    var response = {
                        '_error_message': err.message,
                        '_status_Code': 406,
                        '_status': 'error',
                        'result': 'none'
                    }
                    res.send(response)
                } else {
                    log('New template Created: ' + savedata.title)
                    var response = {
                        '_error_message': 'none',
                        '_status_Code': 200,
                        '_status': 'done',
                        'result': ''
                    }
                    res.send(response)
                }
            })
        }
    })
}

module.exports.PatientTemplateData = function (data, res) {
    documentObject.FormTemplate.findOne({
        $and: [{
            _id: data.templateId
        }]
    }, 'template isNandacodeRequired', function (err, filledTemplate) {
        var finalData = {}
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!filledTemplate) {
            var response = {
                '_error_message': 'Template not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var combineResult = {}
            var tasks = [
                // updated formCount of template
                function (callback) {
                    filledTemplate.formCount == undefined ? filledTemplate.formCount = 0 : ++filledTemplate.formCount;
                    filledTemplate.save(function (err) {
                        callback();
                    })
                },
                //Patient Information and Template
                function (callback) {
                    documentObject.Patient.find({
                        _id: data.patientId
                    }, function (err, result) {
                        if (err) {
                            callback()
                        } else if (document.isFieldFilled(result)) {
                            console.log('Patient Found looking for allergies')
                            var responseObject = {}
                            // console.log(result)
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
                                patientId: data.patientId
                            }, function (err, allergyResult) {
                                if (err) {
                                    callback()
                                } else {
                                    documentObject.flag.find({
                                        patientId: data.patientId
                                    }, function (err, flagResult) {
                                        if (err) {
                                            callback()
                                        } else {
                                            documentObject.Visit.findOne({
                                                patientId: data.patientId
                                            }).sort({
                                                dateEpoch: -1
                                            }).exec(function (err, visitResult) {
                                                if (err) {
                                                    callback()
                                                } else if (visitResult) {
                                                    if (visitResult.visitType === 'Admitted' || 'admitted') {
                                                        result[0].status = 'IP'
                                                    } else {
                                                        result[0].status = 'OP'
                                                    }
                                                    responseObject.location = visitResult.location
                                                    responseObject.careProvider = visitResult.careProvider
                                                    responseObject.patientInfo = result
                                                    responseObject.Allergies = allergyResult
                                                    responseObject.flagResult = flagResult
                                                    combineResult.patientInfo = responseObject
                                                    combineResult.template = filledTemplate
                                                    callback()
                                                } else {
                                                    responseObject.patientInfo = result
                                                    responseObject.Allergies = allergyResult
                                                    responseObject.flagResult = flagResult
                                                    combineResult.patientInfo = responseObject
                                                    combineResult.template = filledTemplate
                                                    callback()
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        } else {
                            // var response = {
                            //     "_error_message": "Invalid patientId",
                            //     "_status_Code": 406,
                            //     "_status": "error",
                            //     "result": "none"
                            // }
                            // res.send(response)
                            callback()
                        }
                    })
                },
                //Mapped Complaint
                function (callback) {
                    documentObject.MappedComplaint.find({ "patientId": data.patientId })
                        .populate('diagnosis')
                        .populate('problems')
                        .exec(function (err, res_diagnosis) {
                            if (err) {
                                callback()
                            } else {
                                combineResult.mappedComplaints = res_diagnosis
                                callback()
                            }
                        })
                },
                //NandaDiagnosis
                function (callback) {
                    documentObject.NandaDiagnosis.find({
                        $and: [
                            { visitId: data.visitId },
                            { patientId: data.patientId },
                            { status: 'active' }
                        ]
                    }, function (err, done) {
                        if (err) {
                            callback()
                        } else {
                            combineResult.nandaComplaints = done
                            callback()
                        }
                    })
                },
                //Active Problem and Complaints
                function (callback) {
                    documentObject.Complaint.find({ patientId: data.patientId, status: 'active' }).sort({ createdOn: -1 }).exec(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            // res.send(response)
                            callback()
                        } else if (document.isFieldFilled(result)) {
                            combineResult.activeDignosisAndComplaints = result
                            callback()
                        } else {
                            var response = {
                                '_error_message': 'Invalid patientId',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            // res.send(response)
                            callback()
                        }
                    })
                },
                //Signed Orders
                function (callback) {
                    cpoeDocument.CpoeOrder.find({ $and: [{ patientId: data.patientId }, { "orderStatus": "pending" }] }, function (err, result) {
                        if (err) {
                            callback()
                        } else if (result) {
                            combineResult.Orders = result
                            callback()
                        } else {
                            callback()
                        }
                    })
                },
                //Lab Results
                function (callback) {
                    documentObject.POC.find({ patientId: data.patientId }, function (err, result) {
                        if (err) {
                            callback()
                        } else {
                            combineResult.LabResult = result
                            callback()
                        }
                    })
                },
                //Vitals
                function (callback) {
                    var indexArray = []
                    var responseObject = []
                    var PrefferedVitals = ['3770faab-0536-4b5f-b82e-f5c48597c435', '190e402f-6b8d-4988-9438-af1b2713b24b', 'cf6c3032-dbbb-4244-bb72-ad4c63714a38', 'a65a5bb9-7657-4d08-98d9-f2d41550d970', 'd4afa1de-ee39-4bbb-aab2-5b53a840b69a']
                    documentObject.Vital.find({
                        visitId: data.visitId
                    }).sort({
                        date: -1
                    }).exec(function (err, vitalResult) {
                        if (err) {
                            // var response = {
                            //     "_error_message": "Error while getting Vitals please try again",
                            //     "_status_Code": 406,
                            //     "_status": "error",
                            //     "result": "none"
                            // }
                            // log(err)
                            // res.send(response)
                            // console.log("Vital Error: "+err.message)
                            callback()
                        } else if (document.isFieldFilled(vitalResult)) {
                            console.log('vitals visit length: ' + vitalResult.length)
                            vitalResult.forEach(function (item, index) {
                                var i = indexArray.indexOf(item.vitalId)
                                // log(index+": "+vitalResult.length);                    
                                if (i < 0) {
                                    // log(indexArray)
                                    indexArray.push(item.vitalId)
                                    responseObject.push(item)
                                    var position = PrefferedVitals.indexOf(item.vitalId)
                                    if (position > -1) {
                                        PrefferedVitals.splice(position, 1)
                                    }
                                }

                                if (index >= vitalResult.length - 1) {
                                    documentObject.Vital.aggregate([{
                                        $match: {
                                            patientId: data.patientId,
                                            vitalId: {
                                                $in: PrefferedVitals
                                            }
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: '$vitalName',
                                            // vitalName: { $last: "$vitalName" },
                                            date: {
                                                $last: '$date'
                                            },
                                            spec: {
                                                $last: '$speciality'
                                            },
                                            unit: {
                                                $last: '$unit'
                                            },
                                            vitalId: {
                                                $last: '$vitalId'
                                            },
                                            subVitals: {
                                                $last: '$subVitals'
                                            },
                                            qualifier: {
                                                $last: '$qualifier'
                                            },
                                            vitalValue: {
                                                $last: '$vitalValue'
                                            },
                                            entryType: {
                                                $last: '$entryType'
                                            },
                                            calculation: {
                                                $last: '$calculation'
                                            }
                                        }
                                    },
                                    {
                                        $sort: {
                                            date: -1
                                        }
                                    }
                                    ], function (err, result) {
                                        if (err) {
                                            var response = {
                                                '_error_message': 'Error while getting Vitals please try again',
                                                '_status_Code': 406,
                                                '_status': 'error',
                                                'result': 'none'
                                            }
                                            // console.log("Error: "+err.message)
                                            callback()
                                        } else {
                                            // console.log("vitals pref length: "+result.length)
                                            result = result.concat(responseObject)
                                            // var response = {
                                            //     "_error_message": "none",
                                            //     "_status_Code": 200,
                                            //     "_status": "done",
                                            //     "result": result
                                            // }
                                            // res.send(response)
                                            // console.log("Vital Result: "+result)
                                            combineResult.vitals = result
                                            callback()
                                        }
                                    })
                                }
                            })
                        } else {
                            // var response = {
                            //     "_error_message": "Records not found",
                            //     "_status_Code": 404,
                            //     "_status": "error",
                            //     "result": "none"
                            // }
                            // // log(err)
                            // res.send(response)
                            // console.log("Vital Error: "+vitalResult)
                            callback()
                        }
                    })
                }
            ]

            async.parallel(tasks, function (err) {
                if (err)
                    console.log("Error: " + err.message)
                // db.close()
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'Complete Patient Data',
                    'result': combineResult
                }
                res.send(response)
            })
        }
    })
}

module.exports.PatientTemplateDataOld = function (data, res) {
    documentObject.FormTemplate.findOne({
        $and: [{
            _id: data.templateId
        }, {
            doctorId: data.doctId
        }]
    }, 'template ', function (err, filledTemplate) {
        var finalData = {}
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else if (!filledTemplate) {
            var response = {
                '_error_message': 'Template not found',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var combineResult = {}
            var tasks = [
                function (callback) {
                    documentObject.Patient.find({
                        _id: data.patientId
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
                            console.log('Patient Found looking for allergies')
                            var responseObject = {}
                            // console.log(result)
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
                                patientId: data.patientId
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
                                        patientId: data.patientId
                                    }, function (err, flagResult) {
                                        if (err) {
                                            var response = {
                                                '_error_message': 'Error while processing request please check input',
                                                '_status_Code': 406,
                                                '_status': 'error',
                                                'result': 'none'
                                            }
                                            res.send(response)
                                        } else {
                                            documentObject.Visit.findOne({
                                                patientId: data.patientId
                                            }).sort({
                                                dateEpoch: -1
                                            }).exec(function (err, visitResult) {
                                                if (err) {
                                                    var response = {
                                                        '_error_message': 'Error while processing request please check input',
                                                        '_status_Code': 406,
                                                        '_status': 'error',
                                                        'result': 'none'
                                                    }
                                                    res.send(response)
                                                } else if (visitResult) {
                                                    if (visitResult.visitType === 'Admitted' || 'admitted') {
                                                        result[0].status = 'IP'
                                                    } else {
                                                        result[0].status = 'OP'
                                                    }
                                                    responseObject.location = visitResult.location
                                                    responseObject.careProvider = visitResult.careProvider
                                                    responseObject.patientInfo = result
                                                    responseObject.Allergies = allergyResult
                                                    responseObject.flagResult = flagResult
                                                    // var response = {
                                                    //     "_error_message": "None",
                                                    //     "_status_Code": 200,
                                                    //     "_status": "done",
                                                    //     "result": responseObject
                                                    // }
                                                    // res.send(response)
                                                    combineResult.patientInfo = responseObject
                                                    callback()
                                                } else {
                                                    responseObject.patientInfo = result
                                                    responseObject.Allergies = allergyResult
                                                    responseObject.flagResult = flagResult

                                                    // var response = {
                                                    //     "_error_message": "None",
                                                    //     "_status_Code": 200,
                                                    //     "_status": "done",
                                                    //     "result": responseObject
                                                    // }
                                                    // res.send(response)
                                                    combineResult.patientInfo = responseObject
                                                    combineResult.template = filledTemplate
                                                    callback()
                                                }
                                            })
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
                },
                function (callback) {
                    documentObject.Complaint.find({
                        patientId: data.patientId,
                        status: 'active'
                    }).sort({
                        createdOn: -1
                    }).exec(function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while processing request please check input',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        } else if (document.isFieldFilled(result)) {
                            combineResult.activeDignosisAndComplaints = result
                            callback()
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
                //     // Load colors
                //     function (callback) {
                //         db.collection('colors').find({}).toArray(function (err, colors) {
                //             if (err) return callback(err)
                //             locals.colors = colors
                //             callback()
                //         })
                //     }
            ]

            async.parallel(tasks, function (err) {
                if (err)
                    return next(err)
                // db.close()
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'combine result done',
                    'result': combineResult
                }
                res.send(response)
                // res.render('profile/index', locals)
            })

            // console.log(filledTemplate.template)
            /********Patient Information*********/
            //         finalData = filledTemplate.template

            //         var patientKeys = ""
            //         for (var keys in filledTemplate.template.patient) {
            //             if (filledTemplate.template.patient[keys] == true) {
            //                 patientKeys = patientKeys.concat(keys, " ")
            //             }
            //         }

            //         documentObject.Patient.findOne({
            //             "_id": data.patientId
            //         }, patientKeys, function (err, P_Temp_data) {
            //             if (err) {
            //                 var response = {
            //                     "_error_message": "Patient details not found",
            //                     "_status_Code": 406,
            //                     "_status": "error",
            //                     "result": "none"
            //                 }
            //                 res.send(response)
            //             } else if (!P_Temp_data) {
            //                 var response = {
            //                     "_error_message": "Patient not found",
            //                     "_status_Code": 406,
            //                     "_status": "error",
            //                     "result": "none"
            //                 }
            //                 res.send(response)
            //             } else {
            //                 filledTemplate.template.patient.result = P_Temp_data
            //                 if (!filledTemplate.template.medicalHistory.allergy.checked && !filledTemplate.template.medicalHistory.diagnosis.checked) {
            //                     var response = {
            //                         "_error_message": "done",
            //                         "_status_Code": 200,
            //                         "_status": "done",
            //                         "result": filledTemplate
            //                     }
            //                     res.send(response)
            //                 }
            //             }
            //         })

            //         /********Allergy Information*********/
            //         if (filledTemplate.template.medicalHistory.allergy.checked) {
            //             documentObject.Allergies.find({
            //                 "patientId": data.patientId
            //             }, function (err, P_Allergy_data) {
            //                 if (err) {
            //                     var response = {
            //                         "_error_message": "Allergy details not found",
            //                         "_status_Code": 406,
            //                         "_status": "error",
            //                         "result": "none"
            //                     }
            //                     res.send(response)
            //                 } else if (!P_Allergy_data) {
            //                     var response = {
            //                         "_error_message": "Allergy not found",
            //                         "_status_Code": 406,
            //                         "_status": "error",
            //                         "result": "none"
            //                     }
            //                     res.send(response)
            //                 } else {
            //                     filledTemplate.template.medicalHistory.allergy.result = P_Allergy_data
            //                     if (!filledTemplate.template.medicalHistory.diagnosis.checked) {
            //                         var response = {
            //                             "_error_message": "done",
            //                             "_status_Code": 200,
            //                             "_status": "done",
            //                             "result": filledTemplate
            //                         }
            //                         res.send(response)
            //                     }
            //                 }
            //             })
            //         }

            //         /********Diagnosis and Complaints Information*********/
            //         if (filledTemplate.template.medicalHistory.diagnosis.checked) {
            //             documentObject.Complaint.find({
            //                 $and: [{
            //                     "patientId": data.patientId
            //                 }, {
            //                     status: filledTemplate.template.medicalHistory.diagnosis.status
            //                 }]
            //             }, function (err, P_Dignosis_data) {
            //                 if (err) {
            //                     var response = {
            //                         "_error_message": "Diagnosis details not found",
            //                         "_status_Code": 406,
            //                         "_status": "error",
            //                         "result": "none"
            //                     }
            //                     res.send(response)
            //                 } else if (!P_Dignosis_data) {
            //                     var response = {
            //                         "_error_message": "Diagnosis not found",
            //                         "_status_Code": 406,
            //                         "_status": "error",
            //                         "result": "none"
            //                     }
            //                     res.send(response)
            //                 } else {
            //                     filledTemplate.template.medicalHistory.diagnosis.result = P_Dignosis_data
            //                     var response = {
            //                         "_error_message": "done",
            //                         "_status_Code": 200,
            //                         "_status": "done",
            //                         "result": filledTemplate
            //                     }
            //                     res.send(response)
            //                 }
            //             })
            // }
        }
    })
}

module.exports.getDoctorsList = function (req, res) {
    log('in get Doctors ......')
    var code = req.params.search
    documentObject.Doctor.find({}, ' _id firstName', function (err, result) {
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
        }
    })
}

module.exports.getDoctors = function (req, res) {
    log('in get Doctors ......')
    var code = req.params.search;
    documentObject.User.aggregate([
        {

            $match: {
                "$or": [{ firstName: new RegExp(code, 'i'), }, { lastName: new RegExp(code, 'i') }],
                //userStatus: "active",
                // status:true,
                userType: "doctor"
            }

        }, {
            $project: {
                '_id': '$userId',
                'userId': '$userId',
                'firstName': '$firstName',
                'lastName': '$lastName',
                'email': '$email'
            }
        },
        { $limit: 15 }
    ], function (err, result) {
        if (err)
            return res.json(Utility.output(err, "ERROR"));
        return res.json(Utility.output(result.length + " doctor(s) are found", "SUCCESS", result));
    })
}

module.exports.getPatientVitals = function (patientId, res) {
    documentObject.Vital.find({
        patientId: patientId
    }).sort({
        date: -1
    }).exec(function (err, result) {
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

module.exports.getPatientsVitalset = function (patientId, setId, res) {
    documentMaster.prefVitalSet.findOne({ _id: setId }, function (err, setResult) {
        if (err) {
            document.sendResponse('something went wrong please try again', 406, 'error', 'none', res)
        } else if (document.isFieldFilled(setResult)) {
            //log(setResult)
            documentObject.Vital.find({ vitalId: { $in: setResult.vitalList }, patientId: patientId }, function (err, vitalResult) {
                if (err) {
                    document.sendResponse('something went wrong please try again', 406, 'error', 'none', res)
                } else {
                    document.sendResponse("", 200, "done", vitalResult, res)
                }
            })
        } else {
            document.sendResponse("invalid setId", 406, "error", "", res)
        }
    })

}
module.exports.getPatientBSA = function (patientId, res) {
    async.parallel([function (callback) {
        var height
        heightId = '110fadab-6784-4c3f-ad0d-eadd078ec083'
        documentObject.Vital.findOne({
            patientId: patientId,
            vitalId: heightId
        }).sort({ date: -1 }).exec(function (err, result) {
            if (err) {
                callback(err)
            } else {
                height = result
                callback(null, height)
            }
        })
    }, function (callback) {
        var weightId = 'f9fae10e-9b8a-44cd-a674-c67f486c703d'
        documentObject.Vital.findOne({
            patientId: patientId,
            vitalId: weightId
        }).sort({ date: -1 }).exec(function (err, result) {
            if (err) {
                callback(err)
            } else {
                weight = result
                callback(null, weight)
            }
        })
    }], function (err, results) {
        if (err) {
            document.sendResponse('error', 406, 'error', err, res);
        } else {
            console.log(results)
            log('calculating bsa')
            var BSA
            if (document.isFieldFilled(results[0]) && document.isFieldFilled(results[1]))
                BSA = (results[0].vitalValue * results[1].vitalValue).toFixed(2)
            else
                BSA = 0

            BSA = BSA / 3600
            BSA = Math.sqrt(BSA)
            var result = {
                'bsa': BSA,
                'height': results[0].vitalValue,
                'weight': results[1].vitalValue
            }
            document.sendResponse('none', 200, 'done', result, res)
        }
    })
}

module.exports.getPatientVitalsByDate = function (patientId, upper, lower, res) {
    log('in get patient vitals ......')
    documentObject.Vital.find({
        patientId: patientId,
        date: {
            $gte: lower,
            $lte: upper
        }
    })
        .sort({ date: -1 })
        .exec(function (err, result) {
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
                    'result': result
                }
                res.send(response)
            }
        });
}

module.exports.getPatientsSelectedVitalsByDate = function (patientId, upper, lower, data, res) {
    log('in get patient vitals ......')
    documentObject.Vital.find({
        patientId: patientId,
        date: { $gte: lower, $lte: upper },
        vitalId: { $in: data.vitals }
    }).sort({ date: -1 })
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
                var response = {
                    '_error_message': 'None',
                    '_status_Code': 200,
                    '_status': 'Done',
                    'result': result
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
}

module.exports.markVitalAsError = function (patientId, vitalId, res) {
    documentObject.Vital.findOneAndUpdate({ _id: vitalId, patientId: patientId },{markError : true}, function (err, result) {
        if (result) {
            document.sendResponse('none', 200, 'done', 'none', res);
            // result.markError = true
            // result.save(function (err) {
            //     if (err) {
            //         log(err)
            //         document.sendResponse('Invalid input', 406, 'Error', 'none', res)
            //     } else {
            //         document.sendResponse('none', 200, 'done', 'none', res)
            //     }
            // })

        } else {
            document.sendResponse('Invalid input', 406, 'Error', 'none', res)
        }
    })
}
module.exports.addPatientToDoctor = function (doctorId, patientID, res) {
    documentObject.Doctor.findOne({
        externalEntityId: doctorId
    }, function (err, result) {
        if (err) {
            res.send(err)
        } else if (document.isFieldFilled(result)) {
            var index = result.patients.indexOf(patientID)
            if (index < 0) {
                result.patients.push(patientID)
                result.save(function (err) {
                    if (err) {
                        res.send(err)
                    } else {
                        res.send('done')
                    }
                })
            } else {
                res.send('already exist')
            }
        } else {
            res.send('invalid doctorId')
        }
    })
}

module.exports.getAllPatientList = function (res) {
    documentObject.Patient.find().exec(function (err, result) {
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
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'No Patients on records ',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.getPatientTemplateData = function (doctId, res) {
    documentObject.Doctor.findOne({
        _id: doctId
    }, 'documentTemplate', function (err, data) {
        if (err) {
            var response = {
                '_error_message': 'Error while processing request please check input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        } else {
            var patientFields = ''
            // var response = {
            //     "_error_message": "none",
            //     "_status_Code": 200,
            //     "_status": "done",
            //     "result": data
            // }
            res.send(response)
        }
    })
}

module.exports.getTemplate = function (doctId, res) {
    documentObject.Doctor.findOne({
        _id: doctId
    }, 'documentTemplate', function (err, data) {
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
                'result': data
            }
            res.send(response)
        }
    })
}

module.exports.Login = function (jwt, data, res) {
    // console.log(data)
    documentObject.User.findOne({
        accessCode: data.accessCode
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

            if (result.expiryDate < new Date().getTime())
                return res.json(Utility.output('Account expired. Please contact to admin', 'ERROR'));
            var password = data.password
            var hospitalName = data.hospitalName
            var isAdmin = document.isFieldFilled(data.isAdmin) ? data.isAdmin : false;
            // log('result' + result)
            documentObject.User.validatePassword(data.password, result.password, function (err, success) {
                if (success && result.userStatus == 'inactive') {
                    // activate user account
                    if (document.isFieldFilled(data.token) && ((result.hospitalName === hospitalName) || (parseInt(result.unit) === parseInt(hospitalName)))) {
                        jwt.verify(data.token, 'sofomo_pwd', function (err, success) {
                            if (err) {
                                log(err)
                            } else {
                                activateUser(result, res)
                            }
                        });
                    } else {
                        var response = {
                            '_error_message': 'invalid password',
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'none'
                        }
                        res.send(response)
                    }

                } else if ((success && result.userStatus == 'active') || password == result.password) {
                    log('user account is active')
                    // if user activated but not changed password

                    if (document.isFieldFilled(result.setPassword) && result.setPassword == 'true') {
                        activateUser(result, jwt, res)
                    } else {
                        if ((result.hospitalName === hospitalName) || (parseInt(result.unit) === parseInt(hospitalName))) {
                            userDataService(result, jwt, isAdmin, res)
                        } else {
                            var response = {
                                '_error_message': 'invalid hospital Name',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                            res.send(response)
                        }


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
            });
        } else {
            var response = {
                '_error_message': 'invalid user',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

var activateUser = function (result, jwt, res) {
    var data = {}
    data.userId = result.userId
    var tokenParam = {};
    tokenParam._id = result._id;
    tokenParam.userName = result.accessCode;
    tokenParam.hospitalName = result.hospitalName;
    tokenParam.password = result.password;
    tokenParam.userId = result.userId;
    var token = jwt.sign(tokenParam, 'sofomo_pwd', {
        expiresIn: '1 days'
    })
    data.token = token
    var response = {
        '_error_message': 'Activate account successful',
        '_status_Code': 300,
        '_status': 'Account activated',
        'result': data
    }
    res.send(response)
    var update = { userStatus: 'active' }
    documentObject.User.findOneAndUpdate({ userId: result.userId }, update, function (err, res) {
        if (err) {
            log(err)
        } else {
            log('new user activated');
        }
    })
}

var serveUserData = function (result, jwt, res) {
    if (result.userType === 'doctor') {
        // log("searching user in doctors")
        documentObject.Doctor.findOne({
            userId: result._id
        }, function (err, userResult) {
            if (err) {
                var response = {
                    '_error_message': err,
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            } else if (userResult) {
                // to match previous build of angular 

                var tokenParam = {}
                tokenParam._id = result._id
                tokenParam.userName = result.accessCode
                tokenParam.hospitalName = result.hospitalName
                tokenParam.password = result.password
                tokenParam.userId = result.userId;
                // console.log(result)
                // console.log("tokenparam:    "+tokenParam)
                var token = jwt.sign(tokenParam, 'sofomo_pwd', {
                    expiresIn: '1 days'
                })
                var resObject = {}
                resObject.user = result
                // temp code to prevent system crash please remove this line after next release
                resObject.user._id = resObject.user.userId;
                delete resObject['password'];
                //
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
                    '_error_message': 'doctor reccords are empty',
                    '_status_Code': 404,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        })
    } else {
        var response = {
            '_error_message': 'user records are empty',
            '_status_Code': 404,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}

var userDataService = function (result, jwt, flag, res) {
    // banda is admin or not admin check
    access.aclControl.hasRole(result.userId, 'superadmin', function (err, isAdmin) {
        // return true remove this line in next release
        isAdmin = true;
        if (err) {
            document.sendResponse(err, 406, "error", err, res);
        } else if (!flag || (flag && isAdmin)) {
            var resObject = {};
            async.parallel([function (callback) {
                acl.isAllowed(result.userId, 'mlc', 'R', function (err, flag) {
                    if (err) {
                        callback(err);
                    } else {
                        var tokenParam = {}
                        tokenParam.firstName = result.firstName;
                        tokenParam.lastName = result.lastName;
                        tokenParam.userName = result.accessCode;
                        tokenParam.hospitalName = result.hospitalName;
                        tokenParam.accessMLC = flag;
                        tokenParam.userType = result.userType;
                        // tokenParam.password = result.password
                        tokenParam.userId = result.userId; // important
                        var token = jwt.sign(tokenParam, 'sofomo_pwd', {
                            expiresIn: '1 days'
                        })

                        resObject.user = JSON.parse(JSON.stringify(result));
                        // temp code to prevent system crash please remove this line after next release
                        resObject.user._id = resObject.user.userId;  //
                        resObject.token = token;
                        delete resObject.user.password;
                        callback();
                    }
                })

            }, function (callback) {
                var options = {
                    uri: Utility.baseURL() + '/ehr/api/access/assignedPermissionToUser',
                    qs: {
                        userId: result.userId// -> uri + '?userId='
                    },
                    json: true
                };

                request(options)
                    .then(function (data) {
                        data.result = data.result.sort(function (a, b) {
                            return a.index > b.index;
                        })
                        resObject.acl = data.result;
                        async.forEachOf(resObject.acl, function iteratee(eachData, index, callback_eachForeach) {
                            if(eachData.type!="quickLinks"){
                                resObject.acl[index].is_enable=false;
                                callback_eachForeach();
                            }
                            else{
                                UserModel.user_quick_links.findOne({_resources:eachData._id,_user:result.userId},function(err,quickLink){
                                    if(err)
                                        return res.json(Utility.output(err,"ERROR"));
                                    resObject.acl[index].is_enable=true;
                                    if(quickLink){
                                        resObject.acl[index].is_enable=quickLink.is_enable;
                                    }
                                    callback_eachForeach();
                                });
                            }
                        },function(){
                            callback();
                        });
                    })
                    .catch(function (err) {
                        // API call failed...
                        log(err)
                        callback(err);
                    });

            }], function (err) {
                if (err) {
                    document.sendResponse("invalid User", 403, "error", "", res);
                } else {
                    var response = {
                        '_error_message': 'none',
                        '_status_Code': 200,
                        '_status': 'done',
                        'result': resObject
                    }
                    res.send(response)
                }
            })
        } else {
            // unauthorized banda
            document.sendResponse("Unauthorized User", 403, "error", "", res);
        }
    })
}
var createUsers = function () {
    var newUser = documentObject.User()
    newUser.accessCode = '9311068765'
    newUser.password = '123456'
    newUser.userType = 'patient'
    newUser.userRole = '',
        newUser.userId = 'd8ec59bc-751e-4a57-8231-71a594292c2c'
    newUser.save()
}

var dummyDoctors = function () {
    documentObject.Doctor.find(function (err, doctorResult) {
        // log(doctorResult)
        for (var i = 0; i < doctorResult.length; i++) {
            // log("tempdata: "+temp)
            var newDoctor = new documentObject.Doctor()
            newDoctor.firstName = doctorResult[i].firstName
            newDoctor.lastName = doctorResult[i].lastName
            newDoctor.specialization = doctorResult[i].specialization
            newDoctor.sub_specialization = doctorResult[i].sub_specialization
            newDoctor.doctorType = doctorResult[i].doctorType
            newDoctor.gender = doctorResult[i].gender
            newDoctor.pfNo = doctorResult[i].pfNo
            newDoctor.PANno = doctorResult[i].PANno
            newDoctor.joiningDate = doctorResult[i].joiningDate
            newDoctor.regNo = doctorResult[i].regNo
            newDoctor.DID = doctorResult[i].DID
            newDoctor.email = doctorResult[i].email
            newDoctor.degree = doctorResult[i].degree
            newDoctor.department = doctorResult[i].department
            newDoctor.classification = doctorResult[i].classification
            newDoctor.createdOn = doctorResult[i].createdOn
            newDoctor.updatedOn = doctorResult[i].updatedOn
            newDoctor.documentTemplate = doctorResult[i].documentTemplate
            newDoctor._id = uuid.v4()
            newDoctor.save(function (error, result) {
                if (error) {
                    log(err)
                } else {
                    console.log(result)
                }
            })
            // log("doctor data:"+newDoctor)
        }
        log('created dummyDoctors')
    })
}

module.exports.addDemoVitalsToVisit = function (data, res) {
    console.log("mrn:   " + data.mrn)
    documentObject.Visit.findOne({
        'searchBox.mrn': data.mrn
    }, function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (document.isFieldFilled(result)) {
            var errorFlag = true
            if (document.isFieldFilled(data.vitals)) {
                log("length: " + data.vitals.length);
                async.eachSeries(data.vitals, function (item, innercallback) {
                    // log(`${item.vitalName}
                    // ${item.vitalValue}
                    // ${result.doctorId}`)
                    var unitObj = {
                        "refLow": 0,
                        "refHigh": 200,
                        "unitname": " ",
                        "entryLimitLow": 0,
                        "entryHighLimit": 250,
                    };
                    var newVitals = new documentObject.Vital()
                    newVitals._id = uuid.v4()
                    newVitals.visitId = result._id
                    newVitals.doctorId = result.doctorId
                    newVitals.userId = result.doctorId
                    newVitals.patientId = result.patientId
                    newVitals.date = Date.now()
                    newVitals.vitalName = item.vitalName
                    newVitals.vitalValue = item.vitalValue
                    newVitals.unit.push(unitObj)
                    newVitals.validate(function (err) {
                        if (err) {
                            log("Error-: " + err)
                            innercallback();
                        } else {
                            newVitals.save(function (err, vitalResult) {
                                if (err) {
                                    log("Error--: " + err)
                                    innercallback();
                                } else {
                                    log(vitalResult)
                                    innercallback();
                                }
                            })
                        }
                    })
                }, function (err) {
                    if (err) {
                        return res.json(Utility.output(err, 'ERROR'));
                    } else {
                        return res.json(Utility.output("Vital Added", 'SUCCESS'));
                    }
                })
            } else {
                return res.json(Utility.output("Invalid Vital", 'ERROR'));
            }
        } else {
            //console.log(JSON.stringify(result))
            return res.json(Utility.output("Invalid MRN", 'ERROR'));
        }
    })
}

module.exports.addMultipleVitalsToVisit = function (data, res) {
    documentObject.Visit.findOne({
        _id: data.visitId,
        patientId: data.patientId
    }, function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (document.isFieldFilled(result)) {
            var errorFlag = true
            if (document.isFieldFilled(data.vitals)) {
                var x = data.vitals.length
                data.vitals.forEach(function (item, index) {
                    var newVitals = new documentObject.Vital(item)
                    newVitals._id = uuid.v4()
                    newVitals.visitId = data.visitId
                    newVitals.doctorId = result.doctorId
                    newVitals.userId = data.userId
                    newVitals.patientId = data.patientId
                    newVitals.date = data.date
                    //newVitals.timeStamp = data.timeStamp
                    // newVitals.vitalId = item.vitalId
                    // newVitals.speciality = item.speciality
                    // newVitals.calculation = item.calculation
                    // newVitals.entryType = item.entryType
                    // newVitals.vitalName = item.vitalName
                    // newVitals.vitalValue = item.vitalValue
                    // newVitals.qualifier = item.qualifier
                    // newVitals.unit = item.unit
                    // newVitals.subVitals = item.subVitals
                    // newVitals.isAbnormal = item.isAbnormal
                    newVitals.validate(function (err) {
                        if (err && errorFlag) {
                            var response = {
                                '_error_message': err,
                                '_status_Code': 407,
                                '_status': 'Validation Error',
                                'result': 'none'
                            }
                            res.send(response)
                            errorFlag = false
                        } else {
                            // log("saving vital"+index)
                            newVitals.save(function (err, vitalResult) {
                                if (err && errorFlag) {
                                    log(err)
                                    var response = {
                                        '_error_message': 'Error while processing request please check input',
                                        '_status_Code': 406,
                                        '_status': 'error',
                                        'result': 'none'
                                    }
                                    res.send(response)
                                    errorFlag = false
                                } else if (index >= (x - 1) && errorFlag) {
                                    log('sending response' + index)
                                    var response = {
                                        '_error_message': 'none',
                                        '_status_Code': 200,
                                        '_status': 'done',
                                        'result': 'vitals added'
                                    }
                                    res.send(response)
                                    errorFlag = false
                                }
                                // check abnormal vitals and send notifications
                                if (document.isFieldFilled(vitalResult) && vitalResult.isAbnormal) {
                                    log('generating abnormal vital notifications')
                                    generateVitalNotifications(vitalResult, result, data.userId);
                                } else {
                                    log('not generating abnormal vital notification why ' + vitalResult.isAbnormal)
                                }

                            })
                        }
                    })
                })
            } else {
                var response = {
                    '_error_message': 'Invalid vitals',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        } else {
            var response = {
                '_error_message': 'Invalid visitId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }
    })
}

module.exports.addMultipleVitalsToVisit2 = function (data, res) {
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
                if (element.calculation !== '') {
                    // call calculation function
                    console.log("Calculate the Parent Vital value");
                }
                var vitalToSave = new documentObject.Vital(element);
                vitalToSave._id = new mongoose.Types.ObjectId();
                vitalToSave.visitId = data.visitId
                vitalToSave.userId = data.userId
                vitalToSave.patientId = data.patientId
                vitalToSave.date = data.date
                vitalToSave.save(function (err, success) {
                    if (err) {
                        console.log("Error " + err);
                        callback(err);
                    } else {
                        callback();
                    }
                })
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

function generateVitalNotifications(vitalData, visit, userId) {
    documentObject.Patient.findOne({ _id: visit.patientId }, function (err, patientResult) {
        if (err) {
            log(err)
        } else {
            var newNotification = new documentObject.Notification();
            newNotification._id = uuid.v4();
            newNotification.userId = vitalData.doctorId;
            newNotification.userType = 'doctor'
            newNotification.nType = 0;
            newNotification.message = "Abnormal Vital";
            newNotification.location = "";
            newNotification.new = true;
            newNotification.urgency = "moderate";
            newNotification.date = Date.now();
            newNotification.fromUserId = userId;
            newNotification.patientName = patientResult.name;
            newNotification.patientMrn = patientResult.mrn;
            newNotification.payload = [];
            newNotification.visit = vitalData.visitId;
            newNotification.payload.push(vitalData);
            notificationModel.generateNotification(newNotification, function (err, result) {
                if (err) {
                    log(err)
                } else {
                    console.log("notification sent: " + result);
                }
            })
        }
    })
}
module.exports.getPatientCoversheetVitals = function (data, res) {
    var indexArray = []
    var responseObject = []
    // temprature ,respiration, pulse oximeter, spo2, blood Pressure
    // log("visit ID:"+data.visitId)
    var PrefferedVitals = ['3770faab-0536-4b5f-b82e-f5c48597c435', '190e402f-6b8d-4988-9438-af1b2713b24b', 'cf6c3032-dbbb-4244-bb72-ad4c63714a38', 'a65a5bb9-7657-4d08-98d9-f2d41550d970', 'd4afa1de-ee39-4bbb-aab2-5b53a840b69a']
    documentObject.Vital.find({
        visitId: data.visitId,
        markError: false
    }).sort({
        date: -1
    }).exec(function (err, vitalResult) {
        if (err) {
            var response = {
                '_error_message': 'Error while getting Vitals please try again',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            log(err)
            res.send(response)
        } else if (document.isFieldFilled(vitalResult)) {
            console.log('vitals visit length: ' + vitalResult.length)
            vitalResult.forEach(function (item, index) {
                var i = indexArray.indexOf(item.vitalId)
                if (i < 0) {
                    indexArray.push(item.vitalId)
                    responseObject.push(item)
                    var position = PrefferedVitals.indexOf(item.vitalId)
                    if (position > -1) {
                        PrefferedVitals.splice(position, 1)
                    }
                }
                if (index >= vitalResult.length - 1) {
                    documentObject.Vital.aggregate([{
                        $match: {
                            patientId: data.patientId,
                            vitalId: {
                                $in: PrefferedVitals
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$vitalName',
                            // vitalName: { $last: "$vitalName" },
                            date: {
                                $last: '$date'
                            },
                            spec: {
                                $last: '$speciality'
                            },
                            unit: {
                                $last: '$unit'
                            },
                            vitalId: {
                                $last: '$vitalId'
                            },
                            subVitals: {
                                $last: '$subVitals'
                            },
                            qualifier: {
                                $last: '$qualifier'
                            },
                            vitalValue: {
                                $last: '$vitalValue'
                            },
                            entryType: {
                                $last: '$entryType'
                            },
                            calculation: {
                                $last: '$calculation'
                            }
                        }
                    },
                    {
                        $sort: {
                            date: -1
                        }
                    }
                    ], function (err, result) {
                        if (err) {
                            var response = {
                                '_error_message': 'Error while getting Vitals please try again',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': 'none'
                            }
                        } else {
                            result = result.concat(responseObject)
                            var heightId = '110fadab-6784-4c3f-ad0d-eadd078ec083'
                            var weightId = 'f9fae10e-9b8a-44cd-a674-c67f486c703d'
                            // calculate bmi
                            if (indexArray.indexOf(heightId) >= 0 && indexArray.indexOf(weightId) >= 0) {
                                var height = result[indexArray.indexOf(heightId)]
                                var weight = result[indexArray.indexOf(weightId)]
                                // calculating bmi
                                var bmi = {}
                                bmi.vitalName = 'BMI'
                                // calculate bmi and round of the value
                                bmi.vitalValue = '' + (weight.vitalValue / ((height.vitalValue / 100) * (height.vitalValue / 100))).toFixed(2)
                                bmi.patientId = weight.patientId
                                bmi.visitId = weight.visitId
                                bmi.doctorId = weight.doctorId
                                bmi.date = Date.now()
                                bmi.subVitals = []
                                bmi.unit = []
                                // static unit for bmi
                                var temp1 = {
                                    "defaultValue": "",
                                    "entryHighLimit": "",
                                    "entryLimitLow": "",
                                    "criticalHigh": "",
                                    "criticalLow": "",
                                    "refHigh": "18.5",
                                    "refLow": "24.9",
                                    "unitname": ""
                                }
                                bmi.unit.push(temp1)
                                result.push(bmi)
                                // calculate bsa
                                var bsaVital = {}
                                var BSA = weight.vitalValue * height.vitalValue
                                // calculate bsa and round of the value
                                BSA = (BSA / 3600)
                                BSA = Math.sqrt(BSA).toFixed(2)
                                bsaVital.vitalName = 'BSA'
                                bsaVital.vitalValue = BSA
                                bsaVital.patientId = weight.patientId
                                bsaVital.visitId = weight.visitId
                                bsaVital.doctorId = weight.doctorId
                                bsaVital.date = Date.now()
                                bsaVital.subVitals = []
                                bsaVital.unit = []
                                // adding static value to bsa unit 
                                temp1.refHigh = "15"
                                temp1.refLow = "1.73"
                                bsaVital.unit.push(temp1)
                                result.push(bsaVital)
                                document.sendResponse('none', 200, 'done', result, res)
                            } else {
                                document.sendResponse('none', 200, 'done', result, res)
                            }
                        }
                    })
                }
            })
        } else {
            var response = {
                '_error_message': 'Records not found',
                '_status_Code': 404,
                '_status': 'error',
                'result': 'none'
            }
            // log(err)
            res.send(response)
        }
    })
}

module.exports.changeSign = function (data, res) {
    documentObject.User.findOne({ userId: data.userId, signCode: data.currentSignature }, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 406, 'error', 'none', res)
        } else if (result) {
            // console.log(result)      
            result.signCode = data.signature
            result.save(function (err, newResult) {
                if (err) {
                    log(err)
                    document.sendResponse(err, 406, 'error', 'none', res)
                } else {
                    document.sendResponse('success', 200, 'done', 'none', res)
                }

            })

        } else {
            document.sendResponse('invalid current signature', 406, 'error', 'none', res)
        }
    })
}

module.exports.changePassword = function (data, res) {

    documentObject.User.findOne({ userId: data.userId }, function (err, resultUser) {
        if (err) {
            document.sendResponse('something went wrong please try again', 406, 'error', 'none', res)
        } else if (resultUser) {
            documentObject.User.validatePassword(data.currentPassword, resultUser.password, function (err, flag) {
                if (err) {
                    log(err)
                    document.sendResponse(err, 406, 'error', 'none', res)
                } else if (flag) {
                    documentObject.User.encryptPassword(data.newPassword, function (err, hash) {
                        if (err) {
                            log(err)
                            document.sendResponse(err, 406, 'error', 'none', res)
                        } else {
                            var update = {
                                'password': hash,
                                'setPassword': 'false'
                            }
                            documentObject.User.findOneAndUpdate({ _id: resultUser._id }, update, function (err, result) {
                                if (err) {
                                    log(err)
                                    document.sendResponse(err, 406, 'error', 'none', res)
                                } else {
                                    document.sendResponse('', 200, 'Operation Successful', resultUser, res)
                                }
                            })


                        }
                    })
                } else {
                    document.sendResponse('invalid password', 406, 'error', 'none', res)
                }
            })
        } else {
            document.sendResponse('invalid user', 406, 'error', 'none', res)
        }
    })

}

module.exports.addPrefferedComplaint = function (data, res) {
    var thisObj = this;
    var masterObject = document.mastersModel;
    if (!data.code)
        return res.json(Utility.output('Code is required', 'ERROR'));
    documentObject.User.find({ _id: data.userId }, function (err, userResult) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        } else if (userResult) {
            documentMaster.icdCodes.findOne({ CODE: Utility.escape(data.code) }, function (err, result) {
                if (err) {
                    return res.json(Utility.output(err, 'ERROR'));
                }
                if (!result)
                    return res.json(Utility.output('Invalid preffered complaint selected', 'ERROR'));

                documentObject.prefIcdCodes.findOne({ userId: data.userId, isProblem: data.isProblem, isProblem: { $ne: (data.isProblem === true ? false : true) } }, function (err, existProblems) {
                    if (err) {
                        return res.json(Utility.output(err, 'ERROR'));
                    }
                    if (existProblems) {
                        if (!existProblems.payload) {
                            existProblems.payload = [];
                        }
                        if (existProblems.payload.indexOf(Utility.escape(data.code)) != -1) {
                            return res.json(Utility.output('Selected Complaint already exists', 'ERROR'));
                        }
                        existProblems.payload.push(Utility.escape(data.code));
                        documentObject.prefIcdCodes.update({ _id: existProblems._id },
                            { payload: existProblems.payload },
                            function (err, newPrefferedComplaint) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                thisObj.getPrefferedComplaint(data, res);
                            });
                    } else {
                        new documentObject.prefIcdCodes({
                            _id: uuid.v4(),
                            userId: data.userId,
                            isProblem: data.isProblem,
                            payload: [Utility.escape(data.code)]
                        }).save(function (err, newPrefferedComplaint) {
                            if (err)
                                return res.json(Utility.output(err, 'ERROR'));
                            thisObj.getPrefferedComplaint(data, res);
                        });
                    }
                })
            });
        } else {
            return res.json(Utility.output('User not found', 'ERROR'));
        }
    })
}
module.exports.getPrefferedComplaint = function (data, res) {
    var masterObject = document.mastersModel;
    documentObject.prefIcdCodes.findOne({ userId: data.userId, isProblem: data.isProblem }, function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        if (!result)
            return res.json(Utility.output('0 Record(s) found', 'SUCCESS', {
                'records': [],
                'record_id': null,
                'isProblem': null
            }));
        documentMaster.icdCodes.find({ CODE: { $in: result.payload } }, function (err, icdCodes) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            else
                return res.json(Utility.output(icdCodes.length + ' record(s) found', 'SUCCESS', {
                    'records': icdCodes,
                    'record_id': result._id,
                    'isProblem': data.isProblem
                }));
        });
    });
}
module.exports.updatePrefferedComplaint = function (data, res) {
    var thisObj = this;
    if (!data.code)
        return res.json(Utility.output('Code is required', 'ERROR'));
    documentObject.prefIcdCodes.findOne({ _id: data.recordId }, function (err, result) {
        if (err) {
            log(err)
            document.sendResponse(err, 501, "error", "none", res)
        }
        if (!result)
            return res.json(Utility.output('Record is not found', 'ERROR'));
        var updatedResult = Utility.mongoObjectToNormalObject(result);
        var index = updatedResult.payload.indexOf(data.code);
        if (index === -1)
            return res.json(Utility.output('Selected Complaint not found', 'ERROR'));
        updatedResult.payload.splice(index, 1);
        result.payload = updatedResult.payload;
        result.save(function (err) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            thisObj.getPrefferedComplaint(data, res);
        });
    });
}
module.exports.addVitalSet = function (data, res) {
    documentObject.User.find({ _id: data.userId }, function (err, userResult) {
        if (err) {
            console.log('error in add preffered vital set')
            document.sendResponse(err, 501, "error", "none", res)
        } else if (userResult) {
            // console.log(data)
            var prefferedVitalSet = new documentMaster.prefVitalSet()
            prefferedVitalSet._id = uuid.v4();
            prefferedVitalSet.userId = data.userId;
            prefferedVitalSet.vitalList = data.vitalList;
            prefferedVitalSet.vitalSetName = data.vitalSetName.trim();
            documentMaster.prefVitalSet.count({ userId: prefferedVitalSet.userId, vitalSetName: prefferedVitalSet.vitalSetName.toLowerCase() }
                , function (err, count) {
                    if (err) {
                        document.sendResponse(err, 406, "error", "none", res)
                    } else if (document.isFieldFilled(count) && count > 0) {
                        document.sendResponse("duplicate record name", 405, "error", "none", res)
                    } else {
                        prefferedVitalSet.save(function (err) {
                            if (err) {
                                document.sendResponse(err, 406, "error", "none", res);
                            } else {
                                document.sendResponse("none", "200", "done", "success", res)
                            }
                        })
                    }
                })

        } else {
            document.sendResponse("Invalid input", 406, "error", "none", res)
        }
    })
}

module.exports.getAllVitalSet = function (data, res) {
    documentMaster.prefVitalSet.find({ userId: data.userId })
        .populate('vitalList')
        .exec(function (err, result) {
            if (err) {
                log(err)
                document.sendResponse(err, 501, "error", "none", res)
            } else {
                document.sendResponse("none", "200", "done", result, res)
            }
        });
}
module.exports.getVitalSetDetails = function (data, res) {
    documentMaster.prefVitalSet.find({ _id: data.recordId })
        .populate('vitalList')
        .exec(function (err, result) {
            if (err) {
                log(err)
                document.sendResponse(err, 501, "error", "none", res)
            } else {
                document.sendResponse("none", "200", "done", result, res)
            }
        });
}
module.exports.updateVitalSet = function (data, res) {
    documentMaster.prefVitalSet.findOneAndUpdate({ _id: data.recordId }, { vitalSetName: data.vitalSetName, vitalList: data.vitalList },
        function (err, result) {
            if (err) {
                log(err)
                document.sendResponse(err, 501, "error", "none", res)
            } else {
                document.sendResponse("none", "200", "done", "update successfull", res)
            }
        });
}

module.exports.removeItemFromVitalSet = function (data, res) {
    documentMaster.prefVitalSet.findOne({ _id: data.recordId })
        .exec(function (err, result) {
            if (err) {
                log(err)
                document.sendResponse(err, 501, "error", "none", res)
            } else if (document.isFieldFilled(result)) {
                var index = result.vitalList.indexOf(data.itemId)
                if (index > -1) {
                    result.vitalList.splice(index, 1)
                    result.save()
                    document.sendResponse("none", 200, "done", "success", res)
                } else {
                    document.sendResponse("none", 200, "done", "success", res)
                }
            } else {
                document.sendResponse("invalid input", 406, "error", "none", res)
            }
        });
}
module.exports.deleteVitalSet = function (data, res) {
    documentMaster.prefVitalSet.remove({ _id: data.recordId }, function (err, result) {
        if (err) {
            log(err)
            document.sendResponse(err, 501, "error", "none", res)
        } else {
            document.sendResponse("none", "200", "done", "success", res)
        }
    });
}
