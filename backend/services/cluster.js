/* 
 * Cluster.js, Cluster manager
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
GLOBAL.CONSTANTS = require(__dirname + "/framework/constants.js");

var cluster = require("cluster");

if (cluster.isMaster) {
	// Figure out number of workers. At least have two cluster members.
	var numCPUs = require("os").cpus().length;
	if (numCPUs < 2) numCPUs = 2;	
	
	// Init logs
	console.log("Initializing the logs.");
	require(CONSTANTS.FRAMEWORKDIR+"/log.js").initGlobalLogger();
	
	// Fork workers.
	for (var i = 0; i < numCPUs; i++) cluster.fork();
	
	cluster.on("exit", function(server, code, signal) {
		console.log("Worker server with PID: " + server.process.pid + " died.");
		console.log("Forking a new process to compensate.");
		cluster.fork();
	});
} else {
	var server = require(__dirname + "/server.js");
	server.bootstrap();
}
