/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Checks API keys.
 */
const APIKEYS = ["X-API-Key", "org_monkshu_apikey"];
const utils = require(CONSTANTS.LIBDIR+"/utils.js");

function checkSecurity(apiregentry, _url, _req, headers) {
    const keyExpected = apiregentry.query.key;
    if (!keyExpected) return true; 
    else for (const apiKeyHeaderName of APIKEYS) 
        if (utils.getObjectKeyValueCaseInsensitive(headers,apiKeyHeaderName) == keyExpected) return true;
    
    return false;   // key not found in the headers
}

module.exports = {checkSecurity};