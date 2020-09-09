/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
const fs = require("fs");
const utils = require(conf.libdir+"/utils.js");

Logger = function(path, maxsize) {
	this.path = path;
	this.maxsize = maxsize;
};

Logger.prototype.info = function(s, sync) {Logger.writeFile("info", this.path, s, sync);};

Logger.prototype.debug = function(s, sync) {Logger.writeFile("debug", this.path, s, sync);};

Logger.prototype.error = function(s, sync) {Logger.writeFile("error", this.path, s, sync);};

Logger.prototype.truncate = function(s) {return s.length > 1024 ? s.substring(0, 1024) : s;}

Logger.prototype.overrideConsole = function() {
	global.console.log = function() {log.info(
		"[console] " + require("util").format.apply(null, arguments)); 
	};
};

Logger.prototype.getLogContents = function(callback) {
	fs.readFile(this.path, function(err, data){
		if (err) callback("Unable to read the log",null);
		else callback(null, data);
	});
};

Logger.writeFile = function(level, path, s, sync) {
	const msg = '{"ts":"'+utils.getDateTime()+'","level":"'+level+'","message":'+JSON.stringify(s)+'}\n';
	
	if (sync === undefined) {
		fs.appendFile(path, msg, function(err) {
			if (err) { 
				console.log("Logger error!");
				console.log(msg);
			}
		});
	} else {
		try {fs.appendFileSync(path, msg);}
		catch (err){
			console.log("Logger error!");
			console.log(msg);
		};
	}
};

exports.Logger = Logger;
