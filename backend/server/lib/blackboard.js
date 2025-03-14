/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Globally distributed blackboard for event propogation
 * at internet scale. Will broadcast, by default, to the
 * configured servers and also to all local cluster members. 
 */

const topics = {}
const fs = require("fs");
const mustache = require("mustache");
const API_BB_PATH = "/__org_monkshu__blackboard";
const rest = require(`${CONSTANTS.LIBDIR}/rest.js`);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
let conf = _expandConf(require(CONSTANTS.BLACKBOARDCONF));
const netcheck = require(`${CONSTANTS.LIBDIR}/netcheck.js`);
const clustermemory = require(`${CONSTANTS.LIBDIR}/clustermemory.js`);
const timed_expiry_cache = require(`${CONSTANTS.LIBDIR}/timedcache.js`).newcache(conf.fastcache_timeout);

const BLACKBOARD_MSG = "__org_monkshu_blackboard_msg", CONF_UPDATE_MSG = "__org_monkshu_blackboard_msg_conf",
    BLACKBOARD_REQUESTREPLY_TOPIC = "__org_monkshu_blackboard_requestreply_topic";

let _currentDistributedClusterSizeOnline=0, _currentLocalClusterSizeOnline=1, _replicasOffline=[], _replicasOnline = [];

function init() {
    global.BLACKBOARD = this;
    subscribe(CONF_UPDATE_MSG, confNew => {
        // update in memory working copy
        if (process.send) (process.send({type: CONF_UPDATE_MSG, conf: confNew}));
        else conf = _expandConf(confNew);

        // serialize to survive restarts
        fs.writeFile(CONSTANTS.BLACKBOARDCONF, JSON.stringify(confNew));    // serialize
    });
    process.on("message", msg => {
        if (msg.type == CONF_UPDATE_MSG) conf = _expandConf(msg.conf)});
    process.on("message", msg => {
        if (msg.type == BLACKBOARD_MSG) {
            _log_verbose(`Blackboard at PID ${process.pid} and server ID ${CONSTANTS.SERVER_ID} received message with ID ${msg.msg.messageid} via network internal cluster IPC.`);
            _broadcast(msg.msg);
        }
    });
    if (!conf.replicas) conf.replicas = []; // init to empty list if not provided
    utils.setIntervalImmediately(_setCurrentClusterSizeOnline, conf.cluster_check_interval_ms);
}

/** called by internal blackboard, not a public API */
async function doService(request) { 
    if (request.type == BLACKBOARD_MSG) {   
        _log_verbose(`Blackboard at PID ${process.pid} and server ID ${CONSTANTS.SERVER_ID} received message with ID ${request.msg.messageid} via network API.`);
        if (process.send) process.send({type: BLACKBOARD_MSG, msg: request.msg});   // received network message; if in a nodejs cluster, use cluster to broadcast, else broadcast here
        else _broadcast(request.msg);   // no cluster so broadcast locally
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

/**
 * Publishes the given payload for the given topic across entire vertical and
 * horizontal cluster, by default/
 * @param {string} topic     The topic
 * @param {object} payload   The message
 * @param {object} options   Optional: {
 *                              blackboard.EXTERNAL_ONLY: if true, don't broadcast to the local vertical cluster or process
 *                              blackboard.LOCAL_ONLY: if true, broadcast only to the current process
 *                              blackboard.LOCAL_CLUSTER_ONLY: if true, broadcast only to the current vertical cluster
 *                              blackbaord.NOT_LOCAL_ONLY: if true, broadcast to everyone except local current process
 *                           }
 */
async function publish(topic, payload, options) {
    const poster = conf.secure?rest.postHttps:rest.post;
    const _createBroadcastMessage = _ => { return {
        topic, payload, serverid: CONSTANTS.SERVER_ID, serverip: CONSTANTS.SERVER_IP, 
        messageid: utils.generateUUID(false), options} };

    if (options?.[module.exports.LOCAL_ONLY]) {_broadcast(_createBroadcastMessage()); return;}   // only send to the current process

    if (options?.[module.exports.LOCAL_CLUSTER_ONLY]) {       // only send to the local cluster
        if (process.send) process.send({type: BLACKBOARD_MSG, msg:_createBroadcastMessage()});   // broadcast to the local cluster if no replicas working
        else _broadcast(_createBroadcastMessage());  // if no local cluster then just give up and send to the local applications
        return;
    }

    let failedReplicas = 0;
    for (const replica of conf.replicas) {
        const host = replica.lastIndexOf(":") != -1 ? replica.substring(0, replica.lastIndexOf(":")) : replica; 
        const port = replica.lastIndexOf(":") != -1 ? replica.substring(replica.lastIndexOf(":")+1) : CONSTANTS.DEFAULT_HTTPD_PORT;
        try {
            if (options?.[module.exports.EXTERNAL_ONLY] && utils.getLocalIPs().includes(host)) continue;    // only need to send to external cluster members
            
            if (!(await isReplicaOnline(host, port))) {  // don't waste time publishing to nodes not reachable
                LOG.error(`Blackboard with PID ${process.pid} and server ID ${CONSTANTS.SERVER_ID} can't reach replica ${replica}, due to connection error. Dropping messgae with topic ${topic} for this replica.`); 
                failedReplicas++; continue; 
            }
            
            _log_verbose(`Blackboard with PID ${process.pid} and server ID ${CONSTANTS.SERVER_ID} sending message for topic ${topic} via network to ${replica}.`);
            poster(host, port, API_BB_PATH, {}, {type:BLACKBOARD_MSG, msg:_createBroadcastMessage()}, (err,result) => {
                if (err || !result.result) LOG.error(`Blackboard replication failed for replica: ${replica}`); 
            });
        } catch (err) { LOG.error(`Blackboard can't reach replica ${replica}, error is ${err}. The message topic is ${topic}.`); failedReplicas++; }
    }

    // if the network is down or if all replicas are misconfigured, then at least broadcast to the local nodes
    // so that applications relying on the blackboard keep running, as long as the external only is not set.
    if ((!options?.[module.exports.EXTERNAL_ONLY]) && ((!conf.replicas.length) || 
            (failedReplicas == conf.replicas.length))) {  

        LOG.error(`Failed to reach all replicas. Assuming network isolated topology. Broadcasting the message locally. The message topic is ${topic}.`);
        if (process.send) process.send({type: BLACKBOARD_MSG, msg:_createBroadcastMessage()});   // broadcast to the local cluster if no replicas working
        else _broadcast(_createBroadcastMessage());  // if no local cluster then just give up and send to the local applications
    }
}

/** @return The distribued cluster size, as configured */
function getDistribuedClusterSize() {return conf.replicas.length;}

/** @return The local cluster size, as configured */
async function getLocalClusterSize() {return await clustermemory.getClusterCount(conf.local_cluster_timeout_ms);}

/**
 * Gets a reply for the given topic and message. 
 * @param {string} topic The topic
 * @param {object} payload The message to send for whom the reply is needed
 * @param {number} timeout The timeout, after which to give up. Default is 1000 ms.
 * @param {object} options Same as publish options plus if exports.FIRST_REPLY_ONLY is set 
 *                         then only first reply received is waited for, and sent back
 * @param {function} replyReceiver The function to receove the reply, unless await is called
 * @param {number} repliesExpected The number of expected replies, if not provided it is auto-calculated
 * @returns The replies received as an [array of reply objects]
 */
async function getReply(topic, payload, timeout=conf.send_reply_timeout, options, replyReceiver, repliesExpected) {
    if (!replyReceiver) return new Promise(resolve => getReply(...arguments, resolve));

    const id = utils.generateUUID();
    let repliesReceived = 0, replied = false, replies = [];
    const timeoutID = setTimeout(_=>{ if (!replied) {
        replied = true; replies.incomplete = true; replyReceiver(replies);
        LOG.warn(`Blackboard getReply timed out for topic -> ${topic} with options ${JSON.stringify(options)}, expected = ${repliedExpected}, received = ${repliesReceived}. Sending incomplete reply.`);
    }}, timeout);
    if (!repliesExpected) repliedExpected = options?.[module.exports.FIRST_REPLY_ONLY] ? 1 : 
        options?.[module.exports.LOCAL_ONLY] ? 1 :
        options?.[module.exports.LOCAL_CLUSTER_ONLY] ? _currentLocalClusterSizeOnline : 
        options?.[module.exports.NOT_LOCAL_ONLY] ? 
            _currentDistributedClusterSizeOnline + _currentLocalClusterSizeOnline - 1 : 
        _currentDistributedClusterSizeOnline;
    subscribe(BLACKBOARD_REQUESTREPLY_TOPIC, function(msg) {
        if (replied) return; // no longer an active request, timed out
        if ((msg.id != id) || (msg.type !== "reply")) return;   // not for us, as we handle only replies - this also ensures topics match etc
        replies.push(msg.reply); repliesReceived++; if (repliesReceived < repliedExpected) return;  // still waiting
        clearTimeout(timeoutID); unsubscribe(BLACKBOARD_REQUESTREPLY_TOPIC, this);   // we are not waiting anymore
        replyReceiver(replies); replied = true;
        LOG.info(`Blackboard getReply sent successful reply for topic -> ${topic} with options ${JSON.stringify(options)}.`);
    }, options);
    const finalPayload = {id, payload, topic, type: "request", options}; 
    publish(BLACKBOARD_REQUESTREPLY_TOPIC, finalPayload, options);
}

/**
 * Sends reply for the given topic
 * @param {string} topic The topic
 * @param {object} blackboardcontrol The blackboard control object which was passed along with the original message
 * @param {object} payload The reply message 
 */
function sendReply(topic, blackboardcontrol, payload) {
    publish(BLACKBOARD_REQUESTREPLY_TOPIC, {id: blackboardcontrol.id, topic, reply: payload, type: "reply"}, blackboardcontrol.options);
}

/** @return {boolean} true if the entire cluster is online, else false */
function isEntireReplicaClusterOnline() {
    return _currentDistributedClusterSizeOnline == conf.replicas.length;
}

/** @return {boolean} true if the replica is online, else false */
async function isReplicaOnline(host, port) {
    if (isEntireReplicaClusterOnline()) return true;    // entire cluster is online
    if (_replicasOnline.includes(host+":"+port)) return true; // definitely online
    if (_replicasOffline.includes(host+":"+port)) return false; // definitely offline
    return (await netcheck.checkConnect(host, port, conf.quick_connect_timeout_ms)).result;  // we are in the middle of updating cluster status, so it is unreliable, perform a full check ourselves
}

/** @return {number} The size of the cluster currently online */
function getCurrentDistributedClusterSizeOnline() { return _currentDistributedClusterSizeOnline; }

/**
 * Subscribes to the given topic
 * @param {string} topic The topic
 * @param {function} callback The function to call when a message is received
 * @param {object} options {
 *                  blackboard.LOCAL_ONLY - only receive local messages if true, 
 *                  blackboard.EXTERNAL_ONLY - only receive external messages if true
 *                 }
 */
function subscribe(topic, callback, options) {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push({callback, options});
}

/**
 * Unsubscribe from the given topic
 * @param {string} topic The topic to unsubscribe from
 * @param {function} callback The callback function registered previously for this topic
 */
function unsubscribe(topic, callback) {
    const topicSubscribersArray = topics[topic]; if (!topicSubscribersArray) return;    // no subscribers exist
    let indexFound = -1;
    for (const [i, subscriber] of topicSubscribersArray.entries()) {
        if (subscriber.callback === callback) {indexFound = i; break;} }
    if (indexFound != -1) topicSubscribersArray.splice(indexFound, 1);
}

async function _setCurrentClusterSizeOnline() {
    _replicasOffline = []; _replicasOnline = [];
    let size = 0; for (const replica of conf.replicas) {
        const host = replica.lastIndexOf(":") != -1 ? replica.substring(0, replica.lastIndexOf(":")) : replica; 
        const port = replica.lastIndexOf(":") != -1 ? replica.substring(replica.lastIndexOf(":")+1) : CONSTANTS.DEFAULT_HTTPD_PORT;
        const check = await netcheck.checkConnect(host, port, conf.quick_connect_timeout_ms); 
        if (check.result) {size++; _replicasOnline.push(host+":"+port);} else _replicasOffline.push(host+":"+port);
    }
    _currentDistributedClusterSizeOnline = size;
    _currentLocalClusterSizeOnline = (await getLocalClusterSize()) || 1;
}

function _broadcast(msg) {
    // handle specially formatted request-reply messages here
    if (msg.topic == BLACKBOARD_REQUESTREPLY_TOPIC && msg.payload.type == "request") {  // unmarshall request-reply messages
        msg.topic = msg.payload.topic; msg.payload = {...msg.payload.payload, 
            blackboardcontrol: {id: msg.payload.id, options: msg.payload.options} }
    }

    _log_verbose(`Blackboard with PID ${process.pid} and server ID ${CONSTANTS.SERVER_ID} received message for broadcast with message ID ${msg.messageid} for topic ${msg.topic}`);
    if (timed_expiry_cache.get("_blackboard"+msg.messageid)) {    // deliver only once
        LOG.warn(`Skipping rebroadcast of message with ID: ${msg.messageid} for topic ${msg.topic} topic -> ${topic}.`)
        return;
    } else timed_expiry_cache.set("_blackboard"+msg.messageid, "sent");
    
    const topic = msg.topic; 
    if (topics[topic]) for (const subscriber of topics[topic]) {
        const {callback, options} = subscriber;
        if (!options) {callback(msg.payload); continue;}  // no options means receive all the time
        if (options[module.exports.LOCAL_ONLY]) {
            if (msg.serverid == CONSTANTS.SERVER_ID) callback(msg.payload); 
            else LOG.info(`Blackboard dropped message with ID ${msg.messageid} for topic ${msg.topic} with LOCAL_ONLY option due to ${msg.serverid} != ${CONSTANTS.SERVER_ID}.`);
            continue;
        }
        if (options[module.exports.LOCAL_CLUSTER_ONLY]) {
            if (utils.getLocalIPs().includes(msg.serverip)) callback(msg.payload); 
            else LOG.info(`Blackboard dropped message with ID ${msg.messageid} for topic ${msg.topic} with LOCAL_CLUSTER_ONLY option due to ${msg.serverop} not in local IPs.`);
            continue;
        }
        if (options[module.exports.NOT_LOCAL_ONLY]) {
            if (msg.serverid != CONSTANTS.SERVER_ID) callback(msg.payload); 
            else LOG.info(`Blackboard dropped message with ID ${msg.messageid} for topic ${msg.topic} with NOT_LOCAL_ONLY option due to ${msg.serverid} == ${CONSTANTS.SERVER_ID}`);
            continue;
        }
        if (options[module.exports.EXTERNAL_ONLY]) {
            if (!utils.getLocalIPs().includes(msg.serverip)) callback(msg.payload); 
            else LOG.info(`Blackboard dropped message with ID ${msg.messageid} for topic ${msg.topic} with EXTERNAL_ONLY option due to ${msg.serverip} being in local IPs.`);
            continue;
        }
        callback(msg.payload); // no valid option - so send it out to everyone
    }
}

function _expandConf(conf) {
    const retConf = JSON.parse(mustache.render(JSON.stringify(conf), {hostname: CONSTANTS.HOSTNAME}));
    return retConf;
}

_log_verbose = s => {if (conf.verbose_logging) LOG.info(s);}

module.exports = {init, doService, publish, subscribe, unsubscribe, isEntireReplicaClusterOnline, getReply, 
    sendReply, getDistribuedClusterSize, getCurrentDistributedClusterSizeOnline, getLocalClusterSize, 
    LOCAL_ONLY: "localonly", LOCAL_CLUSTER_ONLY: "localclusteronly", EXTERNAL_ONLY: "externalonly", 
    NOT_LOCAL_ONLY: "notlocalonly", FIRST_REPLY_ONLY: "firstreplyonly", CONF_UPDATE_MSG};