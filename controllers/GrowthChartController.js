var fs = require("fs");
var document = require('../models/db_model');
var DomainModel = document.domainModel;
var async = require('async');
module.exports = function GrowthChartController() {
    this.getGraphData = function(req,res,next){
        var chartRecords=[];
        var patientDetails={};
        var key1="";
        var key2="";
        if(!req.query.patientId)
            return res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(req.query.patientId);
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    patientDetails=patient;
                    var headers = {
                        'x-access-token': req.headers['x-access-token'],
                        'Content-Type': 'application/json'
                    }
                    var endPointURL=Utility.localBaseURL();
                    var options = {
                        'url': endPointURL + '/ehr/patients/'+patientId+'/getvitals',
                        'method': 'GET',
                        'headers': headers,
                        'form': {}
                    };

                    request(options, function(error, response, body) {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body);
                            body.result=body.result.sort( function ( a, b ) { return b.date - a.date; } )
                            var ageMap={};
                            async.eachSeries(body.result, function iteratee(eachVital, callback_each) {
                                if(eachVital.vitalName.toLowerCase()=="height" || eachVital.vitalName.toLowerCase()=="weight" || eachVital.vitalName.toLowerCase()=="head circumference"){
                                    var ageSet=Utility.calculateAgeByReference(patientDetails.dob,eachVital.date);
                                    var age=ageSet.years*12;
                                    if(ageSet.months)
                                    {
                                        age+=ageSet.months;
                                    }
                                    if(ageMap[age]===undefined)
                                    {
                                        ageMap[age]={
                                            'Age':age,
                                            'Weight':'',
                                            'Length':'',
                                            'Head Circumference':'',
                                        };
                                    }
                                    if(eachVital.vitalName.toLowerCase()=="weight"){
                                        if(!ageMap[age].Weight)
                                            ageMap[age].Weight=eachVital.vitalValue;
                                    }
                                    if(eachVital.vitalName.toLowerCase()=="height"){
                                        if(!ageMap[age].Length)
                                            ageMap[age].Length=eachVital.vitalValue;
                                    }
                                    if(eachVital.vitalName.toLowerCase()=="head circumference"){
                                        if(!ageMap[age]['Head Circumference'])
                                            ageMap[age]['Head Circumference']=eachVital.vitalValue;
                                    }
                                }
                                callback_each();
                            },function(){
                                async.eachSeries(ageMap, function iteratee(eachVital, callback_each) {
                                    chartRecords.push(eachVital);
                                    callback_each();
                                },function(){
                                    callback_parallel();
                                });
                            });
                        }
                        else{
                            callback_parallel();
                            return res.json(Utility.output("Unable to get vital records", 'ERROR'));
                        }
                    });
                });
            },
            function(callback_parallel){
                /*
                DomainModel.growth_charts.find({patientId:patientId}).sort({Age:1}).exec(function(err,records){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    chartRecords=records;
                    callback_parallel();
                });*/
                callback_parallel();
            }
        ],function(){
            var lines=["P3","P5","P10","P25","P50","P75","P85","P90","P95","P97"];
            var unit={
                "Weight":"(kg)",
                "Length":"(cm)",
                "Head Circumference":"(cm)",
                "Age":"(months)"
            };
            var gender=1;
            if(patientDetails.gender!=="MALE")
                gender=2;
            var returnObj={};
            try{
                var key=Utility.escape(req.query.key);
                if(!key)
                    return res.json(Utility.output("Key is required","VALIDATION_ERROR"));
                var growthChatJSON=JSON.parse(fs.readFileSync(APP_ROOT_PATH+'/growth_chart_json_data/'+key+'.json'));
                async.eachSeries(growthChatJSON, function iteratee(eachData, callback_each) {
                    if(eachData.Sex!=gender)
                        return callback_each();
                    async.forEach(lines, function iteratee(eachLine, callback_each_inner) { 
                        switch(key){
                            case "m_growth_weight_length":
                                key1="Weight";key2="Length";
                                break;
                            case "m_growth_head_age":
                                key1="Age"; key2="Head Circumference";
                                break;
                            case "m_growth_length_age":
                                key1="Age"; key2="Length";
                                break;
                            case "m_growth_weight_age":
                                key1="Age"; key2="Weight";
                                break;
                        }
                        if(eachData[eachLine]!==undefined){
                            if(returnObj[eachLine]===undefined){
                                returnObj[eachLine]={
                                    label:eachLine,
                                    type:"line",
                                    coordinates:[]
                                };
                                if(eachLine=="P3")
                                {
                                    var lowerX=(key1!=="Age")?parseInt(eachData.Length-1):parseInt(eachData.Agemos-1);
                                    if(lowerX<=0)
                                        lowerX=0;
                                    var lowerY=parseInt(eachData[eachLine]-1);
                                    if(lowerY<=0)
                                        lowerY=0;
                                    returnObj["x_axis"]={
                                        name:(key1!=="Age")?key2:key1,
                                        range:{
                                            lower:lowerX,
                                            upper:-99
                                        },
                                        unit:(key1!=="Age")?unit[key2]:unit[key1],
                                    };
                                    returnObj["y_axis"]={
                                        name:(key1!=="Age")?key1:key2,
                                        range:{
                                            lower:lowerY,
                                            upper:-99
                                        },
                                        unit:(key1!=="Age")?unit[key1]:unit[key2]
                                    };
                                    if(key2==="Weight")
                                    {
                                        returnObj["y_axis"].range.lower=parseInt(returnObj["y_axis"].range.lower*0.453592);
                                    }
                                }
                            }
                            var temp={};
                            temp[key1]=(key1!=="Age")?eachData.Length:eachData.Agemos;
                            temp[key2]=eachData[eachLine];
                            if(temp[key1]>returnObj["x_axis"].range.upper)
                                returnObj["x_axis"].range.upper=parseInt(temp[key1]+1);
                            if(temp[key2]>returnObj["y_axis"].range.upper)
                                returnObj["y_axis"].range.upper=parseInt(temp[key2]+1);
                            if(key1=="Weight" && key2=="Length")
                            {
                                temp[key1]=eachData[eachLine]*0.453592;
                                temp[key2]=eachData.Length;
                                returnObj["y_axis"].range.upper=parseInt(temp[key1]+1);
                            }
                            else if(key1=="Weight" && key2!="Length")
                            {
                                temp[key1]=temp[key1]*0.453592;
                                returnObj["x_axis"].range.upper=parseInt(temp[key1]+1);
                            }
                            else if(key2==="Weight")
                            {
                                temp[key2]=temp[key2]*0.453592;
                                returnObj["y_axis"].range.upper=parseInt(temp[key2]+1);
                            }
                            
                            returnObj[eachLine].coordinates.push(temp);
                        }
                        return callback_each_inner();
                    },function(){
                        callback_each();
                    });
                },function(){
                    returnObj.patient_records={
                        label:patientDetails.name,
                        type:"point",
                        coordinates:[]
                    };
                    async.eachSeries(chartRecords, function iteratee(eachData, callback_each) {
                        if(eachData[key1]=== undefined || eachData[key2]=== undefined)
                            return callback_each();
                        if((eachData[key1]=="" || eachData[key2]=="")&&eachData[key1]!=0)
                            return callback_each();
                        var temp={};
                        temp[key1]=eachData[key1];
                        temp[key2]=eachData[key2];
                        returnObj.patient_records.coordinates.push(temp);
                        callback_each();    
                    },function(){
                        return res.json(Utility.output("Fetched","SUCCESS",returnObj));
                    });
                });
            }
            catch(e){
                console.log("Error",e);
                return res.json(Utility.output("Growth Chart Data not found","ERROR"));
            }
        });
    };
    this.addEditRecord=function(req,res,next){
        var thisObj=this;
        var currentDate=new Date().getTime();
        var dateTop = new Date(req.body.date+"");
        if(isNaN(dateTop))
            return res.json(Utility.output("Invalid Date[*] must be in (yyyy/mm/dd) format","VALIDATION_ERROR"));
        if(req.body.Age==="")
            return res.json(Utility.output("Age is required","VALIDATION_ERROR"));
        if(typeof req.body.Age !== 'number'){
            return res.json(Utility.output("Age(months) must be a number","VALIDATION_ERROR"));
        }
        if(req.body.Length)
            if(typeof req.body.Length !== 'number'){
                return res.json(Utility.output("Length(cm) must be a number","VALIDATION_ERROR"));
            }
        if(req.body.Weight)
            if(typeof req.body.Weight !== 'number'){
                return res.json(Utility.output("Weight(kg) must be a number","VALIDATION_ERROR"));
            }
        if(req.body["Head Circumference"])
            if(typeof req.body["Head Circumference"] !== 'number'){
                return res.json(Utility.output("Head Circumference(cm) must be a number","VALIDATION_ERROR"));
            }
        if(!req.body.signCode)
            return res.json(Utility.output("Sign Code is required","VALIDATION_ERROR"));
        if(!req.body.patientId)
            return res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(req.body.patientId);
        var growthChartRecord={};
        async.parallel([
            function(callback_parallel){
                DomainModel.User.findOne({userId:req.decoded.userId,signCode:Utility.escape(req.body.signCode)},function(err,user){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!user)
                        return res.json(Utility.output("Invalid Sign Code", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    callback_parallel();
                });
            },
            function(callback_parallel){
                if(!req.body.record_id)
                    return callback_parallel();
                if(!Utility.checkObjectIdValidation(req.body.record_id))
                    return res.json(Utility.output("Invalid record ID", 'ERROR'));
                DomainModel.growth_charts.findOne({_id:req.body.record_id,patientId:patientId,userId:req.decoded.userId},function(err,existRecord){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!existRecord)
                        return res.json(Utility.output("Your selected record not found", 'ERROR'));
                    growthChartRecord=existRecord;
                    callback_parallel();
                });
            }
        ],function(){
            if(Utility.sizeOfObject(Utility.mongoObjectToNormalObject(growthChartRecord))){
                growthChartRecord.date=dateTop.getTime();
                growthChartRecord.Age=req.body.Age;
                growthChartRecord.Weight=req.body.Weight;
                growthChartRecord.Length=req.body.Length;
                growthChartRecord["Head Circumference"]=req.body["Head Circumference"];
                growthChartRecord.patientId=patientId;
                growthChartRecord.userId=req.decoded.userId;
                growthChartRecord.comment=Utility.escape(req.body.comment);
                growthChartRecord.date_of_modification=currentDate;
                growthChartRecord.save(function(err){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    thisObj.call_api(req,res,next);    
                });
            }
            else
            {
                growthChartRecord.date=dateTop.getTime();
                growthChartRecord.Age=req.body.Age;
                growthChartRecord.Weight=req.body.Weight;
                growthChartRecord.Length=req.body.Length;
                growthChartRecord["Head Circumference"]=req.body["Head Circumference"];
                growthChartRecord.patientId=patientId;
                growthChartRecord.userId=req.decoded.userId;
                growthChartRecord.comment=Utility.escape(req.body.comment);
                growthChartRecord.date_of_modification=currentDate;
                growthChartRecord.date_of_creation=currentDate;
                new DomainModel.growth_charts(growthChartRecord).save(function(err){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    thisObj.call_api(req,res,next);    
                });
            }
        });
    };
    this.getRecords=function(req,res,next){
        var patientDetails={};
        if(!req.query.patientId)
            return res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(req.query.patientId);
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    patientDetails=patient;
                    callback_parallel();
                });
            }
        ],function(){
            var returnObj={
                patient:patientDetails,
                records:[]
            };
            DomainModel.growth_charts.find({patientId:patientId}).sort({Age:1}).exec(function(err,records){
                if(err)
                    return res.json(Utility.output(err, 'ERROR'));
                returnObj.records=records;
                return res.json(Utility.output(returnObj.records.length+" record(s) found","SUCCESS",returnObj));
            });
        });
    };
    this.deleteRecords=function(req,res,next){
        var thisObj=this;
        var patientDetails={};
        if(!req.body.patientId)
            return res.json(Utility.output("Patient ID is required","VALIDATION_ERROR"));
        var patientId=Utility.escape(req.body.patientId);
        if(!req.body.record_id)
            return res.json(Utility.output("Record ID is required","VALIDATION_ERROR"));
        async.parallel([
            function(callback_parallel){
                DomainModel.Patient.findOne({_id:patientId},function(err,patient){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!patient)
                        return res.json(Utility.output("Patient not found", 'ERROR'));
                    patientDetails=patient;
                    callback_parallel();
                });
            },
            function(callback_parallel){
                if(!req.body.record_id)
                    return callback_parallel();
                if(!Utility.checkObjectIdValidation(req.body.record_id))
                    return res.json(Utility.output("Invalid record ID", 'ERROR'));
                DomainModel.growth_charts.findOne({_id:req.body.record_id,patientId:patientId,userId:req.decoded.userId},function(err,existRecord){
                    if(err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!existRecord)
                        return res.json(Utility.output("Your selected record not found", 'ERROR'));
                    callback_parallel();
                });
            }
        ],function(){
            DomainModel.growth_charts.remove({_id:req.body.record_id,patientId:patientId,userId:req.decoded.userId},function(err){
                if(err)
                    return res.json(Utility.output(err, 'ERROR'));
                thisObj.call_api(req,res,next,"Deleted");    
            });
        });
    };
    this.call_api=function(req,res,next,action){
        var headers = {
            'x-access-token': req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var endPointURL=Utility.baseURL();
        var options = {
            'url': endPointURL + '/growth_chart/patient/records/get?patientId='+req.body.patientId,
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                body._success_message="Record Saved";
                if(action=="Deleted")
                    body._success_message="Record Deleted";
                return res.json(body);
            }
            else
                return res.json(Utility.output("Unable to get ncp record", 'ERROR'));
        });
    };
};