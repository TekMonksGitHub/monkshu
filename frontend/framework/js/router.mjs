/**
 * The monkshu router.
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {LOG} from "./log.mjs";
import {util} from "./util.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

const HS = "?.=", FRAMEWORK_FILELIST = "/framework/conf/cachelist.json";

/**
 * Sets the given app as PWA
 * @param listOfFilesToCache List of files to cache
 * @param manifest The webmanifest of the app
 */
function setAppAsPWA(listOfFilesToCache, manifest) {
	if (!listOfFilesToCache) {LOG.error("Can't set app as a PWA without offline support and list of files."); return;}
	if (!manifest?.name) {LOG.error("Can't set app as a PWA without a manifest or application name."); return;}
	_addWebManifest(getCurrentAppName(), manifest);
	if (!_addOfflineSupport(manifest.name, listOfFilesToCache, manifest.version)) LOG.error("PWA setup failed in caching. Check logs.");
	monkshu_env[`org_monkshu_router_apps${getCurrentAppName()}`] = {isPWA: true};
}

/**
 * Loads the given page into the browser tab.
 * @param url The URL to load - can be either in hashed form, or the actual page URL
 * @param dataModels Data models object
 */
async function loadPage(url, dataModels={}) {
	const urlParsed = new URL(url, window.location.href), baseURL = urlParsed.origin + urlParsed.pathname; url = urlParsed.href;	// normalize

	if (!session.get("__org_monkshu_router_history")) session.set("__org_monkshu_router_history", {});
	const history = session.get("__org_monkshu_router_history"); let hash;

	if (url.indexOf(HS) == -1) {
		hash = btoa(url);
		window.history.pushState(null, null, new URL(window.location.href).pathname+HS+hash);
		history[hash] = [url, dataModels];
	} else {
		window.history.pushState(null, null, url);
		hash = url.substring(url.indexOf(HS)+HS.length);
		url = new URL(atob(hash), window.location).href;
		if (!history[hash]) history[hash] = [url,"en",{}];
	}

	session.set($$.MONKSHU_CONSTANTS.PAGE_URL, url);
	session.set($$.MONKSHU_CONSTANTS.PAGE_DATA, dataModels);
	
	const html = await loadHTML(url, dataModels);
	document.open("text/html");
	document.write(html);
	document.close();

	// notify those who want to know that a new page was loaded
	if (window.monkshu_env.pageload_funcs[url]) for (const func of window.monkshu_env.pageload_funcs[url]) await func(dataModels, url);
	if (window.monkshu_env.pageload_funcs[baseURL]) for (const func of window.monkshu_env.pageload_funcs[baseURL]) await func(dataModels, url);
	if (window.monkshu_env.pageload_funcs["*"]) for (const func of window.monkshu_env.pageload_funcs["*"]) await func(dataModels, url);

	// inject PWA manifests if setup for this app
	if (monkshu_env[`org_monkshu_router_apps${getCurrentAppName()}`] && 
		monkshu_env[`org_monkshu_router_apps${getCurrentAppName()}`].isPWA) _addWebManifest(getCurrentAppName(url));
}

/**
 * Loads the given HTML page, renders it using data models.
 * @param url URL to load
 * @param dataModels Data models
 * @param checkSecurity Whether to enforce security or not, default is true
 * @returns The loaded HTML
 */
async function loadHTML(url, dataModels, checkSecurity = true) {
	const urlParsed = new URL(url); url = urlParsed.origin + urlParsed.pathname; 	// Parse
	if (checkSecurity && !securityguard.isAllowed(url)) throw new Error("Not allowed: Security Exception");	// security block

	try {
		let [html, _] = await Promise.all([
			fetch(url, {mode: "no-cors", cache: "default"}).then(response => response.text()), 
			$$.require("/framework/3p/mustache.min.js")]);
		window.monkshu_env["__org_monkshu_mustache"] = Mustache;

		dataModels = await getPageData(urlParsed.href, dataModels);
		if (window.monkshu_env.pagedata_funcs[urlParsed.href]) for (const func of window.monkshu_env.pagedata_funcs[urlParsed.href]) await func(dataModels, url);
		if (window.monkshu_env.pagedata_funcs[url]) for (const func of window.monkshu_env.pagedata_funcs[url]) await func(dataModels, url);
		if (window.monkshu_env.pagedata_funcs["*"]) for (const func of window.monkshu_env.pagedata_funcs["*"]) await func(dataModels, url);

		Mustache.parse(html);
		html = Mustache.render(html, dataModels);

		return html;
	} catch (err) {throw err}
} 

/**
 * Expands page data for the given text using Mustache
 * @param text The text to render
 * @param url The URL, defaults to the current URL
 * @param dataModels The data models for the page, optional
 * @returns The rendered text
 */
async function expandPageData(text, url=getCurrentURL(), dataModels) {
	dataModels = await getPageData(url, dataModels);

	Mustache.parse(text);
	const rendered = Mustache.render(text,dataModels);

	return rendered;
}

/**
 * Returns the page data for the given page 
 * @param url The URL, defaults to the current URL
 * @param dataModels The additional data models to embed into the page data returned
 * @returns Returns the page data for the given page 
 */
async function getPageData(url=getCurrentURL(), dataModels) {
	const i18nObj = await i18n.getI18NObject(session.get($$.MONKSHU_CONSTANTS.LANG_ID));
	dataModels = dataModels||{}; dataModels["i18n"] = dataModels["i18n"]?{...dataModels["i18n"],...i18nObj}:i18nObj; 

	dataModels["lang"] = session.get($$.MONKSHU_CONSTANTS.LANG_ID);
	
	dataModels["url"] = {url};
	new URL(url).searchParams.forEach((value, name) => dataModels["url"][name] = value);

	dataModels["_org_monkshu_makeLink"] = _ => (text, render) => router.encodeURL(render(text));
	dataModels["_org_monkshu_session"] = _ => (key, render) => session.get(render(key));
	dataModels["__window"] = _ => (key, render) => window[render(key)];

	return dataModels;
}

/**
 * Runs shadow JS scripts 
 * @param sourceDocument The source document object
 * @param documentToRunScriptOn The document object on which to run the scripts
 */
async function runShadowJSScripts(sourceDocument, documentToRunScriptOn) {
	// Including script files (as innerHTML does not execute the script included)
	const scriptsToInclude = Array.from(sourceDocument.querySelectorAll("script"));
	if (scriptsToInclude) for(const scriptThis of scriptsToInclude) {
		let scriptText;
		if (scriptThis.src && scriptThis.src !== "") scriptText = await(await fetch(scriptThis.src, {mode: "no-cors", cache: "default"})).text();
		else scriptText = scriptThis.innerText;

		const script = document.createElement("script");
		script.type = scriptThis.type;
		script.text = `${scriptText}\n//# sourceURL=${scriptThis.src||window.location.href}`;

		const whereToAppend = documentToRunScriptOn.querySelector("head")
		whereToAppend.appendChild(script).parentNode.removeChild(script);
	}
}

/**
 * Checks if we have navigated to this URL before
 * @param url The URL in hash form
 * @returns true if we have navigated to this page before, else false
 */
function isInHistory(url) {``
	const history = session.get("__org_monkshu_router_history");
	if (!history) return false;

	if (url.indexOf(HS) == -1) return false;
	
	let hash = url.substring(url.indexOf(HS)+HS.length);
	if (!history[hash]) return false; else return true;
}

/**
 * Returns actual URL of the page embedded into a Monkshu hash URL
 * @param url Hash URL
 * @returns The actual URL of the page embedded into a Monkshu hash URL
 */
function decodeURL(url) {
	const retURL = new URL(url, window.location.href).href;	// normalize
	if (retURL.indexOf(HS) == -1) return retURL; 
	const decoded = atob(retURL.substring(retURL.indexOf(HS)+HS.length)); return decoded;
}

/**
 * Converts the given URL into a navigatable monkshu hashed URL
 * @param url The actual URL
 * @returns The hashed URL
 */
function encodeURL(url) {
	url = new URL(url, window.location).href;
	const encodedURL = new URL(new URL(window.location.href).pathname+HS+btoa(url), window.location); 
	return encodedURL.toString();
}

/**
 * Adds functions to run when the given page loads
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to run
 */
const addOnLoadPage = (url, func) => { if (window.monkshu_env.pageload_funcs[url]) 
	window.monkshu_env.pageload_funcs[url].push(func); else window.monkshu_env.pageload_funcs[url] = [func]; }
/**
 * Adds functions to run when the given page loads its data
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to run
 */
const addOnLoadPageData = (url, func) => { if (window.monkshu_env.pagedata_funcs[url])
	window.monkshu_env.pagedata_funcs[url].push(func); else window.monkshu_env.pagedata_funcs[url] = [func]; }

/**
 * Removes functions to run when the given page loads
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to run
 */
const removeOnLoadPage = (url, func) => { if (window.monkshu_env.pageload_funcs[url] && window.monkshu_env.pageload_funcs[url].indexOf(func)!=-1) 
	window.monkshu_env.pageload_funcs[url].splice(window.monkshu_env.pageload_funcs[url].indexOf(func)) }
/**
 * Removes functions to run when the given page loads its data
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to run
 */
const removeOnLoadPageData = (url, func) => { if (window.monkshu_env.pagedata_funcs[url] && window.monkshu_env.pagedata_funcs[url].indexOf(func)!=-1) 
	window.monkshu_env.pagedata_funcs[url].splice(window.monkshu_env.pagedata_funcs[url].indexOf(func)) }

/** Takes the framework back to the index page */
const doIndexNavigation = _ => window.location = window.location.origin;

/** Returns the current URL */
const getCurrentURL = _ => router.decodeURL(window.location.href);
/** Returns the current page data */
const getCurrentPageData = _ => session.get($$.MONKSHU_CONSTANTS.PAGE_DATA);
/** Returns the current page data */
const setCurrentPageData = data => session.set($$.MONKSHU_CONSTANTS.PAGE_DATA, data);

/** Returns the last session URL */
const getLastSessionURL = _ => session.get($$.MONKSHU_CONSTANTS.PAGE_URL);

/** Returns the Mustache instance being used by the framework */
const getMustache = _ => window.monkshu_env["__org_monkshu_mustache"];

/** Reloads the page */
function reload() {loadPage(session.get($$.MONKSHU_CONSTANTS.PAGE_URL),session.get($$.MONKSHU_CONSTANTS.PAGE_DATA));}

/** Returns the current app's name */
function getCurrentAppName(url) {	// relies on URL being in Monkshu standard format, i.e. <hostname>/apps/<appname>/...
	const path = new URL(url||window.location.href).pathname;
	const appName = path.split("/")[2];
	return appName;
}

async function _addOfflineSupport(appName, listOfFilesToCache, version) {
	if (!("serviceWorker" in navigator)) { LOG.error("Service workers not supported in the browser"); return false; }
	if ((!appName) || (!listOfFilesToCache)) { LOG.error("Missing app name or list of files, refusing to cache"); return false; }
	
	let finalListOfFilesToCache = util.clone(listOfFilesToCache); 
	if (monkshu_env.__org_monkshu_pwa_filelist) finalListOfFilesToCache.unshift(...monkshu_env.__org_monkshu_pwa_filelist);
	monkshu_env.__org_monkshu_pwa_filelist = util.clone(finalListOfFilesToCache);
	finalListOfFilesToCache.unshift(...await $$.requireJSON(FRAMEWORK_FILELIST));
	finalListOfFilesToCache = finalListOfFilesToCache.map(file => util.resolveURL(file));	// make all URLs proper
	finalListOfFilesToCache = [...new Set(finalListOfFilesToCache)];	// remove duplicates

	navigator.serviceWorker.register("/framework/js/cacheworker.mjs", {type: "module", scope: "/"});
	const registration = await navigator.serviceWorker.ready; 
	registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "cache", 
		appName, listOfFilesToCache: finalListOfFilesToCache, version});	// start caching
	registration.active.postMessage({id: $$.MONKSHU_CONSTANTS.CACHEWORKER_MSG, op: "serve", appName, version});	// start serving
	return true;
}

function _addWebManifest(app, manifest) {
	if (!monkshu_env.__org_monkshu_router_appmanifests) monkshu_env.__org_monkshu_router_appmanifests = {};
	if (!monkshu_env.__org_monkshu_router_appmanifests[app]) monkshu_env.__org_monkshu_router_appmanifests[app] = manifest;
	
	const manifestObj = monkshu_env.__org_monkshu_router_appmanifests[app];
	if (!manifestObj) {LOG.warn(`Missing web manifest for ${app}.`); return;}

	const appManifest = JSON.stringify(manifestObj);
	const link = document.createElement("link"); link.rel = "manifest"; link.setAttribute("href", 
		"data:application/manifest+json;charset=utf-8," + appManifest); document.head.appendChild(link);
}

export const router = {reload, loadPage, loadHTML, isInHistory, runShadowJSScripts, getPageData, expandPageData, decodeURL, 
	encodeURL, addOnLoadPage, removeOnLoadPage, addOnLoadPageData, removeOnLoadPageData, getCurrentURL, getCurrentPageData, 
	setCurrentPageData, doIndexNavigation, getLastSessionURL, getMustache, setAppAsPWA, getCurrentAppName};