# monkshu
The Monkshu Project
Monkjutsu - The HTML5/REST/JSON/Node.js/API Application Server
================================================================
HTML5 + Node.js + REST + Mobile (Android/iOS) + Globalization (i18n) support.

Login, logout, cookieless sessions supported out of the box.

Mustache logicless templates used, as they work with JSON objects to inflate views in a non-complicated manner,
and also allow full HTML5+CSS3 design capabilites instead of coming up with some complicated widget framework.

Hello World or creating a simple app
====================================
1. Copy to a new folder.
2. Setup the HTTP server 
3. Fix the constants in app/js/constants.js
4. Add all template HTML and HTML files to /app, end templates with .thtml extension, static HTML files with .html
5. Implement Application.main in app/js/Application.js
6. Pre-built login, session logic uses a double hashed directory name under db/user folder to login
7. Can modify error.html, index.html and framework/login.thtml to modify the application look and feel
8. Add i18n bundles under app/i18n as shown

Create a new JSON Service
=========================
1. Add JSON service file to /services/code, name as s_<purpose of the service>.js
2. Add the service to the REST registry, under /conf/service_registry.json with a URL mapped to it.
3. Implement the following method and export it
```
	exports.doService = doService;

	function doService(jsonReq, callback) {
		// add your REST code here
		//
		// jsonReq is the incoming request as a Javascript object 
		//
		// return the final result as a JSON object 
		// using callback(my_Result_JSON_Object) where
		// my_Result_JSON_Object is your result as a Javascript
		// object
	}
```
4. That's it - run the node.js server - node server.js
5. Call the service from web framework using this code
```
	REST.call(URL, req, function(resp){handleLoginResult(resp);});
	
	where handleJSONResult is your function which can consume this JSON result
	req and resp are both Javascript objects
```
Login password
==============
Login phrase: Hello 123

Add Header set Access-Control-Allow-Origin <your frontend> to resolve cross-origin errors.


