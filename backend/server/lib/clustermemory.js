/**
 * Maintains cluster memory across vertical 
 * cluster members (Node.js workers). Not distributed 
 * across geos or geo clusters.
 * 
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const _clusterMemory = {}, _listeners = {}, SET_MSG = "__org_monkshu_cluster_memory_set";

/**
 * Inits the cluster memory
 */
function init() {
    process.on("message", msg => { if (msg.type == SET_MSG) _processSetMessage(msg.obj); });
    global.CLUSTER_MEMORY = this;
}

/**
 * Sets the key and its value in the global memory.
 * @param {string} key The key
 * @param {object} value The value
 */
function set(key, value) {
    const obj = {}; obj[key] = value; 
    if (process.send) process.send({type: SET_MSG, obj}) 
    else _processSetMessage(obj);
}

/**
 * Given a key, returns its value from the global memory.
 * @param {string} key The key.
 * @param {boolean||object} initIfUndefined If an object is provided and the key is not defined, it will be set to 
 *                                          this or an empty object if the value of this param is the boolean true.
 * @return The value if found, undefined if not.
 */
const get = (key, initIfUndefined) => {
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

module.exports = {init, set, get, listen};