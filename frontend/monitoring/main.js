// periodically issue requests to backend to get data: sensor states (DB), last alert (query DB)
const sensor_states_url = "/data/sensor-states";
const alarms_data_url = "/data/alarms-data?id=all";
const config_url = "/AMRS-config.json";
const alarm_sound_url = "media/audio/alarm-sound.wav"
const alarm_sound_2_url = "media/audio/alarm-sound-2.wav"

const new_alarms_url = "/data/new-alarms";

var alarm_sound_loops = 0; // used to know if alarm is already ringing and how many times to loop sound.
var alarm_sound = new Audio(alarm_sound_2_url);
alarm_sound.loop = true;

var alarm_icon = document.getElementById("alarm_icon");

var AMRS_config = null;
$.get(config_url, function(data, status) {
    AMRS_config = JSON.parse(data);

    document.getElementById("site-name-label").innerText = AMRS_config.id;
    document.getElementById("site-ip-label").innerText = AMRS_config.IP_addr;
    document.getElementById("site-email-label").innerText = AMRS_config.email.local_email;
});


var sensor_dots = [];
var grid_view = document.getElementById("grid_view");

var sensor_data;
var get_sensor_data = $.getJSON("/sensor-data?id=all",
        function (data, textStatus, jqXHR) {
            sensor_data = data;
            var sensor_dot;

            for (let i=1; i<=sensor_data.length; i++) {
                sensor_dot = document.createElement("div");
                $(sensor_dot).attr("class", "sensor_dot");
                $(sensor_dot).attr("data-tooltip", "Nothing yet");
                grid_view.appendChild(sensor_dot);
                sensor_dots.push(sensor_dot);

                if (i%20 == 0) {
                    grid_view.appendChild(document.createElement("br"));
                };
            }
        }
    );


function alarmRowFormatter(row) {
    var data = row.getData();
    
    if (data.responded == 0) {
        // row.getElement().style.background = "rgba(255,0,0,1)";
        row.getElement().setAttribute("class", row.getElement().getAttribute("class") + " new-event-colour")
        row.getElement().style.color = "#FFF";
    } else {
        row.getElement().style.background = "rgb(75, 150, 75)";
        row.getElement().style.color = "#FFF";
    }
    
    row.getCells()[4].getElement().style.background = "#FFF";
}


const alarms_table_wrapper = document.getElementById("alarms_table_wrapper");
var alarms_table;

function createAlarmsTable() {
    alarms_table = new Tabulator("#alarms_table_wrapper", {
        rowFormatter: alarmRowFormatter,
        data: alarms_data,
        pagination:"local",
        paginationSize:10,

        initialSort:[
            {column:"alarm_time", dir:"desc"}
        ],

        columns: [
            {title:"Alarm ID", field:"alarm_id"},
            {title:"Sensor Code", field:"sensor_code", formatter: function(cell) {
                data = cell.getData();
                //colour = sensor_data.filter(sensor=>sensor.sensor_code==data.sensor_code)[0].colour;
                //console.log(colour);
                //cell.getElement().style.background = "radial-gradient(circle, " + colour + " 25%, rgba(0, 0, 0, 0) 27%)";
                
                return data.sensor_code
            }},
            {title:"Alarm Time", field:"alarm_time"},
            {title:"Location", formatter: "link", formatterParams: {
                url: function (cell) {
                    data = cell.getData();
                    var sensor_location = sensor_data.filter(sensor=>sensor.sensor_code==data.sensor_code)[0].w3w_location;
                    return "https://what3words.com/" + sensor_location;
                },

                label: function (cell) {
                    data = cell.getData();
                    var sensor_location = sensor_data.filter(sensor=>sensor.sensor_code==data.sensor_code)[0].w3w_location;
                    return sensor_location;
                },
                target: "_blank"
            }},
            {title:"Acknowledged", field:"responded", editor:"tickCross", formatter:"tickCross", align:"center", cellEdited: function(cell) {
                                                                                                    postAlarmResponse(cell);
                                                                                                }}
        ],

        rowUpdated: function(row) {
            row.reformat();
            // SEND UPDATE to server
        }            

    });
    alarms_table.element.addEventListener("wheel", function(e) {
        if (e.deltaY > 0) {
            alarms_table.nextPage();
        } else {
            alarms_table.previousPage();
        }
    })
    
}

// function (cell) {
//     data = cell.getData();
//     var sensor_location = sensor_data.filter(sensor=>sensor.sensor_code==data.sensor_code)[0].w3w_location;
    
//     elem = document.createElement("a");
//     elem.src = "https://what3words.com/" + sensor_location;
//     // cell.getElement().appendChild(elem);
//     return "<a src='" + elem.src + "'> "+ elem.src +" </a>";
// }

// , formatter: function(cell) {
//     data = cell.getData();
//     var dateTime = new Date(Date.parse(data));
//     // dateTime.toDateString() + " @ " + dateTime.toTimeString();
//     return data;
// }

var alarms_data;

var get_alarms_data = $.getJSON(alarms_data_url,
        function (data, textStatus, jqXHR) {
            alarms_data = data;
        }
    );


$.when(get_alarms_data, get_sensor_data).then(function() {
    console.log(alarms_data)
    createAlarmsTable();
})


function postAlarmResponse(alarmsCellComponent, table_string="alarms_table") {
    console.log(alarmsCellComponent.getData());
    $.post("/configuration/update-table?table=" + table_string,
        {alarms_table_data: alarmsCellComponent.getData()}, 
        function(data, status, xhr) {
            alert(data);
        }
    ).fail(function(data, status, xhr) {
        alert(data + "\nStatus: " + status);
    })
}

var alarmSoundInterval;

function playAlarmSound() {
    
    // alarmSoundInterval = setInterval(function() {
    //     alarm_sound.play();
    // }, alarm_sound.duration*1000);
    $("#alarm_icon").show();
    alarm_sound.play();

    setTimeout(function() {
        alarm_sound.pause();
        alarm_sound.currentTime = 0;
        $("#alarm_icon").hide();
    }, alarm_sound.duration*1000*4)
}


// Check for new alarms and update alarms table data every 3 seconds
setInterval(function () {
    $.getJSON(alarms_data_url, function (data) {
        alarms_table.replaceData(data);
    });

    $.get(new_alarms_url, function (data, status, xhr) {
        console.log(data);
        console.log(data == false);
        if ((data.toString() == "true") && alarm_sound.paused) {
            playAlarmSound();    
        } else if (data != false) {
            location.reload(); // will redirect to login page
        }
    })
}, 3000)


setInterval(function() {
    $.get(sensor_states_url, function(data, status) {
        var states = JSON.parse(data);
        let i = 0;

        const time = new Date().toLocaleTimeString();

        for (const id in states) {
            if (Object.hasOwnProperty.call(states, id)) {
                const element = states[id];
                
                if (element == 0) {
                    $(sensor_dots[i]).attr("class", "sensor_dot sensor_dot_high")
                } else if (element == 1) {
                    $(sensor_dots[i]).attr("class", "sensor_dot sensor_dot_low")
                } else if (element == -1) {
                    // -1 = no data and modbus requests failing
                    $(sensor_dots[i]).attr("class", "sensor_dot sensor_dot_warn")
                }
                var sensor_obj = sensor_data.filter(sensor=>sensor.sensor_code==id)[0];
                    

                const tooltip_str = `DB_ID: ${id} \nState: ${element?"Sensor triggered":"Normal"} \nLast update: ${time} \nw3w location: ${sensor_obj.w3w_location} \nManufacturer: ${sensor_obj.manufacturer} \nModel: ${sensor_obj.model}`
                $(sensor_dots[i]).attr("data-tooltip", tooltip_str)
                
                i++;
            }
        }

    }).fail(function() {
        for (let i = 0; i < sensor_dots.length; i++) {
            $(sensor_dots[i]).attr("class", "sensor_dot sensor_dot_warn")

            var current_tooltip_str = $(sensor_dots[i]).attr("data-tooltip").split(" \n");

            current_tooltip_state = current_tooltip_str[1].split(": ");
            
            if (current_tooltip_state[1] != "Unknown - requests failing") {
                current_tooltip_state[1] = "Unknown - requests failing";
            }

            current_tooltip_str[1] = current_tooltip_state.join(": ");

            $(sensor_dots[i]).attr("data-tooltip", current_tooltip_str.join(" \n"));
        }
    })
}, 200)
