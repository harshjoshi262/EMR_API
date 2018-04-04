var express = require('express');
var router = express.Router();
var MailboxController=new require(APP_ROOT_PATH+'/controllers/MailboxController');
var MailBoxInstance=new MailboxController();
MailBoxInstance.connection();
router.get('/inbox',MIDDLEWARE.isLoggedIn,function(req,res,next){
    MailBoxInstance.inbox(req,res,next);
});
router.get('/sent',MIDDLEWARE.isLoggedIn,function(req,res,next){
    MailBoxInstance.sent(req,res,next);
});
router.get('/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    MailBoxInstance.getMessage(req,res,next);
});
module.exports = router;
