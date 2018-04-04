var document = require('../models/db_model');
var MasterModel = document.mastersModel;
var UserModel = document.userManagementModel;
var domainModel = DomainModel = document.domainModel;
var uuid = require('node-uuid');
var async = require('async');
var util = require('util');
var request = require('request');
module.exports.createIcdPreferredList = function (req, res) {
    var data = req.body;
    data.userId = req.decoded.userId;
    var groups = _.groupBy(data.payload, 'GroupName');
    let resultItems = [];
    // async.eachOf(groups, function (value, key, callback) {
    //     for (let i = 0; i < value.length; i++) {
    //         if (!util.isNullOrUndefined(key) && (value[i].IsGroup || !util.isNullOrUndefined(value[i].groupId))) {
    //             if (groupId[key] == undefined) {
    //                 value[i].GroupId = uuid.v4();
    //                 groupId[key] = value[i].GroupId;
    //             } else {
    //                 value[i].GroupId = groupId[key];
    //             }
    //         } else if (!value[i].IsGroup) {
    //             value[i].IsGroup = false;
    //             value[i].GroupName = null;
    //             value[i].GroupId = null;
    //         }
    //         value[i].Index = i + 1;
    //         var prefIcdItem = domainModel.prefIcdItem(value[i]);
    //         // this line is here for performance and asynchronos nature of nodeJS                    
    //         resultItems.push(prefIcdItem);
    //         prefIcdItem.validate(function (err) {
    //             if (err) {
    //                 callback(err);
    //             } else {
    //                 if (i + 1 == value.length) {
    //                     callback();
    //                 }
    //             }
    //         })

    //     }
    // }, 


    groupLookup(groups, function (err, result) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else {
            var newPrefList = new domainModel.prefIcdList();
            newPrefList.UserId = data.userId;
            newPrefList.IsProblem = data.IsProblem;
            newPrefList.Items = result.resultItems;
            newPrefList.Groups = result.resultGroups;
            newPrefList.ListName = data.ListName;
            newPrefList.Index = data.Index;
            newPrefList._id = uuid.v4();
            newPrefList.created_at = Date.now();
            newPrefList.created_by = req.decoded.userId;
            newPrefList.updated_by = req.decoded.userId;
            newPrefList.updated_at = Date.now();
            newPrefList.save(function (err, result) {
                if (err) {
                    document.sendResponse('server error', 501, 'error', err, res);
                } else {
                    document.sendResponse('success', 200, 'done', result, res);
                }
            })
        }

    });
};
var groupLookup = function (groups, cb) {
    var result = {}
    result.resultItems = [];
    result.resultGroups = [];
    var groupId = {};
    async.eachOf(groups, function (value, key, callback) {
        for (let i = 0; i < value.length; i++) {
            if (!util.isNullOrUndefined(key) && (value[i].IsGroup && util.isNullOrUndefined(value[i].GroupId))) {
                if (groupId[key] == undefined) {
                    value[i].GroupId = uuid.v4();
                    groupId[key] = value[i].GroupId;
                    result.resultGroups.push({ 'GroupId': value[i].GroupId, 'GroupName': value[i].GroupName })
                } else {
                    value[i].GroupId = groupId[key];
                }

            } else if (!value[i].IsGroup) {
                value[i].IsGroup = false;
                value[i].GroupName = null;
                value[i].GroupId = null;
            }
            value[i].Index = i + 1;
            var prefIcdItem = domainModel.prefIcdItem(value[i]);
            // this line is here for performance and asynchronos nature of nodeJS                    
            result.resultItems.push(prefIcdItem);
            prefIcdItem.validate(function (err) {
                if (err) {
                    callback(err);
                } else {
                    if (i + 1 == value.length) {
                        callback();
                    }
                }
            })
        }
    }, function (err) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    })
};
module.exports.updateIcdPrefferedList = function (req, res) {
    var data = req.body;
    domainModel.prefIcdList.findOne({ _id: req.params.listId, UserId: req.decoded.userId }, function (err, doc) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else if (doc) {
            var groups = _.groupBy(data.payload, 'GroupName');
            groupLookup(groups, function (err, result) {
                if (err) {
                    document.sendResponse('server error', 501, 'error', err, res);
                } else {
                    doc.Items = _.concat(JSON.parse(JSON.stringify(doc.Items)), result.resultItems);
                    doc.Groups = _.concat(JSON.parse(JSON.stringify(doc.Groups)), result.resultGroups);
                    doc.updated_at = Date.now();
                    doc.updated_by = req.decoded.userId;
                    doc.save(function (err) {
                        if (err) {
                            document.sendResponse('server error', 501, 'error', err, res);
                        } else {
                            document.sendResponse('success', 200, 'done', {}, res);
                        }
                    })
                }
            })
        }
    })
};
module.exports.IcdPreferredList = function (userId, isProblem, res) {
    domainModel.prefIcdList.find({ UserId: userId, IsProblem: isProblem }, 'ListName UserId  Index IsProblem', function (err, docs) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else {
            document.sendResponse('success', 200, 'done', docs, res);
        }
    })
};
module.exports.IcdPreferredListDetails = function (listId, userId, res) {
    domainModel.prefIcdList.findOne({ _id: listId, UserId: userId }, function (err, docs) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else if (docs) {
            document.sendResponse('success', 200, 'done', docs, res);
        } else {
            document.sendResponse('records not found', 404, 'done', null, res);
        }
    })
};
module.exports.removeIcdCode = function (listId, userId, code, res) {
    domainModel.prefIcdList.findOne({ _id: listId, UserId: userId }, function (err, doc) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else if (doc) {
            var index = _.findIndex(doc.Items, { 'IcdCode': code });
            if (index > -1) {
                doc.Items.splice(index, 1);
                doc.save(function (err) {
                    if (err) {
                        document.sendResponse('server error', 501, 'error', err, res);
                    } else {
                        document.sendResponse('success', 200, 'done', {}, res);
                    }
                })
            } else {
                document.sendResponse('No IcdCode in the list', 404, 'done', {}, res);
            }
        } else {
            document.sendResponse('list not found', 404, 'done', {}, res);
        }
    })
};
module.exports.removeIcdGroup = function (listId, userId, group, res) {
    domainModel.prefIcdList.findOne({ _id: listId, UserId: userId }, function (err, doc) {
        if (err) {
            document.sendResponse('server error', 501, 'error', err, res);
        } else if (doc) {
            doc.Items = _.remove(doc.Items, item => {
                return item.GroupId != group
            });
            doc.Groups = _.remove(doc.Items, item => {
                return item.GroupId != group
            });
            doc.save(function (err) {
                if (err) {
                    document.sendResponse('server error', 501, 'error', err, res);
                } else {
                    document.sendResponse('success', 200, 'done', {}, res);
                }
            })
        } else {
            document.sendResponse('list not found', 404, 'done', {}, res);
        }
    })
};
module.exports.ICDPreferredController = function() {
    this.getListDetails=function(req,res,next){
        var othersQuery={};
        var query={
            userId:req.decoded.userId
        };
        if(req.query.isProblem){
            query.isProblem=Utility.escape(req.query.isProblem);
        }
        if(req.query.list_type=="others")
        {
            query={
                userId:{$ne:req.decoded.userId}
            };
            othersQuery={
                "$match": {"user_preferred":{"$nin":[req.decoded.userId]}}
            };
        }
        var groupQuery={
            "$match": query
        };
        if(req.query.list_id){
            if(!Utility.checkObjectIdValidation(req.query.list_id)){
                return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
            }
            query._id=ObjectID(req.query.list_id+"");
        }
        if(req.query.group_id && req.query.list_id){
            if(!Utility.checkObjectIdValidation(req.query.group_id)){
                return res.json(Utility.output("Invalid Group ID","VALIDATION_ERROR"));
            }
            groupQuery={ 
                "$redact": {
                "$cond": {
                    "if": { 
                            "$eq": [ "$user_preferred_icd_groups._id", ObjectID(req.query.group_id+"")] },
                            "then": "$$KEEP",
                            "else": "$$PRUNE"
                    }
                }
            };
        }
        if(!Utility.sizeOfObject(othersQuery)){
            othersQuery={
                "$match": query
            };
        }
        DomainModel.user_preferred_icd_list.aggregate([
            othersQuery,
            {
                "$match": query
            },
            {
                $lookup:
                {
                    from: "user_preferred_icd_groups",
                    localField: "_user_preferred_icd_groups",
                    foreignField: "_id",
                    as: "user_preferred_icd_groups"
                }
            },
            { $unwind: { path: "$user_preferred_icd_groups", preserveNullAndEmptyArrays: true } },
            groupQuery,
            { 
                "$group": { 
                    "_id": "$_id",
                    "list_id":{"$first":"$_id"},
                    "list_name":{"$first":"$list_name"},
                    "icd":{"$first":"$icd"},
                    "userId":{"$first":"$userId"},
                    "isProblem":{"$first":"$isProblem"},
                    "isFavorite":{"$first":"$isFavorite"},
                    "_parent_list":{"$first":"$_parent_list"},
                    "user_preferred_icd_groups": { 
                        "$push": "$user_preferred_icd_groups"
                    }
                }
            },
            { 
                "$project": { 
                    "list_id":"$_id",
                    "list_name":"$list_name",
                    "icd":"$icd",
                    "userId":"$userId",
                    "isProblem":"$isProblem",
                    "isFavorite":"$isFavorite",
                    "_parent_list":"$_parent_list",
                    "have_group":{$size: "$user_preferred_icd_groups"},
                    "group": { 
                        "$map": { 
                            "input": "$user_preferred_icd_groups", 
                            "as": "userPreferredGroup", 
                            "in": { 
                                "group_id": "$$userPreferredGroup._id",
                                "group_name":"$$userPreferredGroup.group_name",
                                "icd":"$$userPreferredGroup.icd"
                            } 
                        } 
                    }
                }
            },
            { 
                "$project": { 
                    "list_id":"$_id",
                    "list_name":"$list_name",
                    "icd":"$icd",
                    "userId":"$userId",
                    "isProblem":"$isProblem",
                    "isFavorite":"$isFavorite",
                    "_parent_list":"$_parent_list",
                    "isEditable":{
                        $cond: { if: { $ifNull: [ "$_parent_list", false ] }, then: false, else: true }
                    },
                    "have_group":{
                        $cond: { if: { $gt: [ "$have_group", 0 ] }, then: true, else: false }
                    },
                    "group": "$group"
                }
            }
        ],function(err,result){
            if(err)
                return res.json(Utility.output(err,"ERROR"));
            if(req.query.list_id){
                if(result.length)
                {
                    result=result[0];
                }
                return res.json(Utility.output("Successfully Executed","SUCCESS",result));
            }
            else
            {
                return res.json(Utility.output(result.length+" list(s) found","SUCCESS",result)); 
            }
        });
    };
    this.removePreferredListGroup=function(req,res,next){
        var currentTime=new Date().getTime();
        var groupDetails={};
        var groupId=req.body.group_id;
        var listId=req.body.list_id;
        if(!groupId)
            return res.json(Utility.output("Invalid Group ID","VALIDATION_ERROR"));
        if(!listId)
            return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
        if(listId){
            if(!Utility.checkObjectIdValidation(listId)){
                return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
            }
        }
        if(groupId){
            if(!Utility.checkObjectIdValidation(groupId)){
                return res.json(Utility.output("Invalid Group ID","VALIDATION_ERROR"));
            }
        }
        async.parallel([
            function (callback_parallel) {
                DomainModel.user_preferred_icd_groups.findOne({_id:groupId},function(err,groupInfo){
                    if(err)
                        return res.json(Utility.output(err,"ERROR"));
                    if(!Utility.sizeOfObject(groupInfo))
                        return res.json(Utility.output("Group is not found","ERROR"));
                    groupDetails=groupInfo;
                    callback_parallel()
                });
            }
        ],function(){
            DomainModel.user_preferred_icd_list.findOne({_id:listId},function(err,listDetails){
                if(err)
                    return res.json(Utility.output(err,"ERROR"));
                if(!Utility.sizeOfObject(listDetails))
                    return res.json(Utility.output("List is not found","ERROR"));
                if(listDetails.userId!=req.decoded.userId)
                    return res.json(Utility.output("You don't have permission to delete other preffered list's group","ERROR"));
                if(listDetails._user_preferred_icd_groups.indexOf(ObjectID(groupId))==-1)
                    return res.json(Utility.output("Group has not found in selected list","ERROR"));
                DomainModel.user_preferred_icd_list.findOne({_user_preferred_icd_groups:{$in:[ObjectID(groupId)]},userId:{$ne:req.decoded.userId}},function(err,noOwnListDetails){
                    if(err)
                        return res.json(Utility.output(err,"ERROR"));  
                    if(Utility.sizeOfObject(noOwnListDetails)){
                        var updateRequestObj=Utility.mongoObjectToNormalObject(listDetails);
                        updateRequestObj.date_of_modification=currentTime;
                        var index=updateRequestObj._user_preferred_icd_groups.indexOf(groupId);
                        if(index!=-1)
                            updateRequestObj._user_preferred_icd_groups.splice(index, 1);
                        DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateRequestObj},function(err,noOfUpdate){
                            if(err)
                                return res.json(Utility.output(err,"ERROR")); 
                            return res.json(Utility.output("'"+groupDetails.group_name+"'"+" Group is removed","SUCCESS"));
                        });
                    }
                    else
                    {
                        DomainModel.user_preferred_icd_groups.remove({_id:groupId},function(err,noOfUpdate){
                            if(err)
                                return res.json(Utility.output(err,"ERROR")); 
                            var updateRequestObj=Utility.mongoObjectToNormalObject(listDetails);
                            updateRequestObj.date_of_modification=currentTime;
                            var index=updateRequestObj._user_preferred_icd_groups.indexOf(groupId);
                            if(index!=-1)
                                updateRequestObj._user_preferred_icd_groups.splice(index, 1);
                            DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateRequestObj},function(err,noOfUpdate){
                                if(err)
                                    return res.json(Utility.output(err,"ERROR")); 
                                return res.json(Utility.output("'"+groupDetails.group_name+"'"+" Group is removed","SUCCESS"));
                            });
                        });
                    }
                });
            });
        });
    };
    this.removePreferredList=function(req,res,next){
        var listId=req.body.list_id;
        if(!listId)
            return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
        if(listId){
            if(!Utility.checkObjectIdValidation(listId)){
                return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
            }
        }
        DomainModel.user_preferred_icd_list.findOne({_id:listId},function(err,listDetails){
            if(err)
                return res.json(Utility.output(err,"ERROR"));
            if(!Utility.sizeOfObject(listDetails))
                return res.json(Utility.output("List is not found","ERROR"));
            if(listDetails.userId!=req.decoded.userId)
                return res.json(Utility.output("You don't have permission to delete other preffered list's group","ERROR"));
            DomainModel.user_preferred_icd_list.remove({_id:listId},function(err,noOfUpdate){
                if(err)
                    return res.json(Utility.output(err,"ERROR"));
                DomainModel.user_preferred_icd_list.update({_parent_list:listId},{$set:{_parent_list:null}},{multi:true},function(err,noOfUpdate){
                    if(err)
                        return res.json(Utility.output(err,"ERROR"));
                    return res.json(Utility.output("'"+listDetails.list_name+"'"+" List is removed","SUCCESS"));
                });
            });
        });
    };
    this.addEditICDPreferredList=function(req,res,next){
        var thisObj=this;
        var currentTime=new Date().getTime();
        var updateListObj={};
        var updategroupObj={};
        var listId=req.body.list_id || null;
        var groupId=req.body.group_id || null;
        if(listId){
            if(!Utility.checkObjectIdValidation(listId)){
                return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
            }
        }
        if(groupId){
            if(!Utility.checkObjectIdValidation(groupId)){
                return res.json(Utility.output("Invalid Group ID","VALIDATION_ERROR"));
            }
        }
        /*****************Update List***************/
        if(listId){
            DomainModel.user_preferred_icd_list.findOne({_id:listId,userId:req.decoded.userId},function(err,exist){
                if(err)
                    return res.json(Utility.output(err,'ERROR'));
                if(!exist)
                    return res.json(Utility.output("List not found",'ERROR'));
                updateListObj=Utility.mongoObjectToNormalObject(exist);
                updateListObj.list_name=(req.body.list_name)?Utility.escape(req.body.list_name):"Untitled";
                updateListObj.date_of_modification=currentTime;
                if(groupId){
                    /*****************Update ICD into Existing Group***********/
                    if(updateListObj._user_preferred_icd_groups.indexOf(groupId)===-1){   
                        updateListObj._user_preferred_icd_groups.push(groupId);
                    }
                    DomainModel.user_preferred_icd_groups.findOne({_id:groupId},function(err,exist){
                        if(err)
                            return res.json(Utility.output(err,'ERROR'));
                        if(!exist)
                            return res.json(Utility.output("Group not found",'ERROR'));
                        updategroupObj=Utility.mongoObjectToNormalObject(exist);
                        updategroupObj.group_name=(req.body.group_name)?Utility.escape(req.body.group_name):"Untitled";
                        updategroupObj.date_of_modification=currentTime;
                        updategroupObj.icd=req.body.icd;
                        DomainModel.user_preferred_icd_groups.update({_id:groupId},{$set:updategroupObj},function(err,noOfUpdate){
                            if(err)
                                return res.json(Utility.output(err,'ERROR'));
                            console.log("Preferred Group Updated",noOfUpdate);
                        });
                    });
                    DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateListObj},function(err,noOfUpdate){
                        console.log("Preferred List Updated",noOfUpdate);
                        req.query.list_id=listId;
                        thisObj.getListDetails(req,res,next);
                    });
                }
                else{
                    if(updateListObj._user_preferred_icd_groups.length)
                    {
                        /*****************Add ICDs into New Group of a Existing List***********/
                        var groupName=(req.body.group_name)?Utility.escape(req.body.group_name):"Untitled";
                        async.parallel([
                            function (callback_main_parallel) {
                                DomainModel.user_preferred_icd_list.aggregate([
                                    {
                                        "$match": {"_id":listId,userId:req.decoded.userId}
                                    },
                                    {
                                        $lookup:
                                        {
                                            from: "user_preferred_icd_groups",
                                            localField: "_user_preferred_icd_groups",
                                            foreignField: "_id",
                                            as: "user_preferred_icd_groups"
                                        }
                                    },
                                    { $unwind: { path: "$user_preferred_icd_groups", preserveNullAndEmptyArrays: true } },
                                    {
                                        "$match": {"user_preferred_icd_groups.group_name":new RegExp(groupName,"i")}
                                    },
                                ],function(err,groupExist){
                                    if(err)
                                        return res.json(Utility.output(err,'ERROR'));
                                    if(groupExist.length)
                                        return res.json(Utility.output("'"+groupName+"' group is aleady in your list of '"+updateListObj.list_name+"'. Please choose other group name",'ERROR'));
                                    callback_main_parallel();
                                });
                            }
                        ],function(){
                            updategroupObj={
                                group_name:(req.body.group_name)?Utility.escape(req.body.group_name):"Untitled",
                                icd:req.body.icd,
                                date_of_creation:currentTime,
                                date_of_modification:currentTime
                            };
                            new DomainModel.user_preferred_icd_groups(updategroupObj).save(function(err,newGroup){
                                if(err)
                                    return res.json(Utility.output(err,'ERROR'));
                                if(updateListObj._user_preferred_icd_groups.indexOf(newGroup._id)===-1){   
                                    updateListObj._user_preferred_icd_groups.push(newGroup._id);
                                }
                                DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateListObj},function(err,noOfUpdate){
                                    if(err)
                                        return res.json(Utility.output(err,'ERROR'));
                                    console.log("Preferred List Updated",noOfUpdate);
                                    req.query.list_id=listId;
                                    thisObj.getListDetails(req,res,next);
                                });
                            });
                        });
                    }
                    else{
                        /*****************Add ICDs direct in Existing List***********/
                        updateListObj.icd=req.body.icd;
                        DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateListObj},function(err,noOfUpdate){
                            if(err)
                                return res.json(Utility.output(err,'ERROR'));
                            console.log("Preferred List Updated",noOfUpdate);
                            req.query.list_id=listId;
                            thisObj.getListDetails(req,res,next);
                        });
                    }
                }
            });
        }
        else
        {
            var listName=(req.body.list_name)?Utility.escape(req.body.list_name).trim():"Untitled";
            async.parallel([
                function (callback_main_parallel) {
                    DomainModel.user_preferred_icd_list.findOne({list_name:new RegExp(listName,"i"),userId:req.decoded.userId},function(err,exist){
                        if(err)
                            return res.json(Utility.output(err,'ERROR'));
                        if(exist)
                            return res.json(Utility.output(listName+" is aleady in your preferred list. Please choose other list name",'ERROR'));
                        callback_main_parallel();
                    });
                }
            ],function(){
                /*****************Create List***************/
                var groupId=null;
                updateListObj={
                    list_name:listName,
                    isProblem:(req.body.isProblem==true || req.body.isProblem=="true")?true:false,
                    userId:req.decoded.userId,
                    isFavorite:true,
                    _user_preferred_icd_groups:[],
                    date_of_creation:currentTime,
                    date_of_modification:currentTime
                };
                async.parallel([
                    function (callback_parallel) {
                        if(req.body.have_group)
                        {
                            /*************Add new group*********/
                            updategroupObj={
                                group_name:(req.body.group_name)?Utility.escape(req.body.group_name):"Untitled",
                                icd:req.body.icd,
                                date_of_creation:currentTime,
                                date_of_modification:currentTime
                            };
                            new DomainModel.user_preferred_icd_groups(updategroupObj).save(function(err,newGroup){
                                if(err)
                                    return res.json(Utility.output(err,'ERROR'));
                                updateListObj._user_preferred_icd_groups.push(newGroup._id);
                                groupId=newGroup._id;
                                callback_parallel();
                            });
                        }
                        else
                        {
                            /***********Add ICD in new List*********/
                            updateListObj.icd=req.body.icd;
                            callback_parallel();
                        }
                    }
                ],function(){
                    new DomainModel.user_preferred_icd_list(updateListObj).save(function(err,newList){
                        if(err){
                            DomainModel.user_preferred_icd_groups.remove({_id:groupId},function(err,noOfDelete){
                                console.log("Rollback group save due to saving error of list");
                            });
                            return res.json(Utility.output(err,'ERROR'));
                        }
                        req.query.list_id=newList._id;
                        thisObj.getListDetails(req,res,next);
                    });
                });
            });
        }
    };
    this.copyOrMarkList=function(req,res,next){
        var currentTime=new Date().getTime();
        var listId=req.body.list_id;
        if(!listId)
            return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
        if(listId){
            if(!Utility.checkObjectIdValidation(listId)){
                return res.json(Utility.output("Invalid List ID","VALIDATION_ERROR"));
            }
        }
        DomainModel.user_preferred_icd_list.findOne({_id:listId},function(err,listDetails){
            if(err)
                return res.json(Utility.output(err,"ERROR"));
            if(!Utility.sizeOfObject(listDetails))
                return res.json(Utility.output("List is not found","ERROR"));
            if(listDetails.userId!=req.decoded.userId){
                var cloneList={
                    list_name:listDetails.list_name,
                    _user_preferred_icd_groups:listDetails._user_preferred_icd_groups,
                    userId:req.decoded.userId,
                    icd:listDetails.icd,
                    isProblem:listDetails.isProblem,
                    isFavorite:true,
                    user_preferred:[],  
                    _parent_list:listDetails._id,    
                    date_of_creation:currentTime,
                    date_of_modification:currentTime
                };
                new DomainModel.user_preferred_icd_list(cloneList).save(function(err,nextList){
                    if(err)
                        return res.json(Utility.output(err,"ERROR"));
                    var updateExistingList=Utility.mongoObjectToNormalObject(listDetails);
                    if(updateExistingList.user_preferred===undefined)
                        updateExistingList.user_preferred=[];
                    updateExistingList.user_preferred.push(req.decoded.userId);
                    DomainModel.user_preferred_icd_list.update({_id:listId},{$set:updateExistingList},function(err,noOfUpdate){
                        if(err)
                            return res.json(Utility.output(err,"ERROR"));
                        return res.json(Utility.output(listDetails.list_name+" saved into your preference","SUCCESS"));
                    });
                });
            }
            else{
                if(listDetails.isFavorite===undefined)
                    listDetails.isFavorite=true;
                else
                {
                    if(listDetails.isFavorite)
                        listDetails.isFavorite=false;
                    else
                        listDetails.isFavorite=true;
                }
                listDetails.date_of_modification=currentTime;
                DomainModel.user_preferred_icd_list.update({_id:listId},{$set:listDetails},function(err,noOfUpdate){
                    if(err)
                       return res.json(Utility.output(err,"ERROR")); 
                    return res.json(Utility.output(listDetails.list_name+" Updated","SUCCESS"));
                });
            }
        });
    };
};
module.exports.QuickLinkController = function() {
    this.getQuickLinks = function (req, res, next) {
        var resultObj = [];
        var headers = {
            'x-access-token': req.headers['x-access-token'],
            'Content-Type': 'application/json'
        }
        var options = {
            'url': Utility.localBaseURL() + '/ehr/api/access/assignedPermissionToUser?userId='+req.decoded.userId,
            'method': 'GET',
            'headers': headers,
            'form': {}
        };

        request(options, function(error, response, body) {
            if(error)
                return res.json(Utility.output("Failed to get permission list", 'ERROR'));
            if (!error && response.statusCode === 200) {
                try{
                    data = JSON.parse(body);
                }
                catch(e){
                    return res.json(Utility.output("Unable to parse permission", 'ERROR'));
                }
            }
            data.result = data.result.sort(function (a, b) {
                return a.index > b.index;
            });
            masterLinks = data.result;
            async.eachSeries(masterLinks, function iteratee(eachMasterLink, callback_each) {
                if(eachMasterLink.type!="quickLinks")
                    return callback_each();
                if(eachMasterLink.permissions.R || eachMasterLink.permissions.W ){}else{
                    return callback_each();
                }

                var temp = Utility.mongoObjectToNormalObject(eachMasterLink);
                temp.is_enable=true;
                UserModel.user_quick_links.findOne({_resources: eachMasterLink._id, _user: req.decoded.userId}, function (err, userLink) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (userLink){
                        temp.index=(userLink.index!==undefined)?userLink.index:eachMasterLink.index;
                        temp.is_enable = userLink.is_enable;
                    }
                    resultObj.push(temp);
                    callback_each();
                });
            }, function () {
                return res.json(Utility.output(resultObj.length + " Quick link(s) found", 'SUCCESS', resultObj));
            });
        });
    };
    this.updateQuickLinks = function (req, res, next) {
        var thisObj=this;
        req.assert('key', 'Quick link Key').notEmpty();
        req.assert('is_enable', 'Quick link is enable (true/false)').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'VALIDATION_ERROR'));
        }
        
        MasterModel.Resource.findOne({key:Utility.escape(req.body.key)}, function (err, masterLink) {
            if(err)
                return res.json(Utility.output(err, 'ERROR'));
            if(!masterLink)
                return res.json(Utility.output('Sorry!! Resource is not available', 'ERROR'));
            
            UserModel.user_quick_links.findOne({_resources: masterLink._id, _user: req.decoded.userId}, function (err, userLink) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                async.parallel([
                    function (callback_parallel) {
                        if (userLink) {
                            if (req.body.is_enable === false || req.body.is_enable === true || req.body.is_enable === "false" || req.body.is_enable === "true")
                            {
                                if (req.body.is_enable.is_enable === "false")
                                    userLink.is_enable = false;
                                else if (req.body.is_enable.is_enable === "true")
                                    userLink.is_enable = true;
                                else {
                                    userLink.is_enable = req.body.is_enable;
                                }
                                userLink.save(function () {
                                    callback_parallel();
                                });
                            }
                        } else {
                            var newLink = new UserModel.user_quick_links({
                                _resources: masterLink._id,
                                _user:req.decoded.userId,
                                index:masterLink.index,
                                is_enable: true
                            });
                            if (req.body.is_enable == false || req.body.is_enable == true || req.body.is_enable == "false" || req.body.is_enable == "true")
                            {
                                if (req.body.is_enable.is_enable == "false")
                                    newLink.is_enable = false;
                                else if (req.body.is_enable.is_enable == "true")
                                    newLink.is_enable = true;
                                else {
                                    newLink.is_enable = (req.body.is_enable)?true:false;
                                }
                                newLink.save(function () {
                                    callback_parallel();
                                });
                            }
                            else
                                callback_parallel();
                        }
                    }
                ],function(){
                    var headers = {
                        'x-access-token': req.headers['x-access-token'],
                        'Content-Type': 'application/json'
                    }
                    var options = {
                        'url': Utility.localBaseURL() + '/settings/quick_link/get',
                        'method': 'GET',
                        'headers': headers,
                        'form': {}
                    };
                    request(options, function(error, response, body) {
                        if(error)
                            return res.json(Utility.output("Failed to get quick links list", 'ERROR'));
                        if (!error && response.statusCode === 200) {
                            try{
                                data = JSON.parse(body);
                            }
                            catch(e){
                                return res.json(Utility.output("Unable to parse permission", 'ERROR'));
                            }
                        }
                        var enableDisableText=null;
                        if (req.body.is_enable == false || req.body.is_enable == true || req.body.is_enable == "false" || req.body.is_enable == "true")
                        {
                            if (req.body.is_enable.is_enable == "false")
                                enableDisableText = "Disabled";
                            else if (req.body.is_enable.is_enable == "true")
                                enableDisableText = "Enabled";
                            else {
                                enableDisableText=(req.body.is_enable)?"Enabled":"Disabled";
                            }
                        }
                        return res.json(Utility.output('"'+masterLink.displayName+'" is now '+enableDisableText,"SUCCESS",data.result));
                    });
                    //thisObj.getQuickLinks(req,res,next);
                });
            });
        });
    };
};
