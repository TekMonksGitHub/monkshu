/**
 * Service worker to support offline webapps.
 * (C) TekMonks Corp. 
 * License: See enclosed LICENSE file.
 */
import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

/**
 * Enables the cache worker
 * @param appName Name of the application 
 * @param listOfFilesToCache List of files to cache
 */
function enableCacheWorker() {
    const cacheFunction = async (appName, listOfFilesToCache) => {
        const cache = await caches.open("__org_monkshu__app_cache"+appName);
        return cache.addAll(listOfFilesToCache);
    }
    self.addEventListener("install", async e => e.waitUntil(self.skipWaiting()));   // take over immediately
    self.addEventListener("activate", e => e.waitUntil(clients.claim()));   // we will handle everything
    self.addEventListener("message", e => {
        const message = e.data; if (message.id != MONKSHU_CONSTANTS.CACHEWORKER_MSG) return;    // not for us        
        if (message.op == "cache") e.waitUntil(cacheFunction(message.appName, message.listOfFilesToCache));
    })
}

/**
 * Try to handle request offline from the cache
 */
function registerHandleRequests() {
    const requestHandler = async e => {
        const justURL = url => url.split("?")[0].split("#")[0];
        const response = await caches.match(justURL(e.request.url));    // monkshu assets don't change based on query params
        return response || fetch(e.request);    // we won't add to cache, APIs are dynamic for example
    }

    self.addEventListener("fetch", e=>e.respondWith(requestHandler(e)));
}

function _init() {
    enableCacheWorker();
    registerHandleRequests();
}

_init();