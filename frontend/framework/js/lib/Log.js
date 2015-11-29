/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$.Log = function() {
	$$.Log._setupiOSLoggingRedirection();
};

$$.Log.prototype.debug = function(s) {
	console.log(s);
};

////////////////////////////////////////////////
// Private functions - Don't call
////////////////////////////////////////////////
$$.Log._setupiOSLoggingRedirection = function() {
	
	is_iPhone = (($$.browser.navigator == "Safari") && ($$.browser.os == "iPhone"));
	if (!is_iPhone) return;
		
	window.console = new Object();
	window.console.log = function(log) {
	    webkit.messageHandlers.monkshulog.postMessage(log);
	};
	window.console.debug = console.log;
	window.console.info = console.log;
	window.console.warn = console.log;
	window.console.error = console.log;
	
	window.onerror = function(error, url, line) {
	    console.log("ERROR: "+error+" URL:"+url+" L:"+line);
	};
};
