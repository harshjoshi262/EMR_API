'use Strict'
var mongoose = require('mongoose')
var document = require('./db_model.js')
var uuid = require('node-uuid')
var async = require('async');
var MONGODB_CONFIG = require('config').get('mongodb');
var acl = require('acl');
var _ = require('lodash')
var dbAclConnectionUrl = MONGODB_CONFIG.prefix + MONGODB_CONFIG.aclDbName + MONGODB_CONFIG.tail;
var masterConnection = mongoose.createConnection(dbAclConnectionUrl);

// When successfully connected
mongoose.connection.on('connected', function () {
  log('[MONGODB] Connected to: ' + dbAclConnectionUrl)
});

mongoose.connection.on('error', function (err) {
  log('[MONGODB] connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
  log('[MONGODB] Disconnected');
});

acl = new acl(new acl.mongodbBackend(masterConnection.db, 'acl_'))

var documentObject = document.domainModel
var masterObject = document.mastersModel;
var accessObject = document.accessControlModel;

// module.exports.initiate = function (paramAcl) {
//   acl = paramAcl
//   module.exports.aclControl = acl;
// }
module.exports.aclControl = acl;
module.exports.customMiddleware = function (actions, resource) {
  return function (req, res, next) {
    var _userId = req.decoded.userId,
      _actions = actions,
      _resource = resource;

    // Issue #80 - Additional check
    if (!_userId) {
      return res.status(401).send({
        success: false,
        message: 'unauthorized user'
      })
    }

    if (!_actions) {
      _actions = req.method.toLowerCase()
    }

    acl.isAllowed(_userId, _resource, _actions, function (err, allowed) {
      if (err) {
        console.log(err)
        return res.status(401).send({
          success: false,
          message: 'Error checking permissions to access resource'
        })
      } else if (allowed === false) {

        return res.status(401).send({
          success: false,
          message: 'unauthorized user'
        })

      } else {
        console.log('Allowed ' + _actions + ' on ' + _resource + ' by user ' + _userId)
        next()
      }
    })
  }
}

// get all access roles from masters
module.exports.getPatientAccessLock = function (doctorId, patientId, res) {
  documentObject.Patient.findOne({ _id: patientId }, function (err, result) {
    if (err) {
      document.sendResponse('something went wrong', '406', 'error', 'none', res)
    } else {
      if (result) {
        var flag
        //console.log(result)
        if (result.patientLock.length < 1) {
          var lock = {}
          lock.userId = doctorId
          lock.timeStamp = Date.now()
          lock.stopWatch = lock.timeStamp + (20 * 60 * 1000)
          result.patientLock.push(lock)
          log(result.patientLock);
          result.save(function (err) {
            if (err) {
              log(err)
            } else {
              flag = true
              res.send(flag);
            }
          })
        } else {
          if (result.patientLock[0].userId != doctorId && result.patientLock[0].stopWatch < result.patientLock[0].timeStamp) {
            var lock = {}
            lock.userId = doctorId
            lock.timeStamp = Date.now()
            lock.stopWatch = lock.timeStamp + (20 * 60 * 1000)
            result.patientLock = [];
            result.patientLock.push(lock)
            log(result.patientLock);
            result.save(function (err) {
              if (err) {
                log(err)
              } else {
                flag = true
                res.send(flag)
              }
            })
          } else if (result.patientLock[0].userId != doctorId && result.patientLock[0].stopWatch >= result.patientLock[0].timeStamp) {
            flag = false
            res.send(flag)
          } else if (result.patientLock[0].userId == doctorId) {
            flag = true
            res.send(flag)
          } else {
            res.send("error")
          }
        }


      } else {
        document.sendResponse('invalid input', '406', 'error', 'none', res)
      }
    }
  })
}
module.exports.getAccessRolesfromMaster = function (res) {
  masterObject.Role.find({}, function (err, result) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
    } else {
      document.sendResponse('none', 200, 'result found', result, res)
    }
  })
}
// get all resources from master
module.exports.getAccessResourcesfromMaster = function (res) {
  masterObject.Resource.find({}, function (err, result) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none')
    } else {
      document.sendResponse('none', 200, 'result found', result, res)
    }
  })
}
// get all permissions from masters
module.exports.getAccessPermissionfromMaster = function (res) {
  masterObject.Permission.find({}, function (err, result) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
    } else {
      document.sendResponse('none', 200, 'result found', result, res)
    }
  })
}

// // add access permissions to master//  resources master
module.exports.addAccessResourcesToMaster = function (data, res) {
  async.each(data.resources, function (item, callback) {
    var newResource = new masterObject.Resource(item)
    newResource._id = uuid.v4();
    newResource.save(function (err) {
      if (err) {
        // console.log(err)
        callback(err);
      } else {
        callback();
      }
    })
  }, function (err) {
    if (err) {
      if (err.code == 11000) {
        document.sendResponse('Duplicate Record', 405, 'error', 'none', res)
      } else {
        document.sendResponse('something went wrong please try again', 405, err, 'none', res)
      }
    } else {
      document.sendResponse('none', 200, 'Resources added to master', 'none', res)
    }
  })

}
// create permissions master // add access permissions to master
module.exports.addAccessPermissionToMaster = function (data, res) {
  async.each(data.permissions, function (item, callback) {
    // log(""+item)
    var newPermission = new masterObject.Permission()
    newPermission._id = uuid.v4()
    newPermission.key = item.key;
    newPermission.displayName = item.displayName;
    newPermission.save(function (err) {
      if (err) {
        // console.log(err)
        callback(err);
      } else {
        callback();
      }
    })
  }, function (err) {
    if (err) {
      if (err.code == 11000) {
        document.sendResponse('Duplicate Record', 405, 'error', 'none', res);
      } else {
        document.sendResponse(err, 405, 'error', 'none', res);
      }
    } else {
      document.sendResponse('none', 200, 'Permission added to master', 'none', res)
    }
  });
}
// add access role to master
module.exports.addAccessRoleToMaster = function (data, res) {
  var newRole = new masterObject.Role()
  newRole._id = uuid.v4()
  newRole.key = '' + data.key
  newRole.displayName = data.displayName;
  masterObject.Role.count({ key: data.key }, function (err, count) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
    } else if (count <= 0) {
      newRole.save(function (err) {
        if (!err) {
          document.sendResponse('none', 200, 'roles added to master', 'none', res)
        } else {
          console.log(err)
          document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
        }
      })
    } else {
      document.sendResponse('Duplicate Record', 405, 'error', 'none', res)
    }
  }

  )
}
// create role with permissions to access resources i.e mapping of roles to permissions
// module.exports.createAccessRole = function (data, res) {
//   masterObject.Role.findOne({ key: data.role }, 'key', function (err, role) {
//     if (err) {
//       document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
//     } else if (role) {
//       masterObject.Resource.count({ key: { $in: data.resources } }, function (err, rCount) {
//         if (!err && rCount >= data.resources.length) {
//           acl.allow(role.key, data.resources, data.permissions)
//           document.sendResponse('none', 200, 'role created', 'none', res)
//         } else {
//           document.sendResponse('Invalid Resources', 404, 'error', 'none', res)
//         }
//       })
//     } else {
//       document.sendResponse('Invalid Role', 404, 'error', 'none', res)
//     }
//   })
// }
// create role with permissions to access resources i.e mapping of roles to permissions

// function (data, res) {
//   masterObject.Role.findOne({ key: data.role }, 'key', function (err, role) {
//     if (err) {
//       document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
//     } else if (role) {
//       masterObject.Resource.count({}, function (err, rCount) {
//         if (!err && rCount >= data.bucket.length) {
//           var input = [{ roles: role.key, allows: data.bucket }];
//           acl.allow(input, function (err) {
//             if (err) {
//               document.sendResponse('something went wrong please try again', 405, 'error', err, res)
//             } else {
//               document.sendResponse('none', 200, 'role created', 'none', res)
//             }
//           })
//         } else {
//           document.sendResponse('Invalid Resources', 404, 'error', 'none', res)
//         }
//       })
//     } else {
//       document.sendResponse('Invalid Role', 404, 'error', 'none', res)
//     }
//   })
// }
var createRole = function (data, res) {
  masterObject.Role.findOne({ key: data.role }, 'key', function (err, role) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
    } else if (role) {
      masterObject.Resource.count({}, function (err, rCount) {
        if (!err && rCount >= data.bucket.length) {
          var input = [{ roles: role.key, allows: data.bucket }];
          acl.allow(input, function (err) {
            if (err) {
              document.sendResponse('something went wrong please try again', 405, 'error', err, res)
            } else {
              document.sendResponse('none', 200, 'Operation Successful', 'none', res)
            }
          })
        } else {
          document.sendResponse('Invalid Resources', 404, 'error', 'none', res)
        }
      })
    } else {
      document.sendResponse('Invalid Role', 404, 'error', 'none', res)
    }
  })
}
module.exports.createAccessRole = createRole;
module.exports.updateResources = function (data, res) {
  var update = data.payload;
  delete update['key'];
  masterObject.Resource.findOneAndUpdate({ _id: data.recordId }, update, function (err, result) {
    if (err) {
      document.sendResponse(err, 405, 'error', 'none', res)
    } else if (result) {
      document.sendResponse('done', 200, 'operation successful', 'done', res)
    } else {
      document.sendResponse("error in operation", 405, 'error', 'none', res)
    }
  })
}
module.exports.updateAccessRole = function (data, res) {
  masterObject.Role.findOne({ key: data.role }, 'key', function (err, role) {
    if (err) {
      document.sendResponse('something went wrong please try again', 405, 'error', 'none', res)
    } else if (role) {
      acl.whatResources(role.key, function (err, resultArray) {
        if (err) {
          document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
          var resultResources = Object.keys(resultArray);
          async.forEach(resultResources, function (item, callback) {
            acl.removeAllow(role.key, item, resultArray[item], function (err) {
              if (err) {
                if (err.code == 9) {
                  callback();
                } else {
                  callback(err)
                }
              } else {
                callback();
              }

            })
          }, function (err) {
            if (err) {
              res.send(err);
            } else {
              createRole(data, res);
            }
          });

        }
      })

    } else {
      document.sendResponse('Invalid Role', 404, 'error', 'none', res)
    }
  })

}

module.exports.assignRoleToUser = function (data, res) {
  if (document.isFieldFilled(data.userId)) {
    masterObject.Role.find({ key: { $in: data.roles } }, 'key', function (err, masterRoles) {
      if (err) {
        document.sendResponse(err, 405, 'error', 'none', res)
      } else if (data.roles.length == masterRoles.length) {
        acl.userRoles(data.userId, function (err, roles) {
          if (err) {
            document.sendResponse(err, 405, 'error', 'none', res)
          } else {
            if (data.flag == true) {
              console.log('removing roles' + roles)
              _.forEach(roles, function (item) {
                acl.removeUserRoles(data.userId, item);
              })
            }
            console.log('assigning roles:' + data.roles)
            acl.addUserRoles(data.userId, data.roles, function (err, result) {
              if (!err) {
                document.sendResponse('none', 200, 'roles assigned', 'none', res)
                updateUserRecord(data.userId);
              } else {
                document.sendResponse(err, 405, 'error', 'none', res)
              }
            })
          }
        })

      } else {
        document.sendResponse('Invalid Roles', 404, 'error', 'none', res)
      }
    })
  } else {
    document.sendResponse('invalid input', 406, 'error', 'none', res)
  }
}


module.exports.assignedPermissionToUser = function (data, res) {
  acl.userRoles(data.userId, function (err, result) {
    if (err) {
      res.status(404).send(err)
    } else {
      if (result.length < 1) {
        result.push('Default')
      }
      acl.whatResources(result, function (err, resources) {
        if (err) {
          console.log(err)
        } else {
          var resourceArray = Object.keys(resources);
          extractMasterResource(resourceArray, resources, res);
        }
      })
    }
  })
}
module.exports.assignedRolesToUser = function (data, res) {
  acl.userRoles(data.userId, function (err, result) {
    if (err) {
      res.status(404).send(result)
    } else if (result) {
      var response = {}
      response.roles = result
      document.sendResponse('none', 200, 'none', response, res)
      // // res.status(200).send(resources)
    }
  })
}

var updateUserRecord = function (id) {

  acl.userRoles(id, function (err, result) {
    if (err) {
      log(err)
    } else if (result.length > 0) {
      console.log(result);
      documentObject.User.findOneAndUpdate({ 'userId': id }, { roles: result }, function (err, result) {
        if (err) {
          log(err)
        } else {
          log('user role updated')
        }
      });
    } else {
      // do nothing
    }
  });

}

module.exports.assignedOrderResourcesToUser = function (data, res) {
  acl.userRoles(data.userId, function (err, result) {
    if (err) {
      res.status(404).send(err)
    } else if (result) {
      acl.whatResources(result, function (err, resources) {
        if (err) {
          document.sendResponse('error', 405, 'error', err, res)
        } else {
          console.log(resources)
          // var response = {}
          // response.resources = 
          // console.log('step 1')
          grabOrderResources(resources, res)
        }
      });
    } else {
      // console.log(err)
      document.sendResponse('invalid user', 404, 'error', 'none', res)
    }
  });
}




module.exports.assignedPermissionToRole = function (data, res) {
  masterObject.Role.count({ key: data.role }, function (err, count) {
    if (err) {
      document.sendResponse('error', 406, 'none', err, res)
    } else if (count >= 0) {
      acl.whatResources(data.role, function (err, resources) {
        // var response = {}
        var resourceArray = Object.keys(resources);
        extractMasterResource(resourceArray, resources, res);
        // response.resources = resources        
        // document.sendResponse('none', 200, 'none', response, res)
      })
    } else {
      document.sendResponse('error', 406, 'none', response, res)
    }
  })
}

module.exports.removerPermissionOfRole = function (data, res) {
  masterObject.Role.count({ key: data.role }, function (err, count) {
    if (count > 0) {
      acl.removeAllow(data.role, data.resource, data.permissions, function (err, result) {
        if (err) {
          document.sendResponse('error in operation please try again', 401, 'error', 'none', res)
        } else {
          document.sendResponse('okay', 200, 'done', 'done', res)
        }
      })
    } else {
      document.sendResponse('invalid role', 404, 'error', 'none', res)
    }
  })
}


var grabOrderResources = function (data, res) {
  var result = [];
  let x = data.length;
  masterObject.Resource.find({ type: 'order' }, function (err, resources) {
    if (err) {
      result = [];
      // console.log(err);
      res.json(Utility.output('err', 'ERROR', err));
    } else if (resources) {
      // console.log(resources)
      res.json(Utility.output('done', 'SUCCESS', resources));
      //  return resources;
    } else {
      res.json(Utility.output('invalid result', 'SUCCESS', result));
    }
  })



}
var extractMasterResource = function (input, data, res) {
  var output = [];
  masterObject.Resource.find({ key: { $in: input } }, function (err, result) {
    if (err) {
      document.sendResponse('error', 406, 'none', err, res)
    } else {
      // console.log(result.length)
      masterObject.Permission.find({}, function (err, masterPermissions) {
        if (err) {
          document.sendResponse('error', 406, 'none', response, res);
        } else if (masterPermissions) {
          var resultset = JSON.parse(JSON.stringify(result))
          let sequence = [];
          async.forEach(resultset, function (item, callback) {
            item.permissions = {};
            // sequencing of resources
            // some simple logic using array
            // step A: check if item exist in array
            // console.log(item._id, item.next)
            // let currentIndex = sequence.indexOf(item._id);
            // let nextIndex = sequence.indexOf(item.next);
            // if (currentIndex > -1) {
            //   // a.1;
            //   // add next item to position + 1;

            //   let offset = currentIndex + 1;
            //   // check next item available or not
            //   if (sequence.indexOf(item.next) > -1) {
            //     //remove current 
            //     sequence.splice(currentIndex, 1);
            //     // add current
            //     sequence.splice(sequence.indexOf(item.next), 0, item._id);

            //     console.log(currentIndex + ':-----current + next found-------:', sequence.indexOf(item.next))
            //   } else {
            //     sequence.splice(offset, 0, item.next);
            //     console.log(currentIndex + ':-----curreny found-------:', offset)
            //   }



            // } else {
            //   // step B: if item is not in array if next item exist in array
            //   if (nextIndex > -1) {
            //     // b.1 add current item to position - 1;
            //     let offset = (nextIndex) > 0 ? nextIndex - 1 : 0;
            //     // console.log(offset)
            //     sequence.splice(nextIndex, 0, item._id);
            //     console.log(nextIndex + ':-----next found-------:', offset)

            //   } else {
            //     // stec C: if both dont exist append them to array
            //     console.log('not found simply append')
            //     sequence.push(item._id);
            //     sequence.push(item.next);
            //     console.log(sequence.indexOf(item._id) + ':-----both new-------:', sequence.indexOf(item.next))
            //   }
            // }
            // console.log('new iteration--------->')
            // console.log(sequence)
            // console.log('.............length:', sequence.length)
            async.forEach(masterPermissions, function (permItem, callback) {

              if (data[item.key].indexOf(permItem.key) > -1) {
                item.permissions[permItem.key] = true;
                callback()
              } else {
                item.permissions[permItem.key] = false;
                callback()
              }

            }, function (err) {
              if (err) {
                callback(err)
              } else {
                output.push(item);
                callback();
              }

            })
            // item.permissions = transformPermissions(data[item.key], masterPermissions);

          }, function (err) {
            if (err) {
              document.sendResponse('error', 406, 'none', err, res)
            } else {
              // console.log(sequence);
              document.sendResponse('none', 200, 'none', output, res)
            }
          })
        } else {
          document.sendResponse('error', 406, 'none', 'undefined permissions', res)
        }
      })


    }
  })
}

module.exports.resourceUpdateIDs = function () {
  masterObject.Resource.find().exec(function (err, results) {
    if (err) {
      log(err)
    } else {
      var newD = [];
      _.forEach(results, function (item) {
        item._id = uuid.v4();
        newD.push(item);
      })
      masterObject.Resource.remove(function (err) {
        if (err) throw err;
        else
          masterObject.Resource.collection.insert(newD, function (err) {
            console.log(err)
          });
      });
    }
  })
}
module.exports.assignRoleToAllUser = function (data, res) {
  documentObject.User.find({}, 'userId', function (err, userResults) {

    _.forEach(userResults, function (item) {
      acl.addUserRoles(item.userId, data.role, function (err, result) {
        if (!err) {
          // document.sendResponse('none', 200, 'roles assigned', 'none', res)
          // updateUserRecord(data.userId);
        } else {
          console.log(err);
        }
      })
    });

  })

}
