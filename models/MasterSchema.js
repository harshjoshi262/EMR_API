var mongoose = require('mongoose');
var MONGODB_CONFIG = require('config').get('mongodb');

var uuid = require('node-uuid');

var dbMasterConnectionUrl = MONGODB_CONFIG.dbUser + ':' + MONGODB_CONFIG.dbPassword + '@' + MONGODB_CONFIG.dbHost + ':' + MONGODB_CONFIG.dbPort + '/Clinicare_Masters';
var masterConnection = mongoose.createConnection(dbMasterConnectionUrl);



var servicesMaster = masterConnection.model('M_Service', new mongoose.Schema({
    ServiceCode: String,
    ServiceName: String,
    Specialization: String,
    Sub_Specialization: String,
    Outsource: Boolean,
    Base_package: Boolean,
    Health_plan: Boolean,
    Is_package: Boolean,
    OT_Procedure: Boolean,
    Is_Order_set: Boolean,
    Rate_editable: Boolean,
    Minimum_amount: String,
    Maximum_amount: String,
    Docor_share: Boolean,
    Share_available_to_all_doctors: Boolean,
    Allow_multiple_quantity: Boolean,
    Authorization_required: Boolean,
    Is_GST_Applicable: Boolean,
    Is_Specialization_service: Boolean,
    state: String
}));

var classMaster = masterConnection.model('M_Class', new mongoose.Schema({
    id: String,
    code: String,
    description: String,
    state: String,
    status: String

}))

var traiffMaster = masterConnection.model('M_Tariff', new mongoose.Schema({
    id: String,
    code: String,
    description: String,
    effectiveDate: String,
    expiryDate: Number,
    status: String,
    state: String

}))

var tariffServiceMaster = masterConnection.model('M_TariffService', new mongoose.Schema({
    id: String,
    serviceId: String,
    tariffId: String,
    serviceCode: String,
    serviceName: String,
    specialization: String,
    subSpecialization: String,
    outSource: Boolean,
    basePackage: Boolean,
    healthPlan: Boolean,
    isPackage: Boolean,
    otProcedure: Boolean,
    orderSet: Boolean,
    doctorShare: Boolean,
    shareAvailableToDoctors: Boolean,
    rateEditable: Boolean,
    minAmount: String,
    maxAmount: String,
    allowMultipleQuantity: Boolean,
    authorizationRequired: Boolean,
    isGSTApplicable: Boolean,
    isSpecialization: Boolean,
    state: String

}));

var classRateMaster = masterConnection.model('M_ClassRate', new mongoose.Schema({

    id: String,
    tariffServiceId: String,
    classId: String,
    rate: Number,
    state: String

}));


var radiologyTestMater = masterConnection.model('M_RadiologyTest', new mongoose.Schema({
    HIS_ID: String,
    Test_Code: String,
    Test_Category: String,
    Test_Category_ID: String,
    Service_ID: String,
    Modifier: String,
    Modality: String,
    Test_Name: String,
    Service_Name: String,
    Print_Test_Name: String,
    Turaround_Time: String,
    state: String
}));

var radiologyTestCategoryMaster = masterConnection.model('M_RadiologyTestCategory', new mongoose.Schema({

    code: String,
    description: String,
    state: String

}));

var radiologyModifierMaster = masterConnection.model('M_RadiologyModifier', new mongoose.Schema({

    code: String,
    description: String,
    state: String

}));

var radiologyModalityMaster = masterConnection.model('M_RadiologyModality', new mongoose.Schema({
    code: String,
    description: String,
    state: String

}))

var transportMaster = masterConnection.model('M_RadiologyTransport', new mongoose.Schema({

    code: String,
    description: Stirng,
    state: String

}))

var submitMaster = masterConnection.model('M_RadiologySubmit', new mongoose.Schema({
    code: String,
    description: String,
    state: String,

}))

var unitMaster = masterConnection.model('M_Unit', new mongoose.Schema({
    code: String,
    description: String,
    contactNumber: String,
    clinicEmail: String,
    clinicFaxNumber: String,
    pharmacyLicenseNumber: String,
    addressLine1: String,
    postCode: String,
    clinicRegistrationNumber: String,
    shopAndEstablishmentNumber: String,
    tradeNumber: String,
    server: String,
    database: String,
    department: String


}))

var unitDoctorGroup = masterConnection.model('M_DoctorGroup', new mongoose.Schema({
    code: String,
    description: String,
    state: state
}))


var unitSubGroupMaster = masterConnection.model('M_SubGroup', new mongoose.Schema({
    code: String,
    description: String,
    state: String
}))


var unitDoctorType = masterConnection.model('M_DoctorType', new mongoose.Schema({
    code: String,
    description: String,
    state: String

}))


var unitDepartmentMaster = masterConnection.model('M_UnitDepartment', new mongoose.Schema({
    code: String,
    description: String,
    state: String
}))


var unitClassificationMaster = masterConnection.model('M_UnitClassification', new mongoose.Schema({
    code: String,
    description: String,
    state: String
}))


var unitVisitTypeMaster = masterConnection.model('M_UnitVisitType', new mognoose.Schema({
    code: String,
    description: String,
    state: String
}))


var unitCabinMaster = masterConnection.model('M_UnitCabin', new mongoose.Schema({
    code: String,
    description: String,
    state: String

}))



/***********************/


var bloodComponentMaster = masterConnection.model('M_BloodComponent', new mongoose.Schema({
    id: String,
    code: String,
    shortDescription: String,
    description: String,
    expiryPeriod: String,
    quantity: Number,
    serviceName: String,
    crossMatchService: String,
}));


var labTestMaster = masterConnection.model('M_LabTest', new mongoose.Schema({
    code: String,
    description: String,
    printReportName: String,
    category: String,
    serviceName: String,
    chineseReportName: String,
    reportTemplate: Boolean,
    resultOnlyOrderingDoctor: Boolean,
    suggestion: String,
    footNote: String,
    turnAroundTime: Number,
    machineName: String,
    techniqueUsed: String,
    container: String,
    levels: [String],
    isCultureSenstivityTest: Boolean,
    autoLevel: Boolean,
    parameterType: String,
    parameter: String,
    parameterSubTest: String,
    printValueType: String,
    printName: String,
    sample: String,
    quantity: String,
    frequency: String,
    itemDescription: String,
    itemQuantity: String
}))


var labPOCTest = masterConnection.model('M_LabPOC', new mongoose.Schema({
    testId: String,
    testCode: String,
    testCategory: String,
    testName: String,
    serviceName: String,
    serviceId: String,
    parameter: String,
    parameterReferenceRange: String,
    suggestions: String,
    footNote: String,
    container: String,
    sampleDetails: String,
    isCultureSenstivityTest: Boolean,
    isSensitive: Boolean,
    isPOC: Boolean
}))

var labParameter = masterConnection.model('M_LabParameter', new mongoose.Schema({

    code: String,
    description: String,
    printName: String,
    parameterUnitName: String,
    typeOfValue: String,
    isForPlate: Boolean

}))

var labParameterUnit = masterConnection.model('M_LabParameterUnit', new mongoose.Schema({

    code: String,
    description: String

}))

var labParameterResult = masterConnection.model('M_LabParameterResult', new mongoose.Schema({
    parameterCode: String,
    parameterName: String,
    resultTypeValue: String,
    helpValues: String,
    isDefault: Boolean

}))

var labParameterRange = masterConnection.model('M_LabParameterRange', new mongoose.Schema({
    parameterCode: String,
    parameterName: String,
    resultTypeValue: String,
    category: String,
    ageLowerLimit: Number,
    ageUpperLimit: Number,
    minimumRange: Number,
    maximumRange: Number,
    defaultValue: Number,
    upperTolerance: Number,
    lowerTolerance: Number

}))

var labPathologyCategory = masterConnection.model('M_LabPathologyCategory', new mongoose.Schema({
    code: String,
    description: String

}))

var labPathologySample = masterConnection.model('M_LabPathologySample', new mongoose.Schema({
    code: String,
    description: String

}))



var labPathologyContainer = masterConnection.model('M_LabPathologyContainer', new mongoose.Schema({
    code: String,
    description: String

}))

var labPathologySpecimen = masterConnection.model('M_LabPathologySpecimen', new mongoose.Schema({
    code: String,
    description: String

}))

var labPathologyCollectionType = masterConnection.model('M_LabPathologyCollectionType', new mongoose.Schema({
    code: String,
    description: String

}))

var bedMasterDetails = masterConnection.model('M_BedMasterDetails', new mongoose.Schema({
    code: String,
    description: String,
    ward: String,
    room: String,
    bedClass: String,
    unit: String,
    isNonCensus: Boolean,
    bedAmenities: [String]
}))

var bedMasterRoom = masterConnection.model('M_BedMasterRoom', new mongoose.Schema({
    code: String,
    description: String,
    roomAmenities: [String],

}))


var bedWardMasterRoom = masterConnection.model('M_BedWard', new mongoose.Schema({
    code: String,
    description: String,
    floor: String,
    gender: String
}))


var bedClassMaster = masterConnection.model('M_BedClass', new mongoose.Schema({
    code: String,
    decription: String,
    depositForIPD: String,
    deposit: String,                     ////////????????????????????
    serviceName: String,
    orderNo: String
}))


var bedFloorMaster = masterConnection.model('M_BedFloor', new mongoose.Schema({
    code: String,
    description: String,
    state: String
}));

var bedAmenities = masterConnection.model('M_BedAmenities', new mongoose.Schema({
    code: String,
    description: String,
    state: String

}));

var roomAmenities = masterConnection.model('M_BedRoomAmenities', new mongoose.Schema({
    code: String,
    description: String,
    state: String
}))



/*************** DRUG MASTERS **************/

var drugMaster = masterConnection.model('M_DrugMaster', new mongoose.Schema({
    itemId: String,
    itemCode: String,
    inventoryCode: String,
    brandName: String,
    itemName: String,
    genericName: String,
    strengthValue: Number,
    strengthUnit: String,
    itemGroup: String,
    itemCategory: String,
    dispensingType: String,
    storageType: String,
    pregnancyClass: String,
    theraputicClass: String,
    manufacturedBy: String,
    marketedBy: String,
    purchaseUOM: String,
    stockingUOM: String,
    conversionFactor: String,
    route: String,
    costPrice: Number,
    salePrice: Number,
    GST: Number,
    guideCost: Number,
    GSTApplicableOn: String,
    batchesRequired: Boolean,
    lifeSaving: String,
    highRisk: String,
    highCost: String,
    inclusiveOfAllTaxesExceptGST: String,
    discountOnSale: Number,
    drugInfo: String,
    mapId: String,
    chargeCode: String,
    vedType: String,
    abcType: String,
    note: String,
    dangerous: String,
    psychotropic: String,
    isConsumable: String,
    frequency: String,
    usage: String,
    GSTtaxCode: String,
    isKit: Boolean,
    discontinue: String,
    remarks: String,
    warning: String,
    markUp: Number,
    onCostPrice: Number,
    onLandedRate: Number,
    state: String
}))