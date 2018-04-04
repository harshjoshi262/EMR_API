/**
 * Created visual studio code
 * User: the legend shaikhriyaz
 * Date: 4/22/13
 * Time: 5:14 PM 
 */

var mongoose = require('mongoose');
var uuid = require('node-uuid');

//Export parent and child Schema both
module.exports = function () {
  var Schema = mongoose.Schema;

  //doctor Schema named as doctorSchema
  var doctorSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patients: [{ type: String, ref: 'Patient' }],
    //    doctorPreferences : [kvpSchema],
    accessCode: String,
    password: String,
    hospitalName: String,
    patients: [],
    createdOn: Number,
    updatedOn: Number,
    documentTemplate: Object
  }, { collection: 'Doctor', versionKey: false });

  var dosageSchema = new mongoose.Schema({
    doseValue: Number,
    doseUnit: String,
    numberOfDoses: String,
    doseFrequency: {
      displayValue: String,
      value: String
    },
    //    doseFrequency : String,
    numDays: Number
  }, { _id: false, versionKey: false });

  var drugDosagesSchema = mongoose.Schema({
    genericDrug: String,
    brandedDrug: String,
    presentation: String,
    dosages: [dosageSchema],
    remarks: String,
    drugs: { type: String, ref: Drug }
  }, { _id: false, versionKey: false });

  var drugSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    name: String,
    make: String,
    class: String,
    type: String,
    isAvailable: { type: Boolean, default: true },
    stock: { type: Number, default: 1 },
    cost: { value: Number, quantity: Number },
    generic: String,
    conditions: [String],
    contraIndications: [{ type: String, default: "NA" }],
    sideEffects: [String],
    allergies: [String]

  }, { collection: 'Drug', versionKey: false });

  // custom param vitals  
  var customParamVitalSchema = mongoose.Schema({
    key: String,
    value: String,
    unit: String,
    max: { type: String, default: null },
    min: { type: String, default: null },
    qualifiers: [String]
    //        timeStamp:{type : Number, default: Date.now()}
  }, { _id: false, versionKey: false });

  //schema of clientApp
  var clientAppSchema = mongoose.Schema({
    _id: { type: String },
    apiKey: String,
    environment: String,
    type: String,
    date: Number
  }, { collection: 'ClientApp', versionKey: false });

  var cpoeOrderItem = mongoose.Schema({
    code: { type: String, default: null },
    name: { type: String, default: null },
    description: { type: String, default: null },
    minQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },
    category: { type: String, default: null },
    subCategory: { type: String, default: null },
    type: { type: String, default: null },
    isConfidential: { type: Boolean, default: false },
    authorization: { type: Boolean, default: false },
    consign: { type: Boolean, default: false },
    specialApproval: { type: Boolean, default: false },
    activeFromDate: { type: String, default: null },
    activeToDate: { type: String, default: null },
    provider: String
  }, { _id: false, versionKey: false });

  var cpoeOrderSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    doctorId: String,
    patientId: String,
    patientName: { type: String, default: null },
    mrn: Number,
    visitId: String,
    visitType: { type: String, default: null },
    visit_admissionNo: { type: String, default: null },
    primaryDoctor: { type: String, default: null },
    orderingDoctorName: { type: String, default: null },
    clinicalDepartment: { type: String, default: null },
    clinicName: { type: String, default: null },
    serviceCode: { type: String, default: null },
    serviceName: { type: String, default: null },
    encounterType: { type: String, default: null },
    orderCategory: { type: String, default: null },
    orderSubCategory: { type: String, default: null },
    orderItems: [],
    isFavorite: { type: Boolean, default: false },
    frequencyMaster: [{ frequencyType: String, values: [String] }],
    orderStatus: String,
    orderDate: String,
  }, { versionKey: false });

  //Schema for allergy

  var allergiesSchema = mongoose.Schema(
    {
      date: { type: Number, default: Date.now() },
      patientId: String,
      _id: { type: String, default: uuid.v4() },
      allergyName: String,
      nature: String,
      observedHistory: String,
      severity: String,
      comments: String,
      originators: [String],
      markNKA: Boolean,
      symptoms: String,
      originationDate: { type: Number, default: Date.now() },
      markError: { type: Boolean, default: false }
    }, { versionKey: false });

  // Schema for Postings

  var postingSchema = mongoose.Schema(
    {
      patientId: String,
      postingType: String,
      sliderValue: Number,
      comment: String,
      _id: { type: String, default: uuid.v4() },
      date:  Number,
      title: String,
      status: String,
      mediaFileURL: String
    }, { versionKey: false }
  );

  //Schema for Lab Results

  var POCSchema = mongoose.Schema({
    patientId: String,
    POCTestName: String,
    POCtestList : [customPOCSchema],
    _id: { type: String, default: uuid.v4() },
    POCdate : Number
  });
  
  var AGENDASchema = mongoose.Schema({
    name:{type:String,default:null},    
    data:{type:Schema.Types.Mixed},   
    type:{type:String,default:null}, 
    priority:{type:Number,default:0}, 
 });

  var customPOCSchema = mongoose.Schema({
    test: String,
    unit: String,
    minRange : Number,
    maxRange : Number,
    testValue: Number
  }, { _id: false, versionKey: false });



// Flag Schema
  var flagSchema = mongoose.Schema ({
  flagName : String,
  flagValue : Boolean,
  _id: { type: String, default: uuid.v4() },
  patientId : String
  });

  

  //Lab Order Result Schema

  var labOrderResultsSchema = mongoose.Schema({
    _id : {type :String , deafult : uuid.v4()},
    labOrder: String,
    patientId : String,
    patientName: String,
    mrn: Number,
    visitId: Number,
    visitNo: Number,
    visitDate: Number,
    visitType: String,
    primaryDoctor: String,
    clinicalDepartment: String,
    clinicName: String,
    testCategory: String,
    testCode: String,
    testName: String,
    profileName: String,
    sampleNumber: Number,
    resultValue: Number,
    parameterName: String,
    rangeUpper: Number,
    rangeLower : Number ,
    organismName: String,
    antibioticsName: String,
    sensitivityResult: String,
    units: String,
    suggestion: String,
    footNotes: String,
    pathologistName: String,
    orderDate: Number,
    sampleCollectionDate: Number,
    sampleReceived: Number,
    sampleStatus: String,
    samplePriority: Number,
    testResult: Number,

});

var intakeOutputSchema = mongoose.Schema({
   _id : {type :String , deafult : uuid.v4()},
   intakeOutputType : String,
   value : Number,
   qualifiers : String,
   patientId : String


}, { versionKey: false });







  var visitRecords = mongoose.Schema({
    recordType: String, // assessment, assessment.image, prescription, prescription.image, diagnosticsReport, diagnosticsReport.image, 
    // investigationAdvice, investigationAdvice.image, certificate, certificate.image
    recordId: String
  }, { _id: false, versionKey: false });

  var vitalRecordSchema = mongoose.Schema({
    // _id:{type: String,default:uuid.v4()},
    visitId: String,
    doctorId: String,
    patientId: String,
    date: { type: Number, default: Date.now() },
    timeStamp: { type: String, default: null },
    vitals: [customParamVitalSchema]
  }, { versionKey: false });

  var admissionSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientName: String,
    mrn: String,
    visitId: String,
    visit_admissionNo: String,
    visitDateTime: String,
    visitType: String,
    admittingDoctor: String,
    admittingDepartment: String,
    admissionPurpose: String,
    admissionType: String,
    className: String,
    wardName: String,
    roomNo: String,
    bedNo: String,
    mlcCase: String,
    attendingDoctor: String,
    attendingDoctorClassification: String,
    nextOfKinName: String,
    nextOfKinMobileNo: String,
    nextOfKinResidentialAddress: String,
    nextOfKinRelation: String,
    patientType: String,
    companyName: String,
    tariffName: String
  }, { versionKey: false });

  var visitSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    date: { type: Number, default: Date.now() },
    dischargeDate: { type: Number },
    patientId: String,
    doctorId: String,
    patientName: String,
    mrn: Number,
    visit_opd_No: Number,
    visitDate: Number,
    primaryDoctor: String,
    clinicalDepartment: String,
    clinicName: String,
    nextOfKinName: String,
    nextOfKinMobileNo: String,
    nextOfKinResidentialAddress: String,
    nextOfKinRelation: String,
    patientType: String,
    companyName: String,
    tariffName: String,
    // new attributes
    location: { type: String, default: "OPD" },
    careProvider: { type: String, default: "Dr. Smith" },
    flag: { type: String, default: null },
    visitType: { type: String, default: "New" },
    primaryDiagnosis: { type: String, default: null },
    vitalRecords: [vitalRecordSchema],
    cpoeOrders: [{ type: String, ref: 'CpoeOrder' }],
    prescriptions: { type: String, ref: 'Prescription' },
    isDemoPatient:{ type: Boolean, default: false }
  }, { versionKey: false });


  var patientSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    name: { type: String, default: null },
    age: Number,
    gender: { type: String, default: null },
    lastVisit: { type: String, default: null },
    mrn: Number,
    nric: { type: Number, default: 0 },
    passportNumber: { type: Number, default: 0 },
    status: { type: String, default: null },
    dob: { type: String, default: null },
    emailId: { type: String, default: null },
    Occupation: { type: String, default: null },
    residentialAddress: { type: String, default: null },
    residentialCountry: { type: String, default: null },
    residentialState: { type: String, default: null },
    residentialCity: { type: String, default: null },
    residentialPostCode: { type: String, default: null },
    unitId: { type: String, default: null },
    patientImg: { type: String, default: null },
    mobile: { type: String, default: null },
    // isAttendant:{type:Boolean,default:false},
    visitRecords: [{ type: String, ref: 'Visit' }],
  }, { versionKey: false });

  var complaintSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientId: String,
    doctorId: String,
    visitId: String,
    doctorName: String,
    date: Number,
    icdCode: String,
    description: String,
    status: { type: String, default: "active" },
    text_problem:{type: String},
    type: String,// primary or secondary
    severity: String,
    duration: String
  }, { versionKey: false });
  var Complaint = mongoose.model("Complaint", complaintSchema);
  var Admission = mongoose.model("Admission", admissionSchema);
  var Patient = mongoose.model("Patient", patientSchema);
  var cpoeOrder = mongoose.model("CpoeOrder", cpoeOrderSchema);
  var Allergies = mongoose.model("Allergies", allergiesSchema);
  var Postings = mongoose.model("Positngs", postingSchema);
  var POC = mongoose.model("POC", POCSchema);
  var Agenda = mongoose.model("agenda_jobs", AGENDASchema,"agenda_jobs");
  
  var labOrderResults = mongoose.model("labOrderResults", labOrderResultsSchema);
  var intakeOutput = mongoose.model ("intakeOutput", intakeOutputSchema);
  var flag = mongoose.model ("flag",flagSchema);
  // var Vital = mongoose.model("Vital", vitalRecordSchema);
  //Model of the doctorSchema
  var Doctor = mongoose.model('Doctor', doctorSchema);
  //Model of the drugSchema
  var Drug = mongoose.model('Drug', drugSchema);

  //model of clientAppSchema
  var ClientApp = mongoose.model('ClientApp', clientAppSchema);
  //model of visit
  var Visit = mongoose.model('Visit', visitSchema);

  var documentModelObject = {
    Doctor: Doctor,
    Patient: Patient,
    Admission: Admission,
    Complaint: Complaint,
    Drug: Drug,
    ClientApp: ClientApp,
    Visit: Visit,
    POC: POC,
    Allergies: Allergies,
    Postings: Postings,
    labOrderResults : labOrderResults,
    intakeOutput : intakeOutput,
    flag : flag,
    agenda_jobs:Agenda,
    // Vital:Vital,
    CpoeOrder: cpoeOrder
  };
  return documentModelObject;
}
