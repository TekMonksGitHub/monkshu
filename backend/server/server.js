/** 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020, 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");

const conf = require(`${CONSTANTS.CONFDIR}/server.json`);
let _server;	// holds the transport 

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

async function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(`${CONSTANTS.LOGDIR}/${conf.logfile}`);
	LOG.overrideConsole();

	/* Init the cluster memory */
	LOG.info("Initializing the cluster memory.");
	require(CONSTANTS.LIBDIR+"/clustermemory.js").init();
	
	/* Start the network check service */
	LOG.info("Initializing the network checker.")
	require(CONSTANTS.LIBDIR+"/netcheck.js").init();

	/* Init the list of apps */
	LOG.info("Initializing the apps list.");
	require(CONSTANTS.LIBDIR+"/app.js").initSync();

	/* Init the API registry */
	const apireg = require(CONSTANTS.LIBDIR+"/apiregistry.js");
	LOG.info("Initializing the API registry.");
	apireg.initSync();

	/* Init the built in blackboard server */
	LOG.info("Initializing the distributed blackboard.");
	require(CONSTANTS.LIBDIR+"/blackboard.js").init();

	/* Run the transport */
	_initAndRunTransportLoop();

	/* Init the global memory */
	LOG.info("Initializing the global memory.");
	await require(CONSTANTS.LIBDIR+"/globalmemory.js").init();
	
	/* Init the apps themselves */
	LOG.info("Initializing the apps.");
	require(CONSTANTS.LIBDIR+"/app.js").initAppsSync();

	/* Log the start */
	LOG.info("Server started.");
	LOG.console("\nServer started.");
}

function _initAndRunTransportLoop() {
	/* Init the transport */
	_server = require(CONSTANTS.LIBDIR+"/"+require(CONSTANTS.TRANSPORT).servertype+".js");
	_server.initSync(); module.exports.blacklistIP = _server.blacklistIP; module.exports.whitelistIP = _server.whitelistIP
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	_server.onData = (chunk, servObject) => servObject.env.data = servObject.env.data ? servObject.env.data + chunk : chunk;
	_server.onReqEnd = async (url, headers, servObject) => {
		const send500 = error => {
			LOG.info(`Sending Internal Error for: ${url}, due to ${error}${error.stack?"\n"+error.stack:""}`);
			_server.statusInternalError(servObject, error); _server.end(servObject);
		}
		
		const {code, respObj, reqObj} = await _doService(servObject.env.data, servObject, headers, url);
		if (code == 200) {
			LOG.debug("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {}; APIREGISTRY.injectResponseHeaders(url, respObj, headers, respHeaders, servObject, reqObj);

			try {
				_server.statusOK(respHeaders, servObject);
				await _server.write(APIREGISTRY.encodeResponse(url, respObj, headers, respHeaders, servObject), servObject);
				_server.end(servObject);
			} catch (err) {send500(err)}
		} else if (code == 404) {
			LOG.info("Sending Not Found for: " + url);
			_server.statusNotFound(servObject);
			_server.end(servObject, respObj.error);
		} else if (code == 403 || code == 401) {
			LOG.info("Sending Unauthorized for: " + url);
			_server.statusUnauthorized(servObject);
			_server.end(servObject, respObj.error);
		} else if (code == 429) {
			LOG.info("Sending Throttled for: " + url);
			_server.statusThrottled(servObject);
			_server.end(servObject, respObj.error);
		} else if (code == 999) {/*special do nothing code*/} else send500(respObj.error);
	}
}

async function _doService(data, servObject, headers, url) {
	LOG.info(`Got request. From: [${servObject.env.remoteHost}]:${servObject.env.remotePort} Agent: ${servObject.env.remoteAgent} URL: ${url}`);
	
	const api = APIREGISTRY.getAPI(url);
	LOG.info("Looked up service, calling: " + api);
	
	if (api) {
		let jsonObj = {}; 

		try { jsonObj = APIREGISTRY.decodeIncomingData(url, data, headers, servObject); } catch (error) {
			LOG.info("APIREGISTRY error: " + error); return ({code: 500, respObj: {result: false, error}}); }

		let reason = {};
		if (!APIREGISTRY.checkSecurity(url, jsonObj, headers, servObject, reason)) {
			LOG.error(`API security check failed for ${url}, reason: ${reason.reason}`); return ({code: reason.code||401, respObj: {result: false, error: "Security check failed."}, reqObj: jsonObj}); }

		try { 
			const apiModule = require(api), apiconf = APIREGISTRY.getAPIConf(url);
			if (apiModule.handleRawRequest) {await apiModule.handleRawRequest(jsonObj, servObject, headers, url, apiconf); return ({code: 999});}
			else return ({code: 200, respObj: await apiModule.doService(jsonObj, servObject, headers, url, apiconf), reqObj: jsonObj}); 
		} catch (error) {
			LOG.debug(`API error: ${error}${error.stack?`, stack is: ${error.stack}`:""}`); 
			return ({code: error.status||500, respObj: {result: false, error: error.message||error}, reqObj: jsonObj}); 
		}
	} else return ({code: 404, respObj: {result: false, error: "API Not Found"}});
}

module.exports = {bootstrap};