module.exports = function UtilityController() {
    this.image_url_to_base64 = function(req,res,next){
        var url=req.query.url;
        if(!url)
            return res.json(Utility.output('URL is required','ERROR'));
        Utility.UrlToBase64Image(url,function(err,base64Image){
            if(err || !base64Image)
                return res.json(Utility.output(err,'ERROR'));
            return res.json(Utility.output('Converted','SUCCESS',base64Image));
        });
    };
    this.tiff2PDF = function(req,res,next){
        var EMR_CONFIG = require('config').get('ehrserver');
        var fs=require('fs');
        var url=req.query.url;
        var spawn = require('child_process').spawn;
        var ofile = APP_ROOT_PATH+'/data/files/pdf/'+new Date().getTime()+'.pdf';
        ofile=ofile.replace(/\\/g, "/");
        var endPointURL="http://";
        if(EMR_CONFIG.secured!==undefined)
            if(EMR_CONFIG.secured)
                endPointURL="https://";
        endPointURL+=EMR_CONFIG.ip;
        if(EMR_CONFIG.serverPort!==undefined)
            if(EMR_CONFIG.serverPort)
                endPointURL+=":"+EMR_CONFIG.serverPort;
        ifile = url.replace(endPointURL,APP_ROOT_PATH+'/data');
        ifile=ifile.replace(/\\/g, "/");
        if (!fs.existsSync(ifile))
            return res.json(Utility.output('TIFF file not found', 'ERROR'));
        //console.log(ifile,ofile);
        var isWin = /^win/.test(process.platform)
        if(isWin)
            var tiff2pd2 = spawn('convert', [ifile, ofile]);
        else
            var tiff2pd2 = spawn('tiff2pdf', ['-o', ofile, ifile]);
        tiff2pd2.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            //cb({message: 'stdout', data: data.toString('utf-8')});
        });
        tiff2pd2.stderr.on('data', function (data) {
            return res.json(Utility.output('Unable to convert tiff to pdf','ERROR'));
            console.log('stderr: ' + data);
        });
        tiff2pd2.on('close', function (code) {
            //cb({message: 'close', code: code});
            if (!fs.existsSync(ofile))
                return res.json(Utility.output('Unable to convert tiff to pdf', 'ERROR'));
            return res.download(ofile,function(err){
                if(err)
                    console.log('ERROR',err);
                fs.unlink(ofile);
            });
        });
        tiff2pd2.on('error', function (code) {
            return res.json(Utility.output('Unable to convert tiff to pdf','ERROR'));
            //cb({message: 'error', code: code});
        });
    };
    this.callRabbitMQ = function(req,res,next){
        var integration=require(APP_ROOT_PATH+'/models/integrationAmqp');
        var json=`{"doctorId": "7b6a2d7a-67c8-41db-94a2-98218dca024d",
  "discount": 0,
  "_id": "59c851e1-4015-4cf1-ac20-af6951a29dd9",
  "orderName": "2 Hour Post-Prandial",
  "orderDate": 1504866743845,
  "orderItems": {
    "cpoeOrderId": "59c851e1-4015-4cf1-ac20-af6951a29dd9",
    "_id": "9c1d5afb-aab5-49ef-872c-1a29f5bad575",
    "ID": "44",
    "instruction": "",
    "description": "",
    "howOften": "once",
    "urgency": "regular",
    "collectionType": "lab",
    "collectionDate": 1504800000000,
    "collectSample": "Body Fluids - Pleural",
    "doctorName": "DR AZIZI AHMAD",
    "doctorId": "7b6a2d7a-67c8-41db-94a2-98218dca024d",
    "labTest": "2 Hour Post-Prandial",
    "specimen": ""
  },
  "visitId": "10d00528-8241-486c-b969-e194828498b1",
  "patientId": "2e9d191f-1d6a-41d1-9a74-5658b6f36ffd",
  "userId": "7b6a2d7a-67c8-41db-94a2-98218dca024d",
  "isVerified": true,
  "orderGroup": "undefined1504866609642",
  "canDiscontinue": true,
  "canRepeat": true,
  "canCancel": true,
  "orderStatus": "pending",
  "isFavorite": false,
  "orderSubCategory": "1",
  "orderCategory": "Lab",
  "encounterType": "null",
  "serviceName": "null",
  "serviceCode": "",
  "clinicName": "null",
  "clinicalDepartment": "null",
  "orderingDoctorName": "DR AZIZI AHMAD .",
  "primaryDoctor": "null",
  "visit_admissionNo": "null",
  "visitType": "null",
  "patientName": "TANG SHAOMIN"}`;
        
        integration.placeOrderToHIS(JSON.parse(json));
    };
    this.compareRabbitMQPatients = function(req,res,next){
        var integration=require(APP_ROOT_PATH+'/models/integrationAmqp');
        integration.compareRabbitMQPatients(res);
    };
};