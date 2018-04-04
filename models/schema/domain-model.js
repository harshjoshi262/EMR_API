/**
 * Created visual studio code
 * User: the legend shaikhriyaz
 * Date: 4/22/13
 * Time: 5:14 PM 
 */

var mongoose = require('mongoose');
var uuid = require('node-uuid');

// var sql = require("mssql");
// var dbConn = {
//   server: "172.16.99.44",
//   database: "MEDCARE_LWEH_TRAINING",
//   user: "sa",
//   password: "Rational@1"
// };

//Export parent and child Schema both
module.exports = function () {

  var Schema = mongoose.Schema;

  var labOrderResultsSchema = mongoose.Schema({
    _id: { type: String, deafult: uuid.v4() },
    labOrder: String,
    patientId: String,
    patientName: String,
    mrn: Number,
    visitId: String,
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
    resultValue: String,
    parameterName: String,
    rangeUpper: Number,
    rangeLower: Number,
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
    userId: String
  });

  var admissionSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientName: String,
    mrn: Number,
    visitId: String,
    visit_admissionNo: String,
    visitDateTime: Number,
    visitType: String,
    admittingDoctors: [{
      doctor: String
    }],
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
    tariffName: String,
    doctorId: String,
    patientId: String,
    transferDetails: [],
    transferDateTime: { type: Number, default: null },
    created_at: { type: Date, default: Date.now(), required: true }
  }, { versionKey: false });

  var dischargeSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    admissionId: String,
    patientId: String,
    visitId: String,
    doctorId: String,
    dischargeStatus: String,
    dischargeDoneBy: String,
    dischargeDateTime: { type: Number, default: Date.now() }

  });

  var radiologySchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    doctorId: String,
    patientId: String,
    patientName: String,
    mrn: Number,
    visitId: String,
    visitNo: Number,
    visitDateTime: Number,
    visitType: String,
    primaryDoctor: String,
    clinicalDepartment: String,
    clinicName: String,
    testCategory: String,
    testCode: String,
    testName: String,
    modality: String,
    testResult: String,
    diacomImg: String,
    orderDate: Number,
    testResultDateTime: Number,
    testResultStatus: String,
    resultDoneBy: String,
  });

  var personalInfoSchema = mongoose.Schema({
    pfNo: { type: String, required: true },
    dateOfJoining: { type: Number, required: true },
    employeeNumber: { type: String, required: true },
    panNo: { type: String, required: true },
    accessCardNo: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    emailId: { type: String, required: true, unique: true },
    passportNo: { type: String, required: true },
    education: { type: String, required: true },
    experience: { type: String, required: true },
    mobileNo: { type: String, required: true }
  }, { _id: false, versionKey: false });

  var addressInfoSchema = mongoose.Schema({
    name: { type: String, required: true },
    addressType: { type: String, required: true },
    address: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    postCode: { type: String, required: true },
    contact: { type: String, required: true },
    alternativeContact: { type: String, required: true }
  }, { _id: false, versionKey: false })

  var dependentInfoSchema = mongoose.Schema({
    dependentName: { type: String, required: false },
    sex: { type: String, required: false },
    age: { type: String, required: false },
    relationship: { type: String, required: false }
  })

  var userSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    accessCode: { type: String },
    userType: { type: String, required: true },
    email: { type: String },
    name: { type: String, required: false },
    firstName: { type: String, default: '', required: true },
    lastName: { type: String, default: '', required: true },
    gender: { type: String, required: true },
    prefix: { type: String, required: true },
    userGroup: { type: String, required: true },
    userSubGroup: { type: String, required: false },
    dob: { type: Number, required: false },
    userAssociation: { type: String, required: false },
    unitDepartments: [{ type: String }],
    personalInfo: Object,
    addressInfo: Object,
    dependentInfo: [dependentInfoSchema],
    unit: { type: String, required: false },
    password: { type: String, required: false },
    hospitalName: { type: String, required: false },
    userRole: String,
    userId: { type: String, required: true },
    signCode: { type: String, required: false },
    resetPasswordToken: String,
    resetPasswordExpires: String,
    status: Boolean,
    userDetails: Object,
    userImg: String,
    attachments: [],
    // change password field for user registration
    setPassword: { type: String, required: true, default: "false" },
    // active or inactive user
    userStatus: { type: String, required: true, default: "inactive", enum: ["active", "inactive", 'unstable'] },
    created_at: { type: Number, required: false },
    created_by: { type: String, required: false },
    updated_at: { type: String, required: false },
    updated_by: { type: String, required: false },
    hisUserId: { type: Number, unique: true, required: true },
    custom_status: { type: Number, default: -99 },
    is_login: { type: Number, default: 0 },//0=Logout//1=Online,
    sockets: [],
    disabledNotifications: [],
    disabledSms: [],
    expiryDate: { type: Number },
    roles: [],
    cabins: [],
    NursingStations: []
  }, { collection: "User", versionKey: false });
  var userPermissionSchema = mongoose.Schema({
    _id: String,
    user: String,
    role: String,
    unit: String,
    resource: String,
    permissions: { type: Object }
  });
  var userRoleSchema = mongoose.Schema({
    _id: String,
    user: String,
    role: String,
    unit: String
  })
  var dummyUserSchema = mongoose.Schema({
    accessCode: { type: String, unique: true },
    userType: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    name: { type: String, required: false },
    firstName: { type: String, default: '', required: true },
    lastName: { type: String, default: '', required: true },
    gender: { type: String, required: true },
    prefix: { type: String, required: true },
    userGroup: { type: String, required: true },
    userSubGroup: { type: String, required: false },
    dob: { type: Number, required: false },
    userAssociation: { type: String, required: false },
    unitDepartments: [{ type: String }],
    personalInfo: Object,
    addressInfo: Object,
    dependentInfo: [dependentInfoSchema],
    unit: { type: String, required: false },
    password: { type: String, required: false },
    hospitalName: { type: String, required: false },
    userRole: { type: String, required: false },
    userId: { type: String, required: true },
    signCode: { type: String, required: false },
    resetPasswordToken: String,
    resetPasswordExpires: String,
    userDetails: Object,
    userImg: String,
    attachments: [],
    // change password field for user registration
    setPassword: { type: String, required: true, default: "false" },
    // active or inactive user
    userStatus: { type: String, required: true, default: "inactive", enum: ["active", "inactive"] },
    created_at: { type: Number, required: false },
    created_by: { type: String, required: false },
    updated_at: { type: String, required: false },
    updated_by: { type: String, required: false },
    hisUserId: { type: Number, unique: true, required: true },
    custom_status: { type: Number, default: -99 },
    is_login: { type: Number, default: 0 },//0=Logout//1=Online,
    sockets: []
  }, { collection: "User", versionKey: false });

  userSchema.statics.encryptPassword = function (password, done) {
    var bcrypt = require('bcryptjs');
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        return done(err);
      }

      bcrypt.hash(password, salt, function (err, hash) {
        done(err, hash);
      });
    });
  };

  userSchema.statics.validatePassword = function (password, hash, done) {
    var bcrypt = require('bcryptjs');
    bcrypt.compare(password, hash, function (err, res) {
      done(err, res);
    });
  };

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
    // documentTemplate: Object
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


  var OTSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    doctorId: String,
    patientId: String,
    visitId: String,
    procedureName: String,
    OTdate: Number,
    OTtheatre: String,
    OTtable: String,
    OTstartTime: Number,
    OTendTime: Number,
    remarks: String,
    specialRequirements: String
  });

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

  var customUnitSchema = mongoose.Schema({
    unitname: String,
    refLow: Number,
    refHigh: Number,
    criticalLow: Number,
    criticalHigh: Number,
    entryLimitLow: Number,
    entryHighLimit: Number,
    defaultValue: Number
  }, { versionKey: false });

  var customSubVitalSchema = mongoose.Schema({
    vitalId: String,
    speciality: String,
    calculation: String,
    entryType: String,
    vitalName: String,
    vitalValue: String,
    qualifier: String,
    //unit: [customUnitSchema],
    //subVitals: [customSubVitalSchema],
    unit: [customUnitSchema],
    subVitals: []
  }, { _id: false, versionKey: false });

  //schema of clientApp
  var clientAppSchema = mongoose.Schema({
    _id: { type: String },
    apiKey: String,
    environment: String,
    type: String,
    date: Number
  }, { collection: 'ClientApp', versionKey: false });
  //Schema for allergy

  var allergiesSchema = mongoose.Schema({
    doctorId: { type: String, required: true },
    visitId: { type: String, required: true },
    date: { type: Number, default: Date.now() },
    patientId: { type: String, required: true },
    _id: { type: String, default: uuid.v4() },
    allergyName: { type: String, required: true },
    allergyId: { type: String, default: null },
    nature: { type: String, required: true },
    observedHistory: { type: String, required: true },
    severity: { type: String, required: true },
    comments: { type: String, default: null },
    originators: [String],
    markNKA: Boolean,
    symptoms: String,
    originationDate: { type: Number, default: Date.now() },
    state: { type: String, required: true, enum: ["active", "inactive", "error"] },
    type: { type: String, required: true }
  }, { versionKey: false });

  // Schema for Postings

  var postingSchema = mongoose.Schema({
    visitId: { type: String, required: true },
    doctorId: { type: String, required: true },
    patientId: { type: String, required: true },
    postingType: { type: String, required: true },
    sliderValue: { type: Number, required: true },
    comment: { type: String, default: null },
    _id: { type: String, default: uuid.v4() },
    date: { type: Number, required: true },
    title: { type: String, default: null },
    status: { type: String, default: null },
    mediaFileURL: { type: String, default: null },
    markError: { type: Boolean, default: false },
    fileType: { type: String, default: null }
  }, { versionKey: false });

  var scanDocs = mongoose.Schema({
    visitId: { type: String, required: true, default: null },
    doctorId: { type: String, required: true, default: null },
    patientId: { type: String, required: true, default: null },
    scanDocType: { type: String, required: true, default: null },
    comment: { type: String, required: true, default: null },
    _id: { type: String, required: true, default: null },
    date: { type: Number, default: Date.now() },
    title: { type: String, required: true, default: null },
    mediaFileURL: { type: String, required: true, default: null },
    fileName: { type: String, required: true },
  }, { versionKey: false });

  var customPOCSchema = mongoose.Schema({
    test: { type: String, required: true },
    unit: { type: String },
    minRange: { type: Number, required: true },
    maxRange: { type: Number, required: true },
    testValue: { type: Number, required: true },
    Entry_Limit_min: { type: String, required: true },
    Entry_Limit_max: { type: String, required: true }
  }, { _id: false, versionKey: false });

  var POCSchema = mongoose.Schema({
    doctorId: { type: String, required: true },
    visitId: { type: String, required: true },
    patientId: { type: String, required: true },
    POCTestName: { type: String, required: true },
    POCtestList: [customPOCSchema],
    _id: { type: String, default: uuid.v4() },
    POCdate: { type: Number, required: true },
    markError: { type: Boolean, default: false }
  });

  // Flag Schema
  var flagSchema = mongoose.Schema({
    visitId: { type: String, required: true },
    doctorId: { type: String, required: true },
    patientId: { type: String, required: true },
    timeStamp: { type: Number, required: true, default: Date.now() },
    _id: { type: String, default: uuid.v4() },
    flagName: { type: String, required: true },
    flagValue: { type: Boolean, default: false },
    markError: { type: Boolean, default: false },
    flagType: { type: String, default: null, required: true },
    is_active: { type: Boolean, default: true, required: true },
    _m_flag: { type: mongoose.Schema.Types.ObjectId, ref: 'm_flags' },
    Identifier: Object
  }, { versionKey: false });

  var intakeOutputSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    doctorId: { type: String, required: true },
    visitId: { type: String, required: true },
    intakeOutputType: { type: String, required: true },
    value: { type: Number, required: true },
    qualifiers: { type: String, required: true },
    patientId: { type: String, required: true },
    markError: { type: Boolean, default: false },
    timeStamp: { type: Number, required: true },
    parameter: { type: String, required: false },
    POPFlag: { type: Boolean, default: false }


  }, { versionKey: false });


  var medicationSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    orderType: { type: String, required: false },
    patientId: { type: String, required: false },
    drugName: { type: String, required: false },
    drugId: { type: String, required: false },
    drugGenericName: { type: String, required: false },
    dosage: { type: String, required: false },
    dosage_unit: { type: String, required: false },
    schedule: { type: String, default: '' },
    status: { type: String, enum: ["active", "inactive", "error"], required: true },
    startDate: { type: Number, required: false },
    endDate: { type: Number, default: null },
    orderBy: { type: String, required: false },
    visitId: { type: String, required: false },
    date: { type: Number, required: true },
    onBehalf: { type: Object, default: {} },
    orderId: String,
    orderItems: Object,
    ItemCode: String,
    Molecule_HIS_ID: String,
    discharge_medication: { type: Boolean, default: false },
    medicationDispensedStatus: { type: String, default: null }
  }, { versionKey: false });

  var medicationHistorySchema = mongoose.Schema({
    medication_id: { type: String, required: true },
    actual_medication_time: { type: String, required: true },
    registered_medication_time: { type: String, required: true },
    reason: { type: String, required: false },
    action: { type: String, required: true },
    administration_user_id: { type: String, required: true },
    verification_user_id: { type: String, required: false },
    comment: { type: String, required: false },
    history_date: { type: Number, required: true },
    reset: { type: Boolean, default: false },
    new_time: { type: String },
    updated_by: { type: String, required: true },
    updated_from_medical_reconciliation: { type: Boolean, default: false },
    date_of_creation: { type: Number, required: false },
    date_of_modification: { type: Number, required: false }
  }, { versionKey: false });

  var medicationADRHistorySchema = mongoose.Schema({
    medication_id: { type: String, required: true },
    signed_by: { type: String, required: true },
    comment: { type: String, required: false },
    date_of_modification: { type: String, required: true }
  }, { versionKey: false });

  var visitRecords = mongoose.Schema({
    recordType: String, // assessment, assessment.image, prescription, prescription.image, diagnosticsReport, diagnosticsReport.image, 
    // investigationAdvice, investigationAdvice.image, certificate, certificate.image
    recordId: String
  }, { _id: false, versionKey: false });

  // Vital 1.0
  // var vitalRecordSchema = mongoose.Schema({
  //   _id: { type: String, default: uuid.v4() },
  //   visitId: { type: String, required: true },
  //   //doctorId: { type: String, required: true },
  //   userId: { type: String, required: true },
  //   patientId: { type: String, required: true },
  //   date: { type: Number, required: true },
  //   vitalId: { type: String },
  //   speciality: String,
  //   createdOn: { type: Number, default: Date.now() },
  //   calculation: String,
  //   entryType: String,
  //   vitalName: { type: String, required: true },
  //   vitalValue: String,
  //   qualifier: String,
  //   shortName: { type: String, default: " " },
  //   markError: { type: Boolean, default: false, required: true },
  //   unit: [customUnitSchema],
  //   subVitals: [customSubVitalSchema],
  //   isAbnormal: { type: Boolean, deafult: false, required: false }
  // }, { versionKey: false });

  // Vital 1.1

  var customSubVitalSchema = mongoose.Schema({
    vitalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vitalName: String,
    vitalValue: Number,
    qualifier: String,
    unitId: { type: mongoose.Schema.Types.ObjectId, required: true }
  }, { _id: false, versionKey: false });

  var vitalRecordSchema = mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId },
    visitId: { type: String, required: true },
    //doctorId: { type: String, required: true },
    userId: { type: String, required: true },
    patientId: { type: String, required: true },
    date: { type: Number, required: true },
    vitalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId },
    createdOn: { type: Date, default: new Date() },
    IsParentVital: { type: Boolean },
    calculation: String,
    age: { type: Number, required: true },
    vitalName: { type: String, required: true },
    vitalValue: { type: Number, required: true },
    qualifier: String,
    markError: { type: Boolean, default: false, required: true },
    subVitals: [customSubVitalSchema],
    isAbnormal: { type: Boolean, deafult: false, required: false }
  }, { versionKey: false });


  var userAuditSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    userId: String,
    recordType: String,
    recordId: String,
    action: String,
    subjectId: String,
    subject: String,
    timeStamp: Number
  });

  var visitSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    dateEpoch: { type: Number, default: Date.now() },
    dischargeDate: Number,
    HIS_PatientId: { type: Number },
    IsCancel: { type: Boolean, default: false },
    patientId: { type: String, ref: 'Patient' },
    doctorId: String,
    OPD_IPD_ID: { type: Number, required: true },
    OPD_IPD: Number,
    Unit: Number,
    QueueNo: { type: Number },
    lmpDate: { type: Number, deafult: 0 },
    menopause: { type: Boolean, deafult: false },
    MLCDetails: Object,
    IsMLC: { type: Boolean, default: false },
    IsEmergancy: { type: Boolean, default: false },
    HIS_Doctor_ID: { type: Number, required: true },
    encounterType: String,
    VisitTypeID: Number,
    visitDate: Number,
    primaryDoctor: String,
    clinicalDepartment: String,
    clinicName: String,
    kinInfo: [],
    payeeInfo: [],
    BedInformation: {
      "admissionDate": Number,
      "transferDate": Number,
      "bedId": Number,
      "bedNo": String,
      "roomNo": String,
      "wardName": String,
      "admittingDepartment": Number,
      "admittingDoctor": String,
      "WardID": Number,
      "FromBedId": Number,
      "FromBed": String,
      "FromWardId": Number,
      "FromWard": String,
    },
    IsTransfer: { type: Boolean, default: false },
    transferHistory: [],
    // documents: [{ type: String, ref: 'PatientDocument' }],
    // admission: [{ type: String, ref: 'Admission' }],
    patientType: String,
    //location: String,
    // room: { type: String, default: "" },
    visitNo: String,
    careProvider: String,
    flag: String,
    flagValue: String,
    visitType: String,
    cancelDate: Number,
    cancelRemark: String,
    primaryDiagnosis: { type: String, default: '' },
    searchBox: {
      "name": String,
      "mrn": String,
      "bedId": Number,
      "bedNo": String,
      "roomNo": String,
      "cinicalDepartment": String,
      "location": String,
      "DepartmentID": Number,
      "WardID": Number,
      "CabinID": Number,
      "clinicName": String,
    },
    dischargeDateTime: { type: Number },
    isDischarged: { type: String, default: 'false', required: true, enum: ['true', 'false'] },
    isActive: { type: String, default: 'true', required: true, enum: ['true', 'false'] },
    accessFlag: { type: Boolean, deafult: false, required: false },
    socketId: { type: String },
    disabled: [],
    isDemoPatient: { type: Boolean, default: false }
  }, { versionKey: false });

  var lockSchema = mongoose.Schema({
    userId: String,
    timeStamp: Number,
    stopWatch: Number
  }, { _id: false, versionKey: false });

  var patientSchema = new mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    name: { type: String, default: null },
    prefix: String,
    PrefixId: Number,
    RaceID: String,
    HIS_PatientId: { type: Number, required: true },
    age: Number,
    gender: { type: String, default: null },
    lastVisit: Number,
    mrn: { type: String, unique: true, required: true },
    registrationDate: Number,
    GenderCode: { type: Number, enum: [1, 2, 3] },
    nric: { type: String },
    passportNo: { type: String, default: " " },
    maritalStatus: { type: String, default: null },
    religion: String,
    nationality: String,
    NationalityID: Number,
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
  }, { versionKey: false });

  // patientSchema.statics.TestMasterData = function (id, callback) {
  //   var conn = new sql.Connection(dbConn);
  //   var req = new sql.Request(conn);
  //   this.findOne({ _id: id }, 'mrn HIS_PatientId nric unitId nationality', function (err, result) {
  //     conn.connect().then(function () {
  //       req.query('select Description from M_NationalityMaster where ID=' + parseInt(result.nationality)).then(function (recordset) {
  //         console.dir(recordset[0].Description);
  //         recordset[0].Description;
  //         result.nationality=recordset[0].Description;
  //         callback(err,result);
  //       }).catch(function (err) {
  //         console.log('Request Error ' + err.message);
  //       })
  //     }).catch(function (err) {
  //       console.log('Connection Error: ' + +err.message)
  //     })
  //   });
  // }

  patientSchema.statics.getIdsForOrder = function (id, callback) {
    return this.findOne({ _id: id }, 'mrn HIS_PatientId nric unitId ', callback);
  }

  var observerSchema = new mongoose.Schema({
    doctorId: { type: String, ref: 'Doctor' },
    isSigned: String,
    signedOn: String
  }, { _id: false, versionKey: false });

  var patientDocumentSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    title: String,
    doctorId: { type: String, ref: 'Doctor' },
    isSigned: Boolean,
    patientId: String,
    visitId: String,
    updatedOn: { type: Number, default: Date.now() },
    signedOn: Number,
    isClinicalNote: String,
    observerList: [observerSchema],
    doctorList: [{ type: String, ref: 'Doctor' }],
    filledDocument: Object,
    preview: { type: Object, default: null },
    doctorInfo: Object
  }, { versionKey: false });

  var complaintSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    visitId: { type: String, required: true },
    doctorName: { type: String, required: true },
    date: { type: Number, required: true },
    icdCode: { type: String, required: true },
    displayName: { type: String },
    description: { type: String, required: true },
    text_problem: { type: String },
    status: { type: String, default: "active", required: true, enum: ["active", "inactive", "error"] },
    type: { type: String, enum: ["primary", "secondary", "problem"] },// primary or secondary
    severity: { type: String, required: true },
    duration: { type: String, required: false },
    comments: { type: String, default: null },
    createdOn: { type: Number, default: Date.now() }
  }, { versionKey: false });

  var mappedDisgnosis = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientId: { type: String, required: true },
    visitId: { type: String, required: true },
    diagnosis: { type: String, ref: 'Complaint' },
    problems: [{ type: String, ref: 'Complaint' }]
  }, { versionKey: false });

  var nandaDisgnosis = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    visitId: { type: String, required: true },
    templateId: { type: String, required: true },
    status: { type: String, default: "active", required: true, enum: ["active", "inactive", "error"] },
    severity: { type: String, required: true },
    duration: { type: String, required: false },
    count: { type: String, required: false },
    fromDate: { type: Number },
    comments: { type: String, default: null },
    diagnosis: {
      Order_within_Class: String,
      Diagnosis_Code: Number,
      Diagnosis_Label: String,
      Diagnosis_Definition: String,
      Domain: { type: Object, required: true },
      Class: { type: Object, required: true }
    },
    createdOn: { type: Number, default: Date.now() }
  }, { versionKey: false });


  var templateSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    title: String,
    doctorId: String,
    template: Object,
    created_at: { type: String, default: Date.now() },
    created_by: { type: String, default: 'ClinicareApp' },
    status: { type: Boolean, default: true },
    isNandacodeRequired: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    formCount: { type: Number, default: 0 }
  }, { versionKey: false });

  var notificationUser = mongoose.Schema({
    _id: String,
    userId: { type: String, required: true },
    socketId: { type: String, required: false },
    disabled: [],
    newCount: { type: Number, default: 0 }
  }, { versionKey: false });

  var notification = mongoose.Schema({
    _id: { type: String, required: true, default: uuid.v4() },
    userId: { type: String, ref: 'User' },
    visit: { type: String, default: null },
    userType: { type: String, required: false },
    nType: { type: Number, required: true, ref: 'notificationType' },
    message: { type: String, required: false },
    namespace: { type: String, default: '/' },
    location: { type: String, required: false },
    urgency: { type: String, required: false },
    new: { type: Boolean, required: true, default: true },
    isEnabled: { type: Boolean, required: false, default: true },
    date: { type: Number, required: false, default: Date.now() },
    patientName: { type: String },
    patientMrn: { type: String, },
    fromUserName: { type: String, required: false, default: null },
    fromUserId: { type: String, required: true, default: null },
    payload: []
  }, { versionKey: false });


  var chatMessagesSchema = new Schema({
    _room: { type: Schema.Types.ObjectId, ref: 'rooms' },
    message: { type: String, default: '' },
    _user_file: { type: Schema.Types.ObjectId, ref: 'user_files' },
    message_type: { type: String, default: 'TEXT' },//TEXT/FILE
    message_status: { type: Boolean, default: 'ACTIVE' },//ACTIVE/DELETED
    date_of_creation: { type: Number, required: true },
    date_of_modification: { type: Number, required: true }
  });
  var chatMessageUsersSchema = new Schema({
    _room: { type: Schema.Types.ObjectId, ref: 'rooms' },
    _chat_message: { type: Schema.Types.ObjectId, ref: 'chat_messages' },
    _sender: { type: String, ref: 'User' },
    _receiver: { type: String, ref: 'User' },
    is_read: { type: Number, default: false },//0=Unrerad/1=Read
    read_date: { type: Number }
  });
  var roomSchema = new Schema({
    _group: [{ type: Schema.Types.ObjectId, ref: 'group' }],
    _members: [{ type: String, ref: 'User' }],
    date_of_creation: { type: Number, required: true },
    date_of_modification: { type: Number, required: true }
  });
  var groupSchema = new Schema({
    name: { type: String, default: 'unnamed' },
    image: { type: String, default: null },
    group_admins: [{ type: String, ref: 'User', required: true }],
    _members: [{ type: String, ref: 'User', required: true }],
    member_joining: { type: Schema.Types.Mixed },
    status: { type: Number, required: true, default: 1 },//1=Active,2=Inactive, 3=Closed
    date_of_creation: { type: Number, required: true },
    date_of_modification: { type: Number, required: true }
  });

  var mimsInteractionSchema = Schema({
    _id: String,
    patient: String,
    reason: String,
    mimsResponse: Object,
    userId: String,
    suspectedOrders: [],
    orders: [],
    drugs: []
  })

  var notificationTypeSchema = new mongoose.Schema({
    _id: Number,
    key: { type: String, required: true },
    const: String,
    isActive: { type: Boolean, default: true },
    smsActive: { type: Boolean, default: true },
    actions: [{ type: String, ref: 'notificationAction' }]
  }, { versionKey: false });

  var notificationActionSchema = new mongoose.Schema({
    _id: Number,
    key: { type: String, required: true },
    displayName: String,
    isActive: { type: Boolean, default: false }
  }, { versionKey: false });

  var CounterSchema = Schema({
    _id: { type: String, required: true },
    sequence: { type: Number, default: 0 }
  }, { versionkey: false });

  var counter = mongoose.model('counter', CounterSchema);

  var mimsReasonsSchema = mongoose.Schema({
    Index: Number,
    Description: String,
    Code: String,
    Ch_Count: Number
  });
  var rabbitMQSchema = mongoose.Schema({
    messageNo: { type: Number, unique: true },
    data: String,
    queue: String,
    type: String,
    date_of_creation: Number,
    date_time: String,
    routingKey: { type: String },
    status: { type: Boolean, default: false },
    IsSendToRIS: Boolean,
    OPD_IPD_ID: Number,
    MRN: String,
    errorMessage: String
  }, { versionKey: false });

  var ImagingLogSchema = mongoose.Schema({
    messageNo: { type: Number, unique: true },
    data: String,
    queue: String,
    type: String,
    date_of_creation: Number,
    date_time: { type: Date, deafult: new Date() },
    MessageType: { type: String },
    Operation: { type: String },
    status: { type: Boolean, default: false },
    OPD_IPD_ID: Number,
    MRN: String,
    errorMessage: String
  }, { versionKey: false });

  var conflictRecordSchema = mongoose.Schema({
    _id: { type: String, default: uuid.v4() },
    index: Number,
    passportNumber: { type: String },
    mrn: { type: String, default: null },
    nric: { type: String },
    name: { type: String },
    timestamp: { type: Number, default: Date.now() },
    date: { type: Date, default: new Date() },
    existingNric: { type: String },
    existingPassport: { type: String },
    registrationDate: { type: String },
    existingRegistrationDate: { type: String }
  })
  conflictRecordSchema.pre('save', function (next) {
    var doc = this;
    counter.findByIdAndUpdate({ _id: 'conflicts' }, { $inc: { sequence: 1 } }, function (error, done) {
      if (error) {
        return next(error);
      } else if (!done) {
        new counter({ "_id": "conflicts", sequence: 0 }).save(function (err, success) {
          if (err)
            return next(error);
          else
            if (success)
              if (success.sequence !== undefined)
                doc.index = success.sequence + 1;
          next();
        });
      } else {
        if (done)
          if (done.sequence !== undefined)
            if (done.sequence)
              doc.index = done.sequence;
        next();
      }
    });
  });

  rabbitMQSchema.pre('save', function (next) {
    var doc = this;
    counter.findByIdAndUpdate({ _id: 'RMQID' }, { $inc: { sequence: 1 } }, function (error, done) {
      if (error) {
        return next(error);
      } else if (!done) {
        new counter({ "_id": "RMQID", sequence: 0 }).save(function (err, success) {
          if (err)
            return next(error);
          else
            if (success)
              if (success.sequence !== undefined)
                doc.messageNo = success.sequence + 1;
          next();
        });
      } else {
        if (done)
          if (done.sequence !== undefined)
            if (done.sequence)
              doc.messageNo = done.sequence;
        next();
      }
    });
  });

  ImagingLogSchema.pre('save', function (next) {
    var doc = this;
    counter.findByIdAndUpdate({ _id: 'ImagingCounter' }, { $inc: { sequence: 1 } }, function (error, done) {
      if (error) {
        return next(error);
      } else if (!done) {
        new counter({ "_id": "ImagingCounter", sequence: 0 }).save(function (err, success) {
          if (err)
            return next(error);
          else
            if (success)
              if (success.sequence !== undefined)
                doc.messageNo = success.sequence + 1;
          next();
        });
      } else {
        if (done)
          if (done.sequence !== undefined)
            if (done.sequence)
              doc.messageNo = done.sequence;
        next();
      }
    });
  });

  var resourceSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    key: { type: String, unique: true, required: true },
    displayName: { type: String },
    imgUrl: { type: String, default: '' },
    identifier: { type: String, default: '' },
    uiRef: { type: String, default: '' },
    type: { type: String }
  });
  var immunisationSchema = new mongoose.Schema({
    immunisation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'M_Immunisations', required: true },
    user_id: { type: String, required: true },
    patientId: { type: String, required: true },
    givenDoses: [{
      given_by: { type: String, required: true },
      given_on: { type: Number, required: true },
      dose_details: { type: mongoose.Schema.Types.ObjectId, ref: 'M_Immunisations_Age_Doses', required: true },
      comment: { type: String },
    }],
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });

  var ncpTemplateSchema = new mongoose.Schema({
    checkbox_values: { type: Schema.Types.Mixed },
    date_top: { type: Number, required: true },
    date_bottom: { type: Number },
    time_top: { type: String, required: true },
    time_bottom: { type: String },
    patientId: { type: String, required: true },
    userId: { type: String, required: true },
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });

  var dischargeSummarySchema = new mongoose.Schema({
    visitId: { type: String, required: true },
    signedBy: { type: String, required: true },
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });
  var prescriptionNoteSchema = new mongoose.Schema({
    non_selected_orders: { type: Object },
    visitId: { type: String, required: true },
    advice: { type: String },
    signedBy: { type: String, required: true },
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });

  var growthChartSchema = new mongoose.Schema({
    date: { type: Number, required: true },
    Age: { type: Number, required: true },
    Weight: { type: Number },
    Length: { type: Number },
    "Head Circumference": { type: Number },
    patientId: { type: String, required: true },
    userId: { type: String, required: true },
    comment: { type: String },
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });
  var continuousNoteSchema = new mongoose.Schema({
    date: { type: Number, required: true },
    note: { type: String, required: true },
    treatment: { type: String },
    patientId: { type: String, required: true },
    visitId: { type: String, required: true },
    userId: { type: String, required: true },
    date_of_creation: { type: Number },
    date_of_modification: { type: Number }
  });
  var AGENDASchema = mongoose.Schema({
    name: { type: String, default: null },
    data: { type: Schema.Types.Mixed },
    type: { type: String, default: null },
    priority: { type: Number, default: 0 },
  });
  var prefIcdCodes = mongoose.model("prefIcdCodes", new mongoose.Schema({
    _id: { type: String, default: uuid.v4(), required: true },
    userId: { type: String, required: true },
    isProblem: { type: Boolean, required: true },
    payload: [{ type: String }]
  }, { versionKey: false }));

  var prefIcdList = mongoose.model("prefIcdList", new mongoose.Schema({
    _id: { type: String, default: uuid.v4(), required: true },
    UserId: { type: String, required: true },
    IsProblem: { type: Boolean, required: true },
    ListName: { type: String, required: true },
    Items: [],
    Groups: [],
    Index: { type: Number },
    created_at: { type: Number, required: false },
    created_by: { type: String, required: false },
    updated_at: { type: Number, required: false },
    updated_by: { type: String, required: false },
    unit: { type: Number, default: 1 }
  }, { versionKey: false }));

  var prefIcdItem = mongoose.model('prefIcdItem', mongoose.Schema({
    DisplayName: { type: String, required: true },
    IcdCode: { type: String, required: true },
    Description: { type: String, required: true },
    IcdId: { type: String, required: true },
    GroupId: { type: String, default: null },
    GroupName: { type: String, deafult: '' },
    IsGroup: { type: Boolean, deafult: false },
    Index: { type: Number },
    _id: String
  }, { versionKey: false }));

  var prefIcdGroup = mongoose.model('prefIcdGroup', mongoose.Schema({
    _id: String,
    GroupName: String,
  }));
  var nursing_tasks = mongoose.model('nursing_tasks', mongoose.Schema({
    _id: String,
    Urgency: { type: String, default: null },
    PatientId: String,
    VisitId: String,
    Task: { type: String, required: true },
    Comment: { type: String, default: null },
    Instruction: { type: String, default: null },
    Schedule: { type: String },
    CpoeOrderId: { type: String, default: null },
    StartDate: { type: Number, default: 0 },
    StopDate: { type: Number, default: 0 },
    Created_At: { type: Number, default: Date.now() },
    Created_By: String,
    Updated_At: { type: Number, default: Date.now() },
    Updated_By: String,
    IsComplete: { type: Boolean, default: false },
    IsError: { type: Boolean, default: false }
  }));
  var userPreferredICDListSchema = new mongoose.Schema({
    list_name: { type: String, default: 'Untitled' },
    _user_preferred_icd_groups: [{ type: Schema.Types.ObjectId, ref: 'user_preferred_icd_groups' }],
    userId: { type: String, required: true },
    icd: [{ type: Schema.Types.Mixed, required: true }],
    isProblem: { type: Boolean, default: true, required: true },
    isFavorite: { type: Boolean, default: true, required: true },
    user_preferred: [{ type: String }],
    _parent_list: { type: Schema.Types.ObjectId, ref: 'user_preferred_icd_list' },
    date_of_creation: { type: Number, required: true },
    date_of_modification: { type: Number, required: true }
  });

  var userPreferredICDGroups = new mongoose.Schema({
    group_name: { type: String, default: 'Untitled' },
    icd: [{ type: Schema.Types.Mixed, required: true }],
    date_of_creation: { type: Number, required: true },
    date_of_modification: { type: Number, required: true }
  });

  var user_preferred_icd_list = mongoose.model('user_preferred_icd_list', userPreferredICDListSchema, 'user_preferred_icd_list');
  var user_preferred_icd_groups = mongoose.model('user_preferred_icd_groups', userPreferredICDGroups, 'user_preferred_icd_groups');
  var Resource = mongoose.model('Resource', resourceSchema);
  var conflictRecord = mongoose.model('conflictRecord', conflictRecordSchema);
  var notificationType = mongoose.model('notificationType', notificationTypeSchema);
  var notificationAction = mongoose.model('notificationAction', notificationActionSchema)
  var rabbitMQModel = mongoose.model('rabbitmq', rabbitMQSchema, 'rabbitmq');
  var imagingLogModel = mongoose.model('imagingLog', ImagingLogSchema, 'imagingLog');
  // var allergyMaster = mongoose.model('M_Allergy',mimsAllergySchema );
  // var mimsDrugList = mongoose.model('M_NDrugMasters', mimsDrugSchema);
  var mimsInteractionAudit = mongoose.model('mimsInteractionAudit', mimsInteractionSchema);
  var patientNandaDiagnosis = mongoose.model('Nanda_Diagnosis', nandaDisgnosis);
  var scanDocument = mongoose.model('scanDocument', scanDocs);

  var Notification = mongoose.model("Notification", notification);
  var NotificationUser = mongoose.model("NotificationUser", notificationUser);
  var User = mongoose.model("User", userSchema);
  var DummyUser = mongoose.model("dummyuser", dummyUserSchema);
  var Medication = mongoose.model("Medication", medicationSchema);
  var medication_histories = mongoose.model("medication_histories", medicationHistorySchema);
  var medication_adr_histories = mongoose.model("medication_adr_histories", medicationADRHistorySchema);

  var mappedComplaint = mongoose.model("MappedComplaint", mappedDisgnosis);
  var Complaint = mongoose.model("Complaint", complaintSchema);
  var Admission = mongoose.model("Admission", admissionSchema);
  var Patient = mongoose.model("Patient", patientSchema);

  var Allergies = mongoose.model("Allergies", allergiesSchema);
  var Postings = mongoose.model("Positngs", postingSchema);
  var PatientDocument = mongoose.model("PatientDocument", patientDocumentSchema);
  var FormTemplate = mongoose.model("FormTemplate", templateSchema);
  var POC = mongoose.model("POC", POCSchema);
  var labOrderResults = mongoose.model("labOrderResults", labOrderResultsSchema);
  var intakeOutput = mongoose.model("intakeOutput", intakeOutputSchema);
  var flag = mongoose.model("flag", flagSchema);
  var Vital = mongoose.model("Vital", vitalRecordSchema);
  var Radiology = mongoose.model("Radiology", radiologySchema);
  var Discharge = mongoose.model("Discharge", dischargeSchema);
  //Model of the doctorSchema
  var user_audit = mongoose.model("user_audit ", userAuditSchema);
  var Doctor = mongoose.model('Doctor', doctorSchema);
  //Model of the drugSchema
  var Drug = mongoose.model('Drug', drugSchema);
  var OT = mongoose.model('OT', OTSchema);

  //model of clientAppSchema
  var ClientApp = mongoose.model('ClientApp', clientAppSchema);
  //model of visit
  var Visit = mongoose.model('Visit', visitSchema);

  var rooms = mongoose.model('rooms', roomSchema);
  var groups = mongoose.model('groups', groupSchema);
  var chatMessages = mongoose.model('chat_messages', chatMessagesSchema);
  var chatMessageUsers = mongoose.model('chat_message_users', chatMessageUsersSchema);
  var userPermission = mongoose.model('userPermissions', userPermissionSchema);
  var immunisations = mongoose.model('immunisations', immunisationSchema, 'immunisations');
  var ncpTemplates = mongoose.model('ncp_templates', ncpTemplateSchema, 'ncp_templates');
  var growthCharts = mongoose.model('growth_charts', growthChartSchema, 'growth_charts');
  var continuousNotes = mongoose.model('continuous_notes', continuousNoteSchema, 'continuous_notes');
  var mimsReasons = mongoose.model('m_mimsreason', mimsReasonsSchema);
  var Agenda = mongoose.model("agenda_jobs", AGENDASchema, "agenda_jobs");
  var discharge_summary = mongoose.model("discharge_summary", dischargeSummarySchema, "discharge_summary");
  var prescription_notes = mongoose.model("prescription_notes", prescriptionNoteSchema, "prescription_notes");

  var documentModelObject = {
    counter: counter,
    scanDocument: scanDocument,
    User: User,
    DummyUser: DummyUser,
    user_audit: user_audit,
    Doctor: Doctor,
    Patient: Patient,
    Admission: Admission,
    Complaint: Complaint,
    Drug: Drug,
    ClientApp: ClientApp,
    Visit: Visit,
    POC: POC,
    OT: OT,
    ConflictRecord: conflictRecord,
    NandaDiagnosis: patientNandaDiagnosis,
    MappedComplaint: mappedComplaint,
    Discharge: Discharge,
    Allergies: Allergies,
    PatientDocument: PatientDocument,
    FormTemplate: FormTemplate,
    Postings: Postings,
    labOrderResults: labOrderResults,
    intakeOutput: intakeOutput,
    flag: flag,
    Vital: Vital,
    Medication: Medication,
    medication_histories: medication_histories,
    medication_adr_histories: medication_adr_histories,
    Radiology: Radiology,
    Notification: Notification,
    NotificationUser: NotificationUser,
    rooms: rooms,
    chat_messages: chatMessages,
    chat_message_users: chatMessageUsers,
    groups: groupSchema,
    mimsInteractionAudit: mimsInteractionAudit,
    mimsReasons: mimsReasons,
    notificationType: notificationType,
    notificationAction: notificationAction,
    RabbitMQ: rabbitMQModel,
    ImagingLog: imagingLogModel,
    prefIcdCodes: prefIcdCodes,
    userPermission: userPermission,
    Resource: Resource,
    immunisations: immunisations,
    ncp_templates: ncpTemplates,
    growth_charts: growthCharts,
    continuous_notes: continuousNotes,
    prefIcdGroup: prefIcdGroup,
    prefIcdList: prefIcdList,
    prefIcdItem: prefIcdItem,
    agenda_jobs: Agenda,
    nursing_tasks: nursing_tasks,
    discharge_summary: discharge_summary,
    prescription_notes: prescription_notes,
    user_preferred_icd_list: user_preferred_icd_list,
    user_preferred_icd_groups: user_preferred_icd_groups
    // drugList: mimsDrugList,
    // m_allergy: allergyMaster
  };
  return documentModelObject;
}
