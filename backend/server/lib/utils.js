/** 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const http2 = require("http2");
const crypto = require("crypto");
const mkdirAsync = require("util").promisify(fs.mkdir);
const lstatAsync = require("util").promisify(fs.lstat);
const readdirAsync = require("util").promisify(fs.readdir);
const copyFileAsync = require("util").promisify(fs.copyFile);

let lastFileCheckTime = {};

/**
 * Copies file or folder recursively.
 * @param {string} from The path to copy from
 * @param {string} to The path to copy to (will create directories if needed)
 * @param {function} functionToCall The function to call (can be async) for each entry, receives
 *      from, to, relativePath (from the initial fromPath), and stats for the original file copied.
 * @param {boolean} isCalledFunctionAsync Whether the walk function we are calling is async
 */
async function copyFileOrFolder(from, to, functionToCall, isCalledFunctionAsync, rootFrom) {
    if (!rootFrom) rootFrom = path.dirname(from); // entry call, so we are at the root of the tree

    const statsFrom = await lstatAsync(from);
    if (statsFrom.isFile()) {
        if (!rootFrom) rootFrom = path.dirname(from);   // parent is the root directory
        await copyFileAsync(from, to);
    } else {
        if (!rootFrom) rootFrom = from; // this is the root directory
        await mkdirAsync(to); 
        for (const entry of await readdirAsync(from)) await copyFileOrFolder(path.join(from, entry), 
            path.join(to, entry), functionToCall, isCalledFunctionAsync, rootFrom);
    }

    if (functionToCall) {   // call function if provided for every entry
        if (isCalledFunctionAsync) await functionToCall(from, to, path.relative(rootFrom, from), statsFrom);    // if the function is async then await its execution
        else functionToCall(from, to, path.relative(rootFrom, from), statsFrom);
    }
}

/**
 * Walks the given folder, recursively. Calls the function (expected async) for each file. The function
 * completes (promise resolves) when the entire walk is completed. The functionToCall is called with the
 * following params -> (full path to the entry, stats for the entry, relative path to the entry)
 * @param {string} pathIn The path to walk
 * @param {function} functionToCall The function to call (can be async) for each entry
 * @param {boolean} isCalledFunctionAsync Whether the walk function we are calling is async
 * @param {function} functionOnEndOfWalk The function to call on the end of the walk
 */
async function walkFolder(pathIn, functionToCall, isCalledFunctionAsync, functionOnEndOfWalk, root) {
    if (!root) root = pathIn; // entry call, so we are at the root of the tree
    const entries = await fs.promises.readdir(pathIn);
    for (const entry of entries) {
        const pathThisEntry = path.resolve(pathIn+"/"+entry), stats = await lstatAsync(pathThisEntry);
        if (isCalledFunctionAsync) await functionToCall(pathThisEntry, stats, path.relative(root, pathThisEntry));    // if the function is async then await its execution
        else functionToCall(pathThisEntry, stats, path.relative(root, pathThisEntry));
        if (stats.isDirectory()) await walkFolder(pathThisEntry, functionToCall, isCalledFunctionAsync, undefined, root);
    }
    if (functionOnEndOfWalk) functionOnEndOfWalk();
}

/**
 * Deletes a given file or directory.
 * @param {string} path The path to delete
 * @returns true on success, false on failure.
 */
async function rmrf(path) {
    const fspromises = fs.promises;
    try {await fspromises.access(path, fs.constants.W_OK | fs.constants.R_OK);} catch (err) {
        if (err.code == "ENOENT") return true;  // path doesn't exist so it is already deleted anyways!
        else {LOG.error(`Can't access path for rmrf ${path}, error is ${err}.`); return false;} // can't operate on this path.
    }

	if ((await fspromises.stat(path)).isFile()) { try{await fspromises.unlink(path); return true;} catch (err) {
        LOG.error(`Error deleting path ${path}, error is ${err}.`); return false; } }

	const entries = await fspromises.readdir(path);
	for (const entry of entries) {
		const pathThis = `${path}/${entry}`, stats = await fspromises.stat(pathThis);
		if (stats.isFile()) { try {await fspromises.unlink(pathThis);} catch (err) {
            LOG.error(`Error deleting path ${pathThis}, error is ${err}.`); return false;} }
		else if (stats.isDirectory()) if (!await rmrf(pathThis)) LOG.error(`Error deleting path ${path}.`); return false;
	}
	try {await fspromises.rmdir(path); return true;} catch (err) { 
        LOG.error(`Error deleting path ${pathThis}, error is ${err}.`); return false; }
}

/**
 * Parses given value to a boolean
 * @param {string|object} value The value to convert
 * @returns The resulting boolean (true or false)
 */
function parseBoolean(value) {
    if (!value) return false;
    return String(value).toLowerCase() == "true";
}

/**
 * Converts the given URL query string to an object.
 * @param {string} query URL query string 
 * @returns Object result of conversion
 */
function queryToObject(query) {
    let jsObj = {};
    const pairs = query.split("&");
    for (const pair of pairs) {
        let keyVal = pair.split("=");
        if (jsObj[keyVal[0]]) {
            if (jsObj[keyVal[0]].constructor == Array) jsObj[keyVal[0]].push(decodeURIComponent(keyVal[1]));
            else jsObj[keyVal[0]] = [jsObj[keyVal[0]], decodeURIComponent(keyVal[1])];
        } else jsObj[keyVal[0]] = decodeURIComponent(keyVal[1]);
    }

    return jsObj;
}

/**
 * Splits a given string escaping the split character if it is repeated twice. 
 * E.g. splits this string -> a,,b,c as ["a,b","c"]
 * @param {string} string The string to split
 * @param {string} character The split character
 * @returns An array as a result of the split.
 */
function escapedSplit(string, character) {
    const tempSplits = string.split(character), splits = []; 
    for (let i = 0; i < tempSplits.length; i++) {
        if (tempSplits[i] != "") splits.push(tempSplits[i]);
        else if (i==0 && tempSplits[i]=="" && tempSplits[i+1]=="") continue;
        else {
            const prev = splits.pop(); 
            splits.push((prev||"")+character+(tempSplits[i+1]?tempSplits[i+1]:"")); 
            i++;
        }
    }
    return splits;
}

/**
 * Returns a human readable timestamp in year:month:day:hour:min:sec format.
 * @returns A human readable timestamp in year:month:day:hour:min:sec format.
 */
function getDateTime() {

    const date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    const year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return `${year}:${month}:${day}:${hour}:${min}:${sec}`;
}

/**
 * Returns current timestamp accurate to nano seconds, if available.
 * @returns Current timestamp accurate to nano seconds, if available.
 */
function getTimeStamp() {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000000000 + hrTime[1];
}

/**
 * Returns current unix epoch.
 * @returns Current unix epoch timestamp.
 */
const getUnixEpoch = _ => Math.floor(Date.now()/1000);

/**
 * Returns the  object key value, if present, using name insensitive matching. 
 * @param {object} obj The object
 * @param {string} key The key
 * @returns Key value using name insensitive lookup.
 */
function getObjectKeyValueCaseInsensitive(obj, key) {
    for (const keyThis of Object.keys(obj)) if (keyThis.toUpperCase() == key.toUpperCase()) return obj[keyThis];
    return null;
}

/**
 * Returns the  object key, if present, using name insensitive matching. 
 * @param {object} obj The object
 * @param {string} key The key
 * @returns Key name using name insensitive lookup.
 */
function getObjectKeyNameCaseInsensitive(obj, key) {
    for (const keyThis of Object.keys(obj)) if (keyThis.toUpperCase() == key.toUpperCase()) return keyThis;
    return null;
}

/**
 * Returns path to a temp file we can use.
 * @param {string} ext The extension of the file.
 * @returns The path to a temp file we can use.
 */
const getTempFile = (ext, preferredDir, preferredPrefix) =>
    path.resolve(`${(preferredDir||os.tmpdir())+"/"+(preferredPrefix||"")+(Math.random().toString(36)+'00000000000000000').slice(2, 11)}.${getTimeStamp()}${ext?`.${ext}`:""}`);

/**
 * Returns client IP, parsing out proxy headers, from an incoming HTTP req object.
 * @param {object} req Incoming HTTP request object.
 * @returns The client IP
 */
const getClientIP = req => {
    const clientIP = req.headers['x-forwarded-for']?req.headers['x-forwarded-for'].split(",").shift():
        req.headers['x-real-ip']?req.headers['x-real-ip'].split(",").shift():req.socket.remoteAddress;
    return clientIP;
}

/**
 * Returns client port, parsing out proxy headers, from an incoming HTTP req object.
 * @param {object} req Incoming HTTP request object.
 * @returns The client port
 */
const getClientPort = req => req.headers["x-forwarded-port"]?req.headers["x-forwarded-port"].split(",").shift():
    req.headers["x-real-port"]?req.headers["x-real-port"].split(",").shift():req.socket.remotePort;

/**
 * Returns the request's server host
 * @param req The incoming HTTP request 
 * @return The request's server host 
 */
const getServerHost = req => req.httpVersionMajor == 2 ? req.headers[http2.constants.HTTP2_HEADER_AUTHORITY] : req.headers.host;

/**
 * Returns embedded IPv4 inside an IPv6.
 * @param {string} address The IPv6 in short hand notation.
 * @returns The embedded IPv4 inside an IPv6 or null if none found.
 */
function getEmbeddedIPV4(address) { 
    if ((analyzeIPAddr(address)).ipv6 == false) return address; // it is an ipv4 
    const pattern = /\:\:ffff\:([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/;
    const matches = address.match(pattern);
    return matches && matches[1] ? matches[1] : null;
}

/**
 * Expands a shorthand IPv6 with full expanded form IPv6.
 * @param {string} address The IPv6 in short hand notation.
 * @returns The expanded IPv6.
 */
function expandIPv6Address(address) // from: https://gist.github.com/Mottie/7018157
{
    let fullAddress = "", expandedAddress = "", validGroupCount = 8, validGroupSize = 4, ipv4 = "";
    const extractIpv4 = /([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/, validateIpv4 = /((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})/;

    // look for embedded ipv4
    if (validateIpv4.test(address)) {
        const groups = address.match(extractIpv4);
        for(let i=1; i<groups.length; i++) ipv4 += ("00" + (parseInt(groups[i], 10).toString(16)) ).slice(-2) + ( i==2 ? ":" : "" );
        address = address.replace(extractIpv4, ipv4);
    }

    if (address.indexOf("::") == -1) fullAddress = address; // All eight groups are present.
    else {  // Consecutive groups of zeroes have been collapsed with "::".
        const sides = address.split("::"); let groupsPresent = 0;
        for (let i=0; i<sides.length; i++) groupsPresent += sides[i].split(":").length;
        fullAddress += sides[0] + ":";
        for (let i=0; i<validGroupCount-groupsPresent; i++) fullAddress += "0000:";
        fullAddress += sides[1];
    }
    const groups = fullAddress.split(":");
    for (let i=0; i<validGroupCount; i++) {
        while(groups[i].length < validGroupSize) groups[i] = "0" + groups[i];
        expandedAddress += (i!=validGroupCount-1) ? groups[i] + ":" : groups[i];
    }
    return expandedAddress;
}

/**
 * Analyzes the given IP and returns back normalized IP and a flag indicating
 * if it is IPv6 or not.
 * @param {string} ip The IP in IPV4 or IPv6 format.
 * @returns The normalized IP and a flag indicating if it is IPv6 or not.
 */
function analyzeIPAddr(ip) {
    let ipv6 = true; let ipBack = ip;

    if (ip.indexOf(":") != -1 && ip.indexOf(".") != -1 && (ip.indexOf("ffff") != 1)) {  // embedded IPv4
        ipv6 = false;
        ipBack = ip.substring(ip.lastIndexOf("ffff:")+5);
    }

    if (ip.indexOf(":") == -1 && ip.indexOf(".") != -1) ipv6 = false;   // regular IPv4

    return {ip: ipBack, ipv6};  // rest are all regular IPv6
}

/**
 * Watches the given file. 
 * @param {string} path The file path
 * @param {function} opIfModified Function which is passed the file contents if it is modified
 * @param {number} frequency The frequency to check at
 */
function watchFile(path, opIfModified, frequency) {
    const toDoOnInterval = async _ => {
        try { 
            const stats = await fs.promises.stat(path); if (stats?.mtimeMs != lastFileCheckTime[path]) {
                lastFileCheckTime[path] = stats.mtimeMs;
                opIfModified(await fs.promises.readFile(path, "utf8")); 
            } 
        } catch (err) {}// file doesn't exist
    }
    setIntervalImmediately(toDoOnInterval, frequency);
}

/**
 * Deep clones an object, must be serializable or non-serializable properties must
 * be listed to be skipped
 * @param object The object to clone
 * @param skipProperties Optional: Properties to skip while cloning
 */
 function clone(object, skipProperties=[]) {
    if (typeof object !== "object") {LOG.error(`Asked to clone non-object ${object.toString()}, returning same back.`); return object;}
    if (!skipProperties.length) try {return JSON.parse(JSON.stringify(object))} catch (err) {
        LOG.error(`Error cloning object ${object.toString()}, returning shallow clone.`);
        return {...object}
    };

    const clone = {}; for (const key in object) if (!skipProperties.includes(key)) clone[key] = JSON.parse(JSON.stringify(object[key]));
    return clone;
}

/**
 * Calls the given function at the given intervals with the first call starting immediately.
 * @param {function} functionToCall The function to call
 * @param {number} interval The interval in milliseconds
 * @return The timer
 */
const setIntervalImmediately = (functionToCall, interval) => {functionToCall(); return setInterval(functionToCall, interval)};

/**
 * Sets nested object property.
 * @param {object} object The object to set the property on.
 * @param {string} path The path for the property using dots . or indexes []
 * @param {object|native} value The value to set it to
 */
function setObjProperty(object, path, value) {
    let currentPathObj = object; 
    const pathSplits = _getObjectPathSplits(path), pathsToWalk = pathSplits.slice(0, -1), 
      lastElement = pathSplits[pathSplits.length-1];
    for (const pathElement of pathsToWalk) {
      if (currentPathObj[pathElement]) currentPathObj = currentPathObj[pathElement];
      else {currentPathObj[pathElement] = {}; currentPathObj = currentPathObj[pathElement];}
    }
    currentPathObj[lastElement] = value;
} 

/**
 * Returns nested object property.
 * @param {object} object The object to set the property on.
 * @param {string} path The path for the property using dots . or indexes []
 * @return The property requested or null if it doesn't exist
 */
function getObjProperty(object, path) {
    let currentPathObj = object; 
    const pathSplits = _getObjectPathSplits(path), pathsToWalk = pathSplits.slice(0, -1), 
      lastElement = pathSplits[pathSplits.length-1];
    for (const pathElement of pathsToWalk) {
      if (currentPathObj[pathElement]) currentPathObj = currentPathObj[pathElement];
      else return null; // found null in-between
    }
    return currentPathObj[lastElement];
}

/**
 * Will reload the module if debug mode is on. 
 * @param {string} modulePath The path to the module
 * @param {boolean} isDebugOn true if debug is on
 * @returns The module requested, throws standard require exceptions on module load errors.
 */
function requireWithDebug(modulePath, isDebugOn) {
    if (isDebugOn) {
        LOG.debug(`requireWithDebug is forcing a reload of the module ${modulePath}.`);
        delete require.cache[require.resolve(modulePath)];
    }
    return require(modulePath);
}

/**
 * Returns object path splits as an array. Internal only.
 * @param {string} path The object path
 * @returns The object path splits as an array.
 */
function _getObjectPathSplits(path) {
    const dotSplits = path.split("."), final = []; 
    for (const element of dotSplits) for (const indexElement of element.split("[")) if (indexElement.endsWith("]")) {   // handle array type indexes
        const index = indexElement.substring(0, indexElement.length-1);
        final.push(parseInt(index, 10).toString() === index.toString()?parseInt(index, 10):index); 
    } else final.push(indexElement); 
    return final;
}

/**
 * Generates a UUID and returns it.
 * @param {boolean} useDashes Optional: Default is true, seperates the UUID with "-" (more readable).
 * @return The generated UUID as a String.
 * */
function generateUUID(useDashes=true) { // Public Domain/MIT: from https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
    const {performance} = require("perf_hooks");
    let d = new Date().getTime();//Timestamp
    let d2 = ((typeof performance !== "undefined") && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return (useDashes?"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx":"xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx").replace(/[xy]/g, 
            function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0; d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0; d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Creates an async function which executes the given code.
 * To call the function call the created function with the 
 * context. For example, 
 * const asyncFunction = util.createAsyncFunction(code);
 * await asyncFunction({key: value, key2: value2})
 * @param {string} code The code to execute
 * @returns Asynchronous function (or sync) which executes the
 *          given code when called.
 */
function createAsyncFunction(code) {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const newFunction = context => new AsyncFunction(Object.keys(context||{}).join(","), code)(...Object.values(context||{}));
    return newFunction;
}

/**
 * Returns the machine's local IPs, as a string array. IPv4 addresses are listed first.
 * @param {boolean} v4Only If set to true then will only return IPv4 addresses.
 * @returns The machine's local IPs, as a string array. IPv4 addresses are listed first.
 */
function getLocalIPs(v4Only) {
    const networkInterfaces = os.networkInterfaces();
    const ipV4s = [], ipv6s = []; 
    for (const networkInterface of Object.values(networkInterfaces)) for (const ipaddress of networkInterface)
        if ((!ipaddress.internal) && ipaddress.address) ((ipaddress.family==="IPv4") ? ipV4s : ipv6s).push(
            ipaddress.address);
    return v4Only?ipV4s:[...ipV4s, ...ipv6s];
}

/**
 * Waits for the given promise, if it resolves returns the result (or true on success). On
 * failure it returns false.
 * @param {promise} promiseToWait The promise to wait for.
 * @returns If it resolves returns the result (or true on success). On failure it returns false.
 */
const promiseExceptionToBoolean = async promiseToWait => {
    try{const result = await promiseToWait; return result||true;} catch(err) {LOG.error(err); return false;} }


/**
 * Creates the given path recursively if it doesn't exist.
 * @param {string} inpath The path to create
 * @returns true on success (including on if the path already existed), false on errors.
 */
async function createDirectory(inpath) {
    const fullpath = path.resolve(inpath);
	const dirExists = await (async pathIn => await fs.promises.access(pathIn).then(()=>true).catch(()=>false))(fullpath);
	if (dirExists) {console.warn("Told to create a folder which already exists, ignorning: "+fullpath); return true;}
	try {await fs.promises.mkdir(fullpath, {recursive: true})} catch (err) {
        LOG.error(`Error creating directory ${inpath}: ${err}`); return false; }
	return true;
}

/**
 * Literally nodejs exists replacement, as a useful function has been deprecated!
 * @param {string} fullpath The path to check
 * @returns true if it exists, else false
 */
const exists = async fullpath => await (async pathIn => await fs.promises.access(pathIn).then(()=>true).catch(()=>false))(fullpath);

/**
 * Converts a path to UNIX style.
 * @param {string} pathIn The incoming path to convert
 * @param {boolean} normalize If true, empty paths are dropped
 * @returns The same path in UNIX style.
 */
const convertToUnixPathEndings = (pathIn, normalize) => {
    const parts = []; for (const part of pathIn.split(path.sep)) if (!normalize) parts.push(part); else if (part.trim() != "") parts.push(part);
    return parts.join(path.posix.sep);
}

/**
 * Returns true if the given argument is a Javascript object.
 * @param {*} obj Argument to test
 * @returns true if the given argument is a Javascript object, false otherwise.
 */
function isObject(obj) {
    const isNotNative = obj === Object(obj);
    const isNotFunction = typeof obj !== "function";
    const isNotArray = !Array.isArray(obj);
    return isNotArray && isNotFunction && isNotNative;
}

/**
 * Returns a hash for the object. Same object properties should hash the 
 * same.
 * @param {Object} obj The object to hash.
 * @returns The MD5 hash.
 */
function hashObject(obj) { 
    if (!obj) return undefined;
    const combinedString = typeof obj !== "object" ? obj.toString() : 
        Object.entries(obj).reduce((accumulator, [key, value]) => accumulator += `${key}:${value.toString()}`, "");
    return crypto.createHash("md5").update(combinedString).digest("hex");
}

/**
 * Converts unicode string to Base64.
 * @param {string} text The unicode string to convert to Base64.
 * @returns Base64 of the string
 */
function stringToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}

/**
 * Converts base64 back to unicode string.
 * @param {string} base64 Base 64 text
 * @returns The original string in unicode.
 */
function base64ToString(base64) {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    return new TextDecoder().decode(bytes);
}

/**
 * Returns memory size in bytes of the object.
 * @param {object} object Object whose memory size if needed
 * @returns The memory size in bytes of the object.
 */
function objectMemSize(object) {
    if (!object) return 0;
    if (typeof object === "number") return 8;
    if (typeof object === "string") return 2*object.length;
    if (typeof object === "boolean") return 4;
    if (typeof object === "object") {
        let size = 0; for (const value of Object.values(object)) size += objectMemSize(value);
        return size;
    }
    return object.toString().length*2;
}

module.exports = { parseBoolean, getDateTime, queryToObject, escapedSplit, getTimeStamp, getUnixEpoch, 
    getObjectKeyValueCaseInsensitive, getObjectKeyNameCaseInsensitive, getTempFile, copyFileOrFolder, getClientIP, 
    getServerHost, getClientPort, getEmbeddedIPV4, setIntervalImmediately, expandIPv6Address, analyzeIPAddr, 
    watchFile, clone, walkFolder, rmrf, getObjProperty, setObjProperty, requireWithDebug, generateUUID, 
    createAsyncFunction, getLocalIPs, promiseExceptionToBoolean, createDirectory, exists, convertToUnixPathEndings,
    isObject, hashObject, stringToBase64, base64ToString, objectMemSize };
