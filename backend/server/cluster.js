/* 
 * Cluster.js, Cluster manager
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const cluster = require("cluster");

if (cluster.isMaster) {
	const conf = require(`${__dirname}/conf/cluster.json`);
	const clusterMap = {};
	
	// Figure out number of workers.
	let numWorkers = conf.workers;
	if (numWorkers == 0) {
		let numCPUs = require("os").cpus().length;
		if (numCPUs < conf.min_workers) numWorkers = conf.min_workers;	
		else numWorkers = numCPUs;
	}
	
	// Fork workers.
	console.log(`Starting ${numWorkers} workers.`);
	for (let i = 0; i < numWorkers; i++) _forkAndMapWorker();
	
	cluster.on("exit", (worker, _code, _signal) => {
		console.log("[TCP] Worker server with PID: " + worker.process.pid + " died.");
		console.log("[TCP] Forking a new process to compensate.");
		_forkAndMapWorker(worker);
	});

	const _broadcastToAllWorkers = (msg) => { for (let worker of Object.values(clusterMap)) worker.send(msg); }

	function _forkAndMapWorker(prevWorker) {
		if (prevWorker) delete clusterMap[prevWorker.process.pid];
		const worker = cluster.fork();
		clusterMap[worker.process.pid] = worker;
		worker.on("message", (msg) => _broadcastToAllWorkers(msg))	// need to broadcast to all workers
	}
	
} else require(`${__dirname}/server.js`).bootstrap();
