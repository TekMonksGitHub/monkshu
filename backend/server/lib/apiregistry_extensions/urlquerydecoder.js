/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Query data decoder
 */

const querystring = require('querystring');
const utils = require(CONSTANTS.LIBDIR+"/utils.js");

function decodeIncomingData(apiregentry, url, data, headers, _servObject) {
    if (!utils.parseBoolean(apiregentry.query.get)) return data;  // not query based

    headers["content-type"] = "application/json";   // we always convert query to JSON string

    const urlParsed = new URL(url);
    return JSON.stringify(querystring.parse(urlParsed.search!=""?urlParsed.search.substring(1):""));
}

module.exports = {decodeIncomingData}