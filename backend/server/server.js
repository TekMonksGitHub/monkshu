/* 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");
const crypt = require(CONSTANTS.LIBDIR+"/crypt.js");
const utils = require(CONSTANTS.LIBDIR+"/utils.js");
const urlMod = require("url");

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");
	
	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(CONSTANTS.LOGMAIN);

	/* Init the API registry */
	LOG.info("Initializing the API registry.");
	require(CONSTANTS.LIBDIR+"/apiregistry.js").initSync();

	/* Init the API Token Manager */
	LOG.info("Initializing the API Token Manager.");
	require(CONSTANTS.LIBDIR+"/apitokenmanager.js").initSync();

	/* Run the server */
	initAndRunTransportLoop();
}

function initAndRunTransportLoop() {
	/* Init the transport */
	let transport = require(CONSTANTS.TRANSPORT);
	let server = require(CONSTANTS.LIBDIR+"/"+transport.servertype+".js");
	server.initSync(transport.port, transport.host||"::");
	
	console.log(`Server started on ${transport.host||"::"}:${transport.port}`);
	LOG.info(`Server started on ${transport.host||"::"}:${transport.port}`);
	
	/* Override the console now - to our log file*/
	LOG.overrideConsole();
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	server.connection.on("request", (req, res) => {
		let data = "";
	
		req.on("data", chunk => data+=chunk);
		
		req.on("end", async _ => {
			let respObj = await doService(req.url, data, req.headers);
			if (respObj) {
				LOG.info("Got result: " + LOG.truncate(JSON.stringify(respObj)));
				let headers = {"Content-Type" : "application/json"};
				if (apiregistry.doesApiInjectToken(req.url, respObj)) {
					headers.access_token = apiregistry.getToken(req.url, respObj); respObj.access_token = headers.access_token;
					headers.token_type = "bearer"; respObj.token_type = headers.token_type;
				}
				res.writeHead(200, headers);
				if (apiregistry.isEncrypted(urlMod.parse(req.url).pathname))
					res.write("{\"data\":\""+crypt.encrypt(JSON.stringify(respObj))+"\"}");
				else res.write(JSON.stringify(respObj));
				res.end();
			} else {
				LOG.info("Sending 404 for: " + req.url);
				res.writeHead(404, {"Content-Type": "text/plain"});
				res.write("404 Not Found\n");
				res.end();
			}
		});
	});
}

async function doService(url, data, headers) {
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

		if (!apiregistry.checkSecurity(endPoint, jsonObj, headers)) {LOG.error("API security check failed: "+url); return CONSTANTS.FALSE_RESULT;}
		else try{return await require(api).doService(jsonObj);} catch (err) {LOG.debug(`API error: ${err}`); return CONSTANTS.FALSE_RESULT;}
	}
	else LOG.info("API not found: " + url);
}

