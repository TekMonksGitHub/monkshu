/* 
 * A very simple, static http GET server. Do not use in production.
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

/* Modules required */
var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");
var access; var error;

/* Configuration - Can change ports, webroot etc. here */
var conf = require(__dirname + "/conf/httpd.json");
conf.webroot = path.resolve(conf.webroot);	// normalize webroot path

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	initLogs();

	/* Start http server */
	var httpd = http.createServer(function(req, res) {
		access.info("GET: " + req.url);
		
		var fileRequested = path.resolve(conf.webroot) + "/" + url.parse(req.url).pathname;
		
		fs.exists(fileRequested, function(exists) {
		    if(!exists) {
		    	error.error("404: " + req.url);
		    	res.writeHead(404, {"Content-Type": "text/plain"});
		    	res.write("404 Path Not Found.\n");
		    	res.end();
		    	return;
		    }
		
			if (fs.statSync(fileRequested).isDirectory()) fileRequested += "/" + conf.indexfile;
		 
			sendFile(fileRequested, res);
		});
		 
	}).listen(conf.port);
	
	access.log("Server started on port: " + conf.port);
	console.log("Server started on port: " + conf.port);
}

function initLogs() {
	var winston = require("winston");

	/* Init - Server bootup */
	console.log("Starting...");
	console.log("Initializing the logs.");
	
	/* Init logging */
	if (!fs.existsSync(conf.logdir)) {fs.mkdirSync(conf.logdir);}
		
	access = new (winston.Logger)({
		transports: [ 
			new winston.transports.File({ 
				filename: conf.accesslog,
				maxsize: 1024 * 1024 * 100 // 100MB
			})
		]
	});
	
	error = new (winston.Logger)({
		transports: [ 
			new winston.transports.File({ 
				filename: conf.errorlog,
				maxsize: 1024 * 1024 * 100 // 100MB
			})
		]
	});
}

function sendFile(fileRequested, res) {
	fs.readFile(fileRequested, "binary", function(err, file) {
		if(err) {
			error.error("500: " + err);
  			res.writeHead(500, {"Content-Type": "text/plain"});
    		res.write(err + "\n");
    		res.end();
    		return;
  		}
  	
      	access.info("Sending: " + fileRequested);
      	var headers = {};
      	var mime = conf.mimeTypes[path.extname(fileRequested)];
      	if (mime) headers["Content-Type"] = mime;
      	res.writeHead(200, headers);
      	res.write(file, "binary");
      	res.end();
    });
}