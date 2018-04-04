function signOrdersParallel(data, userResult, res) {
  // 
  async.parallel([
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
          async.eachSeries(result,
            function (orderElement, callback_each) {
              var tempHistory = {};
              tempHistory.action = 'sign';
              tempHistory.userId = orderElement.userId;
              tempHistory.timestamp = new Date();
              // generate medication           
              if (orderElement.orderCategory.toLowerCase() == 'pharmacy'
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
              if (orderElement.orderCategory.toLowerCase() == 'consult') {
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

              if (orderElement.orderCategory.toLowerCase() == 'pharmacy') {
                orderElement.orderStatus = 'active';
              }

              if (orderStatus.toLowerCase().indexOf('cancel') != -1) {
                tempHistory.action = 'cancel';
                orderElement.orderStatus = 'cancelled';
                orderElement.canCancel = false;
                orderElement.canDiscontinue = false;
                orderElement.canEdit = false;
                if (orderElement.orderCategory.toLowerCase() == 'pharmacy') {
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
                if (orderElement.orderCategory.toLowerCase() == 'pharmacy') {
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
                  if (orderElement.orderCategory.toLowerCase() !== 'pharmacy' && orderElement.orderCategory.toLowerCase() !== 'consult')
                    integrationModel.placeOrderToHIS(orderElement);
                  else if (orderElement.orderCategory.toLowerCase() !== 'consult') {
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
    function (main_callback) {
      // sign on behalf order
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
      document.sendResponse('Invalid Inputs', 406, 'error', err, res)
    } else {
      document.sendResponse('none', 200, 'done', 'Orders signed', res);
    }
  });
}