var express = require('express'),
 router = express.Router(),
 masterModule = require('../models/master-utility-model.js');

router.get('/LabTestMaster/:category/:search', function (req, res) {
  //masterHISModule.getLabList(req, res)
  masterModule.getLabTestByCategory(req, res);
})
router.get('/auto/recordMaster/:category/:search', function (req, res) {
  //masterHISModule.getLabList(req, res)
  masterModule.autoRecordMasterByCategory(req, res);
})
router.get('/recordMaster/:category', function (req, res) {
  //masterHISModule.getLabList(req, res)
  masterModule.getRecordMasterByCategory(req, res);
})
router.post('/recordMaster/:category/:displayName', function (req, res) {
  //masterHISModule.getLabList(req, res)
  masterModule.addRecordMaster(req, res);
})
module.exports = router