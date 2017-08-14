'use strict';

var app = require('express')();
var express = require('express');
var request = require('request');

var portno = 8888;   //local version

var app = express();

//express static module (http://expressjs.com/en/starter/static-files.html)
app.use(express.static(__dirname));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
 });

app.get('/allData', function(req, res) { 
	console.log('initiating request');
	request('http://' + BACKEND_IP + '/event/info/all', function(error, response, body) {
		if (response.statusCode == 200){
			console.log(response.body);
		} else {
			console.log(response.statusCode);
		}
		res.send(response.body)
	});
});

var server = app.listen(process.env.PORT || portno, function () {
  var port = server.address().port;
});

