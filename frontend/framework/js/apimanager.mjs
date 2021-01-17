/**
 * @module apimanager
 * 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 * 
 * This is a front-side API manager for Monkshu. It is hard
 * to manage keys and JWT tokens for a frontend without a
 * proper API manager to handle the complexity and security.
 * Frontend API managers are required just as much as backend
 * API managers (forward versus reverse proxy concept for APIs).
 * 
 * Currently supports JWT tokens (or wild JWT type session tokens).
 */

import {session} from "/framework/js/session.mjs";

const APIMANAGER_SESSIONKEY = "__org_monkshu_APIManager";

/**
 * Makes a REST API call.
 * 
 * @param {string} url The URL to call
 * @param {string} type  Can we GET, POST, DELETE etc.
 * @param {object} req Javascript/JSON object to send
 * @param {object|boolean} sendToken Optional: {type: "access" or other types}, if set to true then access is assumed
 * @param {boolean} extractToken Optional: true or false to extract incoming tokens as a result of the API call
 * @param {boolean} canUseCache Optional: true or false - if true, API Manager may use cached response if available (dangerous!)
 * 
 * @return {Object} Javascript result object or null on error
 */
async function rest(url, type, req, sendToken, extractToken, canUseCache) {
    type = type || "GET"; const urlHost = new URL(url).host; 
    const storage = _getAPIManagerStorage();

    const apiResponseCacheKey = url.toString()+type+JSON.stringify(req)+sendToken+extractToken;
    if (canUseCache && storage.apiResponseCache[apiResponseCacheKey]) return storage.apiResponseCache[apiResponseCacheKey]; // send cached response if acceptable and available

    let jsonReq;
    if (type.toUpperCase() == "GET" && req) {
        for (const key of Object.keys(req)) jsonReq = jsonReq ? jsonReq+`&${_getKeyValAsURLParam(key, req[key])}`:`${_getKeyValAsURLParam(key, req[key])}`;
        if (jsonReq) {url += `?${jsonReq}`; jsonReq = null;}
    } else jsonReq = typeof (req) == "object" ? JSON.stringify(req) : req;

    const headers = {"Accept":"application/json"}; if (type.toUpperCase() != "GET" && type.toUpperCase() != "DELETE") headers["Content-type"] = "application/json";
    if (sendToken) headers.Authorization = `Bearer ${storage.tokenManager[`${urlHost}_${sendToken.type?sendToken.type:"access"}`]}`;
    if (storage.keys[url] || storage.keys["*"]) 
        headers[storage.keyHeader] = storage.keys[url] ? storage.keys[url] : storage.keys["*"];

    const fetchInit = { method: type, credentials: "omit",    // we will send token if needed
        headers, redirect: "follow", referrerPolicy: "origin"};
    if (jsonReq) fetchInit.body =  jsonReq;
    const response = await fetch(url, fetchInit);
    if (response.ok) {
        const respObj = await response.json();
        const headersBack = {}; for (const headerBack of response.headers) headersBack[headerBack[0]] = headerBack[1];
        if (extractToken && respObj.access_token) _extractAddToken(respObj.access_token, urlHost);
        else if (extractToken && headersBack.access_token) _extractAddToken(headersBack.access_token, urlHost);
        
        if (canUseCache) storage.apiResponseCache[apiResponseCacheKey] = respObj; return respObj;   // cache response if allowed and return
    } else return null;
}

/**
 * Register keys to send for various APIs.
 * @param {object} apikeys Of format {"url":"key"} or {"*":"key"}. * matches all URLs.
 * @param {string} apiKeyHeaderName The name of the HTTP header to use to send the key. 
 */
function registerAPIKeys(apikeys, apiKeyHeaderName) {
    _modifyAPIManagerStorage("keys", apikeys);
    if (apiKeyHeaderName) _modifyAPIManagerStorage("keyHeader", apiKeyHeaderName);
}

function _getKeyValAsURLParam(key, val) {
    const encodeValue = val => (typeof val === 'string' || val instanceof String)?encodeURIComponent(val):encodeURIComponent(JSON.stringify(val));

    let retVal; 
    if (Array.isArray(val)) for (const valThis of val) retVal = retVal ? `&${key}=${encodeValue(valThis)}`:`${key}=${encodeValue(valThis)}`;
    else retVal = `${key}=${encodeValue(val)}`;

    return retVal;
}

function _extractAddToken(token, host) {
    let sub = "access"; // default is an access token

    const tokenSplits = token.split(".");   // try to parse as JWT to get the subject, if possible
    if (tokenSplits.length == 3) {  
        try {
            const claims = JSON.parse(btoa(tokenSplits[1]));
            if (claims.sub) sub = claims.sub;
        } catch (err) {}
    }

    const storage = _getAPIManagerStorage(); storage.tokenManager[`${host}_${sub}`] = token; _setAPIManagerStorage(storage);
}

function _getAPIManagerStorage() {
    if (!session.get(APIMANAGER_SESSIONKEY)) 
        session.set(APIMANAGER_SESSIONKEY, {tokenManager:{}, keys:{}, keyHeader:"org_monkshu_apikey", apiResponseCache: {}}); 
    return session.get(APIMANAGER_SESSIONKEY);
}

function _setAPIManagerStorage(storage) {
    session.set(APIMANAGER_SESSIONKEY, storage);
}

function _modifyAPIManagerStorage(key, value) {
    const storage = _getAPIManagerStorage();
    storage[key] = value;
}

export const apimanager = {rest, registerAPIKeys};