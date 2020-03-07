/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Injects, Content-Type: application/json
 */

function injectResponseHeaders(apiregentry, _url, _response, _requestHeaders, responseHeaders, _servObject) {
    if (apiregentry.query.notRESTAPI) return;   // nothing to do
    responseHeaders["content-type"] = "application/json";
}

module.exports = {injectResponseHeaders};