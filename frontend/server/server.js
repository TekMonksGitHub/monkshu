/* 
 * A very simple, static http GET server. Suggest to not use in production.
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const url = require("url");
const zlib = require("zlib");
let access; let error;

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	initConfSync();
	initLogsSync();

	/* Start HTTP/S server */
	let listener = (req, res) => handleRequest(req, res);
	let options = conf.ssl ? {pfx: fs.readFileSync(conf.pfxPath), passphrase: conf.pfxPassphrase} : null;
	let httpd = options ? https.createServer(options, listener) : http.createServer(listener);
	httpd.setTimeout(conf.timeout);
	httpd.listen(conf.port, conf.host||"::");
	
	access.info(`Server started on ${conf.host||"::"}:${conf.port}`);
	console.log(`Server started on ${conf.host||"::"}:${conf.port}`);
}

function initConfSync() {
	global.conf = require(`${__dirname}/conf/httpd.json`);

	// normalize paths
	conf.webroot = path.resolve(conf.webroot);	
	conf.logdir = path.resolve(conf.logdir);	
	conf.libdir = path.resolve(conf.libdir);
	conf.accesslog = path.resolve(conf.accesslog);
	conf.errorlog = path.resolve(conf.errorlog);
}

function initLogsSync() {
	console.log("Starting...");
	console.log("Initializing the logs.");
	
	// Init logging 
	if (!fs.existsSync(conf.logdir)) fs.mkdirSync(conf.logdir);
		
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
	
	fs.access(fileRequested, fs.constants.R_OK, err => {
		if (err) {sendError(req, res, 404, "Path Not Found."); return;}

		fs.stat(fileRequested, (err, stats) => {
			if (err) {sendError(req, res, 404, "Path Not Found."); return;}
			
			if (stats.isDirectory()) fileRequested += "/" + conf.indexfile;
			sendFile(fileRequested, req, res, stats);
		});
	});
}

function getServerHeaders(headers, stats) {
	if (conf.httpdHeaders) headers = { ...headers, ...conf.httpdHeaders };
	if (stats) {
		headers["Last-Modified"] = stats.mtime.toGMTString();
		headers["ETag"] = `${stats.ino}-${stats.mtimeMs}-${stats.size}`;
	}
	return headers;
}

function sendFile(fileRequested, req, res, stats) {
	fs.open(fileRequested, "r", (err, fd) => {	
		if (err) (err.code === "ENOENT") ? sendError(req, res, 404, "Path Not Found.") : sendError(req, res, 500, err);
		else {
			access.info(`Sending: ${fileRequested}`);
			const mime = conf.mimeTypes[path.extname(fileRequested)];
			const rawStream = fs.createReadStream(null, {"flags":"r","fd":fd,"autoClose":true});
			const acceptEncodingHeader = req.headers["accept-encoding"] || "";

			if (conf.enableGZIPEncoding && acceptEncodingHeader.includes("gzip") && mime && (!Array.isArray(mime) || Array.isArray(mime) && mime[1]) ) {
				res.writeHead(200, getServerHeaders({ "Content-Type": Array.isArray(mime)?mime[0]:mime, "Content-Encoding": "gzip" }, stats));
				rawStream.pipe(zlib.createGzip()).pipe(res)
				.on("error", err => sendError(req, res, 500, `500: ${req.url}, Server error: ${err}`))
				.on("end", _ => res.end());
			} else {
				res.writeHead(200, mime ? getServerHeaders({"Content-Type":Array.isArray(mime)?mime[0]:mime}, stats) : getServerHeaders({}, stats));
				rawStream.on("data", chunk => res.write(chunk, "binary"))
					.on("error", err => sendError(req, res, 500, `500: ${req.url}, Server error: ${err}`))
					.on("end", _ => res.end());
			}
		}
	});
}

function sendError(req, res, code, message) {
	error.error(`${code}: ${req.url} - ${message}`);
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
