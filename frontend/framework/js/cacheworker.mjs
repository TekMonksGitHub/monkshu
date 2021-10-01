/**
 * Service worker to support offline webapps.
 * This service worker is specifically coded for Monkshu, in that
 * it strips out URL queries and parameters for caching. 
 * (C) TekMonks Corp. 
 * License: See enclosed LICENSE file.
 */
import {LOG} from "./log.mjs";
import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

/**
 * Enables the cache worker
 * @param appName Name of the application 
 * @param listOfFilesToCache List of files to cache
 */
function enableCacheWorker() {
    const cacheFunction = async (appName, listOfFilesToCache) => {
        const cache = await caches.open("__org_monkshu__app_cache"+appName);
        for (const file of listOfFilesToCache) {
            const response = await fetch(file); await cache.put(file, response); 
            if (!response.ok) LOG.error(`Can't cache ${file}, response not ok, response status is ${response.status}, ${response.statusText}.`);
        }
        LOG.info("Service worker caching completed.");
    }

    self.addEventListener("install", e => {
        e.waitUntil(self.skipWaiting()); // take over immediately
    });   
    
    self.addEventListener("activate", e => {
        e.waitUntil(clients.claim())    // we will handle everything
    });   

    self.addEventListener("message", async e => {
        const message = e.data; if (message.id != MONKSHU_CONSTANTS.CACHEWORKER_MSG) return;    // not for us        
        if (message.op == "cache") await cacheFunction(message.appName, message.listOfFilesToCache);
    })
}

/**
 * Try to handle request offline from the cache
 */
function registerHandleRequests() {
    const requestHandler = async e => {
        const justURL = url => url.replace(/([^:]\/)\/+/g, "$1").split("?")[0].split("#")[0];
        const response = await caches.match(justURL(e.request.url));    // monkshu assets don't change based on query params
        if (!response) LOG.debug(`Cache miss for ${e.request.url}`);
        return response || fetch(e.request);    // we won't add to cache, APIs are dynamic for example
    }

    self.addEventListener("fetch", e=>e.respondWith(requestHandler(e)));
}

function _init() {
    enableCacheWorker();
    registerHandleRequests();
}

_init();