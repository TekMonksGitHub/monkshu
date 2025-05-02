/**
 * Service worker to support web bundles and their loading. 
 * These classes are loaded before the frontend framework, 
 * so they have no dependencies.
 * 
 * (C) 2024 TekMonks Corp. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const SPECIAL_KEYS = [];
const webbundle_url = new URL(location).searchParams.get("bundle");

let webbundle_response, webbundle_json={}, webbundle_loading_error;

_init();
/** Service worker init */
function _init() {
    console.log("New instance of web bundle service worker started; initializing.");
    _enableCacheWorker();
    _registerRequestHandler();
    console.log("Web bundle service worker initialization complete.");

}

/**
 * Enables the cache worker, this doesn't really cache or serve anything
 * from the cache though. Those require messages - cache, serve, and
 * unserveAllVersionsExcept. To receive files directly form the network
 * cache can be bypassed using the message networkFetch.
 */
function _enableCacheWorker() {
    self.addEventListener("install", _e => self.skipWaiting()); // take over immediately
    self.addEventListener("activate", _e => clients.claim()); // we will handle everything
}

/**
 * Registers the initial event listener for request handling. 
 */
 function _registerRequestHandler() {
    self.addEventListener("fetch", e => e.respondWith(new Promise(async resolve => {
        if (webbundle_url && (!webbundle_loading_error) && (!webbundle_response)) await _loadbundle(webbundle_url);
        
        const urlToTryWithoutHostname = new URL(e.request.url).pathname.replaceAll(/\/+/g, "/");
        if (webbundle_json[urlToTryWithoutHostname]) {  // webbundles are normalized to excluse hostname to handle Monkshu Load Balaced URLs
            const webbundle_urlobject = webbundle_json[urlToTryWithoutHostname];
            const clonedResponse = webbundle_response.clone();
            const response = new Response(webbundle_urlobject.body, {
                status: 200, 
                statusText: webbundle_urlobject.statusText || clonedResponse.statusText, 
                headers: { ...(webbundle_urlobject.noclonedheaders?{}:clonedResponse.headers), 
                    ...(webbundle_urlobject.headers||{}) }
            } );
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
    console.log(`Web bundle service worker loading new bundle from ${url}`);
    const response = await _errorHandeledFetch(url); 
    if (!response.ok) {
        console.error(`Can't load bundle ${url} response not ok, response status is ${response.status}, ${response.statusText}.`);
        webbundle_loading_error = true;
    }
    else {
        webbundle_response = response.clone();
        let loaded_webbundle_json;
        try { loaded_webbundle_json = await response.json(); } catch (err) {
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
