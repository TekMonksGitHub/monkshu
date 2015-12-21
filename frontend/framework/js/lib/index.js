/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$.doIndexNavigation = function () {
	if ($$.session().get($$.appActiveBefore)) {
		// Did user just press refresh? Then just reload the application
		$$.refresh();
	}
	else {
		$$.session().put($$.appActiveBefore, true);
		$$.__doLoginOrRunMain();			// Either login or run the app
	}
};

$$.doErrorNavigation = function () {
	$$.loadthtml($$.S_ERROR_THTML);
};

$$.loginRequired = function(flag) {
	if (flag != null ) $$.S_NEEDS_LOGIN = flag;
	return $$.S_NEEDS_LOGIN;
};

$$.__doLoginOrRunMain = function() {
	if ($$.S_NEEDS_LOGIN) $$.loadthtml($$.S_LOGIN_THTML);
	else Application.main();
};