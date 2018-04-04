var moment=require("moment");
exports.output = function (message, status, result) {
    if (!result)
        result = '';
    if (status === "SUCCESS") {
        return response = {
            "_error_message": "none",
            "_success_message": message,
            "_status_Code": 200,
            "_status": "done",
            "result": result
        }
    }
    else if (status === "VALIDATION_ERROR") {
        return response = {
            "_error_message": message,
            "_success_message": "none",
            "_status_Code": 407,
            "_status": "Validation Error",
            "result": result
        }
    }
    else if (status === "DUPLICATE_ERROR") {
        return response = {
            "_error_message": message,
            "_success_message": "none",
            "_status_Code": 405,
            "_status": "Duplicate Error",
            "result": result
        }
    }
    else if (status === "INVALID_TOKEN") {
        return response = {
            "_error_message": message,
            "_success_message": "none",
            "_status_Code": 403,
            "_status": "error",
            "result": result
        }
    }
    else if (status === "ERROR") {
        return response = {
            "_error_message": message,
            "_success_message": "none",
            "_status_Code": 406,
            "_status": "error",
            "result": result
        }
    }
    else {
        return response = {
            "_error_message": message,
            "_success_message": "none",
            "_status_Code": parseInt(status),
            "_status": "error",
            "result": result
        }
    }
};
exports.escape = function (text) {
    if (text === undefined) {
        return '';
    }
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) {
        return map[m];
    });
};
exports.unescape = function (string) {
    if (this.IsNullOrEmpty(string)) {
        return '';
    }
    var map = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    for (var key in map) {
        var entity = map[key];
        var regex = new RegExp(entity, 'g');
        string = string.replace(regex, key);
    }
    string = string.replace(/&quot;/g, '"');
    string = string.replace(/&#039/g, "'");
    string = string.replace(/&amp;/g, '&');
    return string;
};
exports.ValidateEmail = function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};
exports.ValidateDate = function (dateString) {
    // Check pattern
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateString))
        return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);

    if (year < 1000 || year > 3000 || month === 0 || month > 12)
        return false;

    var monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Adjust for leap years
    if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0))
        monthLength[1] = 29;

    return day > 0 && day <= monthLength[month - 1];
};
exports.checkObjectIdValidation = function (id) {
    var checkForHexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;
    if (id === "undefined") {
        return false;
    }
    return checkForHexRegExp.test(id);
};

exports.mongoObjectToNormalObject = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};

exports.IsNullOrEmpty = function (check) {
    var errors = false;
    if (typeof check === 'undefined') {
        errors = true;
    } else if (!check) {
        errors = true;
    }
    return errors;
};
exports.ValidURL = function (userInput) {
    var res = userInput.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if (res == null)
        return false;
    else
        return true;
}
exports.UrlToBase64Image = function (url, callback) {
    var thisObj = this;
    if (!thisObj.ValidURL(url))
        callback("Invalid URL", null);
    require('request')({
        url: url,
        encoding: 'binary'
    }
        , function (err, res, body) {
            if (err)
                callback(err, null);
            else {
                var type = res.headers["content-type"];
                var prefix = "data:" + type + ";base64,";
                var base64 = new Buffer(body, 'binary').toString('base64');
                var dataURI = prefix + base64;
                callback(null, dataURI);
            }
        });
};
exports.calculateAgeInMonth = function (milisecond) {
    var now = new Date();
    var today = new Date(now.getYear(), now.getMonth(), now.getDate());
    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(milisecond);
    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;
    if (monthNow >= monthDob)
        var monthAge = monthNow - monthDob;
    else {
        yearAge--;
        var monthAge = 12 + monthNow - monthDob;
    }
    if (dateNow >= dateDob)
        var dateAge = dateNow - dateDob;
    else {
        monthAge--;
        var dateAge = 31 + dateNow - dateDob;
        if (monthAge < 0) {
            monthAge = 11;
            yearAge--;
        }
    }
    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
    };
    return ((age.years * 12) + (age.months));
};
exports.baseURL = function () {
    var EMR_CONFIG = require('config').get('ehrserver');
    var endPointURL = "http://";
    if (EMR_CONFIG.secured !== undefined)
        if (EMR_CONFIG.secured)
            endPointURL = "https://";
    endPointURL += EMR_CONFIG.ip;
    if (EMR_CONFIG.serverPort !== undefined)
        if (EMR_CONFIG.serverPort)
            endPointURL += ":" + EMR_CONFIG.serverPort;
    return endPointURL;
};
exports.localBaseURL = function () {
    var EMR_CONFIG = require('config').get('ehrserver');
    var endPointURL = "http://";
    if (EMR_CONFIG.secured !== undefined)
        if (EMR_CONFIG.secured)
            endPointURL = "https://";
    endPointURL += "localhost";
    if (EMR_CONFIG.serverPort !== undefined)
        if (EMR_CONFIG.serverPort)
            endPointURL += ":" + EMR_CONFIG.serverPort;
    return endPointURL;
};
exports.sizeOfObject = function (myObj) {
    Object.size = function (obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };
    return Object.size(myObj);
};

exports.getHL7Date = function (date) {
    let year = date.getFullYear()
    let month = pad(date.getMonth() + 1)
    let day = pad(date.getDate())
    let hour = pad(date.getHours())
    let min = pad(date.getMinutes())
    let sec = pad(date.getSeconds())
    //return year + month + day + hour + min + sec
    return year.toString() + month.toString() + day.toString() + hour.toString() + min.toString() + sec.toString()
}

exports.toSQLDate=function(date) {
    return date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' ;
        // ('00' + date.getUTCHours()).slice(-2) + ':' +
        // ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        // ('00' + date.getUTCSeconds()).slice(-2);
}

function pad(val) {
    return (val < 10) ? '0' + val : val
}

exports.checkValidField = function (field) {
    if (typeof field === 'undefined' || field == null || field == "")
        return '';
    else
        return field;
}
exports.isJson=function(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

exports.calculateAge=function(milisecond){
    var now = new Date();
    var today = new Date(now.getYear(),now.getMonth(),now.getDate());
    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(milisecond);
    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;
    if (monthNow >= monthDob)
      var monthAge = monthNow - monthDob;
    else {
      yearAge--;
      var monthAge = 12 + monthNow -monthDob;
    }
    if (dateNow >= dateDob)
      var dateAge = dateNow - dateDob;
    else {
      monthAge--;
      var dateAge = 31 + dateNow - dateDob;
      if (monthAge < 0) {
        monthAge = 11;
        yearAge--;
      }
    }
    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
        };
    return age;
};
exports.calculateAgeByReference=function(birthdayMilisond,referenceMilisecond){
    var now = new Date(moment(referenceMilisecond).format("YYYY/MM/DD"));
    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(birthdayMilisond);
    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;
    if (monthNow >= monthDob)
      var monthAge = monthNow - monthDob;
    else {
      yearAge--;
      var monthAge = 12 + monthNow -monthDob;
    }
    if (dateNow >= dateDob)
      var dateAge = dateNow - dateDob;
    else {
      monthAge--;
      var dateAge = 31 + dateNow - dateDob;
      if (monthAge < 0) {
        monthAge = 11;
        yearAge--;
      }
    }
    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
        };
    return age;
};
exports.call_api=function(opta,callback){
    var options = {
        'url': opta.url,
        'method': opta.method || 'GET',
        'headers': opta.headers,
        'form': opta.form || {}
    };

    request(options, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(null,body);
        }
        else
            callback(error,null);
    });
};

