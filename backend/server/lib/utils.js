/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const fs = require("fs");

function copyFile(source, target, cb) {
    let cbCalled = false;

    let rd = fs.createReadStream(source);
    rd.on("error", function (err) { done(err); });
    let wr = fs.createWriteStream(target);
    wr.on("error", function (err) { done(err); });
    wr.on("close", function (ex) { done(); });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) { cb(err); cbCalled = true; }
    }
}

function queryToObject(query) {
    let jsObj = {};
    let pairs = query.split("&");
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

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    let year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}

function getTimeStamp() {
    let hrTime = process.hrtime();
    return hrTime[0] * 1000000000 + hrTime[1];
}

module.exports = {
    copyFile: copyFile,
    getDateTime: getDateTime,
    queryToObject: queryToObject,
    getTimeStamp: getTimeStamp
};