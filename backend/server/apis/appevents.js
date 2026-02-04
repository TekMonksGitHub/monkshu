/**
 * Processes and informs about app events.
 * 
 * (C) 2026 Tekmonks Corp. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const SERVER_API_SSE_EVENT = "_org_monkshu_api_sse_event_";

exports.doSSE = async (jsonReq, sseEventSender) => {
    const memory = CLUSTER_MEMORY.get(CONSTANTS.MEM_KEY+jsonReq.clientid, {});
    for (const [requestid, response] of Object.entries(memory)) {
        delete memory[requestid];
        sseEventSender({event: SERVER_API_SSE_EVENT, id: Date.now(), data:{requestid, response}});
    }
}
