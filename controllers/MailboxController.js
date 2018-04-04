var async = require('async');
var IMAP_CONFIG = require('config').get('IMAP');
var inbox = require("inbox");
module.exports = function MailboxController() {
    this.connection=function(socket){
        return null;
        try{
            var client = inbox.createConnection(false, IMAP_CONFIG.host, {
                secureConnection: true,
                auth:{
                    user: IMAP_CONFIG.username,
                    pass: IMAP_CONFIG.password
                }
            });
            if(client)
                client.connect();
            return client;
        }
        catch(e){
            return null;
        }
    };
    this.connectionClose=function(client){
        client.close();
        client.on('close', function (){
            console.log('DISCONNECTED!');
        });
    };
    this.folderPath=function(generalPath){
        var returnPath=null;
        switch(generalPath)
        {
            case "INBOX":
                var host=IMAP_CONFIG.host.toLowerCase();
                returnPath="INBOX";
                if(host.indexOf("gmail")!==1)
                    returnPath="INBOX";
                break;
            case "SENT":
                var host=IMAP_CONFIG.host.toLowerCase();
                returnPath="Sent";
                if(host.indexOf("gmail")!==1)
                    returnPath="[Gmail]/Sent Mail";
                break;
            default:
                break
        }
        return returnPath;
    };
    this.inbox=function(req,res,next){
        var thisObj=this;
        var client=thisObj.connection();
        if(!client)
            return res.json(Utility.output('IMAP Auth Failed','ERROR'));
        var perPage = CONSTANT.max_record_per_page;
        if (!req.query.page)
            req.query.page = 0;
        var page = Math.max(0, req.query.page);
        if (!page)
            page=1;
        var result = {
            'total_records': 0,
            'total_unseen':0,
            'page': (page),
            'fetched_records':0,
            'per_page_records': perPage,
            'lists': []
        };
        client.on("error",function(e){
            res.json(Utility.output('Auth Failed','ERROR'));
            this.connectionClose(client);
        });
        client.on("connect", function(){  
            client.openMailbox(thisObj.folderPath('INBOX'), function(error, info){
                if(error) throw error;
                result.total_records=info.count;
                async.parallel([
                    function(callback_parallel){
                        client.listMessages(((page*perPage)*(-1)),perPage, function(err, messages){
                            result.fetched_records=messages.length;
                            messages.reverse();
                            async.eachSeries(messages, function iteratee(message, callback_iteratee_inner) {
                                var seenUnseen="seen";
                                var attachments=false;
                                if(message.flags[0]===undefined)
                                    seenUnseen="unseen";
                                else{
                                    if(message.flags[0]==="\\Recent")
                                        seenUnseen="unseen";
                                }

                                if(message.bodystructure["2"]!==undefined)
                                {
                                    if(message.bodystructure["2"].type!=="text/plain" && message.bodystructure["2"].type!=="text/html")
                                        attachments=true;
                                }
                                var temp={
                                    "message_id":message.UID,
                                    "date":new Date(message.internalDate+"").getTime(),
                                    "title":message.title,
                                    "from":message.from,
                                    "to":message.to,
                                    "cc":(message.cc!==undefined)?message.cc:[],
                                    "message_status":seenUnseen,
                                    "attachment":attachments                           
                                };
                                result.lists.push(temp);
                                callback_iteratee_inner();
                            },function(){
                                callback_parallel();
                            });
                        });
                    },
                    function(callback_parallel){
                        client.search({unseen: true},true,function(err,unseenMails){
                            async.eachSeries(unseenMails, function iteratee(unseenMail, callback_iteratee_inner) {
                                var is_seen=true;
                                if(unseenMail.flags[0]===undefined)
                                    is_seen=false;
                                else{
                                    if(unseenMail.flags[0]==="\\Recent")
                                        is_seen=false;
                                }
                                if(!is_seen)
                                    result.total_unseen+=1;
                                callback_iteratee_inner();
                            },function(){
                                callback_parallel();
                            });
                        });
                    }
                ],function(){
                    thisObj.connectionClose(client);
                    return res.json(Utility.output(result.lists.length+" mail(s) are fetched","SUCCESS",result));
                });
            });
        });
    };
    this.sent=function(req,res,next){
        var thisObj=this;
        var client=thisObj.connection();
        if(!client)
            return res.json(Utility.output('IMAP Auth Failed','ERROR'));
        var perPage = CONSTANT.max_record_per_page;
        if (!req.query.page)
            req.query.page = 0;
        var page = Math.max(0, req.query.page);
        if (!page)
            page=1;
        var result = {
            'total_records': 0,
            'page': (page),
            'fetched_records':0,
            'per_page_records': perPage,
            'lists': []
        };
        client.on("error",function(e){
            this.connectionClose(client);
            return res.json(Utility.output('Auth Failed','ERROR'));
        });
        client.on("connect", function(){  
            client.openMailbox(thisObj.folderPath('SENT'), function(error, info){
                if(error) throw error;
                result.total_records=info.count;
                client.listMessages(((page*perPage)*(-1)),perPage, function(err, messages){
                    result.fetched_records=messages.length;
                    messages.reverse();
                    async.eachSeries(messages, function iteratee(message, callback_iteratee_inner) {
                        var attachments=false;
                        if(message.bodystructure["2"]!==undefined)
                        {
                            if(message.bodystructure["2"].type!=="text/plain" && message.bodystructure["2"].type!=="text/html")
                                attachments=true;
                        }
                        var temp={
                            "message_id":message.UID,
                            "date":new Date(message.internalDate+"").getTime(),
                            "title":message.title,
                            "from":message.from,
                            "to":message.to,
                            "cc":(message.cc!==undefined)?message.cc:[],
                            "attachment":attachments                           
                        };
                        result.lists.push(temp);
                        callback_iteratee_inner();
                    },function(){
                        thisObj.connectionClose(client);
                        return res.json(Utility.output(result.lists.length+" sent mail(s) are fetched","SUCCESS",result));
                    });
                });
            });
        });
    };
    this.move=function(req,res,next){
        
    };
    this.compose=function(req,res,next){
        
    };
    this.getMessage=function(req,res,next){
        var thisObj=this;
        if (Utility.IsNullOrEmpty(req.query.message_id)) {
            return res.json(Utility.output('Message ID is required', 'VALIDATION_ERROR'));
        }
        if(isNaN(req.query.message_id))
            return res.json(Utility.output('Invalid Message ID', 'VALIDATION_ERROR'));
        if (Utility.IsNullOrEmpty(req.query.folder)) {
            return res.json(Utility.output('Folder is required (INBOX/SENT)', 'VALIDATION_ERROR'));
        }
        req.query.folder=req.query.folder.toUpperCase();
        if (req.query.folder === "INBOX" || req.query.folder === "SENT") {
        } else {
            return res.json(Utility.output('Folder must be (INBOX/SENT)', 'ERROR'));
        }
        var client=thisObj.connection();
        if(!client)
            return res.json(Utility.output('IMAP Auth Failed','ERROR'));
        client.on("error",function(e){
            this.connectionClose(client);
            return res.json(Utility.output('Auth Failed','ERROR'));
        });
        client.on("connect", function(){
            client.openMailbox(thisObj.folderPath(req.query.folder), function(error, info){
                if(error)
                    return res.json(Utility.output("Invalid Folder Selected", 'ERROR'));
                client.fetchData(req.query.message_id, function(error, message){
                    if(!message)
                        return res.json(Utility.output("Mail not found", 'ERROR'));
                    var simpleParser = require('mailparser').simpleParser;
                    simpleParser( client.createMessageStream(req.query.message_id) ).then((mailObject) => {
                        var temp={
                            "message_id":message.UID,
                            "folder":req.query.folder,
                            "date":new Date(message.internalDate+"").getTime(),
                            "title":message.title,
                            "from":mailObject.from,
                            "to":mailObject.to,
                            "cc":(mailObject.cc!==undefined)?message.cc:[],
                            "body_text":mailObject.text,
                            "body_html":mailObject.textAsHtml,
                            "attachments":[]                          
                        };
                        async.eachSeries(mailObject.attachments,function(attachment,callback_each){
                            temp.attachments.push({
                                "contentType": attachment.contentType,
                                "release": attachment.release,
                                "filename": attachment.filename,
                                "checksum": attachment.checksum,
                                "size": attachment.size
                            });
                            callback_each();
                        },function(){
                            thisObj.connectionClose(client);
                            return res.json(Utility.output("Mail has been fetched","SUCCESS",temp));
                        });
                    });
                });
            });
        });
    };
};