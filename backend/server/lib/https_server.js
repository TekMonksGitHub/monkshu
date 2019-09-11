/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const https = require("https");
const fs = require("fs");
const sslConf = require(`${CONSTANTS.SSLCONF}`);

exports.initSync = initSync;

function initSync(access_control, port, host = "::", timeout) {
    const options = {
        pfx: fs.readFileSync(sslConf.pfxPath),
        passphrase: sslConf.pfxPassphrase
    };

    /* create HTTPS server */
    LOG.info(`Attaching socket listener on ${host}:${port}`);
    let server = https.createServer(options, 
        (_req, res) => res.setHeader("Access-Control-Allow-Origin", access_control?access_control:"*"));
    server.timeout = timeout;
	exports.connection = server.listen(port, host);
};