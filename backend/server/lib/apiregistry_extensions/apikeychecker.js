/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Checks API keys.
 */

const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);

const APIKEYS = ["x-api-key", "org_monkshu_apikey"];

function checkSecurity(apiregentry, _url, req, headers, _servObject, reason) {
    const keysExpected = apiregentry.query.keys?utils.escapedSplit(apiregentry.query.keys, ","):[];
    if (!keysExpected.length) return true; 
    for (const apiKeyHeaderName of APIKEYS) if (keysExpected.includes(headers[apiKeyHeaderName])) return true;
    for (const [key, value] of Object.entries(req)) 
        if (APIKEYS.includes(key.toLowerCase()) && keysExpected.includes(value)) return true;
    
    reason.reason = "API Key Error"; reason.code = 403; return false;   // key not found in the headers
}

function getIncomingAPIKey(headers) {
    for (const apiKeyHeaderName of APIKEYS) if (headers[apiKeyHeaderName]) return headers[apiKeyHeaderName];
    return null;
}

module.exports = {checkSecurity, getIncomingAPIKey};