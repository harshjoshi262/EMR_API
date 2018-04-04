
var mongoose = require('mongoose');
var uuid = require('node-uuid');
var Schema = mongoose.Schema;

module.exports = function () {

    var CPOEResults = Schema({
        CPOE_Category:{type:String,required:true},
        Result_Collection:{type:String,required:true},
        CPOE_OrderId:{type:String,required:true},
        patientId:{type:String},
        visitId:{type:String},
        Status:{type:String,default:""}
    }, { versionKey: false })

    var ImagingResultSchema = Schema({
        OrderNo: { type: String, required: true },
        Observation: String,
        Observation_by: String,
        patientId: { type: String, required: true },
        visitId: { type: String, required: true },
        orderId: { type: String, required: true },
        IsAcknoledge:{type:Boolean, default:false},
        Observation_date: { type: Date, deafult: new Date() },
        Result_Message: { type: String },
        date_time: { type: Date, deafult: new Date() }
    }, { versionKey: false });


    var ImagingResult = mongoose.model("Results_Imaging", ImagingResultSchema)
    var CPOE_Results = mongoose.model("Results_CPOE", CPOEResults)

    var ResultDataModel = {
        R_Imaging: ImagingResult,
        CPOE_Results:CPOE_Results
    }
    return ResultDataModel;
}

