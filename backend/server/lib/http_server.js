/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var http = require("http");

exports.init = init;

function init(port, host = "::") {
	/* create HTTP server */
	LOG.info(`Attaching socket listener on ${host}:${port}`);
	exports.connection = http.createServer((_req, res) => {
		res.setHeader("Access-Control-Allow-Origin", "*");
	}).listen(port, host);
}
