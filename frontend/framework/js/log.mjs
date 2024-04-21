/**
 * Logger, includes remote logging capabilities.
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const __filename = new URL(import.meta.url).pathname.split("/").pop();
let debugFlag = true, remoteFlag = false, remoteAPI, lastRemotelogErrorTime;

const debug = s => {if (debugFlag) console.debug(_getLogLine("DEBUG", s)); if (remoteFlag) _logremote("debug", s);}
const info = s => {console.log(_getLogLine("INFO", s)); if (remoteFlag) _logremote("info", s);}
const error = s => {console.error(_getLogLine("ERROR", s)); if (remoteFlag) _logremote("error", s);}
const warn = s => {console.warn(_getLogLine("WARNING", s)); if (remoteFlag) _logremote("warn", s);}
const setDebug = flag => debugFlag = flag;
const setRemote = (flag, api) => { remoteFlag = flag; if (flag) remoteAPI = api; }

const _logremote = (level, message) => { 
    try { 
        if ((!lastRemotelogErrorTime) || (Date.now() - lastRemotelogErrorTime > 
                $$.MONKSHU_CONSTANTS.REMOTE_LOG_ERROR_RETRY_TIMEOUT)) { 
            apiman.rest(remoteAPI, "POST", {level, message}); lastRemotelogErrorTime = null; 
        } else console.log("Remote log had a recent error. Waiting before retrying, skipping remote logging.");
    } catch (err) { console.log("Remote log error"+err); lastRemotelogErrorTime = Date.now(); } 
}
const _getLogLine = (level, message) => {
    const now = new Date(), caller = _getCaller(), fileInfo = `${caller.filename}:${caller.line}:${caller.column}`
    return `[${level}] [${now.toLocaleString()}] [${fileInfo}] ${message}`;
}

function _getCaller() {
	const e = new Error(); let callingFileLine;
	for (const stackLine of e.stack.toString().split("\n").slice(1)) 
		if (stackLine.indexOf(__filename) == -1) {callingFileLine = stackLine; break;}
	if (!callingFileLine) callingFileLine = e.stack.toString().split("\n")[2];
	const regex = /^.+\s[(]?(.*):(\d+):(\d+)[)]?$/;
	const match = regex.exec(callingFileLine);
	if (match) return {filename: match[1], line: match[2], column: match[3]}; 
	else return {filename: "unknown", line: -1, column: -1}
}

export const log = {debug, info, error, warn, setDebug, setRemote};
export const LOG = log; // for backwards compatibility