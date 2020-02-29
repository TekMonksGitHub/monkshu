/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const gzipAsync = require("util").promisify(require("zlib").gzip);
const conf = require(`${CONSTANTS.HTTPDCONF}`);
const crypt = require(CONSTANTS.LIBDIR+"/crypt.js");

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

	const connection = server.listen(conf.port, host);
	if (conf.allowUpgrade) {

		/* Init the WebSocket API registry */
		LOG.info("Initializing the WebSocket API registry.");
		require(CONSTANTS.LIBDIR + "/wsapiregistry.js").initSync();
		
		connection.on("upgrade", (req, socket) => module.exports.onConnectionUpgrade(req, socket));
	}

	console.log(`Server started on ${host}:${conf.port}`);
	LOG.info(`Server started on ${host}:${conf.port}`);
}

function onData(_data, _servObject) {}
function onReqEnd(servObject) {statusNotFound(servObject); end(servObject);}

function onConnectionUpgrade(req, socket) {
	LOG.info(`Received connection upgrade request: ${req.headers["upgrade"]}}`);

	/* Check if upgrade event corresponds to websocket */
	if (req.headers["upgrade"] !== "websocket") {
		socket.end("HTTP/1.1 400 Bad Request");
		LOG.info(`Invalid upgrade request: ${req.headers["upgrade"]}`);
		return;
	}

	/* Establish handshake for incoming websocket requests */
	const establishedHandshake = module.exports.establishHandshake(req, socket);
	if (!establishedHandshake) { LOG.error(`Handshake failed for url: ${req.url}`); socket.end(); return; }

	/* Extend websocket apis to resigter and execute */
	try { registerUpgraded(req.url, socket); } catch (error) { LOG.error(`Error: ${error}`); socket.end(); }
}

function establishHandshake(req, socket) {
	const acceptKey = req.headers["sec-websocket-key"];
	const hash = crypt.generateWebSocketAcceptValue(acceptKey);
	const responseHeaders = ["HTTP/1.1 101 Web Socket Protocol Handshake", "Upgrade: WebSocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${hash}`];
	const protocol = req.headers["sec-websocket-protocol"];
	const protocols = !protocol ? [] : protocol.split(",").map(s => s.trim());

	/* Tell client that we agree to communicate with JSON data */
	if (protocols.includes("json")) {
		LOG.info("Switching to JSON protocol for communication.");
		responseHeaders.push(`Sec-WebSocket-Protocol: json`);
	} else if (protocols.length !== 0) {
		LOG.error("Non JSON protocol recieved");
		return false;
	}

	/* Establishing handshake */
	LOG.info(`Establishing handshake for: ${req.url}`);
	socket.write(responseHeaders.join("\r\n") + "\r\n\r\n");
	return true;
}

function registerUpgraded(url, socket) {
	LOG.info("Got request for the url: " + url);

	const urlMod = require("url");
	const endPoint = urlMod.parse(url, true).pathname;
	const ws_api = wsapiregistry.getWebSocketAPI(endPoint);
	LOG.info("Looked up service, calling: " + ws_api);

	if (!ws_api) LOG.info("Socket Service not found: " + url);
	else require(ws_api).register(socket);
}

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

module.exports = { initSync, onData, onReqEnd, onConnectionUpgrade, establishHandshake, registerUpgraded, statusNotFound, statusOK, write, end }
