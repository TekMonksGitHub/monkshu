/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const http = require("http");
const https = require("https");

exports.doService = doService;

async function doService(req) {
    let caller = http;
    if (new URL(req.url).protocol == "https:") caller = https;

    return new Promise((resolve, _) => {
        if (!req.url) resolve(CONSTANTS.FALSE_RESULT);

        let responseString = "";
        let httpReq = caller.request(req.url, res => {
            res.setEncoding("utf8");
            res.on("data", d => responseString += d);
            res.on("end", _ => resolve({ "result": true, "data": responseString }));
            res.on("error", _ => resolve(CONSTANTS.FALSE_RESULT));
        });
        httpReq.write();
        httpReq.end();
        httpReq.on("error", _ => resolve(CONSTANTS.FALSE_RESULT));
    })
}
