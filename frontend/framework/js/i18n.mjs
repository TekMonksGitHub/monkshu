/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

let i18nCached = {};
let appPath;

function init(appPathIn) {
	appPath = appPathIn;
}

async function get(key, language="en", refresh=false) {
	try {
		let i18nObject = await getI18NObject(language, refresh);
		return i18nObject[key]
	} catch (err) {throw err}
}

async function getI18NObject(language="en", refresh=false) {
	if (!i18nCached[language] || refresh) {
		let result = await to(import(`${appPath}/i18n/i18n_${language}.mjs`));
		if (!result.err) i18nCached[language] = result.data.i18n; else throw result.err;
	} 
	
	return i18nCached[language];
}

export const i18n = {init, get, getI18NObject};