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

async function copyFileOrFolder(from, to) {
    if ((await lstatAsync(from)).isFile()) await copyFileAsync(from, to);
    else {
        await mkdirAsync(to);
        for (const element of await readdirAsync(from)) await copyFileOrFolder(path.join(from, element), path.join(to, element));
    }
}

function parseBoolean(value) {
    if (!value) return false;
    return String(value).toLowerCase() == "true";
}

function queryToObject(query) {
    let jsObj = {};
    const pairs = query.split("&");
    pairs.forEach((pair) => {
        let keyVal = pair.split("=");
        if (jsObj[keyVal[0]]) {
            if (jsObj[keyVal[0]].constructor == Array) jsObj[keyVal[0]].push(decodeURIComponent(keyVal[1]));
            else jsObj[keyVal[0]] = [jsObj[keyVal[0]], decodeURIComponent(keyVal[1])];
        } else jsObj[keyVal[0]] = decodeURIComponent(keyVal[1]);
    });

    return jsObj;
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

function getTimeStamp() {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000000000 + hrTime[1];
}

function getObjectKeyValueCaseInsensitive(obj, key) {
    for (const keyThis of Object.keys(obj)) if (keyThis.toUpperCase() == key.toUpperCase()) return obj[keyThis];
    return null;
}

function getObjectKeyNameCaseInsensitive(obj, key) {
    for (const keyThis of Object.keys(obj)) if (keyThis.toUpperCase() == key.toUpperCase()) return keyThis;
    return null;
}

const getTempFile = ext =>
    `${os.tmpdir()+"/"+(Math.random().toString(36)+'00000000000000000').slice(2, 11)}.${getTimeStamp()}${ext?`.${ext}`:""}`;

module.exports = { parseBoolean, getDateTime, queryToObject, getTimeStamp, getObjectKeyValueCaseInsensitive, getObjectKeyNameCaseInsensitive, getTempFile, copyFileOrFolder };
