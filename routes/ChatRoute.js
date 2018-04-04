var express = require('express');
var router = express.Router();
var ChatController=new require(APP_ROOT_PATH+'/controllers/ChatController');
var ChatInstance=new ChatController();
router.get('/users/list',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ChatInstance.get_list(req,res,next);
});
router.post('/send/message',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ChatInstance.send_message(req,res,next);
});
router.post('/messages/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    ChatInstance.get_messages(req,res,next);
});
module.exports = router;
