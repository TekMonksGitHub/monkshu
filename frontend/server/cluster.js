/* 
 * Cluster.js, Cluster manager
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const cluster = require("cluster");
const args = require(`${__dirname}/lib/processargs.js`);

if (cluster.isMaster) {
	let conf = require(`${args.getArgs().c||args.getArgs().conf||`${__dirname}/conf`}/cluster.json`);

	// Figure out number of workers.
	let numWorkers = conf.workers;
	if (numWorkers == 0) {
		let numCPUs = require("os").cpus().length;
		if (numCPUs < conf.min_workers) numWorkers = conf.min_workers;
		else numWorkers = numCPUs;
	}

	// Fork workers.
	console.log(`Starting ${numWorkers} workers.`);
	for (let i = 0; i < numWorkers; i++) cluster.fork();

	cluster.on("exit", (server, _code, _signal) => {
		console.log(`Worker server with PID: ${server.process.pid} died.`);
		console.log("Forking a new process to compensate.");
		cluster.fork();
	});
} else require(`${__dirname}/server.js`).bootstrap();
