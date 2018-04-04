var express = require('express');
var router = express.Router();
router.get('/summary',MIDDLEWARE.isLoggedIn,function(req,res,next){
    new require(APP_ROOT_PATH+'/controllers/OrderController')(req,res,next).orderSummary();
});
module.exports = router;
