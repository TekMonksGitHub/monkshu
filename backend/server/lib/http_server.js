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
	let server = http.createServer(options, (_req, res) => 
		Object.keys(conf.headers).forEach(header => res.setHeader(header, conf.headers[header])));
	server.timeout = conf.timeout;
	exports.connection = server.listen(port, host);
}
