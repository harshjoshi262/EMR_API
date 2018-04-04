'use strict'
var mongoose = require('mongoose'),
    uuid = require('node-uuid');
var documentObject = require('./db_model.js');
var userManagement = documentObject.userManagementModel;
var userDomainModel = documentObject.domainModel;
var masterModel = documentObject.mastersModel;
var doctorModel = require('./doctor_model.js');
var notificationModel = require('./notification_model.js')
var access = require('./access_model');
var crypto = require('crypto')
var request = require('request-promise')
var nodemailer = require('nodemailer')
var jwt = require('jsonwebtoken')
var _ = require('lodash')
var handlebars = require('handlebars');
var SMTP_CONFIG = require('config').get('SMTP')
var EHR_SERVER_CONFIG = require('config').get('ehrserver');
//##################### user registration
module.exports.registerUser = function (data, files, res) {
    var userImg = '';
    var attachments = [];
    _.forEach(files, function (file) {
        var fileName = file.originalname;
        var tempFile = {};
        if (file.fieldname == 'userImg') {
            userImg = file.path.replace('data/', EHR_SERVER_CONFIG.ip + ":" + EHR_SERVER_CONFIG.serverPort + "/");// old one// userImg = files[i].path.replace('data', '');
        } else if (file.fieldname == 'attachment') {
            var fileUrl = file.path.replace('data/', EHR_SERVER_CONFIG.ip + ":" + EHR_SERVER_CONFIG.serverPort + "/");
            tempFile.fileName = fileName;
            tempFile.fileUrl = fileUrl;
            attachments.push(tempFile);
            // console.log(attachments);
        }
    });

    var newUser = new userDomainModel.User();
    newUser._id = data.userId;
    newUser.userType = data.userType.toLowerCase();
    newUser.email = data.email
    newUser.accessCode = data.email
    newUser.name = data.name
    newUser.firstName = data.firstName
    newUser.lastName = data.lastName
    newUser.hisUserId = data.hisUserId
    newUser.unit = data.unit
    newUser.hospitalName = 'hospital_123'
    newUser.gender = data.gender
    newUser.prefix = data.prefix
    newUser.userGroup = data.userGroup
    newUser.userSubGroup = data.userSubGroup
    newUser.dob = data.dob;
    newUser.roles = data.roles;
    newUser.disabledNotifications = []
    newUser.userAssociation = data.userAssociation;
    newUser.expiryDate = new Date().getTime() + (86400000 * 365)  //Set Expire Date +365 days

    data.unitDepartments ? newUser.unitDepartments = JSON.parse(data.unitDepartments) : newUser.unitDepartments = []

    data.personalInfo ? newUser.personalInfo = JSON.parse(data.personalInfo) : newUser.personalInfo = {}

    data.dependentInfo ? newUser.dependentInfo = JSON.parse(data.dependentInfo) : newUser.dependentInfo = []

    data.addressInfo ? newUser.addressInfo = JSON.parse(data.addressInfo) : newUser.addressInfo = {}
    newUser.created_at = Date.now();
    newUser.created_by = data.created_by;
    newUser.updated_at = newUser.created_at
    newUser.updated_by = newUser.created_by
    newUser.userId = newUser._id;
    newUser.password = "newUser_123"
    newUser.userStatus = 'inactive'
    newUser.setPassword = 'true'
    newUser.signCode = "testSign2"

    // log(newUser)
    userDomainModel.User.count({
        $or: [{ email: newUser.email }, { hisUserId: newUser.hisUserId }]
    }, function (err, mailCount) {
        if (err) {
            // log(err)
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else if (!documentObject.isFieldFilled(mailCount) && mailCount < 1) {
            newUser.userImg = userImg;
            newUser.attachments = attachments;
            newUser.save(function (err, result) {
                if (err) {
                    // log(err)
                    documentObject.sendResponse(err, 406, "error", "none", res)
                } else {
                    // log(result)
                    documentObject.sendResponse("", 200, "done", "User Created", res);

                    if (result.userType.toLowerCase() == 'doctor') {
                        registerDoctor(result);
                    }
                    verifyUser(result)
                    assignRoleToUser(result);
                }
            })



        } else {
            // log(mailCount)
            documentObject.sendResponse("Email or HIS UserId are exist", 406, "error", "", res);

        }
    })


}
module.exports.updateUserDetails = function (userId, data, files, res) {
    var roleUpdate = false;
    var unstableFlag = false;
    var update = {};
    if (data.attachments == undefined) {
        data.attachments = data.attachments ? JSON.parse(data.attachments) : [];
    }
    _.forEach(files, function (file) {
        var fileName = file.originalname;
        var tempFile = {};
        var filepath = file.path.replace(/\\/g, '/');
        if (file.fieldname == 'userImg') {
            update.userImg = filepath.replace('data', Utility.baseURL());// old one// userImg = files[i].path.replace('data', '');
        } else if (file.fieldname == 'attachment') {
            var fileUrl = filepath.replace('data', Utility.baseURL());
            tempFile.fileName = fileName;
            update.attachments.push(tempFile);
        }
    });
    update.userType = data.userType.toLowerCase();
    update.email = data.email
    update.name = data.name
    update.firstName = data.firstName
    update.lastName = data.lastName
    update.hisUserId = data.hisUserId
    update.unit = data.unit
    update.hospitalName = data.hospitalName;
    update.gender = data.gender
    update.prefix = data.prefix
    update.userGroup = data.userGroup
    update.userSubGroup = data.userSubGroup
    data.dob ? update.dob = data.dob : console.log('no dob');

    update.signCode = data.signCode;
    // data.unitDepartments={};
    data.roles ? update.roles = JSON.parse(data.roles) : console.log('roles not updated ');
    data.unitDepartments ? update.unitDepartments = JSON.parse(data.unitDepartments) : console.log('no unitdepartments');

    data.personalInfo ? update.personalInfo = JSON.parse(data.personalInfo) : console.log('no personalInfo');

    data.dependentInfo ? update.dependentInfo = JSON.parse(data.dependentInfo) : console.log('no dependent info');

    data.addressInfo ? update.addressInfo = JSON.parse(data.addressInfo) : data.addressInfo = console.log('no adressInfo');
    if (documentObject.isFieldFilled(update.roles)) {
        roleUpdate = true;
    }
    if (documentObject.isFieldFilled(data.wasUnstable) && data.wasUnstable == 'true') {
        unstableFlag = data.wasUnstable;
        update.userStatus = 'inactive'
        console.log('new user status:' + update.userStatus);
    }
    userDomainModel.User.findOneAndUpdate({ 'userId': userId }, update, { 'new': true }, function (err, result) {
        if (err) {
            documentObject.sendResponse('error', 501, "error", err, res)
        } else if (result) {
            documentObject.sendResponse('user updated', 200, 'done', '', res);
            if (roleUpdate) {
                var payload = {};
                payload.roles = result.roles;
                payload.userId = userId;
                assignRoleToUser(payload)
            }
            if (unstableFlag == 'true') {
                // console.log('verifying user')
                verifyUser(result);
                registerDoctor(result);
            }
        } else {
            documentObject.sendResponse('failed to update user', 406, "error", err, res)
        }
    })

}
var assignRoleToUser = function (data) {
    var temp = { self: true }
    var options = {
        uri: Utility.baseURL() + '/ehr/api/access/assignRoleToUser',
        method: 'PUT',
        body: {
            'userId': data.userId,
            'flag': true,
            'roles': Array.isArray(data.roles) ? data.roles : [],
            '_node': temp
        },
        json: true
    }
    request(options)
        .then(function (result) {
            console.log("assign role to user:" + result.result);
        }).catch(function (error) {
            console.log(error)
        })
}
var verifyUser = function (data) {
    var email = data.email;
    // generate random password
    crypto.randomBytes(10, function (err, buf) {
        if (err) {
            log(err);
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)

        } else {
            var key = buf.toString('hex');
            userDomainModel.User.encryptPassword(key, function (err, newPassword) {
                if (err) {
                    log(err);
                } else {
                    var token = jwt.sign({ _id: data._id }, 'sofomo_pwd', { expiresIn: '20 days' });
                    // log('token new user:' + token)
                    // update password
                    var update = { password: newPassword }
                    userDomainModel.User.findOneAndUpdate({ _id: data._id }, update, function (err, user) {
                        if (err) {
                            log(err)
                        } else {
                            // read file
                            var payload = {};
                            payload.email = user.email;
                            payload.fileUrl = './data/email/user_creation.html';
                            payload.subject='Activate Your Clinicare Account';
                            var replacements = {
                                username: user.accessCode,
                                email: user.email,
                                password: key,
                                link: '' + SMTP_CONFIG.baseUrl +
                                    '/#/?email=' + user.email + '&token=' + token
                            }
                            notificationModel.sendTemplateMail(data, replacements,function(err){
                                if(err){
                                    console.log(err)
                                }
                            });

                        }
                    })

                }
            });

        }
    })


}

module.exports.verifyUserByMail = verifyUser;
module.exports.notifyUnstableUser = function (user) {
    console.log('admin role users')
    access.aclControl.roleUsers('Admin', function (err, users) {
        if (err) {
            console.log(err)
        } else {
            _.forEach(users, function (item) {
                generateUnstableNotification(item, user)
            })

        }
    })
    assignRoleToUser(user);
}
var generateUnstableNotification = function (userId, data) {
    var newNotification = new userDomainModel.Notification();
    newNotification._id = uuid.v4();
    newNotification.userId = userId;
    newNotification.nType = 4;
    newNotification.message = 'new unverified user added';
    newNotification.date = Date.now();
    newNotification.payload = [];
    newNotification.payload.push(data);
    newNotification.new = true;
    newNotification.fromUserId = data;
    newNotification.urgency = 'high';
    notificationModel.generateNotification(newNotification, function (err, result) {
        if (err) {
            console.log(err)
        } else {
            console.log('unstable user notification added...........')
        }
    });
}
module.exports.collectDoctorInfo = function () {
    userDomainModel.User.find().exec(function (err, results) {
        if (err) {
            log(err)
        } else {
            // log(results.length)
            results.forEach(function (element) {
                // log(element)
                var update = {
                    // 'firstName': element.firstName,
                    // 'lastName': element.lastName,
                    'userId': element._id
                }
                userDomainModel.Doctor.findOneAndUpdate({ accessCode: element.accessCode }, update, { 'upsert': false }, function (err, updated) {
                    if (err) {
                        log(err)
                    } else {
                        log("updated")
                    }
                })


            });
        }
    })
}
module.exports.collectUserInfo = function () {
    userDomainModel.Doctor.find().exec(function (err, results) {
        if (err) {
            log(err)
        } else {
            // log(results.length)
            results.forEach(function (element) {
                // log(element)
                var update = {
                    'userId': element._id
                }
                userDomainModel.User.findOneAndUpdate({ accessCode: element.accessCode }, update, { 'upsert': false }, function (err, updated) {
                    if (err) {
                        log(err)
                    } else {
                        log("updated")
                    }
                })


            });
        }
    })
}
var registerDoctor = function (result) {
    log('register your doctor  here')
    var newDoctor = userDomainModel.Doctor();
    newDoctor._id = result.userId;
    newDoctor.patients = [];
    newDoctor.userId = result.userId;
    newDoctor.firstName = result.firstName
    newDoctor.lastName = result.lastName
    newDoctor.email = result.email

    newDoctor.save(function (err) {
        if (err) log(err);
    })
}

module.exports.sendEmail = function (data, res) {
    userDomainModel.User.findOne({ userId: data.userId }, function (err, resultUser) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else if (document.isFieldFilled(resultUser)) {
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: data.emailFrom,
                    pass: data.emailPassword
                }
            });

            var mailOptions = {
                from: SMTP_CONFIG.from,
                to: data.emailTo,
                subject: data.subject,
                html: data.emailContent
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    log(error.message)
                    documentObject.sendResponse(error, 501, "error", "none", res)
                } else {
                    var result = "Mail sent to:   " + data.emailTo
                    document.sendResponse('', 200, "done", result, res)
                }
            });
        } else {
            documentObject.sendResponse("Invalid userId", 406, "error", "none", res)
        }
    })
}
module.exports.getAllRegisteredUsers = function (res) {
    userDomainModel.User.find()
        .populate({ path: 'userGroup', model: userManagement.d_groupMaster })
        .populate({ path: 'userSubGroup', model: userManagement.d_subGroupMaster })
        .populate({ path: 'unitDepartments', model: userManagement.d_departmentMaster })
        .populate({ path: 'gender', model: masterModel.masterGender })
        .exec(function (err, result) {
            if (err) { document.sendValidationError(err) }
            document.sendResponse("", 200, "done", result, res);
        })
}
module.exports.getUserDetails = function (id, res) {
    userDomainModel.User.findOne({ userId: id })
        .populate({ path: 'userGroup', model: userManagement.d_groupMaster })
        .populate({ path: 'userSubGroup', model: userManagement.d_subGroupMaster })
        .populate({ path: 'unitDepartments', model: userManagement.d_departmentMaster })
        .populate({ path: 'gender', model: masterModel.masterGender })
        .exec(function (err, result) {
            if (err) {
                document.sendValidationError(err)
            } else {
                document.sendResponse("", 200, "done", result, res);
            }

        })
}

module.exports.toogleUserActiveStatus = function (userId, res) {
    userDomainModel.User.findOne({ userId: userId }, function (err, resultUser) {
        if (err) {
            log(err);
            documentObject.sendResponse('error', 501, "error", "", res)
        } else if (resultUser) {
            resultUser.userStatus = resultUser.userStatus == 'active' ? 'inactive' : 'active'
            log("new Status:    " + resultUser.userStatus)
            resultUser.save(function (err, result) {
                if (err) {
                    log(err)
                    documentObject.sendResponse('something went wrong please try again', 501, "error", "", res)
                } else {
                    documentObject.sendResponse('', 200, 'done', 'done', res);
                }
            })

        } else {
            documentObject.sendResponse("invalid Input", 406, 'error', '', res);
        }
    })
}
//################## doctor unit master    ###################
module.exports.addDoctorUnit = function (data, res) {
    var newGroup = new userManagement.d_unitMaster();
    newGroup = Object.assign(newGroup, data);
    newGroup._id = uuid.v4();
    newGroup.created_at = Date.now();
    newGroup.created_by = data.userId;
    newGroup.updated_at = newGroup.created_at
    newGroup.updated_by = newGroup.created_by
    // log(newGroup)
    newGroup.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newGroup.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorUnit = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_unitMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorUnit = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    log(data)
    userManagement.d_unitMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            log(err)
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorUnit = function (res) {
    userManagement.d_unitMaster.find().exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.LoginDoctorUnit = function (res) {
    userManagement.d_unitMaster.find({}, 'code description isActive').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

module.exports.autoDoctorUnit = function (key, res) {
    userManagement.d_unitMaster.find({ code: new RegExp(key, 'i') }).exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

//################## doctor group master    ###################
module.exports.addDoctorGroup = function (data, res) {
    var newGroup = new userManagement.d_groupMaster();
    newGroup = Object.assign(newGroup, data);
    newGroup._id = uuid.v4();
    newGroup.created_at = Date.now();
    newGroup.created_by = data.userId;
    newGroup.updated_at = newGroup.created_at;
    newGroup.updated_by = data.userId;
    newGroup.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newGroup.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorGroup = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_groupMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            log(err)
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorGroup = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_groupMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorGroup = function (res) {
    userManagement.d_groupMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

module.exports.autoDoctorGroup = function (key, res) {
    userManagement.d_groupMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

//################## doctor sub group master    ###################
module.exports.addDoctorSubGroup = function (data, res) {
    var newGroup = new userManagement.d_subGroupMaster();
    newGroup = Object.assign(newGroup, data);
    newGroup._id = uuid.v4();
    newGroup.created_at = Date.now();
    newGroup.created_by = data.userId;
    newGroup.updated_at = newGroup.created_at;
    newGroup.updated_by = newGroup.created_by;
    newGroup.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newGroup.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorSubGroup = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_subGroupMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorSubGroup = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_subGroupMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorSubGroup = function (res) {
    userManagement.d_subGroupMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.getDoctorSubGroupBygroupId = function (groupId, res) {
    userManagement.d_subGroupMaster.find({ group: groupId }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorSubGroup = function (key, res) {
    userManagement.d_subGroupMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
//################## doctor type master    ###################
module.exports.addDoctorType = function (data, res) {
    var newType = new userManagement.d_typeMaster();
    newType = Object.assign(newType, data);
    newType._id = uuid.v4();
    newType.created_at = Date.now();
    newType.created_by = data.userId;
    newType.updated_at = newType.created_at;
    newType.updated_by = data.userId;
    newType.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newType.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorType = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_typeMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorType = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_typeMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorType = function (res) {
    userManagement.d_typeMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorType = function (key, res) {
    userManagement.d_typeMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

/******##############  doctor Department ################ */
module.exports.addDoctorDepartment = function (data, res) {
    var newDepartment = new userManagement.d_departmentMaster();
    newDepartment = Object.assign(newDepartment, data);
    newDepartment._id = uuid.v4();
    newDepartment.created_at = Date.now();
    newDepartment.created_by = data.userId;
    newDepartment.updated_at = newDepartment.created_at;
    newDepartment.updated_by = data.userId;
    newDepartment.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newDepartment.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorDepartment = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_departmentMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorDepartment = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_departmentMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorDepartment = function (res) {
    userManagement.d_departmentMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorDepartment = function (key, res) {
    userManagement.d_departmentMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

/******##############  doctor Classification ################ */
module.exports.addDoctorClassification = function (data, res) {
    var newClassification = new userManagement.d_classificationMaster();
    newClassification = Object.assign(newClassification, data);
    newClassification._id = uuid.v4();
    newClassification.created_at = Date.now();
    newClassification.created_by = data.userId;
    newClassification.updated_at = newClassification.created_at;
    newClassification.updated_by = data.userId;
    newClassification.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newClassification.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorClassification = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_classificationMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorClassification = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_classificationMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorClassification = function (res) {
    userManagement.d_classificationMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorClassification = function (key, res) {
    userManagement.d_classificationMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

/******##############  doctor Designation ################ */
module.exports.addDoctorDesignation = function (data, res) {
    var newDesignation = new userManagement.d_designationMaster();
    newDesignation = Object.assign(newDesignation, data);
    newDesignation._id = uuid.v4();
    newDesignation.created_at = Date.now();
    newDesignation.created_by = data.userId;
    newDesignation.updated_at = newDesignation.created_at;
    newDesignation.updated_by = data.userId;
    newDesignation.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newDesignation.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorDesignation = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_designationMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorDesignation = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_designationMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.getDoctorDesignation = function (res) {
    userManagement.d_designationMaster.find().populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorDesignation = function (key, res) {
    userManagement.d_designationMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
/******##############  doctor SubDepartment ################ */
module.exports.addDoctorSubDepartment = function (data, res) {
    var newSubDepartment = new userManagement.d_subDepartmentMaster();
    newSubDepartment = Object.assign(newSubDepartment, data);
    newSubDepartment._id = uuid.v4();
    newSubDepartment.created_at = Date.now();
    newSubDepartment.created_by = data.userId;
    newSubDepartment.updated_at = newSubDepartment.created_at;
    newSubDepartment.updated_by = data.userId;
    newSubDepartment.validate(function (err, result) {
        if (err) {
            documentObject.sendValidationError(err, res);
        } else {
            newSubDepartment.save(function (err, result) {
                if (err) {
                    if (err.code == 11000)
                        documentObject.sendResponse("duplicate entry", 406, "error", "error", res);
                    else
                        documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
                } else {
                    documentObject.sendResponse("none", 200, "done", "success", res);
                }
            });
        }
    });

}

module.exports.updateDoctorSubDepartment = function (data, res) {
    data.updated_at = Date.now();
    data.updated_by = data.userId;
    userManagement.d_subDepartmentMaster.findOneAndUpdate({ _id: data._id }, data, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}
module.exports.deleteDoctorSubDepartment = function (data, res) {
    var newData = {};
    newData.updated_at = Date.now();
    newData.updated_by = data.userId;
    newData.isActive = false
    userManagement.d_subDepartmentMaster.findOneAndUpdate({ _id: data._id }, newData, function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", "success", res);
        }
    });
}

module.exports.getDoctorSubDepartment = function (res) {
    userManagement.d_subDepartmentMaster.find().populate('departmentObject').populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}
module.exports.autoDoctorSubDepartment = function (key, res) {
    userManagement.d_subDepartmentMaster.find({ code: new RegExp(key, 'i') }).populate('unit').exec(function (err, result) {
        if (err) {
            documentObject.sendResponse("something went wrong please try again", 406, "error", "none", res)
        } else {
            documentObject.sendResponse("none", 200, "done", result, res);
        }
    })
}

//////////**   userType master */
module.exports.addDependentRelationship = function (data, res) {
    var newType = new masterModel.depRelationship();
    newType._id = uuid.v4();
    newType.key = data.key
    newType.const = data.key.toLowerCase()
    // log(newType)
    newType.save(function (err, result) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", "", res);
        }
    })

}
module.exports.getDependentRelationship = function (res) {
    masterModel.depRelationship.find({}, function (err, results) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", results, res);
        }
    })
}

//////////**   userType master */
module.exports.addUserType = function (data, res) {
    var newType = new masterModel.masterUserType();

    newType._id = uuid.v4();
    newType.key = data.key
    newType.const = data.key.toLowerCase()
    // log(newType)
    newType.save(function (err, result) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", "", res);
        }
    })

}
module.exports.getAllUserType = function (res) {
    masterModel.masterUserType.find({}, function (err, results) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", results, res);
        }
    })
}
//////////**   gender master */
module.exports.addGender = function (data, res) {
    var newGender = new masterModel.masterGender();
    // documentObject.getIndex(newGender.collection.collectionName,function(err,index){
    //     if(err){
    //         documentObject.sendResponse(err, 409, "error", "none", res)
    //     }else{
    // log("new index: "+index)
    newGender._id = data._id;
    newGender.key = data.key;
    newGender.unit = data.unit;
    newGender.code = data.code;
    newGender.save(function (err, result) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", "", res);
        }
    })
    //     }
    // });           
}
module.exports.getAllGenders = function (res) {
    masterModel.masterGender.find({}, function (err, results) {
        if (err) {
            documentObject.sendResponse(err, 409, "error", "none", res);
        } else {
            documentObject.sendResponse("none", 200, "done", results, res);
        }
    })
}

////////////////////** other iimportant functions */

///*******Password Management**********/////

module.exports.validateMailToken = function (data, res) {
    userDomainModel.User.findOne({ accessCode: data.userId }, function (err, userresult) {
        if (err) {
            var response = {
                "_error_message": "Request Processing Error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (!userresult) {
            var response = {
                "_error_message": "User not found",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            userDomainModel.User.validatePassword(data.token, userresult.resetPasswordToken, function (err, isValid) {
                if (isValid) {
                    if (Date.now() > userresult.resetPasswordExpires) {
                        var response = {
                            "_error_message": "Token Expire.",
                            "_status_Code": 406,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "_error_message": "",
                            "_status_Code": 200,
                            "_status": "Token Verified",
                            "result": "none"
                        }
                        res.send(response);
                    }
                } else {
                    var response = {
                        "_error_message": "Incorrect token.",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                }
            })
        }
    })
}

module.exports.changeUserPassword = function (data, res) {
    log("Change Password");
    var dataToSet = { password: data.password, setPassword: 'false', resetPasswordToken: "" };
    userDomainModel.User.findOneAndUpdate({ accessCode: data.userId }, dataToSet, function (err, userresult) {
        if (err) {
            var response = {
                "_error_message": "Request Processing Error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (!userresult) {
            var response = {
                "_error_message": "User not found",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            var response = {
                "_error_message": "",
                "_status_Code": 200,
                "_status": "Password updated successfully",
                "result": "none"
            }
            res.send(response);
        }
    })
}
module.exports.verifyUser = function (data, res) {
    userDomainModel.User.findOne({ accessCode: data.email }, function (err, userresult) {
        if (err) {
            var response = {
                "_error_message": "Request Processing Error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (!userresult) {
            var response = {
                "_error_message": "User not found",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            jwt.verify(data.userToken, 'sofomo_pwd', function (err, success) {
                if (err) {
                    log(err)
                    var response = {
                        "_error_message": "Invalid Token",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else if (success) {
                    activateUser(userresult, res)
                } else {
                    var response = {
                        "_error_message": "Invalid Token",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                }
            });
        }
    })
}
module.exports.updateUser = function (req, data, res) {
    var flag = false;
    delete data['_id']
    // delete data['email']
    delete data['password']
    delete data['accesscode']
    // delete data['userId']
    delete data['signCode']
    data.updated_by = req.decoded.userId;
    data.updated_at = Date.now();
    if (documentObject.isFieldFilled(data.roles)) {
        flag = true;
    }
    userDomainModel.User.findOneAndUpdate({ userId: data.userId }, data, function (err, result) {
        if (err) {
            log(err)
            documentObject.sendResponse(err, 407, "error", "", res)
        } else if (result) {
            documentObject.sendResponse('', 200, "done", "done", res);
            if (flag) {
                var payload = {};
                payload.roles = data.roles
                payload.userId = data.userId;
                assignRoleToUser(data)
            }

        } else {
            documentObject.sendResponse('invalid input', 406, "error", "", res);
        }
    })


}

var activateUser = function (user, res) {
    var data = { userId: user.userId }
    var response = {
        '_error_message': 'Activate account successful',
        '_status_Code': 200,
        '_status': 'done',
        'result': data
    }
    res.send(response)
    var update = { userStatus: 'active' }
    userDomainModel.User.findOneAndUpdate({ _id: user._id }, update, function (err, res) {
        if (err) {
            log(err)
        } else {
            log('new user activated');
        }
    })
}

