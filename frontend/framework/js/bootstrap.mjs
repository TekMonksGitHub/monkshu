/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

import {i18n} from "/framework/js/i18n.mjs";

export async function bootstrap(appPath) {
	i18n.init(appPath);

	let {application} = await import(`${appPath}/js/application.mjs`);											
	if (application.init instanceof Function) await application.init();	// initialize the application

	application.main();
}
