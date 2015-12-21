/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

/////////////////////////////////////////////////////
// Handles login, registration and session creation
/////////////////////////////////////////////////////
$$.loginmanager = function() {};

$$.loginmanager.signin = function(id, pass, callback) {
	
	var pwph = id + " " + pass;
		
	var bcrypt = dcodeIO.bcrypt;
		
	bcrypt.hash(pwph, $$.S_BCRYPT_SALT, function(err, hash) {
		if (!err) {
			var req = {}; req[$$.S_USERID] = hash;
			$$.rest($$.S_LOGIN, req, function(resp){
				if (resp.result) $$.session().put($$.S_USERID, hash);
				callback(resp);
			});
		} else {
			$$.log.debug("Can't login bcrypt failed.");
			$$.toast($$.S_I18N_VAR.i18n.Error, "corbert", 2000);
		}
	});
};

$$.loginmanager.register = function (regid, pass, callback) {
	
	var pwph = regid + " " + pass;
	
	var bcrypt = dcodeIO.bcrypt;

	bcrypt.hash(pwph, $$.S_BCRYPT_SALT, function(err, hash) {
		if (!err) {
			var req = {}; req[$$.S_USERID] = hash; req["user"] = regid;
			$$.rest($$.S_REGISTER, req, function(resp){
				if (resp.result) $$.session().put($$.S_USERID, hash);
				callback(resp);
			});
		} else {
			$$.log.debug("Can't register bcrypt failed.");
			$$.toast($$.S_I18N_VAR.i18n.Error, "corbert", 2000);
		}
	});
};

$$.loginmanager.signout = function() {
	$$.session().destroy();
	
	$$.doIndexNavigation();
};
