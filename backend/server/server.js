/* 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");
const crypt = require(CONSTANTS.LIBDIR + "/crypt.js");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const urlMod = require("url");

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();

function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR + "/log.js").initGlobalLoggerSync(CONSTANTS.LOGMAIN);
	/* Init the API registry */
	LOG.info("Initializing the API registry.");
	require(CONSTANTS.LIBDIR + "/apiregistry.js").initSync();

	/* Run the server */
	initAndRunTransportLoop();
}

function initAndRunTransportLoop() {
	/* Init the transport */
	let transport = require(CONSTANTS.TRANSPORT);
	let server = require(CONSTANTS.LIBDIR + "/" + transport.servertype + ".js");
	server.initSync(transport.access_control, transport.port, transport.host || "::", transport.timeout);

	console.log(`Server started on ${transport.host || "::"}:${transport.port}`);
	LOG.info(`Server started on ${transport.host || "::"}:${transport.port}`);

	/* Override the console now - to our log file*/
	LOG.overrideConsole();

	/* Server loop */
	/* send request to the service mentioned in url*/
	server.connection.on("request", (req, res) => {
		let data = "";

		req.on("data", chunk => data += chunk);

		req.on("end", async _ => {
			let respObj = await doService(req.url, data);
			if (respObj) {
				LOG.info("Got result: " + LOG.truncate(JSON.stringify(respObj)));
				res.writeHead(200, { "Content-Type": "application/json" });
				if (apiregistry.isEncrypted(urlMod.parse(req.url).pathname))
					res.write("{\"data\":\"" + crypt.encrypt(JSON.stringify(respObj)) + "\"}");
				else res.write(JSON.stringify(respObj));
				res.end();
			} else {
				LOG.info("Sending 404 for: " + req.url);
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.write("404 Not Found\n");
				res.end();
			}
		});
	});

	server.connection.on("upgrade", async (req, socket) => {

		// Check if upgrade event corresponds to websocket
		if (req.headers["upgrade"] !== "websocket") {
			socket.end("HTTP/1.1 400 Bad Request");
			LOG.info("Invalid upgrade request");
			return;
		}

		// Establish handshake for incoming websocket requests
		establishWebSocketHandshake(req, socket);

		// TODO: Extend websockets to resigter and execute services
	});
}

async function doService(url, data) {
	LOG.info("Got request for the url: " + url);

	let endPoint = urlMod.parse(url, true).pathname;
	let query = urlMod.parse(url, true).query;
	let api = apiregistry.getAPI(endPoint);
	LOG.info("Looked up service, calling: " + api);

	if (api) {
		let jsonObj = {};
		try {
			if (apiregistry.isGet(endPoint) && apiregistry.isEncrypted(endPoint))
				jsonObj = query.data ? utils.queryToObject(crypt.decrypt(query.data)) : {};
			else if (apiregistry.isGet(endPoint) && !apiregistry.isEncrypted(endPoint)) jsonObj = query;
			else if (apiregistry.isEncrypted(endPoint)) jsonObj = JSON.parse(crypt.decrypt(JSON.parse(data).data));
			else jsonObj = JSON.parse(data);
		} catch (err) {
			LOG.info("Input JSON parser error: " + err);
			LOG.info("Bad JSON input, calling with empty object: " + url);
		}

		if (!apiregistry.checkKey(endPoint, jsonObj)) { LOG.error("Bad API key: " + url); return CONSTANTS.FALSE_RESULT; }
		else return await require(api).doService(jsonObj);
	}
	else LOG.info("API not found: " + url);
}

function establishWebSocketHandshake(req, socket) {
	LOG.info(`Received ${req.headers["upgrade"]} upgrade request.`);

	const acceptKey = req.headers["sec-websocket-key"];
	const hash = crypt.generateWebSocketAcceptValue(acceptKey);
	const responseHeaders = ["HTTP/1.1 101 Web Socket Protocol Handshake", "Upgrade: WebSocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${hash}`];
	const protocol = req.headers["sec-websocket-protocol"];
	const protocols = !protocol ? [] : protocol.split(",").map(s => s.trim());

	// Tell the client that we agree to communicate with JSON data
	if (protocols.includes("json")) {
		LOG.info("Switching to JSON protocol for communication.");
		responseHeaders.push(`Sec-WebSocket-Protocol: json`);
	}
	else if (protocols.length !== 0) {
		LOG.error("Non JSON protocol recieved");
	}

	// Establishing handshake
	LOG.info("Establishing handshake for new websocket upgrade.");
	socket.write(responseHeaders.join("\r\n") + "\r\n\r\n");
}