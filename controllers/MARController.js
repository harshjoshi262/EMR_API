var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var DomainModel = document.domainModel;
var async = require('async');
var EMR_CONFIG = require('config').get('ehrserver');
var moment=require("moment");
var utc2gmt=require(APP_ROOT_PATH+"/timezones/utc2gmt.json");
var gmt2utc=require(APP_ROOT_PATH+"/timezones/gmt2utc.json");
module.exports = function MARController() {
    this.getMedications = function(req,res,next){
        var thisObj=this;
        var GMT_TIMEZONE=EMR_CONFIG.GMT_TIMEZONE;
        var TEXT_TIMEZONE=EMR_CONFIG.TEXT_TIMEZONE;
        if(req.body.timezone){
            if(req.body.timezone.indexOf('/')!=-1){
                GMT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?utc2gmt[req.body.timezone]:EMR_CONFIG.GMT_TIMEZONE;
                TEXT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.TEXT_TIMEZONE;
            }
            else{
                TEXT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?gmt2utc[req.body.timezone]:EMR_CONFIG.TEXT_TIMEZONE;
                GMT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.GMT_TIMEZONE;
            }
        }
        var returnData={};
        var medicationTimes={};
        var patientIds=[];
        if(req.body.patientIds){
            patientIds=req.body.patientIds;
        }
        else{
            return res.json(Utility.output('Invalid format of patient ids', 'VALIDATION_ERROR'));
        }
        if(!patientIds.length)
            return res.json(Utility.output('Patient IDs is requried', 'VALIDATION_ERROR'));
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.find({_id:{$in:patientIds}},function(err,patients){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patients.length)
                        return res.json(Utility.output("No Patients are found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                MasterModel.m_frequency.aggregate([
                    {
                        $lookup: {
                            from: "m_dosefrequencydetails",
                            localField: "ID",
                            foreignField: "FrequencyID",
                            as: "m_dosefrequencydetails"
                        },
                    },
                    { $unwind: { path: "$m_dosefrequencydetails", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "M_MedicationTimeMaster",
                            localField: "m_dosefrequencydetails.MedicationTimeID",
                            foreignField: "MEDICATION_TIME_HIS_ID",
                            as: "M_MedicationTimeMaster"
                        }
                    },
                    { $unwind: { path: "$M_MedicationTimeMaster", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            "_id": "$ID",
                            "NextDoseIntervalHrs":{"$first":"$NextDoseIntervalHrs"},
                            "Token":{ "$first": "$Token"},
                            "Description":{ "$first": "$Description"},
                            "M_MedicationTimeMaster": { "$push": "$M_MedicationTimeMaster.Description"}
                        }
                    }
                ],function(err,medicationTime){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!medicationTime.length)
                        return res.json(Utility.output("No Medication time has been found", 'ERROR'));
                    async.eachSeries(medicationTime, function iteratee(eachData, callback_each) {
                        if(medicationTimes[eachData._id]===undefined)
                            medicationTimes[eachData._id]={
                                "NextDoseIntervalHrs":eachData.NextDoseIntervalHrs,
                                "Token":eachData.Token,
                                "Description":eachData.Description,
                                "Time":null
                            };
                        medicationTimes[eachData._id].Time=eachData.M_MedicationTimeMaster.map(function(eachTime){
                            return ((thisObj.createProperTimeFormat(eachTime))=="24:00")?"00:00":thisObj.createProperTimeFormat(eachTime);
                        });
                        callback_each();
                    },function(){
                        callback_parallel();
                    });
                });
            }
        ],function(){
            var currentDate=new Date(moment().format('YYYY/MM/DD')+' 23:59:59 '+GMT_TIMEZONE);
            var startDate=new Date(moment().format('YYYY/MM/DD')+' 00:00:00 '+GMT_TIMEZONE);
            var query = {
                startDate:{$lte:startDate.getTime()},
                $or:[
                    {endDate:{$exists:false}},
                    {endDate:{$gte:currentDate.getTime()}},
                ],
                status:{$in:["active","hold"]},
                patientId:{$in:patientIds}
            };
            if(!req.query.medical_reconciliation)
                query['orderType']={$in: ["ip","iv"]};
            if(req.body.date)
            {
                var currentDate=new Date(req.body.date+' 00:00:00 '+GMT_TIMEZONE);
                if(isNaN(currentDate))
                    return res.json(Utility.output("Invalid Date. Date must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
                query.startDate = {$lte:currentDate.getTime()};
                query["$or"] = [
                    {endDate:{$exists:false}},
                    {endDate:{$gte:new Date(req.body.date+' 23:59:59 '+GMT_TIMEZONE).getTime()}},
                ];
            }
            if(req.body.medication_id)
            {
                query['_id']=Utility.escape(req.body.medication_id);
            }
            DomainModel.Medication.aggregate([
                {$match:query},
                {
                    $lookup: {
                        from: "medication_histories",
                        localField: "_id",
                        foreignField: "medication_id",
                        as: "medication_histories"
                    },
                },
                {
                    $lookup: {
                        from: "medication_adr_histories",
                        localField: "_id",
                        foreignField: "medication_id",
                        as: "medication_adr_histories"
                    },
                },
                {
                    $project: {
                        "_id": "$_id",
                        "Token":"$Token",
                        "endDate" : "$endDate",
                        "startDate" :"$startDate",
                        "dosage_unit" :"$dosage_unit",
                        "dosage" : "$dosage",
                        "drugGenericName" : "$drugGenericName",
                        "drugName" : "$drugName",
                        "orderItems" : "$orderItems",
                        "orderId" : "$orderId",
                        "drugId" : "$drugId",
                        "patientId" : "$patientId",
                        "orderType" : "$orderType",
                        "visitId" : "$visitId",
                        "status" : "$status",
                        "medicationDispensedStatus" : "$medicationDispensedStatus",
                        "histories" : "$medication_histories",
                        "ADR_histories":"$medication_adr_histories",
                        "date":"$date"
                    }
                },
            ],function(err,activeMedication){
                var currentDateTime=parseInt(moment().tz(TEXT_TIMEZONE).format("x"));
                if (err){
                    return res.json(Utility.output(err, 'ERROR'));
                }
                //return res.json(activeMedication);
                async.eachSeries(activeMedication, function iteratee(eachData, callback_each) {
                    var temp={};
                    if(eachData.orderItems === undefined)
                        return callback_each();
                    if(eachData.orderItems.orderType!==undefined){
                        if(eachData.orderItems.orderType.toLowerCase()==="infusion")
                        {
                            temp=JSON.parse(JSON.stringify(eachData.orderItems));
                            temp.orderType="infusion";
                        }
                        else if(eachData.orderItems.type.toLowerCase()==="complex")
                        {
                            temp=JSON.parse(JSON.stringify(eachData.orderItems.complexPharmacyItems[0]));
                            temp.orderType="ip-complex";
                        }
                        else if(eachData.orderItems.type.toLowerCase()==="dosage"){
                            temp=JSON.parse(JSON.stringify(eachData.orderItems.ipPharmacyItems[0]));
                            temp.orderType="ip";
                        }
                        else{}
                    }
                    temp.date=moment(eachData.date).tz(TEXT_TIMEZONE).format("x");
                    temp.status=eachData.status;
                    temp.medication_id=eachData._id;
                    temp.medication_histories=[];
                    temp.ADR_histories=(eachData.ADR_histories!==undefined)?eachData.ADR_histories.sort( function ( a, b ) { return b.date_of_modification - a.date_of_modification; } ):[];
                    temp.medication_times=[];
                    async.parallel([
                        function(callback_parallel1){
                            if(medicationTimes[temp.Frequency_HIS_ID]!==undefined){
                                if(medicationTimes[temp.Frequency_HIS_ID].NextDoseIntervalHrs)
                                {
                                    var fromTime=-99;
                                    medicationTimes[temp.Frequency_HIS_ID].Time=medicationTimes[temp.Frequency_HIS_ID].Time.sort();
                                    for(iteration=0;iteration<medicationTimes[temp.Frequency_HIS_ID].Time.length;iteration++)
                                    {
                                        fromTime=new Date(moment(temp.startDate).format('YYYY/MM/DD')+" "+medicationTimes[temp.Frequency_HIS_ID].Time[iteration]+" "+GMT_TIMEZONE).getTime();
                                        if(new Date(moment(parseInt(temp.date)).format('YYYY/MM/DD HH:mm:ss')+" "+GMT_TIMEZONE).getTime() <= fromTime && moment(currentDate).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")==moment(temp.startDate).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")){
                                            break;
                                        }
                                        else if(moment(currentDate).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")!=moment(temp.startDate).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")){
                                           fromTime=new Date(moment(temp.startDate).format('YYYY/MM/DD')+" "+medicationTimes[temp.Frequency_HIS_ID].Time[iteration]+" "+GMT_TIMEZONE).getTime();
                                           break;
                                        }
                                        else
                                        {
                                            fromTime=-99;
                                        }
                                    }

                                    if(fromTime==-99){
                                        fromTime=new Date(moment(temp.startDate).add(1, 'days').format('YYYY/MM/DD')+" "+medicationTimes[temp.Frequency_HIS_ID].Time[0]+" "+GMT_TIMEZONE).getTime();
                                        if(moment(currentDate).format("YYYY/MM/DD")==moment(fromTime).format("YYYY/MM/DD")){
                                            fromTime=new Date(moment(currentDate.getTime()).format('YYYY/MM/DD')+" 00:00:00 "+GMT_TIMEZONE).getTime();
                                        }
                                    }
                                    var toInitialTime=new Date(moment(currentDate.getTime()).format('YYYY/MM/DD')+" 00:00:00 "+GMT_TIMEZONE).getTime();
                                    DomainModel.medication_histories.find({medication_id:eachData._id,reset:true}).sort({history_date:1}).exec(function(err,resetRequests){
                                        if(err)
                                            return res.json(Utility.output(err,"ERROR"));
                                        async.parallel([
                                            function(callback_parallel2){
                                                if(resetRequests.length){
                                                    async.eachSeries(resetRequests, function iteratee(eachResetRequest, callback_each1) {
                                                        var nextFromTime=new Date(moment(eachResetRequest).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")+" "+eachResetRequest.new_time+" "+GMT_TIMEZONE).getTime();
                                                        if(toInitialTime>nextFromTime){
                                                            fromTime=nextFromTime;
                                                        }
                                                        callback_each1();
                                                    },function(){
                                                        callback_parallel2();
                                                    });
                                                }
                                                else
                                                {
                                                    callback_parallel2();
                                                }
                                            }
                                        ],function(){
                                            var toTime=new Date(moment(currentDate.getTime()).format('YYYY/MM/DD')+" 23:59:59 "+GMT_TIMEZONE).getTime();
                                            var fromInitialDate=new Date(moment(fromTime).tz(TEXT_TIMEZONE).format("YYYY/MM/DD")+" 00:00:00 "+GMT_TIMEZONE).getTime()
                                            var different = (((toInitialTime - fromInitialDate)*0.0000000115741).toFixed(2))*24;
                                            
                                            if(different<0)
                                                different*=-1;
                                            if(different>=0)
                                            {
                                                fromTime=fromTime+((different/medicationTimes[temp.Frequency_HIS_ID].NextDoseIntervalHrs)*medicationTimes[temp.Frequency_HIS_ID].NextDoseIntervalHrs*3600000);
                                                for(i=fromTime;i<=toTime;i+=(medicationTimes[temp.Frequency_HIS_ID].NextDoseIntervalHrs)*3600000){
                                                    if(i>=new Date(moment(currentDate.getTime()).format('YYYY/MM/DD')+" 00:00:00 "+GMT_TIMEZONE).getTime()){
                                                        temp.medication_times.push(moment(i).format('HH:mm:ss'));
                                                    }
                                                }
                                            }
                                            callback_parallel1();
                                        });
                                    });
                                }
                                else
                                {
                                    async.eachSeries(medicationTimes[temp.Frequency_HIS_ID].Times, function iteratee(eachTime, callback_each1) {
                                        temp.medication_times.push(thisObj.createProperTimeFormat(eachTime));
                                        callback_each1();
                                    },function(){
                                        callback_parallel1();
                                    });
                                }
                            }
                            else{
                                callback_parallel1();
                            }
                        },
                        function(callback_parallel1){
                            var marHistories=(eachData.histories!==undefined)?eachData.histories:[];
                            marHistories.sort(function(a,b) {return (a.actual_medication_time > b.actual_medication_time) ? 1 : ((b.actual_medication_time > a.actual_medication_time) ? -1 : 0);} ); 
                            async.eachSeries(marHistories, function iteratee(eachHistory, callback_each1) {
                                var temp1=Utility.mongoObjectToNormalObject(eachHistory);
                                var historyTime=moment(temp1.history_date).set({hour:0,minute:0,second:0,millisecond:0});
                                historyTime.tz(TEXT_TIMEZONE);
                                
                                var recentTime=moment(currentDate).set({hour:0,minute:0,second:0,millisecond:0});
                                recentTime.tz(TEXT_TIMEZONE);
                                
                                if(historyTime.format("x")!=recentTime.format("x"))
                                    return callback_each1();
                                temp1.history_id=temp1._id;
                                temp1.history_date=thisObj.getFormatedDate(temp1.history_date);
                                temp1.administration_user=null;
                                temp1.verification_user=null;
                                delete temp1._id;
                                async.parallel([
                                    function(callback_parallel_inner){
                                        if(temp1.administration_user_id){
                                            DomainModel.User.findOne({userId:temp1.administration_user_id},function(err,user){
                                                if(err)
                                                    return json(Utility.output(err,"ERROR"));
                                                temp1.administration_user={
                                                    email:user.email,
                                                    name:user.firstName
                                                };
                                                callback_parallel_inner();
                                            });
                                        }
                                        else{
                                            callback_parallel_inner();
                                        }
                                    },
                                    function(callback_parallel_inner){
                                        if(temp1.verification_user_id){
                                            DomainModel.User.findOne({userId:temp1.verification_user_id},function(err,user){
                                                if(err)
                                                    return json(Utility.output(err,"ERROR"));
                                                temp1.verification_user={
                                                    email:user.email,
                                                    name:user.firstName
                                                };
                                                callback_parallel_inner();
                                            });
                                        }
                                        else{
                                            callback_parallel_inner();
                                        }
                                    }
                                ],function(){
                                    temp.medication_histories.push(temp1);
                                    callback_each1();
                                });
                            },function(){
                                callback_parallel1();
                            });
                        }
                    ],function(){
                        temp.medication_times.sort();
                        var dynamicStatus=[];
                        var isHold=undefined;
                        var historyIndex=0;
                        var prnMedication=false;
                        var checkFirstResumeOccure=false;
                        var resumeLocation;
                        var holdLocation;
                        if(eachData.orderItems.prn!==undefined)
                            if(eachData.orderItems.prn==true || eachData.orderItems.prn=="true")
                                prnMedication=true;
                        async.eachSeries(temp.medication_times, function iteratee(eachTime, callback_each1) {
                            var executed=false;
                            var slotTime=new Date(moment(currentDate).format("YYYY/MM/DD")+" "+eachTime+" "+GMT_TIMEZONE).getTime();
                            var dynamicStatusEachObj={
                                "medication_id": eachData._id,
                                "actual_medication_time": "Unknown",
                                "registered_medication_time": null,
                                "reason": null,
                                "action": "Unknown",
                                "administration_user_id": null,
                                "verification_user_id": null,
                                "comment": null,
                                "history_date": moment(currentDate).format("YYYY-MM-DD"),
                                "date_of_modification": null,
                                "updated_from_medical_reconciliation": false,
                                "history_id": null
                            };
                            /*Current Time between slot time and 30mins before of slot time marked "SCHEDULED"*/ 
                            dynamicStatusEachObj.actual_medication_time=eachTime;
                            if(!temp.medication_histories.length && eachData.status=="hold" && (isHold===undefined || isHold))
                            {
                                //console.log("1",isHold,eachTime,eachData._id);
                                /*Previously Medication in Hold in status. No history for is made today that means marked isHold=true*/ 
                                dynamicStatusEachObj.action="H";
                                dynamicStatus.push(dynamicStatusEachObj);
                                executed=true;
                                isHold=true;
                            }
                            else{
                                if(isHold===undefined)
                                    isHold=false;
                                if(!checkFirstResumeOccure){
                                    temp.medication_histories.filter(function(x,index){
                                        if(resumeLocation===undefined && x.action=="R")
                                            resumeLocation=index;
                                        if(holdLocation===undefined && x.action=="R")
                                            holdLocation=index;
                                    });
                                }
                                if(resumeLocation === undefined && holdLocation === undefined && isHold)
                                {
                                    //console.log("2",isHold,eachTime,eachData._id);
                                    /*Previously Medication in Hold in status. No resume/hold is made today that means marked isHold=true*/ 
                                    dynamicStatusEachObj.action="H";
                                    dynamicStatus.push(dynamicStatusEachObj);
                                    executed=true;
                                    isHold=true;
                                }
                                else if((resumeLocation!==undefined && holdLocation===undefined) || (resumeLocation===undefined && holdLocation!==undefined) || (resumeLocation!==undefined && holdLocation!==undefined)){
                                    /*Any of Hold and Resume Location not undefined*/ 
                                    if(resumeLocation!==undefined){
                                        if(!resumeLocation){
                                            /*If 1st history is resume that means previous all slot will be hold*/
                                            isHold=true;
                                            checkFirstResumeOccure=true;
                                            resumeLocation=99;
                                        }
                                    }
                                    
                                    if(temp.medication_histories.length && temp.medication_histories[historyIndex]!==undefined)
                                    {
                                        var medicationTime=new Date(moment(currentDate).format("YYYY/MM/DD")+" "+eachTime+" "+GMT_TIMEZONE).getTime();
                                        var historyTime=new Date(moment(currentDate).format("YYYY/MM/DD")+" "+temp.medication_histories[historyIndex].actual_medication_time+" "+GMT_TIMEZONE).getTime();
                                        if(isHold && medicationTime<historyTime)
                                        {
                                            //console.log("4",isHold,eachTime,eachData._id);
                                            /*If got any is previous history hold the current slot will be hold*/
                                            dynamicStatusEachObj.action="H";
                                            dynamicStatus.push(dynamicStatusEachObj);
                                            isHold=true;
                                            executed=true;
                                        }
                                        else if(medicationTime == historyTime){
                                            /*If got any history hold immediatly keep it that next slots will be hold*/
                                            isHold=false;
                                            if(temp.medication_histories[historyIndex].action=="H"){
                                                isHold=true;
                                            }
                                            historyIndex++;
                                            //console.log("5",isHold,eachTime,eachData._id);
                                        }
                                        else if(isHold && medicationTime>=historyTime){
                                            //console.log("6",isHold,eachTime,eachData._id);
                                            /*If previous time slot is in hold that means after hold slot all will be hold*/
                                            dynamicStatusEachObj.action="H";
                                            dynamicStatus.push(dynamicStatusEachObj);
                                            isHold=true;
                                            executed=true;
                                        }
                                        else{
                                            //console.log("7",isHold,eachTime,eachData._id);
                                        }
                                    }
                                    else if(temp.medication_histories[historyIndex]===undefined && isHold)
                                    {
                                        //console.log("1",isHold,eachTime,eachData._id);
                                        dynamicStatusEachObj.action="H";
                                        dynamicStatus.push(dynamicStatusEachObj);
                                        isHold=true;
                                        executed=true;
                                    }
                                }
                            }
                            if(!executed){
                                /*If Due section not executed and which status is not under hold*/ 
                                if(temp.medication_histories.find(x => x.actual_medication_time == eachTime) === undefined){
                                    /*30mins before of Medication slot time.. It's "SCHEDULEd" Slot*/  
                                    if((slotTime-1800000)<=currentDateTime && slotTime>currentDateTime){
                                        dynamicStatusEachObj.action="SCHEDULED";
                                        dynamicStatus.push(dynamicStatusEachObj);
                                    }
                                    else
                                    {
                                        var dueDurationHrs=parseInt(((medicationTimes[temp.Frequency_HIS_ID].NextDoseIntervalHrs)/2)*3600000);
                                        /*this is single slot of a day, then after current time pass over stot time it will show "DUE"*/ 
                                        if(temp.medication_times.length == 1 && slotTime<currentDateTime && !prnMedication){
                                            console.log("1");
                                            dynamicStatusEachObj.action="DUE";
                                            dynamicStatus.push(dynamicStatusEachObj);
                                        }
                                        else if(temp.medication_times.length > 1 && (slotTime<=currentDateTime && (slotTime+dueDurationHrs)>currentDateTime) && !prnMedication){
                                            /*medication having muliple slot of a day, then calculating difference between two slot. If current time passed over slot time + half of diff time then mark "DUE"*/ 
                                            dynamicStatusEachObj.action="DUE";
                                            dynamicStatus.push(dynamicStatusEachObj);
                                        }
                                        else if(temp.medication_times.length > 1 && ((slotTime+dueDurationHrs)<currentDateTime) && !prnMedication){
                                            /*If current time greater of slot + diference time that mean it is "MISSED"*/ 
                                            
                                            /*tart date is today ie the ordering date and time and will be seen due immediately and will be due until 4hrs .. as per ekta mam #11154*/ 
                                            //console.log((new Date(moment(parseInt(temp.date)).format('YYYY/MM/DD HH:mm:ss')+" "+GMT_TIMEZONE).getTime()+4*3600000),slotTime);
                                            //console.log(moment((new Date(moment(parseInt(temp.date)).format('YYYY/MM/DD HH:mm:ss')+" "+GMT_TIMEZONE).getTime()+4*3600000)).format("YYYY/MM/DD HH:mm"),moment(slotTime).format("YYYY/MM/DD HH:mm"));
                                            if((new Date(moment(parseInt(temp.date)).format('YYYY/MM/DD HH:mm:ss')+" "+GMT_TIMEZONE).getTime()+4*3600000) > slotTime){
                                                dynamicStatusEachObj.action="M";
                                                dynamicStatus.push(dynamicStatusEachObj);
                                            }
                                            else
                                            {
                                                dynamicStatusEachObj.action="DUE";
                                                dynamicStatus.push(dynamicStatusEachObj);
                                            }
                                        }
                                        else{
                                            /*If current time less than of slot time means "UPCOMING"*/ 
                                            if(!prnMedication)
                                            {
                                                dynamicStatusEachObj.action="UPCOMING";
                                                dynamicStatus.push(dynamicStatusEachObj);
                                            }
                                            else
                                            {
                                                dynamicStatusEachObj.action="SCHEDULED";
                                                dynamicStatus.push(dynamicStatusEachObj);
                                            }
                                        }
                                    }
                                }
                            }
                            callback_each1();
                        },function(){
                            /*Concat with saved history data set*/ 
                            temp.medication_histories=temp.medication_histories.concat(dynamicStatus);
                            temp.history_date=moment(currentDate).format("YYYY/MM/DD");
                            /*Sort it by time*/ 
                            temp.medication_histories.sort(function(a,b) {return (a.actual_medication_time > b.actual_medication_time) ? 1 : ((b.actual_medication_time > a.actual_medication_time) ? -1 : 0);} ); 
                            delete temp._id;
                            delete temp.Molecule_HIS_ID;
                            delete temp.Route_HIS_ID;
                            if(returnData[eachData.patientId]===undefined)
                                returnData[eachData.patientId]=[];
                            returnData[eachData.patientId].push(temp);
                            callback_each();
                        });
                    });
                },function(){
                   return res.json(Utility.output("Executed",'SUCCESS',returnData));
                });
            });
        });
    };
    this.getReport = function(req,res,next){
        var thisObj=this;
        var GMT_TIMEZONE=EMR_CONFIG.GMT_TIMEZONE;
        var TEXT_TIMEZONE=EMR_CONFIG.TEXT_TIMEZONE;
        if(req.body.timezone){
            if(req.body.timezone.indexOf('/')!=-1){
                GMT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?utc2gmt[req.body.timezone]:EMR_CONFIG.GMT_TIMEZONE;
                TEXT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.TEXT_TIMEZONE;
            }
            else{
                TEXT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?gmt2utc[req.body.timezone]:EMR_CONFIG.TEXT_TIMEZONE;
                GMT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.GMT_TIMEZONE;
            }
        }
        var fromDate = new Date(req.query.from_date+" 00:00:00 "+GMT_TIMEZONE);
        var toDate = new Date(req.query.to_date+" 00:00:00 "+GMT_TIMEZONE);
        if(isNaN(fromDate))
            return res.json(Utility.output("Invalid From Date[*] must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(isNaN(toDate))
            return res.json(Utility.output("Invalid To Date[*] must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(!req.query.action)
            return res.json(Utility.output('Action is required', 'VALIDATION_ERROR'));
        var collectedResult=[];
        var returnArray={};
        var dateArray=[];
        for(var i=fromDate.getTime();i<=toDate.getTime();i+=86400000){
            dateArray.push(i);
        }
        async.eachSeries(dateArray, function iteratee(eachDate, callback_inner) {
            var headers = {
                'x-access-token': req.headers['x-access-token'],
                'Content-Type': 'application/json'
            }
            var endPointURL=Utility.localBaseURL();
            var options = {
                'url': endPointURL + '/mar/history/medication/get',
                'method': 'POST',
                'headers': headers,
                'body': {
                    patientIds:[Utility.escape(req.query.patientId)],
                    date:moment(eachDate).format("YYYY/MM/DD"),
                    timezone:TEXT_TIMEZONE,
                },
                'json':true
            };
            request(options, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    if (body._status_Code !== 200)
                        return res.json(Utility.output(body._error_message, 'ERROR'));
                    var result=body.result;
                    if(Utility.sizeOfObject(result)){
                        collectedResult=collectedResult.concat(result[Utility.escape(req.query.patientId)]);
                    }
                }
                else
                    return res.json(Utility.output("Unable to get medication history", 'ERROR'));
                callback_inner();
            });
        },function(){
            //return res.json(collectedResult);
            async.eachSeries(collectedResult, function (eachMedication, callback_inner1) {
                delete eachMedication.medication_times;
                switch(req.query.action)
                {
                    case "M":
                        eachMedication.medication_histories=eachMedication.medication_histories.filter(x => x.action=="M");
                        break;
                    case "G":
                        eachMedication.medication_histories=eachMedication.medication_histories.filter(x => x.action=="G");
                        break;
                    case "AD":
                        eachMedication.medication_histories=eachMedication.medication_histories.filter(x => x.action=="AD");
                        break;
                    case "UPCOMING":
                        eachMedication.medication_histories=eachMedication.medication_histories.filter(x => x.action=="UPCOMING");
                        break;
                    default:
                        break;
                }
                if(eachMedication.medication_histories.length){
                    if(returnArray[eachMedication.drug_name]===undefined)
                        returnArray[eachMedication.drug_name]={
                            medication_id:eachMedication.medication_id,
                            drug_name:eachMedication.drug_name,
                            route: eachMedication.route,
                            schedule: eachMedication.schedule,
                            Dosage: eachMedication.Dosage,
                            dosage: eachMedication.dosage,
                            dosage_unit:eachMedication.dosage_unit,
                            start_date:moment(eachMedication.startDate).format("YYYY/MM/DD"),
                            drugGenericName: eachMedication.drugGenericName,
                            histories_dates:{},
                            ADR_histories:(eachMedication.ADR_histories.length)?eachMedication.ADR_histories:null
                        };
                    if(returnArray[eachMedication.drug_name]['histories_dates'][eachMedication.history_date]===undefined)
                        returnArray[eachMedication.drug_name]['histories_dates'][eachMedication.history_date]=[];
                    returnArray[eachMedication.drug_name]['histories_dates'][eachMedication.history_date]=eachMedication.medication_histories;
                }
                callback_inner1();
            },function(){
                return res.json(Utility.output("Executed","SUCCESS",returnArray));
            });
        });
    }; 
    this.addEditHistory = function(req,res,next){
        var GMT_TIMEZONE=EMR_CONFIG.GMT_TIMEZONE;
        var TEXT_TIMEZONE=EMR_CONFIG.TEXT_TIMEZONE;
        if(req.body.timezone){
            if(req.body.timezone.indexOf('/')!=-1){
                GMT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?utc2gmt[req.body.timezone]:EMR_CONFIG.GMT_TIMEZONE;
                TEXT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.TEXT_TIMEZONE;
            }
            else{
                TEXT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?gmt2utc[req.body.timezone]:EMR_CONFIG.TEXT_TIMEZONE;
                GMT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.GMT_TIMEZONE;
            }
        }
        var thisObj=this;
        var currentDate=new Date(moment().format("YYYY/MM/DD HH:mm:ss")+" "+GMT_TIMEZONE);
        var historyDate = new Date(req.body.history_date+" 00:00:00 "+GMT_TIMEZONE);
        var medicationStatus={};
        var medicationDetails={};
        var administrationUser={};
        var verficationUser={};
        var actualMedicationTime=Utility.escape(req.body.actual_medication_time);
        var registeredMedicationTime=moment(currentDate).tz(TEXT_TIMEZONE).format("HH:mm:ss");
        currentDate=currentDate.getTime();
        if(isNaN(historyDate))
            return res.json(Utility.output("Invalid History Date[*] must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(!req.body.medical_reconciliation)
            if(!req.body.actual_medication_time)
                return res.json(Utility.output('Actual medication time is required', 'VALIDATION_ERROR'));
        if(!req.body.medical_reconciliation)
            if(!req.body.registered_medication_time)
                return res.json(Utility.output('Register medication time is required', 'VALIDATION_ERROR'));
        if(!req.body.medication_id)
            return res.json(Utility.output('Medication ID is required', 'VALIDATION_ERROR'));
        if(!req.body.action)
            return res.json(Utility.output('Action is required', 'VALIDATION_ERROR'));
        if(!req.body.administration_sign)
            return res.json(Utility.output('Administration Sign is required', 'VALIDATION_ERROR'));
        if(req.body.history_id)
            if(Utility.checkObjectIdValidation(!req.body.history_id))
                return res.json(Utility.output('Invalid MAR History ID', 'VALIDATION_ERROR'));
        if(!req.body.medical_reconciliation)
            if(!actualMedicationTime)
                return res.json(Utility.output('Invalid actual medication time', 'VALIDATION_ERROR'));
        if(!req.body.medical_reconciliation)
            if(!registeredMedicationTime)
                return res.json(Utility.output('Invalid register medication time', 'VALIDATION_ERROR'));
        async.parallel([
            function(callback_parallel){
                MasterModel.M_MedicationStatus.find({
                    Status:1
                },function(err,existMedicationStatus){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!existMedicationStatus)
                        return res.json(Utility.output('No medication action has found in DB', 'ERROR'));
                    async.eachSeries(existMedicationStatus, function iteratee(eachStatus, callback_each) {
                        medicationStatus[eachStatus.alias]=eachStatus.display_name;
                        callback_each();
                    },function(){
                        if(medicationStatus[Utility.escape(req.body.action).toUpperCase()]===undefined)
                            return res.json(Utility.output("Invalid action", 'VALIDATION_ERROR'));
                        callback_parallel();
                    });
                });
            },
            function(callback_parallel){
                DomainModel.Medication.findOne({_id:req.body.medication_id},function(err,existMedicationStatus){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!existMedicationStatus)
                        return res.json(Utility.output('Selected drug is not found', 'ERROR'));
                    medicationDetails=existMedicationStatus;
                
                    var headers = {
                        'x-access-token': req.headers['x-access-token'],
                        'Content-Type': 'application/json'
                    }
                    var endPointURL=Utility.localBaseURL();
                    
                    var options = {
                        'url': endPointURL + '/mar/history/medication/get',
                        'method': 'POST',
                        'headers': headers,
                        'body': {
                            patientIds:[existMedicationStatus.patientId],
                            date:thisObj.getFormatedDate(historyDate),
                            medication_id:existMedicationStatus._id,
                            timezone:TEXT_TIMEZONE,
                        },
                        'json':true
                    };

                    request(options, function(error, response, body) {
                        if (!error && response.statusCode === 200) {
                            if (body._status_Code !== 200)
                                return res.json(Utility.output(body._error_message, 'ERROR'));
                            var result=body.result;
                            if(result[existMedicationStatus.patientId]===undefined)
                                return res.json(Utility.output("Medication times not found", 'ERROR'));
                            if(result[existMedicationStatus.patientId][0].medication_times.indexOf(actualMedicationTime)===-1)
                                return res.json(Utility.output("Entered actual medication time", 'ERROR'));
                        }
                        else
                            return res.json(Utility.output("Unable to get medication history", 'ERROR'));
                        callback_parallel();
                    });
                });
            },
            function(callback_parallel){
                if(!req.body.history_id)
                {
                    DomainModel.User.findOne({signCode:Utility.escape(req.body.administration_sign)},function(err,userExist){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        if(!userExist)
                            return res.json(Utility.output('Sorry!!Invalid Administration User Sign', 'ERROR'));
                        administrationUser=userExist;
                        DomainModel.medication_histories.findOne({history_date:historyDate.getTime(),actual_medication_time:actualMedicationTime,medication_id:req.body.medication_id},function(err,historyExist){
                            if(err)
                                return res.json(Utility.output(err, 'ERROR'));
                            //console.log("History Exist",historyExist,historyDate.getTime(),actualMedicationTime);
                            if(historyExist)
                                req.body.history_id=historyExist._id;
                            callback_parallel();
                        });
                    });
                }
                else{
                    callback_parallel();
                }
            },
            function(callback_parallel){
                if(req.body.verification_sign)
                {
                    DomainModel.User.findOne({signCode:Utility.escape(req.body.verification_sign)},function(err,userExist){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        if(!userExist)
                            return res.json(Utility.output('Sorry!!Invalid Verification User Sign', 'ERROR'));
                        verficationUser=userExist;
                        callback_parallel();
                    });
                }
                else
                   callback_parallel(); 
            }
        ],function(){
            if(req.body.history_id)
            {
                DomainModel.medication_histories.findOne({_id:req.body.history_id},function(err,historyExist){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!historyExist)
                        return res.json(Utility.output("Selected MAR history not found", 'ERROR'));
                    var verifiedAction=null;
                    if(verficationUser.userId!==undefined)
                        if(req.body.action=="AD")
                            verifiedAction="VERIFIED";
                    DomainModel.medication_histories.update({_id:historyExist._id},{
                        medication_id: Utility.escape(req.body.medication_id),
                        actual_medication_time: actualMedicationTime,
                        registered_medication_time: registeredMedicationTime,
                        reason: Utility.escape(req.body.reason),
                        action: (verifiedAction)?verifiedAction:Utility.escape(req.body.action),
                        reset:(req.body.new_time && (verficationUser.userId!==undefined))?true:false,
                        new_time:(req.body.new_time && (verficationUser.userId!==undefined))?Utility.escape(req.body.new_time):null,
                        verification_user_id: (verficationUser.userId!==undefined)?verficationUser.userId:null,
                        comment: Utility.escape(req.body.comment),
                        updated_by:req.decoded.userId,
                        date_of_modification:currentDate,
                        history_date:historyDate.getTime()
                    },function(err,noOfUpdate){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR'));
                        thisObj.updateMedicationStatus(req.body.action,medicationDetails);
                        req.body.patientIds=[medicationDetails.patientId];
                        req.body.medication_id="";
                        thisObj.getMedications(req,res,next);
                    });
                });
            }
            else
            {
                var verifiedAction=null;
                if(verficationUser.userId!==undefined)
                    if(req.body.action=="AD")
                        verifiedAction="VERIFIED";
                new DomainModel.medication_histories({
                    medication_id: Utility.escape(req.body.medication_id),
                    actual_medication_time: actualMedicationTime,
                    registered_medication_time: registeredMedicationTime,
                    reason: Utility.escape(req.body.reason),
                    action: (verifiedAction)?verifiedAction:Utility.escape(req.body.action),
                    reset:(req.body.new_time && (verficationUser.userId!==undefined))?true:false,
                    new_time:(req.body.new_time && (verficationUser.userId!==undefined))?Utility.escape(req.body.new_time):null,
                    administration_user_id : administrationUser.userId,
                    verification_user_id: (verficationUser.userId!==undefined)?verficationUser.userId:null,
                    comment: Utility.escape(req.body.comment),
                    history_date:historyDate.getTime(),
                    updated_by:req.decoded.userId,
                    date_of_creation:currentDate,
                    date_of_modification:currentDate
                }).save(function(err,newHistory){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    thisObj.updateMedicationStatus(req.body.action,medicationDetails);
                    req.body.patientIds=[medicationDetails.patientId];
                    req.body.medication_id="";
                    thisObj.getMedications(req,res,next);
                });
            }
        });
    };
    this.updateMedicationStatus=function(action,medicationDetails){
        switch(action.toUpperCase()){
            case 'H':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"hold"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status in Hold");
                });
                break;
            case 'R':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"active"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status in Resumed");
                });
                break;
            case 'RE':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"removed"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status to Removed");
                });
                break;
            case 'S':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"stopped"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status to Stopped");
                });
                break;
            case 'C':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"completed"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status is Completed");
                });
                break;
            case 'D':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"discontinued"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status");
                });
                break;
            case 'DCHRG':
                DomainModel.Medication.update({_id:medicationDetails._id},{$set:{status:"discharge_medication"}},function(err,noOfUpdate){
                    console.log("Updated Medication Status to Discharged Medication");
                });
                break;
        }
    };
    this.addEditADRHistory = function(req,res,next){
        if(req.body.timezone){
            if(req.body.timezone.indexOf('/')!=-1){
                var GMT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?utc2gmt[req.body.timezone]:EMR_CONFIG.GMT_TIMEZONE;
                var TEXT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.TEXT_TIMEZONE;
            }
            else{
                var TEXT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?gmt2utc[req.body.timezone]:EMR_CONFIG.TEXT_TIMEZONE;
                var GMT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?req.body.timezone:EMR_CONFIG.GMT_TIMEZONE;
            }
        }
        if(req.body.timezone){
            if(req.body.timezone.indexOf('/')!=-1)
                GMT_TIMEZONE=(utc2gmt[req.body.timezone]!==undefined)?utc2gmt[req.body.timezone]:GMT_TIMEZONE;
            else
                TEXT_TIMEZONE=(gmt2utc[req.body.timezone]!==undefined)?gmt2utc[req.body.timezone]:GMT_TIMEZONE;
        }
        if(!req.body.medication_id)
            return res.json(Utility.output('Medication ID is required', 'VALIDATION_ERROR'));
        if(!req.body.sign)
            return res.json(Utility.output('Sign is required', 'VALIDATION_ERROR'));
        if(!req.body.comment)
            return res.json(Utility.output('Comment is required', 'VALIDATION_ERROR'));
        if(req.body.adr_history_id)
            if(Utility.checkObjectIdValidation(!req.body.adr_history_id))
                return res.json(Utility.output('Invalid ADR History ID', 'VALIDATION_ERROR'));
        
        DomainModel.User.findOne({userId:req.decoded.userId,signCode:Utility.escape(req.body.sign)},function(err,userExist){
            if(err)
                return res.json(Utility.output(err, 'ERROR')); 
            if(!userExist)
                return res.json(Utility.output('Sorry!! Sign doesn\'t match with your account', 'ERROR')); 
            
            DomainModel.Medication.findOne({_id:Utility.escape(req.body.medication_id)},function(err,medicationExist){
                var currentDate=new Date().getTime();
                if(err)
                   return res.json(Utility.output(err, 'ERROR')); 
                if(!medicationExist)
                    return res.json(Utility.output("Selected drug not found", 'ERROR')); 
                if(req.body.adr_history_id)
                {
                    DomainModel.medication_adr_histories.findOne({_id:req.body.adr_history_id},function(err,existingHistory){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR')); 
                        if(!existingHistory)
                            return res.json(Utility.output('Selected history not found', 'ERROR')); 
                        DomainModel.medication_adr_histories.update({_id:existingHistory._id},{
                            medication_id:Utility.escape(req.body.medication_id),
                            signed_by:userExist.userId,
                            comment:Utility.escape(req.body.comment),
                            date_of_modification:currentDate
                        },function(err,noOfUpdate){
                            return res.json(Utility.output("ADR History of drug "+medicationExist.drugName+" is updated", 'SUCCESS',{
                                adr_history_id:req.body.adr_history_id,
                                medication_id:Utility.escape(req.body.medication_id),
                                signed_by:userExist.userId,
                                comment:Utility.escape(req.body.comment),
                                date_of_modification:currentDate
                            })); 
                        });
                    });
                }
                else
                {
                    new DomainModel.medication_adr_histories({
                        medication_id:Utility.escape(req.body.medication_id),
                        signed_by:userExist.userId,
                        comment:Utility.escape(req.body.comment),
                        date_of_modification:currentDate
                    }).save(function(err,newADRHistory){
                        if(err)
                            return res.json(Utility.output(err, 'ERROR')); 
                        newADRHistory=Utility.mongoObjectToNormalObject(newADRHistory);
                        newADRHistory.adr_history_id=newADRHistory._id;
                        delete newADRHistory._id;
                        return res.json(Utility.output("ADR History of drug "+medicationExist.drugName+" is saved", 'SUCCESS',newADRHistory)); 
                    });
                }
            });
        });
    };
    this.getFormatedDate=function(milisecond){
        return moment(milisecond).format("YYYY/MM/DD");
    };
    this.createProperTimeFormat=function(time){
        var exploded=time.split(":");
        var returnData="";
        var hrs="";
        var min="";
        var sec="";
        if(exploded[0]!==undefined){
            hrs=exploded[0];
            if(exploded[0].length==1)
                hrs="0"+exploded[0];
        }
        if(exploded[1]!==undefined){
            min=exploded[1];
            if(exploded[1].length==1)
                min="0"+exploded[1];
        }
        if(exploded[2]!==undefined){
            sec=exploded[2];
            if(exploded[2].length==1)
                sec="0"+exploded[2];
        }
        if(hrs && min)
        {
            returnData=hrs+":"+min;
            /*
            if(sec)
                returnData+=":"+sec;
            else
                returnData+=":00";*/
        }
        return returnData;
    };
};