/**
 * Service worker to support offline webapps.
 * (C) TekMonks Corp. 
 * License: See enclosed LICENSE file.
 */

/**
 * Enables the cache worker
 * @param appName Name of the application 
 * @param listOfFilesToCache List of files to cache
 */
async function enableCacheWorker(appName, listOfFilesToCache) {
    const cacheFunction = async _ => {
        const cache = await caches.open("__org_monkshu__app_cache"+appName);
        return cache.addall(listOfFilesToCache);
    }
    self.addEventListener("install", async e => e.waitUntil(cacheFunction()));
    self.addEventListener("activate", e => e.waitUntil(clients.claim()));   // we will handle everything
}

/**
 * Try to handle request offline from the cache
 */
async function registerHandleRequests() {
    const requestHandler = async e => {
        const response = await caches.match(e.request);
        return response || fetch(e.request);    // we won't add to cache, APIs are dynamic for example
    }

    self.addEventListener("fetch", e=>e.respondWith(requestHandler(e)()));
}

function _init(appName, listOfFilesToCache) {
    if (appName && listOfFilesToCache) {    // only enable if we have something to cache
        enableCacheWorker(appName, listOfFilesToCache);
        registerHandleRequests();
    }
}

_init(monkshu_env[$$.MONKSHU_CONSTANTS.CACHE_WORKER_APP_NAME], monkshu_env[$$.MONKSHU_CONSTANTS.CACHE_WORKER_LIST_APP_FILES]);

export const cacheworker = {CACHE_WORKER_APP_NAME, CACHE_WORKER_LIST_APP_FILES};