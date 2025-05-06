/** 
 * Redirect extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const mustache = require("mustache");
const utils = require(`${conf.libdir}/utils.js`);

exports.NO_REDIRECT_HEADER = "__org_monkshu_no_redirect";

exports.name = "redirect";
exports.processRequest = async (req, res, dataSender, _errorSender, _codeSender, access, _error) => {
    if (req.headers[exports.NO_REDIRECT_HEADER]?.toLowerCase() == "true") return false; 

	const protocol = req.connection.encrypted ? "https" : "http";
    
    const {redirectedURL, code} = exports.getRedirectedURL(new URL(req.url, `${protocol}://${utils.getServerHost(req)}/`)); 
	if (!redirectedURL) return false;

	access.info(`Redirecting, ${code}, ${req.url} to ${redirectedURL.href}`);
	
	dataSender(req, res, {"Location": redirectedURL.href}, null, null, null, code); return true;
}

exports.getRedirectedURL = function(url, redirectRules=conf.redirects) {
    const nullReturn = {redirectedURL:null, code:null};
    if (!redirectRules) return nullReturn; // no redirects configured

    for (const redirect of redirectRules) {
        const match = url.href.match(new RegExp(Object.keys(redirect)[0])); 
        if (match) {
            const data = {}; for (let i = 1; i < match.length; i++) data[`$${i}`] = match[i];
            data.replacehost = _ => (text, render) => {const oldURL = new URL(render(text)); oldURL.host = new URL(url).host; return oldURL.href;}
            data.monkshubase64decode = _ => (text, render) => atob(decodeURIComponent((render(text))));  // add base64 decoding function, useful for Monkshu framework
            data.monkshubase64encode = _ => (text, render) => encodeURIComponent(btoa((render(text))));  // add base64 encoding function, useful for Monkshu framework
            const redirectedURL = new URL(mustache.render(Object.values(redirect)[0], data));
            return {redirectedURL, code: 302}
        }
    }
    return nullReturn;    // nothing matched
}