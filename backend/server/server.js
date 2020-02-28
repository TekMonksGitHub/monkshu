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
	let server = require(CONSTANTS.LIBDIR+"/"+require(CONSTANTS.TRANSPORT).servertype+".js");
	server.initSync();
	
	/* Override the console now - to our log file*/
	LOG.overrideConsole();
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	server.onData = (chunk, servObject) => servObject.env.data = servObject.env.data ? servObject.env.data + chunk : chunk;
	server.onReqEnd = async (url, headers, servObject) => {
		let respObj = await doService(url, servObject.env.data, headers);
		if (respObj) {
			LOG.info("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {"Content-Type" : "application/json"};
			if (apiregistry.doesApiInjectToken(url, respObj)) {
				respHeaders.access_token = apiregistry.getToken(url, respObj); respObj.access_token = respHeaders.access_token;
				respHeaders.token_type = "bearer"; respObj.token_type = respHeaders.token_type;
			}
			server.statusOK(respHeaders, servObject);
			if (apiregistry.isEncrypted(urlMod.parse(url).pathname))
				await server.write("{\"data\":\""+crypt.encrypt(JSON.stringify(respObj))+"\"}", servObject);
			else await server.write(JSON.stringify(respObj), servObject);
			server.end(servObject);
		} else {
			LOG.info("Sending Not Found for: " + url);
			server.statusNotFound(servObject);
			server.end(servObject);
		}
	}
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

