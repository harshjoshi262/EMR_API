var mongoose = require('mongoose'),
  
    uuid = require('node-uuid');
require('graylog');


/****************Radiology Test Master APIs****************/

moudle.exports.radiology_testMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.Test_Code = data.Test_Code;
    radiologySave.Test_Category = data.Test_Category;
    radiologySave.Test_Category_ID = data.Test_Category_ID;
    radiologySave.Service_ID = data.Service_ID;
    radiologySave.Modifier = data.Modifier;
    radiologySave.Modality = data.Modality;
    radiologySave.Test_Name = data.Test_Name;
    radiologySave.Service_Name = data.Service_Name;
    radiologySave.Print_Test_Name = data.Print_Test_Name;
    radiologySave.Turaround_Time = data.Turaround_Time;
    radiologySave.state = data.state;


    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.radiology_testCategoryMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.code = data.code;
    radiologySave.description = data.description;
    radiologySave.state = data.state;

    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.radiology_modifierMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.code = data.code;
    radiologySave.description = data.description;
    radiologySave.state = data.state;

    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.radiology_modalityMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.code = data.code;
    radiologySave.description = data.description;
    radiologySave.state = data.state;

    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.radiology_transportMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.code = data.code;
    radiologySave.description = data.description;
    radiologySave.state = data.state;

    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.radiology_submitMaster = function (data, res) {

    var radiologySave = new documentObject12.abc();

    radiologySave.code = data.code;
    radiologySave.description = data.description;
    radiologySave.state = data.state;

    radiologySave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

/****************Unit Test Master APIs****************/

moudle.exports.unit_Master = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.contactNumber = data.contactNumber;
    unitSave.clinicEmail = unitSave.clinicEmail;
    unitSave.clinicFaxNumber = data.clinicFaxNumber;
    unitSave.pharmacyLicenseNumber = data.pharmacyLicenseNumber;
    unitSave.addressLine1 = data.addressLine1;
    unitSave.postCode = data.postCode;
    unitSave.clinicRegistrationNumber = data.clinicRegistrationNumber;
    unitSave.shopAndEstablishmentNumber = data.shopAndEstablishmentNumber;
    unitSave.tradeNumber = data.tradeNumber;
    unitSave.server = data.server;
    unitSave.database = data.database;
    unitSave.department = data.department;    //????????????????
    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_doctorGroupMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_subGroupMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_doctorTypeMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_departmentMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_classificationMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_visitTypeMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.state = data.state;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.unit_cabinMaster = function (data, res) {

    var unitSave = new documentObject12.abc();

    unitSave.code = data.code;
    unitSave.description = data.description;
    unitSave.status = data.status;

    unitSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

/****************Blood Component Master APIs****************/

moudle.exports.bloodComponentMaster = function (data, res) {

    var bloodComponentSave = new documentObject12.abc();

    bloodComponentSave.id = uuid.v4();
    bloodComponentSave.code = data.code;
    bloodComponentSave.shortDescription = data.shortDescription;
    bloodComponentSave.expiryPeriod = data.expiryPeriod;
    bloodComponentSave.quantity = data.quantity;
    bloodComponentSave.description = data.description;
    bloodComponentSave.serviceName = data.serviceName;
    bloodComponentSave.crossMatchService = data.crossMatchService;

    bloodComponentSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


/****************Service Master APIs****************/

moudle.exports.serviceMaster = function (data, res) {

    var serviceSave = new documentObject12.abc();

    serviceSave.ServiceCode = data.ServiceCode;
    serviceSave.ServiceName = data.ServiceName;
    serviceSave.Specialization = data.Specialization;
    serviceSave.Sub_Specialization = data.Sub_Specialization;
    serviceSave.Outsource = data.Outsource;
    serviceSave.Base_package = data.Base_package;
    serviceSave.Health_plan = data.Health_plan;
    serviceSave.Is_package = data.Is_package;
    serviceSave.OT_Procedure = data.OT_Procedure;
    serviceSave.Is_Order_set = data.Is_Order_set;
    serviceSave.Rate_editable = data.Rate_editable;
    serviceSave.Minimum_amount = data.Minimum_amount
    serviceSave.Maximum_amount = data.Maximum_amount;
    serviceSave.Docor_share = data.Docor_share;
    serviceSave.Share_available_to_all_doctors = data.Share_available_to_all_doctors;
    serviceSave.Allow_multiple_quantity = data.Allow_multiple_quantity;
    serviceSave.Authorization_required = data.Authorization_required;
    serviceSave.Is_GST_Applicable = data.Is_GST_Applicable;
    serviceSave.Is_Specialization_service = data.Is_Specialization_service;
    serviceSave.status = data.status;

    serviceSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.service_classMaster = function (data, res) {

    var classSave = new documentObject12.abc();

    classSave.id = data.id;
    classSave.code = data.code;
    classSave.description = data.description;
    classSave.state = data.state;
    classSave.status = data.status;

    classSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.service_tariffMaster = function (data, res) {

    var classSave = new documentObject12.abc();

    classSave.id = data.id;
    classSave.code = data.code;
    classSave.description = data.description;
    classSave.state = data.state;
    classSave.status = data.status;

    classSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.service_tariffSMaster = function (data, res) {

    var classSave = new documentObject12.abc();

    classSave.id = data.id;
    classSave.serviceId = data.serviceId;
    classSave.tariffId = data.tariffId;
    classSave.serviceCode = data.serviceCode;
    classSave.serviceName = data.serviceName;
    classSave.specialization = data.specialization;
    classSave.subSpecialization = data.subSpecialization;
    classSave.outSource = data.outSource;
    classSave.basePackage = data.basePackage;
    classSave.healthPlan = classSave.healthPlan;
    classSave.isPackage = classSave.isPackage;
    classSave.otProcedure = data.otProcedure;
    classSave.orderSet = data, orderSet;
    classSave.doctorShare = data.doctorShare;
    classSave.shareAvailableToDoctors = data.shareAvailableToDoctors;
    classSave.rateEditable = data.rateEditable;
    classSave.minAmount = data.minAmount;
    classSave.maxAmount = data.maxAmount;
    classSave.allowMultipleQuantity = data.allowMultipleQuantity;
    classSave.authorizationRequired = data.authorizationRequired;
    classSave.isGSTApplicable = data.isGSTApplicable;
    classSave.isSpecialization = data.isSpecialization;
    classSave.state = data.state;

    classSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.service_classRateMaster = function (data, res) {

    var classSave = new documentObject12.abc();

    classSave.id = data.id;
    classSave.tariffServiceId = data.tariffServiceId;
    classSave.classId = data.classId;
    classSave.rate = data.rate;
    classSave.state = data.state;

    classSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

/****************Lab Test APIs****************/


moudle.exports.labTest_Master = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;
    labTestSave.printReportName = data.printReportName;
    labTestSave.category = data.category;
    labTestSave.serviceName = data.serviceName;
    labTestSave.chineseReportName = data.chineseReportName;
    labTestSave.reportTemplate = data.reportTemplate;
    labTestSave.resultOnlyOrderingDoctor = data.resultOnlyOrderingDoctor;
    labTestSave.suggestion = data.suggestion;
    labTestSave.footNote = data.footNote;
    labTestSave.turnAroundTime = data.turnAroundTime;
    labTestSave.machineName = data.machineName;
    labTestSave.techniqueUsed = data.techniqueUsed;
    labTestSave.container = data.container;
    labTestSave.levels = data.levels;
    labTestSave.isCultureSenstivityTest = data.isCultureSenstivityTest
    labTestSave.autoLevel = data.autoLevel;
    labTestSave.parameterType = data.parameterType;
    labTestSave.parameter = data.parameter;
    labTestSave.parameterSubTest = data.parameterSubTest;
    labTestSave.printValueType = data.printValueType;
    labTestSave.printName = data.printName;
    labTestSave.sample = data.sample;
    labTestSave.quantity = data.quantity;
    labTestSave.frequency = data.frequency;
    labTestSave.itemDescription = data.itemDescription;
    labTestSave.itemQuantity = data.itemQuantity;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


moudle.exports.labTest_POCtest = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.testId = data.testId;
    labTestSave.testCode = data.testCode;
    labTestSave.testCategory = data.testCategory;
    labTestSave.testName = data.testName;
    labTestSave.serviceName = data.serviceName;
    labTestSave.serviceId = data.serviceId;
    labTestSave.parameter = data.parameter;
    labTestSave.parameterReferenceRange = data.parameterReferenceRange;
    labTestSave.suggestions = data.suggestions;
    labTestSave.footNote = data.footNote;
    labTestSave.container = data.container;
    labTestSave.sampleDetails = data.sampleDetails;
    labTestSave.isCultureSenstivityTest = data.isCultureSenstivityTest;
    labTestSave.isSensitive = data.isSensitive;
    labTestSave.isPOC = data.isPOC;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_parameter = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;
    labTestSave.printName = data.printName;
    labTestSave.parameterUnitName = data.parameterUnitName;
    labTestSave.typeOfValue = data.typeOfValue;
    labTestSave.isForPlate = data.isForPlate;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_parameterUnit = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_parameterResult = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.parameterCode = data.parameterCode;
    labTestSave.parameterName = data.parameterName;
    labTestSave.resultTypeValue = data.resultTypeValue;
    labTestSave.helpValues = data.helpValues;
    labTestSave.isDefault = data.isDefault;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_parameterRange = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.parameterCode = data.parameterCode;
    labTestSave.parameterName = data.parameterName;
    labTestSave.resultTypeValue = data.resultTypeValue;
    labTestSave.category = data.category;
    labTestSave.ageLowerLimit = data.ageLowerLimit;
    labTestSave.ageUpperLimit = data.ageUpperLimit;
    labTestSave.minimumRange = data.minimumRange;
    labTestSave.maximumRange = data.maximumRange;
    labTestSave.defaultValue = data.defaultValue;
    labTestSave.upperTolerance = data.upperTolerance;
    labTestSave.lowerTolerance = data.lowerTolerance;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_parameterRange = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.parameterCode = data.parameterCode;
    labTestSave.parameterName = data.parameterName;
    labTestSave.resultTypeValue = data.resultTypeValue;
    labTestSave.category = data.category;
    labTestSave.ageLowerLimit = data.ageLowerLimit;
    labTestSave.ageUpperLimit = data.ageUpperLimit;
    labTestSave.minimumRange = data.minimumRange;
    labTestSave.maximumRange = data.maximumRange;
    labTestSave.defaultValue = data.defaultValue;
    labTestSave.upperTolerance = data.upperTolerance;
    labTestSave.lowerTolerance = data.lowerTolerance;

    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_labPathologyCategory = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_labPathologySample = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_labPathologyContainer = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_labPathologySpecimen = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.labTest_labPathologyCollectionType = function (data, res) {

    var labTestSave = new documentObject12.abc();

    labTestSave.code = data.code;
    labTestSave.description = data.description;


    labTestSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

/****************BED MASTER Master APIs****************/


moudle.exports.bed_details = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.ward = data.ward;
    bedMaster.room = data.room;
    bedMaster.bedClass = data.bedClass;
    bedMaster.unit = data.unit;
    bedMaster.isNonCensus = data.isNonCensus;
    bedMaster.bedAmenities = data.bedAmenities;



    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


moudle.exports.bed_room = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.roomAmenities = data.roomAmenities;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


moudle.exports.bed_ward = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.floor = data.floor;
    bedMaster.gender = data.gender;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


moudle.exports.bed_class = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.depositForIPD = data.depositForIPD;
    bedMaster.deposit = data.deposit;
    bedMaster.serviceName = data.serviceName;
    bedMaster.orderNo = bedMaster.orderNo;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.bed_floor = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.state = data.state;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


moudle.exports.bed_amenities = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.state = data.state;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};

moudle.exports.bed_roomAmenities = function (data, res) {

    var bedMaster = new documentObject12.abc();

    bedMaster.code = data.code;
    bedMaster.description = data.description;
    bedMaster.state = data.state;

    bedMaster.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};


/****************Drug Master APIs****************/

moudle.exports.drugInfo = function (data, res) {

    var drugSave = new documentObject12.abc();

    drugSave.itemId = data.itemId;
    drugSave.itemCode = data.itemCode;
    drugSave.inventoryCode = data.inventoryCode;
    drugSave.brandName = data.brandName;
    drugSave.itemName = data.itemName;
    drugSave.genericName = data.genericName;
    drugSave.strengthValue = data.strengthValue;
    drugSave.strengthUnit = data.strengthUnit;
    drugSave.itemGroup = data.itemGroup;
    drugSave.itemCategory = data.itemCategory;
    drugSave.dispensingType = data.dispensingType;
    drugSave.storageType = data.storageType;
    drugSave.pregnancyClass = data.pregnancyClass;
    drugSave.theraputicClass = data.theraputicClass;
    drugSave.manufacturedBy = data.manufacturedBy;
    drugSave.marketedBy = data.marketedBy;
    drugSave.purchaseUOM = data.purchaseUOM;
    drugSave.stockingUOM = data.stockingUOM;
    drugSave.conversionFactor = data.conversionFactor;
    drugSave.route = data.route;
    drugSave.costPrice = data.costPrice;
    drugSave.salePrice = data.salePrice;
    drugSave.GST = data.GST;
    drugSave.guideCost = data.guideCost;
    drugSave.GSTApplicableOn = data.GSTApplicableOn;
    drugSave.batchesRequired = data.batchesRequired;
    drugSave.lifeSaving = data.lifeSaving;
    drugSave.highRisk = data.highRisk;
    drugSave.highCost = data.highCost;
    drugSave.inclusiveOfAllTaxesExceptGST = data.inclusiveOfAllTaxesExceptGST
    drugSave.discountOnSale = data.discountOnSale;
    drugSave.drugInfo = data.drugInfo;
    drugSave.mapId = data.mapId;
    drugSave.chargeCode = data.chargeCode;
    drugSave.vedType = data.vedType;
    drugSave.abcType = data.abcType;
    drugSave.note = data.note;
    drugSave.dangerous = data.dangerous;
    drugSave.psychotropic = data.psychotropic;
    drugSave.isConsumable = data.isConsumable;
    drugSave.frequency = data.frequency;
    drugSave.usage = data.usage;
    drugSave.GSTtaxCode = data.GSTtaxCode;
    drugSave.isKit = data.isKit;
    drugSave.discontinue = data.discontinue;
    drugSave.remarks = data.remarks;
    drugSave.warning = data.warning;
    drugSave.markUp = data.markUp;
    drugSave.onCostPrice = data.onCostPrice;
    drugSave.onLandedRate = data.onLandedRate
    drugSave.state = data.state;

    drugSave.save(function (err) {
        if (err) {
            var response = {
                "_error_message": "Error while processing request please check input",
                "_status_Code": 406,
                "_status": "error",
                "result": "none"
            }
        }
        else {
            var response = {
                "_error_message": "None",
                "_status_Code": 200,
                "_status": "Done",
                "result": "Master Data added succefully."
            };
            res.send(response);
        }

    }

    )
};