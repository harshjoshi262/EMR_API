var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var DomainModel = document.domainModel;
var async = require('async');
var EMR_CONFIG = require('config').get('ehrserver');
module.exports = function ImmunisationController() {
    this.get=function(req,res,next){
        var returnObj=[];
        var resultObj=[];
        var allVaccins=[];
        var doses={};
        var patientId=(req.query.patientId)?Utility.escape(req.query.patientId):null;
        var dueAge="";
        if(!patientId)
            return res.json(Utility.output('Patient ID is requried', 'VALIDATION_ERROR'));
        DomainModel.Patient.findOne({_id:patientId},function(err,patient){
            if(err)
                return res.json(Utility.output(err, 'ERROR'));
            if(!patient)
                return res.json(Utility.output("Patient not found", 'ERROR'));
            async.parallel([
                function(callback_parallel){
                    MasterModel.M_Immunisations_Age_Doses.find({},function(err,dosesData){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        async.eachSeries(dosesData, function iteratee(eachData, callback_each) {
                            eachData=Utility.mongoObjectToNormalObject(eachData);
                            if(doses[eachData.immunisation_id]===undefined)
                                doses[eachData.immunisation_id]=[];
                            eachData['status']="upcoming";
                            var age=Utility.calculateAgeInMonth(patient.dob)/12;
                            if(age>=eachData.age_from)
                                eachData.status="due";
                            doses[eachData.immunisation_id].push(eachData);
                            callback_each();
                        },function(){
                            callback_parallel()
                        }); 
                    });
                },
                function(callback_parallel){
                    MasterModel.M_Immunisations.find({Status:1},function(err,vaccins){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        if(!vaccins)
                            return res.json(Utility.output("No Vaccines are found", 'ERROR')); 
                        allVaccins=vaccins;
                        callback_parallel();
                    });
                }
            ],function(){
                DomainModel.immunisations.find({patientId:Utility.escape(req.query.patientId)})
                    .populate({ path: 'immunisation_id', model: MasterModel.M_Immunisations })
                    .sort({date_of_creation:1}).exec(function(err,lists){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    
                    async.eachSeries(lists, function iteratee(eachData, callback_each) {
                        if(eachData.immunisation_id.Status!=1)
                            return callback_each();
                        var doseDetails=[];
                        var temp={
                            history_id:eachData._id,
                            vaccine:eachData.immunisation_id.vaccine,
                            vaccine_id:eachData.immunisation_id._id,
                            created_by:eachData.user_id,
                            patientId:eachData.patientId,
                            next_due:eachData.immunisation_id.vaccine,
                            date_of_creation:eachData.date_of_creation,
                            date_of_modification:eachData.date_of_modification,
                            doses:doses[eachData.immunisation_id._id]
                        };
                        dueAge="";
                        async.eachSeries(temp.doses, function iteratee(eachDose, callback_each1) {
                            var temp1=Utility.mongoObjectToNormalObject(eachDose);
                            temp1.dose_id=temp1._id;
                            delete temp1.age_from;
                            delete temp1.age_to;
                            delete temp1.immunisation_id;
                            delete temp1._id;
                            var index = eachData.givenDoses.findIndex(x => x.dose_details==eachDose._id);
                            temp1.givenDetails={};
                            if(index>=0)
                            {
                                temp1.status="given";
                                DomainModel.User.findOne({userId:eachData.givenDoses[index].given_by},function(err,userDetails){
                                    if(err)
                                        return res.json(Utility.output(err, 'ERROR'));
                                    if(!userDetails)
                                        return res.json(Utility.output('Vaccine given user not found', 'ERROR'));
                                    temp1.givenDetails={
                                        given_by:{
                                            userId:userDetails.userId,
                                            firstName:userDetails.firstName,
                                            userType:userDetails.userType,
                                            email:userDetails.email
                                        },
                                        given_on:eachData.givenDoses[index].given_on,
                                        comment:eachData.givenDoses[index].comment
                                    };
                                    doseDetails.push(temp1);
                                    callback_each1();
                                });
                            }
                            else{
                                if(!dueAge)
                                    dueAge=temp1.age_range;
                                doseDetails.push(temp1);
                                callback_each1();
                            }
                        },function(){
                            temp.doses=doseDetails;
                            temp.next_due+=" ("+dueAge+")";
                            resultObj.push(temp);
                            callback_each();
                        });
                    },function(){
                        async.eachSeries(allVaccins, function iteratee(eachData, callback_each) {
                            eachData=Utility.mongoObjectToNormalObject(eachData);
                            var doseDetails=[];
                            var temp={
                                history_id:"",
                                vaccine:eachData.vaccine,
                                vaccine_id:eachData._id,
                                created_by:"",
                                patientId:eachData.patientId,
                                next_due:eachData.vaccine,
                                date_of_creation:"",
                                date_of_modification:"",
                                doses:doses[eachData._id]
                            };
                            var index=resultObj.findIndex(x => x.vaccine_id.toString()==eachData._id);
                            if(index<0)
                            {
                                dueAge="";
                                async.eachSeries(temp.doses, function iteratee(eachDose, callback_each1) {
                                    var temp1=Utility.mongoObjectToNormalObject(eachDose);
                                    temp1.dose_id=temp1._id;
                                    delete temp1.age_from;
                                    delete temp1.age_to;
                                    delete temp1.immunisation_id;
                                    delete temp1._id;
                                    temp1.givenDetails={};
                                    if(!dueAge)
                                        dueAge=temp1.age_range;
                                    doseDetails.push(temp1);
                                    callback_each1();
                                },function(){
                                    temp.doses=doseDetails;
                                    temp.next_due+=" ("+dueAge+")";
                                    returnObj.push(temp);
                                    callback_each();
                                });
                            }
                            else
                            {
                                returnObj.push(resultObj[index]);
                                callback_each();
                            }
                        },function(){
                            return res.json(Utility.output(returnObj.length+" vaccine(s) fetched","SUCCESS",returnObj));
                        });
                    });     
                });
            });
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
            return res.json(Utility.output('Dose given on (Date yyyy/mm/dd) is requried', 'VALIDATION_ERROR'));
        var givenOn = new Date(req.body.given_on);
        if(isNaN(givenOn))
            return res.json(Utility.output("Invalid dose given on date format. Format must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(req.body.history_id){
            if(!Utility.checkObjectIdValidation(req.body.history_id))
                return res.json(Utility.output('Invalid dose id', 'VALIDATION_ERROR'));
        }
        else
            req.body.history_id="";
        
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
                    DomainModel.immunisations.findOne({immunisation_id:doseDetails.immunisation_id._id,patientId:Utility.escape(req.body.patientId)},function(err,immunisationData){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        if(immunisationData)
                            req.body.history_id=immunisationData._id;   
                        callback_parallel(); 
                    });
                });
            },
            function(callback_parallel){
                DomainModel.immunisations.findOne({givenDoses:{$elemMatch: {dose_details:new ObjectID(req.body.dose_id)}},patientId:Utility.escape(req.body.patientId)},function(err,immunisationData){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(immunisationData)
                        req.body.history_id=immunisationData._id;   
                    callback_parallel();
                });
            }
        ],function(){
            if(req.body.history_id){
                DomainModel.immunisations.findOne({_id:req.body.history_id},function(err,history){
                    if(err)
                        return res.json(Utility.output("ERROR:"+err, 'ERROR'));
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
        var endPointURL=Utility.baseURL();
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