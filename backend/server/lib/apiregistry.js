/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");
const urlMod = require("url");
const path = require("path");
let apireg;

function initSync() {
	let apiRegistryRaw = fs.readFileSync(CONSTANTS.API_REGISTRY);
	LOG.info("Read API registry: " + apiRegistryRaw);
	apireg = JSON.parse(apiRegistryRaw);

	fs.readdirSync(CONSTANTS.APPROOTDIR).forEach(app => {
		if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`)) {
			let regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/apiregistry.json`);
			LOG.info("Read App API registry: " + apiRegistryRaw);
			let regThis = JSON.parse(regThisRaw);
			Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
			apireg = { ...apireg, ...regThis };
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
		let query = urlMod.parse(apireg[url], true).query;
		return (query.encrypted && (query.encrypted.toLowerCase() === "true"));
	}
	else return false;
}

function isGet(url) {
	if (apireg[url]) {
		let query = urlMod.parse(apireg[url], true).query;
		return (query.get && (query.get.toLowerCase() === "true"));
	}
	else return false;
}

function checkKey(url, req) {
	if (apireg[url]) {
		let keyExpected = urlMod.parse(apireg[url], true).query.key;
		let retVal = (keyExpected == req[CONSTANTS.APIKEY]);
		delete req[CONSTANTS.APIKEY];
		return retVal;
	}
	else return false;
}

function listAPIs() {
	let list = Object.keys(apireg);
	let retList = [];
	list.forEach(srv => { if (!srv.startsWith("/admin")) retList.push(srv); });
	return retList;
}

module.exports = {
	initSync: initSync,
	getAPI: getAPI,
	isEncrypted: isEncrypted,
	isGet: isGet,
	checkKey: checkKey,
	listAPIs: listAPIs
};
