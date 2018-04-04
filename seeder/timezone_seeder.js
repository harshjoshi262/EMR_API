var fs=require("fs");
var async=require("async");
var timezones=JSON.parse(fs.readFileSync('../timezones/timezones.json'));
var returnObj={};
async.forEachOf(timezones, function iteratee(eachZone, index, callback_eachForeach) {
    eachZone=eachZone.substr(0, eachZone.lastIndexOf(")") + 1).replace('(','').replace(")","");
    if(returnObj[eachZone]===undefined)
        returnObj[eachZone]=[];
    returnObj[eachZone].push(index);
    callback_eachForeach();
},function(){
    fs.writeFile('../timezones/gmt2utc.json', JSON.stringify(returnObj), 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    }); 
});

