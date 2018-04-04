
var mongoose = require('mongoose'),
    uuid = require('node-uuid'),
    user_audit = require('./user_audit.js'),
    notificationModel = require('./notification_model.js'),
    integrationModel = require('./integrationAmqp.js'),
    async = require('async'),
    request = require('request-promise'),
    _ = require('lodash'),
    //shortid = require("shortid"),
    moment = require('moment'),
    util = require('util');
require('graylog')
var document = require('./db_model.js')
var EHR_SERVER_CONFIG = require('config').get('ehrserver');
console.log(EHR_SERVER_CONFIG.serverPort)

//shortid.characters('0123456789');

var documentObject = document.domainModel
var cpoeDocument = document.cpoeDataModel
var masterDocument = document.mastersModel;

module.exports.createOrder = function (data, res) {
    if (document.isFieldFilled(data.patientId)) {
        documentObject.Visit.findOne({
            '_id': data.visitId,
            'patientId': data.patientId
        }, function (err, visitResult) {
            if (err) {
                var response = {
                    '_error_message': 'invalid patientId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            } else if (visitResult) {
                var orderToCreate = new cpoeDocument.CpoeOrder()
                orderToCreate._id = uuid.v4()
                //orderToCreate.doctorId = data.doctorId
                orderToCreate.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
                orderToCreate.patientId = data.patientId
                orderToCreate.orderCategory = data.orderCategory
                orderToCreate.visitId = data.visitId
                // as per gitesh order name is orderCategory
                // orderToCreate.orderName = data.orderCategory

                orderToCreate.orderSubCategory = data.orderSubCategory
                orderToCreate.orderItems = data.orderItems
                orderToCreate.isFavorite = false
                orderToCreate.orderStatus = 'unsigned'
                orderToCreate.orderDate = Date.now();
                orderToCreate.serviceCode = data.serviceCode
                orderToCreate.orderingDoctorName = data.orderingDoctorName
                orderToCreate.patientName = data.patientName
                orderToCreate.canCancel = true;
                orderToCreate.canRepeat = true;
                orderToCreate.canDiscontinue = true;
                orderToCreate.canEdit = true;
                orderToCreate.duplicateChecked = data.duplicateChecked;
                orderToCreate.reasonToSkipDuplicate = data.reasonToSkipDuplicate;
                var tempHistory = {};
                tempHistory.action = 'create';
                tempHistory.userId = orderToCreate.userId;
                tempHistory.timestamp = new Date();
                orderToCreate.activityLog = [];
                orderToCreate.activityLog.push(tempHistory);
                orderToCreate.duplicateOrders = data.duplicateOrders ? data.duplicateOrders : [];
                //for pharmacy orders
                data.activityLog = orderToCreate.activityLog;
                orderToCreate.orderGroup = orderToCreate.patientId + ":" + new Date().getTime();
                switch (orderToCreate.orderCategory.toLowerCase()) {
                    case 'lab':
                        var labOrderItem = new cpoeDocument.labOrderItem(orderToCreate.orderItems)
                        labOrderItem.specimen = 'null'
                        if (document.isFieldFilled(orderToCreate.orderItems.specimen)) {
                            labOrderItem.specimen = data.orderItems.specimen
                        }
                        orderToCreate.orderName = data.orderItems.labTest
                        placeCpoeOrder(orderToCreate, labOrderItem, res)
                        break
                    case 'blood component':
                        var bloodComponentItem = new cpoeDocument.bloodComponentItem(orderToCreate.orderItems)
                        orderToCreate.orderName = data.orderItems.bloodComponents
                        placeCpoeOrder(orderToCreate, bloodComponentItem, res)
                        break
                    case 'imaging order':
                        var imagingOrderItem = new cpoeDocument.imagingOrderItem(orderToCreate.orderItems)
                        orderToCreate.orderName = data.orderItems.imagingProcedure
                        imagingOrderItem.OrderNo = visitResult.HIS_PatientId + Date.now();
                        placeCpoeOrder(orderToCreate, imagingOrderItem, res, function (err, result) {
                            if (err) {
                                console.log('err', err)
                            } else {

                                visitResult.menopause = result.orderItems.menopause;
                                visitResult.lmpDate = result.orderItems.lmpDate;
                                visitResult.save(function (err) {
                                    if (err) {
                                        console.log('error', err)
                                    } else {
                                        console.log('visit record update');
                                    }
                                })
                            }
                        })
                        break
                    case 'procedure order':
                        var procedureOrderItem = new cpoeDocument.procedureOrderItem(orderToCreate.orderItems)
                        orderToCreate.orderName = data.orderItems.procedureName
                        placeCpoeOrder(orderToCreate, procedureOrderItem, res)
                        break
                    case 'general':
                        orderToCreate.orderName = data.orderItems.order
                        var generalOrderItem = new cpoeDocument.generalOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, generalOrderItem, res)
                        break
                    case 'consult':
                        orderToCreate.orderName = data.orderItems.department
                        var consultOrderItem = new cpoeDocument.consultOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, consultOrderItem, res)
                        break
                    case 'vital':
                        orderToCreate.orderName = data.orderItems.vitalSign
                        var vitalOrderItem = new cpoeDocument.vitalOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, vitalOrderItem, res)
                        break
                    case 'nursing':
                        orderToCreate.orderName = data.orderItems.order
                        var nursingOrderItem = new cpoeDocument.nursingOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, nursingOrderItem, res)
                        break
                    case 'patient movement':
                        orderToCreate.orderName = data.orderItems.category;
                        var patientMovementOrder = new cpoeDocument.patientMovementOrder(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, patientMovementOrder, res)
                        break
                    case 'pharmacy':
                        checkDuplicateMedication(orderToCreate, orderToCreate.patientId, orderToCreate.duplicateChecked, false, function (err, duplicates, itemCodes) {
                            var tempCodes = []
                            var tempMolecules = [];
                            _.forEach(_.groupBy(itemCodes, 'ItemCode'), function (codeGruop) {
                                let length = codeGruop.length;
                                // find duplicate itemcodes by startDate and endDate
                                if (length > 1) {
                                    let swap = [];
                                    for (let i = 0; i < length; i++) {
                                        let x = codeGruop[i];
                                        for (let j = i + 1; j < length; j++) {
                                            let y = codeGruop[j];
                                            let isDuplicate = false;
                                            // duplicate criteria
                                            if ((y.startDate >= x.startDate && y.startDate <= x.endDate) || (y.startDate >= x.startDate && y.startDate <= x.endDate)) {
                                                if (swap.indexOf(j) < 0) {
                                                    tempCodes.push(y);
                                                    swap.push(j)
                                                    isDuplicate = true;
                                                }

                                            }
                                            // if duplicate found add x
                                            if (j == length - 1 && isDuplicate) {
                                                tempCodes.push(x);
                                            }
                                        }

                                    }
                                }
                            })
                            // same operation for molecule codes
                            _.forEach(_.groupBy(itemCodes, 'Molecule_HIS_ID'), function (codeGruop) {
                                // console.log(codeGruop)
                                let length = codeGruop.length;
                                if (length > 1) {
                                    let swap = [];
                                    for (let i = 0; i < length; i++) {
                                        let x = codeGruop[i];
                                        for (let j = i + 1; j < length; j++) {
                                            let y = codeGruop[j];
                                            let isDuplicate = false;
                                            if ((y.startDate >= x.startDate && y.startDate <= x.endDate) || (y.startDate >= x.startDate && y.startDate <= x.endDate)) {
                                                if (swap.indexOf(j) < 0) {
                                                    tempMolecules.push(y);
                                                    swap.push(j)
                                                    isDuplicate = true;
                                                }

                                            }
                                            if (j == length - 1 && isDuplicate) {
                                                tempMolecules.push(x);
                                            }
                                        }

                                    }
                                }
                            });
                            //
                            let temp = _.unionBy(tempCodes, tempMolecules, 'ItemCode')
                            // duplicates = active duplicate medication 
                            // temp= duplciate itemcodes for current operation
                            duplicates = _.concat(temp, _.unionBy(duplicates, 'orderId'));
                            if (err) {
                                var response = {
                                    '_error_message': 'error',
                                    '_status_Code': 501,
                                    '_status': 'error',
                                    'result': err
                                }
                                res.send(response)
                            } else if (duplicates.length > 0) {

                                console.log('found duplicate medication')
                                var response = {
                                    '_error_message': 'Duplicate Medication',
                                    '_status_Code': 406,
                                    '_status': 'error',
                                    'result': duplicates
                                }
                                res.status(200).send(response);
                            } else {
                                // no duplicate create order

                                switch (orderToCreate.orderSubCategory.toLowerCase()) {
                                    case 'op':
                                        placeOpPharmacyOrder(data, res, false)
                                        break;
                                    case 'ip':
                                        placeIpPharmacyOrder(data, res);
                                        break;
                                    case 'non hospital':
                                        placeOpPharmacyOrder(data, res, true)
                                        break;
                                    case 'medical supply':
                                        orderToCreate.orderName = data.orderItems.item != undefined ? data.orderItems.item.ItemName : data.orderSubCategory;
                                        if (visitResult.OPD_IPD == 1) {// IPD=1
                                            orderToCreate.orderItems.pickup = 'Ward'
                                            orderToCreate.orderItems.pickup_Id = 3
                                        } else {
                                            orderToCreate.orderItems.pickup = 'Clinic'
                                            orderToCreate.orderItems.pickup_Id = 1
                                        }
                                        var supplyItem = new cpoeDocument.medicalSuppliesItem(orderToCreate.orderItems);
                                        placeCpoeOrder(orderToCreate, supplyItem, res);
                                        break;
                                    case 'iv':
                                        var ivPharmacyOrder = new cpoeDocument.ivPharmacyOrder(orderToCreate.orderItems)
                                        orderToCreate.orderName = data.orderItems.solution + " : " + data.orderItems.additiveName
                                        // placeCpoeOrder(orderToCreate, ivPharmacyOrder, res);
                                        orderToCreate.orderItems.pharmacyItems ? placeIvCpoeOrder(orderToCreate, res) : placeCpoeOrder(orderToCreate, ivPharmacyOrder, res);
                                        break;
                                    default:
                                        var response = {
                                            '_error_message': 'invalid subcategory',
                                            '_status_Code': 406,
                                            '_status': 'error',
                                            'result': 'Record Not found'
                                        }
                                        res.status(200).send(response);
                                }
                            }
                        });
                        break;
                    case 'rehab':
                        orderToCreate.orderName = data.orderItems.consult_to_service.name;
                        var rehabOrderItem = new cpoeDocument.rehabOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, rehabOrderItem, res)
                        break
                    case 'diet':
                        orderToCreate.orderName = data.orderItems.diet_category;
                        var dietOrderItem = new cpoeDocument.dietOrderItem(orderToCreate.orderItems)
                        placeCpoeOrder(orderToCreate, dietOrderItem, res)
                        break;
                    case 'medical supply':
                        var response = {
                            '_error_message': 'invalid category',
                            '_status_Code': 406,
                            '_status': 'error',
                            'result': 'invalid category'
                        }
                        res.send(response)
                    default:
                        res.status(409).send()
                }
            } else {
                var response = {
                    '_error_message': 'invalid inputs',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'Record Not found'
                }
                res.send(response)
            }
        })
    } else {
        var response = {
            '_error_message': 'invalid patientId',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'Record Not found'
        }
        res.send(response)
    }
}

module.exports.searchOrdersByName = function (searchKey, userId, res) {
    var code = searchKey
    cpoeDocument.CpoeOrder.find({ userId: userId, orderName: new RegExp(code, 'i') }).limit(20).exec(function (err, items) {
        if (err) {
            var response = {
                '_error_message': 'Check Input',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response, 406)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': items
            }
            res.send(response, 200)
        }
    })
}
var placeIvCpoeOrder = function (orderToCreate, res) {
    var group = uuid.v4()
    orderSet = [];
    async.forEach(orderToCreate.orderItems.pharmacyItems, function (drugItem, callback) {

        var temp = _.merge(JSON.parse(JSON.stringify(orderToCreate.orderItems)), drugItem);
        delete temp.pharmacyItems;
        var orderItems = new cpoeDocument.ivPharmacyOrder(temp);
        orderItems._id = uuid.v4();
        orderItems.validate(function (err) {
            if (err) {
                callback(err);
            } else {
                orderToCreate.orderItems = JSON.parse(JSON.stringify(orderItems))
                orderToCreate.orderName = orderToCreate.orderItems.drugName;
                var newOrder = new cpoeDocument.CpoeOrder(JSON.parse(JSON.stringify(orderToCreate)))
                newOrder._id = uuid.v4();
                newOrder.orderItems.cpoeOrderId = group;
                newOrder.validate(function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        orderSet.push(newOrder);
                        callback();
                    }
                })

            }
        })

    }, function (err, result) {
        if (err) {
            document.sendResponse('validation error', 406, err, "none", res)
        } else {
            async.forEach(orderSet, function (order, callback_save) {
                order.save(function (err) {
                    if (err) {
                        callback_save(err)
                    } else {
                        callback_save();
                    }
                })
            }, function (err) {
                if (err) {
                    document.sendResponse('system error', 406, err, "none", res)
                } else {
                    document.sendResponse('none', 200, 'orders created', "done", res)
                }
            });

        }
    })
}
module.exports.getCpoeOrdersByCategory = function (patientId, category, subCat, res) {
    var query = {
        patientId: patientId,
        orderCategory: new RegExp(category, 'i')
    };
    // special request by gitesh
    query['orderItems.type'] = { $ne: 'complex' };
    if (category === "diet") {
        if (subCat)
            query['orderItems.diet_category'] = new RegExp(subCat, 'i');
    } else
        query.orderSubCategory = new RegExp(subCat, 'i');

    cpoeDocument.CpoeOrder.find(query).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
            // var response = { "_status": "something went wrong please try again" }
            // res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
            // res.send(result)
        }
    })
}
module.exports.getComplexOrderDetails = function (recordId, res) {
    cpoeDocument.CpoeOrder.findOne({
        '_id': recordId,
        $or: [
            { 'orderItems.type': 'complex' },
            { "orderItems.orderType": "INFUSION" }
        ]
    }, function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 406, 'error', err, res)
        } else if (result) {
            var orderId = result.orderItems.cpoeOrderId;
            cpoeDocument.CpoeOrder.find({ 'orderItems.cpoeOrderId': orderId }, function (err, orders) {
                if (err) {
                    document.sendResponse('Error while reading orders please try again', 406, 'error', err, res)
                } else {
                    response = JSON.parse(JSON.stringify(orders));
                    if (result.orderItems.orderType === "INFUSION")
                        document.sendResponse('done', 200, 'error', response, res)
                    else {
                        response.sort(function (a, b) {
                            return a.orderItems.complexPharmacyItems[0].index > b.orderItems.complexPharmacyItems[0].index;
                        })
                        document.sendResponse('done', 200, 'error', response, res)
                    }
                }
            })

        } else {
            document.sendResponse('invalid recordId', 406, 'error', "none", res)
        }

    })
}
module.exports.getCpoeComplexPharmacyOrders = function (patientId, subCat, res) {
    cpoeDocument.CpoeOrder.find({
        patientId: patientId,
        orderCategory: new RegExp('pharmacy', 'i'),
        orderSubCategory: new RegExp(subCat, 'i'),
        'orderItems.type': 'complex'
    }).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
            // var response = { "_status": "something went wrong please try again" }
            // res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}
module.exports.updateOrder = function (data, res) {
    log('Entered in cpoe model to update order', {
        level: LOG_DEBUG
    })
    if (document.isFieldFilled(data.orderId)) {
        var update = {
            orderItems: data.orderItems,
            activityLog: [],
            orderStatus: 'update requested',
            serviceCode: data.serviceCode// added by soham
        }
        cpoeDocument.CpoeOrder.findOne({
            '_id': data.orderId,
            'canEdit': true
        }, function (err, result) {
            if (err) {
                log(err)
                document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
            } else if (result) {
                if (result.orderStatus.toLowerCase() == 'unsigned') {
                    update.orderStatus = 'unsigned'
                }
                var tempHistory = {};
                tempHistory.orderItems = result.orderItems;
                tempHistory.action = 'update request';
                tempHistory.userId = data.userId;
                tempHistory.timestamp = new Date();
                update.activityLog = result.activityLog.push(tempHistory);
                cpoeDocument.CpoeOrder.findOneAndUpdate({ '_id': data.orderId }, update, function (err) {
                    if (err) {
                        document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                    } else {
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': 'Order Updated Successfully'
                        }
                        res.send(response)
                    }
                });

            } else {
                document.sendResponse('invalid orderId', 405, 'error', 'none', res)
            }
        })
    } else {
        var response = {
            '_error_message': 'Invalid orderId',
            '_status_Code': 406,
            '_status': 'error',
            'result': 'none'
        }
        res.send(response)
    }
}
module.exports.updateComplexOrder = function (data, res) {
    async.parallel([
        function (parallel_callback) {
            cpoeDocument.CpoeOrder.find({ '_id': { $in: data.cancelledOrders } }, function (err, result) {
                if (err) {
                    parallel_callback(err, null)
                } else {
                    // update status here
                    for (let i = 0; i < result.length; i++) {
                        let orderElement = result[i];
                        let update = { 'orderStatus': 'cancelled' }
                        var tempHistory = {};
                        tempHistory.action = 'cancel';
                        if (orderElement.orderStatus.toLowerCase() == 'unsigned') {
                            update.orderStatus = 'cancelled';
                            tempHistory.action = 'cancel request'
                        }
                        tempHistory.userId = data.decoded.userId;
                        tempHistory.timestamp = new Date();
                        if (orderElement.activityLog) {
                            if (orderElement.activityLog.length < 1) {
                                orderElement.activityLog = [];// to avoid problem in existing data
                            }
                            orderElement.activityLog.push(tempHistory);
                            update.activityLog = orderElement.activityLog;
                        }
                        cpoeDocument.CpoeOrder.update({ _id: orderElement._id }, update, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        })
                    }
                    parallel_callback(null, result);
                }
            })

        }, function (parallel_callback) {
            // update orderName, status, orderItems with complex validation
            //
            async.eachSeries(data.updatedOrders, function (updatedOrder, callback_foreach) {
                // if order exist update
                // else create new order
                cpoeDocument.CpoeOrder.findOne({ '_id': updatedOrder._id }, function (err, Order) {
                    if (err) {
                        callback_foreach(err);
                    } else if (Order) {

                        var complexOrder = Order
                        var drug = updatedOrder.orderItems.complexPharmacyItems[0];
                        var complexDrug = new cpoeDocument.complexDrugList(drug)
                        complexDrug.quantity = drug.quantity || "0";
                        complexDrug.dosage_unit = drug.dosage_unit || null;
                        complexDrug.validate(function (err) {
                            if (err) {
                                callback_foreach(err);
                            } else {
                                var pharmacyOrder;
                                if (updatedOrder.orderSubCategory == 'ip') {
                                    pharmacyOrder = new cpoeDocument.ipPharmacyOrder(complexOrder.orderItems);
                                } else {// for op and non hospital
                                    pharmacyOrder = new cpoeDocument.opPharmacyOrder(complexOrder.orderItems);
                                }
                                // console.log(complexOrder);
                                if (!pharmacyOrder.complexPharmacyItems[0]) { pharmacyOrder.complexPharmacyItems = [] }
                                pharmacyOrder.complexPharmacyItems[0] = JSON.parse(JSON.stringify(complexDrug));
                                pharmacyOrder.drugId = complexDrug.drugId;
                                pharmacyOrder.itemCode = complexDrug.itemCode;
                                pharmacyOrder.validate(function (err) {
                                    if (err) {
                                        callback_foreach(err);
                                    } else {
                                        complexOrder.orderItems = JSON.parse(JSON.stringify(pharmacyOrder))
                                        complexOrder.orderName = complexOrder.orderItems.complexPharmacyItems[0].drugName;
                                        complexOrder.orderStatus = 'update requested';
                                        complexOrder.save(function (err, resultOrder) {
                                            if (err) {
                                                callback_foreach(err);
                                            } else {
                                                callback_foreach();

                                            }

                                        })
                                    }
                                })
                            }
                        })
                    } else {
                        // fetch common properties from sibling complex order
                        cpoeDocument.CpoeOrder.findOne({ "orderItems.cpoeOrderId": updatedOrder.cpoeOrderId }, function (err, SiblingOrder) {
                            if (err) {
                                callback_foreach(err);
                            } else if (SiblingOrder) {
                                var complexOrder = new cpoeDocument.CpoeOrder(JSON.parse(JSON.stringify(SiblingOrder)));
                                complexOrder._id = uuid.v4();
                                complexOrder.orderStatus = 'unsigned';
                                complexOrder.canCancel = true;
                                complexOrder.canRepeat = true;
                                complexOrder.canDiscontinue = true;
                                complexOrder.isFavorite = true;
                                complexOrder.orderDate = Date.now();
                                complexOrder.duplicateChecked = false;
                                complexOrder.reasonToSkipDuplicate = '';
                                complexOrder.isVerified = true;
                                complexOrder.signedBy = '';
                                var drug = updatedOrder.orderItems.complexPharmacyItems[0];
                                var complexDrug = new cpoeDocument.complexDrugList(drug);
                                complexDrug.quantity = drug.quantity || "0";
                                complexDrug.dosage_unit = drug.dosage_unit || null;
                                complexDrug.validate(function (err) {
                                    if (err) {
                                        callback_foreach(err);
                                    } else {
                                        var pharmacyOrder;
                                        if (updatedOrder.orderSubCategory == 'ip') {
                                            pharmacyOrder = new cpoeDocument.ipPharmacyOrder(complexOrder.orderItems);
                                        } else {// for op and non hospital
                                            pharmacyOrder = new cpoeDocument.opPharmacyOrder(complexOrder.orderItems);
                                        }
                                        // console.log(complexOrder);
                                        if (!pharmacyOrder.complexPharmacyItems[0]) { pharmacyOrder.complexPharmacyItems = [] }
                                        pharmacyOrder.complexPharmacyItems[0] = JSON.parse(JSON.stringify(complexDrug));
                                        pharmacyOrder.drugId = complexDrug.drugId;
                                        pharmacyOrder.itemCode = complexDrug.itemCode;
                                        pharmacyOrder.validate(function (err) {
                                            if (err) {
                                                callback_foreach(err);
                                            } else {
                                                complexOrder.orderItems = JSON.parse(JSON.stringify(pharmacyOrder))
                                                complexOrder.orderName = complexOrder.orderItems.complexPharmacyItems[0].drugName;
                                                complexOrder.orderStatus = 'unsigned';
                                                complexOrder.save(function (err, resultOrder) {
                                                    if (err) {
                                                        callback_foreach(err);
                                                    } else {
                                                        callback_foreach();

                                                    }

                                                })
                                            }
                                        })
                                    }
                                })
                            } else {
                                var error = 'invalid cpoeOrderId';
                                callback_foreach(error);

                            }

                        });
                    }

                });
            }, function (err) {
                if (err) {
                    parallel_callback(err, null);
                } else {
                    parallel_callback(null, 'orders updated');
                }
            });
        }], function (err, result) {
            if (err) {
                document.sendResponse('unable to process', 405, 'error', err, res)
            } else {
                var response = {
                    '_error_message': 'none',
                    '_status_Code': 200,
                    '_status': 'done',
                    'result': 'Order Updated Successfully'
                }
                res.send(response)
            }
        })
};
module.exports.cancelComplexGroup = function (data, res) {
    cpoeDocument.CpoeOrder.find({ 'orderItems.cpoeOrderId': data.cpoeOrderId }, function (err, result) {
        if (err) {
            document.sendResponse('unable to process please try again', 405, 'error', err, res)
        } else if (result.length) {
            // update status here
            console.log(result)
            for (let i = 0; i < result.length; i++) {
                let orderElement = result[i];
                let update = { 'orderStatus': 'cancel requested' }
                var tempHistory = {};
                tempHistory.action = 'cancel';
                if (orderElement.orderStatus.toLowerCase() == 'unsigned') {
                    update.orderStatus = 'cancelled';
                    tempHistory.action = 'cancel request'
                }
                tempHistory.userId = data.userId;
                tempHistory.timestamp = new Date();
                if (orderElement.activityLog) {
                    if (orderElement.activityLog.length < 1) {
                        orderElement.activityLog = [];// to avoid problem in existing data
                    }
                    orderElement.activityLog.push(tempHistory);
                    update.activityLog = orderElement.activityLog;
                }
                cpoeDocument.CpoeOrder.update({ _id: orderElement._id }, update, function (err) {
                    if (err) {
                        // console.log(err);
                        document.sendResponse('unable to process please try again', 405, 'error', err, res)
                    } else if (i == result.length - 1) {
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': 'operation successful'
                        }
                        res.send(response)
                    }
                });
            }
        } else {
            document.sendResponse('invalid cpoeorderId', 405, 'error', "none", res)
        }
    })

}
module.exports.getFavoriteOrders = function (res) {
    cpoeDocument.CpoeOrder.find({
        // userId:data.userId
        isFavorite: true
    }).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
            // var response = { "_status": "something went wrong please try again" }
            // res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response);
        }

    })
}

module.exports.getRecentOrders = function (data, res) {
    // change sorting order to date time from Id
    var count = Number(data.count);
    cpoeDocument.CpoeOrder.aggregate([
        { $match: { userId: data.userId } },
        {
            $group: {
                _id: "$orderName",
                orderId: { $first: "$_id" },
                orderItems: { $first: "$orderItems" },
                orderName: { $first: '$orderName' },
                userId: { $first: "$userId" },
                patientId: { $first: '$patientId' },
                orderCategory: { $first: "$orderCategory" },
                orderSubCategory: { $first: "$orderSubCategory" },
                orderDate: { $first: '$orderDate' },
                repeatCount: { $sum: 1 }
            }
        },
        {
            $sort: { repeatCount: -1 }
        },
        { $limit: count }
    ]).exec(function (err, result) {
        if (err) {
            log(err)
            document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response);
        }
    })
}
module.exports.visitOrderListByStatus = function (req, res) {
    cpoeDocument.CpoeOrder.find({ visitId: req.params.visitId, orderStatus: req.query.status }, function (err, result) {
        if (err) {
            document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'invalid orderId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }

    })
}
module.exports.getCpoeOrdersById = function (orderId, res) {
    //    if(document.isFieldFilled(orderId)){
    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
        } else if (document.isFieldFilled(result)) {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        } else {
            var response = {
                '_error_message': 'invalid orderId',
                '_status_Code': 406,
                '_status': 'error',
                'result': 'none'
            }
            res.send(response)
        }

    })
}

// module.exports.addOrderToFavorites = function (orderId, res) {
//   //    if(document.isFieldFilled(orderId)){
//   cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
//     if (err) {
//       document.sendResponse('unable to process please check orderId', 406, 'error', 'none', res)
//     } else {
//       if (document.isFieldFilled(result)) {
//         result.isFavorite = true
//         result.save(function (err) {
//           if (err) {
//             document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
//           } else {
//             var response = {
//               '_error_message': 'none',
//               '_status_Code': 200,
//               '_status': 'done',
//               'result': 'order is added to favorites succesfully'
//             }
//             res.send(response)
//             // var response = { "_status": "order is added to favorites succesfully" }
//             // res.send(response)
//           }
//         })
//       } else {
//         var response = {
//           '_error_message': 'invalid orderId',
//           '_status_Code': 406,
//           '_status': 'error',
//           'result': 'none'
//         }
//         res.send(response)
//       }
//     }
//   })
// }

// module.exports.removeOrderFromFavorites = function (orderId, res) {
//   //    if(document.isFieldFilled(orderId)){
//   cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
//     if (err) {
//       document.sendResponse('unable to process please check orderId', 406, 'error', 'none', res)
//     } else {
//       if (document.isFieldFilled(result)) {
//         result.isFavorite = false
//         result.save(function (err) {
//           if (err) {
//             document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
//           } else {
//             var response = {
//               '_error_message': 'none',
//               '_status_Code': 200,
//               '_status': 'done',
//               'result': 'order is removed from favorites succesfully'
//             }
//             res.send(response)
//             // var response = { "_status": "order is removed from favorites succesfully" }
//             // res.send(response)
//           }
//         })
//       } else {
//         var response = {
//           '_error_message': 'invalid orderId',
//           '_status_Code': 406,
//           '_status': 'error',
//           'result': 'none'
//         }
//         res.send(response)
//       }
//     }
//   })
// }

module.exports.cancelOrder = function (data, res) {
    cpoeDocument.CpoeOrder.findOne({ _id: data.orderId, canCancel: true }, function (err, result) {
        if (err) {
            document.sendResponse('unable to process please check orderId', 406, 'error', 'none', res)
        } else {
            if (document.isFieldFilled(result)) {

                result.orderStatus = (result.orderStatus == 'unsigned') ? 'deleted' : "cancel requested";
                // result.orderStatus = "cancelled";
                result.canCancel = false;
                result.canDiscontinue = false;
                result.canEdit = false;
                var tempHistory = {};
                tempHistory.action = 'cancel request';
                tempHistory.userId = data.userId;
                tempHistory.timestamp = new Date();
                if (result.activityLog) {
                    if (result.activityLog.length < 1) {
                        result.activityLog = [];// to avoid problem in existing data
                    }
                    result.activityLog.push(tempHistory);
                }
                result.save(function (err, resultUpdate) {
                    if (err) {
                        document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                    } else {
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': 'Order is requested to cancel. Please sign it.'
                        }
                        res.send(response)
                        // var response = { "_status": "order is canceled succesfully" }
                        // res.send(response)
                    }
                })
            } else {
                var response = {
                    '_error_message': 'invalid orderId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        }
    })
}

module.exports.discontinueOrder = function (data, res) {
    cpoeDocument.CpoeOrder.findOne({ _id: data.orderId, canDiscontinue: true }, function (err, result) {
        if (err) {
            document.sendResponse('unable to process please check orderId', 406, 'error', 'none', res)
        } else {
            if (document.isFieldFilled(result)) {
                let tempStatus = result.orderStatus == 'unsigned' ? 'discontinued' : "discontinue requested";
                result.canCancel = false;
                result.canDiscontinue = false;
                result.canEdit = false;
                result.isScheduledDiscontinue = data.isScheduledDiscontinue;
                result.discontinueTime = data.discontinueTime;
                result.orderStatus = tempStatus
                var tempHistory = {};
                tempHistory.action = tempStatus;
                tempHistory.userId = data.userId;
                tempHistory.timestamp = new Date();

                if (result.activityLog) {
                    if (result.activityLog.length < 1) {
                        result.activityLog = [];// to avoid problem in existing data
                    }
                    result.activityLog.push(tempHistory);
                }
                result.save(function (err) {
                    if (err) {
                        document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                    } else {
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'done',
                            'result': 'Order is Requested to discontinue. Please sign it.'
                        }
                        res.send(response)
                        // var response = { "_status": "order is discontined succesfully" }
                        // res.send(response)
                    }
                })
            } else {
                var response = {
                    '_error_message': 'invalid orderId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        }
    })
}

module.exports.repeatOrder = function (req, res) {
    var orderId = req.params.orderId
    var payload = req.body;
    cpoeDocument.CpoeOrder.findOne({ _id: orderId, canRepeat: true }, function (err, data) {
        if (err) {
            // console.log(err)
            document.sendResponse('unable to process please check orderId', 406, 'error', 'none', res)
        } else {
            if (document.isFieldFilled(data)) {
                documentObject.Visit.findOne({ _id: payload.visitId }, function (err, visitInfo) {
                    if (err) {
                        document.sendResponse('unable to process please', 406, 'error', err, res)
                    } else if (visitInfo) {
                        var orderToCreate = new cpoeDocument.CpoeOrder(JSON.parse(JSON.stringify(data)));
                        orderToCreate._id = uuid.v4();
                        orderToCreate.userId = req.decoded.userId;
                        orderToCreate.isFavorite = false;
                        orderToCreate.orderStatus = 'unsigned'
                        orderToCreate.orderDate = Date.now();
                        orderToCreate.canRepeat = true;
                        orderToCreate.canDiscontinue = true;
                        orderToCreate.canCancel = true;
                        orderToCreate.canEdit = true;
                        orderToCreate.visitId = visitInfo._id;
                        orderToCreate.patientId = visitInfo.patientId;
                        orderToCreate.patientName = visitInfo.searchBox.name;
                        orderToCreate.mrn = visitInfo.searchBox.mrn;
                        orderToCreate.duplicateChecked = false;
                        orderToCreate.reasonToSkipDuplicate = '';
                        orderToCreate.isVerified = true;
                        orderToCreate.signedBy = '';
                        orderToCreate.duplicateOrders = [];
                        orderToCreate.onBehalf = {};
                        orderToCreate.activityLog = [];
                        var tempHistory = {};
                        tempHistory.action = 'Repeat';
                        tempHistory.userId = orderToCreate.userId;
                        tempHistory.timestamp = new Date();
                        tempHistory.repeatOrderId = data._id;
                        orderToCreate.activityLog.push(tempHistory)
                        // change start and end date
                        if (data.orderCategory.toLowerCase() == 'pharmacy') {
                            var temp = {};
                            switch (data.orderItems.type) {
                                case 'dosage':

                                    if (data.orderItems.ipPharmacyItems ? data.orderItems.ipPharmacyItems[0] : false) {
                                        var startDate = moment(data.orderItems.ipPharmacyItems[0].startDate);
                                        var endDate = moment(data.orderItems.ipPharmacyItems[0].endDate)
                                        orderToCreate.orderItems.ipPharmacyItems[0].startDate = parseInt(moment().startOf('day').format('x'));
                                        orderToCreate.orderItems.ipPharmacyItems[0].endDate = parseInt(moment().startOf('day').format('x'))
                                            + parseInt(endDate.diff(startDate));
                                    } else if (data.orderItems.opPharmacyItems ? data.orderItems.opPharmacyItems[0] : false) {
                                        var startDate = moment(data.orderItems.opPharmacyItems[0].startDate);
                                        var endDate = moment(data.orderItems.opPharmacyItems[0].endDate)
                                        orderToCreate.orderItems.opPharmacyItems[0].startDate = parseInt(moment().startOf('day').format('x'));
                                        orderToCreate.orderItems.opPharmacyItems[0].endDate = parseInt(moment().startOf('day').format('x'))
                                            + parseInt(endDate.diff(startDate));
                                    } else {
                                        var startDate = moment(data.orderItems.startDate);
                                        var endDate = moment(data.orderItems.endDate);
                                        orderToCreate.orderItems.startDate = parseInt(moment().startOf('day').format('x'));
                                        orderToCreate.orderItems.endDate = parseInt(moment().startOf('day').format('x'))
                                            + parseInt(endDate.diff(startDate));
                                    }
                                    break;
                                case 'complex':
                                    var startDate = moment(data.orderItems.complexPharmacyItems[0].startDate);
                                    var endDate = moment(data.orderItems.complexPharmacyItems[0].endDate);
                                    orderToCreate.orderItems.complexPharmacyItems[0].startDate = parseInt(moment().startOf('day').format('x'));
                                    orderToCreate.orderItems.complexPharmacyItems[0].endDate = parseInt(moment().startOf('day').format('x')) + parseInt(endDate.diff(startDate));
                                    break;
                            }

                        }

                        orderToCreate.save(function (err, result1) {
                            if (err) {
                                document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                            } else {
                                resObj = {
                                    'orderId': result1._id
                                }
                                var response = {
                                    '_error_message': 'user ' + req.decoded.userId,
                                    '_status_Code': 200,
                                    '_status': 'done',
                                    'result': resObj
                                }
                                res.send(response)
                            }
                        })
                    } else {
                        document.sendResponse('invalid visit', 405, 'error', 'none', res)
                    }
                })

            } else {
                var response = {
                    '_error_message': 'invalid orderId',
                    '_status_Code': 406,
                    '_status': 'error',
                    'result': 'none'
                }
                res.send(response)
            }
        }
    })
}
// ////////////// order review

module.exports.getCpoeOrdersReview = function (data, req, res) {
    var query = {
        patientId: data.patientId,
        orderStatus: { $ne: 'unsigned' }
    };
    if (req.query.dateLower && req.query.dateUpper) {
        query.orderDate = {
            $gte: req.query.dateLower,
            $lte: req.query.dateUpper
        };
    }
    if (req.query.orderStatus == "pending") {
        query.orderStatus = 'pending';
    }
    if (req.query.visit) {
        query.visitId = req.query.visit;
    }
    cpoeDocument.CpoeOrder.find(query).populate({
        path: 'visitId',
        model: 'Visit',
        select: 'visitDate primaryDoctor visitType OPD_IPD location'
    }).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
            // var response = { "_status": "something went wrong please try again" }
            // res.send(response)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
            // res.send(result)
        }
    })
}

module.exports.getCpoeOrdersReviewByDate = function (data, res) {
    // log("in cpoe orders by date")
    var condition = {
        patientId: data.patientId,
        orderStatus: { $ne: 'unsigned' },
        orderDate: {
            $gte: data.dateLower,
            $lte: data.dateUpper
        }

    }

    cpoeDocument.CpoeOrder.find(condition).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response)
        }
    })
}
// order sign
module.exports.getPatientUnsignedOrders = function (data, res) {
    // log('patientId:' + data.patientId)
    // log('userId' + data.userId)
    // regex to check not unsigned
    var checkUnsigned = new RegExp("^((?!unsigned).)*$", "i");
    cpoeDocument.CpoeOrder.find({
        patientId: data.patientId,
        $or: [
            {
                $and: [
                    {
                        $or: [
                            { orderStatus: new RegExp('unsigned', 'i') },
                            { orderStatus: new RegExp('Requested', 'i') }
                        ]
                    }
                    // { userId: data.userId }    // As per Gitesh Requested.
                ]
            },
            {
                $and: [
                    { 'onBehalf.doctorId': data.userId },
                    { 'onBehalf.orderStatus': new RegExp('unsigned', 'i') },
                    // {
                    //     $or: [
                    //         { orderStatus: new RegExp('unsigned', 'i') },
                    //         { orderStatus: new RegExp('Requested', 'i') }
                    //     ]
                    // }
                ]
            }
        ]
    }).sort({
        orderDate: -1
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, err, 'none', res)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'done',
                'result': result
            }
            res.send(response);
        }
    })
}

module.exports.signCpoeOrders = function (data, res) {

    log('signature: ' + data.signature)
    // stetps
    // 1. validate user by signcode
    // 2. check duplicate update reasonToSkipDuplicate for orders
    // 2. check duplicate medications
    // 3. check mims interaction
    // 4. sign orders

    if (data.signature === undefined)
        return res.json(Utility.output('Sign is required', 'VALIDATION_ERROR'));
    if (!data.signature)
        return res.json(Utility.output('Sign is required', 'VALIDATION_ERROR'));
    documentObject.User.findOne({ signCode: data.signature, userId: data.userId }, 'userId userDetails', function (err, userResult) {
        if (err) {
            document.sendResponse('System Error ', 501, 'error', err, res)
        } else if (userResult) {
            cpoeDocument.CpoeOrder.find({
                '_id': { $in: data.cpoeOrders }, 'orderCategory': 'pharmacy',
                $or: [
                    { orderStatus: { $regex: 'unsigned', $options: 'i' } },
                    { "onBehalf.orderStatus": { $regex: 'unsigned', $options: 'i' } }
                ]
            }, function (err, pharmacyOrders) {
                if (err) {
                    document.sendResponse('Error ', 405, 'error', err, res)
                } else if (pharmacyOrders.length > 0) {
                    console.log('looking for duplicate orders')
                    var duplicateList = [];
                    var itemCodeList = [];
                    async.detectSeries(pharmacyOrders, function (order, callback_main) {
                        // skip duplicated checked orders
                        order = JSON.parse(JSON.stringify(order));
                        if (data.skipDuplicates != undefined
                            && (!order.duplicateChecked ||
                                (order.onBehalf != undefined && !order.onBehalf.duplicateChecked))
                        ) {
                            for (let i = 0; i < data.skipDuplicates.length; i++) {
                                let item = data.skipDuplicates[i];
                                if (item._id == order._id) {
                                    let temp = item;
                                    if (temp != undefined && typeof order.onBehalf == 'object' && order.userId != order.onBehalf.doctorId) {
                                        // update on behalf deplicate check
                                        order.onBehalf.duplicateChecked = temp.duplicateChecked;
                                        order.reasonToSkipDuplicate = temp.reasonToSkipDuplicate;
                                        order.duplicateOrders = temp.duplicateOrders;
                                    } else if (temp != undefined) {
                                        order.duplicateChecked = temp.duplicateChecked;
                                        order.reasonToSkipDuplicate = temp.reasonToSkipDuplicate;
                                        // concat duplciate orders
                                        order.duplicateOrders = _.union(order.duplicateOrders, temp.duplicateOrders);
                                    } else {
                                        order.duplicateChecked = false;
                                    }
                                }

                            }
                        }

                        checkDuplicateMedication(order, order.patientId, order.duplicateChecked, true, function (err, duplicates, itemCodes) {
                            if (duplicates.length > 0) {
                                duplicateList = _.concat(duplicateList, duplicates);
                            }
                            if (itemCodes.length > 0) {
                                itemCodeList = _.concat(itemCodeList, itemCodes);
                            }
                            callback_main();
                        });
                    }, function (result) {
                        // console.log(itemCodeList)
                        var tempCodes = []
                        var tempMolecules = [];
                        // duplicate item check by itemcode
                        _.forEach(_.groupBy(itemCodeList, 'ItemCode'), function (codeGruop) {
                            let length = codeGruop.length;
                            if (length > 1) {
                                let swap = [];
                                for (let i = 0; i < length; i++) {
                                    let x = codeGruop[i];
                                    for (let j = i + 1; j < length; j++) {
                                        let y = codeGruop[j];
                                        let isDuplicate = false;
                                        // duplicate ItemCode check 
                                        // need to add one condition y.orderId== x.orderId
                                        if ((y.startDate >= x.startDate && y.startDate <= x.endDate) || (y.startDate >= x.startDate && y.startDate <= x.endDate)) {
                                            if (swap.indexOf(j) < 0) {
                                                tempCodes.push(y);
                                                swap.push(j)
                                                isDuplicate = true;
                                            }

                                        }
                                        // if duplicate found add x otherwise skip
                                        if (j == length - 1 && isDuplicate) {
                                            tempCodes.push(x);
                                        }
                                    }

                                }
                            }
                        })
                        // duplicate item check by Molecule_HIS_ID
                        _.forEach(_.groupBy(itemCodeList, 'Molecule_HIS_ID'), function (codeGruop) {
                            let length = codeGruop.length;
                            if (length > 1) {
                                let swap = [];
                                for (let i = 0; i < length; i++) {
                                    let x = codeGruop[i];
                                    for (let j = i + 1; j < length; j++) {
                                        let y = codeGruop[j];
                                        let isDuplicate = false;
                                        // duplicate Molecule_HIS_ID check criteria
                                        // need to add one condition y.orderId== x.orderId
                                        if ((y.startDate >= x.startDate && y.startDate <= x.endDate) || (y.startDate >= x.startDate && y.startDate <= x.endDate)) {
                                            if (swap.indexOf(j) < 0) {
                                                tempMolecules.push(y);
                                                swap.push(j)
                                                isDuplicate = true;
                                            }

                                        }
                                        if (j == length - 1 && isDuplicate) {
                                            tempMolecules.push(x);
                                        }
                                    }

                                }
                            }
                        })
                        let temp = _.unionBy(tempCodes, tempMolecules, 'ItemCode');
                        // duplicateList = active duplicate medication 
                        // temp= duplciate itemcodes for current operation
                        // duplicateList = _.concat(temp, _.unionBy(duplicateList, 'orderId'));
                        duplicateList = _.concat(temp, duplicateList);
                        if (duplicateList.length > 0) {

                            var response = {
                                '_error_message': 'Duplicate Medication',
                                '_status_Code': 406,
                                '_status': 'error',
                                'result': duplicateList
                            }
                            res.status(200).send(response);
                        } else {
                            console.log('no duplicates checking mims interaction')
                            mimsInteractionCheck(data, userResult, res);
                        }
                    })
                } else {
                    console.log('signing orders without medication and mims check')
                    // signOrders(data, userResult, res);
                    signOrdersParallel(data, userResult, res);
                }
            })


        } else {
            return res.json(Utility.output('Invalid sign', 'VALIDATION_ERROR'));
        }
    })
}

var mimsInteractionCheck = function (data, userResult, res) {
    var drugs = [];
    var allergies = [];
    //if data contains pharmacy orders and mims review required 
    if (data.isPharmacy && !data.isMimsReviewed && EHR_SERVER_CONFIG.mims_interaction) {
        // steps
        // 1. retrieve patients active allergies
        // 2. retrive patients active medications
        // 3. find medications in current drugs
        // 4.  check mims interaction
        // 5. if nothing is wrong sign orders otherwise send interactions
        async.parallel([
            function (parallel_callback) {
                documentObject.Allergies.find({ patientId: data.patientId, state: 'active' }, function (err, allergyResult) {
                    if (err) {
                        parallel_callback(err, [])
                    } else {
                        // log(allergyResult)
                        parallel_callback(null, allergyResult)
                    }
                })
            },
            function (parallel_callback) {
                documentObject.Medication.find({ patientId: data.patientId, status: 'active' }, function (err, medicationResult) {
                    if (err) {
                        log(err)
                        parallel_callback(err, [])
                    } else {
                        // log(medicationResult)
                        parallel_callback(null, medicationResult)
                    }
                })
            },
            function (parallel_callback) {
                documentObject.mimsInteractionAudit.aggregate([
                    {
                        $match: {
                            'patient': data.patientId
                        }
                    },
                    {
                        $unwind: { path: '$suspectedOrders' }
                    }, {
                        $match: {
                            suspectedOrders: { $in: data.cpoeOrders }
                        }
                    },
                    {
                        $group: {
                            '_id': '$_id',
                            'suspectedOrders': { $push: '$suspectedOrders' },
                            'mimsPayload': { $first: '$mimsResponse' },
                            'reason': { $first: '$reason' }
                        }
                    }

                ], function (err, mimsHistory) {
                    if (err) {
                        parallel_callback(err, [])
                    } else {
                        log(mimsHistory)
                        parallel_callback(null, mimsHistory)
                    }
                })
            }

        ], function (err, parallelResults) {
            parallelResults[0].forEach(function (item) {
                if (document.isFieldFilled(item.allergyId))
                    allergies.push(item.allergyId)
            })
            parallelResults[1].forEach(function (item) {
                if (document.isFieldFilled(item.drugId))
                    drugs.push(item.drugId)
            })
            let mimsHistory = parallelResults[2];
            cpoeDocument.CpoeOrder.find({
                _id: { $in: data.cpoeOrders },
                orderCategory: 'pharmacy',
                $or: [
                    { orderStatus: { $regex: 'unsigned', $options: 'i' } },
                    // { "onBehalf.orderStatus": { $regex: 'unsigned', $options: 'i' } }
                ]
            },
                'orderItems.drugId',
                function (err, pharmacyOrders) {
                    if (err) {
                        document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
                    } else if (document.isFieldFilled(pharmacyOrders)) {
                        let tempDrugs = {};
                        let suspectedOrders = [];
                        pharmacyOrders.forEach(function (pharmacyOrder) {
                            if (typeof tempDrugs[pharmacyOrder.orderItems.drugId != 'array'])
                                tempDrugs[pharmacyOrder.orderItems.drugId] = [];
                            tempDrugs[pharmacyOrder.orderItems.drugId].push(pharmacyOrder._id);
                            drugs.push(pharmacyOrder.orderItems.drugId)
                        })
                        log('mims drugs check: ' + drugs)
                        var options = {
                            uri: Utility.baseURL() + '/ehr/mims/findInteraction',
                            method: 'POST',
                            body: {
                                'drugs': drugs,
                                'allergies': EHR_SERVER_CONFIG.allergy_interaction ? allergies : [],
                                'patientId': data.patientId,
                                'health': []
                            },
                            json: true
                        }
                        request(options)
                            .then(function (result) {
                                let mims = result.result;
                                log('get the result mims interaction: ' + mims.flag);
                                // if any interaction found 
                                if (mims.flag || (typeof mimsHistory == 'array' && mimsHistory.length > 0)) {

                                    documentObject.mimsReasons.find({}, function (err, mimsReasons) {
                                        if (err) {
                                            console.log(err);
                                        }
                                        console.log('reasons:', mimsReasons)
                                        if (mims.drug_to_drug.flag = true) {
                                            let lookup = mims.drug_to_drug;
                                            for (let i = 0; i < lookup.result.length; i++) {

                                                if (tempDrugs[lookup.result[i].drugs[0]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[0]._id])
                                                }

                                                if (tempDrugs[lookup.result[i].drugs[1]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[1]._id])
                                                }

                                            }
                                            if (typeof lookup.duplicate_drug == 'array')
                                                for (let i = 0; i < lookup.duplicate_drug.length; i++) {

                                                    if (tempDrugs[lookup.duplicate_drug[i].drugDetails[0]._id] != undefined) {
                                                        suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.duplicate_drug[i].drugDetails[0]._id])
                                                    }

                                                    if (tempDrugs[lookup.duplicate_drug[i].drugDetails[1]._id] != undefined) {
                                                        suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.duplicate_drug[i].drugDetails[0]._id])
                                                    }
                                                }


                                        }
                                        if (mims.drug_to_allergy.flag = true) {
                                            let lookup = mims.drug_to_allergy;
                                            for (let i = 0; i < lookup.result.length; i++) {

                                                if (tempDrugs[lookup.result[i].drugs[0]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[0]._id])
                                                }

                                                if (tempDrugs[lookup.result[i].drugs[1]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[1]._id])
                                                }
                                            }
                                        }
                                        if (mims.drug_to_health.flag = true) {
                                            let lookup = mims.drug_to_health;
                                            for (let i = 0; i < lookup.result.length; i++) {

                                                if (tempDrugs[lookup.result[i].drugs[0]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[0]._id])
                                                }

                                                if (tempDrugs[lookup.result[i].drugs[1]._id] != undefined) {
                                                    suspectedOrders = suspectedOrders.concat(tempDrugs[lookup.result[i].drugs[1]._id])
                                                }
                                            }
                                        }
                                        mims['suspectedOrders'] = suspectedOrders;
                                        mims['suspectedDrugs'] = drugs
                                        mims['mimsHistory'] = mimsHistory
                                        mims['Reasons'] = mimsReasons
                                        document.sendResponse('MIMS Interaction Found', 100, 'MIMS', mims, res)
                                    })


                                    // res.send(result)
                                } else {
                                    // signOrders(data, userResult, res);
                                    signOrdersParallel(data, userResult, res);
                                    // document.sendResponse('MIMS Interaction Found', 100, 'MIMS', 'no results', res);
                                }
                            }).catch(function (error) {
                                document.sendResponse('server error', 501, 'error', error, res)
                            })
                    } else if (mimsHistory.length > 0) {
                        // if user is signing only on behalf orders
                        let mims = { 'flag': true, 'mimsHistory': mimsHistory }
                        document.sendResponse('MIMS Interaction Found', 100, 'MIMS', mims, res)
                    } else {
                        //if no unsigned pharmacy orders
                        // signOrders(data, userResult, res);
                        signOrdersParallel(data, userResult, res);
                    }
                })
        })
    } else if (data.isPharmacy && data.isMimsReviewed) {
        if (data.reason && data.mimsResponse) {
            // signOrders(data, userResult, res);
            signOrdersParallel(data, userResult, res);
            addMimsLog(data, userResult)
        } else {
            document.sendResponse('Invalid Mims Response or reason', 406, 'error', '', res)
        }
    } else {
        // signOrders(data, userResult, res);
        signOrdersParallel(data, userResult, res);
    }
}

var addMimsLog = function (data, user) {
    cpoeDocument.CpoeOrder.find({ _id: { $in: data.cpoeOrders }, 'orderCategory': 'pharmacy' }, '_id', function (err, results) {
        if (err) {
            log(err)
        } else {
            var newMimsInteraction = documentObject.mimsInteractionAudit();
            newMimsInteraction._id = uuid.v4();
            newMimsInteraction.userId = user.userId;
            newMimsInteraction.reason = data.reason;
            newMimsInteraction.mimsResponse = data.mimsResponse;
            newMimsInteraction.suspectedOrders = data.mimsResponse.suspectedOrders;
            newMimsInteraction.patient = data.patientId;
            newMimsInteraction.orders = data.results;
            newMimsInteraction.drugs = data.mimsResponse.suspectedDrugs;
            newMimsInteraction.save(function (err, result) {
                if (err) {
                    log(err)
                } else {
                    log('mims interaction log added')
                }
            })
        }
    })

}
var createMedicationRecord = function (orderElement) {
    // log(orderElement)
    var newMedication = new documentObject.Medication();
    newMedication._id = uuid.v4()
    newMedication.status = 'active'
    newMedication.date = Date.now()
    newMedication.visitId = orderElement.visitId
    newMedication.orderBy = orderElement.userId
    newMedication.orderType = orderElement.orderSubCategory
    newMedication.patientId = orderElement.patientId
    newMedication.drugId = orderElement.orderItems.drugId
    newMedication.orderId = orderElement._id;
    newMedication.orderItems = orderElement.orderItems;
    newMedication.onBehalf = orderElement.onBehalf;
    newMedication.medicationDispensedStatus = ""
    switch (orderElement.orderSubCategory.toLowerCase()) {
        case 'ip':
            newMedication.Molecule_HIS_ID = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].Molecule_HIS_ID : orderElement.orderItems.complexPharmacyItems[0].Molecule_HIS_ID;
            newMedication.drugName = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].drugName : orderElement.orderItems.complexPharmacyItems[0].drugName
            newMedication.drugGenericName = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].drugGenericName : ""
            newMedication.dosage = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].dosage : orderElement.orderItems.complexPharmacyItems[0].dosage;
            newMedication.dosage_unit = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].dosage_unit : orderElement.orderItems.complexPharmacyItems[0].dosage_unit;
            newMedication.startDate = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].startDate : orderElement.orderItems.complexPharmacyItems[0].startDate
            newMedication.endDate = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].endDate : orderElement.orderItems.complexPharmacyItems[0].endDate
            newMedication.ItemCode = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].ItemCode : orderElement.orderItems.complexPharmacyItems[0].ItemCode;
            newMedication.schedule = document.isFieldFilled(orderElement.orderItems.ipPharmacyItems[0]) ? orderElement.orderItems.ipPharmacyItems[0].schedule : orderElement.orderItems.complexPharmacyItems[0].schedule;
            break;
        case 'non hospital':
        // non hospital and op have same schema
        case 'op':
            newMedication.Molecule_HIS_ID = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].Molecule_HIS_ID : orderElement.orderItems.complexPharmacyItems[0].Molecule_HIS_ID;
            newMedication.drugName = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].drugName : orderElement.orderItems.complexPharmacyItems[0].drugName
            newMedication.drugGenericName = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].drugGenericName : ""
            newMedication.dosage = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].dosage : orderElement.orderItems.complexPharmacyItems[0].dosage;
            newMedication.dosage_unit = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].dosage_unit : orderElement.orderItems.complexPharmacyItems[0].dosage_unit
            newMedication.startDate = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].startDate : orderElement.orderItems.complexPharmacyItems[0].startDate
            newMedication.endDate = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].endDate : orderElement.orderItems.complexPharmacyItems[0].endDate
            newMedication.ItemCode = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].ItemCode : orderElement.orderItems.complexPharmacyItems[0].ItemCode;
            newMedication.schedule = document.isFieldFilled(orderElement.orderItems.opPharmacyItems[0]) ? orderElement.orderItems.opPharmacyItems[0].schedule : orderElement.orderItems.complexPharmacyItems[0].schedule
            break
        case 'iv':
            newMedication.Molecule_HIS_ID = orderElement.orderItems.SOL_Molecule_HIS_ID;
            newMedication.drugName = orderElement.orderItems.solution;
            newMedication.drugGenericName = orderElement.orderItems.solutionGenricName;
            newMedication.schedule = orderElement.orderItems.schedule;
            newMedication.startDate = orderElement.orderItems.startDate;
            newMedication.endDate = orderElement.orderItems.endDate;
            newMedication.ItemCode = orderElement.orderItems.ItemCode;
            break
    }
    var update = {};
    if (orderElement.orderStatus.toLowerCase().indexOf('update') > -1) {
        update.status = 'modified'
    }
    // update previous medication of same orderId
    documentObject.Medication.update({ 'orderId': orderElement._id }, update, { 'multi': true }, function (err) {
        if (err) {
            console.log(err)
        } else {
            newMedication.save(function (err, result) {
                if (err) {
                    log(err)
                } else {
                    // console.log(result)
                    log("medications added for patient.")
                }
            });
        }
    });



}
module.exports.respondConsultNotification = function (data, res) {
    cpoeDocument.CpoeOrder.findOne({
        _id: data.orderId
    }, function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
        } else if (document.isFieldFilled(result)) {
            result.orderStatus = 'denied'
            if (data.isAccepted) {
                result.orderStatus = 'accepted'
            }
            result.save(function (err) {
                if (err) {
                    log(err)
                } else {
                    // passing order object to notification_model
                    notificationModel.respondConsultOrder(result)
                    // adding patient to doctor list
                    if (data.isAccepted) {
                        documentObject.Doctor.findOne({
                            _id: result.userId
                        }, function (err, doctorResult) {
                            if (err) {
                                document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
                            } else {
                                // console.log(doctorResult)
                                doctorResult.patients.unshift(result.patientId)
                                doctorResult.save(function (err) {
                                    if (!err) {
                                        document.sendResponse('none', 200, 'done', 'Response sent', res)
                                    }
                                })
                            }
                        })
                    }
                }
            })
        } else {
            log('no result found')
        }
    })
}

module.exports.createOrderSet = function (data, res) {
    var ValidationError
    var orderSet = new cpoeDocument.packageOrderSet()
    orderSet._id = uuid.v4()
    orderSet.orderPackageName = data.orderPackageName
    orderSet.isPackage = data.isPackage
    orderSet.recordType = data.recordType
    orderSet.created_by = data.userId
    orderSet.date = Date.now()
    orderSet.created_at = orderSet.date
    orderSet.updated_by = orderSet.created_by;
    orderSet.updated_at = orderSet.created_at;
    orderSet.specId = data.specId
    orderSet.instructions = data.instructions
    data.ordersList.forEach(function (listItem, index) {
        var orderListItem = new cpoeDocument.orderListItem()
        orderListItem.orderCategory = listItem.orderCategory
        orderListItem.orderSubCategory = listItem.orderSubCategory
        orderListItem.orderName = ''
        orderListItem.orderName = listItem.orderName
        orderListItem.orderSetGroup = listItem.orderSetGroup
        orderListItem.serviceCode = listItem.serviceCode
        orderListItem.serviceName = listItem.serviceName
        orderListItem.canCancel = true;
        orderListItem.canDiscontinue = true;
        orderListItem.canRepeat = true;
        orderListItem.canEdit = true;
        var orderItemObject
        switch (listItem.orderCategory.toLowerCase()) {
            case 'lab':
                orderItemObject = new cpoeDocument.labOrderItem()
                break
            case 'blood component':
                orderItemObject = new cpoeDocument.bloodComponentItem()
                break
            case 'imaging order':
                orderItemObject = new cpoeDocument.imagingOrderItem()
                break
            case 'procedure order':
                orderItemObject = new cpoeDocument.procedureOrderItem()
                break
            case 'general':
                orderItemObject = new cpoeDocument.generalOrderItem()
                break
            case 'consult':
                orderItemObject = new cpoeDocument.consultOrderItem()
                break
            case 'vital':
                orderItemObject = new cpoeDocument.vitalOrderItem()
                break
            case 'nursing':
                orderItemObject = new cpoeDocument.nursingOrderItem()
                break
            case 'patient movement':
                orderItemObject = new cpoeDocument.patientMovementOrder()
                break
            case 'pharmacy':
                if (document.isFieldFilled(listItem.orderSubCategory) && document.isFieldFilled(listItem.orderItems.type) && listItem.orderSubCategory.toLowerCase() == 'op' && listItem.orderItems.type.toLowerCase() == 'complex') {
                    orderItemObject = new cpoeDocument.opPharmacyOrder()
                    orderItemObject.type = listItem.type
                    orderItemObject.opPharmacyItems = []
                    orderItemObject.complexPharmacyItems = []
                    // dummy drugId to avoid validation error
                    orderItemObject.drugId = listItem.orderItems.complexPharmacyItems[0].drugId;
                    listItem.orderItems.complexPharmacyItems.forEach(function (drug, loc) {
                        var drugItem = new cpoeDocument.complexDrugList(drug)
                        // drugItem = Object.assign(drugItem, drug)
                        // console.log(drugItem)
                        drugItem.validate(function (err) {
                            if (err) {
                                ValidationError = err
                                log("error:" + err)
                                document.sendValidationError(ValidationError, res)
                            } else if (loc == listItem.orderItems.complexPharmacyItems.length - 1) {
                                var Item = JSON.stringify(drugItem)
                                orderItemObject.complexPharmacyItems[loc] = JSON.parse(Item)
                            } else {
                                var Item = JSON.stringify(drugItem)
                                orderItemObject.complexPharmacyItems[loc] = JSON.parse(Item)
                            }
                        })
                    })
                } else if (document.isFieldFilled(listItem.orderSubCategory) && document.isFieldFilled(listItem.orderItems.type) && listItem.orderSubCategory.toLowerCase() == 'op' && listItem.orderItems.type.toLowerCase() == 'dosage') {
                    orderItemObject = new cpoeDocument.opPharmacyOrder()
                    orderItemObject.type = listItem.type
                    orderItemObject.opPharmacyItems = []
                    orderItemObject.complexPharmacyItems = []
                    var drug = listItem.orderItems.opPharmacyItems[0]
                    var drugItem = new cpoeDocument.opPharmacyItem()
                    drugItem = Object.assign(drugItem, drug)
                    // console.log(drugItem)
                    drugItem.validate(function (err) {
                        if (err) {
                            ValidationError = err
                            log(err)
                            document.sendValidationError(err, res)
                        } else {
                            orderItemObject.opPharmacyItems[0] = drugItem
                            orderItemObject.drugId = orderItemObject.opPharmacyItems[0].drugId;

                        }
                    })
                } else if (document.isFieldFilled(listItem.orderSubCategory) && document.isFieldFilled(listItem.orderItems.type) && listItem.orderSubCategory.toLowerCase() == 'ip' && listItem.orderItems.type.toLowerCase() == 'complex') {
                    orderItemObject = new cpoeDocument.ipPharmacyOrder()
                    orderItemObject._id = uuid.v4()
                    orderItemObject.type = listItem.orderItems.type
                    orderItemObject.drugId = listItem.orderItems.complexPharmacyItems[0].drugId;
                    listItem.orderItems.complexPharmacyItems.forEach(function (drug, loc) {
                        var drugItem = new cpoeDocument.complexDrugList(drug)
                        // drugItem.drugName = drug.drugName
                        // drugItem.dosage = drug.dosage
                        // drugItem.route = drug.route
                        // drugItem.schedule = drug.schedule
                        // drugItem.duration = drug.duration
                        // drugItem.adminTimes = drug.adminTimes
                        // drugItem.thenAnd = drug.thenAnd;
                        drugItem.dosage_unit = (drug.dosage_unit !== undefined) ? drug.dosage_unit : null;
                        drugItem.validate(function (err) {
                            if (err) {
                                ValidationError = err
                                document.sendValidationError(err, res)
                                log(err)
                            } else {
                                var Item = JSON.stringify(drugItem)
                                orderItemObject.complexPharmacyItems[loc] = JSON.parse(Item)
                                orderItemObject.priority = listItem.orderItems.priority
                                orderItemObject.instruction = listItem.orderItems.instruction
                                orderItemObject.prn = listItem.orderItems.prn
                                orderItemObject.comment = listItem.orderItems.comment
                                orderItemObject.pediatricDose = listItem.orderItems.pediatricDose
                            }
                        })
                    })
                } else if (document.isFieldFilled(listItem.orderSubCategory) && document.isFieldFilled(listItem.orderItems.type) && listItem.orderSubCategory.toLowerCase() == 'ip' && listItem.orderItems.type.toLowerCase() == 'dosage') {
                    orderItemObject = new cpoeDocument.ipPharmacyOrder()
                    var drug = listItem.orderItems.ipPharmacyItems[0]
                    orderItemObject.drugId = listItem.orderItems.ipPharmacyItems[0].drugId
                    var drugItem = new cpoeDocument.ipPharmacyItem()
                    drugItem.drugId = drug.drugId;
                    drugItem.drugName = drug.drugName
                    drugItem.drugGenericName = drug.drugGenericName
                    drugItem.dosage = drug.dosage;
                    drugItem.dosage_unit = (drug.dosage_unit !== undefined) ? drug.dosage_unit : null;
                    drugItem.schedule = drug.schedule
                    drugItem.route = drug.route
                    drugItem.startDate = drug.startDate
                    drugItem.daysOfSupply = drug.daysOfSupply
                    drugItem.validate(function (err) {
                        if (err) {
                            ValidationError = err
                            log(err)
                            document.sendValidationError(err, res)
                        } else {
                            orderItemObject._id = uuid.v4()
                            orderItemObject.type = listItem.orderItems.type
                            orderItemObject.ipPharmacyItems[0] = drug
                            orderItemObject.priority = listItem.orderItems.priority
                            orderItemObject.instruction = listItem.orderItems.instruction
                            orderItemObject.prn = listItem.orderItems.prn
                            orderItemObject.comment = listItem.orderItems.comment
                            orderItemObject.pediatricDose = listItem.orderItems.pediatricDose
                            orderItemObject.validate(function (err) {
                                if (err) {
                                    log("Drugs" + orderItemObject.drugId)
                                    ValidationError = err
                                    log(err)
                                    document.sendValidationError(err, res)
                                }
                            })
                        }
                    })
                } else if (document.isFieldFilled(listItem.orderSubCategory) && listItem.orderSubCategory.toLowerCase() == 'iv') {
                    orderItemObject = new cpoeDocument.ivPharmacyOrder()
                } else {
                    ValidationError = 'Invalid Inputs'
                    document.sendValidationError(ValidationError, res)
                }
                break
            case 'rehab':
                orderItemObject = new cpoeDocument.rehabOrderItem()
                break
            default:
                console.log('in default................')
                orderItemObject = null
        }

        if (!ValidationError) {
            generateOrderSet(orderItemObject, listItem, orderListItem, orderSet, data, index, res)
        } else {
            log("order set validation error" + ValidationError)
        }
    })
}

module.exports.updateOrderSet = function (data, res) {
    var update = {
        updated_by: data.userId,
        updated_at: Date.now(),
        ordersList: data.ordersList
    }
    cpoeDocument.packageOrderSet.findOneAndUpdate({ _id: data._id, created_by: data.userId }, update, { upsert: true }, function (err, setResult) {
        if (err) {
            // log(err)
            document.sendResponse(err, 405, 'error', 'none', res)
        } else if (setResult) {
            // log(setResult)
            document.sendResponse('', 200, 'Order List updated', '', res)
        } else {
            document.sendResponse('Records not found', 404, 'error', 'none', res)
        }
    });
}

module.exports.getAllOrderSet = function (userId, res) {
    cpoeDocument.packageOrderSet.find({
        isPackage: false,
        $or: [{ created_by: userId }, { createdBy: userId }, { recordType: { $ne: 'Local Order' } }]
    }, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
        } else {
            document.sendResponse('', 200, 'Result found', result, res)
        }
    })
}

module.exports.getAllPackageOrders = function (userId, res) {
    cpoeDocument.packageOrderSet.find({
        isPackage: true,
        $or: [{ created_by: userId }, { createdBy: userId }, { recordType: { $ne: 'Local Order' } }]
    }, function (err, result) {
        if (err) {
            document.sendResponse(err, 405, 'error', 'none', res)
        } else if (result) {
            document.sendResponse('', 200, 'Result found', result, res)
        } else {
            document.sendResponse('', 200, 'Result found', [], res)
        }
    })
}

module.exports.getOrderSetDetails = function (setId, res) {
    // console.log(setId)
    cpoeDocument.packageOrderSet.find({
        _id: setId
    }, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
        } else if (result) {
            // console.log(result)
            document.sendResponse('', 200, 'Result found', result, res)
        } else {
            result = []
            document.sendResponse('Records not found', 404, 'error', result, res)
        }
    })
}

module.exports.getAllOrderSetByUser = function (userId, res) {
    cpoeDocument.packageOrderSet.find({
        isPackage: false,
        created_by: userId
    }, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
        } else {
            document.sendResponse('', 200, 'Result found', result, res)
        }
    })
}
module.exports.getAllPackageOrdersByUser = function (userId, res) {
    cpoeDocument.packageOrderSet.find({
        isPackage: true,
        created_by: userId
    }, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
        } else {
            document.sendResponse('', 200, 'Result found', result, res)
        }
    })
}
module.exports.placeOrderSet = function (data, res) {
    placeOrderSet(data, res)
}
module.exports.placePackageOrderSet = function (data, setId, res) {
    cpoeDocument.packageOrderSet.findOne({
        _id: setId
    }, 'ordersList', function (err, packageSet) {
        if (err) {
            document.sendResponse('Records not found', 404, 'error', 'none', res)
        } else if (packageSet) {
            // console.log(packageSet)
            data.ordersList = packageSet.ordersList
            placeOrderSet(data, res)
        } else {
            document.sendResponse('Records not found', 404, 'error', 'none', res)
        }
    })
}

addRecordToVisit = function (visitId, records, res) {
    log('Entered in cpoe model to add record to visit', {
        level: LOG_DEBUG
    })
    // get visit
    documentObject.Visit.findById({
        _id: visitId
    }, function (err, visit) {
        if (err) {
            log('Error in getting visit' + err, {
                level: LOG_ERR
            })
            res.send(500)
        } else {
            if (document.isFieldFilled(visit)) {
                if (!visit.cpoeOrders)
                    visit.cpoeOrders = []
                visit.cpoeOrders = visit.cpoeOrders.concat(records)
                // save the visit
                visit.save(function (err) {
                    if (err) {
                        log('Error in saving a visit' + err, {
                            level: LOG_ERR
                        })
                        if (res)
                            res.send(500)
                    } else {
                        // log("record added to visit")
                        log('Successfully saved visit', {
                            level: LOG_INFO
                        })
                        if (res)
                            res.send(200)
                    }
                })
            } else {
                log('invalid visitId')
                var response = {
                    '_status': 'invalid visit Id'
                }
                res.send(response)
            }
        }
    })
}
var placeCpoeOrder = function (orderToCreate, cpoeOrderItem, res, callback) {
    cpoeOrderItem._id = uuid.v4()
    cpoeOrderItem.cpoeOrderId = orderToCreate._id
    cpoeOrderItem.validate(function (err) {
        if (err) {
            var ValidationError = err
            document.sendValidationError(ValidationError, res)
        } else {
            log('placing cpoe order')
            orderToCreate.orderItems = JSON.parse(JSON.stringify(cpoeOrderItem))
            orderToCreate.save(function (err, result) {
                if (err) {
                    log(err)
                    document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                } else {
                    var resObj = {
                        'orderId': result._id
                    }
                    document.sendResponse('none', 200, 'orders created', resObj, res)
                    if (callback != undefined) {
                        callback(null, result);
                    }

                }
            })
        }
    })
}
var placeOpPharmacyOrder = function (data, res, isNonHospital) {
    var orderItem = data.orderItems
    var currentTime = new Date().getTime();
    if (orderItem.type.toLowerCase() == 'complex') {
        var orderId = uuid.v4();
        orderItem.complexPharmacyItems.forEach(function (drug, index) {
            var orderToCreate = new cpoeDocument.CpoeOrder()
            orderToCreate._id = uuid.v4();
            //orderToCreate.doctorId = data.doctorId
            orderToCreate.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
            orderToCreate.patientId = data.patientId
            orderToCreate.visitId = data.visitId
            orderToCreate.orderCategory = data.orderCategory
            orderToCreate.orderSubCategory = data.orderSubCategory
            orderToCreate.orderItems = data.orderItems
            orderToCreate.isFavorite = false
            orderToCreate.orderStatus = 'unsigned'
            orderToCreate.orderDate = currentTime
            orderToCreate.serviceCode = data.serviceCode
            orderToCreate.orderingDoctorName = data.orderingDoctorName
            orderToCreate.patientName = data.patientName
            orderToCreate.orderGroup = orderToCreate.patientId + ":" + currentTime;
            orderToCreate.duplicateChecked = data.duplicateChecked;
            orderToCreate.reasonToSkipDuplicate = data.reasonToSkipDuplicate;
            orderToCreate.activityLog = data.activityLog;
            orderToCreate.duplicateOrders = data.duplicateOrders;
            var opPharmacyOrder = (isNonHospital ? new cpoeDocument.nonHospitalPharmacyOrderItem() : new cpoeDocument.opPharmacyOrder())
            opPharmacyOrder._id = orderToCreate._id
            opPharmacyOrder.cpoeOrderId = orderId
            opPharmacyOrder.type = orderItem.type
            opPharmacyOrder.orderType = orderItem.orderType
            opPharmacyOrder.opPharmacyItems = []
            opPharmacyOrder.complexPharmacyItems = []
            opPharmacyOrder.ItemCode = drug.ItemCode;
            var drugItem = new cpoeDocument.complexDrugList(drug)
            drugItem.dosage_unit = drug.dosage_unit || null;
            drugItem.quantity = drug.quantity || "0";
            drugItem.validate(function (err) {
                if (err) {
                    log(err)
                    document.sendValidationError(err, res)
                } else {
                    var Item = JSON.stringify(drugItem)
                    opPharmacyOrder.complexPharmacyItems[0] = JSON.parse(Item)
                    opPharmacyOrder.priority = orderItem.priority
                    opPharmacyOrder.instruction = orderItem.instruction
                    opPharmacyOrder.prn = orderItem.prn
                    opPharmacyOrder.comment = orderItem.comment
                    opPharmacyOrder.priority_Id = orderItem.priority_Id;
                    if (util.isNullOrUndefined(drugItem.pickup_Id)) {
                        opPharmacyOrder.pickup_Id = 0;
                        opPharmacyOrder.pickup = 'Window';
                        opPharmacyOrder.complexPharmacyItems[0].pickup = 'Window';
                        opPharmacyOrder.complexPharmacyItems[0].pickup_Id = 0;
                    } else {
                        opPharmacyOrder.pickup_Id = drugItem.pickup_Id;
                        opPharmacyOrder.pickup = drugItem.pickup;
                    }
                    opPharmacyOrder.pediatricDose = orderItem.pediatricDose
                    opPharmacyOrder.drugId = opPharmacyOrder.complexPharmacyItems[0].drugId;
                    opPharmacyOrder.validate(function (err) {
                        if (err) {
                            document.sendValidationError(err, res)
                        } else {
                            log('placing complex op pharmcy order')
                            var Item = JSON.stringify(opPharmacyOrder)
                            orderToCreate.orderItems = JSON.parse(Item)
                            orderToCreate.orderName = orderToCreate.orderItems.complexPharmacyItems[0].drugName
                            orderToCreate.save(function (err, result) {
                                if (err) {
                                    log(err)
                                    document.sendResponse('unable to process please try again', 405, 'error', 'none', res)
                                } else if (index >= orderItem.complexPharmacyItems.length - 1) {
                                    log('saving order sending response')
                                    document.sendResponse('none', 200, 'Done', 'Order Created', res)
                                }
                            })
                        }
                    })
                }
            })
        })
    } else if (orderItem.type.toLowerCase() == 'dosage') {
        var orderToCreate = new cpoeDocument.CpoeOrder()
        orderToCreate._id = uuid.v4()
        //orderToCreate.doctorId = data.doctorId
        orderToCreate.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
        orderToCreate.patientId = data.patientId
        orderToCreate.visitId = data.visitId
        orderToCreate.orderCategory = data.orderCategory
        orderToCreate.orderSubCategory = data.orderSubCategory
        orderToCreate.orderItems = data.orderItems
        orderToCreate.isFavorite = false
        orderToCreate.orderStatus = 'unsigned'
        orderToCreate.orderDate = currentTime
        orderToCreate.serviceCode = data.serviceCode
        orderToCreate.orderingDoctorName = data.orderingDoctorName
        orderToCreate.patientName = data.patientName
        orderToCreate.orderGroup = orderToCreate.patientId + ":" + currentTime;
        orderToCreate.duplicateChecked = data.duplicateChecked;
        orderToCreate.reasonToSkipDuplicate = data.reasonToSkipDuplicate;
        orderToCreate.activityLog = data.activityLog;
        orderToCreate.duplicateOrders = data.duplicateOrders;
        var drug = orderItem.opPharmacyItems[0]
        var drugItem = new cpoeDocument.opPharmacyItem(drug)
        orderToCreate.orderName = drugItem.drugName;
        drugItem.validate(function (err) {
            if (err) {
                log('............')
                document.sendValidationError(err, res)
            } else {
                var opPharmacyOrder = (isNonHospital ? new cpoeDocument.nonHospitalPharmacyOrderItem() : new cpoeDocument.opPharmacyOrder())
                opPharmacyOrder._id = orderToCreate._id
                opPharmacyOrder.cpoeOrderId = orderToCreate._id
                opPharmacyOrder.type = orderItem.type
                opPharmacyOrder.orderType = orderItem.orderType
                opPharmacyOrder.opPharmacyItems = []
                opPharmacyOrder.complexPharmacyItems = []
                opPharmacyOrder.opPharmacyItems[0] = drug
                opPharmacyOrder.priority = orderItem.priority
                opPharmacyOrder.priority_Id = orderItem.priority_Id;
                if (util.isNullOrUndefined(drugItem.pickup_Id)) {
                    opPharmacyOrder.pickup_Id = 0;
                    opPharmacyOrder.pickup = 'Window';
                    opPharmacyOrder.opPharmacyItems[0].pickup = 'Window';
                    opPharmacyOrder.opPharmacyItems[0].pickup_Id = 0;
                } else {
                    opPharmacyOrder.pickup_Id = drugItem.pickup_Id;
                    opPharmacyOrder.pickup = drugItem.pickup;
                }
                opPharmacyOrder.isConsumableOp = orderItem.isConsumableOp;
                opPharmacyOrder.instruction = orderItem.instruction
                opPharmacyOrder.prn = orderItem.prn
                opPharmacyOrder.comment = orderItem.comment
                opPharmacyOrder.pediatricDose = orderItem.pediatricDose
                opPharmacyOrder.drugId = opPharmacyOrder.opPharmacyItems[0].drugId;
                opPharmacyOrder.ItemCode = opPharmacyOrder.opPharmacyItems[0].ItemCode;
                opPharmacyOrder.validate(function (err) {
                    if (err) {
                        document.sendValidationError(err, res)
                    } else {
                        placeOrder(orderToCreate, opPharmacyOrder, res)
                    }
                })
            }
        })
    } else {
        res.status(409).send()
    }
}
module.exports.testConflictRecords = function (req, res) {
    var conflictRecord = new documentObject.ConflictRecord(req.body);
    conflictRecord._id = uuid.v4();
    conflictRecord.save(function (err) {
        if (err) {
            console.log(err);
            res.status(406).send(err);
        } else {
            res.status(200).send('done')
        }
    });

}

module.exports.getConflictRecords = function (req, res) {
    documentObject.ConflictRecord.find().sort({
        timestamp: -1
    }).exec(function (err, results) {
        if (err) {
            res.status(406).send(err);
        } else {
            res.status(200).send(results);
        }
    })
}
var placeIpPharmacyOrder = function (data, res) {
    var orderItem = data.orderItems
    var currentTime = new Date().getTime();
    if (orderItem.type.toLowerCase() == 'complex') {
        var orderId = uuid.v4();
        orderItem.complexPharmacyItems.forEach(function (drug, index) {

            var orderToCreate = new cpoeDocument.CpoeOrder()
            orderToCreate._id = uuid.v4();
            // //orderToCreate.doctorId = data.doctorId
            orderToCreate.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
            orderToCreate.patientId = data.patientId
            orderToCreate.visitId = data.visitId
            orderToCreate.orderCategory = data.orderCategory
            orderToCreate.orderSubCategory = data.orderSubCategory
            orderToCreate.orderItems = data.orderItems
            orderToCreate.isFavorite = false
            orderToCreate.orderStatus = 'unsigned'
            orderToCreate.orderDate = currentTime
            orderToCreate.serviceCode = data.serviceCode
            orderToCreate.orderingDoctorName = data.orderingDoctorName
            orderToCreate.patientName = data.patientName
            orderToCreate.orderGroup = orderToCreate.patientId + ":" + currentTime;
            orderToCreate.duplicateChecked = data.duplicateChecked;
            orderToCreate.reasonToSkipDuplicate = data.reasonToSkipDuplicate;
            orderToCreate.activityLog = data.activityLog;
            orderToCreate.duplicateOrders = data.duplicateOrders;
            var ipPharmacyOrder = new cpoeDocument.ipPharmacyOrder()
            ipPharmacyOrder._id = orderToCreate._id
            ipPharmacyOrder.cpoeOrderId = orderId
            ipPharmacyOrder.type = orderItem.type

            var drugItem = new cpoeDocument.complexDrugList(drug)
            drugItem.dosage_unit = drug.dosage_unit || null;
            drugItem.quantity = drug.quantity || "0";
            drugItem.validate(function (err) {
                if (err) {
                    log(err)
                    document.sendValidationError(err, res)
                } else {
                    var Item = JSON.stringify(drugItem)
                    ipPharmacyOrder.complexPharmacyItems[0] = JSON.parse(Item)
                    ipPharmacyOrder.priority = orderItem.priority
                    ipPharmacyOrder.priority_Id = orderItem.priority_Id;
                    if (util.isNullOrUndefined(drugItem.pickup_Id)) {
                        ipPharmacyOrder.pickup_Id = 3;
                        ipPharmacyOrder.pickup = 'Ward';
                        ipPharmacyOrder.complexPharmacyItems[0].pickup = 'Ward';
                        ipPharmacyOrder.complexPharmacyItems[0].pickup_Id = 3;
                    } else {
                        ipPharmacyOrder.pickup_Id = drugItem.pickup_Id;
                        ipPharmacyOrder.pickup = drugItem.pickup;
                    }
                    ipPharmacyOrder.instruction = orderItem.instruction
                    ipPharmacyOrder.prn = orderItem.prn
                    ipPharmacyOrder.dischargeMedication = orderItem.dischargeMedication;
                    ipPharmacyOrder.comment = orderItem.comment
                    ipPharmacyOrder.pediatricDose = orderItem.pediatricDose
                    ipPharmacyOrder.orderType = orderItem.orderType
                    ipPharmacyOrder.drugId = ipPharmacyOrder.complexPharmacyItems[0].drugId;
                    ipPharmacyOrder.ItemCode = ipPharmacyOrder.complexPharmacyItems[0].ItemCode;

                    ipPharmacyOrder.validate(function (err) {
                        if (err) {
                            document.sendValidationError(err, res)
                        } else {
                            log('placing complex ip pharmcy order')
                            var Item = JSON.stringify(ipPharmacyOrder)
                            orderToCreate.orderItems = JSON.parse(Item)
                            // log(orderToCreate.orderItems.complexPharmacyItems[0])
                            orderToCreate.orderName = orderToCreate.orderItems.complexPharmacyItems[0].drugName
                            orderToCreate.save(function (err, result) {
                                if (err) {
                                    log(err)
                                    document.sendResponse('unable to process please try again', 405, 'error', err, res)
                                } else if (index >= orderItem.complexPharmacyItems.length - 1) {
                                    document.sendResponse('none', 200, 'Order Created', 'orders created', res)
                                }
                            })
                        }
                    })
                }
            })
        })
    } else if (orderItem.type.toLowerCase() == 'dosage') {
        // console.log(orderItem)
        var orderToCreate = new cpoeDocument.CpoeOrder()
        orderToCreate._id = uuid.v4()
        //orderToCreate.doctorId = data.doctorId
        orderToCreate.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
        orderToCreate.patientId = data.patientId
        orderToCreate.visitId = data.visitId
        orderToCreate.orderCategory = data.orderCategory
        orderToCreate.orderSubCategory = data.orderSubCategory
        orderToCreate.orderItems = data.orderItems
        orderToCreate.isFavorite = false
        orderToCreate.orderStatus = 'unsigned'
        orderToCreate.orderDate = currentTime
        orderToCreate.serviceCode = data.serviceCode
        orderToCreate.orderingDoctorName = data.orderingDoctorName
        orderToCreate.patientName = data.patientName
        orderToCreate.orderGroup = orderToCreate.patientId + ":" + currentTime;
        orderToCreate.duplicateChecked = data.duplicateChecked;
        orderToCreate.reasonToSkipDuplicate = data.reasonToSkipDuplicate;
        orderToCreate.activityLog = data.activityLog;
        orderToCreate.duplicateOrders = data.duplicateOrders;
        var drug = orderItem.ipPharmacyItems[0]
        var drugItem = new cpoeDocument.ipPharmacyItem(drug)
        orderToCreate.orderName = drugItem.drugName
        drugItem.validate(function (err) {
            if (err) {
                document.sendValidationError(err, res)
            } else {
                var ipPharmacyOrder = new cpoeDocument.ipPharmacyOrder()
                ipPharmacyOrder._id = uuid.v4()
                ipPharmacyOrder.cpoeOrderId = orderToCreate._id
                ipPharmacyOrder.type = orderItem.type
                ipPharmacyOrder.ipPharmacyItems[0] = drug
                ipPharmacyOrder.priority = orderItem.priority
                ipPharmacyOrder.priority_Id = orderItem.priority_Id;
                if (util.isNullOrUndefined(drugItem.pickup_Id)) {
                    ipPharmacyOrder.pickup_Id = 3;
                    ipPharmacyOrder.pickup = 'Ward';
                    ipPharmacyOrder.ipPharmacyItems[0].pickup = 'Ward';
                    ipPharmacyOrder.ipPharmacyItems[0].pickup_Id = 3;
                } else {
                    ipPharmacyOrder.pickup_Id = drugItem.pickup_Id;
                    ipPharmacyOrder.pickup = drugItem.pickup;
                }
                ipPharmacyOrder.instruction = orderItem.instruction
                ipPharmacyOrder.isDischargeMedication = orderItem.isDischargeMedication
                ipPharmacyOrder.isConsumableIp = orderItem.isConsumableIp;
                ipPharmacyOrder.prn = orderItem.prn
                ipPharmacyOrder.comment = orderItem.comment
                ipPharmacyOrder.orderType = orderItem.orderType
                ipPharmacyOrder.pediatricDose = orderItem.pediatricDose
                ipPharmacyOrder.drugId = ipPharmacyOrder.ipPharmacyItems[0].drugId;
                ipPharmacyOrder.ItemCode = ipPharmacyOrder.ipPharmacyItems[0].ItemCode;
                ipPharmacyOrder.validate(function (err) {
                    if (err) {
                        document.sendValidationError(err, res)
                    } else {
                        placeOrder(orderToCreate, ipPharmacyOrder, res)
                    }
                })
            }
        })
    } else {
        res.status(409).send()
    }
}
var checkDuplicateMedication = function (order, patientId, duplicateChecked, updateRecord, callback) {
    var data = order.ordetItems;
    if (duplicateChecked == true) {
        var duplicates = [];
        console.log('executing update')
        // updateRecord is true at the time of orderSign
        if (updateRecord) {
            var update = {};
            if (typeof order.onBehalf == 'object'
                && order.onBehalf.orderStatus.toLowerCase().indexOf('unsigned') > -1
                && order.userId != order.onBehalf.doctorId
            ) {
                update.onBehalf = order.onBehalf;
                update.onBehalf.duplicateOrders = order.duplicateOrders ? order.duplicateOrders : [];
                update.onBehalf.duplicateChecked = order.onBehalf.duplicateChecked == undefined ? false : order.onBehalf.duplicateChecked;
                update.onBehalf.reasonToSkipDuplicate = order.reasonToSkipDuplicate;
                duplicates = order.onBehalf.duplicateChecked == undefined ? order.duplicateOrders :
                    (order.onBehalf.duplicateChecked ? [] : order.duplicateOrders);
            } else {
                update.duplicateOrders = order.duplicateOrders ? order.duplicateOrders : [];
                update.duplicateChecked = duplicateChecked;
                update.reasonToSkipDuplicate = order.reasonToSkipDuplicate;
            }
            cpoeDocument.CpoeOrder.update({ _id: order._id }, update, { new: true, upsert: true }, function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('duplicate order reason updated........')
                }
            })
        }
        callback(null, duplicates, []);
    } else {
        collectItemCodes(order, function (err, itemCodes) {
            // console.log(itemCodes);

            if (itemCodes.length > 0) {
                var duplicateResults = []
                var matchQuery = {
                    'isOverlapped': 1,
                }
                if (order.duplicateOrders) {
                    // to skip previously checked duplicate orders
                    tempDuplicateOrders = []
                    for (let i = 0; i < order.duplicateOrders.length; i++) {
                        tempDuplicateOrders.push(order.duplicateOrders[i]);
                    }
                    matchQuery.duplicateOrderId = { $nin: tempDuplicateOrders }
                }
                console.log(matchQuery);
                async.eachOf(itemCodes, function (item, key, callbackForEach) {
                    documentObject.Medication.aggregate([
                        {
                            $match: {
                                $or: [
                                    {
                                        'ItemCode': item.ItemCode,
                                        'patientId': patientId,
                                        'status': 'active'
                                    },
                                    {
                                        'Molecule_HIS_ID': item.Molecule_HIS_ID,
                                        'patientId': patientId,
                                        'status': 'active'
                                    }]
                            }
                        }, {
                            $lookup: {
                                from: "User",
                                localField: "orderBy",
                                foreignField: "userId",
                                as: "users"
                            }
                        }, {
                            $unwind: '$users'
                        },
                        {
                            $project: {
                                '_id': '$_id',
                                'ItemCode': '$ItemCode',
                                'duplicateOrderId': '$orderId',
                                'startDate': '$startDate',
                                'endDate': '$endDate',
                                'drugName': '$drugName',
                                'schedule': '$schedule',
                                'dosage': '$dosage',
                                'orderBy': '$users.firstName',
                                'visitId': '$visitId',
                                'orderId': item.orderId ? item.orderId : null,
                                // 'isOrder': false, bug of the day
                                'isOverlapped': {
                                    $cond: {
                                        if: {
                                            $or: [
                                                {
                                                    $and: [
                                                        { $lte: [item.startDate, '$endDate'] },
                                                        { $gte: [item.startDate, "$startDate"] }
                                                    ]

                                                }, {
                                                    $and: [
                                                        { $lte: [item.endDate, '$endDate'] },
                                                        { $gte: [item.endDate, "$startDate"] }
                                                    ]
                                                }, {
                                                    $eq: ['$endDate', null]
                                                }, {
                                                    $eq: ['$endDate', '']
                                                }
                                            ]
                                        },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            }
                        }, {
                            $match: matchQuery
                        }
                    ], function (err, overlappedResults) {
                        if (err) {
                            callbackForEach(err, null)
                        } else {
                            duplicateResults = _.concat(duplicateResults, overlappedResults);
                            callbackForEach(null, duplicateResults)
                        }
                    })
                }, function (err, results) {
                    if (err) {
                        callback(err, [], itemCodes)
                    } else {
                        // console.log(results)
                        callback(null, duplicateResults, itemCodes)
                    }
                });
            } else {
                callback(null, [], itemCodes)
            }
            // callback(itemCodes)
        })
    }

}
var collectItemCodes = function (order, callback) {
    var data = order.orderItems;
    var itemCodes = [];
    // console.log('datatype:'+data.type);
    if (data.type != undefined) {
        switch (data.type) {
            case 'dosage':
                var temp = {};
                if (data.ipPharmacyItems) {
                    temp.ItemCode = data.ipPharmacyItems[0].ItemCode;
                    temp.drugName = data.ipPharmacyItems[0].drugName;
                    temp.schedule = data.ipPharmacyItems[0].schedule;
                    temp.Molecule_HIS_ID = data.ipPharmacyItems[0].Molecule_HIS_ID;
                    temp.startDate = data.ipPharmacyItems[0].startDate;
                    temp.endDate = data.ipPharmacyItems[0].endDate;
                } else if (data.opPharmacyItems) {
                    temp.Molecule_HIS_ID = data.opPharmacyItems[0].Molecule_HIS_ID;
                    temp.drugName = data.opPharmacyItems[0].drugName;
                    temp.schedule = data.opPharmacyItems[0].schedule;
                    temp.ItemCode = data.opPharmacyItems[0].ItemCode;
                    temp.startDate = data.opPharmacyItems[0].startDate;
                    temp.endDate = data.opPharmacyItems[0].endDate;
                } else {
                    temp.ItemCode = data.SOLItemCode;
                    temp.drugName = data.solution;
                    temp.schedule = data.schedule;
                    temp.Molecule_HIS_ID = data.SOL_Molecule_HIS_ID;
                    temp.startDate = data.startDate;
                    temp.endDate = data.endDate;

                }
                temp.orderId = order._id ? order._id : null;
                temp.orderBy = '';
                temp.isOrder = true;
                itemCodes.push(temp)
                callback(null, itemCodes);
                break;
            case 'complex':
                _.forEach(data.complexPharmacyItems, function (complexItem) {
                    var temp = {}
                    temp.ItemCode = complexItem.ItemCode;
                    temp.drugName = complexItem.drugName;
                    temp.schedule = complexItem.schedule;
                    temp.Molecule_HIS_ID = complexItem.Molecule_HIS_ID;
                    temp.startDate = complexItem.startDate;
                    temp.endDate = complexItem.endDate;
                    temp.orderId = order._id ? order._id : null;
                    temp.orderBy = '';
                    temp.isOrder = true;
                    itemCodes.push(temp)
                })
                callback(null, itemCodes);
                break;
        }
    } else {
        // console.log('data type does not exist##########')
        callback(null, [])
    }
}
var checkDuplicatePharmacyOrder = function (data, patientId, callback) {
    var itemCodes = [];
    collectItemCodes(data, function (err, itemCodes) {
        _.forEach(itemCodes, function (item) {
            cpoeDocument.CpoeOrder.aggregate([
                {
                    $match: {
                        'orderCategory': 'pharmacy',
                        'patientId': patientId
                    }
                }, {
                    $project: {
                        '_id': '$_id',
                        'orderSubcategory': '$orderSubCategory',
                        'pharmacyItems': {
                            $cond: {
                                if: {
                                    $in: ['$orderSubCategory', ['ip', 'op', 'non hospital']]
                                },
                                then: {
                                    $concatArrays: [
                                        {
                                            $ifNull: ['$orderItems.opPharmacyItems', []]
                                        }, {
                                            $ifNull: ['$orderItems.ipPharmacyItems', []]
                                        },
                                        {
                                            $ifNull: ['$orderItems.complexPharmacyItems', []]
                                        }
                                    ]
                                },
                                else: '$orderItems'
                            }
                        }
                    }
                }, {
                    $unwind: '$pharmacyItems'
                }, {
                    $project: {
                        '_id': "$_id",
                        'orderSubCategory': '$orderSubcategory',
                        'startDate': '$pharmacyItems.startDate',
                        'endDate': '$pharmacyItems.endDate',
                        'ItemCode': {
                            $cond: { if: { $in: ['$orderSubcategory', ['iv']] }, then: '$pharmacyItems.SOLItemCode', else: '$pharmacyItems.ItemCode' }
                        }
                    }
                },
                {
                    $match: {
                        'ItemCode': item.itemCode
                    }
                },
                {
                    $project: {
                        '_id': '$_id',
                        'ItemCode': '$ItemCode',
                        'startDate': '$startDate',
                        'endDate': '$endDate',
                        'isOverlapped': {
                            $cond: { if: { $and: [{ $lte: [item.startDate, '$endDate'] }, { $gte: [item.startDate, "$startDate"] }] }, then: 1, else: 0 }
                        }
                    }
                }
                , {
                    $match: { 'isOverlapped': 1 }
                }
            ], function (err, results) {
                callback(results)
            })
        });
    })



}

var placeOrder = function (orderToCreate, orderItem, res) {
    log('in place cpoeorder')
    var Item = JSON.stringify(orderItem)
    orderToCreate.orderItems = JSON.parse(Item)
    orderToCreate.save(function (err, result) {
        if (err) {
            log(err)
            document.sendResponse(err, 405, 'error', 'none', res)
        } else {
            var response = {
                '_error_message': 'none',
                '_status_Code': 200,
                '_status': 'Done',
                'result': 'Orders created'
            }
            res.send(response)
        }
    })
}

var generateOrderSet = function (orderItemObject, listItem, orderListItem, orderSet, data, index, res) {

    orderItemObject = Object.assign(orderItemObject, listItem.orderItems)
    orderItemObject._id = uuid.v4()
    orderItemObject.validate(function (err) {
        if (err) {
            log(err)
            // log(orderItemObject)
            document.sendValidationError(err, res)
        } else {
            orderListItem.orderItems = Object.assign(orderItemObject, orderListItem.orderItems)
            var tempObj = JSON.stringify(orderListItem)
            orderSet.ordersList.push(JSON.parse(tempObj))
            if (index >= data.ordersList.length - 1) {
                orderSet.save(function (err, result) {
                    if (!err) {
                        var response = {
                            '_error_message': 'none',
                            '_status_Code': 200,
                            '_status': 'Order Set Created',
                            'result': 'none'
                        }
                        res.send(response)
                    } else {
                        log(err)
                        document.sendValidationError('invalid input', res)
                    }
                })
            }
        }
    })
}

// need to handle complex ipand op  pharmacy orders
var placeOrderSet = function (data, res) {
    var flag = true
    var size = data.ordersList.length
    data.ordersList.forEach(function (orderObject, index) {
        var cpoeOrder = new cpoeDocument.CpoeOrder()
        cpoeOrder._id = uuid.v4()
        // cpoeOrder.doctorId = data.doctorId
        cpoeOrder.userId = (document.isFieldFilled(data.userId)) ? data.userId : data.doctorId;
        cpoeOrder.patientId = data.patientId
        cpoeOrder.visitId = data.visitId
        cpoeOrder.orderingDoctorName = data.orderingDoctorName
        cpoeOrder.patientName = data.patientName
        cpoeOrder.orderDate = Date.now()
        cpoeOrder.orderStatus = 'unsigned'
        cpoeOrder.isFavorite = false
        cpoeOrder.orderName = ''
        cpoeOrder.orderName = orderObject.orderName
        cpoeOrder.orderCategory = orderObject.orderCategory
        cpoeOrder.orderSubCategory = orderObject.orderSubCategory
        cpoeOrder.orderItems = orderObject.orderItems
        cpoeOrder.serviceCode = orderObject.serviceCode
        cpoeOrder.serviceName = orderObject.serviceName
        cpoeOrder.validate(function (err, result) {
            if (err && flag) {
                flag = false
                document.sendValidationError(err, res)
            } else {
                cpoeOrder.save(function (err) {
                    if (err) {
                        log(err)
                    } else if (index >= size - 1 && flag) {
                        document.sendResponse('', 200, 'Order placed', 'Order placed', res)
                    }
                })
            }
        })
    })
}
function addDiscountAndSave(orderElement, myArray, callback) {
    if (document.isFieldFilled(myArray)) {
        for (var i = 0; i < myArray.length; i++) {
            if (myArray[i]._id === orderElement._id) {
                orderElement.discount = myArray[i].discount
            }
        }
    } else {
        orderElement.discount = 0
    }
    orderElement.save(function (err, result) {
        if (err) {
            callback(err);
        } else {
            callback();
        }
    })
}

function updateOrderStatus(orderElement, discounts, options, callback) {
    if (document.isFieldFilled(discounts)) {
        for (var i = 0; i < discounts.length; i++) {
            if (discounts[i]._id === orderElement._id) {
                orderElement.discount = discounts[i].discount
            }
        }
    } else {
        orderElement.discount = 0
    }
    orderElement.save(function (err) {
        if (err) {
            callback(err);
        } else {
            if (options.medicationStatus == true) {
                changeMedicationStatus(orderElement._id, orderElement.orderStatus);
            } else if (options.medication == true) {
                createMedicationRecord(orderElement);
            } else if (options.consult == true) {
                notificationModel.generateConsultNotification(orderElement);
            } else if (options.nursingTask == true) {
                createNursingTask(orderElement);
            }

            if (options.onBehalf == true) {
                generateOnBehalfNotification(orderElement)
            }
            callback();

        }
    })
}
var createNursingTask = function (order) {
    let ordereCategory = order.orderCategory.toLowerCase();
    var newTask = new documentObject.nursing_tasks();
    newTask._id = uuid.v4();
    if (ordereCategory == 'nursing') { // nursing order 
        newTask.Task = order.orderItems.order;
    } else if (ordereCategory == 'general') { // general order
        newTask.Task = order.orderItems.order;
    } else { // vital order     
        newTask.Task = order.orderItems.vitalSign;
    }
    newTask.PatientId = order.patientId;
    newTask.VisitId = order.visitId;
    newTask.Urgency = order.orderItems.urgency;
    newTask.Instruction = order.orderItems.instruction;
    newTask.CpoeOrderId = order._id;
    newTask.Comment = order.orderItems.comment;
    newTask.Created_By = order.userId;
    newTask.Created_At = order.orderDate;
    newTask.Schedule = order.orderItems.schedule;
    newTask.IsComplete = false;
    newTask.StartDate = order.orderItems.startDate;
    newTask.StopDate = order.orderItems.stopDate;
    newTask.IsError = false;
    newTask.save(function (err) {
        if (err) {
            console.log(err);
        }
    })
}
function signOrders(data, userResult, res) {
    cpoeDocument.CpoeOrder.find({
        _id: { $in: data.cpoeOrders },
        $or: [
            { orderStatus: 'unsigned' },
            { orderStatus: new RegExp("Requested", "i") },
            // { "onBehalf.orderStatus": { $regex: 'unsigned', $options: 'i' } }
        ]
    }).exec(function (err, result) {
        if (err) {
            document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
        } else if (document.isFieldFilled(result)) {
            var pharmacyOrders = {};
            async.eachSeries(result,
                function (orderElement, callback_each) {
                    var tempHistory = {};
                    tempHistory.action = 'sign';
                    tempHistory.userId = orderElement.userId;
                    tempHistory.timestamp = new Date();
                    var orderElementCategory = orderElement.orderCategory.toLowerCase();
                    // generate medication           
                    if (orderElementCategory == 'pharmacy'
                        && (orderElement.orderStatus.toLowerCase() == 'unsigned' || orderElement.orderStatus.toLowerCase().indexOf('update') > -1)) {
                        // console.log(!orderElement.orderItems.isConsumableIp + ":" + !orderElement.orderItems.isConsumableOp)
                        orderElement.duplicateChecked = true;
                        if (!orderElement.orderItems.isConsumableIp && !orderElement.orderItems.isConsumableOp) {
                            createMedicationRecord(orderElement);
                        }
                    }

                    // orderStatus
                    var orderStatus = (orderElement.orderStatus !== undefined) ? orderElement.orderStatus : '';
                    orderElement.orderStatus = 'pending'
                    orderElement.signedBy = userResult.userId
                    // check for on behalf order 
                    if (document.isFieldFilled(data.type) && data.type === "onBehalf") {
                        orderElement.onBehalf = data.payload
                        orderElement.onBehalf.orderStatus = 'unsigned'
                        if (orderElement.onBehalf.doctorId)
                            generateOnBehalfNotification(orderElement);
                        else {
                            log("no doctorId in on behalf order ")
                        }
                    }
                    if (orderElementCategory == 'consult') {
                        if (orderElement.orderItems.consult_completion === undefined)
                            orderElement.orderItems.consult_completion = false;
                        if (!orderElement.orderItems.consult_completion) {
                            data.discounts.discount = 0;
                            notificationModel.generateConsultNotification(orderElement);
                            integrationModel.placeOrderToHIS(orderElement)
                        } else {
                            orderElement.orderStatus = 'completed';
                            documentObject.Visit.update(
                                { _id: orderElement.visitId },
                                { $set: { isActive: false } });
                        }
                    }

                    if (orderElementCategory == 'pharmacy') {
                        orderElement.orderStatus = 'active';
                    }

                    if (orderStatus.toLowerCase().indexOf('cancel') != -1) {
                        tempHistory.action = 'cancel';
                        orderElement.orderStatus = 'cancelled';
                        orderElement.canCancel = false;
                        orderElement.canDiscontinue = false;
                        orderElement.canEdit = false;
                        if (orderElementCategory == 'pharmacy') {
                            changeMedicationStatus(orderElement._id, 'cancelled')
                        }
                    }
                    if (orderStatus.toLowerCase().indexOf('update') != -1) {
                        tempHistory.action = 'update';
                        orderElement.orderStatus = 'active';
                        orderElement.canCancel = true;
                        orderElement.canDiscontinue = true;
                        orderElement.canEdit = true;
                        orderElement.isUpdated = true;
                    }


                    if (orderStatus.toLowerCase().indexOf('discontinue') != -1) {
                        orderElement.orderStatus = orderElement.isScheduledDiscontinue ? 'discontinue scheduled' : 'discontinued';
                        tempHistory.action = orderElement.orderStatus;
                        orderElement.canCancel = false;
                        orderElement.canDiscontinue = false;
                        orderElement.canEdit = false;
                        if (orderElementCategory == 'pharmacy') {
                            changeMedicationStatus(orderElement._id, orderElement.orderStatus)
                        }
                    }

                    if (orderElement.activityLog) {
                        if (orderElement.activityLog.length < 1) {
                            orderElement.activityLog = [];// to avoid problem in existing data
                        }
                        orderElement.activityLog.push(tempHistory);
                    }
                    addDiscountAndSave(orderElement, data.discounts, function (err) {
                        if (err) {
                            callback_each(err);
                        } else {
                            // order integration call to rabitmq
                            if (orderElementCategory !== 'pharmacy' && orderElementCategory !== 'consult')
                                integrationModel.placeOrderToHIS(orderElement);
                            else if (orderElementCategory !== 'consult') {
                                orderElement.visitId = orderElement.visitId.replace(/\s+/g, '');
                                if (pharmacyOrders[orderElement.visitId] === undefined) {
                                    pharmacyOrders[orderElement.visitId] = {
                                        'Identifier': {},
                                        'orders': [],
                                        'orderCategory': 'pharmacy'
                                    };
                                }
                                pharmacyOrders[orderElement.visitId].orders.push(orderElement);
                            }
                            callback_each();
                        }
                    });

                }, function (err) {
                    if (err) {
                        //main_callback();
                        document.sendResponse('Error while processing', 501, 'error', err, res)
                    } else if (pharmacyOrders) {
                        async.forEachOf(pharmacyOrders,
                            function (eachOrder, visitId, callback_foreach) {
                                documentObject.Visit.aggregate([
                                    {
                                        "$match": { _id: visitId }
                                    },
                                    {
                                        $lookup: {
                                            from: "patients",
                                            localField: "patientId",
                                            foreignField: "_id",
                                            as: "patient"
                                        }
                                    },
                                    { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
                                    {
                                        $project: {
                                            "mrn": "$patient.mrn",
                                            "HIS_PatientId": "$patient.HIS_PatientId",
                                            "nric": "$patient.nric",
                                            "unitId": "$patient.unitId",
                                            "prefix": "$patient.prefix",
                                            'name': "$patient.name",
                                            "unitId": "$patient.unitId",
                                            "GenderCode": "$patient.GenderCode",
                                            "residentialCountry": "$patient.residentialCountry",
                                            "mobile": "$patient.mobile",
                                            "dob": "$patient.dob",
                                            "visitRecords": [{
                                                "OPD_IPD_ID": "$OPD_IPD_ID",
                                                "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                                "OPD_IPD": "$OPD_IPD"
                                            }]
                                        }
                                    }
                                ], function (err, visitInfo) {
                                    if (err) {
                                        callback_foreach(err);
                                    } else if (visitInfo.length) {
                                        eachOrder.Identifier = visitInfo[0];
                                        eachOrder.mimsResponse = data.mimsResponse;
                                        eachOrder.isMimsReviewed = data.isMimsReviewed;
                                        //Replace DoctorId In case of On Behalf 
                                        if (data.type == "onBehalf") {
                                            documentObject.User.findOne({ _id: data.payload.doctorId }, (err, user) => {
                                                if (err)
                                                    log("Error while fetching data")
                                                else if (!user)
                                                    log("User not found")
                                                else {
                                                    eachOrder.Identifier.visitRecords[0].HIS_Doctor_ID = user.hisUserId;
                                                }
                                            })
                                        }

                                        var opta = {
                                            'exchange': 'cpoeOrders',
                                            'key': 'pharmacy',
                                            'queue': 'pharmacy',
                                            'data': eachOrder
                                        };
                                        integrationModel.dataTransfertoHIS(opta, function (callback_result) {
                                            if (callback_result._status == "done") {
                                                //Mark Orders sign otherwise not
                                            }
                                        });
                                        callback_foreach();
                                    } else {
                                        var response = { 'errror': 'no visit found' }
                                        console.log("Failed to transfer into HIS");
                                        callback_foreach(response);
                                    }
                                });
                            }, function (err) {
                                if (err) {
                                    console.log('#####pharmacy order to his', err)
                                    //main_callback();
                                } else {
                                    //main_callback();
                                    console.log('#####pharmacy order to his', 'done')
                                }
                            });
                    } else {
                        //main_callback();
                    }

                })
        } else {
            //main_callback();
        }

        // verify on behalf orders
        signOnBehalfOrders(data, function (err) {
            if (err) {
                //main_callback();
                document.sendResponse('Invalid Inputs', 406, 'error', err, res)
            } else {
                //main_callback();
                document.sendResponse('none', 200, 'done', 'Orders signed', res);
            }
        })


    });
}

function signOrdersParallel(data, userResult, res) {
    // 
    console.log("User Result: " + JSON.stringify(userResult));
    async.parallel([
        // sign self orders
        function (main_callback) {
            cpoeDocument.CpoeOrder.find({
                _id: { $in: data.cpoeOrders },
                $or: [
                    { orderStatus: 'unsigned' },
                    { orderStatus: new RegExp("Requested", "i") },
                    // { "onBehalf.orderStatus": { $regex: 'unsigned', $options: 'i' } }
                ]
            }).exec(function (err, result) {
                if (err) {
                    main_callback(err);
                    // document.sendResponse('Error while reading orders please try again', 405, 'error', 'none', res)
                } else if (document.isFieldFilled(result)) {
                    var pharmacyOrders = {};

                    // determine order status and triggers
                    async.eachSeries(result,

                        function (orderElement, callback_each) {
                            var options = {
                                'medication': false,
                                'onBehalf': false,
                                'consult': false,
                                'medicationStatus': false,
                                'nursingTask': false
                            }
                            var tempHistory = {};
                            tempHistory.action = 'sign';
                            tempHistory.userId = orderElement.userId;
                            tempHistory.timestamp = new Date();

                            var orderElementCategory = orderElement.orderCategory.toLowerCase();
                            // create medication item or update if already exist        
                            if (orderElementCategory == 'pharmacy'
                                && (orderElement.orderStatus.toLowerCase() == 'unsigned' || orderElement.orderStatus.toLowerCase().indexOf('update') > -1)) {
                                // console.log(!orderElement.orderItems.isConsumableIp + ":" + !orderElement.orderItems.isConsumableOp)
                                orderElement.duplicateChecked = true;
                                if (!orderElement.orderItems.isConsumableIp && !orderElement.orderItems.isConsumableOp) {
                                    // createMedicationRecord(orderElement);
                                    options.medication = true;
                                }
                            }

                            // orderStatus of all orders after sign will pending by default                            
                            var orderStatus = (orderElement.orderStatus !== undefined) ? orderElement.orderStatus : '';
                            orderElement.orderStatus = 'pending'
                            orderElement.signedBy = userResult.userId
                            // onBehalf work flow
                            if (document.isFieldFilled(data.type) && data.type === "onBehalf") {
                                orderElement.onBehalf = data.payload
                                orderElement.onBehalf.orderStatus = 'unsigned'
                                if (orderElement.onBehalf.doctorId) {
                                    // generateOnBehalfNotification(orderElement);
                                    options.onBehalf = true;
                                } else {
                                    log("######### no doctorId in on behalf order ")
                                }
                            }
                            // consult order flow
                            if (orderElementCategory == 'consult') {
                                if (orderElement.orderItems.consult_completion === undefined)
                                    orderElement.orderItems.consult_completion = false;
                                if (!orderElement.orderItems.consult_completion) {
                                    data.discounts.discount = 0;
                                    // notificationModel.generateConsultNotification(orderElement);
                                    integrationModel.placeOrderToHIS(orderElement)
                                    options.consult = true;
                                } else {
                                    orderElement.orderStatus = 'completed';
                                    documentObject.Visit.update(
                                        { _id: orderElement.visitId },
                                        { $set: { isActive: false } });
                                }
                            } else if (orderElementCategory == 'pharmacy' || orderElementCategory == 'general') {
                                orderElement.orderStatus = 'active';
                            }
                            // change status actions cancelled, updated, discontinued
                            if (orderStatus.toLowerCase().indexOf('cancel') != -1) {
                                tempHistory.action = 'cancel';
                                orderElement.orderStatus = 'cancelled';
                                orderElement.canCancel = false;
                                orderElement.canDiscontinue = false;
                                orderElement.canEdit = false;
                                if (orderElementCategory == 'pharmacy') {
                                    // changeMedicationStatus(orderElement._id, 'cancelled')
                                    options.medicationStatus = true;
                                }
                            } else if (orderStatus.toLowerCase().indexOf('update') != -1) {
                                tempHistory.action = 'update';
                                orderElement.orderStatus = 'active';
                                orderElement.canCancel = true;
                                orderElement.canDiscontinue = true;
                                orderElement.canEdit = true;
                                orderElement.isUpdated = true;
                            } else if (orderStatus.toLowerCase().indexOf('discontinue') != -1) {
                                orderElement.orderStatus = orderElement.isScheduledDiscontinue ? 'discontinue scheduled' : 'discontinued';
                                tempHistory.action = orderElement.orderStatus;
                                orderElement.canCancel = false;
                                orderElement.canDiscontinue = false;
                                orderElement.canEdit = false;
                                if (orderElementCategory == 'pharmacy') {
                                    // changeMedicationStatus(orderElement._id, orderElement.orderStatus);
                                    options.medicationStatus = true;
                                }
                            }
                            // add current operation to activity log
                            if (orderElement.activityLog) {
                                if (orderElement.activityLog.length < 1) {
                                    orderElement.activityLog = [];// to avoid problem in existing data
                                }
                                orderElement.activityLog.push(tempHistory);
                            }
                            // Mark Nursing task work flow
                            if (orderElementCategory == 'general' || orderElementCategory == 'nursing' || orderElementCategory == 'vital') {
                                options.nursingTask = true;
                            }

                            updateOrderStatus(orderElement, data.discounts, options, function (err) {
                                if (err) {
                                    callback_each(err);
                                } else {
                                    // order integration call to rabitmq
                                    if (orderElementCategory !== 'pharmacy' && orderElementCategory !== 'consult')
                                        integrationModel.placeOrderToHIS(orderElement);
                                    else if (orderElementCategory !== 'consult') {
                                        orderElement.visitId = orderElement.visitId.replace(/\s+/g, '');
                                        if (pharmacyOrders[orderElement.visitId] === undefined) {
                                            pharmacyOrders[orderElement.visitId] = {
                                                'Identifier': {},
                                                'orders': [],
                                                'orderCategory': 'pharmacy'
                                            };
                                        }
                                        pharmacyOrders[orderElement.visitId].orders.push(orderElement);
                                    }
                                    callback_each();
                                }
                            });

                        },
                        // group pharmacy orders as prescription then send it to rabbitMQ 
                        function (err) {
                            if (err) {
                                main_callback(err);
                                // document.sendResponse('Error while processing', 501, 'error', err, res)
                            } else if (pharmacyOrders) {
                                async.forEachOf(pharmacyOrders,
                                    function (eachOrder, visitId, callback_foreach) {
                                        documentObject.Visit.aggregate([
                                            {
                                                "$match": { _id: visitId }
                                            },
                                            {
                                                $lookup: {
                                                    from: "patients",
                                                    localField: "patientId",
                                                    foreignField: "_id",
                                                    as: "patient"
                                                }
                                            },
                                            { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
                                            {
                                                $project: {
                                                    "mrn": "$patient.mrn",
                                                    "HIS_PatientId": "$patient.HIS_PatientId",
                                                    "nric": "$patient.nric",
                                                    "unitId": "$patient.unitId",
                                                    "prefix": "$patient.prefix",
                                                    'name': "$patient.name",
                                                    "unitId": "$patient.unitId",
                                                    "GenderCode": "$patient.GenderCode",
                                                    "residentialCountry": "$patient.residentialCountry",
                                                    "mobile": "$patient.mobile",
                                                    "dob": "$patient.dob",
                                                    "visitRecords": [{
                                                        "OPD_IPD_ID": "$OPD_IPD_ID",
                                                        "HIS_Doctor_ID": "$HIS_Doctor_ID",
                                                        "OPD_IPD": "$OPD_IPD"
                                                    }]
                                                }
                                            }
                                        ], function (err, visitInfo) {
                                            if (err) {
                                                callback_foreach(err);
                                            } else if (visitInfo.length) {
                                                eachOrder.Identifier = visitInfo[0];
                                                eachOrder.mimsResponse = data.mimsResponse;
                                                eachOrder.isMimsReviewed = data.isMimsReviewed;
                                                //Replace DoctorId In case of On Behalf 
                                                if (data.type == "onBehalf") {
                                                    documentObject.User.findOne({ _id: data.payload.doctorId }, (err, user) => {
                                                        if (err)
                                                            log("Error while fetching data")
                                                        else if (!user)
                                                            log("User not found")
                                                        else {
                                                            eachOrder.Identifier.visitRecords[0].HIS_Doctor_ID = user.hisUserId;
                                                        }
                                                    })
                                                }

                                                var opta = {
                                                    'exchange': 'cpoeOrders',
                                                    'key': 'pharmacy',
                                                    'queue': 'pharmacy',
                                                    'data': eachOrder
                                                };
                                                integrationModel.dataTransfertoHIS(opta, function (callback_result) {
                                                    if (callback_result._status == "done") {
                                                        //Mark Orders sign otherwise not
                                                    }
                                                });
                                                callback_foreach();
                                            } else {
                                                var response = { 'errror': 'no visit found' }
                                                console.log("Failed to transfer into HIS");
                                                callback_foreach(response);
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {
                                            console.log('#####pharmacy order to his', err)
                                            // main_callback(err);
                                            // do we care about this error as order status is already updated?
                                            main_callback();
                                        } else {
                                            main_callback();
                                            console.log('#####pharmacy order to his', 'done')
                                        }
                                    });
                            } else {
                                main_callback();
                            }

                        })
                } else {
                    main_callback();
                }
            })
        },
        // sign On behalf orders
        function (main_callback) {

            var tempHistory = {};
            tempHistory.action = 'order verify';
            tempHistory.userId = data.userId;
            tempHistory.timestamp = new Date();
            var updateData = {
                $set: { "onBehalf.orderStatus": "verified" },
                $push: { activityLog: tempHistory }
            }
            cpoeDocument.CpoeOrder.update({ _id: { $in: data.cpoeOrders }, "onBehalf.orderStatus": new RegExp("unsigned", "i"), 'onBehalf.doctorId': data.userId }, updateData, { 'multi': true })
                .exec(function (err, result) {
                    if (err) {
                        main_callback(err)
                    } else {
                        main_callback();
                    }
                })
        }
    ], function (err) {
        if (err) {
            document.sendResponse('Error while processing', 406, 'error', err, res);
        } else {
            document.sendResponse('none', 200, 'done', 'Orders signed', res);
        }
    });
};

var changeMedicationStatus = function (id, newStatus) {
    documentObject.Medication.update({ orderId: id }, { 'status': newStatus }, function (err) {
        if (err)
            console.log(err)

    })
}

var signOnBehalfOrders = function (data, callback) {
    // verify on behalf orders
    var tempHistory = {};
    tempHistory.action = 'order verify';
    tempHistory.userId = data.userId;
    tempHistory.timestamp = new Date();
    var updateData = {
        $set: { "onBehalf.orderStatus": "verified" },
        $push: { activityLog: tempHistory }
    }
    cpoeDocument.CpoeOrder.update({ _id: { $in: data.cpoeOrders }, "onBehalf.orderStatus": new RegExp("unsigned", "i"), 'onBehalf.doctorId': data.userId }, updateData, { 'multi': true })
        .exec(function (err, result) {
            if (err) {
                callback(err)
            } else {
                callback();
            }
        })
}
var generateOnBehalfNotification = function (orderElement) {
    documentObject.Patient.findOne({ _id: orderElement.patientId }, function (err, patientResult) {
        if (err) {
            log(err)
        } else if (patientResult) {
            var newNotification = new documentObject.Notification();
            newNotification._id = uuid.v4();
            newNotification.userId = orderElement.onBehalf.doctorId;
            newNotification.userType = 'doctor'
            newNotification.nType = 2;
            newNotification.message = "Unverified Order";
            newNotification.location = "";
            newNotification.new = true;
            if (document.isFieldFilled(orderElement.orderItems.urgency))
                newNotification.urgency = orderElement.orderItems.urgency;
            else
                newNotification.urgency = "low";
            newNotification.date = Date.now();
            newNotification.fromUserId = orderElement.userId;
            newNotification.patientName = patientResult.name;
            newNotification.patientMrn = patientResult.mrn;
            newNotification.payload = [];
            newNotification.payload.push(orderElement);
            newNotification.visit = orderElement.visitId;
            notificationModel.generateNotification(newNotification, function (err, result) {
                if (err) {
                    log(err)
                } else {
                    console.log("notification sent" + result);
                }
            })
        }
    })
}
