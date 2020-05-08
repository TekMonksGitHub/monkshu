/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");
const http = require("http");
const https = require("https");
const conf = require(`${CONSTANTS.HTTPDCONF}`);
const gzipAsync = require("util").promisify(require("zlib").gzip);
const HEADER_ERROR = {"content-type": "text/plain", "content-encoding":"identity"};

function initSync() {
	const options = conf.ssl ? { pfx: fs.readFileSync(conf.pfxPath), passphrase: conf.pfxPassphrase } : null;

	/* create HTTP/S server */
	let host = conf.host || "::";
	LOG.info(`Attaching socket listener on ${host}:${conf.port}`);
	const listener = (req, res) => {
		if (req.method.toLowerCase() == "options") {
			res.writeHead(200, conf.headers);
			res.end();
		} else {
			const servObject = {req, res, env:{}, server: module.exports}; 
			for (const header of Object.keys(req.headers)) {
				const saved = req.headers[header]; delete req.headers[header]; 
				req.headers[header.toLowerCase()] = saved;
			}
			req.on("data", data => module.exports.onData(data, servObject));
			req.on("end", _ => module.exports.onReqEnd(req.url, req.headers, servObject));
			req.on("error", error => module.exports.onReqError(req.url, req.headers, error, servObject));
		}
	};
	const server = options ? https.createServer(options, listener) : http.createServer(listener);
	server.timeout = conf.timeout;
	server.listen(conf.port, host);

	console.log(`Server started on ${host}:${conf.port}`);
	LOG.info(`Server started on ${host}:${conf.port}`);
}

function onData(_,_) {}
function onReqError(_,_,error,servObject) {statusInternalError(servObject, error); end(servObject);}
function onReqEnd(_,_,servObject) {statusNotFound(servObject); end(servObject);}

function statusNotFound(servObject, _error) {
	servObject.res.writeHead(404, {...HEADER_ERROR, ...conf.headers});
	servObject.res.write("404 Not Found\n");
}

function statusUnauthorized(servObject, _error) {
	servObject.res.writeHead(403, {...HEADER_ERROR, ...conf.headers});
	servObject.res.write("403 Unauthorized or forbidden\n");
}

function statusThrottled(servObject, _error) {
	servObject.res.writeHead(429, {...HEADER_ERROR, ...conf.headers});
	servObject.res.write("429 Too many requests\n");
}

function statusInternalError(servObject, _error) {
	servObject.res.writeHead(500, {...HEADER_ERROR, ...conf.headers});
	servObject.res.write("Internal error\n");
}

function statusOK(headers, servObject, dontGZIP) {
	const confHeaders = _cloneLowerCase(conf.headers);
	const headersIn = _cloneLowerCase(headers);

	const respHeaders = {...headersIn, ...confHeaders, "content-encoding":_shouldWeGZIP(servObject, dontGZIP)?"gzip":"identity"};
	servObject.res.writeHead(200, respHeaders);
}

async function write(data, servObject, encoding, dontGZIP) {
	if (typeof data != "string" && !Buffer.isBuffer(data) && data !== "") throw ("Can't write data, not serializable.");
	if (_shouldWeGZIP(servObject, dontGZIP)) data = await gzipAsync(data);
	servObject.res.write(data, encoding?encoding:"utf-8");
}

function end(servObject) {
	servObject.res.end();
}

function _shouldWeGZIP(servObject, dontGZIP) {
	if (dontGZIP) return false;
	const acceptEncoding = _cloneLowerCase(servObject.req.headers)["accept-encoding"] || "identity";
	return conf.enableGZIPEncoding && acceptEncoding.toLowerCase().includes("gzip");
}

const _cloneLowerCase = obj => {let clone = {}; for (const key of Object.keys(obj)) clone[key.toLocaleLowerCase()] = obj[key]; return clone;}


module.exports = {initSync, onData, onReqEnd, onReqError, statusNotFound, statusUnauthorized, statusThrottled, statusInternalError, statusOK, write, end}