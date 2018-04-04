var express = require('express');
var router = express.Router();
var TemplateController=new require(APP_ROOT_PATH+'/controllers/TemplateController');
var TemplateInstance=new TemplateController();
router.get('/ncp/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    TemplateInstance.getNCPTemplateData(req,res,next); 
});
router.post('/ncp/add',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(req.body.record_id)
        return res.json(Utility.output('Are you trying to update existing NCP record?', 'VALIDATION_ERROR'));
    TemplateInstance.addEditNCPRecord(req,res,next);
});
router.put('/ncp/edit',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.record_id)
        return res.json(Utility.output('Are you trying to add new NCP record?', 'VALIDATION_ERROR'));
    TemplateInstance.addEditNCPRecord(req,res,next);
});
router.get('/discharge_summary/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    TemplateInstance.getDischargeSummaryData(req,res,next);
});
router.get('/prescription_note/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    TemplateInstance.getPrescriptionNoteData(req,res,next);
});
router.put('/export/template',function(req,res,next){
    TemplateInstance.exportTemplates(req,res,next)
})
router.post('/export/template',function(req,res,next){
    TemplateInstance.importTemplates(req,res,next)
})
module.exports = router;
