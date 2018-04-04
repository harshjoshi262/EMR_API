var document = require('../models/db_model');
var master = require('./MasterController');
var MasterController = new master();
var DomainModel = document.domainModel;
var uuid = require('node-uuid');
var sql = require('mssql');
var async = require('async');

var dbConn = {
    server: '172.16.99.65',
    database: "MEDCARE_LWEH_LIVE",
    user: 'sa',
    password: "password",
    pool: {
        max: 200,
        min: 10,
        idleTimeoutMillis: 30000
    }
};

var regExp = /\(([^)]+)\)/

//syncDoctors();
//syncVisitRecord();
//syncAdmissionRecord();
//addvisitIdtopatient()
//replaceDoctorIds();


function addvisitIdtopatient(visitid) {
    // DomainModel.Patient.find({ IsSync: 1 }, function (err, records) {
    //     log("Records Length: " + records.length)
    //     records.forEach(element => {
    //         //log(element._id+"    "+element.mrn);
    //         DomainModel.Visit.findOne({ 'searchBox.mrn': element.mrn }, (err, visitRec) => {
    //             //log(visitRec.searchBox.mrn);
    //             DomainModel.Patient.findOneAndUpdate({ _id: element._id }, { $push: { visitRecords: visitRec._id } }, { upsert: true }, (err, success) => {
    //                 if (err)
    //                     log(err)
    //                 else
    //                     log("Updated ")
    //             })
    //         })
    //     });
    // })

    DomainModel.Visit.find({ _id: visitid }, (err, visitRec) => {
        visitRec.forEach(element => {
            DomainModel.Patient.findOneAndUpdate({ _id: element.patientId }, { $push: { visitRecords: element._id } }, { upsert: true }, (err, success) => {
                if (err)
                    log(err)
                else
                    log("Updated ")
            })
        });
    })
}

function replaceDoctorIds() {
    DomainModel.Visit.find({ OPD_IPD: 1 }, function (err, records) {
        if (err)
            log(err);
        else {
            records.forEach(element => {
                DomainModel.User.findOne({ hisUserId: element.HIS_Doctor_ID }, function (err, userRecord) {
                    log(userRecord.userId + "       " + element.doctorId)
                    // DomainModel.Visit.update({ _id: element._id }, { $set: { doctorId: userRecord.userId } }, function (err, ok) {
                    //     if (err)
                    //         log(err)
                    //     else {
                    //         log(ok.doctorId)
                    //     }
                    // })
                })
            });
        }
    })
}

function syncDoctors() {
    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query('select * from M_DoctorMaster where ID in (129,130)', (err, result) => {
            if (err) {
                log("User not retrive from SQL: " + err);
            } else {
                log("Doctor to be updated: " + result.recordset.length);
                async.eachSeries(result.recordset, (doctor, asyncCallback) => {
                    let doctorId = uuid.v4();
                    let userToSave = new DomainModel.User();
                    userToSave._id = doctorId;
                    userToSave.userId = doctorId;
                    if (doctor.EmailId == null || doctor.EmailId == undefined || doctor.EmailId == '') {
                        userToSave.accessCode = doctor.ID + "@hlwe.com"
                        userToSave.email = doctor.ID + "@hlwe.com"
                    } else {
                        userToSave.accessCode = doctor.EmailId
                        userToSave.email = doctor.EmailId
                    }
                    userToSave.firstName = doctor.FirstName
                    userToSave.lastName = ' '
                    userToSave.userGroup = ' '
                    userToSave.gender = doctor.GenderId
                    userToSave.hisUserId = doctor.ID
                    userToSave.hospitalName = "HLWE"
                    userToSave.unit = 1
                    userToSave.prefix = "Dr."
                    userToSave.setPassword = "TRUE"
                    userToSave.userStatus = "active"
                    userToSave.signCode = "testSign2"
                    userToSave.userType = "doctor"
                    userToSave.password = "$2a$10$52/YxOvyfH93dydl01DjoO6f30D7hIynlnfQObgBJS1TGOMk8R2SC"
                    userToSave.save((err, success) => {
                        if (err) {
                            log("User Save Error: " + err)
                            asyncCallback()
                        } else {
                            let doctorToSave = new DomainModel.Doctor();
                            doctorToSave._id = success._id;
                            doctorToSave.accessCode = success.accessCode
                            doctorToSave.hospitalName = success.hospitalName
                            doctorToSave.password = success.password
                            doctorToSave.save(err => {
                                if (err) {
                                    log("Doctor Save Error: " + err)
                                    asyncCallback();
                                } else {
                                    log("Doctor created");
                                    asyncCallback();
                                }
                            })

                        }
                    })
                }, (err) => {
                    if (err)
                        log("Error in Async");
                    else
                        log("Doctor Sync completed");
                })
            }
        })
    })
}

function syncVisitRecord() {
    //var date=new Date('1998-03-04T00:00:00.000Z').getTime();
    ///let counter=0;
    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query(`select        
        dbo.DecodeUTF8EncodedString( T_Registration.FirstName) as name,
        T_Registration.DateOfBirth as DateOfBirth,
        T_Registration.MRNo as mrn,
        T_Registration.UnitID as unitId,
        T_Registration.RegistrationDate as RegistrationDate,
        T_Registration.GenderID as GenderCode,
        T_Registration.ID as HIS_PatientId,
        T_Registration.MobileNo as mobile,
        T_Registration.PrefixID as prefix,
        
        dbo.DecodeUTF8EncodedString(T_Registration_Details.CivilID) as nric,
        T_Registration_Details.MaritalStatusID as maritalStatus,
        T_Registration_Details.ReligionID as religion,
        T_Registration_Details.NationalityID as nationality,
        T_Registration_Details.OccupationId as Occupation,
        T_Registration_Details.Email as emailId,
        T_Registration_Details.PassportNo as passportNo,
        dbo.DecodeUTF8EncodedString(T_Registration_Details.ResAddress) as residentialAddress,
        T_Registration_Details.ResStateID as residentialState,
        T_Registration_Details.ResCityID as residentialCity,
        T_Registration_Details.ResCountryID as residentialCountry,
        T_Registration_Details.ResPinCode as residentialPostCode,

		M_GenderMaster.Description as gender,
        
        T_Visit.ID as OPD_IPD_ID,
        T_Visit.Date as VISITDate,

        T_Visit.OPDNO as visitNo,
        T_Visit.DepartmentID as DepartmentID,
        T_Visit.PatientType as patientType,
        T_Visit_Details.CabinID as CabinID,

        T_Visit.DoctorID as HIS_Doctor_ID,
        T_Visit_Details.VisitTypeID as VisitTypeID,

		M_CabinMaster.Description as clinicName,
		M_DepartmentMaster.Description as clinicalDepartment,
		M_DoctorMaster.FirstName as primaryDoctor,
        
        T_Sponsor.ID as payeeInfoId,
        T_Sponsor.OPD_IPD as OPD_IPD,
        T_Sponsor.PatientCategoryID as patientCatID,
        T_Sponsor.CompanyID as CompanyID,
        T_Sponsor.TariffID as tariffID,
        T_Sponsor.PriorityID as PriorityID,

		M_CompanyMaster.Description as companyName,
        M_CompanyMaster.CompanyTypeId as companyCode,
		M_TariffMaster.Description as tariff,
		M_PatientCategoryMaster.Description as patientCategory,

        T_patient_KinDetails.ID as kinId,
        T_patient_KinDetails.KinName as kinName,
        T_patient_KinDetails.KinRelationId as kinRelationID,
        T_patient_KinDetails.KinAddress as kinaddress,
        T_patient_KinDetails.KinMobileNo as kinmobile,
        T_patient_KinDetails.KinOccupationID as kinoccupationID,
		M_RelationMaster.Description as kinRelation
        
        from T_Visit 
        inner join T_sponsor on T_Visit.ID = T_Sponsor.VisitAdmissionID and T_Sponsor.OPD_IPD = 0
        inner join T_Registration on T_Visit.PatientID = T_Registration.ID 
        inner join T_Visit_Details on T_Visit.ID =T_Visit_Details.ID
        inner join T_Registration_Details on T_Registration.ID =T_Registration_Details.ID
        left join T_patient_KinDetails on T_Visit.ID = T_patient_KinDetails.Opd_Ipd_Id and T_patient_KinDetails.OPD_IPD = 0
		left join M_GenderMaster on M_GenderMaster.ID = T_Registration.GenderID
		left join M_CabinMaster on M_CabinMaster.ID = T_Visit_Details.CabinID
		left join M_DepartmentMaster on M_DepartmentMaster.ID = T_Visit.DepartmentID
		left join M_DoctorMaster on M_DoctorMaster.ID = T_Visit.DoctorID
        left join M_RelationMaster on M_RelationMaster.ID=T_patient_KinDetails.KinRelationId
		left join M_CompanyMaster on M_CompanyMaster.ID=T_Sponsor.CompanyID
		left join M_TariffMaster on M_TariffMaster.ID=T_Sponsor.TariffID
        left join M_PatientCategoryMaster on M_PatientCategoryMaster.ID=T_Sponsor.PatientCategoryID
        where T_Visit.id in (74578)`,
            (err, result) => {
                if (err) {
                    log("Error: " + err)
                } else {
                    //console.dir("Result: "+JSON.stringify(result.recordset))
                    console.log("Table Syncing Start")
                    async.eachSeries(result.recordset, function (record, asyncCallback) {
                        //log("Data: "+JSON.stringify(record));
                        //createRecord(record);
                        RegistorPatient(record, (err, patientId) => {
                            if (err) {
                                log("ERROR in Registor callback: " + err)
                                asyncCallback()
                            } else {
                                log("PatientID: " + patientId._id);
                                CreateVisit(record, patientId, (err, visitID) => {
                                    if (err) {
                                        //log("Error in Visit Callback: " + err)
                                        asyncCallback()
                                    } else {
                                        log("VisitID: " + visitID._id)
                                        addvisitIdtopatient(visitID._id)
                                        asyncCallback()
                                    }
                                })
                            }
                        })
                    }, function (err) {
                        if (err) {
                            log("Big Error Occured");
                        } else {
                            log("Big Task Completed");
                        }
                    })
                }
            })
    })
}

function syncAdmissionRecord() {
    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query(`select 
        dbo.DecodeUTF8EncodedString( T_Registration.FirstName) as name,
        T_Registration.DateOfBirth as DateOfBirth,
        T_Registration.MRNo as mrn,
        T_Registration.UnitID as unitId,
        T_Registration.RegistrationDate as RegistrationDate,
        T_Registration.GenderID as GenderCode,
        T_Registration.ID as HIS_PatientId,
        T_Registration.MobileNo as mobile,
        T_Registration.PrefixID as prefix,
        
        dbo.DecodeUTF8EncodedString(T_Registration_Details.CivilID) as nric,
        T_Registration_Details.MaritalStatusID as maritalStatus,
        T_Registration_Details.ReligionID as religion,
        T_Registration_Details.NationalityID as nationality,
        T_Registration_Details.OccupationId as Occupation,
        T_Registration_Details.Email as emailId,
        T_Registration_Details.PassportNo as passportNo,
        dbo.DecodeUTF8EncodedString(T_Registration_Details.ResAddress) as residentialAddress,
        T_Registration_Details.ResStateID as residentialState,
        T_Registration_Details.ResCityID as residentialCity,
        T_Registration_Details.ResCountryID as residentialCountry,
        T_Registration_Details.ResPinCode as residentialPostCode,

		M_GenderMaster.Description as gender,

        T_Admission.ID as OPD_IPD_ID,
        T_Admission.Date as VISITDate,

        T_Admission.IPDNO as visitNo,
        T_Admission.DepartmentID as DepartmentID,
        --T_Visit.PatientType as patientType,
        T_AdmissionDetails.BedID as bedID,
		M_AdmissionType.Description as admissionType,

        T_Admission.DoctorID as HIS_Doctor_ID,
        --T_Visit_Details.VisitTypeID as VisitTypeID,
		M_BedMaster.Description as BedDescription,
		M_WardMaster.ID as WardID,
		M_WardMaster.Description as Ward,
		M_RoomMaster.Description as room,
		--M_CabinMaster.Description as clinicName,
		M_DepartmentMaster.Description as clinicalDepartment,
		M_DoctorMaster.FirstName as primaryDoctor,
        
		T_Sponsor.ID as payeeInfoId,
        T_Sponsor.OPD_IPD as OPD_IPD,
        T_Sponsor.PatientCategoryID as patientCatID,
        T_Sponsor.CompanyID as CompanyID,
        T_Sponsor.TariffID as tariffID,
        T_Sponsor.PriorityID as PriorityID,

		M_CompanyMaster.Description as companyName,
        M_CompanyMaster.CompanyTypeId as companyCode,
		M_TariffMaster.Description as tariff,
		M_PatientCategoryMaster.Description as patientCategory,

		T_patient_KinDetails.ID as kinId,
        T_patient_KinDetails.KinName as kinName,
        T_patient_KinDetails.KinRelationId as kinRelationID,
        T_patient_KinDetails.KinAddress as kinaddress,
        T_patient_KinDetails.KinMobileNo as kinmobile,
        T_patient_KinDetails.KinOccupationID as kinoccupationID,
		M_RelationMaster.Description as kinRelation
        
        from T_Admission 
        inner join T_sponsor on T_Admission.ID = T_Sponsor.VisitAdmissionID and T_Sponsor.OPD_IPD = 1
        inner join T_Registration on T_Admission.PatientID = T_Registration.ID 
        inner join T_AdmissionDetails on T_Admission.ID =T_AdmissionDetails.ID
		left join M_GenderMaster on M_GenderMaster.ID = T_Registration.GenderID
		left join M_BedMaster on M_BedMaster.ID = T_AdmissionDetails.BedID
		left join M_WardMaster on M_WardMaster.ID = M_BedMaster.WardId
		left join M_DepartmentMaster on M_DepartmentMaster.ID = T_Admission.DepartmentID
		left join M_DoctorMaster on M_DoctorMaster.ID = T_Admission.DoctorID
        inner join T_Registration_Details on T_Registration.ID =T_Registration_Details.ID
        left join T_patient_KinDetails on T_Admission.ID = T_patient_KinDetails.Opd_Ipd_Id and T_patient_KinDetails.OPD_IPD = 1
		left join M_RelationMaster on M_RelationMaster.ID=T_patient_KinDetails.KinRelationId
		left join M_CompanyMaster on M_CompanyMaster.ID=T_Sponsor.CompanyID
		left join M_TariffMaster on M_TariffMaster.ID=T_Sponsor.TariffID
		left join M_RoomMaster on M_RoomMaster.ID = M_BedMaster.RoomId
		left join M_AdmissionType on M_AdmissionType.ID = T_AdmissionDetails.AdmissionType
        left join M_PatientCategoryMaster on M_PatientCategoryMaster.ID=T_Sponsor.PatientCategoryID
        where OPD_IPD_ID in (6247,
            6248,
            6226,
            6227,
            6229,
            6211)`,
            (err, result) => {
                if (err) {
                    log("Error: " + err)
                } else {
                    //console.dir("Result: "+JSON.stringify(result.recordset))
                    console.log("Table Syncing Start: " + result.recordset.length)
                    async.eachSeries(result.recordset, function (record, asyncCallback) {
                        //log("Data: "+JSON.stringify(record));
                        //createRecord(record);
                        RegistorPatient(record, (err, patientId) => {
                            if (err) {
                                //log("ERROR in Registor callback: " + err)
                                asyncCallback()
                            } else {
                                log("PatientID: " + patientId._id);
                                CreateVisit(record, patientId, (err, visitID) => {
                                    if (err) {
                                        //log("Error in Visit Callback: " + err)
                                        asyncCallback()
                                    } else {
                                        log("VisitID: " + visitID._id)
                                        //addvisitIdtopatient(visitID._id)
                                        asyncCallback()
                                    }
                                })
                            }
                        })
                    }, function (err) {
                        if (err) {
                            log("Big Error Occured");
                        } else {
                            log("Big Task Completed");
                        }
                    })
                }
            })
    })
}

module.exports.syncItemMasters=function(cb) {
    console.log("Called for Item Sync")
    var connection = new sql.ConnectionPool(dbConn);
    connection.connect().then(conn => {
        let request = new sql.Request(conn);
        request.query('select * from M_itemmaster where ItemGroup=13', (err, result) => {
            if (err) {
                log("User not retrive from SQL: " + err);
                cb(false);
            } else {
                console.log("Items to be updated: " + result.recordset.length);
                async.eachSeries(result.recordset, (item, asyncCallback) => {
                    item.TableName = 'm_drugmasters_new';
                    MasterController.InsertUpdateRecord(JSON.stringify(item), null, function (nothing, status, err) {
                        if (err != undefined)
                            log("Status is: " + status + " --- " + err);
                        asyncCallback();
                    })
                }, (err) => {
                    if (err){
                        log("Error in Async");
                        cb(false);
                    }else{
                        log("Item Master Sync completed");
                        cb(true);
                    }
                })
            }
        })
    })
}

function RegistorPatient(patient, registorCallback) {
    DomainModel.Patient.findOne({ mrn: patient.mrn }, (err, previousPatient) => {
        if (err) {
            //log("Error:" + err)
            registorCallback(err);
        } else if (previousPatient) {
            log("Already Created Patient");
            previousPatient = Object.assign(previousPatient, patient);
            previousPatient.dob = new Date(patient.DateOfBirth).getTime();
            DomainModel.Patient.findOneAndUpdate({ _id: previousPatient._id }, previousPatient, registorCallback)
            //asyncCallback();
        } else {
            var patientToSave = new DomainModel.Patient(patient);
            patientToSave.dob = new Date(patient.DateOfBirth).getTime();
            patientToSave.registrationDate = new Date(patient.RegistrationDate).getTime();
            patientToSave._id = uuid.v4();
            patientToSave.save(registorCallback)
        }
    })
}

function CreateVisit(visit, patientId, visitCallback) {

    DomainModel.Visit.findOne({ OPD_IPD_ID: visit.OPD_IPD_ID, OPD_IPD: visit.OPD_IPD }, (err, previousVisit) => {
        if (err) {
            visitCallback(err)
        } else if (previousVisit) {
            DomainModel.User.findOne({ hisUserId: visit.HIS_Doctor_ID }, (err, user) => {
                if (err) {
                    visitCallback(err);
                } else if (user) {
                    previousVisit = Object.assign(previousVisit, visit);
                    previousVisit.patientId = patientId
                    previousVisit.doctorId = user.userId
                    previousVisit.visitDate = new Date(visit.VISITDate).getTime();
                    if (visit.OPD_IPD == 0) {
                        previousVisit.visitType = (visit.VisitTypeID == 2) ? 'Follow Up' : 'New';
                        previousVisit.VisitTypeID = visit.VisitTypeID;
                        previousVisit.patientType = 'OP';
                    } else {
                        previousVisit.visitType = 'Admitted'
                        previousVisit.VisitTypeID = 6
                        previousVisit.patientType = 'IP';
                        if (visit.bedID !== null) {
                            var bed = {
                                admittingDoctor: visit.primaryDoctor,
                                admittingDepartment: visit.clinicalDepartment,
                                admissionType: visit.admissionType,
                                wardName: visit.Ward,
                                roomNo: visit.room,
                                bedNo: visit.BedDescription,
                                bedId: parseInt(visit.bedID)
                            }

                            let bedindex = -1;
                            previousVisit.BedInformation.forEach(function (element, elementIndex) {
                                if (element.bedId == visit.bedID)
                                    bedindex = elementIndex;
                            }, this);

                            if (bedindex < 0) {
                                previousVisit.BedInformation.push(bed)
                            } else {
                                previousVisit.BedInformation.splice(bedindex, 1, bed)
                            }
                        }
                    }
                    previousVisit.dateEpoch = new Date().getTime();
                    var searchData = {
                        WardID: visit.WardID,
                        CabinID: visit.CabinID,
                        clinicName: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        DepartmentID: visit.DepartmentID,
                        location: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        cinicalDepartment: visit.clinicalDepartment,
                        name: visit.name,
                        mrn: visit.mrn
                    }
                    previousVisit.searchBox = searchData;

                    if (visit.kinId !== null) {
                        var kinInfoObj = {
                            kinId: parseInt(visit.kinId),
                            name: visit.kinName,
                            relation: visit.kinRelation,
                            address: visit.kinaddress,
                            mobileno: visit.kinmobile,
                            occupation: visit.kinoccupationID
                        }

                        let kinindex = -1;
                        previousVisit.kinInfo.forEach(function (element, elementIndex) {
                            if (element.kinId == visit.kinId)
                                kinindex = elementIndex;
                        }, this);

                        if (kinindex < 0) {
                            previousVisit.kinInfo.push(kinInfoObj)
                        }
                        else {
                            previousVisit.kinInfo.splice(kinindex, 1, kinInfoObj)
                        }
                    }

                    if (visit.payeeInfoId !== null) {
                        var payeeInfoObj = {
                            payeeInfoId: parseInt(visit.payeeInfoId),
                            companyName: visit.companyName,
                            PatientCategory: visit.patientCategory,
                            tariff: visit.tariff,
                            priority: visit.PriorityID,
                            companyType: visit.companyCode
                        }

                        let payeeindex = -1;
                        previousVisit.payeeInfo.forEach(function (element, elementIndex) {
                            if (element.payeeInfoId == visit.payeeInfoId)
                                payeeindex = elementIndex;
                        }, this);

                        if (payeeindex < 0) {
                            previousVisit.payeeInfo.push(payeeInfoObj)
                        }
                        else {
                            previousVisit.payeeInfo.splice(payeeindex, 1, payeeInfoObj)
                        }

                    }

                    DomainModel.Visit.findOneAndUpdate({ _id: previousVisit._id }, previousVisit, visitCallback);
                } else {
                    log("Doctor not found: " + visit.HIS_Doctor_ID + '  ==== ' + visit.OPD_IPD_ID)
                    visitCallback('Doctor not Found');
                }
            })
        } else {
            DomainModel.User.findOne({ hisUserId: visit.HIS_Doctor_ID }, (err, user) => {
                if (err) {
                    visitCallback(err);
                } else if (user) {
                    var visitToSave = new DomainModel.Visit(visit);
                    visitToSave._id = uuid.v4();
                    visitToSave.patientId = patientId
                    visitToSave.doctorId = user.userId
                    visitToSave.visitDate = new Date(visit.VISITDate).getTime();
                    if (visit.OPD_IPD == 0) {
                        visitToSave.visitType = (visit.VisitTypeID == 2) ? 'Follow Up' : 'New';
                        visitToSave.VisitTypeID = visit.VisitTypeID;
                        visitToSave.patientType = 'OP';
                    } else {
                        visitToSave.visitType = 'Admitted'
                        visitToSave.VisitTypeID = 6
                        visitToSave.patientType = 'IP';
                        if (visit.bedID !== null) {
                            var bed = {
                                admittingDoctor: visit.primaryDoctor,
                                admittingDepartment: visit.clinicalDepartment,
                                admissionType: visit.admissionType,
                                wardName: visit.Ward,
                                roomNo: visit.room,
                                bedNo: visit.BedDescription,
                                bedId: parseInt(visit.bedID)
                            }
                            visitToSave.BedInformation.push(bed);
                        }
                    }
                    visitToSave.dateEpoch = new Date().getTime();
                    var searchData = {
                        WardID: visit.WardID,
                        CabinID: visit.CabinID,
                        clinicName: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        DepartmentID: visit.DepartmentID,
                        location: (visit.OPD_IPD == 0) ? visit.clinicName : visit.Ward,
                        cinicalDepartment: visit.clinicalDepartment,
                        name: visit.name,
                        mrn: visit.mrn
                    }
                    visitToSave.searchBox = searchData;

                    if (visit.kinId !== null) {
                        var kinInfoObj = {
                            kinId: parseInt(visit.kinId),
                            name: visit.kinName,
                            relation: visit.kinRelation,
                            address: visit.kinaddress,
                            mobileno: visit.kinmobile,
                            occupation: visit.kinoccupationID
                        }
                        visitToSave.kinInfo.push(kinInfoObj)
                    }

                    if (visit.payeeInfoId !== null) {
                        var payeeInfoObj = {
                            payeeInfoId: parseInt(visit.payeeInfoId),
                            companyName: visit.companyName,
                            PatientCategory: visit.patientCategory,
                            tariff: visit.tariff,
                            priority: visit.PriorityID,
                            companyType: visit.companyCode
                        }
                        visitToSave.payeeInfo.push(payeeInfoObj)
                    }

                    visitToSave.save(visitCallback)
                } else {
                    log("Doctor not found: " + visit.HIS_Doctor_ID + '  ==== ' + visit.OPD_IPD_ID)
                    visitCallback('Doctor not Found');
                }
            })
        }
    })
}
