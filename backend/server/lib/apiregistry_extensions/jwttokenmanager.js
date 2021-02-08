/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Tokens are in JWT format.
 */

const cryptmod = require("crypto");
const TOKENMANCONF = CONSTANTS.ROOTDIR+"/conf/apitoken.json";
const utils = require(CONSTANTS.LIBDIR+"/utils.js");
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
    if (token_splits.length == 2) return _checkToken(token_splits[1]); 
    else {reason.reason = "JWT Token Error"; reason.code = 403; return false;}	// missing or badly formatted token
}

function _checkToken(token) {
    const activeTokens = CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY);
    const lastAccess = activeTokens[token];
    if (!lastAccess) return false;

    const timeDiff = Date.now() - lastAccess;
    if (timeDiff > conf.expiryTime) return false; else {
        activeTokens[token] = Date.now();   // update last access
        CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, activeTokens)  // update tokens across workers
        return true;
    }
}

function injectResponseHeaders(apiregentry, _url, response, _requestHeaders, responseHeaders, _servObject) {
    if (!apiregentry.query.addsToken || !response.result) return;   // nothing to do

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
}

function _cleanTokens() {
    const activeTokens = CLUSTER_MEMORY.get(API_TOKEN_CLUSTERMEM_KEY);
    for (let token of Object.keys(activeTokens)) if (Date.now() - activeTokens[token] > conf.expiryTime) delete activeTokens[token];
    CLUSTER_MEMORY.set(API_TOKEN_CLUSTERMEM_KEY, activeTokens)  // update tokens across workers
}

module.exports = { checkSecurity, injectResponseHeaders, initSync };
