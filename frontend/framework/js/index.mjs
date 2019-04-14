/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

export async function getDefaultRedirect() {
	try {
		let defaultApp = await $$.requireJSON("/framework/conf/default_app.json");
		if (defaultApp) return `/apps/${defaultApp}/index.html`; else return null;
	} catch (err) {return null};
}