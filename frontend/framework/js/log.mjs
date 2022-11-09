/**
 * Logger, includes remote logging capabilities.
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

let debugFlag = true, remoteFlag = false, remoteAPI;

const debug = s => {if (debugFlag) console.debug(_getLogLine("DEBUG", s)); if (remoteFlag) _logremote("debug", s);}
const info = s => {console.log(_getLogLine("INFO", s)); if (remoteFlag) _logremote("info", s);}
const error = s => {console.error(_getLogLine("ERROR", s)); if (remoteFlag) _logremote("error", s);}
const warn = s => {console.warn(_getLogLine("WARNING", s)); if (remoteFlag) _logremote("warn", s);}
const setDebug = flag => debugFlag = flag;
const setRemote = (flag, api) => { remoteFlag = flag; if (flag) remoteAPI = api; }

const _logremote = (level, message) => { try {apiman.rest(remoteAPI, "POST", {level, message}); } catch (err) { console.log("Remote log error"+err);} }
const _getLogLine = (level, message) => {const now = new Date(); return `[${level}] [${now.toLocaleString()}] ${message}`;}

export const log = {debug, info, error, warn, setDebug, setRemote};
export const LOG = log; // for backwards compatibility