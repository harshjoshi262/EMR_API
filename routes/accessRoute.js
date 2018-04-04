var express = require('express'),
    router = express.Router(),
    accessController = require('../controllers/accessController.js');
var document = require('../models/db_model.js')
/// access controle 2.0

router.post('/resources', function (req, res) {
    req.checkBody('key', 'invalid resource key').notEmpty();
    req.checkBody('displayName', 'invalid display name').notEmpty();
    req.checkBody('imgUrl', 'invalid imgUrl').notEmpty();
    req.checkBody('identifier', 'invalid identifier').notEmpty();
    req.checkBody('type', 'invalid type').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.createResource(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
});


router.post('/permission/role', function (req, res) {
    // accessController.createRole(req.body, res);
    req.checkBody('role', 'invalid role name').notEmpty();
    req.checkBody('bucket', 'invalid permissions set').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.createRole(req.body, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
});

router.get('/permission/role/:roleId', function (req, res) {
    var data = {};
    data.key = req.params.roleId;
    // accessController.retrieveRolePermissions(data, res);
    req.checkParams('roleId', 'invalid roleId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.getRolePermissions(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
});

router.put('/permission/role/:roleId', function (req, res) {
    // accessController.createRole(req.body, res);
    req.checkParams('roleId', 'invalid roleID').notEmpty();
    req.checkBody('resources', 'invalid resources').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            var data = req.body;
            data.role = req.params.roleId
            accessController.updateRolePermissions(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})

router.get('/permission/role', function (req, res) {
    accessController.getAllRoles(res);
})

router.get('/permission/role/user/:userId', function (req, res) {
    var data = {};
    data.userId = req.params.userId;
    // accessController.retrieveRolePermissions(data, res);
    req.checkParams('userId', 'invalid userId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.getAssignedRoleToUser(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})

router.get('/permission/user/:userId', function (req, res) {
    var data = {};
    data.key = req.params.userId;
    req.checkParams('userId', 'invalid userId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.getUserPermissions(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
});

router.put('/permission/user/:userId/role', function (req, res) {
    var data = {};
    data.userId = req.params.userId;
    data.roles = req.body.roles;
    req.checkBody('roles', 'roles field is required').notEmpty();
    req.checkParams('userId', 'invalid userId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.assignRolesToUser(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})

router.put('/permission/group/:userGroup/role', function (req, res) {
    var data = {};
    data.userGroup = req.params.userGroup;
    data.roles = req.body.roles;
    req.checkBody('roles', 'roles field is required').notEmpty();
    req.checkParams('userGroup', 'invalid userGroup').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.assignRoleToUserGroup(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})

router.post('/permission/user/faq/:userId/role', function (req, res) {
    var data = {};
    data.userId = req.params.userId;
    data.roles = req.body.roles;
    req.checkBody('roles', 'roles field is required').notEmpty();
    req.checkParams('userId', 'invalid userId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            accessController.userHasRole(data, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})

module.exports = router;