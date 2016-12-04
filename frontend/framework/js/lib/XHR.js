/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// Constructors and public functions
//////////////////////////////////////////////// 
  
$$._XHR = function( method, url, params ) {
	this.method = method;
	this.url = url;
	this.params = params;
	this.resp = "";
	this.isError = false;
};
 
$$.get = function(url, callback) {
	var xhr = new $$._XHR("GET", url);
	xhr.send(function() {$$._XHR.callback(xhr,callback);});
};

$$.post = function(url, params, callback) {
	var xhr = new $$._XHR("POST", url, params);
	xhr.send(function() {$$._XHR.callback(xhr,callback);});
};

////////////////////////////////////////////////
// Private functions
////////////////////////////////////////////////  
$$._XHR.callback = function(xhr, callback) {
	if (xhr.isError) callback(); else callback(xhr.resp);
};

$$._XHR.prototype.send = function(callback) {
	var xhr = new XMLHttpRequest();
    xhr.open(this.method, this.url, true);
    if (this.method.toUpperCase() == "POST" )
    	xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    that = this;
    xhr.onload = function() {that.resp = xhr.responseText; callback();};
    xhr.onerror = function() {that.isError = true; that.resp = null; callback();};
    xhr.followRedirects = true;
    if (this.method.toUpperCase() == "POST" )
    	xhr.send(this.params);	
	else
    	xhr.send();
};
