var express = require('express');
var router = express.Router();
var ImmunisationController=new require(APP_ROOT_PATH+'/controllers/ImmunisationController');
var ImmunisationInstance=new ImmunisationController();
router.get('/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ImmunisationInstance.get(req,res,next);
});
router.post('/update',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ImmunisationInstance.update(req,res,next);
});
router.put('/delete',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ImmunisationInstance.delete(req,res,next);
});
module.exports = router;
