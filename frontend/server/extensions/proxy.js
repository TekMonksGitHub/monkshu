/** 
 * Proxy extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const utils = require(`${conf.libdir}/utils.js`);
const httpClient = require(`${conf.libdir}/httpClient.js`);

exports.name = "proxy";
exports.processRequest = async (req, res, dataSender, errorSender) => {
    const protocol = req.connection.encrypted ? "https" : "http",
        proxiedHost = _getProxiedHost(new URL(req.url, `${protocol}://${req.headers.host}/`)); if (!proxiedHost) return false;

    let proxiedURL = `${protocol}://${proxiedHost}/`; try{const urlTest = new URL(proxiedHost); if (urlTest.protocol=="http:"||urlTest.protocol=="https:") proxiedURL=proxiedHost;} catch (err) {};

    const url = new URL(req.url, proxiedURL), method = req.method.toLowerCase(),
        host = url.hostname, port = url.port, headers = {...req.headers, "host":url.host, "X-Forwarded-For":utils.getClientIP(req), "X-Forwarded-Port":utils.getClientPort(req), "X-Forwarded-Proto": protocol}, 
        data = req.data, path = url.pathname + (url.search?url.search:""); if (!path.startsWith("/")) path = `/${path}`;

    if (url.protocol.toLowerCase() == "https:") method += "Https";           
    if (method == "delete") method = "deleteHttp";        // delete is a reserved word in JS

    let result={}; try{result = await httpClient[method](host, port, path, headers, data);} catch (err) {result.error=err; result.status=500;}
    if (!result.error) dataSender(res, result.status, result.resHeaders, result.data); else errorSender(req, res, result.status, result.error);
    return true;
}

function _getProxiedHost(url) {
    if (!conf.proxies) return null; const path = url.pathname;
    for (const proxy of conf.proxies) if (path.match(new RegExp(Object.keys(proxy)[0]))) return proxy[Object.keys(proxy)[0]];
    return null;
}