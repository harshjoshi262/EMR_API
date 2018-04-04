var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var DomainModel = document.domainModel;
var async = require('async');
module.exports = function PatientController() {
    this.getPatientIPDWards = function(req,res,next){
        DomainModel.Visit.find({
            doctorId: req.decoded.userId, 
            isActive: 'true',
            patientType:{$in:["IP","ip"]}
        })
        .populate({ path: 'patientId', model: 'Patient' })
        .populate({ path: 'patientId', model: 'Patient' })
        .sort({ visitDate: -1 })
        .exec(function (err, visitResults) {
            //return res.json(visitResults);
            var returnObj=[];
            var wardVisit={};
            if(err)
                return res.json(Utility.output(err,"ERROR"));
            async.eachSeries(visitResults, function iteratee(eachVisit, callback_each) {
                if(wardVisit[eachVisit.searchBox.WardID]===undefined){
                    wardVisit[eachVisit.searchBox.WardID]={
                        WardID:eachVisit.searchBox.WardID,
                        location:eachVisit.searchBox.location,
                        location_code:null,
                        patients:[]
                    };
                    MasterModel.m_wards.findOne({"$or":[{Description:new RegExp(eachVisit.searchBox.location)},{ID:eachVisit.searchBox.WardID}]},function(err,mWard){
                        if(err)
                            return res.json(Utility.output(err,"ERROR"));
                        if(mWard)
                            wardVisit[eachVisit.searchBox.WardID].location_code=mWard.Code;
                        
                        wardVisit[eachVisit.searchBox.WardID].patients.push(eachVisit);
                        callback_each();
                    });
                }
                else
                {
                    wardVisit[eachVisit.searchBox.WardID].patients.push(eachVisit);
                    callback_each();
                }
            },function(){
                async.eachSeries(wardVisit, function iteratee(eachWard, callback_each) {
                    returnObj.push(eachWard);
                    callback_each();
                },function(){
                    return res.json(Utility.output(returnObj.length+" ward(s) are found","SUCCESS",returnObj));
                });
            });
        });
    };
};