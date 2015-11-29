/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
$$.rest = function(url, obj, callback) {
	$$.post(url, JSON.stringify(obj), function(json) {
		if (json !== undefined) callback(JSON.parse(json));
		else callback();
	});
};