/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// Extend the HTML5 Storage Class
////////////////////////////////////////////////    

Storage.prototype.setObject = function(key, value) {
	jsonRep = JSON.stringify(value);
    this.setItem(key, jsonRep);
};

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

////////////////////////////////////////////////
// Constructors and public functions 
////////////////////////////////////////////////   
$$._WebSession = function(sessionObject) {
	if (sessionObject !== undefined) 
		this.session = sessionObject;
	else
		this.session = {};
};
 
$$.session = function() {
	if (typeof session !== "undefined") return session;		// session exists in Javascript client
	
	if (sessionStorage.getObject("lcSession") !== null) {	// refresh pressed
		var sessionObject = sessionStorage.getObject("lcSession");
		session = new $$._WebSession(sessionObject);
		return session;
	}

	session = new $$._WebSession();								// we need new session
	sessionStorage.setObject("lcSession", session.getInternalStorage());
	return session;
};

$$._WebSession.prototype.put = function(name, value) {
	this.session[name] = value;
	sessionStorage.setObject("lcSession", this.getInternalStorage());
};

$$._WebSession.prototype.remove = function(name) {
	if (this.session.hasOwnProperty(name)) {
		delete this.session[name];
		sessionStorage.setObject("lcSession", this.getInternalStorage());
	}
};

$$._WebSession.prototype.get = function(name) {
	return this.session[name];
};

$$._WebSession.prototype.length = function() {
	return this.session.length;
};

////////////////////////////////////////////////
// Private functions 
////////////////////////////////////////////////  
$$._WebSession.prototype.getInternalStorage = function() {
	return this.session;
};
