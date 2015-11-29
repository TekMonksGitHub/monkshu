/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

var bcrypt                  = require('bcrypt');
var SALT_PW                 = require(__dirname+'/constants.js').SALT_PW;

module.exports = {
create_valid_hash_path : function(data) {

	var path_hash = bcrypt.hashSync(data, SALT_PW);

	// URL encoding removes characters which are illegal for paths, like "\" or "/" etc.
	var encoded_hash = encodeURIComponent(path_hash);

	// On Windows directory names can't end with the . character. So replace it with %2E
	// which is its URL encoded notation, if that's the case.
	if (encoded_hash.substr(-1) == '.')
		encoded_hash = encoded_hash.substring(0, encoded_hash.length - 1) + '%2E';
	
	return encoded_hash;

}
};