/* 
 * (C) 2015 TekMonks. All rights reserved.
 */

const fs = require("fs");

let lastFileCheckTime = {};

function copyFile(source, target, cb) {
    let cbCalled = false;

    const done = err => { if (!cbCalled) cb(err); cbCalled = true; }

    const rd = fs.createReadStream(source);
    rd.on("error", err => done(err));
    const wr = fs.createWriteStream(target);
    wr.on("error", err => done(err));
    wr.on("close", _ => done());
    rd.pipe(wr);
}

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

const getClientIP = req =>
    (typeof req.headers['x-forwarded-for'] === 'string'
        && req.headers['x-forwarded-for'].split(',').shift())
    || req.socket.remoteAddress;

const getClientPort = req =>
    (typeof req.headers['x-forwarded-port'] === 'string'
        && req.headers['x-forwarded-port'].split(',').shift())
    || req.socket.remotePort;

function getEmbeddedIPV4(address) { 
    const pattern = /\:\:ffff\:([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/;
    const matches = address.match(pattern);
    return matches && matches[1] ? matches[1] : null;
}

const union = function() {  // merges two arrays
    if (arguments.length == 0) return [];    // no union possible
    
    const result = [...arguments[0]];
    for (const array of [...arguments].slice(1)) for (const element of array) if (!result.includes(element)) result.push(element);

    return result;
}

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

const setIntervalImmediately = (functionToCall, interval) => {functionToCall(); setInterval(functionToCall, interval)};

function etagsMatch(etagHeader, etag) {
    if (!etagHeader) return false;
    const etagsAllowed = etagHeader.split(",").map(value => value.trim());
    return (etagsAllowed.includes(etag) || etagsAllowed.includes(`W/${etag}`));
}

module.exports = { copyFile, getDateTime, getClientIP, getClientPort, getEmbeddedIPV4, union, setIntervalImmediately,
    expandIPv6Address, watchFile, etagsMatch };
