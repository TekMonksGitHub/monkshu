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

	/* Init the API registry */
	LOG.info("Initializing the API registry.");
	require(CONSTANTS.LIBDIR+"/apiregistry.js").initSync();

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
		
		let {code, respObj} = await doService(url, servObject.env.data, headers);
		if (code == 200) {
			LOG.debug("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {}; apiregistry.injectResponseHeaders(url, respObj, headers, respHeaders);

			try {
				server.statusOK(respHeaders, servObject);
				await server.write(apiregistry.encodeResponse(url, respObj, headers, respHeaders), servObject);
				server.end(servObject);
			} catch (err) {send500(err)}
		} else if (code == 404) {
			LOG.info("Sending Not Found for: " + url);
			server.statusNotFound(servObject);
			server.end(servObject, respObj.error);
		} else if (code == 500) send500(respObj.error);
	}
}

async function doService(url, data, headers) {
	LOG.info("Got request for the url: " + url);
	
	const api = apiregistry.getAPI(url);
	LOG.info("Looked up service, calling: " + api);
	
	if (api) {
		let jsonObj = {}; 

		try { jsonObj = apiregistry.decodeIncomingData(url, data, headers); } catch (error) {
			LOG.info("APIRegistry error: " + error); return ({code: 500, respObj: {result: false, error}}); }

		if (!apiregistry.checkSecurity(url, jsonObj, headers)) {
			LOG.error("API security check failed: "+url); return ({code: 500, respObj: {result: false, error: "Security check failed."}}); }

		try { return ({code: 200, respObj: await require(api).doService(jsonObj)}); } catch (error) {
			LOG.debug(`API error: ${error}`); return ({code: 500, respObj: {result: false, error}}); }
	} else return ({code: 404, respObj: {result: false, error: "API Not Found"}});
}

