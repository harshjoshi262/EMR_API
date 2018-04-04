
const hl7 = require("simple-hl7");
const PACS_CONFIG = require('../config/PACS')
var document = require('../models/db_model');
const documentObject = document.domainModel
let HL7Contrllor = require('../models/hl7-messages')

class Message {
    constructor(event) {
        this.Event = event;
        this.ControlId = null;
        this.MSH;
    }

    set MessageEvent(event) {
        this.Event = event;
    }

    set MessageControlId(number) {
        this.ControlId = number;
    }

    get getMessage() {
        if (this.MSH instanceof hl7.Message === false)
            throw new Error("MSH is not defined");
        return this.MSH;
    }

    addMSHSegment() {
        if (this.Event == null)
            throw new Error("Event not defined");
        if (isNaN(this.ControlId))
            throw new Error("ControlId not defined");
        this.MSH = new hl7.Message(
            PACS_CONFIG.Sending_App,                    //Sending App
            PACS_CONFIG.Sending_Facility,
            PACS_CONFIG.Receiving_App,                  //Receiving App
            PACS_CONFIG.Receiving_Facility,
            Utility.getHL7Date(new Date()),             //Date time of message
            "",
            this.Event,                                 //Message Type 
            this.ControlId,                             //MessageID 
            "P",
            PACS_CONFIG.Version                         //HL7 Message Version
        );
    }

    addEVNSegment() {
        this.MSH.addSegment("EVN",
            this.Event[1],                              //Type 
            Utility.getHL7Date(new Date())                     //Date time    
        );
    }

    addPIDSegment(data) {
        if (this.MSH instanceof hl7.Message === false)
            throw new Error("MSH is not defined");
        this.MSH.addSegment("PID",
            PACS_CONFIG.SetID,
            Utility.checkValidField(data.PatientID),              //Patient ID (HIS ID)
            Utility.checkValidField(data.MRN), //MRN
            "",
            Utility.checkValidField(data.Name),                         //Name
            "",
            Utility.getHL7Date(new Date(data.DOB)),                                                        //DOB
            //Utility.checkValidField(data.Gender),                            //Gender (F/M/O/U)
            PACS_CONFIG.GenderConstant[data.Gender],
            "",
            Utility.checkValidField(data.RaceID),                                                                 //Race Code
            [
                Utility.checkValidField(data.Address),
                "",
                Utility.checkValidField(data.City),
                Utility.checkValidField(data.State),
                Utility.checkValidField(data.PostCode),
                Utility.checkValidField(data.Country)
            ],                                                                  //Address
            Utility.checkValidField(data.Country),                       //Country Code
            [Utility.checkValidField(data.Mobile)],
            "", "",
            Utility.checkValidField(data.MaritalStatus),                 //Marital status Code
            Utility.checkValidField(data.Religion),                      //Religion Code
            "",
            "", "", "", "", "", "", "", "", "",
            Utility.checkValidField(data.Nationality)                    //Nationality Code
        );
    }

    addPV1Segment(data) {
        if (this.MSH instanceof hl7.Message === false)
            throw new Error("MSH is not defined");
        this.MSH.addSegment("PV1",
            PACS_CONFIG.SetID,               //Visit ID (HIS ID)
            Utility.checkValidField(data.PatientType),              //Patient Type (OP or IP)
            [Utility.checkValidField(data.Location), Utility.checkValidField(data.Room)],
            Utility.checkValidField(data.AdmissionType),                             //Admission Type
            "",
            "",
            [Utility.checkValidField(data.Doctor.ID), Utility.checkValidField(data.Doctor.Name)],
            [Utility.checkValidField(data.Doctor.ID), Utility.checkValidField(data.Doctor.Name)],
            [Utility.checkValidField(data.Doctor.ID), Utility.checkValidField(data.Doctor.Name)],
            "", "", "", "",
            "",
            "", "",
            [Utility.checkValidField(data.Doctor.ID), Utility.checkValidField(data.Doctor.Name)],
            "",
            Utility.checkValidField(data.AccountNo),                  //Visit No
            "",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            Utility.getHL7Date(new Date(data.VisitDate))
        );
    }

    addORCSegment(data) {
        if (this.MSH instanceof hl7.Message === false)
            throw new Error("MSH is not defined");
        this.MSH.addSegment("ORC",
            data.Order_Control,       //Type
            data.Order_No,           //Order No (change 1025 to orderID from HIS)
            "", "", "", "", "", "", "",
            ["", data.Enter_By],   //Enter By (change 1 to Doctor HIS ID) 
            ["", data.Verified_By],   //Verified By (change 1 to Doctor HIS ID)
            ["", data.Ordering_By],   //Ordering By (change 1 to Doctor HIS ID)
            "", "",
            Utility.getHL7Date(new Date(data.Order_Date)),
            "", "", "", "", "",
            [data.Ordering_Facility]
        )
    }

    addOBRSegment(data) {
        if (this.MSH instanceof hl7.Message === false)
            throw new Error("MSH is not defined");
        this.MSH.addSegment("OBR",
            0,
            data.OrderNo,       //Order No (change 1025 to orderID from HIS)
            "",
            [data.ProcedureCode, data.ProcedureName],     //Service Details (Change 10 to Service ID)
            data.Priority,
            Utility.getHL7Date(new Date(data.RequestedDate)),
            "", "", "", "", "", "", "", "", "",
            ["", data.Ordering_By],    //Ordering By (change 1 to Doctor HIS ID)
            "", "", "", "", "", "", "",
            [data.ModalityCode, data.ProcedureName],
            "", "", "", "", "",
            data.Transport, "", "", "", "", "", "", "", "", "", "", "", "", "",
            [data.ProcedureCode, data.ProcedureName],     //Procedure Details (Change 10 to Imaging procedure ID)
            data.Modifier
        )
    }
}


module.exports.SendMessage = function (event, messageNo, patientid, visitid, cb = function () { }) {
    let ADT = new Message(event);
    ADT.MessageControlId = messageNo;
    ADT.addMSHSegment();
    ADT.addEVNSegment();
    if (patientid) {
        documentObject.Patient.aggregate([
            {
                $match: {
                    _id: patientid
                }
            }, {
                $lookup: {
                    from: "m_race",
                    localField: "RaceID",
                    foreignField: "ID",
                    as: "Race"
                }
            }, {
                $lookup: {
                    from: "m_city",
                    localField: "residentialCity",
                    foreignField: "ID",
                    as: "City"
                }
            }, {
                $lookup: {
                    from: "m_state",
                    localField: "residentialState",
                    foreignField: "ID",
                    as: "State"
                }
            }, {
                $lookup: {
                    from: "m_country",
                    localField: "residentialCountry",
                    foreignField: "ID",
                    as: "Country"
                }
            }, {
                $lookup: {
                    from: "m_nationalities",
                    localField: "NationalityID",
                    foreignField: "ID",
                    as: "Nationality"
                }
            }, { $unwind: { path: "$Race", preserveNullAndEmptyArrays: true } }
            , { $unwind: { path: "$City", preserveNullAndEmptyArrays: true } }
            , { $unwind: { path: "$State", preserveNullAndEmptyArrays: true } }
            , { $unwind: { path: "$Country", preserveNullAndEmptyArrays: true } }
            , { $unwind: { path: "$Nationality", preserveNullAndEmptyArrays: true } }
            , {
                $project: {
                    "PatientID": "$HIS_PatientId",
                    "MRN": "$mrn",
                    "Name": "$name",
                    "DOB": "$dob",
                    "Gender": "$GenderCode",
                    "Race": "$Race.Code",
                    "Address": "$residentialAddress",
                    "City": "$City.Code",
                    "State": "$State.Code",
                    "PostCode": "$residentialPostCode",
                    "Country": "$Country.Code",
                    "Mobile": "$mobile",
                    "MaritalStatus": "$maritalStatus",
                    "Religion": "$religion",
                    "Nationality": "$Nationality.Description"
                }
            }
        ]).exec((err, data) => {
            if (err) {
                throw err;
                cb(false);
            }
            console.log("------------------------------------------>" + JSON.stringify(data[0]))
            ADT.addPIDSegment(data[0]);
            if (visitid) {
                documentObject.Visit.aggregate([
                    {
                        $match: {
                            _id: visitid
                        }
                    }, {
                        $lookup: {
                            from: "User",
                            localField: "HIS_Doctor_ID",
                            foreignField: "hisUserId",
                            as: "primaryDoctor"
                        }
                    }, {
                        $unwind: { path: "$primaryDoctor", preserveNullAndEmptyArrays: true }
                    }, {
                        $project: {
                            PatientType: {
                                $cond: {
                                    if: { $eq: ["$OPD_IPD", 0] },
                                    then: "O",
                                    else: "I"
                                }
                            },
                            Location: "$searchBox.location",
                            Room: "$searchBox.roomNo",
                            AdmissionType: "$encounterType",
                            Doctor: {
                                ID: "$primaryDoctor.hisUserId",
                                Name: "$primaryDoctor.firstName"
                            },
                            AccountNo: "$visitNo",
                            VisitDate: "$visitDate"
                        }
                    }
                ]).exec((err, success) => {
                    if (err) {
                        throw err;
                        cb(false);
                    }
                    else {
                        ADT.addPV1Segment(success[0]);
                        HL7Contrllor.sendToQueue2("A01", "A01", ADT.getMessage.log())
                        console.log("ADT Message has been sent.");
                        cb(true);
                        // if (orderId) {

                        // } else {
                        //     HL7Contrllor.sendToQueue2("A01", "A01", ADT.getMessage.log())
                        // }
                    }
                })
            } else {
                HL7Contrllor.sendToQueue2("A01", "A01", ADT.getMessage.log())
                cb(true);
            }
        })
    } else {
        console.log("[HL7 Message] PatientId not defined")
        cb(false);
    }
}


