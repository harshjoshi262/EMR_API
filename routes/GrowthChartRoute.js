var express = require('express');
var router = express.Router();
var GrowthChartController=new require(APP_ROOT_PATH+'/controllers/GrowthChartController');
var GrowthChartInstance=new GrowthChartController();
router.get('/graph/data/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    GrowthChartInstance.getGraphData(req,res,next); 
});
router.get('/patient/records/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    GrowthChartInstance.getRecords(req,res,next); 
});
router.post('/patient/record/add',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(req.body.record_id)
        return res.json(Utility.output('Are you trying to update existing patient\'s Growth Chart record?', 'VALIDATION_ERROR'));
    GrowthChartInstance.addEditRecord(req,res,next);
});
router.put('/patient/record/edit',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.record_id)
        return res.json(Utility.output('Are you trying to add new patient\'s Growth Chart record?', 'VALIDATION_ERROR'));
    GrowthChartInstance.addEditRecord(req,res,next);
});
router.put('/patient/record/delete',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.record_id)
        return res.json(Utility.output('Record ID is required', 'VALIDATION_ERROR'));
    GrowthChartInstance.deleteRecords(req,res,next);
});
module.exports = router;
