/**
 * Keeps an eye on network backbone connectivity.
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const net = require("net");
const conf = require(CONSTANTS.NETCHECKCONF);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
let online = undefined, netEventListeners = [];

const init = _ => utils.setIntervalImmediately(_checkNet, conf.netcheck_frequency);

const isNetOnline = _ => online;

const addNetEventListener = listener => netEventListeners.push(listener);

const removeNetEventListener = listener => {if (netEventListeners.indexOf(listener) != -1)
    netEventListeners.splice(netEventListeners.indexOf(listener),1);}

function _checkNet() {
    const lastColon = conf.netcheck_host.lastIndexOf(":"), host = conf.netcheck_host.substring(0, lastColon), 
        port = conf.netcheck_host.substring(lastColon+1);

    const testsocket = net.createConnection(port, host, _ => {
        testsocket.end(); const oldState = online; online=true; 
        if (oldState != online) _broadcastNetChangedEvent(oldState);
    });
    testsocket.on("error", err => {
        testsocket.end(); const oldState = online; online=false;
        if (oldState != online) _broadcastNetChangedEvent(oldState, err);
    })
}

const _broadcastNetChangedEvent = (oldState, err) => {
    LOG.info(`Network online state changed from ${oldState} to ${online}.`);
    if (!online) LOG.error(`Network just went offline, the error was ${err}`); else LOG.info("Network came online.");
    for (const listener of netEventListeners) listener(oldState, online);
}

module.exports = {init, isNetOnline, addNetEventListener, removeNetEventListener}