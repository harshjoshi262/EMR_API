var express = require('express');
var router = express.Router();
var PatientController = new require(APP_ROOT_PATH + '/controllers/PatientController');
var PatientInstance = new PatientController();
var patient_model=require(APP_ROOT_PATH + '/models/patient_model.js')
router.get('/wards/get', MIDDLEWARE.isLoggedIn, function (req, res, next) {
    PatientInstance.getPatientIPDWards(req, res, next);
});
router.get('/search', function (req, res, next) {
    var criteria = {
        searchBy: req.query['searchBy'],
        searchValue: req.query['searchValue'],
        doctorId: req.params.doctorId,
        lower: req.query['lower'],
        upper: req.query['upper']
    };
    patient_model.searchPatients(criteria, res, req);
});
router.get('/lastVisitRecords', function (req, res, next) {
    var data = {}
    data.patientId = "";
    data.mrn=req.query.mrn;
    log('.................hit last visit records api')
    patient_model.getPatientRecords(data, res);
});
module.exports = router;
