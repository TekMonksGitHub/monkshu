/** 
 * Redirect extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const mustache = require("mustache");
const utils = require(`${conf.libdir}/utils.js`);

exports.name = "redirect";
exports.processRequest = async (req, res, dataSender, _errorSender, _codeSender, access, _error) => {
	const protocol = req.connection.encrypted ? "https" : "http";
    const {redirectedURL, code} = _getRedirectedURL(new URL(req.url, `${protocol}://${utils.getServerHost(req)}/`)); 
	if (!redirectedURL) return false;

	access.info(`Redirecting, ${code}, ${req.url} to ${redirectedURL.href}`);
	
	dataSender(req, res, {"Location": redirectedURL.href}, null, null, null, code); return true;
}

function _getRedirectedURL(url) {
    const nullReturn = {redirectedURL:null, code:null};
    if (!conf.redirects) return nullReturn; // no redirects configured

    for (const redirect of conf.redirects) {
        const match = url.href.match(new RegExp(Object.keys(redirect)[0])); 
        if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            data.base64 = _ => (text, render) => btoa(render(text));  // add base64 encoding function, useful for Monkshu framework
            return {redirectedURL: new URL(mustache.render(redirect[Object.keys(redirect)[0]], data)), code: 302}
        }
    }
    return nullReturn;    // nothing matched
}