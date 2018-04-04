var express = require('express');
var router = express.Router();
router.get('/get',MIDDLEWARE.isLoggedIn,function(req,res,next){
    new require(APP_ROOT_PATH+'/controllers/ContinuousNoteController')(req,res,next).get();
});
router.post('/add',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(req.body.note_id)
        return res.json(Utility.output('Are you trying to update existing note?', 'VALIDATION_ERROR'));
    new require(APP_ROOT_PATH+'/controllers/ContinuousNoteController')(req,res,next).addEditNote();
});
router.put('/edit',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.note_id)
        return res.json(Utility.output('Are you trying to add new note?', 'VALIDATION_ERROR'));
   new require(APP_ROOT_PATH+'/controllers/ContinuousNoteController')(req,res,next).addEditNote();
});
router.put('/delete',MIDDLEWARE.isLoggedIn,function(req,res,next){
    if(!req.body.note_id)
        return res.json(Utility.output('Record ID is required', 'VALIDATION_ERROR'));
    new require(APP_ROOT_PATH+'/controllers/ContinuousNoteController')(req,res,next).deleteNote();
});
module.exports = router;
