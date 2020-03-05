/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Query data decoder
 */
const urlMod = require("url");

function decodeIncomingData(apiregentry, url, data, headers, _servObject) {
    if (!apiregentry.query.get || !apiregentry.query.get.toLowerCase() === "true") return data;  // not query based

    headers["Content-Type"] = "application/json";   // we always convert query to JSON string

    return JSON.stringify(urlMod.parse(url, true).query);
}

module.exports = {decodeIncomingData}