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

const PAGE_TRANSIENT_DATA = "org_monkshu__router__page_transient_data", 
	ROUTER_HISTORY_KEY = "__org_monkshu_router_history", HASH_PARAM=".";

const loadbalancers = []; let conf;
const DEFAULT_CONF = {"fetch_options": {"cache": "default", "mode": "cors"}};

/** Inits the router, called by bootstrap */
const init = async _ => {
	conf = (await $$.requireJSON($$.MONKSHU_CONSTANTS.CONFIG_MAIN)).router||DEFAULT_CONF;
	window.monkshu_env.router = {pageload_funcs: [], urlRewriters: [], pagedata_funcs: []};
}

/**
 * Sets the current app as PWA
 * @param {number} timeout		The timeout period to wait for service workers to become active, default is 10 seconds
 * @param {string} appName 		Optional: The application name (monkshu app name), if not provided will be
 * 				  		auto-detected from the current URL.
 * @param {Object} manifestdata  Optional: Manifest data 
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
 * @param {string} url The URL to navigate to
 */
 function navigate(url) {
	let normalizedUrl = getBalancedURL(_getRewrittenURL(url));	// normalize
	if (!_isEncodedURL(normalizedUrl.href)) normalizedUrl = new URL(encodeURL(url));
	window.location.assign(normalizedUrl.href);
}

/**
 * Loads the given page into the browser tab.
 * @param {string} url The URL to load - can be either in hashed form, or the actual page URL
 * @param {Object} dataModels Data models object
 */
async function loadPage(url, dataModels={}) {
	url = getBalancedURL(_getRewrittenURL(url)); 

	// in case of hard reloads etc we may have saved transient data
	if (session.get(PAGE_TRANSIENT_DATA) && !Object.keys(dataModels).length) dataModels = session.get(PAGE_TRANSIENT_DATA);
	if (session.get(PAGE_TRANSIENT_DATA)) session.remove(PAGE_TRANSIENT_DATA);

	if (!session.get(ROUTER_HISTORY_KEY)) session.set(ROUTER_HISTORY_KEY, {});
	const history = session.get(ROUTER_HISTORY_KEY); let hash;

	if (!_isEncodedURL(url)) {
		hash = btoa(url); const currenturl = new URL(new URL(window.location.href).pathname, window.location.href); 
		currenturl.searchParams.set(HASH_PARAM, hash);
		window.history.pushState(null, null, currenturl.href);
		history[hash] = [url, dataModels];
	} else {
		window.history.pushState(null, null, url);
		hash = new URL(url).searchParams.get(HASH_PARAM);
		url = new URL(atob(hash), window.location).href;
		if (!history[hash]) history[hash] = [url, dataModels];
	}

	session.set(ROUTER_HISTORY_KEY, history);
	session.set($$.MONKSHU_CONSTANTS.PAGE_URL, url);
	session.set($$.MONKSHU_CONSTANTS.PAGE_DATA, dataModels);
	
	const html = await loadHTML(url, dataModels);
	document.open("text/html");
	document.write(html);
	document.close();

	// notify those who want to know that a new page was loaded
	const matchingPageLoadFunctionURL = _getMatchingLBURL(Object.keys(window.monkshu_env.router.pageload_funcs), url);
	if (matchingPageLoadFunctionURL) for (const func of window.monkshu_env.router.pageload_funcs[matchingPageLoadFunctionURL]) await func(dataModels, url);
	if (window.monkshu_env.router.pageload_funcs["*"]) for (const func of window.monkshu_env.router.pageload_funcs["*"]) await func(dataModels, url);

	// inject PWA manifests if setup for this app
	const appName = getCurrentAppName(url); 
	if (monkshu_env.frameworklibs[`org_monkshu_router_apps_env_${appName}`]?.isPWA) pwasupport.addWebManifest(appName);
}

/**
 * Loads the given HTML page, renders it using data models. The URL must be the final
 * URL, pointing to the HTML page and not an encoded URL.
 * @param {string} url URL to load
 * @param {Object} dataModels Data models, the default is an empty model
 * @param {boolean} checkSecurity Whether to enforce security or not, default is true
 * @returns {string} The loaded HTML
 */
async function loadHTML(url, dataModels={}, checkSecurity=true) {
	const urlParsed = new URL(getBalancedURL(_getRewrittenURL(url))); url = urlParsed.origin + urlParsed.pathname; 	// Parse
	if (checkSecurity && !securityguard.isAllowed(url)) throw new Error("Not allowed: Security Exception");	// security block

	try {
		let [html, _] = await Promise.all([
			fetch(url, conf.fetch_options).then(response => response.text()), 
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
 * @param {string} text The text to render
 * @param {string} url The URL, defaults to the current URL
 * @param {Object} dataModels The data models for the page, optional
 * @returns {string} The rendered text
 */
async function expandPageData(text, url=getCurrentURL(), dataModels) {
	const data = await getPageData(url, dataModels);
	Mustache.parse(text); const rendered = Mustache.render(text, data);

	return rendered;
}

/**
 * Returns the page data for the given page 
 * @param {string} url The URL, defaults to the current URL
 * @param {Object} dataModels The additional data models to embed into the page data returned
 * @returns {Object} Returns the page data for the given page 
 */
async function getPageData(url=getCurrentURL(), dataModels) {
	const i18nObj = await i18n.getI18NObject(session.get($$.MONKSHU_CONSTANTS.LANG_ID));
	dataModels = dataModels||{}; dataModels["i18n"] = dataModels["i18n"]?{...dataModels["i18n"],...i18nObj}:i18nObj; 

	dataModels["lang"] = session.get($$.MONKSHU_CONSTANTS.LANG_ID);
	
	const urlObject = new URL(url); dataModels["url"] = {url, url_search: urlObject.search.trim()!=""?urlObject.search.trim():undefined};
	if (urlObject.searchParams.size) for (const [name, value] of urlObject.searchParams.entries()) dataModels["url"][name] = value;

	dataModels["_org_monkshu_makeLink"] = _ => (text, render) => router.encodeURL(render(text));
	dataModels["_org_monkshu_session"] = _ => (key, render) => session.get(render(key));
	dataModels["__window"] = _ => (key, render) => window[render(key)];
	dataModels["_org_monkshu_encodeURIComponent"] = _ => (text, render) => encodeURIComponent(render(text));

	const matchingPageDataFunctionURL = _getMatchingLBURL(Object.keys(window.monkshu_env.router.pagedata_funcs), url);
	if (matchingPageDataFunctionURL) for (const func of window.monkshu_env.router.pagedata_funcs[matchingPageDataFunctionURL]) await func(dataModels, url);
	if (window.monkshu_env.router.pagedata_funcs["*"]) for (const func of window.monkshu_env.router.pagedata_funcs["*"]) await func(dataModels, url);

	return dataModels;
}

/**
 * Runs shadow JS scripts 
 * @param {Object} sourceDocument The source document object
 * @param {Object} documentToRunScriptOn The document object on which to run the scripts
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
 * @param {string} url The URL in hash form
 * @returns {boolean} true if we have navigated to this page before, else false
 */
function isInHistory(url) {
	const history = session.get(ROUTER_HISTORY_KEY);
	if (!history) return false;

	const hash = new URL(url, window.location.href).searchParams.get(HASH_PARAM);
	if (!hash) return false;	
	if (!history[hash]) return false; else return true;
}

/**
 * Returns actual URL of the page embedded into a Monkshu hash URL
 * @param {string} url Hash URL
 * @returns {string} The actual URL of the page embedded into a Monkshu hash URL
 */
function decodeURL(url) {
	const urlObject = new URL(url, window.location.href); 
	if (!urlObject.searchParams.get(HASH_PARAM)) return urlObject.href; 
	let decoded = new URL(atob(urlObject.searchParams.get(HASH_PARAM)), window.location.href).href; 
	urlObject.searchParams.delete(HASH_PARAM);	// delete the hash param as it is internal, rest are pass-through
	if (urlObject.searchParams.size) decoded = decoded+urlObject.search; return decoded;
}

/**
 * Converts the given URL into a navigable monkshu hashed URL
 * @param {string}  url The actual URL
 * @returns {string} The hashed URL
 */
function encodeURL(url) {
	const normalizedurl = new URL(url, window.location).href, btoaNormURL = btoa(normalizedurl);
	const encodedURL = new URL(new URL(window.location.href).pathname, window.location.href); 
	encodedURL.searchParams.set(HASH_PARAM, btoaNormURL);
	return encodedURL.href;
}

/**
 * Adds a loadbalancer to the router.
 * @param {Object} lb The load balancer to add
 */
const addLoadbalancer = lb => loadbalancers.push(lb);

/**
 * Adds functions to run when the given page loads
 * @param {string} url The URL on which to run the functions, not hashed
 * @param {Function} func The function to run
 */
const addOnLoadPage = (url, func) => { 
	if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pageload_funcs[url]) window.monkshu_env.router.pageload_funcs[url].push(func); 
	else window.monkshu_env.router.pageload_funcs[url] = [func]; 
}

/**
 * Adds functions to run when the given page loads its data
 * @param {string} url The URL on which to run the functions, not hashed
 * @param {Function} func The function to run
 */
const addOnLoadPageData = (url, func) => { 
	if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pagedata_funcs[url]) window.monkshu_env.router.pagedata_funcs[url].push(func); 
	else window.monkshu_env.router.pagedata_funcs[url] = [func]; 
}

/**
 * Adds url rewriting functions
 * @param {string} url The URL on which to run the functions, hashed
 * @param {Function} func The function to run
 */
const addURLRewriter = (url, func) => { 
	if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.urlRewriters[url]) window.monkshu_env.router.urlRewriters[url].push(func); 
	else window.monkshu_env.router.urlRewriters[url] = [func]; 
}

/**
 * Removes functions to run when the given page loads
 * @param {string} url The URL on which to run the functions, not hashed
 * @param {Function} func The function to remove
 */
const removeOnLoadPage = (url, func) => { 
	if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pageload_funcs[url] && window.monkshu_env.router.pageload_funcs[url].indexOf(func)!=-1) 
		window.monkshu_env.router.pageload_funcs[url].splice(window.monkshu_env.router.pageload_funcs[url].indexOf(func)) 
}

/**
 * Removes functions to run when the given page loads its data
 * @param {string} url The URL on which to run the functions, not hashed
 * @param {Function} func The function to remove
 */
const removeOnLoadPageData = (url, func) => { if (url != "*") url = util.resolveURL(url); 
	if (window.monkshu_env.router.pagedata_funcs[url] && window.monkshu_env.router.pagedata_funcs[url].indexOf(func)!=-1) 
		window.monkshu_env.router.pagedata_funcs[url].splice(window.monkshu_env.router.pagedata_funcs[url].indexOf(func)) }
/**
 * Removes the given URL rewriter function
 * @param {string} url The URL on which to run the functions, hashed
 * @param {Function} func The function to remove
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

/**
 * Resolves the given URL taking into account any load balancing strategies.
 * @param {Object|string} url The URL to resolve
 * @returns The final URL to use instead
 */
function getBalancedURL(url) {
	const baseURL = typeof url == "string" ? util.resolveURL(url) : url.href;
	if (loadbalancers.length) for (const lb of loadbalancers) if (lb.canHandle(baseURL)) return lb.resolveURL(baseURL);
	return baseURL;	// no LBs configured or all refused to handle
}

/**
 * Checks if the given URLs match, taking into account LB policies.
 * @param {string} url1OrRE First URL
 * @param {string} url2 Second URL
 * @param {boolean} url1IsARegularExpression The first URL is a regular expression
 * @returns true if they match, else not
 */
function doURLsMatch(url1OrRE, url2, url1IsARegularExpression) {	
	const _doesThisURLMatchURL1 = (url1RE, url2, useREs) => useREs ? url2.match(new RegExp(url1RE)) : url1RE == url2;
	if (!loadbalancers.length) return _doesThisURLMatchURL1(url1OrRE, url2, url1IsARegularExpression);
	for (const lb of loadbalancers) {
		const allPossibleLBURLs = lb.getAllBalancedCombinationURLs(url1OrRE);
		for (const possibleMatch of allPossibleLBURLs) if (_doesThisURLMatchURL1(possibleMatch, url2, url1IsARegularExpression)) return true;
	}
	return false;
}

function _getRewrittenURL(url) {
	const testURL = util.resolveURL(url); let newURL = testURL;
	if (window.monkshu_env.router.urlRewriters && window.monkshu_env.router.urlRewriters[testURL]) 
		for (const rewriter of window.monkshu_env.router.urlRewriters[testURL]) newURL = rewriter(testURL); 
	if (window.monkshu_env.router.urlRewriters && window.monkshu_env.router.urlRewriters["*"])
		for (const rewriter of window.monkshu_env.router.urlRewriters["*"]) newURL = rewriter(testURL);
	return new URL(newURL, window.location.origin);
}

function _isEncodedURL(url) {
	const testURL = new URL(url, window.location);
	return testURL.searchParams.get(HASH_PARAM) != null;
}

function _getMatchingLBURL(urlsToMatchFrom, candidateURL) {
	const normalizedCandidateURL = util.baseURL(candidateURL);
	if (!loadbalancers.length) {
		for (const testURL of urlsToMatchFrom) {if (testURL == normalizedCandidateURL) return testURL;} 
	} else for (const lb of loadbalancers) {
		const matchingURL = lb.getMatchingURLFrom(urlsToMatchFrom, normalizedCandidateURL);
		if (matchingURL) return matchingURL;
	}
}

export const router = {navigate, loadPage, loadHTML, reload, hardreload, isInHistory, runShadowJSScripts, getPageData, 
	expandPageData, decodeURL, encodeURL, addOnLoadPage, removeOnLoadPage, addOnLoadPageData, removeOnLoadPageData, 
	addURLRewriter, removeURLRewriter, getCurrentURL, getCurrentPageData, setCurrentPageData, doIndexNavigation, 
	getLastSessionURL, getMustache, setAppAsPWA, getCurrentAppName, init, getBalancedURL, addLoadbalancer, doURLsMatch};