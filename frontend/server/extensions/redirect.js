/** 
 * Redirect extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

exports.name = "redirect";
exports.processRequest = async (req, res, dataSender) => {
    if (!conf.server_redirect) return false;

    const urlIn = new URL(req.url, `http://${req.headers.host}/`);
    let isRedirectServer = false, urlServer; try {urlServer = new URL(conf.server_redirect)} catch (err) {isRedirectServer = true};

	const host = isRedirectServer ? conf.server_redirect : urlServer.host;
	const protocol = !isRedirectServer ? (urlServer.protocol ? urlServer.protocol : (conf.ssl?"https:":"http:")) : 
        (urlIn.protocol ? urlIn.protocol : (conf.ssl?"https:":"http:"));
	if (!isRedirectServer && !conf.server_redirect.endsWith(urlServer.pathname)) urlServer.pathname = null;
	const pathname = !isRedirectServer ? (urlServer.pathname || urlIn.pathname || "") : (urlIn.pathname || "");
	const search = !isRedirectServer ? (urlServer.search || urlIn.search || "") : (urlIn.search || "");
	const redirectURL = `${protocol}//${host}${pathname}${search}`;
	
	dataSender(res, 302, {"Location": redirectURL}, null); return true;
}