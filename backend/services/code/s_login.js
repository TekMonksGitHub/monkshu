/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

var fs = require("fs");
var APP_CONSTANTS = require(__dirname + "/lib/constants.js");

exports.doService = doService;

function doService(jsonReq, callback) {
	
	if (!validateRequest(jsonReq, callback)) return;
	
	var hashpath = require(APP_CONSTANTS.LIBDIR+"/hashpath.js");
	
	log.info("Got login request for ID: " + jsonReq.id);
	
	var phrase = hashpath.create_valid_hash_path(jsonReq.id);
	
	log.info("Backend phrase: " + phrase);
	
	var dirToCheck = APP_CONSTANTS.USERS_DB_PATH+"/"+phrase;
		
	fs.exists(dirToCheck, function(exists) {
		var resp = {};
		resp["result"] = exists;
		
		log.info("Login result: " + exists);
		
		callback(resp);
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
