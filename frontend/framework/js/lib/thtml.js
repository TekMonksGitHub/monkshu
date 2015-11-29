/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// Constructors and public functions
//
// Note: i18N is a reserved JSON parameter to
// support internationalization. So if your object
// contains a first level member object called i18n
// it will be cloberred. 
////////////////////////////////////////////////    

$$.loadthtml = function(url, obj) {
	$$.session().put("$$__thtml_last_url", url);
	$$.session().put("$$__thtml_last_obj", obj);
	
	$$._thtmlparsePage(url, obj, function(html) {$$._thtmlloadhtml(html);});
};

$$.refresh = function() {
	$$.loadthtml($$.session().get("$$__thtml_last_url"), 
		$$.session().get("$$__thtml_last_obj"));
};

////////////////////////////////////////////////
// Private functions
////////////////////////////////////////////////  
$$._thtmlparsePage = function(url, obj, callback) {
	$$.get(url, function(resp) {
		html = $$._thtmlcompileWithI18N(resp, obj);
		callback(html);
	});
};

$$._thtmlcompileWithI18N = function(html, obj) {
	Mustache.parse(html);
	if ((obj === undefined) || (obj === null)) obj = {};
	obj.i18n = $$.S_I18N_VAR.i18n;
	
	var rendered = Mustache.render(html, obj);
	
	return rendered;
};

$$._thtmlloadhtml = function(html) {
	// now we are going to replace the page
	document.documentElement.innerHTML = html;
 
	// Including script files (as innerHTML does not execute the script and css included)
	var scriptToInclude = document.getElementsByTagName('script');
	for (var n = 0; n < scriptToInclude.length; n++) {
		if (scriptToInclude[n].src !== "") $$.get(scriptToInclude[n].src, function(src) {
	  		if (src !== undefined) window.eval(src); });
	  	else
	  		window.eval(scriptToInclude[n].innerHTML);
  	}
 
	// Including css files
   	var styleToInclude = document.getElementsByTagName('link');
   	for (var n = 0; n < styleToInclude.length; n++)
   		document.head.appendChild(styleToInclude[n]);

};
