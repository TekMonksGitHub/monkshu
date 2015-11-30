/* 
 * A very simple, static http GET server. Do not use in production.
 * 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

/* Modules required */
var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");
var winston = require("winston");

/* Configuration - Can change ports, webroot etc. here */
var port = 8080;
var webroot = path.resolve(__dirname+"/../");
var logdir = __dirname + "/logs";
var accesslog = logdir + "/access.log.json";
var errorlog = logdir + "/error.log.json";
var indexfile = "index.html";
var mimeTypes = {
    ".html": "text/html",
    ".htm": "text/html",
    ".thtml": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".otf" : "application/x-font-opentype",
    ".ttf" : "pplication/x-font-truetype"
};

/* Init - Server bootup */
console.log("Starting...");
console.log("Initializing the logs.");

/* Init logging */
if (!fs.existsSync(logdir)) {fs.mkdirSync(logdir);}
	
var access = new (winston.Logger)({
	transports: [ 
		new winston.transports.File({ 
			filename: accesslog,
			maxsize: 1024 * 1024 * 100 // 100MB
		})
	]
});

var error = new (winston.Logger)({
	transports: [ 
		new winston.transports.File({ 
			filename: errorlog,
			maxsize: 1024 * 1024 * 100 // 100MB
		})
	]
});

/* Start http server */
var httpd = http.createServer(function(req, res) {
	access.info("GET: " + req.url);
	
	var fileRequested = webroot + "/" + url.parse(req.url).pathname;
	
	fs.exists(fileRequested, function(exists) {
	    if(!exists) {
	    	error.error("404: " + req.url);
	    	res.writeHead(404, {"Content-Type": "text/plain"});
	    	res.write("404 Path Not Found.\n");
	    	res.end();
	    	return;
	    }
	
		if (fs.statSync(fileRequested).isDirectory()) fileRequested += "/" + indexfile;
	 
		fs.readFile(fileRequested, "binary", function(err, file) {
			if(err) {
				error.error("500: " + err);
      			res.writeHead(500, {"Content-Type": "text/plain"});
        		res.write(err + "\n");
        		res.end();
        		return;
      		}
      	
	      	access.info("Sending: " + fileRequested);
	      	var headers = {};
	      	var mime = mimeTypes[path.extname(fileRequested)];
	      	if (mime) headers["Content-Type"] = mime;
	      	res.writeHead(200, headers);
	      	res.write(file, "binary");
	      	res.end();
	    });
	});
	 
}).listen(port);

access.log("Server started on port: " + port);
console.log("Server started on port: " + port);
