/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require("fs");

exports.doService = doService;

function doService(jsonReq, callback) {
	
	if (!validateRequest(jsonReq, callback)) return;
	
	log.info("Got login request for ID: " + jsonReq.id);
	
	require(CONSTANTS.LIBDIR+"/userid.js").getUserPath(jsonReq.id, function(dirToCheck) {
		log.info("Backend path: " + dirToCheck);
	
		fs.exists(dirToCheck, function(exists) {
			var resp = {};
			resp["result"] = exists;
			
			log.info("Login result: " + exists);
			
			callback(resp);
		});
	});
}

function validateRequest(jsonReq, callback) {
	if ((jsonReq == null) || (jsonReq.id == null)) {
		var resp = {}; resp["result"] = false;
		log.info("Invalid ID or hash.");
		callback(resp);
		return false;
	}
	
	return true;
}
