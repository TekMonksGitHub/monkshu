/** 
 * (C) 2018 TekMonks. All rights reserved.
 * 
 * rest function call returns -> Prmoise<object>
 * resolve -> { data, status, resHeaders, message }
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution
if (!CONSTANTS.SHARED_PROC_MEMORY["__com_tekmonks_monkshu_rest_ssh_file"]) CONSTANTS.SHARED_PROC_MEMORY["__com_tekmonks_monkshu_rest_ssh_file"] = {};

const http = require("http");
const zlib = require("zlib");
const https = require("https");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const crypt = require(CONSTANTS.LIBDIR + "/crypt.js");

const fs = require("fs");
const path = require("path");
const util = require("util");
const readFileAsync = util.promisify(fs.readFile);
const querystring = require("querystring");

function post(host, port, path, headers = {}, req, sslObj) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; addHeaders(headers, jsonStr);
    const optionspost = { host, port, path, method: 'POST', headers };
    return doCall(jsonStr, optionspost, false, sslObj);
}

function postHttps(host, port, path, headers = {}, req, sslObj) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; addHeaders(headers, jsonStr);
    const optionspost = { host, port, path, method: 'POST', headers };
    return doCall(jsonStr, optionspost, true, sslObj);
}

function put(host, port, path, headers = {}, req, sslObj) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; addHeaders(headers, jsonStr);
    const optionsput = { host, port, path, method: 'PUT', headers };
    return doCall(jsonStr, optionsput, false, sslObj);
}

function putHttps(host, port, path, headers = {}, req, sslObj) {
    const jsonStr = typeof (req) == "object" ? JSON.stringify(req) : req; addHeaders(headers, jsonStr);
    const optionsput = { host, port, path, method: 'PUT', headers };
    return doCall(jsonStr, optionsput, true, sslObj);
}

function get(host, port, path, headers = {}, req, sslObj) {
    if (req && typeof req == "object") req = querystring.stringify(req);
    if (req && req.trim() !== "") path += `?${req}`; headers["Accept"] = "application/json";
    const optionsget = { host, port, path, method: 'GET', headers };
    return doCall(null, optionsget, false, sslObj);
}

function getHttps(host, port, path, headers = {}, req, sslObj) {
    if (req && typeof req == "object") req = querystring.stringify(req);
    if (req && req.trim() !== "") path += `?${req}`; headers["Accept"] = "application/json";
    const optionsget = { host, port, path, method: 'GET', headers };
    return doCall(null, optionsget, true, sslObj);
}

function deleteHttp(host, port, path, headers = {}, _req, sslObj) {
    headers["Accept"] = "application/json";
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    return doCall(null, optionsdelete, false, sslObj);
}

function deleteHttps(host, port, path, headers = {}, _req, sslObj) {
    headers["Accept"] = "application/json";
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    return doCall(null, optionsdelete, true, sslObj);
}

function addHeaders(headers, jsonStr) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(jsonStr, "utf8");
    headers["Accept"] = "application/json";
}

function doCall(reqStr, options, secure, sslObj) {
    return new Promise(async (resolve, reject) => {
        const caller = secure ? https : http;
        let resp, ignoreEvents = false, resPiped;
        if (sslObj & typeof sslObj == "object") await addSecureOptions(options, sslObj);
        const req = caller.request(options, res => {
            const encoding = utils.getObjectKeyValueCaseInsensitive(res.headers, "Content-Encoding") || "identity";
            if (encoding.toLowerCase() == "gzip") { resPiped = zlib.createGunzip(); res.pipe(resPiped); } else resPiped = res;

            resPiped.on("data", chunk => { if (!ignoreEvents) resp = resp ? resp + chunk : chunk });

            const sendError = error => { reject(error); ignoreEvents = true; };
            res.on("error", error => sendError(error)); resPiped.on("error", error => sendError(error));

            resPiped.on("end", () => {
                if (ignoreEvents) return;
                const status = res.statusCode, resHeaders = { ...res.headers };
                const statusOK = Math.trunc(status / 200) == 1 && status % 200 < 100;

                if (!statusOK) resolve({ error: `Bad status: ${status}`, status, resHeaders });
                else try { resolve({ data: resp ? JSON.parse(resp) : resp, status, resHeaders }) }
                catch (e) { resolve({ error: `Bad JSON Response: ${resp}, error: ${e}`, status, resHeaders }) }
            });
        });

        if (reqStr) req.write(reqStr);
        req.end();
        req.on("error", error => reject(error));
    });
}

async function addSecureOptions(options, sslObj) {
    try {
        if (sslObj.pfxPath && sslObj.encryptedPassphrase) {
            options.pfx = await _getFileContents(sslObj.pfxPath);
            options.passphrase = crypt.decrypt(sslObj.encryptedPassphrase, sslObj.encryptionKey);
        } else if (sslObj.certPath && sslObj.encryptedKeyPath) {
            options.cert = await _getFileContents(ssl.certPath);
            options.key = crypt.decrypt(await _getFileContents(ssl.encryptedKeyPath), sslObj.encryptionKey);
        }
    } catch (error) { console.error(error); return; }
}

async function _getFileContents(filepath) {
    try {
        filepath = path.resolve(filepath);
        if (!CONSTANTS.SHARED_PROC_MEMORY["__com_tekmonks_monkshu_rest_ssh_file"][filepath])
            CONSTANTS.SHARED_PROC_MEMORY["__com_tekmonks_monkshu_rest_ssh_file"][filepath] = await readFileAsync(filepath);
        return CONSTANTS.SHARED_PROC_MEMORY["__com_tekmonks_monkshu_rest_ssh_file"][filepath];
    } catch (error) { throw error; }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length == 0) console.log("Usage: rest <host> <port> <path> <headers> <json-body> [ssl-options]");
    else post(args[0], args[1], args[2], JSON.parse(args[3]), JSON.parse(args[4]), args[5] ? JSON.parse(args[5]) : null).then(console.log).catch(console.error);
}

module.exports = { get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps };
