var express = require('express');
var router = express.Router();
var UtilityController=new require(APP_ROOT_PATH+'/controllers/UtilityController');
var UtilityInstance=new UtilityController();
router.get('/convert/image/url_to_base64',function(req,res,next){
    UtilityInstance.image_url_to_base64(req,res,next);
});
router.get('/compare/rabbitmq/patient',function(req,res,next){
    UtilityInstance.compareRabbitMQPatients(req,res,next);
});
router.get('/convert/tiff2pdf',function(req,res,next){
    UtilityInstance.tiff2PDF(req,res,next);
});
router.get('/call/rabbitMQ',function(req,res,next){
    console.log(req);
    //UtilityInstance.callRabbitMQ(req,res,next);
});
router.get('/call/cron',function(req,res,next){
    var cronModel=require(APP_ROOT_PATH+'/models/cron_model');
    cronModel.modifyActiveOldVisits();
});
module.exports = router;
