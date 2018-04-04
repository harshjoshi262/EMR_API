var express = require('express');
var router = express.Router();
var notificationModel=require(APP_ROOT_PATH+'/models/notification_model');
router.put('/referral/request/is_accept',MIDDLEWARE.isLoggedIn,function(req,res,next){
    notificationModel.isAccept(req,res,next);
});
module.exports = router;
