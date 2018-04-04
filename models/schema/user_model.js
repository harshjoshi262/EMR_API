var mongoose = require('mongoose');
var uuid = require('node-uuid');
module.exports = function () {
    var d_groupItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_unitItem = mongoose.Schema({
        _id: { type: String, required: true },
        code: { type: String, required: true },
        description: { type: String, required: true },
        operationHead: { type: Object, required: true },
        financeHead: { type: Object, required: true },
        clinicalHead: { type: Object, required: true },
        nursingHead: { type: Object, required: true },
        purchase_invetoryHead: { type: Object, required: true },
        qualityHead: { type: Object, required: true },
        unitHead: { type: Object, required: true },
        unitContactNo: { type: String, required: true },
        emailUnit: { type: String, required: true },
        unitFaxNo: { type: String, required: true },
        pharmacyLicenseNo: { type: String, required: true },
        unitRegistrationNo: { type: String, required: true },
        shop_establishmentNo: { type: String, required: true },
        tradeNo: { type: String, required: true },
        country: { type: String, required: true },
        state: { type: String, required: true },
        district: { type: String, required: true },
        taluka: { type: String, required: true },
        city: { type: String, required: true },
        area: { type: String, required: true },
        address: { type: String, required: true },
        postcode: { type: String, required: true },
        departments: [{ type: String, required: true }],
        isActive: { type: Boolean, required: true, default:true},
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    }, { versionKey: false })
    var d_subGroupItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        group:{ type: String, ref: 'd_subGroupMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_typeItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_departmentItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_subDepartmentItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        departmentObject: { type: String, ref: 'd_departmentMaster' }, // contains id, code , description 
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_classificationItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var d_designationItem = mongoose.Schema({
        _id: { type: String, required: true, default: uuid.v4() },
        code: { type: String, unique: true, required: true },
        description: { type: String, required: false },
        unit: { type: String, ref: 'd_unitMaster' },
        isActive: { type: Boolean, required: true, default:true },
        created_at: { type: Number, required: true },
        created_by: { type: String, required: true },
        updated_at: { type: Number, required: true },
        updated_by: { type: String, required: true }
    });
    var userQuickLinks = mongoose.Schema({
        _resources: { type: String, required: true },
        _user:{ type: String,required: true },
        index:{ type: Number},
        is_enable: { type: Boolean, required: false }
    });
    var d_groupMaster = mongoose.model('d_groupMaster', d_groupItem);
    var d_subGroupMaster = mongoose.model('d_subGroupMaster', d_subGroupItem);
    var d_typeMaster = mongoose.model('d_typeMaster', d_typeItem);
    var d_departmentMaster = mongoose.model('d_departmentMaster', d_departmentItem);
    var d_subDepartmentMaster = mongoose.model('d_subDepartmentMaster', d_subDepartmentItem);
    var d_classificationMaster = mongoose.model('d_classificationMaster', d_classificationItem);
    var d_designationMaster = mongoose.model('d_designatioMaster', d_designationItem);
    var d_unitMaster = mongoose.model('d_unitMaster', d_unitItem);
    var d_unitMaster = mongoose.model('d_unitMaster', d_unitItem);
    var user_quick_links = mongoose.model('user_quick_links', userQuickLinks);
    var userMangementModel = {
        d_groupMaster: d_groupMaster,
        d_subGroupMaster: d_subGroupMaster,
        d_typeMaster: d_typeMaster,
        d_departmentMaster: d_departmentMaster,
        d_subDepartmentMaster: d_subDepartmentMaster,
        d_classificationMaster: d_classificationMaster,
        d_designationMaster: d_designationMaster,
        d_unitMaster: d_unitMaster,
        user_quick_links:user_quick_links
    }
    return userMangementModel;

}