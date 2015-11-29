/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

var fs = require('fs');
var serviceRegistry;

function init() {
	var serviceRegistryRaw = fs.readFileSync(CONSTANTS.SERVICE_REGISTRY);
	log.info("Read service registry: " + serviceRegistryRaw);
	
	serviceRegistry = JSON.parse(serviceRegistryRaw);
}

function getService(url) {
	return CONSTANTS.ROOTDIR + serviceRegistry[url];
}

module.exports = {
	init : init,
	getService : getService
};
