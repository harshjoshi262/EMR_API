var document = require('../models/db_model');
var DomainModel = document.domainModel;
var CPOEDocument = document.cpoeDataModel;
var async = require('async');
class OrderController{
    constructor(req,res,next){
        this.req=req;
        this.res=res;
        this.next=next;
    }
    orderSummary(){
        var thisObj=this;
        var returnObject={
            patient:{},
            visit:{},
            orders:[]
        };
        if(!thisObj.req.query.patientId){
            thisObj.res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        }
        if(!thisObj.req.query.visit){
            thisObj.res.json(Utility.output("Visit ID is required","VALIDATION_ERROR"));
        }
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:thisObj.req.query.patientId},'name mrn gender dob',function(err,patient){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return thisObj.res.json(Utility.output("Patient not found", 'ERROR'));
                    returnObject.patient=Utility.mongoObjectToNormalObject(patient);
                    returnObject.patient.dob=Utility.calculateAge(patient.dob);
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.Visit.findOne({_id:thisObj.req.query.visit},'visitDate primaryDoctor visitType OPD_IPD location',function(err,visit){
                    if(err)
                        return thisObj.res.json(Utility.output(err, 'ERROR'));
                    if(!visit)
                        return thisObj.res.json(Utility.output("Visit not found", 'ERROR'));
                    returnObject.visit=visit;
                    callback_parallel();
                });
            },
        ],function(){
            var query = {
                patientId: thisObj.req.query.patientId,
                orderStatus: { $ne: 'unsigned' }
            };
            if (thisObj.req.query.dateLower && thisObj.req.query.dateUpper) {
                query.orderDate = {
                    $gte: thisObj.req.query.dateLower,
                    $lte: thisObj.req.query.dateUpper
                };
            }
            if (thisObj.req.query.orderStatus == "pending") {
                query.orderStatus = 'pending';
            }
            if (thisObj.req.query.visit) {
                query.visitId = thisObj.req.query.visit;
            }
            CPOEDocument.CpoeOrder.find(query).sort({
                orderDate: -1
            }).exec(function (err, results) {
                if (err) {
                    thisObj.res.json(Utility.output(err,"ERROR"));
                } else {
                    returnObject.orders=results;
                    thisObj.res.json(Utility.output("Executed","SUCCESS",returnObject));
                }
            });
        });
    }
}
module.exports=function(req,res,next){
    return new OrderController(req,res,next);
};


