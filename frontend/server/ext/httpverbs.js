/** 
 * Proxy extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */

const fs = require("fs");
const path = require("path");
const fspromises = fs.promises;
const utils = require(conf.libdir+"/utils.js");

exports.name = "httpverbs";
exports.processRequest = async (req, res, dataSender, errorSender, codeSender, access, error, etagGenerator) => {
    if (req.method.trim().toLowerCase() == "head") return processHeadVerb(req, res, dataSender, errorSender, codeSender, access, error, etagGenerator);
    else return false;
}

async function processHeadVerb(req, res, dataSender, errorSender, codeSender, _access, _error, etagGenerator) {
    const pathname = new URL(req.url, `http://${utils.getServerHost(req)}/`).pathname;
    const fileRequested = path.resolve(`${conf.webroot}/${pathname}`);
    try {
        await fspromises.access(fileRequested, fs.constants.R_OK);	// test file can be read
        let stats = await fspromises.stat(fileRequested);
        if (stats.isDirectory()) { 
            fileRequested += "/" + conf.indexfile;
            stats = await fspromises.stat(fileRequested);
        }

        let mime = conf.mimeTypes[path.extname(fileRequested)]; if (mime && (!Array.isArray(mime))) mime = [mime];
        const headers = {}; if (mime) headers["Content-Type"] = mime[0];
        
        const eTagsMatch = utils.etagsMatch(req.headers["if-none-match"], etagGenerator(stats));
        dataSender(req, res, headers, stats, eTagsMatch?Buffer.from("Not changed"):undefined, undefined, eTagsMatch?304:200);
    } catch (err) {errorSender(req, res, 404, "Path Not Found.");}   
    return true;
}