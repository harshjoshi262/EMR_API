var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var DomainModel = document.domainModel;
var async = require('async');
var EMR_CONFIG = require('config').get('ehrserver');
module.exports = function MedicalReconciliationController() {
    this.get=function(req,res,next){
        var headers = {
            'x-access-token': req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var endPointURL=Utility.baseURL();
        console.log(endPointURL + '/history/medication/get?patientId='+req.body.patientId+'&medical_reconciliation=true');
        var options = {
            'url': endPointURL + '/history/medication/get?patientId='+req.body.patientId+'&medical_reconciliation=true',
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                return res.json(body);
            }
            else
                return res.json(Utility.output("Unable to get medication history", 'ERROR'));
        });
    };
    this.update=function(req,res,next){
        var thisObj=this;
        var currentTime=new Date();
        if(!req.body.dose_id)
            return res.json(Utility.output('Dose ID is requried', 'VALIDATION_ERROR'));
        if(!Utility.checkObjectIdValidation(req.body.dose_id))
            return res.json(Utility.output('Invalid dose id', 'VALIDATION_ERROR'));
        if(!req.body.given_on)
            return res.json(Utility.output('Dose given on (Date yyyy-mm-dd) is requried', 'VALIDATION_ERROR'));
        var givenOn = new Date(req.body.given_on);
        if(isNaN(givenOn))
            return res.json(Utility.output("Invalid dose given on date format. Format must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(req.body.history_id){
            if(!Utility.checkObjectIdValidation(req.body.history_id))
                return res.json(Utility.output('Invalid dose id', 'VALIDATION_ERROR'));
        }
        else
            req.body.history_id="";
        console.log("History ID",req.body.history_id);
        if(!req.body.patientId)
            return res.json(Utility.output('Invalid patient id', 'VALIDATION_ERROR'));
        var paientDetails={};
        var doseDetails={};
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:Utility.escape(req.body.patientId)},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    paientDetails=patient;
                    callback_parallel();
                });
            },
            function(callback_parallel){
                MasterModel.M_Immunisations_Age_Doses.findOne({_id:req.body.dose_id}).populate('immunisation_id').exec(function(err,dosesData){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!dosesData)
                        return res.json(Utility.output('Dose data not found', 'ERROR'));
                    doseDetails=dosesData;
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.immunisations.findOne({givenDoses:{$elemMatch: {dose_details:new ObjectID(req.body.dose_id)}}},function(err,immunisationData){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(immunisationData)
                        req.body.history_id=immunisationData._id;   
                    callback_parallel();
                });
            }
        ],function(){
            DomainModel.immunisations.findOne({_id:req.body.history_id},function(err,history){
                if(err)
                    return res.json(Utility.output(err, 'ERROR'));
                if(history)
                {
                    var historyJSobj=Utility.mongoObjectToNormalObject(history);
                    var index = historyJSobj.givenDoses.findIndex(x => x.dose_details==req.body.dose_id);
                    if(index<0)
                    {
                        history.givenDoses.push({
                            "given_by" : req.decoded.userId,
                            "given_on" : givenOn.getTime(),
                            "dose_details" : new ObjectID(req.body.dose_id),
                            "comment" : Utility.escape(req.body.comment)
                        });
                    }
                    else
                    {
                        history.givenDoses[index]={
                            "given_by" : req.decoded.userId,
                            "given_on" : givenOn.getTime(),
                            "dose_details" : new ObjectID(req.body.dose_id),
                            "comment" : Utility.escape(req.body.comment)
                        };
                    }
                    DomainModel.immunisations.update({_id:req.body.history_id},{$set:{givenDoses:history.givenDoses,date_of_modification:currentTime.getTime()}},function(err,noOfUpdate){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        thisObj.call_get(req,res,next);    
                    });
                }
                else
                {
                    new DomainModel.immunisations({
                        "immunisation_id" : doseDetails.immunisation_id._id,
                        "user_id" : req.decoded.userId,
                        "patientId" : Utility.escape(req.body.patientId),
                        "givenDoses" : [ 
                            {
                                "given_by" : req.decoded.userId,
                                "given_on" : givenOn.getTime(),
                                "dose_details" : new ObjectID(req.body.dose_id),
                                "comment" : Utility.escape(req.body.comment)
                            }
                        ],
                        "date_of_creation" : currentTime.getTime(),
                        "date_of_modification" : currentTime.getTime()
                    }).save(function(err,updated_history){
                        if(err)
                            return res.json(err,'ERROR');
                        thisObj.call_get(req,res,next);
                    });
                }
            });
        });
    };
    this.delete=function(req,res,next){
        var thisObj=this;
        var currentTime=new Date();
        if(!req.body.dose_id)
            return res.json(Utility.output('Dose ID is requried', 'VALIDATION_ERROR'));
        if(!Utility.checkObjectIdValidation(req.body.dose_id))
            return res.json(Utility.output('Invalid dose id', 'VALIDATION_ERROR'));
        if(!req.body.patientId)
            return res.json(Utility.output('Invalid patient id', 'VALIDATION_ERROR'));
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:Utility.escape(req.body.patientId)},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.immunisations.findOne({givenDoses:{$elemMatch: {dose_details:new ObjectID(req.body.dose_id)}},patientId:Utility.escape(req.body.patientId)},function(err,immunisationData){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(immunisationData)
                        req.body.history_id=immunisationData._id;   
                    else
                        return res.json(Utility.output('Dose not found','ERROR'));
                    callback_parallel();
                });
            }
        ],function(){
            DomainModel.immunisations.findOne({_id:req.body.history_id},function(err,history){
                if(err)
                    return res.json(Utility.output(err, 'ERROR'));
                if(history)
                {
                    var historyJSobj=Utility.mongoObjectToNormalObject(history);
                    var index = historyJSobj.givenDoses.findIndex(x => x.dose_details==req.body.dose_id);
                    if(index>=0)
                    {
                        delete historyJSobj.givenDoses.splice(index, 1);
                        if(historyJSobj.givenDoses.length===0)
                            historyJSobj.givenDoses=[];
                    }
                    DomainModel.immunisations.update({_id:req.body.history_id},{$set:{givenDoses:historyJSobj.givenDoses,date_of_modification:currentTime.getTime()}},function(err,noOfUpdate){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        thisObj.call_get(req,res,next);    
                    });
                }
                else
                {
                    return res.json(Utility.output('Dose not found','ERROR'));
                }
            });
        });
    };
    this.call_get=function(req,res,next){
        var headers = {
            'x-access-token': req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var endPointURL="http://";
        if(EMR_CONFIG.secured!==undefined)
            if(EMR_CONFIG.secured)
                endPointURL="https://";
        endPointURL+=EMR_CONFIG.ip;
        if(EMR_CONFIG.serverPort!==undefined)
            if(EMR_CONFIG.serverPort)
                endPointURL+=":"+EMR_CONFIG.serverPort;
        console.log(endPointURL + '/immunisation/get?patientId='+req.body.patientId);
        var options = {
            'url': endPointURL + '/immunisation/get?patientId='+req.body.patientId,
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                return res.json(body);
            }
            else
                return res.json(Utility.output("Unable to get medication history", 'ERROR'));
        });
    };
};