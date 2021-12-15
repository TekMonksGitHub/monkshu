/** 
 * Maintains distributed memory across vertical and horizontal cluster members. Can run a worldwide
 * memory grid, at internet scale. Fault tolerant.
 * 
 * This is NOT a caching daemon. As the name says, this runs a distributed memory store. Nothing is evicted. 
 * 
 * A caching daemon, or eviction engine can easily be built on top of this though.
 * 
 * To sync the node, first it will send a message to the network - if response is received then memory to memory
 * replication is used to sync the node. If an offer is not received within a set time period and retries, and if the
 * node is set as a replication node (i.e. a master) then it will try to restore the state from a replay file.
 * 
 * If only partial offers are received for sync requests then all the replication nodes will send each other their memories, 
 * and the cluster will sync with the union of latest updates from each replication node. 
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
    globalmemlog = `${CONSTANTS.GLOBALMEMLOGDIR}/${conf.logfile}`, INTERNAL_KEY = "__org_monkshu_distribued_memory_internals";
let _globalmemory = {}, memoryInSync = false, acceptedMemoryOffer = false, pendingSyncPromiseResolve,
    _partialOffers = {}, partialSyncCheckTimer, fullSyncKeysReceived = [];

const SETMEM = "__org_monkshu_distribued_memory_set", SET_MEM_FROM_SYNC = "__org_monkshu_distribued_memory_setmemory", 
    MEM_OFFER = "__org_monkshu_distribued_memory_offer", GET_MEM_OFFERS = "__org_monkshu_distribued_memory_getmemory_offer",
    ACCEPT_OFFER = "__org_monkshu_distribued_memory_getmemory_accept", 
    PUBLISH_MEM_AS_SETS_FOR_PARTIAL_SYNC = "__org_monkshu_distribued_memory_send_memory_as_sets_for_partial_sync";

async function init() {
    global.DISTRIBUTED_MEMORY = this;
    BLACKBOARD.subscribe(SETMEM, _set);
    BLACKBOARD.subscribe(SET_MEM_FROM_SYNC+server_id, _setMemoryFromFullSync);
    BLACKBOARD.subscribe(MEM_OFFER+server_id, _receivedMemoryOffer);

    _syncMemory();
    
    if (conf.replication_node) { // replicate memory if configured via memory to memory replication first
        BLACKBOARD.subscribe(GET_MEM_OFFERS, _sendMemoryOffer);  
        BLACKBOARD.subscribe(ACCEPT_OFFER, _memOfferAccepted);  
        BLACKBOARD.subscribe(PUBLISH_MEM_AS_SETS_FOR_PARTIAL_SYNC, _publishMemoryAsSetOperationsForPartialSync); 
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
const set = (key, value) => BLACKBOARD.publish(SETMEM, {key, value, time: Date.now(), id: server_id});  // publish to all via blackboard, including ourselves

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
    if ((!_globalmemory[message.key]) || (_globalmemory[message.key].time < message.time)) {    // set only if we have a stale value
        _globalmemory[message.key] = {value: message.value, time: message.time};    
        for (const [key, cb] of Object.entries(_listeners)) if (message.key == key) cb(message.key, message.value);
    }
    if (message.isPartialSyncMessage) _addPartialSyncMessageReceived(message.id, message.totalcountBeingSent);
}

function _sendMemoryOffer(message) {
    if (message.id == server_id) return;    // our own message, ignore
    LOG.info(`Replying and offering memory replication from ${server_id} -> to ${message.id}${memoryInSync?"":", with partial flag"}`);
    BLACKBOARD.publish(MEM_OFFER+message.id, {offering_server: server_id, partialSync: !memoryInSync});
}

function _receivedMemoryOffer(message) {
    if (acceptedMemoryOffer||(message.offering_server == server_id)) return;    // first one wins or can't accept from ourselves

    if ((!message.partialSync)) {    
        acceptedMemoryOffer = true; LOG.info(`Accepted memory replication offer from ${message.offering_server} -> to ${server_id}`);
        BLACKBOARD.publish(ACCEPT_OFFER, {offering_server: message.offering_server, receiver: server_id});
    }
    else {
        _partialOffers[message.offering_server] = _createPartialOfferObject(message.offering_server);
        LOG.info(`Recorded partial memory replication offer from ${message.offering_server} -> to ${server_id}`);   
    }
}

function _memOfferAccepted(message) {
    if ((message.offering_server == server_id) && (message.receiver != server_id))  {
        LOG.info(`Received offer acceptance. Sending memory from this server. Replicating memory from ${server_id} -> to ${message.receiver}`);
        const memToPublish = {..._globalmemory}; memToPublish[INTERNAL_KEY] = {transfercomplete: true, server_id};
        BLACKBOARD.publish(SET_MEM_FROM_SYNC+message.receiver, memToPublish);   // TODO: chunk this
    }
}

async function _setMemoryFromFullSync(message) {
    if (memoryInSync) {LOG.error(`Global memory coherence issue, got reply to sync after timeout. Global memory is now fragmented! Fragmented nodes are, this node -> ${server_id} and remote node -> ${message[INTERNAL_KEY].server_id}.`); return; }  // we must have timedout before this server responded, ignore
    else LOG.info(`Syncing memory from ${message[INTERNAL_KEY].server_id} -> to ${server_id}`);

    if (conf.replication_node) {    // we will restore from the offer
        LOG.info("Replication node global memory restore is from memory to memory replication."); 
        if (objectwatcher.isBeingObserved(_globalmemory)) _globalmemory = await objectwatcher.stopObserving(_globalmemory);
        try { await fspromises.unlink(globalmemlog); } catch(err) {} //  truncate replay log 
        _globalmemory = objectwatcher.observe(_globalmemory, globalmemlog); 
    }
    
    for (const key in message) if (key != INTERNAL_KEY && key != objectwatcher.getWatchedKeyName()) { // merge network into our memory
            if ((!_globalmemory[key]) || (_globalmemory[key].time < message[key].time)) _globalmemory[key] = message[key];
            else if (conf.replication_node) _globalmemory[key] = _globalmemory[key]; // updates our replay log if we are a replication node
            fullSyncKeysReceived.push(key);
    }
    if (message[INTERNAL_KEY]?.transfercomplete) {
        for (const key in _globalmemory) {  // merge any more recent updates we have into the network
            if ((!fullSyncKeysReceived.includes(key)) || (_globalmemory[key].time > message[key].time)) {
                BLACKBOARD.publish(SETMEM, {key, value: _globalmemory[key].value, time: _globalmemory[key].time, id: server_id}); // update the network, we have a more recent value
                if (conf.replication_node) _globalmemory[key] = _globalmemory[key];    // updates our replay log if we are a replication node
            }
        }
        _setMemoryInSync();
    }
}

function _syncMemory(dontSyncFromFile) {
    memoryInSync = false;  fullSyncKeysReceived = []; acceptedMemoryOffer = false; // not in sync, no offers accepted yet
    const sendMemSyncRequest = counter => {
        if (!acceptedMemoryOffer && counter < conf.syncRetries) {
            LOG.info("Requesting memory synchronization offers, request number is "+counter);
            BLACKBOARD.publish(GET_MEM_OFFERS, {id: server_id}); 
            setTimeout(_=>{if (!acceptedMemoryOffer) sendMemSyncRequest(counter+1);}, conf.syncTimeout);
        } else if (counter == conf.syncRetries && (!_lastChanceToAcceptOffers())) {   // no one replied to us
            LOG.warn("No reply received to globalmemory sync requests.")
            if ((!conf.replication_node) || (dontSyncFromFile)) _setMemoryInSync(); 
            else _restoreGlobalMemoryFromFile();
        }
    }; sendMemSyncRequest(0);   // start trying to sync the memory
}

function _lastChanceToAcceptOffers() {
    if (Object.keys(_partialOffers).length) {   // we do have partial offers then tell everyone we want sets, and assume things are in sync
        _globalmemory = !objectwatcher.isBeingObserved(_globalmemory) ? objectwatcher.observe(_globalmemory, globalmemlog) : _globalmemory; 
        BLACKBOARD.publish(PUBLISH_MEM_AS_SETS_FOR_PARTIAL_SYNC, {id: server_id}); 
        partialSyncCheckTimer = setInterval(_setSyncIfAllReplicasComplete, conf.partialSyncCheckInterval); return true;
    } else return false;
}

function _publishMemoryAsSetOperationsForPartialSync() {
    for (const key in _globalmemory) BLACKBOARD.publish(SETMEM, {key, value: _globalmemory[key].value, 
        time: _globalmemory[key].time, totalcountBeingSent: Object.keys(_globalmemory).length, isPartialSyncMessage: true, 
        id: server_id}); 
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
    memoryInSync = true; // reset
    LOG.info("Global memory is in sync"); 
    if (pendingSyncPromiseResolve) pendingSyncPromiseResolve();
    for (const listener of _memInSyncListeners) listener(true); 
}

function _netStateChanged(oldOnlineState, newOnlineState) {
    if (oldOnlineState == undefined && newOnlineState) return;  // server probably is starting

    if (newOnlineState) _syncMemory(true);  // we came back online, sync from network only, file is already in sync anyways
    else {memoryInSync = false; for (const listener of _memInSyncListeners) listener(false);}
}

function _addPartialSyncMessageReceived(sender_id, setsExpected) {
    if (memoryInSync) return;   // nothing to do - we are in sync already, probably an expired server sending set messages late 
    if (sender_id == server_id) return; // we can't be receiving or processing a partial offer from ourselves.

    _partialOffers[sender_id] = _partialOffers[sender_id] ? _partialOffers[sender_id] : _createPartialOfferObject(sender_id);
    _partialOffers[sender_id].received = _partialOffers[sender_id].received + 1; _partialOffers[sender_id].lastSetReceived = Date.now();
    if (_partialOffers[sender_id].received == setsExpected) _partialOffers[sender_id].complete = true;
    _setSyncIfAllReplicasComplete();
}

function _setSyncIfAllReplicasComplete() {
    let serversComplete = 0; for (const key in _partialOffers) if (_partialOffers[key].complete || 
        (Date.now() - _partialOffers[key].lastSetReceived > conf.partialSyncMaxWait)) serversComplete++;
    if (serversComplete == Object.keys(_partialOffers).length) {clearInterval(partialSyncCheckTimer); _setMemoryInSync();}
}

const _createPartialOfferObject = id => {return {id, received: 0, complete: false, offer: true, lastSetReceived: Date.now()}};

module.exports = {init, set, get, listen, listenMemInSync, isMemoryInSync};