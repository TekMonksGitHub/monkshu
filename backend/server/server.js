/** 
 * Main server bootstrap file for the API server.
 * 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020, 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

global.CONSTANTS = require(__dirname + "/lib/constants.js");

const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const conf = require(`${CONSTANTS.CONFDIR}/server.json`);
const gunzipAsync = require("util").promisify(require("zlib").gunzip);

const SERVER_STAMP = utils.generateUUID(false), SERVER_IPC_TOPIC_REQUEST = "_____org_monkshu_server_ipc__request",
	SERVER_IPC_TOPIC_RESPONSE = "_____org_monkshu_server_ipc__response", SERVER_ID_HEADER = "x_monkshu_serverid";
let _server;	// holds the transport 
let blackboard; // for server IPC

// support starting in stand-alone config
if (require("cluster").isMaster == true) bootstrap();	

async function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");

	/* Setup server ID stamp, IP etc */
	CONSTANTS.SERVER_ID = utils.generateUUID(false);
	CONSTANTS.SERVER_IP = utils.getLocalIPs()[0];
	CONSTANTS.SERVER_START_TIME = Date.now();

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(`${CONSTANTS.LOGDIR}/${conf.logfile}`);
	LOG.overrideConsole();

	/* Warn if in debug mode */
	if (conf.debug_mode) {
		LOG.warn("**** Server is in debug mode, expect severe performance degradation.");
		LOG.console("**** Server is in debug mode, expect severe performance degradation.\n");
	}

	/* Init the cluster memory */
	LOG.info("Initializing the cluster memory.");
	require(CONSTANTS.LIBDIR+"/clustermemory.js").init();
	
	/* Start the network check service */
	LOG.info("Initializing the network checker.")
	require(CONSTANTS.LIBDIR+"/netcheck.js").init();

	/* Start the queue executor */
	LOG.info("Initializing the queue executor.");
	require(CONSTANTS.LIBDIR+"/queueExecutor.js").init();

	/* Init the list of apps */
	LOG.info("Initializing the apps list.");
	require(CONSTANTS.LIBDIR+"/app.js").initSync();

	/* Init the API registry */
	LOG.info("Initializing the API registry.");
	const apireg = require(CONSTANTS.LIBDIR+"/apiregistry.js");
	apireg.initSync();

	/* Init the built in blackboard server */
	LOG.info("Initializing the distributed blackboard.");
	blackboard = require(CONSTANTS.LIBDIR+"/blackboard.js");
	blackboard.init();

	/* Run the transport */
	await _initAndRunTransportLoop();

	/* Init the global memory */
	LOG.info("Initializing the global memory.");
	await require(CONSTANTS.LIBDIR+"/globalmemory.js").init();

	/* Setup inter-server IPC */
	LOG.info("Initializing inter-server communications.");
	_initInterServerIPC();
	
	/* Init the apps themselves */
	LOG.info("Initializing the apps.");
	try {require(CONSTANTS.LIBDIR+"/app.js").initAppsSync()} catch (err) {
		LOG.error(`Error initializing the apps ${err}.${err.stack?"\n"+err.stack:""}`);
		throw err;	// stop the server as app init failed
	}

	/* Log the start */
	LOG.info("Server started.");
	LOG.console("\nServer started.");
}

async function _initAndRunTransportLoop() {
	/* Init the transport */
	_server = require(CONSTANTS.LIBDIR+"/"+require(CONSTANTS.TRANSPORT).servertype+".js");
	if (_server.initAsync) await _server.initAsync(); else if (server.initSync) server.initSync(); 
	module.exports.blacklistIP = _server.blacklistIP; module.exports.whitelistIP = _server.whitelistIP
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	_server.onData = (chunk, servObject) => servObject.env.data = servObject.env.data ? (Buffer.isBuffer(servObject.env.data) ?
		Buffer.concat([servObject.env.data, chunk]) : servObject.env.data + chunk) : chunk;
	_server.onReqEnd = async (url, headers, servObject) => {
		const send500 = error => {
			LOG.info(`Sending Internal Error for: ${url}, due to ${error}${error.stack?"\n"+error.stack:""}`);
			_server.statusInternalError(servObject, error); _server.end(servObject);
		}
		
		if (servObject.compressionFormat == CONSTANTS.GZIP && servObject.env.data && Buffer.isBuffer(servObject.env.data)) try {
			servObject.env.data = await gunzipAsync(servObject.env.data); } catch (err) {send500(err); return;}
		const {code, respObj, reqObj} = await doService(servObject.env.data, servObject, headers, url);
		if (code == 200) {
			LOG.debug("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {}; APIREGISTRY.injectResponseHeaders(url, respObj, headers, respHeaders, servObject, reqObj);
			respHeaders[SERVER_ID_HEADER] = SERVER_STAMP;

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
		} else if (code == 504) {
            LOG.info("Sending api timeout for: " + url);
            _server.statusTimeOut(servObject);
            _server.end(servObject, respObj.error);
        } else if (code == 999) {/*special do nothing code*/} else send500(respObj.error);
	}
}

async function doService(data, servObject, headers, url) {
	LOG.info(`Got request. From: [${servObject.env.remoteHost}]:${servObject.env.remotePort} Agent: ${servObject.env.remoteAgent} URL: ${url}`);
	
	const urlParams = new URL(url).searchParams, headersPlusURLParams = {...headers};
	for (const urlParam of urlParams) if (urlParam[0] == SERVER_ID_HEADER) headersPlusURLParams[urlParam[0]] = urlParam[1];
	if (headersPlusURLParams[SERVER_ID_HEADER]) LOG.info(`Sticky server ID header found. Redirect: ${SERVER_STAMP} -> ${headersPlusURLParams[SERVER_ID_HEADER]}`);
	if (headersPlusURLParams[SERVER_ID_HEADER] && (headersPlusURLParams[SERVER_ID_HEADER] != SERVER_STAMP)) {
		const ipcServerReply = await _getResponseViaInternalIPC(data, servObject, headersPlusURLParams, url);
		return ipcServerReply;
	}
	
	if (conf.debug_mode) { LOG.warn("Server in debug mode, re-initializing the registry on every request"); APIREGISTRY.initSync(true); }
	const api = APIREGISTRY.getAPI(url), apiconf = APIREGISTRY.getAPIConf(url);
	LOG.info("Looked up service, calling: " + api);
	
	if (api) {
		let jsonObj = {}; 

		try { jsonObj = APIREGISTRY.decodeIncomingData(url, data, headers, servObject); } catch (error) {
			LOG.info("APIREGISTRY error: " + error); return ({code: 500, respObj: {result: false, error}}); }

		let reason = {};
		if (!(await APIREGISTRY.checkSecurity(url, jsonObj, headers, servObject, reason))) {
			LOG.error(`API security check failed for ${url}, reason: ${reason.reason}`); return ({code: reason.code||401, respObj: {result: false, error: "Security check failed."}, reqObj: jsonObj}); }

		try { 
			const apiModule = apiconf.reloadOnDebug?.trim().toLowerCase() == "false" ? require(api) :
				utils.requireWithDebug(api, conf.debug_mode);
			if (apiModule.handleRawRequest) {await apiModule.handleRawRequest(jsonObj, servObject, headers, url, apiconf); return ({code: 999});}
			else return ({code: 200, respObj: await apiModule.doService(jsonObj, servObject, headers, url, apiconf), reqObj: jsonObj}); 
		} catch (error) {
			LOG.error(`API error: ${error.message || error}${error.stack?`, stack is: ${error.stack}`:""}`); 
			return ({code: error.status||500, respObj: {result: false, error: error.message||error}, reqObj: jsonObj}); 
		}
	} else return ({code: 404, respObj: {result: false, error: "API Not Found"}});
}

function _getResponseViaInternalIPC(data, servObject, headers, url) {
	return new Promise(resolve => {
		const bboptions = {}; bboptions[blackboard.EXTERNAL_ONLY] = true;
		const id = utils.generateUUID(false);
		blackboard.subscribe(SERVER_IPC_TOPIC_RESPONSE, function(result) {
			if ((result.id != id) || (result.stamp != headers[SERVER_ID_HEADER])) return;
			blackboard.unsubscribe(SERVER_IPC_TOPIC_RESPONSE, this); resolve(result);
		}, bboptions);
		blackboard.publish(SERVER_IPC_TOPIC_REQUEST, {data, servObject: _server.getSerializableServObject(servObject),
			headers, url, id, stamp: headers[SERVER_ID_HEADER]});
	});
}

function _initInterServerIPC() {
	const bboptions = {}; bboptions[blackboard.EXTERNAL_ONLY] = true;
	blackboard.subscribe(SERVER_IPC_TOPIC_REQUEST, async request => {
		if (request.stamp != SERVER_STAMP) return;	// not for us
		const result = await doService(request.data, _server.inflateServObject(request.servObject), request.headers, request.url);
		blackboard.publish(SERVER_IPC_TOPIC_RESPONSE, {...result, id: request.id, stamp: SERVER_STAMP}); 
	}, bboptions);
}

module.exports = {bootstrap, doService};