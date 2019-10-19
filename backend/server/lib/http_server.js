/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const conf = require(`${CONSTANTS.HTTPDCONF}`);

exports.initSync = initSync;

function initSync(port, host = "::") {
	const options = conf.ssl ? { pfx: fs.readFileSync(conf.pfxPath), passphrase: conf.pfxPassphrase } : null;

	/* create HTTP/S server */
	LOG.info(`Attaching socket listener on ${host}:${port}`);
	const listener = (_req, res) => Object.keys(conf.headers).forEach(header => res.setHeader(header, conf.headers[header]));
	const server = options ? https.createServer(options, listener) : http.createServer(listener);
	server.timeout = conf.timeout;
	exports.connection = server.listen(port, host);
}
