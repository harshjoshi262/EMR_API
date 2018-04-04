var express = require('express');
var router = express.Router();
var PostingController=new require(APP_ROOT_PATH+'/controllers/PostingController');
var PostingInstance=new PostingController();
router.get('/convert/tiff2png',function(req,res,next){
    PostingInstance.tiff2PNG(req,res,next); 
});
module.exports = router;
