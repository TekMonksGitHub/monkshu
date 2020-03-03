/* 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020. TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 * 
 * This is our main API Manager class.
 */

const fs = require("fs");
const path = require("path");
const urlMod = require("url");
let decoders, encoders, headermanagers, securitycheckers, apireg;

function initSync() {
	const apiRegistryRaw = fs.readFileSync(CONSTANTS.API_REGISTRY);
	LOG.info("Read API registry: " + apiRegistryRaw);
	apireg = JSON.parse(apiRegistryRaw);

	let decoderPathAndRoots = [{path: `${CONSTANTS.ROOTDIR}/${CONSTANTS.API_MANAGER_DECODERS_CONF}`, root: CONSTANTS.ROOTDIR}];
	let encoderPathAndRoots = [{path: `${CONSTANTS.ROOTDIR}/${CONSTANTS.API_MANAGER_ENCODERS_CONF}`, root: CONSTANTS.ROOTDIR}];
	let headermanagersPathAndRoots = [{path: `${CONSTANTS.ROOTDIR}/${CONSTANTS.API_MANAGER_HEADERMANAGERS_CONF}`, root: CONSTANTS.ROOTDIR}];
	let securitycheckersPathAndRoots = [{path: `${CONSTANTS.ROOTDIR}/${CONSTANTS.API_MANAGER_SECURITYCHECKERS_CONF}`, root: CONSTANTS.ROOTDIR}];

	fs.readdirSync(CONSTANTS.APPROOTDIR).forEach(app => {
		if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`)) {
			let regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`);
			LOG.info("Read App API registry: " + apiRegistryRaw);
			let regThis = JSON.parse(regThisRaw);
			Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
			apireg = {...apireg, ...regThis};
		}

		const appRoot = `${CONSTANTS.APPROOTDIR}/${app}`;
		if (fs.existsSync(`${appRoot}/${CONSTANTS.API_MANAGER_DECODERS_CONF}`)) decoderPathAndRoots.push(
			{path: `${appRoot}/${CONSTANTS.API_MANAGER_DECODERS_CONF}`, root: appRoot});
		if (fs.existsSync(`${appRoot}/${CONSTANTS.API_MANAGER_ENCODERS_CONF}`)) encoderPathAndRoots.push(
			{path: `${appRoot}/${CONSTANTS.API_MANAGER_ENCODERS_CONF}`, root: appRoot});
		if (fs.existsSync(`${appRoot}/${CONSTANTS.API_MANAGER_HEADERMANAGERS_CONF}`)) headermanagersPathAndRoots.push(
			{path: `${appRoot}/${CONSTANTS.API_MANAGER_HEADERMANAGERS_CONF}`, root: appRoot});
		if (fs.existsSync(`${appRoot}/${CONSTANTS.API_MANAGER_SECURITYCHECKERS_CONF}`)) securitycheckersPathAndRoots.push(
			{path: `${appRoot}/${CONSTANTS.API_MANAGER_SECURITYCHECKERS_CONF}`, root: appRoot});
	});

	decoders = _loadSortedConfOjbects(decoderPathAndRoots);
	encoders = _loadSortedConfOjbects(encoderPathAndRoots);
	headermanagers = _loadSortedConfOjbects(headermanagersPathAndRoots);
	securitycheckers = _loadSortedConfOjbects(securitycheckersPathAndRoots);

	for (const decoderThis of decoders) if (decoderThis.initSync) decoderThis.initSync(apireg);
	for (const securitycheckerThis of securitycheckers) if (securitycheckerThis.initSync) securitycheckerThis.initSync(apireg);
	for (const headermanagerThis of headermanagers) if (headermanagerThis.initSync) headermanagerThis.initSync(apireg);
	for (const encoderThis of encoders) if (encoderThis.initSync) encoderThis.initSync(apireg);

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

function _loadSortedConfOjbects(pathAndRoots) {
	let sortedConfObjects = []; 
	for (const {path, root} of pathAndRoots) {
		const rawObject = require(path);

		for (const key of Object.keys(rawObject)) sortedConfObjects.push(
			{"module":`${root}/lib/apiregistry_extensions/${key.toLowerCase()}.js`, "priority":rawObject[key]} );
	}
	
	sortedConfObjects.sort((a,b) => (a.priority < b.priority) ? -1 : (a.priority > b.priority) ? 1 : 0);

	for (const [i, confObject] of sortedConfObjects.entries()) sortedConfObjects[i] = require(confObject.module);

	return sortedConfObjects;
}

module.exports = {initSync, getAPI, listAPIs, decodeIncomingData, checkSecurity, injectResponseHeaders, encodeResponse};