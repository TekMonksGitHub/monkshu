/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Query data decoder
 */

const utils = require(CONSTANTS.LIBDIR+"/utils.js");

function decodeIncomingData(apiregentry, url, data, headers, _servObject) {
    if (!utils.parseBoolean(apiregentry.query.get)) return data;  // not query based

    headers["content-type"] = "application/json";   // we always convert query to JSON string

    const searchParams = new URL(url).searchParams;
    const parseIfObject = objToTry => {let ret; try {ret = JSON.parse(objToTry); return ret;} catch(err){return objToTry.toString()}};
    const jsonParams = {}; for (const [key, value] of searchParams) jsonParams[key] = parseIfObject(value);
    return JSON.stringify(jsonParams);
}

module.exports = {decodeIncomingData}