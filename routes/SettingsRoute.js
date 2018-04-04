var express = require('express');
var router = express.Router();
var SettingsController=new require(APP_ROOT_PATH+'/controllers/SettingsController');
var ICDPreferredController=new SettingsController.ICDPreferredController();
var QuickLinkController=new SettingsController.QuickLinkController();
var document = require('../models/db_model.js');
router.post('/icd/preferred/add', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    if(req.body.list_id)
        return res.json(Utility.output('Are you trying to update existing list?', 'VALIDATION_ERROR'));
    ICDPreferredController.addEditICDPreferredList(req,res,next);
});
router.put('/icd/preferred/edit', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    if(!req.body.list_id)
        return res.json(Utility.output('Are you trying to new list?', 'VALIDATION_ERROR'));
    ICDPreferredController.addEditICDPreferredList(req,res,next);
});
router.get('/icd/preferred/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    ICDPreferredController.getListDetails(req,res,next);
});
router.put('/icd/preferred/group/remove', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    ICDPreferredController.removePreferredListGroup(req,res,next);
});
router.put('/icd/preferred/list/remove', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    ICDPreferredController.removePreferredList(req,res,next);
});
router.put('/icd/preferred/list/favorite', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    ICDPreferredController.copyOrMarkList(req,res,next);
});

router.get('/quick_link/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    QuickLinkController.getQuickLinks(req,res,next);
});
router.put('/quick_link/update',MIDDLEWARE.isLoggedIn,function(req,res,next){
    QuickLinkController.updateQuickLinks(req,res,next);
});





router.post('/icd/preffered/list', MIDDLEWARE.isLoggedIn, function (req, res) {
    SettingsController.createIcdPreferredList(req, res);
})

router.get('/icd/preffered/list', MIDDLEWARE.isLoggedIn, function (req, res) {
    req.check('isProblem', 'invalid flag').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            SettingsController.IcdPreferredList(req.decoded.userId, req.query.isProblem, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})
router.get('/icd/preffered/list/:listId', MIDDLEWARE.isLoggedIn, function (req, res) {
    req.checkParams('listId', 'invalid listId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            SettingsController.IcdPreferredListDetails(req.params.listId, req.decoded.userId, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})
router.put('/icd/preffered/list/:listId', MIDDLEWARE.isLoggedIn, function (req, res) {
    req.checkParams('listId', 'invalid listId').notEmpty();
    req.checkBody('payload', 'invalid payload').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            SettingsController.updateIcdPrefferedList(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})
router.delete('/icd/preffered/list/:listId/item/:code', MIDDLEWARE.isLoggedIn, function (req, res) {
    req.checkParams('listId', 'invalid listId').notEmpty();
    req.checkParams('code', 'invalid IcdCode').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            SettingsController.removeIcdCode(req.params.listId, req.decoded.userId, req.params.code, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
});
router.delete('/icd/preffered/list/:listId/group/:groupId', MIDDLEWARE.isLoggedIn, function (req, res) {
    req.checkParams('listId', 'invalid listId').notEmpty();
    req.checkParams('groupId', 'invalid groupId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            SettingsController.removeIcdGroup(req.params.listId, req.decoded.userId, req.params.groupId, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})

module.exports = router;
