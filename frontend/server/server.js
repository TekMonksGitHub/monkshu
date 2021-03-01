/** 
 * A simple, static http GET server. 
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const fs = require("fs");
const url = require("url");
const zlib = require("zlib");
const path = require("path");
const http = require("http");
const https = require("https");
let access; let error;

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	_initConfSync();
	_initLogsSync();

	const crypt = require(`${conf.libdir}/crypt.js`);

	/* Start HTTP/S server */
	const listener = (req, res) => { try{_handleRequest(req, res);} catch(e){error.error(e.stack?e.stack.toString():e.toString()); _sendError(req,res,500,e);} }
	const options = conf.ssl ? {pfx: fs.readFileSync(conf.pfxPath), passphrase: crypt.decrypt(conf.pfxPassphrase)} : null;
	const httpd = options ? https.createServer(options, listener) : http.createServer(listener);
	httpd.setTimeout(conf.timeout);
	httpd.listen(conf.port, conf.host||"::");
	
	access.info(`Server started on ${conf.host||"::"}:${conf.port}`);
	console.log(`Server started on ${conf.host||"::"}:${conf.port}`);
}

function _initConfSync() {
	global.conf = require(`${__dirname}/conf/httpd.json`);

	// normalize paths
	conf.webroot = path.resolve(conf.webroot);	
	conf.logdir = path.resolve(conf.logdir);	
	conf.libdir = path.resolve(conf.libdir);
	conf.accesslog = path.resolve(conf.accesslog);
	conf.errorlog = path.resolve(conf.errorlog);
}

function _initLogsSync() {
	console.log("Starting...");
	console.log("Initializing the logs.");
	
	// Init logging 
	if (!fs.existsSync(conf.logdir)) fs.mkdirSync(conf.logdir);
		
	const Logger = require(conf.libdir+"/Logger.js").Logger;	
	access = new Logger(conf.accesslog, 100*1024*1024);
	error = new Logger(conf.errorlog, 100*1024*1024);
}

function _handleRequest(req, res) {
	access.info(`From: ${_getReqHost(req)} Agent: ${req.headers["user-agent"]} GET: ${req.url}`);

	if (conf.server_redirect) {_sendRedirect(req, res); return;}

	const pathname = url.parse(req.url).pathname;
	let fileRequested = `${path.resolve(conf.webroot)}/${pathname}`;

	// don't allow reading outside webroot
	if (!_isSubdirectory(fileRequested, conf.webroot))
		{_sendError(req, res, 404, "Path Not Found."); return;}

	// don't allow reading the server tree, if requested
	if (conf.restrictServerTree && _isSubdirectory(path.dirname(fileRequested), __dirname)) 
		{_sendError(req, res, 404, "Path Not Found."); return;}
	
	fs.access(fileRequested, fs.constants.R_OK, err => {
		if (err) {_sendError(req, res, 404, "Path Not Found."); return;}

		fs.stat(fileRequested, (err, stats) => {
			if (err) {_sendError(req, res, 404, "Path Not Found."); return;}
			
			if (stats.isDirectory()) fileRequested += "/" + conf.indexfile;
			_sendFile(fileRequested, req, res, stats);
		});
	});
}

function _getServerHeaders(headers, stats) {
	if (conf.httpdHeaders) headers = { ...headers, ...conf.httpdHeaders };
	if (stats) {
		headers["Last-Modified"] = stats.mtime.toGMTString();
		headers["ETag"] = `${stats.ino}-${stats.mtimeMs}-${stats.size}`;
	}
	return headers;
}

function _sendFile(fileRequested, req, res, stats) {
	fs.open(fileRequested, "r", (err, fd) => {	
		if (err) (err.code === "ENOENT") ? _sendError(req, res, 404, "Path Not Found.") : _sendError(req, res, 500, err);
		else {
			access.info(`Sending: ${fileRequested}`);
			const mime = conf.mimeTypes[path.extname(fileRequested)];
			const rawStream = fs.createReadStream(null, {"flags":"r","fd":fd,"autoClose":true});
			const acceptEncodingHeader = req.headers["accept-encoding"] || "";

			if (conf.enableGZIPEncoding && acceptEncodingHeader.includes("gzip") && mime && (!Array.isArray(mime) || Array.isArray(mime) && mime[1]) ) {
				res.writeHead(200, _getServerHeaders({ "Content-Type": Array.isArray(mime)?mime[0]:mime, "Content-Encoding": "gzip" }, stats));
				rawStream.pipe(zlib.createGzip()).pipe(res)
				.on("error", err => _sendError(req, res, 500, `500: ${req.url}, Server error: ${err}`))
				.on("end", _ => res.end());
			} else {
				res.writeHead(200, mime ? _getServerHeaders({"Content-Type":Array.isArray(mime)?mime[0]:mime}, stats) : _getServerHeaders({}, stats));
				rawStream.on("data", chunk => res.write(chunk, "binary"))
					.on("error", err => _sendError(req, res, 500, `500: ${req.url}, Server error: ${err}`))
					.on("end", _ => res.end());
			}
		}
	});
}

function _sendError(req, res, code, message) {
	error.error(`From: ${_getReqHost(req)} Agent: ${req.headers["user-agent"]} Code: ${code} URL: ${req.url} Message: ${message}`);
	res.writeHead(code, _getServerHeaders({"Content-Type": "text/plain"}));
	res.write(`${code} ${message}\n`);
	res.end();
}

function _isSubdirectory(child, parent) { // from: https://stackoverflow.com/questions/37521893/determine-if-a-path-is-subdirectory-of-another-in-node-js
	child = path.resolve(child); parent = path.resolve(parent);

	if (parent.toLowerCase() == child.toLowerCase()) return true;	// a directory is its own subdirectory (remember ./)

	const relative = path.relative(parent, child);
	const isSubdir = !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
	return isSubdir;
}

function _getReqHost(req) {
	const host = req.headers["x-forwarded-for"]?req.headers["x-forwarded-for"]:req.headers["x-forwarded-host"]?req.headers["x-forwarded-host"]:req.socket.remoteAddress;
	const port = req.headers["x-forwarded-port"]?req.headers["x-forwarded-port"]:req.socket.remotePort;
	return `[${host}]:${port}`;
}

function _sendRedirect(req, res) {
	const urlIn = url.parse(req.url), urlServer = url.parse(conf.server_redirect), isRedirectServer = urlServer.host == null;

	const host = isRedirectServer ? conf.server_redirect : urlServer.host;
	const protocol = !isRedirectServer ? (urlServer.protocol || urlIn.protocol || conf.ssl?"https:":"http:") : 
		(urlIn.protocol || conf.ssl?"https:":"http:");
	if (!isRedirectServer && !conf.server_redirect.endsWith(urlServer.pathname)) urlServer.pathname = null;
	const pathname = !isRedirectServer ? (urlServer.pathname || urlIn.pathname || "") : (urlIn.pathname || "");
	const search = !isRedirectServer ? (urlServer.search || urlIn.search || "") : (urlIn.search || "");
	const redirectURL = `${protocol}//${host}${pathname}${search}`;
	
	res.writeHead(302, {"Location": redirectURL});
	res.end();
}