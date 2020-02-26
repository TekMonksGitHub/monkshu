/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Tokens are in JWT format.
 */
const crypto = require("crypto");

let conf;
let activeTokens = {};

function initSync() {
    // Default config if none was specified with 10 minute expiry and 30 min cleanups
    try {conf = require(`${CONSTANTS.TOKENMANCONF}`);} catch (err) {conf = {}}
    conf.expiryTime = conf.expiryTime || 600000; conf.tokenGCInterval = conf.tokenGCInterval || 1800000;
    if (!conf.secret) {LOG.error("Missing SHA-256 secret in API token config. Not secure!!"); conf.secret = "jfkoewu89rufioj9322";}

    setInterval(cleanTokens, conf.tokenGCInterval);   
}

function checkToken(token) {
    const lastAccess = activeTokens[token];
    if (!lastAccess) return false;

    const timeDiff = Date.now() - lastAccess;
    if (timeDiff > conf.expiryTime) return false; else {
        activeTokens[token] = Date.now();   // update last access
        return true;
    }
}

function cleanTokens() {
    for (let token of Object.keys(activeTokens)) if (Date.now() - activeTokens[token] > conf.expiryTime) delete activeTokens[token];
}

function getToken(tokenCreds) {
    const tuples = tokenCreds.split(",");
    const claims = {iss: "Monkshu", iat: Date.now()}; for (const tuple of tuples) {
        const keyVal = tuple.split(":"); 
        if (keyVal.length != 2) {LOG.error(`Bad token credential: ${tuple}, skipping.`); continue;}
        claims[keyVal[0]] = keyVal[1];
    }

    const claimB64 = Buffer.from(JSON.stringify(claims)).toString("base64"); 
    const headerB64 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"} in Base 64 
    const tokenClaimHeader = claimB64+"."+headerB64;

    const sig64 = crypto.createHmac("sha256", conf.secret).update(tokenClaimHeader).digest("hex");

    const token = `${claimB64}.${headerB64}.${sig64}`;
    activeTokens[token] = Date.now();
    return token;
}

module.exports = {checkToken, getToken, initSync};