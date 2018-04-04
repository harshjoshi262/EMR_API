var uuid = require('node-uuid');
var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var patientSchema = Schema({
    _id: { type: String, default: uuid.v4() },
    name: { type: String, default: null },
    prefix: String,
    HIS_PatientId: { type: Number, required: true },
    age: Number,
    gender: { type: String, default: null },
    lastVisit: Number,
    mrn: { type: String, unique: true, required: true },
    registrationDate: Number,
    GenderCode: { type: Number, enum: [1, 2, 3] },
    nric: { type: String },
    passportNo: { type: String ,default:" "},
    maritalStatus: { type: String, default: null },
    religion: String,
    nationality: String,
    dob: Number,
    emailId: { type: String, default: null },
    Occupation: { type: String, default: null },
    residentialAddress: { type: String, default: null },
    residentialCountry: { type: String, default: null },
    residentialState: { type: String, default: null },
    residentialCity: { type: String, default: null },
    residentialPostCode: { type: String, default: null },
    unitId: { type: Number, default: null },
    patientImg: { type: String, default: null },
    mobile: { type: String, default: null },
    visitRecords: [{ type: String, ref: 'Visit' }],
    documents: [{ type: String, ref: 'PatientDocument' }],
    ALOS: String,
    status: String,
    patientLock: [],
    isActive: { type: Boolean, default: true }
});
module.exports=mongoose.model('patients',patientSchema,'patients');