/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Globally distributed blackboard for event propogation
 * at internet scale.
 */

const topics = {}
const API_BB_PATH = "/__org_monkshu__blackboard";
const rest = require(`${CONSTANTS.LIBDIR}/rest.js`);
const BLACKBOARD_MSG = "__org_monkshu_blackboard_msg";
let conf = require(CONSTANTS.BLACKBOARDCONF);
const CONF_UPDATE_MSG = "__org_monkshu_blackboard_msg_conf";
const writeFileAsync = require("util").promisify(require("fs").writeFile);

function init() {
    global.BLACKBOARD = this;
    subscribe(CONF_UPDATE_MSG, confNew => {
        // update in memory working copy
        if (process.send) (process.send({type: CONF_UPDATE_MSG, conf: confNew}));
        else conf = confNew;

        // serialize to survive restarts
        writeFileAsync(CONSTANTS.BLACKBOARDCONF, JSON.stringify(confNew));    // serialize
    });
    process.on("message", msg => {if (msg.type == CONF_UPDATE_MSG) conf = msg.conf});
    process.on("message", msg => {if (msg.type == BLACKBOARD_MSG) _broadcast(msg.msg)});
}

async function doService(request) {
    if (request.type == BLACKBOARD_MSG) {
        if (process.send) (process.send({type: BLACKBOARD_MSG, msg: request.msg}));
        else _broadcast(request.msg);
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

function publish(topic, payload) {
    const poster = conf.secure?rest.postHttps:rest.post;

    for (const replica of conf.replicas) {
        const host = replica.substring(0, replica.lastIndexOf(":")); const port = replica.substring(replica.lastIndexOf(":")+1);
        poster(host, port, API_BB_PATH, {}, {type:BLACKBOARD_MSG, msg:{topic, payload}}, (err,result) => {
            if (err || !result.result) LOG.error(`Blackboard replication failed for replica: ${replica}`);
        });
    }
}

function subscribe(topic, callback) {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push(callback);
}

function _broadcast(msg) {
    const topic = msg.topic;
    if (topics[topic]) for (const subscriber of topics[topic]) subscriber(msg.payload);
}

module.exports = {init, doService, publish, subscribe}