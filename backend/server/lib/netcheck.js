/**
 * Keeps an eye on network backbone connectivity.
 * (C) 2020. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const net = require("net");
const conf = require(CONSTANTS.NETCHECKCONF);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
let online = undefined, netEventListeners = [];

/** Init the module */
const init = _ => utils.setIntervalImmediately(_checkNet, conf.netcheck_frequency);

/** @return true if net is online, else false */
const isNetOnline = _ => online;

/** 
 * Adds a network state listener, if network state changes, 
 * the listener is called with old and new states
 * @param listener The listener callback 
 */
const addNetEventListener = listener => netEventListeners.push(listener);

/**
 * Checks connection to the given host and port.
 * @param {string} host The host IP or DNS name
 * @param {number} port The port 
 * @return A promise resolving with object {result, error}. 
 *         The result is true on success, false otherwise. 
 *         The error is set if the result is false.
 */
function checkConnect(host, port) {
    return new Promise(resolve => {
        const testsocket = net.createConnection(port, host, _ => {
            testsocket.end(); resolve({result: true});
        });
        testsocket.on("error", err => {
            testsocket.end(); resolve({result: false, error: err});
        })
    });
} 

/**@param listener The listener to remove from network event broadcasts */
const removeNetEventListener = listener => {if (netEventListeners.indexOf(listener) != -1)
    netEventListeners.splice(netEventListeners.indexOf(listener),1);}

async function _checkNet() {
    const lastColon = conf.netcheck_host.lastIndexOf(":"), host = conf.netcheck_host.substring(0, lastColon), 
        port = conf.netcheck_host.substring(lastColon+1), connectResult = await checkConnect(host, port); 

    if (connectResult.result) {
        const oldState = online; online=true; 
        if (oldState != online) _broadcastNetChangedEvent(oldState);
    } else {
        const oldState = online; online=false;
        if (oldState != online) _broadcastNetChangedEvent(oldState, connectResult.error);
    }
}

const _broadcastNetChangedEvent = (oldState, err) => {
    LOG.info(`Network online state changed from ${oldState} to ${online}.`);
    if (!online) LOG.error(`Network just went offline, the error was ${err}`); else LOG.info("Network came online.");
    for (const listener of netEventListeners) listener(oldState, online);
}

module.exports = {init, isNetOnline, addNetEventListener, removeNetEventListener, checkConnect}