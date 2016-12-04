/* 
 * (C) 2015 TekMonks. All rights reserved.
 */

var fs = require("fs");

function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {done(err);});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {done(err);});
	wr.on("close", function(ex) {done();});
	rd.pipe(wr);
	
	function done(err) {
		if (!cbCalled) {cb(err); cbCalled = true;}
	}
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}

module.exports = {
	copyFile : copyFile,
	getDateTime : getDateTime
};