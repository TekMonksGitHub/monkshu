/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const https = require("https");
const fs = require("fs");

const sslConf = require(`${CONSTANTS.SSLCONF}`);
const options = {
    key: fs.readFileSync(sslConf.keyPath),
    cert: fs.readFileSync(sslConf.certPath)
};

exports.initSync = initSync;

function initSync(access_control, port, host = "::") {
    access_control?access_control:"*";

    /* create HTTPS server */
    LOG.info(`Attaching socket listener on ${host}:${port}`);
    let server = https.createServer(options, (_req, res) => {res.setHeader("Access-Control-Allow-Origin", "*");});
    server.timeout = timeout;
	exports.connection = server.listen(port, host);
};