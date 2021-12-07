/**
 * Provides API access to the global memory component. 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

exports.doService = async jsonReq => {    
    if (!validateRequest(jsonReq)) {LOG.error("Global memory validation failure."); return CONSTANTS.FALSE_RESULT;}
    jsonReq.op = jsonReq.op.toLowerCase();

    if (jsonReq.op == "set") {DISTRIBUTED_MEMORY.set(jsonReq.key, jsonReq.value); return CONSTANTS.TRUE_RESULT;}
    else if (jsonReq.op == "get") return {result: true, value: DISTRIBUTED_MEMORY.get(jsonReq.key)};
    else {LOG.error("Global memory bad op specified."); return CONSTANTS.FALSE_RESULT;}
}

const validateRequest = jsonReq => (jsonReq && jsonReq.op && jsonReq.key);