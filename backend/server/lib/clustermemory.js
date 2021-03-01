/* 
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Maintains cluster memory across vertical 
 * cluster members (Node.js workers).
 */

const _clusterMemory = {}, _listeners = {}, SET_MSG = "__org_monkshu_cluster_memory_set";

function init() {
    process.on("message", msg => { if (msg.type == SET_MSG) _processSetMessage(msg.obj); });
    global.CLUSTER_MEMORY = this;
}

function set(key, value) {
    const obj = {}; obj[key] = value; 
    if (process.send) process.send({type: SET_MSG, obj}) 
    else _processSetMessage(obj);
}

const get = key => _clusterMemory[key];

const listen = (key, cb) => _listeners[key] = cb;

function _processSetMessage(obj)  {
    for (const key of Object.keys(obj)) {
        _clusterMemory[key] = obj[key];
        for (const [key_listener, cb] of Object.entries(_listeners)) if (key == key_listener) cb(key, obj[key]);
    }
}

module.exports = {init, set, get, listen};