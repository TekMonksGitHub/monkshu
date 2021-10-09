/**
 * Service worker to support offline PWA webapps.
 * This service worker is specifically coded for Monkshu, in that
 * it strips out URL queries and parameters for caching. 
 * 
 * Will automatically support versioning, and version lifecycles.
 * 
 * There is a use case where this can have issues - user opens two tabs, and
 * one tab is on the old app, the new one sees a new version and the user agrees to
 * upgrade, now when the first tab performs a web link or refresh, the app version
 * will suddenly switch. This may cause a broken app to the user. 
 * 
 * There is a special URL reserved phrase - __org_monkshu_router_networkfetch. If a
 * URL ends with this phrase it will always be fetched from the network. This is defined
 * as $$.MONKSHU_CONSTANTS.FORCE_NETWORK_FETCH. Please use the constant if ever using 
 * this mode, and be prepared to catch network or other fetch errors.
 * 
 * (C) TekMonks Corp. 
 * License: See enclosed LICENSE file.
 */
import {LOG} from "/framework/js/log.mjs";
import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

const END_OF_CACHE_MARKER = import.meta.url;

let _cacheReady = {}, requestHandlers = [];

_init();
/** Service worker init */
function _init() {
    _enableCacheWorker();
    _registerRequestHandler();
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

    self.addEventListener("message", async e => {
        const message = e.data; if (message.id != MONKSHU_CONSTANTS.CACHEWORKER_MSG) return;    // not for us    
        const client = await self.clients.get(e.source?.id); if (!client) return;   // not for us 
    
        if (message.op == "cache") _cache(message.appName, message.version, message.listOfFilesToCache, client);
        if (message.op == "serve") _serve(message.appName, message.version);
        if (message.op == "unserveAllVersionsExcept") _unserveAllVersionsExcept(message.appName, message.except_version);
    });
}

/**
 * Registers the initial event listener for request handling. 
 */
 function _registerRequestHandler() {
    self.addEventListener("fetch", e => e.respondWith(new Promise(async resolve => {
        if (_justURL(e.request.url).endsWith(MONKSHU_CONSTANTS.FORCE_NETWORK_FETCH)) {    // forced network fetch handler
            const urlToFetch = e.request.url.replace(MONKSHU_CONSTANTS.FORCE_NETWORK_FETCH, "");
            const newRequest = new Request(urlToFetch, e.request);
            LOG.debug(`Forced network read for ${urlToFetch}.`);
            resolve(await fetch(newRequest));    // no request handler responded that they can handle this, go to the network
            return;
        }

        if (requestHandlers.length) for (const requestHandler of requestHandlers) if (await requestHandler.canHandle(e)) {
            resolve(await requestHandler.handle(e)); 
            return; 
        }

        LOG.debug(`Cache miss for request ${e.request.url}.`);
        resolve(await fetch(e.request));    // no request handler responded that they can handle this, go to the network
    })));
}

/**
 * Starts caching the given app at the given version, won't make it active though.
 * @param appName The app name
 * @param version The version
 * @param filesToCache The files to cache
 * @param client The client making this request
 */
async function _cache(appName, version, listOfFilesToCache, client) {
    const cacheSig = _getCacheKey(appName, version), cache = await caches.open(cacheSig); 
    if ((await cache.keys()).length && (await cache.match(END_OF_CACHE_MARKER))) {_cacheReady[cacheSig] = true; return;} // already cached and at right version

    const fetchRequests = {};
    for (const file of listOfFilesToCache) {
        const response = await fetch(file); fetchRequests[file] = response;
        if (!response.ok) LOG.error(`Can't cache ${file}, for app ${appName} response not ok, response status is ${response.status}, ${response.statusText}.`);
    }
    
    for (const key in fetchRequests) if (key != END_OF_CACHE_MARKER) await cache.put(key, fetchRequests[key]); 
    await cache.put(END_OF_CACHE_MARKER, fetchRequests[END_OF_CACHE_MARKER]||fetch(END_OF_CACHE_MARKER)); _cacheReady[cacheSig] = true;

    LOG.debug(`Service worker caching completed for ${appName}, version ${version}`); 
    client.postMessage({id: MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cacheComplete", app: appName, version});
}

/**
 * Starts serving the given app at the given version
 * @param appName The app name
 * @param version The version
 */
function _serve(appName, version) { 
    for (const requestHandler of requestHandlers) if (requestHandler.getAppName == appName && 
        requestHandler.getVersion() == version) return; // already serving this version
        
    requestHandlers.push(new RequestHandler(appName, version)); 
}

/**
 * Unserves (deletes request handlers and cache) of the given app except the given version
 * which is then activated.
 * @param appName The application to unserve
 * @param versionToSave The version to save, delete all else
 */
async function _unserveAllVersionsExcept(appName, versionToSave) {
    _serve(appName, versionToSave);

    requestHandlers = requestHandlers.filter(handler => handler.getAppName() != appName || (
        handler.getAppName() == appName && handler.getVersion() == versionToSave));
    
    for (const key of await caches.keys()) if (_getCacheKeyAppName(key) == appName && 
        _getCacheKeyAppVersion(key) != versionToSave) await caches.delete(key);
}

/**
 * Returns the cache key for the given app
 * @param appName The app name
 * @param version The app version
 * @return The cache key for this app
 */
const _getCacheKey = (appName, version) => `__org_monkshu__app_cache#$.${appName}#$.${version}`;
/**
 * Returns app name from a given cache key
 * @param cacheKey The cache key
 * @returns The app name, if it is for a monkshu app, else null
 */
const _getCacheKeyAppName = cacheKey => cacheKey.startsWith("__org_monkshu__app_cache_#$.")? cacheKey.substring("__org_monkshu__app_cache_#$.".length).split("#$.")[0] : null;
/**
 * Returns app version from a given cache key
 * @param cacheKey The cache key
 * @returns The app verion, if it is for a monkshu app, else null
 */
const _getCacheKeyAppVersion = cacheKey => cacheKey.startsWith("__org_monkshu__app_cache_#$.")? cacheKey.substring("__org_monkshu__app_cache_#$.".length).split("#$.")[1] : null;

/**
 * Standardizes URLs to cache keys, strips query params and #s.
 * @param url The URL to standardize
 * @returns The URL after standardization
 */
const _justURL = url => url.replace(/([^:]\/)\/+/g, "$1").split("?")[0].split("#")[0];

/** Private Classes */
class RequestHandler {
    constructor(appName, version) {
        this.appName = appName; 
        this.version = version;
    }

    /** getter for app name */
    getAppName = _ => this.appName;
    /** getter for app version */
    getVersion = _ => this.version;

    /**
     * Checks if this request handler can handle this request, must be called and 
     * should return true before calling handleRequest.
     * @param e The incoming request event
     * @returns true if this handler can handle this request, else false
     */
    async canHandle(e) {
        if (!_cacheReady[_getCacheKey(this.appName, this.version)]) {
            LOG.debug(`Cache not ready for app ${this.appName}, version ${this.version}, refusing to handle request ${e.request.url}.`)
            return false;
        }

        const cache = await caches.open(_getCacheKey(this.appName, this.version));
        if (await cache.match(_justURL(e.request.url))) return true;
        else return false;
    }

    /**
     * Handles the given request. Only should be called if canHandle returned true.
     * @param e The incoming request event.
     */
    async handle(e) {
        const cache = await caches.open(_getCacheKey(this.appName, this.version));
        const cacheKey = _justURL(e.request.url); // monkshu assets don't change based on query params
        const response = await cache.match(_justURL(cacheKey));
        if (!response) LOG.debug(`Cache miss for app ${this.appName}, version ${this.version} and request ${e.request.url}.`);
        return response || await fetch(e.request);    // we won't add to cache, APIs are dynamic for example
    }
}