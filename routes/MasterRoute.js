var express = require('express');
var router = express.Router();
var MasterController = new require('../controllers/MasterController');
var masterUtility = require('../models/master-utility-model');
var MasterControllerInstance = new MasterController();
router.get('/rehub/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.rehub_get(req, res, next);
});
router.get('/referral/services/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.referral_service_get(req, res, next);
});
router.get('/referral/services/get/:serviceName', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.referral_service_get(req, res, next);
});
router.get('/diet/types/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.diet_types_get(req, res, next);
});
router.get('/diet/enteral_nutritions/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    var MasterController = new require('../controllers/MasterController');
    var MasterControllerInstance = new MasterController();
    MasterControllerInstance.enteral_nutritions_get(req, res, next);
});
router.get('/drug/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.drug_search(req, res, next);
});
router.get('/medicalSupply', function (req, res, next) {
    MasterControllerInstance.medicalSupplySearch(req, res, next);
});

router.get('/solution/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.drug_search(req, res, next, search_over = 'SOL');
});
router.get('/additive/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.drug_search(req, res, next, search_over = 'INJ');
});
router.get('/get/all', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    console.log('get masters')
    MasterControllerInstance.get_all_masters(req, res, next);
});
router.get('/get/fields', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.get_master_fields(req, res, next);
});
router.get('/collection/data', function (req, res, next) {
    MasterControllerInstance.get_master_data(req, res, next);
});
router.post('/update/collection/data', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    MasterControllerInstance.update_master_data(req, res, next);
});
router.get('/units/get', function (req, res, next) {
    MasterControllerInstance.get_user_unit(req, res, next);
});
router.get('/labTest/category/:search', function (req, res, next) {
    MasterControllerInstance.getNewLabTestByCategory(req, res, next);
});
router.get('/labCategory', function (req, res, next) {
    //masterHISModule.getLabCategory(req, res)
    MasterControllerInstance.getLabCategory(req, res, next);
});
router.get('/help-text/by/key/get', function (req, res, next) {
    MasterControllerInstance.getHelpTextbyKey(req, res, next);
});

router.get('/imaging/item/:searchValue', function (req, res) {
    log('search imaging master', req.params.searchValue);
    masterUtility.searchImagingMaster(req, res);
})
router.get('/imaging/item/details/:searchValue', function (req, res) {
    masterUtility.imagingDetails(req, res);
})
router.get('/imaging/category', function (req, res) {
    // log('working fine')
    masterUtility.ImagingCategoryList(req, res);
})
router.get('/imaging/checklist/:category', function (req, res) {
    masterUtility.getImagingChecklist(req, res);
})
module.exports = router;
