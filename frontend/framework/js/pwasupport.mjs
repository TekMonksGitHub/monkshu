/**
 * PWA support framework.
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "./util.mjs";
import {router} from "./router.mjs";
import {blackboard} from "/framework/js/blackboard.mjs";

const FRAMEWORK_FILELIST = `/framework/${$$.MONKSHU_CONSTANTS.CACHELIST_SUFFIX}`, 
    DEFAULT_VERSION_CHECK_FREQUENCY = 300000, CACHE_WORKER_URL = util.resolveURL("/framework/js/cacheworker.mjs"),
    VERSION_SWITCH_IN_PROGRESS = {}, PAGE_RELOAD_ON_UPGRADE_INTERVAL = 500;
    
/**
 * Adds web manifest to the current document
 * @param appName The application name (monkshu app name)
 * @param manifest Optional: The application webmanifest, if not provided will be fetched 
 * @param manifestData Optional: The application webmanifest data for expansion
 * @returns The app's manifest on success, and false on failure
 */
async function addWebManifest(appName, manifest, manifestData={}) {
    await $$.require("/framework/3p/mustache.min.js");
	if (!monkshu_env.frameworklibs.__org_monkshu_router_appmanifests) monkshu_env.frameworklibs.__org_monkshu_router_appmanifests = {};
	if (!monkshu_env.frameworklibs.__org_monkshu_router_appmanifests[appName]) 
        monkshu_env.frameworklibs.__org_monkshu_router_appmanifests[appName] = JSON.parse(Mustache.render(JSON.stringify(
            manifest || await $$.requireJSON(_getAppWebManifestURL(appName))), manifestData));
	
	const manifestObj = monkshu_env.frameworklibs.__org_monkshu_router_appmanifests[appName];
	if (!manifestObj) {$$.LOG.warn(`Missing web manifest for ${appName}.`); return;}
    if (parseFloat(manifestObj.version) == NaN) {$$.LOG.warn(`Bad version ${manifestObj.version} in web manifest for ${appName}.`); return;}

	const appManifest = JSON.stringify(manifestObj);
	const link = document.createElement("link"); link.rel = "manifest"; link.setAttribute("href", 
		"data:application/manifest+json;charset=utf-8," + appManifest); document.head.appendChild(link);

    return manifestObj;
}

/**
 * Adds offline support by registering service worker and caching files.
 * @param appName The application name (monkshu app name)
 * @param manifest The application webmanifest
 * @param timeout The time to wait for the worker to install and become active, else assume failure
 * @returns The registered service worker on success, and false on failure
 */
async function addOfflineSupport(appName, manifest, timeout) {
    if (!("serviceWorker" in navigator)) { $$.LOG.error("Service workers not supported in the browser"); return false; }

    const listOfFilesToCache = await $$.requireJSON(_getAppCachelistURL(appName));
	if (!manifest.name) {$$.LOG.error("Missing application name in the manifest."); return false;}
    if (!listOfFilesToCache?.length) {$$.LOG.error("Missing list of files to cache or it is empty, refusing to cache."); return false;}
	
	const finalListOfFilesToCache = _combineFileLists(listOfFilesToCache, await $$.requireJSON(FRAMEWORK_FILELIST));

    return new Promise(async resolve => {
        let alreadySentFalse = false; 
        const timedOutInstall = timeout?setTimeout(_=>{alreadySentFalse = true; resolve(false); LOG.error("PWA registration timedout.");}, timeout):undefined;
        await navigator.serviceWorker.register(CACHE_WORKER_URL, {type: "module", scope: "/"});
        const registration = await navigator.serviceWorker.ready; 

        if (!alreadySentFalse) {
            if (timedOutInstall) clearTimeout(timedOutInstall);
            registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cache", 
                appName, version: manifest.version, listOfFilesToCache: finalListOfFilesToCache});	
            registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "serve", appName, 
                version: manifest.version});	
            resolve(registration.active);
        }
    });
}

/**
 * Sets up PWA version checks and upgrades the app if newer version is found.
 * @param appName The application name (monkshu app name)
 * @param manifest The application webmanifest
 * @param serviceWorker The active service worker
 */
function setupPWAVersionChecks(appName, manifest, serviceWorker) {
	setInterval(async _ => {
        try {
            const forceNW = $$.MONKSHU_CONSTANTS.FORCE_NETWORK_FETCH;
            const manifestNew = await $$.requireJSON(_getAppWebManifestURL(appName)+forceNW, true);
            const appList = await $$.requireJSON(_getAppCachelistURL(appName)+forceNW, true);
            const appListFramework = await $$.requireJSON(FRAMEWORK_FILELIST+forceNW, true);

            const listOfFilesToCache = _combineFileLists(appList, appListFramework);
            _versionChecker(appName, manifest, manifestNew, listOfFilesToCache, serviceWorker);
        } catch (err) { LOG.debug(`Version check being skipped due to error, ${err}.`); }
	}, manifest.versionCheckFrequency || DEFAULT_VERSION_CHECK_FREQUENCY);
}

/**
 * Will check versions, cache new version if available, and then switch and clean
 * old caches if the user decides to upgrade. Will issue event with Monkshu Blackboard
 * with ID $$.MONKSHU_CONSTANTS.PWA_UPDATE_MESSAGE, the listeners can show a message to the
 * user and return true, false (skip upgrade) or function which should be executed once
 * the upgrade is completely (typically logout and reaload the app). If true is returned
 * then the page will be auto hard-reloaded once the version upgrade is complete.
 * @param appName The app name (monkshu app name)
 * @param manifestOld The old manifest (from cache)
 * @param manifestNew The new manifest (from network)
 * @param listOfFilesToCache List of files to cache (from network)
 * @param serviceWorker The active service worker
 */
async function _versionChecker(appName, manifestOld, manifestNew, listOfFilesToCache, serviceWorker) {
    if (manifestOld.version >= manifestNew.version) return;   // no new version detected
    if (VERSION_SWITCH_IN_PROGRESS[appName+manifestNew.version]) return;    // version switch already underway
    else VERSION_SWITCH_IN_PROGRESS[appName+manifestNew.version] = true;   

    serviceWorker.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cache", appName, listOfFilesToCache, 
        version: manifestNew.version}); // cache new version
    navigator.serviceWorker.addEventListener("message", async event => { // switch when caching is complete
        const message = event.data; if ((message?.id != $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG)) return;
        if (message.op != "cacheComplete" || message.app != appName || message.version != manifestNew.version) return;
        
        delete VERSION_SWITCH_IN_PROGRESS[appName+manifestNew.version]; // got the cache complete event

        const postSwitchActions = [];
        for (const listener of blackboard.getListeners($$.MONKSHU_CONSTANTS.PWA_UPDATE_MESSAGE)) {
            const pwaUpdateResult = await listener({app: appName, manifestOld, manifestNew});
            if (!pwaUpdateResult) return;   // got veto to prevent version upgrade
            else if (pwaUpdateResult !== true) postSwitchActions.push(pwaUpdateResult); // function returned
        }
    
        serviceWorker.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "unserveAllVersionsExcept", 
            appName, except_version: manifestNew.version});

        if (postSwitchActions.length) for (const action of postSwitchActions) action();
        else setTimeout(router.hardreload, PAGE_RELOAD_ON_UPGRADE_INTERVAL);    // else hard reload in 0.5 seconds - this gives time to the service worker to switch cache and request handlers
    });
}

const _getAppRootURL = appName => `/apps/${appName}`;
const _getAppWebManifestURL = appName => `${_getAppRootURL(appName)}/${$$.MONKSHU_CONSTANTS.WEB_MANIFEST_SUFFIX}`;
const _getAppCachelistURL = appName => `${_getAppRootURL(appName)}/${$$.MONKSHU_CONSTANTS.CACHELIST_SUFFIX}`;

function _combineFileLists(appFileList, frameworkFileList) {
    let finalFileList = util.clone(appFileList); 
    finalFileList.unshift(...frameworkFileList);
    finalFileList = finalFileList.map(file => util.resolveURL(file));	// make all URLs proper
    finalFileList = [...new Set(finalFileList)];	// remove duplicates
    return finalFileList;
}

export const pwasupport = {addOfflineSupport, addWebManifest, setupPWAVersionChecks};