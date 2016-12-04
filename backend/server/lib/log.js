/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require("fs");
var utils = require(CONSTANTS.LIBDIR+"/utils.js");

function initGlobalLogger() {
	/* create the logger */
	if (!fs.existsSync(CONSTANTS.LOGSDIR)) {fs.mkdirSync(CONSTANTS.LOGSDIR);}
	
	global.log = new Logger(CONSTANTS.ACCESSLOG, 100*1024*1024);	// 100 MB log max
	
	log.info("*************************************");
	log.info("*************************************");
	log.info("Logging subsystem initialized.");
}

exports.initGlobalLogger = initGlobalLogger;

Logger = function(path, maxsize) {
	this.path = path;
	this.maxsize = maxsize;
};

Logger.prototype.info = function(s, sync) {Logger.writeFile("info", this.path, s, sync);};

Logger.prototype.debug = function(s, sync) {Logger.writeFile("debug", this.path, s, sync);};

Logger.prototype.error = function(s, sync) {Logger.writeFile("error", this.path, s, sync);};

Logger.prototype.truncate = function(s) {return s.length > CONSTANTS.MAX_LOG ? s.substring(0, CONSTANTS.MAX_LOG) : s;}

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
	var msg = '{"ts":"'+utils.getDateTime()+'","level":"'+level+'","message":'+JSON.stringify(s)+'}\n';
	
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

