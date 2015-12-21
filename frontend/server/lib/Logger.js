/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
var fs = require("fs");

Logger = function(path, maxsize) {
	this.path = path;
	this.maxsize = maxsize;
};

Logger.prototype.info = function(s) {Logger.writeFile("info", this.path, s);};

Logger.prototype.debug = function(s) {Logger.writeFile("debug", this.path, s);};

Logger.prototype.error = function(s) {Logger.writeFile("error", this.path, s);};

Logger.writeFile = function(level, path, s) {
	var msg = '{"level":"'+level+'","message":'+JSON.stringify(s)+'}\n';
	fs.appendFile(path, msg, function(err) {
		if (err) { 
			console.log("Logger error!");
			console.log(msg);
		}
	});
};

exports.Logger = Logger;