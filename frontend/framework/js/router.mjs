/**
 * The monkshu router.
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "/framework/js/util.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {session} from "/framework/js/session.mjs";
import {pwasupport} from "/framework/js/pwasupport.mjs"
import {securityguard} from "/framework/js/securityguard.mjs";

const HS = "?.=", PAGE_TRANSIENT_DATA = "org_monkshu__router__page_transient_data";

/** Inits the router, called by bootstrap */
const init = _ => window.monkshu_env.router = {pageload_funcs: [], urlRewriters: [], pagedata_funcs: []};

/**
 * Sets the current app as PWA
 * @param timeout		The timeout period to wait for service workers to become active, default is 10 seconds
 * @param appName 		Optional: The application name (monkshu app name), if not provided will be
 * 				  		auto-detected from the current URL.
 * @param manifestdata  Optional: Manifest data 
 */
async function setAppAsPWA(timeout=10000, appName=getCurrentAppName(), manifestdata={}) {
	const manifest = await pwasupport.addWebManifest(appName, null, manifestdata); if (!manifest) {
		$$.LOG.error("Can't set app as a PWA without a proper webmanifest."); return; }
	const serviceWorker = await pwasupport.addOfflineSupport(appName, manifest, timeout); 
	if (!serviceWorker) {$$.LOG.error("PWA setup failed in caching. Check logs."); return;}	// PWA unavailable
	monkshu_env.frameworklibs[`org_monkshu_router_apps_env_${appName}`] = {isPWA: true};
	await pwasupport.setupPWAVersionChecks(appName, manifest, serviceWorker);
}

/**
 * Navigates to the given URL, this is different than loadPage which will
 * load it without changing Window location.
 * @param url The URL to navigate to
 */
 function navigate(url) {
	let normalizedUrl = _getRewrittenURL(url).href;	// normalize
	if (normalizedUrl.indexOf(HS) == -1) normalizedUrl = encodeURL(url);
	window.location = normalizedUrl;
}

/**
 * Loads the given page into the browser tab.
 * @param url The URL to load - can be either in hashed form, or the actual page URL
 * @param dataModels Data models object
 */
async function loadPage(url, dataModels={}) {
	const urlParsed = _getRewrittenURL(url); url = urlParsed.href;	// normalize

	// in case of hard reloads etc we may have saved transient data
	if (session.get(PAGE_TRANSIENT_DATA) && !Object.keys(dataModels).length) dataModels = session.get(PAGE_TRANSIENT_DATA);
	if (session.get(PAGE_TRANSIENT_DATA)) session.remove(PAGE_TRANSIENT_DATA);

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
	if (window.monkshu_env.router.pageload_funcs[url]) for (const func of window.monkshu_env.router.pageload_funcs[url]) await func(dataModels, url);
	if (window.monkshu_env.router.pageload_funcs["*"]) for (const func of window.monkshu_env.router.pageload_funcs["*"]) await func(dataModels, url);

	// inject PWA manifests if setup for this app
	const appName = getCurrentAppName(url); 
	if (monkshu_env.frameworklibs[`org_monkshu_router_apps_env_${appName}`]?.isPWA) pwasupport.addWebManifest(appName);
}

/**
 * Loads the given HTML page, renders it using data models.
 * @param url URL to load
 * @param dataModels Data models, the default is an empty model
 * @param checkSecurity Whether to enforce security or not, default is true
 * @returns The loaded HTML
 */
async function loadHTML(url, dataModels={}, checkSecurity=true) {
	const urlParsed = _getRewrittenURL(url); url = urlParsed.origin + urlParsed.pathname; 	// Parse
	if (checkSecurity && !securityguard.isAllowed(url)) throw new Error("Not allowed: Security Exception");	// security block

	try {
		let [html, _] = await Promise.all([
			fetch(url, {mode: "no-cors", cache: "default"}).then(response => response.text()), 
			$$.require("/framework/3p/mustache.min.js")]);
		window.monkshu_env.frameworklibs["__org_monkshu_mustache"] = Mustache;

		dataModels = await getPageData(urlParsed.href, dataModels);

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

	if (window.monkshu_env.router.pagedata_funcs[util.resolveURL(url)]) for (const func of window.monkshu_env.router.pagedata_funcs[url]) await func(dataModels, url);
	if (window.monkshu_env.router.pagedata_funcs["*"]) for (const func of window.monkshu_env.router.pagedata_funcs["*"]) await func(dataModels, url);

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
function isInHistory(url) {
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
const addOnLoadPage = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pageload_funcs[url]) window.monkshu_env.router.pageload_funcs[url].push(func); 
	else window.monkshu_env.router.pageload_funcs[url] = [func]; }
/**
 * Adds functions to run when the given page loads its data
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to run
 */
const addOnLoadPageData = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pagedata_funcs[url]) window.monkshu_env.router.pagedata_funcs[url].push(func); 
	else window.monkshu_env.router.pagedata_funcs[url] = [func]; }
/**
 * Adds url rewriting functions
 * @param url The URL on which to run the functions, hashed
 * @param func The function to run
 */
const addURLRewriter = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.urlRewriters[url]) window.monkshu_env.router.urlRewriters[url].push(func); 
	else window.monkshu_env.router.urlRewriters[url] = [func]; }

/**
 * Removes functions to run when the given page loads
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to remove
 */
const removeOnLoadPage = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pageload_funcs[url] && window.monkshu_env.router.pageload_funcs[url].indexOf(func)!=-1) 
		window.monkshu_env.router.pageload_funcs[url].splice(window.monkshu_env.router.pageload_funcs[url].indexOf(func)) }
/**
 * Removes functions to run when the given page loads its data
 * @param url The URL on which to run the functions, not hashed
 * @param func The function to remove
 */
const removeOnLoadPageData = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pagedata_funcs[url] && window.monkshu_env.router.pagedata_funcs[url].indexOf(func)!=-1) 
		window.monkshu_env.router.pagedata_funcs[url].splice(window.monkshu_env.router.pagedata_funcs[url].indexOf(func)) }
/**
 * Removes the given URL rewriter function
 * @param url The URL on which to run the functions, hashed
 * @param func The function to remove
 */
const removeURLRewriter = (url, func) => { if (url != "*") url = util.resolveURL(url); 
if (window.monkshu_env.router.urlRewriters[url] && window.monkshu_env.router.urlRewriters[url].indexOf(func)!=-1) 
	window.monkshu_env.router.urlRewriters[url].splice(window.monkshu_env.router.urlRewriters[url].indexOf(func)) }

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
const getMustache = async _ => {
	if (!window.monkshu_env.frameworklibs["__org_monkshu_mustache"]) { await $$.require("/framework/3p/mustache.min.js");
		window.monkshu_env.frameworklibs["__org_monkshu_mustache"] = Mustache; }

	return window.monkshu_env.frameworklibs["__org_monkshu_mustache"];
}
	
/** Reloads the page */
function reload() {loadPage(session.get($$.MONKSHU_CONSTANTS.PAGE_URL),session.get($$.MONKSHU_CONSTANTS.PAGE_DATA));}

/** Hard reloads the page */
function hardreload() {
	session.set(PAGE_TRANSIENT_DATA, session.get($$.MONKSHU_CONSTANTS.PAGE_DATA));
	location.reload();
}

/** Returns the current app's name */
function getCurrentAppName(url) {	// relies on URL being in Monkshu standard format, i.e. <hostname>/apps/<appname>/...
	const path = new URL(url||window.location.href).pathname;
	const appName = path.split("/")[2];
	return appName;
}

function _getRewrittenURL(url) {
	const testURL = util.resolveURL(url); let newURL = testURL;
	if (window.monkshu_env.router.urlRewriters && window.monkshu_env.router.urlRewriters[testURL]) 
		for (const rewriter of window.monkshu_env.router.urlRewriters[testURL]) newURL = rewriter(testURL); 
	if (window.monkshu_env.router.urlRewriters && window.monkshu_env.router.urlRewriters["*"])
		for (const rewriter of window.monkshu_env.router.urlRewriters["*"]) newURL = rewriter(testURL);
	return new URL(newURL, window.location.origin);
}

export const router = {navigate, loadPage, loadHTML, reload, hardreload, isInHistory, runShadowJSScripts, getPageData, 
	expandPageData, decodeURL, encodeURL, addOnLoadPage, removeOnLoadPage, addOnLoadPageData, removeOnLoadPageData, 
	addURLRewriter, removeURLRewriter, getCurrentURL, getCurrentPageData, setCurrentPageData, doIndexNavigation, 
	getLastSessionURL, getMustache, setAppAsPWA, getCurrentAppName, init};