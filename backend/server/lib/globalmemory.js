/* 
 * (C) 2020. TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 * 
 * Maintains distributed memory across vertical and
 * horizontal cluster members. Can run a worldwide
 * memory grid, at internet scale.
 * 
 * This is NOT a caching daemon. As the name says, this
 * runs a distributed memory store. Nothing is evicted. 
 * 
 * A caching daemon, or eviction engine can easily be 
 * built on top of this though.
 */

const _globalmemory = {};

function init() {
    global.DISTRIBUTED_MEMORY = this;
    BLACKBOARD.subscribe("__org_monkshu_distribued_memory_set", _set);
}

const set = (key, value) => BLACKBOARD.publish("__org_monkshu_distribued_memory_set", {key, value});  // publish to all via blackboard, including ourselves
const get = key => _globalmemory[key];

const _set = obj =>  {_globalmemory[obj.key] = obj.value;};

module.exports = {init, set, get};
