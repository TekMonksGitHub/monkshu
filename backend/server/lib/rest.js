/* 
 * (C) 2018 TekMonks. All rights reserved.
 * 
 * callback format -> callback(error, data)
 */

const http = require("http");
const https = require("https");

const querystring = require("querystring");

function post(host, port, path, headers, req, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    
    let optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : headers
    };

    doCall(jsonStr, optionspost, false, callback);
}

function postHttps(host, port, path, headers, req, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    
    let optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : headers
    };

    doCall(jsonStr, optionspost, true, callback);
}

function put(host, port, path, headers, req, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    
    let optionsput = {
        host : host,
        port : port,
        path : path,
        method : 'PUT',
        headers : headers
    };

    doCall(jsonStr, optionsput, false, callback);
}

function putHttps(host, port, path, headers, req, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    
    let optionsput = {
        host : host,
        port : port,
        path : path,
        method : 'PUT',
        headers : headers
    };

    doCall(jsonStr, optionsput, true, callback);
}

function get(host, port, path, headers, req, callback) {
    if (req) path += "?" + (typeof (req) == "object" ? + querystring.stringify(req):req);

    let optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsget, false, callback);
}

function getHttps(host, port, path, headers, req, callback) {
    if (req) path += "?" + (typeof (req) == "object" ? + querystring.stringify(req):req);

    let optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsget, true, callback);
}

function deleteHttp(host, port, path, headers, _req, callback) {
    let optionsdelete = {
        host : host,
        port : port,
        path : path,
        method : 'DELETE',
        headers : headers
    };

    doCall(null, optionsdelete, false, callback);
}

function deleteHttps(host, port, path, headers, _req, callback) {

    let optionsdelete = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsdelete, true, callback);
}

function doCall(reqStr, options, secure, callback) {
    const caller = secure ? https : http;
    let resp, ignoreEvents = false;
    const req = caller.request(options, res => {
        res.on("data", d => {if (!ignoreEvents) resp = resp?d:resp+d;});

        res.on("error", error => {callback(error, null); ignoreEvents = true;});

        res.on("end", () => {
            if (ignoreEvents) return;
            const status = res.statusCode; const resHeaders = res.getHeaders();
            try {callback(null, JSON.parse(resp), status, resHeaders)} catch (e) {callback(`Bad JSON Response: ${resp}, error: ${e}`, null)}
        });
    });
 
    if (reqStr) req.write(reqStr);
    req.end();
    req.on("error", e => callback(e, null));
}

if (require.main === module) {
	let args = process.argv.slice(2);
	
    if (args.length == 0) console.log("Usage: rest <host> <port> <path> <json>");
    else post(args[0], args[1], args[2], JSON.parse(args[3]), (e, data) => { 
        if (!e) console.log(JSON.stringify(data)); else console.log(e); 
    });
}

module.exports = {get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps};