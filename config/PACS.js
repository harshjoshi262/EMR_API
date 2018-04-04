module.exports={
    Sending_App:"CliniCare",
    Sending_Facility:"",
    Receiving_App:"RIS",
    Receiving_Facility:"",
    SetID:1,
    ImagingURL:'http://172.16.100.38/pkg_pacs/external_interface.aspx?TYPE=V&LID=THIS&LPW=THIS&AN=',
    ADT_A01:["ADT", "A01"],
    ADT_A04:["ADT","A04"],
    ADT_A08:["ADT","A08"],
    ORM_O01:["ORM","O01"],
    ORU_R01:["ORU","R01"],
    Version:2.4,
    GenderConstant:{
        1:"M",
        2:"F",
        3:"U",
        4:"U"
    },
    OrderStatus:{
        "A":"Check In",
        "CA":"Cancelled",
        "SC":"completed",
        "CM":"completed"
    },
    rabbitMQ_Config:{
        exchange:"PACS_Messages",
        queue:[
            // {
            //     name:"ADT",
            //     keys:["A01","A04","A08"]
            // },
            // {
            //     name:"ORM",
            //     keys:["O01"]
            // },
            {
                name:"ORU",
                keys:["R01"]
            }
        ]
    }
}