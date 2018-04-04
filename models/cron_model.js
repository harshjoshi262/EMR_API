'use strict'
var cron = require('cron');
var documentObject = require('./db_model.js');
var notificationModel = require('./notification_model.js');
var integration_rmq = require('./integrationAmqp');
var SQL_CONFIG = require('config').get('HISDB');
var domainDocument = documentObject.domainModel;
var VisitModel = require('../controllers/VisitController');
var cpoeDocument = document.cpoeDataModel;
var _ = require('lodash')
var winston = require('winston')
var async = require('async')
var nodemailer = require("nodemailer")
var sql = require("mssql");
var moment = require('moment');

var dbConn = {
    server: SQL_CONFIG.server,
    database: SQL_CONFIG.database,
    user: SQL_CONFIG.user,
    password: SQL_CONFIG.password,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 200,
        min: 10,
        acquireTimeoutMills: 15000,
        idleTimeoutMillis: 60000
    }
};

var everydayJob = new cron.CronJob('01 00 00 * * *', function () {
    // 01 00 00
    // run everday from sunday to saturday at  01 seconds  00 minutes 00 hour
    modifyActiveOldVisits();
    completeMedicationOrders();
    markCompleteNursingTasks();
    // change order and medication  status of pending discontinued orders
    discontinueScheduledOrders();
});
var markCompleteNursingTasks = function () {
    var currentDate = Date.now();
    domainDocument.nursing_tasks.find(
        {
            StopDate: { $lt: currentDate },
            IsComplete: false
        },
        'CpoeOrderId',
        function (err, tasks) {
            var completedTask = [];
            var completedOrders = [];
            let tempHistory = {};
            tempHistory.action = 'Discontinue';
            tempHistory.userId = "Sysytem";
            tempHistory.timestamp = new Date();

            _.forEach(tasks, function (task) {
                completedTask.push(task._id);
                completedOrders.push(task.CpoeOrderId)
            })
            cpoeDocument.CpoeOrder.update(
                { _id: { $in: completedOrders } },
                {
                    $set: { 'orderStatus': 'completed' },
                    $push: { activityLog: tempHistory }
                },
                { 'multi': true },
                function (err, docs) {
                    if (err) {
                        console.log(err);
                    } else if (docs) {
                        domainDocument.nursing_tasks.update(
                            { _id: { $in: completedTask } },
                            { IsComplete: true },
                            { 'multi': true },
                            function (err, orderResults) {
                                if (err) {
                                    throw err;
                                } else {
                                    console.log('Task Marked Completed');
                                }
                            })
                    }
                })
        }
    )
}
var discontinueScheduledOrders = function () {
    let offset = parseInt(moment().endOf('day').format('x'));
    cpoeDocument.CpoeOrder.find(
        {
            orderStatus: RegExp('discontinue scheduled', 'i'),
            discontinueTime: { $lte: offset }
        }, '_id', function (err, result) {
            if (err) {
                console.log(err);
            } else if (result) {
                let orders = [];
                for (let i = 0; i < result.length; i++) {
                    orders.push(result[i]);
                }
                let tempHistory = {};
                tempHistory.action = 'Discontinue';
                tempHistory.userId = "Sysytem";
                tempHistory.timestamp = new Date();
                cpoeDocument.CpoeOrder.update(
                    { _id: { $in: orders } },
                    {
                        $set: { 'orderStatus': 'discontinued' }, $push: { activityLog: tempHistory }
                    }, function (err, docs) {
                        if (err) {
                            console.log(err);
                        } else if (docs) {
                            domainDocument.Medication.update({ orderId: { $in: orders } }, { status: 'discontinued' }, { 'multi': true }, function (err, orderResults) {
                                if (err) {
                                    throw err;
                                } else {
                                    console.log('medication discontinued');
                                }
                            })
                        }
                    })

            }
        })
}
var completeMedicationOrders = function () {
    var currentDate = Date.now();
    console.log('current Date:' + currentDate)
    var completedOrders = []
    var completedMedications = [];
    domainDocument.Medication.find({ endDate: { $lte: currentDate } }, function (err, results) {
        if (err) {
            console.log(err)
        } else {

            _.forEach(results, function (item) {
                // console.log("startDate: " + moment(item.startDate).fromNow() + "endDate: " + moment(item.endDate).fromNow())
                completedOrders.push(item.orderId);
                completedMedications.push(item._id);
            })
            domainDocument.Medication.update({ _id: { $in: completedMedications } }, { status: 'complete' }, { 'multi': true }, function (err, orderResults) {
                if (err) {
                    throw err;
                } else {
                    console.log('medication status change:', orderResults);
                }
            })
            cpoeDocument.CpoeOrder.update({ _id: { $in: completedOrders } }, { orderStatus: 'completed', canEdit: false, canCancel: false, canDiscontinue: false }, { 'multi': true }, function (err, orderResults) {
                if (err) {
                    throw err;
                } else {
                    console.log('pharmacy order status change:', orderResults);
                }
            })
        }
    })
}
module.exports.testOrders = completeMedicationOrders;
function modifyActiveOldVisits() {
    var currentTime = new Date().getTime();
    var previousTime = (currentTime - 86400000);
    console.log("Current Time:", moment(currentTime).format('MMMM Do YYYY, h:mm:ss a'));
    console.log("Previous Time:", moment(previousTime).format('MMMM Do YYYY, h:mm:ss a'));
    var updateVisits = [];
    domainDocument.Visit.find({
        visitDate: {
            $gte: previousTime,
            $lt: currentTime
        }, isActive: 'true', $or: [{ visitType: new RegExp('New', 'i') }, { visitType: new RegExp('Follow up', 'i') }]
    }, function (err, visits) {
        if (err)
            console.log("Cron Job Error: ", err);
        if (visits !== undefined) {
            if (visits.length) {
                async.eachSeries(visits, function (eachVisit, callback_each) {
                    var twelveHrsPlus = eachVisit.visitDate + 43200000;
                    if (currentTime < twelveHrsPlus) {
                        twelveHrsPlus = moment(twelveHrsPlus).toISOString();
                        AGENDA.schedule(twelveHrsPlus, 'runnable', { visit_id: eachVisit._id });
                        console.log(eachVisit._id + " 12 Hrs Time:", moment(twelveHrsPlus).format('MMMM Do YYYY, h:mm:ss a'));
                    }
                    else {
                        updateVisits.push(eachVisit._id);
                    }
                    callback_each();
                }, function () {
                    domainDocument.Visit.update({ _id: { $in: updateVisits } }, { isActive: 'false' }, { 'multi': true }, function (err, count) {
                        if (err) {
                            console.log("Cron Job Error:", err)
                        } else {
                            console.log(updateVisits.length + " visits updated as per cron")
                        }
                    });
                });
            }
        }
    });
}
var logger = new cron.CronJob('01 00 * * * *', function () {
    // on first second of every hour eachday
    console.log('cronjob daily is running:' + everydayJob.running)
})

var Integration_Stats = new cron.CronJob('00 05 23 * * *', function () {
    getStats();
})
var unverifiedOrder = new cron.CronJob('01 00 00 * * *', function () {
    console.log('working.... unverified orders')
    resendUnverifiedOrderNotiofication();
})

var pharmacy_failed_order = new cron.CronJob('*/3 * * * *', function () {
    // on first second of every hour eachday
    //integration_rmq.pushFailedMessages();
    PharmacyFailedOrder();
})

function getStats(cb) {

    var stats = {};

    var end = new Date();
    end.setHours(24, 0);
    end = end.getTime();
    var start = end - (1000 * 60 * 60 * 24);

    var visitsquery = {
        visitDate: {
            $gte: start, $lt: end
        }
    };

    var orderCountQuery = {
        orderDate: { $gt: start, $lt: end }, orderStatus: {
            $in: ["completed",
                "active",
                "cancel requested",
                "cancelled",
                "discontinued",
                "discontinue requested"]
        }
    }

    var tasks = [
        function (callback) {
            cpoeDocument.CpoeOrder.find(orderCountQuery).count().exec(function (err, count) {
                if (err) {
                    log("Error while processing");
                    callback()
                } else {
                    log("All Drug orders: " + count);
                    stats.drugCount = count;
                    callback()
                }
            })
        },
        function (callback) {
            var opRecord = 0;
            var ipRecord = 0;
            domainDocument.Visit.find(visitsquery, function (err, visits) {
                if (err) {
                    console.log(err.message);
                    callback()
                } else if (!visits) {
                    console.log("Visits not found");
                    callback()
                } else {
                    visits.forEach(function (element) {
                        switch (element.patientType) {
                            case "IP":
                                ipRecord++;
                                break;
                            case "OP":
                                opRecord++;
                                break;
                            default:
                                break;
                        }
                    }, this);
                    // Statlogger.info("Total visits created: " + visits.length + " OP Visits: " + opRecord + " IP Patient: " + ipRecord);
                    stats.VisitCount = visits.length;
                    stats.VisitOPD = opRecord;
                    stats.VisitIPD = ipRecord;
                    callback()
                }
            })
        },
        function (callback) {
            var connection = new sql.ConnectionPool(dbConn);
            connection.connect().then(() => {
                var request = new sql.Request(connection);
                request.input('myDate', sql.Date, new Date())
                return request.execute('getdailyintraction')
                // return pool.request()
                //     .input('myDate', sql.Date, new Date())
                //     .execute('getdailyintraction')
            }).then(result => {
                stats.HISOPVisit = result.recordsets[0][0].OP;
                stats.HISIPVisit = result.recordsets[1][0].IP;
                stats.HISPharOrder = result.recordsets[2][0].PharOrder;
                stats.HISPharItem = result.recordsets[3][0].PharItem;
                connection.close();
                callback()
            }).catch(err => {
                console.log("Error occured: " + err.message)
                connection.close();
                callback()
            })
        }
    ]

    async.parallel(tasks, function (err) {
        if (err) {
            console.log("Error while parallel execution of function: " + err.message)
            cb(false);
        } else {
            console.log("Mail Sent function ");
            sendIntegrationStats(stats, function (error, info) {
                if (error) {
                    console.log("EMAIL sending error: " + error.message)
                    cb(false);
                } else {
                    console.log("Email Sent")
                    cb(true);
                }
            });
        }
    })
}

function sendIntegrationStats(stats, cb) {
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'medcare.noreply@gmail.com',
            pass: 'sdgt@1234'
        }
    });


    var mailOptions = {
        from: "Clinicare Schedular",
        to: ["harshal@sdglobaltech.com"],
        subject: 'LWEH Go Live Integration Statistics',
        html: "Integration Statistics:  " + new Date() + "<br><br><b>LAM WAH EE HOSPITAL GO LIVE</b><br>" +
            // "<br>  Total RabbitMQ Messages: " + stats.RMQMsgCount +
            // "<br>  OPD messages in RabbitMQ: " + stats.RMQOPD +
            // "<br>  IPD messages in RabbitMQ: " + stats.RMQIPD +
            // "<br>  Pharmacy messages in RabbitMQ: " + stats.RMQPharmacy +
            // "<br>  Failed messages in RabbitMQ: " + stats.RMQFailedMsg +
            // "<br>  Total Visit Created: " + stats.VisitCount +
            // "<br>  OPD Registration: " + stats.VisitOPD +
            // "<br>  IPD Registration: " + stats.VisitIPD + "<br><br><b>Medcare Data</b><br>" +
            // "<br>  OPD Registration: " + stats.HISOPVisit +
            // "<br>  IPD Registration: " + stats.HISIPVisit +
            // "<br>  Pharmacy Order: " + stats.HISPharOrder +
            // "<br>  Pharmacy Items: " + stats.HISPharItem+
            "<br><br><br><style>table, th, td {border: 1px solid black; border-collapse: collapse;}</style><table style=\"width:100%\"> <tr> <th></th> <th>Medcare</th> <th>Clinicare</th> <th>Difference</th> </tr><tr> <td>OP Visits</td><td align=center>" + stats.HISOPVisit + "</td><td align=center>" + stats.VisitOPD + "</td><td align=center>" + (stats.HISOPVisit - stats.VisitOPD) + "</td></tr><tr> <td>IP Visits</td><td align=center>" + stats.HISIPVisit + "</td><td align=center>" + stats.VisitIPD + "</td><td align=center>" + (stats.HISIPVisit - stats.VisitIPD) + "</td></tr><tr> <td>Pharmacy</td><td align=center>" + stats.HISPharItem + "</td><td align=center>" + stats.drugCount + "</td><td align=center>" + (stats.drugCount - stats.HISPharItem) + "</td></tr></table>"
    };

    transporter.sendMail(mailOptions, cb);
}

module.exports.sendStatisticsToMail = getStats;

var resendUnverifiedOrderNotiofication = function (res) {
    // not contains unsigned
    var checkUnsigned = new RegExp("^((?!unsigned).)*$", "i");
    cpoeDocument.CpoeOrder.find({ orderStatus: checkUnsigned, 'onBehalf.orderStatus': new RegExp('unsigned', 'i') }, function (err, orders) {
        if (err) {
            res.send(err);
        } else {
            // console.log()
            _.forEach(orders, function (item) {
                notificationModel.resendPendingUnverifiedOrder(item);
            });
        }
    })
}
module.exports.generateUnverifiedNotifications = resendUnverifiedOrderNotiofication;
module.exports.Integration_Stats = Integration_Stats;
module.exports.pharmacy_failed_order = pharmacy_failed_order;
module.exports.everydayJob = everydayJob;
module.exports.cronLogger = logger;
module.exports.unverifiedOrderCron = unverifiedOrder;
module.exports.FailedVisits = new cron.CronJob('*/5 * * * *', function () {
    RegistrationFailedMessages();
})

function convertDate() {
    console.log("Update Date Function")
    var records = 0;
    domainDocument.RabbitMQ.find({ date_of_creation: { $type: 2 } }, function (err, result) {
        result.forEach(function (element) {
            domainDocument.RabbitMQ.update({ _id: element._id },
                {
                    $set:
                        { date_of_creation: parseInt(element.date_of_creation) }
                }, function (err, done) {
                    records++;
                })
        }, this);
    })
    console.log("Updated records: " + records)

}

module.exports.define_agenda = function () {
    setTimeout(function () {
        AGENDA.define('runnable', function (job, done) {
            console.log("This is Agenda Execution")
            var visit_id = (job.attrs.data.visit_id !== undefined) ? job.attrs.data.visit_id : null;
            domainDocument.Visit.update({ _id: visit_id }, { isActive: 'false' }, { 'multi': true }, function (err, count) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(visit_id + " visit updated as per agenda on ", moment().format('MMMM Do YYYY, h:mm:ss a'));
                    domainDocument.agenda_jobs.remove({ "data.visit_id": visit_id }, function (err, count) {
                        if (err)
                            console.log("Error in Agenda Clear", err);
                        else
                            console.log("Agenda Completed");
                    });
                }
            });
            done();
        });
        AGENDA.start();
    }, 3000);
};

function PharmacyFailedOrder() {
    let pool = new sql.ConnectionPool(dbConn);
    pool.connect().then(connection => {
        let request = new sql.Request(connection);
        request.query(`select RMQID from T_IntegrationLog 
            where Date > '${Utility.toSQLDate(new Date())}' and status=0`, (err, success) => {
                if (err) {
                    console.log("[ERROR] " + err);
                    connection.close();
                } else {
                    console.log("Data fetched:" + JSON.stringify(success.recordset.length));
                    connection.close();
                    if (success.recordset.length > 0) {
                        let records = [];
                        success.recordset.forEach(element => {
                            records.push(ObjectID(element.RMQID));
                        });
                        //console.log("ORDERS "+JSON.stringify(records))
                        integration_rmq.ResendPharmacyOrder(records);
                    }
                }
            })
    }).catch(e => {
        console.log("[ERROR] Failed to connect" + e);
    })
}

function RegistrationFailedMessages() {
    let pool = new sql.ConnectionPool(dbConn);
    pool.connect().then(connection => {
        let request = new sql.Request(connection);
        request.query(`select  MRN,OPD_IPD_ID,PatientID,OPD_IPD from T_Registration_Integration 
        where AddedDateTime > '${Utility.toSQLDate(new Date())}' and status =0`, (err, success) => {
                if (err) {
                    log("[ERROR] " + err);
                    connection.close();
                    setTimeout(RegistrationFailedMessages, 5000)
                } else {
                    connection.close();
                    let records = [];
                    if (success.recordset.length > 0) {
                        success.recordset.forEach(element => {
                            records.push(element);
                        });
                        VisitModel.SyncVisits(records);
                    } else {
                        log("Failed Visit Not Found");
                    }
                }
            })
    }).catch(e => {
        log("[ERROR] Failed to connect" + e);
        setTimeout(RegistrationFailedMessages, 5000)
    })
}