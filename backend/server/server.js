/* 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");

exports.bootstrap = bootstrap;

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(CONSTANTS.LOGMAIN);

	/* Init the cluster memory */
	LOG.info("Initializing the cluster memory.");
	require(CONSTANTS.LIBDIR+"/clustermemory.js").init();

	/* Init the apps */
	LOG.info("Initializing the apps.");
	require(CONSTANTS.LIBDIR+"/app.js").initSync();

	/* Init the API registry */
	const apireg = require(CONSTANTS.LIBDIR+"/apiregistry.js");
	LOG.info("Initializing the API registry.");
	apireg.initSync();

	/* Init the built in blackboard server */
	LOG.info("Initializing the distributed blackboard.");
	require(CONSTANTS.LIBDIR+"/blackboard.js").init();

	/* Init the global memory */
	LOG.info("Initializing the global memory.");
	require(CONSTANTS.LIBDIR+"/globalmemory.js").init();

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
		const send500 = error => {
			LOG.info(`Sending Internal Error for: ${url}, due to ${error}`);
			server.statusInternalError(servObject, error); server.end(servObject);
		}
		
		const {code, respObj} = await doService(url, servObject.env.data, headers, servObject);
		if (code == 200) {
			LOG.debug("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {}; APIREGISTRY.injectResponseHeaders(url, respObj, headers, respHeaders, servObject);

			try {
				server.statusOK(respHeaders, servObject);
				await server.write(APIREGISTRY.encodeResponse(url, respObj, headers, respHeaders, servObject), servObject);
				server.end(servObject);
			} catch (err) {send500(err)}
		} else if (code == 404) {
			LOG.info("Sending Not Found for: " + url);
			server.statusNotFound(servObject);
			server.end(servObject, respObj.error);
		} else if (code == 403 || code == 401) {
			LOG.info("Sending Unauthorized for: " + url);
			server.statusUnauthorized(servObject);
			server.end(servObject, respObj.error);
		} else if (code == 429) {
			LOG.info("Sending Throttled for: " + url);
			server.statusThrottled(servObject);
			server.end(servObject, respObj.error);
		} else if (code == 999) {/*special do nothing code*/} else send500(respObj.error);
	}
}

async function doService(url, data, headers, servObject) {
	LOG.info("Got request for the url: " + url);
	
	const api = APIREGISTRY.getAPI(url);
	LOG.info("Looked up service, calling: " + api);
	
	if (api) {
		let jsonObj = {}; 

		try { jsonObj = APIREGISTRY.decodeIncomingData(url, data, headers, servObject); } catch (error) {
			LOG.info("APIREGISTRY error: " + error); return ({code: 500, respObj: {result: false, error}}); }

		let reason = {};
		if (!APIREGISTRY.checkSecurity(url, jsonObj, headers, servObject, reason)) {
			LOG.error(`API security check failed for ${url}, reason: ${reason.reason}`); return ({code: reason.code||401, respObj: {result: false, error: "Security check failed."}}); }

		try { 
			const apiModule = require(api);
			if (apiModule.handleRawRequest) {await apiModule.handleRawRequest(url, jsonObj, headers, servObject); return ({code: 999});}
			else return ({code: 200, respObj: await apiModule.doService(jsonObj, servObject)}); 
		} catch (error) {
			LOG.debug(`API error: ${error}`); 
			return ({code: error.status||500, respObj: {result: false, error: error.message||error}}); 
		}
	} else return ({code: 404, respObj: {result: false, error: "API Not Found"}});
}

