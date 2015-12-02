/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

exports.getUserPath = getUserPath;

function getUserPath(id) {
	var hashpath = require(CONSTANTS.LIBDIR+"/hashpath.js");

	return CONSTANTS.USERS_DB_PATH + "/" + hashpath.create_valid_hash_path(id) + "/";
}