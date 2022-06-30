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
    catch (err) {LOG.error(`JSON parsing error: ${err}.`); LOG.error(`Incoming JSON was: ${data}`); throw err;}
}

function encodeResponse(apiregentry, _url, respObj, reqHeaders, respHeaders, _servObject) {
    if (!acceptsJSON(apiregentry, reqHeaders)) return respObj;   // can't handle

    if (utils.getObjectKeyValueCaseInsensitive(respHeaders,"Content-Type").toLowerCase() != "application/json") return respObj;   // can't handle

    return JSON.stringify(respObj);
}

function acceptsJSON(apiregentry, reqHeaders) {
    const acceptedEncodings = (utils.getObjectKeyValueCaseInsensitive(reqHeaders,"Accept") || "").toLowerCase().split(",");
    let failedEncodings = 0; for (let acceptedEncoding of acceptedEncodings) {
        acceptedEncoding = acceptedEncoding.split(";")[0];
        if (acceptedEncoding != "application/json" && acceptedEncoding != "application/*" && 
            acceptedEncoding != "*/*" || apiregentry.query.notRESTAPI) failedEncodings++;
    }
    if (failedEncodings == acceptedEncodings.length) return false; else return true;
}

module.exports = {decodeIncomingData, encodeResponse, acceptsJSON}