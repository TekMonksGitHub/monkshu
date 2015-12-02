/* 
 * Node.js, Main server bootstrap file.
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
GLOBAL.CONSTANTS = require(__dirname + "/lib/constants.js");

var fs 			= require("fs");
var servicereg  = require(CONSTANTS.LIBDIR+"/serviceregistry.js");

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");
	
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLogger();
	log.info("Initializing the service registry.");
	servicereg.init();
	var transport = require(CONSTANTS.TRANSPORT);
	var server = require(CONSTANTS.LIBDIR+"/"+transport.servertype+".js");
	server.init(transport.port);
	
	console.log("Server started on port: " + transport.port);
	log.info("Server started on port: " + transport.port);
	
	/* send request to the service mentioned in url*/
	server.httpd.on("request", function(req, res) {
		var data = "";
	
		req.on("data", function(chunk) {
			data = data + chunk;
		});
		
		req.on("end", function() {
			doService(req.url, data, function(respObj) {
				if (respObj !== undefined) {
					log.info("Got result: " + JSON.stringify(respObj));
					res.write(JSON.stringify(respObj));
					res.end();
				} else {
					log.info("Sending 404 for: " + req.url);
					res.status(404).send("Not found");	// HTTP status 404: NotFound
				}
			});
		});
	});
}

function doService(url, data, callback) {
	log.info("Got request for the url: " + url);
	
	var service = servicereg.getService(url);
	
	if (service !== undefined) {
		log.info("Looked up service, calling: " + service);
		require(service).doService(JSON.parse(data), callback);
	}
	else {
		log.info("Service not found: " + url);
		callback();
	}
}

