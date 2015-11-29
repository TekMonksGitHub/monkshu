/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

exports.getUserPath = getUserPath;

function getUserPath(id) {
	var APP_CONSTANTS = require(__dirname + "/constants.js");
	var hashpath = require(APP_CONSTANTS.LIBDIR+"/hashpath.js");

	return APP_CONSTANTS.USERS_DB_PATH + "/" + hashpath.create_valid_hash_path(id) + "/";
}