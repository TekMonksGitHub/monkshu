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