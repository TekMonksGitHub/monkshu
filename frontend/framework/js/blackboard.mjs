/**
 * Blackboard for frontend applications - for decoupled design.  
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const topics = {};

function registerListener(topic, listener) {
    topic = topic.toLowerCase();
    if (!topics[topic]) topics[topic] = []; 
    topics[topic].push(listener);
}

function broadcastMessage(topic, message) {
    topic = topic.toLowerCase();
    if (!topics[topic]) return; // no such topic exists / no one interested

    for (const listener of topics[topic]) listener(message);
}

export const blackboard = {registerListener, broadcastMessage};