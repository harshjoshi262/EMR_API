var async = require('async');
var NodeRSA = require('node-rsa');
var MailboxController = new require(APP_ROOT_PATH+'/controllers/MailboxController');
var MailboxControllerInstance = new MailboxController();
var document = require(APP_ROOT_PATH+'/models/db_model');
var DomainModel = document.domainModel;
var jwt = require('jsonwebtoken');
module.exports = function ChatController() {
    
    /**
     * <h1>[API] Get Users List [GET]</h1>
     * <p>This api for get users list, with pagination and search keyword</p>
     * <p>Recent Chat user will be come first after that others user will be come next.
     *“non_recent_record” and “recent_record”  value will be require for get next page user list. You will get this value from response of api call. Just put these values on next api call.
     * </p>
     * @see API_BASE_URL+chat/users/list</a>
     * @param {String} keyword [Optional]
     * @param {Number} recent_records [Optional]
     * @param {Number} non_recent_records [Optional]
     * @param {String} mobile [Optional]
     * <h2>Headers</h2>
     * <p>Content-Type: application/json</p>
     * <p>x-access-token: login token</p>
     * {@code {
     *          "_error_message": "none",
     *          "_success_message": "5 record(s) has been found",
     *          "_status_Code": 200,
     *          "_status": "done",
     *          "result": {
     *          "total_unread_messages": 4,        
     *          "recent_records": 3,
     *          "non_recent_records": 2,
     *          "per_page_record": 5,
     *          "lists": [{
     *              "room_id": "597ef125a4d53e35e443a1ff",
     *               "userId": "50a36180-525b-40ff-b95e-3fac7d364ff4",
     *               "name": "singh ruchir",
     *               "email": "r.uchirsingh60@gmail.com",
     *               "userType": "doctor",
     *               "userImg": "",
     *               "user_status": "OFFLINE",
     *               "unread_message_count": 2,
     *               "room_type": "INDIVIDUAL”
     *           },
     *           {
     *               "room_id": "62ef125a4d53e35e443a1ff",
     *               "userId": "747e9630-1099-403a-99a3-6138f2388134",
     *               "name": "Mohsin Ali",
     *               "email": "mohsinali@sdglobaltech.com",
     *               "userType": "doctor",
     *               "userImg": "",
     *               "user_status": "OFFLINE",
     *               "unread_message_count": 1,
     *               "room_type": "INDIVIDUAL”
     *           }]
     *   }       
     */
    this.get_list = function (req, res, next) {
        var alreadyListed = [];
        var status = CONSTANT.USER_STATUS;
        var perPage = CONSTANT.max_record_per_page;
        var thisObj = this;
        var keyword = "";
        if (!req.body.page)
            req.body.page = 0;
        if (!req.query.keyword)
            keyword = Utility.escape(req.query.keyword);
        var recentRecord = Math.max(0, req.query.recent_records) || 0;
        var nonRecentRecord = Math.max(0, req.query.non_recent_records) || 0;
        var result = {
            'total_unread_messages':0,
            'recent_records': recentRecord,
            'non_recent_records': nonRecentRecord,
            'per_page_record': perPage,
            'lists': []
        };
        async.parallel([
            function (callback_main) {
                DomainModel.rooms.aggregate([
                    /*
                     {
                     $lookup:
                     {
                     from: "groups",
                     localField: "_group",
                     foreignField: "_id",
                     as: "groups"
                     }
                     },
                     */
                    {
                        $lookup:
                        {
                            from: "User",
                            localField: "_members",
                            foreignField: "userId",
                            as: "members"
                        }
                    },
                    //{$unwind: {path: "$groups", preserveNullAndEmptyArrays: true}},
                    {
                        $project: {
                            "_id": "$_id",
                            "_group": "$_groups",
                            "_members": "$members",
                            "date_of_modification": "$date_of_modification"
                        }
                    },
                    {"$sort": {date_of_modification: -1}},
                    {"$match": {
                            $or: [
                                {_group: {$exists: true}, "_group._members": {$in: [req.decoded.userId]}},
                                {
                                    _members: {$exists: true},
                                    "_members.userStatus": "active",
                                    "_members.userId": {$in: [req.decoded.userId]},
                                    $or: [
                                        {"_members.firstName": new RegExp(keyword, 'i')},
                                        {"_members.lastName": new RegExp(keyword, 'i')},
                                        {"_members.userType": new RegExp(keyword, 'i')}
                                    ],
                                },
                            ]
                        }
                    },
                    {"$skip": recentRecord},
                    {"$limit": perPage}
                ], function (err, rooms) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!rooms.length)
                        result.recent_records = 0;
                    async.eachSeries(rooms, function iteratee(roomDetails, callback_inner) {
                        var destination_id = null;
                        var is_group = false;
                        var friendObj = null;
                        var groupObj = null;
                        if (roomDetails._group)
                        {
                            if (roomDetails._group._members.map(function (e) {
                                return e.toString();
                            }).indexOf(req.decoded.userId)) {
                                destination_id = roomDetails._group._id;
                                groupObj = roomDetails._group;
                                is_group = true;
                            }
                        }
                        if (roomDetails._members.length)
                        {
                            if (roomDetails._members[0] !== undefined)
                            {
                                if (roomDetails._members[1] !== undefined && (roomDetails._members[0].userId === req.decoded.userId))
                                {
                                    destination_id = roomDetails._members[1].userId;
                                }
                            }
                            if (roomDetails._members[1] !== undefined)
                            {
                                if (roomDetails._members[0] !== undefined && (roomDetails._members[1].userId === req.decoded.userId))
                                {
                                    destination_id = roomDetails._members[0].userId;
                                }
                            }
                            DomainModel.User.findOne({userId: destination_id}, function (err, user) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                else {
                                    if (!user) {
                                        return callback_inner();
                                    } else
                                    {
                                        friendObj = user;
                                        alreadyListed.push(destination_id);
                                        var temp = {
                                            'room_id': roomDetails._id,
                                            'userId': destination_id,
                                            'name': (friendObj !== undefined) ? (friendObj.firstName || friendObj.lastName) ? friendObj.firstName + " " + friendObj.lastName : "Unnamed" : roomDetails._group.name,
                                            'email': (friendObj.email !== undefined) ? friendObj.email : null,
                                            'userType': (friendObj.userType) ? friendObj.userType : null,
                                            'userImg': (!is_group) ? (friendObj.userImg !== undefined) ? friendObj.userImg : null : ((groupObj.image) ? constants.group_image_public_link + groupObj.image : null),
                                            'user_status': (friendObj.is_login !== undefined)?(friendObj.is_login) ? status[friendObj.custom_status] : 'OFFLINE':'OFFLINE',
                                            'unread_message_count': 0,
                                            'room_type': (is_group) ? 'GROUP' : 'INDIVIDUAL',
                                        };
                                        thisObj.get_unread_message(roomDetails._id.toString(), friendObj.userId, function (data) {
                                            if (data._status_Code === 200)
                                            {
                                                temp['unread_message_count'] = data.result.length;
                                                result['total_unread_messages']+=data.result.length;
                                            }
                                            result.lists.push(temp);
                                            result.recent_records += 1;
                                            callback_inner();
                                        });
                                    }
                                }
                            });
                        }
                    }, function () {
                        if (result.lists.length === perPage)
                            callback_main();
                        else
                        {
                            DomainModel.User.aggregate([
                                {
                                    $project: {
                                        "userId": "$userId",
                                        "firstName": "$firstName",
                                        "lastName": "$lastName",
                                        "userType": "$userType",
                                        "email": "$email",
                                        "userImg": "$userImg",
                                        "is_login": "$is_login",
                                        "custom_status": "$custom_status"
                                    }
                                },
                                {
                                    "$match": {
                                        $or: [
                                            {"firstName": new RegExp(keyword, 'i')},
                                            {"lastName": new RegExp(keyword, 'i')},
                                            {"userType": new RegExp(keyword, 'i')}
                                        ],
                                        //userStatus:"active",
                                        userId: {
                                            $nin: alreadyListed,
                                            $ne: req.decoded.userId
                                        }
                                    }
                                },
                                {"$skip": nonRecentRecord},
                                {"$limit": (perPage-result.lists.length)}
                            ], function (err, users) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                if (!users.length)
                                    result.non_recent_records = 0;
                                async.eachSeries(users, function iteratee(eachUser, callback_inner) {
                                    var temp = {
                                        'room_id': null,
                                        'userId': eachUser.userId,
                                        'name': (eachUser.firstName || eachUser.lastName) ? eachUser.firstName + " " + eachUser.lastName : "Unnamed",
                                        'email': (eachUser.email) ? eachUser.email : null,
                                        'userType': (eachUser.userType) ? eachUser.userType : null,
                                        'userImg': (eachUser.userImg !== undefined) ? eachUser.userImg : null,
                                        'user_status': (eachUser.is_login !== undefined) ? status[eachUser.custom_status] : 'OFFLINE',
                                        'unread_message_count': 0,
                                        'room_type': 'INDIVIDUAL',
                                    };
                                    result.lists.push(temp);
                                    result.non_recent_records += 1;
                                    callback_inner();
                                }, function () {
                                    callback_main();
                                });
                            });
                        }
                    });
                });
            }
        ], function () {
            return res.json(Utility.output(result.lists.length + ' record(s) has been found', 'SUCCESS', result));
        });
    };
    
    
    /**
     * <h1>[API] Send Chat Message [POST]</h1>
     * <p>
     * Send chat message
     * </p>
     * @see API_BASE_URL+chat/send/message</a>
     * @param {String} destination_id [*Mandatory][Valid User ID]
     * @param {Boolean} is_group [Optional][Default: false]
     * @param {String} socket_id [*Mandatory] [Browser Socket ID]
     * @param {String} message_type [Optional][Default: TEXT]
     * @param {String} browser_message_id [*Mandatory][Any unique id like milisecond]
     * @param {String} message [*Mandatory]
     * @header Content-Type: application/json
     * @header x-access-token: login token
     * @code {
            "_error_message": "none",
            "_success_message": "Chat Message Sent",
            "_status_Code": 200,
            "_status": "done",
            "result": {
                "browser_message_id": "sdfsdfsdfs",
                "room_id": "685ef125a4d53e35e443a1ff",    
                "message_id": "597ef125a4d53e35e443a1ff",
                "message": "Hello World",
                "destination_id": "2f39a63f-815e-45f9-85a7-96af6900fb9c",
                "message_type": "TEXT",
                "is_group": false,
                "destination": {
                    "destination_id": "50a36180-525b-40ff-b95e-3fac7d364ff4",
                    "name": "singh ruchir",
                    "email": "r.uchirsingh60@gmail.com",
                    "userImg": null,
                    "userType": "doctor"
                },
                "sender": {
                    "sender_id": "7b6a2d7a-67c8-41db-94a2-98218dca024d",
                    "name": "Unnamed",
                    "email": null,
                    "userImg": null,
                    "userType": null
                },
                "date_of_creation": 1501491493236
            }
        }    
     */
    this.send_message = function (req, res, next) {
        if (Utility.IsNullOrEmpty(req.body.message_type)) {
            return res.json(Utility.output('Message Type is required', 'VALIDATION_ERROR'));
        }
        if (Utility.IsNullOrEmpty(req.body.browser_message_id)) {
            return res.json(Utility.output('Browser Message ID is required', 'VALIDATION_ERROR'));
        }
        if (req.body.message_type.toLowerCase() === "text" || req.body.message_type.toLowerCase() === "file") {
        } else {
            return res.json(Utility.output('Invalid message type', 'ERROR'));
        }
        if ((req.body.message_type.toLowerCase() === "file")) {
            if (Utility.IsNullOrEmpty(req.body.file_id)) {
                return res.json(Utility.output('File ID is required', 'VALIDATION_ERROR'));
            }
        }
        if(!req.body.message)
        {
            return res.json(Utility.output('Message is required', 'ERROR'));
        }
        if (!req.body.message) {
            req.body.message = "";
        }
        var thisObj=this;
        var socket=null;
        var room = null;
        var groupObj = null;
        var friendObj = null;
        var fileObj = null;
        var fileDownloadURL = null;
        var friend_id = (!req.body.is_group)?Utility.IsNullOrEmpty(req.body.destination_id) ? null : req.body.destination_id:null;
        var group_id = (req.body.is_group)?Utility.IsNullOrEmpty(req.body.destination_id) ? null : req.body.destination_id:null;
        var messageObj = null;
        if (!friend_id && !group_id) {
            return res.json(Utility.output('Friend or Group atleast one must be selected', 'ERROR'));
        }
        if (friend_id && group_id) {
            return res.json(Utility.output('Friend or Group any one information must be given', 'ERROR'));
        }
        if (friend_id === req.decoded.userId) {
            return res.json(Utility.output('Sorry!! You can\'t sent message yourself', 'ERROR'));
        }
        if (!req.body.socket_id) {
            return res.json(Utility.output('Socket ID is required', 'ERROR'));
        }
        
        async.waterfall([
            function (callback_waterfall) {
                DomainModel.User.findOne({userId:req.decoded.userId,sockets:{$in:[req.body.socket_id]}},function(err,user){
                    if (err) 
                        return res.json(Utility.output(err, 'ERROR'));
                    if(!user)
                        return res.json(Utility.output('Invalid Socket your ID', 'ERROR'));
                    if (!Utility.IsNullOrEmpty(io.sockets.adapter.sids[req.body.socket_id])) {
                        var mySocket = io.sockets.connected[req.body.socket_id];
                        socket=mySocket;
                    }
                    else
                        return res.json(Utility.output('Invalid Socket your ID', 'ERROR'));
                    
                    callback_waterfall();
                });
            },
            function (callback_waterfall) {
                if (group_id) {
                    DomainModel.group.findOne({_id: group_id}).populate('_members').exec(function (err, result) {
                        if (err) {
                            return res.json(Utility.output(err, 'ERROR'));
                        } else {
                            if (!result) {
                                return res.json(Utility.output('Group not found', 'ERROR'));
                            } else {
                                var memberExists = result._members.filter(function (e) {
                                    return e.id == req.decoded.userId;
                                });
                                if (memberExists.length) {
                                    groupObj = result;

                                    DomainModel.rooms.findOne({_group: result._id}, function (err, roomDetails) {
                                        if (!err && roomDetails) {
                                            room = roomDetails;
                                        }

                                        callback_waterfall(null, Utility.output('', 'SUCCESS'));
                                    });
                                } else {
                                    return res.json(Utility.output('You are not a group member', 'ERROR'));
                                }
                            }
                        }
                    });
                } else
                    callback_waterfall(null, Utility.output('', 'SUCCESS'));
            },
            function (received_previous, callback_waterfall) {
                if (received_previous.status == "error") {
                    callback_waterfall(null, received_previous);
                } else {
                    if (!room && friend_id) {
                        DomainModel.User.findOne({userId: friend_id}, function (err, friend) {
                            if (err) {
                                return res.json(Utility.output(err, 'ERROR'));
                            }
                            if (!friend) {
                                return res.json(Utility.output('User not found', 'ERROR'));
                            } else {
                                if (friend.userStatus != "active") {
                                    return res.json(Utility.output('Recipant user account has been inactive', 'ERROR'));
                                } else {
                                    friendObj = friend;
                                    DomainModel.rooms.findOne({_members: {$all: [friend.userId, req.decoded.userId]}}, function (err, roomDetails) {
                                        if (!err && roomDetails)
                                            room = roomDetails;
                                        callback_waterfall(null, Utility.output('', 'SUCCESS'));
                                    });
                                }
                            }
                        });
                    } else {
                        callback_waterfall(null, Utility.output('', 'SUCCESS'));
                    }
                }
            },
                    /*
                     function (received_previous, callback_waterfall) {
                     if ((data.message_type.toLowerCase() === "file")) {
                     UserFile.findOne({_id: data.file_id}, function (err, file) {
                     if (err) {
                     callback_waterfall(null, Utility.output(err, 'ERROR'));
                     }
                     if (!file) {
                     callback_waterfall(null, Utility.output('Uploaded file not found', 'ERROR'));
                     } else {
                     fileObj = file;
                     callback_waterfall(null, Utility.output('', 'SUCCESS'));
                     }
                     });
                     } else {
                     callback_waterfall(null, Utility.output('', 'SUCCESS'));
                     }
                     },*/
        ], function (previous, callback_waterfall) {
            var currentDate = new Date().getTime();
            if (!Utility.IsNullOrEmpty(callback_waterfall)) {
                if (callback_waterfall.status == "error") {
                    return res.json(Utility.output(callback_waterfall.message, 'ERROR'));
                } else {
                    async.parallel([
                        function (callback_inner) {
                            if (!room)
                            {
                                var members = [];
                                if (friendObj) {
                                    members = [req.decoded.userId, friendObj.userId];
                                }
                                var newRoom = new DomainModel.rooms({
                                    '_group': (groupObj) ? groupObj : null,
                                    '_members': members,
                                    'date_of_creation': currentDate,
                                    'date_of_modification': currentDate
                                });
                                newRoom.save(function (err, newRoomObj) {
                                    if (err)
                                        return res.json(Utility.output(err, 'ERROR'));
                                    else {
                                        room = newRoomObj;
                                        socket.join(newRoomObj._id);
                                    }
                                    callback_inner();
                                });
                            } else {
                                DomainModel.rooms.update({_id: room._id}, {$set: {date_of_modification: currentDate}}, function (err, numberUpdate) {
                                    if (err)
                                        return res.json(Utility.output(err, 'ERROR'));
                                    else
                                        callback_inner();
                                });
                            }
                        },
                    ], function () {
                        if (!messageObj) {
                            var messageEncoded = new NodeRSA(CONSTANT.getPublicKey()).encrypt(Utility.escape(req.body.message), 'base64');
                            var newChatMessage = new DomainModel.chat_messages({
                                '_room': room,
                                'message': messageEncoded,
                                'message_type': (req.body.message_type.toLowerCase() === "file") ? 'FILE' : 'TEXT',
                                '_user_file': fileObj,
                                'date_of_creation': currentDate,
                                'date_of_modification': currentDate
                            });
                            newChatMessage.save(function (err, newMessage) {
                                var user_chat_message = {};
                                var my_delivered_message = {};
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                else {
                                    if (friendObj) {
                                        var chatMessageUsers = new DomainModel.chat_message_users({
                                            '_room': room,
                                            '_chat_message': newMessage,
                                            '_sender': req.decoded.userId,
                                            '_receiver': friendObj.userId,
                                        });
                                        chatMessageUsers.save();
                                        my_delivered_message = {
                                            'browser_message_id': req.body.browser_message_id,
                                            'message_id': newMessage._id,
                                            'room_id': room._id,
                                            'message': req.body.message,
                                            'destination_id': friendObj.userId,
                                            'message_type': (req.body.message_type.toLowerCase() === "file") ? 'FILE' : 'TEXT',
                                            'is_group': false,
                                            'destination': {
                                                'destination_id': friendObj.userId,
                                                'name': (friendObj.firstName || friendObj.lastName) ? friendObj.firstName + " " + friendObj.lastName : 'Unnamed',
                                                'email': (friendObj.email) ? friendObj.email : null,
                                                'userImg': (friendObj.userImg) ? friendObj.userImg : null,
                                                'userType': (friendObj.userType) ? friendObj.userType : null
                                            },
                                            'sender': {
                                                'sender_id': req.decoded.userId,
                                                'name': (req.decoded.firstName || req.decoded.lastName) ? req.decoded.firstName + " " + req.decoded.lastName : 'Unnamed',
                                                'email': (req.decoded.email) ? req.decoded.email : null,
                                                'userImg': (req.decoded.userImg) ? req.decoded.userImg : null,
                                                'userType': (req.decoded.userType) ? req.decoded.userType : null
                                            },
                                            'date_of_creation': currentDate
                                        };
                                        user_chat_message = JSON.parse(JSON.stringify(my_delivered_message));
                                        delete user_chat_message['browser_message_id'];
                                    } else if (groupObj) {
                                        /*
                                         my_delivered_message = {
                                         'browser_message_id': data.browser_message_id,
                                         'message_id': newMessage._id,
                                         'room_id': room._id,
                                         'message': newMessage.message,
                                         'destination_id': groupObj._id,
                                         'message_type': (data.message_type.toLowerCase() === "call") ? 'CALL' : (data.message_type.toLowerCase() === "file") ? 'FILE' : 'TEXT',
                                         'is_group': true,
                                         'contact_shared': contactSharingAccepted,
                                         'sender': {
                                         'sender_id': currentUser._id,
                                         'name': currentUser.name,
                                         'image': currentUser.image,
                                         'email': currentUser.email
                                         },
                                         'group': {
                                         'group_id': groupObj._id,
                                         'name': groupObj.name,
                                         'image': groupObj.image
                                         },
                                         'receivers': [],
                                         'date_of_creation': currentDate
                                         };
                                         user_chat_message = {
                                         'message_id': newMessage._id,
                                         'room_id': room._id,
                                         'message': newMessage.message,
                                         'is_group': true,
                                         'contact_shared': contactSharingAccepted,
                                         'destination_id': groupObj._id,
                                         'sender': {
                                         'sender_id': currentUser._id,
                                         'name': currentUser.name,
                                         'image': currentUser.image,
                                         'email': currentUser.email
                                         },
                                         'group': {
                                         'group_id': groupObj._id,
                                         'name': groupObj.name,
                                         'image': groupObj.image
                                         },
                                         'message_type': (data.message_type.toLowerCase() === "call") ? 'CALL' : (data.message_type.toLowerCase() === "file") ? 'FILE' : 'TEXT',
                                         'receivers': [],
                                         'date_of_creation': currentDate
                                         };
                                         for (var i = 0; i < groupObj._members.length; i++) {
                                         if (groupObj._members[i]._id.toString() != currentUser._id.toString()) {

                                         var chatMessageUsers = new ChatMessageUser({
                                         '_room': room,
                                         '_chat_message': newMessage,
                                         '_sender': currentUser,
                                         '_receiver': groupObj._members[i],
                                         });
                                         chatMessageUsers.save();
                                         if (!Utility.IsNullOrEmpty(OnlineUsers[groupObj._members[i]._id.toString()])) {
                                         my_delivered_message.receivers.push({_id: groupObj._members[i]._id, is_online: true});
                                         user_chat_message.receivers.push({_id: groupObj._members[i]._id, is_online: true});
                                         for (var ix = 0; ix < OnlineUsers[groupObj._members[i]._id.toString()].length; ix++) {
                                         if (!Utility.IsNullOrEmpty(io.sockets.adapter.sids[OnlineUsers[groupObj._members[i]._id.toString()][ix]])) {
                                         var friendSocket = io.sockets.connected[OnlineUsers[groupObj._members[i]._id.toString()][ix]];
                                         friendSocket.join(room._id.toString());
                                         }
                                         }
                                         } else {
                                         my_delivered_message.receivers.push({_id: groupObj._members[i]._id, is_online: false});
                                         user_chat_message.receivers.push({_id: groupObj._members[i]._id, is_online: false});
                                         }
                                         }
                                         }*/
                                    } else {
                                    }
                                   
                                    if (fileObj) {
                                        /*
                                         var instanceUserFileController = new UserFileController();
                                         instanceUserFileController.generateDownloadUrl(fileObj._id, user_chat_message._id, function (url) {
                                         my_delivered_message.file_info = null;
                                         user_chat_message.file_info = null;
                                         if (url.status === "success") {
                                         my_delivered_message.file_info = url.result;
                                         user_chat_message.file_info = url.result;
                                         }
                                         console.log('Message Delivered:' + JSON.stringify(my_delivered_message));
                                         console.log('Incomming:' + JSON.stringify(user_chat_message));
                                         socket.emit('chat message_delivered', my_delivered_message);
                                         socket.broadcast.to(room._id.toString()).emit('chat incoming_message', user_chat_message);
                                         });
                                         */
                                    } else {
                                        async.parallel([
                                            function (parallel_cb) {
                                                console.log("Friend",friendObj.userId);
                                                if (!groupObj)
                                                {
                                                    console.log("Friend2",friendObj.userId);
                                                    DomainModel.User.findOne({userId: friendObj.userId, userStatus: "active"}, function (err, user) {
                                                        if (user.sockets !== undefined)
                                                        {
                                                            for (var ix = 0; ix < user.sockets.length; ix++) {
                                                                console.log("xx",user.sockets[ix]);
                                                                if (!Utility.IsNullOrEmpty(io.sockets.adapter.sids[user.sockets[ix]])) {
                                                                    var friendSocket = io.sockets.connected[user.sockets[ix]];
                                                                    console.log("yy",user.sockets[ix]);
                                                                    friendSocket.join(room._id.toString());
                                                                }
                                                            }
                                                        }
                                                        
                                                        parallel_cb();
                                                    });
                                                }
                                                else
                                                    parallel_cb();
                                            },
                                            function(parallel_cb){
                                                thisObj.get_unread_message_receiver(room._id,user_chat_message.destination.destination_id,function(unreadMessage){
                                                    user_chat_message.unread_messages=0;
                                                    //console.log("Unread Message Count",JSON.stringify(unreadMessage));
                                                    if (unreadMessage._status_Code === 200)
                                                    {
                                                        user_chat_message.unread_messages = unreadMessage.result.length;
                                                    }
                                                    parallel_cb();
                                                });
                                            }
                                        ], function () {
                                            //console.log('Message Delivered Initial:' + JSON.stringify(my_delivered_message));
                                            socket.broadcast.to(room._id.toString()).emit('chat incoming_message', user_chat_message);
                                            return res.json(Utility.output('Chat Message Sent','SUCCESS',my_delivered_message));
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    };
    this.get_messages = function(req,res,next){
        req.assert('room_id', 'Room ID is required').notEmpty();
        var errors = req.validationErrors();
        var thisObj = this;
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        if(!Utility.checkObjectIdValidation(req.body.room_id))
        {
            return res.json(Utility.output('Invalid Room ID', 'ERROR'));
        }
        var perPage = CONSTANT.max_record_per_page;
        if (!req.body.page)
            req.body.page = 0;
        var page = Math.max(0, req.body.page);
        var status = CONSTANT.USER_STATUS;
        if (page)
            page -= 1;
        var result = {
            'length': 0,
            'page': page + 1 || 1,
            'per_page_record': perPage,
            'result': []
        };
        async.waterfall([
            function (callback_waterfall) {
                DomainModel.rooms.aggregate([
                    /*
                    {
                        $lookup:
                                {
                                    from: "groups",
                                    localField: "_group",
                                    foreignField: "_id",
                                    as: "groups"
                                }
                    },
                    {$unwind: {path: "$groups", preserveNullAndEmptyArrays: true}},*/
                    {
                        $lookup:
                        {
                            from: "User",
                            localField: "_members",
                            foreignField: "userId",
                            as: "members"
                        }
                    },
                    {
                        $project: {
                            "_id": "$_id",
                            "_group": "$groups",
                            "_members": "$members",
                        }
                    },
                    {"$sort": {date_of_creation: -1}},
                    {"$match": {
                            $or: [
                                {_group: {$exists: true}, "_group._members": {$in: [req.decoded.userId]}},
                                {
                                    _members: {$exists: true},
                                    "_members.userStatus": "active",
                                    "_members.userId": {$in: [req.decoded.userId]}
                                },
                            ],
                            _id:new ObjectID(req.body.room_id)
                        }
                    }], function (err, room) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!room.length)
                        return res.json(Utility.output('Room not found', 'ERROR'));
                    room = room[0];
                    /*
                    if (!Utility.IsNullOrEmpty(room._group))
                    {
                        if (room._group._members.map(function (e) {
                            return e.toString();
                        }).indexOf(req.user._id.toString()) == -1)
                        {
                            return res.json(Utility.output(Toster.NOT_MEMBER_GROUP, 'ERROR'));
                        }
                    }*/
                    /*
                    if (room._members.length)
                    {
                        if (!Utility.IsNullOrEmpty(room._members[0]))
                        {
                            if (!Utility.IsNullOrEmpty(room._members[1]) && (room._members[0].userId != req.decoded.userId))
                            {
                                if (!Utility.IsNullOrEmpty(room._members[1]))
                                {
                                    if (!Utility.IsNullOrEmpty(room._members[0]) && (room._members[0].userId != req.decoded.userId))
                                    {
                                        return res.json(Utility.output('Sorry!!No previous chat has been found', 'ERROR'));
                                    }
                                } else {
                                    return res.json(Utility.output('Sorry!!No previous chat has been found', 'ERROR'));
                                }
                            }
                        }
                    }
                    */
                    callback_waterfall(null, room);
                });
            },
        ], function (nullObj, roomObj) {
            if (!roomObj)
                return res.json(Utility.output('Room not found', 'ERROR'));
            DomainModel.chat_messages.aggregate([
                {"$match": {'_room': new ObjectID(roomObj._id)}},
                {
                    $lookup:
                    {
                        from: "chat_message_users",
                        localField: "_id",
                        foreignField: "_chat_message",
                        as: "chat_message_users"
                    }
                },
                /*
                {
                    $lookup:
                    {
                        from: "user_files",
                        localField: "_user_file",
                        foreignField: "_id",
                        as: "user_files"
                    }
                },
                {$unwind: {path: "$user_files", preserveNullAndEmptyArrays: true}},*/
                {
                    $project: {
                        "_id": "$_id",
                        "_room": "$_room",
                        "_user_file": "$user_files",
                        "message": "$message",
                        "message_type": "$message_type",
                        "chat_message_users": "$chat_message_users",
                        "date_of_creation": "$date_of_creation",
                        "date_of_modification": "$data_of_modification",
                    }
                },
                {"$sort": {'date_of_creation': -1}},
                {"$skip": (perPage * page)},
                {"$limit": perPage}
            ], function (err, chat_messages) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (!chat_messages.length)
                    return res.json(Utility.output('No chat records has been found', 'SUCCESS', result));
                async.parallel([
                    function (callback_parallel) {
                        result.result = {
                            'room_id': roomObj._id,
                            'destination_id': null,
                            'users': [],
                            'is_group': false,
                            'messages': []
                        };
                        if (roomObj._members.length)
                        {
                            var index = 0;
                            if (roomObj._members[0].userId == req.decoded.userId)
                            {
                                index = 1;
                            }
                            DomainModel.User.findOne({userId: roomObj._members[index].userId,userStatus:"active"}, function (err, friend) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                if (!friend)
                                    return res.json(Utility.output("User not found", 'ERROR'));
                                result.result.destination_id = friend.userId;
                                var tempx = {
                                    'name': (friend.firstName || friend.lastName)?friend.firstName+" "+friend.lastName:null,
                                    'userImg': (friend.userImg!==undefined)?(friend.userImg)?friend.userImg:null:null,
                                    'UserId':friend.userId,
                                    'email': (friend.email!==undefined)?(friend.email)?friend.email:null:null,
                                    'user_status': (!Utility.IsNullOrEmpty(friend.is_login)) ? status[friend.custom_status] : 'OFFLINE'
                                };
                                result.result.users.push(tempx);
                                callback_parallel();
                            });
                        }
                        /*
                        if (roomObj._group)
                        {
                            GroupModel.findOne({_id: roomObj._group}).populate('_members').exec(function (err, group) {
                                if (err)
                                    return res.json(Utility.output(err, 'ERROR'));
                                if (!group)
                                    return res.json(Utility.output(Toster.GROUP_NOT_FOUND, 'ERROR'));
                                result.result.destination_id = group._id;
                                result.result.is_group = true;

                                async.eachSeries(group._members, function iteratee(group_member, callback_iteratee) {
                                    if (group_member._id.toString() != req.user.id.toString())
                                    {
                                        contactBookInstance.get_user_details(req, res, group_member.email, function (friendDetails) {
                                            if (friendDetails.status === "success" && friendDetails.result)
                                            {
                                               
                                                var tempx = {
                                                    'name': friendDetails.result.name,
                                                    'user_id':friendDetails.result.user_id,
                                                    'image': friendDetails.result.image,
                                                    'email': friendDetails.result.email,
                                                    'user_status': (!Utility.IsNullOrEmpty(friendDetails.result.is_login)) ? status[friendDetails.result.custom_status] : 'OFFLINE'
                                                };
                                                result.result.users.push(tempx);
                                            }
                                            callback_iteratee();
                                        });
                                    } else {
                                        callback_iteratee();
                                    }
                                }, function (callback_iteratee) {
                                    callback_parallel();
                                });
                            });
                        }*/
                    },
                    function (callback_parallel) {
                        async.eachSeries(chat_messages, function iteratee(chat_message, callback_iteratee) {
                            try {
                                var decodedMessage = Utility.unescape(new NodeRSA(CONSTANT.getPrivateKey()).decrypt(chat_message.message, 'utf8'));
                            } catch (e) {
                                return res.json(Utility.output('Sorry!! Unable to decrept your chat', 'ERROR'));
                            }
                            if (chat_message.chat_message_users.length)
                            {
                                DomainModel.User.findOne({userId: chat_message.chat_message_users[0]._sender,userStatus:"active"}, function (err, sender) {
                                    if (err)
                                        return res.json(Utility.output(err, 'ERROR'));
                                    if (!sender) {
                                        return res.json(Utility.output('Sender not found', 'ERROR'));
                                    }
                                    var message = {
                                        'message_id': chat_message._id,
                                        'message': decodedMessage,
                                        'sender': {
                                            'name': (sender.firstName || sender.lastName)?sender.firstName+" "+sender.lastName:null,
                                            'userImg': (sender.userImg!==undefined)?(sender.userImg)?sender.userImg:null:null,
                                            'UserId':sender.userId,
                                            'email': (sender.email!==undefined)?(sender.email)?sender.email:null:null,
                                            'user_status': (!Utility.IsNullOrEmpty(sender.is_login)) ? status[sender.custom_status] : 'OFFLINE'
                                        },
                                        'message_type': chat_message.message_type.toUpperCase(),
                                        'date_of_creation': chat_message.date_of_creation
                                    };
                                    result.result.messages.push(message);
                                    callback_iteratee();
                                    /*
                                    if (chat_message.message_type.toUpperCase() === "FILE")
                                    {
                                        var instanceUserFileController = new UserFileController();
                                        instanceUserFileController.generateDownloadUrl(chat_message._user_file._id, chat_message._id.toString(), function (url) {
                                            message.file_info = null;
                                            if (url.status === "success")
                                                message.file_info = url.result;
                                            result.result.messages.push(message);
                                            callback_iteratee();
                                        });
                                    } else {
                                        result.result.messages.push(message);
                                        callback_iteratee();
                                    }*/
                                });
                            } else {
                                callback_iteratee()
                            }
                        }, function (callback_iteratee) {
                            callback_parallel();
                        });
                    }
                ], function () {
                    result.result.messages.reverse();
                    result.length = result.result.messages.length;
                    thisObj.read_room(req, res, next);
                    return res.json(Utility.output(result.result.messages.length + ' chat record(s) fetched', 'SUCCESS', result));
                });
            });
        });
    };
    this.update = function (req, res, next) {

    };
    this.remove = function (req, res, next) {

    };
    this.broadCastStatus = function (userId,loginStatus) {
        DomainModel.User.find({userId:{$ne:userId},userStatus:"active"},function(err,users){
            async.eachSeries(users, function iteratee(friend, callback_iteratee) {
                async.eachSeries(friend.sockets, function iteratee(friendSocketID, callback_iteratee_inner) {
                    if (!Utility.IsNullOrEmpty(io.sockets.adapter.sids[friendSocketID])) {
                        var friendSocket = io.sockets.connected[friendSocketID];
                        if(friendSocket!==undefined)
                            friendSocket.emit("chat get_user_login_status",{
                                userId:userId,
                                is_login:loginStatus
                            });
                    }
                    callback_iteratee_inner();
                },function(){
                    callback_iteratee();
                });
            });
        });
    };
    this.subscribe_unsubscribe_in_rooms = function (userId,socket,isSubcribe) {
        DomainModel.rooms.aggregate([
            /*
             {
                    $lookup:
                    {
                    from: "groups",
                    localField: "_group",
                    foreignField: "_id",
                    as: "groups"
                    }
             },
             */
                {
                    $lookup:
                            {
                                from: "User",
                                localField: "_members",
                                foreignField: "userId",
                                as: "members"
                            }
                },
                //{$unwind: {path: "$groups", preserveNullAndEmptyArrays: true}},
                {
                    $project: {
                        "_id": "$_id",
                        "_group": "$_groups",
                        "_members": "$members",
                        "date_of_modification": "$date_of_modification"
                    }
                },
                {"$match": {
                        $or: [
                            {_group: {$exists: true}, "_group._members": {$in: [userId]}},
                            {
                                _members: {$exists: true},
                                "_members.userStatus": "active",
                                "_members.userId": {$in: [userId]},
                            },
                        ]
                    }
                },
            ], function (err, rooms) {
                if(rooms.length)
                {
                    async.eachSeries(rooms, function iteratee(room, callback_iteratee) {
                        if(isSubcribe){
                            socket.join(room._id.toString());
                        }
                        else{
                            socket.leave(room._id.toString());
                        }
                    });
                }
            });
    };
    this.read_room = function (req, res, next,callback=function(){}) {
        req.assert('room_id', 'Room ID is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            callback(Utility.output(messages, 'ERROR'));
        }
        DomainModel.chat_message_users.update({'_room': new ObjectID(req.body.room_id), '_receiver': req.decoded.userId, 'is_read': 0}, {$set: {is_read: 1}}, {multi: true}, function (err, countOfUpdate) {
            if (err)
                callback(Utility.output(err, 'ERROR'));
            if (!countOfUpdate)
                callback(Utility.output('0 message has been read', 'SUCCESS'));
            else
                callback(Utility.output(countOfUpdate.nModified + ' message has been read', 'SUCCESS'));
        });
    };
    this.get_unread_message = function (room_id, user_id, callback) {
        DomainModel.chat_message_users.find({'_room': new ObjectID(room_id), '_sender': user_id, 'is_read': 0}, function (err, unreadMessages) {
            if (err)
                return callback(Utility.output(err, 'ERROR'));
            if (!unreadMessages)
                return callback(Utility.output('No unread chat has been found', 'SUCCESS', []));
            return callback(Utility.output(unreadMessages.length + ' unread chat(s) has been found', 'SUCCESS', unreadMessages));
        });
    };
    this.get_unread_message_receiver = function (room_id, user_id, callback) {
        DomainModel.chat_message_users.find({'_room': new ObjectID(room_id), '_receiver': user_id, 'is_read': 0}, function (err, unreadMessages) {
            if (err)
                return callback(Utility.output(err, 'ERROR'));
            if (!unreadMessages)
                return callback(Utility.output('No unread chat has been found', 'SUCCESS', []));
            return callback(Utility.output(unreadMessages.length + ' unread chat(s) has been found', 'SUCCESS', unreadMessages));
        });
    };
    this.register_user_socket=function(user_id,socket){
        console.log("User ID",user_id);
        console.log("Socket ID",socket.id);
        var thisObj=this;
        DomainModel.User.findOne({userId:user_id},function(err,user){
            //console.log("User",user);
            if(user)
            {
                if(user.sockets===undefined)
                    user.sockets=[];
                if(!user.sockets)
                    user.sockets=[];
                var userSockets=JSON.parse(JSON.stringify(user.sockets));
                async.eachSeries(user.sockets,function(userSocket,callback_each){
                    if (io.sockets.adapter.sids[userSocket]===undefined) {
                        var index = userSockets.indexOf(userSocket);
                        if (index !== -1){
                            userSockets.splice(index, 1);
                        }
                    } 
                    callback_each();
                },function(){
                    if(!userSockets.length)
                        user.is_login=true;
                    var index = userSockets.indexOf(socket.id);
                    //console.log("Socket Id",socket.id);
                    if (index === -1){
                        userSockets.push(socket.id);
                    }
                    user.sockets=userSockets;
                    //console.log("User Sockets",user.sockets);
                    DomainModel.User.update({ _id: user._id }, { $set: { sockets: user.sockets,is_login:user.is_login} }, function(err, numberUpdate) {
                                if (err)
                                    console.log(err);
                            });
                    if(user.is_login)
                        thisObj.broadCastStatus(user.userId,is_login=true);
                });
                thisObj.subscribe_unsubscribe_in_rooms(user.userId,socket,isSubscribe=true);
            }
            else
            {
                console.log("Unable to register socket for",user_id);
            }
        });
    };
    this.remove_user_socket=function(socket){
        var thisObj=this;
        DomainModel.User.findOne({sockets:{$in:[socket.id]}},function(err,user){
            if(user)
            {
                var index = user.sockets.indexOf(socket.id);
                if (index !== -1){
                    user.sockets.splice(index, 1);
                }
                if(!user.sockets.length)
                    user.is_login=false;
                user.save();
                if(!user.is_login)
                    thisObj.broadCastStatus(user.userId,is_login=false);
                thisObj.subscribe_unsubscribe_in_rooms(user.userId,socket,isSubscribe=false);
            }
        });
    };
    this.socket_connection=function(){
        var thisObj=this;
        io.use(function(socket, next){
            if (socket.handshake.query && socket.handshake.query.token) {
                var token = socket.handshake.query.token;
                // decode token
                if (token) {
                    // verifies secret and checks exp
                    jwt.verify(token, 'sofomo_pwd', function (err, decoded) {
                        if (err) {
                            socket.emit('message',Utility.output('Invalid Token','ERROR'));
                        } else {
                            thisObj.register_user_socket(decoded.userId,socket);
                            MailboxControllerInstance.connection(socket);
                            next();
                        }
                    });
                }
            }
            // next();
        })
        .on('connection', function (socket) {
            console.log('new connection',socket.id)           
            socket.on('disconnect', function (reason) {
                console.log("Disconnected",reason);
                thisObj.remove_user_socket(socket);
            });
            socket.on('logout', function () {
                console.log("Logout");
                thisObj.remove_user_socket(socket);
            });
        });
    };
};