var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var doctorSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    userId: String,// related to userSchema 
    patients: [{ type: String, ref: 'Patient' }],
    //    doctorPreferences : [kvpSchema],
    accessCode: String,
    firstName: String,
    specialization: String,
    sub_specialization: String,
    doctorType: String,
    gender: String,
    pfNo: Number,
    PANno: Number,
    joiningDate: Number,
    regNo: String,
    DID: String,
    email: String,
    degree: String,
    department: String,
    classification: String,
    middleName: String,
    lastName: String,
    password: String,
    hospitalName: String,
    createdOn: Number,
    updatedOn: Number
  });
module.exports=mongoose.model('Doctor',doctorSchema,'Doctor');