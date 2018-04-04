var mongoose = require('mongoose');
var masterConnection= mongoose.createConnection("mongodb://localhost/test");

module.exports = function () {
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
        MIMSTYPE:String,
        GUID:String
    }),'M_NDrugMasters');

    var allergyMaster = masterConnection.model('M_Allergy', new mongoose.Schema({
        Allergy_Name: String,
        Potential_reaction: String,
        Remarks: String,
        Type: String,
        MIMSTYPE:String,
        GUID:String
    }),'M_Allergy');

    var mastersModels = {
        drugList: drugSchema,
        m_allergy: allergyMaster
    }

    return mastersModels;
};