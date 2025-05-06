/** 
 * URL rewriter extension for frontend HTTPD. Uses same format
 * as the redirect extension and relies on it.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const redirect = require(`${conf.extdir}/redirect.js`)

exports.name = "rewriteurl";
exports.processRequest = async (req, _res, _dataSender, _errorSender, _codeSender, access, _error) => {
    if (req.headers[redirect.NO_REDIRECT_HEADER]?.toLowerCase() == "true") return false; 

    const rewrittenURL = _getRewrittenURL(req.url);
    if (rewrittenURL) {
        const rewrittenPath = rewrittenURL.pathname+rewrittenURL.search;
        access.info(`Rewrote URL ${req.url} to ${rewrittenPath}`);
        req.url = rewrittenPath;
    } else return false;   // we just rewrite the URL, let the server handle the rest
}

const _getRewrittenURL = url => redirect.getRedirectedURL(url, conf.rewriteurl);