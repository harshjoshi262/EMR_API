var parseString = require('xml2js').parseString;
var net = require("net");
var EMR_CONFIG = require('config').get('ehrserver');
module.exports = function MimsController() {
    this.execute = function (xmlQuery, callback) {
        var returnObj = {};
        var successful=false;
        try {
            var mainData = "";
            var client = new net.Socket();
            console.log('xmlQuery',xmlQuery);
            client.connect(EMR_CONFIG.mims_server_port, EMR_CONFIG.mims_server_ip, function () {
                client.write(xmlQuery + '\n');
            });
            client.on('data', function (data) {
                if (data === "$$END$$")
                    client.destroy(); // kill client after server's response
                mainData += data;
            });
            client.on('close', function () {
                mainData = mainData.replace("$$END$$", "");
                parseString(mainData, function (mainData, resultJSON) {
                    successful=true;
                    return callback(returnObj = {
                        'xml': mainData,
                        'json': resultJSON,
                        'status':'success'
                    });
                });
            });
        } catch (e) {
           return callback(returnObj = {
                        'xml': 'error',
                        'json': {},
                        'status':'error',
                        'timeout':3000
                    });
        }
        setTimeout(function(){
            if(!successful)
            {
                console.log("Time out fire");
                callback({
                    'xml': 'error',
                    'json': {},
                    'status':'error',
                    'timeout':3000
                });
            }
        },3000);
    };
};