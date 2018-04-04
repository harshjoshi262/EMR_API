
/*
  Server Response Status
  200 - OK, Text
  204 - OK, No Content
  404 - Not Found
  406 - Not Acceptable
  500 - internal Server Error
*/
// 'use Strict'
global.APP_ROOT_PATH = __dirname;
var express = require('express');
var compression = require('compression');
var mongoose = require('mongoose');
//mongoose.Promise = require('bluebird');
var Agenda = require('agenda');
var patient = require('./models/patient.js'),
  doctorModule = require('./models/doctor_model.js'),
  masterModule = require('./models/master-utility-model.js'),
  //masterHISModule = require('./models/SQLMastersModel.js'),
  pharmacyModule = require('./models/pharmacy.js'),
  notificationModel = require('./models/notification_model'),
  cpoeModule = require('./models/cpoe_model.js'),
  integration_model = require('./models/integration-model'),
  patient_model = require('./models/patient_model.js'),
  experiment = require('./models/test.js'),
  user_audit = require('./models/user_audit.js'),
  user_management = require('./models/user_mangement.js'),
  vitalsModule = require('./controllers/VitalController'),
  InteractionsController = require('./controllers/InteractionsController'),
  accessRoute = require('./routes/accessRoute.js'),
  multer = require('multer'),
  mkdirp = require('mkdirp'),
  bodyParser = require('body-parser'),
  jwt = require('jsonwebtoken'),
  acl = require('acl'),
  npid = require('npid'),
  access = require('./models/access_model.js'),
  request = require('request-promise');
const CONFIG = require('config');
var SMTP_CONFIG = CONFIG.get('SMTP');
global.ObjectID = require('mongoose').Types.ObjectId;
var logger = require('morgan');
var http = require('http');
var uuid = require('node-uuid');
var validator = require('express-validator');
var moment = require('moment')
require('graylog');
//require('./seeder/user_seeder');
var mimsInteraction = new InteractionsController();
global.Utility = require('./libs/utility');
var MiddlewareController = new require("./controllers/Middlewares");
global.MIDDLEWARE = new MiddlewareController();
global.CONSTANT = require('./config/constants');
/*Load configurations */
var GRAYLOG_CONFIG = CONFIG.get('graylog');
var EHR_SERVER_CONFIG = CONFIG.get('ehrserver')
console.log('NODE_ENV: ' + CONFIG.util.getEnv('NODE_ENV'));
console.log('process env', process.env.NODE_ENV);
var MONGODB_CONFIG = CONFIG.get('mongodb')
var FILE_CONFIG = CONFIG.get('fileUpload')
var schedule = require('./models/cron_model')
var fs = require('fs')
var nursing_route = require('./routes/nursingRoute');
var sqlsync = require('./controllers/sqlSync')
var imagingModel = require('./models/hl7-messages')
/*Configure properties of GrayLog - Logging component*/
global.graylogHost = GRAYLOG_CONFIG.graylogHost //'127.0.0.1'
global.graylogToConsole = GRAYLOG_CONFIG.graylogToConsole //true
global.graylogFacility = GRAYLOG_CONFIG.graylogFacility //'QuickRx'

var databaseConnectionUrl = MONGODB_CONFIG.prefix + MONGODB_CONFIG.dbName + MONGODB_CONFIG.tail;
// var databaseConnectionUrl = MONGODB_CONFIG.dbUser + ':' + MONGODB_CONFIG.dbPassword + '@' + MONGODB_CONFIG.dbHost +
//   ':' + MONGODB_CONFIG.dbPort + '/' + "accessControl";

mongoose.connect(databaseConnectionUrl);
// When successfully connected
mongoose.connection.on('connected', function () {
  log('[MONGODB] Connected to: ' + databaseConnectionUrl);
  // start cron job as soon as get connected to db
  schedule.everydayJob.start()
  schedule.cronLogger.start();
  schedule.unverifiedOrderCron.start();
  var agendaDBConnection = "mongodb://" + MONGODB_CONFIG.dbHost + ":" + MONGODB_CONFIG.dbPort + "/" + MONGODB_CONFIG.dbName + MONGODB_CONFIG.tail;
  global.AGENDA = new Agenda({ db: { address: agendaDBConnection, collection: "agenda_jobs" } });
  schedule.define_agenda();
  //schedule.pharmacy_failed_order.start();
  //schedule.Integration_Stats.start();
  //schedule.FailedVisits.start();

});

mongoose.connection.on('error', function (err) {
  log('[MONGODB] connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
  schedule.everydayJob.stop();
  schedule.cronLogger.stop();
  schedule.unverifiedOrderCron.stop();
  //schedule.pharmacy_failed_order.stop();
  //schedule.Integration_Stats.stop();
  //schedule.FailedVisits.stop();
  log('[MONGODB] Disconnected');
});
// Initializations of acl
// acl = new acl(new acl.mongodbBackend(mongoose.connection.db, 'acl_'))
// access.initiate(acl)
/* Extending String type's func*/
String.prototype.capitalizeFirstLetter = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}

if (!('contains' in String.prototype)) {
  String.prototype.contains = function (str, startIndex) {
    return -1 !== String.prototype.indexOf.call(this, str, startIndex)
  }
}

String.prototype.replaceAll = function (find, replace) {
  var str = this
  return str.replace(new RegExp(find, 'g'), replace)
}

try {
  npid.create('./quickrxServer.pid', true)
} catch (err) {
  log(err)
  process.exit(1)
}

/*Initializations required from DB */
// oldPatientModule.initGenericsAutocompleteArrayFromDB()

// init socketio
var socketio = notificationModel.io

var app = express();
app.use(compression({ filter: shouldCompress, level: 9 }));
function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }
  // fallback to standard filter function
  return compression.filter(req, res)
}
var server = http.createServer(app)
socketio = socketio.listen(server);
global.io = socketio;

//Routing
app.use('/masters', require('./controllers/mastersControllers.js'))



/*Configure middleware of express to allow CORS*/
// ## CORS middleware
// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type,x-access-token ,Accept')
  // res.header("Access-Control-Allow-Headers", "X-Requested-With")
  //
  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200)
  } else {
    next()
  }
}

// app.use(express.bodyParser({limit: '10mb'}))
app.use(logger('short'));
app.use(allowCrossDomain);
// static file Access
app.use(express.static(__dirname + '/data'));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(validator());

app.use(function (req, res, next) {
  var err = null;
  try {
    decodeURIComponent(req.path)
  }
  catch (e) {
    err = e;
  }
  if (err) {
    var response = {
      "_error_message": "Error in URL Path",
      "_status_Code": 404,
      "_status": "error",
      "result": "none"
    }
    return res.status(404).send(response);
  }
  next();
});

// console.log(limit)
// handling ctrl + c

var readLine = require('readline')
if (process.platform === 'win32') {
  var rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('SIGINT', function () {
    process.emit('SIGINT')
  })
}

process.on('SIGINT', function () {
  // graceful shutdown
  process.exit()
})

process.on("uncaughtException",
  function (e) {
    console.log(e);
  });

/************** file    Management services ****** *******/

var storage = multer.diskStorage({
  destination: function (req, file, cb) {

    var dest = isFieldFilled(req.query['scan']) ? './data/files/' + req.params.userId + '/scan/' : './data/files/' + req.params.userId + '/';

    mkdirp(dest, function (err) {
      if (err) cb(err, dest)
      else cb(null, dest)
    })
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({
  storage: storage
}).any()

var uploadTemplateImages = multer({
  storage: multer.diskStorage({
    destination: './data' + FILE_CONFIG.path,
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname)
    }
  })
}).any()
require('./routes/autoload')(app);
app.get('/templateImages/:imageName', function (req, res) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var filePath = './data' + fullUrl.replace(req.protocol + '://' + req.get('host'), "");
  res.download(filePath);
});
app.get('/files', function (req, res) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var filePath = './data' + fullUrl.replace(req.protocol + '://' + req.get('host'), "");
  res.download(filePath);
});

app.get('/utility/sendIntegrationStats', function (req, res) {
  schedule.sendStatisticsToMail(status => {
    if (status)
      res.send("Statistics sends to Mail, Check your mail");
    else
      res.send("Some error has occured. Contact to EMR Developer.")
  });
})

app.get('/utility/syncItemMaster', function (req, res) {
  sqlsync.syncItemMasters(status => {
    if (status)
      res.send("Item Master Sync Completed.")
    else
      res.send("Some error has occured. Contact to EMR Developer.")
  })
})

app.get('/ehr/api/test/dontAskWhy', function (req, res) {
  document.scriptDontAskWhy();
  res.send('dont ask why')
})
app.get('/ehr/api/rabbitmq/conflicts', function (req, res) {
  cpoeModule.getConflictRecords(req, res);
})
app.post('/ehr/api/rabbitmq/conflicts', function (req, res) {
  cpoeModule.testConflictRecords(req, res);
})
// notificationModel.generateNotificationSms("7fbb0013-27e7-4559-9d63-f78c7216302e");
app.post('/file/templateImages', function (req, res) {
  uploadTemplateImages(req, res, function (err) {
    if (err) {
      document.sendResponse("Request processing error", 406, 'error', '', res);
    } else {
      if (req.files.length > 0) {
        var data = req.body;
        data.filePath = req.files[0].path.replace('data', '');
        masterModule.uploadTemplateImage(data, res)
      } else {
        document.sendResponse("File Upload error", 406, 'error', '', res);
      }
    }
  })
})


app.post('/ehr/api/demoVitals', function (req, res) {
  var data = req.body;
  doctorModule.addDemoVitalsToVisit(data, res);
})

app.get('/file/templateImages', function (req, res) {
  masterModule.getTemplateImages(req, res)
})

app.get('/file/templateImages/:category', function (req, res) {
  masterModule.getTemplateImagesByCategory(req, res)
})

/************** doctor  login and jwt token generation services ****** *******/
/*
 doctor login
   @params  :  Access code, password , hospital name
   @returns  : doctorId
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/login
  //accessCode:access_123 
  //password:password_123
  //hospitalName:hospital_123
 */
app.post('/ehr/mims/findInteraction', function (req, res, next) {
  log('mims interaction api hit')
  mimsInteraction.get(req, res, next);
})

app.post('/ehr/api/verify/user', function (req, res) {
  var data = req.body;
  if (isFieldFilled(data.email) && isFieldFilled(data.userToken)) {
    user_management.verifyUser(data, res);
  } else {
    document.sendResponse("invalid Input", 406, 'error', '', res);
  }
});
app.post('/ehr/login', function (req, res) {
  var data = req.body
  if (!isFieldFilled(data.accessCode)) {
    var response = {
      '_error_message': 'invalid accessCode',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //          checkSessionValidation(session,res,function(){
    //          doctorModule.getAllPatientDetails(doctorId,res)
    log('.............hit doctor login api')
    doctorModule.Login(jwt, data, res)
    //      })
  }
})

// user_management.collectDoctorInfo();
// user_management.collectUserInfo();
/* PHR API*/

app.post('/ehr/patient/login', function (req, res) {
  var data = req.body
  if (!isFieldFilled(data.accessCode)) {
    var response = {
      '_error_message': 'Invalid accessCode',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit Patient login api')
    patient_model.patientLogin(jwt, data, res)
  }
})

app.get('/ehr/patient/:patientId/visit', function (req, res) {
  patient_model.getPatientVisitList(req, res);
})
app.get('/ehr/login/unit', function (req, res) {
  user_management.LoginDoctorUnit(res);
})

//Patient Medication
app.get('/ehr/patient/:patientId/medications', MIDDLEWARE.isLoggedIn, function (req, res) {
  var patientId = req.params.patientId
  log('..............hit Patient medication view  api')
  if (isFieldFilled(patientId)) {
    patient_model.getPatientMedication(patientId, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/doctorsList', function (req, res) {
  doctorModule.getDoctorsList(req, res)
})

//Reset Password

app.post('/ehr/resetPassword', function (req, res) {
  var data = req.body;
  notificationModel.resetPasswordMailTrigger(data, res);
})

app.post('/ehr/validateToken', function (req, res) {
  var data = req.body;
  user_management.validateMailToken(data, res);
})

app.post('/ehr/changePassword', function (req, res) {
  var data = req.body;
  user_management.changeUserPassword(data, res);
})

// access control apis

app.get('/ehr/api/access/:doctorId/patientLock/:patientId', function (req, res) {
  var doctorId = req.params.doctorId
  var patientId = req.params.patientId
  // disable patient lock for now
  // access.getPatientAccessLock(doctorId, patientId, res)
  res.send(true)
})

app.get('/ehr/api/access/masterRoles', function (req, res) {
  access.getAccessRolesfromMaster(res)
})

app.post('/ehr/api/access/masterRoles', function (req, res) {
  var data = req.body
  access.addAccessRoleToMaster(data, res)
})

app.get('/ehr/api/access/masterPermissions', function (req, res) {
  access.getAccessPermissionfromMaster(res)
})

app.get('/ehr/api/access/user/:userId/role', function (req, res) {
  var data = { userId: req.params.userId };
  access.assignedRolesToUser(data, res);
})

app.post('/ehr/api/access/masterPermissions', function (req, res) {
  var data = req.body
  access.addAccessPermissionToMaster(data, res)
})

app.get('/ehr/api/access/masterResource', function (req, res) {
  access.getAccessResourcesfromMaster(res)
})
app.post('/ehr/api/access/masterResource', function (req, res) {
  var data = req.body
  access.addAccessResourcesToMaster(data, res)
})
app.put('/ehr/api/access/masterResource/:recordId', function (req, res) {
  var data = {};
  data.recordId = req.params.recordId;
  data.payload = req.body
  access.updateResources(data, res)
})
// app.get('/ehr/api/accessPermissions',function(req,res){
//     var data
//     access.assignedPermissionToUser(data,res)
// })

app.get('/ehr/api/access/rolePermissions', function (req, res) {
  var data = {}
  data.role = req.query['role']
  access.assignedPermissionToRole(data, res)
})

app.post('/ehr/api/access/createUserRole', function (req, res) {
  var data = req.body
  access.createAccessRole(data, res)
})
app.post('/ehr/api/access/updateUserRole', function (req, res) {
  var data = req.body
  access.updateAccessRole(data, res)
})
app.put('/ehr/api/access/assignRoleToUser', function (req, res) {
  // req.validate('roles').is
  var data = req.body
  access.assignRoleToUser(data, res)
})
app.get('/ehr/api/access/assignedPermissionToUser', function (req, res) {
  var data = {}
  data.userId = req.query['userId']
  console.log(data.userId)
  if (document.isFieldFilled(data.userId)) {
    access.assignedPermissionToUser(data, res)
  }
})

app.get('/ehr/api/access/:userId/assignedOrderResourcesToUser', function (req, res) {
  var data = {}
  data.userId = req.params.userId
  console.log(data.userId)
  if (document.isFieldFilled(data.userId)) {
    // access.assignedPermissionToUser(data, res)
    access.assignedOrderResourcesToUser(data, res);
  }
})

app.put('/ehr/api/access/removePermissionFromRole', function (req, res) {
  var data = req.body
  if (isFieldFilled(data.role) && isFieldFilled(data.resource) && isFieldFilled(data.permissions))
    access.removerPermissionOfRole(data, res)
  else {
    document.sendResponse('invalid input', 406, 'error', 'none', res)
  }
})

// access route 2.0
app.use('/ehr/request/test/access', accessRoute);


app.post('/ehr/patient', function (req, res) {
  var data = req.body

  // console.log(data)

  if (!isFieldFilled(data.inputObj.PatientDetails.CivilID)) {
    var response = {
      '_error_message': 'invalid MRN ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else if (!data.inputObj.IsIPDAdmission) {
    fs.writeFile('C:/log/myOPDPFile.txt', JSON.stringify(data), function (err) {
      if (err) {
        console.log(err)
        res.send(406)
      } else {
        log('.............hit add OPD patients api ')
        patient_model.addPatient(data, res)
      }
    })
  } else {
    fs.writeFile('C:/log/myIPDPFile.txt', JSON.stringify(data), function (err) {
      if (err) {
        console.log(err)
        res.send(406)
      } else {
        log('.............hit add IPDP patients api ')
        patient_model.addIPDPatient(data, res)
      }
    })
  }
})

app.get('/patientInfoByMRN', function (req, res) {
  console.log('Request to /patientInfoByMRN ')
  var mrnNo = req.query['mrn']
  console.log('Get MRN no' + mrnNo)
  patient_model.patientInfoByMrn(mrnNo, res)
})
////////////***** Medcare Masters******///////////////

app.get('/LabTestMaster/:category/:search', function (req, res) {
  //masterHISModule.getLabList(req, res)
  console.log(req.query.category);
  masterModule.getLabTestByCategory(req, res);
})

app.get('/LabTestMaster/:search', function (req, res) {
  //masterHISModule.getLabList(req, res)
  masterModule.getLabTest(req, res);
})

app.get('/LabCategoryMaster', function (req, res) {
  //masterHISModule.getLabCategory(req, res)
  masterModule.getLabCategory(req, res);
})

////////////////////////////

app.get('/commonVitals', function (req, res) {  //Old API
  masterModule.vitalView(req, res)
})

app.get('/commonVital', function (req, res) {
  masterModule.vitalsView(req, res)
})

app.get('/vitalByName/:search', function (req, res) {
  masterModule.vitalByName(req, res)
})


app.get('/vitalSearch', function (req, res) {
  var setId = req.query['setId'];
  log('vital search api hit....')
  if (isFieldFilled(setId) && setId.toLowerCase() == 'all') {
    masterModule.vitalSearch(req, res)
  } else if (isFieldFilled(setId)) {
    masterModule.vitalSetSearch(req, res)
  } else {
    document.sendResponse("invalid input", 406, "error", "", res);
  }
})

// app.get('/vitalById/:id', function (req, res) {
//   masterModule.vitalById(req, res)
// })

app.get('/vitalsById/:id', function (req, res) {
  masterModule.vitalsById(req, res)
})

app.post('/addVital', function (req, res) {
  masterModule.addVital(req, res)
})

app.get('/labtestSearch/:search', function (req, res) {
  var key = req.query['keyword']
  if (isFieldFilled(key)) {
    masterModule.labtestSearch(req, res)
  } else {
    res.status(404).send()
  }
})

app.get('/prefixMaster/:search', function (req, res) {
  masterModule.getPrefix(req, res);
})

app.get('/countryMaster/:search', function (req, res) {
  masterModule.getCountry(req, res);
})

app.get('/stateMaster/:countryId/:search', function (req, res) {
  masterModule.getState(req, res);
})

app.get('/cityMaster/:stateId/:search', function (req, res) {
  masterModule.getCity(req, res);
})

app.get('/pocTestList', function (req, res) {
  masterModule.pocTestList(req, res)
})

app.get('/pocTestDetails/:test', function (req, res) {
  masterModule.pocTestDetails(req, res)
})

app.get('/templateCategory', function (req, res) {
  masterModule.templateCategoryList(req, res)
})

app.get('/templateCategory/:category', function (req, res) {
  masterModule.templateSubCategoryList(req, res)
})

app.get('/imagingProcedureList/:code/:search', function (req, res) {
  log("Imaging By Category request")
  masterModule.imagingProcedureListByCategory(req, res)
})

app.get('/imagingProcedureList/:search', function (req, res) {
  log("Imaging request")
  masterModule.imagingProcedureList(req, res)
})

app.get('/imagingCategory', function (req, res) {
  masterModule.getImagingCategory(req, res)
})

app.get('/imagingProcedureDetails/:name', function (req, res) {
  masterModule.imagingProcedureDetails(req, res)
})

app.get('/frequencySearch/:search', function (req, res) {
  masterModule.frequencySearch(req, res)
})

app.get('/sampleSearch/:search', function (req, res) {
  masterModule.sampleSearch(req, res)
})

app.get('/specimanSearch/:search', function (req, res) {
  masterModule.specimanSearch(req, res)
})

// app.get('/radiologyTestSearch/:search', function (req, res) {
//     masterModule.radiologyTestSearch(req, res)
// })

app.get('/radiologyTestType', function (req, res) {
  masterModule.radiologyTestType(req, res)
})

app.get('/radiologyTestByType/:type/:search', function (req, res) {
  masterModule.radiologyTestByType(req, res)
})

app.get('/drugSearch/:search', function (req, res) {
  masterModule.drugListSearch(req, res)
})

app.get('/solutionSearch/:search', function (req, res) {
  masterModule.solutionSearch(req, res)
})

app.get('/additiveSearch/:search', function (req, res) {
  masterModule.additiveSearch(req, res)
})

app.get('/drugSearchById/:drugId', function (req, res) {
  masterModule.drugListSearchById(req, res)
})

app.get('/icd9cmSearch/:search', function (req, res) {
  masterModule.icd9cSearch(req, res)
})

app.get('/allergySearch/:allergyName', function (req, res) {
  masterModule.allergySearch(req, res)
})

app.get('/departmentSearch/:deptName', function (req, res) {
  masterModule.departmentSearch(req, res)
})

app.get('/clinicSearch/:clinicName', function (req, res) {
  masterModule.clinicSearch(req, res)
})

app.get('/icdCodeSearch/:search', function (req, res) {
  masterModule.icdCodeSearch(req, res)
})

app.get('/servicesSearch/:search', function (req, res) {
  masterModule.servicesSearch(req, res)
})

app.get('/wardSearch/:search', function (req, res) {
  masterModule.wardSearch(req, res)
})

app.get('/procedureSearch/:search', function (req, res) {
  masterModule.procedureSearch(req, res)
})

app.get('/procedureSearchByType/:type/:search', function (req, res) {
  masterModule.procedureSearchByType(req, res)
})

app.get('/flagList', function (req, res) {
  masterModule.flagSearch(req, res)
})

app.get('/bloodComponentSearch/:search', function (req, res) {
  masterModule.bloodComponentSearch(req, res)
})

app.get('/nandaDiagnosis/:search', function (req, res) {
  masterModule.getNandaDiagnosis(req, res)
})

app.get('/nandaDiagnosisById/:id', function (req, res) {
  masterModule.getNandaDiagnosisDetails(req, res)
})

app.get('/routeSearch/:search', function (req, res) {
  masterModule.routeSearch(req, res)
})

app.get('/modifierSearch/:search', function (req, res) {
  masterModule.modifierSearch(req, res)
})

app.get('/genericSearch/:search', function (req, res) {
  masterModule.genericSearch(req, res)
})

// ////////////////////////

app.get('/dataObject', function (req, res) {
  masterModule.getDataObjectList(req, res)
})

app.get('/dataObject/:doId', function (req, res) {
  masterModule.getDataObjectById(req, res)
})

app.delete('/dataObject/:doId', function (req, res) {
  masterModule.removeDataObject(req, res)
})

app.put('/dataObject/:doId', function (req, res) {
  masterModule.updateDataObject(req, res)
})

app.post('/dataObject', function (req, res) {
  masterModule.addDataObject(req, res)
})

app.post('/ehr/template/:doctorId', function (req, res) {
  var doctId = req.params.doctorId
  var data = req.body
  doctorModule.postTemplate(data, doctId, res)
})

app.get('/ehr/patientDocument/:id', function (req, res) {
  var data = {
    documentId: req.params.id
  }
  if (!isFieldFilled(data.documentId)) {
    var response = {
      '_error_message': 'invalid patientId ,visitId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getFilledPatientDocument(data, res);
  }
})

app.post('/ehr/patientDocument/:patientId/visit/:visitId', function (req, res) {
  var idObj = {
    patientId: req.params.patientId,
    visitId: req.params.visitId
  }
  var data = req.body
  if (!isFieldFilled(data.title) || !typeof (data.isSigned) === 'boolean' || !isFieldFilled(data.doctorId)) {
    var response = {
      '_error_message': 'invalid patientId ,visitId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.postPatientDocument(data, idObj, res)
  }
})

app.put('/ehr/patientDocument/:patientId/:documentId', function (req, res) {
  var idObj = {
    patientId: req.params.patientId,
    documentId: req.params.documentId
  }
  var data = req.body
  if (!isFieldFilled(data.title) || !typeof (data.isSigned) === 'boolean' || !isFieldFilled(data.doctorId)) {
    var response = {
      '_error_message': 'invalid patientId ,visitId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.updatePatientDocument(data, idObj, res)
  }
})



// app.get('/ehr/patientDocument/:patientId/visit/:visitId/category/:category/subcategory/:subcategory', function (req, res) {
//   var data = {
//     patientId: req.params.patientId,
//     visitId: req.params.visitId,
//     category: req.params.category,
//     subcategory: req.params.subcategory,
//     doctorId: req.query['doctorId']
//   }
//   patient_model.getPatientDocumentWithSubcategory(data, res);
// })

app.get('/ehr/patientDocument/:patientId/visit/:visitId/category/:category/signed', function (req, res) {
  var data = {
    patientId: req.params.patientId,
    visitId: req.params.visitId,
    location: req.params.category,
    doctorId: req.query['doctorId']
  }
  patient_model.getSignedPatientDocument(data, res);
})

app.put('/ehr/doctor/:doctorId/template/:templateId', function (req, res) {
  var qparam = {
    doctId: req.params.doctorId,
    templateId: req.params.templateId
  }
  var data = req.body
  doctorModule.updateTemplate(data, qparam, res)
})

app.delete('/ehr/template/:templateId', function (req, res) {
  var templateId = req.params.templateId
  doctorModule.deleteTemplate(templateId, res)
})

app.post('/ehr/doctor/:doctorId/patient/:patientId/addvitalsDevice', function (req, res) {
  var data = req.body
  data.doctorId = req.params.doctorId
  data.patientId = req.params.patientId
  //      var session = req.param('session')
  var date = Date.now()
  // console.log(date)
  console.log('Data from device: ' + JSON.stringify(data))
  log('hit add patient Device vitals api ')
  if (!isFieldFilled(data.visitId) || !isFieldFilled(data.date) || !isFieldFilled(data.timeStamp) ||
    !isFieldFilled(data.doctorId) || !isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ,visitId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //          checkSessionValidation(session,res,function(){
    doctorModule.addMultipleVitalsToVisit(data, res)
    //      })
  }
})

app.get('/ehr/doctor/:doctorId/template/:templateId/patient/:patientId', function (req, res) {
  var data = {
    doctId: req.params.doctorId,
    patientId: req.params.patientId,
    visitId: req.query['visitId'],
    templateId: req.params.templateId
  }
  // res.send(200)
  doctorModule.PatientTemplateData(data, res)
})

app.post('/ehr/template/:documentId/signTemplate', function (req, res) {
  var data = req.body;
  data.documentId = req.params.documentId;
  patient_model.signTemplate(data, res);
})

app.get('/ehr/template/:doctorId', function (req, res) {
  var doctId = req.params.doctorId
  doctorModule.getTemplateList(doctId, res)
})

app.put('/ehr/template/favourite', function (req, res) {
  var data = req.body
  doctorModule.setTemplateFavourite(data, res)
})

app.get('/ehr/templateByCategory/:doctorId/:location', function (req, res) {
  var data = {
    doctId: req.params.doctorId,
    location: req.params.location
  }
  doctorModule.getTemplateListByCategory(data, res)
})

app.get('/ehr/template/:doctorId/:templateId', function (req, res) {
  var doctId = req.params.doctorId
  var templateId = req.params.templateId
  doctorModule.getTemplateById(doctId, templateId, res)
})

app.post('/ehr/templatNandadignosis/:patientId', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  patient_model.addNandaDiagnosis(data, res);
})

app.get('/ehr/templatNandadignosis/:patientId', function (req, res) {
  var data = {
    patientId: req.params.patientId,
    visitId: req.query['visitId']
  }
  patient_model.getNandaDiagnosis(data, res);
})

app.get('/ehr/templatNandadignosis/:patientId/:status', function (req, res) {
  var data = {
    patientId: req.params.patientId,
    visitId: req.query['visitId'],
    status: req.params.status
  }
  patient_model.getNandaDiagnosisByStatus(data, res);
})

app.put('/ehr/templatNandadignosis/:id', function (req, res) {
  var data = req.body
  data.problemId = req.params.id
  patient_model.updateNandaDiagnosis(data, res);
})

app.get('/ehr/doctors/patientSchema', function (req, res) {
  patient_model.getPatientSchema(res)
})

// jwt auth key verification middleware
app.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  // console.log(req.body)
  var token = req.body.token || req.query.token || req.headers['x-access-token']
  var self = req.body._node ? req.body._node.self : false;
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, 'sofomo_pwd', function (err, decoded) {
      if (err) {
        return res.json(Utility.output('Failed to authenticate token.', 'INVALID_TOKEN', {
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
  } else if (self) {
    next();
  } else {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
    // next();
  }
})

app.post('/file/:userId/upload', function (req, res, next) {
  log('...........upload api hit ' + req.files)
  upload(req, res, function (err) {
    if (err) {
      var response = {
        '_error_message': 'Error in operation',
        '_status_Code': 502,
        '_status': 'error',
        'result': 'none'
      }
      console.log(err)
      res.send(response)
    } else {
      // log(req.files)
      if (req.files.length > 0) {
        log(req.files)
        var filePath = req.files[0].path.replace('data/', EHR_SERVER_CONFIG.ip + ":" + EHR_SERVER_CONFIG.serverPort + "/");
        // log("file uploaded at"+filepath)
        var response = {
          '_error_message': 'none',
          '_status_Code': 200,
          '_status': 'done',
          'result': {
            'filePath': filePath,
            'fileMeta': {
              fileName: req.files[0].originalname,
              mimeType: req.files[0].mimetype,
              size: req.files[0].size,
              relativePath: req.files[0].path
            }
          }
        }
        log('file uploaded to ' + filePath)
        res.send(response).status(200)
      } else {
        var response = {
          '_error_message': 'invalid file',
          '_status_Code': 502,
          '_status': 'error',
          'result': 'none'
        }
        // console.log("errr")
        res.send(response)
      }
    }
  })
})

app.post('/file/:userId/upload/NonED', function (req, res, next) {
  console.log('...........upload api hit new API Called ')
  if (!isFieldFilled(req.params.userId)) {
    res.json(Utility.output("Invalid patientId", "ERROR"))
  } else {
    upload(req, res, function (err) {
      if (err) {
        res.json(Utility.output("Error in operation", "ERROR"))
      } else {
        if (req.files.length > 0) {
          log(req.files)
          var filePath = req.files[0].path.replace('data', EHR_SERVER_CONFIG.ip + ":" + EHR_SERVER_CONFIG.serverPort + "");

          var data = req.body
          data.mediaFileURL = filePath;
          log('File URL: ' + filePath);
          patient_model.postingsNonED(data, res)
        } else {
          res.json(Utility.output("Invalid File", "ERROR"))
        }
      }
    })
  }
})

app.get('/ehr/doctors/:search', function (req, res) {
  doctorModule.getDoctors(req, res)
})




/************** patient  Management services ****** *******/

/*
 create patient visit 
   @params  :  visitType, location, flag , date, care provider,doctorId, patientId , primaryDiagnosis
   @returns  : visitId
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patient/:patientId/addVisit/:doctorId
  
 */
app.post('/ehr/patient/:patientId/addVisit/:doctorId', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  data.doctorId = req.params.doctorId
  if (!isFieldFilled(data.patientId) && !isFieldFilled(data.doctorId)) {
    var response = {
      '_error_message': 'invalid patientId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //          checkSessionValidation(session,res,function(){
    //          doctorModule.getAllPatientDetails(doctorId,res)
    log('.............hit createVisit  api')
    patient_model.createVisit(data, res)
    //      })
  }
})
/*
  Get last visit of patient using patient id and doctor id
   @params  :  doctorId, patientId
   @returns  : visitDetails
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patient/:patientId/lastVisit/:doctorId
   
 */
app.get('/ehr/patient/:patientId/lastVisit/:doctorId', function (req, res) {
  var doctorId = req.params.doctorId
  var patientId = req.params.patientId
  if (!isFieldFilled(doctorId) && !isFieldFilled(patient)) {
    var response = {
      '_error_message': 'invalid patientId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.................hit last visit details api')
    // console.log("patientID:"+patientId)
    // console.log("doctorID:"+doctorId)
    patient_model.getLastVisitDetails(doctorId, patientId, res)
  }
})

/*
  Get last two visit records  of patient using patient id
   @params  :  doctorId, patientId
   @returns  : visitDetails
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patient/:patientId/lastVisit/:doctorId
   
 */
app.get('/ehr/patient/:patientId/lastVisitRecords', function (req, res) {
  var data = {}
  data.patientId = req.params.patientId
  data.mrn = req.query.mrn;
  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.................hit last visit records api')
    patient_model.getPatientRecords(data, res)
  }
})

/*
  Get new  list of patients name and last visitInfo using doctorId
   @params  :  doctorId
   @returns  : visitDetails
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/doctors/:doctorId/patients
   
 */
app.get('/ehr/doctors/:doctorId/patients', function (req, res) {
  var doctorId = req.params.doctorId
  if (!isFieldFilled(doctorId)) {
    var response = {
      '_error_message': 'invalid doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('retriving patient list:' + doctorId)
    patient_model.getAllPatientDetails(doctorId, res)
    // patient_model.getAllPatients(doctorId, res)
    // doctorModule.getAllPatientList(res)

  }
})
/*
  Get new  list of patients name and last visitInfo using doctorId
   @params  :  doctorId
   @returns  : visitDetails
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/doctors/:doctorId/visit/patients
   
 */
app.get('/ehr/doctors/:userId/visit/patients', function (req, res) {
  var userId = req.params.userId
  if (!isFieldFilled(userId)) {
    var response = {
      '_error_message': 'invalid doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('retriving cureent patient list:' + userId)
    // patient_model.getAllPatients(doctorId, res)
    patient_model.getAllPatientsToVisit(req, res)
    // doctorModule.getAllPatientList(res)

  }
})
// app.get('/ehr/template/:doctorId', function (req, res) {
// var doctId = req.params.doctorId
// doctorModule.getTemplate(doctId, res)
// })

// app.post('/ehr/template/:doctorId', function (req, res) {
// var doctId = req.params.doctorId
// var data = req.body
// doctorModule.postTemplate(data, doctId, res)
// })

// //old need to remove
// app.get('/ehr/doctors/:doctorId/searchPatient', function (req, res) {
//   var criteria = {
//     searchBy: req.query['searchBy'],
//     searchValue: req.query['searchValue'],
//     doctorId: req.params.doctorId,
//     lower: req.query['lower'],
//     upper: req.query['upper']
//   };
//   patient_model.getSearchList(criteria, res);
//   // patient_model.searchPatients(criteria,res);
// })


app.get('/ehr/doctors/:doctorId/search/patient', function (req, res) {
  var criteria = {
    searchBy: req.query['searchBy'],
    searchValue: req.query['searchValue'],
    doctorId: req.params.doctorId,
    lower: req.query['lower'],
    upper: req.query['upper']
  };
  patient_model.searchPatients(criteria, res, req);
})

/*
  add patients  to doctor records using visit id
   @params  :  doctorID,patientId
   @returns  : status code
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/:doctorId/patients/:patientId
   // 
 */

app.get('/ehr/:doctorId/patients/:patientId', function (req, res) {
  var doctorId = req.params.doctorId
  var patientId = req.params.patientId
  if (patientId === '' || doctorId === '' || typeof patientId === 'undefined' || typeof doctorId === 'undefined') {
    var response = {
      '_error_message': 'invalid patientId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //          checkSessionValidation(session,res,function(){
    doctorModule.addPatientToDoctor(doctorId, patientId, res)

    //      })
  }
})

/************** patient vitals Management services ****** *******/

/*
  add vitals to visit records using visit id
   @params  :  visitId,vitals[],date,time,patientId, doctorId,
   @returns  : visitDetails
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/doctor/:visitId/patient/addvitals
   // visit id: 1014909b-5076-4b91-82dc-865c254c2692   
   // date 1480054320596
 */
app.post('/ehr/doctor/:userId/patient/:patientId/addvitals', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  data.patientId = req.params.patientId
  //      var session = req.param('session')
  var date = Date.now()
  // console.log(date)
  log('hit add patient vitals api')
  if (!isFieldFilled(data.visitId) || !isFieldFilled(data.userId) || !isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ,visitId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //          checkSessionValidation(session,res,function(){
    //doctorModule.addMultipleVitalsToVisit(data, res)
    vitalsModule.addMultipleVitalsToVisit(data, res);
    //      })
  }
})

/*
  get patient vitals records using patientId
   @params  :  patientID
   @returns  : vitals
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patients/:patientId/getvitals
   
 */
// app.get('/ehr/patients/:patientId/getvitals',acl.customMiddleware('Read','Vitals'), function (req, res) {

app.get('/ehr/patients/:patientId/getvitals', function (req, res) {

  var patientId = req.params.patientId
  if (!isFieldFilled(patientId) && !isFieldFilled(setId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //doctorModule.getPatientVitals(patientId, res)
    vitalsModule.getPatientVitals(patientId, res,req);
  }
})

app.get('/ehr/patients/:patientId/getBSA', function (req, res) {
  var patientId = req.params.patientId

  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    doctorModule.getPatientBSA(patientId, res)
  }
})
/*
  get patient coversheet vitals records using patientId
   @params  :  patientID
   @returns  : vitals
   @exceptions  : 500,404,406
   @url: http://localhost:5100/ehr/patients/:patientId/getCoversheetVitals
   
 */
app.get('/ehr/patients/:patientId/getCoversheetVitals', function (req, res) {
  var data = {}
  data.patientId = req.params.patientId
  data.visitId = req.query['visitId']
  log('hit get patient coversheet vitals api')
  if (!isFieldFilled(data.patientId) && isFieldFilled(data.visitId)) {
    var response = {
      '_error_message': 'invalid patient or visit ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //doctorModule.getPatientCoversheetVitals(data, res)
    vitalsModule.getPatientCoversheetVitals(data, res)
  }
})

/*
  get patient vitals records using date range using patientId
   @params  :  patientID
   @returns  : vitals
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patients/:patientId/getvitals
   
 */
app.get('/ehr/patient/:patientId/getvitals/dateRange', function (req, res) {
  var patientId = req.params.patientId
  var upper = req.query['upper']
  var lower = req.query['lower']
  var data = req.body
  log('hit get patient vitals by date api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //doctorModule.getPatientVitalsByDate(patientId, upper, lower, res)

    var start = new Date(parseInt(lower))
    var ns = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var end = new Date(parseInt(upper))
    var ne = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

    console.log(parseInt(upper) + "  ---- " + parseInt(lower));
    var stime = new Date(moment(parseInt(ns.getTime())).format('YYYY/MM/DD') + ' 00:00:00 ' + EHR_SERVER_CONFIG.GMT_TIMEZONE).getTime();
    var etime = new Date(moment(parseInt(ne.getTime())).format('YYYY/MM/DD') + ' 23:59:59 ' + EHR_SERVER_CONFIG.GMT_TIMEZONE).getTime();

    var query = {
      $match: {
        "patientId": patientId,
        "markError": { $ne: true },
        "date": {
          $gte: stime,
          $lte: etime
        }
      }
    };
    vitalsModule.getPatientVitalsByDate(query, res);
  }
})

// get slected vitals within date range
app.post('/ehr/patient/:patientId/getvitals/dateRange', function (req, res) {
  var patientId = req.params.patientId
  var upper = req.query['upper']
  var lower = req.query['lower']
  var data = req.body
  log('hit get patient vitals by date api')
  if (!isFieldFilled(patientId) && !isFieldFilled(data.vitals)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    //doctorModule.getPatientsSelectedVitalsByDate(patientId, upper, lower, data, res)

    var start = new Date(parseInt(lower))
    var ns = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var end = new Date(parseInt(upper))
    var ne = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

    var stime = new Date(moment(parseInt(ns.getTime())).format('YYYY/MM/DD') + ' 00:00:00 ' + EHR_SERVER_CONFIG.GMT_TIMEZONE).getTime();
    var etime = new Date(moment(parseInt(ne.getTime())).format('YYYY/MM/DD') + ' 23:59:59 ' + EHR_SERVER_CONFIG.GMT_TIMEZONE).getTime();

    var vitals = [];
    data.vitals.forEach(element => {
      vitals.push(ObjectID(element));
    });

    var query = {
      $match: {
        "patientId": patientId,
        "markError": false,
        "vitalId": { $in: vitals },
        "date": {
          $gte: stime,
          $lte: etime
        }
      }
    };
    if(!vitals.length)
        delete query["$match"].vitalId;
    vitalsModule.getPatientVitalsByDate(query, res)
  }
})

app.put('/ehr/patient/:patientId/VitalsError/:vitalId', function (req, res) {
  var patientId = req.params.patientId
  var vitalId = req.params.vitalId
  if (!isFieldFilled(patientId) && !isFieldFilled(vitalId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    doctorModule.markVitalAsError(patientId, vitalId, res)
  }
})
/************** patient complaint Management services *************/

/*
  add  patient's  complaint to records
   @params  :  patientId,complaintId
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/addComplaints/:visitId
   
 */
app.post('/ehr/patients/:patientId/addComplaints/:visitId', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  data.visitId = req.params.visitId
  if (!isFieldFilled(data.patientId) || !isFieldFilled(data.visitId)) {
    var response = {
      '_error_message': 'invalid patientId or visitId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.addPatientComplaints(data, res)
  }
})

app.post('/ehr/patients/:patientId/mapDiagnosisToProblem/:visitId', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  data.visitId = req.params.visitId
  if (!isFieldFilled(data.patientId) || !isFieldFilled(data.visitId)) {
    var response = {
      '_error_message': 'invalid patientId or visitId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.mapDiagnosisToProblem(data, res)
  }
})

//************** preferred diagnosis and complaint model api */
app.post('/ehr/settings/prefferredComplaints', function (req, res) {
  var data = req.body
  data.userId = req.decoded.userId
  if (!isFieldFilled(data.userId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("adding preffered complaint list")
    doctorModule.addPrefferedComplaint(data, res)
  }
})
app.get('/ehr/settings/prefferredComplaints/:isProblem', function (req, res) {
  var data = req.body
  data.userId = req.decoded.userId
  data.isProblem = req.params.isProblem
  if (!isFieldFilled(data.userId) && !isFieldFilled(data.isProblem)) {

    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("retrive preffered complaint list")
    doctorModule.getPrefferedComplaint(data, res)
  }
})
app.put('/ehr/settings/prefferredComplaints/:recordId', function (req, res) {
  var data = req.body
  data.userId = req.decoded.userId
  data.recordId = req.params.recordId
  if (!isFieldFilled(data.userId) && !isFieldFilled(data.recordId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("update preffered complaint list")
    doctorModule.updatePrefferedComplaint(data, res)
  }
})
/************** VitalSet  Management services *************/
app.post('/ehr/settings/:userId/vitalset', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (!isFieldFilled(data.userId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("adding vitalset")
    doctorModule.addVitalSet(data, res)
  }
})

app.get('/ehr/settings/:userId/vitalset', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (!isFieldFilled(data.userId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("retrive preffered vitalset")
    doctorModule.getAllVitalSet(data, res)
  }
})
app.put('/ehr/settings/:userId/vitalset/:recordId', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  data.recordId = req.params.recordId
  if (!isFieldFilled(data.userId) && !isFieldFilled(data.recordId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("update preffered vitalset")
    doctorModule.updateVitalSet(data, res)
  }
})
app.put('/ehr/settings/:userId/vitalset/:recordId/item/:itemId', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  data.recordId = req.params.recordId
  data.itemId = req.params.itemId
  if (!isFieldFilled(data.itemId) && !isFieldFilled(data.recordId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("remove item from vitalset")
    doctorModule.removeItemFromVitalSet(data, res)
  }
})

app.delete('/ehr/settings/:userId/vitalset/:recordId', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  data.recordId = req.params.recordId
  if (!isFieldFilled(data.userId) && !isFieldFilled(data.recordId)) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log("delete preffered vitalset")
    doctorModule.deleteVitalSet(data, res)
  }
})
/************** Patient Posting  Management services *************/

/*
  add  patient's  postings  to the records
   @params  : PatientId,Postings Type,Title,Slider bar,Comments,Image URL,Date,Postings Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/postings
 */
app.post('/ehr/patient/:patientId/postings/ED', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add postings  api')
    patient_model.postingsED(data, res)
  }
})

app.post('/ehr/patient/:patientId/postings/nonED', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add postings  api')
    patient_model.postingsNonED(data, res)
  }
})

app.post('/ehr/patient/:patientId/scanDocs', function (req, res) {
  var data = req.body;
  data.patientId = req.params.patientId
  patient_model.scanDocsDetails(data, res, req)
})

app.get('/ehr/patient/:patientId/scanDocs', function (req, res) {
  patient_model.getScanDocs(req, res)
})

/*
  Get  patient's  postings  to the records
   @params  : PatientId.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/postings
 */

app.get('/ehr/patient/:patientId/postings', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient postings api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientPostings(patientId, res)
  }
})

/*
  get patient's postings from last 48 hours
   @params  :  patientID
   @returns  : Postings
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr
   
 */
app.get('/ehr/patient/:patientId/lastPostings', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient postings of last 48 hours API')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPostingsLast48(patientId, res)
  }
})

/*
  Delete  patient's  postings  from the records
   @params  : PatientId,Postings Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/postings/:postingId
 */

app.delete('/ehr/patient/:patientId/postings/:postingId', function (req, res) {
  var patientId = req.params.patientId
  var postingId = req.params.postingid
  log('hit delete patient Postings api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.deletePosting(postingId, res)
  }
})

/*
  Mark Patient Postings as Error.
   @params  : PatientId,Postings Id,.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/postings/markError
 */
app.put('/ehr/patient/:patientId/postings/markError', function (req, res) {
  var data = req.body
  var PatientId = req.params.patientId
  log('Mark Patient Postings Error api')
  if (!isFieldFilled(PatientId) && !isFieldFilled(data.postingId)) {
    var response = {
      '_error_message': 'Invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.postingError(data.postingId, PatientId, data.doctorId, res)
  }
})

/************** patient Point Of Care Management Services *************/

/*
  Add Patient's Point Of Care Test results
   @params  : Patient Id,POC test name,test,unit,range,test value.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/POC
 */
app.post('/ehr/patient/:patientId/POC', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add POC  api')
    patient_model.POCinput(data, res)
  }
})

app.put('/ehr/patient/:patientId/POC/:POCId', function (req, res) {
  var data = req.body;
  data.patientId = req.params.patientId
  data.pocId = req.params.POCId
  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.updatePOCinput(data, res)
  }
})

/*
  Get Patient's Point Of Care Test results.
   @params  : Patient Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/POC
 */

app.get('/ehr/patient/:patientId/POC', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient POC api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPOC(patientId, res)
  }
})

app.get('/ehr/patient/:patientId/POC/:pocId', function (req, res) {
  if (!isFieldFilled(req.params.patientId) || !isFieldFilled(req.params.pocId)) {
    var response = {
      '_error_message': 'invalid patientId or pocId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPOCById(req, res)
  }
})

app.get('/ehr/patient/:patientId/POCdateRange', function (req, res) {
  patient_model.getPOCByDateRange(req, res)
})

/*
  Delete Patient's Point Of Care Test results.
   @params  : Patient Id,POC Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/POC/:POCId
 */

app.delete('/ehr/patient/:patientId/POC/:POCId', function (req, res) {
  var patientId = req.params.patientId
  var POCId = req.params.POCId
  log('hit delete patient POC api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.deletePOC(POCId, res)
  }
})

/*
  Mark Patient POC as Error.
   @params  : PatientId,POC Id,.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/POC/markError
 */

app.put('/ehr/patient/:patientId/POCmarkError/', function (req, res) {
  var data = req.body
  var PatientId = req.params.patientId

  console.log('Mark Patient POC Error api')
  if (!isFieldFilled(PatientId) && !isFieldFilled(data.POCId)) {
    var response = {
      '_error_message': 'Invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.POCError(data.POCId, data.doctorId, PatientId, res)
  }
})

/************** patient Lab Order Management services *************/

/*
  add  patient's  Lab Order to the records
   @params  : labOrder,patientId,patientName,mrn,visitId,visitNo,visitDate,visitType,primaryDoctor,clinicalDepartment,clinicName
   testCategory,testCode,testName,profileName,sampleNumber,resultValue,parameterName,rangeUpper,rangeLower,organismName,antibioticsName
   sensitivityResult,units,suggestion,footNotes,pathologistName,orderDate,sampleCollectionDate,sampleReceived,sampleStatus,samplePriority
   testResult.
   serverity,comments.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/labResults/:patientId/:mrn
 */

app.post('/ehr/labResults/:patientId/:mrn', function (req, res) {
  var data = req.body
  data.mrn = req.params.mrn
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.mrn)) {
    var response = {
      '_error_message': 'invalid MRN No. ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add lab results  api')
    patient_model.addLabOrderResults(data, res)
  }
})

/*
  View patient's  Lab Order to the records
   @params  : Patient Id, MRN no.
   serverity,comments.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/labResults/:patientId/:mrn
 */

app.get('/ehr/labResults/:patientId/:mrn', function (req, res) {
  var patientId = req.params.patientId
  var mrn = req.params.mrn
  log('hit get lab Results api')
  if (!isFieldFilled(mrn)) {
    var response = {
      '_error_message': 'invalid MRN number ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getLabOrderResults(mrn, res)
  }
})

/*
  View patient's last 10 Lab Order to the records
   @params  : Patient Id, MRN no.
   serverity,comments.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/labResults/:patientId/:mrn
 */

app.get('/ehr/labResults/:patientId/:mrn/last10', function (req, res) {
  var patientId = req.params.patientId
  var mrn = req.params.mrn
  log('hit get lab Results api')
  if (!isFieldFilled(mrn)) {
    var response = {
      '_error_message': 'invalid MRN number ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getLast10LabOrders(mrn, res)
  }
})

/*
  get patient vitals records using date range using patientId
   @params  :  patientID
   @returns  : vitals
   @exceptions  : 500,404,406
   @url: http://localhost:3000/ehr/patients/:patientId/getvitals
   
 */
app.get('/ehr/labResults/:patientId/:mrn/dateRange', function (req, res) {
  var patientId = req.params.patientId
  var mrn = req.params.mrn
  var upper = req.query['upper']
  var lower = req.query['lower']
  log('hit get patient Lab Order results by date api')
  if (!isFieldFilled(mrn)) {
    var response = {
      '_error_message': 'invalid MRN number ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getLabOrderResultsByDate(mrn, upper, lower, res)
  }
})

/************** Patient Intake Output Services *************/

/*
  View Patient's Intake / Output
   @params  : Patient Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000//ehr/patient/:patientId/intakeOutput
 */

app.get('/ehr/patient/:patientId/intakeOutput', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient Intake / Output api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getIntakeOutput(patientId, res)
  }
})

app.get('/ehr/patient/:patientId/intakeOutput/dateRange', function (req, res) {
  var patientId = req.params.patientId
  var upper = req.query['upper']
  var lower = req.query['lower']
  log('hit get patient Intake / Output api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getIntOutByDate(patientId, upper, lower, res)
  }
})

/*
  Add Patient's Intake / Output
   @params  : Patient Id,Intake Output Type,Value,Qualifiers.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000//ehr/patient/:patientId/intakeOutput
 */

app.post('/ehr/patient/:patientId/intakeOutput', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add intake Output  api')
    patient_model.intakeOutputAdd(data, res)
  }
})
/*
  Mark patient's intake output field as error.
   @params  : PatientId,lab intake output Id Id,.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/intakeOutput/markError
 */

app.put('/ehr/patient/:patientId/intakeOutput/markError', function (req, res) {
  var data = req.body
  var PatientId = req.params.patientId
  log('Mark Patient intakeOutput Error api')
  if (!isFieldFilled(PatientId) && !isFieldFilled(data.intakeOutputId)) {
    var response = {
      '_error_message': 'Invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.intakeOutputError(data.intakeOutputId, data.doctorId, PatientId, res)
  }
})

/************** Patient Services *************/

/*
  Add Patients to the records
   @params  : patient Id,mrn,Name,Prefix,age,Religion,occupation,nationality,gender,lasvisit,nric,passport number,
   status,dob,emailId,occupation,residential address,residential country,residential state,residential post code
   ,patient image,mobile,visit records.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient
 */
// app.post('/ehr/patient', function (req, res) {
//     var data = req.body

// ////    console.log(data)

//     if (!isFieldFilled(data.inputObj.PatientDetails.CivilID)) {
//         var response = {
//             "_error_message": "invalid MRN ",
//             "_status_Code": 406,
//             "_status": "error",
//             "result": "none"
//         }
//         res.send(response)
//     }
//     else if (!data.inputObj.IsIPDAdmission) {
//         log(".............hit add OPD patients api")
//         patient_model.addPatient(data, res)
//     } else {
//         fs.writeFile('myIPDFile.txt', JSON.stringify(data), function (err) {
//             if (err) {
//                 console.log(err)
//                 res.send(406)
//             } else {
//                 log(".............hit add IPD patients api")
//                 patient_model.addIPDPatient(data, res)
//             }
//         })
//     }
// })

/*
  Get Patient's records
   @params  : Patient Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient
 */

app.get('/ehr/patient/:patientId', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientHeaderInfo(patientId, res, req)
  }
})

/************** Patient Flag Services *************/

/*
  Add Patient's Flag
   @params  : Patient Id,Flag Name,Flag Value.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient/:patientId/flag
 */
app.post('/ehr/patient/:patientId/flag', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  // console.log(data)

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add flag api')
    patient_model.addFlag(data, res)
  }
})

/*
  View Patient's Flag
   @params  : Patient Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient/:patientId/flag
 */

app.get('/ehr/patient/:patientId/flag', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient flag api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getFlag(patientId, res)
  }
})

/*
  Update Patient's Flag
   @params  : Patient Id.Flag Value.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient/:patientId/flag/:flagId
 */

app.put('/ehr/patient/:patientId/flag/:flagId/markError', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  data.flagId = req.params.flagId
  if (isFieldFilled(data) && isFieldFilled(data.patientId) && isFieldFilled(data.flagId)) {
    patient_model.flagError(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.put('/ehr/patient/:patientId/flag/:flagId', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId
  data.flagId = req.params.flagId
  if (isFieldFilled(data) && isFieldFilled(data.patientId) && isFieldFilled(data.flagId)) {
    patient_model.updateFlag(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/************** patient allergy Management services *************/

/*
  add  patient's  allergies to the records
   @params  : patientid,allergyname,nature,obsereved history,date,originator,
   serverity,comments.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/allergies
 */

app.post('/ehr/patient/:patientId/allergies', function (req, res) {
  var data = req.body
  data.patientId = req.params.patientId

  if (!isFieldFilled(data.patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    log('.............hit add allergy  api')
    patient_model.allergiesInput(data, res)
  }
})

// Acquire patient allergies through patientID and display the data

app.get('/ehr/patient/:patientId/allergies', function (req, res) {
  var patientId = req.params.patientId
  log('hit get patient allergies api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientAllergies(patientId, res)
  }
})

// Put error on allergies field to mark them as wrong

app.put('/ehr/patient/:patientId/allergies/allergyUpdate', function (req, res) {
  var data = req.body
  var PatientId = req.params.patientId
  var allergyId = data.allergyId
  log('..........hit get patient allergies api')
  if (!isFieldFilled(PatientId) && !isFieldFilled(data.allergyId)) {
    var response = {
      '_error_message': 'Invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.allergyUpdate(allergyId, PatientId, data, res)
  }
})

// delete allergies from the patients data through patient id and allergy id

app.delete('/ehr/patient/:patientId/allergies/:allergyId', function (req, res) {
  var patientId = req.params.patientId
  var AllergyId = req.params.allergyId
  log('hit delete patient allergies api')
  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.deleteAllergy(AllergyId, res)
  }
})

/*
  put  patient's  complaint records into error
   @params  :  patientId,complaintId
   @returns  : status
   @exceptions  : 500,405,406
   @url: /ehr/patients/:patientId/complaints/:complaintId/addToError
   
 */
app.put('/ehr/patients/:patientId/complaints/:complaintId/addToError', function (req, res) {
  var data = req.body
  var PatientId = req.params.patientId
  var complaintId = req.params.complaintId
  log('hit update patient complaints api')
  if (!isFieldFilled(PatientId) || !isFieldFilled(complaintId)) {
    var response = {
      '_error_message': 'invalid patientId or complaintId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.setComplaintError(complaintId, PatientId, data, res)
  }
})

app.get('/ehr/patients/:doctorId/getPreferredProblems', function (req, res) {
  var doctorId = req.params.doctorId

  if (!isFieldFilled(doctorId)) {
    var response = {
      '_error_message': 'invalid doctorId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.preferredProblems(doctorId, res)
  }
})

app.get('/ehr/patients/:doctorId/getPreferredDiagnosis', function (req, res) {
  var doctorId = req.params.doctorId

  if (!isFieldFilled(doctorId)) {
    var response = {
      '_error_message': 'invalid doctorId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.preferredDiagnosis(doctorId, res)
  }
})

/*
  get patient's all complaint records using patientId
   @params  :  patientID
   @returns  : complains
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/getAllComplaints
   
 */
app.get('/ehr/patients/:patientId/getAllComplaints', function (req, res) {
  var patientId = req.params.patientId

  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientAllComplaints(patientId, res)
  }
})

/*
  get patient's all active complaint records using patientId
   @params  :  patientID
   @returns  : complaints
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/getAllComplaints/active
   
 */
app.get('/ehr/patients/:patientId/getAllComplaints/active', function (req, res) {
  var patientId = req.params.patientId

  if (!isFieldFilled(patientId)) {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientAllComplaintsActive(patientId, res)
  }
})

/*
  get patient's  complaint records using patientId and visitId
   @params  :  patientID
   @returns  : complains
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patients/:patientId/getAllComplaints/:visitId
   
 */
app.get('/ehr/patients/:patientId/getAllComplaints/:visitId', function (req, res) {
  var patientId = req.params.patientId
  var visitId = req.params.visitId
  if (!isFieldFilled(patientId) || !isFieldFilled(visitId)) {
    var response = {
      '_error_message': 'invalid patientId or visitId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    patient_model.getPatientComplaintsByVisit(patientId, visitId, res)
  }
})

/************** CPOE order Management services ****** *******/

/*
 create cpoe order
 @params  :  patientId,doctorId,orderCategory,OrderSubCategory, orderItem,      date , frequencyMaster,
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/createOrder

 */
// access.customMiddleware("Write","Orders"),
app.post('/ehr/cpoe/createOrder', function (req, res) {
  var data = req.body
  if (isFieldFilled(data)) {
    log("create order visitId:" + data.visitId)
    cpoeModule.createOrder(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.get('/ehr/cpoe/visit/:visitId/orderStatus', function (req, res) {
  req.checkParams('visitId', 'invalid visitId').notEmpty();
  req.checkQuery('status', 'invalid status').notEmpty();
  req.getValidationResult().then(function (errors) {
    if (errors.isEmpty()) {
      cpoeModule.visitOrderListByStatus(req, res);
    } else {
      document.sendValidationError(errors.array(), res);
    }
  })
})

app.get('/ehr/cpoe/imagingOrder/:accessionNo',imagingModel.GetOrderDetails);
/*
 create cpoe orderset or package order
 @params  :  doctorId, orderItems,      date , frequencyMaster,
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/createOrder

 */
app.post('/ehr/cpoe/createOrderSet', function (req, res) {
  var data = req.body
  if (isFieldFilled(data)) {
    cpoeModule.createOrderSet(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:userId/global/getAllOrderSet', function (req, res) {

  if (isFieldFilled(req.params.userId))
    cpoeModule.getAllOrderSet(req.params.userId, res)
  else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }

})
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:userId/global/getAllPackageOrders', function (req, res) {
  if (isFieldFilled(req.params.userId))
    cpoeModule.getAllPackageOrders(req.params.userId, res)
  else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:userId/getAllOrderSet', function (req, res) {
  var userId = req.params.userId;
  if (isFieldFilled(userId)) {
    cpoeModule.getAllOrderSetByUser(userId, res);
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }

})
app.put('/ehr/cpoe/:userId/OrderSet/:setId', function (req, res) {
  var data = req.body;
  data.userId = req.params.userId;
  data._id = req.params.setId
  var userId = req.params.userId;
  if (isFieldFilled(data.userId) && isFieldFilled(data._id)) {
    cpoeModule.updateOrderSet(data, res);
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }

})
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:userId/getAllPackageOrders', function (req, res) {
  var userId = req.params.userId;
  if (isFieldFilled(userId)) {
    cpoeModule.getAllPackageOrdersByUser(userId, res);
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/getOrderSetDetails/:orderSetId', function (req, res) {
  var setId = req.params.orderSetId
  // console.log(setId)
  if (isFieldFilled(setId)) {
    cpoeModule.getOrderSetDetails(setId, res)
  } else {
    document.sendResponse('invalid INput', 406, 'error', 'none', res)
  }
})
app.get('/ehr/cpoe/complexorder/:recordId', function (req, res) {
  var recordId = req.params.recordId;
  cpoeModule.getComplexOrderDetails(recordId, res);
});
app.post('/ehr/cpoe/:userId/placeOrderSet', function (req, res) {
  var data = req.body
  if (isFieldFilled(data) && isFieldFilled(data.ordersList)) {
    cpoeModule.placeOrderSet(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.post('/ehr/cpoe/:setId/placePackageOrderSet', function (req, res) {
  var setId = req.params.setId
  var data = req.body
  // console.log(setId)
  if (isFieldFilled(data) && isFieldFilled(setId)) {
    cpoeModule.placePackageOrderSet(data, setId, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/*
 update cpoe order
 @params  :  patientId,doctorId,orderCategory,OrderSubCategory, orderItem, date , frequencyMaster
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/updateOrder

 */
//access.customMiddleware("Write","Orders"),
app.put('/ehr/cpoe/:orderId/updateOrder', function (req, res) {
  var data = req.body
  data.orderId = req.params.orderId;
  data.userId = req.decoded.userId;
  if (isFieldFilled(data) && isFieldFilled(data.orderId) && data.orderId != 'undefined') {
    cpoeModule.updateOrder(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.put('/ehr/cpoe/:orderId/complexOrder/', function (req, res) {
  var data = req.body;
  data.cpoeOrderId = req.params.orderId;
  data.decoded = req.decoded;
  req.checkParams('orderId', 'cpoeOrderId is required').notEmpty();
  req.checkBody('cancelledOrders', 'cancelledOrders is required');
  req.checkBody('updatedOrders', 'updatedOrders is required').notEmpty();
  req.getValidationResult().then(function (validationResult) {
    if (!validationResult.isEmpty()) {
      document.sendResponse('Validation Error', 408, 'error', validationResult.array(), res)
    } else {
      cpoeModule.updateComplexOrder(data, res);
    }
  })
  // 
})
app.put('/ehr/cpoe/:orderId/complexOrder/cancel/all', function (req, res) {
  var data = req.body;
  data.cpoeOrderId = req.params.orderId;
  data.userId = req.decoded.userId;
  req.checkParams('orderId', 'cpoeOrderId is required').notEmpty();
  req.getValidationResult().then(function (validationResult) {
    if (!validationResult.isEmpty()) {
      document.sendResponse('Validation Error', 408, 'error', validationResult.array(), res)
    } else {
      cpoeModule.cancelComplexGroup(data, res);
    }
  })
  // 
})

/*
 get favourite  cpoe order
 @params  :  userId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/getfavourites

 */
// app.get('/ehr/cpoe/getfavorites', function (req, res) {
//   var userId = req.query['userId']
//   if (isFieldFilled(userId)) {
//     cpoeModule.getFavoriteOrders(res)
//   } else {
//     var response = {
//       '_error_message': 'invalid userId',
//       '_status_Code': 406,
//       '_status': 'error',
//       'result': 'none'
//     }
//     res.send(response)
//   }
// })

/*
 search   cpoe orders by name
 @params  :  search key
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3300/ehr/cpoe/ordersbyname/:searchKey

 */
//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:userId/ordersbyname/:searchKey', function (req, res) {
  cpoeModule.searchOrdersByName(req.params.searchKey, req.params.userId, res)
})

/*
 get   cpoe orders by date range
 @params  :  userId, lower date range, upper date range
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3300/ehr/cpoe/:userId/getOrdersReview/dateRange?lowwer&&upper

 */
// access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:patientId/getOrdersReview/dateRange', function (req, res) {
  var patientId = req.params.patientId
  var upper = req.query['upper']
  var lower = req.query['lower']
  var data = {
    patientId: patientId,
    dateLower: lower,
    dateUpper: upper
  }
  log('hit get patient orders by date api')
  if (!isFieldFilled(data)) {
    var response = {
      '_error_message': 'invalid patientId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    cpoeModule.getCpoeOrdersReviewByDate(data, res)
  }
})

/*
 get cpoe order by category ex:lab , pharmacy, radiology
 @params  :  userId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:5100/ehr/cpoe/:patientId/getOrder/category?category=Medicine

 */

//access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:patientId/getOrder/category', function (req, res) {
  var patientId = req.params.patientId
  var category = req.query['category']
  var subCat = req.query['subcategory']
  if (isFieldFilled(category)) {
    cpoeModule.getCpoeOrdersByCategory(patientId, category, subCat, res)
  } else {
    var response = {
      '_error_message': 'invalid category',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/*
 get  complex pharmacy orders by subcategory
 @params  :  patient
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3300/ehr/cpoe/:patientId/getOrder/pharmacy/complex

 */

//  access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:patientId/getOrder/pharmacy/complex', function (req, res) {
  var patientId = req.params.patientId
  var subCat = req.query['subcat']
  if (isFieldFilled(subCat)) {
    cpoeModule.getCpoeComplexPharmacyOrders(patientId, subCat, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/*
 get cpoe order details by orderId
 @params  :  userId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:5100/ehr/cpoe/:orderId/getDetails

 */
// access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:orderId/getDetails', function (req, res) {
  var orderId = req.params.orderId
  if (isFieldFilled(orderId)) {
    cpoeModule.getCpoeOrdersById(orderId, res)
  } else {
    var response = {
      '_error_message': 'invalid orderId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/*
 get recent  cpoe orders
 @params  :  orderId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/getRecentOrders
 */
// access.customMiddleware("Read","Orders"),
app.get("/ehr/cpoe/:userId/getRecentOrders", function (req, res) {
  var data = {};
  data.userId = req.params.userId;
  data.count = req.query["count"];
  if (isFieldFilled(data)) {
    cpoeModule.getRecentOrders(data, res);
  } else {
    var response = {
      "_error_message": "invalid userId",
      "_status_Code": 406,
      "_status": "error",
      "result": "none"
    }
    res.send(response);
  }
})

/*
 add  cpoe order to favourite 
 @params  :  orderId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/addToFavorites

 */
// app.get('/ehr/cpoe/:orderId/addToFavorites', function (req, res) {
//   var orderId = req.params.orderId
//   if (isFieldFilled(orderId)) {
//     cpoeModule.addOrderToFavorites(orderId, res)
//   } else {
//     var response = {
//       '_error_message': 'invalid orderId',
//       '_status_Code': 406,
//       '_status': 'error',
//       'result': 'none'
//     }
//     res.send(response)
//   }
// })

/*
 remove  cpoe order to favourite 
 @params  :  orderId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/removeFromFavorites

 */
// app.get('/ehr/cpoe/:orderId/removeFromFavorites', function (req, res) {
//   var orderId = req.params.orderId
//   if (isFieldFilled(orderId)) {
//     cpoeModule.removeOrderFromFavorites(orderId, res)
//   } else {
//     var response = {
//       '_error_message': 'invalid orderId',
//       '_status_Code': 406,
//       '_status': 'error',
//       'result': 'none'
//     }
//     res.send(response)
//   }
// })

/*
 cancel  cpoe order  
 @params  :  orderId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/cancelOrder

 */
app.put('/ehr/cpoe/:orderId/cancelOrder', function (req, res) {
  var data = {};
  data.orderId = req.params.orderId;
  data.userId = req.decoded.userId;
  if (isFieldFilled(data.orderId)) {
    cpoeModule.cancelOrder(data, res)
  } else {
    var response = {
      '_error_message': 'invalid orderId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/*
 discontinue  cpoe order  
 @params  :  orderId
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/discontinueOrder
 */
app.put('/ehr/cpoe/:orderId/discontinueOrder', function (req, res) {
  var data = req.body;
  data.orderId = req.params.orderId;
  data.userId = req.decoded;
  req.checkBody('isScheduledDiscontinue', 'isScheduledDiscontinue is required').isBoolean();
  req.checkBody('discontinueTime', ' discontinueTime is required').isInt();
  req.checkParams('orderId', 'orderId is Required').notEmpty();
  req.getValidationResult().then(function (validationError) {
    if (validationError.isEmpty()) {
      cpoeModule.discontinueOrder(data, res)
    } else {
      document.sendResponse('Validation Error', 408, 'error', validationError.array(), res)
    }
  })

})

/*
 repeat  cpoe order by new id 
 @params  :  orderDate,
 @returns  :  200
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:orderId/repeatOrder

 */
app.put('/ehr/cpoe/:orderId/repeatOrder', function (req, res) {

  if (isFieldFilled(req.params.orderId)) {
    cpoeModule.repeatOrder(req, res)
  } else {
    var response = {
      '_error_message': 'invalid orderId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

// //////////////////* cpoe order review and sign services***********/
/*
 Get all the cpoe orders details with  status
 @params  :  doctorId
 @returns  : order list
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:doctorId/getOrdersReview
 */

app.get('/ehr/cpoe/:patientId/getOrdersReview', function (req, res) {
  var data = {}
  data.patientId = req.params.patientId
  if (isFieldFilled(data.patientId)) {
    cpoeModule.getCpoeOrdersReview(data, req, res)
  } else {
    var response = {
      '_error_message': 'invalid doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/*
 Get all the cpoe orders details with  status by date
 @params  :  doctorId, date
 @returns  : order list
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/cpoe/:doctorId/getOrdersReview/Date?date=
 */
// access.customMiddleware("Read","Orders"),
app.get('/ehr/cpoe/:patientId/getOrdersReview/Date', function (req, res) {
  log('............hit get cpoe orders by date')
  var data = {}
  data.patientId = req.params.patientId
  var dateParam = req.query['date']
  var date = new Date().setTime(dateParam)
  var dateLower = new Date(date)
  dateLower.setHours(0)
  dateLower.setMinutes(0)
  dateLower.setMilliseconds(0)
  var dateUpper = new Date(date)
  dateUpper.setHours(23)
  dateUpper.setMinutes(59)
  dateUpper.setMilliseconds(999)
  data.dateLower = dateLower.getTime()
  data.dateUpper = dateUpper.getTime()
  // log(data.dateLower)
  // log(data.dateUpper)
  if (isFieldFilled(data.doctorId)) {
    cpoeModule.getCpoeOrdersReviewByDate(data, res)
  } else {
    var response = {
      '_error_message': 'invalid doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/*
 Get all the unsigned cpoe orders details by PatientId
 @params  :  doctorId, patientid
 @returns  : order list
 @exceptions  : 500,404,406
 @url: http://localhost:5100/ehr/cpoe/:doctorId/patient/:patientId/getUnsignedOrders
 */
//,access.customMiddleware("Read","Orders")
app.get('/ehr/cpoe/:userId/patient/:patientId/getUnsignedOrders', function (req, res) {
  log('retriving unsigned orders')
  var data = {}
  data.userId = req.params.userId
  data.patientId = req.params.patientId
  // log(data.)
  if (isFieldFilled(data.userId) && isFieldFilled(data.patientId)) {
    cpoeModule.getPatientUnsignedOrders(data, res)
  } else {
    var response = {
      '_error_message': 'invalid doctorId or patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/*
Sign multiple cpoe orders by ids Array
 @params  :  doctorId
 @body: orderIds
 @returns  : status code
 @exceptions  : 500,404,406
 @url: http://localhost:5100/ehr/cpoe/:doctorId/signOrders
 */

app.put('/ehr/cpoe/:userId/signOrders', function (req, res) {
  log('..................hit signCpoeOrders')
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data.userId) && isFieldFilled(data.cpoeOrders)) {
    cpoeModule.signCpoeOrders(data, res)
  } else {
    var response = {
      '_error_message': 'invalid inputs',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.put('/ehr/cpoe/:userId/changeSignature', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  // log("u:"+data.userId+"  P:"+data.currentSignature+"  np:"+data.signature)
  if (isFieldFilled(data.userId) && isFieldFilled(data.signature) && isFieldFilled(data.currentSignature)) {
    doctorModule.changeSign(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.put('/ehr/user/:userId/changePassword', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  log("u:" + data.userId + "  P:" + data.currentPassword + "  np:" + data.newPassword)
  if (isFieldFilled(data.userId) && isFieldFilled(data.currentPassword) && isFieldFilled(data.newPassword)) {
    doctorModule.changePassword(data, res)
  } else {
    var response = {
      '_error_message': 'invalid doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

// //////////////////* Drug services***********/

/*
 Get details for generic drug
 @params  :  drugName
 @returns  : drug object
 @exceptions  : 500,404,406
 @url: http://localhost:3100/ehr/api/genericDrugs/Crocin
 */
app.get('/ehr/genericDrug/:drugName', function (req, res) {
  var drugName = req.params.drugName
  log('api generic drug')
  //    var patientAgeCategory = req.param('patientAgeCategory')
  if (drugName === '' || typeof drugName === 'undefined') {
    var response = {
      '_error_message': 'invalid drugName',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    // checkSessionValidation(session,res,function(){
    pharmacyModule.getGenericDrugWithDetails(drugName, res)
    // })
  }
})

app.post('/ehr/addGenericDrug', function (req, res) {
  var data = req.body
  if (data.length <= 0) {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    pharmacyModule.addGenericDrugWithDetails(data, res)
  }
})
// //******************* medication module api*************/
/*  
    add medication records for patient
    @params  :  patientId, drugName , order by, start date, stop date, status
    @returns  : 
    @exceptions  : 500,404,406

 */
// app.post('/ehr/patient/:patientId/medications', function (req, res) {
//   var data = req.body
//   var patientId = req.params.patientId
//   log('..............hit medication add api')
//   if (isFieldFilled(patientId)) {
//     patient_model.addMedication(data, patientId, res)
//   } else {
//     var response = {
//       '_error_message': 'invalid patientId',
//       '_status_Code': 406,
//       '_status': 'error',
//       'result': 'none'
//     }
//     res.send(response)
//   }
// })

/*  
    get all medication records for patient
    @params  :  patientId
    @returns  : drugName , order by, start date, stop date, status
    @exceptions  : 500,404,406

 */
app.get('/ehr/patient/:patientId/medications', function (req, res) {
  // var data=req.body
  var patientId = req.params.patientId
  log('..............hit medication view  api')
  if (isFieldFilled(patientId)) {
    patient_model.getMedication(patientId, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/*  
    get all active medication records for patient
    @params  :  patientId
    @returns  : drugName , order by, start date, stop date, status
    @exceptions  : 500,404,406

 */
app.get('/ehr/patient/:patientId/medications/active', function (req, res) {
  var patientId = req.params.patientId
  log('..............hit active medication view  api')
  if (isFieldFilled(patientId)) {
    patient_model.getActiveMedication(patientId, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/*  
    change Statusof  medication records for patient
    @params  :  medication record id
    @returns  : 
    @exceptions  : 500,404,406

 */
app.put('/ehr/patient/:medicationId/medications', function (req, res) {
  var data = req.body
  var status = data.status
  var medicationId = req.params.medicationId
  log('..............hit medication update  api')
  if (isFieldFilled(medicationId)) {
    patient_model.updateMedication(medicationId, status, res)
  } else {
    var response = {
      '_error_message': 'invalid medicationId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

// //******************* patient module api*************/
/*  
    get all  drugs and dosages from previous visit of patient
    @params  :  patientId, doctorID
    @returns  : drugAndDosages Array
    @exceptions  : 500,404,406

 */

app.get('/ehr/:patientId/drugs/allVisits', function (req, res) {
  var data = {
    doctorId: req.params.doctorId,
    patientId: req.params.patientId
  }
  //    var session = req.param('session')
  if (data.patientId === '' || data.doctorId === '' ||
    typeof data.patientId === 'undefined' ||
    typeof data.doctorId === 'undefined') {
    var response = {
      '_error_message': 'invalid patientId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    // checkSessionValidation(session,res,function() {
    patient.getMedicationDetailsFromAllVisits(data, res)
    // })
  }
})

/* 
 get all  drugs and dosages from last visit of patient
 @params  :  patientId, doctorID
 @returns  : drugAndDosages Array
 @exceptions  : 500,404,406

 */
app.get('/ehr/:patientId/currentDrugs/lastVisits', function (req, res) {
  var data = {
    doctorId: req.params.doctorId,
    patientId: req.params.patientId
  }
  //    var session = req.param('session')
  if (data.patientId === '' || data.doctorId === '' ||
    typeof data.patientId === 'undefined' ||
    typeof data.doctorId === 'undefined') {
    var response = {
      '_error_message': 'invalid patientId or doctorId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    // checkSessionValidation(session,res,function() {
    patient.getCurrentMedicationsFromLastVisits(data, res)
    // })
  }
})

/* ******** *************/

function isFieldFilled(value) {
  if (typeof value != 'undefined' && value != '' && value != null && value != undefined && value != 'undefined') {
    return true
  } else {
    return false
  }
}

function checkSessionValidation(sessionId, reqResponse, callback) {
  if (typeof sessionId === 'undefined' || sessionId == '') {
    reqResponse.send(410)
  }
  var path = '/http-api/resources/identity/sessionValidation/' + sessionId + '?apiKey=' + AAROGYAM_API_KEY

  var options = {
    host: AAROGYAM_BASE_URL,
    port: AAROGYAM_BASE_URL_PORT,
    path: path

  }

  http1.get(options, function (res) {
    res.on('data', function (chunk) {
      // console.log("reply " + chunk)
      if (chunk == '"true"') {
        // console.log('session valid' )
        if (callback) {
          // console.log("calling callback")
          callback()
        }
      } else {
        console.log('session invalid')
        reqResponse.send(410)
      }
    })
  }).on('error', function (e) {
    console.log('ERROR: ' + e.message)
    console.log(e.stack)
    //            reqResponse.send(500)
    reqResponse.send(200)
  })
}

/*
  View System User Audit
   @params  : Patient Id.
   @returns  : status
   @exceptions  : 500,405,406
   @url: http://localhost:3000/ehr/patient/:patientId/flag
 */

app.get('/ehr/UserAudit/:userId', function (req, res) {
  var userId = req.params.userId
  log('hit get User Audits api')
  if (!isFieldFilled(userId)) {
    var response = {
      '_error_message': 'invalid userId ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    user_audit.showUser_audit(userId, res)
  }
})

// //******************* Integration TOUCHPOINT api*************/
/*  
    
    @params  :  
    @returns  : 
    @exceptions  : 500,404,406

 */

/* Radiology Results add api. */

app.post('/ehr/patient/radiology', function (req, res) {
  var data = req.body
  var patientId = data.patientId
  log('..............hit Radiology add api')
  if (isFieldFilled(patientId)) {
    integration_model.radiologyInput(data, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/* Patient Admissions Transfers and Discharge Services */

app.post('/ehr/patient/Admissions', function (req, res) {
  var data = req.body
  var patientId = data.patientId
  log('..............hit Admission add api')
  if (isFieldFilled(patientId)) {
    integration_model.admissionInput(data, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.post('/ehr/patient/AdmissionsTransfer', function (req, res) {
  var data = req.body
  log('..............hit Admission add api')
  if (isFieldFilled(data.patientId) && isFieldFilled(data.type)) {
    switch (data.type) {
      case 'Admission':
        console.log(data)
        res.send(200)
        // integration_model.admissionInput(data, res)
        break
      case 'Transfer':
        console.log(data)
        res.send(200)
        // integration_model.updatePatientBedStatus(data, res)
        break
      default:
        var response = {
          '_error_message': 'invalid Type',
          '_status_Code': 406,
          '_status': 'error',
          'result': 'none'
        }
        res.send(response)
        break

    }
    // integration_model.admissionTransferDischarge(data, res)

  } else {
    var response = {
      '_error_message': 'invalid patientId or type',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.post('/ehr/patient/Discharge', function (req, res) {
  var data = req.body
  var patientId = data.patientId
  log('..............hit Discharge add api')
  if (isFieldFilled(patientId)) {
    integration_model.updatePatientDischarge(data, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.put('/ehr/patient/Transfers', function (req, res) {
  var data = req.body
  if (isFieldFilled(data) && isFieldFilled(data.patientId) && isFieldFilled(data.admissionId)) {
    integration_model.updatePatientBedStatus(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.post('/ehr/patient/OTschedule', function (req, res) {
  var data = req.body
  var patientId = data.patientId
  log('..............hit OT add api')
  if (isFieldFilled(patientId)) {
    integration_model.OTinput(data, res)
  } else {
    var response = {
      '_error_message': 'invalid patientId',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.put('/ehr/patient/OTschedule', function (req, res) {
  var data = req.body
  if (isFieldFilled(data) && isFieldFilled(data.patientId) && isFieldFilled(data.OTid)) {
    log('Hit update OT schedule API')
    integration_model.updateOTschedule(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.put('/ehr/patient/medicationDispensed', function (req, res) {
  var data = req.body
  if (isFieldFilled(data)) {
    integration_model.updateMedicationDispensedStatus(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
/**********************consult order Management services***********/
app.put('/ehr/doctor/:doctorId/respond/consultNotification', function (req, res) {
  var data = req.body
  data.doctorId = req.params.doctorId
  if (isFieldFilled(data)) {
    cpoeModule.respondConsultNotification(data, res)
  } else {
    var response = {
      '_error_message': 'invalid input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/doctors/:patientId/searchMedication', function (req, res) {
  var criteria = {
    searchBy: 'drugName',
    searchValue: req.query['searchValue'],
    patientId: req.param('patientId')
  }
  log('Searching Medications in the Records')
  // console.log(criteria); if (str.search("102") <0)
  patient_model.medicationSearch(criteria, res)
})

app.get('/ehr/doctor/:userId/getNotification', function (req, res) {
  var userId = req.param('userId')
  log('hit get Notifications by User Id .......')
  if (!isFieldFilled(userId)) {
    var response = {
      '_error_message': 'invalid User Id ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  } else {
    notificationModel.viewNotification(userId, res)
  }
})
/********************** user Management services***********/
/******############## gender master  api################ */
app.post('/ehr/api/user/:userId/master/gender', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.addGender(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/gender', function (req, res) {
  user_management.getAllGenders(res)
})

/******############## notifications type master  api################ */
app.post('/ehr/api/user/:userId/master/notificationsType', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    masterModule.addNotificationsType(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.post('/ehr/api/user/:userId/master/notificationsAction', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    masterModule.addNotificationsAction(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})
app.get('/ehr/api/user/master/notificationAction', function (req, res) {
  masterModule.getAllNotificationActions(res)
})
app.get('/ehr/api/user/master/notificationsType', function (req, res) {
  masterModule.getAllNotificationsType(res)
})
/******############## preferred notification of user  api################ */
app.post('/ehr/api/user/:userId/settings/prefNotifications', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data.userId)) {
    notificationModel.setPrefNotifications(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/:userId/settings/prefNotifications', function (req, res) {
  var userId = req.params.userId
  notificationModel.getPrefnotifications(userId, res)
})
/******############## user type master  api################ */
app.post('/ehr/api/user/:userId/master/userType', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.addUserType(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/userType', function (req, res) {
  user_management.getAllUserType(res)
})

/******############## user dependent  master  api################ */
app.post('/ehr/api/user/:userId/master/dependentRelationship', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.addDependentRelationship(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/dependentRelationship', function (req, res) {
  user_management.getDependentRelationship(res)
})

/******##############  doctor unit################ */
app.post('/ehr/api/user/:userId/master/doctorUnit', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  log("creating new unit:" + data.userId)
  if (isFieldFilled(data)) {
    user_management.addDoctorUnit(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorUnit', function (req, res) {
  user_management.getDoctorUnit(res)
})
// // autocomplete
// app.get('/ehr/api/user/automaster/doctorUnit/:searchKey', function (req, res) {
//   user_management.autoDoctorUnit(req.params.searchKey, res)
// })

app.put('/ehr/api/user/:userId/master/doctorUnit', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorUnit(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorUnit/:groupId', function (req, res) {
  var data = {};
  data._id = req.params.groupId
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.deleteDoctorUnit(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})


/******##############  doctor group################ */
app.post('/ehr/api/user/:userId/master/doctorGroup', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.addDoctorGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorGroup', function (req, res) {
  user_management.getDoctorGroup(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorGroup/:searchKey', function (req, res) {
  user_management.autoDoctorGroup(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorGroup', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorGroup/:groupId', function (req, res) {
  var data = {}
  data._id = req.params.groupId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/******##############  doctor sub group################ */
app.post('/ehr/api/user/:userId/master/doctorSubGroup', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  log("creating new subGroup:" + data.userId)
  if (isFieldFilled(data)) {
    user_management.addDoctorSubGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorSubGroup', function (req, res) {
  user_management.getDoctorSubGroup(res)
})
app.get('/ehr/api/user/master/:groupId/doctorSubGroup', function (req, res) {
  var groupId = req.params.groupId;
  user_management.getDoctorSubGroupBygroupId(groupId, res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorSubGroup/:searchKey', function (req, res) {
  user_management.autoDoctorSubGroup(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorSubGroup', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorSubGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorSubGroup/:groupId', function (req, res) {
  var data = {};
  data._id = req.params.groupId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorSubGroup(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/******##############  doctor type ################ */
app.post('/ehr/api/user/:userId/master/doctorType', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.addDoctorType(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorType', function (req, res) {
  user_management.getDoctorType(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorType/:searchKey', function (req, res) {
  user_management.autoDoctorType(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorType', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorType(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorType/:typeId', function (req, res) {
  var data = {};
  data._id = req.params.typeId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorType(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/******##############  doctor Department ################ */
app.post('/ehr/api/user/:userId/master/doctorDepartment', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.addDoctorDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorDepartment', function (req, res) {
  user_management.getDoctorDepartment(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorDepartment/:searchKey', function (req, res) {
  user_management.autoDoctorDepartment(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorDepartment', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorDepartment/:DepartmentId', function (req, res) {
  var data = {};
  data._id = req.params.DepartmentId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/******##############  doctor Classification ################ */
app.post('/ehr/api/user/:userId/master/doctorClassification', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.addDoctorClassification(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorClassification', function (req, res) {
  user_management.getDoctorClassification(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorClassification/:searchKey', function (req, res) {
  user_management.autoDoctorClassification(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorClassification', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorClassification(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorClassification/:ClassificationId', function (req, res) {
  var data = {};
  data._id = req.params.ClassificationId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorClassification(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/patientDocument/:patientId/visit/:visitId/location/:location', function (req, res) {
  var data = {
    patientId: req.params.patientId,
    visitId: req.params.visitId,
    location: req.params.location,
    doctorId: req.decoded.userId,
    category: req.query['category']
  }
  //console.log("Category: "+req.query['category'] + "    "+req.decoded.userId)
  patient_model.getPatientDocument(data, res);
})

/******##############  doctor Designation ################ */
app.post('/ehr/api/user/:userId/master/doctorDesignation', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.addDoctorDesignation(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorDesignation', function (req, res) {
  user_management.getDoctorDesignation(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorDesignation/:searchKey', function (req, res) {
  user_management.autoDoctorDesignation(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorDesignation', function (req, res) {
  var data = req.body
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.updateDoctorDesignation(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorDesignation/:DesignationId', function (req, res) {
  var data = {};
  data._id = req.params.DesignationId
  data.userId = req.params.userId

  if (isFieldFilled(data)) {
    user_management.deleteDoctorDesignation(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

/******##############  doctor SubDepartment ################ */
app.post('/ehr/api/user/:userId/master/doctorSubDepartment', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.addDoctorSubDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.get('/ehr/api/user/master/doctorSubDepartment', function (req, res) {
  user_management.getDoctorSubDepartment(res)
})
// autocomplete
app.get('/ehr/api/user/automaster/doctorSubDepartment/:searchKey', function (req, res) {
  user_management.autoDoctorSubDepartment(req.params.searchKey, res)
})

app.put('/ehr/api/user/:userId/master/doctorSubDepartment', function (req, res) {
  var data = req.body
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.updateDoctorSubDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.delete('/ehr/api/user/:userId/master/doctorSubDepartment/:SubDepartmentId', function (req, res) {
  var data = {};
  data._id = req.params.SubDepartmentId
  data.userId = req.params.userId
  if (isFieldFilled(data)) {
    user_management.deleteDoctorSubDepartment(data, res)
  } else {
    var response = {
      '_error_message': 'invalid Input ',
      '_status_Code': 406,
      '_status': 'error',
      'result': 'none'
    }
    res.send(response)
  }
})

app.post('/ehr/api/user/register', function (req, res) {

  log("hit register user api........")

  req.params.userId = uuid.v4();// to upload file need userId

  upload(req, res, function (err) {
    if (err) {
      log(err)
      res.send(err)
    } else if (req.files) {
      // log(req.files)
      var data = req.body;
      data.userId = req.params.userId;
      if (isFieldFilled(data.created_by)) {
        user_management.registerUser(data, req.files, res);
      } else {
        var response = {
          '_error_message': 'invalid created_by Input ',
          '_status_Code': 406,
          '_status': 'error',
          'result': 'none'
        }
        res.send(response)
      }
    } else {
      var response = {
        '_error_message': 'invalid files',
        '_status_Code': 406,
        '_status': 'error',
        'result': 'none'
      }
      res.send(response)
    }
  })


});
app.put('/ehr/api/user/update/:userId', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      log(err)
      res.send(err)
    } else if (req.files) {
      // log(req.files)
      var data = req.body;
      // console.log(data);
      // data.userId = req.params.userId;
      user_management.updateUserDetails(req.params.userId, data, req.files, res);

    } else {
      var response = {
        '_error_message': 'invalid files',
        '_status_Code': 406,
        '_status': 'error',
        'result': 'none'
      }
      res.send(response)
    }
  })


});
app.get('/ehr/api/user/all', function (req, res) {
  // log('hit get all EMR users')
  user_management.getAllRegisteredUsers(res);
});
app.get('/ehr/api/user/:userId', function (req, res) {
  // log('hit get  EMR users')
  var Id = req.params.userId;
  user_management.getUserDetails(Id, res);
});

app.post('/ehr/api/user/:userId/sendEmail', function (req, res) {
  var data = req.body;
  data.userId = req.params.userId;

  if (isFieldFilled(data.userId)) {
    user_management.sendEmail(data, res);
  } else {
    document.sendResponse("invalid Input", 406, 'error', '', res);
  }
});
app.put('/ehr/api/user/:userId/toggleActive', function (req, res) {
  var userId = req.params.userId;
  log('toggle user active state' + userId)
  if (isFieldFilled(userId)) {
    user_management.toogleUserActiveStatus(userId, res);
  } else {
    document.sendResponse("invalid Input", 406, 'error', '', res);
  }
});

app.put('/ehr/api/user/:userId/update', function (req, res) {
  var data = req.body;
  data.userId = req.params.userId;
  if (isFieldFilled(data.userId)) {
    user_management.updateUser(req, data, res);
  } else {
    document.sendResponse("invalid Input", 406, 'error', '1', res);
  }

})

/*
CPOE Orders Results API
1. Imaging Order
*/

app.get('/ehr/cpoeresults/imaging/:id', (req, res) => {
  imagingModel.getImagingResult(req, res);
})

app.get('/ehr/cpoeresults/imaging', (req, res) => {
  imagingModel.getImagingOrderList(req, res);
})
// mims for test

// mongoose.connection.on('open', function (ref) {
//   console.log('Connected to mongo server.');
//   //trying to get collection names
//   mongoose.connection.db.listCollections().toArray((err, names) => {
//     if (err) {
//       console.log("Error is: " + err)
//     } else {
//       console.log("All Collections name:  " + JSON.stringify(names)); // [{ name: 'dbname.myCollection' }]
//     }
//   });
// })


app.post('/ehr/request/test', function (req, res) {
  // console.log(req.body)
  var options = {
    uri: Utility.baseURL() + '/ehr/mims/findInteraction',
    method: 'POST',
    headers: {
      'x-access-token': req.headers['x-access-token']
    },
    body: {
      'drugs': req.body.drugs,
      'allergies': req.body.allergies,
      'patientId': req.body.patientId,
      'health': []
    },
    json: true
  }
  request(options)
    .then(function (result) {
      // mimsInteraction.addDrug()
      // console.log('git the result');
      res.send(result);
    })
    .catch(function (error) {
      res.send(error)
    })
});

app.use('/ehr/api/masters', require('./routes/MasterRoute.js'));

app.get('/ehr/test/shaikhriyaz/email', function (req, res) {
  var payload = {};
  payload.email = req.query.email ? req.query.email : 'riyaj@sdglobaltech.com';
  payload.fileUrl = './data/email/password_reset.html';
  payload.subject = 'Activate Your Clinicare Account';
  var replacements = {
    username: 'user.accessCode',
    email: 'user.email',
    password: 'key',
    link: '' + SMTP_CONFIG.baseUrl +
      '/#/?email=' + payload.email + '&token=' + 'token'
  }
  notificationModel.sendTemplateMail(payload, replacements, function (err) {
    if (err) {
      res.json(err)
    } else {
      res.send('okwa')
    }
  });

})
app.get('/ehr/test/shaikhriyaz/unverified/notification', function (req, res) {
  schedule.generateUnverifiedNotifications(res);
});
app.get('/ehr/test/shaikhriyaz/resource/updateId', function (req, res) {
  access.resourceUpdateIDs()
  res.send(200)
});
app.get('/ehr/test/shaikhriyaz/resource/serialization', function (req, res) {
  experiment.resourceSerialization();
  res.send('tested ok')
})
app.get('/ehr/test/shaikhriyaz/visit/convertmrn', function (req, res) {
  experiment.convertVisitMrn()
  res.send(200)
});
app.get('/ehr/test/shaikhriyaz/group/resource', function (req, res) {
  experiment.resourceGrouping()
  res.send(200)
});
app.get('/ehr/test/shaikhriyaz/medication/status', function (req, res) {
  schedule.testOrders();
  res.send('ok')
})
app.get('/ehr/test/shaikhriyaz/linking/resource', function (req, res) {
  experiment.resourceLinking()
  res.send(200)
});
app.put('/ehr/test/shaikhriyaz/linking/resource', function (req, res) {
  var data = req.body;
  experiment.updateResourcePosition(data, res);

});
app.put('/ehr/test/shaikhriyaz/acl/assignRoleToAll', function (req, res) {
  var data = req.body;
  access.assignRoleToAllUser(data, res);

});

app.use('/ehr/api/nursing/station', nursing_route);
/**********************the end****************** **************************************/

/*Configure server to listen on port*/

server.listen(EHR_SERVER_CONFIG.serverPort, function (err, listening) {
  if (err) {
    log('[Node] Error while listening' + err.message)
  } else {
    log('[Node] Listening to port:' + EHR_SERVER_CONFIG.serverPort)
  }
})

/***********************************the end********************************************************/
