
var mongoose = require('mongoose');
var MONGODB_CONFIG = require('config').get('mongodb');
var uuid = require('node-uuid');
var dbMasterConnectionUrl = MONGODB_CONFIG.prefix + MONGODB_CONFIG.dbNameMaster + MONGODB_CONFIG.tail;
var masterConnection = mongoose.createConnection(dbMasterConnectionUrl);



module.exports = function () {
    var templateImage = masterConnection.model('M_AnnotationImage', new mongoose.Schema({
        Category: String,
        filePath: String,
        Name: String,
        createdOn: { type: String, default: Date.now() },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_imagingMasterNew = mongoose.model('m_imagingmaster', new mongoose.Schema({
        ID: Number,
        UnitID: Number,
        Code: Number,
        Description: String,
        EMRName: String,
        Modifier: String,
        Date: String,
        CategoryID: Number,
        ServiceID: Number,
        TurnAroundTime: Number,
        PrintTestName: String,
        IsResultOnlyOrderingDoctor: Number,
        Status: Number,
        CreatedUnitID: Number,
        UpdatedUnitID: Number,
        AddedBy: Number,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: Number,
        UpdatedOn: Number,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        Synchronized: Number,
        ModalityId: Number,
        Alias: String,
        Checklist: { type: String, default: null }
    }));
    var m_imagingCategoryNew = mongoose.model('m_imagingCategories', new mongoose.Schema({
        ID: Number,
        UnitID: Number,
        Code: Number,
        Description: String,
        Status: Number,
        CreatedUnitID: Number,
        UpdatedUnitID: Number,
        AddedBy: Number,
        AddedOn: String,
        AddedDateTime: Number,
        UpdatedBy: Number,
        UpdatedOn: String,
        UpdatedDateTime: Number,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        Synchronized: Number

    }))
    var m_modality = mongoose.model('m_modalitymasters', new mongoose.Schema({
        Id: Number,
        UnitID: Number,
        Code: Number,
        Description: String,
        AETitle: String,
        DepartmentID: Number,
        TimeSlot: Number,
        NoofPatient: Number,
        EquipmentID: Number,
        Status: Number,
        CreatedUnitID: String,
        UpdatedUnitID: String,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        Synchronized: Number,
    }))
    var m_icdCodes = mongoose.model('m_icdcodes', new mongoose.Schema({
        CODE: { type: String, required: true },
        SHORT_Discription: { type: String, required: true },
        Status: Number,
        Group: String
    }))
    var m_checklist_items = mongoose.model('m_checklist_items', new mongoose.Schema({
        Index: String,
        ItemName: String,
        ItemValue: { type: Boolean, default: false },
        ItemType: String,
        ChildItems: []
    }))
    var m_checklist = mongoose.model('m_checklists', new mongoose.Schema({
        Code: String,
        Description: String,
        Items: [],
        Instructions: []
    }))
    var m_nursing_orders = masterConnection.model("m_nursing_orders", new mongoose.Schema({
        "category": { type: String, required: true },
        "order_name": { type: String, required: true },
        "Status": { type: Number, required: true },
        "created_by": { type: String, required: true },
        "updated_by": { type: String },
        "date_of_creation": { type: Number, required: true },
        "date_of_modification": { type: Number }
    }, { versionKey: false }));
    var m_diet_types = masterConnection.model("m_diet_types", new mongoose.Schema({
        diet_type: { type: String, required: true },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }))
    var prefixMaster = masterConnection.model('M_Prefix', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var countryMaster = masterConnection.model('M_Country', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var stateMaster = masterConnection.model('M_State', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        CountryId: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var cityMaster = masterConnection.model('M_City', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        StateID: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var prefIcdCodes = masterConnection.model("prefIcdCodes", new mongoose.Schema({
        _id: { type: String, default: uuid.v4(), required: true },
        userId: { type: String, required: true },
        isProblem: { type: Boolean, required: true },
        payload: [{ type: mongoose.Schema.Types.ObjectId, ref: 'M_IcdCodeDX' }],
    }, { versionKey: false }))
    var m_enteral_nutritions = masterConnection.model("m_enteral_nutritions", new mongoose.Schema({
        enteral_nutritional_products: { type: String, required: true },
        is_adult_supplement: { type: String, required: true },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_quick_links = masterConnection.model("m_quick_links", new mongoose.Schema({
        slug: { type: String, required: true },
        link_name: { type: String, required: true },
        acl_resource_key: { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var drugSchema = masterConnection.model('M_NDrugMasters', new mongoose.Schema({
        Medcare_ItemId: String,
        Item_Code: String,
        Inventory_Code: String,
        Brand_Name: String,
        Item_Name: String,
        Generic_Name: String,
        Volume: String,
        Unit_of_volume: String,
        Strength_value: String,
        Unit_of_strength: String,
        Item_Group: String,
        Item_Category: String,
        Dispensing_Type: String,
        Storage_Type: String,
        Pregnancy_Class: String,
        Therapecutic_Class: String,
        Manufactured_By: String,
        Marketed_By: String,
        Purchase_UOM: String,
        Stocking_UOM: String,
        Conversion_Factor: String,
        Route: String,
        Cost_Price: String,
        Sale_Price: String,
        GST: String,
        Guide_Cost: String,
        GST_Applicable_on: String,
        Batches_Required: String,
        Life_Saving: String,
        High_Risk: String,
        High_Cost: String,
        Inclusive_of_All_taxes_other_than_GST: String,
        Discount_on_Sale: String,
        Drug_Info: String,
        Map_ID: String,
        Charge_Code: String,
        VED_Type: String,
        ABC_Type: String,
        Notes: String,
        Dangerous: String,
        Psychotropic: String,
        Is_Consumable: String,
        Frequency: String,
        Usage: String,
        GST_Tax_Code: String,
        IsKit: String,
        Discontinue: String,
        Remarks: String,
        Warning: String,
        Mark_up: String,
        On_Cost_Price: String,
        On_Landed_Rate: String,
        MIMS_MY: String,
        MIMSTYPE: String,
        GUID: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var ItemSchema = masterConnection.model('M_ItemMasters', new mongoose.Schema({
        ID: Number,
        UnitID: String,
        CodeType: String,
        ItemCode: String,
        InventoryCode: String,
        BrandName: String,
        Strength: String,
        ItemName: String,
        MoleculeName: String,
        ItemGroup: String,
        ItemCategory: String,
        DispencingType: String,
        StoreageType: String,
        PregClass: String,
        TherClass: String,
        MfgBy: String,
        MrkBy: String,
        PUM: String,
        SUM: String,
        Frequency: Number,
        ConversionFactor: String,
        Route: String,
        PurchaseRate: String,
        MRP: String,
        VatPer: String,
        ReorderQnt: String,
        BatchesRequired: String,
        InclusiveOfTax: String,
        DiscountOnSale: String,
        CreatedUnitID: String,
        UpdatedUnitID: String,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        Synchronized: String,
        ChargeCode: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_itemGroup = masterConnection.model('m_itemgroup', new mongoose.Schema({
        ID: Number,
        UnitID: Number,
        Code: String,
        Description: String,
        LedgerName: String,
        Status: Number,
        CreatedUnitID: Number,
        UpdatedUnitID: String,
        AddedBy: Number,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        Synchronized: Number,
        MarkupPercent: Number,
        IsMRPonCostPriceLandedRate: Number,
        MarkUpAmount: String,
        IsMarkUpApplicable: String,
        IsOPD_IPD: String,
        IsMedicalSupply: Boolean
    }))
    var m_drugmasters_new_schema = masterConnection.model('m_drugmasters_new', new mongoose.Schema({
        ID: Number,//ID
        UnitID: Number,
        CodeType: Number,
        ItemCode: String,
        InventoryCode: String,
        IsConsumable: Number,
        BrandName: String,
        Strength: String,
        ItemName: String,
        EMRItemName: String,
        Dosage: String,
        DosageUnit: String,
        Dispensing_Type: Number,//Usage
        MoleculeName: Number,
        ItemGroup: Number,
        ItemCategory: Number,
        DispencingType: Number,
        StoreageType: Number,
        PregClass: Number,
        TherClass: Number,
        MfgBy: Number,
        MrkBy: Number,
        PUM: Number,
        SUM: Number,
        ConversionFactor: Number,
        Route: Number,
        PurchaseRate: Number,
        MRP: Number,
        VatPer: Number,
        ReorderQnt: Number,
        BatchesRequired: Number,
        InclusiveOfTax: Number,
        DiscountOnSale: Number,
        CreatedUnitID: Number,
        UpdatedUnitID: Number,
        AddedBy: Number,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: Number,
        UpdatedOn: String,
        UpdatedDateTime: String,
        Suggestions: String,
        Remarks: String,
        SourceURL: String,
        DocumentName: String,
        IsHighRisk: Number,
        //BarCode: Buffer,
        ChargeCode: String,
        DefaultFrequency: Number,//Frequency
        MIMS_MY: String,
        MIMSTYPE: String,
        GUID: String,
        LWHE_MY_MYFORMULARY: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        Abbreviations: String,
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }), 'm_drugmasters_new');
    var m_dispensingtype = masterConnection.model("m_dispensingtype", new mongoose.Schema({
        ID: { type: Number },
        UnitId: { type: Number },
        Code: { type: String },
        Key: { type: Number },
        RecordType: { type: String },
        Description: { type: String },
        Synchronized: { type: Number, default: 0 },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }), 'm_dispensingtype');
    var dataObjectMaster = masterConnection.model('M_DataObject', new mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        type: String,
        title: String,
        dataObject: Object,
        datamodels: Object
    }, { versionKey: false }));
    var radiologyTestMater = masterConnection.model('M_RadiologyTest', new mongoose.Schema({
        HIS_ID: String,
        Test_Code: String,
        Test_Category: String,
        Test_Category_ID: String,
        Service_ID: String,
        Modifier: String,
        Modality: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var pocTestMater = masterConnection.model('M_POC_Test', new mongoose.Schema({
        Test: String,
        Sub_Test: String,
        Reference_Range_min: Number,
        Reference_Range_max: Number,
        Comment: String,
        Entry_Limit_min: String,
        Entry_Limit_max: String,
        Unit: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var imagingMaster = masterConnection.model('M_Imaging', new mongoose.Schema({
        ID: { type: Number, required: true },
        UnitID: String,
        Code: String,
        Description: String,
        EMRDescription: String,
        EMRModifier: String,
        Date: String,
        CategoryID: { type: Number },
        ServiceID: { type: Number },
        TurnAroundTime: String,
        PrintTestName: String,
        IsResultOnlyOrderingDoctor: String,
        Status: String,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        ModalityId: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var imagingCategoryMaster = masterConnection.model('M_ImagingCategory', new mongoose.Schema({
        ID: { type: Number, required: true },
        UnitID: String,
        Code: String,
        Description: String,
        Status: String,
        CreatedUnitID: String,
        UpdatedUnitID: String,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        AddedWindowsLoginName: String,
        UpdateWindowsLoginName: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var sampleMaster = masterConnection.model('M_Sample', new mongoose.Schema({
        HIS_ID: String,
        Description: String,
        Code: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var icd9cMaster = masterConnection.model('M_ICD9C', new mongoose.Schema({
        chapter: String,
        rubric_l: String,
        rubric_h: String,
        digit_rubric2: String,
        digit_rubric3: String,
        digit_rubric4: String,
        description: String,
        Category: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_specimans = masterConnection.model("m_specimans", new mongoose.Schema({
        "category_code": { type: String, required: true },
        "category_name": { type: String, required: true },
        "speciman": { type: String, required: true },
        "created_by": { type: String, required: true },
        "date_of_creation": { type: Number, required: true },
        "date_of_modification": { type: Number },
        "Status": { type: Number, required: true },//1=Active/2=Inactive/3=Partially Deleted
        "updated_by": { type: String }
    }), 'm_specimans', { versionKey: false });
    var customUnitSchema = mongoose.Schema({
        unitId: { type: mongoose.Schema.Types.ObjectId },
        unitname: { type: String },
        AgeRange: [{
            minAge: { type: Number },
            maxAge: { type: Number },
            refLow: { type: Number },
            refHigh: { type: Number },
            criticalLow: { type: Number },
            criticalHigh: { type: Number },
            entryLimitLow: { type: Number },
            entryHighLimit: { type: Number },
            defaultValue: { type: Number }
        }]
    }, { _id: false, versionKey: false });
    var vitalMaster = mongoose.model('M_Vital', new mongoose.Schema({
        //_id: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId()},
        _id: { type: mongoose.Schema.Types.ObjectId },
        vitalName: { type: String, required: true },
        Abbrevation: { type: String, required: true },
        entryType: { type: String, enum: ["NUMBER", "String"] },
        // subVital: [],
        unit: [customUnitSchema],
        subVital: [{ type: mongoose.Schema.Types.ObjectId }],
        IsSubVital: { type: Boolean, default: false },
        parentVitalName: { type: String },
        parentVitalID: { type: mongoose.Schema.Types.ObjectId },
        calculation: { type: String },
        qualifire: [],
        speciality: { type: String, required: true },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Date, default: Date.now() },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }))
    var vitalUnitMaster = mongoose.model('M_VitalUnit', new mongoose.Schema({
        _id: { type: mongoose.Schema.Types.ObjectId },
        Code: { type: String, unique: true, required: true },
        Description: { type: String, default: "" },
        Unit: { type: String, required: true },
        Status: { type: Number, default: 1 },
        date_of_creation: { type: Date, default: Date.now() }
    }, { versionKey: false }))
    var vitalsMaster = masterConnection.model('Vital', new mongoose.Schema({
        vitalName: String,
        entryType: String,
        subVital: [],
        unit: [],
        calculation: String,
        qualifire: [],
        speciality: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }))
    var prefVitalSet = mongoose.model("prefVitalSet", mongoose.Schema({
        _id: { type: String, required: true, deafult: uuid.v4() },
        vitalSetName: { type: String, required: true },
        userId: String,
        vitalList: [{ type: mongoose.Schema.Types.ObjectId , ref: 'M_Vital' }],
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }))
    var frequencyMaster = masterConnection.model('M_Frequency', new mongoose.Schema({
        ID: Number,
        Description: String,
        Code: String,
        Token: String,
        UnitId: Number,
        NextDoseIntervalHrs:Number,
        Status: Number,
        IntervalID: Number,
        Abbreviation: String,
        MalyaDescription: String,
        ChineseDescription: String,
        NumberOfDays: Number,
        AddedBy: Number,
        AddedDateTime: Date,
        isPRN: { type: Boolean },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_dosefrequencydetails = masterConnection.model('m_dosefrequencydetails', new mongoose.Schema({
        ID: String,
        FrequencyID: String,
        MedicationTimeID: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var m_molecules = masterConnection.model('m_molecules', new mongoose.Schema({
        ID: Number,
        UnitID: String,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var routeMater = masterConnection.model('M_Route', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var nationalityMaster = mongoose.model('M_Nationality', new mongoose.Schema({
        ID: Number,
        UnitID: String,
        Code: String,
        Description: String,
        Status: Number
    }, { versionKey: false }))
    var LabCategory = masterConnection.model('M_labTestCategory', new mongoose.Schema({
        ID: Number,
        UnitID: Number,
        Code: String,
        Description: String,
        Status: Number,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        IsEMRCategory: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var labtestMater = masterConnection.model('M_LabTest', new mongoose.Schema({
        ID: { type: Number, required: true },
        Code: String,
        Description: String,
        TestPrintName: String,
        IsSubTest: Number,
        CategoryID: { type: Number, required: true },
        ServiceID: { type: Number, required: true },
        IsParameter: Number,
        UnitID: Number,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        ContainerID: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var nandaDiagnosis = new mongoose.Schema({
        Domain: Number,
        Class: { type: Number, required: true },
        Order_within_Class: Number,
        Diagnosis_Code: Number,
        Diagnosis_Label: String,
        Diagnosis_Definition: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false });
    var nandaClass = masterConnection.model('M_Nanda_Class', new mongoose.Schema({
        Domain: { type: Number, required: true },
        Class: { type: Number, required: true },
        DomainClass: String,
        Classlabel: String,
        Classdefinition: String,
        Empty: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var nandaDomain = masterConnection.model('M_Nanda_Domain', new mongoose.Schema({
        Domain: Number,
        Domainlabel: String,
        Domaindefinition: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    nandaDiagnosis.statics.findClassDomain = function (id, cb) {
        var result = {};
        try {
            this.findOne({ _id: id }, function (err, R_Diagnosis) {
                result.Order_within_Class = R_Diagnosis.Order_within_Class
                result.Diagnosis_Code = R_Diagnosis.Diagnosis_Code
                result.Diagnosis_Label = R_Diagnosis.Diagnosis_Label
                result.Diagnosis_Definition = R_Diagnosis.Diagnosis_Definition
                nandaDomain.findOne({ Domain: R_Diagnosis.Domain }, function (err, R_Domain) {
                    if (err) {
                        cb(err)
                    } else {
                        result.Domain = R_Domain;
                        nandaClass.findOne({ Class: R_Diagnosis.Class }, function (err, R_class) {
                            if (err)
                                cb(err)
                            else {
                                result.Class = R_class
                                cb(null, result)
                            }
                        })
                    }
                })
            })
        } catch (e) {
            cb(e);
        }
    }
    var nandaDia = masterConnection.model("M_Nanda_Diagnosis", nandaDiagnosis);

    var wardMaster = mongoose.model('M_Ward', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        FloorId: Number,
        WardType: String,
        StoreID: Number,
        PriorityID: Number,
        GenderID: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var ProcedureMaster = masterConnection.model('M_Procedure', new mongoose.Schema({
        Procedure_Id: String,
        Code: String,
        Procedure_Name: String,
        Service_Id: String,
        Duration: String,
        Speciality: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var allergyMaster = masterConnection.model('m_allergies', new mongoose.Schema({
        Allergy_Name: String,
        MIMS_MY: String,
        MIMSTYPE: String,
        GUID: String
    }), 'm_allergies');

    var clinicMaster = masterConnection.model('M_Clinic', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        StoreID: Number,
        LocationID: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var bedMaster = mongoose.model('m_beds', new mongoose.Schema({
        "ID": Number,
        "UnitID": Number,
        "Code": String,
        "Description": String,
        "WardId": Number,
        "BedCategoryId": Number,
        "RoomId": Number,
        "IsBedAmmenities": Number,
        "Occupied": Number,
        "IsNonCensus": Number,
        "IsUnderMaintanence": Number,
        "Status": Number
    }))
    var departmentMaster = masterConnection.model('M_Department', new mongoose.Schema({
        ID: Number,
        Code: String,
        Description: String,
        IsClinical: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var bloodComponent = masterConnection.model('M_BloodComponent', new mongoose.Schema({
        Id: Number,
        UnitId: Number,
        Code: String,
        ShortDescription: String,
        Description: String,
        Expiry: String,
        ServiceId: String,
        AddedBy: String,
        AddedOn: String,
        AddedDateTime: String,
        UpdatedBy: String,
        UpdatedOn: String,
        UpdatedDateTime: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var modifierMater = masterConnection.model('M_Modifier', new mongoose.Schema({
        HIS_ID: String,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var genericMater = masterConnection.model('M_Generic', new mongoose.Schema({
        HIS_ID: String,
        Code: String,
        Description: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var flagMaster = masterConnection.model('M_Flag', new mongoose.Schema({
        ID: Number,
        Name: String,
        Flag_Type: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var templateCategory = masterConnection.model('M_Template_Category', new mongoose.Schema({
        Category: String,
        ID: Number,
        LocationId: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var templateSubCategory = masterConnection.model('M_Template_subcategory', new mongoose.Schema({
        CategoryID: Number,
        SubCategory: String,
        ID: Number,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var servicesMaster = masterConnection.model('M_Service', new mongoose.Schema({
        ServiceCode: String,
        ServiceName: String,
        Specialization: String,
        Sub_Specialization: String,
        Outsource: String,
        Base_package: String,
        Health_plan: String,
        Is_package: String,
        OT_Procedure: String,
        Is_Order_set: String,
        Rate_editable: String,
        Minimum_amount: String,
        Maximum_amount: String,
        Docor_share: String,
        Share_available_to_all_doctors: String,
        Allow_multiple_quantity: String,
        Authorization_required: String,
        Is_GST_Applicable: String,
        Is_Specialization_service: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }));
    var rehubMaster = masterConnection.model('m_rehabs', new mongoose.Schema({
        _id: { type: String, required: true },
        consult_to_service: { type: String, required: true },
        reason_for_request: [{ type: mongoose.Schema.Types.Mixed }],
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }), 'm_rehabs');
    var referralServicesMaster = masterConnection.model('m_referral_services', new mongoose.Schema({
        service_code: { type: String, required: true },
        m_service_group: { type: Number, required: true },
        sub_group: { type: String },
        service_name: { type: String, required: true },
        OP: { type: Number },
        IP1: { type: Number },
        IP2: { type: Number },
        IP3: { type: Number },
        refferal: { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { versionKey: false }), 'm_referral_services');
    var masterCounterSchema = new mongoose.Schema({
        _id: String,
        name: String,
        sequence: { type: Number, default: 1, required: true },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    }, { collection: "M_Counter", versionKey: false });
    var userTypeSchema = new mongoose.Schema({
        _id: String,
        key: { type: String, required: true },
        const: { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    });
    var genderSchema = new mongoose.Schema({
        _id: String,
        key: { type: String, required: true },
        code: String,
        unit: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    })
    var relationshipSchema = new mongoose.Schema({
        _id: String,
        key: { type: String, required: true },
        const: String,
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    });
    var roleSchema = new mongoose.Schema({
        _id: { type: String, required: true },
        key: { type: String, unique: true, required: true },
        displayName: { type: String }
    });
    var resourceSchema = new mongoose.Schema({
        _id: { type: String, default: uuid.v4() },
        key: { type: String, unique: true, required: true },
        displayName: { type: String },
        imgUrl: { type: String, default: '' },
        identifier: { type: String, default: '' },
        uiRef: { type: String, default: '' },
        type: { type: String },
        groupIndex: { type: Number },
        itemIndex: { type: Number },
        next: { type: Number }
    });
    var permissionSchema = new mongoose.Schema({
        _id: { type: String, required: true },
        key: { type: String, unique: true, required: true },
        displayName: { type: String }
    });
    var recordMasterSchema = new mongoose.Schema({
        _id: { type: String, required: true },
        displayName: { type: String },
        category: { type: String },
        code: String
    });
    var M_MedicationStatusSchema = new mongoose.Schema({
        alias: { type: String },
        status_for: [],
        display_name: { type: String },
        description: { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 }//1=Active/2=Inactive/3=Partially Deleted
    });
    var M_ImmunisationsSchema = new mongoose.Schema({
        vaccine: { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    });
    var M_Immunisations_Age_DosesSchema = new mongoose.Schema({
        immunisation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'M_Immunisations' },
        age_from: { type: Number, default: null },
        age_to: { type: Number, default: null },
        age_renge: { type: String, default: null },
        dose: { type: Number },
        mandatory: { type: Number },
        type: { type: String }
    });
    var m_help_textsSchema = new mongoose.Schema({
        "displayName": { type: String, required: true },
        "key": { type: String},
        "uiRef": { type: String },
        "identifier": { type: String },
        "help_text": { type: String },
        created_by: { type: String, default: "System" },
        updated_by: { type: String, default: "System" },
        date_of_creation: { type: Number },
        date_of_modification: { type: Number },
        Status: { type: Number, default: 1 },//1=Active/2=Inactive/3=Partially Deleted
    });

    var m_nursingstation = mongoose.model('m_nursing_master', new mongoose.Schema({
        "ID": {type:Number},
        "UnitID": {type:Number},
        "Code": {type:String},
        "Description": {type:String},
        "Status": {type:Number},
        "CreatedUnitID": {type:Number},
        "UpdatedUnitID":{type:Number},
        "AddedBy": {type:Number},
        "AddedOn": {type:String},
        "AddedDateTime": {type:Date},
        "AddedWindowsLoginName":{type:String},
        "UpdatedBy": {type:Number},
        "UpdatedOn": {type:String},
        "UpdatedDateTime": {type:Date},
        "UpdateWindowsLoginName": {type:String},
    }));

    var masterUserType = masterConnection.model('M_userType', userTypeSchema);
    var masterCounter = masterConnection.model('M_Counter', masterCounterSchema);
    var masterGender = masterConnection.model('M_gender', genderSchema);
    var depRelationship = masterConnection.model('M_dependRelationship', relationshipSchema);
    var Role = masterConnection.model('Role', roleSchema);
    var Resource = masterConnection.model('Resource', resourceSchema);
    var Permission = masterConnection.model('Permission', permissionSchema);
    var recordMaster = masterConnection.model('m_recordMaster', recordMasterSchema);
    var M_MedicationStatusMaster = masterConnection.model('M_MedicationStatus', M_MedicationStatusSchema, 'M_MedicationStatus');
    var M_ImmunisationsMaster = masterConnection.model('M_Immunisations', M_ImmunisationsSchema, 'M_Immunisations');
    var M_Immunisations_Age_DosesMaster = masterConnection.model('M_Immunisations_Age_Doses', M_Immunisations_Age_DosesSchema, 'M_Immunisations_Age_Doses');
    var m_help_textsMaster = masterConnection.model('m_help_texts', m_help_textsSchema, 'm_help_texts');
    var mastersModels = {
        icdCodes: m_icdCodes,
        m_icd9c: icd9cMaster,
        m_dataObject: dataObjectMaster,
        drugList: drugSchema,
        m_vital: vitalMaster,
        m_prefix: prefixMaster,
        m_country: countryMaster,
        m_state: stateMaster,
        m_city: cityMaster,
        m_services: servicesMaster,
        m_imaging: imagingMaster,
        m_imagingCategory: imagingCategoryMaster,
        m_imagingCategoryNew: m_imagingCategoryNew,
        m_imagingMasterNew: m_imagingMasterNew,
        m_wards: wardMaster,
        m_procedure: ProcedureMaster,
        m_allergy: allergyMaster,
        m_clinic: clinicMaster,
        m_department: departmentMaster,
        m_flag: flagMaster,
        m_poc: pocTestMater,
        m_vitalunit: vitalUnitMaster,
        M_BloodComponent: bloodComponent,
        M_Route: routeMater,
        M_Modifier: modifierMater,
        m_nanda_dignosis: nandaDia,
        m_nanda_domain: nandaDomain,
        m_nanda_class: nandaClass,
        M_Generic: genericMater,
        vitals: vitalsMaster,
        m_nationality: nationalityMaster,
        m_labtest: labtestMater,
        m_labCategory: LabCategory,
        m_template_category: templateCategory,
        m_template_subcategory: templateSubCategory,
        m_frequency: frequencyMaster,
        m_sample: sampleMaster,
        m_specimen: m_specimans,
        m_radiology: radiologyTestMater,
        prefIcdCodes: prefIcdCodes,
        prefVitalSet: prefVitalSet,
        masterCounter: masterCounter,
        masterGender: masterGender,
        masterUserType: masterUserType,
        m_TemplateImage: templateImage,
        depRelationship: depRelationship,
        //prefNotification:prefNotification,
        //notificationType:notificationType,
        m_rehub: rehubMaster,
        m_refferal_service: referralServicesMaster,
        m_diet_types: m_diet_types,
        m_enteral_nutritions: m_enteral_nutritions,
        m_quick_links: m_quick_links,
        m_drugmasters_new: m_drugmasters_new_schema,
        m_molecules: m_molecules,
        m_dosefrequencydetails: m_dosefrequencydetails,
        m_dispensingtype: m_dispensingtype,
        Role: Role,
        Resource: Resource,
        Permission: Permission,
        m_recordMaster: recordMaster,
        M_MedicationStatus: M_MedicationStatusMaster,
        M_Immunisations: M_ImmunisationsMaster,
        M_Immunisations_Age_Doses: M_Immunisations_Age_DosesMaster,
        m_itemGroup: m_itemGroup,
        m_help_texts: m_help_textsMaster,
        m_checklist: m_checklist,
        m_checklist_item: m_checklist_items,
        bedMaster: bedMaster,
        m_nursing_orders: m_nursing_orders,
    };
    return mastersModels;
}
