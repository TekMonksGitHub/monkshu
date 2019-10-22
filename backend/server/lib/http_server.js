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
	const listener = (req, res) => {
		Object.keys(conf.headers).forEach(header => res.setHeader(header, conf.headers[header]));
		const acceptEncodingHeader = req.headers["accept-encoding"] || "";
		if (conf.enableGZIPEncoding && acceptEncodingHeader.includes("gzip")) { enableGZIPEncoding(req, res); }
	};
	const server = options ? https.createServer(options, listener) : http.createServer(listener);
	server.timeout = conf.timeout;
	exports.connection = server.listen(port, host);
}

const enableGZIPEncoding = (_req, res) => {
	const zlib = require("zlib");

	/* bind response methods */
	const _writeHead = res.writeHead.bind(res);
	const _write = res.write.bind(res);
	const _end = res.end.bind(res);

	/* override response methods */
	res.writeHead = (statusCode, headers) => _writeHead.apply(res, [statusCode, { ...headers, "Content-Encoding": "gzip" }]);
	res.write = (data) => {
		zlib.gzip(data, (error, encodedData) => {
			if (error) { LOG.error(error); return; }		// do not end response; allow timeout
			_write.apply(res, [encodedData]);
			_end.apply(res);
		})
	};
	res.end = () => undefined;		// prevent premature res.end call
};
