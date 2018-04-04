// var mongoose = require('mongoose');
// var Schema = mongoose.Schema;

// module.exports = function () {

//     var CounterSchema = Schema({
//         _id: { type: String, required: true },
//         seq: { type: Number, default: 0 }
//     },{ versionkey: false });

//     var counter = mongoose.model('counter', CounterSchema);

//     var RMQMsgLog = new mongoose.Schema({
//         _id: { type: String },
//         errorMsg: { type: String },
//         payload: { type: String },
//         Key: { type: String, required: true },
//         exchange: { type: String, required: true },
//         messageNo: { type: Number },
//         isSuccess:{type:Boolean,default:true},
//         //status: { type: String, enum: ["success", "error"] },
//         date: { type: String, required: true, default: Date.now() }
//     }, { versionKey: false })

//     RMQMsgLog.pre('save', function (next) {
//         var doc = this;
//         counter.findByIdAndUpdate({ _id: 'RMQID' }, { $inc: { seq: 1 } }, function (error, counter) {
//             if (error) {
//                 return next(error);
//             } else {
//                 if(counter)
//                     if(counter.seq!==undefined)
//                         if(counter.seq)
//                             doc.messageNo = counter.seq;
//                 next();
//             }
//         });
//     });

//     var RMQDB = mongoose.model('RMQ_Log_Status', RMQMsgLog);

//     var INT_DataObject = {
//         RMQLog: RMQDB,
//         counter:counter
//     }
//     return INT_DataObject;
// }