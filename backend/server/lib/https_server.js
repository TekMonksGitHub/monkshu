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

function initSync(port, host = "::") {
    /* create HTTPS server */
    LOG.info(`Attaching socket listener on ${host}:${port}`);
    exports.connection = https.createServer(options, (_req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }).listen(port, host);
};