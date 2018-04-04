var uuid=require('node-uuid');
var document = require('./schema/domain-model.js');
var documentObject = new document();

var document1 = require('./schema/master-model.js');
var documentObject1 = new document1();

var document2 = require('./schema/cpoe_data_model.js');
var documentObject2 = new document2();

var doc3 = require('./schema/user_model.js');
var documentUserManagementMasters = new doc3();

var document4=require('./schema/access_data_model.js')
var accessControlModel=new document4()

var resultSchema=require('./schema/result_model');

// var document_INT = require('./schema/integration_model.js');
// var int_data_model = new document_INT();

var validFieldCheck = function (value) {
    if (typeof value !== 'undefined' && value != "" && value != null) {
        return true;
    } else {
        return false;
    }
}
// share global schema
module.exports.domainModel = documentObject;
module.exports.mastersModel = documentObject1;
module.exports.cpoeDataModel = documentObject2;
module.exports.userManagementModel = documentUserManagementMasters;
module.exports.accessControlModel=accessControlModel;
module.exports.resultDataModel=new resultSchema();
//module.exports.INT_DataModel = int_data_model;

exports.isFieldFilled = validFieldCheck;
module.exports.scriptDontAskWhy = function () {
    // documentObject.Visit.update({},{isActive:'true'},{'multi':true},function(err,count){
    //     if(err){
    //         log(err)
    //     }
    // })
    documentObject.Visit.find({})
        .populate({ path: 'patientId', model: 'Patient' })
        .exec(function (err, data) {
            if (err) {
                console.log(err);
            } else {
                data.forEach(function (result) {
                    result.isActive = 'true';
                    var searchKar = {};
                    if (validFieldCheck(result.patientId)) {
                        searchKar.mrn = result.patientId.mrn;
                        searchKar.clinicName = result.clinicName;
                        searchKar.cinicalDepartment = result.clinicalDepartment;
                        searchKar.location = result.location;
                        searchKar.name=result.patientId.name;
                    }
                    result.searchBox=searchKar;
                    result.save();
                })
            }
        })
}

module.exports.aclTest=function(collectionName){
    
}
module.exports.removeDuplicateVisits = function (data,doctorId) {
    var array = [];
    var cursor = [];
    data.forEach(function (element, index) {
        // console.log(element)
        element.accessFlag=false;
        if(element.doctorId==doctorId)
            element.accessFlag=true;
        if (index == 0 || cursor.indexOf(element.patientId._id) < 0) {
            array.push(element)
            cursor.push(element.patientId._id);
        }
    });
    return array;
}
module.exports.removeDuplicates = function (data) {
    var array = [];
    var cursor = [];
    data.forEach(function (element, index) {
        if (index == 0 || cursor.indexOf(element) < 0) {
            array.push(element)
            cursor.push(element);
        }
    });
    return array;
}
exports.sendValidationError = function (ValidationError, res) {
    var response = {
        "_error_message": ValidationError,
        "_status_Code": 407,
        "_status": "Validation Error",
        "result": "none"
    }
    if (!res.headerSent)
        res.status(200).send(response);
}
exports.sendResponse = function (errorMessage, statusCode, status, result, res) {
    var response = {
        "_error_message": errorMessage,
        "_status_Code": statusCode,
        "_status": status,
        "result": result
    }
    if (!res.headerSent)
        res.status(200).send(response);
}

// exports.getIndex=function(collectionName,cb){
//     log("collection name:"+collectionName)
//     this.findOneAndUpdate({ name: collectionName }, { $inc: { sequence: 1 } }, function (err, result) {
//             if (err) {
//                 cb(err,null)
//             } else {         
//                 var newCounter=documentObject1.masterCounter();
//                 if(!result){                    
//                     newCounter._id=uuid.v4();
//                     newCounter.name=collectionName;
//                     newCounter.sequence=1;                    
//                 }  
//                 result.sequence=result.sequence+1;
//                 result.save(function(err,result){
//                 if(err){
//                     cb(err,null)
//                 }else{
//                     cb(null,result.sequence)
//                 }
//             });
//             }
//         })   
// }