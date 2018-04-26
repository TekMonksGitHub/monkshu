/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const https = require("https");

const querystring = require("querystring");

function post(host, port, path, req, callback) {
    var jsonStr = JSON.stringify(req);

    var postheaders = {
        "Content-Type" : "application/json",
        "Content-Length" : Buffer.byteLength(jsonStr, "utf8")
    };
    
    var optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : postheaders
    };

    doCall(jsonStr, optionspost, false, callback);
}

function postHttps(host, port, path, req, callback) {
    var jsonStr = JSON.stringify(req);

    var postheaders = {
        "Content-Type" : "application/json",
        "Content-Length" : Buffer.byteLength(jsonStr, "utf8")
    };
    
    var optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : postheaders
    };

    doCall(jsonStr, optionspost, true, callback);
}

function get(host, port, path, req, callback) {
    path += "?" + querystring.stringify(req);

    var optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : {}
    };

    doCall(jsonStr, optionsget, false, callback);
}

function getHttps(host, port, path, req, callback) {
    path += "?" + querystring.stringify(req);

    var optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : {}
    };

    doCall(jsonStr, optionsget, true, callback);
}

function doCall(reqStr, options, secure, callback) {
    var caller = secure ? https : http;
    var responseString = "";
    var req = caller.request(options, (res) => {
        res.on("data", (d) => {responseString += d});

        res.on("end", function() {callback(null, JSON.parse(responseString));});
    });
 
    req.write(reqStr);
    req.end();
    req.on("error", (e) => {callback(e, null)})
}

if (require.main === module) {
	var args = process.argv.slice(2);
	
	if (args.length == 0) {
        console.log("Usage: rest <host> <port> <path> <json>");
        post("127.0.0.1", 9090, "/sendMail", JSON.parse('{"from":"rshk@rakuten.tekmonks.com", "to":"rvkapoor@tekmonks.com", "subject":"Test", "html":"<html><body><h1>Test test</h1></body></html>"}'),
            (e, data) => { if (!e) console.log(JSON.stringify(data)); else console.log(e); });
	} else post(args[0], args[1], args[2], JSON.parse(args[3]));
}

exports.get = get;
exports.post = post;
exports.getHttps = getHttps;
exports.postHttps = postHttps;