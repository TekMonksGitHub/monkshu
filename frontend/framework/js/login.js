/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

init();

function init() {
	if (!$$.S_SUPPORTS_REGISTRATION) {
		$$.elID("regbox").style.visibility = "hidden";
	}
}

$$._signin = function() {
	$$._registerClickHandlers();
	$$.session().put("org_monkshu_login_signInOrRegisterClicked", true);
	
	var id = $$.elID("userid").value;
	var pass = $$.elID("pass").value;
		
	$$.loginmanager.signin(id, pass, $$._handleLoginResult);
};

$$._register = function() {
	$$._registerClickHandlers();
	$$.session().put("org_monkshu_login_signInOrRegisterClicked", true);
	
	var regpass = $$.elID("regpass").value;
	if (regpass.length < $$.N_MIN_PASS_LENGTH) {
		var resp = {}; resp["result"] = false;
		$$._handleRegistrationResult(resp,true);
		return;
	}
		
	$$.loginmanager.register($$.elID("regid").value, regpass, $$._handleRegistrationResult);
};

$$._signinIfEnterPressed = function (e) {
	if (e.keyCode === 13) $$._signin();
};

$$._registerIfEnterPressed = function (e) {
	if (e.keyCode === 13) $$._register();
};

$$._handleLoginResult = function (resp) {
	if (resp.result) {
		$$._deregisterClickHandlers();
		Application.main();
	} else {
		$$.elID("divsigninerror").style.visibility = "visible";

		$$.elID("userid").className = "errorbox";
		$$.elID("pass").className = "errorbox";
	}
};

$$._handleRegistrationResult = function (resp, passtooshort) {
	if (resp.result) {
		$$._deregisterClickHandlers();
		Application.main();
	} else {
		if (passtooshort) {
			$$.elID("registererror_pass").style.visibility = "visible";
	
			$$.elID("regpass").className = "errorbox";
		} else {
			$$.elID("registererror_id").style.visibility = "visible";
	
			$$.elID("regid").className = "errorbox";
		}		
	}
};

$$._hide_error = function () {
	var elem = document.querySelectorAll('.errorbox');
	if (elem !== undefined) {
		for (var i = 0; i < elem.length; i++) elem[i].className = "inputbox";
	} 

	elem = document.querySelectorAll("[style*='visibility: visible;']");
	if (elem !== undefined) {
		for (var i = 0; i < elem.length; i++) elem[i].style.visibility = 'hidden';
	}
};

$$._clickHandler = function() {
	if (!$$.session().get("org_monkshu_login_signInOrRegisterClicked")) $$._hide_error();
	else $$.session().put("org_monkshu_login_signInOrRegisterClicked", false);
};

$$._registerClickHandlers = function() {
	document.addEventListener("click", $$._clickHandler);
	document.addEventListener("keydown", $$._clickHandler);
};

$$._deregisterClickHandlers = function() {
	document.removeEventListener("click", $$._clickHandler);
	document.removeEventListener("keydown", $$._clickHandler);
};
