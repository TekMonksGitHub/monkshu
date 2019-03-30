/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {session} from "/framework/js/session.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import { securityguard } from "/framework/js/securityguard.mjs";

async function loadPage(url, dataModels={}) {
	if (!session.get("__org_monkshu_router_history")) session.set("__org_monkshu_router_history", {});
	let history = session.get("__org_monkshu_router_history"); let hash;

	try {
		if (url.indexOf('#') == -1) {
			hash = btoa(url);
			window.history.pushState(null, null, new URL(window.location.href).pathname+"#"+hash);
			history[hash] = [url, dataModels];
			session.set("__org_monkshu_router_history", history);
		} else {
			hash = url.substring(url.indexOf('#')+1);
			url = atob(hash);
			if (!history[hash]) history[hash] = [url,"en",{}];
		}
		
		let html = await loadHTML(url, dataModels);
		document.open("text/html");
		document.write(html);
		document.close();
	} catch (err) {throw err}
}

async function loadHTML(url, dataModels, checkSecurity = true) {
	url = new URL(url, window.location).href;       // Normalize
	if (checkSecurity && !securityguard.isAllowed(url)) return "";	// security block

	try {
		let [html, _, i18nObj] = await Promise.all([
			fetch(url, {mode: "no-cors"}).then(response => response.text()), 
			$$.require("/framework/3p/mustache.min.js"), 
			i18n.getI18NObject(session.get($$.MONKSHU_CONSTANTS.LANG_ID))]);

		dataModels["i18n"] = i18nObj;
		
		Mustache.parse(html);
		html = Mustache.render(html,dataModels);

		return html;
	} catch (err) {throw err}
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

	if (url.indexOf('#') == -1) return false;
	
	let hash = url.substring(url.indexOf('#')+1);
	if (!history[hash]) return false; else return true;
}

function reload() {loadPage(window.location.href);}

export const router = {reload, loadPage, loadHTML, isInHistory, runShadowJSScripts};