

var mongoose = require('mongoose');
var MONGODB_CONFIG = require('config').get('mongodb');

var dbMasterConnectionUrl = MONGODB_CONFIG.dbUser + ':' + MONGODB_CONFIG.dbPassword + '@' + MONGODB_CONFIG.dbHost + ':' + MONGODB_CONFIG.dbPort + '/Clinicare_Masters';
var masterConnection = mongoose.createConnection(dbMasterConnectionUrl);

module.exports = function () {
    // var icdCodes = masterConnection.model('M_IcdCodeDX', new mongoose.Schema({
    //     CODE:String,
    //     SHORT_Discription:String,
    //     LONG_Discription:String
    // }));

    var wardMaster = masterConnection.model('M_Ward', new mongoose.Schema({
        Ward_Code: String,
        Ward_Description: String,
        Floor: String,
        Gender: String
    }));

    var ProcedureMaster = masterConnection.model('M_Procedure', new mongoose.Schema({
        Procedure_Id: String,
        Code: String,
        Procedure_Name: String,
        Service_Id: String,
        Duration: String,
        Speciality: String
    }));

    var allergyMaster = masterConnection.model('M_Allergy', new mongoose.Schema({
        Allergy_Name: String,
        Potential_reaction: String,
        Remarks: String,
        Type: String
    }));

    var clinicMaster = masterConnection.model('M_Clinic', new mongoose.Schema({
        ID_HIS: String,
        Code: String,
        Description: String
    }));

    var departmentMaster = masterConnection.model('M_Department', new mongoose.Schema({
        ID_HIS: String,
        Code: String,
        Description: String,
        IsClinical: String
    }));

    var flagMaster = masterConnection.model('M_Flag', new mongoose.Schema({
        ID: Number,
        Name: String,
        Flag_Type: String
    }));

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
        Is_Specialization_service: String
    }));


    var drugSchema = masterConnection.model('M_DrugMasters', new mongoose.Schema({
        Stock_No: String,
        Generic_name: String,
        Trade_name: String,
        Strength_value: String,
        Unit_of_strength: String,
        Dosage_Form: String,
        Route_of_Administration: String,
        ATC_Code_1: String,
        ATC_Code_2: String,
        Volume: String,
        Unit_of_volume: String,
        Package_type: String,
        Package_size: String,
        Legal_status: String,
        Product_control: String,
        Public_price_RM: String,
        Shelf_life_mon: String,
        Remark: String
    }));

    var mastersModels = {
        // icdCodes: icdCodes,
        drugList: drugSchema,
        m_services: servicesMaster,
        m_wards: wardMaster,
        m_procedure: ProcedureMaster,
        m_allergy: allergyMaster,
        m_clinic: clinicMaster,
        m_department: departmentMaster,
        m_flag: flagMaster,
        m_icdcodedxes: icdCodes
    }

    return mastersModels;
}
