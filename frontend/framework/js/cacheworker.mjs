/**
 * Service worker to support offline PWA webapps.
 * This service worker is specifically coded for Monkshu, in that
 * it strips out URL queries and parameters for caching. 
 * 
 * Will automatically support versioning, if version is supplied. 
 * Versioning strategy - reload entire version, then switch the cache
 * to the new version - so we never have mismatched files. 
 * 
 * Cache switch will only happen on page refresh or new tab. This is
 * because when new version is detected, the cache is immediately disabled
 * (resulting in the latest code from the server) and cache takes over once
 * it is rehydrated with the latest code. So page refresh or a new tab will
 * always serve new code, but running app will stay on the old code base. 
 * 
 * There is a use case where this can have issues - user opens two tabs, and
 * one tab is on the old app, the new one sees a new version and changes the
 * cache, now when the first tab performs a web link or refresh, the app version
 * will suddenly switch. This may cause a broken app to the user. But the alternative
 * of keeping old app doesn't help much either, as then the backend APIs will also
 * need to be retained - and we have no idea how many generations to keep. So it
 * is assumed it is better to just switch. 
 * 
 * (C) TekMonks Corp. 
 * License: See enclosed LICENSE file.
 */
import {LOG} from "/framework/js/log.mjs";
import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

const _getCacheSignature = (appName, version) => "__org_monkshu__app_cache"+appName+version, DEFAULT_VERSION = 0.0,
    END_OF_CACHE_MARKER = import.meta.url;

let _cacheReady = {}, requestHandlers = [];

/**
 * Enables the cache worker
 */
function _enableCacheWorker() {
    const _cacheFunction = async (appName, listOfFilesToCache, version=DEFAULT_VERSION) => {
        const cacheSig = _getCacheSignature(appName, version), cache = await caches.open(cacheSig); 
        if ((await cache.keys()).length && (await cache.match(END_OF_CACHE_MARKER))) {_cacheReady[cacheSig] = true; return;} // already cached and at right version

        const fetchRequests = {};
        for (const file of listOfFilesToCache) {
            const response = await fetch(file); fetchRequests[file] = response;
            if (!response.ok) LOG.error(`Can't cache ${file}, for app ${appName} response not ok, response status is ${response.status}, ${response.statusText}.`);
        }
        
        // switch to the latest cache, the end of cache marker goes in the end
        for (const oldCache of await cache.keys()) {
            await cache.delete(oldCache);    // remove old caches
            LOG.debug(`Purged old cache of app ${appName} at version ${oldCache}.`);
        }; 
        for (const key in fetchRequests) if (key != END_OF_CACHE_MARKER) await cache.put(key, fetchRequests[key]); 
        await cache.put(END_OF_CACHE_MARKER, fetchRequests[END_OF_CACHE_MARKER]||fetch(END_OF_CACHE_MARKER)); _cacheReady[cacheSig] = true;

        LOG.debug(`Service worker caching completed for ${appName}, version ${version}`); 
    }

    self.addEventListener("install", e => {
        e.waitUntil(self.skipWaiting()); // take over immediately
    });   
    
    self.addEventListener("activate", e => {
        e.waitUntil(clients.claim())    // we will handle everything
    });   

    self.addEventListener("message", e => {
        const message = e.data; if (message.id != MONKSHU_CONSTANTS.CACHEWORKER_MSG) return;    // not for us        
        if (message.op == "cache") _cacheFunction(message.appName, message.listOfFilesToCache, message.version);
        if (message.op == "serve") requestHandlers.push(new RequestHandler(message.appName, message.version));
        if (message.op == "networkFetch") _handleNetworkFetch(e, message.url, message.requestID);
    });
}

/**
 * Handles network fetch requests
 */
async function _handleNetworkFetch(e, url, requestID) {
    const client = await clients.get(e.clientId);
    try { client.postMessage({id: MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "networkFetchResponse", url, requestID, response: await fetch(url)}); }
    catch (err) { client.postMessage({id: MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "networkFetchResponse", url, requestID, err}); }
}

/**
 * Registers the initial event listener for request handling. 
 */
function _registerRequestHandler() {
    self.addEventListener("fetch", e => e.respondWith(new Promise(async resolve => {
        if (requestHandlers.length) for (const requestHandler of requestHandlers) if (await requestHandler.canHandle(e)) {
            resolve(await requestHandler.handle(e)); 
            return; 
        }

        LOG.debug(`Cache miss for request ${e.request.url}.`);
        resolve(await fetch(e.request));    // no request handler responded that they can handle this, go to the network
    })));
}

/** Service worker init */
function _init() {
    _enableCacheWorker();
    _registerRequestHandler();
}
_init();

/** Private Classes */
class RequestHandler {
    constructor(appName, version) {
        this.appName = appName; 
        this.version = version;
    }

    /**
     * Checks if this request handler can handle this request, must be called and 
     * should return true before calling handleRequest.
     * @param e The incoming request event
     * @returns true if this handler can handle this request, else false
     */
    async canHandle(e) {
        if (!_cacheReady[_getCacheSignature(this.appName, this.version)]) {
            LOG.debug(`Cache not ready for app ${this.appName}, version ${this.version}, refusing to handle request ${e.request.url}.`)
            return false;
        }

        const cache = await caches.open(_getCacheSignature(this.appName, this.version));
        if (await cache.match(this.#justURL(e.request.url))) return true;
        else return false;
    }

    /**
     * Handles the given request. Only should be called if canHandle returned true.
     * @param e The incoming request event.
     */
    async handle(e) {
        const cache = await caches.open(_getCacheSignature(this.appName, this.version));
        const cacheKey = this.#justURL(e.request.url); // monkshu assets don't change based on query params
        const response = await cache.match(this.#justURL(cacheKey));
        if (!response) LOG.debug(`Cache miss for app ${this.appName}, version ${this.version} and request ${e.request.url}.`);
        return response || await fetch(e.request);    // we won't add to cache, APIs are dynamic for example
    }

    #justURL = url => url.replace(/([^:]\/)\/+/g, "$1").split("?")[0].split("#")[0];
}