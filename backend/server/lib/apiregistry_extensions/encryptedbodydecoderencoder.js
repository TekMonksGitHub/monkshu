/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Encrypted data decoder
 */

function decodeIncomingData(apiregentry, _url, data, _headers) {
    if (!apiregentry.query.encrypted || !apiregentry.query.encrypted.toLowerCase() === "true") return data;  // not encrypted

    return utils.getObjectKeyValueCaseInsensitive(headers,"Content-Type").toLowerCase() == "application/json" ?
        crypt.decrypt(JSON.parse(data).data) : crypt.decrypt(data);
}

function encodeResponse(apiregentry, _url, respObj, _reqHeaders, _respHeaders) {
    if (!apiregentry.query.encrypted || !apiregentry.query.encrypted.toLowerCase() === "true") return respObj;  // not encrypted

    return {data: crypt.encrypt(respObj)};
}

module.exports = {decodeIncomingData, encodeResponse}