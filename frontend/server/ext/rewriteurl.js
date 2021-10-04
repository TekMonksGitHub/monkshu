/** 
 * URL rewriter extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const mustache = require("mustache");

exports.name = "rewriteurl";
exports.processRequest = async (req, _res, _dataSender, _errorSender, _codeSender, access, _error) => {
    const protocol = req.connection.encrypted ? "https" : "http",
        rewrittenURL = _getRewrittenURL(new URL(req.url, `${protocol}://${req.headers.host}/`));

    if (rewrittenURL) {
        const rewrittenPath = rewrittenURL.pathname+rewrittenURL.search;
        access.info(`Rewrote URL ${req.url} to ${rewrittenPath}`);
        req.url = rewrittenPath;
    }

    return false;   // we just rewrite the URL, let the server handle the rest
}

function _getRewrittenURL(url) {
    if (!conf.rewriteurl) return null; // no url rewrite rules configured
    for (const urlRule of conf.rewriteurl) {
        const match = (url.pathname+url.search).match(new RegExp(Object.keys(urlRule)[0])); if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            return new URL(mustache.render(urlRule[Object.keys(urlRule)[0]], data), `${url.protocol}//${url.host}/`);
        }
    }
    return null;    // nothing matched
}