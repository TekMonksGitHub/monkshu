/** 
 * Maintains distributed memory across vertical and
 * horizontal cluster members. Can run a worldwide
 * memory grid, at internet scale.
 * 
 * This is NOT a caching daemon. As the name says, this
 * runs a distributed memory store. Nothing is evicted. 
 * 
 * A caching daemon, or eviction engine can easily be 
 * built on top of this though.
 * 
 * To sync the node, first it will send a message to the 
 * network - if response is received then memory to memory
 * replication is used to sync the node. If an offer is not
 * received within a set time period and retries, and if the
 * node is set as a replication node (i.e. a master) then it
 * will try to restore the state from a replay file.
 * 
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const fs = require("fs");
const fspromises = require("fs").promises;
const conf = require(CONSTANTS.GLOBALMEMCONF);
const netcheck = require(`${CONSTANTS.LIBDIR}/netcheck.js`);
const objectwatcher = require(`${CONSTANTS.LIBDIR}/objectwatcher.js`);

const _listeners = {}, _memInSyncListeners = [], server_id = require("crypto").randomUUID(), 
    globalmemlog = `${CONSTANTS.GLOBALMEMLOGDIR}/${conf.logfile}`;
let _globalmemory = {}, memoryInSync = false, acceptedMemoryOffer = false, pendingSyncPromiseResolve;

async function init() {
    global.DISTRIBUTED_MEMORY = this;
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_set", _set);
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_setmemory"+server_id, _setMemory);
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_offer", _receivedMemoryOffer);

    _syncMemory();
    
    if (conf.replication_node) { // replicate memory if configured via memory to memory replication first
        BLACKBOARD.subscribe("__org_monkshu_distribued_memory_getmemory_offer", _getMemoryOffer);  
        BLACKBOARD.subscribe("__org_monkshu_distribued_memory_getmemory_accept", _acceptMemoryOffer);  
    }

    netcheck.addNetEventListener(_netStateChanged); // we want to know if the network loses connectivity or comes back

    if (conf.startupWaitsForSync && (!memoryInSync)) return new Promise(resolve => pendingSyncPromiseResolve = resolve);
    else return Promise.resolve();
}

/**
 * Sets hash and its value in the global memory.
 * @param {string} key The key
 * @param {object} value The value
 * @throws Memory not in sync error if Global Memory is not 
 *         in sync due to network or other issues.
 */
const set = (key, value) => BLACKBOARD.publish("__org_monkshu_distribued_memory_set", {key, value, time: Date.now()});  // publish to all via blackboard, including ourselves

/**
 * Gets hash and its value from the global memory.
 * @param {string} key The key
 * @return The value if found, null if not.
 */
const get = key => _globalmemory[key]?_globalmemory[key].value:undefined;
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
    if ((!_globalmemory[message.key]) || (_globalmemory[message.key].time < message.time)) 
        _globalmemory[message.key] = {value: message.value, time: message.time};    // set only if we have a stale value
    for (const [key, cb] of Object.entries(_listeners)) if (message.key == key) cb(message.key, message.value);
}

function _receivedMemoryOffer(message) {
    if ((!acceptedMemoryOffer) && (message.id != server_id)) 
        acceptedMemoryOffer = true; 
    else return;   // first one wins
    LOG.info(`Accepted memory replication offer from ${message.id} -> to ${server_id}`);
    BLACKBOARD.publish("__org_monkshu_distribued_memory_getmemory_accept", {id: message.id, receiver: server_id});
}

const _getMemoryOffer = message => {
    if (memoryInSync && (message.id != server_id)) {
        LOG.info(`Replying and offering memory replication from ${server_id} -> to ${message.id}`);
        BLACKBOARD.publish("__org_monkshu_distribued_memory_offer", {id: server_id});
    }
}

const _acceptMemoryOffer = message => {
    if ((message.id == server_id) && (message.receiver != server_id))  {
        LOG.info(`Received offer acceptance. Sending memory from this server. Replicating memory from ${server_id} -> to ${message.receiver}`);
        BLACKBOARD.publish("__org_monkshu_distribued_memory_setmemory"+message.receiver,
            {..._globalmemory, __org_monkshu_distribued_memory_internals:{transfercomplete: true, server_id}});    // TODO: chunk this
    }
}

async function _setMemory(message) {
    if (memoryInSync) {LOG.error(`Global memory coherence issue, got reply to sync after timeout. Global memory is now fragmented! Fragmented nodes are, this node -> ${server_id} and remote node -> ${message.__org_monkshu_distribued_memory_internals.server_id}.`); return; }  // we must have timedout before this server responded, ignore
    else LOG.info(`Syncing memory from ${message.__org_monkshu_distribued_memory_internals.server_id} -> to ${server_id}`);

    if (conf.replication_node) {    // we will restore from the offer
        LOG.info("Replication node global memory restore is from memory to memory replication."); 
        try { await fspromises.unlink(globalmemlog); } catch(err) {} //  truncate replay log 
        _globalmemory = !objectwatcher.isBeingObserved(_globalmemory) ? objectwatcher.observe(_globalmemory, globalmemlog) : _globalmemory; 
    }
    
    for (const key in message) if (key != "__org_monkshu_distribued_memory_internals" && 
        key != objectwatcher.getWatchedKeyName()) { // merge network into our memory
            if ((!_globalmemory[key]) || (_globalmemory[key].time < message[key].time)) _globalmemory[key] = message[key];
    }
    for (const key in _globalmemory) {  // merge our memory into the network
        if ((!message[key]) || (_globalmemory[key].time > message[key].time)) {
                BLACKBOARD.publish("__org_monkshu_distribued_memory_set", {key, value: _globalmemory[key].value, 
                    time: _globalmemory[key].time}); // update the network, we have a more recent value
                _globalmemory[key] = _globalmemory[key];    // updates our replay log
        }
    }
    if (message.__org_monkshu_distribued_memory_internals?.transfercomplete) _setMemoryInSync();
}

function _syncMemory(dontSyncFromFile) {
    memoryInSync = false;   // not in sync
    const sendMemSyncRequest = counter => {
        if (!acceptedMemoryOffer && counter < conf.syncRetries) {
            BLACKBOARD.publish("__org_monkshu_distribued_memory_getmemory_offer", {id: server_id}); 
            setTimeout(_=>{if (!acceptedMemoryOffer) sendMemSyncRequest(counter+1);}, conf.syncTimeout);
        } else if (counter == conf.syncRetries) {   // no one replied to us
            LOG.warn("No reply received to globalmemory sync requests.")
            if ((!conf.replication_node) || (dontSyncFromFile)) _setMemoryInSync(); 
            else _restoreGlobalMemoryFromFile();
        }
    }; sendMemSyncRequest(0);   // start trying to sync the memory
}

async function _restoreGlobalMemoryFromFile() {
    const _observeAndSyncGlobalMemory = _ => {
        _globalmemory = objectwatcher.observe(_globalmemory, globalmemlog); _setMemoryInSync(); }
    const _mergeMemories = (mergeFrom, mergeTo) => {
        for (const key in mergeFrom) if ((!mergeTo[key]) || (mergeTo[key].time < mergeFrom[key].time))
            mergeTo[key] = mergeFrom[key];
    }

    LOG.info("Restoring global memory from replay log."); 
    try {await fspromises.access(globalmemlog, fs.constants.R_OK)} catch (err) {
        LOG.info("No global memory replay log found. Assuming nothing needs to be restored."); 
        _observeAndSyncGlobalMemory();
        return;
    }
    const _tempRestoreObject = {}; await objectwatcher.restoreObject(_tempRestoreObject, globalmemlog);
    _mergeMemories(_tempRestoreObject, _globalmemory); _observeAndSyncGlobalMemory();
}

function _setMemoryInSync() {
    memoryInSync = true;
    LOG.info("Global memory is in sync"); 
    if (pendingSyncPromiseResolve) pendingSyncPromiseResolve();
    for (const listener of _memInSyncListeners) listener(true); 
}

function _netStateChanged(oldOnlineState, newOnlineState) {
    if (oldOnlineState == undefined && newOnlineState) return;  // server probably is starting

    if (newOnlineState) _syncMemory(true);  // we came back online, sync from network only, file is already in sync anyways
    else {memoryInSync = false; for (const listener of _memInSyncListeners) listener(false);}
}

module.exports = {init, set, get, listen, listenMemInSync, isMemoryInSync};