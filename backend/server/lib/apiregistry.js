/* 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020. TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 * 
 * This is our main API Manager class.
 */

const fs = require("fs");
const path = require("path");
const urlMod = require("url");
const decoders = _loadSortedConfOjbects(CONSTANTS.API_MANAGER_DECODERS_CONF);
const encoders = _loadSortedConfOjbects(CONSTANTS.API_MANAGER_ENCODERS_CONF);
const headermanagers = _loadSortedConfOjbects(CONSTANTS.API_MANAGER_HEADERMANAGERS_CONF);
const securitycheckers = _loadSortedConfOjbects(CONSTANTS.API_MANAGER_SECURITYCHECKERS_CONF);
let apireg;

function initSync() {
	const apiRegistryRaw = fs.readFileSync(CONSTANTS.API_REGISTRY);
	LOG.info("Read API registry: " + apiRegistryRaw);
	apireg = JSON.parse(apiRegistryRaw);

	fs.readdirSync(CONSTANTS.APPROOTDIR).forEach(app => {
		if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`)) {
			let regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`);
			LOG.info("Read App API registry: " + apiRegistryRaw);
			let regThis = JSON.parse(regThisRaw);
			Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
			apireg = {...apireg, ...regThis};
		}
	});

	for (const decoderThis of decoders) if (decoderThis.initSync) decoderThis.initSync(apireg);
	for (const securitycheckerThis of securitycheckers) if (securitycheckerThis.initSync) securitycheckerThis.initSync(apireg);
	for (const headermanagerThis of headermanagers) if (headermanagerThis.initSync) headermanagerThis.initSync(apireg);

	global.apiregistry = this;
}

function getAPI(url) {
	const endPoint = urlMod.parse(url, true).pathname;
	if (apireg[endPoint]) return path.resolve(`${CONSTANTS.ROOTDIR}/${urlMod.parse(apireg[endPoint], true).pathname}`);
	else return;
}

function decodeIncomingData(url, data, headers) {
	const endPoint = urlMod.parse(url, true).pathname;
	let apiregentry = apireg[endPoint]; if (!apiregentry) return false; apiregentry = urlMod.parse(apireg[endPoint], true);

	let decoded = data;
	for (const decoderThis of decoders) decoded = decoderThis.decodeIncomingData(apiregentry, url, decoded, headers);

	return decoded;
}

function encodeResponse(url, respObj, reqHeaders, respHeaders) {
	const endPoint = urlMod.parse(url, true).pathname;
	let apiregentry = apireg[endPoint]; if (!apiregentry) return false; apiregentry = urlMod.parse(apireg[endPoint], true);

	let encoded = respObj;
	for (const encoderThis of encoders) encoded = encoderThis.encodeResponse(apiregentry, endPoint, encoded, reqHeaders, respHeaders);

	return encoded;
}

function checkSecurity(url, req, headers) {
	const endPoint = urlMod.parse(url, true).pathname;
	let apiregentry = apireg[endPoint]; if (!apiregentry) return false; apiregentry = urlMod.parse(apireg[endPoint], true);

	for (const securitycheckerThis of securitycheckers) 
		if (!securitycheckerThis.checkSecurity(apiregentry, endPoint, req, headers)) return false;

	return true;
}

function injectResponseHeaders(url, response, requestHeaders, responseHeaders) {
	const endPoint = urlMod.parse(url, true).pathname;
	let apiregentry = apireg[endPoint]; if (!apiregentry) return; apiregentry = urlMod.parse(apireg[endPoint], true);

	for (const headermanagerThis of headermanagers) 
		headermanagerThis.injectResponseHeaders(apiregentry, endPoint, response, requestHeaders, responseHeaders);
}

function listAPIs() {
	let list = Object.keys(apireg);
	let retList = []; 
	list.forEach( srv => {if (!srv.startsWith("/admin")) retList.push(srv);} );
	return retList;
}

function _loadSortedConfOjbects(path) {
	let rawObject = require(path);
	let sortedConfObjects = []; 

	for (const key of Object.keys(rawObject)) sortedConfObjects.push(
		{"module":`${CONSTANTS.LIBDIR}/apiregistry_extensions/${key.toLowerCase()}.js`, "priority":rawObject[key]});
	sortedConfObjects.sort((a,b) => (a.priority < b.priority) ? -1 : (a.priority > b.priority) ? 1 : 0);

	for (const [i, confObject] of sortedConfObjects.entries()) sortedConfObjects[i] = require(confObject.module);

	return sortedConfObjects;
}

module.exports = {initSync, getAPI, listAPIs, decodeIncomingData, checkSecurity, injectResponseHeaders, encodeResponse};