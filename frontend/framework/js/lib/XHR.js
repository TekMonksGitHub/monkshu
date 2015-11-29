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

$$.get_sync = function(url, callback) {
	var xhr = new $$._XHR("GET", url);
	return xhr.sendSync();
};

$$.post_sync = function(url, params, callback) {
	var xhr = new $$._XHR("POST", url, params);
	return xhr.sendSync();
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

$$._XHR.prototype.sendSync = function() {
	var xhr = new XMLHttpRequest();
    xhr.open(this.method, this.url, false);
    if (this.method.toUpperCase() == "POST" )
    	xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.followRedirects = true;
    
    if (this.method.toUpperCase() == "POST" )
    	xhr.send(this.params);	
	else
    	xhr.send();
    	
    if (xhr.status === 200) {
    	this.resp = xhr.responseText;
    	return xhr.responseText;
    }
    else {
    	this.resp = undefined;
    	this.isError = true;
    	return undefined;
    }
};
