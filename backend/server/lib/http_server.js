/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");
const http = require("http");
const https = require("https");
const conf = require(`${CONSTANTS.HTTPDCONF}`);
const gzipAsync = require("util").promisify(require("zlib").gzip);

function initSync() {
	const options = conf.ssl ? { pfx: fs.readFileSync(conf.pfxPath), passphrase: conf.pfxPassphrase } : null;

	/* create HTTP/S server */
	let host = conf.host || "::";
	LOG.info(`Attaching socket listener on ${host}:${conf.port}`);
	const listener = (req, res) => {
		if (req.method.toUpperCase() == "OPTIONS") {
			res.writeHead(200, conf.headers);
			res.end();
		} else {
			const servObject = {req, res, env:{}};
			req.on("data", data => module.exports.onData(data, servObject));
			req.on("end", _ => module.exports.onReqEnd(req.url, req.headers, servObject));
		}
	};
	const server = options ? https.createServer(options, listener) : http.createServer(listener);
	server.timeout = conf.timeout;
	server.listen(conf.port, host);

	console.log(`Server started on ${host}:${conf.port}`);
	LOG.info(`Server started on ${host}:${conf.port}`);
}

function onData(_data, _servObject) {}
function onReqEnd(servObject) {statusNotFound(servObject); end(servObject);}

function statusNotFound(servObject, _error) {
	servObject.res.writeHead(404, {"Content-Type": "text/plain"});
	servObject.res.write("404 Not Found\n");
}

function statusInternalError(servObject, _error) {
	servObject.res.writeHead(500, {"Content-Type": "text/plain"});
	servObject.res.write("Internal error\n");
}

function statusOK(headers, servObject) {
	const respHeaders = {...conf.headers, ...headers, "Content-Encoding":conf.enableGZIPEncoding?"gzip":"identity"};
	servObject.res.writeHead(200, respHeaders);
}

async function write(data, servObject) {
	if (conf.enableGZIPEncoding) data = await gzipAsync(data);
	servObject.res.write(data);
}

function end(servObject) {servObject.res.end();}

module.exports = {initSync, onData, onReqEnd, statusNotFound, statusInternalError, statusOK, write, end}