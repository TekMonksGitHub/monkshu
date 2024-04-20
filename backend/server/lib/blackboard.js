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
let conf = _expandConf(require(CONSTANTS.BLACKBOARDCONF));
const netcheck = require(`${CONSTANTS.LIBDIR}/netcheck.js`);

const BLACKBOARD_MSG = "__org_monkshu_blackboard_msg", CONF_UPDATE_MSG = "__org_monkshu_blackboard_msg_conf";

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
    if (request.type == BLACKBOARD_MSG) {   // received network message
        if (process.send) (process.send({type: BLACKBOARD_MSG, msg: request.msg}));
        else _broadcast(request.msg);
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

async function publish(topic, payload) {
    const poster = conf.secure?rest.postHttps:rest.post;
    const _createBroadcastMessage = _ => {return {topic, payload, processid: process.pid}};

    let failedReplicas = 0;
    for (const replica of conf.replicas) {
        const host = replica.substring(0, replica.lastIndexOf(":")); const port = replica.substring(replica.lastIndexOf(":")+1);
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

async function isEntireReplicaClusterOnline() {
    for (const replica of conf.replicas) {
        const host = replica.substring(0, replica.lastIndexOf(":")); const port = replica.substring(replica.lastIndexOf(":")+1);
        const check = await netcheck.checkConnect(host, port); if (!check.result) return false;
    }
    return true;
}

function subscribe(topic, callback, options) {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push({callback, options});
}

function _broadcast(msg) {
    const topic = msg.topic;
    if (topics[topic]) for (const subscriber of topics[topic]) {
        const {callback, options} = subscriber;
        if (!options) {callback(msg.payload); continue;}  // no options means receive all the time
        if (options[module.exports.LOCAL_ONLY]) {if (msg.processid == process.pid) callback(msg.payload); continue;}
        if (options[module.exports.EXTERNAL_ONLY]) {if (msg.processid != process.pid) callback(msg.payload); continue;}
        callback(msg.payload); // no valid option - so send it out still
    }
}

function _expandConf(conf) {
    const retConf = JSON.parse(mustache.render(JSON.stringify(conf), {hostname: CONSTANTS.HOSTNAME}));
    return retConf;
}

module.exports = {init, doService, publish, subscribe, isEntireReplicaClusterOnline, LOCAL_ONLY: "localonly", 
    EXTERNAL_ONLY: "externalonly"};