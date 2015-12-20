/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

exports.getUserPath = getUserPath;

function getUserPath(id, callback) {
	var hashpath = require(CONSTANTS.LIBDIR+"/hashpath.js");
	
	hashpath.create_valid_hash_path(id, function(hash) {
		if (hash == null) hash = id; 	// error!
		
		callback(CONSTANTS.USERS_DB_PATH + "/" + hash + "/");
	});
}