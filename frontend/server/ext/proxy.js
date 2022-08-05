/** 
 * Proxy extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const mustache = require("mustache");
const utils = require(`${conf.libdir}/utils.js`);
const httpClient = require(`${conf.libdir}/httpClient.js`);

exports.name = "proxy";
exports.processRequest = async (req, res, dataSender, errorSender, _codeSender, access, _error) => {
    const protocol = req.connection.encrypted ? "https" : "http",
        proxiedURL = _getProxiedURL(new URL(req.url, `${protocol}://${req.headers.host}/`)); if (!proxiedURL) return false;

    const url = proxiedURL, method = req.method.toLowerCase(), host = url.hostname, port = url.port, data = req.data,
        headers = {...req.headers, "host":url.host, "X-Forwarded-For":utils.getClientIP(req), "X-Forwarded-Port":utils.getClientPort(req), "X-Forwarded-Proto": protocol};
    let path = url.pathname + (url.search?url.search:""); if (!path.startsWith("/")) path = `/${path}`;

    if (url.protocol.toLowerCase() == "https:") method += "Https";           
    if (method == "delete") method = "deleteHttp";        // delete is a reserved word in JS

    access.info(`Proxying ${req.url} via ${proxiedURL}`);

    let result={}; try{result = await httpClient[method](host, port, path, headers, data);} catch (err) {result.error=err; result.status=500;}
    if (!result.error) dataSender(res, result.status, result.resHeaders, result.data); else errorSender(req, res, result.status, result.error);
    return true;
}

function _getProxiedURL(url) {
    if (!conf.proxies) return null; // no proxies configured
    for (const proxy of conf.proxies) {
        const urlHref = url.href, match = urlHref.match(new RegExp(Object.keys(proxy)[0])); if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            const urlParsed = mustache.render(Object.values(proxy)[0], data); return new URL(urlParsed);
        }
    }
    return null;    // nothing matched
}