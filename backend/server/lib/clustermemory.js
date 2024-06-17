/**
 * Maintains cluster memory across vertical 
 * cluster members (Node.js workers). Not distributed 
 * across geos or geo clusters.
 * 
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const clusterconf = require(CONSTANTS.CLUSTERMEMCONF);

let _clusterMemory = {};
const  _listeners = {}, SET_MSG = "__org_monkshu_cluster_memory_set",
    POLL_VALUE_RESPONSE = "__org_monkshu_cluster_pollvalue_response", 
    DEFAULT_POLL_TIMEOUT = clusterconf.cluster_replication_timeout,
    POLL_VALUE_REQUEST = "__org_monkshu_cluster_pollvalue_request", CLUSTER_COUNT = "cluster.count",
    REPLICATE_MEMORY_REQUEST = "__org_monkshu_cluster_replicate_request", 
    REPLICATE_MEMORY_RESPONSE = "__org_monkshu_cluster_replicate_response", 
    REPLICATE_MEMORY_KEY = "__org_monkshu_cluster_replicate_key";

/**
 * Inits the cluster memory
 */
function init() {
    process.on("message", msg => { 
        if (msg.type == SET_MSG) _processSetMessage(msg.obj); 
        if (msg.type == POLL_VALUE_REQUEST) {
            process.send({type: POLL_VALUE_RESPONSE, key: msg.key, id: msg.id, value: _clusterMemory[msg.key]});
        }
        if (msg.type == REPLICATE_MEMORY_REQUEST) {
            if (Object.keys(_clusterMemory).length) process.send({type: REPLICATE_MEMORY_RESPONSE, 
                key: REPLICATE_MEMORY_KEY, id: msg.id, value: _clusterMemory}); // only reply if we have something to replicate
        }
    });

    const restoreClusterMemory = async _ => {try {await _replicateClusterMemory();} catch (err) {LOG.error(`Error restoring clustered memory - ${err}`)}};
    restoreClusterMemory(); // this is async so server will take time to stabilize by replicating cluster memory

    global.CLUSTER_MEMORY = this;
}

/**
 * Sets the key and its value in the global memory.
 * @param {string} key The key
 * @param {object} value The value
 * @param {boolean} ensureReplicated Optional: If true will return only once entire cluster is updated
 * @param {number} replicationTimeout Optional: Timeout for cluster to sync to this value, default is 200ms
 */
function set(key, value, ensureReplicated, replicationTimeout=DEFAULT_POLL_TIMEOUT) {
    const obj = {}; obj[key] = value; 
    if (process.send) process.send({type: SET_MSG, obj}) 
    else _processSetMessage(obj);

    if (ensureReplicated && process.send) return new Promise(async resolve => {
        let resolved = false, repliesReceived = 0;
        const clusterCount = await _getClusterCount(replicationTimeout);
        if (!clusterCount) {resolve("Replication timeout error"); return;} // error or timeout
        const requestID = _createRequestID(), msgListener = function(msg) { 
            if ((msg.type == POLL_VALUE_RESPONSE) && (msg.key == key) && (msg.id == requestID) && (!resolved)) {
                repliesReceived++; if (repliesReceived == clusterCount) {
                    resolved = true; process.removeListener("message", msgListener); resolve();
                }
            } 
        }
        process.on("message", msgListener); process.send({type: POLL_VALUE_REQUEST, key, id: requestID});  // start the polling
        setTimeout(_=>{ if (!resolved) {
            resolved = true; process.removeListener("message", msgListener); resolve("Replication timeout error");
        } }, replicationTimeout);
    });
}

/**
 * Given a key, returns its value from the global memory.
 * @param {string} key The key.
 * @param {boolean||object} initIfUndefined Optional: If an object is provided and the key is not defined, it will be set to 
 *                                          this or an empty object if the value of this param is the boolean true.
 * @param {boolean} pollReplicas Optional: If true, replicas will be polled if the value is not local to check if it is set somewhere
 * @param {number} polltimeout Optional: Timeout for polling values from other workers, default is 200 ms.
 * @return The value if found, undefined if not.
 */
const get = (key, initIfUndefined, pollReplicas, polltimeout=DEFAULT_POLL_TIMEOUT) => {
    if ((!_clusterMemory[key]) && pollReplicas && process.send) return new Promise(async resolve => {
        const value = await _getPolledReplyForKey(key, polltimeout, POLL_VALUE_REQUEST, POLL_VALUE_RESPONSE);
        if (value) {_clusterMemory[key] = value; resolve(value);} 
        else {if (initIfUndefined) {set(key, initIfUndefined); resolve(initIfUndefined);} else resolve(undefined);}
    });

    if ((!_clusterMemory[key]) && initIfUndefined) {set(key, initIfUndefined); return initIfUndefined;}
    else return _clusterMemory[key];
}

/**
 * Listens to the changes in the value of the key 
 * @param {string} key The key
 * @param {function} cb Listener function
 */
const listen = (key, cb) => _listeners[key] = cb;

function _processSetMessage(obj)  {
    for (const key of Object.keys(obj)) {
        _clusterMemory[key] = obj[key];
        for (const [key_listener, cb] of Object.entries(_listeners)) if (key == key_listener) cb(key, obj[key]);
    }
}

function _getClusterCount(timeout) {
    return new Promise(resolve => {
        let resolved = false; const requestID = _createRequestID(), msgListener = function (msg) {
            if (msg.id == requestID) {
                resolved = true; resolve(msg.count); process.removeListener("message", msgListener); }
        }
        process.on("message", msgListener); process.send({type: CLUSTER_COUNT, id: requestID});
        setTimeout(_=>{if (!resolved) {process.removeListener("message", msgListener); resolve(null)}}, timeout);
    });
}

async function _replicateClusterMemory() {
    try {
        const replicatedClusterMemory = await _getPolledReplyForKey(
            REPLICATE_MEMORY_KEY, DEFAULT_POLL_TIMEOUT, REPLICATE_MEMORY_REQUEST, REPLICATE_MEMORY_RESPONSE);
        if (replicatedClusterMemory) {LOG.info("Restoring cluster memory as replicated memory received."); _clusterMemory = replicatedClusterMemory;}
        else LOG.warn("Starting from a new cluster memory as replicated memory not received.");
    } catch (err) {
        LOG.error(`Error replicating cluster memory, the error is ${err}. Using new cluster memory.`); _clusterMemory = {};
    }
}

function _getPolledReplyForKey(key, polltimeout, sendtype, responsetype) {
    return new Promise(async resolve => {
        let repliesReceived = 0, resolved = false;
        let clusterCount; try {clusterCount = await _getClusterCount(polltimeout);} catch(err) {LOG.error(`Error ${err} in cluster counting.`);}
        if (!clusterCount) {LOG.error("Cluster count failed in polled key value fetch."); resolve(null); return;} // error or timeout
        const requestID = _createRequestID(), msgListener = function(msg) { 
            if ((msg.type == responsetype) && (msg.key == key) && (msg.id == requestID) && (!resolved)) {
                repliesReceived++;
                if (msg.value) {
                    resolved = true; process.removeListener("message", msgListener); resolve(msg.value); 
                } else if (repliesReceived == clusterCount) {
                    resolved = true; process.removeListener("message", msgListener); resolve(null); 
                }
            } 
        }
        process.on("message", msgListener); process.send({type: sendtype, key, id: requestID});
        setTimeout(_=>{ if (!resolved) {
            LOG.error("Cluster reply timed out in polled key value fetch.");
            resolved = true; process.removeListener("message", msgListener); resolve(null);
        } }, polltimeout);
    });
}

const _createRequestID = _ => `${Date.now()}-${Math.round(Math.random()*1000)}`;

module.exports = {init, set, get, listen};