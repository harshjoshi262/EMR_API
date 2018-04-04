var mongoose = require('mongoose'),
    moment = require('moment'),
    uuid = require('node-uuid');
    require('graylog');
document = require('./db_model.js');
var documentObject = document.domainModel;


module.exports.addUser_audit = function (userData) {

    var userAuditSave = new documentObject.user_audit();
    userAuditSave._id = uuid.v4();
    userAuditSave.userId = userData.userId;
    userAuditSave.recordType = userData.recordType;
    userAuditSave.recordId = userData.recordId;
    userAuditSave.action = userData.action;
    userAuditSave.subjectId = userData.subjectId;
    userAuditSave.timeStamp = userData.timeStamp;
    userAuditSave.subject = userData.subject ;


    userAuditSave.save(function (err) {
                if (err) {
                    console.log(err);
                    return false;
                } else {
                    
                    return true;
                }
            });



}


module.exports.showUser_audit = function (userId,res){
documentObject.user_audit.find({ userId: userId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {

            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
        }


        else {
            var response = {
                "_error_message": "Invalid UserId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }

    });





};