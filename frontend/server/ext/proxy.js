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
        {url: proxiedURL, ssl_options} = _getProxiedURL(new URL(req.url, `${protocol}://${utils.getServerHost(req)}/`)) || {}; if (!proxiedURL) return false; 

    const url = proxiedURL, host = url.hostname, port = url.port, data = req.data,
        headers = {...req.headers, "host":url.host, "X-Forwarded-For":utils.getClientIP(req), "X-Forwarded-Port":utils.getClientPort(req), "X-Forwarded-Proto": protocol};
    let path = url.pathname + (url.search?url.search:""); if (!path.startsWith("/")) path = `/${path}`;

    let method = req.method.toLowerCase(); 
    if (url.protocol.toLowerCase() == "https:") method += "Https";           
    if (method == "delete") method = "deleteHttp";        // delete is a reserved word in JS

    access.info(`Proxying ${req.url} via ${proxiedURL}`);

    let result={}; try{result = await httpClient[method](host, port, path, headers, data, ssl_options);} catch (err) {result.error=err; result.status=500;}
    if (!result.error) dataSender(req, res, result.resHeaders, null, result.data, false, result.status); else errorSender(req, res, result.status, result.error);
    return true;
}

exports.processUpgrade = async (req, socket, head, access, error) => {    // WebSockets - upgrades via httpClient, then pipes bytes both ways
    const protocol = req.socket.encrypted ? "https" : "http",
        {url: proxiedURL, ssl_options} = _getProxiedURL(new URL(req.url, `${protocol}://${utils.getServerHost(req)}/`)) || {}; if (!proxiedURL) return false;

    const headers = {...req.headers, "host":proxiedURL.host, "X-Forwarded-For":utils.getClientIP(req), "X-Forwarded-Port":utils.getClientPort(req), "X-Forwarded-Proto": protocol};

    access.info(`Proxying upgrade ${req.url} via ${proxiedURL}`);
    let result; try {result = await httpClient.upgradeConnection(proxiedURL.href, {method: req.method, headers, ssl_options});}
    catch (err) {result = {ok: false, error: err, status: 502};}
    if (socket.destroyed) {result.socket?.destroy(); return true;}  // client left while we were connecting
    if (!result.ok) {
        error.error(`Proxied upgrade ${req.url} via ${proxiedURL} failed: ${result.error}`);
        socket.end(`HTTP/1.1 ${result.status} \r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); return true;
    }

    const backend = result.socket, resHeaders = Object.entries(result.headers).map(([key, value]) => [value].flat().map(v => `${key}: ${v}\r\n`).join("")).join("");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${resHeaders}\r\n`);
    if (result.head?.length) socket.write(result.head); if (head?.length) backend.write(head);
    socket.setTimeout(0); backend.pipe(socket); socket.pipe(backend);
    const close = _ => {backend.destroy(); socket.destroy();};
    backend.on("error", err => {error.error(`Proxied upgrade ${req.url} via ${proxiedURL} failed: ${err}`); close();});
    backend.on("close", close); socket.on("close", close);
    return true;
}

function _getProxiedURL(url) {
    if (!conf.proxies) return null; // no proxies configured
    for (const proxy of conf.proxies) {
        const urlHref = url.href, match = urlHref.match(new RegExp(Object.keys(proxy)[0])); if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            const target = Object.values(proxy)[0], urlParsed = mustache.render(target.url||target, data);
            return {url: new URL(urlParsed), ssl_options: target.ssl_options};
        }
    }
    return null;    // nothing matched
}