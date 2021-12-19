/** 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const mkdirAsync = require("util").promisify(fs.mkdir);
const lstatAsync = require("util").promisify(fs.lstat);
const readdirAsync = require("util").promisify(fs.readdir);
const copyFileAsync = require("util").promisify(fs.copyFile);

let lastFileCheckTime = {};

/**
 * Copies file or folder recursively.
 * @param {string} from The path to copy from
 * @param {string} to The path to copy to (will create directories if needed)
 */
async function copyFileOrFolder(from, to) {
    if ((await lstatAsync(from)).isFile()) await copyFileAsync(from, to);
    else {
        await mkdirAsync(to);
        for (const element of await readdirAsync(from)) await copyFileOrFolder(path.join(from, element), path.join(to, element));
    }
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
const getTempFile = ext =>
    `${os.tmpdir()+"/"+(Math.random().toString(36)+'00000000000000000').slice(2, 11)}.${getTimeStamp()}${ext?`.${ext}`:""}`;

/**
 * Returns client IP, parsing out proxy headers, from an incoming HTTP req object.
 * @param {object} req Incoming HTTP request object.
 * @returns The client IP
 */
const getClientIP = req =>
    (typeof req.headers['x-forwarded-for'] === 'string'
        && req.headers['x-forwarded-for'].split(',').shift())
    || req.socket.remoteAddress;

/**
 * Returns embedded IPv4 inside an IPv6.
 * @param {string} address The IPv6 in short hand notation.
 * @returns The embedded IPv4 inside an IPv6 or null if none found.
 */
function getEmbeddedIPV4(address) { 
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
    if (!skipProperties.length) return JSON.parse(JSON.stringify(object));

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

module.exports = { parseBoolean, getDateTime, queryToObject, escapedSplit, getTimeStamp, getObjectKeyValueCaseInsensitive, 
    getObjectKeyNameCaseInsensitive, getTempFile, copyFileOrFolder, getClientIP, getEmbeddedIPV4, 
    setIntervalImmediately, expandIPv6Address, analyzeIPAddr, watchFile, clone };
