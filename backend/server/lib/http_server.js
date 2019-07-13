/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");

exports.initSync = initSync;

function initSync(access_control, port, host="::", timeout) {
	access_control?access_control:"*";

	/* create HTTP server */
	LOG.info(`Attaching socket listener on ${host}:${port}`);
	let server = http.createServer((_req, res) => {res.setHeader("Access-Control-Allow-Origin", access_control);});
	server.timeout = timeout;
	exports.connection = server.listen(port, host);
}
