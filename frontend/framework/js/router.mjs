/**
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {LOG} from "./log.mjs";
import {util} from "./util.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

const HS = "?.=", FRAMEWORK_FILELIST = "/framework/conf/cachelist.json";

function setAppAsPWA(listOfFilesToCache, manifest) {
	if (!listOfFilesToCache) {LOG.error("Can't set app as a PWA without offline support and list of files."); return;}
	if (!manifest?.name) {LOG.error("Can't set app as a PWA without a manifest or application name."); return;}
	_addWebManifest(getCurrentAppName(), manifest);
	if (!_addOfflineSupport(manifest.name, listOfFilesToCache)) LOG.error("PWA setup failed in caching. Check logs.");
	monkshu_env[`org_monkshu_router_apps${getCurrentAppName()}`] = {isPWA: true};
}

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

async function expandPageData(text, url=getCurrentURL(), dataModels) {
	dataModels = await getPageData(url, dataModels);

	Mustache.parse(text);
	const rendered = Mustache.render(text,dataModels);

	return rendered;
}

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

function isInHistory(url) {``
	const history = session.get("__org_monkshu_router_history");
	if (!history) return false;

	if (url.indexOf(HS) == -1) return false;
	
	let hash = url.substring(url.indexOf(HS)+HS.length);
	if (!history[hash]) return false; else return true;
}

function decodeURL(url) {
	const retURL = new URL(url, window.location.href).href;	// normalize
	if (retURL.indexOf(HS) == -1) return retURL; 
	const decoded = atob(retURL.substring(retURL.indexOf(HS)+HS.length)); return decoded;
}

function encodeURL(url) {
	url = new URL(url, window.location).href;
	const encodedURL = new URL(new URL(window.location.href).pathname+HS+btoa(url), window.location); 
	return encodedURL.toString();
}

const addOnLoadPage = (url, func) => { if (window.monkshu_env.pageload_funcs[url]) 
	window.monkshu_env.pageload_funcs[url].push(func); else window.monkshu_env.pageload_funcs[url] = [func]; }
const addOnLoadPageData = (url, func) => { if (window.monkshu_env.pagedata_funcs[url])
	window.monkshu_env.pagedata_funcs[url].push(func); else window.monkshu_env.pagedata_funcs[url] = [func]; }

const removeOnLoadPage = (url, func) => { if (window.monkshu_env.pageload_funcs[url] && window.monkshu_env.pageload_funcs[url].indexOf(func)!=-1) 
	window.monkshu_env.pageload_funcs[url].splice(window.monkshu_env.pageload_funcs[url].indexOf(func)) }
const removeOnLoadPageData = (url, func) => { if (window.monkshu_env.pagedata_funcs[url] && window.monkshu_env.pagedata_funcs[url].indexOf(func)!=-1) 
	window.monkshu_env.pagedata_funcs[url].splice(window.monkshu_env.pagedata_funcs[url].indexOf(func)) }

const doIndexNavigation = _ => window.location = window.location.origin;

const getCurrentURL = _ => router.decodeURL(window.location.href);
const getCurrentPageData = _ => session.get($$.MONKSHU_CONSTANTS.PAGE_DATA);
const setCurrentPageData = data => session.set($$.MONKSHU_CONSTANTS.PAGE_DATA, data);

const getLastSessionURL = _ => session.get($$.MONKSHU_CONSTANTS.PAGE_URL);

const getMustache = _ => window.monkshu_env["__org_monkshu_mustache"];

function reload() {loadPage(session.get($$.MONKSHU_CONSTANTS.PAGE_URL),session.get($$.MONKSHU_CONSTANTS.PAGE_DATA));}

function getCurrentAppName(url) {	// relies on URL being in Monkshu standard format, i.e. <hostname>/apps/<appname>/...
	const path = new URL(url||window.location.href).pathname;
	const appName = path.split("/")[2];
	return appName;
}

async function _addOfflineSupport(appName, listOfFilesToCache) {
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
		appName, listOfFilesToCache: finalListOfFilesToCache});
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