/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require('fs');
var urlMod = require('url');
var servreg;

function initSync() {
	var serviceRegistryRaw = fs.readFileSync(CONSTANTS.SERVICE_REGISTRY);
	log.info("Read service registry: " + serviceRegistryRaw);
	
	global.serviceregistry = this;
	servreg = JSON.parse(serviceRegistryRaw);
}

function getService(url) {
	if (servreg[url]) return CONSTANTS.ROOTDIR + urlMod.parse(servreg[url], true).pathname;
	else return;
}

function isEncrypted(url) {
	if (servreg[url]) return urlMod.parse(servreg[url], true).query.encrypted;
	else return false;
}

function isGet(url) {
	if (servreg[url]) return urlMod.parse(servreg[url], true).query.get;
	else return false;
}

function listServices() {
	var list = Object.keys(servreg);
	var retList = []; 
	list.forEach( function(srv) {if (!srv.startsWith("/admin")) retList.push(srv);} );
	return retList;
}

function addAPI(name, path, callback) {
	servreg["/"+name] = path;
	fs.writeFile(CONSTANTS.SERVICE_REGISTRY, JSON.stringify(servreg, null, " "), function(err) {
		if (err) {
			log.error("Service registry serialization failed.");
			delete servreg["/"+name];	// always in sync!
		}
		callback(err);
	});
}

function deleteAPI(name, callback) {
	delete servreg["/"+name];
	fs.writeFile(CONSTANTS.SERVICE_REGISTRY, JSON.stringify(servreg, null, " "), function(err) {
		if (err) {log.error("Service registry serialization failed.");}
		callback(err);
	});
}

module.exports = {
	initSync : initSync,
	getService : getService,
	isEncrypted : isEncrypted,
	isGet : isGet,
	addAPI : addAPI,
	deleteAPI : deleteAPI,
	listServices : listServices
};
