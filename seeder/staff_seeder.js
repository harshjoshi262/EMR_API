var async = require('async');
var DummyUsers = require('../models/dummy_users');
var User = require('../models/user');
var Staff = require('../models/staff');
var mongoose = require('mongoose');
var uuid = require('node-uuid');
//mongoose.connect('mongodb://180.92.175.218/yuvitime');
//mongoose.connect('mongodb://localhost:27017/ehrcopy');

function addUsers() {
    DummyUsers.find({}, function (err, userDummy) {
        var countx = 0;
        var doctorObj={};
        async.eachSeries(userDummy, function (eachUser, cb) {
            doctorObj = eachUser;
            if (doctorObj === undefined)
                return cb();

            doctorObj.unitDepartments=[];
            doctorObj.personalInfo={};
            doctorObj.addressInfo={};
            doctorObj.dependentInfo= [];
            doctorObj.userDetails={};
            doctorObj.attachments=[];
            doctorObj.setPassword="false";
            doctorObj.sockets=[];
            Staff.findOne({ access_code: doctorObj['accessCode'] }, function (err, existDoctor) {
                if (!err && !existDoctor) {
                    var staffID=uuid.v4();
                    new Staff({
                        _id: staffID,
                        accessCode: doctorObj['accessCode'],
                        firstName: doctorObj['firstName'],
                        EmpNo:doctorObj['EmpNo'],
                        Department:doctorObj['Department'],
                        Category:doctorObj['Category'],
                        email: doctorObj['email'],
                        lastName: doctorObj['lastName'],
                        userType:doctorObj['userType'],
                        created_at: doctorObj['created_at'],
                        updated_at: doctorObj['updated_at']
                    }).save(function (err, newDoctor) {
                        User.findOne({ accessCode: doctorObj.accessCode }, function (err, userInfox) {
                            try {
                                if (!userInfox) {
                                    doctorObj.userId = staffID;
                                    doctorObj._id = staffID;
                                    User.collection.insert(doctorObj);
                                    countx++;
                                    cb();
                                    if (countx == userDummy.length) {
                                        mongoose.disconnect();
                                    }
                                    /*
                                    new User(doctorObj).save(function (err, newUser) {
                                        console.log(err);
                                        console.log("Saved User",newUser);
                                        countx++;
                                        cb();
                                        if (countx == userDummy.length) {
                                            mongoose.disconnect();
                                        }
                                    });*/
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
            //console.log("Users",doctorObj);
            console.log(countx + " User(s) Imported");
        });
    });
}
addUsers();