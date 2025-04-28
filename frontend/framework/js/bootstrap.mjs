/**
 * Boots the Monkshu framework 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {constants} from "/framework/js/constants.mjs";
import {log} from "/framework/js/log.mjs";

export async function bootstrapMonkshu() {
	$$.MONKSHU_CONSTANTS = constants; 
	if (!window.monkshu_env) window.monkshu_env = {};
	for (const requiredEnvObject of ["components", "frameworklibs", "apps"])
		if (!window.monkshu_env[requiredEnvObject]) window.monkshu_env[requiredEnvObject] = {};
	$$.LOG = log;

	const router = (await import("/framework/js/router.mjs")).router; await router.init();
	await _loadFrameworkLibs();
}

export async function bootstrapApp(appPath, confPath) {
	const i18n = (await import("/framework/js/i18n.mjs")).i18n; await i18n.init(appPath.href);

	let hostname; try {hostname = await $$.requireJSON(`${confPath||(appPath+"/conf")}/hostname.json`);} catch (err) {try {await $$.requireJSON(`/framework/conf/hostname.json`);} catch (err){}}

	let {application} = await import(`${appPath}/js/application.mjs`);											
	if (application.init instanceof Function) await application.init(hostname);	// initialize the application

	application.main();
}

async function _loadFrameworkLibs() {
	const libs = (await $$.requireJSON($$.MONKSHU_CONSTANTS.CONFIG_MAIN)).frameworklibs;
	for (const lib of libs) {
		window.monkshu_env.frameworklibs[lib] = (await import(`${$$.MONKSHU_CONSTANTS.LIBDIR}/${lib}.mjs`))[lib];
		$$[`lib${lib}`] = window.monkshu_env.frameworklibs[lib];
	}
}