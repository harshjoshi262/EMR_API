var mongoose = require('mongoose'),
    moment = require('moment'),
    domainModel = require('./domain-model'),
    uuid = require('node-uuid'),
    Autocomplete = require('autocomplete'),
    user_audit = require("./user_audit.js"),
    notificationModel = require('./notification_model.js')
http = require('http');
require('graylog');
document = require('./db_model.js');
var documentObject = document.domainModel;
var cpoeDocument = document.cpoeDataModel;

module.exports.createOrder = function (data, res) {
    log("Entered in cpoe model to create order");
    if (document.isFieldFilled(data.patientId)) {
        documentObject.Patient.find({ "_id": data.patientId }, function (err, result) {
            if (err) {
                var response = {
                    "_error_message": "invalid patientId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "Record Not found"
                }
                res.send(response);
            } else {
                var orderToCreate = new cpoeDocument.CpoeOrder();
                orderToCreate._id = uuid.v4();
                orderToCreate.doctorId = data.doctorId;
                orderToCreate.patientId = data.patientId;
                orderToCreate.encounterType = data.encounterType;
                orderToCreate.orderCategory = data.orderCategory;
                orderToCreate.orderSubCategory = data.orderSubCategory;
                orderToCreate.orderItems = data.orderItems;
                orderToCreate.isFavorite = data.isFavorite;
                orderToCreate.frequencyMaster = data.frequencyMaster;
                orderToCreate.orderStatus = "unsigned";
                orderToCreate.orderDate = data.orderDate;
                orderToCreate.serviceName = data.serviceName;
                orderToCreate.serviceCode = data.serviceCode;
                orderToCreate.clinicName = data.clinicName;
                orderToCreate.clinicalDepartment = data.clinicalDepartment;
                orderToCreate.orderingDoctorName = data.orderingDoctorName;
                orderToCreate.primaryDoctor = data.primaryDoctor;
                orderToCreate.patientName = data.patientName;
                orderToCreate.location = data.location;
                switch (orderToCreate.orderCategory.toLowerCase()) {
                    case 'lab':
                        var labOrderItem = new cpoeDocument.labOrderItem();                        
                        placeLabOrder(orderToCreate, labOrderItem, res);
                        break;
                    case 'blood component':
                        placeBloodComponentOrder(orderToCreate, res);
                        break;
                    case 'imaging order':
                        placeImagingOrder(orderToCreate, res);
                        break;
                    case 'procedure order':
                        placeProcedureOrder(orderToCreate, res);
                        break;
                    case 'general':
                        placeGeneralOrder(orderToCreate, res);
                        break;
                    case 'consult':
                        placeConsultOrder(orderToCreate, res);
                        break;
                    case 'vital':
                        placeVitalOrder(orderToCreate, res);
                        break;
                    case 'nursing':
                        placeNursingOrder(orderToCreate, res);
                        break;
                    case 'patient movement':
                        placePatientMovementOrder(orderToCreate, res);
                        break;
                    case 'pharmacy':
                        if (orderToCreate.orderSubCategory.toLowerCase() == 'op')
                            placeOpPharmacyOrder(orderToCreate, res);
                        else if (orderToCreate.orderSubCategory.toLowerCase() == 'ip')
                            placeIpPharmacyOrder(orderToCreate, res);
                        else if (orderToCreate.orderSubCategory.toLowerCase() == 'iv')
                            placeIvPharmacyOrder(orderToCreate, res);

                        break;
                    default:
                        res.status(409).send();

                }

            }

        });
    } else {
        var response = {
            "_error_message": "invalid patientId",
            "_status_Code": 406,
            "_status": "error",
            "result": "Record Not found"
        }
        res.send(response);
    }

}

module.exports.getCpoeOrdersByCategory = function (patientId, category, subCat, res) {
    cpoeDocument.CpoeOrder.find({ patientId: patientId, orderCategory: category }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
            // res.send(result);
        } else {
            var response = {
                "_error_message": "No records for this category",
                "_status_Code": 406,
                "_status": "error",
                "result": "No records for this category"
            }
            res.send(response);
            // var response = { "_status": "error", "message": "No records for this category" };
            // res.send(response);
        }

    });

}

module.exports.updateOrder = function (data, res) {
    log("Entered in cpoe model to update order", { level: LOG_DEBUG });
    if (document.isFieldFilled(data.orderId)) {

        var update = {
            doctorId: data.doctorId,
            patientId: data.patientId,
            encounterType: data.encounterType,
            orderCategory: data.orderCategory,
            orderSubCategory: data.orderSubCategory,
            orderItems: data.orderItems,
            isFavorite: data.isFavorite,
            frequencyMaster: data.frequencyMaster,
            orderStatus: "unsigned",
            orderDate: data.orderDate
        }


        cpoeDocument.CpoeOrder.findOneAndUpdate({ "_id": data.orderId }, update, { upsert: true }, function (err, result) {
            if (err) {
                log(err);
                var response = {
                    "_error_message": "unable to update records please check input",
                    "_status_Code": 405,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
                // var response = { "_status": "something went wrong please try again" }
                // res.send(response).status(400);
            } else {
                var response = {
                    "_error_message": "none",
                    "_status_Code": 200,
                    "_status": "done",
                    "result": "Order Updated Successfully"
                }
                res.send(response);
                // var response = { "_status": "Order Updated Successfully" }
                // res.send(response).status(200);
            }

        });
    } else {
        var response = {
            "_error_message": "Invalid patientId",
            "_status_Code": 406,
            "_status": "error",
            "result": "none"
        }
        res.send(response);
    }

}

module.exports.getFavoriteOrders = function (res) {
    cpoeDocument.CpoeOrder.find({ isFavorite: true }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to find favorite orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
            // res.send(result);
        } else {
            var response = {
                "_error_message": "No favorite Orders",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        }

    });
}

module.exports.getRecentOrders = function (res) {
    // change sorting order to date time from Id
    cpoeDocument.CpoeOrder.find({})
        .sort({ orderDate: -1 })
        .limit(50)
        .exec(function (err, result) {
            if (err) {
                var response = {
                    "_error_message": "unable to find recent orders please try again",
                    "_status_Code": 405,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            } else if (document.isFieldFilled(result)) {
                var response = {
                    "_error_message": "none",
                    "_status_Code": 200,
                    "_status": "done",
                    "result": result
                }
                res.send(response);
            } else {
                var response = {
                    "_error_message": "No recent Orders",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        });
}

module.exports.getCpoeOrdersById = function (orderId, res) {
    //    if(document.isFieldFilled(orderId)){
    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to find recent orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                var response = {
                    "_error_message": "none",
                    "_status_Code": 200,
                    "_status": "done",
                    "result": result
                }
                res.send(response);
            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });
}

module.exports.addOrderToFavorites = function (orderId, res) {
    //    if(document.isFieldFilled(orderId)){
    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to process please check orderId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                result.isFavorite = true;
                result.save(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": "unable to process please try again",
                            "_status_Code": 405,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "_error_message": "none",
                            "_status_Code": 200,
                            "_status": "done",
                            "result": "order is added to favorites succesfully"
                        }
                        res.send(response);
                        // var response = { "_status": "order is added to favorites succesfully" };
                        // res.send(response);
                    }
                });

            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });
}

module.exports.removeOrderFromFavorites = function (orderId, res) {
    //    if(document.isFieldFilled(orderId)){
    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to process please check orderId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                result.isFavorite = false;
                result.save(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": "unable to process please try again",
                            "_status_Code": 405,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "_error_message": "none",
                            "_status_Code": 200,
                            "_status": "done",
                            "result": "order is removed from favorites succesfully"
                        }
                        res.send(response);
                        // var response = { "_status": "order is removed from favorites succesfully" };
                        // res.send(response);
                    }
                });

            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });


}

module.exports.cancelOrder = function (orderId, res) {

    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to process please check orderId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                result.orderStatus = "Canceled";
                result.save(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": "unable to process please try again",
                            "_status_Code": 405,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "_error_message": "none",
                            "_status_Code": 200,
                            "_status": "done",
                            "result": "order is canceled succesfully"
                        }
                        res.send(response);
                        // var response = { "_status": "order is canceled succesfully" };
                        // res.send(response);
                    }
                });

            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });

}

module.exports.discontinueOrder = function (orderId, res) {

    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "unable to process please check orderId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                result.orderStatus = "Discontinued";
                result.save(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": "unable to process please try again",
                            "_status_Code": 405,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var response = {
                            "_error_message": "none",
                            "_status_Code": 200,
                            "_status": "done",
                            "result": "order is discontined succesfully"
                        }
                        res.send(response);
                        // var response = { "_status": "order is discontined succesfully" };
                        // res.send(response);
                    }
                });

            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });

}

module.exports.repeatOrder = function (orderId, data, res) {

    cpoeDocument.CpoeOrder.findById(orderId, function (err, result) {
        if (err) {
            // console.log(err);
            var response = {
                "_error_message": "unable to process please check orderId",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            if (document.isFieldFilled(result)) {
                var orderToCreate = new cpoeDocument.CpoeOrder();
                orderToCreate._id = uuid.v4();
                orderToCreate.doctorId = result.doctorId;
                orderToCreate.patientId = result.patientId;
                orderToCreate.encounterType = result.encounterType;
                orderToCreate.orderCategory = result.orderCategory;
                orderToCreate.orderSubCategory = result.orderSubCategory;
                orderToCreate.orderItems = result.orderItems;
                orderToCreate.isFavorite = result.isFavorite;
                orderToCreate.frequencyMaster = result.frequencyMaster;
                orderToCreate.orderStatus = "Created";
                orderToCreate.orderDate = data.orderDate;
                orderToCreate.save(function (err, result1) {
                    if (err) {
                        log("2.: " + err)
                        var response = {
                            "_error_message": "unable to process please try again",
                            "_status_Code": 405,
                            "_status": "error",
                            "result": "none"
                        }
                        res.send(response);
                    } else {
                        var record = [result1._id];
                        addRecordToVisit(data.visitId, record);
                        resObj = { "orderId": result1._id };
                        var response = {
                            "_error_message": "none",
                            "_status_Code": 200,
                            "_status": "done",
                            "result": resObj
                        }
                        res.send(response);
                        // res.send(result1);
                    }
                });

            } else {
                var response = {
                    "_error_message": "invalid orderId",
                    "_status_Code": 406,
                    "_status": "error",
                    "result": "none"
                }
                res.send(response);
            }

        }

    });

}
//////////////// order review

module.exports.getCpoeOrdersReview = function (data, res) {
    cpoeDocument.CpoeOrder.find({ doctorId: data.doctorId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
            // res.send(result);
        } else {
            var response = {
                "_error_message": "No records for this category",
                "_status_Code": 406,
                "_status": "error",
                "result": "No records for this category"
            }
            res.send(response);
            // var response = { "_status": "error", "message": "No records for this category" };
            // res.send(response);
        }

    });

}

module.exports.getCpoeOrdersReviewByDate = function (data, res) {
    // log("in cpoe orders by date");
    var condition = {
        doctorId: data.doctorId,
        orderDate: {
            $gte: data.dateLower,
            $lte: data.dateUpper
        }

    }
    cpoeDocument.CpoeOrder.find(condition, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
            // res.send(result);
        } else {
            var response = {
                "_error_message": "No records for this category",
                "_status_Code": 404,
                "_status": "error",
                "result": "No records for this category"
            }
            res.send(response);
            // var response = { "_status": "error", "message": "No records for this category" };
            // res.send(response);
        }

    });

}
// order sign
module.exports.getPatientUnsignedOrders = function (data, res) {
    log("patientId:" + data.patientId);
    cpoeDocument.CpoeOrder.find({ doctorId: data.doctorId, patientId: data.patientId, orderStatus: "unsigned" }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": result
            }
            res.send(response);
            // res.send(result);
        } else {
            var response = {
                "_error_message": "No records for this category",
                "_status_Code": 406,
                "_status": "error",
                "result": "No records for this category"
            }
            res.send(response);
            // var response = { "_status": "error", "message": "No records for this category" };
            // res.send(response);
        }

    });

}

module.exports.signCpoeOrders = function (data, res) {
    // cpoeDocument.CpoeOrder.find({ doctorId: data.doctorId, _id: { $in: data.cpoeOrders } }, { $set: { orderStatus: "pending" } }, { multi: true }, function (err, result) {
    cpoeDocument.CpoeOrder.find({ doctorId: data.doctorId, _id: { $in: data.cpoeOrders } }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
            // var response = { "_status": "something went wrong please try again" };
            // res.send(response);
        } else if (document.isFieldFilled(result)) {
            // console.log(result);
            result.forEach(function (orderElement) {
                if (orderElement.orderCategory.toLowerCase() == "consult") {
                    notificationModel.generateConsultNotification(orderElement);
                }
            });
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "done",
                "result": " Orders signed"
            }
            res.send(response);

        } else {
            var response = {
                "_error_message": "No records for this category",
                "_status_Code": 406,
                "_status": "error",
                "result": "No records for this category"
            }
            res.send(response);

        }

    });

}

module.exports.respondConsultNotification = function (data, res) {
    cpoeDocument.CpoeOrder.findOne({ _id: data.orderId }, function (err, result) {
        if (err) {
            var response = {
                "_error_message": "Error while reading orders please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else if (document.isFieldFilled(result)) {
            result.orderStatus = "denied"
            if (data.isAccepted) {
                result.orderStatus = "accepted"
            }
            result.save(function (err) {
                if (err) {
                    log(err);
                } else {
                    // passing order object to notification_model
                    notificationModel.respondConsultOrder(result);
                    // adding patient to doctor list
                    if (data.isAccepted) {
                        documentObject.Doctor.findOne({ _id: result.doctorId }, function (err, doctorResult) {
                            if (err) {
                                var response = {
                                    "_error_message": "Error while reading orders please try again",
                                    "_status_Code": 405,
                                    "_status": "error",
                                    "result": "none"
                                }
                                res.send(response);
                            } else {
                                // console.log(doctorResult);
                                doctorResult.patients.unshift(result.patientId);
                                doctorResult.save(function (err) {
                                    if (!err) {
                                        var response = {
                                            "_error_message": "none",
                                            "_status_Code": 200,
                                            "_status": "done",
                                            "result": "Response sent."
                                        }
                                        res.send(response);
                                    }
                                });
                            }
                        });
                    }



                }
            });
        } else {
            log("no result found");
        }
    });
}

addRecordToVisit = function (visitId, records, res) {
    log("Entered in cpoe model to add record to visit", { level: LOG_DEBUG });
    // get visit
    documentObject.Visit.findById({ _id: visitId }, function (err, visit) {
        if (err) {
            log("Error in getting visit" + err, { level: LOG_ERR });
            res.send(500);
        } else {

            if (document.isFieldFilled(visit)) {
                if (!visit.cpoeOrders) visit.cpoeOrders = [];
                visit.cpoeOrders = visit.cpoeOrders.concat(records);
                // save the visit
                visit.save(function (err) {
                    if (err) {
                        log("Error in saving a visit" + err, { level: LOG_ERR });
                        if (res) res.send(500);
                    }
                    else {
                        // log("record added to visit");
                        log('Successfully saved visit', { level: LOG_INFO });
                        if (res) res.send(200);
                    }
                });
            } else {
                log("invalid visitId");
                var response = { "_status": "invalid visit Id" };
                res.send(response);
            }
        }
    });
}
var placeOrder = function (orderToCreate, cpoeOrderItem, res) {
    var orderItem = orderToCreate.orderItems[0];
    // var labOrderItem = new cpoeDocument.labOrderItem();
    cpoeOrderItem = Object.assign(cpoeOrderItem, orderItem);
    // obj1 = Object.extend(obj1, obj2);
    cpoeOrderItem._id = uuid.v4();
    cpoeOrderItem.cpoeOrderId = orderToCreate._id;
    // labOrderItem.labTest = orderItem.labTest;
    // labOrderItem.doctorId = orderItem.doctorId;
    // labOrderItem.doctorName = orderItem.doctorName;
    // labOrderItem.collectSample = orderItem.collectSample;
    // labOrderItem.collectionDate = orderItem.collectionDate;
    // labOrderItem.collectionType = orderItem.collectionType;
    cpoeOrderItem.specimen = "null";
    if (document.isFieldFilled(orderItem.specimen)) {
        cpoeOrderItem.specimen = orderItem.specimen;
    }
    // labOrderItem.urgency = orderItem.urgency;
    // labOrderItem.howOften = orderItem.howOften;
    // labOrderItem.description = orderItem.description;
    // labOrderItem.instruction = orderItem.instruction;
    cpoeOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            console.log(cpoeOrderItem);
            placeCpoeOrder(orderToCreate, cpoeOrderItem, res);
        }
    });

}
var placeBloodComponentOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var bloodComponentItem = new cpoeDocument.bloodComponentItem();
    // var bloodComponentItem2 ={};
    bloodComponentItem._id = uuid.v4();
    bloodComponentItem.cpoeOrderId = orderToCreate._id;
    bloodComponentItem.bloodComponents = orderItem.bloodComponents;
    bloodComponentItem.noOfBloodBags = orderItem.noOfBloodBags;
    bloodComponentItem.requisitionDate = orderItem.requisitionDate;
    bloodComponentItem.requiredForSergery = orderItem.requiredForSergery;
    bloodComponentItem.areDonorsAvialable = orderItem.areDonorsAvialable;
    bloodComponentItem.urgency = orderItem.urgency;
    bloodComponentItem.comment = orderItem.comment;
    bloodComponentItem.instruction = orderItem.instruction;
    bloodComponentItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            // console.log(orderToCreate);
            // bloodComponentItem2=bloodComponentItem;
            placeCpoeOrder(orderToCreate, bloodComponentItem, res);
        }
    });
}
var placeImagingOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var imagingOrderItem = new cpoeDocument.imagingOrderItem();
    imagingOrderItem._id = uuid.v4();
    imagingOrderItem.cpoeOrderId = orderToCreate._id;
    imagingOrderItem.imagingType = orderItem.imagingType;
    imagingOrderItem.imagingProcedure = orderItem.imagingProcedure;
    imagingOrderItem.modifier = orderItem.modifier;
    imagingOrderItem.category = orderItem.category;
    imagingOrderItem.transport = orderItem.transport;
    imagingOrderItem.requestedDate = orderItem.requestedDate;
    imagingOrderItem.historyAndReason = orderItem.historyAndReason;
    imagingOrderItem.preOpScheduled = orderItem.preOpScheduled;
    imagingOrderItem.requiredIsolation = orderItem.requiredIsolation;
    imagingOrderItem.pregnancy = orderItem.pregnancy;
    imagingOrderItem.urgency = orderItem.urgency;
    imagingOrderItem.instruction = orderItem.instruction;
    imagingOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, imagingOrderItem, res);
        }
    });
}
var placeProcedureOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var procedureOrderItem = new cpoeDocument.procedureOrderItem();
    procedureOrderItem._id = uuid.v4();
    procedureOrderItem.cpoeOrderId = orderToCreate._id;
    procedureOrderItem.group = orderItem.group;
    procedureOrderItem.procedureName = orderItem.procedureName;
    procedureOrderItem.associatedProblems = orderItem.associatedProblems;
    procedureOrderItem.attentionDoctorId = orderItem.attentionDoctorId;
    procedureOrderItem.attentionDoctorName = orderItem.attentionDoctorName;
    procedureOrderItem.placeOfConsultation = orderItem.placeOfConsultation;
    procedureOrderItem.patientSeenAs = orderItem.patientSeenAs;
    procedureOrderItem.reasonForRequest = orderItem.reasonForRequest;
    procedureOrderItem.provisionalDiagnosis = orderItem.provisionalDiagnosis;
    procedureOrderItem.clinicalIndicateDate = orderItem.clinicalIndicateDate
    procedureOrderItem.urgency = orderItem.urgency;
    procedureOrderItem.instruction = orderItem.instruction;
    procedureOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, procedureOrderItem, res);
        }
    });
}
var placeGeneralOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var generalOrderItem = new cpoeDocument.generalOrderItem();
    generalOrderItem._id = uuid.v4();
    generalOrderItem.cpoeOrderId = orderToCreate._id;
    generalOrderItem.order = orderItem.order;
    generalOrderItem.startDate = orderItem.startDate;
    generalOrderItem.stopDate = orderItem.stopDate;
    generalOrderItem.urgency = orderItem.urgency;
    generalOrderItem.comment = orderItem.comment;
    generalOrderItem.instruction = orderItem.instruction;
    generalOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, generalOrderItem, res);
        }
    });
}
var placeConsultOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var consultOrderItem = new cpoeDocument.consultOrderItem();
    consultOrderItem._id = uuid.v4();
    consultOrderItem.cpoeOrderId = orderToCreate._id;
    consultOrderItem.department = orderItem.department;
    consultOrderItem.icdCode = orderItem.icdCode;
    consultOrderItem.requestedDate = orderItem.requestedDate;
    consultOrderItem.attendingDoctorId = orderItem.attendingDoctorId;
    consultOrderItem.attentionDoctorName = orderItem.attentionDoctorName;
    consultOrderItem.patientSeenAs = orderItem.patientSeenAs;
    consultOrderItem.placeOfConsultation = orderItem.placeOfConsultation;
    consultOrderItem.reasonForRequest = orderItem.reasonForRequest;
    consultOrderItem.urgency = orderItem.urgency;
    consultOrderItem.comment = orderItem.comment;
    consultOrderItem.instruction = orderItem.instruction;
    consultOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, consultOrderItem, res);
        }
    });
}
var placeVitalOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var vitalOrderItem = new cpoeDocument.vitalOrderItem();
    vitalOrderItem._id = uuid.v4();
    vitalOrderItem.cpoeOrderId = orderToCreate._id;
    vitalOrderItem.vitalSign = orderItem.vitalSign;
    vitalOrderItem.startDate = orderItem.startDate;
    vitalOrderItem.stopDate = orderItem.stopDate;
    vitalOrderItem.schedule = orderItem.schedule;
    vitalOrderItem.urgency = orderItem.urgency;
    vitalOrderItem.instruction = orderItem.instruction;
    vitalOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, vitalOrderItem, res);
        }
    });
}
var placeNursingOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var nursingOrderItem = new cpoeDocument.nursingOrderItem();
    nursingOrderItem._id = uuid.v4();
    nursingOrderItem.cpoeOrderId = orderToCreate._id;
    nursingOrderItem.order = orderItem.order;
    nursingOrderItem.startDate = orderItem.startDate;
    nursingOrderItem.stopDate = orderItem.stopDate;
    nursingOrderItem.urgency = orderItem.urgency;
    nursingOrderItem.comment = orderItem.comment;
    nursingOrderItem.instruction = orderItem.instruction;
    nursingOrderItem.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, nursingOrderItem, res);
        }
    });
}

var placePatientMovementOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var patientMovementOrder = new cpoeDocument.patientMovementOrder();
    patientMovementOrder._id = uuid.v4();
    patientMovementOrder.cpoeOrderId = orderToCreate._id;
    patientMovementOrder.category = orderItem.category;
    patientMovementOrder.wardName = orderItem.wardName;
    patientMovementOrder.department = orderItem.department;
    patientMovementOrder.attendingDoctorId = orderItem.attendingDoctorId;
    patientMovementOrder.attentionDoctorName = orderItem.attentionDoctorName;
    patientMovementOrder.atdDate = orderItem.atdDate;
    patientMovementOrder.problemDiagnosis = orderItem.problemDiagnosis;
    patientMovementOrder.icdCode = orderItem.icdCode;
    patientMovementOrder.instruction = orderItem.instruction;
    patientMovementOrder.otScheduled = orderItem.otScheduled;
    patientMovementOrder.comment = orderItem.comment;
    patientMovementOrder.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, patientMovementOrder, res);
        }
    });
}
var placeOpPharmacyOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var opPharmacyOrder = new cpoeDocument.opPharmacyOrder();
    opPharmacyOrder._id = uuid.v4();
    opPharmacyOrder.cpoeOrderId = orderToCreate._id;
    opPharmacyOrder.type = orderItem.type;
    opPharmacyOrder.opPharmacyItems = [];
    opPharmacyOrder.complexPharmacyItems = [];
    if (opPharmacyOrder.type.toLowerCase() == 'complex') {
        orderItem.complexPharmacyItems.forEach(function (drug, index) {
            var drugItem = new cpoeDocument.complexDrugList();
            drugItem.drugName = drug.drugName;
            drugItem.dosage = drug.dosage;
            drugItem.route = drug.route;
            drugItem.schedule = drug.schedule;
            drugItem.duration = drug.duration;
            drugItem.adminTimes = drug.adminTimes;
            drugItem.thenAnd = drug.thenAnd;
            // console.log(drugItem);
            drugItem.validate(function (err) {
                if (err) {
                    log(err);
                    // res.status(407).send("validation error");
                } else if (index == orderItem.complexPharmacyItems.length - 1) {
                    var Item = JSON.stringify(drugItem);
                    opPharmacyOrder.complexPharmacyItems[index] = JSON.parse(Item);
                    opPharmacyOrder.priority = orderItem.priority;
                    opPharmacyOrder.instruction = orderItem.instruction;
                    opPharmacyOrder.prn = orderItem.prn;
                    opPharmacyOrder.comment = orderItem.comment;
                    opPharmacyOrder.pediatricDose = orderItem.pediatricDose;
                    opPharmacyOrder.validate(function (err) {
                        if (err) {
                            var response = {
                                "_error_message": err,
                                "_status_Code": 407,
                                "_status": "Validation Error",
                                "result": "none"
                            }
                            res.status(200).send(response);
                        } else {
                            log("placing complex op pharmcy order");
                            placeCpoeOrder(orderToCreate, opPharmacyOrder, res);
                        }
                    });
                } else {
                    var Item = JSON.stringify(drugItem);
                    opPharmacyOrder.complexPharmacyItems[index] = JSON.parse(Item);
                    // console.log(opPharmacyOrder);
                }
            });
        });
    } else if (opPharmacyOrder.type.toLowerCase() == 'dosage') {
        var drug = orderItem.opPharmacyItems[0];
        // console.log(orderItem);
        var drugItem = new cpoeDocument.opPharmacyItem();
        drugItem.drugName = drug.drugName;
        drugItem.drugGenericName = drug.drugGenericName;
        drugItem.dosage = drug.dosage;
        drugItem.schedule = drug.schedule;
        drugItem.pickup = drug.pickup;
        drugItem.route = drug.route;
        drugItem.daysSupply = drug.daysSupply;
        drugItem.quantity = drug.quantity;
        drugItem.refils = drug.refils;
        drugItem.validate(function (err) {
            if (err) {
                var response = {
                    "_error_message": err,
                    "_status_Code": 407,
                    "_status": "Validation Error",
                    "result": "none"
                }
                res.status(200).send(response);
            } else {
                log("............")
                opPharmacyOrder.opPharmacyItems[0] = drug;
                // console.log(opPharmacyOrder.opPharmacyItems);
                log("............")
                opPharmacyOrder.priority = orderItem.priority;
                opPharmacyOrder.instruction = orderItem.instruction;
                opPharmacyOrder.prn = orderItem.prn;
                opPharmacyOrder.comment = orderItem.comment;
                opPharmacyOrder.pediatricDose = orderItem.pediatricDose;
                opPharmacyOrder.validate(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": err,
                            "_status_Code": 407,
                            "_status": "Validation Error",
                            "result": "none"
                        }
                        res.status(200).send(response);
                    } else {
                        placeCpoeOrder(orderToCreate, opPharmacyOrder, res);
                    }
                });
            }
        });
    } else {
        res.status(409).send();
    }

}
var placeIpPharmacyOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var ipPharmacyOrder = new cpoeDocument.ipPharmacyOrder();
    ipPharmacyOrder._id = uuid.v4();
    ipPharmacyOrder.cpoeOrderId = orderToCreate._id;
    ipPharmacyOrder.type = orderItem.type;
    if (ipPharmacyOrder.type.toLowerCase() == 'complex') {
        orderItem.complexPharmacyItems.forEach(function (drug, index) {
            var drugItem = new cpoeDocument.complexDrugList();
            drugItem.drugName = drug.drugName;
            drugItem.dosage = drug.dosage;
            drugItem.route = drug.route;
            drugItem.schedule = drug.schedule;
            drugItem.duration = drug.duration;
            drugItem.adminTimes = drug.adminTimes;
            drugItem.thenAnd = drug.thenAnd;
            drugItem.validate(function (err) {
                if (err) {
                    log(err);
                    // res.status(407).send("validation error");
                } else if (index == orderItem.complexPharmacyItems.length - 1) {
                    var Item = JSON.stringify(drugItem);
                    ipPharmacyOrder.complexPharmacyItems[index] = JSON.parse(Item);
                    ipPharmacyOrder.priority = orderItem.priority;
                    ipPharmacyOrder.instruction = orderItem.instruction;
                    ipPharmacyOrder.prn = orderItem.prn;
                    ipPharmacyOrder.comment = orderItem.comment;
                    ipPharmacyOrder.pediatricDose = orderItem.pediatricDose;
                    ipPharmacyOrder.validate(function (err) {
                        if (err) {
                            var response = {
                                "_error_message": err,
                                "_status_Code": 407,
                                "_status": "Validation Error",
                                "result": "none"
                            }
                            res.status(200).send(response);
                        } else {
                            log("placing complex op pharmcy order");
                            placeCpoeOrder(orderToCreate, ipPharmacyOrder, res);
                        }
                    });
                } else {
                    var Item = JSON.stringify(drugItem);
                    ipPharmacyOrder.complexPharmacyItems[index] = JSON.parse(Item);
                    // console.log(opPharmacyOrder);
                }
            });
        });
    } else if (ipPharmacyOrder.type.toLowerCase() == 'dosage') {
        // console.log(orderItem);
        var drug = orderItem.ipPharmacyItems[0];
        var drugItem = new cpoeDocument.ipPharmacyItem();
        drugItem.drugName = drug.drugName;
        drugItem.drugGenericName = drug.drugGenericName;
        drugItem.dosage = drug.dosage;
        drugItem.schedule = drug.schedule;
        drugItem.route = drug.route;
        drugItem.startDate = drug.startDate;
        drugItem.daysOfSupply = drug.daysOfSupply;
        drugItem.validate(function (err) {
            if (err) {
                var response = {
                    "_error_message": err,
                    "_status_Code": 407,
                    "_status": "Validation Error",
                    "result": "none"
                }
                res.status(200).send(response);
            } else {
                ipPharmacyOrder.ipPharmacyItems[0] = drug;
                ipPharmacyOrder.priority = orderItem.priority;
                ipPharmacyOrder.instruction = orderItem.instruction;
                ipPharmacyOrder.prn = orderItem.prn;
                ipPharmacyOrder.comment = orderItem.comment;
                ipPharmacyOrder.pediatricDose = orderItem.pediatricDose;
                ipPharmacyOrder.validate(function (err) {
                    if (err) {
                        var response = {
                            "_error_message": err,
                            "_status_Code": 407,
                            "_status": "Validation Error",
                            "result": "none"
                        }
                        res.status(200).send(response);
                    } else {
                        placeCpoeOrder(orderToCreate, ipPharmacyOrder, res);
                    }
                });
            }
        });
    }

}
var placeIvPharmacyOrder = function (orderToCreate, res) {
    var orderItem = orderToCreate.orderItems[0];
    var ivPharmacyOrder = new cpoeDocument.ivPharmacyOrder();
    ivPharmacyOrder._id = uuid.v4();
    ivPharmacyOrder.cpoeOrderId = orderToCreate._id;
    ivPharmacyOrder.solution = orderItem.solution;
    ivPharmacyOrder.solutionGenricName = orderItem.solutionGenricName;
    ivPharmacyOrder.solVolumeStrength = orderItem.solVolumeStrength;
    ivPharmacyOrder.solutionRoute = orderItem.solutionRoute;
    ivPharmacyOrder.additiveName = orderItem.additiveName;
    ivPharmacyOrder.additiveGenericName = orderItem.additiveGenericName;
    ivPharmacyOrder.additiveVolumeStrength = orderItem.additiveVolumeStrength;
    ivPharmacyOrder.additiveRoute = orderItem.additiveRoute;
    ivPharmacyOrder.schedule = orderItem.schedule;
    ivPharmacyOrder.infusionRate = orderItem.infusionRate;
    ivPharmacyOrder.priority = orderItem.priority;
    ivPharmacyOrder.duration = orderItem.duration;
    ivPharmacyOrder.totalVolume = orderItem.totalVolume;
    ivPharmacyOrder.tpn = orderItem.tpn;
    ivPharmacyOrder.historyAndReason = orderItem.historyAndReason;
    ivPharmacyOrder.instruction = orderItem.instruction;
    ivPharmacyOrder.comment = orderItem.comment;
    ivPharmacyOrder.validate(function (err) {
        if (err) {
            var response = {
                "_error_message": err,
                "_status_Code": 407,
                "_status": "Validation Error",
                "result": "none"
            }
            res.status(200).send(response);
        } else {
            placeCpoeOrder(orderToCreate, ivPharmacyOrder, res);
        }
    });
}
var placeCpoeOrder = function (orderToCreate, orderItem, res) {
    log("in place cpoe order");  
    orderToCreate.orderItems = [];   
    var Item = JSON.stringify(orderItem);
    orderToCreate.orderItems.push(JSON.parse(Item));    
    orderToCreate.save(function (err, result) {
        if (err) {
            log(err);
            var response = {
                "_error_message": "Error while creating order please try again",
                "_status_Code": 405,
                "_status": "error",
                "result": "none"
            }
            res.send(response);
        } else {
            var resObj = { "orderId": result._id };
            var response = {
                "_error_message": "none",
                "_status_Code": 200,
                "_status": "Order Created",
                "result": resObj
            }
            res.send(response);
        }
    });
}

