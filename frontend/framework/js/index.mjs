/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

export async function getDefaultRedirect() {
	try {
		let defaultApp = await $$.requireJSON("/framework/conf/default_app.json");
<<<<<<< HEAD
		if (defaultApp) return `./apps/${defaultApp}/index.html`; else return null;
	} catch (err) { return null };
=======
		if (defaultApp) return `/apps/${defaultApp}/index.html`; else return null;
	} catch (err) {return null};
>>>>>>> 9428254d4c722e30248515155dabae813caa0e9e
}