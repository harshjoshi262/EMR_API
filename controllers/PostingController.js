module.exports = function PostingController() {
    this.tiff2PNG = function(req,res,next){
        var currentTime=new Date().getTime();
        var os=require("os");
        var EMR_CONFIG = require('config').get('ehrserver');
        var path=require('path');
        var fs=require('fs');
        var url=req.query.url;
        var spawn = require('child_process').spawn;
        var exec = require('child_process').exec;
        var endPointURL=Utility.baseURL();
        ifile = url.replace(endPointURL,APP_ROOT_PATH+'/data');
        var userId=path.dirname(ifile).substring(path.dirname(ifile).lastIndexOf("/") + 1);
        var ofile = APP_ROOT_PATH+'/data/files/png/'+userId+'.png';
        ifile=path.normalize(ifile);
        ofile=path.normalize(ofile);
        fs.readdirSync(APP_ROOT_PATH+'/data/files/png/').forEach(file => {
            var fileName=file.toString();
            if(fileName.indexOf(userId)>=0)
                fs.unlink(APP_ROOT_PATH+'/data/files/png/'+file.toString());
        });
        if (!fs.existsSync(ifile))
            return res.json(Utility.output('TIFF file not found', 'ERROR'));

        var runCommand='convert '+ifile+' '+ofile;
        if(os.platform()=="win32")
            runCommand='magick convert '+ifile+' '+ofile;
        console.log("Ran Command: ",runCommand);
        exec(runCommand, function(err, stdout, stderr) {
            if (err) {
              console.log('exec error:', err);
              return res.json(Utility.output('Unable to convert tiff to png','ERROR'));
            }
            if(stderr)
            {
                console.log('stderr:', stderr);
                var pngArray=[];
                fs.readdirSync(APP_ROOT_PATH+'/data/files/png/').forEach(file => {
                    var fileName=file.toString();
                    if(fileName.indexOf(userId)>=0)
                        pngArray.push(endPointURL+'/files/png/'+file.toString());
                });
                if(pngArray.length)
                    return res.json(Utility.output(pngArray.length+" pages are found","SUCCESS",pngArray));
                return res.json(Utility.output('Unable to convert tiff to png','ERROR'));
            } 
            var pngArray=[];
            fs.readdirSync(APP_ROOT_PATH+'/data/files/png/').forEach(file => {
                var fileName=file.toString();
                if(fileName.indexOf(userId)>=0)
                    pngArray.push(endPointURL+'/files/png/'+file.toString());
            });
            if(pngArray.length)
                return res.json(Utility.output(pngArray.length+" pages are found","SUCCESS",pngArray));
            return res.json(Utility.output("No converted png not found","ERROR"));
        });
          /*
        var tiff2png = spawn('convert', [ifile, ofile]);
        tiff2png.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        tiff2png.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
            return res.json(Utility.output('Unable to convert tiff to png','ERROR'));
        });
        tiff2png.on('close', function (code) {
            var pngArray=[];
            fs.readdirSync(APP_ROOT_PATH+'/data/files/png/').forEach(file => {
                var fileName=file.toString();
                if(fileName.indexOf(userId)>=0)
                    pngArray.push(endPointURL+'/files/png/'+file.toString());
            });
            if(pngArray.length)
                return res.json(Utility.output(pngArray.length+" pages are found","SUCCESS",pngArray));
        });
        tiff2png.on('error', function (code) {
            return res.json(Utility.output('ERROR: Unable to convert tiff to png','ERROR'));
        });*/
    }; 
};