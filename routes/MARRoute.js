var express = require('express');
var router = express.Router();
var MARController=new require(APP_ROOT_PATH+'/controllers/MARController');
var MARInstance=new MARController();
router.post('/history/medication/get',function(req,res,next){
    MARInstance.getMedications(req,res,next);
});
router.get('/report/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    MARInstance.getReport(req,res,next);
});
router.post('/history/add',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(req.body.history_id)
        return res.json(Utility.output('Are you trying to update existing MAR History?', 'VALIDATION_ERROR'));
    MARInstance.addEditHistory(req,res,next);
});
router.put('/history/edit',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.history_id)
        return res.json(Utility.output('Are you trying to add new MAR History?', 'VALIDATION_ERROR'));
    MARInstance.addEditHistory(req,res,next);
});
router.post('/history/adr/add',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(req.body.adr_history_id)
        return res.json(Utility.output('Are you trying to update existing ADR History?', 'VALIDATION_ERROR'));
    MARInstance.addEditADRHistory(req,res,next);
});
router.put('/history/adr/edit',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.adr_history_id)
        return res.json(Utility.output('Are you trying to add new ADR History?', 'VALIDATION_ERROR'));
    MARInstance.addEditADRHistory(req,res,next);
});
module.exports = router;
