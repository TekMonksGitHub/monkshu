/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const gzipAsync = require("util").promisify(require("zlib").gzip);
const conf = require(`${CONSTANTS.HTTPDCONF}`);

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

function statusNotFound(servObject) {
	servObject.res.writeHead(404, {"Content-Type": "text/plain"});
	servObject.res.write("404 Not Found\n");
}

function statusOK(headers, servObject) {
	servObject.res.writeHead(200, {...conf.headers, ...headers, "Content-Encoding":conf.enableGZIPEncoding?"gzip":"identity"});
}

async function write(data, servObject) {
	if (conf.enableGZIPEncoding) data = await gzipAsync(data);
	servObject.res.write(data);
}

function end(servObject) {servObject.res.end();}

module.exports = {initSync, onData, onReqEnd, statusNotFound, statusOK, write, end}