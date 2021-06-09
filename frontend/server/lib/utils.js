/* 
 * (C) 2015 TekMonks. All rights reserved.
 */

const fs = require("fs");

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

const union = function() {  // merges two arrays
    if (arguments.length == 0) return [];    // no union possible
    
    const result = [...arguments[0]];
    for (const array of [...arguments].slice(1)) for (const element of array) if (!result.includes(element)) result.push(element);

    return result;
}
    
module.exports = { copyFile, getDateTime, getClientIP, getClientPort, union };
