/* 
 * (C) 2018-2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";

const i18n_SESSION_KEY = "__org_monkshu_i18n_app_paths",
	APP_PATHS_SESSION_KEY = "__org_monkshu_i18n_app_paths";

const init = appPathsIn => {
	for (const appPath of Array.isArray(appPathsIn)?appPathsIn:[appPathsIn]) addPath(appPath); }

const addPath = additionalPath => {
	const appPaths = session.get(APP_PATHS_SESSION_KEY)||[];
	if (appPaths.includes(additionalPath)) return; 
	appPaths.push(additionalPath); _setI18NSessionObject({});	/* need to recache */
	session.set(APP_PATHS_SESSION_KEY, appPaths);
}

const getRendered = async (key, data, language=getSessionLang(), refresh=false) => (await router.getMustache()).render(
	await get(key, language, refresh), data);

async function get(key, language=getSessionLang(), refresh=false) {
	try {
		const i18nObject = await getI18NObject(language, refresh);
		return i18nObject[key]
	} catch (err) {throw err}
}

async function getI18NObject(language=getSessionLang(), refresh=false) {
	const appPaths = session.get(APP_PATHS_SESSION_KEY), i18nCached = _getI18NSessionObject();
	if ((!i18nCached[language]) || refresh) {
		i18nCached[language] = {i18n:{}};
		for (const appPath of appPaths) {
			const i18nThisAppPath = `${appPath}/i18n/i18n_${language}.mjs`;
			try {
				const i18nBundle = await import(i18nThisAppPath);
				i18nCached[language].i18n = {...i18nCached[language].i18n, ...i18nBundle.i18n};
			} catch (err) {LOG.error(`Error importing i18n bundle for apppath ${appPath}. Error is ${err}.`);}
		}
		_setI18NSessionObject(i18nCached);
	} 

	return i18nCached[language].i18n;
}

const setI18NObject = (language, i18n) => {
	const i18nCached = _getI18NSessionObject();
	i18nCached[language] = {i18n:{...i18nCached[language].i18n, ...i18n}};
	_setI18NSessionObject(i18nCached);
}

const getSessionLang = _ => (session.get($$.MONKSHU_CONSTANTS.LANG_ID) || "en").toString();

const setSessionLang = lang => session.set($$.MONKSHU_CONSTANTS.LANG_ID, lang||"en");

const _getI18NSessionObject = _ => session.get(i18n_SESSION_KEY, {});
const _setI18NSessionObject = i18nCached => session.set(i18n_SESSION_KEY, i18nCached);


export const i18n = {init, get, getRendered, getI18NObject, setI18NObject, getSessionLang, setSessionLang, addPath};