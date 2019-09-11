/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const conf = require(`${CONSTANTS.HTTPDCONF}`);

exports.initSync = initSync;

function initSync(port, host="::") {
	let options = conf.ssl ? {pfx: fs.readFileSync(conf.pfxPath), passphrase: conf.pfxPassphrase} : null;
	
	/* create HTTP/S server */
	LOG.info(`Attaching socket listener on ${host}:${port}`);
	let listener = (_req, res) => Object.keys(conf.headers).forEach(header => res.setHeader(header, conf.headers[header]));
	let server = options ? http.createServer(options, listener) : http.createServer(listener);
	server.timeout = conf.timeout;
	exports.connection = server.listen(port, host);
}
