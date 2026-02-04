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
const SSE_TIMEOUTS = {}, DEFAULT_SSE_INTERVAL = 10000;
let _server;	// holds the transport 
let blackboard; // for server IPC

// support starting in stand-alone config
if (require("cluster").isMaster == true && (!process.env.___TESTING_)) bootstrap();	

async function bootstrap() {
	/* Init - Server bootup */
	console.log("Starting...");

	/* Setup server ID stamp, IP etc */
	CONSTANTS.SERVER_ID = utils.generateUUID(false);
	CONSTANTS.SERVER_IP = utils.getLocalIPs()[0];
	CONSTANTS.SERVER_START_TIME = Date.now();
	CONSTANTS.SERVER_CONF = conf;

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(`${CONSTANTS.LOGDIR}/${CONSTANTS.SERVER_CONF.logfile}`);
	LOG.overrideConsole();

	/* Warn if in debug mode */
	if (CONSTANTS.SERVER_CONF.debug_mode) {
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

	/* Init the distributed job handler */
	LOG.info("Initializing the distributed job handler.");
	distributedjobhandler = require(CONSTANTS.LIBDIR+"/distributedjobhandler.js");
	distributedjobhandler.init();

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
	const transportConf = require(CONSTANTS.TRANSPORT);
	_server = require(CONSTANTS.LIBDIR+"/"+transportConf.servertype+".js");
	if (_server.initAsync) await _server.initAsync(); else if (server.initSync) server.initSync(); 
	module.exports.blacklistIP = _server.blacklistIP; module.exports.whitelistIP = _server.whitelistIP
	
	/* Server loop */
	/* send request to the service mentioned in url*/
	_server.onConnect = async (url, headers, servObject) => {
		if (APIREGISTRY.getAPI(url) && transportConf.drop_insecure_immediately && 
				(APIREGISTRY.getAPIConf(url).checksec_immediate?.toLowerCase() != "false")) {	// check security early
			
			const jsonObjForSecurityCheck = APIREGISTRY.decodeIncomingData(url, "{}", headers, servObject);
			let reason = {}; if (!(await APIREGISTRY.checkSecurity(url, jsonObjForSecurityCheck, headers, servObject, reason))) {
				LOG.error(`API security check failed for ${url}, reason: ${reason.reason}`); 
				_server.destroy(servObject);
				return;
			}
		}
		doSSEIfSSEEndpoint(servObject, headers, url);	// SSE support
	}
	_server.onConnectionClose = (url, headers, servObject) => stopSSEIfSSEEndpoint(servObject, headers, url);
	_server.onData = (url, chunk, servObject) => isAPI(url) ? (servObject.env.data = servObject.env.data ? (Buffer.isBuffer(servObject.env.data) ?
		Buffer.concat([servObject.env.data, chunk]) : servObject.env.data + chunk) : chunk) : {/*not API do nothing*/};
	_server.onReqEnd = async (url, headers, servObject) => {
		const send500 = error => {
			LOG.info(`Sending Internal Error for: ${url}, due to ${error}${error.stack?"\n"+error.stack:""}`);
			_server.statusInternalError(servObject, error); _server.end(servObject);
		}
		if (!isAPI(url)) return;	// skip sending responses for SSE for example
		
		if (servObject.compressionFormat == CONSTANTS.GZIP && servObject.env.data && Buffer.isBuffer(servObject.env.data)) try {
			servObject.env.data = await gunzipAsync(servObject.env.data); } catch (err) {send500(err); return;}
		const {code, respObj, reqObj} = await doService(servObject.env.data, servObject, headers, url);
		if (code == 200) {
			LOG.debug("Got result: " + LOG.truncate(JSON.stringify(respObj)));
			let respHeaders = {}; APIREGISTRY.injectResponseHeaders(url, respObj, headers, respHeaders, servObject, reqObj);
			respHeaders[SERVER_ID_HEADER] = SERVER_STAMP;

			try {
				const responseToSend = APIREGISTRY.encodeResponse(url, respObj, headers, respHeaders, servObject);
				_server.statusOK(respHeaders, servObject);
				await _server.write(responseToSend, servObject);
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
	
	if (CONSTANTS.SERVER_CONF.debug_mode) { LOG.warn("Server in debug mode, re-initializing the registry on every request"); APIREGISTRY.initSync(true); }
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
				utils.requireWithDebug(api, CONSTANTS.SERVER_CONF.debug_mode);
			if (apiModule.handleRawRequest) {await apiModule.handleRawRequest(jsonObj, servObject, headers, url, apiconf); return ({code: 999});}
			else {
				if (apiconf.respondviasse?.trim().toLowerCase() == "true") {
					const requestid = `${Date.now()}${Math.ceil(1000*Math.random())}`;
					_runAPIAndSetSSEMemory(apiModule, requestid, jsonObj, servObject, headers, url, apiconf);
					return ({code: 200, respObj: {requestid, ...CONSTANTS.TRUE_RESULT}, reqObj: jsonObj});
				} else return ({code: 200, respObj: await apiModule.doService(jsonObj, servObject, headers, url, apiconf), reqObj: jsonObj}); 
			}
		} catch (error) {
			LOG.error(`API error: ${error.message || error}${error.stack?`, stack is: ${error.stack}`:""}`); 
			return ({code: error.status||500, respObj: {result: false, error: error.message||error}, reqObj: jsonObj}); 
		}
	} else return ({code: 404, respObj: {result: false, error: "API Not Found"}});
}

async function doSSEIfSSEEndpoint(servObject, headers, url) {	// polling interval is config.sseint or url?sseint=interval or default is 10 seconds
	if (CONSTANTS.SERVER_CONF.debug_mode) { LOG.warn("Server in debug mode, re-initializing the registry on every request"); APIREGISTRY.initSync(true); }
	const sseAPI = APIREGISTRY.getAPI(url), sseAPIConf = APIREGISTRY.getAPIConf(url), urlParams = new URL(url).searchParams;
	if (sseAPI && (sseAPIConf.sse?.toString().toLowerCase() == "true")) {	// this URL is an SSE endpoint
		LOG.info("Looked up SSE service, checking security for: " + sseAPI);
		const jsonObjFromURLParams = APIREGISTRY.decodeIncomingData(url, "{}", headers, servObject);
		let reason = {}; if (!(await APIREGISTRY.checkSecurity(url, jsonObjFromURLParams, headers, servObject, reason))) {
			LOG.error(`SSE security check failed for ${url}, reason: ${reason.reason}`);  return false;}

		try { 
			LOG.info("SSE setting up polling for: " + sseAPI);
			const sseAPIModule = sseAPIConf.reloadOnDebug?.trim().toLowerCase() == "false" ? require(sseAPI) :
				utils.requireWithDebug(sseAPI, CONSTANTS.SERVER_CONF.debug_mode);
			_server.statusOK({"content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive", "content-encoding": "none"}, servObject);
			const sseEventSender = (jsonObj={}) => {
				const event = jsonObj.event||"monkshu_sse", id = jsonObj.id||Date.now();
				const dataObj = jsonObj.event && jsonObj.id && jsonObj.data ? jsonObj.data : jsonObj;
				_server.write(`event: ${event}\nid: ${id}\ndata: ${JSON.stringify(dataObj)}\n\n`, servObject, "utf-8", true);
				LOG.info(`Sent SSE with ID: ${id} for ${url}`);
			}
			const requestID = `${servObject.env.remoteHost}:${servObject.env.remotePort}`;
			const sseinterval = parseInt(sseAPIConf.sseint||urlParams.get("sseint")||DEFAULT_SSE_INTERVAL);
			if (sseinterval > 0) SSE_TIMEOUTS[requestID] = utils.setIntervalImmediately(_=>sseAPIModule.doSSE(jsonObjFromURLParams, sseEventSender, servObject, headers, url, sseAPIConf), sseinterval);
			else sseAPIModule.doSSE(jsonObjFromURLParams, sseEventSender, servObject, headers, url, sseAPIConf);	// SSE endpoint will decide its own frequency etc
			if (conf.sse_keepalive) SSE_TIMEOUTS["KEEP_ALIVE"+requestID] = setInterval(	// add keep alives
				_=>_server.write(":keepalive", servObject, "utf-8", true), conf.sse_keepalive);
			LOG.info(`Started SSE endpoint: ${sseAPI}`);
		} catch (error) {
			LOG.error(`SSE ${sseAPI} has error: ${error.message || error}${error.stack?`, stack is: ${error.stack}`:""}`);
		} 
	} // not ours 
}

function stopSSEIfSSEEndpoint(servObject, headers, url) {	// stop SSE poll calls if the endpoint is an SSE endpoint
	if (CONSTANTS.SERVER_CONF.debug_mode) { LOG.warn("Server in debug mode, re-initializing the registry on every request"); APIREGISTRY.initSync(true); }
	const sseAPI = APIREGISTRY.getAPI(url), sseAPIConf = APIREGISTRY.getAPIConf(url);
	if (sseAPI && (sseAPIConf.sse?.toString().toLowerCase() == "true")) {
		const requestID = `${servObject.env.remoteHost}:${servObject.env.remotePort}`;
		if (SSE_TIMEOUTS[requestID]) {
			clearInterval(SSE_TIMEOUTS[requestID]); delete SSE_TIMEOUTS[requestID]; } 
		if (SSE_TIMEOUTS["KEEP_ALIVE"+requestID]) {	// delete keep alives
			clearInterval(SSE_TIMEOUTS["KEEP_ALIVE"+requestID]); delete SSE_TIMEOUTS["KEEP_ALIVE"+requestID]; }
		const sseAPIModule = sseAPIConf.reloadOnDebug?.trim().toLowerCase() == "false" ? require(sseAPI) :
			utils.requireWithDebug(sseAPI, CONSTANTS.SERVER_CONF.debug_mode);
		if (sseAPIModule.endSSE) sseAPIModule.endSSE(servObject, headers, url, sseAPIConf);	// SSE can cleanup here if needed
		LOG.info(`Stopped SSE endpoint: ${sseAPI}`);
		return true;
	} else return false;	// this is not an SSE endpoint
}

const isAPI = url => {
	if (CONSTANTS.SERVER_CONF.debug_mode) { LOG.warn("Server in debug mode, re-initializing the registry on every request"); APIREGISTRY.initSync(true); }
	const api = APIREGISTRY.getAPI(url), apiConf = APIREGISTRY.getAPIConf(url);
	return (api && (apiConf.sse?.toString().toLowerCase() != "true"));	// API found and it is not an SSE event endpoint
}

async function _runAPIAndSetSSEMemory(apiModule, requestid, jsonObj, servObject, headers, url, apiconf) {
	const clientMemory = CLUSTER_MEMORY.get(CONSTANTS.MEM_KEY+jsonObj.clientid, {});
	try {
		const respObj = await apiModule.doService(jsonObj, servObject, headers, url, apiconf);
		clientMemory[requestid] = respObj;
	} catch (error) {
		LOG.error(`API error: ${error.message || error}${error.stack?`, stack is: ${error.stack}`:""}`); 
		clientMemory[requestid] = {result: false, error: error.message||error};
	}
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