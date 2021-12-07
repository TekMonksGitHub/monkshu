/** 
 * (C) 2020. TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 * 
 * Maintains distributed memory across vertical and
 * horizontal cluster members. Can run a worldwide
 * memory grid, at internet scale.
 * 
 * This is NOT a caching daemon. As the name says, this
 * runs a distributed memory store. Nothing is evicted. 
 * 
 * A caching daemon, or eviction engine can easily be 
 * built on top of this though.
 */
const conf = require(CONSTANTS.GLOBALMEMCONF);

const _globalmemory = {}, _listeners = {}, _memInSyncListeners = [], server_id = require("crypto").randomUUID();
let memoryInSync = false, acceptedMemoryOffer = false;

function init() {
    global.DISTRIBUTED_MEMORY = this;
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_set", _set);
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_setmemory"+server_id, _setMemory);
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_offer", _receivedMemoryOffer);

    const sendMemSyncRequest = counter => {
        if (!acceptedMemoryOffer && counter < conf.syncRetries) {
            BLACKBOARD.publish("__org_monkshu_distribued_memory_getmemory_offer", {id: server_id}); 
            setTimeout(_=>{if (!acceptedMemoryOffer) sendMemSyncRequest(counter+1);}, conf.syncTimeout);
        } else if (counter == conf.syncRetries) memoryInSync = true; // no one replied to us, assume memory is current as is
    }; sendMemSyncRequest(0);   // start trying to sync the memory
    
    if (conf.replication_node) { // replicate memory if configured
        BLACKBOARD.subscribe("__org_monkshu_distribued_memory_getmemory_offer", _getMemoryOffer);  
        BLACKBOARD.subscribe("__org_monkshu_distribued_memory_getmemory_accept", _acceptMemoryOffer);  
    }
}

/**
 * Sets hash and its value in the global memory.
 * @param {string} key The key
 * @param {object} value The value
 */
const set = (key, value) => BLACKBOARD.publish("__org_monkshu_distribued_memory_set", {key, value});  // publish to all via blackboard, including ourselves
/**
 * Gets hash and its value from the global memory.
 * @param {string} key The key
 * @return The value if found, null if not.
 */
const get = key => _globalmemory[key];
/**
 * Listens to the changes in the value of the key 
 * @param {string} key The key
 * @param {function} cb Listener function
 */
const listen = (key, cb) => _listeners[key] = cb;
/**
 * Listens to global memory of current server coming into sync
 * e.g. on restarts
 * @param {function} cb Listener function
 */
const listenMemInSync = listener => _memInSyncListeners.push(listener);
/**
 * @return true of the current server's memory is in sync with the global memory
 * and false otherwise.
 */
const isMemoryInSync = _ => memoryInSync;

const _set = message =>  {
    if (message.value) _globalmemory[message.key] = message.value; else delete _globalmemory[message.key];
    for (const [key, cb] of Object.entries(_listeners)) if (message.key == key) cb(message.key, message.value);
}

function _setMemory(message) {
    if (memoryInSync) {LOG.error(`Global memory coherence issue, got reply to sync after timeout. Global memory is now fragmented! Fragmented nodes are, this node -> ${server_id} and remote node -> ${message.__org_monkshu_distribued_memory_internals.server_id}.`); return; }  // we must have timedout before this server responded, ignore
    else LOG.info(`Syncing memory from ${message.__org_monkshu_distribued_memory_internals.server_id} -> to ${server_id}`);
    
    for (const key in message) if (key != "__org_monkshu_distribued_memory_internals") _globalmemory[key] = message[key];
    if (message.__org_monkshu_distribued_memory_internals.transfercomplete) {
        memoryInSync = true; for (const listener of _memInSyncListeners) listener(); }
}

function _receivedMemoryOffer(message) {
    if (!acceptedMemoryOffer) acceptedMemoryOffer = true; else return;   // first one wins
    BLACKBOARD.publish("__org_monkshu_distribued_memory_getmemory_accept", {id: message.id, receiver: server_id});
}

const _getMemoryOffer = message => {
    if (memoryInSync && message.id != server_id) BLACKBOARD.publish("__org_monkshu_distribued_memory_offer", {id: server_id});
}

const _acceptMemoryOffer = message => {
    if (message.id == server_id)  BLACKBOARD.publish("__org_monkshu_distribued_memory_setmemory"+message.receiver,
        {..._globalmemory, __org_monkshu_distribued_memory_internals:{transfercomplete: true, server_id}});    // TODO: chunk this
}

module.exports = {init, set, get, listen, listenMemInSync, isMemoryInSync};