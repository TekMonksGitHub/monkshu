/* 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");
const crypt = require(CONSTANTS.LIBDIR + "/crypt.js");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const httpdConf = require(CONSTANTS.HTTPDCONF);
const urlMod = require("url");
const zlib = require("zlib");

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
	server.initSync(transport.port, transport.host || "::");

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
			const acceptEncodingHeader = (req.headers['accept-encoding']) ? req.headers['accept-encoding'] : "";
			if (respObj && httpdConf.enableGZIPEncoding && acceptEncodingHeader) {
				LOG.info("Got result: " + LOG.truncate(JSON.stringify(respObj)));
				sendResponse(respObj, req, res)
			} else if (respObj) {
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
}

function sendResponse(respObj, req, res) {
	const output = zlib.createGzip();
	res.writeHead(200, { "Content-Encoding": "gzip", "Content-Type": "application/json" });
	if (apiregistry.isEncrypted(urlMod.parse(req.url).pathname)) {
		output.pipe(res);
		output.write("{\"data\":\"" + crypt.encrypt(JSON.stringify(respObj)) + "\"}");
	}
	else {
		output.pipe(res);
		output.write(JSON.stringify(respObj));
	}
	output.end();
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