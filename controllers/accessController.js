'use Strict'
var mongoose = require('mongoose')
var document = require('../models/db_model.js')
var uuid = require('node-uuid')
var async = require('async');
var _ = require('lodash');
var MONGODB_CONFIG = require('config').get('mongodb');
var documentObject = document.domainModel
var masterObject = document.mastersModel;
var accessObject = document.accessControlModel;

module.exports.createResource = function (req, res) {
    var data = req.body;
    var newResources = new accessObject.Resource(data);
    newResources._id = uuid.v4();
    newResources.save(function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res)
        } else {
            document.sendResponse('success', 200, 'done', {}, res)
        }
    })
}

module.exports.createRole = function (data, res) {
    var unit = data.unit ? data.unit : 1;
    var permissionSet = data.bucket;
    delete data['bucket'];
    var newRole = new accessObject.Role();
    newRole._id = uuid.v4();
    newRole.displayName = data.role;
    newRole.key = data.role.toLowerCase();
    newRole.resources = permissionSet;
    newRole.unit = unit;
    newRole.save(function (err, role) {
        if (err) {
            document.sendResponse('something went wrong please try again', 405, 'error', err, res);
        } else {
            document.sendResponse('success', 200, 'done', {}, res)
        }
    })
}

module.exports.getAllRoles = (res) => {
    accessObject.Role.find({}, 'displayName key unit', function (err, docs) {
        if (err) {
            document.sendResponse('Invalid Role', 404, 'error', 'none', res)
        } else {
            document.sendResponse('', 200, 'done', docs, res);
        }
    })
}

module.exports.updateRolePermissions = function (data, res) {

    accessObject.Role.findOne({ _id: data.role }, 'resources', function (err, docs) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res)
        } else if (docs) {
            docs = JSON.parse(JSON.stringify(docs));
            let resource = docs.resources;
            let tempResources = [];
            _.forEach(data.resources, function (temp) {
                let index = _.findIndex(resource, function (item) {
                    return temp.key == item.key;
                });
                if (index > -1) {
                    resource[index] = temp
                } else {
                    tempResources.push(temp._id)
                }
            });
            accessObject.Resource.find({ _id: { $in: tempResources } }, '_id', function (err, result) {
                if (err) {
                    document.sendResponse('server error', 501, 'error', err, res)
                } else {
                    if (result.length > 0) {
                        _.forEach(result, function (temp) {
                            let index = _.findIndex(data.resources, function (item) {
                                return item._id == temp._id;
                            });
                            if (index > -1) {
                                resource.push(data.resources[index]);
                            }
                        });

                    }
                    accessObject.Role.findOneAndUpdate({ _id: docs._id }, { 'resources': resource }, function (err) {
                        if (err) {
                            document.sendResponse('server error', 501, 'error', err, res)
                        } else {
                            document.sendResponse('', 200, 'done', resource, res);
                        }
                    })
                }
            })

        } else {
            document.sendResponse('Invalid Role', 404, 'error', null, res)
        }
    })


}


module.exports.assignRoleToUserGroup = function (data, res) {
    documentObject.User.find({ userGroup: data.userGroup }, 'userId')
        .exec(function (err, docs) {
            if (err) {
                document.sendResponse('', 404, 'error', err, res)
            } else if (docs.length > 0) {
                let userArray = docs.map(function (item) {
                    return item.userId
                });

                async.forEach(userArray, function (userItem, main_callback) {
                    assignRolesToSingleUser(userItem, data.roles, false, function (err) {
                        if (err) {
                            main_callback(err)
                        } else {
                            main_callback();
                        }
                    });
                    // main_callback()
                }, function (err) {
                    if (err) {
                        document.sendResponse('', 404, 'error', err, res)
                    } else {
                        document.sendResponse('', 200, 'done', 'operation successful', res);
                    }
                })

            } else {
                document.sendResponse('No Users in the group', 404, 'error', 'none', res)
            }
        })

}

module.exports.getRolePermissions = function (data, res) {
    var record = data.key.replace(/[/]/gi, '');
    var output = {};
    async.parallel([function (parallelCallback) {
        accessObject.Resource.find(function (err, result) {
            if (err) parallelCallback(err)
            else {
                output.resources = JSON.parse(JSON.stringify(result));
                parallelCallback();
            }
        })
    }, function (parallelCallback) {
        accessObject.Role.findOne({ _id: record }, function (err, result) {
            if (err) parallelCallback(err)
            else {
                output.rolePermissions = result ? result.resources : [];
                parallelCallback();
            }
        })
    }], function (err) {
        if (err) {
            res.send(err)
        } else {
            output.result = [];
            async.forEach(output.resources, function (resource, callback) {
                // console.log(resource.key);
                var index = _.find(output.rolePermissions, { "key": resource.key });
                var temp = Object.assign({}, resource);
                if (index != undefined) {
                    console.log(index);
                    temp['permissions'] = index.permissions;
                } else {
                    temp['permissions'] = {}
                }
                output.result.push(temp)
                callback();
            }, function (err) {
                if (err) res.send(err)
                else
                    res.send(output.result)
            })
            //    res.send( _.unionBy(output.rolePermissions.resources,output.resources,'key'))
        }

    })

}
module.exports.getUserPermissions = function (data, res) {
    var record = data.key.replace(/[/]/gi, '');
    console.log(record);
    var output = {};
    async.parallel([function (parallelCallback) {
        accessObject.Resource.find(function (err, result) {
            if (err) parallelCallback(err)
            else {
                output.resources = JSON.parse(JSON.stringify(result));
                parallelCallback();
            }
        })
    }, function (parallelCallback) {
        // find and their respective permission
        parallelCallback();
    }, function (parallelCallback) {
        accessObject.userPermission.findOne({ user: record }, function (err, result) {
            if (err) parallelCallback(err)
            else {
                getPermissionLookup(result.role, result.resources, function (err, lookup) {
                    if (err) {
                        parallelCallback(err);
                    } else if (lookup) {
                        output.Permissions = lookup;
                        parallelCallback();
                    } else {
                        output.Permissions = [];
                        parallelCallback();
                    }
                })
            }
        })
    }], function (err) {
        if (err) {
            document.sendResponse('error', '406', 'error', err, res)
        } else {
            output.result = [];
            async.forEach(output.resources, function (resource, callback) {
                // console.log(resource.key);
                var index = _.find(output.Permissions, { "key": resource.key });
                var temp = Object.assign({}, resource);
                if (index != undefined) {
                    // console.log(index);
                    temp['permissions'] = index.permissions;
                } else {
                    temp['permissions'] = {}
                }
                output.result.push(temp)
                callback();
            }, function (err) {
                if (err) {
                    document.sendResponse('error', '406', 'error', err, res)
                } else {
                    document.sendResponse('done', '200', 'success', output.result, res)
                }
            })

        }

    })

}


module.exports.userHasRole = function (data, res) {
    accessObject.userPermission.findOne({ 'user': data.userId, 'role': { $in: data.roles } }, function (err, result) {
        if (err) {
            document.sendResponse('error', '406', 'error', err, res)
        } else if (result) {
            var response = {
                isAllowed: true
            }
            document.sendResponse('done', 200, 'success', response, res)
        } else {
            var response = {
                isAllowed: false
            }
            document.sendResponse('done', 200, 'success', response, res)
        }
    })
}


module.exports.assignRolesToUser = function (data, res) {
    assignRolesToSingleUser(data.userId, data.roles, false, function (err) {
        if (err) {
            document.sendResponse('error', '406', 'error', err, res)
        } else {
            document.sendResponse('done', '200', 'success', null, res)
        }
    })
}
module.exports.getAssignedRoleToUser = function (data, res) {
    accessObject.userPermission.findOne({ user: data.userId }, 'user role')
        .populate({
            path: 'role',
            model: 'role',
            select: 'key displayName unit'
        })
        .exec(function (err, result) {
            if (err) {
                document.sendResponse('error', '406', 'error', err, res)
            } else {
                document.sendResponse('done', '200', 'success', result, res)
            }
        })
}
var assignRolesToMultipleUsersOverwrite = function (data, callback) {
    getPermissionLookup(data.roles, [], function (err, lookup) {
        if (err) {
            callback(err);
        } else if (lookup) {
            // 4. update user
            accessObject.userPermission.update({ user: { $in: data.users } }, { 'resources': lookup, 'role': data.roles }, { 'upsert': true }, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    // addRolesToUserRecord(data.users, data.roles);
                    callback();
                }
            })

        } else {
            callback("error")
        }
    })
}
var assignRolesToSingleUser = function (userId, inputRoles, overwrite, callback) {
    accessObject.userPermission.findOne({ user: userId }, function (err, resultUser) {
        if (err) {
            callback(err)
        } else {
            var roles = [];
            // console.log(resultUser.role)
            if (!resultUser) {
                overwrite = true;
            }
            roles = overwrite ? inputRoles : _.union(resultUser.role, inputRoles);
            // console.log(roles)
            //2. get all the permissions of role
            getPermissionLookup(roles, [], function (err, lookup) {
                if (err) {
                    callback(err);
                } else if (lookup) {
                    // 4. update user
                    accessObject.userPermission.findOneAndUpdate({ user: userId }, { 'role': roles }, { 'upsert': false, 'new': true }, function (err, result) {
                        if (err) {
                            callback(err);
                        } else if (result) {
                            callback();
                        } else {
                            var newUserPermission = accessObject.userPermission();
                            newUserPermission._id = uuid.v4();
                            newUserPermission.user = userId;
                            newUserPermission.resources = [];
                            newUserPermission.role = roles;
                            newUserPermission.save(function (err) {
                                if (err) {
                                    callback(err)
                                } else {
                                    documentObject.User.findOneAndUpdate({ 'userId': userId }, { 'userRole': newUserPermission.user }, { 'upsert': true }, function (err) {
                                        if (err) {
                                            callback(err)
                                        } else {
                                            callback();
                                        }
                                    })

                                }
                            });
                        }
                    })

                } else {
                    callback("error")
                }
            })
        }
    })
}
var getPermissionLookup = function (roles, userPermissions, callback) {
    accessObject.Role.find({ _id: { $in: roles } }, 'resources', function (err, rolepermissions) {
        if (err) {
            callback(err);
        } else {
            var resultPermissions = [];
            rolepermissions = _.map(rolepermissions, function (item) { return item.resources });
            rolepermissions = _.concat(rolepermissions, userPermissions);
            _.forEach(rolepermissions, function (item) {
                resultPermissions = _.concat(resultPermissions, item);
            })
            resultPermissions = _.groupBy(resultPermissions, 'key');
            //3. derive final permissions
            var lookup = [];
            _.forEach(resultPermissions, function (value, key) {
                var granted = {};
                // permission lookup                      
                _.forEach(value, function (itemResource) {
                    _.forEach(itemResource.permissions, function (value, key) {
                        if (granted[key] == undefined) {
                            granted[key] = value;
                        } else if (granted[key] == false) {
                            granted[key] = value;
                        }

                    })
                })
                //set permission to lookup result
                value[0].permissions = granted;
                lookup.push(value[0]);
            })
            callback(null, lookup);
        }
    })
}
var addRolesToUserRecord = function (users, roles) {
    accessObject.userPermission.update({ user: { $in: users } }, { 'role': roles }, { 'upsert': true }, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log('done');
        }
    })
};
var retrieveRolePermissions = function (data, res) {
    var record = data.key.replace(/[/]/gi, '');
    console.log(record);
    accessObject.Resource.aggregate([{
        $lookup: {
            from: "rolepermissions",
            localField: "key",
            foreignField: "resources",
            as: "bucket"
        }
    },
    {
        $unwind: { path: '$bucket', preserveNullAndEmptyArrays: true }
    },
    {
        $project: {
            "_id": "$_id",
            "displayName": "$displayName",
            "type": "$type",
            "key": "$key",
            "uiRef": "$uiRef",
            "identifier": "$identifier",
            "permissions": { $cond: { if: { $eq: ["$bucket.role", record] }, then: "$bucket.permissions", else: {} } },
            "role": { $cond: { if: { $eq: ["$bucket.role", record] }, then: record, else: record } }
        }
    }, {
        $sort: { permissions: -1 }
    },
    {
        $group: {
            _id: "$key",
            key: { $first: "$key" },
            permissions: { $first: "$permissions" },
            type: { $first: '$type' },
            role: { $first: "$role" },
            displayName: { $first: '$displayName' },
            uiRef: { $first: '$uiRef' },
            identifier: { $first: '$identifier' }
        }
    }
    ], function (err, result) {
        if (err) throw err
        else res.send(result)
    })
}
var retrieveUserPermissions = function (data, res) {
    var record = data.key.replace(/[/]/gi, '');
    console.log(record);
    accessObject.Resource.aggregate([{
        $lookup: {
            from: "userpermissions",
            localField: "key",
            foreignField: "resource",
            as: "bucket"
        }
    },
    {
        $unwind: { path: '$bucket', preserveNullAndEmptyArrays: true }
    },
    {
        $project: {
            "_id": "$_id",
            "displayName": "$displayName",
            "type": "$type",
            "key": "$key",
            "uiRef": "$uiRef",
            "identifier": "$identifier",
            "permissions": { $cond: { if: { $eq: ["$bucket.user", record] }, then: "$bucket.permissions", else: {} } },
            "user": { $cond: { if: { $eq: ["$bucket.user", record] }, then: record, else: record } }
        }
    }, {
        $sort: { permissions: -1 }
    },
    {
        $group: {
            _id: "$key",
            key: { $first: "$key" },
            permissions: { $first: "$permissions" },
            type: { $first: '$type' },
            user: { $first: "$user" },
            displayName: { $first: '$displayName' },
            uiRef: { $first: '$uiRef' },
            identifier: { $first: '$identifier' }
        }
    }
    ], function (err, result) {
        if (err) throw err
        else res.send(result)
    })
}
var roleFilter = function (object) {
    return object.role;
}
