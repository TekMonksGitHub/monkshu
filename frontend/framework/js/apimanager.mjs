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
    const storage = _getAPIManagerStorage(), apiResponseCacheKey = url.toString()+type+JSON.stringify(req)+sendToken+extractToken;
    if (canUseCache && storage.apiResponseCache[apiResponseCacheKey]) return storage.apiResponseCache[apiResponseCacheKey]; // send cached response if acceptable and available

    try {
        const {fetchInit, url: urlToCall} = _createFetchInit(url, type, req, sendToken), response = await fetch(urlToCall, fetchInit);
        if (response.ok) {
            const respObj = await response.json();
            if (extractToken) _extractTokens(response, respObj);
            if (canUseCache) storage.apiResponseCache[apiResponseCacheKey] = respObj; // cache response if allowed
            return respObj;   
        } else return null;
    } catch (err) {
        LOG.error(`Error in fetching ${url} for request ${JSON.stringify(req)} of type ${type} due to ${err}`);
        return null;
    }
}

/**
 * Makes a BLOB API call, i.e. download a binary object.
 * 
 * @param {string} url The URL to call
 * @param {string} filename The downloaded file's name
 * @param {string} type  Can we GET, POST, DELETE etc.
 * @param {object} req Javascript/JSON object to send
 * @param {object|boolean} sendToken Optional: {type: "access" or other types}, if set to true then access is assumed
 * @param {boolean} extractToken Optional: true or false to extract incoming tokens as a result of the API call
 * 
 * @return {Object} Downloads the BLOB
 */
async function blob(url, filename, type, req, sendToken, extractToken) {
    const {fetchInit, url: urlToCall} = _createFetchInit(url, type, req, sendToken, "*/*");

    try {
        const response = await fetch(urlToCall, fetchInit);
        if (response.ok) {
            if (extractToken) _extractTokens(response);
            const respBlob = await response.blob();
            const url = window.URL.createObjectURL(respBlob), link = document.createElement("a");
            link.style.display = "none"; link.href = url; link.download = filename;
            document.body.appendChild(link); link.click(); link.remove();  
            return true;
        } else return false;
    } catch (err) {
        LOG.error(`Error in blob'ing ${url} for request ${JSON.stringify(req)} of type ${type} and filename ${filename} due to ${err}`);
        return false;
    }
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

/**
 * Returns JWT token for the given URL and token subject.
 * @param {string} url The URL for which we need the token
 * @param {string} tokenType The token type, access is assumed if not provided
 */
const getJWTToken = (url, tokenType) => _getAPIManagerStorage().tokenManager[`${new URL(url).host}_${tokenType?tokenType:"access"}`];

function _createFetchInit(url, type, req, sendToken, acceptHeader) {
    type = type || "GET"; const urlHost = new URL(url).host; 
    const storage = _getAPIManagerStorage();

    let jsonReq;
    if (type.toUpperCase() == "GET" && req) {
        for (const key of Object.keys(req)) jsonReq = jsonReq ? jsonReq+`&${_getKeyValAsURLParam(key, req[key])}`:_getKeyValAsURLParam(key, req[key]);
        if (jsonReq) {url += `?${jsonReq}`; jsonReq = null;}
    } else jsonReq = req && typeof (req) == "object" ? JSON.stringify(req) : req;

    const headers = {"Accept":acceptHeader||"application/json"}; 
    if (type.toUpperCase() != "GET" && type.toUpperCase() != "DELETE") headers["Content-type"] = "application/json";
    if (sendToken) headers.Authorization = `Bearer ${storage.tokenManager[`${urlHost}_${sendToken.type?sendToken.type:"access"}`]}`;
    if (storage.keys[url] || storage.keys["*"]) headers[storage.keyHeader] = storage.keys[url] ? storage.keys[url] : storage.keys["*"];

    const fetchInit = {method: type, credentials: "omit", headers, redirect: "follow", referrerPolicy: "origin"};
    if (jsonReq) fetchInit.body =  jsonReq; return {fetchInit, url};
}

function _extractTokens(response, jsonResponseObj) {
    const urlHost = new URL(response.url).host, headersBack = {}; 
    for (const headerBack of response.headers) headersBack[headerBack[0]] = headerBack[1];
    if (jsonResponseObj && jsonResponseObj.access_token) _extractAddToken(jsonResponseObj.access_token, urlHost);
    else if (headersBack.access_token) _extractAddToken(headersBack.access_token, urlHost);
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

export const apimanager = {rest, blob, registerAPIKeys, getJWTToken};