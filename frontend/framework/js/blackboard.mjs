/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

let topics = {};

const registerListener = function(topic, listener) {
    if (!topics[topic]) topics[topic] = []; 
    topics[topic].push(listener);
}

const broadCastMessage = function(topic, message) {
    if (!topics[topic]) return; // no such topic exists / no one interested

    topics[topic].forEach(listener => listener(message));
}

export const blackboard = {registerListener, broadCastMessage};