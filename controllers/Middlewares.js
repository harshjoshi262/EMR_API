var jwt = require('jsonwebtoken');
module.exports=function Middlewares(){
    this.isLoggedIn=function(req,res,next){
        // check header or url parameters or post parameters for token
        var token = req.body.token || req.query.token || req.headers['x-access-token']
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, 'sofomo_pwd', function (err, decoded) {
                if (err) {
                    return res.json(Utility.output('Failed to authenticate token.','INVALID_TOKEN',{
                        success: false,
                        logout: true,
                        message: 'Failed to authenticate token.'
                    }));
                } else {
                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded
                    next()
                }
            })
        } else {
            return res.status(403).send({
                success: false,
                message: 'No token provided.'
            })
        }
    };
    // this.aclMiddleware=function(resource,permissions){

    // }
};
