/* 
 * A very simple, static http GET server. Suggest to not use in production.
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

/* Modules required */
const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");
let access; let error;

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	initConfSync();
	initLogsSync();

	/* Start http server */
	let httpd = http.createServer((req, res) => handleRequest(req, res));
	httpd.setTimeout(conf.timeout);
	httpd.listen(conf.port, conf.host||"::");
	
	access.info(`Server started on ${conf.host||"::"}:${conf.port}`);
	console.log(`Server started on ${conf.host||"::"}:${conf.port}`);
}

function initConfSync() {
	global.conf = require(`${__dirname}/conf/httpd.json`);
	conf.webroot = path.resolve(conf.webroot);	// normalize webroot path
	conf.logdir = path.resolve(conf.logdir);	// normalize logdir path
	conf.libdir = path.resolve(conf.libdir);	// normalize libdir path
	conf.accesslog = path.resolve(conf.accesslog);	// normalize accesslog path
	conf.errorlog = path.resolve(conf.errorlog);	// normalize errorlog path
}

function initLogsSync() {
	/* Init - Server bootup */
	console.log("Starting...");
	console.log("Initializing the logs.");
	
	/* Init logging */
	if (!fs.existsSync(conf.logdir)) {fs.mkdirSync(conf.logdir);}
		
	let Logger = require(conf.libdir+"/Logger.js").Logger;	
	access = new Logger(conf.accesslog, 100*1024*1024);
	error = new Logger(conf.errorlog, 100*1024*1024);
}

function handleRequest(req, res) {
	access.info(`GET: ${req.url}`);

	let pathname = url.parse(req.url).pathname;
	let fileRequested = `${path.resolve(conf.webroot)}/${pathname}`;

	// don't allow reading outside webroot
	if (!isSubdirectory(fileRequested, conf.webroot))
		{sendError(req, res, 404, "Path Not Found."); return;}

	// don't allow reading the server tree, if requested
	if (conf.restrictServerTree && isSubdirectory(path.dirname(fileRequested), __dirname)) 
		{sendError(req, res, 404, "Path Not Found."); return;}
	
	fs.access(fileRequested, fs.constants.R_OK, function(err) {
		if (err) {sendError(req, res, 404, "Path Not Found."); return;}

		fs.stat(fileRequested, function(err, stats) {
			if (err) {sendError(req, res, 404, "Path Not Found.");  return;}
			
			if (stats.isDirectory()) fileRequested += "/" + conf.indexfile;
			sendFile(fileRequested, req, res);
		});
	});
}

function getServerHeaders(headers) {
	if (conf.httpdHeaders) headers = { ...headers, ...conf.httpdHeaders };
	return headers;
}

function sendFile(fileRequested, req, res) {
	fs.open(fileRequested, "r", (err, fd) => {	
		if (err) (err.code === "ENOENT") ? sendError(req, res, 404, "Path Not Found.") : sendError(req, res, 500, err);
		else {
			access.info(`Sending: ${fileRequested}`);
			let mime = conf.mimeTypes[path.extname(fileRequested)];
			res.writeHead(200, mime ? getServerHeaders({"Content-Type":mime}) : getServerHeaders({}));

			fs.createReadStream(null, {"flags":"r","fd":fd,"autoClose":true})
			.on("data", chunk => res.write(chunk, "binary"))
			.on("error", err => sendError(req, res, 500, `500: ${req.url}, Server error: ${err}`))
			.on("end", _ => res.end());
		}
	});
}

function sendError(req, res, code, message) {
	error.error(`${code}: ${req.url}`);
	res.writeHead(code, getServerHeaders({"Content-Type": "text/plain"}));
	res.write(`${code} ${message}\n`);
	res.end();
}

function isSubdirectory(child, parent) { // from: https://stackoverflow.com/questions/37521893/determine-if-a-path-is-subdirectory-of-another-in-node-js
	child = path.resolve(child); parent = path.resolve(parent);

	if (parent.toLowerCase() == child.toLowerCase()) return true;	// a directory is its own subdirectory (remember ./)

	const relative = path.relative(parent, child);
	const isSubdir = !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
	return isSubdir;
}