var async = require('async');
//var DummyUsers = require('../models/dummy_users');
var document = require('../models/db_model.js');
var documentObject = document.domainModel
//var User = require('../models/user');
//var Doctor = require('../models/doctor');
var mongoose = require('mongoose');
var uuid = require('node-uuid');
//mongoose.connect('mongodb://180.92.175.218/yuvitime');
//mongoose.connect('mongodb://172.16.99.52:27017/ehrQA');

function addUsers() {
    DummyUsers.find({}, function (err, userDummy) {
        var countx = 0;
        async.eachSeries(userDummy, function (eachUser, cb) {
            doctorObj = JSON.parse(JSON.stringify(eachUser));
            if (doctorObj === undefined)
                return cb();
            doctorObj._id = uuid.v4();
            doctorObj['accessCode'] = doctorObj.email;
            doctorObj['hospitalName'] = 'hospital_123';
            if (!doctorObj.email || doctorObj.email === '.') {
                doctorObj['accessCode'] = 'user' + doctorObj.hisUserId + '@lamwahee.com';
                doctorObj['email'] = 'user' + doctorObj.hisUserId + '@lamwahee.com';
            }

            doctorObj['signCode'] = 'testSign2';
            doctorObj['expiryDate'] = 1535881611122;
            Doctor.findOne({ access_code: doctorObj['accessCode'] }, function (err, existDoctor) {
                if (!err && !existDoctor) {
                    new Doctor(doctorObj).save(function (err, newDoctor) {
                        User.findOne({ hisUserId: doctorObj.hisUserId }, function (err, userInfox) {
                            try {
                                //console.log(doctorObj);
                                userInfo = doctorObj;
                                if (!userInfox) {
                                    userInfo._id = uuid.v4();
                                    userInfo.userId = doctorObj._id;
                                    console.log(userInfo);
                                    new User(userInfo).save(function (err, newUser) {
                                        countx++;
                                        cb();
                                        if (countx == userDummy.length) {
                                            mongoose.disconnect();
                                        }
                                    });
                                }
                                else {
                                    cb();
                                }
                            } catch (e) {
                                console.log(e);
                            }
                        });
                    });
                }
                else
                    cb();
            });
        }, function () {
            console.log(countx + " User(s) Imported");
        });
    });
}

//addNametoVisit();

function addNametoVisit() {
    documentObject.Visit.find({}, (err, results) => {
        if (err)
            console.log("Error");
        else {
            console.log("Result Length: " + results.length);
            results.forEach(function (element) {
                documentObject.Patient.findOne({ _id: element.patientId }, (err, success) => {
                    if (err)
                        log("Patient not found")
                    else {
                        documentObject.Visit.findOneAndUpdate({_id:element._id},{'searchBox.name':success.name},function (err, saved) {
                            if (err)
                                console.log("Error");
                            else
                                console.log("Patient Name added to Visit");
                        })
                    }
                })
            }, this);
        }
    })
}