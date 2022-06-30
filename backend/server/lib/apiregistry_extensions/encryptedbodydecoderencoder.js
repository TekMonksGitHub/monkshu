/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Encrypted data decoder
 */
const crypt = require(CONSTANTS.LIBDIR+"/crypt.js");
const utils = require(CONSTANTS.LIBDIR+"/utils.js");

function decodeIncomingData(apiregentry, _url, data, headers, _servObject) {
    if (!utils.parseBoolean(apiregentry.query.encrypted)) return data;  // not encrypted

    return crypt.decrypt(headers["content-type"].toLowerCase() == "application/json"?JSON.parse(data).data:data,
        apiregentry.query.cryptkey);
}

function encodeResponse(apiregentry, _url, respObj, reqHeaders, _respHeaders, _servObject) {
    if (!utils.parseBoolean(apiregentry.query.encrypted)) return respObj;  // not encrypted

    const sendJSONBack = APIREGISTRY.getExtension("JSONDecoderEncoder").acceptsJSON(apiregentry, reqHeaders);

    return sendJSONBack ? JSON.stringify({data: crypt.encrypt(respObj, apiregentry.query.cryptkey)}) : crypt.encrypt(
        respObj, apiregentry.query.cryptkey);
}

module.exports = {decodeIncomingData, encodeResponse}