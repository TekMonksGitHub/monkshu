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

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	initConf();
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
	
	access.info("Server started on port: " + conf.port);
	console.log("Server started on port: " + conf.port);
}

function initConf() {
	global.conf = require(__dirname + "/conf/httpd.json");
	conf.webroot = path.resolve(conf.webroot);	// normalize webroot path
	conf.logdir = path.resolve(conf.logdir);	// normalize logdir path
	conf.libdir = path.resolve(conf.libdir);	// normalize libdir path
	conf.accesslog = path.resolve(conf.accesslog);	// normalize accesslog path
	conf.errorlog = path.resolve(conf.errorlog);	// normalize errorlog path
}

function initLogs() {
	/* Init - Server bootup */
	console.log("Starting...");
	console.log("Initializing the logs.");
	
	/* Init logging */
	if (!fs.existsSync(conf.logdir)) {fs.mkdirSync(conf.logdir);}
		
	var logger = require(conf.libdir+"/Logger.js");	
	access = new logger.Logger(conf.accesslog, 100*1024*1024);
	error = new logger.Logger(conf.errorlog, 100*1024*1024);
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