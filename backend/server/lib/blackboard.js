let topics = {};

/** Create new topic */
const createTopic = (topic) => {
    if (!topics[topic]) topics[topic] = [];
};

/** Destroy existing topic */
const destroyTopic = (topic) => {
    if (topics[topic]) delete topics[topic];
};

/** Register Listener */
const subscribeTopic = (topic, listener) => {
    if (!topics[topic]) topics[topic] = [];
    topics[topic].push(listener);
};

/** Broadcast Message */
const putTopicMessage = (topic, data) => {
    if (!topics[topic]) return;
    topics[topic].forEach(listener => listener(data));
};

/** Get topic subscribers */
const getSubscribers = (topic) => {
    if (!topics[topic]) return;
    if (topics[topic].length == 0) {
        destroyTopic(topic);
        return;
    }
    return topics[topic];
};

module.exports.blackboard = { createTopic, destroyTopic, subscribeTopic, putTopicMessage, getSubscribers };