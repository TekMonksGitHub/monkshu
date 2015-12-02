/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require("fs");
var APP_CONSTANTS = require(__dirname + "/lib/constants.js");

exports.doService = doService;

function doService(jsonReq, callback) {
	var userdbPath = 
		require(CONSTANTS.LIBDIR+"/userid.js").getUserPath(jsonReq.id);
	
	var fileName = userdbPath + "/" + jsonReq.ts + APP_CONSTANTS.NOTE_EXT;
	log.info("Note file requested: " + fileName);
	
	var resp = {}; resp["result"] = true;
	
	fs.exists(fileName, function(exists) {
		if (exists) {
			fs.readFile(fileName, function(err, data) {
				if (!err) resp.data = JSON.parse(data);
				else resp["result"] = false;
				
				callback(resp);
			});
		} else {
			log.error("File not found: " + fileName);
			resp["result"] = false;
				
			callback(resp);
		}
	});
}