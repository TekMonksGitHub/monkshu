/* 
 * (C) 2018-2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {session} from "/framework/js/session.mjs";

const i18n_SESSION_KEY = "__org_monkshu_i18n_session_key__", APP_PATHS_SESSION_KEY = "__org_monkshu_i18n_app_paths";

const init = appPathsIn => {
	for (const appPath of Array.isArray(appPathsIn)?appPathsIn:[appPathsIn]) addPath(appPath); }

const addPath = additionalPath => {
	const appPaths = session.get(APP_PATHS_SESSION_KEY)||[];
	if (appPaths.includes(additionalPath)) return; 
	appPaths.push(additionalPath); 
	session.set(APP_PATHS_SESSION_KEY, appPaths);

	const i18nObject = _getI18NSessionObject(); i18nObject.reload = true;
	_setI18NSessionObject(i18nObject);	/* need to recache */
}

const getRendered = async (key, data, language=getSessionLang(), refresh=false) => {
	const {router} = await import("/framework/js/router.mjs");
	return (await router.getMustache()).render(await get(key, language, refresh), data); 
}

async function get(key, language=getSessionLang(), refresh=false) {
	try {
		const i18nObject = await getI18NObject(language, refresh); 
		return i18nObject[key];
	} catch (err) {throw err}
}

async function getI18NObject(language=getSessionLang(), refresh=false) {
	const appPaths = session.get(APP_PATHS_SESSION_KEY), i18nCached = _getI18NSessionObject();
	
	if ((!i18nCached) || (i18nCached.reload) || (!i18nCached[language]) || refresh || _debugReloadNeeded()) {
		i18nCached[language] = (_debugReloadNeeded && i18nCached && i18nCached[language])?i18nCached[language]:{i18n:{}}; 
		if (appPaths) for (const appPath of appPaths) {
			const i18nThisAppPath = `${appPath}/i18n/i18n_${language}.mjs`;
			try {
				const i18nBundle = await import(i18nThisAppPath), loadedBundle = i18nBundle.i18n, 
					cachedObject = i18nCached[language].i18n;
				i18nCached[language].i18n = {...cachedObject, ...loadedBundle};
			} catch (err) {$$.LOG.error(`Error importing i18n bundle for apppath ${appPath}. Error is ${err}.`);}
		}
		i18nCached.reload = false;
		_setI18NSessionObject(i18nCached);
	} 

	return i18nCached[language].i18n;
}

const setI18NObject = async (language, i18n) => {
	const i18nCachedLanguage = await getI18NObject(language);
	const newi18nCachedLanguage = {...i18nCachedLanguage, ...i18n};
	const cached18nSessionObject = _getI18NSessionObject();
	cached18nSessionObject[language].i18n = newi18nCachedLanguage;
	_setI18NSessionObject(cached18nSessionObject);
}

const getSessionLang = _ => (session.get($$.MONKSHU_CONSTANTS.LANG_ID) || "en").toString();

const setSessionLang = lang => session.set($$.MONKSHU_CONSTANTS.LANG_ID, lang||"en");

const _getI18NSessionObject = _ => session.get(i18n_SESSION_KEY, {});
const _setI18NSessionObject = i18nCached => session.set(i18n_SESSION_KEY, i18nCached);
const _debugReloadNeeded = _ => {
	const navigationType = window.performance?(window.performance.getEntriesByType("navigation")[0]).type:undefined;
	if (navigationType == "reload" && (
		$$.MONKSHU_CONSTANTS.getDebugLevel() == $$.MONKSHU_CONSTANTS.DEBUG_LEVELS.refreshOnReload || 
		$$.MONKSHU_CONSTANTS.getDebugLevel() == $$.MONKSHU_CONSTANTS.DEBUG_LEVELS.refreshAlways)) return true;
	return false; 
}


export const i18n = {init, get, getRendered, getI18NObject, setI18NObject, getSessionLang, setSessionLang, addPath};