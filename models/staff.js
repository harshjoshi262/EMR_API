var mongoose=require('mongoose');
var staffSchema = mongoose.Schema({
    _id: { type: String},
    accessCode: String,
    firstName: String,
    EmpNo:String,
    Department:String,
    Category:String,
    email: String,
    lastName: String,
    userType:String,
    created_at: Number,
    updated_at: Number
});
module.exports=mongoose.model('Staff',staffSchema,'Staff');