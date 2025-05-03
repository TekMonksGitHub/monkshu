/**
 * Service worker to support web bundles and their loading. 
 * These classes are loaded before the frontend framework, 
 * so they have no dependencies.
 * 
 * (C) 2024 TekMonks Corp. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const SPECIAL_KEYS = [];
const urlLocation = new URL(location);
const appname = urlLocation.searchParams.get("app");
const webbundle_url = urlLocation.searchParams.get("bundle");
const stale_check_function = urlLocation.searchParams.get("stalecheck");

let webbundle_json={}, webbundle_loading_error;

_init();
/** Service worker init */
function _init() {
    console.log("New instance of web bundle service worker started; initializing.");
    _enableWebbundleWorker();
    _registerRequestHandler();
    console.log("Web bundle service worker initialization complete.");

}

/**
 * Enables the cache worker, this doesn't really cache or serve anything
 * from the cache though. Those require messages - cache, serve, and
 * unserveAllVersionsExcept. To receive files directly form the network
 * cache can be bypassed using the message networkFetch.
 */
function _enableWebbundleWorker() {
    self.addEventListener("install", _e => self.skipWaiting()); // take over immediately
    self.addEventListener("activate", _e => clients.claim()); // we will handle everything
}

/**
 * Registers the initial event listener for request handling. 
 */
 function _registerRequestHandler() {
    self.addEventListener("fetch", e => e.respondWith(new Promise(async resolve => {
        if (webbundle_url && (!webbundle_loading_error) && (Object.keys(webbundle_json).length==0)) await _loadbundle(webbundle_url);
        
        const urlToTryWithoutHostname = new URL(e.request.url).pathname.replaceAll(/\/+/g, "/");
        if (webbundle_json[urlToTryWithoutHostname]) {  // webbundles are normalized to excluse hostname to handle Monkshu Load Balaced URLs
            const webbundle_urlobject = webbundle_json[urlToTryWithoutHostname];
            const response = new Response(webbundle_urlobject.body, {
                status: 200, 
                statusText: webbundle_urlobject.statusText , 
                headers: webbundle_urlobject.headers||{}
            });
            resolve(response);
        }
        else {
            console.warn(`Cache miss at web bundle service worker for request ${e.request.url}`);
            resolve(await _errorHandeledFetch(e.request));    // not cached in the bundle
        }
    })));
}

/**
 * Starts caching the bundle via a network fetch.
 * @param {string} url The bundle URL
 */
async function _loadbundle(url) {
    const webbundle_response = await _refreshOrLoadCachedWebBundleResponse(url);
    if (!webbundle_response) {
        console.error(`Web bundle load failed for ${url}`);
        return;    // we can't load the bundle from the server
    }

    let loaded_webbundle_json;
    try { loaded_webbundle_json = await webbundle_response.json(); } catch (err) {
        console.error(`Bad web bundle JSON - ${err.toString()}`);
        webbundle_loading_error = true;
        return;
    }
    for (const [urlKey, responseObject] of Object.entries(loaded_webbundle_json)) {
        if (SPECIAL_KEYS.includes(urlKey)) continue;
        const resolvedURLPath = new URL(urlKey, webbundle_url).pathname.replaceAll(/\/+/g, "/");
        webbundle_json[resolvedURLPath] = responseObject; // normalize URLs for searching later
    }
    webbundle_loading_error = false;
    console.log(`Web bundle service worker bundle loaded ${url}`); 
}

/**
 * Refreshes and loads the web bundle response via cache or 
 * loads the web bundle response object from the server and 
 * caches it. Uses ETags to figure out what to do for refreshes.
 * 
 * @param {string} bundleurl The webbundle URL
 * 
 * @returns In case of errors webbundle_response will not be set (will be null)
 */
async function _refreshOrLoadCachedWebBundleResponse(bundleurl) {
    const cache = await caches.open(appname);
    let webbundle_response_internal = (await cache.match(bundleurl))?.clone(); 

    if (webbundle_response_internal) {   // check if we need to refresh the webbundle
        const testResponse = await _errorHandeledFetch(new Request(bundleurl, {method: "HEAD"}));
        const responseLastModified = _getHeaders(testResponse)["x-last-modified-epoch"], cachedLastModified = _getHeaders(webbundle_response_internal)["x-last-modified-epoch"];
        const staleCheckFunction =  stale_check_function ? _createSyncFunction(stale_check_function) : undefined;
        const needToRefresh = testResponse.ok ? (staleCheckFunction ? 
            staleCheckFunction({server_last_modified: responseLastModified, cached_last_modified: cachedLastModified}) : 
            responseLastModified != cachedLastModified) : false;
        if (!needToRefresh) {console.log(`Web bundle service worker loaded web bundle from cache.`); return webbundle_response_internal;}
        else console.log(`Web bundle refresh needed due to modified TS = ${responseLastModified} and cached TS = ${cachedLastModified}.`);
    } else console.log(`Web bundle not in cache, loading new.`);

    console.log(`Web bundle service worker loading a new bundle from ${bundleurl} for app ${appname}.`);
    const response = await _errorHandeledFetch(new Request(bundleurl, {method: "GET"})); 
    if (!response.ok) {
        console.error(`Can't load bundle ${bundleurl} response not ok, response status is ${response.status}, ${response.statusText}.`);
        webbundle_loading_error = true;
        return;
    }
    webbundle_response_internal = response.clone(); cache.put(bundleurl, response);
    return webbundle_response_internal;
}

/**
 * Fetch and return offline errors as empty response with 500, offline error.
 * @param request The request to fetch
 * @returns The response (promise) or a Response object with 500, offline error.
 */
async function _errorHandeledFetch(request){
    try { return await fetch(request); } catch (err) {
        return new Response("", { "status" : 500 , "statusText" : `Fetch error: ${err.toString()}` });
    }
}

/**
 * Returns headers from the response as a simple object with keys lowered cased.
 * @param {Object} response The HTTP response object
 * @returns The headers from the response as a simple object with keys lowered cased.
 */
function _getHeaders(response) {
    if ((!response) || (!response.headers)) return {};
    const allHeaders = {...response.headers}; for (const [key, value] of response.headers) allHeaders[key.toLowerCase()] = value;
    return allHeaders;
}

/**
 * Creates a function which executes the given code synchronously.
 * To call the function call the created function with the 
 * context. For example, 
 * const myfunction = util.createSyncFunction(code);
 * await myfunction({key: value, key2: value2})
 * @param {string} code The code to execute
 * @returns Sync function which executes the given code when called.
 */
function _createSyncFunction(code) {
    const retFunction = Object.getPrototypeOf(function(){}).constructor;
    const newFunction = context => new retFunction(Object.keys(context||{}).join(","), code)(...Object.values(context||{}));
    return newFunction;
}