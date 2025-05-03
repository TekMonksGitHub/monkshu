/** 
 * A simple, static http GET server. 
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const extensions = [];
const os = require("os");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const http = require("http");
const https = require("https");
const http2 = require("http2");
const fspromises = fs.promises;
const stream = require("stream");
const mustache = require("mustache");
const args = require(`${__dirname}/lib/processargs.js`);

const HTTPD_CONF_EXPANDS = ["appname", "serverroot", "hostname", "app"];

let access, error, utils;

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	try {
		_initConfSync();
		_initLogsSync();
		_initExtensions();
	} catch (err) {
		(error||console).error(err);
		(error||console).error("Server init error, stopping.");
		process.exit(1);
	}

	/* Start HTTP/S server */
	const listener = async (req, res) => { try{await _handleRequest(req, res);} catch(e){error.error(e.stack?e.stack.toString():e.toString()); _sendError(req,res,500,e);} }
	const options = conf.ssl ? {key: fs.readFileSync(conf.sslKeyFile), cert: fs.readFileSync(conf.sslCertFile)} : null;
	const httpd = options && (!conf.forceHTTP1) ? http2.createSecureServer({...options, allowHTTP1: true}, listener) : options ? https.createServer(options, listener) : http.createServer(listener); // create server for http2 or http1 based on configurations
	const hostinterface = os.platform!="darwin"?(conf.host||"::"):"::";	// Mac won't let app bind to lower ports unless it listens to the wildcard host
	httpd.setTimeout(conf.timeout);
	httpd.listen(conf.port, hostinterface);	
	
	access.info(`${conf.ssl?"HTTPS":"HTTP"} transport started on ${hostinterface}:${conf.port}`);
	console.log(`${conf.ssl?"HTTPS":"HTTP"} transport started on ${hostinterface}:${conf.port}`);
	access.info("Server started.");
	console.log("Server started.");
}

function _initConfSync() {
	const confdir = args.getArgs().c?.[0]||args.getArgs().conf?.[0]||`${__dirname}/conf`,
		hostname = fs.existsSync(`${confdir}/hostname.json`) ? require(`${confdir}/hostname.json`) : require("os").hostname;
	global.conf = require(`${confdir}/httpd.json`);
	global.conf.host = mustache.render(global.conf.host, {hostname});	// override host as appropriate

	// normalize paths
	conf.webroot = path.resolve(`${__dirname}/${conf.webroot}`);	
	conf.logdir = path.resolve(`${__dirname}/${conf.logdir}`);	
	conf.libdir = path.resolve(`${__dirname}/${conf.libdir}`);
	conf.confdir = path.resolve(`${__dirname}/${conf.confdir}`);
	conf.accesslog = path.resolve(`${__dirname}/${conf.accesslog}`);
	conf.errorlog = path.resolve(`${__dirname}/${conf.errorlog}`);
	conf.serverroot = path.resolve(`${__dirname}/../../`);
	utils = require(conf.libdir+"/utils.js");

	// merge web app conf files into main http server, for app specific configuration directives unless standalone is forced
	if (fs.existsSync(`${__dirname}/../apps/`) && !args.getArgs().standalone) 
		for (const app of fs.readdirSync(`${__dirname}/../apps/`)) 
			if (fs.existsSync(`${__dirname}/../apps/${app}/conf/httpd.json`)) {
				const appHostname = fs.existsSync(`${__dirname}/../apps/${app}/conf/hostname.json`) ?
					require(`${__dirname}/../apps/${app}/conf/hostname.json`) : hostname;
				let appHTTPDConf = fs.readFileSync(`${__dirname}/../apps/${app}/conf/httpd.json`, "utf8");
				const replacers = {hostname: appHostname, serverroot: conf.serverroot, appname: app, app};
				for (const escapedValue of HTTPD_CONF_EXPANDS) appHTTPDConf = appHTTPDConf.replaceAll(`{{{${escapedValue}}}}`,
					replacers[escapedValue]).replaceAll(`{{${escapedValue}}}`,replacers[escapedValue]);
				appHTTPDConf = JSON.parse(appHTTPDConf);
				
				for (const confKey of Object.keys(appHTTPDConf)) {
					const value = appHTTPDConf[confKey];
					if (!global.conf[confKey]) {global.conf[confKey] = value; continue;}	// not set, then just set it
					if (Array.isArray(value)) global.conf[confKey] = utils.union(value, global.conf[confKey]);	// merge arrays
					else if (typeof value === "object" && value !== null) global.conf[confKey] = {...global.conf[confKey], ...value};	// merge objects, app overrides
					else global.conf[confKey] = value;	// override value
			}
	}
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

function _initExtensions() {
	const extensions_dir = path.resolve(conf.extdir);
	for (const extension of conf.extensions) {
		console.log(`Loading extension ${extension}`);
		const ext = require(`${extensions_dir}/${extension}.js`);  if (ext.initSync) ext.initSync(access, error);
		extensions.push(ext);
	}
}

async function _handleRequest(req, res) {
	const pathname = new URL(req.url, `http://${utils.getServerHost(req)}/`).pathname;
	let fileRequested = path.resolve(`${conf.webroot}/${pathname}`);

	// don't allow reading outside webroot
	if (!_isSubdirectory(fileRequested, conf.webroot))
		{_sendError(req, res, 404, "Path Not Found."); return;}

	// don't allow reading the server tree, if requested
	if (conf.restrictServerTree && _isSubdirectory(path.dirname(fileRequested), __dirname)) 
		{_sendError(req, res, 404, "Path Not Found."); return;}
		
	access.info(`From: ${_getReqHost(req)} Agent: ${req.headers["user-agent"]} GET: ${req.url}`);
	for (const extension of extensions) if (await extension.processRequest(req, res, _sendData, _sendError, _sendCode, access, error, _genEtag)) {
		access.info(`Request ${req.url} handled by extension ${extension.name}`);
		return; // extension handled it
	}
	
	try {
		await fspromises.access(fileRequested, fs.constants.R_OK);	// test file can be read
		let stats = await fspromises.stat(fileRequested);
		if (stats.isDirectory()) { 
			fileRequested += "/" + conf.indexfile;
			stats = await fspromises.stat(fileRequested);
		}

		if (utils.etagsMatch(req.headers["if-none-match"], _genEtag(stats))) {
			_sendCode(req, res, 304, "Not changed."); return; }
		
		_sendFile(fileRequested, req, res, stats);	// nothing matched, send the file via disk IO
	} catch (err) {_sendError(req, res, 404, "Path Not Found."); return;}
}

function _getServerHeaders(headers, stats) {
	if (conf.httpdHeaders) headers = { ...headers, ...conf.httpdHeaders };
	if (stats) {
		headers["Last-Modified"] = stats.mtime.toGMTString();
		headers["ETag"] = _genEtag(stats);
		headers["X-Last-Modified-Epoch"] = Math.floor(stats.mtimeMs/1000);
	}

	const _squishHeaders = headers => {const squished = {}; for ([key,value] of Object.entries(headers)) squished[key.toLowerCase()] = value; return squished};
	return _squishHeaders(headers);
}

const _genEtag = stats => `${stats.ino}-${stats.mtimeMs}-${stats.size}`;

async function _sendFile(fileRequested, req, res, stats) {
	try {		
		access.info(`Sending from disk: ${fileRequested}`);
		let mime = conf.mimeTypes[path.extname(fileRequested)]; if (mime && (!Array.isArray(mime))) mime = [mime];
		const acceptEncodingHeader = req.headers["accept-encoding"] || "";
		const canGZIPThisMime = acceptEncodingHeader && acceptEncodingHeader.includes("gzip") && mime && (mime[1] != false);
		const rawStream = fs.createReadStream(fileRequested, {"flags":"r","autoClose":true});
		const headers = {}; if (mime) headers["Content-Type"] = mime[0];
		_sendData(req, res, headers, stats, rawStream, canGZIPThisMime)
	} catch (err) {
		if (err && err.code === "ENOENT") _sendError(req, res, 404, "Path Not Found.");
		else _sendError(req, res, 500, err);
	}
}

const _getStringOrObjectJSON = o => {const ret = typeof o === "string"?o:JSON.stringify(o); return ret;}

function _sendError(req, res, code, message) {
	error.error(`From: ${_getReqHost(req)} Agent: ${req.headers["user-agent"]} Code: ${code} URL: ${req.url} Message: ${_getStringOrObjectJSON(message)}${message.stack?", Stack: "+message.stack:""}`);
	res.writeHead(code, _getServerHeaders({"Content-Type": "text/plain"}));
	res.write(`${code} ${message}\n`);
	res.end();
}

function _sendCode(req, res, code, message, stats) {
	access.info(`From: ${_getReqHost(req)} Agent: ${req.headers["user-agent"]} Code: ${code} URL: ${req.url} Message: ${_getStringOrObjectJSON(message)}`);
	res.writeHead(code, _getServerHeaders({"Content-Type": "text/plain"}, stats));
	res.write(`${code} ${message}\n`);
	res.end();
}

function _sendData(req, res, headers, stats, dataOrStream, gzip, code=200) {
	res.writeHead(code, _getServerHeaders({ "Content-Encoding": gzip?"gzip":"identity", ...headers }, stats));
	const rawStream = dataOrStream ? Buffer.isBuffer(dataOrStream) ? stream.Readable.from(dataOrStream) : dataOrStream : undefined;
	
	if (rawStream) (gzip?rawStream.pipe(zlib.createGzip()).pipe(res):rawStream.pipe(res))
		.on("error", err => _sendError(req, res, 500, `500: Error: ${err}`))
		.on("end", _ => res.end());
	else res.end();
}

function _isSubdirectory(to, from) {
	to = path.resolve(to).replace(/\\/g,"/").toLowerCase(); from = path.resolve(from).replace(/\\/g,"/").toLowerCase(); 
	if (to==from) return true;	// a directory is its own subdirectory
	const pathSplits = to.split("/"); for (const [i, _val] of pathSplits.entries()) {
		const test = pathSplits.slice(0, i).join("/");
		if (test==from) return true;
	}
	return false;
}

function _getReqHost(req) {
	const host = req.headers["x-forwarded-for"]?req.headers["x-forwarded-for"]:req.headers["x-forwarded-host"]?req.headers["x-forwarded-host"]:req.socket.remoteAddress;
	const port = req.headers["x-forwarded-port"]?req.headers["x-forwarded-port"]:req.socket.remotePort;
	return `[${host}]:${port}`;
}