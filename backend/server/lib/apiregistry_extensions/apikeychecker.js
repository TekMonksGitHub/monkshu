/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Checks API keys.
 */
const APIKEYS = ["x-api-key", "org_monkshu_apikey"];

function checkSecurity(apiregentry, _url, _req, headers, _servObject) {
    const keyExpected = apiregentry.query.key;
    if (!keyExpected) return true; 
    else for (const apiKeyHeaderName of APIKEYS) if (headers[apiKeyHeaderName] == keyExpected) return true;
    
    return false;   // key not found in the headers
}

module.exports = {checkSecurity};