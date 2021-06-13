/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Tokens are in JWT format.
 */

const cryptmod = require("crypto");
const utils = require(CONSTANTS.LIBDIR+"/utils.js");
const TOKENMANCONF = CONSTANTS.ROOTDIR+"/conf/apitoken.json";

const _jwttokenListeners = [];
const API_TOKEN_CLUSTERMEM_KEY = "__org_monkshu_jwttokens_key";

let conf, alreadyInit = false;

function initSync() {
    if (alreadyInit) return; else alreadyInit = true;

    // Init tokens in Cluster Memory
    if (!CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY)) CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, {});

    try {conf = require(TOKENMANCONF);} catch (err) {conf = {}}
    // Default config if none was specified with 10 minute expiry and 30 min cleanups
    conf.expiryTime = conf.expiryTime || 600000; conf.tokenGCInterval = conf.tokenGCInterval || 1800000;

    setInterval(_cleanTokens, conf.tokenGCInterval);   
}

function checkSecurity(apiregentry, _url, _req, headers, _servObject, reason) {
    if (!utils.parseBoolean(apiregentry.query.needsToken)) return true;	// no token needed

    const incomingToken = headers["authorization"];
    const token_splits = incomingToken?incomingToken.split(" "):[];
    if (token_splits.length == 2) return checkToken(token_splits[1], reason); 
    else {reason.reason = "JWT Token Error, bad token"; reason.code = 403; return false;}	// missing or badly formatted token
}

function checkToken(token, reason={}) {
    const activeTokens = CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY);
    const lastAccess = activeTokens[token];
    if (!lastAccess) {reason.reason = "JWT Token Error, no last access found"; reason.code = 403; return false;}

    const timeDiff = Date.now() - lastAccess;
    if (timeDiff > conf.expiryTime) {reason.reason = "JWT Token Error, expired"; reason.code = 403; return false;} else {
        activeTokens[token] = Date.now();   // update last access
        CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, activeTokens)  // update tokens across workers
        return true;
    }
}

function injectResponseHeaders(apiregentry, url, response, requestHeaders, responseHeaders, servObject) {
    if (!response?.result) return;   // nothing to do
    else injectResponseHeadersInternal(apiregentry, url, response, requestHeaders, responseHeaders, servObject);
}

function injectResponseHeadersInternal(apiregentry, url, response, requestHeaders, responseHeaders, servObject) {
    if (!apiregentry.query.addsToken) return;   // nothing to do
    const tokenCreds = apiregentry.query.addsToken;
    const tuples = tokenCreds.split(",");
    const claims = {iss: "Monkshu", iat: Date.now(), jti: cryptmod.randomBytes(16).toString("hex")}; 
    for (const tuple of tuples) {
        const keyVal = tuple.split(":"); 
        if (keyVal.length != 2) {LOG.error(`Bad token credential: ${tuple}, skipping.`); continue;}
        claims[keyVal[0]] = keyVal[1];
    }

    const claimB64 = Buffer.from(JSON.stringify(claims)).toString("base64"); 
    const headerB64 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"} in Base 64 
    const tokenClaimHeader = claimB64+"."+headerB64;

    const sig64 = cryptmod.createHmac("sha256", cryptmod.randomBytes(32).toString("hex")).update(tokenClaimHeader).digest("hex");

    const token = `${claimB64}.${headerB64}.${sig64}`;

    const activeTokens = CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY);
    activeTokens[token] = Date.now();
    CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, activeTokens)  // update tokens across workers
    
    // inject the JWT token into the response headers
    responseHeaders.access_token = token; responseHeaders.token_type = "bearer";
    for (const tokenListener of _jwttokenListeners) tokenListener("token_generated", {token, apiregentry, url, response, requestHeaders, responseHeaders, servObject});
}

const addListener = listener => _jwttokenListeners.push(listener);
const removeListener = listener => { if (_jwttokenListeners.indexOf(listener) != -1)
    _jwttokenListeners.splice(_jwttokenListeners.indexOf(listener),1); }

function _cleanTokens() {
    const activeTokens = CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY);
    for (let token of Object.keys(activeTokens)) if (Date.now() - activeTokens[token] > conf.expiryTime) {
        delete activeTokens[token];
        for (const tokenListener of _jwttokenListeners) tokenListener("token_expireed", token);
    }
    CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, activeTokens)  // update tokens across workers
    
}

module.exports = { checkSecurity, injectResponseHeaders, injectResponseHeadersInternal, initSync, checkToken, addListener, removeListener };
