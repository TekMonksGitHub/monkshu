/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

import {xhr} from "/framework/js/xhr.mjs";
import {session} from "/framework/js/session.mjs";
import {i18n} from "/framework/js/i18n.mjs";

const DOM_PARSER = new DOMParser();

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
		
		loadComponent(history[hash][0], document.documentElement, history[hash][1]);
	} catch (err) {throw err}
}

async function loadComponent(url, element, dataModels={}) {
	try {
		url = new URL(url, window.location).href;        // Normalize
		let [html,_, i18nObj] = await Promise.all([
			xhr.get(url), $$.require("/framework/3p/mustache.min.js"), i18n.getI18NObject(session.get(APP_CONSTANTS.LANG_ID))]);
		dataModels["i18n"] = i18nObj;
		
		Mustache.parse(html);
		html = Mustache.render(html,dataModels);

		// Including script files (as innerHTML does not execute the script included)
		let scriptsToInclude = Array.from(DOM_PARSER.parseFromString(html, "text/html").getElementsByTagName("script"));
		if (scriptsToInclude) scriptsToInclude.forEach(async scriptThis => {
			if (scriptThis.src && scriptThis.src !== "") await $$.require(scriptThis.src);
			else {
				let script = document.createElement("script");
				script.type = scriptThis.type;
				script.text = `${scriptThis.innerText}\n//# sourceURL=${url}`;
				document.head.appendChild(script).parentNode.removeChild(script);
			}
		});

		element.innerHTML = html;
	} catch (err) {throw err}
}

function isInHistory(url) {
	let history = session.get("__org_monkshu_router_history");
	if (!history) return false;

	if (url.indexOf('#') == -1) return false;
	
	let hash = url.substring(url.indexOf('#')+1);
	if (!history[hash]) return false; else return true;
}

function reload() {loadPage(window.location.href);}

export const router = {reload, loadPage, loadComponent, isInHistory};