/**
 * Logger. 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const fs = require("fs");
const path = require("path");
const ffs = require(`${CONSTANTS.LIBDIR}/FastFileWriter.js`);

const log_conf = {"debug": false, "max_log_line": 1024, "max_log_mb": 100, "closeTimeOut": 30000, "sync_log": true};
const logQueue = []; let pendingWrites = false;	// queueing mechanism for synchronous logging, eats memory potentially

function initGlobalLoggerSync(logPath) {
	/* create the logger */
	if (!fs.existsSync(path.dirname(logPath))) {fs.mkdirSync(path.dirname(logPath));}
	const filewriter = ffs.createFileWriter(logPath, log_conf.closeTimeOut, "utf8");
	
	global.LOG = new Logger(logPath, log_conf.max_log_mb*1024*1024, filewriter);	// 100 MB log max
	
	LOG.info("*************************************", true);
	LOG.info("*************************************", true);
	LOG.info("Logging subsystem initialized.", true);
}

exports.initGlobalLoggerSync = initGlobalLoggerSync;

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

Logger.prototype.error = function(s, sync) {this.writeFile("error", s && s.stack ? s.stack:s, sync);}

Logger.prototype.truncate = function(s) {return s && s.length > log_conf.max_log_line ? s.substring(0, log_conf.max_log_line) : s}

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
	const msg = JSON.stringify({ts: _getDateTime(), level, message: s})+"\n";
	
	if (sync === undefined) {
		const queuedWrite = msg => {
			pendingWrites = true;
			this.filewriter.writeFile(msg, err => {
				pendingWrites = false;
				if (err) { 
					this._origLog("Logger error!");
					this._origLog(msg);
					this._oldStderrWrite.call(process.stderr, "Logger error!\n");
					this._oldStderrWrite.call(process.stderr, msg);
				} else if (logQueue.length) queuedWrite(logQueue.shift());
			});
		}

		if (log_conf.sync_log) {
			logQueue.push(msg); if (logQueue.length == 1 && !pendingWrites) queuedWrite(logQueue.shift());
		} else queuedWrite(msg);
	} else {
		try {fs.appendFileSync(this.path, msg);}
		catch (err){
			this._origLog("Logger error!");
			this._origLog(msg);
			this._oldStderrWrite.call(process.stderr, "Logger error!\n");
			this._oldStderrWrite.call(process.stderr, msg);
		};
	}
}

Logger.prototype.flush = function(callback) {
	const timer = setInterval(_=>{if (!logQueue.length) {clearInterval(timer); callback();}}, 100);
}

function _getDateTime() {
    const date = new Date();

    let hour = date.getHours(); hour = (hour < 10 ? "0" : "") + hour;
    let min = date.getMinutes(); min = (min < 10 ? "0" : "") + min;
    let sec = date.getSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    const year = date.getFullYear();
    let month = date.getMonth() + 1; month = (month < 10 ? "0" : "") + month;
    let day = date.getDate(); day = (day < 10 ? "0" : "") + day;

    return `${year}:${month}:${day}:${hour}:${min}:${sec}`;
}