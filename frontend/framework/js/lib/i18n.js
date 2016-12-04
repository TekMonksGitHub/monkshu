/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$.lang = function(lang, doRefresh) {
	$$.session().put($$.LANGUAGE, lang);
	$$._initI18N(function() {
		if ((doRefresh != null) && (!doRefresh)) return;
		else $$.refresh();
	});
};

$$._initI18N = function (callback) {
	
	if ($$.session().get($$.LANGUAGE) == null)
		$$.session().put($$.LANGUAGE, "en");
		
	var lang = $$.session().get($$.LANGUAGE);
	
	$$.get($$.S_I18N_FRAMEWORK_PREFIX+lang+$$.S_I18N_EXTENSION, function(json){
		if (json !== undefined) var i18nFR = JSON.parse(json);
		$$.get($$.S_I18N_APP_PREFIX+lang+$$.S_I18N_EXTENSION, function(json){
			if (json !== undefined) var i18nAR = JSON.parse(json);
			addi18NVariables(i18nFR, i18nAR);
			callback();
		});
	});
}

function addi18NVariables(i18nFR, i18nAR) {
	if (i18nFR !== undefined) {
		var i18nFramework = {};
		i18nFramework["i18n"] = {};
		for (var attrname in i18nFR) i18nFramework.i18n[attrname] = i18nFR[attrname];
	}
	
	if (i18nAR !== undefined) {
		var i18nApp = {};
		i18nApp["i18n"] = {};
		for (var attrname in i18nAR) i18nApp.i18n[attrname] = i18nAR[attrname];
	}
	
	if ((i18nFramework !== undefined) && (i18nApp !== undefined)) {
		$$.S_I18N_VAR = i18nFramework;
		for (var attrname in i18nApp.i18n) { $$.S_I18N_VAR.i18n[attrname] = i18nApp.i18n[attrname]; }
	} else if (i18nFramework !== undefined) {
		$$.S_I18N_VAR = i18nFramework;
	} else if (i18nApp !== undefined) {
		$$.S_I18N_VAR = i18nApp;
	}
}
