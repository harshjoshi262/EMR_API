var mongoose = require('mongoose');
var uuid = require('node-uuid');
var MONGODB_CONFIG = require('config').get('mongodb');

var dbAclConnectionUrl = MONGODB_CONFIG.prefix + 'accessControl' + MONGODB_CONFIG.tail;
var aclConnections = mongoose.createConnection(dbAclConnectionUrl);
module.exports = function () {

    var resourceSchema = new mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        key: { type: String, unique: true, required: true },
        displayName: { type: String },
        imgUrl: { type: String, default: '' },
        identifier: { type: String, default: '' },
        uiRef: { type: String, default: '' },
        type: { type: String }
    }, { versionKey: false });
    var roleSchema = new mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        key: { type: String, required: true },
        displayName: { type: String },
        resources: [],
        unit: { type: Number, default: 1 }
    }, { versionKey: false })
    var userPermissionSchema = mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        user: String,
        role: [],
        unit: String,
        resources: [],
    }, { versionKey: false });
    var rolePermissionSchema = mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        user: { type: String, default: null },
        role: String,
        unit: String,
        resources: []
    }, { versionKey: false });

    var Resource = aclConnections.model('Resource', resourceSchema);
    var Role = aclConnections.model('role', roleSchema);
    var userPermission = aclConnections.model('userPermissions', userPermissionSchema);
    var rolePermission = aclConnections.model('rolePermission', rolePermissionSchema);
    var aclModels = {
        userPermission: userPermission,
        rolePermission: rolePermission,
        Resource: Resource,
        Role: Role
    }

    return aclModels;
};
