uuid = require('node-uuid'),
    user_audit = require('./user_audit.js'),
    integrationModel = require('./integrationAmqp.js'),
    http = require('http'),
    require('graylog'),
    _ = require('lodash')
var async = require('async')
var fs = require('fs')
document = require('./db_model.js')
var documentObject = document.domainModel;
var masterObject = document.mastersModel;
module.exports.convertVisitMrn = function () {
    documentObject.Visit.find().populate({ path: 'patientId', model: 'Patient' }).exec(function (err, visits) {
        var count = 0;
        // console.log(visits)
        _.forEach(visits, function (item) {
            var update = {};
            update['mrn'] = parseInt(item.patientId.mrn);
            update['searchBox.mrn'] = parseInt(item.patientId.mrn);
            documentObject.Visit.update({ _id: item._id }, update, { 'upsert': true }, function (err) {
                if (!err) {
                    console.log(update)
                }
            })
        })
    })
}
module.exports.resourceGrouping = function () {
    masterObject.Resource.aggregate([{
        "$group": {
            '_id': "$type",
            'items': { "$push": '$_id' },
        },
    }], function (err, groups) {
        var groupCount = 1;
        var itemCount = 1;
        _.forEach(groups, function (groupItem) {
            var update = {};
            update.groupIndex = groupCount++;
            _.forEach(groupItem.items, function (recordId) {
                update.itemIndex = itemCount++;
                masterObject.Resource.update({ '_id': recordId }, update, { 'upsert': true }, function (err) {
                    if (err) console.log(err);
                })
            })
        })
        console.log('done')
    })
}
module.exports.resourceLinking = function () {
    masterObject.Resource.find().sort({ 'groupIndex': 1, 'itemIndex': 1 }).exec(function (err, groups) {
        var nextIndex = 1;
        var resources = JSON.parse(JSON.stringify(groups))
        _.forEach(resources, function (groupItem) {
            var update = {};
            var temp = resources[nextIndex++];
            update.next = temp ? temp.itemIndex : (10000000);
            masterObject.Resource.update({ '_id': groupItem._id }, update, { 'upsert': true }, function (err) {
                if (err) console.log(err);
            })

        })
        console.log('done')
    })
}
module.exports.resourceSerialization = function () {
    masterObject.Resource.find({}, '_id', function (err, groups) {
        _.forEach(groups, function (groupItem) {
            var update = {};
            var position = _.findIndex(groups, groupItem);
            update.next = groups[position + 1] ? groups[position + 1]._id : null;

            masterObject.Resource.update({ '_id': groupItem._id }, update, { 'upsert': true }, function (err) {
                if (err) console.log(err);
            })

        })
        console.log('done')
    })
}
module.exports.updateResourcePosition = function (data, res) {
    var temp = [];
    temp.push(parseInt(data.itemIndex));
    temp.push(parseInt(data.next));
    temp.push(parseInt(data.lookup));
    masterObject.Resource.find({ next: { $in: temp } }).exec(function (err, cursor) {
        // var nextIndex = 1;
        var response = [];
        var resources = JSON.parse(JSON.stringify(cursor))
        _.forEach(resources, function (item) {
            var update = {};
            if (item.next == data.itemIndex) {
                update.next = data['next'];
                item.next = data["next"];
            } else if (item.next == data.lookup) {

                update.next = data.itemIndex;
                item.next = data.itemIndex;

            }
            if (item.itemIndex == data.itemIndex) {
                update.next = data["lookup"];
                item.next = data["lookup"];
            }
            masterObject.Resource.update({ '_id': item._id }, update, { 'upsert': true }, function (err) {
                if (err) console.log(err);
            })
            response.push(item)

        })
        res.json(response)
    })
}
