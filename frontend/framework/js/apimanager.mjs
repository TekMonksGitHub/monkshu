/**
 * @module apimanager
 * 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * This is a front-side API manager for Monkshu. It is hard
 * to manage keys and JWT tokens for a frontend without a
 * proper API manager to handle the complexity and security.
 * Frontend API managers are required just as much as backend
 * API managers (forward versus reverse proxy concept for APIs).
 * 
 * Currently supports JWT tokens (or wild JWT type session tokens).
 */

import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import * as pako from "/framework/3p/pako.esm.min.mjs";

const APIMANAGER_SESSIONKEY = "__org_monkshu_APIManager", DEFAULT_TIMEOUT=300000, SSE_EVENT_SOURCES={}, 
    SERVER_SSE_EVENTS_NAME = "_org_monkshu_api_sse_event_";

/**
 * Makes a REST API call.
 * 
 * @param {string|object} urlOrOptions The URL to call or an options object which contains all the parameters
 * @param {string} type  Can we GET, POST, DELETE etc.
 * @param {object} req Javascript/JSON object to send
 * @param {object|boolean} sendToken Optional: {type: "access" or other types}, if set to true then access is assumed
 * @param {boolean} extractToken Optional: true or false to extract incoming tokens as a result of the API call
 * @param {boolean} canUseCache Optional: true or false - if true, API Manager may use cached response if available (dangerous!)
 * @param {boolean} dontGZIP Optional: true or false - if true then the POST data will be sent uncompressed, else it will be sent as GZIPed.
 * @param {boolean} sendErrResp Optional: true or false - if true then on error javascript error object will be returned, else return null.
 * @param {number} timeout Optional: Timeout in millioseconds for the API call. Default is 300 seconds or 300000 milliseconds.
 * @param {object} headers Optional: The custom headers to send
 * @param {boolean} provideHeaders Optional: Response should return response headers as an object 
 * @param {number} retries Optional: Number of retries in case of error, default is 0
 * @param {string} sseURL Optional: Get response via SSE not API call (for long running APIs). 
 *                                  The SSE endpoint URL must be set to this. 
 * 
 * @return {Object} If provideHeaders is true then {response, headers} where response is the Javascript result object 
 *                  or null on error. If it is false then just response, which is the Javascript result object or null.
 */
async function rest(urlOrOptions, type, req, sendToken=false, extractToken=false, canUseCache=false, dontGZIP=false, 
        sendErrResp=false, timeout=DEFAULT_TIMEOUT, headers={}, provideHeaders=false, retries=0, sseURL=false, 
        _retryNumber=0) {

    let url; if (typeof urlOrOptions === "object") {
        url = router.getBalancedURL(urlOrOptions.url); type = urlOrOptions.type; req = urlOrOptions.req; sendToken = urlOrOptions.sendToken||false; 
        extractToken = urlOrOptions.extractToken||false; canUseCache = urlOrOptions.canUseCache||false; 
        dontGZIP = urlOrOptions.dontGZIP||false; sendErrResp = urlOrOptions.sendErrResp||false; 
        timeout = urlOrOptions.timeout||DEFAULT_TIMEOUT; headers = urlOrOptions.headers||{}; 
        provideHeaders = urlOrOptions.provideHeaders||false; retries = urlOrOptions.retries||0;
        sseURL = urlOrOptions.sseURL;
    } else url = router.getBalancedURL(urlOrOptions);

    if (canUseCache) {
        const storage = _getAPIManagerStorage(), apiResponseCacheKey = url.toString()+type+JSON.stringify(req)+sendToken+extractToken;
        if (storage.apiResponseCache[apiResponseCacheKey]) return storage.apiResponseCache[apiResponseCacheKey]; // send cached response if acceptable and available
    }
    
    try {
        const {fetchInit, url: urlToCall} = _createFetchInit(url, type, req, sendToken, "application/json", dontGZIP, timeout, headers), 
            response = await fetch(urlToCall, fetchInit);
        if (response.ok) {
            const respObj = await response.json();
            if (extractToken) _extractTokens(response, respObj);
            if (canUseCache) storage.apiResponseCache[apiResponseCacheKey] = respObj; // cache response if allowed
            if (!sseURL) return provideHeaders?{response: respObj, headers: _getFetchResponseHeadersAsObject(response)}:respObj;
            else return new Promise(resolve => _waitForSSEResponse({url: sseURL, params: {}, sendtoken: sendToken}, 
                respObj.requestid, resolve));
        } else {
            $$.LOG.error(`Error in fetching ${url} for request ${JSON.stringify(req)} of type ${type} due to ${response.status}: ${response.statusText}`);

            if (retries && _retryNumber < retries) {
                $$.LOG.info(`Retrying API at ${url}, retry number ${_retryNumber+1} of ${retries}.`); 
                return await rest(urlOrOptions, type, req, sendToken, extractToken, 
                    canUseCache, dontGZIP, sendErrResp, timeout, headers, provideHeaders, retries, sseResponse, _retryNumber+1);
            }
            
            const errResp = {respErr: {status: response.status, statusText: response.statusText}};
            return sendErrResp ? (provideHeaders?{response: errResp, headers: _getFetchResponseHeadersAsObject(response)}:errResp) : null; // sending error response
        }
    } catch (err) {
        $$.LOG.error(`Error in fetching ${url} for request ${JSON.stringify(req)} of type ${type} due to ${err}`);
        if (retries && _retryNumber < retries) {
            $$.LOG.info(`Retrying API at ${url}, retry number ${_retryNumber+1} of ${retries}.`); 
            return await rest(urlOrOptions, type, req, sendToken, extractToken, 
                canUseCache, dontGZIP, sendErrResp, timeout, headers, provideHeaders, retries, _retryNumber+1);
        }
        const errResp = {respErr: {status: 400, statusText: err.toString()}};   // client error, default to 400 code
        return sendErrResp ? errResp : null;
    }
}

/**
 * Makes a BLOB API call, i.e. download a binary object.
 * 
 * @param {string|object} urlOrOptions The URL to call or an options object which contains all the parameters
 * @param {string} filename The downloaded file's name.
 * @param {string} type  Can we GET, POST, DELETE etc.
 * @param {object} req Javascript/JSON object to send.
 * @param {object|boolean} sendToken Optional: {type: "access" or other types}, if set to true then access is assumed.
 * @param {boolean} extractToken Optional: true or false to extract incoming tokens as a result of the API call.
 * @param {boolean} dontGZIP Optional: true or false - if true then the POST data will be sent uncompressed, else it will be sent as GZIPed.
 * @param {number} timeout Optional: Timeout in millioseconds for the API call. Default is 300 seconds or 300000 milliseconds.
 * @param {object} headers Optional: The custom headers to send
 * @param {number} retries Optional: Number of retries in case of error, default is 0
 * 
 * @return {Object} Downloads the BLOB
 */
async function blob(urlOrOptions, filename, type, req, sendToken=false, extractToken=false, dontGZIP=false, 
        timeout=DEFAULT_TIMEOUT, headers={}, retries=0, _retryNumber=0) {

    let url; if (typeof urlOrOptions === "object") {
        url = router.getBalancedURL(urlOrOptions.url); filename = urlOrOptions.filename; type = urlOrOptions.type; req = urlOrOptions.req; 
        sendToken = urlOrOptions.sendToken||false; extractToken = urlOrOptions.extractToken||false; 
        dontGZIP = urlOrOptions.dontGZIP||false; timeout = urlOrOptions.timeout||DEFAULT_TIMEOUT; 
        headers = urlOrOptions.headers||{}; retries = urlOrOptions.retries||0;
    } else url = router.getBalancedURL(urlOrOptions);

    const {fetchInit, url: urlToCall} = _createFetchInit(url, type, req, sendToken, "*/*", dontGZIP, timeout, headers);

    try {
        const response = await fetch(urlToCall, fetchInit);
        if (response.ok) {
            if (extractToken) _extractTokens(response);
            const respBlob = await response.blob();
            const url = window.URL.createObjectURL(respBlob), link = document.createElement("a");
            link.style.display = "none"; link.href = url; link.download = filename;
            document.body.appendChild(link); link.click(); link.remove();  
            return true;
        } else {
            $$.LOG.error(`Error in fetching ${url} for request ${JSON.stringify(req)} of type ${type} due to ${response.status}: ${response.statusText}`);
            if (retries && _retryNumber < retries) {
                $$.LOG.info(`Retrying API at ${url}, retry number ${_retryNumber+1} of ${retries}.`); 
                return await blob(urlOrOptions, filename, type, req, sendToken, extractToken, dontGZIP, timeout, 
                    headers, retries, _retryNumber+1);
            }
            return false;
        }
    } catch (err) {
        $$.LOG.error(`Error in blob'ing ${url} for request ${JSON.stringify(req)} of type ${type} and filename ${filename} due to ${err}`);
        if (retries && _retryNumber < retries) {
            $$.LOG.info(`Retrying API at ${url}, retry number ${_retryNumber+1} of ${retries}.`); 
            return await blob(urlOrOptions, filename, type, req, sendToken, extractToken, dontGZIP, timeout, headers, 
                retries, _retryNumber+1);
        }
        return false;
    }
}

/**
 * Subscribes to SSE events. Will automatically send keys and JWT tokens (if selected) as URL params.
 * @param {string|object} urlOrOptions The URL to call or an options object which contains all the parameters
 * @param {object} params Additional URL params (like request object for JSON APIs). Only used to establish the connection.
 * @param {object|boolean} sendToken Optional: {type: "access" or other types}, if set to true then access is assumed
 * @returns {object} The associated EventSource object
 */
function subscribeSSEEvents(urlOrOptions, params={}, sendToken=false) {
    let rewrittenURL; if (typeof urlOrOptions === "object") {
        rewrittenURL = router.getBalancedURL(urlOrOptions.url); params = urlOrOptions.params||{}; 
        sendToken = urlOrOptions.sendToken||false; 
    } else rewrittenURL = router.getBalancedURL(urlOrOptions);

    const urlSSE = new URL(rewrittenURL); 
    for (const [key, value] of Object.entries(params)) urlSSE.searchParams.append(key, value);
    const apiKey = getAPIKeyFor(rewrittenURL), storage = _getAPIManagerStorage();
    if (apiKey) urlSSE.searchParams.append(storage.keyHeader, apiKey);
    if (sendToken) {
        const token = getJWTToken(rewrittenURL, sendToken==true?"access":sendToken)||"undefined";
        urlSSE.searchParams.append("Authorization", `Bearer ${token}`);
    }

    const originalURL = new URL(urlOrOptions.url||urlOrOptions);
    if (!SSE_EVENT_SOURCES[originalURL.href]) { // create listner only if really a new one is needed
        const eventsource = new EventSource(urlSSE.href)
        eventsource.onerror = _ => $$.LOG.error(`Error in EventSource with URL ${originalURL}`);
        eventsource.onopen = _ => $$.LOG.debug(`EventSource source open ${originalURL}`);
        SSE_EVENT_SOURCES[originalURL.href] = eventsource;
    }
    return SSE_EVENT_SOURCES[originalURL.href];
}

/**
 * Unsubscribes to SSE events and closes the listener.
 * @param {string} url The URL to close
 */
function unsubscribeSSEEvents(url) {
    const originalURL = new URL(url);
    if (!SSE_EVENT_SOURCES[originalURL.href]) return;
    else {SSE_EVENT_SOURCES[originalURL.href].close(); delete SSE_EVENT_SOURCES[originalURL.href];}
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

/** 
 * Adds JWT token (if present) for the given URL and response headers and incoming JSON response 
 * @param {string} url The URL from which we got the token
 * @param {Object} headers The HTTP response headers in {key: value} format
 * @param {Object} jsonResponseObj The JSON response from the API
 * */
const addJWTToken = (url, headers, jsonResponseObj) => {
    const httpResponseCompatibleHeaders = []; for (const [key, value] of Object.entries(headers)) httpResponseCompatibleHeaders.push([key, value]);
    _extractTokens({url, headers: httpResponseCompatibleHeaders}, jsonResponseObj); 
}

/**
 * Returns the API key for the given URL if setup
 * @param {string} url The URL for which we need the key
 * @returns The API key for the given URL if setup
 */
const getAPIKeyFor = url => { const storage = _getAPIManagerStorage(); return storage.keys[url] || storage.keys["*"]; }

function _waitForSSEResponse(sseURL, requestidToWatch, resolver) {
    const sseURLReal = typeof sseURL == "string" ? sseURL : sseURL.url,
        sseURLParams = typeof sseURL == "string" ? {} : sseURL.params,
        sseURLSendToken = typeof sseURL == "string" ? false : sseURL.sendtoken;

    const eventSource = subscribeSSEEvents(sseURLReal, sseURLParams, sseURLSendToken);

    const listener = event => { // server API events
        try {
            const {requestid, response} = JSON.parse(event.data);
            if (requestid == requestidToWatch) {
                resolver(response); 
                eventSource.removeEventListener(SERVER_SSE_EVENTS_NAME, listener);
            }
        } catch (err) {$$.LOG.error(`Error parsing server event type ${event.type} from ${event.currentTarget.url}, skipping this SSE update.`);}
    }
    eventSource.addEventListener(SERVER_SSE_EVENTS_NAME, listener);
}

function _createFetchInit(url, type, req, sendToken, acceptHeader, dontGZIPPostBody, timeout, additional_headers) {
    type = type || "GET"; const urlHost = new URL(url).host; 
    const storage = _getAPIManagerStorage();

    let jsonReq;
    if (type.toUpperCase() == "GET" && req) {
        for (const key of Object.keys(req)) jsonReq = jsonReq ? jsonReq+`&${_getKeyValAsURLParam(key, req[key])}`:_getKeyValAsURLParam(key, req[key]);
        if (jsonReq) {url += `?${jsonReq}`; jsonReq = null;}
    } else jsonReq = req && typeof (req) == "object" ? JSON.stringify(req) : req;

    const headers = {"Accept":acceptHeader||"application/json", 
        "Content-Encoding":(!dontGZIPPostBody)&&req?"gzip":"identity", ...additional_headers};
    if (type.toUpperCase() != "GET" && type.toUpperCase() != "DELETE") headers["Content-type"] = "application/json";
    if (sendToken) headers.Authorization = `Bearer ${storage.tokenManager[`${urlHost}_${sendToken.type?sendToken.type:"access"}`]}`;
    if (storage.keys[url] || storage.keys["*"]) headers[storage.keyHeader] = storage.keys[url] ? storage.keys[url] : storage.keys["*"];

    const fetchInit = {method: type, credentials: "omit", headers, redirect: "follow", 
        referrerPolicy: "origin", timeout};
    if (jsonReq) fetchInit.body = dontGZIPPostBody ? jsonReq : pako.gzip(jsonReq); return {fetchInit, url};
}

function _extractTokens(response, jsonResponseObj) {
    const urlHost = new URL(response.url).host, headersBack = _getFetchResponseHeadersAsObject(response); 
    if (jsonResponseObj && jsonResponseObj.access_token && jsonResponseObj.token_type == "bearer") 
        _extractAddToken(jsonResponseObj.access_token, urlHost);
    else if (headersBack.access_token && headersBack.token_type == "bearer") 
        _extractAddToken(headersBack.access_token, urlHost);
    else if (headersBack.authorization && headersBack.authorization.toLowerCase().startsWith("bearer "))
        _extractAddToken(headersBack.headersBack.authorization.substring(7).trim(), urlHost);
}

function _getFetchResponseHeadersAsObject(response) {
    const headersBack = {}; 
    for (const headerBack of response.headers) headersBack[headerBack[0].toLowerCase()] = headerBack[1];
    return headersBack;
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

export const apimanager = {rest, blob, registerAPIKeys, getJWTToken, addJWTToken, getAPIKeyFor, subscribeSSEEvents, unsubscribeSSEEvents};