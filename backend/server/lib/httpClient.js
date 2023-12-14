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

const INDEPENDENT_EXECUTION = global.CONSTANTS?.MONKSHU_BACKEND != true;    // support independent execution
let CONSTANTS, LOG;
if (INDEPENDENT_EXECUTION) {
    CONSTANTS = {LIBDIR: __dirname};
    LOG = {info: s => console.info(s), error: s => console.error(s), warn: s => console.warn(s)};
} else {CONSTANTS = global.CONSTANTS; LOG = global.LOG;}

const PROC_MEMORY = {};
const http = require("http");
const zlib = require("zlib");
const https = require("https");
const http2 = require("http2");
const fspromises = require("fs").promises;
const querystring = require("querystring");
const utils = require(CONSTANTS.LIBDIR + "/utils.js");
const crypt = require(CONSTANTS.LIBDIR + "/crypt.js");
const gunzipAsync = require("util").promisify(zlib.gunzip);

let undiciMod;  // holds the undici module if it is available

function post(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionspost = { host, port, path, method: 'POST', headers };
    const result = proxy? _connectProxy(body, optionspost, false, sslObj, proxy) : _doCall(body, optionspost, false, sslObj); 
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function postHttps(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionspost = { host, port, path, method: 'POST', headers };
    const result = proxy? _connectProxy(body, optionspost, true, sslObj, proxy) : _doCall(body, optionspost, true, sslObj);
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function put(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionsput = { host, port, path, method: 'PUT', headers };
    const result = proxy? _connectProxy(body, optionsput, false, sslObj, proxy) : _doCall(body, optionsput, false, sslObj);
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function putHttps(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; const body = req; _addHeaders(headers, body);
    const optionsput = { host, port, path, method: 'PUT', headers };
    const result = proxy? _connectProxy(body, optionsput, true, sslObj, proxy) : _doCall(body, optionsput, true, sslObj);
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function get(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsget = { host, port, path, method: 'GET', headers };
    const result = proxy? _connectProxy(null, optionsget, false, sslObj, proxy) : _doCall(null, optionsget, false, sslObj);
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function getHttps(host, port, path, headers = {}, req, proxy, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsget = { host, port, path, method: 'GET', headers };
    const result = proxy? _connectProxy(null, optionsget, true, sslObj, proxy) : _doCall(null, optionsget, true, sslObj);
    if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function deleteHttp(host, port, path, headers, req, proxy, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    const result = proxy? _connectProxy(null, optionsdelete, false, sslObj, proxy) : _doCall(null, optionsdelete, false, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

function deleteHttps(host, port, path, headers = {}, req, proxy, sslObj, callback) {
    headers = headers||{}; _addHeaders(headers, null);
    if (req && typeof req == "object") req = querystring.stringify(req); if (req && req.trim() !== "") path += `?${req}`; 
    const optionsdelete = { host, port, path, method: 'DELETE', headers };
    const result = proxy? _connectProxy(null, optionsdelete, true, sslObj, proxy) :_doCall(null, optionsdelete, true, sslObj); if (!callback) return result;
    result.then(({ data, status, resHeaders, error }) => callback(error, data, status, resHeaders)).catch((error) => callback(error, null));
}

async function fetch(url, options={}, redirected=false) {    // somewhat fetch compatible API
    const headers = options.headers||{}, urlObj = new URL(url); let method = options.method?.toLowerCase() || "get";
    if (urlObj.protocol == "https:") method = method+"Https"; if (method=="delete") method = "deleteHttp"; 
    const port = urlObj.port && urlObj.port != "" ? urlObj.port : (urlObj.protocol=="https:"?443:80), 
        sslOptions = options.ssl_options, totalPath = urlObj.pathname + (urlObj.search?urlObj.search:""), 
        body = options.body, callback = options.callback, undici = options.undici && _haveUndiciModule();
    if (!options.method) options.method = "get"; if (options.enforce_mime) headers.enforce_mime = true;

    if (options.undici && (!_haveUndiciModule())) LOG.warn(`HTTP client told to use Undici in fetch for URL ${url}. But Undici NPM is not installed. Falling back to the native HTTP clients.`);
    const { error, data, status, resHeaders } = undici ? await _undiciRequest(url, options) : 
        await module.exports[method](urlObj.hostname, port, totalPath, headers, body, sslOptions);

    if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308 && 
            ((!options.redirect) || options.redirect.toLowerCase() == "follow")) {    // handle redirects

        if (resHeaders.location) return fetch(new URL(resHeaders.location, url).href, options, true);   
        else LOG.error(`URL ${url} sent a redirect with no location specified (location header not found).`);
    }
    
    const result = {ok: error?false:true, status, data, headers: resHeaders, buffer: _ => data, 
        text: encoding => data.toString(encoding||"utf8"), json: _ => JSON.parse(data), redirected, url}
    if (callback) callback(result); else return result;
}

const _haveUndiciModule = _ => { if (undiciMod) return true; try {undiciMod = require("undici"); return true;} catch (err) {return false;}}

async function _undiciRequest(url, options) {
    LOG.info(`httpClient connecting to URL ${url} via HTTP1.1 using Undici.`);

    const reqHeaders = _addHeaders(options.headers||{}, options.body), 
        res = await undiciMod.request(url, { method: options.method.toUpperCase(), maxRedirections: 0, 
            headers: reqHeaders, body: options.body});  // default accept is HTML only
    
    const status = res.statusCode, resHeaders = _squishHeaders({ ...res.headers });
    const statusOK = Math.trunc(status / 200) == 1 && status % 200 < 100;
    if (!_checkRequestResponseContentTypesMatch(reqHeaders, resHeaders)) return({ 
        error: `Content type doesn't match acceptable content. Requested ${reqHeaders.accept} != resHeaders["content-type"].`, 
            data: null, status, resHeaders });
    const dataArrayBuffer = res.body ? await res.body.arrayBuffer() : [];
    let dataBuffer = Buffer.from(dataArrayBuffer);
    if (resHeaders["content-encoding"] == "gzip") try {dataBuffer = await gunzipAsync(dataBuffer)} catch (err) {
        LOG.error(`Gunzip decompression error for Undici request to the URL ${url}.`);
        return {error: `Bad response. Body decompress error ${err}.`, data: Buffer.from([]), status, resHeaders}
    }

    if (!statusOK) return({ error: `Bad status: ${status}`, data: dataBuffer, status, resHeaders });
    else return({ error: null, data: dataBuffer, status, resHeaders });
}

function _addHeaders(headers, body) {
    if (body) headers["content-type"] = utils.getObjectKeyValueCaseInsensitive(headers, "content-type") || "application/x-www-form-urlencoded";
    if (body) headers["content-length"] = Buffer.byteLength(body, "utf8");
    headers["accept"] = utils.getObjectKeyValueCaseInsensitive(headers, "accept") || "*/*";
    headers["accept-encoding"] = "gzip,identity";   // we will accept gzip
    return headers;
}

const _squishHeaders = headers => {const squished = {}; for ([key,value] of Object.entries(headers)) squished[key.toLowerCase()] = value; return squished};

function _connectProxy(reqStr, options, secure, sslObj, proxy) {
    return new Promise(async (resolve, reject) => {
        const proxyOptions = {
            hostname: proxy.host,
            port: proxy.port,
            method: 'CONNECT',
            path: `${options.host}:${options.port}`,
            headers: {
                'Proxy-Connection': 'keep-alive',
            },
        };

        //Connect to proxy server on HTTP/1.1
        LOG.info(`Connecting to proxy server on ${proxyOptions.hostname}:${proxyOptions.port} via HTTP/1.1`)
        const proxyReq = proxy.secure ? https.request(proxyOptions) : http.request(proxyOptions);
        proxyReq.end();

        
        proxyReq.on('connect', (res, socket) => {
            proxyStatus = res.statusCode;
            LOG.info(`Status of the proxy connect ${proxyStatus}`);
            if (proxyStatus === 200) {
                _doCall(reqStr, options, secure, sslObj, socket)
                .then(({ data, status, resHeaders, error }) => resolve({error, data, status, resHeaders}))
                .catch(error => reject({error: error}));
            }
            else {
                LOG.error('Connection to the proxy failed');
                reject({error: `Bad status ${proxyStatus}`, data: res, status: proxyStatus, resHeaders: null});
            }
        });

        proxyReq.on('error', (err) => {
            LOG.error('Error connecting to the proxy:', err);
            reject(err);
        });
    });

}

function _doCall(reqStr, options, secure, sslObj, socket) {
    return new Promise(async (resolve, reject) => {
        const caller = secure && (!sslObj?._org_monkshu_httpclient_forceHTTP1) ? http2.connect(`https://${options.host}:${options.port||443}`, { socket }) : 
            secure ? https : http; // use the right connection factory based on http2, http1/ssl or http1/http
        let resp, ignoreEvents = false, resPiped, _skipProtocolErrors = false;
        if (sslObj & typeof sslObj == "object") try { await _addSecureOptions(options, sslObj) } catch (err) { reject(err); return; };
        const sendError = (error) => { 
            reject(error); ignoreEvents = true; 
        };
        options.headers = _squishHeaders(options.headers);  // squish the headers - needed specially for HTTP/2 but good anyways

        if (secure && (!sslObj?._org_monkshu_httpclient_forceHTTP1)) { // for http2 case
            LOG.info(`httpClient connecting to URL ${options.host}:${options.port}/${options.path} via HTTP2.`);
            caller.on("error", error => sendError(error))

            const http2Headers = { ...options.headers }; http2Headers[http2.constants.HTTP2_HEADER_PATH] = options.path;
            http2Headers[http2.constants.HTTP2_HEADER_METHOD] = (_=>{switch (options.method) {
                case "GET": return http2.constants.HTTP2_METHOD_GET;
                case "PUT": return http2.constants.HTTP2_METHOD_PUT;
                case "DELETE": return http2.constants.HTTP2_METHOD_DELETE;
                case "POST": return http2.constants.HTTP2_METHOD_POST;
                default: return http2.constants.HTTP2_METHOD_GET;
            }})();
            const req = caller.request(http2Headers); 
            req.on("error", (error) => { 
                if (_skipProtocolErrors && error.code == "ERR_HTTP2_STREAM_ERROR") return; else sendError(error) });
            req.on("response", headers => {
                const _processEnd = _ => {
                    if (ignoreEvents) return;
                    const resHeaders = { ...headers }, status = resHeaders[http2.constants.HTTP2_HEADER_STATUS];
                    delete resHeaders[http2.constants.HTTP2_HEADER_STATUS]; resHeaders.status = status;
                    const statusOK = Math.trunc(status / 200) == 1 && status % 200 < 100;
                    if (!statusOK) reject({ error: `Bad status: ${status}`, data: resp, status, resHeaders });
                    else resolve({ error: null, data: resp, status, resHeaders });
                    caller.destroy();
                }

                if (!_checkRequestResponseContentTypesMatch(options.headers, headers)) {
                    sendError(`Content type doesn't match acceptable content. Requested ${options.headers.accept} != ${headers["content-type"]}.`);
                    return;
                }
                let status; try{status = parseInt(headers[http2.constants.HTTP2_HEADER_STATUS]||headers.status)} catch(err) {status=500}; 
                const statusOK = (Math.trunc(status / 200) == 1) && (status % 200 < 100);
                if (!statusOK) sendError(`Bad status, ${headers.status}.`); else _skipProtocolErrors = true;

                const encoding = utils.getObjectKeyValueCaseInsensitive(headers, "content-encoding") || "identity";
                if (encoding.toLowerCase() == "gzip") { resPiped = zlib.createGunzip(); req.pipe(resPiped); } else resPiped = req;
                resPiped.on("data", chunk => { 
                    if (!ignoreEvents) resp = resp ? Buffer.concat([resp, chunk]) : chunk; else return;
                    if (resp.length == utils.getObjectKeyValueCaseInsensitive(headers, "content-length")) _processEnd();
                });
                resPiped.on("error", error => sendError(error)); 
                resPiped.on("end", _ => _processEnd());
            });
            if (reqStr) req.write(reqStr);
            req.end();
        } else {
            LOG.info(`httpClient connecting to URL ${options.host}:${options.port}/${options.path} via HTTP1.`);

            if (sslObj & typeof sslObj == "object") try{await _addSecureOptions(options, sslObj)} catch (err) {reject(err); return;};
            const req = caller.request(options, res => {
                if (!_checkRequestResponseContentTypesMatch(options.headers, res.headers)) {
                    sendError(`Content type doesn't match acceptable content. Requested ${options.headers.accept} != ${res.headers["content-type"]}.`);
                    return;
                }

                const encoding = utils.getObjectKeyValueCaseInsensitive(res.headers, "content-encoding") || "identity";
                if (encoding.toLowerCase() == "gzip") { resPiped = zlib.createGunzip(); res.pipe(resPiped); } else resPiped = res;

                resPiped.on("data", chunk => { if (!ignoreEvents) resp = resp ? Buffer.concat([resp,chunk]) : chunk });
                res.on("error", error => sendError(error)); resPiped.on("error", error => sendError(error));

                resPiped.on("end", () => {
                    if (ignoreEvents) return;
                    const status = res.statusCode, resHeaders = { ...res.headers };
                    const statusOK = Math.trunc(status / 200) == 1 && status % 200 < 100;

                    if (!statusOK) resolve({ error: `Bad status: ${status}`, data: resp, status, resHeaders });
                    else resolve({ error: null, data: resp, status, resHeaders });
                });
            });
            req.on("error", error => reject(error));
            if (reqStr) req.write(reqStr);
            req.end();
        }
    });
}

function _checkRequestResponseContentTypesMatch(requestHeaders, responseHeaders) {
    if ((!requestHeaders.enforce_mime)) return true;  // enforce only if asked to
    const headersReq = _squishHeaders(requestHeaders), headersRes = _squishHeaders(responseHeaders);
    if (!headersReq.accept) return true;    // nothing to check
    const headersAccept = headersReq.accept.split(",").map(value => value.trim()), 
        responseContentType = headersRes["content-type"]?headersRes["content-type"].split(";")[0] : "text/html";
    for (const headerAccept of headersAccept) if ((headerAccept.accept == "*/*") || 
        (headerAccept.accept == "*") || (headerAccept == responseContentType)) return true;
    return false;
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

module.exports = { get, post, put, delete: deleteHttp, getHttps, postHttps, putHttps, deleteHttps, fetch, main };

if (require.main === module) main();

function main() {
    const args = process.argv.slice(2); if (args[0]) args[0] = args[0].toLowerCase(); global.LOG = console;
    if (args.length == 0) console.error("Usage: httpClient.js <method> <url> <body> <headers> [ssl-options]");
    else {
        const reqHeaders = args[3] && args[3] != "" ? JSON.parse(args[3]):{}, 
            sslOptions = args[4] ? JSON.parse(args[4]):null, body = args[2], url = args[1], method = args[0];
        const timeStart = Date.now();
        fetch(url, {method, headers: reqHeaders, ssl_options: sslOptions, body, undici: false, callback: result => {
            const timeEnd = Date.now();
            const {error, data, status, headers} = result;
            const funcToWriteTo = error?console.error:process.stdout.write.bind(process.stdout), 
                dataToWrite = error ? error : data? data.toString("utf8") : "";
            funcToWriteTo(dataToWrite);
            funcToWriteTo(`\n\nResponse status ${status}\n`);
            funcToWriteTo(`\n\nResponse headers ${JSON.stringify(headers, null, 2)}\n`);
            funcToWriteTo(`Time start: ${timeStart}. Time ended: ${timeEnd}. Time taken: ${timeEnd - timeStart} milliseconds.\n`);
            process.exit(error?1:0);
        }});
    }
}