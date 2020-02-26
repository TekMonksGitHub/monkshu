/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");
const urlMod = require("url");
const path = require("path");
const utils = require(CONSTANTS.LIBDIR+"/utils.js");
const tokenManager = require(CONSTANTS.LIBDIR+"/apitokenmanager.js");
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

	global.apiregistry = this;
}

function getAPI(url) {
	if (apireg[url]) return path.resolve(`${CONSTANTS.ROOTDIR}/${urlMod.parse(apireg[url], true).pathname}`);
	else return;
}

function isEncrypted(url) {
	if (apireg[url]) {
		const query = urlMod.parse(apireg[url], true).query;
		return (query.encrypted && (query.encrypted.toLowerCase() === "true"));
	}
	else return false;
}

function isGet(url) {
	if (apireg[url]) {
		const query = urlMod.parse(apireg[url], true).query;
		return (query.get && (query.get.toLowerCase() === "true"));
	}
	else return false;
}

function checkSecurity(url, req, headers) {
	return _checkAPIKey(url, req, headers) && _checkAPIToken(url, headers);
}

function _checkAPIKey(url, req, headers) {
	if (apireg[url]) {
		const keyExpected = urlMod.parse(apireg[url], true).query.key;
		if (!keyExpected) return true; else for (const apiKeyHeaderName of CONSTANTS.APIKEYS) {
			if (req[apiKeyHeaderName] == keyExpected) {delete req[apiKeyHeaderName]; return true;}
			if (headers[apiKeyHeaderName] == keyExpected) {delete headers[apiKeyHeaderName]; return true;}
		} 
	}
	
	return false;	// bad URL or API check failed
}

function _checkAPIToken(url, headers) {
	if (apireg[url]) {
		if (!utils.parseBoolean(urlMod.parse(apireg[url], true).query.needsToken)) return true;	// no token needed

		const token_splits = headers.Authorization?headers.Authorization.split(" "):[];
		if (token_splits.length == 2) return tokenManager.checkToken(token_splits[1]); 
		else return false;	// missing or badly formatted token

	} else return false;	// bad URL
}

function doesApiInjectToken(url, response) {
	return (apireg[url] && urlMod.parse(apireg[url], true).query.addsToken && response.result);
}

function getToken(url, response) {
	if (doesApiInjectToken(url, response)) return tokenManager.getToken(urlMod.parse(apireg[url], true).query.addsToken);
	else return "";
}

function listAPIs() {
	let list = Object.keys(apireg);
	let retList = []; 
	list.forEach( srv => {if (!srv.startsWith("/admin")) retList.push(srv);} );
	return retList;
}

module.exports = {initSync, getAPI, isEncrypted, isGet, checkSecurity, listAPIs, doesApiInjectToken, getToken};
