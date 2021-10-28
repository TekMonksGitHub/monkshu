/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {i18n} from "/framework/js/i18n.mjs";
import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

export async function bootstrap(appPath) {
	$$.MONKSHU_CONSTANTS = MONKSHU_CONSTANTS;
	i18n.init(appPath);
	window.monkshu_env = {components:{}, pageload_funcs:{}, pagedata_funcs:{}, frameworklibs:{}, apps:{}};
	await _loadFrameworkLibs();

	let {application} = await import(`${appPath}/js/application.mjs`);											
	if (application.init instanceof Function) await application.init();	// initialize the application

	application.main();
}

async function _loadFrameworkLibs() {
	const libs = await $$.requireJSON(`${$$.MONKSHU_CONSTANTS.CONFDIR}/frameworklibs.json`);
	for (const lib of libs) window.monkshu_env.frameworklibs[lib] = (await import(`${$$.MONKSHU_CONSTANTS.LIBDIR}/${lib}.mjs`))[lib];
}