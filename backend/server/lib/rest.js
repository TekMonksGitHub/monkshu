/* 
 * (C) 2018 TekMonks. All rights reserved.
 * 
 * callback format -> callback(error, data)
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution

const http = require("http");
const zlib = require("zlib");
const https = require("https");
const utils = require(CONSTANTS.LIBDIR+"/utils.js");
const crypt = require(CONSTANTS.LIBDIR+"/crypt.js");

const fs = require("fs");
const querystring = require("querystring");

function post(host, port, path, headers = {}, req, sslObj, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    headers["Accept"] = "application/json";

    const optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : headers
    };

    doCall(jsonStr, optionspost, false, sslObj, callback);
}

function postHttps(host, port, path, headers = {}, req, sslObj, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    headers["Accept"] = "application/json";

    const optionspost = {
        host : host,
        port : port,
        path : path,
        method : 'POST',
        headers : headers
    };

    doCall(jsonStr, optionspost, true, sslObj, callback);
}

function put(host, port, path, headers = {}, req, sslObj, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    headers["Accept"] = "application/json";

    const optionsput = {
        host : host,
        port : port,
        path : path,
        method : 'PUT',
        headers : headers
    };

    doCall(jsonStr, optionsput, false, sslObj, callback);
}

function putHttps(host, port, path, headers = {}, req, sslObj, callback) {
    let jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;

    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    headers["Accept"] = "application/json";

    const optionsput = {
        host : host,
        port : port,
        path : path,
        method : 'PUT',
        headers : headers
    };

    doCall(jsonStr, optionsput, true, sslObj, callback);
}

function get(host, port, path, headers = {}, req, sslObj, callback) {
    if (req && typeof req == "object") req = querystring.stringify(req);
    if (req && req.trim() !== "") path += `?${req}`;

    headers["Accept"] = "application/json";

    const optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsget, false, sslObj, callback);
}

function getHttps(host, port, path, headers = {}, req, sslObj, callback) {
    if (req && typeof req == "object") req = querystring.stringify(req);
    if (req && req.trim() !== "") path += `?${req}`;

    headers["Accept"] = "application/json";

    const optionsget = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsget, true, sslObj, callback);
}

function deleteHttp(host, port, path, headers = {}, _req, sslObj, callback) {
    headers["Accept"] = "application/json";
    const optionsdelete = {
        host : host,
        port : port,
        path : path,
        method : 'DELETE',
        headers : headers
    };

    doCall(null, optionsdelete, false, sslObj, callback);
}

function deleteHttps(host, port, path, headers = {}, _req, sslObj, callback) {
    headers["Accept"] = "application/json";
    const optionsdelete = {
        host : host,
        port : port,
        path : path,
        method : 'GET',
        headers : headers
    };

    doCall(null, optionsdelete, true, sslObj, callback);
}

function doCall(reqStr, options, secure, sslObj, callback) {
    const caller = secure ? https : http; 
    let resp, ignoreEvents = false, resPiped;
    if (sslObj & typeof sslObj == "object") _addSecureOptions(options, sslObj);
    const req = caller.request(options, res => {
        const encoding = utils.getObjectKeyValueCaseInsensitive(res.headers, "Content-Encoding") || "identity";
        if (encoding.toLowerCase() == "gzip") {resPiped = zlib.createGunzip(); res.pipe(resPiped);}  else resPiped = res;

        resPiped.on("data", d => {if (!ignoreEvents) resp = resp ? resp+d : d});

        const sendError = error => {callback(error, null); ignoreEvents = true;};
        res.on("error", error => sendError(error)); resPiped.on("error", error => sendError(error));

        resPiped.on("end", () => {
            if (ignoreEvents) return;
            const status = res.statusCode, resHeaders = {...res.headers};
            const statusOK = Math.trunc(status/200) == 1 && status %200 < 100;

            if (!statusOK) callback(`Bad status: ${status}`, null, status, resHeaders);
            else try {callback(null, JSON.parse(resp), status, resHeaders)} catch (e) {callback(`Bad JSON Response: ${resp}, error: ${e}`, null, status, resHeaders)}
        });
    });
 
    if (reqStr) req.write(reqStr);
    req.end();
    req.on("error", e => callback(e, null));
}

function _addSecureOptions(options, sslObj) {
    if (sslObj.pfxPath && sslObj.encryptedPassphrase) { 
        options.pfx = _getFileContents(sslObj.pfxPath);
        options.passphrase = crypt.decrypt(sslObj.encryptedPassphrase, sslObj.encryptionKey);
    } else if (sslObj.certPath && sslObj.encryptedKeyPath) {
        options.cert = _getFileContents(ssl.certPath);
        options.key = crypt.decrypt(_getFileContents(ssl.encryptedKeyPath), sslObj.encryptionKey);
    } 
}

const _fileContents = {};
function _getFileContents(filepath) {
    try {if (!_fileContents[filepath]) _fileContents[filepath] = fs.readFileSync(filepath); return _fileContents[filepath];}
    catch (error) {console.error(error); return;}
}

if (require.main === module) {
	let args = process.argv.slice(2);
	
    if (args.length == 0) console.log("Usage: rest <host> <port> <path> <headers> <json-body> [ssl-options]");
    else post(args[0], args[1], args[2], JSON.parse(args[3]), JSON.parse(args[4]), args[5] ? JSON.parse(args[5]) : null, (e, data) => { 
        if (!e) console.log(JSON.stringify(data)); else console.log(e); 
    });
}

module.exports = { get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps };
