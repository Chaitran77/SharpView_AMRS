Specification subject to change.
Copyright © 2021 Kiran Patel

# AMRS API Reference Specification

# Authentication

## In order to interact with the server, you need to first be logged in:
---

<br>

## Request
---
### To login, send a POST request to this endpoint

	POST /login-user
## Request Payload:
|Property|Description|
|---------|---------|
|`user`| Username |
|`pass`| Base64 Hash of password |

## Example:
	POST /login-user HTTP/1.1
	Host: 192.168.0.175:8000
	Content-Length: 109
	Accept: */*
	Content-Type: application/x-www-form-urlencoded; charset=UTF-8
	Origin: http://192.168.0.175:8000
	Referer: http://192.168.0.175:8000/login/

---
## Response
---
<br>

### If the request completes successfully, a 16 character `accessToken` cookie will be set, to be used with all subsequent requests. This cookie will also be stored on the server to compare the incoming cookie against. An user cookie will also be set, which can be ignored.
<br>

|State|ResponseText|Status Code|
|---------|---------|---------|
|Successful login|`"Successful Login"`|201|
|Valid user, invalid password|`"Incorrect password"`|401|
|Invalid user|`"Unknown user"`|401|

## Example:
	Connection: keep-alive
	Content-Length: 16
	Content-Type: text/html; charset=utf-8
	Date: Tue, 15 Feb 2022 09:13:21 GMT
	ETag: W/"10-LLu4PZvkIrM0wXGArNF/O6AFu2c"
	Set-Cookie: user=kiran; Path=/
	Set-Cookie: accessToken=HfXoynAB1j231GyY; Path=/


<br><br>
## Logging out
---
	POST /logout-user

## Request payload:

|Property|Type|Description|
|---------|---------|---------|
|`user`| `String` | Username |

## Possible responses
|State|ResponseText|Status Code|
|---------|---------|---------|
|Successful logout|`"Successful logout"`|200|

### If the request is successful, the `accessToken` and `user` cookies will be deleted from the server and will no longer work for authentication. A new access token will need to be generated using the `/login-user` endpoint.
<br><br>

# Viewing Sensors and Alarms Data

#### All of the following requests must be made with the following header:

	Cookie: user=[username]; accessToken=[accessToken]

#### Where `username` is the value of the username cookie obtained when logging in and `accessToken` is the value of the `accessToken` cookie.
<br>


## To get the current states of all the sensors:
---
	GET /data/sensor-states

## Example:

	GET /data/sensor-states HTTP/1.1
	Host: 192.168.0.175:8000
	Accept: */*
	Referer: http://192.168.0.175:8000/monitoring/
	Cookie: user=kiran; accessToken=feYREWQd0mJ1pRVX


## Response:

#### A JSON string of key:value pairs

|Key|Value|
|---|---|
|Sensor Code [`String`]|State [`Integer`]|

<br>

## Possible state values:

|State|Description|
|---|---|
|1|Normal (not cut)|
|0|Triggered (cut)|
|-1|Failing (state unknown)|

Example:
	
	{
		"5.1A": 1,
		"5.1B": 1,
		"5.2A": 1,
		"5.2B": 1,
		"5.3A": 1,
		"5.3B": 0,
		"5.4A": 1,
		"5.4B": 1,
		"5.5A": -1,
		"5.5C": -1
	}


<br>

---
## To check if there have been any triggers within the last 3 seconds:
---

	GET /data/new-alarms

## Responses:
---
| Value | Type | Description
|---|---|---|
| `True` | `Boolean` | A sensor has been triggered within the last 3 seconds |
| `False` | `Boolean` | No sensors have been triggered within the last 3 seconds |

<br><br>

---
## To view sensor triggers
---

	GET /data/alarms-data

### Request Parameters:
---
|Property| Type | Value |Description|
|---|---|---|---|
| id | `Integer` | Any valid integer | Alarm/Event ID - newest is largest number |
| id | `String` | `all` | Get all alarms

## Response
---
### Response will be an array of all matching JSON-encoded objects. If an invalid parameter is passed, the response status will be `406 unacceptable`.
<br>

## Example:

	[
		{alarm_id: 1, sensor_code: "5.3B", alarm_time: "2021-10-07T10:34:22.000Z", responded: 1,…},
		{alarm_id: 2, sensor_code: "5.3B", alarm_time: "2021-10-07T10:36:40.000Z", responded: 1,…},
		{alarm_id: 3, sensor_code: "5.3B", alarm_time: "2021-10-07T10:36:58.000Z", responded: 1,…},
		{alarm_id: 4, sensor_code: "5.3B", alarm_time: "2021-10-07T14:32:30.000Z", responded: 1,…}
	]

Each alarm object is formatted as such:
|Value|Type|Description|
|---|---|---|
|alarm_id|`Integer`|The ID that each particular alarm is referenced by|
|alarm_time|`String`|The date and time the alarm was created, formatted as `YYYY-MM-DD hh:mm:ss`|
|record_timestamp|`String`|The date and time the alarm was created, formatted as `YYYY-MM-DD hh:mm:ss`|
|responded|`Integer`|Whether the alarm has been responded to or not. Either `1` (responded) or `0` (pending)|
|sensor_code|`String`|The sensor which emitted the alarm|
