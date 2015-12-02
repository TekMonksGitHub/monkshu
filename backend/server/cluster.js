/* 
 * Cluster.js, Cluster manager
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
var cluster = require("cluster");

if (cluster.isMaster) {
	var conf = require(__dirname + "/conf/cluster.json");
	
	// Figure out number of workers.
	var numWorkers = conf.workers;
	if (numWorkers == 0) {
		var numCPUs = require("os").cpus().length;
		if (numCPUs < conf.min_workers) numWorkers = conf.min_workers;	
		else numWorkers = numCPUs;
	}
	
	// Fork workers.
	console.log("Starting " + numWorkers + " workers.");
	for (var i = 0; i < numWorkers; i++) cluster.fork();
	
	cluster.on("exit", function(server, code, signal) {
		console.log("Worker server with PID: " + server.process.pid + " died.");
		console.log("Forking a new process to compensate.");
		cluster.fork();
	});
} else {
	var server = require(__dirname + "/server.js");
	server.bootstrap();
}
