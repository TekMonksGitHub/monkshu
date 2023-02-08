/** 
 * Redirect extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const mustache = require("mustache");

exports.name = "redirect";
exports.processRequest = async (req, res, dataSender, _errorSender, _codeSender, access, _error) => {
	const protocol = req.connection.encrypted ? "https" : "http",
        {redirectedURL, code} = _getRedirectedURL(new URL(req.url, conf.ssl && (!conf.forceHTTP1) ? `${protocol}://${req.headers[":authority"]}/` : `${protocol}://${req.headers.host}/`))||{redirectedURL:null, code:null}; // getting url for http2 or http1 based on configurations
	if (!redirectedURL) return false;

	access.info(`Redirecting, ${code}, ${req.url} to ${redirectedURL.href}`);
	
	dataSender(res, code, {"Location": redirectedURL.href}, null); return true;
}

function _getRedirectedURL(url) {
    if (!conf.redirects) return null; // no redirects configured
    for (const redirect of conf.redirects) {
        const match = url.href.match(new RegExp(Object.keys(redirect)[0])); if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            return {redirectedURL: new URL(mustache.render(redirect[Object.keys(redirect)[0]], data)), code: 302}
        }
    }
    return {redirectedURL: null, code: null};    // nothing matched
}