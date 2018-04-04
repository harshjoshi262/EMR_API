var async = require('async');
var uuid = require('node-uuid')
var ObjectID = require('mongoose').Types.ObjectId;

var Utility = require('../libs/utility');
var document = require('../models/db_model');

var MimsController = require('./MimsController');
var mimsInstance = new MimsController();
var domainModel = document.domainModel;
var MasterModel = document.mastersModel;
/**
 * @author Soham Krishna Paul
 */
module.exports = function InteractionsController() {
    this.get = function (req, res, next) {
        var thisObj = this;
        var drugs = req.body.drugs;
        var allergies = req.body.allergies;
        var healths = req.body.healths;
        var patientId = req.body.patientId;
        var returnObj = {
            "flag": false,
            "drug_to_drug": {
                "errors": null,
                "result": null,
                "duplicate_drugs": [],
                'flag': false
            },
            "drug_to_allergy": {
                "errors": null,
                "result": null,
                'flag': false
            },
            "drug_to_health": {
                "errors": null,
                "result": null,
                'flag': false
            },
        };
        // console.log(drugs)
        async.parallel([
            function (callback_parallel) {
                thisObj.drug_to_drug(drugs, patientId, function (errors, result) {
                    returnObj.drug_to_drug.errors = errors;
                    returnObj.drug_to_drug.result = result.interaction;
                    returnObj.drug_to_drug.duplicate_drugs = result.duplicate_drugs;
                    if (result.interaction !== undefined || result.duplicate_drugs !== undefined) {
                        if (result.interaction.length || result.duplicate_drugs.length) {
                            returnObj.drug_to_drug.flag = true;
                            returnObj.flag = true;
                        }
                    }
                    callback_parallel();
                });
            },
            function (callback_parallel) {
                thisObj.drug_to_allergy(drugs, allergies, function (errors, result) {
                    returnObj.drug_to_allergy.errors = errors;
                    returnObj.drug_to_allergy.result = result;
                    if (result.length > 0) {
                        returnObj.drug_to_allergy.flag = true;
                        returnObj.flag = true;
                    }
                    callback_parallel();
                });
            },
            function (callback_parallel) {
                thisObj.drug_to_health(drugs, healths, function (errors, result) {
                    returnObj.drug_to_health.errors = errors;
                    returnObj.drug_to_health.result = result;
                    if (result) {
                        returnObj.drug_to_health.flag = true;
                        returnObj.flag = true;
                    }
                    callback_parallel();
                });
            },
        ], function () {
            if (returnObj.drug_to_drug.flag || returnObj.drug_to_allergy.flag || returnObj.drug_to_health.flag)
                returnObj.flag = true
            return res.json(Utility.output('Execution Completed', 'SUCCESS', returnObj));
        });
    };
    this.buildQueryXML = function (opta) {
        var guidExist = {};
        var xml = '<Request><Interaction>';
        if (opta.drugs !== undefined) {
            if (opta.drugs.length)
                xml += '<Prescribing>';
            for (var i = 0; i < opta.drugs.length; i++) {
                var drug = opta.drugs[i];
                if (!drug)
                    continue;
                if (drug.GUID === undefined || drug.GUID === null)
                    continue;
                drug.GUID = drug.GUID.replace("{", "");
                drug.GUID = drug.GUID.replace("}", "");
                if (guidExist[drug.GUID] !== undefined)
                    continue;
                switch ((drug.MIMSTYPE + "").toUpperCase()) {
                    case "PRODUCT":
                        xml += '<Product reference="{' + drug.GUID + '}" />';
                        break;
                    case "GENERICITEM":
                        xml += '<GenericItem reference="{' + drug.GUID + '}" />';
                        break;
                    case "GGPI":
                        xml += '<GGPI reference="{' + drug.GUID + '}" />';
                        break;
                }
                guidExist[drug.GUID] = true;
            }
            if (opta.drugs.length)
                xml += '</Prescribing>';
        }

        if (opta.allergies !== undefined) {
            if (opta.allergies.length)
                xml += '<Allergies>';
            for (var i = 0; i < opta.allergies.length; i++) {
                var allergy = opta.allergies[i];
                allergy.GUID = allergy.GUID.replace("{", "");
                allergy.GUID = allergy.GUID.replace("}", "");
                switch ((allergy.MIMSTYPE + "").toUpperCase()) {
                    case "MOLECULE":
                        xml += '<Molecule reference="{' + allergy.GUID + '}" />';
                        break;
                    case "GGPI":
                        xml += '<GGPI reference="{' + allergy.GUID + '}" />';
                        break;
                    case "ACTIVECOMPOSITIONGROUP":
                        xml += '<ActiveCompositionGroup reference="{' + allergy.GUID + '}" />';
                        break;
                    case "SUBSTANCECLASS":
                        xml += '<SubstanceClass reference="{' + allergy.GUID + '}" />';
                        break;
                }
            }
            if (opta.drugs.length)
                xml += '</Allergies>';
        }
        xml += '<References /><DuplicateTherapy/><DuplicateIngredient/></Interaction></Request>';
        //console.log(xml)
        return xml;
    };
    this.extractDuplicateDrugs = function (data, patientId, maps, callback) {
        var returnJSON = [];
        var existMolecule = {};
        if (!data) {
            callback("Unable to connect to MIMS Server", false);
        }
        else {
            if (data.Result.Interaction[0].DuplicateIngredient[0].Warning !== undefined) {
                var levelMaster = {
                    "1": "The drugs share the same chemical substance.",
                    "2": "The drugs share the same chemical/therapeutic/pharmacological subgroup.",
                    "3": "The drugs share the same therapeutic/pharmacological subgroup."
                };
                async.eachSeries(data.Result.Interaction[0].DuplicateIngredient[0].Warning, function iteratee(eachDuplicateDrugs, each_callback1) {
                    var moleculeName = eachDuplicateDrugs.Molecule[0]["$"].name.toUpperCase().trim();
                    if (existMolecule[moleculeName] === undefined) {
                        existMolecule[moleculeName] = {
                            level: levelMaster[eachDuplicateDrugs["$"].Level],
                            molecule_name: eachDuplicateDrugs.Molecule[0]["$"].name.toUpperCase(),
                            drugs: []
                        };
                    }
                    if (eachDuplicateDrugs.Molecule[0].GGPI !== undefined) {
                        async.eachSeries(eachDuplicateDrugs.Molecule[0].GGPI, function (eachData, each_callback2) {
                            if (existMolecule[moleculeName].drugs.indexOf(maps.drugMap[eachData["$"].reference]) === -1)
                                existMolecule[moleculeName].drugs.push(maps.drugMap[eachData["$"].reference]);
                            each_callback2();
                        }, function () {
                            each_callback1();
                        });
                    }
                    else if (eachDuplicateDrugs.Molecule[0].Product !== undefined) {
                        async.eachSeries(eachDuplicateDrugs.Molecule[0].Product, function (eachData, each_callback2) {
                            if (existMolecule[moleculeName].drugs.indexOf(maps.drugMap[eachData["$"].reference]) === -1)
                                existMolecule[moleculeName].drugs.push(maps.drugMap[eachData["$"].reference]);
                            each_callback2();
                        }, function () {
                            each_callback1();
                        });
                    }
                    else if (eachDuplicateDrugs.Molecule[0].GenericItem !== undefined) {
                        async.eachSeries(eachDuplicateDrugs.Molecule[0].GenericItem, function (eachData, each_callback2) {
                            if (existMolecule[moleculeName].drugs.indexOf(maps.drugMap[eachData["$"].reference]) === -1)
                                existMolecule[moleculeName].drugs.push(maps.drugMap[eachData["$"].reference]);
                            each_callback2();
                        }, function () {
                            each_callback1();
                        });
                    }
                    else {
                        each_callback1();
                    }
                }, function () {
                    async.eachSeries(existMolecule, function (eachData, each_callback3) {
                        domainModel.Medication.find({ drugId: { $in: eachData.drugs }, 'patientId': patientId }, function (err, drugInfo) {
                            if (err) {
                                returnJSON.push(eachData);
                                each_callback3();
                            } else {
                                eachData.medication = JSON.parse(JSON.stringify(drugInfo));
                                MasterModel.m_drugmasters_new.find({ _id: { $in: eachData.drugs } }, '_id ItemCode ItemName', function (err, masterDrugInfo) {
                                    if (err) {
                                        returnJSON.push(eachData);
                                        each_callback3();
                                    } else {
                                        eachData.drugDetails = JSON.parse(JSON.stringify(masterDrugInfo));
                                        returnJSON.push(eachData);
                                        each_callback3();
                                    }
                                })

                            }
                        });
                    }, function () {
                        callback(null, returnJSON);
                    });
                });
            }
            else
                callback(null, returnJSON);
        }
    };
    this.buildOutputJSOND2D = function (data, maps, callback) {
        var returnJSON = [];
        if (!data) {
            callback(returnJSON);
        }
        else {
            if (data.Result.Interaction[0].Product !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].Product.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].Product[ix];
                    if (eachPrimaryProduct.Route === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;
                    var routeNamePrimary = eachPrimaryProduct.Route[0]["$"].name;
                    var interationProducts = (eachPrimaryProduct.Route[0].Product !== undefined) ? eachPrimaryProduct.Route[0].Product : [];
                    var interationGGPI = (eachPrimaryProduct.Route[0].GGPI !== undefined) ? eachPrimaryProduct.Route[0].GGPI : [];
                    var interationGenericItem = (eachPrimaryProduct.Route[0].GenericItem !== undefined) ? eachPrimaryProduct.Route[0].GenericItem : [];
                    /*******************Interaction With Product*********************/
                    for (var jx = 0; jx < interationProducts.length; jx++) {
                        var eachSecondaryProduct = interationProducts[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GGPI*********************/
                    for (var jx = 0; jx < interationGGPI.length; jx++) {
                        var eachSecondaryProduct = interationGGPI[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId.substring(1, productSecondaryGUId.length - 1)],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GenericItem*********************/
                    for (var jx = 0; jx < interationGenericItem.length; jx++) {
                        var eachSecondaryProduct = interationGenericItem[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId.substring(1, productSecondaryGUId.length - 1)],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                }
            }
            if (data.Result.Interaction[0].GGPI !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].GGPI.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].GGPI[ix];
                    if (eachPrimaryProduct.Route === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;
                    var routeNamePrimary = eachPrimaryProduct.Route[0]["$"].name;
                    var interationProducts = (eachPrimaryProduct.Route[0].Product !== undefined) ? eachPrimaryProduct.Route[0].Product : [];
                    var interationGGPI = (eachPrimaryProduct.Route[0].GGPI !== undefined) ? eachPrimaryProduct.Route[0].GGPI : [];
                    var interationGenericItem = (eachPrimaryProduct.Route[0].GenericItem !== undefined) ? eachPrimaryProduct.Route[0].GenericItem : [];
                    /*******************Interaction With Product*********************/
                    for (var jx = 0; jx < interationProducts.length; jx++) {
                        var eachSecondaryProduct = interationProducts[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachPrimaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GGPI*********************/
                    for (var jx = 0; jx < interationGGPI.length; jx++) {
                        var eachSecondaryProduct = interationGGPI[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GenericItem*********************/
                    for (var jx = 0; jx < interationGenericItem.length; jx++) {
                        var eachSecondaryProduct = interationGenericItem[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId.substring(1, productSecondaryGUId.length - 1)],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                }
            }
            if (data.Result.Interaction[0].GenericItem !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].GenericItem.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].GenericItem[ix];
                    if (eachPrimaryProduct.Route === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;
                    var routeNamePrimary = eachPrimaryProduct.Route[0]["$"].name;
                    var interationProducts = (eachPrimaryProduct.Route[0].Product !== undefined) ? eachPrimaryProduct.Route[0].Product : [];
                    var interationGGPI = (eachPrimaryProduct.Route[0].GGPI !== undefined) ? eachPrimaryProduct.Route[0].GGPI : [];
                    var interationGenericItem = (eachPrimaryProduct.Route[0].GenericItem !== undefined) ? eachPrimaryProduct.Route[0].GenericItem : [];
                    /*******************Interaction With Product*********************/
                    for (var jx = 0; jx < interationProducts.length; jx++) {
                        var eachSecondaryProduct = interationProducts[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GGPI*********************/
                    for (var jx = 0; jx < interationGGPI.length; jx++) {
                        var eachSecondaryProduct = interationGGPI[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId.substring(1, productSecondaryGUId.length - 1)],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                    /*******************Interaction With GenericItem*********************/
                    for (var jx = 0; jx < interationGenericItem.length; jx++) {
                        var eachSecondaryProduct = interationGenericItem[jx];
                        var productSecondary = eachSecondaryProduct["$"].name;
                        var productSecondaryGUId = eachSecondaryProduct["$"].reference;
                        var routeNameSecondary = eachSecondaryProduct.Route[0]["$"].name;
                        eachSecondaryProduct = eachSecondaryProduct.Route[0];
                        var classInterection = eachSecondaryProduct.ClassInteraction[0];
                        var moleculePrimary = classInterection.PrescribingInteractionClass[0].PrescribingMolecule[0]["$"].name;
                        var moleculeSecondary = classInterection.InteractionClass[0].Molecule[0]["$"].name;
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                },
                                {
                                    _id: maps.drugMap[productSecondaryGUId.substring(1, productSecondaryGUId.length - 1)],
                                    GUID: productSecondaryGUId.substring(1, productSecondaryGUId.length - 1),
                                    name: productSecondary
                                }
                            ],
                            heading: productPrimary + "(" + moleculePrimary + "/" + routeNamePrimary + ") vs " + productSecondary + "(" + moleculeSecondary + "/" + routeNameSecondary + ")",
                            iteraction_effect: moleculePrimary + " " + classInterection.Observation[0].Professional[0] + " " + moleculeSecondary,
                            document_level: {
                                name: classInterection.Documentation[0]["$"].name,
                                ranking: classInterection.Documentation[0]["$"].ranking,
                            },
                            serverityLevel: {
                                name: classInterection.Severity[0]["$"].name,
                                ranking: classInterection.Severity[0]["$"].ranking,
                            },
                            probable_mechanism: classInterection.Interaction[0].Professional[0],
                            precaution: [],
                            references: classInterection.References
                        };
                        for (var kx = 0; kx < classInterection.Precaution.length; kx++) {
                            temp.precaution.push(classInterection.Precaution[kx].Professional[0]);
                        }
                        returnJSON.push(temp);
                    }
                }
            }
            callback(returnJSON);
        }
    };
    this.buildOutputJSOND2A = function (data, maps, callback) {
        var returnJSON = [];
        if (!data) {
            callback(returnJSON);
        }
        else {
            if (data.Result.Interaction[0].Product !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].Product.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].Product[ix];
                    if (eachPrimaryProduct.Allergy === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;

                    if (eachPrimaryProduct.Allergy[0].SubstanceClass !== undefined) {
                        var allergyId = eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].reference;
                        allergyId = allergyId.replace("_", "-");
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                }
                            ],
                            allergies: [
                                {
                                    _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                    GUID: allergyId.substring(1, allergyId.length - 1),
                                    name: (eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name) ? eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                }
                            ],
                            heading: "Patient may be allergic to precribe drug: " + productPrimary,
                            allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name + " "
                                + productPrimary + " contains "
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                + " which belongs to same Substance Class"
                        };
                        returnJSON.push(temp);
                    }
                    if (eachPrimaryProduct.Allergy[0].Molecule !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive === undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Molecules "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " from " + productPrimary
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].GGPI !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                }
            }
            if (data.Result.Interaction[0].GenericItem !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].GenericItem.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].GenericItem[ix];
                    if (eachPrimaryProduct.Allergy === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;

                    if (eachPrimaryProduct.Allergy[0].SubstanceClass !== undefined) {
                        var allergyId = eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].reference;
                        allergyId = allergyId.replace("_", "-");
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                }
                            ],
                            allergies: [
                                {
                                    _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                    GUID: allergyId.substring(1, allergyId.length - 1),
                                    name: (eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name) ? eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                }
                            ],
                            heading: "Patient may be allergic to precribe drug: " + productPrimary,
                            allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name + " "
                                + productPrimary + " contains "
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                + " which belongs to same Substance Class"
                        };
                        returnJSON.push(temp);
                    }
                    if (eachPrimaryProduct.Allergy[0].Molecule !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive === undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Molecules "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " from " + productPrimary
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].GGPI !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                }
            }
            if (data.Result.Interaction[0].GGPI !== undefined) {
                for (var ix = 0; ix < data.Result.Interaction[0].GGPI.length; ix++) {
                    var eachPrimaryProduct = data.Result.Interaction[0].GGPI[ix];
                    if (eachPrimaryProduct.Allergy === undefined)
                        continue;
                    var productPrimary = eachPrimaryProduct["$"].name;
                    var productPrimaryGUId = eachPrimaryProduct["$"].reference;

                    if (eachPrimaryProduct.Allergy[0].SubstanceClass !== undefined) {
                        var allergyId = eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].reference;
                        allergyId = allergyId.replace("_", "-");
                        var temp = {
                            drugs: [
                                {
                                    _id: maps.drugMap[productPrimaryGUId],
                                    GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                    name: productPrimary
                                }
                            ],
                            allergies: [
                                {
                                    _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                    GUID: allergyId.substring(1, allergyId.length - 1),
                                    name: (eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name) ? eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                }
                            ],
                            heading: "Patient may be allergic to precribe drug: " + productPrimary,
                            allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0]["$"].name + " "
                                + productPrimary + " contains "
                                + eachPrimaryProduct.Allergy[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                + " which belongs to same Substance Class"
                        };
                        returnJSON.push(temp);
                    }
                    if (eachPrimaryProduct.Allergy[0].Molecule !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : maps.allergyNameMap[allergyId.substring(1, allergyId.length - 1)]
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].Molecule[0].CrossSensitive === undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].Molecule[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: (eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name) ? eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name : eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Molecules "
                                    + eachPrimaryProduct.Allergy[0].Molecule[0]["$"].name
                                    + " from " + productPrimary
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].ActiveCompositionGroup[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                    if (eachPrimaryProduct.Allergy[0].GGPI !== undefined) {
                        if (eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0] != undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].SubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which belongs to same Substance Class"
                            };
                            returnJSON.push(temp);
                        }
                        else if (eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name !== undefined) {
                            var allergyId = eachPrimaryProduct.Allergy[0].GGPI[0]["$"].reference;
                            allergyId = allergyId.replace("_", "-");
                            var temp = {
                                drugs: [
                                    {
                                        _id: maps.drugMap[productPrimaryGUId],
                                        GUID: productPrimaryGUId.substring(1, productPrimaryGUId.length - 1),
                                        name: productPrimary
                                    }
                                ],
                                allergies: [
                                    {
                                        _id: maps.allergyMap[allergyId.substring(1, allergyId.length - 1)],
                                        GUID: allergyId.substring(1, allergyId.length - 1),
                                        name: eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    }
                                ],
                                heading: "Patient may be allergic to precribe drug: " + productPrimary,
                                allergy_history: "Patient has know as a history of allergic reaction Substance Class."
                                    + eachPrimaryProduct.Allergy[0].GGPI[0]["$"].name
                                    + " " + productPrimary + " contains "
                                    + eachPrimaryProduct.Allergy[0].GGPI[0].CrossSensitive[0].SubstanceClass[0].PrescribingSubstanceClass[0].PrescribingMolecule[0]["$"].name
                                    + " which is cross sensitive"
                            };
                            returnJSON.push(temp);
                        }
                        else { }
                    }
                }
            }
            callback(returnJSON);
        }
    };
    this.drug_to_drug = function (drugs, patientId, callback_main) {
        var errors = [];
        var d2dMap = {};
        var drugOccurence = {};
        var opta = {
            'drugs': [],
        };
        var thisObj = this;
        var drugObjectIDs = drugs.map(function (id) {
            if (!Utility.checkObjectIdValidation(id)) {
                errors.push(id + ' is invalid drug id');
                return false;
            }
            if (drugOccurence[id] === undefined)
                drugOccurence[id] = 0;
            ++drugOccurence[id];
            return id;
        });

        if (!drugObjectIDs.length)
            return callback_main(errors, false);
        //  MasterModel.m_drugmasters_new.find({}, function (err, drugDetails) {
        MasterModel.m_drugmasters_new.find({ _id: { $in: drugObjectIDs } }, function (err, drugDetails) {
            if (err) {
                errors.push(err);
                return callback_main(errors, false);
            }
            if (!drugDetails.length) {
                errors.push('No durgs have been found');
                return callback_main(errors, false);
            }
            async.eachSeries(drugDetails, function iteratee(drug, each_callback) {
                if (drug.GUID == null) {
                    each_callback();
                }
                else {
                    var temp = {
                        'MIMSTYPE': drug.MIMSTYPE,
                        'GUID': (drug.GUID).replace(/[{()}]/g, '')
                    };
                    d2dMap[drug.GUID] = drug._id;
                    for (var ix = 0; ix < drugOccurence[drug._id]; ix++)
                        opta.drugs.push(temp);
                    each_callback();
                }
            }, function () {
                if (opta.drugs.length) {
                    mimsInstance.execute(thisObj.buildQueryXML(opta), function (mimsResult) {
                        if (mimsResult.status == 'error') {
                            console.log("RE Attempt");
                            /***************Second Attempt*******************/
                            mimsInstance.execute(thisObj.buildQueryXML(opta), function (mimsResult) {
                                if (mimsResult.status == 'error') {
                                    return callback_main(['mims server is not responding'], false);
                                }
                                else {
                                    thisObj.buildOutputJSOND2D(mimsResult.json, { drugMap: d2dMap, allergyMap: {} }, function (resultInteraction) {
                                        var returnObj = {
                                            interaction: resultInteraction,
                                            duplicate_drugs: []
                                        };
                                        thisObj.extractDuplicateDrugs(mimsResult.json, patientId, { drugMap: d2dMap, allergyMap: {} }, function (error, resultDuplicate) {
                                            returnObj.duplicate_drugs = resultDuplicate;
                                            if (error) {
                                                return callback_main(error, false);
                                            } else {
                                                return callback_main(errors, returnObj);
                                            }
                                        });
                                    });
                                }
                            });
                        }
                        else {
                            thisObj.buildOutputJSOND2D(mimsResult.json, { drugMap: d2dMap, allergyMap: {} }, function (resultInteraction) {
                                var returnObj = {
                                    interaction: resultInteraction,
                                    duplicate_drugs: []
                                };
                                thisObj.extractDuplicateDrugs(mimsResult.json, patientId, { drugMap: d2dMap, allergyMap: {} }, function (error, resultDuplicate) {
                                    returnObj.duplicate_drugs = resultDuplicate;
                                    if (error) {
                                        return callback_main(error, false);
                                    } else {
                                        return callback_main(errors, returnObj);
                                    }

                                });
                            });
                        }
                    });
                } else
                    return callback_main(errors, false);
            });
        });
    };
    this.drug_to_allergy = function (drugs, allergies, callback_main) {
        var map = {
            drugMap: {},
            allergyMap: {},
            allergyNameMap: {}
        };
        var drugMap = {};
        var errors = [];
        var opta = {
            'drugs': [],
            'allergies': []
        };
        var thisObj = this;
        var drugObjectIDs = drugs.map(function (id) {
            if (!Utility.checkObjectIdValidation(id)) {
                errors.push(id + ' is invalid drug id');
                return false;
            }
            return new ObjectID(id);
        });
        var allergyObjectIDs = allergies.map(function (id) {
            if (!Utility.checkObjectIdValidation(id)) {
                errors.push(id + ' is invalid allergy id');
                return false;
            }
            return new ObjectID(id);
        });
        async.parallel([
            function (callback_parallel) {
                MasterModel.m_drugmasters_new.find({ _id: { $in: drugObjectIDs } }, function (err, drugDetails) {
                    if (err) {
                        errors.push(err);
                        return callback_parallel();
                    }
                    if (!drugDetails.length) {
                        errors.push('No drugs have been found');
                        return callback_parallel();
                    }
                    async.eachSeries(drugDetails, function iteratee(drug, each_callback) {
                        var temp = {
                            'MIMSTYPE': drug.MIMSTYPE,
                            'GUID': drug.GUID
                        };
                        map.drugMap[drug.GUID] = drug._id;
                        opta.drugs.push(temp);
                        each_callback();
                    }, function () {
                        callback_parallel();
                    });
                });
            },
            function (callback_parallel) {
                MasterModel.m_allergy.find({ _id: { $in: allergyObjectIDs } }, function (err, allergyDetails) {
                    if (err) {
                        errors.push(err);
                        return callback_parallel();
                    }
                    if (!allergyDetails.length) {
                        errors.push('No allergies have been found');
                        return callback_parallel();
                    }

                    async.eachSeries(allergyDetails, function iteratee(allergy, each_callback) {
                        var temp = {
                            'MIMSTYPE': allergy.MIMSTYPE,
                            'GUID': allergy.GUID
                        };
                        map.allergyMap[allergy.GUID] = allergy._id;
                        map.allergyNameMap[allergy.GUID] = allergy.Allergy_Name;
                        opta.allergies.push(temp);
                        each_callback();
                    }, function () {
                        callback_parallel();
                    });
                });
            },
        ], function () {
            if (opta.drugs.length && opta.allergies.length) {
                mimsInstance.execute(thisObj.buildQueryXML(opta), function (mimsResult) {
                    //callback_main(errors, mimsResult.json);
                    if (mimsResult.status === 'error') {
                        console.log("RE Attempt");
                        mimsInstance.execute(thisObj.buildQueryXML(opta), function (mimsResult) {
                            //callback_main(errors, mimsResult.json);
                            if (mimsResult.status === 'error') {
                                callback_main(['mims server is not responding'], false);
                            }
                            else {
                                thisObj.buildOutputJSOND2A(mimsResult.json, map, function (returnObj) {
                                    callback_main(errors, returnObj);
                                });
                            }
                        });
                    }
                    else {
                        thisObj.buildOutputJSOND2A(mimsResult.json, map, function (returnObj) {
                            callback_main(errors, returnObj);
                        });
                    }
                });
            } else
                callback_main(errors, false);
        });
    };
    this.drug_to_health = function (drugs, healths, callback_main) {
        var errors = [];
        return callback_main(errors, false);
    };
    this.addDrug = function () {
        var drugToSave = new MasterModel.m_drugmasters_new();
        drugToSave.Item_code = '1';
        drugToSave.save(function (err, result) {
            log(err);
            log(result)
        });
    };
    this.addAllergy = function () {
        var drugToSave = new MasterModel.m_allergy();
        drugToSave.save(function (err, result) {
            log(err);
            log(result)
        });
    };
};
