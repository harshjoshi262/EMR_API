var mongoose = require('mongoose'),	
	uuid = require('node-uuid');
require('graylog');
document = require('./db_model.js');
var documentObject = document.domainModel;


// drug details by drug name
//use patientAgeCategory to get default dose for pediatric patient / adult patient
exports.getGenericDrugWithDetails = function (drugName, res) {
	documentObject.Drug.findOne({ name: drugName, isAvailable: true }, function (err, result) {
		if (err) {
			var error = { "_status": err };
			res.send(error).status(500);
		} else {
			if (!isFieldFilled(result)) {
				var error = { "_status": "no such drug available" };
				res.send(error).status(401);
			} else {
				res.send(result).status(200);
			}
		}

	});

}

// add  generic drug information

exports.addGenericDrugWithDetails = function (data, res) {
	console.log("add Drug Information");
	var drugTosave = new documentObject.Drug();
	drugTosave._id = uuid.v4();
	drugTosave.name = data.name;
	drugTosave.make = data.make;
	drugTosave.class = data.class;
	drugTosave.type = data.type;
	drugTosave.generic = data.generic;
	drugTosave.stock = data.stock;
	drugTosave.cost = data.cost;
	drugTosave.conditions = data.conditions;
	drugTosave.contraIndications = data.contradictions;
	drugTosave.sideEffects = data.sideEffects;
	drugTosave.allergies = data.allergies;
	drugTosave.save(function (err, result) {
		if (err) throw err
		else {
			var response = { "_status": "done" }
			res.send(response).status(200);
		}

	});

	//res.send(200);	

}


function isFieldFilled(value) {
	if (typeof value !== 'undefined' && value != "" && value != null) {
		return true;
	} else {
		return false;
	}
}

