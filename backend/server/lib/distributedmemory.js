/* 
 * (C) 2020. TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 * 
 * Maintains distributed memory across vertical and
 * horizontal cluster members
 */

const process = require('process');

const _distributedMemory = {};
const SET_MSG = "__org_monkshu_distribued_memory_set";

function init() {
    process.on(SET_MSG, _processSetMessage);
    global.DISTRIBUTED_MEMORY = this;
}

function set(key, value) {
    const obj = {}; obj[key] = value; 
    if (process.send) process.send({type: SET_MSG, obj}) 
    else _processSetMessage(obj);
};

const get = key => _distributedMemory[key];

const _processSetMessage = obj =>  {for (const key of Object.keys(obj)) _distributedMemory[key] = obj[key];};

module.exports = {init, set, get};
