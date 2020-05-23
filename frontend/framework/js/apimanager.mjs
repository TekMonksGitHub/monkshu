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
 * @param req {object} Javascript/JSON object to send
 * @param sendToken {object|boolean} Optional: {type: "access" or other types}, if set to true then access is assumed
 * @param extractToken {boolean} Optional: true or false to extract incoming tokens as a result of the API call
 * 
 * @return {Object} Javascript result object or null on error
 */
async function rest(url, type, req, sendToken, extractToken) {
    type = type || "GET"; const urlHost = new URL(url).host; 
    const storage = _getAPIManagerStorage();

    let jsonReq;
    if (type.toUpperCase() == "GET" && req) {
        for (const key of Object.keys(req)) jsonReq = jsonReq ? jsonReq+`&${_getKeyValAsURLParam(key, req[key])}`:`${_getKeyValAsURLParam(key, req[key])}`;
        url += `?${jsonReq}`; jsonReq = null;
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
        return respObj;
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
    let retVal; 
    if (Array.isArray(val)) for (const valThis of val) retVal = retVal ? `&${key}=${encodeURIComponent(valThis)}`:`${key}=${encodeURIComponent(valThis)}`;
    else retVal = `${key}=${encodeURIComponent(val)}`;

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
        session.set(APIMANAGER_SESSIONKEY, {tokenManager:{}, keys:{}, keyHeader:"org_monkshu_apikey"}); 
    return session.get(APIMANAGER_SESSIONKEY);
}

function _setAPIManagerStorage(storage) {
    session.set(APIMANAGER_SESSIONKEY, storage);
}

function _modifyAPIManagerStorage(key, value) {
    const storage = _getAPIManagerStorage();
    storage[key] = value;
    session.set(APIMANAGER_SESSIONKEY, storage);
}

export const apimanager = {rest, registerAPIKeys};