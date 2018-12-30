/* 
 * (C) 2015 TekMonks. All rights reserved.
 */

const fs = require("fs");

function copyFile(source, target, cb) {
    let cbCalled = false;
    
    let done = err => {if (!cbCalled) cb(err); cbCalled = true;}

	let rd = fs.createReadStream(source);
	rd.on("error", err => done(err));
	let wr = fs.createWriteStream(target);
	wr.on("error", err => done(err));
	wr.on("close", _ => done());
	rd.pipe(wr);
}

function getDateTime() {

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    let year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return `${year}:${month}:${day}:${hour}:${min}:${sec}`;
}

module.exports = {
	copyFile : copyFile,
	getDateTime : getDateTime
};