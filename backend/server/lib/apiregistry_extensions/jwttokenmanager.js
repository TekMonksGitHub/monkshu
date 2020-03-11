/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Tokens are in JWT format.
 */
const crypto = require("crypto");
const TOKENMANCONF = CONSTANTS.ROOTDIR+"/conf/apitoken.json";
const utils = require(CONSTANTS.LIBDIR+"/utils.js");

let conf, alreadyInit=false, activeTokens={};

function initSync() {
    if (alreadyInit) return; else alreadyInit = true;

    try {conf = require(TOKENMANCONF);} catch (err) {conf = {}}
    // Default config if none was specified with 10 minute expiry and 30 min cleanups
    conf.expiryTime = conf.expiryTime || 600000; conf.tokenGCInterval = conf.tokenGCInterval || 1800000;

    setInterval(_cleanTokens, conf.tokenGCInterval);   
}

function checkSecurity(apiregentry, _url, _req, headers, _servObject, reason) {
    if (!utils.parseBoolean(apiregentry.query.needsToken)) return true;	// no token needed

    const incomingToken = headers["authorization"];
    const token_splits = incomingToken?incomingToken.split(" "):[];
    if (token_splits.length == 2) return _checkToken(token_splits[1]); 
    else {reason.reason = "JWT Token Error"; reason.code = 403; return false;}	// missing or badly formatted token
}

function _checkToken(token) {
    const lastAccess = activeTokens[token];
    if (!lastAccess) return false;

    const timeDiff = Date.now() - lastAccess;
    if (timeDiff > conf.expiryTime) return false; else {
        activeTokens[token] = Date.now();   // update last access
        return true;
    }
}

function injectResponseHeaders(apiregentry, _url, response, _requestHeaders, responseHeaders, _servObject) {
    if (!apiregentry.query.addsToken || !response.result) return;   // nothing to do

    const tokenCreds = apiregentry.query.addsToken;
    const tuples = tokenCreds.split(",");
    const claims = {iss: "Monkshu", iat: Date.now(), jti: crypto.randomBytes(16).toString("hex")}; 
    for (const tuple of tuples) {
        const keyVal = tuple.split(":"); 
        if (keyVal.length != 2) {LOG.error(`Bad token credential: ${tuple}, skipping.`); continue;}
        claims[keyVal[0]] = keyVal[1];
    }

    const claimB64 = Buffer.from(JSON.stringify(claims)).toString("base64"); 
    const headerB64 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"} in Base 64 
    const tokenClaimHeader = claimB64+"."+headerB64;

    const sig64 = crypto.createHmac("sha256", crypto.randomBytes(32).toString("hex")).update(tokenClaimHeader).digest("hex");

    const token = `${claimB64}.${headerB64}.${sig64}`;
    activeTokens[token] = Date.now();
    
    // inject the JWT token into the response headers
    responseHeaders.access_token = token; responseHeaders.token_type = "bearer";
}

function _cleanTokens() {
    for (let token of Object.keys(activeTokens)) if (Date.now() - activeTokens[token] > conf.expiryTime) delete activeTokens[token];
}

module.exports = {checkSecurity, injectResponseHeaders, initSync};