/**
 * Calls Java API. 
 * (C) 2022 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */
const calljava = require(`${CONSTANTS.LIBDIR}/calljava.js`);

const API_WRAPPER_CLASS = "org.monkshu.java.APIWrapper";

exports.doService = async (jsonReq, _servObject, headers, url, apiconf) => {
    try {
        if (!apiconf.entrypoint) {
            LOG.error("Can't call Java API. Missing entrypoint parameter.");
            return CONSTANTS.FALSE_RESULT;
        }
        if (apiconf.code && (!await calljava.compileJava(apiconf.code))) {
            LOG.error("Can't call Java API. Dynamic API compile failed.");
            return CONSTANTS.FALSE_RESULT;
        }

        const apiWrapper = await calljava.newInstance(API_WRAPPER_CLASS), strReq = JSON.stringify(jsonReq), 
            strHeaders = JSON.stringify(headers), strAPIConf = JSON.stringify(apiconf);
        const result = await _callAPIWrapper(apiWrapper, apiconf.entrypoint, strReq, strHeaders, url, strAPIConf);

        return JSON.parse(result);
    } catch (err) {
        LOG.error("Error calling Java API. Error is "+err);
        return CONSTANTS.FALSE_RESULT;
    }
}

const _callAPIWrapper = (apiWrapper, apiClass, strReq, strHeaders, url, strAPIConf) => new Promise((resolve, reject) => 
    apiWrapper.doService(apiClass, strReq, strHeaders, url, strAPIConf, (err, result) => {if (err) reject(err); else resolve(result);} ));