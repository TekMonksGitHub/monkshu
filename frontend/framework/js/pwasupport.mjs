/**
 * PWA support framework.
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "./util.mjs";
import {router} from "./router.mjs";
import {blackboard} from "/framework/js/blackboard.mjs";

const FRAMEWORK_FILELIST = `/framework/${$$.MONKSHU_CONSTANTS.CACHELIST_SUFFIX}`, 
    DEFAULT_VERSION_CHECK_FREQUENCY = 300000, CACHE_WORKER_URL = "/framework/js/cacheworker.mjs",
    VERSION_SWITCH_EVENT_LISTENERS = {};
    
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

	const appManifest = JSON.stringify(manifestObj);
	const link = document.createElement("link"); link.rel = "manifest"; link.setAttribute("href", 
		"data:application/manifest+json;charset=utf-8," + appManifest); document.head.appendChild(link);

    return manifestObj;
}

/**
 * Adds offline support by registering service worker and caching files.
 * @param appName The application name (monkshu app name)
 * @param manifest The application webmanifest
 * @returns The registered service worker on success, and false on failure
 */
async function addOfflineSupport(appName, manifest) {
    if (!("serviceWorker" in navigator)) { $$.LOG.error("Service workers not supported in the browser"); return false; }

    const listOfFilesToCache = await $$.requireJSON(_getAppCachelistURL(appName));
	if (!manifest.name) {$$.LOG.error("Missing application name in the manifest."); return false;}
    if (!listOfFilesToCache?.length) {$$.LOG.error("Missing list of files to cache or it is empty, refusing to cache."); return false;}
	
	const finalListOfFilesToCache = _combineFileLists(listOfFilesToCache, await $$.requireJSON(FRAMEWORK_FILELIST));

	navigator.serviceWorker.register(CACHE_WORKER_URL, {type: "module", scope: "/"});
	const registration = await navigator.serviceWorker.ready; 

	registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cache", 
		appName, version: manifest.version, listOfFilesToCache: finalListOfFilesToCache});	
    registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "serve", appName, 
        version: manifest.version});	

	return registration.active;
}

/**
 * Sets up PWA version checks and upgrades the app if newer version is found.
 * @param appName The application name (monkshu app name)
 * @param manifest The application webmanifest
 */
function setupPWAVersionChecks(appName, manifest) {
	setInterval(async _ => {
        try {
            const forceNW = $$.MONKSHU_CONSTANTS.FORCE_NETWORK_FETCH;
            const manifestNew = await $$.requireJSON(_getAppWebManifestURL(appName)+forceNW);
            const appList = await $$.requireJSON(_getAppCachelistURL(appName)+forceNW);
            const appListFramework = await $$.requireJSON(FRAMEWORK_FILELIST+forceNW);

            const listOfFilesToCache = _combineFileLists(appList, appListFramework);
            _versionChecker(appName, manifest, manifestNew, listOfFilesToCache);
        } catch (err) { LOG.debug(`Version check being skipped due to error, ${err}.`); }
	}, manifest.versionCheckFrequency || DEFAULT_VERSION_CHECK_FREQUENCY);
}

async function _versionChecker(appName, manifestOld, manifestNew, listOfFilesToCache) {
    if (manifestOld.version >= manifestNew.version) return;   // no new version detected

    serviceWorker.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cache", appName, listOfFilesToCache, 
        version: manifestNew.version});

    if (!VERSION_SWITCH_EVENT_LISTENERS[appName+manifestNew.version]) {
        VERSION_SWITCH_EVENT_LISTENERS[appName+manifestNew.version] = true;
        window.addEventListener("message", async event => {
            const message = event.data; if ((message?.id != $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG)) return;

            // app caching completed, try to switch to the new version
            if (message.op == "cacheComplete" && message.app == appName && message.version == manifestNew.version) {
                delete VERSION_SWITCH_EVENT_LISTENERS[appName+manifestNew.version]; // got the complete event

                for (const listener of blackboard.getListeners($$.MONKSHU_CONSTANTS.PWA_UPDATE_MESSAGE)) 
                    if (!await listener({app: appName, manifestOld, manifestNew})) return;    // veto to prevent version upgrade
            
                serviceWorker.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "unserveAllVersionsExcept", appName, 
                    except_version: manifestNew.version});

                setTimeout(router.hardreload, 500);    // hard reload in 0.5 seconds - this gives time to the service worker to switch cache and request handlers
            }
        });
    }
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