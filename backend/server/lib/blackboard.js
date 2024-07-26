/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Globally distributed blackboard for event propogation
 * at internet scale.
 */

const topics = {}
const fs = require("fs");
const mustache = require("mustache");
const API_BB_PATH = "/__org_monkshu__blackboard";
const rest = require(`${CONSTANTS.LIBDIR}/rest.js`);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
let conf = _expandConf(require(CONSTANTS.BLACKBOARDCONF));
const netcheck = require(`${CONSTANTS.LIBDIR}/netcheck.js`);

const BLACKBOARD_MSG = "__org_monkshu_blackboard_msg", CONF_UPDATE_MSG = "__org_monkshu_blackboard_msg_conf",
    BLACKBOARD_REQUESTREPLY_TOPIC = "__org_monkshu_blackboard_requestreply_topic";

function init() {
    global.BLACKBOARD = this;
    subscribe(CONF_UPDATE_MSG, confNew => {
        // update in memory working copy
        if (process.send) (process.send({type: CONF_UPDATE_MSG, conf: confNew}));
        else conf = _expandConf(confNew);

        // serialize to survive restarts
        fs.writeFile(CONSTANTS.BLACKBOARDCONF, JSON.stringify(confNew));    // serialize
    });
    process.on("message", msg => {if (msg.type == CONF_UPDATE_MSG) conf = _expandConf(msg.conf)});
    process.on("message", msg => {if (msg.type == BLACKBOARD_MSG) _broadcast(msg.msg)});
    if (!conf.replicas) conf.replicas = []; // init to empty list if not provided
}

async function doService(request) { 
    if (request.type == BLACKBOARD_MSG) {   // received network message; if in a nodejs cluster, use cluster to broadcast, else broadcast here
        if (process.send) (process.send({type: BLACKBOARD_MSG, msg: request.msg}));
        else _broadcast(request.msg);   // no cluster so broadcast locally
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

async function publish(topic, payload) {
    const poster = conf.secure?rest.postHttps:rest.post;
    const _createBroadcastMessage = _ => {return {topic, payload, serverid: CONSTANTS.SERVER_ID}};

    let failedReplicas = 0;
    for (const replica of conf.replicas) {
        const host = replica.lastIndexOf(":") != -1 ? replica.substring(0, replica.lastIndexOf(":")) : replica; 
        const port = replica.lastIndexOf(":") != -1 ? replica.substring(replica.lastIndexOf(":")+1) : CONSTANTS.DEFAULT_PORT;
        try {
            await poster(host, port, API_BB_PATH, {}, {type:BLACKBOARD_MSG, msg:_createBroadcastMessage()}, (err,result) => {
                if (err || !result.result) LOG.error(`Blackboard replication failed for replica: ${replica}`);
            });
        } catch (err) { LOG.error(`Blackboard can't reach replica ${replica}, error is ${err}.`); failedReplicas++; }
    }

    if ((!conf.replicas.length) || (failedReplicas == conf.replicas.length)) {   // if network is down or if all replicas are misconfigured, then at least broadcast to the local node so that applications relying on the blackboard keep running
        LOG.error(`Failed to reach all replicas. Assuming network isolated topology. Broadcasting the message locally.`);
        if (process.send) process.send({type: BLACKBOARD_MSG, msg:_createBroadcastMessage()});   // broadcast to the local cluster if no replicas working
        else _broadcast(_createBroadcastMessage());  // if no local cluster then just give up and send to the local applications
    }
}

function getDistribuedClusterSize() {return conf.replicas.length;}

function getReply(topic, payload, timeout, replyReceiver) {
    if (!replyReceiver) return new Promise(resolve => getReply(...arguments, resolve));

    const id = utils.generateUUID();
    let repliesReceived = 0, replied = false, replies = [];
    const timeoutID = setTimeout(_=>{ if (!replied) {replied = true; replies.incomplete = true; replyReceiver(replies);}}, timeout);
    subscribe(BLACKBOARD_REQUESTREPLY_TOPIC, function(msg) {
        if (replied) return; // no longer an active request, timed out
        if ((msg.id != id) || (msg.type !== "reply")) return;   // not for us, as we handle only replies
        replies.push(msg.reply); repliesReceived++; if (repliesReceived < conf.replicas.length) return;  // still waiting
        clearTimeout(timeoutID); unsubscribe(BLACKBOARD_REQUESTREPLY_TOPIC, this);   // we are not waiting anymore
        replyReceiver(replies); replied = true;
    });
    const finalPayload = {id, payload, topic, type: "request"}; 
    publish(BLACKBOARD_REQUESTREPLY_TOPIC, finalPayload);
}

function sendReply(topic, blackboardcontrol, payload) {
    publish(BLACKBOARD_REQUESTREPLY_TOPIC, {id: blackboardcontrol, topic, reply: payload, type: "reply"});
}

async function isEntireReplicaClusterOnline() {
    for (const replica of conf.replicas) {
        const host = replica.lastIndexOf(":") != -1 ? replica.substring(0, replica.lastIndexOf(":")) : replica; 
        const port = replica.lastIndexOf(":") != -1 ? replica.substring(replica.lastIndexOf(":")+1) : CONSTANTS.DEFAULT_PORT;
        const check = await netcheck.checkConnect(host, port); if (!check.result) return false;
    }
    return true;
}

function subscribe(topic, callback, options) {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push({callback, options});
}

function unsubscribe(topic, callback) {
    const topicSubscribersArray = topics[topic]; if (!topicSubscribersArray) return;    // no subscribers exist
    let indexFound = -1;
    for (const [i, subscriber] of topicSubscribersArray.entries()) {
        if (subscriber.callback === callback) {indexFound = i; break;} }
    if (indexFound != -1) topicSubscribersArray.splice(indexFound, 1);
}

function _broadcast(msg) {
    // handle specially formatted request-reply messages here
    if (msg.topic == BLACKBOARD_REQUESTREPLY_TOPIC && msg.type == "request") msg = {
        topic: msg.payload.topic, payload: {...msg.payload.payload, blackboardcontrol: msg.payload.id}};
    
    const topic = msg.topic; 
    if (topics[topic]) for (const subscriber of topics[topic]) {
        const {callback, options} = subscriber;
        if (!options) {callback(msg.payload); continue;}  // no options means receive all the time
        if (options[module.exports.LOCAL_ONLY]) {if (msg.serverid == CONSTANTS.SERVER_ID) callback(msg.payload); continue;}
        if (options[module.exports.EXTERNAL_ONLY]) {if (msg.serverid != CONSTANTS.SERVER_ID) callback(msg.payload); continue;}
        callback(msg.payload); // no valid option - so send it out still
    }
}

function _expandConf(conf) {
    const retConf = JSON.parse(mustache.render(JSON.stringify(conf), {hostname: CONSTANTS.HOSTNAME}));
    return retConf;
}

module.exports = {init, doService, publish, subscribe, unsubscribe, isEntireReplicaClusterOnline, getReply, 
    sendReply, getDistribuedClusterSize, LOCAL_ONLY: "localonly", EXTERNAL_ONLY: "externalonly"};