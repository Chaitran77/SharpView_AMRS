// Use `npm install <pkg> --save` afterwards to install a package and save it as a dependency in the package.json file.
// mysql was installed with the following commands: https://askubuntu.com/a/934576
// Use github.com/nexe/nexe to compile

/* DB and Moxa NPort driver setup commands in setup_logs.log */


const express = require('express');
const crypto = require('crypto');
const randtoken = require('rand-token')
const bodyParser = require('body-parser');
const querystring = require('querystring');
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const fs = require('fs');
const JSON5 = require('json5');


const ModbusRTU = require('modbus-serial');
const { config } = require('process');


require('dotenv').config()
console.log(process.env);

var app = express();
var sensor_states = {};
var prev_sensor_states = {};
var new_alarm_time_period = 3000;
var alarm_within_last_time_period = false;
var configuration = JSON5.parse(fs.readFileSync('AMRS_config.json'));


const alarm_state = !configuration.sensor_setup.normally_closed;


const users = JSON.parse(fs.readFileSync("users.json"));

const getHashedPassword = (password) => {
	const sha256 = crypto.createHash('sha256');
	const hash = sha256.update(password).digest('base64');
	return hash;
}

function checkHash(user, hash) {

	if (!(users[user] == undefined)) {
		return users[user].password == hash;
	} else {
		return false;
	}
}



function checkAccess(req, res, next) {

	// check if logged in by trying to find a user with the same accessToken as the request has
	for (const [user, properties] of Object.entries(users)) {
		if (res.locals.cookie.accessToken != undefined) {
			if (properties.token === res.locals.cookie.accessToken) {
					
				// check if the user is allowed to access the scope
				if (req.baseUrl.includes(properties.scope) || properties.scope == "all") {
					next();
					return;
				} else {
					res.status(403).send();
					return;
				}
			}
		}
	}
	res.status(403).redirect("/login?target=" + encodeURIComponent(req.baseUrl) + encodeURIComponent(req.url));

}

var client = new ModbusRTU();
client.connectRTUBuffered("/dev/ttyMoxa0", { baudRate: 9600 });
client.setTimeout(300);


async function getSensorStates(id) {
	
	try {
		// set ID of slave
		await client.setID(id);
		// read the 1 registers starting at address 0 (first register)
		let val = await client.readDiscreteInputs(32, 8);
		// return the value
		return val.data[0] == true ? 1 : 0;
	} catch (e) {
		// if error return -1
		return -1
	}

}

async function request_sensor_states() {
	var all_sensors_info; // data retrieved from sensor table

	mysql_con.query("SELECT * FROM sensors", async function (error, results) {

		if (error) throw error;
		all_sensors_info = results;

		try {
			// get value of all sensors
			for (var sensor = 0; sensor < all_sensors_info.length; sensor++) {
				const sensor_info = all_sensors_info[sensor];

				var prev_state = prev_sensor_states[sensor_info.sensor_code];

				var retreived_sensor_data = await getSensorStates(sensor_info.modbus_address); // should only be 1, 0 or -1, where 1 = normal, 0 = triggered and -1 = unknown
				// output value to console

				sensor_states[sensor_info.sensor_code] = retreived_sensor_data;

				if (retreived_sensor_data != -1)
				sensor_states[sensor_info.sensor_code] = (alarm_state^retreived_sensor_data); // logical XOR without converting the output to a boolean (standardises the resulting value in accordance to the states in the above comment and README)
				

				if ((sensor_states[sensor_info.sensor_code] == !alarm_state) && (prev_state == alarm_state)) { // a rising edge. TODO: Need to change to falling edge for production
					console.log("CHANGED")
					alarm_within_last_time_period = true;
					setTimeout(function () {
						alarm_within_last_time_period = false;
					}, new_alarm_time_period)
					await action_procedure(sensor_info);
				}

				// wait 100ms before get another device
				await sleep(100);
			}
		} catch (e) {
			// if error, handle them here (it should not)
			console.log(e)
		} finally {
			console.log(sensor_states);

			// after getting all data from slave, repeat it again
			prev_sensor_states = sensor_states;

			setImmediate(() => {
				request_sensor_states();
			})
		}

	})
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));



let transport;
if (configuration.alarm_actions.email) {
	transport = nodemailer.createTransport({
		host: configuration.email.smtp_server,
		port: configuration.email.port,
		// secure: true,
		// service: "gmail",
		auth: {
			user: configuration.email.auth.user,
			pass: configuration.email.auth.pass
		}
	});
}

async function action_procedure(sensor_info) {
	if (configuration.alarm_actions.email) {
		const date = new Date();
		const message = {
			from: configuration.email.address,
			to: configuration.email.recipient_list,
			subject: "AMRS Cut-loop alarm",
			html: `An AMRS cut-loop alarm occurred at ${configuration.id}.<br>Sensor ${sensor_info.sensor_code} was tripped at: ${date.toLocaleTimeString()} on ${date.toLocaleDateString("en-GB")}.<br>W3W location: <a href="https://what3words.com/${sensor_info.w3w_location}">${sensor_info.w3w_location}</a>.<br><br>To view alarms, go to: <a href="http://${configuration.IP_addr}:${configuration.monitoring_port}/monitoring">${configuration.IP_addr}:${configuration.monitoring_port}/monitoring</a><br>For AMRS support, email: <a href="mailto:${configuration.support_email}?subject=AMRS%20Query">${configuration.support_email}</a>`
		}

		await transport.sendMail(message, function (err, info) {
			if (err) {
				console.log(err);
				// log to errors?
			} else {
				console.log(info);
			}
		})
	}

	// log to ALARMS table
	var sql = `INSERT INTO alarms (
		sensor_code
        ) VALUES ( 
        '${sensor_info.sensor_code}'
    );`;
	console.log(sql);
	mysql_con.query(sql, function (err, result) {
		if (err) {
			// respond with error code - causes form fields to go red
			console.log("Record insertion failed");
			console.log(err);
		} else {
			// respond with 200
			console.log("Record successfully inserted");
		}
	})
}




var mysql_con = mysql.createConnection({
	host: "127.0.0.1", // connection refused if this is "localhost"
	user: "sharpview_amrs",
	password: process.env.SHARPVIEW_AMRS_DB_PASS,
	database: "SharpView_AMRS_" + "development_site"//configuration.id
})

mysql_con.connect(function (err) {
	if (err) throw err;
	console.log("Connected");
})

request_sensor_states();



app.use((req, res, next) => {
	const { headers: { cookie } } = req;
	if (cookie) {
		const values = cookie.split(';').reduce((res, item) => {
			const data = item.trim().split('=');
			return { ...res, [data[0]]: data[1] };
		}, {});
		res.locals.cookie = values;
	}
	else res.locals.cookie = {};
	console.log(res.locals.cookie);
	next();
});

app.use(bodyParser({'limit': '50mb'}))
app.use("/login", express.static('frontend/login'))
app.use("/monitoring", checkAccess, express.static('frontend/monitoring'))
app.use("/configuration", checkAccess, express.static('frontend/configuration'))
app.use("/dist", express.static('frontend/dist'))
app.use("/", express.static('frontend/global_assets'))

app.get("/", function (request, response) {
	response.redirect("/monitoring/")
})

// app.use(basicAuth({
//     challenge: true,
//     authorizer: myAuthorizer
// }));

app.post("/login-user", function (request, response) {

	request.body.user = request.body.user.toLowerCase()

	if (!(users[request.body.user] == undefined)) {
		if (checkHash(request.body.user, request.body.pass)) {
			// generate and send token to client
			var token = randtoken.generate(16);
			console.log(token);
			users[request.body.user].token = token;
			// write to users.json
			fs.writeFileSync("users.json", JSON.stringify(users))
			response.cookie('user', request.body.user);
			response.cookie('accessToken', token)
			response.send(201, "Successful login");
		} else {
			response.send(401, "Incorrect password")
		}
	} else {
		response.send(401, "Unknown user")
	}

})

app.post("/logout-user", function (request, response) {
	// delete token
	users[response.locals.cookie.user].cookie = "";
	response.clearCookie('accessToken')
	response.clearCookie('user')
	response.send(200, "Successful logout")
})

app.get("/data/sensor-states", checkAccess, function (request, response) {
	response.send(JSON.stringify(sensor_states));
})

app.get("/data/new-alarms", checkAccess, function (request, response) {
	response.send(alarm_within_last_time_period);
})

app.get("/AMRS-config.json", checkAccess, function (request, response) {
	response.send(fs.readFileSync('AMRS_config.json'));
})

app.get("/sensor-data", checkAccess, function (request, response) {
	if (request.query.id == "all") {
		mysql_con.query("SELECT * FROM sensors ORDER BY sensor_code, converter_id", function (err, result, fields) {
			if (err) throw err;
			response.send(result)
		})

	} else if (Number.isInteger(parseInt(request.query.id))) {
		console.log(request.query.id)
		mysql_con.query("SELECT * FROM sensors WHERE sensor_code = " + request.query.id, function (err, result, fields) {
			if (err) throw err;
			console.log(result)
			response.send(result)
		})

	} else {
		response.status(406);
	}
})

app.get("/converter-data", checkAccess, function (request, response) {
	if (request.query.id == "all") {
		mysql_con.query("SELECT * FROM converters", function (err, result, fields) {
			if (err) throw err;
			response.send(result)
		})

	} else if (Number.isInteger(parseInt(request.query.id))) {
		console.log(request.query.id)
		mysql_con.query("SELECT * FROM converters WHERE converter_id = " + request.query.id, function (err, result, fields) {
			if (err) throw err;
			console.log(result)
			response.send(result)
		})

	} else {
		response.status(406);
	}
})

app.get("/data/alarms-data", checkAccess, function (request, response) {
	if (request.query.id == "all") {
		mysql_con.query("SELECT * FROM alarms", function (err, result, fields) {
			if (err) throw err;
			response.send(result)
		})

	} else if (Number.isInteger(parseInt(request.query.id))) {
		console.log(request.query.id)
		mysql_con.query("SELECT * FROM alarms WHERE alarm_id = " + request.query.id, function (err, result, fields) {
			if (err) throw err;
			console.log(result)
			response.send(result)
		})

	} else {
		response.status(406);
	}
})


app.get('/configuration/config-redirect', function (request, response) {
	response.redirect('/configuration/')
})

app.post('/configuration/add-sensor', checkAccess, function (request, response) {
	// for a sensor to be successfully added, all parameters (columns) must be present
	console.log(request.body);
	var sql = `INSERT INTO sensors (
        sensor_code, 
        converter_id, 
        modbus_address, 
        w3w_location, 
        manufacturer, 
        model
        ) VALUES ( 
        '${request.body.sensor_code}', 
        ${request.body.converter_id}, 
        ${request.body.modbus_address}, 
        '${request.body.w3w_location}', 
        '${request.body.manufacturer}', 
        '${request.body.model}'
    );`;
	console.log(sql);
	mysql_con.query(sql, function (err, result) {
		if (err) {
			// respond with error code - causes form fields to go red
			console.log("Record insertion failed");
			response.send("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + err);
		} else {
			// respond with 200
			console.log("Record successfully inserted");
			response.redirect('/configuration/?' + querystring.stringify(request.body) + "#device");
		}
	})
})

app.post('/configuration/add-converter', checkAccess, function (request, response) {
	// for a sensor to be successfully added, all parameters (columns) must be present
	console.log(request.body);
	var sql = `INSERT INTO converters (
        ip_address,
        port,
        inverter_station,
        manufacturer,
        model
    ) VALUES ( 
        '${request.body.ip_address}', 
        ${request.body.port}, 
        '${request.body.inverter_station}',
        '${request.body.manufacturer}', 
        '${request.body.model}'
    );`;
	console.log(sql);
	mysql_con.query(sql, function (err, result) {
		if (err) {
			// respond with error code - causes form fields to go red
			console.log("Record insertion failed");
			response.send("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + err);
		} else {
			// respond with 200
			console.log("Record successfully inserted");
			response.redirect('/configuration/?' + querystring.stringify(request.body) + "#device");
		}
	})
})

app.post('/configuration/update-table', checkAccess, function (request, response) {
	console.log(request.body);
	if (request.query.table == "sensor_table") {

		var rows = request.body.sensor_table_data;
		var error = null;

		rows.forEach(row => {
			const sql = `UPDATE sensors
						SET sensor_code = '${row.sensor_code}', 
						converter_id = ${row.converter_id}, 
						modbus_address = ${row.modbus_address}, 
						w3w_location = '${row.w3w_location}', 
						manufacturer = '${row.manufacturer}', 
						model = '${row.model}'
						WHERE sensor_code = '${row.sensor_code}';
						`;

			console.log(sql);

			mysql_con.query(sql, function (err, result) {
				if (err) {
					error = err;
				}
			});

		});

		if (error != null) {
			console.log("Failed to apply changes to database");
			response.send(400).end("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + error);
		} else {
			// respond with 200
			response.status(200).end("Database successfully updated. Changes should take immediate effect");
		}

	} else if (request.query.table == "converter_table") {

		var rows = request.body.converter_table_data;
		var error = null;

		rows.forEach(row => {
			const sql = `UPDATE converters
						SET	converter_id = ${row.converter_id}, 
						ip_address = '${row.ip_address}', 
						port = ${row.port}, 
						inverter_station = '${row.inverter_station}', 
						manufacturer = '${row.manufacturer}', 
						model = '${row.model}'
						WHERE converter_id = ${row.converter_id};
						`;

			console.log(sql);

			mysql_con.query(sql, function (err, result) {
				if (err) {
					error = err;
				}
			});

		});

		if (error != null) {
			console.log("Failed to apply changes to database");
			response.send(400).end("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + error);
		} else {
			// respond with 200
			response.status(200).end("Database successfully updated. Changes should take immediate effect");
		}
	} else if (request.query.table == "alarms_table") {

		// should only receive 1 row so no loop

		var row = request.body.alarms_table_data;
		var error = null;
		console.log(row);

		const sql = `UPDATE alarms
					SET	responded=${row.responded} 
					WHERE alarm_id=${row.alarm_id};
					`;

		console.log(sql);

		mysql_con.query(sql, function (err, result) {
			if (err) {
				error = err;
			}
		});


		if (error != null) {
			console.log("Failed to apply changes to database");
			response.send(400).end("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + error);
		} else {
			// respond with 200
			response.status(200).end("Database successfully updated. Changes should take immediate effect");
		}
	}
})

app.post('/configuration/delete-record', checkAccess, function (request, response) {
	console.log(request.body);
	var row = request.body.recordData;
	var error = null;
	console.log(row);

	if (request.query.table == "sensor_table") {

		var sql = `DELETE FROM sensors
		WHERE sensor_code='${row.sensor_code}';
		`;

	} else if (request.query.table == "converter_table") {

		var sql = `DELETE FROM converters
		WHERE converter_id=${row.converter_id};
		`;

	}

	console.log(sql);

	mysql_con.query(sql, function (err, result) {
		if (err) {
			error = err;
		}
	});

	if (error != null) {
		console.log("Failed to apply changes to database");
		response.send(400).end("Error: Something went wrong - you might have submitted invalid inputs; use the following error message to check: <br><br>" + error);
	} else {
		// respond with 200
		response.status(200).end("Database successfully updated. Changes should take immediate effect");
	}
})

app.post('/configuration/update-system-config', checkAccess, function (request, response) {
	console.log(request.body);
	console.log(Object.keys(request.query)[0]);

	switch (Object.keys(request.query)[0]) {
		case "action":
			for (const property in request.body) {
				configuration.email[property] = request.body[property];
			}
			break;

		default:
			break;
	}

	console.log(configuration)

	response.status(200).end("AMRS configuration successfully updated. Changes will take effect after reboot");
})

app.listen(8000, function () {
	console.log("listening on port 8000");
})
