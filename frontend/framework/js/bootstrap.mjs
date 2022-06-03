/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {MONKSHU_CONSTANTS} from "/framework/js/constants.mjs";

export async function bootstrap(appPath) {
	$$.MONKSHU_CONSTANTS = MONKSHU_CONSTANTS; window.monkshu_env = {components:{}, frameworklibs:{}, apps:{}};

	const i18n = (await import("/framework/js/i18n.mjs")).i18n; i18n.init(appPath);
	const router = (await import("/framework/js/router.mjs")).router; router.init();
	await _loadFrameworkLibs();

	let hostname; try {hostname = await $$.requireJSON(`${appPath}/conf/hostname.json`);} catch (err) {try {await $$.requireJSON(`/framework/conf/hostname.json`);} catch (err){}}

	let {application} = await import(`${appPath}/js/application.mjs`);											
	if (application.init instanceof Function) await application.init(hostname);	// initialize the application

	application.main();
}

async function _loadFrameworkLibs() {
	const libs = await $$.requireJSON(`${$$.MONKSHU_CONSTANTS.CONFDIR}/frameworklibs.json`);
	for (const lib of libs) window.monkshu_env.frameworklibs[lib] = (await import(`${$$.MONKSHU_CONSTANTS.LIBDIR}/${lib}.mjs`))[lib];
}