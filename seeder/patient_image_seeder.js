var async = require('async');
var PatientModel = require('../models/Seeder_Models/patient_model');
var mongoose = require('mongoose');
var uuid = require('node-uuid');
//mongoose.connect('mongodb://172.16.99.45/EHR');
var fs = require('fs');
var imageNames=[];
var dirPath="../data/files/";
var existsDir=0;
var notExistDir=0;
fs.readdir(dirPath+"undefined", function(err, items) {
    for (var i=0; i<items.length; i++) {
        imageNames.push(items[i]);
    }
    async.eachSeries(imageNames, function (eachImage, callback_each) {
        PatientModel.findOne({patientImg:new RegExp(eachImage,"i")},function(err,existPatient){
            if(err)
                return callback_each();
            if(!existPatient)
                return callback_each();
            var newPath=dirPath+existPatient._id+"/";
            if(fs.existsSync(newPath))
            {
                if(!fs.existsSync(newPath+eachImage))
                {
                    fs.createReadStream(dirPath+"undefined/"+eachImage).pipe(fs.createWriteStream(newPath+eachImage));
                    existsDir++;
                }
            }
            else
            {
                fs.mkdirSync(newPath);
                fs.createReadStream(dirPath+"undefined/"+eachImage).pipe(fs.createWriteStream(newPath+eachImage));
                notExistDir++;
            }
            callback_each();
        });
    },function(){
        console.log((existsDir+notExistDir)+" image(s) copied");
        console.log(existsDir+" image(s) copied exists dir");
        console.log(notExistDir+" image(s) copied not exists dir");
        mongoose.disconnect();
    });
});