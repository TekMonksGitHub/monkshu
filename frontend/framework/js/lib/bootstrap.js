$$.__bootstrap = function() {
	$$.log = new $$.Log();												// setup the global logger
	if (Application.init instanceof Function) {Application.init();};	// initialize the application
	$$._initI18N();														// initialize globalization
	document.title = $$.S_I18N_VAR.i18n.Title;							// setup page title
	$$.doIndexNavigation();												// do index navigation
};
