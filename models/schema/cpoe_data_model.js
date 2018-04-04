var mongoose = require('mongoose');
var uuid = require('node-uuid');
var Schema = mongoose.Schema;
module.exports = function () {
    var labOrderItemSchema = Schema({
        orderType: { type: String, required: false },
        _id: { type: String, required: true, deafult: uuid.v4() },
        cpoeOrderId: { type: String, required: false },
        ID: { type: String, required: false },
        labTest: { type: String, required: true },
        doctorId: { type: String, required: false },
        doctorName: { type: String, required: false },
        ServiceId: { type: Number, required: true },
        qualifier: { type: String, required: false },
        collectSample: { type: String, required: false },
        collectionDate: { type: Number, required: false },
        collectionType: { type: String, required: true },
        specimen: { type: String, required: false },
        urgency: { type: String, required: true },
        howOften: { type: String, required: true },
        description: { type: String, required: false, deafult: null },
        instruction: { type: String, required: false, deafult: null }
    }, { _id: true, versionKey: false });

    var bloodComponentItemSchema = Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        ID: { type: String, required: false },
        bloodComponents: { type: String, required: true },
        noOfBloodBags: { type: String, required: false },
        requisitionDate: { type: Number, required: true },
        requiredForSergery: { type: Boolean, required: true },
        areDonorsAvialable: { type: Boolean, required: true },
        causeOfAbnormality: { type: String, required: false },
        surgical: { type: String, required: false },
        urgency: { type: String, required: true },
        comment: { type: String, required: false },
        instruction: { type: String, required: false }
    }, { versionKey: false });
    var imagingOrderItemSchema = Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        code: { type: String, required: false },
        imagingTypeCategoryId: { type: String, required: false },
        OrderNo: { type: String },
        HIS_ID: { type: Number, required: false },
        ServiceId: { type: Number, required: true },
        lmpDate: { type: Number, deafult: 0 },
        menopause: { type: Boolean, deafult: false },
        imagingType: { type: String, required: true },
        imagingProcedure: { type: String, required: true },
        ModalityCode: { type: String, required: false },
        modifier: { type: String, required: false },
        category: { type: String, required: true },
        transport: { type: String, required: true },
        requestedDate: { type: Number, required: false },
        urgency: { type: String, required: true },
        historyAndReason: { type: String, required: false },
        instruction: { type: String, required: false },
        creatinineClearance: { type: Number, required: false, default: null },
        preOpScheduled: { type: Boolean, required: true },
        requiredIsolation: { type: Boolean, required: true },
        pregnancy: { type: Boolean, required: false },
        CheckList: [],
        comments: String
    }, { versionKey: false });
    var procedureOrderItemSchema = Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        ID: { type: String, required: false },
        group: { type: String, required: false },
        procedureName: { type: String, required: true },
        associatedProblems: { type: String, required: false },
        attentionDoctorId: { type: String, required: false },// attention to
        attentionDoctorName: { type: String, required: false },
        placeOfConsultation: { type: String, required: false },
        patientSeenAs: { type: String, required: false },
        urgency: { type: String, required: true },
        reasonForRequest: { type: String, required: false },
        provisionalDiagnosis: { type: String, required: false },
        instruction: { type: String, required: false },
        clinicalIndicateDate: { type: Number, required: false }
    }, { versionKey: false });
    var generalOrderItemSchema = Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        order: { type: String, required: true },
        startDate: { type: Number, required: true },
        stopDate: { type: Number, required: false },
        urgency: { type: String, required: true },
        comment: { type: String, required: false },
        instruction: { type: String, required: false }
    }, { versionKey: false });
    var consultOrderItemSchema = Schema({
        _id: { type: String, required: true },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        department: { type: String, required: false },
        icdCode: { type: String, required: false },
        requestedDate: { type: Number, required: true },
        attendingDoctorId: { type: String, required: true },
        attentionDoctorName: { type: String, required: true },
        urgency: { type: String, required: true },
        patientSeenAs: { type: String, required: false },
        placeOfConsultation: { type: String, required: false },
        reasonForRequest: { type: String, required: false },
        instruction: { type: String, required: false },
        consult_services: {
            _id: { type: String, required: true },
            service_name: { type: String, required: true }
        },
        consult_completion: { type: Boolean, default: false }
    }, { versionKey: false });
    var vitalOrderItemSchema = Schema({
        _id: { type: String, required: true },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        vitalSign: { type: String, required: true },
        startDate: { type: Number, required: true },
        stopDate: { type: Number, required: false },
        schedule: { type: String, required: true },
        instruction: { type: String, required: false }
    }, { versionKey: false });
    var nursingOrderItemSchema = Schema({
        _id: { type: String, required: true },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        order: { type: String, required: true },
        startDate: { type: Number, required: true },
        stopDate: { type: Number, required: false },
        comment: { type: String, required: false },
        urgency: { type: String, required: true },
        instruction: { type: String, required: false }
    }, { versionKey: false });
    var patientMovementOrderItemSchema = Schema({
        _id: { type: String, required: true },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        category: { type: String, required: false },
        wardName: { type: String, required: false },
        dischargeType: Object,
        ID: { type: Number, required: false },
        department: { type: String, required: false },
        attendingDoctorId: { type: String, required: false },
        attentionDoctorName: { type: String, required: false },
        atdDate: { type: Number, required: true },
        problemDiagnosis: { type: String, required: false },
        icdCode: { type: String, required: false },
        comment: { type: String, required: false },
        instruction: { type: String, required: false },
        otScheduled: { type: Boolean, required: false }
    });

    var complexDrugListItem = Schema({
        drugGenericName: { type: String, default: '' },
        ItemCode: { type: String, required: false },
        Drug_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        drugName: { type: String, required: false },
        Molecule_HIS_ID: { type: String, required: true },
        dosage: { type: String, required: false },
        dosage_unit: { type: String, required: false },
        route: { type: String, required: true },
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        dailyQuantity: { type: String, required: false },
        Route_HIS_ID: { type: String, required: true },
        schedule: { type: String, required: true },//Frequency Name
        Frequency_HIS_ID: { type: String, required: true },
        // day_frequency: { type: String, required: true },
        duration: { type: String, required: false },
        durationValue: { type: String, required: false },
        adminTimes: { type: String, required: false },
        thenAnd: { type: String, default: "Then" },
        startDate: { type: Number, required: false },
        endDate: { type: Number, required: false },
        quantity: { type: String, required: false, default: "0" },
        day_frequency: { type: String, required: false },
        additionalDose: { type: Boolean, required: false },
        singleDose: { type: String, required: false, default: null },
        Dosage: { type: String, default: null },
        index: { type: Number, default: 1 }
    }, { _id: false });


    var opPharmacyItem = Schema({
        ItemCode: { type: String, required: pharmacyValidator },
        Drug_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        drugName: { type: String, required: true },
        drugGenericName: { type: String, required: false },
        Molecule_HIS_ID: { type: String, required: pharmacyValidator },//Generic Name HIS ID
        dosage: { type: String, required: false },
        dosage_unit: { type: String, required: false },
        schedule: { type: String, required: pharmacyValidator },//Frequency Name
        Frequency_HIS_ID: { type: String, required: pharmacyValidator },
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        route: { type: String, required: pharmacyValidator },
        Route_HIS_ID: { type: String, required: pharmacyValidator },
        startDate: { type: Number, required: false },
        endDate: { type: Number, required: false },
        daysSupply: { type: String, required: false },
        quantity: { type: String, required: false, default: "0" },
        refils: { type: String, required: false },
        duration: { type: String, required: false },
        durationValue: { type: String, required: false },
        additionalDose: { type: Boolean, required: false },
        singleDose: { type: String, required: false, default: null },
        isConsumableOp: { type: Boolean, default: true },
    }, { versionKey: false });
    var nonHospitalPharmacyItem = Schema({
        ItemCode: { type: String, required: pharmacyValidator },
        Drug_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        drugName: { type: String, required: true },
        drugGenericName: { type: String, required: false },
        Molecule_HIS_ID: { type: String, required: false },//Generic Name HIS ID
        dosage: { type: String, required: false },
        schedule: { type: String, required: true },//Frequency Name
        Frequency_HIS_ID: { type: String, required: false },
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        route: { type: String, required: true },
        Route_HIS_ID: { type: String, required: false },
        startDate: { type: Number, required: false },
        endDate: { type: Number, required: false },
        daysSupply: { type: String, required: false },
        quantity: { type: String, required: false, default: "0" },
        refils: { type: String, required: false },
        duration: { type: String, required: false },
        durationValue: { type: String, required: false },
        additionalDose: { type: Boolean, required: false },
        singleDose: { type: String, required: false, default: null }
    }, { versionKey: false });
    var ipPharmacyItem = Schema({
        ItemCode: { type: String, required: pharmacyValidator },
        Drug_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        drugName: { type: String, required: true },
        drugGenericName: { type: String, required: false },
        isConsumableIp: { type: Boolean, default: false },
        Molecule_HIS_ID: { type: String, required: pharmacyValidator },//Generic Name HIS ID
        dosage: { type: String, required: pharmacyValidator },
        dosage_unit: { type: String, required: false },
        schedule: { type: String, required: pharmacyValidator },//Frequency Name
        Frequency_HIS_ID: { type: String, required: pharmacyValidator },
        route: { type: String, required: pharmacyValidator },
        Route_HIS_ID: { type: String, required: pharmacyValidator },
        startDate: { type: Number, required: false },
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        endDate: { type: Number, required: false },
        daysOfSupply: { type: String, required: false },
        duration: { type: String, required: false },
        dailyQuantity: { type: String, required: false },
        durationValue: { type: String, required: false },
        quantity: { type: String, required: false, default: "0" },
        additionalDose: { type: Boolean, required: false },
        singleDose: { type: String, required: false, default: null }
    }, { versionKey: false });

    var opPharmacyItemSchema = Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        type: { type: String, required: true },
        opPharmacyItems: [],
        complexPharmacyItems: [],
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        isConsumableOp: { type: Boolean, default: false },
        drugId: { type: String, required: false },
        priority: { type: String, required: false },
        priority_Id: { type: String, required: false },
        comment: { type: String, required: false },
        prn: { type: Boolean, required: false },
        pediatricDose: { type: Boolean, required: false },
        instruction: { type: String, required: false },
        ItemCode: { type: String, required: false },
        bc: { type: String, required: false },
    }, { versionKey: false });

    var ipPharmacyItemSchema = Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        type: { type: String, required: true },
        ipPharmacyItems: [],
        complexPharmacyItems: [],
        pickup: { type: String, required: false },
        pickup_Id: { type: String, required: false },
        isConsumableIp: { type: Boolean, default: false },
        drugId: { type: String, required: true },
        dischargeMedication: { type: Boolean },
        isDischargeMedication: { type: Boolean, default: false, required: true },
        priority: { type: String, required: false },
        priority_Id: { type: String, required: false },
        comment: { type: String, required: false },
        prn: { type: Boolean, required: false },
        pediatricDose: { type: Boolean, required: true },
        instruction: { type: String, required: false },
        bc: { type: String, required: false },
        ItemCode: { type: String, required: false },
    }, { versionKey: false });
    var medicalSuppliesItemSchema = Schema({
        _id: { type: String, deafult: uuid.v4() },
        cpoeOrderId: { type: String, required: false },
        item: { type: Object, required: true },
        department: { type: Object, required: true },
        quantity: { type: Number },
        comment: String,
        pickup: String,
        pickup_Id: String,
        refils: String
    })
    var ivPharmacyItemSchema = Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        drugType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        ItemCode: { type: String, required: true },
        drugName: { type: String, required: true },
        DRUG_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        drugGenricName: { type: String, required: false },
        index: { type: Number },
        Molecule_HIS_ID: { type: String, default: null },//Generic Name HIS ID
        volumeStrength: { type: String, required: true },
        route: { type: String, required: true },
        Route_HIS_ID: { type: String, required: true },
        schedule: { type: String, deafult: null },
        Frequency_HIS_ID: { type: String, required: false },
        infusionRate: { type: String, default: "" },
        priority: { type: String, required: false },
        priority_Id: { type: String, required: false },
        duration: { type: String, deafult: "" },
        totalVolume: { type: String, required: false },
        startDate: { type: Number, required: false },
        endDate: { type: Number, required: false },
        tpn: { type: Boolean, required: true },
        historyAndReason: { type: String, required: false },
        instruction: { type: String, required: false },
        bc: { type: String, required: false },
        comment: { type: String },
        pickup: { type: String, default: "Ward" },
        pickup_Id: { type: String, default: 3 }
    }, { versionKey: false });
    var tempIvPharmacyItemSchema = Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        cpoeOrderId: { type: String, required: false },
        SOLItemCode: { type: String, required: false },
        solution: { type: String, required: true },
        SOL_HIS_ID: { type: String, required: false },
        drugId: { type: String, required: false },
        solutionGenricName: { type: String, required: false },
        SOL_Molecule_HIS_ID: { type: String, default: null },//Generic Name HIS ID
        solVolumeStrength: { type: String, required: true },
        solutionRoute: { type: String, required: true },
        SOL_Route_HIS_ID: { type: String, required: true },
        Additive_HIS_ID: { type: String, required: false },
        AdditiveItemCode: { type: String, required: false },
        additiveName: { type: String, required: false },
        additiveGenericName: { type: String, required: false },
        Additive_Molecule_HIS_ID: { type: String, required: false },//Generic Name HIS ID
        additiveVolumeStrength: { type: String, required: false },
        additiveRoute: { type: String, default: null },
        Additive_Route_HIS_ID: { type: String, required: false },
        schedule: { type: String, deafult: null },
        Frequency_HIS_ID: { type: String, required: false },
        infusionRate: { type: String, default: "" },
        priority: { type: String, required: false },
        priority_Id: { type: String, required: false },
        duration: { type: String, deafult: "" },
        totalVolume: { type: String, required: false },
        startDate: { type: Number, required: false },
        endDate: { type: Number, required: false },
        tpn: { type: Boolean, required: true },
        historyAndReason: { type: String, required: false },
        instruction: { type: String, required: false },
        bc: { type: String, required: false },
        ItemCode: { type: String, required: false },
        comment: { type: String },
        pickup: { type: String, default: "Ward" },
        pickup_Id: { type: String, default: 3 }
    }, { versionKey: false });
    var rehabItemSchema = mongoose.Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        consult_to_service: {
            _id: { type: String, required: true },
            name: { type: String, required: true }
        },
        reason_for_request: {
            _id: { type: String, required: true },
            name: { type: String, required: true }
        },
        sub_1: {
            _id: { type: String },
            name: { type: String }
        },
        sub_2: [{
            _id: { type: String },
            name: { type: String }
        }],
        text_values: [{
            name: { type: String, required: true },
            value: { type: String },
            label: { type: String },
        }],
        urgency: { type: String, required: true },
        date_of_procedure: { type: Number, required: true },
        provisional_diagnosis: { type: String },
        special_instruction: { type: String }
    });

    var dietItemSchema = mongoose.Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        orderType: { type: String, required: false },
        data: { type: mongoose.Schema.Types.Mixed, required: true },
        diet_category: { type: String, required: true },
        status: { type: String, required: true, default: "active" }
    });
    var cpoeOrderSchema = mongoose.Schema({
        _id: { type: String, default: uuid.v4(), required: true },
        doctorId: { type: String, required: false },
        patientId: { type: String, required: true },
        userId: { type: String, required: true },
        patientName: { type: String, default: "null" },
        mrn: Number,
        Identifier: Object,
        RMQID: { type: String, default: " " },
        visitId: String,
        visitType: { type: String, default: "null" },
        visit_admissionNo: { type: String, default: "null" },
        primaryDoctor: { type: String, default: "null" },
        orderingDoctorName: { type: String, default: "null" },
        clinicalDepartment: { type: String, default: "null" },
        clinicName: { type: String, default: "null" },
        serviceCode: { type: String, default: "null" },
        serviceName: { type: String, default: "null" },
        encounterType: { type: String, default: "null" },
        orderName: { type: String, required: true },
        orderCategory: { type: String, default: "null", required: true },
        orderSubCategory: { type: String, default: "null" },
        orderItems: { type: mongoose.Schema.Types.Mixed, required: true },
        isFavorite: { type: Boolean, default: false, required: true },
        orderStatus: { type: String, default: "null", required: true },
        canCancel: { type: Boolean, default: true, required: false },
        canRepeat: { type: Boolean, default: true, required: false },
        canDiscontinue: { type: Boolean, default: true, required: false },
        canEdit: { type: Boolean, default: true },
        isUpdated: { type: Boolean, default: false },
        isScheduledDiscontinue: { type: Boolean, deafult: false },
        discontinueTime: { type: Number, default: 0 },
        activityLog: [],
        discount: { type: Number, deafult: 0 },
        orderDate: { type: Number, required: true },
        orderGroup: { type: String, default: this.patientId + ":" + new Date().getTime() },
        location: String,
        signedBy: Object,
        onBehalf: Object,
        isAcknowledged: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: true, required: true },
        duplicateChecked: { type: Boolean, default: false },
        duplicateOrders: [],
        reasonToSkipDuplicate: { type: String, default: '' }
    }, { versionKey: false, usePushEach: true });
    var orderListItemSchema = Schema({
        orderCategory: { type: String, required: true },
        orderSubCategory: { type: String, required: true },
        orderName: { type: String, required: true },
        orderSetGroup: { type: String, required: false },
        serviceCode: { type: String, default: null },
        serviceName: { type: String, default: null },
        orderItems: { type: Object, required: true }
    }, { versionKey: false, _id: false });

    var packageOrderSetSchema = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        orderPackageName: { type: String, required: true },
        isPackage: { type: Boolean, required: true },
        recordType: { type: String, required: true },
        date: { type: Number, required: true },
        specId: { type: String },
        instructions: { type: String, required: false, deafult: "" },
        ordersList: [],
        created_by: { type: String, required: true },
        created_at: { type: Number, deafult: Date.now(), required: false },
        updated_by: { type: String, required: false },
        updated_at: { type: Number, deafult: Date.now(), required: false }
    }, { versionKey: false });

    var orderListItem = mongoose.model("orderListItem", orderListItemSchema);
    var packageOrderSet = mongoose.model("packageOrderSet", packageOrderSetSchema);
    var CpoeOrder = mongoose.model("CpoeOrder", cpoeOrderSchema);
    var labOrderItem = mongoose.model('labOrderItem', labOrderItemSchema);
    var bloodComponentItem = mongoose.model('bloodComponentItem', bloodComponentItemSchema);
    var imagingOrderItem = mongoose.model('imagingOrderItem', imagingOrderItemSchema);
    var procedureOrderItem = mongoose.model('procedureOrder', procedureOrderItemSchema);
    var generalOrderItem = mongoose.model('generalOrderItem', generalOrderItemSchema);
    var consultOrderItem = mongoose.model('consultOrderItem', consultOrderItemSchema);
    var vitalOrderItem = mongoose.model('vitalOrderItem', vitalOrderItemSchema);
    var nursingOrderItem = mongoose.model('nursingOrderItem', nursingOrderItemSchema);
    var patientMovementOrderItem = mongoose.model('patientMovementOrderItem', patientMovementOrderItemSchema);
    var opPharmacyOrder = mongoose.model('opPharmacyOrder', opPharmacyItemSchema);
    var opPharmacyItem = mongoose.model('opPharmacyItem', opPharmacyItem);
    var ipPharmacyOrder = mongoose.model('ipPharmacyOrder', ipPharmacyItemSchema);
    var ipPharmacyItem = mongoose.model('ipPharmacyItem', ipPharmacyItem);
    var complexDrugList = mongoose.model('complexDrugList', complexDrugListItem);
    var ivPharmacyOrder = mongoose.model('ivPharmacyOrder', ivPharmacyItemSchema);
    var tempIvPharmacyOrder = mongoose.model('tempIvPharmacyOrder', tempIvPharmacyItemSchema);
    var rehabOrderItem = mongoose.model('rehabOrderItem', rehabItemSchema);
    var dietOrderItem = mongoose.model('dietOrderItem', dietItemSchema);
    var nonHospitalPharmacyOrderItem = mongoose.model('nonHospitalPharmacyOrderItem', opPharmacyItemSchema);
    var medicalSuppliesItem = mongoose.model('medicalSuppliesItem', medicalSuppliesItemSchema);
    var cpoeDataModels = {
        CpoeOrder: CpoeOrder,
        labOrderItem: labOrderItem,
        bloodComponentItem: bloodComponentItem,
        imagingOrderItem: imagingOrderItem,
        procedureOrderItem: procedureOrderItem,
        generalOrderItem: generalOrderItem,
        consultOrderItem: consultOrderItem,
        vitalOrderItem: vitalOrderItem,
        nursingOrderItem: nursingOrderItem,
        patientMovementOrder: patientMovementOrderItem,
        opPharmacyOrder: opPharmacyOrder,
        opPharmacyItem: opPharmacyItem,
        ipPharmacyOrder: ipPharmacyOrder,
        ipPharmacyItem: ipPharmacyItem,
        ivPharmacyOrder: ivPharmacyOrder,
        tempIvPharmacyOrder: tempIvPharmacyOrder,
        complexDrugList: complexDrugList,
        rehabOrderItem: rehabOrderItem,
        packageOrderSet: packageOrderSet,
        orderListItem: orderListItem,
        nonHospitalPharmacyOrderItem: nonHospitalPharmacyOrderItem,
        dietOrderItem: dietOrderItem,
        medicalSuppliesItem: medicalSuppliesItem
    }
    return cpoeDataModels;
}
var customPharmacy = function (value) {
    // console.log("flag:"+this.isConsumableIp)
    if (this.isConsumableIp == true || this.isConsumableOp == true) {
        return false;
    } else if (value != null || value != '' || value != undefined) {
        return false;
    } else {
        return true;
    }
}
var pharmacyValidator = [customPharmacy, 'Idiot found, {PATH} does not equal "something".']