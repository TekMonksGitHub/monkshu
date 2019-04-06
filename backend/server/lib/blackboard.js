let topics = {};

/** Create new topic */
function createTopic(topic) {
    if (!topics[topic]) topics[topic] = [];
};

/** Destroy existing topic */
function destroyTopic(topic) {
    if (topics[topic]) delete topics[topic];
};

/** Register Listener */
function subscribeTopic(topic, listener) {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push(listener);
};

/** Broadcast Message */
function putTopicMessage(topic, data) {
    if (!topics[topic]) return;
    topics[topic].forEach(listener => listener(data));
};

/** Get topic subscribers */
function getSubscribers(topic) {
    if (!topics[topic]) return;

    if (topics[topic].length == 0) {
        destroyTopic(topic);
        return;
    }
    
    return topics[topic];
};

module.exports.blackboard = { createTopic, destroyTopic, subscribeTopic, putTopicMessage, getSubscribers };