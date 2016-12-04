/* 
 * Node.js, Main server bootstrap file.
 * 
 * (C) 2015, 2016 TekMonks. All rights reserved.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");
	
	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLogger();
	/* Init the service registry */
	log.info("Initializing the service registry.");
	require(CONSTANTS.LIBDIR+"/serviceregistry.js").initSync();

	/* Run the server */
	initAndRunTransportLoop();
}

function initAndRunTransportLoop() {
	/* Init the transport */
	var transport = require(CONSTANTS.TRANSPORT);
	var server = require(CONSTANTS.LIBDIR+"/"+transport.servertype+".js");
	server.init(transport.port);
	
	console.log("Server started on port: " + transport.port);
	log.info("Server started on port: " + transport.port);
	
	/* Override the console now - to our log file*/
	log.overrideConsole();
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	server.connection.on("request", function(req, res) {
		var data = "";
	
		req.on("data", function(chunk) {
			data = data + chunk;
		});
		
		req.on("end", function() {
			doService(req.url, data, function(respObj) {
				if (respObj) {
					log.info("Got result: " + log.truncate(JSON.stringify(respObj)));
					res.writeHead(200, {"Content-Type" : "application/json"});
					res.write(JSON.stringify(respObj));
					res.end();
				} else {
					log.info("Sending 404 for: " + req.url);
					res.writeHead(404, {"Content-Type": "text/plain"});
  					res.write("404 Not Found\n");
  					res.end();
				}
			});
		});
	});
}

function doService(url, data, callback) {
	log.info("Got request for the url: " + url);
	
	var service = serviceregistry.getService(url);
	log.info("Looked up service, calling: " + service);
	
	if (service) {
		var jsonObj;
		try {
			jsonObj = JSON.parse(data);
		} catch (err) {
			log.info("Input JSON parser error: " + err);
			log.info("Bad JSON input, calling with empty object: " + url);
			jsonObj = {};
		}
		require(service).doService(jsonObj, callback);
	}
	else {
		log.info("Service not found: " + url);
		callback();
	}
}

