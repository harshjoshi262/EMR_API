var document = require('../models/db_model');
var DomainModel = document.domainModel;
var async = require('async');
class ContinuousNote{
    constructor(req,res,next){
        this.req=req;
        this.res=res;
        this.next=next;
    }
    addEditNote(){
        var thisObj=this;
        var currentDate=new Date().getTime();
        var continuousNotes={};
        if(thisObj.req.body.date){
            var date = new Date(thisObj.req.body.date+"");
            if(isNaN(date) && date)
                return thisObj.res.json(Utility.output("Invalid Date[*] must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        }
        if(!thisObj.req.body.note){
            return thisObj.res.json(Utility.output("Note is required","VALIDATION_ERROR"));
        }
        if(!thisObj.req.body.signCode){
            return thisObj.res.json(Utility.output("Sign Code is required","VALIDATION_ERROR"));
        }
        if(!thisObj.req.body.patientId)
            return thisObj.res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        if(!thisObj.req.body.visitId)
            return thisObj.res.json(Utility.output("Visit ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(thisObj.req.body.patientId);
        async.parallel([
            function(callback_parallel){
                DomainModel.User.findOne({userId:thisObj.req.decoded.userId,signCode:Utility.escape(thisObj.req.body.signCode)},function(err,user){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!user)
                        return thisObj.res.json(Utility.output("Invalid Sign Code", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return thisObj.res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.Visit.findOne({patientId:patientId,_id:Utility.escape(thisObj.req.body.visitId)},function(err,patient){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return thisObj.res.json(Utility.output("Visit not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                if(!thisObj.req.body.note_id)
                    return callback_parallel();
                if(!Utility.checkObjectIdValidation(thisObj.req.body.note_id))
                    return thisObj.res.json(Utility.output("Invalid note ID", 'ERROR'));
                DomainModel.continuous_notes.findOne({_id:thisObj.req.body.note_id,patientId:patientId,userId:thisObj.req.decoded.userId},function(err,existRecord){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!existRecord)
                        return thisObj.res.json(Utility.output("Note is not found", 'ERROR'));
                    continuousNotes=existRecord;
                    callback_parallel();
                });
            }
        ],function(){
            var updatedObj={
                    date:new Date(thisObj.req.body.date+"").getTime(),
                    note:Utility.escape(thisObj.req.body.note),
                    treatment:Utility.escape(thisObj.req.body.treatment),
                    patientId:patientId,
                    userId:thisObj.req.decoded.userId,
                    visitId:Utility.escape(thisObj.req.body.visitId),
                    date_of_modification:currentDate
                };
            if(thisObj.req.body.note_id){
                if(continuousNotes.userId!=thisObj.req.decoded.userId)
                    return thisObj.res.json(Utility.output('Sorry!!You can\'t update this note', 'ERROR'));
                DomainModel.continuous_notes.update({_id:thisObj.req.body.note_id},{$set:updatedObj},function(err,noOfUpdate){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    thisObj.call_get();
                });
            }
            else
            {
                updatedObj.date_of_creation=currentDate;
                new DomainModel.continuous_notes(updatedObj).save(function(err,savedNote){
                    if(err)
                        return thisObj.res.json(Utility.output(err,"ERROR"));
                    thisObj.call_get();
                });
            }
        });
    }
    deleteNote(){
        var thisObj=this;
        var patientDetails={};
        if(!thisObj.req.body.patientId)
            return thisObj.res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(thisObj.req.body.patientId);
        if(!thisObj.req.body.note_id)
            return thisObj.res.json(Utility.output("Note ID is required","VALIDATION_ERROR"));
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return thisObj.res.json(Utility.output("Patient not found", 'ERROR'));
                    patientDetails=patient;
                    callback_parallel();
                });
            },
            function(callback_parallel){
                if(!thisObj.req.body.note_id)
                    return callback_parallel();
                if(!Utility.checkObjectIdValidation(thisObj.req.body.note_id))
                    return thisObj.res.json(Utility.output("Invalid note ID", 'ERROR'));
                DomainModel.continuous_notes.findOne({_id:thisObj.req.body.note_id,patientId:patientId,userId:thisObj.req.decoded.userId},function(err,existRecord){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!existRecord)
                        return thisObj.res.json(Utility.output("Your selected note not found", 'ERROR'));
                    callback_parallel();
                });
            }
        ],function(){
            DomainModel.continuous_notes.remove({_id:thisObj.req.body.record_id,patientId:patientId,userId:thisObj.req.decoded.userId},function(err){
                if(err)
                    return thisObj.res.json(Utility.output(err, 'ERROR'));
                thisObj.call_get("Deleted");    
            });
        });
    }
    get(){
        var thisObj=this;
        if(!thisObj.req.query.patientId)
            return thisObj.res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(thisObj.req.query.patientId);
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return thisObj.res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                if(thisObj.req.query.visitId)
                {
                    DomainModel.Visit.findOne({patientId:patientId,_id:Utility.escape(thisObj.req.query.visitId)},function(err,patient){
                        if(err)
                            return thisObj.res.json(Utility.output(err, 'ERROR'));
                        if(!patient)
                            return thisObj.res.json(Utility.output("Visit not found", 'ERROR'));
                        callback_parallel();
                    });
                }
                else
                   callback_parallel(); 
            }
        ],function(){
            var matchQuery={
                patientId:patientId
            };
            if(thisObj.req.query.visitId)
                matchQuery.visitId=Utility.escape(thisObj.req.query.visitId);
            DomainModel.continuous_notes.aggregate([
                {
                    "$match": matchQuery
                },
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
                        note_id:"$_id",
                        date:"$date",
                        note:"$note",
                        title:"Progress Note",
                        treatment:"$treatment",
                        patientId:"$patientId",
                        visitId:"$visitId",
                        signedBy:{
                            firstName:"$User.firstName",
                            lastName:"$User.lastName",
                            email:"$User.email",
                            userId:"$User.userId"
                        },
                        date_of_creation:"$date_of_creation",
                        date_of_modification:"$date_of_modification",
                    }
                }
            ],function(err,notes){
                if(err)
                    return thisObj.res.json(Utility.output(err,'ERROR'));
                return thisObj.res.json(Utility.output(notes.length+" note(s) are found","SUCCESS",notes));
            });
        });
    }
    call_get(action){
        var thisObj=this;
        var headers = {
            'x-access-token': thisObj.req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var endPointURL=Utility.baseURL();
        var options = {
            'url': endPointURL + '/continuous_note/get?patientId='+thisObj.req.body.patientId,
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                body._success_message="Record Saved";
                if(action=="Deleted")
                    body._success_message="Record Deleted";
                return thisObj.res.json(body);
            }
            else
                return thisObj.res.json(Utility.output("Unable to get continuous note", 'ERROR'));
        });
    }
}
module.exports=function(req,res,next){
    return new ContinuousNote(req,res,next);
};

