/** 
 * (C) 2020 TekMonks. All rights reserved.
 * 
 * httpClient.js - perform HTTP client calls. Accepts callback. 
 *                 Returns promise if callback is not passed.
 * 
 * callback format -> callback(error, data)
 * promise resolves to -> { data, status, resHeaders, error }
 * promise rejects -> error
 * 
 * Returned data is a Buffer object. It should be converted based on
 * returned MIME headers.
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution

const PROC_MEMORY = {};
const http = require("http");
const zlib = require("zlib");
const https = require("https");
const fspromises = require("fs").promises;
const querystring = require("querystring");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const crypt = require(CONSTANTS.LIBDIR + "/crypt.js");

function post(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionspost = { host, port, path, method: 'POST', headers };
    const result = _doCall(body, optionspost, false, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function postHttps(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionspost = { host, port, path, method: 'POST', headers };
    const result = _doCall(body, optionspost, true, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function put(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionsput = { host, port, path, method: 'PUT', headers };
    const result = _doCall(body, optionsput, false, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function putHttps(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionsput = { host, port, path, method: 'PUT', headers };
    const result = _doCall(body, optionsput, true, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function get(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsget = { host, port, path, method: 'GET', headers };
    const result = _doCall(null, optionsget, false, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function getHttps(host, port, path, headers = {}, req, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsget = { host, port, path, method: 'GET', headers };
    const result = _doCall(null, optionsget, true, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function deleteHttp(host, port, path, headers, req, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    const result = _doCall(null, optionsdelete, false, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function deleteHttps(host, port, path, headers = {}, req, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    const result = _doCall(null, optionsdelete, true, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function _addHeaders(headers, body) {
    if (body) headers["content-type"] = utils.getObjectKeyValueCaseInsensitive(headers, "content-type") || "application/x-www-form-urlencoded";
    if (body) headers["content-length"] = Buffer.byteLength(body, "utf8");
    headers["accept"] = utils.getObjectKeyValueCaseInsensitive(headers, "accept") || "*/*";
}

function _doCall(reqStr, options, secure, sslObj) {
    return new Promise(async (resolve, reject) => {
        const caller = secure ? https : http;
        let resp, ignoreEvents = false, resPiped;
        if (sslObj & typeof sslObj == "object") try{await _addSecureOptions(options, sslObj)} catch (err) {reject(err); return;};
        const req = caller.request(options, res => {
            const encoding = utils.getObjectKeyValueCaseInsensitive(res.headers, "content-encoding") || "identity";
            if (encoding.toLowerCase() == "gzip") { resPiped = zlib.createGunzip(); res.pipe(resPiped); } else resPiped = res;

            resPiped.on("data", chunk => { if (!ignoreEvents) resp = resp ? Buffer.concat([resp,chunk]) : chunk });

            const sendError = error => { reject(error); ignoreEvents = true; };
            res.on("error", error => sendError(error)); resPiped.on("error", error => sendError(error));

            resPiped.on("end", () => {
                if (ignoreEvents) return;
                const status = res.statusCode, resHeaders = { ...res.headers };
                const statusOK = Math.trunc(status / 200) == 1 && status % 200 < 100;

                if (!statusOK) resolve({ error: `Bad status: ${status}`, data: resp, status, resHeaders });
                else resolve({ error: null, data: resp, status, resHeaders });
            });
        });

        if (reqStr) req.write(reqStr);
        req.end();
        req.on("error", error => reject(error));
    });
}

async function _addSecureOptions(options, sslObj) {
    const _cacheReadFile = async filepath => {
        if (!PROC_MEMORY[filepath]) PROC_MEMORY[filepath] = await fspromises.readFile(filepath);
        return PROC_MEMORY[filepath];
    }

    if (sslObj.pfxPath && sslObj.encryptedPassphrase) {
        options.pfx = await _cacheReadFile(sslObj.pfxPath);
        options.passphrase = crypt.decrypt(sslObj.encryptedPassphrase, sslObj.encryptionKey);
    } else if (sslObj.certPath && sslObj.encryptedKeyPath) {
        options.cert = await _cacheReadFile(ssl.certPath);
        options.key = crypt.decrypt(await _cacheReadFile(ssl.encryptedKeyPath), sslObj.encryptionKey);
    }
}

if (require.main === module) main();

function main() {
    const args = process.argv.slice(2); if (args[0]) args[0] = args[0].toLowerCase();
    if (args.length == 0) console.error("Usage: httpClient.js <method> <url> <body> <headers> [ssl-options]");
    else {
        const url = new URL(args[1]); if (url.protocol == "https:") args[0] = args[0]+"Https"; if (args[0]=="delete") args[0] = "deleteHttp"; 
        const port = url.port && url.port != "" ? url.port : (url.protocol=="https:"?443:80), out = process.stdout.write.bind(process.stdout),
            headers = args[3] && args[3] != "" ? JSON.parse(args[3]):{}, sslOptions = args[4] ? JSON.parse(args[4]):null,
            totalPath = url.pathname + (url.search?url.search:"");
        eval(args[0]).call( null, url.hostname, port, totalPath, headers, args[2], sslOptions, (err, data) => {
            const funcToWriteTo = err?console.error:out, dataToWrite = err ? err : (process.stdout.isTTY?data.toString("utf8"):data);
            funcToWriteTo(dataToWrite);
        });
    }
}

module.exports = { get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps, main };