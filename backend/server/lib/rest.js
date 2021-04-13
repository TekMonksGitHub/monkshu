/** 
 * (C) 2020 TekMonks. All rights reserved.
 * 
 * rest.js - perform REST API calls. Accepts callback.
 *           Returns promise if callback is not passed.
 *           REST/JSON wrapper around the http client library.
 * 
 * callback format -> callback(error, data)
 * promise resolves to -> { data, status, resHeaders, error }
 * promise rejects -> error
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution

const httpClient = require(CONSTANTS.LIBDIR + "/httpClient.js");

async function post(host, port, path, headers, req, sslObj, callback) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; headers = _getRESTHeaders(headers);
    try {
        const result = await httpClient.post(host, port, path, headers, jsonStr, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function postHttps(host, port, path, headers, req, sslObj, callback) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; headers = _getRESTHeaders(headers);
    try {
        const result = await httpClient.postHttps(host, port, path, headers, jsonStr, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function put(host, port, path, headers, req, sslObj, callback) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; headers = _getRESTHeaders(headers);
    try {
        const result = await httpClient.put(host, port, path, headers, jsonStr, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function putHttps(host, port, path, headers, req, sslObj, callback) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req;  headers = _getRESTHeaders(headers);
    try {
        const result = await httpClient.putHttps(host, port, path, headers, jsonStr, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function get(host, port, path, headers, req, sslObj, callback) {
    try {
        const result = await httpClient.get(host, port, path, headers, req, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function getHttps(host, port, path, headers, req, sslObj, callback) {
    try {
        const result = await httpClient.getHttps(host, port, path, headers, req, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function deleteHttp(host, port, path, headers, _req, sslObj, callback) {
    try {
        const result = await httpClient.deleteHttp(host, port, path, headers, _req, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

async function deleteHttps(host, port, path, headers, _req, sslObj, callback) {
    try {
        const result = await httpClient.deleteHttps(host, port, path, headers, _req, sslObj); 
        if (result.data) result.data = JSON.parse(result.data); if (callback) callback(null, result); else return result;
    } catch (err) { if (callback) callback(err); else throw err; }
}

const _getRESTHeaders = headers => headers?{...headers, "Content-Type": "application/json", "Accept": "application/json"}:{"Content-Type": "application/json", "Accept": "application/json"};

if (require.main === module) {
    const args = process.argv.slice(2); if (args[0]) args[0] = args[0].toLowerCase(); 
    if (args.length == 0) console.error("Usage: rest.js <method> <url> <body> <headers> [ssl-options]");
    else {
        const url = new URL(args[1]); if (url.protocol == "https:") args[0] = args[0]+"Https"; if (args[0]=="delete") args[0] = "deleteHttp"; 
        const port = url.port && url.port != "" ? url.port : (url.protocol=="https:"?443:80), jsonReq = args[2] && args[2] != "" ? JSON.parse(args[2]):null,
            headers = args[3] && args[3] != "" ? JSON.parse(args[3]):{}, sslOptions = args[4] ? JSON.parse(args[4]):null,
            totalPath = url.pathname + (url.search?url.search:"");
        eval(args[0]).call( null, url.hostname, port, totalPath, headers, jsonReq, sslOptions, (err, result) => {
            const funcToWriteTo = err?console.error:console.log, dataToWrite = err ? err : (result.data?JSON.stringify(result.data, null, 2):"");
            funcToWriteTo.call(console, dataToWrite);
        });
    }
}

module.exports = { get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps };