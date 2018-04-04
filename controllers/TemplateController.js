var document = require('../models/db_model');
var DomainModel = document.domainModel;
var CPOEDataModel=document.cpoeDataModel;
var async = require('async');
module.exports = function TemplateController() {
    this.getNCPTemplateData = function (req, res, next) {
        var patientId = Utility.escape(req.query.patientId);
        if (!patientId)
            return res.json(Utility.output("Patient ID is required", "VALIDATION_ERROR"));
        async.parallel([
            function (callback_parallel) {
                DomainModel.Patient.findOne({ _id: patientId }, function (err, patient) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            }
        ], function () {
            DomainModel.ncp_templates.aggregate([
                { $match: { patientId: Utility.escape(patientId) } },
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
                    $project: {
                        record_id: "$_id",
                        checkbox_values: "$checkbox_values",
                        date_top: "$date_top",
                        date_bottom: "$date_bottom",
                        time_top: "$time_top",
                        time_bottom: "$time_bottom",
                        patientId: "$patientId",
                        user: {
                            firstName: "$User.firstName",
                            lastName: "$User.lastName",
                            email: "$User.email",
                            userId: "$User.userId"
                        },
                        date_of_creation: "$date_of_creation",
                        date_of_modification: "$date_of_modification"
                    }
                }
            ], function (err, result) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                return res.json(Utility.output(result.length + " record(s) found", 'SUCCESS', result));
            });
        });
    };
    this.addEditNCPRecord = function (req, res, next) {
        var thisObj = this;
        var currentDate = new Date().getTime();
        var dateBottom = null;
        if (req.body.date_bottom) {
            var dateBottom = new Date(req.body.date_bottom + "");
            if (isNaN(dateBottom) && dateBottom)
                return res.json(Utility.output("Invalid Bottom Section Date[*] must be in (yyyy/mm/dd) format", "VALIDATION_ERROR"));
        }
        var dateTop = new Date(req.body.date_top + "");
        if (isNaN(dateTop))
            return res.json(Utility.output("Invalid Top Section Date[*] must be in (yyyy/mm/dd) format", "VALIDATION_ERROR"));
        if (!req.body.time_top)
            return res.json(Utility.output("Top section time is required", "VALIDATION_ERROR"));
        if (!req.body.signCode)
            return res.json(Utility.output("Sign Code is required", "VALIDATION_ERROR"));
        if (typeof req.body.checkbox_values !== 'object')
            return res.json(Utility.output("Checkbox value must be an object", "VALIDATION_ERROR"));
        if (!req.body.patientId)
            return res.json(Utility.output("Patient ID is required", "VALIDATION_ERROR"));
        var patientId = Utility.escape(req.body.patientId);
        var ncpRecord = {};
        async.parallel([
            function (callback_parallel) {
                DomainModel.User.findOne({ userId: req.decoded.userId, signCode: Utility.escape(req.body.signCode) }, function (err, user) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!user)
                        return res.json(Utility.output("Invalid Sign Code", 'ERROR'));
                    callback_parallel();
                });
            },
            function (callback_parallel) {
                DomainModel.Patient.findOne({ _id: patientId }, function (err, patient) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function (callback_parallel) {
                if (!req.body.record_id)
                    return callback_parallel();
                if (!Utility.checkObjectIdValidation(req.body.record_id))
                    return res.json(Utility.output("Invalid record ID", 'ERROR'));
                DomainModel.ncp_templates.findOne({ _id: req.body.record_id, patientId: patientId, userId: req.decoded.userId }, function (err, existNCPTemplate) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!existNCPTemplate)
                        return res.json(Utility.output("NCP Template record is not found", 'ERROR'));
                    ncpRecord = existNCPTemplate;
                    callback_parallel();
                });
            }
        ], function () {
            if (Utility.sizeOfObject(Utility.mongoObjectToNormalObject(ncpRecord))) {
                ncpRecord.checkbox_values = req.body.checkbox_values;
                ncpRecord.date_top = dateTop.getTime();
                if (dateBottom)
                    ncpRecord.date_bottom = dateBottom.getTime();
                ncpRecord.time_top = Utility.escape(req.body.time_top);
                ncpRecord.time_bottom = Utility.escape(req.body.time_bottom);
                ncpRecord.date_of_modification = currentDate;
                ncpRecord.save(function (err) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    thisObj.call_ncp_get(req, res, next);
                });
            }
            else {
                ncpRecord.patientId = patientId;
                ncpRecord.userId = req.decoded.userId;
                ncpRecord.checkbox_values = req.body.checkbox_values;
                ncpRecord.date_top = dateTop.getTime();
                if (dateBottom)
                    ncpRecord.date_bottom = dateBottom.getTime();
                ncpRecord.time_top = Utility.escape(req.body.time_top);
                ncpRecord.time_bottom = Utility.escape(req.body.time_bottom);
                ncpRecord.date_of_modification = currentDate;
                ncpRecord.date_of_creation = currentDate;
                new DomainModel.ncp_templates(ncpRecord).save(function (err) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    thisObj.call_ncp_get(req, res, next);
                });
            }
        });
    };
    this.call_ncp_get = function (req, res, next) {
        var headers = {
            'x-access-token': req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var endPointURL = Utility.baseURL();
        var options = {
            'url': endPointURL + '/template/ncp/get?patientId=' + req.body.patientId,
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                return res.json(body);
            }
            else
                return res.json(Utility.output("Unable to get ncp record", 'ERROR'));
        });
    };
    this.exportTemplates = function (req, res, next) {
        var data = req.body;
        DomainModel.FormTemplate.find({ _id: { $in: data.templateIds } }, function (err, result) {
            if (err) {
                return res.json(Utility.output("Unable to export templates try again", 'ERROR'));
            } else {
                res.send(result);
            }
        });
    };
    this.importTemplates = function (req, res, next) {
        const data = req.body;
        var payload = JSON.parse(data.fileContent);
        for (let i = 0; i < payload.length; i++) {
            payload[i]._id = uuid.v4();
            payload[i].created_at = Date.now();
            payload[i].status = true;
        }
        DomainModel.FormTemplate.collection.insertMany(payload, function (err, result) {
            if (err) {
                return res.json(Utility.output("Unable to import templates try again", 'ERROR'));
            } else {
                res.json(Utility.output(payload.length + " template(s) added", 'SUCCESS', result));
            }
        })

    };
    this.getDischargeSummaryData = function(req,res,next){
        var visitId = Utility.escape(req.query.visitId);
        var patientId = Utility.escape(req.query.patientId);
        var returnObj={};
        if (!visitId)
            return res.json(Utility.output("Visit ID is required", "VALIDATION_ERROR"));
        if (!patientId)
            return res.json(Utility.output("Patient ID is required", "VALIDATION_ERROR"));
        DomainModel.Visit.aggregate([
            {
                "$match": {"_id":visitId}
            },
            {
                $lookup:
                    {
                        from: "patients",
                        localField: "patientId",
                        foreignField: "_id",
                        as: "patients"
                    }
            },
            {
                $lookup:
                    {
                        from: "User",
                        localField: "doctorId",
                        foreignField: "userId",
                        as: "User"
                    }
            },
            { $unwind: { path: "$patients", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "hospital_name":"$User.hospitalName",
                    "patient":{
                        "patientId":"$patients._id",
                        "mrn":"$patients.mrn",
                        "name":"$patients.name",
                        "doa":"$visitDate",
                        "nric":"$patients.nric",
                        "passport":"$patients.passportNo",
                        "dod":null,
                        "gender":"$patients.gender",
                        "age":{ 
                            $divide: [{$subtract: [ new Date().getTime(), "$patients.dob" ] }, 
                                    (365*24*60*60*1000)]
                        },
                        "patientType":{$cond : { if: { $eq: [ "$OPD_IPD", 1 ] }, then: "IP", else: "OP" }},
                        "primaryDoctor":"$primaryDoctor"
                    }
                }
            }
        ],function(err,visitDetails){
            if(err)
                return res.json(Utility.output(err, 'ERROR'));
            if(!visitDetails.length)
                return res.json(Utility.output("Visit not found", 'ERROR'));
            visitDetails=visitDetails[0];
            if(visitDetails.patient.patientId!=patientId)
                return res.json(Utility.output("Selected visit is not for this patient", 'ERROR'));
            if(visitDetails.patient.patientType!="IP")
                return res.json(Utility.output("Selected visit is an "+visitDetails.patient.patientType+" visit", 'ERROR'));
            
            
            returnObj=JSON.parse(JSON.stringify(visitDetails));
            if(returnObj.patient.age<1)
                returnObj.patient.age=returnObj.patient.age.toFixed(1)*12+" Month(s)";
            returnObj.patient.age=parseInt(returnObj.patient.age)+"Yrs";
            returnObj.orders={
                "lab_orders":[],
                "procedures":[],
                "medications":[],
                "patient_movement":{}
            };
            returnObj.diagnosis_complaints=[];
            async.parallel([
                function (callback_parallel) {
                    DomainModel.Complaint.find({visitId:visitId},'date,icdCode,text_problem,status,type,severity,uration,comments').sort({date:-1}).exec(function(err,complaints){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.diagnosis_complaints=complaints;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visit:visitId,orderCategory:{$in:["Lab","lab","LAB"]},orderStatus:{$in:["active","completed"]}}).sort({orderDate:-1}).exec(function(err,labOrders){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.lab_orders=labOrders;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visit:visitId,orderCategory:"pharmacy",orderSubCategory:"ip","orderItems.isDischargeMedication":true,orderStatus:{$in:["active","completed"]}}).sort({orderDate:-1}).exec(function(err,dischageMedications){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.medications=dischageMedications;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visit:visitId,orderCategory:"procedure order",orderStatus:{$in:["active","completed"]}}).sort({orderDate:-1}).exec(function(err,procedures){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.procedures=procedures;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.findOne({visit:visitId,orderCategory:"patient movement",orderStatus:{$in:["active","completed"]},"orderItems.category":"discharge"}).sort({orderDate:-1}).exec(function(err,patientMovement){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.patient_movement=patientMovement;
                        callback_parallel();
                    });
                }
            ], function () {
                if(returnObj.orders.patient_movement.orderItems!=undefined)
                    returnObj.patient.patient.dod=returnObj.orders.patient_movement.orderItems.atdDate;
                return res.json(returnObj);
            });
        });
    };
    this.getPrescriptionNoteData = function(req,res,next){
        var visitId = Utility.escape(req.query.visitId);
        var patientId = Utility.escape(req.query.patientId);
        var returnObj={};
        if (!visitId)
            return res.json(Utility.output("Visit ID is required", "VALIDATION_ERROR"));
        if (!patientId)
            return res.json(Utility.output("Patient ID is required", "VALIDATION_ERROR"));
        DomainModel.Visit.aggregate([
            {
                "$match": {"_id":visitId}
            },
            {
                $lookup:
                    {
                        from: "patients",
                        localField: "patientId",
                        foreignField: "_id",
                        as: "patients"
                    }
            },
            {
                $lookup:
                    {
                        from: "User",
                        localField: "doctorId",
                        foreignField: "userId",
                        as: "User"
                    }
            },
            { $unwind: { path: "$patients", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "hospital_name":"$User.hospitalName",
                    "patient":{
                        "patientId":"$patients._id",
                        "mrn":"$patients.mrn",
                        "name":"$patients.name",
                        "doa":"$visitDate",
                        "nric":"$patients.nric",
                        "passport":"$patients.passportNo",
                        "dod":null,
                        "gender":"$patients.gender",
                        "address":"$patient.residentialAddress",
                        "mobile":"$patient.mobile",
                        "age":{ 
                            $divide: [{$subtract: [ new Date().getTime(), "$patients.dob" ] }, 
                                    (365*24*60*60*1000)]
                        },
                        "patientType":{$cond : { if: { $eq: [ "$OPD_IPD", 1 ] }, then: "IP", else: "OP" }},
                        "primaryDoctor":"$primaryDoctor"
                    }
                }
            }
        ],function(err,visitDetails){
            if(err)
                return res.json(Utility.output(err, 'ERROR'));
            if(!visitDetails.length)
                return res.json(Utility.output("Visit not found", 'ERROR'));
            visitDetails=visitDetails[0];
            if(visitDetails.patient.patientId!=patientId)
                return res.json(Utility.output("Selected visit is not for this patient", 'VALIDATION_ERROR'));
            
            returnObj=JSON.parse(JSON.stringify(visitDetails));
            if(returnObj.patient.age<1)
                returnObj.patient.age=returnObj.patient.age.toFixed(1)*12+" Month(s)";
            returnObj.patient.age=parseInt(returnObj.patient.age)+"Yrs";
            returnObj.orders={
                "lab_orders":[],
                "procedures":[],
                "medications":[],
                "imaging_orders":[],
                "nursing_orders":[],
            };
            returnObj.diagnosis_complaints=[];
            returnObj.vitals=[];
            returnObj.allergies=[];
            returnObj.template_data={};
            async.parallel([
                function (callback_parallel) {
                    DomainModel.Complaint.find({visitId:visitId},'date icdCode text_problem status type severity duration comments').sort({date:-1}).exec(function(err,complaints){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.diagnosis_complaints=complaints;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visitId:visitId,orderCategory:{$in:["Lab","lab","LAB"]},orderStatus:{$in:["active","completed","pending"]}}).sort({orderDate:-1}).exec(function(err,labOrders){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.lab_orders=labOrders;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visitId:visitId,orderCategory:"pharmacy",orderStatus:{$in:["active","completed","pending"]}}).sort({orderDate:-1}).exec(function(err,medications){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.medications=medications;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.find({visitId:visitId,orderCategory:"procedure order",orderStatus:{$in:["active","completed","pending"]}}).sort({orderDate:-1}).exec(function(err,procedures){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.procedures=procedures;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.findOne({visitId:visitId,orderCategory:new RegExp("imaging","i"),orderStatus:{$in:["active","completed","pending"]}}).sort({orderDate:-1}).exec(function(err,imagingOrders){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.imaging_orders=imagingOrders;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    CPOEDataModel.CpoeOrder.findOne({visitId:visitId,orderCategory:new RegExp("nursing","i"),orderStatus:{$in:["active","completed","pending"]}}).sort({orderDate:-1}).exec(function(err,nursingOrders){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.orders.nursing_orders=nursingOrders;
                        callback_parallel();
                    });
                },
                function (callback_parallel) {
                    var headers = {
                        'x-access-token': req.headers['x-access-token'],
                        'Content-Type': 'application/json'
                    }
                    var endPointURL = Utility.localBaseURL();
                    var options = {
                        'url': endPointURL + '/ehr/patients/'+patientId+'/getvitals?visitId='+visitId,
                        'method': 'GET',
                        'headers': headers,
                        'form': {}
                    };
                    request(options, function (error, response, body) {
                        try{
                            if (!error && response.statusCode === 200) {
                                body = JSON.parse(body);
                                returnObj.vitals=body.result;
                            }
                            callback_parallel();
                        }
                        catch(e){
                            callback_parallel();
                        }
                    });
                },
                function (callback_parallel) {
                    DomainModel.Allergies.find({patientId:patientId,state:"active"},'allergyName').sort({date:-1}).exec(function(err,allergies){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        returnObj.allergies=allergies;
                        callback_parallel();
                    });
                }
            ], function () {
                 DomainModel.prescription_notes.aggregate([
                    {
                        "$match": {"visitId":visitId}
                    },
                    {
                        $lookup:
                        {
                            from: "User",
                            localField: "signedBy",
                            foreignField: "userId",
                            as: "User"
                        }
                    },
                    { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            non_selected_orders:"$non_selected_orders",
                            advice: "$advice",
                            signedBy: "$User.name",
                            date_of_modification: "$date_of_modification"
                        }
                    }
                 ],function(err,existingTemplate){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(existingTemplate.length)
                         returnObj.template_data=existingTemplate[0];
                     return res.json(Utility.output("Template fetched","SUCCESS",returnObj));
                 });
            });
        });
    };
};