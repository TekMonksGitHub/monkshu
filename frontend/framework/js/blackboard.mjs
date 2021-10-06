/**
 * Blackboard for frontend applications - for decoupled design.  
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const topics = {}, DISCOVERABLE_FLAG = "__org_monkshu_blackboard_discoverable_listener"

/**
 * Registers listeners for messages
 * @param topic The topic to listen to, usually a string
 * @param listener The listener which will be passed the messages
 * @param discoverable Whether the listener can be discovered from the blackboard, 
 *                     by default the blackboard doesn't let callers know the listeners
 */
function registerListener(topic, listener, discoverable) {
    topic = topic.toLowerCase();
    if (!topics[topic]) topics[topic] = []; 
    if (discoverable) listener[DISCOVERABLE_FLAG] = true;
    topics[topic].push(listener);
}

/**
 * Broadcasts the given message asynchornously. No replies are handled.
 * @param topic The topic of the message, usually a string
 * @param message The message, can be a string, JSON string or any JS object
 */
function broadcastMessage(topic, message) {
    topic = topic.toLowerCase();
    if (!topics[topic]) return; // no such topic exists / no one interested

    for (const listener of topics[topic]) listener(message);
}

/**
 * Returns the array of discoverable listenrs for the given topic
 * @param topic The topic for which discoverable listeners are required
 * @returns The array of discoverable listeners for the given topic
 */
function getListeners(topic) {
    topic = topic.toLowerCase();
    if (!topics[topic]) return []; // no such topic exists / no one interested
    
    const discoverableListners = [];
    for (const listener of topics[topic]) if (listener[DISCOVERABLE_FLAG]) discoverableListners.push(listener);
    return discoverableListners;
}

export const blackboard = {registerListener, broadcastMessage, getListeners};