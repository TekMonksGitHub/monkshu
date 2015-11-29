/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$.doIndexNavigation = function () {
	if ($$.session().get($$.S_USERID))
		// Did user just press refresh? Then just reload the application
		$$.refresh();
	else
		// No session exists? Then show the login page
		$$.loadthtml($$.S_LOGIN_THTML);
};

$$.doErrorNavigation = function () {
	$$.loadthtml($$.S_ERROR_THTML);
};