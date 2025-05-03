/**
 * HTTP/S transport for the API subsystem. 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const fs = require("fs");
const http = require("http");
const https = require("https");
const http2 = require("http2");
const mustache = require("mustache");
const blackboard = require("./blackboard");
const app = require (CONSTANTS.LIBDIR+"/app.js");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const gzipAsync = require("util").promisify(require("zlib").gzip);
const HEADER_ERROR = {"content-type": "text/plain", "content-encoding":"identity"};
let ipblacklist = [], ipwhitelist = [], conf;

async function initAsync() {
	/* create HTTP/S server */
	_initConfSync();
	let host = conf.host || "::"; 
	utils.watchFile(CONSTANTS.IPBLACKLIST, data=>ipblacklist=JSON.parse(data), conf.ipblacklistRefresh||10000); 
	utils.watchFile(CONSTANTS.IPWHITELIST, data=>ipwhitelist=JSON.parse(data), conf.ipwhitelistRefresh||10000); 

	const portToListenOn = await _resolveListeningPort(); 
	LOG.info(`Attaching socket listener on ${host}:${portToListenOn}`);
	const listener = (req, res) => {
		if (ipwhitelist.length && !_isIPInList(req, ipwhitelist)) { LOG.error(`Blocking IP, not whitelisted ${utils.getClientIP(req)}`); // whitelist in operation, won't honor
			res.socket.destroy(); res.end(); return; }	
		if (!ipwhitelist.length && _isIPInList(req, ipblacklist)) { LOG.error(`Blocking blacklisted IP ${utils.getClientIP(req)}`); // blacklisted, won't honor
			res.socket.destroy(); res.end(); return; }	
		const incomingURL = new URL(_normalizeURL(req.url), `${req.protocol||req.socket.encrypted?"https":"http"}://${utils.getServerHost(req)}`);
		if (conf.virtualhosts && (!conf.virtualhosts.includes(incomingURL.host))) { LOG.error(`Blocking request as URL ${incomingURL} is not in the configured virtual hosts table.`); // bad request
			res.socket.destroy(); res.end(); return; }	

		if (req.method.toLowerCase() == "options") {
			res.writeHead(200, conf.headers);
			res.end();
		} else {
			req.protocol = req.protocol || req.socket.encrypted?"https":"http";
			const remoteHost = utils.getClientIP(req), remotePort = utils.getClientPort(req);
			const servObject = {req, res, env:{remoteHost, remotePort, remoteAgent: req.headers["user-agent"]}, 
				server: module.exports, compressionFormat: req.headers["content-encoding"]?.toLowerCase().includes("gzip") ? CONSTANTS.GZIP : undefined}; 
			for (const header of Object.keys(req.headers)) {	// lower case the incoming headers
				const saved = req.headers[header]; delete req.headers[header]; 
				req.headers[header.toLowerCase()] = saved;
			}
			req.on("data", data => module.exports.onData(data, servObject)); 
			req.on("end", _ => module.exports.onReqEnd(new URL(_normalizeURL(req.url), `${req.protocol}://${utils.getServerHost(req)}`).href, req.headers, servObject)); 
            req.on("error", error => module.exports.onReqError(new URL(_normalizeURL(req.url), `${req.protocol}://${utils.getServerHost(req)}`).href, req.headers, error, servObject));
		}
	};
	const options = conf.ssl ? {key: fs.readFileSync(conf.sslKeyFile), cert: fs.readFileSync(conf.sslCertFile)} : null;
	const server = options && (!conf.forceHTTP1) ? http2.createSecureServer({...options, allowHTTP1: true}, listener) : options ? https.createServer(options, listener) : http.createServer(listener); // create server for http2 or http1 based on configurations
	server.timeout = conf.timeout;
	server.listen(portToListenOn, host);

	LOG.info(`${conf.ssl?"HTTPS":"HTTP"} transport started on ${host}:${portToListenOn}`);
	LOG.console(`${conf.ssl?"HTTPS":"HTTP"} transport started on ${host}:${portToListenOn}`);
}

function onData(_data, _servObject) { }
function onReqError(_url, _headers, error, servObject) { statusInternalError(servObject, error); end(servObject); }
function onReqEnd(_url, _headers, servObject) { statusNotFound(servObject); end(servObject); }

function statusNotFound(servObject, _error) {
	servObject.res.writeHead(404, _squishHeaders({...HEADER_ERROR, ...conf.headers}));
	servObject.res.write("404 Not Found\n");
}

function statusUnauthorized(servObject, _error) {
	servObject.res.writeHead(403, _squishHeaders({...HEADER_ERROR, ...conf.headers}));
	servObject.res.write("403 Unauthorized or forbidden\n");
}

function statusThrottled(servObject, _error) {
	servObject.res.writeHead(429, _squishHeaders({...HEADER_ERROR, ...conf.headers}));
	servObject.res.write("429 Too many requests\n");
}

function statusInternalError(servObject, _error) {
	servObject.res.writeHead(500, _squishHeaders({...HEADER_ERROR, ...conf.headers}));
	servObject.res.write("Internal error\n");
}

function statusTimeOut(servObject) {
    servObject.res.writeHead(504, _squishHeaders({...HEADER_ERROR, ...conf.headers,status:504}));
    servObject.res.write("Api Timeout\n");
}

function statusOK(headers, servObject, dontGZIP) {
	const confHeaders = _cloneLowerCase(conf.headers);
	const headersIn = _cloneLowerCase(headers);

	const respHeaders = {...headersIn, ...confHeaders, "content-encoding":_shouldWeGZIP(servObject, dontGZIP)?"gzip":"identity"};
	servObject.res.writeHead(200, _squishHeaders(respHeaders));
}

async function write(data, servObject, encoding, dontGZIP) {
	if (typeof data != "string" && !Buffer.isBuffer(data) && data !== "") throw ("Can't write data, not serializable.");
	if (_shouldWeGZIP(servObject, dontGZIP)) data = await gzipAsync(data);
	servObject.res.write(data, encoding?encoding:"utf-8");
}

function end(servObject) {
	servObject.res.end();
}

const blacklistIP = async (ip, op) => addIPToIPList(CONSTANTS.IPBLACKLIST, ipblacklist, ip, op);
const whitelistIP = async (ip, op) => addIPToIPList(CONSTANTS.IPWHITELIST, ipwhitelist, ip, op);

async function addIPToIPList(file, listHolder, ip, op) {
	const ipAnalysis = utils.analyzeIPAddr(ip); 
	const realIP = ipAnalysis.ipv6?utils.expandIPv6Address(ipAnalysis.ip.toLowerCase()):ipAnalysis.ip;
	if (op?.toLowerCase() != "remove") listHolder.push(realIP); else listHolder.splice(listHolder.indexOf(realIP),1);
	await fs.promises.writeFile(file, JSON.stringify(listHolder, null, 4), "utf8");
}

const getSerializableServObject = servObject => {
	return {req: {headers: _cloneLowerCase(servObject.req.headers)}, res: {}, env: servObject.env, server: {}, compressionFormat: servObject.compressionFormat};
}

const inflateServObject = servObject => {
	return {req: servObject.req, res: servObject.res, env: servObject.env, server: module.exports, compressionFormat: servObject.compressionFormat};
}

async function _resolveListeningPort() {
	blackboard.subscribe("__org_monkshu_httpd_server_portcheck", message => {
		blackboard.sendReply("__org_monkshu_httpd_server_portcheck", message.blackboardcontrol, {
			server_ts: CONSTANTS.SERVER_START_TIME, server_id: CONSTANTS.SERVER_ID});
	});
	const _getListenablePort = async _ => {
		const bboptions = {}; bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;
		const serverReplies = await blackboard.getReply("__org_monkshu_httpd_server_portcheck", {}, 5000, bboptions);
		serverReplies.push({server_ts: CONSTANTS.SERVER_START_TIME, server_id: CONSTANTS.SERVER_ID});
		serverReplies.sort((a, b) => {
			if (a.server_ts < b.server_ts) return -1;
			if (a.server_ts == b.server_ts) {	// started at the same time, so sort on IDs
				if (a.server_id < b.server_id) return -1;
				else return 1;
			}
			return 1;
		});
		let listenableIndex = -1; for (const [i, serverReply] of serverReplies.entries()) 
			if (serverReply.server_id == CONSTANTS.SERVER_ID) {listenableIndex = i; break};
		return listenableIndex != -1 ? conf.ports[listenableIndex] : null;	// voting algorithm failed
	}

	if ((!conf.ports) && conf.port) return conf.port;
	const freePort = await _getListenablePort();
	return freePort||CONSTANTS.DEFAULT_HTTPD_PORT;
}

function _isIPInList(req, listHolder) {
	let clientIP = utils.getClientIP(req); const ipAnalysis = utils.analyzeIPAddr(clientIP);
	if (ipAnalysis.ipv6) clientIP = utils.expandIPv6Address(clientIP); else clientIP = ipAnalysis.ip;

	return listHolder.includes(clientIP.toLowerCase());
}

function _shouldWeGZIP(servObject, dontGZIP) {
	if (dontGZIP) return false;
	const acceptEncoding = _cloneLowerCase(servObject.req.headers)["accept-encoding"] || "identity";
	return conf.enableGZIPEncoding && acceptEncoding.toLowerCase().includes("gzip");
}

function _initConfSync() {
	conf = JSON.parse(mustache.render(fs.readFileSync(`${CONSTANTS.HTTPDCONF}`, "utf8"), {hostname: CONSTANTS.HOSTNAME}));
	const httpd_conf_expands = ["appname", "serverroot", "hostname"];

	// merge app conf files into main http server, for app specific configuration directives 
	const appRoots = app.getApps(); for (const appObject of appRoots) {
		const [appname, appRoot] = Object.entries(appObject)[0]; if (fs.existsSync(`${appRoot}/conf/httpd.json`)) {
			const appHostname = fs.existsSync(`${appRoot}/conf/hostname.json`) ? require(`${appRoot}/conf/hostname.json`) : CONSTANTS.HOSTNAME;
			let appHTTPDConf = fs.readFileSync(`${appRoot}/conf/httpd.json`, "utf8");
			const replacers = {hostname: appHostname, serverroot: CONSTANTS.ROOTDIR, appname};
			for (const escapedValue of httpd_conf_expands) 
				appHTTPDConf = appHTTPDConf.replaceAll(`{{{${escapedValue}}}}`,
					replacers[escapedValue]).replaceAll(`{{${escapedValue}}}`, replacers[escapedValue]);
			if (replacers.hostname) conf.host = replacers.hostname;	// inherit it back to original conf as well
			appHTTPDConf = JSON.parse(appHTTPDConf);
			
			for (const confKey of Object.keys(appHTTPDConf)) {
				const value = appHTTPDConf[confKey];
				if (!conf[confKey]) {conf[confKey] = value; continue;}	// not set, then just set it
				if (Array.isArray(value)) conf[confKey] = utils.union(value, conf[confKey]);	// merge arrays
				else if (typeof value === "object" && value !== null) conf[confKey] = {...conf[confKey], ...value};	// merge objects, app overrides
				else conf[confKey] = value;	// override value
			}
		}
	}
}

const _cloneLowerCase = obj => {let clone = {}; for (const key of Object.keys(obj)) clone[key.toLocaleLowerCase()] = obj[key]; return clone;}
const _normalizeURL = url => url.replace(/\\/g, "/").replace(/\/+/g, "/");
const _squishHeaders = headers => {const squished = {}; for ([key,value] of Object.entries(headers)) squished[key.toLowerCase()] = value; return squished};

module.exports = {initAsync, onData, onReqEnd, onReqError, statusNotFound, statusUnauthorized, statusThrottled, 
	statusInternalError, statusTimeOut, statusOK, write, end, blacklistIP, whitelistIP, getSerializableServObject,
	inflateServObject}