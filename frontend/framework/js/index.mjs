/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

export async function getDefaultRedirect() {
	try {
		const defaultApp = await $$.requireJSON("/framework/conf/default_app.json");
		if (defaultApp) {
			try{ return new URL(defaultApp[window.location.host]?defaultApp[window.location.host]:defaultApp).href } 
			catch (err) { if (typeof defaultApp === "string") return `/apps/${defaultApp}/index.html`; else return null; }
		} else return null;
	} catch (err) {return null};
}

export async function getRelease() {
	try {
		const release = await(await fetch("http://localhost:9090/__org_monkshu__release")).json();
		return release;
	} catch (err) {return "Error fetching release\n"+err.toString();}
}