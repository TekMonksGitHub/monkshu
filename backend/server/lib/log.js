/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const fs = require("fs");
const path = require("path");
const log_conf = require(CONSTANTS.LOGSCONF);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const ffs = require(`${CONSTANTS.LIBDIR}/FastFileWriter.js`);
const loggers = {};

function initGlobalLoggerSync(logName) {
	/* create the logger */
	if (!fs.existsSync(CONSTANTS.LOGDIR)) {fs.mkdirSync(CONSTANTS.LOGDIR);}
	const filewriter = ffs.createFileWriter(logName,log_conf.fileCloseTimeOut,"utf8");
	
	global.LOG = new Logger(logName, log_conf.max_log_mb*1024*1024, filewriter);	// 100 MB log max
	
	LOG.info("*************************************", true);
	LOG.info("*************************************", true);
	LOG.info("Logging subsystem initialized.", true);
}

function doService(jsonReq, servObject, _headers, _url, apiconf) {
	if ((!jsonReq.level) || (!jsonReq.message)) {LOG.error(`Bad incoming remote log request ${JSON.stringify(jsonReq)}`); return;}
	
	let logger; if (!apiconf.logpath) { LOG.error("Bad remote log config, need logpath, redirecting logs to main server log."); logger = LOG; } 
	else {
		const logpath = path.resolve(apiconf.logpath);
		if (!loggers[logpath]) loggers[logpath] = new Logger(logpath, log_conf.max_log_mb*1024*1024, 
			ffs.createFileWriter(logpath, log_conf.fileCloseTimeOut, "utf8"));
		logger = loggers[logpath];
	}
	
	try { 
		logger[jsonReq.level](`[${utils.analyzeIPAddr(utils.getClientIP(servObject.req)).ip}] ${jsonReq.message}`); 
		return CONSTANTS.TRUE_RESULT;
	} catch (err) { 
		LOG.error(`Error in remote logging, incoming request is ${JSON.stringify(jsonReq)}, message is: ${jsonReq.message}, error is ${err}.`);
		return CONSTANTS.FALSE_RESULT;
	}
}

module.exports = {initGlobalLoggerSync, doService};

Logger = function(path, maxsize, filewriter) {
	this.path = path;
	this.maxsize = maxsize;
	this.filewriter = filewriter;
	this._origLog = global.console.log;
	this._oldStdoutWrite = process.stdout.write;
	this._oldStderrWrite = process.stderr.write;
}

Logger.prototype.info = function(s, sync) {this.writeFile("info", s, sync);}

Logger.prototype.debug = function(s, sync) {if (log_conf.debug) this.writeFile("debug", s, sync);}

Logger.prototype.warn = function(s, sync) {this.writeFile("warning", s && s.stack ? s.stack:s, sync);}

Logger.prototype.error = function(s, sync) {this.writeFile("error", s && s.stack ? s.stack:s, sync);}

Logger.prototype.truncate = function(s) {return s && s.length > CONSTANTS.MAX_LOG ? s.substring(0, CONSTANTS.MAX_LOG) : s}

Logger.prototype.console = function(s) {
	s = typeof s == "string" ? s : JSON.stringify(s);
	this._origLog(s?s.trim():s);					// send to console or debug console, trimmed
	this._oldStdoutWrite.call(process.stdout, s);	// send to process' STDOUT
}

Logger.prototype.overrideConsole = function() {
	const parentLogObject = this;
	global.console.log = function() {
		parentLogObject.info(`[console] ${arguments[0]}`); 
	};
	global.console.error = function() {
		parentLogObject.error(`[stderr] ${arguments[0]}`); 
	};
	process.stdout.write = function() {
		parentLogObject.info(`[stdout] ${arguments[0]}`);
	}
	process.stderr.write = function() {
		parentLogObject.error(`[stderr] ${arguments[0]}`);
	}
	process.on("uncaughtException", function(err) {
		parentLogObject.error(err && err.stack ? err.stack : err, true);
		parentLogObject.error("EXIT ON CRITICAL ERROR!!!", true);
		parentLogObject._oldStderrWrite.call(process.stderr, "EXIT ON CRITICAL ERROR!!! Check Logs.\n");
		process.exit(1);
	});
}

Logger.prototype.getLogContents = function(callback) {
	fs.readFile(this.path, "utf8", function(err, data){
		if (err) callback("Unable to read the log",null);
		else {const entries = []; for (const entry of data.trim().split("\n")) entries.push(JSON.parse(entry)); callback(null, entries);}
	});
}

Logger.prototype.writeFile = function(level, s, sync) {
	const msg = JSON.stringify({ts: utils.getDateTime(), level, message: s})+"\n";
	const _errorHandler = err => {
		this._origLog("Logger error!\n"+err);
		this._origLog(msg);
		this._oldStderrWrite.call(process.stderr, "Logger error!\n"+err+"\n");
		this._oldStderrWrite.call(process.stderr, msg);
	}
	
	if (sync === undefined) {
		if (log_conf.sync_log) this.filewriter.queuedWrite(msg, err => {if (err) _errorHandler(err)});
		else this.filewriter.writeFile(msg, err => {if (err) _errorHandler(err)});
	} else {
		try {fs.appendFileSync(this.path, msg);}
		catch (err) {_errorHandler(err)};
	}
}

Logger.prototype.flush = function(callback) {
	const timer = setInterval(_=>{if (!this.filewriter.areTherePendingWrites()) {clearInterval(timer); callback();}}, 100);
}