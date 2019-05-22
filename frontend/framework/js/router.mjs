/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {session} from "/framework/js/session.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

const HS = "?.=";

async function loadPage(url, dataModels={}) {
	if (!session.get("__org_monkshu_router_history")) session.set("__org_monkshu_router_history", {});
	let history = session.get("__org_monkshu_router_history"); let hash;

	if (url.indexOf(HS) == -1) {
		hash = btoa(url);
		window.history.pushState(null, null, new URL(window.location.href).pathname+HS+hash);
		history[hash] = [url, dataModels];
		session.set("__org_monkshu_router_history", history);
	} else {
		hash = url.substring(url.indexOf(HS)+HS.length);
		url = new URL(atob(hash), window.location).href;
		if (!history[hash]) history[hash] = [url,"en",{}];
	}

	session.set($$.MONKSHU_CONSTANTS.PAGE_URL, url);
	session.set($$.MONKSHU_CONSTANTS.PAGE_DATA, dataModels);
	
	let html = await loadHTML(url, dataModels);
	document.open("text/html");
	document.write(html);
	document.close();
}

async function loadHTML(url, dataModels, checkSecurity = true) {
	let urlParsed = new URL(url);	url = urlParsed.origin + urlParsed.pathname; 	// Parse
	if (checkSecurity && !securityguard.isAllowed(url)) throw "Not allowed: Security Exception";	// security block

	try {
		let [html, _] = await Promise.all([
			fetch(url, {mode: "no-cors"}).then(response => response.text()), 
			$$.require("/framework/3p/mustache.min.js")]);

		dataModels = await getPageData(urlParsed.href, dataModels);
		
		Mustache.parse(html);
		html = Mustache.render(html,dataModels);

		return html;
	} catch (err) {throw err}
} 

async function expandPageData(text, url, dataModels) {
	dataModels = await getPageData(url, dataModels);

	Mustache.parse(text);
	let rendered = Mustache.render(text,dataModels);

	return rendered;
}

async function getPageData(url, dataModels) {
	let i18nObj = await i18n.getI18NObject(session.get($$.MONKSHU_CONSTANTS.LANG_ID));
	dataModels["i18n"] = i18nObj; 
	
	dataModels["url"] = {url};
	new URL(url).searchParams.forEach((value, name) => dataModels["url"][name] = value);

	dataModels["makeLink"] = _ => (text, render) => router.encodeURL(render(text));

	return dataModels;
}

function runShadowJSScripts(sourceDocument, documentToRunScriptOn) {
	// Including script files (as innerHTML does not execute the script included)
	let scriptsToInclude = Array.from(sourceDocument.querySelectorAll("script"));
	if (scriptsToInclude) scriptsToInclude.forEach(async scriptThis => {
		let scriptText;
		if (scriptThis.src && scriptThis.src !== "") scriptText = await(await fetch(scriptThis.src)).text();
		else scriptText = scriptThis.innerText;

		let script = document.createElement("script");
		script.type = scriptThis.type;
		script.text = `${scriptText}\n//# sourceURL=${scriptThis.src||window.location.href}`;

		let whereToAppend = documentToRunScriptOn.querySelector("head")
		whereToAppend.appendChild(script).parentNode.removeChild(script);
	});
}

function isInHistory(url) {``
	let history = session.get("__org_monkshu_router_history");
	if (!history) return false;

	if (url.indexOf(HS) == -1) return false;
	
	let hash = url.substring(url.indexOf(HS)+HS.length);
	if (!history[hash]) return false; else return true;
}

function decodeURL(url) {
	if (url.indexOf(HS) == -1) return url; 
	let decoded = atob(url.substring(url.indexOf(HS)+HS.length)); return decoded;
}

function encodeURL(url) {
	url = new URL(url, window.location).href;
	let encodedURL = new URL(window.location.href).pathname+HS+btoa(url);
	return encodedURL;
}

function reload() {loadPage(session.get($$.MONKSHU_CONSTANTS.PAGE_URL),session.get($$.MONKSHU_CONSTANTS.PAGE_DATA));}

export const router = {reload, loadPage, loadHTML, isInHistory, runShadowJSScripts, getPageData, expandPageData, decodeURL, encodeURL};