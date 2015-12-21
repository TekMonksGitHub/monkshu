# monkshu
The Monkshu Project
Monkshu - The HTML5/REST/JSON/Node.js/API Enterprise Application Server
=======================================================================
A complete Enterprise Application Server for Mobile apps (iOS and Android), Responsive HTML 5 Apps, and JSON API services. Consists of web container (called frontend), JSON API container (called backend), and hybrid iOS and Android app frameworks. Utilizing KNEX framework for database SQL query generation (optional). 

The idea is to produce a full Enterprise Application Sever based on Node.js, HTML5, Javascript, Android and iOS apps with KNEX for database querying. 

Single unified codebase, with minimum external dependencies - currently the only real major dependency is KNEX for DB query generation (if needed, else optional).

HTML5 + Node.js + REST + Mobile (Android/iOS) + Database (MySQL, Oracle, etc. using KNEX) + Globalization (i18n) support.

Login, logout, cookieless sessions supported out of the box.

Mustache logicless templates used, as they work with JSON objects to inflate views in a non-complicated manner,
and also allow full HTML5+CSS3 design capabilites instead of coming up with some complicated widget framework.

Hello World in Monkshu
======================
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

(5) Implement the following functions in Application.js
```
	function Application() {}
	
	Application.init = function() { 
		$$.loginRequired(false);
	}
	
	Application.main = function() {
		// Entry point for the application
		$$.loadthtml(“/app/main.thtml”, {});
	};
```
(6) Implement the following two constants in ```[monkshu]/frontend/app/js/constants.js```. These inform the framework what the server URLs are for backend as well as the frontend:

```
/////////////////////////////////////////////////////
// All the constants used by the application
/////////////////////////////////////////////////////

$$.S_FRONTEND = "http://localhost:8080";
$$.S_NODE = "http://localhost:3800";
```

(7) Start the front-end HTTP server using this command:
```[monkshu]/frontend/server/node.js server.js```

(8) Run the web browser and point it to ```http://localhost:8080```


Create a new JSON Service
=========================
(1) Add JSON service file to ```/backend/server/services/```, name as s_[purpose of the service].js, e.g. ```s_hello.js```

(2) Add the service to the REST registry, under ```/conf/service_registry.json``` with a URL mapped to it.

(3) Implement the following method and export it
```
	exports.doService = doService;

	function doService(jsonReq, callback) {
		// add your REST code here
		//
		// jsonReq is the incoming request as a Javascript object 
		//
		// return the final result as a Javascript object 
		// using callback(my_Result_Javascript_Object) where
		// my_Result_Javascript_Object is your result as a Javascript
		// object
		
		callback(my_Result_Javascript_Object);
	}
```

(4) That's it - run the node.js server using these steps:
```
cd backend/server
node server.js
```

(5) Call the service from web framework using this code
```
	$$.rest(URL, req, function(resp){handleJSONResult(resp);});
	
	where handleJSONResult is your function which can consume this JSON result
	req and resp are both Javascript objects
```

Login password
==============
Login ID: Hello

Login Password: 123

Add Header set Access-Control-Allow-Origin [your frontend] to resolve cross-origin errors.


