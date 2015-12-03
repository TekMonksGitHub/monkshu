# monkshu
The Monkshu Project
Monkshu - The HTML5/REST/JSON/Node.js/API Application Server
================================================================
HTML5 + Node.js + REST + Mobile (Android/iOS) + Globalization (i18n) support.

Login, logout, cookieless sessions supported out of the box.

Mustache logicless templates used, as they work with JSON objects to inflate views in a non-complicated manner,
and also allow full HTML5+CSS3 design capabilites instead of coming up with some complicated widget framework.

Hello World in Monkshu
======================
Option 1 - Easiest
	
(1) Install node.js 
	
(2) Download the Monkshu server distributable to a path on your desktop, let assume this is [monkshu]
	
(3) Create a file called <name>.thtml for example, main.html and place it at this path
```[monkshu]/frontend/app/main.thtml```. Add the following HTML to it

```
<html>
<head><title>Hello</title></head>
<body>Hello World</body>
</html>
```

(4) Create a file named Application.js at this path ```[monkshu]/frontend/app/js/Application.js```

(5) Implement this function in Application.js
```
	Application.main = function() {
	// Entry point for the application
	$$.loadthtml(“/app/main.thtml”, {});
};
```
(6) Start the front-end HTTP server using this command:
```[monkshu]/frontend/server/node.js server.js```

(7) Run the web browser and point it to http://localhost:8080


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
4. That's it - run the node.js server - ```node server.js```
5. Call the service from web framework using this code
```
	REST.call(URL, req, function(resp){handleJSONResult(resp);});
	
	where handleJSONResult is your function which can consume this JSON result
	req and resp are both Javascript objects
```
Login password
==============
Login ID: Hello

Login Password: 123

Add Header set Access-Control-Allow-Origin <your frontend> to resolve cross-origin errors.


