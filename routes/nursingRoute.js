var express = require('express'),
    router = express.Router(),
    nursingController = require('../controllers/nursingController');
var document = require('../models/db_model.js');


router.get('/patients', function (req, res) {
    nursingController.stationPatientDashboard(req, res);
})

router.get('/patients/:isWard/ward', function (req, res) {
    req.checkParams('isWard', 'invalid Flag').notEmpty();
    if(req.params.isWard=='true'){
        req.checkQuery('wardId', 'invalid wardId').notEmpty();
        req.checkQuery('stationId', 'invalid stationId').notEmpty();
    }else{
        req.checkQuery('cabinId', 'invalid cabinId').notEmpty();
    }
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            // res.send(req.query);
            if(req.params.isWard=='true'){
                nursingController.stationDashboardByWard(req, res);
            }else{
                nursingController.stationDashboardByCabin(req, res);
            }
           
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})

router.get('/list', function (req, res) {
    nursingController.userWardList(req.decoded.userId, function (err, result) {
        if (err) {
            document.sendResponse('something went wrong please try again', 501, 'error', err, res)
        } else {
            document.sendResponse(result.length + ' Records found', 200, 'done', result, res);
        }
    });
})
router.get('/patients/list', function (req, res) {
    nursingController.stationPatientList(req, res);
})
router.get('/patients/visit/:visitId/task', function (req, res) {
    req.checkParams('visitId', 'invalid visitId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.visitNursingTaskList(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})
router.get('/patients/visit/:visitId/task/incomplete', function (req, res) {
    req.checkParams('visitId', 'invalid visitId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.visitIncomleteTaskList(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})
router.post('/patients/:patientId/visit/:visitId/task', function (req, res) {
    req.checkParams('patientId', 'invalid patientId').notEmpty();
    req.checkParams('visitId', 'invalid visitId').notEmpty();
    req.checkBody('Task', 'invalid visitId').notEmpty();
    req.checkBody('StartDate', 'invalid StartDate').notEmpty();
    req.checkBody('StopDate', 'invalid EndDate').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.addNursingTask(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})
router.put('/patients/task/:taskId/markerror', function (req, res) {
    req.checkParams('taskId', 'invalid taskId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.markErrorTask(req.params.taskId, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})
router.put('/patients/task/:taskId/update', function (req, res) {
    req.checkParams('taskId', 'invalid taskId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.updateTask(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })

})
router.put('/patients/task/:taskId/complete', function (req, res) {
    req.checkParams('taskId', 'invalid taskId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.markCompleteTask(req.params.taskId, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})
router.put('/patients/order/:orderId/acknowledge', function (req, res) {
    req.checkParams('orderId', 'invalid taskId').notEmpty();
    req.getValidationResult().then(function (errors) {
        if (errors.isEmpty()) {
            nursingController.acknowledgeOrder(req, res);
        } else {
            document.sendValidationError(errors.array(), res);
        }
    })
})
module.exports = router;