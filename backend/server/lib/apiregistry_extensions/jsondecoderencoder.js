/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * JSON data decoder
 */

const utils = require(CONSTANTS.LIBDIR+"/utils.js");

function decodeIncomingData(apiregentry, _url, data, headers, _servObject) {
    if (!headers["content-type"] || headers["content-type"].toLowerCase() != "application/json" || 
        apiregentry.query.notRESTAPI) return data;   // can't handle or query based

    try{return JSON.parse(data);} 
    catch (err) {LOG.error(`JSON parsing error: ${err}, sending back unparsed data.`); return data;}
}

function encodeResponse(apiregentry, _url, respObj, reqHeaders, respHeaders, _servObject) {
    const acceptedEncodings = (utils.getObjectKeyValueCaseInsensitive(reqHeaders,"Accept") || "").toLowerCase();
    if (acceptedEncodings != "application/json" && acceptedEncodings != "application/*" && 
        acceptedEncodings != "*/*" || apiregentry.query.notRESTAPI) return respObj;   // can't handle

    if (utils.getObjectKeyValueCaseInsensitive(respHeaders,"Content-Type").toLowerCase() != "application/json") return respObj;   // can't handle

    return JSON.stringify(respObj);
}

module.exports = {decodeIncomingData, encodeResponse}