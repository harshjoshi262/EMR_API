var sql = require("mssql");
var SQL_CONFIG = require('config').get('HISDB')

var dbConn = {
    server: SQL_CONFIG.server,
    database: SQL_CONFIG.database,
    user: SQL_CONFIG.user,
    password: SQL_CONFIG.password,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

//var cp = new sql.Connection(dbConn);

sql.connect(dbConn).then(function () {
    log('[MSSQL] Connected & Connection pool open');
}).catch(function (err) {
    log('[MSSQL] Error creating connection pool ' + err.message);
});

exports.getLabCategory = function (req, res) {
    var request = new sql.Request(cp);
    request.query('select ID,Description from M_PathoCategory where IsEMRCategory=1').then(function (recordset) {
        var response = {
            '_error_message': 'None',
            '_status_Code': 200,
            '_status': 'Done',
            'result': recordset
        }
        res.status(200).json(response)
    }).catch(function (err) {
        log('[MSSQL] Request Error' + err);
        var response = {
            '_error_message': 'Request Error',
            '_status_Code': 406,
            '_status': '',
            'result': ''
        }
        res.status(406).send(response)
    })
}

exports.getLabList = function (req, res) {
    var request = new sql.Request(cp);
    var Code = req.params.category;
    var term = req.params.search;
    request.query('select top 20 ID,Description from M_PathoTestMaster where CategoryID=' + Code + ' and Description like\'%' + term + '%\'').then(function (recordset) {
        var response = {
            '_error_message': 'None',
            '_status_Code': 200,
            '_status': 'Done',
            'result': recordset
        }
        res.status(200).json(response)
    }).catch(function (err) {
        log('[MSSQL] Request Error' + err);
        var response = {
            '_error_message': 'Request Error',
            '_status_Code': 406,
            '_status': '',
            'result': ''
        }
        res.status(406).send(response)
    })
}

