/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$._signin = function() {
	$$._registerClickHandlers();
	$$.session().put("org_monkshu_login_signInOrRegisterClicked", true);
	
	var id = document.getElementById("userid").value;
	var pass = document.getElementById("pass").value;
		
	$$.loginmanager.signin(id, pass, $$._handleLoginResult);
};

$$._register = function() {
	$$._registerClickHandlers();
	$$.session().put("org_monkshu_login_signInOrRegisterClicked", true);
	
	var regpass = document.getElementById("regpass").value;
	if (regpass.length < $$.N_MIN_PASS_LENGTH) {
		var resp = {}; resp["result"] = false;
		$$._handleRegistrationResult(resp,true);
		return;
	}
	
	var regid = document.getElementById("regid").value;
		
	$$.loginmanager.register(regid, regpass, $$._handleRegistrationResult);
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
		var divError = document.getElementById("divsigninerror");
		divError.style.visibility = "visible";

		var inputBox = document.getElementById("userid");
		inputBox.className = "errorbox";
		inputBox = document.getElementById("pass");
		inputBox.className = "errorbox";
	}
};

$$._handleRegistrationResult = function (resp, passtooshort) {
	if (resp.result) {
		$$._deregisterClickHandlers();
		Application.main();
	} else {
		if (passtooshort) {
			var divError = document.getElementById("registererror_pass");
			divError.style.visibility = "visible";
	
			var inputBox = document.getElementById("regpass");
			inputBox.className = "errorbox";
		} else {
			var divError = document.getElementById("registererror_id");
			divError.style.visibility = "visible";
	
			var inputBox = document.getElementById("regid");
			inputBox.className = "errorbox";
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
