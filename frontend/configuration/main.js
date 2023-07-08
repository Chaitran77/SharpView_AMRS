// const w3w_input = document.getElementById("w3w_location");
// w3w_input.setAttribute("pattern", /^\/{0,}[^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}[.｡。･・︒។։။۔።।][^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}[.｡。･・︒។։။۔።।][^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}$/);

var AMRS_config = $.getJSON("/AMRS-config.json", 
    function(data, textStatus, jqXHR) {
        AMRS_config = data;
    }
);

var form_name = location.hash.substring(1);
if (form_name) {
    $("#" + form_name + "_config_form").css("display", "block");
} else {
    $("#basic_config_form").css("display", "block"); // to show the default
    window.location.hash = "#basic";
}

function change_form(to_form_name) {
    var from_form_name = location.hash.substring(1);
    $("#" + from_form_name + "_config_form").css("display", "none");
    $("#" + to_form_name + "_config_form").css("display", "block");
};

const urlParams = new URLSearchParams(window.location.search);

try {
    document.getElementById("converter_id").value = urlParams.get("converter_id")
    document.getElementById("sensor_code").value = urlParams.get("sensor_code")
    document.getElementById("w3w_location").value = urlParams.get("w3w_location")
    document.getElementById("manufacturer").value = urlParams.get("manufacturer")
    document.getElementById("model").value = urlParams.get("model")
} catch (error) {}

try {
    document.getElementById("ip_address").value = urlParams.get("ip_address")
    document.getElementById("port").value = urlParams.get("port")
    document.getElementById("inverter_station").value = urlParams.get("inverter_station")
    document.getElementById("manufacturer").value = urlParams.get("manufacturer")
    document.getElementById("model").value = urlParams.get("model")
} catch (error) {}


var colourPicker = document.getElementById("colourPicker");

function getColourPickerValue(pickerElem) {
    return pickerElem.value;
}

function colourEditor(cell, onRendered, success, cancel, editorParams) {
    var editor = document.createElement("input");
    editor.setAttribute("type", "color");

    editor.style.boxSizing = "border-box";
    editor.style.height = "3em";

    editor.value = cell.getValue();
    
    onRendered(function () {
        editor.focus();
        editor.click();
        editor.style.css = "100%";
    });

    function successFunc() {
        success(editor.value);
    }

    editor.addEventListener("change", successFunc);
    editor.addEventListener("blur", successFunc);


    return editor;
}


const sensor_table_wrapper = document.getElementById("sensor_table_wrapper");
var sensor_table;

const sensor_data = $.getJSON("/sensor-data?id=all",
    function (data, textStatus, jqXHR) {
        sensor_table = new Tabulator("#sensor_table_wrapper", {
            data: data,
	    width: "600px",
            //layout:"fitColumns",

            columns: [
                {formatter:"buttonCross", width:40, align:"center", cellClick:function(e, cell){
                    postDeleteRecord("sensor_table", cell.getRow());
                    cell.getRow().delete();
                }},
                {title:"Sensor Code", field:"sensor_code", editor:"input"},
                {title:"Converter ID", field:"converter_id", editor:"number"},
                {title:"Modbus Address", field:"modbus_address", editor:"number"},
                {title:"What3Words Location", field:"w3w_location", editor:"input"},
                {title:"Manufacturer", field:"manufacturer", editor:"input"},
                {title:"Model", field:"model", editor:"input"},
                // {title:"Colour", field:"colour", formatter: function(cell, formatterParams) {
                //     cell.getElement().style.backgroundColor = cell.getValue();
                //     // no need to return value even though it says so in the doc - it won't get displayed and is still stored
                // }, editor: colourEditor}
            ],

            dataChanged: function() {
                revealApplyChangesButton("sensor_table");
            }
            
        })
        
        // sensor_table_wrapper.innerText = data;
        // $("#sensor_table_wrapper").html(makeTable(data));
    }
);

const converter_table_wrapper = document.getElementById("converter_table_wrapper");
var converter_table;

const converter_data = $.getJSON("/converter-data?id=all",
    function (data, textStatus, jqXHR) {
        converter_table = new Tabulator("#converter_table_wrapper", {
            data: data,
            layout:"fitColumns",
            columns: [
                {formatter:"buttonCross", width:40, align:"center", cellClick:function(e, cell){
                    postDeleteRecord("converter_table", cell.getRow());
                    cell.getRow().delete();
                }},
                {title:"Converter ID", field:"converter_id", editor:"number"},
                {title:"IP Address", field:"ip_address", editor:"input"},
                {title:"Port", field:"port", editor:"number"},
                {title:"Inverter Station", field:"inverter_station", editor:"input"},
                {title:"Manufacturer", field:"manufacturer", editor:"input"},
                {title:"Model", field:"model", editor:"input"},
            ],

            dataChanged: function() {
                revealApplyChangesButton("converter_table");
            }
        });
    }
);



function revealApplyChangesButton(table_string) {
    if (table_string == "sensor_table") {
        $("#sensorsApplyChangesButton").css("display", "block");
    } else if (table_string == "converter_table") {
        $("#convertersApplyChangesButton").css("display", "block");
    }
}

function postDeleteRecord(table_string, row_elem) {
    $.post("delete-record?table=" + table_string,
                {recordData: row_elem.getData()}, 
                function(data, status, xhr) {
                    alert(data);
                    location.reload();
                }
            ).fail(function(data, status, xhr) {
                alert(data + "\nStatus: " + status);
            })
}

function postTableChanges(table_string) {
    switch (table_string) {
        case "sensor_table":
            $.post("update-table?table=" + table_string,
                {sensor_table_data: sensor_table.getData()}, 
                function(data, status, xhr) {
                    alert(data);
                    location.reload();
                }
            ).fail(function(data, status, xhr) {
                alert(data + "\nStatus: " + status);
            })
            break;

        case "converter_table":
            $.post("update-table?table=" + table_string,
                {converter_table_data: converter_table.getData()}, 
                function(data, status, xhr) {
                    alert(data);
                    location.reload();
                }
            ).fail(function(data, status, xhr) {
                alert(data + "\nStatus: " + status);
            })
            break;
    }
};


// setTimeout(function() {
//     sensor_table = document.querySelector("#sensor_table_wrapper > div > div.gridjs-wrapper > table");
//     for (var row=0; row<sensor_table.rows.length; row++) {
//         // for rows with converter ID indivisible by 2 apply a different colour to help distinguish between sensors with different converters
//         var row_elem = sensor_table.rows[row];
//         if (parseInt(row_elem.cells[1].innerHTML) % 2) {
//             // apply a background colour
//             for (var cell=0; cell<row_elem.cells.length; cell++) {
//                 $(row_elem.cells[cell]).css("background-color", "#1ea45f");
//                 $(row_elem.cells[cell]).css("color", "white");
//             }
//         }
//     }
// }, 1000);
