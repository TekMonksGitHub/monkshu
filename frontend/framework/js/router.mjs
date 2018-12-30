/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

import {xhr} from "/framework/js/xhr.mjs";
import {session} from "/framework/js/session.mjs";
import {i18n} from "/framework/js/i18n.mjs";

const DOM_PARSER = new DOMParser();

async function loadPage(url, language = "en", dataModels = {}) {
	try {
		loadComponent(url, document.documentElement, language, dataModels);
		session.set("__org_monkshu_router_last_page", [url, language, dataModels]);
	} catch (err) {throw err}
}

async function loadComponent(url, element, language = "en", dataModels) {
	try {
		url = new URL(url, window.location).href;        // Normalize

		let [html,_, i18nObj] = await Promise.all([
			xhr.get(url), $$.require("/framework/3p/mustache.min.js"), i18n.getI18NObject(language)]);
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

const reload = (language = session.get("__org_monkshu_router_last_page")[1]) => loadPage(session.get("__org_monkshu_router_last_page")[0], 
	language, session.get("__org_monkshu_router_last_page")[2]);

export const router = {loadPage, loadComponent, reload};