var nodemailer = require('nodemailer'),
    uuid = require('node-uuid'),
    socketio = require('socket.io')();
request = require('request-promise')
require('graylog');
var document = require('./db_model.js');
var documentObject = document.domainModel;
var cpoeDocument = document.cpoeDataModel;
var masterModel = document.mastersModel;
var async = require('async');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var handlebars = require('handlebars')
var SMTP_CONFIG = require('config').get('SMTP');
var SMS_CONFIG = require('config').get('SMS');

module.exports.io = socketio;
////******************* notification Management services*************/
var emrAdminio = socketio.of('/emrAdmin');
emrAdminio.on('connection', function (socket) {
    console.log('new user is connected to emr admin namespace: ' + socket.id);
    var data = {};
    data.userId = socket.handshake.query.payload;
    initializeUser(data, socket);
    socket.on('status added', function (data) {
        emrAdminio.to(socket.id).emit('refresh', data);
    });
});

socketio.on("connection", function (socket) {
    if (socket.handshake.query && socket.handshake.query.token) {
        var token = socket.handshake.query.token;
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, 'sofomo_pwd', function (err, decoded) {
                if (err) {
                    socket.emit('message', Utility.output('Invalid Token', 'ERROR'));
                } else {
                    initializeUser(decoded, socket);
                }
            });
        }
    }
    socket.on('markNotification', function (data) {
        // var data=data.data;
        data._id && data.new === true ? markNotificationAsRead(data._id) : console.log('invalid input');
    })
    socket.on('status added', function (data) {
        // socketio.sockets.connected[socket.id].emit('refresh feed', data);
        console.log(data)
        socketio.emit('refresh', data);
    });


});
var markNotificationAsRead = function (id) {
    documentObject.Notification.findOneAndUpdate({ _id: id }, { new: false }, function (err) {
        if (err) throw err
        else console.log('notification marked')
    })
}
var dummyNotification = function (data) {
    var newNotification = new documentObject.Notification();
    newNotification._id = uuid.v4();
    newNotification.userId = data.userId;
    newNotification.userType = "doctor";
    newNotification.nType = "consult";
    newNotification.message = "testing consult notification";
    newNotification.location = "opd";
    newNotification.new = true;
    newNotification.urgency = "high";
    newNotification.date = Date.now();
    newNotification.fromUserId = "djfjsadf";
    newNotification.fromUserName = "testter";
    newNotification.payload = [];
    newNotification.save();
}

var initializeUser = function (data, socket) {
    documentObject.User.findOne({ userId: data.userId }, function (err, result) {
        if (err) {
            log(err);
        } else if (result) {
            // result.sockets.push(socket.id);
            if (!document.isFieldFilled(result.disabledNotifications)) {
                var temp = {};
                temp.disabledNotifications = [];
                documentObject.User.update({ userId: data.userId }, temp, { 'upsert': true }, function (err) {
                    if (err) {
                        log(err);
                    } else {
                        console.log('user updated')
                    }
                });
            }
            documentObject.Notification.find({ userId: data.userId, isEnabled: true, new: true, namespace: socket.nsp.name })
                .populate({ path: 'nType', model: 'notificationType', populate: { path: 'actions' } })
                .sort({ date: -1 }).exec(function (err, notificationResult) {
                    if (err) {
                        log(err)
                    } else if (notificationResult.length > 0) {
                        log("...........found Notifications:  " + socket.id);

                        emrAdminio.emit('refresh', notificationResult, socket.id);
                        socketio.emit('refresh', notificationResult, socket.id);
                        // // console.log(notificationResult);
                        // result.sockets.forEach(function (item) {
                        //     if (socketio.sockets.connected[item] != undefined)
                        //         socketio.sockets.connected[item].emit('refresh', notificationResult);
                        // })
                    }

                });
        }
    })
};

module.exports.getPrefnotifications = function (userId, res) {
    async.parallel([function (callback) {
        documentObject.notificationType.find({}, function (err, typeResults) {
            if (err) {
                callback(err, null);
            } else {
                // console.log(typeResults)
                callback(null, typeResults);
            }
        })
    }, function (callback) {
        documentObject.User.findOne({ userId: userId }, function (err, prefResult) {
            if (err) {
                callback(err, null);
            } else if (prefResult) {
                callback(null, prefResult)
            } else {
                callback(false, null)
            }
        })
    }

    ], function (err, parallelResults) {
        // console.log('where is life')
        if (err) {
            console.log('life in error' + err)
            document.sendResponse(err, 406, "error", "", res);
        } else {
            // console.log("life is here" + parallelResults)
            var types = parallelResults[0];
            var pref = parallelResults[1];
            var x = types.length
            if (x > 0) {
                async.forEach(types, function (itemType, callback) {
                    if (document.isFieldFilled(pref.disabledNotifications) && pref.disabledNotifications.indexOf(itemType._id) > -1) {
                        itemType.isActive = false;
                        itemType.smsActive = false;

                    } else if (document.isFieldFilled(pref.disabledSms) && pref.disabledSms.indexOf(itemType._id) > -1) {
                        itemType.smsActive = false;
                    }
                    callback();
                }, function (err) {
                    if (err) {
                        document.sendResponse("error", 406, "error", err, res);
                    } else {
                        document.sendResponse("", 200, "done", types, res);
                    }
                })
            } else {
                // empty results
                document.sendResponse("", 200, "done", [], res);
            }



        }
    })

}

module.exports.setPrefNotifications = function (data, res) {
    documentObject.User.findOne({ userId: data.userId }, function (err, prefResult) {
        if (err) {
            res.send(err)
        } else if (prefResult) {
            // don't add duplicates
            // prefResult.disabledNotifications = document.removeDuplicates(prefResult.disabledNotifications.concat(data.disabledNotifications));
            prefResult.disabledNotifications = data.disabledNotifications;
            prefResult.disabledSms = data.disabledSms;
            prefResult.save(function (err) {
                if (err) {
                    // res.send(err);
                    document.sendResponse(err, 406, "error", "1", res);
                } else {
                    // res.send(prefResult)
                    document.sendResponse("", 200, "done", "", res);
                }
            });
        } else {
            document.sendResponse("error", 406, "error", "2", res);
        }
    })
}

module.exports.generateConsultNotification = function (consultOrder) {
    log("...........generating consult notification");
    // console.log(consultOrder)
    if (consultOrder.orderItems.hasOwnProperty('attendingDoctorId') && document.isFieldFilled(consultOrder.orderItems.attendingDoctorId))
        documentObject.Doctor.findOne({ _id: consultOrder.orderItems.attendingDoctorId }, function (err, result) {
            if (err) {
                log(err);
            } else if (document.isFieldFilled(result)) {
                // console.log("attention doctor:" + result)
                var newNotification = new documentObject.Notification();
                newNotification._id = uuid.v4();
                newNotification.userId = result._id;
                newNotification.userType = "doctor";
                newNotification.nType = 1;
                newNotification.message = "consult notification";
                newNotification.location = "" + consultOrder.orderItems.department;
                newNotification.new = true;
                newNotification.urgency = consultOrder.orderItems.urgency;
                newNotification.date = consultOrder.orderDate;
                newNotification.visit = consultOrder.visitId;
                newNotification.payload = [0];
                newNotification.payload[0] = { orderId: consultOrder._id };
                documentObject.Doctor.findOne({ _id: consultOrder.userId }, function (err, orderbyDoctor) {
                    if (err) {
                        log(err);
                    } else if (document.isFieldFilled(orderbyDoctor)) {
                        documentObject.Patient.findOne({ _id: consultOrder.patientId }, function (err, patientResult) {
                            if (err) {
                                log(err);
                            } else if (patientResult) {
                                newNotification.fromUserId = orderbyDoctor._id;
                                newNotification.fromUserName = orderbyDoctor.firstName;
                                newNotification.patientName = patientResult.name;
                                newNotification.patientMrn = patientResult.mrn;
                                newNotification.payload[0] = {};
                                newNotification.payload[0].orderId = consultOrder._id;
                                console.log('sending..............................#')
                                sendNotification(newNotification, function (err) {
                                    if (err) throw err;
                                    else {
                                        console.log('notification sent............... consult')
                                    }
                                })
                            } else {
                                console.log('sending....failed invalid doctor..................#')
                            }
                        });
                        // console.log("order by doctor"+orderbyDoctor);

                    }
                });

            } else {
                log("generate notification invalid Doctor");
            }
        });


}
module.exports.respondConsultOrder = function (data) {
    log("accepting notification");
    var status = "denied";
    if (data.orderStatus == "accepted") {
        status = "accepted";
    }
    var newNotification = new documentObject.Notification()
    newNotification._id = uuid.v4();
    newNotification.userId = data.userId;
    newNotification.userType = "doctor";
    newNotification.nType = 1;
    newNotification.message = "Doctor " + status + " your consult request.";
    newNotification.location = data.location;
    newNotification.visit = data.visitId;
    newNotification.new = true;
    newNotification.date = Date.now();
    newNotification.urgency = data.orderItems.urgency;
    newNotification.fromUserId = data.orderItems.attendingDoctorId;
    newNotification.fromUserName = data.fromUserName;
    newNotification.payload = [];
    var data1 = { orderId: data._id };
    newNotification.payload.push(data1);
    documentObject.Doctor.findOne({ _id: newNotification.userId }, function (err, result) {
        if (err) {
            log(err);
        } else {
            //             console.log(data);
            documentObject.Patient.findOne({ _id: data.patientId }, function (err, patientResult) {
                if (err) {
                    log(err);
                } else if (patientResult) {
                    newNotification.patientName = patientResult.name;
                    newNotification.fromUserName = result.firstName;
                    newNotification.patientMrn = result.mrn;
                    sendNotification(newNotification, function (err, sentNote) {
                        if (err) {
                            log(err);
                        } else {
                            log("sending notification" + sentNote);
                        }
                    });
                } else {
                    log("patient not found");
                }

            });

        }
    });
}

module.exports.viewNotification = function (userId, res) {
    documentObject.Notification.find({ userId: userId, isEnabled: true })
        .populate({ path: 'nType', model: 'notificationType' })
        .exec(function (err, result) {
            if (err) {
                var response = {
                    "_error_message": err,
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
            } else {
                var response = {
                    "_error_message": "Invalid user Id",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }
        })
}
var sendNotification = function (newNotification, callback) {
    newNotification.isEnabled = true;
    let output = {};
    async.parallel([
        function (parallel_cb) {
            if (newNotification.visit == undefined || newNotification.visit == null) {
                parallel_cb();
            } else {
                documentObject.Visit.findOne({ _id: newNotification.visit }, 'searchBox',
                    function (err, result) {
                        if (err) {
                            parallel_cb(err);
                        } else if (result) {
                            newNotification.location = result.searchBox.location;
                            parallel_cb()
                        } else {
                            parallel_cb();
                        }
                    })
            }
        }, function (parallel_cb) {
            documentObject.User.findOne({ userId: newNotification.userId })
                .populate({ path: 'diasbled', model: 'notificationType' }).exec(function (err, userResult) {
                    if (err) {
                        parallel_cb(err)
                    } else {
                        output.userResult = userResult;
                        parallel_cb()
                    }
                });
        }
    ], function (err) {
        if (err) {
            console.log(err)
            callback(err, null)
        } else if (output.userResult) {
            if (document.isFieldFilled(output.userResult.disabledNotifications) && output.userResult.disabledNotifications.indexOf(newNotification.nType) > -1) {
                newNotification.isEnabled = false;
                newNotification.new = false;
            }
            newNotification.save(function (err) {
                if (err) {
                    callback(err, null);
                } else if (document.isFieldFilled(output.userResult.sockets)) {
                    // 'userSockets are connected'
                    log("sending notification to: " + output.userResult.sockets);
                    documentObject.notificationType.findOne({ _id: newNotification.nType })
                        .populate('actions')
                        .exec(function (err, typeResult) {
                            if (err) {
                                callback(err, null);
                            } else {
                                newNotification.nType = typeResult;
                                var dataN = [];
                                dataN.push(newNotification)
                                output.userResult.sockets.forEach(function (item) {
                                    if (socketio.sockets.connected[item] != undefined)
                                        socketio.sockets.connected[item].emit('refresh', dataN);
                                })
                                callback(null, "done")
                            }
                        });
                    if (newNotification.nType != 5) {// 5= visit
                        sendNotificationSms(newNotification._id);
                    }
                } else {
                    log("user is no longer active.." + output.userResult.userId);
                    callback(null, "done")
                }
            })

        } else {
            newNotification.save(function (err) {
                if (err) {
                    callback(err, null);
                } else {
                    log("user is no longer active.." + userResult.userId);
                    callback(null, "done")
                }
            })
        }
    });

}
var sendNotificationSms = function (notificationId) {
    documentObject.Notification.aggregate([
        {
            $match: { _id: notificationId }

        }, {
            $lookup: {
                from: "User",
                localField: "userId",
                foreignField: "userId",
                as: "users"
            }
        }], function (err, result) {
            if (err) {
                console.log(err);
            } else {
                var notification = result[0];
                // console.log(notification)
                var user = notification.users[0];
                if (!document.isFieldFilled(user.disabledSms) || (document.isFieldFilled(user.disabledSms) && user.disabledSms.indexOf(notification.nType) < 0)) {
                    var data = {};
                    data.to = (notification.users[0].personalInfo
                        && typeof notification.users[0].personalInfo != 'string') ? notification.users[0].personalInfo.mobileNo : SMS_CONFIG.defaultMobile;
                    data.content = "New notification for " + notification.message + " recieved from EMR";
                    sendSms(data);
                } else {
                    console.log('notification sms is disabled')
                }
            }
        })

}
var sendSms = function (data) {
    //console.log("Send SMS: "+data);

    var date = new Date().toJSON();
    var zone = "+0800";// time zone
    // var zone = -((new Date().getTimezoneOffset() / 60).toLocaleString('en-US', {minimumIntegerDigits: 4, useGrouping:false}));
    var timeZone = date.substring(0, date.indexOf('.')) + "" + zone;
    console.log(timeZone);
    var options = {
        uri: 'https://platform.clickatell.com/messages',
        method: 'POST',
        headers: {
            'Authorization': "-p_2nbldTrGmjUVuFbbjSg==",// api Key
            "Content-Type": "application/json"
        },
        body: {
            'to': [data.to ? data.to : SMS_CONFIG.defaultMobile],
            'content': data.content ? data.content : "Recieved new notification from EMR",
            "scheduledDeliveryTime": timeZone,
            "binary": false,
            "clientMessageId": uuid.v4(),
            "validityPeriod": 1440,
            "charset": "ASCII"
        },
        json: true
    }
    request(options).then(function (result) {
        console.log(result)
        log("SMS Sent");
    }).catch(function (error) {
        console.log("error: " + error)
    })
}
var readHTMLFile = function (path, callback) {
    fs.readFile(path, { encoding: 'utf-8' }, function (err, html) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};
var mailWithTemplate = function (data, replacements, callback) {
    readHTMLFile(data.fileUrl, function (err, html) {
        if (err) {
            callback(err)
        } else {
            var template = handlebars.compile(html);
            var htmlToSend = template(replacements);
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'medcare.noreply@gmail.com',
                    pass: 'sdgt@1234'
                }
            });

            var mailOptions = {
                from: SMTP_CONFIG.from,
                to: data.email,
                subject: data.subject,
                html: htmlToSend
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    callback(error)
                } else {
                    log("user activation mail sent to" + data.email);
                    callback(null);
                }
            });
        }
    })

}
module.exports.sendTemplateMail = mailWithTemplate;
module.exports.generateNotification = sendNotification;
module.exports.generateNotificationSms = sendNotificationSms;
module.exports.generateSms = sendSms;
module.exports.validateMailToken = function (data, res) {
    documentObject.User.findOne({ accessCode: data.userId }, function (err, userresult) {
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
            documentObject.User.validatePassword(data.token, userresult.resetPasswordToken, function (err, isValid) {
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
                            "_status": "Done",
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

module.exports.resetPasswordMailTrigger = function (data, res) {

    documentObject.User.findOne({ email: data.email }, function (err, success) {
        if (err) {
            var response = {
                "_error_message": "Request Processing Error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (!success) {
            var response = {
                "_error_message": "Email not found",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            var crypto = require('crypto');
            crypto.randomBytes(21, function (err, buf) {
                if (err) {
                    var response = {
                        "_error_message": "Request Processing Error",
                        "_status_Code": 406,
                        "_status": "error",
                        "result": "none"
                    }
                    res.send(response);
                } else if (buf) {
                    var token = buf.toString('hex');
                    documentObject.User.encryptPassword(token, function (err, hash) {
                        if (err) {
                            var response = {
                                "_error_message": "Request Processing Error",
                                "_status_Code": 406,
                                "_status": "error",
                                "result": "none"
                            }
                            res.send(response);
                        } else {
                            var fieldToSave = {
                                resetPasswordToken: hash,
                                resetPasswordExpires: Date.now() + 10000000
                            };
                            documentObject.User.findOneAndUpdate({ email: data.email }, fieldToSave, function (err, done) {
                                if (err) {
                                    var response = {
                                        "_error_message": "Request Processing Error",
                                        "_status_Code": 406,
                                        "_status": "error",
                                        "result": "none"
                                    }
                                    res.send(response);
                                } else {
                                    // sendResetMail(res, { email: data.email, token: token, key: done.accessCode });                                
                                    var payload = { email: done.email, fileUrl: './data/email/password_reset.html' }
                                    var replacements = {};
                                    replacements.username = done.accessCode;
                                    replacements.link = SMTP_CONFIG.baseUrl + '/#/changepassword?token=' + token + '&uid=' + done.accessCode;

                                }
                            });
                        }
                    });
                }
            });

        }
    })
}

function sendResetMail(res, options) {
    options.username = options.key
    options.baseUrl = SMTP_CONFIG.baseUrl + '/#/changepassword?token=' + options.token + '&uid=' + options.key;
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'medcare.noreply@gmail.com',
            pass: 'sdgt@1234'
        }
    });

    var mailOptions = {
        from: SMTP_CONFIG.from,
        to: options.email,
        subject: 'Reset Your Clinicare Account Password',
        html: "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css\"><style>body{background-color: #e7ebec;}.contentbox{background-color: #fff;border: 0px solid #e7ebec;padding: 10px 25px 25px 25px;position: relative;border-radius: 4px;border-bottom-left-radius: 0; border-bottom-right-radius: 0; height:300px; padding-left: 6%;}.page-heading h1{font-style: normal;font-weight: 300;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;font-size: 16px;border-bottom: 1px solid #bdbdbd;line-height: 32px;color: #3b3b3b;margin-top: -4px;margin-bottom: 14px;padding-bottom: 5px;}.forgotform{background-color: #e7ebec; border: 1px solid #e4e4e4; padding: 8px; min-width: 200px;}.border-right{border-right: 1px solid rgba(15, 29, 33, 0.42);height: 110px;}.padding-bottom10{padding-bottom:10px;}.emailprofile{height:50px;margin-left: -18px;}.paddingtop10{padding-top: 10%;}.contentfooterbg{background: rgba(169, 169, 169, 0.69); border-bottom-left-radius: 15px; border-bottom-right-radius: 15px; color: #5e5f61;}</style><body><div class=\"row paddingtop10\"><div class=\"col-md-12 col-sm-12\"><div class=\"col-md-3 col-sm-3\"></div><div class=\"col-md-6 col-sm-6\"><div class=\"contentbox\"><div class=\"row contentlogo text-center\"><div><img style=\"width:60px\" class=\"pull-left img-responsive\" src=\"http://medclinical-angular.us-west-2.elasticbeanstalk.com/images/logo.png\"></div></div><div class=\"page-heading\"><div class=\"row padding-top15\"><div class=\"col-md-12 col-sm-12\" style=\"font-size: 15px;\"><!-------div class=\"col-md-2 col-sm-2\"><img alt=\"\" src=\"http://medclinical-angular.us-west-2.elasticbeanstalk.com/icons/male.png\" class=\"img-circle emailprofile\"></div----><div class=\"col-md-10 col-sm-10\"><span><lead>Hi</lead> <span>" + options.username + "</span>,</span><p>You Recently requested a link to reset you Password.</p><p class=\"padding-top10\">Please set a new password by following link below:<br><a href=\"#/changepassword\" class=\"\">" + options.baseUrl + "</a></p><p class=\"padding-top10\">Regards,<br>- The SDG Team</p></div></div></div></div></div><div class=\"contentfooterbg padding-top10\" style=\"padding: 7px;\"><strong class=\"contentfooter\">Powered by </strong><span><img style=\"width:100px\" src=\"http://medclinical-angular.us-west-2.elasticbeanstalk.com/images/sd-logo%20(2).png\" class=\"contentfooterlogo\"></span> </div></div><div class=\"col-md-3 col-sm-3\"></div></div></div></body>"

    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error.message)
            var response = {
                "_error_message": "Request processing error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            var response = {
                "_error_message": "",
                "_status_Code": 200,
                "_status": "Your Password reset request send to your E-mail",
                "result": "none"
            }
            res.send(response);
        }
    });
}

module.exports.isAccept = function (req, res, next) {
    var thisObj = this;
    var integrationAMQP = require(APP_ROOT_PATH + '/models/integrationAmqp');
    req.assert('orderId', 'Order ID is required').notEmpty();
    req.assert('is_accept', 'Accept? true or false').notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        });
        return res.json(Utility.output(messages, 'ERROR'));
    }
    cpoeDocument.CpoeOrder.findOne({ _id: req.body.orderId, orderCategory: new RegExp("consult", "i") }).exec(function (err, result) {
        if (err) {
            return res.json(Utility.output(err, 'ERROR'));
        }
        if (!result)
            return res.json(Utility.output('Order is not found', 'ERROR'));
        if (result.orderStatus !== "pending") {
            if (result.orderStatus === "accepted")
                return res.json(Utility.output('You already accepted the referral request', 'ERROR'));
            else if (result.orderStatus === "denied")
                return res.json(Utility.output('You already denied the referral request', 'ERROR'));
            else if (result.orderStatus === "discontinued")
                return res.json(Utility.output('Referral request has been discontinued', 'ERROR'));
            else {
                return res.json(Utility.output('this request cant be processed', 'ERROR'));
            }
        }
        result.orderStatus = "denied";
        if (req.body.is_accept) {
            result.orderStatus = "accepted";
            integrationAMQP.placeOrderToHIS(result);
            result.save();
            thisObj.respondConsultOrder(result);
            return res.json(Utility.output("Referral Request Accepted", 'SUCCESS'));
        } else {
            integrationAMQP.placeOrderToHIS(result);
            result.save();
            thisObj.respondConsultOrder(result);
            return res.json(Utility.output("Referral Request Rejected", 'SUCCESS'));
        }
    });
};
module.exports.resendPendingUnverifiedOrder = function (orderElement) {
    documentObject.Patient.findOne({ _id: orderElement.patientId }, function (err, patientResult) {
        if (err) {
            log(err)
        } else {
            var newNotification = new documentObject.Notification();
            newNotification._id = uuid.v4();
            newNotification.userId = orderElement.onBehalf.doctorId;
            newNotification.userType = 'doctor'
            newNotification.nType = 2;
            newNotification.message = "Pending Unverified Order";
            newNotification.location = "";
            newNotification.new = true;
            newNotification.visit = orderElement.visitId;
            if (document.isFieldFilled(orderElement.orderItems.urgency))
                newNotification.urgency = orderElement.orderItems.urgency;
            else
                newNotification.urgency = "low";
            newNotification.date = Date.now();
            newNotification.fromUserId = orderElement.userId;
            newNotification.patientName = patientResult ? patientResult.name : '';
            newNotification.patientMrn = patientResult ? patientResult.mrn : '';
            newNotification.payload = [];
            newNotification.payload.push(orderElement);
            sendNotification(newNotification, function (err, result) {
                if (err) {
                    log(err)
                } else {
                    console.log("notification sent" + result);
                }
            })
        }
    })
}

module.exports.GenericMailFunction = function (options) {

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'medcare.noreply@gmail.com',
            pass: 'sdgt@1234'
        }
    });

    var mailOptions = {
        from: SMTP_CONFIG.from,
        to: options.email,
        subject: '[Urgent] Clinicare Notification',
        text: options.message
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error.message)
            var response = {
                "_error_message": "Request processing error",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            var response = {
                "_error_message": "",
                "_status_Code": 200,
                "_status": "Your Password reset request send to your E-mail",
                "result": "none"
            }
            res.send(response);
        }
    });
}