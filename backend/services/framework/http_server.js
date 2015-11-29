/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

var http = require("http");

exports.init = init;

function init(port) {
	/* create HTTP server */
	log.info("Attaching socket listener on port: " + port);
	exports.httpd = http.createServer(function(req, res) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.writeHead(200, {"Content-Type" : "application/json"});
	}).listen(port);
}
