/* 
 * Cluster.js, Cluster manager
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const cluster = require("cluster");

if (cluster.isMaster) {
	const conf = require(`${__dirname}/conf/cluster.json`);
	
	// Figure out number of workers.
	let numWorkers = conf.workers;
	if (numWorkers == 0) {
		let numCPUs = require("os").cpus().length;
		if (numCPUs < conf.min_workers) numWorkers = conf.min_workers;	
		else numWorkers = numCPUs;
	}

	const _forkWorker = _ => 
		cluster.fork().on("message", msg => {for (const worker_id in cluster.workers) cluster.workers[worker_id].send(msg)});
	
	// Fork workers.
	console.log(`Starting ${numWorkers} workers.`);
	for (let i = 0; i < numWorkers; i++) _forkWorker();
	
	cluster.on("exit", (worker, _code, _signal) => {
		console.log("[TCP] Worker server with PID: " + worker.process.pid + " died.");
		console.log("[TCP] Forking a new process to compensate.");
		_forkWorker();
	});
	
} else require(`${__dirname}/server.js`).bootstrap();
