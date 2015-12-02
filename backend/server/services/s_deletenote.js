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
		
	var filePath = userdbPath + "/" + jsonReq.ts + APP_CONSTANTS.NOTE_EXT;
		
	fs.unlink(filePath, function(err) {
		if (err) {
			var resp = {}; resp["result"] = false; resp["reason"] = err;
			callback(resp);
		} else {
			var resp = {}; resp["result"] = true;
			callback(resp);
		}
	});
}
